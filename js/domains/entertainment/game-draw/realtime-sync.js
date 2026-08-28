import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { showNotification } from '@core/theme.js';
import { triggerHaptic } from '@core/utils.js';
import { playBeep, playChime } from '@core/sound.js';
import { drawState } from './state.js';

let broadcastChannel = null;

export function setupRealtime() {
    if (broadcastChannel) return;

    broadcastChannel = supabase.channel('room:draw-duel', {
        config: {
            broadcast: { self: false },
        },
    });

    broadcastChannel
        .on('broadcast', { event: 'stroke' }, ({ payload }) => {
            handleRemoteStroke(payload);
        })
        .on('broadcast', { event: 'clear' }, () => {
            handleRemoteClear();
        })
        .on('broadcast', { event: 'prompt' }, ({ payload }) => {
            handleRemotePrompt(payload);
        })
        .on('broadcast', { event: 'timer' }, ({ payload }) => {
            handleRemoteTimer(payload);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draw_strokes' }, payload => {
            if (!state.drawStrokes) state.drawStrokes = [];
            if (!state.drawStrokes.find(s => s.id === payload.new.id)) {
                state.drawStrokes.push(payload.new);
            }
        })
        .subscribe((status) => {
            updateStatusIndicator(status);
        });
}

function updateStatusIndicator(status) {
    const statusEl = document.getElementById('draw-status');
    if (!statusEl) return;

    if (status === 'SUBSCRIBED') {
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1.5"></span> Spojeno v reálném čase';
        statusEl.className = 'px-3 py-1 bg-[#2f3136]/90 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center';
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400 inline-block mr-1.5"></span> Offline mód';
        statusEl.className = 'px-3 py-1 bg-[#2f3136]/90 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center';
    } else {
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block mr-1.5"></span> Připojování...';
        statusEl.className = 'px-3 py-1 bg-[#2f3136]/90 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center';
    }
}

export function broadcastStroke(type, data) {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'stroke',
        payload: { type, ...data, userId: state.currentUser?.id }
    });
}

export function broadcastClear() {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'clear',
        payload: { userId: state.currentUser?.id }
    });
}

export function broadcastPrompt(text) {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'prompt',
        payload: { text, userId: state.currentUser?.id }
    });
}

export function broadcastTimer(seconds) {
    if (!broadcastChannel) return;
    broadcastChannel.send({
        type: 'broadcast',
        event: 'timer',
        payload: { seconds, userId: state.currentUser?.id }
    });
}

function handleRemoteStroke(p) {
    const { ctx, dpr } = drawState;
    if (!ctx || !p.userId) return;

    if (p.type === 'start') {
        drawState.userLastPositions[p.userId] = { x: p.x, y: p.y };
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.size || 5) / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    } else if (p.type === 'move') {
        const last = drawState.userLastPositions[p.userId];
        if (last) {
            ctx.save();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
        drawState.userLastPositions[p.userId] = { x: p.x, y: p.y };
    } else if (p.type === 'end') {
        delete drawState.userLastPositions[p.userId];
    }
}

function handleRemoteClear() {
    const { ctx, canvas } = drawState;
    if (ctx && canvas) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    state.drawStrokes = [];
    showNotification("Partner smazal plátno 🧹", "info");
    triggerHaptic('light');
}

function handleRemotePrompt(p) {
    const promptTextEl = document.getElementById('draw-prompt-text');
    if (promptTextEl) {
        promptTextEl.textContent = p.text;
        promptTextEl.classList.remove('animate-bounce');
        void promptTextEl.offsetWidth; // Trigger reflow
        promptTextEl.classList.add('animate-bounce');
    }
    drawState.currentPrompt = p.text;
    showNotification(`Partner vybral nové téma: "${p.text}" 💡`, "info");
    playChime();
}

function handleRemoteTimer(p) {
    showNotification(`Partner spustil bleskovou výzvu na ${p.seconds}s! ⏱️`, "warning");
    playBeep(880, 0.15);
    triggerHaptic('heavy');
    
    // Auto sync timer locally
    if (typeof window.startTimer === 'function') {
        window.startTimer(p.seconds, true); // remoteTrigger = true
    }
}

export function cleanupRealtime() {
    if (broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
        broadcastChannel = null;
    }
}
