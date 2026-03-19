-- Create drawings table
CREATE TABLE IF NOT EXISTS drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT,
    thumbnail TEXT, -- Base64 thumbnail for quick loading
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add drawing_id to draw_strokes
ALTER TABLE draw_strokes ADD COLUMN IF NOT EXISTS drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE;

-- Enable RLS for drawings
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated for drawings" ON drawings FOR ALL TO authenticated USING (true);

-- Update Realtime for drawings
ALTER PUBLICATION supabase_realtime ADD TABLE drawings;
