/**
 * Kiscord Calendar Module - Main Orchestrator
 * Supports modern Weekly (Time-Grid) and Monthly (Overview) modes with
 * segmented switcher, 1-click quick add, event popovers, mini picker,
 * weekly analytics drawer, NLP natural language parser, drag & drop,
 * RFC 5545 iCalendar export/import, recurring routines, daily briefing,
 * keyboard navigation, and real-time syncing.
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { supabase } from '@core/supabase.js';

export * from './month-view.js';
export * from './week-view.js';
export * from './agenda-view.js';
export * from './time-engine.js';
export * from './day-modal.js';
export * from './quick-popover.js';
export * from './mini-picker.js';
export * from './weekly-analytics.js';
export * from './nlp-quick-add.js';
export * from './drag-drop.js';
export * from './ics-sync.js';
export * from './recurring-events.js';
export * from './daily-briefing.js';
export * from './weather.js';
export * from './partner-radar.js';
export * from './sections-health.js';
export * from './sections-gym.js';
export * from './sections-plans.js';
export * from './sections-diary.js';
export * from './sections-school.js';
export * from './state.js';

import { 
    generateFilterButtons, 
    generateMonthView 
} from './month-view.js';
import { 
    generateWeekView,
    START_HOUR,
    HOUR_HEIGHT,
    END_HOUR
} from './week-view.js';
import {
    generateAgendaView
} from './agenda-view.js';
import { 
    getWeekDates, 
    formatWeekRangeTitle,
    getNowIndicatorPosition
} from './time-engine.js';
import { playWaterDrop, playChime, playQuickPop } from '@core/sound.js';
import { 
    ensureModals, 
    showDayDetail, 
    closeDayModal,
    stepDayModal,
    setDayModalMood,
    setDayModalWater,
    saveDayModalSleep,
    toggleSupplement,
    copyDayDiscordCard,
    openWatchlistPicker,
    selectWatchlistMovie
} from './day-modal.js';
import {
    showQuickAddPopover,
    showEventDetailPopover,
    showDayHoverHUD,
    hideDayHoverHUD,
    setQuickAddType,
    handleQuickAddSubmit,
    quickToggleChecklist,
    closeQuickPopovers
} from './quick-popover.js';
import {
    toggleMiniCalendarPicker,
    stepMiniPickerMonth,
    selectMiniPickerDate,
    closeMiniPicker
} from './mini-picker.js';
import {
    toggleWeeklyAnalyticsDrawer,
    closeAnalyticsDrawer
} from './weekly-analytics.js';
import {
    parseNaturalLanguageEvent,
    detectScheduleConflicts,
    findBestRomanticGaps,
    showGapFinderModal,
    bookRomanticGap
} from './nlp-quick-add.js';
import {
    initCalendarDragDrop
} from './drag-drop.js';
import {
    generateICSString,
    downloadCalendarICS,
    parseICSStringToEvents,
    showExportICSModal,
    downloadICSFromUI
} from './ics-sync.js';
import {
    getRecurringRules,
    saveRecurringRule,
    deleteRecurringRule
} from './recurring-events.js';
import {
    getDailyBriefingData,
    showDailyBriefingModal,
    copyBriefingDiscord
} from './daily-briefing.js';
import {
    getWeatherForDate
} from './weather.js';
import {
    getNextPlannedDate,
    renderDateCountdownBanner,
    sendLovePulse,
    getPartnerCurrentStatus
} from './partner-radar.js';
import { 
    toggleHealthEdit, 
    saveHealthRecord 
} from './sections-health.js';
import { 
    openGymLog, 
    openGymSchedule, 
    openEditGymLog, 
    deleteGymLog, 
    deleteGymPlan 
} from './sections-gym.js';
import { 
    addCustomPlan, 
    deletePlannedDate, 
    cyclePlanStatus, 
    toggleChecklistItem 
} from './sections-plans.js';
import { 
    addSchoolEvent, 
    deleteSchoolEvent 
} from './sections-school.js';
import { 
    getCurrentModalDateKey, 
    getCalSession, 
    setCalSession,
    getViewMode,
    setViewMode,
    getAnchorDate,
    setAnchorDate,
    navigatePeriod,
    jumpToToday,
    getNavAnimation,
    setNavAnimation
} from './state.js';

let keyboardShortcutsSet = false;
let calendarSyncSet = false;
let clickOutsideListenerSet = false;
let liveTimerInterval = null;

export function attachWindowCalendar() {
    window.Calendar = { 
        renderCalendar, 
        setCalendarFilter, 
        setupCalendarSync,
        switchViewMode,
        navigate,
        goToToday,
        handleGridSlotClick,
        openQuickAdd: showQuickAddPopover,
        openEventDetail,
        showDayHoverHUD,
        hideDayHoverHUD,
        quickAddWater,
        showGapFinderModal,
        bookRomanticGap,
        showShortcutsModal,
        setQuickAddType,
        handleQuickAddSubmit,
        quickToggleChecklist,
        closePopovers,
        toggleMiniPicker: toggleMiniCalendarPicker,
        stepMiniPickerMonth,
        selectMiniPickerDate,
        closeMiniPicker,
        toggleWeeklyAnalytics: toggleWeeklyAnalyticsDrawer,
        closeAnalyticsDrawer,
        openNLPModal,
        closeNLPModal,
        handleNLPSubmit,
        handleNLPInputLive,
        parseNaturalLanguageEvent,
        detectScheduleConflicts,
        showExportICSModal,
        downloadICSFromUI,
        generateICSString,
        downloadCalendarICS,
        parseICSStringToEvents,
        getDailyBriefingData,
        showDailyBriefingModal,
        copyBriefingDiscord,
        getWeatherForDate,
        getNextPlannedDate,
        getRecurringRules,
        saveRecurringRule,
        deleteRecurringRule,
        addSchoolEvent, 
        deleteSchoolEvent, 
        toggleHealthEdit, 
        saveHealthRecord,
        showDayDetail, 
        closeDayModal, 
        stepDayModal,
        setDayModalMood,
        setDayModalWater,
        saveDayModalSleep,
        toggleSupplement,
        copyDayDiscordCard,
        openWatchlistPicker,
        selectWatchlistMovie,
        sendLovePulse,
        getPartnerCurrentStatus,
        getCurrentModalDateKey,
        deletePlannedDate, 
        addCustomPlan,
        cyclePlanStatus, 
        toggleChecklistItem, 
        openGymLog, 
        openGymSchedule,
        deleteGymLog, 
        deleteGymPlan, 
        openEditGymLog
    };
}

let keyboardNavInitialized = false;

/**
 * Initializes global keyboard shortcuts for Calendar power users.
 */
