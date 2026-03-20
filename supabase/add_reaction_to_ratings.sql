-- Add reaction column to library_ratings table
ALTER TABLE public.library_ratings ADD COLUMN IF NOT EXISTS reaction TEXT;

-- Update existing records if needed (optional, they will be null by default)
COMMENT ON COLUMN public.library_ratings.reaction IS 'User reflection/emoji reaction for the media experience';
