import { state } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { renderModal, renderInputGroup } from '../../core/ui.js';
import { showNotification } from '../../core/theme.js';

// ==========================================
// 1RM CALCULATIONS (Epley & Brzycki formulas)
// ==========================================

/**
 * Calculates estimated 1RM from weight and reps.
 * @param {number} weight - Lifted weight in kg
 * @param {number} reps - Completed repetitions
 * @param {string} formula - 'epley' | 'brzycki'
 * @returns {number} Estimated 1RM in kg (rounded to 1 decimal place)
 */
export function calculate1RM(weight, reps, formula = 'epley') {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;

    if (w <= 0 || r <= 0) return 0;
    if (r === 1) return w;

    let result = 0;
    if (formula === 'brzycki') {
        if (r >= 37) return w; // formula limit
        result = w * (36 / (37 - r));
    } else {
        // Epley formula: w * (1 + r / 30)
        result = w * (1 + (r / 30));
    }

    return Math.round(result * 10) / 10;
}

/**
 * Generates a percentage table for a given 1RM.
 */
export function get1RMPercentages(oneRM) {
    const rm = parseFloat(oneRM) || 0;
    if (rm <= 0) return [];

    const table = [
        { pct: 100, reps: '1', weight: rm },
        { pct: 95, reps: '2', weight: rm * 0.95 },
        { pct: 90, reps: '3-4', weight: rm * 0.90 },
        { pct: 85, reps: '5-6', weight: rm * 0.85 },
        { pct: 80, reps: '7-8', weight: rm * 0.80 },
        { pct: 75, reps: '9-10', weight: rm * 0.75 },
        { pct: 70, reps: '11-12', weight: rm * 0.70 },
        { pct: 65, reps: '14-15', weight: rm * 0.65 },
        { pct: 60, reps: '18-20', weight: rm * 0.60 },
        { pct: 50, reps: '25+', weight: rm * 0.50 }
    ];

    return table.map(item => ({
        ...item,
        weight: Math.round(item.weight * 2) / 2 // round to nearest 0.5 kg
    }));
}

// ==========================================
// PLATE CALCULATOR (Kalkulačka kotoučů)
// ==========================================

export const STANDARD_PLATES = [
    { weight: 25, color: '#dc2626', labelColor: '#fff', bgClass: 'bg-red-600', heightPx: 96, borderClass: 'border-red-400' },
    { weight: 20, color: '#2563eb', labelColor: '#fff', bgClass: 'bg-blue-600', heightPx: 96, borderClass: 'border-blue-400' },
    { weight: 15, color: '#eab308', labelColor: '#000', bgClass: 'bg-yellow-500', heightPx: 84, borderClass: 'border-yellow-300' },
    { weight: 10, color: '#16a34a', labelColor: '#fff', bgClass: 'bg-green-600', heightPx: 72, borderClass: 'border-green-400' },
    { weight: 5, color: '#ffffff', labelColor: '#000', bgClass: 'bg-white', heightPx: 60, borderClass: 'border-gray-300' },
    { weight: 2.5, color: '#475569', labelColor: '#fff', bgClass: 'bg-slate-600', heightPx: 50, borderClass: 'border-slate-400' },
    { weight: 1.25, color: '#94a3b8', labelColor: '#000', bgClass: 'bg-slate-300', heightPx: 40, borderClass: 'border-slate-200' }
];

export const BAR_TYPES = [
    { id: 'olympic', name: 'Olympijská osa (20 kg)', weight: 20 },
    { id: 'women', name: 'Dámská osa (15 kg)', weight: 15 },
    { id: 'ez', name: 'EZ osa (10 kg)', weight: 10 },
    { id: 'trap', name: 'Trap Bar (25 kg)', weight: 25 },
    { id: 'smith', name: 'Smith Machine (15 kg)', weight: 15 }
];

/**
 * Calculates plates needed per side for target barbell weight.
 */
