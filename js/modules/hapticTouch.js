import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { playHeartbeat, playChime } from '../core/sound.js';
import { broadcastHapticPulse } from '../core/sync.js';

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

/**
 * Main Channel View for #dotek (Haptic Touch & Remote Heartbeat).
 */
export function renderHapticTouch() {
    const container = document.getElementById('main-content') || document.getElementById('messages-container');
    if (!container) return;

    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const partnerName = isJose ? 'Klárce' : 'Jožkovi';

    container.innerHTML = `
        <div class="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in text-center select-none">
            <!-- Header Banner -->
            <div class="space-y-2">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold">
                    <i class="fas fa-heartbeat animate-pulse"></i> Real-time Dotek na Dálku
                </div>
                <h1 class="text-3xl font-black text-white uppercase tracking-tight">Haptic Touch Pad</h1>
                <p class="text-xs text-gray-300 max-w-md mx-auto">
                    Klepněte na dotykovou plochu nebo vyberte rytmus. Váš telefon okamžitě pošle vibrace a tlukot srdce přímo do ruky ${partnerName}.
                </p>
            </div>

            <!-- Central Pulsing Touch Pad -->
            <div class="relative py-6 flex items-center justify-center">
                <div id="haptic-touch-pad" class="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-pink-600/30 via-purple-600/20 to-pink-900/40 border-2 border-pink-400/50 shadow-[0_0_50px_rgba(235,69,158,0.3)] flex flex-col items-center justify-center cursor-pointer transition-transform transform active:scale-95 group overflow-hidden">
                    <!-- Ambient Inner Ripple -->
                    <div class="absolute inset-0 rounded-full bg-pink-500/10 animate-ping opacity-30 pointer-events-none"></div>
                    <div class="absolute inset-4 rounded-full border border-pink-400/20 pointer-events-none"></div>

                    <!-- Heart Icon -->
                    <span class="text-6xl sm:text-7xl transform group-hover:scale-110 group-active:scale-90 transition-transform filter drop-shadow-[0_0_15px_rgba(235,69,158,0.8)]">
                        🫀
                    </span>

                    <span class="text-xs font-black text-white uppercase tracking-wider mt-3 font-mono">
                        Klepni Rytmus
                    </span>
                    <span class="text-[10px] text-pink-300/80 font-medium">
                        nebo podrž pro tep
                    </span>
                </div>
            </div>

            <!-- Live Status Feedback -->
            <div id="haptic-status-badge" class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-gray-400">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Připraveno k odeslání doteku</span>
            </div>

            <!-- Preset Patterns -->
            <div class="space-y-3 pt-4 border-t border-white/10">
                <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">
                    Přednastavené Rytmy Lásky
                </h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    ${HAPTIC_PRESETS.map(preset => `
                        <button class="haptic-preset-btn p-4 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] border border-[var(--border-subtle)] hover:border-pink-500/40 text-left space-y-1.5 transition active:scale-95 group" data-preset-id="${preset.id}">
                            <div class="text-2xl group-hover:scale-110 transition-transform">${preset.icon}</div>
                            <h4 class="text-xs font-black text-white group-hover:text-pink-300 transition-colors">${preset.name}</h4>
                            <p class="text-[9px] text-gray-400 leading-tight">${preset.desc}</p>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const touchPad = document.getElementById('haptic-touch-pad');
    const statusBadge = document.getElementById('haptic-status-badge');

    // Tap Handling & Rhythm Recorder
    let lastTapTime = 0;

    const handlePadTap = () => {
        const now = Date.now();
        playHeartbeat();
        triggerHaptic('medium');

        // Visual ripple animation
        touchPad.classList.add('ring-4', 'ring-pink-400/80');
        setTimeout(() => touchPad.classList.remove('ring-4', 'ring-pink-400/80'), 150);

        const delta = lastTapTime > 0 ? Math.min(600, now - lastTapTime) : 100;
        lastTapTime = now;
        tapSequence.push(delta);

        if (statusBadge) {
            statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span> <span class="text-pink-300 font-bold">Zaznamenávám rytmus (${tapSequence.length} klepnutí)...</span>`;
        }

        clearTimeout(tapRecordTimeout);
        tapRecordTimeout = setTimeout(async () => {
            if (tapSequence.length > 0) {
                const patternToSend = tapSequence.length === 1 ? [100, 100, 100] : [...tapSequence];
                await broadcastHapticPulse({
                    type: 'custom_rhythm',
                    name: 'Vlastní klepnutí',
                    pattern: patternToSend
                });

                if (statusBadge) {
                    statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> <span class="text-emerald-300 font-bold">Rytmus odeslán ${partnerName}! 💖</span>`;
                    setTimeout(() => {
                        if (statusBadge) statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span>Připraveno k odeslání doteku</span>`;
                    }, 2500);
                }
                tapSequence = [];
                lastTapTime = 0;
            }
        }, 800);
    };

    touchPad?.addEventListener('click', handlePadTap);

    // Preset buttons
    container.querySelectorAll('.haptic-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetId = btn.getAttribute('data-preset-id');
            sendHapticPreset(presetId);
        });
    });
}
