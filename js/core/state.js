import { supabase } from './supabase.js';
import { isJosef, isKlarka } from './auth.js';

// Cache buster: 2026-03-25-20-30
const STATE_CACHE_KEY = 'kiscord_state_cache';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const state = {
    shifts: {},
    tetris: { jose: 0, klarka: 0 },
    currentChannel: "welcome",
    topicProgress: {},
    schoolEvents: [],
    calendarFilter: "all",
    isViewingBookmarks: false,
    currentTopicId: null,
    currentQuestionIndex: null,
    topicSessionHistory: [],
    funFactProgress: {},
    pendingResetId: null,
    startDate: "2025-12-24",
    healthData: {},
    dateFilter: "all",
    mapInstance: null,
    quizAnswers: { score: 0, completed: false },
    watchlist: [],
    route: [],
    ratings: {},
    dateRatings: {},
    dateRoute: [],
    watchHistory: {},
    plannedDates: {},
    movieHistory: {}, // { 'yyyy-mm-dd': [{ media_id, rating, status }] }
    currentUser: { name: 'Klárka', email: '' },
    isValentine: false,
    messageCount: 0, // Pro achievement Social Butterfly
    factsLibrary: { octopus: [], owl: [], raccoon: [], fun: [], penis: [] },
    factFavorites: [],
    library: { movies: [], series: [], games: [] },
    timelineEvents: [],
    bucketList: [],
    timelineHighlights: {},
    dateLocations: [],
    conversationTopics: [],
    achievementCategories: [],
    achievementDefinitions: [],
    achievements: [],
    dailyQuestion: null,
    dailyAnswers: [],
    gameQuestions: [],
    gamePrompts: [],
    gameVotes: [],
    drawStrokes: [],
    pinnedDrawing: null,
    coopQuests: [],
    brigadeFinances: [],
    brigadeChallenges: [],
    brigadeDiary: [],
    gymExercises: [],
    gymTemplates: [],
    gymLogs: [],
    gymPRs: [],
    gymBodyMeasurements: [],
    loveCoins: { jose: 0, klarka: 0 },
    inventory: [],
    shopItems: [],
    user_ids: { jose: null, klarka: null },
    loadError: false, // Track if initial load failed
    maturaProgress: {}, // { item_id: { jose: { status, notes }, klarka: { status, notes } } }
    maturaStreaks: { jose: 0, klarka: 0 },
    maturaSchedule: [],
    maturaAchievements: [],
    maturaTopics: {}, // { category_id: [topics] }
    maturaKBContent: {}, // { item_id: { content, updated_at } },
    regeneraceContent: null, // { key: content_object }
    assets: {}, // Dynamic mapping for Storage URLs
    settings: {
        theme: 'default',
        glassmorphism: true,
        blurIntensity: 10,
        haptics: true,
        soundEnabled: true,
        timelineViewMode: 'list',
        pinnedPhotos: [],
        sidebar: {
            hiddenChannels: [],
            channelOrder: [],
            categoryOrder: [],
            channelCategoryMap: {}
        },
        dashboardWidgets: {
            loveShop: true,
            health: true,
            supplements: true,
            schoolDorm: true,
            dailyQuestion: true,
            scheduleWidget: false,
            studyPlannerWidget: false,
            tetris: false,
            quests: false,
            funfacts: false,
            memoryBoard: false,
            alpskaHlidka: false,
            austrianWord: false
        },

        notifications: {
            nativeEnabled: false,
            reminders: {
                water: { enabled: true, interval: 120, haptic: true, sound: false },
                pills: { enabled: true, reminders: [{ time: '08:00', label: 'Léky' }], haptic: true, sound: true },
                bedtime: { enabled: true, time: '22:30', haptic: true, sound: false }
            },
            partner: {
                sunlight: { enabled: true, haptic: true, sound: true },
                dailyQuestions: { enabled: true, haptic: true, sound: true },
                letters: { enabled: true, haptic: true, sound: true },
                planning: { enabled: true, haptic: true, sound: true },
                mood: { enabled: true, haptic: true, sound: true },
                sleep: { enabled: true, haptic: true, sound: true }
            },
            system: {
                quests: { enabled: true, haptic: true, sound: false },
                dates: { enabled: true, haptic: true, sound: true }
            }
        }
    },

    // Lazy Load Flags
    _loaded: {
        calendar: false,
        timeline: false,
        library: false,
        matura: false, // Renamed from topics for clarity
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
    }
};

