import { BaseRepository } from './BaseRepository.js';
import { supabase } from '../supabase.js';

export class UniversityRepository extends BaseRepository {
    constructor() {
        super('school_subjects');
    }

    /**
     * Get all school subjects with SWR caching
     * @param {Object} [options={}]
     */
    async getSubjects(options = {}) {
        return this.getWithSWR(
            'all_school_subjects',
            async () => {
                const { data, error } = await supabase
                    .from('school_subjects')
                    .select('*')
                    .order('code');
                if (error) throw error;
                return data || [];
            },
            options
        );
    }

    /**
     * Get school deadlines with SWR caching
     * @param {Object} [options={}]
     */
    async getDeadlines(options = {}) {
        const repo = new BaseRepository('school_deadlines');
        return repo.getWithSWR(
            'all_school_deadlines',
            async () => {
                const { data, error } = await supabase
                    .from('school_deadlines')
                    .select('*')
                    .order('deadline_date', { ascending: true });
                if (error) throw error;
                return data || [];
            },
            options
        );
    }

    /**
     * Get timetable schedule items
     * @param {Object} [options={}]
     */
    async getScheduleItems(options = {}) {
        const repo = new BaseRepository('schedule_items');
        return repo.getWithSWR(
            'all_schedule_items',
            async () => {
                const { data, error } = await supabase
                    .from('schedule_items')
                    .select('*')
                    .order('day_of_week', { ascending: true })
                    .order('time_start', { ascending: true });
                if (error) throw error;
                return data || [];
            },
            options
        );
    }

    /**
     * Get Matura topics catalog
     * @param {Object} [options={}]
     */
    async getMaturaTopics(options = {}) {
        const repo = new BaseRepository('matura_topics');
        return repo.getWithSWR(
            'all_matura_topics',
            async () => {
                const { data, error } = await supabase
                    .from('matura_topics')
                    .select('*')
                    .order('title');
                if (error) throw error;
                return data || [];
            },
            options
        );
    }

    /**
     * Get Matura flashcards for a specific subject or all
     * @param {string|null} [subject=null]
     * @param {Object} [options={}]
     */
    async getMaturaCards(subject = null, options = {}) {
        const repo = new BaseRepository('matura_cards');
        const cacheKey = subject ? `matura_cards_${subject}` : 'all_matura_cards';
        return repo.getWithSWR(
            cacheKey,
            async () => {
                let query = supabase.from('matura_cards').select('*');
                if (subject) {
                    query = query.eq('subject', subject);
                }
                query = query.order('created_at', { ascending: true });
                const { data, error } = await query;
                if (error) throw error;
                return data || [];
            },
            options
        );
    }
}

export const universityRepository = new UniversityRepository();
