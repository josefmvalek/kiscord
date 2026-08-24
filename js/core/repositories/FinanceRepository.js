import { BaseRepository } from './BaseRepository.js';
import { supabase } from '../supabase.js';

export class FinanceRepository extends BaseRepository {
    constructor() {
        super('app_finances');
    }

    async getMonthlyExpenses(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const { data, error } = await supabase
            .from('app_finances')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async addExpense(expense) {
        return this.insert(expense);
    }
}

export const financeRepository = new FinanceRepository();
