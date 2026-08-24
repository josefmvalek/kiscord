import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { changeTheme } from '@core/theme.js';
import { renderModal } from '@core/ui.js';
import { isJosef } from '@core/auth.js';

// --- DEFINICE PROGRESIVNÍCH MILNÍKŮ A TITULŮ ---
export const LEVEL_MILESTONES = [
    { level: 1, minXP: 0, nextXP: 100, name: "Mývalí začátečníci 🦝", color: "from-gray-400 to-gray-500", reward: "Vstup do Kiscordu" },
    { level: 2, minXP: 100, nextXP: 250, name: "Hledači pokladů 🔍", color: "from-blue-400 to-indigo-500", reward: "+20 Love Coinů" },
    { level: 3, minXP: 250, nextXP: 450, name: "Snoví parťáci ✨", color: "from-indigo-400 to-purple-500", reward: "Odemčení rande kupónů" },
    { level: 4, minXP: 450, nextXP: 700, name: "Bezpečný přístav ⚓", color: "from-cyan-400 to-blue-500", reward: "+20 Love Coinů" },
    { level: 5, minXP: 700, nextXP: 1000, name: "Nerozlučná dvojka 🤝", color: "from-emerald-400 to-teal-500", theme: "forest", reward: "Téma Forest 🌲" },
    { level: 6, minXP: 1000, nextXP: 1400, name: "Strážci úsměvů 😊", color: "from-teal-400 to-cyan-500", reward: "+20 Love Coinů" },
    { level: 7, minXP: 1400, nextXP: 1900, name: "Mistři harmonie 🧘", color: "from-orange-400 to-pink-500", reward: "+20 Love Coinů" },
    { level: 8, minXP: 1900, nextXP: 2500, name: "Alpští dobrodruzi 🏔️", color: "from-sky-400 to-indigo-600", reward: "Alpský odznak 🇦🇹" },
    { level: 9, minXP: 2500, nextXP: 3200, name: "Nezastavitelný tým ⚡", color: "from-amber-400 to-rose-500", reward: "+20 Love Coinů" },
    { level: 10, minXP: 3200, nextXP: 4000, name: "Legendární pár 🏆", color: "from-yellow-400 to-orange-500", theme: "gold", reward: "Téma Gold 👑" },
    { level: 12, minXP: 4000, nextXP: 5500, name: "Hvězdní společníci 🌟", color: "from-purple-400 to-pink-600", reward: "+20 Love Coinů" },
    { level: 15, minXP: 5500, nextXP: 8000, name: "Nesmrtelné pouto 💖", color: "from-rose-400 to-red-600", reward: "+30 Love Coinů" },
    { level: 20, minXP: 8000, nextXP: 12000, name: "Páni Vesmíru 👑", color: "from-amber-300 via-pink-500 to-purple-600", reward: "+50 Love Coinů" },
    { level: 25, minXP: 12000, nextXP: 999999, name: "Nekonečná láska ♾️", color: "from-yellow-300 via-red-500 to-pink-500", reward: "Věčná sláva 💫" }
];

let currentXP = 0;
let currentLevelData = calculateLevelFromXP(0);
let cachedBreakdown = null;

export function calculateLevelFromXP(xp) {
    const val = Math.max(0, parseInt(xp) || 0);
    for (let i = LEVEL_MILESTONES.length - 1; i >= 0; i--) {
        if (val >= LEVEL_MILESTONES[i].minXP) {
            const m = LEVEL_MILESTONES[i];
            const xpInLevel = val - m.minXP;
            const xpNeededForLevel = m.nextXP - m.minXP;
            const progressPercentage = Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeededForLevel) * 100)));
            return {
                level: m.level,
                title: m.name,
                color: m.color,
                theme: m.theme,
                reward: m.reward,
                currentXP: val,
                minXP: m.minXP,
                nextXP: m.nextXP,
                xpInLevel,
                xpNeededForLevel,
                progressPercentage
            };
        }
    }
    return {
        level: 1,
        title: LEVEL_MILESTONES[0].name,
        color: LEVEL_MILESTONES[0].color,
        theme: LEVEL_MILESTONES[0].theme,
        reward: LEVEL_MILESTONES[0].reward,
        currentXP: 0,
        minXP: 0,
        nextXP: 100,
        xpInLevel: 0,
        xpNeededForLevel: 100,
        progressPercentage: 0
    };
}

