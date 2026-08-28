/**
 * Month View Generator for Kiscord Calendar 3.0
 * Cyber-Luxe & Liquid Motion Edition
 * 
 * Features:
 * - 💧 Liquid Tank & Wave Engine: Real percentage fill with SVG waves & Aqua Aura at 8/8
 * - 💜 Mood Aura Heatmap: Full-cell radiant mesh gradients from Vivid Nightfall palette
 * - 😴 Sleep Dreamscape: Hypnogram night sky with personality avatars (👸/✨/😐/🧟‍♀️)
 * - 🏋️ Gym Intensity Flare: Amber/gold muscle pump badges & set volume counts
 * - 🎓 VUT FIT Cyber Radar: Neon class chips & urgent deadline pulses
 * - ✨ 3-Zone Life Mosaic: Masterful balance with bottom Tricorder Life-Bar
 */

import { state } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { getAnniversaryMemories } from './time-engine.js';
import { getActiveSplitForDay } from '@domains/fitness/gym/splits.js';

export function getMoodColor(val) {
    if (typeof val === 'string') val = parseInt(val, 10);
    if (isNaN(val)) return "#4b5563";
    if (val > 10) val = Math.round(val / 10);
    const colors = {
        1: "#10002B", // Dark Amethyst (Low)
        2: "#240046", 
        3: "#3C096C", // Indigo Ink
        4: "#5A189A", 
        5: "#7B2CBF", // Royal Violet
        6: "#9D4EDD", 
        7: "#C77DFF", // Mauve Magic
        8: "#E0AAFF", // Mauve
        9: "#F2D5FF", // Soft Lavender
        10: "#FFFFFF" // Pure Light (High)
    };
    return colors[val] || "#4b5563";
}

export function getMoodLabel(val) {
    if (typeof val === 'string') val = parseInt(val, 10);
    if (isNaN(val)) return "";
    if (val > 10) val = Math.round(val / 10);
    const labels = {
        1: "Krize",
        2: "Deprese",
        3: "Těžký den",
        4: "Únava",
        5: "Normál",
        6: "Fajn",
        7: "Dobrý den",
        8: "Skvělý",
        9: "Super",
        10: "Top den ✨"
    };
    return labels[val] || "";
}

export function generateFilterButtons() {
    const views = [
        { id: "all", tooltip: "Všechny plány & Mozaika dne", icon: "fa-calendar-alt", color: "bg-[#5865F2]" },
        { id: "fit", tooltip: "VUT FIT Rozvrh & Škola", icon: "fa-graduation-cap", color: "bg-emerald-600" },
        { id: "gym", tooltip: "Posilovna & Tréninky", icon: "fa-dumbbell", color: "bg-[#faa61a]" },
        { id: "sleep", tooltip: "Spánek & Odpočinek", icon: "fa-bed", color: "bg-[#9b59b6]" },
        { id: "water", tooltip: "Pitný režim (Liquid)", icon: "fa-tint", color: "bg-[#00e5ff]" },
        { id: "health", tooltip: "Zdraví & Nálada (Aura)", icon: "fa-heart", color: "bg-[#ed4245]" },
    ];

    if (!state.calendarFilter) state.calendarFilter = "all";

    return views.map((v) => {
        const isActive = state.calendarFilter === v.id;
        const style = isActive
            ? `${v.color} text-white shadow-lg shadow-black/40 border-transparent scale-105 ring-2 ring-white/40 font-black`
            : "bg-[#202225] text-gray-400 border-gray-700/60 hover:text-gray-200 hover:bg-[#2f3136] hover:border-gray-500";

        return `<button onclick="Calendar.setCalendarFilter('${v.id}')" 
                      title="${v.tooltip}"
                      aria-label="${v.tooltip}"
                      class="w-9 h-9 md:w-10 md:h-10 flex-shrink-0 rounded-xl text-sm font-bold border transition-all duration-200 flex items-center justify-center ${style}">
                <i class="fas ${v.icon} text-sm md:text-base"></i>
              </button>`;
    }).join("");
}

/**
 * Returns a summary of today's events for widgets and pinned channels.
 */