export function setupCalendarKeyboardShortcuts() {
    if (keyboardNavInitialized || typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
        if (state.currentChannel !== 'calendar') return;

        // Global Command/Ctrl + K (Spotlight Command Bar)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openNLPModal();
            return;
        }

        // Ignore typing in input fields
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
            return;
        }

        // Ignore system modifier keys
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const key = e.key.toLowerCase();

        if (key === ' ' || key === 'space' || key === 'spacebar') {
            e.preventDefault();
            openNLPModal();
        } else if (key === 'w') {
            e.preventDefault();
            switchViewMode('week');
        } else if (key === 'm') {
            e.preventDefault();
            switchViewMode('month');
        } else if (key === 'a') {
            e.preventDefault();
            switchViewMode('agenda');
        } else if (key === 't') {
            e.preventDefault();
            goToToday();
        } else if (key === 'arrowleft' || key === 'j') {
            e.preventDefault();
            navigate(-1);
        } else if (key === 'arrowright' || key === 'k') {
            e.preventDefault();
            navigate(1);
        } else if (key === '1') {
            e.preventDefault();
            setCalendarFilter('all');
        } else if (key === '2') {
            e.preventDefault();
            setCalendarFilter('fit');
        } else if (key === '3') {
            e.preventDefault();
            setCalendarFilter('gym');
        } else if (key === '4') {
            e.preventDefault();
            setCalendarFilter('sleep');
        } else if (key === '5') {
            e.preventDefault();
            setCalendarFilter('water');
        } else if (key === '6') {
            e.preventDefault();
            setCalendarFilter('health');
        } else if (key === 'n') {
            e.preventDefault();
            openNLPModal();
        } else if (key === 'g') {
            e.preventDefault();
            showGapFinderModal();
        } else if (key === 'd') {
            e.preventDefault();
            showDailyBriefingModal();
        } else if (key === 'e') {
            e.preventDefault();
            showExportICSModal();
        } else if (key === '?' || (e.shiftKey && key === '/')) {
            e.preventDefault();
            showShortcutsModal();
        } else if (key === 'escape') {
            closePopovers();
            closeDayModal();
        }
    });

    keyboardNavInitialized = true;
}

/**
 * Displays an elegant cheatsheet of all keyboard shortcuts.
 */
