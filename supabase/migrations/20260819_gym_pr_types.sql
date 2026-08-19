-- =====================================================================
-- KISCORD - GYM PR TYPES MIGRATION
-- Adds extended PR type support: weight, volume, est_1rm, reps
-- =====================================================================

ALTER TABLE public.gym_prs
    ADD COLUMN IF NOT EXISTS pr_type TEXT DEFAULT 'weight',
    ADD COLUMN IF NOT EXISTS est_1rm NUMERIC,
    ADD COLUMN IF NOT EXISTS volume_kg NUMERIC;

-- Index for faster PR lookups by type
CREATE INDEX IF NOT EXISTS idx_gym_prs_type ON public.gym_prs(user_id, exercise_id, pr_type);

-- Unique constraint for upsert on PR type per user+exercise
ALTER TABLE public.gym_prs DROP CONSTRAINT IF EXISTS gym_prs_user_exercise_type_unique;
ALTER TABLE public.gym_prs ADD CONSTRAINT gym_prs_user_exercise_type_unique UNIQUE (user_id, exercise_id, pr_type);
