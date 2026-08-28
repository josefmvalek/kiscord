/**
 * Session State & Date Pointer for Kiscord Calendar
 * Manages active view mode ('week' | 'month'), anchor dates and modal pointers.
 */

import { formatDateKey, parseDateKey, getMondayOfWeek } from './time-engine.js';

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let currentModalDateKey = null;

// Initialize view mode with localStorage fallback (default to 'week' for modern operational UX)
let currentViewMode = 'week';
try {
    const saved = localStorage.getItem('kiscord_cal_view_mode');
    if (saved === 'month' || saved === 'week' || saved === 'agenda') {
        currentViewMode = saved;
    }
} catch {
    currentViewMode = 'week';
}

let currentAnchorDate = new Date();

export function getViewMode() {
    return currentViewMode;
}

export function setViewMode(mode) {
    if (mode === 'month' || mode === 'week' || mode === 'agenda') {
        currentViewMode = mode;
        try {
            localStorage.setItem('kiscord_cal_view_mode', mode);
        } catch {}
    }
}

export function getAnchorDate() {
    return new Date(currentAnchorDate.getTime());
}

export function setAnchorDate(dateInput) {
    const d = typeof dateInput === 'string' ? parseDateKey(dateInput) : new Date(dateInput);
    if (!isNaN(d.getTime())) {
        currentAnchorDate = d;
        currentCalYear = d.getFullYear();
        currentCalMonth = d.getMonth();
    }
}

export function jumpToToday() {
    const now = new Date();
    currentAnchorDate = now;
    currentCalYear = now.getFullYear();
    currentCalMonth = now.getMonth();
    return {
        date: now,
        dateKey: formatDateKey(now),
        year: currentCalYear,
        month: currentCalMonth
    };
}

/**
 * Navigates forward (+1) or backward (-1) by 1 period (week, agenda, or month based on viewMode).
 * @param {number} delta +1 or -1
 * @returns {object} { year, month, anchorDate }
 */
export function navigatePeriod(delta = 1) {
    if (currentViewMode === 'week' || currentViewMode === 'agenda') {
        const monday = getMondayOfWeek(currentAnchorDate);
        const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + (delta * 7));
        currentAnchorDate = nextMonday;
        currentCalYear = nextMonday.getFullYear();
        currentCalMonth = nextMonday.getMonth();
    } else {
        let yr = currentCalYear;
        let mo = currentCalMonth + delta;
        if (mo < 0) { mo = 11; yr--; }
        else if (mo > 11) { mo = 0; yr++; }
        currentCalYear = yr;
        currentCalMonth = mo;
        currentAnchorDate = new Date(yr, mo, 1);
    }

    return {
        year: currentCalYear,
        month: currentCalMonth,
        anchorDate: new Date(currentAnchorDate.getTime())
    };
}

let currentNavAnimation = 'cal-anim-view-switch';

export function getNavAnimation() {
    const anim = currentNavAnimation;
    currentNavAnimation = ''; // reset after consume
    return anim;
}

export function setNavAnimation(anim) {
    currentNavAnimation = anim;
}

export function getCurrentModalDateKey() {
    return currentModalDateKey;
}

export function setCurrentModalDateKey(dateKey) {
    currentModalDateKey = dateKey;
}

export function getCalSession() {
    return {
        year: currentCalYear,
        month: currentCalMonth,
        viewMode: currentViewMode,
        anchorDate: currentAnchorDate
    };
}

export function setCalSession(year, month) {
    if (typeof year === 'number' && !isNaN(year)) currentCalYear = year;
    if (typeof month === 'number' && !isNaN(month)) {
        currentCalMonth = month;
        currentAnchorDate = new Date(currentCalYear, currentCalMonth, 1);
    }
}
