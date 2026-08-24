import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';

export function setupRealtime() {
    if (broadcastChannel) return;

    // Use a unique name for the channel
    broadcastChannel = supabase.channel('room:draw-duel', {
        config: {
            broadcast: { self: false },
        },
    });

    broadcastChannel
        .on('broadcast', { event: 'stroke' }, ({ payload }) => {
            handleRemoteStroke(payload);
        })
        .on('broadcast', { event: 'clear' }, async () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            state.drawStrokes = []; // Clear local state too
            showNotification("Partner smazal plátno.", "info");
        })
        .on('broadcast', { event: 'prompt' }, ({ payload }) => {
            const el = document.getElementById('draw-prompt-text');
            if (el) el.textContent = payload.text;
            showNotification(`Nové téma: ${payload.text}`, "info");
        })
        .on('broadcast', { event: 'timer' }, ({ payload }) => {
            showNotification(`Partner spustil výzvu na ${payload.seconds} sekund! ⏱️`, "warning");
            // We don't strictly sync the timer display to avoid lag issues, but we notify.
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draw_strokes' }, payload => {
            // This is for background updates when BOTH are on the page
            if (!state.drawStrokes.find(s => s.id === payload.new.id)) {
                state.drawStrokes.push(payload.new);
                // We don't redraw everything here to avoid flicker, the Broadcast handles the live stroke
            }
        })
        .subscribe((status) => {
            const statusEl = document.getElementById('draw-status');
            if (statusEl) {
                statusEl.textContent = status === 'SUBSCRIBED' ? '🟢 Online - Realtime Synced' : '🔴 Offline - Sync Error';
            }
        });
}

function broadcastStroke(type, data) {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'stroke',
        payload: { type, ...data, userId: state.currentUser?.id }
    });
}

function broadcastClear() {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'clear',
        payload: { userId: state.currentUser?.id }
    });
}

function broadcastPrompt(text) {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'prompt',
        payload: { text, userId: state.currentUser?.id }
    });
}

function broadcastTimer(seconds) {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'timer',
        payload: { seconds, userId: state.currentUser?.id }
    });
}

function handleRemoteStroke(p) {
    if (!ctx || !p.userId) return;

    if (p.type === 'start') {
        userLastPositions[p.userId] = { x: p.x, y: p.y };
    } else if (p.type === 'move') {
        const last = userLastPositions[p.userId];
        if (last) {
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.closePath();
        }
        userLastPositions[p.userId] = { x: p.x, y: p.y };
    } else if (p.type === 'end') {
        delete userLastPositions[p.userId];
    }
}


export function cleanupRealtime() {
    if (broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
        broadcastChannel = null;
    }
}

