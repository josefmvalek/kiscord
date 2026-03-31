-- 1. Tabulka pro study streaky (Závisí na Auth uživateli)
CREATE TABLE IF NOT EXISTS matura_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    current_streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    last_study_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabulka pro maturitní achievementy
CREATE TABLE IF NOT EXISTS matura_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    achievement_id TEXT NOT NULL, -- např. 'biflovac_50'
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- 3. Tabulka pro plánování studia (Dnešní mise)
CREATE TABLE IF NOT EXISTS matura_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    item_id TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, item_id, scheduled_date)
);

-- Povolení RLS
ALTER TABLE matura_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE matura_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE matura_schedule ENABLE ROW LEVEL SECURITY;

-- Politiky (Pro zjednodušení v devu opět vše povolené, v produkci by bylo podle user_id)
CREATE POLICY "Public read matura_streaks" ON matura_streaks FOR SELECT USING (true);
CREATE POLICY "Public upsert matura_streaks" ON matura_streaks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update matura_streaks" ON matura_streaks FOR UPDATE USING (true);

CREATE POLICY "Public read matura_achievements" ON matura_achievements FOR SELECT USING (true);
CREATE POLICY "Public insert matura_achievements" ON matura_achievements FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read matura_schedule" ON matura_schedule FOR SELECT USING (true);
CREATE POLICY "Public insert matura_schedule" ON matura_schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update matura_schedule" ON matura_schedule FOR UPDATE USING (true);
CREATE POLICY "Public delete matura_schedule" ON matura_schedule FOR DELETE USING (true);
