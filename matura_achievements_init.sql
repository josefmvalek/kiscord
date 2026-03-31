-- 1. Přidání kategorie Maturita (pokud neexistuje)
INSERT INTO achievement_categories (id, name, icon) 
VALUES ('matura', 'Maturitní Akademie', '🎓')
ON CONFLICT (id) DO NOTHING;

-- 2. Definice maturitních achievementů
INSERT INTO achievement_definitions (id, category, title, description, icon, color)
VALUES 
('matura_streak_3', 'matura', 'Třídenní dříč', 'Udržel jsi studijní streak 3 dny v kuse! 🔥', '🔥', 'from-orange-400 to-red-500'),
('matura_streak_7', 'matura', 'Týdenní legenda', 'Studuješ 7 dní v kuse bez jediné pauzy! 🏆', '🐉', 'from-amber-400 to-yellow-600'),
('matura_first_topic', 'matura', 'První zářez', 'Kompletně jsi dokončil své první téma k maturitě.', '🎯', 'from-blue-400 to-indigo-500'),
('matura_it_master', 'matura', 'IT Guru', 'Dokončil jsi všechna témata v okruhu Informatika.', '💻', 'from-teal-400 to-emerald-500'),
('matura_quiz_winner', 'matura', 'Rychlá ruka', 'Vyhrál jsi svůj první společný duel v flashcards.', '⚡', 'from-purple-400 to-pink-500'),
('matura_planner_pro', 'matura', 'Strategický mozek', 'Naplánoval sis a splnil 5 témat v řadě na konkrétní dny.', '📅', 'from-cyan-400 to-blue-500')
ON CONFLICT (id) DO NOTHING;
