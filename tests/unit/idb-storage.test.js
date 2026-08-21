import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => {
    return {
        supabase: {
            from: vi.fn(() => ({
                upsert: vi.fn().mockResolvedValue({ error: null }),
                insert: vi.fn().mockResolvedValue({ error: null }),
                select: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
        }
    };
});

vi.mock('../../js/core/theme.js', () => {
    return {
        showNotification: vi.fn()
    };
});

import { idbGet, idbSet, idbDelete, idbClear } from '../../js/core/idb.js';
import { saveStateToCache, loadStateFromCache, state } from '../../js/core/state.js';
import { enqueueOperation, getQueue } from '../../js/core/offline.js';

describe('IndexedDB Storage Engine & Migration', () => {
    beforeEach(async () => {
        localStorage.clear();
        await idbClear('keyval');
        await idbClear('media');
    });

    it('should set and get values correctly in keyval store', async () => {
        const testPayload = { user: 'Josef', coins: 150, preferences: { theme: 'tetris' } };
        const saved = await idbSet('test_key', testPayload);
        expect(saved).toBe(true);

        const retrieved = await idbGet('test_key');
        expect(retrieved).toEqual(testPayload);
    });

    it('should delete a key from store', async () => {
        await idbSet('to_delete', { value: 123 });
        const beforeDelete = await idbGet('to_delete');
        expect(beforeDelete).toEqual({ value: 123 });

        await idbDelete('to_delete');
        const afterDelete = await idbGet('to_delete');
        expect(afterDelete).toBeNull();
    });

    it('should clear an entire store', async () => {
        await idbSet('k1', 'v1');
        await idbSet('k2', 'v2');
        await idbClear('keyval');

        const v1 = await idbGet('k1');
        const v2 = await idbGet('k2');
        expect(v1).toBeNull();
        expect(v2).toBeNull();
    });

    it('should transparently migrate legacy localStorage state cache into IndexedDB', async () => {
        const legacyState = {
            healthData: { '2026-08-21': { water: 7, mood: 9 } },
            loveCoins: { jose: 250, klarka: 300 },
            settings: { theme: 'forest' }
        };

        // Simulate legacy localStorage cache
        localStorage.setItem('kiscord_state_cache', JSON.stringify(legacyState));

        // Load cache - should migrate to IndexedDB and remove legacy localStorage key
        const loaded = await loadStateFromCache();
        expect(loaded).toBe(true);
        expect(state.healthData['2026-08-21'].water).toBe(7);
        expect(state.loveCoins.jose).toBe(250);

        // Verify that localStorage key was purged to reclaim 5MB quota
        expect(localStorage.getItem('kiscord_state_cache')).toBeNull();

        // Verify that data is now persisted in IndexedDB
        const idbCached = await idbGet('kiscord_state_cache');
        expect(idbCached.healthData['2026-08-21'].water).toBe(7);
    });

    it('should save and load state through saveStateToCache via IndexedDB', async () => {
        state.loveCoins.jose = 999;
        state.healthData['2026-08-22'] = { date_key: '2026-08-22', user_id: 'u1', water: 8, mood: 10, sleep_hours: 8 };

        await saveStateToCache();

        const idbState = await idbGet('kiscord_state_cache');
        expect(idbState).toBeDefined();
        expect(idbState.loveCoins.jose).toBe(999);
        expect(idbState.healthData['2026-08-22'].water).toBe(8);
    });

    it('should enqueue and retrieve operations via sync queue', async () => {
        enqueueOperation('health_data', 'upsert', { date_key: '2026-08-21', water: 6 });

        const queue = await getQueue();
        expect(queue.length).toBeGreaterThanOrEqual(1);
        const lastOp = queue[queue.length - 1];
        expect(lastOp.table).toBe('health_data');
        expect(lastOp.data.water).toBe(6);
    });
});
