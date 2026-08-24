/**
 * Kiscord Reactive Domain Signals & Fine-Grained UI Bindings
 * Connects micro-signals to key UI components for instant atomic updates without DOM thrashing.
 */

import { createSignal, createEffect, bindText, bindClass, createComputed } from '../signals.js';
import { state } from '../state.js';

// 1. Love Coins Signal
const [getLoveCoins, setLoveCoins] = createSignal(0);

// 2. Connectivity / Online Status Signal
const [getOnlineStatus, setOnlineStatus] = createSignal(typeof navigator !== 'undefined' ? navigator.onLine : true);

// 3. Active Workout State Signal
const [getActiveWorkoutState, setActiveWorkoutState] = createSignal(null);

// 4. Current Theme Signal
const [getCurrentTheme, setCurrentTheme] = createSignal(state.theme || 'default');

export {
    getLoveCoins,
    setLoveCoins,
    getOnlineStatus,
    setOnlineStatus,
    getActiveWorkoutState,
    setActiveWorkoutState,
    getCurrentTheme,
    setCurrentTheme
};

/**
 * Sync initial state into signals
 */
export function syncStateToSignals() {
    if (state.currentUser && state.coins) {
        const userCoins = state.coins[state.currentUser.id] || 0;
        setLoveCoins(userCoins);
    }
    if (state.theme) {
        setCurrentTheme(state.theme);
    }
    try {
        const raw = localStorage.getItem('kiscord_active_workout');
        if (raw) setActiveWorkoutState(JSON.parse(raw));
    } catch (e) {}
}

/**
 * Automatically bind Love Coins badge in the header
 * @param {string} [selector='#header-love-coins']
 * @returns {() => void} Cleanup handle
 */
export function bindLoveCoinsBadge(selector = '#header-love-coins') {
    return bindText(selector, () => {
        const coins = getLoveCoins();
        return `${Number(coins).toLocaleString('cs-CZ')} 🪙`;
    });
}

/**
 * Automatically bind Connectivity Status to an indicator/banner
 * @param {string} [selector='#offline-banner']
 * @returns {() => void} Cleanup handle
 */
export function bindConnectivityStatus(selector = '#offline-banner') {
    return bindClass(selector, 'hidden', () => getOnlineStatus());
}

/**
 * Initialize window network event listeners for reactive connectivity signal
 */
export function initConnectivityListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => setOnlineStatus(true));
    window.addEventListener('offline', () => setOnlineStatus(false));
}
