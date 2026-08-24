import { triggerHaptic } from '@core/utils.js';
import { playBeep, playChime, playArcade } from '@core/sound.js';
import { showNotification } from '@core/theme.js';
import {
    activeWorkout,
    saveActiveWorkoutToStorage,
    restTimeDuration,
    setRestTimeDuration,
    restTimeRemaining,
    setRestTimeRemaining,
    isRestTimerRunning,
    setIsRestTimerRunning,
    restTimerInterval,
    setRestTimerInterval,
    tickRestTimer,
    setRestStartedAt
} from '../shared.js';

export function setRestDuration(seconds, renderGymFn) {
    triggerHaptic('light');
    setRestTimeDuration(seconds);
    if (!isRestTimerRunning) {
        setRestTimeRemaining(seconds);
    }
    saveActiveWorkoutToStorage();

    // DOM-only update: update duration button highlights and goal label
    [60, 90, 120].forEach(s => {
        const btn = document.getElementById(`rdur-${s}`);
        if (!btn) return;
        if (isRestTimerRunning) {
            btn.className = `px-2 py-0.5 rounded text-[8px] font-bold ${s === seconds ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}`;
        } else {
            btn.className = `px-2 py-1 rounded-lg text-[9px] font-bold transition ${s === seconds ? 'bg-[#faa61a] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`;
        }
    });
    const goalEl = document.getElementById('rest-timer-goal');
    if (goalEl) goalEl.textContent = `cíl ${seconds}s`;

    // If timer isn't running, DOM patch won't show the ring – no re-render needed
    // If timer IS running and render needed for countdown update, tickRestTimer handles it
}

export function startRestTimer(renderGymFn) {
    setRestTimeRemaining(restTimeDuration);
    setIsRestTimerRunning(true);
    setRestStartedAt(Date.now());
    saveActiveWorkoutToStorage();

    import('@core/sync.js').then(s => {
        s.broadcastGymRestSync?.({ duration: restTimeDuration, startedAt: Date.now() });
    });

    if (restTimerInterval) clearInterval(restTimerInterval);
    setRestTimerInterval(setInterval(() => tickRestTimer(renderGymFn), 1000));
}

// Attach Gym Cheering Overlay Listener
if (typeof window !== 'undefined' && !window.__gymCheerOverlayAttached) {
    window.__gymCheerOverlayAttached = true;
    window.addEventListener('gym-cheer-overlay', (e) => {
        const banner = document.createElement('div');
        banner.className = 'fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center animate-fade-in select-none';
        banner.innerHTML = `
            <div class="p-6 rounded-3xl bg-gradient-to-r from-red-600/90 via-orange-600/90 to-amber-600/90 border-2 border-yellow-400/80 text-center shadow-2xl backdrop-blur-xl transform animate-bounce">
                <div class="text-5xl drop-shadow-md">🔥💪🔥</div>
                <h2 class="text-xl font-black text-white uppercase tracking-wider mt-2 font-mono drop-shadow">+100% SÍLA DO SÉRIE!</h2>
                <p class="text-xs text-yellow-200 font-bold mt-1">${e.detail?.name || 'Partner'} ti právě zafandil/a!</p>
            </div>
        `;
        document.body.appendChild(banner);
        setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transition = 'opacity 0.5s ease';
            setTimeout(() => banner.remove(), 500);
        }, 2500);
    });
}


export function toggleRestTimer(renderGymFn) {
    triggerHaptic('light');
    if (isRestTimerRunning) {
        clearInterval(restTimerInterval);
        setRestTimerInterval(null);
        setIsRestTimerRunning(false);
        setRestStartedAt(null);
    } else {
        if (restTimeRemaining <= 0) {
            setRestTimeRemaining(restTimeDuration);
        }
        setIsRestTimerRunning(true);
        const elapsedSec = Math.max(0, (restTimeDuration || 90) - (restTimeRemaining || 0));
        setRestStartedAt(Date.now() - (elapsedSec * 1000));
        if (restTimerInterval) clearInterval(restTimerInterval);
        setRestTimerInterval(setInterval(() => tickRestTimer(renderGymFn), 1000));
    }
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
}

export function resetRestTimer(renderGymFn) {
    triggerHaptic('medium');
    clearInterval(restTimerInterval);
    setRestTimerInterval(null);
    setIsRestTimerRunning(false);
    setRestStartedAt(null);
    setRestTimeRemaining(restTimeDuration);
    saveActiveWorkoutToStorage();

    // Replace expanded timer card with minimized chip (no full re-render)
    const card = document.getElementById('rest-timer-card');
    if (card) {
        card.outerHTML = `
            <div id="rest-timer-card" class="flex items-center justify-between gap-3 bg-black/30 border border-white/5 rounded-2xl px-4 py-2.5 max-w-sm mx-auto select-none">
                <div class="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-amber-400 transition" onclick="window.Gym.openRestModeOverlay()" title="Otevřít REST MODE">
                    <i class="fas fa-hourglass-half text-xs"></i>
                    <span class="text-[10px] font-black uppercase tracking-wider">Odpočinek</span>
                </div>
                <div class="flex items-center gap-1.5">
                    ${[60, 90, 120].map(s => `<button onclick="window.Gym.setRestDuration(${s})" id="rdur-${s}" class="px-2 py-1 rounded-lg text-[9px] font-bold transition ${s === restTimeDuration ? 'bg-[#faa61a] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}">${s}s</button>`).join('')}
                </div>
                <button onclick="window.Gym.startRestTimer()" class="px-3 py-1.5 rounded-xl bg-[#3ba55c]/20 hover:bg-[#3ba55c]/30 text-[#3ba55c] border border-[#3ba55c]/30 text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5">
                    <i class="fas fa-play text-[9px]"></i> Start
                </button>
            </div>
        `;
    }
}

