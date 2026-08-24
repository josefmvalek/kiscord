/**
 * Budget & Transaction List Management for Students & Daily Expenses
 */

import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { getFinancesData, setFinancesData, getActiveFilter, setActiveFilter, loadFinances } from './store.js';

export function renderBudgetTabHtml(myItems, totalIncome, totalExpenses, netBalance, activeFilter) {
    return `
        <!-- SUMMARY CARDS (BUDGET) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Celkové Příjmy</span>
                <span class="text-2xl font-black text-emerald-400">+${totalIncome.toLocaleString('cs-CZ')} CZK</span>
            </div>

            <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Celkové Výdaje</span>
                <span class="text-2xl font-black text-rose-400">-${totalExpenses.toLocaleString('cs-CZ')} CZK</span>
            </div>

            <div class="glass-card bg-gradient-to-r from-[#faa61a]/15 to-amber-500/10 border border-[#faa61a]/30 rounded-3xl p-5 shadow-lg">
                <span class="text-[10px] font-black uppercase tracking-widest text-amber-300 block mb-1">Aktuální Zůstatek</span>
                <span class="text-2xl font-black ${netBalance >= 0 ? 'text-amber-400' : 'text-rose-400'}">${netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString('cs-CZ')} CZK</span>
            </div>
        </div>

        <!-- FILTER BAR -->
        <div class="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
            <h2 class="text-xs font-black text-white/60 uppercase tracking-widest flex items-center gap-2 pl-1">
                <i class="fas fa-list"></i> Historie transakcí (${myItems.length})
            </h2>
            <div class="flex bg-[#202225] p-1 rounded-xl border border-white/5 text-[10px] font-bold font-mono">
                <button onclick="window.FinanceTracker.setFilter('all')" class="px-3 py-1 rounded-lg ${activeFilter === 'all' ? 'bg-[#5865F2] text-white' : 'text-gray-400 hover:text-white'}">Vše</button>
                <button onclick="window.FinanceTracker.setFilter('expense')" class="px-3 py-1 rounded-lg ${activeFilter === 'expense' ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-white'}">Výdaje</button>
                <button onclick="window.FinanceTracker.setFilter('income')" class="px-3 py-1 rounded-lg ${activeFilter === 'income' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}">Příjmy</button>
            </div>
        </div>

        <!-- TRANSACTIONS LIST -->
        <div class="space-y-2.5">
            ${(() => {
                const filtered = myItems.filter(item => {
                    if (activeFilter === 'all') return true;
                    return item.type === activeFilter;
                });

                if (filtered.length === 0) {
                    return `
                        <div class="p-10 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl text-center text-xs text-gray-500 italic">
                            Zatím žádné transakce v tomto filtru. Klikněte na „Zadat transakci“!
                        </div>
                    `;
                }

                return filtered.sort((a,b) => b.created_at.localeCompare(a.created_at)).map(item => {
                    const isIncome = item.type === 'income';
                    const dateFormatted = new Date(item.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

                    return `
                        <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 transition group">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-base ${isIncome ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                                    <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                                </div>
                                <div class="min-w-0">
                                    <span class="text-xs font-bold text-white truncate block">${item.title}</span>
                                    <span class="text-[10px] text-gray-500 font-medium block mt-0.5">${item.category || 'Ostatní'} • ${dateFormatted}</span>
                                </div>
                            </div>

                            <div class="flex items-center gap-3 flex-shrink-0 font-mono">
                                <span class="text-sm font-black ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">
                                    ${isIncome ? '+' : '-'}${parseFloat(item.amount).toLocaleString('cs-CZ')} CZK
                                </span>
                                <button onclick="window.FinanceTracker.deleteTransactionItem('${item.id}')" 
                                        class="text-gray-500 hover:text-red-400 active:text-red-500 p-1.5 transition rounded-lg" 
                                        title="Smazat transakci">
                                    <i class="fas fa-trash-alt text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            })()}
        </div>
    `;
}

export function openAddTransactionModal(preset = {}) {
    triggerHaptic('light');

    const defaultType = preset.type || 'expense';
    const defaultAmount = preset.amount || '';
    const defaultTitle = preset.title || '';
    const defaultCategory = preset.category || 'Jídlo & Potraviny';

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Typ transakce</label>
                    <select id="fin-type" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                        <option value="expense" ${defaultType === 'expense' ? 'selected' : ''}>Výdaj 🔴</option>
                        <option value="income" ${defaultType === 'income' ? 'selected' : ''}>Příjem 🟢</option>
                    </select>
                </div>

                ${renderInputGroup({
                    label: 'Částka (CZK)',
                    id: 'fin-amount',
                    type: 'number',
                    placeholder: 'např. 250',
                    value: defaultAmount,
                    required: true
                })}
            </div>

            ${renderInputGroup({
                label: 'Název / Popis',
                id: 'fin-title',
                placeholder: 'např. Oběd v menze, Rohlik.cz, Stipendium...',
                value: defaultTitle,
                required: true
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kategorie</label>
                <select id="fin-category" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <optgroup label="Běžné Výdaje">
                        <option value="Jídlo & Potraviny" ${defaultCategory === 'Jídlo & Potraviny' ? 'selected' : ''}>🍔 Jídlo & Potraviny</option>
                        <option value="Koleje & Bydlení" ${defaultCategory === 'Koleje & Bydlení' ? 'selected' : ''}>🏠 Koleje & Bydlení</option>
                        <option value="Doprava & Šalinkarta" ${defaultCategory === 'Doprava & Šalinkarta' ? 'selected' : ''}>🚋 Doprava & Šalinkarta</option>
                        <option value="Škola & Pomůcky" ${defaultCategory === 'Škola & Pomůcky' ? 'selected' : ''}>🎓 Škola & Pomůcky</option>
                        <option value="Zábava & Rande" ${defaultCategory === 'Zábava & Rande' ? 'selected' : ''}>🎉 Zábava & Rande</option>
                        <option value="Zdraví & Posilovna" ${defaultCategory === 'Zdraví & Posilovna' ? 'selected' : ''}>💊 Zdraví & Posilovna</option>
                    </optgroup>
                    <optgroup label="Příjmy">
                        <option value="Výplata & Brigáda" ${defaultCategory === 'Výplata & Brigáda' ? 'selected' : ''}>💼 Výplata & Brigáda</option>
                        <option value="Stipendium" ${defaultCategory === 'Stipendium' ? 'selected' : ''}>🎓 Stipendium</option>
                        <option value="Kapesné & Dary" ${defaultCategory === 'Kapesné & Dary' ? 'selected' : ''}>🎁 Kapesné & Dary</option>
                    </optgroup>
                    <option value="Ostatní" ${defaultCategory === 'Ostatní' ? 'selected' : ''}>📦 Ostatní</option>
                </select>
            </div>

            <!-- Quick presets -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
                <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Rychlé šablony</span>
                <div class="flex flex-wrap gap-1.5">
                    <button type="button" onclick="document.getElementById('fin-title').value='Oběd Menza'; document.getElementById('fin-amount').value='120'; document.getElementById('fin-category').value='Jídlo & Potraviny'; document.getElementById('fin-type').value='expense';" class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 rounded-lg transition font-medium">🍜 Menza (120 Kč)</button>
                    <button type="button" onclick="document.getElementById('fin-title').value='Nákup Lidl'; document.getElementById('fin-amount').value='350'; document.getElementById('fin-category').value='Jídlo & Potraviny'; document.getElementById('fin-type').value='expense';" class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 rounded-lg transition font-medium">🛒 Nákup (350 Kč)</button>
                    <button type="button" onclick="document.getElementById('fin-title').value='Koleje PPV'; document.getElementById('fin-amount').value='4800'; document.getElementById('fin-category').value='Koleje & Bydlení'; document.getElementById('fin-type').value='expense';" class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 rounded-lg transition font-medium">🏢 Koleje (4800 Kč)</button>
                </div>
            </div>
        </div>
    `;

    renderModal({
        title: 'Zadat novou transakci',
        content: contentHtml,
        confirmText: 'Uložit transakci',
        onConfirm: async () => {
            await saveTransaction();
        }
    });
}