export async function initLevels() {
    console.log("[Levels] Initializing Relationship Leveling 2.0...");
    await updateRelationshipXP();
    
    // Poslech na změny v důležitých tabulkách pro Realtime XP update
    const tables = ['health_data', 'bucket_list', 'timeline', 'timeline_events', 'gym_logs', 'daily_answers', 'love_letters'];
    
    const channel = supabase.channel('relationship-levels-realtime');
    tables.forEach(table => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
            console.log(`[Levels] Realtime update from ${table}:`, payload);
            updateRelationshipXP();
        });
    });
    
    channel.subscribe((status) => {
        console.log("[Levels] Subscription status:", status);
    });

    // Expose helpers globally
    window.openRelationshipMilestonesModal = openRelationshipMilestonesModal;
}

export async function updateRelationshipXP() {
    try {
        // Krátký timeout pro jistotu zpracování databáze
        await new Promise(res => setTimeout(res, 400));

        const { data, error } = await supabase.rpc('get_relationship_xp');
        if (error) throw error;

        const newXP = parseInt(data) || 0;
        const newLevelInfo = calculateLevelFromXP(newXP);

        // Sidebar badge vizuální impuls
        const badge = document.getElementById('sidebar-level-badge');
        if (badge && newXP !== currentXP) {
             badge.classList.add('ring-2', 'ring-[#faa61a]', 'scale-105');
             setTimeout(() => badge.classList.remove('ring-2', 'ring-[#faa61a]', 'scale-105'), 1000);
        }

        // Level Up oslava
        if (newLevelInfo.level > currentLevelData.level && currentLevelData.level !== 1) {
            triggerLevelUp(newLevelInfo);
        }

        currentXP = newXP;
        currentLevelData = newLevelInfo;

        renderLevelUI();
        
        // Zpřístupnit i pro dashboard
        window.dispatchEvent(new CustomEvent('relationship-xp-updated', { detail: newLevelInfo }));
    } catch (e) {
        console.error("[Levels] Error fetching XP:", e);
    }
}

function triggerLevelUp(levelInfo) {
    triggerConfetti();
    triggerHaptic('success');
    
    // Server-side Level Up odměna (+20 coinů oběma)
    supabase.rpc('reward_level_up', { new_level: levelInfo.level })
        .then(({ data }) => {
            if (data) {
                console.log(`[Levels] Server-side Level Up odměna (+20 coinů) úspěšně připsána za level ${levelInfo.level}!`);
                import('@core/state.js').then(s => s.ensureLoveShopData(true));
            }
        })
        .catch(e => console.warn('[Levels] Nepodařilo se připsat Level Up odměnu na serveru:', e));
    
    // Automaticky aplikovat nové téma, pokud je odemčeno
    if (levelInfo.theme) {
        changeTheme(levelInfo.theme);
        window.dispatchEvent(new CustomEvent('notification', { 
            detail: { 
                message: `LEVEL UP! Odemčeno nové téma: ${levelInfo.theme.toUpperCase()}! 🎨`, 
                type: "success" 
            } 
        }));
    }

    // Zobrazit notifikaci o změně titulu
    window.dispatchEvent(new CustomEvent('notification', { 
        detail: { 
            message: `LEVEL UP! Nyní jste: ${levelInfo.title} 🎉`, 
            type: "success" 
        } 
    }));
}

export function getCurrentLevelData() {
    return currentLevelData;
}

