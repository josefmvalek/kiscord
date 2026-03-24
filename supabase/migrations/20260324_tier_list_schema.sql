-- Tier List Module: Storage for rankings and duels
CREATE TABLE IF NOT EXISTS public.tier_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'custom', -- 'movies', 'timeline', 'locations', 'custom'
    data JSONB NOT NULL DEFAULT '{"tiers": [], "pool": []}', -- Current shared/final state
    is_duel BOOLEAN DEFAULT false,
    duel_data JSONB DEFAULT '{}' -- { jose: { tiers: [...] }, klarka: { tiers: [...] }, jose_ready: false, klarka_ready: false }
);

-- Enable RLS
ALTER TABLE public.tier_lists ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for shared access between partners)
CREATE POLICY "Partners can manage shared tier lists" 
    ON public.tier_lists 
    FOR ALL 
    TO authenticated 
    USING (true);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE tier_lists;
