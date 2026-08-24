/**
 * Kiscord - Main Entry Point
 * 
 * Tento soubor slouží jako „Bootstrapper“ aplikace.
 * Veškerá logika je delegována do specializovaných služeb v /js/core/.
 */

// Core Services & Modules
import { setupRealtimeSync } from './core/sync.js';
import { initNotifications } from './core/notifications.js';
import { initTheme } from './core/theme.js';
import { state, stateEvents } from './core/state.js';

// Refactored Handlers
import { initAuthListeners, updateUserProfileUI, updateGlobalAssetsUI } from './core/auth-handler.js';
import { setupNavigation, renderChannels, setupSearch, switchChannel, renderServersList } from './core/router.js';
import { setupConnectivityListeners, checkAppUpdate, setupGlobalTouchGestures, setupNativePopovers, setupMobileCollapsibleHeaders } from './core/app-ui.js';
import { exposeGlobals } from './core/globals.js';

// Extra Module Initialization (Legacy/Dependencies)
import { setupQuestsRealtime } from './domains/entertainment/quests.js';
import { initLevels } from './domains/entertainment/levels.js';

// --- INITIALIZATION ---

async function initApp() {
    // 1. Service Worker registration
    if ('serviceWorker' in navigator) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (let reg of regs) {
                reg.unregister();
                console.log('[Dev] Service Worker unregistered for localhost.');
            }
        } else {
            navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW failed:', err));
        }
    }

    // 2. Core System Initialization
    setupRealtimeSync();
    setupQuestsRealtime();
    initLevels();
    initTheme();
    initNotifications();
    checkAppUpdate();

    // 3. UI & Events Setup
    renderServersList();
    renderChannels();
    setupNavigation();
    setupSearch();
    setupConnectivityListeners();
    setupGlobalTouchGestures();
    setupNativePopovers();
    setupMobileCollapsibleHeaders();

    import('./core/servers.js').then(s => {
        s.applyServerAmbientTheme(state.currentServer || 'home');
        s.updateHeaderLoveCoins();
    });

    // 4. Auth & State Handlers
    initAuthListeners();

    // 5. Global Exposure & Asset Events
    stateEvents.on('assets', () => {
        updateGlobalAssetsUI();
        if (state.currentUser) updateUserProfileUI(state.currentUser);
    });

    stateEvents.on('settings_changed', () => {
        renderChannels();
    });

    stateEvents.on('love-shop-updated', () => {
        import('./core/servers.js').then(s => s.updateHeaderLoveCoins());
    });
    stateEvents.on('love_coins', () => {
        import('./core/servers.js').then(s => s.updateHeaderLoveCoins());
    });
    
    exposeGlobals();

    // 6. Navigation (Back Button Support)
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.channel) {
            console.log(`[NAV] Pop: ${e.state.channel}`);
            switchChannel(e.state.channel, false);
        } else {
            switchChannel('dashboard', false);
        }
    });

    // 7. Background Pre-fetching (Optimization 2.0)
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(prefetchModules, { timeout: 3000 });
    } else {
        setTimeout(prefetchModules, 3000);
    }

    // 8. Service Worker Message Listener (Push Notification Deep-links)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'NAVIGATE_CHANNEL' && event.data.channel) {
                console.log(`[Push] Received deep-link navigation to: ${event.data.channel}`);
                switchChannel(event.data.channel);
            }
        });
    }

    console.log('--- KISCORD BOOTSTRAPPED ---');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Pre-fetch klíčových komponent pro okamžité přepínání
function prefetchModules() {
    console.log('[App] Pre-fetching common modules in background...');
    import('./domains/lifestyle/calendar/index.js').catch(() => {});
    import('./domains/lifestyle/timeline/index.js').catch(() => {});
    import('./domains/entertainment/library/index.js').catch(() => {});
    import('./domains/lifestyle/bucketlist.js').catch(() => {});
    import('./domains/archive/alpska-vyzva.js').catch(() => {});
}
