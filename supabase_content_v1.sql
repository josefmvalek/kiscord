-- Tabulka pro zajímavosti (animal facts, fun facts)
CREATE TABLE IF NOT EXISTS app_facts (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL, -- 'octopus', 'owl', 'raccoon', 'fun'
    icon TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabulka pro katalog knihovny (filmy, seriály, hry)
CREATE TABLE IF NOT EXISTS library_content (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL, -- 'movie', 'series', 'game'
    title TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    magnet TEXT,
    gdrive TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabulka pro časovou osu (timeline)
CREATE TABLE IF NOT EXISTS timeline_events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    event_date DATE, -- Pokud je null, řadí se podle ID nebo jiného klíče
    icon TEXT,
    color TEXT,
    description TEXT,
    images TEXT[], -- Pole URL obrázků
    location_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabulka pro lokality (date planner)
CREATE TABLE IF NOT EXISTS date_locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Politiky (Read pro všechny přihlášené, Write jen pro admina/majitele - v tomto případě Josefa)
-- Pro zjednodušení v této fázi: SELECT všichni, INSERT/UPDATE jen určité ID (Josefa)

ALTER TABLE app_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on app_facts" ON app_facts FOR SELECT USING (true);

ALTER TABLE library_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on library_content" ON library_content FOR SELECT USING (true);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on timeline_events" ON timeline_events FOR SELECT USING (true);

ALTER TABLE date_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on date_locations" ON date_locations FOR SELECT USING (true);
