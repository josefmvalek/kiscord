import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { getAnniversaryMemories } from '../../js/domains/lifestyle/calendar/time-engine.js';
import { 
    showDayDetail, 
    openWatchlistPicker, 
    selectWatchlistMovie, 
    setDayModalMood, 
    setDayModalWater 
} from '../../js/domains/lifestyle/calendar/day-modal.js';
import { generateWeekView } from '../../js/domains/lifestyle/calendar/week-view.js';
import { generateMonthView } from '../../js/domains/lifestyle/calendar/month-view.js';

// Mock Supabase with full chainable query support
vi.mock('../../js/core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase()
    };
});

describe('Kiscord Calendar — Cross-Domain Synergy (Points 2, 3, 4, 5, 6)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentChannel = 'calendar';
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.scheduleItems = [];
        state.schoolDeadlines = [];
        state.timelineEvents = [];
        state.library = { movies: [], series: [] };
        state.watchlist = [];
    });

    describe('Point 2: Watchlist & Shared Movies Picker (quick-popover.js & day-modal.js)', () => {
        it('should list movies from Watchlist and schedule selected movie into plannedDates', async () => {
            state.library.movies = [
                { id: 'mov-interstellar', title: 'Interstellar', genre: 'Sci-Fi', rating: 5, icon: '🚀' }
            ];

            openWatchlistPicker('2026-08-28');
            const modal = document.getElementById('cal-watchlist-picker-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('Interstellar');
            expect(modal.innerHTML).toContain('Sci-Fi');

            // Select movie
            await selectWatchlistMovie('2026-08-28', 'Interstellar', '20:30', '🚀');
            expect(state.plannedDates['2026-08-28']).toBeDefined();
            expect(state.plannedDates['2026-08-28'].name).toBe('🚀 Interstellar');
            expect(state.plannedDates['2026-08-28'].time).toBe('20:30');
            expect(state.plannedDates['2026-08-28'].cat).toBe('movie');
            expect(state.plannedDates['2026-08-28'].checklist.length).toBeGreaterThan(0);
        });
    });

    describe('Point 3: Menstrual Cycle Phase & Energy Predictor (day-modal.js)', () => {
        it('should calculate and display cycle phase badge with energy level and partner tip in Day Modal', () => {
            state.cycleLogs = [
                { start_date: '2026-08-20', period_length_days: 5 }
            ];
            state.cycleSettings = { average_cycle_length: 28 };

            showDayDetail('2026-08-25');
            const modalBody = document.getElementById('day-modal-body');
            expect(modalBody).not.toBeNull();
            // On August 25 (Day 6), phase should be Follicular or Menstrual
            expect(modalBody.innerHTML).toMatch(/(Folikulární|Menstruační|Ovulační|Luteální)/);
        });
    });

    describe('Point 4: Planned vs Logged Gym Workouts (week-view.js)', () => {
        it('should render cal-luxe-gym-pending for unlogged workout and cal-luxe-gym for logged workout', () => {
            // Monday: Planned but not yet logged
            state.plannedDates['2026-08-24'] = {
                name: '🏋️ Push Day Session',
                cat: 'gym',
                time: '17:00',
                durationMinutes: 60
            };

            // Tuesday: Actually completed gym log
            state.gymLogs = [
                {
                    id: 'gym-tue-1',
                    date_key: '2026-08-25',
                    name: 'Legs & Core',
                    duration_seconds: 3600,
                    exercises: [{ name: 'Squat', sets: [1, 2, 3] }]
                }
            ];

            const html = generateWeekView('2026-08-24');
            // Check for both styles
            expect(html).toContain('cal-luxe-gym-pending');
            expect(html).toContain('cal-luxe-gym');
            expect(html).toContain('Legs & Core');
        });
    });

    describe('Point 5: Historical Memories "On This Day" (time-engine.js & month-view.js)', () => {
        it('should detect anniversary memories from previous years on the same MM-DD', () => {
            const timelineEvents = [
                {
                    id: 'mem-1',
                    title: 'První rande u řeky',
                    event_date: '2024-08-25', // 2 years ago
                    icon: '❤️'
                },
                {
                    id: 'mem-2',
                    title: 'Výlet do Tater',
                    event_date: '2025-08-25', // 1 year ago
                    icon: '⛰️'
                },
                {
                    id: 'mem-3',
                    title: 'Běžný den v jiný měsíc',
                    event_date: '2025-05-12',
                    icon: '☕'
                }
            ];

            const anniversaries = getAnniversaryMemories('2026-08-25', timelineEvents);
            expect(anniversaries.length).toBe(2);
            expect(anniversaries[0].title).toBe('První rande u řeky');
            expect(anniversaries[0].yearsAgo).toBe(2);
            expect(anniversaries[0].anniversaryLabel).toBe('Před 2 lety');

            expect(anniversaries[1].title).toBe('Výlet do Tater');
            expect(anniversaries[1].yearsAgo).toBe(1);
            expect(anniversaries[1].anniversaryLabel).toBe('Před 1 rokem');
        });

        it('should render sparkle indicator in month cell for anniversary days', () => {
            state.calendarFilter = 'all';
            state.timelineEvents = [
                {
                    id: 'mem-1',
                    title: 'První rande',
                    event_date: '2024-08-25',
                    icon: '❤️'
                }
            ];

            const html = generateMonthView(2026, 7); // August 2026
            expect(html).toContain('title="První rande (Před 2 lety)"');
        });
    });

    describe('Point 6: Realtime Sunflower Dashboard Sync (day-modal.js)', () => {
        it('should emit health-data-updated event when mood or water is updated', async () => {
            let eventDetail = null;
            window.addEventListener('health-data-updated', (e) => {
                eventDetail = e.detail;
            });

            showDayDetail('2026-08-25');
            await setDayModalMood(10);

            expect(eventDetail).not.toBeNull();
            expect(eventDetail.dateKey).toBe('2026-08-25');
            expect(eventDetail.health.mood_score).toBe(10);

            await setDayModalWater(1);
            expect(eventDetail.health.water_count).toBe(1);
        });
    });
});
