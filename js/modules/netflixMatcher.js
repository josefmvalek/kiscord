import { state, ensureLibraryData } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { safeInsert } from '../core/offline.js';
import { broadcastTinderMatch } from '../core/sync.js';
import * as TMDB from '../core/tmdb.js';

let activeMode = 'watchlist'; // 'watchlist' or 'discovery'
let categoryFilter = 'all';  // 'all', 'movie', 'series'
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

export async function renderNetflixMatcher() {
    // Expose API to window for callbacks
    window.NetflixMatcher = {
        setMode,
        setCategoryFilter,
        swipeLeft,
        swipeRight,
        openDetail,
        closeMatchOverlay,
        planMatchDate,
        renderNetflixMatcher
    };

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

    // Render basic template with loading skeleton
    container.innerHTML = `
        <div class="flex flex-col h-full animate-fade-in bg-[#36393f] relative overflow-hidden text-white">
            <!-- Background lights -->
            <div class="absolute top-0 right-0 w-80 h-80 bg-[#eb459e]/10 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-0 left-0 w-80 h-80 bg-[#5865F2]/10 rounded-full blur-[120px]"></div>

            <!-- HEADER -->
            <div class="relative bg-[#2f3136]/90 backdrop-blur-md border-b border-[#202225] p-5 z-20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <button onclick="Watchlist.renderWatchlist(); triggerHaptic('light')" class="text-gray-400 hover:text-white transition p-2 rounded-lg bg-[#202225]/50 border border-white/5">
                        <i class="fas fa-arrow-left"></i> Zpět
                    </button>
                    <div>
                        <h1 class="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            <i class="fas fa-fire text-[#eb459e] animate-pulse"></i> Filmový Tinder
                        </h1>
                        <p class="text-xs text-gray-400">Najděte společný film pro dnešní večer 🍿</p>
                    </div>
                </div>

                <!-- CATEGORY FILTER -->
                <div class="flex bg-[#202225] rounded-xl p-1 border border-white/5 text-xs font-bold">
                    <button onclick="NetflixMatcher.setCategoryFilter('all')" id="cat-all" class="px-3 py-1.5 rounded-lg transition-all ${categoryFilter === 'all' ? 'bg-[#5865F2] text-white' : 'text-gray-400 hover:text-white'}">Vše</button>
                    <button onclick="NetflixMatcher.setCategoryFilter('movie')" id="cat-movie" class="px-3 py-1.5 rounded-lg transition-all ${categoryFilter === 'movie' ? 'bg-[#5865F2] text-white' : 'text-gray-400 hover:text-white'}">Filmy</button>
                    <button onclick="NetflixMatcher.setCategoryFilter('series')" id="cat-series" class="px-3 py-1.5 rounded-lg transition-all ${categoryFilter === 'series' ? 'bg-[#5865F2] text-white' : 'text-gray-400 hover:text-white'}">Seriály</button>
                </div>
            </div>

            <!-- MODE TABS -->
            <div class="bg-[#2f3136]/50 border-b border-[#202225] p-3 flex justify-center gap-4 z-10">
                <button onclick="NetflixMatcher.setMode('watchlist')" id="mode-watchlist" 
                    class="px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all duration-300 border flex items-center gap-2 ${activeMode === 'watchlist' ? 'bg-gradient-to-r from-[#eb459e] to-[#f47fff] text-white shadow-lg border-transparent' : 'bg-[#202225] border-white/5 text-gray-400 hover:text-white'}">
                    <i class="fas fa-heart"></i> PRŮNIK PŘÁNÍ
                </button>
                <button onclick="NetflixMatcher.setMode('discovery')" id="mode-discovery" 
                    class="px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all duration-300 border flex items-center gap-2 ${activeMode === 'discovery' ? 'bg-gradient-to-r from-[#5865F2] to-[#4752c4] text-white shadow-lg border-transparent' : 'bg-[#202225] border-white/5 text-gray-400 hover:text-white'}">
                    <i class="fas fa-compass"></i> NOVÉ OBJEVOVÁNÍ
                </button>
            </div>

            <!-- MAIN WORKSPACE -->
            <div id="tinder-workspace" class="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#eb459e] mb-2"></div>
                <p class="text-xs text-gray-400">Načítám filmotéku...</p>
            </div>
        </div>
    `;

    // Listen to real-time tinder matches
    window.addEventListener('tinder-match-received', handleExternalMatch);

    await prepareTinderPool();
}

