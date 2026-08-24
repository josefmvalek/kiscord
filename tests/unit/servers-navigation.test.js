import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    escapeHTML: vi.fn(str => str || '')
}));

vi.mock('../../js/core/sound.js', () => ({
    playPageFlip: vi.fn(),
    playServerPop: vi.fn(),
    playSuccessChime: vi.fn(),
    playHeartbeat: vi.fn()
}));


import { state } from '../../js/core/state.js';
import {
    serverDefinitions,
    getServerById,
    getServerForChannel,
    renderServersList,
    updateServerActiveStates
} from '../../js/core/servers.js';
import {
    renderChannels,
    switchChannel,
    switchServer,
    setupNavigation
} from '../../js/core/router.js';

describe('Discord Multi-Server Architecture & Navigation', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="sidebar-wrapper">
                <div id="servers-sidebar">
                    <div id="servers-container"></div>
                </div>
                <div id="server-header-container">
                    <span id="server-header-title"></span>
                </div>
                <div id="channels-container"></div>
            </div>
            <div id="channel-name"></div>
            <div id="channel-desc"></div>
            <div id="channel-icon"></div>
            <div id="messages-container"></div>
            <div id="mobile-overlay" class="hidden"></div>
        `;
        state.currentServer = 'home';
        state.currentChannel = 'dashboard';
        state.lastServerChannels = {};
        state.settings = {
            sidebar: {
                hiddenChannels: [],
                channelOrder: [],
                categoryOrder: [],
                channelCategoryMap: {},
                collapsedCategories: []
            }
        };
    });

    it('should define all 7 required servers with valid metadata and default channels', () => {
        expect(Array.isArray(serverDefinitions)).toBe(true);
        expect(serverDefinitions.length).toBe(7);

        const serverIds = serverDefinitions.map(s => s.id);
        expect(serverIds).toContain('home');
        expect(serverIds).toContain('love');
        expect(serverIds).toContain('fitness');
        expect(serverIds).toContain('fit');
        expect(serverIds).toContain('media');
        expect(serverIds).toContain('archive');
        expect(serverIds).toContain('system');

        serverDefinitions.forEach(server => {
            expect(server.id).toBeDefined();
            expect(server.name).toBeDefined();
            expect(server.icon).toBeDefined();
            expect(server.defaultChannel).toBeDefined();
            expect(Array.isArray(server.categories)).toBe(true);
            expect(server.categories.length).toBeGreaterThan(0);
        });
    });

    it('should resolve channels to their correct servers via getServerForChannel', () => {
        expect(getServerForChannel('dashboard').id).toBe('home');
        expect(getServerForChannel('calendar').id).toBe('home');
        expect(getServerForChannel('love-shop').id).toBe('love');
        expect(getServerForChannel('dotek').id).toBe('love');
        expect(getServerForChannel('timeline').id).toBe('love');
        expect(getServerForChannel('gym-tracker').id).toBe('fitness');
        expect(getServerForChannel('regenerace').id).toBe('fitness');
        expect(getServerForChannel('schedule').id).toBe('fit');
        expect(getServerForChannel('study-planner').id).toBe('fit');
        expect(getServerForChannel('dorm-hub').id).toBe('fit');
        expect(getServerForChannel('library').id).toBe('media');
        expect(getServerForChannel('watchlist').id).toBe('media');
        expect(getServerForChannel('games-hub').id).toBe('media');
        expect(getServerForChannel('kasicka').id).toBe('archive');
        expect(getServerForChannel('matura-dashboard').id).toBe('archive');
        expect(getServerForChannel('settings').id).toBe('system');
        expect(getServerForChannel('changelog').id).toBe('system');
    });

    it('should render all servers into #servers-container with pill indicators and squircle buttons', () => {
        renderServersList();
        const container = document.getElementById('servers-container');
        expect(container).not.toBeNull();

        const serverItems = container.querySelectorAll('.server-item-wrapper');
        expect(serverItems.length).toBe(7);

        // Check active server (home) has active class and expanded pill
        const homeWrapper = container.querySelector('[data-server="home"]');
        expect(homeWrapper).not.toBeNull();

        const homePill = homeWrapper.querySelector('.server-pill');
        expect(homePill).not.toBeNull();
        expect(homePill.classList.contains('h-10')).toBe(true);

        const homeBtn = homeWrapper.querySelector('.server-icon-btn');
        expect(homeBtn.classList.contains('active')).toBe(true);

        // Check non-active server (e.g. fitness) has collapsed pill
        const gymWrapper = container.querySelector('[data-server="fitness"]');
        const gymPill = gymWrapper.querySelector('.server-pill');
        expect(gymPill.classList.contains('h-0')).toBe(true);
    });

    it('should switch server and render only its categories and channels in #channels-container', () => {
        renderServersList();

        // Switch to VUT FIT server
        switchServer('fit', null, false);
        expect(state.currentServer).toBe('fit');

        // Check server title in header
        const headerTitle = document.getElementById('server-header-title');
        expect(headerTitle.textContent).toContain('VUT FIT');

        // Check that channels-container only has VUT FIT categories
        const container = document.getElementById('channels-container');
        const categories = container.querySelectorAll('.category-header');
        const catNames = Array.from(categories).map(c => c.getAttribute('data-category'));

        expect(catNames).toContain('📚 STUDIUM FIT');
        expect(catNames).toContain('🏢 BRNO & FINANCE');
        expect(catNames).not.toContain('🏋️‍♂️ TRÉNINK & SÍLA');
        expect(catNames).not.toContain('🎁 LÁSKA & ZÁŽITKY');

        // Check channel links inside
        expect(container.querySelector('[data-channel="schedule"]')).not.toBeNull();
        expect(container.querySelector('[data-channel="study-planner"]')).not.toBeNull();
        expect(container.querySelector('[data-channel="gym-tracker"]')).toBeNull();
    });

    it('should automatically switch server when switchChannel is called with a channel from a different server', () => {
        renderServersList();
        renderChannels();

        expect(state.currentServer).toBe('home');

        // Navigate to gym-tracker directly (e.g. via deep link or search)
        switchChannel('gym-tracker', false);

        expect(state.currentServer).toBe('fitness');
        expect(state.currentChannel).toBe('gym-tracker');

        const headerTitle = document.getElementById('server-header-title');
        expect(headerTitle.textContent).toContain('Zdraví & Fitness');

        const container = document.getElementById('channels-container');
        expect(container.querySelector('[data-channel="gym-tracker"]')).not.toBeNull();
    });

    it('should switch server channels sidebar without forcing channel navigation unless target channel is provided', () => {
        renderServersList();
        renderChannels();

        expect(state.currentServer).toBe('home');
        expect(state.currentChannel).toBe('dashboard');

        // 1. Switch to Fitness server without target channel -> updates server and sidebar, but leaves content as is
        switchServer('fitness', null, false);
        expect(state.currentServer).toBe('fitness');
        expect(state.currentChannel).toBe('dashboard');

        const headerTitle = document.getElementById('server-header-title');
        expect(headerTitle.textContent).toContain('Zdraví & Fitness');

        const container = document.getElementById('channels-container');
        expect(container.querySelector('[data-channel="gym-tracker"]')).not.toBeNull();
        expect(container.querySelector('[data-channel="habits"]')).not.toBeNull();

        // 2. Switch to Fit server with explicit target channel -> switches both server and channel
        switchServer('fit', 'schedule', false);
        expect(state.currentServer).toBe('fit');
        expect(state.currentChannel).toBe('schedule');
    });

    it('should delegate server clicks via setupNavigation to open channels sidebar panel', () => {
        renderServersList();
        renderChannels();
        setupNavigation();

        const loveWrapper = document.querySelector('.server-item-wrapper[data-server="love"]');
        const loveBtn = loveWrapper.querySelector('.server-icon-btn');

        loveBtn.click();

        expect(state.currentServer).toBe('love');
        const headerTitle = document.getElementById('server-header-title');
        expect(headerTitle.textContent).toContain('Náš Svět & Láska');

        const container = document.getElementById('channels-container');
        expect(container.querySelector('[data-channel="love-shop"]')).not.toBeNull();
        expect(container.querySelector('[data-channel="dotek"]')).not.toBeNull();
    });
});
