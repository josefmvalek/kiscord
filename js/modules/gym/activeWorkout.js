import { supabase } from '../../core/supabase.js';
import { safeInsert } from '../../core/offline.js';
import { state, ensureGymData, awardLoveCoinsToCurrentUser } from '../../core/state.js';
import { triggerHaptic, triggerConfetti, getTodayKey } from '../../core/utils.js';
import { playArcade } from '../../core/sound.js';
import { showNotification, showConfirmDialog } from '../../core/theme.js';
import { renderModal } from '../../core/ui.js';
import { isSyncWorkoutDay } from './coupleGym.js';
import {
    activeWorkout,
    setActiveWorkout,
    loadActiveWorkoutFromStorage,
    saveActiveWorkoutToStorage,
    cleanupWorkoutTimers,
    getTypeBadgeHTML,
    restTimeDuration,
    setRestTimeDuration,
    restTimeRemaining,
    setRestTimeRemaining,
    isRestTimerRunning,
    setIsRestTimerRunning,
    restTimerInterval,
    setRestTimerInterval,
    stopwatchInterval,
    setStopwatchInterval,
    tickRestTimer,
    resumeWorkoutIntervals,
    setRestStartedAt
} from './shared.js';
import {
    calculate1RM,
    openPlateCalculatorModal,
    openWarmupModal,
    getExerciseTargetSuggestion
} from './tools.js';
import {
    getLastExerciseHistory
} from './analytics.js';
import {
    getExerciseThumbnailHtml,
    openExerciseGuideModal
} from './exercises.js';

let currentWorkoutPhotoBase64 = null;

export function getActiveWorkout() {
    return activeWorkout;
}

export function startWorkout(templateId, renderGymFn) {
    triggerHaptic('medium');

    const template = state.gymTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Search user's last logged completed sets per exercise to pre-fill weight/reps & previous record
    const pastLogs = state.gymLogs.filter(l => l.user_id === state.currentUser?.id);

    const workoutExercises = template.exercises.map(te => {
        const ex = state.gymExercises.find(e => e.id === te.exercise_id) || { name: te.exercise_id, category: 'Ostatní' };
        
        let prevLog = '';
        let lastCompletedSets = [];

        outerLoop:
        for (const log of pastLogs) {
            if (log.exercises) {
                for (const pastEx of log.exercises) {
                    if (pastEx.exercise_id === te.exercise_id && pastEx.sets) {
                        const completed = pastEx.sets.filter(s => s.completed);
                        if (completed.length > 0) {
                            prevLog = `${completed[0].weight}kg x ${completed[0].reps}`;
                            lastCompletedSets = completed;
                            break outerLoop;
                        }
                    }
                }
            }
        }

        const setsCount = parseInt(te.sets) || 4;
        const setsArray = [];
        for (let i = 0; i < setsCount; i++) {
            let w = te.weight || 0;
            let r = te.reps || 10;
            
            if (lastCompletedSets.length > 0) {
                const matchSet = lastCompletedSets[i] || lastCompletedSets[lastCompletedSets.length - 1];
                w = parseFloat(matchSet.weight) ?? w;
                r = parseInt(matchSet.reps) ?? r;
            }

            setsArray.push({
                weight: w,
                reps: r,
                completed: false,
                type: 'N' // Default set type: Normal
            });
        }

        return {
            exercise_id: te.exercise_id,
            name: ex.name,
            category: ex.category,
            prev: prevLog || '---',
            rest_seconds: te.rest_seconds || 90,
            sets: setsArray,
            superset_group: te.superset_group || null
        };
    });

    const newActiveWorkout = {
        templateId,
        name: template.name,
        mode: template.mode || 'standard',
        circuitRounds: template.circuit_rounds || 3,
        currentRound: 1,
        amrapMinutes: template.amrap_minutes || 20,
        amrapRoundsCompleted: 0,
        emomMinutes: template.emom_minutes || 15,
        startTime: new Date(),
        durationSeconds: 0,
        exercises: workoutExercises,
        checklist: { creatine: false, water: false, preworkout: false, protein: false },
        isMinimized: false
    };

    currentWorkoutPhotoBase64 = null;
    setActiveWorkout(newActiveWorkout);
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.add('hidden');

    // Start Stopwatch & Rest timer intervals
    resumeWorkoutIntervals(() => tickRestTimer(renderGymFn));

    if (renderGymFn) renderGymFn();
}

/**
 * Starts an empty / ad-hoc workout on the fly.
 */
export function startFreeWorkout(renderGymFn) {
    triggerHaptic('medium');
    cleanupWorkoutTimers();

    const newActiveWorkout = {
        templateId: null,
        name: 'Volný trénink ⚡',
        mode: 'standard',
        circuitRounds: 3,
        currentRound: 1,
        amrapMinutes: 20,
        amrapRoundsCompleted: 0,
        emomMinutes: 15,
        startTime: new Date(),
        durationSeconds: 0,
        exercises: [],
        checklist: { creatine: false, water: false, preworkout: false, protein: false },
        isMinimized: false
    };

    currentWorkoutPhotoBase64 = null;
    setActiveWorkout(newActiveWorkout);
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.add('hidden');

    resumeWorkoutIntervals(() => tickRestTimer(renderGymFn));

    if (renderGymFn) renderGymFn();
    setTimeout(() => {
        openAddExerciseToActiveWorkoutModal();
    }, 150);
}



