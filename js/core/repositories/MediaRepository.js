import { BaseRepository } from './BaseRepository.js';
import { supabase } from '../supabase.js';

export class MediaRepository extends BaseRepository {
    constructor() {
        super('library_content');
    }

    async getMediaByType(type) {
        const { data, error } = await supabase
            .from('library_content')
            .select('*')
            .eq('type', type)
            .order('title');
        if (error) throw error;
        return data || [];
    }

    async getWatchlist() {
        const { data, error } = await supabase
            .from('library_watchlist')
            .select('*, library_content(*)');
        if (error) throw error;
        return data || [];
    }
}

export const mediaRepository = new MediaRepository();
