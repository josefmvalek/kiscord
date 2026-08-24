import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { supabase } from '@core/supabase.js';
import { calculate1RM } from './tools.js';

// ==========================================
// VOLUME LOAD & TONNAGE ANALYTICS
// ==========================================

/**
 * Calculates total volume load (kg / tons) per week for a user.
 */
export function calculateWeeklyVolume(userId, weeksBack = 8) {
    const uid = userId || state.currentUser?.id;
    const logs = (state.gymLogs || []).filter(l => l.user_id === uid);

    const now = new Date();
    const weeksData = [];

    for (let w = weeksBack - 1; w >= 0; w--) {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) - (w * 7));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const startStr = startOfWeek.toISOString().slice(0, 10);
        const endStr = endOfWeek.toISOString().slice(0, 10);

        const weekLogs = logs.filter(l => l.date_key >= startStr && l.date_key <= endStr);

        let totalVolumeKg = 0;
        let totalSetsCount = 0;

        weekLogs.forEach(l => {
            (l.exercises || []).forEach(ex => {
                (ex.sets || []).forEach(s => {
                    if (s.completed && s.type !== 'W') {
                        const weight = parseFloat(s.weight) || 0;
                        const reps = parseInt(s.reps) || 0;
                        totalVolumeKg += weight * reps;
                        totalSetsCount++;
                    }
                });
            });
        });

        const label = `${startOfWeek.getDate()}.${startOfWeek.getMonth() + 1}.`;
        weeksData.push({
            startStr,
            endStr,
            label,
            volumeKg: Math.round(totalVolumeKg),
            tons: Math.round((totalVolumeKg / 1000) * 10) / 10,
            setsCount: totalSetsCount,
            logsCount: weekLogs.length
        });
    }

    const currentWeek = weeksData[weeksData.length - 1];
    const prevWeek = weeksData[weeksData.length - 2] || { volumeKg: 0 };
    const diffPercent = prevWeek.volumeKg > 0 
        ? Math.round(((currentWeek.volumeKg - prevWeek.volumeKg) / prevWeek.volumeKg) * 100) 
        : 0;

    return {
        currentWeek,
        prevWeek,
        diffPercent,
        weeks: weeksData
    };
}

// ==========================================
// MUSCLE BALANCE & SVALOVÁ MAPA
// ==========================================

export const MUSCLE_CATEGORIES = [
    { id: 'Hrudník', emoji: '🦍', color: '#3b82f6', bgClass: 'bg-blue-500' },
    { id: 'Záda', emoji: '🦅', color: '#10b981', bgClass: 'bg-emerald-500' },
    { id: 'Nohy', emoji: '🦵', color: '#f59e0b', bgClass: 'bg-amber-500' },
    { id: 'Ramena', emoji: '🥥', color: '#8b5cf6', bgClass: 'bg-purple-500' },
    { id: 'Biceps', emoji: '💪', color: '#ec4899', bgClass: 'bg-pink-500' },
    { id: 'Triceps', emoji: '⚡', color: '#06b6d4', bgClass: 'bg-cyan-500' },
    { id: 'Břicho', emoji: '🍫', color: '#ef4444', bgClass: 'bg-red-500' }
];

/**
 * Calculates set distribution across muscle categories for the last N days.
 */
