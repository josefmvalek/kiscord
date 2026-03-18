-- 1. Doplnění sloupců do timeline_events
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS user_highlights TEXT;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false;

-- 2. Tabulka pro hodnocení míst na mapě (pokud chybí)
CREATE TABLE IF NOT EXISTS public.date_ratings (
    location_id INTEGER PRIMARY KEY,
    rating SMALLINT DEFAULT 0,
    user_id uuid DEFAULT auth.uid()
);

-- 3. RLS pro nové věci
ALTER TABLE public.date_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.date_ratings;
CREATE POLICY "Allow all for authenticated" ON public.date_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Povolení zápisu pro timeline_events (pokup chybělo v předchozím kroku)
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.timeline_events;
CREATE POLICY "Allow all for authenticated" ON public.timeline_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
