import { supabase } from '../core/supabase.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { state, ensureChallengesData } from '../core/state.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';
import { uploadFile } from '../core/storage.js';

let subscription = null;
let activeTab = 'today'; // 'today' | 'all'

// Standard list of challenges (recycled via modulo for the 92 days)
export const CHALLENGES_POOL = [
    { title: "🗣️ Alpský dialekt", description: "Objednejte si v restauraci nebo pekárně s tím nejšílenějším rakouským přízvukem, jaký svedete!", category: "Dialekt 💬" },
    { title: "🐮 Krásná Líza", description: "Udělejte si selfie s krávou na alpské louce. Pozor, ať vám nesežere telefon nebo svačinu!", category: "Vtipné 🦝" },
    { title: "💬 Oida šampion", description: "Propašujte slovo 'Oida' tajně aspoň do pěti vět během konverzace s někým jiným bez uchechtnutí.", category: "Slang 💬" },
    { title: "💖 Láska v oblacích", description: "Dejte si pusu v kabince lanovky nebo ve výšce nad 1500 metrů nad mořem!", category: "Romantické 💖" },
    { title: "🥨 Císařský trhanec", description: "Uvařte dnes k večeři pravý rakouský Kaiserschmarrn (císařský trhanec) a bohatě ho pocukrujte!", category: "Vaření 🥨" },
    { title: "🌾 Alpské žezlo", description: "Najděte stéblo trávy delší než 50 cm a vyfoťte se s ním hrdě jako s alpským královským žezlem.", category: "Vtipné 🦝" },
    { title: "🥖 Wiener Semmel", description: "Objednejte si v pekárně housku a řekněte 'Zwei Semmeln, bitte' s tak vážným obličejem, jako byste tu žili odjakživa.", category: "Dialekt 💬" },
    { title: "🔔 Zvonkohra", description: "Najděte pasoucí se krávu s největším a nejhezčím zvoncem a pokuste se natočit/vyfotit její 'hudební výkon'.", category: "Průzkum 🔔" },
    { title: "💖 Wellness pro nožky", description: "Dnes večer musíte partnerovi udělat relaxační masáž nohou po náročné pracovní směně.", category: "Romantické 💖" },
    { title: "❄️ Alpské otužování", description: "Skočte do ledového alpského potoka, jezera, nebo si dejte aspoň 30 vteřin ledové sprchy na nohy!", category: "Otužování ❄️" },
    { title: "🎶 Jódlovací duel", description: "Napodobte jódlování z plných plic na nejvyšším bodě vaší dnešní procházky. Kdo jódluje lépe?", category: "Zábava 🎶" },
    { title: "💬 Rakouské vyznání", description: "Zjistěte od místních obyvatel, jak se v jejich specifickém horském dialektu řekne 'mám tě rád' a řekněte to partnerovi.", category: "Slang 💬" },
    { title: "🧀 Sýrová party", description: "Kupte v supermarketu ten nejdivnější a nejvíce zapáchající rakouský horský sýr a udělejte si slepou ochutnávku.", category: "Jídlo 🥨" },
    { title: "🏔️ Skok do nebe", description: "Udělejte si fotku, kde oba ve stejnou chvíli skáčete radostí do vzduchu s nádhernými horami v pozadí.", category: "Pohyb 🏔️" },
    { title: "💖 Sladké Mannerky", description: "Kupte partnerovi jako překvapení jeho oblíbenou rakouskou sladkost (např. Manner oplatky) a schovejte mu ji do batohu.", category: "Romantické 💖" },
    { title: "🗺️ Ztraceni v Alpách", description: "Najděte turistický rozcestník s šílenými názvy cílů a vyfoťte se u něj s výrazem, že nemáte tušení, kde jste.", category: "Průzkum 🗺️" },
    { title: "🥨 Rychlokurz němčiny", description: "Přečtěte si nahlas tři nová rakouská slovíčka z našeho slovníčku a vyzkoušejte se z nich navzájem.", category: "Němčina 🥨" },
    { title: "💌 Vzkaz v kapse", description: "Napište partnerovi na malý papírek zamilovaný vzkaz a tajně mu ho propašujte do kapsy od bundy nebo kalhot.", category: "Romantické 💖" },
    { title: "🇦🇹 Vlajková expedice", description: "Najděte v okolí rakouskou vlajku nebo znak a vyfoťte se u něj s tím nejvlastenečtějším výrazem.", category: "Hledání 🇦🇹" },
    { title: "🔌 Offline večer", description: "Dnes večer si udělejte klidný večer bez sociálních sítí a telefonů. Povídejte si, hrajte karty nebo se jen tulte.", category: "Vztah 🔌" }
];

