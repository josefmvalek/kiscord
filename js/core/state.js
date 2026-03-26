import { supabase } from './supabase.js';
import { isJosef, isKlarka } from './auth.js';

// Cache buster: 2026-03-25-20-30
const STATE_CACHE_KEY = 'kiscord_state_cache';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const state = {
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
    user_ids: { jose: null, klarka: null },
    loadError: false // Track if initial load failed
};

// --- PUB/SUB EVENT BUS ---
// Lightweight reactive notifications for state changes.
// Usage: stateEvents.on('bucketlist', () => re-render); stateEvents.emit('bucketlist');
const _listeners = {};
export const stateEvents = {
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

function saveStateToCache() {
    const cacheData = {
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
        user_ids: state.user_ids
    };
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(cacheData));
}

function loadStateFromCache() {
    try {
        const cached = localStorage.getItem(STATE_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            Object.assign(state, data);
            return true;
        }
    } catch (e) {
        console.error("Cache load error:", e);
    }
    return false;
}

async function initializeState() {
    // Try to load from cache first for immediate UI
    const hasCached = loadStateFromCache();

    if (!navigator.onLine && hasCached) {
        console.log("[OFFLINE] Using cached state.");
        return;
    }

    // Reset before fresh load (only if online or no cache)
    state.healthData = {};
    state.plannedDates = {};
    state.schoolEvents = {};
    state.topicProgress = {};
    state.watchlist = [];
    state.ratings = {};
    state.watchHistory = {};
    state.movieHistory = {};
    state.dateRatings = {};
    state.quizAnswers = { score: 0, completed: false };
    state.factsLibrary = { octopus: [], owl: [], raccoon: [], fun: [], penis: [] };
    state.factFavorites = [];
    state.library = { movies: [], series: [], games: [] };
    state.timelineEvents = [];
    state.dateLocations = [];
    state.conversationTopics = [];
    state.achievementCategories = [];
    state.achievementDefinitions = [];
    state.achievements = [];
    state.funFactProgress = {};
    state.dailyQuestion = null;
    state.dailyAnswers = [];
    state.gamePrompts = [];
    state.coopQuests = [];
    state.user_ids = { jose: null, klarka: null };
    state.bucketList = [];
    state.tetris = { jose: 0, klarka: 0 }; // Reset Tetris scores before fresh load
    state.loadError = false; // Reset error state on each init

    try {


        const [
            { data: healthData },
            { data: plannedData },
            { data: schoolData },
            { data: tetrisData },
            { data: factsData },
            { data: funFactProgressData },
            { data: questData },
            { data: favData },
            pinnedData
        ] = await Promise.all([
            // Stáhnout všechna data pro kalendář a statistiky
            supabase.from('health_data').select('*'),
            supabase.from('planned_dates').select('*'),
            supabase.from('school_events').select('*'),
            supabase.from('tetris_scores').select('*'),
            supabase.from('app_facts').select('*'),
            supabase.from('fun_fact_progress').select('*'),
            supabase.from('coop_quests').select('*').eq('is_active', true),
            supabase.from('app_fact_favorites').select('fact_id'),
            supabase.from('pinned_drawings').select('*, drawings(*)').maybeSingle()
        ]);

        if (pinnedData?.data) state.pinnedDrawing = pinnedData.data.drawings;

        // OPRAVA #1: Health Data – odstraněn zbytečný JS user_id filtr
        // RLS politika (auth.uid() = user_id) filtrování zajišťuje sama.
        // Původní filtr selhal, protože state.currentUser.id není ještě nastaveno.
        if (healthData) {
            healthData.forEach(row => {
                state.healthData[row.date_key] = {
                    water: row.water,
                    sleep: row.sleep,
                    mood: row.mood,
                    movement: row.movement,
                    bedtime: row.bedtime
                };
            });
        }

        if (plannedData) {
            plannedData.forEach(row => {
                state.plannedDates[row.date_key] = {
                    id: row.id,
                    name: row.name,
                    cat: row.cat,
                    time: row.time,
                    note: row.note,
                    status: row.status || 'idea',
                    backup_plan: row.backup_plan || '',
                    checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : (row.checklist || [])
                };
            });
        }

        if (schoolData) {
            schoolData.forEach(row => {
                state.schoolEvents[row.date_key] = {
                    title: row.title,
                    type: row.type
                };
            });
        }

        const isMeJose = isJosef(state.currentUser);
        const isMeKlarka = isKlarka(state.currentUser);

        // Always ensure at least the current user's ID is in the correct slot
        if (state.currentUser?.id) {
            if (isMeJose) {
                state.tetris.jose_id = state.currentUser.id;
                state.user_ids.jose = state.currentUser.id;
            } else if (isMeKlarka) {
                state.tetris.klarka_id = state.currentUser.id;
                state.user_ids.klarka = state.currentUser.id;
            }
        }

        if (tetrisData) {
            console.log(`[TETRIS] Found ${tetrisData.length} records. Current IDs: Jose=${state.tetris.jose_id}, Klarka=${state.tetris.klarka_id}`);
            
            tetrisData.forEach(row => {
                const isMe = row.user_id === state.currentUser?.id;
                
                if (isMe) {
                    if (isMeJose) {
                        state.tetris.jose = row.score || 0;
                        state.tetris.jose_id = row.user_id;
                        state.user_ids.jose = row.user_id;
                    } else if (isMeKlarka) {
                        state.tetris.klarka = row.score || 0;
                        state.tetris.klarka_id = row.user_id;
                        state.user_ids.klarka = row.user_id;
                    }
                } else {
                    // Someone else's row. Assign to partner if known, or discover.
                    if (isMeJose) {
                        state.tetris.klarka = row.score || 0;
                        state.tetris.klarka_id = row.user_id;
                        state.user_ids.klarka = row.user_id;
                    } else if (isMeKlarka) {
                        state.tetris.jose = row.score || 0;
                        state.tetris.jose_id = row.user_id;
                        state.user_ids.jose = row.user_id;
                    } else {
                        // Admin/Host view: assign heuristically if not set
                        if (row.score > 0) { // Simple filter for non-empty records
                            if (!state.tetris.jose || state.tetris.jose === 0) {
                                state.tetris.jose = row.score;
                                state.tetris.jose_id = row.user_id;
                                state.user_ids.jose = row.user_id;
                            } else {
                                state.tetris.klarka = row.score;
                                state.tetris.klarka_id = row.user_id;
                                state.user_ids.klarka = row.user_id;
                            }
                        }
                    }
                }
            });
            console.log(`[TETRIS] Final scores assigned: Jose=${state.tetris.jose}, Klarka=${state.tetris.klarka}`);
        }



        if (favData) {
            state.factFavorites = favData.map(f => f.fact_id);
        }

        if (factsData) {
            factsData.forEach(f => {
                const cat = f.category;
                if (!state.factsLibrary[cat]) {
                    state.factsLibrary[cat] = [];
                }
                state.factsLibrary[cat].push({ 
                    id: f.id,
                    icon: f.icon, 
                    text: f.text,
                    subcategory: f.subcategory || '',
                    subcategory_level2: f.subcategory_level2 || ''
                });
            });
        }


        if (funFactProgressData) {
            funFactProgressData.forEach(row => {
                const sub1 = row.subcategory_id || '';
                const sub2 = row.subcategory_level2_id || '';
                
                let key = row.category_id;
                if (sub1) key += `:${sub1}`;
                if (sub2) key += `:${sub2}`;

                state.funFactProgress[key] = {
                    index: row.current_index,
                    completed: row.completed
                };
            });
        }


        if (questData) {
            state.coopQuests = questData;
        }

        // quiz_answers závisí na user_id → samostatně po inicializaci uživatele
        if (state.currentUser?.id) {
            const { data: quizData } = await supabase
                .from('quiz_answers')
                .select('*')
                .eq('user_id', state.currentUser.id)
                .maybeSingle();
            if (quizData) {
                state.quizAnswers = {
                    score: quizData.score || 0,
                    completed: quizData.completed || false
                };
            }
        }

    } catch (err) {
        console.error("Supabase load error:", err);
        state.loadError = !hasCached; // Only error if we have no cache
    }

    // Auto-save to cache after successful (or attempted) load
    saveStateToCache();
}

