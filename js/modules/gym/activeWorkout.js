import { supabase } from '../../core/supabase.js';
import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic, triggerConfetti, getTodayKey } from '../../core/utils.js';
import { playArcade } from '../../core/sound.js';
import { showNotification } from '../../core/theme.js';
import { renderModal } from '../../core/ui.js';
import {
    activeWorkout,
    setActiveWorkout,
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
    resumeWorkoutIntervals
} from './shared.js';

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
            sets: setsArray
        };
    });

    const newActiveWorkout = {
        templateId,
        name: template.name,
        startTime: new Date(),
        durationSeconds: 0,
        exercises: workoutExercises,
        isMinimized: false
    };

    setActiveWorkout(newActiveWorkout);
    saveActiveWorkoutToStorage();

    // Start Stopwatch & Rest timer intervals
    resumeWorkoutIntervals(() => tickRestTimer(renderGymFn));

    if (renderGymFn) renderGymFn();
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

    const restTimerHtml = `
        <div class="glass-card bg-[#202225]/85 backdrop-blur-md border ${isRestTimerRunning ? 'border-[#3ba55c]/30 shadow-[0_0_20px_rgba(59,165,92,0.15)]' : 'border-white/5'} rounded-3xl p-5 flex flex-col items-center justify-center max-w-sm mx-auto animate-fade-in relative overflow-hidden">
            ${isRestTimerRunning ? `<div class="absolute inset-0 bg-[#3ba55c]/2 animate-pulse-slow"></div>` : ''}
            
            <div class="relative z-10 flex justify-between items-center w-full mb-4 select-none">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/30">Odpočinek</span>
                <div class="flex gap-1">
                    <button onclick="window.Gym.setRestDuration(60)" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 60 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">60s</button>
                    <button onclick="window.Gym.setRestDuration(90)" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 90 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">90s</button>
                    <button onclick="window.Gym.setRestDuration(120)" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 120 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">120s</button>
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
                            style="filter: drop-shadow(0 0 4px ${isRestTimerRunning ? 'rgba(59,165,92,0.3)' : 'transparent'});" />
                </svg>
                
                <div class="absolute flex flex-col items-center justify-center select-none text-center">
                    <span id="rest-timer-countdown" class="font-mono text-2xl font-black ${countdownColorClass} leading-none tracking-tight">
                        ${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}
                    </span>
                    <span class="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-wider">cíl ${restTimeDuration}s</span>
                </div>
            </div>

            <div class="relative z-10 flex gap-2.5 select-none">
                <button onclick="window.Gym.toggleRestTimer()" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 transition-all transform active:scale-90" title="Spustit / Pauznout">
                    <i class="fas ${isRestTimerRunning ? 'fa-pause' : 'fa-play'} text-xs"></i>
                </button>
                <button onclick="window.Gym.resetRestTimer()" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/55 hover:text-white transition-all transform active:scale-90" title="Resetovat">
                    <i class="fas fa-undo text-xs"></i>
                </button>
            </div>
        </div>
    `;

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
                <div class="mb-6 z-20">
                    ${restTimerHtml}
                </div>

                <div class="max-w-4xl mx-auto space-y-5">
                    ${activeWorkout.exercises.map((e, exIdx) => {
                        const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === e.exercise_id);
                        const prWeight = existingPR ? parseFloat(existingPR.weight) : 0;

                        return `
                            <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 shadow-xl">
                                <div class="flex justify-between items-center mb-3">
                                    <div>
                                        <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-mono">${e.category}</span>
                                        <h3 class="text-sm font-black text-white leading-snug mt-1">${e.name}</h3>
                                    </div>
                                    <div class="text-right text-[10px] text-gray-500 font-bold font-mono select-none">
                                        Předchozí: <span class="text-[#faa61a]/80">${e.prev}</span>
                                    </div>
                                </div>

                                <div class="space-y-2 mt-4 font-mono select-none">
                                    ${e.sets.map((s, setIdx) => {
                                        const isPR = s.completed && s.type !== 'W' && s.weight > prWeight;

                                        return `
                                            <div id="set-row-${exIdx}-${setIdx}" class="flex items-center justify-between gap-3 p-2.5 rounded-2xl transition duration-150 ${s.completed ? 'bg-[#3ba55c]/10 border border-[#3ba55c]/25' : 'bg-black/20 border border-transparent'}">
                                                <div class="text-xs font-bold text-gray-400 w-16 flex items-center gap-1 select-none font-sans">
                                                    ${getTypeBadgeHTML(exIdx, setIdx, s)}
                                                    ${isPR ? `<span class="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-1 animate-bounce-slow flex items-center gap-0.5">🔥 PR</span>` : ''}
                                                </div>
                                                
                                                <div class="flex items-center gap-1">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', -5)" ${s.completed ? 'disabled' : ''} class="w-7 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] transition active:scale-75 items-center justify-center disabled:opacity-30 hidden sm:inline-flex">-5</button>
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', -1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">-1</button>
                                                    <input id="weight-input-${exIdx}-${setIdx}" type="number" step="0.5" value="${s.weight}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'weight', this.value)" class="w-12 bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', 1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">+1</button>
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', 5)" ${s.completed ? 'disabled' : ''} class="w-7 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] transition active:scale-75 items-center justify-center disabled:opacity-30 hidden sm:inline-flex">+5</button>
                                                    <span class="text-[10px] text-gray-500 font-bold ml-0.5">kg</span>
                                                </div>

                                                <div class="flex items-center gap-1">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', -1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-black text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">-</button>
                                                    <input id="reps-input-${exIdx}-${setIdx}" type="number" value="${s.reps}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'reps', this.value)" class="w-10 bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', 1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-black text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">+</button>
                                                    <span class="text-[10px] text-gray-500 font-bold ml-0.5">rep</span>
                                                </div>

                                                <button id="complete-btn-${exIdx}-${setIdx}" onclick="window.Gym.toggleSetComplete(${exIdx}, ${setIdx})" class="w-8 h-8 rounded-xl flex items-center justify-center transition-all ${s.completed ? 'bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/25 hover:bg-[#2d7d46]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}">
                                                    <i class="fas fa-check text-xs"></i>
                                                </button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                    
                    <div class="max-w-4xl mx-auto mb-6 px-1 select-none">
                        <button onclick="window.Gym.openAddExerciseToActiveWorkoutModal()" 
                                class="w-full py-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 hover:bg-white/5 hover:border-white/20 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
                            <i class="fas fa-plus text-[10px]"></i> Přidat cvik mimo šablonu
                        </button>
                    </div>

                    <div class="h-32 select-none pointer-events-none"></div>
                </div>
            </div>

            <div class="absolute bottom-0 left-0 right-0 p-4 bg-[#2f3136] border-t border-[#202225] flex justify-between gap-4 z-30 select-none">
                <button onclick="window.Gym.cancelWorkout()" class="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition transform active:scale-95 flex items-center gap-1.5">
                    <i class="fas fa-trash-alt text-[10px]"></i> Zahodit
                </button>
                
                <button onclick="window.Gym.minimizeWorkout()" class="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-yellow-400 hover:text-yellow-300 font-black text-xs uppercase tracking-widest transition transform active:scale-95 flex items-center gap-1.5">
                    <i class="fas fa-compress-alt text-[10px]"></i> Minimalizovat
                </button>
                
                <button onclick="window.Gym.finishWorkout()" class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-500/20 transform active:scale-[0.98] flex items-center justify-center gap-2">
                    <i class="fas fa-check-circle text-sm"></i> Uložit a dokončit trénink
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

export function toggleSetComplete(exIdx, setIdx, renderGymFn) {
    if (!activeWorkout) return;

    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    setObj.completed = !setObj.completed;

    let isNewPR = false;
    if (setObj.completed) {
        triggerHaptic('success');
        
        const exRest = activeWorkout.exercises[exIdx].rest_seconds || 90;
        setRestTimeDuration(exRest);
        startRestTimer(renderGymFn);

        const exId = activeWorkout.exercises[exIdx].exercise_id;
        const exName = activeWorkout.exercises[exIdx].name;
        const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === exId);
        
        if (setObj.weight > 0 && setObj.type !== 'W' && (!existingPR || setObj.weight > parseFloat(existingPR.weight))) {
            isNewPR = true;
            playArcade();
            triggerConfetti();
            setTimeout(() => triggerConfetti(), 400);
            showNotification(`🏆 NOVÝ OSOBNÍ REKORD na ${exName}: ${setObj.weight} kg! 🔥`, 'success');
        }
    } else {
        triggerHaptic('light');
    }

    const row = document.getElementById(`set-row-${exIdx}-${setIdx}`);
    if (row) {
        if (setObj.completed) {
            row.className = `flex items-center justify-between gap-3 p-2.5 rounded-2xl transition duration-150 bg-[#3ba55c]/10 border border-[#3ba55c]/25`;
        } else {
            row.className = `flex items-center justify-between gap-3 p-2.5 rounded-2xl transition duration-150 bg-black/20 border border-transparent`;
        }

        const controls = row.querySelectorAll(`input, button:not(#complete-btn-${exIdx}-${setIdx})`);
        controls.forEach(c => {
            if (setObj.completed) {
                c.setAttribute('disabled', 'true');
            } else {
                c.removeAttribute('disabled');
            }
        });

        const btn = document.getElementById(`complete-btn-${exIdx}-${setIdx}`);
        if (btn) {
            if (setObj.completed) {
                btn.className = `w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/25 hover:bg-[#2d7d46]`;
            } else {
                btn.className = `w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white`;
            }
        }

        const labelEl = row.querySelector('.text-xs.font-bold.text-gray-400');
        if (labelEl) {
            if (setObj.completed && isNewPR) {
                labelEl.innerHTML = `${getTypeBadgeHTML(exIdx, setIdx, setObj)} <span class="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-1 animate-bounce-slow flex items-center gap-0.5">🔥 PR</span>`;
            } else {
                labelEl.innerHTML = `${getTypeBadgeHTML(exIdx, setIdx, setObj)}`;
            }
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
    if (progBar) {
        progBar.style.width = `${percentage}%`;
    }
    saveActiveWorkoutToStorage();
}

export function setRestDuration(seconds, renderGymFn) {
    triggerHaptic('light');
    setRestTimeDuration(seconds);
    if (!isRestTimerRunning) {
        setRestTimeRemaining(seconds);
    }
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
}

export function startRestTimer(renderGymFn) {
    setRestTimeRemaining(restTimeDuration);
    setIsRestTimerRunning(true);
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
    } else {
        if (restTimeRemaining <= 0) {
            setRestTimeRemaining(restTimeDuration);
        }
        setIsRestTimerRunning(true);
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
    setRestTimeRemaining(restTimeDuration);
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
}

export function cancelWorkout(renderGymFn) {
    if (!confirm('Opravdu chceš zahodit tento běžící trénink? Všechny zapsané série se smažou.')) return;
    
    triggerHaptic('medium');
    cleanupWorkoutTimers();
    setActiveWorkout(null);
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
}

export async function finishWorkout(renderGymFn) {
    triggerHaptic('success');
    if (!activeWorkout) return;

    const loggedExercises = activeWorkout.exercises.map(e => ({
        exercise_id: e.exercise_id,
        exercise_name: e.name,
        sets: e.sets.map(s => ({
            weight: s.weight,
            reps: s.reps,
            completed: s.completed,
            type: s.type || 'N'
        }))
    })).filter(e => e.sets.some(s => s.completed));

    if (loggedExercises.length === 0) {
        showNotification('Nebyly splněny žádné série, trénink nelze uložit!', 'warning');
        return;
    }

    const todayStr = getTodayKey();

    try {
        const logData = {
            user_id: state.currentUser?.id,
            template_id: activeWorkout.templateId,
            name: activeWorkout.name,
            duration_seconds: activeWorkout.durationSeconds,
            date_key: todayStr,
            exercises: loggedExercises,
            cheers: []
        };

        const { data: newLogs, error: logErr } = await supabase
            .from('gym_logs')
            .insert(logData)
            .select();

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
                    
                    showNotification(`🏆 NOVÝ OSOBNÍ REKORD na ${ex.exercise_name}: ${maxCompletedSet.weight} kg!`, 'success');

                    import('../achievements.js').then(m => {
                        m.autoUnlock('pr_breaker');
                    });
                }
            }
        }

        triggerConfetti();
        triggerHaptic('success');
        showNotification('Trénink uložen! Získali jste +20 XP do společného levelu! 🎉💪', 'success');

        cleanupWorkoutTimers();
        setActiveWorkout(null);
        saveActiveWorkoutToStorage();

        await ensureGymData(true);
        import('../../core/state.js').then(s => s.initializeState());

        import('../achievements.js').then(m => {
            const myLogsCount = state.gymLogs.filter(l => l.user_id === state.currentUser?.id).length;
            if (myLogsCount >= 10) m.autoUnlock('gym_rat');

            const partnerLogsToday = state.gymLogs.filter(l => l.user_id !== state.currentUser?.id && l.date_key === todayStr);
            if (partnerLogsToday.length > 0) {
                m.autoUnlock('synchro_gym');
            }
        });

        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Finish workout failed:", e);
        showNotification('Chyba při ukládání tréninku: ' + e.message, 'danger');
    }
}

