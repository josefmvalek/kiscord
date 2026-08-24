/**
 * AI Quiz & Flashcards Generation Tools for Matura Module
 */

import { state, refreshMaturaTopics } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { showNotification } from '@core/theme.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { updateTopicCardUI } from './actions.js';

export const checkApiKey = async (isRetry = false) => {
    let key = localStorage.getItem('GEMINI_API_KEY');
    const isValid = key && key.trim().length > 15 && key !== 'undefined' && key !== 'null';
    
    if (!isValid || isRetry) {
        const msg = isRetry 
            ? "Bohužel, zadaný API klíč je neplatný. Vlož prosím správný klíč (případně ho získej zdarma na aistudio.google.com):"
            : "Pro generování AI testů potřebuješ Gemini API klíč. Zkopíruj ho sem (získáš ho zdarma na aistudio.google.com):";
        
        const newKey = await window.showPromptDialog?.(msg);
        if (newKey && newKey.trim().length > 15) {
            localStorage.setItem('GEMINI_API_KEY', newKey.trim());
            return true;
        }
        return false;
    }
    return true;
};

export async function openGeminiSettings() {
    let currentKey = localStorage.getItem('GEMINI_API_KEY') || '';
    const maskedKey = currentKey && currentKey.length > 8 ? currentKey.substring(0, 4) + '...' + currentKey.substring(currentKey.length - 4) : 'Žádný klíč';
    
    const newKey = await window.showPromptDialog?.(`Aktuální Gemini API klíč: ${maskedKey}\n\nVlož nový klíč nebo nech prázdné pro smazání (klíč získáš na aistudio.google.com):`, currentKey);
    
    if (newKey !== null && newKey !== undefined) {
        if (newKey.trim() === '') {
            localStorage.removeItem('GEMINI_API_KEY');
            showNotification('API klíč byl smazán.', 'info');
        } else {
            localStorage.setItem('GEMINI_API_KEY', newKey.trim());
            showNotification('API klíč byl úspěšně uložen! ✅', 'success');
        }
    }
}

function _lockAIButtons(action, locked) {
    document.querySelectorAll(`[data-ai-action="${action}"]`).forEach(b => {
        b.disabled = locked;
        if (locked) {
            b.classList.add('opacity-50', 'cursor-wait');
        } else {
            b.classList.remove('opacity-50', 'cursor-wait');
        }
    });
}

export async function generateAITest(itemId) {
    if (!(await checkApiKey())) return;

    _lockAIButtons(`cards-${itemId}`, true);

    const prog = window.showProgress ? window.showProgress('AI připravuje studijní kartičky (15-20 ks)...') : null;
    let progressVal = 10;
    const interval = setInterval(() => {
        if (progressVal < 95) {
            progressVal += (95 - progressVal) * 0.1;
            if (prog) prog.setProgress(progressVal);
        }
    }, 1000);

    try {
        const { data: kbData } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
        const content = kbData?.content || '';
        if (!content || content.length < 50) {
            clearInterval(interval);
            if (prog) prog.close();
            showNotification('Zápis je příliš krátký pro tvorbu kartiček.', 'warning');
            return;
        }

        let topicTitle = 'Téma';
        if (state.maturaTopics) {
            for (const cat in state.maturaTopics) {
                const found = state.maturaTopics[cat].find(i => i.id === itemId);
                if (found) { topicTitle = found.title; break; }
            }
        }

        const { AI } = await import('@core/ai_helper.js');
        const flashcards = await AI.generateFlashcards(topicTitle, content);

        clearInterval(interval);
        if (prog) {
            prog.setProgress(100);
            prog.setMessage('Kartičky hotovy! 🃏 Ukládám...');
        }

        if (flashcards && flashcards.length > 0) {
            const { error } = await supabase.from('matura_topics').update({ flashcards }).eq('id', itemId);
            if (error) throw error;

            await refreshMaturaTopics();
            triggerConfetti();
            triggerHaptic('success');
            updateTopicCardUI(itemId);
            showNotification(`Kartičky jsou připraveny! 🃏 (${flashcards.length} ks) Klikni na tlačítko níže.`, 'success');

            setTimeout(() => { if (prog) prog.close(); }, 1000);
        }
    } catch (e) {
        clearInterval(interval);
        if (prog) prog.close();
        handleAIGenError(e);
    } finally {
        _lockAIButtons(`cards-${itemId}`, false);
    }
}

export async function generateAIQuiz(itemId) {
    if (!(await checkApiKey())) return;

    _lockAIButtons(`quiz-${itemId}`, true);

    const prog = window.showProgress ? window.showProgress('AI připravuje test (15-20 otázek)...') : null;
    let progressVal = 5;
    const interval = setInterval(() => {
        if (progressVal < 92) {
            progressVal += (92 - progressVal) * 0.12;
            if (prog) prog.setProgress(progressVal);
        }
    }, 1000);

    try {
        const { data: kbData } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
        const content = kbData?.content || '';

        if (!content || content.length < 50) {
            clearInterval(interval);
            if (prog) prog.close();
            showNotification('Zápis je příliš krátký pro tvorbu testu.', 'warning');
            return;
        }

        let topicTitle = 'Téma';
        if (state.maturaTopics) {
            for (const cat in state.maturaTopics) {
                const found = state.maturaTopics[cat].find(i => i.id === itemId);
                if (found) { topicTitle = found.title; break; }
            }
        }

        const { AI } = await import('@core/ai_helper.js');
        const quiz = await AI.generateQuiz(topicTitle, content);

        clearInterval(interval);
        if (prog) {
            prog.setProgress(100);
            prog.setMessage('Test připraven! 🎉 Ukládám...');
        }

        if (quiz && quiz.length > 0) {
            const { error } = await supabase.from('matura_topics').update({ quizzes: quiz }).eq('id', itemId);
            if (error) throw error;

            await refreshMaturaTopics();
            updateTopicCardUI(itemId);

            triggerConfetti();
            triggerHaptic('success');

            showNotification(`Test je připraven! ✅ (${quiz.length} otázek) Klikni na "Cvičný test" pro spuštění.`, 'success');
            setTimeout(() => { if (prog) prog.close(); }, 1500);
        }
    } catch (e) {
        clearInterval(interval);
        if (prog) prog.close();
        console.error("AI Quiz Gen Error:", e);
        handleAIGenError(e);
    } finally {
        _lockAIButtons(`quiz-${itemId}`, false);
    }
}

function handleAIGenError(e) {
    console.error("AI Gen Error:", e);

    if (e.message === 'API_KEY_MISSING') {
        showNotification('Chybí Gemini API klíč! Klikni na ⚙️ a vlož ho.', 'error');
        checkApiKey(false);
    } else if (e.message === 'API_KEY_INVALID') {
        showNotification('Gemini API klíč je neplatný. Vlož prosím správný klíč.', 'error');
        checkApiKey(true);
    } else if (e.message === 'API_LIMIT_REACHED') {
        showNotification('⏳ AI limit vyčerpán — systém to zkusil 5× a nepodařilo se. Zkus to prosím za chvíli.', 'warning');
    } else if (e.message === 'AI_PARSING_ERROR') {
        showNotification('AI vrátila neúplnou odpověď. Zkus téma trochu zkrátit nebo zkus znovu.', 'error');
    } else if (e.message === 'AI_EMPTY_RESPONSE') {
        showNotification('AI nevrátila žádná data. Ověř obsah zápisku a zkus znovu.', 'error');
    } else {
        showNotification(`Nepodařilo se vygenerovat data. ${e.message || 'Zkontroluj připojení.'}`, 'error');
    }
}
