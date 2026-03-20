-- Create puzzle_images table
CREATE TABLE IF NOT EXISTS public.puzzle_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.puzzle_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access for puzzle_images"
ON public.puzzle_images FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert puzzle_images"
ON public.puzzle_images FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete puzzle_images"
ON public.puzzle_images FOR DELETE
TO authenticated
USING (true);

-- Optional: Initial data
INSERT INTO public.puzzle_images (url, name) VALUES
('img/puzzle/puzzle_myval_sova_foto.jpg', 'Sova & Mýval (Originál)'),
('img/puzzle/puzzle_myval_zaba_kreslene.jpg', 'Žabák & Kamarádi (Kreslené)'),
('img/puzzle/crazy_fight_sova_myval.jpg', 'Crazy Fight'),
('img/puzzle/myval_zaba_ai.jpg', 'AI Art: Mýval & Žába'),
('img/puzzle/myval_zaba_medvidek.jpg', 'Trio: Mýval, Žába, Medvídek');
