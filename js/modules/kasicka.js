import { supabase } from '../core/supabase.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { state, ensureFinancesData } from '../core/state.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';

let subscription = null;
let activeTypeFilter = 'all'; // 'all' | 'earning' | 'expense'

export async function renderKasicka() {
    // Expose API to window for button handlers
    window.Kasicka = {
        openAddTransactionModal,
        saveTransaction,
        deleteTransaction,
        changeSavingsGoal,
        saveSavingsGoal,
        filterByType
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    await ensureFinancesData();
    setupRealtime();

    const finances = state.brigadeFinances || [];
    
    // Calculate personal metrics (only logged-in user's transactions)
    let myEarnings = 0;
    let myExpenses = 0;

    finances.forEach(item => {
        // Double-check user privacy (though Supabase RLS policies enforce this at database level)
        if (item.user_id !== state.currentUser?.id) return;

        const val = parseFloat(item.amount) || 0;
        if (item.type === 'earning') {
            myEarnings += val;
        } else {
            myExpenses += val;
        }
    });

    const balance = myEarnings - myExpenses;
    
    // Scoped personal savings goal
    const savingsGoalKey = `kiscord_savings_goal_${state.currentUser?.id || 'default'}`;
    const savingsGoal = parseFloat(localStorage.getItem(savingsGoalKey) || '2000');
    const goalPercentage = savingsGoal > 0 ? Math.min(Math.round((balance / savingsGoal) * 100), 100) : 0;

    // Filter finances for listing (only my own, then by transaction type)
    const myFinances = finances.filter(item => item.user_id === state.currentUser?.id);
    const filteredFinances = myFinances.filter(item => {
        if (activeTypeFilter === 'all') return true;
        return item.type === activeTypeFilter;
    });

    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16 font-sans">
            <!-- Header Banner -->
            <div class="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950/40 p-6 border-b border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
                <div class="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                <div class="absolute -right-20 -top-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -left-20 -bottom-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div class="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-600 shadow-xl mb-3 animate-bounce-slow">
                    <i class="fas fa-wallet text-white text-2xl drop-shadow-md"></i>
                </div>
                <h1 class="relative z-10 text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Rakouská Kasička 💶</h1>
                <p class="relative z-10 text-gray-300 font-semibold mt-1 text-center text-xs max-w-md">Moje osobní peněženka a úspory na brigádě! 🇦🇹</p>
            </div>

            <div class="max-w-4xl mx-auto px-4 pt-6 space-y-6">
                
                <!-- Personal Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 relative overflow-hidden shadow-xl">
                        <span class="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Moje Příjmy</span>
                        <span class="text-xl font-black text-emerald-400 tracking-tight">${myEarnings.toFixed(2)} €</span>
                        <div class="absolute right-4 bottom-4 text-3xl opacity-10">📈</div>
                    </div>
                    <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 relative overflow-hidden shadow-xl">
                        <span class="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Moje Výdaje</span>
                        <span class="text-xl font-black text-red-400 tracking-tight">${myExpenses.toFixed(2)} €</span>
                        <div class="absolute right-4 bottom-4 text-3xl opacity-10">📉</div>
                    </div>
                    <div class="glass-card bg-gradient-to-br from-emerald-950/20 to-indigo-950/20 border ${balance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'} rounded-3xl p-5 relative overflow-hidden shadow-xl">
                        <span class="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Moje Úspory</span>
                        <span class="text-xl font-black ${balance >= 0 ? 'text-white' : 'text-red-300'} tracking-tight">${balance.toFixed(2)} €</span>
                        <div class="absolute right-4 bottom-4 text-3xl opacity-15">${balance >= 0 ? '💰' : '💸'}</div>
                    </div>
                </div>

                <!-- Savings Goal Progress -->
                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div class="flex justify-between items-end mb-3">
                        <div>
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/30 block">Můj spořicí cíl</span>
                            <span class="text-base font-black text-white uppercase tracking-wider">Osobní cíl úspor ⛰️✈️</span>
                        </div>
                        <button onclick="window.Kasicka.changeSavingsGoal()" 
                                class="text-[9px] font-black uppercase text-[#faa61a] bg-[#faa61a]/10 hover:bg-[#faa61a]/20 px-2.5 py-1 rounded-lg transition">
                            Upravit cíl
                        </button>
                    </div>

                    <div class="flex justify-between items-center text-xs font-bold text-gray-400 mb-2">
                        <span>Pokrok: ${goalPercentage}%</span>
                        <span>${balance.toFixed(0)} € / ${savingsGoal.toFixed(0)} €</span>
                    </div>
                    <div class="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 relative p-[1px]">
                        <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 shadow-lg transition-all duration-1000 ease-out" 
                             style="width: ${goalPercentage}%"></div>
                    </div>
                </div>

                <!-- Controls & Add button -->
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div class="flex items-center gap-3">
                        <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <i class="fas fa-list-ul text-[#faa61a]"></i> Historie
                        </h2>
                        
                        <!-- Type Filter Buttons -->
                        <div class="flex items-center bg-black/20 p-1 border border-white/5 rounded-xl">
                            <button onclick="window.Kasicka.filterByType('all')" 
                                    class="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${activeTypeFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}">Všechny</button>
                            <button onclick="window.Kasicka.filterByType('earning')" 
                                    class="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${activeTypeFilter === 'earning' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/25' : 'text-gray-500 hover:text-white'}">Příjmy 📈</button>
                            <button onclick="window.Kasicka.filterByType('expense')" 
                                    class="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${activeTypeFilter === 'expense' ? 'bg-red-500/20 text-red-300 border border-red-500/25' : 'text-gray-500 hover:text-white'}">Výdaje 📉</button>
                        </div>
                    </div>

                    <button onclick="window.Kasicka.openAddTransactionModal()" 
                            class="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group transform active:scale-95">
                        <i class="fas fa-plus group-hover:scale-110 transition-transform"></i> Přidat transakci
                    </button>
                </div>

                <!-- Transaction List -->
                <div class="space-y-3">
                    ${filteredFinances.length === 0 ? `
                        <div class="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                            <span class="text-5xl block mb-4">🦝</span>
                            <h4 class="text-lg font-black text-white uppercase tracking-wider">Žádné záznamy nenalezeny</h4>
                            <p class="text-xs text-white/40 font-semibold mt-1">Zkuste změnit filtr nebo zadejte novou transakci!</p>
                        </div>
                    ` : filteredFinances.map(item => renderTransactionRow(item)).join('')}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderTransactionRow(item) {
    const isEarning = item.type === 'earning';
    const amountClass = isEarning ? 'text-emerald-400 font-black' : 'text-red-400 font-bold';
    const amountSign = isEarning ? '+' : '-';
    
    const dateStr = new Date(item.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
        <div class="glass-card bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all flex items-center justify-between gap-4 group">
            <div class="flex items-center gap-3.5 flex-1 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-xl flex-shrink-0">
                    ${isEarning ? '💶' : '🛒'}
                </div>
                <div class="min-w-0">
                    <h4 class="text-sm font-bold text-white truncate leading-snug">${item.description}</h4>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-white/40">${item.category}</span>
                        <span class="text-[9px] text-white/30 font-bold">${dateStr}</span>
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-4 flex-shrink-0">
                <div class="text-right">
                    <span class="${amountClass} text-sm">${amountSign}${parseFloat(item.amount).toFixed(2)} €</span>
                </div>
                
                <div class="flex items-center gap-2">
                    <button onclick="window.Kasicka.deleteTransaction('${item.id}', event)" 
                            class="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                            title="Smazat záznam">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('brigade-finances-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'brigade_finances' },
            (payload) => {
                console.log('Brigade finances realtime change:', payload.eventType);
                ensureFinancesData(true).then(() => {
                    if (state.currentChannel === 'kasicka') {
                        renderKasicka();
                    }
                });
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}

export function filterByType(typeFilter) {
    triggerHaptic('light');
    activeTypeFilter = typeFilter;
    renderKasicka();
}

// Modal management
export function openAddTransactionModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4">
            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Typ Transakce</label>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="window.Kasicka.selectType('earning')" id="type-btn-earning" 
                            class="py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-black text-xs uppercase tracking-wider transition-all">
                        Příjem / Mzda 💶
                    </button>
                    <button onclick="window.Kasicka.selectType('expense')" id="type-btn-expense" 
                            class="py-3 rounded-xl border border-white/5 bg-white/5 text-gray-400 font-bold text-xs uppercase tracking-wider transition-all">
                        Osobní výdaj 🛒
                    </button>
                </div>
                <input type="hidden" id="trans-type" value="earning">
            </div>

            ${renderInputGroup({
                label: 'Částka (€)',
                id: 'trans-amount',
                type: 'number',
                placeholder: 'např. 12.50',
                attr: 'step="0.01" min="0.01" required'
            })}

            ${renderInputGroup({
                label: 'Popis',
                id: 'trans-desc',
                placeholder: 'např. Mzda za sobotní směnu, nákup v Hoferu...'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                <select id="trans-category" 
                    class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-emerald-500/30 focus:bg-[#202225] transition-all">
                    <option value="Mzda 💶">Mzda 💶</option>
                    <option value="Potraviny 🛒" selected>Potraviny 🛒</option>
                    <option value="Cestování 🏔️">Cestování 🏔️</option>
                    <option value="Zábava 🍻">Zábava 🍻</option>
                    <option value="Ubytování 🏡">Ubytování 🏡</option>
                    <option value="Ostatní ⚙️">Ostatní ⚙️</option>
                </select>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-transaction-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button onclick="window.Kasicka.saveTransaction()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20">
                Uložit záznam
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-transaction-modal',
        title: 'Přidat do Kasičky',
        subtitle: 'Zaznamenej svůj osobní příjem nebo výdaj 💶',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-transaction-modal').remove()"
    }));

    // Setup helper to toggle classes
    window.Kasicka.selectType = (type) => {
        triggerHaptic('light');
        document.getElementById('trans-type').value = type;
        const earnBtn = document.getElementById('type-btn-earning');
        const expBtn = document.getElementById('type-btn-expense');
        const categorySelect = document.getElementById('trans-category');

        if (type === 'earning') {
            earnBtn.className = 'py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-black text-xs uppercase tracking-wider transition-all';
            expBtn.className = 'py-3 rounded-xl border border-white/5 bg-white/5 text-gray-400 font-bold text-xs uppercase tracking-wider transition-all';
            categorySelect.value = 'Mzda 💶';
        } else {
            expBtn.className = 'py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-black text-xs uppercase tracking-wider transition-all';
            earnBtn.className = 'py-3 rounded-xl border border-white/5 bg-white/5 text-gray-400 font-bold text-xs uppercase tracking-wider transition-all';
            categorySelect.value = 'Potraviny 🛒';
        }
    };

    document.getElementById('add-transaction-modal').classList.remove('hidden');
    document.getElementById('add-transaction-modal').classList.add('flex');
}

export async function saveTransaction() {
    triggerHaptic('medium');

    const type = document.getElementById('trans-type').value;
    const amountVal = parseFloat(document.getElementById('trans-amount').value);
    const description = document.getElementById('trans-desc').value.trim();
    const category = document.getElementById('trans-category').value;

    if (isNaN(amountVal) || amountVal <= 0) {
        showNotification('Prosím zadej platnou kladnou částku!', 'warning');
        return;
    }
    if (!description) {
        showNotification('Prosím vyplň popis transakce!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('brigade_finances')
            .insert({
                user_id: state.currentUser?.id,
                amount: amountVal,
                type,
                description,
                category
            });

        if (error) throw error;

        // Celebrations!
        if (type === 'earning' && typeof window.triggerConfetti === 'function') {
            window.triggerConfetti();
        }

        showNotification('Transakce byla úspěšně uložena! 🎉', 'success');
        document.getElementById('add-transaction-modal')?.remove();
        
        await ensureFinancesData(true);
        renderKasicka();
    } catch (err) {
        console.error('Chyba při ukládání transakce:', err);
        showNotification('Nepodařilo se uložit transakci do databáze.', 'danger');
    }
}

export async function deleteTransaction(id, event) {
    if (event) event.stopPropagation();

    if (!confirm('Opravdu chceš smazat tuto transakci?')) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase
            .from('brigade_finances')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Transakce byla smazána.', 'info');
        await ensureFinancesData(true);
        renderKasicka();
    } catch (err) {
        console.error('Chyba při mazání transakce:', err);
        showNotification('Nepodařilo se smazat transakci.', 'danger');
    }
}

export function changeSavingsGoal() {
    triggerHaptic('light');
    
    const savingsGoalKey = `kiscord_savings_goal_${state.currentUser?.id || 'default'}`;
    const current = localStorage.getItem(savingsGoalKey) || '2000';

    const contentHtml = `
        <div class="space-y-4">
            ${renderInputGroup({
                label: 'Osobní cíl úspor (€)',
                id: 'new-savings-goal',
                type: 'number',
                placeholder: 'např. 2000',
                value: current,
                attr: 'min="1" required'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('change-savings-goal-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button onclick="window.Kasicka.saveSavingsGoal()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20">
                Uložit cíl
            </button>
        </div>
    `;

    // Remove any existing modal first
    document.getElementById('change-savings-goal-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'change-savings-goal-modal',
        title: 'Upravit spořicí cíl',
        subtitle: 'Zadej svůj nový osobní cíl úspor pro brigádu 🏔️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('change-savings-goal-modal').remove()"
    }));

    document.getElementById('change-savings-goal-modal').classList.remove('hidden');
    document.getElementById('change-savings-goal-modal').classList.add('flex');
}

export function saveSavingsGoal() {
    triggerHaptic('medium');
    const inputEl = document.getElementById('new-savings-goal');
    if (!inputEl) return;

    const val = parseFloat(inputEl.value);
    if (isNaN(val) || val <= 0) {
        showNotification('Prosím zadejte platnou kladnou částku!', 'warning');
        return;
    }

    const savingsGoalKey = `kiscord_savings_goal_${state.currentUser?.id || 'default'}`;
    localStorage.setItem(savingsGoalKey, val.toString());
    showNotification('Osobní cíl úspor byl úspěšně aktualizován! 🏔️', 'success');
    
    document.getElementById('change-savings-goal-modal')?.remove();
    renderKasicka();
}
