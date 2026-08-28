import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { safeInsert } from '@core/offline.js';
import { playBeep, playChime, playArcade, playFanfare } from '@core/sound.js';
import { drawState, COLOR_PALETTE, BRUSH_PRESETS, resetDrawState } from './state.js';
import { initCanvas, updateCanvasTransform, redrawAll, generateCanvasThumbnail } from './canvas-engine.js';
import { setupRealtime, cleanupRealtime, broadcastClear, broadcastTimer } from './realtime-sync.js';
import {
    pickRandomPrompt,
    showAddPromptModal,
    saveNewPrompt,
    showPromptManagementModal,
    deletePrompt
} from './prompts.js';

export {
    showAddPromptModal,
    saveNewPrompt,
    showPromptManagementModal,
    deletePrompt,
    cleanupRealtime
};

let keydownHandler = null;
let resizeHandler = null;

/**
 * Main Game Draw / Draw Duel renderer
 */
export function renderGameDraw() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    resetDrawState();

    container.innerHTML = `
        <style>
            .draw-slider {
                -webkit-appearance: none;
                width: 100%;
                background: rgba(255, 255, 255, 0.12);
                border-radius: 999px;
                height: 5px;
                cursor: pointer;
            }
            .draw-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 16px;
                width: 16px;
                border-radius: 50%;
                background: #eb459e;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(235, 69, 158, 0.7);
                border: 2px solid white;
                transition: transform 0.1s ease;
            }
            .draw-slider::-webkit-slider-thumb:hover {
                transform: scale(1.25);
            }
            .color-swatch.active {
                box-shadow: 0 0 0 3px #202225, 0 0 0 5px #eb459e;
                transform: scale(1.18);
            }
            .tool-btn.active {
                background: rgba(235, 69, 158, 0.22) !important;
                color: #eb459e !important;
                border-color: rgba(235, 69, 158, 0.4) !important;
            }
        </style>

        <div class="h-full flex flex-col bg-[#202225] select-none animate-fade-in relative overflow-hidden">
            
            <!-- Blind Mode Fog Overlay -->
            <div id="blind-fog" class="absolute inset-x-0 bottom-0 top-[73px] bg-white/95 backdrop-blur-xl z-20 pointer-events-none opacity-0 transition-opacity duration-300 flex flex-col items-center justify-center">
                <div class="text-[#202225] flex flex-col items-center gap-4 animate-bounce">
                    <div class="w-20 h-20 rounded-full bg-[#eb459e]/10 border border-[#eb459e]/30 flex items-center justify-center shadow-2xl">
                        <i class="fas fa-eye-slash text-4xl text-[#eb459e]"></i>
                    </div>
                    <div class="text-center">
                        <h3 class="text-xl font-black tracking-tight text-[#202225]">Kreslíš poslepu! 👀</h3>
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Partner vidí tvoje tahy live na svém displeji</p>
                    </div>
                </div>
            </div>

            <!-- Header & Toolbar -->
            <div class="p-2 md:p-3 bg-[#2f3136] border-b border-[#202225] flex flex-col gap-2 z-30 shadow-md">
                
                <!-- Top Row: Navigation, Prompt & Actions -->
                <div class="flex items-center justify-between gap-2">
                    
                    <!-- Left: Back & Title -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button onclick="window.switchChannel('games-hub'); triggerHaptic('light')" 
                                class="w-9 h-9 flex items-center justify-center rounded-xl bg-[#202225] hover:bg-[#36393f] text-gray-300 hover:text-white border border-white/5 transition active:scale-95" 
                                title="Zpět do Herny">
                            <i class="fas fa-arrow-left text-sm"></i>
                        </button>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-white font-black tracking-tight text-base sm:text-lg flex items-center gap-1.5">
                                    <i class="fas fa-palette text-[#eb459e] text-sm"></i> Draw Duel
                                </h2>
                                <div id="draw-status">
                                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Center: Prompt Banner -->
                    <div class="flex-1 max-w-xl mx-2 hidden sm:flex items-center justify-between bg-[#202225] border border-white/5 px-3 py-1.5 rounded-xl">
                        <div class="flex items-center gap-2 overflow-hidden">
                            <span class="text-[10px] font-black uppercase tracking-wider text-[#eb459e] bg-[#eb459e]/10 px-2 py-0.5 rounded-md flex-shrink-0">Téma:</span>
                            <span id="draw-prompt-text" class="text-white text-xs font-semibold truncate">Klikni na žárovku pro nápad...</span>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                            <button onclick="window.newDrawPrompt()" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#fee75c] hover:bg-white/5 transition" title="Změnit téma">
                                <i class="fas fa-sync-alt text-xs"></i>
                            </button>
                            <button onclick="window.showAddPromptModal()" class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#eb459e] hover:bg-white/5 transition" title="Přidat vlastní téma">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Right Actions: Gallery & Save -->
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button onclick="window.loadModule('drawGallery').then(m => m.renderGallery())" 
                                class="h-9 px-3 bg-[#36393f] hover:bg-[#4f545c] text-gray-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/5 shadow-sm active:scale-95" 
                                title="Otevřít Lednici">
                            <i class="fas fa-snowflake text-[#00b0f4] text-xs"></i>
                            <span class="hidden md:inline">Lednice</span>
                        </button>
                        <button onclick="window.openSaveModal()" 
                                class="h-9 px-3.5 bg-gradient-to-r from-[#eb459e] to-[#da3086] hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-[#eb459e]/20 active:scale-95">
                            <i class="fas fa-save text-xs"></i>
                            <span>Uložit</span>
                        </button>
                    </div>
                </div>

                <!-- Bottom Row: Tools & Color Palette -->
                <div class="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pt-1">
                    
                    <!-- Tool Selectors Group -->
                    <div class="flex items-center gap-1 bg-[#202225] p-1 rounded-xl border border-white/5 flex-shrink-0">
                        <button id="brush-tool-btn" onclick="window.setDrawTool('brush')" class="tool-btn active w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-white border border-transparent transition" title="Štětec (B)">
                            <i class="fas fa-paint-brush text-xs"></i>
                        </button>
                        <button id="eraser-tool-btn" onclick="window.setDrawTool('eraser')" class="tool-btn w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-white border border-transparent transition" title="Guma (E)">
                            <i class="fas fa-eraser text-xs"></i>
                        </button>
                        <button id="pan-tool-btn" onclick="window.setDrawTool('pan')" class="tool-btn w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-white border border-transparent transition" title="Posun plátna (Space)">
                            <i class="fas fa-hand-paper text-xs"></i>
                        </button>
                        <div class="w-[1px] h-5 bg-white/10 mx-0.5"></div>
                        <button onclick="window.undoLastStroke()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition" title="Zpět (Ctrl+Z)">
                            <i class="fas fa-undo text-xs"></i>
                        </button>
                        <button onclick="window.clearCanvas()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition" title="Vyčistit plátno (C)">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>

                    <!-- Brush Presets & Slider -->
                    <div class="flex items-center gap-2 bg-[#202225] px-3 py-1 rounded-xl border border-white/5 flex-shrink-0">
                        <div class="flex items-center gap-1">
                            ${BRUSH_PRESETS.map(p => `
                                <button onclick="window.setDrawSize(${p.size})" 
                                        class="brush-chip px-2 py-1 rounded-lg text-[10px] font-bold ${p.size === drawState.size ? 'bg-[#eb459e]/20 text-[#eb459e]' : 'text-gray-400 hover:text-white hover:bg-white/5'} transition" 
                                        title="${p.label} (${p.size}px)">
                                    ${p.size}px
                                </button>
                            `).join('')}
                        </div>
                        <div class="w-[1px] h-4 bg-white/10"></div>
                        <div class="flex items-center gap-2 w-24 sm:w-28">
                            <input type="range" min="1" max="50" value="${drawState.size}" oninput="window.setDrawSize(this.value)" class="draw-slider outline-none flex-1">
                            <span id="brush-size-label" class="text-[10px] font-bold text-[#eb459e] min-w-[14px] text-right">${drawState.size}</span>
                        </div>
                    </div>

                    <!-- Color Swatches -->
                    <div class="flex items-center gap-1.5 bg-[#202225] p-1 px-2 rounded-xl border border-white/5 flex-shrink-0">
                        ${COLOR_PALETTE.map((c, i) => `
                            <button onclick="window.setDrawColor('${c.color}')" 
                                    class="color-swatch ${i === 0 ? 'active' : ''} w-6 h-6 rounded-full border border-white/20 transition hover:scale-110 shadow-sm flex-shrink-0" 
                                    style="background-color: ${c.color}" 
                                    title="${c.name}"></button>
                        `).join('')}
                        <label class="w-6 h-6 rounded-full border border-white/30 cursor-pointer overflow-hidden relative flex-shrink-0 hover:scale-110 transition bg-gradient-to-tr from-rose-500 via-emerald-400 to-indigo-500" title="Vlastní barva">
                            <input type="color" value="${drawState.color}" oninput="window.setDrawColor(this.value)" class="opacity-0 absolute inset-0 cursor-pointer w-full h-full">
                        </label>
                    </div>

                    <!-- Game Mode Toggles: Timer & Blind Mode -->
                    <div class="flex items-center gap-1 bg-[#202225] p-1 rounded-xl border border-white/5 flex-shrink-0">
                        <button id="timer-toggle-btn" onclick="window.startTimer(30)" class="h-8 px-2.5 rounded-lg text-[10px] font-black text-gray-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5" title="30s Bleskovka">
                            <i class="fas fa-stopwatch text-[#fee75c] text-xs"></i>
                            <span id="timer-label">30s</span>
                        </button>
                        <button id="blind-toggle-btn" onclick="window.toggleBlindMode()" class="w-8 h-8 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition flex items-center justify-center" title="Kreslení Poslepu">
                            <i class="fas fa-eye-slash text-xs"></i>
                        </button>
                    </div>

                </div>
            </div>

            <!-- Canvas Viewport -->
            <div class="flex-1 relative overflow-hidden bg-[#18191c] cursor-crosshair" id="canvas-wrapper">
                <canvas id="duel-canvas" class="block bg-white transition-transform duration-75 origin-top-left shadow-2xl touch-none"></canvas>
                
                <!-- Zoom Controls Overlay -->
                <div class="absolute bottom-5 left-5 flex items-center gap-1.5 bg-[#202225]/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl z-30">
                    <button onclick="window.adjustZoom(0.25)" class="w-8 h-8 flex items-center justify-center rounded-xl bg-[#2f3136] hover:bg-[#36393f] text-white transition text-xs" title="Přiblížit (+)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button onclick="window.adjustZoom(-0.25)" class="w-8 h-8 flex items-center justify-center rounded-xl bg-[#2f3136] hover:bg-[#36393f] text-white transition text-xs" title="Oddálit (-)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button onclick="window.resetZoom()" class="px-2.5 h-8 flex items-center justify-center rounded-xl bg-[#eb459e]/20 hover:bg-[#eb459e]/30 text-[#eb459e] text-[11px] font-black transition" title="Obnovit měřítko">
                        <span id="zoom-badge">100%</span>
                    </button>
                </div>
            </div>

        </div>
    `;

    // Initialize Canvas & Realtime Synchronization
    initCanvas();
    setupRealtime();

    // Pick first prompt automatically
    pickRandomPrompt();

    // Attach Global Action Handlers
    window.setDrawTool = (t) => {
        drawState.tool = t;
        updateToolUI();
        triggerHaptic('selection');
    };

    window.setDrawColor = (c) => {
        drawState.color = c;
        if (drawState.tool === 'eraser') {
            drawState.tool = 'brush';
        }
        updateToolUI();
        triggerHaptic('light');
    };

    window.setDrawSize = (s) => {
        drawState.size = parseInt(s);
        const label = document.getElementById('brush-size-label');
        if (label) label.textContent = drawState.size;
        updateBrushChips();
    };

    window.adjustZoom = (delta) => {
        drawState.zoomLevel = Math.max(1.0, Math.min(5.0, drawState.zoomLevel + delta));
        updateCanvasTransform();
        triggerHaptic('light');
    };

    window.resetZoom = () => {
        drawState.zoomLevel = 1.0;
        drawState.panX = 0;
        drawState.panY = 0;
        updateCanvasTransform();
        triggerHaptic('light');
    };

    window.newDrawPrompt = () => {
        pickRandomPrompt();
    };

    window.showAddPromptModal = showAddPromptModal;
    window.saveNewPrompt = saveNewPrompt;
    window.showPromptManagementModal = showPromptManagementModal;
    window.deletePrompt = deletePrompt;

    window.toggleBlindMode = () => {
        drawState.isBlindMode = !drawState.isBlindMode;
        const fog = document.getElementById('blind-fog');
        const btn = document.getElementById('blind-toggle-btn');
        if (fog) {
            fog.style.opacity = drawState.isBlindMode ? '1' : '0';
            fog.style.pointerEvents = drawState.isBlindMode ? 'auto' : 'none';
        }
        if (btn) {
            btn.classList.toggle('bg-[#eb459e]/20', drawState.isBlindMode);
            btn.classList.toggle('text-[#eb459e]', drawState.isBlindMode);
        }
        showNotification(
            drawState.isBlindMode ? "Kreslení Poslepu zapnuto! 🙈 Kresli po paměti." : "Kreslení Poslepu vypnuto.", 
            "info"
        );
        triggerHaptic('medium');
    };

    window.startTimer = (seconds, remoteTrigger = false) => {
        if (drawState.timerInterval) {
            clearInterval(drawState.timerInterval);
            drawState.timerInterval = null;
            const label = document.getElementById('timer-label');
            if (label) label.textContent = "30s";
            document.getElementById('timer-toggle-btn')?.classList.remove('bg-[#eb459e]/20', 'text-[#eb459e]', 'animate-pulse');
            return;
        }

        drawState.timeLeft = seconds;
        drawState.timerInitial = seconds;

        const btn = document.getElementById('timer-toggle-btn');
        btn?.classList.add('bg-[#eb459e]/20', 'text-[#eb459e]', 'animate-pulse');

        if (!remoteTrigger) {
            broadcastTimer(seconds);
            playBeep(660, 0.1);
        }

        drawState.timerInterval = setInterval(() => {
            drawState.timeLeft--;
            const label = document.getElementById('timer-label');
            if (label) label.textContent = `${drawState.timeLeft}s!`;

            if (drawState.timeLeft <= 3 && drawState.timeLeft > 0) {
                playBeep(880, 0.08);
                triggerHaptic('medium');
            }

            if (drawState.timeLeft <= 0) {
                clearInterval(drawState.timerInterval);
                drawState.timerInterval = null;
                if (label) label.textContent = "KONEC!";
                btn?.classList.remove('animate-pulse');

                playFanfare();
                triggerConfetti();
                triggerHaptic('heavy');
                showNotification("Čas vypršel! Blesková výzva dokončena! 🎉", "success");
            }
        }, 1000);
    };

    window.undoLastStroke = async () => {
        const activeStrokes = (state.drawStrokes || []).filter(s => !s.drawing_id);
        if (activeStrokes.length === 0) return;

        const last = activeStrokes[activeStrokes.length - 1];
        try {
            await supabase.from('draw_strokes').delete().eq('id', last.id);
            state.drawStrokes = state.drawStrokes.filter(s => s.id !== last.id);
            redrawAll();
            broadcastClear(); // Sync redraw
            triggerHaptic('light');
        } catch (err) {
            console.error("[GameDraw] Undo error:", err);
        }
    };

    window.clearCanvas = async () => {
        const confirmed = await showConfirmDialog("Opravdu smazat celé plátno a začít znovu?");
        if (!confirmed) return;

        const { ctx, canvas } = drawState;
        if (ctx && canvas) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        state.drawStrokes = [];
        broadcastClear();
        await supabase.from('draw_strokes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        showNotification("Plátno vyčištěno 🧹", "info");
        triggerHaptic('medium');
    };

    window.openSaveModal = () => {
        const activeStrokes = (state.drawStrokes || []).filter(s => !s.drawing_id);
        if (activeStrokes.length === 0) {
            showNotification("Plátno je zatím prázdné!", "info");
            return;
        }

        const currentPrompt = drawState.currentPrompt || document.getElementById('draw-prompt-text')?.textContent || "Bez názvu";
        const thumb = generateCanvasThumbnail();

        const modal = document.createElement('div');
        modal.id = 'save-drawing-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/85 backdrop-blur-md" onclick="this.parentElement.remove()"></div>
            <div class="bg-[#2f3136] border border-[#eb459e]/30 w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden flex flex-col z-10">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-black text-white flex items-center gap-2">
                            <i class="fas fa-snowflake text-[#00b0f4]"></i> Uložit do Lednice
                        </h3>
                        <button onclick="this.closest('#save-drawing-modal').remove()" class="text-gray-400 hover:text-white transition">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Thumbnail Preview -->
                    <div class="w-full aspect-video bg-white rounded-2xl overflow-hidden border border-white/10 mb-4 shadow-inner">
                        <img src="${thumb}" class="w-full h-full object-contain">
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-1.5 ml-1">Název díla</label>
                            <input id="save-drawing-title" type="text" value="${currentPrompt.replace(/"/g, '&quot;')}" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/10 outline-none focus:border-[#eb459e] focus:ring-1 focus:ring-[#eb459e] transition text-sm font-semibold">
                        </div>

                        <div class="flex items-center gap-2 pt-2">
                            <button onclick="window.commitSaveDrawing()" class="w-full bg-gradient-to-r from-[#3ba55c] to-[#2d8046] hover:brightness-110 text-white font-bold py-3.5 rounded-xl shadow-lg transition transform active:scale-95 text-sm flex items-center justify-center gap-2">
                                <i class="fas fa-check"></i> Připnout na Lednici
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('save-drawing-title')?.focus();
    };

    window.commitSaveDrawing = async () => {
        const titleInput = document.getElementById('save-drawing-title');
        const title = titleInput?.value.trim() || "Bez názvu";
        const thumbnail = generateCanvasThumbnail();
        const activeStrokes = (state.drawStrokes || []).filter(s => !s.drawing_id);

        try {
            // 1. Insert drawing into database
            const { data: drawingData, error: dError } = await safeInsert('drawings', [{
                title: title,
                thumbnail: thumbnail,
                user_id: state.currentUser?.id
            }]);

            if (dError) throw dError;

            // 2. Link strokes
            const strokeIds = activeStrokes.map(s => s.id);
            if (strokeIds.length > 0) {
                await supabase.from('draw_strokes')
                    .update({ drawing_id: drawingData?.[0]?.id || null })
                    .in('id', strokeIds);
            }

            state.drawStrokes = (state.drawStrokes || []).filter(s => s.drawing_id);

            const { ctx, canvas } = drawState;
            if (ctx && canvas) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            broadcastClear();

            document.getElementById('save-drawing-modal')?.remove();
            showNotification("Výkres byl hrdě vystaven v Lednici! ✨", "success");
            playArcade();
            triggerConfetti();
            triggerHaptic('success');

        } catch (err) {
            console.error("[GameDraw] Save commit error:", err);
            showNotification("Chyba při ukládání výkresu.", "error");
        }
    };

    // Keyboard Shortcuts
    keydownHandler = (e) => {
        if (state.currentChannel !== 'game-draw') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            window.undoLastStroke();
        } else if (e.key.toLowerCase() === 'b') {
            window.setDrawTool('brush');
        } else if (e.key.toLowerCase() === 'e') {
            window.setDrawTool('eraser');
        } else if (e.key.toLowerCase() === 'h' || e.key === ' ') {
            window.setDrawTool('pan');
        }
    };
    window.addEventListener('keydown', keydownHandler);

    // Responsive Canvas Resize
    resizeHandler = () => {
        if (state.currentChannel !== 'game-draw') return;
        initCanvas();
    };
    window.addEventListener('resize', resizeHandler);

    return () => {
        if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
        if (resizeHandler) window.removeEventListener('resize', resizeHandler);
        cleanupRealtime();
        if (drawState.timerInterval) clearInterval(drawState.timerInterval);
    };
}

