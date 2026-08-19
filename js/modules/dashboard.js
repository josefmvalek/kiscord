import { supabase } from '../core/supabase.js';
import {
    state,
    saveStateToCache,
    stateEvents,
    awardLoveCoinsToCurrentUser,
    ensureDailyQuizData,
    ensureAllHealthData
} from '../core/state.js';
import { triggerHaptic, getInflectedName, getTodayKey, triggerConfetti } from '../core/utils.js';
import { getAssetUrl } from '../core/assets.js';
import { showNotification } from '../core/theme.js';
import { broadcastSunlight } from '../core/sync.js';
import { getTodayData, getPillsStreak } from './health.js';
import { getCurrentLevelData, openRelationshipMilestonesModal } from './levels.js';
import { isJosef } from '../core/auth.js';

// Re-export modularized components for backwards compatibility
export * from './dashboard/sunflowers.js';
export * from './dashboard/health_ui.js';
export * from './dashboard/chat.js';
export * from './dashboard/planning.js';

import { updateSunflowersDOM, generateSunflowerSVG } from './dashboard/sunflowers.js';
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
} from './dashboard/health_ui.js';

import {
    showQuickPlanModal,
    selectQuickPlanCategory,
    submitQuickPlan,
    respondToPlan,
    showRejectionModal,
    rejectPlanWithReason,
    startDashboardTimer,
    handleNextDateClick
} from './dashboard/planning.js';

let dashboardListenersSet = false;
let bedtimeReminderInterval = null;
let easterEggClicks = 0;
let lastEasterEggClick = 0;
let renderTimeout = null;

