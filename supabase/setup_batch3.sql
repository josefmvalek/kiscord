-- SETUP FOR BATCH 3: DYNAMIC GAMES & ACHIEVEMENTS

-- 1. Game Prompts (Drawing Game)
CREATE TABLE IF NOT EXISTS game_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Prompts Migration
INSERT INTO game_prompts (text) VALUES
('Nakresli naše první rande'),
('Nakresli naše vysněné bydlení'),
('Nakresli Jožku jako superhrdinu'),
('Nakresli Klárku jako princeznu'),
('Nakresli našeho budoucího pejska'),
('Nakresli tvoje nejoblíbenější jídlo'),
('Nakresli místo, kam chceme vyrazit'),
('Nakresli nás za 50 let'),
('Nakresli mývala (Jožkovo spirituální zvíře)'),
('Nakresli sovu (Klárčino spirituální zvíře)')
ON CONFLICT (text) DO NOTHING;

-- 2. Achievement Categories
CREATE TABLE IF NOT EXISTS achievement_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

INSERT INTO achievement_categories (id, name, sort_order) VALUES
('tutorial', '🟢 The Tutorial (Naše začátky)', 1),
('exploration', '🔵 Exploration & World Events (Naše cesty)', 2),
('easter_eggs', '🔴 Inside Jokes & Easter Eggs (Naše bizáry)', 3),
('dlc', '🟡 Upcoming DLC (Naše roadmapa)', 4),
('health_system', '🩺 Health & System (Automatické)', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- 3. Achievement Definitions
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id TEXT PRIMARY KEY,
    category TEXT REFERENCES achievement_categories(id),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO achievement_definitions (id, category, title, description, icon, color) VALUES
('math_cipher', 'tutorial', 'Matematická šifra', 'Úspěšné získání legendárních výpisků z matematiky, které odstartovalo celou naši story.', '📐', 'from-green-400 to-green-600'),
('discord_residents', 'tutorial', 'Discord Residents', 'Prolomení hranice 6 hodin v jednom kuse v callu bez jediného „dropu“ konverzace.', '🎧', 'from-[#5865F2] to-indigo-600'),
('hello_world', 'tutorial', 'Hello World', 'Oficiální „zakliknutí“ vztahu v aplikaci (24. 12.).', '💻', 'from-pink-400 to-rose-600'),
('sidequest_starter', 'tutorial', 'Sidequest Starter', 'Absolvování prvního společného táboráku u Vlčnovských búd.', '🔥', 'from-orange-400 to-red-500'),
('mammoth_hunters', 'exploration', 'Lovci mamutů', 'Přežití prvního oficiálního rande v Boršicích v mrazivých podmínkách.', '🦣', 'from-cyan-400 to-blue-600'),
('golden_hour', 'exploration', 'Zlatá hodinka', 'Nalezení Slunce u Buchlovského kamene.', '🌅', 'from-yellow-300 to-orange-500'),
('geopolitics', 'exploration', 'Geopolitický převrat', 'Úspěšné přesvědčení občana Podolí, že je ve skutečnosti hrdým Kunovjanem.', '🌍', 'from-emerald-400 to-teal-600'),
('survival_mode', 'exploration', 'Survival Mode', 'Bezpečný návrat domů autem, kterému se uprostřed noci rozhodla vypovědět službu světla.', '🚗', 'from-neutral-600 to-neutral-900'),
('atc_control', 'easter_eggs', 'Řízení letového provozu', 'Správná identifikace letadla vs. hvězdy dříve, než proběhne povinný „fact-check“.', '✈️', 'from-red-400 to-red-600'),
('newton_sacrifice', 'easter_eggs', 'Newtonova oběť', 'Praktický důkaz toho, že přisednutí vlastního kotníku vede k okamžitému rebuildu končetiny v sádře.', '🦵', 'from-zinc-400 to-zinc-600'),
('sowl_synergy', 'easter_eggs', 'Sowl & Raccoon Synergy', 'Harmonické spojení moudré sovy a mývala.', '🦉', 'from-purple-400 to-fuchsia-600'),
('alps_dlc', 'dlc', 'Alps Expansion Pack', 'Společné nasazení ve Woferlgutu.', '🏔️', 'from-amber-200 to-yellow-500'),
('fit_survivors', 'dlc', 'FIT Survivors', 'Úspěšné zkompilování prvního semestru na VUT FIT bez ztráty duševního zdraví.', '💻', 'from-red-600 to-red-800'),
('cips_alpha', 'dlc', 'Cip’s Alpha Version', 'Pořízení prvního psa a jeho oficiální pojmenování podle schválené dokumentace.', '🐕', 'from-yellow-600 to-amber-800'),
('hydration_master', 'health_system', 'Piháchův Vodník', 'Bez hydrování není žití. Vypito minimálně 8/8 pohárků vody za den.', '💧', 'from-blue-400 to-cyan-500'),
('sleeping_beauty', 'health_system', 'Šípková Růženka', 'Poctivý 7+ hodinový spánek držen alespoň 7 dní v kuse.', '👸', 'from-pink-300 to-purple-400'),
('euphoria', 'health_system', 'Vrchol Nálady', 'Dosažena úroveň štěstí 10/10.', '🌞', 'from-yellow-400 to-yellow-600'),
('zombie_survivor', 'health_system', 'Zombie Mód', 'Zvládnutý den s méně než 4 hodinami spánku.', '🧟', 'from-gray-600 to-gray-800'),
('bucket_starter', 'health_system', 'Snílci', 'Přidána první společná položka do Bucket Listu.', '🚀', 'from-orange-400 to-red-500')
ON CONFLICT (id) DO UPDATE SET 
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- RLS POLICIES (Example for JOZEF admin access)
-- Note: Replace '00000000-0000-0000-0000-000000000001' with actual Josef UUID if known,
-- or use email-based check like in previous batches.

-- For simplicity, let's allow ALL authenticated users to SELECT, 
-- but only Jožka (based on email) to manage.

ALTER TABLE game_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select" ON game_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public select" ON achievement_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public select" ON achievement_definitions FOR SELECT TO authenticated USING (true);

-- Admin policies (modify based on your auth helper)
-- Assuming we use the same check as in setup_coop_quests.sql
-- (SELECT email FROM auth.users WHERE id = auth.uid()) ILIKE '%josef%' OR ...
