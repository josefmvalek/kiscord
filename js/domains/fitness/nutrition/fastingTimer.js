import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';

export const FASTING_PRESETS = [
    { id: '16-8', name: '16:8 LeanGains', fastHours: 16, eatHours: 8, desc: 'Klasický a nejoblíbenější režim (16 h půst / 8 h jídlo)' },
    { id: '18-6', name: '18:6 Pokročilý', fastHours: 18, eatHours: 6, desc: 'Kratší jídelní okno pro rychlejší spalování tuku' },
    { id: '20-4', name: '20:4 Warrior', fastHours: 20, eatHours: 4, desc: 'Bojovnická dieta (20 h půst / 4 h okno)' },
    { id: '14-10', name: '14:10 Začátečník', fastHours: 14, eatHours: 10, desc: 'Jemný start do světa přerušovaného hladovění' }
];

/**
 * Gets current fasting state for user.
 */
export function getFastingState(userKey = 'josef') {
    if (!state.fastingState) state.fastingState = {};
    if (!state.fastingState[userKey]) {
        state.fastingState[userKey] = {
            presetId: '16-8',
            isActive: false,
            fastStartTime: null, // ISO string
            fastTargetHours: 16
        };
    }
    return state.fastingState[userKey];
}

/**
 * Calculates current fasting status, elapsed time, remaining time, and progress percentage.
 */
