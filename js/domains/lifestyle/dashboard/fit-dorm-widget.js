/**
 * VUT FIT & Dormitory Live Context Widget for Main Dashboard (#můj-den)
 */

import { state } from '@core/state.js';
import { getTodayKey } from '@core/utils.js';

export function generateFitAndDormDashboardWidget() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Ne, 1 = Po, 5 = Pá
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const todayStr = getTodayKey();

    const upcoming = (state.schoolDeadlines || [])
        .filter(d => !d.is_completed && d.deadline_date && d.deadline_date >= todayStr)
        .sort((a, b) => a.deadline_date.localeCompare(b.deadline_date));
    const nextDL = upcoming.length > 0 ? upcoming[0] : null;

    const daySubjects = (state.scheduleItems || []).filter(s => s.day_of_week === dayOfWeek);
    let todayClassInfo = isWeekend 
        ? 'Víkendové volno 🎉' 
        : (daySubjects.length > 0 ? `${daySubjects[0].subject_code || 'Hodina'} • ${daySubjects[0].time_start || ''} (${daySubjects[0].room || 'Božetěchova'})` : 'Žádná výuka v rozvrhu');

    // Calculate common free window
    let freeTimeInfo = isWeekend ? 'Celý víkend spolu ❤️' : 'Společný oběd & relax';
    if (!isWeekend && daySubjects.length > 0) {
        const joseEvents = daySubjects.filter(e => e.user_id === state.user_ids?.jose);
        const klarkaEvents = daySubjects.filter(e => e.user_id === state.user_ids?.klarka);
        if (joseEvents.length > 0 && klarkaEvents.length > 0) {
            freeTimeInfo = 'Společné okno: 12:00-14:00 ☕';
        }
    }

    let deadlineBadgeHtml = '';
    if (nextDL) {
        const diffDays = Math.ceil((new Date(nextDL.deadline_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        const diffLabel = diffDays === 0 ? 'Dnes!' : (diffDays === 1 ? 'Zítra!' : `za ${diffDays} dní`);
        const isUrgent = diffDays <= 2;
        deadlineBadgeHtml = `
            <div class="mt-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] p-3 rounded-xl border ${isUrgent ? 'border-rose-500/40 bg-rose-950/15 shadow-sm' : 'border-[var(--border-subtle)]'} flex items-center justify-between transition cursor-pointer group" onclick="window.switchChannel('study-planner')">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-base flex-shrink-0 group-hover:scale-110 transition-transform">${isUrgent ? '🔥' : '🎯'}</span>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="text-[9px] font-black uppercase tracking-wider text-emerald-400">[${nextDL.subject_code || 'FIT'}]</span>
                            <span class="text-xs font-bold text-[var(--text-header)] truncate">${nextDL.title}</span>
                        </div>
                        <span class="text-[10px] text-[var(--text-muted)] truncate block">${nextDL.type || 'Zadání'} • Termín ${nextDL.deadline_date} (${nextDL.deadline_time || '23:59'})</span>
                    </div>
                </div>
                <span class="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${isUrgent ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'} flex-shrink-0 ml-2">
                    ${diffLabel}
                </span>
            </div>
        `;
    }

    return `
        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-3.5 select-none">
            <div class="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                    🎓 VUT FIT & Koleje Brno
                </h3>

                <div class="flex items-center gap-1.5">
                    <button onclick="window.switchChannel('schedule')" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-normal)] hover:text-[var(--text-header)] rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        Rozvrh <i class="fas fa-chevron-right text-[8px] text-[var(--blurple)]"></i>
                    </button>
                    <button onclick="window.switchChannel('dorm-hub')" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--yellow)] hover:text-amber-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        Koleje <i class="fas fa-building text-[8px]"></i>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- 1. Dnešní výuka -->
                <div class="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center gap-3 transition cursor-pointer" onclick="window.switchChannel('schedule')">
                    <div class="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-base text-emerald-400 flex-shrink-0">
                        ${isWeekend ? '🌴' : '💻'}
                    </div>
                    <div class="min-w-0">
                        <span class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Výuka dnes</span>
                        <p class="text-xs font-bold text-[var(--text-header)] truncate">
                            ${todayClassInfo}
                        </p>
                    </div>
                </div>

                <!-- 2. Společná okénka -->
                <div class="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center gap-3 transition cursor-pointer" onclick="window.switchChannel('schedule')">
                    <div class="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-base text-amber-400 flex-shrink-0">
                        ☕
                    </div>
                    <div class="min-w-0">
                        <span class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Společný čas</span>
                        <p class="text-xs font-bold text-amber-400 truncate">
                            ${freeTimeInfo}
                        </p>
                    </div>
                </div>
            </div>

            ${deadlineBadgeHtml}
        </div>
    `;
}
