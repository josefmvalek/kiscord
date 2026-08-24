import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { playHeartbeat, playChime } from '@core/sound.js';
import { broadcastHapticPulse } from '@core/sync.js';

// =====================================================================
// 🫀 HAPTIC TOUCH & HEARTBEAT SYNC ENGINE
// =====================================================================

let tapSequence = [];
let tapRecordTimeout = null;
let isHapticListenerActive = false;

export const HAPTIC_PRESETS = [
    { id: 'heartbeat', name: 'Tlukot Srdce', icon: '🫀', pattern: [80, 120, 100, 400, 80, 120, 100], desc: 'Dva rychlé tlukoty za sebou' },
    { id: 'ily-morse', name: 'Miluji Tě (Morse)', icon: '💌', pattern: [80, 80, 80, 200, 80, 200, 80, 80, 80], desc: 'Klepání v rytmu lásky' },
    { id: 'flutter', name: 'Hravé Zašimrání', icon: '✨', pattern: [40, 40, 40, 40, 40, 40, 40, 40, 40], desc: 'Rychlá série jemných vibrací' },
    { id: 'hug', name: 'Dlouhé Objetí', icon: '🫂', pattern: [700], desc: 'Jedna hluboká dlouhá vibrace' }
];

/**
 * Handles incoming haptic pulse from the partner.
 */
export function handleIncomingHapticPulse(payload) {
    const { pattern, type, name, senderName } = payload;
    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const partnerName = senderName || (isJose ? 'Klárka' : 'Jožka');

    // 1. Play synthesized soft heartbeat sound
    playHeartbeat();

    // 2. Hardware vibration
    if (navigator.vibrate && state.settings?.haptics) {
        try {
            navigator.vibrate(pattern || [100, 100, 100, 400, 100, 100, 100]);
        } catch (e) {
            console.warn('[Haptic] Vibrate failed:', e);
        }
    }

    // 3. Screen Ripple & Ambient Glow
    triggerScreenPulseEffect();

    // 4. Toast notification if user is on a different channel
    if (state.currentChannel !== 'dotek' && typeof window.showNotification === 'function') {
        const pulseLabel = name || 'Dotek na dálku';
        window.showNotification(`🫀 ${partnerName} ti právě poslal/a ${pulseLabel}!`, 'love');
    }
}

/**
 * Visual screen ripple effect across the entire viewport.
 */
function triggerScreenPulseEffect() {
    const pulseEl = document.createElement('div');
    pulseEl.className = 'fixed inset-0 pointer-events-none z-[9999] animate-pulse-glow border-4 border-pink-500/50 shadow-[inset_0_0_100px_rgba(235,69,158,0.4)] transition-opacity duration-700';
    document.body.appendChild(pulseEl);

    setTimeout(() => {
        pulseEl.style.opacity = '0';
        setTimeout(() => pulseEl.remove(), 700);
    }, 1200);
}

/**
 * Initializes global event listener for incoming haptic pulses.
 */
export function setupHapticTouchListener() {
    if (isHapticListenerActive) return;
    window.addEventListener('haptic-pulse-received', (e) => {
        handleIncomingHapticPulse(e.detail);
    });
    isHapticListenerActive = true;
}

// Auto-setup listener
setupHapticTouchListener();

/**
 * Sends a preset vibration pattern to the partner.
 */
export async function sendHapticPreset(presetId) {
    const preset = HAPTIC_PRESETS.find(p => p.id === presetId) || HAPTIC_PRESETS[0];

    // Local feedback
    playHeartbeat();
    triggerHaptic('medium');

    await broadcastHapticPulse({
        type: 'preset',
        presetId: preset.id,
        name: preset.name,
        pattern: preset.pattern
    });

    if (typeof window.showNotification === 'function') {
        window.showNotification(`✨ ${preset.name} odeslán partnerovi!`, 'success');
    }
}

let partnerTouchPos = { x: null, y: null, active: false, name: '' };
let myTouchPos = { x: null, y: null, active: false };

let isThumbkissMatched = false;
let thumbkissMatchCooldown = false;

/**
 * Main Channel View for #dotek (Haptic Touch & Remote Heartbeat + Thumbkiss).
 */
