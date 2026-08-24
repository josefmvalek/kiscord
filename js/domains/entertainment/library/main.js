import { state, ensureLibraryData } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { isKlarka } from '@core/auth.js';
import * as TMDB from '@core/tmdb.js';
import { renderWatchlist } from '../watchlist.js';

import { 
    ensureModals, 
    openDownloadModal, 
    openMagnetLink, 
    openGoogleDrive, 
    openPlanningModal, 
    confirmLibraryPlan, 
    renderManual, 
    renderUpgrade, 
    startConfession 
} from './modals.js';

import { 
    openHistoryModal, 
    setReactionInput, 
    setStarRating, 
    setHistoryStatus, 
    saveHistory, 
    deleteHistory, 
    confirmDeleteHistory 
} from './history.js';

import { 
    showAddMediaModal, 
    saveNewMedia, 
    searchTMDBInModal, 
    selectTMDBResult, 
    showEditMediaModal, 
    updateMedia, 
    deleteMedia 
} from './tmdb.js';

import { 
    startMatcher, 
    toggleGameFrequent, 
    handleLiveSearch, 
    toggleWatchlist, 
    playTrailer, 
    exportWatchlist, 
    clearWatchlist 
} from './catalog.js';

export { 
    ensureModals, 
    openDownloadModal, 
    openMagnetLink, 
    openGoogleDrive, 
    openPlanningModal, 
    confirmLibraryPlan, 
    renderManual, 
    renderUpgrade, 
    startConfession,
    openHistoryModal, 
    setReactionInput, 
    setStarRating, 
    setHistoryStatus, 
    saveHistory, 
    deleteHistory, 
    confirmDeleteHistory,
    showAddMediaModal, 
    saveNewMedia, 
    searchTMDBInModal, 
    selectTMDBResult, 
    showEditMediaModal, 
    updateMedia, 
    deleteMedia,
    startMatcher, 
    toggleGameFrequent, 
    handleLiveSearch, 
    toggleWatchlist, 
    playTrailer, 
    exportWatchlist, 
    clearWatchlist 
};

let currentCategory = 'movies';
let activeGameFilter = 'all';

export function setGameFilter(filter) {
    activeGameFilter = filter;
    triggerHaptic('light');
    renderLibrary('games');
}

