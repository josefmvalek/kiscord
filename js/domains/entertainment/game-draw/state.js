/**
 * Game Draw Module State Management
 */

export const drawState = {
    tool: 'brush', // 'brush' | 'eraser' | 'pan'
    color: '#eb459e',
    size: 6,
    isBlindMode: false,
    zoomLevel: 1.0,
    panX: 0,
    panY: 0,
    startPanX: 0,
    startPanY: 0,
    drawing: false,
    timerInterval: null,
    timeLeft: 30,
    timerInitial: 30,
    showColors: false,
    currentPath: [],
    userLastPositions: {},
    initialPinchDist: null,
    initialZoom: 1.0,
    currentPrompt: '',
    canvas: null,
    ctx: null,
    dpr: (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2) : 1
};

export const COLOR_PALETTE = [
    { color: '#eb459e', name: 'Kiscord Růžová' },
    { color: '#5865F2', name: 'Discord Modrá' },
    { color: '#57f287', name: 'Mátově Zelená' },
    { color: '#fee75c', name: 'Slunečně Žlutá' },
    { color: '#ed4245', name: 'Korálově Červená' },
    { color: '#9b59b6', name: 'Levandulová' },
    { color: '#00b0f4', name: 'Nebesky Azurová' },
    { color: '#e67e22', name: 'Teplá Oranžová' },
    { color: '#ffffff', name: 'Sněhově Bílá' },
    { color: '#202225', name: 'Tmavě Černá' }
];

export const BRUSH_PRESETS = [
    { size: 2, label: 'Jemný', icon: 'fa-pencil-alt' },
    { size: 6, label: 'Klasik', icon: 'fa-paint-brush' },
    { size: 14, label: 'Fixa', icon: 'fa-marker' },
    { size: 28, label: 'Štětec', icon: 'fa-brush' }
];

export function resetDrawState() {
    drawState.tool = 'brush';
    drawState.isBlindMode = false;
    drawState.zoomLevel = 1.0;
    drawState.panX = 0;
    drawState.panY = 0;
    drawState.drawing = false;
    if (drawState.timerInterval) {
        clearInterval(drawState.timerInterval);
        drawState.timerInterval = null;
    }
    drawState.timeLeft = 30;
    drawState.currentPath = [];
    drawState.userLastPositions = {};
}
