import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockReturnThis()
        }))
    }
}));

import { calculatePendingBadgeCount, updateAppBadge } from '../../js/core/badging.js';
import { state } from '../../js/core/state.js';

describe('PWA App Badging & Notification Counts', () => {
    beforeEach(() => {
        state.futureLetters = [];
        state.dailyQuestion = null;
        state.inventory = [];
        state.plannedDates = {};
    });

    it('calculatePendingBadgeCount accurately sums all pending items', () => {
        expect(calculatePendingBadgeCount()).toBe(0);

        // 1. Unlocked unread future letter
        state.futureLetters = [{ id: '1', is_read: false, unlock_at: '2020-01-01T00:00:00Z' }];
        expect(calculatePendingBadgeCount()).toBe(1);

        // 2. Unanswered daily question
        state.dailyQuestion = { id: 'q1', answered: false };
        expect(calculatePendingBadgeCount()).toBe(2);

        // 3. Requested coupon
        state.inventory = [{ id: 'c1', status: 'requested' }];
        expect(calculatePendingBadgeCount()).toBe(3);

        // 4. Pending date
        state.plannedDates = { '2026-08-23': { status: 'pending' } };
        expect(calculatePendingBadgeCount()).toBe(4);
    });

    it('updateAppBadge invokes navigator.setAppBadge when supported', async () => {
        const setBadgeMock = vi.fn().mockResolvedValue(undefined);
        const clearBadgeMock = vi.fn().mockResolvedValue(undefined);

        Object.defineProperty(global.navigator, 'setAppBadge', {
            value: setBadgeMock,
            writable: true,
            configurable: true
        });
        Object.defineProperty(global.navigator, 'clearAppBadge', {
            value: clearBadgeMock,
            writable: true,
            configurable: true
        });

        await updateAppBadge(5);
        expect(setBadgeMock).toHaveBeenCalledWith(5);

        await updateAppBadge(0);
        expect(clearBadgeMock).toHaveBeenCalledTimes(1);
    });
});
