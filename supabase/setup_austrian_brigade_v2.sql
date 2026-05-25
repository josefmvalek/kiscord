-- =====================================================================
-- KISCORD - ALPSKÁ EDICE (DATABÁZOVÁ MIGRACE V2)
-- =====================================================================
-- Tento skript připraví databázi Supabase pro 3 nové alpské moduly:
-- 1. Rakouská Kasička (brigade_finances)
-- 2. Alpská Výzva (brigade_challenges)
-- 3. Alpský Deníček (brigade_diary)

-- ---------------------------------------------------------------------
-- 1. TABULKA: RAKOUSKÁ KASIČKA (Finance)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brigade_finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL, -- hodnota (např. 15.50)
    type TEXT NOT NULL CHECK (type IN ('earning', 'expense')), -- příjem / výdaj
    description TEXT NOT NULL, -- popis
    category TEXT NOT NULL, -- např. Mzda 💶, Potraviny 🛒, Cestování 🏔️, Zábava 🍻, Ostatní ⚙️
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS a Realtime pro brigade_finances
ALTER TABLE public.brigade_finances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users on brigade_finances" ON public.brigade_finances;
DROP POLICY IF EXISTS "Users can only manage their own finances" ON public.brigade_finances;
CREATE POLICY "Users can only manage their own finances" ON public.brigade_finances
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'brigade_finances'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.brigade_finances;
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 2. TABULKA: ALPSKÁ VÝZVA (Challenges)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brigade_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_key TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    completed_by_jose BOOLEAN DEFAULT false,
    completed_by_klarka BOOLEAN DEFAULT false,
    jose_note TEXT,
    klarka_note TEXT,
    jose_image_url TEXT,
    klarka_image_url TEXT,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS a Realtime pro brigade_challenges
ALTER TABLE public.brigade_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users on brigade_challenges" ON public.brigade_challenges;
CREATE POLICY "Allow all operations for authenticated users on brigade_challenges" ON public.brigade_challenges
    AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'brigade_challenges'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.brigade_challenges;
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3. TABULKA: ALPSKÝ DENÍČEK (Diary)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brigade_diary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_key TEXT NOT NULL, -- YYYY-MM-DD
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    highlight_text TEXT NOT NULL,
    rant_text TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date_key, user_id)
);

-- RLS a Realtime pro brigade_diary
ALTER TABLE public.brigade_diary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users on brigade_diary" ON public.brigade_diary;
CREATE POLICY "Allow all operations for authenticated users on brigade_diary" ON public.brigade_diary
    AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'brigade_diary'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.brigade_diary;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- Indexy pro optimalizaci výkonu
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_finances_user_id ON public.brigade_finances(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_date_key ON public.brigade_challenges(date_key);
CREATE INDEX IF NOT EXISTS idx_diary_date_key ON public.brigade_diary(date_key);
CREATE INDEX IF NOT EXISTS idx_diary_user_id ON public.brigade_diary(user_id);

-- ---------------------------------------------------------------------
-- 4. ALPSKÉ ROZŠÍŘENÍ: DODATEČNÉ ZMĚNY SCHEMA (MIGRACE V3)
-- ---------------------------------------------------------------------
-- Přidání sloupce country do date_locations (pro přepínač CZ/AT)
ALTER TABLE public.date_locations ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CZ';

-- Přidání sloupce voice_note_url do brigade_diary (pro hlasový deník)
ALTER TABLE public.brigade_diary ADD COLUMN IF NOT EXISTS voice_note_url TEXT;
