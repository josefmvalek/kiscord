
import { state } from '../core/state.js';
// import { timelineEvents } from '../data.js'; // Smazáno, nyní ze state
import { triggerHaptic, getTodayKey } from '../core/utils.js';
import { getSleepColor } from './health.js';

// --- STATE ---
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let currentModalDateKey = null;

// --- EXPORTED FUNCTIONS ---

export function getMoodColor(val) {
    if (val > 10) val = Math.round(val / 10);
    const colors = {
        1: "#ed4245", // Red
        2: "#f97316", // Orange
        3: "#fbbf24", // Amber
        4: "#facc15", // Yellow
        5: "#d4d82b", // Lime-Yellow
        6: "#a3e635", // Lime
        7: "#4ade80", // Light Green
        8: "#22c55e", // Green
        9: "#16a34a", // Dark Green
        10: "#065f46"  // Emerald
    };
    return colors[val] || "#4b5563";
}

export function renderCalendar(year = null, month = null) {
    const container = document.getElementById("messages-container");
    if (!container) return; // Guard clause

    // Pokud nejsou parametry, použijeme aktuální (nebo poslední uložené)
    if (year === null) year = currentCalYear;
    if (month === null) month = currentCalMonth;

    // Ošetření přechodu přes rok
    if (month < 0) {
        month = 11;
        year--;
    } else if (month > 11) {
        month = 0;
        year++;
    }

    // Uložíme si aktuální stav pro filtry
    currentCalYear = year;
    currentCalMonth = month;

    const monthNames = [
        "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
        "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
    ];

    // Výpočet navigace
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    container.innerHTML = `
          <div class="flex flex-col h-full bg-[#36393f] animate-fade-in">
              <div class="bg-[#2f3136] shadow-sm z-10 flex-shrink-0 border-b border-[#202225]"><div class="px-4 py-3 flex justify-between items-center w-full max-w-5xl mx-auto">
                  <h2 class="text-2xl font-extrabold text-white flex items-center gap-2">
                      ${monthNames[month]} <span class="text-gray-500 font-light text-xl">${year}</span>
                  </h2>
                  <div class="flex gap-1">
                      <button onclick="import('./js/modules/calendar.js').then(m => m.renderCalendar(${prevYear}, ${prevMonth}))" class="w-8 h-8 rounded-lg bg-[#202225] hover:bg-[#40444b] text-gray-300 flex items-center justify-center transition border border-[#202225] hover:border-gray-500">
                          <i class="fas fa-chevron-left text-sm"></i>
                      </button>
                      <button onclick="import('./js/modules/calendar.js').then(m => m.renderCalendar(${nextYear}, ${nextMonth}))" class="w-8 h-8 rounded-lg bg-[#202225] hover:bg-[#40444b] text-gray-300 flex items-center justify-center transition border border-[#202225] hover:border-gray-500">
                          <i class="fas fa-chevron-right text-sm"></i>
                      </button>
                  </div></div></div>

              <div class="bg-[#36393f] flex-shrink-0 border-b border-[#202225]"><div id="calendar-filters" class="flex items-center gap-2 px-4 py-2 md:py-3 overflow-x-auto no-scrollbar w-full max-w-5xl mx-auto">
                  ${generateFilterButtons()}
              </div>

              <div class="flex-1 overflow-y-auto p-2 md:p-6 custom-scrollbar"><div class="w-full max-w-5xl mx-auto">
                  <div class="grid grid-cols-7 gap-1 md:gap-2 mb-1 md:mb-2 text-center text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
                  </div>

                  <div id="calendar-grid" class="grid grid-cols-7 gap-1 md:gap-2 pb-20 auto-rows-fr">
                      ${generateCalendarGrid(year, month)}
                  </div></div></div></div></div>`;
}

