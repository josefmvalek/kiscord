/**
 * Session State & Date Pointer for Kiscord Calendar
 */

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let currentModalDateKey = null;

export function getCurrentModalDateKey() {
    return currentModalDateKey;
}

export function setCurrentModalDateKey(dateKey) {
    currentModalDateKey = dateKey;
}

export function getCalSession() {
    return {
        year: currentCalYear,
        month: currentCalMonth
    };
}

export function setCalSession(year, month) {
    if (typeof year === 'number' && !isNaN(year)) currentCalYear = year;
    if (typeof month === 'number' && !isNaN(month)) currentCalMonth = month;
}
