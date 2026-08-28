import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
    }
}));

import { BaseRepository } from '../../js/core/repositories/BaseRepository.js';
import { GymRepository } from '../../js/core/repositories/GymRepository.js';
import { HealthRepository } from '../../js/core/repositories/HealthRepository.js';
import { FinanceRepository } from '../../js/core/repositories/FinanceRepository.js';

describe('Data Access Repositories', () => {
    it('BaseRepository initializes with table name and exposes standard CRUD contracts', () => {
        const repo = new BaseRepository('test_table');
        expect(repo.tableName).toBe('test_table');
        expect(typeof repo.getAll).toBe('function');
        expect(typeof repo.getById).toBe('function');
        expect(typeof repo.save).toBe('function');
        expect(typeof repo.insert).toBe('function');
        expect(typeof repo.update).toBe('function');
        expect(typeof repo.delete).toBe('function');
    });

    it('Domain repositories extend BaseRepository and expose domain specific methods', () => {
        const gymRepo = new GymRepository();
        const healthRepo = new HealthRepository();
        const financeRepo = new FinanceRepository();

        expect(gymRepo.tableName).toBe('gym_logs');
        expect(typeof gymRepo.getWorkoutHistory).toBe('function');
        expect(typeof gymRepo.getPRs).toBe('function');
        expect(typeof gymRepo.getExercises).toBe('function');
        expect(typeof gymRepo.saveLog).toBe('function');

        expect(healthRepo.tableName).toBe('health_data');
        expect(typeof healthRepo.getHistory).toBe('function');
        expect(typeof healthRepo.saveDailyHealth).toBe('function');

        expect(financeRepo.tableName).toBe('app_finances');
        expect(typeof financeRepo.getMonthlyExpenses).toBe('function');
    });
});
