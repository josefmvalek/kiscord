/**
 * PWA App Badging & Notification Counts API
 * Keeps native app icon badge in sync with pending couple activities.
 */

import { state } from './state.js';

/**
 * Calculates current pending items count across all active stores
 * @returns {number}
 */
export function calculatePendingBadgeCount() {
    let count = 0;

    // 1. Unopened future letters ready to read
    const nowIso = new Date().toISOString();
    if (Array.isArray(state.futureLetters)) {
        const unreadLetters = state.futureLetters.filter(l => l && !l.is_read && l.unlock_at <= nowIso);
        count += unreadLetters.length;
    }

    // 2. Unanswered daily question
    if (state.dailyQuestion && !state.dailyQuestion.answered) {
        count += 1;
    }

    // 3. Pending coupon requests in Love Shop
    if (Array.isArray(state.inventory)) {
        const pendingCoupons = state.inventory.filter(i => i && i.status === 'requested');
        count += pendingCoupons.length;
    }

    // 4. Pending date proposals
    if (state.plannedDates) {
        const dates = Array.isArray(state.plannedDates) ? state.plannedDates : Object.values(state.plannedDates);
        const pendingDates = dates.filter(d => d && d.status === 'pending');
        count += pendingDates.length;
    }

    return count;
}

/**
 * Updates the native PWA application badge on home screen / taskbar
 * @param {number|null} [explicitCount=null]
 */
export async function updateAppBadge(explicitCount = null) {
    if (typeof navigator === 'undefined') return;

    const count = explicitCount !== null ? explicitCount : calculatePendingBadgeCount();

    try {
        if ('setAppBadge' in navigator) {
            if (count > 0) {
                await navigator.setAppBadge(count);
            } else {
                await navigator.clearAppBadge();
            }
        }
    } catch (err) {
        console.warn('[Badging] Failed to update app badge:', err);
    }
}

/**
 * Registers Periodic Background Sync in Service Worker if supported
 */
export async function registerPeriodicBackgroundSync() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        if ('periodicSync' in registration) {
            const status = await navigator.permissions.query({
                name: /** @type {any} */ ('periodic-background-sync')
            });

            if (status.state === 'granted') {
                await registration.periodicSync.register('kiscord-morning-sync', {
                    minInterval: 12 * 60 * 60 * 1000 // 12 hours
                });
                console.log('[PWA] Periodic Background Sync registered.');
                return true;
            }
        }
    } catch (e) {
        console.warn('[PWA] Periodic sync registration not supported/granted:', e);
    }
    return false;
}
