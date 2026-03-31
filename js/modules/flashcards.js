import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { state } from '../core/state.js';

let cards = [];
let currentIndex = 0;
let isCompetitive = false;
let quizScores = { jose: 0, klarka: 0 };
let currentBuzzerUser = null;
let countdownInterval = null;

export function openFlashcards() {
    const redNodes = document.querySelectorAll('.kb-hl-red:not(.hl-other)');
    if (!redNodes.length) {
        alert("Zatím tu nemáš žádné červené podtržení k nabiflování. Podtrhni si nejprve nějaká jména nebo cizí slova!");
        return;
    }

    cards = Array.from(redNodes).map(node => {
        const parent = node.closest('p, li');
        let fullText = parent ? parent.textContent : '';
        const answer = node.textContent;

        const blankSpan = '<span class="text-[#eb459e] border-b-2 border-dashed border-[#eb459e] pb-1 font-black cursor-help">' + '?'.repeat(Math.max(3, answer.length)) + '</span>';
        const front = fullText.replace(answer, blankSpan);

        return { 
            id: node.dataset.id, // ID z matura_highlights
            front, 
            back: answer 
        };
    });

    cards.sort(() => Math.random() - 0.5);
    currentIndex = 0;

    renderModal();
    renderCard();
}

function renderModal() {
    if (document.getElementById('flashcard-modal')) document.getElementById('flashcard-modal').remove();

    const html = `
            <div class="px-8 pb-4 flex justify-between items-center w-full max-w-2xl mx-auto border-b border-white/10">
                <div>
                    <h2 class="text-2xl font-black italic tracking-tighter uppercase text-[#ed4245]">Zkoušení <span id="mode-badge" class="ml-2 text-[10px] bg-white/10 px-2 py-1 rounded-full text-gray-400">Sólo</span></h2>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest" id="fc-progress">Kartička 1 / N</p>
                </div>
                <div class="flex items-center gap-4">
                    <button id="duel-btn" onclick="import('./js/modules/flashcards.js').then(m => m.startDuel())" class="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition border border-amber-500/20 flex items-center gap-2">
                        <i class="fas fa-swords"></i> Duel ⚔️
                    </button>
                    <button onclick="document.getElementById('flashcard-modal').remove()" class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>

            <div id="quiz-leaderboard" class="hidden py-4 w-full max-w-2xl mx-auto flex justify-center gap-12 border-b border-white/5 bg-white/2">
                <div class="text-center">
                    <div class="text-[9px] font-black uppercase text-blue-400 tracking-widest">Jožka</div>
                    <div class="text-2xl font-black text-white" id="score-jose">0</div>
                </div>
                <div class="text-center pt-2">
                    <div class="text-lg font-black text-gray-600">VS</div>
                </div>
                <div class="text-center">
                    <div class="text-[9px] font-black uppercase text-pink-400 tracking-widest">Klárka</div>
                    <div class="text-2xl font-black text-white" id="score-klarka">0</div>
                </div>
            </div>

            <div class="flex-1 flex flex-col items-center justify-center p-8 relative w-full max-w-2xl mx-auto" id="fc-stage">
            </div>
            
            <div id="countdown-timer" class="hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
                <div class="w-32 h-32 rounded-full border-8 border-[#ed4245] flex items-center justify-center bg-black/80 backdrop-blur-xl scale-150 animate-pulse">
                    <span id="countdown-number" class="text-6xl font-black text-white italic">5</span>
                </div>
            </div>

            <div class="p-8 w-full max-w-2xl mx-auto grid grid-cols-2 gap-4 pb-20 justify-center items-center" id="fc-controls">
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
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
    
    stage.innerHTML = `
        <div class="fc-card w-full aspect-square md:aspect-video bg-[#1b1d20] border border-white/5 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-transform duration-500 perspective-1000 transform hover:scale-[1.02]" onclick="window.flipCard()">
            <div class="fc-inner w-full h-full relative transition-transform duration-500 transform-style-3d">
                <div class="fc-front absolute inset-0 backface-hidden flex flex-col items-center justify-center">
                    <p class="text-xl md:text-2xl leading-relaxed text-gray-200">${cardData.front}</p>
                    <div class="absolute bottom-0 text-[10px] uppercase tracking-widest font-black text-gray-600 bg-white/5 px-3 py-1 rounded-full"><i class="fas fa-sync-alt mr-2"></i> Klikni pro otočení</div>
                </div>
                <div class="fc-back absolute inset-0 backface-hidden flex flex-col items-center justify-center bg-[#ed4245]/10 rounded-2xl rotate-y-180 border border-[#ed4245]/20">
                    <div class="text-[10px] uppercase tracking-widest font-black text-[#ed4245] mb-4">Skrytý pojem</div>
                    <span class="text-4xl md:text-5xl font-black italic text-white tracking-tighter drop-shadow-md">${cardData.back}</span>
                </div>
            </div>
        </div>
        <style>
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .rotate-y-180 { transform: rotateY(180deg); }
            .is-flipped .fc-inner { transform: rotateY(180deg); }
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
