const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Pocitac/Desktop/Projekty/kiscord/penis_facts.txt', 'utf8').split('\n');

let level1 = '';
let level2 = '';
let sql = `-- FULL SQL IMPORT: Fakty o pérech (Encyklopedie Kiscordu)
-- Main Category: penis
-- Icon: 🍌

-- Vycisteni starych dat
DELETE FROM public.app_facts WHERE category = 'penis';

INSERT INTO public.app_facts (category, subcategory, subcategory_level2, text, icon) VALUES
`;

const values = [];

function extractIcon(str) {
    const firstWord = str.split(' ')[0];
    if (firstWord && !firstWord.match(/[a-zA-Z0-9]/)) {
        return firstWord;
    }
    return '🍌';
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === ' ' || line === '') continue;

    if (line.startsWith('•')) {
        let text = line.substring(1).trim();
        text = text.replace(/'/g, "''"); // escape single quotes
        
        let icon = extractIcon(level2);
        if (icon === '🍌') icon = extractIcon(level1);
        
        const sub1 = level1.replace(/'/g, "''");
        const sub2 = level2.replace(/'/g, "''");
        
        values.push(`('penis', '${sub1}', '${sub2}', '${text}', '${icon}')`);
    } else {
        let nextNonEmpty = '';
        for (let j = i + 1; j < lines.length; j++) {
            let nextLine = lines[j].trim();
            if (nextLine && nextLine !== ' ' && nextLine !== '') {
                nextNonEmpty = nextLine;
                break;
            }
        }
        
        if (nextNonEmpty && !nextNonEmpty.startsWith('•')) {
            level1 = line;
        } else {
            level2 = line;
        }
    }
}

sql += values.join(',\n') + ';\n';

fs.writeFileSync('c:/Users/Pocitac/Desktop/Projekty/kiscord/supabase/migrations/20260322_import_penis_facts.sql', sql, 'utf8');
console.log(`Parsed facts: ${values.length}`);
