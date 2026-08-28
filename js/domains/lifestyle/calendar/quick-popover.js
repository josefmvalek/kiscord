/**
 * Quick Popovers for Kiscord Calendar
 * High-speed context popovers for 1-click event creation, checklist toggles,
 * and quick event previews without opening heavy full-screen modals.
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { supabase } from '@core/supabase.js';
import { showDayDetail } from './day-modal.js';
import { toggleChecklistItem } from './sections-plans.js';
import { getWeatherForDate } from './weather.js';

let activePopover = null;

export function closeQuickPopovers() {
    const existing = document.getElementById('cal-quick-popover');
    if (existing) {
        existing.remove();
    }
    activePopover = null;
}

/**
 * Opens 1-click Quick Add Popover positioned near the target slot.
 * @param {HTMLElement} targetElement 
 * @param {string} dateKey "YYYY-MM-DD"
 * @param {string} timeStr "HH:MM"
 */
export function showQuickAddPopover(targetElement, dateKey, timeStr = '12:00') {
    closeQuickPopovers();
    triggerHaptic('light');

    const popover = document.createElement('div');
    popover.id = 'cal-quick-popover';
    popover.className = 'cal-quick-popover absolute z-50 bg-[#2f3136] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md w-80 text-white animate-fade-in select-none';
    
    // Position popover safely relative to target or viewport
    positionPopover(popover, targetElement);

    popover.innerHTML = `
        <div class="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#5865F2] animate-pulse"></span>
                <h4 class="text-xs font-black uppercase tracking-wider text-gray-200">Rychle naplánovat</h4>
            </div>
            <button onclick="Calendar.closePopovers()" class="text-gray-400 hover:text-white transition p-1 text-sm">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Quick Type Selector Tabs -->
        <div class="grid grid-cols-3 gap-1 p-1 bg-[#202225] rounded-xl mb-3 border border-white/5 text-[11px] font-bold text-center">
            <button type="button" id="qadd-type-gym" onclick="Calendar.setQuickAddType('gym')" class="qadd-type-btn py-1.5 rounded-lg transition bg-[#faa61a]/20 text-[#faa61a] border border-[#faa61a]/30">
                🏋️ Gym
            </button>
            <button type="button" id="qadd-type-date" onclick="Calendar.setQuickAddType('date')" class="qadd-type-btn py-1.5 rounded-lg transition text-gray-400 hover:text-gray-200">
                ❤️ Rande
            </button>
            <button type="button" id="qadd-type-fit" onclick="Calendar.setQuickAddType('fit')" class="qadd-type-btn py-1.5 rounded-lg transition text-gray-400 hover:text-gray-200">
                🎓 FIT
            </button>
        </div>

        <!-- Form Fields -->
        <form id="cal-quick-add-form" onsubmit="Calendar.handleQuickAddSubmit(event, '${dateKey}')" class="space-y-2.5">
            <input type="hidden" id="qadd-selected-type" value="gym" />
            <input type="hidden" id="qadd-date-key" value="${dateKey}" />

            <!-- Title / Name Input -->
            <div>
                <label class="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Název aktivity</label>
                <input type="text" id="qadd-title" required placeholder="Např. Push Day, Večeře, WIS..." 
                       class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2] transition" />
            </div>

            <!-- Time & Duration Inputs -->
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Čas začátku</label>
                    <input type="time" id="qadd-time" value="${timeStr}" required
                           class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2] transition" />
                </div>
                <div>
                    <label class="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Délka (min)</label>
                    <input type="number" id="qadd-duration" value="60" min="15" max="360" step="15"
                           class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2] transition" />
                </div>
            </div>

            <!-- Category / Tag Details (Contextual) -->
            <div id="qadd-cat-wrapper" class="hidden">
                <label class="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Kategorie rande</label>
                <select id="qadd-date-cat" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]">
                    <option value="food">🍔 Jídlo / Večeře</option>
                    <option value="movie">🎬 Film / Kino</option>
                    <option value="walk">🌲 Procházka / Výlet</option>
                    <option value="fun">⚡ Zábava</option>
                    <option value="game">🎮 Hraní her</option>
                    <option value="date" selected>📍 Rande / Schůzka</option>
                </select>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2 pt-2 border-t border-white/5">
                <button type="button" onclick="Calendar.closePopovers()" class="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition">
                    Zrušit
                </button>
                <button type="submit" class="flex-[2] py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-extrabold shadow-md shadow-[#5865F2]/25 transition flex items-center justify-center gap-1.5">
                    <i class="fas fa-check text-xs"></i> Uložit plán
                </button>
            </div>
        </form>
    `;

    document.body.appendChild(popover);
    activePopover = popover;

    // Focus title input immediately
    setTimeout(() => {
        const input = document.getElementById('qadd-title');
        if (input) input.focus();
    }, 50);
}