export function renderLevelUI() {
    renderSidebarLevel();
    renderHeaderLevel();
}

function renderHeaderLevel() {
    const info = currentLevelData;
    const lvlText = document.getElementById('header-level-text');
    const xpText = document.getElementById('header-xp-text');
    if (lvlText) lvlText.textContent = `Lv. ${info.level}`;
    if (xpText) xpText.textContent = `${currentXP} XP`;
}

function renderSidebarLevel() {
    const info = currentLevelData;
    const sidebarProfile = document.querySelector('#sidebar-wrapper [onclick="toggleUserPopout()"]')?.parentElement;
    
    if (!sidebarProfile) return;

    let badge = document.getElementById('sidebar-level-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'sidebar-level-badge';
        badge.className = 'mx-2 mb-2 px-3 py-2 rounded-xl bg-[#202225] border border-gray-700/50 flex flex-col gap-1 cursor-pointer transition-all hover:border-[#faa61a]/40 hover:bg-[#202225]/80 shadow-md group select-none';
        badge.onclick = () => openRelationshipMilestonesModal();
        const trigger = sidebarProfile.querySelector('[onclick="toggleUserPopout()"]');
        sidebarProfile.insertBefore(badge, trigger);
    }

    const isMeJose = isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const coins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);

    const xpRemaining = Math.max(0, info.nextXP - currentXP);

    badge.innerHTML = `
        <div class="flex justify-between items-center mb-1.5">
            <span class="text-[10.5px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-400 group-hover:animate-ping"></span>
                Level ${info.level}
            </span>
            <div onclick="event.stopPropagation(); window.switchChannel('love-shop');" 
                 class="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-black text-[10px] flex items-center gap-1 transition-all active:scale-95 shadow-sm" 
                 title="Otevřít Obchůdek (Love Shop)">
                <i class="fas fa-coins text-amber-400"></i>
                <span id="sidebar-coins-display">${coins}</span>
                <span class="text-[8px] text-amber-400/80 uppercase font-black">LC</span>
            </div>
        </div>
        <div class="w-full h-1.5 bg-[#2f3136] rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r ${info.color} transition-all duration-1000 shadow-sm" style="width: ${info.progressPercentage}%"></div>
        </div>
        <div class="flex justify-between items-center mt-1">
            <span class="text-[9px] text-gray-400 font-semibold truncate max-w-[125px]">${info.title}</span>
            <span class="text-[8.5px] text-gray-400 font-bold tracking-tight">${info.progressPercentage}% (${currentXP}/${info.nextXP} XP)</span>
        </div>
    `;
    
    badge.title = `Klikni pro otevření Stromu vztahu • Do dalšího levelu zbývá ${xpRemaining} XP`;
}

/**
 * Modální okno "Náš Vztahový Strom / Milníky Lásky" s grafickým rozpadem XP a roadmapou
 */