export async function saveTransaction() {
    const type = document.getElementById('fin-type')?.value || 'expense';
    const amount = parseFloat(document.getElementById('fin-amount')?.value);
    const title = document.getElementById('fin-title')?.value.trim();
    const category = document.getElementById('fin-category')?.value || 'Ostatní';

    if (isNaN(amount) || amount <= 0) {
        showNotification('Zadejte prosím platnou kladnou částku.', 'warning');
        return false;
    }

    if (!title) {
        showNotification('Vyplňte prosím název transakce.', 'warning');
        return false;
    }

    const myId = state.currentUser?.id;
    const newRecord = {
        id: crypto.randomUUID(),
        user_id: myId,
        title,
        amount,
        type,
        category,
        is_shared: false,
        created_at: new Date().toISOString()
    };

    triggerHaptic('success');

    // Optimistic update
    const currentData = getFinancesData();
    currentData.unshift(newRecord);
    setFinancesData(currentData);

    window.FinanceTracker?.render?.();

    if (type === 'income') {
        triggerConfetti();
        showNotification(`Příjem ${amount.toLocaleString('cs-CZ')} CZK byl zaevidován! 📈`, 'success');
    } else {
        showNotification(`Výdaj ${amount.toLocaleString('cs-CZ')} CZK byl uložen. 💸`, 'info');
    }

    // Background persistence
    try {
        const { error } = await supabase.from('app_finances').insert([newRecord]);
        if (error) {
            await supabase.from('brigade_finances').insert([{
                id: newRecord.id,
                user_id: newRecord.user_id,
                description: newRecord.title,
                amount: newRecord.amount,
                type: newRecord.type === 'income' ? 'earning' : 'expense',
                category: newRecord.category,
                created_at: newRecord.created_at
            }]);
        }
    } catch (err) {
        console.warn("[FinanceTracker] Background sync note:", err);
    }

    return true;
}

export async function deleteTransactionItem(id) {
    triggerHaptic('warning');
    const confirmed = await showConfirmDialog('Opravdu chcete smazat tuto transakci?');
    if (!confirmed) return;

    const currentData = getFinancesData();
    const updated = currentData.filter(f => f.id !== id);
    setFinancesData(updated);

    window.FinanceTracker?.render?.();
    showNotification('Transakce byla smazána.', 'info');

    try {
        await supabase.from('app_finances').delete().eq('id', id);
        await supabase.from('brigade_finances').delete().eq('id', id);
    } catch (err) {
        console.warn("[FinanceTracker] Delete note:", err);
    }
}