export function renderActiveWorkoutView(renderGymFn) {
    if (!activeWorkout) return '';

    const totalSets = activeWorkout.exercises.reduce((sum, e) => sum + e.sets.length, 0);
    const completedSets = activeWorkout.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
    const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    const restMinutes = Math.floor(restTimeRemaining / 60);
    const restSeconds = restTimeRemaining % 60;
    const dashoffset = restTimeDuration > 0 ? 276.4 * (1 - restTimeRemaining / restTimeDuration) : 0;

    const activeColor = restTimeRemaining <= 10 ? '#faa61a' : '#3ba55c';
    const countdownColorClass = restTimeRemaining <= 10 ? 'text-[#faa61a]' : 'text-[#3ba55c]';

    const timerHours = Math.floor(activeWorkout.durationSeconds / 3600);
    const timerMins = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
    const timerSecs = activeWorkout.durationSeconds % 60;
    const timerDisplayStr = `${timerHours > 0 ? timerHours + ':' : ''}${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;

    const timerHtml = `
        <div class="flex items-center gap-2 bg-black/30 border border-white/5 px-3 py-1.5 rounded-xl">
            <i class="fas fa-stopwatch text-xs text-[#faa61a]"></i>
            <span id="active-workout-timer" class="font-mono text-xs font-black text-white">${timerDisplayStr}</span>
        </div>
    `;

    // 2.1 – Collapsible rest timer
    // When running: expanded SVG ring. When idle: compact sticky chip.
    const restTimerHtml = isRestTimerRunning ? `
        <div id="rest-timer-card" class="glass-card bg-[#202225]/85 backdrop-blur-md border border-[#3ba55c]/30 shadow-[0_0_20px_rgba(59,165,92,0.15)] rounded-3xl p-5 flex flex-col items-center justify-center max-w-sm mx-auto animate-fade-in relative overflow-hidden">
            <div class="absolute inset-0 bg-[#3ba55c]/2 animate-pulse-slow"></div>

            <div class="relative z-10 flex justify-between items-center w-full mb-4 select-none">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/30">Odpočinek</span>
                <div class="flex gap-1">
                    <button onclick="window.Gym.setRestDuration(60)" id="rdur-60" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 60 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">60s</button>
                    <button onclick="window.Gym.setRestDuration(90)" id="rdur-90" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 90 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">90s</button>
                    <button onclick="window.Gym.setRestDuration(120)" id="rdur-120" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 120 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">120s</button>
                </div>
            </div>

            <div class="relative z-10 flex items-center justify-center w-32 h-32 mb-3">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.03)" stroke-width="6" fill="transparent" />
                    <circle id="rest-svg-ring" cx="50" cy="50" r="44"
                            stroke="${activeColor}"
                            stroke-width="6"
                            stroke-linecap="round"
                            fill="transparent"
                            stroke-dasharray="276.4"
                            stroke-dashoffset="${dashoffset}"
                            class="transition-all duration-1000 ease-linear"
                            style="filter: drop-shadow(0 0 4px rgba(59,165,92,0.3));" />
                </svg>
                <div class="absolute flex flex-col items-center justify-center select-none text-center">
                    <span id="rest-timer-countdown" class="font-mono text-2xl font-black ${countdownColorClass} leading-none tracking-tight">
                        ${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}
                    </span>
                    <span id="rest-timer-goal" class="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-wider">cíl ${restTimeDuration}s</span>
                </div>
            </div>

            <div class="relative z-10 flex gap-2 select-none items-center">
                <button onclick="window.Gym.openRestModeOverlay()" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-amber-400/80 hover:text-amber-300 transition-all transform active:scale-90" title="Celoobrazovkový odpočinek (REST MODE)">
                    <i class="fas fa-expand text-xs"></i>
                </button>
                <button onclick="window.Gym.toggleRestTimer()" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 transition-all transform active:scale-90" title="Pauznout">
                    <i class="fas fa-pause text-xs"></i>
                </button>
                <button onclick="window.Gym.resetRestTimer()" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/55 hover:text-white transition-all transform active:scale-90" title="Resetovat">
                    <i class="fas fa-undo text-xs"></i>
                </button>
                <button onclick="window.Gym.toggleTimerSound()" class="w-8 h-8 rounded-full flex items-center justify-center ${state.settings?.soundEnabled ? 'bg-white/5 hover:bg-white/10 text-white/80' : 'bg-red-500/20 text-red-400 border border-red-500/30'} transition-all transform active:scale-90">
                    <i class="fas ${state.settings?.soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-xs"></i>
                </button>
            </div>
        </div>
    ` : `
        <!-- Minimized rest timer chip -->
        <div id="rest-timer-card" class="flex items-center justify-between gap-3 bg-black/30 border border-white/5 rounded-2xl px-4 py-2.5 max-w-sm mx-auto select-none">
            <div class="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-amber-400 transition" onclick="window.Gym.openRestModeOverlay()" title="Otevřít REST MODE">
                <i class="fas fa-hourglass-half text-xs ${restTimeRemaining > 0 && restTimeRemaining < restTimeDuration ? 'text-amber-400' : ''}"></i>
                <span class="text-[10px] font-black uppercase tracking-wider">Odpočinek</span>
            </div>
            <div class="flex items-center gap-1.5">
                <button onclick="window.Gym.setRestDuration(60)" id="rdur-60" class="px-2 py-1 rounded-lg text-[9px] font-bold transition ${restTimeDuration === 60 ? 'bg-[#faa61a] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}">60s</button>
                <button onclick="window.Gym.setRestDuration(90)" id="rdur-90" class="px-2 py-1 rounded-lg text-[9px] font-bold transition ${restTimeDuration === 90 ? 'bg-[#faa61a] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}">90s</button>
                <button onclick="window.Gym.setRestDuration(120)" id="rdur-120" class="px-2 py-1 rounded-lg text-[9px] font-bold transition ${restTimeDuration === 120 ? 'bg-[#faa61a] text-black' : 'bg-white/5 text-gray-400 hover:text-white'}">120s</button>
            </div>
            <button onclick="window.Gym.startRestTimer()" class="px-3 py-1.5 rounded-xl bg-[#3ba55c]/20 hover:bg-[#3ba55c]/30 text-[#3ba55c] border border-[#3ba55c]/30 text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5">
                <i class="fas fa-play text-[9px]"></i> Start
            </button>
        </div>
    `;

    let modeHeaderHtml = '';
    if (activeWorkout.mode === 'circuit') {
        modeHeaderHtml = `
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 mb-4 shadow-sm select-none">
                <div class="flex items-center gap-2.5">
                    <span class="text-lg">⚡</span>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-indigo-300 block leading-none">Kruhový Trénink</span>
                        <span class="text-xs font-mono font-black text-white mt-0.5 block">Kolo ${activeWorkout.currentRound || 1} / ${activeWorkout.circuitRounds || 3}</span>
                    </div>
                </div>
                <button onclick="window.Gym.incrementWorkoutRound()" class="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wider transition shadow-sm flex items-center gap-1">
                    <span>+1 Kolo</span> <span>🔄</span>
                </button>
            </div>
        `;
    } else if (activeWorkout.mode === 'amrap') {
        modeHeaderHtml = `
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-4 shadow-sm select-none">
                <div class="flex items-center gap-2.5">
                    <span class="text-lg">⏱</span>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-amber-300 block leading-none">AMRAP (${activeWorkout.amrapMinutes || 20} min)</span>
                        <span class="text-xs font-mono font-black text-white mt-0.5 block">Dokončeno: <strong class="text-amber-400 font-black" id="amrap-rounds-count">${activeWorkout.amrapRoundsCompleted || 0}</strong> kol</span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="window.Gym.decrementWorkoutRound()" class="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition flex items-center justify-center">−</button>
                    <button onclick="window.Gym.incrementWorkoutRound()" class="px-3 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1">
                        <span>+1 Kolo</span> <span>🔥</span>
                    </button>
                </div>
            </div>
        `;
    } else if (activeWorkout.mode === 'emom') {
        const curMin = Math.min(activeWorkout.emomMinutes || 15, Math.floor((activeWorkout.durationSeconds || 0) / 60) + 1);
        const secInMin = (activeWorkout.durationSeconds || 0) % 60;
        modeHeaderHtml = `
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/25 mb-4 shadow-sm select-none">
                <div class="flex items-center gap-2.5">
                    <span class="text-lg">⌛</span>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-pink-300 block leading-none">EMOM (${activeWorkout.emomMinutes || 15} min)</span>
                        <span class="text-xs font-mono font-black text-white mt-0.5 block">Minuta ${curMin} z ${activeWorkout.emomMinutes || 15}</span>
                    </div>
                </div>
                <span class="text-[10px] font-mono font-bold text-pink-300 bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20">${60 - secInMin}s do další</span>
            </div>
        `;
    }

    return `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex items-center justify-between gap-4">
                <div>
                    <span class="text-[9px] font-black uppercase tracking-widest text-[#faa61a] block mb-0.5">Aktivní cvičení</span>
                    <h2 class="text-base font-black text-white uppercase tracking-tight truncate leading-tight">${activeWorkout.name}</h2>
                </div>
                ${timerHtml}
            </div>

            <div class="h-2 bg-[#202225] w-full relative z-10 flex-shrink-0">
                <div id="active-workout-progress" class="h-full bg-gradient-to-r from-[#faa61a] to-[#3ba55c] transition-all duration-300" style="width: ${percentage}%"></div>
            </div>

            <div class="flex-1 overflow-y-auto w-full p-4 lg:p-6 custom-scrollbar space-y-6 pb-28 relative">
                <div class="mb-4 z-20">
                    ${restTimerHtml}
                </div>

                <!-- Pre & Post-workout Quick Checklist -->
                <div class="max-w-4xl mx-auto flex items-center justify-between gap-1.5 p-2 bg-[#202225] border border-white/5 rounded-2xl select-none overflow-x-auto custom-scrollbar">
                    <button onclick="window.Gym.toggleWorkoutChecklistItem('creatine')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.creatine) ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>💊</span> <span>Kreatin</span> ${(activeWorkout.checklist?.creatine) ? '✓' : ''}
                    </button>
                    <button onclick="window.Gym.toggleWorkoutChecklistItem('preworkout')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.preworkout) ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>⚡</span> <span>Pre-workout</span> ${(activeWorkout.checklist?.preworkout) ? '✓' : ''}
                    </button>
                    <button onclick="window.Gym.toggleWorkoutChecklistItem('water')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.water) ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>💧</span> <span>1.5L Voda</span> ${(activeWorkout.checklist?.water) ? '✓' : ''}
                    </button>
                    <button onclick="window.Gym.toggleWorkoutChecklistItem('protein')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.protein) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>🥤</span> <span>Protein</span> ${(activeWorkout.checklist?.protein) ? '✓' : ''}
                    </button>
                </div>

                <div class="max-w-4xl mx-auto space-y-5">
                    ${modeHeaderHtml}

                    ${activeWorkout.exercises.length === 0 ? `
                        <div class="text-center py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-6">
                            <span class="text-4xl block mb-2">⚡</span>
                            <h4 class="text-sm font-black text-white uppercase tracking-wider">Trénink je prázdný</h4>
                            <p class="text-xs text-gray-400 mt-1 mb-4">Přidej si první cvik tlačítkem níže a začni makat!</p>
                            <button onclick="window.Gym.openAddExerciseToActiveWorkoutModal()" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider transition shadow-md inline-flex items-center gap-1.5">
                                <i class="fas fa-plus"></i> Přidat první cvik
                            </button>
                        </div>
                    ` : activeWorkout.exercises.map((e, exIdx) => {
                        const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === e.exercise_id);
                        const prWeight = existingPR ? parseFloat(existingPR.weight) : 0;
                        const firstWorkingWeight = e.sets.find(s => s.type !== 'W' && s.weight > 0)?.weight || e.sets[0]?.weight || 60;
                        const overloadSuggestion = getExerciseTargetSuggestion(e.exercise_id);
                        const exMeta = (state.gymExercises || []).find(ge => ge.id === e.exercise_id) || { id: e.exercise_id, name: e.name, category: e.category };
                        const isSuperset = !!e.superset_group;
                        const lastHistory = getLastExerciseHistory(e.exercise_id);
                        const exNotes = e.user_notes || localStorage.getItem(`kiscord_gym_notes_${e.exercise_id}`) || '';

                        return `
                            <div class="glass-card ${isSuperset ? 'border-l-4 border-l-purple-500 bg-purple-500/[0.03] border-white/5' : 'bg-white/[0.02] border border-white/5'} rounded-3xl p-3.5 sm:p-5 shadow-xl transition-all">
                                <!-- Row 1: Thumbnail + Title + Reorder/Tools -->
                                <div class="flex items-center justify-between gap-2 mb-2.5">
                                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                        ${getExerciseThumbnailHtml(exMeta, 'w-10 h-10 rounded-xl flex-shrink-0')}
                                        <div class="min-w-0 flex-1">
                                            <h3 class="text-sm font-black text-white leading-tight truncate cursor-pointer hover:text-amber-400 transition" onclick="window.Gym.openExerciseGuideModal('${e.exercise_id}')" title="Zobrazit techniku cviku">${e.name}</h3>
                                            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono">${e.category}</span>
                                                ${isSuperset ? `<span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">⚡ Superset ${e.superset_group}</span>` : ''}
                                                ${exNotes ? `<span onclick="window.Gym.openExerciseNotesModal(${exIdx})" class="text-[8px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded cursor-pointer truncate max-w-[130px]" title="Poznámka ke stroji">📝 ${exNotes}</span>` : ''}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Quick Tool Buttons & Exercise Manipulation -->
                                    <div class="flex items-center gap-1 flex-shrink-0 select-none">
                                        <!-- Reorder Up/Down -->
                                        ${exIdx > 0 ? `
                                            <button onclick="window.Gym.moveExerciseUp(${exIdx})" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center text-[10px]" title="Posunout cvik nahoru">
                                                <i class="fas fa-chevron-up"></i>
                                            </button>
                                        ` : ''}
                                        ${exIdx < activeWorkout.exercises.length - 1 ? `
                                            <button onclick="window.Gym.moveExerciseDown(${exIdx})" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center text-[10px]" title="Posunout cvik dolů">
                                                <i class="fas fa-chevron-down"></i>
                                            </button>
                                        ` : ''}

                                        <!-- Swap Alternative -->
                                        <button onclick="window.Gym.openSwapExerciseModal(${exIdx})" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 transition flex items-center justify-center text-[10px]" title="Nahradit cvik alternativou">
                                            <i class="fas fa-exchange-alt"></i>
                                        </button>

                                        <!-- Machine Notes -->
                                        <button onclick="window.Gym.openExerciseNotesModal(${exIdx})" class="w-7 h-7 rounded-lg ${exNotes ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-gray-400 hover:text-white'} transition flex items-center justify-center text-[10px]" title="Nastavení stroje / sedáku">
                                            <i class="fas fa-sticky-note"></i>
                                        </button>

                                        <!-- Pre-fill from history -->
                                        ${lastHistory ? `
                                            <button onclick="window.Gym.fillSetsFromLastHistory(${exIdx})" class="w-7 h-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/25 transition flex items-center justify-center text-[10px]" title="Vyplnit podle minula (${lastHistory.formattedDate})">
                                                <i class="fas fa-history"></i>
                                            </button>
                                        ` : ''}

                                        <!-- Superset toggle -->
                                        <button onclick="window.Gym.toggleExerciseSuperset(${exIdx})" class="px-2 py-1 rounded-lg ${isSuperset ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-gray-400 hover:text-white'} transition text-[10px] font-black uppercase tracking-wider flex items-center gap-1" title="Změnit / propojit superset">
                                            <span>⚡</span>
                                        </button>
                                        
                                        <!-- Remove exercise -->
                                        <button onclick="window.Gym.removeExerciseFromActiveWorkout(${exIdx})" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition flex items-center justify-center text-[10px]" title="Odstranit cvik z tréninku">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>

                                ${overloadSuggestion ? `
                                    <div class="bg-amber-500/5 border border-amber-500/15 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 text-[10px] text-gray-300 mb-3 select-none">
                                        <div class="flex items-center gap-1.5 min-w-0 truncate">
                                            <span class="text-amber-400 font-bold flex-shrink-0">💡 Cíl:</span>
                                            <span class="font-bold font-mono text-white truncate">${overloadSuggestion.suggestions[0].text}</span>
                                            <span class="text-[9px] text-gray-400 font-mono hidden sm:inline">(1RM ~${overloadSuggestion.estimated1RM}kg)</span>
                                        </div>
                                        <button onclick="window.Gym.applyWeightSuggestion(${exIdx}, ${overloadSuggestion.suggestions[0].weight})" class="flex-shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1" title="Aplikovat doporučenou váhu na všechny série">
                                            <i class="fas fa-check text-[8px]"></i> Použít
                                        </button>
                                    </div>
                                ` : ''}

                                <!-- Set Column Headers -->
                                <div class="grid grid-cols-12 gap-1.5 px-2 py-1 text-[8px] font-black uppercase text-gray-400 tracking-wider font-mono select-none">
                                    <div class="col-span-2 text-center">Série</div>
                                    <div class="col-span-5 text-center">Váha (kg)</div>
                                    <div class="col-span-3 text-center">Opak.</div>
                                    <div class="col-span-2 text-center">Stav</div>
                                </div>

                                <!-- Set Rows with Ghost History -->
                                <div class="space-y-1.5 font-mono select-none">
                                    ${e.sets.map((s, setIdx) => {
                                        const isPR = s.completed && s.type !== 'W' && s.weight > prWeight;
                                        const lastSet = lastHistory?.sets?.[setIdx];
                                        const rirLabel = (s.rir !== undefined && s.rir !== null) ? `RIR ${s.rir}` : null;

                                        return `
                                            <div id="set-row-${exIdx}-${setIdx}" class="grid grid-cols-12 items-center gap-1.5 p-1.5 rounded-2xl transition duration-150 ${s.completed ? 'bg-[#3ba55c]/10 border border-[#3ba55c]/25' : 'bg-black/25 border border-white/5'}">
                                                <!-- Col 1: Set Type / Nr / RIR -->
                                                <div class="col-span-2 flex flex-col items-center justify-center min-w-0">
                                                    <div class="flex items-center gap-0.5">
                                                        ${getTypeBadgeHTML(exIdx, setIdx, s)}
                                                        ${isPR ? `<span class="text-[8px] font-black text-amber-400" title="Nový PR rekord!">🔥</span>` : ''}
                                                    </div>
                                                    <button onclick="window.Gym.cycleSetRir(${exIdx}, ${setIdx})" class="text-[7.5px] font-mono font-bold mt-0.5 px-1 rounded transition ${rirLabel ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300'}" title="Reps in Reserve (RIR / Úsilí)">
                                                        ${rirLabel || 'RIR -'}
                                                    </button>
                                                </div>
                                                
                                                <!-- Col 2: Weight Stepper (High contrast & Ghost data) -->
                                                <div class="col-span-5 flex flex-col items-center justify-center">
                                                    <div class="w-full flex items-center justify-center bg-black/40 border border-white/10 rounded-xl p-0.5 shadow-inner">
                                                        <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', -1)" ${s.completed ? 'disabled' : ''} class="w-7 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">−</button>
                                                        <input id="weight-input-${exIdx}-${setIdx}" type="number" inputmode="decimal" step="0.5" value="${s.weight}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'weight', this.value)" class="flex-1 min-w-0 h-8 bg-transparent text-center text-xs sm:text-sm font-mono font-black text-white outline-none focus:text-amber-400 disabled:opacity-50">
                                                        <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', 1)" ${s.completed ? 'disabled' : ''} class="w-7 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">+</button>
                                                    </div>
                                                    ${lastSet ? `<span class="text-[7.5px] font-mono text-gray-400 block text-center leading-none mt-1 truncate max-w-full">Min: ${lastSet.weight}kg</span>` : ''}
                                                </div>

                                                <!-- Col 3: Reps Stepper (High contrast & Ghost data) -->
                                                <div class="col-span-3 flex flex-col items-center justify-center">
                                                    <div class="w-full flex items-center justify-center bg-black/40 border border-white/10 rounded-xl p-0.5 shadow-inner">
                                                        <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', -1)" ${s.completed ? 'disabled' : ''} class="w-6 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">−</button>
                                                        <input id="reps-input-${exIdx}-${setIdx}" type="number" inputmode="numeric" value="${s.reps}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'reps', this.value)" class="flex-1 min-w-0 h-8 bg-transparent text-center text-xs sm:text-sm font-mono font-black text-white outline-none focus:text-amber-400 disabled:opacity-50">
                                                        <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', 1)" ${s.completed ? 'disabled' : ''} class="w-6 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">+</button>
                                                    </div>
                                                    ${lastSet ? `<span class="text-[7.5px] font-mono text-gray-400 block text-center leading-none mt-1 truncate max-w-full">× ${lastSet.reps}</span>` : ''}
                                                </div>

                                                <!-- Col 4: Complete Button -->
                                                <div class="col-span-2 flex items-center justify-center">
                                                    <button id="complete-btn-${exIdx}-${setIdx}" onclick="window.Gym.toggleSetComplete(${exIdx}, ${setIdx})" class="w-9 h-8 sm:w-10 sm:h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${s.completed ? 'bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/25 hover:bg-[#2d7d46]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'}">
                                                        <i class="fas fa-check text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>

                                <!-- Mobile Touch Quick Weight Chips (Focus Mode) -->
                                <div class="flex items-center justify-between pt-2 pb-0.5 px-1 mt-1 border-t border-white/5 select-none">
                                    <span class="text-[8px] font-black uppercase tracking-wider text-gray-500 font-mono">⚡ Rychlá váha:</span>
                                    <div class="flex items-center gap-1">
                                        <button type="button" onclick="window.Gym.adjustActiveExerciseWeight(${exIdx}, -2.5)" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-mono text-[9px] font-bold transition active-pop">-2.5</button>
                                        <button type="button" onclick="window.Gym.adjustActiveExerciseWeight(${exIdx}, 1.25)" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-amber-300 font-mono text-[9px] font-bold transition active-pop">+1.25</button>
                                        <button type="button" onclick="window.Gym.adjustActiveExerciseWeight(${exIdx}, 2.5)" class="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold transition active-pop">+2.5</button>
                                        <button type="button" onclick="window.Gym.adjustActiveExerciseWeight(${exIdx}, 5)" class="px-2 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-black transition active-pop">+5kg</button>
                                    </div>
                                </div>

                            </div>
                        `;
                    }).join('')}
                    
                    <div class="max-w-4xl mx-auto mb-6 px-1 select-none">
                        <button onclick="window.Gym.openAddExerciseToActiveWorkoutModal()" 
                                class="w-full py-3.5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 hover:bg-white/5 hover:border-white/20 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
                            <i class="fas fa-plus text-[10px]"></i> Přidat cvik do tréninku
                        </button>
                    </div>

                    <div class="h-28 select-none pointer-events-none"></div>
                </div>
            </div>

            <!-- Bottom Action Bar: Ergonomic Mobile Layout -->
            <div class="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-[#202225]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-between gap-2 z-30 select-none pb-safe">
                <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button onclick="window.Gym.cancelWorkout()" class="w-11 h-11 rounded-2xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 border border-red-500/20 font-black transition flex items-center justify-center" title="Zahodit trénink">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                    <button onclick="window.Gym.minimizeWorkout()" class="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-yellow-400 border border-white/10 font-black transition flex items-center justify-center" title="Minimalizovat trénink">
                        <i class="fas fa-compress-alt text-xs"></i>
                    </button>
                    <button onclick="window.Gym.openRestModeOverlay()" class="w-11 h-11 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 border border-amber-500/20 font-black transition flex items-center justify-center" title="Otevřít REST MODE">
                        <i class="fas fa-hourglass-half text-xs"></i>
                    </button>
                </div>
                
                <button onclick="window.Gym.finishWorkout()" class="flex-1 h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 transform active:scale-[0.98] flex items-center justify-center gap-2">
                    <i class="fas fa-check-circle text-sm"></i> <span>Dokončit trénink</span>
                </button>
            </div>
        </div>
    `;
}

export function adjustVal(exIdx, setIdx, key, delta) {
    triggerHaptic('light');
    if (!activeWorkout) return;

    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    if (key === 'weight') {
        setObj.weight = Math.max(0, setObj.weight + delta);
    } else {
        setObj.reps = Math.max(0, setObj.reps + delta);
    }
    
    const inputEl = document.getElementById(`${key}-input-${exIdx}-${setIdx}`);
    if (inputEl) {
        inputEl.value = setObj[key];
    }
    saveActiveWorkoutToStorage();
}

export function adjustActiveExerciseWeight(exIdx, delta) {
    triggerHaptic('light');
    if (!activeWorkout) {
        loadActiveWorkoutFromStorage();
    }
    if (!activeWorkout || !activeWorkout.exercises || !activeWorkout.exercises[exIdx]) return;
    const ex = activeWorkout.exercises[exIdx];
    ex.sets.forEach((s, sIdx) => {
        if (!s.completed) {
            s.weight = Math.max(0, parseFloat((s.weight + delta).toFixed(2)));
            const inputEl = document.getElementById(`weight-input-${exIdx}-${sIdx}`);
            if (inputEl) inputEl.value = s.weight;
        }
    });
    saveActiveWorkoutToStorage();
}

export function toggleSetComplete(exIdx, setIdx, renderGymFn) {
    if (!activeWorkout) return;

    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    setObj.completed = !setObj.completed;

    if (setObj.completed) {
        triggerHaptic('success');

        // Start rest timer
        const exRest = activeWorkout.exercises[exIdx].rest_seconds || 90;
        setRestTimeDuration(exRest);
        startRestTimer(renderGymFn);

        // --- Extended PR Detection ---
        const exId = activeWorkout.exercises[exIdx].exercise_id;
        const exName = activeWorkout.exercises[exIdx].name;
        const myId = state.currentUser?.id;
        const myPRs = (state.gymPRs || []).filter(p => p.user_id === myId && p.exercise_id === exId);

        const w = parseFloat(setObj.weight) || 0;
        const r = parseInt(setObj.reps) || 0;
        const isWarmup = setObj.type === 'W';

        if (w > 0 && r > 0 && !isWarmup) {
            const est1RM = calculate1RM(w, r);

            // 1) Weight PR
            const weightPR = myPRs.find(p => !p.pr_type || p.pr_type === 'weight');
            if (!weightPR || w > parseFloat(weightPR.weight)) {
                playArcade();
                triggerConfetti();
                setTimeout(() => triggerConfetti(), 400);
                showNotification(`🏆 NOVÝ REKORD: ${exName} – ${w} kg! 🔥`, 'success');
                _savePR({ exercise_id: exId, weight: w, reps: r, pr_type: 'weight', est_1rm: est1RM });
            }
            // 2) Estimated 1RM PR
            else if (est1RM > 0) {
                const est1RMPR = myPRs.find(p => p.pr_type === 'est_1rm');
                if (!est1RMPR || est1RM > parseFloat(est1RMPR.est_1rm || 0)) {
                    playArcade();
                    showNotification(`💡 Nové odhadované 1RM: ${exName} – ~${est1RM} kg (${w}kg×${r})`, 'success');
                    _savePR({ exercise_id: exId, weight: w, reps: r, pr_type: 'est_1rm', est_1rm: est1RM });
                }
            }
        }

        // 3) Volume PR (total volume for this exercise this session)
        if (w > 0 && r > 0) {
            const sessionVolume = activeWorkout.exercises[exIdx].sets
                .filter(s => s.completed && s.type !== 'W')
                .reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
            const volumePR = myPRs.find(p => p.pr_type === 'volume');
            if (sessionVolume > 0 && (!volumePR || sessionVolume > parseFloat(volumePR.volume_kg || 0))) {
                _savePR({ exercise_id: exId, weight: w, reps: r, pr_type: 'volume', volume_kg: sessionVolume });
                // Only notify if meaningful improvement (>5%)
                if (!volumePR || sessionVolume > parseFloat(volumePR.volume_kg || 0) * 1.05) {
                    showNotification(`📊 Nový objemový rekord: ${exName} – ${Math.round(sessionVolume)} kg celkem!`, 'info');
                }
            }
        }
    } else {
        triggerHaptic('light');
    }

    // DOM patch – update row without re-render
    const row = document.getElementById(`set-row-${exIdx}-${setIdx}`);
    if (row) {
        row.className = `grid grid-cols-12 items-center gap-1.5 p-1.5 rounded-2xl transition duration-150 ${setObj.completed ? 'bg-[#3ba55c]/10 border border-[#3ba55c]/25' : 'bg-black/25 border border-white/5'}`;

        const controls = row.querySelectorAll(`input, button:not(#complete-btn-${exIdx}-${setIdx})`);
        controls.forEach(c => {
            if (setObj.completed) c.setAttribute('disabled', 'true');
            else c.removeAttribute('disabled');
        });

        const btn = document.getElementById(`complete-btn-${exIdx}-${setIdx}`);
        if (btn) {
            btn.className = setObj.completed
                ? `w-9 h-8 sm:w-10 sm:h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/25 hover:bg-[#2d7d46]`
                : `w-9 h-8 sm:w-10 sm:h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10`;
        }
    }

    let totalSets = 0;
    let completedSets = 0;
    activeWorkout.exercises.forEach(e => {
        totalSets += e.sets.length;
        completedSets += e.sets.filter(s => s.completed).length;
    });
    const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    const progBar = document.getElementById('active-workout-progress');
    if (progBar) progBar.style.width = `${percentage}%`;

    saveActiveWorkoutToStorage();
}

/**
 * Internal helper – upserts a PR record to Supabase in the background.
 * Non-blocking fire-and-forget.
 */
async function _savePR({ exercise_id, weight, reps, pr_type, est_1rm, volume_kg }) {
    try {
        const myId = state.currentUser?.id;
        if (!myId) return;

        const { data, error } = await supabase
            .from('gym_prs')
            .upsert({
                user_id: myId,
                exercise_id,
                weight,
                reps,
                pr_type: pr_type || 'weight',
                est_1rm: est_1rm || null,
                volume_kg: volume_kg || null,
                achieved_at: new Date().toISOString()
            }, {
                // Upsert on (user_id, exercise_id, pr_type) – needs unique constraint in DB
                // If not present, it will insert; duplicates handled in memory via state
                onConflict: 'user_id,exercise_id,pr_type'
            });

        if (!error && data) {
            // Optimistically update local state
            state.gymPRs = (state.gymPRs || []).filter(
                p => !(p.user_id === myId && p.exercise_id === exercise_id && p.pr_type === pr_type)
            );
            state.gymPRs.unshift({ ...data[0], user_id: myId, exercise_id, weight, reps, pr_type, est_1rm, volume_kg });
        }
    } catch (e) {
        // Silent – PR will still show in notification even if DB save fails
        console.warn('[Gym] PR save failed silently:', e);
    }
}

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

    if (restTimerInterval) clearInterval(restTimerInterval);
    setRestTimerInterval(setInterval(() => tickRestTimer(renderGymFn), 1000));
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

export async function cancelWorkout(renderGymFn) {
    const confirmed = await showConfirmDialog('Opravdu chceš zahodit tento běžící trénink? Všechny zapsané série se smažou.');
    if (!confirmed) return;
    
    triggerHaptic('medium');
    cleanupWorkoutTimers();
    setActiveWorkout(null);
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.remove('hidden');
    if (renderGymFn) renderGymFn();
}

export function openFinishWorkoutModal(renderGymFn) {
    triggerHaptic('medium');
    if (!activeWorkout) return;

    const totalSets = activeWorkout.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
    let totalVolumeKg = 0;
    activeWorkout.exercises.forEach(e => {
        e.sets.forEach(s => {
            if (s.completed && s.type !== 'W') {
                totalVolumeKg += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
            }
        });
    });

    const modalId = 'finish-workout-modal';
    document.getElementById(modalId)?.remove();

    const hours = Math.floor(activeWorkout.durationSeconds / 3600);
    const minutes = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
    const seconds = activeWorkout.durationSeconds % 60;
    const durationStr = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;

    const contentHtml = `
        <div class="space-y-4 font-sans select-none">
            <!-- Stat Badges -->
            <div class="grid grid-cols-3 gap-2 text-center">
                <div class="p-3 bg-black/30 rounded-2xl border border-white/5">
                    <span class="text-[9px] font-black uppercase text-gray-400 block font-mono">Délka</span>
                    <span class="text-sm font-mono font-black text-white">${durationStr}</span>
                </div>
                <div class="p-3 bg-black/30 rounded-2xl border border-white/5">
                    <span class="text-[9px] font-black uppercase text-gray-400 block font-mono">Série</span>
                    <span class="text-sm font-mono font-black text-emerald-400">${totalSets} splněno</span>
                </div>
                <div class="p-3 bg-black/30 rounded-2xl border border-white/5">
                    <span class="text-[9px] font-black uppercase text-gray-400 block font-mono">Objem</span>
                    <span class="text-sm font-mono font-black text-amber-400">${(totalVolumeKg / 1000).toFixed(2)} t</span>
                </div>
            </div>

            <!-- Pre/Post Checklist Summary -->
            <div class="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <span class="text-[9px] font-black uppercase text-gray-400 block font-mono">Checklist splněno:</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${(activeWorkout.checklist?.creatine) ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-gray-600'}">💊 Kreatin</span>
                    <span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${(activeWorkout.checklist?.preworkout) ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-gray-600'}">⚡ Pre-workout</span>
                    <span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${(activeWorkout.checklist?.water) ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-600'}">💧 1.5L Voda</span>
                    <span class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${(activeWorkout.checklist?.protein) ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-600'}">🥤 Protein</span>
                </div>
            </div>

            <!-- Photo Upload Area -->
            <div>
                <label class="text-[9px] font-black uppercase text-gray-400 tracking-wider block font-mono mb-1.5">Gym Selfie / Fotka formy 📸</label>
                <div class="p-4 rounded-2xl bg-black/30 border border-dashed border-white/15 hover:border-amber-400/50 text-center cursor-pointer transition relative overflow-hidden" onclick="document.getElementById('workout-selfie-input').click()">
                    <input type="file" id="workout-selfie-input" accept="image/*" class="hidden" onchange="window.Gym.handleWorkoutPhotoSelected(event)" />
                    <div id="workout-photo-preview" class="space-y-1">
                        ${currentWorkoutPhotoBase64 ? `
                            <div class="relative group rounded-xl overflow-hidden max-h-48 border border-white/20">
                                <img src="${currentWorkoutPhotoBase64}" class="w-full h-48 object-cover" />
                                <button type="button" onclick="event.stopPropagation(); window.Gym.clearWorkoutPhoto();" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition">✕</button>
                            </div>
                        ` : `
                            <i class="fas fa-camera text-2xl text-amber-400 mb-1"></i>
                            <p class="text-xs font-bold text-gray-200">Přidat fotku formy / Gym Selfie 📸</p>
                            <p class="text-[9px] text-gray-500">Zobrazí se ve feedu a na sdílecí kartě</p>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex items-center justify-between gap-2 w-full">
            <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider">Zpět k tréninku</button>
            <button onclick="document.getElementById('${modalId}').remove(); window.Gym.commitFinishWorkout();" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                <i class="fas fa-trophy"></i> Uložit a dokončit
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: modalId,
        title: 'Dokončení tréninku 🏆',
        subtitle: `${activeWorkout.name} • Shrnutí & Fotka`,
        size: 'md',
        content: contentHtml,
        actions: actionsHtml,
        onClose: `document.getElementById('${modalId}')?.remove()`
    }));

    document.getElementById(modalId)?.classList.remove('hidden');
    document.getElementById(modalId)?.classList.add('flex');
}

