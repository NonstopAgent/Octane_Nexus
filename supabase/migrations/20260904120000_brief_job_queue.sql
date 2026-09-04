-- Brief generation job queue.
-- Replaces the "loop over the first 25 users inside one 60s function" pattern,
-- which silently dropped everyone past the cap and everyone past the timeout.

create table if not exists public.brief_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  attempts integer not null default 0,
  last_error text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_date)
);

create index if not exists brief_jobs_pending_idx
  on public.brief_jobs (brief_date, status, created_at);

alter table public.brief_jobs enable row level security;

drop policy if exists "Users can view own brief_jobs" on public.brief_jobs;
create policy "Users can view own brief_jobs"
  on public.brief_jobs for select
  using (auth.uid() = user_id);

-- Atomically claim a batch of jobs. FOR UPDATE SKIP LOCKED means two workers
-- running at once (Vercel documents that cron delivery can double-invoke)
-- never pick up the same job. Stale 'running' rows are reclaimed so a worker
-- killed mid-job doesn't strand its user.
create or replace function public.claim_brief_jobs(
  p_brief_date date,
  p_limit integer default 3,
  p_max_attempts integer default 3,
  p_stale_minutes integer default 10
)
returns setof public.brief_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.brief_jobs j
     set status = 'running',
         attempts = j.attempts + 1,
         locked_at = now(),
         updated_at = now()
   where j.id in (
     select c.id
       from public.brief_jobs c
      where c.brief_date = p_brief_date
        and c.attempts < p_max_attempts
        and (
          c.status = 'pending'
          or (c.status = 'running'
              and c.locked_at < now() - make_interval(mins => p_stale_minutes))
        )
      order by c.created_at
        for update skip locked
      limit p_limit
   )
  returning j.*;
end;
$$;

revoke all on function public.claim_brief_jobs(date, integer, integer, integer) from public, anon, authenticated;

-- Credits, done atomically in one statement instead of read-then-write.
-- Derives the user from auth.uid() so it is safe to expose to authenticated
-- callers: it can only ever touch the caller's own row.
create or replace function public.deduct_own_credits(
  p_amount integer,
  p_default integer default 50
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new integer;
begin
  if v_uid is null or p_amount <= 0 then
    return null;
  end if;

  update public.profiles
     set credits = coalesce(credits, p_default) - p_amount
   where id = v_uid
     and coalesce(credits, p_default) >= p_amount
  returning credits into v_new;

  if not found then
    return null;
  end if;

  return v_new;
end;
$$;

create or replace function public.refund_own_credits(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new integer;
begin
  if v_uid is null or p_amount <= 0 then
    return null;
  end if;

  update public.profiles
     set credits = coalesce(credits, 0) + p_amount
   where id = v_uid
  returning credits into v_new;

  return v_new;
end;
$$;

grant execute on function public.deduct_own_credits(integer, integer) to authenticated;
grant execute on function public.refund_own_credits(integer) to authenticated;
