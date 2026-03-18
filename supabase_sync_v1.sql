-- 1. Tabulka pro Tetris skóre (OSOBNÍ)
CREATE TABLE IF NOT EXISTS public.tetris_scores (
    user_id uuid DEFAULT auth.uid() PRIMARY KEY,
    score integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabulka pro Library Watchlist (SDÍLENÉ)
CREATE TABLE IF NOT EXISTS public.library_watchlist (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    media_id text NOT NULL,
    type text NOT NULL, -- 'movie' / 'series'
    added_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(media_id)
);

-- 3. Tabulka pro Library Ratings & History (SDÍLENÉ)
CREATE TABLE IF NOT EXISTS public.library_ratings (
    media_id text PRIMARY KEY,
    rating smallint DEFAULT 0,
    status text, -- 'watched', 'planning', null
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabulka pro Topic Progress (OSOBNÍ)
CREATE TABLE IF NOT EXISTS public.topic_progress (
    topic_id text NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    current_index integer DEFAULT 0,
    completed boolean DEFAULT false,
    bookmarks text[] DEFAULT '{}', -- pole ID otázek
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (topic_id, user_id)
);

-- AKTIVACE RLS
ALTER TABLE public.tetris_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;

-- POLITIKY
-- OSOBNÍ
CREATE POLICY "Individuální tetris" ON public.tetris_scores FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Individuální topic progress" ON public.topic_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SDÍLENÉ
CREATE POLICY "Sdílený watchlist" ON public.library_watchlist FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Sdílené hodnocení" ON public.library_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.library_watchlist, public.library_ratings;
