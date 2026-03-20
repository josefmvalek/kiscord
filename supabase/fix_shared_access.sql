-- ============================================================
-- FIX: Sdílený přístup k datům pro oba uživatele
-- Spusť v Supabase SQL Editoru
-- ============================================================

-- ==============================================
-- SDÍLENÉ TABULKY – oba vidí a editují vše
-- ==============================================

-- 1. timeline_events (správné jméno tabulky)
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.timeline_events;
DROP POLICY IF EXISTS "Shared timeline access" ON public.timeline_events;
CREATE POLICY "Shared timeline access"
  ON public.timeline_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. library_content (filmy, seriály, hry – sdílený katalog)
ALTER TABLE public.library_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared library content" ON public.library_content;
CREATE POLICY "Shared library content"
  ON public.library_content FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3. library_watchlist (co chceme sledovat – sdílené)
ALTER TABLE public.library_watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared watchlist" ON public.library_watchlist;
CREATE POLICY "Shared watchlist"
  ON public.library_watchlist FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 4. library_ratings (hodnocení – sdílené)
ALTER TABLE public.library_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared ratings" ON public.library_ratings;
CREATE POLICY "Shared ratings"
  ON public.library_ratings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 5. conversation_topics (knihovna témat – sdílená)
ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared topics" ON public.conversation_topics;
CREATE POLICY "Shared topics"
  ON public.conversation_topics FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 6. date_locations (mapa – sdílená)
ALTER TABLE public.date_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared date locations" ON public.date_locations;
CREATE POLICY "Shared date locations"
  ON public.date_locations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 7. date_ratings (hvězdičky míst – sdílené)
ALTER TABLE public.date_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared date ratings" ON public.date_ratings;
DROP POLICY IF EXISTS "All can read date ratings" ON public.date_ratings;
DROP POLICY IF EXISTS "Users manage own ratings" ON public.date_ratings;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.date_ratings;
CREATE POLICY "Shared date ratings"
  ON public.date_ratings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 8. planned_dates (naplánovaná rande – sdílená)
ALTER TABLE public.planned_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All can manage planned dates" ON public.planned_dates;
DROP POLICY IF EXISTS "Shared planned dates" ON public.planned_dates;
CREATE POLICY "Shared planned dates"
  ON public.planned_dates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 9. school_events (školní akce – sdílené)
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared school events" ON public.school_events;
CREATE POLICY "Shared school events"
  ON public.school_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 10. bucket_list (sdílený)
ALTER TABLE public.bucket_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared bucket list" ON public.bucket_list;
CREATE POLICY "Shared bucket list"
  ON public.bucket_list FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 11. tetris_scores (sdílené – oba vidí obě skóre)
ALTER TABLE public.tetris_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared tetris scores" ON public.tetris_scores;
CREATE POLICY "Shared tetris scores"
  ON public.tetris_scores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 12. love_letters (sdílené – oba vidí všechny dopisy)
ALTER TABLE public.love_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Both users can see all letters" ON public.love_letters;
DROP POLICY IF EXISTS "Sender manages own letters" ON public.love_letters;
DROP POLICY IF EXISTS "Sender deletes own letters" ON public.love_letters;
DROP POLICY IF EXISTS "Mark letter as read" ON public.love_letters;
CREATE POLICY "Shared love letters"
  ON public.love_letters FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 13. couple_quizzes (sdílené)
ALTER TABLE public.couple_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All can see quizzes" ON public.couple_quizzes;
DROP POLICY IF EXISTS "Creator manages quiz" ON public.couple_quizzes;
CREATE POLICY "Shared couple quizzes"
  ON public.couple_quizzes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 14. couple_quiz_answers (sdílené – oba vidí odpovědi)
ALTER TABLE public.couple_quiz_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All can see quiz answers" ON public.couple_quiz_answers;
DROP POLICY IF EXISTS "Answerer manages own answers" ON public.couple_quiz_answers;
CREATE POLICY "Shared quiz answers"
  ON public.couple_quiz_answers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 15. app_facts (sdílené)
ALTER TABLE public.app_facts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shared facts" ON public.app_facts;
CREATE POLICY "Shared facts"
  ON public.app_facts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ==============================================
-- OSOBNÍ TABULKY – každý má přístup jen ke svému
-- ==============================================

-- health_data – OSOBNÍ
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Individuální přístup k zdraví" ON public.health_data;
CREATE POLICY "Personal health data"
  ON public.health_data FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- achievements – OSOBNÍ  
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Individuální přístup k achievementům" ON public.achievements;
CREATE POLICY "Personal achievements"
  ON public.achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- topic_progress – OSOBNÍ (každý si sleduje svůj postup)
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal topic progress" ON public.topic_progress;
CREATE POLICY "Personal topic progress"
  ON public.topic_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- quiz_answers – OSOBNÍ
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own quiz" ON public.quiz_answers;
CREATE POLICY "Personal quiz answers"
  ON public.quiz_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- REALTIME – aktivace pro sdílené tabulky
-- ==============================================
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
    public.couple_quiz_answers;
COMMIT;
