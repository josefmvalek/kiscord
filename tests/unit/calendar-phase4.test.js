import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    generateICSString, 
    parseICSStringToEvents 
} from '../../js/domains/lifestyle/calendar/ics-sync.js';
import { 
    getRecurringRules, 
    saveRecurringRule, 
    deleteRecurringRule, 
    expandRecurringEventsForWeek 
} from '../../js/domains/lifestyle/calendar/recurring-events.js';
import { 
    getDailyBriefingData 
} from '../../js/domains/lifestyle/calendar/daily-briefing.js';
import { getWeekDates } from '../../js/domains/lifestyle/calendar/time-engine.js';

describe('Calendar 2.0 — Phase 4 (iCalendar Sync, Recurring Routines & Daily Briefing)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.currentChannel = 'calendar';
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.scheduleItems = [];
        state.schoolDeadlines = [];
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
    });

    describe('RFC 5545 iCalendar Sync & Export (ics-sync.js)', () => {
        it('should generate valid RFC 5545 iCalendar string with FIT, Gym, Plans and Deadlines', () => {
            state.scheduleItems = [
                {
                    id: 'fit-ius',
                    day_of_week: 1, // Monday
                    time_start: '14:00',
                    time_end: '16:00',
                    subject_code: 'IUS',
                    name: 'Softwarové inženýrství',
                    room: 'D105',
                    type: 'Přednáška'
                }
            ];

            state.gymLogs = [
                {
                    id: 'gym-1',
                    date_key: '2026-08-25',
                    name: 'Heavy Leg Day',
                    duration_seconds: 4500,
                    exercises: [
                        { exercise_name: 'Squat', sets: [{}, {}, {}] }
                    ]
                }
            ];

            state.plannedDates = {
                '2026-08-28': {
                    id: 'plan-1',
                    name: 'Večeře v italské restauraci',
                    time: '19:00',
                    cat: 'food',
                    checklist: [
                        { text: 'Rezervovat stůl', done: true }
                    ]
                }
            };

            state.schoolDeadlines = [
                {
                    id: 'dl-1',
                    deadline_date: '2026-08-30',
                    deadline_time: '23:59',
                    subject_code: 'IUS',
                    title: 'Odevzdání diagramu'
                }
            ];

            const ics = generateICSString();
            expect(ics).toContain('BEGIN:VCALENDAR');
            expect(ics).toContain('VERSION:2.0');
            expect(ics).toContain('PRODID:-//Kiscord//Lifestyle Calendar 2.0//CS');
            expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=14');
            expect(ics).toContain('[IUS] Softwarové inženýrství');
            expect(ics).toContain('Heavy Leg Day');
            expect(ics).toContain('Večeře v italské restauraci');
            expect(ics).toContain('BEGIN:VALARM');
            expect(ics).toContain('END:VCALENDAR');
        });

        it('should parse an iCalendar string back into structured event objects', () => {
            const sampleICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:FIT Výuka IUS
DTSTART:20260825T140000
LOCATION:D105
DESCRIPTION:Přednáška
END:VEVENT
BEGIN:VEVENT
SUMMARY:🏋️ Gym Push Workout
DTSTART:20260826T163000
LOCATION:Posilovna
END:VEVENT
END:VCALENDAR`;

            const events = parseICSStringToEvents(sampleICS);
            expect(events.length).toBe(2);
            expect(events[0].title).toBe('FIT Výuka IUS');
            expect(events[0].dateKey).toBe('2026-08-25');
            expect(events[0].time).toBe('14:00');
            expect(events[0].cat).toBe('fit');

            expect(events[1].title).toContain('Gym Push Workout');
            expect(events[1].dateKey).toBe('2026-08-26');
            expect(events[1].time).toBe('16:30');
            expect(events[1].cat).toBe('gym');
        });
    });

    describe('Recurring Events & Routine Engine (recurring-events.js)', () => {
        it('should save, list and delete recurring habit rules', () => {
            saveRecurringRule({
                id: 'rule-gym-split',
                title: '🏋️ Push Session',
                time: '16:30',
                durationMinutes: 75,
                cat: 'gym',
                daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
                active: true
            });

            const rules = getRecurringRules();
            expect(rules.length).toBe(1);
            expect(rules[0].title).toBe('🏋️ Push Session');
            expect(rules[0].daysOfWeek).toEqual([1, 3, 5]);

            deleteRecurringRule('rule-gym-split');
            expect(getRecurringRules().length).toBe(0);
        });

        it('should expand recurring rules into virtual events for the 7 days of active week', () => {
            saveRecurringRule({
                id: 'rule-gym-split',
                title: '🏋️ Push Session',
                time: '16:30',
                durationMinutes: 75,
                cat: 'gym',
                daysOfWeek: [1, 3, 5], // Mon (24.8.), Wed (26.8.), Fri (28.8.)
                active: true
            });

            const weekDates = getWeekDates('2026-08-24'); // Starts Monday 2026-08-24
            const expandedMap = expandRecurringEventsForWeek(weekDates);

            // Monday
            expect(expandedMap.has('2026-08-24')).toBe(true);
            expect(expandedMap.get('2026-08-24')[0].title).toBe('🏋️ Push Session');

            // Tuesday (should NOT have recurring rule)
            expect(expandedMap.has('2026-08-25')).toBe(false);

            // Wednesday
            expect(expandedMap.has('2026-08-26')).toBe(true);

            // Friday
            expect(expandedMap.has('2026-08-28')).toBe(true);
        });
    });

    describe('Smart Daily Briefing & Morning Digest (daily-briefing.js)', () => {
        it('should compute comprehensive daily briefing data and calculate sleep debt', () => {
            const mondayDate = new Date(2026, 7, 24); // Monday, August 24, 2026

            state.scheduleItems = [
                {
                    day_of_week: 1,
                    time_start: '10:00',
                    time_end: '12:00',
                    subject_code: 'IUS',
                    name: 'Softwarové inženýrství',
                    room: 'D105'
                }
            ];

            state.healthData['2026-08-24'] = {
                sleep_hours: 6.5,
                water_count: 5
            };

            state.plannedDates['2026-08-24'] = {
                name: 'Kino & Večeře',
                time: '19:00',
                checklist: [{ text: 'Lístky', done: true }]
            };

            const briefing = getDailyBriefingData(mondayDate);
            expect(briefing.dayName).toBe('Pondělí');
            expect(briefing.fitSchedule.length).toBe(1);
            expect(briefing.fitSchedule[0].subject_code).toBe('IUS');
            expect(briefing.sleepDebtStr).toContain('-1.5h'); // 6.5h - 8.0h
            expect(briefing.waterCount).toBe(5);
            expect(briefing.plannedDate.name).toBe('Kino & Večeře');
            expect(briefing.discordText).toContain('Dnešní přehled — Pondělí 24.8.');
            expect(briefing.discordText).toContain('[IUS] Softwarové inženýrství');
        });
    });

    describe('Day Modal 3.0 (Bento Grid & Love Pulse) (day-modal.js & partner-radar.js)', () => {
        it('should render Day Modal 3.0 Bento cards and allow stepping between days', async () => {
            const { showDayDetail, stepDayModal, closeDayModal } = await import('../../js/domains/lifestyle/calendar/day-modal.js');
            const { getCurrentModalDateKey } = await import('../../js/domains/lifestyle/calendar/state.js');

            showDayDetail('2026-08-25');
            expect(getCurrentModalDateKey()).toBe('2026-08-25');

            const modalBody = document.getElementById('day-modal-body');
            expect(modalBody).not.toBeNull();
            expect(modalBody.innerHTML).toContain('Biometrika');
            expect(modalBody.innerHTML).toContain('Rychlé hodnocení nálady');

            // Step to tomorrow
            stepDayModal(1);
            expect(getCurrentModalDateKey()).toBe('2026-08-26');

            // Step to yesterday
            stepDayModal(-1);
            expect(getCurrentModalDateKey()).toBe('2026-08-25');

            closeDayModal();
            expect(getCurrentModalDateKey()).toBeNull();
        });

        it('should update mood and water directly from Day Modal 3.0 Bento dial', async () => {
            const { showDayDetail, setDayModalMood, setDayModalWater } = await import('../../js/domains/lifestyle/calendar/day-modal.js');

            showDayDetail('2026-08-25');
            await setDayModalMood(9);

            expect(state.healthData['2026-08-25'].mood_score).toBe(9);

            await setDayModalWater(2);
            expect(state.healthData['2026-08-25'].water_count).toBe(2);
        });

        it('should calculate partner current presence activity in real-time', async () => {
            const { getPartnerCurrentStatus } = await import('../../js/domains/lifestyle/calendar/partner-radar.js');

            const status = getPartnerCurrentStatus();
            expect(status).toBeDefined();
            expect(status.text).toBeDefined();
            expect(status.icon).toBeDefined();
        });

        it('should send Love Pulse with heartbeat sound and screen burst', async () => {
            const { sendLovePulse } = await import('../../js/domains/lifestyle/calendar/partner-radar.js');

            await sendLovePulse();
            const heart = document.querySelector('.cal-pulse-heart-screen');
            expect(heart).not.toBeNull();
            expect(heart.innerHTML).toContain('💖');
        });
    });
});

