import { state } from '@core/state.js';
import { isJosef, isKlarka } from '@core/auth.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { ensureCycleData } from '@core/loaders.js';
import { calculateCurrentCycleState, CYCLE_PHASES } from './cycleEngine.js';
import { renderPartnerCycleCard } from './partnerView.js';
import { openCycleLogModal } from './modals.js';

let activeUserKey = isKlarka() ? 'klarka' : 'josef';

/**
 * Hlavní renderovací funkce kanálu Menstruační Cyklus
 */
export async function renderCycleTracker() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    await ensureCycleData();

    const todayStr = getTodayKey();
    const cycleState = calculateCurrentCycleState(new Date(), state.cycleLogs, state.cycleSettings);
    const isOwner = isKlarka(); // Klárka je primární vlastník cyklu

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <!-- Header Bar -->
            <div class="bento-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-lg shadow-pink-500/20">
                        🌸
                    </span>
                    <div>
                        <h2 class="text-base font-black text-white uppercase tracking-wider">Menstruační Cyklus & Fáze</h2>
                        <p class="text-xs text-gray-400">Predikce fází, cycle-synced trénink a intimní párová synchronizace</p>
                    </div>
                </div>

                <!-- Quick Action Buttons -->
                <div class="flex items-center gap-2">
                    ${isOwner ? `
                    <button 
                        onclick="window.openCycleLogModal('${todayStr}')" 
                        class="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition active:scale-95 flex items-center gap-1.5"
                    >
                        <i class="fas fa-plus"></i>
                        <span>Zapsat dnešek</span>
                    </button>
                    ` : `
                    <span class="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#202225] text-pink-300 border border-white/5">
                        Párový režim 💖
                    </span>
                    `}
                </div>
            </div>

            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <!-- Left: Circular Phase Wheel Hero -->
                <div class="bento-card bento-card-cycle md:col-span-2 flex flex-col justify-between space-y-5">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${cycleState.phase.icon}</span>
                            <span class="text-xs font-black uppercase tracking-wider text-pink-400">Aktuální fáze</span>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${cycleState.phase.themeClass}">
                            ${cycleState.phase.name}
                        </span>
                    </div>

                    <!-- Progress Circular Display -->
                    <div class="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                        <div class="relative w-40 h-40 flex items-center justify-center">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10" />
                                <circle 
                                    cx="60" cy="60" r="50" fill="none" 
                                    stroke="${cycleState.phase.color}" 
                                    stroke-width="10" 
                                    stroke-linecap="round"
                                    stroke-dasharray="314.15" 
                                    stroke-dashoffset="${314.15 * (1 - cycleState.progressPercent / 100)}"
                                    class="progress-ring-circle"
                                />
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span class="text-[11px] font-black uppercase text-gray-400">Den</span>
                                <span class="text-3xl font-black text-white">${cycleState.dayOfCycle}</span>
                                <span class="text-[10px] text-gray-400">z ${cycleState.totalCycleLength} dní</span>
                            </div>
                        </div>

                        <!-- Highlights list -->
                        <div class="space-y-3 flex-1">
                            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
                                <span class="text-xs font-semibold text-gray-400">Příští menstruace:</span>
                                <span class="text-xs font-bold text-white">za <strong class="text-pink-400">${cycleState.daysUntilNextPeriod}</strong> dní</span>
                            </div>
                            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
                                <span class="text-xs font-semibold text-gray-400">Ovulace:</span>
                                <span class="text-xs font-bold ${cycleState.isFertileWindow ? 'text-purple-400' : 'text-gray-300'}">
                                    ${cycleState.isFertileWindow ? '✨ Plodné okno aktivní' : `Den ${cycleState.ovulationDay}`}
                                </span>
                            </div>
                            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
                                <span class="text-xs font-semibold text-gray-400">Průměrný cyklus:</span>
                                <span class="text-xs font-bold text-gray-300">${cycleState.totalCycleLength} dní</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Partner View or Quick Insights -->
                <div class="md:col-span-1">
                    ${!isOwner ? renderPartnerCycleCard(cycleState, state.cycleSettings) : `
                    <div class="bento-card space-y-4 h-full flex flex-col justify-between">
                        <div class="space-y-2">
                            <div class="flex items-center gap-2 text-xs font-black text-pink-400">
                                <i class="fas fa-sparkles"></i>
                                <span>Doporučení pro dnešek</span>
                            </div>
                            <h4 class="text-sm font-black text-white">${cycleState.phase.energy}</h4>
                            <p class="text-xs text-gray-300 leading-relaxed">${cycleState.phase.workout}</p>
                        </div>

                        <div class="p-3.5 bg-gradient-to-r from-pink-950/30 to-purple-950/30 rounded-xl border border-pink-500/20">
                            <span class="text-[10px] font-black uppercase text-pink-400 block mb-1">🥗 Výživa v této fázi</span>
                            <p class="text-xs text-gray-200">${cycleState.phase.nutrition}</p>
                        </div>
                    </div>
                    `}
                </div>
            </div>

            <!-- Cycle-Synced Guide Sections (Trénink, Výživa, Psychika) -->
            <div class="space-y-3">
                <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-brain text-pink-400"></i>
                    <span>Cycle-Synced Fitness & Životní styl</span>
                </h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${Object.values(CYCLE_PHASES).map(p => `
                        <div class="bento-card space-y-2.5 ${cycleState.phase.id === p.id ? 'border-pink-500/50 bg-pink-950/10 shadow-lg shadow-pink-500/10' : ''}">
                            <div class="flex items-center justify-between">
                                <span class="text-xl">${p.icon}</span>
                                ${cycleState.phase.id === p.id ? '<span class="text-[9px] font-black bg-pink-500 text-white px-2 py-0.5 rounded-full uppercase">Právě teď</span>' : ''}
                            </div>
                            <h4 class="text-xs font-black text-white">${p.name}</h4>
                            <p class="text-[11px] text-gray-400">${p.energy}</p>
                            <div class="pt-2 border-t border-white/5 text-[11px] text-gray-300 space-y-1">
                                <p><strong>🏋️ Trénink:</strong> ${p.workout}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Global hook
if (typeof window !== 'undefined') {
    window.renderCycleTracker = renderCycleTracker;
    window.openCycleLogModal = openCycleLogModal;
}
