-- Identity Wizard & profile fields: add columns used by app/identity and updateProfileProgress.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio_tune_options JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_vision TEXT,
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS vibe TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS linked_accounts JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_purchased_package BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_license BOOLEAN DEFAULT false;
