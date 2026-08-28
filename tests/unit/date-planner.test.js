import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [], error: null }),
                order: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockResolvedValue({ data: [{ id: '101' }], error: null }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            upsert: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}));

vi.mock('../../js/core/offline.js', () => ({
    safeInsert: vi.fn().mockResolvedValue({ data: [{ id: '101' }], error: null }),
    safeUpsert: vi.fn().mockResolvedValue({ data: [], error: null })
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    triggerConfetti: vi.fn(),
    getTodayKey: vi.fn(() => '2026-08-23'),
    escapeHTML: vi.fn(str => str || '')
}));

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn(),
    showConfirmDialog: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../js/core/sound.js', () => ({
    playChime: vi.fn()
}));

vi.mock('../../js/core/storage.js', () => ({
    uploadFile: vi.fn().mockResolvedValue('https://example.com/photo.jpg')
}));

vi.mock('../../js/core/loader.js', () => ({
    loadLeaflet: vi.fn().mockResolvedValue()
}));

import { state } from '../../js/core/state.js';
import {
    inferCategoryAndIcon,
    filterMap,
    isSecretDateLocked,
    calculateDistance,
    calculateRouteStats,
    searchOnlinePlaces,
    reverseGeocode,
    addToRoute,
    removeFromRoute,
    moveRouteItem,
    clearRoute,
    quickScheduleMatchedDate
} from '../../js/domains/lifestyle/date-planner/index.js';

