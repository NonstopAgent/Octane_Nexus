-- Phase 3.2: Nexus Brain — retention linter + evaluator + versioning

-- brain_evals: one row per evaluation (post or clip)
CREATE TABLE IF NOT EXISTS brain_evals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('post', 'clip')),
  entity_id UUID NOT NULL,
  score INT NOT NULL,
  labels JSONB DEFAULT '{}'::jsonb,
  issues JSONB DEFAULT '[]'::jsonb,
  fixes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_evals_user_entity ON brain_evals(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_brain_evals_created ON brain_evals(created_at DESC);

-- content_versions: version history for posts (used by Generate v2)
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  post_id UUID NOT NULL,
  version INT NOT NULL,
  script_content JSONB,
  caption TEXT,
  hashtags JSONB DEFAULT '[]'::jsonb,
  final_video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_versions_user_post ON content_versions(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_post_version ON content_versions(post_id, version DESC);
