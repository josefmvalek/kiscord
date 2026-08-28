import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    showQuickAddPopover, 
    showEventDetailPopover, 
    setQuickAddType, 
    handleQuickAddSubmit, 
    quickToggleChecklist, 
    closeQuickPopovers 
} from '../../js/domains/lifestyle/calendar/quick-popover.js';
import { 
    toggleMiniCalendarPicker, 
    stepMiniPickerMonth, 
    selectMiniPickerDate, 
    closeMiniPicker 
} from '../../js/domains/lifestyle/calendar/mini-picker.js';
import { generateWeekView } from '../../js/domains/lifestyle/calendar/week-view.js';
import { setAnchorDate, getAnchorDate, getViewMode, setViewMode } from '../../js/domains/lifestyle/calendar/state.js';

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

describe('Calendar 2.0 — Quick Popovers & Interactive Features (Phase 2)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentChannel = 'calendar';
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.scheduleItems = [];
        state.schoolDeadlines = [];
        state.calendarFilter = 'all';
        closeQuickPopovers();
        closeMiniPicker();
    });

    describe('1-Click Quick Add Popover (quick-popover.js)', () => {
        it('should open and render Quick Add popover with prefilled date and time', () => {
            const anchorEl = document.createElement('div');
            document.body.appendChild(anchorEl);

            showQuickAddPopover(anchorEl, '2026-08-25', '14:30');

            const popover = document.getElementById('cal-quick-popover');
            expect(popover).not.toBeNull();
            expect(popover.innerHTML).toContain('Rychle naplánovat');
            
            const timeInput = document.getElementById('qadd-time');
            expect(timeInput.value).toBe('14:30');

            const dateKeyInput = document.getElementById('qadd-date-key');
            expect(dateKeyInput.value).toBe('2026-08-25');
        });

        it('should switch between event types in Quick Add popover', () => {
            const anchorEl = document.createElement('div');
            document.body.appendChild(anchorEl);
            showQuickAddPopover(anchorEl, '2026-08-25', '14:00');

            setQuickAddType('date');
            expect(document.getElementById('qadd-selected-type').value).toBe('date');
            expect(document.getElementById('qadd-cat-wrapper').classList.contains('hidden')).toBe(false);

            setQuickAddType('fit');
            expect(document.getElementById('qadd-selected-type').value).toBe('fit');
            expect(document.getElementById('qadd-cat-wrapper').classList.contains('hidden')).toBe(true);
        });

        it('should submit Quick Add form and update state.plannedDates for a workout plan', async () => {
            const anchorEl = document.createElement('div');
            document.body.appendChild(anchorEl);
            showQuickAddPopover(anchorEl, '2026-08-26', '16:00');

            setQuickAddType('gym');
            document.getElementById('qadd-title').value = 'Heavy Leg Day';

            await handleQuickAddSubmit(null, '2026-08-26');

            expect(state.plannedDates['2026-08-26']).toBeDefined();
            expect(state.plannedDates['2026-08-26'].name).toContain('Heavy Leg Day');
            expect(state.plannedDates['2026-08-26'].cat).toBe('gym');
            expect(document.getElementById('cal-quick-popover')).toBeNull(); // closed
        });

        it('should submit Quick Add form for a romantic date plan', async () => {
            const anchorEl = document.createElement('div');
            document.body.appendChild(anchorEl);
            showQuickAddPopover(anchorEl, '2026-08-27', '19:00');

            setQuickAddType('date');
            document.getElementById('qadd-title').value = 'Večeře v italské restauraci';
            document.getElementById('qadd-date-cat').value = 'food';

            await handleQuickAddSubmit(null, '2026-08-27');

            expect(state.plannedDates['2026-08-27']).toBeDefined();
            expect(state.plannedDates['2026-08-27'].name).toBe('Večeře v italské restauraci');
            expect(state.plannedDates['2026-08-27'].cat).toBe('food');
        });
    });

    describe('Event Detail Popover & Checklist Toggling', () => {
        it('should render rich event detail for romantic plan and toggle checklist item', async () => {
            state.plannedDates['2026-08-28'] = {
                name: 'Kino & Procházka',
                time: '18:30',
                checklist: [
                    { text: 'Koupit lístky', done: false },
                    { text: 'Objednat taxi', done: true }
                ]
            };

            const anchorEl = document.createElement('div');
            document.body.appendChild(anchorEl);

            showEventDetailPopover(anchorEl, {
                type: 'date',
                title: 'Kino & Procházka',
                startTime: '18:30',
                raw: state.plannedDates['2026-08-28']
            }, '2026-08-28');

            const popover = document.getElementById('cal-quick-popover');
            expect(popover).not.toBeNull();
            expect(popover.innerHTML).toContain('Kino & Procházka');
            expect(popover.innerHTML).toContain('Koupit lístky');

            // 1-Click quick toggle checklist
            await quickToggleChecklist('2026-08-28', 0);
            expect(state.plannedDates['2026-08-28'].checklist[0].done).toBe(true);
        });

        it('should render gym workout preview with exercises summary', () => {
            const anchorEl = document.createElement('div');
            document.body.appendChild(anchorEl);

            showEventDetailPopover(anchorEl, {
                type: 'gym',
                title: 'Upper Body A',
                startTime: '15:00',
                durationMinutes: 75,
                raw: {
                    name: 'Upper Body A',
                    exercises: [
                        { exercise_name: 'Incline Bench', sets: [{}, {}, {}] },
                        { exercise_name: 'Pull-Ups', sets: [{}, {}] }
                    ]
                }
            }, '2026-08-28');

            const popover = document.getElementById('cal-quick-popover');
            expect(popover.innerHTML).toContain('Upper Body A');
            expect(popover.innerHTML).toContain('Incline Bench');
            expect(popover.innerHTML).toContain('3x');
            expect(popover.innerHTML).toContain('75 min');
        });
    });

    describe('Mini-Calendar Header Picker (mini-picker.js)', () => {
        it('should open mini calendar dropdown and allow date selection', () => {
            setAnchorDate('2026-08-24');
            const headerTitle = document.createElement('h2');
            document.body.appendChild(headerTitle);

            toggleMiniCalendarPicker(headerTitle);

            const dropdown = document.getElementById('cal-mini-picker-dropdown');
            expect(dropdown).not.toBeNull();
            expect(dropdown.innerHTML).toContain('Srpen');
            expect(dropdown.innerHTML).toContain('2026');

            // Select 28th
            selectMiniPickerDate('2026-08-28');
            const updatedAnchor = getAnchorDate();
            expect(updatedAnchor.getDate()).toBe(28);
            expect(document.getElementById('cal-mini-picker-dropdown')).toBeNull(); // closed
        });

        it('should navigate months in mini picker', () => {
            const headerTitle = document.createElement('h2');
            document.body.appendChild(headerTitle);
            toggleMiniCalendarPicker(headerTitle);

            stepMiniPickerMonth(1); // September
            const dropdown = document.getElementById('cal-mini-picker-dropdown');
            expect(dropdown.innerHTML).toContain('Září');
        });
    });

    describe('Multi-Domain Filtering in Week View', () => {
        it('should render glowing indigo sleep bands when sleep filter is active', () => {
            state.calendarFilter = 'sleep';
            state.healthData['2026-08-24'] = {
                sleep_hours: 8
            };

            const html = generateWeekView('2026-08-24');
            expect(html).toContain('cal-sleep-band');
            expect(html).toContain('8h Spánek');
        });

        it('should focus on gym workouts when gym filter is active', () => {
            state.calendarFilter = 'gym';
            state.gymLogs = [
                {
                    id: 'gym-push',
                    date_key: '2026-08-24',
                    name: 'Chest & Tri',
                    duration_seconds: 3600
                }
            ];

            const html = generateWeekView('2026-08-24');
            expect(html).toContain('Chest & Tri');
        });
    });

    describe('In-Cell Quick Logging & Floating HUD (Phase 2 Upgrade)', () => {
        it('should increment water count and trigger sounds on quickAddWater', async () => {
            const { quickAddWater } = await import('../../js/domains/lifestyle/calendar/index.js');
            state.healthData['2026-08-25'] = { water_count: 3 };

            await quickAddWater('2026-08-25');
            expect(state.healthData['2026-08-25'].water_count).toBe(4);

            await quickAddWater('2026-08-25');
            expect(state.healthData['2026-08-25'].water_count).toBe(5);
        });

        it('should show and hide day hover HUD with biometrics and events', async () => {
            const { showDayHoverHUD, hideDayHoverHUD } = await import('../../js/domains/lifestyle/calendar/quick-popover.js');
            
            state.healthData['2026-08-25'] = { water_count: 6, sleep_hours: 8, mood_score: 9 };
            state.plannedDates['2026-08-25'] = { name: 'Večeře s Klárkou', time: '19:30' };

            const anchorEl = document.createElement('div');
            document.body.appendChild(anchorEl);

            showDayHoverHUD(anchorEl, '2026-08-25');

            // Wait for debounce timer (280ms)
            await new Promise(r => setTimeout(r, 340));

            const hud = document.getElementById('cal-day-hover-hud');
            expect(hud).not.toBeNull();
            expect(hud.innerHTML).toContain('Večeře s Klárkou');
            expect(hud.innerHTML).toContain('6/8');
            expect(hud.innerHTML).toContain('8h');
            expect(hud.innerHTML).toContain('9/10');

            hideDayHoverHUD();
            expect(document.getElementById('cal-day-hover-hud')).toBeNull();
        });
    });
});

