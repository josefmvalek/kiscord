import { state } from './state.js';

/**
 * Asset Manager
 * Centralizes resolution of URLs for images and other media.
 * Supports fallback from Supabase Storage to local /public assets.
 */

const STORAGE_BUCKET = 'kiscord-assets';
const SUPABASE_URL = 'https://nnrorazsiyiedwomgidf.supabase.co';

// Default mapping for local fallback
const DEFAULT_ASSETS = {
    'jozka_profile': '/img/app/jozka_profilovka.jpg',
    'klarka_profile': '/img/app/klarka_profilovka.webp',
    'banner_vanoce': '/img/app/czippel2_vanoce.webp',
    'favicon': '/img/app/czippel2_kytka-modified.webp',
    'app_flower': '/img/app/czippel2_kytka.jpg'
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

    return DEFAULT_ASSETS[fullKey] || `/img/${fullKey}`;
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
