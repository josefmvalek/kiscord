import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { renderTodayChallengeHtml, renderAllChallengesHtml } from './render.js';
import {
    openAddChallengeModal,
    saveCustomChallenge,
    openCompleteChallengeModal,
    saveChallengeCompletion,
    viewChallengeDetail
} from './challenges.js';

export {
    renderTodayChallengeHtml,
    renderAllChallengesHtml,
    openAddChallengeModal,
    saveCustomChallenge,
    openCompleteChallengeModal,
    saveChallengeCompletion,
    viewChallengeDetail
};

let activeTab = 'today';
let realtimeSubscription = null;

export async function renderAlpskaVyzva() {
    // Expose API to window
    window.AlpskaVyzva = {
        scratchCard,
        openCompleteChallengeModal,
        saveChallengeCompletion,
        switchTab,
        openAddChallengeModal,
        saveCustomChallenge,
        viewChallengeDetail
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    await ensureChallengesData();
    setupRealtime();

    const todayKey = new Date().toISOString().split("T")[0];
    
    // Calculate current day index of the trip (departure May 31, 2026)
    const departureDate = new Date('2026-05-31T00:00:00');
    const now = new Date();
    const diffMs = now - departureDate;
    const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 0-indexed starting May 31

    const isTripStarted = dayIndex >= 0;

    let html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16 font-sans">
            <!-- Header Banner -->
            <div class="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950/40 border-b border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[190px] pt-6">
                <div class="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                
                <div class="relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 shadow-xl mb-2 animate-bounce-slow">
                    <i class="fas fa-mountain text-white text-xl drop-shadow-md"></i>
                </div>
                <h1 class="relative z-10 text-xl lg:text-2xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Alpská Výzva 🏔️✨</h1>
                <p class="relative z-10 text-gray-300 font-semibold mt-0.5 text-center text-[10px] uppercase tracking-wider max-w-md">Denní horské dobrodružství</p>
                
                <!-- Extra Action: Add Custom Challenge -->
                <button onclick="window.AlpskaVyzva.openAddChallengeModal()"
                        class="relative z-10 mt-3 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition duration-300 flex items-center gap-1.5">
                    <i class="fas fa-plus text-emerald-400"></i> Naplánovat vlastní výzvu ✍️
                </button>

                <!-- Navigation Tabs inside Header -->
                <div class="flex justify-center w-full border-t border-white/5 bg-black/10 mt-5 py-2.5 gap-6 relative z-10">
                    <button onclick="window.AlpskaVyzva.switchTab('today')" id="tab-btn-today" 
                            class="text-xs font-black uppercase tracking-wider py-1 border-b-2 ${activeTab === 'today' ? 'border-[#3ba55c] text-white' : 'border-transparent text-gray-400 hover:text-white'} transition-all">
                        Dnešní Výzva
                    </button>
                    <button onclick="window.AlpskaVyzva.switchTab('all')" id="tab-btn-all" 
                            class="text-xs font-black uppercase tracking-wider py-1 border-b-2 ${activeTab === 'all' ? 'border-[#3ba55c] text-white' : 'border-transparent text-gray-400 hover:text-white'} transition-all">
                        Všechny Výzvy
                    </button>
                </div>
            </div>

            <div class="max-w-xl mx-auto px-4 pt-6" id="challenge-content-area">
                ${activeTab === 'today' ? renderTodayChallengeHtml(todayKey, dayIndex, isTripStarted) : renderAllChallengesHtml(dayIndex, departureDate)}
            </div>
        </div>
    `;

    container.innerHTML = html;
}


export function switchTab(tab) {
    triggerHaptic('light');
    activeTab = tab;
    renderAlpskaVyzva();
}

export function scratchCard() {
    triggerHaptic('heavy');
    if (typeof window.triggerConfetti === 'function') {
        window.triggerConfetti();
    }
    import('@core/sound.js').then(s => s.playPageFlip()).catch(() => {});

    const todayKey = new Date().toISOString().split("T")[0];
    localStorage.setItem(`kiscord_revealed_challenge_${todayKey}`, 'true');
    renderAlpskaVyzva();
}

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('brigade-challenges-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'brigade_challenges' },
            (payload) => {
                console.log('Brigade challenges realtime change:', payload.eventType);
                ensureChallengesData(true).then(() => {
                    if (state.currentChannel === 'alpska-vyzva') {
                        renderAlpskaVyzva();
                    }
                });
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}
window.alpskaVyzvaCleanup = cleanupRealtime;

// Add Custom Challenge Modal