export function calculateMuscleBalance(userId, daysBack = 7) {
    const uid = userId || state.currentUser?.id;
    const logs = (state.gymLogs || []).filter(l => l.user_id === uid);
    const exercises = state.gymExercises || [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    const recentLogs = logs.filter(l => l.date_key >= cutoffStr);

    const categorySets = {};
    MUSCLE_CATEGORIES.forEach(c => { categorySets[c.id] = 0; });

    let totalCompletedSets = 0;

    recentLogs.forEach(log => {
        (log.exercises || []).forEach(ex => {
            const exMeta = exercises.find(e => e.id === ex.exercise_id);
            const category = exMeta?.category || 'Hrudník';

            const completedSets = (ex.sets || []).filter(s => s.completed && s.type !== 'W').length;
            if (completedSets > 0) {
                if (categorySets[category] !== undefined) {
                    categorySets[category] += completedSets;
                } else {
                    categorySets[category] = completedSets;
                }
                totalCompletedSets += completedSets;
            }
        });
    });

    const breakdown = MUSCLE_CATEGORIES.map(cat => {
        const sets = categorySets[cat.id] || 0;
        const percentage = totalCompletedSets > 0 ? Math.round((sets / totalCompletedSets) * 100) : 0;
        return {
            ...cat,
            sets,
            percentage
        };
    }).sort((a, b) => b.sets - a.sets);

    // Identify neglected muscle groups (< 2 sets in the week)
    const neglected = breakdown.filter(b => b.sets === 0);

    return {
        totalSets: totalCompletedSets,
        breakdown,
        neglected,
        daysBack
    };
}

// ==========================================
// EXERCISE PROGRESSION & 1RM HISTORY
// ==========================================

/**
 * Returns historical logs for a specific exercise with 1RM and volume trends.
 */
export function getExerciseProgression(exerciseId, userId) {
    const uid = userId || state.currentUser?.id;
    const logs = (state.gymLogs || []).filter(l => l.user_id === uid);

    const history = [];

    logs.forEach(log => {
        const ex = (log.exercises || []).find(e => e.exercise_id === exerciseId);
        if (ex && ex.sets && ex.sets.length > 0) {
            const completedSets = ex.sets.filter(s => s.completed && s.type !== 'W');
            if (completedSets.length > 0) {
                const maxWeight = completedSets.reduce((max, s) => Math.max(max, s.weight || 0), 0);
                const max1RM = completedSets.reduce((max, s) => Math.max(max, calculate1RM(s.weight, s.reps)), 0);
                const volumeKg = completedSets.reduce((acc, s) => acc + ((s.weight || 0) * (s.reps || 0)), 0);

                history.push({
                    dateKey: log.date_key,
                    workoutName: log.name,
                    maxWeight,
                    estimated1RM: max1RM,
                    volumeKg,
                    setsCount: completedSets.length,
                    sets: completedSets
                });
            }
        }
    });

    // Sort chronologically ascending
    return history.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

// ==========================================
// TEMPLATE CLONING & PARTNER SYNC
// ==========================================

/**
 * Clones a template from partner or default templates to currentUser's templates.
 */
export async function cloneTemplate(templateId, scaleRatio = 1.0, customName = null) {
    triggerHaptic('medium');
    await ensureGymData();

    const tmpl = (state.gymTemplates || []).find(t => t.id === templateId);
    if (!tmpl) {
        showNotification('Šablona nebyla nalezena!', 'danger');
        return;
    }

    const clonedExercises = (tmpl.exercises || []).map(e => ({
        exercise_id: e.exercise_id,
        sets: e.sets || 3,
        reps: e.reps || 10,
        weight: e.weight ? Math.round((e.weight * scaleRatio) / 0.5) * 0.5 : 0
    }));

    const newName = customName || `${tmpl.name} (Kopie)`;

    const newTemplateData = {
        name: newName,
        exercises: clonedExercises
    };

    try {
        const { data: created, error } = await supabase
            .from('gym_templates')
            .insert(newTemplateData)
            .select();

        if (error) throw error;

        const insertedTmpl = { ...newTemplateData, ...(created?.[0] || {}) };
        if (!state.gymTemplates) state.gymTemplates = [];
        state.gymTemplates.push(insertedTmpl);

        triggerConfetti();
        showNotification(`Šablona „${newName}“ byla úspěšně naklonována! 📋✨`, 'success');

        await ensureGymData(true);
        if (typeof window !== 'undefined' && window.Gym && window.Gym.renderGym) {
            window.Gym.renderGym();
        }
    } catch (err) {
        console.error('Template clone error:', err);
        showNotification('Chyba při klonování šablony: ' + err.message, 'danger');
    }
}

// ==========================================
// GHOST DATA / LAST EXERCISE PERFORMANCE
// ==========================================

/**
 * Finds the most recent completed performance for an exercise by a user.
 * @param {string} exerciseId 
 * @param {string} userId 
 * @returns {object|null} { dateKey, formattedDate, sets: [{ weight, reps, duration_seconds, distance_km, type, rir }] }
 */
export function getLastExerciseHistory(exerciseId, userId = null) {
    const targetUserId = userId || state.currentUser?.id;
    const logs = state.gymLogs || [];

    // Sort logs descending by date/logged_at
    const sortedLogs = [...logs]
        .filter(l => l.user_id === targetUserId)
        .sort((a, b) => (b.date_key || '').localeCompare(a.date_key || ''));

    for (const log of sortedLogs) {
        const foundEx = (log.exercises || []).find(e => e.exercise_id === exerciseId || e.name === exerciseId);
        if (foundEx && foundEx.sets && foundEx.sets.some(s => s.completed)) {
            const completedSets = foundEx.sets.filter(s => s.completed);
            const d = new Date(log.logged_at || log.date_key);
            const formattedDate = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });

            return {
                dateKey: log.date_key,
                formattedDate,
                sets: completedSets
            };
        }
    }

    return null;
}