export async function renderAlpskaVyzva() {
    // Expose API to window
    window.AlpskaVyzva = {
        scratchCard,
        openCompleteChallengeModal,
        saveChallengeCompletion,
        switchTab,
        openAddChallengeModal,
        saveCustomChallenge,
        viewChallengeDetail
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    await ensureChallengesData();
    setupRealtime();

    const todayKey = new Date().toISOString().split("T")[0];
    
    // Calculate current day index of the trip (departure May 31, 2026)
    const departureDate = new Date('2026-05-31T00:00:00');
    const now = new Date();
    const diffMs = now - departureDate;
    const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 0-indexed starting May 31

    const isTripStarted = dayIndex >= 0;

    let html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16 font-sans">
            <!-- Header Banner -->
            <div class="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950/40 border-b border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[190px] pt-6">
                <div class="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                
                <div class="relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 shadow-xl mb-2 animate-bounce-slow">
                    <i class="fas fa-mountain text-white text-xl drop-shadow-md"></i>
                </div>
                <h1 class="relative z-10 text-xl lg:text-2xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Alpská Výzva 🏔️✨</h1>
                <p class="relative z-10 text-gray-300 font-semibold mt-0.5 text-center text-[10px] uppercase tracking-wider max-w-md">Denní horské dobrodružství</p>
                
                <!-- Extra Action: Add Custom Challenge -->
                <button onclick="window.AlpskaVyzva.openAddChallengeModal()"
                        class="relative z-10 mt-3 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition duration-300 flex items-center gap-1.5">
                    <i class="fas fa-plus text-emerald-400"></i> Naplánovat vlastní výzvu ✍️
                </button>

                <!-- Navigation Tabs inside Header -->
                <div class="flex justify-center w-full border-t border-white/5 bg-black/10 mt-5 py-2.5 gap-6 relative z-10">
                    <button onclick="window.AlpskaVyzva.switchTab('today')" id="tab-btn-today" 
                            class="text-xs font-black uppercase tracking-wider py-1 border-b-2 ${activeTab === 'today' ? 'border-[#3ba55c] text-white' : 'border-transparent text-gray-400 hover:text-white'} transition-all">
                        Dnešní Výzva
                    </button>
                    <button onclick="window.AlpskaVyzva.switchTab('all')" id="tab-btn-all" 
                            class="text-xs font-black uppercase tracking-wider py-1 border-b-2 ${activeTab === 'all' ? 'border-[#3ba55c] text-white' : 'border-transparent text-gray-400 hover:text-white'} transition-all">
                        Všechny Výzvy
                    </button>
                </div>
            </div>

            <div class="max-w-xl mx-auto px-4 pt-6" id="challenge-content-area">
                ${activeTab === 'today' ? renderTodayChallengeHtml(todayKey, dayIndex, isTripStarted) : renderAllChallengesHtml(dayIndex, departureDate)}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderTodayChallengeHtml(todayKey, dayIndex, isTripStarted) {
    let challenge = null;

    // Check if there is a custom scheduled challenge for today in the database
    const dbRecord = state.brigadeChallenges?.find(c => c.date_key === todayKey) || {};
    
    if (dbRecord.title && dbRecord.description) {
        // Use custom challenge scheduled in Supabase
        challenge = {
            title: dbRecord.title,
            description: dbRecord.description,
            category: dbRecord.category || "Plánovaná ✍️"
        };
    } else if (!isTripStarted) {
        // Pre-trip preparation challenges
        challenge = {
            title: "🎒 Velké Balení & Očekávání",
            description: "Sbalte si kufry, zkontrolujte, zda máte teplé ponožky, bundy do deště a hlavně dobrou náladu! Odjezd za pár dní! 🇦🇹🏔️",
            category: "Příprava ✈️"
        };
    } else {
        // Recycled challenges based on day index
        const idx = dayIndex % CHALLENGES_POOL.length;
        challenge = CHALLENGES_POOL[idx];
    }

    // Check if revealed in localStorage
    const revealKey = `kiscord_revealed_challenge_${todayKey}`;
    const isRevealed = localStorage.getItem(revealKey) === 'true';

    const completedByJose = dbRecord.completed_by_jose || false;
    const completedByKlarka = dbRecord.completed_by_klarka || false;

    // Check current user status
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids?.jose;
    const amICompleted = isMeJose ? completedByJose : completedByKlarka;

    if (!isRevealed && isTripStarted) {
        // RENDER COVER CARD (Locked Scratch Card)
        return `
            <div class="flex items-center justify-center p-4">
                <div onclick="window.AlpskaVyzva.scratchCard()" 
                     class="glass-card bg-gradient-to-br from-indigo-950 to-slate-900 border border-purple-500/30 rounded-3xl p-8 max-w-sm text-center shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 relative overflow-hidden group">
                    <div class="absolute -right-10 -top-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                    <div class="absolute -left-10 -bottom-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                    
                    <span class="text-6xl block mb-6 animate-pulse">🏔️🔒</span>
                    <h2 class="text-white text-xl font-black uppercase tracking-wider mb-2">Dnešní výzva uzamčena</h2>
                    <p class="text-xs text-purple-200/60 leading-relaxed font-semibold mb-6">
                        Každé ráno na vás čeká nová tajná mise v Alpách.<br>Klikněte a setřete los pro odhalení výzvy!
                    </p>
                    <div class="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 py-3.5 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] transition duration-300">
                        Setřít kartu ✨
                    </div>
                </div>
            </div>
        `;
    } else {
        // RENDER UNLOCKED CHALLENGE
        const joseStatusBadge = completedByJose 
            ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">Splněno ✅</span>`
            : `<span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-white/30 text-[10px] font-black uppercase tracking-wider">Nesplněno ⏳</span>`;
        
        const klarkaStatusBadge = completedByKlarka
            ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">Splněno ✅</span>`
            : `<span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-white/30 text-[10px] font-black uppercase tracking-wider">Nesplněno ⏳</span>`;

        return `
            <div class="space-y-6">
                <!-- Main Challenge Card -->
                <div class="glass-card bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl relative overflow-hidden text-center animate-scale-up">
                    <span class="text-[9px] font-black uppercase tracking-widest text-[#3ba55c] bg-[#3ba55c]/10 px-3 py-1 rounded-full w-fit mx-auto mb-4 block">
                        ${challenge.category}
                    </span>
                    
                    <h2 class="text-white text-2xl font-black tracking-tight mb-3 italic">"${challenge.title}"</h2>
                    <p class="text-gray-300 font-medium text-sm leading-relaxed mb-6 px-2">
                        ${challenge.description}
                    </p>
                    
                    <!-- Partner Completion States -->
                    <div class="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 mb-6">
                        <div class="flex flex-col items-center gap-1.5 bg-black/20 p-3 rounded-2xl">
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Jožka</span>
                            ${joseStatusBadge}
                        </div>
                        <div class="flex flex-col items-center gap-1.5 bg-black/20 p-3 rounded-2xl">
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Klárka</span>
                            ${klarkaStatusBadge}
                        </div>
                    </div>

                    <!-- Complete action button -->
                    ${amICompleted ? `
                        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-pulse">
                            Splnil jsi dnešní výzvu! Skvělá práce! 🏆
                        </div>
                    ` : `
                        <button onclick="window.AlpskaVyzva.openCompleteChallengeModal('${todayKey}')" 
                                class="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group transform active:scale-95">
                            <i class="fas fa-check group-hover:scale-125 transition-transform"></i> Splnit dnešní výzvu! 
                        </button>
                    `}
                </div>

                <!-- Shared Gallery for today's challenge -->
                ${(dbRecord.jose_image_url || dbRecord.klarka_image_url) ? `
                    <div class="space-y-3">
                        <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <i class="fas fa-camera text-[#3ba55c]"></i> Důkazy z terénu 📸
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            ${dbRecord.jose_image_url ? `
                                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-4 overflow-hidden flex flex-col gap-2">
                                    <div class="w-full h-48 rounded-2xl overflow-hidden shadow-inner">
                                        <img src="${dbRecord.jose_image_url}" loading="lazy" class="w-full h-full object-cover">
                                    </div>
                                    <div class="flex items-start gap-2 mt-1">
                                        <div class="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-[8px] font-black text-blue-300 flex items-center justify-center shadow flex-shrink-0 flex-shrink-0">J</div>
                                        <p class="text-xs text-gray-300 italic">"${dbRecord.jose_note || 'Splněno!'}"</p>
                                    </div>
                                </div>
                            ` : ''}
                            ${dbRecord.klarka_image_url ? `
                                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-4 overflow-hidden flex flex-col gap-2">
                                    <div class="w-full h-48 rounded-2xl overflow-hidden shadow-inner">
                                        <img src="${dbRecord.klarka_image_url}" loading="lazy" class="w-full h-full object-cover">
                                    </div>
                                    <div class="flex items-start gap-2 mt-1">
                                        <div class="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/30 text-[8px] font-black text-pink-300 flex items-center justify-center shadow flex-shrink-0 flex-shrink-0">K</div>
                                        <p class="text-xs text-gray-300 italic">"${dbRecord.klarka_note || 'Splněno!'}"</p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

function renderAllChallengesHtml(dayIndex, departureDate) {
    const rows = [];
    const nowKey = new Date().toISOString().split("T")[0];

    for (let day = 1; day <= 92; day++) {
        const targetDate = new Date(departureDate);
        targetDate.setDate(departureDate.getDate() + day - 1);
        const dateKey = targetDate.toISOString().split("T")[0];

        // Find database completion record
        const dbRecord = state.brigadeChallenges?.find(c => c.date_key === dateKey) || {};
        const completedByJose = dbRecord.completed_by_jose || false;
        const completedByKlarka = dbRecord.completed_by_klarka || false;

        let challenge = null;

        if (dbRecord.title && dbRecord.description) {
            challenge = {
                title: dbRecord.title,
                description: dbRecord.description,
                category: dbRecord.category || "Plánovaná ✍️"
            };
        } else {
            const idx = (day - 1) % CHALLENGES_POOL.length;
            challenge = CHALLENGES_POOL[idx];
        }

        const dateNice = targetDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
        const isPastOrToday = dateKey <= nowKey;

        rows.push(`
            <div onclick="window.AlpskaVyzva.viewChallengeDetail('${dateKey}', ${day}, ${isPastOrToday})"
                 class="glass-card bg-white/[0.02] border ${dateKey === nowKey ? 'border-[#3ba55c]/30 bg-[#3ba55c]/[0.01]' : 'border-white/5'} rounded-2xl p-4 hover:border-white/10 transition-all flex items-center justify-between gap-4 cursor-pointer">
                <div class="flex items-center gap-3.5 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-black/20 flex flex-col items-center justify-center flex-shrink-0">
                        <span class="text-[9px] font-black text-white/40 block leading-none">DEN</span>
                        <span class="text-sm font-black text-white leading-none mt-0.5">${day}</span>
                    </div>
                    <div class="min-w-0">
                        <h4 class="text-xs font-black text-white truncate leading-snug">${challenge.title}</h4>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[8px] font-bold text-gray-500">${challenge.category}</span>
                            <span class="text-[8px] text-white/30 font-bold">${dateNice}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="flex -space-x-1.5">
                        <div class="w-5 h-5 rounded-full border border-[#2f3136] flex items-center justify-center text-[7px] font-black text-white shadow ${completedByJose ? 'bg-blue-500/80' : 'bg-white/5 opacity-30'}">J</div>
                        <div class="w-5 h-5 rounded-full border border-[#2f3136] flex items-center justify-center text-[7px] font-black text-white shadow ${completedByKlarka ? 'bg-pink-500/80' : 'bg-white/5 opacity-30'}">K</div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-600 text-[10px]"></i>
                </div>
            </div>
        `);
    }

    return `
        <div class="space-y-3">
            <div class="flex justify-between items-center mb-1">
                <h3 class="text-sm font-black text-white uppercase tracking-wider">Seznam všech 92 alpských výzev</h3>
                <span class="text-[9px] bg-[#3ba55c]/10 text-[#3ba55c] px-2 py-0.5 rounded-full font-bold">Den 1 až 92</span>
            </div>
            ${rows.join('')}
        </div>
    `;
}

export function switchTab(tab) {
    triggerHaptic('light');
    activeTab = tab;
    renderAlpskaVyzva();
}

export function scratchCard() {
    triggerHaptic('heavy');
    if (typeof window.triggerConfetti === 'function') {
        window.triggerConfetti();
    }
    import('../core/sound.js').then(s => s.playPageFlip()).catch(() => {});

    const todayKey = new Date().toISOString().split("T")[0];
    localStorage.setItem(`kiscord_revealed_challenge_${todayKey}`, 'true');
    renderAlpskaVyzva();
}

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('brigade-challenges-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'brigade_challenges' },
            (payload) => {
                console.log('Brigade challenges realtime change:', payload.eventType);
                ensureChallengesData(true).then(() => {
                    if (state.currentChannel === 'alpska-vyzva') {
                        renderAlpskaVyzva();
                    }
                });
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}
window.alpskaVyzvaCleanup = cleanupRealtime;

// Add Custom Challenge Modal
export function openAddChallengeModal() {
    triggerHaptic('light');

    // Prepare scheduled date selection list (Days 1 to 92)
    const options = [];
    const dept = new Date('2026-05-31T00:00:00');
    const nowKey = new Date().toISOString().split("T")[0];

    for (let day = 1; day <= 92; day++) {
        const d = new Date(dept);
        d.setDate(dept.getDate() + day - 1);
        const dateKey = d.toISOString().split("T")[0];
        const dateNice = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
        const label = `Den ${day} (${dateNice})${dateKey === nowKey ? ' - DNES ⏳' : ''}`;
        options.push(`<option value="${dateKey}">${label}</option>`);
    }

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název vlastní výzvy',
                id: 'custom-chall-title',
                placeholder: 'např. Ochutnávka Mozartových koulí'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Popis výzvy (co musíte splnit)</label>
                <textarea id="custom-chall-desc" placeholder="např. Kupte v obchodě 3 různé značky Mozartových koulí a udělejte si slepý test chuti..." 
                          class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#3ba55c]/50 transition-all min-h-[80px]"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                    <select id="custom-chall-category" 
                            class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#3ba55c]/30 focus:bg-[#202225] transition-all">
                        <option value="Zábava 🎭">Zábava 🎭</option>
                        <option value="Vaření 🥨">Vaření 🥨</option>
                        <option value="Romantické 💖" selected>Romantické 💖</option>
                        <option value="Vtipné 🦝">Vtipné 🦝</option>
                        <option value="Němčina 🥨">Němčina 🥨</option>
                        <option value="Průzkum 🏔️">Průzkum 🏔️</option>
                    </select>
                </div>

                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Naplánovat na den pobytu</label>
                    <select id="custom-chall-date" 
                            class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#3ba55c]/30 focus:bg-[#202225] transition-all">
                        ${options.join('')}
                    </select>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-custom-chall-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button onclick="window.AlpskaVyzva.saveCustomChallenge()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-[#3ba55c]/20">
                Uložit výzvu ✍️
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-custom-chall-modal',
        title: 'Naplánovat vlastní výzvu',
        subtitle: 'Vytvořte si vlastní dobrodružství na míru 🏔️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-custom-chall-modal').remove()"
    }));

    document.getElementById('add-custom-chall-modal').classList.remove('hidden');
    document.getElementById('add-custom-chall-modal').classList.add('flex');
}

export async function saveCustomChallenge() {
    triggerHaptic('medium');

    const title = document.getElementById('custom-chall-title').value.trim();
    const description = document.getElementById('custom-chall-desc').value.trim();
    const category = document.getElementById('custom-chall-category').value;
    const dateKey = document.getElementById('custom-chall-date').value;

    if (!title || !description) {
        showNotification('Prosím vyplňte název a popis výzvy!', 'warning');
        return;
    }

    try {
        // Fetch existing completion states if present to avoid erasing
        const { data: existing } = await supabase
            .from('brigade_challenges')
            .select('*')
            .eq('date_key', dateKey)
            .maybeSingle();

        const payload = {
            date_key: dateKey,
            title,
            description,
            category,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            payload.id = existing.id;
        }

        const { error } = await supabase
            .from('brigade_challenges')
            .upsert(payload, { onConflict: 'date_key' });

        if (error) throw error;

        showNotification('Vlastní výzva byla úspěšně naplánována! ✍️🏔️', 'success');
        document.getElementById('add-custom-chall-modal')?.remove();

        await ensureChallengesData(true);
        renderAlpskaVyzva();
    } catch (err) {
        console.error('Chyba při ukládání vlastní výzvy:', err);
        showNotification('Nepodařilo se uložit vlastní výzvu.', 'danger');
    }
}

// Complete modal
export function openCompleteChallengeModal(dateKey) {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Tvůj komentář k plnění',
                id: 'chall-note',
                placeholder: 'např. Kráva mě málem snědla, ale fotku mám! 😂'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nahrát fotku důkazu (nepovinné)</label>
                <div class="flex items-center gap-3">
                    <button onclick="document.getElementById('chall-photo').click()" 
                            class="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition flex items-center gap-2">
                        <i class="fas fa-camera text-[#3ba55c]"></i> Vybrat fotku
                    </button>
                    <span id="chall-filename" class="text-xs text-gray-500 italic">Nebyl vybrán žádný soubor</span>
                    <input type="file" id="chall-photo" class="hidden" accept="image/*" 
                           onchange="document.getElementById('chall-filename').textContent = this.files[0] ? this.files[0].name : 'Nebyl vybrán žádný soubor'">
                </div>
            </div>

            <div class="flex items-center gap-2.5 bg-black/20 p-3.5 rounded-xl border border-white/5 select-none">
                <input type="checkbox" id="chall-to-timeline" checked 
                       class="w-4 h-4 rounded border-gray-700 bg-gray-800 text-[#3ba55c] focus:ring-[#3ba55c]/20">
                <div class="flex-1">
                    <label for="chall-to-timeline" class="block text-xs font-bold text-white cursor-pointer">Přidat fotku i do naší společné Timeline 📸</label>
                    <span class="block text-[9px] text-gray-500 leading-tight">Uchovejte si tuto vzpomínku navždycky v hlavní galerii vzpomínek!</span>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('complete-chall-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button id="chall-save-btn" onclick="window.AlpskaVyzva.saveChallengeCompletion('${dateKey}')" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20">
                Odeslat splnění 🎉
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'complete-chall-modal',
        title: 'Splnit výzvu!',
        subtitle: 'Zaznamenej své zážitky z této alpské mise ⛰️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('complete-chall-modal').remove()"
    }));

    document.getElementById('complete-chall-modal').classList.remove('hidden');
    document.getElementById('complete-chall-modal').classList.add('flex');
}

export async function saveChallengeCompletion(dateKey) {
    const btn = document.getElementById('chall-save-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Odesílám...';
    }

    triggerHaptic('medium');

    const note = document.getElementById('chall-note').value.trim();
    const photoInput = document.getElementById('chall-photo');
    const toTimeline = document.getElementById('chall-to-timeline').checked;

    // Find challenge details
    const departureDate = new Date('2026-05-31T00:00:00');
    const targetDate = new Date(dateKey);
    const diffMs = targetDate - departureDate;
    const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let title = "🎒 Alpská výzva";
    let desc = "";
    let category = "Plánovaná";

    // Try finding custom or static challenge
    const dbRecord = state.brigadeChallenges?.find(c => c.date_key === dateKey) || {};
    if (dbRecord.title) {
        title = dbRecord.title;
        desc = dbRecord.description;
        category = dbRecord.category;
    } else if (dayIndex >= 0) {
        const idx = dayIndex % CHALLENGES_POOL.length;
        const current = CHALLENGES_POOL[idx];
        title = current.title;
        desc = current.description;
        category = current.category;
    }

    try {
        let imageUrl = null;
        if (photoInput.files && photoInput.files.length > 0) {
            const file = photoInput.files[0];
            showNotification('Nahrávám fotografii důkazu... 📸', 'info');
            imageUrl = await uploadFile('media', file, `challenges/${dateKey}/${state.currentUser.id}`);
            if (!imageUrl) throw new Error("Upload se nezdařil.");
        }

        const myId = state.currentUser?.id;
        const isJose = myId === state.user_ids?.jose;

        // Fetch existing challenge record for today
        const { data: existing } = await supabase
            .from('brigade_challenges')
            .select('*')
            .eq('date_key', dateKey)
            .maybeSingle();

        let payload = {};

        if (existing) {
            payload = {
                id: existing.id,
                completed_by_jose: isJose ? true : existing.completed_by_jose,
                completed_by_klarka: !isJose ? true : existing.completed_by_klarka,
                jose_note: isJose ? (note || 'Splněno!') : existing.jose_note,
                klarka_note: !isJose ? (note || 'Splněno!') : existing.klarka_note,
                jose_image_url: (isJose && imageUrl) ? imageUrl : existing.jose_image_url,
                klarka_image_url: (!isJose && imageUrl) ? imageUrl : existing.klarka_image_url,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('brigade_challenges')
                .update(payload)
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            payload = {
                date_key: dateKey,
                title,
                description: desc,
                category,
                completed_by_jose: isJose,
                completed_by_klarka: !isJose,
                jose_note: isJose ? (note || 'Splněno!') : null,
                klarka_note: !isJose ? (note || 'Splněno!') : null,
                jose_image_url: isJose ? imageUrl : null,
                klarka_image_url: !isJose ? imageUrl : null,
                completed_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('brigade_challenges')
                .insert(payload);

            if (error) throw error;
        }

        // PUSH TO TIMELINE IF CHECKED & PHOTO UPLOADED
        if (toTimeline && imageUrl) {
            showNotification('Propojuji s naší Timeline... 🔗', 'info');
            const { error: timelineErr } = await supabase
                .from('timeline_events')
                .insert({
                    title: `Alpská Výzva: ${title}`,
                    event_date: dateKey,
                    icon: "🏔️",
                    color: "#3ba55c",
                    description: `${state.currentUser.name} splnil/a alpskou výzvu dne: "${desc}". \nKomentář: ${note || 'Bez komentáře.'} \n#rakousko2026`,
                    images: [imageUrl]
                });

            if (timelineErr) {
                console.error("Timeline insertion failed:", timelineErr);
                showNotification('Výzva uložena, ale propojení s Timeline se nezdařilo.', 'warning');
            } else {
                showNotification('Vzpomínka úspěšně uložena do Timeline! 📸', 'success');
            }
        }

        triggerConfetti();
        showNotification('Výzva byla zaznamenána! Skvělá práce! 🏆', 'success');
        document.getElementById('complete-chall-modal')?.remove();
        document.getElementById('challenge-detail-modal')?.remove();

        await ensureChallengesData(true);
        renderAlpskaVyzva();

    } catch (err) {
        console.error('Chyba při plnění výzvy:', err);
        showNotification('Nepodařilo se zaznamenat splnění výzvy.', 'danger');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Zkusit znovu 🔁';
        }
    }
}