export async function openRelationshipMilestonesModal() {
    triggerHaptic('light');
    
    // Načteme rozpad XP z RPC
    let breakdown = {
        water_xp: 0,
        sleep_xp: 0,
        bucket_xp: 0,
        timeline_xp: 0,
        gym_xp: 0,
        daily_q_xp: 0,
        letters_xp: 0,
        total_xp: currentXP
    };

    try {
        const { data, error } = await supabase.rpc('get_relationship_xp_breakdown');
        if (!error && data) {
            breakdown = data;
            cachedBreakdown = data;
        }
    } catch (e) {
        console.warn("[Levels] Error loading XP breakdown:", e);
        if (cachedBreakdown) breakdown = cachedBreakdown;
    }

    const info = currentLevelData;
    const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const myCoins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);
    const partnerName = isMeJose ? "Klárka" : "Jožka";
    const partnerCoins = isMeJose ? (state.loveCoins?.klarka || 0) : (state.loveCoins?.jose || 0);

    const pillars = [
        { id: 'timeline', title: "Vzpomínky & Timeline", icon: "fa-camera", iconColor: "text-pink-400", bg: "from-pink-500/20 to-rose-500/5", border: "border-pink-500/40", xp: breakdown.timeline_xp || 0, desc: "+25 XP za každou vzpomínku a fotku v Timeline" },
        { id: 'gym', title: "Tréninky & Fitness", icon: "fa-dumbbell", iconColor: "text-blue-400", bg: "from-blue-500/20 to-indigo-500/5", border: "border-blue-500/40", xp: breakdown.gym_xp || 0, desc: "+25 XP za každý odcvičený společný trénink" },
        { id: 'daily_q', title: "Denní otázky", icon: "fa-comment-dots", iconColor: "text-amber-400", bg: "from-amber-500/20 to-yellow-500/5", border: "border-amber-500/40", xp: breakdown.daily_q_xp || 0, desc: "+15 XP za každou zodpovězenou denní otázku" },
        { id: 'letters', title: "Zamilované dopisy", icon: "fa-envelope-open-text", iconColor: "text-purple-400", bg: "from-purple-500/20 to-indigo-500/5", border: "border-purple-500/40", xp: breakdown.letters_xp || 0, desc: "+20 XP za každý poslaný zamilovaný dopis" },
        { id: 'bucket', title: "Bucketlist & Sny", icon: "fa-check-circle", iconColor: "text-emerald-400", bg: "from-emerald-500/20 to-teal-500/5", border: "border-emerald-500/40", xp: breakdown.bucket_xp || 0, desc: "+50 XP za každý splněný společný cíl" },
        { id: 'health', title: "Zdraví & Spánek", icon: "fa-tint", iconColor: "text-sky-400", bg: "from-sky-500/20 to-blue-500/5", border: "border-sky-500/40", xp: (breakdown.water_xp || 0) + (breakdown.sleep_xp || 0), desc: "+1 XP za sklenici vody a +10 XP za spánek" }
    ];

    window.activePillars = pillars;
    window.selectPillarDetail = (idx) => {
        triggerHaptic('selection');
        const p = window.activePillars?.[idx];
        if (!p) return;

        document.querySelectorAll('.pillar-btn').forEach((btn, i) => {
            const item = window.activePillars[i];
            if (i === idx) {
                btn.className = `pillar-btn p-3 rounded-2xl border-2 border-amber-400 bg-[#25282e] shadow-[0_0_15px_rgba(251,191,36,0.3)] flex flex-col items-center justify-center gap-1 transition-all group select-none cursor-pointer`;
            } else {
                btn.className = `pillar-btn p-3 rounded-2xl border border-gray-800 bg-[#1a1c20] opacity-75 hover:opacity-100 flex flex-col items-center justify-center gap-1 hover:bg-[#22252a] hover:border-gray-700 transition-all active:scale-95 shadow-sm group select-none cursor-pointer`;
            }
        });

        const card = document.getElementById('pillar-detail-card');
        const title = document.getElementById('pillar-detail-title');
        const desc = document.getElementById('pillar-detail-desc');
        const xp = document.getElementById('pillar-detail-xp');
        const icon = document.getElementById('pillar-detail-icon');

        if (card) {
            card.className = `mt-2.5 p-3.5 rounded-2xl border ${p.border} bg-gradient-to-r ${p.bg} bg-[#18191c] flex items-center justify-between gap-3 shadow-lg transition-all animate-fade-in`;
        }
        if (title) title.textContent = p.title;
        if (desc) desc.textContent = p.desc;
        if (xp) xp.textContent = `${p.xp} XP`;
        if (icon) icon.className = `fas ${p.icon} ${p.iconColor}`;
    };

    const contentHtml = `
        <div class="space-y-6 text-left max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
            <!-- HLAVNÍ KARTA LEVELU -->
            <div class="bg-gradient-to-br from-[#202225] to-[#18191c] p-5 sm:p-6 rounded-3xl border border-gray-700/50 shadow-2xl relative overflow-hidden">
                <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-[#faa61a]/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                    <div class="flex items-center gap-3.5">
                        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${info.color} flex items-center justify-center text-2xl font-black text-white shadow-xl flex-shrink-0">
                            ${info.level}
                        </div>
                        <div>
                            <span class="text-[9px] font-black text-[#faa61a] uppercase tracking-widest block">Aktuální hodnost</span>
                            <h3 class="text-lg sm:text-xl font-black text-white tracking-wide leading-tight">${info.title}</h3>
                            <p class="text-xs text-gray-400 mt-0.5 font-medium">Společně nasbíráno: <strong class="text-white">${info.currentXP} XP</strong></p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 bg-[#18191c]/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-gray-700/50 shadow-inner flex-shrink-0">
                        <div class="text-center min-w-[45px]">
                            <span class="text-[8px] text-gray-400 font-black uppercase tracking-wider block">Ty</span>
                            <span class="text-sm font-black text-yellow-400 flex items-center justify-center gap-1">${myCoins} <i class="fas fa-coins text-[9px] text-yellow-500"></i></span>
                        </div>
                        <div class="h-6 w-[1px] bg-gray-700"></div>
                        <div class="text-center min-w-[45px]">
                            <span class="text-[8px] text-gray-400 font-black uppercase tracking-wider block">${partnerName}</span>
                            <span class="text-sm font-black text-gray-300 flex items-center justify-center gap-1">${partnerCoins} <i class="fas fa-coins text-[9px] text-gray-500"></i></span>
                        </div>
                    </div>
                </div>

                <div class="mt-5 space-y-2 relative z-10">
                    <div class="flex justify-between text-xs font-bold">
                        <span class="text-gray-300">Postup do Levelu ${info.level + 1}</span>
                        <span class="text-amber-400 font-black">${info.xpInLevel} / ${info.xpNeededForLevel} XP (${info.progressPercentage}%)</span>
                    </div>
                    <div class="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-[1px] border border-gray-700/50">
                        <div class="h-full bg-gradient-to-r ${info.color} rounded-full transition-all duration-1000 shadow" style="width: ${info.progressPercentage}%"></div>
                    </div>
                    <div class="text-right text-[10px] text-gray-400 font-medium">
                        Do dalšího milníku chybí ještě <strong class="text-amber-300">${Math.max(0, info.nextXP - info.currentXP)} XP</strong>
                    </div>
                </div>
            </div>

            <!-- PILÍŘE NAŠEHO VZTAHU (IKONKOVÝ PŘEHLED) -->
            <div>
                <div class="flex justify-between items-center mb-2.5">
                    <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-chart-pie text-[#faa61a]"></i> Pilíře našeho vztahu (Kde se vzalo XP)
                    </h4>
                    <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Klikni pro detail</span>
                </div>

                <!-- 6 IKONICKÝCH TLAČÍTEK -->
                <div class="grid grid-cols-6 gap-2 p-1">
                    ${pillars.map((p, idx) => `
                        <button type="button" 
                                onclick="window.selectPillarDetail(${idx})"
                                id="pillar-btn-${idx}"
                                class="pillar-btn p-3 rounded-2xl ${idx === 0 ? 'border-2 border-amber-400 bg-[#25282e] shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border border-gray-800 bg-[#1a1c20] opacity-75 hover:opacity-100 hover:border-gray-700'} flex flex-col items-center justify-center gap-1 hover:bg-[#22252a] transition-all active:scale-95 shadow-sm group select-none cursor-pointer"
                                title="${p.title}">
                            <div class="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center text-base ${p.iconColor}">
                                <i class="fas ${p.icon}"></i>
                            </div>
                            <span class="text-[10px] font-black text-amber-300 whitespace-nowrap">${p.xp}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- DETAIL VYBRANÉHO PILÍŘE -->
                <div id="pillar-detail-card" class="mt-2.5 p-3.5 rounded-2xl border ${pillars[0].border} bg-gradient-to-r ${pillars[0].bg} bg-[#18191c] flex items-center justify-between gap-3 shadow-lg transition-all animate-fade-in">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                            <i id="pillar-detail-icon" class="fas ${pillars[0].icon} ${pillars[0].iconColor}"></i>
                        </div>
                        <div class="min-w-0">
                            <h5 id="pillar-detail-title" class="text-xs font-black text-white truncate">${pillars[0].title}</h5>
                            <p id="pillar-detail-desc" class="text-[10px] text-gray-300 mt-0.5">${pillars[0].desc}</p>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <span id="pillar-detail-xp" class="text-xs font-black text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-xl inline-block whitespace-nowrap shadow-sm">
                            ${pillars[0].xp} XP
                        </span>
                    </div>
                </div>
            </div>

            <!-- CESTA MILNÍKŮ (ROADMAPA) -->
            <div>
                <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i class="fas fa-trophy text-[#faa61a]"></i> Cesta milníků & Odměny
                </h4>
                <div class="space-y-2">
                    ${LEVEL_MILESTONES.map(m => {
                        const isUnlocked = info.currentXP >= m.minXP;
                        const isCurrent = info.level === m.level;
                        return `
                            <div class="p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3.5 ${
                                isCurrent 
                                    ? 'bg-[#2f3136] border-[#faa61a] shadow-lg shadow-amber-500/5 ring-1 ring-[#faa61a]/50' 
                                    : (isUnlocked ? 'bg-[#202225] border-gray-700/50 opacity-90' : 'bg-[#18191c]/50 border-gray-800 opacity-40')
                            }">
                                <div class="flex items-center gap-3.5 min-w-0">
                                    <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center font-black text-white text-xs sm:text-sm shadow-md flex-shrink-0">
                                        ${m.level}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2">
                                            <h5 class="text-xs font-black text-white truncate">${m.name}</h5>
                                            ${isCurrent ? '<span class="bg-[#faa61a] text-black text-[7.5px] font-black px-1.5 py-0.5 rounded-full uppercase flex-shrink-0">Zde</span>' : ''}
                                        </div>
                                        <span class="text-[9.5px] text-gray-400 font-medium block mt-0.5">Vyžaduje: ${m.minXP} XP</span>
                                    </div>
                                </div>
                                
                                <div class="text-right flex-shrink-0">
                                    <span class="text-[10px] font-bold ${isUnlocked ? 'text-emerald-400' : 'text-gray-500'} flex items-center gap-1.5 justify-end">
                                        ${isUnlocked ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-lock"></i>'}
                                        <span>${m.reward}</span>
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    const modalId = 'relationship-milestones-modal';
    document.getElementById(modalId)?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: modalId,
        title: 'Náš Vztahový Strom & Milníky',
        subtitle: 'Každý společný okamžik, trénink i úsměv posouvá náš vztah dál ❤️',
        content: contentHtml,
        actions: `
            <div class="flex justify-between items-center w-full">
                <button onclick="window.switchChannel('love-shop'); document.getElementById('${modalId}').remove();"
                        class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md active:scale-95">
                    <i class="fas fa-store"></i> Otevřít Mývalí Tržnici
                </button>
                <button onclick="document.getElementById('${modalId}').remove()" 
                        class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition active:scale-95">
                    Zavřít
                </button>
            </div>
        `,
        onClose: `document.getElementById('${modalId}').remove()`
    }));

    const modalEl = document.getElementById(modalId);
    modalEl?.classList.remove('hidden');
    modalEl?.classList.add('flex');
}

if (typeof window !== 'undefined') {
    window.openRelationshipMilestonesModal = openRelationshipMilestonesModal;
}