export function calculatePlates(targetWeight, barWeight = 20, availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25]) {
    const target = Math.max(0, parseFloat(targetWeight) || 0);
    const bar = parseFloat(barWeight) || 20;

    if (target <= bar) {
        return {
            targetWeight: target,
            barWeight: bar,
            weightPerSide: 0,
            totalLoaded: bar,
            remainder: 0,
            plates: []
        };
    }

    const neededPerSide = (target - bar) / 2;
    let remaining = neededPerSide;
    const platesPerSide = [];

    // Sort available plates descending
    const sortedPlates = [...availablePlates].sort((a, b) => b - a);

    for (const p of sortedPlates) {
        if (remaining >= p) {
            const count = Math.floor(remaining / p);
            if (count > 0) {
                const plateMeta = STANDARD_PLATES.find(sp => sp.weight === p) || {
                    weight: p,
                    color: '#64748b',
                    labelColor: '#fff',
                    bgClass: 'bg-slate-500',
                    heightPx: 50,
                    borderClass: 'border-slate-400'
                };

                platesPerSide.push({
                    weight: p,
                    count,
                    meta: plateMeta
                });
                remaining = Math.round((remaining - (count * p)) * 100) / 100;
            }
        }
    }

    const totalPlatesWeight = platesPerSide.reduce((acc, p) => acc + (p.weight * p.count), 0) * 2;
    const totalLoaded = bar + totalPlatesWeight;

    return {
        targetWeight: target,
        barWeight: bar,
        weightPerSide: neededPerSide,
        totalLoaded,
        remainder: Math.round((target - totalLoaded) * 100) / 100,
        plates: platesPerSide
    };
}

/**
 * Renders HTML visualization of barbell collar with loaded plates.
 */
