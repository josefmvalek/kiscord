/**
 * Finance Tracker State Store & Supabase/localStorage Persistence
 */

import { supabase } from '@core/supabase.js';

let financesData = [];
let activeTab = 'budget'; // 'budget' | 'savings'
let activeFilter = 'all';  // 'all' | 'income' | 'expense'

export function getFinancesData() {
    return financesData;
}

export function setFinancesData(data) {
    financesData = data;
}

export function getActiveTab() {
    return activeTab;
}

export function setActiveTab(tab) {
    activeTab = tab;
}

export function getActiveFilter() {
    return activeFilter;
}

export function setActiveFilter(filter) {
    activeFilter = filter;
}

export function getSavingsGoals(userId) {
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

export function saveSavingsGoals(userId, goals) {
    const key = `kiscord_savings_goals_${userId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(goals));
}

export async function loadFinances() {
    try {
        const { data, error } = await supabase.from('app_finances').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            financesData = data;
            return financesData;
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
    return financesData;
}
