-- =====================================================================
-- KISCORD - GYM & FITNESS TRACKER MIGRACE
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABULKA: KATALOG CVIKŮ (gym_exercises)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_exercises (
    id TEXT PRIMARY KEY, -- např. "bench_press", "squat"
    name TEXT NOT NULL,  -- např. "Bench Press", "Dřep"
    category TEXT NOT NULL, -- např. "Hrudník", "Nohy", "Záda"
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS a Realtime pro gym_exercises
ALTER TABLE public.gym_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users on gym_exercises" ON public.gym_exercises;
CREATE POLICY "Allow all operations for authenticated users on gym_exercises" ON public.gym_exercises
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 2. TABULKA: TRÉNINKOVÉ ŠABLONY (gym_templates)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- např. "Push Day"
    description TEXT, -- např. "Trénink zaměřený na prsa, ramena a triceps"
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb, -- pole s [{exercise_id: '...', sets: 4, reps: 8}]
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS a Realtime pro gym_templates
ALTER TABLE public.gym_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users on gym_templates" ON public.gym_templates;
CREATE POLICY "Allow all operations for authenticated users on gym_templates" ON public.gym_templates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 3. TABULKA: ZÁZNAMY TRÉNINKŮ (gym_logs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
    template_id UUID REFERENCES public.gym_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- např. "Push Day"
    duration_seconds INTEGER DEFAULT 0, -- celkový čas tréninku v sekundách
    date_key TEXT NOT NULL, -- YYYY-MM-DD
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb, -- výsledky [{exercise_id: '...', exercise_name: '...', sets: [{reps: 8, weight: 80, completed: true}]}]
    cheers JSONB NOT NULL DEFAULT '[]'::jsonb, -- reakce partnera, např. [{"user": "Klárka", "emoji": "🔥"}]
    logged_at TIMESTAMPTZ DEFAULT now()
);

-- RLS a Realtime pro gym_logs
ALTER TABLE public.gym_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for all authenticated users on gym_logs" ON public.gym_logs;
CREATE POLICY "Allow read access for all authenticated users on gym_logs" ON public.gym_logs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage their own gym logs" ON public.gym_logs;
CREATE POLICY "Users can manage their own gym logs" ON public.gym_logs
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. TABULKA: OSOBNÍ REKORDY (gym_prs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_prs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
    exercise_id TEXT NOT NULL,
    weight NUMERIC NOT NULL,
    reps INTEGER NOT NULL,
    achieved_at TIMESTAMPTZ DEFAULT now(),
    log_id UUID REFERENCES public.gym_logs(id) ON DELETE CASCADE
);

-- RLS a Realtime pro gym_prs
ALTER TABLE public.gym_prs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for all authenticated users on gym_prs" ON public.gym_prs;
CREATE POLICY "Allow read access for all authenticated users on gym_prs" ON public.gym_prs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage their own gym prs" ON public.gym_prs;
CREATE POLICY "Users can manage their own gym prs" ON public.gym_prs
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5. POVOLENÍ REALTIME PRO VŠECHNY NOVÉ TABULKY
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'gym_exercises'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_exercises;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'gym_templates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_templates;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'gym_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_logs;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'gym_prs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_prs;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. INDEXY PRO RYCHLEJŠÍ VYHLEDÁVÁNÍ
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gym_logs_user_id ON public.gym_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_logs_date_key ON public.gym_logs(date_key);
CREATE INDEX IF NOT EXISTS idx_gym_prs_user_id ON public.gym_prs(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_prs_exercise_id ON public.gym_prs(exercise_id);

-- ---------------------------------------------------------------------
-- 7. AKTUALIZACE SPOLEČNÉ XP FUNKCE (+20 XP za trénink)
-- ---------------------------------------------------------------------
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
    xp_gym bigint;
BEGIN
    -- Voda: 1 XP za každou sklenici
    SELECT COALESCE(SUM(water), 0) INTO xp_water FROM public.health_data;
    
    -- Spánek: 10 XP za každou zapsanou noc (kde sleep > 0)
    SELECT COUNT(*) * 10 INTO xp_sleep FROM public.health_data WHERE sleep > 0;
    
    -- Bucket List: 50 XP za každou splněnou položku
    SELECT COUNT(*) * 50 INTO xp_bucket FROM public.bucket_list WHERE is_completed = true;
    
    -- Timeline: 25 XP za každou vzpomínku
    SELECT COUNT(*) * 25 INTO xp_timeline FROM public.timeline;
    
    -- Gym: 20 XP za každý dokončený trénink
    SELECT COUNT(*) * 20 INTO xp_gym FROM public.gym_logs;
    
    RETURN xp_water + xp_sleep + xp_bucket + xp_timeline + xp_gym;
END;
$$;
