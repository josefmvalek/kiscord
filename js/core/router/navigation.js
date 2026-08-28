import { state, saveStateToCache } from '../state.js';
import { triggerHaptic } from '../utils.js';
import {
    serverDefinitions,
    getServerById,
    getServerForChannel,
    renderServersList,
    updateServerActiveStates,
    applyServerAmbientTheme,
    updateHeaderLoveCoins
} from '../servers.js';
import {
    DEFAULT_COLLAPSED_CATEGORIES,
    channelCategories,
    getChannelItemById,
    toggleCategoryCollapse,
    collapseAllCategories,
    expandAllCategories,
    toggleFavoriteChannel
} from './channel-registry.js';
import { moduleMap, mountChannelModule } from './module-loader.js';
import { SERVER_BOTTOM_NAV_MAP, switchServer, renderChannels } from './server-nav.js';
import { setupSearch, updateChannelHeader } from './breadcrumbs.js';
import {
    updateMobileBottomNav,
    toggleMobileCategorySheet,
    openMobileCategorySheet,
    closeMobileCategorySheet
} from './bottom-nav.js';
import { updateGlobalWorkoutMiniBar, logCurrentMiniBarSet } from './workout-minibar.js';

export {
    DEFAULT_COLLAPSED_CATEGORIES,
    channelCategories,
    getChannelItemById,
    toggleCategoryCollapse,
    collapseAllCategories,
    expandAllCategories,
    toggleFavoriteChannel,
    SERVER_BOTTOM_NAV_MAP,
    switchServer,
    renderChannels,
    setupSearch,
    updateChannelHeader,
    updateMobileBottomNav,
    toggleMobileCategorySheet,
    openMobileCategorySheet,
    closeMobileCategorySheet,
    updateGlobalWorkoutMiniBar,
    logCurrentMiniBarSet
};

export function setupNavigation() {
    const container = document.getElementById("channels-container");
    if (container && !container._hasNavListener) {
        container.addEventListener('click', (e) => {
            const header = e.target.closest('.category-header');
            if (header) {
                const catName = header.getAttribute('data-category');
                if (catName) toggleCategoryCollapse(catName);
                return;
            }

            const link = e.target.closest('.channel-link');
            if (link) {
                const channelId = link.getAttribute('data-channel');
                const keepServer = link.getAttribute('data-keep-server') === 'true';
                switchChannel(channelId, true, keepServer);
                if (window.innerWidth < 768) {
                    const sidebar = document.getElementById("sidebar-wrapper");
                    const overlay = document.getElementById("mobile-overlay");
                    if (sidebar && !sidebar.classList.contains("-translate-x-full")) {
                        sidebar.classList.add("-translate-x-full");
                        if (overlay) overlay.classList.add("hidden");
                    }
                }
            }
        });
        container._hasNavListener = true;
    }

    const serversContainer = document.getElementById("servers-container");
    if (serversContainer && !serversContainer._hasNavListener) {
        serversContainer.addEventListener('click', (e) => {
            const wrapper = e.target.closest('.server-item-wrapper');
            if (wrapper) {
                const serverId = wrapper.getAttribute('data-server');
                if (serverId) switchServer(serverId);
            }
        });
        serversContainer._hasNavListener = true;
    }
}

