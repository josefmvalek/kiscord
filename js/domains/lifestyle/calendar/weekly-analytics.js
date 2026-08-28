/**
 * Weekly Analytics & Insights Engine for Kiscord Calendar
 * Aggregates workouts, study hours, sleep averages, water percentages,
 * and planned activities for the 7 days of the active week.
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { getAnchorDate } from './state.js';
import { getWeekDates } from './time-engine.js';

let isDrawerOpen = false;

export function isAnalyticsDrawerOpen() {
    return isDrawerOpen;
}

export function closeAnalyticsDrawer() {
    const drawer = document.getElementById('cal-analytics-drawer');
    if (drawer) {
        drawer.classList.add('translate-x-full');
        setTimeout(() => drawer.remove(), 250);
    }
    isDrawerOpen = false;
}

/**
 * Computes aggregated metrics for the 7-day week.
 * @param {Array<object>} weekDates 
 * @returns {object}
 */
export function computeWeeklyStats(weekDates) {
    if (!weekDates || weekDates.length !== 7) return null;

    let totalWorkouts = 0;
    let totalGymSeconds = 0;
    let totalGymSets = 0;
    let plannedGymCount = 0;

    let fitClassesCount = 0;
    let fitMinutesTotal = 0;
    let deadlinesCount = 0;
    let completedDeadlinesCount = 0;

    let sleepDaysLogged = 0;
    let sleepHoursSum = 0;
    let goodSleepDays = 0; // >= 7.5h

    let waterDaysLogged = 0;
    let waterCupsTotal = 0;
    let waterTargetDays = 0; // >= 8 cups

    let plannedDatesCount = 0;
    let totalChecklistItems = 0;
    let completedChecklistItems = 0;

    // Gym Logs map
    const gymLogsByDate = new Map();
    (state.gymLogs || []).forEach(log => {
        if (!log.date_key) return;
        if (!gymLogsByDate.has(log.date_key)) gymLogsByDate.set(log.date_key, []);
        gymLogsByDate.get(log.date_key).push(log);
    });

    // Deadlines map
    const deadlinesByDate = new Map();
    (state.schoolDeadlines || []).forEach(dl => {
        if (!dl.deadline_date) return;
        if (!deadlinesByDate.has(dl.deadline_date)) deadlinesByDate.set(dl.deadline_date, []);
        deadlinesByDate.get(dl.deadline_date).push(dl);
    });

    for (const day of weekDates) {
        const dateKey = day.dateKey;
        const health = (state.healthData || {})[dateKey] || {};
        const plannedDate = (state.plannedDates || {})[dateKey];
        const dayGym = gymLogsByDate.get(dateKey) || [];
        const dayDeadlines = deadlinesByDate.get(dateKey) || [];

        // 1. Gym metrics
        totalWorkouts += dayGym.length;
        dayGym.forEach(l => {
            totalGymSeconds += (l.duration_seconds || 3600);
            (l.exercises || []).forEach(ex => {
                totalGymSets += (ex.sets || []).length;
            });
        });

        if (plannedDate && (plannedDate.cat === 'gym' || plannedDate.name?.includes('🏋️'))) {
            plannedGymCount++;
        }

        // 2. FIT metrics (Monday=1 .. Friday=5)
        if (day.dayOfWeek >= 1 && day.dayOfWeek <= 5) {
            const schedule = (state.scheduleItems || []).filter(s => s.day_of_week === day.dayOfWeek);
            fitClassesCount += schedule.length;
            fitMinutesTotal += schedule.length * 110; // avg 2 class hours (~110m)
        }

        deadlinesCount += dayDeadlines.length;
        completedDeadlinesCount += dayDeadlines.filter(d => d.is_completed).length;

        // 3. Sleep metrics
        if (health.sleep_hours !== undefined && health.sleep_hours !== null && health.sleep_hours !== '') {
            const sh = parseFloat(health.sleep_hours);
            if (!isNaN(sh) && sh > 0) {
                sleepDaysLogged++;
                sleepHoursSum += sh;
                if (sh >= 7.5) goodSleepDays++;
            }
        }

        // 4. Water metrics
        if (health.water_count !== undefined && health.water_count !== null) {
            const wc = parseInt(health.water_count, 10);
            if (!isNaN(wc)) {
                waterDaysLogged++;
                waterCupsTotal += wc;
                if (wc >= 8) waterTargetDays++;
            }
        }

        // 5. Planned dates & checklists
        if (plannedDate && plannedDate.cat !== 'gym' && !plannedDate.name?.includes('🏋️')) {
            plannedDatesCount++;
            (plannedDate.checklist || []).forEach(item => {
                totalChecklistItems++;
                if (item.done) completedChecklistItems++;
            });
        }
    }

    const avgSleep = sleepDaysLogged > 0 ? (sleepHoursSum / sleepDaysLogged).toFixed(1) : '-';
    const waterPercentage = waterDaysLogged > 0 ? Math.min(100, Math.round((waterCupsTotal / (waterDaysLogged * 8)) * 100)) : 0;
    const gymHoursFormatted = `${Math.floor(totalGymSeconds / 3600)}h ${Math.round((totalGymSeconds % 3600) / 60)}m`;
    const fitHoursFormatted = `${(fitMinutesTotal / 60).toFixed(1)}h`;

    return {
        totalWorkouts,
        plannedGymCount,
        gymHoursFormatted,
        totalGymSets,
        fitClassesCount,
        fitHoursFormatted,
        deadlinesCount,
        completedDeadlinesCount,
        avgSleep,
        goodSleepDays,
        sleepDaysLogged,
        waterPercentage,
        waterTargetDays,
        waterCupsTotal,
        plannedDatesCount,
        totalChecklistItems,
        completedChecklistItems
    };
}

