-- 1. Povolení rozšíření
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Vytvoření tabulky profiles, protože v projektu zatím neexistuje
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    username text,
    email text,
    settings jsonb default '{}'::jsonb
);

-- Povolení RLS a přístupu
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile." on profiles for insert with check (auth.uid() = id);

-- Přidání sloupce do health_data pro stav notifikací
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
