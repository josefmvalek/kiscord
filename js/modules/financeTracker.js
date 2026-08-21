import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification, showConfirmDialog } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';

let financesData = [];
let activeTab = 'budget'; // 'budget' | 'savings'
let activeFilter = 'all';  // 'all' | 'income' | 'expense'

export async function renderFinanceTracker(targetTab = null) {
    if (targetTab) activeTab = targetTab;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await loadFinances();

    const myId = state.currentUser?.id;
    // Strictly personal items for current user
    const myItems = financesData.filter(f => f.user_id === myId);

    let totalIncome = 0;
    let totalExpenses = 0;

    myItems.forEach(i => {
        const val = parseFloat(i.amount) || 0;
        if (i.type === 'income') totalIncome += val;
        else totalExpenses += val;
    });

    const netBalance = totalIncome - totalExpenses;

    // Load savings goals
    const goals = getSavingsGoals(myId);
    const totalSavedInGoals = goals.reduce((sum, g) => sum + (parseFloat(g.current) || 0), 0);
    const totalTargetInGoals = goals.reduce((sum, g) => sum + (parseFloat(g.target) || 0), 0);
    const overallGoalsProgress = totalTargetInGoals > 0 ? Math.min(Math.round((totalSavedInGoals / totalTargetInGoals) * 100), 100) : 0;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden select-none">
            <!-- Header bar -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#faa61a]/20 to-amber-500/10 flex items-center justify-center text-2xl text-[#faa61a] border border-[#faa61a]/30 shadow-inner">
                        ${activeTab === 'budget' ? '💶' : '🐖'}
                    </div>
                    <div>
                        <h1 class="text-lg font-black text-white uppercase tracking-tight leading-none flex items-center gap-2">
                            <span>Finanční Tracker</span>
                            <span class="text-xs px-2 py-0.5 rounded-full bg-[#faa61a]/20 text-[#faa61a] border border-[#faa61a]/30 font-bold">Brno & VUT FIT</span>
                        </h1>
                        <p class="text-xs text-gray-400 font-semibold mt-1">Osobní rozpočet na kolejích, jídlo a spoření na sny 🎒✨</p>
                    </div>
                </div>

                <!-- Tab Switcher & Main Action -->
                <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div class="flex bg-[#202225] p-1 rounded-xl border border-white/5 text-xs font-black">
                        <button onclick="window.FinanceTracker.switchTab('budget')" 
                            class="px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'budget' ? 'bg-[#5865F2] text-white shadow-lg' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-wallet"></i> Rozpočet Brno
                        </button>
                        <button onclick="window.FinanceTracker.switchTab('savings')" 
                            class="px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'savings' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-piggy-bank"></i> Kasička & Spoření
                        </button>
                    </div>

                    ${activeTab === 'budget' ? `
                        <button onclick="window.FinanceTracker.openAddTransactionModal()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                            <i class="fas fa-plus text-xs"></i> Zadat transakci
                        </button>
                    ` : `
                        <button onclick="window.FinanceTracker.openSavingsGoalModal()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95">
                            <i class="fas fa-plus text-xs"></i> Nový cíl
                        </button>
                    `}
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-24">
                <div class="max-w-4xl mx-auto space-y-6">

                    ${activeTab === 'budget' ? `
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
                            <div class="flex bg-[#202225] p-1 rounded-xl border border-white/5 text-[10px] font-bold">
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
                    ` : `
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
                                            <div class="flex items-center justify-between gap-2 pt-3 border-t border-white/5 text-xs font-bold">
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
                    `}

                </div>
            </div>
        </div>
    `;

    attachWindowFinanceTracker();
}

function getSavingsGoals(userId) {
    const key = `kiscord_savings_goals_${userId || 'default'}`;
    const cached = localStorage.getItem(key);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch (e) {
            return [];
        }
    }
    // Default initial goals
    const defaults = [
        { emoji: '🏖️', title: 'Letní Dovolená', target: 15000, current: 3500, note: 'Moře & relax po zkouškách' },
        { emoji: '💻', title: 'Technika & Monitor', target: 8000, current: 2000, note: 'Vybavení na pokoj VUT FIT' },
        { emoji: '🛡️', title: 'Železná Rezerva', target: 10000, current: 4500, note: 'Pro nečekané výdaje' }
    ];
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
}

function saveSavingsGoals(userId, goals) {
    const key = `kiscord_savings_goals_${userId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(goals));
}

async function loadFinances() {
    try {
        const { data, error } = await supabase.from('app_finances').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            financesData = data;
            return;
        }

        // Fallback to brigade_finances if app_finances table is not yet created in Supabase
        const { data: bData, error: bError } = await supabase.from('brigade_finances').select('*').order('created_at', { ascending: false });
        if (!bError && bData) {
            financesData = bData.map(b => ({
                id: b.id,
                user_id: b.user_id,
                title: b.description,
                amount: b.amount,
                type: b.type === 'earning' ? 'income' : 'expense',
                category: b.category,
                is_shared: false,
                created_at: b.created_at
            }));
        } else {
            financesData = [];
        }
    } catch (e) {
        console.error("[FinanceTracker] Load error:", e);
        financesData = [];
    }
}

