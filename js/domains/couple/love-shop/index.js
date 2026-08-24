/**
 * Love Shop (Tržnice Výsad & Práv) Module Orchestrator
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { getActiveTab, setActiveTab } from './state.js';
import { 
    renderHeaderSection, 
    renderTabsNavigation, 
    renderShopView, 
    renderMyPerksView, 
    renderObligationsView, 
    renderRpsGameTemplate,
    openBuyModal,
    openCreateCustomCouponModal
} from './templates.js';
import { 
    buyCoupon, 
    confirmBuyCoupon, 
    redeemCoupon, 
    redeemCouponDirect,
    fulfillObligation, 
    planCouponDate, 
    vetoCoupon, 
    saveCustomCoupon,
    registerActionRenderer
} from './actions.js';
import { setupRpsChannel, cleanupRpsChannel, startRps, makeRpsChoice } from './rps.js';

export {
    buyCoupon,
    confirmBuyCoupon,
    redeemCoupon,
    redeemCouponDirect,
    fulfillObligation,
    planCouponDate,
    vetoCoupon,
    saveCustomCoupon,
    openBuyModal,
    openCreateCustomCouponModal,
    startRps,
    makeRpsChoice
};

/**
 * Hlavní inicializační metoda pro zobrazení Tržnice Výsad.
 */
export async function renderLoveShop() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    registerActionRenderer(renderUI);

    window.addEventListener('love-shop-updated', handleDataUpdate);

    window.loveShopCleanup = () => {
        window.removeEventListener('love-shop-updated', handleDataUpdate);
        cleanupRpsChannel();
    };

    setupRpsChannel(renderUI);
    renderUI();
}

function handleDataUpdate() {
    renderUI();
}

function switchTab(tab) {
    setActiveTab(tab);
    triggerHaptic('light');
    renderUI();
}

/**
 * Hlavní renderovací metoda.
 */
export function renderUI() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const activeTab = getActiveTab();
    const isMeJose = state.currentUser?.id === state.user_ids?.jose;
    const isMeKlarka = state.currentUser?.id === state.user_ids?.klarka;
    const myCoins = isMeJose ? (state.loveCoins?.jose || 0) : (isMeKlarka ? (state.loveCoins?.klarka || 0) : 0);
    const partnerName = isMeJose ? "Klárka" : "Jožka";
    const partnerCoins = isMeJose ? (state.loveCoins?.klarka || 0) : (state.loveCoins?.jose || 0);

    const myActivePerks = (state.inventory || []).filter(c => !c.is_fulfilled);
    const myUnredeemedPerksCount = myActivePerks.filter(c => !c.is_redeemed).length;
    
    const partnerObligations = (state.partnerObligations || []).filter(c => !c.is_fulfilled);
    const partnerClaimedCount = partnerObligations.filter(c => c.is_redeemed).length;

    if (typeof window.updateHeaderLoveCoins === 'function') {
        window.updateHeaderLoveCoins();
    }

    const html = `
        <style>
            .shop-tab-btn.active {
                background: linear-gradient(135deg, #5865F2, #4752c4);
                color: white;
                box-shadow: 0 4px 15px rgba(88, 101, 242, 0.4);
            }
            .glow-card {
                background: rgba(47, 49, 54, 0.6);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .glow-card:hover {
                transform: translateY(-3px) scale(1.008);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
                border-color: rgba(255, 255, 255, 0.2) !important;
            }
            .perk-active-card {
                border-left: 4px solid #10b981 !important;
            }
            .perk-claimed-card {
                border-left: 4px solid #f59e0b !important;
                background: rgba(245, 158, 11, 0.04) !important;
            }
            .obligation-urgent-card {
                border-left: 4px solid #ef4444 !important;
                background: rgba(239, 68, 68, 0.06) !important;
                box-shadow: 0 0 20px rgba(239, 68, 68, 0.15) !important;
            }
            .coupon-star {
                border: 2px solid #faa61a !important;
                box-shadow: 0 0 25px rgba(250, 166, 26, 0.25) !important;
            }
            .arcade-console {
                background: linear-gradient(180deg, #18191c, #0b0c0e);
                border: 2px solid #5865F2;
                box-shadow: 0 0 20px rgba(88, 101, 242, 0.2), inset 0 0 10px rgba(0,0,0,0.8);
            }
        </style>

        <div class="p-4 sm:p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
            <!-- HLAVIČKA PENĚŽENKY & STATISKY RIVALITY -->
            ${renderHeaderSection(myCoins, partnerCoins, partnerName)}

            <!-- TABS NAVIGACE SE 3 HLAVNÍMI PILÍŘI -->
            ${renderTabsNavigation(activeTab, myUnredeemedPerksCount, partnerClaimedCount)}

            <!-- TAB OBSAH -->
            <div class="w-full">
                ${activeTab === 'shop' ? renderShopView(myCoins) : (activeTab === 'my_perks' ? renderMyPerksView(partnerName) : renderObligationsView(partnerName))}
            </div>

            <!-- ROZSTŘEL O KOMPROMIS SECTION -->
            <div class="mt-4 bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-3xl p-6 border border-gray-700/40 shadow-2xl relative overflow-hidden">
                <div class="absolute -right-24 -bottom-24 w-48 h-48 bg-[#5865F2]/5 rounded-full blur-3xl pointer-events-none"></div>
                <div class="flex items-center gap-3 mb-2 relative z-10">
                    <div class="text-xl text-[#5865F2]"><i class="fas fa-gamepad"></i></div>
                    <h3 class="text-sm font-black text-white uppercase tracking-wider">
                        🎲 Rozstřel o Kompromis
                    </h3>
                </div>
                <p class="text-gray-400 text-xs mb-5 font-medium relative z-10 leading-relaxed max-w-2xl">
                    Nemůžete se shodnout na filmu, hudbě nebo večeři? Vyřešte to férově rychlou a zábavnou hrou Kámen-Nůžky-Papír přímo v reálném čase!
                </p>
                
                <div id="rps-game-container" class="relative z-10">
                    ${renderRpsGameTemplate()}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    window.LoveShop = {
        switchTab,
        openBuyModal,
        confirmBuyCoupon,
        buyCouponDirect: buyCoupon,
        claimPerk: redeemCoupon,
        fulfillObligation,
        planCouponDate,
        vetoCoupon,
        startRps,
        makeRpsChoice,
        openCreateCustomCouponModal,
        saveCustomCoupon
    };
}

export default {
    renderLoveShop,
    renderUI,
    buyCoupon,
    confirmBuyCoupon,
    redeemCoupon,
    redeemCouponDirect,
    fulfillObligation,
    planCouponDate,
    vetoCoupon,
    saveCustomCoupon
};
