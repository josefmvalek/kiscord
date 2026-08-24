import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';

export function updateCanvasTransform() {
    const c = document.getElementById('duel-canvas');
    if (c) c.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

// Prompts are now fetched from state.gamePrompts


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
    userLastPositions[state.currentUser?.id] = { x, y };
    
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

    const last = userLastPositions[state.currentUser?.id];
    if (last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = isEraser ? '#ffffff' : color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();
    }

    userLastPositions[state.currentUser?.id] = { x, y };
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
    delete userLastPositions[state.currentUser?.id];
    
    // Broadcast end
    broadcastStroke('end', {});

    // PERSIST TO DATABASE
    if (currentPath.length > 1) {
        try {
            const { data, error } = await safeInsert('draw_strokes', [{
                drawing_id: null,
                user_id: state.currentUser.id,
                path_data: currentPath, // Assuming 'points' should be 'path_data'
                color: isEraser ? '#ffffff' : color, // Assuming 'currentStroke.color' should be this
                size: size // Assuming 'width' should be 'size'
            }]);
            
            if (data) state.drawStrokes.push(data[0]);
        } catch (err) {
            console.error("Save stroke error:", err);
        }
    }
}

// REALTIME BROADCAST

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

