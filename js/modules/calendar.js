import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';

// Re-export modularized components to maintain compatibility with global onclick handlers
export * from './calendar/grid.js';
export * from './calendar/modals.js';

import { 
    generateFilterButtons, 
    generateCalendarGrid 
} from './calendar/grid.js';
import { 
    ensureModals, 
    showDayDetail,
    getCurrentModalDateKey
} from './calendar/modals.js';

// --- SESSION STATE (Internal to calendar controller) ---
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

/**
 * Main entry point for rendering the calendar.
 * Orchestrates grid generation and event setup.
 */
export function renderCalendar(year = null, month = null) {
    ensureModals();
    setupCalendarSync();
    
    const container = document.getElementById("messages-container");
    if (!container) return;

    if (state.loadError) {
        container.innerHTML = window.renderErrorState({
            message: "Nepodařilo se mi načíst tvé plány a události. Zkusíme to znovu rozmrazit?",
            onRetry: "import('./js/core/state.js').then(async m => { await m.initializeState(); import('./js/modules/calendar.js').then(c => c.renderCalendar()); })"
        });
        return;
    }

    // Default to current state if no params
    if (year === null) year = currentCalYear;
    if (month === null) month = currentCalMonth;

    // Handle year transitions
    if (month < 0) { month = 11; year--; }
    else if (month > 11) { month = 0; year++; }

    // Haptic feedback on navigation
    if (year !== currentCalYear || month !== currentCalMonth) {
        triggerHaptic('light');
    }

    currentCalYear = year;
    currentCalMonth = month;

    const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    container.innerHTML = `
          <div class="flex flex-col h-full bg-[#36393f] animate-fade-in">
              <div class="bg-[#2f3136] shadow-sm z-10 flex-shrink-0 border-b border-[#202225]">
                  <div class="px-4 py-3 flex justify-between items-center w-full max-w-5xl mx-auto">
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
                      </div>
                  </div>
              </div>

              <div class="bg-[#36393f] flex-shrink-0 border-b border-[#202225]">
                  <div id="calendar-filters" class="flex items-center gap-2 px-4 py-2 md:py-3 overflow-x-auto no-scrollbar w-full max-w-5xl mx-auto">
                      ${generateFilterButtons()}
                  </div>
              </div>

              <div class="flex-1 overflow-y-auto p-2 md:p-6 custom-scrollbar">
                  <div class="w-full max-w-5xl mx-auto">
                      <div class="grid grid-cols-7 gap-1 md:gap-2 mb-1 md:mb-2 text-center text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                          <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
                      </div>

                      <div id="calendar-grid" class="grid grid-cols-7 gap-1 md:gap-2 pb-20 auto-rows-fr">
                          ${generateCalendarGrid(year, month)}
                      </div>
                  </div>
              </div>
          </div>`;
}

/**
 * Updates the calendar filter and refreshes the grid only.
 */
export function setCalendarFilter(filterId) {
    state.calendarFilter = filterId;
    triggerHaptic("light");

    const filterContainer = document.getElementById("calendar-filters");
    if (filterContainer) filterContainer.innerHTML = generateFilterButtons();

    const gridContainer = document.getElementById("calendar-grid");
    if (gridContainer) {
        gridContainer.style.opacity = "0";
        setTimeout(() => {
            gridContainer.innerHTML = generateCalendarGrid(currentCalYear, currentCalMonth);
            gridContainer.style.opacity = "1";
        }, 150);
    }
}

// --- SYNC LISTENERS ---
let calendarSyncSet = false;

/**
 * Sets up real-time sync for calendar events.
 */
export function setupCalendarSync() {
    if (calendarSyncSet) return;

    window.addEventListener('planned-dates-updated', (e) => {
        const payload = e.detail.payload;
        const row = payload.new || payload.old;
        if (!row) return;

        if (payload.eventType === 'DELETE') {
            delete state.plannedDates[row.date_key];
        } else {
            state.plannedDates[row.date_key] = {
                id: row.id,
                name: row.name,
                cat: row.cat,
                time: row.time,
                note: row.note
            };
        }

        if (state.currentChannel === 'calendar') {
            const grid = document.getElementById('calendar-grid');
            if (grid) grid.innerHTML = generateCalendarGrid(currentCalYear, currentCalMonth);
            
            // If the modal for this specific day is open, refresh it via its own module
            if (getCurrentModalDateKey() === row.date_key) {
                showDayDetail(row.date_key);
            }
        }
    });

    calendarSyncSet = true;
}
