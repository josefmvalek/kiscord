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
    loadError: false, // Track if initial load failed
    maturaProgress: {}, // { item_id: { jose: { status, notes }, klarka: { status, notes } } }
    maturaStreaks: { jose: 0, klarka: 0 },
    maturaSchedule: [],
    maturaAchievements: [],
    maturaTopics: {}, // { category_id: [topics] }
    maturaKBContent: {}, // { item_id: { content, updated_at } }
    
    // Lazy Load Flags
    _loaded: {
        calendar: false,
        timeline: false,
        library: false,
        topics: false,
        achievements: false,
        games: false,
        facts: false
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
    const hasCached = loadStateFromCache();

    if (!navigator.onLine && hasCached) {
        console.log("[OFFLINE] Using cached state.");
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
        // Essential Dashboard Data (minimal fetch)
        const [
            { data: todayHealth },
            { data: todayDates },
            { data: tetrisData },
            { data: questData },
            pinnedData
        ] = await Promise.all([
            supabase.from('health_data').select('*').eq('date_key', today).maybeSingle(),
            supabase.from('planned_dates').select('*').eq('date_key', today),
            supabase.from('tetris_scores').select('*'),
            supabase.from('coop_quests').select('*').eq('is_active', true),
            supabase.from('pinned_drawings').select('*, drawings(*)').maybeSingle()
        ]);

        if (pinnedData?.data) state.pinnedDrawing = pinnedData.data.drawings;

        if (todayHealth) {
            state.healthData[todayHealth.date_key] = {
                water: todayHealth.water, sleep: todayHealth.sleep, mood: todayHealth.mood,
                movement: todayHealth.movement, bedtime: todayHealth.bedtime
            };
        }

        if (todayDates) {
            todayDates.forEach(row => {
                state.plannedDates[row.date_key] = {
                    id: row.id, name: row.name, cat: row.cat, time: row.time, note: row.note,
                    status: row.status || 'idea', backup_plan: row.backup_plan || '',
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

        // 2. Fetch all profiles to map IDs to Jožka/Klárka (jose user_id, klarka user_id)
        if (!state.user_ids.jose || !state.user_ids.klarka) {
             console.log('[State] Fetching profiles...');
             try {
                 const { data: pData, error: pError } = await supabase.from('profiles').select('id, username, email').timeout(5000);
                 if (pError) throw pError;
                 if (pData) {
                     pData.forEach(p => {
                         const lowerName = (p.username || "").toLowerCase();
                         const lowerEmail = (p.email || "").toLowerCase();
                         
                         if (lowerName.includes('josef') || lowerName.includes('jozk') || lowerEmail === 'jozkavalek@email.cz' || lowerEmail.includes('josef')) {
                            state.user_ids.jose = p.id;
                         }
                         if (lowerName.includes('klara') || lowerName.includes('vyslouzil') || lowerEmail === 'vyslouzilova.klara07@gmail.com' || lowerEmail.includes('klara')) {
                            state.user_ids.klarka = p.id;
                         }
                     });
                     console.log('[State] Profiles mapped:', state.user_ids);
                 }
             } catch (err) {
                 console.warn('[State] Profile fetch failed or timed out:', err);
                 // Fallback to current user if possible
                 if (isMeJose) state.user_ids.jose = state.currentUser.id;
                 if (isMeKlarka) state.user_ids.klarka = state.currentUser.id;
             }
        }

        if (tetrisData) {
            tetrisData.forEach(row => {
                const isMe = row.user_id === state.currentUser?.id;
                if (isMe) {
                    if (isMeJose) { state.tetris.jose = row.score || 0; state.tetris.jose_id = row.user_id; state.user_ids.jose = row.user_id; }
                    else if (isMeKlarka) { state.tetris.klarka = row.score || 0; state.tetris.klarka_id = row.user_id; state.user_ids.klarka = row.user_id; }
                } else {
                    if (isMeJose) { state.tetris.klarka = row.score || 0; state.tetris.klarka_id = row.user_id; state.user_ids.klarka = row.user_id; }
                    else if (isMeKlarka) { state.tetris.jose = row.score || 0; state.tetris.jose_id = row.user_id; state.user_ids.jose = row.user_id; }
                }
            });
        }

        if (questData) state.coopQuests = questData;

        // Background load non-critical data
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => {
                ensureFactsData();
                ensureAchievementsData();
            });
        }

        state.loadError = false;
    } catch (e) {
        console.error("Critical Init Error:", e);
        state.loadError = true;
    }
    saveStateToCache();
}
// --- LAZY LOADING HELPERS ---

const _loadedAt = {};
function isStale(key) {
    if (!_loadedAt[key]) return true;
    return Date.now() - _loadedAt[key] > STALE_THRESHOLD_MS;
}
function markLoaded(key) {
    _loadedAt[key] = Date.now();
    state._loaded[key] = true;
}

async function ensureCalendarData(force = false) {
    if (state._loaded.calendar && !force && !isStale('calendar')) return;
    try {
        const [health, dates, school] = await Promise.all([
            supabase.from('health_data').select('*'),
            supabase.from('planned_dates').select('*'),
            supabase.from('school_events').select('*')
        ]);
        if (health.data) health.data.forEach(row => {
            state.healthData[row.date_key] = { water: row.water, sleep: row.sleep, mood: row.mood, movement: row.movement, bedtime: row.bedtime };
        });
        if (dates.data) dates.data.forEach(row => {
            state.plannedDates[row.date_key] = {
                id: row.id, name: row.name, cat: row.cat, time: row.time, note: row.note,
                status: row.status || 'idea', backup_plan: row.backup_plan || '',
                checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : (row.checklist || [])
            };
        });
        if (school.data) school.data.forEach(row => { state.schoolEvents[row.date_key] = { title: row.title, type: row.type }; });
        markLoaded('calendar');
        stateEvents.emit('calendar');
    } catch (e) { console.error("Calendar Load Error:", e); }
}

async function ensureLibraryData(force = false) {
    if (state._loaded.library && !force && !isStale('library')) return;
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
                state.library[typeKey].push({ id: item.id, title: item.title, icon: item.icon, cat: item.category, magnet: item.magnet, gdrive: item.gdrive, mood_tags: item.mood_tags || [], trailer: item.trailer || "" });
            });
        }
        if (watchData.data) state.watchlist = watchData.data.map(row => ({ id: parseInt(row.media_id), type: row.type, user_id: row.added_by }));
        if (ratingData.data) {
            state.ratings = {}; state.watchHistory = {}; state.movieHistory = {};
            ratingData.data.forEach(row => {
                const mid = parseInt(row.media_id);
                const status = row.status === 'watched' ? 'seen' : row.status;
                state.ratings[mid] = row.rating || 0;
                state.watchHistory[mid] = { rating: row.rating || 0, status: status, date: row.seen_date || "", reaction: row.reaction || "" };
                if (row.seen_date && status === 'seen') {
                    if (!state.movieHistory[row.seen_date]) state.movieHistory[row.seen_date] = [];
                    state.movieHistory[row.seen_date].push({ media_id: mid, rating: row.rating || 0, status: status, reaction: row.reaction || "" });
                }
            });
        }
        markLoaded('library');
        stateEvents.emit('library');
    } catch (err) { console.error("Library Load Error:", err); }
}

