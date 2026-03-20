-- 1. Create coop_quests table
CREATE TABLE IF NOT EXISTS public.coop_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    goal INTEGER NOT NULL,
    unit TEXT,
    type TEXT NOT NULL, -- e.g. 'sum_water', 'both_sleep', 'count_bucket'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.coop_quests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Anyone can read active quests" ON public.coop_quests;
CREATE POLICY "Anyone can read active quests" ON public.coop_quests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Josef can manage quests" ON public.coop_quests;
CREATE POLICY "Only Josef can manage quests" ON public.coop_quests
    FOR ALL USING (
        auth.jwt() ->> 'email' ILIKE '%josef%' OR 
        auth.jwt() ->> 'email' ILIKE '%jozk%'
    );

-- 4. Initial Seed Data (from quests.js)
INSERT INTO public.coop_quests (title, description, icon, color, goal, unit, type)
VALUES 
('💧 Vodní nádrže', 'Vypijte společně 150 sklenic body za tento měsíc.', '🌊', 'from-blue-400 to-cyan-500', 150, 'sklenic', 'sum_water'),
('😴 Spánková harmonie', 'Oba spěte aspoň 7 hodin ve stejnou noc (aspoň 5x za týden).', '✨', 'from-indigo-500 to-purple-600', 5, 'nocí', 'both_sleep'),
('🚀 Lovci zážitků', 'Splňte společně 5 nových věcí z Bucket Listu.', '🗺️', 'from-orange-400 to-red-500', 5, 'položek', 'count_bucket')
ON CONFLICT DO NOTHING;