/**
 * Toggles quick add type tab in the popover.
 */
export function setQuickAddType(type) {
    const typeInput = document.getElementById('qadd-selected-type');
    const catWrapper = document.getElementById('qadd-cat-wrapper');
    const titleInput = document.getElementById('qadd-title');
    if (typeInput) typeInput.value = type;

    // Update tab styles
    const tabs = ['gym', 'date', 'fit'];
    tabs.forEach(t => {
        const btn = document.getElementById(`qadd-type-btn-${t}`) || document.getElementById(`qadd-type-${t}`);
        if (btn) {
            if (t === type) {
                const color = t === 'gym' ? 'bg-[#faa61a]/20 text-[#faa61a] border-[#faa61a]/30' :
                              t === 'date' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' :
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                btn.className = `qadd-type-btn py-1.5 rounded-lg transition border font-bold ${color}`;
            } else {
                btn.className = 'qadd-type-btn py-1.5 rounded-lg transition text-gray-400 hover:text-gray-200 border-transparent';
            }
        }
    });

    if (catWrapper) {
        catWrapper.classList.toggle('hidden', type !== 'date');
    }

    if (titleInput && !titleInput.value) {
        if (type === 'gym') titleInput.placeholder = 'Push Day / Trénink...';
        else if (type === 'date') titleInput.placeholder = 'Večeře, Kino, Procházka...';
        else if (type === 'fit') titleInput.placeholder = 'Projekt WIS, Příprava na lab...';
    }
}

/**
 * Handles Quick Add form submission.
 */
export async function handleQuickAddSubmit(event, dateKey) {
    if (event) event.preventDefault();
    triggerHaptic('success');

    const type = document.getElementById('qadd-selected-type')?.value || 'gym';
    const title = document.getElementById('qadd-title')?.value?.trim();
    const time = document.getElementById('qadd-time')?.value || '12:00';
    const duration = parseInt(document.getElementById('qadd-duration')?.value, 10) || 60;
    const cat = document.getElementById('qadd-date-cat')?.value || 'date';

    if (!title) return;

    if (type === 'gym') {
        // Create planned gym workout entry
        if (!state.plannedDates) state.plannedDates = {};
        state.plannedDates[dateKey] = {
            id: `plan-${Date.now()}`,
            name: title.includes('🏋️') ? title : `🏋️‍♂️ ${title}`,
            cat: 'gym',
            time: time,
            status: 'confirmed',
            checklist: []
        };

        // Also add optimistic gym log entry if desired
        try {
            await supabase.from('planned_dates').upsert({
                date_key: dateKey,
                name: state.plannedDates[dateKey].name,
                cat: 'gym',
                time: time,
                status: 'confirmed'
            });
        } catch (e) {
            console.warn('[QuickAdd] Supabase save warning:', e);
        }
    } else if (type === 'date') {
        if (!state.plannedDates) state.plannedDates = {};
        state.plannedDates[dateKey] = {
            id: `plan-${Date.now()}`,
            name: title,
            cat: cat,
            time: time,
            status: 'idea',
            checklist: []
        };

        try {
            await supabase.from('planned_dates').upsert({
                date_key: dateKey,
                name: title,
                cat: cat,
                time: time,
                status: 'idea'
            });
        } catch (e) {
            console.warn('[QuickAdd] Supabase save warning:', e);
        }
    } else if (type === 'fit') {
        if (!state.schoolDeadlines) state.schoolDeadlines = [];
        const newDeadline = {
            id: `fit-${Date.now()}`,
            deadline_date: dateKey,
            deadline_time: time,
            title: title,
            subject_code: 'FIT',
            is_completed: false
        };
        state.schoolDeadlines.push(newDeadline);

        try {
            await supabase.from('school_deadlines').insert(newDeadline);
        } catch (e) {
            console.warn('[QuickAdd] Supabase save warning:', e);
        }
    }

    closeQuickPopovers();

    // Re-render active view
    if (window.Calendar?.renderCalendar) {
        window.Calendar.renderCalendar();
    }
}