async function ensureTimelineData(force = false) {
    if (state._loaded.timeline && !force && !isStale('timeline')) return;
    try {
        const [{data: events}, {data: highlights}] = await Promise.all([
            supabase.from('timeline_events').select('*').order('event_date', { ascending: false, nullsFirst: false }),
            supabase.from('timeline_highlights').select('*')
        ]);
        if (events) state.timelineEvents = events.map(e => ({ id: e.id, title: e.title, event_date: e.event_date, icon: e.icon || "📸", color: e.color, description: e.description || "", images: e.images || [], location_id: e.location_id || null, user_highlights: e.user_highlights || "", is_milestone: e.is_milestone || false }));
        if (highlights) highlights.forEach(h => { state.timelineHighlights[h.event_id] = h; });
        markLoaded('timeline');
        stateEvents.emit('timeline');
    } catch (e) { console.error("Timeline Load Error:", e); }
}

async function ensureMaturaData(force = false) {
    if (state._loaded.topics && !force && !isStale('topics')) return;
    try {
        const [{data: topics}, {data: progress}, {data: streaks}, {data: schedule}] = await Promise.all([
            supabase.from('matura_topics').select('*').order('title'),
            supabase.from('matura_topic_progress').select('*'),
            supabase.from('matura_streaks').select('*'),
            supabase.from('matura_schedule').select('*').gte('scheduled_date', new Date().toISOString().split('T')[0])
        ]);
        if (topics) {
            state.maturaTopics = topics.reduce((acc, t) => {
                if (!acc[t.category_id]) acc[t.category_id] = [];
                acc[t.category_id].push(t);
                return acc;
            }, {});
        }
        if (progress) {
            progress.forEach(row => {
                if (!state.maturaProgress[row.item_id]) {
                    state.maturaProgress[row.item_id] = { 
                        jose: { status: 'none', notes: '' }, 
                        klarka: { status: 'none', notes: '' } 
                    };
                }
                
                // Map based on user_ids with double verification
                const userKey = (state.user_ids.jose && row.user_id === state.user_ids.jose) ? 'jose' : 
                                (state.user_ids.klarka && row.user_id === state.user_ids.klarka ? 'klarka' : null);
                
                if (userKey) {
                    state.maturaProgress[row.item_id][userKey] = { 
                        status: row.status, 
                        notes: row.notes || '' 
                    };
                } else {
                    // Fallback: If it's CURRENT USER but ID mapping failed for some reason, we can still identify it
                    if (state.currentUser?.id && row.user_id === state.currentUser.id) {
                        const meKey = isJosef(state.currentUser) ? 'jose' : (isKlarka(state.currentUser) ? 'klarka' : null);
                        if (meKey) {
                           state.maturaProgress[row.item_id][meKey] = { status: row.status, notes: row.notes || '' };
                        }
                    }
                }
            });
        }
        if (streaks) {
            streaks.forEach(s => { 
                const key = (s.user_id === state.user_ids.jose) ? 'jose' : 
                            (s.user_id === state.user_ids.klarka ? 'klarka' : null);
                if (key) state.maturaStreaks[key] = s.current_streak; 
            });
        }
        if (schedule) state.maturaSchedule = schedule;
        markLoaded('topics');
        stateEvents.emit('matura');
    } catch (e) { console.error("Matura Load Error:", e); }
}

