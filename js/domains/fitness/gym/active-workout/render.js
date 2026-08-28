import { state } from '@core/state.js';
import {
    activeWorkout,
    getTypeBadgeHTML,
    restTimeDuration,
    restTimeRemaining,
    isRestTimerRunning
} from '../shared.js';
import { getExerciseTargetSuggestion } from '../tools.js';
import { getLastExerciseHistory } from '../analytics.js';
import { getExerciseThumbnailHtml } from '../exercises.js';

export function getActiveWorkout() {
    return activeWorkout;
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
        <div id="rest-timer-card" class="bg-[#202225]/90 backdrop-blur-md border border-[#3ba55c]/30 shadow-[0_0_20px_rgba(59,165,92,0.15)] rounded-3xl p-5 flex flex-col items-center justify-center max-w-sm mx-auto animate-fade-in relative overflow-hidden">
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
                    <button id="checklist-btn-creatine" onclick="window.Gym.toggleWorkoutChecklistItem('creatine')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.creatine) ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>💊 Kreatin</span> ${(activeWorkout.checklist?.creatine) ? '✓' : ''}
                    </button>
                    <button id="checklist-btn-preworkout" onclick="window.Gym.toggleWorkoutChecklistItem('preworkout')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.preworkout) ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>⚡ Pre-workout</span> ${(activeWorkout.checklist?.preworkout) ? '✓' : ''}
                    </button>
                    <button id="checklist-btn-water" onclick="window.Gym.toggleWorkoutChecklistItem('water')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.water) ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>💧 1.5L Voda</span> ${(activeWorkout.checklist?.water) ? '✓' : ''}
                    </button>
                    <button id="checklist-btn-protein" onclick="window.Gym.toggleWorkoutChecklistItem('protein')" class="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 flex-shrink-0 ${(activeWorkout.checklist?.protein) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400 hover:text-white'}">
                        <span>🥤 Protein</span> ${(activeWorkout.checklist?.protein) ? '✓' : ''}
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
                        const overloadSuggestion = getExerciseTargetSuggestion(e.exercise_id);
                        const exMeta = (state.gymExercises || []).find(ge => ge.id === e.exercise_id) || { id: e.exercise_id, name: e.name, category: e.category };
                        const isSuperset = !!e.superset_group;
                        const lastHistory = getLastExerciseHistory(e.exercise_id);
                        const exNotes = e.user_notes || localStorage.getItem(`kiscord_gym_notes_${e.exercise_id}`) || '';

                        return `
                            <div id="active-exercise-card-${exIdx}" class="${isSuperset ? 'border-l-4 border-l-purple-500 bg-[#202225]/75 border-y border-r border-white/5' : 'border-l-4 border-l-[#faa61a] bg-[#202225]/75 border-y border-r border-white/5'} rounded-3xl p-3.5 sm:p-5 shadow-xl">
                                <!-- Row 1: Thumbnail + Title + Reorder/Tools -->
                                <div class="flex items-center justify-between gap-2 mb-2.5">
                                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                        ${getExerciseThumbnailHtml(exMeta, 'w-10 h-10 rounded-xl flex-shrink-0')}
                                        <div class="min-w-0 flex-1">
                                            <h3 class="text-sm font-black text-white leading-tight truncate cursor-pointer hover:text-amber-400 transition" onclick="window.Gym.openExerciseGuideModal('${e.exercise_id}')" title="Zobrazit techniku cviku">${e.name}</h3>
                                            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono">${e.category}</span>
                                                <span id="active-exercise-sets-count-${exIdx}" class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono">${e.sets.length} sérií</span>
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
                                <div class="grid grid-cols-12 gap-1 sm:gap-1.5 px-1 sm:px-2 py-1 text-[8px] font-black uppercase text-gray-400 tracking-wider font-mono select-none">
                                    <div class="col-span-2 text-center">Série</div>
                                    <div class="col-span-4 text-center">Váha (kg)</div>
                                    <div class="col-span-3 text-center">Opak.</div>
                                    <div class="col-span-3 text-center">Stav</div>
                                </div>

                                <!-- Set Rows with Ghost History -->
                                <div id="active-exercise-sets-${exIdx}" class="space-y-1.5 font-mono select-none">
                                    ${e.sets.map((s, setIdx) => renderActiveSetRowHtml(exIdx, setIdx, s, lastHistory, prWeight)).join('')}
                                </div>

                                <!-- Exercise Footer Toolbar (Add Set & Quick Weight Chips) -->
                                <div class="flex items-center justify-between gap-2 pt-2.5 pb-0.5 px-1 mt-1.5 border-t border-white/5 select-none flex-wrap">
                                    <button type="button" onclick="window.Gym.addSetToActiveExercise(${exIdx})" class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#faa61a]/15 text-gray-300 hover:text-[#faa61a] border border-white/5 hover:border-[#faa61a]/30 transition text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active-pop shadow-sm" title="Přidat další sérii k tomuto cviku">
                                        <i class="fas fa-plus text-[8px]"></i> <span>Přidat sérii</span>
                                    </button>
                                    <div class="flex items-center gap-1 ml-auto">
                                        <span class="text-[8px] font-black uppercase tracking-wider text-gray-500 font-mono hidden sm:inline">⚡ Rychlá váha:</span>
                                        <button type="button" onclick="window.Gym.adjustActiveExerciseWeight(${exIdx}, -2)" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-mono text-[9px] font-bold transition active-pop">-2</button>
                                        <button type="button" onclick="window.Gym.adjustActiveExerciseWeight(${exIdx}, 1)" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-amber-300 font-mono text-[9px] font-bold transition active-pop">+1</button>
                                        <button type="button" onclick="window.Gym.adjustActiveExerciseWeight(${exIdx}, 2)" class="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold transition active-pop">+2</button>
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

/**
 * Renders a single active workout set row HTML for fine-grained DOM patching.
 */
export function renderActiveSetRowHtml(exIdx, setIdx, s, lastHistory = null, prWeight = 0) {
    const isPR = s.completed && s.type !== 'W' && s.weight > prWeight;
    const lastSet = lastHistory?.sets?.[setIdx];
    const rirLabel = (s.rir !== undefined && s.rir !== null) ? `RIR ${s.rir}` : null;

    return `
        <div id="set-row-${exIdx}-${setIdx}" class="grid grid-cols-12 items-center gap-1 sm:gap-1.5 p-1.5 rounded-2xl transition duration-150 ${s.completed ? 'bg-[#3ba55c]/10 border border-[#3ba55c]/25' : 'bg-black/25 border-y border-r border-white/5 border-l-[3px] border-l-[#faa61a]'}">
            <!-- Col 1: Set Type / Nr / RIR -->
            <div class="col-span-2 flex flex-col items-center justify-center min-w-0">
                <div class="flex items-center gap-0.5">
                    ${getTypeBadgeHTML(exIdx, setIdx, s)}
                    ${isPR ? `<span class="text-[8px] font-black text-amber-400" title="Nový PR rekord!">🔥</span>` : ''}
                </div>
                <button id="rir-btn-${exIdx}-${setIdx}" onclick="window.Gym.cycleSetRir(${exIdx}, ${setIdx})" class="text-[7.5px] font-mono font-bold mt-0.5 px-1 rounded transition ${rirLabel ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300'}" title="Reps in Reserve (RIR / Úsilí)">
                    ${rirLabel || 'RIR -'}
                </button>
            </div>
            
            <!-- Col 2: Weight Stepper (High contrast & Ghost data) -->
            <div class="col-span-4 flex flex-col items-center justify-center">
                <div class="w-full flex items-center justify-center bg-black/40 border border-white/10 rounded-xl p-0.5 shadow-inner">
                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', -1)" ${s.completed ? 'disabled' : ''} class="w-6 sm:w-7 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">−</button>
                    <input id="weight-input-${exIdx}-${setIdx}" type="number" inputmode="decimal" step="0.5" value="${s.weight}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'weight', this.value)" class="flex-1 min-w-0 h-8 bg-transparent text-center text-xs sm:text-sm font-mono font-black text-white outline-none focus:text-amber-400 disabled:opacity-50">
                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', 1)" ${s.completed ? 'disabled' : ''} class="w-6 sm:w-7 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">+</button>
                </div>
                ${lastSet ? `<span class="text-[7.5px] font-mono text-gray-400 block text-center leading-none mt-1 truncate max-w-full">Min: ${lastSet.weight}kg</span>` : ''}
            </div>

            <!-- Col 3: Reps Stepper (High contrast & Ghost data) -->
            <div class="col-span-3 flex flex-col items-center justify-center">
                <div class="w-full flex items-center justify-center bg-black/40 border border-white/10 rounded-xl p-0.5 shadow-inner">
                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', -1)" ${s.completed ? 'disabled' : ''} class="w-5 sm:w-6 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">−</button>
                    <input id="reps-input-${exIdx}-${setIdx}" type="number" inputmode="numeric" value="${s.reps}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'reps', this.value)" class="flex-1 min-w-0 h-8 bg-transparent text-center text-xs sm:text-sm font-mono font-black text-white outline-none focus:text-amber-400 disabled:opacity-50">
                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', 1)" ${s.completed ? 'disabled' : ''} class="w-5 sm:w-6 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-20 transition">+</button>
                </div>
                ${lastSet ? `<span class="text-[7.5px] font-mono text-gray-400 block text-center leading-none mt-1 truncate max-w-full">× ${lastSet.reps}</span>` : ''}
            </div>

            <!-- Col 4: Status & Actions (Complete Button & Remove Button) -->
            <div class="col-span-3 flex items-center justify-center gap-1 sm:gap-1.5">
                <button id="complete-btn-${exIdx}-${setIdx}" onclick="window.Gym.toggleSetComplete(${exIdx}, ${setIdx})" class="flex-1 max-w-[44px] sm:max-w-[48px] h-8 sm:h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${s.completed ? 'bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/25 hover:bg-[#2d7d46]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'}" title="${s.completed ? 'Označit jako nesplněné' : 'Splněno!'}">
                    <i class="fas fa-check text-xs"></i>
                </button>
                <button type="button" onclick="window.Gym.removeSetFromActiveExercise(${exIdx}, ${setIdx})" ${s.completed ? 'disabled' : ''} class="w-6 h-8 sm:h-9 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition flex items-center justify-center text-[10px] disabled:opacity-20 flex-shrink-0 active-pop" title="Smazat tuto sérii">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
}

