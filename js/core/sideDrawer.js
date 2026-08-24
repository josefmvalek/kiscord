/**
 * Discord-style Side Thread / Detail Drawer (Inspekční panel)
 * Slides out a 380px panel on the right for inspecting exercise GIFs,
 * recipe ingredients, movie trailers, or sub-details without leaving the current channel.
 */

import { triggerHaptic } from './utils.js';

let activeDrawerCloseCallback = null;

/**
 * Ensures the drawer DOM elements exist
 */
function ensureDrawerDOM() {
    let drawer = document.getElementById('discord-side-drawer');
    if (drawer) return drawer;

    drawer = document.createElement('div');
    drawer.id = 'discord-side-drawer';
    drawer.className = 'fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-out select-none';
    drawer.innerHTML = `
        <!-- Drawer Header -->
        <div class="h-12 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between bg-[var(--bg-tertiary)] flex-shrink-0">
            <div class="flex items-center gap-2 min-w-0">
                <span id="side-drawer-icon" class="text-[var(--text-muted)] text-sm flex-shrink-0"><i class="fas fa-layer-group"></i></span>
                <h3 id="side-drawer-title" class="text-sm font-bold text-[var(--text-header)] truncate">Detail</h3>
            </div>
            <button type="button" onclick="window.closeSideDrawer && window.closeSideDrawer()" 
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-modifier-hover)] transition cursor-pointer"
                    aria-label="Zavřít panel">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>

        <!-- Drawer Content Body -->
        <div id="side-drawer-body" class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[var(--bg-primary)] text-[var(--text-normal)]">
        </div>
    `;

    document.body.appendChild(drawer);
    return drawer;
}

/**
 * Opens the side drawer with specified title, icon, and HTML content
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.icon]
 * @param {string} options.contentHtml
 * @param {Function} [options.onClose]
 */
export function openSideDrawer({ title = 'Detail', icon = '<i class="fas fa-layer-group"></i>', contentHtml = '', onClose = null } = {}) {
    const drawer = ensureDrawerDOM();
    triggerHaptic('light');

    activeDrawerCloseCallback = onClose;

    const titleEl = document.getElementById('side-drawer-title');
    const iconEl = document.getElementById('side-drawer-icon');
    const bodyEl = document.getElementById('side-drawer-body');

    if (titleEl) titleEl.textContent = title;
    if (iconEl) iconEl.innerHTML = icon;
    if (bodyEl) bodyEl.innerHTML = contentHtml;

    drawer.classList.remove('translate-x-full');
    drawer.classList.add('translate-x-0');
}

/**
 * Closes the active side drawer
 */
export function closeSideDrawer() {
    const drawer = document.getElementById('discord-side-drawer');
    if (!drawer) return;

    triggerHaptic('light');
    drawer.classList.add('translate-x-full');
    drawer.classList.remove('translate-x-0');

    if (typeof activeDrawerCloseCallback === 'function') {
        activeDrawerCloseCallback();
        activeDrawerCloseCallback = null;
    }
}

/**
 * Checks if the side drawer is currently visible
 */
export function isSideDrawerOpen() {
    const drawer = document.getElementById('discord-side-drawer');
    return !!drawer && drawer.classList.contains('translate-x-0');
}

// Global exposure
if (typeof window !== 'undefined') {
    window.openSideDrawer = openSideDrawer;
    window.closeSideDrawer = closeSideDrawer;
    window.isSideDrawerOpen = isSideDrawerOpen;
}
