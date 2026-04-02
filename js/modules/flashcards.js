import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { state } from '../core/state.js';
import { showNotification } from '../core/theme.js';
import { supabase } from '../core/supabase.js';
import { renderModal as uiModal } from '../core/ui.js';
import { loadMarked, loadKaTeX } from '../core/loader.js';

let cards = [];
let currentIndex = 0;
let isCompetitive = false;
let quizScores = { jose: 0, klarka: 0 };
let currentBuzzerUser = null;
let countdownInterval = null;

export async function openFlashcards(itemId) {
    // 0. Load heavy libs
    await Promise.all([loadMarked(), loadKaTeX()]);

    let manualCards = [];
    try {
        // Fetch fresh topic data to get latest flashcards
        const { data, error } = await supabase
            .from('matura_topics')
            .select('flashcards, title')
            .eq('id', itemId)
            .single();

        if (error) throw error;
        manualCards = (data && data.flashcards) ? data.flashcards : [];
        
        // Update local state if it exists
        for (const cat in state.maturaTopics) {
            const found = state.maturaTopics[cat].find(i => i.id === itemId);
            if (found) {
                found.flashcards = manualCards;
                break;
            }
        }
    } catch (e) {
        console.error("[Flashcards] DB fetch error:", e);
        // Fallback to local state
        for (const cat in state.maturaTopics) {
            const found = state.maturaTopics[cat].find(i => i.id === itemId);
            if (found) {
                manualCards = found.flashcards || [];
                break;
            }
        }
    }

    if (!manualCards || manualCards.length === 0) {
        showNotification("Pro toto téma zatím nejsou vytvořeny žádné kartičky. Klikni na 'Spravovat kartičky' v detailu tématu! ✍️", "info");
        return;
    }

    // Convert to Card format (q -> front, a -> back)
    cards = manualCards.map((item, index) => {
        return { 
            id: `manual-${itemId}-${index}`, 
            front: item.q, 
            back: item.a 
        };
    });

    cards.sort(() => Math.random() - 0.5);
    currentIndex = 0;

    renderModal();
    renderCard();
}