export async function finishWorkout(renderGymFn) {
    openFinishWorkoutModal(renderGymFn);
}

export async function commitFinishWorkout(renderGymFn) {
    triggerHaptic('success');
    if (!activeWorkout) return;

    const loggedExercises = activeWorkout.exercises.map(e => ({
        exercise_id: e.exercise_id,
        exercise_name: e.name,
        sets: e.sets.map(s => ({
            weight: s.weight,
            reps: s.reps,
            completed: s.completed,
            type: s.type || 'N',
            rir: s.rir ?? null
        }))
    })).filter(e => e.sets.some(s => s.completed));

    if (loggedExercises.length === 0) {
        showNotification('Nebyly splněny žádné série, trénink nelze uložit!', 'warning');
        return;
    }

    const todayStr = getTodayKey();

    try {
        const roundsCompleted = activeWorkout.mode === 'amrap' 
            ? (activeWorkout.amrapRoundsCompleted || 0)
            : (activeWorkout.mode === 'circuit' ? (activeWorkout.currentRound || 1) : null);

        const logData = {
            user_id: state.currentUser?.id,
            template_id: activeWorkout.templateId,
            name: activeWorkout.name,
            duration_seconds: activeWorkout.durationSeconds,
            date_key: todayStr,
            exercises: loggedExercises,
            mode: activeWorkout.mode || 'standard',
            rounds_completed: roundsCompleted,
            photo_url: currentWorkoutPhotoBase64,
            checklist: activeWorkout.checklist || { creatine: false, water: false, preworkout: false, protein: false },
            cheers: []
        };

        const { data: newLogs, error: logErr, offline } = await safeInsert('gym_logs', logData);

        if (logErr) throw logErr;

        const insertedLog = newLogs?.[0];

        for (const ex of loggedExercises) {
            const maxCompletedSet = ex.sets
                .filter(s => s.completed && s.type !== 'W')
                .reduce((max, s) => (s.weight > max.weight ? s : max), { weight: 0, reps: 0 });
            
            if (maxCompletedSet.weight > 0) {
                const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === ex.exercise_id);
                
                if (!existingPR || maxCompletedSet.weight > parseFloat(existingPR.weight)) {
                    const prData = {
                        user_id: state.currentUser?.id,
                        exercise_id: ex.exercise_id,
                        weight: maxCompletedSet.weight,
                        reps: maxCompletedSet.reps,
                        achieved_at: new Date().toISOString(),
                        log_id: insertedLog?.id
                    };

                    if (existingPR) {
                        await supabase.from('gym_prs').delete().eq('id', existingPR.id);
                    }
                    
                    await supabase.from('gym_prs').insert(prData);
                    
                    showNotification(`🏆 NOVÝ OSOBNÍ REKORD na ${ex.name || 'cvik'}: ${maxCompletedSet.weight} kg!`, 'success');

                    import('../achievements.js').then(m => {
                        m.autoUnlock('pr_breaker');
                    });
                }
            }
        }

        triggerConfetti();
        triggerHaptic('success');

        const isSyncToday = isSyncWorkoutDay(todayStr);

        // Award Love Coins: +10 solo workout, +20 synchronized couple workout
        const coinsToAward = isSyncToday ? 20 : 10;
        const coinsReason = isSyncToday ? 'Synchronizovaný trénink ve dvou! 🏋️‍♂️❤️' : 'Dokončený trénink v posilovně 🏋️‍♂️';
        await awardLoveCoinsToCurrentUser(coinsToAward, coinsReason);

        // Automatically mark movement on Health / Dashboard for today if not already marked
        import('../health.js').then(async h => {
            const todayHealth = h.getTodayData();
            if (!todayHealth.movement || !todayHealth.movement.includes('gym')) {
                await h.updateHealth('movement', 'gym');
            }
        }).catch(e => console.warn('[Health] Auto-update movement error:', e));

        cleanupWorkoutTimers();
        setActiveWorkout(null);
        saveActiveWorkoutToStorage();

        if (!state.gymLogs) state.gymLogs = [];
        if (insertedLog) {
            state.gymLogs.unshift(insertedLog);
        } else {
            state.gymLogs.unshift({ ...logData, id: 'temp-' + Date.now() });
        }

        if (offline) {
            showNotification('💾 Trénink byl bezpečně uložen offline! Synchronizuje se automaticky po připojení.', 'info');
        } else if (isSyncToday) {
            setTimeout(() => {
                triggerConfetti();
                showNotification('⚡ SYNC WORKOUT DAY! Dnes jste odcvičili oba dva! Skvělá týmová práce! 🎉', 'success');
            }, 600);
        }

        window.dispatchEvent(new CustomEvent('gym-logs-updated', { detail: { dateKey: todayStr, log: insertedLog || logData } }));
        await ensureGymData(true);
        import('../../core/state.js').then(s => s.initializeState());

        import('../achievements.js').then(m => {
            const myLogsCount = (state.gymLogs || []).filter(l => l.user_id === state.currentUser?.id).length;
            if (myLogsCount >= 10) m.autoUnlock('gym_rat');

            const partnerLogsToday = (state.gymLogs || []).filter(l => l.user_id !== state.currentUser?.id && l.date_key === todayStr);
            if (partnerLogsToday.length > 0) {
                m.autoUnlock('synchro_gym');
            }
        });

        document.getElementById('floating-settings-btn')?.classList.remove('hidden');
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Finish workout failed:", e);
        showNotification('Chyba při ukládání tréninku: ' + e.message, 'danger');
    }
}

