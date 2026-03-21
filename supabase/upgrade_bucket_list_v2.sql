-- Upgrading Bucket List with Categories and Priority Hearts
-- Run this in your Supabase SQL Editor

ALTER TABLE public.bucket_list ADD COLUMN IF NOT EXISTS category text DEFAULT 'jiné';
ALTER TABLE public.bucket_list ADD COLUMN IF NOT EXISTS priority_users uuid[] DEFAULT '{}';
