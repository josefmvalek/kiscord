import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://nnrorazsiyiedwomgidf.supabase.co'
const supabaseKey = 'sb_publishable_U8n4dSDsXEjH7B_u53vNTw_LNd4gASS'

export const supabase = createClient(supabaseUrl, supabaseKey)
