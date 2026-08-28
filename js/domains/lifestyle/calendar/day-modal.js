/**
 * Main Day Detail Modal Controller for Kiscord Calendar (Day Modal 3.0 Bento Edition)
 * Provides an ultra-luxurious Bento Dashboard for health biometrics, cycle phase prediction,
 * gym logs, romantic dates with Watchlist picker, VUT FIT schedule, historical memories, and Discord export.
 */

import { state } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { getMoodColor, getMoodLabel } from './month-view.js';
import { SHIFT_PRESETS } from '@domains/archive/shifts.js';
import { setCurrentModalDateKey, getCurrentModalDateKey } from './state.js';
import { renderGymSectionHtml } from './sections-gym.js';
import { renderDiarySectionHtml } from './sections-diary.js';
import { formatDateKey, parseDateKey, getAnniversaryMemories } from './time-engine.js';
import { getWeatherForDate } from './weather.js';
import { supabase } from '@core/supabase.js';
import { calculateCurrentCycleState } from '@domains/fitness/cycle/cycleEngine.js';

export function ensureModals() {
    let modal = document.getElementById("day-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "day-modal";
        modal.className = "fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in";
        modal.onclick = (e) => {
            if (e.target === modal) closeDayModal();
        };

        modal.innerHTML = `
            <div id="day-modal-container" class="cal-bottom-sheet bg-[#2f3136] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-white animate-scale-up">
                <!-- MOBILE DRAG HANDLE (Pull-to-Dismiss) -->
                <div class="w-full flex sm:hidden items-center justify-center pt-2.5 pb-1 bg-[#202225] cursor-grab" id="modal-drag-handle">
                    <div class="w-12 h-1.5 bg-white/25 rounded-full"></div>
                </div>

                <!-- HERO HEADER -->
                <div class="px-4 sm:px-5 py-3 sm:py-4 bg-[#202225] border-b border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
                    <div class="flex items-center gap-2">
                        <button type="button" 
                                onclick="Calendar.stepDayModal(-1)" 
                                title="Předchozí den (←)"
                                class="cal-day-nav-btn">
                            <i class="fas fa-chevron-left text-xs"></i>
                        </button>
                        <div>
                            <h3 id="modal-date-title" class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                Datum
                            </h3>
                            <div id="modal-date-subtitle" class="text-[11px] text-gray-400 flex items-center gap-2 font-medium">
                                Den v týdnu
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button type="button" 
                                onclick="Calendar.copyDayDiscordCard(Calendar.getCurrentModalDateKey())" 
                                title="Zkopírovat plán dne naformátovaný pro Discord"
                                class="px-2.5 py-1.5 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95">
                            <i class="fab fa-discord text-xs"></i>
                            <span class="hidden sm:inline">Discord</span>
                        </button>
                        <button type="button" 
                                onclick="Calendar.stepDayModal(1)" 
                                title="Následující den (→)"
                                class="cal-day-nav-btn">
                            <i class="fas fa-chevron-right text-xs"></i>
                        </button>
                        <button type="button" 
                                onclick="Calendar.closeDayModal()" 
                                class="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center text-sm ml-1">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- BENTO SCROLLABLE BODY -->
                <div id="day-modal-body" class="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    <!-- Dynamic Bento Cards Content -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const container = modal.querySelector('#day-modal-container');
        if (container) {
            let startX = 0;
            let startY = 0;
            let isSwiping = false;
            let isDraggingDown = false;

            container.addEventListener('touchstart', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('button')) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isSwiping = true;
                isDraggingDown = false;
            }, { passive: true });

            container.addEventListener('touchmove', (e) => {
                if (!isSwiping) return;
                const curX = e.touches[0].clientX;
                const curY = e.touches[0].clientY;
                const diffX = curX - startX;
                const diffY = curY - startY;

                // Vertical Pull-to-Dismiss on mobile if dragging downwards from top of modal
                if (diffY > 15 && diffY > Math.abs(diffX) * 1.2 && container.scrollTop <= 5) {
                    isDraggingDown = true;
                    container.style.transform = `translateY(${diffY * 0.65}px)`;
                    container.style.transition = 'none';
                    return;
                }

                // Horizontal day navigation swipe
                if (!isDraggingDown && Math.abs(diffX) > Math.abs(diffY) * 1.2 && Math.abs(diffX) < 140) {
                    container.style.transform = `translateX(${diffX * 0.35}px)`;
                    container.style.transition = 'none';
                }
            }, { passive: true });

            container.addEventListener('touchend', (e) => {
                if (!isSwiping) return;
                isSwiping = false;

                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY;

                // If pulled down sufficiently -> Close modal
                if (isDraggingDown) {
                    if (diffY > 70) {
                        triggerHaptic('medium');
                        container.style.transition = 'transform 0.2s ease-in';
                        container.style.transform = 'translateY(100%)';
                        setTimeout(() => {
                            closeDayModal();
                            container.style.transform = 'translateY(0px)';
                        }, 180);
                        return;
                    } else {
                        container.style.transition = 'transform 0.2s ease-out';
                        container.style.transform = 'translateY(0px)';
                        return;
                    }
                }

                container.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
                container.style.transform = 'translateX(0px)';

                if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
                    triggerHaptic('light');
                    if (diffX > 0) {
                        stepDayModal(-1);
                    } else {
                        stepDayModal(1);
                    }
                }
            }, { passive: true });
        }
    }
}

/**
 * Opens Day Detail Modal and populates Bento Dashboard.
 */
export function showDayDetail(dateKey) {
    ensureModals();
    setCurrentModalDateKey(dateKey);
    triggerHaptic('light');

    const [yr, mo, dy] = dateKey.split('-').map(Number);
    const dateObj = new Date(yr, mo - 1, dy);
    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    const monthNames = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

    const titleEl = document.getElementById("modal-date-title");
    const subEl = document.getElementById("modal-date-subtitle");
    const weather = getWeatherForDate(dateKey);

    if (titleEl) {
        titleEl.innerHTML = `
            <span>${dy}. ${monthNames[mo - 1]} ${yr}</span>
            ${dateKey === getTodayKey() ? '<span class="px-2 py-0.5 rounded-full bg-[#5865F2] text-[9px] font-black uppercase text-white shadow-sm">Dnes</span>' : ''}
        `;
    }
    if (subEl) {
        subEl.innerHTML = `
            <span>${dayNames[dateObj.getDay()]}</span>
            <span class="text-gray-500">•</span>
            <span class="text-amber-300 font-bold">${weather.icon} ${weather.temp}°C ${weather.desc}</span>
        `;
    }

    const modalBody = document.getElementById("day-modal-body");
    if (!modalBody) return;

    const health = (state.healthData || {})[dateKey] || {};
    const plannedDate = (state.plannedDates || {})[dateKey];
    const dayDeadlines = (state.schoolDeadlines || []).filter(d => d.deadline_date === dateKey);
    const daySchedule = (state.scheduleItems || []).filter(s => s.day_of_week === dateObj.getDay());
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    // --- 1. HEALTH & BIOMETRICS BENTO CARD WITH CYCLE PREDICTION ---
    const waterCount = health.water_count ?? health.water ?? 0;
    const waterPct = Math.min(100, Math.round((waterCount / 8) * 100));
    const moodVal = health.mood_score ?? health.mood ?? null;
    const moodNum = moodVal !== null ? (typeof moodVal === 'number' ? moodVal : parseInt(moodVal, 10)) : null;
    const sleepHours = health.sleep_hours ?? health.sleep ?? null;

    let moodDialHtml = '';
    for (let s = 1; s <= 10; s++) {
        const c = getMoodColor(s);
        const isActive = moodNum === s;
        moodDialHtml += `
            <button type="button" 
                    onclick="Calendar.setDayModalMood(${s})"
                    style="background-color: ${c}; color: ${s >= 8 ? '#10002B' : '#fff'};"
                    class="cal-mood-dial-btn ${isActive ? 'active ring-2 ring-white ring-offset-2 ring-offset-[#202225]' : 'opacity-70 hover:opacity-100'}"
                    title="${s}/10 - ${getMoodLabel(s)}">
                ${s}
            </button>
        `;
    }

    const supps = health.supplements || { iron: health.iron, zinc: health.zinc, magnesium: health.magnesium };

    // Calculate menstrual cycle phase if available
    let cycleInfoHtml = '';
    try {
        const cycleState = calculateCurrentCycleState(dateObj, state.cycleLogs, state.cycleSettings);
        if (cycleState && cycleState.phase) {
            cycleInfoHtml = `
                <div class="mt-3 pt-2.5 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#202225] p-2.5 rounded-2xl border border-pink-500/20">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${cycleState.phase.icon}</span>
                        <div>
                            <span class="text-[10px] font-black ${cycleState.phase.themeClass.split(' ')[0]} uppercase tracking-wider">${cycleState.phase.name} (Den ${cycleState.dayOfCycle})</span>
                            <span class="text-[9px] text-gray-300 font-medium block">${cycleState.phase.energy}</span>
                        </div>
                    </div>
                    <div class="text-[8.5px] text-pink-300/80 italic sm:max-w-[240px] sm:text-right">
                        💡 ${cycleState.phase.partnerTip}
                    </div>
                </div>
            `;
        }
    } catch (e) {}

    const healthCardHtml = `
        <div class="cal-bento-card">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
                <h4 class="text-xs font-black text-[#3ba55c] uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-heartbeat"></i> Zdraví & Biometrika
                </h4>
                <span class="text-[10px] text-gray-400 font-bold">${moodNum ? getMoodLabel(moodNum) : 'Denní přehled'}</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <!-- Water Stepper -->
                <div class="p-3 bg-[#202225] rounded-2xl border border-cyan-500/20 flex flex-col justify-between">
                    <span class="text-[9px] font-bold uppercase text-cyan-400 tracking-wider flex items-center justify-between">
                        <span>Hydratace</span>
                        <span>💧 ${waterCount}/8</span>
                    </span>
                    <div class="flex items-center justify-between my-2">
                        <button type="button" onclick="Calendar.setDayModalWater(-1)" class="w-7 h-7 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 font-black flex items-center justify-center transition active:scale-90">-</button>
                        <div class="text-center font-mono font-black text-white text-lg">${waterCount * 250} <span class="text-[10px] text-gray-400">ml</span></div>
                        <button type="button" onclick="Calendar.setDayModalWater(1)" class="w-7 h-7 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-white font-black flex items-center justify-center transition active:scale-90 shadow-sm">+</button>
                    </div>
                    <div class="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-cyan-400 h-full transition-all duration-300" style="width: ${waterPct}%;"></div>
                    </div>
                </div>

                <!-- Sleep Input -->
                <div class="p-3 bg-[#202225] rounded-2xl border border-purple-500/20 flex flex-col justify-between">
                    <span class="text-[9px] font-bold uppercase text-purple-400 tracking-wider">Spánek</span>
                    <div class="flex items-center gap-2 my-2">
                        <input type="number" 
                               step="0.5" 
                               min="0" 
                               max="24" 
                               id="modal-sleep-input"
                               value="${sleepHours !== null ? sleepHours : ''}"
                               placeholder="8.0"
                               onchange="Calendar.saveDayModalSleep('${dateKey}', this.value)"
                               class="w-full bg-black/30 border border-white/10 rounded-xl px-2.5 py-1 text-base font-mono font-bold text-purple-200 focus:outline-none focus:border-purple-500 transition" />
                        <span class="text-xs font-bold text-gray-400">hod</span>
                    </div>
                    <div class="text-[9px] text-purple-300/80 font-bold">${sleepHours ? (sleepHours >= 7.5 ? '✨ Optimální' : '🥱 Deficit') : 'Nezadáno'}</div>
                </div>

                <!-- Vitamins & Movement -->
                <div class="p-3 bg-[#202225] rounded-2xl border border-pink-500/20 flex flex-col justify-between">
                    <span class="text-[9px] font-bold uppercase text-pink-400 tracking-wider">Suplementy & Léky</span>
                    <div class="flex flex-wrap gap-1.5 my-1.5">
                        <button type="button" 
                                onclick="Calendar.toggleSupplement('${dateKey}', 'iron')"
                                class="px-2 py-1 rounded-lg text-[10px] font-bold border transition ${supps?.iron ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 border-white/10 text-gray-500'}">
                            🩸 Železo
                        </button>
                        <button type="button" 
                                onclick="Calendar.toggleSupplement('${dateKey}', 'zinc')"
                                class="px-2 py-1 rounded-lg text-[10px] font-bold border transition ${supps?.zinc ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-white/5 border-white/10 text-gray-500'}">
                            ✨ Zinek
                        </button>
                        <button type="button" 
                                onclick="Calendar.toggleSupplement('${dateKey}', 'magnesium')"
                                class="px-2 py-1 rounded-lg text-[10px] font-bold border transition ${supps?.magnesium ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-gray-500'}">
                            🌙 Hořčík
                        </button>
                    </div>
                    <span class="text-[8.5px] text-gray-400">Kliknutím přepneš splnění</span>
                </div>
            </div>

            <!-- Mood Rating Bar -->
            <div>
                <span class="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-2">Rychlé hodnocení nálady (1–10)</span>
                <div class="flex items-center justify-between gap-1 overflow-x-auto p-1 bg-[#202225] rounded-2xl border border-white/5">
                    ${moodDialHtml}
                </div>
            </div>

            ${cycleInfoHtml}
        </div>
    `;

    // --- 2. HISTORICAL ANNIVERSARY MEMORY CARD (POINT 5) ---
    const anniversaries = getAnniversaryMemories(dateKey, state.timelineEvents);
    let anniversaryCardHtml = '';
    if (anniversaries.length > 0) {
        anniversaryCardHtml = `
            <div class="cal-bento-card cal-anniversary-sparkle">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/20">
                    <h4 class="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <i class="fas fa-sparkles"></i> Tento den v minulosti
                    </h4>
                    <span class="text-[9px] font-black text-amber-400 uppercase tracking-wider">${anniversaries[0].anniversaryLabel}</span>
                </div>
                <div class="space-y-2">
                    ${anniversaries.map(a => `
                        <div class="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-amber-500/30 text-xs cursor-pointer hover:border-amber-400 transition"
                             onclick="Calendar.closeDayModal(); window.loadModule('timeline').then(m => m.jumpToTimeline('${a.id}'))">
                            <div class="flex items-center gap-2.5">
                                <span class="text-lg">${a.icon || '⭐'}</span>
                                <div>
                                    <div class="font-bold text-white">${a.title}</div>
                                    ${a.description ? `<div class="text-[10px] text-amber-200/80 italic">${a.description}</div>` : ''}
                                </div>
                            </div>
                            <span class="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Vzpomínka →</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // --- 3. ROMANTIC DATE & PLANS BENTO CARD (WITH WATCHLIST PICKER) ---
    let plansContentHtml = '';
    if (plannedDate) {
        const checklist = plannedDate.checklist || [];
        plansContentHtml = `
            <div class="p-3 bg-[#202225] rounded-2xl border border-pink-500/30">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">❤️</span>
                        <div>
                            <div class="text-sm font-black text-white">${plannedDate.name}</div>
                            ${plannedDate.time ? `<div class="text-[10px] font-mono text-pink-300">Čas: ${plannedDate.time} (${plannedDate.durationMinutes || 90} min)</div>` : ''}
                        </div>
                    </div>
                    <button onclick="Calendar.deletePlannedDate('${dateKey}')" class="text-gray-500 hover:text-rose-400 p-1 text-xs transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>

                ${checklist.length > 0 ? `
                    <div class="mt-2.5 pt-2 border-t border-white/5 space-y-1.5">
                        <span class="text-[8.5px] font-black uppercase text-gray-400 tracking-wider">Checklist plánu:</span>
                        ${checklist.map((item, idx) => `
                            <div class="flex items-center gap-2 cursor-pointer" onclick="Calendar.quickToggleChecklist('${dateKey}', ${idx})">
                                <span class="w-4 h-4 rounded flex items-center justify-center border text-[9px] ${item.done ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-600 text-transparent'}">
                                    <i class="fas fa-check"></i>
                                </span>
                                <span class="text-xs ${item.done ? 'line-through text-gray-500' : 'text-gray-200'}">${item.text}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        plansContentHtml = `
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 bg-[#202225] rounded-2xl border border-white/5 gap-2">
                <span class="text-xs text-gray-400">Žádný naplánovaný program</span>
                <div class="flex items-center gap-1.5">
                    <button onclick="Calendar.openWatchlistPicker('${dateKey}')" class="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5">
                        <i class="fas fa-film text-[10px]"></i>
                        <span>🍿 Watchlist</span>
                    </button>
                    <button onclick="Calendar.openQuickAdd(this, '${dateKey}')" class="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white border border-pink-500/30 text-xs font-bold transition flex items-center gap-1.5">
                        <i class="fas fa-plus text-[10px]"></i>
                        <span>Naplánovat</span>
                    </button>
                </div>
            </div>
        `;
    }

    const plansCardHtml = `
        <div class="cal-bento-card">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
                <h4 class="text-xs font-black text-[#eb459e] uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-heart"></i> Rande & Společné chvíle
                </h4>
            </div>
            ${plansContentHtml}
        </div>
    `;

    // --- 4. FIT SCHOOL & DEADLINES BENTO CARD ---
    let schoolContentHtml = '';
    if (!isWeekend && daySchedule.length > 0) {
        schoolContentHtml += `
            <div class="space-y-1.5 mb-2.5">
                ${daySchedule.map(s => `
                    <div class="flex items-center justify-between p-2 bg-[#202225] rounded-xl border border-emerald-500/20 text-xs">
                        <div class="flex items-center gap-2">
                            <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[9px]">[${s.subject_code}]</span>
                            <span class="font-bold text-white">${s.name}</span>
                            <span class="text-[10px] text-gray-400">• ${s.room || 'Božetěchova'}</span>
                        </div>
                        <span class="font-mono text-[10px] text-emerald-300 font-bold">${s.time_start} – ${s.time_end}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (dayDeadlines.length > 0) {
        schoolContentHtml += `
            <div class="space-y-1.5">
                <span class="text-[8.5px] font-black uppercase text-rose-400 tracking-wider">Odevzdání & Deadliny:</span>
                ${dayDeadlines.map(dl => `
                    <div class="flex items-center justify-between p-2 bg-rose-500/10 rounded-xl border border-rose-500/30 text-xs">
                        <span class="font-bold text-rose-200 truncate">[${dl.subject_code || 'FIT'}] ${dl.title}</span>
                        <span class="text-[10px] font-mono text-rose-300 font-bold">Do ${dl.deadline_time || '23:59'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (!schoolContentHtml) {
        schoolContentHtml = `<div class="text-xs text-gray-500 py-1 text-center">${isWeekend ? '🌴 Víkend bez výuky' : 'Žádná výuka ani deadliny'}</div>`;
    }

    const schoolCardHtml = `
        <div class="cal-bento-card">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
                <h4 class="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-graduation-cap"></i> VUT FIT Škola
                </h4>
            </div>
            ${schoolContentHtml}
        </div>
    `;

    // --- 5. GYM & WORKOUTS BENTO CARD ---
    const gymHtml = renderGymSectionHtml(dateKey);
    const gymCardHtml = `
        <div class="cal-bento-card">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
                <h4 class="text-xs font-black text-[#faa61a] uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-dumbbell"></i> Posilovna & Tréninky
                </h4>
            </div>
            ${gymHtml || '<div class="text-xs text-gray-500 py-1 text-center">Žádný zaznamenaný trénink</div>'}
        </div>
    `;

    // --- 6. DIARY BENTO CARD ---
    const diaryHtml = renderDiarySectionHtml(dateKey);
    const diaryCardHtml = `
        <div class="cal-bento-card">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
                <h4 class="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-book"></i> Alpský Deníček
                </h4>
            </div>
            ${diaryHtml || '<div class="text-xs text-gray-500 py-1 text-center">Žádný zápis v deníčku</div>'}
        </div>
    `;

    modalBody.innerHTML = `
        ${healthCardHtml}
        ${anniversaryCardHtml}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${plansCardHtml}
            ${schoolCardHtml}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${gymCardHtml}
            ${diaryCardHtml}
        </div>
    `;

    const modal = document.getElementById("day-modal");
    if (modal) modal.classList.remove("hidden");
    if (modal) modal.style.display = "flex";
}

export function closeDayModal() {
    const modal = document.getElementById("day-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
    }
    setCurrentModalDateKey(null);
}

/**
 * Steps day modal backward or forward by 1 day.
 */
export function stepDayModal(direction) {
    const currentKey = getCurrentModalDateKey();
    if (!currentKey) return;
    const [y, m, d] = currentKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + direction);
    const nextKey = formatDateKey(date);
    showDayDetail(nextKey);
}

/**
 * Opens Watchlist & Shared Movies Picker Modal.
 */
export function openWatchlistPicker(dateKey) {
    const movies = [...(state.library?.movies || []), ...(state.watchlist || [])];
    const uniqueMap = new Map();
    movies.forEach(m => {
        if (m && m.title && !uniqueMap.has(m.title)) {
            uniqueMap.set(m.title, m);
        }
    });

    const list = Array.from(uniqueMap.values());

    const modal = document.createElement('div');
    modal.id = 'cal-watchlist-picker-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    modal.innerHTML = `
        <div class="bg-[#2f3136] border border-white/10 rounded-3xl p-5 shadow-2xl w-full max-w-lg text-white max-h-[80vh] flex flex-col">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🍿</span>
                    <div>
                        <h3 class="text-sm font-black text-white">Spolu-seznam Filmů & Seriálů</h3>
                        <p class="text-[10px] text-gray-400">1-klikem naplánuj filmový večer</p>
                    </div>
                </div>
                <button onclick="document.getElementById('cal-watchlist-picker-modal')?.remove()" class="text-gray-400 hover:text-white p-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="overflow-y-auto space-y-2 flex-1 pr-1 custom-scrollbar">
                ${list.length > 0 ? list.map(item => `
                    <div class="flex items-center justify-between p-2.5 bg-[#202225] hover:bg-[#5865F2]/20 border border-white/5 hover:border-[#5865F2]/40 rounded-2xl transition cursor-pointer"
                         onclick="Calendar.selectWatchlistMovie('${dateKey}', '${item.title.replace(/'/g, "\\'")}', '20:00', '${item.icon || '🎬'}')">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">${item.icon || '🎬'}</span>
                            <div>
                                <div class="text-xs font-bold text-white">${item.title}</div>
                                <div class="text-[10px] text-gray-400">${item.genre || item.category || 'Film / Seriál'} ${item.rating ? `• ⭐ ${item.rating}` : ''}</div>
                            </div>
                        </div>
                        <button class="px-2.5 py-1 rounded-xl bg-[#5865F2] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                            Naplánovat
                        </button>
                    </div>
                `).join('') : '<div class="text-center py-6 text-xs text-gray-400">Váš Watchlist je zatím prázdný. Přidejte filmy v sekci Knihovna!</div>'}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Selects a movie from the Watchlist and schedules it into plannedDates.
 */
export async function selectWatchlistMovie(dateKey, title, time = '20:00', icon = '🎬') {
    state.plannedDates = state.plannedDates || {};
    state.plannedDates[dateKey] = {
        name: `${icon} ${title}`,
        time,
        cat: 'movie',
        status: 'confirmed',
        durationMinutes: 120,
        checklist: [
            { text: 'Připravit popcorn 🍿', done: false },
            { text: 'Zapálit svíčky ✨', done: false }
        ]
    };

    triggerHaptic('medium');
    document.getElementById('cal-watchlist-picker-modal')?.remove();

    try {
        await supabase.from('planned_dates').upsert({
            date_key: dateKey,
            name: `${icon} ${title}`,
            time,
            cat: 'movie',
            status: 'confirmed',
            duration_minutes: 120
        });
    } catch (e) {}

    showDayDetail(dateKey);
    const { renderCalendar } = await import('./index.js');
    renderCalendar();
}

/**
 * Sets mood score directly from Bento mood dial and broadcasts Sunflower update.
 */
export async function setDayModalMood(score) {
    const dateKey = getCurrentModalDateKey();
    if (!dateKey) return;

    state.healthData = state.healthData || {};
    state.healthData[dateKey] = state.healthData[dateKey] || {};
    state.healthData[dateKey].mood_score = score;
    state.healthData[dateKey].mood = score;

    triggerHaptic('medium');

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('health-data-updated', { detail: { dateKey, health: state.healthData[dateKey] } }));
        window.dispatchEvent(new CustomEvent('health-updated', { detail: { dateKey, health: state.healthData[dateKey] } }));
    }

    try {
        await supabase.from('health_data').upsert({
            date_key: dateKey,
            mood_score: score,
            updated_at: new Date().toISOString()
        });
    } catch (e) {}

    showDayDetail(dateKey);
}

/**
 * Updates water counter directly from Bento stepper and broadcasts Sunflower update.
 */
export async function setDayModalWater(delta) {
    const dateKey = getCurrentModalDateKey();
    if (!dateKey) return;

    state.healthData = state.healthData || {};
    state.healthData[dateKey] = state.healthData[dateKey] || {};
    const cur = state.healthData[dateKey].water_count ?? state.healthData[dateKey].water ?? 0;
    const next = Math.max(0, Math.min(16, cur + delta));

    state.healthData[dateKey].water_count = next;
    state.healthData[dateKey].water = next;

    triggerHaptic('medium');

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('health-data-updated', { detail: { dateKey, health: state.healthData[dateKey] } }));
        window.dispatchEvent(new CustomEvent('health-updated', { detail: { dateKey, health: state.healthData[dateKey] } }));
    }

    try {
        await supabase.from('health_data').upsert({
            date_key: dateKey,
            water_count: next,
            updated_at: new Date().toISOString()
        });
    } catch (e) {}

    showDayDetail(dateKey);
}

/**
 * Saves sleep duration from Bento input.
 */
export async function saveDayModalSleep(dateKey, hoursVal) {
    const hours = parseFloat(hoursVal);
    if (isNaN(hours)) return;

    state.healthData = state.healthData || {};
    state.healthData[dateKey] = state.healthData[dateKey] || {};
    state.healthData[dateKey].sleep_hours = hours;
    state.healthData[dateKey].sleep = hours;

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('health-data-updated', { detail: { dateKey, health: state.healthData[dateKey] } }));
        window.dispatchEvent(new CustomEvent('health-updated', { detail: { dateKey, health: state.healthData[dateKey] } }));
    }

    try {
        await supabase.from('health_data').upsert({
            date_key: dateKey,
            sleep_hours: hours,
            updated_at: new Date().toISOString()
        });
    } catch (e) {}

    showDayDetail(dateKey);
}