/**
 * Handles photo selection for gym selfie.
 */
export function handleWorkoutPhotoSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        currentWorkoutPhotoBase64 = e.target.result;
        const previewEl = document.getElementById('workout-photo-preview');
        if (previewEl) {
            previewEl.innerHTML = `
                <div class="relative group rounded-xl overflow-hidden max-h-48 border border-white/20">
                    <img src="${currentWorkoutPhotoBase64}" class="w-full h-48 object-cover" />
                    <button type="button" onclick="event.stopPropagation(); window.Gym.clearWorkoutPhoto();" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition">✕</button>
                </div>
            `;
        }
        showNotification('Fotka byla úspěšně nahrána 📸', 'success');
    };
    reader.readAsDataURL(file);
}

export function clearWorkoutPhoto() {
    currentWorkoutPhotoBase64 = null;
    const previewEl = document.getElementById('workout-photo-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            <i class="fas fa-camera text-2xl text-amber-400 mb-1"></i>
            <p class="text-xs font-bold text-gray-200">Přidat fotku formy / Gym Selfie 📸</p>
            <p class="text-[9px] text-gray-500">Zobrazí se ve feedu u vašeho tréninku</p>
        `;
    }
}

/**
 * Opens image lightbox for full-screen photo view.
 */
export function openPhotoLightbox(photoUrl) {
    triggerHaptic('light');
    const modalId = 'gym-photo-lightbox';
    document.getElementById(modalId)?.remove();

    const html = `
        <div id="${modalId}" onclick="this.remove()" class="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in">
            <div class="relative max-w-2xl max-h-[90vh]">
                <img src="${photoUrl}" class="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-white/10 object-contain" />
                <button onclick="document.getElementById('${modalId}')?.remove()" class="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm backdrop-blur-md transition">✕</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Toggles a checklist item during active workout.
 */
export function toggleWorkoutChecklistItem(itemKey, renderGymFn) {
    if (!activeWorkout) return;
    triggerHaptic('light');
    if (!activeWorkout.checklist) {
        activeWorkout.checklist = { creatine: false, water: false, preworkout: false, protein: false };
    }
    activeWorkout.checklist[itemKey] = !activeWorkout.checklist[itemKey];
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Reorders an exercise upward in the active workout list.
 */
export function moveExerciseUp(exIdx, renderGymFn) {
    if (!activeWorkout || exIdx <= 0) return;
    triggerHaptic('light');
    const temp = activeWorkout.exercises[exIdx];
    activeWorkout.exercises[exIdx] = activeWorkout.exercises[exIdx - 1];
    activeWorkout.exercises[exIdx - 1] = temp;
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Reorders an exercise downward in the active workout list.
 */
export function moveExerciseDown(exIdx, renderGymFn) {
    if (!activeWorkout || exIdx >= activeWorkout.exercises.length - 1) return;
    triggerHaptic('light');
    const temp = activeWorkout.exercises[exIdx];
    activeWorkout.exercises[exIdx] = activeWorkout.exercises[exIdx + 1];
    activeWorkout.exercises[exIdx + 1] = temp;
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Removes an exercise from the active workout.
 */
export function removeExerciseFromActiveWorkout(exIdx, renderGymFn) {
    if (!activeWorkout || !activeWorkout.exercises[exIdx]) return;
    triggerHaptic('medium');
    activeWorkout.exercises.splice(exIdx, 1);
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Opens swap exercise modal to replace an occupied machine with an alternative.
 */
export function openSwapExerciseModal(exIdx) {
    triggerHaptic('medium');
    const ex = activeWorkout?.exercises?.[exIdx];
    if (!ex) return;

    const modalId = 'swap-exercise-modal';
    document.getElementById(modalId)?.remove();

    const category = ex.category;
    const sameCatExs = (state.gymExercises || []).filter(e => e.category === category && e.id !== ex.exercise_id);
    const otherCatExs = (state.gymExercises || []).filter(e => e.category !== category && e.id !== ex.exercise_id);

    const listHtml = `
        <div class="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 select-none font-sans">
            <p class="text-xs text-gray-300">Vyber náhradní cvik (např. při obsazeném stroji). Zapsané i plánované série zůstanou zachovány.</p>

            <div class="space-y-2">
                <div class="text-[9px] font-black uppercase text-[#faa61a] tracking-widest font-mono">Doporučené alternativy (${category})</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${sameCatExs.map(ae => `
                        <button onclick="window.Gym.swapExercise(${exIdx}, '${ae.id}'); document.getElementById('${modalId}').remove();" class="flex items-center gap-3 p-2.5 rounded-2xl bg-black/30 hover:bg-white/5 border border-white/5 hover:border-amber-400/30 text-left transition group">
                            ${getExerciseThumbnailHtml(ae, 'w-10 h-10 rounded-xl flex-shrink-0')}
                            <div class="min-w-0 flex-1">
                                <h4 class="text-xs font-bold text-white group-hover:text-amber-400 truncate">${ae.name}</h4>
                                <span class="text-[8px] text-gray-500 font-mono">${ae.category}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>

            ${otherCatExs.length > 0 ? `
                <div class="space-y-2 pt-2 border-t border-white/5">
                    <div class="text-[9px] font-black uppercase text-gray-500 tracking-widest font-mono">Ostatní cviky</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${otherCatExs.slice(0, 10).map(ae => `
                            <button onclick="window.Gym.swapExercise(${exIdx}, '${ae.id}'); document.getElementById('${modalId}').remove();" class="flex items-center gap-3 p-2.5 rounded-2xl bg-black/20 hover:bg-white/5 border border-white/5 text-left transition group">
                                ${getExerciseThumbnailHtml(ae, 'w-10 h-10 rounded-xl flex-shrink-0')}
                                <div class="min-w-0 flex-1">
                                    <h4 class="text-xs font-bold text-white group-hover:text-white truncate">${ae.name}</h4>
                                    <span class="text-[8px] text-gray-500 font-mono">${ae.category}</span>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: modalId,
        title: `Záměna: ${ex.name}`,
        subtitle: 'Nahradit jiným cvikem ze stejné partie 🔄',
        size: 'lg',
        content: listHtml,
        actions: `<button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider">Zrušit</button>`,
        onClose: `document.getElementById('${modalId}')?.remove()`
    }));

    document.getElementById(modalId)?.classList.remove('hidden');
    document.getElementById(modalId)?.classList.add('flex');
}

/**
 * Swaps an exercise with another exercise ID.
 */
export function swapExercise(exIdx, newExerciseId, renderGymFn) {
    if (!activeWorkout || !activeWorkout.exercises[exIdx]) return;
    triggerHaptic('medium');

    const newEx = (state.gymExercises || []).find(e => e.id === newExerciseId);
    if (!newEx) return;

    activeWorkout.exercises[exIdx].exercise_id = newEx.id;
    activeWorkout.exercises[exIdx].name = newEx.name;
    activeWorkout.exercises[exIdx].category = newEx.category;

    saveActiveWorkoutToStorage();
    showNotification(`Cvik byl zaměněn za „${newEx.name}“ 🔄`, 'success');
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Opens machine & equipment notes modal (seat height, pin, etc.).
 */
export function openExerciseNotesModal(exIdx) {
    triggerHaptic('medium');
    const ex = activeWorkout?.exercises?.[exIdx];
    if (!ex) return;

    const modalId = 'exercise-notes-modal';
    document.getElementById(modalId)?.remove();

    const curNote = ex.user_notes || localStorage.getItem(`kiscord_gym_notes_${ex.exercise_id}`) || '';

    const contentHtml = `
        <div class="space-y-4 font-sans select-none">
            <p class="text-xs text-gray-300">Ulož si trvalé poznámky k nastavení stroje pro <strong class="text-white">${ex.name}</strong> (např. výška sedáku, číslo kolíku, adaptér).</p>
            <div>
                <label class="text-[9px] font-black uppercase text-amber-400 tracking-wider block font-mono mb-1.5">Poznámka k nastavení</label>
                <input id="machine-note-input" type="text" value="${curNote}" placeholder="např. Sedák č. 3, kolík 8, široký úchop..." class="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-sans text-xs outline-none focus:border-amber-400 transition" />
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-between items-center w-full gap-2">
            <button onclick="window.Gym.saveExerciseNotes(${exIdx}, ''); document.getElementById('${modalId}').remove()" class="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wider">Smazat</button>
            <button onclick="window.Gym.saveExerciseNotes(${exIdx}, document.getElementById('machine-note-input').value); document.getElementById('${modalId}').remove()" class="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider">Uložit poznámku</button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: modalId,
        title: `Nastavení: ${ex.name}`,
        subtitle: 'Poznámky k vybavení & stroji 📝',
        size: 'md',
        content: contentHtml,
        actions: actionsHtml,
        onClose: `document.getElementById('${modalId}')?.remove()`
    }));

    document.getElementById(modalId)?.classList.remove('hidden');
    document.getElementById(modalId)?.classList.add('flex');
}

/**
 * Saves equipment / machine notes.
 */
export function saveExerciseNotes(exIdx, notes, renderGymFn) {
    if (!activeWorkout || !activeWorkout.exercises[exIdx]) return;
    triggerHaptic('light');

    const ex = activeWorkout.exercises[exIdx];
    ex.user_notes = notes;
    try {
        localStorage.setItem(`kiscord_gym_notes_${ex.exercise_id}`, notes);
    } catch (e) {}

    saveActiveWorkoutToStorage();
    showNotification('Poznámka k nastavení uložena 📝', 'success');
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Fills sets from last history session.
 */
export function fillSetsFromLastHistory(exIdx, renderGymFn) {
    if (!activeWorkout || !activeWorkout.exercises[exIdx]) return;
    triggerHaptic('medium');
    const ex = activeWorkout.exercises[exIdx];
    const history = getLastExerciseHistory(ex.exercise_id);
    if (!history || !history.sets || history.sets.length === 0) {
        showNotification('Nenalezena žádná předchozí historie pro tento cvik.', 'info');
        return;
    }

    history.sets.forEach((prevSet, sIdx) => {
        if (sIdx < ex.sets.length) {
            ex.sets[sIdx].weight = prevSet.weight;
            ex.sets[sIdx].reps = prevSet.reps;
        } else {
            ex.sets.push({
                weight: prevSet.weight,
                reps: prevSet.reps,
                completed: false,
                type: prevSet.type || 'N'
            });
        }
    });

    saveActiveWorkoutToStorage();
    showNotification(`Série vyplněny podle tréninku ze dne ${history.formattedDate} ⚡`, 'success');
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Cycles RIR (Reps in Reserve) for a set: null -> 0 -> 1 -> 2 -> 3 -> null.
 */
export function cycleSetRir(exIdx, setIdx, renderGymFn) {
    if (!activeWorkout || !activeWorkout.exercises[exIdx]?.sets[setIdx]) return;
    triggerHaptic('light');

    const s = activeWorkout.exercises[exIdx].sets[setIdx];
    if (s.rir === undefined || s.rir === null) s.rir = 2;
    else if (s.rir === 2) s.rir = 1;
    else if (s.rir === 1) s.rir = 0;
    else if (s.rir === 0) s.rir = 3;
    else s.rir = null;

    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}


/**
 * Increments round for Circuit or AMRAP mode.
 */
export function incrementWorkoutRound(renderGymFn) {
    if (!activeWorkout) return;
    triggerHaptic('success');
    if (activeWorkout.mode === 'amrap') {
        activeWorkout.amrapRoundsCompleted = (activeWorkout.amrapRoundsCompleted || 0) + 1;
        const el = document.getElementById('amrap-rounds-count');
        if (el) el.textContent = activeWorkout.amrapRoundsCompleted;
    } else if (activeWorkout.mode === 'circuit') {
        activeWorkout.currentRound = (activeWorkout.currentRound || 1) + 1;
        if (renderGymFn) renderGymFn();
    }
    saveActiveWorkoutToStorage();
}

/**
 * Decrements round for AMRAP mode.
 */
export function decrementWorkoutRound() {
    if (!activeWorkout || activeWorkout.mode !== 'amrap') return;
    triggerHaptic('light');
    activeWorkout.amrapRoundsCompleted = Math.max(0, (activeWorkout.amrapRoundsCompleted || 0) - 1);
    const el = document.getElementById('amrap-rounds-count');
    if (el) el.textContent = activeWorkout.amrapRoundsCompleted;
    saveActiveWorkoutToStorage();
}

/**
 * Toggles or cycles superset group for an exercise during an active workout (null -> 'A' -> 'B' -> null).
 */
export function toggleExerciseSuperset(exIdx, renderGymFn) {
    if (!activeWorkout || !activeWorkout.exercises[exIdx]) return;
    triggerHaptic('medium');

    const ex = activeWorkout.exercises[exIdx];
    const curGroup = ex.superset_group;
    if (!curGroup) ex.superset_group = 'A';
    else if (curGroup === 'A') ex.superset_group = 'B';
    else ex.superset_group = null;

    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}


export function minimizeWorkout(renderGymFn) {
    triggerHaptic('light');
    if (activeWorkout) {
        activeWorkout.isMinimized = true;
    }
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.remove('hidden');
    if (renderGymFn) renderGymFn();
}

export function restoreWorkout(renderGymFn) {
    triggerHaptic('medium');
    if (activeWorkout) {
        activeWorkout.isMinimized = false;
    }
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.add('hidden');
    if (renderGymFn) renderGymFn();
}

export function onSetInputChange(exIdx, setIdx, key, val) {
    if (!activeWorkout) return;
    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    if (key === 'weight') {
        setObj.weight = parseFloat(val) || 0;
    } else {
        setObj.reps = parseInt(val) || 0;
    }
    saveActiveWorkoutToStorage();
}

export function restoreWorkoutGlobal() {
    triggerHaptic('medium');
    if (activeWorkout) {
        activeWorkout.isMinimized = false;
    }
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.add('hidden');
    if (typeof window.switchChannel === 'function') {
        window.switchChannel('gym-tracker');
    } else {
        import('../../core/router.js').then(r => r.switchChannel('gym-tracker'));
    }
}

export function renderMinimizedBanner() {
    if (!activeWorkout || !activeWorkout.isMinimized) return '';

    let totalSets = 0;
    let completedSets = 0;
    activeWorkout.exercises.forEach(e => {
        totalSets += e.sets.length;
        completedSets += e.sets.filter(s => s.completed).length;
    });

    return `
        <div class="bg-gradient-to-r from-[#faa61a]/10 via-[#faa61a]/5 to-[#faa61a]/10 border border-[#faa61a]/20 p-4 rounded-3xl mb-6 flex justify-between items-center animate-pulse shadow-xl relative overflow-hidden select-none">
            <div class="absolute inset-0 bg-[#faa61a]/2 pointer-events-none"></div>
            <div class="flex items-center gap-3 relative z-10">
                <div class="w-10 h-10 rounded-xl bg-[#faa61a]/10 flex items-center justify-center text-xl text-[#faa61a] animate-bounce-slow">
                    ⚡
                </div>
                <div>
                    <span class="text-[9px] font-black uppercase text-white/40 tracking-widest block mb-0.5 font-sans">Probíhající trénink</span>
                    <h4 class="text-xs font-black text-white leading-tight mt-0.5">${activeWorkout.name} • Splněno ${completedSets} z ${totalSets} sérií</h4>
                </div>
            </div>
            
            <button onclick="window.Gym.restoreWorkout()" class="px-5 py-2.5 rounded-xl bg-[#faa61a] hover:bg-[#e09216] text-black font-black text-xs uppercase tracking-wider transition shadow-lg transform active:scale-95 relative z-10 flex items-center gap-1.5 font-sans">
                <i class="fas fa-expand-alt"></i> Otevřít trénink
            </button>
        </div>
    `;
}

export function cycleSetType(exIdx, setIdx, renderGymFn) {
    triggerHaptic('light');
    if (!activeWorkout) return;

    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    const currentType = setObj.type || 'N';
    let nextType = 'N';

    if (currentType === 'N') nextType = 'W';
    else if (currentType === 'W') nextType = 'D';
    else if (currentType === 'D') nextType = 'F';
    else if (currentType === 'F') nextType = 'N';

    setObj.type = nextType;
    saveActiveWorkoutToStorage();

    // DOM-only patch: update the type badge button without full re-render
    const badgeEl = document.querySelector(`#set-row-${exIdx}-${setIdx} .set-type-badge`);
    if (badgeEl) {
        badgeEl.outerHTML = getTypeBadgeHTML(exIdx, setIdx, setObj);
    } else if (renderGymFn) {
        // Fallback: if badge element not found, full re-render
        renderGymFn();
    }
}

/**
 * 2.3 – Applies a weight suggestion to all uncompleted working sets of an exercise.
 * Pure DOM update + state update, no full re-render.
 */
export function applyWeightSuggestion(exIdx, weight) {
    if (!activeWorkout) return;
    triggerHaptic('medium');

    const exercise = activeWorkout.exercises[exIdx];
    if (!exercise) return;

    exercise.sets.forEach((s, setIdx) => {
        if (!s.completed && s.type !== 'W') {
            s.weight = weight;
            // DOM patch: update input
            const input = document.getElementById(`weight-input-${exIdx}-${setIdx}`);
            if (input) input.value = weight;
        }
    });

    saveActiveWorkoutToStorage();
    showNotification(`\u2705 V\u00e1ha ${weight} kg aplikov\u00e1na na v\u0161echny s\u00e9rie`, 'success');
}

export function openAddExerciseToActiveWorkoutModal() {
    triggerHaptic('light');
    const exercises = state.gymExercises || [];
    const inWorkout = new Set((activeWorkout?.exercises || []).map(e => e.exercise_id));

    // Top 5 recently used exercises (from past logs)
    const recentlyUsed = [];
    const seen = new Set();
    for (const log of (state.gymLogs || []).filter(l => l.user_id === state.currentUser?.id).slice(0, 10)) {
        for (const ex of (log.exercises || [])) {
            if (!seen.has(ex.exercise_id) && !inWorkout.has(ex.exercise_id)) {
                const exMeta = exercises.find(e => e.id === ex.exercise_id);
                if (exMeta) { recentlyUsed.push(exMeta); seen.add(ex.exercise_id); }
            }
            if (recentlyUsed.length >= 4) break;
        }
        if (recentlyUsed.length >= 4) break;
    }

    const categories = ['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho'];
    const catEmojis = { 'Hrudník': '🦍', 'Záda': '🦅', 'Ramena': '🥥', 'Nohy': '🦵', 'Ruce': '💪', 'Břicho': '🍫' };

    const renderExItem = (ex) => `
        <div onclick="window.Gym.addExerciseToActiveWorkout('${ex.id}')" 
             class="exercise-select-item flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition select-none gap-3" 
             data-name="${ex.name.toLowerCase()}" 
             data-category="${ex.category.toLowerCase()}">
            <div class="flex items-center gap-2.5 min-w-0">
                ${getExerciseThumbnailHtml(ex, 'w-9 h-9')}
                <div class="min-w-0">
                    <span class="text-xs font-bold text-white block leading-snug truncate">${ex.name}</span>
                    <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                </div>
            </div>
            ${inWorkout.has(ex.id)
                ? `<span class="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg flex-shrink-0">✓ Přidáno</span>`
                : `<i class="fas fa-plus text-xs text-gray-500 hover:text-white transition flex-shrink-0"></i>`
            }
        </div>
    `;

    const contentHtml = `
        <div class="space-y-3 text-left">
            <!-- Search -->
            <input type="text" id="add-ex-search" placeholder="Hledat cvik..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition">
            
            <!-- Category chips -->
            <div class="flex flex-wrap gap-1.5" id="cat-chips">
                <button onclick="window.Gym.filterExByCat('')" class="cat-chip px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition bg-[#faa61a] text-black" data-cat="">Vše</button>
                ${categories.map(c => `<button onclick="window.Gym.filterExByCat('${c.toLowerCase()}')" class="cat-chip px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white" data-cat="${c.toLowerCase()}">${catEmojis[c]} ${c}</button>`).join('')}
            </div>

            ${recentlyUsed.length > 0 ? `
                <div>
                    <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">⚡ Naposledy použité</div>
                    <div class="flex flex-wrap gap-2">
                        ${recentlyUsed.map(ex => `
                            <button onclick="window.Gym.addExerciseToActiveWorkout('${ex.id}')" class="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-bold transition">
                                <span>${catEmojis[ex.category] || '🏋️'}</span>
                                <span class="truncate max-w-[100px]">${ex.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Exercise list -->
            <div class="max-h-52 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-2 custom-scrollbar space-y-1" id="add-ex-list">
                ${exercises.map(ex => renderExItem(ex)).join('')}
            </div>
        </div>
    `;
    
    const actionsHtml = `
        <div class="flex justify-end w-full">
            <button onclick="document.getElementById('add-exercise-to-active-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zavřít
            </button>
        </div>
    `;
    
    document.getElementById('add-exercise-to-active-modal')?.remove();
    
    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-exercise-to-active-modal',
        title: 'Přidat cvik do tréninku',
        subtitle: 'Zvolte libovolný cvik k okamžitému zařazení 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-exercise-to-active-modal').remove()"
    }));
    
    document.getElementById('add-exercise-to-active-modal').classList.remove('hidden');
    document.getElementById('add-exercise-to-active-modal').classList.add('flex');
}

export function addExerciseToActiveWorkout(exerciseId, renderGymFn) {
    triggerHaptic('success');
    document.getElementById('add-exercise-to-active-modal')?.remove();

    if (!activeWorkout) return;

    const ex = state.gymExercises.find(e => e.id === exerciseId);
    if (!ex) return;

    let prevLog = '';
    let lastCompletedSets = [];
    const pastLogs = state.gymLogs.filter(l => l.user_id === state.currentUser?.id);
    
    outerLoop:
    for (const log of pastLogs) {
        if (log.exercises) {
            for (const pastEx of log.exercises) {
                if (pastEx.exercise_id === exerciseId && pastEx.sets) {
                    const completed = pastEx.sets.filter(s => s.completed);
                    if (completed.length > 0) {
                        prevLog = `${completed[0].weight}kg x ${completed[0].reps}`;
                        lastCompletedSets = completed;
                        break outerLoop;
                    }
                }
            }
        }
    }

    const setsCount = lastCompletedSets.length > 0 ? lastCompletedSets.length : 3;
    const setsArray = [];
    for (let i = 0; i < setsCount; i++) {
        let w = 10;
        let r = 10;
        
        if (lastCompletedSets.length > 0) {
            const matchSet = lastCompletedSets[i];
            w = parseFloat(matchSet.weight) ?? w;
            r = parseInt(matchSet.reps) ?? r;
        }
        
        setsArray.push({
            weight: w,
            reps: r,
            completed: false,
            type: 'N'
        });
    }

    activeWorkout.exercises.push({
        exercise_id: exerciseId,
        name: ex.name,
        category: ex.category,
        prev: prevLog || '---',
        rest_seconds: 90,
        sets: setsArray
    });

    saveActiveWorkoutToStorage();
    showNotification(`Cvik "${ex.name}" byl zařazen do tréninku.`, 'success');
    if (renderGymFn) renderGymFn();
}

/**
 * Filters the exercise list in the quick-add modal by category chip.
 * Pure DOM manipulation – no re-render needed.
 */
export function filterExByCat(cat) {
    triggerHaptic('light');

    // Update chip styles
    document.querySelectorAll('.cat-chip').forEach(btn => {
        const isActive = btn.dataset.cat === cat;
        btn.className = `cat-chip px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
            isActive ? 'bg-[#faa61a] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
        }`;
    });

    // Filter list items
    document.querySelectorAll('#add-ex-list .exercise-select-item').forEach(el => {
        const itemCat = el.dataset.category || '';
        el.style.display = (!cat || itemCat === cat) ? '' : 'none';
    });
}
