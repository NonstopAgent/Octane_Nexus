-- Video Factory: Credits + asset URLs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 50;

-- content_posts: asset columns + extended status
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS background_video_url TEXT;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS final_video_url TEXT;

-- Drop old constraint and add new one with generating/ready
ALTER TABLE content_posts DROP CONSTRAINT IF EXISTS content_posts_status_check;
ALTER TABLE content_posts ADD CONSTRAINT content_posts_status_check
  CHECK (status IN ('idea', 'scripting', 'filming', 'posted', 'generating', 'ready'));

-- Storage: assets bucket for audio/video
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  52428800,
  ARRAY['audio/mpeg', 'audio/mp3', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read for assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

CREATE POLICY "Authenticated upload to assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assets'
    AND auth.role() = 'authenticated'
  );
