import { state } from '../../core/state.js';
import { calculateDailyNutrition } from './macroCalculator.js';
import { renderTDEECoachCard } from './tdeeCoach.js';

/**
 * Gathers 7-day weekly statistics ending on the provided date.
 */
export function getWeeklyNutritionStats(endDateKey, userKey = 'josef') {
    const days = [];
    const endDate = new Date(endDateKey);

    let weekCalories = 0;
    let weekProtein = 0;
    let weekCarbs = 0;
    let weekFats = 0;
    let weekFiber = 0;
    let targetMetDays = 0;

    for (let i = 6; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const dayStats = calculateDailyNutrition(dateKey, userKey);

        const dayName = d.toLocaleDateString('cs-CZ', { weekday: 'short' }).toUpperCase();
        
        days.push({
            dateKey,
            dayName,
            calories: dayStats.totals.calories,
            targetCalories: dayStats.targets.calories,
            protein: dayStats.totals.protein,
            targetProtein: dayStats.targets.protein,
            isProteinMet: dayStats.isProteinGoalMet
        });

        weekCalories += dayStats.totals.calories;
        weekProtein += dayStats.totals.protein;
        weekCarbs += dayStats.totals.carbs;
        weekFats += dayStats.totals.fats;
        weekFiber += dayStats.totals.fiber;
        if (dayStats.isProteinGoalMet) targetMetDays++;
    }

    const avgCalories = Math.round(weekCalories / 7);
    const avgProtein = Math.round((weekProtein / 7) * 10) / 10;
    const avgCarbs = Math.round((weekCarbs / 7) * 10) / 10;
    const avgFats = Math.round((weekFats / 7) * 10) / 10;

    // Macro Calorie Split Percentages
    const proteinCals = weekProtein * 4;
    const carbsCals = weekCarbs * 4;
    const fatsCals = weekFats * 9;
    const macroTotalCals = Math.max(1, proteinCals + carbsCals + fatsCals);

    return {
        days,
        averages: {
            calories: avgCalories,
            protein: avgProtein,
            carbs: avgCarbs,
            fats: avgFats,
            fiber: Math.round((weekFiber / 7) * 10) / 10
        },
        macroSplit: {
            proteinPct: Math.round((proteinCals / macroTotalCals) * 100),
            carbsPct: Math.round((carbsCals / macroTotalCals) * 100),
            fatsPct: Math.round((fatsCals / macroTotalCals) * 100)
        },
        targetMetDays
    };
}

/**
 * Renders the Weekly Analytics & Nutrition Intelligence View.
 */
export function renderWeeklyAnalytics(currentDateKey, userKey = 'josef') {
    const stats = getWeeklyNutritionStats(currentDateKey, userKey);
    const maxCal = Math.max(2600, ...stats.days.map(d => Math.max(d.calories, d.targetCalories)));

    return `
        <div class="space-y-6">
            <!-- TDEE Adaptive Coach Card -->
            ${renderTDEECoachCard(userKey)}

            <!-- Weekly Calorie Adherence Bar Chart -->
            <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-white/5">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm font-bold">
                            <i class="fas fa-chart-column"></i>
                        </span>
                        <div>
                            <h3 class="text-sm font-black text-white uppercase tracking-wider">Týdenní Adherence Kalorií</h3>
                            <p class="text-[10px] text-gray-400">7denní průběh příjmu vs. denní cíl</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-black text-white">${stats.averages.calories} kcal</span>
                        <span class="text-[9px] text-gray-400 block uppercase">Průměr / den</span>
                    </div>
                </div>

                <!-- 7-Day Bar Chart Grid -->
                <div class="h-44 flex items-end justify-between gap-2 pt-4 px-2">
                    ${stats.days.map(d => {
                        const barHeightPct = Math.min(100, Math.round((d.calories / maxCal) * 100));
                        const isOver = d.calories > d.targetCalories + 150;
                        const isUnder = d.calories > 0 && d.calories < d.targetCalories - 300;
                        const barColor = isOver ? '#ed4245' : (isUnder ? '#faa61a' : '#3ba55c');

                        return `
                            <div class="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                <span class="text-[9px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition truncate">${d.calories}</span>
                                <div class="w-full max-w-[28px] bg-black/40 rounded-t-lg overflow-hidden h-full flex items-end p-0.5 border border-white/5">
                                    <div 
                                        class="w-full rounded-t-md transition-all duration-700"
                                        style="height: ${barHeightPct}%; background-color: ${barColor};"
                                    ></div>
                                </div>
                                <span class="text-[10px] font-black text-gray-300 uppercase">${d.dayName}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Macro Distribution Split & Micronutrients Overview -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Macro Split -->
                <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-3">
                    <h4 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <i class="fas fa-pie-chart text-indigo-400"></i> <span>Poměr Kalorického Příjmu</span>
                    </h4>
                    
                    <!-- Multi-colored Combined Bar -->
                    <div class="w-full h-4 rounded-full overflow-hidden flex bg-black/40 p-0.5 border border-white/5">
                        <div style="width: ${stats.macroSplit.proteinPct}%; background-color: #5865F2;" title="Protein ${stats.macroSplit.proteinPct}%"></div>
                        <div style="width: ${stats.macroSplit.carbsPct}%; background-color: #faa61a;" title="Sacharidy ${stats.macroSplit.carbsPct}%"></div>
                        <div style="width: ${stats.macroSplit.fatsPct}%; background-color: #ed4245;" title="Tuky ${stats.macroSplit.fatsPct}%"></div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                        <div class="bg-[#202225] p-2 rounded-xl border border-white/5">
                            <span class="text-[10px] text-[#5865F2] font-bold block uppercase">Bílkoviny</span>
                            <span class="font-black text-white">${stats.macroSplit.proteinPct}%</span>
                            <span class="text-[10px] text-gray-500 block">Ø ${stats.averages.protein}g</span>
                        </div>
                        <div class="bg-[#202225] p-2 rounded-xl border border-white/5">
                            <span class="text-[10px] text-[#faa61a] font-bold block uppercase">Sacharidy</span>
                            <span class="font-black text-white">${stats.macroSplit.carbsPct}%</span>
                            <span class="text-[10px] text-gray-500 block">Ø ${stats.averages.carbs}g</span>
                        </div>
                        <div class="bg-[#202225] p-2 rounded-xl border border-white/5">
                            <span class="text-[10px] text-[#ed4245] font-bold block uppercase">Tuky</span>
                            <span class="font-black text-white">${stats.macroSplit.fatsPct}%</span>
                            <span class="text-[10px] text-gray-500 block">Ø ${stats.averages.fats}g</span>
                        </div>
                    </div>
                </div>

                <!-- Consistency & Gamification Summary -->
                <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-3 flex flex-col justify-between">
                    <div>
                        <h4 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <i class="fas fa-trophy text-[#3ba55c]"></i> <span>Konzistence & Protein Streak</span>
                        </h4>
                        <div class="mt-2 text-2xl font-black text-white">
                            ${stats.targetMetDays} / 7 <span class="text-xs text-gray-400 font-normal">dní splněn protein</span>
                        </div>
                        <p class="text-[11px] text-gray-400 mt-1">
                            ${stats.targetMetDays >= 5 ? 'Vynikající týdenní disciplína! Získáváš týdenní bonus +50 XP.' : 'Každý den se počítá! Zkus se zítra zaměřit na dostatek bílkovin.'}
                        </p>
                    </div>

                    <div class="p-2.5 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <span class="text-gray-400">Průměrná vláknina:</span>
                        <span class="font-extrabold text-[#14b8a6]">${stats.averages.fiber}g / den</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
