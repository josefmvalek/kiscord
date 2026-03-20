-- Fix for couple_quizzes table schema

-- 1. Add missing columns
ALTER TABLE public.couple_quizzes 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

ALTER TABLE public.couple_quizzes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add missing columns to couple_quiz_answers if needed
-- The code uses score, total, answers, quiz_id, answerer_id which all exist.
-- But let's add updated_at for answers too just in case.
ALTER TABLE public.couple_quiz_answers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
