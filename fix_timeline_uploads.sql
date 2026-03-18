-- 1. Zajištění existence bucketu pro fotky
-- Supabase ukládá buckety do tabulky storage.buckets
INSERT INTO storage.buckets (id, name, public)
SELECT 'timeline-photos', 'timeline-photos', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'timeline-photos'
);

-- 2. Oprava tabulky timeline_events (přidání chybějících sloupců)
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS user_highlights TEXT DEFAULT '';
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false;

-- 3. Rozšíření RLS pro tabulku timeline_events (povolení zápisu)
-- Nejdříve smažeme starou "jen pro čtení" politiku, pokud existuje pod tímto názvem
DROP POLICY IF EXISTS "Allow public select on timeline_events" ON public.timeline_events;
DROP POLICY IF EXISTS "Povolit vše pro přihlášené" ON public.timeline_events;

-- Vytvoříme novou politiku pro kompletní přístup pro přihlášené uživatele (Sdílená data)
CREATE POLICY "Povolit vše pro přihlášené" 
ON public.timeline_events 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Nastavení politik pro Storage (bucket timeline-photos)
-- Smažeme staré politiky, abychom měli jistotu, že se aplikují ty správné
DROP POLICY IF EXISTS "Povolit nahrávání pro přihlášené" ON storage.objects;
DROP POLICY IF EXISTS "Povolit čtení pro přihlášené" ON storage.objects;
DROP POLICY IF EXISTS "Povolit mazání pro přihlášené" ON storage.objects;
DROP POLICY IF EXISTS "Povolit úpravy pro přihlášené" ON storage.objects;
DROP POLICY IF EXISTS "Povolit anonymní nahrávání do timeline-photos" ON storage.objects;
DROP POLICY IF EXISTS "Povolit anonymní čtení z timeline-photos" ON storage.objects;

-- Politika pro vkládání (Upload)
CREATE POLICY "Povolit nahrávání pro přihlášené"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'timeline-photos');

-- Politika pro čtení (Select)
CREATE POLICY "Povolit čtení pro přihlášené"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'timeline-photos');

-- Politika pro mazání (Delete)
CREATE POLICY "Povolit mazání pro přihlášené"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'timeline-photos');

-- Politika pro úpravy (Update) - nutné pro přepsání souborů nebo metadat
CREATE POLICY "Povolit úpravy pro přihlášené"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'timeline-photos');
