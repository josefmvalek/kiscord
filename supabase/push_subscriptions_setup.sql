-- Web Push Subscriptions Table
-- Spusť v Supabase SQL editoru

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL, -- { p256dh: string, auth: string }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Každý uživatel spravuje jen vlastní subscripce
CREATE POLICY "Users manage own subscriptions"
    ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Function) může číst všechny subscripce
CREATE POLICY "Service role full access"
    ON push_subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Index pro rychlé vyhledávání podle user_id
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
    ON push_subscriptions (user_id);
