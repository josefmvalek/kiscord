/**
 * Daily Briefing & Morning Digest Engine for Kiscord Calendar
 * Generates an executive daily snapshot (FIT schedule, gym split, plans,
 * sleep debt, and 1-click Discord share summary).
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { formatDateKey, parseDateKey } from './time-engine.js';
import { getActiveSplitForDay } from '@domains/fitness/gym/splits.js';

/**
 * Computes briefing data for a given date.
 * @param {Date} targetDate 
 * @returns {object}
 */
export function getDailyBriefingData(targetDate = new Date()) {
    const dateKey = formatDateKey(targetDate);
    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const czechDayNum = dayOfWeek === 0 ? 7 : dayOfWeek;

    const dayNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    const dayName = dayNames[dayOfWeek];

    // 1. FIT Timetable today (Monday=1..Friday=5)
    const fitSchedule = (state.scheduleItems || []).filter(s => s.day_of_week === czechDayNum);

    // 2. Deadlines today
    const deadlines = (state.schoolDeadlines || []).filter(d => d.deadline_date === dateKey && !d.is_completed);

    // 3. Planned Date & Checklist
    const plannedDate = (state.plannedDates || {})[dateKey] || null;

    // 4. Gym Logs & Split Recommendation
    const gymToday = (state.gymLogs || []).filter(l => l.date_key === dateKey);
    const activeSplitConfig = getActiveSplitForDay(targetDate);

    let gymRecommendation = 'Push / Horní tělo (Bench & Ramena)';
    let gymSplitObj = activeSplitConfig;

    if (activeSplitConfig) {
        if (activeSplitConfig.isRest) {
            gymRecommendation = 'Volno / Regenerace 🛌';
        } else {
            gymRecommendation = `${activeSplitConfig.splitName}${activeSplitConfig.template ? ` (${activeSplitConfig.template.name})` : ''}`;
        }
    } else {
        if (dayOfWeek === 2 || dayOfWeek === 4) {
            gymRecommendation = 'Pull / Záda & Biceps';
        } else if (dayOfWeek === 3 || dayOfWeek === 6) {
            gymRecommendation = 'Legs / Nohy & Core';
        }
    }

    // 5. Health & Sleep Debt
    const health = (state.healthData || {})[dateKey] || {};
    const sleepHours = parseFloat(health.sleep_hours) || 0;
    const optimalSleep = 8.0;
    const sleepDiff = sleepHours > 0 ? (sleepHours - optimalSleep).toFixed(1) : null;
    const sleepDebtStr = sleepDiff !== null 
        ? (parseFloat(sleepDiff) >= 0 ? `+${sleepDiff}h (Dobrý spánek)` : `${sleepDiff}h (Spánkový dluh)`)
        : 'Zatím nezapsáno';

    const waterCount = health.water_count || 0;

    // Format Discord summary text
    let discordText = `☀️ **Dnešní přehled — ${dayName} ${targetDate.getDate()}.${targetDate.getMonth() + 1}.**\n`;
    if (fitSchedule.length > 0) {
        discordText += `\n🎓 **VUT FIT:**\n` + fitSchedule.map(s => `• ${s.time_start}–${s.time_end} [${s.subject_code}] ${s.name} (${s.room || 'online'})`).join('\n');
    }
    if (deadlines.length > 0) {
        discordText += `\n🔥 **Deadliny:**\n` + deadlines.map(d => `• [${d.subject_code}] ${d.title} (do ${d.deadline_time || '23:59'})`).join('\n');
    }
    if (plannedDate) {
        discordText += `\n❤️ **Společný plán:** ${plannedDate.name} ${plannedDate.time ? `v ${plannedDate.time}` : ''}\n`;
        if (plannedDate.checklist?.length > 0) {
            discordText += plannedDate.checklist.map(c => `  - [${c.done ? 'X' : ' '}] ${c.text}`).join('\n') + '\n';
        }
    }
    discordText += `\n🏋️ **Doporučený gym split:** ${gymRecommendation}`;
    discordText += `\n💧 **Voda:** ${waterCount}/8 sklenic | 😴 **Spánek:** ${sleepHours > 0 ? `${sleepHours}h` : 'Nezadáno'}`;

    return {
        dateKey,
        dayName,
        dayNumber: targetDate.getDate(),
        monthNumber: targetDate.getMonth() + 1,
        fitSchedule,
        deadlines,
        plannedDate,
        gymToday,
        gymRecommendation,
        gymSplitObj,
        sleepHours,
        sleepDebtStr,
        waterCount,
        discordText
    };
}


/**
 * Displays the Daily Briefing modal.
 * @param {Date} targetDate 
 */