export function getTodayEventsSummary() {
    const today = getTodayKey();
    let eventsCount = 0;
    const items = [];

    // School Deadlines
    const deadlines = (state.schoolDeadlines || []).filter(d => d.deadline_date === today && !d.is_completed);
    if (deadlines.length > 0) {
        eventsCount += deadlines.length;
        items.push(...deadlines.map(d => d.title));
    }

    // Planned Dates
    const plan = (state.plannedDates || {})[today];
    if (plan) {
        eventsCount += 1;
        items.push(plan.name || plan.title);
    }

    // Custom Plans
    const customPlans = (state.customPlans || []).filter(p => p.date_key === today);
    if (customPlans.length > 0) {
        eventsCount += customPlans.length;
        items.push(...customPlans.map(p => p.title || p.name));
    }

    // Gym Logs
    const gymLogs = (state.gymLogs || []).filter(l => l.date_key === today);
    if (gymLogs.length > 0) {
        eventsCount += gymLogs.length;
        items.push(...gymLogs.map(l => l.name));
    }

    let summaryText = 'Dnes žádné plány';
    if (eventsCount === 1) {
        summaryText = `1 událost: ${items[0]}`;
    } else if (eventsCount > 1) {
        summaryText = `${eventsCount} události: ${items.slice(0, 2).join(', ')}${eventsCount > 2 ? ` (+${eventsCount - 2})` : ''}`;
    }

    return {
        eventsCount,
        summary: summaryText,
        items
    };
}

