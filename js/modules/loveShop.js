import { supabase } from '../core/supabase.js';
import { state, ensureLoveShopData } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';

let activeTab = 'shop'; // 'shop' nebo 'inventory'
let rpsState = {
    active: false,
    myChoice: null,
    partnerChoice: null,
    countdown: null,
    result: null
};

// Mapa ikon a stylů, která spolehlivě nahrazuje emojis z databáze za prémiové FontAwesome ikony a glow efekty
const designMap = {
    'Poctivá masáž zad': { fa: 'fa-spa text-indigo-400', glow: 'rgba(129, 140, 248, 0.25)', border: 'border-indigo-500/20 hover:border-indigo-400' },
    'Snídaně do postele': { fa: 'fa-utensils text-amber-500', glow: 'rgba(245, 158, 11, 0.25)', border: 'border-amber-500/20 hover:border-amber-400' },
    'Úklidový Free Pass': { fa: 'fa-soap text-emerald-400', glow: 'rgba(52, 211, 153, 0.25)', border: 'border-emerald-500/20 hover:border-emerald-400' },
    'Kafíčko na stůl': { fa: 'fa-mug-hot text-yellow-600', glow: 'rgba(217, 119, 6, 0.25)', border: 'border-yellow-600/20 hover:border-yellow-500' },
    'Hlava na klíně & Drbání': { fa: 'fa-heart text-pink-500', glow: 'rgba(244, 63, 94, 0.25)', border: 'border-pink-500/20 hover:border-pink-400' },
    'Playlist Master': { fa: 'fa-car text-blue-400', glow: 'rgba(96, 165, 250, 0.25)', border: 'border-blue-500/20 hover:border-blue-400' },
    'Sladké překvapení': { fa: 'fa-cookie-bite text-rose-400', glow: 'rgba(251, 113, 133, 0.25)', border: 'border-rose-500/20 hover:border-rose-400' }
};

/**
 * Odstraní případné emoji na začátku řetězce, aby nedocházelo k chybnému vykreslování v nadpisech
 */
function cleanTitle(title) {
    if (!title) return '';
    return title.replace(/^[\s\p{Emoji}]+/u, '').trim();
}

/**
 * Získá dynamický FA a glow design na základě názvu položky
 */
function getItemDesign(title) {
    const cleaned = cleanTitle(title);
    const match = Object.keys(designMap).find(k => cleaned.includes(k) || k.includes(cleaned));
    if (match) return designMap[match];
    
    // Výchozí vzhled
    return { fa: 'fa-ticket-alt text-amber-400', glow: 'rgba(245, 158, 11, 0.15)', border: 'border-amber-500/10 hover:border-amber-400' };
}

/**
 * Hlavní inicializační metoda pro zobrazení Mývalí Tržnice.
 */
export async function renderLoveShop() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    window.addEventListener('love-shop-updated', handleDataUpdate);
    window.addEventListener('rps-event', handleRpsEvent);

    window.loveShopCleanup = () => {
        window.removeEventListener('love-shop-updated', handleDataUpdate);
        window.removeEventListener('rps-event', handleRpsEvent);
        cleanupRpsChannel();
    };

    setupRpsChannel();
    renderUI();
}

function handleDataUpdate() {
    renderUI();
}

/**
 * Hlavní renderovací metoda.
 */
