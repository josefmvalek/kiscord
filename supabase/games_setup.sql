-- Create game_questions table
CREATE TABLE IF NOT EXISTS game_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    type TEXT NOT NULL, -- 'who_more_likely' or others
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed some "Who's More Likely" questions
INSERT INTO game_questions (text, type) VALUES
('Kdo dřív zapomene, kde zaparkoval auto?', 'who_more_likely'),
('Kdo spíš vyhraje v loterii a všechno utratí za hlouposti?', 'who_more_likely'),
('Kdo spíš přežije v divočině?', 'who_more_likely'),
('Kdo spíš začne tančit na veřejnosti, když slyší oblíbenou písničku?', 'who_more_likely'),
('Kdo dřív usne u filmu?', 'who_more_likely'),
('Kdo spíš zapomene na výročí?', 'who_more_likely'),
('Kdo spíš vyvolá hádku o to, co bude k večeři?', 'who_more_likely'),
('Kdo spíš adoptuje 10 koček?', 'who_more_likely'),
('Kdo dřív zabloudí s navigací v ruce?', 'who_more_likely'),
('Kdo spíš sní tajně celou tabulku čokolády?', 'who_more_likely');

-- Create game_votes table
CREATE TABLE IF NOT EXISTS game_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES game_questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    voted_for_user_id UUID, -- Removed FK constraint to allow placeholder IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, user_id)
);

-- Create draw_strokes table (for Draw Duel)
CREATE TABLE IF NOT EXISTS draw_strokes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    path_data JSONB NOT NULL,
    color TEXT DEFAULT '#ffffff',
    size INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE draw_strokes;

-- Shared RLS Policies
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_strokes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated for game_questions" ON game_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated for game_votes" ON game_votes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all authenticated for draw_strokes" ON draw_strokes FOR ALL TO authenticated USING (true);
