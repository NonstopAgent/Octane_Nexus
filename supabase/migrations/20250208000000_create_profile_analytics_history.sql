-- Profile Analytics History: Track follower counts over time for Growth Trajectory charts
CREATE TABLE IF NOT EXISTS profile_analytics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'x')),
  follower_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient queries by user and platform
CREATE INDEX IF NOT EXISTS idx_profile_analytics_history_user_platform 
  ON profile_analytics_history(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_profile_analytics_history_recorded_at 
  ON profile_analytics_history(recorded_at);

-- RLS: Users can only read/insert their own analytics
ALTER TABLE profile_analytics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON profile_analytics_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON profile_analytics_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
