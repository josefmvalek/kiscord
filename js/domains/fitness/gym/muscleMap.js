import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { getMyName, getPartnerName, getMyEmoji, getPartnerEmoji } from './shared.js';

// =====================================================================
// ANATOMICAL MUSCLE HEAT MAP ENGINE
// =====================================================================

let currentHeatmapTimeframe = 30; // default 30 days
let selectedMuscleKey = null;

export function setHeatmapTimeframe(days, renderFn) {
    triggerHaptic('light');
    currentHeatmapTimeframe = days;
    selectedMuscleKey = null;
    if (renderFn) renderFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

export function selectMuscleGroup(muscleKey, renderFn) {
    triggerHaptic('medium');
    selectedMuscleKey = selectedMuscleKey === muscleKey ? null : muscleKey;
    if (renderFn) renderFn();
    else if (window.Gym?.renderGym) window.Gym.renderGym();
}

/**
 * Aggregates training volume per anatomical muscle group.
 * @param {string} userId 
 * @param {number} days - 0 for all time
 */
export function calculateMuscleHeatmap(userId, days = 30) {
    const logs = state.gymLogs || [];
    const targetUserId = userId || state.currentUser?.id;
    const cutoffDate = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0);

    const relevantLogs = logs.filter(l => {
        if (l.user_id !== targetUserId) return false;
        const logDate = new Date(l.logged_at || l.date_key);
        return logDate >= cutoffDate;
    });

    const muscleGroups = {
        chest: { name: 'Hrudník', emoji: '🦍', sets: 0, volumeKg: 0, exercises: {} },
        back: { name: 'Záda', emoji: '🦅', sets: 0, volumeKg: 0, exercises: {} },
        shoulders: { name: 'Ramena', emoji: '🥥', sets: 0, volumeKg: 0, exercises: {} },
        biceps: { name: 'Biceps', emoji: '💪', sets: 0, volumeKg: 0, exercises: {} },
        triceps: { name: 'Triceps', emoji: '🦾', sets: 0, volumeKg: 0, exercises: {} },
        abs: { name: 'Břicho', emoji: '🍫', sets: 0, volumeKg: 0, exercises: {} },
        quads: { name: 'Přední stehna (Kvadricepsy)', emoji: '🍗', sets: 0, volumeKg: 0, exercises: {} },
        glutes_hamstrings: { name: 'Hýždě & Zadní stehna', emoji: '🍑', sets: 0, volumeKg: 0, exercises: {} },
        calves: { name: 'Lýtka', emoji: '🦵', sets: 0, volumeKg: 0, exercises: {} }
    };

    let totalCompletedSets = 0;

    relevantLogs.forEach(log => {
        (log.exercises || []).forEach(ex => {
            const cat = (ex.category || '').toLowerCase();
            const exName = ex.name || ex.exercise_name || 'Cvik';

            let targetMuscles = [];
            if (cat.includes('hrud')) {
                targetMuscles.push('chest', 'triceps');
            } else if (cat.includes('zád')) {
                targetMuscles.push('back', 'biceps');
            } else if (cat.includes('ramen')) {
                targetMuscles.push('shoulders', 'triceps');
            } else if (cat.includes('ruc') || cat.includes('paž')) {
                if (exName.toLowerCase().includes('biceps') || exName.toLowerCase().includes('zdvih')) {
                    targetMuscles.push('biceps');
                } else if (exName.toLowerCase().includes('triceps') || exName.toLowerCase().includes('tlak') || exName.toLowerCase().includes('klikov')) {
                    targetMuscles.push('triceps');
                } else {
                    targetMuscles.push('biceps', 'triceps');
                }
            } else if (cat.includes('noh')) {
                if (exName.toLowerCase().includes('dřep') || exName.toLowerCase().includes('předkop') || exName.toLowerCase().includes('leg press')) {
                    targetMuscles.push('quads', 'glutes_hamstrings');
                } else if (exName.toLowerCase().includes('mrtvý') || exName.toLowerCase().includes('zakop') || exName.toLowerCase().includes('hip')) {
                    targetMuscles.push('glutes_hamstrings');
                } else if (exName.toLowerCase().includes('výpon') || exName.toLowerCase().includes('lýtk')) {
                    targetMuscles.push('calves');
                } else {
                    targetMuscles.push('quads', 'glutes_hamstrings', 'calves');
                }
            } else if (cat.includes('břich') || cat.includes('core')) {
                targetMuscles.push('abs');
            } else {
                targetMuscles.push('chest'); // default fallback
            }

            const completedSets = (ex.sets || []).filter(s => s.completed && s.type !== 'W');
            const setsCount = completedSets.length;
            const exVolume = completedSets.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0);

            totalCompletedSets += setsCount;

            targetMuscles.forEach(mKey => {
                if (muscleGroups[mKey]) {
                    muscleGroups[mKey].sets += setsCount;
                    muscleGroups[mKey].volumeKg += exVolume;
                    if (!muscleGroups[mKey].exercises[exName]) {
                        muscleGroups[mKey].exercises[exName] = { sets: 0, volumeKg: 0 };
                    }
                    muscleGroups[mKey].exercises[exName].sets += setsCount;
                    muscleGroups[mKey].exercises[exName].volumeKg += exVolume;
                }
            });
        });
    });

    return {
        timeframeDays: days,
        totalSets: totalCompletedSets,
        muscles: muscleGroups
    };
}

