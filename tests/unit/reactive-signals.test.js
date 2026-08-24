import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getLoveCoins,
    setLoveCoins,
    getOnlineStatus,
    setOnlineStatus,
    getActiveWorkoutState,
    setActiveWorkoutState,
    bindLoveCoinsBadge,
    bindConnectivityStatus,
    syncStateToSignals
} from '../../js/core/state/reactive-signals.js';
import { state } from '../../js/core/state.js';

describe('Reactive Domain Signals & Fine-Grained Bindings (Phase 8)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    it('should reactively update textContent via bindLoveCoinsBadge when signal changes', () => {
        const badgeEl = document.createElement('span');
        badgeEl.id = 'header-love-coins';
        document.body.appendChild(badgeEl);

        const dispose = bindLoveCoinsBadge('#header-love-coins');

        setLoveCoins(150);
        expect(badgeEl.textContent).toContain('150 🪙');

        setLoveCoins(3200);
        expect(badgeEl.textContent.replace(/\s+/g, '')).toContain('3200🪙');

        dispose();
    });

    it('should reactively toggle hidden class on offline banner via bindConnectivityStatus', () => {
        const bannerEl = document.createElement('div');
        bannerEl.id = 'offline-banner';
        document.body.appendChild(bannerEl);

        const dispose = bindConnectivityStatus('#offline-banner');

        // When online -> hidden is true
        setOnlineStatus(true);
        expect(bannerEl.classList.contains('hidden')).toBe(true);

        // When offline -> hidden is false (banner visible)
        setOnlineStatus(false);
        expect(bannerEl.classList.contains('hidden')).toBe(false);

        dispose();
    });

    it('should sync state.coins to loveCoins signal', () => {
        state.currentUser = { id: 'user_1' };
        state.coins = { 'user_1': 950 };

        syncStateToSignals();

        expect(getLoveCoins()).toBe(950);
    });

    it('should handle active workout state signal mutations', () => {
        setActiveWorkoutState({ templateId: 'push_1', exercises: [] });

        expect(getActiveWorkoutState()).toEqual({ templateId: 'push_1', exercises: [] });

        setActiveWorkoutState(null);
        expect(getActiveWorkoutState()).toBeNull();
    });
});
