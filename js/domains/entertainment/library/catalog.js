import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { safeInsert } from '@core/offline.js';
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
