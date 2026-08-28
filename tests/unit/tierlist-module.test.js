import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderTierList, cleanupRealtime, setupRealtime, toggleDuelMode } from '../../js/domains/entertainment/tierlist/index.js';
import { state } from '../../js/core/state.js';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
            delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn()
        })),
        removeChannel: vi.fn()
    }
}));

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn()
}));

describe('Tier List Module (#tierlist)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentUser = { id: 'user-josef', name: 'Jožka' };
    });

    it('should render tier list list view without throwing errors', async () => {
        await expect(renderTierList()).resolves.not.toThrow();
        const container = document.getElementById('messages-container');
        expect(container.innerHTML).toContain('Tier List Creator');
        expect(container.innerHTML).toContain('tierlist-list');
    });

    it('should execute cleanupRealtime cleanly without reference errors', () => {
        expect(() => cleanupRealtime()).not.toThrow();
    });

    it('should execute setupRealtime and channel unsubscribe cleanly', () => {
        expect(() => setupRealtime('test-id-123')).not.toThrow();
        expect(() => cleanupRealtime()).not.toThrow();
    });
});