export function showShortcutsModal() {
    document.getElementById('cal-shortcuts-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'cal-shortcuts-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    modal.innerHTML = `
        <div class="bg-[#1e2029]/95 border border-white/15 rounded-3xl p-6 shadow-2xl w-full max-w-lg text-white backdrop-blur-xl">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 flex items-center justify-center text-sm">
                        <i class="fas fa-keyboard"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-black uppercase tracking-wider text-white">Klávesové zkratky</h3>
                        <p class="text-[10px] text-gray-400">Rychlá navigace a bleskové ovládání kalendáře 3.0</p>
                    </div>
                </div>
                <button onclick="document.getElementById('cal-shortcuts-modal')?.remove()" class="text-gray-400 hover:text-white transition p-1 text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Spotlight Command Bar</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-pink-400">Cmd+K / Mezerník</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Skočit na Dnešek</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-amber-400">T</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Přepnout na Týden</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-[#5865F2]">W</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Přepnout na Měsíc</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-[#5865F2]">M</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Přepnout na Agendu</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-[#5865F2]">A</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Romantic Gap Finder</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-rose-400">G</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Ranní Briefing</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-amber-300">D</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <span class="text-gray-300 font-medium">Exportovat iCal</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-emerald-400">E</kbd>
                </div>
                <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between md:col-span-2">
                    <span class="text-gray-300 font-medium">Přepínání filtrů (Vše, FIT, Gym, Spánek, Voda, Zdraví)</span>
                    <kbd class="px-2 py-0.5 bg-[#12131a] border border-white/10 rounded-lg font-mono font-bold text-cyan-300">1 – 6</kbd>
                </div>
            </div>

            <div class="mt-4 pt-3 border-t border-white/10 text-center">
                <button onclick="document.getElementById('cal-shortcuts-modal')?.remove()" class="text-xs text-gray-400 hover:text-gray-200 transition font-bold">
                    Zavřít
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * 1-Click quick hydration logging directly from month cell without opening full modal.
 */
export async function quickAddWater(dateKey, event = null) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }

    state.healthData = state.healthData || {};
    state.healthData[dateKey] = state.healthData[dateKey] || {};

    const currentCount = state.healthData[dateKey].water_count ?? state.healthData[dateKey].water ?? 0;
    const countNum = typeof currentCount === 'number' ? currentCount : parseInt(currentCount, 10);
    const newCount = (!isNaN(countNum) && countNum >= 0) ? countNum + 1 : 1;

    state.healthData[dateKey].water_count = newCount;
    state.healthData[dateKey].water = newCount;

    if (newCount === 8) {
        triggerHaptic("heavy");
        playChime();
    } else {
        triggerHaptic("medium");
        playWaterDrop();
    }

    // Persist to Supabase in background
    try {
        await supabase.from('health_data').upsert({
            date_key: dateKey,
            water_count: newCount,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('[Calendar] Supabase water upsert notice:', err);
    }

    // Refresh month view
    const mainContent = document.getElementById('calendar-main-content');
    if (mainContent && getViewMode() === 'month') {
        const session = getCalSession();
        mainContent.innerHTML = generateMonthView(session.year, session.month);
    }
}

export function closePopovers() {
    closeQuickPopovers();
    hideDayHoverHUD();
    closeMiniPicker();
    closeAnalyticsDrawer();
    closeNLPModal();
    document.getElementById('cal-export-modal')?.remove();
    document.getElementById('cal-briefing-modal')?.remove();
    document.getElementById('cal-gap-modal')?.remove();
    document.getElementById('cal-shortcuts-modal')?.remove();
}

export function openEventDetail(targetElement, eventData, dateKey) {
    showEventDetailPopover(targetElement, eventData, dateKey);
}

if (typeof window !== 'undefined') {
    attachWindowCalendar();
    setupCalendarKeyboardShortcuts();
    setupClickOutside();
    startLiveTimer();
}

/**
 * Main entry point for rendering the calendar.
 * Supports both Week (time-grid) and Month modes.
 */
export function renderCalendar(year = null, month = null) {
    attachWindowCalendar();
    ensureModals();
    setupCalendarSync();
    closePopovers();
    
    // Lazy load gym and study/schedule data
    Promise.all([
        import('@core/state.js').then(s => s.ensureGymData?.()).catch(() => {}),
        import('@core/state.js').then(s => s.ensureStudyData?.()).catch(() => {})
    ]).then(() => {
        if (state.currentChannel === 'calendar') {
            const gridContainer = document.getElementById('calendar-main-content');
            if (gridContainer) {
                const mode = getViewMode();
                const session = getCalSession();
                if (mode === 'week') {
                    gridContainer.innerHTML = generateWeekView(getAnchorDate());
                } else if (mode === 'agenda') {
                    gridContainer.innerHTML = generateAgendaView(getAnchorDate());
                } else {
                    gridContainer.innerHTML = generateMonthView(session.year, session.month);
                }
                
                if (mode === 'week') {
                    autoScrollToCurrentTime();
                    initCalendarDragDrop(document.getElementById('cal-time-grid-scroll'));
                }
                setupTouchSwipe(gridContainer);
            }
        }
    }).catch(err => console.error('[Calendar] Error lazy loading gym/study:', err));
    
    const container = document.getElementById("messages-container");
    if (!container) return;

    if (state.loadError) {
        container.innerHTML = window.renderErrorState({
            message: "Nepodařilo se mi načíst tvé plány a události. Zkusíme to znovu rozmrazit?",
            onRetry: "window.loadModule('state').then(async m => { await m.initializeState(); Calendar.renderCalendar(); })"
        });
        return;
    }

    if (typeof year === 'number' && typeof month === 'number') {
        setCalSession(year, month);
    }

    const session = getCalSession();
    const mode = getViewMode();
    const anchor = getAnchorDate();
    const weekDates = getWeekDates(anchor);

    const monthNames = [
        "Leden", "Únor", "Březen", "Duben", "Květen", "Červen", 
        "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
    ];

    // Compute title for the header
    const headerTitle = (mode === 'week' || mode === 'agenda')
        ? formatWeekRangeTitle(weekDates)
        : `${monthNames[session.month]} <span class="text-gray-500 font-light text-xl">${session.year}</span>`;

    const animClass = getNavAnimation();

    let monthRows = 5;
    if (mode === 'month') {
        const firstDay = new Date(session.year, session.month, 1);
        const lastDay = new Date(session.year, session.month + 1, 0);
        const daysInMonth = lastDay.getDate();
        let startDayIndex = firstDay.getDay() - 1;
        if (startDayIndex === -1) startDayIndex = 6;
        monthRows = Math.ceil((startDayIndex + daysInMonth) / 7);
    }

    container.innerHTML = `
          <div class="flex flex-col h-full bg-[#36393f] animate-fade-in select-none">
              <!-- TOP CONTROL HEADER BAR (Clean, Single Row) -->
              <div class="bg-[#2f3136] shadow-sm z-10 flex-shrink-0 border-b border-[#202225]">
                  <div class="px-3 py-2 flex items-center justify-between gap-2 w-full max-w-6xl mx-auto flex-nowrap overflow-hidden">
                      <!-- Left: Title & Month Picker & Navigation -->
                      <div class="flex items-center gap-2 min-w-0 flex-shrink">
                          <h2 onclick="Calendar.toggleMiniPicker(this)" 
                              title="Kliknutím otevřeš mini-kalendář pro rychlý skok"
                              class="text-base md:text-xl font-black text-white flex items-center gap-1.5 cursor-pointer hover:text-[#5865F2] transition group truncate">
                              <span class="truncate">${headerTitle}</span>
                              <i class="fas fa-chevron-down text-[10px] text-gray-400 group-hover:text-[#5865F2] transition flex-shrink-0"></i>
                          </h2>
                          
                          <!-- Prev / Next Navigation Arrows -->
                          <div class="flex items-center gap-1 flex-shrink-0">
                              <button onclick="Calendar.navigate(-1)" 
                                      aria-label="Předchozí období" 
                                      class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#202225] hover:bg-[#40444b] text-gray-300 flex items-center justify-center transition border border-[#202225] hover:border-gray-500 active:scale-95">
                                  <i class="fas fa-chevron-left text-[10px] md:text-xs"></i>
                              </button>
                              <button onclick="Calendar.navigate(1)" 
                                      aria-label="Další období" 
                                      class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#202225] hover:bg-[#40444b] text-gray-300 flex items-center justify-center transition border border-[#202225] hover:border-gray-500 active:scale-95">
                                  <i class="fas fa-chevron-right text-[10px] md:text-xs"></i>
                              </button>
                          </div>
                      </div>

                      <!-- Right: Segmented Switcher [ Agenda | Týden | Měsíc ] -->
                      <div class="flex items-center gap-1 flex-shrink-0">
                          <div class="cal-segmented-control flex items-center bg-[#202225] p-0.5 md:p-1 rounded-lg md:rounded-xl border border-white/5 shadow-inner">
                              <button onclick="Calendar.switchViewMode('agenda')" 
                                      class="px-2 md:px-2.5 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-black transition flex items-center gap-1 ${
                                          mode === 'agenda' 
                                              ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/30' 
                                              : 'text-gray-400 hover:text-gray-200'
                                      }">
                                  <i class="fas fa-list-ul text-[10px]"></i><span class="hidden sm:inline"> Agenda</span>
                              </button>
                              <button onclick="Calendar.switchViewMode('week')" 
                                      class="px-2 md:px-2.5 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-black transition flex items-center gap-1 ${
                                          mode === 'week' 
                                              ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/30' 
                                              : 'text-gray-400 hover:text-gray-200'
                                      }">
                                  <i class="fas fa-calendar-week text-[10px]"></i><span class="hidden sm:inline"> Týden</span>
                              </button>
                              <button onclick="Calendar.switchViewMode('month')" 
                                      class="px-2 md:px-2.5 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-black transition flex items-center gap-1 ${
                                          mode === 'month' 
                                              ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/30' 
                                              : 'text-gray-400 hover:text-gray-200'
                                      }">
                                  <i class="fas fa-calendar-alt text-[10px]"></i><span class="hidden sm:inline"> Měsíc</span>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- FILTER PILLS BAR -->
              <div class="bg-[#36393f] flex-shrink-0 border-b border-[#202225]">
                  <div id="calendar-filters" class="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar w-full max-w-6xl mx-auto">
                      ${generateFilterButtons()}
                  </div>
              </div>

              <!-- MAIN CALENDAR VIEW CONTAINER -->
              <div class="flex-1 overflow-hidden flex flex-col h-full min-h-0">
                  ${mode === 'month' ? `
                      <div class="flex-1 overflow-hidden flex flex-col p-1.5 sm:p-2.5 md:p-3 max-w-6xl w-full mx-auto h-full min-h-0">
                          <div class="grid grid-cols-7 gap-1 md:gap-1.5 mb-1 text-center text-[10px] md:text-xs font-extrabold text-gray-500 uppercase tracking-widest flex-shrink-0">
                              <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
                          </div>

                          <div id="calendar-main-content" 
                               class="flex-1 grid grid-cols-7 gap-1 md:gap-1.5 min-h-0 overflow-hidden h-full ${animClass}" 
                               style="grid-template-rows: repeat(${monthRows}, minmax(0, 1fr));">
                              ${generateMonthView(session.year, session.month)}
                          </div>
                      </div>
                  ` : mode === 'agenda' ? `
                      <div id="calendar-main-content" class="flex-1 overflow-hidden flex flex-col h-full min-h-0 ${animClass}">
                          ${generateAgendaView(anchor)}
                      </div>
                  ` : `
                      <div id="calendar-main-content" class="flex-1 overflow-hidden flex flex-col h-full min-h-0 ${animClass}">
                          ${generateWeekView(anchor)}
                      </div>
                  `}
              </div>
          </div>`;

    if (mode === 'week') {
        autoScrollToCurrentTime();
        initCalendarDragDrop(document.getElementById('cal-time-grid-scroll'));
    }
    setupTouchSwipe(document.getElementById('calendar-main-content'));
}

/**
 * Auto-scrolls the week time-grid smoothly to near current hour.
 */
export function autoScrollToCurrentTime() {
    if (typeof document === 'undefined') return;
    setTimeout(() => {
        if (typeof document === 'undefined') return;
        const scrollContainer = document.getElementById('cal-time-grid-scroll');
        if (scrollContainer && typeof scrollContainer.scrollTo === 'function') {
            const currentHour = new Date().getHours();
            const targetPx = Math.max(0, (currentHour - START_HOUR - 1) * HOUR_HEIGHT);
            scrollContainer.scrollTo({ top: targetPx, behavior: 'smooth' });
        }
    }, 80);
}

/**
 * Starts 60-second timer to update Now Indicator position live without full re-render.
 */
export function startLiveTimer() {
    if (typeof document === 'undefined') return;
    if (liveTimerInterval) clearInterval(liveTimerInterval);
    liveTimerInterval = setInterval(() => {
        if (typeof document === 'undefined') return;
        if (state.currentChannel !== 'calendar' || getViewMode() !== 'week') return;

        const indicator = document.querySelector('.cal-now-indicator');
        const label = document.querySelector('.cal-now-label');
        if (indicator) {
            const pos = getNowIndicatorPosition(START_HOUR, HOUR_HEIGHT, END_HOUR);
            if (pos && pos.isVisible) {
                indicator.style.top = `${pos.offsetPx}px`;
                if (label) label.textContent = pos.currentTimeStr;
            }
        }
    }, 60000);
}

/**
 * Switches between 'agenda', 'week', and 'month' view modes and re-renders.
 */
export function switchViewMode(newMode) {
    if (newMode !== 'week' && newMode !== 'month' && newMode !== 'agenda') return;
    triggerHaptic("light");
    setViewMode(newMode);
    setNavAnimation('cal-anim-view-switch');
    renderCalendar();
}

/**
 * Navigates forward (+1) or backward (-1) based on current viewMode.
 */
export function navigate(delta) {
    triggerHaptic("light");
    navigatePeriod(delta);
    setNavAnimation(delta > 0 ? 'cal-anim-slide-next' : 'cal-anim-slide-prev');
    renderCalendar();
}

/**
 * Jumps straight to today's date and re-renders.
 */
export function goToToday() {
    triggerHaptic("light");
    jumpToToday();
    setNavAnimation('cal-anim-view-switch');
    renderCalendar();
}

/**
 * Handles clicks on time slots in the week grid to trigger 1-click Quick Add.
 */
export function handleGridSlotClick(event, dateKey) {
    const targetCol = event.currentTarget;
    if (!targetCol) return;

    const rect = targetCol.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const hourIndex = Math.floor(offsetY / HOUR_HEIGHT);
    const clickedHour = Math.min(END_HOUR, Math.max(START_HOUR, START_HOUR + hourIndex));
    const timeStr = `${String(clickedHour).padStart(2, '0')}:00`;

    showQuickAddPopover(targetCol, dateKey, timeStr);
}

/**
 * Updates the calendar filter and refreshes the content.
 */
export function setCalendarFilter(filterId) {
    state.calendarFilter = filterId;
    triggerHaptic("light");

    const filterContainer = document.getElementById("calendar-filters");
    if (filterContainer) filterContainer.innerHTML = generateFilterButtons();

    const mainContent = document.getElementById("calendar-main-content");
    if (mainContent) {
        mainContent.style.opacity = "0";
        setTimeout(() => {
            const mode = getViewMode();
            const session = getCalSession();
            if (mode === 'week') {
                mainContent.innerHTML = generateWeekView(getAnchorDate());
                autoScrollToCurrentTime();
                initCalendarDragDrop(document.getElementById('cal-time-grid-scroll'));
            } else {
                mainContent.innerHTML = generateMonthView(session.year, session.month);
            }
            mainContent.style.opacity = "1";
        }, 120);
    }
}

// --- NATURAL LANGUAGE SPOTLIGHT COMMAND BAR ---
export function openNLPModal() {
    triggerHaptic('light');
    closePopovers();

    const modal = document.createElement('div');
    modal.id = 'cal-nlp-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-start justify-center pt-16 md:pt-24 p-4 select-none animate-fade-in';
    modal.onclick = (e) => {
        if (e.target.id === 'cal-nlp-modal') closeNLPModal();
    };

    modal.innerHTML = `
        <div class="bg-[#1a1c24]/95 w-full max-w-xl rounded-3xl border border-white/15 shadow-[0_30px_70px_rgba(0,0,0,0.8)] p-5 md:p-6 backdrop-blur-2xl text-white select-none relative overflow-hidden" onclick="event.stopPropagation()">
            <!-- Header & Top bar -->
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 flex items-center justify-center text-sm font-bold shadow-sm">
                        <i class="fas fa-magic"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Spotlight Command Bar</h3>
                        <p class="text-[10px] text-gray-400">Napiš událost přirozeně v češtině nebo hledej příkazy</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    <kbd class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-400 border border-white/10">ESC</kbd>
                    <button onclick="Calendar.closeNLPModal()" class="w-7 h-7 rounded-lg bg-[#202225] hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Input Field with icon -->
            <div class="relative mb-3">
                <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                    <i class="fas fa-terminal text-[#5865F2]"></i>
                </div>
                <input type="text" id="nlp-input" 
                       placeholder="Např. Zítra v 17:00 Push Day nebo Pátek 19:30 Večeře s Klárkou..." 
                       class="w-full pl-10 pr-20 py-3.5 rounded-2xl bg-[#12131a] text-white border border-white/15 focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/30 outline-none text-sm font-medium transition shadow-inner placeholder-gray-500"
                       oninput="Calendar.handleNLPInputLive(this.value)"
                       onkeydown="if(event.key==='Enter') Calendar.handleNLPSubmit()"
                       autofocus />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <kbd class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-400 border border-white/10">Enter ↵</kbd>
                </div>
            </div>

            <!-- Live Preview Box -->
            <div id="nlp-preview-box" class="p-3.5 rounded-2xl bg-[#12131a] border border-white/10 mb-3 space-y-2 hidden animate-fade-in shadow-lg">
                <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1.5">
                        <span id="nlp-preview-cat-icon" class="text-sm">✨</span>
                        <span id="nlp-preview-title" class="font-black text-white text-sm"></span>
                    </div>
                    <span id="nlp-preview-time" class="font-mono text-purple-300 font-bold px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-xs"></span>
                </div>
                <div class="flex items-center gap-2 text-[11px] text-gray-400 pt-1 border-t border-white/5">
                    <span id="nlp-preview-date" class="font-mono text-gray-300 font-medium"></span>
                    <span>•</span>
                    <span id="nlp-preview-cat" class="uppercase font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-200"></span>
                    <span id="nlp-preview-dur" class="text-[10px] text-gray-400 ml-auto font-mono"></span>
                </div>
                <div id="nlp-preview-conflict" class="text-[10px] font-bold text-rose-400 hidden pt-1 flex items-center gap-1.5">
                    <i class="fas fa-exclamation-triangle"></i> <span id="nlp-preview-conflict-text"></span>
                </div>
            </div>

            <!-- Quick Suggestions when empty -->
            <div id="nlp-suggestions" class="space-y-2 text-xs">
                <div class="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Rychlé příklady & akce</div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                    <button type="button" onclick="document.getElementById('nlp-input').value='Zítra v 17:00 Push Day'; Calendar.handleNLPInputLive('Zítra v 17:00 Push Day'); document.getElementById('nlp-input').focus();"
                            class="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-left text-gray-300 hover:text-white transition flex items-center gap-2 group">
                        <span>🏋️‍♂️</span>
                        <span class="truncate font-medium text-[11px]">Zítra 17:00 Push Day</span>
                    </button>
                    <button type="button" onclick="document.getElementById('nlp-input').value='Pátek 19:30 Večeře s Klárkou'; Calendar.handleNLPInputLive('Pátek 19:30 Večeře s Klárkou'); document.getElementById('nlp-input').focus();"
                            class="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-left text-gray-300 hover:text-white transition flex items-center gap-2 group">
                        <span>❤️</span>
                        <span class="truncate font-medium text-[11px]">Pátek 19:30 Večeře</span>
                    </button>
                    <button type="button" onclick="document.getElementById('nlp-input').value='Středa 14:00 Projekt WIS'; Calendar.handleNLPInputLive('Středa 14:00 Projekt WIS'); document.getElementById('nlp-input').focus();"
                            class="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-left text-gray-300 hover:text-white transition flex items-center gap-2 group">
                        <span>🎓</span>
                        <span class="truncate font-medium text-[11px]">Středa 14:00 WIS</span>
                    </button>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="flex justify-between items-center pt-4 mt-3 border-t border-white/10">
                <button onclick="Calendar.showShortcutsModal(); Calendar.closeNLPModal();" class="text-xs text-gray-400 hover:text-gray-200 transition flex items-center gap-1 font-bold">
                    <i class="fas fa-keyboard text-[10px]"></i> Zkratky (?)
                </button>
                <div class="flex gap-2">
                    <button onclick="Calendar.closeNLPModal()" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition">
                        Zrušit
                    </button>
                    <button onclick="Calendar.handleNLPSubmit()" class="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-[#5865F2]/25">
                        <i class="fas fa-plus"></i> Uložit plán
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('nlp-input')?.focus(), 50);
}

