-- Run this command in your Supabase SQL Editor
ALTER TABLE public.events 
ADD COLUMN gallery_images text[] DEFAULT '{}';
-- Optional: Add a comment to the column
COMMENT ON COLUMN public.events.gallery_images IS 'Array of public image URLs for the event gallery';