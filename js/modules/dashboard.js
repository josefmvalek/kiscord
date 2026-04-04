import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, getInflectedName, getTodayKey, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { broadcastSunlight } from '../core/sync.js';
import { getTodayData } from '/js/modules/health.js';

// Re-export modularized components to maintain compatibility with global onclick handlers
export * from '/js/modules/dashboard/sunflowers.js';
export * from '/js/modules/dashboard/health_ui.js';
export * from '/js/modules/dashboard/chat.js';

import { updateSunflowersDOM, generateSunflowerSVG } from '/js/modules/dashboard/sunflowers.js';
import {
    generateMoodSlider,
    generateSleepSlider,
    generateWaterIcons,
    generateMovementChips,
    generateTetrisMiniTracker,
    updateWaterVisuals,
    updateMovementVisuals,
    updateMoodVisuals,
    updateSleep
} from '/js/modules/dashboard/health_ui.js';
import { handleWelcomeChat, refreshDashboardFact } from '/js/modules/dashboard/chat.js';

let dashboardListenersSet = false;
let dashboardTimer = null; // Ticker pro odpočet
let bedtimeReminderInterval = null;
let easterEggClicks = 0;
let lastEasterEggClick = 0;

// --- FACT OF THE DAY ---
function getDailyFactSeed() {
    // Deterministic seed from today's date string
    const dateStr = getTodayKey(); // YYYY-MM-DD
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function generateFactOfTheDay() {
    const daysTogether = getDaysTogether();

    // Anniversary 100 Days Special Fact - Priority 1 (Hardcoded, no DB dependency)
    if (daysTogether >= 100) {
        return `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border-2 border-[#faa61a] p-6 relative group overflow-hidden animate-glow-pulse">
                <div class="absolute inset-0 bg-[#faa61a]/5 animate-pulse"></div>
                <div class="flex justify-between items-start mb-4 relative z-10">
                    <h3 class="text-[10px] font-bold text-[#faa61a] uppercase tracking-widest flex items-center gap-2 leading-none">
                        <i class="fas fa-heart animate-bounce"></i> NÁŠ VELKÝ MILNÍK
                    </h3>
                </div>
                <div class="flex items-start gap-4 relative z-10">
                    <div class="text-4xl p-2 rounded-xl flex-shrink-0">💯</div>
                    <p class="text-white text-base font-bold leading-relaxed flex-1">
                        Věděla jsi, že za posledních 100 dní jsi mě udělala vážně, ale fakt hodně šťastným? Děkuju ti za to, moc 🤍.<br><br>
                        <span class="text-[10px] italic opacity-70 text-orange-200 block mt-2">Psst... zkus 5x rychle poklepat na naše společné dny v záhlaví...</span>
                    </p>
                </div>
            </div>
        `;
    }

    // Collect all facts from all categories
    const allFacts = [];
    const catMap = {
        raccoon: '🦝', owl: '🦉', octopus: '🐙', fun: '✨', penis: '🍌'
    };
    Object.entries(catMap).forEach(([catId, icon]) => {
        const facts = state.factsLibrary?.[catId] || [];
        facts.forEach(f => allFacts.push({ ...f, _catId: catId, _catIcon: icon }));
    });

    if (allFacts.length === 0) return '';

    const seed = getDailyFactSeed();
    const fact = allFacts[seed % allFacts.length];

    const isFav = state.factFavorites?.some(id => String(id) === String(fact.id));
    const heartClass = isFav ? 'text-[#eb459e]' : 'text-gray-500 hover:text-[#eb459e]';
    const heartIcon = isFav ? 'fas' : 'far';

    return `
        <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-5 relative group overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#5865F2] to-[#eb459e]"></div>
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 leading-none">
                    <i class="fas fa-lightbulb text-[#faa61a]"></i> Dnešní moudrost
                </h3>
                <div class="flex items-center gap-2">
                    <button onclick="import('/js/modules/funfacts.js').then(m => { window.switchChannel('funfacts'); })"
                            class="text-[10px] text-gray-500 hover:text-[#5865F2] transition font-bold uppercase tracking-widest flex items-center gap-1">
                        více <i class="fas fa-chevron-right text-[8px]"></i>
                    </button>
                    <button id="fotd-heart-btn"
                            onclick="import('/js/modules/funfacts.js').then(m => m.toggleFactFavorite('${fact.id}', '${fact._catId}', '${fact.subcategory || ''}', '${fact.subcategory_level2 || ''}')).then(() => import('/js/modules/dashboard.js').then(d => d.refreshFactOfTheDayHeart('${fact.id}')))"
                            class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-all hover:bg-white/10 active:scale-90">
                        <i class="${heartIcon} fa-heart ${heartClass} transition-colors"></i>
                    </button>
                </div>
            </div>
            <div class="flex items-start gap-4">
                <div class="text-3xl bg-[#202225] p-2.5 rounded-xl flex-shrink-0 border border-white/5">${fact.icon || fact._catIcon}</div>
                <p class="text-gray-200 text-sm font-medium leading-relaxed flex-1">${fact.text}</p>
            </div>
        </div>
    `;
}

export function refreshFactOfTheDayHeart(factId) {
    // Re-render just the heart button after toggle
    const btn = document.getElementById('fotd-heart-btn');
    if (!btn) return;
    const isFav = state.factFavorites?.some(id => String(id) === String(factId));
    btn.querySelector('i').className = `${isFav ? 'fas' : 'far'} fa-heart ${isFav ? 'text-[#eb459e]' : 'text-gray-500 hover:text-[#eb459e]'
        } transition-colors`;
}

// --- BEDTIME REMINDER ---
export function initBedtimeReminder() {
    // Only for Klárka
    if (state.currentUser?.name !== 'Klárka') return;

    if (bedtimeReminderInterval) clearInterval(bedtimeReminderInterval);

    const savedTime = localStorage.getItem('kiscord_bedtime_reminder_time') || '23:00';
    const [remindHour, remindMin] = savedTime.split(':').map(Number);

    const check = () => {
        // Don't show if already sleeping or widget already visible
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

    check(); // Immediate check on render
    bedtimeReminderInterval = setInterval(check, 60000);
}

function showBedtimeReminderWidget() {
    // Don't create duplicates
    if (document.getElementById('bedtime-reminder-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'bedtime-reminder-widget';
    widget.className = 'fixed bottom-6 right-4 z-[90] animate-slide-up';
    widget.innerHTML = `
        <div class="bg-[#1e1f22] border border-[#5865F2]/40 rounded-2xl p-4 shadow-2xl max-w-[220px] relative overflow-hidden group">
            <div class="absolute inset-0 bg-[#5865F2]/5 group-hover:bg-[#5865F2]/10 transition-colors"></div>
            <button onclick="document.getElementById('bedtime-reminder-widget')?.remove()" 
                    class="absolute top-2 right-2 text-gray-600 hover:text-white text-[10px] transition z-10">
                <i class="fas fa-times"></i>
            </button>
            <div class="relative z-10">
                <div class="text-3xl mb-2 animate-pulse">🌙</div>
                <p class="text-white text-xs font-bold mb-3 leading-snug">Čas spát,<br>Klárko! 😴</p>
                <button onclick="import('/js/modules/health.js').then(m => m.startSleep()); document.getElementById('bedtime-reminder-widget')?.remove();"
                        class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-2 px-3 rounded-xl text-[11px] font-black transition active:scale-95 shadow-lg">
                    <i class="fas fa-moon mr-1"></i> Jít spát
                </button>
                <button onclick="document.getElementById('bedtime-reminder-widget')?.remove()"
                        class="w-full mt-2 text-gray-500 hover:text-gray-300 text-[10px] font-bold transition py-1">
                    Ještě chvíli
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);
    // Auto-dismiss after 2 minutes
    setTimeout(() => widget.remove(), 120000);
}

// Helpers
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

    // The final centerpiece ASCII art - Perfectly balanced for browser rendering
    const ascii = [
        "                                 .----. .----.",
        "                                /      V      \\",
        "                               |              |",
        "                                \\ mám tě rád /",
        "                                 \\          /",
        "                                  `.      ,'",
        "                                    `.,/'",
        "        .o.                                                           .o.",
        "        o.*.                                                         .*.o",
        "       .0000                       _         _                       0000.",
        "        0..00.         __   ___.--'_`.     .'_`--.___   __          .00..0",
        "       o.**.o.        ( _`.'. -   'o` )   ( 'o`   - .`.'_ )         .o.**.o",
        "    .o.(o **).o      _\\.'_'      _.-'     `-._      `_`./_       .o.(** o).o",
        "      *.o||o.*       ( \\`. )    //\\`        '/\\\\    ( .'/ )       *.o||o.*",
        "       vv||vv         \\_`-'`---'\\\\__,      ,__//`---'`-'_/         vv||vv",
        "   [\\   ||  /]        \\`        `-\\         /-'        '/       [\\   ||  /]",
        "    \\\\  || //          `                               '         \\\\  || //",
        "    ( \\ || //                                                    ( \\ || //",
        "     \\\\ ||//                                                      \\\\ ||//",
        "      \\_|_|/                                                       \\_|_|/",
        "       \\\\|/                                                         \\\\|/",
        "        \\/                                                           \\/"
    ].join('\n');

    overlay.innerHTML = `
        <div id="easter-egg-ascii">${ascii}</div>
        <div id="easter-egg-message">Krásných 100 dní, Sluníčko moje! 💖</div>
        <div class="text-[10px] text-gray-500 mt-10 animate-pulse uppercase tracking-widest font-black">(Klikni pro návrat)</div>
    `;

    overlay.classList.add('show');
}

function getDaysTogether() {
    const start = new Date(state.startDate);
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function renderWelcome() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center bg-[#36393f] p-6 text-center animate-fade-in relative overflow-hidden">
            <div class="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#5865F2]/10 blur-3xl rounded-full"></div>
            
            <div class="relative z-10 space-y-6 max-w-lg">
                <div class="text-8xl mb-6 animate-bounce-short filter drop-shadow-xl">🦝</div>
                <h1 class="text-4xl font-black text-white uppercase tracking-tighter leading-tight">
                    Vítej v našem světě,<br>
                    <span class="text-[#eb459e]">${getInflectedName(state.currentUser.name, 5)}</span>!
                </h1>
                <p class="text-gray-400 text-lg leading-relaxed px-4">
                    Kiscord je připraven na naše další dobrodružství. <br>
                    Vyber si kanál vlevo a začneme! ✨
                </p>
                <div class="grid grid-cols-2 gap-4 mt-8 px-4">
                    <button onclick="switchChannel('dashboard')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white p-5 rounded-2xl font-bold transition flex flex-col items-center gap-2 shadow-lg group transform hover:-translate-y-1">
                        <span class="text-3xl group-hover:scale-125 transition duration-300">❤️</span>
                        <span class="text-sm uppercase tracking-widest">Můj Den</span>
                    </button>
                    <button onclick="switchChannel('calendar')" class="bg-[#2f3136] hover:bg-[#202225] text-white p-5 rounded-2xl font-bold transition border border-white/5 flex flex-col items-center gap-2 shadow-lg group transform hover:-translate-y-1">
                        <span class="text-3xl group-hover:scale-125 transition duration-300">📅</span>
                        <span class="text-sm uppercase tracking-widest">Kalendář</span>
                    </button>
                </div>
            </div>
            
            <!-- Mobile Navigation Hint (Only on mobile) -->
            <div class="md:hidden absolute bottom-10 left-0 w-full animate-bounce-short opacity-50">
                <p class="text-[10px] text-gray-500 uppercase font-black">Přejeď zleva pro menu <i class="fas fa-arrow-right ml-1"></i></p>
            </div>
        </div>
    `;
}

export async function renderDashboard(forceRefresh = false) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const todayKey = getTodayKey();
    if (!state.healthData) state.healthData = {};
    if (!state.healthData[todayKey]) {
        state.healthData[todayKey] = { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    }

    // --- DATA FETCHING & ERROR HANDLING ---
    if (navigator.onLine && (!state.dashboardFetched || forceRefresh)) {
        try {
            const today = getTodayKey();
            const queries = [];

            // Partner health query (only if logged in)
            if (state.currentUser?.id) {
                queries.push(
                    supabase.from('health_data')
                        .select('*')
                        .eq('date_key', todayKey)
                        .neq('user_id', state.currentUser.id)
                        .maybeSingle()
                );
            } else {
                queries.push(Promise.resolve({ data: null, error: null }));
            }

            // Dashboard aggregate query
            queries.push(
                supabase.rpc('get_dashboard_data', {
                    p_user_id: state.currentUser?.id,
                    p_date: today
                })
            );

            const [partnerRes, dashRes] = await Promise.all(queries);

            if (dashRes.error) throw dashRes.error;

            state.dashboardFetched = true;
            const data = dashRes.data || {};
            const partnerHealth = partnerRes.data;

            if (data) {
                state.healthData[todayKey] = data.health || state.healthData[todayKey];

                // Tetris scores are now handled globally in state.js via initializeState/Supabase
                // Do not overwrite them with potentially outdated/zeroed RPC data here

                if (partnerHealth) state.partnerHealthData = partnerHealth;

                // Auto-save to cache after fetch
                import('/js/core/state.js').then(m => {
                    if (typeof m.saveStateToCache === 'function') m.saveStateToCache();
                });

                if (state.currentChannel === 'dashboard' && document.getElementById("messages-container")) {
                    return renderDashboard();
                }
            }
        } catch (err) {
            console.error("[Dashboard] Load Error:", err);
            // If we have cached data, don't show error state, just log it
            if (!state.healthData[todayKey]) {
                container.innerHTML = window.renderErrorState({
                    message: "Nepodařilo se mi vzbudit mývala v databázi. Zkontroluj prosím připojení.",
                    onRetry: "import('./js/modules/dashboard.js').then(m => m.renderDashboard(true))"
                });
                return;
            }
        }
    }

    // Anniversary Check: 3 months (exactly today 2026-03-24)
    const start = new Date(state.startDate);
    const now = new Date();
    const target = new Date(start);
    target.setMonth(target.getMonth() + 3);
    if (now.getFullYear() === target.getFullYear() &&
        now.getMonth() === target.getMonth() &&
        now.getDate() === target.getDate()) {
        import('./achievements.js').then(m => m.autoUnlock('quarter_year_anniversary'));
    }

    const data = getTodayData();

    const niceDate = new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
    const hour = new Date().getHours();
    let greeting = hour >= 18 ? "Krásný večer" : (hour >= 11 ? "Ahoj" : "Dobré ráno");
    const daysTogether = getDaysTogether();

    // Anniversary 100 Days Greeting
    if (daysTogether >= 100) {
        greeting = "Nádherných 100 dní už jsme spolu";

        // Auto-unlock 100 Days Achievement and trigger confetti
        import('./achievements.js').then(m => m.autoUnlock('anniversary_100'));
        triggerConfetti();
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const upcomingDates = Object.entries(state.plannedDates || {})
        .filter(([date, entry]) => {
            // Include today if it hasn't passed yet, and all future dates
            if (date > todayStr) return true;
            if (date === todayStr) {
                if (!entry.time) return true; // Full day event
                const entryTime = entry.time.split(':');
                const now = new Date();
                const eventTime = new Date();
                eventTime.setHours(parseInt(entryTime[0]), parseInt(entryTime[1]), 0);
                return eventTime > now;
            }
            return false;
        })
        .sort((a, b) => {
            if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
            return (a[1].time || "00:00").localeCompare(b[1].time || "00:00");
        });
    const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

    // Start ticker if on dashboard and event exists
    startDashboardTimer(nextDate);

    container.innerHTML = `
          <div class="flex-1 overflow-y-auto no-scrollbar bg-[#36393f] relative w-full h-full pb-20">
              <div class="relative bg-gradient-to-br from-[#5865F2] to-[#eb459e] shadow-lg overflow-hidden flex-shrink-0 pt-3 pb-0 rounded-b-3xl">
                  <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                  <div class="relative z-10 px-6 mb-0 flex justify-between items-end min-h-[140px]">
                      <div id="dashboard-welcome-text" class="pb-2">
                           <p class="text-[10px] font-bold uppercase tracking-wider opacity-80 text-white/90 mb-0.5">${niceDate}</p>
                           <h1 class="text-2xl font-black text-white drop-shadow-md leading-tight">${greeting}${daysTogether >= 100 ? ' 🥳' : `, <br>${getInflectedName(state.currentUser.name, 5)} 🌞`}</h1>
                          <div class="flex items-center gap-2 mt-3">
                              <div class="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-center shadow-sm border border-white/10 inline-block min-w-[60px] cursor-help transition-all active:scale-95 select-none" 
                                   style="user-select: none; -webkit-user-select: none;"
                                   onclick="import('./js/modules/dashboard.js').then(m => m.handleEasterEggClick())">
                                  <span class="block text-[8px] uppercase font-bold tracking-widest opacity-90 text-white leading-none mb-0.5">Spolu</span>
                                  <span class="block text-sm font-black text-white leading-none">${daysTogether} dní</span>
                              </div>
                              <button onclick="import('./js/modules/dashboard.js').then(m => m.sendSunlight())" 
                                      class="sun-send-btn w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center text-xl shadow-lg transition-all duration-300 hover:scale-110 active:scale-90 hover:bg-yellow-400/30 group">
                                  <span>☀️</span>
                              </button>
                          </div>
                      </div>
                      
                      <div class="flex gap-2 items-end pb-0">
                          <div id="sunflower-me-container" class="flex flex-col items-center w-24 mb-[-4px] transform translate-y-[2px] relative group">
                              ${generateSunflowerSVG(data, false)}
                              <span class="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow-md z-30 pointer-events-none group-hover:text-white transition-colors">${state.currentUser.name}</span>
                          </div>
                          <div id="sunflower-partner-container" class="flex flex-col items-center w-24 mb-[-4px] transform translate-y-[2px] relative group">
                              ${generateSunflowerSVG(state.partnerHealthData || null, true)}
                              <span class="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow-md z-30 pointer-events-none group-hover:text-white transition-colors">${state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka'}</span>
                          </div>
                      </div>
                  </div>
                  <div class="bg-black/20 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-black/30 transition min-h-[56px]"
                       onclick="${nextDate ? `import('./js/modules/dashboard.js').then(m => m.handleNextDateClick('${nextDate[0]}'))` : `window.switchChannel('dateplanner')`}">
                      ${nextDate ? `
                            <div class="flex items-center gap-3 overflow-hidden">
                                <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                                    ${getCategoryIcon(nextDate[1].cat)}
                                </div>
                                 <div class="min-w-0 flex-1">
                                    <div class="text-[9px] font-bold text-white/70 uppercase tracking-wide flex items-center justify-between gap-1 w-full">
                                        <span class="flex items-center gap-1">Čeká nás <span class="w-1.5 h-1.5 bg-[#3ba55c] rounded-full animate-pulse" id="countdown-dot"></span></span>
                                        <span id="countdown-timer" class="font-mono text-[9px] tabular-nums text-white/90 bg-black/20 px-1.5 py-0.5 rounded ml-auto">--:--:--</span>
                                    </div>
                                    <div class="font-bold text-white text-sm truncate uppercase tracking-tight">${nextDate[1].name}${nextDate[1].time ? ` <span class="opacity-40 font-black text-[10px] ml-1 uppercase tracking-[1px]">v ${nextDate[1].time}</span>` : ''}</div>
                                 </div>
                            </div>
                            <div class="flex items-center gap-4">
                                <i class="fas fa-chevron-right text-white/30 text-[10px]"></i>
                            </div>
                        ` : `
                            <div class="flex items-center gap-3 w-full justify-between">
                                 <div class="flex items-center gap-3">
                                     <div class="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-sm">❓</div>
                                     <div class="text-white/90 text-sm font-medium">Zatím nic v plánu... <span class="font-bold underline">Plánovat?</span></div>
                                 </div>
                                 <i class="fas fa-chevron-right text-white/30 text-[10px]"></i>
                            </div>
                        `}
                  </div>
              </div>

              <div class="max-w-3xl mx-auto px-3 mt-4 relative z-20 space-y-3">
                  <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6">
                      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 leading-none">
                        <i class="fas fa-bed text-[#faa61a]"></i> Jak ses vyspala?
                      </h3>
                      <div id="sleep-container">${generateSleepSlider(data)}</div>
                  </div>

                  <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6">
                      <div class="flex justify-between items-center mb-4">
                          <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 leading-none">
                            <i class="fas fa-tint text-[#00e5ff]"></i> Voda
                          </h3>
                          <span class="text-[10px] text-[#00e5ff] font-black bg-[#00e5ff]/10 px-2 py-0.5 rounded-full" id="water-count">${data.water || 0}/8</span>
                      </div>
                      <div class="flex justify-between gap-1" id="water-container">${generateWaterIcons(data.water || 0)}</div>
                  </div>

                  <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6 min-h-[140px]">
                      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 leading-none">Jak se cítíš?</h3>
                      <div id="mood-container">${generateMoodSlider(data.mood)}</div>
                  </div>

                  <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6">
                      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 leading-none">
                        <i class="fas fa-running text-[#3ba55c]"></i> Dnešní pohyb
                      </h3>
                      <div class="flex flex-wrap gap-3" id="movement-container">${generateMovementChips(data.movement)}</div>
                  </div>

                  ${generateFactOfTheDay()}
                  <div id="tetris-tracker-container">${generateTetrisMiniTracker()}</div>
              </div>
          </div>
    `;

    setupDashboardEvents();
    updateSunflowersDOM();
    initBedtimeReminder();
}

export function setupDashboardEvents() {
    if (dashboardListenersSet) return;

    window.addEventListener('health-updated', () => {
        if (state.currentChannel === 'dashboard') {
            const data = getTodayData();
            updateSunflowersDOM();
            updateWaterVisuals();
            updateMovementVisuals();
            updateMoodVisuals(data.mood);
            updateSleep(data.sleep);
        }
    });

    window.addEventListener('sunlight-received', () => {
        triggerHaptic('heavy');
        triggerConfetti(); // Přidáno: prémiová aura s emoji!
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 bg-[#ffd700] mix-blend-overlay opacity-60 z-[9999] pointer-events-none transition-opacity duration-1000";
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.style.opacity = '0'; }, 300);
        setTimeout(() => { overlay.remove(); }, 1500);
        showNotification("Dostal/a jsi sluneční paprsek! ☀️", "success");
    });

    window.addEventListener('planned-dates-updated', () => {
        if (state.currentChannel === 'dashboard') {
            console.log("[Dashboard] Planned dates updated, refreshing...");
            renderDashboard();
        }
    });

    dashboardListenersSet = true;
}

// --- COUNTDOWN TIMER LOGIC ---

function getCategoryIcon(cat) {
    const icons = {
        food: '🍔',
        walk: '🌲',
        view: '⛰️',
        fun: '⚡',
        movie: '🎬',
        discord: '🎧',
        game: '🎮',
        date: '🥂'
    };
    return icons[cat] || '📅';
}

function startDashboardTimer(nextDate) {
    if (dashboardTimer) clearInterval(dashboardTimer);
    if (!nextDate) return;

    const [dateKey, entry] = nextDate;
    const timeStr = entry.time || "00:00";
    const [hrs, mins] = timeStr.split(':').map(Number);
    const targetDate = new Date(dateKey);
    targetDate.setHours(hrs, mins, 0, 0);

    const updateTimer = () => {
        const timerEl = document.getElementById('countdown-timer');
        const dotEl = document.getElementById('countdown-dot');
        if (!timerEl) {
            clearInterval(dashboardTimer);
            return;
        }

        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            timerEl.innerText = "PRÁVĚ TEĎ! ❤️";
            timerEl.classList.add('text-[#eb459e]', 'animate-pulse');
            if (dotEl) dotEl.classList.replace('bg-[#3ba55c]', 'bg-[#eb459e]');
            clearInterval(dashboardTimer);
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Formatting
        const hStr = hours.toString().padStart(2, '0');
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');

        timerEl.innerText = `${hStr}:${mStr}:${sStr}`;

        // Visual Urgency (under 1 hour)
        if (hours === 0) {
            timerEl.classList.add('text-[#f43f5e]'); // Rose-500
            if (minutes < 15) timerEl.classList.add('animate-pulse');
            if (dotEl) dotEl.classList.replace('bg-[#3ba55c]', 'bg-[#f43f5e]');
        }
    };

    updateTimer(); // Initial call
    dashboardTimer = setInterval(updateTimer, 1000);
}

export async function sendSunlight() {
    triggerHaptic('light');
    triggerConfetti(); // Přidáno: prémiová aura i pro odesílatele!
    const btn = document.querySelector('.sun-send-btn');
    if (btn) {
        btn.classList.add('animate-ping');
        setTimeout(() => btn.classList.remove('animate-ping'), 1000);
    }

    // Log to DB for Quests
    try {
        await supabase.from('sunlight_history').insert([{ from_user_id: state.currentUser.id }]);
    } catch (e) {
        console.warn("Sunlight logging failed:", e);
    }

    await broadcastSunlight();
}

export async function handleNextDateClick(dateKey) {
    triggerHaptic('light');
    // 1. Switch channel to calendar
    window.switchChannel('calendar');

    // 2. We need to wait for the module to be ready if it's the first time
    // But switchChannel handles module loading. We can just call it once loaded.
    const { showDayDetail } = await import('./calendar.js');

    // Small timeout to ensure DOM is ready and switchChannel animation started
    setTimeout(() => {
        showDayDetail(dateKey);
    }, 50);
}
