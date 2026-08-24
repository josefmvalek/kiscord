/**
 * Compact Daily Question Card for Main Dashboard (#můj-den)
 */

import { state, saveStateToCache, awardLoveCoinsToCurrentUser } from '@core/state.js';
import { isJosef } from '@core/auth.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { supabase } from '@core/supabase.js';

export function generateDailyQuestionCard() {
    if (!state.dailyQuestion) return '';

    const myAnswer = state.dailyAnswers?.find(a => a.user_id === state.currentUser?.id);
    const partnerAnswer = state.dailyAnswers?.find(a => a.user_id !== state.currentUser?.id);
    const isRevealed = !!(myAnswer && partnerAnswer);

    let content = `
        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm select-none">
            <div class="flex justify-between items-start mb-3 pb-2 border-b border-[var(--border-subtle)]">
                <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-2 leading-none">
                    <i class="fas fa-comment-dots text-[#faa61a]"></i> Dnešní otázka pro nás dva
                </h3>
                <button onclick="window.switchChannel('daily-questions')" 
                        class="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-header)] transition font-bold uppercase tracking-wider flex items-center gap-1">
                    archiv <i class="fas fa-chevron-right text-[8px] text-[var(--blurple)]"></i>
                </button>
            </div>

            <div class="mb-4">
                <h2 class="text-sm sm:text-base font-bold text-[var(--text-header)] leading-relaxed">"${state.dailyQuestion.text}"</h2>
            </div>
    `;

    if (!myAnswer) {
        content += `
            <div class="space-y-3">
                <div class="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)] focus-within:border-[var(--blurple)] transition-colors">
                    <textarea id="dashboard-daily-answer-input" 
                              placeholder="Tvoje upřímná odpověď..." 
                              class="w-full bg-transparent text-[var(--text-normal)] text-xs sm:text-sm outline-none resize-none min-h-[65px] placeholder-[var(--text-muted)] font-medium leading-relaxed custom-scrollbar"></textarea>
                </div>
                <button id="dashboard-btn-submit-answer"
                        onclick="window.submitDailyAnswerFromDashboard()" 
                        class="w-full bg-[var(--blurple)] hover:bg-[var(--blurple-hover)] text-white py-2.5 px-4 rounded-xl font-bold transition shadow active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]">
                    <i class="fas fa-paper-plane text-[10px]"></i> <span class="text-xs uppercase font-black tracking-wider">Odeslat moji odpověď</span>
                </button>
            </div>
        `;
    } else if (!isRevealed) {
        content += `
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between min-h-[85px]">
                    <span class="text-[9px] uppercase font-black text-[var(--text-muted)] block">Tvoje odpověď</span>
                    <p class="text-xs text-[var(--text-normal)] italic line-clamp-3 my-1 leading-snug">${myAnswer.answer_text}</p>
                    <span class="text-[8px] text-emerald-400 font-black uppercase self-end">Odesláno ✅</span>
                </div>
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center min-h-[85px]">
                    ${partnerAnswer ? `
                        <div class="flex flex-col items-center">
                            <i class="fas fa-lock text-amber-400 text-base mb-1"></i>
                            <p class="text-[10px] text-[var(--text-header)] font-bold leading-none">Dostupná!</p>
                            <p class="text-[8px] text-[var(--text-muted)] uppercase font-black mt-0.5">Čeká na odemčení</p>
                        </div>
                    ` : `
                        <i class="fas fa-clock text-[var(--text-muted)] text-base mb-1"></i>
                        <p class="text-[10px] text-[var(--text-muted)] font-bold uppercase">Partner ještě nepíše</p>
                    `}
                </div>
            </div>
        `;
    } else {
        const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
        const partnerName = isMeJose ? 'Klárka' : 'Jožka';

        content += `
            <div class="space-y-2.5">
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border-l-[3px] border-[var(--blurple)]">
                    <span class="text-[9px] font-black uppercase text-[var(--blurple)] block mb-1">Já</span>
                    <p class="text-xs text-[var(--text-normal)] leading-relaxed font-medium">${myAnswer.answer_text}</p>
                </div>
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border-l-[3px] border-[#eb459e]">
                    <span class="text-[9px] font-black uppercase text-[#eb459e] block mb-1">${partnerName}</span>
                    <p class="text-xs text-[var(--text-normal)] leading-relaxed font-medium">${partnerAnswer.answer_text}</p>
                </div>
                <div class="text-center pt-1">
                    <span class="text-[9px] bg-amber-400/15 text-amber-300 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                        <i class="fas fa-unlock-alt mr-1"></i> Společný kód odemčen
                    </span>
                </div>
            </div>
        `;
    }

    content += `</div>`;
    return content;
}

export async function submitDailyAnswerFromDashboard() {
    const input = document.getElementById('dashboard-daily-answer-input');
    const answer = input?.value.trim();
    if (!answer || !state.dailyQuestion) return;

    const btn = document.getElementById('dashboard-btn-submit-answer');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Odesílám...';
    }

    try {
        const { safeUpsert } = await import('@core/offline.js');
        const result = await safeUpsert('daily_answers', [{
            question_id: state.dailyQuestion.id,
            user_id: state.currentUser?.id,
            answer_text: answer
        }], 'question_id,user_id');

        if (result.error) throw result.error;
        triggerHaptic('success');

        const { data } = await supabase.from('daily_answers').select('*').eq('question_id', state.dailyQuestion.id);
        if (data) state.dailyAnswers = data;

        saveStateToCache();
        await awardLoveCoinsToCurrentUser(3, 'odpověď na denní otázku');

        window.dispatchEvent(new CustomEvent('daily-questions-updated'));
    } catch (err) {
        console.error("[Dashboard] Answer Submit Error:", err);
        showNotification(`Nepodařilo se odeslat: ${err.message}`, "error");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane text-[10px]"></i> <span class="text-xs uppercase font-black">Zkusit znovu</span>';
        }
    }
}
