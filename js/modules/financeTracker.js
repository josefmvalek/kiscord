import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';

let financesData = [];

export async function renderFinanceTracker() {
    if (state.currentChannel !== 'finance-tracker') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await loadFinances();

    const myId = state.currentUser?.id;
    const myItems = financesData.filter(f => f.user_id === myId || f.is_shared);

    let totalIncome = 0;
    let totalExpenses = 0;

    myItems.forEach(i => {
        const val = parseFloat(i.amount) || 0;
        if (i.type === 'income') totalIncome += val;
        else totalExpenses += val;
    });

    const netBalance = totalIncome - totalExpenses;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <!-- Header bar -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-[#faa61a]/10 flex items-center justify-center text-xl text-[#faa61a] border border-[#faa61a]/20">
                        💶
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight leading-none">Finanční Tracker Brno</h1>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Kolej, jídlo, brigády & rozpočet VUT FIT 🎒</p>
                    </div>
                </div>

                <button onclick="window.openAddTransactionModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center">
                    <i class="fas fa-plus text-xs"></i> Přidat transakci
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-24">
                <div class="max-w-4xl mx-auto space-y-6">

                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono select-none">
                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5">
                            <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Celkové Příjmy</span>
                            <span class="text-xl font-black text-emerald-400">+${totalIncome.toFixed(0)} CZK</span>
                        </div>

                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5">
                            <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Celkové Výdaje</span>
                            <span class="text-xl font-black text-rose-400">-${totalExpenses.toFixed(0)} CZK</span>
                        </div>

                        <div class="glass-card bg-gradient-to-r from-[#faa61a]/10 to-amber-500/5 border border-[#faa61a]/20 rounded-3xl p-5">
                            <span class="text-[9px] font-black uppercase tracking-widest text-amber-400/80 block mb-1">Čisté Úspory</span>
                            <span class="text-xl font-black ${netBalance >= 0 ? 'text-amber-400' : 'text-rose-400'}">${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(0)} CZK</span>
                        </div>
                    </div>

                    <!-- Transactions List -->
                    <div class="space-y-3">
                        <h2 class="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <span>Historie Transakcí (${myItems.length})</span>
                        </h2>

                        <div class="space-y-2.5">
                            ${myItems.length === 0 ? `
                                <div class="p-8 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl text-center text-xs text-gray-500 italic">
                                    Zatím žádné zadané výdaje ani příjmy. Přidejte první záznam!
                                </div>
                            ` : myItems.sort((a,b) => b.created_at.localeCompare(a.created_at)).map(item => {
                                const isIncome = item.type === 'income';
                                const dateFormatted = new Date(item.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

                                return `
                                    <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 transition group">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${isIncome ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                                                <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xs font-bold text-white truncate">${item.title}</span>
                                                    ${item.is_shared ? `<span class="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">Společný výdaj</span>` : ''}
                                                </div>
                                                <span class="text-[10px] text-gray-500 font-medium block mt-0.5">${item.category || 'Ostatní'} • ${dateFormatted}</span>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3 flex-shrink-0 font-mono select-none">
                                            <span class="text-sm font-black ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">
                                                ${isIncome ? '+' : '-'}${parseFloat(item.amount).toFixed(0)} CZK
                                            </span>
                                            <button onclick="window.deleteTransactionItem('${item.id}')" class="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition">
                                                <i class="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    attachWindowFinanceTracker();
}

async function loadFinances() {
    try {
        const { data, error } = await supabase.from('app_finances').select('*');
        if (!error && data) {
            financesData = data;
        } else {
            financesData = [];
        }
    } catch (e) {
        console.error("[FinanceTracker] Load error:", e);
        financesData = [];
    }
}

export function openAddTransactionModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Typ transakce</label>
                    <select id="fin-type" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                        <option value="expense">Výdaj 🔴</option>
                        <option value="income">Příjem 🟢</option>
                    </select>
                </div>

                ${renderInputGroup({
                    label: 'Částka (CZK)',
                    id: 'fin-amount',
                    type: 'number',
                    placeholder: 'např. 3500'
                })}
            </div>

            ${renderInputGroup({
                label: 'Název transakce / popis',
                id: 'fin-title',
                placeholder: 'např. Nájem kolej VUT, Nákup Albert, Stravné...'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                <select id="fin-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <option value="Kolej & Bydlení">Kolej & Bydlení 🏠</option>
                    <option value="Jídlo & Potraviny">Jídlo & Potraviny 🛒</option>
                    <option value="Škola & Pomůcky">Škola & Pomůcky 📚</option>
                    <option value="Brigáda & Práce">Brigáda & Práce 💼</option>
                    <option value="Zábava & Rande">Zábava & Rande 🎉</option>
                    <option value="Ostatní">Ostatní 📦</option>
                </select>
            </div>

            <div class="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                <input type="checkbox" id="fin-shared" class="w-4 h-4 rounded accent-[#faa61a]">
                <label for="fin-shared" class="text-xs font-bold text-white cursor-pointer select-none">
                    Společný výdaj / nákup pro oba 🤝
                </label>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-finance-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.saveTransactionItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit transakci
            </button>
        </div>
    `;

    document.getElementById('add-finance-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-finance-modal',
        title: 'Přidat Transakci',
        subtitle: 'Rozpočet & Finance VUT FIT 💶',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-finance-modal').remove()"
    }));

    document.getElementById('add-finance-modal').classList.remove('hidden');
    document.getElementById('add-finance-modal').classList.add('flex');
}

export async function saveTransactionItem() {
    triggerHaptic('medium');

    const type = document.getElementById('fin-type').value;
    const amount = parseFloat(document.getElementById('fin-amount').value) || 0;
    const title = document.getElementById('fin-title').value.trim();
    const category = document.getElementById('fin-cat').value;
    const isShared = document.getElementById('fin-shared').checked;

    if (!title || amount <= 0) {
        showNotification('Zadejte název a platnou částku!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('app_finances')
            .insert({
                user_id: state.currentUser?.id,
                title,
                amount,
                type,
                category,
                is_shared: isShared
            });

        if (error) throw error;

        showNotification('Transakce uložena! 💶', 'success');
        document.getElementById('add-finance-modal')?.remove();
        renderFinanceTracker();
    } catch (e) {
        console.error("[FinanceTracker] Save error:", e);
        showNotification('Nepodařilo se uložit transakci: ' + e.message, 'danger');
    }
}

export async function deleteTransactionItem(id) {
    if (!confirm('Opravdu smazat tuto transakci?')) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase.from('app_finances').delete().eq('id', id);
        if (error) throw error;

        showNotification('Transakce smazána.', 'info');
        renderFinanceTracker();
    } catch (e) {
        console.error("[FinanceTracker] Delete error:", e);
    }
}

function attachWindowFinanceTracker() {
    window.openAddTransactionModal = openAddTransactionModal;
    window.saveTransactionItem = saveTransactionItem;
    window.deleteTransactionItem = deleteTransactionItem;
}
