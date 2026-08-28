import { state } from './state.js';

let audioCtx = null;
let userHasInteracted = false;

if (typeof window !== 'undefined') {
    const enableAudio = () => {
        userHasInteracted = true;
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        window.removeEventListener('click', enableAudio);
        window.removeEventListener('keydown', enableAudio);
        window.removeEventListener('touchstart', enableAudio);
    };
    window.addEventListener('click', enableAudio, { once: true, passive: true });
    window.addEventListener('keydown', enableAudio, { once: true, passive: true });
    window.addEventListener('touchstart', enableAudio, { once: true, passive: true });
}

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        if (!AudioContextClass) return null;
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended' && userHasInteracted) {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

function isSoundEnabled() {
    return Boolean(state?.settings?.soundEnabled);
}

/**
 * Plays a paper-like page flip rustling sound
 */
export function playPageFlip() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Base soft tone
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        filter.Q.value = 1.0;

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        // Noise element for papery rustle
        const bufferSize = ctx.sampleRate * 0.15;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        noiseFilter.Q.value = 2.0;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Connections
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
        noiseNode.start(now);
        noiseNode.stop(now + 0.2);
    } catch (e) {
        console.warn("[Sound] Failed to play page flip:", e);
    }
}

/**
 * Plays a clean crystal chime sound (ascending arpeggio E6 -> A6 -> C#7)
 */
export function playChime() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const notes = [1318.51, 1760.00, 2217.46]; // E6, A6, C#7
        const noteDuration = 0.08;

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

            const startTime = now + idx * noteDuration;
            const endTime = startTime + 0.6; // Decays over 0.6s

            gainNode.gain.setValueAtTime(0.001, startTime);
            gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(endTime + 0.1);
        });
    } catch (e) {
        console.warn("[Sound] Failed to play chime:", e);
    }
}

/**
 * Plays a cheerful 8-bit retro arcade ascending scale
 */
export function playArcade() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00]; // C5, E5, G5, C6, E6, G6, C7
        const noteDuration = 0.045;

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

            const startTime = now + idx * noteDuration;
            const endTime = startTime + 0.15;

            gainNode.gain.setValueAtTime(0.001, startTime);
            gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(endTime + 0.05);
        });
    } catch (e) {
        console.warn("[Sound] Failed to play arcade sound:", e);
    }
}

/**
 * Plays a short crisp countdown beep
 * @param {number} freq - Frequency in Hz (e.g. 880 for standard, 1760 for final)
 * @param {number} duration - Duration in seconds
 */
export function playBeep(freq = 880, duration = 0.08) {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.02);
    } catch (e) {
        console.warn("[Sound] Failed to play beep:", e);
    }
}

/**
 * Plays a resonant soft heartbeat thump (lub-dub)
 */
export function playHeartbeat() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Lub (First thump - lower pitch)
        const osc1 = ctx.createOscillator();
        const filter1 = ctx.createBiquadFilter();
        const gain1 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(65, now);
        osc1.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        filter1.type = 'lowpass';
        filter1.frequency.value = 120;

        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.16);

        // Dub (Second thump - slightly higher, shorter delay)
        const dubTime = now + 0.14;
        const osc2 = ctx.createOscillator();
        const filter2 = ctx.createBiquadFilter();
        const gain2 = ctx.createGain();

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(75, dubTime);
        osc2.frequency.exponentialRampToValueAtTime(40, dubTime + 0.14);

        filter2.type = 'lowpass';
        filter2.frequency.value = 140;

        gain2.gain.setValueAtTime(0.001, dubTime);
        gain2.gain.linearRampToValueAtTime(0.25, dubTime + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.16);

        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(dubTime);
        osc2.stop(dubTime + 0.18);
    } catch (e) {
        console.warn("[Sound] Failed to play heartbeat:", e);
    }
}

/**
 * Plays a triumphant celebratory fanfare for Wrapped celebrations
 */
export function playFanfare() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        chord.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            const start = now + i * 0.08;
            const end = start + 0.8;

            gain.gain.setValueAtTime(0.001, start);
            gain.gain.linearRampToValueAtTime(0.12, start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, end);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(end + 0.1);
        });
    } catch (e) {
        console.warn("[Sound] Failed to play fanfare:", e);
    }
}

/**
 * Plays a muted Discord-like server switch pop
 */
export function playServerPop() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
    } catch (e) {
        console.warn("[Sound] Failed to play server pop:", e);
    }
}

/**
 * Plays a triumphant success chord for achievements, workout done, coin awards
 */
export function playSuccessChime() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // F-major triad: F5 (698.46), A5 (880.00), C6 (1046.50), F6 (1396.91)
        const freqs = [698.46, 880.00, 1046.50, 1396.91];
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            const startTime = now + idx * 0.05;
            const endTime = startTime + 0.5;

            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, endTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(endTime + 0.05);
        });
    } catch (e) {
        console.warn("[Sound] Failed to play success chime:", e);
    }
}

/**
 * Plays a refreshing synthetic water drop plop sound (sine pitch ramp with bandpass bubble)
 */
export function playWaterDrop() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Pitch upward bend creating water drop "bloop" effect
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1450, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    } catch (e) {
        console.warn("[Sound] Failed to play water drop:", e);
    }
}

/**
 * Plays a subtle, tactile mechanical pop for quick actions and checkboxes
 */
export function playQuickPop() {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
    } catch (e) {
        console.warn("[Sound] Failed to play quick pop:", e);
    }
}


