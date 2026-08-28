/**
 * Kiscord Main Dashboard Module Orchestrator (#můj-den)
 */

import { supabase } from '@core/supabase.js';
import {
    state,
    saveStateToCache,
    stateEvents,
    ensureDailyQuizData,
    ensureAllHealthData
} from '@core/state.js';
import { getInflectedName, getTodayKey, triggerConfetti } from '@core/utils.js';
import { getTodayData } from '@domains/fitness/health.js';

export * from './sunflowers.js';
export * from './health_ui.js';
export * from './chat.js';
export * from './planning.js';
export * from './widgets.js';
export * from './habits-widget.js';
export * from './fit-dorm-widget.js';
export * from './love-levels-widget.js';
export * from './daily-question-widget.js';
export * from './interactions.js';

import { updateSunflowersDOM, generateSunflowerSVG } from './sunflowers.js';
import {
    generateMoodSlider,
    generateSleepSlider,
    generateWaterIcons,
    generateMovementChips,
    generatePillsChip,
    generateSupplementsChips,
    updateWaterVisuals,
    updateMovementVisuals,
    updatePillsVisuals,
    updateSupplementsVisuals,
    updateMoodVisuals,
    updateSleep,
    hideMoodBubble
} from './health_ui.js';
import {
    showQuickPlanModal,
    selectQuickPlanCategory,
    submitQuickPlan,
    respondToPlan,
    showRejectionModal,
    rejectPlanWithReason,
    startDashboardTimer,
    handleNextDateClick
} from './planning.js';
import { generateHabitsDashboardWidget, toggleHabitFromDashboard } from './habits-widget.js';
import { generateFitAndDormDashboardWidget } from './fit-dorm-widget.js';
import { generateLoveAndLevelsWidget } from './love-levels-widget.js';
import { generateDailyQuestionCard, submitDailyAnswerFromDashboard } from './daily-question-widget.js';
import {
    sendSunlight,
    inspectPartnerSunflower,
    initBedtimeReminder,
    handleEasterEggClick,
    getDaysTogether
} from './interactions.js';

let dashboardListenersSet = false;
let renderTimeout = null;

function renderTopPlanningSnippet(nextDate, todayStr) {
    if (!nextDate) {
        return `
            <div class="text-[#949ba4] text-xs font-medium w-full flex items-center justify-between cursor-pointer py-1" onclick="window.showQuickPlanModal(1)">
                <span>Nic v plánu na dnes...</span>
                <span class="font-bold text-[#eb459e] hover:underline flex items-center gap-1">
                    Naplánovat rande / hovor? 🥂
                </span>
            </div>
        `;
    }

    const [dateKey, entry] = nextDate;
    const isPendingFromPartner = entry.status === 'pending' && entry.proposed_by !== state.currentUser?.id;
    const isPendingFromMe = entry.status === 'pending' && entry.proposed_by === state.currentUser?.id;

    if (isPendingFromPartner) {
        const dateLabel = dateKey === todayStr ? 'Dnes' : dateKey;
        return `
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                    <span class="text-base">💌</span>
                    <div>
                        <div class="text-[9px] font-black text-[#eb459e] uppercase">Pozvánka od partnera: ${dateLabel}</div>
                        <div class="font-bold text-white text-xs truncate max-w-[180px]">${entry.name}</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="event.stopPropagation(); window.respondToPlan('${dateKey}', 'confirmed')" 
                            class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition shadow">
                        Jasně ✅
                    </button>
                    <button onclick="event.stopPropagation(); window.showRejectionModal('${dateKey}')" 
                            class="bg-[#35373c] hover:bg-[#404249] text-[#dbdee1] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition">
                        Teď ne
                    </button>
                </div>
            </div>
        `;
    }

    if (isPendingFromMe) {
        return `
            <div class="flex items-center justify-between w-full" onclick="window.handleNextDateClick('${dateKey}')">
                <div class="flex items-center gap-2 opacity-80">
                    <span class="text-base">⏳</span>
                    <div>
                        <div class="text-[9px] font-bold text-[#949ba4] uppercase">Čekám na odpověď partnera...</div>
                        <div class="font-bold text-white text-xs">${entry.name}</div>
                    </div>
                </div>
                <i class="fas fa-hourglass-half text-[#949ba4] text-[10px]"></i>
            </div>
        `;
    }

    return `
        <div class="flex items-center justify-between w-full" onclick="window.handleNextDateClick('${dateKey}')">
            <div class="flex items-center gap-2">
                <span class="text-base">📅</span>
                <div>
                    <div class="text-[9px] font-bold text-[#949ba4] uppercase">Příště: <span id="countdown-timer" class="text-[#5865F2] font-mono font-bold">--:--:--</span></div>
                    <div class="font-bold text-white text-xs">${entry.name}</div>
                </div>
            </div>
            <i class="fas fa-chevron-right text-[#949ba4] text-[10px]"></i>
        </div>
    `;
}

