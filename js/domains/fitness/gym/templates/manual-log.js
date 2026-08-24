import { supabase } from '@core/supabase.js';
import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { getCategoryEmoji } from '../exercises.js';

export function addManualSet(exIdx, defaultWeight = null, defaultReps = null) {
    triggerHaptic('light');
    const setsContainer = document.getElementById(`manual-sets-${exIdx}`);
    if (!setsContainer) return;

    const currentRows = setsContainer.querySelectorAll('.manual-set-row');
    const newSetNum = currentRows.length + 1;

    let weightVal = defaultWeight;
    let repsVal = defaultReps;
    if (weightVal === null && currentRows.length > 0) {
        const lastRow = currentRows[currentRows.length - 1];
        weightVal = lastRow.querySelector('.manual-set-weight')?.value || '0';
        repsVal = lastRow.querySelector('.manual-set-reps')?.value || '10';
    }
    if (weightVal === null || weightVal === undefined) weightVal = '0';
    if (repsVal === null || repsVal === undefined) repsVal = '10';

    const rowHtml = `
        <div class="manual-set-row flex items-center gap-2 bg-[#202225] p-2 rounded-xl border border-[#2f3136] transition hover:border-white/10 animate-fade-in">
            <span class="manual-set-num w-5 text-center text-[10px] font-black text-amber-400/80 font-mono flex-shrink-0">${newSetNum}</span>
            <div class="flex-1 flex items-center gap-1.5">
                <span class="text-[9px] font-bold text-gray-400 uppercase">Váha:</span>
                <input type="number" step="0.5" min="0" value="${weightVal}" placeholder="kg" class="manual-set-weight w-full bg-black/30 text-white text-xs p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/50 text-center font-mono font-bold">
            </div>
            <div class="flex-1 flex items-center gap-1.5">
                <span class="text-[9px] font-bold text-gray-400 uppercase">Opak.:</span>
                <input type="number" step="1" min="1" value="${repsVal}" placeholder="ks" class="manual-set-reps w-full bg-black/30 text-white text-xs p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/50 text-center font-mono font-bold">
            </div>
            <button type="button" onclick="window.Gym.removeManualSet(this)" class="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition flex-shrink-0" title="Smazat sérii">
                <i class="fas fa-times text-[10px]"></i>
            </button>
        </div>
    `;

    setsContainer.insertAdjacentHTML('beforeend', rowHtml);
}

export function removeManualSet(buttonEl) {
    triggerHaptic('light');
    const row = buttonEl.closest('.manual-set-row');
    if (!row) return;
    const container = row.closest('.manual-sets-container');
    if (!container) return;

    const rows = container.querySelectorAll('.manual-set-row');
    if (rows.length <= 1) {
        showNotification('Cvik musí mít alespoň 1 sérii!', 'warning');
        return;
    }

    row.remove();

    const remainingRows = container.querySelectorAll('.manual-set-row');
    remainingRows.forEach((r, idx) => {
        const numEl = r.querySelector('.manual-set-num');
        if (numEl) numEl.innerText = (idx + 1).toString();
    });
}

export async function openManualLogModal(renderGymFn, defaultDateKey = null) {
    triggerHaptic('light');

    if (typeof window !== 'undefined' && !window.Gym) {
        const m = await import('../main.js');
        if (m.attachWindowGym) m.attachWindowGym();
    }

    await ensureGymData();
    window.Gym = window.Gym || {};

    const templates = state.gymTemplates || [];
    const exercises = state.gymExercises || [];
    const dateVal = (typeof defaultDateKey === 'string' && defaultDateKey) ? defaultDateKey : new Date().toISOString().split('T')[0];

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Datum tréninku</label>
                <input type="date" id="manual-date" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all" value="${dateVal}">
            </div>

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tréninkový plán (Šablona)</label>
                <select id="manual-template" onchange="window.Gym.onManualTemplateChange(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <option value="">-- Vyber šablonu --</option>
                    ${templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </div>

            ${renderInputGroup({
                label: 'Délka tréninku (minuty)',
                id: 'manual-duration',
                type: 'number',
                placeholder: 'např. 60',
                value: '60'
            })}

            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cviky a série</label>
                    <span class="text-[9px] text-gray-400 font-semibold">Přidávej a upravuj série libovolně 💪</span>
                </div>
                <div id="manual-exercises-list" class="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    <p class="text-xs text-gray-500 italic">Zatím nevybrána šablona.</p>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('manual-log-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveManualLog()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Trénink
            </button>
        </div>
    `;

    document.getElementById('manual-log-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'manual-log-modal',
        title: 'Zpětný zápis tréninku',
        subtitle: 'Zaznamenej trénink z minulosti 🏋️‍♂️📜',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('manual-log-modal').remove()"
    }));

    // Trigger helper on templates change
    window.Gym.onManualTemplateChange = (tmplId) => {
        const listEl = document.getElementById('manual-exercises-list');
        if (!listEl) return;

        const tmpl = templates.find(t => t.id === tmplId);
        if (!tmpl) {
            listEl.innerHTML = `<p class="text-xs text-gray-500 italic">Zatím nevybrána šablona.</p>`;
            return;
        }

        let exListHtml = '';
        (tmpl.exercises || []).forEach((te, idx) => {
            const ex = exercises.find(e => e.id === te.exercise_id) || { name: te.exercise_id };
            const setsCount = parseInt(te.sets) || 3;
            const defaultWeight = te.weight !== undefined ? te.weight : 0;
            const defaultReps = te.reps !== undefined ? te.reps : 10;

            let setsHtml = '';
            for (let s = 1; s <= setsCount; s++) {
                setsHtml += `
                    <div class="manual-set-row flex items-center gap-2 bg-[#202225] p-2 rounded-xl border border-[#2f3136] transition hover:border-white/10">
                        <span class="manual-set-num w-5 text-center text-[10px] font-black text-amber-400/80 font-mono flex-shrink-0">${s}</span>
                        <div class="flex-1 flex items-center gap-1.5">
                            <span class="text-[9px] font-bold text-gray-400 uppercase">Váha:</span>
                            <input type="number" step="0.5" min="0" value="${defaultWeight}" placeholder="kg" class="manual-set-weight w-full bg-black/30 text-white text-xs p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/50 text-center font-mono font-bold">
                        </div>
                        <div class="flex-1 flex items-center gap-1.5">
                            <span class="text-[9px] font-bold text-gray-400 uppercase">Opak.:</span>
                            <input type="number" step="1" min="1" value="${defaultReps}" placeholder="ks" class="manual-set-reps w-full bg-black/30 text-white text-xs p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/50 text-center font-mono font-bold">
                        </div>
                        <button type="button" onclick="window.Gym.removeManualSet(this)" class="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition flex-shrink-0" title="Smazat sérii">
                            <i class="fas fa-times text-[10px]"></i>
                        </button>
                    </div>
                `;
            }

            exListHtml += `
                <div class="bg-black/20 p-3.5 rounded-2xl border border-white/5 space-y-2.5 manual-ex-card" data-ex-id="${te.exercise_id}" data-ex-name="${ex.name}">
                    <div class="flex items-center justify-between gap-2">
                        <div class="text-xs font-black text-white uppercase tracking-tight truncate">${ex.name}</div>
                        <button type="button" onclick="window.Gym.addManualSet(${idx}, ${defaultWeight}, ${defaultReps})" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#faa61a]/20 text-gray-300 hover:text-[#faa61a] border border-white/5 hover:border-[#faa61a]/30 transition text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <i class="fas fa-plus text-[8px]"></i> Přidat sérii
                        </button>
                    </div>
                    <div class="space-y-1.5 manual-sets-container" id="manual-sets-${idx}">
                        ${setsHtml}
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = exListHtml;
    };

    document.getElementById('manual-log-modal')?.classList.remove('hidden');
    document.getElementById('manual-log-modal')?.classList.add('flex');

    if (templates.length > 0) {
        const defaultTmpl = templates[0];
        const tmplSelect = document.getElementById('manual-template');
        if (tmplSelect) tmplSelect.value = defaultTmpl.id;
        window.Gym.onManualTemplateChange(defaultTmpl.id);
    }
}

