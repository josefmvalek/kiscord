/**
 * Kiscord Centralized Repositories Registry & SWR Data Layer
 * Provides typed, offline-first singleton access to all domain repositories.
 */

import { BaseRepository } from './BaseRepository.js';
import { GymRepository } from './GymRepository.js';
import { HealthRepository } from './HealthRepository.js';
import { FinanceRepository } from './FinanceRepository.js';
import { MediaRepository } from './MediaRepository.js';
import { CoupleRepository } from './CoupleRepository.js';
import { UniversityRepository } from './UniversityRepository.js';
import { EntertainmentRepository } from './EntertainmentRepository.js';
import { SystemRepository } from './SystemRepository.js';

export {
    BaseRepository,
    GymRepository,
    HealthRepository,
    FinanceRepository,
    MediaRepository,
    CoupleRepository,
    UniversityRepository,
    EntertainmentRepository,
    SystemRepository
};

/**
 * Singleton instances for all domain repositories
 */
export const repositories = {
    gym: new GymRepository(),
    health: new HealthRepository(),
    finance: new FinanceRepository(),
    media: new MediaRepository(),
    couple: new CoupleRepository(),
    university: new UniversityRepository(),
    entertainment: new EntertainmentRepository(),
    system: new SystemRepository()
};

export default repositories;
