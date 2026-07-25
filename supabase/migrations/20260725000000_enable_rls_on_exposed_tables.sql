-- Enable Row Level Security on the seven tables that were shipping wide open.
--
-- WHY
-- ---
-- These tables had RLS disabled AND zero policies. The Supabase anon key is
-- embedded in the client bundle of every page load, so until this migration
-- anyone who opened devtools could read, modify, or delete every row in:
--
--   uploads, clips, clip_jobs, content_versions,
--   brain_evals, rights_ledger, instagram_posts
--
-- That includes raw creator video uploads and the Clip It rights/safety audit
-- trail. It was survivable only because the tables were empty. The moment a
-- beta creator uploads a video it stops being survivable.
--
-- NOTE ON user_id TYPES
-- ---------------------
-- The clip-studio and nexus-brain tables declare user_id as TEXT, while
-- instagram_posts uses UUID referencing profiles(id). auth.uid() returns UUID,
-- so the TEXT tables need an explicit cast. Getting this backwards silently
-- matches nothing and locks users out of their own rows.
--
-- NOTE ON SERVER ROUTES
-- ---------------------
-- The service-role client (lib/supabaseServer#createServiceRoleClient) bypasses
-- RLS entirely. Background work — clip job runners, the daily-brief cron,
-- webhook handlers — is unaffected by this migration. Only direct
-- anon/authenticated client access is constrained.

-- ---------------------------------------------------------------------------
-- TEXT user_id tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uploads_owner_all" ON public.uploads;
CREATE POLICY "uploads_owner_all" ON public.uploads
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE public.clip_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clip_jobs_owner_all" ON public.clip_jobs;
CREATE POLICY "clip_jobs_owner_all" ON public.clip_jobs
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clips_owner_all" ON public.clips;
CREATE POLICY "clips_owner_all" ON public.clips
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_versions_owner_all" ON public.content_versions;
CREATE POLICY "content_versions_owner_all" ON public.content_versions
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE public.brain_evals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brain_evals_owner_all" ON public.brain_evals;
CREATE POLICY "brain_evals_owner_all" ON public.brain_evals
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- rights_ledger is an audit trail for Clip It safety decisions. Owners may
-- read their own entries but must NOT be able to rewrite or delete them —
-- an audit log a user can edit is not an audit log. Writes come from the
-- service role only.
ALTER TABLE public.rights_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rights_ledger_owner_read" ON public.rights_ledger;
CREATE POLICY "rights_ledger_owner_read" ON public.rights_ledger
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- UUID user_id table
-- ---------------------------------------------------------------------------

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "instagram_posts_owner_all" ON public.instagram_posts;
CREATE POLICY "instagram_posts_owner_all" ON public.instagram_posts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