export function switchChannel(channelId, push = true, keepServer = false) {
    if (state.currentChannel === channelId && document.getElementById("messages-container")?.innerHTML !== "") {
        console.log(`[NAV] Already on channel ${channelId}, skipping full re-render.`);
        updateHeaderLoveCoins();
        return;
    }

    const targetServer = getServerForChannel(channelId);
    if (!keepServer && targetServer && state.currentServer !== targetServer.id && state.currentServer !== 'all') {
        state.currentServer = targetServer.id;
        updateServerActiveStates(targetServer.id);
        applyServerAmbientTheme(targetServer.id);
        renderChannels();
    }

    if (push) {
        history.pushState({ channel: channelId }, "", "");
    }

    triggerHaptic('light');

    import('../sound.js').then(m => m.playPageFlip()).catch(e => console.warn('[Sound] Failed to play page flip:', e));

    console.log(`[NAV] Switching to channel: ${channelId}`);
    state.currentChannel = channelId;
    localStorage.removeItem('klarka_last_channel');

    if (state.settings?.sidebar) {
        const collapsed = state.settings.sidebar.collapsedCategories || DEFAULT_COLLAPSED_CATEGORIES;
        if (collapsed && collapsed.length > 0) {
            const catMap = state.settings.sidebar.channelCategoryMap || {};
            let parentCat = catMap[channelId];
            if (!parentCat) {
                const foundCat = channelCategories.find(cat => cat.items.some(i => i.id === channelId));
                if (foundCat) parentCat = foundCat.name;
            }
            if (parentCat && collapsed.includes(parentCat)) {
                state.settings.sidebar.collapsedCategories = collapsed.filter(c => c !== parentCat);
                saveStateToCache();
                renderChannels();
            }
        }
    }

    document.querySelectorAll('.channel-link').forEach(l => {
        const isCurrent = l.getAttribute('data-channel') === channelId;
        l.classList.toggle('active', isCurrent);
        l.classList.toggle('bg-[var(--bg-modifier-selected)]', isCurrent);
        l.classList.toggle('text-[var(--text-header)]', isCurrent);
        l.classList.toggle('font-bold', isCurrent);
    });

    updateMobileBottomNav(channelId);
    updateGlobalWorkoutMiniBar();

    import('../sync.js').then(s => {
        s.broadcastAmbientActivity?.(channelId);
        s.renderRichPresenceHub?.();
    }).catch(() => {});

    if (typeof window.renderLevelUI === 'function') window.renderLevelUI();
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    updateChannelHeader(channelId);

    if (window.Gym && typeof window.Gym.updateGlobalWorkoutBadge === 'function') {
        window.Gym.updateGlobalWorkoutBadge();
    }

    const container = document.getElementById("messages-container");
    let skeletonTimer = null;

    if (container) {
        // Soften previous content during transition instead of harsh instant wipe
        container.classList.add('channel-content-fading');
        container.classList.remove('channel-content-enter');

        // Only display skeleton if module loading takes longer than 180ms (slow network/cold cache)
        skeletonTimer = setTimeout(() => {
            if (typeof window !== 'undefined' && typeof window.renderSkeletonLoader === 'function' && container && container.classList?.contains('channel-content-fading')) {
                container.innerHTML = window.renderSkeletonLoader({ type: 'channel', count: 6 });
            }
        }, 180);
    }

    // Lazy load channel specific dataset before mounting
    import('../loaders.js').then(l => {
        if (channelId === 'calendar' || channelId === 'stats') l.ensureCalendarData?.();
        if (channelId === 'map' || channelId === 'dateplanner') l.ensureMapData?.();
        if (channelId === 'timeline' || channelId === 'puzzle') l.ensureTimelineData?.();
        if (channelId === 'library' || channelId === 'watchlist' || channelId === 'stats') l.ensureLibraryData?.();
        if (channelId === 'topics') l.ensureTopicsData?.();
        if (channelId === 'games' || channelId === 'games-hub' || channelId === 'game-who' || channelId === 'game-draw') l.ensureGamesData?.();
        if (channelId === 'daily-questions') l.ensureDailyQuizData?.();
        if (channelId === 'love-shop') l.ensureLoveShopData?.();
        if (channelId === 'achievements') l.ensureAchievementsData?.();
        if (channelId === 'funfacts') l.ensureFactsData?.();
        if (channelId === 'matura' || channelId.startsWith('matura-')) l.ensureMaturaData?.();
        if (channelId === 'shifts') l.ensureShiftsData?.();
        if (channelId === 'kasicka' || channelId === 'finance-tracker') l.ensureFinancesData?.();
        if (channelId === 'alpska-vyzva') l.ensureChallengesData?.();
        if (channelId === 'alpsky-denicek') l.ensureDiaryData?.();
        if (channelId === 'gym-tracker' || channelId === 'body-metrics') l.ensureGymData?.();
        if (channelId === 'nutrition') l.ensureNutritionData?.();
    }).catch(e => console.warn('[Loaders] Lazy data loading warning:', e));

    const performMount = async () => {
        if (!container) return;
        try {
            await mountChannelModule(channelId, container);
        } finally {
            if (skeletonTimer) clearTimeout(skeletonTimer);
            container.classList.remove('channel-content-fading');
            container.classList.add('channel-content-enter');
            setTimeout(() => {
                container.classList.remove('channel-content-enter');
            }, 200);
        }
    };

    performMount();

    import('../../domains/system/ambient-presence.js').then(m => m.broadcastMyPresence?.(channelId)).catch(() => {});

    const sidebar = document.getElementById('sidebar-wrapper');
    const overlay = document.getElementById('mobile-overlay');
    if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    }
}
