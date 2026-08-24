/**
 * Savings Goals & Piggy Bank (Kasička) Management
 */

import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { getSavingsGoals, saveSavingsGoals } from './store.js';

export function renderSavingsTabHtml(goals, totalSavedInGoals, totalTargetInGoals, overallGoalsProgress) {
    return `
        <!-- SAVINGS GOALS (KASIČKA) -->
        <div class="glass-card bg-gradient-to-br from-amber-950/30 via-slate-900 to-orange-950/20 border border-amber-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-amber-400/80 block mb-1">Moje Celkové Úspory v Kasičkách</span>
                    <span class="text-3xl font-black text-amber-400 font-mono">${totalSavedInGoals.toLocaleString('cs-CZ')} CZK</span>
                    <span class="text-xs text-gray-400 block mt-1">z celkového cíle ${totalTargetInGoals.toLocaleString('cs-CZ')} CZK (${overallGoalsProgress} %)</span>
                </div>
                <div class="w-full sm:w-48 bg-black/40 rounded-full h-3 p-0.5 border border-white/10">
                    <div class="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500 shadow-lg shadow-amber-500/30" style="width: ${overallGoalsProgress}%"></div>
                </div>
            </div>
        </div>

        <!-- GOALS GRID -->
        <div class="space-y-4">
            <h2 class="text-xs font-black text-white/60 uppercase tracking-widest flex items-center gap-2 pl-1">
                <i class="fas fa-bullseye text-[#faa61a]"></i> Aktivní Spořicí Cíle (${goals.length})
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${goals.length === 0 ? `
                    <div class="col-span-2 p-10 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl text-center text-xs text-gray-500 italic">
                        Zatím žádné zadané cíle. Vytvořte si první kasičku na dovolenou, řidičák nebo nový monitor!
                    </div>
                ` : goals.map((g, idx) => {
                    const current = parseFloat(g.current) || 0;
                    const target = parseFloat(g.target) || 1;
                    const percent = Math.min(Math.round((current / target) * 100), 100);
                    const isDone = current >= target;

                    return `
                        <div class="glass-card bg-white/[0.02] border ${isDone ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-white/5 hover:border-white/10'} rounded-3xl p-5 flex flex-col justify-between gap-4 transition shadow-lg relative overflow-hidden group">
                            ${isDone ? `<div class="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1"><i class="fas fa-check"></i> SPLNĚNO!</div>` : ''}

                            <div>
                                <div class="flex items-center gap-3 mb-3">
                                    <span class="text-3xl filter drop-shadow-md">${g.emoji || '🐖'}</span>
                                    <div class="min-w-0">
                                        <h3 class="text-sm font-black text-white truncate">${g.title}</h3>
                                        <span class="text-[10px] text-gray-400 font-semibold block">${g.note || 'Osobní spoření'}</span>
                                    </div>
                                </div>

                                <!-- Progress -->
                                <div class="space-y-1.5 mt-4 font-mono">
                                    <div class="flex justify-between text-xs font-bold">
                                        <span class="text-white">${current.toLocaleString('cs-CZ')} CZK</span>
                                        <span class="text-gray-400">${target.toLocaleString('cs-CZ')} CZK</span>
                                    </div>
                                    <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                                        <div class="h-full rounded-full transition-all duration-500 ${isDone ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-400 to-orange-500'}" style="width: ${percent}%"></div>
                                    </div>
                                    <div class="flex justify-between text-[10px] text-gray-400">
                                        <span>Naspořeno ${percent} %</span>
                                        <span>Zbývá ${(Math.max(target - current, 0)).toLocaleString('cs-CZ')} CZK</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex items-center justify-between gap-2 pt-3 border-t border-white/5 text-xs font-bold font-mono">
                                <div class="flex items-center gap-1.5">
                                    <button onclick="window.FinanceTracker.adjustGoalSavings(${idx}, 100)" class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-[10px]">
                                        +100
                                    </button>
                                    <button onclick="window.FinanceTracker.adjustGoalSavings(${idx}, 500)" class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-[10px]">
                                        +500
                                    </button>
                                    <button onclick="window.FinanceTracker.adjustGoalSavings(${idx}, 1000)" class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-[10px]">
                                        +1000
                                    </button>
                                </div>

                                <div class="flex items-center gap-1">
                                    <button onclick="window.FinanceTracker.promptAdjustGoal(${idx})" class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition" title="Zadat vlastní částku">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.FinanceTracker.deleteSavingsGoal(${idx})" class="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition" title="Smazat cíl">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

export function openSavingsGoalModal(editIndex = null) {
    triggerHaptic('light');
    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    const goal = editIndex !== null ? goals[editIndex] : null;

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ikona</label>
                    <input type="text" id="goal-emoji" value="${goal?.emoji || '🏖️'}" class="w-full bg-[#202225] text-white text-center text-lg p-2.5 rounded-xl border border-[#2f3136] outline-none">
                </div>

                <div class="col-span-2">
                    ${renderInputGroup({
                        label: 'Cílová částka (CZK)',
                        id: 'goal-target',
                        type: 'number',
                        placeholder: 'např. 15000',
                        value: goal?.target || '',
                        required: true
                    })}
                </div>
            </div>

            ${renderInputGroup({
                label: 'Název cíle / Kasičky',
                id: 'goal-title',
                placeholder: 'např. Letní Dovolená, Řidičák, Monitor...',
                value: goal?.title || '',
                required: true
            })}

            ${renderInputGroup({
                label: 'Aktuálně naspořeno (CZK)',
                id: 'goal-current',
                type: 'number',
                placeholder: 'např. 2500',
                value: goal?.current !== undefined ? goal.current : 0
            })}

            ${renderInputGroup({
                label: 'Poznámka / Motivace',
                id: 'goal-note',
                placeholder: 'např. Moře v Itálii po státnicích',
                value: goal?.note || ''
            })}
        </div>
    `;

    renderModal({
        title: editIndex !== null ? 'Upravit spořicí cíl' : 'Vytvořit novou kasičku',
        content: contentHtml,
        confirmText: 'Uložit cíl',
        onConfirm: () => {
            saveSavingsGoal(editIndex);
        }
    });
}

export function saveSavingsGoal(editIndex = null) {
    const emoji = document.getElementById('goal-emoji')?.value.trim() || '🐖';
    const target = parseFloat(document.getElementById('goal-target')?.value);
    const title = document.getElementById('goal-title')?.value.trim();
    const current = parseFloat(document.getElementById('goal-current')?.value) || 0;
    const note = document.getElementById('goal-note')?.value.trim() || '';

    if (!title) {
        showNotification('Vyplňte prosím název cíle.', 'warning');
        return false;
    }

    if (isNaN(target) || target <= 0) {
        showNotification('Cílová částka musí být větší než 0.', 'warning');
        return false;
    }

    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);

    const goalObj = { emoji, title, target, current, note };

    if (editIndex !== null && goals[editIndex]) {
        goals[editIndex] = goalObj;
    } else {
        goals.push(goalObj);
    }

    saveSavingsGoals(myId, goals);
    triggerHaptic('success');
    triggerConfetti();
    showNotification('Spořicí cíl byl uložen! 🐖✨', 'success');

    window.FinanceTracker?.render?.();
    return true;
}

export function adjustGoalSavings(index, amount) {
    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    if (!goals[index]) return;

    const oldVal = parseFloat(goals[index].current) || 0;
    const target = parseFloat(goals[index].target) || 1;
    const newVal = Math.max(oldVal + amount, 0);
    goals[index].current = newVal;

    saveSavingsGoals(myId, goals);
    triggerHaptic('success');

    if (newVal >= target && oldVal < target) {
        triggerConfetti();
        showNotification(`🎉 Gratulujeme! Cíl „${goals[index].title}“ byl právě splněn!`, 'success');
    } else {
        showNotification(`Vloženo ${amount} CZK do cíle „${goals[index].title}“. Aktuálně: ${newVal.toLocaleString('cs-CZ')} CZK`, 'info');
    }

    window.FinanceTracker?.render?.();
}

export async function promptAdjustGoal(index) {
    triggerHaptic('light');
    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    if (!goals[index]) return;

    const g = goals[index];
    const current = parseFloat(g.current) || 0;

    const contentHtml = `
        <div class="space-y-4 text-left font-mono">
            <p class="text-xs text-gray-300">Aktuální stav v cíli <strong>${g.title}</strong>: <strong>${current.toLocaleString('cs-CZ')} CZK</strong></p>
            ${renderInputGroup({
                label: 'Změna částky (kladné pro vklad, záporné pro výběr)',
                id: 'adjust-amount',
                type: 'number',
                placeholder: 'např. +1500 nebo -500',
                required: true
            })}
        </div>
    `;

    renderModal({
        title: `Upravit úspory: ${g.title}`,
        content: contentHtml,
        confirmText: 'Provést změnu',
        onConfirm: () => {
            const diff = parseFloat(document.getElementById('adjust-amount')?.value);
            if (isNaN(diff) || diff === 0) {
                showNotification('Zadejte prosím platnou částku.', 'warning');
                return false;
            }
            adjustGoalSavings(index, diff);
            return true;
        }
    });
}

export async function deleteSavingsGoal(index) {
    triggerHaptic('warning');
    const confirmed = await showConfirmDialog('Opravdu chcete smazat tento spořicí cíl?');
    if (!confirmed) return;

    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    goals.splice(index, 1);
    saveSavingsGoals(myId, goals);

    window.FinanceTracker?.render?.();
    showNotification('Spořicí cíl byl smazán.', 'info');
}
