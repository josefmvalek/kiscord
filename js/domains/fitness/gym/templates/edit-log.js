import { supabase } from '@core/supabase.js';
import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { getCategoryEmoji } from '../exercises.js';
import { addManualSet, removeManualSet } from './manual-log.js';

export async function openEditGymLogModal(logId, dateKey) {
    triggerHaptic('medium');
    await ensureGymData();

    const log = (state.gymLogs || []).find(l => l.id === logId);
    if (!log) {
        showNotification('Trénink nebyl nalezen!', 'danger');
        return;
    }

    const exercises = state.gymExercises || [];
    const dateVal = log.date_key || dateKey || getTodayKey();
    const durationMin = Math.round((log.duration_seconds || 0) / 60) || 60;

    let exListHtml = '';
    (log.exercises || []).forEach((loggedEx, idx) => {
        const exObj = exercises.find(e => e.id === loggedEx.exercise_id) || { name: loggedEx.exercise_name || loggedEx.exercise_id };
        const sets = (loggedEx.sets || []).filter(s => s.completed);

        let setsHtml = '';
        (sets.length > 0 ? sets : [{ weight: 0, reps: 10 }]).forEach((s, sIdx) => {
            const weight = s.weight !== undefined ? s.weight : 0;
            const reps = s.reps !== undefined ? s.reps : 10;
            setsHtml += `
                <div class="manual-set-row flex items-center gap-2 bg-[#202225] p-2 rounded-xl border border-[#2f3136] transition hover:border-white/10">
                    <span class="manual-set-num w-5 text-center text-[10px] font-black text-amber-400/80 font-mono flex-shrink-0">${sIdx + 1}</span>
                    <div class="flex-1 flex items-center gap-1.5">
                        <span class="text-[9px] font-bold text-gray-400 uppercase">Váha:</span>
                        <input type="number" step="0.5" min="0" value="${weight}" placeholder="kg" class="manual-set-weight w-full bg-black/30 text-white text-xs p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/50 text-center font-mono font-bold">
                    </div>
                    <div class="flex-1 flex items-center gap-1.5">
                        <span class="text-[9px] font-bold text-gray-400 uppercase">Opak.:</span>
                        <input type="number" step="1" min="1" value="${reps}" placeholder="ks" class="manual-set-reps w-full bg-black/30 text-white text-xs p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/50 text-center font-mono font-bold">
                    </div>
                    <button type="button" onclick="window.Gym.removeManualSet(this)" class="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition flex-shrink-0" title="Smazat sérii">
                        <i class="fas fa-times text-[10px]"></i>
                    </button>
                </div>
            `;
        });

        exListHtml += `
            <div class="bg-black/20 p-3.5 rounded-2xl border border-white/5 space-y-2.5 manual-ex-card" data-ex-id="${loggedEx.exercise_id}" data-ex-name="${exObj.name}">
                <div class="flex items-center justify-between gap-2">
                    <div class="text-xs font-black text-white uppercase tracking-tight truncate">${exObj.name}</div>
                    <button type="button" onclick="window.Gym.addManualSet(${idx}, 0, 10)" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#faa61a]/20 text-gray-300 hover:text-[#faa61a] border border-white/5 hover:border-[#faa61a]/30 transition text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <i class="fas fa-plus text-[8px]"></i> Přidat sérii
                    </button>
                </div>
                <div class="space-y-1.5 manual-sets-container" id="manual-sets-${idx}">
                    ${setsHtml}
                </div>
            </div>
        `;
    });

    const contentHtml = `
        <div class="space-y-4">
            ${renderInputGroup({
                label: 'Název tréninku',
                id: 'edit-log-name',
                type: 'text',
                placeholder: 'např. Push Day 🦍',
                value: log.name || 'Trénink'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Datum tréninku</label>
                <input type="date" id="edit-log-date" value="${dateVal}" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all font-mono font-bold">
            </div>

            ${renderInputGroup({
                label: 'Délka tréninku (minuty)',
                id: 'edit-log-duration',
                type: 'number',
                placeholder: 'např. 60',
                value: durationMin.toString()
            })}

            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cviky a série</label>
                    <span class="text-[9px] text-gray-400 font-semibold">Upravuj váhy a počty opakování ✏️</span>
                </div>
                <div id="edit-exercises-list" class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    ${exListHtml || '<p class="text-xs text-gray-500 italic">V tréninku nejsou žádné cviky.</p>'}
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('edit-gym-log-modal')?.remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveEditGymLog('${logId}')" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-[10px] uppercase tracking-wider transition shadow-lg shadow-amber-500/20">
                Uložit Změny
            </button>
        </div>
    `;

    document.getElementById('edit-gym-log-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-gym-log-modal',
        title: 'Úprava tréninku',
        subtitle: 'Uprav zapsaný trénink a série 🏋️‍♂️✏️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('edit-gym-log-modal')?.remove()"
    }));

    const modalEl = document.getElementById('edit-gym-log-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }
}

