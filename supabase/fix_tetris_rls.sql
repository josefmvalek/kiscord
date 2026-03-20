-- FIX: Tetris Scores RLS (Shared SELECT, Personal UPDATE)
-- Allows both players to see each other's scores, but only update their own.

ALTER TABLE public.tetris_scores ENABLE ROW LEVEL SECURITY;

-- 1. Remove old restrictive or conflicting policies
DROP POLICY IF EXISTS "Individuální tetris" ON public.tetris_scores;
DROP POLICY IF EXISTS "Shared tetris scores" ON public.tetris_scores;
DROP POLICY IF EXISTS "Select tetris scores" ON public.tetris_scores;
DROP POLICY IF EXISTS "Manage own tetris score" ON public.tetris_scores;

-- 2. Create refined policies
-- Everyone authenticated can see all scores
CREATE POLICY "Select tetris scores" 
ON public.tetris_scores FOR SELECT 
TO authenticated 
USING (true);

-- Users can only insert/update/delete their own row
CREATE POLICY "Manage own tetris score" 
ON public.tetris_scores FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
-- 3. Add updated_at column if it's missing (fixes some earlier issues)
ALTER TABLE public.tetris_scores ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
