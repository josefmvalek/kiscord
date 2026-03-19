import { supabase } from './supabase.js';

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
    pendingResetId: null,
    currentDownload: null,
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
    currentUser: { name: 'Klárka', email: '' },
    factsLibrary: { octopus: [], owl: [], raccoon: [], fun: [] },
    library: { movies: [], series: [], games: [] },
    timelineEvents: [],
    timelineHighlights: {},
    dateLocations: [],
    conversationTopics: [],
    achievements: [],
    dailyQuestion: null,
    dailyAnswers: [],
    gameQuestions: [],
    gameVotes: [],
    drawStrokes: [],
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
    state.dateRatings = {};
    state.quizAnswers = { score: 0, completed: false };
    state.factsLibrary = { octopus: [], owl: [], raccoon: [], fun: [] };
    state.library = { movies: [], series: [], games: [] };
    state.timelineEvents = [];
    state.dateLocations = [];
    state.conversationTopics = [];
    state.achievements = [];
    state.dailyQuestion = null;
    state.dailyAnswers = [];

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
            { data: gVoteData },
            { data: strokeData },
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
            supabase.from('game_votes').select('*'),
            supabase.from('draw_strokes').select('*').order('created_at', { ascending: true }),
        ]);

        if (gQuestionData) state.gameQuestions = gQuestionData;
        if (gVoteData) state.gameVotes = gVoteData;
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

        if (tetrisData) {
            tetrisData.forEach(row => {
                if (row.user_id === '00000000-0000-0000-0000-000000000001') {
                    state.tetris.jose = row.score || 0;
                } else if (row.user_id === '00000000-0000-0000-0000-000000000002') {
                    state.tetris.klarka = row.score || 0;
                }
            });
        }

        if (watchData) {
            state.watchlist = watchData.map(row => ({
                id: row.media_id,
                type: row.type
            }));
        }

        if (ratingData) {
            ratingData.forEach(row => {
                state.ratings[row.media_id] = row.rating;
                if (row.status) state.watchHistory[row.media_id] = row.status;
            });
        }

        if (factsData) {
            factsData.forEach(f => {
                if (state.factsLibrary[f.category]) {
                    state.factsLibrary[f.category].push({ icon: f.icon, text: f.text });
                }
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

        if (achievementData) {
            state.achievements = achievementData;
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
    }
}
