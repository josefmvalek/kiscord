import { BaseRepository } from './BaseRepository.js';

export class CoupleRepository extends BaseRepository {
    constructor() {
        super('coupons');
    }

    /**
     * Get all active and redeemed coupons
     * @param {Object} [options={}]
     */
    async getCoupons(options = {}) {
        return this.getAllWithSWR({}, 'created_at', false, options);
    }

    /**
     * Save / purchase a coupon
     * @param {Object} coupon
     */
    async saveCoupon(coupon) {
        await this.invalidateCache('all_{}_created_at_false');
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
        return repo.getAllWithSWR({}, 'date_key', false, options);
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
