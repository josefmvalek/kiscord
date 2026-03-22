-- Table to store user's favorite fun facts
CREATE TABLE IF NOT EXISTS public.app_fact_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fact_id BIGINT NOT NULL REFERENCES public.app_facts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, fact_id)
);

-- Enable RLS
ALTER TABLE public.app_fact_favorites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own favorites" 
    ON public.app_fact_favorites 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_fact_favorites;
