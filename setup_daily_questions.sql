-- 1. Tabulka pro otázky
CREATE TABLE IF NOT EXISTS public.daily_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    category TEXT DEFAULT 'vztah',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabulka pro odpovědi
CREATE TABLE IF NOT EXISTS public.daily_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.daily_questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users NOT NULL,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(question_id, user_id) -- Jeden uživatel = jedna odpověď na otázku
);

-- 3. RLS Politiky
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_answers ENABLE ROW LEVEL SECURITY;

-- Otázky můžou číst všichni přihlášení
DROP POLICY IF EXISTS "Anyone can read daily questions" ON public.daily_questions;
CREATE POLICY "Anyone can read daily questions" ON public.daily_questions
    FOR SELECT TO authenticated USING (true);

-- Odpovědi: každý může číst vše (aby viděl partnerovu), ale vkládat jen své
DROP POLICY IF EXISTS "Shared access to daily answers" ON public.daily_answers;
CREATE POLICY "Shared access to daily answers" ON public.daily_answers
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can only insert their own answers" ON public.daily_answers;
CREATE POLICY "Users can only insert their own answers" ON public.daily_answers
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Realtime
ALTER TABLE public.daily_answers REPLICA IDENTITY FULL;
-- Přidání do publikace (pokud už existuje, jinak se musí vytvořit)
-- V kiscord publikaci obvykle máme vše povolené
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_answers;
    END IF;
END $$;

-- 5. Seed pár počátečních otázek
INSERT INTO public.daily_questions (text, category) VALUES
('Co je tvoje nejoblíbenější společná vzpomínka z minulého roku?', 'vztah'),
('Kdybychom mohli zítra odletět kamkoliv na světě, kam by to bylo?', 'sny'),
('Co na mně nejvíc oceňuješ v běžném každodenním životě?', 'vztah'),
('Jakou dovednost nebo hobby by ses chtěl(a) naučit společně?', 'aktivity'),
('Která písnička ti mě nejvíc připomíná?', 'emoce'),
('Jaká je tvoje představa o dokonalém líném nedělním odpoledni?', 'relax'),
('Co je ta nejvtipnější věc, kterou jsme spolu zažili?', 'vtipné'),
('Kdybys mohl(a) na mně změnit jednu maličkost (v dobrém), co by to bylo?', 'vztah'),
('Jaký je tvůj největší společný cíl pro tento rok?', 'plány'),
('Čím ti dneska můžu udělat největší radost?', 'láska');
