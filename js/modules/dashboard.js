import { supabase } from '../core/supabase.js';
import { state, saveStateToCache, stateEvents } from '../core/state.js';
import { triggerHaptic, getInflectedName, getTodayKey, triggerConfetti } from '../core/utils.js';
import { getAssetUrl } from '../core/assets.js';
import { showNotification } from '../core/theme.js';
import { broadcastSunlight, broadcastPlanUpdate } from '../core/sync.js';
import { getTodayData, getPillsStreak } from './health.js';

// Re-export modularized components to maintain compatibility with global onclick handlers
export * from './dashboard/sunflowers.js';
export * from './dashboard/health_ui.js';
export * from './dashboard/chat.js';

import { updateSunflowersDOM, generateSunflowerSVG } from './dashboard/sunflowers.js';
import {
    generateMoodSlider,
    generateSleepSlider,
    generateWaterIcons,
    generateMovementChips,
    generatePillsChip,
    generateSupplementsChips,
    generateTetrisMiniTracker,
    updateWaterVisuals,
    updateMovementVisuals,
    updatePillsVisuals,
    updateSupplementsVisuals,
    updateMoodVisuals,
    updateSleep
} from './dashboard/health_ui.js';
import { handleWelcomeChat, refreshDashboardFact } from './dashboard/chat.js';

let dashboardListenersSet = false;
let dashboardTimer = null; // Ticker pro odpočet
let bedtimeReminderInterval = null;
let easterEggClicks = 0;
let lastEasterEggClick = 0;

