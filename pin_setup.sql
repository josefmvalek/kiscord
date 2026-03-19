-- Table to store a pinned drawing for the dashboard
CREATE TABLE IF NOT EXISTS pinned_drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE pinned_drawings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated for pinned_drawings" ON pinned_drawings FOR ALL TO authenticated USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pinned_drawings;

-- Insert initial empty or just leave it
