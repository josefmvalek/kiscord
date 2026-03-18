import { supabase } from './supabase.js';

export const state = {
    tetris: { jose: 0, klarka: 0 }, // Synchronizováno ze Supabase
    currentChannel: "welcome",
    topicProgress: {}, // Synchronizováno ze Supabase
    schoolEvents: {}, // Synchronizováno ze Supabase
    calendarFilter: "all",
    isViewingBookmarks: false,
    currentTopicId: null,
    currentQuestionIndex: null,
    topicSessionHistory: [],
    pendingResetId: null,
    currentDownload: null,
    startDate: "2025-12-24", // ⚠️ ZMĚŇ NA VAŠE SKUTEČNÉ DATUM (YYYY-MM-DD)
    healthData: {}, // Synchronizováno ze Supabase
    dateFilter: "all",
    mapInstance: null,
    quizAnswers: {
        score: 0,
        completed: false,
    },
    watchlist: [], 
    route: [],
    ratings: {}, 
    dateRatings: {}, // <-- ADDED
    dateRoute: [],   // <-- ADDED
    watchHistory: {},
    plannedDates: {}, 
    currentUser: { name: 'Klárka', email: '' },
    // --- Statický obsah (nyní ze Supabase) ---
    factsLibrary: { octopus: [], owl: [], raccoon: [], fun: [] },
    library: { movies: [], series: [], games: [] },
    timelineEvents: [],
    timelineHighlights: {}, // <-- ADDED
    dateLocations: [],
    conversationTopics: [],
};

// Funkce pro počáteční načtení dat
export async function initializeState() {
    // Reset uživatelských dat před načtením (prevence duplikátů při přepínání účtů)
    state.healthData = {};
    state.plannedDates = {};
    state.schoolEvents = {};
    state.topicProgress = {};
    state.watchlist = [];
    state.ratings = {};
    state.watchHistory = {};
    state.dateRatings = {};
    state.quizAnswers = { score: 0, completed: false };
    
    // Reset statických dat (volitelné, ale bezpečnější pro čistý render)
    state.factsLibrary = { octopus: [], owl: [], raccoon: [], fun: [] };
    state.library = { movies: [], series: [], games: [] };
    state.timelineEvents = [];
    state.dateLocations = [];
    state.conversationTopics = [];

    try {
        // --- Health Data ---
        const { data: healthData, error: healthErr } = await supabase.from('health_data').select('*');
        if (!healthErr && healthData) {
            healthData.forEach(row => {
                // Only load if it belongs to current user
                if (row.user_id === state.currentUser.id) {
                    state.healthData[row.date_key] = {
                        water: row.water,
                        sleep: row.sleep,
                        mood: row.mood,
                        movement: row.movement
                    };
                }
            });
        }

        // --- Planned Dates ---
        const { data: plannedData, error: planErr } = await supabase.from('planned_dates').select('*');
        if (!planErr && plannedData) {
            plannedData.forEach(row => {
                state.plannedDates[row.date_key] = {
                    id: row.id,
                    name: row.name,
                    cat: row.cat,
                    time: row.time,
                    note: row.note
                };
            });
        }

        // --- School Events ---
        const { data: schoolData, error: schoolErr } = await supabase.from('school_events').select('*');
        if (!schoolErr && schoolData) {
            schoolData.forEach(row => {
                state.schoolEvents[row.date_key] = {
                    title: row.title,
                    type: row.type
                };
            });
        }

        // --- Tetris Scores ---
        const { data: tetrisData, error: tetrisErr } = await supabase.from('tetris_scores').select('*');
        if (!tetrisErr && tetrisData) {
            tetrisData.forEach(row => {
                // Map by known fixed UUIDs
                if (row.user_id === '00000000-0000-0000-0000-000000000001') {
                    state.tetris.jose = row.score || 0;
                } else if (row.user_id === '00000000-0000-0000-0000-000000000002') {
                    state.tetris.klarka = row.score || 0;
                }
            });
        }

        // --- Library Watchlist ---
        const { data: watchData, error: watchErr } = await supabase.from('library_watchlist').select('*');
        if (!watchErr && watchData) {
            state.watchlist = watchData.map(row => ({
                id: row.media_id,
                type: row.type
            }));
        }

        // --- Library Ratings ---
        const { data: ratingData, error: ratingErr } = await supabase.from('library_ratings').select('*');
        if (!ratingErr && ratingData) {
            ratingData.forEach(row => {
                state.ratings[row.media_id] = row.rating;
                if (row.status) state.watchHistory[row.media_id] = row.status;
            });
        }

        // --- app_facts ---
        const { data: factsData } = await supabase.from('app_facts').select('*');
        if (factsData) {
            factsData.forEach(f => {
                if (state.factsLibrary[f.category]) state.factsLibrary[f.category].push({ icon: f.icon, text: f.text });
            });
        }

        // --- library_content ---
        const { data: libData } = await supabase.from('library_content').select('*');
        if (libData) {
            libData.forEach(item => {
                const typeKey = item.type === 'movie' ? 'movies' : (item.type === 'series' ? 'series' : 'games');
                state.library[typeKey].push({
                    id: item.id,
                    title: item.title,
                    icon: item.icon,
                    cat: item.category,
                    magnet: item.magnet,
                    gdrive: item.gdrive
                });
            });
        }

        // --- timeline_events ---
        const { data: timelineData } = await supabase.from('timeline_events').select('*').order('event_date', { ascending: false, nullsFirst: false });
        if (timelineData) {
            state.timelineEvents = timelineData.map(e => ({
                id: e.id,
                title: e.title,
                event_date: e.event_date,
                icon: e.icon,
                color: e.color,
                description: e.description || "",
                images: e.images || [],
                location_id: e.location_id || null,
                icon: e.icon || "📸",
                user_highlights: e.user_highlights || "",
                is_milestone: e.is_milestone || false
            }));
        }

        // --- date_ratings ---
        const { data: ratingDateData } = await supabase.from('date_ratings').select('*');
        if (ratingDateData) {
            ratingDateData.forEach(row => {
                state.dateRatings[row.location_id] = row.rating;
            });
        }

        // --- date_locations ---
        const { data: locData } = await supabase.from('date_locations').select('*');
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

        // --- conversation_topics ---
        const { data: topicsData } = await supabase.from('conversation_topics').select('*');
        if (topicsData) {
            state.conversationTopics = topicsData.map(t => ({
                id: t.id,
                title: t.title,
                icon: t.icon,
                color: t.color,
                desc: t.description,
                questions: t.questions
            }));
        }

        // --- quiz_answers ---
        const { data: quizData } = await supabase.from('quiz_answers').select('*').eq('user_id', state.currentUser.id).maybeSingle();
        if (quizData) {
            state.quizAnswers = {
                score: quizData.score || 0,
                completed: quizData.completed || false
            };
        }

    } catch (err) {
        console.error("Supabase load error:", err);
    }
}
