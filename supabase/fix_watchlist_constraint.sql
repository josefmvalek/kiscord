-- Fix library_watchlist: Remove unique constraint on media_id to allow both users to add it
-- and add a compound unique constraint for (media_id, added_by)

ALTER TABLE public.library_watchlist DROP CONSTRAINT IF EXISTS library_watchlist_media_id_key;

-- If it was created as a UNIQUE index rather than a constraint
DROP INDEX IF EXISTS library_watchlist_media_id_idx;

-- Add compound unique constraint
ALTER TABLE public.library_watchlist ADD CONSTRAINT library_watchlist_user_media_unique UNIQUE (media_id, added_by);
