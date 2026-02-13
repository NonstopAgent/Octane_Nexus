-- Content Calendar: Store scheduled posts from Post Lab
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'x')),
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_user_id ON content_calendar(user_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_date ON content_calendar(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(status);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content_calendar"
  ON content_calendar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content_calendar"
  ON content_calendar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content_calendar"
  ON content_calendar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content_calendar"
  ON content_calendar FOR DELETE
  USING (auth.uid() = user_id);

-- Storage: content_uploads bucket
-- If INSERT fails, create manually: Supabase Dashboard → Storage → New bucket "content_uploads" (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content_uploads',
  'content_uploads',
  true,
  2147483648,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public read
CREATE POLICY "Public read for content_uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'content_uploads');

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated upload to content_uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'content_uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update/delete their own files
CREATE POLICY "Users can update own content_uploads"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'content_uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own content_uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'content_uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
