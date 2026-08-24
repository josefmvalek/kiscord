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
import { 
    renderChannels, 
    switchServer, 
    switchChannel, 
    toggleFavoriteChannel,
    getChannelItemById,
    updateMobileBottomNav
} from '../../js/core/router.js';
import { 
    applyServerAmbientTheme, 
    updateHeaderLoveCoins 
} from '../../js/core/servers.js';
import { renderLevelUI } from '../../js/domains/entertainment/levels.js';
import { getTodayEventsSummary } from '../../js/domains/lifestyle/calendar/grid.js';
import { getAllSearchableItems } from '../../js/core/commandPalette.js';
import { startPomodoroTimer, stopPomodoroTimer } from '../../js/core/app-ui.js';

describe('Kiscord UI/UX & QoL Innovations Test Suite', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="servers-container"></div>
            <div id="server-header-container">
                <span id="server-header-title"></span>
            </div>
            <div id="channels-container"></div>
            <div id="chat-header">
                <div id="channel-breadcrumbs">
                    <span id="header-server-badge">
                        <span id="header-server-icon"></span>
                        <span id="header-server-name"></span>
                    </span>
                    <i id="channel-icon"></i>
                    <span id="channel-name"></span>
                </div>
                <span id="channel-desc"></span>
                <button id="header-level-btn">
                    <span id="header-level-text">Lv. 1</span>
                    <span id="header-xp-text">0 XP</span>
                </button>
                <button id="header-love-coins-btn">
                    <span id="header-love-coins-count">0</span>
                </button>
            </div>
            <nav id="mobile-bottom-nav"></nav>
            <div id="global-workout-mini-bar" class="hidden">
                <i id="mini-bar-icon"></i>
                <span id="mini-bar-title"></span>
                <span id="mini-bar-subtitle"></span>
                <span id="mini-bar-timer">00:00</span>
                <span id="mini-bar-set-badge"></span>
                <button id="mini-bar-quick-set-btn">
                    <span id="mini-bar-btn-text">+ Série</span>
                </button>
            </div>
            <div id="messages-container"></div>
        `;

        state.currentServer = 'home';
        state.currentChannel = 'dashboard';
        state.currentUser = { id: 'usr_jose', name: 'Jožka' };
        state.user_ids = { jose: 'usr_jose', klarka: 'usr_klarka' };
        state.loveCoins = { jose: 120, klarka: 85 };
        state.settings = {
            sidebar: {
                collapsedCategories: [],
                favoriteChannels: ['dashboard', 'calendar', 'love-shop', 'gym-tracker']
            }
        };
    });

    describe('1. Pinned Calendar Super-Channel & Today Summary', () => {
        it('should compute today events summary accurately', () => {
            const today = new Date().toISOString().split('T')[0];
            state.schoolDeadlines = [{ deadline_date: today, title: 'WIS Test' }];
            state.customPlans = [{ date_key: today, title: 'Večeře' }];

            const summary = getTodayEventsSummary();
            expect(summary.eventsCount).toBe(2);
            expect(summary.summary).toContain('2 události');
        });

        it('should render sleek, compact 1-line Kalendář pinned card without descriptions', () => {
            renderChannels();
            const container = document.getElementById('channels-container');
            const pinnedCard = container.querySelector('.pinned-calendar-card');

            expect(pinnedCard).not.toBeNull();
            expect(pinnedCard.getAttribute('data-channel')).toBe('calendar');
            expect(pinnedCard.textContent).toContain('Kalendář');
            expect(pinnedCard.textContent).not.toContain('Společný Kalendář');
            expect(pinnedCard.textContent).not.toContain('Vše čist');
        });
    });

    describe('2. Love Coins & Level/XP RPG HUD in Header', () => {
        it('should update header Love Coins count for current logged-in user', () => {
            updateHeaderLoveCoins();
            const countEl = document.getElementById('header-love-coins-count');
            expect(countEl.textContent).toBe('120');

            // Check sidebar coins sync
            const sidebarCoins = document.createElement('span');
            sidebarCoins.id = 'sidebar-coins-display';
            document.body.appendChild(sidebarCoins);
            updateHeaderLoveCoins();
            expect(sidebarCoins.textContent).toBe('120');

            // Switch to Klarka and verify
            state.currentUser = { id: 'usr_klarka', name: 'Klárka' };
            updateHeaderLoveCoins();
            expect(countEl.textContent).toBe('85');
            expect(sidebarCoins.textContent).toBe('85');
        });

        it('should render relationship level & XP in header HUD', () => {
            renderLevelUI();
            const lvlText = document.getElementById('header-level-text');
            expect(lvlText).not.toBeNull();
            expect(lvlText.textContent).toContain('Lv.');
        });

        it('should add coin-bounce animation class when coins change', () => {
            const btn = document.getElementById('header-love-coins-btn');
            state.loveCoins.jose = 150;
            updateHeaderLoveCoins();

            expect(btn.classList.contains('coin-bounce')).toBe(true);
        });
    });

    describe('3. Ambient Server Theming & Breadcrumbs', () => {
        it('should apply server color and update breadcrumb in header on server switch', () => {
            switchServer('fitness', null, false);

            expect(state.currentServer).toBe('fitness');
            const serverName = document.getElementById('header-server-name');
            expect(serverName.textContent).toBe('Zdraví & Fitness');
        });

        it('should update channel header and breadcrumbs when switching channels', () => {
            switchChannel('gym-tracker', false);

            const channelName = document.getElementById('channel-name');
            expect(channelName.textContent).toBe('posilovna');

            const serverName = document.getElementById('header-server-name');
            expect(serverName.textContent).toBe('Zdraví & Fitness');
        });
    });

    describe('4. ⭐ Favorites Section & Star Toggles', () => {
        it('should render favorites category on Home server', () => {
            state.currentServer = 'home';
            renderChannels();

            const container = document.getElementById('channels-container');
            const favHeader = container.querySelector('.category-header[data-category="⭐ OBLÍBENÉ"]');
            expect(favHeader).not.toBeNull();

            // Verify favorite channels are rendered inside
            const favLinks = container.querySelectorAll('.category-wrapper[data-category="⭐ OBLÍBENÉ"] .channel-link');
            expect(favLinks.length).toBe(4);
        });

        it('should toggle favorite channel on star click and persist in state', () => {
            expect(state.settings.sidebar.favoriteChannels.includes('timeline')).toBe(false);

            toggleFavoriteChannel('timeline');
            expect(state.settings.sidebar.favoriteChannels.includes('timeline')).toBe(true);

            toggleFavoriteChannel('timeline');
            expect(state.settings.sidebar.favoriteChannels.includes('timeline')).toBe(false);
        });
    });

    describe('5. Server-Contextual Dynamic Mobile Bottom Bar', () => {
        it('should render server-specific tabs when switching servers on mobile', () => {
            // 1. Fitness Server
            state.currentServer = 'fitness';
            updateMobileBottomNav('gym-tracker');

            const nav = document.getElementById('mobile-bottom-nav');
            expect(nav.querySelector('[data-nav-channel="gym-tracker"]')).not.toBeNull();
            expect(nav.querySelector('[data-nav-channel="nutrition"]')).not.toBeNull();
            expect(nav.querySelector('[data-nav-channel="sleep"]')).not.toBeNull();
            expect(nav.querySelector('[data-nav-channel="body-metrics"]')).not.toBeNull();

            // 2. VUT FIT Server
            state.currentServer = 'fit';
            updateMobileBottomNav('schedule');

            expect(nav.querySelector('[data-nav-channel="schedule"]')).not.toBeNull();
            expect(nav.querySelector('[data-nav-channel="study-planner"]')).not.toBeNull();
            expect(nav.querySelector('[data-nav-channel="gym-tracker"]')).toBeNull();
        });
    });

    describe('6. Universal Dynamic Island (Pomodoro & Gym)', () => {
        it('should start Pomodoro timer and update dynamic island widget', () => {
            startPomodoroTimer(25);

            const bar = document.getElementById('global-workout-mini-bar');
            expect(bar.classList.contains('hidden')).toBe(false);
            expect(bar.classList.contains('mode-pomodoro')).toBe(true);

            const title = document.getElementById('mini-bar-title');
            expect(title.textContent).toBe('Pomodoro Fokus');

            const timer = document.getElementById('mini-bar-timer');
            expect(timer.textContent).toBe('25:00');

            stopPomodoroTimer();
            expect(bar.classList.contains('hidden')).toBe(true);
        });
    });

    describe('7. Supercharged Command Palette Slash Commands', () => {
        it('should include new slash commands for server, rande, kupon and pomodoro', () => {
            const items = getAllSearchableItems();
            const slashCommands = items.filter(i => i.id?.startsWith('slash-cmd-'));

            const commands = slashCommands.map(c => c.title);
            expect(commands.some(c => c.includes('/server'))).toBe(true);
            expect(commands.some(c => c.includes('/rande'))).toBe(true);
            expect(commands.some(c => c.includes('/kupon'))).toBe(true);
            expect(commands.some(c => c.includes('/pomodoro'))).toBe(true);
        });
    });

    describe('8. Live Server Action Dots & Mentions', () => {
        it('should calculate pending mention counts for home, fit, and love servers', async () => {
            const { getServerMentionCount } = await import('../../js/core/servers.js');

            // 1. Home server: pending daily question
            const today = new Date().toISOString().split('T')[0];
            state.dailyQuestion = { question_text: 'Jak se máš?' };
            state.dailyAnswers = {};
            expect(getServerMentionCount('home')).toBe(1);

            state.dailyAnswers[today] = 'Skvěle!';
            expect(getServerMentionCount('home')).toBe(0);

            // 2. FIT server: upcoming deadline in 24h
            state.schoolDeadlines = [{ deadline_date: new Date(Date.now() + 1000 * 3600 * 12).toISOString() }];
            expect(getServerMentionCount('fit')).toBe(1);
        });
    });

    describe('9. Bottom Nav Long-Press Quick Action Sheet', () => {
        it('should render quick action sheet popover with contextual actions', async () => {
            const { openBottomNavQuickActionSheet } = await import('../../js/core/app-ui.js');

            openBottomNavQuickActionSheet('gym-tracker');
            const sheet = document.getElementById('bottom-nav-quick-sheet');
            expect(sheet).not.toBeNull();
            expect(sheet.textContent).toContain('Fitness Zápis');
            expect(sheet.textContent).toContain('+250 ml Vody');

            sheet.remove();
        });
    });
});

