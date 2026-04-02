import { state } from './state.js';
import { supabase } from './supabase.js';

/**
 * AI Helper for Gemini integration
 */
export const AI = {
    /**
     * Truncates content to a safe token limit while preserving beginning and end.
     * @param {string} text - Raw content
     * @param {number} maxChars - Target character limit (~4 chars/token)
     */
    _truncateContent(text, maxChars = 5000) {
        if (!text || text.length <= maxChars) return text;
        const headChars = Math.floor(maxChars * 0.75);
        const tailChars = maxChars - headChars;
        const head = text.substring(0, headChars);
        const tail = text.substring(text.length - tailChars);
        return `${head}\n\n[... obsah zkrácen ...]\n\n${tail}`;
    },

    /**
     * Generates flashcard content using Gemini API
     */
    async generateFlashcards(topicTitle, content) {
        const safeContent = this._truncateContent(content, 5000);

        const prompt = `Jsi expert na vzdělávání. Přečti si studijní poznámky k tématu "${topicTitle}" a vytvoř z nich 12 až 15 kvalitních flashcard otázek.
        
        STRIKTNÍ PRAVIDLA:
        1. Odpověz POUZE validním JSON polem objektů.
        2. Nic jiného nepiš.
        3. Formát: [{"q": "otázka", "a": "odpověď"}]
        
        Poznámky:
        ${safeContent}`;

        try {
            const apiKey = localStorage.getItem('GEMINI_API_KEY');
            if (!apiKey) throw new Error("API_KEY_MISSING");

            const response = await this._fetchWithRetry(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 3072
                        }
                    })
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (response.status === 401 || response.status === 403) throw new Error("API_KEY_INVALID");
                if (response.status === 429) throw new Error("API_LIMIT_REACHED");
                throw new Error(`AI_API_ERROR: ${errData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!resultText) throw new Error("AI_EMPTY_RESPONSE");

            return this._extractJSON(resultText);
        } catch (e) {
            console.error("[AI Flashcards] Error:", e);
            throw e;
        }
    },

    async generateQuiz(topicTitle, content) {
        const safeContent = this._truncateContent(content, 5000);

        const prompt = `Jsi expert na vzdělávání. Přečti si studijní poznámky k tématu "${topicTitle}" a vytvoř z nich test s výběrem z možností (A/B/C/D).
        Vytvoř 10 až 15 otázek pokrývajících klíčové části tématu.
        
        STRIKTNÍ PRAVIDLA:
        1. Odpověz POUZE validním JSON polem. Nevynechej závorky.
        2. Žádný text před ani za JSON.
        3. Formát: [{"q": "otázka", "options": ["A", "B", "C", "D"], "correct": 0}]
        4. Ukonči pole závorkou ].

        Poznámky:
        ${safeContent}`;

        try {
            const apiKey = localStorage.getItem('GEMINI_API_KEY');
            if (!apiKey) throw new Error("API_KEY_MISSING");

            const response = await this._fetchWithRetry(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 3072
                        }
                    })
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (response.status === 401 || response.status === 403) throw new Error("API_KEY_INVALID");
                if (response.status === 429) throw new Error("API_LIMIT_REACHED");
                throw new Error(`AI_API_ERROR: ${errData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!resultText) throw new Error("AI_EMPTY_RESPONSE");

            return this._extractJSON(resultText);
        } catch (e) {
            console.error("[AI Quiz] Error:", e);
            throw e;
        }
    },

    /**
     * Robust JSON extraction from AI response.
     * Also attempts to repair truncated JSON arrays.
     */
    _extractJSON(text) {
        let candidate = text.trim();
        try {
            // 1. Try to find the JSON block inside markdown if present
            const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (match) {
                candidate = match[1].trim();
            } else {
                // 2. Identify the first [ or { and the last ] or }
                const startArray = text.indexOf('[');
                const endArray = text.lastIndexOf(']');
                const startObj = text.indexOf('{');
                const endObj = text.lastIndexOf('}');

                if (startArray !== -1 && endArray !== -1 && (startObj === -1 || startArray < startObj)) {
                    candidate = text.substring(startArray, endArray + 1);
                } else if (startObj !== -1 && endObj !== -1) {
                    candidate = text.substring(startObj, endObj + 1);
                }
            }

            return JSON.parse(candidate);
        } catch (e) {
            // 3. Attempt JSON repair for truncated arrays (remove last incomplete item)
            try {
                const startArray = candidate.indexOf('[');
                if (startArray !== -1) {
                    let repaired = candidate.substring(startArray);
                    // Remove the last incomplete object (find last complete },)
                    const lastCompleteItem = repaired.lastIndexOf('},');
                    if (lastCompleteItem !== -1) {
                        repaired = repaired.substring(0, lastCompleteItem + 1) + ']';
                        const parsed = JSON.parse(repaired);
                        console.warn(`[AI JSON] Repaired truncated JSON — kept ${parsed.length} items.`);
                        return parsed;
                    }
                }
            } catch (repairErr) { /* repair failed, throw original */ }

            console.error("[AI JSON Extract] Failed to parse content:", candidate);
            throw new Error("AI_PARSING_ERROR");
        }
    },

    /**
     * Internal fetch helper with automated retries on 429 (Rate Limit).
     * Respects the Retry-After header from the API response.
     */
    async _fetchWithRetry(url, options, maxRetries = 3, initialDelay = 5000) {
        let delay = initialDelay;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const response = await fetch(url, options);

                if (response.status === 429 && i < maxRetries) {
                    // Respect Retry-After header if present (in seconds)
                    const retryAfterHeader = response.headers.get('Retry-After');
                    const retryAfterMs = retryAfterHeader
                        ? parseInt(retryAfterHeader, 10) * 1000
                        : 0;
                    // Also check JSON body for retryDelay (Gemini specific)
                    let retryDelayFromBody = 0;
                    try {
                        const errBody = await response.clone().json();
                        const retryDelayStr = errBody?.error?.details?.find(
                            d => d['@type']?.includes('RetryInfo')
                        )?.retryDelay;
                        if (retryDelayStr) {
                            // format: "30s" or "60s"
                            retryDelayFromBody = parseInt(retryDelayStr) * 1000;
                        }
                    } catch (_) { /* ignore body parse errors */ }

                    const waitMs = Math.max(delay, retryAfterMs, retryDelayFromBody);
                    const waitSec = Math.round(waitMs / 1000);

                    console.warn(`[AI] Rate limit hit (429). Waiting ${waitSec}s before retry... (${i + 1}/${maxRetries})`);
                    if (window.showNotification) {
                        showNotification(`✨ AI je zaneprázdněná, čekám ${waitSec}s... (pokus ${i + 1}/${maxRetries})`, 'warning');
                    }

                    await new Promise(res => setTimeout(res, waitMs));
                    delay = Math.min(delay * 2, 60000); // cap at 60s
                    continue;
                }

                return response;
            } catch (e) {
                if (i === maxRetries) throw e;
                console.warn(`[AI] Network error, retrying in ${delay}ms...`, e.message);
                await new Promise(res => setTimeout(res, delay));
                delay = Math.min(delay * 2, 60000);
            }
        }
    }
};
