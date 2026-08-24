/**
 * Love Shop Domain Actions & Transactions
 */

import { supabase } from '@core/supabase.js';
import { state, ensureLoveShopData, saveStateToCache } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { notifyPartnerCouponGifted, notifyPartnerCouponRedeemed } from '@core/sync.js';
import { showNotification } from '@core/theme.js';
import { cleanTitle } from './design.js';

let renderCallback = null;

export function registerActionRenderer(cb) {
    renderCallback = cb;
}

function refreshUI() {
    if (typeof renderCallback === 'function') {
        renderCallback();
    }
}

/**
 * Logika nákupu výsady pro sebe nebo darování partnerovi.
 * @param {string} itemId 
 * @param {string} note 
 * @param {'self_perk' | 'gift'} targetType 
 */
export async function buyCoupon(itemId, note = '', targetType = 'self_perk') {
    triggerHaptic('medium');
    const isMeJose = state.currentUser?.id === state.user_ids?.jose;
    const myId = state.currentUser?.id;
    const partnerId = isMeJose ? state.user_ids?.klarka : state.user_ids?.jose;

    if (!myId || !partnerId) {
        console.error("[LoveShop] Missing user mapping IDs.");
        return;
    }

    const item = (state.shopItems || []).find(i => i.id === itemId);
    if (!item) return;

    const currentCoins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);
    const newCoins = currentCoins - item.cost;
    if (newCoins < 0) {
        showNotification("Nedostatek Love Coinů pro nákup této odměny! 🪙", "warning");
        return;
    }

    // --- 1. OPTIMISTIC STATE & CACHE UPDATE ---
    if (!state.loveCoins) state.loveCoins = {};
    if (isMeJose) state.loveCoins.jose = newCoins;
    else state.loveCoins.klarka = newCoins;

    const isSelfPerk = targetType === 'self_perk';
    const ownerId = isSelfPerk ? myId : partnerId;
    const creatorId = isSelfPerk ? partnerId : myId;

    const tempCoupon = {
        id: 'temp_' + Date.now(),
        shop_item_id: item.id,
        owner_id: ownerId,
        creator_id: creatorId,
        target_type: targetType,
        note: note || null,
        is_redeemed: false,
        is_fulfilled: false,
        created_at: new Date().toISOString(),
        love_shop_items: item
    };

    if (!state.userCoupons) state.userCoupons = [];
    state.userCoupons.unshift(tempCoupon);

    if (isSelfPerk) {
        if (!state.inventory) state.inventory = [];
        state.inventory.unshift(tempCoupon);
    } else {
        if (!state.partnerObligations) state.partnerObligations = [];
        state.partnerObligations.unshift(tempCoupon);
    }

    saveStateToCache();

    // Visual & Audio Feedback
    import('@core/sound.js').then(m => m.playCoinsSound?.()).catch(() => {});
    triggerConfetti();

    const partnerName = isMeJose ? "Klárce" : "Jožkovi";
    if (isSelfPerk) {
        showNotification(`👑 Výsada "${cleanTitle(item.title)}" byla přidána do tvých aktivních práv!`, "success");
    } else {
        showNotification(`🎁 Úspěšně jsi zakoupil/a a daroval/a kupón "${cleanTitle(item.title)}" ${partnerName}!`, "success");
    }

    refreshUI();

    // --- 2. ASYNC CLOUD PERSISTENCE ---
    try {
        const [profileRes, couponRes] = await Promise.all([
            supabase.from('profiles').update({ love_coins: newCoins }).eq('id', myId),
            supabase.from('user_coupons').insert({
                shop_item_id: item.id,
                owner_id: ownerId,
                creator_id: creatorId,
                target_type: targetType,
                note: note || null
            }).select()
        ]);

        if (couponRes.data && couponRes.data[0]) {
            Object.assign(tempCoupon, couponRes.data[0]);
        }
        if (!isSelfPerk) {
            notifyPartnerCouponGifted(cleanTitle(item.title), note).catch(e => console.warn("[Push] Error:", e));
        }
        await ensureLoveShopData(true);
        refreshUI();
    } catch (e) {
        console.error("[LoveShop] Nákup v pozadí selhal:", e);
        // Rollback state
        if (isMeJose) state.loveCoins.jose = currentCoins;
        else state.loveCoins.klarka = currentCoins;
        state.userCoupons = (state.userCoupons || []).filter(c => c !== tempCoupon && c.id !== tempCoupon.id);
        state.inventory = (state.inventory || []).filter(c => c !== tempCoupon && c.id !== tempCoupon.id);
        state.partnerObligations = (state.partnerObligations || []).filter(c => c !== tempCoupon && c.id !== tempCoupon.id);
        saveStateToCache();
        refreshUI();
        showNotification("Nákup se nepodařilo dokončit, mince byly vráceny. 🪙", "error");
    }
}

