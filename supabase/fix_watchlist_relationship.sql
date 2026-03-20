-- 1. Převod media_id na integer ve všech tabulkách, aby odpovídalo library_content.id
ALTER TABLE public.library_watchlist 
  ALTER COLUMN media_id TYPE integer USING media_id::integer;

ALTER TABLE public.library_ratings 
  ALTER COLUMN media_id TYPE integer USING media_id::integer;

-- 2. Úklid osiřelých záznamů, které už v katalogu neexistují
DELETE FROM public.library_watchlist WHERE media_id NOT IN (SELECT id FROM public.library_content);
DELETE FROM public.library_ratings WHERE media_id NOT IN (SELECT id FROM public.library_content);

-- 3. Přidání cizích klíčů (foreign keys) pro automatické propojování
-- Toto umožní Supabase správně spojit watchlist s katalogem filmů
ALTER TABLE public.library_watchlist
  ADD CONSTRAINT fk_watchlist_content
  FOREIGN KEY (media_id) REFERENCES public.library_content(id)
  ON DELETE CASCADE;

ALTER TABLE public.library_ratings
  ADD CONSTRAINT fk_ratings_content
  FOREIGN KEY (media_id) REFERENCES public.library_content(id)
  ON DELETE CASCADE;