export function showDailyBriefingModal(targetDate = new Date()) {
    triggerHaptic('light');

    const data = getDailyBriefingData(targetDate);
    const modal = document.createElement('div');
    modal.id = 'cal-briefing-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none';

    modal.innerHTML = `
        <div class="bg-[#2f3136] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-5 text-white max-h-[90vh] overflow-y-auto custom-scrollbar" onclick="event.stopPropagation()">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-sun"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black uppercase tracking-wider">Dnešní Ranní Briefing</h3>
                        <p class="text-[10px] text-gray-400 font-medium">${data.dayName} ${data.dayNumber}. ${data.monthNumber}.</p>
                    </div>
                </div>
                <button onclick="document.getElementById('cal-briefing-modal').remove()" class="w-7 h-7 rounded-lg bg-[#202225] hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>

            <div class="space-y-3">
                <!-- 1. FIT Schedule & Deadlines -->
                <div class="p-3 rounded-xl bg-[#202225] border border-white/5">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase">
                            <i class="fas fa-graduation-cap"></i> FIT VUT Výuka
                        </span>
                        <span class="text-[10px] text-gray-400">${data.fitSchedule.length} bloků</span>
                    </div>
                    ${data.fitSchedule.length > 0 ? `
                        <div class="space-y-1 mt-1">
                            ${data.fitSchedule.map(s => `
                                <div class="flex items-center justify-between text-xs p-1.5 rounded-lg bg-black/20">
                                    <span class="font-bold text-white truncate">[${s.subject_code}] ${s.name}</span>
                                    <span class="font-mono text-emerald-300 text-[11px] flex-shrink-0 ml-2">${s.time_start}–${s.time_end} • ${s.room || 'online'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-[11px] text-gray-400">Dnes nemáš žádnou rozvrhovou výuku 🎉</p>
                    `}

                    ${data.deadlines.length > 0 ? `
                        <div class="mt-2 pt-2 border-t border-white/5 space-y-1">
                            <span class="text-[10px] font-black uppercase text-rose-400 tracking-wider block">Urgentní termíny:</span>
                            ${data.deadlines.map(d => `
                                <div class="flex items-center justify-between text-xs text-rose-300 font-bold p-1 rounded bg-rose-500/10">
                                    <span>🔥 ${d.title}</span>
                                    <span class="font-mono text-[10px]">${d.deadline_time || '23:59'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- 2. Gym Recommendation -->
                <div class="p-3 rounded-xl bg-[#202225] border border-white/5 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase">
                            <i class="fas fa-dumbbell"></i> Tréninkový Split
                        </span>
                        ${data.gymToday?.length > 0 ? `
                            <span class="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                ✅ Odcvičeno
                            </span>
                        ` : ''}
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <p class="text-xs text-gray-100 font-bold">${data.gymRecommendation}</p>
                            ${data.gymSplitObj?.preferredTime ? `<p class="text-[10px] text-gray-400 font-mono">Čas: ${data.gymSplitObj.preferredTime}</p>` : ''}
                        </div>
                        ${(!data.gymToday?.length && !data.gymSplitObj?.isRest) ? `
                            <div class="flex items-center gap-1.5 flex-shrink-0">
                                <button onclick="document.getElementById('cal-briefing-modal')?.remove(); window.switchChannel('gym-tracker'); if (window.Gym) window.Gym.startSplitWorkout('${data.gymSplitObj?.templateId || ''}');" 
                                        class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-[10px] uppercase tracking-wider transition shadow-md shadow-amber-500/20 flex items-center gap-1">
                                    <i class="fas fa-play text-[9px]"></i> Začít
                                </button>
                                <button onclick="if (window.Gym) window.Gym.shiftActiveSplitDays(1);" 
                                        title="Posunout split o +1 den"
                                        class="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 flex items-center justify-center text-[10px] transition">
                                    <i class="fas fa-forward"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- 3. Planned Date & Romantic Goals -->
                ${data.plannedDate ? `
                    <div class="p-3 rounded-xl bg-pink-950/20 border border-pink-500/30">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-xs font-black text-pink-300 flex items-center gap-1.5 uppercase">
                                <i class="fas fa-heart"></i> Dnešní Společný Plán
                            </span>
                            <span class="text-xs font-mono text-pink-200">${data.plannedDate.time || ''}</span>
                        </div>
                        <p class="text-xs text-white font-black">${data.plannedDate.name}</p>
                    </div>
                ` : ''}

                <!-- 4. Sleep Debt & Water -->
                <div class="grid grid-cols-2 gap-2">
                    <div class="p-2.5 rounded-xl bg-[#202225] border border-white/5">
                        <span class="text-[10px] font-black uppercase text-purple-300 block mb-0.5">Spánek</span>
                        <span class="text-xs font-mono font-bold text-white">${data.sleepDebtStr}</span>
                    </div>
                    <div class="p-2.5 rounded-xl bg-[#202225] border border-white/5">
                        <span class="text-[10px] font-black uppercase text-cyan-300 block mb-0.5">Voda</span>
                        <span class="text-xs font-mono font-bold text-white">${data.waterCount} / 8 sklenic</span>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 mt-4 pt-3 border-t border-white/10">
                <button onclick="document.getElementById('cal-briefing-modal').remove()" class="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition">
                    Zavřít
                </button>
                <button onclick="Calendar.copyBriefingDiscord('${encodeURIComponent(data.discordText)}')" class="flex-1 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-[#5865F2]/20">
                    <i class="fas fa-copy"></i> Kopírovat na Discord
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

export function copyBriefingDiscord(encodedText) {
    triggerHaptic('medium');
    const text = decodeURIComponent(encodedText);
    navigator.clipboard?.writeText(text).then(() => {
        const btn = document.querySelector('#cal-briefing-modal button i.fa-copy')?.parentElement;
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> Zkopírováno!';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i> Kopírovat na Discord';
            }, 2000);
        }
    }).catch(err => {
        console.warn('Clipboard write failed:', err);
    });
}
