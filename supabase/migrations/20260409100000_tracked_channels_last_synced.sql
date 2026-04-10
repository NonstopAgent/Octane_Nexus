ALTER TABLE tracked_channels
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN tracked_channels.last_synced_at IS 'When recent_videos was last refreshed (e.g. by cron).';
