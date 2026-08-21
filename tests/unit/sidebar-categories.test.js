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
    playPageFlip: vi.fn()
}));

import { state } from '../../js/core/state.js';
import {
    channelCategories,
    DEFAULT_COLLAPSED_CATEGORIES,
    renderChannels,
    toggleCategoryCollapse,
    collapseAllCategories,
    expandAllCategories,
    switchChannel
} from '../../js/core/router.js';

describe('Sidebar Collapsible Categories & Navigation', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="channels-container"></div>
            <div id="channel-name"></div>
            <div id="channel-desc"></div>
            <div id="channel-icon"></div>
            <div id="messages-container"></div>
            <div id="search-input"></div>
            <div id="sidebar-wrapper"></div>
            <div id="mobile-overlay"></div>
        `;
        state.currentChannel = 'dashboard';
        state.settings = {
            sidebar: {
                hiddenChannels: [],
                channelOrder: [],
                categoryOrder: [],
                channelCategoryMap: {},
                collapsedCategories: [...DEFAULT_COLLAPSED_CATEGORIES]
            }
        };
    });

    it('should define structured channelCategories including FIT school, fitness, and archives', () => {
        expect(Array.isArray(channelCategories)).toBe(true);
        expect(channelCategories.length).toBeGreaterThanOrEqual(6);

        const categoryNames = channelCategories.map(c => c.name);
        expect(categoryNames).toContain('🎓 VUT FIT & KOLEJE');
        expect(categoryNames).toContain('🌿 ZDRAVÍ & FITNESS');
        expect(categoryNames).toContain('💖 NÁŠ SVĚT & PŘÍBĚH');
        expect(categoryNames).toContain('📦 ARCHIV');
        expect(categoryNames).toContain('⚙️ SYSTÉM & INFO');

        // Check FIT school channels
        const fitCat = channelCategories.find(c => c.name === '🎓 VUT FIT & KOLEJE');
        const fitChannelIds = fitCat.items.map(i => i.id);
        expect(fitChannelIds).toContain('schedule');
        expect(fitChannelIds).toContain('study-planner');
        expect(fitChannelIds).toContain('dorm-hub');
        expect(fitChannelIds).toContain('finance-tracker');
        expect(fitChannelIds).toContain('laptop-comparison');
    });

    it('should have default collapsed categories set to archive and system', () => {
        expect(DEFAULT_COLLAPSED_CATEGORIES).toContain('📦 ARCHIV');
        expect(DEFAULT_COLLAPSED_CATEGORIES).toContain('⚙️ SYSTÉM & INFO');
    });

    it('should render channels with collapsible headers and hidden class on collapsed categories without numbers', () => {
        renderChannels();
        const container = document.getElementById('channels-container');
        expect(container).not.toBeNull();

        // Check Můj Den and Kalendář at top
        const dashboardLink = container.querySelector('[data-channel="dashboard"]');
        const calendarLink = container.querySelector('[data-channel="calendar"]');
        expect(dashboardLink).not.toBeNull();
        expect(calendarLink).not.toBeNull();

        // Check headers
        const headers = container.querySelectorAll('.category-header');
        expect(headers.length).toBe(channelCategories.length);

        // Check that default collapsed categories have 'collapsed' class on items container
        const archiveHeader = container.querySelector('.category-header[data-category="📦 ARCHIV"]');
        expect(archiveHeader).not.toBeNull();
        expect(archiveHeader.classList.contains('collapsed')).toBe(true);

        const archiveWrapper = archiveHeader.closest('.category-wrapper');
        const archiveItems = archiveWrapper.querySelector('.category-items');
        expect(archiveItems.classList.contains('collapsed')).toBe(true);

        // Check that expanded categories (e.g. VUT FIT) are NOT collapsed
        const fitHeader = container.querySelector('.category-header[data-category="🎓 VUT FIT & KOLEJE"]');
        expect(fitHeader).not.toBeNull();
        expect(fitHeader.classList.contains('collapsed')).toBe(false);

        const fitWrapper = fitHeader.closest('.category-wrapper');
        const fitItems = fitWrapper.querySelector('.category-items');
        expect(fitItems.classList.contains('collapsed')).toBe(false);
    });

    it('should toggle category collapse state and update DOM when toggleCategoryCollapse is called', () => {
        renderChannels();
        const catName = '🎓 VUT FIT & KOLEJE';

        // Initially expanded
        expect(state.settings.sidebar.collapsedCategories.includes(catName)).toBe(false);

        // Toggle to collapse
        toggleCategoryCollapse(catName);
        expect(state.settings.sidebar.collapsedCategories.includes(catName)).toBe(true);

        const container = document.getElementById('channels-container');
        const header = container.querySelector(`.category-header[data-category="${catName}"]`);
        expect(header.classList.contains('collapsed')).toBe(true);

        // Toggle again to expand
        toggleCategoryCollapse(catName);
        expect(state.settings.sidebar.collapsedCategories.includes(catName)).toBe(false);
        const headerAfter = container.querySelector(`.category-header[data-category="${catName}"]`);
        expect(headerAfter.classList.contains('collapsed')).toBe(false);
    });

    it('should collapse and expand all categories correctly', () => {
        expandAllCategories();
        expect(state.settings.sidebar.collapsedCategories.length).toBe(0);

        const container = document.getElementById('channels-container');
        const collapsedContainers = container.querySelectorAll('.category-items.collapsed');
        expect(collapsedContainers.length).toBe(0);

        collapseAllCategories();
        expect(state.settings.sidebar.collapsedCategories.length).toBe(channelCategories.length);
        const collapsedAfter = container.querySelectorAll('.category-items.collapsed');
        expect(collapsedAfter.length).toBe(channelCategories.length);
    });

    it('should automatically uncollapse a category when switching to a channel inside it', () => {
        // Ensure archive category is collapsed
        state.settings.sidebar.collapsedCategories = ['📦 ARCHIV', '⚙️ SYSTÉM & INFO'];
        renderChannels();

        expect(state.settings.sidebar.collapsedCategories).toContain('📦 ARCHIV');

        // Switch to a channel in archive (e.g. shifts / austria-info)
        switchChannel('austria-info', false);

        // Category should now be auto-expanded
        expect(state.settings.sidebar.collapsedCategories).not.toContain('📦 ARCHIV');
        expect(state.currentChannel).toBe('austria-info');

        const container = document.getElementById('channels-container');
        const header = container.querySelector('.category-header[data-category="📦 ARCHIV"]');
        expect(header.classList.contains('collapsed')).toBe(false);
    });
});
