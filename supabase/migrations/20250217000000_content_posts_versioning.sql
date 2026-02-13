-- Post versioning: READY posts are immutable; Regenerate creates a new version row.
-- All columns added idempotently.

ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS parent_post_id UUID NULL;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS created_from_action TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_content_posts_parent_post_id ON public.content_posts(parent_post_id);

-- Optional: enforce only one current version per parent in application code to avoid partial unique with existing rows.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_content_posts_one_current_per_parent
--   ON public.content_posts(parent_post_id) WHERE (is_current = true AND parent_post_id IS NOT NULL);
