import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { simulateUserLogin, toggleSimulatedUser } from '../../js/core/auth-handler.js';
import { renderInputGroup, focusFirstInputInModal } from '../../js/core/ui.js';

describe('User Simulation & UX Data Entry System', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="login-screen" class="login-visible"></div>
            <div id="app-interface" class="opacity-0"></div>
            <div id="sidebar-user-name"></div>
            <div id="popout-user-name"></div>
            <div id="sidebar-user-avatar"></div>
            <div id="popout-user-avatar"></div>
            <div id="popout-user-bio"></div>
            <div id="messages-container"></div>
        `;
    });

    it('should simulate login as Jožka and set proper state and session', async () => {
        await simulateUserLogin('josef');

        expect(state.currentUser?.name).toBe('Jožka');
        expect(state.currentUser?.email).toBe('jozkavalek@email.cz');

        const sessionRaw = localStorage.getItem('sb-nnrorazsiyiedwomgidf-auth-token');
        expect(sessionRaw).not.toBeNull();
        const session = JSON.parse(sessionRaw);
        expect(session.user?.email).toBe('jozkavalek@email.cz');

        const loginEl = document.getElementById('login-screen');
        expect(loginEl.classList.contains('login-visible')).toBe(false);

        const sidebarName = document.getElementById('sidebar-user-name');
        expect(sidebarName.textContent).toBe('Jožka');
    });

    it('should simulate login as Klárka and update profile elements', async () => {
        await simulateUserLogin('klarka');

        expect(state.currentUser?.name).toBe('Klárka');
        expect(state.currentUser?.email).toBe('vyslouzilova.klara07@gmail.com');

        const sidebarName = document.getElementById('sidebar-user-name');
        expect(sidebarName.textContent).toBe('Klárka');

        const bio = document.getElementById('popout-user-bio');
        expect(bio.innerHTML).toContain('Královna mývalů');
    });

    it('should toggle seamlessly between Jožka and Klárka', async () => {
        await simulateUserLogin('josef');
        expect(state.currentUser?.name).toBe('Jožka');

        await toggleSimulatedUser();
        expect(state.currentUser?.name).toBe('Klárka');

        await toggleSimulatedUser();
        expect(state.currentUser?.name).toBe('Jožka');
    });

    it('should generate input groups with automatic decimal inputmode for numbers', () => {
        const numHtml = renderInputGroup({
            label: 'Váha (kg)',
            id: 'weight-input',
            type: 'number'
        });

        expect(numHtml).toContain('inputmode="decimal"');
        expect(numHtml).toContain('enterkeyhint="done"');
        expect(numHtml).toContain('class="kiscord-input"');
    });

    it('should preserve custom inputmode and enterkeyhint if provided', () => {
        const textHtml = renderInputGroup({
            label: 'Hledat',
            id: 'search-input',
            type: 'text',
            inputmode: 'search',
            enterkeyhint: 'search'
        });

        expect(textHtml).toContain('inputmode="search"');
        expect(textHtml).toContain('enterkeyhint="search"');
    });

    it('should gracefully focus first input in modal if modal exists', () => {
        const modal = document.createElement('div');
        modal.id = 'test-modal';
        modal.innerHTML = `<input type="text" id="test-first-input" />`;
        document.body.appendChild(modal);

        expect(() => focusFirstInputInModal('test-modal')).not.toThrow();
    });
});
