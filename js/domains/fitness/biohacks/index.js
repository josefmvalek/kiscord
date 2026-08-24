import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { ensureBiohacksData } from '@core/loaders.js';
import { safeUpsert } from '@core/offline.js';
import { 
    CAFFEINE_BEVERAGES, 
    calculateBloodCaffeine, 
    generate24HourCaffeineCurve, 
    calculateSleepCutoffTime 
} from './caffeineTracker.js';
import { 
    FASTING_PROTOCOLS, 
    calculateFastingProgress, 
    METABOLIC_STAGES 
} from './fastingTimer.js';
import { calculateDailyRecoveryScore } from './recoveryScore.js';

let activeSubtab = 'recovery'; // 'recovery' | 'caffeine' | 'fasting'

/**
 * Hlavní renderovací funkce modulu BioHacks & Longevity
 */
export async function renderBioHacks() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    await ensureBiohacksData();

    const todayStr = getTodayKey();
    const bioLog = (state.biohackLogs && state.biohackLogs[todayStr]) || {
        caffeine_entries: [],
        fasting_sessions: []
    };

    const caffeineEntries = Array.isArray(bioLog.caffeine_entries) ? bioLog.caffeine_entries : [];
    const currentBloodCaffeine = calculateBloodCaffeine(caffeineEntries, new Date());
    const bedtime = new Date();
    bedtime.setHours(23, 0, 0, 0);
    const bedtimeCaffeine = calculateBloodCaffeine(caffeineEntries, bedtime);
    const sleepCutoff = calculateSleepCutoffTime(23);

    const fastingProgress = calculateFastingProgress(state.activeFastingSession);
    const recovery = calculateDailyRecoveryScore();

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <!-- Header Bar -->
            <div class="bento-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
                        ⚡
                    </span>
                    <div>
                        <h2 class="text-base font-black text-white uppercase tracking-wider">BioHacks & Recovery Engine</h2>
                        <p class="text-xs text-gray-400">Kofeinová křivka, přerušovaný půst a denní Recovery Index</p>
                    </div>
                </div>

                <!-- Subtab Switcher -->
                <div class="grid grid-cols-3 p-1 bg-[#202225] rounded-xl border border-white/5 gap-1 text-xs w-full sm:w-auto">
                    <button 
                        onclick="window.switchBioHacksSubtab('recovery')" 
                        class="px-3 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${activeSubtab === 'recovery' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-heart-pulse"></i> <span>Recovery</span>
                    </button>
                    <button 
                        onclick="window.switchBioHacksSubtab('caffeine')" 
                        class="px-3 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${activeSubtab === 'caffeine' ? 'bg-amber-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-mug-hot"></i> <span>Kofein</span>
                    </button>
                    <button 
                        onclick="window.switchBioHacksSubtab('fasting')" 
                        class="px-3 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${activeSubtab === 'fasting' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-hourglass-half"></i> <span>Půst</span>
                    </button>
                </div>
            </div>

            <!-- Content Area by Subtab -->
            <div class="space-y-6">
                ${activeSubtab === 'recovery' ? renderRecoverySection(recovery) : ''}
                ${activeSubtab === 'caffeine' ? renderCaffeineSection(currentBloodCaffeine, bedtimeCaffeine, sleepCutoff, caffeineEntries) : ''}
                ${activeSubtab === 'fasting' ? renderFastingSection(fastingProgress) : ''}
            </div>
        </div>
    `;
}

/**
 * Vykreslí sekci Recovery Index
 */
function renderRecoverySection(recovery) {
    return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Circular Gauge Card -->
        <div class="bento-card bento-card-recovery md:col-span-2 flex flex-col justify-between space-y-5">
            <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase tracking-wider text-purple-400">Denní připravenost</span>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${recovery.themeClass}">
                    ${recovery.statusLabel}
                </span>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                <div class="relative w-44 h-44 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10" />
                        <circle 
                            cx="60" cy="60" r="50" fill="none" 
                            stroke="${recovery.category === 'green' ? '#10b981' : (recovery.category === 'yellow' ? '#f59e0b' : '#ef4444')}" 
                            stroke-width="10" 
                            stroke-linecap="round"
                            stroke-dasharray="314.15" 
                            stroke-dashoffset="${314.15 * (1 - recovery.score / 100)}"
                            class="progress-ring-circle"
                        />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span class="text-4xl font-black text-white">${recovery.score}%</span>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recovery Score</span>
                    </div>
                </div>

                <div class="space-y-2.5 flex-1 w-full text-xs">
                    <div class="space-y-1">
                        <div class="flex justify-between text-[11px] font-semibold text-gray-300">
                            <span>Spánek & odpočinek (35%)</span>
                            <span class="text-blue-400 font-bold">${recovery.breakdown.sleepScore}%</span>
                        </div>
                        <div class="w-full bg-[#202225] h-1.5 rounded-full overflow-hidden">
                            <div class="bg-blue-500 h-full rounded-full" style="width: ${recovery.breakdown.sleepScore}%;"></div>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <div class="flex justify-between text-[11px] font-semibold text-gray-300">
                            <span>Svalová regenerace (25%)</span>
                            <span class="text-purple-400 font-bold">${recovery.breakdown.sorenessScore}%</span>
                        </div>
                        <div class="w-full bg-[#202225] h-1.5 rounded-full overflow-hidden">
                            <div class="bg-purple-500 h-full rounded-full" style="width: ${recovery.breakdown.sorenessScore}%;"></div>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <div class="flex justify-between text-[11px] font-semibold text-gray-300">
                            <span>Hydratace (15%)</span>
                            <span class="text-cyan-400 font-bold">${recovery.breakdown.waterScore}%</span>
                        </div>
                        <div class="w-full bg-[#202225] h-1.5 rounded-full overflow-hidden">
                            <div class="bg-cyan-500 h-full rounded-full" style="width: ${recovery.breakdown.waterScore}%;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Daily Actionable Directive -->
            <div class="p-4 bg-gradient-to-r from-purple-950/40 to-[#202225] rounded-xl border border-purple-500/20 space-y-1">
                <span class="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <i class="fas fa-compass"></i> Doporučení pro dnešní den
                </span>
                <p class="text-xs text-gray-200 leading-relaxed">${recovery.directive}</p>
            </div>
        </div>

        <!-- Right: Whoop-style Comparison -->
        <div class="bento-card flex flex-col justify-between space-y-4">
            <div class="space-y-2">
                <div class="flex items-center gap-2 text-xs font-black text-purple-400">
                    <i class="fas fa-shield-halved"></i>
                    <span>Algoritmus regenerace</span>
                </div>
                <h4 class="text-sm font-black text-white">Proč neplatit za Whoop?</h4>
                <p class="text-xs text-gray-400 leading-relaxed">
                    Kiscord kalkuluje tvůj denní index přímo z reálných dat o spánku, svalové bolesti ze sauny/strečinku a tréninkovém objemu v posilovně.
                </p>
            </div>

            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 text-center">
                <span class="text-[11px] font-bold text-gray-300">Ušetřeno za placená předplatná:</span>
                <span class="text-base font-black text-emerald-400 block mt-0.5">~720 Kč / měsíčně 💰</span>
            </div>
        </div>
    </div>
    `;
}