let libraryLoaded = false;
async function ensureLibraryData(force = false) {
    if (libraryLoaded && !force && !isStale('library')) return;
    try {
        const [libData, watchData, ratingData] = await Promise.all([
            supabase.from('library_content').select('*'),
            supabase.from('library_watchlist').select('*').eq('added_by', state.currentUser?.id),
            supabase.from('library_ratings').select('*')
        ]);

        if (libData.data) {
            state.library = { movies: [], series: [], games: [] };
            libData.data.forEach(item => {
                const typeKey = item.type === 'movie' ? 'movies' : (item.type === 'series' ? 'series' : 'games');
                state.library[typeKey].push({
                    id: item.id,
                    title: item.title,
                    icon: item.icon,
                    cat: item.category,
                    magnet: item.magnet,
                    gdrive: item.gdrive,
                    mood_tags: item.mood_tags || [],
                    trailer: item.trailer || ""
                });
            });
        }

        if (watchData.data) {
            state.watchlist = watchData.data.map(row => ({
                id: parseInt(row.media_id),
                type: row.type,
                user_id: row.added_by
            }));
        }

        if (ratingData.data) {
            state.ratings = {};
            state.watchHistory = {};
            state.movieHistory = {};
            ratingData.data.forEach(row => {
                const mid = parseInt(row.media_id);
                const status = row.status === 'watched' ? 'seen' : row.status;
                state.ratings[mid] = row.rating || 0;
                state.watchHistory[mid] = {
                    rating: row.rating || 0,
                    status: status,
                    date: row.seen_date || "",
                    reaction: row.reaction || ""
                };
                if (row.seen_date && status === 'seen') {
                    if (!state.movieHistory[row.seen_date]) state.movieHistory[row.seen_date] = [];
                    state.movieHistory[row.seen_date].push({
                        media_id: mid,
                        rating: row.rating || 0,
                        status: status,
                        reaction: row.reaction || ""
                    });
                }
            });
        }
        libraryLoaded = true;
        markLoaded('library');
        stateEvents.emit('library');
    } catch (err) {
        console.error("Refresh Library State Error:", err);
    }
}