export async function saveEditGymLog(logId, renderGymFn) {
    triggerHaptic('medium');

    const dateVal = document.getElementById('edit-log-date')?.value;
    const nameVal = document.getElementById('edit-log-name')?.value || 'Trénink';
    const durationMin = parseInt(document.getElementById('edit-log-duration')?.value) || 60;

    if (!dateVal) {
        showNotification('Vyplň datum tréninku!', 'warning');
        return;
    }

    const exCards = document.querySelectorAll('#edit-gym-log-modal .manual-ex-card');
    const loggedExercises = [];

    exCards.forEach(card => {
        const exerciseId = card.getAttribute('data-ex-id');
        const exerciseName = card.getAttribute('data-ex-name') || exerciseId;
        const setRows = card.querySelectorAll('.manual-set-row');

        const setsArray = [];
        setRows.forEach(row => {
            const weightInput = row.querySelector('.manual-set-weight');
            const repsInput = row.querySelector('.manual-set-reps');

            const weight = parseFloat(weightInput?.value) || 0;
            const reps = parseInt(repsInput?.value) || 0;

            if (reps > 0 || weight > 0) {
                setsArray.push({
                    weight,
                    reps: reps || 1,
                    completed: true,
                    type: 'N'
                });
            }
        });

        if (setsArray.length > 0) {
            loggedExercises.push({
                exercise_id: exerciseId,
                exercise_name: exerciseName,
                sets: setsArray
            });
        }
    });

    if (loggedExercises.length === 0) {
        showNotification('Zadej alespoň jednu sérii s váhou nebo opakováním!', 'warning');
        return;
    }

    try {
        const updateData = {
            name: nameVal,
            duration_seconds: durationMin * 60,
            date_key: dateVal,
            exercises: loggedExercises
        };

        const { error: updateErr } = await supabase
            .from('gym_logs')
            .update(updateData)
            .eq('id', logId);

        if (updateErr) throw updateErr;

        // Update in state.gymLogs
        const targetLog = (state.gymLogs || []).find(l => l.id === logId);
        if (targetLog) {
            Object.assign(targetLog, updateData);
        }

        // Re-evaluate PRs for this log
        await supabase.from('gym_prs').delete().eq('log_id', logId);
        state.gymPRs = (state.gymPRs || []).filter(p => p.log_id !== logId);

        for (const ex of loggedExercises) {
            const maxCompletedSet = ex.sets
                .filter(s => s.completed && s.type !== 'W')
                .reduce((max, s) => (s.weight > max.weight ? s : max), { weight: 0, reps: 0 });

            if (maxCompletedSet.weight > 0) {
                const existingPR = (state.gymPRs || []).find(p => p.user_id === state.currentUser?.id && p.exercise_id === ex.exercise_id);
                if (!existingPR || maxCompletedSet.weight > parseFloat(existingPR.weight)) {
                    const prData = {
                        user_id: state.currentUser?.id,
                        exercise_id: ex.exercise_id,
                        weight: maxCompletedSet.weight,
                        reps: maxCompletedSet.reps,
                        achieved_at: new Date().toISOString(),
                        log_id: logId
                    };

                    if (existingPR) {
                        await supabase.from('gym_prs').delete().eq('id', existingPR.id);
                        state.gymPRs = (state.gymPRs || []).filter(p => p.id !== existingPR.id);
                    }
                    const { data: newPRs } = await supabase.from('gym_prs').insert(prData).select();
                    if (newPRs?.[0]) {
                        state.gymPRs.push(newPRs[0]);
                    } else {
                        state.gymPRs.push(prData);
                    }
                }
            }
        }

        showNotification('Trénink byl upraven! ✏️✨', 'success');
        document.getElementById('edit-gym-log-modal')?.remove();

        window.dispatchEvent(new CustomEvent('gym-logs-updated', { detail: { dateKey: dateVal, logId } }));

        if (state.currentChannel === 'calendar') {
            import('@domains/lifestyle/calendar/index.js').then(m => {
                m.renderCalendar();
                m.showDayDetail(dateVal);
            });
        }

        await ensureGymData(true);
        import('@core/state.js').then(s => s.initializeState());
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Edit log failed:", e);
        showNotification('Chyba ukládání: ' + e.message, 'danger');
    }
}
