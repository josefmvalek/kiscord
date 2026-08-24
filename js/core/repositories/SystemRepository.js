import { BaseRepository } from './BaseRepository.js';

export class SystemRepository extends BaseRepository {
    constructor() {
        super('profiles');
    }

    /**
     * Get user profile
     * @param {string} userId
     * @param {Object} [options={}]
     */
    async getProfile(userId, options = {}) {
        return this.getByIdWithSWR(userId, options);
    }

    /**
     * Save user profile
     * @param {Object} profile
     */
    async saveProfile(profile) {
        if (profile.id) {
            await this.invalidateCache(`id_${profile.id}`);
        }
        return this.save(profile);
    }

    /**
     * Get changelog entries
     * @param {Object} [options={}]
     */
    async getChangelog(options = {}) {
        const repo = new BaseRepository('changelog');
        return repo.getAllWithSWR({}, 'created_at', false, options);
    }
}
