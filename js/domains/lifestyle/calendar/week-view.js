/**
 * Week View Generator for Kiscord Calendar
 * Renders an hourly time-grid (07:00 – 23:00) with All-Day summary strip,
 * live "Now" indicator, domain event cards, sleep bands, resize handles, and interactive popovers.
 */

import { state } from '@core/state.js';
import { 
    getWeekDates, 
    getNowIndicatorPosition, 
    calculateEventCoordinates, 
    calculateEventCollisions,
    timeToMinutes
} from './time-engine.js';
import { getMoodColor } from './month-view.js';
import { expandRecurringEventsForWeek } from './recurring-events.js';
import { getWeatherForDate } from './weather.js';
import { renderDateCountdownBanner } from './partner-radar.js';
import { findBestRomanticGaps } from './nlp-quick-add.js';
import { getActiveSplitForDay } from '@domains/fitness/gym/splits.js';

export const START_HOUR = 0;
export const END_HOUR = 23;
export const HOUR_HEIGHT = 56; // px per hour

/**
 * Generates the full week view HTML.
 * @param {Date|string} anchorDate 
 * @returns {string}
 */
export function generateWeekView(anchorDate) {
    const weekDates = getWeekDates(anchorDate);
    const nowPos = getNowIndicatorPosition(START_HOUR, HOUR_HEIGHT, END_HOUR);
    const activeFilter = state.calendarFilter || 'all';

    // Pre-calculate data lookups for fast rendering
    const gymLogsByDate = new Map();
    (state.gymLogs || []).forEach(log => {
        if (!log.date_key) return;
        if (!gymLogsByDate.has(log.date_key)) gymLogsByDate.set(log.date_key, []);
        gymLogsByDate.get(log.date_key).push(log);
    });

    const deadlinesByDate = new Map();
    (state.schoolDeadlines || []).forEach(dl => {
        if (!dl.deadline_date) return;
        if (!deadlinesByDate.has(dl.deadline_date)) deadlinesByDate.set(dl.deadline_date, []);
        deadlinesByDate.get(dl.deadline_date).push(dl);
    });

    const recurringEventsByDate = expandRecurringEventsForWeek(weekDates);

    // Compute Romantic Gaps for ambient in-grid suggestions
    const romanticGaps = (activeFilter === 'all' || activeFilter === 'health') ? findBestRomanticGaps(weekDates) : [];
    const romanticGapsByDate = new Map();
    romanticGaps.forEach(gap => {
        if (!romanticGapsByDate.has(gap.dateKey)) romanticGapsByDate.set(gap.dateKey, []);
        romanticGapsByDate.get(gap.dateKey).push(gap);
    });

    // Hours array for time gutter (0..23)
    const hours = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
        hours.push(h);
    }

    return `
        <div class="cal-week-container flex flex-col h-full bg-[#36393f] overflow-hidden select-none">
            <!-- SHARED DATE COUNTDOWN BANNER (if next date planned) -->
            ${renderDateCountdownBanner()}

            <!-- ALL-DAY & DAILY SUMMARY STRIP -->
            <div class="cal-allday-strip bg-[#2f3136] border-b border-[#202225] flex-shrink-0 z-20 shadow-sm">
                <div class="flex max-w-6xl mx-auto w-full">
                    <!-- Gutter spacing with Daily Briefing & Romantic Gap Finder trigger -->
                    <div class="w-12 md:w-16 flex-shrink-0 border-r border-[#202225] flex flex-col items-center justify-center p-1 gap-1">
                        <button onclick="Calendar.showDailyBriefingModal()" 
                                title="Otevřít dnešní ranní přehled (Briefing) & Discord"
                                class="w-full py-1 px-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[8px] font-black transition flex flex-col items-center justify-center gap-0.5 shadow-sm active:scale-95">
                            <i class="fas fa-sun text-amber-400 text-xs animate-pulse"></i>
                            <span class="leading-tight text-[7.5px] uppercase tracking-wider font-extrabold">Dnes</span>
                        </button>
                        <button onclick="Calendar.showGapFinderModal()" 
                                title="Najít nejlepší volný čas pro rande (Smart Romantic Gap Finder)"
                                class="w-full py-1 px-0.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-[8px] font-black transition flex flex-col items-center justify-center gap-0.5 shadow-sm active:scale-95">
                            <i class="fas fa-heart text-pink-400 text-xs animate-bounce"></i>
                            <span class="leading-tight text-[7.5px] uppercase tracking-wider font-extrabold">Rande</span>
                        </button>
                    </div>

                    <!-- 7 Day Header Columns -->
                    <div class="flex-1 grid grid-cols-7 divide-x divide-[#202225]">
                        ${weekDates.map(day => renderDaySummaryHeader(day, gymLogsByDate, deadlinesByDate, activeFilter)).join('')}
                    </div>
                </div>
            </div>

            <!-- SCROLLABLE TIME-GRID (00:00 - 23:00) with Nightscape Backdrop -->
            <div id="cal-time-grid-scroll" class="cal-time-grid-scroll flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative" style="overscroll-behavior-y: contain; overscroll-behavior: contain;">
                <div class="flex max-w-6xl mx-auto w-full min-h-[${hours.length * HOUR_HEIGHT}px] relative">
                    <!-- Nightscape Ambient Lighting (Cosmic Indigo -> Crisp Graphite -> Sunset Dusk) -->
                    <div class="cal-nightscape-backdrop absolute inset-0 pointer-events-none z-0"
                         style="background: linear-gradient(180deg, rgba(15, 15, 26, 0.7) 0%, rgba(20, 22, 34, 0.3) 25%, rgba(32, 34, 45, 0.05) 45%, rgba(32, 34, 45, 0.05) 75%, rgba(37, 28, 48, 0.25) 100%);">
                    </div>

                    <!-- TIME GUTTER -->
                    <div class="cal-time-gutter w-12 md:w-16 flex-shrink-0 border-r border-[#202225] bg-[#2f3136]/60 backdrop-blur-sm select-none z-10">
                        ${hours.map(h => `
                            <div class="h-[56px] border-b border-transparent flex items-start justify-end pr-1.5 pt-1 text-[9px] md:text-xs font-mono font-medium text-gray-400">
                                <span>${String(h).padStart(2, '0')}:00</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- 7 DAY COLUMNS WITH TIME SLOTS & EVENT CARDS -->
                    <div class="flex-1 grid grid-cols-7 divide-x divide-[#202225] relative bg-transparent z-10">
                        <!-- Background Horizontal Grid Lines -->
                        <div class="absolute inset-0 pointer-events-none flex flex-col z-0">
                            ${hours.map(() => `
                                <div class="h-[56px] border-b border-white/[0.04] w-full"></div>
                            `).join('')}
                        </div>

                        <!-- Day Column Content -->
                        ${weekDates.map(day => renderDayTimeColumn(day, nowPos, gymLogsByDate, deadlinesByDate, activeFilter, recurringEventsByDate, romanticGapsByDate)).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the top sticky header column for a single day.
 */
function renderDaySummaryHeader(day, gymLogsByDate, deadlinesByDate, activeFilter) {
    const health = (state.healthData || {})[day.dateKey] || {};
    const plannedDate = (state.plannedDates || {})[day.dateKey];
    const deadlines = deadlinesByDate.get(day.dateKey) || [];
    const uncompletedDeadlines = deadlines.filter(d => !d.is_completed);
    const weather = getWeatherForDate(day.dateKey);

    const hasUntimedPlan = plannedDate && !plannedDate.time;
    const moodColor = health.mood_score ? getMoodColor(health.mood_score) : null;

    let isHighlighted = day.isToday;
    if (activeFilter === 'water' && health.water_count >= 8) isHighlighted = true;
    if (activeFilter === 'sleep' && health.sleep_hours >= 7.5) isHighlighted = true;
    if (activeFilter === 'health' && health.mood_score >= 8) isHighlighted = true;

    const isTodayClass = day.isToday
        ? 'bg-[#5865F2]/15 border-b-2 border-b-[#5865F2]'
        : isHighlighted
        ? 'bg-white/[0.04]'
        : 'hover:bg-white/[0.02]';

    // Minimalist Vitality Dots for header
    let vitalityDots = '';
    if (health.water_count) {
        const w = parseInt(health.water_count, 10);
        if (w > 0) vitalityDots += `<span class="cal-vitality-dot cal-vitality-dot-water ${w >= 8 ? 'scale-110 shadow-[0_0_5px_#00e5ff]' : 'opacity-70'}" title="💧${w} Voda: ${w}/8"></span>`;
    }
    if (health.sleep_hours) {
        const s = parseFloat(health.sleep_hours);
        if (s > 0) vitalityDots += `<span class="cal-vitality-dot cal-vitality-dot-sleep ${s >= 7.5 ? 'scale-110 shadow-[0_0_5px_#a855f7]' : 'opacity-70'}" title="😴${s} Spánek: ${s}h"></span>`;
    }
    if (health.mood_score) {
        const m = parseInt(health.mood_score, 10);
        if (m > 0) {
            const mc = getMoodColor(m);
            vitalityDots += `<span class="cal-vitality-dot cal-vitality-dot-mood" style="background-color: ${mc}; box-shadow: 0 0 4px ${mc};" title="Nálada: ${m}/10"></span>`;
        }
    }
    if (health.pills || health.iron || health.zinc || health.magnesium) {
        vitalityDots += `<span class="text-[6.5px] leading-none opacity-80" title="Vitamíny">💊</span>`;
    }

    // Hero Untimed Badge or Split Badge (Max 1)
    let heroUntimedBadge = '';
    const dayGym = gymLogsByDate.get(day.dateKey) || [];
    const splitForDay = getActiveSplitForDay(day.dateKey);

    if (dayGym.length > 0 && (activeFilter === 'all' || activeFilter === 'gym')) {
        heroUntimedBadge = `
            <div class="w-full mt-0.5 px-1 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[7.5px] truncate font-black shadow-sm flex items-center justify-center gap-0.5" title="Odcvičeno: ${dayGym[0].name}">
                <span>💪</span> <span class="truncate">${dayGym[0].name}</span>
            </div>
        `;
    } else if (hasUntimedPlan && (activeFilter === 'all' || activeFilter === 'health')) {
        heroUntimedBadge = `
            <div class="w-full mt-0.5 px-1 py-0.5 rounded-lg bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[7.5px] truncate font-bold shadow-sm" title="${plannedDate.name}">
                ❤️ ${plannedDate.name}
            </div>
        `;
    } else if (uncompletedDeadlines.length > 0 && (activeFilter === 'all' || activeFilter === 'fit')) {
        heroUntimedBadge = `
            <div class="w-full mt-0.5 px-1 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[7.5px] truncate font-black shadow-sm" title="Deadline: ${uncompletedDeadlines.map(d => d.title).join(', ')}">
                🔥 ${uncompletedDeadlines[0].subject_code || 'DL'}
            </div>
        `;
    } else if (splitForDay && (activeFilter === 'all' || activeFilter === 'gym')) {
        if (!splitForDay.isRest) {
            heroUntimedBadge = `
                <div class="w-full mt-0.5 px-1 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[7.5px] truncate font-black shadow-sm flex items-center justify-center gap-0.5" title="Doporučený split: ${splitForDay.splitName}">
                    <span>⚡</span> <span class="truncate">${splitForDay.splitName}</span>
                </div>
            `;
        } else if (activeFilter === 'gym') {
            heroUntimedBadge = `
                <div class="w-full mt-0.5 px-1 py-0.5 rounded-lg bg-blue-500/10 text-blue-300/80 border border-blue-500/20 text-[7px] truncate font-bold" title="Rest Day">
                    🛌 Volno
                </div>
            `;
        }
    }


    return `
        <div class="p-1 md:p-1.5 flex flex-col items-center justify-between min-h-[64px] md:min-h-[72px] transition cursor-pointer text-center ${isTodayClass}"
             onclick="Calendar.showDayDetail('${day.dateKey}')"
             title="${day.dayNameFull} ${day.dayNumber}. ${day.monthNumber}. — ${weather.condition} (${weather.temp})">
            
            <!-- Row 1: Day Name -->
            <span class="text-[9px] md:text-[10px] font-black uppercase tracking-wider ${day.isToday ? 'text-[#5865F2]' : 'text-gray-400'}">
                ${day.dayName}
            </span>

            <!-- Row 2: Day Number Badge -->
            <span class="w-5 h-5 md:w-6 md:h-6 my-0.5 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black transition ${
                day.isToday 
                    ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/40 scale-105' 
                    : 'text-gray-200'
            }">
                ${day.dayNumber}
            </span>

            <!-- Row 3: Weather (Under day name and number) -->
            <div class="text-[8px] md:text-[9px] text-gray-400 opacity-90 flex items-center justify-center gap-0.5" title="${weather.condition}: ${weather.temp}">
                <span>${weather.icon}</span>
                <span class="font-mono text-[7px] md:text-[8px]">${weather.temp}</span>
            </div>

            <!-- Row 4: Vitality Dots -->
            <div class="flex items-center justify-center gap-1 mt-0.5 h-2">
                <div class="cal-vitality-dots scale-90">
                    ${vitalityDots}
                </div>
            </div>

            <!-- Untimed plans or urgent deadlines -->
            ${heroUntimedBadge}
        </div>
    `;
}

/**
 * Renders the hourly time column for a single day with all time-based events.
 */
function renderDayTimeColumn(day, nowPos, gymLogsByDate, deadlinesByDate, activeFilter, recurringEventsByDate = null, romanticGapsByDate = null) {
    const rawEvents = [];
    const health = (state.healthData || {})[day.dateKey] || {};

    // 1. Sleep Interval Band (Dreamscape Hypnogram)
    let sleepBandHtml = '';
    if ((activeFilter === 'sleep' || activeFilter === 'all') && health.sleep_hours) {
        const sleepHours = parseFloat(health.sleep_hours) || 8;
        const wakeMinutes = 8 * 60; // 08:00
        const sleepMinutes = Math.min(sleepHours * 60, (wakeMinutes - (START_HOUR * 60)));
        if (sleepMinutes > 0) {
            const height = (sleepMinutes / 60) * HOUR_HEIGHT;
            const isOptimal = sleepHours >= 7.5;
            sleepBandHtml = `
                <div class="cal-sleep-band cal-sleep-hypnogram absolute top-0 left-0 right-0 z-0 pointer-events-none p-1.5 flex items-end justify-between"
                     style="height: ${height}px;">
                    <span class="text-[7.5px] text-purple-300/60 font-mono">✨ 🌌</span>
                    <span class="text-[7.5px] font-mono px-1.5 py-0.5 rounded-full ${isOptimal ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' : 'bg-purple-950/40 text-purple-400'} font-bold">
                        😴 ${sleepHours}h Spánek
                    </span>
                </div>
            `;
        }
    }

    // 2. FIT VUT Schedule Items (Monday=1, ..., Friday=5)
    if (day.dayOfWeek >= 1 && day.dayOfWeek <= 5 && (activeFilter === 'all' || activeFilter === 'fit')) {
        const scheduleForDay = (state.scheduleItems || []).filter(s => s.day_of_week === day.dayOfWeek);
        scheduleForDay.forEach(sub => {
            const startMin = timeToMinutes(sub.time_start);
            const endMin = timeToMinutes(sub.time_end);
            if (startMin !== null) {
                const dur = (endMin !== null && endMin > startMin) ? (endMin - startMin) : 60;
                rawEvents.push({
                    id: `fit-${sub.id || sub.subject_code}-${startMin}`,
                    type: 'fit',
                    title: sub.name || sub.subject_code,
                    code: sub.subject_code,
                    room: sub.room,
                    classType: sub.type,
                    startTime: sub.time_start,
                    endTime: sub.time_end,
                    startMinutes: startMin,
                    durationMinutes: dur,
                    raw: sub
                });
            }
        });
    }

    // 3. Gym Workouts
    if (activeFilter === 'all' || activeFilter === 'gym') {
        const dayGym = gymLogsByDate.get(day.dateKey) || [];
        dayGym.forEach(log => {
            let startMin = 16 * 60; // default afternoon workout
            if (log.created_at) {
                try {
                    const cDate = new Date(log.created_at);
                    if (!isNaN(cDate.getTime())) {
                        startMin = (cDate.getHours() * 60) + cDate.getMinutes();
                    }
                } catch {}
            }
            const dur = Math.max(30, Math.round((log.duration_seconds || 3600) / 60));
            rawEvents.push({
                id: `gym-${log.id}`,
                type: 'gym',
                title: log.name || 'Posilovna',
                startTime: `${String(Math.floor(startMin/60)).padStart(2,'0')}:${String(startMin%60).padStart(2,'0')}`,
                startMinutes: startMin,
                durationMinutes: dur,
                raw: log
            });
        });

        // Planned gym workout from planned_dates
        const plannedDate = (state.plannedDates || {})[day.dateKey];
        const isPlannedGym = plannedDate && (plannedDate.cat === 'gym' || (plannedDate.name && plannedDate.name.includes('🏋️')));
        if (isPlannedGym) {
            const startMin = plannedDate.time ? timeToMinutes(plannedDate.time) : 17 * 60;
            rawEvents.push({
                id: `gym-plan-${plannedDate.id || day.dateKey}`,
                type: 'gym',
                title: plannedDate.name,
                startTime: plannedDate.time || '17:00',
                startMinutes: startMin,
                durationMinutes: plannedDate.durationMinutes || 60,
                raw: plannedDate
            });
        }

        // Training Split Routine Slot (Ambient Virtual Event if no gym logged/planned)
        if (dayGym.length === 0 && !isPlannedGym) {
            const splitForDay = getActiveSplitForDay(day.dateKey);
            if (splitForDay && !splitForDay.isRest) {
                const startMin = splitForDay.preferredTime ? timeToMinutes(splitForDay.preferredTime) : 17 * 60;
                if (startMin !== null) {
                    rawEvents.push({
                        id: `split-${day.dateKey}`,
                        type: 'split-routine',
                        title: splitForDay.splitName,
                        startTime: splitForDay.preferredTime || '17:00',
                        startMinutes: startMin,
                        durationMinutes: 60,
                        templateId: splitForDay.templateId,
                        raw: splitForDay
                    });
                }
            }
        }
    }


    // 4. Planned Dates with specific time
    if (activeFilter === 'all' || activeFilter === 'health') {
        const plannedDate = (state.plannedDates || {})[day.dateKey];
        if (plannedDate && plannedDate.time && plannedDate.cat !== 'gym' && !plannedDate.name?.includes('🏋️')) {
            const startMin = timeToMinutes(plannedDate.time);
            if (startMin !== null) {
                rawEvents.push({
                    id: `date-${plannedDate.id || day.dateKey}`,
                    type: 'date',
                    title: plannedDate.name,
                    cat: plannedDate.cat,
                    startTime: plannedDate.time,
                    startMinutes: startMin,
                    durationMinutes: plannedDate.durationMinutes || 90,
                    raw: plannedDate
                });
            }
        }
    }

    // 5. Deadlines with specific time
    if (activeFilter === 'all' || activeFilter === 'fit') {
        const dayDeadlines = (deadlinesByDate.get(day.dateKey) || []).filter(d => !d.is_completed && d.deadline_time);
        dayDeadlines.forEach(dl => {
            const startMin = timeToMinutes(dl.deadline_time);
            if (startMin !== null) {
                rawEvents.push({
                    id: `deadline-${dl.id}`,
                    type: 'deadline',
                    title: `[${dl.subject_code || 'FIT'}] ${dl.title}`,
                    startTime: dl.deadline_time,
                    startMinutes: startMin,
                    durationMinutes: 30,
                    raw: dl
                });
            }
        });
    }

    // 6. Virtual Recurring Events / Routines
    if (recurringEventsByDate && recurringEventsByDate.has(day.dateKey)) {
        const recEvents = recurringEventsByDate.get(day.dateKey);
        recEvents.forEach(rev => {
            // Avoid duplicate if an explicit planned date or gym log already exists
            const hasExplicit = rawEvents.some(e => e.startMinutes === rev.startMinutes);
            if (!hasExplicit && (activeFilter === 'all' || activeFilter === rev.cat || activeFilter === rev.type)) {
                rawEvents.push(rev);
            }
        });
    }

    // Romantic Gap in-grid suggestion slot
    let romanticGapHtml = '';
    if (romanticGapsByDate && romanticGapsByDate.has(day.dateKey) && (activeFilter === 'all' || activeFilter === 'health')) {
        const dayGaps = romanticGapsByDate.get(day.dateKey);
        if (dayGaps.length > 0) {
            const topGap = dayGaps[0];
            const gapStartMin = timeToMinutes(topGap.startTime);
            if (gapStartMin !== null) {
                const gapCoords = calculateEventCoordinates(gapStartMin, topGap.durationMinutes || 120, START_HOUR, HOUR_HEIGHT);
                if (gapCoords.isValid) {
                    romanticGapHtml = `
                        <div class="cal-romantic-gap-slot cal-romantic-shimmer absolute left-0.5 right-0.5 z-10 p-1.5 rounded-xl border border-pink-500/30 bg-pink-500/[0.08] hover:bg-pink-500/[0.18] transition cursor-pointer flex flex-col justify-between overflow-hidden group pointer-events-auto shadow-sm"
                             style="top: ${gapCoords.top}px; height: ${gapCoords.height}px;"
                             onclick="event.stopPropagation(); Calendar.openQuickAdd(this, '${day.dateKey}', '${topGap.startTime}')"
                             title="Ideální volný čas pro rande (${topGap.startTime} – ${topGap.endTime})">
                            <div class="flex items-center justify-between text-[8px] font-black text-pink-300">
                                <span class="flex items-center gap-1">
                                    <span class="animate-pulse">💖</span>
                                    <span class="uppercase tracking-wider">Volno na rande</span>
                                </span>
                                <span class="font-mono text-[7.5px] opacity-80">${topGap.startTime}</span>
                            </div>
                            <div class="text-[7.5px] text-pink-200/70 font-medium group-hover:text-pink-100 transition truncate">
                                + Naplánovat (${Math.round((topGap.durationMinutes || 120) / 60)}h okno)
                            </div>
                        </div>
                    `;
                }
            }
        }
    }

    // Apply collision layout algorithm
    const layoutEvents = calculateEventCollisions(rawEvents);

    return `
        <div class="cal-day-column relative h-full min-h-[${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px] transition cursor-pointer ${day.isToday ? 'bg-[#5865F2]/[0.025] shadow-[inset_0_0_24px_rgba(88,101,242,0.035)]' : ''}"
             data-date-key="${day.dateKey}"
             onclick="Calendar.handleGridSlotClick(event, '${day.dateKey}')">
            <!-- SLEEP BAND -->
            ${sleepBandHtml}

            <!-- ROMANTIC GAP ZONE -->
            ${romanticGapHtml}

            <!-- LIVE NOW INDICATOR (Laser Beam & Pulsing Diamond) -->
            ${(day.isToday && nowPos.isVisible) ? `
                <div class="cal-now-indicator absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                     style="top: ${nowPos.offsetPx}px;">
                    <div class="w-3.5 h-3.5 rounded-full bg-[#5865F2] ring-2 ring-white shadow-lg cal-laser-beacon -ml-1.5 flex items-center justify-center">
                        <div class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                    </div>
                    <div class="h-[2px] flex-1 cal-laser-now bg-gradient-to-r from-[#5865F2] via-indigo-400 to-transparent"></div>
                    <span class="cal-now-label text-[8px] font-mono font-black text-white bg-[#5865F2] px-1.5 py-0.5 rounded-full shadow-lg border border-white/20">
                        ${nowPos.currentTimeStr}
                    </span>
                </div>
            ` : ''}

            <!-- EVENT CARDS -->
            <div class="absolute inset-0 p-0.5 pointer-events-none">
                ${layoutEvents.map(ev => renderEventCard(ev, day.dateKey)).join('')}
            </div>
        </div>
    `;
}

/**
 * Renders an individual event card with position, domain styling, and resize handles.
 */
function renderEventCard(event, dateKey) {
    const coords = calculateEventCoordinates(event.startMinutes, event.durationMinutes, START_HOUR, HOUR_HEIGHT);
    if (!coords.isValid) return '';

    // Calculate side-by-side collision geometry
    const totalCols = event.totalCols || 1;
    const colIndex = event.colIndex || 0;
    const widthPct = (100 / totalCols);
    const leftPct = (colIndex * widthPct);

    let domainStyles = '';
    let icon = '';
    let subtitle = '';

    if (event.type === 'fit') {
        domainStyles = 'cal-luxe-fit';
        icon = '🎓';
        subtitle = `${event.classType || 'Výuka'} ${event.room ? `• ${event.room}` : ''}`;
    } else if (event.type === 'gym') {
        const isLogged = event.raw && (event.raw.duration_seconds || event.raw.exercises);
        domainStyles = isLogged ? 'cal-luxe-gym' : 'cal-luxe-gym-pending';
        icon = isLogged ? '🏋️‍♂️' : '⏳';
        subtitle = isLogged ? `✅ ${event.durationMinutes}m odcvičeno` : `${event.durationMinutes}m plán`;
    } else if (event.type === 'date') {
        domainStyles = 'cal-luxe-date';
        const iconsMap = { food: "🍔", view: "🔭", walk: "🌲", fun: "⚡", movie: "🎬", game: "🎮", discord: "🎧", date: "📍", gym: "🏋️‍♂️" };
        icon = iconsMap[event.cat] || '❤️';
        subtitle = event.startTime || 'Plán';
    } else if (event.type === 'deadline') {
        domainStyles = 'cal-luxe-deadline';
        icon = '🔥';
        subtitle = `Deadline ${event.startTime}`;
    } else if (event.type === 'split-routine') {
        domainStyles = 'bg-gradient-to-br from-[#faa61a]/15 via-[#faa61a]/5 to-transparent border border-dashed border-[#faa61a]/50 text-[#faa61a] shadow-sm hover:border-[#faa61a] hover:bg-[#faa61a]/20';
        icon = '⚡';
        subtitle = event.templateId ? 'Doporučený split' : 'Split rutina';
    }


    const isDraggable = event.type !== 'fit';

    // Pass serialized event data for fast popover and drag lookup
    const eventJson = JSON.stringify({
        id: event.id,
        type: event.type,
        title: event.title,
        code: event.code,
        room: event.room,
        classType: event.classType,
        startTime: event.startTime,
        endTime: event.endTime,
        durationMinutes: event.durationMinutes,
        raw: event.raw
    }).replace(/"/g, '&quot;');

    return `
        <div class="cal-event-card cal-event-card-luxe absolute pointer-events-auto cursor-pointer p-1.5 flex flex-col justify-between overflow-hidden group ${domainStyles} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}"
             style="top: ${coords.top}px; height: ${coords.height}px; width: calc(${widthPct}% - 4px); left: calc(${leftPct}% + 2px);"
             onclick="event.stopPropagation(); Calendar.openEventDetail(this, ${eventJson}, '${dateKey}')"
             title="${event.title} (${event.startTime})">
            <!-- Card Header -->
            <div class="flex items-center justify-between gap-1 leading-tight">
                <span class="text-[9px] md:text-[10px] font-black truncate flex items-center gap-1">
                    <span>${icon}</span>
                    <span class="truncate font-extrabold">${event.code ? `[${event.code}] ` : ''}${event.title}</span>
                </span>
                <span class="text-[8px] font-mono opacity-80 flex-shrink-0 font-bold">
                    ${event.startTime}
                </span>
            </div>

            <!-- Card Subtitle (only if height allows) -->
            ${coords.height >= 38 ? `
                <div class="text-[7.5px] md:text-[8.5px] opacity-90 truncate mt-0.5 font-medium">
                    ${subtitle}
                </div>
            ` : ''}

            <!-- Bottom Resize Handle for flexible plans & workouts -->
            ${(event.type === 'gym' || event.type === 'date') ? `
                <div class="cal-resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 transition opacity-0 group-hover:opacity-100 flex items-center justify-center no-drag">
                    <div class="w-4 h-0.5 bg-white/50 rounded-full pointer-events-none"></div>
                </div>
            ` : ''}
        </div>
    `;
}
