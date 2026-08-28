import { state, stateEvents } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { triggerHaptic } from '@core/utils.js';
import { isKlarka, isJosef } from '@core/auth.js';
import { ensureLibraryData } from '@core/loaders.js';
import * as TMDB from '@core/tmdb.js';
import { renderNetflixMatcher } from '@domains/entertainment/netflix-matcher.js';

let activeCategoryFilter = 'all'; // 'all', 'movie', 'series', 'game'

// --- MODERN WATCHLIST HUB ---

export function renderWatchlist(cat = null) {
    state.currentChannel = 'watchlist';
    if (typeof cat === 'string' && ['all', 'movie', 'series', 'game'].includes(cat)) {
        activeCategoryFilter = cat;
    }

    // Expose API to window
    window.Watchlist = { 
        renderWatchlist, 
        rollTheDice, 
        startTinder, 
        setCategoryFilter,
        removeWatchlistItem 
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    // Dynamic naming
    const user = state.currentUser;
    const partnerName = isKlarka(user) ? "Jožkova přání" : "Klárčina přání";
    const partnerIcon = isKlarka(user) ? "🤴" : "👸";
    const partnerColor = isKlarka(user) ? "#5865F2" : "#f47fff";
    const libTarget = activeCategoryFilter === 'game' ? 'games' : (activeCategoryFilter === 'series' ? 'series' : 'movies');

    const allMedia = [
        ...(state.library?.movies || []),
        ...(state.library?.series || []),
        ...(state.library?.games || [])
    ];
    const hasCachedData = (state.watchlist || []).length > 0 && allMedia.length > 0;

    container.innerHTML = `
        <div class="flex flex-col h-full animate-fade-in bg-[#36393f] relative overflow-hidden text-white">
            <!-- Background Decoration -->
            <div class="absolute top-0 right-0 w-96 h-96 bg-[#eb459e]/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 w-96 h-96 bg-[#5865F2]/10 rounded-full blur-[140px] pointer-events-none"></div>

            <!-- HEADER -->
            <div class="relative bg-[#2f3136]/90 backdrop-blur-md border-b border-[#202225] p-5 lg:p-7 z-10 shadow-lg">
                <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">❤️</span>
                            <h1 class="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                Náš Společný Watchlist
                            </h1>
                        </div>
                        <p class="text-gray-400 text-xs mt-1">Co si dneska pustíme nebo zahrajeme? Výběr na večer, shody a recenze 🍿🎮</p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2.5">
                        <button onclick="window.switchChannel ? window.switchChannel('knihovna') : (window.Library ? window.Library.renderLibrary('${libTarget}') : window.loadModule('library').then(m => m.renderLibrary('${libTarget}'))); triggerHaptic('light')"
                            class="bg-[#202225] hover:bg-[#2f3136] text-gray-300 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-md"
                            title="Přejít do katalogu Knihovny">
                            <i class="fas fa-film"></i> Otevřít Knihovnu
                        </button>
                        <button onclick="Watchlist.startTinder()" 
                            class="bg-gradient-to-r from-[#eb459e] to-[#f47fff] hover:from-[#d83c8c] hover:to-[#e06ee0] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-xl hover:shadow-[#eb459e]/30 transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
                            <i class="fas fa-fire animate-pulse"></i> 🎲 Tinder Matcher
                        </button>
                        <button onclick="Watchlist.rollTheDice()" 
                            class="bg-gradient-to-r from-[#5865F2] to-[#4752c4] hover:from-[#4752c4] hover:to-[#3c45a5] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-xl hover:shadow-[#5865F2]/30 transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
                            <i class="fas fa-dice text-[#faa61a]"></i> Kostka Náhody
                        </button>
                    </div>
                </div>

                <!-- FILTER BAR -->
                <div class="max-w-7xl mx-auto flex items-center justify-between gap-4 mt-5 pt-3 border-t border-white/5">
                    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1 hidden sm:inline">Filtr:</span>
                        <button onclick="Watchlist.setCategoryFilter('all')" id="wl-filter-all"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${activeCategoryFilter === 'all' ? 'bg-[#5865F2] text-white shadow-md' : 'bg-[#202225] text-gray-400 hover:text-white'}">
                            Všechno
                        </button>
                        <button onclick="Watchlist.setCategoryFilter('movie')" id="wl-filter-movie"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${activeCategoryFilter === 'movie' ? 'bg-[#5865F2] text-white shadow-md' : 'bg-[#202225] text-gray-400 hover:text-white'}">
                            🎬 Filmy
                        </button>
                        <button onclick="Watchlist.setCategoryFilter('series')" id="wl-filter-series"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${activeCategoryFilter === 'series' ? 'bg-[#5865F2] text-white shadow-md' : 'bg-[#202225] text-gray-400 hover:text-white'}">
                            📺 Seriály
                        </button>
                        <button onclick="Watchlist.setCategoryFilter('game')" id="wl-filter-game"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${activeCategoryFilter === 'game' ? 'bg-[#5865F2] text-white shadow-md' : 'bg-[#202225] text-gray-400 hover:text-white'}">
                            🎮 Hry
                        </button>
                    </div>

                    <div id="wl-stats-counter" class="text-xs text-gray-400 font-bold hidden sm:block">
                        Načítám přání...
                    </div>
                </div>
            </div>

            <!-- WATCHLIST CONTENT -->
            <div id="wl-loading" class="flex-1 flex flex-col items-center justify-center p-12 ${hasCachedData ? 'hidden' : ''}">
                 <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#eb459e] mb-3"></div>
                 <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">Hledám společná přání...</p>
            </div>
            
            <div id="wl-container" class="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 ${hasCachedData ? '' : 'hidden'}">
                <div class="max-w-7xl mx-auto space-y-12 pb-24">
                    
                    <!-- SPOLU-SEZNAM (Together Mode) -->
                    <section id="wl-together-section" class="hidden">
                        <div class="bg-gradient-to-r from-[#eb459e]/20 via-[#f47fff]/10 to-transparent p-5 rounded-2xl border border-[#eb459e]/30 mb-6 shadow-xl relative overflow-hidden">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-2xl animate-bounce">💖</span>
                                        <h2 class="text-lg font-black text-white uppercase tracking-wider">
                                            SPOLU-SEZNAM (Společné shody)
                                        </h2>
                                    </div>
                                    <p class="text-xs text-[#f47fff] mt-0.5 font-medium">Tohle si přejete vidět nebo hrát oba dva! Ideální volba na dnešní rande 🌟</p>
                                </div>
                                <button onclick="Watchlist.rollTheDice()" class="bg-[#eb459e] hover:bg-[#d83c8c] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 self-start sm:self-auto transition transform hover:scale-105">
                                    <i class="fas fa-dice"></i> Vyber za nás!
                                </button>
                            </div>
                        </div>
                        <div id="wl-together-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"></div>
                    </section>

                    <!-- OSOBNÍ PŘÁNÍ (Dva sloupce / Grid) -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- Moje přání -->
                        <section id="wl-my-section" class="bg-[#2f3136]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-lg">
                             <div class="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                                <h2 class="text-sm font-black text-[#5865F2] uppercase tracking-wider flex items-center gap-2">
                                    <span>🙋‍♂️ Moje přání</span>
                                    <span id="wl-my-count" class="text-[10px] bg-[#5865F2]/20 text-[#5865F2] px-2 py-0.5 rounded-full border border-[#5865F2]/30 font-bold">0</span>
                                </h2>
                            </div>
                            <div id="wl-my-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-3.5"></div>
                        </section>

                        <!-- Partnerovo přání -->
                        <section id="wl-her-section" class="bg-[#2f3136]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-lg">
                             <div class="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                                <h2 class="text-sm font-black text-[${partnerColor}] uppercase tracking-wider flex items-center gap-2">
                                    <span>${partnerIcon} ${partnerName}</span>
                                    <span id="wl-her-count" class="text-[10px] bg-[${partnerColor}]/20 text-[${partnerColor}] px-2 py-0.5 rounded-full border border-[${partnerColor}]/30 font-bold">0</span>
                                </h2>
                            </div>
                            <div id="wl-her-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-3.5"></div>
                        </section>
                    </div>

                    <!-- NEDÁVNÉ ZÁŽITKY & RECENZE -->
                    <section id="wl-memories-section" class="bg-[#2f3136]/40 border border-white/5 rounded-2xl p-5 shadow-lg hidden">
                        <div class="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                            <h2 class="text-sm font-black text-[#faa61a] uppercase tracking-wider flex items-center gap-2">
                                <i class="fas fa-history"></i> Nedávné zážitky & Recenze
                            </h2>
                            <span class="text-xs text-gray-500 font-normal">Posledních 6 záznamů</span>
                        </div>
                        <div id="wl-memories-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"></div>
                    </section>

                </div>
            </div>
        </div>`;

    if (hasCachedData) {
        renderWatchlistDOM(state.watchlist, allMedia);
    }

    fetchAndRenderWatchlist();
}

export function setCategoryFilter(cat) {
    activeCategoryFilter = cat;
    triggerHaptic('light');

    ['all', 'movie', 'series', 'game'].forEach(c => {
        const btn = document.getElementById(`wl-filter-${c}`);
        if (btn) {
            if (c === cat) {
                btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all bg-[#5865F2] text-white shadow-md';
            } else {
                btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all bg-[#202225] text-gray-400 hover:text-white';
            }
        }
    });

    const allMedia = [
        ...(state.library?.movies || []),
        ...(state.library?.series || []),
        ...(state.library?.games || [])
    ];
    if (state.watchlist && allMedia.length > 0) {
        renderWatchlistDOM(state.watchlist, allMedia);
    }
    fetchAndRenderWatchlist();
}

function renderWatchlistDOM(watchlistEntries, allMedia) {
    if (state.currentChannel !== 'watchlist') return;
    const loading = document.getElementById('wl-loading');
    const container = document.getElementById('wl-container');
    if (loading) loading.style.display = 'none';
    if (container) container.classList.remove('hidden');
    if (!container) return;

    const togetherGrid = document.getElementById('wl-together-grid');
    const myGrid = document.getElementById('wl-my-grid');
    const herGrid = document.getElementById('wl-her-grid');
    const togetherSection = document.getElementById('wl-together-section');
    const counterEl = document.getElementById('wl-stats-counter');
    const myCountEl = document.getElementById('wl-my-count');
    const herCountEl = document.getElementById('wl-her-count');

    if (!watchlistEntries || watchlistEntries.length === 0) {
        if (counterEl) counterEl.innerText = "0 přání";
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-16 text-center animate-fade-in">
                <div class="text-6xl mb-4 opacity-50">💔</div>
                <h3 class="text-lg font-black text-white mb-1">Zatím tu nemáte žádná přání...</h3>
                <p class="text-xs text-gray-400 mb-6 max-w-sm">Projděte Knihovnu nebo spusťte Tinder Matcher a klikněte na srdíčko u filmů, seriálů nebo her, které vás zaujmou!</p>
                <button onclick="window.switchChannel ? window.switchChannel('knihovna') : (window.Library ? window.Library.renderLibrary('movies') : window.loadModule('library').then(m => m.renderLibrary('movies'))); triggerHaptic('light')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2">
                    <i class="fas fa-film"></i> Přejít do Knihovny
                </button>
            </div>
        `;
        return;
    }

    // Map items
    const itemMap = {};
    watchlistEntries.forEach(entry => {
        const mediaId = entry.media_id || entry.id;
        if (!mediaId) return;
        const item = (allMedia || []).find(m => String(m.id) === String(mediaId));
        if (!item) return;

        if (!itemMap[item.id]) {
            const detectedType = state.library?.games?.some(g => String(g.id) === String(item.id)) ? 'game' : (state.library?.series?.some(s => String(s.id) === String(item.id)) ? 'series' : 'movie');
            itemMap[item.id] = { ...item, users: [], type: entry.type || item.type || detectedType };
        }
        const addedBy = entry.added_by || entry.user_id;
        if (addedBy && !itemMap[item.id].users.includes(addedBy)) {
            itemMap[item.id].users.push(addedBy);
        }
    });

    let items = Object.values(itemMap);

    // Apply filter
    if (activeCategoryFilter !== 'all') {
        items = items.filter(i => {
            if (activeCategoryFilter === 'movie') return i.type === 'movie' || i.type === 'movies';
            if (activeCategoryFilter === 'series') return i.type === 'series';
            if (activeCategoryFilter === 'game') return i.type === 'game' || i.type === 'games';
            return true;
        });
    }

    const currentUserId = state.currentUser?.id;
    const togetherItems = items.filter(i => new Set(i.users).size >= 2);
    const myEntries = items.filter(i => (currentUserId ? i.users.includes(currentUserId) : true) && !togetherItems.includes(i));
    const herEntries = items.filter(i => (currentUserId ? !i.users.includes(currentUserId) : false));

    if (counterEl) {
        counterEl.innerHTML = `Spolu: <span class="text-[#eb459e] font-black">${togetherItems.length}</span> | Celkem: <span class="text-white font-black">${items.length}</span>`;
    }
    if (myCountEl) myCountEl.innerText = String(myEntries.length);
    if (herCountEl) herCountEl.innerText = String(herEntries.length);

    // Render Together Mode
    if (togetherSection && togetherGrid) {
        if (togetherItems.length > 0) {
            togetherSection.classList.remove('hidden');
            togetherGrid.innerHTML = togetherItems.map(item => renderWlCard(item, true)).join('');
        } else {
            togetherSection.classList.add('hidden');
        }
    }

    // Render Mine
    if (myGrid) {
        myGrid.innerHTML = myEntries.length > 0
            ? myEntries.map(item => renderWlCard(item, false, true)).join('')
            : '<div class="col-span-full py-8 text-center text-xs text-gray-500 italic">V této kategorii zatím nemáš žádné vlastní přání.</div>';
    }

    // Render Hers
    if (herGrid) {
        const partnerEmptyText = isKlarka(state.currentUser) ? "Jožka tu v této kategorii zatím nic nemá." : "Klárka tu v této kategorii zatím nic nemá.";
        herGrid.innerHTML = herEntries.length > 0
            ? herEntries.map(item => renderWlCard(item, false, false)).join('')
            : `<div class="col-span-full py-8 text-center text-xs text-gray-500 italic">${partnerEmptyText}</div>`;
    }

    // Render Memories
    renderMemories();
}

async function fetchAndRenderWatchlist() {
    if (state.currentChannel !== 'watchlist') return;
    const loading = document.getElementById('wl-loading');
    const container = document.getElementById('wl-container');

    try {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Watchlist timeout')), 3500);
        });
        await Promise.race([
            ensureLibraryData().finally(() => clearTimeout(timeoutId)),
            timeoutPromise
        ]).catch(e => console.warn('[Watchlist] ensureLibraryData fetch error/timeout:', e));

        if (state.currentChannel !== 'watchlist') return;

        let watchlistEntries = [];
        try {
            let wlTimeoutId;
            const timeoutQuery = new Promise((_, reject) => {
                wlTimeoutId = setTimeout(() => reject(new Error('Supabase watchlist timeout')), 3000);
            });
            const { data: wlData, error: wlError } = await Promise.race([
                Promise.resolve(supabase.from('library_watchlist').select('*')).finally(() => clearTimeout(wlTimeoutId)),
                timeoutQuery
            ]);

            if (!wlError && Array.isArray(wlData) && wlData.length > 0) {
                watchlistEntries = wlData;
                state.watchlist = wlData.map(row => ({ id: parseInt(row.media_id || row.id), type: row.type, user_id: row.added_by }));
            } else {
                watchlistEntries = (state.watchlist || []).map(w => ({
                    media_id: w.id,
                    added_by: w.user_id,
                    type: w.type
                }));
            }
        } catch (e) {
            watchlistEntries = (state.watchlist || []).map(w => ({
                media_id: w.id,
                added_by: w.user_id,
                type: w.type
            }));
        }

        if (state.currentChannel !== 'watchlist') return;

        const allMedia = [
            ...(state.library?.movies || []),
            ...(state.library?.series || []),
            ...(state.library?.games || [])
        ];

        renderWatchlistDOM(watchlistEntries, allMedia);

    } catch (err) {
        console.error("Watchlist Fetch Error:", err);
        if (state.currentChannel === 'watchlist' && container && (!state.watchlist || state.watchlist.length === 0)) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-16 text-center animate-fade-in">
                    <div class="text-6xl mb-4 opacity-70">🦉❄️</div>
                    <h3 class="text-lg font-black text-white mb-1">Nepodařilo se načíst Watchlist</h3>
                    <p class="text-xs text-gray-400 mb-6 max-w-sm">Zkontrolujte připojení k internetu nebo zkuste načtení zopakovat.</p>
                    <button onclick="window.Watchlist.renderWatchlist(); triggerHaptic('light')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2">
                        <i class="fas fa-sync-alt"></i> Zkusit znovu
                    </button>
                </div>
            `;
        }
    } finally {
        if (state.currentChannel === 'watchlist') {
            const currentLoading = document.getElementById('wl-loading');
            const currentContainer = document.getElementById('wl-container');
            if (currentLoading) currentLoading.style.display = 'none';
            if (currentContainer) currentContainer.classList.remove('hidden');
        }
    }
}

function renderMemories() {
    const memoriesContainer = document.getElementById('wl-memories-list');
    const memoriesSection = document.getElementById('wl-memories-section');
    if (!memoriesContainer || !memoriesSection) return;

    const allHistory = [];
    const historyData = state.movieHistory || {};
    Object.keys(historyData).forEach(date => {
        (historyData[date] || []).forEach(item => {
            allHistory.push({ ...item, seen_date: date });
        });
    });

    allHistory.sort((a, b) => new Date(b.seen_date) - new Date(a.seen_date));
    const recent = allHistory.slice(0, 6);

    if (recent.length > 0) {
        memoriesSection.classList.remove('hidden');
        memoriesContainer.innerHTML = recent.map(item => {
            const libList = [...(state.library?.movies || []), ...(state.library?.series || []), ...(state.library?.games || [])];
            const libItem = libList.find(m => m.id === item.media_id);
            const title = libItem ? libItem.title : "Neznámý titul";
            const icon = libItem ? libItem.icon : "🎬";
            const ratingStars = "⭐".repeat(item.rating || 0);

            return `
                <div class="bg-[#202225] border border-white/5 rounded-xl p-3.5 flex items-center gap-3.5 hover:border-[#eb459e]/30 transition group cursor-pointer shadow-md" 
                     onclick="window.Library ? window.Library.openHistoryModal(${item.media_id}) : window.loadModule('library').then(m => m.openHistoryModal(${item.media_id}))">
                    <div class="w-11 h-11 rounded-lg bg-[#2f3136] flex items-center justify-center text-2xl group-hover:scale-110 transition shadow-inner">
                        ${icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] text-[#eb459e] font-black uppercase tracking-wider mb-0.5">${new Date(item.seen_date).toLocaleDateString('cs-CZ')}</div>
                        <div class="text-xs font-bold text-white truncate">${title}</div>
                        <div class="text-[10px] text-[#faa61a] mt-0.5">${ratingStars}</div>
                    </div>
                    <div class="text-xl opacity-60 group-hover:opacity-100 transition">
                        ${item.status === 'seen' ? '🔥' : '🍿'}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        memoriesSection.classList.add('hidden');
    }
}

function renderWlCard(item, isTogether, isMine = false) {
    const iconClass = item.type === 'game' ? 'fa-gamepad' : (item.type === 'series' ? 'fa-tv' : 'fa-film');
    const typeLabel = item.type === 'game' ? 'Hra' : (item.type === 'series' ? 'Seriál' : 'Film');
    const hasPoster = !!item.poster_path;
    const posterUrl = hasPoster ? TMDB.getTMDBImageUrl(item.poster_path, 'w342') : null;
    const itemRating = item.rating ? item.rating.toFixed(1) : null;
    const safeTitle = (item.title || "").replace(/'/g, "\\'");
    const itemType = item.type === 'game' ? 'game' : 'movie';

    return `
        <div class="library-card group relative bg-[#202225] rounded-xl overflow-hidden border ${isTogether ? 'border-[#eb459e]/60 shadow-[0_0_20px_rgba(235,69,158,0.25)]' : 'border-white/5'} hover:border-[#5865F2] hover:scale-[1.02] transition-all duration-300 shadow-lg flex flex-col w-full">
            
            ${isTogether ? `
            <div class="absolute top-2 left-2 bg-[#eb459e] text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg z-20 flex items-center gap-1 border border-white/20 animate-pulse">
                <i class="fas fa-heart text-[8px]"></i> SHODA
            </div>
            ` : ''}

            <!-- Quick Action: Remove or Toggle -->
            <button onclick="event.stopPropagation(); Watchlist.removeWatchlistItem(${item.id})" 
                    class="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/70 backdrop-blur hover:bg-red-500 flex items-center justify-center transition text-gray-300 hover:text-white shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Odebrat z přání">
                <i class="fas fa-times text-xs"></i>
            </button>

            <!-- Poster Area -->
            <div class="poster-area w-full aspect-[2/3] bg-[#2f3136] flex items-center justify-center text-4xl relative cursor-pointer overflow-hidden shadow-inner" 
                 onclick="window.Library ? window.Library.openHistoryModal(${item.id}) : window.loadModule('library').then(m => m.openHistoryModal(${item.id}))">
                ${hasPoster 
                    ? `<img src="${posterUrl}" alt="${item.title}" class="w-full h-full object-cover block transition-transform duration-500 ease-out group-hover:scale-110">` 
                    : `<span class="opacity-50 transition-transform duration-500 ease-out group-hover:scale-110">${item.icon || '🎬'}</span>`}
                
                ${itemRating ? `
                <div class="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-black text-[#faa61a] border border-[#faa61a]/30 shadow-lg">
                    ⭐ ${itemRating}
                </div>
                ` : ''}
            </div>

            <!-- Card Body -->
            <div class="p-3 flex flex-col flex-1 justify-between gap-2">
                <div>
                    <div class="flex items-center justify-between text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        <span><i class="fas ${iconClass} mr-1 text-[#5865F2]"></i> ${typeLabel}</span>
                        <span>${item.category || item.cat || ''}</span>
                    </div>
                    <h3 class="font-bold text-white text-xs leading-snug truncate group-hover:text-[#5865F2] transition" title="${item.title}">${item.title}</h3>
                </div>

                <!-- Footer Actions -->
                <div class="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                    <button onclick="event.stopPropagation(); window.Library ? window.Library.openPlanningModal('${safeTitle}', '${itemType}') : window.loadModule('library').then(m => m.openPlanningModal('${safeTitle}', '${itemType}'))" 
                            class="flex-1 bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
                        <i class="far fa-calendar-plus"></i> Naplánovat
                    </button>
                    <button onclick="event.stopPropagation(); window.Library ? window.Library.openHistoryModal(${item.id}) : window.loadModule('library').then(m => m.openHistoryModal(${item.id}))" 
                            class="p-1.5 text-gray-400 hover:text-[#faa61a] hover:bg-white/5 rounded-lg transition" title="Hodnotit">
                        <i class="far fa-star text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

export async function removeWatchlistItem(id) {
    triggerHaptic('light');
    try {
        await supabase.from('library_watchlist').delete().match({ 
            media_id: id,
            added_by: state.currentUser?.id
        });

        if (state.watchlist) {
            state.watchlist = state.watchlist.filter(w => !(String(w.id) === String(id) && w.user_id === state.currentUser?.id));
        }

        fetchAndRenderWatchlist();
    } catch (err) {
        console.error("Remove watchlist item error:", err);
    }
}

// --- RANDOMIZER ---

export async function startTinder(cat = activeCategoryFilter) {
    triggerHaptic('medium');
    const container = document.getElementById("messages-container");
    if (!container) return;
    
    try {
        const initialCat = (cat === 'all') ? 'movie' : cat;
        renderNetflixMatcher(initialCat);
    } catch (err) {
        console.error("Failed to start netflixMatcher:", err);
        if (window.showNotification) window.showNotification("Chyba při spouštění Tinderu... 😕", "error");
    }
}

export async function rollTheDice() {
    triggerHaptic('medium');
    await ensureLibraryData();

    let watchlistEntries = [];
    const { data: wlData } = await supabase
        .from('library_watchlist')
        .select('*');

    if (wlData) {
        watchlistEntries = wlData;
    } else {
        watchlistEntries = (state.watchlist || []).map(w => ({
            media_id: w.id,
            added_by: w.user_id,
            type: w.type
        }));
    }

    const allMedia = [
        ...(state.library?.movies || []),
        ...(state.library?.series || []),
        ...(state.library?.games || [])
    ];

    const itemMap = {};
    watchlistEntries.forEach(entry => {
        const mediaId = entry.media_id || entry.id;
        if (!mediaId) return;
        const item = allMedia.find(m => String(m.id) === String(mediaId));
        if (!item) return;
        if (!itemMap[item.id]) itemMap[item.id] = { ...item, users: new Set(), type: entry.type || item.type || 'movie' };
        if (entry.added_by) itemMap[item.id].users.add(entry.added_by);
    });

    const pool = Object.values(itemMap).filter(i => i.users.size >= 2);

    if (pool.length === 0) {
        // Fallback: Pick from any hearted items if no mutual shoda
        const allItems = Object.values(itemMap);
        if (allItems.length === 0) {
            if (window.showNotification) window.showNotification("Zatím jste si neuložili žádná přání. Běžte do Knihovny a srdíčkujte!", "info");
            return;
        }
        const winner = allItems[Math.floor(Math.random() * allItems.length)];
        showWinnerModal(winner, false);
        return;
    }

    const winner = pool[Math.floor(Math.random() * pool.length)];
    showWinnerModal(winner, true);
}

function showWinnerModal(item, isMutual = true) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in';
    const hasPoster = !!item.poster_path;
    const posterUrl = hasPoster ? TMDB.getTMDBImageUrl(item.poster_path, 'w342') : null;
    const safeTitle = (item.title || "").replace(/'/g, "\\'");
    const itemType = item.type === 'game' ? 'game' : 'movie';

    modal.innerHTML = `
        <div class="bg-[#2f3136] border border-[#5865F2]/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(88,101,242,0.3)] animate-scale-up">
            <div class="text-3xl font-black text-[#5865F2] mb-1">OSUD ROZHODL! 🌟</div>
            <div class="text-gray-400 text-xs mb-5 italic">${isMutual ? 'Vaše společná shoda na dnešní večer...' : 'Z vašich přání jsme vylosovali...'}</div>
            
            <div class="w-48 h-64 bg-[#202225] rounded-2xl mx-auto flex items-center justify-center text-7xl mb-5 shadow-inner border border-white/5 overflow-hidden">
                ${hasPoster 
                    ? `<img src="${posterUrl}" alt="${item.title}" class="w-full h-full object-cover">` 
                    : item.icon || '🎬'}
            </div>
            
            <h2 class="text-xl font-black text-white mb-1 leading-tight">${item.title}</h2>
            <p class="text-[#FAA61A] font-bold text-xs mb-6 uppercase tracking-widest">${item.type === 'game' ? '🎮 Hra' : (item.type === 'series' ? '📺 Seriál' : '🎬 Film')}</p>
            
            <div class="flex flex-col gap-2.5">
                <button onclick="this.closest('div.fixed').remove(); window.Library ? window.Library.openPlanningModal('${safeTitle}', '${itemType}') : window.loadModule('library').then(m => m.openPlanningModal('${safeTitle}', '${itemType}'))" 
                    class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition transform hover:scale-105 shadow-lg">
                    NAPLÁNOVAT DO KALENDÁŘE 📅
                </button>
                <button onclick="this.closest('div.fixed').remove()" class="w-full py-2 text-gray-500 hover:text-white transition text-xs font-bold">
                    Zavřít
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
}

if (typeof stateEvents !== 'undefined' && stateEvents.on) {
    stateEvents.on('library', () => {
        if (state.currentChannel === 'watchlist') {
            const allMedia = [
                ...(state.library?.movies || []),
                ...(state.library?.series || []),
                ...(state.library?.games || [])
            ];
            renderWatchlistDOM(state.watchlist, allMedia);
        }
    });
    stateEvents.on('watchlist', () => {
        if (state.currentChannel === 'watchlist') {
            const allMedia = [
                ...(state.library?.movies || []),
                ...(state.library?.series || []),
                ...(state.library?.games || [])
            ];
            renderWatchlistDOM(state.watchlist, allMedia);
        }
    });
}
