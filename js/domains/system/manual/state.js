/**
 * Local State & Exploration Tracking for Kiscord Manual (#návod)
 */

import { KEY_CHANNELS } from './data.js';

export let activePerspective = 'all'; // 'all' | 'klarka' | 'jozka' | 'couple'
export let activeCategory = 'all';
export let searchQuery = '';
export let activeFlywheelNode = null;
export let activeSimulatorTab = 'coins'; // 'coins' | 'offline' | 'sunflower'

export const simCoinsState = {
    water: 8,
    habits: 3,
    gym: 1,
    question: 1
};

export const simOfflineState = {
    isOnline: true,
    queueCount: 0,
    isSyncing: false
};

export const simSunflowerState = {
    mood: 8,
    sleepHours: 8,
    water: 6,
    isSleeping: false
};

export function setActivePerspective(p) {
    activePerspective = p;
}

export function setActiveCategory(c) {
    activeCategory = c;
}

export function setSearchQuery(q) {
    searchQuery = q;
}

export function setActiveFlywheelNode(n) {
    activeFlywheelNode = n;
}

export function setActiveSimulatorTab(t) {
    activeSimulatorTab = t;
}

export function getExploredChannels() {
    try {
        const raw = localStorage.getItem('kiscord_explored_channels');
        return raw ? JSON.parse(raw) : ['manual', 'dashboard'];
    } catch {
        return ['manual', 'dashboard'];
    }
}

export function recordChannelExploration(channelId) {
    try {
        const explored = getExploredChannels();
        if (!explored.includes(channelId)) {
            explored.push(channelId);
            localStorage.setItem('kiscord_explored_channels', JSON.stringify(explored));
        }
    } catch (e) {
        console.warn('[Manual] Error saving exploration:', e);
    }
}

export function calculateExplorationStats() {
    const explored = getExploredChannels();
    const pct = Math.min(100, Math.round((explored.length / KEY_CHANNELS.length) * 100));
    return {
        explored,
        pct,
        total: KEY_CHANNELS.length,
        remaining: Math.max(0, KEY_CHANNELS.length - explored.length)
    };
}
