import { state } from '@core/state.js';

export function renderTodayChallengeHtml(todayKey, dayIndex, isTripStarted) {
    let challenge = null;

    // Check if there is a custom scheduled challenge for today in the database
    const dbRecord = state.brigadeChallenges?.find(c => c.date_key === todayKey) || {};
    
    if (dbRecord.title && dbRecord.description) {
        // Use custom challenge scheduled in Supabase
        challenge = {
            title: dbRecord.title,
            description: dbRecord.description,
            category: dbRecord.category || "Plánovaná ✍️"
        };
    } else if (!isTripStarted) {
        // Pre-trip preparation challenges
        challenge = {
            title: "🎒 Velké Balení & Očekávání",
            description: "Sbalte si kufry, zkontrolujte, zda máte teplé ponožky, bundy do deště a hlavně dobrou náladu! Odjezd za pár dní! 🇦🇹🏔️",
            category: "Příprava ✈️"
        };
    } else {
        // Recycled challenges based on day index
        const idx = dayIndex % CHALLENGES_POOL.length;
        challenge = CHALLENGES_POOL[idx];
    }

    // Check if revealed in localStorage
    const revealKey = `kiscord_revealed_challenge_${todayKey}`;
    const isRevealed = localStorage.getItem(revealKey) === 'true';

    const completedByJose = dbRecord.completed_by_jose || false;
    const completedByKlarka = dbRecord.completed_by_klarka || false;

    // Check current user status
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids?.jose;
    const amICompleted = isMeJose ? completedByJose : completedByKlarka;

    if (!isRevealed && isTripStarted) {
        // RENDER COVER CARD (Locked Scratch Card)
        return `
            <div class="flex items-center justify-center p-4">
                <div onclick="window.AlpskaVyzva.scratchCard()" 
                     class="glass-card bg-gradient-to-br from-indigo-950 to-slate-900 border border-purple-500/30 rounded-3xl p-8 max-w-sm text-center shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 relative overflow-hidden group">
                    <div class="absolute -right-10 -top-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                    <div class="absolute -left-10 -bottom-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                    
                    <span class="text-6xl block mb-6 animate-pulse">🏔️🔒</span>
                    <h2 class="text-white text-xl font-black uppercase tracking-wider mb-2">Dnešní výzva uzamčena</h2>
                    <p class="text-xs text-purple-200/60 leading-relaxed font-semibold mb-6">
                        Každé ráno na vás čeká nová tajná mise v Alpách.<br>Klikněte a setřete los pro odhalení výzvy!
                    </p>
                    <div class="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 py-3.5 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] transition duration-300">
                        Setřít kartu ✨
                    </div>
                </div>
            </div>
        `;
    } else {
        // RENDER UNLOCKED CHALLENGE
        const joseStatusBadge = completedByJose 
            ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">Splněno ✅</span>`
            : `<span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-white/30 text-[10px] font-black uppercase tracking-wider">Nesplněno ⏳</span>`;
        
        const klarkaStatusBadge = completedByKlarka
            ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">Splněno ✅</span>`
            : `<span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-white/30 text-[10px] font-black uppercase tracking-wider">Nesplněno ⏳</span>`;

        return `
            <div class="space-y-6">
                <!-- Main Challenge Card -->
                <div class="glass-card bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl relative overflow-hidden text-center animate-scale-up">
                    <span class="text-[9px] font-black uppercase tracking-widest text-[#3ba55c] bg-[#3ba55c]/10 px-3 py-1 rounded-full w-fit mx-auto mb-4 block">
                        ${challenge.category}
                    </span>
                    
                    <h2 class="text-white text-2xl font-black tracking-tight mb-3 italic">"${challenge.title}"</h2>
                    <p class="text-gray-300 font-medium text-sm leading-relaxed mb-6 px-2">
                        ${challenge.description}
                    </p>
                    
                    <!-- Partner Completion States -->
                    <div class="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 mb-6">
                        <div class="flex flex-col items-center gap-1.5 bg-black/20 p-3 rounded-2xl">
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Jožka</span>
                            ${joseStatusBadge}
                        </div>
                        <div class="flex flex-col items-center gap-1.5 bg-black/20 p-3 rounded-2xl">
                            <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Klárka</span>
                            ${klarkaStatusBadge}
                        </div>
                    </div>

                    <!-- Complete action button -->
                    ${amICompleted ? `
                        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-pulse">
                            Splnil jsi dnešní výzvu! Skvělá práce! 🏆
                        </div>
                    ` : `
                        <button onclick="window.AlpskaVyzva.openCompleteChallengeModal('${todayKey}')" 
                                class="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group transform active:scale-95">
                            <i class="fas fa-check group-hover:scale-125 transition-transform"></i> Splnit dnešní výzvu! 
                        </button>
                    `}
                </div>

                <!-- Shared Gallery for today's challenge -->
                ${(dbRecord.jose_image_url || dbRecord.klarka_image_url) ? `
                    <div class="space-y-3">
                        <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <i class="fas fa-camera text-[#3ba55c]"></i> Důkazy z terénu 📸
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            ${dbRecord.jose_image_url ? `
                                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-4 overflow-hidden flex flex-col gap-2">
                                    <div class="w-full h-48 rounded-2xl overflow-hidden shadow-inner">
                                        <img src="${dbRecord.jose_image_url}" loading="lazy" class="w-full h-full object-cover">
                                    </div>
                                    <div class="flex items-start gap-2 mt-1">
                                        <div class="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-[8px] font-black text-blue-300 flex items-center justify-center shadow flex-shrink-0 flex-shrink-0">J</div>
                                        <p class="text-xs text-gray-300 italic">"${dbRecord.jose_note || 'Splněno!'}"</p>
                                    </div>
                                </div>
                            ` : ''}
                            ${dbRecord.klarka_image_url ? `
                                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-4 overflow-hidden flex flex-col gap-2">
                                    <div class="w-full h-48 rounded-2xl overflow-hidden shadow-inner">
                                        <img src="${dbRecord.klarka_image_url}" loading="lazy" class="w-full h-full object-cover">
                                    </div>
                                    <div class="flex items-start gap-2 mt-1">
                                        <div class="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/30 text-[8px] font-black text-pink-300 flex items-center justify-center shadow flex-shrink-0 flex-shrink-0">K</div>
                                        <p class="text-xs text-gray-300 italic">"${dbRecord.klarka_note || 'Splněno!'}"</p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

function renderAllChallengesHtml(dayIndex, departureDate) {
    const rows = [];
    const nowKey = new Date().toISOString().split("T")[0];

    for (let day = 1; day <= 92; day++) {
        const targetDate = new Date(departureDate);
        targetDate.setDate(departureDate.getDate() + day - 1);
        const dateKey = targetDate.toISOString().split("T")[0];

        // Find database completion record
        const dbRecord = state.brigadeChallenges?.find(c => c.date_key === dateKey) || {};
        const completedByJose = dbRecord.completed_by_jose || false;
        const completedByKlarka = dbRecord.completed_by_klarka || false;

        let challenge = null;

        if (dbRecord.title && dbRecord.description) {
            challenge = {
                title: dbRecord.title,
                description: dbRecord.description,
                category: dbRecord.category || "Plánovaná ✍️"
            };
        } else {
            const idx = (day - 1) % CHALLENGES_POOL.length;
            challenge = CHALLENGES_POOL[idx];
        }

        const dateNice = targetDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
        const isPastOrToday = dateKey <= nowKey;

        rows.push(`
            <div onclick="window.AlpskaVyzva.viewChallengeDetail('${dateKey}', ${day}, ${isPastOrToday})"
                 class="glass-card bg-white/[0.02] border ${dateKey === nowKey ? 'border-[#3ba55c]/30 bg-[#3ba55c]/[0.01]' : 'border-white/5'} rounded-2xl p-4 hover:border-white/10 transition-all flex items-center justify-between gap-4 cursor-pointer">
                <div class="flex items-center gap-3.5 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-black/20 flex flex-col items-center justify-center flex-shrink-0">
                        <span class="text-[9px] font-black text-white/40 block leading-none">DEN</span>
                        <span class="text-sm font-black text-white leading-none mt-0.5">${day}</span>
                    </div>
                    <div class="min-w-0">
                        <h4 class="text-xs font-black text-white truncate leading-snug">${challenge.title}</h4>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[8px] font-bold text-gray-500">${challenge.category}</span>
                            <span class="text-[8px] text-white/30 font-bold">${dateNice}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="flex -space-x-1.5">
                        <div class="w-5 h-5 rounded-full border border-[#2f3136] flex items-center justify-center text-[7px] font-black text-white shadow ${completedByJose ? 'bg-blue-500/80' : 'bg-white/5 opacity-30'}">J</div>
                        <div class="w-5 h-5 rounded-full border border-[#2f3136] flex items-center justify-center text-[7px] font-black text-white shadow ${completedByKlarka ? 'bg-pink-500/80' : 'bg-white/5 opacity-30'}">K</div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-600 text-[10px]"></i>
                </div>
            </div>
        `);
    }

    return `
        <div class="space-y-3">
            <div class="flex justify-between items-center mb-1">
                <h3 class="text-sm font-black text-white uppercase tracking-wider">Seznam všech 92 alpských výzev</h3>
                <span class="text-[9px] bg-[#3ba55c]/10 text-[#3ba55c] px-2 py-0.5 rounded-full font-bold">Den 1 až 92</span>
            </div>
            ${rows.join('')}
        </div>
    `;
}

