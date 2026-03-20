-- Tabulka pro sledování pokroku v zajímavostech (OSOBNÍ)
CREATE TABLE IF NOT EXISTS public.fun_fact_progress (
    category_id text NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    current_index integer DEFAULT 0,
    completed boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (category_id, user_id)
);

-- Aktivace RLS
ALTER TABLE public.fun_fact_progress ENABLE ROW LEVEL SECURITY;

-- Politika pro osobní přístup
DROP POLICY IF EXISTS "Individuální fun fact progress" ON public.fun_fact_progress;
CREATE POLICY "Individuální fun fact progress" ON public.fun_fact_progress 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