/**
 * Vykreslí sekci Kofeinový Tracker
 */
function renderCaffeineSection(currentMg, bedtimeMg, sleepCutoff, caffeineEntries) {
    const curvePoints = generate24HourCaffeineCurve(caffeineEntries);
    const maxMg = Math.max(100, ...curvePoints.map(p => p.mg));

    return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Main Caffeine Hero Card -->
        <div class="bento-card bento-card-caffeine md:col-span-2 space-y-5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-lg">☕</span>
                    <span class="text-xs font-black uppercase tracking-wider text-amber-400">Hladina kofeinu v krvi</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Poločas rozpadu: 5.0 hod
                </span>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-3 gap-3 text-center">
                <div class="p-3 bg-[#202225] rounded-xl border border-white/5">
                    <span class="text-[10px] font-bold uppercase text-gray-400 block">Právě v krvi</span>
                    <span class="text-2xl font-black text-amber-400">${currentMg} <span class="text-xs font-normal">mg</span></span>
                </div>
                <div class="p-3 bg-[#202225] rounded-xl border border-white/5">
                    <span class="text-[10px] font-bold uppercase text-gray-400 block">V době spánku (23:00)</span>
                    <span class="text-2xl font-black ${bedtimeMg > 30 ? 'text-red-400' : 'text-emerald-400'}">${bedtimeMg} <span class="text-xs font-normal">mg</span></span>
                </div>
                <div class="p-3 bg-[#202225] rounded-xl border border-white/5">
                    <span class="text-[10px] font-bold uppercase text-gray-400 block">Kofeinový Cutoff</span>
                    <span class="text-2xl font-black text-white">${sleepCutoff}</span>
                </div>
            </div>

            <!-- 24-Hour Decay SVG Graph -->
            <div class="space-y-1">
                <span class="text-[10px] font-black uppercase text-gray-400">Průběh hladiny kofeinu během dne</span>
                <div class="bg-[#202225] p-3 rounded-xl border border-white/5 h-36 flex items-end justify-between gap-1">
                    ${curvePoints.map(p => {
                        const heightPercent = Math.min(100, Math.round((p.mg / maxMg) * 100));
                        return `
                            <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                                <span class="text-[9px] font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition">${p.mg}mg</span>
                                <div class="w-full bg-[#18191c] rounded-t-sm h-24 flex items-end">
                                    <div class="w-full bg-gradient-to-t from-amber-600 to-yellow-400 rounded-t-sm" style="height: ${Math.max(4, heightPercent)}%;"></div>
                                </div>
                                <span class="text-[9px] text-gray-500">${p.hour}h</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>

        <!-- Quick Log Beverage Card -->
        <div class="bento-card space-y-3">
            <h4 class="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <i class="fas fa-plus"></i> Zapsat nápoj
            </h4>
            <div class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                ${CAFFEINE_BEVERAGES.map(bev => `
                    <button 
                        onclick="window.quickLogCaffeine('${bev.id}', ${bev.mg})" 
                        class="w-full p-2.5 rounded-xl bg-[#202225] hover:bg-amber-500/20 hover:border-amber-500/40 border border-white/5 flex items-center justify-between text-xs transition active:scale-95"
                    >
                        <div class="flex items-center gap-2">
                            <span class="text-base">${bev.icon}</span>
                            <span class="font-bold text-gray-200">${bev.name}</span>
                        </div>
                        <span class="font-black text-amber-400">+${bev.mg} mg</span>
                    </button>
                `).join('')}
            </div>
        </div>
    </div>
    `;
}

/**
 * Vykreslí sekci Fasting Timer
 */
function renderFastingSection(fasting) {
    return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Main Fasting Timer Card -->
        <div class="bento-card bento-card-fasting md:col-span-2 space-y-5">
            <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase tracking-wider text-orange-400">Přerušovaný Půst (Intermittent Fasting)</span>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${fasting.isActive ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-gray-500/10 text-gray-400'}">
                    ${fasting.isActive ? 'Půst aktivní' : 'Neaktivní'}
                </span>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                <!-- Circular Timer -->
                <div class="relative w-44 h-44 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10" />
                        <circle 
                            cx="60" cy="60" r="50" fill="none" 
                            stroke="#f97316" 
                            stroke-width="10" 
                            stroke-linecap="round"
                            stroke-dasharray="314.15" 
                            stroke-dashoffset="${314.15 * (1 - (fasting.progressPercent || 0) / 100)}"
                            class="progress-ring-circle"
                        />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span class="text-3xl font-black text-white">${fasting.isActive ? `${fasting.hours}h ${fasting.minutes}m` : '0h 00m'}</span>
                        <span class="text-[10px] font-bold text-gray-400 uppercase">z cíle ${fasting.targetHours || 16}h</span>
                    </div>
                </div>

                <!-- Current Metabolic Stage -->
                <div class="space-y-3 flex-1 w-full">
                    ${fasting.isActive ? `
                    <div class="p-4 bg-[#202225] rounded-xl border border-orange-500/20 space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-base">${fasting.stage.icon}</span>
                            <span class="text-xs font-black text-orange-400">${fasting.stage.label}</span>
                        </div>
                        <p class="text-[11px] text-gray-300 leading-relaxed">${fasting.stage.desc}</p>
                    </div>
                    ` : `
                    <div class="p-4 bg-[#202225] rounded-xl border border-white/5 text-center text-xs text-gray-400">
                        Zvol protokol a stiskni Start pro zahájení měření půstu.
                    </div>
                    `}

                    <!-- Start/Stop Action -->
                    <button 
                        onclick="window.toggleFastingSession()" 
                        class="w-full py-3 rounded-xl font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${fasting.isActive ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25' : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25'}"
                    >
                        <i class="fas ${fasting.isActive ? 'fa-stop' : 'fa-play'}"></i>
                        <span>${fasting.isActive ? 'Ukončit půst' : 'Zahájit půst (16:8)'}</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Protocol Breakdown -->
        <div class="bento-card space-y-3">
            <h4 class="text-xs font-black uppercase tracking-wider text-orange-400">Fáze metabolismu</h4>
            <div class="space-y-2 text-xs">
                ${METABOLIC_STAGES.map(st => `
                    <div class="p-2.5 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span>${st.icon}</span>
                            <span class="font-bold text-gray-300 text-[11px]">${st.label}</span>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400">${st.minHours}-${st.maxHours}h</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
}

// Global actions
if (typeof window !== 'undefined') {
    window.renderBioHacks = renderBioHacks;

    window.switchBioHacksSubtab = (tab) => {
        triggerHaptic('light');
        activeSubtab = tab;
        renderBioHacks();
    };

    window.quickLogCaffeine = async (id, mg) => {
        triggerHaptic('success');
        const todayStr = getTodayKey();
        if (!state.biohackLogs) state.biohackLogs = {};
        if (!state.biohackLogs[todayStr]) state.biohackLogs[todayStr] = { caffeine_entries: [], fasting_sessions: [] };

        const entry = {
            id: 'caf_' + Date.now(),
            time: new Date().toISOString(),
            beverage: id,
            caffeine_mg: mg
        };

        state.biohackLogs[todayStr].caffeine_entries.push(entry);
        saveStateToCache();

        try {
            await safeUpsert('biohack_logs', {
                user_id: state.currentUser?.id,
                date_key: todayStr,
                caffeine_entries: state.biohackLogs[todayStr].caffeine_entries,
                updated_at: new Date().toISOString()
            }, 'user_id, date_key');
        } catch (e) {
            console.warn("Caffeine save fallback:", e);
        }

        renderBioHacks();
        if (typeof window.showNotification === 'function') {
            window.showNotification(`Zapsáno +${mg} mg kofeinu! ☕⚡`, 'success');
        }
    };

    window.toggleFastingSession = () => {
        triggerHaptic('success');
        if (!state.activeFastingSession || !state.activeFastingSession.is_active) {
            state.activeFastingSession = {
                start_iso: new Date().toISOString(),
                target_hours: 16,
                is_active: true
            };
            if (typeof window.showNotification === 'function') {
                window.showNotification('Půst 16:8 zahájen! Hodně sil. 🔥', 'success');
            }
        } else {
            state.activeFastingSession.is_active = false;
            if (typeof window.showNotification === 'function') {
                window.showNotification('Půst byl úspěšně ukončen. 🍽️', 'info');
            }
        }
        saveStateToCache();
        renderBioHacks();
    };
}
