/**
 * matura/pomodoro.js
 * Pomodoro timer logika pro Maturita modul.
 * Oddělena od hlavního matura.js pro přehlednost.
 *
 * Závislosti:
 *  - state (currentUser, maturaSchedule)
 *  - supabase (matura_pomodoro, matura_schedule)
 *  - broadcastPomodoroUpdate (core/sync.js)
 *  - showNotification (core/theme.js)
 *  - triggerHaptic (core/utils.js)
 *  - getAssetUrl (core/assets.js)
 *  - renderTodaysMissions (matura/dashboard.js – volá se z event listeneru)
 */

import { state } from '../../core/state.js';
import { supabase } from '../../core/supabase.js';
import { broadcastPomodoroUpdate } from '../../core/sync.js';
import { showNotification } from '../../core/theme.js';
import { triggerHaptic } from '../../core/utils.js';
import { getAssetUrl } from '../../core/assets.js';

// --- Sdílený stav timeru (lokální, ne v state.js) ---
let pomodoroInterval = null;
export const pomodoroState = { status: 'stopped', timeLeft: 0, partnerStudying: false };

// Callback pro renderTodaysMissions – injektuje ho caller při inicializaci
let _renderTodaysMissions = null;

/**
 * Inicializuje Pomodoro timer – načte stav z DB a nastaví event listenery.
 * @param {Function} renderTodaysMissionsFn - Funkce z dashboard.js pro refresh misí
 */
export async function initPomodoro(renderTodaysMissionsFn) {
    _renderTodaysMissions = renderTodaysMissionsFn;

    // 1. Načíst stav z DB
    const { data } = await supabase.from('matura_pomodoro').select('*').eq('id', 'global').single();

    if (data) {
        updatePomodoroFromData(data);
    } else {
        // Vytvořit výchozí řádek, pokud ještě neexistuje
        await supabase.from('matura_pomodoro').insert({ id: 'global', status: 'stopped', duration_minutes: 25 });
    }

    // 2. Nastavit event listenery pro realtime updates
    window.addEventListener('pomodoro-updated', (e) => {
        const data = e.detail.source === 'database' ? e.detail.payload : e.detail;
        if (data.type === 'schedule-sync') {
            // Přenačteme celý rozvrh
            supabase.from('matura_schedule').select('*')
                .gte('scheduled_date', new Date().toISOString().split('T')[0])
                .then(({ data }) => {
                    if (data) {
                        state.maturaSchedule = data;
                        if (_renderTodaysMissions) _renderTodaysMissions();
                    }
                });
            return;
        }
        updatePomodoroFromData(data);
    });
}

/**
 * Přepne timer mezi running/stopped a synchronizuje s DB + partnerem
 */
export async function togglePomodoro() {
    const isRunning = pomodoroState.status === 'running';
    const nextStatus = isRunning ? 'stopped' : 'running';
    const nextStartedAt = nextStatus === 'running' ? new Date().toISOString() : null;

    const update = {
        id: 'global',
        status: nextStatus,
        started_at: nextStartedAt,
        duration_minutes: 25,
        last_updated_by: state.currentUser?.id,
        updated_at: new Date().toISOString()
    };

    // Uložit do DB
    await supabase.from('matura_pomodoro').upsert(update);

    // Broadcast partnerovi + lokální update
    broadcastPomodoroUpdate(update);
    updatePomodoroFromData(update);

    triggerHaptic(nextStatus === 'running' ? 'success' : 'medium');
}

// --- Interní funkce ---

function updatePomodoroFromData(data) {
    pomodoroState.status = data.status;

    if (data.status === 'running' && data.started_at) {
        const startedAt = new Date(data.started_at);
        const now = new Date();
        const elapsed = Math.floor((now - startedAt) / 1000);
        const total = data.duration_minutes * 60;
        pomodoroState.timeLeft = Math.max(0, total - elapsed);

        if (pomodoroState.timeLeft > 0) {
            startLocalTimer();
        } else {
            stopLocalTimer();
            pomodoroState.status = 'stopped';
        }
    } else {
        stopLocalTimer();
        pomodoroState.timeLeft = data.duration_minutes * 60;
    }

    updatePomodoroUI();
}