export function setCalendarFilter(filterId) {
    // 1. Aktualizujeme stav
    state.calendarFilter = filterId;
    triggerHaptic("light");

    // 2. Aktualizujeme tlačítka filtrů (aktivní stav)
    const filterContainer = document.getElementById("calendar-filters");
    if (filterContainer) {
        filterContainer.innerHTML = generateFilterButtons();
    }

    // 3. Aktualizujeme POUZE grid (žádné blikání hlavičky)
    const gridContainer = document.getElementById("calendar-grid");
    if (gridContainer) {
        // Jemná animace pro přechod
        gridContainer.style.opacity = "0";
        setTimeout(() => {
            gridContainer.innerHTML = generateCalendarGrid(currentCalYear, currentCalMonth);
            gridContainer.style.opacity = "1";
        }, 150);
    }
}

export function generateFilterButtons() {
    const views = [
        { id: "all", label: "", icon: "fa-calendar-alt", color: "bg-[#5865F2]" },
        { id: "sleep", label: "Spánek", icon: "fa-bed", color: "bg-[#9b59b6]" },
        { id: "water", label: "Voda", icon: "fa-tint", color: "bg-[#00e5ff]" },
        { id: "health", label: "Zdraví", icon: "fa-heart", color: "bg-[#ed4245]" },
    ];

    if (!state.calendarFilter) state.calendarFilter = "all";

    return views.map((v) => {
        const isActive = state.calendarFilter === v.id;
        const style = isActive
            ? `${v.color} text-white shadow-md border-transparent`
            : "bg-[#202225] text-gray-400 border-gray-700 hover:text-gray-200 hover:bg-[#2f3136]";

        const content = v.label
            ? `<i class="fas ${v.icon}"></i> ${v.label}`
            : `<i class="fas ${v.icon} text-lg"></i>`;
        const padding = v.label
            ? "px-3 py-1.5"
            : "w-9 h-9 flex items-center justify-center p-0";

        return `<button onclick="import('./js/modules/calendar.js').then(m => m.setCalendarFilter('${v.id}'))" 
                      class="${padding} rounded-lg text-xs font-bold border transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${style}">
                ${content}
              </button>`;
    }).join("");
}

