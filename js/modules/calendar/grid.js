import { state } from '../../core/state.js';
import { triggerHaptic, getTodayKey } from '../../core/utils.js';
import { getSleepColor } from '../dashboard/health_ui.js';

export function getMoodColor(val) {
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
        const movieHistory = (state.movieHistory || {})[dateKey];
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

            if (movieHistory) {
                iconsHtml += `<span class="text-[10px]">🎬</span>`;
                const firstMovie = movieHistory[0];
                const libItem = [...(state.library?.movies || []), ...(state.library?.series || [])].find(m => m.id === firstMovie.media_id);
                if (libItem && libItem.icon) {
                    iconsHtml += `<span class="text-[10px]">${libItem.icon}</span>`;
                }
            }

            if (plannedDate) {
                bgStyle = "bg-[#5865F2]/20";
                borderStyle = "border-[#5865F2]/50";
                const iconsMap = { food: "🍔", view: "🔭", walk: "🌲", fun: "⚡", movie: "🎬", game: "🎮", discord: "🎧", date: "📍" };
                const icon = iconsMap[plannedDate.cat] || "📍";
                cellContent += `
             <div class="w-full h-full flex flex-col items-center justify-center pt-2">
                 <div class="text-base drop-shadow-sm transform group-hover:scale-110 transition">${icon}</div>
                 <div class="text-[7px] text-gray-300 leading-tight text-center truncate w-full px-0.5 mt-0.5">${plannedDate.name}</div>
             </div>`;
                cellContent += `<div class="absolute top-1 right-1 flex gap-0.5">${iconsHtml}</div>`;
            } else if (timelineEvent) {
                cellContent += `
                <div class="w-full h-full flex flex-col items-center justify-center pt-2">
                    <div class="text-[7px] text-[#faa61a] font-bold leading-tight text-center line-clamp-2 w-full px-0.5">${timelineEvent.title}</div>
                </div>`;
                cellContent += `<div class="absolute bottom-1 right-1 flex gap-0.5">${iconsHtml}</div>`;
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
                    const textColor = val >= 8 ? 'text-[#10002B]' : 'text-white';
                    cellContent += `<div class="w-full h-full flex items-center justify-center ${textColor} ${val < 8 ? 'drop-shadow-md' : ''}">
                        <span class="text-2xl font-black">${val}</span>
                    </div>`;
                } else {
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
