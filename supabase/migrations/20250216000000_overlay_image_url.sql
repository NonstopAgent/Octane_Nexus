-- Quote card overlay image for ready posts
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS overlay_image_url TEXT;