async function ensureBucketListData(force = false) {
    if (state._loaded.bucketlist && !force && !isStale('bucketlist')) return;
    try {
        const { data } = await supabase.from('bucket_list').select('*').order('created_at', { ascending: false });
        if (data) state.bucketList = data;
        markLoaded('bucketlist');
        stateEvents.emit('bucketlist');
    } catch (e) { console.error("BucketList Load Error:", e); }
}

async function ensureMapData(force = false) {
    if (state._loaded.map && !force && !isStale('map')) return;
    try {
        const [{ data: ratingData }, { data: locData }] = await Promise.all([ supabase.from('date_ratings').select('*'), supabase.from('date_locations').select('*') ]);
        if (ratingData) ratingData.forEach(row => { state.dateRatings[row.location_id] = row.rating; });
        if (locData) state.dateLocations = locData.map(l => ({ id: l.id, name: l.name, cat: l.category, icon: l.icon || "📍", lat: l.lat, lng: l.lng, desc: l.description }));
        markLoaded('map');
        stateEvents.emit('map');
    } catch (e) { console.error("Map Load Error:", e); }
}

async function ensureAchievementsData(force = false) {
    if (state._loaded.achievements && !force && !isStale('achievements')) return;
    try {
        const [{ data: ach }, { data: cat }, { data: def }] = await Promise.all([ supabase.from('achievements').select('*'), supabase.from('achievement_categories').select('*').order('sort_order', { ascending: true }), supabase.from('achievement_definitions').select('*') ]);
        if (ach) state.achievements = ach;
        if (cat) state.achievementCategories = cat;
        if (def) {
            state.achievementDefinitions = def;
            // Inject Anniversary 100 Days Achievement
            if (!state.achievementDefinitions.some(a => a.id === 'anniversary_100')) {
                state.achievementDefinitions.push({
                    id: 'anniversary_100',
                    category: 'love',
                    title: '💯 Slipstream Specialist',
                    description: 'Aerodynamika po 100 dní testování prošla kontrolou a schválena. Díky, že se v tom mojem slipstreamu držíš 🌬️🍃',
                    icon: '💯',
                    color: 'from-blue-400 to-indigo-600'
                });
            }
        }
        markLoaded('achievements');
        stateEvents.emit('achievements');
    } catch (e) { console.error("Achievements Load Error:", e); }
}