/**
 * Opens floating detail preview popover for an existing event.
 * @param {HTMLElement} targetElement 
 * @param {object} eventData 
 * @param {string} dateKey 
 */
export function showEventDetailPopover(targetElement, eventData, dateKey) {
    closeQuickPopovers();
    triggerHaptic('light');

    const popover = document.createElement('div');
    popover.id = 'cal-quick-popover';
    popover.className = 'cal-quick-popover absolute z-50 bg-[#2f3136] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md w-80 text-white animate-fade-in select-none';
    
    positionPopover(popover, targetElement);

    let contentHtml = '';
    const type = eventData.type || 'date';

    if (type === 'fit') {
        contentHtml = `
            <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">[${eventData.code || 'FIT'}]</span>
                <span class="text-xs font-bold text-gray-400">${eventData.classType || 'Výuka'}</span>
            </div>
            <h3 class="text-sm font-extrabold text-white mb-2 leading-tight">${eventData.title}</h3>
            <div class="space-y-1 text-xs text-gray-300 mb-3 bg-[#202225] p-2.5 rounded-xl border border-white/5">
                <div class="flex items-center justify-between">
                    <span class="text-gray-400"><i class="far fa-clock"></i> Čas:</span>
                    <span class="font-mono font-bold text-emerald-300">${eventData.startTime} - ${eventData.endTime || ''}</span>
                </div>
                ${eventData.room ? `
                    <div class="flex items-center justify-between">
                        <span class="text-gray-400"><i class="fas fa-map-marker-alt"></i> Učebna:</span>
                        <span class="font-bold text-gray-200">${eventData.room}</span>
                    </div>
                ` : ''}
            </div>
            <button onclick="window.switchChannel('schedule'); Calendar.closePopovers();" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5">
                <i class="fas fa-graduation-cap"></i> Kompletní rozvrh
            </button>
        `;
    } else if (type === 'gym') {
        const log = eventData.raw || {};
        const exercises = log.exercises || [];
        contentHtml = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">🏋️ POSILOVNA</span>
                <span class="text-xs font-mono text-gray-400">${eventData.startTime || '16:00'}</span>
            </div>
            <h3 class="text-sm font-extrabold text-white mb-1.5">${eventData.title}</h3>
            <div class="text-[11px] text-gray-400 mb-3 flex items-center gap-2">
                <span>⏱️ ${eventData.durationMinutes || 60} min</span>
                ${exercises.length > 0 ? `<span>• ${exercises.length} cviků</span>` : ''}
            </div>
            ${exercises.length > 0 ? `
                <div class="space-y-1 max-h-28 overflow-y-auto custom-scrollbar bg-[#202225] p-2 rounded-xl border border-white/5 mb-3 text-xs">
                    ${exercises.slice(0, 4).map(ex => `
                        <div class="flex justify-between text-gray-300 text-[11px]">
                            <span class="truncate">${ex.exercise_name || ex.name}</span>
                            <span class="font-mono text-amber-400 ml-2">${(ex.sets || []).length}x</span>
                        </div>
                    `).join('')}
                    ${exercises.length > 4 ? `<div class="text-[10px] text-gray-500 text-center">+${exercises.length - 4} dalších cviků</div>` : ''}
                </div>
            ` : ''}
            <div class="flex gap-2">
                <button onclick="Calendar.showDayDetail('${dateKey}'); Calendar.closePopovers();" class="flex-1 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition">
                    Zobrazit trénink
                </button>
            </div>
        `;
    } else if (type === 'date') {
        const plan = eventData.raw || {};
        const checklist = plan.checklist || [];
        contentHtml = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">❤️ SPOLEČNÝ PLÁN</span>
                <span class="text-xs font-mono text-gray-400">${eventData.startTime || 'Celý den'}</span>
            </div>
            <h3 class="text-sm font-extrabold text-white mb-2">${eventData.title}</h3>
            ${checklist.length > 0 ? `
                <div class="space-y-1.5 bg-[#202225] p-2.5 rounded-xl border border-white/5 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                    <span class="text-[9px] font-black uppercase text-gray-400 tracking-wider block mb-1">Checklist:</span>
                    ${checklist.map((item, idx) => `
                        <div class="flex items-center gap-2 text-xs cursor-pointer group" onclick="Calendar.quickToggleChecklist('${dateKey}', ${idx})">
                            <i class="fas ${item.done ? 'fa-check-circle text-[#5865F2]' : 'fa-circle text-gray-600 group-hover:text-gray-400'} text-xs"></i>
                            <span class="${item.done ? 'line-through text-gray-500' : 'text-gray-200'} truncate">${item.text}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="flex gap-2">
                <button onclick="Calendar.showDayDetail('${dateKey}'); Calendar.closePopovers();" class="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition">
                    Upravit v detailu
                </button>
                <button onclick="Calendar.deletePlannedDate('${dateKey}'); Calendar.closePopovers();" class="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    } else if (type === 'deadline') {
        const dl = eventData.raw || {};
        contentHtml = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">🔥 FIT DEADLINE</span>
                <span class="text-xs font-mono text-rose-300 font-bold">${dl.deadline_time || '23:59'}</span>
            </div>
            <h3 class="text-sm font-extrabold text-white mb-3">${dl.title}</h3>
            <div class="flex gap-2">
                <button onclick="Calendar.showDayDetail('${dateKey}'); Calendar.closePopovers();" class="flex-1 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition">
                    Detail termínu
                </button>
            </div>
        `;
    } else if (type === 'split-routine') {
        contentHtml = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <span>⚡</span> TRÉNINKOVÝ SPLIT
                </span>
                <span class="text-xs font-mono text-gray-400">${eventData.startTime || '17:00'}</span>
            </div>
            <h3 class="text-sm font-extrabold text-white mb-1">${eventData.title}</h3>
            <p class="text-[11px] text-gray-400 mb-3 font-medium">Naplánovaný trénink podle tvého aktivního splitu.</p>
            <div class="flex gap-2">
                <button onclick="Calendar.closePopovers(); window.switchChannel('gym-tracker'); if (window.Gym) window.Gym.startSplitWorkout('${eventData.templateId || ''}');" class="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5">
                    <i class="fas fa-play text-[10px]"></i> Začít trénink
                </button>
                <button onclick="Calendar.closePopovers(); if (window.Gym) window.Gym.shiftActiveSplitDays(1);" class="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition flex items-center justify-center" title="Posunout split o +1 den">
                    <i class="fas fa-forward mr-1"></i> +1 den
                </button>
            </div>
        `;
    }


    popover.innerHTML = `
        <div class="flex justify-end -mt-1 -mr-1 mb-1">
            <button onclick="Calendar.closePopovers()" class="text-gray-400 hover:text-white transition p-1 text-xs">
                <i class="fas fa-times"></i>
            </button>
        </div>
        ${contentHtml}
    `;

    document.body.appendChild(popover);
    activePopover = popover;
}

let hudTimeout = null;
let activeHUD = null;

/**
 * Shows floating Micro-HUD day preview after short hover delay (Zen Peek).
 */
export function showDayHoverHUD(targetElement, dateKey) {
    clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => {
        // Do not open HUD if a modal or another popover is open
        if (document.getElementById('cal-quick-popover') || document.getElementById('cal-nlp-modal') || document.getElementById('cal-export-modal') || document.getElementById('cal-briefing-modal') || document.getElementById('cal-day-modal')) {
            return;
        }

        hideDayHoverHUD();

        const health = (state.healthData || {})[dateKey] || {};
        const plannedDate = (state.plannedDates || {})[dateKey];
        const gymLogs = (state.gymLogs || []).filter(l => l.date_key === dateKey);
        const deadlines = (state.schoolDeadlines || []).filter(d => d.deadline_date === dateKey);
        const dayShifts = (state.shifts || {})[dateKey] || (state.workEntries || {})[dateKey];
        const movieHistory = (state.movieHistory || {})[dateKey];
        const dayDiary = (state.diaryEntries || {})[dateKey] || (state.workDiary || {})[dateKey];
        const weather = getWeatherForDate(dateKey);

        // Format Date
        const [y, m, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
        const monthNames = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
        const dateFormatted = `${dayNames[dateObj.getDay()]} ${d}. ${monthNames[m - 1]}`;

        const hud = document.createElement('div');
        hud.id = 'cal-day-hover-hud';
        hud.className = 'cal-day-hover-hud cal-zen-peek-popover cal-zen-peek-anim';
        hud.onmouseenter = () => clearTimeout(hudTimeout);
        hud.onmouseleave = () => hideDayHoverHUD();

        // Biometrics pills
        const waterVal = health.water_count ?? health.water;
        const sleepVal = health.sleep_hours ?? health.sleep;
        const moodVal = health.mood_score ?? health.mood;

        let biometricsHtml = '';
        if (waterVal || sleepVal || moodVal) {
            biometricsHtml = `
                <div class="grid grid-cols-3 gap-1.5 p-2 bg-[#202225]/80 rounded-xl mb-2.5 border border-white/5 text-center text-[10px]">
                    <div class="flex flex-col items-center">
                        <span class="text-gray-400 text-[8px] font-bold uppercase tracking-wider">Spánek</span>
                        <span class="font-black text-purple-300 font-mono">${sleepVal ? `${sleepVal}h` : '-'}</span>
                    </div>
                    <div class="flex flex-col items-center border-x border-white/5">
                        <span class="text-gray-400 text-[8px] font-bold uppercase tracking-wider">Voda</span>
                        <span class="font-black text-cyan-300 font-mono">${waterVal ? `${waterVal}/8` : '-'}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="text-gray-400 text-[8px] font-bold uppercase tracking-wider">Nálada</span>
                        <span class="font-black text-pink-300 font-mono">${moodVal ? `${moodVal}/10` : '-'}</span>
                    </div>
                </div>
            `;
        }

        // Events list
        let eventsListHtml = '';

        if (plannedDate) {
            eventsListHtml += `
                <div class="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30 text-xs text-pink-100 flex items-start gap-2 mb-1.5">
                    <span class="text-sm">❤️</span>
                    <div class="min-w-0 flex-1">
                        <div class="font-black truncate">${plannedDate.name}</div>
                        ${plannedDate.time ? `<div class="text-[9px] text-pink-300/80 font-mono">${plannedDate.time} (${plannedDate.durationMinutes || 90}m)</div>` : ''}
                    </div>
                </div>
            `;
        }

        if (gymLogs.length > 0) {
            gymLogs.forEach(l => {
                const mins = Math.round((l.duration_seconds || 0) / 60);
                eventsListHtml += `
                    <div class="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-100 flex items-start gap-2 mb-1.5">
                        <span class="text-sm">🏋️‍♂️</span>
                        <div class="min-w-0 flex-1">
                            <div class="font-black truncate">${l.name}</div>
                            <div class="text-[9px] text-amber-300/80 font-mono">${mins > 0 ? `${mins} min odcvičeno` : 'Posilovna'}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (deadlines.length > 0) {
            deadlines.forEach(dl => {
                eventsListHtml += `
                    <div class="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-100 flex items-start gap-2 mb-1.5">
                        <span class="text-sm">🔥</span>
                        <div class="min-w-0 flex-1">
                            <div class="font-black truncate">[${dl.subject_code || 'FIT'}] ${dl.title}</div>
                            <div class="text-[9px] text-rose-300/80 font-mono">Do ${dl.deadline_time || '23:59'}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (movieHistory && movieHistory.length > 0) {
            eventsListHtml += `
                <div class="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-100 flex items-start gap-2 mb-1.5">
                    <span class="text-sm">🎬</span>
                    <div class="min-w-0 flex-1">
                        <div class="font-black truncate">Sledovaný film / seriál</div>
                    </div>
                </div>
            `;
        }

        if (!eventsListHtml) {
            eventsListHtml = `<div class="text-center py-2 text-xs text-gray-500 font-medium">Žádné naplánované události</div>`;
        }

        hud.innerHTML = `
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black text-white">${dateFormatted}</span>
                    <span class="text-[10px] text-amber-300/90 font-bold flex items-center gap-0.5 ml-1" title="${weather.condition}: ${weather.temp}">
                        <span>${weather.icon}</span><span>${weather.temp}</span>
                    </span>
                </div>
            </div>
            ${biometricsHtml}
            <div class="max-h-44 overflow-y-auto custom-scrollbar space-y-1 mb-2.5">
                ${eventsListHtml}
            </div>
            <!-- Quick Actions Footer -->
            <div class="flex items-center gap-1.5 pt-2 border-t border-white/10">
                <button type="button" 
                        onclick="Calendar.quickAddWater('${dateKey}', event)" 
                        title="Vypít sklenici vody (+1 💧)"
                        class="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500 text-cyan-200 hover:text-white border border-cyan-400/30 text-[9px] font-black transition flex items-center gap-1 shadow-sm">
                    <i class="fas fa-tint text-[8px]"></i>+1 Voda
                </button>
                <button type="button" 
                        onclick="Calendar.openQuickAdd(null, '${dateKey}'); Calendar.hideDayHoverHUD();" 
                        title="Rychle naplánovat novou událost"
                        class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[9px] font-black transition flex items-center gap-1">
                    <i class="fas fa-plus text-[8px]"></i>Plán
                </button>
                <button type="button" 
                        onclick="Calendar.showDayDetail('${dateKey}'); Calendar.hideDayHoverHUD();" 
                        class="ml-auto px-2.5 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-[9px] font-black transition shadow-md shadow-[#5865F2]/25 flex items-center gap-1">
                    Detail <i class="fas fa-chevron-right text-[7px]"></i>
                </button>
            </div>
        `;

        positionHUD(hud, targetElement);
        document.body.appendChild(hud);
        activeHUD = hud;
    }, 200);
}

/**
 * Hides and removes the floating HUD preview.
 */
export function hideDayHoverHUD() {
    clearTimeout(hudTimeout);
    if (activeHUD) {
        activeHUD.remove();
        activeHUD = null;
    }
    const existing = document.getElementById('cal-day-hover-hud');
    if (existing) existing.remove();
}

/**
 * Positions HUD safely above or below target cell.
 */
function positionHUD(hud, targetElement) {
    if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') return;

    const rect = targetElement.getBoundingClientRect();
    const hudWidth = 290;
    const hudHeight = 240;
    const padding = 12;

    let left = rect.left + (rect.width / 2) - (hudWidth / 2);
    let top = rect.top - hudHeight - 8;

    // Viewport bounds
    if (left + hudWidth > window.innerWidth - padding) {
        left = window.innerWidth - hudWidth - padding;
    }
    if (left < padding) {
        left = padding;
    }
    if (top < padding) {
        top = rect.bottom + 8; // flip below if not enough space above
    }

    hud.style.top = `${top}px`;
    hud.style.left = `${left}px`;
}

/**
 * 1-Click toggle checklist item directly from the floating event popover.
 */
export async function quickToggleChecklist(dateKey, itemIndex) {
    triggerHaptic('light');
    await toggleChecklistItem(dateKey, itemIndex);
    
    // Refresh open popover with latest state
    const plan = (state.plannedDates || {})[dateKey];
    if (plan && activePopover) {
        showEventDetailPopover(activePopover, { type: 'date', title: plan.name, startTime: plan.time, raw: plan }, dateKey);
    }
}

/**
 * Safely calculates bounding box coordinates so the popover never goes off-screen.
 */
function positionPopover(popover, targetElement) {
    if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') {
        popover.style.top = '50%';
        popover.style.left = '50%';
        popover.style.transform = 'translate(-50%, -50%)';
        return;
    }

    const rect = targetElement.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 280;
    const padding = 12;

    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);

    // Ensure within viewport bounds
    if (left + popoverWidth > window.innerWidth - padding) {
        left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) {
        left = padding;
    }
    if (top + popoverHeight > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - popoverHeight - 8);
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
}