export async function renderDashboard(forceRefresh = false) {
    ensureDailyQuizData();
    ensureAllHealthData();

    if (renderTimeout) clearTimeout(renderTimeout);
    
    renderTimeout = setTimeout(() => {
        actuallyRenderDashboard(forceRefresh);
    }, 20);
}

async function actuallyRenderDashboard(forceRefresh = false) {
    if (state.currentChannel !== 'dashboard') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    const todayKey = getTodayKey();
    if (!state.healthData) state.healthData = {};
    if (!state.healthData[todayKey]) {
        state.healthData[todayKey] = { water: 0, sleep: 0, mood: 5, movement: [], pills: false, bedtime: null, supplements: { iron: false, zinc: false, magnesium: false } };
    }

    if (navigator.onLine && (!state.dashboardFetched || forceRefresh)) {
        syncDashboardData(forceRefresh);
    }

    const data = getTodayData();
    const todayObj = new Date();
    const isKlarkaNameDay = todayObj.getMonth() === 7 && todayObj.getDate() === 12;

    if (isKlarkaNameDay && !window._nameDayConfettiFired) {
        window._nameDayConfettiFired = true;
        setTimeout(() => { triggerConfetti(); }, 300);
    }

    const niceDate = todayObj.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
    const hour = todayObj.getHours();
    let greeting = isKlarkaNameDay ? "Krásný svátek 🎉" : (hour >= 18 ? "Krásný večer" : (hour >= 11 ? "Ahoj" : "Dobré ráno"));
    const daysTogether = getDaysTogether();

    const todayStr = new Date().toISOString().split("T")[0];
    const upcomingDates = Object.entries(state.plannedDates || {})
        .filter(([date]) => date >= todayStr)
        .sort((a, b) => a[0].localeCompare(b[0]));
    const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

    startDashboardTimer(nextDate);

    container.innerHTML = `
        <div class="flex-1 overflow-y-auto no-scrollbar bg-[var(--bg-primary)] relative w-full h-full pb-24 select-none font-sans">
            <!-- DISCORD HERO BANNER -->
            <div class="relative shadow-md overflow-hidden flex-shrink-0 pt-4 pb-0 bg-gradient-to-b from-[var(--bg-tertiary)] via-[var(--bg-secondary)] to-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                
                <div class="relative z-10 px-5 max-w-4xl mx-auto flex justify-between items-end min-h-[120px] pb-5">
                    <div class="pb-1">
                        <p class="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">${niceDate}</p>
                        <h1 class="text-xl sm:text-2xl font-black text-[var(--text-header)] leading-tight flex items-center gap-3">
                            <span>${isKlarkaNameDay 
                                ? `Všechno nejlepší k svátku, <br>${state.currentUser?.name === 'Klárka' ? 'Klárko! 👑🌸' : 'pro Klárku! 🎉🌸'}` 
                                : `${greeting}, <br>${getInflectedName(state.currentUser?.name, 5)} 🌞`}</span>
                            <div id="dashboard-sync-indicator" class="hidden opacity-40 pb-1">
                                <i class="fas fa-sync-alt fa-spin text-[10px]"></i>
                            </div>
                        </h1>

                        <div class="flex items-center gap-2 mt-3">
                            <div class="bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl text-center border border-[var(--border-subtle)] cursor-pointer active:scale-95 transition" 
                                 onclick="window.handleEasterEggClick()">
                                <span class="block text-[8px] uppercase font-bold text-[var(--text-muted)] leading-none mb-0.5">Spolu</span>
                                <span class="block text-xs font-black text-[var(--text-header)] leading-none">${daysTogether} dní ❤️</span>
                            </div>
                            <button onclick="window.sendSunlight()" 
                                    class="sun-send-btn w-8 h-8 bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] rounded-xl border border-[var(--border-subtle)] flex items-center justify-center text-base shadow transition-all active:scale-90"
                                    title="Poslat sluneční paprsek">
                                <span>☀️</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Rostoucí slunečnice pro oba -->
                    <div class="flex gap-3 items-end pb-0">
                        <div id="sunflower-me-container" class="flex flex-col items-center w-16 relative group cursor-pointer" 
                             onclick="window.inspectPartnerSunflower(false)" title="Klikni pro detaily">
                            ${generateSunflowerSVG(data, false)}
                            <span class="absolute -bottom-4 left-0 w-full text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">${state.currentUser?.name}</span>
                        </div>
                        <div id="sunflower-partner-container" class="flex flex-col items-center w-16 relative group cursor-pointer" 
                             onclick="window.inspectPartnerSunflower(true)" title="Klikni pro detaily partnera">
                            ${generateSunflowerSVG(state.partnerHealthData || null, true)}
                            <span class="absolute -bottom-4 left-0 w-full text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">${state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka'}</span>
                        </div>
                    </div>
                </div>

                <!-- Plánovací lišta v záhlaví -->
                <div id="dashboard-planning-area" class="bg-[var(--bg-secondary)]/90 border-t border-[var(--border-subtle)] px-5 py-2.5 flex items-center justify-between cursor-pointer">
                    <div class="max-w-4xl mx-auto w-full">
                        ${renderTopPlanningSnippet(nextDate, todayStr)}
                    </div>
                </div>
            </div>

            <!-- HLAVNÍ OBSAHOVÁ MŘÍŽKA: BENTO CONTAINER HUB -->
            <div class="dashboard-container max-w-4xl mx-auto px-4 mt-5 space-y-4">
                
                <!-- 1. ŘADA: SPÁNEK & VODA -->
                ${state.settings.dashboardWidgets.health !== false ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Spánek -->
                        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-2">
                            <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-moon text-[var(--blurple)]"></i> Jak ses vyspal/a?
                            </h3>
                            <div id="sleep-container">${generateSleepSlider(data)}</div>
                        </div>

                        <!-- Voda -->
                        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
                            <div class="flex justify-between items-center">
                                <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5">
                                    <i class="fas fa-tint text-[#00aff4]"></i> Pitný režim
                                </h3>
                                <span class="text-[11px] font-black text-sky-400" id="water-count">${data.water || 0} / 8 sklenic</span>
                            </div>
                            <div class="grid grid-cols-8 gap-1 sm:gap-1.5 pt-2 w-full" id="water-container">${generateWaterIcons(data.water || 0)}</div>
                        </div>
                    </div>

                    <!-- 2. ŘADA: NÁLADA & POHYB/LÉKY -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Nálada -->
                        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-2">
                            <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-smile text-[#faa61a]"></i> Jak se dnes cítíš?
                            </h3>
                            <div id="mood-container">${generateMoodSlider(data.mood)}</div>
                        </div>

                        <!-- Pohyb & Léky -->
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-sm space-y-2">
                                <h3 class="text-[11px] font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1">
                                    <i class="fas fa-running text-[#3ba55c]"></i> Pohyb
                                </h3>
                                <div class="flex flex-col gap-2 pt-1" id="movement-container">${generateMovementChips(data.movement)}</div>
                            </div>
                            <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-sm space-y-2">
                                <h3 class="text-[11px] font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1">
                                    <i class="fas fa-pills text-[#eb459e]"></i> Léky
                                </h3>
                                <div class="pt-1" id="pills-container">${generatePillsChip(data.pills)}</div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- 3. SUPLEMENTY & REGENERACE -->
                ${state.settings.dashboardWidgets.supplements !== false ? `
                    <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-3">
                        <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fas fa-shield-alt text-[#3ba55c]"></i> Regenerace & Suplementy
                        </h3>
                        <div class="flex gap-3" id="supplements-container">${generateSupplementsChips(data.supplements)}</div>
                    </div>
                ` : ''}

                <!-- 4. DENNÍ NÁVYKY TRACKER -->
                ${generateHabitsDashboardWidget()}

                <!-- 5. VUT FIT & KOLEJE WIDGET -->
                ${state.settings.dashboardWidgets.schoolDorm !== false ? generateFitAndDormDashboardWidget() : ''}

                <!-- 6. VZTAHOVÉ LEVELY & LOVE COINS -->
                ${state.settings.dashboardWidgets.loveShop !== false ? generateLoveAndLevelsWidget() : ''}

                <!-- 7. DENNÍ OTÁZKA -->
                ${state.settings.dashboardWidgets.dailyQuestion !== false ? generateDailyQuestionCard() : ''}
            </div>
        </div>
    `;

    setupDashboardEvents();
    updateSunflowersDOM();
    initBedtimeReminder();
    attachWindowDashboardGlobals();
}

export function renderWelcome() {
    renderDashboard();
}

export async function syncDashboardData(forceRefresh = false) {
    const todayKey = getTodayKey();
    const indicator = document.getElementById("dashboard-sync-indicator");
    if (indicator) indicator.classList.remove("hidden");

    try {
        const { data, error } = await supabase.rpc('get_full_dashboard_bootstrap', { 
            p_user_id: state.currentUser?.id, 
            p_date_key: todayKey 
        });
        if (error) throw error;

        state.dashboardFetched = true;
        const dashData = data || {};

        if (dashData.health) {
            state.healthData[todayKey] = { ...state.healthData[todayKey], ...dashData.health };
        }
        if (dashData.partner_health) {
            state.partnerHealthData = dashData.partner_health;
        }
        if (dashData.pinned_drawing) {
            state.pinnedDrawing = dashData.pinned_drawing;
        }
        if (dashData.tetris) {
            state.tetris = { ...state.tetris, ...dashData.tetris };
        }
        if (dashData.next_event && dashData.next_event.date_key) {
            state.plannedDates[dashData.next_event.date_key] = dashData.next_event;
        }
        if (dashData.active_quests) {
            state.coopQuests = dashData.active_quests;
        }
        if (dashData.relationship_xp !== undefined && dashData.relationship_xp !== null) {
            state.relationshipXP = dashData.relationship_xp;
            const { setLevelXP } = await import('@domains/entertainment/levels.js');
            if (typeof setLevelXP === 'function') {
                setLevelXP(dashData.relationship_xp, false);
            }
        }

        // Hydrate Habits directly from bootstrap without extra network calls
        if (dashData.habits || dashData.habit_logs) {
            const { setHabitsFromBootstrap } = await import('../habits.js');
            setHabitsFromBootstrap(dashData.habits || [], dashData.habit_logs || []);
            if (state.currentChannel === 'dashboard') {
                const widgetContainer = document.querySelector('[data-dashboard-habits-container]');
                if (widgetContainer) {
                    widgetContainer.outerHTML = generateHabitsDashboardWidget();
                }
            }
        }

        saveStateToCache();

        if (state.currentChannel === 'dashboard') {
            updateSunflowersDOM();
            updateWaterVisuals();
            updateMovementVisuals();
            updatePillsVisuals();
            updateSupplementsVisuals();
            updateMoodVisuals(getTodayData().mood);
            updateSleep(getTodayData().sleep);
        }
    } catch (err) {
        console.warn("[Dashboard] Bootstrap RPC Error, falling back to direct table sync:", err);
        try {
            const { syncWithSupabase } = await import('@core/state.js');
            await syncWithSupabase();
            const habitsModule = await import('../habits.js');
            if (typeof habitsModule.ensureHabitsData === 'function') {
                await habitsModule.ensureHabitsData(true);
            } else if (typeof habitsModule.loadHabitsData === 'function') {
                await habitsModule.loadHabitsData();
            }
            
            if (state.currentChannel === 'dashboard') {
                updateSunflowersDOM();
                updateWaterVisuals();
                updateMovementVisuals();
                updatePillsVisuals();
                updateSupplementsVisuals();
                updateMoodVisuals(getTodayData().mood);
                updateSleep(getTodayData().sleep);
                const widgetContainer = document.querySelector('[data-dashboard-habits-container]');
                if (widgetContainer) {
                    widgetContainer.outerHTML = generateHabitsDashboardWidget();
                }
            }
        } catch (fallbackErr) {
            console.error("[Dashboard] Fallback direct sync failed:", fallbackErr);
        }
    } finally {
        if (indicator) indicator.classList.add("hidden");
    }
}

export function setupDashboardEvents() {
    if (dashboardListenersSet) return;

    window.addEventListener('health-updated', () => {
        if (state.currentChannel === 'dashboard') {
            updateSunflowersDOM();
            updateWaterVisuals();
            updateMovementVisuals();
            updatePillsVisuals();
            updateSupplementsVisuals();
            updateMoodVisuals(getTodayData().mood);
            updateSleep(getTodayData().sleep);
        }
    });

    window.addEventListener('sunlight-received', () => {
        import('@core/utils.js').then(u => {
            u.triggerHaptic('heavy');
            u.triggerConfetti();
        });
        import('@core/theme.js').then(t => {
            t.showNotification("Dostal/a jsi sluneční paprsek! ☀️", "success");
        });
    });

    window.addEventListener('daily-questions-updated', () => {
        if (state.currentChannel === 'dashboard') renderDashboard();
    });

    window.addEventListener('love-shop-updated', () => {
        if (state.currentChannel === 'dashboard') renderDashboard();
    });

    window.addEventListener('relationship-xp-updated', () => {
        if (state.currentChannel === 'dashboard') renderDashboard();
    });

    window.addEventListener('habits-updated', () => {
        if (state.currentChannel === 'dashboard') {
            const widgetContainer = document.querySelector('[data-dashboard-habits-container]');
            if (widgetContainer) {
                widgetContainer.outerHTML = generateHabitsDashboardWidget();
            }
        }
    });

    stateEvents.on('settings_changed', () => {
        if (state.currentChannel === 'dashboard') renderDashboard();
    });

    dashboardListenersSet = true;
}

export function attachWindowDashboardGlobals() {
    window.submitDailyAnswerFromDashboard = submitDailyAnswerFromDashboard;
    window.sendSunlight = sendSunlight;
    window.handleEasterEggClick = handleEasterEggClick;
    window.handleNextDateClick = handleNextDateClick;
    window.hideMoodBubble = hideMoodBubble;
    window.updateMoodVisuals = updateMoodVisuals;
    window.updateSleep = updateSleep;
    window.showQuickPlanModal = showQuickPlanModal;
    window.selectQuickPlanCategory = selectQuickPlanCategory;
    window.submitQuickPlan = submitQuickPlan;
    window.respondToPlan = respondToPlan;
    window.showRejectionModal = showRejectionModal;
    window.rejectPlanWithReason = rejectPlanWithReason;
    window.inspectPartnerSunflower = inspectPartnerSunflower;
    window.toggleHabitFromDashboard = toggleHabitFromDashboard;
}

attachWindowDashboardGlobals();

export default {
    renderDashboard,
    renderWelcome,
    setupDashboardEvents,
    syncDashboardData,
    generateHabitsDashboardWidget,
    generateFitAndDormDashboardWidget,
    generateLoveAndLevelsWidget,
    generateDailyQuestionCard,
    attachWindowDashboardGlobals
};