/**
 * Toggles a supplement badge.
 */
export async function toggleSupplement(dateKey, suppKey) {
    state.healthData = state.healthData || {};
    state.healthData[dateKey] = state.healthData[dateKey] || {};
    state.healthData[dateKey].supplements = state.healthData[dateKey].supplements || {};
    
    const cur = !!state.healthData[dateKey].supplements[suppKey];
    state.healthData[dateKey].supplements[suppKey] = !cur;
    state.healthData[dateKey][suppKey] = !cur;

    triggerHaptic('light');

    try {
        await supabase.from('health_data').upsert({
            date_key: dateKey,
            [suppKey]: !cur,
            updated_at: new Date().toISOString()
        });
    } catch (e) {}

    showDayDetail(dateKey);
}

/**
 * Copies a beautifully formatted Discord card for the current day.
 */
export async function copyDayDiscordCard(dateKey) {
    if (!dateKey) return;
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    const dateFormatted = `${dayNames[dateObj.getDay()]} ${d}.${m}.${y}`;

    const health = (state.healthData || {})[dateKey] || {};
    const plan = (state.plannedDates || {})[dateKey];
    const gymLogs = (state.gymLogs || []).filter(l => l.date_key === dateKey);
    const deadlines = (state.schoolDeadlines || []).filter(d => d.deadline_date === dateKey);

    const lines = [];
    lines.push(`**📅 Plán dne: ${dateFormatted}**`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

    if (plan) {
        lines.push(`❤️ **Rande / Plán:** ${plan.name} ${plan.time ? `(v ${plan.time})` : ''}`);
        if (plan.checklist && plan.checklist.length > 0) {
            plan.checklist.forEach(c => {
                lines.push(`  ${c.done ? '✅' : '▫️'} ${c.text}`);
            });
        }
    }

    if (gymLogs.length > 0) {
        gymLogs.forEach(g => {
            const mins = Math.round((g.duration_seconds || 0) / 60);
            lines.push(`🏋️‍♂️ **Posilovna:** ${g.name} (${mins} min)`);
        });
    }

    if (deadlines.length > 0) {
        deadlines.forEach(dl => {
            lines.push(`🔥 **FIT Deadline:** [${dl.subject_code || 'FIT'}] ${dl.title} (do ${dl.deadline_time || '23:59'})`);
        });
    }

    const water = health.water_count ?? health.water;
    const sleep = health.sleep_hours ?? health.sleep;
    const mood = health.mood_score ?? health.mood;
    if (water || sleep || mood) {
        lines.push(`✨ **Biometrika:** ${water ? `💧 ${water}/8` : ''} ${sleep ? `😴 ${sleep}h` : ''} ${mood ? `💜 ${mood}/10` : ''}`);
    }

    const text = lines.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        triggerHaptic('heavy');
    }
}
