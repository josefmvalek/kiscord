import { supabase } from './supabase.js';
import { state } from './state.js';

/**
 * MaturitaHub 2026 - Real-time Presence & Sync
 */

export function initPresence() {
    if (!state.currentUser) return;

    const channel = supabase.channel('study-room', {
        config: {
            presence: {
                key: state.currentUser.id,
            },
        },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            console.log('Presence Sync', newState);
            updatePresenceUI(newState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('User left', key, leftPresences);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: state.currentUser.id,
                    display_name: state.currentUser.email.split('@')[0],
                    status: 'available',
                    online_at: new Date().toISOString(),
                });
            }
        });
}

function updatePresenceUI(presenceState) {
    // Dispatch event for UI modules to pick up
    const event = new CustomEvent('presence-updated', { detail: presenceState });
    window.dispatchEvent(event);
}

export async function broadcastActivity(activityType, topicTitle) {
    if (!state.currentUser) return;
    
    // Log to DB for history
    const { error } = await supabase.from('study_activity').insert({
        user_id: state.currentUser.id,
        activity_type: activityType,
        description: `Studuje téma: ${topicTitle}`
    });
    
    if (error) console.error("Activity Broadcast Error:", error);
}
