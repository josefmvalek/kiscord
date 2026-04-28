import { supabase } from './supabase.js';

const STATE_CACHE_KEY = 'maturita_hub_state_cache';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const state = {
    currentChannel: "dashboard",
    currentUser: null,
    userProfile: null,
    users: {}, // { user_id: { display_name, avatar_url, last_active, current_status } }
    
    // Matura Specific
    maturaTopics: {}, // { category_id: [topics] }
    maturaProgress: {}, // { topic_id: { status, notes } }
    maturaStreaks: {}, // { user_id: streak }
    maturaSchedule: [],
    maturaPomodoro: { status: 'stopped', timeLeft: 0, startedAt: null },
    
    _loaded: {
        topics: false,
        profiles: false,
        pomodoro: false
    }
};

// Load initial state from cache if available
try {
    const cachedTopics = localStorage.getItem(STATE_CACHE_KEY + '_topics');
    const cachedProfiles = localStorage.getItem(STATE_CACHE_KEY + '_profiles');
    
    if (cachedTopics) {
        state.maturaTopics = JSON.parse(cachedTopics);
        state._loaded.topics = true;
    }
    
    if (cachedProfiles) {
        state.users = JSON.parse(cachedProfiles);
        state._loaded.profiles = true;
    }
} catch (e) {
    console.warn("Failed to load state from cache:", e);
}

const _listeners = {};
const stateEvents = {
    on(event, callback) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(callback);
        return () => {
            _listeners[event] = _listeners[event].filter(cb => cb !== callback);
        };
    },
    emit(event, data) {
        (_listeners[event] || []).forEach(cb => {
            try { cb(data); } catch (e) { console.error(`[stateEvents] Error in '${event}' listener:`, e); }
        });
    }
};

async function ensureMaturaData(force = false) {
    if (state._loaded.topics && !force) return;
    if (force) state._loaded.topics = false;
    
    try {
        const [{data: topics}, {data: progress}] = await Promise.all([
            supabase.from('matura_topics').select('*').order('title'),
            supabase.from('matura_topic_progress').select('*').eq('user_id', state.currentUser?.id)
        ]);
        
        if (topics) {
            state.maturaTopics = topics.reduce((acc, t) => {
                if (!acc[t.category]) acc[t.category] = [];
                acc[t.category].push(t);
                return acc;
            }, {});
            try {
                localStorage.setItem(STATE_CACHE_KEY + '_topics', JSON.stringify(state.maturaTopics));
            } catch(e) {}
        }
        
        if (progress) {
            progress.forEach(row => {
                state.maturaProgress[row.topic_id] = { status: row.status, notes: row.notes || '' };
            });
        }
        
        state._loaded.topics = true;
        stateEvents.emit('matura-data-loaded');
    } catch (e) { console.error("Matura Load Error:", e); }
}

async function ensureProfilesData() {
    try {
        const { data } = await supabase.from('profiles').select('*');
        if (data) {
            data.forEach(p => { state.users[p.id] = p; });
            try {
                localStorage.setItem(STATE_CACHE_KEY + '_profiles', JSON.stringify(state.users));
            } catch(e) {}
            state._loaded.profiles = true;
            stateEvents.emit('profiles-loaded');
        }
    } catch (e) { console.error("Profiles Load Error:", e); }
}

export {
    state,
    stateEvents,
    ensureMaturaData,
    ensureProfilesData
};
