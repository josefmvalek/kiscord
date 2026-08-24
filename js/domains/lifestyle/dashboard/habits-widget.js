/**
 * Habits Bento Widget for Main Dashboard (#můj-den)
 */

import { state } from '@core/state.js';
import { getTodayKey, triggerHaptic, triggerConfetti } from '@core/utils.js';

export function generateHabitsDashboardWidget() {
    let habits = [];
    let logs = [];
    try {
        const rawH = localStorage.getItem('kiscord_local_habits');
        if (rawH) habits = JSON.parse(rawH);
        const rawL = localStorage.getItem('kiscord_local_habit_logs');
        if (rawL) logs = JSON.parse(rawL);
    } catch(e) {}

    const myId = state.currentUser?.id;
    const todayStr = getTodayKey();
    const myHabits = habits.filter(h => h.user_id === myId || h.is_shared);

    if (myHabits.length === 0) {
        return `
            <div data-dashboard-habits-container="true" class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm select-none">
                <div class="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)] mb-3">
                    <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        🌿 Dnešní Návyky & Rutina
                    </h3>
                    <button onclick="window.switchChannel('habits')" class="text-[10px] font-bold text-emerald-400 hover:underline uppercase tracking-wider">
                        + Přidat návyk
                    </button>
                </div>
                <div class="p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] text-center cursor-pointer hover:border-emerald-500/30 transition" onclick="window.switchChannel('habits')">
                    <p class="text-xs text-[var(--text-muted)]">Zatím nemáš zadané žádné denní návyky. Klikni pro přidání ranní rutiny (+5 Love Coins) 🌿</p>
                </div>
            </div>
        `;
    }

    const completedCount = myHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date_key === todayStr && l.user_id === myId)).length;
    const totalCount = myHabits.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return `
        <div data-dashboard-habits-container="true" class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-3.5 select-none">
            <div class="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                <div class="flex items-center gap-2">
                    <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        🌿 Dnešní Návyky & Rutina
                    </h3>
                    <span class="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded-md border border-emerald-500/20">${completedCount}/${totalCount} splněno</span>
                </div>

                <button onclick="window.switchChannel('habits')" 
                        class="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-header)] transition font-bold uppercase tracking-wider flex items-center gap-1">
                    všechny <i class="fas fa-chevron-right text-[8px] text-emerald-400"></i>
                </button>
            </div>

            <!-- Mini Progress Bar -->
            <div class="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>

            <!-- List of habits (max 4 on dashboard for high density) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                ${myHabits.slice(0, 4).map(habit => {
                    const isDone = logs.some(l => l.habit_id === habit.id && l.date_key === todayStr && l.user_id === myId);
                    return `
                        <div class="flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isDone 
                            ? 'bg-emerald-950/20 border-emerald-500/30' 
                            : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] border-[var(--border-subtle)]'
                        }">
                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                <span class="text-base flex-shrink-0">${habit.icon || '✨'}</span>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-[var(--text-header)] truncate ${isDone ? 'line-through text-emerald-300/60' : ''}">
                                        ${habit.title}
                                    </div>
                                    <div class="text-[9px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                                        <i class="fas fa-fire text-amber-500 text-[8px]"></i>
                                        <span>${habit.streak || 0} dní v kuse</span>
                                    </div>
                                </div>
                            </div>

                            <button onclick="window.toggleHabitFromDashboard('${habit.id}')" 
                                    class="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 active:scale-90 ${
                                        isDone 
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40' 
                                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)]'
                                    }">
                                <i class="fas ${isDone ? 'fa-check' : 'fa-circle'} text-[10px]"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

export function toggleHabitFromDashboard(habitId) {
    const todayStr = getTodayKey();
    const myId = state.currentUser?.id;

    // 1. INSTANT 0ms SYNCHRONOUS OPTIMISTIC UPDATE
    let logs = [];
    try {
        const rawL = localStorage.getItem('kiscord_local_habit_logs');
        if (rawL) logs = JSON.parse(rawL);
    } catch(e) {}

    const isAlreadyDone = logs.some(l => l.habit_id === habitId && l.date_key === todayStr && l.user_id === myId);

    if (isAlreadyDone) {
        triggerHaptic('light');
        logs = logs.filter(l => !(l.habit_id === habitId && l.date_key === todayStr && l.user_id === myId));
    } else {
        triggerHaptic('success');
        triggerConfetti();
        logs.push({
            id: crypto.randomUUID(),
            habit_id: habitId,
            user_id: myId,
            date_key: todayStr
        });
    }

    localStorage.setItem('kiscord_local_habit_logs', JSON.stringify(logs));

    // Update DOM IMMEDIATELY (0ms delay)
    const widgetContainer = document.querySelector('[data-dashboard-habits-container]');
    if (widgetContainer) {
        widgetContainer.outerHTML = generateHabitsDashboardWidget();
    }

    // 2. BACKGROUND PERSISTENCE & COIN AWARDING
    import('../habits.js').then(habitsMod => {
        habitsMod.toggleHabitToday(habitId, true);
    }).catch(e => {
        console.warn("[Dashboard] Background habit sync error:", e);
    });
}