export function calculateFastingProgress(userKey = 'josef') {
    const fState = getFastingState(userKey);
    const preset = FASTING_PRESETS.find(p => p.id === fState.presetId) || FASTING_PRESETS[0];

    if (!fState.isActive || !fState.fastStartTime) {
        return {
            isActive: false,
            preset,
            status: 'eating_window',
            elapsedSeconds: 0,
            targetSeconds: preset.fastHours * 3600,
            remainingSeconds: 0,
            percent: 0,
            formattedElapsed: '00:00:00',
            formattedRemaining: '00:00:00'
        };
    }

    const startMs = new Date(fState.fastStartTime).getTime();
    const nowMs = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const targetSeconds = (fState.fastTargetHours || preset.fastHours) * 3600;
    const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
    const isCompleted = elapsedSeconds >= targetSeconds;

    const percent = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

    return {
        isActive: true,
        preset,
        status: isCompleted ? 'fast_completed' : 'fasting',
        elapsedSeconds,
        targetSeconds,
        remainingSeconds,
        percent,
        isCompleted,
        formattedElapsed: formatSeconds(elapsedSeconds),
        formattedRemaining: formatSeconds(remainingSeconds),
        startDateFormatted: new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetEndTimeFormatted: new Date(startMs + targetSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
}

function formatSeconds(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Starts a new fast.
 */
export function startFast(userKey = 'josef', presetId = '16-8') {
    const fState = getFastingState(userKey);
    const preset = FASTING_PRESETS.find(p => p.id === presetId) || FASTING_PRESETS[0];

    fState.isActive = true;
    fState.presetId = preset.id;
    fState.fastTargetHours = preset.fastHours;
    fState.fastStartTime = new Date().toISOString();

    saveStateToCache();
    triggerHaptic('success');
    showNotification(`Půst zahájen (${preset.name})! Vydrž, tělo regeneruje. ⏳🔥`, 'success');
}

/**
 * Ends active fast.
 */
export function endFast(userKey = 'josef') {
    const fState = getFastingState(userKey);
    fState.isActive = false;
    fState.fastStartTime = null;

    saveStateToCache();
    triggerHaptic('medium');
    showNotification('Půst ukončen! Dobrou chuť k prvnímu jídlu. 🥗✨', 'info');
}

/**
 * Renders the Intermittent Fasting Card component with live animated SVG circular ring.
 */
export function renderFastingCard(userKey = 'josef') {
    const data = calculateFastingProgress(userKey);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - ((data.percent / 100) * circumference);

    return `
        <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-white/5">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-indigo-500/20 text-[#5865F2] flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-stopwatch"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Intermittent Fasting</h3>
                        <p class="text-[10px] text-gray-400">Časovač přerušovaného hladovění • ${data.preset.name}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${data.isActive ? (data.isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40') : 'bg-gray-500/20 text-gray-400'}">
                        ${data.isActive ? (data.isCompleted ? 'Půst Splněn' : 'Půst Aktivní') : 'Jídelní Okno'}
                    </span>
                </div>
            </div>

            <!-- Circular Progress & Timer -->
            <div class="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                <div class="relative flex items-center justify-center w-36 h-36 flex-shrink-0">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="${radius}" stroke="rgba(255, 255, 255, 0.08)" stroke-width="12" fill="transparent" />
                        <circle 
                            cx="80" cy="80" r="${radius}" 
                            stroke="${data.isCompleted ? '#3ba55c' : '#5865F2'}" 
                            stroke-width="12" 
                            stroke-linecap="round" 
                            fill="transparent"
                            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset}; transition: stroke-dashoffset 0.8s ease;"
                        />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                        <span class="text-[9px] font-black uppercase tracking-widest text-gray-400">${data.isActive ? 'Uplynulo' : 'Připraven'}</span>
                        <span class="text-xl font-black text-white tracking-tight leading-tight">${data.isActive ? data.formattedElapsed : '0 h'}</span>
                        <span class="text-[10px] font-bold text-indigo-400">${data.percent}%</span>
                    </div>
                </div>

                <div class="space-y-3 flex-1 w-full text-center sm:text-left">
                    ${data.isActive ? `
                        <div class="grid grid-cols-2 gap-2 text-xs bg-[#202225] p-3 rounded-xl border border-white/5">
                            <div>
                                <span class="text-[10px] text-gray-400 font-bold block uppercase">Zahájení</span>
                                <span class="font-extrabold text-white">${data.startDateFormatted}</span>
                            </div>
                            <div>
                                <span class="text-[10px] text-gray-400 font-bold block uppercase">Cíl (Konec půstu)</span>
                                <span class="font-extrabold text-[#3ba55c]">${data.targetEndTimeFormatted}</span>
                            </div>
                            <div class="col-span-2 pt-1 border-t border-white/5 flex items-center justify-between text-[11px]">
                                <span class="text-gray-400">Zbývá do jídla:</span>
                                <span class="font-black text-indigo-300 font-mono">${data.formattedRemaining}</span>
                            </div>
                        </div>

                        <button 
                            onclick="window.handleEndFast('${userKey}')"
                            class="w-full py-2.5 px-4 bg-rose-500/20 hover:bg-rose-500 border border-rose-500/40 text-rose-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2"
                        >
                            <i class="fas fa-utensils"></i> <span>Ukončit půst</span>
                        </button>
                    ` : `
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Vyber režim půstu:</label>
                            <select 
                                id="fasting-preset-select"
                                class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#5865F2]"
                            >
                                ${FASTING_PRESETS.map(p => `
                                    <option value="${p.id}" ${p.id === data.preset.id ? 'selected' : ''}>${p.name} (${p.desc})</option>
                                `).join('')}
                            </select>

                            <button 
                                onclick="window.handleStartFast('${userKey}')"
                                class="w-full py-2.5 px-4 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-[#5865F2]/20 flex items-center justify-center gap-2 mt-2"
                            >
                                <i class="fas fa-play"></i> <span>Zahájit nový půst</span>
                            </button>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// Global window event bindings
window.handleStartFast = (userKey) => {
    const select = document.getElementById('fasting-preset-select');
    const presetId = select ? select.value : '16-8';
    startFast(userKey, presetId);
    import('./index.js').then(m => m.renderNutrition()).catch(() => {});
};

window.handleEndFast = (userKey) => {
    endFast(userKey);
    import('./index.js').then(m => m.renderNutrition()).catch(() => {});
};
