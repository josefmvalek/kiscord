-- Vytvoření tabulky pro směny
CREATE TABLE IF NOT EXISTS public.brigade_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_key TEXT NOT NULL, -- formát YYYY-MM-DD
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    shift_type TEXT NOT NULL, -- 'ranni' (🌅), 'odpoledni' (🌆), 'volno' (🌴), 'custom' (⚙️)
    time_start TEXT, -- formát HH:MM (volitelné)
    time_end TEXT, -- formát HH:MM (volitelné)
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_shifts_date_key ON public.brigade_shifts(date_key);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON public.brigade_shifts(user_id);

-- Povolení Realtime replikace
-- check if already in publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'brigade_shifts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.brigade_shifts;
    END IF;
END $$;

-- Povolení Row Level Security
ALTER TABLE public.brigade_shifts ENABLE ROW LEVEL SECURITY;

-- Zásady přístupu (RLS) - čtení i zápis pro všechny ověřené uživatele (Jožka & Klárka)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.brigade_shifts;
CREATE POLICY "Allow all operations for authenticated users" ON public.brigade_shifts
    AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Vytvoření tabulky pro vlastní rakouská slovíčka
CREATE TABLE IF NOT EXISTS public.austrian_vocab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    austrian TEXT NOT NULL,
    german TEXT NOT NULL,
    czech TEXT NOT NULL,
    category TEXT NOT NULL,
    example TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pro rychlé vyhledávání podle kategorie
CREATE INDEX IF NOT EXISTS idx_vocab_category ON public.austrian_vocab(category);

-- Povolení Realtime replikace pro tabulku austrian_vocab
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'austrian_vocab'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.austrian_vocab;
    END IF;
END $$;

-- Povolení Row Level Security
ALTER TABLE public.austrian_vocab ENABLE ROW LEVEL SECURITY;

-- Zásady přístupu (RLS) - čtení i zápis pro všechny ověřené uživatele (Jožka & Klárka)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.austrian_vocab;
CREATE POLICY "Allow all operations for authenticated users" ON public.austrian_vocab
    AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

