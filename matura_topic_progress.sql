-- Vytvoření tabulky pro ukládání stavu tématu (Můžu / Dělám / Hotovo)
-- Používáme kombinaci item_id a user_id jako primární klíč pro snadný upsert
CREATE TABLE IF NOT EXISTS matura_topic_progress (
    item_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'none', -- 'none', 'started', 'done'
    notes TEXT, -- Každý uživatel má své vlastní poznámky k tématu
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (item_id, user_id)
);

-- Povolení RLS
ALTER TABLE matura_topic_progress ENABLE ROW LEVEL SECURITY;

-- Politik pro veřejné čtení a zápis
DROP POLICY IF EXISTS "Public read matura_topic_progress" ON matura_topic_progress;
CREATE POLICY "Public read matura_topic_progress" ON matura_topic_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public upsert matura_topic_progress" ON matura_topic_progress;
CREATE POLICY "Public upsert matura_topic_progress" ON matura_topic_progress FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update matura_topic_progress" ON matura_topic_progress;
CREATE POLICY "Public update matura_topic_progress" ON matura_topic_progress FOR UPDATE USING (true);
