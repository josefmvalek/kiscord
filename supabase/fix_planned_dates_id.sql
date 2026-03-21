-- FIX: Missing default for id in planned_dates
-- This ensures that new plans can be saved even if the frontend doesn't provide an ID.

ALTER TABLE public.planned_dates 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Also ensure date_key is unique just in case
-- ALTER TABLE public.planned_dates ADD CONSTRAINT planned_dates_date_key_key UNIQUE (date_key);
