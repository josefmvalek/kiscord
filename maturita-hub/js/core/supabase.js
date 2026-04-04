import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Vaše údaje z projektu maturitaHub 2026
const supabaseUrl = 'https://uxlzaffsfbrwcmuyjodx.supabase.co';
const supabaseKey = 'sb_publishable_4snl8wV9ad3GpBVLa9JavQ_-ifbkB6x';

export const supabase = createClient(supabaseUrl, supabaseKey);
