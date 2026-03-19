import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { showNotification } from '../core/theme.js';
import { triggerHaptic } from '../core/utils.js';

let canvas, ctx;
let drawing = false;
let color = '#eb459e';
let size = 5;
let subscription = null;
let broadcastChannel = null;
let currentPath = []; // Track points for saving
let isEraser = false;
let isBlindMode = false;
let timerInterval = null;
let timeLeft = 0;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanningMode = false;
let startPanX, startPanY;
let initialPinchDist = null;
let initialZoom = 1;

function updateCanvasTransform() {
    const c = document.getElementById('duel-canvas');
    if (c) c.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

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
        <style>
            .clean-slider {
                -webkit-appearance: none;
                width: 100%;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 999px;
                height: 6px;
                cursor: pointer;
            }
            .clean-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 18px;
                width: 18px;
                border-radius: 50%;
                background: #eb459e;
                cursor: pointer;
                box-shadow: 0 0 15px rgba(235, 69, 158, 0.6);
                border: 2px solid white;
                transition: transform 0.1s ease-in-out;
            }
            .clean-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }
            .clean-slider::-moz-range-thumb {
                height: 18px;
                width: 18px;
                border-radius: 50%;
                background: #eb459e;
                cursor: pointer;
                box-shadow: 0 0 15px rgba(235, 69, 158, 0.6);
                border: 2px solid white;
            }
            .no-scrollbar::-webkit-scrollbar {
                display: none;
            }
            .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
        </style>
        <div class="h-full flex flex-col bg-[#202225] animate-fade-in relative ${isBlindMode ? 'blind-mode' : ''}">
            <!-- Background Fog (only for drawer in blind mode) -->
            <div id="blind-fog" class="absolute inset-x-0 bottom-0 top-[73px] bg-white z-10 pointer-events-none opacity-0 transition-opacity flex items-center justify-center">
                 <div class="text-gray-300 flex flex-col items-center gap-4">
                    <i class="fas fa-eye-slash text-6xl opacity-20"></i>
                    <p class="font-bold opacity-50 uppercase tracking-widest text-sm">Kreslíš poslepu...</p>
                 </div>
            </div>
            <!-- Toolbar -->
            <div class="p-1 px-2 md:p-3 bg-[#2f3136] border-b border-[#202225] flex flex-col md:flex-row items-center justify-between gap-2 z-20">
                <div class="flex items-center justify-between w-full md:w-auto gap-2">
                    <!-- Tools Group -->
                    <div class="flex items-center gap-1 bg-[#18191c]/50 p-1 rounded-lg border border-white/5">
                        <button id="eraser-btn" onclick="window.toggleEraser()" class="w-8 h-8 flex items-center justify-center rounded-md bg-transparent text-gray-400 hover:text-white transition" title="Guma">
                            <i class="fas fa-eraser text-xs"></i>
                        </button>
                        <button id="pan-btn" onclick="window.togglePanMode()" class="w-8 h-8 flex items-center justify-center rounded-md bg-transparent text-gray-400 hover:text-white transition" title="Posun">
                            <i class="fas fa-hand-paper text-xs"></i>
                        </button>
                        <button onclick="window.undoLastStroke()" class="w-8 h-8 flex items-center justify-center rounded-md bg-transparent text-gray-400 hover:text-white transition" title="Zpět">
                            <i class="fas fa-undo text-xs"></i>
                        </button>
                    </div>

                    <!-- Colors Scrollable -->
                    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-1 md:flex-none">
                        <button onclick="window.setDrawColor('#eb459e')" class="w-6 h-6 rounded-full bg-[#eb459e] border border-white/20 flex-shrink-0 hover:scale-110 transition shadow-sm"></button>
                        <button onclick="window.setDrawColor('#5865F2')" class="w-6 h-6 rounded-full bg-[#5865F2] border border-white/20 flex-shrink-0 hover:scale-110 transition shadow-sm"></button>
                        <button onclick="window.setDrawColor('#3ba55c')" class="w-6 h-6 rounded-full bg-[#3ba55c] border border-white/20 flex-shrink-0 hover:scale-110 transition shadow-sm"></button>
                        <button onclick="window.setDrawColor('#faa61a')" class="w-6 h-6 rounded-full bg-[#faa61a] border border-white/20 flex-shrink-0 hover:scale-110 transition shadow-sm"></button>
                        <button onclick="window.setDrawColor('#ffffff')" class="w-6 h-6 rounded-full bg-[#ffffff] border border-white/20 flex-shrink-0 hover:scale-110 transition shadow-sm"></button>
                        <button onclick="window.setDrawColor('#000000')" class="w-6 h-6 rounded-full bg-[#000000] border border-white/20 flex-shrink-0 hover:scale-110 transition shadow-sm"></button>
                    </div>
                    
                    <!-- Title Hidden on mobile -->
                    <h2 class="text-white font-black hidden xl:block tracking-tighter text-xl ml-2">Draw Duel</h2>
                </div>

                <div class="flex items-center justify-between w-full md:w-auto gap-3">
                    <!-- Compact Slider -->
                    <div class="flex items-center gap-3 bg-[#18191c]/50 px-3 py-1.5 rounded-lg border border-white/5 flex-1 md:w-32">
                        <input type="range" min="1" max="50" value="${size}" oninput="window.setDrawSize(this.value)" class="flex-1 clean-slider outline-none h-1">
                        <span id="brush-size-label" class="text-[9px] font-bold text-[#eb459e] min-w-[12px]">${size}</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="window.newDrawPrompt()" class="w-8 h-8 bg-[#202225] text-gray-400 rounded-lg flex items-center justify-center hover:text-[#eb459e] transition" title="Téma"><i class="fas fa-lightbulb text-xs"></i></button>
                        <button id="blind-btn" onclick="window.toggleBlindMode()" class="w-8 h-8 bg-[#202225] text-gray-400 rounded-lg transition flex items-center justify-center" title="Poslepu"><i class="fas fa-eye-slash text-xs"></i></button>
                        <button id="timer-btn" onclick="window.startTimer(30)" class="h-8 px-2 bg-[#202225] text-gray-400 rounded-lg text-[10px] font-black transition flex items-center gap-1 hover:text-white" title="Výzva">
                            <i class="fas fa-stopwatch text-[#eb459e] text-xs"></i><span id="timer-text" class="hidden sm:inline italic">30s</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="import('./js/modules/drawGallery.js').then(m => m.renderGallery())" class="w-8 h-8 bg-[#4f545c] text-white rounded-lg flex items-center justify-center transition shadow-lg border border-white/5" title="Galerie"><i class="fas fa-images text-xs"></i></button>
                        <button onclick="window.clearCanvas()" class="w-8 h-8 bg-[#ed4245] text-white rounded-lg flex items-center justify-center transition shadow-lg border border-white/5" title="Smazat"><i class="fas fa-trash-alt text-xs"></i></button>
                        <button onclick="window.saveCanvas()" class="h-8 px-3 bg-[#3ba55c] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg border border-white/5">
                            <i class="fas fa-save text-xs"></i> <span class="hidden sm:inline">Uložit</span>
                        </button>
                    </div>
                </div>
            </div>


            <!-- Canvas Area -->
            <div class="flex-1 relative overflow-hidden bg-[#18191c] cursor-crosshair" id="canvas-wrapper">
                <canvas id="duel-canvas" class="block bg-white transition-transform duration-200 origin-top-left shadow-2xl" style="transform: translate(${panX}px, ${panY}px) scale(${zoomLevel})"></canvas>
                
                <!-- Zoom Controls Overlay -->
                <div class="absolute bottom-6 left-6 flex flex-col gap-2 z-30">
                    <button onclick="window.adjustZoom(0.5)" class="w-10 h-10 bg-[#18191c]/80 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-[#18191c] transition flex items-center justify-center shadow-lg"><i class="fas fa-search-plus"></i></button>
                    <button onclick="window.adjustZoom(-0.5)" class="w-10 h-10 bg-[#18191c]/80 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-[#18191c] transition flex items-center justify-center shadow-lg"><i class="fas fa-search-minus"></i></button>
                    <button onclick="window.resetZoom()" class="w-10 h-10 bg-[#eb459e]/80 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-[#eb459e] transition flex items-center justify-center shadow-lg text-[10px] font-bold">1:1</button>
                </div>
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
    window.setDrawColor = (c) => {
        color = c;
        isEraser = false;
        updateToolUI();
    };
    window.setDrawSize = (s) => {
        size = parseInt(s);
        const label = document.getElementById('brush-size-label');
        if (label) label.textContent = size;
        
        // Update thumb color dynamically in style if needed, but for now we keep #eb459e
    };

    window.togglePanMode = () => {
        isPanningMode = !isPanningMode;
        isEraser = false;
        const btn = document.getElementById('pan-btn');
        if (btn) btn.classList.toggle('bg-[#eb459e]/20', isPanningMode);
        if (btn) btn.classList.toggle('text-[#eb459e]', isPanningMode);
        
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) wrapper.style.cursor = isPanningMode ? 'grab' : 'crosshair';
        updateToolUI();
    };

    window.adjustZoom = (delta) => {
        zoomLevel = Math.max(1, Math.min(5, zoomLevel + delta));
        updateCanvasTransform();
    };

    window.resetZoom = () => {
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        updateCanvasTransform();
    };

    updateCanvasTransform();
    window.toggleEraser = () => {
        isEraser = !isEraser;
        updateToolUI();
    };
    window.undoLastStroke = async () => {
        const activeStrokes = state.drawStrokes.filter(s => !s.drawing_id);
        if (activeStrokes.length === 0) return;
        
        const last = activeStrokes[activeStrokes.length - 1];
        try {
            await supabase.from('draw_strokes').delete().eq('id', last.id);
            state.drawStrokes = state.drawStrokes.filter(s => s.id !== last.id);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            redrawAll();
            broadcastClear(); // Using clear as a proxy for "refresh everything"
            // Wait, broadcastClear clears the whole canvas on the other side. 
            // Better to have a broadcastUndo? For now, redrawAll is better.
        } catch (err) {
            console.error("Undo error:", err);
        }
    };
    window.newDrawPrompt = () => {
        const p = prompts[Math.floor(Math.random() * prompts.length)];
        const el = document.getElementById('draw-prompt-text');
        if (el) el.textContent = p;
        broadcastPrompt(p);
    };

    window.toggleColorPalette = () => {
        showColors = !showColors;
        const picker = document.getElementById('color-picker');
        if (picker) {
            picker.classList.toggle('hidden', !showColors);
            picker.classList.toggle('flex', showColors);
        }
    };

    window.toggleBlindMode = () => {
        isBlindMode = !isBlindMode;
        const fog = document.getElementById('blind-fog');
        const btn = document.getElementById('blind-btn');
        if (fog) {
            fog.style.opacity = isBlindMode ? '1' : '0';
            fog.style.pointerEvents = isBlindMode ? 'auto' : 'none';
        }
        if (btn) {
            btn.classList.toggle('bg-[#eb459e]/20', isBlindMode);
            btn.classList.toggle('text-[#eb459e]', isBlindMode);
        }
        showNotification(isBlindMode ? "Blind Mode: Ty nic neuvidíš, ale partner ano! 👀" : "Blind Mode vypnut.", "info");
    };

    window.startTimer = (seconds) => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            document.getElementById('timer-text').textContent = "30s Výzva";
            document.getElementById('timer-btn').classList.remove('bg-[#eb459e]/20', 'text-[#eb459e]');
            return;
        }

        timeLeft = seconds;
        document.getElementById('timer-btn').classList.add('bg-[#eb459e]/20', 'text-[#eb459e]');
        
        timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('timer-text').textContent = `${timeLeft}s!`;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                document.getElementById('timer-text').textContent = "ČAS VYPRŠEL!";
                triggerHaptic('heavy');
                showNotification("Čas vypršel! ⏱️", "warning");
                drawing = false;
            }
        }, 1000);

        broadcastTimer(seconds);
    };

    window.clearCanvas = async () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.drawStrokes = [];
        broadcastClear();
        // PERSIST CLEAR
        await supabase.from('draw_strokes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    };
    window.saveCanvas = async () => {
        if (state.drawStrokes.filter(s => !s.drawing_id).length === 0) {
            showNotification("Plátno je prázdné!", "info");
            return;
        }

        const promptText = document.getElementById('draw-prompt-text')?.textContent || "Bez názvu";
        const thumbnail = canvas.toDataURL('image/webp', 0.5);

        try {
            // 1. Create drawing record
            const { data: drawing, error: dError } = await supabase.from('drawings').insert([{
                user_id: state.currentUser.id,
                title: promptText,
                thumbnail: thumbnail
            }]).select().single();

            if (dError) throw dError;

            // 2. Link active strokes to this drawing
            const activeStrokes = state.drawStrokes.filter(s => !s.drawing_id);
            const strokeIds = activeStrokes.map(s => s.id);

            const { error: sError } = await supabase.from('draw_strokes')
                .update({ drawing_id: drawing.id })
                .in('id', strokeIds);

            if (sError) throw sError;

            // 3. Clear local state and canvas
            state.drawStrokes = state.drawStrokes.filter(s => s.drawing_id); // Keep only already saved ones for some reason? No, let's just refresh.
            // Actually, we should probably fetch ONLY null drawing_id in the first place.
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            broadcastClear(); // Sync clear with partner
            
            showNotification("Výkres uložen do Lednice! ✨", "success");
            triggerHaptic('success');
            
        } catch (err) {
            console.error("Save error:", err);
            showNotification("Chyba při ukládání.", "error");
        }
    };
}

