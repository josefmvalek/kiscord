-- DRAW DUEL: FULL POTENTIAL - DATABASE SETUP --

-- 1. Create drawings table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT,
    thumbnail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add drawing_id to draw_strokes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='draw_strokes' AND column_name='drawing_id') THEN
        ALTER TABLE draw_strokes ADD COLUMN drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create pinned_drawings table
CREATE TABLE IF NOT EXISTS pinned_drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_drawings ENABLE ROW LEVEL SECURITY;

-- Simple Policies
DROP POLICY IF EXISTS "Allow all authenticated for drawings" ON drawings;
CREATE POLICY "Allow all authenticated for drawings" ON drawings FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all authenticated for pinned_drawings" ON pinned_drawings;
CREATE POLICY "Allow all authenticated for pinned_drawings" ON pinned_drawings FOR ALL TO authenticated USING (true);

-- Enable Realtime (Gracefully)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'drawings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE drawings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pinned_drawings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE pinned_drawings;
    END IF;
END $$;