function renderUI() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const isMeJose = state.currentUser?.id === state.user_ids?.jose;
    const isMeKlarka = state.currentUser?.id === state.user_ids?.klarka;
    const myCoins = isMeJose ? (state.loveCoins?.jose || 0) : (isMeKlarka ? (state.loveCoins?.klarka || 0) : 0);
    const partnerName = isMeJose ? "Klárka" : "Jožka";
    const partnerCoins = isMeJose ? (state.loveCoins?.klarka || 0) : (state.loveCoins?.jose || 0);

    let html = `
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
                transform: translateY(-5px) scale(1.01);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
                border-color: rgba(255, 255, 255, 0.15) !important;
            }
            .coupon-gifted {
                border-left: 4px solid #eb459e;
            }
            .coupon-star {
                border: 2px solid #faa61a !important;
                box-shadow: 0 0 25px rgba(250, 166, 26, 0.25) !important;
            }
            .coin-shimmer {
                background: linear-gradient(90deg, #ffd700, #ffa500, #ffd700);
                background-size: 200% auto;
                animation: shine 3s linear infinite;
            }
            @keyframes shine {
                to { background-position: 200% center; }
            }
            .arcade-console {
                background: linear-gradient(180deg, #18191c, #0b0c0e);
                border: 2px solid #5865F2;
                box-shadow: 0 0 20px rgba(88, 101, 242, 0.2), inset 0 0 10px rgba(0,0,0,0.8);
            }
        </style>

        <div class="p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
            <!-- HLAVIČKA PENĚŽENKY -->
            <div class="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-3xl p-6 border border-gray-700/40 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
                <div class="absolute -right-20 -top-20 w-44 h-44 bg-[#faa61a]/5 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -left-20 -bottom-20 w-44 h-44 bg-[#5865F2]/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div class="flex items-center gap-4 relative z-10">
                    <div class="w-14 h-14 bg-gradient-to-br from-[#faa61a]/25 to-yellow-600/10 rounded-2xl border border-[#faa61a]/30 flex items-center justify-center text-2xl text-[#faa61a] shadow-lg shadow-amber-500/5 animate-pulse">
                        <i class="fas fa-store"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                            Mývalí Tržnice
                        </h2>
                        <p class="text-gray-400 text-xs mt-0.5 font-medium">Společný zero-pressure obchůdek s radostí a zážitky.</p>
                    </div>
                </div>
                
                <button onclick="window.LoveShop.openCreateCustomCouponModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 z-10">
                    <i class="fas fa-plus text-xs"></i> Nový kupón
                </button>

                
                <div class="flex items-center gap-6 relative z-10 w-full md:w-auto justify-center md:justify-end">
                    <!-- Moje konto -->
                    <div class="bg-[#18191c]/80 backdrop-blur-md border border-gray-700/50 rounded-2xl px-5 py-3 text-center min-w-[130px] shadow-lg">
                        <span class="text-[9px] font-black text-gray-500 uppercase block tracking-widest mb-1">Tvoje konto</span>
                        <span class="text-2xl font-black text-yellow-400 flex items-center justify-center gap-1.5 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                            ${myCoins} <i class="fas fa-coins text-lg"></i>
                        </span>
                    </div>
                    
                    <div class="text-gray-600 text-lg"><i class="fas fa-exchange-alt"></i></div>
                    
                    <!-- Kontrola partnera -->
                    <div class="bg-[#18191c]/80 backdrop-blur-md border border-gray-700/50 rounded-2xl px-5 py-3 text-center min-w-[130px] shadow-lg">
                        <span class="text-[9px] font-black text-gray-500 uppercase block tracking-widest mb-1">${partnerName}</span>
                        <span class="text-2xl font-black text-gray-400 flex items-center justify-center gap-1.5">
                            ${partnerCoins} <i class="fas fa-coins text-lg text-gray-500"></i>
                        </span>
                    </div>
                </div>
            </div>

            <!-- TABS NAVIGACE -->
            <div class="flex bg-[#202225] p-1.5 rounded-2xl border border-gray-700/40 shadow-inner">
                <button onclick="window.LoveShop.switchTab('shop')" 
                    class="shop-tab-btn flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'shop' ? 'active' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}">
                    <i class="fas fa-store-alt text-sm"></i> <span>🏪 Obchůdek s dárky</span>
                </button>
                <button onclick="window.LoveShop.switchTab('inventory')" 
                    class="shop-tab-btn flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'inventory' ? 'active' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}">
                    <i class="fas fa-gift text-sm"></i> <span>🎁 Moje Spížka (${state.inventory.filter(c => !c.is_redeemed).length})</span>
                </button>
            </div>

            <!-- TAB OBSAH -->
            <div class="w-full">
                ${activeTab === 'shop' ? renderShopView(myCoins, partnerName) : renderInventoryView(partnerName)}
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
                    ${renderRpsGame()}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    window.LoveShop = {
        switchTab,
        buyCoupon,
        redeemCoupon,
        vetoCoupon,
        startRps,
        makeRpsChoice,
        openCreateCustomCouponModal,
        saveCustomCoupon
    };
}


/**
 * Vykreslí pohled Obchodu s kartami kupónů.
 */
function renderShopView(myCoins, partnerName) {
    if (!state.shopItems || state.shopItems.length === 0) {
        return `
            <div class="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <i class="fas fa-spinner fa-spin text-2xl text-amber-500"></i>
                <div class="text-xs font-semibold">Otevírám tržnici a leštím regály... 🦝</div>
            </div>
        `;
    }

    const categories = {
        pampering: { name: "💆 Hýčkání & Masáže", desc: "Zasloužený relax a péče pro partnera", color: "text-indigo-400", bgGlow: "rgba(129,140,248,0.03)" },
        compromises: { name: "🧼 Domácí úlevy & Kompromisy", desc: "Když chceš vzít práci na svá bedra", color: "text-emerald-400", bgGlow: "rgba(52,211,153,0.03)" },
        surprises: { name: "🧁 Drobné radosti", desc: "Sladkosti a nečekaná milá gesta", color: "text-rose-400", bgGlow: "rgba(244,63,94,0.03)" }
    };

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
                        
                        <button onclick="${canAfford ? `window.LoveShop.buyCoupon('${item.id}')` : ''}" 
                            class="px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${btnClass}">
                            <i class="fas fa-paper-plane text-[9px]"></i> <span>Darovat</span>
                        </button>
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

/**
 * Vykreslí pohled Moje Spížka (Inventory).
 */
function renderInventoryView(partnerName) {
    const unredeemed = state.inventory.filter(c => !c.is_redeemed);
    const redeemed = state.inventory.filter(c => c.is_redeemed);

    if (unredeemed.length === 0 && redeemed.length === 0) {
        return `
            <div class="bg-gradient-to-br from-[#2f3136] to-[#202225] border border-gray-700/40 rounded-3xl p-12 text-center flex flex-col items-center gap-4 shadow-xl">
                <div class="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-500 text-3xl shadow-inner border border-gray-700/30">
                    <i class="fas fa-ticket-alt"></i>
                </div>
                <div class="flex flex-col gap-1 max-w-sm">
                    <h3 class="text-white font-extrabold text-sm uppercase tracking-wider">Tvoje spížka je prázdná</h3>
                    <p class="text-gray-400 text-xs leading-relaxed font-medium">Až ti ${partnerName} koupí nějaký kupón za své našetřené mince, objeví se právě tady. Pracujte společně na zdravých návycích!</p>
                </div>
            </div>
        `;
    }

    let html = `<div class="flex flex-col gap-8">`;

    // 1. Aktivní kupóny
    if (unredeemed.length > 0) {
        html += `
            <div>
                <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span class="text-yellow-400 flex items-center gap-1"><i class="fas fa-ticket-alt text-[10px]"></i> Aktivní Kupóny</span>
                    <span class="bg-[#18191c] text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-700/50">${unredeemed.length}</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        `;

        unredeemed.forEach(coupon => {
            const item = coupon.love_shop_items;
            const cleanedTitle = cleanTitle(item.title);
            const design = getItemDesign(item.title);
            const starClass = coupon.has_star ? 'coupon-star' : 'border-gray-700/40';
            
            html += `
                <div class="glow-card rounded-2xl p-5 border flex flex-col justify-between gap-5 transition-all relative ${starClass} coupon-gifted shadow-lg"
                     style="background-color: rgba(32, 34, 37, 0.45);">
                    
                    ${coupon.has_star ? `
                        <div class="absolute right-4 top-4 text-[#faa61a] text-md animate-pulse" title="Vetovaný kupón s úrokem!">
                            <i class="fas fa-star drop-shadow-[0_0_8px_rgba(250,166,26,0.5)]"></i>
                        </div>
                    ` : ''}

                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner border border-gray-700/30 flex-shrink-0"
                             style="background: #18191c; box-shadow: 0 0 10px ${design.glow};">
                            <i class="fas ${design.fa}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-extrabold text-white text-xs uppercase tracking-wide flex items-center gap-2 truncate">
                                <span>${cleanedTitle}</span>
                            </h4>
                            <p class="text-gray-400 text-[11px] font-medium mt-1 leading-relaxed">${item.description || ''}</p>
                            <span class="text-[9px] text-gray-500 font-bold block mt-3 uppercase tracking-wider"><i class="fas fa-calendar-alt text-[8px] mr-1"></i> Od: ${new Date(coupon.created_at).toLocaleDateString('cs-CZ')}</span>
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-2.5 border-t border-gray-700/40 pt-3 relative z-10">
                        <button onclick="window.LoveShop.vetoCoupon('${coupon.id}')" 
                            class="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 hover:bg-gray-800/30 active:scale-95 transition-all flex items-center gap-1.5"
                            title="Tlačítko Veto uplatníte, pokud partner nemůže zrovna vyhovět. Kupón se vrátí s prioritní hvězdou.">
                            <i class="fas fa-star-half-alt text-[9px]"></i> <span>Veto</span>
                        </button>
                        <button onclick="window.LoveShop.redeemCoupon('${coupon.id}')" 
                            class="px-4.5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5">
                            <i class="fas fa-bell text-[9px]"></i> <span>Uplatnit</span>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    // 2. Historie spotřebovaných
    if (redeemed.length > 0) {
        html += `
            <div>
                <h3 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span><i class="fas fa-history text-[10px]"></i> Historie spotřebovaných</span>
                    <span class="bg-[#18191c] text-gray-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-800/60">${redeemed.length}</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 opacity-55 hover:opacity-85 transition-opacity">
        `;

        redeemed.forEach(coupon => {
            const item = coupon.love_shop_items;
            const cleanedTitle = cleanTitle(item.title);
            const design = getItemDesign(item.title);
            
            html += `
                <div class="bg-[#18191c]/50 rounded-xl p-3 border border-gray-800 flex items-center gap-3 relative shadow-sm">
                    <div class="w-8 h-8 rounded-lg bg-[#202225] flex items-center justify-center text-sm border border-gray-800 flex-shrink-0">
                        <i class="fas ${design.fa}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-300 text-xs truncate">${cleanedTitle}</h4>
                        <span class="text-[8px] text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Hotovo: ${new Date(coupon.redeemed_at || coupon.created_at).toLocaleDateString('cs-CZ')}</span>
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

/**
 * Přepne záložku obchodu.
 */
function switchTab(tab) {
    activeTab = tab;
    triggerHaptic('light');
    renderUI();
}

/**
 * Logika nákupu kupónu (Gift-Only).
 */
async function buyCoupon(itemId) {
    triggerHaptic('medium');
    const isMeJose = state.currentUser?.id === state.user_ids?.jose;
    const myId = state.currentUser?.id;
    const partnerId = isMeJose ? state.user_ids?.klarka : state.user_ids?.jose;

    if (!myId || !partnerId) {
        console.error("[LoveShop] Missing user mapping IDs.");
        return;
    }

    const item = state.shopItems.find(i => i.id === itemId);
    if (!item) return;

    try {
        console.log(`[LoveShop] Buying item ${item.title} for ${item.cost} coins...`);

        const currentCoins = isMeJose ? state.loveCoins.jose : state.loveCoins.klarka;
        const newCoins = currentCoins - item.cost;
        if (newCoins < 0) {
            alert("Nedostatek coinů!");
            return;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ love_coins: newCoins })
            .eq('id', myId);

        if (profileError) throw profileError;

        const { error: couponError } = await supabase
            .from('user_coupons')
            .insert({
                shop_item_id: item.id,
                owner_id: partnerId,
                creator_id: myId
            });

        if (couponError) throw couponError;

        import('../core/sound.js').then(m => m.playCoinsSound?.()).catch(() => {});
        triggerConfetti();

        if (typeof window.showNotification === 'function') {
            const partnerName = isMeJose ? "Klárce" : "Jožkovi";
            window.showNotification(`🎁 Úspěšně jsi zakoupil a daroval kupón "${cleanTitle(item.title)}" ${partnerName}!`, "success");
        }

        await ensureLoveShopData(true);
        renderUI();

    } catch (e) {
        console.error("[LoveShop] Nákup selhal:", e);
        if (typeof window.showNotification === 'function') {
            window.showNotification("Nákup selhal, zkuste to znovu.", "error");
        }
    }
}

/**
 * Uplatnění kupónu (Redeem).
 */
async function redeemCoupon(couponId) {
    triggerHaptic('success');
    triggerConfetti();

    try {
        console.log(`[LoveShop] Redeeming coupon ${couponId}...`);

        const { error } = await supabase
            .from('user_coupons')
            .update({ 
                is_redeemed: true,
                redeemed_at: new Date().toISOString()
            })
            .eq('id', couponId);

        if (error) throw error;

        if (typeof window.showNotification === 'function') {
            window.showNotification("Kupón uplatněn! Partner obdržel notifikaci! 🎉", "success");
        }

        await ensureLoveShopData(true);
        renderUI();

    } catch (e) {
        console.error("[LoveShop] Uplatnění selhalo:", e);
    }
}

/**
 * Vetování kupónu (has_star = true).
 */
async function vetoCoupon(couponId) {
    triggerHaptic('warning');
    const coupon = state.inventory.find(c => c.id === couponId);
    if (!coupon) return;

    const newStarState = !coupon.has_star;

    try {
        console.log(`[LoveShop] Toggling veto state on coupon ${couponId} to ${newStarState}...`);

        const { error } = await supabase
            .from('user_coupons')
            .update({ has_star: newStarState })
            .eq('id', couponId);

        if (error) throw error;

        if (typeof window.showNotification === 'function') {
            const msg = newStarState 
                ? "Férové Veto aktivováno! Kupón vrácen s prioritní hvězdou úroku. ⭐" 
                : "Veto zrušeno, kupón je v běžném stavu.";
            window.showNotification(msg, "warning");
        }

        await ensureLoveShopData(true);
        renderUI();

    } catch (e) {
        console.error("[LoveShop] Veto selhalo:", e);
    }
}


// =========================================================================
// 🎲 REAL-TIME ROZSTŘEL MINI-GAME (KÁMEN-NŮŽKY-PAPÍR) LOGIKA
// =========================================================================

let rpsChannel = null;

function setupRpsChannel() {
    if (rpsChannel) return;
    
    rpsChannel = supabase.channel('love-shop-rps')
        .on('broadcast', { event: 'rps-start' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            triggerHaptic('medium');
            rpsState.active = true;
            rpsState.myChoice = null;
            rpsState.partnerChoice = null;
            rpsState.countdown = null;
            rpsState.result = null;
            renderUI();
        })
        .on('broadcast', { event: 'rps-choice' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            rpsState.partnerChoice = payload.payload.choice;
            
            if (rpsState.myChoice) {
                evaluateRps();
            } else {
                renderUI();
            }
        })
        .subscribe();
}

function cleanupRpsChannel() {
    if (rpsChannel) {
        supabase.removeChannel(rpsChannel);
        rpsChannel = null;
    }
}

/**
 * Spustí rozstřel (Broadcast start event partnerovi).
 */
async function startRps() {
    triggerHaptic('medium');
    rpsState.active = true;
    rpsState.myChoice = null;
    rpsState.partnerChoice = null;
    rpsState.countdown = null;
    rpsState.result = null;
    renderUI();

    if (rpsChannel) {
        await rpsChannel.send({
            type: 'broadcast',
            event: 'rps-start',
            payload: { from: state.currentUser?.id }
        });
    }
}

/**
 * Provede volbu zbraně.
 */
async function makeRpsChoice(choice) {
    triggerHaptic('light');
    rpsState.myChoice = choice;
    renderUI();

    if (rpsChannel) {
        await rpsChannel.send({
            type: 'broadcast',
            event: 'rps-choice',
            payload: { 
                from: state.currentUser?.id,
                choice: choice
            }
        });
    }

    if (rpsState.partnerChoice) {
        evaluateRps();
    }
}

/**
 * Vyhodnotí výsledek hry Kámen-nůžky-papír.
 */
function evaluateRps() {
    rpsState.countdown = "3... 2... 1... 🔥";
    renderUI();

    setTimeout(() => {
        const my = rpsState.myChoice;
        const partner = rpsState.partnerChoice;

        if (my === partner) {
            rpsState.result = "Remíza! Zkuste to znovu. 🤝";
        } else if (
            (my === 'rock' && partner === 'scissors') ||
            (my === 'paper' && partner === 'rock') ||
            (my === 'scissors' && partner === 'paper')
        ) {
            rpsState.result = "Vyhrál/a jsi! Volba kompromisu je na tobě! 🏆🎉";
            triggerConfetti();
            triggerHaptic('success');
        } else {
            rpsState.result = "Vyhrál partner! Respektuj výsledek. 😔";
            triggerHaptic('error');
        }
        
        rpsState.countdown = null;
        renderUI();
    }, 1200);
}

function renderRpsGame() {
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

    // Výběr zbraně
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

function handleRpsEvent(e) {
    //
}

export function openCreateCustomCouponModal() {
    triggerHaptic('light');

    import('../core/ui.js').then(ui => {
        const contentHtml = `
            <div class="space-y-4 text-left">
                ${ui.renderInputGroup({
                    label: 'Název vlastního kupónu',
                    id: 'custom-coupon-title',
                    placeholder: 'např. Snídaně v posteli s kávou, Zádová masáž 30min...'
                })}

                ${ui.renderInputGroup({
                    label: 'Popis kupónu',
                    id: 'custom-coupon-desc',
                    placeholder: 'Co přesně tento kupón garantuje...'
                })}

                <div class="grid grid-cols-2 gap-3">
                    ${ui.renderInputGroup({
                        label: 'Cena v mincích (Love Coins)',
                        id: 'custom-coupon-cost',
                        type: 'number',
                        value: '50'
                    })}

                    <div class="space-y-1">
                        <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                        <select id="custom-coupon-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                            <option value="pampering">💆 Hýčkání & Masáže</option>
                            <option value="compromises">🧼 Domácí úlevy & Kompromisy</option>
                            <option value="surprises">🧁 Drobné radosti</option>
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
                    Vytvořit a Přidat do Obchůdku
                </button>
            </div>
        `;

        document.getElementById('custom-coupon-modal')?.remove();

        document.body.insertAdjacentHTML('beforeend', ui.renderModal({
            id: 'custom-coupon-modal',
            title: 'Vytvořit Vlastní Kupón',
            subtitle: 'Přidej nový zážitek nebo poukázku do Mývalí Tržnice 🎁',
            content: contentHtml,
            actions: actionsHtml,
            onClose: "document.getElementById('custom-coupon-modal').remove()"
        }));

        document.getElementById('custom-coupon-modal').classList.remove('hidden');
        document.getElementById('custom-coupon-modal').classList.add('flex');
    });
}

export async function saveCustomCoupon() {
    triggerHaptic('medium');

    const title = document.getElementById('custom-coupon-title')?.value.trim();
    const description = document.getElementById('custom-coupon-desc')?.value.trim();
    const cost = parseInt(document.getElementById('custom-coupon-cost')?.value) || 50;
    const category = document.getElementById('custom-coupon-cat')?.value || 'surprises';

    if (!title) {
        if (typeof window.showNotification === 'function') {
            window.showNotification("Zadej název kupónu!", "warning");
        }
        return;
    }

    try {
        const { error } = await supabase
            .from('love_shop_items')
            .insert({
                title,
                description,
                cost,
                category
            });

        if (error) throw error;

        triggerConfetti();
        if (typeof window.showNotification === 'function') {
            window.showNotification(`Nový kupón "${title}" byl úspěšně přidán do nabídky! 🎁`, "success");
        }

        document.getElementById('custom-coupon-modal')?.remove();
        await ensureLoveShopData(true);
        renderUI();
    } catch (e) {
        console.error("[LoveShop] Failed to save custom coupon:", e);
        if (typeof window.showNotification === 'function') {
            window.showNotification("Chyba při vytváření kupónu: " + e.message, "danger");
        }
    }
}

