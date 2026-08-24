import { idbGet, idbSet } from '../idb.js';
import { supabase } from '../supabase.js';

export const STATE_CACHE_KEY = 'kiscord_state_cache';
export const STALE_THRESHOLD_MS = 5 * 60 * 1000;

let _settingsSyncTimeout = null;

/**
 * Save current application state to high-capacity IndexedDB cache.
 * @param {import('../../types/state.js').AppState} state
 * @returns {Promise<boolean>}
 */
export async function saveStateToCache(state) {
    if (!state) return false;

    const cacheData = {
        shifts: state.shifts,
        healthData: state.healthData,
        timelineEvents: state.timelineEvents,
        dateLocations: state.dateLocations,
        achievements: state.achievements,
        achievementCategories: state.achievementCategories,
        achievementDefinitions: state.achievementDefinitions,
        coopQuests: state.coopQuests,
        dailyQuestion: state.dailyQuestion,
        dailyAnswers: state.dailyAnswers,
        tetris: state.tetris,
        user_ids: state.user_ids,
        settings: state.settings,
        maturaProgress: state.maturaProgress,
        maturaStreaks: state.maturaStreaks,
        maturaSchedule: state.maturaSchedule,
        maturaTopics: state.maturaTopics,
        library: state.library,
        watchlist: state.watchlist,
        watchHistory: state.watchHistory,
        regeneraceContent: state.regeneraceContent,
        brigadeFinances: state.brigadeFinances,
        brigadeChallenges: state.brigadeChallenges,
        brigadeDiary: state.brigadeDiary,
        gymExercises: state.gymExercises,
        gymTemplates: state.gymTemplates,
        gymLogs: state.gymLogs,
        gymPRs: state.gymPRs,
        loveCoins: state.loveCoins,
        inventory: state.inventory,
        shopItems: state.shopItems,
        nutritionLogs: state.nutritionLogs,
        nutritionTargets: state.nutritionTargets,
        biometricsProfiles: state.biometricsProfiles,
        savedFoods: state.savedFoods
    };

    const success = await idbSet(STATE_CACHE_KEY, cacheData);

    if (state.currentUser?.id) {
        if (_settingsSyncTimeout) clearTimeout(_settingsSyncTimeout);
        _settingsSyncTimeout = setTimeout(() => {
            supabase.from('profiles').upsert({ 
                id: state.currentUser.id,
                username: state.currentUser.name || state.currentUser.email,
                email: state.currentUser.email,
                settings: state.settings 
            }, { onConflict: 'id' })
                .then(({ error }) => { if (error) console.error('[State] Failed to sync settings:', error); })
                .catch(e => console.error('[State] Settings sync exception:', e));
        }, 2000);
    }

    return success;
}

/**
 * Hydrate state from IndexedDB (with transparent legacy localStorage migration).
 * @param {import('../../types/state.js').AppState} state
 * @returns {Promise<boolean>}
 */
export async function loadStateFromCache(state) {
    if (!state) return false;

    try {
        let data = await idbGet(STATE_CACHE_KEY);

        if (!data) {
            const legacyCached = localStorage.getItem(STATE_CACHE_KEY);
            if (legacyCached) {
                try {
                    data = JSON.parse(legacyCached);
                    await idbSet(STATE_CACHE_KEY, data);
                    localStorage.removeItem(STATE_CACHE_KEY);
                    console.log('[State] Successfully migrated cache from localStorage to IndexedDB.');
                } catch (err) {
                    console.warn('[State] Failed to parse legacy cache:', err);
                }
            }
        }

        if (data) {
            if (data.settings) {
                data.settings = { ...state.settings, ...data.settings };
                if (data.settings.dashboardWidgets) {
                    data.settings.dashboardWidgets = { ...state.settings.dashboardWidgets, ...data.settings.dashboardWidgets };
                } else {
                    data.settings.dashboardWidgets = state.settings?.dashboardWidgets || {};
                }
                if (data.settings.sidebar) {
                    data.settings.sidebar = { ...state.settings.sidebar, ...data.settings.sidebar };
                } else {
                    data.settings.sidebar = state.settings?.sidebar || {};
                }
                if (data.settings.notifications) {
                    data.settings.notifications = {
                        nativeEnabled: data.settings.notifications.nativeEnabled ?? state.settings?.notifications?.nativeEnabled ?? false,
                        reminders: { ...(state.settings?.notifications?.reminders || {}), ...(data.settings.notifications.reminders || {}) },
                        partner: { ...(state.settings?.notifications?.partner || {}), ...(data.settings.notifications.partner || {}) },
                        system: { ...(state.settings?.notifications?.system || {}), ...(data.settings.notifications.system || {}) }
                    };
                }
            }

            if (data.library) {
                data.library = { movies: [], series: [], games: [], ...data.library };
            }
            if (data.maturaStreaks) {
                data.maturaStreaks = { jose: 0, klarka: 0, ...data.maturaStreaks };
            }
            if (data.loveCoins) {
                data.loveCoins = { jose: 0, klarka: 0, ...data.loveCoins };
            }

            delete data.currentChannel;
            delete data.currentServer;
            delete data.lastServerChannels;

            Object.assign(state, data);
            return true;
        }
    } catch (e) {
        console.error("Cache load error:", e);
    }
    return false;
}