export function renderPlateBarbellVisual(calcResult) {
    const { plates, barWeight, totalLoaded, remainder } = calcResult;

    if (!plates || plates.length === 0) {
        return `
            <div class="bg-black/30 p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-2 select-none">
                <div class="text-3xl">🏋️‍♂️</div>
                <div class="text-xs font-bold text-gray-300">Pouze prázdná osa (${barWeight} kg)</div>
                <div class="text-[10px] text-gray-500 font-mono">Není potřeba nakládat žádné kotouče.</div>
            </div>
        `;
    }

    // Generate plate bars (left-to-right stacking on sleeve from inner to outer)
    let platesVisualHtml = '';
    plates.forEach(p => {
        for (let i = 0; i < p.count; i++) {
            platesVisualHtml += `
                <div class="relative flex items-center justify-center flex-shrink-0 transition-all transform hover:scale-105" 
                     style="height: ${p.meta.heightPx}px; width: 22px; background-color: ${p.meta.color}; border: 2px solid rgba(255,255,255,0.25); border-radius: 4px; box-shadow: 2px 0 8px rgba(0,0,0,0.5);"
                     title="${p.weight} kg kotouč">
                    <span class="text-[9px] font-black font-mono select-none -rotate-90 whitespace-nowrap" style="color: ${p.meta.labelColor};">
                        ${p.weight}
                    </span>
                </div>
            `;
        }
    });

    // Summary pills
    const platePillsHtml = plates.map(p => `
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold">
            <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${p.meta.color}; border: 1px solid rgba(255,255,255,0.3);"></span>
            <span class="text-white">${p.count}×</span>
            <span class="text-amber-300">${p.weight} kg</span>
            <span class="text-[9px] text-gray-400 font-sans font-normal">(na každé straně)</span>
        </div>
    `).join('');

    return `
        <div class="space-y-4">
            <!-- Graphical Barbell Sleeve -->
            <div class="bg-gradient-to-b from-[#18191c] to-[#121315] p-5 rounded-2xl border border-white/10 shadow-inner flex flex-col items-center justify-center overflow-x-auto custom-scrollbar select-none">
                <div class="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-3">
                    Naložení na jednu stranu osy
                </div>
                
                <div class="flex items-center min-h-[110px] px-4 py-2 relative">
                    <!-- Barbell Center Shaft -->
                    <div class="h-4 w-12 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 rounded-l border border-gray-600 shadow-md flex-shrink-0 flex items-center justify-center text-[7px] font-black text-black font-mono">
                        OSA
                    </div>

                    <!-- Collar / Stopper Ring -->
                    <div class="h-20 w-4 bg-gradient-to-b from-gray-400 via-gray-500 to-gray-700 rounded-sm border border-gray-400 shadow-xl flex-shrink-0"></div>

                    <!-- Sleeve / Bar with Plates stacked -->
                    <div class="flex items-center gap-1 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 h-6 px-1 border-y border-gray-500 relative min-w-[120px]">
                        ${platesVisualHtml}
                        <!-- Barbell Tip -->
                        <div class="h-6 w-3 bg-gradient-to-b from-gray-500 to-gray-700 rounded-r border-r border-gray-600 ml-auto flex-shrink-0"></div>
                    </div>
                </div>

                <div class="mt-3 flex items-center justify-between w-full max-w-sm px-2 text-[10px] text-gray-400 font-mono">
                    <span>Osa: <strong class="text-white">${barWeight} kg</strong></span>
                    <span>Kotouče: <strong class="text-amber-400">+${totalLoaded - barWeight} kg</strong></span>
                    <span>Celkem: <strong class="text-emerald-400">${totalLoaded} kg</strong></span>
                </div>
            </div>

            <!-- List of plates to load -->
            <div class="space-y-1.5">
                <div class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Seznam kotoučů na každou stranu:</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${platePillsHtml}
                </div>
                ${remainder !== 0 ? `
                    <div class="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                        ⚠️ Nelze přesně naložit ${Math.abs(remainder)} kg s dostupnými kotouči.
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Opens the interactive Plate Calculator modal.
 */
export function openPlateCalculatorModal(initialWeight = 60, defaultBarWeight = 20) {
    triggerHaptic('medium');

    const contentHtml = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Cílová váha činky (kg)',
                    id: 'calc-target-weight',
                    type: 'number',
                    placeholder: 'např. 80',
                    value: initialWeight.toString()
                })}

                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Typ osy</label>
                    <select id="calc-bar-weight" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all font-bold">
                        ${BAR_TYPES.map(b => `<option value="${b.weight}" ${b.weight === defaultBarWeight ? 'selected' : ''}>${b.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Preset Weight Buttons -->
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[9px] font-bold text-gray-400 uppercase mr-1">Rychlé váhy:</span>
                ${[40, 50, 60, 70, 80, 90, 100, 110, 120, 140].map(w => `
                    <button type="button" onclick="window.Gym.setPlateCalcWeight(${w})" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#faa61a]/20 text-gray-300 hover:text-[#faa61a] border border-white/5 text-[10px] font-mono font-bold transition">
                        ${w}kg
                    </button>
                `).join('')}
            </div>

            <!-- Visualization Target Container -->
            <div id="plate-calc-visual-container">
                ${renderPlateBarbellVisual(calculatePlates(initialWeight, defaultBarWeight))}
            </div>
        </div>
    `;

    document.getElementById('plate-calc-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'plate-calc-modal',
        title: 'Kalkulačka kotoučů (Plate Calculator) 🧮',
        subtitle: 'Zjisti přesné naložení osy bez počítání z hlavy',
        size: 'lg',
        content: contentHtml,
        onClose: "document.getElementById('plate-calc-modal')?.remove()"
    }));

    const modalEl = document.getElementById('plate-calc-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }

    // Attach listeners
    const weightInput = document.getElementById('calc-target-weight');
    const barSelect = document.getElementById('calc-bar-weight');

    const updateCalc = () => {
        const tw = parseFloat(weightInput?.value) || 0;
        const bw = parseFloat(barSelect?.value) || 20;
        const visualContainer = document.getElementById('plate-calc-visual-container');
        if (visualContainer) {
            visualContainer.innerHTML = renderPlateBarbellVisual(calculatePlates(tw, bw));
        }
    };

    if (weightInput) weightInput.addEventListener('input', updateCalc);
    if (barSelect) barSelect.addEventListener('change', updateCalc);

    window.Gym.setPlateCalcWeight = (weight) => {
        triggerHaptic('light');
        if (weightInput) {
            weightInput.value = weight;
            updateCalc();
        }
    };
}

