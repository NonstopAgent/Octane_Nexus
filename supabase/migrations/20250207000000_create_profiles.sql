-- Profiles table: core user data linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  niche TEXT,
  vibe TEXT,
  brand_vision TEXT,
  profile_image_url TEXT,
  onboarding_step TEXT,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_post_date DATE,
  founder_license BOOLEAN NOT NULL DEFAULT false,
  has_purchased_package BOOLEAN NOT NULL DEFAULT false,
  purchased_package_type TEXT,
  linked_accounts JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
