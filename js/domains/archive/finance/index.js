/**
 * Kiscord Finance Tracker & Savings Goals Module Orchestrator
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';

export * from './store.js';
export * from './budget.js';
export * from './savings.js';

import {
    getFinancesData,
    getActiveTab,
    setActiveTab,
    getActiveFilter,
    setActiveFilter,
    getSavingsGoals,
    loadFinances
} from './store.js';

import {
    renderBudgetTabHtml,
    openAddTransactionModal,
    saveTransaction,
    deleteTransactionItem
} from './budget.js';

import {
    renderSavingsTabHtml,
    openSavingsGoalModal,
    saveSavingsGoal,
    adjustGoalSavings,
    promptAdjustGoal,
    deleteSavingsGoal
} from './savings.js';

export async function renderFinanceTracker(targetTab = null) {
    if (targetTab) setActiveTab(targetTab);
    const container = document.getElementById("messages-container");
    if (!container) return;

    await loadFinances();

    const myId = state.currentUser?.id;
    const financesData = getFinancesData();
    const myItems = financesData.filter(f => f.user_id === myId);

    let totalIncome = 0;
    let totalExpenses = 0;

    myItems.forEach(i => {
        const val = parseFloat(i.amount) || 0;
        if (i.type === 'income') totalIncome += val;
        else totalExpenses += val;
    });

    const netBalance = totalIncome - totalExpenses;

    const activeTab = getActiveTab();
    const activeFilter = getActiveFilter();

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
                            <span class="text-xs px-2 py-0.5 rounded-full bg-[#faa61a]/20 text-[#faa61a] border border-[#faa61a]/30 font-bold font-mono">Brno & VUT FIT</span>
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
                    ${activeTab === 'budget' 
                        ? renderBudgetTabHtml(myItems, totalIncome, totalExpenses, netBalance, activeFilter)
                        : renderSavingsTabHtml(goals, totalSavedInGoals, totalTargetInGoals, overallGoalsProgress)
                    }
                </div>
            </div>
        </div>
    `;

    attachWindowFinanceTracker();
}

export function switchTab(tab) {
    triggerHaptic('light');
    setActiveTab(tab);
    renderFinanceTracker();
}

export function setFilter(filter) {
    triggerHaptic('light');
    setActiveFilter(filter);
    renderFinanceTracker();
}

export function attachWindowFinanceTracker() {
    window.FinanceTracker = {
        render: renderFinanceTracker,
        switchTab,
        setFilter,
        openAddTransactionModal,
        saveTransaction,
        deleteTransactionItem,
        openSavingsGoalModal,
        saveSavingsGoal,
        adjustGoalSavings,
        promptAdjustGoal,
        deleteSavingsGoal
    };
    window.renderFinanceTracker = renderFinanceTracker;
}

if (typeof window !== 'undefined') {
    attachWindowFinanceTracker();
}

export default {
    renderFinanceTracker,
    switchTab,
    setFilter,
    attachWindowFinanceTracker
};
