/**
 * Natural Language Parser & Conflict Detector for Kiscord Calendar
 * Intelligently parses Czech date/time expressions and detects schedule conflicts.
 */

import { state } from '@core/state.js';
import { formatDateKey, parseDateKey, timeToMinutes, minutesToTime } from './time-engine.js';

export const CZECH_DAY_MAP = {
    'po': 1, 'pondeli': 1, 'pondělí': 1,
    'ut': 2, 'utery': 2, 'úterý': 2,
    'st': 3, 'streda': 3, 'středa': 3,
    'ct': 4, 'ctvrtek': 4, 'čtvrtek': 4,
    'pa': 5, 'patek': 5, 'pátek': 5,
    'so': 6, 'sobota': 6,
    'ne': 0, 'nedele': 0, 'neděle': 0
};

/**
 * Parses free-form Czech text to extract event title, date, time, category and duration.
 * Examples:
 * - "Zítra v 17:00 Push Day" -> { dateKey: tomorrow, time: '17:00', cat: 'gym', title: 'Push Day' }
 * - "Pátek 19:30 Večeře s Klárkou" -> { dateKey: next friday, time: '19:30', cat: 'food', title: 'Večeře s Klárkou' }
 * - "Středa 14:00 Projekt WIS" -> { dateKey: next wednesday, time: '14:00', cat: 'fit', title: 'Projekt WIS' }
 * 
 * @param {string} text 
 * @param {Date} referenceDate 
 * @returns {{ title: string, dateKey: string, time: string, cat: string, durationMinutes: number }}
 */
