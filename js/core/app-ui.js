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
    import('../domains/system/profile.js').then(m => m.toggleUserPopout());
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

let pomodoroInterval = null;
let pomodoroRemainingSeconds = 0;

/**
 * Spustí Pomodoro fokus časovač v Dynamic Island widgetu
 * @param {number} [minutes=25] 
 */
export function startPomodoroTimer(minutes = 25) {
    const bar = document.getElementById('global-workout-mini-bar');
    if (!bar) return;

    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }

    pomodoroRemainingSeconds = minutes * 60;
    triggerHaptic('success');

    const icon = document.getElementById('mini-bar-icon');
    const title = document.getElementById('mini-bar-title');
    const subtitle = document.getElementById('mini-bar-subtitle');
    const timer = document.getElementById('mini-bar-timer');
    const badge = document.getElementById('mini-bar-set-badge');
    const btnText = document.getElementById('mini-bar-btn-text');
    const quickBtn = document.getElementById('mini-bar-quick-set-btn');

    if (icon) icon.className = 'fas fa-brain text-blue-400';
    if (title) title.textContent = 'Pomodoro Fokus';
    if (subtitle) subtitle.textContent = 'Hluboké soustředění 📚';
    if (badge) badge.textContent = `${minutes}m`;
    if (btnText) btnText.textContent = 'Ukončit';

    bar.className = bar.className.replace(/border-amber-500\/\d+/g, 'border-blue-500/40');
    bar.classList.remove('hidden');
    bar.classList.add('flex', 'mode-pomodoro');

    if (quickBtn) {
        quickBtn.onclick = (e) => {
            e.stopPropagation();
            stopPomodoroTimer();
        };
    }

    const updateDisplay = () => {
        const m = Math.floor(pomodoroRemainingSeconds / 60);
        const s = pomodoroRemainingSeconds % 60;
        if (timer) timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    updateDisplay();

    pomodoroInterval = setInterval(() => {
        pomodoroRemainingSeconds--;
        if (pomodoroRemainingSeconds <= 0) {
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            import('./sound.js').then(s => s.playSuccessChime?.());
            import('./utils.js').then(u => u.triggerConfetti?.());
            import('./theme.js').then(t => t.showNotification('🎉 Pomodoro dokončeno! Skvělá práce, dej si 5 minut pauzu! ☕', 'success'));
            triggerHaptic('pr_record');
            stopPomodoroTimer();
        } else {
            updateDisplay();
        }
    }, 1000);
}

export function stopPomodoroTimer() {
    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }
    const bar = document.getElementById('global-workout-mini-bar');
    if (bar) {
        bar.classList.add('hidden');
        bar.classList.remove('flex', 'mode-pomodoro');
    }
    triggerHaptic('light');
}

