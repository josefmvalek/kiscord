/**
 * Agenda View Generator for Kiscord Calendar (Mobile-First Vertical Chrono Feed)
 * Displays a clean, legible, vertical stream of days and events optimized for one-thumb mobile UX.
 */

import { state } from '@core/state.js';
import { getTodayKey } from '@core/utils.js';
import { getWeekDates, getAnniversaryMemories } from './time-engine.js';
import { getWeatherForDate } from './weather.js';
import { getMoodColor, getMoodLabel } from './month-view.js';

/**
 * Generates full HTML for the Agenda / Vertical Chrono Feed view.
 * @param {Date|string} anchorDate 
 * @returns {string} HTML string
 */
export function generateAgendaView(anchorDate) {
    const weekDates = getWeekDates(anchorDate);
    const todayKey = getTodayKey();
    const activeFilter = state.calendarFilter || 'all';

    // Index deadlines by date
    const deadlinesByDate = new Map();
    (state.schoolDeadlines || []).forEach(dl => {
        if (!dl.deadline_date) return;
        if (!deadlinesByDate.has(dl.deadline_date)) deadlinesByDate.set(dl.deadline_date, []);
        deadlinesByDate.get(dl.deadline_date).push(dl);
    });

    // Index gym logs by date
    const gymLogsByDate = new Map();
    (state.gymLogs || []).forEach(log => {
        if (!log.date_key) return;
        if (!gymLogsByDate.has(log.date_key)) gymLogsByDate.set(log.date_key, []);
        gymLogsByDate.get(log.date_key).push(log);
    });

    return `
        <div id="cal-agenda-view" class="cal-agenda-view flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 max-w-3xl mx-auto w-full space-y-4 select-none pb-24">
            <!-- AGENDA DAYS FEED -->
            ${weekDates.map(day => renderAgendaDayCard(day, todayKey, gymLogsByDate, deadlinesByDate, activeFilter)).join('')}
        </div>
    `;
}

/**
 * Renders an individual day card inside the agenda feed.
 */
