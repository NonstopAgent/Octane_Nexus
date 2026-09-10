-- The earlier hardening pass ran `revoke all ... from public` across the
-- SECURITY DEFINER functions. service_role inherits its EXECUTE from PUBLIC,
-- so that revoke silently stripped the brief worker's ability to claim jobs:
-- every worker run would have failed with "permission denied for function
-- claim_brief_jobs" and no brief would ever have been generated.
--
-- Grant it back explicitly. The function is service-role only by design --
-- it is the atomic FOR UPDATE SKIP LOCKED claim, and no user context should
-- ever be able to reach into the queue.

grant execute on function public.claim_brief_jobs(
  p_brief_date date,
  p_limit integer,
  p_max_attempts integer,
  p_stale_minutes integer
) to service_role;
