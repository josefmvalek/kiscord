/**
 * Time Engine — Pure Date & Time Mathematics for Kiscord Calendar
 * High-performance pure calculation utilities (zero side-effects).
 */

import { getTodayKey } from '@core/utils.js';

export const CZECH_DAY_NAMES_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
export const CZECH_DAY_NAMES_FULL = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
export const CZECH_MONTH_NAMES = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

/**
 * Formats a Date object to YYYY-MM-DD local string.
 * @param {Date} d 
 * @returns {string}
 */
export function formatDateKey(d) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a local Date object.
 * @param {string} dateKey 
 * @returns {Date}
 */
export function parseDateKey(dateKey) {
    if (!dateKey || typeof dateKey !== 'string') return new Date();
    const parts = dateKey.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Returns Monday of the week for given date.
 * @param {Date|string} dateInput 
 * @returns {Date}
 */
export function getMondayOfWeek(dateInput) {
    const d = typeof dateInput === 'string' ? parseDateKey(dateInput) : new Date(dateInput);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * Generates an array of 7 day descriptors for the week starting on Monday.
 * @param {Date|string} anchorDate 
 * @returns {Array<object>}
 */
export function getWeekDates(anchorDate) {
    const monday = getMondayOfWeek(anchorDate);
    const todayKey = getTodayKey();
    const week = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const dateKey = formatDateKey(d);
        const jsDay = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

        week.push({
            date: d,
            dateKey,
            dayIndex: i, // 0..6 (Mon..Sun)
            dayOfWeek: jsDay, // 1..6, 0
            dayName: CZECH_DAY_NAMES_SHORT[i],
            dayNameFull: CZECH_DAY_NAMES_FULL[i],
            dayNumber: d.getDate(),
            monthNumber: d.getMonth() + 1,
            monthName: CZECH_MONTH_NAMES[d.getMonth()],
            year: d.getFullYear(),
            isToday: dateKey === todayKey
        });
    }

    return week;
}

/**
 * Calculates ISO 8601 week number.
 * @param {Date|string} dateInput 
 * @returns {number}
 */
export function getISOWeekNumber(dateInput) {
    const d = typeof dateInput === 'string' ? parseDateKey(dateInput) : new Date(dateInput);
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

/**
 * Formats a human-readable title for the week header.
 * E.g., "Srpen 2026 • 35. týden (24.–30. 8.)"
 * @param {Array<object>} weekDates 
 * @returns {string}
 */
export function formatWeekRangeTitle(weekDates) {
    if (!weekDates || weekDates.length !== 7) return '';
    const first = weekDates[0];
    const last = weekDates[6];

    if (first.monthNumber === last.monthNumber) {
        return `${first.monthName} <span class="text-gray-400 font-light text-base md:text-xl">${first.year}</span>`;
    } else if (first.year === last.year) {
        return `${first.monthName} – ${last.monthName} <span class="text-gray-400 font-light text-base md:text-xl">${first.year}</span>`;
    } else {
        return `${first.monthName} ${first.year} – ${last.monthName} <span class="text-gray-400 font-light text-base md:text-xl">${last.year}</span>`;
    }
}

/**
 * Converts "HH:MM" string to minutes from midnight (0..1439).
 * @param {string} timeStr 
 * @returns {number|null}
 */
export function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return (h * 60) + m;
}

/**
 * Converts minutes from midnight into "HH:MM" format.
 * @param {number} minutes 
 * @returns {string}
 */
export function minutesToTime(minutes) {
    if (typeof minutes !== 'number' || isNaN(minutes)) return '00:00';
    const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates top (in px) and height (in px) for an event block in the time-grid.
 * @param {string|number} startTime "HH:MM" or minutes from midnight
 * @param {number} durationMinutes Duration in minutes (default 60)
 * @param {number} startHour Grid start hour (default 0 for 00:00)
 * @param {number} hourHeight Height of one hour in px (default 56)
 * @returns {{ top: number, height: number, isValid: boolean }}
 */
export function calculateEventCoordinates(startTime, durationMinutes = 60, startHour = 0, hourHeight = 56) {
    const startMinutes = typeof startTime === 'number' ? startTime : timeToMinutes(startTime);
    if (startMinutes === null) {
        return { top: 0, height: hourHeight, isValid: false };
    }

    const gridStartMinutes = startHour * 60;
    const pxPerMinute = hourHeight / 60;
    const safeDuration = Math.max(20, durationMinutes || 60);

    const top = Math.max(0, (startMinutes - gridStartMinutes) * pxPerMinute);
    const height = safeDuration * pxPerMinute;

    return {
        top: Math.round(top * 10) / 10,
        height: Math.round(height * 10) / 10,
        isValid: true
    };
}

/**
 * Detects overlapping time intervals and assigns column layout slots (colIndex and totalCols).
 * @param {Array<object>} events List of items with startMinutes and endMinutes or durationMinutes
 * @returns {Array<object>} Decorated events with colIndex and totalCols
 */
export function calculateEventCollisions(events) {
    if (!events || events.length === 0) return [];

    // Normalize and sort by start time, then duration descending
    const parsed = events.map(e => {
        const start = typeof e.startMinutes === 'number' ? e.startMinutes : (timeToMinutes(e.startTime || e.time) || 0);
        const duration = e.durationMinutes || (e.endMinutes ? (e.endMinutes - start) : 60);
        const end = e.endMinutes || (start + duration);
        return { ...e, _start: start, _end: end };
    }).sort((a, b) => a._start - b._start || (b._end - b._start) - (a._end - a._start));

    // Group overlapping events into clusters
    const clusters = [];
    let currentCluster = [];
    let clusterEnd = -1;

    for (const ev of parsed) {
        if (currentCluster.length === 0) {
            currentCluster.push(ev);
            clusterEnd = ev._end;
        } else if (ev._start < clusterEnd) {
            currentCluster.push(ev);
            clusterEnd = Math.max(clusterEnd, ev._end);
        } else {
            clusters.push(currentCluster);
            currentCluster = [ev];
            clusterEnd = ev._end;
        }
    }
    if (currentCluster.length > 0) {
        clusters.push(currentCluster);
    }

    // Assign column indices within each cluster
    const result = [];
    for (const cluster of clusters) {
        const columns = []; // stores the end time of the last event in each column
        for (const ev of cluster) {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                if (columns[i] <= ev._start) {
                    columns[i] = ev._end;
                    ev.colIndex = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                ev.colIndex = columns.length;
                columns.push(ev._end);
            }
        }

        const totalCols = columns.length;
        for (const ev of cluster) {
            ev.totalCols = totalCols;
            result.push(ev);
        }
    }

    return result;
}

/**
 * Calculates current "Now" indicator offset in pixels.
 * @param {number} startHour 
 * @param {number} hourHeight 
 * @returns {{ offsetPx: number, isVisible: boolean, currentTimeStr: string }}
 */
export function getNowIndicatorPosition(startHour = 0, hourHeight = 56, endHour = 24) {
    const now = new Date();
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const gridStartMinutes = startHour * 60;
    const gridEndMinutes = endHour * 60;
    const pxPerMinute = hourHeight / 60;

    const isVisible = nowMinutes >= gridStartMinutes && nowMinutes <= gridEndMinutes;
    const offsetPx = (nowMinutes - gridStartMinutes) * pxPerMinute;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return {
        offsetPx: Math.round(offsetPx * 10) / 10,
        isVisible,
        currentTimeStr
    };
}

/**
 * Detects historical memories on the same month & day from previous years.
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Array} timelineEvents - array of timeline items
 * @returns {Array<object>}
 */
export function getAnniversaryMemories(dateKey, timelineEvents = []) {
    if (!dateKey || !Array.isArray(timelineEvents) || timelineEvents.length === 0) return [];

    const [curYr, curMo, curDay] = dateKey.split('-').map(Number);
    const moDay = `${String(curMo).padStart(2, '0')}-${String(curDay).padStart(2, '0')}`;

    return timelineEvents.filter(ev => {
        if (!ev.event_date) return false;
        const [evYr, evMo, evDay] = ev.event_date.split('-').map(Number);
        const evMoDay = `${String(evMo).padStart(2, '0')}-${String(evDay).padStart(2, '0')}`;
        return evMoDay === moDay && evYr < curYr;
    }).map(ev => {
        const evYr = parseInt(ev.event_date.split('-')[0], 10);
        const yearsAgo = curYr - evYr;
        return {
            ...ev,
            yearsAgo,
            anniversaryLabel: `Před ${yearsAgo} ${yearsAgo === 1 ? 'rokem' : (yearsAgo < 5 ? 'lety' : 'lety')}`
        };
    });
}

