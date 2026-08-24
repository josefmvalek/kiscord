/**
 * Kiscord Voice Logger & Natural Language Command Parser
 * Native Web Speech API integration with Czech grammar parsers for Gym & Health tracking.
 */

const NUMBER_WORDS_MAP = {
    'jedna': 1, 'jednu': 1, 'jeden': 1,
    'dvě': 2, 'dva': 2,
    'tři': 3,
    'čtyři': 4,
    'pět': 5,
    'šest': 6,
    'sedm': 7,
    'osm': 8,
    'devět': 9,
    'deset': 10
};

/**
 * Normalizes spoken numbers in text (e.g. "dvě sklenice" -> "2 sklenice")
 * @param {string} text
 * @returns {string}
 */
export function normalizeSpokenNumbers(text) {
    let words = (text || '').toLowerCase().split(/\s+/);
    words = words.map(w => {
        const clean = w.replace(/[.,!?]/g, '');
        if (NUMBER_WORDS_MAP[clean] !== undefined) {
            return String(NUMBER_WORDS_MAP[clean]);
        }
        return w;
    });
    return words.join(' ');
}

/**
 * Parses spoken gym commands
 * Examples:
 * - "bench press 80 kilo 8 opakování"
 * - "mrtvý tah 120 kg 5 opakování"
 * - "pauza", "hotovo", "přeskočit"
 * @param {string} transcript
 * @returns {{ type: 'set'|'control'|'unknown', exercise?: string, weight_kg?: number, reps?: number, action?: string }}
 */
export function parseGymVoiceCommand(transcript) {
    const raw = normalizeSpokenNumbers(transcript || '').trim();

    if (/^(pauza|hotovo|další|série hotova)/i.test(raw)) {
        return { type: 'control', action: 'complete_set' };
    }
    if (/^(přeskočit|přeskoč pauzu|konec pauzy)/i.test(raw)) {
        return { type: 'control', action: 'skip_rest' };
    }

    // Pattern: [exercise name] [weight] (kg/kilo/kila) [reps] (opakování/opáček/krát)
    const weightMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kila|kilech)?/i);
    const repsMatch = raw.match(/(\d+)\s*(?:opakování|opáček|opak|x|krát)/i);

    let weight_kg = weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : 0;
    let reps = repsMatch ? parseInt(repsMatch[1], 10) : 0;

    // Fallback regex for pure sequence: "bench 80 8"
    if (!reps && raw.match(/\b(\d+)\s+(\d+)\b/)) {
        const parts = raw.match(/\b(\d+)\s+(\d+)\b/);
        if (parts) {
            weight_kg = parseFloat(parts[1]);
            reps = parseInt(parts[2], 10);
        }
    }

    let exercise = raw
        .replace(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kila|kilech)?/gi, '')
        .replace(/(\d+)\s*(?:opakování|opáček|opak|x|krát)?/gi, '')
        .replace(/zapiš|zaznamenej|přidej/gi, '')
        .trim();

    if (reps > 0 || weight_kg > 0) {
        return {
            type: 'set',
            exercise: exercise || 'Aktivní cvik',
            weight_kg,
            reps: reps || 10
        };
    }

    return { type: 'unknown' };
}

/**
 * Parses health tracking voice commands
 * Examples:
 * - "vypil jsem 2 sklenice vody" -> { type: 'water', amount: 2 }
 * - "spal jsem 7.5 hodiny" -> { type: 'sleep', hours: 7.5 }
 * @param {string} transcript
 */
export function parseHealthVoiceCommand(transcript) {
    const raw = normalizeSpokenNumbers(transcript || '').trim();

    if (raw.includes('voda') || raw.includes('sklenic') || raw.includes('vypil')) {
        const match = raw.match(/(\d+)/);
        const amount = match ? parseInt(match[1], 10) : 1;
        return { type: 'water', amount };
    }

    if (raw.includes('spán') || raw.includes('spal') || raw.includes('hodin')) {
        const match = raw.match(/(\d+(?:[.,]\d+)?)/);
        const hours = match ? parseFloat(match[1].replace(',', '.')) : 8;
        return { type: 'sleep', hours };
    }

    return { type: 'unknown' };
}

export class VoiceLogger {
    constructor() {
        /** @type {any} */
        this.recognition = null;
        this.isListening = false;
    }

    /**
     * Start speech recognition
     * @param {(transcript: string) => void} onResult
     * @param {(error: any) => void} [onError]
     */
    start(onResult, onError) {
        const SpeechRec = typeof window !== 'undefined'
            ? (window.SpeechRecognition || window.webkitSpeechRecognition)
            : null;

        if (!SpeechRec) {
            if (onError) onError(new Error('Web Speech API is not supported in this browser.'));
            return false;
        }

        try {
            this.recognition = new SpeechRec();
            this.recognition.lang = 'cs-CZ';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isListening = true;
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0]?.[0]?.transcript || '';
                if (typeof onResult === 'function') {
                    onResult(transcript);
                }
            };

            this.recognition.onerror = (err) => {
                this.isListening = false;
                if (typeof onError === 'function') onError(err);
            };

            this.recognition.onend = () => {
                this.isListening = false;
            };

            this.recognition.start();
            return true;
        } catch (e) {
            this.isListening = false;
            if (typeof onError === 'function') onError(e);
            return false;
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch {}
            this.isListening = false;
        }
    }
}

export const voiceLogger = new VoiceLogger();
