-- ============================================================
-- FINAL LOCALSTORAGE → SUPABASE MIGRATION
-- Spusť v Supabase SQL Editoru
-- ============================================================

-- 1. Quiz Answers (nová tabulka)
CREATE TABLE IF NOT EXISTS quiz_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  completed boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own quiz" ON quiz_answers;
CREATE POLICY "Users manage own quiz" ON quiz_answers
  FOR ALL USING (auth.uid() = user_id);

-- 2. Date Ratings (zajistit existenci)
CREATE TABLE IF NOT EXISTS date_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id integer NOT NULL,
  rating integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(location_id)
);
ALTER TABLE date_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All can read date ratings" ON date_ratings;
DROP POLICY IF EXISTS "Users manage own ratings" ON date_ratings;
CREATE POLICY "All can read date ratings" ON date_ratings FOR SELECT USING (true);
CREATE POLICY "Users manage own ratings" ON date_ratings
  FOR ALL USING (auth.uid() = user_id);

-- 3. Planned Dates (zajistit existenci)
CREATE TABLE IF NOT EXISTS planned_dates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date_key text NOT NULL UNIQUE,
  name text,
  cat text,
  time text,
  note text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE planned_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All can manage planned dates" ON planned_dates;
CREATE POLICY "All can manage planned dates" ON planned_dates FOR ALL USING (true);
