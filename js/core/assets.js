import { state } from './state.js';

/**
 * Asset Manager
 * Centralizes resolution of URLs for images and other media.
 * Supports fallback from Supabase Storage to local /public assets.
 */

const STORAGE_BUCKET = 'kiscord-assets';
const SUPABASE_URL = 'https://nnrorazsiyiedwomgidf.supabase.co';

// Default mapping for local fallback
const DEFAULT_JOZKA_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%235865F2'/%3E%3Ctext x='50' y='65' font-size='45' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'%3E🦝%3C/text%3E%3C/svg%3E";
const DEFAULT_KLARKA_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23eb459e'/%3E%3Ctext x='50' y='65' font-size='45' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'%3E🦉%3C/text%3E%3C/svg%3E";

const DEFAULT_ASSETS = {
    'jozka_profile': DEFAULT_JOZKA_AVATAR,
    'klarka_profile': DEFAULT_KLARKA_AVATAR,
    'banner_vanoce': '/img/app/czippel2_kytka.jpg',
    'favicon': '/img/app/czippel2_kytka-modified.png',
    'app_flower': '/img/app/czippel2_kytka.jpg',
    'app_kytka': '/img/app/czippel2_kytka.jpg',
    'server_icon': '/img/app/czippel2_kytka-modified.png'
};

/**
 * Resolves the final URL for an asset.
 * @param {string} key - The asset identifier (e.g., 'jozka_profile' or 'mood')
 * @param {number|string} index - Optional index/suffix (e.g., 5 for 'mood_5')
 * @returns {string} - The public URL
 */
export function getAssetUrl(key, index = null) {
    const fullKey = index !== null ? `${key}_${index}` : key;
    
    // 1. Try to get from dynamic state (fetched from Supabase)
    if (state.assets && state.assets[fullKey]) {
        return state.assets[fullKey];
    }

    // 2. Return local fallback
    if (key === 'mood' && index !== null) {
        return `/img/mood/${index}.jpg`;
    }
    if (key === 'puzzle' && index !== null) {
        return `/img/puzzle/${index}.jpg`;
    }

    return DEFAULT_ASSETS[fullKey] || `/img/app/czippel2_kytka.jpg`;
}


/**
 * Helper to get a profile photo by user ID or name
 */
export function getUserAvatar(userIdOrName) {
    const name = String(userIdOrName).toLowerCase();
    if (name.includes('josef') || name.includes('jozk') || name === state.user_ids?.jose) {
        return getAssetUrl('jozka_profile');
    }
    return getAssetUrl('klarka_profile');
}
