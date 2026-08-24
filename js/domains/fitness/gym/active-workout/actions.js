import { supabase } from '@core/supabase.js';
import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic, triggerConfetti, getTodayKey } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal } from '@core/ui.js';
import {
    activeWorkout,
    loadActiveWorkoutFromStorage,
    saveActiveWorkoutToStorage,
    getTypeBadgeHTML
} from '../shared.js';
import { calculate1RM, openPlateCalculatorModal, openWarmupModal, getExerciseTargetSuggestion } from '../tools.js';
import { getLastExerciseHistory } from '../analytics.js';
import { getExerciseThumbnailHtml, openExerciseGuideModal } from '../exercises.js';
import { startRestTimer } from './timer.js';

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