/**
 * Returns color according to intensity / set count.
 */
function getIntensityColor(sets) {
    if (sets === 0) return 'rgba(255, 255, 255, 0.08)';
    if (sets <= 4) return '#3b82f6'; // Light blue
    if (sets <= 10) return '#10b981'; // Emerald
    if (sets <= 18) return '#f59e0b'; // Amber
    return '#ef4444'; // Red peak
}

/**
 * Renders the Muscle Heat Map Component.
 */
export function renderMuscleHeatMapCard(userId) {
    const data = calculateMuscleHeatmap(userId, currentHeatmapTimeframe);
    const m = data.muscles;

    const chestColor = getIntensityColor(m.chest.sets);
    const shouldersColor = getIntensityColor(m.shoulders.sets);
    const bicepsColor = getIntensityColor(m.biceps.sets);
    const absColor = getIntensityColor(m.abs.sets);
    const quadsColor = getIntensityColor(m.quads.sets);
    const backColor = getIntensityColor(m.back.sets);
    const tricepsColor = getIntensityColor(m.triceps.sets);
    const glutesColor = getIntensityColor(m.glutes_hamstrings.sets);
    const calvesColor = getIntensityColor(m.calves.sets);

    const activeInfo = selectedMuscleKey && m[selectedMuscleKey] ? m[selectedMuscleKey] : null;

    return `
        <div class="glass-card bg-black/25 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 select-none">
            <!-- Header & Timeframe Switcher -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <span class="text-[9px] font-black uppercase text-[#faa61a] tracking-widest block font-mono">Anatomická Analýza</span>
                    <h3 class="text-sm font-black text-white uppercase tracking-tight leading-none mt-0.5">Svalová Heat Mapa</h3>
                </div>

                <!-- Timeframe pills -->
                <div class="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[10px] font-mono">
                    <button onclick="window.Gym.setHeatmapTimeframe(7)" class="px-2.5 py-1 rounded-lg font-bold transition ${currentHeatmapTimeframe === 7 ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}">7d</button>
                    <button onclick="window.Gym.setHeatmapTimeframe(30)" class="px-2.5 py-1 rounded-lg font-bold transition ${currentHeatmapTimeframe === 30 ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}">30d</button>
                    <button onclick="window.Gym.setHeatmapTimeframe(90)" class="px-2.5 py-1 rounded-lg font-bold transition ${currentHeatmapTimeframe === 90 ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}">90d</button>
                    <button onclick="window.Gym.setHeatmapTimeframe(0)" class="px-2.5 py-1 rounded-lg font-bold transition ${currentHeatmapTimeframe === 0 ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}">Vše</button>
                </div>
            </div>

            <!-- Heat Map Visual (Front & Back Figures) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-items-center py-2">
                <!-- FRONT VIEW -->
                <div class="flex flex-col items-center gap-1.5 w-full max-w-[200px]">
                    <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 font-mono">Přední Pohled</span>
                    <svg viewBox="0 0 160 260" class="w-full h-auto max-h-56 filter drop-shadow-md cursor-pointer">
                        <!-- Head -->
                        <ellipse cx="80" cy="22" rx="14" ry="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
                        <!-- Neck -->
                        <rect x="74" y="38" width="12" height="10" rx="3" fill="rgba(255,255,255,0.08)" />

                        <!-- Shoulders (Left & Right) -->
                        <path onclick="window.Gym.selectMuscleGroup('shoulders')" d="M 52,50 C 44,52 38,62 42,70 C 46,75 52,70 56,60 Z" fill="${shouldersColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('shoulders')" d="M 108,50 C 116,52 122,62 118,70 C 114,75 108,70 104,60 Z" fill="${shouldersColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Chest (Hrudník) -->
                        <path onclick="window.Gym.selectMuscleGroup('chest')" d="M 57,50 L 78,50 L 78,74 L 56,72 C 54,62 55,54 57,50 Z" fill="${chestColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('chest')" d="M 103,50 L 82,50 L 82,74 L 104,72 C 106,62 105,54 103,50 Z" fill="${chestColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Biceps (Arms) -->
                        <path onclick="window.Gym.selectMuscleGroup('biceps')" d="M 40,73 C 36,80 34,92 38,102 C 43,103 48,94 46,80 Z" fill="${bicepsColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('biceps')" d="M 120,73 C 124,80 126,92 122,102 C 117,103 112,94 114,80 Z" fill="${bicepsColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Forearms -->
                        <path d="M 36,104 C 32,115 30,130 33,142 C 37,143 43,136 42,118 Z" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
                        <path d="M 124,104 C 128,115 130,130 127,142 C 123,143 117,136 118,118 Z" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />

                        <!-- Abs (Břicho) -->
                        <path onclick="window.Gym.selectMuscleGroup('abs')" d="M 64,78 L 96,78 L 94,118 L 66,118 Z" fill="${absColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Quads (Stehna) -->
                        <path onclick="window.Gym.selectMuscleGroup('quads')" d="M 60,126 C 54,142 52,175 58,195 C 68,198 76,192 76,145 C 76,132 72,126 60,126 Z" fill="${quadsColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('quads')" d="M 100,126 C 106,142 108,175 102,195 C 92,198 84,192 84,145 C 84,132 88,126 100,126 Z" fill="${quadsColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Calves (Front) -->
                        <path onclick="window.Gym.selectMuscleGroup('calves')" d="M 59,202 C 54,215 54,235 60,248 C 66,249 72,242 71,215 C 70,205 66,202 59,202 Z" fill="${calvesColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('calves')" d="M 101,202 C 106,215 106,235 100,248 C 94,249 88,242 89,215 C 90,205 94,202 101,202 Z" fill="${calvesColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                    </svg>
                </div>

                <!-- BACK VIEW -->
                <div class="flex flex-col items-center gap-1.5 w-full max-w-[200px]">
                    <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 font-mono">Zadní Pohled</span>
                    <svg viewBox="0 0 160 260" class="w-full h-auto max-h-56 filter drop-shadow-md cursor-pointer">
                        <!-- Head -->
                        <ellipse cx="80" cy="22" rx="14" ry="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
                        <!-- Traps / Neck -->
                        <path onclick="window.Gym.selectMuscleGroup('back')" d="M 70,38 L 90,38 L 102,52 L 58,52 Z" fill="${backColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" />

                        <!-- Rear Delts -->
                        <path onclick="window.Gym.selectMuscleGroup('shoulders')" d="M 54,50 C 46,52 40,62 44,70 C 48,74 54,70 58,58 Z" fill="${shouldersColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                        <path onclick="window.Gym.selectMuscleGroup('shoulders')" d="M 106,50 C 114,52 120,62 116,70 C 112,74 106,70 102,58 Z" fill="${shouldersColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" />

                        <!-- Back (Záda / Lats) -->
                        <path onclick="window.Gym.selectMuscleGroup('back')" d="M 58,54 L 102,54 L 94,116 L 66,116 Z" fill="${backColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Triceps (Back Arms) -->
                        <path onclick="window.Gym.selectMuscleGroup('triceps')" d="M 42,72 C 38,80 36,94 40,104 C 45,103 49,94 47,80 Z" fill="${tricepsColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('triceps')" d="M 118,72 C 122,80 124,94 120,104 C 115,103 111,94 113,80 Z" fill="${tricepsColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Glutes (Hýždě) -->
                        <path onclick="window.Gym.selectMuscleGroup('glutes_hamstrings')" d="M 64,120 L 96,120 C 104,136 100,154 82,154 L 78,154 C 60,154 56,136 64,120 Z" fill="${glutesColor}" stroke="rgba(255,255,255,0.4)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Hamstrings (Zadní stehna) -->
                        <path onclick="window.Gym.selectMuscleGroup('glutes_hamstrings')" d="M 62,156 C 56,168 56,185 60,195 C 70,198 76,192 76,160 Z" fill="${glutesColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('glutes_hamstrings')" d="M 98,156 C 104,168 104,185 100,195 C 90,198 84,192 84,160 Z" fill="${glutesColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />

                        <!-- Calves (Back) -->
                        <path onclick="window.Gym.selectMuscleGroup('calves')" d="M 59,202 C 53,215 54,235 60,248 C 68,249 74,242 71,215 Z" fill="${calvesColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                        <path onclick="window.Gym.selectMuscleGroup('calves')" d="M 101,202 C 107,215 106,235 100,248 C 92,249 86,242 89,215 Z" fill="${calvesColor}" stroke="rgba(255,255,255,0.3)" stroke-width="1" class="transition-colors duration-300 hover:opacity-80" />
                    </svg>
                </div>
            </div>

            <!-- Heat Map Legend -->
            <div class="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[9px] font-mono text-gray-400">
                <span>Intenzita:</span>
                <div class="flex items-center gap-1.5">
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-white/10"></span> 0</span>
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-[#3b82f6]"></span> 1-4</span>
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-[#10b981]"></span> 5-10</span>
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-[#f59e0b]"></span> 11-18</span>
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-[#ef4444]"></span> 19+</span>
                </div>
            </div>

            <!-- Selected Muscle Detail Card -->
            ${activeInfo ? `
                <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 animate-fade-in space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">${activeInfo.emoji}</span>
                            <div>
                                <h4 class="text-xs font-black text-white">${activeInfo.name}</h4>
                                <span class="text-[9px] font-mono text-amber-300 font-bold">${activeInfo.sets} sérií • celkem ${Math.round(activeInfo.volumeKg).toLocaleString('cs-CZ')} kg</span>
                            </div>
                        </div>
                        <button onclick="window.Gym.selectMuscleGroup(null)" class="text-gray-400 hover:text-white text-xs px-2 py-1">✕</button>
                    </div>

                    ${Object.keys(activeInfo.exercises).length > 0 ? `
                        <div class="space-y-1 text-[10px] font-mono border-t border-white/5 pt-2">
                            ${Object.entries(activeInfo.exercises).map(([name, stat]) => `
                                <div class="flex justify-between items-center text-gray-300">
                                    <span class="truncate pr-2">${name}</span>
                                    <span class="font-bold text-white flex-shrink-0">${stat.sets} sérií</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-[10px] text-gray-400 italic">V tomto období žádný trénink pro tuto svalovou partii.</p>
                    `}
                </div>
            ` : `
                <p class="text-[10px] text-gray-500 font-mono text-center">💡 Klepni na jakýkoliv sval na postavě pro zobrazení detailu a cviků.</p>
            `}
        </div>
    `;
}
