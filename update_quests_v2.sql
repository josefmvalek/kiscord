-- 1. Zajištění sloupců (pokud by chyběly)
ALTER TABLE public.health_data ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.health_data ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 2. Oprava/Vytvoření funkce pro sčítání vody
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

-- 3. Oprava/Vytvoření funkce pro spánek
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

-- 4. Zapnutí Realtime pro tabulku health_data
-- Nejprve zkusíme přidat tabulku do existující publikace
DO $$
BEGIN
    -- Pokud publikace neexistuje, vytvoříme ji
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    -- Přidáme tabulky do publikace (pokud tam ještě nejsou)
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_data;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bucket_list;
EXCEPTION
    WHEN duplicate_object THEN
        -- Tabulky už v publikaci jsou, to je v pořádku
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Chyba při nastavování realtime: %', SQLERRM;
END $$;
