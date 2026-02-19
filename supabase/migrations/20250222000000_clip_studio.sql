-- Clip Studio: uploads, clip_jobs, clips
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);

CREATE TABLE IF NOT EXISTS clip_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'processing', 'done', 'error')),
  target_platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_clip_jobs_user_id ON clip_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_jobs_upload_id ON clip_jobs(upload_id);

CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  clip_job_id UUID NOT NULL REFERENCES clip_jobs(id) ON DELETE CASCADE,
  start_seconds INT NOT NULL,
  end_seconds INT NOT NULL,
  title TEXT,
  caption TEXT,
  hashtags JSONB DEFAULT '[]'::jsonb,
  output_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_clip_job_id ON clips(clip_job_id);

-- Storage bucket for raw uploads (mp4/mov)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clip-uploads',
  'clip-uploads',
  false,
  524288000,
  ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v']
)
ON CONFLICT (id) DO NOTHING;

-- Allow uploads via signed URL (service role or auth)
CREATE POLICY "Allow insert for clip-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'clip-uploads');
CREATE POLICY "Allow read own clip-uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clip-uploads');