/**
 * Toggles the sliding Weekly Analytics drawer.
 */
export function toggleWeeklyAnalyticsDrawer() {
    triggerHaptic('light');
    const existing = document.getElementById('cal-analytics-drawer');
    if (existing) {
        closeAnalyticsDrawer();
        return;
    }

    const weekDates = getWeekDates(getAnchorDate());
    const stats = computeWeeklyStats(weekDates);
    if (!stats) return;

    const drawer = document.createElement('div');
    drawer.id = 'cal-analytics-drawer';
    drawer.className = 'cal-analytics-drawer fixed top-0 right-0 bottom-0 z-50 w-80 md:w-96 bg-[#2f3136] border-l border-white/10 shadow-2xl p-5 overflow-y-auto custom-scrollbar text-white select-none transition-transform duration-300 ease-out translate-x-full';

    drawer.innerHTML = `
        <!-- Drawer Header -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center text-sm font-bold">
                    <i class="fas fa-chart-pie"></i>
                </span>
                <div>
                    <h3 class="text-sm font-black uppercase tracking-wider text-white">Týdenní Přehled</h3>
                    <p class="text-[10px] text-gray-400 font-medium">Analýza a produktivita týdne</p>
                </div>
            </div>
            <button onclick="Calendar.closeAnalyticsDrawer()" class="w-8 h-8 rounded-xl bg-[#202225] hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>

        <!-- KPI CARDS GRID -->
        <div class="space-y-3">
            <!-- 1. FITNESS & GYM KPI -->
            <div class="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <i class="fas fa-dumbbell"></i> Posilovna & Tréninky
                    </span>
                    <span class="text-[10px] font-mono text-amber-300 font-bold">${stats.gymHoursFormatted}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center mt-2">
                    <div class="bg-black/20 p-2 rounded-xl border border-white/5">
                        <span class="block text-base font-black text-white font-mono">${stats.totalWorkouts}</span>
                        <span class="text-[9px] text-gray-400 uppercase font-bold">Dokončeno</span>
                    </div>
                    <div class="bg-black/20 p-2 rounded-xl border border-white/5">
                        <span class="block text-base font-black text-amber-400 font-mono">${stats.totalGymSets}</span>
                        <span class="text-[9px] text-gray-400 uppercase font-bold">Celkem sérií</span>
                    </div>
                </div>
            </div>

            <!-- 2. FIT VUT STUDY KPI -->
            <div class="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <i class="fas fa-graduation-cap"></i> VUT FIT Výuka
                    </span>
                    <span class="text-[10px] font-mono text-emerald-300 font-bold">${stats.fitHoursFormatted}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center mt-2">
                    <div class="bg-black/20 p-2 rounded-xl border border-white/5">
                        <span class="block text-base font-black text-white font-mono">${stats.fitClassesCount}</span>
                        <span class="text-[9px] text-gray-400 uppercase font-bold">Hodin rozvrhu</span>
                    </div>
                    <div class="bg-black/20 p-2 rounded-xl border border-white/5">
                        <span class="block text-base font-black text-rose-400 font-mono">${stats.deadlinesCount}</span>
                        <span class="text-[9px] text-gray-400 uppercase font-bold">Termínů / Deadlinů</span>
                    </div>
                </div>
            </div>

            <!-- 3. SLEEP & REST KPI -->
            <div class="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <i class="fas fa-bed"></i> Spánek & Regenerace
                    </span>
                    <span class="text-xs font-mono font-black text-purple-200">${stats.avgSleep} h / noc</span>
                </div>
                <div class="w-full bg-black/30 rounded-full h-2 mt-2 overflow-hidden">
                    <div class="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full" style="width: ${Math.min(100, (parseFloat(stats.avgSleep) / 8) * 100 || 0)}%"></div>
                </div>
                <div class="flex justify-between text-[9px] text-gray-400 mt-1.5 font-bold">
                    <span>Optimální noci (≥7.5h):</span>
                    <span class="text-purple-300 font-mono">${stats.goodSleepDays} z ${stats.sleepDaysLogged || 7}</span>
                </div>
            </div>

            <!-- 4. WATER & HYDRATION KPI -->
            <div class="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <i class="fas fa-tint"></i> Pitný režim
                    </span>
                    <span class="text-xs font-mono font-black text-cyan-200">${stats.waterPercentage}%</span>
                </div>
                <div class="w-full bg-black/30 rounded-full h-2 mt-2 overflow-hidden">
                    <div class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full" style="width: ${stats.waterPercentage}%"></div>
                </div>
                <div class="flex justify-between text-[9px] text-gray-400 mt-1.5 font-bold">
                    <span>Splněné dny (8/8):</span>
                    <span class="text-cyan-300 font-mono">${stats.waterTargetDays} ze 7 dnů</span>
                </div>
            </div>

            <!-- 5. ROMANTIC DATES & PLANS KPI -->
            <div class="p-3.5 rounded-2xl bg-pink-950/20 border border-pink-500/30">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-black text-pink-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <i class="fas fa-heart"></i> Společné Plány & Rande
                    </span>
                    <span class="text-xs font-mono font-black text-pink-200">${stats.plannedDatesCount}</span>
                </div>
                ${stats.totalChecklistItems > 0 ? `
                    <div class="flex justify-between text-[9px] text-gray-400 mt-1 font-bold">
                        <span>Splněné úkoly checklistu:</span>
                        <span class="text-pink-300 font-mono">${stats.completedChecklistItems} / ${stats.totalChecklistItems}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(drawer);
    isDrawerOpen = true;

    // Trigger sliding animation
    setTimeout(() => {
        drawer.classList.remove('translate-x-full');
    }, 10);
}