export function closeNLPModal() {
    const modal = document.getElementById('cal-nlp-modal');
    if (modal) modal.remove();
}

export function handleNLPInputLive(text) {
    const previewBox = document.getElementById('nlp-preview-box');
    const suggestionsBox = document.getElementById('nlp-suggestions');
    if (!previewBox) return;

    if (!text || text.trim().length < 2) {
        previewBox.classList.add('hidden');
        if (suggestionsBox) suggestionsBox.classList.remove('hidden');
        return;
    }

    if (suggestionsBox) suggestionsBox.classList.add('hidden');

    const parsed = parseNaturalLanguageEvent(text);
    const conflicts = detectScheduleConflicts(parsed.dateKey, parsed.time, parsed.durationMinutes);

    const catIcons = {
        gym: '🏋️‍♂️',
        food: '🍔',
        date: '❤️',
        fit: '🎓',
        movie: '🎬',
        diary: '📝'
    };

    previewBox.classList.remove('hidden');
    document.getElementById('nlp-preview-title').textContent = parsed.title;
    document.getElementById('nlp-preview-time').textContent = parsed.time;
    document.getElementById('nlp-preview-date').textContent = parsed.dateKey;
    document.getElementById('nlp-preview-cat').textContent = parsed.cat;
    
    const catIconEl = document.getElementById('nlp-preview-cat-icon');
    if (catIconEl) catIconEl.textContent = catIcons[parsed.cat] || '📍';

    const durEl = document.getElementById('nlp-preview-dur');
    if (durEl) durEl.textContent = `${parsed.durationMinutes || 60} minut`;

    const conflictEl = document.getElementById('nlp-preview-conflict');
    const conflictText = document.getElementById('nlp-preview-conflict-text');
    if (conflicts.hasConflict) {
        conflictEl.classList.remove('hidden');
        conflictText.textContent = `Kolize: ${conflicts.conflictingEvents.map(c => c.title).join(', ')}`;
    } else {
        conflictEl.classList.add('hidden');
    }
}

