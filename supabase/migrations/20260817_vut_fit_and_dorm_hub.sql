-- =========================================================================
-- MIGRACE: VUT FIT Rozvrh 2.0, Bodový Plánovač & Kolejní Hub
-- Datum: 17. 8. 2026
-- =========================================================================

-- 1. Rozšíření položek rozvrhu (schedule_items) o učebnu, budovu a poznámky
CREATE TABLE IF NOT EXISTS public.schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Přednáška', -- 'Přednáška' | 'Cvičení' | 'Laboratoř' | 'Seminář' | 'Zkouška'
    day_of_week INT NOT NULL, -- 1 = Po, 5 = Pá
    time_start TEXT NOT NULL, -- '10:00'
    time_end TEXT NOT NULL, -- '11:50'
    room TEXT, -- 'D105', 'E112', 'C228'
    building TEXT DEFAULT 'Božetěchova',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS room TEXT,
ADD COLUMN IF NOT EXISTS building TEXT DEFAULT 'Božetěchova',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Tabulka pro předměty a bodový systém FITu (school_subjects)
CREATE TABLE IF NOT EXISTS public.school_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- 'IZP', 'IUS', 'IDA', 'IMA1', 'ITW'
    name TEXT NOT NULL, -- 'Základy programování', 'Úvod do softwarového inženýrství'
    semester TEXT DEFAULT '1. semestr (Zima)',
    points_labs NUMERIC DEFAULT 0, -- Body z laborek / cvičení (např. 0-20)
    points_projects NUMERIC DEFAULT 0, -- Body z projektů (např. 0-30)
    points_midterm NUMERIC DEFAULT 0, -- Půlsemestrálka (např. 0-20)
    points_exam NUMERIC DEFAULT 0, -- Závěrečná zkouška (např. 0-50)
    min_credit_points NUMERIC DEFAULT 20, -- Minimum bodů pro zápočet
    target_grade TEXT DEFAULT 'A', -- 'A' | 'B' | 'C' | 'D' | 'E'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabulka pro deadliny na FITu (school_deadlines)
CREATE TABLE IF NOT EXISTS public.school_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_code TEXT, -- 'IZP'
    title TEXT NOT NULL, -- 'Projekt 1 - Práce s textem'
    type TEXT DEFAULT 'Projekt', -- 'Projekt' | 'Půlsemestrálka' | 'Zkouška' | 'Laborka' | 'Úkol'
    deadline_date DATE NOT NULL,
    deadline_time TEXT DEFAULT '23:59',
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabulka pro kolejní praní a notifikace (dorm_laundry)
CREATE TABLE IF NOT EXISTS public.dorm_laundry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_minutes INT NOT NULL DEFAULT 45,
    machine_number TEXT DEFAULT 'Pračka 1',
    is_finished BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabulka pro sdílený kolejní nákupní checklist (dorm_shopping_items)
CREATE TABLE IF NOT EXISTS public.dorm_shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'potraviny', -- 'potraviny' | 'drogerie' | 'pokoj' | 'škola'
    is_bought BOOLEAN DEFAULT false,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Povolení RLS a veřejných politik (pro pár)
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dorm_laundry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dorm_shopping_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access schedule_items" ON public.schedule_items;
    CREATE POLICY "Public access schedule_items" ON public.schedule_items FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access school_subjects" ON public.school_subjects;
    CREATE POLICY "Public access school_subjects" ON public.school_subjects FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access school_deadlines" ON public.school_deadlines;
    CREATE POLICY "Public access school_deadlines" ON public.school_deadlines FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access dorm_laundry" ON public.dorm_laundry;
    CREATE POLICY "Public access dorm_laundry" ON public.dorm_laundry FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access dorm_shopping_items" ON public.dorm_shopping_items;
    CREATE POLICY "Public access dorm_shopping_items" ON public.dorm_shopping_items FOR ALL USING (true) WITH CHECK (true);
END $$;
