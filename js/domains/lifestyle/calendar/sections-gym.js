/**
 * Gym & Workout Logs/Plans Section for Calendar Day Modal
 */

import { state } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { showConfirmDialog, showNotification } from '@core/theme.js';
import { supabase } from '@core/supabase.js';
import { getActiveSplitForDay } from '@domains/fitness/gym/splits.js';

export async function openGymLog(dateKey) {
    const { closeDayModal } = await import('./day-modal.js');
    closeDayModal();
    const { ensureGymData } = await import('@core/state.js');
    await ensureGymData();
    const m = await import('@domains/fitness/gym/index.js');
    if (m.attachWindowGym) m.attachWindowGym();
    await m.openManualLogModal(null, dateKey);
}

export async function openGymSchedule(dateKey) {
    const { closeDayModal } = await import('./day-modal.js');
    const { ensureGymData, state } = await import('@core/state.js');
    await ensureGymData();
    const templates = state.gymTemplates || [];
    if (templates.length === 0) {
        showNotification('Nejprve si vytvoř tréninkový plán v Posilovně!', 'info');
        closeDayModal();
        window.switchChannel('gym-tracker');
        return;
    }
    closeDayModal();
    const m = await import('@domains/fitness/gym/index.js');
    if (m.attachWindowGym) m.attachWindowGym();
    await m.openScheduleTemplateModal(templates[0].id, dateKey);
}

export async function openEditGymLog(logId, dateKey) {
    const { closeDayModal } = await import('./day-modal.js');
    closeDayModal();
    const { ensureGymData } = await import('@core/state.js');
    await ensureGymData();
    const m = await import('@domains/fitness/gym/index.js');
    if (m.attachWindowGym) m.attachWindowGym();
    await m.openEditGymLogModal(logId, dateKey);
}

export async function deleteGymLog(logId, dateKey) {
    triggerHaptic('medium');
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento zaznamenaný trénink?', 'Smazat', 'Zrušit');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('gym_logs').delete().eq('id', logId);
        if (error) throw error;

        await supabase.from('gym_prs').delete().eq('log_id', logId);

        state.gymLogs = (state.gymLogs || []).filter(l => l.id !== logId);
        state.gymPRs = (state.gymPRs || []).filter(p => p.log_id !== logId);

        showNotification('Trénink byl smazán.', 'info');
        window.dispatchEvent(new CustomEvent('gym-logs-updated', { detail: { dateKey } }));

        const { showDayDetail } = await import('./day-modal.js');
        const { renderCalendar } = await import('./index.js');
        showDayDetail(dateKey);
        renderCalendar();
    } catch (err) {
        console.error('Failed to delete gym log:', err);
        showNotification('Chyba při mazání tréninku: ' + err.message, 'danger');
    }
}

export async function deleteGymPlan(planId, dateKey) {
    triggerHaptic('medium');
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento naplánovaný trénink z kalendáře?', 'Smazat', 'Zrušit');
    if (!confirmed) return;

    try {
        let query = supabase.from('planned_dates').delete();
        if (planId) {
            query = query.eq('id', planId);
        } else {
            query = query.eq('date_key', dateKey);
        }
        const { error } = await query;
        if (error) throw error;

        if (state.plannedDates) {
            delete state.plannedDates[dateKey];
        }

        showNotification('Naplánovaný trénink byl odstraněn.', 'info');
        window.dispatchEvent(new CustomEvent('planned-dates-updated', {
            detail: { payload: { eventType: 'DELETE', old: { date_key: dateKey, id: planId } } }
        }));

        const { showDayDetail } = await import('./day-modal.js');
        const { renderCalendar } = await import('./index.js');
        showDayDetail(dateKey);
        renderCalendar();
    } catch (err) {
        console.error('Failed to delete gym plan:', err);
        showNotification('Chyba při mazání plánu: ' + err.message, 'danger');
    }
}

