-- ============================================================
-- NOVÉ FUNKCE: Digitální Dopisy & Kvízy pro dva
-- Spusť v Supabase SQL Editoru
-- ============================================================

-- 1. Digitální Dopisy
CREATE TABLE IF NOT EXISTS love_letters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  unlock_at timestamptz NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE love_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Both users can see all letters" ON love_letters;
CREATE POLICY "Both users can see all letters" ON love_letters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Sender manages own letters" ON love_letters;
CREATE POLICY "Sender manages own letters" ON love_letters
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Sender deletes own letters" ON love_letters;
CREATE POLICY "Sender deletes own letters" ON love_letters
  FOR DELETE USING (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Mark letter as read" ON love_letters;
CREATE POLICY "Mark letter as read" ON love_letters
  FOR UPDATE USING (true);

-- 2. Kvízy pro dva
CREATE TABLE IF NOT EXISTS couple_quizzes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name text NOT NULL,
  title text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE couple_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All can see quizzes" ON couple_quizzes;
CREATE POLICY "All can see quizzes" ON couple_quizzes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Creator manages quiz" ON couple_quizzes;
CREATE POLICY "Creator manages quiz" ON couple_quizzes
  FOR ALL USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS couple_quiz_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid REFERENCES couple_quizzes(id) ON DELETE CASCADE,
  answerer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  score integer DEFAULT 0,
  total integer DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(quiz_id, answerer_id)
);
ALTER TABLE couple_quiz_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All can see quiz answers" ON couple_quiz_answers;
CREATE POLICY "All can see quiz answers" ON couple_quiz_answers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Answerer manages own answers" ON couple_quiz_answers;
CREATE POLICY "Answerer manages own answers" ON couple_quiz_answers
  FOR ALL USING (auth.uid() = answerer_id);
