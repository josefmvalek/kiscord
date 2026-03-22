import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, getInflectedName, getTodayKey } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { broadcastSunlight } from '../core/sync.js';
import { getTodayData } from './health.js';

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
    generateTetrisMiniTracker,
    updateWaterVisuals,
    updateMovementVisuals
} from './dashboard/health_ui.js';
import { handleWelcomeChat, refreshDashboardFact } from './dashboard/chat.js';

let dashboardListenersSet = false;

// Helpers
function getDaysTogether() {
    const start = new Date(state.startDate);
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function renderDashboard(forceRefresh = false) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const todayKey = getTodayKey();
    if (!state.healthData) state.healthData = {};
    if (!state.healthData[todayKey]) {
        state.healthData[todayKey] = { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    }

    // Background Sync
    if (navigator.onLine && (!state.dashboardFetched || forceRefresh)) {
        setTimeout(async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const partnerHealthPromise = supabase.from('health_data')
                    .select('*')
                    .eq('date_key', todayKey)
                    .neq('user_id', state.currentUser.id)
                    .single();

                state.dashboardFetched = true;
                const { data, error } = await supabase.rpc('get_dashboard_data', {
                    p_user_id: state.currentUser.id,
                    p_date: today
                });

                if (!error && data) {
                    state.healthData[todayKey] = data.health || state.healthData[todayKey];
                    if (data.tetris) {
                        if (!state.tetris) state.tetris = { jose: 0, klarka: 0 };
                        state.tetris.jose = data.tetris.jose || 0;
                        state.tetris.klarka = data.tetris.klarka || 0;
                    }
                    const { data: pData } = await partnerHealthPromise;
                    if (pData) state.partnerHealthData = pData;

                    if (state.currentChannel === 'dashboard' && document.getElementById("messages-container")) {
                        renderDashboard(); 
                    }
                }
            } catch (err) {
                console.warn("Dashboard sync failed:", err);
            }
        }, 50);
    }

    const data = getTodayData();
    const niceDate = new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
    const hour = new Date().getHours();
    let greeting = hour >= 18 ? "Krásný večer" : (hour >= 11 ? "Ahoj" : "Dobré ráno");
    const daysTogether = getDaysTogether();

    const todayStr = new Date().toISOString().split("T")[0];
    const upcomingDates = Object.entries(state.plannedDates || {})
        .filter(([date]) => date >= todayStr)
        .sort((a, b) => a[0].localeCompare(b[0]));
    const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

    container.innerHTML = `
          <div class="flex-1 overflow-y-auto no-scrollbar bg-[#36393f] relative w-full h-full pb-20">
              <div class="relative bg-gradient-to-br from-[#5865F2] to-[#eb459e] shadow-lg overflow-hidden flex-shrink-0 pt-3 pb-0 rounded-b-3xl">
                  <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                  <div class="relative z-10 px-6 mb-0 flex justify-between items-end min-h-[140px]">
                      <div id="dashboard-welcome-text" class="pb-2">
                           <p class="text-[10px] font-bold uppercase tracking-wider opacity-80 text-white/90 mb-0.5">${niceDate}</p>
                           <h1 class="text-2xl font-black text-white drop-shadow-md leading-tight">${greeting},<br>${getInflectedName(state.currentUser.name, 5)} 🌞</h1>
                          <div class="flex items-center gap-2 mt-3">
                              <div class="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-center shadow-sm border border-white/10 inline-block min-w-[60px]">
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
                       onclick="${nextDate ? `import('./js/modules/calendar.js').then(m => m.showDayDetail('${nextDate[0]}'))` : `window.switchChannel('dateplanner')`}">
                      ${nextDate ? `
                            <div class="flex items-center gap-3 overflow-hidden">
                                <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm flex-shrink-0">📅</div>
                                 <div class="min-w-0">
                                    <div class="text-[9px] font-bold text-white/70 uppercase tracking-wide flex items-center gap-1">Příště <span class="w-1 h-1 bg-[#3ba55c] rounded-full animate-pulse"></span></div>
                                    <div class="font-bold text-white text-sm truncate">${nextDate[1].name}</div>
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

                  <div id="tetris-tracker-container">${generateTetrisMiniTracker()}</div>

                  <!-- Welcome Chat -->
                  <!--
                  <div class="bg-[var(--bg-secondary)] rounded-2xl border border-white/5 shadow-xl flex flex-col min-h-[300px]">
                      <div class="p-4 border-b border-white/5 bg-black/10 flex justify-between items-center">
                          <span class="text-xs font-bold text-gray-300 uppercase tracking-widest">Live Chat</span>
                          <button onclick="import('./js/modules/dashboard.js').then(m => m.refreshDashboardFact())" class="text-[10px] text-gray-500 hover:text-white transition uppercase font-black">Fakt 🦝</button>
                      </div>
                      <div class="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar" id="chat-scroller" style="max-height: 400px;">
                          <div id="dashboard-fact-container" class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-start gap-3">
                              <div class="text-2xl h-8 w-8 flex items-center justify-center">🦝</div>
                              <p class="text-gray-300 text-sm italic leading-relaxed">"Věděli jste, že mývalové mají na tlapkách hmatové receptory?"</p>
                          </div>
                          <div id="new-messages-area" class="space-y-1"></div>
                          <div id="typing-indicator" class="hidden flex items-center gap-2 text-gray-500 text-xs italic ml-14">
                              <span>Bot přemýšlí...</span>
                          </div>
                      </div>
                      <div class="p-4 bg-black/10">
                          <input type="text" id="chat-input" placeholder="Napiš vzkaz..." onkeydown="import('./js/modules/dashboard.js').then(m => m.handleWelcomeChat(event))"
                                 class="w-full bg-[#202225] text-white text-sm p-4 rounded-2xl outline-none border border-transparent focus:border-[#5865F2]/50 transition-all">
                      </div>
                  </div>
                  -->
              </div>
          </div>
    `;

    setupDashboardEvents();
    updateSunflowersDOM();
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
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 bg-[#ffd700] mix-blend-overlay opacity-60 z-[9999] pointer-events-none transition-opacity duration-1000";
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.style.opacity = '0'; }, 300);
        setTimeout(() => { overlay.remove(); }, 1500);
        showNotification("Dostal/a jsi sluneční paprsek! ☀️", "success");
    });

    dashboardListenersSet = true;
}

export async function sendSunlight() {
    triggerHaptic('light');
    const btn = document.querySelector('.sun-send-btn');
    if (btn) {
        btn.classList.add('animate-ping');
        setTimeout(() => btn.classList.remove('animate-ping'), 1000);
    }
    await broadcastSunlight();
}
