import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderGameDraw, cleanupRealtime } from '../../js/domains/entertainment/game-draw/index.js';
import { drawState, resetDrawState } from '../../js/domains/entertainment/game-draw/state.js';
import { state } from '../../js/core/state.js';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            insert: vi.fn(() => ({ select: vi.fn(() => Promise.resolve({ data: [{ id: 'p1', text: 'Nové téma' }], error: null })) })),
            update: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
            neq: vi.fn(() => Promise.resolve({ data: null, error: null })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
                neq: vi.fn(() => Promise.resolve({ data: null, error: null })),
                match: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            send: vi.fn(),
            subscribe: vi.fn(cb => { cb?.('SUBSCRIBED'); return { on: vi.fn() }; })
        })),
        removeChannel: vi.fn()
    }
}));

vi.mock('../../js/core/offline.js', () => ({
    safeInsert: vi.fn(() => Promise.resolve({ data: [{ id: 'drawing-1', title: 'Romantický západ' }], error: null }))
}));

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn(),
    showConfirmDialog: vi.fn(() => Promise.resolve(true))
}));

vi.mock('../../js/core/sound.js', () => ({
    playBeep: vi.fn(),
    playChime: vi.fn(),
    playArcade: vi.fn(),
    playFanfare: vi.fn()
}));

describe('Game Draw Module — Senior Frontend Suite (#game-draw)', () => {
    let unmount = null;

    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentUser = { id: 'user-josef', name: 'Jožka' };
        state.currentChannel = 'game-draw';
        state.drawStrokes = [];
        state.gamePrompts = [
            { id: '1', text: 'Nakresli náš první výlet' }
        ];
        resetDrawState();
    });

    afterEach(() => {
        if (unmount) unmount();
        cleanupRealtime();
        document.body.innerHTML = '';
        vi.clearAllTimers();
    });

    it('should render complete Draw Duel UI with toolbar, brush chips, color palette and viewport', () => {
        unmount = renderGameDraw();
        const container = document.getElementById('messages-container');
        expect(container.innerHTML).toContain('Draw Duel');
        expect(container.innerHTML).toContain('duel-canvas');
        expect(container.innerHTML).toContain('brush-tool-btn');
        expect(container.innerHTML).toContain('eraser-tool-btn');
        expect(container.innerHTML).toContain('pan-tool-btn');
        expect(container.innerHTML).toContain('color-swatch');
        expect(container.innerHTML).toContain('Lednice');
    });

    it('should correctly switch drawing tools (brush, eraser, pan) and update UI classes', () => {
        unmount = renderGameDraw();

        window.setDrawTool('eraser');
        expect(drawState.tool).toBe('eraser');
        expect(document.getElementById('eraser-tool-btn').classList.contains('active')).toBe(true);
        expect(document.getElementById('brush-tool-btn').classList.contains('active')).toBe(false);

        window.setDrawTool('pan');
        expect(drawState.tool).toBe('pan');
        expect(document.getElementById('pan-tool-btn').classList.contains('active')).toBe(true);

        window.setDrawTool('brush');
        expect(drawState.tool).toBe('brush');
        expect(document.getElementById('brush-tool-btn').classList.contains('active')).toBe(true);
    });

    it('should set brush color and size dynamically', () => {
        unmount = renderGameDraw();

        window.setDrawColor('#5865F2');
        expect(drawState.color).toBe('#5865F2');

        window.setDrawSize(14);
        expect(drawState.size).toBe(14);
        expect(document.getElementById('brush-size-label').textContent).toBe('14');
    });

    it('should toggle blind mode with fog overlay opacity and button highlight', () => {
        unmount = renderGameDraw();

        window.toggleBlindMode();
        expect(drawState.isBlindMode).toBe(true);
        const fog = document.getElementById('blind-fog');
        expect(fog.style.opacity).toBe('1');

        window.toggleBlindMode();
        expect(drawState.isBlindMode).toBe(false);
        expect(fog.style.opacity).toBe('0');
    });

    it('should handle speed challenge timer start and stop', () => {
        vi.useFakeTimers();
        unmount = renderGameDraw();

        window.startTimer(30);
        expect(drawState.timerInterval).not.toBeNull();
        expect(drawState.timeLeft).toBe(30);

        vi.advanceTimersByTime(2000);
        expect(drawState.timeLeft).toBe(28);

        // Stop timer
        window.startTimer(30);
        expect(drawState.timerInterval).toBeNull();
        vi.useRealTimers();
    });

    it('should clear canvas and reset state on clearCanvas', async () => {
        unmount = renderGameDraw();
        state.drawStrokes = [{ id: 's1', path_data: [{ x: 10, y: 10 }] }];

        await window.clearCanvas();
        expect(state.drawStrokes.length).toBe(0);
    });

    it('should open save modal and commit drawing to fridge', async () => {
        unmount = renderGameDraw();
        state.drawStrokes = [{ id: 's1', path_data: [{ x: 10, y: 10 }] }];

        window.openSaveModal();
        const modal = document.getElementById('save-drawing-modal');
        expect(modal).not.toBeNull();

        await window.commitSaveDrawing();
        expect(document.getElementById('save-drawing-modal')).toBeNull();
    });

    it('should support prompt modals and management', async () => {
        unmount = renderGameDraw();

        window.showAddPromptModal();
        expect(document.getElementById('add-prompt-modal')).not.toBeNull();

        const input = document.getElementById('prompt-input-text');
        if (input) input.value = 'Výlet na Šumavu';

        await window.saveNewPrompt();
        expect(document.getElementById('add-prompt-modal')).toBeNull();
    });
});
