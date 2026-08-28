/**
 * Kiscord Reactive State Core & Domain Facade
 * Provides unified access to all Domain Store Slices, Typed EventBus and SWR IndexedDB Cache.
 */

import { supabase } from './supabase.js';
import { isJosef, isKlarka } from './auth.js';
import { eventBus, stateEvents } from './state/event-bus.js';
import { saveStateToCache as saveToCache, loadStateFromCache as loadFromCache } from './state/store-persistence.js';

import { initialAuthState } from './state/auth-store.js';
import { initialGymState } from './state/gym-store.js';
import { initialHealthState } from './state/health-store.js';
import { initialCoupleState } from './state/couple-store.js';
import { initialFitState } from './state/fit-store.js';
import { initialMediaState } from './state/media-store.js';
import { initialSettingsState } from './state/settings-store.js';

import {
    ensureCalendarData,
    ensureLibraryData,
    ensureTimelineData,
    ensureMaturaData,
    ensureBucketListData,
    ensureMapData,
    ensureAchievementsData,
    ensureFactsData,
    ensureTopicsData,
    ensureGamesData,
    ensureDrawStrokesData,
    ensureDailyQuizData,
    ensureDailyArchiveData,
    ensureAllHealthData,
    ensureRegeneraceData,
    ensureAssetsData,
    refreshMaturaTopics,
    ensureShiftsData,
    ensureFinancesData,
    ensureChallengesData,
    ensureDiaryData,
    ensureGymData,
    ensureLoveShopData,
    ensureStudyData,
    resetLazyLoaders
} from './loaders.js';

/** @type {import('../types/state.js').AppState} */
export const state = {
    // Navigation & Global UI State
    currentServer: "home",
    currentChannel: "welcome",
    lastServerChannels: {},
    dateFilter: "all",
    calendarFilter: "all",
    isViewingBookmarks: false,
    currentTopicId: null,
    currentQuestionIndex: null,
    topicSessionHistory: [],
    topicProgress: {},
    funFactProgress: {},
    pendingResetId: null,
    mapInstance: null,
    loadError: false,
    assets: {},
    regeneraceContent: null,

    // Lazy load flags
    _loaded: {
        calendar: false,
        timeline: false,
        library: false,
        matura: false,
        achievements: false,
        games: false,
        facts: false,
        conv_topics: false,
        regenerace: false,
        dailyArchive: false,
        shifts: false,
        finances: false,
        challenges: false,
        diary: false,
        gym: false,
        loveShop: false
    },

    // Domain State Slices
    ...initialAuthState,
    ...initialGymState,
    ...initialHealthState,
    ...initialCoupleState,
    ...initialFitState,
    ...initialMediaState,
    ...structuredClone(initialSettingsState)
};

export function saveStateToCache() {
    return saveToCache(state);
}

export function loadStateFromCache() {
    return loadFromCache(state);
}

export async function initializeState() {
    const hasCached = await loadStateFromCache();

    const revalidate = async () => {
        if (!navigator.onLine && hasCached) return;
        return syncWithSupabase();
    };

    if (hasCached) {
        revalidate();
    } else {
        await syncWithSupabase();
    }
}

