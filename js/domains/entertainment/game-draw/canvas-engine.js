import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { safeInsert } from '@core/offline.js';
import { drawState } from './state.js';
import { broadcastStroke } from './realtime-sync.js';

/**
 * Initialize high-DPI canvas with smooth rendering
 */
export function initCanvas() {
    const canvas = document.getElementById('duel-canvas');
    if (!canvas) return;

    drawState.canvas = canvas;
    drawState.ctx = canvas.getContext ? canvas.getContext('2d') : null;
    const ctx = drawState.ctx;
    if (!ctx) return;

    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2) : 1;
    drawState.dpr = dpr;

    const rect = wrapper.getBoundingClientRect();
    const width = rect.width || 1200;
    const height = rect.height || 800;

    // Set backing store dimensions for HiDPI
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    // Set layout dimensions
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale drawing context
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    attachPointerListeners(canvas, wrapper);
    updateCanvasTransform();
    redrawAll();
}

/**
 * Update CSS transform for Pan and Zoom
 */
export function updateCanvasTransform() {
    const canvas = drawState.canvas || document.getElementById('duel-canvas');
    if (canvas) {
        canvas.style.transform = `translate(${drawState.panX}px, ${drawState.panY}px) scale(${drawState.zoomLevel})`;
    }
    const zoomBadge = document.getElementById('zoom-badge');
    if (zoomBadge) {
        zoomBadge.textContent = `${Math.round(drawState.zoomLevel * 100)}%`;
    }
}

/**
 * Redraw all active strokes onto canvas
 */
export function redrawAll() {
    const { ctx, canvas, dpr } = drawState;
    if (!ctx || !canvas) return;

    // Reset transform to clear full canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Scale back for HiDPI
    ctx.save();
    ctx.scale(dpr, dpr);

    const strokes = (state.drawStrokes || []).filter(s => !s.drawing_id);

    strokes.forEach(stroke => {
        const path = stroke.path_data;
        if (!path || path.length === 0) return;

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (path.length === 1) {
            // Single dot
            ctx.beginPath();
            ctx.arc(path[0].x, path[0].y, stroke.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = stroke.color;
            ctx.fill();
            ctx.closePath();
            return;
        }

        // Smooth curve drawing using quadratic midpoint interpolation
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);

        for (let i = 1; i < path.length - 1; i++) {
            const midX = (path[i].x + path[i + 1].x) / 2;
            const midY = (path[i].y + path[i + 1].y) / 2;
            ctx.quadraticCurveTo(path[i].x, path[i].y, midX, midY);
        }

        const last = path[path.length - 1];
        const prev = path[path.length - 2] || path[0];
        ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
        ctx.stroke();
        ctx.closePath();
    });

    ctx.restore();
}

/**
 * Attach Unified Pointer & Touch Listeners
 */
