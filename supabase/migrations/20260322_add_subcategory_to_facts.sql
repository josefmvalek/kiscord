-- 1. Add subcategory to facts
ALTER TABLE public.app_facts 
ADD COLUMN IF NOT EXISTS subcategory TEXT;

CREATE INDEX IF NOT EXISTS idx_app_facts_subcategory ON public.app_facts(subcategory);

-- 2. Update progress tracking to support subcategories
-- Note: We use '' as default for subcategory_id to keep it in the Primary Key (PK columns can't be NULL in Postgres)
ALTER TABLE public.fun_fact_progress 
ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT '';

-- Update Primary Key to include subcategory_id
-- We need to drop the old PK and add the new one
ALTER TABLE public.fun_fact_progress DROP CONSTRAINT IF EXISTS fun_fact_progress_pkey;
ALTER TABLE public.fun_fact_progress ADD PRIMARY KEY (category_id, user_id, subcategory_id);

COMMENT ON COLUMN public.app_facts.subcategory IS 'Optional subcategory name';
COMMENT ON COLUMN public.fun_fact_progress.subcategory_id IS 'Optional subcategory ID for independent progress tracking';
