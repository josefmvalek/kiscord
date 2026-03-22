import { supabase } from './supabase.js';
import { isJosef } from './auth.js';

export const state = {
    tetris: { jose: 0, klarka: 0 },
    currentChannel: "welcome",
    topicProgress: {},
    schoolEvents: {},
    calendarFilter: "all",
    isViewingBookmarks: false,
    currentTopicId: null,
    currentQuestionIndex: null,
    topicSessionHistory: [],
    funFactProgress: {}, // { raccoon: { index: 0, completed: false } }
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
    loadError: false // Track if initial load failed
};

export async function initializeState() {
    // Reset před načtením (zabrání duplikátům při přepínání účtů)
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
    state.loadError = false; // Reset error state on each init

    try {
        // OPRAVA #2: Paralelní dotazy místo 10 sekvenčních await
        // Snižuje dobu načítání z ~10×RTT na ~1×RTT
        const [
            { data: healthData },
            { data: plannedData },
            { data: schoolData },
            { data: tetrisData },
            { data: watchData },
            { data: ratingData },
            { data: factsData },
            { data: libData },
            { data: timelineData },
            { data: ratingDateData },
            { data: locData },
            { data: topicsData },
            { data: achievementData },
            { data: questionData },
            { data: answerData },
            { data: gQuestionData },
            { data: gPromptData },
            { data: gVoteData },
            { data: strokeData },
            { data: funFactProgressData },
            { data: questData },
            { data: achCatData },
            { data: achDefData },
            { data: favData }
        ] = await Promise.all([
            supabase.from('health_data').select('*'),
            supabase.from('planned_dates').select('*'),
            supabase.from('school_events').select('*'),
            supabase.from('tetris_scores').select('*'),
            supabase.from('library_watchlist').select('*'),
            supabase.from('library_ratings').select('*'),
            supabase.from('app_facts').select('*'),
            supabase.from('library_content').select('*'),
            supabase.from('timeline_events').select('*').order('event_date', { ascending: false, nullsFirst: false }),
            supabase.from('date_ratings').select('*'),
            supabase.from('date_locations').select('*'),
            supabase.from('conversation_topics').select('*'),
            supabase.from('achievements').select('*'),
            supabase.from('daily_questions').select('*'),
            supabase.from('daily_answers').select('*'),
            supabase.from('game_questions').select('*'),
            supabase.from('game_prompts').select('*'),
            supabase.from('game_votes').select('*'),
            supabase.from('draw_strokes').select('*').order('created_at', { ascending: true }),
            supabase.from('fun_fact_progress').select('*'),
            supabase.from('coop_quests').select('*').eq('is_active', true),
            supabase.from('achievement_categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('achievement_definitions').select('*'),
            supabase.from('app_fact_favorites').select('fact_id')
        ]);

        if (gQuestionData) state.gameQuestions = gQuestionData;
        if (gVoteData) state.gameVotes = gVoteData;
        const [,, pinnedData] = await Promise.all([null, null, supabase.from('pinned_drawings').select('*, drawings(*)').maybeSingle()]); // Clean way
        if (pinnedData?.data) state.pinnedDrawing = pinnedData.data.drawings;
        if (strokeData) state.drawStrokes = strokeData;

        // OPRAVA #1: Health Data – odstraněn zbytečný JS user_id filtr
        // RLS politika (auth.uid() = user_id) filtrování zajišťuje sama.
        // Původní filtr selhal, protože state.currentUser.id není ještě nastaveno.
        if (healthData) {
            healthData.forEach(row => {
                state.healthData[row.date_key] = {
                    water: row.water,
                    sleep: row.sleep,
                    mood: row.mood,
                    movement: row.movement
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
                    note: row.note
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

        // Always ensure at least the current user's ID is in the correct slot
        const isMeJose = isJosef(state.currentUser);
        if (state.currentUser?.id) {
            if (isMeJose) {
                state.tetris.jose_id = state.currentUser.id;
            } else {
                state.tetris.klarka_id = state.currentUser.id;
            }
        }

        if (tetrisData) {
            tetrisData.forEach(row => {
                if (row.user_id === state.currentUser?.id) {
                    if (isMeJose) {
                        state.tetris.jose = row.score || 0;
                    } else {
                        state.tetris.klarka = row.score || 0;
                    }
                } else {
                    // Partner's score and ID discovery
                    if (isMeJose) {
                        state.tetris.klarka = row.score || 0;
                        state.tetris.klarka_id = row.user_id;
                    } else {
                        state.tetris.jose = row.score || 0;
                        state.tetris.jose_id = row.user_id;
                    }
                }
            });
        }

        if (watchData) {
            state.watchlist = watchData.map(row => ({
                id: parseInt(row.media_id),
                type: row.type,
                user_id: row.added_by
            }));
        }

        if (ratingData) {
            ratingData.forEach(row => {
                const mid = parseInt(row.media_id);
                // Standardize: 'watched' in DB -> 'seen' for UI
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
                    // Remove existing entry for this media if any (prevents duplicates)
                    state.movieHistory[row.seen_date] = state.movieHistory[row.seen_date].filter(m => m.media_id !== mid);
                    state.movieHistory[row.seen_date].push({
                        media_id: mid,
                        rating: row.rating || 0,
                        status: status,
                        reaction: row.reaction || ""
                    });
                }
            });
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

        // OPRAVA #5: Odstraněn duplicitní klíč `icon` který přepisoval správnou hodnotu z DB
        if (timelineData) {
            state.timelineEvents = timelineData.map(e => ({
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

        if (ratingDateData) {
            ratingDateData.forEach(row => {
                state.dateRatings[row.location_id] = row.rating;
            });
        }

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

        if (gQuestionData) state.gameQuestions = gQuestionData;
        if (gPromptData) state.gamePrompts = gPromptData;
        if (gVoteData) state.gameVotes = gVoteData;

        if (achievementData) {
            state.achievements = achievementData;
        }

        if (achCatData) {
            state.achievementCategories = achCatData;
        }

        if (achDefData) {
            state.achievementDefinitions = achDefData;
        }

        if (questData) {
            state.coopQuests = questData;
        }

        // --- Logika pro Daily Question ---
        if (questionData && questionData.length > 0) {
            // Výběr otázky podle dne (staticky pro všechny stejný)
            const today = new Date();
            const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const index = dateSeed % questionData.length;
            state.dailyQuestion = questionData[index];
        }

        if (answerData) {
            // Načteme pouze odpovědi pro dnešní otázku
            state.dailyAnswers = answerData.filter(a => a.question_id === state.dailyQuestion?.id);
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
        state.loadError = true;
    }
}
