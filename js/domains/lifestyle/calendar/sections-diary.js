/**
 * Alpský Deníček Section Renderer for Calendar Day Modal
 */

import { state } from '@core/state.js';

export function renderDiarySectionHtml(dateKey) {
    const diaryEntries = state.brigadeDiary || [];
    const dayEntries = diaryEntries.filter(e => e.date_key === dateKey);

    if (dayEntries.length === 0) {
        return ""; // No diary logged for this day
    }

    const jose = dayEntries.find(e => e.user_id === state.user_ids?.jose);
    const klarka = dayEntries.find(e => e.user_id === state.user_ids?.klarka);

    const isRevealed = !!(jose && klarka);
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids?.jose;

    const renderCol = (userLabel, userColor, entry, isMe) => {
        if (!entry) {
            return `
                <div class="flex flex-col items-center justify-center py-4 opacity-30 text-center">
                    <i class="fas fa-clock text-xs mb-1"></i>
                    <span class="text-[9px] font-bold uppercase tracking-wider">Nezadáno</span>
                </div>
            `;
        }

        const canSee = isMe || isRevealed;
        if (!canSee) {
            return `
                <div class="flex flex-col items-center justify-center py-4 text-center text-amber-500 animate-pulse">
                    <i class="fas fa-lock text-sm mb-1"></i>
                    <span class="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Uzamčeno</span>
                </div>
            `;
        }

        const stars = Array.from({ length: 5 }).map((_, i) => `<i class="${i < entry.rating ? 'fas' : 'far'} fa-star text-[8px] text-[#faa61a]"></i>`).join('');

        let audioHtml = "";
        if (entry.voice_note_url) {
            audioHtml = `
                <div class="mt-2 pt-2 border-t border-white/5">
                    <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-1">🎙️ Hlasová vzpomínka</span>
                    <audio src="${entry.voice_note_url}" controls class="w-full h-6 rounded-lg bg-black/20 text-xs scale-90 origin-left"></audio>
                </div>
            `;
        }

        return `
            <div class="space-y-1.5 mt-1 text-left">
                <div class="flex justify-between items-center">
                    <div class="flex gap-0.5">${stars}</div>
                    <span class="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Hotovo ✅</span>
                </div>
                <div class="border-t border-white/5 pt-1.5 space-y-1.5">
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">🌸 Highlight</span>
                        <p class="text-[11px] text-gray-200 leading-normal font-semibold">${entry.highlight_text}</p>
                    </div>
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">🌋 Rant</span>
                        <p class="text-[11px] text-red-300/80 leading-normal font-medium">${entry.rant_text}</p>
                    </div>
                    ${audioHtml}
                </div>
            </div>
        `;
    };

    let headerStars = "";
    if (isRevealed && jose && klarka) {
        const avg = Math.round((jose.rating + klarka.rating) / 2);
        headerStars = `<div class="flex items-center gap-0.5 text-[#faa61a]">` +
            Array.from({ length: 5 }).map((_, i) => `<i class="${i < avg ? 'fas' : 'far'} fa-star text-xs"></i>`).join('') +
            `</div>`;
    }

    return `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <h4 class="text-xs font-bold text-pink-400 uppercase flex items-center gap-2">
                    <i class="fas fa-journal-whills"></i> Alpský Deníček
                </h4>
                <div class="flex items-center gap-2">
                    ${headerStars}
                    <button onclick="Calendar.closeDayModal(); window.switchChannel('alpsky-denicek');" 
                            class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider transition">
                        Otevřít deník 📔
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-black/15 rounded-xl border border-white/5 relative overflow-hidden">
                    <span class="text-[8px] font-black uppercase tracking-widest text-blue-300 block mb-1">Jožka</span>
                    ${renderCol('Jožka', 'blue-300', jose, isMeJose)}
                </div>
                <div class="p-3 bg-black/15 rounded-xl border border-white/5 relative overflow-hidden">
                    <span class="text-[8px] font-black uppercase tracking-widest text-pink-300 block mb-1">Klárka</span>
                    ${renderCol('Klárka', 'pink-300', klarka, !isMeJose)}
                </div>
            </div>
        </div>
    `;
}
