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
            const oldMood = state.partnerHealthData?.mood;
            state.partnerHealthData = row;

            // --- MOOD SUPPORT NOTIFICATION ---
            if (row.mood > 0 && row.mood <= 3 && row.mood !== oldMood) {
                const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
                const msg = `${partnerName} se dneska necítí úplně nejlíp... 🥺 Pošli mu/jí sluníčko!`;
                
                import('./notifications.js').then(m => {
                    m.handlePartnerAction('mood', msg);
                });
            }

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
        // A6. Handle Broadcasts (Plan Updates)
        .on('broadcast', { event: 'plan-update' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            
            // Check if user has planning notifications enabled
            const config = state.settings.notifications?.partner?.planning;
            if (config && !config.enabled) return;

            const { type, name, status } = payload.payload;
            let msg = "";
            
            if (type === 'proposal') {
                msg = `Nová pozvánka: ${name}! ❤️`;
            } else if (type === 'response') {
                msg = status === 'confirmed' ? "Plán byl potvrzen! 🥂" : "Plán byl zrušen. 🥀";
            }
            
            if (msg && typeof window.showNotification === 'function') {
                window.showNotification(msg, "info");
                if (config?.haptic && typeof triggerHaptic === 'function') triggerHaptic('medium');
            }
        })
        // A7. Handle Broadcasts (Sleep Status)
        .on('broadcast', { event: 'sleep-status' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            
            if (payload.payload.isSleeping) {
                const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
                const msg = `${partnerName} právě zalehl/a do postýlky. Sladké sny! 🌙💤`;
                
                import('./notifications.js').then(m => {
                    m.handlePartnerAction('sleep', msg);
                });
            }
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
                         note: row.note,
                         status: row.status || 'idea',
                         proposed_by: row.proposed_by,
                         rejection_reason: row.rejection_reason || '',
                         backup_plan: row.backup_plan || '',
                         checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : (row.checklist || [])
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
        // I. Handle Database Changes (Love Letters)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'love_letters'
        }, (payload) => {
             if (payload.new && payload.new.sender_id !== state.currentUser?.id) {
                 window.dispatchEvent(new CustomEvent('letter-received', { detail: payload.new }));
             }
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
 * Broadcasts a sleep status update (started/stopped) to the partner.
 */
export async function broadcastSleepStatus(isSleeping) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'sleep-status',
        payload: { from: state.currentUser?.id, isSleeping }
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
 * Broadcasts a planning update (new plan, confirm, reject) to the partner for instant toast notifications.
 */
export async function broadcastPlanUpdate(payload) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'plan-update',
        payload: { ...payload, from: state.currentUser?.id }
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
