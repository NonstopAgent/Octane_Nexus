-- Phase 3.1c: Clip outputs private, path-based storage, nullable output_path

-- 1) Make output_path nullable and store storage path only (no public URL)
ALTER TABLE clips
  ALTER COLUMN output_path DROP NOT NULL,
  ALTER COLUMN output_path SET DEFAULT 'pending';

-- 2) Private bucket for clip outputs (path: clips/{user_id}/{job_id}/{clip_id}.mp4)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clip-outputs',
  'clip-outputs',
  false,
  104857600,
  ARRAY['video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4'];

-- 3) Storage policies: private bucket; uploads via signed URL (API enforces ownership before issuing token)
DROP POLICY IF EXISTS "Allow insert clip-outputs" ON storage.objects;
CREATE POLICY "Allow insert clip-outputs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'clip-outputs');

-- Read: only own path prefix (auth.uid() = second path segment = user_id)
DROP POLICY IF EXISTS "Allow read own clip-outputs" ON storage.objects;
CREATE POLICY "Allow read own clip-outputs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'clip-outputs'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Service role bypasses RLS (signed URLs generated server-side with service role)