export async function syncWithSupabase() {
    const today = new Date().toISOString().split('T')[0];

    try {
        console.log("[State] Revalidating state from Supabase...");
        const [
                { data: healthHistory },
                { data: todayDates },
                { data: tetrisData },
                { data: questData },
                pinnedData
            ] = await Promise.all([
                supabase.from('health_data')
                    .select('*')
                    .eq('user_id', state.currentUser?.id)
                    .order('date_key', { ascending: false })
                    .limit(30),
                supabase.from('planned_dates').select('*').eq('date_key', today),
                supabase.from('tetris_scores').select('*'),
                supabase.from('coop_quests').select('*').eq('is_active', true),
                supabase.from('pinned_drawings').select('*, drawings(*)').maybeSingle()
            ]);

            if (pinnedData?.data) state.pinnedDrawing = pinnedData.data.drawings;

            if (healthHistory && Array.isArray(healthHistory)) {
                healthHistory.forEach(row => {
                    state.healthData[row.date_key] = {
                        water: row.water, sleep: row.sleep, mood: row.mood,
                        movement: row.movement, bedtime: row.bedtime, pills: row.pills || false, supplements: row.supplements || { iron: false, zinc: false, magnesium: false }
                    };
                });
            }

            if (todayDates) {
                todayDates.forEach(row => {
                    state.plannedDates[row.date_key] = {
                        id: row.id, name: row.name, cat: row.cat, time: row.time, note: row.note,
                        status: row.status || 'idea', 
                        proposed_by: row.proposed_by,
                        rejection_reason: row.rejection_reason || '',
                        backup_plan: row.backup_plan || '',
                        checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : (row.checklist || [])
                    };
                });
            }

            const isMeJose = isJosef(state.currentUser);
            const isMeKlarka = isKlarka(state.currentUser);

            if (state.currentUser?.id) {
                if (isMeJose) {
                    state.tetris.jose_id = state.currentUser.id;
                    state.user_ids.jose = state.currentUser.id;
                } else if (isMeKlarka) {
                    state.tetris.klarka_id = state.currentUser.id;
                    state.user_ids.klarka = state.currentUser.id;
                }
            }

            try {
                const { data: pData, error: pError } = await supabase.from('profiles').select('id, username, email, settings, love_coins');
                if (!pError && pData) {
                    pData.forEach(p => {
                        const lowerName = (p.username || "").toLowerCase();
                        const lowerEmail = (p.email || "").toLowerCase();
                        if (lowerName.includes('josef') || lowerName.includes('jozk') || lowerEmail === 'jozkavalek@email.cz' || lowerEmail.includes('josef')) {
                            state.user_ids.jose = p.id;
                            if (typeof p.love_coins === 'number') state.loveCoins.jose = p.love_coins;
                        }
                        if (lowerName.includes('klara') || lowerName.includes('vyslouzil') || lowerEmail === 'vyslouzilova.klara07@gmail.com' || lowerEmail.includes('klara')) {
                            state.user_ids.klarka = p.id;
                            if (typeof p.love_coins === 'number') state.loveCoins.klarka = p.love_coins;
                        }
                        
                        if (state.currentUser?.id && p.id === state.currentUser.id && p.settings) {
                            const mergedSettings = { ...state.settings, ...p.settings };
                            if (p.settings.dashboardWidgets) {
                                mergedSettings.dashboardWidgets = { ...state.settings.dashboardWidgets, ...p.settings.dashboardWidgets };
                            }
                            if (p.settings.sidebar) {
                                const hidden = Array.isArray(p.settings.sidebar.hiddenChannels)
                                    ? p.settings.sidebar.hiddenChannels
                                    : state.settings.sidebar.hiddenChannels;
                                const order = Array.isArray(p.settings.sidebar.channelOrder)
                                    ? p.settings.sidebar.channelOrder
                                    : state.settings.sidebar.channelOrder;
                                const catOrder = Array.isArray(p.settings.sidebar.categoryOrder)
                                    ? p.settings.sidebar.categoryOrder
                                    : state.settings.sidebar.categoryOrder;
                                const collapsed = Array.isArray(p.settings.sidebar.collapsedCategories)
                                    ? p.settings.sidebar.collapsedCategories
                                    : (state.settings.sidebar.collapsedCategories || ['📦 ARCHIV', '⚙️ SYSTÉM & INFO']);
                                mergedSettings.sidebar = { hiddenChannels: hidden, channelOrder: order, categoryOrder: catOrder, collapsedCategories: collapsed };
                            }
                            if (p.settings.notifications) {
                                mergedSettings.notifications = {
                                    nativeEnabled: p.settings.notifications.nativeEnabled ?? state.settings.notifications.nativeEnabled,
                                    reminders: { ...state.settings.notifications.reminders, ...p.settings.notifications.reminders },
                                    partner: { ...state.settings.notifications.partner, ...p.settings.notifications.partner },
                                    system: { ...state.settings.notifications.system, ...p.settings.notifications.system }
                                };
                            }
                            state.settings = mergedSettings;
                        }
                    });
                    stateEvents.emit('love_coins');
                }
            } catch (err) { console.warn('[State] Profile fetch failed:', err); }

            if (tetrisData) {
                tetrisData.forEach(row => {
                    const isMe = row.user_id === state.currentUser?.id;
                    if (isMe) {
                        if (isMeJose) { state.tetris.jose = row.score || 0; state.user_ids.jose = row.user_id; }
                        else if (isMeKlarka) { state.tetris.klarka = row.score || 0; state.user_ids.klarka = row.user_id; }
                    } else {
                        if (isMeJose) { state.tetris.klarka = row.score || 0; state.user_ids.klarka = row.user_id; }
                        else if (isMeKlarka) { state.tetris.jose = row.score || 0; state.user_ids.jose = row.user_id; }
                    }
                });
            }

            if (questData) state.coopQuests = questData;

            state.loadError = false;
            saveStateToCache();

            stateEvents.emit('dashboard');
            stateEvents.emit('health');
            stateEvents.emit('settings_changed');
            if (state.user_ids.jose && state.user_ids.klarka) {
                stateEvents.emit('user_ids_loaded', state.user_ids);
            }
            console.log("[State] Revalidation complete.");

            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(() => {
                    ensureAssetsData();
                    ensureFactsData();
                    ensureAchievementsData();
                });
            }
        } catch (e) {
            console.error("Critical Revalidation Error:", e);
            state.loadError = true;
        }
}

