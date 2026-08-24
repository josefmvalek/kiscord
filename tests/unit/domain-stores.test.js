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
            limit: vi.fn().mockReturnThis()
        }))
    }
}));

import { eventBus } from '../../js/core/state/event-bus.js';
import { AuthStore } from '../../js/core/state/auth-store.js';
import { GymStore } from '../../js/core/state/gym-store.js';
import { HealthStore } from '../../js/core/state/health-store.js';
import { state, saveStateToCache, loadStateFromCache } from '../../js/core/state.js';

describe('Domain Store Slices & EventBus', () => {
    it('EventBus supports subscribe and unsubscribe handles', () => {
        const spy = vi.fn();
        const unsubscribe = eventBus.on('test:event', spy);

        eventBus.emit('test:event', { foo: 'bar' });
        expect(spy).toHaveBeenCalledWith({ foo: 'bar' });

        unsubscribe();
        eventBus.emit('test:event', { foo: 'baz' });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('AuthStore correctly identifies Josef vs Klárka roles', () => {
        const auth = new AuthStore();
        auth.setCurrentUser({ name: 'Josef Válek', email: 'jozkavalek@email.cz' });
        expect(auth.isJosef()).toBe(true);
        expect(auth.isKlarka()).toBe(false);

        auth.setCurrentUser({ name: 'Klára Vysloužilová', email: 'klarka@gmail.com' });
        expect(auth.isJosef()).toBe(false);
        expect(auth.isKlarka()).toBe(true);
    });

    it('GymStore sets exercises and active workout properly', () => {
        const gym = new GymStore();
        gym.setExercises([{ id: 'bench-press', name: 'Bench Press' }]);
        gym.setActiveWorkout({ title: 'Push Day', durationSeconds: 1200 });

        expect(gym.gymExercises.length).toBe(1);
        expect(gym.activeWorkout.title).toBe('Push Day');
    });

    it('HealthStore safely updates daily health biometrics', () => {
        const health = new HealthStore();
        health.setHealthData('2026-08-23', { water: 8, sleep: 7.5 });

        expect(health.healthData['2026-08-23'].water).toBe(8);
        expect(health.healthData['2026-08-23'].sleep).toBe(7.5);
    });

    it('Facade state preserves unified reactive access and SWR caching', async () => {
        state.loveCoins.jose = 150;
        state.currentChannel = 'posilovna';

        await saveStateToCache();
        const loaded = await loadStateFromCache();

        expect(loaded).toBe(true);
        expect(state.loveCoins.jose).toBe(150);
    });
});
