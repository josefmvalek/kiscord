import { state } from '@core/state.js';
import { getMyName, getPartnerName, getMyEmoji, getPartnerEmoji } from './shared.js';

// ================================================================
// COUPLE GYM CHALLENGES & STREAKS ENGINE
// ================================================================

/**
 * Checks if both users completed at least one workout on a given date.
 * @param {string} dateKey - 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isSyncWorkoutDay(dateKey) {
    const logs = state.gymLogs || [];
    const myId = state.currentUser?.id;
    if (!myId) return false;

    const dayLogs = logs.filter(l => l.date_key === dateKey);
    const hasMyLog = dayLogs.some(l => l.user_id === myId);
    const hasPartnerLog = dayLogs.some(l => l.user_id && l.user_id !== myId);

    return hasMyLog && hasPartnerLog;
}

/**
 * Calculates all sync workout days in history.
 * @returns {Array<string>} Array of dateKeys where both trained
 */
export function getAllSyncDays() {
    const logs = state.gymLogs || [];
    const myId = state.currentUser?.id;
    if (!myId) return [];

    const dateMap = {};
    logs.forEach(l => {
        if (!dateMap[l.date_key]) dateMap[l.date_key] = new Set();
        if (l.user_id) dateMap[l.date_key].add(l.user_id);
    });

    return Object.keys(dateMap).filter(dateKey => dateMap[dateKey].size >= 2);
}

/**
 * Calculates current consecutive weekly couple streak.
 * A week counts if both partners logged at least 1 workout in that ISO week.
 * @returns {{ currentStreakWeeks: number, bestStreakWeeks: number, thisWeekCompleted: boolean }}
 */
export function calculateCoupleStreak() {
    const logs = state.gymLogs || [];
    const myId = state.currentUser?.id;
    if (!myId || logs.length === 0) {
        return { currentStreakWeeks: 0, bestStreakWeeks: 0, thisWeekCompleted: false };
    }

    // Helper: returns ISO week string 'YYYY-WW'
    const getWeekKey = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
            target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        const weekNr = 1 + Math.ceil((firstThursday - target) / 604800000);
        return d.getFullYear() + '-W' + String(weekNr).padStart(2, '0');
    };

    const weekMap = {};
    logs.forEach(l => {
        const wk = getWeekKey(l.logged_at || l.date_key);
        if (!wk) return;
        if (!weekMap[wk]) weekMap[wk] = { myCount: 0, partnerCount: 0 };
        if (l.user_id === myId) weekMap[wk].myCount++;
        else weekMap[wk].partnerCount++;
    });

    const nowWk = getWeekKey(new Date().toISOString());
    const sortedWeeks = Object.keys(weekMap).sort().reverse();

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const thisWeekData = weekMap[nowWk];
    const thisWeekCompleted = !!(thisWeekData && thisWeekData.myCount > 0 && thisWeekData.partnerCount > 0);

    for (const wk of sortedWeeks) {
        const data = weekMap[wk];
        if (data.myCount > 0 && data.partnerCount > 0) {
            tempStreak++;
            if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
            tempStreak = 0;
        }
    }

    let checkWk = new Date();
    while (true) {
        const wkKey = getWeekKey(checkWk.toISOString());
        const data = weekMap[wkKey];
        if (data && data.myCount > 0 && data.partnerCount > 0) {
            currentStreak++;
            checkWk.setDate(checkWk.getDate() - 7);
        } else if (wkKey === nowWk) {
            checkWk.setDate(checkWk.getDate() - 7);
            const prevWkKey = getWeekKey(checkWk.toISOString());
            const prevData = weekMap[prevWkKey];
            if (prevData && prevData.myCount > 0 && prevData.partnerCount > 0) {
                continue;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    return {
        currentStreakWeeks: currentStreak,
        bestStreakWeeks: Math.max(bestStreak, currentStreak),
        thisWeekCompleted
    };
}



/**
 * Returns HTML for couple stats banner at top of the Feed tab.
 */
export function renderCoupleGymBannerHtml() {
    const streakInfo = calculateCoupleStreak();
    const currentStreakWeeks = streakInfo.currentStreakWeeks;
    const thisWeekCompleted = streakInfo.thisWeekCompleted;
    const syncDays = getAllSyncDays();
    const myName = getMyName();
    const partnerName = getPartnerName();
    const myEmoji = getMyEmoji();
    const partnerEmoji = getPartnerEmoji();

    const logs = state.gymLogs || [];
    const myId = state.currentUser?.id;
    const myLogsCount = logs.filter(l => l.user_id === myId).length;
    const partnerLogsCount = logs.filter(l => l.user_id && l.user_id !== myId).length;

    const streakLabel = currentStreakWeeks === 1 ? 'týden' : (currentStreakWeeks >= 2 && currentStreakWeeks <= 4 ? 'týdny' : 'týdnů');

    return `
        <div class="glass-card bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden select-none space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="flex items-center gap-3">
                    <div class="flex -space-x-2">
                        <span class="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">${myEmoji}</span>
                        <span class="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xl shadow-inner">${partnerEmoji}</span>
                    </div>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-widest text-[#faa61a] block font-mono">Párový Fitness Tým</span>
                        <h3 class="text-sm font-black text-white uppercase tracking-tight leading-none mt-0.5">${myName} & ${partnerName}</h3>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <div class="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 font-mono">
                        <span class="text-base">“</span>
                        <div>
                            <div class="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Společný Streak</div>
                            <div class="text-xs font-black text-amber-400 leading-tight mt-0.5">${currentStreakWeeks} ${streakLabel}</div>
                        </div>
                    </div>

                    <div class="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 font-mono">
                        <span class="text-base">⚼</span>
                        <div>
                            <div class="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Sync Dny</div>
                            <div class="text-xs font-black text-purple-300 leading-tight mt-0.5">${syncDays.length}× společně </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mini progress bar for this week -->
            <div class="bg-black/30 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-4 text-[10px] font-mono">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${thisWeekCompleted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
                    <span class="text-gray-300 font-bold font-sans">${thisWeekCompleted ? 'Tento týden oba splněno! 🎇' : 'Tento týden>3j�#te se oba pro udržení streaku! 💝'}</span>
                </div>
                <div class="flex items-center gap-3 text-gray-400">
                    <span>${myName}: <strong class="text-white">${myLogsCount}</strong></span>
                    <span>•</span>
                    <span>${partnerName}: <strong class="text-white">${partnerLogsCount}</strong></span>
                </div>
            </div>
        </div>
    `;
}