/**
 * Awards Love Coins to the current user, plays sound, updates state and shows toast.
 */
export async function awardLoveCoinsToCurrentUser(amount, reason = '') {
    try {
        const myId = state.currentUser?.id;
        if (!myId) return;

        const isMeJose = myId === state.user_ids?.jose;
        const currentCoins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);
        const newCoins = Math.max(0, currentCoins + amount);

        if (isMeJose) {
            state.loveCoins.jose = newCoins;
        } else {
            state.loveCoins.klarka = newCoins;
        }

        saveStateToCache();

        const { supabase } = await import('./supabase.js');
        const { error } = await supabase
            .from('profiles')
            .update({ love_coins: newCoins })
            .eq('id', myId);

        if (error) {
            console.warn("[Coins] Error updating profile coins:", error);
        }

        import('./sound.js').then(m => m.playCoinsSound?.()).catch(() => {});
        
        if (typeof window.showNotification === 'function') {
            const prefix = amount > 0 ? `+${amount}` : `${amount}`;
            window.showNotification(`${prefix} Love Coinů za: ${reason || 'aktivitu'}! 🪙✨`, 'coin');
        }

        window.dispatchEvent(new CustomEvent('love-shop-updated'));
        import('../domains/entertainment/levels.js').then(m => m.renderLevelUI?.()).catch(() => {});
    } catch (e) {
        console.warn("[Coins] Failed to award love coins:", e);
    }
}

export {
    eventBus,
    stateEvents,
    ensureCalendarData,
    ensureLibraryData,
    ensureTimelineData,
    ensureMaturaData,
    ensureBucketListData,
    ensureMapData,
    ensureAchievementsData,
    ensureFactsData,
    ensureTopicsData,
    ensureGamesData,
    ensureDrawStrokesData,
    ensureDailyQuizData,
    ensureDailyArchiveData,
    ensureAllHealthData,
    ensureRegeneraceData,
    ensureAssetsData,
    refreshMaturaTopics,
    ensureShiftsData,
    ensureFinancesData,
    ensureChallengesData,
    ensureDiaryData,
    ensureGymData,
    ensureLoveShopData,
    ensureStudyData,
    resetLazyLoaders
};