// --- VUT FIT & KOLEJE LIVE CONTEXT WIDGET ---
export function generateFitAndDormDashboardWidget() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Ne, 1 = Po, 5 = Pá
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return `
        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-3.5 select-none">
            <div class="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                    🎓 VUT FIT & Koleje Brno
                </h3>

                <div class="flex items-center gap-1.5">
                    <button onclick="window.switchChannel('schedule')" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-normal)] hover:text-[var(--text-header)] rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        Rozvrh <i class="fas fa-chevron-right text-[8px] text-[var(--blurple)]"></i>
                    </button>
                    <button onclick="window.switchChannel('dorm-hub')" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--yellow)] hover:text-amber-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        Koleje <i class="fas fa-building text-[8px]"></i>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- 1. Dnešní výuka -->
                <div class="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center gap-3 transition cursor-pointer" onclick="window.switchChannel('schedule')">
                    <div class="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-base text-emerald-400 flex-shrink-0">
                        ${isWeekend ? '🌴' : '💻'}
                    </div>
                    <div class="min-w-0">
                        <span class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Výuka dnes</span>
                        <p class="text-xs font-bold text-[var(--text-header)] truncate">
                            ${isWeekend ? 'Víkendové volno 🎉' : 'Otevřít dnešní rozvrh hodin'}
                        </p>
                    </div>
                </div>

                <!-- 2. Společná okénka -->
                <div class="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center gap-3 transition cursor-pointer" onclick="window.switchChannel('schedule')">
                    <div class="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-base text-amber-400 flex-shrink-0">
                        ☕
                    </div>
                    <div class="min-w-0">
                        <span class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Společný čas</span>
                        <p class="text-xs font-bold text-amber-400 truncate">
                            Volná okénka na oběd & relax
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- LOVE & LEVELS WIDGET ---
export function generateLoveAndLevelsWidget() {
    const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const myCoins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);
    const partnerName = isMeJose ? "Klárka" : "Jožka";
    const partnerCoins = isMeJose ? (state.loveCoins?.klarka || 0) : (state.loveCoins?.jose || 0);

    const levelInfo = getCurrentLevelData();
    const unredeemedCoupons = (state.inventory || []).filter(c => !c.is_redeemed);
    const unredeemedCount = unredeemedCoupons.length;

    return `
        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-3.5 select-none relative overflow-hidden">
            <!-- Horní lišta -->
            <div class="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                <div class="flex items-center gap-2">
                    <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        ❤️ Vztahový Rituál & Tržnice
                    </h3>
                    <span class="text-[9px] bg-[var(--bg-tertiary)] text-amber-400 font-bold px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">Level ${levelInfo.level}</span>
                </div>

                <div class="flex items-center gap-1.5">
                    <button onclick="window.openRelationshipMilestonesModal()" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        <i class="fas fa-trophy text-[9px]"></i> Milníky
                    </button>
                    <button onclick="window.switchChannel('love-shop')" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--blurple)] hover:text-[var(--text-header)] rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        <i class="fas fa-store text-[9px]"></i> Obchůdek
                    </button>
                </div>
            </div>

            <!-- Střední část: Progress bar do dalšího levelu -->
            <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-amber-500/30 transition-all"
                 onclick="window.openRelationshipMilestonesModal()" title="Klikni pro zobrazení Stromu milníků">
                <div class="flex justify-between items-center text-[10px] font-bold mb-1.5">
                    <span class="text-[var(--text-normal)] flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                        Postup do Levelu ${levelInfo.level + 1}
                    </span>
                    <span class="text-amber-400 font-black">${levelInfo.currentXP} / ${levelInfo.nextXP} XP (${levelInfo.progressPercentage}%)</span>
                </div>
                <div class="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden p-[1px] border border-[var(--border-subtle)]">
                    <div class="h-full rounded-full bg-gradient-to-r ${levelInfo.color} transition-all duration-700" style="width: ${levelInfo.progressPercentage}%"></div>
                </div>
            </div>

            <!-- Spodní část: Peněženky a Spížka -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Peněženka -->
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                        <span class="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest block">Tvoje konto</span>
                        <span class="text-sm font-black text-yellow-400 flex items-center gap-1">${myCoins} <i class="fas fa-coins text-[10px] text-yellow-500"></i></span>
                    </div>
                    <div class="text-right">
                        <span class="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest block">${partnerName}</span>
                        <span class="text-sm font-black text-[var(--text-normal)] flex items-center justify-end gap-1">${partnerCoins} <i class="fas fa-coins text-[10px] text-gray-400"></i></span>
                    </div>
                </div>

                <!-- Spížka rychlý status -->
                <div class="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between cursor-pointer transition"
                     onclick="window.switchChannel('love-shop')">
                    <div class="min-w-0 pr-2">
                        <span class="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest block">Moje Spížka</span>
                        <span class="text-xs font-bold ${unredeemedCount > 0 ? 'text-[#eb459e]' : 'text-[var(--text-normal)]'} truncate block">
                            ${unredeemedCount > 0 ? `🎁 ${unredeemedCount} kupón${unredeemedCount > 1 ? (unredeemedCount < 5 ? 'y' : 'ů') : ''}` : 'Prázdná'}
                        </span>
                    </div>
                    <i class="fas fa-chevron-right text-[var(--text-muted)] text-[10px]"></i>
                </div>
            </div>
        </div>
    `;
}

// --- DAILY QUESTION COMPACT ---
function generateDailyQuestionCard() {
    if (!state.dailyQuestion) return '';

    const myAnswer = state.dailyAnswers?.find(a => a.user_id === state.currentUser?.id);
    const partnerAnswer = state.dailyAnswers?.find(a => a.user_id !== state.currentUser?.id);
    const isRevealed = !!(myAnswer && partnerAnswer);

    let content = `
        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm select-none">
            <div class="flex justify-between items-start mb-3 pb-2 border-b border-[var(--border-subtle)]">
                <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-2 leading-none">
                    <i class="fas fa-comment-dots text-[#faa61a]"></i> Dnešní otázka pro nás dva
                </h3>
                <button onclick="window.switchChannel('daily-questions')" 
                        class="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-header)] transition font-bold uppercase tracking-wider flex items-center gap-1">
                    archiv <i class="fas fa-chevron-right text-[8px] text-[var(--blurple)]"></i>
                </button>
            </div>

            <div class="mb-4">
                <h2 class="text-sm sm:text-base font-bold text-[var(--text-header)] leading-relaxed">"${state.dailyQuestion.text}"</h2>
            </div>
    `;

    if (!myAnswer) {
        content += `
            <div class="space-y-3">
                <div class="bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-subtle)] focus-within:border-[var(--blurple)] transition-colors">
                    <textarea id="dashboard-daily-answer-input" 
                              placeholder="Tvoje upřímná odpověď..." 
                              class="w-full bg-transparent text-[var(--text-normal)] text-xs sm:text-sm outline-none resize-none min-h-[65px] placeholder-[var(--text-muted)] font-medium leading-relaxed custom-scrollbar"></textarea>
                </div>
                <button id="dashboard-btn-submit-answer"
                        onclick="window.submitDailyAnswerFromDashboard()" 
                        class="w-full bg-[var(--blurple)] hover:bg-[var(--blurple-hover)] text-white py-2.5 px-4 rounded-xl font-bold transition shadow active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]">
                    <i class="fas fa-paper-plane text-[10px]"></i> <span class="text-xs uppercase font-black tracking-wider">Odeslat moji odpověď</span>
                </button>
            </div>
        `;
    } else if (!isRevealed) {
        content += `
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between min-h-[85px]">
                    <span class="text-[9px] uppercase font-black text-[var(--text-muted)] block">Tvoje odpověď</span>
                    <p class="text-xs text-[var(--text-normal)] italic line-clamp-3 my-1 leading-snug">${myAnswer.answer_text}</p>
                    <span class="text-[8px] text-emerald-400 font-black uppercase self-end">Odesláno ✅</span>
                </div>
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center min-h-[85px]">
                    ${partnerAnswer ? `
                        <div class="flex flex-col items-center">
                            <i class="fas fa-lock text-amber-400 text-base mb-1"></i>
                            <p class="text-[10px] text-[var(--text-header)] font-bold leading-none">Dostupná!</p>
                            <p class="text-[8px] text-[var(--text-muted)] uppercase font-black mt-0.5">Čeká na odemčení</p>
                        </div>
                    ` : `
                        <i class="fas fa-clock text-[var(--text-muted)] text-base mb-1"></i>
                        <p class="text-[10px] text-[var(--text-muted)] font-bold uppercase">Partner ještě nepíše</p>
                    `}
                </div>
            </div>
        `;
    } else {
        const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
        const partnerName = isMeJose ? 'Klárka' : 'Jožka';

        content += `
            <div class="space-y-2.5">
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border-l-[3px] border-[var(--blurple)]">
                    <span class="text-[9px] font-black uppercase text-[var(--blurple)] block mb-1">Já</span>
                    <p class="text-xs text-[var(--text-normal)] leading-relaxed font-medium">${myAnswer.answer_text}</p>
                </div>
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border-l-[3px] border-[#eb459e]">
                    <span class="text-[9px] font-black uppercase text-[#eb459e] block mb-1">${partnerName}</span>
                    <p class="text-xs text-[var(--text-normal)] leading-relaxed font-medium">${partnerAnswer.answer_text}</p>
                </div>
                <div class="text-center pt-1">
                    <span class="text-[9px] bg-amber-400/15 text-amber-300 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                        <i class="fas fa-unlock-alt mr-1"></i> Společný kód odemčen
                    </span>
                </div>
            </div>
        `;
    }

    content += `</div>`;
    return content;
}

// --- HLAVNÍ RENDER METODA ---
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
        .filter(([date, entry]) => date >= todayStr)
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

            <!-- HLAVNÍ OBSAHOVÁ MŘÍŽKA: DISCORD TRACKING HUB -->
            <div class="max-w-4xl mx-auto px-4 mt-5 space-y-4">
                
                <!-- 1. ŘADA: SPÁNEK & VODA (2 Sloupce na větších zařízeních) -->
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

                    <!-- 2. ŘADA: NÁLADA & POHYB/LÉKY (2 Sloupce) -->
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
                                <div class="pt-1" id="pills-container">${generatePillsChip(data.pills, getPillsStreak())}</div>
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

                <!-- 4. VUT FIT & KOLEJE WIDGET -->
                ${state.settings.dashboardWidgets.schoolDorm !== false ? generateFitAndDormDashboardWidget() : ''}

                <!-- 5. VZTAHOVÉ LEVELY & LOVE COINS -->
                ${state.settings.dashboardWidgets.loveShop !== false ? generateLoveAndLevelsWidget() : ''}

                <!-- 6. DENNÍ OTÁZKA -->
                ${state.settings.dashboardWidgets.dailyQuestion !== false ? generateDailyQuestionCard() : ''}
            </div>
        </div>
    `;

    setupDashboardEvents();
    updateSunflowersDOM();
    initBedtimeReminder();
    attachWindowDashboardGlobals();
}

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
        triggerHaptic('heavy'); triggerConfetti();
        showNotification("Dostal/a jsi sluneční paprsek! ☀️", "success");
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

    stateEvents.on('settings_changed', () => {
        if (state.currentChannel === 'dashboard') renderDashboard();
    });

    dashboardListenersSet = true;
}

