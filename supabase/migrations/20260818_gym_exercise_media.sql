-- =====================================================================
-- KISCORD - GYM EXERCISE MEDIA & TECHNIQUE GUIDES MIGRATION
-- Migration: 20260818_gym_exercise_media.sql
-- =====================================================================

-- Add media and instruction columns to gym_exercises
ALTER TABLE public.gym_exercises
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[];

-- Ensure storage bucket for gym assets exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-assets', 'gym-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy for gym-assets bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public access to gym-assets'
    ) THEN
        CREATE POLICY "Allow public access to gym-assets"
        ON storage.objects FOR ALL
        USING (bucket_id = 'gym-assets')
        WITH CHECK (bucket_id = 'gym-assets');
    END IF;
END $$;