// ==========================================
// WARM-UP CALCULATOR (Generátor rozcvičky)
// ==========================================

/**
 * Generates an array of warm-up sets based on working weight.
 */
export function generateWarmupSets(workingWeight, workingReps = 8, barWeight = 20) {
    const target = parseFloat(workingWeight) || 0;
    const bar = parseFloat(barWeight) || 20;

    if (target <= bar) {
        return [
            { weight: bar, reps: 10, type: 'W', label: 'Rozcvičení s osou' }
        ];
    }

    const sets = [];

    // Set 1: Empty bar
    sets.push({
        weight: bar,
        reps: 10,
        type: 'W',
        pct: Math.round((bar / target) * 100),
        label: 'Zahřátí (prázdná osa)'
    });

    // Set 2: ~45-50%
    const s2Weight = Math.round(((target * 0.50) / 2.5)) * 2.5;
    if (s2Weight > bar && s2Weight < target * 0.85) {
        sets.push({
            weight: s2Weight,
            reps: 5,
            type: 'W',
            pct: 50,
            label: 'Aktivace svalů (50%)'
        });
    }

    // Set 3: ~70%
    const s3Weight = Math.round(((target * 0.70) / 2.5)) * 2.5;
    if (s3Weight > s2Weight && s3Weight < target * 0.90) {
        sets.push({
            weight: s3Weight,
            reps: 3,
            type: 'W',
            pct: 70,
            label: 'Příprava na zátěž (70%)'
        });
    }

    // Set 4: ~85% (Potentiation / Heavy single for nervous system) if target > 60kg
    const s4Weight = Math.round(((target * 0.85) / 2.5)) * 2.5;
    if (target >= 60 && s4Weight > s3Weight && s4Weight < target) {
        sets.push({
            weight: s4Weight,
            reps: 1,
            type: 'W',
            pct: 85,
            label: 'Nervová aktivace (85%)'
        });
    }

    return sets;
}

/**
 * Opens Warm-up generator modal and allows inserting sets into active workout.
 */
