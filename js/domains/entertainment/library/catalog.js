import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { safeInsert, safeUpsert } from '@core/offline.js';
import { triggerHaptic } from '@core/utils.js';
import { renderNetflixMatcher } from '@domains/entertainment/netflix-matcher.js';

let librarySearchQuery = '';

export function handleLiveSearch(query, category) {
    librarySearchQuery = (query || '').toLowerCase().trim();
    const input = document.getElementById('library-live-search');
    if (input && input.value !== query) input.value = query;

    const cards = document.querySelectorAll('.library-card-wrapper');
    if (cards.length > 0) {
        cards.forEach(card => {
            const title = (card.getAttribute('data-title') || '').toLowerCase();
            const genre = (card.getAttribute('data-genre') || '').toLowerCase();
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();
            const matches = !librarySearchQuery || title.includes(librarySearchQuery) || genre.includes(librarySearchQuery) || tags.includes(librarySearchQuery);
            card.style.display = matches ? '' : 'none';
        });

        document.querySelectorAll('.library-category-section').forEach(sec => {
            const visibleCards = sec.querySelectorAll('.library-card-wrapper:not([style*="display: none"])');
            sec.style.display = visibleCards.length > 0 ? '' : 'none';
        });

        const noResultsEl = document.getElementById('library-no-search-results');
        const anyVisible = document.querySelectorAll('.library-card-wrapper:not([style*="display: none"])').length > 0;
        if (noResultsEl) {
            noResultsEl.style.display = (!anyVisible && librarySearchQuery) ? 'flex' : 'none';
        }
    }
}

export function startMatcher(cat) {
    triggerHaptic('medium');
    renderNetflixMatcher(cat);
}

export function getGameStatus(game) {
    if (!game) return 'máme';
    const historyStatus = state.watchHistory[game.id]?.status;
    if (historyStatus === 'seen' || (game.mood_tags || []).includes('dohráno')) {
        return 'dohráno';
    }
    if ((game.mood_tags || []).includes('chceme') || (game.mood_tags || []).includes('wishlist') || (state.watchlist || []).some(w => String(w.id) === String(game.id))) {
        return 'chceme';
    }
    return 'máme';
}

export async function setGameStatus(itemId, targetStatus, refreshFn) {
    triggerHaptic('medium');
    const game = (state.library.games || []).find(g => g.id === itemId);
    if (!game) return;

    const myId = state.currentUser?.id;
    let tags = (game.mood_tags || []).filter(t => t !== 'máme' && t !== 'chceme' && t !== 'dohráno' && t !== 'wishlist' && t !== 'backlog');

    if (targetStatus === 'dohráno') {
        tags.push('dohráno');
        if (!state.watchHistory[itemId]) {
            state.watchHistory[itemId] = { status: 'seen', rating: state.ratings[itemId] || 0, date: new Date().toISOString().split('T')[0], reaction: '' };
        } else {
            state.watchHistory[itemId].status = 'seen';
            if (!state.watchHistory[itemId].date) state.watchHistory[itemId].date = new Date().toISOString().split('T')[0];
        }
        state.watchlist = (state.watchlist || []).filter(w => !(String(w.id) === String(itemId) && w.user_id === myId));
        
        try {
            await supabase.from('library_watchlist').delete().match({ media_id: itemId, added_by: myId });
        } catch (e) {}
        
        try {
            await safeUpsert('library_ratings', {
                media_id: itemId,
                user_id: myId,
                status: 'seen',
                seen_date: state.watchHistory[itemId].date,
                rating: state.watchHistory[itemId].rating || 0
            });
        } catch (e) {}

        if (window.showNotification) window.showNotification(`🏆 "${game.title}" přesunuta do: Dohráno!`, 'success');
    } else if (targetStatus === 'chceme') {
        tags.push('chceme');
        if (state.watchHistory[itemId]) {
            state.watchHistory[itemId].status = 'unseen';
        }
        if (!state.watchlist) state.watchlist = [];
        if (!state.watchlist.some(w => String(w.id) === String(itemId) && w.user_id === myId)) {
            state.watchlist.push({ id: itemId, type: 'game', user_id: myId });
            try {
                await safeInsert('library_watchlist', {
                    media_id: itemId,
                    type: 'game',
                    added_by: myId
                });
            } catch (e) {}
        }
        try {
            await supabase.from('library_ratings').delete().match({ media_id: itemId, user_id: myId });
        } catch (e) {}

        if (window.showNotification) window.showNotification(`🌟 "${game.title}" přesunuta do: Chceme!`, 'success');
    } else {
        // 'máme' (default owned)
        tags.push('máme');
        if (state.watchHistory[itemId]) {
            state.watchHistory[itemId].status = 'unseen';
        }
        state.watchlist = (state.watchlist || []).filter(w => !(String(w.id) === String(itemId) && w.user_id === myId));
        try {
            await supabase.from('library_watchlist').delete().match({ media_id: itemId, added_by: myId });
        } catch (e) {}
        try {
            await supabase.from('library_ratings').delete().match({ media_id: itemId, user_id: myId });
        } catch (e) {}

        if (window.showNotification) window.showNotification(`🎮 "${game.title}" přesunuta do: Máme!`, 'info');
    }

    game.mood_tags = tags;

    try {
        await supabase.from('library_content').update({ mood_tags: tags }).eq('id', itemId);
    } catch (e) {
        console.error("Failed to update game status:", e);
    }

    if (refreshFn) refreshFn('games');
    else if (typeof window.Library?.renderLibrary === 'function') window.Library.renderLibrary('games');
}

