import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { ensureStepData } from '@core/loaders.js';
import { safeUpsert } from '@core/offline.js';
import { broadcastStepUpdate } from '@core/sync.js';
import { startLiveWalkSession, stopLiveWalkSession } from './livePedometer.js';
import { openStepWebhookModal } from './webhookIntegration.js';

let isLiveWalking = false;
const DAILY_STEP_GOAL = 10000;

/**
 * Hlavní renderovací funkce kanálu Krokoměr & Aktivita
 */
export async function renderStepTracker() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    await ensureStepData();

    const todayStr = getTodayKey();
    const todayLog = (state.stepLogs && state.stepLogs[todayStr]) || {
        steps_count: 0,
        distance_km: 0,
        active_kcal: 0,
        source: 'manual'
    };

    const currentSteps = todayLog.steps_count || 0;
    const progressPercent = Math.min(100, Math.round((currentSteps / DAILY_STEP_GOAL) * 100));
    const distanceKm = todayLog.distance_km || (currentSteps * 0.00075).toFixed(2);
    const calories = todayLog.active_kcal || Math.round(currentSteps * 0.04);

    // Calculate weekly history
    const past7Days = [];
    let totalWeeklySteps = 0;
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayLog = (state.stepLogs && state.stepLogs[key]) || { steps_count: 0 };
        const daySteps = dayLog.steps_count || 0;
        totalWeeklySteps += daySteps;
        past7Days.push({
            dateKey: key,
            dayName: d.toLocaleDateString('cs-CZ', { weekday: 'short' }),
            steps: daySteps,
            percent: Math.min(100, Math.round((daySteps / DAILY_STEP_GOAL) * 100))
        });
    }

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <!-- Header Bar -->
            <div class="bento-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <span class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
                        👟
                    </span>
                    <div>
                        <h2 class="text-base font-black text-white uppercase tracking-wider">Krokoměr & Denní Aktivita</h2>
                        <p class="text-xs text-gray-400">Live pedometr, denní cíle a párové výzvy</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        onclick="window.openStepWebhookModal()" 
                        class="px-3.5 py-2 rounded-xl bg-[#202225] hover:bg-[#282b30] text-gray-300 text-xs font-bold border border-white/5 transition flex items-center gap-1.5"
                    >
                        <i class="fas fa-bolt text-emerald-400"></i>
                        <span>Auto-Sync Setup</span>
                    </button>
                </div>
            </div>

            <!-- Main Daily Progress Hero -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <!-- Circular Progress Ring Card -->
                <div class="bento-card bento-card-steps md:col-span-2 flex flex-col justify-between space-y-5">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-black uppercase tracking-wider text-emerald-400">Dnešní cíl: 10 000 kroků</span>
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            ${progressPercent}% splněno
                        </span>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                        <!-- SVG Ring -->
                        <div class="relative w-44 h-44 flex items-center justify-center">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10" />
                                <circle 
                                    cx="60" cy="60" r="50" fill="none" 
                                    stroke="#10b981" 
                                    stroke-width="10" 
                                    stroke-linecap="round"
                                    stroke-dasharray="314.15" 
                                    stroke-dashoffset="${314.15 * (1 - progressPercent / 100)}"
                                    class="progress-ring-circle"
                                />
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span class="text-3xl font-black text-white" id="step-hero-count">${currentSteps.toLocaleString('cs-CZ')}</span>
                                <span class="text-[11px] font-bold text-gray-400">kroků dnes</span>
                            </div>
                        </div>

                        <!-- Metric highlights -->
                        <div class="space-y-3 flex-1 w-full">
                            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-route text-emerald-400 text-xs"></i>
                                    <span class="text-xs font-semibold text-gray-300">Vzdálenost:</span>
                                </div>
                                <span class="text-xs font-bold text-white"><strong class="text-emerald-300">${distanceKm}</strong> km</span>
                            </div>

                            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-fire text-amber-400 text-xs"></i>
                                    <span class="text-xs font-semibold text-gray-300">Aktivní kalorie:</span>
                                </div>
                                <span class="text-xs font-bold text-white"><strong class="text-amber-300">${calories}</strong> kcal</span>
                            </div>

                            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-clock text-blue-400 text-xs"></i>
                                    <span class="text-xs font-semibold text-gray-300">Aktivní čas chůze:</span>
                                </div>
                                <span class="text-xs font-bold text-white">~${Math.round(currentSteps / 100)} min</span>
                            </div>
                        </div>
                    </div>

                    <!-- 1-Tap Quick Step Adders -->
                    <div class="space-y-2 pt-2 border-t border-white/5">
                        <span class="text-[10px] font-black uppercase tracking-wider text-gray-400">1-Klikové rychlé přidání kroků:</span>
                        <div class="grid grid-cols-5 gap-1.5">
                            ${[
                                { label: '+1k', val: 1000 },
                                { label: '+2.5k', val: 2500 },
                                { label: '+5k', val: 5000 },
                                { label: '+8k', val: 8000 },
                                { label: '+10k', val: 10000 }
                            ].map(btn => `
                                <button 
                                    onclick="window.quickAddSteps(${btn.val})" 
                                    class="py-2 px-1 rounded-xl bg-[#202225] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/5 text-xs font-black text-emerald-300 transition active:scale-95 text-center"
                                >
                                    ${btn.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Right: Live Walk Tracker Box -->
                <div class="bento-card flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-xs font-black text-emerald-400">
                            <i class="fas fa-person-walking"></i>
                            <span>Live Walk Session</span>
                        </div>
                        <h3 class="text-sm font-black text-white">Aktivní měření chůze</h3>
                        <p class="text-xs text-gray-400 leading-relaxed">
                            Spusť měření během procházky. Webový senzor počítá otřesy v reálném čase se zapnutým displejem.
                        </p>
                    </div>

                    <div id="live-walk-panel" class="p-4 bg-[#202225] rounded-xl border border-white/5 text-center space-y-2">
                        <span class="text-2xl font-black text-white block" id="live-walk-counter">0</span>
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block" id="live-walk-status">Připraveno</span>
                    </div>

                    <button 
                        id="live-walk-toggle-btn"
                        onclick="window.toggleLiveWalkSession()" 
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i class="fas fa-play"></i>
                        <span id="live-walk-btn-text">Zahájit procházku</span>
                    </button>
                </div>
            </div>

            <!-- Weekly Consistency Chart -->
            <div class="bento-card space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Týdenní konzistence</h3>
                        <p class="text-xs text-gray-400">Celkem tento týden: <strong class="text-emerald-300">${totalWeeklySteps.toLocaleString('cs-CZ')}</strong> kroků (${(totalWeeklySteps * 0.00075).toFixed(1)} km)</p>
                    </div>
                </div>

                <div class="grid grid-cols-7 gap-2 pt-4 items-end h-40">
                    ${past7Days.map(d => `
                        <div class="flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span class="text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition">${d.steps}</span>
                            <div class="w-full bg-[#202225] rounded-lg h-28 overflow-hidden relative flex items-end">
                                <div 
                                    class="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-lg transition-all duration-500" 
                                    style="height: ${Math.max(8, d.percent)}%;"
                                ></div>
                            </div>
                            <span class="text-[10px] font-bold ${d.dateKey === todayStr ? 'text-emerald-300 font-black' : 'text-gray-400'}">${d.dayName}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Global actions
if (typeof window !== 'undefined') {
    window.renderStepTracker = renderStepTracker;

    window.quickAddSteps = async (amount) => {
        triggerHaptic('success');
        const todayStr = getTodayKey();
        if (!state.stepLogs) state.stepLogs = {};

        const current = state.stepLogs[todayStr] || { steps_count: 0, distance_km: 0, active_kcal: 0 };
        const newCount = (current.steps_count || 0) + amount;
        const newKm = parseFloat((newCount * 0.00075).toFixed(2));
        const newKcal = Math.round(newCount * 0.04);

        const newLog = {
            user_id: state.currentUser?.id,
            date_key: todayStr,
            steps_count: newCount,
            distance_km: newKm,
            active_kcal: newKcal,
            source: 'manual',
            updated_at: new Date().toISOString()
        };

        state.stepLogs[todayStr] = newLog;
        saveStateToCache();

        try {
            await safeUpsert('activity_step_logs', newLog, 'user_id, date_key');
        } catch (e) {
            console.warn("Step save fallback:", e);
        }

        broadcastStepUpdate(newLog);
        renderStepTracker();
    };

    window.toggleLiveWalkSession = async () => {
        const btn = document.getElementById('live-walk-toggle-btn');
        const btnText = document.getElementById('live-walk-btn-text');
        const counter = document.getElementById('live-walk-counter');
        const status = document.getElementById('live-walk-status');

        if (!isLiveWalking) {
            const started = await startLiveWalkSession((data) => {
                if (counter) counter.innerText = data.steps;
                if (status) status.innerText = `Čas: ${Math.floor(data.elapsedSeconds / 60)}m ${data.elapsedSeconds % 60}s • ${data.distanceKm} km`;
            });

            if (started) {
                isLiveWalking = true;
                if (btn) btn.className = 'w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs shadow-lg shadow-red-500/25 transition flex items-center justify-center gap-2';
                if (btnText) btnText.innerText = 'Ukončit & Uložit procházku';
            }
        } else {
            const result = stopLiveWalkSession();
            isLiveWalking = false;
            if (btn) btn.className = 'w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2';
            if (btnText) btnText.innerText = 'Zahájit procházku';

            if (result.steps > 0) {
                await window.quickAddSteps(result.steps);
                if (typeof window.showNotification === 'function') {
                    window.showNotification(`Skvělá procházka! Uloženo ${result.steps} kroků (${result.distanceKm} km). 👟✨`, 'success');
                }
            }
        }
    };
}
