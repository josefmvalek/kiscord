-- Anniversary Milestone: 3 Months Together!
INSERT INTO public.achievement_definitions (id, category, title, description, icon, color)
VALUES (
    'quarter_year_anniversary', 
    'love', 
    'Čtvrt roku spolu! 🥂', 
    'Gratulujeme! Jste spolu už celé 3 měsíce. To je pořádný důvod k oslavě!', 
    '🥂', 
    'from-rose-400 to-pink-600'
) ON CONFLICT (id) DO NOTHING;
