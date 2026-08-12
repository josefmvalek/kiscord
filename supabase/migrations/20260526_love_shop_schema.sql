-- =========================================================================
-- MIGRACE: Zavedení Mývalího Obchůdku (Love Shop) a Zero-Pressure Love Coins
-- Datum: 26. 5. 2026
-- =========================================================================

-- 1. Povolení sloupců pro mince v profilech
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS love_coins INTEGER DEFAULT 0 CONSTRAINT positive_coins CHECK (love_coins >= 0);

-- 2. Přidání sledování odměněných levelů do nastavení vztahu (ochrana proti farmení)
ALTER TABLE public.relationship_settings ADD COLUMN IF NOT EXISTS max_rewarded_level INTEGER DEFAULT 1;

-- 3. Vytvoření tabulky položek obchodu (Love Shop Items)
CREATE TABLE IF NOT EXISTS public.love_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL CONSTRAINT positive_cost CHECK (cost >= 0),
    icon TEXT NOT NULL,
    category TEXT NOT NULL, -- 'pampering', 'compromises', 'surprises'
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_shop_item_title UNIQUE (title)
);

-- Povolení řádkové bezpečnosti pro položky obchodu
ALTER TABLE public.love_shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read shop items" ON public.love_shop_items;
CREATE POLICY "Anyone can read shop items" ON public.love_shop_items
    FOR SELECT USING (true);

-- 4. Seedování výchozích kupónů
INSERT INTO public.love_shop_items (title, description, cost, icon, category) VALUES
('💆 Poctivá masáž zad', '30 minut masáže od partnera na uvolnění po dlouhém dni. ✨', 15, '💆', 'pampering'),
('🍳 Snídaně do postele', 'Partner ti připraví a naservíruje teplou snídani snů přímo do peřin. 🥓🥞', 10, '🍳', 'pampering'),
('🧼 Úklidový Free Pass', 'Nádobí nebo mytí koupelny? Dnes to padá na hlavu partnera! 🧽', 12, '🧼', 'compromises'),
('☕ Kafíčko na stůl', 'Donesení teplé oblíbené kávy nebo čaje přímo k tvým rukám. ☕', 5, '☕', 'surprises'),
('🍿 Hlava na klíně & Drbání', '20 minut drbání zad nebo ve vlasech při sledování vašeho pořadu. 💆‍♀️', 8, '🍿', 'surprises'),
('🚗 Playlist Master', 'Na cestách autem do Rakouska máš plné právo na výběr hudby ty. 🎶', 4, '🚗', 'compromises'),
('🧁 Sladké překvapení', 'Něco extrémně dobrého na zub koupeného nebo upečeného z čisté lásky. 🍩', 6, '🧁', 'surprises')
ON CONFLICT (title) DO UPDATE 
SET cost = EXCLUDED.cost, description = EXCLUDED.description, icon = EXCLUDED.icon, category = EXCLUDED.category;

-- 5. Vytvoření tabulky pro vlastněné kupóny uživatelů (Inventory)
CREATE TABLE IF NOT EXISTS public.user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_item_id UUID NOT NULL REFERENCES public.love_shop_items(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Kdo kupón vlastní (obdarovaný)
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Kdo ho plní (dárce)
    is_redeemed BOOLEAN DEFAULT false NOT NULL,
    has_star BOOLEAN DEFAULT false NOT NULL, -- Vetovaný (priorita s úrokem)
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    redeemed_at TIMESTAMPTZ,
    CONSTRAINT owner_not_creator CHECK (owner_id <> creator_id)
);

-- Povolení řádkové bezpečnosti pro vlastněné kupóny
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own received or created coupons" ON public.user_coupons;
CREATE POLICY "Users can read own received or created coupons" ON public.user_coupons
    FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can buy coupons for their partner" ON public.user_coupons;
CREATE POLICY "Users can buy coupons for their partner" ON public.user_coupons
    FOR INSERT WITH CHECK (auth.uid() = creator_id AND auth.uid() <> owner_id);

DROP POLICY IF EXISTS "Users can update own received coupons" ON public.user_coupons;
CREATE POLICY "Users can update own received coupons" ON public.user_coupons
    FOR UPDATE USING (auth.uid() = owner_id);

-- 6. RPC Funkce pro automatické přičítání denních coinů (+1 Coin oběma)
CREATE OR REPLACE FUNCTION public.add_daily_love_coins()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER AS $$
BEGIN
    UPDATE public.profiles SET love_coins = love_coins + 1;
END;
$$;

-- Pokus o registraci do pg_cron, pokud existuje (s robustním ošetřením chyb)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
          'add-daily-love-coins',
          '0 0 * * *', -- Každou půlnoc
          'SELECT public.add_daily_love_coins();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron neni dostupny nebo schazi prava, registrace cronu preskocena.';
END $$;

-- 7. Trigger pro automatické přičítání +5 coinů za novou vzpomínku v timeline
CREATE OR REPLACE FUNCTION public.give_timeline_coin_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles SET love_coins = love_coins + 5;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_timeline_coin_reward
AFTER INSERT ON public.timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.give_timeline_coin_reward();

-- 8. RPC Funkce pro jednorázovou odměnu za Level Up (+20 Coinů oběma)
CREATE OR REPLACE FUNCTION public.reward_level_up(new_level INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_max INT;
BEGIN
    SELECT COALESCE(max_rewarded_level, 1) INTO current_max FROM public.relationship_settings WHERE id = '00000000-0000-0000-0000-000000000000';
    
    IF new_level > current_max THEN
        -- Přičíst 20 coinů oběma uživatelům
        UPDATE public.profiles SET love_coins = love_coins + 20;
        
        -- Aktualizovat nastavení, aby se zamezilo opakovanému odměnění stejného levelu
        UPDATE public.relationship_settings 
        SET max_rewarded_level = new_level, updated_at = now()
        WHERE id = '00000000-0000-0000-0000-000000000000';
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;
