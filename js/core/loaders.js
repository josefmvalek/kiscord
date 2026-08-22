import { supabase } from './supabase.js';
import { state, stateEvents } from './state.js';
import { isJosef, isKlarka } from './auth.js';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const _loadedAt = {};

export function isStale(key) {
    if (!_loadedAt[key]) return true;
    return Date.now() - _loadedAt[key] > STALE_THRESHOLD_MS;
}

export function markLoaded(key) {
    _loadedAt[key] = Date.now();
    state._loaded[key] = true;
}

export function getMonthsAgoDateString(months) {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().split('T')[0];
}

export function resetLazyLoaders() {
    Object.keys(state._loaded).forEach(k => { state._loaded[k] = false; });
    Object.keys(_loadedAt).forEach(k => delete _loadedAt[k]);
    console.log('[State] All lazy loaders reset.');
}

export async function ensureCalendarData(force = false) {
    if (state._loaded.calendar && !force && !isStale('calendar')) return;
    try {
        await Promise.all([
            ensureTimelineData(force),
            ensureLibraryData(force),
            ensureStudyData(force)
        ]);

        const sixMonthsAgo = getMonthsAgoDateString(6);
        const [health, dates, school] = await Promise.all([
            supabase.from('health_data').select('*').eq('user_id', state.currentUser?.id).gte('date_key', sixMonthsAgo),
            supabase.from('planned_dates').select('*').gte('date_key', sixMonthsAgo),
            supabase.from('school_events').select('*')
        ]);
        if (health.data) health.data.forEach(row => {
            state.healthData[row.date_key] = { water: row.water, sleep: row.sleep, mood: row.mood, movement: row.movement, bedtime: row.bedtime, pills: row.pills || false, supplements: row.supplements || { iron: false, zinc: false, magnesium: false } };
        });
        if (dates.data) dates.data.forEach(row => {
            state.plannedDates[row.date_key] = {
                id: row.id, name: row.name, cat: row.cat, time: row.time, note: row.note,
                status: row.status || 'idea', 
                proposed_by: row.proposed_by,
                rejection_reason: row.rejection_reason || '',
                backup_plan: row.backup_plan || '',
                checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : (row.checklist || [])
            };
        });
        if (school.data) school.data.forEach(row => { state.schoolEvents[row.date_key] = { title: row.title, type: row.type }; });
        markLoaded('calendar');
        stateEvents.emit('calendar');
    } catch (e) { console.error("Calendar Load Error:", e); }
}

