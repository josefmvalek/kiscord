/**
 * Love Shop HTML Templates & UI Components
 */

import { state } from '@core/state.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { triggerHaptic } from '@core/utils.js';
import { cleanTitle, getItemDesign, categories } from './design.js';
import { getRpsState } from './state.js';

export function renderHeaderSection(myCoins, partnerCoins, partnerName) {
    return `
        <div class="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-3xl p-6 border border-gray-700/40 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-20 -top-20 w-44 h-44 bg-[#faa61a]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -left-20 -bottom-20 w-44 h-44 bg-[#5865F2]/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div class="flex items-center gap-4 relative z-10">
                <div class="w-14 h-14 bg-gradient-to-br from-[#faa61a]/25 to-yellow-600/10 rounded-2xl border border-[#faa61a]/30 flex items-center justify-center text-2xl text-[#faa61a] shadow-lg shadow-amber-500/10 animate-pulse">
                    <i class="fas fa-crown"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                        Burza Výsad & Práv
                    </h2>
                    <p class="text-gray-400 text-xs mt-0.5 font-medium">Získej mince za disciplínu a kup si zasloužená práva a imunity. 👑</p>
                </div>
            </div>
            
            <div class="flex items-center gap-2.5 z-10">
                <button onclick="window.openRelationshipMilestonesModal && window.openRelationshipMilestonesModal()" class="px-3.5 py-2 rounded-xl bg-[#202225] hover:bg-[#2f3136] border border-gray-700/50 text-amber-400 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow">
                    <i class="fas fa-trophy text-xs"></i> Milníky
                </button>
                <button onclick="window.LoveShop.openCreateCustomCouponModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
                    <i class="fas fa-plus text-xs"></i> Vlastní výsada
                </button>
            </div>
            
            <div class="flex items-center gap-4 relative z-10 w-full md:w-auto justify-center md:justify-end">
                <!-- Moje konto -->
                <div class="bg-[#18191c]/90 backdrop-blur-md border border-amber-500/30 rounded-2xl px-5 py-3 text-center min-w-[130px] shadow-lg shadow-amber-500/5">
                    <span class="text-[9px] font-black text-amber-400 uppercase block tracking-widest mb-1 flex items-center justify-center gap-1">
                        <i class="fas fa-user text-[8px]"></i> Tvoje konto
                    </span>
                    <span class="text-2xl font-black text-yellow-400 flex items-center justify-center gap-1.5 drop-shadow-[0_0_10px_rgba(234,179,8,0.25)]">
                        ${myCoins} <i class="fas fa-coins text-base text-yellow-500"></i>
                    </span>
                </div>
                
                <div class="text-gray-600 text-sm"><i class="fas fa-arrows-left-right"></i></div>
                
                <!-- Kontrola partnera -->
                <div class="bg-[#18191c]/80 backdrop-blur-md border border-gray-700/50 rounded-2xl px-5 py-3 text-center min-w-[125px] shadow-lg">
                    <span class="text-[9px] font-black text-gray-500 uppercase block tracking-widest mb-1 flex items-center justify-center gap-1">
                        <i class="fas fa-heart text-[8px] text-pink-400"></i> ${partnerName}
                    </span>
                    <span class="text-2xl font-black text-gray-400 flex items-center justify-center gap-1.5">
                        ${partnerCoins} <i class="fas fa-coins text-base text-gray-500"></i>
                    </span>
                </div>
            </div>
        </div>
    `;
}

export function renderTabsNavigation(activeTab, myUnredeemedPerksCount, partnerClaimedCount) {
    return `
        <div class="flex bg-[#202225] p-1.5 rounded-2xl border border-gray-700/40 shadow-inner gap-1">
            <button onclick="window.LoveShop.switchTab('shop')" 
                class="shop-tab-btn flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'shop' ? 'active' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}">
                <i class="fas fa-store-alt text-sm"></i> <span>🏪 Tržnice Výsad</span>
            </button>
            <button onclick="window.LoveShop.switchTab('my_perks')" 
                class="shop-tab-btn flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'my_perks' ? 'active' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}">
                <i class="fas fa-crown text-sm text-yellow-400"></i> <span>👑 Moje Práva (${myUnredeemedPerksCount})</span>
            </button>
            <button onclick="window.LoveShop.switchTab('obligations')" 
                class="shop-tab-btn flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'obligations' ? 'active' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}">
                <i class="fas fa-handshake text-sm ${partnerClaimedCount > 0 ? 'text-red-400 animate-bounce' : 'text-emerald-400'}"></i> 
                <span>🤝 Závazky k partnerovi ${partnerClaimedCount > 0 ? `<span class="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">${partnerClaimedCount}</span>` : ''}</span>
            </button>
        </div>
    `;
}

