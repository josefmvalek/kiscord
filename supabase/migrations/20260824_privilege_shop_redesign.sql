-- =========================================================================
-- MIGRACE: Psychologický Redesign Obchodu (Perk & Privilege Market 3.0)
-- Datum: 24. 8. 2026
-- =========================================================================

-- 1. Rozšíření tabulky user_coupons o typ výsady a stav splnění
ALTER TABLE public.user_coupons 
ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'self_perk' CONSTRAINT valid_target_type CHECK (target_type IN ('self_perk', 'gift')),
ADD COLUMN IF NOT EXISTS is_fulfilled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- 2. Aktualizace RLS politik pro nákup výsad pro sebe i darování
DROP POLICY IF EXISTS "Users can buy coupons for their partner" ON public.user_coupons;
DROP POLICY IF EXISTS "Users can buy coupons for themselves or partner" ON public.user_coupons;

CREATE POLICY "Users can buy coupons for themselves or partner" ON public.user_coupons
    FOR INSERT WITH CHECK (
        (auth.uid() = creator_id AND auth.uid() <> owner_id) -- Darování partnerovi
        OR 
        (auth.uid() = owner_id AND auth.uid() <> creator_id) -- Nákup výsady pro sebe
    );

DROP POLICY IF EXISTS "Users can update own received coupons" ON public.user_coupons;
DROP POLICY IF EXISTS "Users can update coupons they own or fulfill" ON public.user_coupons;

CREATE POLICY "Users can update coupons they own or fulfill" ON public.user_coupons
    FOR UPDATE USING (
        auth.uid() = owner_id OR auth.uid() = creator_id
    );

-- 3. Aktualizace a rozšíření nabídky v love_shop_items (Psychologicky vyladěné výsady & práva)
-- Ceny nastaveny na vyváženou tokenomiku 40 až 200 mincí

-- Vyčištění starých neefektivních položek
DELETE FROM public.love_shop_items;

INSERT INTO public.love_shop_items (title, description, cost, icon, category) VALUES
-- 👑 Vláda & Rozhodování (dominance)
('👑 Pán Dálkového Ovladače', 'Plné a nezpochybnitelné právo vybrat film nebo seriál na dnešní večer. Žádné remcání ani protinávrhy!', 90, '👑', 'dominance'),
('🍽️ Diktátor Večeře', 'Ty vybíráš restauraci, objednávku nebo co se dnes vaří. Partner nesmí říct "mně je to jedno" ani odmítnout.', 70, '🍽️', 'dominance'),
('🚗 Playlist Master & DJ', 'Absolutní kontrola nad hudbou v autě nebo reproduktoru bez možnosti přeskočení písničky partnerem.', 50, '🚗', 'dominance'),
('⚡ Právo Veta', 'Možnost okamžitě zrušit jakékoliv partnerovo rozhodnutí o programu nebo jídle a zvolit alternativu.', 120, '⚡', 'dominance'),

-- 🧼 Domácí imunita & Free Pasy (compromises)
('🧼 Úklidový Free Pass', 'Mytí nádobí, vynesení koše nebo úklid kuchyně? Dnes máš 100% imunitu, celou směnu bere partner!', 150, '🧼', 'compromises'),
('🛌 Ranní Spáč do 11:00', 'Víkendové právo nevylézt z postele. Partner zajistí ranní klid, kávu a čerstvou snídani přímo do peřin.', 130, '🛌', 'compromises'),
('🍳 Snídaně do postele na přání', 'Partner ti připraví a naservíruje teplou snídani snů podle tvého výběru (vajíčka, palačinky, káva).', 110, '🍳', 'compromises'),

-- 💆 Fyzická odměna & Hýčkání (pampering)
('💆 Zasloužená Masáž zad po tréninku', '30 minut poctivé a intenzivní masáže zad, šíje a ramen od partnera po náročném tréninku.', 180, '💆', 'pampering'),
('🍿 Hlava na klíně & Drbání 25 min', '25 minut nepřetržitého drbání ve vlasech a na zádech při sledování společného filmu.', 80, '🍿', 'pampering'),
('🦶 Královská masáž nohou', '20 minut uvolňující masáže unavených chodidel a lýtek s vonným olejem.', 120, '🦶', 'pampering'),

-- 🍕 Drobné výhody & Mlsání (surprises)
('🍕 Právo na poslední kousek', 'Poslední kousek pizzy, čokolády nebo dezertu v lednici je bez diskuse a výčitek tvůj.', 40, '🍕', 'surprises'),
('🍦 Zmrzlinová & Mlsná zastávka', 'Partner tě vezme na oblíbenou zmrzlinu, zákusek nebo bubble tea na svůj účet.', 60, '🍦', 'surprises'),
('🧁 Sladké překvapení na stůl', 'Partner ti donese nebo upeče oblíbenou sladkou dobrotu během dne jako projev uznání.', 60, '🧁', 'surprises'),

-- 🚨 Záchranné & Intimita (emergency)
('🫂 Okamžité medvědí objetí & Restart', 'Platí kdykoliv: Partner okamžitě odloží telefon a práci a věnuje ti 10 minut tichého pevného objetí.', 40, '🫂', 'emergency'),
('🍷 Vynucené rande na míru', 'Partner musí do 48 hodin vymyslet, naplánovat a zorganizovat kompletní rande podle tvého vkusu.', 200, '🍷', 'emergency')
ON CONFLICT (title) DO UPDATE 
SET cost = EXCLUDED.cost, description = EXCLUDED.description, icon = EXCLUDED.icon, category = EXCLUDED.category;

-- 4. RPC funkce pro atomické uplatnění a splnění výsady
CREATE OR REPLACE FUNCTION public.claim_user_perk(coupon_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_coupons
    SET is_redeemed = true,
        redeemed_at = now()
    WHERE id = coupon_id AND owner_id = auth.uid();

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_partner_obligation(coupon_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_coupons
    SET is_fulfilled = true,
        fulfilled_at = now()
    WHERE id = coupon_id AND (creator_id = auth.uid() OR owner_id = auth.uid());

    RETURN FOUND;
END;
$$;