function updateToolUI() {
    const brushBtn = document.getElementById('brush-tool-btn');
    const eraserBtn = document.getElementById('eraser-tool-btn');
    const panBtn = document.getElementById('pan-tool-btn');
    const wrapper = document.getElementById('canvas-wrapper');

    brushBtn?.classList.toggle('active', drawState.tool === 'brush');
    eraserBtn?.classList.toggle('active', drawState.tool === 'eraser');
    panBtn?.classList.toggle('active', drawState.tool === 'pan');

    if (wrapper) {
        wrapper.style.cursor = drawState.tool === 'pan' ? 'grab' : 'crosshair';
    }

    // Update color swatches active state
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        const swatchColor = swatch.getAttribute('style')?.match(/background-color:\s*([^;]+)/)?.[1]?.trim();
        swatch.classList.toggle('active', swatchColor === drawState.color && drawState.tool === 'brush');
    });
}

function updateBrushChips() {
    document.querySelectorAll('.brush-chip').forEach(chip => {
        const chipSize = parseInt(chip.textContent);
        const isActive = chipSize === drawState.size;
        chip.className = `brush-chip px-2 py-1 rounded-lg text-[10px] font-bold ${isActive ? 'bg-[#eb459e]/20 text-[#eb459e]' : 'text-gray-400 hover:text-white hover:bg-white/5'} transition`;
    });
}
