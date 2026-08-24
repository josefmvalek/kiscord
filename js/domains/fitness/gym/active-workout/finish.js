import { supabase } from '@core/supabase.js';
import { safeInsert } from '@core/offline.js';
import { state, ensureGymData, awardLoveCoinsToCurrentUser } from '@core/state.js';
import { triggerHaptic, triggerConfetti, getTodayKey } from '@core/utils.js';
import { playArcade, playChime } from '@core/sound.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal } from '@core/ui.js';
import { isSyncWorkoutDay } from '../coupleGym.js';
import {
    activeWorkout,
    setActiveWorkout,
    loadActiveWorkoutFromStorage,
    saveActiveWorkoutToStorage,
    cleanupWorkoutTimers,
    setStopwatchInterval,
    resumeWorkoutIntervals
} from '../shared.js';
import { calculate1RM } from '../tools.js';

export let currentWorkoutPhotoBase64 = null;

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

                    import('@domains/entertainment/achievements.js').then(m => {
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
        import('@domains/fitness/health.js').then(async h => {
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
        import('@core/state.js').then(s => s.initializeState());

        import('@domains/entertainment/achievements.js').then(m => {
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