export function switchTab(tab) {
    triggerHaptic('light');
    activeTab = tab;
    renderFinanceTracker();
}

export function setFilter(filter) {
    triggerHaptic('light');
    activeFilter = filter;
    renderFinanceTracker();
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
                    value: defaultAmount,
                    placeholder: 'např. 350'
                })}
            </div>

            ${renderInputGroup({
                label: 'Název transakce / popis',
                id: 'fin-title',
                value: defaultTitle,
                placeholder: 'např. Nájem kolej VUT, Nákup Albert, Menza...'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kategorie</label>
                <select id="fin-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <option value="Menza & Obědy" ${defaultCategory.includes('Menza') ? 'selected' : ''}>Menza & Obědy 🍲</option>
                    <option value="Jídlo & Potraviny" ${defaultCategory.includes('Jídlo') ? 'selected' : ''}>Jídlo & Potraviny 🛒</option>
                    <option value="Kolej & Bydlení" ${defaultCategory.includes('Kolej') ? 'selected' : ''}>Kolej & Bydlení 🏠</option>
                    <option value="Drogerie & Potřeby" ${defaultCategory.includes('Drogerie') ? 'selected' : ''}>Drogerie & Potřeby 🧼</option>
                    <option value="Škola & VUT FIT" ${defaultCategory.includes('Škola') ? 'selected' : ''}>Škola & VUT FIT 📚</option>
                    <option value="Doprava & Šalina" ${defaultCategory.includes('Doprava') ? 'selected' : ''}>Doprava & Šalina 🚋</option>
                    <option value="Brigáda & Práce" ${defaultCategory.includes('Brigáda') ? 'selected' : ''}>Brigáda & Práce 💼</option>
                    <option value="Zábava & Relax" ${defaultCategory.includes('Zábava') ? 'selected' : ''}>Zábava & Relax 🎉</option>
                    <option value="Ostatní" ${defaultCategory === 'Ostatní' ? 'selected' : ''}>Ostatní 📦</option>
                </select>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-finance-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.FinanceTracker.saveTransactionItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit transakci
            </button>
        </div>
    `;

    document.getElementById('add-finance-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-finance-modal',
        title: 'Zadat Transakci',
        subtitle: 'Osobní rozpočet Brno & VUT FIT 💶',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-finance-modal').remove()"
    }));

    document.getElementById('add-finance-modal').classList.remove('hidden');
    document.getElementById('add-finance-modal').classList.add('flex');
}

export async function saveTransactionItem() {
    triggerHaptic('medium');

    const typeEl = document.getElementById('fin-type');
    const amountEl = document.getElementById('fin-amount');
    const titleEl = document.getElementById('fin-title');
    const catEl = document.getElementById('fin-cat');

    const type = typeEl ? typeEl.value : 'expense';
    const amount = amountEl ? (parseFloat(amountEl.value) || 0) : 0;
    const title = titleEl ? titleEl.value.trim() : '';
    const category = catEl ? catEl.value : 'Ostatní';

    if (!title || amount <= 0) {
        showNotification('Zadejte název a platnou částku!', 'warning');
        return;
    }

    try {
        const { error: appError } = await supabase
            .from('app_finances')
            .insert({
                user_id: state.currentUser?.id,
                title,
                amount,
                type,
                category,
                is_shared: false
            });

        if (appError) {
            // Fallback to brigade_finances
            const { error: brigError } = await supabase
                .from('brigade_finances')
                .insert({
                    user_id: state.currentUser?.id,
                    amount,
                    type: type === 'income' ? 'earning' : 'expense',
                    description: title,
                    category
                });
            if (brigError) throw brigError;
            await import('../core/state.js').then(s => s.ensureFinancesData(true)).catch(() => {});
        }

        showNotification('Transakce uložena! 💶', 'success');
        document.getElementById('add-finance-modal')?.remove();
        renderFinanceTracker();
    } catch (e) {
        console.error("[FinanceTracker] Save error:", e);
        showNotification('Nepodařilo se uložit transakci: ' + e.message, 'danger');
    }
}

export async function deleteTransactionItem(id) {
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tuto transakci?');
    if (!confirmed) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase.from('app_finances').delete().eq('id', id);
        if (error) {
            await supabase.from('brigade_finances').delete().eq('id', id);
            await import('../core/state.js').then(s => s.ensureFinancesData(true)).catch(() => {});
        }

        showNotification('Transakce smazána.', 'info');
        renderFinanceTracker();
    } catch (e) {
        console.error("[FinanceTracker] Delete error:", e);
    }
}

export function openSavingsGoalModal(editIndex = null) {
    triggerHaptic('light');

    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    const goal = editIndex !== null ? goals[editIndex] : { emoji: '🐖', title: '', target: '', note: '' };

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-4 gap-3">
                <div class="space-y-1 col-span-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Emoji</label>
                    <input type="text" id="goal-emoji" value="${goal.emoji || '🐖'}" class="w-full bg-[#202225] text-white text-center text-xl p-2.5 rounded-xl border border-[#2f3136] outline-none focus:border-[#faa61a]" />
                </div>
                <div class="space-y-1 col-span-3">
                    ${renderInputGroup({
                        label: 'Název cíle / na co šetříš',
                        id: 'goal-title',
                        value: goal.title,
                        placeholder: 'např. Letní dovolená, Nový monitor...'
                    })}
                </div>
            </div>

            ${renderInputGroup({
                label: 'Cílová částka (CZK)',
                id: 'goal-target',
                type: 'number',
                value: goal.target,
                placeholder: 'např. 15000'
            })}

            ${renderInputGroup({
                label: 'Poznámka / motivace',
                id: 'goal-note',
                value: goal.note,
                placeholder: 'např. Odměna po zkouškovém!'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('savings-goal-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.FinanceTracker.saveSavingsGoal(${editIndex})" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-amber-500/20">
                ${editIndex !== null ? 'Uložit změny' : 'Vytvořit cíl'}
            </button>
        </div>
    `;

    document.getElementById('savings-goal-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'savings-goal-modal',
        title: editIndex !== null ? 'Upravit Spořicí Cíl' : 'Nový Spořicí Cíl',
        subtitle: 'Kasička & Plnění snů 🐖✨',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('savings-goal-modal').remove()"
    }));

    document.getElementById('savings-goal-modal').classList.remove('hidden');
    document.getElementById('savings-goal-modal').classList.add('flex');
}

