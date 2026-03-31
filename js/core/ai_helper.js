import { state } from './state.js';
import { supabase } from './supabase.js';

/**
 * AI Helper for Gemini integration
 */
export const AI = {
    /**
     * Generates content using Gemini API
     * Note: In a real app, this should go through a backend proxy for security.
     * For this project, we assume a Supabase Edge Function or direct API access.
     */
    async generateFlashcards(topicTitle, content) {
        // Fallback for demo if no API key is configured
        // In a real scenario, we'd call fetch('https://generativelanguage.googleapis.com...')
        
        const prompt = `Jsi expert na vzdělávání. Přečti si následující studijní poznámky k tématu "${topicTitle}" a vytvoř z nich 5 až 8 kvalitních testovacích otázek (flashcards). 
        Odpověz POUZE ve formátu čistého JSON pole objektů, nic jiného nepiš. 
        Formát: [{"q": "otázka", "a": "odpověď"}]
        
        Poznámky:
        ${content}`;

        try {
            // Check if we have a proxy or direct key (placeholder logic)
            // For now, let's look for a 'gemini_api_key' in localStorage or state
            const apiKey = localStorage.getItem('GEMINI_API_KEY');
            if (!apiKey) {
                throw new Error("Chybí Gemini API klíč v localStorage ('GEMINI_API_KEY').");
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                        responseMimeType: "application/json"
                    }
                })
            });

            const data = await response.json();
            const resultText = data.candidates[0].content.parts[0].text;
            return JSON.parse(resultText);
        } catch (e) {
            console.error("AI Generation Error:", e);
            throw e;
        }
    }
};
