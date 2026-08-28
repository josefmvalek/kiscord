import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';

/**
 * Calculates smoothed weight trend using Exponential Moving Average (EMA).
 * Filters out short-term water weight and sodium fluctuations.
 * @param {Array<{date: string, weight: number}>} weightEntries
 * @param {number} alpha - Smoothing factor (default 0.15)
 * @returns {Array<{date: string, weight: number, smoothed: number}>}
 */
export function calculateSmoothedWeightTrend(weightEntries, alpha = 0.15) {
    if (!weightEntries || weightEntries.length === 0) return [];
    
    // Sort chronologically
    const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
    let currentEma = sorted[0].weight;

    return sorted.map(entry => {
        currentEma = (entry.weight * alpha) + (currentEma * (1 - alpha));
        return {
            date: entry.date,
            weight: entry.weight,
            smoothed: Math.round(currentEma * 100) / 100
        };
    });
}

/**
 * Calculates adaptive Total Daily Energy Expenditure (TDEE).
 * Based on the mathematical energy balance equation:
 * Energy Deficit/Surplus = (Weight delta in kg * 7700 kcal)
 * Actual TDEE = Avg Daily Calories - (Delta Weight * 7700 / Days)
 */
export function calculateAdaptiveTDEE(userKey = 'josef', daysBack = 14) {
    const targetUserId = (userKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;
    
    // 1. Gather weight measurements
    const rawWeights = (state.gymBodyMeasurements || [])
        .filter(m => (!m.user_id || m.user_id === targetUserId) && m.weight)
        .map(m => ({ date: m.date_key || m.date, weight: Number(m.weight) }));

    // Fallback baseline weight if no measurements exist
    const defaultWeight = userKey === 'josef' ? 82 : 62;
    const currentWeight = rawWeights.length > 0 ? rawWeights[rawWeights.length - 1].weight : defaultWeight;

    // 2. Gather calorie intake over past N days
    const today = new Date();
    let totalCalories = 0;
    let loggedDaysCount = 0;

    for (let i = 0; i < daysBack; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];

        const dayLogs = (state.nutritionLogs?.[dateKey] || []).filter(item => {
            if (item.user_id && targetUserId) return item.user_id === targetUserId;
            if (item.user_name) return item.user_name.toLowerCase() === userKey.toLowerCase();
            return true;
        });

        if (dayLogs.length > 0) {
            const dayCals = dayLogs.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
            totalCalories += dayCals;
            loggedDaysCount++;
        }
    }

    const avgDailyCalories = loggedDaysCount > 0 ? Math.round(totalCalories / loggedDaysCount) : (userKey === 'josef' ? 2500 : 1900);

    // 3. Calculate weight delta if multiple measurements exist
    let calculatedTdee = avgDailyCalories;
    const smoothed = calculateSmoothedWeightTrend(rawWeights);

    if (smoothed.length >= 2 && loggedDaysCount >= 5) {
        const oldest = smoothed[0];
        const newest = smoothed[smoothed.length - 1];
        const daysDiff = Math.max(1, (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 3600 * 24));
        const deltaKg = newest.smoothed - oldest.smoothed;
        
        // 7700 kcal per 1 kg of tissue change
        const dailyCalorieDelta = (deltaKg * 7700) / daysDiff;
        calculatedTdee = Math.round(avgDailyCalories - dailyCalorieDelta);
    } else {
        // Fallback formula: Katch-McArdle / Mifflin-St Jeor approximation
        calculatedTdee = userKey === 'josef' ? Math.round(currentWeight * 31) : Math.round(currentWeight * 29);
    }

    // Safety bounds
    calculatedTdee = Math.max(1400, Math.min(4200, calculatedTdee));

    return {
        userKey,
        currentWeight,
        loggedDaysCount,
        avgDailyCalories,
        estimatedTDEE: calculatedTdee,
        programs: {
            cut: generateMacroProgram(calculatedTdee, currentWeight, 'cut'),
            maintain: generateMacroProgram(calculatedTdee, currentWeight, 'maintain'),
            bulk: generateMacroProgram(calculatedTdee, currentWeight, 'bulk')
        }
    };
}

/**
 * Generates optimal macro split for a specific goal.
 */
function generateMacroProgram(tdee, weightKg, goal = 'cut') {
    let targetCalories = tdee;
    let proteinPerKg = 2.0;
    let fatPerKg = 0.9;

    if (goal === 'cut') {
        targetCalories = Math.round(tdee * 0.80); // 20% deficit
        proteinPerKg = 2.2; // High protein to preserve lean muscle mass
        fatPerKg = 0.8;
    } else if (goal === 'bulk') {
        targetCalories = Math.round(tdee * 1.12); // 12% surplus
        proteinPerKg = 2.0;
        fatPerKg = 1.0;
    } else {
        // maintain
        targetCalories = tdee;
        proteinPerKg = 1.9;
        fatPerKg = 0.9;
    }

    const proteinGrams = Math.round(weightKg * proteinPerKg);
    const fatGrams = Math.round(weightKg * fatPerKg);
    
    // Remaining calories for Carbohydrates (4 kcal/g)
    const caloriesFromProteinAndFat = (proteinGrams * 4) + (fatGrams * 9);
    const remainingCaloriesForCarbs = Math.max(0, targetCalories - caloriesFromProteinAndFat);
    const carbsGrams = Math.round(remainingCaloriesForCarbs / 4);

    return {
        goal,
        calories: targetCalories,
        protein: proteinGrams,
        carbs: carbsGrams,
        fats: fatGrams,
        fiber: Math.round(targetCalories / 1000 * 14) // Standard RDA ~14g per 1000 kcal
    };
}