export function renderHapticTouch() {
    const container = document.getElementById('main-content') || document.getElementById('messages-container');
    if (!container) return;

    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const partnerName = isJose ? 'Klárce' : 'Jožkovi';
    const myColor = isJose ? '#5865F2' : '#eb459e';
    const partnerColor = isJose ? '#eb459e' : '#5865F2';

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in text-center select-none">
            <!-- Header Banner -->
            <div class="space-y-2">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold">
                    <i class="fas fa-heartbeat animate-pulse"></i> Real-time Dotek na Dálku & Thumbkiss
                </div>
                <h1 class="text-3xl font-black text-white uppercase tracking-tight">Thumbkiss Touch Arena</h1>
                <p class="text-xs text-gray-300 max-w-md mx-auto">
                    Přiložte prst na dotykovou plochu. Když se vaše prsty dotknou na stejném místě, telefony se rozzáří a synchronně rozechvějí láskou.
                </p>
            </div>

            <!-- THUMBKISS INTERACTIVE DUAL-TOUCH SURFACE -->
            <div class="relative max-w-lg mx-auto">
                <div id="thumbkiss-arena" 
                     class="relative w-full h-80 sm:h-96 rounded-3xl bg-gradient-to-br from-[#18191c] via-[#202225] to-[#121315] border-2 border-white/10 hover:border-pink-500/40 shadow-2xl overflow-hidden cursor-crosshair touch-none select-none flex items-center justify-center transition-colors">
                    
                    <!-- Ambient Grid Background -->
                    <div class="absolute inset-0 bg-[radial-gradient(#eb459e_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>

                    <!-- Center Idle Prompt -->
                    <div id="thumbkiss-idle-prompt" class="absolute pointer-events-none space-y-2 text-center transition-opacity duration-300">
                        <div class="w-16 h-16 rounded-full bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-3xl mx-auto animate-pulse">
                            🫀
                        </div>
                        <p class="text-xs font-bold text-gray-300">Polož a drž prst na ploše</p>
                        <span class="text-[10px] text-pink-400/80 font-mono">Sleduj auru partnera</span>
                    </div>

                    <!-- My Fingerprint Glow -->
                    <div id="my-touch-aura" class="absolute w-24 h-24 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 hidden"
                         style="background: radial-gradient(circle, ${myColor}aa 0%, ${myColor}00 70%); box-shadow: 0 0 30px ${myColor};">
                        <div class="w-full h-full rounded-full border-2 animate-ping" style="border-color: ${myColor};"></div>
                    </div>

                    <!-- Partner Fingerprint Glow -->
                    <div id="partner-touch-aura" class="absolute w-24 h-24 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 hidden"
                         style="background: radial-gradient(circle, ${partnerColor}aa 0%, ${partnerColor}00 70%); box-shadow: 0 0 30px ${partnerColor};">
                        <div class="w-full h-full rounded-full border-2 animate-ping" style="border-color: ${partnerColor};"></div>
                        <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/80 text-pink-300 border border-pink-500/40 whitespace-nowrap">
                            ${isJose ? 'Klárka' : 'Jožka'}
                        </div>
                    </div>

                    <!-- Match Explosion Aura -->
                    <div id="thumbkiss-match-aura" class="absolute inset-0 bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-pink-500/40 opacity-0 pointer-events-none transition-opacity duration-300 flex items-center justify-center">
                        <div class="text-center space-y-1 transform scale-125 animate-bounce">
                            <span class="text-6xl drop-shadow-[0_0_20px_#eb459e]">💖</span>
                            <div class="text-base font-black text-white uppercase tracking-widest font-mono drop-shadow-md">THUMBKISS!</div>
                        </div>
                    </div>
                </div>

                <!-- Arena Footer Status -->
                <div class="flex items-center justify-between px-3 pt-2 text-[10px] text-gray-400 font-mono">
                    <span id="thumbkiss-my-status" class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-gray-500"></span> Tvůj prst: neaktivní
                    </span>
                    <span id="thumbkiss-partner-status" class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-gray-500"></span> ${isJose ? 'Klárka' : 'Jožka'}: offline
                    </span>
                </div>
            </div>

            <!-- Preset Patterns -->
            <div class="space-y-3 pt-4 border-t border-white/10 max-w-lg mx-auto">
                <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">
                    Přednastavené Rytmy Lásky
                </h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    ${HAPTIC_PRESETS.map(preset => `
                        <button class="haptic-preset-btn p-3 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] border border-[var(--border-subtle)] hover:border-pink-500/40 text-left space-y-1 transition active:scale-95 group" data-preset-id="${preset.id}">
                            <div class="text-xl group-hover:scale-110 transition-transform">${preset.icon}</div>
                            <h4 class="text-[11px] font-black text-white group-hover:text-pink-300 transition-colors">${preset.name}</h4>
                            <p class="text-[8px] text-gray-400 leading-tight">${preset.desc}</p>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    setupThumbkissArena();

    // Preset buttons
    container.querySelectorAll('.haptic-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const presetId = btn.getAttribute('data-preset-id');
            sendHapticPreset(presetId);
        });
    });
}

/**
 * Initializes Thumbkiss touch surface event handling and collision detection
 */
function setupThumbkissArena() {
    const arena = document.getElementById('thumbkiss-arena');
    const myAura = document.getElementById('my-touch-aura');
    const partnerAura = document.getElementById('partner-touch-aura');
    const idlePrompt = document.getElementById('thumbkiss-idle-prompt');
    const matchAura = document.getElementById('thumbkiss-match-aura');
    const myStatus = document.getElementById('thumbkiss-my-status');
    const partnerStatus = document.getElementById('thumbkiss-partner-status');

    if (!arena) return;

    const updateTouch = (e, isActive) => {
        const rect = arena.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        myTouchPos = { x: normX, y: normY, active: isActive };

        if (isActive) {
            if (myAura) {
                myAura.style.left = `${normX * 100}%`;
                myAura.style.top = `${normY * 100}%`;
                myAura.classList.remove('hidden');
            }
            if (idlePrompt) idlePrompt.style.opacity = '0';
            if (myStatus) myStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Tvůj prst: aktivní`;
        } else {
            if (myAura) myAura.classList.add('hidden');
            if (idlePrompt && !partnerTouchPos.active) idlePrompt.style.opacity = '1';
            if (myStatus) myStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-gray-500"></span> Tvůj prst: neaktivní`;
        }

        import('@core/sync.js').then(s => {
            s.broadcastTouchPosition({ x: normX, y: normY, active: isActive });
        });

        checkThumbkissMatch();
    };

    arena.addEventListener('pointerdown', (e) => {
        arena.setPointerCapture(e.pointerId);
        updateTouch(e, true);
        triggerHaptic('light');
    });

    arena.addEventListener('pointermove', (e) => {
        if (myTouchPos.active) {
            updateTouch(e, true);
        }
    });

    const endTouch = (e) => {
        if (myTouchPos.active) {
            updateTouch(e, false);
        }
    };

    arena.addEventListener('pointerup', endTouch);
    arena.addEventListener('pointercancel', endTouch);

    // Listen for partner's real-time touch positions
    window.addEventListener('touch-pos-received', (e) => {
        const { x, y, active, name } = e.detail;
        partnerTouchPos = { x, y, active, name };

        if (partnerAura) {
            if (active) {
                partnerAura.style.left = `${x * 100}%`;
                partnerAura.style.top = `${y * 100}%`;
                partnerAura.classList.remove('hidden');
                if (idlePrompt) idlePrompt.style.opacity = '0';
                if (partnerStatus) partnerStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span> ${name || 'Partner'}: aktivní`;
            } else {
                partnerAura.classList.add('hidden');
                if (idlePrompt && !myTouchPos.active) idlePrompt.style.opacity = '1';
                if (partnerStatus) partnerStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-gray-500"></span> ${name || 'Partner'}: offline`;
            }
        }

        checkThumbkissMatch();
    });

    function checkThumbkissMatch() {
        if (!myTouchPos.active || !partnerTouchPos.active) return;
        if (thumbkissMatchCooldown) return;

        const dx = myTouchPos.x - partnerTouchPos.x;
        const dy = myTouchPos.y - partnerTouchPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Match threshold (~50px on standard screen)
        if (distance < 0.15) {
            triggerThumbkissMatch();
        }
    }

    function triggerThumbkissMatch() {
        thumbkissMatchCooldown = true;
        isThumbkissMatched = true;

        if (matchAura) matchAura.style.opacity = '1';

        // Sensory feedback
        playHeartbeat();
        import('@core/sound.js').then(s => s.playSuccessChime?.());
        import('@core/utils.js').then(u => {
            u.triggerConfetti?.();
            u.triggerHaptic?.('heartbeat');
        });

        if (navigator.vibrate) {
            try {
                navigator.vibrate([100, 60, 100, 60, 200]);
            } catch (err) {}
        }

        setTimeout(() => {
            if (matchAura) matchAura.style.opacity = '0';
            setTimeout(() => {
                thumbkissMatchCooldown = false;
                isThumbkissMatched = false;
            }, 1000);
        }, 2000);
    }
}

