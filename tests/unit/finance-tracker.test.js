import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    getFinancesData, 
    setFinancesData, 
    getActiveTab, 
    setActiveTab, 
    getActiveFilter, 
    setActiveFilter,
    getSavingsGoals,
    saveSavingsGoals
} from '../../js/domains/archive/finance/store.js';
import { renderBudgetTabHtml } from '../../js/domains/archive/finance/budget.js';
import { adjustGoalSavings, renderSavingsTabHtml } from '../../js/domains/archive/finance/savings.js';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
            select: vi.fn().mockReturnThis(),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
    }
}));

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn(),
    showConfirmDialog: vi.fn(() => Promise.resolve(true))
}));

describe('Finance Tracker & Savings Goals Sub-Modules (js/modules/finance/)', () => {
    beforeEach(() => {
        localStorage.clear();
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        setActiveTab('budget');
        setActiveFilter('all');
        setFinancesData([]);
    });

    describe('Finance Store (store.js)', () => {
        it('should get and set active tab and filter', () => {
            expect(getActiveTab()).toBe('budget');
            setActiveTab('savings');
            expect(getActiveTab()).toBe('savings');

            expect(getActiveFilter()).toBe('all');
            setActiveFilter('expense');
            expect(getActiveFilter()).toBe('expense');
        });

        it('should load default savings goals if none cached and persist updates', () => {
            const goals = getSavingsGoals('user-jose');
            expect(goals.length).toBeGreaterThan(0);
            expect(goals[0].title).toBe('Letní Dovolená');

            goals[0].current = 5000;
            saveSavingsGoals('user-jose', goals);

            const reloaded = getSavingsGoals('user-jose');
            expect(reloaded[0].current).toBe(5000);
        });
    });

    describe('Budget & Transactions (budget.js)', () => {
        it('should correctly render financial summary and transaction list', () => {
            const items = [
                { id: '1', title: 'Stipendium', amount: 3000, type: 'income', category: 'Stipendium', created_at: '2026-08-20T10:00:00Z' },
                { id: '2', title: 'Menza Oběd', amount: 120, type: 'expense', category: 'Jídlo & Potraviny', created_at: '2026-08-21T12:00:00Z' }
            ];

            const totalIncome = 3000;
            const totalExpenses = 120;
            const netBalance = 2880;

            const html = renderBudgetTabHtml(items, totalIncome, totalExpenses, netBalance, 'all');
            expect(html).toContain('+3 000 CZK');
            expect(html).toContain('-120 CZK');
            expect(html).toContain('+2 880 CZK');
            expect(html).toContain('Stipendium');
            expect(html).toContain('Menza Oběd');
        });
    });

    describe('Savings Goals (savings.js)', () => {
        it('should correctly adjust savings amount by increment and never go below zero', () => {
            const initialGoals = [
                { emoji: '🏖️', title: 'Výlet do Alp', target: 5000, current: 1000 }
            ];
            saveSavingsGoals('user-jose', initialGoals);

            adjustGoalSavings(0, 500);
            let updated = getSavingsGoals('user-jose');
            expect(updated[0].current).toBe(1500);

            // Large withdrawal below zero -> clamped to 0
            adjustGoalSavings(0, -3000);
            updated = getSavingsGoals('user-jose');
            expect(updated[0].current).toBe(0);
        });

        it('should render savings goals with progress percentage', () => {
            const goals = [
                { emoji: '💻', title: 'Nový Monitor', target: 10000, current: 5000 }
            ];
            const html = renderSavingsTabHtml(goals, 5000, 10000, 50);
            expect(html).toContain('Nový Monitor');
            expect(html).toContain('Naspořeno 50 %');
            expect(html).toContain('5 000 CZK');
        });
    });
});
