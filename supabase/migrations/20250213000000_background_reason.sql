-- Smart Background Picker: add background_reason (background_video_url already exists)
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS background_reason TEXT;