/**
 * Opens Fullscreen REST MODE Overlay during active workout.
 */
export function openRestModeOverlay() {
    triggerHaptic('medium');
    document.getElementById('fullscreen-rest-overlay')?.remove();

    if (!isRestTimerRunning) {
        startRestTimer();
    }

    const restMinutes = Math.floor(restTimeRemaining / 60);
    const restSeconds = restTimeRemaining % 60;
    const fsOffset = restTimeDuration > 0 ? 565.48 * (1 - restTimeRemaining / restTimeDuration) : 0;
    const activeColor = restTimeRemaining <= 10 ? '#faa61a' : '#3ba55c';

    // Find current active exercise / last completed set info
    let lastExName = activeWorkout?.name || 'Trénink';
    let lastSetInfo = '';
    if (activeWorkout) {
        for (let i = activeWorkout.exercises.length - 1; i >= 0; i--) {
            const ex = activeWorkout.exercises[i];
            const completedSets = ex.sets.filter(s => s.completed);
            if (completedSets.length > 0) {
                lastExName = ex.name || 'Cvik';
                const lastSet = completedSets[completedSets.length - 1];
                lastSetInfo = `Série ${completedSets.length}/${ex.sets.length} • ${lastSet.weight} kg × ${lastSet.reps} rep ✓`;
                break;
            }
        }
    }

    const overlayHtml = `
        <div id="fullscreen-rest-overlay" class="fixed inset-0 z-50 bg-[#16171a]/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 select-none animate-fade-in text-center font-sans">
            <!-- Header -->
            <div class="flex items-center justify-between w-full max-w-lg mx-auto">
                <div class="flex items-center gap-2">
                    <span class="text-xl">⚡</span>
                    <span class="text-[10px] font-black uppercase text-amber-400 tracking-widest font-mono">REST MODE • ODPOČINEK</span>
                </div>
                <button onclick="document.getElementById('fullscreen-rest-overlay').remove()" class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition">
                    <i class="fas fa-compress text-sm"></i>
                </button>
            </div>

            <!-- Main Huge Circular Countdown Ring -->
            <div class="flex flex-col items-center justify-center my-auto">
                <div class="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mb-6">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.04)" stroke-width="8" fill="transparent" />
                        <circle id="fs-rest-svg-ring" cx="100" cy="100" r="90"
                                stroke="${activeColor}"
                                stroke-width="8"
                                stroke-linecap="round"
                                fill="transparent"
                                stroke-dasharray="565.48"
                                stroke-dashoffset="${fsOffset}"
                                class="transition-all duration-1000 ease-linear"
                                style="filter: drop-shadow(0 0 12px rgba(59,165,92,0.35));" />
                    </svg>
                    <div class="absolute flex flex-col items-center justify-center">
                        <span id="fs-rest-countdown" class="font-mono text-5xl sm:text-7xl font-black text-white leading-none tracking-tight">
                            ${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}
                        </span>
                        <span class="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mt-2">Zbývá odpočinku</span>
                    </div>
                </div>

                <!-- Last Exercise Context -->
                <div class="space-y-1 max-w-sm mx-auto">
                    <h3 class="text-lg sm:text-xl font-black text-white truncate">${lastExName}</h3>
                    ${lastSetInfo ? `<p class="text-xs font-mono font-bold text-amber-400/90">${lastSetInfo}</p>` : ''}
                </div>
            </div>

            <!-- Bottom Quick Adjust Controls -->
            <div class="w-full max-w-sm mx-auto space-y-4">
                <div class="flex items-center justify-center gap-3">
                    <button onclick="window.Gym.adjustRestTime(-15)" class="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-mono font-bold text-xs transition flex items-center gap-1.5">
                        −15s
                    </button>
                    <button onclick="window.Gym.adjustRestTime(15)" class="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-mono font-bold text-xs transition flex items-center gap-1.5">
                        +15s
                    </button>
                    <button onclick="window.Gym.skipRestTimer()" class="px-5 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg">
                        <i class="fas fa-forward text-xs"></i> Přeskočit
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
}

export function adjustRestTime(deltaSec) {
    triggerHaptic('light');
    setRestTimeRemaining(Math.max(0, restTimeRemaining + deltaSec));
    saveActiveWorkoutToStorage();
    const restMinutes = Math.floor(restTimeRemaining / 60);
    const restSeconds = restTimeRemaining % 60;
    const fsEl = document.getElementById('fs-rest-countdown');
    if (fsEl) fsEl.textContent = `${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
    const cdEl = document.getElementById('rest-timer-countdown');
    if (cdEl) cdEl.textContent = `${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
}

export function skipRestTimer(renderGymFn) {
    triggerHaptic('medium');
    document.getElementById('fullscreen-rest-overlay')?.remove();
    resetRestTimer(renderGymFn);
}

export function toggleTimerSound(renderGymFn) {
    triggerHaptic('light');
    if (!state.settings) state.settings = {};
    state.settings.soundEnabled = !state.settings.soundEnabled;
    try {
        localStorage.setItem('kiscord_settings', JSON.stringify(state.settings));
    } catch (e) {}
    showNotification(state.settings.soundEnabled ? 'Zvuky tréninku zapnuty 🔊' : 'Zvuky tréninku ztišeny 🔇', 'info');
    if (renderGymFn) renderGymFn();
    else if (window.Gym && window.Gym.renderGym) window.Gym.renderGym();
}

