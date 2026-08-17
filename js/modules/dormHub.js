import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';
import { isJosef } from '../core/auth.js';

let laundryState = null; // { started_at, duration_minutes, machine_number, is_finished }
let shoppingItems = [];
let laundryTimerInterval = null;

// Seznam studentských menz a podniků u FITu
export const BRNO_CAMPUS_FOOD = [
    { name: 'Menza Purkyňova', type: 'Menza VUT', desc: 'Nejblíže ke kolejím Purkyňova, rychlé teplé obědy a polévky.', icon: 'fa-utensils', color: 'text-emerald-400' },
    { name: 'Menza Kolejní (PPV)', type: 'Menza VUT', desc: 'Areál Pod Palackého vrchem, velký výběr jídel, minutky a pizza.', icon: 'fa-pizza-slice', color: 'text-amber-400' },
    { name: 'Pizzerie & Bistro Božetěchova', type: 'U FITu', desc: 'Hned naproti hlavní bráně FITu, ideální na rychlou pizzu mezi přednáškami.', icon: 'fa-cheese', color: 'text-rose-400' },
    { name: 'Restaurace U Dřeváka', type: 'U FITu', desc: 'Oblíbená studentská hospůdka s poledním menu kousek od Božetěchovy.', icon: 'fa-beer', color: 'text-yellow-400' },
    { name: 'Restaurace U Kaštanu', type: 'U FITu', desc: 'Česká klasika, polední menu a posezení na zahrádce.', icon: 'fa-drumstick-bite', color: 'text-blue-400' },
    { name: 'Respirium FIT', type: 'Kampus', desc: 'Káva, bagety a sladkosti přímo uvnitř fakulty v areálu Božetěchova.', icon: 'fa-mug-hot', color: 'text-pink-400' }
];

