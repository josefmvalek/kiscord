-- Batch 4: Dynamic Polish & New Achievements (FIXED v3)

-- 1. Ensure categories exist (Minimal columns: id, name)
INSERT INTO public.achievement_categories (id, name) VALUES
('growth', 'Osobní růst'),
('games', 'Hry a zábava'),
('love', 'Naše pouto'),
('daily', 'Denní rituály')
ON CONFLICT (id) DO NOTHING;

-- 2. Migrate remaining funFacts from data.js
INSERT INTO public.app_facts (category, text, icon) VALUES
('fun', 'Vesmír voní jako spálený steak, střelný prach a maliny.', '🌌'),
('fun', 'Sirius je nejjasnější hvězda noční oblohy (a není to vrtulník).', '✨'),
('fun', 'Císař Nero prý při požáru Říma vůbec nebyl ve městě.', '🔥'),
('fun', 'Lidé sdílí 50 % DNA s banány (někdy to tak i vypadá).', '🍌'),
('fun', 'VUT FIT má ve znaku sovu (nebo něco, co ji připomíná).', '🦉'),
('fun', 'Med se nikdy nezkazí. Archeologové našli v egyptských hrobkách 3000 let starý jedlý med.', '🍯'),
('fun', 'Vidra spí tak, že se drží za tlapky, aby neodpluly od sebe.', '🦦'),
('fun', 'Krávy mají nejlepší kamarádky a jsou ve stresu, když jsou od sebe.', '🐄'),
('fun', 'Průměrný mrak váží přibližně 500 000 kilogramů (jako 100 slonů).', '☁️'),
('fun', 'Člověk stráví průměrně 6 měsíců života čekáním na zelenou na semaforu.', '🚦')
ON CONFLICT DO NOTHING;

-- 3. Define New Achievements
INSERT INTO public.achievement_definitions (id, category, title, description, icon, color) VALUES
('fact_enthusiast', 'growth', 'Osvícení', 'Přečetla jsi všechnu moudrost v jedné kategorii v Encyklopedii.', '🧠', 'from-blue-400 to-indigo-600'),
('quiz_master', 'games', 'Pravá ruka', 'Získala jsi 100% v kvízu, který pro tebe vytvořil partner.', '🎯', 'from-yellow-400 to-orange-500'),
('letter_writer', 'love', 'Romantik', 'Poslala jsi svůj první digitální milostný dopis.', '✉️', 'from-pink-400 to-rose-600'),
('social_butterfly', 'daily', 'Yapper', 'Napsala jsi 10 zpráv v uvítacím chatu. Pořád máš co říct!', '💬', 'from-teal-400 to-cyan-500')
ON CONFLICT (id) DO NOTHING;
