
import { createClient } from '@supabase/supabase-base-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data: kb } = await supabase.from('matura_kb').select('*').eq('item_id', 'it1').single();
    console.log('KB Entry for it1:', kb);

    const { data: done, count } = await supabase.from('matura_sections_done').select('*', { count: 'exact' }).eq('item_id', 'it1');
    console.log('Sections Done for it1:', done);
    console.log('Count:', count);
}

check();
