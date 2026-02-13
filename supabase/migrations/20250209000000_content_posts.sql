-- Production Board: Content lifecycle (Idea → Scripting → Filming → Posted)
CREATE TABLE IF NOT EXISTS content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  script_content JSONB DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'scripting', 'filming', 'posted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_user_id ON content_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts(status);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content_posts"
  ON content_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content_posts"
  ON content_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content_posts"
  ON content_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content_posts"
  ON content_posts FOR DELETE
  USING (auth.uid() = user_id);