export function generateCalendarGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const anniversaryDay = new Date(state.startDate).getDate();
    let html = "";

    // Prázdné buňky
    for (let i = 0; i < startDayIndex; i++) {
        html += `<div class="bg-transparent"></div>`;
    }

    // Dny
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        const dayData = (state.healthData || {})[dateKey] || {};
        const plannedDate = (state.plannedDates || {})[dateKey];
        const schoolEvent = (state.schoolEvents || {})[dateKey];
        const timelineEvent = state.timelineEvents.find((e) => e.event_date === dateKey);

        const isToday = dateKey === getTodayKey();
        const isAnniversary = d === anniversaryDay;

        let cellContent = "";
        let cellClasses = "relative aspect-[4/5] sm:aspect-square rounded-lg border p-1 md:p-2 transition cursor-pointer flex flex-col justify-between overflow-hidden group hover:brightness-110";
        let bgStyle = "bg-[#2f3136]";
        let borderStyle = "border-[#202225]";
        let textStyle = "text-gray-500 font-medium md:text-sm";
        let inlineStyles = "";

        if (isToday) {
            borderStyle = "border-[#5865F2] border-2 shadow-[0_0_10px_rgba(88,101,242,0.2)] z-10";
            textStyle = "text-white font-bold md:text-sm";
        }

        if (state.calendarFilter === "all") {
            if (isAnniversary)
                cellContent += `<div class="absolute top-1 right-1 text-[8px] text-[#ed4245] animate-pulse">❤️</div>`;

            let iconsHtml = "";

            if (schoolEvent) {
                cellContent += `<div class="absolute top-0 right-0 w-2 h-2 bg-[#faa61a] rounded-bl-lg"></div>`;
                iconsHtml += `<span class="text-[10px]">📚</span>`;
            }
            if (timelineEvent) {
                borderStyle = "border-[#faa61a] border-dashed";
                iconsHtml += `<span class="text-[10px]">📜</span>`;
            }

            if (plannedDate) {
                bgStyle = "bg-[#5865F2]/20";
                borderStyle = "border-[#5865F2]/50";
                const iconsMap = { food: "🍔", view: "🔭", walk: "🌲", fun: "⚡", movie: "🎬", game: "🎮", discord: "🎧", date: "📍" };
                const icon = iconsMap[plannedDate.cat] || "📍";
                cellContent += `
             <div class="w-full h-full flex flex-col items-center justify-center pt-2">
                 <div class="text-lg drop-shadow-sm transform group-hover:scale-110 transition">${icon}</div>
                 <div class="text-[7px] text-gray-300 leading-tight text-center truncate w-full px-0.5 mt-1">${plannedDate.name}</div>
             </div>`;
            } else {
                cellContent += `<div class="flex items-center justify-center gap-0.5 w-full pb-0.5 mt-auto">${iconsHtml}</div>`;
            }
        } else if (state.calendarFilter === "sleep") {
            if (dayData.sleep) {
                borderStyle = "border-transparent";
                if (typeof dayData.sleep === 'number') {
                    const hours = dayData.sleep;
                    const color = getSleepColor(hours);
                    let hexBg = color.hex;
                    let icon = "😐";
                    if (hours < 5) icon = "🧟‍♀️";
                    else if (hours >= 9) icon = "👸";
                    else if (hours >= 7) icon = "✨";
                    const formattedHours = hours % 1 === 0 ? hours : hours.toFixed(1);

                    bgStyle = ""; 
                    inlineStyles = `background-color: ${hexBg}AA;`;
                    cellContent += `
                    <div class="w-full h-full flex flex-col items-center justify-center text-white">
                        <div class="text-xl leading-none mt-1">${icon}</div>
                        <div class="text-[10px] font-extrabold mt-0.5">${formattedHours}h</div>
                    </div>`;
                } else {
                    // Old data support
                    let icon = "😐";
                    let bg = "#faa61a";
                    if (dayData.sleep === "good") { bg = "#9b59b6"; icon = "👸"; }
                    if (dayData.sleep === "zombie") { bg = "#ed4245"; icon = "🧟‍♀️"; }

                    bgStyle = "";
                    inlineStyles = `background-color: ${bg};`;
                    cellContent += `<div class="w-full h-full flex items-center justify-center text-xl text-white opacity-90">${icon}</div>`;
                }
                textStyle = "text-white/80";
            } else {
                cellContent += `<div class="w-full h-full flex items-center justify-center text-gray-700 text-[10px]">-</div>`;
            }
        } else if (state.calendarFilter === "water") {
            const waterCount = dayData.water || 0;
            const percentage = Math.min((waterCount / 8) * 100, 100);
            cellContent += `
              <div class="absolute bottom-0 left-0 w-full bg-[#00e5ff] transition-all duration-500 opacity-30" style="height: ${percentage}%"></div>
              <div class="relative z-10 w-full h-full flex flex-col items-center justify-center mt-1">
                  <span class="text-lg font-bold ${waterCount >= 6 ? "text-[#00e5ff]" : "text-gray-500"}">${waterCount}</span>
              </div>`;
            if (waterCount >= 8) borderStyle = "border-[#00e5ff]";
        } else if (state.calendarFilter === "health") {
            if (dayData.period) {
                bgStyle = "bg-[#ed4245]/20";
                borderStyle = "border-[#ed4245] border shadow-[inset_0_0_10px_rgba(237,66,69,0.2)]";
                textStyle = "text-[#ed4245] font-bold";
                cellContent += `<div class="absolute top-1 right-1 text-[8px]">🩸</div>`;
            }
            if (dayData.mood) {
                if (typeof dayData.mood === 'number') {
                    let val = dayData.mood;
                    if (val > 10) val = Math.round(val / 10);
                    const hexBg = getMoodColor(val);

                    bgStyle = ""; 
                    inlineStyles = `background-color: ${hexBg}; opacity: 0.9;`;
                    cellContent += `<div class="w-full h-full flex items-center justify-center text-white drop-shadow-md">
                        <span class="text-2xl font-black">${val}</span>
                    </div>`;
                } else {
                    // Old data
                    const moodIcons = { happy: "🥰", tired: "😴", sad: "😢", angry: "😡", horny: "😈" };
                    cellContent += `<div class="w-full h-full flex items-center justify-center text-2xl pt-2">${moodIcons[dayData.mood] || ""}</div>`;
                }
            }
            if (dayData.movement && dayData.movement.length > 0) {
                const moveIconMap = { gym: "💪", walk: "🌲", run: "🏃‍♀️", yoga: "🧘‍♀️", sex: "🔥", clean: "🧹" };
                cellContent += `<div class="absolute bottom-1 right-1 text-[10px]">${moveIconMap[dayData.movement[0]] || "👟"}</div>`;
            }
        }

        html += `
          <div onclick="import('./js/modules/calendar.js').then(m => m.showDayDetail('${dateKey}'))" 
               class="${cellClasses} ${bgStyle} ${borderStyle} calendar-fade"
               style="${inlineStyles}">
              <span class="absolute top-1 left-1.5 md:top-2 md:left-2 text-[10px] z-20 ${textStyle}">${d}</span>
              ${cellContent}
          </div>
      `;
    }
    return html;
}

