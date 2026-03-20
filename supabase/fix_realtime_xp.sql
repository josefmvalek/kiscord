-- JISTOTA: Aktivace Realtime pro všechny XP tabulky
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bucket_list;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline;
-- (Pokud už tam jsou, tak to jen nahlásí chybu/skipne, což nevadí)
