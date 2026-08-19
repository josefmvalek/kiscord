-- =====================================================================
-- KISCORD - GYM WORKOUT MODES & SUPERSETS MIGRATION
-- Adds mode, circuit_rounds, amrap_minutes, emom_minutes to templates & logs
-- =====================================================================

ALTER TABLE public.gym_templates
    ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS circuit_rounds INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS amrap_minutes INTEGER DEFAULT 20,
    ADD COLUMN IF NOT EXISTS emom_minutes INTEGER DEFAULT 15;

ALTER TABLE public.gym_logs
    ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS rounds_completed INTEGER;
