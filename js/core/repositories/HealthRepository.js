import { BaseRepository } from './BaseRepository.js';
import { supabase } from '../supabase.js';

export class HealthRepository extends BaseRepository {
    constructor() {
        super('health_data');
    }

    async getHistory(userId, days = 30) {
        let query = supabase
            .from('health_data')
            .select('*')
            .order('date_key', { ascending: false })
            .limit(days);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async saveDailyHealth(dateKey, userId, healthPayload) {
        return this.save({
            date_key: dateKey,
            user_id: userId,
            ...healthPayload
        }, 'date_key,user_id');
    }
}

export const healthRepository = new HealthRepository();
