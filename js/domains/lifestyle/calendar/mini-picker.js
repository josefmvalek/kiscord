/**
 * Mini-Calendar Dropdown Picker for Kiscord Calendar Header
 * Fast date jump tool allowing users to click the header and pick any week or month.
 */

import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { getAnchorDate, setAnchorDate, renderCalendar, setCalSession } from './index.js';
import { formatDateKey, CZECH_MONTH_NAMES } from './time-engine.js';

let miniPickerYear = new Date().getFullYear();
let miniPickerMonth = new Date().getMonth();

export function closeMiniPicker() {
    const existing = document.getElementById('cal-mini-picker-dropdown');
    if (existing) {
        existing.remove();
    }
}

/**
 * Toggles mini calendar picker dropdown under header title.
 * @param {HTMLElement} anchorElement 
 */
export function toggleMiniCalendarPicker(anchorElement) {
    const existing = document.getElementById('cal-mini-picker-dropdown');
    if (existing) {
        closeMiniPicker();
        return;
    }

    triggerHaptic('light');
    const currentAnchor = getAnchorDate();
    miniPickerYear = currentAnchor.getFullYear();
    miniPickerMonth = currentAnchor.getMonth();

    const dropdown = document.createElement('div');
    dropdown.id = 'cal-mini-picker-dropdown';
    dropdown.className = 'cal-mini-picker absolute z-50 bg-[#2f3136] border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-72 text-white animate-fade-in select-none';

    // Position under anchor element
    if (anchorElement && typeof anchorElement.getBoundingClientRect === 'function') {
        const rect = anchorElement.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 8}px`;
        dropdown.style.left = `${Math.max(12, Math.min(window.innerWidth - 300, rect.left))}px`;
    } else {
        dropdown.style.top = '60px';
        dropdown.style.left = '20px';
    }

    dropdown.innerHTML = renderMiniPickerHtml();
    document.body.appendChild(dropdown);
}

/**
 * Navigates month inside the mini picker without closing it.
 */
export function stepMiniPickerMonth(delta) {
    miniPickerMonth += delta;
    if (miniPickerMonth < 0) {
        miniPickerMonth = 11;
        miniPickerYear--;
    } else if (miniPickerMonth > 11) {
        miniPickerMonth = 0;
        miniPickerYear++;
    }
    const dropdown = document.getElementById('cal-mini-picker-dropdown');
    if (dropdown) {
        dropdown.innerHTML = renderMiniPickerHtml();
    }
}

/**
 * Selects a specific date from the mini picker and jumps to it in main calendar.
 */
export function selectMiniPickerDate(dateKey) {
    triggerHaptic('light');
    setAnchorDate(dateKey);
    closeMiniPicker();
    renderCalendar();
}

/**
 * Generates the HTML grid for mini picker.
 */
function renderMiniPickerHtml() {
    const firstDay = new Date(miniPickerYear, miniPickerMonth, 1);
    const lastDay = new Date(miniPickerYear, miniPickerMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const currentAnchorKey = formatDateKey(getAnchorDate());
    const todayKey = getTodayKey();

    let daysHtml = '';
    // Empty prefix cells
    for (let i = 0; i < startDayIndex; i++) {
        daysHtml += '<div class="w-8 h-8"></div>';
    }

    // Days in month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${miniPickerYear}-${String(miniPickerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSelected = dateKey === currentAnchorKey;
        const isToday = dateKey === todayKey;

        const cellClass = isSelected
            ? 'bg-[#5865F2] text-white font-bold shadow-md shadow-[#5865F2]/40'
            : isToday
            ? 'border border-[#5865F2] text-[#5865F2] font-bold hover:bg-[#5865F2]/20'
            : 'text-gray-300 hover:bg-white/10 hover:text-white';

        daysHtml += `
            <button onclick="Calendar.selectMiniPickerDate('${dateKey}')" 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${cellClass}">
                ${d}
            </button>
        `;
    }

    return `
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <h5 class="text-xs font-black text-white">
                ${CZECH_MONTH_NAMES[miniPickerMonth]} <span class="text-gray-400 font-light">${miniPickerYear}</span>
            </h5>
            <div class="flex gap-1">
                <button onclick="Calendar.stepMiniPickerMonth(-1)" class="w-6 h-6 rounded-lg bg-[#202225] hover:bg-white/10 text-gray-300 flex items-center justify-center transition">
                    <i class="fas fa-chevron-left text-[10px]"></i>
                </button>
                <button onclick="Calendar.stepMiniPickerMonth(1)" class="w-6 h-6 rounded-lg bg-[#202225] hover:bg-white/10 text-gray-300 flex items-center justify-center transition">
                    <i class="fas fa-chevron-right text-[10px]"></i>
                </button>
                <button onclick="Calendar.closeMiniPicker()" class="w-6 h-6 rounded-lg bg-[#202225] hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition ml-1">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
        </div>

        <div class="grid grid-cols-7 gap-1">
            ${daysHtml}
        </div>
    `;
}