// --- NIGHT SKY PARTICLES ---
function generateStaticStars(count = 50) {
    let particles = "";
    for (let i = 0; i < count; i++) {
        const size = Math.random() * 2 + 0.5;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 5;
        
        // Stars are mostly white or very pale blue/yellow
        const colors = ['#ffffff', '#f8fafc', '#fff7ed', '#e0f2fe'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particles += `<div class="particle-star" style="
            width: ${size}px; 
            height: ${size}px; 
            left: ${left}%; 
            top: ${top}%; 
            --duration: ${duration}s; 
            --delay: ${delay}s; 
            background: ${color};
        "></div>`;
    }
    return particles;
}

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
                    <button onclick="window.loadModule('funfacts').then(m => { window.switchChannel('funfacts'); })"
                            class="text-[10px] text-gray-500 hover:text-[#5865F2] transition font-bold uppercase tracking-widest flex items-center gap-1">
                        více <i class="fas fa-chevron-right text-[8px]"></i>
                    </button>
                    <button id="fotd-heart-btn"
                            onclick="window.loadModule('funfacts').then(m => m.toggleFactFavorite('${fact.id}', '${fact._catId}', '${fact.subcategory || ''}', '${fact.subcategory_level2 || ''}')).then(() => window.loadModule('dashboard').then(d => d.refreshFactOfTheDayHeart('${fact.id}')))"
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

// --- DAILY QUESTION COMPACT ---
function generateDailyQuestionCard() {
    if (!state.dailyQuestion) return '';

    const myAnswer = state.dailyAnswers.find(a => a.user_id === state.currentUser.id);
    const partnerAnswer = state.dailyAnswers.find(a => a.user_id !== state.currentUser.id);
    const isRevealed = !!(myAnswer && partnerAnswer);

    // Header & Container
    let content = `
        <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6 relative group overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-[#faa61a]/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
            
            <div class="flex justify-between items-start mb-5 relative z-10">
                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 leading-none">
                    <i class="fas fa-comment-dots text-[#faa61a]"></i> Dnešní otázka
                </h3>
                <button onclick="window.switchChannel('daily-questions')" 
                        class="text-[10px] text-gray-500 hover:text-[#faa61a] transition font-bold uppercase tracking-widest flex items-center gap-1">
                    archiv <i class="fas fa-chevron-right text-[8px]"></i>
                </button>
            </div>

            <div class="mb-6 relative z-10">
                <h2 class="text-lg font-bold text-white leading-tight mb-2">"${state.dailyQuestion.text}"</h2>
            </div>
    `;

    if (!myAnswer) {
        // --- INPUT STATE ---
        content += `
            <div class="space-y-4 relative z-10">
                <div class="bg-black/20 rounded-xl p-4 border border-white/5 focus-within:border-[#faa61a]/50 transition-all group/input shadow-inner">
                    <textarea id="dashboard-daily-answer-input" 
                              placeholder="Tvoje upřímná odpověď..." 
                              class="w-full bg-transparent text-gray-200 text-sm outline-none resize-none min-h-[80px] placeholder-gray-600 font-medium leading-relaxed custom-scrollbar"></textarea>
                </div>
                <button id="dashboard-btn-submit-answer"
                        onclick="window.loadModule('dashboard').then(m => m.submitDailyAnswerFromDashboard())" 
                        class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-xl font-bold transition shadow-lg active:scale-95 flex items-center justify-center gap-2 group/btn relative overflow-hidden">
                    <div class="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition"></div>
                    <i class="fas fa-paper-plane text-[10px]"></i> <span class="text-xs uppercase font-black">Odeslat moji odpověď</span>
                </button>
            </div>
        `;
    } else if (!isRevealed) {
        // --- WAITING STATE ---
        content += `
            <div class="grid grid-cols-2 gap-4 relative z-10">
                <div class="space-y-2">
                    <span class="text-[9px] uppercase font-black tracking-tighter text-gray-500 ml-1">Moje odpověď</span>
                    <div class="bg-black/20 p-4 rounded-xl border border-[#3ba55c]/20 min-h-[100px] flex flex-col justify-between">
                        <p class="text-[11px] text-gray-300 italic leading-snug italic line-clamp-3">${myAnswer.answer_text}</p>
                        <span class="text-[8px] text-[#3ba55c] font-black uppercase mt-2 self-end">Odesláno ✅</span>
                    </div>
                </div>
                <div class="space-y-2">
                    <span class="text-[9px] uppercase font-black tracking-tighter text-gray-500 ml-1">${state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka'}</span>
                    <div class="bg-[#2f3136]/50 p-4 rounded-xl border border-dashed border-gray-700 min-h-[100px] flex flex-col items-center justify-center text-center backdrop-blur-sm">
                        ${partnerAnswer ? `
                            <div class="animate-pulse flex flex-col items-center">
                                <i class="fas fa-lock text-[#faa61a] text-xl mb-2"></i>
                                <p class="text-[10px] text-white font-bold leading-none mb-1">Dostupná!</p>
                                <p class="text-[8px] text-gray-500 uppercase font-black">Čeká na odemčení</p>
                            </div>
                        ` : `
                            <i class="fas fa-clock text-gray-700 text-xl mb-2 opacity-50"></i>
                            <p class="text-[10px] text-gray-600 font-bold uppercase tracking-tight">Zatím nic...</p>
                        `}
                    </div>
                </div>
            </div>
        `;
    } else {
        // --- REVEALED STATE (Vertical List) ---
        const partnerName = state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka';
        
        content += `
            <div class="space-y-3 relative z-10">
                <div class="bg-black/20 p-4 rounded-xl border-l-[3px] border-[#5865F2] relative group/answer animate-fade-in-right">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[9px] font-black uppercase text-[#5865F2] tracking-widest">Já</span>
                    </div>
                    <p class="text-[11px] text-gray-200 leading-relaxed font-medium">${myAnswer.answer_text}</p>
                </div>
                
                <div class="bg-black/20 p-4 rounded-xl border-l-[3px] border-[#eb459e] relative group/answer animate-fade-in-right delay-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[9px] font-black uppercase text-[#eb459e] tracking-widest">${partnerName}</span>
                    </div>
                    <p class="text-[11px] text-gray-200 leading-relaxed font-medium">${partnerAnswer.answer_text}</p>
                </div>
                
                <div class="pt-3 flex justify-center">
                    <div class="text-[8px] bg-[#faa61a]/10 text-[#faa61a] px-3 py-1 rounded-full font-black uppercase tracking-widest">
                        <i class="fas fa-unlock-alt mr-1"></i> Společný kód odemčen
                    </div>
                </div>
            </div>
        `;
    }

    content += `</div>`;
    return content;
}

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
            user_id: state.currentUser.id,
            answer_text: answer
        }], 'question_id,user_id');

        if (result.error) throw result.error;
        if (result.offline) {
             showNotification("Odpověď uložena lokálně (jsi offline) 💾", "info");
             return;
        }

        triggerHaptic('success');
        
        // Refresh local answers directly for speed
        const { data } = await supabase.from('daily_answers').select('*').eq('question_id', state.dailyQuestion.id);
        if (data) state.dailyAnswers = data;
        
        saveStateToCache();
        
        window.dispatchEvent(new CustomEvent('daily-questions-updated'));

    } catch (err) {
        console.error("[Dashboard] Answer Submit Error:", err);
        const errorMsg = err.message || "Chyba při odesílání.";
        if (window.showNotification) window.showNotification(`Nepodařilo se odeslat: ${errorMsg}`, "error");
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
            <div class="absolute inset-0 bg-[#5865F2]/5 group-hover:bg-[#5865F2]/10 transition-colors"></div>
            <button onclick="document.getElementById('bedtime-reminder-widget')?.remove()" 
                    class="absolute top-2 right-2 text-gray-600 hover:text-white text-[10px] transition z-10">
                <i class="fas fa-times"></i>
            </button>
            <div class="relative z-10">
                <div class="text-3xl mb-2 animate-pulse">🌙</div>
                <p class="text-white text-xs font-bold mb-3 leading-snug">Čas spát,<br>Klárko! 😴</p>
                <button onclick="window.loadModule('health').then(m => m.startSleep()); document.getElementById('bedtime-reminder-widget')?.remove();"
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
        state.healthData[todayKey] = { water: 0, sleep: 0, mood: 5, movement: [], pills: false, bedtime: null, supplements: { iron: false, zinc: false, magnesium: false } };
    }

    import('../core/state.js').then(m => {
        if (typeof m.ensureDailyQuizData === 'function') m.ensureDailyQuizData();
        if (typeof m.ensureFactsData === 'function') m.ensureFactsData();
        if (typeof m.ensureAllHealthData === 'function') {
            m.ensureAllHealthData();
        }
    });

    // 2. TRIGGER SYNC (Async, Non-blocking)
    if (navigator.onLine && (!state.dashboardFetched || forceRefresh)) {
        syncDashboardData(forceRefresh);
    }

    // 3. RENDER UI IMMEDIATELY (Optimistic)
    const data = getTodayData();
    const niceDate = new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
    const hour = new Date().getHours();
    let greeting = hour >= 18 ? "Krásný večer" : (hour >= 11 ? "Ahoj" : "Dobré ráno");
    const daysTogether = getDaysTogether();

    const todayStr = new Date().toISOString().split("T")[0];
    const upcomingDates = Object.entries(state.plannedDates || {})
        .filter(([date, entry]) => date >= todayStr)
        .sort((a, b) => a[0].localeCompare(b[0]));
    const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

    startDashboardTimer(nextDate);

    container.innerHTML = `
          <div class="flex-1 overflow-y-auto no-scrollbar bg-[#36393f] relative w-full h-full pb-20">
              <div class="relative shadow-lg overflow-hidden flex-shrink-0 pt-3 pb-0 rounded-b-3xl dashboard-header-mask" 
                   style="background: linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 100%);">
                  <div class="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                  
                  <!-- Nebula Effect -->
                  <div class="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none"></div>
                  <div class="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-blue-900/20 blur-[100px] rounded-full pointer-events-none"></div>

                  <!-- Stars -->
                  <div class="absolute inset-0 overflow-hidden pointer-events-none">
                      ${generateStaticStars(60)}
                  </div>

                  <!-- Subtle Moon -->
                  <div class="absolute top-6 right-10 w-12 h-12 pointer-events-none opacity-80">
                      <div class="absolute inset-0 bg-yellow-100/10 blur-xl rounded-full animate-pulse"></div>
                      <div class="relative text-2xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">🌙</div>
                  </div>

                  <div class="relative z-10 px-6 mb-0 flex justify-between items-end min-h-[140px] pb-8">
                      <div class="pb-2">
                           <p class="text-[10px] font-bold uppercase tracking-wider text-white/90 mb-0.5">${niceDate}</p>
                           <h1 class="text-2xl font-black text-white leading-tight flex items-center gap-3">
                               <span>${greeting}, <br>${getInflectedName(state.currentUser.name, 5)} 🌞</span>
                               <div id="dashboard-sync-indicator" class="hidden opacity-40 pb-1">
                                   <i class="fas fa-sync-alt fa-spin text-[10px]"></i>
                               </div>
                           </h1>
                          <div class="flex items-center gap-2 mt-3">
                              <div class="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-center border border-white/10" onclick="window.loadModule('dashboard').then(m => m.handleEasterEggClick())">
                                  <span class="block text-[8px] uppercase font-bold text-white leading-none mb-0.5">Spolu</span>
                                  <span class="block text-sm font-black text-white leading-none">${daysTogether} dní</span>
                              </div>
                              <button onclick="window.loadModule('dashboard').then(m => m.sendSunlight())" 
                                      class="sun-send-btn w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center text-xl shadow-lg transition-all transform active:scale-90">
                                  <span>☀️</span>
                              </button>
                          </div>
                      </div>
                      
                      <div class="flex gap-2 items-end pb-0">
                          <div id="sunflower-me-container" class="flex flex-col items-center w-24 relative group">
                              ${generateSunflowerSVG(data, false)}
                              <span class="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-white/90 uppercase tracking-widest">${state.currentUser.name}</span>
                          </div>
                          <div id="sunflower-partner-container" class="flex flex-col items-center w-24 relative group">
                              ${generateSunflowerSVG(state.partnerHealthData || null, true)}
                              <span class="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-white/90 uppercase tracking-widest">${state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka'}</span>
                          </div>
                      </div>
                  </div>
                  <div id="dashboard-planning-area" class="bg-black/20 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between cursor-pointer">
                      ${(() => {
                          const todayStr = new Date().toISOString().split("T")[0];
                          const upcoming = Object.entries(state.plannedDates || {})
                              .filter(([date, entry]) => date >= todayStr)
                              .sort((a, b) => {
                                  // Priority: pending invitations from partner first
                                  const aPending = a[1].status === 'pending' && a[1].proposed_by !== state.currentUser.id;
                                  const bPending = b[1].status === 'pending' && b[1].proposed_by !== state.currentUser.id;
                                  if (aPending && !bPending) return -1;
                                  if (!aPending && bPending) return 1;
                                  return a[0].localeCompare(b[0]);
                              });
                          
                          const plan = upcoming.length > 0 ? upcoming[0] : null;
                          if (!plan) {
                              return `<div class="text-white/90 text-sm font-medium w-full" onclick="window.loadModule('dashboard').then(m => m.showQuickPlanModal())">Nic v plánu... <span class="font-bold underline text-[#eb459e]">Plánovat?</span></div>`;
                          }

                          const [dateKey, entry] = plan;
                          const isPendingFromPartner = entry.status === 'pending' && entry.proposed_by !== state.currentUser.id;
                          const isPendingFromMe = entry.status === 'pending' && entry.proposed_by === state.currentUser.id;
                          const isRejected = entry.status === 'rejected';

                          if (isPendingFromPartner) {
                              const dateLabel = dateKey === todayStr ? 'Dnes' : (dateKey === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'Zítra' : dateKey);
                              return `
                                <div class="flex items-center justify-between w-full">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-[#eb459e] w-8 h-8 rounded-full flex items-center justify-center animate-bounce-short shadow-[0_0_15px_rgba(235,69,158,0.5)]">${getCategoryIcon(entry.cat)}</div>
                                        <div>
                                            <div class="text-[9px] font-bold text-[#eb459e] uppercase animate-pulse">Pozvánka: ${dateLabel}${entry.time ? ` v ${entry.time}` : ''}!</div>
                                            <div class="font-bold text-white text-sm uppercase truncate max-w-[150px] leading-tight">${entry.name}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <button onclick="event.stopPropagation(); window.loadModule('dashboard').then(m => m.respondToPlan('${dateKey}', 'confirmed'))" 
                                                class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition active:scale-90 shadow-lg flex items-center gap-1">
                                            ✅ <span class="hidden xs:inline">Jasně</span>
                                        </button>
                                        <button onclick="event.stopPropagation(); window.loadModule('dashboard').then(m => m.showRejectionModal('${dateKey}'))" 
                                                class="bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition active:scale-90 flex items-center gap-1">
                                            ❌ <span class="hidden xs:inline">Teď ne</span>
                                        </button>
                                    </div>
                                </div>
                              `;
                          }

                          if (isPendingFromMe) {
                              const dateLabel = dateKey === todayStr ? '' : (dateKey === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'zítra ' : `${dateKey} `);
                              return `
                                <div class="flex items-center justify-between w-full" onclick="window.loadModule('dashboard').then(m => m.handleNextDateClick('${dateKey}'))">
                                    <div class="flex items-center gap-3 opacity-60">
                                        <div class="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center">${getCategoryIcon(entry.cat)}</div>
                                        <div>
                                            <div class="text-[9px] font-bold text-white/50 uppercase">Čekám na odpověď... ${dateLabel}${entry.time ? `(v ${entry.time})` : ''}</div>
                                            <div class="font-bold text-white text-sm uppercase">${entry.name}</div>
                                        </div>
                                    </div>
                                    <i class="fas fa-hourglass-half text-white/30 text-[10px] animate-spin-slow"></i>
                                </div>
                              `;
                          }

                          if (isRejected) {
                              return `
                                <div class="flex items-center justify-between w-full" onclick="window.loadModule('dashboard').then(m => m.showQuickPlanModal())">
                                    <div class="flex items-center gap-3">
                                        <div class="bg-red-900/40 w-8 h-8 rounded-full flex items-center justify-center text-xs">🥀</div>
                                        <div>
                                            <div class="text-[9px] font-bold text-red-400 uppercase">Plán zrušen: ${entry.rejection_reason || 'Změna plánu'}</div>
                                            <div class="font-bold text-white/40 text-sm uppercase line-through">${entry.name}</div>
                                        </div>
                                    </div>
                                    <span class="text-[10px] font-bold text-white underline">Zkusit jiný?</span>
                                </div>
                              `;
                          }

                          // Confirmed/Happened
                          return `
                            <div class="flex items-center justify-between w-full" onclick="window.loadModule('dashboard').then(m => m.handleNextDateClick('${dateKey}'))">
                                <div class="flex items-center gap-3">
                                    <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg">${getCategoryIcon(entry.cat)}</div>
                                    <div>
                                        <div class="text-[9px] font-bold text-white/70 uppercase">Příště: <span id="countdown-timer">--:--:--</span></div>
                                        <div class="font-bold text-white text-sm uppercase">${entry.name}</div>
                                    </div>
                                </div>
                                <i class="fas fa-chevron-right text-white/30 text-[10px]"></i>
                            </div>
                          `;
                      })()}
                  </div>
              </div>

              <div class="max-w-3xl mx-auto px-3 mt-4 space-y-3">
                  ${state.settings.dashboardWidgets.health ? `
                  <div class="glass-card rounded-2xl p-6 stagger-item" style="animation-delay: 0.05s">
                      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Jak ses vyspala?</h3>
                      <div id="sleep-container">${generateSleepSlider(data)}</div>
                  </div>
                  <div class="glass-card rounded-2xl p-6 stagger-item" style="animation-delay: 0.1s">
                      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Voda</h3>
                      <div class="flex justify-between gap-1" id="water-container">${generateWaterIcons(data.water || 0)}</div>
                  </div>
                  <div class="glass-card rounded-2xl p-6 stagger-item" style="animation-delay: 0.15s">
                      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Jak se dnes cítíš?</h3>
                      <div id="mood-container" class="mood-glow-shadow">${generateMoodSlider(data.mood)}</div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                      <div class="glass-card rounded-2xl p-6 stagger-item" style="animation-delay: 0.2s">
                          <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pohyb</h3>
                          <div class="flex flex-col gap-2" id="movement-container">${generateMovementChips(data.movement)}</div>
                      </div>
                      <div class="glass-card rounded-2xl p-6 stagger-item" style="animation-delay: 0.2s">
                          <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Léky</h3>
                          <div id="pills-container">${generatePillsChip(data.pills, getPillsStreak())}</div>
                      </div>
                  </div>
                  ` : ''}
                  
                  ${state.settings.dashboardWidgets.supplements ? `
                  <div class="glass-card rounded-2xl p-6 stagger-item" style="animation-delay: 0.25s">
                      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Regenerace & Suplementy</h3>
                      <div class="flex flex-wrap justify-between gap-2" id="supplements-container">${generateSupplementsChips(data.supplements)}</div>
                  </div>
                  ` : ''}

                  <div class="stagger-item" style="animation-delay: 0.3s">
                      ${generateDailyQuestionCard()}
                  </div>
                  
                  ${state.settings.dashboardWidgets.funfacts ? `<div class="stagger-item" style="animation-delay: 0.35s">${generateFactOfTheDay()}</div>` : ''}
                  ${state.settings.dashboardWidgets.tetris ? `<div id="tetris-tracker-container" class="stagger-item" style="animation-delay: 0.4s">${generateTetrisMiniTracker()}</div>` : ''}
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

    stateEvents.on('settings_changed', () => {
        if (state.currentChannel === 'dashboard') renderDashboard();
    });

    dashboardListenersSet = true;
}

function getCategoryIcon(cat) {
    const icons = { food: '🍔', walk: '🌲', view: '⛰️', fun: '⚡', movie: '🎬', discord: '🎧', game: '🎮', date: '🥂' };
    return icons[cat] || '📅';
}

function startDashboardTimer(nextDate) {
    if (dashboardTimer) clearInterval(dashboardTimer);
    if (!nextDate) return;

    const [dateKey, entry] = nextDate;
    const targetDate = new Date(`${dateKey}T${entry.time || '00:00'}:00`);

    const updateTimer = () => {
        const timerEl = document.getElementById('countdown-timer');
        if (!timerEl) { clearInterval(dashboardTimer); return; }

        const diff = targetDate - new Date();
        if (diff <= 0) { timerEl.innerText = "PRÁVĚ TEĎ! ❤️"; clearInterval(dashboardTimer); return; }

        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        timerEl.innerText = `${h}:${m}:${s}`;
    };

    updateTimer();
    dashboardTimer = setInterval(updateTimer, 1000);
}

export async function sendSunlight() {
    triggerHaptic('light'); triggerConfetti();
    try { await supabase.from('sunlight_history').insert([{ from_user_id: state.currentUser.id }]); } catch (e) {}
    await broadcastSunlight();
}

export async function handleNextDateClick(dateKey) {
    triggerHaptic('light'); window.switchChannel('calendar');
    const { showDayDetail } = await import('./calendar.js');
    setTimeout(() => { showDayDetail(dateKey); }, 50);
}
// --- QUICK PLAN MODAL ---
let quickPlanData = { cat: 'discord', name: '', time: '' };

export function showQuickPlanModal(step = 1) {
    const { renderModal, renderButton, renderInputGroup } =  { 
        renderModal: (c) => import('../core/ui.js').then(m => m.renderModal(c)),
        renderButton: (c) => import('../core/ui.js').then(m => m.renderButton(c)),
        renderInputGroup: (c) => import('../core/ui.js').then(m => m.renderInputGroup(c))
    };
    
    import('../core/ui.js').then(ui => {
        let content = '';
        let title = 'Naplánovat něco?';
        let actions = '';

        if (step === 1) {
            title = 'Co podnikneme?';
            content = `
                <div class="grid grid-cols-1 gap-3">
                    <button onclick="window.loadModule('dashboard').then(m => m.selectQuickPlanCategory('discord'))" 
                            class="bg-black/20 hover:bg-[#5865F2]/20 p-5 rounded-2xl border border-white/5 hover:border-[#5865F2]/50 transition-all flex items-center gap-4 group">
                        <div class="text-3xl bg-[#5865F2]/10 p-3 rounded-xl group-hover:scale-110 transition">🎧</div>
                        <div class="text-left">
                            <div class="font-bold text-white uppercase text-xs tracking-widest">Discord Call</div>
                            <p class="text-[10px] text-gray-500">Pokec, streamování nebo jen tak být spolu.</p>
                        </div>
                    </button>
                    <button onclick="window.loadModule('dashboard').then(m => m.selectQuickPlanCategory('date'))" 
                            class="bg-black/20 hover:bg-[#eb459e]/20 p-5 rounded-2xl border border-white/5 hover:border-[#eb459e]/50 transition-all flex items-center gap-4 group">
                        <div class="text-3xl bg-[#eb459e]/10 p-3 rounded-xl group-hover:scale-110 transition">🥂</div>
                        <div class="text-left">
                            <div class="font-bold text-white uppercase text-xs tracking-widest">Rande</div>
                            <p class="text-[10px] text-gray-500">Venku, doma, večera nebo dobrodružství.</p>
                        </div>
                    </button>
                    <button onclick="window.loadModule('dashboard').then(m => m.selectQuickPlanCategory('movie'))" 
                            class="bg-black/20 hover:bg-[#faa61a]/20 p-5 rounded-2xl border border-white/5 hover:border-[#faa61a]/50 transition-all flex items-center gap-4 group">
                        <div class="text-3xl bg-[#faa61a]/10 p-3 rounded-xl group-hover:scale-110 transition">🎬</div>
                        <div class="text-left">
                            <div class="font-bold text-white uppercase text-xs tracking-widest">Film / Seriál</div>
                            <p class="text-[10px] text-gray-500">Společné koukání na Netflix nebo kino.</p>
                        </div>
                    </button>
                </div>
            `;
        } else {
            const catInfo = { 
                discord: { icon: '🎧', title: 'Discord Call' },
                date: { icon: '🥂', title: 'Rande' },
                movie: { icon: '🎬', title: 'Film / Seriál' }
            }[quickPlanData.cat];

            title = `${catInfo.icon} ${catInfo.title}`;
            content = `
                <div class="space-y-5 animate-fade-in">
                    ${ui.renderInputGroup({ 
                        label: 'Co přesně budeme dělat?', 
                        id: 'qp-name', 
                        placeholder: 'Např. Minecraft, Marvelovka, Procházka...',
                        value: quickPlanData.name
                    })}
                    
                    <div class="space-y-2">
                        <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kdy?</label>
                        <div class="flex gap-2">
                             <input type="time" id="qp-time" class="bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none flex-1">
                             <div class="flex gap-1">
                                <button onclick="document.getElementById('qp-time').value = '20:00'" class="bg-white/5 hover:bg-white/10 px-3 rounded-lg text-[10px] font-bold text-gray-400">20:00</button>
                                <button onclick="document.getElementById('qp-time').value = '21:00'" class="bg-white/5 hover:bg-white/10 px-3 rounded-lg text-[10px] font-bold text-gray-400">21:00</button>
                             </div>
                        </div>
                    </div>

                    <div class="pt-2">
                        <button onclick="window.loadModule('dashboard').then(m => m.submitQuickPlan())" 
                                class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition active:scale-95 shadow-xl flex items-center justify-center gap-2">
                            <i class="fas fa-paper-plane text-[10px]"></i> Odeslat pozvánku
                        </button>
                        <button onclick="window.loadModule('dashboard').then(m => m.showQuickPlanModal(1))" 
                                class="w-full mt-3 text-gray-500 hover:text-white py-1 text-[10px] font-bold uppercase transition">
                            <i class="fas fa-arrow-left mr-1"></i> Zpět na výběr
                        </button>
                    </div>
                </div>
            `;
        }

        const modalHtml = ui.renderModal({
            id: 'quick-plan-modal',
            title: title,
            subtitle: step === 1 ? 'Vyber si typ aktivity' : 'Doplň podrobnosti',
            content: content,
            onClose: "document.getElementById('quick-plan-modal').remove()"
        });

        // Remove existing if any
        document.getElementById('quick-plan-modal')?.remove();
        
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        document.getElementById('quick-plan-modal').style.display = 'flex';
    });
}

export function selectQuickPlanCategory(cat) {
    quickPlanData.cat = cat;
    triggerHaptic('light');
    showQuickPlanModal(2);
}

export async function submitQuickPlan() {
    const name = document.getElementById('qp-name')?.value.trim();
    const time = document.getElementById('qp-time')?.value.trim();
    
    if (!name) return showNotification("Napiš, co budeme dělat!", "warning");
    
    triggerHaptic('success');
    document.getElementById('quick-plan-modal')?.remove();

    const todayKey = getTodayKey();
    const planId = crypto.randomUUID();
    
    const newPlan = {
        id: planId,
        date_key: todayKey,
        name: name,
        cat: quickPlanData.cat,
        time: time,
        proposed_by: state.currentUser.id,
        status: 'pending'
    };

    try {
        const { error } = await supabase.from('planned_dates').upsert(newPlan, { onConflict: 'date_key' });
        if (error) throw error;
        
        showNotification("Pozvánka odeslána! 💌", "success");
        
        // Broadcast instant notification
        broadcastPlanUpdate({ type: 'proposal', name: name, cat: quickPlanData.cat });

        // Instant local update
        state.plannedDates[todayKey] = newPlan;
        renderDashboard();
        
    } catch (err) {
        console.error("Plan submit error:", err);
        showNotification("Chyba při odesílání plánu.", "error");
    }
}

export async function respondToPlan(dateKey, status) {
    const plan = state.plannedDates[dateKey];
    if (!plan) return;

    triggerHaptic(status === 'confirmed' ? 'success' : 'medium');
    
    try {
        const { error } = await supabase.from('planned_dates')
            .update({ status: status })
            .eq('date_key', dateKey);
            
        if (error) throw error;
        
        state.plannedDates[dateKey].status = status;
        showNotification(status === 'confirmed' ? "Plán potvrzen! ❤️" : "Plán zrušen.", "info");

        broadcastPlanUpdate({ type: 'response', status: status, dateKey: dateKey });

        renderDashboard();
    } catch (err) {
        console.error("Response error:", err);
    }
}

export function showRejectionModal(dateKey) {
    import('../core/ui.js').then(ui => {
        const reasons = [
            { id: 'tired', text: 'Jsem unavený/á... 😴' },
            { id: 'study', text: 'Musím se učit 📚' },
            { id: 'busy', text: 'Už něco mám 🏃‍♀️' },
            { id: 'vibe', text: 'Nemám dnes energii ✨' }
        ];

        const content = `
            <div class="space-y-2">
                <p class="text-xs text-gray-400 mb-4 px-1 italic">To nevadí! ❤️ Vyber důvod, ať partner ví...</p>
                <div class="grid grid-cols-1 gap-2">
                    ${reasons.map(r => `
                        <button onclick="window.loadModule('dashboard').then(m => m.rejectPlanWithReason('${dateKey}', '${r.text}'))"
                                class="w-full bg-black/20 hover:bg-red-500/10 p-4 rounded-xl border border-white/5 hover:border-red-500/30 text-left transition text-sm text-gray-200">
                            ${r.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        const modalHtml = ui.renderModal({
            id: 'rejection-modal',
            title: 'Teď raději ne?',
            content: content,
            onClose: "document.getElementById('rejection-modal').remove()"
        });

        document.getElementById('rejection-modal')?.remove();
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        document.getElementById('rejection-modal').style.display = 'flex';
    });
}

export async function rejectPlanWithReason(dateKey, reason) {
    triggerHaptic('medium');
    document.getElementById('rejection-modal')?.remove();

    try {
        const { error } = await supabase.from('planned_dates')
            .update({ 
                status: 'rejected',
                rejection_reason: reason 
            })
            .eq('date_key', dateKey);
            
        if (error) throw error;
        
        state.plannedDates[dateKey].status = 'rejected';
        state.plannedDates[dateKey].rejection_reason = reason;
        renderDashboard();
        showNotification("Plán zrušen s důvodem.", "info");
    } catch (err) {
        console.error("Rejection error:", err);
    }
}

export async function syncDashboardData(forceRefresh = false) {
    const todayKey = getTodayKey();
    const indicator = document.getElementById("dashboard-sync-indicator");
    if (indicator) indicator.classList.remove("hidden");

    try {
        const queries = [];
        if (state.currentUser?.id) {
            queries.push(supabase.from('health_data').select('*').eq('date_key', todayKey).neq('user_id', state.currentUser.id).maybeSingle());
        } else {
            queries.push(Promise.resolve({ data: null, error: null }));
        }

        queries.push(supabase.rpc('get_dashboard_data', { p_user_id: state.currentUser?.id, p_date: todayKey }));

        const [partnerRes, dashRes] = await Promise.all(queries);
        if (dashRes.error) throw dashRes.error;

        state.dashboardFetched = true;
        const data = dashRes.data || {};
        const partnerHealth = partnerRes.data;

        if (data && data.health) {
            state.healthData[todayKey] = { ...state.healthData[todayKey], ...data.health };
        }
        if (partnerHealth) state.partnerHealthData = partnerHealth;

        const { saveStateToCache } = await import('../core/state.js');
        saveStateToCache();

        // Update visuals if still on dashboard
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
        console.error("[Dashboard] Background Sync Error:", err);
    } finally {
        if (indicator) indicator.classList.add("hidden");
    }
}
