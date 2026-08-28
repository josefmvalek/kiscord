/**
 * Partner Radar & Shared Date Countdown for Kiscord Calendar
 * Scans upcoming planned dates and renders a live countdown banner.
 */

import { state } from '@core/state.js';
import { formatDateKey, parseDateKey } from './time-engine.js';

/**
 * Finds the soonest upcoming planned date from state.plannedDates.
 * @param {Date} referenceDate 
 * @returns {object|null}
 */
export function getNextPlannedDate(referenceDate = new Date()) {
    if (!state.plannedDates) return null;

    const todayKey = formatDateKey(referenceDate);
    const upcoming = [];

    Object.entries(state.plannedDates).forEach(([dateKey, plan]) => {
        if (!plan || !plan.name) return;
        // Ignore past dates
        if (dateKey >= todayKey) {
            upcoming.push({
                dateKey,
                plan,
                date: parseDateKey(dateKey)
            });
        }
    });

    if (upcoming.length === 0) return null;

    // Sort by date ascending
    upcoming.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const next = upcoming[0];

    // Compute friendly time countdown
    const targetDate = next.date;
    const diffTime = targetDate.getTime() - new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let countdownText = '';
    if (diffDays === 0) {
        countdownText = `Dnes ${next.plan.time ? `v ${next.plan.time}` : ''}`;
    } else if (diffDays === 1) {
        countdownText = `Zítra ${next.plan.time ? `v ${next.plan.time}` : ''}`;
    } else if (diffDays === 2) {
        countdownText = `Pozítří ${next.plan.time ? `v ${next.plan.time}` : ''}`;
    } else {
        countdownText = `Za ${diffDays} dní ${next.plan.time ? `v ${next.plan.time}` : ''}`;
    }

    return {
        dateKey: next.dateKey,
        name: next.plan.name,
        time: next.plan.time,
        cat: next.plan.cat || 'date',
        diffDays,
        countdownText,
        checklistCount: (next.plan.checklist || []).length,
        checklistDone: (next.plan.checklist || []).filter(c => c.done).length
    };
}

/**
 * Renders the countdown banner HTML.
 * @returns {string}
 */
export function renderDateCountdownBanner() {
    const next = getNextPlannedDate();
    if (!next) return '';

    return `
        <div class="cal-countdown-banner bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-pink-950/40 border-b border-pink-500/20 px-4 py-1.5 flex items-center justify-between gap-2 text-xs flex-shrink-0 animate-fade-in">
            <div class="flex items-center gap-2 truncate">
                <span class="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center justify-center text-[10px] flex-shrink-0 animate-pulse">
                    ❤️
                </span>
                <span class="font-bold text-pink-200 truncate">
                    <span class="text-white font-black">${next.countdownText}:</span> ${next.name}
                </span>
            </div>

            <div class="flex items-center gap-1.5 flex-shrink-0">
                <button onclick="Calendar.sendLovePulse()" 
                        title="Poslat zamilovaný pulz partnerovi (Love Pulse)"
                        class="px-2 py-0.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-[10px] font-black transition flex items-center gap-1">
                    <i class="fas fa-heart text-pink-400 animate-pulse"></i>
                    <span>Pulz</span>
                </button>
                <button onclick="Calendar.showDayDetail('${next.dateKey}')" 
                        class="px-2.5 py-0.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-[10px] font-black transition flex items-center gap-1">
                    <span>Zobrazit plán</span>
                    <i class="fas fa-chevron-right text-[8px]"></i>
                </button>
            </div>
        </div>
    `;
}
export async function sendLovePulse() {
    const { triggerHaptic } = await import('@core/utils.js');
    const { playHeartbeat } = await import('@core/sound.js');

    triggerHaptic('heavy');
    playHeartbeat();

    if (typeof document !== 'undefined') {
        const heart = document.createElement('div');
        heart.className = 'cal-pulse-heart-screen';
        heart.innerHTML = '💖';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1200);
    }

    // Broadcast to Supabase
    const { supabase } = await import('@core/supabase.js');
    try {
        await supabase.from('love_pulses').insert({
            created_at: new Date().toISOString(),
            sender: state.currentUser?.username || 'Jozka'
        });
    } catch (e) {}
}

/**
 * Computes partner current presence activity in real-time.
 */
export function getPartnerCurrentStatus() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const curHour = now.getHours();
    const curMin = (curHour * 60) + now.getMinutes();

    // 1. Check FIT classes for this time
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const activeClass = (state.scheduleItems || []).find(s => {
            if (s.day_of_week !== dayOfWeek) return false;
            const [sh, sm] = (s.time_start || '0:0').split(':').map(Number);
            const [eh, em] = (s.time_end || '0:0').split(':').map(Number);
            const sMin = sh * 60 + sm;
            const eMin = eh * 60 + em;
            return curMin >= sMin && curMin <= eMin;
        });

        if (activeClass) {
            return {
                status: 'class',
                text: `Výuka na FITu: [${activeClass.subject_code}] ${activeClass.room ? `(${activeClass.room})` : ''}`,
                icon: '🎓',
                badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            };
        }
    }

    // 2. Check gym
    const todayKey = formatDateKey(now);
    const hasGymToday = (state.gymLogs || []).some(l => l.date_key === todayKey);
    if (hasGymToday && curHour >= 16 && curHour <= 19) {
        return {
            status: 'gym',
            text: 'Trénink v posilovně 💪',
            icon: '🏋️‍♂️',
            badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
    }

    // 3. Evening leisure / date
    if (curHour >= 19) {
        return {
            status: 'free',
            text: 'Volný večer pro společný čas ✨',
            icon: '🥂',
            badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
        };
    }

    return {
        status: 'online',
        text: 'Aktivní na Kiscordu',
        icon: '💚',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    };
}