export async function saveManualLog(renderGymFn) {
    triggerHaptic('medium');

    const dateVal = document.getElementById('manual-date')?.value;
    const templateId = document.getElementById('manual-template')?.value;
    const durationMin = parseInt(document.getElementById('manual-duration')?.value) || 60;

    if (!dateVal) {
        showNotification('Vyplň datum tréninku!', 'warning');
        return;
    }

    const exCards = document.querySelectorAll('.manual-ex-card');
    if (!exCards || exCards.length === 0) {
        showNotification('Vyber šablonu tréninku!', 'warning');
        return;
    }

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

    const template = (state.gymTemplates || []).find(t => t.id === templateId);
    const workoutName = template ? template.name : 'Vlastní trénink';

    try {
        const logData = {
            user_id: state.currentUser?.id,
            template_id: templateId || null,
            name: workoutName,
            duration_seconds: durationMin * 60,
            date_key: dateVal,
            exercises: loggedExercises,
            cheers: []
        };

        const { data: newLogs, error: logErr } = await supabase
            .from('gym_logs')
            .insert(logData)
            .select();

        if (logErr) throw logErr;

        const insertedLog = newLogs?.[0];

        // Check for PRs across all sets
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
                        log_id: insertedLog?.id
                    };

                    if (existingPR) {
                        await supabase.from('gym_prs').delete().eq('id', existingPR.id);
                    }
                    await supabase.from('gym_prs').insert(prData);

                    // Auto-unlock PR breaker achievement!
                    import('@domains/entertainment/achievements.js').then(m => {
                        m.autoUnlock('pr_breaker');
                    });
                }
            }
        }

        if (!state.gymLogs) state.gymLogs = [];
        if (insertedLog) {
            state.gymLogs.unshift(insertedLog);
        } else {
            state.gymLogs.unshift(logData);
        }

        import('@core/utils.js').then(m => m.triggerConfetti());
        showNotification('Zpětný trénink uložen! Získali jste +20 XP! 🎉', 'success');
        document.getElementById('manual-log-modal')?.remove();

        window.dispatchEvent(new CustomEvent('gym-logs-updated', { detail: { dateKey: dateVal, log: insertedLog || logData } }));

        if (state.currentChannel === 'calendar') {
            import('@domains/lifestyle/calendar/index.js').then(m => {
                m.renderCalendar();
                m.showDayDetail(dateVal);
            });
        }

        await ensureGymData(true);
        
        // Achieve checks if we logged a workout
        import('@domains/entertainment/achievements.js').then(m => {
            const myLogsCount = (state.gymLogs || []).filter(l => l.user_id === state.currentUser?.id).length;
            if (myLogsCount >= 10) m.autoUnlock('gym_rat');

            const partnerLogsToday = (state.gymLogs || []).filter(l => l.user_id !== state.currentUser?.id && l.date_key === dateVal);
            if (partnerLogsToday.length > 0) {
                m.autoUnlock('synchro_gym');
            }
        });

        import('@core/state.js').then(s => s.initializeState());
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Manual log failed:", e);
        showNotification('Chyba ukládání: ' + e.message, 'danger');
    }
}

