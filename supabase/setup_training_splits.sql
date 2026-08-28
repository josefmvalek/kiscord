-- =====================================================================
-- KISCORD - TRAINING SPLITS & WEEKLY SCHEDULE MIGRACE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.training_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL, -- např. "Push Pull Legs 4-denní"
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    rotation_mode TEXT DEFAULT 'fixed_days', -- 'fixed_days' nebo 'rolling'
    schedule_pattern JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Formát položek v schedule_pattern:
    -- [
    --   { "dayOfWeek": 1, "splitName": "Push Day 🦍", "templateId": "uuid-...", "isRest": false, "preferredTime": "17:00" },
    --   { "dayOfWeek": 2, "splitName": "Rest Day 🛌", "templateId": null, "isRest": true },
    --   ...
    -- ]
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pro training_splits
ALTER TABLE public.training_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for all authenticated users on training_splits" ON public.training_splits;
CREATE POLICY "Allow read access for all authenticated users on training_splits" ON public.training_splits
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage their own training splits" ON public.training_splits;
CREATE POLICY "Users can manage their own training splits" ON public.training_splits
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime publikace
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'training_splits'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.training_splits;
    END IF;
END $$;