export function generateMonthView(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const anniversaryDay = state.startDate ? new Date(state.startDate).getDate() : null;
    let html = "";

    // --- PŘEDPOČÍTÁNÍ DAT (O(1) lookup pro cyklus) ---
    const gymMap = new Map();
    (state.gymLogs || []).forEach(l => {
        if (!l.date_key) return;
        if (!gymMap.has(l.date_key)) gymMap.set(l.date_key, []);
        gymMap.get(l.date_key).push(l);
    });

    const libraryMap = new Map();
    if (state.library) {
        (state.library.movies || []).forEach(m => libraryMap.set(m.id, m));
        (state.library.series || []).forEach(m => libraryMap.set(m.id, m));
    }

    const deadlineMap = new Map();
    (state.schoolDeadlines || []).forEach(dl => {
        if (!dl.deadline_date) return;
        if (!deadlineMap.has(dl.deadline_date)) deadlineMap.set(dl.deadline_date, []);
        deadlineMap.get(dl.deadline_date).push(dl);
    });
    // ------------------------------------------------

    // Prázdné buňky na začátku měsíce
    for (let i = 0; i < startDayIndex; i++) {
        html += `<div class="bg-transparent h-full w-full pointer-events-none"></div>`;
    }

    // Dny v měsíci
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        const dayData = (state.healthData || {})[dateKey] || {};
        const plannedDate = (state.plannedDates || {})[dateKey];
        const schoolEvent = (state.schoolEvents || {})[dateKey];
        const dayDeadlines = deadlineMap.get(dateKey) || [];
        const movieHistory = (state.movieHistory || {})[dateKey];
        const dayGymLogs = gymMap.get(dateKey) || [];
        const dayShifts = (state.shifts || {})[dateKey] || (state.workEntries || {})[dateKey];
        const dayDiary = (state.diaryEntries || {})[dateKey] || (state.workDiary || {})[dateKey];
        const timelineEvent = (state.timelineEvents || []).find((e) => e.event_date === dateKey);

        const isToday = dateKey === getTodayKey();
        const isAnniversary = anniversaryDay !== null && d === anniversaryDay;

        let cellContent = "";
        let cellClasses = "cal-month-cell relative rounded-xl border p-1 md:p-1.5 transition cursor-pointer flex flex-col justify-between overflow-hidden group h-full w-full select-none";
        let bgStyle = "bg-[#2f3136]";
        let borderStyle = "border-white/[0.06]";
        let textStyle = "text-gray-400 font-bold text-xs md:text-sm";
        let inlineStyles = `--cell-idx: ${d};`;

        if (isToday) {
            borderStyle = "border-[#5865F2] border-2 shadow-[0_0_12px_rgba(88,101,242,0.4)] z-10";
            textStyle = "text-white font-black text-xs md:text-sm";
        }

        // =========================================================================
        // FILTER: ALL (3-Zone Life Mosaic)
        // =========================================================================
        if (state.calendarFilter === "all") {
            // Zone 1: Top indicators (Anniversary, Period, Shift, Memories)
            let topBadges = "";
            const pastMemories = getAnniversaryMemories(dateKey, state.timelineEvents);
            if (pastMemories.length > 0) {
                topBadges += `<span class="text-[9px] text-amber-400 font-black animate-pulse" title="${pastMemories[0].title} (${pastMemories[0].anniversaryLabel})">✨</span>`;
            }
            if (isAnniversary) {
                topBadges += `<span class="text-[9px] text-[#ed4245] animate-pulse" title="Výročí ❤️">❤️</span>`;
            }
            if (dayData.period) {
                topBadges += `<span class="text-[8px]" title="Menstruace 🩸">🩸</span>`;
            }
            if (dayShifts && (dayShifts.jose || dayShifts.klarka || dayShifts.type)) {
                const shiftType = dayShifts.jose || dayShifts.type || dayShifts.klarka;
                const shiftIcons = { ranni: '☀️', odpoledni: '🌤️', nocni: '🌙', volno: '🌴', dovolena: '✈️' };
                topBadges += `<span class="text-[8px]" title="Směna: ${shiftType}">${shiftIcons[shiftType] || '💼'}</span>`;
            }

            // Zone 2: Middle Hero Events (Smart Priority Hierarchy & Overflow Caps)
            const dayEvents = [];

            if (dayDeadlines.length > 0) {
                const uncompleted = dayDeadlines.filter(dl => !dl.is_completed);
                uncompleted.forEach(dl => {
                    dayEvents.push({
                        priority: 1,
                        html: `
                            <div class="cal-month-chip cal-chip-deadline" title="Deadline: ${dl.title}">
                                <span>🔥</span>
                                <span class="truncate">[${dl.subject_code || 'FIT'}] ${dl.title}</span>
                            </div>`
                    });
                });
            }

            if (plannedDate) {
                const iconsMap = { food: "🍔", view: "🔭", walk: "🌲", fun: "⚡", movie: "🎬", game: "🎮", discord: "🎧", date: "📍", gym: "🏋️‍♂️" };
                const icon = iconsMap[plannedDate.cat] || "📍";
                dayEvents.push({
                    priority: 2,
                    html: `
                        <div class="cal-month-chip cal-chip-date" title="Rande/Plán: ${plannedDate.name}">
                            <span>${icon}</span>
                            <span class="truncate">${plannedDate.name}</span>
                        </div>`
                });
            }

            if (schoolEvent) {
                dayEvents.push({
                    priority: 3,
                    html: `
                        <div class="cal-month-chip cal-chip-fit" title="Škola: ${schoolEvent.title}">
                            <span>📚</span>
                            <span class="truncate">${schoolEvent.title}</span>
                        </div>`
                });
            }

            if (dayGymLogs.length > 0) {
                const firstLog = dayGymLogs[0];
                const durMin = Math.round((firstLog.duration_seconds || 0) / 60);
                dayEvents.push({
                    priority: 4,
                    html: `
                        <div class="cal-month-chip cal-chip-gym" title="Trénink: ${firstLog.name}">
                            <span>🏋️‍♂️</span>
                            <span class="truncate">${firstLog.name} ${durMin > 0 ? `(${durMin}m)` : ''}</span>
                        </div>`
                });
            }

            if (timelineEvent) {
                dayEvents.push({
                    priority: 5,
                    html: `
                        <div class="cal-month-chip bg-amber-500/15 text-amber-200 border-amber-500/30" title="Milník: ${timelineEvent.title}">
                            <span>⭐</span>
                            <span class="truncate">${timelineEvent.title}</span>
                        </div>`
                });
            }

            if (movieHistory && movieHistory.length > 0) {
                const firstMovie = movieHistory[0];
                const libItem = libraryMap.get(firstMovie.media_id);
                dayEvents.push({
                    priority: 6,
                    html: `
                        <div class="cal-month-chip bg-purple-500/15 text-purple-200 border-purple-500/30" title="Film: ${libItem?.title || 'Film'}">
                            <span>${libItem?.icon || '🎬'}</span>
                            <span class="truncate">${libItem?.title || 'Film'}</span>
                        </div>`
                });
            }

            if (dayDiary) {
                dayEvents.push({
                    priority: 7,
                    html: `
                        <div class="cal-month-chip bg-blue-500/15 text-blue-200 border-blue-500/25" title="Deníček">
                            <span>📝</span>
                            <span class="truncate">Deníček</span>
                        </div>`
                });
            }

            dayEvents.sort((a, b) => a.priority - b.priority);

            let heroChipsHtml = "";
            if (dayEvents.length === 1) {
                heroChipsHtml = dayEvents[0].html;
            } else if (dayEvents.length === 2) {
                heroChipsHtml = dayEvents[0].html + dayEvents[1].html;
            } else if (dayEvents.length > 2) {
                heroChipsHtml = dayEvents[0].html + `
                    <div class="cal-month-chip bg-white/[0.06] text-gray-300 border-white/10 text-[7.5px] font-bold" title="Další události (${dayEvents.length - 1} dalších)">
                        <span>+${dayEvents.length - 1} další</span>
                    </div>
                `;
            }

            // Zone 3: Bottom Vitality Dots (Minimalist Spatial Zen)
            const waterVal = dayData.water_count ?? dayData.water;
            const sleepVal = dayData.sleep_hours ?? dayData.sleep;
            const moodVal = dayData.mood_score ?? dayData.mood;

            let vitalityDots = "";

            if (waterVal) {
                const wCount = parseInt(waterVal, 10);
                if (!isNaN(wCount) && wCount > 0) {
                    const isComplete = wCount >= 8;
                    vitalityDots += `<span class="cal-vitality-dot cal-vitality-dot-water ${isComplete ? 'scale-110 shadow-[0_0_6px_#00e5ff]' : 'opacity-70'}" title="Voda: ${wCount}/8 sklenic"></span>`;
                }
            }

            if (sleepVal) {
                const sHours = typeof sleepVal === 'number' ? sleepVal : parseFloat(sleepVal);
                if (!isNaN(sHours) && sHours > 0) {
                    const isOptimal = sHours >= 7.5;
                    vitalityDots += `<span class="cal-vitality-dot cal-vitality-dot-sleep ${isOptimal ? 'scale-110 shadow-[0_0_6px_#a855f7]' : 'opacity-70'}" title="Spánek: ${sHours}h"></span>`;
                }
            }

            if (moodVal) {
                const mScore = typeof moodVal === 'number' ? moodVal : parseInt(moodVal, 10);
                if (!isNaN(mScore) && mScore > 0) {
                    const mColor = getMoodColor(mScore);
                    vitalityDots += `<span class="cal-vitality-dot cal-vitality-dot-mood" style="background-color: ${mColor}; color: ${mColor}; box-shadow: 0 0 5px ${mColor};" title="Nálada: ${mScore}/10 (${getMoodLabel(mScore)})"></span>`;
                }
            }

            if (dayData.pills || dayData.iron || dayData.zinc || dayData.magnesium) {
                vitalityDots += `<span class="text-[7.5px] leading-none opacity-80" title="Vitamíny/léky splněny">💊</span>`;
            }

            cellContent = `
                <div class="flex items-center justify-between w-full">
                    <span class="${textStyle}">${d}</span>
                    <div class="flex items-center gap-1">
                        <div class="flex items-center gap-0.5">${topBadges}</div>
                        <button type="button" 
                                onclick="event.stopPropagation(); Calendar.openQuickAdd(this.closest('.cal-month-cell'), '${dateKey}');"
                                title="Rychle naplánovat akci pro tento den"
                                class="cal-cell-quick-btn w-4 h-4 rounded bg-[#5865F2]/25 hover:bg-[#5865F2] text-white flex items-center justify-center text-[8px] font-black border border-[#5865F2]/40 transition opacity-0 group-hover:opacity-100">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>

                <div class="flex flex-col gap-0.5 my-auto w-full overflow-hidden">
                    ${heroChipsHtml}
                </div>

                ${vitalityDots ? `
                    <div class="flex items-center justify-between w-full pt-1">
                        <div class="cal-vitality-dots">
                            ${vitalityDots}
                        </div>
                    </div>
                ` : `<div class="h-0.5"></div>`}
            `;
        }

        // =========================================================================
        // FILTER: WATER (💧 Liquid Tank & Wave Engine with In-Cell Quick Log)
        // =========================================================================
        else if (state.calendarFilter === "water") {
            const wVal = dayData.water_count ?? dayData.water;
            const count = wVal ? (typeof wVal === 'number' ? wVal : parseInt(wVal, 10)) : 0;
            const validCount = !isNaN(count) ? count : 0;
            const percentage = Math.min(100, Math.max(0, Math.round((validCount / 8) * 100)));
            const isTarget = validCount >= 8;

            cellClasses += " cal-liquid-tank";

            if (isTarget) {
                cellClasses += " cal-aqua-glow cal-aqua-complete";
                borderStyle = "border-[#00e5ff] border-2 shadow-[0_0_15px_rgba(0,229,255,0.45)] z-10";
            } else if (validCount > 0) {
                borderStyle = "border-cyan-500/40";
            }

            let liquidHtml = "";
            if (percentage > 0) {
                liquidHtml = `
                    <div class="cal-liquid-fill" style="height: ${percentage}%;">
                        <div class="cal-liquid-wave"></div>
                    </div>
                `;
            }

            cellContent = `
                ${liquidHtml}
                <div class="flex items-center justify-between w-full relative z-10">
                    <span class="${textStyle} ${isTarget ? 'text-white drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]' : ''}">${d}</span>
                    <div class="flex items-center gap-1">
                        ${isTarget ? `<span class="text-[9px] text-[#00e5ff] animate-bounce">✨</span>` : ''}
                        <button type="button" 
                                onclick="Calendar.quickAddWater('${dateKey}', event)"
                                title="Vypít další sklenici (+1 💧)"
                                class="cal-water-add-btn px-1 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-white border border-cyan-400/40 text-[8px] font-black transition flex items-center gap-0.5 shadow-sm">
                            <i class="fas fa-plus text-[7px]"></i>1
                        </button>
                    </div>
                </div>

                <div class="relative z-10 w-full h-full flex flex-col items-center justify-center my-auto">
                    ${validCount > 0 ? `
                        <div class="text-xl md:text-2xl font-black font-mono leading-none ${isTarget ? 'text-white drop-shadow-[0_0_8px_rgba(0,229,255,0.9)]' : 'text-cyan-200'}">
                            ${validCount}<span class="text-xs text-cyan-300/80 font-bold">/8</span>
                        </div>
                        <div class="text-[7.5px] font-bold text-cyan-300 uppercase tracking-widest mt-0.5">
                            ${percentage}%
                        </div>
                    ` : `
                        <div class="text-gray-600 text-xs font-mono">-</div>
                    `}
                </div>

                <div class="relative z-10 text-[7px] text-center w-full ${isTarget ? 'text-cyan-200 font-extrabold' : 'text-gray-400 font-medium'}">
                    ${isTarget ? 'Splněno 🌊' : (validCount > 0 ? `${validCount * 250} ml` : '0 ml')}
                </div>
            `;
        }

        // =========================================================================
        // FILTER: HEALTH / MOOD (💜 Radiant Mesh Heatmap Aura)
        // =========================================================================
        else if (state.calendarFilter === "health") {
            const mVal = dayData.mood_score ?? dayData.mood;
            const num = mVal ? (typeof mVal === 'number' ? mVal : parseInt(mVal, 10)) : null;
            const hasMood = num !== null && !isNaN(num);
            const moodColor = hasMood ? getMoodColor(num) : '#4b5563';
            const moodLabel = hasMood ? getMoodLabel(num) : '';
            const isBrightMood = hasMood && num >= 8;

            cellClasses += " cal-mood-aura";

            if (hasMood) {
                inlineStyles += `background: linear-gradient(145deg, ${moodColor}CC 0%, ${moodColor}40 100%); border-color: ${moodColor}BB; box-shadow: inset 0 0 16px ${moodColor}44, 0 0 10px ${moodColor}22;`;
            }

            if (dayData.period) {
                borderStyle = "border-rose-500 border-2 shadow-[0_0_12px_rgba(244,63,94,0.4)]";
            }

            const textColor = isBrightMood ? 'text-[#10002B]' : 'text-white';
            const shadowClass = isBrightMood ? '' : 'drop-shadow-md';

            cellContent = `
                <div class="flex items-center justify-between w-full relative z-10">
                    <span class="${textStyle} ${hasMood ? textColor : ''}">${d}</span>
                    <div class="flex items-center gap-0.5">
                        ${dayData.period ? `<span class="text-[8px] animate-pulse" title="Menstruace 🩸">🩸</span>` : ''}
                        ${dayData.movement && dayData.movement.length > 0 ? `<span class="text-[8px]" title="Pohyb">🏃‍♀️</span>` : ''}
                    </div>
                </div>

                <div class="relative z-10 w-full h-full flex flex-col items-center justify-center my-auto">
                    ${hasMood ? `
                        <div class="text-2xl md:text-3xl font-black ${textColor} ${shadowClass} leading-none tracking-tight">
                            ${num}
                        </div>
                        <div class="text-[7.5px] font-black uppercase tracking-wider mt-0.5 ${textColor} opacity-90 truncate max-w-full px-0.5">
                            ${moodLabel}
                        </div>
                    ` : `
                        <div class="text-gray-600 text-xs font-mono">-</div>
                    `}
                </div>

                <div class="relative z-10 text-[7px] text-center w-full font-bold ${textColor} opacity-80">
                    ${hasMood ? `${num}/10 Aura` : 'Bez záznamu'}
                </div>
            `;
        }

        // =========================================================================
        // FILTER: SLEEP (😴 Hypnogram & Aurora Dreamscape)
        // =========================================================================
        else if (state.calendarFilter === "sleep") {
            const sVal = dayData.sleep_hours ?? dayData.sleep;
            const hours = sVal ? (typeof sVal === 'number' ? sVal : parseFloat(sVal)) : null;
            const hasSleep = hours !== null && !isNaN(hours);

            let avatar = "😐";
            let qualityLabel = "Průměrný";
            let sleepBg = "bg-purple-950/20 border-purple-500/20";

            if (hasSleep) {
                if (hours >= 9.0) {
                    avatar = "👸";
                    qualityLabel = "Královský";
                    sleepBg = "bg-gradient-to-br from-indigo-950/50 via-purple-900/40 to-pink-950/40 border-purple-400/50 shadow-[inset_0_0_12px_rgba(168,85,247,0.2)]";
                } else if (hours >= 7.5) {
                    avatar = "✨";
                    qualityLabel = "Optimální";
                    sleepBg = "bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border-indigo-500/50 shadow-[inset_0_0_12px_rgba(99,102,241,0.2)]";
                } else if (hours >= 6.0) {
                    avatar = "🥱";
                    qualityLabel = "Ujde to";
                    sleepBg = "bg-purple-950/30 border-purple-500/30";
                } else {
                    avatar = "🧟‍♀️";
                    qualityLabel = "Deficit!";
                    sleepBg = "bg-rose-950/35 border-rose-500/40 shadow-[inset_0_0_12px_rgba(244,63,94,0.15)]";
                }
            }

            bgStyle = hasSleep ? sleepBg : "bg-[#2f3136]";

            cellContent = `
                <div class="flex items-center justify-between w-full">
                    <span class="${textStyle}">${d}</span>
                    ${hasSleep && hours >= 7.5 ? `<span class="text-[8px] text-amber-300">⭐</span>` : ''}
                </div>

                <div class="w-full h-full flex flex-col items-center justify-center my-auto text-center">
                    ${hasSleep ? `
                        <div class="text-base md:text-lg leading-none">${avatar}</div>
                        <div class="text-base md:text-xl font-black font-mono text-purple-200 mt-0.5 leading-none">
                            ${hours.toFixed(1)}<span class="text-[9px] text-purple-400 font-bold ml-0.5">h</span>
                        </div>
                        <div class="text-[7.5px] font-bold ${hours < 6 ? 'text-rose-400' : 'text-purple-300'} uppercase tracking-wider mt-0.5">
                            ${qualityLabel}
                        </div>
                    ` : `
                        <div class="text-gray-600 text-xs font-mono">-</div>
                    `}
                </div>

                <div class="text-[7px] text-center w-full text-gray-400 font-medium">
                    ${hasSleep ? (hours >= 8 ? 'Plná regenerace' : `${(hours - 8).toFixed(1)}h k optimu`) : 'Nesledováno'}
                </div>
            `;
        }

        // =========================================================================
        // FILTER: GYM (🏋️ Muscle Pump & Intensity Flare)
        // =========================================================================
        else if (state.calendarFilter === "gym") {
            const hasPlannedGym = plannedDate && (plannedDate.cat === 'gym' || (plannedDate.name && plannedDate.name.includes('🏋️')));
            const hasLogs = dayGymLogs.length > 0;

            if (hasLogs) {
                bgStyle = "bg-gradient-to-br from-amber-950/40 to-orange-950/30";
                borderStyle = isToday 
                    ? "border-[#faa61a] border-2 shadow-[0_0_15px_rgba(250,166,26,0.4)] z-10" 
                    : "border-amber-500/50 shadow-[inset_0_0_12px_rgba(250,166,26,0.15)]";
                textStyle = "text-amber-300 font-black text-xs md:text-sm";

                const totalLogs = dayGymLogs.length;
                const firstName = dayGymLogs[0].name || "Trénink";
                const totalMinutes = Math.round(dayGymLogs.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / 60);

                let totalSets = 0;
                dayGymLogs.forEach(l => {
                    (l.exercises || []).forEach(ex => {
                        totalSets += (ex.sets || []).length;
                    });
                });

                cellContent = `
                    <div class="flex items-center justify-between w-full">
                        <span class="${textStyle}">${d}</span>
                        <span class="text-[9px] text-amber-400 font-bold">🔥</span>
                    </div>

                    <div class="w-full h-full flex flex-col items-center justify-center my-auto text-center">
                        <div class="text-base md:text-lg drop-shadow-sm">🏋️‍♂️</div>
                        <div class="text-[8px] md:text-[9px] text-amber-200 font-extrabold leading-tight truncate w-full px-0.5 mt-0.5">
                            ${firstName}
                        </div>
                        <div class="text-[7.5px] text-amber-300/90 font-mono font-bold">
                            ${totalMinutes}m ${totalSets > 0 ? `• ${totalSets}s` : ''}${totalLogs > 1 ? ` (${totalLogs}x)` : ''}
                        </div>
                    </div>

                    <div class="text-[7px] text-center w-full text-amber-400 font-bold">
                        Odtrénováno 💪
                    </div>
                `;
            } else if (hasPlannedGym) {
                bgStyle = "bg-amber-950/15";
                borderStyle = "border-amber-500/30 border-dashed";
                textStyle = "text-amber-400/80 font-bold text-xs md:text-sm";

                cellContent = `
                    <div class="flex items-center justify-between w-full">
                        <span class="${textStyle}">${d}</span>
                        <span class="text-[8px]">📅</span>
                    </div>

                    <div class="w-full h-full flex flex-col items-center justify-center my-auto text-center">
                        <div class="text-sm opacity-80">🏋️‍♂️</div>
                        <div class="text-[7.5px] text-amber-300 font-bold leading-tight truncate w-full px-0.5 mt-0.5">
                            ${plannedDate.name}
                        </div>
                        <div class="text-[6.5px] text-amber-400/70 font-mono font-bold">
                            Plán ${plannedDate.time || ''}
                        </div>
                    </div>

                    <div class="text-[7px] text-center w-full text-gray-500 font-medium">
                        Naplánováno
                    </div>
                `;
            } else {
                const split = getActiveSplitForDay(dateKey);
                if (split && !split.isRest) {
                    bgStyle = "bg-amber-950/15";
                    borderStyle = "border-amber-500/25 border-dashed";
                    textStyle = "text-amber-300 font-bold text-xs md:text-sm";

                    cellContent = `
                        <div class="flex items-center justify-between w-full">
                            <span class="${textStyle}">${d}</span>
                            <span class="text-[8px] text-amber-400">⚡</span>
                        </div>

                        <div class="w-full h-full flex flex-col items-center justify-center my-auto text-center">
                            <div class="text-sm opacity-85">🦍</div>
                            <div class="text-[7.5px] text-amber-200 font-black leading-tight truncate w-full px-0.5 mt-0.5">
                                ${split.splitName}
                            </div>
                            <div class="text-[6.5px] text-amber-400/80 font-mono font-bold">
                                ${split.preferredTime || 'Split'}
                            </div>
                        </div>

                        <div class="text-[7px] text-center w-full text-amber-400/90 font-bold">
                            Split rutina
                        </div>
                    `;
                } else {
                    cellContent = `
                        <div class="flex justify-between items-start w-full">
                            <span class="${textStyle}">${d}</span>
                        </div>
                        <div class="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-medium">${(split && split.isRest) ? '🛌 Rest Day' : 'Odpočinek'}</div>
                        <div class="h-1"></div>
                    `;
                }
            }
        }


        // =========================================================================
        // FILTER: FIT (🎓 Cyberpunk Radar & School Deadlines)
        // =========================================================================
        else if (state.calendarFilter === "fit") {
            const dayDate = new Date(year, month, d);
            const dayOfWeek = dayDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const daySubjects = (state.scheduleItems || []).filter(s => s.day_of_week === dayOfWeek);

            if (dayDeadlines.length > 0) {
                bgStyle = "bg-gradient-to-br from-rose-950/40 to-red-950/30";
                borderStyle = isToday 
                    ? "border-rose-500 border-2 shadow-[0_0_15px_rgba(244,63,94,0.5)] z-10" 
                    : "border-rose-500/50 shadow-[inset_0_0_12px_rgba(244,63,94,0.2)]";
                textStyle = "text-rose-400 font-black text-xs md:text-sm";
                const firstDL = dayDeadlines[0];

                cellContent = `
                    <div class="flex items-center justify-between w-full">
                        <span class="${textStyle}">${d}</span>
                        <span class="text-[8px] text-rose-400 font-black animate-pulse">🔥 DL</span>
                    </div>

                    <div class="w-full h-full flex flex-col items-center justify-center my-auto text-center">
                        <div class="text-sm drop-shadow-sm">🎯</div>
                        <div class="text-[8px] text-rose-200 font-extrabold leading-tight truncate w-full px-0.5 mt-0.5">
                            [${firstDL.subject_code || 'FIT'}] ${firstDL.title}
                        </div>
                        <div class="text-[7px] text-rose-300 font-mono font-bold">
                            Do ${firstDL.deadline_time || '23:59'}
                        </div>
                    </div>

                    <div class="text-[7px] text-center w-full text-rose-400 font-black uppercase">
                        ${dayDeadlines.length > 1 ? `+${dayDeadlines.length - 1} další deadline` : 'Odevzdání'}
                    </div>
                `;
            } else if (!isWeekend && daySubjects.length > 0) {
                bgStyle = "bg-gradient-to-br from-emerald-950/30 to-teal-950/20";
                borderStyle = isToday
                    ? "border-emerald-500 border-2 shadow-[0_0_15px_rgba(16,185,129,0.45)] z-10"
                    : "border-emerald-500/40 shadow-[inset_0_0_10px_rgba(16,185,129,0.15)]";
                textStyle = "text-emerald-400 font-bold text-xs md:text-sm";

                const codes = Array.from(new Set(daySubjects.map(s => s.subject_code || s.name))).slice(0, 2).join(', ');
                cellContent = `
                    <div class="flex items-center justify-between w-full">
                        <span class="${textStyle}">${d}</span>
                        <span class="text-[8px] text-emerald-400">🎓</span>
                    </div>

                    <div class="w-full h-full flex flex-col items-center justify-center my-auto text-center">
                        <div class="text-sm">📚</div>
                        <div class="text-[8px] text-emerald-200 font-black leading-tight truncate w-full px-0.5 mt-0.5">
                            ${codes}
                        </div>
                        <div class="text-[7px] text-emerald-400/90 font-mono font-bold">
                            ${daySubjects.length} ${daySubjects.length === 1 ? 'výuka' : 'výuky'}
                        </div>
                    </div>

                    <div class="text-[7px] text-center w-full text-emerald-400 font-bold">
                        VUT FIT
                    </div>
                `;
            } else {
                cellContent = `
                    <div class="flex justify-between items-start w-full">
                        <span class="${textStyle}">${d}</span>
                    </div>
                    <div class="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-medium">${isWeekend ? '🌴 Víkend' : '-'}</div>
                    <div class="h-1"></div>
                `;
            }
        }

        html += `
            <div onclick="Calendar.showDayDetail('${dateKey}')" 
                 onmouseenter="Calendar.showDayHoverHUD(this, '${dateKey}')"
                 onmouseleave="Calendar.hideDayHoverHUD()"
                 class="${cellClasses} ${bgStyle} ${borderStyle}"
                 style="${inlineStyles}">
                ${cellContent}
            </div>
        `;
    }

    return html;
}