let bucketListLoaded = false;
async function ensureBucketListData(force = false) {
    if (bucketListLoaded && !force && !isStale('bucketlist')) return;
    try {
        const { data, error } = await supabase
            .from('bucket_list')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        state.bucketList = data || [];
        bucketListLoaded = true;
        markLoaded('bucketlist');
        stateEvents.emit('bucketlist');
    } catch (e) {
        console.error("Error loading bucket list data:", e);
    }
}

// --- LAZY LOADING TIMESTAMPS (for stale detection) ---
const _loadedAt = {};
function isStale(key) {
    if (!_loadedAt[key]) return true;
    return Date.now() - _loadedAt[key] > STALE_THRESHOLD_MS;
}
function markLoaded(key) {
    _loadedAt[key] = Date.now();
}

let timelineLoaded = false;
async function ensureTimelineData(force = false) {
    if (timelineLoaded && !force && !isStale('timeline')) return;
    try {
        const { data } = await supabase.from('timeline_events').select('*').order('event_date', { ascending: false, nullsFirst: false });
        if (data) {
            state.timelineEvents = data.map(e => ({
                id: e.id,
                title: e.title,
                event_date: e.event_date,
                icon: e.icon || "📸",
                color: e.color,
                description: e.description || "",
                images: e.images || [],
                location_id: e.location_id || null,
                user_highlights: e.user_highlights || "",
                is_milestone: e.is_milestone || false
            }));
        }
        timelineLoaded = true;
        markLoaded('timeline');
        stateEvents.emit('timeline');
    } catch (e) {
        console.error("Error loading timeline data:", e);
    }
}

