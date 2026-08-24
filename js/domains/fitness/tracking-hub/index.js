import { state } from '@core/state.js';
import { isKlarka, isJosef } from '@core/auth.js';
import { getTodayKey, triggerHaptic } from '@core/utils.js';
import { ensureCycleData, ensureStepData, ensureBiohacksData, ensureNutritionData } from '@core/loaders.js';
import { calculateCurrentCycleState } from '@domains/fitness/cycle/cycleEngine.js';
import { renderPartnerCycleCard } from '@domains/fitness/cycle/partnerView.js';
import { calculateBloodCaffeine, calculateSleepCutoffTime } from '../biohacks/caffeineTracker.js';
import { calculateFastingProgress } from '../biohacks/fastingTimer.js';
import { calculateDailyRecoveryScore } from '../biohacks/recoveryScore.js';
import { generateCrossMetricInsights } from './correlationEngine.js';
import { initQuickLogDrawer } from './quickLogDrawer.js';

/**
 * Hlavní renderovací funkce pro Master Tracking Ecosystem Hub
 */
export async function renderTrackingHub() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    // Zajisti načtení všech relevantních dat
    await Promise.all([
        ensureCycleData(),
        ensureStepData(),
        ensureBiohacksData(),
        ensureNutritionData()
    ]);

    // Inicializuj globální 1-Tap FAB
    initQuickLogDrawer();

    const todayStr = getTodayKey();
    const isFemale = isKlarka();

    // 1. Cycle state
    const cycleState = calculateCurrentCycleState(new Date(), state.cycleLogs, state.cycleSettings);

    // 2. Steps state
    const stepLog = (state.stepLogs && state.stepLogs[todayStr]) || { steps_count: 0, distance_km: 0, active_kcal: 0 };
    const currentSteps = stepLog.steps_count || 0;
    const stepProgress = Math.min(100, Math.round((currentSteps / 10000) * 100));

    // 3. BioHacks (Caffeine, Fasting, Recovery)
    const bioLog = (state.biohackLogs && state.biohackLogs[todayStr]) || { caffeine_entries: [] };
    const bloodCaffeine = calculateBloodCaffeine(bioLog.caffeine_entries || [], new Date());
    const sleepCutoff = calculateSleepCutoffTime(23);
    const fasting = calculateFastingProgress(state.activeFastingSession);
    const recovery = calculateDailyRecoveryScore();

    // 4. Hydration state
    const health = (state.healthData && state.healthData[todayStr]) || {};
    const waterLevel = health.water || 0;

    // 5. Cross-Metric Insights
    const insights = generateCrossMetricInsights();

    container.innerHTML = `
        <div class="max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <!-- Header Bar -->
            <div class="bento-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5865f2] via-[#8b5cf6] to-[#ec4899] text-white flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
                        ⚡
                    </span>
                    <div>
                        <h2 class="text-base font-black text-white uppercase tracking-wider">All-in-One Tracking Ecosystem</h2>
                        <p class="text-xs text-gray-400">Kompletní prémiový biometrický a lifestylový hub bez předplatných</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        onclick="window.openQuickLogDrawer()" 
                        class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5865f2] to-[#ec4899] text-white text-xs font-black shadow-lg shadow-pink-500/20 hover:opacity-95 transition active:scale-95 flex items-center gap-1.5"
                    >
                        <i class="fas fa-plus"></i>
                        <span>1-Tap Quick Log</span>
                    </button>
                </div>
            </div>

            <!-- Master Bento Grid -->
            <div class="tracking-bento-grid">
                <!-- 1. Recovery Index Card -->
                <div class="bento-card bento-card-recovery flex flex-col justify-between space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">⚡</span>
                            <span class="text-[11px] font-black uppercase text-purple-400">Recovery Score</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${recovery.themeClass}">
                            ${recovery.statusLabel}
                        </span>
                    </div>

                    <div class="flex items-center justify-between py-1">
                        <div>
                            <span class="text-3xl font-black text-white">${recovery.score}%</span>
                            <p class="text-[11px] text-gray-400 mt-0.5">${recovery.directive.slice(0, 55)}...</p>
                        </div>
                        <div class="w-12 h-12 rounded-full border-4 ${recovery.category === 'green' ? 'border-emerald-500' : (recovery.category === 'yellow' ? 'border-amber-500' : 'border-red-500')} flex items-center justify-center font-black text-xs text-white">
                            ${recovery.score}
                        </div>
                    </div>
                </div>

                <!-- 2. Menstruační Cyklus (nebo Párový režim) -->
                <div class="bento-card bento-card-cycle flex flex-col justify-between space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">${cycleState.phase.icon}</span>
                            <span class="text-[11px] font-black uppercase text-pink-400">
                                ${isFemale ? 'Cyklus & Fáze' : 'Párový Cyklus • Klárka'}
                            </span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${cycleState.phase.themeClass}">
                            ${cycleState.phase.name}
                        </span>
                    </div>

                    <div class="py-1">
                        <div class="flex items-baseline gap-1.5">
                            <span class="text-2xl font-black text-white">Den ${cycleState.dayOfCycle}</span>
                            <span class="text-xs text-gray-400">z ${cycleState.totalCycleLength} dní</span>
                        </div>
                        <p class="text-[11px] text-gray-300 mt-1">${cycleState.phase.energy}</p>
                    </div>
                </div>

                <!-- 3. Krokoměr & Aktivita -->
                <div class="bento-card bento-card-steps flex flex-col justify-between space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">👟</span>
                            <span class="text-[11px] font-black uppercase text-emerald-400">Kroky Dnes</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            ${stepProgress}%
                        </span>
                    </div>

                    <div class="flex items-center justify-between py-1">
                        <div>
                            <span class="text-2xl font-black text-white">${currentSteps.toLocaleString('cs-CZ')}</span>
                            <span class="text-xs text-gray-400 block">${(currentSteps * 0.00075).toFixed(1)} km • ${Math.round(currentSteps * 0.04)} kcal</span>
                        </div>
                        <div class="flex gap-1">
                            <button onclick="window.quickAddSteps(1000)" class="px-2 py-1 bg-[#202225] hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold border border-white/5 transition">
                                +1k
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 4. Kofeinová Křivka -->
                <div class="bento-card bento-card-caffeine flex flex-col justify-between space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">☕</span>
                            <span class="text-[11px] font-black uppercase text-amber-400">Kofein v krvi</span>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400">
                            Cutoff: <strong class="text-white">${sleepCutoff}</strong>
                        </span>
                    </div>

                    <div class="py-1">
                        <span class="text-2xl font-black text-amber-400">${bloodCaffeine} <span class="text-xs font-normal">mg</span></span>
                        <p class="text-[11px] text-gray-400 mt-1">
                            ${bloodCaffeine > 50 ? '⚡ Aktivní stimulace' : '🌿 Nízká hladina'}
                        </p>
                    </div>
                </div>

                <!-- 5. Fasting Timer -->
                <div class="bento-card bento-card-fasting flex flex-col justify-between space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">⏳</span>
                            <span class="text-[11px] font-black uppercase text-orange-400">Půst (16:8)</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${fasting.isActive ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-gray-500/10 text-gray-400'}">
                            ${fasting.isActive ? 'Běží' : 'Neaktivní'}
                        </span>
                    </div>

                    <div class="py-1">
                        <span class="text-2xl font-black text-white">${fasting.isActive ? `${fasting.hours}h ${fasting.minutes}m` : 'Připraven'}</span>
                        <p class="text-[11px] text-gray-400 mt-1">${fasting.isActive ? fasting.stage.label : 'Začni 16:8 půst'}</p>
                    </div>
                </div>

                <!-- 6. Hydratace -->
                <div class="bento-card flex flex-col justify-between space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">💧</span>
                            <span class="text-[11px] font-black uppercase text-cyan-400">Hydratace</span>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400">${(waterLevel * 0.75).toFixed(1)} / 3.0 L</span>
                    </div>

                    <div class="flex items-center justify-between py-1">
                        <div class="flex gap-1.5">
                            ${[1, 2, 3, 4].map(idx => `
                                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition ${idx <= waterLevel ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30' : 'bg-[#202225] text-gray-500 border border-white/5'}">
                                    💧
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cross-Metric Intelligence Section -->
            <div class="bento-card space-y-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🧠</span>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Křížové Korelace & Data Intelligence</h3>
                    </div>
                    <span class="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/30">
                        Propojený ekosystém
                    </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    ${insights.map(ins => `
                        <div class="p-3.5 bg-[#202225] rounded-xl border border-white/5 space-y-1.5 hover:border-white/15 transition">
                            <div class="flex items-center gap-2">
                                <span class="text-base">${ins.icon}</span>
                                <h4 class="text-xs font-black text-white">${ins.title}</h4>
                            </div>
                            <p class="text-[11px] text-gray-300 leading-relaxed">${ins.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

if (typeof window !== 'undefined') {
    window.renderTrackingHub = renderTrackingHub;
}