// --- PUB/SUB EVENT BUS ---
// Lightweight reactive notifications for state changes.
// Usage: stateEvents.on('bucketlist', () => re-render); stateEvents.emit('bucketlist');
const _listeners = {};
const stateEvents = {
    on(event, callback) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(callback);
        // Return unsubscribe function
        return () => {
            _listeners[event] = _listeners[event].filter(cb => cb !== callback);
        };
    },
    emit(event, data) {
        (_listeners[event] || []).forEach(cb => {
            try { cb(data); } catch (e) { console.error(`[stateEvents] Error in '${event}' listener:`, e); }
        });
    },
    off(event, callback) {
        if (_listeners[event]) {
            _listeners[event] = _listeners[event].filter(cb => cb !== callback);
        }
    }
};

let _settingsSyncTimeout = null;

function saveStateToCache() {
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
        // Extended SWR Caching Keys
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
        shopItems: state.shopItems
    };
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(cacheData));

    // Debounced sync of settings to Supabase profiles table
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
}

function loadStateFromCache() {
    try {
        const cached = localStorage.getItem(STATE_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            
            // Deep merge safety for critical config objects
            if (data.settings) {
                data.settings = { ...state.settings, ...data.settings };
                if (data.settings.dashboardWidgets) {
                    data.settings.dashboardWidgets = { ...state.settings.dashboardWidgets, ...data.settings.dashboardWidgets };
                } else {
                    data.settings.dashboardWidgets = state.settings.dashboardWidgets;
                }
                if (data.settings.sidebar) {
                    data.settings.sidebar = { ...state.settings.sidebar, ...data.settings.sidebar };
                    if (data.settings.sidebar.channelCategoryMap) {
                        data.settings.sidebar.channelCategoryMap = { ...state.settings.sidebar.channelCategoryMap, ...data.settings.sidebar.channelCategoryMap };
                    } else {
                        data.settings.sidebar.channelCategoryMap = state.settings.sidebar.channelCategoryMap;
                    }
                } else {
                    data.settings.sidebar = state.settings.sidebar;
                }
                if (data.settings.notifications) {
                    // Update: Remove obsolete keys (movement, confessions, mood)
                    if (data.settings.notifications.reminders) delete data.settings.notifications.reminders.movement;
                    if (data.settings.notifications.partner) {
                        delete data.settings.notifications.partner.confessions;
                        delete data.settings.notifications.partner.mood;
                    }

                    // Migration: pills.time (string) -> pills.times (array) -> pills.reminders (labeled objects)
                    if (data.settings.notifications.reminders?.pills) {
                        const p = data.settings.notifications.reminders.pills;
                        
                        // Stage 1: time (string) -> times (array)
                        if (p.time && !p.times && !p.reminders) {
                            p.times = [p.time];
                            delete p.time;
                        }
                        
                        // Stage 2: times (array) -> reminders (labeled objects)
                        if (p.times && !p.reminders) {
                            p.reminders = p.times.map(t => ({ time: t, label: 'Léky' }));
                            delete p.times;
                        }

                        if (!p.reminders) p.reminders = [{ time: '08:00', label: 'Léky' }];
                    }

                    data.settings.notifications = {
                        nativeEnabled: data.settings.notifications.nativeEnabled ?? state.settings.notifications.nativeEnabled,
                        reminders: { ...state.settings.notifications.reminders, ...data.settings.notifications.reminders },
                        partner: { ...state.settings.notifications.partner, ...data.settings.notifications.partner },
                        system: { ...state.settings.notifications.system, ...data.settings.notifications.system }
                    };
                } else {
                    data.settings.notifications = state.settings.notifications;
                }
            }

            // Deep merge safety for extended objects
            if (data.library) {
                data.library = { movies: [], series: [], games: [], ...data.library };
            }
            if (data.maturaStreaks) {
                data.maturaStreaks = { jose: 0, klarka: 0, ...data.maturaStreaks };
            }
            if (data.maturaProgress) {
                data.maturaProgress = { ...data.maturaProgress };
            }
            if (data.maturaTopics) {
                data.maturaTopics = { ...data.maturaTopics };
            }
            if (data.watchHistory) {
                data.watchHistory = { ...data.watchHistory };
            }
            if (data.loveCoins) {
                data.loveCoins = { jose: 0, klarka: 0, ...data.loveCoins };
            }
            if (data.inventory) {
                data.inventory = [ ...data.inventory ];
            }
            if (data.shopItems) {
                data.shopItems = [ ...data.shopItems ];
            }

            Object.assign(state, data);
            return true;
        }
    } catch (e) {
        console.error("Cache load error:", e);
    }
    return false;
}

