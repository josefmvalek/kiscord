-- 1. Povolení rozšíření
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Přidání sloupců pro uložení nastavení a stavu notifikací
alter table public.profiles add column if not exists settings jsonb default '{}'::jsonb;
alter table public.health_data add column if not exists notified_reminders jsonb default '{}'::jsonb;

-- 3. Vytvoření CRON úlohy (spouští se každých 15 minut)
-- UPOZORNĚNÍ: Zde je potřeba nahradit <ANON_KEY> skutečným anon key vašeho projektu.
-- Edge Function cron-reminders bude kontrolovat oprávnění.

select cron.schedule(
  'invoke-cron-reminders',
  '*/15 * * * *',
  $$
    select net.http_post(
        url:='https://nnrorazsiyiedwomgidf.supabase.co/functions/v1/cron-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb
    );
  $$
);

-- Pomocný skript pro smazání cronu, pokud by bylo potřeba:
-- select cron.unschedule('invoke-cron-reminders');
