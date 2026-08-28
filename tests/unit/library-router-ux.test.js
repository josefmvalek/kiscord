import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { renderLibrary, setGameFilter } from '../../js/domains/entertainment/library/main.js';
import { getGameStatus, setGameStatus } from '../../js/domains/entertainment/library/catalog.js';
import { renderWatchlist } from '../../js/domains/entertainment/watchlist.js';
import { mountChannelModule } from '../../js/core/router/module-loader.js';
import { markLoaded } from '../../js/core/loaders.js';

// Mock Supabase with full chainable query support
vi.mock('../../js/core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase()
    };
});

describe('Library Router & Category UX Suite', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div><div id="app"></div>';
        container = document.getElementById('messages-container');

        markLoaded('library');
        state.currentChannel = 'library';
        setGameFilter('all');
        state.currentUser = { id: 'user-1', name: 'Jožka' };
        state.watchlist = [];
        state.watchHistory = {};
        state.ratings = {};
        state.library = {
            movies: [
                { id: 1, title: 'Inception', cat: 'Sci-Fi', rating: 8.8, poster_path: '/poster1.jpg' },
                { id: 2, title: 'Interstellar', cat: 'Sci-Fi', rating: 8.6, poster_path: '/poster2.jpg' }
            ],
            series: [
                { id: 10, title: 'Breaking Bad', cat: 'Drama', rating: 9.5 }
            ],
            games: [
                { id: 100, title: 'Witcher 3', cat: 'RPG', mood_tags: ['máme'] },
                { id: 101, title: 'Cyberpunk 2077', cat: 'RPG', mood_tags: ['chceme'] },
                { id: 102, title: 'Elden Ring', cat: 'RPG', mood_tags: ['dohráno'] }
            ]
        };
    });

    const getTabButton = (text) => {
        return Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes(text));
    };

    it('renders clean simplified header "Knihovna" without subtitle', async () => {
        await renderLibrary('movies');

        expect(container.innerHTML).toContain('Knihovna');
        expect(container.innerHTML).not.toContain('Náš Entertainment &amp; Knihovna');
        expect(container.innerHTML).not.toContain('Filmy, seriály a hry pro společné chvíle');
    });

    it('defaults safely to "movies" when called with HTMLElement or invalid parameter', async () => {
        await renderLibrary(container);

        const moviesTab = getTabButton('Filmy');
        expect(moviesTab).toBeDefined();
        expect(moviesTab.className).toContain('bg-[#5865F2]');

        const movieCards = container.querySelectorAll('.library-card-wrapper');
        expect(movieCards.length).toBe(2);
        expect(container.innerHTML).toContain('Inception');
        expect(container.innerHTML).toContain('Interstellar');
        expect(container.innerHTML).not.toContain('V této kategorii zatím nic není...');
    });

    it('renders games category with 4 modes: Všechny, Máme, Chceme, Dohráno', async () => {
        await renderLibrary('games');

        expect(container.innerHTML).toContain('Všechny');
        expect(container.innerHTML).toContain('Máme');
        expect(container.innerHTML).toContain('Chceme');
        expect(container.innerHTML).toContain('Dohráno');

        // Check active filter switching
        setGameFilter('máme');
        expect(container.innerHTML).toContain('Witcher 3');
        expect(container.innerHTML).not.toContain('Cyberpunk 2077');
        expect(container.innerHTML).not.toContain('Elden Ring');

        setGameFilter('chceme');
        expect(container.innerHTML).toContain('Cyberpunk 2077');
        expect(container.innerHTML).not.toContain('Witcher 3');

        setGameFilter('dohráno');
        expect(container.innerHTML).toContain('Elden Ring');
        expect(container.innerHTML).not.toContain('Witcher 3');
    });

    it('allows moving games between categories (Máme -> Dohráno -> Chceme)', async () => {
        const game = state.library.games.find(g => g.id === 100);
        expect(getGameStatus(game)).toBe('máme');

        await setGameStatus(100, 'dohráno', () => {});
        expect(getGameStatus(game)).toBe('dohráno');
        expect(state.watchHistory[100]?.status).toBe('seen');

        await setGameStatus(100, 'chceme', () => {});
        expect(getGameStatus(game)).toBe('chceme');
        expect(state.watchHistory[100]?.status).toBe('unseen');
        expect(state.watchlist.some(w => w.id === 100)).toBe(true);

        await setGameStatus(100, 'máme', () => {});
        expect(getGameStatus(game)).toBe('máme');
        expect(state.watchlist.some(w => w.id === 100)).toBe(false);
    });

    it('displays filter-specific empty state with reset button for game sub-filters', async () => {
        state.library.games = [
            { id: 100, title: 'Witcher 3', cat: 'RPG', mood_tags: ['máme'] }
        ];
        
        setGameFilter('dohráno');

        expect(container.innerHTML).toContain('Žádné hry ve filtru "Dohráno"');
        expect(container.innerHTML).toContain('Zobrazit všechny hry');
    });

    it('mounts properly via router mountChannelModule without throwing or showing unselected state', async () => {
        await mountChannelModule('library', container);

        const activeTab = getTabButton('Filmy');
        expect(activeTab.className).toContain('bg-[#5865F2]');
        expect(container.innerHTML).toContain('Inception');
    });

    it('renders Watchlist hub without throwing even if offline or missing foreign keys', async () => {
        state.watchlist = [{ id: 1, type: 'movie', user_id: 'user-1' }];
        await renderWatchlist();

        expect(container.innerHTML).toContain('Náš Společný Watchlist');
        expect(container.innerHTML).toContain('Inception');
        const loading = document.getElementById('wl-loading');
        expect(loading?.style.display).toBe('none');
    });

    it('does not allow library stateEvents to hijack or overwrite the watchlist channel', async () => {
        state.currentChannel = 'watchlist';
        state.watchlist = [{ id: 1, type: 'movie', user_id: 'user-1' }];
        await mountChannelModule('watchlist', container);

        expect(container.innerHTML).toContain('Náš Společný Watchlist');

        // Fire library event
        state._loaded.library = true;
        const { stateEvents } = await import('../../js/core/state.js');
        stateEvents.emit('library');

        // Should STILL be on Watchlist, NOT switched to Movies library
        expect(container.innerHTML).toContain('Náš Společný Watchlist');
        expect(container.innerHTML).not.toContain('🎬 Filmy (2)');
    });
});
