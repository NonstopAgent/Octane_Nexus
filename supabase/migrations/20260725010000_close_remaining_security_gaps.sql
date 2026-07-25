-- Applied to production 2026-07-25 via Supabase MCP; committed here so the
-- migration history matches the live database.
--
-- 1. content_posts had "Allow public update for now" -- USING(true), no
--    WITH CHECK -- so any caller could rewrite any user's posts. Two
--    owner-scoped UPDATE policies already existed, so dropping it is safe.
DROP POLICY IF EXISTS "Allow public update for now" ON public.content_posts;

-- 2. Public buckets serve object URLs without a SELECT policy on
--    storage.objects; these policies only enabled LISTING, letting anyone
--    enumerate every creator's files. No client code calls
--    storage.from(...).list(), so dropping them breaks nothing.
DROP POLICY IF EXISTS "Public read for assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read for videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read for content_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Content" ON storage.objects;

-- 3. "Allow read own clip-uploads" was named "own" but had NO ownership
--    check -- any signed-in user could read every creator's raw source
--    video. Paths are userId/uuid.mp4 (lib/media-resolver.ts).
DROP POLICY IF EXISTS "Allow read own clip-uploads" ON storage.objects;
CREATE POLICY "Allow read own clip-uploads" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'clip-uploads'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 4. Same gap on insert: anyone could write into either clip bucket,
--    including into another user's folder.
DROP POLICY IF EXISTS "Allow insert for clip-uploads" ON storage.objects;
CREATE POLICY "Allow insert for clip-uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'clip-uploads'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Allow insert clip-outputs" ON storage.objects;
CREATE POLICY "Allow insert clip-outputs" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'clip-outputs'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- 5. SECURITY DEFINER functions were callable over the public REST API at
--    /rest/v1/rpc/. Postgres grants EXECUTE to PUBLIC by default, and
--    anon/authenticated inherit from there -- revoking from the named roles
--    is a no-op, so revoke from PUBLIC.
--    handle_new_user is a trigger function (triggers run as the table owner
--    regardless of grants); cleanup_old_video_snapshots has zero callers.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_video_snapshots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_video_snapshots() TO service_role;

-- 6. Pin search_path on SECURITY DEFINER functions so a caller who can
--    create objects in an earlier schema can't shadow a referenced table
--    or operator and have it run with definer rights.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_video_snapshots() SET search_path = public, pg_temp;
ALTER FUNCTION public.tg_set_updated_at() SET search_path = public, pg_temp;
