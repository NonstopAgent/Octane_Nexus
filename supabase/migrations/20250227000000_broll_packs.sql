-- B-Roll Matchmaker: shot list + stock picks per post.
CREATE TABLE IF NOT EXISTS broll_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scenes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broll_packs_user_post ON broll_packs(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_broll_packs_post_id ON broll_packs(post_id);

ALTER TABLE broll_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broll_packs"
  ON broll_packs FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own broll_packs"
  ON broll_packs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own broll_packs"
  ON broll_packs FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own broll_packs"
  ON broll_packs FOR DELETE
  USING (auth.uid()::text = user_id);
