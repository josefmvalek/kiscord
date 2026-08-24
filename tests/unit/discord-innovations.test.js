import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockResolvedValue({ data: [], error: null })
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            send: vi.fn().mockResolvedValue({}),
            subscribe: vi.fn().mockReturnValue({})
        }))
    }
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    triggerConfetti: vi.fn(),
    escapeHTML: vi.fn(str => str || ''),
    getTodayKey: vi.fn(() => new Date().toISOString().split('T')[0])
}));

vi.mock('../../js/core/sound.js', () => ({
    playPageFlip: vi.fn(),
    playServerPop: vi.fn(),
    playSuccessChime: vi.fn(),
    playHeartbeat: vi.fn()
}));

import { state } from '../../js/core/state.js';
import { getServerMentionCount, renderServersList } from '../../js/core/servers.js';
import { getAllSearchableItems, renderPaletteResults } from '../../js/core/commandPalette.js';
import { openSideDrawer, closeSideDrawer, isSideDrawerOpen } from '../../js/core/sideDrawer.js';
import { getActivityLabelForChannel, renderRichPresenceHub } from '../../js/core/sync.js';

describe('Discord Innovations & Synergies Suite', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="servers-container"></div>
            <div id="rich-presence-members-container"></div>
            <div id="command-palette-results"></div>
            <input id="command-palette-input" />
        `;
        const today = new Date().toISOString().split('T')[0];
        state.currentUser = { id: 'usr_jose', name: 'Jožka' };
        state.user_ids = { jose: 'usr_jose', klarka: 'usr_klarka' };
        state.currentServer = 'home';
        state.currentChannel = 'dashboard';
        state.healthData = { [today]: { water: 0, mood: 0 } };
        state.dailyQuestionsAnswers = {};
        state.gymHistory = [];
        state.nutritionLogs = {};
        state.studyPlannerItems = [];
    });

    describe('Server Mention Badges Engine', () => {
        it('should calculate pending mention for love server when partner answered or unread event exists', () => {
            state.unreadLoveCount = 2;
            const count = getServerMentionCount('love');
            expect(count).toBe(2);
        });

        it('should calculate pending mention for fit server when urgent deadline is within 24h', () => {
            state.studyPlannerItems = [
                { id: '1', title: 'Projekt WIS', dueDate: new Date(Date.now() + 10 * 3600 * 1000).toISOString(), completed: false }
            ];
            const count = getServerMentionCount('fit');
            expect(count).toBe(1);
        });

        it('should render red server badges on wrapper without clipping', () => {
            state.unreadLoveCount = 1;
            renderServersList();
            const badges = document.querySelectorAll('.server-badge');
            expect(badges.length).toBeGreaterThan(0);
            expect(badges[0].textContent.trim()).toBe('1');
        });
    });


    describe('Command Palette & Slash Commands Engine', () => {
        it('should include all slash command definitions in searchable items', () => {
            const items = getAllSearchableItems();
            const slashItems = items.filter(i => i.title.startsWith('/'));
            expect(slashItems.length).toBeGreaterThanOrEqual(4);
            expect(slashItems.some(i => i.title.includes('/voda'))).toBe(true);
            expect(slashItems.some(i => i.title.includes('/vaha'))).toBe(true);
            expect(slashItems.some(i => i.title.includes('/dotek'))).toBe(true);
            expect(slashItems.some(i => i.title.includes('/lovecoin'))).toBe(true);
        });

        it('should dynamically parse /voda +2 query', () => {
            renderPaletteResults('/voda +2');
            const container = document.getElementById('command-palette-results');
            expect(container.innerHTML).toContain('Přidat 2 sklenice vody');
        });

        it('should dynamically parse /lovecoin +10 Skvělá práce query', () => {
            renderPaletteResults('/lovecoin +10 Skvělá práce');
            const container = document.getElementById('command-palette-results');
            expect(container.innerHTML).toContain('Poslat +10 Love Coins');
            expect(container.innerHTML).toContain('Skvělá práce');
        });
    });

    describe('Side Detail Drawer Engine', () => {
        it('should open and close side drawer correctly', () => {
            expect(isSideDrawerOpen()).toBe(false);

            openSideDrawer({
                title: 'Technika cviku: Bench Press',
                contentHtml: '<div id="test-drawer-content">GIF techniky</div>'
            });

            expect(isSideDrawerOpen()).toBe(true);
            expect(document.getElementById('side-drawer-title').textContent).toBe('Technika cviku: Bench Press');
            expect(document.getElementById('side-drawer-body').innerHTML).toContain('GIF techniky');

            closeSideDrawer();
            expect(isSideDrawerOpen()).toBe(false);
        });
    });

    describe('Live Rich Presence & Activity Labels', () => {
        it('should map channel IDs to friendly activity descriptions', () => {
            expect(getActivityLabelForChannel('gym-tracker')).toContain('Cvičí v Posilovně');
            expect(getActivityLabelForChannel('nutrition')).toContain('Zapisuje jídelníček');
            expect(getActivityLabelForChannel('library')).toContain('Vybírá filmy & hry');
            expect(getActivityLabelForChannel('schedule')).toContain('Sleduje rozvrh FIT');
        });

        it('should render rich presence cards with quick action buttons for partner', () => {
            renderRichPresenceHub();
            const container = document.getElementById('rich-presence-members-container');
            expect(container.innerHTML).toContain('Klárka');
            expect(container.innerHTML).toContain('Dotek');
            expect(container.innerHTML).toContain('Sluníčko');
        });
    });
});