describe('Date Planner & Advanced Features Engine', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = `
            <div id="messages-container"></div>
            <div id="planner-sidebar" class="-translate-x-full"></div>
            <div id="route-count">0</div>
            <div id="route-list"></div>
            <div id="route-stats"></div>
            <div id="location-list"></div>
            <div id="planner-search-dropdown" class="hidden"></div>
            <div id="detail-panel" class="translate-y-[130%]"></div>
        `;

        state.dateLocations = [
            { id: '1', name: 'Kavárna Místo', cat: 'food', icon: '☕', lat: 50.087, lng: 14.420, country: 'CZ', desc: 'Výborná káva a snídaně', address: 'Břehová 1, Praha' },
            { id: '2', name: 'Vyhlídka Máj', cat: 'view', icon: '🌅', lat: 49.831, lng: 14.456, country: 'CZ', desc: 'Romantický západ slunce nad Vltavou', address: 'Teletín' },
            { id: '3', name: 'Schönbrunn Zámecký Park', cat: 'walk', icon: '🌿', lat: 48.185, lng: 16.312, country: 'AT', desc: 'Procházka v zámecké zahradě', address: 'Wien' },
            { id: '4', name: 'Kino Scala', cat: 'fun', icon: '🎬', lat: 49.197, lng: 16.608, country: 'CZ', desc: 'Filmové promítání a bar', address: 'Brno' },
            { id: '5', name: 'Vinárna U Dvou Přátel', cat: 'food', icon: '🍷', lat: 49.192, lng: 16.611, country: 'CZ', desc: 'Svíčky, víno a klidná atmosféra', address: 'Brno' }
        ];
        state.route = [];
        state.dateRatings = {};
        state.dateFilter = 'all';
        state.currentUser = { name: 'Klárka', email: 'klarka@example.com' };
    });

    describe('Smart Categorization & Emoji Inference', () => {
        it('correctly classifies food & coffee spots', () => {
            expect(inferCategoryAndIcon({ osmType: 'cafe' }, 'Kavárna co hledá jméno')).toEqual({ cat: 'food', icon: '☕' });
            expect(inferCategoryAndIcon({ osmType: 'restaurant' }, 'Pizzeria Mozzarella')).toEqual({ cat: 'food', icon: '🍕' });
            expect(inferCategoryAndIcon({ osmType: 'pub' }, 'Vinárna U Dvou')).toEqual({ cat: 'food', icon: '🍷' });
            expect(inferCategoryAndIcon({ osmType: 'fast_food' }, 'Burger Bar')).toEqual({ cat: 'food', icon: '🍔' });
            expect(inferCategoryAndIcon({ osmType: 'ice_cream' }, 'Zmrzlinárna Puro')).toEqual({ cat: 'food', icon: '🍦' });
        });

        it('correctly classifies viewpoints, castles and towers', () => {
            expect(inferCategoryAndIcon({ osmType: 'viewpoint' }, 'Petřínská rozhledna')).toEqual({ cat: 'view', icon: '🌅' });
            expect(inferCategoryAndIcon({ osmType: 'castle' }, 'Hrad Karlštejn')).toEqual({ cat: 'view', icon: '🏰' });
            expect(inferCategoryAndIcon({ osmType: 'peak' }, 'Sněžka')).toEqual({ cat: 'view', icon: '⛰️' });
        });

        it('correctly classifies parks, nature and walks', () => {
            expect(inferCategoryAndIcon({ osmType: 'park' }, 'Stromovka')).toEqual({ cat: 'walk', icon: '🌿' });
            expect(inferCategoryAndIcon({ osmType: 'forest' }, 'Prokopské údolí lesní stezka')).toEqual({ cat: 'walk', icon: '🌲' });
            expect(inferCategoryAndIcon({ osmType: 'zoo' }, 'Zoo Praha')).toEqual({ cat: 'walk', icon: '🦁' });
        });

        it('correctly classifies entertainment & fun', () => {
            expect(inferCategoryAndIcon({ osmType: 'cinema' }, 'Kino Světozor')).toEqual({ cat: 'fun', icon: '🎬' });
            expect(inferCategoryAndIcon({ osmType: 'museum' }, 'Národní muzeum')).toEqual({ cat: 'fun', icon: '🎟️' });
            expect(inferCategoryAndIcon({ osmType: 'bowling_alley' }, 'Bowling centrum')).toEqual({ cat: 'fun', icon: '🎳' });
        });

        it('falls back to safe default if unknown', () => {
            expect(inferCategoryAndIcon({}, 'Neznámé místo')).toEqual({ cat: 'view', icon: '📍' });
        });
    });

    describe('Category Filtering', () => {
        it('filters locations by category correctly and updates UI list', () => {
            filterMap('food');
            const listEl = document.getElementById('location-list');
            expect(listEl.innerHTML).toContain('Kavárna Místo');
            expect(listEl.innerHTML).toContain('Vinárna U Dvou Přátel');
            expect(listEl.innerHTML).not.toContain('Vyhlídka Máj');

            filterMap('view');
            expect(listEl.innerHTML).toContain('Vyhlídka Máj');
            expect(listEl.innerHTML).not.toContain('Kavárna Místo');

            filterMap('all');
            expect(listEl.innerHTML).toContain('Kavárna Místo');
            expect(listEl.innerHTML).toContain('Vyhlídka Máj');
        });
    });

    describe('Secret Date (Tajné rande) Logic', () => {
        it('identifies locked secret date for partner before unlock threshold', () => {
            const futureYear = new Date().getFullYear() + 2;
            const secretPlan = {
                is_secret: true,
                created_by: 'Josef',
                date_key: `${futureYear}-08-25`,
                time: '19:00',
                secret_hint: 'Bude to sladké...',
                secret_dress_code: 'Pohodlné boty',
                secret_unlock_hours: 1
            };

            // Klárka is viewing Josef's future secret date (it should be locked)
            expect(isSecretDateLocked(secretPlan, 'Klárka')).toBe(true);

            // Josef (the creator) views it (it should NOT be locked for him)
            expect(isSecretDateLocked(secretPlan, 'Josef')).toBe(false);
        });

        it('unlocks secret date when manually unlocked or after time threshold', () => {
            const pastSecretPlan = {
                is_secret: true,
                created_by: 'Josef',
                date_key: '2020-01-01',
                time: '12:00',
                secret_unlock_hours: 1
            };
            expect(isSecretDateLocked(pastSecretPlan, 'Klárka')).toBe(false);

            const manuallyUnlocked = {
                is_secret: true,
                created_by: 'Josef',
                date_key: '2026-08-25',
                time: '19:00',
                is_manually_unlocked: true
            };
            expect(isSecretDateLocked(manuallyUnlocked, 'Klárka')).toBe(false);
        });
    });

    describe('Distance Calculation & Route Analytics', () => {
        it('calculates Haversine distance between two coordinates accurately', () => {
            const dist = calculateDistance(50.0755, 14.4378, 49.1951, 16.6068);
            expect(dist).toBeGreaterThan(180);
            expect(dist).toBeLessThan(195);
        });

        it('returns zero stats for empty or single stop routes', () => {
            expect(calculateRouteStats([])).toEqual({
                distanceKm: 0,
                distanceFormatted: '0 km',
                walkingTimeFormatted: '0 min',
                drivingTimeFormatted: '0 min'
            });

            expect(calculateRouteStats([{ lat: 50.0, lng: 14.0 }])).toEqual({
                distanceKm: 0,
                distanceFormatted: '0 km',
                walkingTimeFormatted: '0 min',
                drivingTimeFormatted: '0 min'
            });
        });

        it('calculates total distance, walking and driving estimates for multiple stops', () => {
            const stops = [
                { lat: 50.087, lng: 14.420 },
                { lat: 50.089, lng: 14.405 },
                { lat: 50.091, lng: 14.401 }
            ];

            const stats = calculateRouteStats(stops);
            expect(stats.distanceKm).toBeGreaterThan(1);
            expect(stats.distanceKm).toBeLessThan(3);
            expect(stats.distanceFormatted).toContain('km');
            expect(stats.walkingTimeFormatted).toContain('min');
            expect(stats.drivingTimeFormatted).toContain('min');
        });
    });

    describe('Route Management & Itinerary Operations', () => {
        it('adds location to route without duplicates and updates UI', () => {
            addToRoute('1');

            expect(state.route).toHaveLength(1);
            expect(state.route[0].name).toBe('Kavárna Místo');
            expect(document.getElementById('route-count').textContent).toBe('1');

            // Trying to add same location again should not duplicate
            addToRoute('1');
            expect(state.route).toHaveLength(1);
        });

        it('reorders and removes items in route correctly', () => {
            state.route = [
                { id: '1', name: 'Stop A', lat: 50.1, lng: 14.1 },
                { id: '2', name: 'Stop B', lat: 50.2, lng: 14.2 },
                { id: '3', name: 'Stop C', lat: 50.3, lng: 14.3 }
            ];

            // Move Stop B up
            moveRouteItem(1, -1);
            expect(state.route.map(r => r.name)).toEqual(['Stop B', 'Stop A', 'Stop C']);

            // Move Stop B down
            moveRouteItem(0, 1);
            expect(state.route.map(r => r.name)).toEqual(['Stop A', 'Stop B', 'Stop C']);

            // Remove middle item
            removeFromRoute(1);
            expect(state.route.map(r => r.name)).toEqual(['Stop A', 'Stop C']);

            // Clear route
            clearRoute();
            expect(state.route).toHaveLength(0);
            expect(document.getElementById('route-count').textContent).toBe('0');
        });
    });

    describe('Rande Matcher & Scheduling', () => {
        it('schedules matched date into planned_dates correctly', async () => {
            await quickScheduleMatchedDate('1', '2026-08-23', '18:00');
            expect(state.plannedDates['2026-08-23']).toBeDefined();
            expect(state.plannedDates['2026-08-23'].name).toBe('Kavárna Místo');
            expect(state.plannedDates['2026-08-23'].time).toBe('18:00');
        });
    });

    describe('Online Search & Geocoding API integration', () => {
        it('returns normalized place structure when search succeeds', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => [
                    {
                        osm_id: 12345,
                        name: 'Bistro Franz',
                        display_name: 'Bistro Franz, Veveří 461/14, 602 00 Brno, Česko',
                        lat: '49.1994',
                        lon: '16.6035',
                        type: 'cafe',
                        class: 'amenity',
                        address: {
                            road: 'Veveří',
                            city: 'Brno',
                            country: 'Česko',
                            country_code: 'cz'
                        }
                    }
                ]
            });

            const results = await searchOnlinePlaces('Bistro Franz');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                id: 'osm_12345',
                name: 'Bistro Franz',
                city: 'Brno',
                country: 'CZ',
                countryCode: 'CZ',
                cat: 'food',
                icon: '☕',
                lat: 49.1994,
                lng: 16.6035,
                isOnline: true
            });
        });

        it('handles reverse geocoding of coordinates into human-readable place', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    display_name: 'Zell am See Promenade, 5700 Zell am See, Rakousko',
                    name: 'Zell am See Promenade',
                    type: 'attraction',
                    class: 'tourism',
                    address: {
                        road: 'Esplanade',
                        city: 'Zell am See',
                        country: 'Rakousko',
                        country_code: 'at'
                    }
                })
            });

            const resolved = await reverseGeocode(47.3235, 12.7968);
            expect(resolved).not.toBeNull();
            expect(resolved.name).toBe('Zell am See Promenade');
            expect(resolved.country).toBe('AT');
            expect(resolved.cat).toBe('view');
        });

        it('returns empty array on network failure or short query gracefully', async () => {
            const shortQuery = await searchOnlinePlaces('a');
            expect(shortQuery).toEqual([]);

            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const failedQuery = await searchOnlinePlaces('Petřín');
            expect(failedQuery).toEqual([]);
        });
    });
});
