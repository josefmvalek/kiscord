-- Add seen_date to library_ratings for calendar integration

-- Add missing columns to library_ratings
ALTER TABLE public.library_ratings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS seen_date DATE;

-- Option to update existing ratings with updated_at date (best guess)
UPDATE public.library_ratings 
SET seen_date = COALESCE(updated_at::DATE, NOW()::DATE)
WHERE seen_date IS NULL;