export function minimizeWorkout(renderGymFn) {
    triggerHaptic('light');
    if (activeWorkout) {
        activeWorkout.isMinimized = true;
    }
    saveActiveWorkoutToStorage();
    if (renderGymFn) renderGymFn();
}

export function restoreWorkout(renderGymFn) {
    triggerHaptic('medium');
    if (activeWorkout) {
        activeWorkout.isMinimized = false;
    }
    saveActiveWorkoutToStorage();
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
    if (renderGymFn) renderGymFn();
}

export function openAddExerciseToActiveWorkoutModal() {
    triggerHaptic('light');
    const exercises = state.gymExercises || [];
    
    const contentHtml = `
        <div class="space-y-4 text-left">
            <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition mb-2">
            <div class="max-h-60 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2">
                ${exercises.map(ex => `
                    <div onclick="window.Gym.addExerciseToActiveWorkout('${ex.id}')" 
                         class="exercise-select-item flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition select-none" 
                         data-name="${ex.name.toLowerCase()}" 
                         data-category="${ex.category.toLowerCase()}">
                        <div>
                            <span class="text-xs font-bold text-white block leading-snug">${ex.name}</span>
                            <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                        </div>
                        <i class="fas fa-plus text-xs text-gray-500 hover:text-white transition"></i>
                    </div>
                `).join('')}
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