/**
 * Renders the Adaptive TDEE Coach card with recommendations and 1-click apply.
 */
export function renderTDEECoachCard(userKey = 'josef') {
    const data = calculateAdaptiveTDEE(userKey);
    const currentTargets = state.nutritionTargets?.[userKey] || { calories: 2500, protein: 160, carbs: 290, fats: 75 };

    return `
        <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
            <!-- Header -->
            <div class="flex items-center justify-between pb-2 border-b border-white/5">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#3ba55c] flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-brain"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Adaptivní TDEE Kouč</h3>
                        <p class="text-[10px] text-gray-400">Dynamický výpočet spalování a doporučená makra • ${userKey === 'josef' ? 'Josef' : 'Klárka'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-xs font-black text-[#3ba55c]">${data.estimatedTDEE} kcal</span>
                    <span class="text-[9px] text-gray-400 block uppercase">Denní výdej (TDEE)</span>
                </div>
            </div>

            <!-- Program Options -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Cut -->
                <div class="bg-[#202225] p-3.5 rounded-xl border border-rose-500/20 space-y-2.5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-black text-rose-400 uppercase tracking-wider">✂️ Rýsování (Cut)</span>
                            <span class="text-[10px] font-bold text-gray-400">-20 %</span>
                        </div>
                        <div class="text-xl font-black text-white mt-1">${data.programs.cut.calories} <span class="text-xs text-gray-400 font-normal">kcal</span></div>
                        <div class="text-[10px] text-gray-400 space-y-0.5 mt-2">
                            <div>🍗 Protein: <strong class="text-white">${data.programs.cut.protein}g</strong></div>
                            <div>🍞 Sacharidy: <strong class="text-white">${data.programs.cut.carbs}g</strong></div>
                            <div>🥓 Tuky: <strong class="text-white">${data.programs.cut.fats}g</strong></div>
                        </div>
                    </div>
                    <button 
                        onclick="window.applyTDEEProgram('${userKey}', 'cut')"
                        class="w-full py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                        <span>Nastavit Rýsování</span>
                    </button>
                </div>

                <!-- Maintain -->
                <div class="bg-[#202225] p-3.5 rounded-xl border border-indigo-500/20 space-y-2.5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-black text-indigo-400 uppercase tracking-wider">⚖️ Udržování</span>
                            <span class="text-[10px] font-bold text-gray-400">0 %</span>
                        </div>
                        <div class="text-xl font-black text-white mt-1">${data.programs.maintain.calories} <span class="text-xs text-gray-400 font-normal">kcal</span></div>
                        <div class="text-[10px] text-gray-400 space-y-0.5 mt-2">
                            <div>🍗 Protein: <strong class="text-white">${data.programs.maintain.protein}g</strong></div>
                            <div>🍞 Sacharidy: <strong class="text-white">${data.programs.maintain.carbs}g</strong></div>
                            <div>🥓 Tuky: <strong class="text-white">${data.programs.maintain.fats}g</strong></div>
                        </div>
                    </div>
                    <button 
                        onclick="window.applyTDEEProgram('${userKey}', 'maintain')"
                        class="w-full py-1.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                        <span>Nastavit Udržování</span>
                    </button>
                </div>

                <!-- Bulk -->
                <div class="bg-[#202225] p-3.5 rounded-xl border border-emerald-500/20 space-y-2.5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-black text-emerald-400 uppercase tracking-wider">🏋️‍♂️ Objem (Bulk)</span>
                            <span class="text-[10px] font-bold text-gray-400">+12 %</span>
                        </div>
                        <div class="text-xl font-black text-white mt-1">${data.programs.bulk.calories} <span class="text-xs text-gray-400 font-normal">kcal</span></div>
                        <div class="text-[10px] text-gray-400 space-y-0.5 mt-2">
                            <div>🍗 Protein: <strong class="text-white">${data.programs.bulk.protein}g</strong></div>
                            <div>🍞 Sacharidy: <strong class="text-white">${data.programs.bulk.carbs}g</strong></div>
                            <div>🥓 Tuky: <strong class="text-white">${data.programs.bulk.fats}g</strong></div>
                        </div>
                    </div>
                    <button 
                        onclick="window.applyTDEEProgram('${userKey}', 'bulk')"
                        class="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                        <span>Nastavit Objem</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Global window event bindings
window.applyTDEEProgram = (userKey, programType) => {
    const data = calculateAdaptiveTDEE(userKey);
    const prog = data.programs[programType];
    if (!prog) return;

    if (!state.nutritionTargets) state.nutritionTargets = {};
    state.nutritionTargets[userKey] = {
        calories: prog.calories,
        protein: prog.protein,
        carbs: prog.carbs,
        fats: prog.fats,
        fiber: prog.fiber
    };

    saveStateToCache();
    triggerHaptic('success');
    showNotification(`Nastaven nutriční program: ${prog.goal.toUpperCase()} (${prog.calories} kcal)! 🎯✨`, 'success');

    import('./index.js').then(m => m.renderNutrition()).catch(() => {});
};
