-- Style Tokens: reusable visual + copy style for captions, on-screen text, and generation.
-- user_settings stores default_style_token_id per user.

CREATE TABLE IF NOT EXISTS style_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tokens JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_style_tokens_user_id ON style_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_style_tokens_user_default ON style_tokens(user_id) WHERE is_default = true;

ALTER TABLE style_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own style_tokens"
  ON style_tokens FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own style_tokens"
  ON style_tokens FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own style_tokens"
  ON style_tokens FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own style_tokens"
  ON style_tokens FOR DELETE
  USING (auth.uid()::text = user_id);

-- user_settings: one row per user (default style, etc.)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  default_style_token_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_settings"
  ON user_settings FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own user_settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own user_settings"
  ON user_settings FOR UPDATE
  USING (auth.uid()::text = user_id);

-- content_posts: optional style per post (Post Lab can switch style per post)
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS style_token_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_content_posts_style_token_id ON public.content_posts(style_token_id);