// Challenge Detail Modal (from "All challenges" list)
export function viewChallengeDetail(dateKey, dayNum, isPastOrToday) {
    triggerHaptic('light');

    // Find database completion record
    const dbRecord = state.brigadeChallenges?.find(c => c.date_key === dateKey) || {};
    const completedByJose = dbRecord.completed_by_jose || false;
    const completedByKlarka = dbRecord.completed_by_klarka || false;

    let challenge = null;

    if (dbRecord.title && dbRecord.description) {
        challenge = {
            title: dbRecord.title,
            description: dbRecord.description,
            category: dbRecord.category || "Plánovaná ✍️"
        };
    } else {
        const idx = (dayNum - 1) % CHALLENGES_POOL.length;
        challenge = CHALLENGES_POOL[idx];
    }

    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids?.jose;
    const amICompleted = isMeJose ? completedByJose : completedByKlarka;

    const joseStatusText = completedByJose 
        ? `<span class="text-xs font-bold text-emerald-400">Splnil ✅ ${dbRecord.jose_note ? `<br><span class="text-[10px] text-gray-400">"${dbRecord.jose_note}"</span>` : ''}</span>`
        : `<span class="text-xs text-gray-500">Nesplnil ⏳</span>`;

    const klarkaStatusText = completedByKlarka
        ? `<span class="text-xs font-bold text-emerald-400">Splnila ✅ ${dbRecord.klarka_note ? `<br><span class="text-[10px] text-gray-400">"${dbRecord.klarka_note}"</span>` : ''}</span>`
        : `<span class="text-xs text-gray-500">Nesplnila ⏳</span>`;

    const contentHtml = `
        <div class="space-y-5 text-left">
            <div class="bg-black/20 p-5 rounded-2xl border border-white/5 text-center">
                <span class="text-[9px] font-black uppercase tracking-widest text-[#3ba55c] bg-[#3ba55c]/10 px-3 py-1 rounded-full w-fit mx-auto mb-3 block">
                    ${challenge.category}
                </span>
                <h3 class="text-white text-lg font-black italic">"${challenge.title}"</h3>
                <p class="text-gray-400 text-xs mt-2 leading-relaxed font-medium">${challenge.description}</p>
            </div>

            <!-- Photos Gallery inside modal -->
            ${(dbRecord.jose_image_url || dbRecord.klarka_image_url) ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    ${dbRecord.jose_image_url ? `
                        <div class="bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <img src="${dbRecord.jose_image_url}" loading="lazy" class="w-full h-32 object-cover rounded-lg">
                            <span class="text-[8px] font-black text-blue-300 uppercase tracking-widest mt-1.5 block">🔵 Jožka</span>
                        </div>
                    ` : ''}
                    ${dbRecord.klarka_image_url ? `
                        <div class="bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <img src="${dbRecord.klarka_image_url}" loading="lazy" class="w-full h-32 object-cover rounded-lg">
                            <span class="text-[8px] font-black text-pink-300 uppercase tracking-widest mt-1.5 block">🔴 Klárka</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Completion states -->
            <div class="space-y-3 bg-black/15 p-4 rounded-xl border border-white/5">
                <h4 class="text-[9px] font-black text-white/40 uppercase tracking-widest">Stav plnění</h4>
                <div class="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span class="text-xs font-bold text-gray-400">🔵 Jožka</span>
                    <span>${joseStatusText}</span>
                </div>
                <div class="flex justify-between items-center py-1.5">
                    <span class="text-xs font-bold text-gray-400">🔴 Klárka</span>
                    <span>${klarkaStatusText}</span>
                </div>
            </div>
        </div>
    `;

    // Action buttons inside detail modal
    let actionsHtml = `<button onclick="document.getElementById('challenge-detail-modal').remove()" 
                               class="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">Zavřít</button>`;

    if (isPastOrToday && !amICompleted) {
        actionsHtml = `
            <div class="flex gap-2 w-full">
                <button onclick="document.getElementById('challenge-detail-modal').remove()" 
                        class="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                    Zavřít
                </button>
                <button onclick="window.AlpskaVyzva.openCompleteChallengeModal('${dateKey}')" 
                        class="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                    Splnit výzvu! 🎉
                </button>
            </div>
        `;
    }

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'challenge-detail-modal',
        title: `Výzva ze dne ${dayNum}`,
        subtitle: `Detail úkolu a důkazů 📸`,
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('challenge-detail-modal').remove()"
    }));

    document.getElementById('challenge-detail-modal').classList.remove('hidden');
    document.getElementById('challenge-detail-modal').classList.add('flex');
}
