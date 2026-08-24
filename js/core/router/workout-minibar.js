import { state } from '../state.js';
import { triggerHaptic } from '../utils.js';
import { showNotification } from '../theme.js';

let miniBarLiveTicker = null;

export function updateGlobalWorkoutMiniBar() {
    const bar = document.getElementById('global-workout-mini-bar');
    const gymDot = document.getElementById('mobile-nav-gym-dot');
    if (!bar) return;

    let active = null;
    try {
        const raw = localStorage.getItem('kiscord_active_workout');
        if (raw) active = JSON.parse(raw);
    } catch(e) {}

    const isGymChannel = state.currentChannel === 'gym-tracker';

    if (active) {
        if (gymDot) gymDot.classList.remove('hidden');
        if (!isGymChannel) {
            bar.classList.remove('hidden');
            bar.classList.add('flex');

            const titleEl = document.getElementById('mini-bar-title');
            const timerEl = document.getElementById('mini-bar-timer');
            const subEl = document.getElementById('mini-bar-subtitle');

            const updateDisplay = () => {
                if (titleEl) titleEl.textContent = active.name || active.templateName || 'Trénink';

                let startMs = 0;
                if (typeof active.startTime === 'number') {
                    startMs = active.startTime;
                } else if (typeof active.startTime === 'string') {
                    startMs = new Date(active.startTime).getTime();
                }

                const now = Date.now();
                let elapsedSec = 0;
                if (!isNaN(startMs) && startMs > 0) {
                    elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
                } else {
                    elapsedSec = Number(active.durationSeconds) || 0;
                }

                const h = Math.floor(elapsedSec / 3600);
                const m = Math.floor((elapsedSec % 3600) / 60);
                const s = elapsedSec % 60;
                const timeStr = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

                let restRemaining = 0;
                if (active.isRestTimerRunning) {
                    const restStart = active.restStartedAt ? Number(active.restStartedAt) : 0;
                    if (!isNaN(restStart) && restStart > 0) {
                        const restElapsed = Math.floor((now - restStart) / 1000);
                        restRemaining = Math.max(0, (active.restTimeDuration || 90) - restElapsed);
                    } else {
                        restRemaining = active.restTimeRemaining || 0;
                    }
                }

                if (timerEl) {
                    if (active.isRestTimerRunning && restRemaining > 0) {
                        timerEl.innerHTML = `<span class="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">☕ ${restRemaining}s</span>`;
                    } else {
                        timerEl.textContent = timeStr;
                    }
                }

                let currEx = (active.exercises || []).find(ex => (ex.sets || []).some(set => !set.completed));
                if (!currEx && active.exercises && active.exercises.length > 0) {
                    currEx = active.exercises[active.exercises.length - 1];
                }

                const setBadge = document.getElementById('mini-bar-set-badge');
                if (currEx) {
                    const setsDone = (currEx.sets || []).filter(set => set.completed).length;
                    const totalSets = (currEx.sets || []).length;
                    const allDone = setsDone === totalSets && totalSets > 0;

                    if (subEl) {
                        subEl.textContent = currEx.name;
                    }
                    if (setBadge) {
                        setBadge.classList.remove('hidden');
                        if (allDone) {
                            setBadge.textContent = 'Hotovo ✅';
                            setBadge.className = 'flex-shrink-0 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30';
                        } else {
                            const currentSetNum = Math.min(totalSets, setsDone + 1);
                            setBadge.textContent = `S${currentSetNum}/${totalSets}`;
                            setBadge.className = 'flex-shrink-0 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30';
                        }
                    }
                } else {
                    if (subEl) subEl.textContent = 'Trénink probíhá...';
                    if (setBadge) setBadge.classList.add('hidden');
                }

                const btn = document.getElementById('mini-bar-quick-set-btn');
                const btnText = document.getElementById('mini-bar-btn-text');
                if (btn && btnText) {
                    if (active.isRestTimerRunning && restRemaining > 0) {
                        btnText.textContent = 'Přeskočit ⏭️';
                        btn.className = "px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 flex-shrink-0";
                        btn.title = "Přeskočit pauzu a pokračovat v tréninku";
                    } else {
                        btnText.textContent = '+ Série';
                        btn.className = "px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-[11px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 flex-shrink-0";
                        btn.title = "Označit sérii za hotovou a spustit pauzu";
                    }
                }
            };

            updateDisplay();

            if (miniBarLiveTicker) clearInterval(miniBarLiveTicker);
            miniBarLiveTicker = setInterval(() => {
                try {
                    const latest = localStorage.getItem('kiscord_active_workout');
                    if (latest) active = JSON.parse(latest);
                } catch(e) {}
                updateDisplay();
            }, 1000);
        } else {
            if (miniBarLiveTicker) { clearInterval(miniBarLiveTicker); miniBarLiveTicker = null; }
            bar.classList.add('hidden');
            bar.classList.remove('flex');
        }
    } else {
        if (miniBarLiveTicker) { clearInterval(miniBarLiveTicker); miniBarLiveTicker = null; }
        if (gymDot) gymDot.classList.add('hidden');
        bar.classList.add('hidden');
        bar.classList.remove('flex');
    }
}

export function logCurrentMiniBarSet() {
    try {
        const raw = localStorage.getItem('kiscord_active_workout');
        if (!raw) return;
        const active = JSON.parse(raw);
        if (!active || !active.exercises || active.exercises.length === 0) return;

        let isResting = false;
        if (active.isRestTimerRunning) {
            const now = Date.now();
            const restStart = active.restStartedAt ? Number(active.restStartedAt) : 0;
            if (!isNaN(restStart) && restStart > 0) {
                const restElapsed = Math.floor((now - restStart) / 1000);
                const restRemaining = Math.max(0, (active.restTimeDuration || 90) - restElapsed);
                if (restRemaining > 0) isResting = true;
            } else if ((active.restTimeRemaining || 0) > 0) {
                isResting = true;
            }
        }

        if (isResting) {
            active.isRestTimerRunning = false;
            active.restTimeRemaining = 0;
            active.restStartedAt = null;
            localStorage.setItem('kiscord_active_workout', JSON.stringify(active));
            triggerHaptic('light');
            updateGlobalWorkoutMiniBar();
            return;
        }

        let currEx = active.exercises.find(ex => (ex.sets || []).some(set => !set.completed));
        if (currEx) {
            const nextSet = currEx.sets.find(set => !set.completed);
            if (nextSet) {
                nextSet.completed = true;
                active.isRestTimerRunning = true;
                active.restStartedAt = Date.now();
                active.restTimeDuration = active.restTimeDuration || 90;
                active.restTimeRemaining = active.restTimeDuration;
                localStorage.setItem('kiscord_active_workout', JSON.stringify(active));
                triggerHaptic('success');
                updateGlobalWorkoutMiniBar();
            }
        }
    } catch(e) {
        console.error('Failed to log set or skip pause from mini bar:', e);
    }
}

