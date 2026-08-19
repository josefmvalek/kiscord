-- =======================================================
-- KISCORD: Gym Pro Body Measurements & Progress Tracker
-- Migration: 20260817_gym_body_measurements.sql
-- =======================================================

CREATE TABLE IF NOT EXISTS public.gym_body_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date_key TEXT NOT NULL,
    weight NUMERIC,
    body_fat NUMERIC,
    chest NUMERIC,
    arms NUMERIC,
    waist NUMERIC,
    hips NUMERIC,
    thighs NUMERIC,
    calves NUMERIC,
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by user and date
CREATE INDEX IF NOT EXISTS idx_gym_body_measurements_user_date 
ON public.gym_body_measurements (user_id, date_key DESC);

-- Enable RLS
ALTER TABLE public.gym_body_measurements ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated/anon in private couple app
CREATE POLICY "Allow all access to gym_body_measurements" 
ON public.gym_body_measurements 
FOR ALL 
USING (true) 
WITH CHECK (true);