export function openBottomNavQuickActionSheet(channelId) {
    triggerHaptic('medium');
    const existing = document.getElementById('bottom-nav-quick-sheet');
    if (existing) existing.remove();

    let title = 'Rychlá akce';
    let subtitle = 'Vyber okamžitou akci';
    let actions = [];

    if (channelId === 'gym-tracker' || channelId === 'nutrition' || channelId === 'sleep' || channelId === 'body-metrics') {
        title = '⚡ Rychlý Fitness Zápis';
        subtitle = 'Zdraví & Fitness';
        actions = [
            {
                label: '💧 +250 ml Vody',
                desc: 'Přidat sklenici vody do dnešního pitného režimu',
                icon: '<i class="fas fa-tint text-sky-400"></i>',
                run: () => {
                    import('./state.js').then(s => {
                        const today = new Date().toISOString().split('T')[0];
                        if (!s.state.healthData) s.state.healthData = {};
                        if (!s.state.healthData[today]) s.state.healthData[today] = { water: 0 };
                        s.state.healthData[today].water = (s.state.healthData[today].water || 0) + 1;
                        s.saveStateToCache();
                        import('./theme.js').then(t => t.showNotification('💧 Vypito +250ml vody! (+10 XP)', 'success'));
                        import('../domains/entertainment/levels.js').then(l => l.updateRelationshipXP(10));
                    });
                }
            },
            {
                label: '🏋️ Nový Trénink',
                desc: 'Otevřít logování tréninku',
                icon: '<i class="fas fa-dumbbell text-amber-400"></i>',
                run: () => {
                    window.switchChannel('gym-tracker');
                    setTimeout(() => {
                        const btn = document.querySelector('[onclick*="openNewWorkoutModal"]') || document.getElementById('btn-new-workout');
                        btn?.click();
                    }, 300);
                }
            },
            {
                label: '⚖️ Zapsat Dnešní Váhu',
                desc: 'Rychlý záznam tělesné hmotnosti',
                icon: '<i class="fas fa-weight text-emerald-400"></i>',
                run: () => {
                    window.switchChannel('body-metrics');
                }
            }
        ];
    } else if (channelId === 'calendar' || channelId === 'dashboard') {
        title = '📅 Rychlé Plánování';
        subtitle = 'Společný kalendář & Můj Den';
        actions = [
            {
                label: '➕ Přidat Událost do Kalendáře',
                desc: 'Vytvořit novou schůzku nebo plán',
                icon: '<i class="fas fa-calendar-plus text-indigo-400"></i>',
                run: () => {
                    window.switchChannel('calendar');
                    setTimeout(() => {
                        const btn = document.querySelector('[onclick*="openEventModal"]') || document.getElementById('btn-add-event');
                        btn?.click();
                    }, 300);
                }
            },
            {
                label: '🥂 Navrhnout Rande',
                desc: 'Vybrat místo a čas pro společný večer',
                icon: '<i class="fas fa-glass-cheers text-pink-400"></i>',
                run: () => {
                    window.switchChannel('dateplanner');
                }
            },
            {
                label: '⏱️ Spustit Pomodoro Fokus (25m)',
                desc: 'Režim soustředění s mini panelem nahoře',
                icon: '<i class="fas fa-brain text-amber-400"></i>',
                run: () => {
                    startPomodoroTimer(25);
                }
            }
        ];
    } else if (channelId === 'love-shop' || channelId === 'dateplanner' || channelId === 'timeline' || channelId === 'letters') {
        title = '💖 Láska & Zážitky';
        subtitle = 'Společné okamžiky';
        actions = [
            {
                label: '🎁 Otevřít Moje Kupóny',
                desc: 'Zobrazit zakoupené a platné kupóny',
                icon: '<i class="fas fa-ticket-alt text-amber-400"></i>',
                run: () => {
                    window.switchChannel('love-shop');
                }
            },
            {
                label: '💌 Napsat Zamilovaný Dopis',
                desc: 'Zanechat vzkaz pro partnera',
                icon: '<i class="fas fa-envelope-open-text text-pink-400"></i>',
                run: () => {
                    window.switchChannel('letters');
                }
            },
            {
                label: '🫀 Poslat Tlukot Srdce',
                desc: 'Haptický dotek na dálku',
                icon: '<i class="fas fa-heartbeat text-rose-500"></i>',
                run: () => {
                    window.switchChannel('dotek');
                }
            }
        ];
    } else if (channelId === 'schedule' || channelId === 'study-planner' || channelId === 'dorm-hub' || channelId === 'finance-tracker') {
        title = '🎓 VUT FIT & Studentský Hub';
        subtitle = 'Škola, kolej a finance';
        actions = [
            {
                label: '📚 Přidat Úkol / Zkoušku',
                desc: 'Nový záznam do studijního plánu',
                icon: '<i class="fas fa-tasks text-blue-400"></i>',
                run: () => {
                    window.switchChannel('study-planner');
                }
            },
            {
                label: '🏢 Časovač Pračky na Koleji',
                desc: 'Nastavit odpočet praní na bloku',
                icon: '<i class="fas fa-soap text-cyan-400"></i>',
                run: () => {
                    window.switchChannel('dorm-hub');
                }
            },
            {
                label: '💰 Zapsat Výdaj / Nákup',
                desc: 'Rychlý zápis do rozpočtu',
                icon: '<i class="fas fa-receipt text-yellow-400"></i>',
                run: () => {
                    window.switchChannel('finance-tracker');
                }
            }
        ];
    } else {
        title = '⚡ Rychlé Nástroje';
        subtitle = 'Kiscord Rychlá Volba';
        actions = [
            {
                label: '🔍 Hledat cokoliv (Ctrl+K)',
                desc: 'Otevřít vyhledávací Command Paletu',
                icon: '<i class="fas fa-search text-indigo-400"></i>',
                run: () => {
                    window.openCommandPalette?.();
                }
            },
            {
                label: '🎨 Změnit Vzhled & Téma',
                desc: 'Přepnout barevný motiv Kiscordu',
                icon: '<i class="fas fa-palette text-pink-400"></i>',
                run: () => {
                    window.switchChannel('appearance');
                }
            }
        ];
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'bottom-nav-quick-sheet';
    backdrop.className = 'quick-action-sheet-backdrop flex items-end sm:items-center justify-center p-4';
    backdrop.onclick = (e) => {
        if (e.target === backdrop) backdrop.remove();
    };

    let actionsHtml = actions.map((act, i) => `
        <button class="w-full text-left p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/5 hover:border-white/15 transition-all flex items-center gap-3.5 group select-none shadow-sm"
                data-quick-idx="${i}">
            <div class="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                ${act.icon}
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-black text-white text-xs tracking-tight">${act.label}</div>
                <div class="text-[10px] text-gray-400 truncate">${act.desc}</div>
            </div>
            <i class="fas fa-chevron-right text-gray-500 text-xs group-hover:text-white transition-colors"></i>
        </button>
    `).join('');

    backdrop.innerHTML = `
        <div class="quick-action-sheet-card w-full max-w-sm rounded-3xl bg-[#1e1f22]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-5 flex flex-col gap-3 mb-16 sm:mb-0">
            <div class="flex justify-between items-center pb-2 border-b border-white/10">
                <div>
                    <h3 class="font-black text-white text-sm tracking-tight">${title}</h3>
                    <p class="text-[10px] text-gray-400 font-medium">${subtitle}</p>
                </div>
                <button onclick="document.getElementById('bottom-nav-quick-sheet')?.remove()" 
                        class="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white text-xs transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="flex flex-col gap-2">
                ${actionsHtml}
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);

    // Bind action clicks
    backdrop.querySelectorAll('[data-quick-idx]').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-quick-idx'), 10);
            triggerHaptic('light');
            backdrop.remove();
            actions[idx]?.run();
        };
    });
}

export function setupBottomNavLongPress() {
    const nav = document.getElementById('mobile-bottom-nav');
    if (!nav || nav.dataset.longPressBound) return;
    nav.dataset.longPressBound = 'true';

    let pressTimer = null;

    const startPress = (el) => {
        const channelId = el.getAttribute('data-nav-channel');
        if (!channelId) return;

        pressTimer = setTimeout(() => {
            openBottomNavQuickActionSheet(channelId);
            pressTimer = null;
        }, 450);
    };

    const cancelPress = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    nav.addEventListener('touchstart', (e) => {
        const btn = e.target.closest('.mobile-nav-btn[data-nav-channel]');
        if (btn) startPress(btn);
    }, { passive: true });

    nav.addEventListener('touchmove', cancelPress, { passive: true });
    nav.addEventListener('touchend', cancelPress, { passive: true });
    nav.addEventListener('touchcancel', cancelPress, { passive: true });

    // Right-click / context menu support for desktop testing
    nav.addEventListener('contextmenu', (e) => {
        const btn = e.target.closest('.mobile-nav-btn[data-nav-channel]');
        if (btn) {
            e.preventDefault();
            const channelId = btn.getAttribute('data-nav-channel');
            openBottomNavQuickActionSheet(channelId);
        }
    });
}

if (typeof window !== 'undefined') {
    window.startPomodoroTimer = startPomodoroTimer;
    window.stopPomodoroTimer = stopPomodoroTimer;
    window.openBottomNavQuickActionSheet = openBottomNavQuickActionSheet;
    window.setupBottomNavLongPress = setupBottomNavLongPress;
}




