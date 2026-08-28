/**
 * Recurring Events & Routine Habits Engine for Kiscord Calendar
 * Manages recurring routines (e.g. weekly gym splits) and generates
 * virtual overlay instances for any given week.
 */

import { timeToMinutes } from './time-engine.js';

const STORAGE_KEY = 'kiscord_recurring_events';

/**
 * Returns all saved recurring rules.
 * @returns {Array<object>}
 */
export function getRecurringRules() {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Saves or updates a recurring rule.
 * @param {object} rule { id, title, time, durationMinutes, cat, daysOfWeek: [1, 3, 5], active: true }
 */
export function saveRecurringRule(rule) {
    const rules = getRecurringRules();
    const existingIdx = rules.findIndex(r => r.id === rule.id);

    if (existingIdx >= 0) {
        rules[existingIdx] = rule;
    } else {
        rule.id = rule.id || `rec-${Date.now()}`;
        rule.active = rule.active !== undefined ? rule.active : true;
        rules.push(rule);
    }

    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    }
    return rules;
}

/**
 * Deletes a recurring rule by ID.
 * @param {string} ruleId 
 */
export function deleteRecurringRule(ruleId) {
    let rules = getRecurringRules();
    rules = rules.filter(r => r.id !== ruleId);
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    }
    return rules;
}

/**
 * Expands recurring rules into virtual events for the 7 days of a given week.
 * @param {Array<object>} weekDates 
 * @returns {Map<string, Array<object>>} Map of dateKey -> array of recurring events
 */
export function expandRecurringEventsForWeek(weekDates) {
    const map = new Map();
    const rules = getRecurringRules().filter(r => r.active !== false);
    if (rules.length === 0 || !weekDates) return map;

    weekDates.forEach(day => {
        const dayEvents = [];
        const dayOfWeekNum = day.dayOfWeek; // 1 = Mon, ..., 7 = Sun (or 0)

        rules.forEach(rule => {
            const matchesDay = (rule.daysOfWeek || []).includes(dayOfWeekNum) || 
                               (dayOfWeekNum === 7 && (rule.daysOfWeek || []).includes(0));

            if (matchesDay) {
                const startMin = timeToMinutes(rule.time || '17:00');
                if (startMin !== null) {
                    dayEvents.push({
                        id: `${rule.id}-${day.dateKey}`,
                        type: rule.cat || 'gym',
                        title: rule.title || 'Pravidelná aktivita',
                        cat: rule.cat || 'gym',
                        startTime: rule.time || '17:00',
                        startMinutes: startMin,
                        durationMinutes: rule.durationMinutes || 60,
                        isRecurring: true,
                        raw: rule
                    });
                }
            }
        });

        if (dayEvents.length > 0) {
            map.set(day.dateKey, dayEvents);
        }
    });

    return map;
}
