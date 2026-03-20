-- 1. Povolení sdíleného přístupu k achievementům (Síň Slávy je společná)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal achievements" ON public.achievements;
DROP POLICY IF EXISTS "Individuální přístup k achievementům" ON public.achievements;
DROP POLICY IF EXISTS "Shared achievements access" ON public.achievements;
CREATE POLICY "Shared achievements access"
  ON public.achievements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. Aktivace Realtime pro tabulku achievements
-- Nejdříve zjistíme, které tabulky už v publikaci jsou, abychom je nepřepsali
-- Ale v kiscord projektu obvykle vytváříme publikaci znovu se všemi tabulkami pro jistotu

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.health_data, 
    public.bucket_list,
    public.timeline_events,
    public.library_watchlist,
    public.library_ratings,
    public.planned_dates,
    public.school_events,
    public.tetris_scores,
    public.love_letters,
    public.couple_quizzes,
    public.couple_quiz_answers,
    public.achievements; -- Přidáno
COMMIT;
