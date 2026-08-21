import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal } from '../core/ui.js';
import { BRNO_CAMPUS_FOOD } from './dormHub.js';

let matcherMode = 'food'; // 'food' | 'date'
let currentDeck = [];
let currentCardIndex = 0;
let likedCards = [];

export function openDecisionMatcher(mode = 'food') {
    matcherMode = mode;
    currentCardIndex = 0;
    likedCards = [];

    prepareDeck();
    renderMatcherModal();
}

function prepareDeck() {
    if (matcherMode === 'food') {
        const campusList = BRNO_CAMPUS_FOOD.map(f => ({
            id: f.name,
            title: f.name,
            tag: f.type,
            desc: f.desc,
            icon: f.icon || 'fa-utensils',
            color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
        }));

        const locationList = (state.dateLocations || [])
            .filter(l => l.category === 'Jídlo' || l.category === 'Kavárna' || l.category === 'Bistro')
            .map(l => ({
                id: l.name,
                title: l.name,
                tag: l.category || 'Gastro',
                desc: l.desc || 'Oblíbený podnik v Brně',
                icon: 'fa-coffee',
                color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400'
            }));

        currentDeck = [...campusList, ...locationList];
    } else {
        const bucketDeck = (state.bucketList || [])
            .filter(b => !b.is_completed)
            .map(b => ({
                id: b.id,
                title: b.title,
                tag: b.category || 'Bucket list',
                desc: b.description || 'Společný sen na našem seznamu ✨',
                icon: 'fa-rocket',
                color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400'
            }));

        const placesDeck = (state.dateLocations || []).map(p => ({
            id: p.name,
            title: p.name,
            tag: p.category || 'Rande',
            desc: p.desc || 'Krásné místo na výlet či procházku 🌲',
            icon: 'fa-map-marker-alt',
            color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
        }));

        currentDeck = [...bucketDeck, ...placesDeck];
    }

    // Shuffle deck
    currentDeck.sort(() => Math.random() - 0.5);
}

function renderMatcherModal() {
    triggerHaptic('light');

    document.getElementById('decision-matcher-modal')?.remove();

    const title = matcherMode === 'food' ? 'Kam dnes na oběd či večeři? 🍕' : 'Kam vyrazíme na rande? 🥂';
    const subtitle = matcherMode === 'food' ? 'Tinder pro menzy a restaurace u FITu & v Brně' : 'Inspirace z bucket listu a mapy míst';

    const card = currentDeck[currentCardIndex];

    const contentHtml = `
        <div id="matcher-card-container" class="min-h-[320px] flex flex-col items-center justify-between p-2 select-none">
            ${card ? `
                <div class="w-full bg-gradient-to-br ${card.color} border rounded-3xl p-6 shadow-2xl space-y-4 text-center transform transition-all duration-300 animate-fade-in relative overflow-hidden" id="active-swipe-card">
                    <div class="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl mx-auto shadow-inner">
                        <i class="fas ${card.icon}"></i>
                    </div>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/30 border border-white/10 text-white/80 inline-block mb-1.5">
                            ${card.tag}
                        </span>
                        <h3 class="text-xl font-black text-white leading-tight">${card.title}</h3>
                        <p class="text-xs text-gray-300 font-medium mt-2 leading-relaxed max-w-sm mx-auto">${card.desc}</p>
                    </div>
                </div>

                <!-- Swipe Controls -->
                <div class="flex items-center justify-center gap-6 w-full pt-4">
                    <button onclick="window.handleSwipeDecision(false)" 
                            class="w-14 h-14 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xl shadow-lg transition active:scale-90"
                            title="Přeskočit / Další">
                        <i class="fas fa-times"></i>
                    </button>
                    <button onclick="window.pickRandomFromDeck()" 
                            class="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5 shadow"
                            title="Náhodná ruleta">
                        <i class="fas fa-dice text-sm"></i> Ruleta
                    </button>
                    <button onclick="window.handleSwipeDecision(true)" 
                            class="w-14 h-14 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shadow-lg transition active:scale-90"
                            title="To beru!">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">
                    Karta ${currentCardIndex + 1} z ${currentDeck.length}
                </div>
            ` : `
                <div class="text-center py-8 space-y-4">
                    <div class="text-5xl">🎉</div>
                    <h3 class="text-base font-black text-white">Prohlédli jste všechny možnosti!</h3>
                    ${likedCards.length > 0 ? `
                        <p class="text-xs text-emerald-400 font-bold">Líbilo se vám: ${likedCards.map(c => c.title).join(', ')}</p>
                    ` : '<p class="text-xs text-gray-400">Zkuste balíček zamíchat znovu.</p>'}
                    <button onclick="window.openDecisionMatcher('${matcherMode}')" 
                            class="px-6 py-2.5 rounded-xl bg-[var(--blurple)] hover:bg-[var(--blurple-hover)] text-white font-bold text-xs uppercase tracking-wider transition shadow">
                        Zamíchat a zkusit znovu
                    </button>
                </div>
            `}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'decision-matcher-modal',
        title: title,
        subtitle: subtitle,
        content: contentHtml,
        actions: `
            <div class="flex justify-between items-center w-full">
                <button onclick="window.toggleMatcherMode()" 
                        class="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-wider transition">
                    Přepnout na: ${matcherMode === 'food' ? 'Rande & Výlety 🥂' : 'Jídlo & Menzy 🍕'}
                </button>
                <button onclick="document.getElementById('decision-matcher-modal')?.remove()" 
                        class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-[10px] uppercase tracking-wider transition">
                    Zavřít
                </button>
            </div>
        `,
        onClose: "document.getElementById('decision-matcher-modal')?.remove()"
    }));

    document.getElementById('decision-matcher-modal').classList.remove('hidden');
    document.getElementById('decision-matcher-modal').classList.add('flex');
}

export function handleSwipeDecision(liked) {
    const card = currentDeck[currentCardIndex];
    if (!card) return;

    if (liked) {
        triggerConfetti();
        triggerHaptic('success');
        likedCards.push(card);
        showNotification(`Vybráno: ${card.title}! 🎉`, 'success');
    } else {
        triggerHaptic('light');
    }

    currentCardIndex++;
    updateMatcherCardView();
}

export function pickRandomFromDeck() {
    if (currentDeck.length === 0) return;
    triggerHaptic('heavy');
    triggerConfetti();

    const random = currentDeck[Math.floor(Math.random() * currentDeck.length)];
    showNotification(`🎯 Ruleta vybrala: ${random.title}! (${random.tag})`, 'success');

    // Jump to this card
    const idx = currentDeck.findIndex(c => c.id === random.id);
    if (idx !== -1) currentCardIndex = idx;
    updateMatcherCardView();
}

export function toggleMatcherMode() {
    openDecisionMatcher(matcherMode === 'food' ? 'date' : 'food');
}

function updateMatcherCardView() {
    renderMatcherModal();
}

// Window globals for interactive buttons
window.openDecisionMatcher = openDecisionMatcher;
window.handleSwipeDecision = handleSwipeDecision;
window.pickRandomFromDeck = pickRandomFromDeck;
window.toggleMatcherMode = toggleMatcherMode;
