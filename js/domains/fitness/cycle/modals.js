import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { supabase } from '@core/supabase.js';
import { safeUpsert } from '@core/offline.js';
import { broadcastCycleUpdate } from '@core/sync.js';
import { calculateCurrentCycleState } from './cycleEngine.js';

export const COMMON_SYMPTOMS = [
    { id: 'cramps', label: 'Křeče v břiše', icon: '⚡' },
    { id: 'headache', label: 'Bolest hlavy', icon: '🤕' },
    { id: 'fatigue', label: 'Silná únava', icon: '🥱' },
    { id: 'breast_tenderness', label: 'Citlivost prsou', icon: '🌸' },
    { id: 'acne', label: 'Akné / pleť', icon: '✨' },
    { id: 'cravings', label: 'Chutě na sladké', icon: '🍫' },
    { id: 'bloating', label: 'Nadýmání', icon: '🎈' },
    { id: 'mood_swings', label: 'Výkyvy nálad', icon: '🌊' },
    { id: 'high_energy', label: 'Vysoká energie', icon: '🔥' },
    { id: 'calm', label: 'Klid a pohoda', icon: '🧘‍♀️' }
];

/**
 * Otevře modal pro záznam dne cyklu.
 */
export function openCycleLogModal(dateKey = getTodayKey()) {
    let modal = document.getElementById('cycle-log-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cycle-log-modal';
        modal.className = 'fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
        document.body.appendChild(modal);
    }

    const currentLog = (state.cycleLogs || []).find(l => l.date_key === dateKey) || {
        date_key: dateKey,
        flow_intensity: 'none',
        symptoms: [],
        energy_level: 3,
        mood: 3,
        bbt_temperature: '',
        notes: ''
    };

    const selectedSymptoms = Array.isArray(currentLog.symptoms) ? [...currentLog.symptoms] : [];

    modal.innerHTML = `
    <div class="bg-[#2f3136] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
                <span class="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center text-base font-bold">
                    🌸
                </span>
                <div>
                    <h3 class="text-sm font-black text-white">Záznam dne cyklu</h3>
                    <p class="text-[11px] text-gray-400">Datum: <strong class="text-pink-300">${dateKey}</strong></p>
                </div>
            </div>
            <button onclick="window.closeCycleModal()" class="w-8 h-8 rounded-lg bg-[#202225] text-gray-400 hover:text-white flex items-center justify-center transition">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Flow Intensity -->
        <div class="space-y-2">
            <label class="text-xs font-black uppercase tracking-wider text-gray-300">Intenzita krvácení</label>
            <div class="grid grid-cols-5 gap-1.5 text-xs">
                ${[
                    { id: 'none', label: 'Žádné', icon: '⚪' },
                    { id: 'spotting', label: 'Špinění', icon: '💧' },
                    { id: 'light', label: 'Slabé', icon: '🩸' },
                    { id: 'medium', label: 'Střední', icon: '🩸🩸' },
                    { id: 'heavy', label: 'Silné', icon: '🩸🩸🩸' }
                ].map(f => `
                    <button 
                        type="button" 
                        onclick="window.selectFlowIntensity('${f.id}')"
                        id="flow-btn-${f.id}"
                        class="p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition ${currentLog.flow_intensity === f.id ? 'bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm' : 'bg-[#202225] border-white/5 text-gray-400 hover:border-white/20'}"
                    >
                        <span class="text-sm">${f.icon}</span>
                        <span class="text-[10px]">${f.label}</span>
                    </button>
                `).join('')}
            </div>
            <input type="hidden" id="cycle-flow-val" value="${currentLog.flow_intensity || 'none'}">
        </div>

        <!-- Symptoms Chips -->
        <div class="space-y-2">
            <label class="text-xs font-black uppercase tracking-wider text-gray-300">Symptomy a pocity</label>
            <div class="flex flex-wrap gap-1.5" id="symptoms-chip-container">
                ${COMMON_SYMPTOMS.map(s => {
                    const isSelected = selectedSymptoms.includes(s.id);
                    return `
                        <button 
                            type="button"
                            onclick="window.toggleSymptomChip('${s.id}')"
                            id="symptom-chip-${s.id}"
                            class="chip-toggle ${isSelected ? 'active' : ''}"
                        >
                            <span>${s.icon}</span>
                            <span>${s.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Energy & Mood Sliders -->
        <div class="grid grid-cols-2 gap-3 pt-1">
            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 space-y-1.5">
                <div class="flex justify-between items-center text-xs">
                    <span class="font-bold text-gray-300">⚡ Energie</span>
                    <span id="cycle-energy-label" class="font-black text-pink-400">${currentLog.energy_level || 3} / 5</span>
                </div>
                <input 
                    type="range" min="1" max="5" value="${currentLog.energy_level || 3}" 
                    id="cycle-energy-slider"
                    oninput="document.getElementById('cycle-energy-label').innerText = this.value + ' / 5'"
                    class="w-full slider-pink"
                >
            </div>

            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 space-y-1.5">
                <div class="flex justify-between items-center text-xs">
                    <span class="font-bold text-gray-300">😊 Nálada</span>
                    <span id="cycle-mood-label" class="font-black text-purple-400">${currentLog.mood || 3} / 5</span>
                </div>
                <input 
                    type="range" min="1" max="5" value="${currentLog.mood || 3}" 
                    id="cycle-mood-slider"
                    oninput="document.getElementById('cycle-mood-label').innerText = this.value + ' / 5'"
                    class="w-full slider-purple"
                >
            </div>
        </div>

        <!-- Basal Body Temperature -->
        <div class="space-y-1">
            <label class="text-xs font-black uppercase tracking-wider text-gray-300">Bazální teplota (°C) <span class="text-gray-500 font-normal lowercase">(volitelné)</span></label>
            <input 
                type="number" step="0.05" min="35.0" max="39.0" 
                id="cycle-bbt-input" 
                placeholder="např. 36.65" 
                value="${currentLog.bbt_temperature || ''}"
                class="w-full p-2.5 bg-[#202225] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
            >
        </div>

        <!-- Notes -->
        <div class="space-y-1">
            <label class="text-xs font-black uppercase tracking-wider text-gray-300">Soukromé poznámky <span class="text-pink-400 font-normal">(pouze pro tebe)</span></label>
            <textarea 
                id="cycle-notes-input" 
                rows="2" 
                placeholder="Dnešní pocity, chutě, cokoliv dalšího..." 
                class="w-full p-2.5 bg-[#202225] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
            >${currentLog.notes || ''}</textarea>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
            <button 
                type="button" 
                onclick="window.closeCycleModal()" 
                class="flex-1 py-2.5 rounded-xl bg-[#202225] hover:bg-[#282b30] text-gray-300 font-bold text-xs transition"
            >
                Zrušit
            </button>
            <button 
                type="button" 
                onclick="window.saveCycleDayLog('${dateKey}')" 
                class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
                <i class="fas fa-save"></i>
                <span>Uložit záznam</span>
            </button>
        </div>
    </div>
    `;
    modal.style.display = 'flex';
}

/**
 * Globální pomocníci pro interaktivní výběry v modalu
 */
let activeModalSymptoms = [];

if (typeof window !== 'undefined') {
    window.closeCycleModal = () => {
        const modal = document.getElementById('cycle-log-modal');
        if (modal) modal.style.display = 'none';
    };

    window.selectFlowIntensity = (val) => {
        triggerHaptic('light');
        document.getElementById('cycle-flow-val').value = val;
        ['none', 'spotting', 'light', 'medium', 'heavy'].forEach(id => {
            const btn = document.getElementById(`flow-btn-${id}`);
            if (btn) {
                if (id === val) {
                    btn.className = 'p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm';
                } else {
                    btn.className = 'p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition bg-[#202225] border-white/5 text-gray-400 hover:border-white/20';
                }
            }
        });
    };

    window.toggleSymptomChip = (id) => {
        triggerHaptic('light');
        const btn = document.getElementById(`symptom-chip-${id}`);
        if (!btn) return;

        const idx = activeModalSymptoms.indexOf(id);
        if (idx > -1) {
            activeModalSymptoms.splice(idx, 1);
            btn.classList.remove('active');
        } else {
            activeModalSymptoms.push(id);
            btn.classList.add('active');
        }
    };

    window.saveCycleDayLog = async (dateKey) => {
        triggerHaptic('success');
        const flow = document.getElementById('cycle-flow-val')?.value || 'none';
        const energy = parseInt(document.getElementById('cycle-energy-slider')?.value || 3);
        const mood = parseInt(document.getElementById('cycle-mood-slider')?.value || 3);
        const bbt = parseFloat(document.getElementById('cycle-bbt-input')?.value) || null;
        const notes = document.getElementById('cycle-notes-input')?.value || '';

        const newLog = {
            user_id: state.currentUser?.id,
            date_key: dateKey,
            flow_intensity: flow,
            symptoms: activeModalSymptoms,
            energy_level: energy,
            mood: mood,
            bbt_temperature: bbt,
            notes: notes,
            updated_at: new Date().toISOString()
        };

        // 1. Lokální aktualizace
        if (!state.cycleLogs) state.cycleLogs = [];
        const existingIdx = state.cycleLogs.findIndex(l => l.date_key === dateKey);
        if (existingIdx > -1) {
            state.cycleLogs[existingIdx] = newLog;
        } else {
            state.cycleLogs.push(newLog);
        }
        saveStateToCache();

        // 2. Synchronizace do Supabase
        try {
            await safeUpsert('cycle_logs', newLog, 'user_id, date_key');
        } catch (e) {
            console.warn("Supabase cycle save fallback:", e);
        }

        // 3. Realtime broadcast partnerovi s filtrovanými daty
        const cycleState = calculateCurrentCycleState(new Date(dateKey), state.cycleLogs, state.cycleSettings);
        broadcastCycleUpdate(cycleState);

        window.closeCycleModal();
        if (typeof window.renderCycleTracker === 'function') {
            window.renderCycleTracker();
        }
        if (typeof window.showNotification === 'function') {
            window.showNotification('Záznam cyklu byl úspěšně uložen! 🌸', 'success');
        }
    };
}
