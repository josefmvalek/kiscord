import { state, ensureLibraryData } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { safeInsert } from '../core/offline.js';
import { broadcastTinderMatch } from '../core/sync.js';
import * as TMDB from '../core/tmdb.js';

let activeMode = 'discovery'; // 'discovery' (library pool) or 'watchlist' (partner's wishlist)
let categoryFilter = 'movie'; // 'movie', 'series', 'game', 'all'
let gameMode = 'frequent';    // 'frequent' (stálice), 'backlog' (novinky), 'all'
let tinderPool = [];
let currentIndex = 0;
let dislikedIds = new Set();
let partnerLikedIds = new Set();
let myLikedIds = new Set();

// Active card drag state
let isDragging = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;
let activeCardElement = null;

export async function renderNetflixMatcher(initialCategory = null) {
    // Expose API to window for callbacks
    window.NetflixMatcher = {
        setMode,
        setCategoryFilter,
        setGameMode,
        swipeLeft,
        swipeRight,
        openDetail,
        closeMatchOverlay,
        planMatchDate,
        renderNetflixMatcher
    };

    if (initialCategory) {
        if (initialCategory === 'movies' || initialCategory === 'movie') categoryFilter = 'movie';
        else if (initialCategory === 'series') categoryFilter = 'series';
        else if (initialCategory === 'games' || initialCategory === 'game') categoryFilter = 'game';
        else if (initialCategory === 'all') categoryFilter = 'all';
    }

    const container = document.getElementById("messages-container");
    if (!container) return;

    // Load custom disliked IDs from localStorage to keep state in current session
    const cachedDislikes = localStorage.getItem('kiscord_tinder_disliked');
    if (cachedDislikes) {
        try {
            dislikedIds = new Set(JSON.parse(cachedDislikes));
        } catch (e) {
            dislikedIds = new Set();
        }
    }

    // Dynamic Title & Subtitle based on category
    let headerTitle = "🎬 Filmový Matcher";
    let headerSubtitle = "Najděte film, na který máte dnes oba chuť 🍿";
    let headerIcon = "fa-film";
    let headerColor = "#5865F2";

    if (categoryFilter === 'series') {
        headerTitle = "📺 Seriálový Matcher";
        headerSubtitle = "Jaký seriál si dneska společně pustíme? 🍿";
        headerIcon = "fa-tv";
        headerColor = "#3ba55c";
    } else if (categoryFilter === 'game') {
        headerTitle = "🎮 Herní Matcher";
        headerSubtitle = "Rychlé vyřešení herní paralýzy pro dnešní večer ⚡";
        headerIcon = "fa-gamepad";
        headerColor = "#eb459e";
    } else if (categoryFilter === 'all') {
        headerTitle = "✨ Entertainment Matcher";
        headerSubtitle = "Co si dnes pustíme nebo zahrajeme? 🍿🎮";
        headerIcon = "fa-fire";
        headerColor = "#faa61a";
    }

    // Render basic template with loading skeleton
    container.innerHTML = `
        <div class="flex flex-col h-full animate-fade-in bg-[#36393f] relative overflow-hidden text-white">
            <!-- Background lights -->
            <div class="absolute top-0 right-0 w-96 h-96 bg-[#eb459e]/10 rounded-full blur-[130px] pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 w-96 h-96 bg-[#5865F2]/10 rounded-full blur-[130px] pointer-events-none"></div>

            <!-- HEADER -->
            <div class="relative bg-[#2f3136]/90 backdrop-blur-md border-b border-[#202225] p-4 lg:p-5 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <button onclick="if (state.currentChannel === 'watchlist' && window.Watchlist) { window.Watchlist.renderWatchlist(); } else if (window.Library) { window.Library.renderLibrary('${categoryFilter === 'movie' ? 'movies' : (categoryFilter === 'game' ? 'games' : (categoryFilter === 'series' ? 'series' : 'movies'))}'); } else if (window.loadModule) { window.loadModule('library').then(m => m.renderLibrary()); } triggerHaptic('light')" 
                            class="text-gray-400 hover:text-white transition p-2.5 rounded-xl bg-[#202225] border border-white/5 flex items-center gap-1.5 text-xs font-bold shadow-md">
                        <i class="fas fa-arrow-left"></i> Zpět
                    </button>
                    <div>
                        <h1 class="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                            <i class="fas ${headerIcon} text-[${headerColor}] animate-pulse"></i> ${headerTitle}
                        </h1>
                        <p class="text-xs text-gray-400 mt-0.5">${headerSubtitle}</p>
                    </div>
                </div>

                <!-- CATEGORY TABS -->
                <div class="flex bg-[#202225] rounded-xl p-1 border border-white/5 text-xs font-bold self-start md:self-auto overflow-x-auto no-scrollbar">
                    <button onclick="NetflixMatcher.setCategoryFilter('movie')" id="cat-movie" class="px-3.5 py-1.5 rounded-lg transition-all ${categoryFilter === 'movie' ? 'bg-[#5865F2] text-white shadow-md' : 'text-gray-400 hover:text-white'}">🎬 Filmy</button>
                    <button onclick="NetflixMatcher.setCategoryFilter('series')" id="cat-series" class="px-3.5 py-1.5 rounded-lg transition-all ${categoryFilter === 'series' ? 'bg-[#5865F2] text-white shadow-md' : 'text-gray-400 hover:text-white'}">📺 Seriály</button>
                    <button onclick="NetflixMatcher.setCategoryFilter('game')" id="cat-game" class="px-3.5 py-1.5 rounded-lg transition-all ${categoryFilter === 'game' ? 'bg-[#eb459e] text-white shadow-md' : 'text-gray-400 hover:text-white'}">🎮 Hry</button>
                    <button onclick="NetflixMatcher.setCategoryFilter('all')" id="cat-all" class="px-3 py-1.5 rounded-lg transition-all ${categoryFilter === 'all' ? 'bg-[#5865F2] text-white shadow-md' : 'text-gray-400 hover:text-white'}">Vše</button>
                </div>
            </div>

            <!-- GAME SUB-MODE BAR (When on Games) -->
            ${categoryFilter === 'game' ? `
            <div class="bg-black/30 border-b border-white/5 p-2.5 flex items-center justify-center gap-2 z-10 animate-fade-in overflow-x-auto no-scrollbar">
                <span class="text-[10px] font-black uppercase text-gray-400 mr-1 hidden sm:inline">Režim her:</span>
                <button onclick="NetflixMatcher.setGameMode('frequent')" id="gm-frequent" 
                    class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${gameMode === 'frequent' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20 font-extrabold' : 'bg-[#202225] text-yellow-400 hover:text-white'}">
                    <i class="fas fa-bolt"></i> ⚡ Naše stálice (Dnešní rychlá volba)
                </button>
                <button onclick="NetflixMatcher.setGameMode('backlog')" id="gm-backlog" 
                    class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${gameMode === 'backlog' ? 'bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/20' : 'bg-[#202225] text-emerald-400 hover:text-white'}">
                    <i class="fas fa-star"></i> 🌟 Novinky v plánu
                </button>
                <button onclick="NetflixMatcher.setGameMode('all')" id="gm-all" 
                    class="px-3 py-1.5 rounded-xl text-xs font-black transition-all ${gameMode === 'all' ? 'bg-[#5865F2] text-white shadow-md' : 'bg-[#202225] text-gray-400 hover:text-white'}">
                    Všechny hry
                </button>
            </div>
            ` : ''}

            <!-- MODE TABS (Průnik přání vs Nové objevování) -->
            <div class="bg-[#2f3136]/50 border-b border-[#202225] p-2.5 flex justify-center gap-3 z-10">
                <button onclick="NetflixMatcher.setMode('discovery')" id="mode-discovery" 
                    class="px-4 py-2 rounded-xl font-black text-xs tracking-wider transition-all duration-300 border flex items-center gap-2 ${activeMode === 'discovery' ? 'bg-gradient-to-r from-[#5865F2] to-[#4752c4] text-white shadow-lg border-transparent' : 'bg-[#202225] border-white/5 text-gray-400 hover:text-white'}">
                    <i class="fas fa-compass"></i> NOVÉ OBJEVOVÁNÍ (Celá knihovna)
                </button>
                <button onclick="NetflixMatcher.setMode('watchlist')" id="mode-watchlist" 
                    class="px-4 py-2 rounded-xl font-black text-xs tracking-wider transition-all duration-300 border flex items-center gap-2 ${activeMode === 'watchlist' ? 'bg-gradient-to-r from-[#eb459e] to-[#f47fff] text-white shadow-lg border-transparent' : 'bg-[#202225] border-white/5 text-gray-400 hover:text-white'}">
                    <i class="fas fa-heart"></i> PRŮNIK PŘÁNÍ (Co už partner chce)
                </button>
            </div>

            <!-- MAIN WORKSPACE -->
            <div id="tinder-workspace" class="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#eb459e] mb-2"></div>
                <p class="text-xs text-gray-400 font-bold">Připravuji karty...</p>
            </div>
        </div>
    `;

    // Listen to real-time tinder matches
    window.addEventListener('tinder-match-received', handleExternalMatch);

    await prepareTinderPool();
}

export function setGameMode(mode) {
    if (gameMode === mode) return;
    gameMode = mode;
    triggerHaptic('light');

    ['frequent', 'backlog', 'all'].forEach(m => {
        const btn = document.getElementById(`gm-${m}`);
        if (btn) {
            if (m === mode) {
                if (m === 'frequent') btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20 font-extrabold';
                else if (m === 'backlog') btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/20';
                else btn.className = 'px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-[#5865F2] text-white shadow-md';
            } else {
                if (m === 'frequent') btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-[#202225] text-yellow-400 hover:text-white';
                else if (m === 'backlog') btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-[#202225] text-emerald-400 hover:text-white';
                else btn.className = 'px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-[#202225] text-gray-400 hover:text-white';
            }
        }
    });

    prepareTinderPool();
}

async function prepareTinderPool() {
    const workspace = document.getElementById("tinder-workspace");
    if (!workspace) return;

    try {
        await ensureLibraryData();

        const partnerId = await getPartnerId();
        const myId = state.currentUser?.id;

        // Fetch watchlists from Supabase
        const { data: watchlists } = await supabase
            .from('library_watchlist')
            .select('media_id, added_by, type');

        partnerLikedIds.clear();
        myLikedIds.clear();

        if (watchlists) {
            watchlists.forEach(w => {
                if (w.added_by === myId) myLikedIds.add(w.media_id);
                if (w.added_by === partnerId) partnerLikedIds.add(w.media_id);
            });
        }

        // Get all library movies, series & games
        const movies = (state.library.movies || []).map(i => ({ ...i, type: 'movie' }));
        const series = (state.library.series || []).map(i => ({ ...i, type: 'series' }));
        const games = (state.library.games || []).map(i => ({ ...i, type: 'game' }));
        const allItems = [...movies, ...series, ...games];

        // Filter out items already marked as seen/watched
        const unwatchedItems = allItems.filter(item => {
            const hist = state.watchHistory[item.id];
            return !hist || hist.status !== 'seen';
        });

        // Mode specific filtering
        if (activeMode === 'watchlist') {
            tinderPool = unwatchedItems.filter(item => {
                return partnerLikedIds.has(item.id) && !myLikedIds.has(item.id);
            });
        } else {
            tinderPool = unwatchedItems.filter(item => {
                return !myLikedIds.has(item.id) && !dislikedIds.has(item.id);
            });
        }

        // Apply category filter (movies vs series vs games)
        if (categoryFilter !== 'all') {
            tinderPool = tinderPool.filter(item => item.type === categoryFilter);
        }

        // Special Game Filter (Stálice vs Backlog)
        if (categoryFilter === 'game') {
            if (gameMode === 'frequent') {
                tinderPool = tinderPool.filter(item => item.is_frequent || (item.mood_tags || []).includes('stálice') || item.cat === 'Stálice');
            } else if (gameMode === 'backlog') {
                tinderPool = tinderPool.filter(item => !item.is_frequent && !(item.mood_tags || []).includes('stálice') && item.cat !== 'Stálice');
            }
        }

        // Shuffle pool
        tinderPool = shuffleArray(tinderPool);

        currentIndex = 0;
        renderCardStack();

    } catch (err) {
        console.error("Failed to prepare Tinder pool:", err);
        workspace.innerHTML = `
            <div class="text-center p-6 bg-[#2f3136] rounded-2xl border border-white/5 max-w-sm">
                <div class="text-5xl mb-4">😿</div>
                <h3 class="font-bold text-lg mb-2">Chyba při přípravě karet</h3>
                <p class="text-xs text-gray-400 mb-6">Nepodařilo se načíst obsah knihovny.</p>
                <button onclick="NetflixMatcher.renderNetflixMatcher()" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition">Zkusit znovu</button>
            </div>
        `;
    }
}

function renderCardStack() {
    const workspace = document.getElementById("tinder-workspace");
    if (!workspace) return;

    if (currentIndex >= tinderPool.length) {
        // Empty State
        let emptyTitle = activeMode === 'watchlist' ? 'Máme hotovo! 🎉' : 'Vše prozkoumáno! 🚀';
        let emptyDesc = 'Prošli jste všechny položky v této kategorii.';

        if (categoryFilter === 'game' && gameMode === 'frequent') {
            emptyTitle = 'Žádné další stálice ⚡';
            emptyDesc = 'Všechny vaše označené stálice jste už zhodnotili. Přidejte další v Knihovně nebo přepněte na Všechny hry!';
        } else if (activeMode === 'watchlist') {
            emptyDesc = 'Prošli jste všechna přání, která si partner uložil a ty jsi je ještě nehodnotil(a).';
        } else {
            emptyDesc = 'Prošli jste všechny položky v této kategorii. Můžete přidat nové v Knihovně nebo vyzkoušet jinou kategorii!';
        }

        workspace.innerHTML = `
            <div class="text-center p-8 bg-[#2f3136]/60 rounded-3xl border border-white/5 max-w-sm shadow-2xl animate-scale-up">
                <div class="text-6xl mb-5 filter drop-shadow-[0_0_15px_rgba(235,69,158,0.3)]">${categoryFilter === 'game' ? '🎮✨' : '🍿✨'}</div>
                <h3 class="font-black text-xl mb-2 uppercase tracking-tight text-white">${emptyTitle}</h3>
                <p class="text-xs text-gray-400 leading-relaxed mb-6">${emptyDesc}</p>
                <div class="flex flex-col gap-2.5">
                    ${categoryFilter === 'game' && gameMode === 'frequent' ? `
                    <button onclick="NetflixMatcher.setGameMode('all')" class="w-full bg-[#faa61a] hover:bg-[#e09516] text-black font-black py-3 rounded-xl transition text-xs uppercase tracking-wider shadow-lg">
                        Přepnout na Všechny hry
                    </button>
                    ` : ''}
                    <button onclick="if (state.currentChannel === 'watchlist' && window.Watchlist) { window.Watchlist.renderWatchlist(); } else { window.Library.renderLibrary('${categoryFilter === 'movie' ? 'movies' : (categoryFilter === 'game' ? 'games' : (categoryFilter === 'series' ? 'series' : 'movies'))}'); }" class="w-full bg-[#202225] hover:bg-[#202225]/80 text-white font-bold py-3 rounded-xl transition border border-white/5 text-xs tracking-wider">
                        Zpět do Knihovny / Watchlistu
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const activeItem = tinderPool[currentIndex];
    const nextItem = currentIndex + 1 < tinderPool.length ? tinderPool[currentIndex + 1] : null;

    const hasPoster = !!activeItem.poster_path;
    const posterUrl = hasPoster ? TMDB.getTMDBImageUrl(activeItem.poster_path, 'w780') : null;
    const isGame = activeItem.type === 'game';
    const isFrequentGame = isGame && (activeItem.is_frequent || (activeItem.mood_tags || []).includes('stálice') || activeItem.cat === 'Stálice');

    workspace.innerHTML = `
        <div class="relative w-full max-w-[340px] aspect-[2/3] flex items-center justify-center">
            
            <!-- BACKGROUND CARD PREVIEW (3D Depth) -->
            ${nextItem ? `
            <div class="absolute inset-0 bg-[#202225] rounded-3xl overflow-hidden border border-white/5 scale-95 translate-y-3 opacity-60 pointer-events-none shadow-2xl">
                ${nextItem.poster_path 
                    ? `<img src="${TMDB.getTMDBImageUrl(nextItem.poster_path, 'w342')}" class="w-full h-full object-cover filter blur-[2px]">` 
                    : `<div class="w-full h-full flex items-center justify-center text-7xl opacity-20">${nextItem.icon || '🎬'}</div>`}
            </div>
            ` : ''}

            <!-- ACTIVE INTERACTIVE CARD -->
            <div id="tinder-active-card" 
                 class="relative w-full h-full bg-[#2f3136] rounded-3xl overflow-hidden border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing transform will-change-transform z-10 touch-none">
                
                <!-- STAMPS (LIKE / NOPE) -->
                <div id="stamp-like" class="absolute top-8 left-8 z-30 border-4 border-green-500 text-green-500 font-black text-2xl px-4 py-1.5 rounded-2xl uppercase tracking-widest rotate-[-20deg] opacity-0 pointer-events-none shadow-xl">
                    CHCI TO ❤️
                </div>
                <div id="stamp-nope" class="absolute top-8 right-8 z-30 border-4 border-red-500 text-red-500 font-black text-2xl px-4 py-1.5 rounded-2xl uppercase tracking-widest rotate-[20deg] opacity-0 pointer-events-none shadow-xl">
                    DNES NE ✖️
                </div>

                <!-- BADGE IF STÁLICE -->
                ${isFrequentGame ? `
                <div class="absolute top-4 left-4 z-20 bg-[#faa61a] text-black text-[10px] font-black px-2.5 py-1 rounded-xl shadow-lg border border-black/20 flex items-center gap-1.5 animate-pulse">
                    <i class="fas fa-bolt"></i> NAŠE STÁLICE
                </div>
                ` : ''}

                <!-- POSTER IMAGE / ICON -->
                <div class="w-full h-full relative flex items-center justify-center text-8xl bg-gradient-to-t from-[#202225] to-[#2f3136]">
                    ${hasPoster 
                        ? `<img src="${posterUrl}" alt="${activeItem.title}" class="w-full h-full object-cover pointer-events-none">` 
                        : `<span class="opacity-40 animate-pulse">${activeItem.icon || '🎬'}</span>`}
                    
                    <!-- Dark Gradient Overlay for text readability -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>
                    
                    <!-- Metadata Info inside bottom -->
                    <div class="absolute inset-x-0 bottom-0 p-5 z-20 text-left space-y-2 pointer-events-none select-none">
                        
                        <!-- Genres / Tags -->
                        <div class="flex flex-wrap gap-1.5">
                            ${(activeItem.mood_tags || []).slice(0, 3).map(tag => `<span class="text-[9px] bg-[#5865F2]/40 text-white px-2 py-0.5 rounded border border-[#5865F2]/50 font-bold backdrop-blur-sm shadow-sm">${tag}</span>`).join('')}
                        </div>

                        <!-- Title -->
                        <h2 class="text-xl font-black text-white leading-tight drop-shadow-md truncate" title="${activeItem.title}">
                            ${activeItem.title}
                        </h2>

                        <!-- Info row -->
                        <div class="flex items-center gap-3 text-[10px] font-bold text-gray-300 drop-shadow">
                            <span class="uppercase tracking-widest text-[#eb459e]"><i class="fas ${activeItem.type === 'game' ? 'fa-gamepad' : (activeItem.type === 'series' ? 'fa-tv' : 'fa-film')} mr-1"></i> ${activeItem.type === 'movie' ? 'Film' : (activeItem.type === 'series' ? 'Seriál' : 'Hra')}</span>
                            ${activeItem.runtime ? `<span>•</span> <span>${activeItem.runtime > 60 ? `${Math.floor(activeItem.runtime / 60)}h ${activeItem.runtime % 60}m` : `${activeItem.runtime}m`}</span>` : ''}
                            ${activeItem.cat ? `<span>•</span> <span class="text-yellow-400">${activeItem.cat}</span>` : ''}
                            ${activeItem.rating ? `<span>•</span> <span class="text-[#faa61a]">⭐ ${activeItem.rating.toFixed(1)}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ACTIONS BUTTON DECK -->
        <div class="flex items-center justify-center gap-6 mt-7 z-20">
            <!-- Dislike -->
            <button onclick="NetflixMatcher.swipeLeft()" class="w-14 h-14 rounded-full bg-[#202225] border border-white/5 text-red-500 flex items-center justify-center text-xl shadow-xl hover:scale-110 active:scale-95 transition transform hover:bg-red-500/10" title="Přeskočit">
                <i class="fas fa-times"></i>
            </button>
            
            <!-- Detail / Info -->
            <button onclick="NetflixMatcher.openDetail(${activeItem.id})" class="w-11 h-11 rounded-full bg-[#202225] border border-white/5 text-gray-400 flex items-center justify-center text-sm shadow-xl hover:scale-110 active:scale-95 transition transform hover:text-white" title="Info">
                <i class="fas fa-info"></i>
            </button>
            
            <!-- Like -->
            <button onclick="NetflixMatcher.swipeRight()" class="w-14 h-14 rounded-full bg-[#202225] border border-white/5 text-green-500 flex items-center justify-center text-xl shadow-xl hover:scale-110 active:scale-95 transition transform hover:bg-green-500/10" title="Chci si pustit/zahrát">
                <i class="fas fa-heart"></i>
            </button>
        </div>
    `;

    // Attach Pointer Drag listeners to Card
    activeCardElement = document.getElementById("tinder-active-card");
    if (activeCardElement) {
        activeCardElement.addEventListener("pointerdown", handlePointerDown);
        activeCardElement.addEventListener("pointermove", handlePointerMove);
        activeCardElement.addEventListener("pointerup", handlePointerUp);
        activeCardElement.addEventListener("pointercancel", handlePointerUp);
    }
}

// --- POINTER SWIPE HANDLERS ---

function handlePointerDown(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    activeCardElement.style.transition = "none";
}

function handlePointerMove(e) {
    if (!isDragging) return;

    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;

    // Apply translation and rotation
    const rotation = offsetX / 12;
    activeCardElement.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`;

    // Update stamp opacities
    const stampLike = document.getElementById("stamp-like");
    const stampNope = document.getElementById("stamp-nope");

    if (offsetX > 0) {
        const opacity = Math.min(offsetX / 80, 1);
        if (stampLike) stampLike.style.opacity = opacity;
        if (stampNope) stampNope.style.opacity = 0;
    } else {
        const opacity = Math.min(Math.abs(offsetX) / 80, 1);
        if (stampNope) stampNope.style.opacity = opacity;
        if (stampLike) stampLike.style.opacity = 0;
    }
}

function handlePointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const threshold = 110;

    if (offsetX > threshold) {
        swipeRightAnimation();
    } else if (offsetX < -threshold) {
        swipeLeftAnimation();
    } else {
        triggerHaptic('light');
        activeCardElement.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        activeCardElement.style.transform = `translate(0, 0) rotate(0)`;
        
        const stampLike = document.getElementById("stamp-like");
        const stampNope = document.getElementById("stamp-nope");
        if (stampLike) stampLike.style.opacity = 0;
        if (stampNope) stampNope.style.opacity = 0;
    }
}

function swipeRightAnimation() {
    triggerHaptic('success');
    activeCardElement.style.transition = "transform 0.4s ease-out, opacity 0.4s ease-out";
    activeCardElement.style.transform = `translate(400px, ${offsetY * 1.5}px) rotate(35deg)`;
    activeCardElement.style.opacity = 0;
    
    const stampLike = document.getElementById("stamp-like");
    if (stampLike) stampLike.style.opacity = 1;

    setTimeout(() => {
        handleSwipe(tinderPool[currentIndex], 'like');
    }, 200);
}

function swipeLeftAnimation() {
    triggerHaptic('medium');
    activeCardElement.style.transition = "transform 0.4s ease-out, opacity 0.4s ease-out";
    activeCardElement.style.transform = `translate(-400px, ${offsetY * 1.5}px) rotate(-35deg)`;
    activeCardElement.style.opacity = 0;
    
    const stampNope = document.getElementById("stamp-nope");
    if (stampNope) stampNope.style.opacity = 1;

    setTimeout(() => {
        handleSwipe(tinderPool[currentIndex], 'dislike');
    }, 200);
}

export function swipeLeft() {
    if (!activeCardElement) return;
    offsetX = -150;
    offsetY = 30;
    swipeLeftAnimation();
}

export function swipeRight() {
    if (!activeCardElement) return;
    offsetX = 150;
    offsetY = 30;
    swipeRightAnimation();
}

function handleSwipe(item, action) {
    if (!item) return;

    if (action === 'dislike') {
        dislikedIds.add(item.id);
        localStorage.setItem('kiscord_tinder_disliked', JSON.stringify([...dislikedIds]));
        
        currentIndex++;
        renderCardStack();
    } else {
        state.watchlist.push({
            id: item.id,
            type: item.type,
            user_id: state.currentUser?.id
        });
        myLikedIds.add(item.id);

        const partnerLiked = partnerLikedIds.has(item.id);
        if (partnerLiked) {
            triggerHaptic('heavy');
            triggerConfetti();
            broadcastTinderMatch(item);
            showMatchWinnerScreen(item);
        } else {
            currentIndex++;
            renderCardStack();
        }

        safeInsert('library_watchlist', {
            media_id: item.id,
            type: item.type,
            added_by: state.currentUser?.id
        }).catch(e => {
            console.error("Failed to save like swipe:", e);
        });
    }
}

// --- MATCH SCREEN OVERLAY ---

function showMatchWinnerScreen(item) {
    let overlay = document.getElementById("tinder-match-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "tinder-match-overlay";
        overlay.className = "fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fade-in";
        document.body.appendChild(overlay);
    }

    const hasPoster = !!item.poster_path;
    const posterUrl = hasPoster ? TMDB.getTMDBImageUrl(item.poster_path, 'w342') : null;
    const isGame = item.type === 'game';

    overlay.innerHTML = `
        <div class="text-center space-y-6 max-w-sm w-full animate-scale-up">
            
            <div class="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#eb459e] via-[#faa61a] to-[#5865F2] bg-clip-text text-transparent animate-pulse tracking-tight">
                MÁME SHODU! 💖
            </div>
            
            <p class="text-gray-300 text-sm italic">${isGame ? 'Dneska večer se hraje...' : 'Tohle si dneska pustíte ke sledování!'}</p>

            <div class="w-48 h-72 rounded-3xl mx-auto border-4 border-[#eb459e] shadow-[0_0_40px_rgba(235,69,158,0.5)] overflow-hidden bg-[#202225] flex items-center justify-center text-7xl">
                ${hasPoster 
                    ? `<img src="${posterUrl}" loading="lazy" alt="${item.title}" class="w-full h-full object-cover">` 
                    : item.icon || (isGame ? '🎮' : '🎬')}
            </div>

            <div class="space-y-1">
                <h3 class="text-2xl font-black text-white leading-tight px-4">${item.title}</h3>
                <p class="text-xs text-yellow-400 font-bold uppercase tracking-widest">${isGame ? '🎮 Hra na večer' : (item.type === 'series' ? '📺 Seriál' : '🎬 Film')}</p>
            </div>

            <div class="flex flex-col gap-3 pt-6 px-4">
                <button onclick="NetflixMatcher.planMatchDate('${item.title.replace(/'/g, "\\'")}', '${item.type}')" 
                    class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] text-white py-4 rounded-xl font-black text-sm tracking-wide transition transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-[#eb459e]/30">
                    <i class="far fa-calendar-plus mr-2"></i> ${isGame ? 'ROZEHRÁT / NAPLÁNOVAT! 🎮' : 'NAPLÁNOVAT VEČER! 📅'}
                </button>
                <button onclick="NetflixMatcher.closeMatchOverlay()" 
                    class="w-full py-2.5 text-gray-500 hover:text-white transition text-xs font-bold tracking-wider uppercase">
                    Pokračovat ve swipování
                </button>
            </div>
        </div>
    `;
}

// --- CALLBACK FUNCTIONS ---

export function closeMatchOverlay() {
    const overlay = document.getElementById("tinder-match-overlay");
    if (overlay) overlay.remove();

    currentIndex++;
    renderCardStack();
}

export async function planMatchDate(title, type) {
    const overlay = document.getElementById("tinder-match-overlay");
    if (overlay) overlay.remove();

    if (!window.Library) {
        await import('./library.js');
    }
    window.Library.openPlanningModal(title, type === 'game' ? 'game' : 'movie');

    if (window.Watchlist) {
        Watchlist.renderWatchlist();
    }
}

export async function openDetail(id) {
    if (!window.Library) {
        await import('./library.js');
    }
    window.Library.openHistoryModal(id);
}

export function setMode(mode) {
    if (activeMode === mode) return;
    activeMode = mode;
    triggerHaptic('medium');
    
    NetflixMatcher.renderNetflixMatcher(categoryFilter);
}

export function setCategoryFilter(filter) {
    if (categoryFilter === filter) return;
    categoryFilter = filter;
    triggerHaptic('light');

    renderNetflixMatcher(filter);
}

function handleExternalMatch(e) {
    const payload = e.detail;
    if (payload && payload.media) {
        if (document.getElementById("tinder-workspace")) {
            triggerHaptic('heavy');
            triggerConfetti();
            showMatchWinnerScreen(payload.media);
        }
    }
}

async function getPartnerId() {
    const myId = state.currentUser?.id;
    if (!myId) return null;
    const { jose, klarka } = state.user_ids || {};
    if (jose && klarka) {
        return (myId === jose) ? klarka : jose;
    }
    return null;
}

function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
