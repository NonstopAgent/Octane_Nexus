-- Storage: videos bucket for rendered MP4s and overlay images
-- Used by finalizeVideo / renderPostAction to store uploaded background clips.
-- Service role key bypasses RLS for uploads; public read for playback.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read for videos" ON storage.objects;
CREATE POLICY "Public read for videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');