export async function handleNLPSubmit() {
    const input = document.getElementById('nlp-input');
    if (!input || !input.value.trim()) return;

    const parsed = parseNaturalLanguageEvent(input.value.trim());
    triggerHaptic('medium');

    state.plannedDates = state.plannedDates || {};
    state.plannedDates[parsed.dateKey] = {
        name: parsed.title,
        cat: parsed.cat,
        time: parsed.time,
        durationMinutes: parsed.durationMinutes
    };

    try {
        await supabase.from('planned_dates').upsert({
            date_key: parsed.dateKey,
            name: parsed.title,
            cat: parsed.cat,
            time: parsed.time
        });
    } catch (e) {
        console.warn('[Calendar NLP] Supabase upsert notice:', e);
    }

    closeNLPModal();
    renderCalendar();
}

// --- TOUCH SWIPE FOR MOBILE GESTURES ---
export function setupTouchSwipe(container) {
    if (!container) return;

    try {
        container.style.touchAction = 'pan-y';
    } catch {}

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let isHorizontal = false;

    const handleStart = (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        if (e.target.closest('button, input, select, textarea, .cal-resize-handle, #cal-quick-popover, #day-modal')) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
        isHorizontal = false;
    };

    const handleMove = (e) => {
        if (!isSwiping || !e.touches || e.touches.length !== 1) return;
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        const diffX = curX - touchStartX;
        const diffY = curY - touchStartY;

        // Check if the gesture is predominantly horizontal
        if (!isHorizontal && Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
            isHorizontal = true;
        }

        // Live elastic resistance feedback during drag
        if (isHorizontal && Math.abs(diffX) < 180) {
            const targetEl = document.getElementById('calendar-main-content') || container;
            if (targetEl) {
                targetEl.style.transform = `translateX(${diffX * 0.4}px)`;
                targetEl.style.transition = 'none';
            }
        }
    };

    const handleEnd = (e) => {
        if (!isSwiping) return;
        isSwiping = false;

        const targetEl = document.getElementById('calendar-main-content') || container;
        if (targetEl) {
            targetEl.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
            targetEl.style.transform = 'translateX(0px)';
        }

        if (!e.changedTouches || e.changedTouches.length === 0) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Horizontal swipe threshold (> 35px and mainly horizontal)
        if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
            triggerHaptic('light');
            if (diffX > 0) {
                navigate(-1); // Swipe right -> previous period
            } else {
                navigate(1);  // Swipe left -> next period
            }
        }
        isHorizontal = false;
    };

    // Assign both for backward compatibility with direct tests and event listeners
    container.ontouchstart = handleStart;
    container.ontouchmove = handleMove;
    container.ontouchend = handleEnd;

    // Attach event listeners with non-passive or passive options
    container.removeEventListener('touchstart', container._touchStartFn);
    container.removeEventListener('touchmove', container._touchMoveFn);
    container.removeEventListener('touchend', container._touchEndFn);

    container._touchStartFn = handleStart;
    container._touchMoveFn = handleMove;
    container._touchEndFn = handleEnd;

    container.addEventListener('touchstart', handleStart, { passive: true });
    container.addEventListener('touchmove', handleMove, { passive: true });
    container.addEventListener('touchend', handleEnd, { passive: true });
}