export async function toggleGameFrequent(itemId, refreshFn) {
    triggerHaptic('medium');
    const game = (state.library.games || []).find(g => g.id === itemId);
    if (!game) return;

    const isCurrentlyFrequent = !!game.is_frequent || (game.mood_tags || []).includes('stálice') || game.cat === 'Stálice';
    game.is_frequent = !isCurrentlyFrequent;

    let tags = [...(game.mood_tags || [])];
    if (game.is_frequent) {
        if (!tags.includes('stálice')) tags.push('stálice');
        if (window.showNotification) window.showNotification(`⚡ "${game.title}" přidána do Našich stálic!`, 'success');
    } else {
        tags = tags.filter(t => t !== 'stálice');
        if (window.showNotification) window.showNotification(`"${game.title}" odebrána ze stálic`, 'info');
    }
    game.mood_tags = tags;

    try {
        await supabase.from('library_content').update({ mood_tags: tags }).eq('id', itemId);
    } catch (e) {
        console.error("Failed to update game frequent tag:", e);
    }

    if (refreshFn) refreshFn('games');
}

export async function toggleWatchlist(id, currentCategory, refreshFn) {
    if (!state.watchlist) state.watchlist = [];
    const myId = state.currentUser?.id;
    const index = state.watchlist.findIndex(w => String(w.id) === String(id) && w.user_id === myId);

    let itemType = 'movie';
    for (const [cat, list] of Object.entries(state.library || {})) {
        if (Array.isArray(list)) {
            const found = list.find(i => String(i.id) === String(id));
            if (found) {
                itemType = cat === 'games' ? 'game' : (cat === 'series' ? 'series' : 'movie');
                break;
            }
        }
    }

    if (index === -1) {
        state.watchlist.push({ id, type: itemType, user_id: myId });
        triggerHaptic('success');

        await safeInsert('library_watchlist', {
            media_id: id,
            type: itemType,
            added_by: myId
        });
    } else {
        state.watchlist.splice(index, 1);
        triggerHaptic('light');

        await supabase.from('library_watchlist').delete().match({ 
            media_id: id,
            added_by: myId
        });
    }

    if (refreshFn) refreshFn(currentCategory);
}

export function playTrailer(url_or_title) {
    if (url_or_title.startsWith('http')) {
        window.open(url_or_title, '_blank');
    } else {
        const query = encodeURIComponent(`${url_or_title} trailer`);
        const url = `https://www.youtube.com/results?search_query=${query}`;
        window.open(url, "_blank");
    }
}

export function exportWatchlist() {
    if (window.showNotification) window.showNotification("Export zatím není implementován (Jožka je líný)", "info");
}

export async function clearWatchlist(refreshFn) {
    state.watchlist = [];
    await supabase.from('library_watchlist').delete().not('media_id', 'is', null); 
    if (refreshFn) refreshFn(state.currentChannel);
    if (window.showNotification) window.showNotification("Watchlist vyčištěn", "success");
}