/**
 * Potvrzení nákupu z dialogu.
 */
export async function confirmBuyCoupon(itemId) {
    const note = document.getElementById('buy-coupon-note')?.value?.trim() || '';
    const targetType = document.querySelector('input[name="buy-coupon-target"]:checked')?.value || 'self_perk';
    document.getElementById('buy-coupon-modal')?.remove();
    await buyCoupon(itemId, note, targetType);
}

/**
 * Uplatnění nároku na výsadu (Claim Perk).
 */
export async function redeemCoupon(couponId) {
    triggerHaptic('success');
    triggerConfetti();

    const coupon = (state.inventory || []).find(c => c.id === couponId);
    const title = coupon?.love_shop_items?.title || 'Výsada';

    // Optimistic UI state
    if (coupon) {
        coupon.is_redeemed = true;
        coupon.redeemed_at = new Date().toISOString();
    }
    saveStateToCache();
    showNotification("⚡ Nárok uplatněn! Partner obdržel fanfáru a notifikaci! 👑", "success");
    refreshUI();

    // Background cloud update & push
    try {
        await supabase.from('user_coupons').update({ 
            is_redeemed: true,
            redeemed_at: new Date().toISOString()
        }).eq('id', couponId);

        notifyPartnerCouponRedeemed(cleanTitle(title)).catch(e => console.warn("[Push] Error:", e));
        await ensureLoveShopData(true);
    } catch (e) {
        console.error("[LoveShop] Uplatnění selhalo:", e);
    }
}

/**
 * Direct redemption bridge for QuickPlan / Dashboard.
 */
export async function redeemCouponDirect(couponId) {
    return redeemCoupon(couponId);
}

/**
 * Označení závazku jako splněného partnerem (Fulfill Obligation).
 */
export async function fulfillObligation(couponId) {
    triggerHaptic('success');
    triggerConfetti();

    const coupon = (state.partnerObligations || []).find(c => c.id === couponId);
    if (coupon) {
        coupon.is_fulfilled = true;
        coupon.fulfilled_at = new Date().toISOString();
    }
    saveStateToCache();
    showNotification("❤️ Závazek byl označen jako splněný s láskou!", "success");
    refreshUI();

    try {
        await supabase.from('user_coupons').update({
            is_fulfilled: true,
            fulfilled_at: new Date().toISOString()
        }).eq('id', couponId);

        await ensureLoveShopData(true);
    } catch (e) {
        console.error("[LoveShop] Splnění selhalo:", e);
    }
}

/**
 * Otevře plánovač rande a předvyplní data z kupónu.
 */
export function planCouponDate(couponId, couponTitle, note = '') {
    triggerHaptic('light');
    import('@domains/lifestyle/dashboard/planning.js').then(m => {
        m.showQuickPlanModalForCoupon({
            couponId,
            couponTitle: cleanTitle(couponTitle),
            note
        });
    });
}

/**
 * Vetování kupónu (has_star = true).
 */
export async function vetoCoupon(couponId) {
    triggerHaptic('warning');
    const coupon = (state.inventory || []).find(c => c.id === couponId);
    if (!coupon) return;

    const newStarState = !coupon.has_star;

    try {
        const { error } = await supabase
            .from('user_coupons')
            .update({ has_star: newStarState })
            .eq('id', couponId);

        if (error) throw error;

        const msg = newStarState 
            ? "Férové Veto aktivováno! Výsada vrácena s prioritní hvězdou úroku. ⭐" 
            : "Veto zrušeno, výsada je v běžném stavu.";
        showNotification(msg, "warning");

        await ensureLoveShopData(true);
        refreshUI();
    } catch (e) {
        console.error("[LoveShop] Veto selhalo:", e);
    }
}

/**
 * Uložení vlastní vytvořené výsady do katalogu.
 */
export async function saveCustomCoupon() {
    triggerHaptic('medium');

    const title = document.getElementById('custom-coupon-title')?.value?.trim();
    const description = document.getElementById('custom-coupon-desc')?.value?.trim();
    const cost = parseInt(document.getElementById('custom-coupon-cost')?.value) || 80;
    const category = document.getElementById('custom-coupon-cat')?.value || 'dominance';

    if (!title) {
        showNotification("Zadej název výsady!", "warning");
        return;
    }

    try {
        const { error } = await supabase
            .from('love_shop_items')
            .insert({
                title,
                description,
                cost,
                category,
                icon: '👑'
            });

        if (error) throw error;

        triggerConfetti();
        showNotification(`Nová výsada "${title}" byla úspěšně přidána do nabídky! 👑`, "success");

        document.getElementById('custom-coupon-modal')?.remove();
        await ensureLoveShopData(true);
        refreshUI();
    } catch (e) {
        console.error("[LoveShop] Failed to save custom coupon:", e);
        showNotification("Chyba při vytváření výsady: " + e.message, "danger");
    }
}