export async function renderDormHub() {
    if (state.currentChannel !== 'dorm-hub') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await Promise.all([loadActiveLaundry(), loadShoppingItems()]);

    const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const partnerName = isMeJose ? "Klárka" : "Jožka";

    container.innerHTML = `
        <div class="h-full bg-[#18191c] flex flex-col font-sans animate-fade-in relative overflow-hidden select-none">
            <!-- Header bar -->
            <div class="bg-[#202225] shadow-md z-10 flex-shrink-0 border-b border-gray-800/80 p-4 lg:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/25 to-orange-600/10 flex items-center justify-center text-xl text-amber-400 border border-amber-500/30 shadow-inner">
                        🏢
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <span>Koleje & Brno Hub</span>
                            <span class="bg-amber-500/20 text-amber-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/30">Studentský Život</span>
                        </h1>
                        <p class="text-[10px] text-gray-400 font-medium">Prádelník, nákupy na kolej, menzy & rychlý kampus rozcestník</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button onclick="window.pickRandomFood()" 
                            class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95">
                        <i class="fas fa-dice text-xs"></i> <span>Kam dnes na oběd?</span>
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-28">
                <div class="max-w-6xl mx-auto space-y-6">

                    <!-- SECTION 1: PRÁDELNÍK & ČASOVAČ PRAČKY -->
                    <div class="bg-gradient-to-br from-[#202225] to-[#18191c] border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl text-blue-400 flex-shrink-0">
                                    🧺
                                </div>
                                <div>
                                    <h3 class="text-sm font-black text-white uppercase tracking-wider">Kolejní Prádelník & Pračka</h3>
                                    <p class="text-[11px] text-gray-400 font-medium mt-0.5">Spusťte odpočet praní, ať prádlo nezůstane ležet v pračce!</p>
                                </div>
                            </div>
                            <span class="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                                Prádelna Kolejí
                            </span>
                        </div>

                        <div id="dorm-laundry-card" class="bg-black/30 border border-gray-800/80 rounded-2xl p-5">
                            ${renderLaundryWidgetHtml()}
                        </div>
                    </div>

                    <!-- SECTION 2: DVOU-SLOUPOVÁ SEKCE: NÁKUPNÍ CHECKLIST + MENZY & JÍDLO -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        <!-- Karta 1: Nákupní seznam na kolej -->
                        <div class="bg-gradient-to-br from-[#202225] to-[#18191c] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                            <div class="space-y-3">
                                <div class="flex justify-between items-center pb-3 border-b border-gray-800">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-shopping-basket text-emerald-400"></i>
                                        <h3 class="text-xs font-black text-white uppercase tracking-wider">Checklist na kolej & pokoj</h3>
                                    </div>
                                    <span class="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        ${shoppingItems.filter(i => !i.is_bought).length} položek
                                    </span>
                                </div>

                                <!-- Input pro rychlé přidání -->
                                <div class="flex gap-2">
                                    <input type="text" id="dorm-item-input" 
                                           placeholder="Přidat položku (káva, prací gel, pečivo...)" 
                                           class="flex-1 bg-black/40 text-white text-xs px-3.5 py-2.5 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 transition"
                                           onkeydown="if(event.key === 'Enter') window.addDormShoppingItem()">
                                    <button onclick="window.addDormShoppingItem()" 
                                            class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition shadow-md shadow-emerald-600/20">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>

                                <!-- Seznam položek -->
                                <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1" id="dorm-shopping-list">
                                    ${shoppingItems.length === 0 ? `
                                        <p class="text-xs text-gray-500 italic text-center py-6">Máte vše nakoupeno a pokoj je zásoben! 🎉</p>
                                    ` : shoppingItems.map(item => `
                                        <div class="bg-[#18191c] border border-gray-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition group">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                <button onclick="window.toggleDormItemBought('${item.id}', ${!item.is_bought})" 
                                                        class="w-5 h-5 rounded-lg border ${item.is_bought ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-gray-600 text-transparent'} flex items-center justify-center text-[10px] transition">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                                <span class="${item.is_bought ? 'line-through text-gray-500' : 'text-gray-200 font-medium'} truncate">${item.title}</span>
                                            </div>
                                            <button onclick="window.deleteDormShoppingItem('${item.id}')" class="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition">
                                                <i class="fas fa-trash-alt text-[10px]"></i>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Karta 2: Menzy & Jídlo v Brně -->
                        <div class="bg-gradient-to-br from-[#202225] to-[#18191c] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                            <div class="flex justify-between items-center pb-3 border-b border-gray-800">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-utensils text-amber-400"></i>
                                    <h3 class="text-xs font-black text-white uppercase tracking-wider">Menzy & Jídlo u FITu</h3>
                                </div>
                                <span class="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Brno Kampus</span>
                            </div>

                            <div class="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                ${BRNO_CAMPUS_FOOD.map(f => `
                                    <div class="bg-[#18191c] border border-gray-800 rounded-2xl p-3.5 flex items-center gap-3.5 hover:border-gray-700 transition shadow-sm">
                                        <div class="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg ${f.color} flex-shrink-0">
                                            <i class="fas ${f.icon}"></i>
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center justify-between gap-2">
                                                <h4 class="text-xs font-bold text-white truncate">${f.name}</h4>
                                                <span class="text-[8px] font-black uppercase text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">${f.type}</span>
                                            </div>
                                            <p class="text-[10px] text-gray-400 mt-0.5 leading-snug line-clamp-2">${f.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 3: 1-CLICK BRNO & FIT ROZCESTNÍK -->
                    <div class="bg-gradient-to-br from-[#202225] to-[#18191c] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                        <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <i class="fas fa-external-link-alt text-[#5865F2]"></i> Rychlý rozcestník VUT FIT & Brna na 1 klik
                        </h3>

                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            <a href="https://wis.fit.vutbr.cz" target="_blank" rel="noopener noreferrer" 
                               class="bg-[#18191c] hover:bg-[#5865F2]/20 border border-gray-800 hover:border-[#5865F2]/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition group">
                                <div class="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg text-[#5865F2] group-hover:scale-110 transition">
                                    <i class="fas fa-university"></i>
                                </div>
                                <div>
                                    <span class="text-xs font-black text-white block">WIS FIT</span>
                                    <span class="text-[9px] text-gray-500 font-bold block mt-0.5">IS Fakulty</span>
                                </div>
                            </a>

                            <a href="https://moodle.fit.vutbr.cz" target="_blank" rel="noopener noreferrer" 
                               class="bg-[#18191c] hover:bg-emerald-500/20 border border-gray-800 hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition group">
                                <div class="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg text-emerald-400 group-hover:scale-110 transition">
                                    <i class="fas fa-graduation-cap"></i>
                                </div>
                                <div>
                                    <span class="text-xs font-black text-white block">Moodle FIT</span>
                                    <span class="text-[9px] text-gray-500 font-bold block mt-0.5">Projekty & Kurzy</span>
                                </div>
                            </a>

                            <a href="https://kam.vutbr.cz/iskam/" target="_blank" rel="noopener noreferrer" 
                               class="bg-[#18191c] hover:bg-amber-500/20 border border-gray-800 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition group">
                                <div class="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg text-amber-400 group-hover:scale-110 transition">
                                    <i class="fas fa-bed"></i>
                                </div>
                                <div>
                                    <span class="text-xs font-black text-white block">ISKAM VUT</span>
                                    <span class="text-[9px] text-gray-500 font-bold block mt-0.5">Koleje & Platby</span>
                                </div>
                            </a>

                            <a href="https://kam.vutbr.cz/menzy/" target="_blank" rel="noopener noreferrer" 
                               class="bg-[#18191c] hover:bg-rose-500/20 border border-gray-800 hover:border-rose-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition group">
                                <div class="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg text-rose-400 group-hover:scale-110 transition">
                                    <i class="fas fa-utensils"></i>
                                </div>
                                <div>
                                    <span class="text-xs font-black text-white block">Menzy VUT</span>
                                    <span class="text-[9px] text-gray-500 font-bold block mt-0.5">Jídelníčky & Karta</span>
                                </div>
                            </a>

                            <a href="https://idos.idnes.cz/brno/spojeni/" target="_blank" rel="noopener noreferrer" 
                               class="bg-[#18191c] hover:bg-cyan-500/20 border border-gray-800 hover:border-cyan-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition group">
                                <div class="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg text-cyan-400 group-hover:scale-110 transition">
                                    <i class="fas fa-subway"></i>
                                </div>
                                <div>
                                    <span class="text-xs font-black text-white block">DPMB Šaliny</span>
                                    <span class="text-[9px] text-gray-500 font-bold block mt-0.5">Spojení č. 1 & 6</span>
                                </div>
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    attachWindowDormHub();
    startLaundryLiveTicker();
}

/**
 * Generuje HTML pro widget prádelníku
 */
function renderLaundryWidgetHtml() {
    if (!laundryState || laundryState.is_finished) {
        return `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h4 class="text-xs font-black text-white uppercase tracking-wider">Aktuálně nikdo nepere</h4>
                    <p class="text-[11px] text-gray-400 mt-0.5">Zvolte délku programu a spusťte odpočet pračky.</p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <button onclick="window.startDormLaundry(30)" class="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-bold border border-blue-500/30 transition">
                        ⚡ 30 min (Rychlé)
                    </button>
                    <button onclick="window.startDormLaundry(45)" class="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-bold border border-blue-500/30 transition">
                        🧺 45 min (Standard)
                    </button>
                    <button onclick="window.startDormLaundry(60)" class="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-bold border border-blue-500/30 transition">
                        🧼 60 min (Důkladné)
                    </button>
                </div>
            </div>
        `;
    }

    const elapsedMs = Date.now() - new Date(laundryState.started_at).getTime();
    const totalMs = (laundryState.duration_minutes || 45) * 60 * 1000;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const remMin = Math.floor(remainingMs / 60000);
    const remSec = Math.floor((remainingMs % 60000) / 1000);

    const progressPct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

    return `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-blue-400 animate-ping"></span>
                    <span class="text-xs font-black text-white uppercase tracking-wider">Pračka právě pere</span>
                </div>
                <div class="text-right font-mono">
                    <span id="laundry-countdown" class="text-lg font-black text-blue-400">
                        ${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}
                    </span>
                    <span class="text-[9px] text-gray-500 block">zbývající čas</span>
                </div>
            </div>

            <div class="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000" style="width: ${progressPct}%"></div>
            </div>

            <div class="flex justify-between items-center pt-2 text-[10px]">
                <span class="text-gray-400">Spuštěno: ${new Date(laundryState.started_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                <div class="flex gap-2">
                    <button onclick="window.finishDormLaundry()" class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition">
                        Dopráno! ✅
                    </button>
                    <button onclick="window.cancelDormLaundry()" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold transition">
                        Zrušit
                    </button>
                </div>
            </div>
        </div>
    `;
}

function startLaundryLiveTicker() {
    if (laundryTimerInterval) clearInterval(laundryTimerInterval);

    laundryTimerInterval = setInterval(() => {
        if (!laundryState || laundryState.is_finished) return;

        const el = document.getElementById('laundry-countdown');
        if (!el) return;

        const elapsedMs = Date.now() - new Date(laundryState.started_at).getTime();
        const totalMs = (laundryState.duration_minutes || 45) * 60 * 1000;
        const remainingMs = Math.max(0, totalMs - elapsedMs);

        if (remainingMs <= 0) {
            el.textContent = "00:00 - Dopráno!";
            el.className = "text-lg font-black text-emerald-400 animate-pulse";
            return;
        }

        const remMin = Math.floor(remainingMs / 60000);
        const remSec = Math.floor((remainingMs % 60000) / 1000);
        el.textContent = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    }, 1000);
}

// --- DATABASE OPERATIONS ---

async function loadActiveLaundry() {
    try {
        const { data, error } = await supabase
            .from('dorm_laundry')
            .select('*')
            .eq('is_finished', false)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            laundryState = data[0];
        } else {
            laundryState = null;
        }
    } catch (e) {
        console.warn("[DormHub] Laundry load fallback:", e);
    }
}

async function loadShoppingItems() {
    try {
        const { data, error } = await supabase
            .from('dorm_shopping_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) shoppingItems = data;
    } catch (e) {
        console.warn("[DormHub] Shopping load fallback:", e);
    }
}

export async function startDormLaundry(minutes = 45) {
    triggerHaptic('medium');
    try {
        const { data, error } = await supabase.from('dorm_laundry').insert({
            user_id: state.currentUser?.id,
            duration_minutes: minutes,
            started_at: new Date().toISOString(),
            is_finished: false
        }).select();

        if (error) throw error;
        laundryState = data[0];
        triggerConfetti();
        showNotification(`Pračka spuštěna na ${minutes} minut! 🧺`, 'success');
        renderDormHub();
    } catch (e) {
        showNotification('Chyba při spuštění pračky: ' + e.message, 'danger');
    }
}

export async function finishDormLaundry() {
    if (!laundryState) return;
    triggerHaptic('success');
    try {
        await supabase.from('dorm_laundry').update({ is_finished: true }).eq('id', laundryState.id);
        laundryState = null;
        triggerConfetti();
        showNotification('Prádlo je dopráno a vyndáno! ✨🧺', 'success');
        renderDormHub();
    } catch (e) {
        console.error(e);
    }
}

export async function cancelDormLaundry() {
    if (!laundryState) return;
    triggerHaptic('light');
    try {
        await supabase.from('dorm_laundry').update({ is_finished: true }).eq('id', laundryState.id);
        laundryState = null;
        renderDormHub();
    } catch (e) {
        console.error(e);
    }
}

export async function addDormShoppingItem() {
    const input = document.getElementById('dorm-item-input');
    const title = input?.value.trim();
    if (!title) return;

    triggerHaptic('light');
    try {
        const { data, error } = await supabase.from('dorm_shopping_items').insert({
            title,
            added_by: state.currentUser?.id,
            is_bought: false
        }).select();

        if (error) throw error;
        input.value = '';
        shoppingItems.unshift(data[0]);
        renderDormHub();
    } catch (e) {
        showNotification('Chyba při přidávání: ' + e.message, 'danger');
    }
}

export async function toggleDormItemBought(id, isBought) {
    triggerHaptic('light');
    try {
        await supabase.from('dorm_shopping_items').update({ is_bought: isBought }).eq('id', id);
        const item = shoppingItems.find(i => i.id === id);
        if (item) item.is_bought = isBought;
        renderDormHub();
    } catch (e) {
        console.error(e);
    }
}

export async function deleteDormShoppingItem(id) {
    triggerHaptic('light');
    try {
        await supabase.from('dorm_shopping_items').delete().eq('id', id);
        shoppingItems = shoppingItems.filter(i => i.id !== id);
        renderDormHub();
    } catch (e) {
        console.error(e);
    }
}

export function pickRandomFood() {
    triggerHaptic('selection');
    const randomFood = BRNO_CAMPUS_FOOD[Math.floor(Math.random() * BRNO_CAMPUS_FOOD.length)];
    triggerConfetti();

    showNotification(`Dnes vyhrává: ${randomFood.name}! 🍲 (${randomFood.type})`, 'success');
}

function attachWindowDormHub() {
    window.startDormLaundry = startDormLaundry;
    window.finishDormLaundry = finishDormLaundry;
    window.cancelDormLaundry = cancelDormLaundry;
    window.addDormShoppingItem = addDormShoppingItem;
    window.toggleDormItemBought = toggleDormItemBought;
    window.deleteDormShoppingItem = deleteDormShoppingItem;
    window.pickRandomFood = pickRandomFood;
}
