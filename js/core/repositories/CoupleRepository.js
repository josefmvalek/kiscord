import { BaseRepository } from './BaseRepository.js';
import { supabase } from '../supabase.js';

export class CoupleRepository extends BaseRepository {
    constructor() {
        super('user_coupons');
    }

    /**
     * Get all shop catalog items with SWR caching
     * @param {Object} [options={}]
     */
    async getShopItems(options = {}) {
        const repo = new BaseRepository('love_shop_items');
        return repo.getWithSWR(
            'all_shop_items',
            async () => {
                const { data, error } = await supabase
                    .from('love_shop_items')
                    .select('*')
                    .order('cost');
                if (error) throw error;
                return data || [];
            },
            options
        );
    }

    /**
     * Get all coupons (or for a specific user) with SWR caching
     * @param {Object} [options={}]
     */
    async getCoupons(options = {}) {
        return this.getAllWithSWR({}, 'created_at', false, options);
    }

    /**
     * Get user inventory coupons with joined shop items
     * @param {string} userId 
     * @param {Object} [options={}]
     */
    async getUserCoupons(userId, options = {}) {
        return this.getWithSWR(
            `user_coupons_${userId}`,
            async () => {
                const { data, error } = await supabase
                    .from('user_coupons')
                    .select('*, love_shop_items(*)')
                    .or(`owner_id.eq.${userId},creator_id.eq.${userId}`)
                    .order('is_fulfilled', { ascending: true })
                    .order('is_redeemed', { ascending: true })
                    .order('has_star', { ascending: false })
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            },
            options
        );
    }

    /**
     * Save / purchase a coupon
     * @param {Object} coupon
     */
    async saveCoupon(coupon) {
        if (coupon.owner_id) {
            await this.invalidateCache(`user_coupons_${coupon.owner_id}`);
        }
        return this.save(coupon);
    }

    /**
     * Get Love Letters
     * @param {Object} [options={}]
     */
    async getLetters(options = {}) {
        const repo = new BaseRepository('love_letters');
        return repo.getAllWithSWR({}, 'created_at', false, options);
    }

    /**
     * Save a love letter
     * @param {Object} letter
     */
    async saveLetter(letter) {
        const repo = new BaseRepository('love_letters');
        await repo.invalidateCache('all_{}_created_at_false');
        return repo.save(letter);
    }

    /**
     * Get Daily Questions
     * @param {Object} [options={}]
     */
    async getDailyQuestions(options = {}) {
        const repo = new BaseRepository('daily_questions');
        return repo.getAllWithSWR({}, 'created_at', false, options);
    }

    /**
     * Get confessions
     * @param {Object} [options={}]
     */
    async getConfessions(options = {}) {
        const repo = new BaseRepository('confessions');
        return repo.getAllWithSWR({}, 'created_at', false, options);
    }
}

export const coupleRepository = new CoupleRepository();
