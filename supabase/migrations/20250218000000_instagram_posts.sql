-- Instagram MVP: instagram_posts table
create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null,
  media_urls jsonb not null,
  caption text,
  hashtags text[],
  quality_score integer,
  score_breakdown jsonb,
  status text not null default 'draft',
  scheduled_at timestamptz,
  posted_at timestamptz,
  metrics jsonb,
  content_post_id uuid references public.content_posts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_instagram_posts_user_id on public.instagram_posts(user_id);
create index if not exists idx_instagram_posts_status on public.instagram_posts(status);
create index if not exists idx_instagram_posts_scheduled_at on public.instagram_posts(scheduled_at);