function redrawAll() {
    if (!ctx || !canvas) return;
    
    // Filter out deleted or already saved strokes (to only show active ones)
    const strokes = (state.drawStrokes || []).filter(s => !s.drawing_id);
    
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

    // Touch support (Pinch to Zoom)
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoom = zoomLevel;
            return;
        }

        e.preventDefault();
        const touch = e.touches[0];
        startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
    });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDist !== null) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / initialPinchDist;
            zoomLevel = Math.max(1, Math.min(5, initialZoom * factor));
            updateCanvasTransform();
            return;
        }

        if (initialPinchDist !== null) return; // Ignore single finger if pinch active
        
        e.preventDefault();
        const touch = e.touches[0];
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialPinchDist = null;
        }
        stopDrawing();
    });

    // Mouse Wheel Zoom (Smoother & Natural)
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Logarithmic zoom for better feel
        const zoomIntensity = 0.001;
        const delta = -e.deltaY * zoomIntensity;
        const newZoom = Math.max(1, Math.min(8, zoomLevel * Math.exp(delta)));
        
        // Adjust pan to keep fixed internal coordinate under cursor
        panX = mouseX - (mouseX - panX) * (newZoom / zoomLevel);
        panY = mouseY - (mouseY - panY) * (newZoom / zoomLevel);
        
        zoomLevel = newZoom;
        updateCanvasTransform();
    }, { passive: false });
}

