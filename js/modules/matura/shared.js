import { state } from '../../core/state.js';
import { supabase } from '../../core/supabase.js';

export const pomodoroState = {
    timeLeft: 25 * 60,
    status: 'idle', // idle, running, break
    interval: null,
    totalSessions: 0
};

export function triggerHaptic(type) {
    if (window.triggerHaptic) window.triggerHaptic(type);
}

export function showNotification(msg, type) {
    if (window.showNotification) window.showNotification(msg, type);
}

export function triggerConfetti() {
    if (window.triggerConfetti) window.triggerConfetti();
}

/**
 * Real-time sync for Pomodoro & Schedule
 */
export function broadcastPomodoroUpdate(payload) {
    if (window.chan) {
        window.chan.send({
            type: 'broadcast',
            event: 'pomodoro-sync',
            payload: {
                ...payload,
                sender: state.currentUser?.name,
                timestamp: Date.now()
            }
        });
    }
}

export function getCategoryIcon(catId) {
    switch (catId) {
        case 'czech': return '🇨🇿';
        case 'it': return '💻';
        case 'english': return '🇬🇧';
        case 'math': return '🔢';
        default: return '📚';
    }
}

export function updateTopicCardUI(itemId) {
    const card = document.querySelector(`[data-topic-id="${itemId}"]`);
    if (!card) return;

    // Minimal re-render of progress indicators on the card
    const prog = state.maturaProgress[itemId] || {};
    const me = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';
    const partner = state.currentUser?.name === 'Jožka' ? 'klarka' : 'jose';

    const myStatus = prog[me]?.status || 'none';
    const partnerStatus = prog[partner]?.status || 'none';

    // Update status indicators (dots)
    const myDot = card.querySelector('.my-status-dot');
    const partnerDot = card.querySelector('.partner-status-dot');

    const getStatusColor = (s) => {
        if (s === 'done') return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
        if (s === 'half') return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]';
        return 'bg-white/10';
    };

    if (myDot) myDot.className = `my-status-dot w-2 h-2 rounded-full transition-all ${getStatusColor(myStatus)}`;
    if (partnerDot) partnerDot.className = `partner-status-dot w-2 h-2 rounded-full transition-all ${getStatusColor(partnerStatus)}`;
    
    // Update progress text if exists
    const progText = card.querySelector('.topic-progress-text');
    if (progText) {
        const kb = state.maturaKBContent[itemId];
        const sections = kb?.sections_count || 0;
        const done = prog[me]?.done_sections?.length || 0;
        if (sections > 0) {
            progText.textContent = `${done}/${sections}`;
            progText.className = `topic-progress-text text-[10px] font-black ${done === sections ? 'text-green-400' : 'text-gray-500'}`;
        }
    }
}