async function ensureFactsData(force = false) {
    if (state._loaded.facts && !force && !isStale('facts')) return;
    try {
        const [facts, favs] = await Promise.all([ supabase.from('app_facts').select('*'), supabase.from('app_fact_favorites').select('fact_id') ]);
        if (facts.data) {
            state.factsLibrary = { octopus: [], owl: [], raccoon: [], fun: [], penis: [] }; // Reset to avoid dupes
            facts.data.forEach(f => { if (!state.factsLibrary[f.category]) state.factsLibrary[f.category] = []; state.factsLibrary[f.category].push(f); });
        }
        if (favs.data) state.factFavorites = favs.data.map(f => f.fact_id);
        markLoaded('facts');
        stateEvents.emit('facts');
    } catch (e) { console.error("Facts Load Error:", e); }
}

async function ensureTopicsData(force = false) {
    if (state._loaded.conv_topics && !force && !isStale('topics')) return;
    try {
        const { data } = await supabase.from('conversation_topics').select('*');
        if (data) state.conversationTopics = data.map(t => ({ id: t.id, title: t.title, icon: t.icon, color: t.color, desc: t.description, questions: t.questions }));
        markLoaded('conv_topics');
        stateEvents.emit('topics');
    } catch(e) { console.error("Topics Load Error:", e); }
}

async function ensureGamesData() {
    if (state._loaded.games) return;
    try {
        const [{ data: q }, { data: v }, { data: p }] = await Promise.all([ supabase.from('game_questions').select('*'), supabase.from('game_votes').select('*'), supabase.from('game_prompts').select('*') ]);
        if (q) state.gameQuestions = q;
        if (v) state.gameVotes = v;
        if (p) state.gamePrompts = p;
        state._loaded.games = true;
    } catch(e) { console.error("Games Load Error:", e); }
}

async function ensureDrawStrokesData() {
    if (state._loaded.draw) return;
    try {
        const { data } = await supabase.from('draw_strokes').select('*').is('drawing_id', null).order('created_at', { ascending: true });
        if (data) state.drawStrokes = data;
        state._loaded.draw = true;
    } catch(e) { console.error("Draw Load Error:", e); }
}

async function ensureDailyQuizData() {
    if (state._loaded.daily) return;
    try {
        const [{ data: qData }, { data: aData }] = await Promise.all([ supabase.from('daily_questions').select('*'), supabase.from('daily_answers').select('*') ]);
        if (qData && qData.length > 0) {
            const today = new Date();
            const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            state.dailyQuestion = qData[dateSeed % qData.length];
        }
        if (aData) state.dailyAnswers = aData.filter(a => a.question_id === state.dailyQuestion?.id);
        state._loaded.daily = true;
    } catch(e) { console.error("DailyQuiz Load Error:", e); }
}

function resetLazyLoaders() {
    state._loaded = { calendar: false, timeline: false, library: false, topics: false, achievements: false, games: false, facts: false, daily: false, draw: false, map: false, bucketlist: false, conv_topics: false };
    Object.keys(_loadedAt).forEach(k => delete _loadedAt[k]);
    console.log('[State] All lazy loaders reset.');
}

export {
    state,
    stateEvents,
    saveStateToCache,
    initializeState,
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
    resetLazyLoaders
};
