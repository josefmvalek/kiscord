import { BaseRepository } from './BaseRepository.js';

export class EntertainmentRepository extends BaseRepository {
    constructor() {
        super('achievements');
    }

    /**
     * Get unlocked and locked achievements
     * @param {Object} [options={}]
     */
    async getAchievements(options = {}) {
        return this.getAllWithSWR({}, 'created_at', false, options);
    }

    /**
     * Unlock / toggle an achievement
     * @param {Object} achievement
     */
    async saveAchievement(achievement) {
        await this.invalidateCache('all_{}_created_at_false');
        return this.save(achievement);
    }

    /**
     * Get user quests
     * @param {Object} [options={}]
     */
    async getQuests(options = {}) {
        const repo = new BaseRepository('quests');
        return repo.getAllWithSWR({}, 'created_at', false, options);
    }

    /**
     * Get Tierlists
     * @param {Object} [options={}]
     */
    async getTierlists(options = {}) {
        const repo = new BaseRepository('tierlists');
        return repo.getAllWithSWR({}, 'created_at', false, options);
    }

    /**
     * Save a custom tierlist
     * @param {Object} tierlist
     */
    async saveTierlist(tierlist) {
        const repo = new BaseRepository('tierlists');
        await repo.invalidateCache('all_{}_created_at_false');
        return repo.save(tierlist);
    }
}