export function parseNaturalLanguageEvent(text, referenceDate = new Date()) {
    if (!text || typeof text !== 'string') {
        return {
            title: 'Nová událost',
            dateKey: formatDateKey(referenceDate),
            time: '12:00',
            cat: 'date',
            durationMinutes: 60
        };
    }

    let raw = text.trim();
    let lower = raw.toLowerCase();
    let targetDate = new Date(referenceDate.getTime());
    let extractedTime = '12:00';
    let durationMinutes = 60;
    let category = 'date';

    // 1. Check relative date keywords (dnes, zítra, pozítří)
    if (lower.includes('pozítří') || lower.includes('pozitri')) {
        targetDate.setDate(targetDate.getDate() + 2);
        lower = lower.replace(/pozítří|pozitri/g, '');
        raw = raw.replace(/pozítří|pozitri/gi, '');
    } else if (lower.includes('zítra') || lower.includes('zitra')) {
        targetDate.setDate(targetDate.getDate() + 1);
        lower = lower.replace(/zítra|zitra/g, '');
        raw = raw.replace(/zítra|zitra/gi, '');
    } else if (lower.includes('dnes')) {
        lower = lower.replace(/dnes/g, '');
        raw = raw.replace(/dnes/gi, '');
    } else {
        // Check day of week names (pondělí..neděle)
        for (const [name, targetDayNum] of Object.entries(CZECH_DAY_MAP)) {
            const regex = new RegExp(`\\b(v\\s+)?${name}\\b`, 'i');
            if (regex.test(lower)) {
                const currentDayNum = targetDate.getDay();
                let diff = targetDayNum - currentDayNum;
                if (diff <= 0) diff += 7; // Next occurrence
                targetDate.setDate(targetDate.getDate() + diff);
                lower = lower.replace(regex, '');
                raw = raw.replace(regex, '');
                break;
            }
        }
    }

    // 2. Check explicit date format (e.g., 25.8., 25. 8., 2026-08-25)
    const dateMatch = lower.match(/\b(\d{1,2})\.\s*(\d{1,2})\.?(\s*\d{4})?\b/);
    if (dateMatch) {
        const d = parseInt(dateMatch[1], 10);
        const m = parseInt(dateMatch[2], 10) - 1;
        const y = dateMatch[3] ? parseInt(dateMatch[3].trim(), 10) : targetDate.getFullYear();
        targetDate = new Date(y, m, d);
        lower = lower.replace(dateMatch[0], '');
        raw = raw.replace(dateMatch[0], '');
    }

    // 3. Extract time (e.g. "v 17:30", "17:30", "17h", "17 hod", "v 5 odpoledne")
    const timeMatch24 = lower.match(/\b(?:v\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
    const timeMatchHourOnly = lower.match(/\b(?:v\s+)?([01]?\d|2[0-3])\s*(?:h|hod|hodin)\b/);
    const timeMatchPm = lower.match(/\b(?:v\s+)?([1-9]|1[0-2])\s*(?:odpoledne|vecer|večer)\b/);

    if (timeMatch24) {
        extractedTime = `${String(timeMatch24[1]).padStart(2, '0')}:${String(timeMatch24[2]).padStart(2, '0')}`;
        lower = lower.replace(timeMatch24[0], '');
        raw = raw.replace(new RegExp(timeMatch24[0], 'i'), '');
    } else if (timeMatchHourOnly) {
        extractedTime = `${String(timeMatchHourOnly[1]).padStart(2, '0')}:00`;
        lower = lower.replace(timeMatchHourOnly[0], '');
        raw = raw.replace(new RegExp(timeMatchHourOnly[0], 'i'), '');
    } else if (timeMatchPm) {
        const hour = parseInt(timeMatchPm[1], 10) + (parseInt(timeMatchPm[1], 10) < 12 ? 12 : 0);
        extractedTime = `${String(hour).padStart(2, '0')}:00`;
        lower = lower.replace(timeMatchPm[0], '');
        raw = raw.replace(new RegExp(timeMatchPm[0], 'i'), '');
    }

    // 4. Extract Category
    if (/gym|posilovna|trénink|trenink|push|pull|legs|nohy|bench|ramena|záda|zada|biceps|triceps/i.test(lower)) {
        category = 'gym';
    } else if (/večeře|vecere|obed|oběd|pizza|burger|restaurace|jidlo|jídlo|kava|káva|kafe/i.test(lower)) {
        category = 'food';
    } else if (/kino|film|serial|seriál|netflix/i.test(lower)) {
        category = 'movie';
    } else if (/procházka|prochazka|vylet|výlet|hory|les/i.test(lower)) {
        category = 'walk';
    } else if (/fit|vut|wis|ius|ifj|ial|inp|zkouska|zkouška|cviceni|cvičení|prednaska|přednáška|projekt/i.test(lower)) {
        category = 'fit';
    }

    // Clean title from extra punctuation and whitespace while preserving phrases like "s Klárkou"
    let cleanTitle = raw
        .replace(/^[\s,.:;—–-]+|[\s,.:;—–-]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleanTitle) {
        cleanTitle = category === 'gym' ? 'Trénink v posilovně' :
                     category === 'food' ? 'Společné jídlo' :
                     category === 'movie' ? 'Kino / Film' :
                     category === 'fit' ? 'FIT Studium' : 'Nová událost';
    }

    // Format final title with emoji prefix if gym
    if (category === 'gym' && !cleanTitle.includes('🏋️')) {
        cleanTitle = `🏋️‍♂️ ${cleanTitle}`;
    }

    return {
        title: cleanTitle,
        dateKey: formatDateKey(targetDate),
        time: extractedTime,
        cat: category,
        durationMinutes
    };
}

/**
 * Checks for schedule overlaps on a given date and time range.
 * @param {string} targetDateKey "YYYY-MM-DD"
 * @param {string} startTime "HH:MM"
 * @param {number} durationMinutes Duration in minutes
 * @returns {{ hasConflict: boolean, conflictingEvents: Array<object> }}
 */
export function detectScheduleConflicts(targetDateKey, startTime, durationMinutes = 60) {
    const startMin = timeToMinutes(startTime);
    if (startMin === null) return { hasConflict: false, conflictingEvents: [] };

    const endMin = startMin + durationMinutes;
    const targetDate = parseDateKey(targetDateKey);
    const dayOfWeek = targetDate.getDay();
    const conflicts = [];

    // 1. Check FIT classes for this day of week (Monday=1..Friday=5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const scheduleForDay = (state.scheduleItems || []).filter(s => s.day_of_week === dayOfWeek);
        scheduleForDay.forEach(sub => {
            const subStart = timeToMinutes(sub.time_start);
            const subEnd = timeToMinutes(sub.time_end);
            if (subStart !== null && subEnd !== null) {
                // Overlap condition: startA < endB and endA > startB
                if (startMin < subEnd && endMin > subStart) {
                    conflicts.push({
                        title: `[${sub.subject_code || 'FIT'}] ${sub.name || 'Výuka'}`,
                        time: `${sub.time_start} - ${sub.time_end}`,
                        room: sub.room,
                        type: 'fit'
                    });
                }
            }
        });
    }

    // 2. Check existing planned dates
    const existingPlan = (state.plannedDates || {})[targetDateKey];
    if (existingPlan && existingPlan.time) {
        const planStart = timeToMinutes(existingPlan.time);
        const planEnd = planStart !== null ? (planStart + 90) : null;
        if (planStart !== null && planEnd !== null) {
            if (startMin < planEnd && endMin > planStart) {
                conflicts.push({
                    title: existingPlan.name,
                    time: existingPlan.time,
                    type: 'date'
                });
            }
        }
    }

    // 3. Check existing gym workouts
    const dayGymLogs = (state.gymLogs || []).filter(l => l.date_key === targetDateKey);
    dayGymLogs.forEach(l => {
        let gymStart = 16 * 60;
        if (l.created_at) {
            try {
                const cd = new Date(l.created_at);
                if (!isNaN(cd.getTime())) gymStart = (cd.getHours() * 60) + cd.getMinutes();
            } catch {}
        }
        const gymEnd = gymStart + Math.round((l.duration_seconds || 3600) / 60);
        if (startMin < gymEnd && endMin > gymStart) {
            conflicts.push({
                title: l.name || 'Posilovna',
                time: `${minutesToTime(gymStart)}`,
                type: 'gym'
            });
        }
    });

    return {
        hasConflict: conflicts.length > 0,
        conflictingEvents: conflicts
    };
}

/**
 * Romantic Gap Finder AI
 * Scans the current week to find optimal, conflict-free windows for romantic dates.
 * 
 * @param {Array<object>} weekDates 
 * @param {number} minDurationMinutes 
 * @returns {Array<object>}
 */
export function findBestRomanticGaps(weekDates = [], minDurationMinutes = 90) {
    if (!weekDates || weekDates.length === 0) return [];

    const gaps = [];
    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

    weekDates.forEach((dayObj, dayIdx) => {
        const dateKey = typeof dayObj === 'string' ? dayObj : dayObj.dateKey;
        const targetDate = parseDateKey(dateKey);
        const dayOfWeek = targetDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Window of interest: Weekend 13:00-22:30 (780..1350), Weekday 16:30-22:30 (990..1350)
        const windowStart = isWeekend ? 13 * 60 : 16 * 60 + 30;
        const windowEnd = 22 * 60 + 30;

        const busyIntervals = [];

        // 1. FIT Schedule items
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const schedule = (state.scheduleItems || []).filter(s => s.day_of_week === dayOfWeek);
            schedule.forEach(s => {
                const start = timeToMinutes(s.time_start);
                const end = timeToMinutes(s.time_end);
                if (start !== null && end !== null) {
                    busyIntervals.push({ start, end });
                }
            });
        }

        // 2. Deadlines on that day (block 1 hour before)
        const dayDeadlines = (state.schoolDeadlines || []).filter(d => d.deadline_date === dateKey && !d.is_completed);
        dayDeadlines.forEach(dl => {
            if (dl.deadline_time) {
                const dlMin = timeToMinutes(dl.deadline_time);
                if (dlMin !== null) {
                    busyIntervals.push({ start: Math.max(0, dlMin - 60), end: dlMin + 15 });
                }
            }
        });

        // 3. Gym logs / workouts
        const dayGym = (state.gymLogs || []).filter(l => l.date_key === dateKey);
        dayGym.forEach(l => {
            let start = 16 * 60;
            if (l.created_at) {
                try {
                    const cd = new Date(l.created_at);
                    if (!isNaN(cd.getTime())) start = (cd.getHours() * 60) + cd.getMinutes();
                } catch {}
            }
            const dur = Math.round((l.duration_seconds || 3600) / 60);
            busyIntervals.push({ start, end: start + dur });
        });

        // 4. Existing planned date
        const existingPlan = (state.plannedDates || {})[dateKey];
        if (existingPlan && existingPlan.time) {
            const pStart = timeToMinutes(existingPlan.time);
            if (pStart !== null) {
                busyIntervals.push({ start: pStart, end: pStart + (existingPlan.durationMinutes || 90) });
            }
        }

        // Sort and merge overlapping busy intervals
        busyIntervals.sort((a, b) => a.start - b.start);
        const mergedBusy = [];
        busyIntervals.forEach(curr => {
            if (mergedBusy.length === 0) {
                mergedBusy.push({ ...curr });
            } else {
                const prev = mergedBusy[mergedBusy.length - 1];
                if (curr.start <= prev.end) {
                    prev.end = Math.max(prev.end, curr.end);
                } else {
                    mergedBusy.push({ ...curr });
                }
            }
        });

        // Find free intervals in [windowStart, windowEnd]
        let curTime = windowStart;
        mergedBusy.forEach(busy => {
            if (busy.end <= windowStart || busy.start >= windowEnd) return;
            if (busy.start > curTime) {
                const freeDur = busy.start - curTime;
                if (freeDur >= minDurationMinutes) {
                    gaps.push(createGapOption(dateKey, curTime, busy.start, dayOfWeek, dayNames[dayOfWeek], isWeekend, dayIdx));
                }
            }
            curTime = Math.max(curTime, busy.end);
        });

        if (windowEnd > curTime) {
            const freeDur = windowEnd - curTime;
            if (freeDur >= minDurationMinutes) {
                gaps.push(createGapOption(dateKey, curTime, windowEnd, dayOfWeek, dayNames[dayOfWeek], isWeekend, dayIdx));
            }
        }
    });

    // Sort gaps by score descending
    gaps.sort((a, b) => b.score - a.score);
    return gaps.slice(0, 4);
}

