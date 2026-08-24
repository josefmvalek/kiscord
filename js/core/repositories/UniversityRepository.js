import { BaseRepository } from './BaseRepository.js';

export class UniversityRepository extends BaseRepository {
    constructor() {
        super('matura_cards');
    }

    /**
     * Get Matura Cards for a subject or all
     * @param {string|null} [subject=null]
     * @param {Object} [options={}]
     */
    async getMaturaCards(subject = null, options = {}) {
        const filters = subject ? { subject } : {};
        return this.getAllWithSWR(filters, 'card_index', true, options);
    }

    /**
     * Save a matura card progress
     * @param {Object} card
     */
    async saveMaturaCard(card) {
        await this.invalidateCache('all_{}_card_index_true');
        return this.save(card);
    }

    /**
     * Get FIT VUT Study Plan courses
     * @param {Object} [options={}]
     */
    async getFitStudyPlan(options = {}) {
        const repo = new BaseRepository('fit_study_plan');
        return repo.getAllWithSWR({}, 'semester', true, options);
    }

    /**
     * Save / update a FIT course
     * @param {Object} course
     */
    async saveFitCourse(course) {
        const repo = new BaseRepository('fit_study_plan');
        await repo.invalidateCache('all_{}_semester_true');
        return repo.save(course);
    }
}
