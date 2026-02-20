-- Clip It handoff: virtual clips tied to a post (no clip_job required)
-- post_id: link clip to content_post for "Send to Schedule"
-- clip_job_id: nullable so we can create clips without a job (virtual ranges)
ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES content_posts(id) ON DELETE SET NULL;
ALTER TABLE clips
  ALTER COLUMN clip_job_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clips_post_id ON clips(post_id);
