import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { safeUpsert } from '@core/offline.js';
import { SLEEP_TAGS, DREAM_TAGS, calculateSleepEfficiency } from './sleepEngine.js';

let activeSleepModalTags = [];
let activeDreamModalTags = [];

/**
 * Otevře modal pro detailní ranní záznam spánku.
 */
export function openSleepLogModal(dateKey = getTodayKey()) {
    let modal = document.getElementById('sleep-log-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sleep-log-modal';
        modal.className = 'fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
        document.body.appendChild(modal);
    }

    const currentLog = (state.sleepLogs && state.sleepLogs[dateKey]) || {
        date_key: dateKey,
        bedtime: '23:00',
        wake_time: '07:30',
        sleep_duration_hours: 8.0,
        time_in_bed_hours: 8.5,
        latency_minutes: 15,
        awakenings_count: 0,
        restfulness_score: 4,
        slept_together: true,
        sleep_tags: ['hot_shower', 'cold_room'],
        dream_note: '',
        dream_tags: []
    };

    activeSleepModalTags = Array.isArray(currentLog.sleep_tags) ? [...currentLog.sleep_tags] : [];
    activeDreamModalTags = Array.isArray(currentLog.dream_tags) ? [...currentLog.dream_tags] : [];

    modal.innerHTML = `
    <div class="bg-[#2f3136] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
                <span class="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-base font-bold">
                    🌙
                </span>
                <div>
                    <h3 class="text-sm font-black text-white">Ranní Záznam Spánku</h3>
                    <p class="text-[11px] text-gray-400">Datum: <strong class="text-blue-300">${dateKey}</strong></p>
                </div>
            </div>
            <button onclick="window.closeSleepModal()" class="w-8 h-8 rounded-lg bg-[#202225] text-gray-400 hover:text-white flex items-center justify-center transition">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Times: Bedtime & Wake Time -->
        <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 space-y-1">
                <label class="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                    <i class="fas fa-moon text-blue-400"></i> Čas usnutí
                </label>
                <input 
                    type="time" 
                    id="sleep-bedtime-input" 
                    value="${currentLog.bedtime || '23:00'}"
                    class="w-full bg-transparent text-white font-black text-sm focus:outline-none"
                >
            </div>
            <div class="p-3 bg-[#202225] rounded-xl border border-white/5 space-y-1">
                <label class="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                    <i class="fas fa-sun text-amber-400"></i> Čas probuzení
                </label>
                <input 
                    type="time" 
                    id="sleep-waketime-input" 
                    value="${currentLog.wake_time || '07:30'}"
                    class="w-full bg-transparent text-white font-black text-sm focus:outline-none"
                >
            </div>
        </div>

        <!-- Sleep Latency (Time to fall asleep) -->
        <div class="space-y-1.5">
            <label class="text-xs font-black uppercase tracking-wider text-gray-300">Doba usínání (Latence)</label>
            <div class="grid grid-cols-4 gap-1.5 text-xs">
                ${[
                    { min: 5, label: '< 5 min', desc: 'Vyčerpání' },
                    { min: 15, label: '10-15 min', desc: 'Ideál' },
                    { min: 30, label: '20-30 min', desc: 'Mírně déle' },
                    { min: 45, label: '> 45 min', desc: 'Nespavost' }
                ].map(lat => `
                    <button 
                        type="button" 
                        onclick="window.selectSleepLatency(${lat.min})" 
                        id="latency-btn-${lat.min}"
                        class="p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 transition ${currentLog.latency_minutes === lat.min ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-[#202225] border-white/5 text-gray-400'}"
                    >
                        <span>${lat.label}</span>
                        <span class="text-[9px] text-gray-500 font-normal">${lat.desc}</span>
                    </button>
                `).join('')}
            </div>
            <input type="hidden" id="sleep-latency-val" value="${currentLog.latency_minutes || 15}">
        </div>

        <!-- Slept Together Pair Switch -->
        <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="text-base">🫀</span>
                <div>
                    <span class="text-xs font-bold text-white block">Spali jsme dnes v jedné posteli?</span>
                    <span class="text-[10px] text-gray-400">Párová spánková synergie</span>
                </div>
            </div>
            <button 
                type="button" 
                onclick="window.toggleSleptTogether()" 
                id="slept-together-toggle-btn"
                class="px-3 py-1.5 rounded-xl font-bold text-xs transition ${currentLog.slept_together ? 'bg-pink-500 text-white shadow-sm' : 'bg-[#18191c] text-gray-400'}"
            >
                ${currentLog.slept_together ? 'Ano ❤️' : 'Ne / Solo'}
            </button>
            <input type="hidden" id="slept-together-val" value="${currentLog.slept_together ? 'true' : 'false'}">
        </div>

        <!-- Evening Sleep Disruptors / Facilitators Chips -->
        <div class="space-y-1.5">
            <label class="text-xs font-black uppercase tracking-wider text-gray-300">Večerní faktory & návyky</label>
            <div class="flex flex-wrap gap-1.5">
                ${SLEEP_TAGS.map(t => {
                    const isSelected = activeSleepModalTags.includes(t.id);
                    return `
                        <button 
                            type="button" 
                            onclick="window.toggleSleepTag('${t.id}')" 
                            id="sleep-tag-${t.id}"
                            class="chip-toggle ${isSelected ? (t.type === 'positive' ? 'active-green' : 'active') : ''}"
                        >
                            <span>${t.icon}</span>
                            <span>${t.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Restfulness Score Slider & Segmented Cards -->
        <div class="p-3.5 bg-[#202225] rounded-xl border border-white/5 space-y-3">
            <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-gray-300 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Ranní svěžest & energie</span>
                </span>
                <span id="sleep-restfulness-label" class="font-black text-blue-400 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    ${currentLog.restfulness_score || 4} / 5 • ${getRestfulnessText(currentLog.restfulness_score || 4)}
                </span>
            </div>

            <!-- 5-Level Segmented Cards -->
            <div class="grid grid-cols-5 gap-1.5 text-center">
                ${[
                    { val: 1, icon: '😫', label: 'Zbitý/á' },
                    { val: 2, icon: '🥱', label: 'Unavený' },
                    { val: 3, icon: '😐', label: 'Normální' },
                    { val: 4, icon: '🙂', label: 'Svěží' },
                    { val: 5, icon: '🌟', label: 'Energie!' }
                ].map(item => `
                    <button 
                        type="button" 
                        onclick="window.selectSleepRestfulness(${item.val})" 
                        id="restfulness-btn-${item.val}"
                        class="p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition ${currentLog.restfulness_score === item.val ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm' : 'bg-[#18191c] border-white/5 text-gray-400 hover:border-white/20'}"
                    >
                        <span class="text-base">${item.icon}</span>
                        <span class="text-[9px] truncate w-full">${item.label}</span>
                    </button>
                `).join('')}
            </div>

            <!-- Range Slider -->
            <div class="pt-1">
                <input 
                    type="range" min="1" max="5" step="1" 
                    value="${currentLog.restfulness_score || 4}" 
                    id="sleep-restfulness-slider"
                    oninput="window.onSleepRestfulnessSlider(this.value)"
                    class="w-full slider-blue"
                >
            </div>
        </div>

        <!-- Dream Journal Entry -->
        <div class="space-y-1.5">
            <label class="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <span>🌌 Deník snů</span>
                <span class="text-gray-500 font-normal lowercase">(volitelné)</span>
            </label>
            <textarea 
                id="sleep-dream-notes" 
                rows="2" 
                placeholder="Co se ti v noci zdálo? Zapiš si útržky snu..." 
                class="w-full p-2.5 bg-[#202225] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            >${currentLog.dream_note || ''}</textarea>

            <div class="flex flex-wrap gap-1.5 pt-1">
                ${DREAM_TAGS.map(dt => {
                    const isSelected = activeDreamModalTags.includes(dt.id);
                    return `
                        <button 
                            type="button" 
                            onclick="window.toggleDreamTag('${dt.id}')" 
                            id="dream-tag-${dt.id}"
                            class="chip-toggle ${isSelected ? 'active' : ''}"
                        >
                            <span>${dt.icon}</span>
                            <span>${dt.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
            <button 
                type="button" 
                onclick="window.closeSleepModal()" 
                class="flex-1 py-2.5 rounded-xl bg-[#202225] hover:bg-[#282b30] text-gray-300 font-bold text-xs transition"
            >
                Zrušit
            </button>
            <button 
                type="button" 
                onclick="window.saveSleepDayLog('${dateKey}')" 
                class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
                <i class="fas fa-save"></i>
                <span>Uložit spánek</span>
            </button>
        </div>
    </div>
    `;
    modal.style.display = 'flex';
}

function getRestfulnessText(score) {
    const texts = {
        1: 'Zbitý/á 😫',
        2: 'Unavený/á 🥱',
        3: 'Normální 😐',
        4: 'Svěží 🙂',
        5: 'Plný energie! 🌟'
    };
    return texts[score] || 'Svěží 🙂';
}

if (typeof window !== 'undefined') {
    window.openSleepLogModal = openSleepLogModal;
    window.closeSleepModal = () => {
        const modal = document.getElementById('sleep-log-modal');
        if (modal) modal.style.display = 'none';
    };

    window.selectSleepRestfulness = (val) => {
        triggerHaptic('light');
        const numVal = parseInt(val);
        const slider = document.getElementById('sleep-restfulness-slider');
        if (slider) slider.value = numVal;

        const label = document.getElementById('sleep-restfulness-label');
        if (label) label.innerText = `${numVal} / 5 • ${getRestfulnessText(numVal)}`;

        [1, 2, 3, 4, 5].forEach(v => {
            const btn = document.getElementById(`restfulness-btn-${v}`);
            if (btn) {
                btn.className = v === numVal
                    ? 'p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm'
                    : 'p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition bg-[#18191c] border-white/5 text-gray-400 hover:border-white/20';
            }
        });
    };

    window.onSleepRestfulnessSlider = (val) => {
        const numVal = parseInt(val);
        const label = document.getElementById('sleep-restfulness-label');
        if (label) label.innerText = `${numVal} / 5 • ${getRestfulnessText(numVal)}`;

        [1, 2, 3, 4, 5].forEach(v => {
            const btn = document.getElementById(`restfulness-btn-${v}`);
            if (btn) {
                btn.className = v === numVal
                    ? 'p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm'
                    : 'p-2 rounded-xl border font-bold flex flex-col items-center gap-1 transition bg-[#18191c] border-white/5 text-gray-400 hover:border-white/20';
            }
        });
    };

    window.selectSleepLatency = (min) => {
        triggerHaptic('light');
        document.getElementById('sleep-latency-val').value = min;
        [5, 15, 30, 45].forEach(m => {
            const btn = document.getElementById(`latency-btn-${m}`);
            if (btn) {
                btn.className = m === min
                    ? 'p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 transition bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 transition bg-[#202225] border-white/5 text-gray-400';
            }
        });
    };

    window.toggleSleptTogether = () => {
        triggerHaptic('light');
        const input = document.getElementById('slept-together-val');
        const btn = document.getElementById('slept-together-toggle-btn');
        const current = input.value === 'true';
        input.value = current ? 'false' : 'true';
        btn.className = !current
            ? 'px-3 py-1.5 rounded-xl font-bold text-xs transition bg-pink-500 text-white shadow-sm'
            : 'px-3 py-1.5 rounded-xl font-bold text-xs transition bg-[#18191c] text-gray-400';
        btn.innerText = !current ? 'Ano ❤️' : 'Ne / Solo';
    };

    window.toggleSleepTag = (id) => {
        triggerHaptic('light');
        const btn = document.getElementById(`sleep-tag-${id}`);
        const idx = activeSleepModalTags.indexOf(id);
        if (idx > -1) {
            activeSleepModalTags.splice(idx, 1);
            btn.classList.remove('active', 'active-green');
        } else {
            activeSleepModalTags.push(id);
            const tag = SLEEP_TAGS.find(t => t.id === id);
            btn.classList.add(tag?.type === 'positive' ? 'active-green' : 'active');
        }
    };

    window.toggleDreamTag = (id) => {
        triggerHaptic('light');
        const btn = document.getElementById(`dream-tag-${id}`);
        const idx = activeDreamModalTags.indexOf(id);
        if (idx > -1) {
            activeDreamModalTags.splice(idx, 1);
            btn.classList.remove('active');
        } else {
            activeDreamModalTags.push(id);
            btn.classList.add('active');
        }
    };

    window.saveSleepDayLog = async (dateKey) => {
        triggerHaptic('success');
        const bedtime = document.getElementById('sleep-bedtime-input')?.value || '23:00';
        const wakeTime = document.getElementById('sleep-waketime-input')?.value || '07:30';
        const latency = parseInt(document.getElementById('sleep-latency-val')?.value || 15);
        const restfulness = parseInt(document.getElementById('sleep-restfulness-slider')?.value || 4);
        const sleptTogether = document.getElementById('slept-together-val')?.value === 'true';
        const dreamNote = document.getElementById('sleep-dream-notes')?.value || '';

        // Vypočti délku spánku a čas v posteli
        const [bH, bM] = bedtime.split(':').map(Number);
        const [wH, wM] = wakeTime.split(':').map(Number);
        let durationMinutes = (wH * 60 + wM) - (bH * 60 + bM);
        if (durationMinutes < 0) durationMinutes += 24 * 60;

        const timeInBedHours = parseFloat((durationMinutes / 60).toFixed(2));
        const sleepDurationHours = parseFloat(Math.max(1, (durationMinutes - latency) / 60).toFixed(2));
        const efficiency = calculateSleepEfficiency(sleepDurationHours, timeInBedHours);

        const newLog = {
            user_id: state.currentUser?.id,
            date_key: dateKey,
            bedtime,
            wake_time: wakeTime,
            sleep_duration_hours: sleepDurationHours,
            time_in_bed_hours: timeInBedHours,
            sleep_efficiency: efficiency,
            latency_minutes: latency,
            awakenings_count: 0,
            restfulness_score: restfulness,
            slept_together: sleptTogether,
            sleep_tags: activeSleepModalTags,
            dream_note: dreamNote,
            dream_tags: activeDreamModalTags,
            updated_at: new Date().toISOString()
        };

        if (!state.sleepLogs) state.sleepLogs = {};
        state.sleepLogs[dateKey] = newLog;
        saveStateToCache();

        try {
            await safeUpsert('sleep_logs', newLog, 'user_id, date_key');
        } catch (e) {
            console.warn("Sleep save fallback:", e);
        }

        window.closeSleepModal();
        if (typeof window.renderSleepTracker === 'function') {
            window.renderSleepTracker();
        }
        if (typeof window.showNotification === 'function') {
            window.showNotification(`Záznam spánku uložen (${sleepDurationHours}h, ${efficiency}% efektivita)! 🌙✨`, 'success');
        }
    };
}
