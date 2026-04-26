-- SQL Script for Kiscord: Expanding Library Metadata
-- Run this in your Supabase SQL Editor

ALTER TABLE library_content
ADD COLUMN IF NOT EXISTS tmdb_id INTEGER,
ADD COLUMN IF NOT EXISTS poster_path TEXT,
ADD COLUMN IF NOT EXISTS rating FLOAT4,
ADD COLUMN IF NOT EXISTS runtime INTEGER,
ADD COLUMN IF NOT EXISTS genres TEXT,
ADD COLUMN IF NOT EXISTS release_year INTEGER;

-- Optional: Add index for tmdb_id if you plan to have a huge library
-- CREATE INDEX IF NOT EXISTS idx_library_tmdb_id ON library_content(tmdb_id);

COMMENT ON COLUMN library_content.rating IS 'User rating from TMDB (vote_average)';
COMMENT ON COLUMN library_content.runtime IS 'Duration in minutes';
