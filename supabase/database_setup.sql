-- Vytvoření tabulky pro Zdraví (Health) - OSOBNÍ DATA
CREATE TABLE public.health_data (
    date_key text NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    water smallint DEFAULT 0,
    sleep numeric,
    mood smallint,
    movement text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (date_key, user_id)
);

-- Vytvoření tabulky pro Achievementy - OSOBNÍ DATA
CREATE TABLE public.achievements (
    id text NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    unlocked_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id, user_id)
);

-- Zabezpečení dat pomocí RLS (Row Level Security)
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline ENABLE ROW LEVEL SECURITY;

-- Politiky pro OSOBNÍ DATA: Každý vidí a mění jen své řádky
DROP POLICY IF EXISTS "Povolit vše pro přihlášené" ON public.health_data;
CREATE POLICY "Individuální přístup k zdraví" ON public.health_data 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Povolit vše pro přihlášené" ON public.achievements;
CREATE POLICY "Individuální přístup k achievementům" ON public.achievements 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Politiky pro SDÍLENÁ DATA: Všichni přihlášení vidí vše
CREATE POLICY "Povolit vše pro přihlášené" ON public.planned_dates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Povolit vše pro přihlášené" ON public.school_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Povolit vše pro přihlášené" ON public.bucket_list FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Povolit vše pro přihlášené" ON public.timeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Politik pro Storage (nahrávání fotek)
-- Vyžaduje přihlášení pro nahrávání i čtení
DROP POLICY IF EXISTS "Povolit anonymní nahrávání do timeline-photos" ON storage.objects;
DROP POLICY IF EXISTS "Povolit anonymní čtení z timeline-photos" ON storage.objects;

CREATE POLICY "Povolit nahrávání pro přihlášené"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'timeline-photos');

CREATE POLICY "Povolit čtení pro přihlášené"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'timeline-photos');

CREATE POLICY "Povolit mazání pro přihlášené"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'timeline-photos');

-- ZAJIŠTĚNÍ METADAT (pokud chybí z dřívějška)
ALTER TABLE public.health_data ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.health_data ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- FUNKCE PRO SPOLEČNÉ QUESTY (Agregace přes RLS)
-- SECURITY DEFINER umožňuje funkci přistupovat k datům všech uživatelů bez ohledu na RLS volajícího.

-- 1. Sčítání vody pro oba uživatele v daném měsíci (podle date_key)
CREATE OR REPLACE FUNCTION get_shared_water_stats(month_prefix text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(water), 0)
        FROM public.health_data
        WHERE date_key LIKE month_prefix || '%'
    );
END;
$$;

-- 2. Počet nocí v MĚSÍCI, kdy OBA spali aspoň X hodin
CREATE OR REPLACE FUNCTION get_shared_sleep_sync(min_hours numeric, month_prefix text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM (
            SELECT date_key
            FROM public.health_data
            WHERE sleep >= min_hours
              AND date_key LIKE month_prefix || '%'
            GROUP BY date_key
            HAVING COUNT(DISTINCT user_id) >= 2
        ) as subquery
    );
END;
$$;

-- AKTIVACE REALTIME pro tabulky
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.health_data, public.bucket_list;
COMMIT;
