-- Reconcile content_posts schema for simulator/video engine.
-- Safe to run manually in Supabase SQL Editor if CLI is unavailable.
-- All columns use ADD COLUMN IF NOT EXISTS for idempotency.

ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS final_video_url TEXT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS background_video_url TEXT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS background_reason TEXT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS overlay_image_url TEXT;