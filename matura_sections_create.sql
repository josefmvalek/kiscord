-- Vytvoření tabulky pro ukládání postupu čtení (odškrtnuté kapitoly)
CREATE TABLE IF NOT EXISTS matura_sections_done (
    item_id TEXT NOT NULL,         -- ID tématu, např. 'it1'
    section_id TEXT NOT NULL,      -- "Slug" (text) konkrétní <h2> kapitoly, např. '1-teoreticky-zaklad'
    user_id UUID,                  -- ID uživatele
    creator_name TEXT NOT NULL,    -- 'Jožka' nebo 'Klárka'
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (item_id, section_id, creator_name)
);

-- Povolení RLS
ALTER TABLE matura_sections_done ENABLE ROW LEVEL SECURITY;

-- Politik pro veřejné čtení a zápis
DROP POLICY IF EXISTS "Public read matura_sections_done" ON matura_sections_done;
CREATE POLICY "Public read matura_sections_done" ON matura_sections_done FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert matura_sections_done" ON matura_sections_done;
CREATE POLICY "Public insert matura_sections_done" ON matura_sections_done FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete matura_sections_done" ON matura_sections_done;
CREATE POLICY "Public delete matura_sections_done" ON matura_sections_done FOR DELETE USING (true);
