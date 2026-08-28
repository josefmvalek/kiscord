import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    parseNaturalLanguageEvent, 
    detectScheduleConflicts,
    findBestRomanticGaps,
    bookRomanticGap
} from '../../js/domains/lifestyle/calendar/nlp-quick-add.js';
import { 
    computeWeeklyStats, 
    toggleWeeklyAnalyticsDrawer, 
    closeAnalyticsDrawer 
} from '../../js/domains/lifestyle/calendar/weekly-analytics.js';
import { 
    applyEventReschedule, 
    applyEventDurationResize 
} from '../../js/domains/lifestyle/calendar/drag-drop.js';
import { getWeekDates } from '../../js/domains/lifestyle/calendar/time-engine.js';

// Mock Supabase
vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
    }
}));

describe('Calendar 2.0 — Phase 3 (NLP Parser, Conflicts, Analytics & Drag-Drop)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentChannel = 'calendar';
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.scheduleItems = [];
        state.schoolDeadlines = [];
        closeAnalyticsDrawer();
    });

    describe('Natural Language Event Parser (nlp-quick-add.js)', () => {
        const refDate = new Date(2026, 7, 24); // Monday, August 24, 2026

        it('should parse relative day "zítra v 17:00 Push Day" to Tuesday 17:00 gym event', () => {
            const result = parseNaturalLanguageEvent('Zítra v 17:00 Push Day', refDate);
            expect(result.dateKey).toBe('2026-08-25');
            expect(result.time).toBe('17:00');
            expect(result.cat).toBe('gym');
            expect(result.title).toContain('Push Day');
        });

        it('should parse "Pátek 19:30 Večeře s Klárkou" to Friday 19:30 food event', () => {
            const result = parseNaturalLanguageEvent('Pátek 19:30 Večeře s Klárkou', refDate);
            expect(result.dateKey).toBe('2026-08-28');
            expect(result.time).toBe('19:30');
            expect(result.cat).toBe('food');
            expect(result.title).toContain('Večeře s Klárkou');
        });

        it('should parse afternoon expression "v 5 odpoledne" to 17:00', () => {
            const result = parseNaturalLanguageEvent('Dnes v 5 odpoledne Trénink', refDate);
            expect(result.dateKey).toBe('2026-08-24');
            expect(result.time).toBe('17:00');
            expect(result.cat).toBe('gym');
        });

        it('should parse FIT study keywords "Středa 14:00 Projekt WIS" to FIT category', () => {
            const result = parseNaturalLanguageEvent('Středa 14:00 Projekt WIS', refDate);
            expect(result.dateKey).toBe('2026-08-26');
            expect(result.time).toBe('14:00');
            expect(result.cat).toBe('fit');
            expect(result.title).toContain('Projekt WIS');
        });

        it('should parse explicit date "28.8. v 16:00 Nákup"', () => {
            const result = parseNaturalLanguageEvent('28.8. v 16:00 Nákup', refDate);
            expect(result.dateKey).toBe('2026-08-28');
            expect(result.time).toBe('16:00');
        });
    });

    describe('Smart Schedule Conflict Detector (nlp-quick-add.js)', () => {
        beforeEach(() => {
            // Monday schedule: IUS lecture from 14:00 to 16:00
            state.scheduleItems = [
                {
                    day_of_week: 1, // Monday
                    time_start: '14:00',
                    time_end: '16:00',
                    subject_code: 'IUS',
                    name: 'Úvod do softwarového inženýrství',
                    room: 'D105'
                }
            ];
        });

        it('should detect clash when planning event during FIT lecture', () => {
            const conflict = detectScheduleConflicts('2026-08-24', '14:30', 60);
            expect(conflict.hasConflict).toBe(true);
            expect(conflict.conflictingEvents.length).toBeGreaterThan(0);
            expect(conflict.conflictingEvents[0].title).toContain('IUS');
        });

        it('should return no conflict when planning in a free time slot', () => {
            const conflict = detectScheduleConflicts('2026-08-24', '17:00', 60);
            expect(conflict.hasConflict).toBe(false);
            expect(conflict.conflictingEvents.length).toBe(0);
        });

        it('should detect clash with an existing planned date', () => {
            state.plannedDates['2026-08-25'] = {
                name: 'Kino',
                time: '18:00'
            };

            const conflict = detectScheduleConflicts('2026-08-25', '18:30', 60);
            expect(conflict.hasConflict).toBe(true);
            expect(conflict.conflictingEvents[0].title).toBe('Kino');
        });
    });

    describe('Weekly Analytics & Insights Engine (weekly-analytics.js)', () => {
        it('should aggregate weekly workout, sleep, water, and FIT stats correctly', () => {
            const weekDates = getWeekDates('2026-08-24');

            state.gymLogs = [
                {
                    date_key: '2026-08-24',
                    duration_seconds: 3600,
                    exercises: [
                        { sets: [{}, {}, {}] },
                        { sets: [{}, {}] }
                    ]
                },
                {
                    date_key: '2026-08-26',
                    duration_seconds: 4500,
                    exercises: [
                        { sets: [{}, {}, {}, {}] }
                    ]
                }
            ];

            state.healthData = {
                '2026-08-24': { sleep_hours: 8, water_count: 8 },
                '2026-08-25': { sleep_hours: 7.5, water_count: 8 },
                '2026-08-26': { sleep_hours: 7.0, water_count: 6 }
            };

            const stats = computeWeeklyStats(weekDates);
            expect(stats.totalWorkouts).toBe(2);
            expect(stats.totalGymSets).toBe(9);
            expect(parseFloat(stats.avgSleep)).toBeCloseTo(7.5, 1);
            expect(stats.goodSleepDays).toBe(2);
            expect(stats.waterTargetDays).toBe(2);
        });

        it('should toggle and render Weekly Analytics drawer in the DOM', () => {
            toggleWeeklyAnalyticsDrawer();

            const drawer = document.getElementById('cal-analytics-drawer');
            expect(drawer).not.toBeNull();
            expect(drawer.innerHTML).toContain('Týdenní Přehled');
            expect(drawer.innerHTML).toContain('Posilovna & Tréninky');

            closeAnalyticsDrawer();
            // Drawer removes itself
        });
    });

    describe('Drag & Drop Rescheduling & Resizing (drag-drop.js)', () => {
        it('should reschedule a plan to a new date and time', async () => {
            state.plannedDates['2026-08-24'] = {
                name: 'Squat Session',
                cat: 'gym',
                time: '16:00'
            };

            await applyEventReschedule(
                { type: 'gym' },
                '2026-08-24',
                '2026-08-26',
                '18:00'
            );

            expect(state.plannedDates['2026-08-24']).toBeUndefined();
            expect(state.plannedDates['2026-08-26']).toBeDefined();
            expect(state.plannedDates['2026-08-26'].time).toBe('18:00');
            expect(state.plannedDates['2026-08-26'].name).toBe('Squat Session');
        });

        it('should resize duration of an event', async () => {
            state.plannedDates['2026-08-27'] = {
                name: 'Procházka parkem',
                time: '17:00',
                durationMinutes: 60
            };

            await applyEventDurationResize({ type: 'date' }, '2026-08-27', 120);

            expect(state.plannedDates['2026-08-27'].durationMinutes).toBe(120);
        });
    });

    describe('Smart Romantic Gap Finder AI (nlp-quick-add.js)', () => {
        it('should find optimal evening slots without schedule clashes', () => {
            const weekDates = [
                { dateKey: '2026-08-24' }, // Mon
                { dateKey: '2026-08-25' }, // Tue
                { dateKey: '2026-08-26' }, // Wed
                { dateKey: '2026-08-27' }, // Thu
                { dateKey: '2026-08-28' }, // Fri
                { dateKey: '2026-08-29' }, // Sat
                { dateKey: '2026-08-30' }  // Sun
            ];

            // Block Friday night with a gym workout 18:00 - 19:30
            state.gymLogs = [
                {
                    id: 'gym-fri',
                    date_key: '2026-08-28',
                    name: 'Leg Day',
                    created_at: '2026-08-28T18:00:00Z',
                    duration_seconds: 5400 // 90m -> 18:00 to 19:30
                }
            ];

            const gaps = findBestRomanticGaps(weekDates, 90);
            expect(gaps.length).toBeGreaterThan(0);
            expect(gaps[0].durationMinutes).toBeGreaterThanOrEqual(90);
            expect(gaps[0].startTime).toBeDefined();
            expect(gaps[0].endTime).toBeDefined();
        });

        it('should book romantic gap into state.plannedDates', async () => {
            await bookRomanticGap('2026-08-28', '20:00', 120, 'Kino & Večeře ❤️');

            expect(state.plannedDates['2026-08-28']).toBeDefined();
            expect(state.plannedDates['2026-08-28'].name).toBe('Kino & Večeře ❤️');
            expect(state.plannedDates['2026-08-28'].time).toBe('20:00');
            expect(state.plannedDates['2026-08-28'].durationMinutes).toBe(120);
        });
    });
});