export function showDayDetail(dateKey) {
    currentModalDateKey = dateKey;
    const dateObj = new Date(dateKey);

    const today = new Date();
    const todayKey = getTodayKey();
    const isPast = dateKey < todayKey;

    // --- 1. Hlavička modalu ---
    const titleEl = document.getElementById("modal-date-title");
    const subEl = document.getElementById("modal-date-subtitle");
    if (titleEl) titleEl.innerText = dateObj.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" });
    if (subEl) subEl.innerText = dateObj.toLocaleDateString("cs-CZ", { weekday: "long", year: "numeric" });

    // --- 2. Načtení dat ---
    const health = state.healthData[dateKey];
    const plannedDate = state.plannedDates[dateKey];
    const schoolEvent = state.schoolEvents[dateKey];
    const timelineEvent = state.timelineEvents.find((e) => e.event_date === dateKey);

    // --- 3. Elementy sekcí ---
    const dateSection = document.getElementById("modal-section-date");
    const schoolSection = document.getElementById("modal-section-school");
    const healthSection = document.getElementById("modal-section-health");

    // --- A) PLÁNY ---
    const showDateSection = !isPast || timelineEvent || plannedDate;

    if (showDateSection && dateSection) {
        let plansHtml = `<h4 class="text-xs font-bold text-[#eb459e] uppercase mb-2 flex items-center gap-2"><i class="fas fa-calendar-day"></i> Plány & Vzpomínky</h4>`;

        if (timelineEvent) {
            plansHtml += `
            <div class="bg-gradient-to-r from-[#5865F2]/20 to-[#eb459e]/20 border border-[#5865F2]/50 rounded-lg p-3 relative group">
                <div class="font-bold text-white text-sm flex items-center gap-2">
                    <i class="fas ${timelineEvent.icon || "fa-star"} text-[#eb459e]"></i>
                    ${timelineEvent.title}
                </div>
                <div class="text-xs text-gray-300 mt-2 leading-relaxed italic">"${timelineEvent.description || ""}"</div>
                ${timelineEvent.images && timelineEvent.images.length > 0
                    ? `<button onclick="closeModal('day-modal'); window.switchChannel('timeline');" class="mt-3 text-[10px] bg-[#202225] hover:bg-[#eb459e] text-white px-2 py-1 rounded transition border border-gray-600 w-full"><i class="fas fa-images mr-1"></i> Zobrazit fotky v Timeline</button>`
                    : ""}
            </div>`;
        } else if (plannedDate) {
            let icon = "📍";
            if (plannedDate.cat === "movie") icon = "🎬";
            else if (plannedDate.cat === "game") icon = "🎮";
            else if (plannedDate.cat === "discord") icon = "🎧";
            else if (plannedDate.cat === "food") icon = "🍔";

            plansHtml += `
            <div class="bg-[#eb459e]/10 border border-[#eb459e]/30 rounded-lg p-3 relative group">
                <div class="font-bold text-white text-sm flex items-center gap-2"><span>${icon}</span> ${plannedDate.name}</div>
                <div class="text-xs text-gray-300 mt-1">Čas: ${plannedDate.time || "Neurčeno"}</div>
                <div class="text-xs text-gray-400 mt-1 italic">${plannedDate.note || ""}</div>
                <button onclick="import('./js/modules/calendar.js').then(m => m.deletePlannedDate('${dateKey}'))" class="absolute top-2 right-2 text-red-400 hover:text-red-200 p-2 transition"><i class="fas fa-trash"></i></button>
            </div>`;
        } else {
            plansHtml += `
            <div class="flex flex-col gap-2">
                <div class="flex gap-2">
                    <select id="plan-type" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none flex-1">
                        <option value="discord">🎧 Discord</option>
                        <option value="game">🎮 Hra</option>
                        <option value="movie">🎬 Film</option>
                        <option value="date">📍 Rande</option>
                    </select>
                    <input type="time" id="plan-time" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none w-20">
                </div>
                <div class="flex gap-2">
                    <input type="text" id="plan-name" placeholder="Co podnikneme?" class="flex-1 bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none">
                    <button onclick="import('./js/modules/calendar.js').then(m => m.addCustomPlan())" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 rounded transition"><i class="fas fa-plus"></i></button>
                </div>
            </div>`;
        }
        dateSection.innerHTML = plansHtml;
        dateSection.classList.remove("hidden");
    } else if (dateSection) {
        dateSection.classList.add("hidden");
    }

    // --- B) ŠKOLA ---
    if (schoolSection) {
        if (isPast) {
            schoolSection.classList.add("hidden");
        } else {
            schoolSection.classList.remove("hidden");
            const schoolDisplay = document.getElementById("school-event-display");
            const schoolForm = document.getElementById("school-add-form");

            if (schoolEvent) {
                schoolDisplay.classList.remove("hidden");
                schoolForm.classList.add("hidden");
                document.getElementById("school-event-text").innerText = schoolEvent.title;
                // Setup delete button directly via onclick replacement or just ensure it calls our export
                const delBtn = schoolDisplay.querySelector("button");
                // NOTE: In original HTML, this button might have onclick="deleteSchoolEvent()". We need to ensure it works.
                // Since we can't easily change the HTML string inside schoolDisplay without re-rendering it, 
                // we assume the button there has an onclick that needs to point to this module.
                // Or we can attach listener here:
                delBtn.onclick = () => deleteSchoolEvent();
            } else {
                schoolDisplay.classList.add("hidden");
                schoolForm.classList.remove("hidden");
                document.getElementById("school-input").value = "";
                // Setup add button? It is in the HTML usually. We can assume the button in HTML calls addSchoolEvent().
                // We need to make sure global addSchoolEvent calls THIS module's addSchoolEvent, or use export.
            }
        }
    }

    // --- C) ZDRAVÍ ---
    if (healthSection) {
        healthSection.classList.remove("hidden");
        
        // Reset defaults
        document.getElementById("modal-health-water").innerText = "0/8";
        document.getElementById("modal-health-sleep").innerText = "-";
        document.getElementById("modal-health-mood").innerText = "-";
        const moveContainer = document.getElementById("modal-health-movement");
        if (moveContainer) moveContainer.innerHTML = '<span class="text-gray-500 italic text-[10px]">Žádný pohyb</span>';
        
        // Reset edit form visibility
        const displayGrid = document.getElementById("health-display-grid");
        const editForm = document.getElementById("health-edit-form");
        if (displayGrid) displayGrid.classList.remove("hidden");
        if (editForm) editForm.classList.add("hidden");

        if (health) {
            document.getElementById("modal-health-water").innerText = `${health.water || 0}/8`;

            let sleepText = "-";
            if (typeof health.sleep === 'number') {
                const h = health.sleep;
                let icon = "😐";
                if (h < 5) icon = "🧟‍♀️"; else if (h >= 9) icon = "👸"; else if (h >= 7) icon = "✨";
                sleepText = `${h}h ${icon}`;
            } else if (health.sleep) {
                const sleepMap = { zombie: "Zombie 🧟‍♀️", ok: "Ujde to 😐", good: "Růženka 👸" };
                sleepText = sleepMap[health.sleep] || "-";
            }
            document.getElementById("modal-health-sleep").innerText = sleepText;
            
            let moodText = "-";
            if (typeof health.mood === 'number') {
                let val = health.mood;
                if (val > 10) val = Math.round(val / 10);
                const hexColor = getMoodColor(val);
                moodText = `<span class="px-2 py-0.5 rounded font-bold text-white shadow-sm" style="background-color: ${hexColor}">${val}/10</span>`;
            } else if (health.mood) {
                const moodIcons = { happy: "🥰", tired: "😴", sad: "😢", angry: "😡", horny: "😈" };
                moodText = `${health.mood} ${moodIcons[health.mood] || ""}`;
            }
            document.getElementById("modal-health-mood").innerText = moodText;

            if (moveContainer) {
                const moveIconMap = { gym: "💪 Fitko", walk: "🌲 Proch.", run: "🏃‍♀️ Běh", yoga: "🧘‍♀️ Jóga", sex: "🔥 Love", clean: "🧹 Úklid", bike: "🚲 Kolo" };
                const moves = health.movement || [];
                if (moves.length > 0) {
                    moveContainer.innerHTML = moves.map((m) => `<span class="bg-[#202225] px-2 py-1 rounded text-[10px] border border-gray-700">${moveIconMap[m] || m}</span>`).join("");
                }
            }
        }
    }

    // Zobrazit Modal
    const modal = document.getElementById("day-modal");
    if (modal) modal.style.display = "flex";
}

