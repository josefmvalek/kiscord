-- =========================================================================
-- MIGRACE: Vylepšení Levelování a Mývalí Tržnice (Love Shop 2.0)
-- Datum: 17. 8. 2026
-- =========================================================================

-- 1. Přidání sloupce pro osobní vzkaz / věnování u darovaných kupónů
ALTER TABLE public.user_coupons 
ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. Odstranění vyřazených kupónů z databáze
DELETE FROM public.love_shop_items 
WHERE title ILIKE '%Kafíčko%' 
   OR title ILIKE '%Šéfkuchař%' 
   OR title ILIKE '%Playlist%' 
   OR title ILIKE '%vana%' 
   OR title ILIKE '%Snídaně%';

-- 3. Rozšíření a aktualizace nabídky kupónů v Mývalí Tržnici (love_shop_items)
INSERT INTO public.love_shop_items (title, description, cost, icon, category) VALUES
-- 💆 Hýčkání & Doteky (pampering)
('💆 Poctivá masáž zad & šíje', '30 minut uvolňující masáže zad a krku po náročném dni. 🕯️✨', 15, '💆', 'pampering'),
('🍿 Hlava na klíně & Drbání', '20 minut nepřetržitého drbání ve vlasech nebo na zádech při sledování filmu. 💆‍♀️', 8, '🍿', 'pampering'),

-- 🍷 Rande & Společné zážitky (dates)
('🌅 Západ slunce & Piknik', 'Večerní romantický piknik na vyhlídce s něčím dobrým na zub. 🧺🍷', 18, '🌅', 'dates'),
('🎲 Herní večer dle tebe', 'Večer deskových her, videoher nebo karet dle tvého výběru. 🎮🃏', 10, '🎲', 'dates'),
('🌙 Noční procházka městem', 'Půlnoční procházka ruku v ruce zakončená horkým nápojem. 🌌✨', 8, '🌙', 'dates'),

-- 🧼 Domácí pohoda & Free Pasy (compromises)
('🧼 Úklidový Free Pass', 'Nádobí, myčka nebo vytírání? Dnes máš volno, bere to na sebe partner! 🧽🧹', 12, '🧼', 'compromises'),
('🎬 Výběr filmu bez remcání', 'Plná kontrola nad ovladačem – díváme se na cokoliv chceš ty, bez komentářů! 🍿🎥', 6, '🎬', 'compromises'),

-- 🧁 Drobné radosti & Mlsání (surprises)
('🧁 Sladké překvapení', 'Něco extrémně dobrého na zub koupeného nebo upečeného z čisté lásky. 🍩🍪', 6, '🧁', 'surprises'),
('🍦 Zmrzlinová zastávka', 'Neplánovaná zastávka na zmrzlinu nebo oblíbenou dobrotu po cestě. 🍦🍧', 5, '🍦', 'surprises'),

-- 🚨 Záchranné & Roztomilé (emergency)
('🩹 Antistresový restart', '10 minut tichého tulení a podpory, když byl v práci těžký den. 🤍🫂', 5, '🩹', 'emergency'),
('🍫 Právo na poslední kousek', 'Poslední kousek čokolády, pizzy nebo dezertu je bezpodmínečně tvůj! 🍕🍫', 3, '🍫', 'emergency'),
('🐻 Okamžité medvědí objetí', 'Platí kdykoliv a kdekoliv – partner okamžitě odloží vše a silně tě obejme. 🫂❤️', 2, '🐻', 'emergency')
ON CONFLICT (title) DO UPDATE 
SET cost = EXCLUDED.cost, description = EXCLUDED.description, icon = EXCLUDED.icon, category = EXCLUDED.category;

-- 4. Aktualizovaná RPC funkce pro výpočet celkového vztahového XP
CREATE OR REPLACE FUNCTION public.get_relationship_xp()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    xp_water bigint := 0;
    xp_sleep bigint := 0;
    xp_bucket bigint := 0;
    xp_timeline bigint := 0;
    xp_gym bigint := 0;
    xp_daily_q bigint := 0;
    xp_letters bigint := 0;
