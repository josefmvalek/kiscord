-- 1. Create Matura Topics table
CREATE TABLE IF NOT EXISTS matura_topics (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL, -- czech_jozka, czech_klarka, it
    title TEXT NOT NULL,
    author TEXT,
    icon TEXT DEFAULT '📓',
    cat TEXT, -- Sub-category (e.g. Renesance, Hardware)
    description TEXT,
    has_content BOOLEAN DEFAULT false,
    flashcards JSONB DEFAULT '[]'::jsonb,
    file TEXT, -- URL for PDF if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS (Public Read, Authenticated Write)
ALTER TABLE matura_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read matura_topics" ON matura_topics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage topics" ON matura_topics 
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Seed data extracted from matura_data.js
INSERT INTO matura_topics (id, category_id, title, author, icon, cat, description, has_content, flashcards)
VALUES
('cj1', 'czech_jozka', 'Romeo a Julie', 'William Shakespeare', '⚔️', 'Renesance', NULL, false, '[]'::jsonb),
('cj2', 'czech_jozka', 'Hamlet', 'William Shakespeare', '💀', 'Renesance', NULL, false, '[]'::jsonb),
('cj3', 'czech_jozka', 'Havran', 'Edgar Allan Poe', '🐦‍⬛', 'Romantismus', NULL, false, '[]'::jsonb),
('cj4', 'czech_jozka', 'Slavík a růže', 'Oscar Wilde', '🌹', 'Dekadence', NULL, false, '[]'::jsonb),
('cj5', 'czech_jozka', 'Kytice', 'Karel Jaromír Erben', '🌿', 'Romantismus', NULL, false, '[]'::jsonb),
('cj6', 'czech_jozka', 'Revizor', 'Nikolaj Vasiljevič Gogol', '🎭', 'Realismus', NULL, false, '[]'::jsonb),
('cj7', 'czech_jozka', 'Jak je důležité míti Filipa', 'Oscar Wilde', '🎩', 'Dekadence', NULL, false, '[]'::jsonb),
('cj8', 'czech_jozka', 'Pygmalion', 'George Bernard Shaw', '🏛️', 'Modernismus', NULL, false, '[]'::jsonb),
('cj9', 'czech_jozka', 'Proměna', 'Franz Kafka', '🪲', 'Existencialismus', NULL, false, '[]'::jsonb),
('cj10', 'czech_jozka', 'Malý princ', 'Antoine de Saint-Exupéry', '👑', 'Moderní', NULL, false, '[]'::jsonb),
('cj11', 'czech_jozka', 'Farma zvířat', 'George Orwell', '🐷', 'Antiutopie', NULL, false, '[]'::jsonb),
('cj12', 'czech_jozka', '1984', 'George Orwell', '👁️', 'Antiutopie', NULL, false, '[]'::jsonb),
('cj13', 'czech_jozka', 'Stařec a moře', 'Ernest Hemingway', '🎣', 'Ztracená generace', NULL, false, '[]'::jsonb),
('cj14', 'czech_jozka', 'O myších a lidech', 'John Steinbeck', '🐭', 'Realismus', NULL, false, '[]'::jsonb),
('cj15', 'czech_jozka', 'R.U.R.', 'Karel Čapek', '🤖', 'Sci-fi / Drama', NULL, false, '[]'::jsonb),
('cj16', 'czech_jozka', 'Bílá nemoc', 'Karel Čapek', '🦠', 'Drama', NULL, false, '[]'::jsonb),
('cj17', 'czech_jozka', 'Bylo nás pět', 'Karel Poláček', '👦', 'Humoreska', NULL, false, '[]'::jsonb),
('cj18', 'czech_jozka', 'Saturnin', 'Zdeněk Jirotka', '🥣', 'Humor', NULL, false, '[]'::jsonb),
('cj19', 'czech_jozka', 'Krysař', 'Viktor Dyk', '🐀', 'Anarchisté', NULL, false, '[]'::jsonb),
('cj20', 'czech_jozka', 'Ostře sledované vlaky', 'Bohumil Hrabal', '🚂', 'Postmoderna', NULL, false, '[]'::jsonb),

('ck1', 'czech_klarka', 'Tartuffe', 'Molière', '🎭', 'Klasicismus', NULL, false, '[]'::jsonb),
('ck2', 'czech_klarka', 'Jeptiška', 'Denis Diderot', '⛪', 'Osvícenství', NULL, false, '[]'::jsonb),
('ck3', 'czech_klarka', 'Labyrint světa a ráj srdce', 'Jan Amos Komenský', '🌀', 'Baroko', NULL, false, '[]'::jsonb),
('ck4', 'czech_klarka', 'Kytice', 'Karel Jaromír Erben', '🌿', 'Romantismus', NULL, false, '[]'::jsonb),
('ck5', 'czech_klarka', 'R.U.R.', 'Karel Čapek', '🤖', 'Sci-fi / Drama', NULL, false, '[]'::jsonb),
('ck6', 'czech_klarka', 'Slavík a růže', 'Oscar Wilde', '🌹', 'Dekadence', NULL, false, '[]'::jsonb),
('ck7', 'czech_klarka', 'Havran', 'Edgar Allan Poe', '🐦‍⬛', 'Romantismus', NULL, false, '[]'::jsonb),
('ck8', 'czech_klarka', 'Oliver Twist', 'Charles Dickens', '👜', 'Realismus', NULL, false, '[]'::jsonb),
('ck9', 'czech_klarka', 'Proměna', 'Franz Kafka', '🪲', 'Existencialismus', NULL, false, '[]'::jsonb),
('ck10', 'czech_klarka', 'Stařec a moře', 'Ernest Hemingway', '🎣', 'Ztracená generace', NULL, false, '[]'::jsonb),
('ck11', 'czech_klarka', 'Na západní frontě klid', 'Erich Maria Remarque', '🪖', 'Válečný', NULL, false, '[]'::jsonb),
('ck12', 'czech_klarka', 'O myších a lidech', 'John Steinbeck', '🐭', 'Realismus', NULL, false, '[]'::jsonb),
('ck13', 'czech_klarka', 'Malý princ', 'Antoine de Saint-Exupéry', '👑', 'Moderní', NULL, false, '[]'::jsonb),
('ck14', 'czech_klarka', 'Pygmalion', 'George Bernard Shaw', '🏛️', 'Modernismus', NULL, false, '[]'::jsonb),
('ck15', 'czech_klarka', 'Krysař', 'Viktor Dyk', '🐀', 'Anarchisté', NULL, false, '[]'::jsonb),
('ck16', 'czech_klarka', 'Romeo, Julie a tma', 'Jan Otčenášek', '❤️‍🩹', 'Válečný', NULL, false, '[]'::jsonb),
('ck17', 'czech_klarka', 'Bílá nemoc', 'Karel Čapek', '🦠', 'Drama', NULL, false, '[]'::jsonb),
('ck18', 'czech_klarka', 'Bylo nás pět', 'Karel Poláček', '👦', 'Humoreska', NULL, false, '[]'::jsonb),
('ck19', 'czech_klarka', 'Rozmarné léto', 'Vladislav Vančura', '⛱️', 'Poetismus', NULL, false, '[]'::jsonb),
('ck20', 'czech_klarka', 'Saturnin', 'Zdeněk Jirotka', '🥣', 'Humor', NULL, false, '[]'::jsonb),

('it1', 'it', '01 - Data a informace', NULL, '📊', 'Teorie', 'Základní jednotky informace, šum, redundance, entropie.', true, '[{"q": "Co je to bit?", "a": "Nejmenší jednotka informace (0 nebo 1)."}, {"q": "Co je to entropie?", "a": "Míra neurčitosti nebo neuspořádanosti systému."}, {"q": "Co je to šum?", "a": "Nežádoucí zkreslení signálu při přenosu."}]'::jsonb),
('it2', 'it', '02 - Kódování a komprese', NULL, '📦', 'Teorie', 'Binární kódování, ASCII, Unicode, bezeztrátová a ztrátová komprese.', true, '[{"q": "Kolik bitů má standardní ASCII?", "a": "7 bitů (128 znaků)."}, {"q": "Rozdíl mezi ztrátovou a bezeztrátovou kompresí?", "a": "U ztrátové dochází k nevratnému zahubení části dat pro menší velikost (např. MP3, JPEG)."}]'::jsonb),
('it3', 'it', '03 - Přenos dat a komunikace', NULL, '📡', 'Sítě', 'Přenosové protokoly, chyby při přenosu, kontrolní součty.', true, '[{"q": "Co je to kontrolní součet (Checksum)?", "a": "Metoda k ověření integrity přenášených dat."}]'::jsonb),
('it4', 'it', '04 - Číselné soustavy a převody', NULL, '🔢', 'Matematika', 'Binární, osmičková, šestnáctková soustava, převody.', true, '[{"q": "Základ hexadecimální soustavy?", "a": "16"}]'::jsonb),
('it5', 'it', '05 - Základní části počítače', NULL, '🖥️', 'Hardware', 'Skříně, základní desky, paměti, procesory, grafické karty.', true, '[{"q": "Co dělá CPU?", "a": "Zpracovává instrukce a řídí chod celého počítače."}]'::jsonb),
('it6', 'it', '06 - Vstupní a výstupní zařízení', NULL, '⌨️', 'Hardware', 'Klávesnice, myši, skenery, monitory, tiskárny.', true, '[{"q": "Příklad vstupního zařízení?", "a": "Klávesnice, myš, skener."}]'::jsonb),
('it7', 'it', '07 - Operační systémy', NULL, '⚙️', 'Software', 'Funkce OS, správa souborů, multitasking, uživatelská práva.', true, '[{"q": "Co je multitasking?", "a": "Schopnost OS vykonávat více aplikací \"současně\"."}]'::jsonb),
('it8', 'it', '08 - Modelování a reprezentace', NULL, '📊', 'Analýza', 'Modely, schémata, grafy, tabulky, diagramy.', true, '[{"q": "K čemu slouží modely dat?", "a": "K vizualizaci struktury a vztahů v datech."}]'::jsonb),
('it9', 'it', '09 - Algoritmizace a logika', NULL, '🧠', 'Programování', 'Algoritmus, vývojové diagramy, pseudokód, algoritmy.', true, '[{"q": "Co musí splňovat algoritmus?", "a": "Konečnost, jednoznačnost, obecnost."}]'::jsonb),
('it10', 'it', '10 - Základy programování', NULL, '🐍', 'Python', 'Proměnné, vstup/výstup, podmínky, cykly.', true, '[{"q": "Jak se v Pythonu vypíše text?", "a": "Pomocí funkce print()."}]'::jsonb),
('it11', 'it', '11 - Datové struktury', NULL, '🧱', 'Programování', 'Seznamy, slovníky, funkce, práce s textem.', true, '[{"q": "Rozdíl mezi seznamem a slovníkem?", "a": "Seznam je seřazený (indexy), slovník je neuspořádaný par klíč:hodnota."}]'::jsonb),
('it12', 'it', '12 - Tabulkový procesor', NULL, '📋', 'Office', 'Vzorce, funkce, grafy, filtrování, kontingenční tabulky.', true, '[{"q": "K čemu je kontingenční tabulka?", "a": "Shrnutí a analýza velkého množství dat."}]'::jsonb),
('it13', 'it', '13 - Databáze', NULL, '🗄️', 'IT', 'Relační databáze, tabulky, dotazy, základní příkazy.', true, '[{"q": "Nejpoužívanější jazyk pro dotazy?", "a": "SQL"}]'::jsonb),
('it14', 'it', '14 - Informační systémy', NULL, '☁️', 'IT', 'Návrh a správa informačních systémů.', true, '[{"q": "Cíl IS?", "a": "Sběr, ukládání a distribuce informací."}]'::jsonb),
('it15', 'it', '15 - Počítačové sítě', NULL, '🌐', 'Sítě', 'Topologie, IP adresace, DNS, protokoly, internet.', true, '[{"q": "Co dělá DNS?", "a": "Překládá doménová jména na IP adresy."}]'::jsonb),
('it16', 'it', '16 - Digitální bezpečnost', NULL, '🔐', 'Bezpečnost', 'Šifrování, hesla, phishing, GDPR.', true, '[{"q": "Příklad Phishingu?", "a": "Falešný e-mail tvářící se jako banka pro krádež údajů."}]'::jsonb),
('it17', 'it', '17 - Umělá inteligence', NULL, '🤖', 'Moderní', 'Strojové učení, neuronové sítě.', true, '[{"q": "Co je strojové učení?", "a": "Schopnost systému učit se z dat bez explicitního programování."}]'::jsonb),
('it18', 'it', '18 - Etika a právo v ICT', NULL, '⚖️', 'Teorie', 'Autorská práva, licencování, digitální stopa.', true, '[{"q": "Co je digitální stopa?", "a": "Záznam aktivit, které po sobě zanecháváme na internetu."}]'::jsonb),
('it19', 'it', '19 - Moderní technologie', NULL, '🚀', 'Moderní', 'Cloud computing, IoT, blockchain, rozšířená realita.', true, '[{"q": "Co je to IoT?", "a": "Internet věcí – propojení fyzických předmětů se sítí."}]'::jsonb),
('it20', 'it', '20 - Historické milníky', NULL, '⏳', 'Teorie', 'Historie počítačů a osobnosti informatiky.', true, '[{"q": "Kdo byl Alan Turing?", "a": "Matematik a otec informatiky, prolomil Enigmu."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    author = EXCLUDED.author,
    icon = EXCLUDED.icon,
    cat = EXCLUDED.cat,
    description = EXCLUDED.description,
    has_content = EXCLUDED.has_content,
    flashcards = EXCLUDED.flashcards,
    updated_at = NOW();

-- 4. Create Matura Knowledge Base table
CREATE TABLE IF NOT EXISTS matura_kb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL UNIQUE REFERENCES matura_topics(id),
    content TEXT DEFAULT '',
    sections_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE matura_kb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read matura_kb" ON matura_kb FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage kb" ON matura_kb 
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create Storage Bucket for Matura Images (This usually needs to be done via UI/API, but we provide the SQL for permissions if bucket exists)
-- Assuming bucket 'matura_images' is created manually in Supabase UI
