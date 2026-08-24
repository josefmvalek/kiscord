/**
 * Pomodoro Co-op Timer & Coworking Hub for VUT FIT Study Planner
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';

let studyPomodoroTimerInterval = null;
let studyPomodoroTimeLeft = 25 * 60;
let isStudyPomodoroRunning = false;

export function renderCoworkingWidget() {
    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const partnerName = isJose ? 'Klárka' : 'Jožka';

    return `
        <div class="bg-gradient-to-br from-[#202225] via-[#2a2d32] to-[#1e2023] border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden space-y-4 select-none">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl border border-emerald-500/30 flex-shrink-0">
                        🍅
                    </div>
                    <div>
                        <h3 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span>Spolu-Studovna & Pomodoro Co-op</span>
                            <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Live Sync</span>
                        </h3>
                        <p class="text-[10px] text-gray-400">25 min hluboký fokus / 5 min pauza se sdíleným DND statusem</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <select id="study-pomodoro-task-select" class="bg-[#18191c] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 font-bold focus:outline-none focus:border-emerald-500">
                        <option value="IZP: Projekt v C">💻 IZP: Projekt v C</option>
                        <option value="IMA1: Matematická analýza">📐 IMA1: Matematická analýza</option>
                        <option value="IUS: Softwarové inženýrství">🏗️ IUS: Softwarové inženýrství</option>
                        <option value="IDA: Diskrétní matematika">🔢 IDA: Diskrétní matematika</option>
                        <option value="Bakalářská práce">🎓 Bakalářská práce</option>
                        <option value="Vlastní studium">📖 Vlastní studium</option>
                    </select>
                    <button onclick="window.toggleStudyPomodoro()" 
                            class="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 flex-shrink-0">
                        <i class="fas fa-play" id="study-pomodoro-icon"></i>
                        <span id="study-pomodoro-btn-label">${isStudyPomodoroRunning ? 'Pauza' : 'Spustit Fokus'}</span>
                    </button>
                </div>
            </div>

            <!-- Pomodoro Timer Clock & Progress Bar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-black/30 border border-white/5">
                <div class="flex items-center gap-3">
                    <span id="study-pomodoro-timer" class="text-2xl font-black text-white font-mono">
                        ${Math.floor(studyPomodoroTimeLeft / 60).toString().padStart(2, '0')}:${(studyPomodoroTimeLeft % 60).toString().padStart(2, '0')}
                    </span>
                    <span id="study-pomodoro-status" class="text-xs text-gray-400 font-medium">
                        ${isStudyPomodoroRunning ? '🔥 Hluboký fokus běží' : 'Připraveno ke společnému učení'}
                    </span>
                </div>
                <div id="study-partner-indicator" class="text-xs text-gray-400 font-medium flex items-center gap-2">
                    ${state.partnerStudyFocus?.status === 'focus' ? `
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span class="text-emerald-300 font-bold">${partnerName} se učí: ${state.partnerStudyFocus.taskName} 🔕</span>
                    ` : `
                        <span class="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
                        <span>${partnerName} je offline</span>
                    `}
                </div>
            </div>
        </div>
    `;
}

export function toggleStudyPomodoro() {
    triggerHaptic('medium');
    const select = document.getElementById('study-pomodoro-task-select');
    const taskName = select ? select.value : 'Vlastní studium';

    if (isStudyPomodoroRunning) {
        isStudyPomodoroRunning = false;
        if (studyPomodoroTimerInterval) clearInterval(studyPomodoroTimerInterval);
        studyPomodoroTimerInterval = null;
        import('@core/sync.js').then(s => {
            s.broadcastStudyFocus?.({ taskName, status: 'stopped', durationMinutes: 25, startedAt: null });
        });
        showNotification('Pomodoro fokus byl pozastaven.', 'info');
    } else {
        isStudyPomodoroRunning = true;
        if (studyPomodoroTimeLeft <= 0) studyPomodoroTimeLeft = 25 * 60;
        const startedAt = Date.now();
        
        import('@core/sync.js').then(s => {
            s.broadcastStudyFocus?.({ taskName, status: 'focus', durationMinutes: Math.ceil(studyPomodoroTimeLeft / 60), startedAt });
        });

        import('@core/sound.js').then(s => s.playSuccessChime?.());
        showNotification(`Spuštěn 25 min studijní blok pro „${taskName}“! 📚🍅`, 'success');

        if (studyPomodoroTimerInterval) clearInterval(studyPomodoroTimerInterval);
        studyPomodoroTimerInterval = setInterval(() => {
            studyPomodoroTimeLeft--;
            const timerEl = document.getElementById('study-pomodoro-timer');
            if (timerEl) {
                timerEl.textContent = `${Math.floor(studyPomodoroTimeLeft / 60).toString().padStart(2, '0')}:${(studyPomodoroTimeLeft % 60).toString().padStart(2, '0')}`;
            }
            if (studyPomodoroTimeLeft <= 0) {
                clearInterval(studyPomodoroTimerInterval);
                isStudyPomodoroRunning = false;
                import('@core/sound.js').then(s => s.playSuccessChime?.());
                import('@core/utils.js').then(u => {
                    u.triggerConfetti?.();
                    u.triggerHaptic?.('success');
                });
                showNotification(`🎉 25 min Pomodoro fokus pro „${taskName}“ dokončen! Dej si 5 min pauzu.`, 'success');
                import('@core/state.js').then(({ awardLoveCoinsToCurrentUser }) => {
                    awardLoveCoinsToCurrentUser(5, `Splněný Pomodoro fokus: ${taskName}`);
                });
                window.StudyPlanner?.render?.();
            }
        }, 1000);
    }
    window.StudyPlanner?.render?.();
}
