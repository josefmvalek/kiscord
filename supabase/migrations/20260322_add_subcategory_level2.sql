-- 1. Add Level 2 subcategory to facts
ALTER TABLE public.app_facts 
ADD COLUMN IF NOT EXISTS subcategory_level2 TEXT;

CREATE INDEX IF NOT EXISTS idx_app_facts_subcategory2 ON public.app_facts(subcategory_level2);

-- 2. Add Level 2 to progress tracking
ALTER TABLE public.fun_fact_progress 
ADD COLUMN IF NOT EXISTS subcategory_level2_id TEXT DEFAULT '';

-- Update Primary Key to include both subcategory levels
ALTER TABLE public.fun_fact_progress DROP CONSTRAINT IF EXISTS fun_fact_progress_pkey;
ALTER TABLE public.fun_fact_progress ADD PRIMARY KEY (category_id, user_id, subcategory_id, subcategory_level2_id);

COMMENT ON COLUMN public.app_facts.subcategory_level2 IS 'Second level subcategory name';
COMMENT ON COLUMN public.fun_fact_progress.subcategory_level2_id IS 'ID for independent progress tracking at the second subcategory level';
