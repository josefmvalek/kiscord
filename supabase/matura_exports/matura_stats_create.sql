-- Tabulka pro sledování pokroku v učení jednotlivých kartiček (Spaced Repetition)
CREATE TABLE IF NOT EXISTS matura_flashcards_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    highlight_id UUID REFERENCES matura_highlights(id) ON DELETE CASCADE,
    user_id UUID,
    interval INT DEFAULT 0,         -- Den příštího opakování (0 = dnes, 1 = zítra, atd.)
    ease_factor FLOAT DEFAULT 2.5,  -- Jak moc je karta lehká (SM-2 standard)
    repetition_count INT DEFAULT 0, -- Kolikrát byla karta úspěšně zopakována
    next_review TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_review TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexy pro rychlé dotazy na "hořící" kartičky
CREATE INDEX IF NOT EXISTS idx_matura_fc_next_review ON matura_flashcards_stats(next_review);
CREATE INDEX IF NOT EXISTS idx_matura_fc_user ON matura_flashcards_stats(user_id);

-- RLS
ALTER TABLE matura_flashcards_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read stats" ON matura_flashcards_stats;
CREATE POLICY "Public read stats" ON matura_flashcards_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert stats" ON matura_flashcards_stats;
CREATE POLICY "Public insert stats" ON matura_flashcards_stats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update stats" ON matura_flashcards_stats;
CREATE POLICY "Public update stats" ON matura_flashcards_stats FOR UPDATE USING (true);
