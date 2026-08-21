export const APP_VERSION = '2.1.2'; // Service worker update v27

import { showNotification } from './theme.js';
import { triggerHaptic } from './utils.js';

export function setupConnectivityListeners() {
    const bannerId = 'offline-banner';

    const updateStatus = () => {
        const isOffline = !navigator.onLine;
        let banner = document.getElementById(bannerId);

        if (isOffline) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = bannerId;
                banner.className = 'fixed top-0 left-0 w-full z-[10000] bg-[#ed4245] text-white py-2 px-4 text-center text-xs font-bold shadow-lg animate-slide-down flex items-center justify-center gap-2';
                banner.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Jsi offline. Změny se nemusí uložit do databáze!</span>
                `;
                document.body.prepend(banner);

                showNotification("Jsi offline. Některé funkce nemusí fungovat ⚠️", "error");
                triggerHaptic('heavy');
            }
        } else {
            if (banner) {
                banner.classList.add('animate-banner-up');
                setTimeout(() => banner.remove(), 500);

                showNotification("Připojení obnoveno 📶", "success");
                triggerHaptic('success');
            }
        }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    // Background re-validation & sync on app resume
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            import('./offline.js').then(m => m.processSyncQueue()).catch(() => {});
            import('./state.js').then(m => {
                if (typeof m.revalidateState === 'function') m.revalidateState();
            }).catch(() => {});
        }
    });

    updateStatus(); // Initial check
}

export function checkAppUpdate() {
    const lastVersion = localStorage.getItem('kiscord_app_version');
    if (lastVersion && lastVersion !== APP_VERSION) {
        console.log(`[System] App updated: ${lastVersion} -> ${APP_VERSION}`);
        
        // Notify user about update
        setTimeout(() => {
            showNotification(`🚀 Systém aktualizován na v${APP_VERSION}!`, 'success');
        }, 2000);
    }
    localStorage.setItem('kiscord_app_version', APP_VERSION);
}

export function toggleUserPopout() {
    triggerHaptic('light');
    import('../modules/profile.js').then(m => m.toggleUserPopout());
}

export function toggleMobileMenu() {
    const sidebar = document.getElementById("sidebar-wrapper");
    const overlay = document.getElementById("mobile-overlay");

    if (!sidebar || !overlay) return;

    triggerHaptic('light');

    const isClosed = sidebar.classList.contains("-translate-x-full");

    if (isClosed) {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    } else {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    }
}

/**
 * Globální dotyková gesta pro mobilní zařízení:
 * 1. Edge swipe zleva -> otevření bočního menu
 * 2. Swipe doleva na otevřeném menu -> zavření
 * 3. Pull-to-refresh na vršku stránky -> okamžitý sync dat
 */
export function setupGlobalTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoveY = 0;
    let isPulling = false;
    let pullIndicator = null;

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoveY = touchStartY;

        const container = document.getElementById('messages-container');
        if (container && container.scrollTop <= 2) {
            isPulling = true;
        } else {
            isPulling = false;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        touchMoveY = e.touches[0].clientY;
        const diffY = touchMoveY - touchStartY;

        if (isPulling && diffY > 60 && Math.abs(e.touches[0].clientX - touchStartX) < 40) {
            if (!pullIndicator) {
                pullIndicator = document.createElement('div');
                pullIndicator.id = 'pull-refresh-indicator';
                pullIndicator.className = 'fixed top-14 left-1/2 -translate-x-1/2 z-[200] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black text-[var(--text-header)] transition-all animate-bounce-slow backdrop-blur-md';
                pullIndicator.innerHTML = '<i class="fas fa-sync-alt fa-spin text-[var(--blurple)]"></i> <span>Aktualizuji Kiscord...</span>';
                document.body.appendChild(pullIndicator);
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', async (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // 1. Pull to refresh trigger
        if (isPulling && diffY > 85 && Math.abs(diffX) < 50) {
            triggerHaptic('light');
            if (typeof window.syncDashboardData === 'function') {
                await window.syncDashboardData(true);
            }
            if (window.state?.currentChannel && typeof window.switchChannel === 'function') {
                window.switchChannel(window.state.currentChannel);
            }
            showNotification('Data aktualizována! ✨', 'info');
        }

        if (pullIndicator) {
            pullIndicator.remove();
            pullIndicator = null;
        }
        isPulling = false;

        // 2. Edge Swipe pro otevření Discord bočního panelu
        const sidebar = document.getElementById("sidebar-wrapper");
        if (!sidebar) return;
        const isClosed = sidebar.classList.contains("-translate-x-full");

        if (isClosed && touchStartX < 35 && diffX > 60 && Math.abs(diffY) < 60) {
            toggleMobileMenu();
        } else if (!isClosed && diffX < -50 && Math.abs(diffY) < 60) {
            toggleMobileMenu();
        }
    }, { passive: true });
}
