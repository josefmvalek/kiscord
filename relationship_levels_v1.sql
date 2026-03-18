-- 1. Tabulka pro globální nastavení vztahu (Témata)
CREATE TABLE IF NOT EXISTS public.relationship_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    current_theme text DEFAULT 'dark' NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vložíme výchozí řádek, pokud neexistuje
INSERT INTO public.relationship_settings (id, current_theme)
SELECT '00000000-0000-0000-0000-000000000000', 'dark'
WHERE NOT EXISTS (SELECT 1 FROM public.relationship_settings WHERE id = '00000000-0000-0000-0000-000000000000');

-- 2. RPC funkce pro výpočet celkového XP
CREATE OR REPLACE FUNCTION get_relationship_xp()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    xp_water bigint;
    xp_sleep bigint;
    xp_bucket bigint;
    xp_timeline bigint;
BEGIN
    -- Voda: 1 XP za každou sklenici
    SELECT COALESCE(SUM(water), 0) INTO xp_water FROM public.health_data;
    
    -- Spánek: 10 XP za každou zapsanou noc (kde sleep > 0)
    SELECT COUNT(*) * 10 INTO xp_sleep FROM public.health_data WHERE sleep > 0;
    
    -- Bucket List: 50 XP za každou splněnou položku
    SELECT COUNT(*) * 50 INTO xp_bucket FROM public.bucket_list WHERE is_completed = true;
    
    -- Timeline: 25 XP za každou vzpomínku
    SELECT COUNT(*) * 25 INTO xp_timeline FROM public.timeline;
    
    RETURN xp_water + xp_sleep + xp_bucket + xp_timeline;
END;
$$;

-- Povolit Realtime i pro nastavení
ALTER PUBLICATION supabase_realtime ADD TABLE public.relationship_settings;