export function renderLibrary(category = 'movies') {
    if (category === 'watchlist') {
        renderWatchlist();
        return;
    }

    if (!category || category === 'library') category = 'movies';
    currentCategory = category;

    // Expose API to window for inline HTML onclick handlers
    window.Library = { 
        renderLibrary, 
        startMatcher: (cat) => startMatcher(cat || currentCategory), 
        toggleWatchlist: (id) => toggleWatchlist(id, currentCategory, renderLibrary), 
        playTrailer, 
        openDownloadModal, 
        openMagnetLink, 
        openGoogleDrive, 
        openHistoryModal, 
        setReactionInput, 
        setStarRating, 
        setHistoryStatus, 
        saveHistory: () => saveHistory(() => renderLibrary(currentCategory)), 
        deleteHistory, 
        confirmDeleteHistory: () => confirmDeleteHistory(() => renderLibrary(currentCategory)), 
        openPlanningModal, 
        confirmLibraryPlan, 
        exportWatchlist, 
        clearWatchlist: () => clearWatchlist(renderLibrary), 
        showAddMediaModal, 
        saveNewMedia: (cat) => saveNewMedia(cat, renderLibrary),
        searchTMDBInModal, 
        selectTMDBResult, 
        showEditMediaModal, 
        updateMedia: (id, cat) => updateMedia(id, cat, renderLibrary), 
        deleteMedia: (id, cat) => deleteMedia(id, cat, renderLibrary),
        setGameFilter, 
        toggleGameFrequent: (id) => toggleGameFrequent(id, renderLibrary), 
        handleLiveSearch
    };

    ensureModals();
    const container = document.getElementById("messages-container");
    if (!container) return;

    let items = state.library[category] || [];

    if (state.loadError) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center bg-[#36393f] text-gray-400 p-6 text-center animate-fade-in">
                <div class="text-8xl mb-6 filter drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">🦉❄️</div>
                <h3 class="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Sova nemůže najít knížky...</h3>
                <p class="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
                    Nepodařilo se načíst obsah knihovny. Zkusíme to znovu?
                </p>
                <button onclick="window.loadModule('state').then(async m => { await m.initializeState(); window.loadModule('library').then(l => l.renderLibrary('${category}')); }); triggerHaptic('light')" 
                        class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all transform hover:scale-105 active:scale-95 shadow-xl flex items-center gap-3">
                    <i class="fas fa-sync-alt"></i>
                    Zkusit znovu
                </button>
            </div>
        `;
        return;
    }

    const movieCount = (state.library.movies || []).length;
    const seriesCount = (state.library.series || []).length;
    const allGames = state.library.games || [];
    const gameCount = allGames.length;
    const watchlistCount = (state.watchlist || []).length;

    const targetWlFilter = category === 'games' ? 'game' : (category === 'series' ? 'series' : 'movie');

    const frequentGames = allGames.filter(g => g.is_frequent || (g.mood_tags || []).includes('stálice') || g.cat === 'Stálice');
    const seenGames = allGames.filter(g => state.watchHistory[g.id]?.status === 'seen');
    const backlogGames = allGames.filter(g => !frequentGames.includes(g) && !seenGames.includes(g));

    if (category === 'games') {
        if (activeGameFilter === 'frequent') items = frequentGames;
        else if (activeGameFilter === 'backlog') items = backlogGames;
        else if (activeGameFilter === 'seen') items = seenGames;
        else items = allGames;
    }

    const groups = {};
    items.forEach((item) => {
        const catName = item.cat || "Ostatní";
        if (!groups[catName]) groups[catName] = [];
        groups[catName].push(item);
    });

    const categoryOrder = [
        "Akční", "Sci-Fi", "Komedie", "Animovaný", "Fantasy", "Drama", "Horor", "Romantický",
        "Dobrodružný", "RPG", "FPS", "Strategie", "Simulátor", "Závodní"
    ];

    const sortedCategories = Object.keys(groups).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    let html = `
        <!-- HEADER WITH TABS & ACTIONS -->
        <div class="bg-[#2f3136] border-b border-[#202225] p-4 lg:p-6 shadow-md z-10 select-none">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                        <i class="fas fa-film text-[#5865F2]"></i> Náš Entertainment & Knihovna
                    </h1>
                    <p class="text-gray-400 text-xs mt-1">Filmy, seriály a hry pro společné chvíle 🍿🎮</p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <button onclick="window.switchChannel ? window.switchChannel('watchlist') : (window.Watchlist ? window.Watchlist.renderWatchlist('${targetWlFilter}') : window.loadModule('watchlist').then(m => m.renderWatchlist('${targetWlFilter}'))); triggerHaptic('light')"
                        class="bg-[#eb459e]/20 hover:bg-[#eb459e]/30 text-[#eb459e] border border-[#eb459e]/30 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg"
                        title="Otevřít náš Watchlist na dnešní večer">
                        <i class="fas fa-heart"></i> Náš Watchlist
                        <span class="bg-[#eb459e] text-white text-[9px] px-1.5 py-0.5 rounded-full font-black ml-0.5">${watchlistCount}</span>
                    </button>
                    <button onclick="window.Library.startMatcher('${category}')"
                        class="bg-gradient-to-r from-[#eb459e] to-[#f47fff] hover:from-[#d83c8c] hover:to-[#e06ee0] text-white px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#eb459e]/20 transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
                        <i class="fas fa-fire animate-pulse"></i> 🎲 ${category === 'games' ? 'Herní Matcher' : (category === 'series' ? 'Seriálový Matcher' : 'Filmový Matcher')}
                    </button>
                    <button onclick="Library.showAddMediaModal('${category}')" 
                        class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg active:scale-95">
                        <i class="fas fa-plus"></i> Přidat ${category === 'games' ? 'hru' : (category === 'series' ? 'seriál' : 'film')}
                    </button>
                </div>
            </div>

            <!-- TABS -->
            <div class="max-w-7xl mx-auto flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pt-2">
                <button onclick="Library.renderLibrary('movies'); triggerHaptic('light')" 
                    class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${category === 'movies' ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' : 'bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136]'}">
                    <span>🎬 Filmy</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full ${category === 'movies' ? 'bg-white/20' : 'bg-black/30'}">${movieCount}</span>
                </button>
                <button onclick="Library.renderLibrary('series'); triggerHaptic('light')" 
                    class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${category === 'series' ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' : 'bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136]'}">
                    <span>📺 Seriály</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full ${category === 'series' ? 'bg-white/20' : 'bg-black/30'}">${seriesCount}</span>
                </button>
                <button onclick="Library.renderLibrary('games'); triggerHaptic('light')" 
                    class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${category === 'games' ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' : 'bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136]'}">
                    <span>🎮 Hry</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full ${category === 'games' ? 'bg-white/20' : 'bg-black/30'}">${gameCount}</span>
                </button>
            </div>

            <!-- GAME SUB-FILTERS -->
            ${category === 'games' ? `
            <div class="max-w-7xl mx-auto flex items-center gap-2 mt-3 pt-3 border-t border-white/5 overflow-x-auto no-scrollbar">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Režim:</span>
                <button onclick="Library.setGameFilter('all')" class="px-3 py-1.5 rounded-xl text-xs font-black transition-all ${activeGameFilter === 'all' ? 'bg-[#5865F2] text-white shadow-md' : 'bg-[#202225] text-gray-400 hover:text-white'}">
                    Všechny (${allGames.length})
                </button>
                <button onclick="Library.setGameFilter('frequent')" class="px-3 py-1.5 rounded-xl text-xs font-black transition-all ${activeGameFilter === 'frequent' ? 'bg-[#faa61a] text-black shadow-md font-extrabold' : 'bg-[#202225] text-yellow-400 hover:bg-[#faa61a]/10'}">
                    ⚡ Naše stálice (${frequentGames.length})
                </button>
                <button onclick="Library.setGameFilter('backlog')" class="px-3 py-1.5 rounded-xl text-xs font-black transition-all ${activeGameFilter === 'backlog' ? 'bg-[#3ba55c] text-white shadow-md' : 'bg-[#202225] text-emerald-400 hover:bg-[#3ba55c]/10'}">
                    🌟 Novinky v plánu (${backlogGames.length})
                </button>
                <button onclick="Library.setGameFilter('seen')" class="px-3 py-1.5 rounded-xl text-xs font-black transition-all ${activeGameFilter === 'seen' ? 'bg-purple-600 text-white shadow-md' : 'bg-[#202225] text-purple-400 hover:bg-purple-600/10'}">
                    🏆 Dohráno (${seenGames.length})
                </button>
            </div>
            ` : ''}
        </div>

        <!-- UNIFIED LIVE SEARCH & DISCOVERY BAR -->
        <div class="px-4 lg:px-6 mt-4 max-w-7xl mx-auto w-full">
            <div class="bg-[#202225] border border-white/10 rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-2 shadow-inner">
                <div class="relative flex-1 w-full flex items-center">
                    <i class="fas fa-search absolute left-3.5 text-gray-400 text-xs pointer-events-none"></i>
                    <input type="text" id="library-live-search" 
                           placeholder="Hledat ${category === 'games' ? 'hru podle názvu nebo žánru...' : 'film nebo seriál v naší knihovně...'}"
                           class="w-full bg-[#2f3136] text-white pl-9 pr-8 py-2.5 rounded-xl outline-none text-xs border border-transparent focus:border-[#5865F2] transition placeholder-gray-500"
                           oninput="Library.handleLiveSearch(this.value, '${category}')">
                </div>

                ${category !== 'games' ? `
                <button onclick="Library.searchTMDBInModal('${category}')" 
                        class="w-full sm:w-auto bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/30 px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 flex-shrink-0 shadow-md">
                    <i class="fas fa-globe"></i> <span>Hledat na TMDB</span>
                </button>
                ` : ''}
            </div>
        </div>

        <div id="library-no-search-results" class="hidden flex-col items-center justify-center p-12 text-center text-gray-400 animate-fade-in">
            <i class="fas fa-search text-4xl mb-3 opacity-30"></i>
            <p class="text-sm font-bold text-white mb-1">Nenalezeno v naší knihovně</p>
            <p class="text-xs text-gray-400 mb-4">Chcete tento titul vyhledat na TMDB a přidat ho?</p>
            <button onclick="Library.searchTMDBInModal('${category}')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg">
                <i class="fas fa-search mr-1.5"></i> Vyhledat na TMDB
            </button>
        </div>

        ${items.length === 0 ? `
            <div class="flex flex-col items-center justify-center p-12 text-center text-gray-500 animate-fade-in">
                <i class="fas ${category === 'games' ? 'fa-gamepad' : 'fa-film'} text-5xl mb-4 opacity-40"></i>
                <p class="text-sm font-bold text-white mb-2">V této kategorii zatím nic není...</p>
                <p class="text-xs text-gray-400 mb-6">Přidejte první ${category === 'games' ? 'hru' : (category === 'series' ? 'seriál' : 'film')} nebo vyzkoušejte Tinder Matcher!</p>
                <button onclick="Library.showAddMediaModal('${category}')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-2.5 rounded-xl font-bold text-xs">
                    <i class="fas fa-plus mr-1"></i> Přidat položku
                </button>
            </div>
        ` : `
        <div class="p-6 pb-20 animate-fade-in space-y-10">
        `}
    `;

    if (items.length > 0) {
        sortedCategories.forEach((catName) => {
            const groupItems = groups[catName].sort((a, b) => a.title.localeCompare(b.title));

            html += `
                  <div class="library-category-section">
                      <h2 class="category-group-header text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-[#202225] pb-2 sticky top-0 bg-[#36393f] z-30 pt-2">
                          <span class="text-[#eb459e]">#</span> ${catName}
                          <span class="text-xs text-gray-500 font-normal ml-auto bg-[#202225] px-2 py-1 rounded-full">${groupItems.length}</span>
                      </h2>
                      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">`;

            groupItems.forEach((item) => {
                const historyData = state.watchHistory[item.id] || {};
                const status = historyData.status || "unseen";
                const userRating = historyData.rating || 0;
                const watchlist = state.watchlist || [];
                const isBookmarked = watchlist.some((w) => String(w.id) === String(item.id) && w.user_id === state.currentUser?.id);
                const partnerWish = watchlist.some((w) => String(w.id) === String(item.id) && w.user_id && w.user_id !== state.currentUser?.id);
                const isGameFrequent = item.is_frequent || (item.mood_tags || []).includes('stálice') || item.cat === 'Stálice';

                const hasPoster = !!item.poster_path;
                const posterUrl = hasPoster ? TMDB.getTMDBImageUrl(item.poster_path, 'w342') : null;
                const displayRating = item.rating ? item.rating.toFixed(1) : null;
                const displayRuntime = item.runtime ? (item.runtime > 60 ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m` : `${item.runtime}m`) : null;

                const safeTitle = (item.title || "").replace(/'/g, "\\'");
                const safeMagnet = (item.magnet || "").replace(/'/g, "\\'");
                const safeGdrive = (item.gdrive || "").replace(/'/g, "\\'");
                const safeTrailer = (item.trailer || "").replace(/'/g, "\\'");
                const itemType = category === "games" ? "game" : "movie";
                const cardTags = (item.mood_tags || []).join(' ');

                let statusBadge = "";
                if (status === "seen")
                    statusBadge = '<span class="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-md z-10"><i class="fas fa-check"></i> VIDĚNO</span>';
                else if (status === "watching")
                    statusBadge = '<span class="absolute top-2 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-md z-10"><i class="fas fa-play"></i> ROZKOUKÁNO</span>';

                html += `
                      <div class="library-card-wrapper library-card media-card-hover group relative bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--blurple)] transition-all shadow-lg flex flex-col w-full"
                           data-title="${safeTitle}" data-genre="${catName}" data-tags="${cardTags}">
                          ${statusBadge}
                          ${partnerWish ? `<span class="absolute ${statusBadge ? 'top-8' : 'top-2'} left-2 bg-[#eb459e] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-lg z-10 flex items-center gap-1 border border-white/20 animate-fade-in"><i class="fas fa-heart text-[8px]"></i> ${isKlarka(state.currentUser) ? 'Jožka chce 🤴' : 'Klárka chce 👸'}</span>` : ''}

                          <button onclick="event.stopPropagation(); window.Library.toggleWatchlist(${item.id})" 
                                  class="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur hover:bg-[#eb459e] flex items-center justify-center transition ${isBookmarked ? "text-[#eb459e] bg-white/10" : "text-gray-400"}">
                              <i class="${isBookmarked ? "fas" : "far"} fa-heart"></i>
                          </button>

                          <div class="poster-area w-full aspect-[2/3] h-auto bg-[var(--bg-tertiary)] flex items-center justify-center text-5xl relative cursor-pointer overflow-hidden shadow-inner" 
                               onclick="triggerHaptic('light'); if (document.startViewTransition) { document.startViewTransition(() => window.loadModule('library').then(m => m.openHistoryModal(${item.id}))); } else { window.loadModule('library').then(m => m.openHistoryModal(${item.id})); }">
                              ${hasPoster 
                                  ? `<img src="${posterUrl}" alt="${item.title}" class="w-full h-full object-cover block transition-transform duration-500 ease-out group-hover:scale-110">` 
                                  : `<span class="opacity-50 transition-transform duration-500 ease-out group-hover:scale-110">${item.icon}</span>`}
                              
                              ${item.trailer ? '<div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i class="fas fa-play text-white/80 text-3xl drop-shadow-lg"></i></div>' : ""}
                              
                              ${displayRating ? `
                              <div class="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[10px] font-black text-[#faa61a] border border-[#faa61a]/30 shadow-lg">
                                  ⭐ ${displayRating}
                              </div>
                              ` : ''}
                              ${displayRuntime ? `
                              <div class="absolute bottom-2 left-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-300 border border-white/10 shadow-lg">
                                 ${displayRuntime}
                              </div>
                              ` : ''}
                          </div>

                          <div class="p-3 flex flex-col flex-1">
                              <div class="flex flex-wrap gap-1 mb-2 items-center">
                                  ${category === 'games' ? `
                                    <button onclick="event.stopPropagation(); window.Library.toggleGameFrequent(${item.id})" 
                                            class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition border flex items-center gap-1 ${isGameFrequent ? 'bg-[#faa61a] text-black border-[#faa61a]' : 'bg-[#202225] text-gray-400 hover:text-yellow-400 border-white/5'}">
                                        <i class="fas fa-bolt ${isGameFrequent ? 'text-black' : 'text-[#faa61a]'}"></i> ${isGameFrequent ? 'Stálice' : '+ Stálice'}
                                    </button>
                                  ` : ''}
                                  ${(item.mood_tags || []).filter(t => t !== 'stálice').map(tag => `<span class="text-[9px] bg-[#5865F2]/20 text-[#5865F2] px-1.5 py-0.5 rounded border border-[#5865F2]/20 font-bold">${tag}</span>`).join('')}
                              </div>
                              <h3 class="font-bold text-white text-sm leading-tight mb-1 group-hover:text-[#5865F2] transition line-clamp-2" title="${item.title}">${item.title}</h3>
                              <div class="mt-auto pt-3 border-t border-[#202225] flex justify-between items-center gap-1">
                                    <button onclick="event.stopPropagation(); window.loadModule('library').then(m => m.showEditMediaModal(${item.id}, '${category}'))" class="text-gray-400 hover:text-white p-1.5 rounded transition" title="Upravit"><i class="fas fa-edit"></i></button>
                                  ${item.trailer
                        ? `<button onclick="event.stopPropagation(); Library.playTrailer('${safeTrailer}')" class="text-gray-400 hover:text-[#ff0000] p-1.5 rounded transition"><i class="fab fa-youtube"></i></button>`
                        : `<div class="w-6"></div>`
                    }
                                  <button onclick="event.stopPropagation(); window.loadModule('library').then(m => m.openPlanningModal('${safeTitle}', '${itemType}'))" class="text-gray-400 hover:text-[#5865F2] p-1.5 rounded transition" title="Naplánovat"><i class="far fa-calendar-plus"></i></button>

                                  <button onclick="event.stopPropagation(); window.loadModule('library').then(m => m.openDownloadModal('${safeMagnet}', '${safeGdrive}'))" class="text-gray-400 hover:text-[#3ba55c] p-1.5 rounded transition"><i class="fas fa-cloud-download-alt"></i></button>

                                  <button onclick="event.stopPropagation(); window.loadModule('library').then(m => m.openHistoryModal(${item.id}))" class="${userRating > 0 ? "text-[#faa61a]" : "text-gray-400"} hover:text-white p-1.5 rounded transition"><i class="${userRating > 0 ? "fas" : "far"} fa-star"></i></button>
                              </div>
                          </div>
                      </div>`;
            });
            html += `</div></div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
}

window.addEventListener('library-updated', async () => {
    await ensureLibraryData(true);
    if (['movies', 'series', 'games', 'watchlist', 'library'].includes(state.currentChannel)) {
        renderLibrary(currentCategory);
    }
});
