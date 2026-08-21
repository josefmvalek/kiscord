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

                triggerHaptic('heavy');
            }
        } else {
            if (banner) {
                banner.classList.add('animate-banner-up');
                setTimeout(() => banner.remove(), 500);
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

        // 3. Modal & Bottom Sheet Swipe-Down to Dismiss (Mobile Ergonomics)
        if (diffY > 80 && Math.abs(diffX) < 60 && touchStartY < window.innerHeight * 0.4) {
            const openModals = Array.from(document.querySelectorAll('.kiscord-modal-backdrop, .modal-backdrop'))
                .filter(m => m.style.display !== 'none' && !m.classList.contains('hidden'));
            
            if (openModals.length > 0) {
                const topModal = openModals[openModals.length - 1];
                triggerHaptic('light');
                if (topModal.id && typeof window.closeModal === 'function') {
                    window.closeModal(topModal.id);
                } else {
                    topModal.classList.add('hidden');
                }
            }
        }
    }, { passive: true });
}

/**
 * Native Popover API Bridge with graceful fallback.
 * Allows buttons with [data-popover-target] to trigger native or polyfilled popovers.
 */
export function setupNativePopovers() {
    if (typeof document === 'undefined') return;

    document.querySelectorAll('[data-popover-target]').forEach(trigger => {
        if (trigger._hasPopoverListener) return;
        trigger._hasPopoverListener = true;

        trigger.addEventListener('click', (e) => {
            const targetId = trigger.getAttribute('data-popover-target');
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;

            e.stopPropagation();
            triggerHaptic('light');

            if (typeof targetEl.showPopover === 'function') {
                try {
                    targetEl.togglePopover();
                } catch (err) {
                    targetEl.classList.toggle('hidden');
                }
            } else {
                targetEl.classList.toggle('hidden');
            }
        });
    });
}

/**
 * Enables mobile swipe-to-action gestures on a list element.
 * Swipe right -> trigger onSwipeRight (e.g. mark done / favorite)
 * Swipe left -> trigger onSwipeLeft (e.g. delete / edit)
 */
export function initSwipeableListItem(containerEl, {
    onSwipeRight = null,
    onSwipeLeft = null,
    rightLabel = 'Hotovo',
    leftLabel = 'Smazat',
    rightIcon = 'fa-check',
    leftIcon = 'fa-trash'
} = {}) {
    if (!containerEl || containerEl._hasSwipeListener) return;
    containerEl._hasSwipeListener = true;

    containerEl.classList.add('kiscord-swipeable-container');

    const contentEl = containerEl.querySelector('.kiscord-swipeable-content') || containerEl.firstElementChild;
    if (!contentEl) return;
    contentEl.classList.add('kiscord-swipeable-content');

    // Create background action hints
    if (onSwipeRight && !containerEl.querySelector('.kiscord-swipe-action-left')) {
        const leftAction = document.createElement('div');
        leftAction.className = 'kiscord-swipe-action-left';
        leftAction.innerHTML = `<i class="fas ${rightIcon} mr-1.5"></i> <span>${rightLabel}</span>`;
        containerEl.insertBefore(leftAction, contentEl);
    }
    if (onSwipeLeft && !containerEl.querySelector('.kiscord-swipe-action-right')) {
        const rightAction = document.createElement('div');
        rightAction.className = 'kiscord-swipe-action-right';
        rightAction.innerHTML = `<span>${leftLabel}</span> <i class="fas ${leftIcon} ml-1.5"></i>`;
        containerEl.appendChild(rightAction);
    }

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;

    contentEl.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isSwiping = false;
        contentEl.style.transition = 'none';
    }, { passive: true });

    contentEl.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        const diffY = e.touches[0].clientY - startY;

        // Check if horizontal swipe dominates
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 12) {
            isSwiping = true;
            const dampedX = diffX * 0.75;
            contentEl.style.transform = `translateX(${dampedX}px)`;
        }
    }, { passive: true });

    contentEl.addEventListener('touchend', () => {
        if (!isSwiping) return;
        contentEl.style.transition = 'transform 0.25s var(--ease-spring-snappy, cubic-bezier(0.2, 0.9, 0.3, 1.2))';
        const diffX = currentX - startX;

        if (diffX > 75 && onSwipeRight) {
            triggerHaptic('success');
            contentEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                onSwipeRight();
                contentEl.style.transform = 'translateX(0)';
            }, 200);
        } else if (diffX < -75 && onSwipeLeft) {
            triggerHaptic('warning');
            contentEl.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                onSwipeLeft();
                contentEl.style.transform = 'translateX(0)';
            }, 200);
        } else {
            contentEl.style.transform = 'translateX(0)';
        }
        isSwiping = false;
    }, { passive: true });
}

if (typeof window !== 'undefined') {
    window.initSwipeableListItem = initSwipeableListItem;
    window.toggleMobileFab = toggleMobileFab;
    window.quickLogWater = quickLogWater;
}

export function toggleMobileFab() {
    triggerHaptic('selection');
    const sheet = document.getElementById('mobile-fab-sheet');
    const icon = document.getElementById('mobile-fab-icon');
    if (!sheet) return;

    const isHidden = sheet.classList.contains('hidden');
    if (isHidden) {
        sheet.classList.remove('hidden');
        sheet.classList.add('flex');
        if (icon) icon.style.transform = 'rotate(45deg)';
    } else {
        sheet.classList.add('hidden');
        sheet.classList.remove('flex');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

export async function quickLogWater() {
    triggerHaptic('success');
    try {
        const { state } = await import('./state.js');
        const { getTodayKey } = await import('./utils.js');
        const todayKey = getTodayKey();
        if (!state.healthData[todayKey]) {
            state.healthData[todayKey] = { water: 0 };
        }
        const currentWater = Number(state.healthData[todayKey].water) || 0;
        state.healthData[todayKey].water = Math.min(16, currentWater + 1);

        const { safeUpsert } = await import('./offline.js');
        await safeUpsert('health_data', {
            date_key: todayKey,
            water: state.healthData[todayKey].water,
            user_id: state.currentUser?.id
        }, 'date_key,user_id');

        if (typeof window.syncDashboardData === 'function') {
            window.syncDashboardData();
        }
    } catch(e) {
        console.error('Failed to log water via quick FAB:', e);
    }
}

/**
 * Setup collapsible large title effect for channel header on mobile
 */
export function setupMobileCollapsibleHeaders() {
    const container = document.getElementById('messages-container');
    const header = document.getElementById('chat-header');
    if (!container || !header || container._hasScrollCollapseListener) return;
    container._hasScrollCollapseListener = true;

    container.addEventListener('scroll', () => {
        if (container.scrollTop > 35) {
            header.classList.add('shadow-md', 'border-b', 'border-[var(--border-subtle)]');
            header.classList.add('backdrop-blur-xl', 'bg-[var(--bg-secondary)]/95');
        } else {
            header.classList.remove('shadow-md');
        }
    }, { passive: true });
}



