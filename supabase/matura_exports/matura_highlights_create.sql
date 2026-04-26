-- Vytvoření tabulky pro ukládání textových zvýraznění (Highlighter)
CREATE TABLE IF NOT EXISTS matura_highlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id TEXT NOT NULL,         -- ID maturitního tématu (např. 'it1')
    user_id UUID,                  -- ID uživatele ze Supabase Auth
    creator_name TEXT NOT NULL,    -- 'Jožka' nebo 'Klárka' (pro snazší sdílený režim později)
    start_offset INT NOT NULL,     -- Kde v textu zvýraznění začíná
    end_offset INT NOT NULL,       -- Kde končí
    color TEXT NOT NULL,           -- 'yellow', 'red', 'green'
    note TEXT,                     -- Osobní poznámka (ve Fázi 1 zatím prázdné)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vytvoření indexů pro rychlé vyhledávání podle tématu a uživatele
CREATE INDEX IF NOT EXISTS idx_matura_highlights_item_id ON matura_highlights(item_id);
CREATE INDEX IF NOT EXISTS idx_matura_highlights_creator ON matura_highlights(creator_name);

-- Povolení řádkové bezpečnosti (Row Level Security - RLS)
ALTER TABLE matura_highlights ENABLE ROW LEVEL SECURITY;

-- Vytvoření politik pro veřejné čtení a zápis (tak jako ve zbytku projektu)
DROP POLICY IF EXISTS "Public read matura_highlights" ON matura_highlights;
CREATE POLICY "Public read matura_highlights" ON matura_highlights FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert matura_highlights" ON matura_highlights;
CREATE POLICY "Public insert matura_highlights" ON matura_highlights FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update matura_highlights" ON matura_highlights;
CREATE POLICY "Public update matura_highlights" ON matura_highlights FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete matura_highlights" ON matura_highlights;
CREATE POLICY "Public delete matura_highlights" ON matura_highlights FOR DELETE USING (true);
