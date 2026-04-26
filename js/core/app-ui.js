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