function createGapOption(dateKey, startMin, endMin, dayOfWeek, dayName, isWeekend, dayIdx) {
    const dur = endMin - startMin;
    const startTimeStr = minutesToTime(startMin);
    const endTimeStr = minutesToTime(endMin);

    // Score calculation
    let score = 50;
    if (dayOfWeek === 5) score += 35; // Friday night bonus!
    if (dayOfWeek === 6) score += 30; // Saturday night bonus!
    if (dayOfWeek === 0) score += 20; // Sunday evening bonus
    if (dur >= 180) score += 15; // Long window bonus
    if (startMin >= 17 * 60 && startMin <= 19 * 60) score += 20; // Prime dinner start time
    if (dayIdx >= 0 && dayIdx <= 2) score += 5; // Near future bonus

    const [y, m, d] = dateKey.split('-').map(Number);
    const label = `${dayName} ${d}.${m}.`;

    return {
        dateKey,
        dayOfWeek,
        dayName,
        label,
        startTime: startTimeStr,
        endTime: endTimeStr,
        durationMinutes: dur,
        durationFormatted: `${Math.floor(dur / 60)}h ${dur % 60 > 0 ? `${dur % 60}m` : ''}`,
        score,
        isWeekend
    };
}

/**
 * Opens Romantic Gap Finder Modal in the UI.
 */