// --- GLOBAL CLICK OUTSIDE & ESCAPE HANDLERS ---
function setupClickOutside() {
    if (clickOutsideListenerSet || typeof window === 'undefined') return;

    window.addEventListener('click', (e) => {
        if (state.currentChannel !== 'calendar') return;
        const popover = document.getElementById('cal-quick-popover');
        const miniPicker = document.getElementById('cal-mini-picker-dropdown');
        const nlpModal = document.getElementById('cal-nlp-modal');
        const exportModal = document.getElementById('cal-export-modal');
        const briefingModal = document.getElementById('cal-briefing-modal');

        if (popover && !popover.contains(e.target) && !e.target.closest('.cal-day-column') && !e.target.closest('.cal-event-card')) {
            closeQuickPopovers();
        }

        if (miniPicker && !miniPicker.contains(e.target) && !e.target.closest('h2')) {
            closeMiniPicker();
        }

        if (nlpModal && e.target === nlpModal) {
            closeNLPModal();
        }

        if (exportModal && e.target === exportModal) {
            exportModal.remove();
        }

        if (briefingModal && e.target === briefingModal) {
            briefingModal.remove();
        }
    });

    clickOutsideListenerSet = true;
}



// --- SYNC LISTENERS ---
export function setupCalendarSync() {
    if (calendarSyncSet || typeof window === 'undefined') return;

    const refreshActiveView = () => {
        if (state.currentChannel === 'calendar') {
            const mainContent = document.getElementById('calendar-main-content');
            if (mainContent) {
                const mode = getViewMode();
                const session = getCalSession();
                mainContent.innerHTML = mode === 'week'
                    ? generateWeekView(getAnchorDate())
                    : generateMonthView(session.year, session.month);
                
                if (mode === 'week') {
                    initCalendarDragDrop(document.getElementById('cal-time-grid-scroll'));
                }
            }
        }
    };

    window.addEventListener('planned-dates-updated', (e) => {
        const payload = e.detail?.payload;
        const row = payload?.new || payload?.old;
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

        refreshActiveView();

        if (getCurrentModalDateKey() === row.date_key) {
            showDayDetail(row.date_key);
        }
    });

    window.addEventListener('gym-logs-updated', (e) => {
        refreshActiveView();
        const targetDateKey = e?.detail?.dateKey || getCurrentModalDateKey();
        if (targetDateKey) {
            showDayDetail(targetDateKey);
        }
    });

    window.addEventListener('schedule-updated', () => {
        refreshActiveView();
    });

    calendarSyncSet = true;
}

export default {
    renderCalendar,
    setCalendarFilter,
    switchViewMode,
    navigate,
    goToToday,
    setupCalendarSync,
    attachWindowCalendar,
    closePopovers
};
