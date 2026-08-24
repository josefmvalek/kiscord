-- ==============================================================================
-- TRACKING ECOSYSTEM & BIOHACKS SCHEMA MIGRATION
-- Cycle tracking with partner privacy, step logs, caffeine kinetics, fasting & recovery
-- ==============================================================================

-- 1. Menstruační Cyklus: Záznamy dnů (Cycle Logs)
CREATE TABLE IF NOT EXISTS public.cycle_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL, -- Format: YYYY-MM-DD
    flow_intensity TEXT CHECK (flow_intensity IN ('none', 'spotting', 'light', 'medium', 'heavy')),
    symptoms JSONB DEFAULT '[]'::JSONB,
    energy_level INT CHECK (energy_level BETWEEN 1 AND 5) DEFAULT 3,
    mood INT CHECK (mood BETWEEN 1 AND 5) DEFAULT 3,
    cervical_mucus TEXT,
    bbt_temperature NUMERIC(4, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT cycle_logs_user_date_uniq UNIQUE(user_id, date_key)
);

-- 2. Menstruační Cyklus: Nastavení a Pravidla Soukromí (Cycle Settings)
CREATE TABLE IF NOT EXISTS public.cycle_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cycle_length_days INT DEFAULT 28,
    period_length_days INT DEFAULT 5,
    luteal_length_days INT DEFAULT 14,
    share_with_partner BOOLEAN DEFAULT TRUE,
    partner_visible_fields JSONB DEFAULT '["phase_name", "energy_level", "mood", "tips"]'::JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Krokoměr a Aktivita (Activity & Step Logs)
CREATE TABLE IF NOT EXISTS public.activity_step_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    steps_count INT DEFAULT 0,
    distance_km NUMERIC(6, 2) DEFAULT 0,
    active_kcal INT DEFAULT 0,
    source TEXT DEFAULT 'manual', -- 'manual', 'live_pedometer', 'apple_health_webhook', 'health_connect'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT activity_step_logs_user_date_uniq UNIQUE(user_id, date_key)
);

-- 4. BioHacks: Kofein, Fasting & Recovery Score (BioHack Logs)
CREATE TABLE IF NOT EXISTS public.biohack_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    caffeine_entries JSONB DEFAULT '[]'::JSONB, -- Array of { id, time, beverage, caffeine_mg }
    fasting_sessions JSONB DEFAULT '[]'::JSONB, -- Array of { id, start_iso, target_hours, end_iso, status }
    recovery_score INT CHECK (recovery_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT biohack_logs_user_date_uniq UNIQUE(user_id, date_key)
);

-- 5. Spánek & Spánková architektura (Sleep Logs)
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    bedtime TEXT,
    wake_time TEXT,
    sleep_duration_hours NUMERIC(4, 2) DEFAULT 8.0,
    time_in_bed_hours NUMERIC(4, 2) DEFAULT 8.5,
    sleep_efficiency INT DEFAULT 90,
    latency_minutes INT DEFAULT 15,
    awakenings_count INT DEFAULT 0,
    restfulness_score INT CHECK (restfulness_score BETWEEN 1 AND 5) DEFAULT 4,
    slept_together BOOLEAN DEFAULT TRUE,
    sleep_tags JSONB DEFAULT '[]'::JSONB,
    dream_note TEXT,
    dream_tags JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT sleep_logs_user_date_uniq UNIQUE(user_id, date_key)
);

-- Indexy pro rychlé dotazování dle data
CREATE INDEX IF NOT EXISTS idx_cycle_logs_date ON public.cycle_logs(date_key);
CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_date ON public.cycle_logs(user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_step_logs_date ON public.activity_step_logs(date_key);
CREATE INDEX IF NOT EXISTS idx_step_logs_user_date ON public.activity_step_logs(user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_biohack_logs_date ON public.biohack_logs(date_key);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_date ON public.sleep_logs(date_key);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON public.sleep_logs(user_id, date_key);

-- RLS (Row Level Security)
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biohack_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

-- Politiky pro Cycle Logs: Vlastník může vše, partner má přístup přes aplikaci/nastavení
CREATE POLICY "cycle_logs_owner_all" ON public.cycle_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "cycle_logs_partner_select" ON public.cycle_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cycle_settings
            WHERE cycle_settings.user_id = cycle_logs.user_id
            AND cycle_settings.share_with_partner = TRUE
        )
    );

-- Politiky pro Cycle Settings
CREATE POLICY "cycle_settings_owner_all" ON public.cycle_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "cycle_settings_partner_select" ON public.cycle_settings
    FOR SELECT USING (TRUE);

-- Politiky pro Activity Step Logs: Sdíleno pro pár (společné výzvy)
CREATE POLICY "step_logs_owner_all" ON public.activity_step_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "step_logs_partner_select" ON public.activity_step_logs
    FOR SELECT USING (TRUE);

-- Politiky pro BioHack Logs
CREATE POLICY "biohack_logs_owner_all" ON public.biohack_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "biohack_logs_partner_select" ON public.biohack_logs
    FOR SELECT USING (TRUE);

-- Politiky pro Sleep Logs: Sdíleno pro pár (párová spánková synergie)
CREATE POLICY "sleep_logs_owner_all" ON public.sleep_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "sleep_logs_partner_select" ON public.sleep_logs
    FOR SELECT USING (TRUE);