function renderModal() {
    if (document.getElementById('flashcard-modal')) document.getElementById('flashcard-modal').remove();

    const quizBadge = isCompetitive ? '<span id="mode-badge" class="ml-2 text-[10px] bg-amber-500/20 px-2 py-1 rounded-full text-amber-500 font-black">⚔️ DUEL</span>' : '<span id="mode-badge" class="ml-2 text-[10px] bg-white/10 px-2 py-1 rounded-full text-gray-400 font-bold uppercase tracking-wider">Sólo</span>';

    const modalHtml = `
            <!-- DUEL LEADERBOARD -->
            <div id="quiz-leaderboard" class="${isCompetitive ? '' : 'hidden'} py-4 w-full flex justify-center gap-12 border-b border-white/5 bg-white/2 rounded-t-xl mb-4">
                <div class="text-center">
                    <div class="text-[9px] font-black uppercase text-blue-400 tracking-widest">Jožka</div>
                    <div class="text-2xl font-black text-white" id="score-jose">${quizScores.jose}</div>
                </div>
                <div class="text-center pt-2">
                    <div class="text-lg font-black text-gray-600">VS</div>
                </div>
                <div class="text-center">
                    <div class="text-[9px] font-black uppercase text-pink-400 tracking-widest">Klárka</div>
                    <div class="text-2xl font-black text-white" id="score-klarka">${quizScores.klarka}</div>
                </div>
            </div>

            <!-- STAGE -->
            <div class="flex-1 min-h-[40vh] flex flex-col items-center justify-center relative w-full max-w-2xl mx-auto" id="fc-stage">
                <!-- Card content injected here -->
            </div>
            
            <!-- COUNTDOWN -->
            <div id="countdown-timer" class="hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
                <div class="w-32 h-32 rounded-full border-8 border-[#ed4245] flex items-center justify-center bg-black/80 backdrop-blur-xl scale-150 animate-pulse">
                    <span id="countdown-number" class="text-6xl font-black text-white italic">5</span>
                </div>
            </div>

            <!-- CONTROLS -->
            <div class="mt-8 w-full max-w-2xl mx-auto grid grid-cols-2 gap-4 justify-center items-center" id="fc-controls">
                <!-- Controls injected here -->
            </div>
    `;

    const actions = `
        <div class="flex w-full items-center justify-between">
            <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest" id="fc-progress">Kartička 1 / ${cards.length}</span>
            <div class="flex gap-2">
                ${!isCompetitive ? `
                    <button id="duel-btn" onclick="import('./js/modules/flashcards.js').then(m => m.startDuel())" class="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition border border-amber-500/20 flex items-center gap-2">
                        <i class="fas fa-swords"></i> Duel ⚔️
                    </button>
                ` : ''}
                <button onclick="document.getElementById('flashcard-modal').remove()" class="bg-white/5 hover:bg-white/10 text-gray-400 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition">Ukončit</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', uiModal({
        id: 'flashcard-modal',
        title: 'Zkoušení kartiček',
        subtitle: `Maturitní okruh • ${quizBadge}`,
        content: modalHtml,
        actions: actions,
        size: 'lg',
        onClose: "document.getElementById('flashcard-modal').remove()"
    }));

    const modal = document.getElementById('flashcard-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function renderCard() {
    if (currentIndex >= cards.length) {
        const stage = document.getElementById('fc-stage');
        stage.innerHTML = `
            <div class="text-center animate-pop-in">
                <i class="fas fa-trophy text-6xl text-[#eb459e] mb-6 glow-pink"></i>
                <h3 class="text-3xl font-black italic uppercase tracking-tighter">Skvělá práce!</h3>
                <p class="text-gray-400 mt-2">Dneska už to umíš. Běž si orazit.</p>
            </div>
        `;
        document.getElementById('fc-controls').innerHTML = `
            <button onclick="document.getElementById('flashcard-modal').remove()" class="col-span-2 bg-[#5865F2] hover:bg-[#4752c4] py-4 rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(88,101,242,0.5)]">Ukončit zkoušení</button>
        `;
        triggerConfetti(stage);
        return;
    }

    const cardData = cards[currentIndex];
    const stage = document.getElementById('fc-stage');
    
    // Helper for rendering Markdown + KaTeX inside cards
    const renderContent = (text) => {
        if (!text) return '';
        let html = marked.parse(text);
        
        // KaTeX Support (Inline $...$)
        html = html.replace(/\$([^$]+)\$/g, (match, formula) => {
            try { return katex.renderToString(formula, { throwOnError: false }); } 
            catch (e) { return match; }
        });
        
        return html;
    };

    // --- ADAPTIVE FONT SIZE LOGIC ---
    const getFrontFontSize = (text = '') => {
        const len = text.length;
        if (len > 300) return 'prose-xs text-[11px] md:text-xs';
        if (len > 200) return 'prose-sm text-sm';
        return 'prose-sm md:prose-base';
    };

    const getBackFontSize = (text = '') => {
        const len = text.length;
        if (len > 300) return 'text-xs md:text-sm leading-relaxed';
        if (len > 180) return 'text-sm md:text-base leading-relaxed';
        if (len > 100) return 'text-base md:text-xl leading-snug';
        if (len > 50) return 'text-xl md:text-2xl leading-tight';
        if (len > 25) return 'text-2xl md:text-4xl leading-none';
        return 'text-3xl md:text-5xl leading-none';
    };

    const frontFontSize = getFrontFontSize(cardData.front);
    const backFontSize = getBackFontSize(cardData.back);

    stage.innerHTML = `
        <div class="fc-card w-full min-h-[320px] max-h-[60vh] bg-gradient-to-br from-[#1b1d20] to-[#121417] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col cursor-pointer transition-all duration-500 perspective-1000 transform hover:scale-[1.01] hover:shadow-[0_25px_60px_rgba(235,69,158,0.15)] group" onclick="window.flipCard()">
            <div class="fc-inner w-full h-full relative transition-transform duration-700 transform-style-3d flex-1 flex flex-col">
                <!-- FRONT -->
                <div class="fc-front absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 md:p-12">
                   <div class="w-full flex-1 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar-thin pr-2">
                        <div class="prose prose-invert ${frontFontSize} max-w-none text-gray-200 leading-relaxed text-center font-medium">
                            ${renderContent(cardData.front)}
                        </div>
                   </div>
                   <div class="mt-6 text-[9px] uppercase tracking-[0.2em] font-black text-gray-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 opacity-50 group-hover:opacity-100 transition-opacity"><i class="fas fa-sync-alt mr-2"></i> Klikni pro otočení</div>
                </div>

                <!-- BACK -->
                <div class="fc-back absolute inset-0 backface-hidden flex flex-col items-center justify-center bg-[#ed4245]/5 rounded-3xl rotate-y-180 border-2 border-[#ed4245]/20 p-8">
                    <div class="text-[10px] uppercase tracking-[0.3em] font-black text-[#ed4245] mb-6 opacity-80">Skrytý pojem</div>
                    <div class="flex-1 flex flex-col items-center justify-center w-full overflow-y-auto custom-scrollbar-thin pr-2">
                        <span class="${backFontSize} font-black italic text-white tracking-tighter drop-shadow-[0_0_20px_rgba(237,66,69,0.3)] text-center">
                            ${renderContent(cardData.back)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; transform: translateZ(0); }
            .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
            .rotate-y-180 { transform: rotateY(180deg); }
            .is-flipped .fc-inner { transform: rotateY(180deg); }
            
            /* Enhanced flip speed and smoothness */
            .fc-inner { transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1); }
            
            .custom-scrollbar-thin::-webkit-scrollbar { width: 3px; }
            .custom-scrollbar-thin::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
            .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        </style>
    `;

    document.getElementById('fc-progress').textContent = `Kartička ${currentIndex + 1} / ${cards.length}`;
    
    const controls = document.getElementById('fc-controls');
    
    if (isCompetitive) {
        controls.innerHTML = `
            <button id="buzzer-btn" onclick="window.pressBuzzer()" class="col-span-2 bg-amber-500 hover:bg-amber-600 text-black py-6 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all active:scale-90 scale-110">
                MÁM TO! ⚡
            </button>
        `;
    } else {
        controls.innerHTML = `
            <button onclick="window.fcNext('bad')" class="fc-btn-bad opacity-0 pointer-events-none translate-y-4 bg-transparent border-2 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20 py-4 rounded-xl font-black uppercase tracking-widest transition-all duration-300">Netušil jsem</button>
            <button onclick="window.fcNext('good')" class="fc-btn-good opacity-0 pointer-events-none translate-y-4 bg-[#3ba55c] hover:bg-[#2d8046] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(59,165,92,0.4)] transition-all duration-300">Věděl jsem to!</button>
        `;
    }

    window.pressBuzzer = () => {
        if (currentBuzzerUser) return;
        triggerHaptic('heavy');
        import('../core/sync.js').then(s => s.broadcastGameVote({ type: 'quiz-buzzer', index: currentIndex }));
        handleBuzzer(state.currentUser?.name.toLowerCase());
    };

    window.flipCard = () => {
        if (isCompetitive && !currentBuzzerUser) return; // Can't flip in competitive without buzzing
        const card = document.querySelector('.fc-card');
        if (card.classList.contains('is-flipped')) return;
        card.classList.add('is-flipped');
        triggerHaptic('light');

        const badBtn = document.querySelector('.fc-btn-bad');
        const goodBtn = document.querySelector('.fc-btn-good');
        if (badBtn) badBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
        if (goodBtn) goodBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    };

    window.fcNext = async (result) => {
        if (isCompetitive) {
            import('../core/sync.js').then(s => s.broadcastGameVote({ type: 'quiz-next', result, user: state.currentUser?.name.toLowerCase() }));
            handleCompetitiveNext(result, state.currentUser?.name.toLowerCase());
            return;
        }

        const cardData = cards[currentIndex];
        import('./spaced_repetition.js').then(sr => sr.saveReview(cardData.id, result));

        if (result === 'bad') cards.push(cardData);
        else {
            triggerConfetti(document.querySelector('.fc-btn-good'));
            triggerHaptic('success');
        }
        
        const card = document.querySelector('.fc-card');
        card.style.transform = result === 'good' ? 'translateX(100vw) rotate(15deg)' : 'translateX(-100vw) rotate(-15deg)';
        card.style.opacity = '0';
        
        setTimeout(() => {
            currentIndex++;
            renderCard();
        }, 300);
    };
}

// --- DUEL LOGIC ---

export function startDuel() {
    isCompetitive = true;
    quizScores = { jose: 0, klarka: 0 };
    currentIndex = 0;
    
    document.getElementById('mode-badge').textContent = '⚔️ DUEL';
    document.getElementById('mode-badge').className = 'ml-2 text-[10px] bg-amber-500/20 px-2 py-1 rounded-full text-amber-500 font-black';
    document.getElementById('quiz-leaderboard').classList.remove('hidden');
    document.getElementById('duel-btn').classList.add('hidden');
    
    import('../core/sync.js').then(s => s.broadcastGameVote({ type: 'quiz-start', cards: cards }));
    renderCard();
    import('../core/theme.js').then(t => t.showNotification("DUEL ZAHÁJEN! Čekám na partnera...", "warning"));
}

window.addEventListener('game-vote-updated', (e) => {
    const p = e.detail.payload;
    if (p.type === 'quiz-start') {
        if (!document.getElementById('flashcard-modal')) openFlashcards();
        isCompetitive = true;
        cards = p.cards;
        currentIndex = 0;
        quizScores = { jose: 0, klarka: 0 };
        document.getElementById('mode-badge').textContent = '⚔️ DUEL';
        document.getElementById('quiz-leaderboard').classList.remove('hidden');
        document.getElementById('duel-btn').classList.add('hidden');
        renderCard();
        import('../core/theme.js').then(t => t.showNotification("PŘIPOJEN DO DUELU! Hodně štěstí.", "success"));
    }
    if (p.type === 'quiz-buzzer' && isCompetitive) {
        handleBuzzer(p.user_id === state.user_ids.jose ? 'jose' : 'klarka');
    }
    if (p.type === 'quiz-next' && isCompetitive) {
        handleCompetitiveNext(p.result, p.user);
    }
});

function handleBuzzer(user) {
    if (currentBuzzerUser) return;
    currentBuzzerUser = user;
    
    // Play sound
    try { new Audio('https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3').play(); } catch(e){}

    const isMe = (state.currentUser?.name.toLowerCase() === user);
    import('../core/theme.js').then(t => t.showNotification(isMe ? "TVŮJ TAH! Odpověz nahlas." : `BUZZER! Odpovídá ${user.toUpperCase()}...`, isMe ? "success" : "warning"));

    // Visuals
    const buzzerBtn = document.getElementById('buzzer-btn');
    if (buzzerBtn) buzzerBtn.remove();
    
    const controls = document.getElementById('fc-controls');
    if (isMe) {
        controls.innerHTML = `
            <button onclick="window.fcNext('bad')" class="bg-[#ed4245] text-white py-4 rounded-xl font-black uppercase tracking-widest">Neznal jsem ❌</button>
            <button onclick="window.fcNext('good')" class="bg-[#3ba55c] text-white py-4 rounded-xl font-black uppercase tracking-widest">Věděl jsem! ✅</button>
        `;
    } else {
        controls.innerHTML = `<div class="col-span-2 text-center text-gray-400 italic animate-pulse">Partner nyní odpovídá...</div>`;
    }

    // Auto-flip and timer
    window.flipCard();
    startCountdown();
}

function startCountdown() {
    const timerEl = document.getElementById('countdown-timer');
    const numEl = document.getElementById('countdown-number');
    timerEl.classList.remove('hidden');
    let count = 5;
    numEl.textContent = count;
    
    countdownInterval = setInterval(() => {
        count--;
        numEl.textContent = count;
        if (count <= 2) numEl.classList.add('text-red-500');
        if (count === 0) {
            stopCountdown();
            if (currentBuzzerUser === (state.currentUser?.name.toLowerCase())) {
                window.fcNext('bad');
            }
        }
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    document.getElementById('countdown-timer').classList.add('hidden');
    document.getElementById('countdown-number').classList.remove('text-red-500');
}

function handleCompetitiveNext(result, user) {
    stopCountdown();
    if (result === 'good') {
        quizScores[user]++;
        document.getElementById(`score-${user}`).textContent = quizScores[user];
        document.getElementById(`score-${user}`).classList.add('animate-bounce', 'text-green-500');
        setTimeout(() => document.getElementById(`score-${user}`).classList.remove('animate-bounce', 'text-green-500'), 1000);
    }
    
    currentBuzzerUser = null;
    const card = document.querySelector('.fc-card');
    if (card) {
        card.style.transform = result === 'good' ? 'translateX(100vw) rotate(15deg)' : 'translateX(-100vw) rotate(-15deg)';
        card.style.opacity = '0';
    }

    setTimeout(() => {
        currentIndex++;
        if (currentIndex < cards.length) renderCard();
        else finishDuel();
    }, 300);
}

function finishDuel() {
    isCompetitive = false;
    const winner = quizScores.jose > quizScores.klarka ? 'Jožka' : (quizScores.klarka > quizScores.jose ? 'Klárka' : 'Remíza');
    
    const stage = document.getElementById('fc-stage');
    stage.innerHTML = `
        <div class="text-center animate-pop-in">
            <i class="fas fa-crown text-6xl text-amber-500 mb-6 glow-amber"></i>
            <h3 class="text-3xl font-black italic uppercase tracking-tighter">KONEC DUELU!</h3>
            <p class="text-xl text-white mt-4 font-black">${winner === 'Remíza' ? 'NEROZHODNĚ! 🤝' : `VÍTĚZEM JE ${winner.toUpperCase()}! 🏆`}</p>
        </div>
    `;
    
    if (winner !== 'Remíza' && winner.toLowerCase() === state.currentUser?.name.toLowerCase()) {
        import('./achievements.js').then(a => a.autoUnlock('matura_quiz_winner'));
        triggerConfetti(stage);
    }
    
    document.getElementById('fc-controls').innerHTML = `
        <button onclick="document.getElementById('flashcard-modal').remove()" class="col-span-2 bg-[#5865F2] py-4 rounded-xl font-black uppercase tracking-widest">Zavřít</button>
    `;
}
