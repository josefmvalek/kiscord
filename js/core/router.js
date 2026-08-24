/**
 * Kiscord Router & Channel Controller (Facade)
 * Aggregates Channel Registry, Navigation Engine and Dynamic Module Lifecycle.
 */

import {
    serverDefinitions,
    getServerById,
    getServerForChannel,
    renderServersList,
    updateServerActiveStates,
    applyServerAmbientTheme,
    updateHeaderLoveCoins
} from './servers.js';

import {
    DEFAULT_COLLAPSED_CATEGORIES,
    channelCategories,
    toggleCategoryCollapse,
    collapseAllCategories,
    expandAllCategories,
    getChannelItemById,
    toggleFavoriteChannel
} from './router/channel-registry.js';

import {
    moduleMap,
    mountChannelModule
} from './router/module-loader.js';

import {
    SERVER_BOTTOM_NAV_MAP,
    switchServer,
    renderChannels,
    setupNavigation,
    setupSearch,
    updateChannelHeader,
    updateMobileBottomNav,
    toggleMobileCategorySheet,
    openMobileCategorySheet,
    closeMobileCategorySheet,
    updateGlobalWorkoutMiniBar,
    logCurrentMiniBarSet,
    switchChannel
} from './router/navigation.js';

import {
    getActiveMount,
    unmountActiveModule,
    wrapLegacyModule,
    CleanupCollector
} from './module-lifecycle.js';

import { state } from './state.js';

export {
    serverDefinitions,
    getServerById,
    getServerForChannel,
    renderServersList,
    updateServerActiveStates,
    applyServerAmbientTheme,
    updateHeaderLoveCoins,
    DEFAULT_COLLAPSED_CATEGORIES,
    channelCategories,
    toggleCategoryCollapse,
    collapseAllCategories,
    expandAllCategories,
    getChannelItemById,
    toggleFavoriteChannel,
    moduleMap,
    mountChannelModule,
    SERVER_BOTTOM_NAV_MAP,
    switchServer,
    renderChannels,
    setupNavigation,
    setupSearch,
    updateChannelHeader,
    updateMobileBottomNav,
    toggleMobileCategorySheet,
    openMobileCategorySheet,
    closeMobileCategorySheet,
    updateGlobalWorkoutMiniBar,
    logCurrentMiniBarSet,
    switchChannel,
    getActiveMount,
    unmountActiveModule,
    wrapLegacyModule,
    CleanupCollector
};

// Global window attachments for easy integration & onclick triggers
if (typeof window !== 'undefined') {
    window.switchChannel = switchChannel;
    window.switchServer = switchServer;
    window.renderChannels = renderChannels;
    window.renderServersList = renderServersList;
    window.toggleCategoryCollapse = toggleCategoryCollapse;
    window.collapseAllCategories = collapseAllCategories;
    window.expandAllCategories = expandAllCategories;
    window.toggleMobileCategorySheet = toggleMobileCategorySheet;
    window.openMobileCategorySheet = openMobileCategorySheet;
    window.closeMobileCategorySheet = closeMobileCategorySheet;
    window.logCurrentMiniBarSet = logCurrentMiniBarSet;
    window.updateGlobalWorkoutMiniBar = updateGlobalWorkoutMiniBar;
    window.toggleFavoriteChannel = toggleFavoriteChannel;

    // Global keyboard navigation listener
    if (!window.__routerKeyboardListenerAttached) {
        window.__routerKeyboardListenerAttached = true;
        window.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            const isEditable = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;

            if (e.key === 'Escape') {
                if (window.isSideDrawerOpen && window.isSideDrawerOpen()) {
                    e.preventDefault();
                    window.closeSideDrawer();
                    return;
                }
            }

            if (isEditable) return;

            // Ctrl + 1..7: Switch to Server 1..7
            if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
                const digit = parseInt(e.key, 10);
                if (digit >= 1 && digit <= serverDefinitions.length) {
                    e.preventDefault();
                    const targetServer = serverDefinitions[digit - 1];
                    if (targetServer) {
                        switchServer(targetServer.id, targetServer.defaultChannel);
                    }
                }
            }

            // Alt + ArrowDown / ArrowUp: Cycle through channels in current server
            if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                e.preventDefault();
                const currentServer = getServerById(state.currentServer || 'home');
                const allItems = (currentServer.categories || []).flatMap(c => c.items || []);
                if (allItems.length > 0) {
                    const currentIndex = allItems.findIndex(i => i.id === state.currentChannel);
                    let nextIndex = 0;
                    if (e.key === 'ArrowDown') {
                        nextIndex = currentIndex >= 0 ? (currentIndex + 1) % allItems.length : 0;
                    } else {
                        nextIndex = currentIndex > 0 ? currentIndex - 1 : allItems.length - 1;
                    }
                    const targetChannel = allItems[nextIndex];
                    if (targetChannel) {
                        switchChannel(targetChannel.id);
                    }
                }
            }
        });
    }
}