export function saveSavingsGoal(editIndex = null) {
    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);

    const emoji = document.getElementById('goal-emoji')?.value.trim() || '🐖';
    const title = document.getElementById('goal-title')?.value.trim();
    const target = parseFloat(document.getElementById('goal-target')?.value) || 0;
    const note = document.getElementById('goal-note')?.value.trim() || '';

    if (!title || target <= 0) {
        showNotification('Vyplňte název a cílovou částku!', 'warning');
        return;
    }

    if (editIndex !== null && goals[editIndex]) {
        goals[editIndex].emoji = emoji;
        goals[editIndex].title = title;
        goals[editIndex].target = target;
        goals[editIndex].note = note;
    } else {
        goals.push({
            emoji,
            title,
            target,
            current: 0,
            note
        });
    }

    saveSavingsGoals(myId, goals);
    triggerHaptic('success');
    showNotification('Spořicí cíl uložen! 🐖', 'success');
    document.getElementById('savings-goal-modal')?.remove();
    renderFinanceTracker('savings');
}

export function adjustGoalSavings(index, amount) {
    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    if (!goals[index]) return;

    goals[index].current = Math.max(0, (parseFloat(goals[index].current) || 0) + amount);
    saveSavingsGoals(myId, goals);

    triggerHaptic('medium');
    if (goals[index].current >= goals[index].target) {
        triggerConfetti();
        showNotification(`🎉 Gratulace! Cíl "${goals[index].title}" je splněn!`, 'success');
    } else {
        showNotification(`Do kasičky přidáno +${amount} CZK!`, 'success');
    }

    renderFinanceTracker('savings');
}

export async function promptAdjustGoal(index) {
    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    if (!goals[index]) return;

    const currentVal = goals[index].current || 0;
    const input = prompt(`Upravit aktuální naspořenou částku pro "${goals[index].title}":`, currentVal);
    if (input === null) return;

    const parsed = parseFloat(input);
    if (isNaN(parsed) || parsed < 0) {
        showNotification('Zadejte platné kladné číslo.', 'warning');
        return;
    }

    goals[index].current = parsed;
    saveSavingsGoals(myId, goals);
    triggerHaptic('success');
    showNotification('Částka v kasičce upravena.', 'info');
    renderFinanceTracker('savings');
}

export async function deleteSavingsGoal(index) {
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento spořicí cíl?');
    if (!confirmed) return;

    const myId = state.currentUser?.id;
    const goals = getSavingsGoals(myId);
    goals.splice(index, 1);
    saveSavingsGoals(myId, goals);

    triggerHaptic('medium');
    showNotification('Spořicí cíl byl smazán.', 'info');
    renderFinanceTracker('savings');
}

export function attachWindowFinanceTracker() {
    window.FinanceTracker = {
        renderFinanceTracker,
        switchTab,
        setFilter,
        openAddTransactionModal,
        saveTransactionItem,
        deleteTransactionItem,
        openSavingsGoalModal,
        saveSavingsGoal,
        adjustGoalSavings,
        promptAdjustGoal,
        deleteSavingsGoal
    };
    // Legacy window shortcuts
    window.openAddTransactionModal = openAddTransactionModal;
    window.saveTransactionItem = saveTransactionItem;
    window.deleteTransactionItem = deleteTransactionItem;
}

// Auto-attach
attachWindowFinanceTracker();
