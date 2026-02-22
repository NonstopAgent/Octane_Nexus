-- MVP Schema Alignment: add missing columns to content_posts, fix status constraint, add post_metrics.

-- 1) Expand content_posts status constraint to include all POST_STATUS values
ALTER TABLE public.content_posts DROP CONSTRAINT IF EXISTS content_posts_status_check;
ALTER TABLE public.content_posts ADD CONSTRAINT content_posts_status_check
  CHECK (status IN ('idea', 'scripting', 'filming', 'ready', 'scheduled', 'posted', 'generating'));

-- 2) Add missing columns to content_posts
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS rights_attested BOOLEAN DEFAULT false;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS posted_url TEXT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS trim_start_ms INT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS trim_end_ms INT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS platform TEXT;

-- scheduled_date already exists from 20250212; add index if missing
CREATE INDEX IF NOT EXISTS idx_content_posts_user_status ON public.content_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_posts_user_scheduled ON public.content_posts(user_id, scheduled_date);

-- 3) Make user_id TEXT (demo user is not a UUID) - idempotent type change
-- content_posts.user_id is currently UUID referencing auth.users; for demo mode we need TEXT.
-- Migration: drop FK, alter type. Safe because demo_seed already uses TEXT user_ids.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_posts' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.content_posts DROP CONSTRAINT IF EXISTS content_posts_user_id_fkey;
    ALTER TABLE public.content_posts ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;
END $$;

-- 4) post_metrics table for manual metric entry
CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  post_id UUID NOT NULL,
  platform TEXT CHECK (platform IN ('tiktok', 'reels', 'shorts', 'x', 'other')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  views INT,
  likes INT,
  comments INT,
  shares INT,
  saves INT
);

CREATE INDEX IF NOT EXISTS idx_post_metrics_user_id ON post_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_post_id ON post_metrics(post_id);

ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post_metrics"
  ON post_metrics FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own post_metrics"
  ON post_metrics FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own post_metrics"
  ON post_metrics FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own post_metrics"
  ON post_metrics FOR DELETE USING (auth.uid()::text = user_id);

-- 5) media_assets table for uploaded/external media
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'upload' CHECK (kind IN ('upload', 'external', 'generated')),
  storage_bucket TEXT DEFAULT 'clip-uploads',
  storage_path TEXT,
  public_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  duration_sec NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media_assets"
  ON media_assets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own media_assets"
  ON media_assets FOR INSERT WITH CHECK (auth.uid()::text = user_id);
