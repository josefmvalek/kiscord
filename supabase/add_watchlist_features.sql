-- Watchlist & Entertainment Hub Features

-- 1. Add Mood Tags to Library Content
ALTER TABLE public.library_content 
ADD COLUMN IF NOT EXISTS mood_tags JSONB DEFAULT '[]';

-- 2. Add is_together to Watchlist (logic: both users have the item)
-- Actually, we can derive this, but let's add a convenience view or just handle in JS.
-- For now, let's add 'priority' or 'notes' to the watchlist items.
ALTER TABLE public.library_watchlist 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Series Progress Tracking (Marathons)
CREATE TABLE IF NOT EXISTS public.library_series_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id INTEGER REFERENCES public.library_content(id) ON DELETE CASCADE,
    current_season INT DEFAULT 1,
    current_episode INT DEFAULT 1,
    total_episodes INT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, media_id)
);

ALTER TABLE public.library_series_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own progress" ON public.library_series_progress
    FOR ALL USING (auth.uid() = user_id);
