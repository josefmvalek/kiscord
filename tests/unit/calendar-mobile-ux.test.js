import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { generateAgendaView } from '../../js/domains/lifestyle/calendar/agenda-view.js';
import { 
    getViewMode, 
    setViewMode 
} from '../../js/domains/lifestyle/calendar/state.js';
import { 
    showDayDetail, 
    closeDayModal, 
    ensureModals 
} from '../../js/domains/lifestyle/calendar/day-modal.js';
import { 
    switchViewMode, 
    renderCalendar 
} from '../../js/domains/lifestyle/calendar/index.js';

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

describe('Kiscord Calendar — Mobile-First UX Upgrades (Bottom Sheet, Agenda View & Sticky Headers)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentChannel = 'calendar';
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.scheduleItems = [];
        state.schoolDeadlines = [];
        state.timelineEvents = [];
    });

    describe('1. Agenda View Mode (agenda-view.js & state.js)', () => {
        it('should support switching viewMode to agenda and persist in state', () => {
            setViewMode('agenda');
            expect(getViewMode()).toBe('agenda');

            switchViewMode('agenda');
            expect(getViewMode()).toBe('agenda');
        });

        it('should render chronological agenda feed with dates, weather, and events', () => {
            state.scheduleItems = [
                {
                    day_of_week: 1, // Monday
                    name: 'Matematika pro informatiky',
                    subject_code: 'MAT',
                    room: 'D105',
                    time_start: '09:00',
                    time_end: '10:50'
                }
            ];

            state.plannedDates['2026-08-24'] = {
                name: 'Kino s Klárkou 🍿',
                time: '19:30',
                durationMinutes: 120,
                checklist: [{ text: 'Popcorn', done: true }]
            };

            state.gymLogs = [
                {
                    id: 'gym-1',
                    date_key: '2026-08-25',
                    name: 'Upper Body Blast',
                    duration_seconds: 3600,
                    exercises: [1, 2, 3]
                }
            ];

            const html = generateAgendaView('2026-08-24');
            expect(html).toContain('cal-agenda-view');
            expect(html).toContain('cal-agenda-day-card');
            expect(html).toContain('Matematika pro informatiky');
            expect(html).toContain('[MAT]');
            expect(html).toContain('Kino s Klárkou 🍿');
            expect(html).toContain('Upper Body Blast');
        });

        it('should render empty day placeholder when no events are scheduled', () => {
            state.scheduleItems = [];
            state.plannedDates = {};
            state.gymLogs = [];

            const html = generateAgendaView('2026-08-24');
            expect(html).toContain('Volný den bez naplánovaných akcí');
        });
    });

    describe('2. Mobile Native Bottom Sheet Drawer (day-modal.js)', () => {
        it('should create bottom sheet container with mobile drag handle', () => {
            ensureModals();
            const modal = document.getElementById('day-modal');
            const container = document.getElementById('day-modal-container');
            const dragHandle = document.getElementById('modal-drag-handle');

            expect(modal).not.toBeNull();
            expect(container).not.toBeNull();
            expect(container.className).toContain('cal-bottom-sheet');
            expect(dragHandle).not.toBeNull();
        });

        it('should open and close day detail bottom sheet properly', () => {
            showDayDetail('2026-08-25');
            const modal = document.getElementById('day-modal');
            expect(modal.classList.contains('hidden')).toBe(false);

            closeDayModal();
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should attach touch listeners for pull-to-dismiss and horizontal swipe', () => {
            ensureModals();
            const container = document.getElementById('day-modal-container');

            // Simulate touch pull down
            const touchStart = new Event('touchstart');
            touchStart.touches = [{ clientX: 150, clientY: 50 }];
            container.dispatchEvent(touchStart);

            const touchMove = new Event('touchmove');
            touchMove.touches = [{ clientX: 150, clientY: 100 }];
            container.dispatchEvent(touchMove);

            expect(container.style.transform).toContain('translateY');
        });
    });
});