let mapDataLoaded = false;
async function ensureMapData(force = false) {
    if (mapDataLoaded && !force && !isStale('map')) return;
    try {
        const [{ data: ratingData }, { data: locData }] = await Promise.all([
            supabase.from('date_ratings').select('*'),
            supabase.from('date_locations').select('*')
        ]);
        if (ratingData) ratingData.forEach(row => { state.dateRatings[row.location_id] = row.rating; });
        if (locData) {
            state.dateLocations = locData.map(l => ({
                id: l.id,
                name: l.name,
                cat: l.category,
                icon: l.icon || "📍",
                lat: l.lat,
                lng: l.lng,
                desc: l.description
            }));
        }
        mapDataLoaded = true;
        markLoaded('map');
        stateEvents.emit('map');
    } catch (e) {
        console.error("Error loading map data", e);
    }
}

let achievementsLoaded = false;
async function ensureAchievementsData(force = false) {
    if (achievementsLoaded && !force && !isStale('achievements')) return;
    try {
        const [{ data: ach }, { data: cat }, { data: def }] = await Promise.all([
            supabase.from('achievements').select('*'),
            supabase.from('achievement_categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('achievement_definitions').select('*')
        ]);
        if (ach) state.achievements = ach;
        if (cat) state.achievementCategories = cat;
        if (def) state.achievementDefinitions = def;
        achievementsLoaded = true;
        markLoaded('achievements');
        stateEvents.emit('achievements');
    } catch (e) {
        console.error("Error loading achievements data:", e);
    }
}

let topicsLoaded = false;
async function ensureTopicsData(force = false) {
    if (topicsLoaded && !force && !isStale('topics')) return;
    try {
        const { data } = await supabase.from('conversation_topics').select('*');
        if (data) Object.assign(state, {
            conversationTopics: data.map(t => ({
                id: t.id, title: t.title, icon: t.icon, color: t.color, desc: t.description, questions: t.questions
            }))
        });
        topicsLoaded = true;
        markLoaded('topics');
        stateEvents.emit('topics');
    } catch(e) { console.error("Error topics:", e); }
}

let gamesLoaded = false;
async function ensureGamesData() {
    if (gamesLoaded) return;
    try {
        const [{ data: q }, { data: v }, { data: p }] = await Promise.all([
            supabase.from('game_questions').select('*'),
            supabase.from('game_votes').select('*'),
            supabase.from('game_prompts').select('*')
        ]);
        if (q) state.gameQuestions = q;
        if (v) state.gameVotes = v;
        if (p) state.gamePrompts = p;
        gamesLoaded = true;
    } catch(e) { console.error("Error games:", e); }
}

let drawLoaded = false;
async function ensureDrawStrokesData() {
    if (drawLoaded) return;
    try {
        const { data } = await supabase.from('draw_strokes').select('*').is('drawing_id', null).order('created_at', { ascending: true });
        if (data) state.drawStrokes = data;
        drawLoaded = true;
    } catch(e) { console.error("Error draw:", e); }
}

let dailyLoaded = false;
async function ensureDailyQuizData() {
    if (dailyLoaded) return;
    try {
        const [{ data: qData }, { data: aData }] = await Promise.all([
            supabase.from('daily_questions').select('*'),
            supabase.from('daily_answers').select('*')
        ]);
        if (qData && qData.length > 0) {
            const today = new Date();
            const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const index = dateSeed % qData.length;
            state.dailyQuestion = qData[index];
        }
        if (aData) {
            state.dailyAnswers = aData.filter(a => a.question_id === state.dailyQuestion?.id);
        }
        dailyLoaded = true;
    } catch(e) { console.error("Error daily quiz:", e); }
}

// --- UTILITY: Reset all lazy loaders (e.g. on logout or forced re-init) ---
export function resetLazyLoaders() {
    timelineLoaded = false;
    mapDataLoaded = false;
    achievementsLoaded = false;
    topicsLoaded = false;
    gamesLoaded = false;
    drawLoaded = false;
    dailyLoaded = false;
    libraryLoaded = false;
    bucketListLoaded = false;
    Object.keys(_loadedAt).forEach(k => delete _loadedAt[k]);
    console.log('[State] All lazy loaders reset.');
}

export {
    state,
    saveStateToCache,
    initializeState,
    ensureLibraryData,
    ensureBucketListData,
    ensureTimelineData,
    ensureMapData,
    ensureAchievementsData,
    ensureTopicsData,
    ensureGamesData,
    ensureDrawStrokesData,
    ensureDailyQuizData
};