function attachPointerListeners(canvas, wrapper) {
    let activePointerId = null;

    const getCanvasCoords = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left) / drawState.zoomLevel;
        const y = (clientY - rect.top) / drawState.zoomLevel;
        return { x, y };
    };

    // Pointer Down
    canvas.onpointerdown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return; // Left click only

        if (drawState.tool === 'pan' || e.spaceKey) {
            drawState.drawing = true;
            drawState.startPanX = e.clientX - drawState.panX;
            drawState.startPanY = e.clientY - drawState.panY;
            wrapper.style.cursor = 'grabbing';
            activePointerId = e.pointerId;
            canvas.setPointerCapture?.(e.pointerId);
            return;
        }

        drawState.drawing = true;
        activePointerId = e.pointerId;
        canvas.setPointerCapture?.(e.pointerId);

        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        const effectiveSize = calculateDynamicSize(e.pressure);
        const strokeColor = drawState.tool === 'eraser' ? '#ffffff' : drawState.color;

        drawState.currentPath = [{ x, y, p: e.pressure || 0.5 }];
        if (state.currentUser?.id) {
            drawState.userLastPositions[state.currentUser.id] = { x, y };
        }

        const ctx = drawState.ctx;
        if (ctx) {
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = effectiveSize;
            ctx.beginPath();
            ctx.arc(x, y, effectiveSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }

        broadcastStroke('start', { x, y, color: strokeColor, size: effectiveSize });
    };

    // Pointer Move
    canvas.onpointermove = (e) => {
        if (!drawState.drawing || (activePointerId !== null && e.pointerId !== activePointerId)) return;

        if (drawState.tool === 'pan' || wrapper.style.cursor === 'grabbing') {
            drawState.panX = e.clientX - drawState.startPanX;
            drawState.panY = e.clientY - drawState.startPanY;
            updateCanvasTransform();
            return;
        }

        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        const strokeColor = drawState.tool === 'eraser' ? '#ffffff' : drawState.color;
        const effectiveSize = calculateDynamicSize(e.pressure);

        const last = state.currentUser?.id ? drawState.userLastPositions[state.currentUser.id] : null;
        const ctx = drawState.ctx;

        if (ctx && last) {
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = effectiveSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }

        if (state.currentUser?.id) {
            drawState.userLastPositions[state.currentUser.id] = { x, y };
        }
        drawState.currentPath.push({ x, y, p: e.pressure || 0.5 });

        broadcastStroke('move', { x, y, color: strokeColor, size: effectiveSize });
    };

    // Pointer Up & Cancel
    const endDrawing = async (e) => {
        if (!drawState.drawing) return;
        drawState.drawing = false;

        if (activePointerId !== null) {
            canvas.releasePointerCapture?.(activePointerId);
            activePointerId = null;
        }

        if (drawState.tool === 'pan') {
            wrapper.style.cursor = 'grab';
            return;
        }

        if (state.currentUser?.id) {
            delete drawState.userLastPositions[state.currentUser.id];
        }

        broadcastStroke('end', {});

        // Persist completed stroke to Supabase
        if (drawState.currentPath.length >= 1) {
            const finalPath = [...drawState.currentPath];
            const strokeColor = drawState.tool === 'eraser' ? '#ffffff' : drawState.color;
            const strokeSize = drawState.size;

            try {
                if (!state.drawStrokes) state.drawStrokes = [];
                const { data } = await safeInsert('draw_strokes', [{
                    drawing_id: null,
                    user_id: state.currentUser?.id,
                    path_data: finalPath,
                    color: strokeColor,
                    size: strokeSize
                }]);

                if (data && data[0]) {
                    state.drawStrokes.push(data[0]);
                }
            } catch (err) {
                console.error("[GameDraw] Failed to save stroke:", err);
            }
        }
        drawState.currentPath = [];
    };

    canvas.onpointerup = endDrawing;
    canvas.onpointercancel = endDrawing;

    // Wheel Zoom
    canvas.onwheel = (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.0012;
        const delta = -e.deltaY * zoomIntensity;
        const newZoom = Math.max(1.0, Math.min(5.0, drawState.zoomLevel * Math.exp(delta)));

        drawState.panX = mouseX - (mouseX - drawState.panX) * (newZoom / drawState.zoomLevel);
        drawState.panY = mouseY - (mouseY - drawState.panY) * (newZoom / drawState.zoomLevel);
        drawState.zoomLevel = newZoom;

        updateCanvasTransform();
    };

    // Touch Pinch-to-Zoom
    canvas.ontouchstart = (e) => {
        if (e.touches.length === 2) {
            drawState.initialPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            drawState.initialZoom = drawState.zoomLevel;
        }
    };

    canvas.ontouchmove = (e) => {
        if (e.touches.length === 2 && drawState.initialPinchDist !== null) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / drawState.initialPinchDist;
            drawState.zoomLevel = Math.max(1.0, Math.min(5.0, drawState.initialZoom * factor));
            updateCanvasTransform();
        }
    };

    canvas.ontouchend = (e) => {
        if (e.touches.length < 2) {
            drawState.initialPinchDist = null;
        }
    };
}

/**
 * Calculate dynamic line width with stylus/touch pressure sensitivity
 */
function calculateDynamicSize(pressure) {
    if (typeof pressure === 'number' && pressure > 0 && pressure <= 1) {
        return Math.max(1, Math.round(drawState.size * (0.6 + pressure * 0.8)));
    }
    return drawState.size;
}

/**
 * Generate a clean high-resolution thumbnail with solid white background
 */
export function generateCanvasThumbnail() {
    const source = drawState.canvas || document.getElementById('duel-canvas');
    if (!source) return '';

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 600;
    thumbCanvas.height = 400;
    const tCtx = thumbCanvas.getContext ? thumbCanvas.getContext('2d') : null;
    if (!tCtx) {
        return (typeof source.toDataURL === 'function') ? source.toDataURL('image/webp', 0.85) : 'data:image/webp;base64,mock';
    }

    // Solid white background
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);

    // Draw main canvas scaled
    tCtx.drawImage(source, 0, 0, thumbCanvas.width, thumbCanvas.height);

    return (typeof thumbCanvas.toDataURL === 'function') ? thumbCanvas.toDataURL('image/webp', 0.85) : 'data:image/webp;base64,mock';
}