export function renderShopView(myCoins) {
    if (!state.shopItems || state.shopItems.length === 0) {
        return `
            <div class="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <i class="fas fa-spinner fa-spin text-2xl text-amber-500"></i>
                <div class="text-xs font-semibold">Otevírám tržnici a leštím regály výsad... 👑</div>
            </div>
        `;
    }

    let html = `<div class="flex flex-col gap-10">`;

    Object.keys(categories).forEach(catKey => {
        const catItems = state.shopItems.filter(item => item.category === catKey);
        if (catItems.length === 0) return;

        html += `
            <div>
                <div class="mb-4 flex items-center justify-between border-b border-gray-700/30 pb-2">
                    <div>
                        <h3 class="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                            <span class="${categories[catKey].color}">${categories[catKey].name}</span>
                        </h3>
                        <p class="text-gray-500 text-[10px] font-semibold mt-0.5">${categories[catKey].desc}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        `;

        catItems.forEach(item => {
            const cleanedTitle = cleanTitle(item.title);
            const design = getItemDesign(item.title);
            const canAfford = myCoins >= item.cost;
            
            const btnClass = canAfford 
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white cursor-pointer active:scale-95 shadow-md shadow-amber-500/20' 
                : 'bg-gray-800/40 text-gray-500 cursor-not-allowed border border-gray-700/30';

            html += `
                <div class="glow-card rounded-2xl p-5 flex flex-col justify-between gap-5 relative overflow-hidden ${design.border}" 
                     style="box-shadow: inset 0 0 20px rgba(0,0,0,0.1); background-color: rgba(32, 34, 37, 0.45);">
                    
                    <!-- Glow Watermark Icon -->
                    <div class="absolute -right-3 -bottom-5 text-7xl opacity-[0.04] pointer-events-none select-none">
                        <i class="fas ${design.fa.split(' ')[0]}"></i>
                    </div>
                    
                    <div class="flex gap-4 relative z-10">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner border border-gray-700/30 flex-shrink-0"
                             style="background: radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%), #18191c; box-shadow: 0 0 10px ${design.glow};">
                            <i class="fas ${design.fa}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-extrabold text-white text-xs tracking-wide uppercase truncate" title="${cleanedTitle}">${cleanedTitle}</h4>
                            <p class="text-gray-400 text-[11px] font-medium mt-1 leading-relaxed line-clamp-3">${item.description || 'Bez podrobností'}</p>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center mt-2 pt-3 border-t border-gray-700/40 relative z-10">
                        <div class="flex items-center gap-1.5 font-black text-yellow-400 text-xs">
                            <span class="text-gray-500 uppercase tracking-widest text-[9px]">Cena:</span>
                            <span class="text-sm">${item.cost}</span>
                            <i class="fas fa-coins text-yellow-500"></i>
                        </div>
                        
                        <div class="flex items-center gap-1.5">
                            <button onclick="${canAfford ? `window.LoveShop.openBuyModal('${item.id}', 'self_perk')` : ''}" 
                                class="px-3.5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${btnClass}">
                                <i class="fas fa-crown text-[9px]"></i> <span>Koupit pro sebe</span>
                            </button>
                            <button onclick="${canAfford ? `window.LoveShop.openBuyModal('${item.id}', 'gift')` : ''}" 
                                class="p-2 rounded-xl text-[10px] font-black text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 border border-pink-500/20 transition-all" 
                                title="Darovat partnerovi jako dárek">
                                <i class="fas fa-gift text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}

export function renderMyPerksView(partnerName) {
    const unfulfilled = (state.inventory || []).filter(c => !c.is_fulfilled);
    const fulfilled = (state.inventory || []).filter(c => c.is_fulfilled);

    if (unfulfilled.length === 0 && fulfilled.length === 0) {
        return `
            <div class="bg-gradient-to-br from-[#2f3136] to-[#202225] border border-gray-700/40 rounded-3xl p-12 text-center flex flex-col items-center gap-4 shadow-xl">
                <div class="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center text-yellow-500 text-3xl shadow-inner border border-gray-700/30">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="flex flex-col gap-1 max-w-sm">
                    <h3 class="text-white font-extrabold text-sm uppercase tracking-wider">Nemáš zatím žádné aktivní výsady</h3>
                    <p class="text-gray-400 text-xs leading-relaxed font-medium">Nasbírej mince za tréninky, vodu a návyky, a pořiď si v Tržnici právo na masáž, ovladač nebo úklidový pass!</p>
                </div>
                <button onclick="window.LoveShop.switchTab('shop')" class="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20">
                    Otevřít nabídku výsad 🏪
                </button>
            </div>
        `;
    }

    let html = `<div class="flex flex-col gap-8">`;

    if (unfulfilled.length > 0) {
        html += `
            <div>
                <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span class="text-yellow-400 flex items-center gap-1"><i class="fas fa-shield-alt text-[10px]"></i> Moje Aktivní Výsady</span>
                    <span class="bg-[#18191c] text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-700/50">${unfulfilled.length}</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        `;

        unfulfilled.forEach(coupon => {
            const item = coupon.love_shop_items || {};
            const cleanedTitle = cleanTitle(item.title || 'Výsada');
            const design = getItemDesign(item.title);
            const isClaimed = coupon.is_redeemed;
            const starClass = coupon.has_star ? 'coupon-star' : 'border-gray-700/40';
            const cardStateClass = isClaimed ? 'perk-claimed-card' : 'perk-active-card';
            
            html += `
                <div class="glow-card rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all relative ${starClass} ${cardStateClass} shadow-lg"
                     style="background-color: rgba(32, 34, 37, 0.45);">
                    
                    ${coupon.has_star ? `
                        <div class="absolute right-4 top-4 text-[#faa61a] text-md animate-pulse" title="Vetovaná výsada s prioritním úrokem!">
                            <i class="fas fa-star drop-shadow-[0_0_8px_rgba(250,166,26,0.5)]"></i>
                        </div>
                    ` : ''}

                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner border border-gray-700/30 flex-shrink-0"
                             style="background: #18191c; box-shadow: 0 0 10px ${design.glow};">
                            <i class="fas ${design.fa}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <h4 class="font-extrabold text-white text-xs uppercase tracking-wide truncate">
                                    ${cleanedTitle}
                                </h4>
                                ${isClaimed ? `
                                    <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-1 animate-pulse">
                                        <i class="fas fa-bell"></i> Uplatněno
                                    </span>
                                ` : `
                                    <span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                                        Připraveno
                                    </span>
                                `}
                            </div>
                            <p class="text-gray-400 text-[11px] font-medium mt-1 leading-relaxed">${item.description || ''}</p>
                            
                            ${coupon.note ? `
                                <div class="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-start gap-2 shadow-inner">
                                    <i class="fas fa-sticky-note text-[10px] text-amber-400 mt-0.5 flex-shrink-0"></i>
                                    <span class="italic leading-snug">„${coupon.note}“</span>
                                </div>
                            ` : ''}
                            
                            <span class="text-[9px] text-gray-500 font-bold block mt-2.5 uppercase tracking-wider">
                                <i class="fas fa-calendar-alt text-[8px] mr-1"></i> Zakoupeno: ${new Date(coupon.created_at).toLocaleDateString('cs-CZ')}
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap justify-end gap-2 border-t border-gray-700/40 pt-3 relative z-10">
                        <button onclick="window.LoveShop.planCouponDate('${coupon.id}', '${cleanedTitle.replace(/'/g, "\\'")}', '${(coupon.note || '').replace(/'/g, "\\'")}')" 
                            class="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-gray-300 border border-gray-700 transition flex items-center gap-1.5"
                            title="Naplánovat do kalendáře">
                            <i class="fas fa-calendar-plus text-[10px]"></i> <span>Do kalendáře</span>
                        </button>
                        
                        ${!isClaimed ? `
                            <button onclick="window.LoveShop.claimPerk('${coupon.id}')" 
                                class="px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5">
                                <i class="fas fa-bolt text-[9px]"></i> <span>Uplatnit nárok ⚡</span>
                            </button>
                        ` : `
                            <div class="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                <i class="fas fa-hourglass-half"></i> Čeká se na splnění od ${partnerName}
                            </div>
                        `}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    if (fulfilled.length > 0) {
        html += `
            <div>
                <h3 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span><i class="fas fa-history text-[10px]"></i> Historie využitých výsad</span>
                    <span class="bg-[#18191c] text-gray-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-800/60">${fulfilled.length}</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 opacity-60 hover:opacity-90 transition-opacity">
        `;

        fulfilled.forEach(coupon => {
            const item = coupon.love_shop_items || {};
            const cleanedTitle = cleanTitle(item.title || 'Výsada');
            const design = getItemDesign(item.title);
            
            html += `
                <div class="bg-[#18191c]/50 rounded-xl p-3 border border-gray-800 flex items-center gap-3 relative shadow-sm">
                    <div class="w-8 h-8 rounded-lg bg-[#202225] flex items-center justify-center text-sm border border-gray-800 flex-shrink-0">
                        <i class="fas ${design.fa}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-300 text-xs truncate">${cleanedTitle}</h4>
                        <span class="text-[8px] text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Splněno: ${new Date(coupon.fulfilled_at || coupon.redeemed_at || coupon.created_at).toLocaleDateString('cs-CZ')}</span>
                    </div>
                    <div class="text-emerald-500/80 text-sm"><i class="fas fa-check-circle"></i></div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

export function renderObligationsView(partnerName) {
    const obligations = (state.partnerObligations || []).filter(c => !c.is_fulfilled);
    const fulfilledObligations = (state.partnerObligations || []).filter(c => c.is_fulfilled);

    if (obligations.length === 0 && fulfilledObligations.length === 0) {
        return `
            <div class="bg-gradient-to-br from-[#2f3136] to-[#202225] border border-gray-700/40 rounded-3xl p-12 text-center flex flex-col items-center gap-4 shadow-xl">
                <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-3xl shadow-inner border border-emerald-500/20">
                    <i class="fas fa-smile-beam"></i>
                </div>
                <div class="flex flex-col gap-1 max-w-sm">
                    <h3 class="text-white font-extrabold text-sm uppercase tracking-wider">Nemáš žádné nesplněné závazky!</h3>
                    <p class="text-gray-400 text-xs leading-relaxed font-medium">Všechny partnerovy výsady a přání máš splněné na 100 %. Skvělá týmová práce!</p>
                </div>
            </div>
        `;
    }

    let html = `<div class="flex flex-col gap-8">`;

    if (obligations.length > 0) {
        html += `
            <div>
                <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span class="text-red-400 flex items-center gap-1"><i class="fas fa-handshake text-[10px]"></i> Závazky vůči ${partnerName}</span>
                    <span class="bg-[#18191c] text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-700/50">${obligations.length}</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        `;

        obligations.forEach(coupon => {
            const item = coupon.love_shop_items || {};
            const cleanedTitle = cleanTitle(item.title || 'Závazek');
            const design = getItemDesign(item.title);
            const isClaimed = coupon.is_redeemed;
            const cardClass = isClaimed ? 'obligation-urgent-card' : 'border-gray-700/40';

            html += `
                <div class="glow-card rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all relative ${cardClass} shadow-lg"
                     style="background-color: rgba(32, 34, 37, 0.45);">
                    
                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner border border-gray-700/30 flex-shrink-0"
                             style="background: #18191c; box-shadow: 0 0 10px ${design.glow};">
                            <i class="fas ${design.fa}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <h4 class="font-extrabold text-white text-xs uppercase tracking-wide truncate">
                                    ${cleanedTitle}
                                </h4>
                                ${isClaimed ? `
                                    <span class="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[9px] font-black uppercase tracking-wider border border-red-500/30 flex items-center gap-1 animate-pulse">
                                        <i class="fas fa-exclamation-circle"></i> Uplatněno partnerem!
                                    </span>
                                ` : `
                                    <span class="px-2 py-0.5 rounded-md bg-gray-700/50 text-gray-400 text-[9px] font-bold uppercase tracking-wider">
                                        V držení partnera
                                    </span>
                                `}
                            </div>
                            <p class="text-gray-400 text-[11px] font-medium mt-1 leading-relaxed">${item.description || ''}</p>
                            
                            ${coupon.note ? `
                                <div class="mt-3 p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[11px] font-medium flex items-start gap-2 shadow-inner">
                                    <i class="fas fa-heart text-[10px] text-pink-400 mt-0.5 flex-shrink-0"></i>
                                    <span class="italic leading-snug">„${coupon.note}“</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="flex justify-end items-center gap-2 border-t border-gray-700/40 pt-3 relative z-10">
                        ${isClaimed ? `
                            <button onclick="window.LoveShop.fulfillObligation('${coupon.id}')" 
                                class="px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5">
                                <i class="fas fa-check-circle text-[9px]"></i> <span>Označit jako splněno s láskou ❤️</span>
                            </button>
                        ` : `
                            <span class="text-[10px] text-gray-500 font-medium italic">
                                Partner tuto výsadu zatím neuplatnil.
                            </span>
                        `}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    if (fulfilledObligations.length > 0) {
        html += `
            <div>
                <h3 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span><i class="fas fa-check-double text-[10px]"></i> Splněné závazky</span>
                    <span class="bg-[#18191c] text-gray-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-800/60">${fulfilledObligations.length}</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 opacity-60 hover:opacity-90 transition-opacity">
        `;

        fulfilledObligations.forEach(coupon => {
            const item = coupon.love_shop_items || {};
            const cleanedTitle = cleanTitle(item.title || 'Závazek');
            const design = getItemDesign(item.title);
            
            html += `
                <div class="bg-[#18191c]/50 rounded-xl p-3 border border-gray-800 flex items-center gap-3 relative shadow-sm">
                    <div class="w-8 h-8 rounded-lg bg-[#202225] flex items-center justify-center text-sm border border-gray-800 flex-shrink-0">
                        <i class="fas ${design.fa}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-300 text-xs truncate">${cleanedTitle}</h4>
                        <span class="text-[8px] text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Splněno pro partnera: ${new Date(coupon.fulfilled_at || coupon.redeemed_at || coupon.created_at).toLocaleDateString('cs-CZ')}</span>
                    </div>
                    <div class="text-emerald-500/80 text-sm"><i class="fas fa-check-circle"></i></div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

export function renderRpsGameTemplate() {
    const rpsState = getRpsState();

    if (!rpsState.active) {
        return `
            <div class="flex justify-center py-2">
                <button onclick="window.LoveShop.startRps()" 
                    class="bg-gradient-to-r from-[#5865F2] to-[#404eed] hover:from-[#4752c4] hover:to-[#5865F2] text-white font-extrabold text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2">
                    <i class="fas fa-gamepad text-xs"></i> <span>Spustit rychlý rozstřel</span>
                </button>
            </div>
        `;
    }

    const choices = {
        rock: { icon: '<i class="fas fa-hand-rock"></i>', label: 'Kámen' },
        paper: { icon: '<i class="fas fa-hand-paper"></i>', label: 'Papír' },
        scissors: { icon: '<i class="fas fa-hand-scissors"></i>', label: 'Nůžky' }
    };

    if (rpsState.countdown) {
        return `
            <div class="text-center py-6 arcade-console rounded-2xl border-gray-700/50 p-6 flex flex-col items-center justify-center">
                <div class="text-2xl font-black text-[#5865F2] animate-bounce tracking-widest" style="font-family: 'Press Start 2P', monospace;">
                    ${rpsState.countdown}
                </div>
            </div>
        `;
    }

    if (rpsState.result) {
        return `
            <div class="text-center py-5 flex flex-col items-center gap-4 arcade-console rounded-2xl border-gray-700/50 p-6">
                <div class="flex gap-10 justify-center items-center my-2">
                    <div class="flex flex-col items-center gap-2">
                        <span class="text-2xl text-yellow-400">${choices[rpsState.myChoice]?.icon}</span>
                        <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tvůj výběr</span>
                    </div>
                    <div class="text-[#5865F2] text-xs font-black tracking-widest" style="font-family: 'Press Start 2P', monospace;">VS</div>
                    <div class="flex flex-col items-center gap-2">
                        <span class="text-2xl text-gray-400">${choices[rpsState.partnerChoice]?.icon}</span>
                        <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Partner</span>
                    </div>
                </div>
                <div class="text-xs font-bold text-emerald-400 uppercase tracking-wide border-t border-gray-800 w-full pt-3" style="font-family: 'Press Start 2P', monospace; line-height: 1.6;">
                    ${rpsState.result}
                </div>
                <button onclick="window.LoveShop.startRps()" 
                    class="mt-3 text-[9px] font-black uppercase tracking-widest bg-[#202225] text-gray-400 hover:text-white border border-gray-700 px-4 py-2.5 rounded-lg active:scale-95 transition-all">
                    Hrát znovu 🔄
                </button>
            </div>
        `;
    }

    return `
        <div class="text-center arcade-console rounded-2xl border-gray-700/50 p-6">
            <p class="text-gray-400 text-xs font-bold mb-5 tracking-wide uppercase">
                ${rpsState.myChoice 
                    ? `Odesláno! Čeká se na volbu partnera... ⏳` 
                    : "Zvol zbraň k vyřešení sporu:"}
            </p>
            
            ${!rpsState.myChoice ? `
                <div class="flex gap-5 justify-center">
                    ${Object.keys(choices).map(key => `
                        <button onclick="window.LoveShop.makeRpsChoice('${key}')" 
                            class="bg-[#202225] border border-gray-700/80 hover:border-[#5865F2] hover:bg-[#5865F2]/5 w-18 h-18 rounded-2xl flex flex-col justify-center items-center hover:scale-105 active:scale-95 transition-all text-xl shadow-md group">
                            <span class="group-hover:scale-110 transition-transform">${choices[key].icon}</span>
                            <span class="text-[9px] text-gray-500 font-black uppercase tracking-wider mt-2 group-hover:text-[#5865F2]">${choices[key].label}</span>
                        </button>
                    `).join('')}
                </div>
            ` : `
                <div class="flex justify-center py-2">
                    <div class="animate-pulse flex items-center gap-2 bg-[#202225] px-5 py-3 rounded-xl text-xs text-[#5865F2] border border-[#5865F2]/20 shadow-inner font-bold uppercase tracking-wider">
                        <i class="fas fa-spinner fa-spin"></i> Zbraň nabita. Čekáme na partnera...
                    </div>
                </div>
            `}
        </div>
    `;
}

export function openBuyModal(itemId, defaultMode = 'self_perk') {
    triggerHaptic('light');

    const item = (state.shopItems || []).find(i => i.id === itemId);
    if (!item) return;

    const isMeJose = state.currentUser?.id === state.user_ids?.jose;
    const partnerName = isMeJose ? "Klárka" : "Jožka";
    const myCoins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);

    const suggestNotes = [
        "Zasloužená odměna za poctivý tréninkový týden! 💪",
        "Dneska mám právo na klid a odpočinek 👑",
        "Využiju to při nejbližším společném večeru ✨",
        "Z čisté lásky a radosti ❤️"
    ];

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="bg-[#202225] p-4 rounded-2xl border border-gray-700/50 flex items-center justify-between">
                <div>
                    <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Položka z tržnice</span>
                    <h4 class="text-sm font-black text-white">${cleanTitle(item.title)}</h4>
                </div>
                <div class="text-right">
                    <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Cena</span>
                    <span class="text-sm font-black text-yellow-400 flex items-center justify-end gap-1">${item.cost} <i class="fas fa-coins text-xs"></i></span>
                </div>
            </div>

            <!-- VOLBA TYPU NÁKUPU -->
            <div>
                <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 ml-1">
                    Účel nákupu
                </label>
                <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2.5 p-3 rounded-xl bg-[#202225] border border-gray-700/50 cursor-pointer hover:border-amber-500/50 transition">
                        <input type="radio" name="buy-coupon-target" value="self_perk" ${defaultMode === 'self_perk' ? 'checked' : ''} class="text-amber-500 focus:ring-0">
                        <div>
                            <span class="text-xs font-black text-white block">👑 Pro sebe</span>
                            <span class="text-[9px] text-gray-400">Zasloužená výsada</span>
                        </div>
                    </label>
                    <label class="flex items-center gap-2.5 p-3 rounded-xl bg-[#202225] border border-gray-700/50 cursor-pointer hover:border-pink-500/50 transition">
                        <input type="radio" name="buy-coupon-target" value="gift" ${defaultMode === 'gift' ? 'checked' : ''} class="text-pink-500 focus:ring-0">
                        <div>
                            <span class="text-xs font-black text-white block">🎁 Jako dárek</span>
                            <span class="text-[9px] text-gray-400">Pro ${partnerName}</span>
                        </div>
                    </label>
                </div>
            </div>

            <div>
                <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 ml-1">
                    📝 Osobní poznámka nebo vzkaz (nepovinné)
                </label>
                <textarea id="buy-coupon-note" rows="2" 
                          placeholder="Připiš poznámku nebo vzkaz..." 
                          class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition resize-none"></textarea>
            </div>

            <div>
                <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5 ml-1">Rychlé nápady:</span>
                <div class="flex flex-wrap gap-1.5">
                    ${suggestNotes.map(n => `
                        <button type="button" onclick="document.getElementById('buy-coupon-note').value = '${n.replace(/'/g, "\\'")}'"
                                class="text-[9px] bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg border border-white/5 transition">
                            ${n}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2.5 w-full">
            <button onclick="document.getElementById('buy-coupon-modal').remove()" 
                    class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.LoveShop.confirmBuyCoupon('${item.id}')" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
                <i class="fas fa-crown text-xs"></i> <span>Zakoupit za ${item.cost} coinů</span>
            </button>
        </div>
    `;

    document.getElementById('buy-coupon-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'buy-coupon-modal',
        title: `Nákup výsady z tržnice`,
        subtitle: `Zůstatek: ${myCoins} Love Coins 🪙`,
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('buy-coupon-modal').remove()"
    }));

    document.getElementById('buy-coupon-modal')?.classList.remove('hidden');
    document.getElementById('buy-coupon-modal')?.classList.add('flex');
}

export function openCreateCustomCouponModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název vlastní výsady / práva',
                id: 'custom-coupon-title',
                placeholder: 'např. Pán Ovladače na víkend, Osobní masáž nohou 30min...'
            })}

            ${renderInputGroup({
                label: 'Popis výsady',
                id: 'custom-coupon-desc',
                placeholder: 'Co přesně tato výsada garantuje a co partner nesmí odmítnout...'
            })}

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Cena v mincích (Love Coins)',
                    id: 'custom-coupon-cost',
                    type: 'number',
                    value: '80'
                })}

                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                    <select id="custom-coupon-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                        <option value="dominance">👑 Vláda & Rozhodování</option>
                        <option value="compromises">🧼 Domácí imunita & Free Pasy</option>
                        <option value="pampering">💆 Fyzická odměna & Relax</option>
                        <option value="surprises">🍕 Drobné výhody & Mlsání</option>
                        <option value="emergency">🫂 Záchranné & Intimita</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('custom-coupon-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.LoveShop.saveCustomCoupon()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Vytvořit a Přidat do Tržnice
            </button>
        </div>
    `;

    document.getElementById('custom-coupon-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'custom-coupon-modal',
        title: 'Vytvořit Vlastní Výsadu',
        subtitle: 'Přidej nové právo nebo odměnu do Burzy Výsad 👑',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('custom-coupon-modal').remove()"
    }));

    document.getElementById('custom-coupon-modal')?.classList.remove('hidden');
    document.getElementById('custom-coupon-modal')?.classList.add('flex');
}
