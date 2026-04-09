-- Daily Brief: competitor tracking + persisted briefs

CREATE TABLE IF NOT EXISTS tracked_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_handle TEXT,
  thumbnail_url TEXT,
  subscriber_count BIGINT,
  recent_videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracked_channels_user_channel_unique UNIQUE (user_id, youtube_channel_id)
);

CREATE INDEX IF NOT EXISTS idx_tracked_channels_user_id ON tracked_channels(user_id);

ALTER TABLE tracked_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tracked_channels"
  ON tracked_channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracked_channels"
  ON tracked_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracked_channels"
  ON tracked_channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracked_channels"
  ON tracked_channels FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_date DATE NOT NULL,
  competitor_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  your_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  todays_idea JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT,
  generation_ms INTEGER,
  user_viewed_at TIMESTAMPTZ,
  CONSTRAINT daily_briefs_user_date_unique UNIQUE (user_id, brief_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_briefs_user_id ON daily_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefs_brief_date ON daily_briefs(brief_date);

ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily_briefs"
  ON daily_briefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_briefs"
  ON daily_briefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_briefs"
  ON daily_briefs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_briefs"
  ON daily_briefs FOR DELETE
  USING (auth.uid() = user_id);
