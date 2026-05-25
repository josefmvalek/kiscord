import { state } from './state.js';

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function isSoundEnabled() {
    return state && state.settings && state.settings.soundEnabled;
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

// Global window event listener to resume AudioContext upon first interaction
if (typeof window !== 'undefined') {
    const resumeContext = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        window.removeEventListener('click', resumeContext);
        window.removeEventListener('keydown', resumeContext);
    };
    window.addEventListener('click', resumeContext);
    window.addEventListener('keydown', resumeContext);
}