export async function ensureLibraryData(force = false) {
    if (state._loaded.library && !force && !isStale('library')) return;
    try {
        const [libData, watchData, ratingData] = await Promise.all([
            supabase.from('library_content').select('*'),
            supabase.from('library_watchlist').select('*'),
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
                    trailer: item.trailer || "",
                    tmdb_id: item.tmdb_id,
                    poster_path: item.poster_path,
                    rating: item.rating,
                    runtime: item.runtime,
                    genres: item.genres,
                    release_year: item.release_year
                });
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

export async function ensureTimelineData(force = false) {
    if (state._loaded.timeline && !force && !isStale('timeline')) return;
    try {
        const [{ data: events }, { data: highlights }] = await Promise.all([
            supabase.from('timeline_events')
                .select('id, title, event_date, icon, color, description, images, location_id, user_highlights, is_milestone')
                .order('event_date', { ascending: false, nullsFirst: false }),
            supabase.from('timeline_highlights').select('*')
        ]);
        if (events) state.timelineEvents = events.map(e => ({ id: e.id, title: e.title, event_date: e.event_date, icon: e.icon || "📸", color: e.color, description: e.description || "", images: e.images || [], location_id: e.location_id || null, user_highlights: e.user_highlights || "", is_milestone: e.is_milestone || false }));
        if (highlights) highlights.forEach(h => { state.timelineHighlights[h.event_id] = h; });
        markLoaded('timeline');
        stateEvents.emit('timeline');
    } catch (e) { console.error("Timeline Load Error:", e); }
}

export async function ensureMaturaData(force = false) {
    if (state._loaded.matura && !force && !isStale('matura')) return;
    try {
        const [{ data: topics }, { data: progress }, { data: streaks }, { data: schedule }] = await Promise.all([
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

                const userKey = (state.user_ids.jose && row.user_id === state.user_ids.jose) ? 'jose' :
                    (state.user_ids.klarka && row.user_id === state.user_ids.klarka ? 'klarka' : null);

                if (userKey) {
                    state.maturaProgress[row.item_id][userKey] = {
                        status: row.status,
                        notes: row.notes || ''
                    };
                } else {
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
        markLoaded('matura');
        stateEvents.emit('matura');
    } catch (e) { console.error("Matura Load Error:", e); }
}

export async function refreshMaturaTopics() {
    return await ensureMaturaData(true);
}

export async function ensureBucketListData(force = false) {
    if (state._loaded.bucketlist && !force && !isStale('bucketlist')) return;
    try {
        const { data } = await supabase.from('bucket_list').select('*').order('created_at', { ascending: false });
        if (data) state.bucketList = data;
        markLoaded('bucketlist');
        stateEvents.emit('bucketlist');
    } catch (e) { console.error("BucketList Load Error:", e); }
}

export async function ensureMapData(force = false) {
    if (state._loaded.map && !force && !isStale('map')) return;
    try {
        const [{ data: ratingData }, { data: locData }] = await Promise.all([supabase.from('date_ratings').select('*'), supabase.from('date_locations').select('*')]);
        if (ratingData) ratingData.forEach(row => { state.dateRatings[row.location_id] = row.rating; });
        if (locData) state.dateLocations = locData.map(l => ({ id: l.id, name: l.name, cat: l.category, icon: l.icon || "📍", lat: l.lat, lng: l.lng, desc: l.description, image_url: l.image_url, country: l.country || 'CZ' }));
        markLoaded('map');
        stateEvents.emit('map');
    } catch (e) { console.error("Map Load Error:", e); }
}

export async function ensureAchievementsData(force = false) {
    if (state._loaded.achievements && !force && !isStale('achievements')) return;
    try {
        const [{ data: ach }, { data: cat }, { data: def }] = await Promise.all([supabase.from('achievements').select('*'), supabase.from('achievement_categories').select('*').order('sort_order', { ascending: true }), supabase.from('achievement_definitions').select('*')]);
        if (ach) state.achievements = ach;
        if (cat) state.achievementCategories = cat;
        if (def) {
            state.achievementDefinitions = def;
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
            if (!state.achievementDefinitions.some(a => a.id === 'gym_rat')) {
                state.achievementDefinitions.push({
                    id: 'gym_rat',
                    category: 'health',
                    title: 'Gym Rat 🦍🏋️‍♂️',
                    description: 'Odlogováno alespoň 10 poctivých tréninků v Kiscordu. Železo je tvůj nejlepší kamarád!',
                    icon: '🏋️‍♂️',
                    color: 'from-amber-500 to-red-600'
                });
            }
            if (!state.achievementDefinitions.some(a => a.id === 'pr_breaker')) {
                state.achievementDefinitions.push({
                    id: 'pr_breaker',
                    category: 'health',
                    title: 'PR Breaker 🏆',
                    description: 'Překonání tvého osobního rekordního maxima na libovolném cviku. Jdeš si za svým cílem!',
                    icon: '🏆',
                    color: 'from-yellow-400 to-orange-500'
                });
            }
            if (!state.achievementDefinitions.some(a => a.id === 'synchro_gym')) {
                state.achievementDefinitions.push({
                    id: 'synchro_gym',
                    category: 'love',
                    title: 'Synchro Šampioni 🤝🔥',
                    description: 'Vy i váš parťák jste odcvičili trénink ve stejný kalendářní den. Tomu se říká synergie!',
                    icon: '🤝',
                    color: 'from-emerald-400 to-teal-500'
                });
            }
        }
        markLoaded('achievements');
        stateEvents.emit('achievements');
    } catch (e) { console.error("Achievements Load Error:", e); }
}

export async function ensureFactsData(force = false) {
    if (state._loaded.facts && !force && !isStale('facts')) return;
    try {
        const [facts, favs] = await Promise.all([supabase.from('app_facts').select('*'), supabase.from('app_fact_favorites').select('fact_id')]);
        if (facts.data) {
            state.factsLibrary = { octopus: [], owl: [], raccoon: [], fun: [], penis: [] };
            facts.data.forEach(f => { if (!state.factsLibrary[f.category]) state.factsLibrary[f.category] = []; state.factsLibrary[f.category].push(f); });
        }
        if (favs.data) state.factFavorites = favs.data.map(f => f.fact_id);
        markLoaded('facts');
        stateEvents.emit('facts');
    } catch (e) { console.error("Facts Load Error:", e); }
}

export async function ensureTopicsData(force = false) {
    if (state._loaded.conv_topics && !force && !isStale('topics')) return;
    try {
        const { data } = await supabase.from('conversation_topics').select('*');
        if (data) state.conversationTopics = data.map(t => ({ id: t.id, title: t.title, icon: t.icon, color: t.color, desc: t.description, questions: t.questions }));
        markLoaded('conv_topics');
        stateEvents.emit('topics');
    } catch (e) { console.error("Topics Load Error:", e); }
}

export async function ensureRegeneraceData(force = false) {
    if (state._loaded.regenerace && !force && !isStale('regenerace')) return;
    try {
        const { data, error } = await supabase.from('app_knowledge').select('*').eq('key', 'regenerace_manual').maybeSingle();
        if (error) throw error;
        if (data && data.content) {
            state.regeneraceContent = data.content;
        }
        markLoaded('regenerace');
        stateEvents.emit('regenerace');
    } catch (e) {
        console.error("Regenerace Load Error:", e);
    }
}

export async function ensureGamesData(force = false) {
    if (state._loaded.games && !force && !isStale('games')) return;
    try {
        const [{ data: q }, { data: v }, { data: p }] = await Promise.all([supabase.from('game_questions').select('*'), supabase.from('game_votes').select('*'), supabase.from('game_prompts').select('*')]);
        if (q) state.gameQuestions = q;
        if (v) state.gameVotes = v;
        if (p) state.gamePrompts = p;
        markLoaded('games');
    } catch (e) { console.error("Games Load Error:", e); }
}

export async function ensureDrawStrokesData(force = false) {
    if (state._loaded.draw && !force && !isStale('draw')) return;
    try {
        const { data } = await supabase.from('draw_strokes').select('*').is('drawing_id', null).order('created_at', { ascending: true });
        if (data) state.drawStrokes = data;
        markLoaded('draw');
    } catch (e) { console.error("Draw Load Error:", e); }
}

export async function ensureDailyQuizData() {
    if (state._loaded.daily) return;
    try {
        await ensureTopicsData();

        let [{ data: qData }, { data: aData }] = await Promise.all([
            supabase.from('daily_questions').select('*'),
            supabase.from('daily_answers').select('*')
        ]);

        const allTopicQuestions = state.conversationTopics.flatMap(t =>
            (t.questions || []).map(q => ({ text: q, category: t.id }))
        );

        const existingTexts = new Set((qData || []).map(q => q.text));
        const missingQuestions = allTopicQuestions.filter(q => !existingTexts.has(q.text));

        if (missingQuestions.length > 0) {
            console.log(`[State] Syncing ${missingQuestions.length} new questions from Topics to Daily Questions pool...`);
            const { error: syncErr } = await supabase.from('daily_questions').insert(missingQuestions);
            if (!syncErr) {
                const { data: refreshedQ } = await supabase.from('daily_questions').select('*');
                if (refreshedQ) qData = refreshedQ;
            } else {
                console.error("[State] Sync Error:", syncErr);
            }
        }

        if (qData && qData.length > 0) {
            const today = new Date();
            const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

            qData.sort((a, b) => a.text.localeCompare(b.text));
            state.dailyQuestion = qData[dateSeed % qData.length];
        }

        if (aData && state.dailyQuestion) {
            state.dailyAnswers = aData.filter(a => a.question_id === state.dailyQuestion.id);
        }
        state._loaded.daily = true;
    } catch (e) {
        console.error("DailyQuiz Load Error:", e);
    }
}

export async function ensureDailyArchiveData(force = false) {
    if (state._loaded.dailyArchive && !force && !isStale('dailyArchive')) return;

    try {
        const [{ data: qData }, { data: aData }] = await Promise.all([
            supabase.from('daily_questions').select('*'),
            supabase.from('daily_answers').select('*').order('created_at', { ascending: false })
        ]);

        if (qData && aData) {
            const answerMap = aData.reduce((acc, a) => {
                if (!acc[a.question_id]) acc[a.question_id] = [];
                acc[a.question_id].push(a);
                return acc;
            }, {});

            state.dailyArchive = qData
                .map(q => ({
                    ...q,
                    answers: answerMap[q.id] || [],
                    lastAnswerAt: answerMap[q.id]?.[0]?.created_at || null
                }))
                .filter(q => q.answers.length > 0)
                .sort((a, b) => {
                    if (!a.lastAnswerAt) return 1;
                    if (!b.lastAnswerAt) return -1;
                    return new Date(b.lastAnswerAt) - new Date(a.lastAnswerAt);
                });

            markLoaded('dailyArchive');
            stateEvents.emit('dailyArchive');
        }
    } catch (e) {
        console.error("DailyArchive Load Error:", e);
    }
}

export async function ensureAssetsData(force = false) {
    if (state._loaded.assets && !force && !isStale('assets')) return;
    try {
        const { data, error } = await supabase.from('app_knowledge').select('*').eq('key', 'assets_manifest').maybeSingle();
        if (!error && data && data.content) {
            state.assets = data.content;
            console.log("[Assets] Manifest loaded from DB.");
        }
    } catch (e) {
        console.warn("[Assets] Load failed, using local fallbacks.", e);
    } finally {
        markLoaded('assets');
        stateEvents.emit('assets');
    }
}

export async function ensureShiftsData(force = false) {
    if (state._loaded.shifts && !force && !isStale('shifts')) return;
    try {
        const sixMonthsAgo = getMonthsAgoDateString(6);
        const { data, error } = await supabase.from('brigade_shifts').select('*').gte('date_key', sixMonthsAgo);
        if (error) {
            console.warn("Could not load shifts from DB, using cache or empty shifts", error);
        }
        
        if (!state.user_ids.jose || !state.user_ids.klarka) {
            const { data: pData } = await supabase.from('profiles').select('id, username, email');
            if (pData) {
                pData.forEach(p => {
                    const lowerName = (p.username || "").toLowerCase();
                    const lowerEmail = (p.email || "").toLowerCase();
                    if (lowerName.includes('josef') || lowerName.includes('jozk') || lowerEmail === 'jozkavalek@email.cz' || lowerEmail.includes('josef')) state.user_ids.jose = p.id;
                    if (lowerName.includes('klara') || lowerName.includes('vyslouzil') || lowerEmail === 'vyslouzilova.klara07@gmail.com' || lowerEmail.includes('klara')) state.user_ids.klarka = p.id;
                });
            }
        }

        if (data) {
            state.shifts = {};
            data.forEach(row => {
                if (!state.shifts[row.date_key]) {
                    state.shifts[row.date_key] = {};
                }
                const isJoseUser = row.user_id === state.user_ids.jose;
                const isKlarkaUser = row.user_id === state.user_ids.klarka;
                
                const shiftData = {
                    id: row.id,
                    shift_type: row.shift_type,
                    time_start: row.time_start || '',
                    time_end: row.time_end || '',
                    note: row.note || '',
                    user_id: row.user_id
                };

                if (isJoseUser) {
                    state.shifts[row.date_key].jose = shiftData;
                } else if (isKlarkaUser) {
                    state.shifts[row.date_key].klarka = shiftData;
                }
            });
        }
        markLoaded('shifts');
        stateEvents.emit('shifts');
    } catch (e) {
        console.error("Shifts Load Error:", e);
    }
}

export async function ensureFinancesData(force = false) {
    if (state._loaded.finances && !force && !isStale('finances')) return;
    try {
        const { data, error } = await supabase.from('brigade_finances').select('*').order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        state.brigadeFinances = data || [];
        markLoaded('finances');
        stateEvents.emit('finances');
    } catch (e) {
        console.error("Finances Load Error:", e);
    }
}

export async function ensureChallengesData(force = false) {
    if (state._loaded.challenges && !force && !isStale('challenges')) return;
    try {
        const { data, error } = await supabase.from('brigade_challenges').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        state.brigadeChallenges = data || [];
        markLoaded('challenges');
        stateEvents.emit('challenges');
    } catch (e) {
        console.error("Challenges Load Error:", e);
    }
}

export async function ensureDiaryData(force = false) {
    if (state._loaded.diary && !force && !isStale('diary')) return;
    try {
        const { data, error } = await supabase.from('brigade_diary').select('*').order('date_key', { ascending: false }).limit(60);
        if (error) throw error;
        state.brigadeDiary = data || [];
        markLoaded('diary');
        stateEvents.emit('diary');
    } catch (e) {
        console.error("Diary Load Error:", e);
    }
}

export async function ensureGymData(force = false) {
    if (state._loaded.gym && !force && !isStale('gym')) return;
    try {
        const [exercises, templates, logs, prs, measurements] = await Promise.all([
            supabase.from('gym_exercises').select('*').order('name'),
            supabase.from('gym_templates').select('*').order('created_at', { ascending: false }),
            supabase.from('gym_logs').select('*').order('logged_at', { ascending: false }).limit(100),
            supabase.from('gym_prs').select('*'),
            supabase.from('gym_body_measurements').select('*').order('date_key', { ascending: false })
        ]);
        if (exercises.data) state.gymExercises = exercises.data;
        if (templates.data) state.gymTemplates = templates.data;
        if (logs.data) state.gymLogs = logs.data;
        if (prs.data) state.gymPRs = prs.data;
        if (measurements.data) state.gymBodyMeasurements = measurements.data;
        markLoaded('gym');
        stateEvents.emit('gym');
    } catch (e) {
        console.error("Gym Load Error:", e);
    }
}

export async function ensureAllHealthData() {
    try {
        const sixMonthsAgo = getMonthsAgoDateString(6);
        const { data, error } = await supabase.from('health_data')
            .select('*')
            .eq('user_id', state.currentUser?.id)
            .gte('date_key', sixMonthsAgo)
            .order('date_key', { ascending: false });
        
        if (error) throw error;
        if (data) {
            data.forEach(row => {
                state.healthData[row.date_key] = {
                    water: row.water, sleep: row.sleep, mood: row.mood,
                    movement: row.movement, bedtime: row.bedtime, pills: row.pills || false, supplements: row.supplements || { iron: false, zinc: false, magnesium: false }
                };
            });
            console.log(`[State] Full health history loaded: ${data.length} records.`);
        }
    } catch (e) {
        console.error("Health History Load Error:", e);
    }
}

export async function ensureLoveShopData(force = false) {
    if (state._loaded.loveShop && !force && !isStale('loveShop')) return;
    try {
        console.log("[State] Loading Love Shop & Coins data...");
        const { data: pData, error: pError } = await supabase.from('profiles').select('id, username, email, love_coins');
        if (pError) throw pError;

        if (pData) {
            pData.forEach(p => {
                const lowerName = (p.username || "").toLowerCase();
                const lowerEmail = (p.email || "").toLowerCase();
                const coins = p.love_coins || 0;

                if (lowerName.includes('josef') || lowerName.includes('jozk') || lowerEmail === 'jozkavalek@email.cz' || lowerEmail.includes('josef')) {
                    state.user_ids.jose = p.id;
                    state.loveCoins.jose = coins;
                }
                if (lowerName.includes('klara') || lowerName.includes('vyslouzil') || lowerEmail === 'vyslouzilova.klara07@gmail.com' || lowerEmail.includes('klara')) {
                    state.user_ids.klarka = p.id;
                    state.loveCoins.klarka = coins;
                }
            });
        }

        const { data: sItems, error: sError } = await supabase.from('love_shop_items').select('*').order('cost');
        if (sError) throw sError;
        if (sItems) state.shopItems = sItems;

        if (state.currentUser?.id) {
            const { data: uCoupons, error: uError } = await supabase
                .from('user_coupons')
                .select('*, love_shop_items(*)')
                .eq('owner_id', state.currentUser.id)
                .order('is_redeemed', { ascending: true })
                .order('has_star', { ascending: false })
                .order('created_at', { ascending: false });

            if (uError) throw uError;
            if (uCoupons) state.inventory = uCoupons;
        }

        markLoaded('loveShop');
        stateEvents.emit('loveShop');
    } catch (e) {
        console.error("Love Shop Load Error:", e);
    }
}

export async function ensureStudyData(force = false) {
    if (state._loaded.study && !force && !isStale('study')) return;
    try {
        const [deadlines, subjects, scheduleItems] = await Promise.all([
            supabase.from('school_deadlines').select('*').order('deadline_date', { ascending: true }),
            supabase.from('school_subjects').select('*').order('code'),
            supabase.from('schedule_items').select('*').order('time_start', { ascending: true })
        ]);
        if (deadlines.data) state.schoolDeadlines = deadlines.data;
        if (subjects.data) state.schoolSubjects = subjects.data;
        if (scheduleItems.data) state.scheduleItems = scheduleItems.data;
        markLoaded('study');
        stateEvents.emit('study');
    } catch (e) {
        console.error("Study Data Load Error:", e);
    }
}

export async function ensureNutritionData(force = false) {
    if (state._loaded.nutrition && !force && !isStale('nutrition')) return;
    try {
        const threeMonthsAgo = getMonthsAgoDateString(3);
        const [logsRes, foodsRes, targetsRes] = await Promise.all([
            supabase.from('nutrition_logs').select('*').gte('date_key', threeMonthsAgo).order('created_at', { ascending: true }),
            supabase.from('nutrition_saved_foods').select('*').order('name'),
            supabase.from('nutrition_targets').select('*')
        ]);

        if (logsRes.data) {
            const grouped = {};
            logsRes.data.forEach(item => {
                if (!grouped[item.date_key]) grouped[item.date_key] = [];
                grouped[item.date_key].push(item);
            });
            state.nutritionLogs = grouped;
        }

        if (foodsRes.data) {
            state.savedFoods = foodsRes.data;
        }

        if (targetsRes.data && targetsRes.data.length > 0) {
            targetsRes.data.forEach(t => {
                const userKey = (t.user_id === state.user_ids?.jose || t.user_name === 'josef') ? 'josef' : 'klarka';
                if (!state.nutritionTargets) state.nutritionTargets = {};
                state.nutritionTargets[userKey] = {
                    calories: t.calories || state.nutritionTargets[userKey]?.calories || 2400,
                    protein: t.protein || state.nutritionTargets[userKey]?.protein || 150,
                    carbs: t.carbs || state.nutritionTargets[userKey]?.carbs || 280,
                    fats: t.fats || state.nutritionTargets[userKey]?.fats || 70,
                    fiber: t.fiber || state.nutritionTargets[userKey]?.fiber || 30
                };
            });
        }

        markLoaded('nutrition');
        stateEvents.emit('nutrition');
    } catch (e) {
        console.warn("Nutrition Data Load fallback / offline:", e);
    }
}


