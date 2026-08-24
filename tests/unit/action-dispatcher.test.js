import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
            })),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    triggerConfetti: vi.fn(),
    escapeHTML: vi.fn(str => str || '')
}));

import { ActionDispatcher, registerAction, unregisterAction, dispatchAction, extractActionPayload, initActionDelegation } from '../../js/core/actions/dispatcher.js';
import { initKiscordNamespace } from '../../js/core/actions/namespace.js';

describe('Central ActionDispatcher & Event Delegation (Phase 4)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    it('should register and dispatch actions programmatically', async () => {
        const mockFn = vi.fn().mockReturnValue('result-123');
        registerAction('testAction', mockFn);

        const result = await dispatchAction('testAction', { id: 42 });

        expect(mockFn).toHaveBeenCalledWith({ id: 42 }, null, null);
        expect(result).toBe('result-123');

        unregisterAction('testAction');
        expect(ActionDispatcher.has('testAction')).toBe(false);
    });

    it('should extract dataset and JSON payload correctly from DOM elements', () => {
        const btn = document.createElement('button');
        btn.setAttribute('data-action', 'openModal');
        btn.setAttribute('data-modal-id', 'settings-modal');
        btn.setAttribute('data-user-role', 'admin');
        btn.setAttribute('data-action-payload', JSON.stringify({ extraData: 'cool', numeric: 100 }));

        const payload = extractActionPayload(btn);

        expect(payload.modalId).toBe('settings-modal');
        expect(payload.userRole).toBe('admin');
        expect(payload.extraData).toBe('cool');
        expect(payload.numeric).toBe(100);
    });

    it('should handle declarative event delegation via click on [data-action]', async () => {
        const handler = vi.fn();
        registerAction('submitForm', handler);
        initActionDelegation(document);

        const container = document.createElement('div');
        container.innerHTML = `
            <div id="wrapper">
                <button id="action-btn" data-action="submitForm" data-item-id="item-99">
                    <span>Click Me</span>
                </button>
            </div>
        `;
        document.body.appendChild(container);

        // Click on the inner <span>
        const span = container.querySelector('span');
        span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ itemId: 'item-99' }),
            expect.any(MouseEvent),
            expect.any(HTMLButtonElement)
        );

        unregisterAction('submitForm');
    });

    it('should gracefully fallback to window function if action is not in registry', async () => {
        window.legacyWindowHandler = vi.fn().mockReturnValue('legacy-ok');

        const result = await dispatchAction('legacyWindowHandler', { arg: 'test' });

        expect(window.legacyWindowHandler).toHaveBeenCalled();
        expect(result).toBe('legacy-ok');

        delete window.legacyWindowHandler;
    });

    it('should initialize window.Kiscord typed namespace properly', () => {
        initKiscordNamespace();

        expect(window.Kiscord).toBeDefined();
        expect(window.Kiscord.version).toBe('2.0.0');
        expect(window.Kiscord.actions).toBe(ActionDispatcher);
        expect(window.Kiscord.router).toBeDefined();
        expect(window.Kiscord.ui).toBeDefined();
        expect(window.Kiscord.domains).toBeDefined();
    });

    it('should trigger haptic feedback automatically when element has data-haptic', async () => {
        const { triggerHaptic } = await import('../../js/core/utils.js');
        const handler = vi.fn();
        registerAction('hapticClick', handler);
        initActionDelegation(document);

        const btn = document.createElement('button');
        btn.setAttribute('data-action', 'hapticClick');
        btn.setAttribute('data-haptic', 'heavy');
        document.body.appendChild(btn);

        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(triggerHaptic).toHaveBeenCalledWith('heavy');
        expect(handler).toHaveBeenCalled();

        unregisterAction('hapticClick');
    });

    it('should execute custom domain actions via window.Kiscord.actions', async () => {
        initKiscordNamespace();

        const customHandler = vi.fn().mockResolvedValue('domain-action-done');
        window.Kiscord.actions.register('fitness:startCustomRoutine', customHandler);

        const res = await window.Kiscord.actions.dispatch('fitness:startCustomRoutine', { routineId: 'pull-hypertrophy' });
        expect(customHandler).toHaveBeenCalledWith({ routineId: 'pull-hypertrophy' }, null, null);
        expect(res).toBe('domain-action-done');

        window.Kiscord.actions.unregister('fitness:startCustomRoutine');
    });
});