function startLocalTimer() {
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    pomodoroInterval = setInterval(() => {
        pomodoroState.timeLeft--;
        if (pomodoroState.timeLeft <= 0) {
            stopLocalTimer();
            pomodoroState.status = 'stopped';
            playBellSound();
            showNotification('STUDIUM DOKONČENO! 🧠 Skvělá práce, dej si pauzu.', 'success');
        }
        updatePomodoroUI();
    }, 1000);
}

function stopLocalTimer() {
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    pomodoroInterval = null;
}

function playBellSound() {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
        audio.volume = 0.5;
        audio.play();
    } catch (e) { console.warn('Bell sound failed', e); }
}

function updatePomodoroUI() {
    const timerEl = document.getElementById('pomodoro-timer');
    const btnEl = document.getElementById('pomodoro-btn');
    const statusListEl = document.getElementById('pomodoro-status-list');
    const ringFill = document.getElementById('pomodoro-ring-fill');

    const totalSeconds = 25 * 60;
    const isStudying = pomodoroState.status === 'running';

    if (timerEl) {
        const mins = Math.floor(pomodoroState.timeLeft / 60);
        const secs = pomodoroState.timeLeft % 60;
        timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (ringFill) {
        const circumference = 252;
        const percent = Math.min(100, Math.max(0, (pomodoroState.timeLeft / totalSeconds) * 100));
        const offset = circumference - (percent / 100) * circumference;
        ringFill.style.strokeDashoffset = offset;
        if (isStudying) {
            ringFill.classList.add('studying');
        } else {
            ringFill.classList.remove('studying');
        }
    }

    if (btnEl) {
        btnEl.innerHTML = isStudying
            ? '<i class="fas fa-pause"></i> <span>Stop</span>'
            : '<i class="fas fa-brain"></i> <span>Start</span>';
        btnEl.className = isStudying
            ? 'bg-[#ed4245] hover:bg-[#c03537] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(237,66,69,0.3)] transition-all active:scale-95 flex items-center gap-3'
            : 'bg-[#eb459e] hover:bg-[#d43d8b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(235,69,158,0.3)] transition-all active:scale-95 flex items-center gap-3';
    }

    if (statusListEl) {
        // Zabránit zbytečným re-renderům, které přeruší CSS animace
        if (statusListEl.dataset.lastStatus === isStudying.toString()) return;
        statusListEl.dataset.lastStatus = isStudying.toString();

        const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
        const partnerImg = state.currentUser?.name === 'Jožka' ? getAssetUrl('klarka_profile') : getAssetUrl('jozka_profile');
        const myImg = state.currentUser?.name === 'Jožka' ? getAssetUrl('jozka_profile') : getAssetUrl('klarka_profile');

        statusListEl.innerHTML = `
            <!-- Current User Status -->
            <div class="flex-shrink-0 bg-white/5 border border-white/5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-700 ${isStudying ? 'text-[#eb459e] border-[#eb459e]/30 shadow-[0_5px_15px_rgba(235,69,158,0.1)]' : 'text-gray-500 opacity-50 grayscale'}">
                <img src="${myImg}" class="w-6 h-6 rounded-full object-cover">
                <span>Já ${isStudying ? 'právě makám! 🚀' : 'odpočívám'}</span>
            </div>

            <!-- Partner Status -->
            <div class="flex-shrink-0 bg-white/5 border border-white/5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-700 ${isStudying ? 'text-green-400 border-green-500/30' : 'text-gray-500 opacity-50 grayscale'}">
                <img src="${partnerImg}" class="w-6 h-6 rounded-full object-cover">
                <span>${partnerName} ${isStudying ? 'studuje se mnou 🔥' : 'se taky fláká...'}</span>
            </div>
        `;
    }
}
