const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const mdPath = path.join(projectRoot, '01_-_Data_a_informace.md');
const sqlPath = path.join(projectRoot, 'matura_kb.sql');

try {
    const md = fs.readFileSync(mdPath, 'utf8');
    const escapedMd = md.replace(/'/g, "''"); // Escape pro SQL

    const sql = `-- Vytvoření tabulky pro Maturitní Akademii (pokud neexistuje)
CREATE TABLE IF NOT EXISTS public.matura_kb (
    item_id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Nastavení RLS (Row Level Security)
ALTER TABLE public.matura_kb ENABLE ROW LEVEL SECURITY;

-- Smazat staré politiky, pokud existují (aby to nepadalo na chybě)
DROP POLICY IF EXISTS "Allow public read access" ON public.matura_kb;
DROP POLICY IF EXISTS "Allow public insert access" ON public.matura_kb;
DROP POLICY IF EXISTS "Allow public update access" ON public.matura_kb;

-- Vytvoření nových politik
CREATE POLICY "Allow public read access" ON public.matura_kb FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.matura_kb FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.matura_kb FOR UPDATE USING (true);

-- Vložení prvního tématu (Informatika 01)
INSERT INTO public.matura_kb (item_id, content) 
VALUES ('it1', '${escapedMd}')
ON CONFLICT (item_id) DO UPDATE SET content = EXCLUDED.content;
`;

    fs.writeFileSync(sqlPath, sql);
    console.log('Soubor matura_kb.sql uspesne vytvoren.');
} catch (e) {
    console.error('Chyba pri generovani SQL:', e);
}
