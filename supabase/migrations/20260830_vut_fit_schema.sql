-- =========================================================================
-- MIGRACE PRO VUT FIT BRNO, HABITS & NÁVKY, FINANČNÍ TRACKER
-- =========================================================================

-- 1. Tabulka pro denní návyky
CREATE TABLE IF NOT EXISTS public.app_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    icon TEXT DEFAULT '🌿',
    name TEXT NOT NULL,
    description TEXT,
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabulka pro splnění návyků (logy)
CREATE TABLE IF NOT EXISTS public.app_habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES public.app_habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, user_id, date_key)
);

-- 3. Tabulka pro rozpočet a finance v Brně
CREATE TABLE IF NOT EXISTS public.app_finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT DEFAULT 'Ostatní',
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabulka pro VUT FIT rozvrh
CREATE TABLE IF NOT EXISTS public.school_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Přednáška',
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    room TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabulka pro VUT FIT studijní plánovač (deadliny, zkoušky)
CREATE TABLE IF NOT EXISTS public.school_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'Projekt',
    deadline_date DATE NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Politiky pro plný přístup přihlášeným uživatelům
ALTER TABLE public.app_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Povolit přihlášeným app_habits" ON public.app_habits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Povolit přihlášeným app_habit_logs" ON public.app_habit_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Povolit přihlášeným app_finances" ON public.app_finances FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Povolit přihlášeným school_schedule" ON public.school_schedule FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Povolit přihlášeným school_deadlines" ON public.school_deadlines FOR ALL USING (auth.role() = 'authenticated');
