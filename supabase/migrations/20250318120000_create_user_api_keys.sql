-- User API keys stored server-side (OpenAI, Pexels, RapidAPI). RLS ensures only the owning user can read/write.
CREATE TABLE user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_kind text NOT NULL CHECK (key_kind IN ('openai', 'pexels', 'rapidapi')),
  key_value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, key_kind)
);

-- Only the owning user can read/write their own keys
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
  ON user_api_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
