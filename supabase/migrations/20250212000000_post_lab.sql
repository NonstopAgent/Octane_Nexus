-- Post Lab: caption, hashtags, scheduling
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add 'scheduled' status
ALTER TABLE content_posts DROP CONSTRAINT IF EXISTS content_posts_status_check;
ALTER TABLE content_posts ADD CONSTRAINT content_posts_status_check
  CHECK (status IN ('idea', 'scripting', 'filming', 'posted', 'generating', 'ready', 'scheduled'));
