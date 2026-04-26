-- Tabulka pro synchronizaci Pomodoro časovače
-- Používáme fixní ID 'global', protože v Kiscordu máme jen jeden sdílený Focus Hub
CREATE TABLE IF NOT EXISTS matura_pomodoro (
    id TEXT PRIMARY KEY DEFAULT 'global',
    status TEXT NOT NULL DEFAULT 'stopped', -- 'running', 'stopped'
    started_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL DEFAULT 25,
    last_updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Povolení RLS
ALTER TABLE matura_pomodoro ENABLE ROW LEVEL SECURITY;

-- Politik pro čtení a zápis
DROP POLICY IF EXISTS "Public read matura_pomodoro" ON matura_pomodoro;
CREATE POLICY "Public read matura_pomodoro" ON matura_pomodoro FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public upsert matura_pomodoro" ON matura_pomodoro;
CREATE POLICY "Public upsert matura_pomodoro" ON matura_pomodoro FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update matura_pomodoro" ON matura_pomodoro;
CREATE POLICY "Public update matura_pomodoro" ON matura_pomodoro FOR UPDATE USING (true);