export function openWarmupModal(exIdx, defaultWeight = 80) {
    triggerHaptic('medium');

    const activeW = window.Gym.getActiveWorkout ? window.Gym.getActiveWorkout() : null;
    const exercise = activeW?.exercises?.[exIdx];
    const exName = exercise?.exercise_name || 'Cvik';

    // Find first non-warmup set weight if available
    let currentWorkingWeight = defaultWeight;
    if (exercise?.sets?.length) {
        const workingSet = exercise.sets.find(s => s.type !== 'W' && s.weight > 0);
        if (workingSet) currentWorkingWeight = workingSet.weight;
    }

    const renderSetsPreview = (weight) => {
        const warmupSets = generateWarmupSets(weight);
        return `
            <div class="space-y-2">
                <div class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Navržené rozcvičovací série:</div>
                <div class="space-y-2">
                    ${warmupSets.map((s, idx) => `
                        <div class="flex items-center justify-between p-3 rounded-xl bg-[#202225] border border-amber-500/20">
                            <div class="flex items-center gap-2.5">
                                <span class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-xs flex items-center justify-center border border-amber-500/30">
                                    W${idx + 1}
                                </span>
                                <div>
                                    <div class="text-xs font-bold text-white">${s.label}</div>
                                    <div class="text-[10px] text-gray-400 font-mono">${s.pct ? `${s.pct} % pracovní váhy` : ''}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-black font-mono text-amber-400">${s.weight} kg</div>
                                <div class="text-[10px] font-bold text-gray-300 font-mono">${s.reps} opakování</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    const contentHtml = `
        <div class="space-y-4">
            <div class="bg-black/20 p-3.5 rounded-2xl border border-white/5">
                <div class="text-xs font-bold text-gray-400 uppercase">Cvik:</div>
                <div class="text-sm font-black text-white">${exName}</div>
            </div>

            ${renderInputGroup({
                label: 'Pracovní váha (kg)',
                id: 'warmup-working-weight',
                type: 'number',
                placeholder: 'např. 100',
                value: currentWorkingWeight.toString()
            })}

            <div id="warmup-preview-container">
                ${renderSetsPreview(currentWorkingWeight)}
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('warmup-modal')?.remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.applyWarmupSets(${exIdx})" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-[10px] uppercase tracking-wider transition shadow-lg shadow-amber-500/20">
                🔥 Vložit rozcvičku do tréninku
            </button>
        </div>
    `;

    document.getElementById('warmup-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'warmup-modal',
        title: 'Generátor rozcvičky (Warm-up) 🔥',
        subtitle: 'Předcházej zranění a připrav svaly na těžké série',
        size: 'md',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('warmup-modal')?.remove()"
    }));

    const modalEl = document.getElementById('warmup-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }

    const weightInput = document.getElementById('warmup-working-weight');
    if (weightInput) {
        weightInput.addEventListener('input', () => {
            const w = parseFloat(weightInput.value) || 0;
            const container = document.getElementById('warmup-preview-container');
            if (container) container.innerHTML = renderSetsPreview(w);
        });
    }

    window.Gym.applyWarmupSets = (targetExIdx) => {
        triggerHaptic('success');
        const w = parseFloat(document.getElementById('warmup-working-weight')?.value) || currentWorkingWeight;
        const warmupSets = generateWarmupSets(w);

        const currentActive = window.Gym.getActiveWorkout ? window.Gym.getActiveWorkout() : null;
        if (!currentActive || !currentActive.exercises[targetExIdx]) {
            showNotification('Trénink není aktivní!', 'warning');
            return;
        }

        const ex = currentActive.exercises[targetExIdx];
        
        // Map new warmup sets formatted for active workout
        const newWarmupSetObjects = warmupSets.map(ws => ({
            weight: ws.weight,
            reps: ws.reps,
            completed: false,
            type: 'W'
        }));

        // Filter out any existing warmup sets and prepend new ones before working sets
        const existingWorkingSets = ex.sets.filter(s => s.type !== 'W');
        ex.sets = [...newWarmupSetObjects, ...existingWorkingSets];

        document.getElementById('warmup-modal')?.remove();
        showNotification(`Přidáno ${warmupSets.length} rozcvičovacích sérií! 🔥`, 'success');

        if (window.Gym.renderGym) window.Gym.renderGym();
    };
}

// ==========================================
// PROGRESSIVE OVERLOAD ASSISTANT
// ==========================================

/**
 * Analyzes previous performance for an exercise and suggests progressive overload targets.
 */
export function getExerciseTargetSuggestion(exerciseId, userId) {
    const uid = userId || state.currentUser?.id;
    const logs = (state.gymLogs || []).filter(l => l.user_id === uid);

    // Find the latest completed log that contains this exercise
    for (const log of logs) {
        const loggedEx = (log.exercises || []).find(e => e.exercise_id === exerciseId);
        if (loggedEx && loggedEx.sets && loggedEx.sets.length > 0) {
            const completedWorkingSets = loggedEx.sets.filter(s => s.completed && s.type !== 'W');
            if (completedWorkingSets.length > 0) {
                // Find top set by estimated 1RM
                const bestSet = completedWorkingSets.reduce((best, s) => {
                    const cur1RM = calculate1RM(s.weight, s.reps);
                    const best1RM = calculate1RM(best.weight, best.reps);
                    return cur1RM > best1RM ? s : best;
                }, completedWorkingSets[0]);

                return {
                    lastDate: log.date_key,
                    lastWeight: bestSet.weight,
                    lastReps: bestSet.reps,
                    estimated1RM: calculate1RM(bestSet.weight, bestSet.reps),
                    suggestions: [
                        { type: 'weight', text: `+2.5 kg (${bestSet.weight + 2.5} kg × ${Math.max(1, bestSet.reps - 2)} op.)` },
                        { type: 'reps', text: `+1 op. (${bestSet.weight} kg × ${bestSet.reps + 1} op.)` }
                    ]
                };
            }
        }
    }

    return null;
}