export function closeDayModal() {
    const modal = document.getElementById("day-modal");
    if (modal) modal.style.display = "none";
    currentModalDateKey = null;
}

export async function deletePlannedDate(dateKey) {
    delete state.plannedDates[dateKey];

    // Delete from Supabase
    try {
        const { supabase } = await import('../core/supabase.js');
        await supabase.from('planned_dates').delete().eq('date_key', dateKey);
    } catch (err) {
        console.error('Failed to delete planned date:', err);
    }

    showDayDetail(dateKey); // Refresh modalu
    renderCalendar(); // Refresh kalendáře
    triggerHaptic("medium");
    window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Plán smazán 🗑️", type: "info" } }));
}

export async function addCustomPlan() {
    const type = document.getElementById("plan-type").value;
    const name = document.getElementById("plan-name").value;
    const time = document.getElementById("plan-time").value;

    if (!name) return;

    state.plannedDates[currentModalDateKey] = {
        id: "custom-" + Date.now(),
        name: name,
        cat: type,
        time: time,
        note: "Vlastní plán",
    };

    // Save to Supabase
    try {
        const { supabase } = await import('../core/supabase.js');
        await supabase.from('planned_dates').upsert({
            date_key: currentModalDateKey,
            name: name,
            cat: type,
            time: time,
            note: "Vlastní plán",
            updated_at: new Date().toISOString()
        }, { onConflict: 'date_key' });
    } catch (err) {
        console.error('Failed to save custom plan:', err);
    }

    showDayDetail(currentModalDateKey);
    renderCalendar();
    triggerHaptic("success");
}