async function prepareTinderPool() {
    const workspace = document.getElementById("tinder-workspace");
    if (!workspace) return;

    try {
        await ensureLibraryData();

        const partnerId = await getPartnerId();
        const myId = state.currentUser?.id;

        // Fetch watchlists from Supabase to get both partners' current statuses
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

        // Get all library movies & series
        const movies = state.library.movies || [];
        const series = state.library.series || [];
        const allItems = [...movies, ...series].map(item => ({
            ...item,
            type: movies.includes(item) ? 'movie' : 'series'
        }));

        // Filter out items already marked as seen/watched in watchHistory
        const unwatchedItems = allItems.filter(item => {
            const hist = state.watchHistory[item.id];
            return !hist || hist.status !== 'seen';
        });

        // Mode specific filtering
        if (activeMode === 'watchlist') {
            // Pool contains items that the PARTNER liked, but the CURRENT USER hasn't liked yet
            tinderPool = unwatchedItems.filter(item => {
                return partnerLikedIds.has(item.id) && !myLikedIds.has(item.id);
            });
        } else {
            // Pool contains all unwatched library items that the CURRENT USER hasn't liked yet
            tinderPool = unwatchedItems.filter(item => {
                return !myLikedIds.has(item.id) && !dislikedIds.has(item.id);
            });
        }

        // Apply category filter (movies vs series)
        if (categoryFilter !== 'all') {
            tinderPool = tinderPool.filter(item => item.type === categoryFilter);
        }

        // Shuffle pool deterministically so they get similar sequences but keeping it fresh
        tinderPool = shuffleArray(tinderPool);

        currentIndex = 0;
        renderCardStack();

    } catch (err) {
        console.error("Failed to prepare Tinder pool:", err);
        workspace.innerHTML = `
            <div class="text-center p-6 bg-[#2f3136] rounded-2xl border border-white/5 max-w-sm">
                <div class="text-5xl mb-4">😿</div>
                <h3 class="font-bold text-lg mb-2">Chyba při přípravě filmů</h3>
                <p class="text-xs text-gray-400 mb-6">Nepodařilo se nám propojit s databází.</p>
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
        const emptyTitle = activeMode === 'watchlist' ? 'Máme hotovo! 🎉' : 'Vše prohledáno! 🚀';
        const emptyDesc = activeMode === 'watchlist' 
            ? 'Prošli jste všechny filmy, které si partner uložil do přání a ty jsi je ještě nehodnotil(a). Skvělá práce!' 
            : 'Prošli jste celou naši filmotéku. Běžte do Knihovny a přidejte nějaké další kousky ke swipování!';

        workspace.innerHTML = `
            <div class="text-center p-8 bg-[#2f3136]/50 rounded-3xl border border-white/5 max-w-sm shadow-2xl animate-scale-up">
                <div class="text-6xl mb-6 filter drop-shadow-[0_0_15px_rgba(235,69,158,0.3)]">🍿✨</div>
                <h3 class="font-black text-xl mb-3 uppercase tracking-tight text-white">${emptyTitle}</h3>
                <p class="text-xs text-gray-400 leading-relaxed mb-8">${emptyDesc}</p>
                <div class="flex flex-col gap-3">
                    <button onclick="Watchlist.renderWatchlist(); triggerHaptic('light')" class="w-full bg-[#202225] hover:bg-[#202225]/80 text-white font-bold py-3.5 rounded-xl transition border border-white/5 text-xs tracking-wider">
                        Zpět do Watchlistu
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Render stack (Active card, plus one behind it for 3D layout)
    const activeItem = tinderPool[currentIndex];
    const nextItem = currentIndex + 1 < tinderPool.length ? tinderPool[currentIndex + 1] : null;

    workspace.innerHTML = `
        <div class="relative w-full max-w-[340px] aspect-[2/3] flex items-center justify-center">
            
            <!-- NEXT CARD (Background) -->
            ${nextItem ? `
            <div class="absolute inset-0 rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-[#202225] transform translate-y-3 scale-95 opacity-60 z-0 pointer-events-none select-none">
                <img src="${nextItem.poster_path ? TMDB.getTMDBImageUrl(nextItem.poster_path, 'w342') : ''}" loading="lazy" class="w-full h-full object-cover blur-sm opacity-30">
            </div>
            ` : ''}

            <!-- ACTIVE CARD -->
            <div id="tinder-active-card" class="absolute inset-0 rounded-3xl overflow-hidden border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] bg-[#2f3136] z-10 flex flex-col cursor-grab active:cursor-grabbing transform rotate-0 translate-x-0 translate-y-0" style="touch-action: none;">
                
                <!-- Stamps -->
                <div id="stamp-like" class="absolute top-8 left-8 border-4 border-green-500 text-green-500 uppercase font-black text-3xl px-4 py-2 rounded-xl rotate-[-12deg] opacity-0 pointer-events-none z-30 tracking-widest shadow-lg">LÍBÍ SE</div>
                <div id="stamp-nope" class="absolute top-8 right-8 border-4 border-red-500 text-red-500 uppercase font-black text-3xl px-4 py-2 rounded-xl rotate-[12deg] opacity-0 pointer-events-none z-30 tracking-widest shadow-lg">NECHCI</div>

                <!-- Rating badge -->
                ${activeItem.rating ? `
                <div class="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-black text-[#faa61a] border border-[#faa61a]/30 z-20 shadow-md">
                    ⭐ ${activeItem.rating.toFixed(1)}
                </div>
                ` : ''}

                <!-- Poster / Image -->
                <div class="flex-1 bg-[#202225] relative overflow-hidden pointer-events-none select-none">
                    ${activeItem.poster_path 
                        ? `<img src="${TMDB.getTMDBImageUrl(activeItem.poster_path, 'w342')}" loading="lazy" alt="${activeItem.title}" class="w-full h-full object-cover">` 
                        : `<div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2f3136] to-[#202225] text-8xl">${activeItem.icon || '🎬'}</div>`}
                    
                    <!-- Gradient overlay on bottom of card info -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
                    
                    <!-- Metadata Info inside bottom -->
                    <div class="absolute inset-x-0 bottom-0 p-6 z-20 text-left space-y-3 pointer-events-none select-none">
                        
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
                            <span class="uppercase tracking-widest text-[#eb459e]"><i class="fas ${activeItem.type === 'game' ? 'fa-gamepad' : 'fa-film'} mr-1"></i> ${activeItem.type === 'movie' ? 'Film' : 'Seriál'}</span>
                            ${activeItem.runtime ? `<span>•</span> <span>${activeItem.runtime > 60 ? `${Math.floor(activeItem.runtime / 60)}h ${activeItem.runtime % 60}m` : `${activeItem.runtime}m`}</span>` : ''}
                            ${activeItem.release_year ? `<span>•</span> <span>${activeItem.release_year}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ACTIONS BUTTON DECK -->
        <div class="flex items-center justify-center gap-6 mt-8 z-20">
            <!-- Dislike -->
            <button onclick="NetflixMatcher.swipeLeft()" class="w-14 h-14 rounded-full bg-[#202225] border border-white/5 text-red-500 flex items-center justify-center text-xl shadow-xl hover:scale-110 active:scale-95 transition transform hover:bg-red-500/10">
                <i class="fas fa-times"></i>
            </button>
            
            <!-- Detail / Info -->
            <button onclick="NetflixMatcher.openDetail(${activeItem.id})" class="w-10 h-10 rounded-full bg-[#202225] border border-white/5 text-gray-400 flex items-center justify-center text-sm shadow-xl hover:scale-110 active:scale-95 transition transform hover:text-white">
                <i class="fas fa-info"></i>
            </button>
            
            <!-- Like -->
            <button onclick="NetflixMatcher.swipeRight()" class="w-14 h-14 rounded-full bg-[#202225] border border-white/5 text-green-500 flex items-center justify-center text-xl shadow-xl hover:scale-110 active:scale-95 transition transform hover:bg-green-500/10">
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
    const rotation = offsetX / 12; // Rotate 1 deg for every 12px drag
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

    const threshold = 110; // Drag 110px to trigger action

    if (offsetX > threshold) {
        // Swipe Right
        swipeRightAnimation();
    } else if (offsetX < -threshold) {
        // Swipe Left
        swipeLeftAnimation();
    } else {
        // Snap back to center
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

// Trigger handlers for manual actions (clicking ❌ or ❤️)
export function swipeLeft() {
    if (isDragging) return;
    offsetY = 30; // Simulate organic tilt
    swipeLeftAnimation();
}

export function swipeRight() {
    if (isDragging) return;
    offsetY = 30; // Simulate organic tilt
    swipeRightAnimation();
}

async function handleSwipe(item, action) {
    if (action === 'dislike') {
        // Save to disliked set
        dislikedIds.add(item.id);
        localStorage.setItem('kiscord_tinder_disliked', JSON.stringify([...dislikedIds]));
        
        currentIndex++;
        renderCardStack();
    } else {
        // Like operation
        try {
            // Push to Supabase watchlist
            await safeInsert('library_watchlist', {
                media_id: item.id,
                type: item.type,
                added_by: state.currentUser?.id
            });

            // Update local watchlist cache
            state.watchlist.push({
                id: item.id,
                type: item.type,
                user_id: state.currentUser?.id
            });
            
            myLikedIds.add(item.id);

            // Match checking!
            const partnerLiked = partnerLikedIds.has(item.id);
            if (partnerLiked) {
                // IT'S A MATCH! 💖
                triggerHaptic('heavy');
                triggerConfetti();
                
                // Broadcast match in realtime to partner
                broadcastTinderMatch(item);

                // Show winner screen overlay
                showMatchWinnerScreen(item);
            } else {
                // No match yet, just regular save
                currentIndex++;
                renderCardStack();
            }

        } catch (e) {
            console.error("Failed to save like swipe:", e);
            showNotification("Chyba při ukládání volby... 😕", "error");
            currentIndex++;
            renderCardStack();
        }
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

    overlay.innerHTML = `
        <div class="text-center space-y-6 max-w-sm w-full animate-scale-up">
            
            <!-- Header title with gold/pink shiny gradient -->
            <div class="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#eb459e] via-[#faa61a] to-[#5865F2] bg-clip-text text-transparent animate-pulse tracking-tight">
                MÁME SHODU! 💖
            </div>
            
            <p class="text-gray-300 text-sm italic">Tohle si dneska pustíte ke sledování!</p>

            <!-- Glow poster frame -->
            <div class="w-48 h-72 rounded-3xl mx-auto border-4 border-[#eb459e] shadow-[0_0_40px_rgba(235,69,158,0.5)] overflow-hidden bg-[#202225] flex items-center justify-center text-7xl">
                ${hasPoster 
                    ? `<img src="${posterUrl}" loading="lazy" alt="${item.title}" class="w-full h-full object-cover">` 
                    : item.icon || '🎬'}
            </div>

            <div class="space-y-1">
                <h3 class="text-2xl font-black text-white leading-tight px-4">${item.title}</h3>
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">${item.type === 'movie' ? 'Film' : 'Seriál'}</p>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-col gap-3 pt-6 px-4">
                <button onclick="NetflixMatcher.planMatchDate('${item.title.replace(/'/g, "\\'")}', '${item.type}')" 
                    class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] text-white py-4 rounded-xl font-black text-sm tracking-wide transition transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-[#eb459e]/30">
                    <i class="far fa-calendar-plus mr-2"></i> NAPLÁNOVAT VEČER! 📅
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

    // Advance pool queue to next card
    currentIndex++;
    renderCardStack();
}

export async function planMatchDate(title, type) {
    const overlay = document.getElementById("tinder-match-overlay");
    if (overlay) overlay.remove();

    // Dynamically call Library planning panel
    if (!window.Library) {
        await import('./library.js');
    }
    window.Library.openPlanningModal(title, type === 'game' ? 'game' : 'movie');

    // Return to Watchlist view
    Watchlist.renderWatchlist();
}

export async function openDetail(id) {
    if (!window.Library) {
        await import('./library.js');
    }
    window.Library.openHistoryModal(id);
}

// Set swiping mode: 'watchlist' (co-liked filter) or 'discovery' (library filter)
export function setMode(mode) {
    if (activeMode === mode) return;
    activeMode = mode;
    triggerHaptic('medium');
    
    NetflixMatcher.renderNetflixMatcher();
}

// Set category filter: 'all', 'movie', 'series'
export function setCategoryFilter(filter) {
    if (categoryFilter === filter) return;
    categoryFilter = filter;
    triggerHaptic('light');

    // Update active visual tabs
    ['all', 'movie', 'series'].forEach(cat => {
        const btn = document.getElementById(`cat-${cat}`);
        if (btn) {
            if (cat === filter) {
                btn.classList.add('bg-[#5865F2]', 'text-white');
                btn.classList.remove('text-gray-400', 'hover:text-white');
            } else {
                btn.classList.remove('bg-[#5865F2]', 'text-white');
                btn.classList.add('text-gray-400', 'hover:text-white');
            }
        }
    });

    prepareTinderPool();
}

// Handles live Match event broadcasts from the partner
function handleExternalMatch(e) {
    const payload = e.detail;
    if (payload && payload.media) {
        // If we are currently in watchlist / tinder channel, trigger match window live!
        if (state.currentChannel === 'watchlist' && document.getElementById("tinder-workspace")) {
            triggerHaptic('heavy');
            triggerConfetti();
            showMatchWinnerScreen(payload.media);
        }
    }
}

// Helper to get partner user id
async function getPartnerId() {
    const myId = state.currentUser?.id;
    if (!myId) return null;
    const { jose, klarka } = state.user_ids || {};
    if (jose && klarka) {
        return (myId === jose) ? klarka : jose;
    }
    return null;
}

// Simple array shuffle helper
function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
