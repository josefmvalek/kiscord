-- 1. ZÁKLADNÍ NASTAVENÍ PRO REALTIME (Klíčové pro Realtime!)
-- Bez REPLICA IDENTITY FULL nemusí Realtime triggery na UPDATE fungovat správně.
ALTER TABLE public.health_data REPLICA IDENTITY FULL;
ALTER TABLE public.bucket_list REPLICA IDENTITY FULL;
ALTER TABLE public.timeline REPLICA IDENTITY FULL;

-- 2. UJISTIT SE, ŽE TABULKY JSOU V PUBLIKACI (Pokud již jsou, nevadí)
BEGIN;
  -- Pokud by se stalo, že publikace neexistuje (nestandardní), vytvoříme ji
  -- CREATE PUBLICATION IF NOT EXISTS supabase_realtime; 
  
  -- Poznámka: Tato operace může selhat, pokud tabulky už v publikaci jsou, proto to dáváme do bloku
  DO $$ 
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_data;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Tabulka health_data již pravděpodobně v publikaci je.';
  END $$;

  DO $$ 
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bucket_list;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Tabulka bucket_list již pravděpodobně v publikaci je.';
  END $$;

  DO $$ 
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Tabulka timeline již pravděpodobně v publikaci je.';
  END $$;
COMMIT;

-- 3. TEST RPC (Ujistíme se, že funkce počítá aktuální data)
SELECT get_relationship_xp();