export function renderGymSectionHtml(dateKey) {
    const gymLogs = (state.gymLogs || []).filter(l => l.date_key === dateKey);
    const plannedDate = (state.plannedDates || {})[dateKey];
    const isPlannedGym = plannedDate && (plannedDate.cat === 'gym' || (plannedDate.name || '').toLowerCase().includes('posilov') || (plannedDate.name || '').toLowerCase().includes('trénink') || (plannedDate.name || '').toLowerCase().includes('fitko'));
    const isToday = dateKey === getTodayKey();

    let logsHtml = '';
    if (gymLogs.length > 0) {
        logsHtml = gymLogs.map(log => {
            const isMe = log.user_id === state.currentUser?.id;
            const userName = isMe ? (state.currentUser?.name || 'Já') : (state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka');
            const userAvatar = (log.user_id === state.user_ids?.jose || (!isMe && state.currentUser?.name !== 'Jožka')) ? '🦝' : '👸';
            const userColor = (log.user_id === state.user_ids?.jose || (!isMe && state.currentUser?.name !== 'Jožka')) ? 'text-blue-300' : 'text-pink-300';
            const durationMin = Math.round((log.duration_seconds || 0) / 60);

            // Exercise summary
            const exercises = log.exercises || [];
            const exSummary = exercises.map(ex => {
                const completedSets = (ex.sets || []).filter(s => s.completed);
                if (completedSets.length === 0) return '';
                const count = completedSets.length;
                const setsWord = (count >= 1 && count <= 4) ? 'série' : 'sérií';

                const allSame = completedSets.every(s => s.weight === completedSets[0].weight && s.reps === completedSets[0].reps);

                let setsContentHtml = '';
                if (allSame && count > 1) {
                    const first = completedSets[0];
                    const weightStr = first.weight > 0 ? `${first.weight} kg` : 'Vlastní váha';
                    setsContentHtml = `
                        <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono font-bold text-amber-300">
                                ${count}× ${weightStr} × ${first.reps} op.
                            </span>
                        </div>
                    `;
                } else {
                    setsContentHtml = `
                        <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                            ${completedSets.map((s) => {
                                const weightStr = s.weight > 0 ? `${s.weight}kg` : 'BW';
                                return `
                                    <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono font-bold text-amber-300">
                                        ${weightStr} × ${s.reps}
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    `;
                }

                return `
                    <div class="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                        <div class="flex justify-between items-center gap-2">
                            <span class="font-bold text-gray-100 text-xs leading-snug">${ex.exercise_name || ex.exercise_id}</span>
                            <span class="text-[10px] text-[#faa61a] font-mono font-bold bg-[#faa61a]/10 border border-[#faa61a]/20 px-2 py-0.5 rounded-lg flex-shrink-0">
                                ${count} ${setsWord}
                            </span>
                        </div>
                        ${setsContentHtml}
                    </div>
                `;
            }).filter(Boolean).join('');

            // PRs achieved
            const prs = (state.gymPRs || []).filter(p => p.log_id === log.id || (p.achieved_at && p.achieved_at.startsWith(dateKey) && p.user_id === log.user_id));
            const prsHtml = prs.length > 0 ? `
                <div class="mt-2 flex flex-wrap gap-1.5">
                    ${prs.map(pr => {
                        const exObj = (state.gymExercises || []).find(e => e.id === pr.exercise_id);
                        return `
                            <div class="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                <span>🏆 PR:</span>
                                <span>${exObj?.name || pr.exercise_id}</span>
                                <span class="font-bold font-mono text-white">${pr.weight} kg</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '';

            return `
                <div class="bg-gradient-to-br from-[#faa61a]/10 to-transparent border border-[#faa61a]/30 rounded-xl p-3.5 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-base">${userAvatar}</span>
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[10px] font-black ${userColor} uppercase tracking-wider">${userName}</span>
                                    ${durationMin > 0 ? `<span class="text-[9px] text-gray-400 font-mono">⏱️ ${durationMin} min</span>` : ''}
                                </div>
                                <h5 class="text-xs font-black text-white uppercase tracking-tight">${log.name}</h5>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            ${(log.cheers && log.cheers.length > 0) ? `
                                <span class="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-amber-400 text-[10px] font-bold">
                                    💪 ${log.cheers.length}
                                </span>
                            ` : ''}
                            ${(isMe || !log.user_id) ? `
                                <button onclick="Calendar.openEditGymLog('${log.id}', '${dateKey}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-amber-400 hover:bg-amber-400/10 transition" title="Upravit trénink">
                                    <i class="fas fa-pencil-alt text-[10px]"></i>
                                </button>
                                <button onclick="Calendar.deleteGymLog('${log.id}', '${dateKey}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition" title="Smazat trénink">
                                    <i class="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${exSummary ? `<div class="space-y-1.5 pt-1">${exSummary}</div>` : ''}
                    ${prsHtml}
                </div>
            `;
        }).join('');
    }

    let planHtml = '';
    if (isPlannedGym) {
        planHtml = `
            <div class="bg-[#faa61a]/10 border border-[#faa61a]/40 border-dashed rounded-xl p-3 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                    <span class="text-lg">📅</span>
                    <div>
                        <div class="text-[9px] font-black text-amber-400 uppercase tracking-wider">Naplánovaný trénink</div>
                        <div class="text-xs font-bold text-white">${plannedDate.name}</div>
                        ${plannedDate.time ? `<div class="text-[10px] text-gray-400 font-mono"><i class="far fa-clock text-[#faa61a] mr-1"></i>${plannedDate.time}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    ${isToday ? `
                        <button onclick="Calendar.closeDayModal(); window.switchChannel('gym-tracker');" 
                                class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[10px] font-black uppercase tracking-wider transition shadow-md shadow-emerald-500/20">
                            ▶️ Začít
                        </button>
                    ` : ''}
                    <button onclick="Calendar.deleteGymPlan('${plannedDate.id || ''}', '${dateKey}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition" title="Smazat naplánovaný trénink">
                        <i class="fas fa-trash-alt text-[10px]"></i>
                    </button>
                </div>
            </div>
        `;
    }

    const splitConfig = getActiveSplitForDay(dateKey);
    let splitHtml = '';
    if (gymLogs.length === 0 && !isPlannedGym && splitConfig) {
        if (!splitConfig.isRest) {
            splitHtml = `
                <div class="bg-gradient-to-br from-[#faa61a]/15 via-[#faa61a]/5 to-transparent border border-[#faa61a]/40 border-dashed rounded-xl p-3 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                        <span class="text-lg">⚡</span>
                        <div>
                            <div class="text-[9px] font-black text-amber-400 uppercase tracking-wider">Tréninkový Split (${splitConfig.splitTitle || 'Můj Split'})</div>
                            <div class="text-xs font-bold text-white">${splitConfig.splitName}${splitConfig.template ? ` • ${splitConfig.template.name}` : ''}</div>
                            ${splitConfig.preferredTime ? `<div class="text-[10px] text-gray-400 font-mono"><i class="far fa-clock text-[#faa61a] mr-1"></i>${splitConfig.preferredTime}</div>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        ${isToday ? `
                            <button onclick="Calendar.closeDayModal(); window.switchChannel('gym-tracker'); if (window.Gym) window.Gym.startSplitWorkout('${splitConfig.templateId || ''}');" 
                                    class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-[10px] font-black uppercase tracking-wider transition shadow-md shadow-amber-500/20 flex items-center gap-1">
                                <i class="fas fa-play text-[9px]"></i> Začít
                            </button>
                        ` : ''}
                        <button onclick="if (window.Gym) { window.Gym.shiftActiveSplitDays(1); Calendar.showDayDetail('${dateKey}'); }" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-amber-400 hover:bg-white/5 transition" title="Posunout split o +1 den">
                            <i class="fas fa-forward text-[10px]"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            splitHtml = `
                <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-2.5">
                    <span class="text-lg">🛌</span>
                    <div>
                        <div class="text-[9px] font-black text-blue-300 uppercase tracking-wider">Tréninkový Split</div>
                        <div class="text-xs font-bold text-white">Volno / Rest Day (Regenerace)</div>
                    </div>
                </div>
            `;
        }
    }

    const emptyHtml = (!gymLogs.length && !isPlannedGym && !splitConfig) ? `
        <div class="bg-black/10 border border-white/5 rounded-xl p-3 text-center">
            <p class="text-xs text-gray-400 font-medium">V tento den nebyl zaznamenán žádný trénink.</p>
        </div>
    ` : '';

    return `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <h4 class="text-xs font-bold text-[#faa61a] uppercase flex items-center gap-2">
                    <i class="fas fa-dumbbell"></i> Posilovna & Tréninky
                </h4>
                <div class="flex items-center gap-1.5">
                    <button onclick="Calendar.closeDayModal(); window.switchChannel('gym-tracker');" 
                            class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider transition">
                        Posilovna 🏋️‍♂️
                    </button>
                </div>
            </div>

            ${logsHtml}
            ${planHtml}
            ${splitHtml}
            ${emptyHtml}


            <div class="flex flex-wrap gap-2 pt-1">
                ${isToday ? `
                    <button onclick="Calendar.closeDayModal(); window.switchChannel('gym-tracker');" 
                            class="flex-1 min-w-[130px] py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5">
                        <i class="fas fa-play"></i> Zahájit trénink
                    </button>
                ` : ''}
                <button onclick="Calendar.openGymLog('${dateKey}')" 
                        class="flex-1 min-w-[130px] py-2 px-3 bg-[#faa61a]/15 hover:bg-[#faa61a]/25 text-[#faa61a] border border-[#faa61a]/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5">
                    <i class="fas fa-plus"></i> Zapsat trénink
                </button>
                <button onclick="Calendar.openGymSchedule('${dateKey}')" 
                        class="flex-1 min-w-[130px] py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5">
                    <i class="far fa-calendar-plus"></i> Naplánovat plán
                </button>
            </div>
        </div>
    `;
}