BEGIN
    -- Voda: 1 XP za každou vypitou sklenici
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_data') THEN
        SELECT COALESCE(SUM(water), 0) INTO xp_water FROM public.health_data;
        SELECT COUNT(*) * 10 INTO xp_sleep FROM public.health_data WHERE sleep > 0;
    END IF;
    
    -- Bucket List: 50 XP za každou splněnou položku
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bucket_list') THEN
        SELECT COUNT(*) * 50 INTO xp_bucket FROM public.bucket_list WHERE is_completed = true;
    END IF;
    
    -- Timeline: 25 XP za každou vzpomínku
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timeline_events') THEN
        SELECT COUNT(*) * 25 INTO xp_timeline FROM public.timeline_events;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timeline') THEN
        SELECT COUNT(*) * 25 INTO xp_timeline FROM public.timeline;
    END IF;
    
    -- Gym: 25 XP za každý trénink
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gym_logs') THEN
        SELECT COUNT(*) * 25 INTO xp_gym FROM public.gym_logs;
    END IF;

    -- Denní otázky: 15 XP za každou odpověď
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_answers') THEN
        SELECT COUNT(*) * 15 INTO xp_daily_q FROM public.daily_answers;
    END IF;

    -- Zamilované dopisy: 20 XP za každý dopis
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_letters') THEN
        SELECT COUNT(*) * 20 INTO xp_letters FROM public.love_letters;
    END IF;
    
    RETURN xp_water + xp_sleep + xp_bucket + xp_timeline + xp_gym + xp_daily_q + xp_letters;
END;
$$;

-- 5. RPC funkce pro detailní rozpad XP (pro strom milníků)
CREATE OR REPLACE FUNCTION public.get_relationship_xp_breakdown()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    xp_water bigint := 0;
    xp_sleep bigint := 0;
    xp_bucket bigint := 0;
    xp_timeline bigint := 0;
    xp_gym bigint := 0;
    xp_daily_q bigint := 0;
    xp_letters bigint := 0;
    total_xp bigint := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_data') THEN
        SELECT COALESCE(SUM(water), 0) INTO xp_water FROM public.health_data;
        SELECT COUNT(*) * 10 INTO xp_sleep FROM public.health_data WHERE sleep > 0;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bucket_list') THEN
        SELECT COUNT(*) * 50 INTO xp_bucket FROM public.bucket_list WHERE is_completed = true;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timeline_events') THEN
        SELECT COUNT(*) * 25 INTO xp_timeline FROM public.timeline_events;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timeline') THEN
        SELECT COUNT(*) * 25 INTO xp_timeline FROM public.timeline;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gym_logs') THEN
        SELECT COUNT(*) * 25 INTO xp_gym FROM public.gym_logs;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_answers') THEN
        SELECT COUNT(*) * 15 INTO xp_daily_q FROM public.daily_answers;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_letters') THEN
        SELECT COUNT(*) * 20 INTO xp_letters FROM public.love_letters;
    END IF;
    
    total_xp := xp_water + xp_sleep + xp_bucket + xp_timeline + xp_gym + xp_daily_q + xp_letters;

    RETURN json_build_object(
        'water_xp', xp_water,
        'sleep_xp', xp_sleep,
        'bucket_xp', xp_bucket,
        'timeline_xp', xp_timeline,
        'gym_xp', xp_gym,
        'daily_q_xp', xp_daily_q,
        'letters_xp', xp_letters,
        'total_xp', total_xp
    );
END;
$$;

-- 6. Helper RPC pro bezpečné přičítání Love Coins uživateli
CREATE OR REPLACE FUNCTION public.award_love_coins(target_user_id UUID, amount INT, reason TEXT DEFAULT '')
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_coins INT;
BEGIN
    UPDATE public.profiles
    SET love_coins = GREATEST(0, COALESCE(love_coins, 0) + amount)
    WHERE id = target_user_id
    RETURNING love_coins INTO new_coins;

    RETURN new_coins;
END;
$$;