export function addSchoolEvent() {
    const input = document.getElementById("school-input");
    const title = input.value.trim();

    if (!title || !currentModalDateKey) return;

    state.schoolEvents[currentModalDateKey] = {
        title: title,
        type: "exam",
    };

    // Cloud Save (Shared) - Already goes to Supabase
    import('../core/supabase.js').then(({ supabase }) => {
        supabase.from('school_events').upsert({
            date_key: currentModalDateKey,
            title: title,
            type: "exam"
        });
    });

    // Removed: localStorage.setItem("klarka_school", ...)

    // Update UI manually since we are in modal
    const display = document.getElementById("school-event-display");
    const form = document.getElementById("school-add-form");
    const text = document.getElementById("school-event-text");

    display.classList.remove("hidden");
    form.classList.add("hidden");
    text.innerText = title;

    // Attach delete listener to the NEW state
    const delBtn = display.querySelector("button");
    delBtn.onclick = () => deleteSchoolEvent();

    renderCalendar();
    triggerHaptic("success");
}

export function deleteSchoolEvent() {
    if (!currentModalDateKey) return;

    delete state.schoolEvents[currentModalDateKey];

    // Cloud Delete (Shared)
    import('../core/supabase.js').then(({ supabase }) => {
        supabase.from('school_events').delete().eq('date_key', currentModalDateKey);
    });

    // Removed: localStorage.setItem("klarka_school", ...)

    // Update UI
    const display = document.getElementById("school-event-display");
    const form = document.getElementById("school-add-form");
    const input = document.getElementById("school-input");

    display.classList.add("hidden");
    form.classList.remove("hidden");
    input.value = "";

    renderCalendar();
}

