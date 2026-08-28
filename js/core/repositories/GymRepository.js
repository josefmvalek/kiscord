import { BaseRepository } from './BaseRepository.js';
import { supabase } from '../supabase.js';

export class GymRepository extends BaseRepository {
    constructor() {
        super('gym_logs');
    }

    /**
     * Get exercise catalog with SWR caching in IndexedDB
     * @param {Object} [options={}]
     */
    async getExercises(options = {}) {
        return this.getWithSWR(
            'all_exercises',
            async () => {
                const { data, error } = await supabase
                    .from('gym_exercises')
                    .select('*')
                    .order('name');
                if (error) throw error;
                return data || [];
            },
            { ttlMs: 1000 * 60 * 60 * 24, ...options } // Cache for 24h by default
        );
    }

    /**
     * Get workout history for user or couple
     * @param {string|null} userId 
     * @param {number} limit 
     */
    async getWorkoutHistory(userId = null, limit = 50) {
        let query = supabase
            .from('gym_logs')
            .select('*')
            .order('logged_at', { ascending: false })
            .limit(limit);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Get Personal Records (PRs)
     * @param {string|null} userId 
     */
    async getPRs(userId = null) {
        let query = supabase
            .from('gym_prs')
            .select('*');

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Save a completed workout log
     * @param {Object} logData 
     */
    async saveLog(logData) {
        await this.invalidateCache('workout_history');
        return this.save(logData);
    }
}

export const gymRepository = new GymRepository();
