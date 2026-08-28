import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    defaultExercises,
    POPULAR_EXERCISE_PRESETS,
    syncDefaultExercisesMedia
} from '@domains/fitness/gym/shared.js';
import {
    getCategoryEmoji,
    getExerciseThumbnailHtml,
    renderExercisesTab,
    openCreateExerciseModal,
    openExerciseCatalogModal,
    setCatalogCategoryFilter,
    filterCatalogExercises,
    importCatalogExercise
} from '@domains/fitness/gym/exercises.js';
import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';

vi.mock('@core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase({
            gym_exercises: [],
            gym_templates: [],
            gym_logs: []
        })
    };
});

describe('Gym Exercise Catalog & Media Library (350+ Exercises)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        state.currentUser = { id: '00000000-0000-0000-0000-000000000001', name: 'Jožka' };
        state.gymExercises = [...defaultExercises.slice(0, 10)];
        state.currentChannel = 'gym-tracker';
        vi.clearAllMocks();
    });

    describe('Dataset & Seed Integrity', () => {
        it('contains at least 350 curated exercises with GymVisual GIFs', () => {
            expect(defaultExercises.length).toBeGreaterThanOrEqual(350);
            expect(POPULAR_EXERCISE_PRESETS.length).toBe(defaultExercises.length);
        });

        it('ensures every exercise has valid required attributes and .gif image_url', () => {
            const requiredCategories = ['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho', 'Kardio'];

            defaultExercises.forEach(ex => {
                expect(ex.id).toBeTruthy();
                expect(ex.name).toBeTruthy();
                expect(ex.category).toBeTruthy();
                expect(requiredCategories).toContain(ex.category);
                expect(ex.image_url).toMatch(/^https:\/\/raw\.githubusercontent\.com\/.*\.gif$/);
                expect(ex.instructions).toBeTruthy();
                expect(Array.isArray(ex.secondary_muscles)).toBe(true);
                expect(ex.is_default).toBe(true);
            });
        });

        it('covers all 7 body/functional categories with rich variety (>= 30 per category)', () => {
            const categories = ['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho', 'Kardio'];
            categories.forEach(cat => {
                const count = defaultExercises.filter(e => e.category === cat).length;
                expect(count).toBeGreaterThanOrEqual(30);
            });
        });
    });

    describe('Visual Helpers & Emojis', () => {
        it('returns appropriate emojis for all categories including Kardio', () => {
            expect(getCategoryEmoji('Hrudník')).toBe('🦍');
            expect(getCategoryEmoji('Záda')).toBe('🦅');
            expect(getCategoryEmoji('Ramena')).toBe('🥥');
            expect(getCategoryEmoji('Nohy')).toBe('🦵');
            expect(getCategoryEmoji('Ruce')).toBe('💪');
            expect(getCategoryEmoji('Břicho')).toBe('🍫');
            expect(getCategoryEmoji('Kardio')).toBe('⚡');
            expect(getCategoryEmoji('Neznámé')).toBe('🏋️‍♂️');
        });

        it('generates rich thumbnail HTML with GIF image or fallback', () => {
            const exWithImg = defaultExercises[0];
            const htmlWithImg = getExerciseThumbnailHtml(exWithImg);
            expect(htmlWithImg).toContain('<img src="');
            expect(htmlWithImg).toContain(exWithImg.image_url);

            const exWithoutImg = { id: 'custom_ex', name: 'Custom', category: 'Hrudník' };
            const htmlWithoutImg = getExerciseThumbnailHtml(exWithoutImg);
            expect(htmlWithoutImg).toContain('🦍');
        });
    });

    describe('UI Rendering & Catalog Browser', () => {
        it('renders Exercises Tab with catalog browser button and categories', () => {
            const html = renderExercisesTab();
            expect(html).toContain('Katalog cviků');
            expect(html).toContain('Procházet knihovnu');
            expect(html).toContain('Nový cvik');
        });

        it('opens create exercise modal with category optgroups for 110+ presets', () => {
            openCreateExerciseModal();
            const modal = document.getElementById('create-exercise-modal');
            expect(modal).toBeTruthy();

            const select = document.getElementById('preset-exercise-selector');
            expect(select).toBeTruthy();
            const optgroups = select.querySelectorAll('optgroup');
            expect(optgroups.length).toBeGreaterThanOrEqual(7);
        });

        it('opens exercise catalog modal with search input, category filters and cards', () => {
            openExerciseCatalogModal();
            const modal = document.getElementById('exercise-catalog-modal');
            expect(modal).toBeTruthy();

            const searchInput = document.getElementById('catalog-search-input');
            expect(searchInput).toBeTruthy();

            const grid = document.getElementById('catalog-exercises-grid');
            expect(grid).toBeTruthy();
            const cards = grid.querySelectorAll('.catalog-ex-card');
            expect(cards.length).toBe(defaultExercises.length);
        });

        it('filters catalog cards by search term and category pill', () => {
            openExerciseCatalogModal();

            // Category filter
            setCatalogCategoryFilter('Hrudník');
            const cards = document.querySelectorAll('.catalog-ex-card');
            const visibleCards = Array.from(cards).filter(c => !c.classList.contains('hidden'));
            expect(visibleCards.length).toBe(defaultExercises.filter(e => e.category === 'Hrudník').length);

            // Search query filter
            const searchInput = document.getElementById('catalog-search-input');
            searchInput.value = 'bench';
            filterCatalogExercises();

            const benchCards = Array.from(cards).filter(c => !c.classList.contains('hidden'));
            expect(benchCards.length).toBeGreaterThanOrEqual(1);
            benchCards.forEach(c => {
                expect(c.dataset.name).toContain('bench');
            });
        });

        it('allows 1-click import of a catalog exercise into state and database', async () => {
            const exerciseToImport = defaultExercises.find(e => !state.gymExercises.some(ge => ge.id === e.id));
            expect(exerciseToImport).toBeTruthy();

            openExerciseCatalogModal();
            await importCatalogExercise(exerciseToImport.id);

            expect(state.gymExercises.some(ge => ge.id === exerciseToImport.id)).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('gym_exercises');
        });
    });

    describe('Media Synchronization Engine', () => {
        it('backfills missing media and new catalog exercises to state and database', async () => {
            // Setup an exercise with missing media
            state.gymExercises = [
                { id: 'bench_press', name: 'Bench Press', category: 'Hrudník', image_url: null, instructions: null }
            ];

            const renderFn = vi.fn();
            await syncDefaultExercisesMedia(renderFn);

            const bench = state.gymExercises.find(e => e.id === 'bench_press');
            expect(bench.image_url).toBeTruthy();
            expect(bench.instructions).toBeTruthy();
            expect(state.gymExercises.length).toBe(defaultExercises.length);
        });
    });
});