export function toggleHealthEdit() {
    const displayGrid = document.getElementById("health-display-grid");
    const editForm = document.getElementById("health-edit-form");
    if (!displayGrid || !editForm) return;

    if (editForm.classList.contains("hidden")) {
        // Open edit form
        const health = state.healthData[currentModalDateKey] || {};
        
        document.getElementById("edit-health-water").value = health.water || 0;
        
        let sleepVal = health.sleep;
        if (typeof sleepVal === 'string') {
           if(sleepVal === 'zombie') sleepVal = 4;
           else if(sleepVal === 'good') sleepVal = 8;
           else sleepVal = 7;
        }
        document.getElementById("edit-health-sleep").value = sleepVal !== undefined ? sleepVal : "";

        let moodVal = health.mood;
        if (typeof moodVal === 'number' && moodVal > 10) moodVal = Math.round(moodVal / 10);
        if (typeof moodVal === 'string') {
            if(moodVal === 'happy' || moodVal === 'horny') moodVal = 9;
            else if(moodVal === 'sad' || moodVal === 'angry') moodVal = 3;
            else moodVal = 5;
        }
        document.getElementById("edit-health-mood").value = moodVal !== undefined ? moodVal : "";

        const moves = health.movement || [];
        document.getElementById("edit-health-movement").value = moves.join(", ");

        displayGrid.classList.add("hidden");
        editForm.classList.remove("hidden");
    } else {
        // Close edit form
        displayGrid.classList.remove("hidden");
        editForm.classList.add("hidden");
    }
}

export function saveHealthRecord() {
    if (!currentModalDateKey) return;
    
    const water = parseInt(document.getElementById("edit-health-water").value) || 0;
    const sleepInput = document.getElementById("edit-health-sleep").value;
    const sleep = sleepInput ? parseFloat(sleepInput) : undefined;
    
    const moodInput = document.getElementById("edit-health-mood").value;
    const mood = moodInput ? parseInt(moodInput) : undefined;
    
    const movementStr = document.getElementById("edit-health-movement").value;
    const movement = movementStr ? movementStr.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : [];

    // Make sure we preserve legacy period if there was one
    const existing = state.healthData[currentModalDateKey] || {};

    let newHealth = {
        ...existing,
        water,
        movement
    };
    
    if (sleep !== undefined) newHealth.sleep = sleep;
    if (mood !== undefined) newHealth.mood = mood;

    state.healthData[currentModalDateKey] = newHealth;

    // Cloud Save (Personal)
    import('../core/supabase.js').then(({ supabase }) => {
        supabase.from('health_data').upsert({
            date_key: currentModalDateKey,
            user_id: state.currentUser.id,
            water: newHealth.water,
            sleep: newHealth.sleep,
            mood: newHealth.mood,
            movement: newHealth.movement
        });
    });

    // Achievement Hook
    import('./achievements.js').then(m => {
        m.checkHealthAchievements(currentModalDateKey, newHealth, state.healthData);
    });

    const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(state.healthData));
    

    showDayDetail(currentModalDateKey);
    renderCalendar();
    
    triggerHaptic("success");
    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Zdraví uloženo 🏥", type: "success" } }));
    }
}
