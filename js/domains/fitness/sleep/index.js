import { state } from '@core/state.js';
import { getTodayKey, triggerHaptic } from '@core/utils.js';
import { ensureSleepData } from '@core/loaders.js';
import { 
    calculateSleepDebt, 
    calculateSleepCycles, 
    analyzePairSleepSynergy,
    SLEEP_TAGS 
} from './sleepEngine.js';
import { openSleepLogModal } from './modals.js';

let cycleCalcMode = 'wakeTime'; // 'wakeTime' | 'sleepNow'
let desiredWakeTime = '06:30';

/**
 * Hlavní renderovací funkce modulu Spánek & Architektura snů
 */
export async function renderSleepTracker() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    await ensureSleepData();

    const todayStr = getTodayKey();
    const todayLog = (state.sleepLogs && state.sleepLogs[todayStr]) || {
        sleep_duration_hours: 7.8,
        time_in_bed_hours: 8.5,
        sleep_efficiency: 92,
        latency_minutes: 15,
        restfulness_score: 4,
        slept_together: true,
        sleep_tags: ['hot_shower', 'cold_room'],
        dream_note: ''
    };

    const sleepDebt = calculateSleepDebt(state.sleepLogs, 8.0);
    const pairSynergy = analyzePairSleepSynergy(state.sleepLogs);

    // 90-minute cycle calculation
    const cycleSuggestions = calculateSleepCycles(
        cycleCalcMode === 'wakeTime' 
            ? { wakeTime: desiredWakeTime, latencyMinutes: 15 }
            : { sleepNow: true, latencyMinutes: 15 }
    );

    // 7-day sleep history
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const log = (state.sleepLogs && state.sleepLogs[key]) || { sleep_duration_hours: 7.5, sleep_efficiency: 88 };
        const hours = parseFloat(log.sleep_duration_hours) || 7.5;
        past7Days.push({
            dateKey: key,
            dayName: d.toLocaleDateString('cs-CZ', { weekday: 'short' }),
            hours: hours,
            efficiency: log.sleep_efficiency || 88,
            percent: Math.min(100, Math.round((hours / 9.0) * 100))
        });
    }

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <!-- Header Bar -->
            <div class="bento-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
                        🌙
                    </span>
                    <div>
                        <h2 class="text-base font-black text-white uppercase tracking-wider">Spánek & Spánková Architektura</h2>
                        <p class="text-xs text-gray-400">Efektivita, spánkový dluh, 90min cykly a párová synergie</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        onclick="window.openSleepLogModal('${todayStr}')" 
                        class="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95 flex items-center gap-1.5"
                    >
                        <i class="fas fa-plus"></i>
                        <span>Zapsat dnešní noc</span>
                    </button>
                </div>
            </div>

            <!-- Hero Bento Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- 1. Délka spánku -->
                <div class="bento-card space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase text-blue-400">Délka spánku</span>
                        <span class="text-xs">⏱️</span>
                    </div>
                    <span class="text-3xl font-black text-white">${todayLog.sleep_duration_hours || 7.8} <span class="text-xs font-normal text-gray-400">hod</span></span>
                    <span class="text-[11px] text-gray-400 block">V posteli: ${todayLog.time_in_bed_hours || 8.5}h</span>
                </div>

                <!-- 2. Spánková efektivita -->
                <div class="bento-card space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase text-emerald-400">Spánková efektivita</span>
                        <span class="text-xs">🎯</span>
                    </div>
                    <span class="text-3xl font-black text-emerald-400">${todayLog.sleep_efficiency || 92}%</span>
                    <span class="text-[11px] text-gray-400 block">${(todayLog.sleep_efficiency || 92) >= 85 ? '✨ Výborná konsolidace' : '⚠️ Neklidný spánek'}</span>
                </div>

                <!-- 3. Spánkový dluh -->
                <div class="bento-card space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase ${sleepDebt > 0 ? 'text-amber-400' : 'text-emerald-400'}">Spánkový dluh (7d)</span>
                        <span class="text-xs">📉</span>
                    </div>
                    <span class="text-3xl font-black ${sleepDebt > 0 ? 'text-amber-400' : 'text-emerald-400'}">${sleepDebt > 0 ? `+${sleepDebt}` : sleepDebt} <span class="text-xs font-normal text-gray-400">hod</span></span>
                    <span class="text-[11px] text-gray-400 block">${sleepDebt > 2 ? '⚠️ Doporučujeme dospat' : '🌿 Optimální stav'}</span>
                </div>

                <!-- 4. Ranní svěžest -->
                <div class="bento-card space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase text-purple-400">Ranní svěžest</span>
                        <span class="text-xs">✨</span>
                    </div>
                    <span class="text-3xl font-black text-purple-300">${todayLog.restfulness_score || 4} <span class="text-xs font-normal text-gray-400">/ 5</span></span>
                    <span class="text-[11px] text-gray-400 block">${todayLog.slept_together ? '❤️ Společný spánek' : '🏫 Solo na koleji'}</span>
                </div>
            </div>

            <!-- 90-Minute Cycle Calculator & Pair Synergy -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <!-- 90-Minute Calculator Card -->
                <div class="bento-card space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">🔮</span>
                            <h3 class="text-xs font-black uppercase tracking-wider text-blue-400">Kalkulačka 90min Cyklů</h3>
                        </div>
                        <div class="flex p-0.5 bg-[#202225] rounded-lg border border-white/5 text-[10px]">
                            <button 
                                onclick="window.switchCycleCalcMode('wakeTime')" 
                                class="px-2 py-1 rounded-md font-bold transition ${cycleCalcMode === 'wakeTime' ? 'bg-blue-500 text-white' : 'text-gray-400'}"
                            >
                                Budík v...
                            </button>
                            <button 
                                onclick="window.switchCycleCalcMode('sleepNow')" 
                                class="px-2 py-1 rounded-md font-bold transition ${cycleCalcMode === 'sleepNow' ? 'bg-blue-500 text-white' : 'text-gray-400'}"
                            >
                                Spát teď
                            </button>
                        </div>
                    </div>

                    ${cycleCalcMode === 'wakeTime' ? `
                    <div class="flex items-center justify-between p-3 bg-[#202225] rounded-xl border border-white/5">
                        <span class="text-xs font-bold text-gray-300">Zadej čas ranního budíku:</span>
                        <input 
                            type="time" 
                            value="${desiredWakeTime}" 
                            onchange="window.setDesiredWakeTime(this.value)"
                            class="bg-[#18191c] text-white font-black text-xs px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none"
                        >
                    </div>
                    ` : `
                    <p class="text-xs text-gray-400 leading-relaxed">
                        Pokud zhasneš světla právě teď (+15 minut na usnutí), probuď se v těchto časech pro maximální svěžest bez spánkové setrvačnosti:
                    </p>
                    `}

                    <!-- Suggestions list -->
                    <div class="space-y-2">
                        ${cycleSuggestions.map(cs => `
                            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between text-xs">
                                <div>
                                    <span class="font-black text-white text-sm block">${cs.timeStr}</span>
                                    <span class="text-[10px] text-gray-400">${cs.label}</span>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${cs.cycles >= 5 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'}">
                                    ${cs.quality}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Pair Sleep Synergy Card -->
                <div class="bento-card space-y-4 flex flex-col justify-between">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-xs font-black text-pink-400">
                            <i class="fas fa-heart"></i>
                            <span>Párová Spánková Synergie</span>
                        </div>
                        <h3 class="text-sm font-black text-white">Společný spánek vs. Solo</h3>
                        <p class="text-xs text-gray-400 leading-relaxed">
                            Analýza kvality regenerace a délky spánku, když jste spolu v posteli vs. každý sám na kolejích.
                        </p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3.5 bg-gradient-to-br from-pink-950/30 to-[#202225] rounded-xl border border-pink-500/20 space-y-1">
                            <span class="text-[10px] font-black uppercase text-pink-400 block">Když spíme spolu ❤️</span>
                            <span class="text-xl font-black text-white">${pairSynergy.avgDurationTogether} <span class="text-xs font-normal">hod</span></span>
                            <span class="text-[10px] text-gray-300 block">Svěžest: <strong>${pairSynergy.avgRestfulnessTogether} / 5</strong></span>
                        </div>

                        <div class="p-3.5 bg-[#202225] rounded-xl border border-white/5 space-y-1">
                            <span class="text-[10px] font-black uppercase text-gray-400 block">Když spíme solo 🏫</span>
                            <span class="text-xl font-black text-white">${pairSynergy.avgDurationSolo} <span class="text-xs font-normal">hod</span></span>
                            <span class="text-[10px] text-gray-300 block">Svěžest: <strong>${pairSynergy.avgRestfulnessSolo} / 5</strong></span>
                        </div>
                    </div>

                    <div class="p-3 bg-[#202225] rounded-xl border border-white/5 text-xs text-gray-300 text-center">
                        Společně spíte v průměru o <strong class="text-pink-400">+${pairSynergy.diffHours} hodiny déle</strong> s vyšší regenerací! 🫀✨
                    </div>
                </div>
            </div>

            <!-- Weekly Consistency Bar Chart -->
            <div class="bento-card space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Týdenní spánková konzistence</h3>
                        <p class="text-xs text-gray-400">Cíl: 8.0 hod / noc</p>
                    </div>
                </div>

                <div class="grid grid-cols-7 gap-2 pt-4 items-end h-40">
                    ${past7Days.map(d => `
                        <div class="flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span class="text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition">${d.hours}h</span>
                            <div class="w-full bg-[#202225] rounded-lg h-28 overflow-hidden relative flex items-end">
                                <div 
                                    class="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-lg transition-all duration-500" 
                                    style="height: ${Math.max(10, d.percent)}%;"
                                ></div>
                            </div>
                            <span class="text-[10px] font-bold ${d.dateKey === todayStr ? 'text-blue-300 font-black' : 'text-gray-400'}">${d.dayName}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Global actions
if (typeof window !== 'undefined') {
    window.renderSleepTracker = renderSleepTracker;

    window.switchCycleCalcMode = (mode) => {
        triggerHaptic('light');
        cycleCalcMode = mode;
        renderSleepTracker();
    };

    window.setDesiredWakeTime = (time) => {
        desiredWakeTime = time;
        renderSleepTracker();
    };
}