function renderAgendaDayCard(day, todayKey, gymLogsByDate, deadlinesByDate, activeFilter) {
    const weather = getWeatherForDate(day.dateKey);
    const health = (state.healthData || {})[day.dateKey] || {};
    const plannedDate = (state.plannedDates || {})[day.dateKey];
    const dayDeadlines = deadlinesByDate.get(day.dateKey) || [];
    const dayGymLogs = gymLogsByDate.get(day.dateKey) || [];
    const daySchedule = (state.scheduleItems || []).filter(s => s.day_of_week === day.date.getDay());
    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
    const anniversaries = getAnniversaryMemories(day.dateKey, state.timelineEvents);

    const isToday = day.dateKey === todayKey;

    // Collect all event items for this day
    const eventsList = [];

    // 1. FIT Classes
    if (!isWeekend && (activeFilter === 'all' || activeFilter === 'fit')) {
        daySchedule.forEach(s => {
            eventsList.push({
                type: 'fit',
                time: `${s.time_start} – ${s.time_end}`,
                title: `[${s.subject_code}] ${s.name}`,
                subtitle: s.room || 'Božetěchova',
                icon: '🎓',
                badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            });
        });
    }

    // 2. Deadlines
    if (activeFilter === 'all' || activeFilter === 'fit') {
        dayDeadlines.filter(dl => !dl.is_completed).forEach(dl => {
            eventsList.push({
                type: 'deadline',
                time: `Do ${dl.deadline_time || '23:59'}`,
                title: `[${dl.subject_code || 'FIT'}] ${dl.title}`,
                subtitle: 'Termín odevzdání',
                icon: '🔥',
                badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            });
        });
    }

    // 3. Romantic Plans & Dates
    if (plannedDate && (activeFilter === 'all' || activeFilter === 'health')) {
        eventsList.push({
            type: 'date',
            time: plannedDate.time ? `V ${plannedDate.time} (${plannedDate.durationMinutes || 90}m)` : 'Celodenní plán',
            title: plannedDate.name,
            subtitle: plannedDate.checklist?.length ? `${plannedDate.checklist.filter(c => c.done).length}/${plannedDate.checklist.length} úkolů splněno` : 'Romantický plán',
            icon: '❤️',
            badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
        });
    }

    // 4. Gym Workouts
    if (activeFilter === 'all' || activeFilter === 'gym') {
        if (dayGymLogs.length > 0) {
            dayGymLogs.forEach(g => {
                const mins = Math.round((g.duration_seconds || 0) / 60);
                eventsList.push({
                    type: 'gym',
                    time: `${mins > 0 ? `${mins} min` : 'Trénink'}`,
                    title: `🏋️‍♂️ ${g.name || 'Posilovna'}`,
                    subtitle: g.exercises?.length ? `${g.exercises.length} cviků zaznamenáno` : 'Odcvičeno',
                    icon: '✅',
                    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                });
            });
        }
    }

    // Health biometrics summary
    const water = health.water_count ?? health.water ?? 0;
    const sleep = health.sleep_hours ?? health.sleep ?? null;
    const mood = health.mood_score ?? health.mood ?? null;
    const hasBiometrics = water > 0 || sleep !== null || mood !== null;

    return `
        <div class="cal-agenda-day-card bg-[#2f3136] rounded-2xl border ${isToday ? 'border-[#5865F2] shadow-lg shadow-[#5865F2]/20' : 'border-white/10'} overflow-hidden transition hover:border-white/20">
            <!-- STICKY DAY HEADER -->
            <div class="px-4 py-3 bg-[#202225] border-b border-white/5 flex items-center justify-between gap-3 cursor-pointer"
                 onclick="Calendar.showDayDetail('${day.dateKey}')">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black ${isToday ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/30' : 'bg-white/5 text-gray-200'}">
                        <span class="text-[9px] uppercase tracking-wider -mb-0.5">${day.dayName}</span>
                        <span class="text-base leading-tight">${day.dayNumber}</span>
                    </div>
                    <div>
                        <h3 class="text-sm font-black text-white flex items-center gap-2">
                            <span>${day.dayNameFull}</span>
                            ${isToday ? '<span class="px-2 py-0.5 rounded-full bg-[#5865F2] text-[9px] font-black uppercase text-white shadow-sm">Dnes</span>' : ''}
                            ${anniversaries.length > 0 ? `<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider">✨ ${anniversaries[0].anniversaryLabel}</span>` : ''}
                        </h3>
                        <div class="text-[11px] text-gray-400 font-medium">
                            ${day.dayNumber}. ${day.monthName}
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 rounded-lg bg-black/30 border border-white/5 text-xs text-amber-300 font-bold flex items-center gap-1" title="${weather.condition}: ${weather.temp}">
                        <span>${weather.icon}</span>
                        <span class="font-mono">${weather.temp}</span>
                    </span>
                    <button type="button" 
                            onclick="event.stopPropagation(); Calendar.openQuickAdd(this, '${day.dateKey}')" 
                            title="Přidat událost do tohoto dne"
                            class="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition active:scale-95">
                        <i class="fas fa-plus text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- DAY EVENTS LIST -->
            <div class="p-3 space-y-2">
                ${eventsList.length > 0 ? eventsList.map(ev => `
                    <div class="flex items-center justify-between p-3 rounded-xl border ${ev.badgeClass} transition hover:scale-[1.01] cursor-pointer"
                         onclick="Calendar.showDayDetail('${day.dateKey}')">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="text-xl flex-shrink-0">${ev.icon}</span>
                            <div class="min-w-0">
                                <div class="text-xs sm:text-sm font-bold text-white truncate">${ev.title}</div>
                                <div class="text-[10px] sm:text-[11px] opacity-80 truncate">${ev.subtitle}</div>
                            </div>
                        </div>
                        <span class="font-mono text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg bg-black/20 flex-shrink-0 ml-2">
                            ${ev.time}
                        </span>
                    </div>
                `).join('') : `
                    <div class="py-4 text-center text-xs text-gray-400 italic flex items-center justify-center gap-2">
                        <span>🌴</span>
                        <span>Volný den bez naplánovaných akcí</span>
                    </div>
                `}

                <!-- MINI BIOMETRICS BAR -->
                ${hasBiometrics ? `
                    <div class="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] px-1 text-gray-300">
                        <div class="flex items-center gap-3">
                            ${water > 0 ? `<span class="text-cyan-300 font-mono font-bold">💧 ${water}/8</span>` : ''}
                            ${sleep ? `<span class="text-purple-300 font-mono font-bold">😴 ${sleep}h</span>` : ''}
                            ${mood ? `<span class="text-pink-300 font-bold" style="color: ${getMoodColor(mood)}">💜 ${mood}/10 (${getMoodLabel(mood)})</span>` : ''}
                        </div>
                        <span class="text-[10px] text-gray-500">Klepnutím upravíš</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}
