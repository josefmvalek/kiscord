import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    getMondayOfWeek, 
    getWeekDates, 
    getISOWeekNumber, 
    formatWeekRangeTitle,
    timeToMinutes,
    minutesToTime,
    calculateEventCoordinates,
    calculateEventCollisions,
    getNowIndicatorPosition
} from '../../js/domains/lifestyle/calendar/time-engine.js';
import { 
    getViewMode, 
    setViewMode, 
    getAnchorDate, 
    setAnchorDate, 
    navigatePeriod, 
    jumpToToday,
    getCalSession,
    setCalSession
} from '../../js/domains/lifestyle/calendar/state.js';
import { generateWeekView } from '../../js/domains/lifestyle/calendar/week-view.js';
import { generateMonthView } from '../../js/domains/lifestyle/calendar/month-view.js';
import { renderCalendar, switchViewMode, navigate } from '../../js/domains/lifestyle/calendar/index.js';

describe('Calendar 2.0 — Time Engine & Weekly View System', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentChannel = 'calendar';
        state.loadError = null;
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.scheduleItems = [];
        state.schoolDeadlines = [];
        state.calendarFilter = 'all';
    });

    describe('Pure Time Engine (time-engine.js)', () => {
        it('should correctly determine Monday of any given week', () => {
            // 2026-08-26 is Wednesday
            const wednesday = new Date(2026, 7, 26);
            const monday = getMondayOfWeek(wednesday);
            expect(monday.getDate()).toBe(24);
            expect(monday.getMonth()).toBe(7); // August (0-indexed 7)
            expect(monday.getFullYear()).toBe(2026);

            // 2026-08-30 is Sunday
            const sunday = new Date(2026, 7, 30);
            const mondayFromSunday = getMondayOfWeek(sunday);
            expect(mondayFromSunday.getDate()).toBe(24);
        });

        it('should generate 7 consecutive days starting on Monday', () => {
            const week = getWeekDates('2026-08-26');
            expect(week).toHaveLength(7);
            expect(week[0].dayName).toBe('Po');
            expect(week[0].dateKey).toBe('2026-08-24');
            expect(week[6].dayName).toBe('Ne');
            expect(week[6].dateKey).toBe('2026-08-30');
        });

        it('should compute ISO week numbers correctly', () => {
            const weekNum = getISOWeekNumber('2026-08-24');
            expect(weekNum).toBe(35);
        });

        it('should format week range title with Czech localization', () => {
            const week = getWeekDates('2026-08-26');
            const title = formatWeekRangeTitle(week);
            expect(title).toContain('Srpen');
            expect(title).toContain('2026');
        });

        it('should convert HH:MM to minutes from midnight and back', () => {
            expect(timeToMinutes('00:00')).toBe(0);
            expect(timeToMinutes('07:30')).toBe(450);
            expect(timeToMinutes('14:45')).toBe(885);
            expect(timeToMinutes('23:59')).toBe(1439);
            expect(timeToMinutes('invalid')).toBeNull();

            expect(minutesToTime(0)).toBe('00:00');
            expect(minutesToTime(450)).toBe('07:30');
            expect(minutesToTime(885)).toBe('14:45');
        });

        it('should calculate event coordinates within the time grid (07:00-23:00)', () => {
            // 08:00 start with 60 min duration (1 hour after 07:00 -> top = 56px, height = 56px)
            const coords = calculateEventCoordinates('08:00', 60, 7, 56);
            expect(coords.isValid).toBe(true);
            expect(coords.top).toBe(56);
            expect(coords.height).toBe(56);

            // 09:30 start with 90 min duration (2.5 hours after 07:00 -> top = 140px, height = 84px)
            const coords2 = calculateEventCoordinates('09:30', 90, 7, 56);
            expect(coords2.top).toBe(140);
            expect(coords2.height).toBe(84);
        });

        it('should handle event collisions by distributing columns', () => {
            const overlappingEvents = [
                { id: '1', startTime: '08:00', durationMinutes: 90 }, // 08:00 - 09:30
                { id: '2', startTime: '08:30', durationMinutes: 60 }  // 08:30 - 09:30 (overlaps)
            ];

            const packed = calculateEventCollisions(overlappingEvents);
            expect(packed).toHaveLength(2);
            expect(packed[0].totalCols).toBe(2);
            expect(packed[1].totalCols).toBe(2);
            expect(packed[0].colIndex).toBe(0);
            expect(packed[1].colIndex).toBe(1);
        });

        it('should calculate live Now indicator position', () => {
            const pos = getNowIndicatorPosition(7, 56, 23);
            expect(pos).toHaveProperty('offsetPx');
            expect(pos).toHaveProperty('isVisible');
            expect(pos).toHaveProperty('currentTimeStr');
        });
    });

    describe('Calendar State & Navigation (state.js)', () => {
        it('should manage and switch view modes between week and month', () => {
            setViewMode('week');
            expect(getViewMode()).toBe('week');
            setViewMode('month');
            expect(getViewMode()).toBe('month');
        });

        it('should navigate forward and backward by 1 week when in week mode', () => {
            setViewMode('week');
            setAnchorDate('2026-08-24');
            
            navigatePeriod(1); // +1 week
            const nextWeekAnchor = getAnchorDate();
            expect(nextWeekAnchor.getDate()).toBe(31); // 2026-08-31

            navigatePeriod(-1); // -1 week
            const prevWeekAnchor = getAnchorDate();
            expect(prevWeekAnchor.getDate()).toBe(24);
        });

        it('should navigate forward and backward by 1 month when in month mode', () => {
            setViewMode('month');
            setCalSession(2026, 7); // August
            
            navigatePeriod(1); // September
            const session = getCalSession();
            expect(session.month).toBe(8);

            navigatePeriod(-1); // August
            const sessionBack = getCalSession();
            expect(sessionBack.month).toBe(7);
        });

        it('should jump to today date', () => {
            const todayResult = jumpToToday();
            const now = new Date();
            expect(todayResult.year).toBe(now.getFullYear());
            expect(todayResult.month).toBe(now.getMonth());
        });
    });

    describe('Week View HTML Generation (week-view.js)', () => {
        it('should render week container with time gutter and day columns', () => {
            state.healthData['2026-08-24'] = {
                water_count: 8,
                sleep_hours: 8,
                mood_score: 9
            };

            state.scheduleItems = [
                {
                    id: 'fit-1',
                    day_of_week: 1, // Monday
                    name: 'Úvod do softwarového inženýrství',
                    subject_code: 'IUS',
                    room: 'D105',
                    type: 'Přednáška',
                    time_start: '08:00',
                    time_end: '09:50'
                }
            ];

            state.gymLogs = [
                {
                    id: 'gym-1',
                    date_key: '2026-08-24',
                    name: 'Push Day',
                    duration_seconds: 3600
                }
            ];

            const html = generateWeekView('2026-08-24');

            // Header checks
            expect(html).toContain('cal-week-container');
            expect(html).toContain('cal-allday-strip');
            expect(html).toContain('💧8');
            expect(html).toContain('😴8');

            // Time grid & event checks
            expect(html).toContain('08:00');
            expect(html).toContain('cal-time-gutter');
            expect(html).toContain('IUS');
            expect(html).toContain('D105');
            expect(html).toContain('Push Day');
        });
    });

    describe('Month View HTML Generation (month-view.js)', () => {
        it('should render 7-column calendar month grid with events', () => {
            state.plannedDates['2026-08-25'] = {
                name: 'Kino s Klárkou',
                cat: 'movie'
            };

            const html = generateMonthView(2026, 7);
            expect(html).toContain('Kino s Klárkou');
            expect(html).toContain('🎬');
        });
    });

    describe('Calendar Main Orchestrator (index.js)', () => {
        it('should render full calendar view with segmented control and active mode', () => {
            setViewMode('week');
            setAnchorDate('2026-08-24');
            renderCalendar();

            const container = document.getElementById('messages-container');
            expect(container.innerHTML).toContain('cal-segmented-control');
            expect(container.innerHTML).toContain('Týden');
            expect(container.innerHTML).toContain('Měsíc');
            expect(container.innerHTML).toContain('cal-week-container');
        });

        it('should switch between week and month view on user interaction', () => {
            switchViewMode('month');
            expect(getViewMode()).toBe('month');
            const container = document.getElementById('messages-container');
            expect(container.innerHTML).toContain('calendar-main-content');
        });
    });
});
