-- Refunds must be a server decision, never a user-callable primitive.
--
-- refund_own_credits(p_amount) derived its target from auth.uid() and was
-- EXECUTE-able by `authenticated`, so any signed-in user could call
-- POST /rest/v1/rpc/refund_own_credits {"p_amount": 999999} with their own
-- anon-key session and mint themselves unlimited credits. No server code had
-- to be involved. Replace it with a service-role-only function that takes an
-- explicit user id, so the only possible caller is trusted server code.

drop function if exists public.refund_own_credits(integer);

create or replace function public.refund_credits(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_new integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return null;
  end if;

  update public.profiles
     set credits = coalesce(credits, 0) + p_amount
   where id = p_user_id
  returning credits into v_new;

  if not found then
    return null;
  end if;

  return v_new;
end;
$$;

revoke all on function public.refund_credits(uuid, integer) from public;
revoke all on function public.refund_credits(uuid, integer) from anon;
revoke all on function public.refund_credits(uuid, integer) from authenticated;
grant execute on function public.refund_credits(uuid, integer) to service_role;

-- deduct_own_credits only ever subtracts from the caller's own balance and
-- floors at that balance, so it is not exploitable for gain -- but anon has
-- no business calling it (auth.uid() is null there and it always returns
-- null). Close the advisor finding.
revoke all on function public.deduct_own_credits(integer, integer) from anon;
