import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { getWeatherForDate } from '../../js/domains/lifestyle/calendar/weather.js';
import { 
    getNextPlannedDate, 
    renderDateCountdownBanner 
} from '../../js/domains/lifestyle/calendar/partner-radar.js';
import { generateWeekView } from '../../js/domains/lifestyle/calendar/week-view.js';

// Mock Supabase
vi.mock('../../js/core/supabase.js', () => {
    const createQueryBuilder = () => {
        const builder = {
            select: vi.fn(() => builder),
            upsert: vi.fn(() => builder),
            insert: vi.fn(() => builder),
            update: vi.fn(() => builder),
            delete: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            neq: vi.fn(() => builder),
            gte: vi.fn(() => builder),
            lte: vi.fn(() => builder),
            order: vi.fn(() => builder),
            limit: vi.fn(() => builder),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve) => resolve({ data: [], error: null })
        };
        return builder;
    };

    return {
        supabase: {
            from: vi.fn(() => createQueryBuilder())
        }
    };
});

describe('Calendar 2.0 — Phase 5 (Weather & Partner Radar Countdown)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentChannel = 'calendar';
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.scheduleItems = [];
        state.schoolDeadlines = [];
    });

    describe('Weather Forecast Engine (weather.js)', () => {
        it('should return valid meteorological data (icon, temperature, condition) for a date', () => {
            const weather = getWeatherForDate('2026-08-25');
            expect(weather).toBeDefined();
            expect(weather.icon).toBeDefined();
            expect(weather.temp).toMatch(/\d+°C/);
            expect(weather.condition).toBeDefined();
        });

        it('should generate warmer temperatures for summer and colder for winter', () => {
            const summerWeather = getWeatherForDate('2026-07-15');
            const winterWeather = getWeatherForDate('2026-01-15');

            const summerTemp = parseInt(summerWeather.temp, 10);
            const winterTemp = parseInt(winterWeather.temp, 10);

            expect(summerTemp).toBeGreaterThan(winterTemp);
        });
    });

    describe('Partner Radar & Shared Date Countdown (partner-radar.js)', () => {
        const refDate = new Date(2026, 7, 24); // Monday, August 24, 2026

        it('should return null when no upcoming dates are planned', () => {
            state.plannedDates = {};
            const next = getNextPlannedDate(refDate);
            expect(next).toBeNull();
            expect(renderDateCountdownBanner()).toBe('');
        });

        it('should ignore past dates and return soonest future planned date', () => {
            state.plannedDates = {
                '2026-08-20': { name: 'Staré rande (v minulosti)', time: '18:00' },
                '2026-08-26': { name: 'Večeře v restauraci', time: '19:00', cat: 'food' },
                '2026-08-30': { name: 'Výlet na hrad', time: '10:00', cat: 'walk' }
            };

            const next = getNextPlannedDate(refDate);
            expect(next).not.toBeNull();
            expect(next.dateKey).toBe('2026-08-26');
            expect(next.name).toBe('Večeře v restauraci');
            expect(next.diffDays).toBe(2);
            expect(next.countdownText).toContain('Pozítří');
        });

        it('should format countdown for today, tomorrow, and future days correctly', () => {
            state.plannedDates = {
                '2026-08-24': { name: 'Dnešní kino', time: '20:00' }
            };
            const todayPlan = getNextPlannedDate(refDate);
            expect(todayPlan.countdownText).toContain('Dnes');

            state.plannedDates = {
                '2026-08-25': { name: 'Zítřejší káva', time: '15:00' }
            };
            const tomorrowPlan = getNextPlannedDate(refDate);
            expect(tomorrowPlan.countdownText).toContain('Zítra');
        });

        it('should render sleek countdown banner HTML when upcoming date exists', () => {
            const future = new Date();
            future.setDate(future.getDate() + 2);
            const futureKey = future.toISOString().split('T')[0];

            state.plannedDates = {
                [futureKey]: { name: 'Degustační večeře', time: '18:30' }
            };

            const bannerHtml = renderDateCountdownBanner();
            expect(bannerHtml).toContain('cal-countdown-banner');
            expect(bannerHtml).toContain('Degustační večeře');
            expect(bannerHtml).toContain('Zobrazit plán');
        });
    });

    describe('Week View Integration (week-view.js)', () => {
        it('should include weather information in day summary headers', () => {
            const html = generateWeekView('2026-08-24');
            expect(html).toContain('°C');
        });

        it('should display shared date countdown banner in week view if date planned', () => {
            const today = new Date();
            const yr = today.getFullYear();
            const mo = String(today.getMonth() + 1).padStart(2, '0');
            const da = String(today.getDate()).padStart(2, '0');
            const todayKey = `${yr}-${mo}-${da}`;

            state.plannedDates[todayKey] = {
                name: 'Kino & Popcorn',
                time: '19:00'
            };

            const html = generateWeekView(todayKey);
            expect(html).toContain('cal-countdown-banner');
            expect(html).toContain('Kino & Popcorn');
        });
    });

    describe('Smooth Mobile Touch Gestures (setupTouchSwipe)', () => {
        it('should attach touch listeners and handle horizontal swipes', async () => {
            const { setupTouchSwipe, navigate, getAnchorDate } = await import('../../js/domains/lifestyle/calendar/index.js');
            const el = document.createElement('div');
            setupTouchSwipe(el);

            expect(typeof el.ontouchstart).toBe('function');
            expect(typeof el.ontouchmove).toBe('function');
            expect(typeof el.ontouchend).toBe('function');

            // Simulate touch start
            el.ontouchstart({
                target: el,
                touches: [{ clientX: 200, clientY: 100 }]
            });

            // Simulate touch move with elastic resistance
            el.ontouchmove({
                touches: [{ clientX: 250, clientY: 102 }]
            });
            expect(el.style.transform).toContain('translateX');

            // Simulate swipe left (next period)
            el.ontouchend({
                changedTouches: [{ clientX: 100, clientY: 100 }]
            });
            expect(el.style.transform).toBe('translateX(0px)');
        });
    });
});
