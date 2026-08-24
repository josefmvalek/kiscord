import { BaseRepository } from './BaseRepository.js';
import { supabase } from '../supabase.js';

export class GymRepository extends BaseRepository {
    constructor() {
        super('gym_workouts');
    }

    async getExercises() {
        const { data, error } = await supabase
            .from('gym_exercises')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    }

    async getWorkoutHistory(userId, limit = 50) {
        let query = supabase
            .from('gym_workouts')
            .select('*, gym_sets(*)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async saveWorkoutWithSets(workoutData, sets) {
        const { data: savedWorkout, error: workoutError } = await this.save(workoutData);
        if (workoutError) throw workoutError;

        if (Array.isArray(sets) && sets.length > 0 && savedWorkout) {
            const workoutId = savedWorkout[0]?.id || workoutData.id;
            const preparedSets = sets.map(s => ({ ...s, workout_id: workoutId }));
            await supabase.from('gym_sets').upsert(preparedSets);
        }

        return savedWorkout;
    }
}

export const gymRepository = new GymRepository();
