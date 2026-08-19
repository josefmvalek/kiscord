-- =====================================================================
-- KISCORD GYM V5 ENHANCEMENTS: Phase 5 Migration
-- Adds support for:
--  1. gym_logs: photo_url (selfie/pump mirror photos), checklist (pre/post-workout)
--  2. gym_exercises: metric_type (weight_reps, duration, cardio, bodyweight), user_notes (machine pin/seat notes)
-- =====================================================================

ALTER TABLE IF EXISTS gym_logs 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{"creatine":false,"water":false,"preworkout":false,"protein":false}'::jsonb;

ALTER TABLE IF EXISTS gym_exercises
ADD COLUMN IF NOT EXISTS metric_type TEXT DEFAULT 'weight_reps',
ADD COLUMN IF NOT EXISTS user_notes TEXT;

-- Index for speedy lookups of user exercise history
CREATE INDEX IF NOT EXISTS idx_gym_logs_user_date ON gym_logs (user_id, date_key DESC);
