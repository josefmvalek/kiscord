import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { playFanfare, playChime, playHeartbeat } from '../core/sound.js';
import { showNotification } from '../core/theme.js';

// =====================================================================
// ⚔️ COUPLE DECISION ARENA (Rozhodovací Aréna pro dva)
// =====================================================================

export const ARENA_TOPICS = [
    { id: 'food', title: 'Kdo vybere jídlo? 🍕', icon: 'fa-utensils', color: 'from-amber-500 to-orange-600', winnerBadge: 'Šéf Kuchyně 👨‍🍳' },
    { id: 'movie', title: 'Kdo vybere film? 🍿', icon: 'fa-film', color: 'from-purple-500 to-indigo-600', winnerBadge: 'Filmový Režisér 🎬' },
    { id: 'chore', title: 'Kdo vynese koš / uklidí? 🧹', icon: 'fa-broom', color: 'from-blue-500 to-cyan-600', winnerBadge: 'Pán Gauče 🛋️' },
    { id: 'trip', title: 'Kam vyrazíme na rande? 🥂', icon: 'fa-map-marker-alt', color: 'from-emerald-500 to-teal-600', winnerBadge: 'Průvodce Rande 🗺️' },
    { id: 'custom', title: 'Vlastní sázka / Dilema 🎯', icon: 'fa-dice', color: 'from-pink-500 to-rose-600', winnerBadge: 'Vítěz Sázky 👑' }
];

export const WHEEL_PRESETS = {
    food: ['🍕 Pizza', '🍣 Sushi', '🍔 Burger', '🍝 Těstoviny', '🍛 Indická', '🥗 Salát', '🍜 Asie / Pho', '🍳 Uvařit doma'],
    movie: ['🍿 Netflix', '🎬 HBO / Max', '😂 Komedie', '👻 Horor / Thriller', '🚀 Sci-Fi', '✨ Animák', '🎲 Náhodný z Watchlistu'],
    chore: ['🧹 Vynést koš', '🍽️ Uklidit myčku', '🧽 Utřít prach', '☕ Uvařit druhému čaj', '💆 Masáž zad za odměnu', '🛋️ Volno pro oba']
};

let currentTopic = ARENA_TOPICS[0];
let activeGameMode = 'hub'; // 'hub' | 'reaction' | 'tapwar' | 'wheel'
let gameTimer = null;
let wheelAngle = 0;
let isWheelSpinning = false;

// Reaction state
let reactionState = {
    waiting: false,
    ready: false,
    startTime: 0,
    joseTime: null,
    klarkaTime: null,
    falseStart: null
};

// Tapwar state
let tapWarState = {
    active: false,
    timeLeft: 5,
    joseScore: 50,
    klarkaScore: 50
};

/**
 * Helper to identify partner names
 */
function getPartnerNames() {
    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const myName = isJose ? 'Jožka' : 'Klárka';
    const partnerName = isJose ? 'Klárka' : 'Jožka';
    return { myName, partnerName, isJose };
}

/**
 * Main Render function for #rozhodovac
 */
