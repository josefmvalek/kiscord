import { supabase } from './supabase.js';
import { state } from './state.js';
import { getTodayKey } from './utils.js';

let mainChannel = null;

/**
 * Initializes all real-time subscriptions for the application.
 * This is called once after the user is signed in.
 */
export function setupRealtimeSync() {
    if (mainChannel) return;

    const todayKey = getTodayKey();

    // 1. Create a single channel for all broadcast and database changes
    mainChannel = supabase.channel('kiscord-sync-system')
        // A. Handle Broadcasts (e.g., Sunlight)
        .on('broadcast', { event: 'send-sunlight' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            
            // Dispatch global event for UI effects
            window.dispatchEvent(new CustomEvent('sunlight-received', { 
                detail: { from: payload.payload.from } 
            }));
        })
        // A2. Handle Broadcasts (Health Sync - Bypasses RLS issues)
        .on('broadcast', { event: 'health-update' }, (payload) => {
            const row = payload.payload.data;
            if (!row || row.date_key !== todayKey) return;
            if (payload.payload.from === state.currentUser?.id) return;

            // Update partner state (DO NOT update state.healthData - that is for the local user)
            state.partnerHealthData = row;

            // Notify UI modules
            window.dispatchEvent(new CustomEvent('health-updated', { 
                detail: { source: 'realtime', data: row } 
            }));
        })
        // A3. Handle Broadcasts (Game Vote Cast - Instant feedback)
        .on('broadcast', { event: 'game-vote-cast' }, (payload) => {
            if (payload.payload.user_id === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('game-vote-updated', { detail: { payload: payload.payload } }));
        })
        // A4. Handle Broadcasts (Matura SOS)
        .on('broadcast', { event: 'matura-sos' }, (payload) => {
            if (payload.payload.user_id === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('matura-sos-received', { detail: payload.payload }));
        })
        // A5. Handle Broadcasts (Pomodoro Update)
        .on('broadcast', { event: 'pomodoro-update' }, (payload) => {
            if (payload.payload.user_id === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('pomodoro-updated', { detail: payload.payload }));
        })
        // B. Handle Database Changes (Health Data)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'health_data' 
        }, (payload) => {
            const row = payload.new || payload.old;
            if (!row || row.date_key !== todayKey) return;

            // Route update based on user_id
            if (row.user_id === state.currentUser?.id) {
                // Update local state (My data)
                    state.healthData[row.date_key] = {
                        water: row.water,
                        sleep: row.sleep || 0,
                        mood: row.mood,
                        movement: row.movement || [],
                        bedtime: row.bedtime
                    };
            } else {
                // Update partner state (Their data)
                state.partnerHealthData = row;
            }

            // Notify UI modules
            window.dispatchEvent(new CustomEvent('health-updated', { 
                detail: { source: 'realtime', data: row } 
            }));
        })
        // C. Handle Database Changes (Quests & Bucket List)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'coop_quests'
        }, () => {
             window.dispatchEvent(new CustomEvent('quests-updated'));
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bucket_list'
        }, () => {
             window.dispatchEvent(new CustomEvent('quests-updated'));
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'planned_dates'
        }, (payload) => {
             const row = payload.new || payload.old;
             if (row) {
                 if (payload.eventType === 'DELETE') {
                     delete state.plannedDates[row.date_key];
                 } else {
                     state.plannedDates[row.date_key] = {
                         id: row.id,
                         name: row.name,
                         cat: row.cat,
                         time: row.time,
                         note: row.note
                     };
                 }
             }
             window.dispatchEvent(new CustomEvent('planned-dates-updated', { detail: { payload } }));
        })
        // E. Handle Database Changes (Game Votes)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'game_votes'
        }, (payload) => {
             window.dispatchEvent(new CustomEvent('game-vote-updated', { 
                 detail: { source: 'database', payload: payload.new } 
             }));
        })
        // F. Handle Database Changes (Timeline)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'timeline_events'
        }, () => {
             // We don't update state directly to keep it simple, just notify UI to re-fetch
             window.dispatchEvent(new CustomEvent('timeline-updated'));
        })
        // G. Handle Database Changes (Library)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'library_content'
        }, () => {
             window.dispatchEvent(new CustomEvent('library-updated'));
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'library_ratings'
        }, () => {
             window.dispatchEvent(new CustomEvent('library-updated'));
        })
        // H. Handle Database Changes (Matura Pomodoro)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'matura_pomodoro'
        }, (payload) => {
             window.dispatchEvent(new CustomEvent('pomodoro-updated', { detail: { source: 'database', payload: payload.new || payload.old } }));
        })
        .subscribe((status) => {
            console.log(`[Sync] Realtime status: ${status}`);
        });
}

/**
 * Broadcasts a health update to the other user.
 * This is used to bypass RLS restrictions for Real-time events.
 */
export async function broadcastHealthUpdate(data) {
    if (!mainChannel) return;

    await mainChannel.send({
        type: 'broadcast',
        event: 'health-update',
        payload: { 
            from: state.currentUser?.id,
            data: data
        }
    });
}

/**
 * Sends a sunlight broadcast to the other user.
 */
export async function broadcastSunlight() {
    if (!mainChannel) return;
    
    await mainChannel.send({
        type: 'broadcast',
        event: 'send-sunlight',
        payload: { from: state.currentUser?.id }
    });
}

/**
 * Broadcasts a game vote cast to the other user for instant feedback.
 */
export async function broadcastGameVote(payload) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'game-vote-cast',
        payload: { ...payload, user_id: state.currentUser?.id }
    });
}

/**
 * Sends a Matura SOS signal to the other user.
 */
export async function broadcastMaturaSOS() {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'matura-sos',
        payload: { user_id: state.currentUser?.id, name: state.currentUser?.name }
    });
}

/**
 * Broadcasts a Pomodoro timer update.
 */
export async function broadcastPomodoroUpdate(payload) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'pomodoro-update',
        payload: { ...payload, user_id: state.currentUser?.id }
    });
}

/**
 * Cleans up subscriptions (e.g., on sign out).
 */
export function cleanupRealtimeSync() {
    if (mainChannel) {
        supabase.removeChannel(mainChannel);
        mainChannel = null;
    }
}
