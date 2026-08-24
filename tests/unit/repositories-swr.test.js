import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn((tableName) => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Item 1' }], error: null }),
                    maybeSingle: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Single Item' }, error: null })
                })),
                order: vi.fn().mockResolvedValue({ data: [{ id: '1', title: 'Record 1' }, { id: '2', title: 'Record 2' }], error: null })
            })),
            insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-1' }], error: null }),
            update: vi.fn().mockResolvedValue({ data: [{ id: 'upd-1' }], error: null }),
            delete: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}));

vi.mock('../../js/core/idb.js', () => {
    const mem = new Map();
    return {
        idbGet: vi.fn(async (k) => mem.get(k) || null),
        idbSet: vi.fn(async (k, v) => { mem.set(k, v); }),
        idbDelete: vi.fn(async (k) => { mem.delete(k); }),
        idbClear: vi.fn(async () => { mem.clear(); }),
        getDB: vi.fn(async () => null)
    };
});

import { BaseRepository } from '../../js/core/repositories/BaseRepository.js';
import {
    repositories,
    CoupleRepository,
    UniversityRepository,
    EntertainmentRepository,
    SystemRepository
} from '../../js/core/repositories/index.js';

describe('BaseRepository & SWR Caching Layer (Phase 5)', () => {
    let repo;

    beforeEach(() => {
        repo = new BaseRepository('test_items');
        vi.clearAllMocks();
    });

    it('should fetch fresh data on cache miss and save to SWR cache', async () => {
        const fetcher = vi.fn().mockResolvedValue([{ id: 101, val: 'Fresh' }]);

        const data = await repo.getWithSWR('key_miss', fetcher, { ttlMs: 10000 });

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(data).toEqual([{ id: 101, val: 'Fresh' }]);
    });

    it('should return cached data immediately when within TTL without revalidating', async () => {
        const fetcher = vi.fn().mockResolvedValue(['version-1']);

        // 1. Initial fetch
        const first = await repo.getWithSWR('key_ttl', fetcher, { ttlMs: 60000 });
        expect(first).toEqual(['version-1']);
        expect(fetcher).toHaveBeenCalledTimes(1);

        // 2. Second fetch within TTL
        const second = await repo.getWithSWR('key_ttl', fetcher, { ttlMs: 60000 });
        expect(second).toEqual(['version-1']);
        expect(fetcher).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should fallback to cached data if background fetch fails (Offline Resilience)', async () => {
        const initialFetcher = vi.fn().mockResolvedValue(['cached-data']);
        await repo.getWithSWR('key_offline', initialFetcher, { ttlMs: 0 }); // Expired TTL

        // Subsequent fetch with failing network
        const failingFetcher = vi.fn().mockRejectedValue(new Error('Network Offline'));
        const onRevalidate = vi.fn();

        const result = await repo.getWithSWR('key_offline', failingFetcher, {
            ttlMs: 0,
            fallbackToCacheOnError: true,
            onRevalidate
        });

        expect(result).toEqual(['cached-data']);
    });

    it('should invalidate SWR cache properly', async () => {
        const fetcher = vi.fn().mockResolvedValue(['data-1']);
        await repo.getWithSWR('key_inv', fetcher, { ttlMs: 60000 });

        await repo.invalidateCache('key_inv');

        fetcher.mockResolvedValue(['data-2']);
        const afterInv = await repo.getWithSWR('key_inv', fetcher, { ttlMs: 60000 });

        expect(afterInv).toEqual(['data-2']);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});

describe('Domain Repositories & Central Registry (Phase 5)', () => {
    it('should have all domain repositories properly instantiated in registry', () => {
        expect(repositories.gym).toBeDefined();
        expect(repositories.health).toBeDefined();
        expect(repositories.finance).toBeDefined();
        expect(repositories.media).toBeDefined();
        expect(repositories.couple).toBeInstanceOf(CoupleRepository);
        expect(repositories.university).toBeInstanceOf(UniversityRepository);
        expect(repositories.entertainment).toBeInstanceOf(EntertainmentRepository);
        expect(repositories.system).toBeInstanceOf(SystemRepository);
    });

    it('should fetch couple domain entities via CoupleRepository', async () => {
        const coupleRepo = repositories.couple;
        const coupons = await coupleRepo.getCoupons();

        expect(coupons).toBeDefined();
        expect(Array.isArray(coupons)).toBe(true);
    });

    it('should fetch university domain entities via UniversityRepository', async () => {
        const uniRepo = repositories.university;
        const cards = await uniRepo.getMaturaCards('czech');

        expect(cards).toBeDefined();
        expect(Array.isArray(cards)).toBe(true);
    });

    it('should fetch entertainment domain entities via EntertainmentRepository', async () => {
        const entRepo = repositories.entertainment;
        const achievements = await entRepo.getAchievements();

        expect(achievements).toBeDefined();
        expect(Array.isArray(achievements)).toBe(true);
    });

    it('should fetch system domain entities via SystemRepository', async () => {
        const sysRepo = repositories.system;
        const changelog = await sysRepo.getChangelog();

        expect(changelog).toBeDefined();
        expect(Array.isArray(changelog)).toBe(true);
    });
});