export function renderDecisionArena() {
    const container = document.getElementById('main-content') || document.getElementById('messages-container');
    if (!container) return;

    const { myName, partnerName } = getPartnerNames();

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in custom-scrollbar">
            <!-- Header Banner -->
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2f3136] via-[#1e1f22] to-amber-950/30 border border-white/10 p-6 sm:p-8 shadow-2xl">
                <div class="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div class="space-y-2 text-center sm:text-left">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                            <i class="fas fa-gavel"></i> Konec hádkám & rozhodovací paralýze
                        </div>
                        <h1 class="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">Rozhodovací Aréna</h1>
                        <p class="text-xs sm:text-sm text-gray-300 max-w-xl">
                            Rychlé, férové a napínavé 1v1 minihry a Kolo Osudu pro ${myName} & ${partnerName}. Kdo dnes vyhraje a rozhodne?
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="p-3 rounded-2xl bg-black/40 border border-white/10 text-center font-mono">
                            <span class="text-[9px] text-gray-400 block uppercase">Týdenní Veto</span>
                            <span class="text-sm font-black text-amber-400">1× K Dispozici ✨</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Topic Selector Bar -->
            <div class="space-y-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono block">1. Zvolte o co hrajete:</span>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    ${ARENA_TOPICS.map(topic => `
                        <button onclick="window.selectArenaTopic('${topic.id}')" 
                                class="p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center ${currentTopic.id === topic.id ? 'bg-white/15 border-amber-400/80 shadow-lg scale-105' : 'bg-black/20 border-white/5 hover:bg-white/5 opacity-80'}">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${topic.color} flex items-center justify-center text-white text-base shadow">
                                <i class="fas ${topic.icon}"></i>
                            </div>
                            <span class="text-xs font-bold text-white leading-tight">${topic.title.split('?')[0]}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Game Mode Cards Container -->
            <div id="arena-game-viewport" class="space-y-4">
                ${renderArenaHubView()}
            </div>
        </div>
    `;

    // Global listener bindings
    window.selectArenaTopic = (topicId) => {
        currentTopic = ARENA_TOPICS.find(t => t.id === topicId) || ARENA_TOPICS[0];
        triggerHaptic('light');
        renderDecisionArena();
    };

    window.launchArenaGame = (mode) => {
        activeGameMode = mode;
        triggerHaptic('medium');
        const viewport = document.getElementById('arena-game-viewport');
        if (!viewport) return;

        if (mode === 'reaction') {
            viewport.innerHTML = renderReactionBattle();
            initReactionGame();
        } else if (mode === 'tapwar') {
            viewport.innerHTML = renderTapWar();
            initTapWarGame();
        } else if (mode === 'wheel') {
            viewport.innerHTML = renderWheelOfFortune();
            initWheelGame();
        } else {
            viewport.innerHTML = renderArenaHubView();
        }
    };
}

/**
 * Renders the 3 main game mode selection cards
 */
function renderArenaHubView() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-scale-in">
            <!-- Game 1: Reaktometr -->
            <div class="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4 shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
                <div class="space-y-3">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        ⚡
                    </div>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-emerald-400 font-mono">Bleskový Duel</span>
                        <h3 class="text-xl font-black text-white">Reaktometr 1v1</h3>
                        <p class="text-xs text-gray-400 mt-1">Čekejte na zelený signál... kdo klepne dřív, vyhrává a rozhoduje!</p>
                    </div>
                </div>
                <button onclick="window.launchArenaGame('reaction')" class="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2">
                    <i class="fas fa-play"></i> <span>Hrát Duel (5s)</span>
                </button>
            </div>

            <!-- Game 2: Tap War -->
            <div class="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4 shadow-xl hover:border-pink-500/40 transition-all flex flex-col justify-between group">
                <div class="space-y-3">
                    <div class="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        🥊
                    </div>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-pink-400 font-mono">Klikací Souboj</span>
                        <h3 class="text-xl font-black text-white">Tap War (Přetahovaná)</h3>
                        <p class="text-xs text-gray-400 mt-1">5 sekund zběsilého mačkání. Kdo prokliká víc bodů, přetlačí lano na svou stranu!</p>
                    </div>
                </div>
                <button onclick="window.launchArenaGame('tapwar')" class="w-full py-3 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2">
                    <i class="fas fa-fire"></i> <span>Zahájit Souboj</span>
                </button>
            </div>

            <!-- Game 3: Kolo Osudu -->
            <div class="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4 shadow-xl hover:border-amber-500/40 transition-all flex flex-col justify-between group">
                <div class="space-y-3">
                    <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        🎡
                    </div>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-amber-400 font-mono">Náhodný Osud</span>
                        <h3 class="text-xl font-black text-white">Kolo Osudu</h3>
                        <p class="text-xs text-gray-400 mt-1">Když ani jeden neví – roztočte kolo s fyzikou a nechte osud rozhodnout bez výčitek.</p>
                    </div>
                </div>
                <button onclick="window.launchArenaGame('wheel')" class="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2">
                    <i class="fas fa-dice"></i> <span>Roztočit Kolo</span>
                </button>
            </div>
        </div>
    `;
}

// =====================================================================
// ⚡ 1. REACTION BATTLE (REAKTOMETR)
// =====================================================================

function renderReactionBattle() {
    return `
        <div class="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-emerald-500/30 space-y-6 shadow-2xl animate-fade-in select-none">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
                <div class="flex items-center gap-2">
                    <span class="text-xl">⚡</span>
                    <div>
                        <h3 class="text-base font-black text-white uppercase">Reaktometr 1v1</h3>
                        <p class="text-xs text-gray-400">${currentTopic.title}</p>
                    </div>
                </div>
                <button onclick="window.launchArenaGame('hub')" class="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition">
                    <i class="fas fa-times mr-1"></i> Zpět
                </button>
            </div>

            <!-- Split Screen Touch Zones (Works on single phone on couch) -->
            <div id="reaction-arena-box" class="h-80 rounded-2xl bg-rose-950/60 border-2 border-rose-500/40 flex flex-col justify-between overflow-hidden relative cursor-pointer transition-colors duration-200">
                <!-- Top Player Zone (Klárka) -->
                <div id="reaction-zone-top" class="flex-1 border-b border-white/10 flex items-center justify-center p-4 bg-white/5 active:bg-white/20 transition">
                    <div class="text-center">
                        <span class="text-2xl block">🌻</span>
                        <h4 class="text-lg font-black text-white">Klárka</h4>
                        <span id="reaction-time-top" class="text-xs font-mono text-gray-300">Klepni sem při zelené!</span>
                    </div>
                </div>

                <!-- Center Status Banner -->
                <div id="reaction-center-status" class="absolute inset-x-0 top-1/2 -translate-y-1/2 py-2.5 bg-black/80 border-y border-white/20 text-center font-mono z-10 pointer-events-none">
                    <span id="reaction-status-text" class="text-sm font-black text-amber-400 animate-pulse">ČEKEJ NA ZELENOU...</span>
                </div>

                <!-- Bottom Player Zone (Jožka) -->
                <div id="reaction-zone-bottom" class="flex-1 flex items-center justify-center p-4 bg-white/5 active:bg-white/20 transition">
                    <div class="text-center">
                        <span class="text-2xl block">🦁</span>
                        <h4 class="text-lg font-black text-white">Jožka</h4>
                        <span id="reaction-time-bottom" class="text-xs font-mono text-gray-300">Klepni sem při zelené!</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Controls -->
            <div class="flex items-center justify-between gap-4">
                <span class="text-xs text-gray-400">Položte telefon mezi sebe a klepněte na svou polovinu!</span>
                <button id="reaction-restart-btn" class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-md">
                    Znovu 🔁
                </button>
            </div>
        </div>
    `;
}

function initReactionGame() {
    clearTimeout(gameTimer);
    reactionState = {
        waiting: true,
        ready: false,
        startTime: 0,
        joseTime: null,
        klarkaTime: null,
        falseStart: null
    };

    const box = document.getElementById('reaction-arena-box');
    const statusText = document.getElementById('reaction-status-text');
    const topZone = document.getElementById('reaction-zone-top');
    const bottomZone = document.getElementById('reaction-zone-bottom');
    const restartBtn = document.getElementById('reaction-restart-btn');

    if (!box || !statusText) return;

    // Random delay between 1.8s and 4.2s
    const delay = Math.floor(Math.random() * 2400) + 1800;

    gameTimer = setTimeout(() => {
        if (!reactionState.waiting) return;
        reactionState.ready = true;
        reactionState.startTime = performance.now();

        box.className = 'h-80 rounded-2xl bg-emerald-600 border-2 border-emerald-300 flex flex-col justify-between overflow-hidden relative cursor-pointer transition-colors duration-100 shadow-2xl';
        statusText.innerHTML = '⚡⚡ TEĎ! KLIKNI! ⚡⚡';
        statusText.className = 'text-base font-black text-white tracking-widest';
        playChime();
        triggerHaptic('heavy');
    }, delay);

    const handleTap = (player) => {
        if (!reactionState.waiting) return;

        if (!reactionState.ready) {
            // False start!
            clearTimeout(gameTimer);
            reactionState.waiting = false;
            reactionState.falseStart = player;
            box.className = 'h-80 rounded-2xl bg-red-900 border-2 border-red-500 flex flex-col justify-between overflow-hidden relative shadow-2xl';
            statusText.innerHTML = `❌ ${player} klepl(a) moc brzy! Předčasný start!`;
            triggerHaptic('warning');
            rewardWinner(player === 'Jožka' ? 'Klárka' : 'Jožka', 'soupeřův předčasný start');
            return;
        }

        // Valid tap!
        const tapTime = Math.round(performance.now() - reactionState.startTime);
        reactionState.waiting = false;

        box.className = 'h-80 rounded-2xl bg-purple-950 border-2 border-purple-400 flex flex-col justify-between overflow-hidden relative shadow-2xl';
        statusText.innerHTML = `🏆 VÍTĚZ: ${player} (${tapTime} ms)!`;
        rewardWinner(player, `${tapTime} ms`);
    };

    topZone?.addEventListener('pointerdown', (e) => { e.stopPropagation(); handleTap('Klárka'); });
    bottomZone?.addEventListener('pointerdown', (e) => { e.stopPropagation(); handleTap('Jožka'); });
    restartBtn?.addEventListener('click', () => { window.launchArenaGame('reaction'); });
}

// =====================================================================
// 🥊 2. TAP WAR (PŘETAHOVANÁ - 5 VTEŘIN)
// =====================================================================

function renderTapWar() {
    return `
        <div class="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-pink-500/30 space-y-6 shadow-2xl animate-fade-in select-none">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🥊</span>
                    <div>
                        <h3 class="text-base font-black text-white uppercase">Tap War (Přetahovaná)</h3>
                        <p class="text-xs text-gray-400">5 vteřin zběsilého mačkání • ${currentTopic.title}</p>
                    </div>
                </div>
                <button onclick="window.launchArenaGame('hub')" class="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition">
                    <i class="fas fa-times mr-1"></i> Zpět
                </button>
            </div>

            <!-- Dynamic Balance Bar -->
            <div class="space-y-2">
                <div class="flex justify-between text-xs font-mono font-bold">
                    <span class="text-pink-400">Klárka: <span id="tapwar-score-klarka">50%</span></span>
                    <span id="tapwar-timer" class="text-amber-400 font-black text-base animate-pulse">05.0 s</span>
                    <span class="text-indigo-400">Jožka: <span id="tapwar-score-jozka">50%</span></span>
                </div>
                <div class="h-6 bg-black/40 rounded-full overflow-hidden flex border border-white/10 p-0.5">
                    <div id="tapwar-bar-klarka" class="h-full bg-pink-500 transition-all duration-75 rounded-l-full" style="width: 50%;"></div>
                    <div id="tapwar-bar-jozka" class="h-full bg-indigo-500 transition-all duration-75 rounded-r-full" style="width: 50%;"></div>
                </div>
            </div>

            <!-- Dual Large Tap Buttons -->
            <div class="grid grid-cols-2 gap-4 h-60">
                <button id="tapwar-btn-klarka" class="rounded-3xl bg-pink-500/20 hover:bg-pink-500/30 border-2 border-pink-500/50 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl">
                    <span class="text-4xl">🌻</span>
                    <span class="text-lg font-black text-pink-300">Klárka</span>
                    <span class="text-[10px] font-mono text-pink-400 uppercase font-bold">KLIKEJ!</span>
                </button>

                <button id="tapwar-btn-jozka" class="rounded-3xl bg-indigo-500/20 hover:bg-indigo-500/30 border-2 border-indigo-500/50 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl">
                    <span class="text-4xl">🦁</span>
                    <span class="text-lg font-black text-indigo-300">Jožka</span>
                    <span class="text-[10px] font-mono text-indigo-400 uppercase font-bold">KLIKEJ!</span>
                </button>
            </div>
        </div>
    `;
}

function initTapWarGame() {
    clearTimeout(gameTimer);
    tapWarState = {
        active: true,
        timeLeft: 5.0,
        joseClicks: 0,
        klarkaClicks: 0
    };

    const klarkaBtn = document.getElementById('tapwar-btn-klarka');
    const jozkaBtn = document.getElementById('tapwar-btn-jozka');
    const klarkaBar = document.getElementById('tapwar-bar-klarka');
    const jozkaBar = document.getElementById('tapwar-bar-jozka');
    const klarkaScore = document.getElementById('tapwar-score-klarka');
    const jozkaScore = document.getElementById('tapwar-score-jozka');
    const timerEl = document.getElementById('tapwar-timer');

    const updateView = () => {
        const total = tapWarState.klarkaClicks + tapWarState.joseClicks;
        let kPct = 50;
        let jPct = 50;
        if (total > 0) {
            kPct = Math.round((tapWarState.klarkaClicks / total) * 100);
            jPct = 100 - kPct;
        }
        if (klarkaBar) klarkaBar.style.width = `${kPct}%`;
        if (jozkaBar) jozkaBar.style.width = `${jPct}%`;
        if (klarkaScore) klarkaScore.innerText = `${tapWarState.klarkaClicks} (${kPct}%)`;
        if (jozkaScore) jozkaScore.innerText = `${tapWarState.joseClicks} (${jPct}%)`;
    };

    klarkaBtn?.addEventListener('pointerdown', () => {
        if (!tapWarState.active) return;
        tapWarState.klarkaClicks++;
        triggerHaptic('light');
        updateView();
    });

    jozkaBtn?.addEventListener('pointerdown', () => {
        if (!tapWarState.active) return;
        tapWarState.joseClicks++;
        triggerHaptic('light');
        updateView();
    });

    const interval = setInterval(() => {
        tapWarState.timeLeft -= 0.1;
        if (timerEl) timerEl.innerText = `${Math.max(0, tapWarState.timeLeft).toFixed(1)} s`;

        if (tapWarState.timeLeft <= 0) {
            clearInterval(interval);
            tapWarState.active = false;

            const winner = tapWarState.klarkaClicks > tapWarState.joseClicks 
                ? 'Klárka' 
                : tapWarState.joseClicks > tapWarState.klarkaClicks ? 'Jožka' : 'Remíza';

            if (winner !== 'Remíza') {
                rewardWinner(winner, `${Math.max(tapWarState.klarkaClicks, tapWarState.joseClicks)} kliků za 5s`);
            } else {
                showNotification('🤝 Dokonalá remíza! Zkuste Kolo Osudu.', 'info');
            }
        }
    }, 100);
}

// =====================================================================
// 🎡 3. KOLO OSUDU (WHEEL OF FORTUNE)
// =====================================================================

function renderWheelOfFortune() {
    return `
        <div class="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-amber-500/30 space-y-6 shadow-2xl animate-fade-in select-none">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🎡</span>
                    <div>
                        <h3 class="text-base font-black text-white uppercase">Kolo Osudu</h3>
                        <p class="text-xs text-gray-400">${currentTopic.title}</p>
                    </div>
                </div>
                <button onclick="window.launchArenaGame('hub')" class="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition">
                    <i class="fas fa-times mr-1"></i> Zpět
                </button>
            </div>

            <!-- Canvas Wheel & Pointer Container -->
            <div class="relative flex items-center justify-center my-4">
                <!-- Pointer indicator -->
                <div class="absolute -top-3 z-20 text-amber-400 text-3xl filter drop-shadow-[0_2px_8px_rgba(250,166,26,0.8)]">
                    ▼
                </div>
                <canvas id="wheel-canvas" width="340" height="340" class="rounded-full shadow-2xl border-4 border-white/20"></canvas>
            </div>

            <!-- Winner Result Announcement -->
            <div id="wheel-winner-box" class="p-4 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
                <span class="text-[9px] font-mono text-gray-400 uppercase">Výsledek Kola</span>
                <h4 id="wheel-winner-text" class="text-xl font-black text-amber-400">Připraveno k roztočení!</h4>
            </div>

            <!-- Spin Trigger Button -->
            <button id="wheel-spin-btn" class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:opacity-95 text-white font-black text-sm uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2 transform active:scale-95">
                <i class="fas fa-sync-alt"></i> <span>Roztočit Kolo Osudu!</span>
            </button>
        </div>
    `;
}

function initWheelGame() {
    const canvas = document.getElementById('wheel-canvas');
    const spinBtn = document.getElementById('wheel-spin-btn');
    const winnerText = document.getElementById('wheel-winner-text');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const options = WHEEL_PRESETS[currentTopic.id] || WHEEL_PRESETS.food;
    const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1'];

    const drawWheel = (angle) => {
        const numOptions = options.length;
        const arcSize = (2 * Math.PI) / numOptions;
        ctx.clearRect(0, 0, 340, 340);

        options.forEach((opt, idx) => {
            const startAngle = angle + (idx * arcSize);
            const endAngle = startAngle + arcSize;

            ctx.beginPath();
            ctx.fillStyle = colors[idx % colors.length];
            ctx.moveTo(170, 170);
            ctx.arc(170, 170, 160, startAngle, endAngle);
            ctx.fill();
            ctx.stroke();

            // Label text
            ctx.save();
            ctx.translate(170, 170);
            ctx.rotate(startAngle + arcSize / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(opt, 145, 5);
            ctx.restore();
        });

        // Center hub
        ctx.beginPath();
        ctx.fillStyle = '#1e1f22';
        ctx.arc(170, 170, 24, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
    };

    drawWheel(wheelAngle);

    spinBtn?.addEventListener('click', () => {
        if (isWheelSpinning) return;
        isWheelSpinning = true;
        triggerHaptic('heavy');

        let speed = Math.random() * 0.35 + 0.35; // Initial spin impulse
        const deceleration = 0.003;

        const animate = () => {
            wheelAngle += speed;
            speed -= deceleration;
            drawWheel(wheelAngle);

            if (speed > 0) {
                requestAnimationFrame(animate);
            } else {
                isWheelSpinning = false;
                // Calculate winner option under top pointer (pointer is at -PI/2)
                const arcSize = (2 * Math.PI) / options.length;
                const normalizedAngle = (1.5 * Math.PI - (wheelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                const winningIdx = Math.floor(normalizedAngle / arcSize);
                const winnerOption = options[winningIdx];

                triggerConfetti();
                playFanfare();
                if (winnerText) winnerText.innerText = `🎯 Osud vybral: ${winnerOption}!`;
                showNotification(`🎡 Kolo Osudu rozhodlo: ${winnerOption}!`, 'success');
            }
        };

        requestAnimationFrame(animate);
    });
}

/**
 * Rewards winner, updates status and grants consolation Love Coins to loser
 */
function rewardWinner(winnerName, reason) {
    triggerConfetti();
    playFanfare();

    const { isJose } = getPartnerNames();
    const loserName = winnerName === 'Jožka' ? 'Klárka' : 'Jožka';

    // Grant +5 Love Coins to loser as consolation prize
    if (state.loveCoins) {
        if (loserName === 'Jožka') state.loveCoins.jose = (state.loveCoins.jose || 0) + 5;
        else state.loveCoins.klarka = (state.loveCoins.klarka || 0) + 5;
    }

    showNotification(`🏆 ${winnerName} vyhrává právo rozhodnout (${currentTopic.winnerBadge})! ${loserName} získává +5 Love Coins cenu útěchy 🪙`, 'success');
}