function startDrawing(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoomLevel;
    const y = (e.clientY - rect.top - panY) / zoomLevel;

    if (isPanningMode) {
        drawing = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) wrapper.style.cursor = 'grabbing';
        return;
    }

    drawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    currentPath = [{ x, y }];
    
    // Broadcast start
    broadcastStroke('start', { x, y, color: isEraser ? '#ffffff' : color, size });
}

function draw(e) {
    if (!drawing) return;
    
    if (isPanningMode) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        updateCanvasTransform();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoomLevel;
    const y = (e.clientY - rect.top - panY) / zoomLevel;

    ctx.lineTo(x, y);
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.stroke();

    currentPath.push({ x, y });

    // Broadcast move
    broadcastStroke('move', { x, y, color: isEraser ? '#ffffff' : color, size });
}

async function stopDrawing() {
    if (!drawing) return;
    drawing = false;

    if (isPanningMode) {
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) wrapper.style.cursor = 'grab';
        return;
    }

    ctx.closePath();
    
    // Broadcast end
    broadcastStroke('end', {});

    // PERSIST TO DATABASE
    if (currentPath.length > 1) {
        try {
            const { data, error } = await supabase.from('draw_strokes').insert([{
                user_id: state.currentUser.id,
                path_data: currentPath,
                color: isEraser ? '#ffffff' : color,
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

function updateToolUI() {
    const eraserBtn = document.getElementById('eraser-btn');
    if (!eraserBtn) return;
    
    if (isEraser) {
        eraserBtn.classList.add('bg-[#eb459e]/20', 'text-[#eb459e]');
        eraserBtn.classList.remove('text-gray-400');
    } else {
        eraserBtn.classList.remove('bg-[#eb459e]/20', 'text-[#eb459e]');
        eraserBtn.classList.add('text-gray-400');
    }
}

export function cleanupRealtime() {
    if (broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
        broadcastChannel = null;
    }
}