export async function sendSunlight() {
    triggerHaptic('light'); triggerConfetti();
    try { await supabase.from('sunlight_history').insert([{ from_user_id: state.currentUser?.id }]); } catch (e) { }
    await broadcastSunlight();
}

export function inspectPartnerSunflower(isPartner) {
    triggerHaptic('light');
    const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const name = isPartner ? (isMeJose ? 'Klárka' : 'Jožka') : (isMeJose ? 'Jožka' : 'Klárka');
    const data = isPartner ? state.partnerHealthData : getTodayData();

    if (!data) {
        showNotification(`🌻 ${name} dnes zatím nemá zapsaná data.`, "info");
        return;
    }

    const water = data.water ? `${data.water}/8 vody 💧` : null;
    const sleep = data.sleep ? `${data.sleep}h spánku 😴` : null;
    const mood = data.mood ? `nálada ${data.mood}/10 🌸` : null;
    const pills = data.pills ? 'léky vzaty 💊' : null;

    const summary = [water, sleep, mood, pills].filter(Boolean).join(' • ');
    showNotification(`🌻 ${name} dnes: ${summary || 'Zatím odpočívá ✨'}`, "info");
}

// --- SUBMIT DAILY ANSWER ---
export async function submitDailyAnswerFromDashboard() {
    const input = document.getElementById('dashboard-daily-answer-input');
    const answer = input?.value.trim();
    if (!answer || !state.dailyQuestion) return;

    const btn = document.getElementById('dashboard-btn-submit-answer');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Odesílám...';
    }

    try {
        const { safeUpsert } = await import('../core/offline.js');
        const result = await safeUpsert('daily_answers', [{
            question_id: state.dailyQuestion.id,
            user_id: state.currentUser?.id,
            answer_text: answer
        }], 'question_id,user_id');

        if (result.error) throw result.error;
        triggerHaptic('success');

        const { data } = await supabase.from('daily_answers').select('*').eq('question_id', state.dailyQuestion.id);
        if (data) state.dailyAnswers = data;

        saveStateToCache();
        await awardLoveCoinsToCurrentUser(3, 'odpověď na denní otázku');

        window.dispatchEvent(new CustomEvent('daily-questions-updated'));
    } catch (err) {
        console.error("[Dashboard] Answer Submit Error:", err);
        showNotification(`Nepodařilo se odeslat: ${err.message}`, "error");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane text-[10px]"></i> <span class="text-xs uppercase font-black">Zkusit znovu</span>';
        }
    }
}

