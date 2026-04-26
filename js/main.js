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
import { setupNavigation, renderChannels, setupSearch, switchChannel } from './core/router.js';
import { setupConnectivityListeners, checkAppUpdate } from './core/app-ui.js';
import { exposeGlobals } from './core/globals.js';

// Extra Module Initialization (Legacy/Dependencies)
import { setupQuestsRealtime } from './modules/quests.js';
import { initLevels } from './modules/levels.js';

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
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
    renderChannels();
    setupNavigation();
    setupSearch();
    setupConnectivityListeners();

    // 4. Auth & State Handlers
    initAuthListeners();

    // 5. Global Exposure & Asset Events
    stateEvents.on('assets', () => {
        updateGlobalAssetsUI();
        if (state.currentUser) updateUserProfileUI(state.currentUser);
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

    console.log('--- KISCORD BOOTSTRAPPED ---');
});