async function initializeState() {
    const hasCached = loadStateFromCache();

    // SWR Strategy: If we have cache, resolve immediately to show UI.
    // The actual fetch happens as a background "revalidate" process.
    const revalidate = async () => {
        if (!navigator.onLine && hasCached) return;

        const today = new Date().toISOString().split('T')[0];

        try {
            console.log("[State] Revalidating state from Supabase...");
            // Essential Dashboard Data (minimal fetch)
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
                // Clear old keys to avoid ghosts if entries were deleted in DB
                // state.healthData = {}; // Optional: might cause flicker
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

            // 2. Fetch profiles to map IDs and load settings for the current user
            try {
                const { data: pData, error: pError } = await supabase.from('profiles').select('id, username, email, settings');
                if (!pError && pData) {
                    pData.forEach(p => {
                        const lowerName = (p.username || "").toLowerCase();
                        const lowerEmail = (p.email || "").toLowerCase();
                        if (lowerName.includes('josef') || lowerName.includes('jozk') || lowerEmail === 'jozkavalek@email.cz' || lowerEmail.includes('josef')) state.user_ids.jose = p.id;
                        if (lowerName.includes('klara') || lowerName.includes('vyslouzil') || lowerEmail === 'vyslouzilova.klara07@gmail.com' || lowerEmail.includes('klara')) state.user_ids.klarka = p.id;
                        
                        // Load cloud settings for current user if present
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
                                const catMap = p.settings.sidebar.channelCategoryMap
                                    ? { ...state.settings.sidebar.channelCategoryMap, ...p.settings.sidebar.channelCategoryMap }
                                    : state.settings.sidebar.channelCategoryMap;
                                mergedSettings.sidebar = { hiddenChannels: hidden, channelOrder: order, categoryOrder: catOrder, channelCategoryMap: catMap };
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

            // Notify UI that data is fresh
            stateEvents.emit('dashboard');
            stateEvents.emit('health');
            stateEvents.emit('settings_changed');
            if (state.user_ids.jose && state.user_ids.klarka) {
                stateEvents.emit('user_ids_loaded', state.user_ids);
            }
            console.log("[State] Revalidation complete.");

            // Background load non-critical data
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(() => {
                    ensureAssetsData(); // Load custom asset mapping
                    ensureFactsData();
                    ensureAchievementsData();
                });
            }
        } catch (e) {
            console.error("Critical Revalidation Error:", e);
            state.loadError = true;
        }
    };

    if (hasCached) {
        // Kick off revalidation in background, but return immediately
        revalidate();
        return Promise.resolve();
    } else {
        // Must wait for first fetch if nothing in cache
        return revalidate();
    }
}export {
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
    resetLazyLoaders
} from './loaders.js';

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
            window.showNotification(`${prefix} Love Coinů za: ${reason || 'aktivitu'}! 🪙✨`, 'success');
        }

        window.dispatchEvent(new CustomEvent('love-shop-updated'));
        import('../modules/levels.js').then(m => m.renderLevelUI?.()).catch(() => {});
    } catch (e) {
        console.warn("[Coins] Failed to award love coins:", e);
    }
}

export {
    state,
    stateEvents,
    saveStateToCache,
    initializeState
};


