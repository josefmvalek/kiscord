import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';

/**
 * Zjednodušený SM-2 algoritmus (SuperMemo-2) pro rozložené opakování.
 * 
 * @param {Object} currentStats - Aktuální statistiky kartičky z DB {ease_factor, interval, repetition_count}
 * @param {String} result - 'good' (Věděl jsem) nebo 'bad' (Netušil jsem)
 * @returns {Object} Nové statistiky k uložení
 */
export function calculateSM2(currentStats, result) {
    let { ease_factor, interval, repetition_count } = currentStats || { ease_factor: 2.5, interval: 0, repetition_count: 0 };
    
    if (result === 'good') {
        if (repetition_count === 0) {
            interval = 1;
        } else if (repetition_count === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * ease_factor);
        }
        repetition_count++;
        // Ease factor se mírně zvyšuje, pokud kartu známe
        ease_factor = Math.max(1.3, ease_factor + 0.1);
    } else {
        // Resetujeme pokrok, ale ease factor se sníží (karta je "těžká")
        repetition_count = 0;
        interval = 1;
        ease_factor = Math.max(1.3, ease_factor - 0.2);
    }
    
    const next_review = new Date();
    next_review.setDate(next_review.getDate() + interval);
    
    return {
        ease_factor,
        interval,
        repetition_count,
        next_review: next_review.toISOString(),
        last_review: new Date().toISOString()
    };
}

/**
 * Uloží výsledek zkoušení do DB.
 */
export async function saveReview(highlightId, result) {
    if (!state.currentUser) return;
    
    try {
        // 1. Zjistit, jestli už máme záznam
        const { data: existing } = await supabase
            .from('matura_flashcards_stats')
            .select('*')
            .eq('highlight_id', highlightId)
            .eq('user_id', state.currentUser.id)
            .single();
            
        const newStats = calculateSM2(existing, result);
        
        if (existing) {
            await supabase
                .from('matura_flashcards_stats')
                .update(newStats)
                .eq('id', existing.id);
        } else {
            await supabase
                .from('matura_flashcards_stats')
                .insert([{
                    highlight_id: highlightId,
                    user_id: state.currentUser.id,
                    ...newStats
                }]);
        }
    } catch (e) {
        console.error("Error saving review stats:", e);
    }
}

/**
 * Získá mastery skóre tématu (0-100)
 */
export async function getTopicMastery(itemId) {
    if (!state.currentUser) return 0;
    
    try {
        // Získáme všechny červené highligty tématu
        const { data: highlights } = await supabase
            .from('matura_highlights')
            .select('id')
            .eq('item_id', itemId)
            .eq('color', 'red');
            
        if (!highlights || highlights.length === 0) return 0; // Pokud není co biflovat, mastery je "0" nebo "100"? Necháme 0.
        
        const countRequired = highlights.length;
        const hIds = highlights.map(h => h.id);
        
        // Získáme naše staty
        const { data: stats } = await supabase
            .from('matura_flashcards_stats')
            .select('repetition_count')
            .in('highlight_id', hIds)
            .eq('user_id', state.currentUser.id);
            
        // "Zvládnutá" karta je ta, co má repetition_count > 2
        const masteredCount = stats ? stats.filter(s => s.repetition_count >= 2).length : 0;
        
        return Math.round((masteredCount / countRequired) * 100);
    } catch (e) {
        console.error("Error calculating mastery:", e);
        return 0;
    }
}