export function showGapFinderModal() {
    import('./state.js').then(({ getAnchorDate }) => {
        import('./time-engine.js').then(({ getWeekDates }) => {
            const anchor = getAnchorDate();
            const weekDates = getWeekDates(anchor);
            const gaps = findBestRomanticGaps(weekDates);

            document.getElementById('cal-gap-modal')?.remove();

            const modal = document.createElement('div');
            modal.id = 'cal-gap-modal';
            modal.className = 'fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in';

            let gapsListHtml = '';
            if (gaps.length > 0) {
                gapsListHtml = gaps.map(g => `
                    <div class="cal-gap-card p-4 rounded-2xl bg-[#202225] border border-pink-500/30 hover:border-pink-500 flex items-center justify-between gap-4 transition cursor-pointer"
                         onclick="Calendar.bookRomanticGap('${g.dateKey}', '${g.startTime}', ${g.durationMinutes})">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center justify-center text-lg">
                                ${g.isWeekend ? '🥂' : '❤️'}
                            </div>
                            <div>
                                <div class="text-sm font-extrabold text-white flex items-center gap-2">
                                    <span>${g.label}</span>
                                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">Volno ${g.durationFormatted}</span>
                                </div>
                                <div class="text-xs font-mono text-pink-200/80 mt-0.5">
                                    ${g.startTime} – ${g.endTime}
                                </div>
                            </div>
                        </div>
                        <button type="button" 
                                class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-black shadow-md transition flex items-center gap-1.5">
                            <span>Naplánovat</span>
                            <i class="fas fa-arrow-right text-[10px]"></i>
                        </button>
                    </div>
                `).join('');
            } else {
                gapsListHtml = `
                    <div class="text-center py-8 text-gray-400 text-sm">
                        <div class="text-3xl mb-2">🗓️</div>
                        Tento týden je plně zaplněný. Zkus přepnout na další týden!
                    </div>
                `;
            }

            modal.innerHTML = `
                <div class="bg-[#2f3136] border border-white/10 rounded-3xl p-6 shadow-2xl w-full max-w-lg text-white">
                    <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center text-sm">
                                <i class="fas fa-heart text-pink-400 animate-pulse"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black uppercase tracking-wider text-white">Smart Romantic Gap Finder</h3>
                                <p class="text-[10px] text-gray-400">Nejlepší volná okna pro společný čas a rande bez kolizí</p>
                            </div>
                        </div>
                        <button onclick="document.getElementById('cal-gap-modal')?.remove()" class="text-gray-400 hover:text-white transition p-1 text-sm">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="space-y-2.5 mb-4">
                        ${gapsListHtml}
                    </div>

                    <div class="text-center">
                        <button onclick="document.getElementById('cal-gap-modal')?.remove()" class="text-xs text-gray-400 hover:text-gray-200 transition">
                            Zavřít
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        });
    });
}

/**
 * 1-Click books a romantic gap into state.plannedDates.
 */
export async function bookRomanticGap(dateKey, timeStr, durationMinutes = 90, planName = 'Romantické rande ❤️') {
    state.plannedDates = state.plannedDates || {};
    state.plannedDates[dateKey] = {
        name: planName,
        cat: 'date',
        time: timeStr,
        durationMinutes: Math.min(180, durationMinutes),
        checklist: [
            { text: 'Vybrat místo / restauraci', done: false },
            { text: 'Potvrdit čas s Klárkou', done: false }
        ]
    };

    document.getElementById('cal-gap-modal')?.remove();

    const { triggerHaptic } = await import('@core/utils.js');
    const { playSuccessChime } = await import('@core/sound.js');
    triggerHaptic('heavy');
    playSuccessChime();

    // Persist to Supabase in background
    const { supabase } = await import('@core/supabase.js');
    try {
        await supabase.from('planned_dates').upsert({
            date_key: dateKey,
            name: planName,
            cat: 'date',
            time: timeStr,
            duration_minutes: durationMinutes,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('[Calendar] Gap booking notice:', e);
    }

    // Refresh UI
    const { renderCalendar } = await import('./index.js');
    renderCalendar();
}

