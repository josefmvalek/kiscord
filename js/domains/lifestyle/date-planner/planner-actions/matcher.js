import { supabase } from '@core/supabase.js';
import { state, awardLoveCoinsToCurrentUser } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal } from '@core/ui.js';
import { selectLocation } from './location-detail.js';

export function openDateMatcher(preferredCategory = 'all') {
    matcherIndex = 0;
    matcherLiked = [];

    const selectedCountry = getSelectedCountry();
    const candidates = (state.dateLocations || []).filter(l => 
        (l.country || 'CZ') === selectedCountry && (preferredCategory === 'all' || l.cat === preferredCategory)
    );

    if (candidates.length === 0) {
        showNotification("Pro tuto kategorii zatím nemáme žádná místa! 🎲", "info");
        return;
    }

    matcherDeck = [...candidates].sort(() => Math.random() - 0.5);
    renderMatcherModal();
}

function renderMatcherModal() {
    document.getElementById('rande-matcher-modal')?.remove();

    const currentCard = matcherDeck[matcherIndex];

    const modal = document.createElement('div');
    modal.id = 'rande-matcher-modal';
    modal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in select-none';

    if (!currentCard) {
        modal.innerHTML = `
            <div class="bg-[#36393f] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10 text-center space-y-4 animate-scale-up">
                <div class="text-5xl">🎉</div>
                <h3 class="text-xl font-black text-white">Prohlédli jste všechna místa!</h3>
                ${matcherLiked.length > 0 ? `
                    <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-left space-y-1">
                        <div class="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Vybraná místa (${matcherLiked.length}):</div>
                        <div class="text-xs text-white font-bold truncate">${matcherLiked.map(c => c.name).join(', ')}</div>
                    </div>
                ` : '<p class="text-xs text-gray-400">Žádné místo jste tentokrát nevybrali.</p>'}
                <div class="flex gap-2">
                    <button onclick="window.KiscordMap.openDateMatcher()" class="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition">
                        Zamíchat znovu 🔀
                    </button>
                    <button onclick="document.getElementById('rande-matcher-modal').remove()" class="px-4 bg-[#202225] hover:bg-[#2f3136] text-gray-300 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition">
                        Zavřít
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return;
    }

    const rating = (state.dateRatings && state.dateRatings[currentCard.id]) || 0;
    const ratingStr = rating > 0 ? '★'.repeat(rating) : '';

    modal.innerHTML = `
        <div class="bg-[#36393f] w-full max-w-md rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-scale-up">
            <div class="p-4 bg-[#2f3136] border-b border-white/5 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-xl">💖</span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Rande Matcher</h3>
                        <span class="text-[10px] text-gray-400 font-medium">Karta ${matcherIndex + 1} z ${matcherDeck.length}</span>
                    </div>
                </div>
                <button onclick="document.getElementById('rande-matcher-modal').remove()" class="text-gray-400 hover:text-white p-1 rounded-lg transition">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>

            <div class="p-6 space-y-4">
                <div id="matcher-card" class="bg-gradient-to-br from-[#202225] to-[#2b2d32] border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden transition-all duration-300">
                    ${currentCard.image_url ? `
                        <div class="w-full h-44 rounded-2xl overflow-hidden mb-3 shadow-inner">
                            <img src="${currentCard.image_url}" class="w-full h-full object-cover">
                        </div>
                    ` : `
                        <div class="w-20 h-20 rounded-2xl bg-[#eb459e]/15 border border-[#eb459e]/30 flex items-center justify-center text-4xl mx-auto shadow-inner">
                            ${currentCard.icon || '📍'}
                        </div>
                    `}

                    <div>
                        <span class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 inline-block mb-2">
                            ${currentCard.cat === 'food' ? '🍔 Jídlo & Káva' : (currentCard.cat === 'view' ? '⛰️ Výhled & Památka' : (currentCard.cat === 'walk' ? '🌲 Příroda & Procházka' : '⚡ Zábava'))}
                        </span>
                        <h3 class="text-2xl font-black text-white leading-tight">${currentCard.name}</h3>
                        ${ratingStr ? `<div class="text-[#faa61a] text-xs font-bold mt-1">${ratingStr}</div>` : ''}
                        <p class="text-xs text-gray-300 font-medium mt-2 leading-relaxed max-w-xs mx-auto">${currentCard.desc || currentCard.address || 'Krásné místo na společný čas ❤️'}</p>
                    </div>
                </div>

                <div class="flex items-center justify-center gap-6 pt-2">
                    <button onclick="window.KiscordMap.handleMatcherSwipe(false)" 
                            class="w-14 h-14 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 flex items-center justify-center text-2xl shadow-xl transition transform active:scale-90 hover:scale-105"
                            title="Přeskočit">
                        <i class="fas fa-times"></i>
                    </button>
                    <button onclick="window.KiscordMap.pickRandomFromMatcher()" 
                            class="px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5 shadow-md"
                            title="Náhodná ruleta">
                        <i class="fas fa-dice text-base"></i> Ruleta
                    </button>
                    <button onclick="window.KiscordMap.handleMatcherSwipe(true)" 
                            class="w-14 h-14 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-xl transition transform active:scale-90 hover:scale-105"
                            title="To chci! 💚">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

export function handleMatcherSwipe(liked) {
    const card = matcherDeck[matcherIndex];
    if (!card) return;

    if (liked) {
        matcherLiked.push(card);
        triggerHaptic('success');
        triggerConfetti();
        if (typeof playChime === 'function') playChime();

        showMatchCelebration(card);
        return;
    } else {
        triggerHaptic('light');
    }

    matcherIndex++;
    renderMatcherModal();
}

export function pickRandomFromMatcher() {
    if (matcherDeck.length === 0) return;
    const random = matcherDeck[Math.floor(Math.random() * matcherDeck.length)];
    showMatchCelebration(random);
}

function showMatchCelebration(matchedPlace) {
    document.getElementById('rande-matcher-modal')?.remove();

    const todayStr = new Date().toISOString().split('T')[0];

    const matchModal = document.createElement('div');
    matchModal.id = 'match-celebration-modal';
    matchModal.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in select-none';

    matchModal.innerHTML = `
        <div class="bg-gradient-to-br from-[#2f3136] to-[#202225] w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-[#eb459e] text-center space-y-5 animate-scale-up relative overflow-hidden">
            <div class="absolute -top-12 -right-12 w-36 h-36 bg-[#eb459e]/20 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -bottom-12 -left-12 w-36 h-36 bg-[#5865F2]/20 rounded-full blur-2xl pointer-events-none"></div>

            <div class="inline-block p-4 rounded-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] shadow-2xl animate-bounce">
                <span class="text-4xl">🥂</span>
            </div>

            <div>
                <span class="text-[10px] font-black text-[#eb459e] uppercase tracking-widest block mb-1">MÁME VÍTĚZE!</span>
                <h2 class="text-2xl font-black text-white tracking-wide">IT'S A DATE MATCH! 🎉</h2>
            </div>

            <div class="p-4 bg-[#202225]/80 rounded-2xl border border-white/10 space-y-2">
                <div class="text-3xl">${matchedPlace.icon || '📍'}</div>
                <h3 class="text-lg font-black text-white">${matchedPlace.name}</h3>
                <p class="text-xs text-gray-300 font-medium">${matchedPlace.desc || matchedPlace.address || 'Skvělá volba na dnešní rande!'}</p>
            </div>

            <div class="space-y-2 pt-2">
                <button onclick="window.KiscordMap.quickScheduleMatchedDate('${matchedPlace.id}', '${todayStr}', '18:00')" 
                        class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-xl transform active:scale-95 flex items-center justify-center gap-2">
                    <i class="fas fa-calendar-check"></i> Naplánovat na dnes večer (18:00) 📅
                </button>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="window.KiscordMap.jumpToLocation('${matchedPlace.id}'); document.getElementById('match-celebration-modal')?.remove();" 
                            class="bg-[#202225] hover:bg-[#2f3136] text-gray-200 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition border border-white/5">
                        Zobrazit na mapě 📍
                    </button>
                    <button onclick="document.getElementById('match-celebration-modal')?.remove()" 
                            class="bg-[#202225] hover:bg-[#2f3136] text-gray-400 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition border border-white/5">
                        Zavřít
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(matchModal);
    triggerConfetti();
}

export async function quickScheduleMatchedDate(locationId, dateKey, time = '18:00') {
    const loc = (state.dateLocations || []).find(l => String(l.id) === String(locationId));
    if (!loc) return;

    if (!state.plannedDates) state.plannedDates = {};
    state.plannedDates[dateKey] = {
        id: loc.id,
        name: loc.name,
        cat: loc.cat || 'date',
        time: time,
        note: 'Vybráno přes Rande Matcher 💖'
    };

    try {
        await safeUpsert('planned_dates', {
            date_key: dateKey,
            user_id: state.currentUser?.id,
            location_id: loc.id,
            name: loc.name,
            cat: loc.cat || 'date',
            time: time,
            note: 'Vybráno přes Rande Matcher 💖',
            updated_at: new Date().toISOString()
        });

        document.getElementById('match-celebration-modal')?.remove();
        showNotification(`Rande na "${loc.name}" uloženo do kalendáře! 🥂❤️`, "success");
        triggerConfetti();
    } catch (e) {
        console.error("Schedule matched date error:", e);
    }
}