// --- BEDTIME REMINDER ---
export function initBedtimeReminder() {
    if (state.currentUser?.name !== 'Klárka') return;
    if (bedtimeReminderInterval) clearInterval(bedtimeReminderInterval);

    const savedTime = localStorage.getItem('kiscord_bedtime_reminder_time') || '23:00';
    const [remindHour, remindMin] = savedTime.split(':').map(Number);

    const check = () => {
        if (state.currentSleepSession?.isSleeping) return;
        if (document.getElementById('bedtime-reminder-widget')) return;
        if (state.currentChannel !== 'dashboard') return;

        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        if (h > remindHour || (h === remindHour && m >= remindMin)) {
            showBedtimeReminderWidget();
        }
    };

    check();
    bedtimeReminderInterval = setInterval(check, 60000);
}

function showBedtimeReminderWidget() {
    if (document.getElementById('bedtime-reminder-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'bedtime-reminder-widget';
    widget.className = 'fixed bottom-6 right-4 z-[90] animate-slide-up';
    widget.innerHTML = `
        <div class="bg-[#1e1f22] border border-[#5865F2]/40 rounded-2xl p-4 shadow-2xl max-w-[220px] relative overflow-hidden group">
            <button onclick="document.getElementById('bedtime-reminder-widget')?.remove()" 
                    class="absolute top-2 right-2 text-[#72767d] hover:text-white text-[10px] transition z-10">
                <i class="fas fa-times"></i>
            </button>
            <div class="relative z-10">
                <div class="text-3xl mb-2 animate-pulse">🌙</div>
                <p class="text-white text-xs font-bold mb-3 leading-snug">Čas spát,<br>Klárko! 😴</p>
                <button onclick="window.loadModule('health').then(m => m.startSleep()); document.getElementById('bedtime-reminder-widget')?.remove();"
                        class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-2 px-3 rounded-xl text-[11px] font-black transition active:scale-95 shadow">
                    <i class="fas fa-moon mr-1"></i> Jít spát
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);
    setTimeout(() => widget.remove(), 120000);
}

export function handleEasterEggClick() {
    const now = Date.now();
    if (now - lastEasterEggClick > 1000) {
        easterEggClicks = 1;
    } else {
        easterEggClicks++;
    }
    lastEasterEggClick = now;

    if (easterEggClicks >= 5) {
        triggerEasterEgg();
        easterEggClicks = 0;
    }
}

function triggerEasterEgg() {
    triggerHaptic('heavy');
    let overlay = document.getElementById('easter-egg-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'easter-egg-overlay';
        overlay.onclick = () => overlay.classList.remove('show');
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div id="easter-egg-message">Miluji tě, Sluníčko moje! 💖</div>
        <div class="text-[10px] text-gray-500 mt-10 uppercase tracking-widest font-black">(Klikni pro návrat)</div>
    `;
    overlay.classList.add('show');
}

function getDaysTogether() {
    const start = new Date(state.startDate || '2024-04-28');
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function renderWelcome() {
    renderDashboard();
}

export async function syncDashboardData(forceRefresh = false) {
    const todayKey = getTodayKey();
    const indicator = document.getElementById("dashboard-sync-indicator");
    if (indicator) indicator.classList.remove("hidden");

    try {
        const { data, error } = await supabase.rpc('get_dashboard_data', { p_user_id: state.currentUser?.id, p_date: todayKey });
        if (error) throw error;

        state.dashboardFetched = true;
        const dashData = data || {};

        if (dashData.health) {
            state.healthData[todayKey] = { ...state.healthData[todayKey], ...dashData.health };
        }
        if (dashData.partner_health) {
            state.partnerHealthData = dashData.partner_health;
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
        console.warn("[Dashboard] Background Sync Error:", err);
    } finally {
        if (indicator) indicator.classList.add("hidden");
    }
}

// Global window attachments
function attachWindowDashboardGlobals() {
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
}
