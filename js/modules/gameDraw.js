import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { showNotification } from '../core/theme.js';

let canvas, ctx;
let drawing = false;
let color = '#eb459e';
let size = 5;
let subscription = null;
let broadcastChannel = null;
let currentPath = []; // Track points for saving

const prompts = [
    "Nakresli naše první rande",
    "Nakresli naše vysněné bydlení",
    "Nakresli Jožku jako superhrdinu",
    "Nakresli Klárku jako princeznu",
    "Nakresli našeho budoucího pejska",
    "Nakresli tvoje nejoblíbenější jídlo",
    "Nakresli místo, kam chceme vyrazit",
    "Nakresli nás za 50 let",
    "Nakresli mývala (Jožkovo spirituální zvíře)",
    "Nakresli sovu (Klárčino spirituální zvíře)"
];

export function renderGameDraw() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full flex flex-col bg-[#202225] animate-fade-in relative">
            <!-- Toolbar -->
            <div class="p-4 bg-[#2f3136] border-b border-[#202225] flex flex-wrap items-center justify-between gap-4 z-20">
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                         <div class="w-8 h-8 rounded-lg bg-[#eb459e] flex items-center justify-center text-white"><i class="fas fa-palette"></i></div>
                         <h2 class="text-white font-bold hidden md:block">Draw Duel</h2>
                    </div>

                    <button onclick="window.newDrawPrompt()" class="ml-4 px-3 py-1 bg-[#18191c] hover:bg-[#eb459e]/20 text-[#eb459e] border border-[#eb459e]/30 rounded-full text-xs font-bold transition flex items-center gap-2">
                        <i class="fas fa-lightbulb"></i> <span id="draw-prompt-text">Co máme kreslit?</span>
                    </button>
                    
                    <div class="flex items-center gap-2 bg-[#18191c] p-1 rounded-lg">
                        <button onclick="window.setDrawColor('#eb459e')" class="w-8 h-8 rounded-md bg-[#eb459e] border-2 border-white/20 hover:scale-110 transition-transform"></button>
                        <button onclick="window.setDrawColor('#5865F2')" class="w-8 h-8 rounded-md bg-[#5865F2] border-2 border-white/20 hover:scale-110 transition-transform"></button>
                        <button onclick="window.setDrawColor('#3ba55c')" class="w-8 h-8 rounded-md bg-[#3ba55c] border-2 border-white/20 hover:scale-110 transition-transform"></button>
                        <button onclick="window.setDrawColor('#faa61a')" class="w-8 h-8 rounded-md bg-[#faa61a] border-2 border-white/20 hover:scale-110 transition-transform"></button>
                        <button onclick="window.setDrawColor('#ffffff')" class="w-8 h-8 rounded-md bg-[#ffffff] border-2 border-white/20 hover:scale-110 transition-transform"></button>
                        <button onclick="window.setDrawColor('#000000')" class="w-8 h-8 rounded-md bg-[#000000] border-2 border-white/20 hover:scale-110 transition-transform"></button>
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="range" min="1" max="20" value="5" onchange="window.setDrawSize(this.value)" class="w-24 accent-[#eb459e]">
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <button onclick="window.clearCanvas()" class="px-4 py-2 bg-[#ed4245] hover:bg-[#c03537] text-white rounded-lg font-bold text-sm transition flex items-center gap-2">
                        <i class="fas fa-trash-alt"></i> Smazat vše
                    </button>
                    <button onclick="window.saveCanvas()" class="px-4 py-2 bg-[#3ba55c] hover:bg-[#2d7d46] text-white rounded-lg font-bold text-sm transition flex items-center gap-2">
                        <i class="fas fa-save"></i> Uložit
                    </button>
                </div>
            </div>

            <!-- Canvas Area -->
            <div class="flex-1 relative overflow-hidden bg-white cursor-crosshair" id="canvas-wrapper">
                <canvas id="duel-canvas" class="block w-full h-full"></canvas>
            </div>

            <!-- Status -->
            <div id="draw-status" class="absolute bottom-4 right-4 px-3 py-1 bg-black/50 text-white rounded-full text-xs backdrop-blur-sm pointer-events-none">
                Připraveno ke kreslení...
            </div>
        </div>
    `;

    initCanvas();
    setupRealtime();
    
    // REDRAW HISTORICAL STROKES
    setTimeout(() => redrawAll(), 100); 

    // Global Handlers
    window.setDrawColor = (c) => color = c;
    window.setDrawSize = (s) => size = parseInt(s);
    window.newDrawPrompt = () => {
        const p = prompts[Math.floor(Math.random() * prompts.length)];
        const el = document.getElementById('draw-prompt-text');
        if (el) el.textContent = p;
        broadcastPrompt(p);
    };
    window.clearCanvas = async () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.drawStrokes = [];
        broadcastClear();
        // PERSIST CLEAR
        await supabase.from('draw_strokes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    };
    window.saveCanvas = () => {
        showNotification("Výkres uložen v databázi! ✨", "success");
    };
}

function redrawAll() {
    if (!ctx || !canvas) return;
    
    // Filter out deleted or empty strokes
    const strokes = state.drawStrokes || [];
    
    strokes.forEach(stroke => {
        const path = stroke.path_data;
        if (!path || path.length < 1) return;

        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();
    });
}

function initCanvas() {
    canvas = document.getElementById('duel-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const wrapper = document.getElementById('canvas-wrapper');
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;

    // Listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    // Responsive: Update size on resize
    window.addEventListener('resize', () => {
        if (state.currentChannel !== 'game-draw') return;
        const oldW = canvas.width;
        const oldH = canvas.height;
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        redrawAll();
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    });
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    currentPath = [{ x, y }];
    
    // Broadcast start
    broadcastStroke('start', { x, y, color, size });
}

function draw(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.stroke();

    currentPath.push({ x, y });

    // Broadcast move
    broadcastStroke('move', { x, y, color, size });
}

async function stopDrawing() {
    if (!drawing) return;
    drawing = false;
    ctx.closePath();
    
    // Broadcast end
    broadcastStroke('end', {});

    // PERSIST TO DATABASE
    if (currentPath.length > 1) {
        try {
            const { data, error } = await supabase.from('draw_strokes').insert([{
                user_id: state.currentUser.id,
                path_data: currentPath,
                color: color,
                size: size
            }]).select();
            
            if (data) state.drawStrokes.push(data[0]);
        } catch (err) {
            console.error("Save stroke error:", err);
        }
    }
}

// REALTIME BROADCAST
function setupRealtime() {
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

function handleRemoteStroke(p) {
    if (!ctx) return;

    if (p.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    } else if (p.type === 'move') {
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.stroke();
    } else if (p.type === 'end') {
        ctx.closePath();
    }
}

export function cleanupRealtime() {
    if (broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
        broadcastChannel = null;
    }
}
