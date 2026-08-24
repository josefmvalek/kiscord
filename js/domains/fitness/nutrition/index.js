import { state, saveStateToCache } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { isJosef, isKlarka } from '@core/auth.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { calculateDailyNutrition } from './macroCalculator.js';
import { renderMacroDonut, renderMacroBar, renderMealCard } from './components.js';
import { openAddFoodModal } from './modals.js';
import { renderFastingCard } from './fastingTimer.js';
import { renderRecipeBuilder } from './recipeBuilder.js';
import { renderWeeklyAnalytics } from './weeklyAnalytics.js';

let activeSubtab = 'diary'; // 'diary' | 'fasting' | 'recipes' | 'analytics'
let activeDateKey = new Date().toISOString().split('T')[0];
let activeUserKey = isJosef() ? 'josef' : 'klarka';

/**
 * Main render function for #výživa channel.
 */
export function renderNutrition() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    if (!activeUserKey) {
        activeUserKey = isJosef() ? 'josef' : 'klarka';
    }

    const currentLoggedUserKey = isJosef() ? 'josef' : 'klarka';
    const isCurrentLoggedUser = (activeUserKey === currentLoggedUserKey);

    const stats = calculateDailyNutrition(activeDateKey, activeUserKey);
    const isToday = activeDateKey === new Date().toISOString().split('T')[0];
    const displayDate = formatDisplayDate(activeDateKey);

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 md:p-6 space-y-5 animate-in fade-in duration-200">
            <!-- Header Bar with Subtabs & Profile Toggle -->
            <div class="bg-[#2f3136] p-4 rounded-2xl border border-white/5 shadow-lg space-y-3">
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <!-- Date Controls (shown in Diary & Fasting) -->
                    <div class="flex items-center gap-2">
                        <button 
                            onclick="window.changeNutritionDate(-1)" 
                            class="w-9 h-9 rounded-xl bg-[#202225] hover:bg-[#202225]/80 text-gray-300 hover:text-white flex items-center justify-center text-xs transition border border-white/5 shadow-sm"
                            title="Předchozí den"
                        >
                            <i class="fas fa-chevron-left"></i>
                        </button>

                        <div class="px-4 py-1.5 bg-[#202225] rounded-xl border border-white/5 text-center min-w-[140px] shadow-sm">
                            <div class="text-[10px] font-black uppercase tracking-widest text-[#14b8a6]">
                                ${isToday ? 'Dnešní den' : 'Vybraný den'}
                            </div>
                            <div class="text-sm font-extrabold text-white">
                                ${displayDate}
                            </div>
                        </div>

                        <button 
                            onclick="window.changeNutritionDate(1)" 
                            class="w-9 h-9 rounded-xl bg-[#202225] hover:bg-[#202225]/80 text-gray-300 hover:text-white flex items-center justify-center text-xs transition border border-white/5 shadow-sm"
                            title="Následující den"
                        >
                            <i class="fas fa-chevron-right"></i>
                        </button>

                        ${!isToday ? `
                            <button 
                                onclick="window.setNutritionDateToday()" 
                                class="px-3 py-2 rounded-xl bg-[#14b8a6]/20 hover:bg-[#14b8a6] text-[#14b8a6] hover:text-white text-xs font-bold transition border border-[#14b8a6]/30 shadow-sm ml-1"
                            >
                                Dnes
                            </button>
                        ` : ''}
                    </div>

                    <!-- Profile Switcher & Settings -->
                    <div class="flex items-center gap-2">
                        <div class="flex p-1 bg-[#202225] rounded-xl border border-white/5 gap-1">
                            <button 
                                onclick="window.switchNutritionUser('josef')" 
                                class="px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${activeUserKey === 'josef' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                            >
                                <span>🏋️‍♂️ Josef</span>
                            </button>
                            <button 
                                onclick="window.switchNutritionUser('klarka')" 
                                class="px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${activeUserKey === 'klarka' ? 'bg-[#eb459e] text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                            >
                                <span>🌸 Klárka</span>
                            </button>
                        </div>

                        <button 
                            onclick="window.openNutritionTargetsModal && window.openNutritionTargetsModal('${activeUserKey}')" 
                            class="w-9 h-9 rounded-xl bg-[#202225] hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center text-xs transition border border-white/5 shadow-sm"
                            title="Upravit denní cíle"
                        >
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>

                <!-- Subtab Navigation Bar -->
                <div class="grid grid-cols-4 p-1 bg-[#202225] rounded-xl border border-white/5 gap-1 text-xs">
                    <button 
                        onclick="window.switchNutritionSubtab('diary')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'diary' ? 'bg-[#14b8a6] text-white shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-book-open text-xs"></i> <span>Deník</span>
                    </button>
                    <button 
                        onclick="window.switchNutritionSubtab('fasting')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'fasting' ? 'bg-[#5865F2] text-white shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-stopwatch text-xs"></i> <span>Půst (IF)</span>
                    </button>
                    <button 
                        onclick="window.switchNutritionSubtab('recipes')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'recipes' ? 'bg-[#faa61a] text-black shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-blender text-xs"></i> <span>Recepty</span>
                    </button>
                    <button 
                        onclick="window.switchNutritionSubtab('analytics')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'analytics' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-chart-line text-xs"></i> <span>TDEE & Stats</span>
                    </button>
                </div>
            </div>

            <!-- Subtab Content Display -->
            <div id="nutrition-subtab-container" class="space-y-6">
                ${activeSubtab === 'diary' ? renderDiaryView(stats, activeUserKey, isCurrentLoggedUser) : ''}
                ${activeSubtab === 'fasting' ? renderFastingCard(activeUserKey) : ''}
                ${activeSubtab === 'recipes' ? renderRecipeBuilder() : ''}
                ${activeSubtab === 'analytics' ? renderWeeklyAnalytics(activeDateKey, activeUserKey) : ''}
            </div>
        </div>
    `;
}

function renderDiaryView(stats, activeUser, isCurrentLoggedUser) {
    return `
        <!-- Hero Macro Dashboard -->
        <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg">
            <div class="flex flex-col md:flex-row items-center gap-6">
                <!-- Left: Circular Donut -->
                <div class="flex flex-col items-center gap-1">
                    ${renderMacroDonut(stats.totals.calories, stats.targets.calories, stats.remaining.calories)}
                    <div class="text-[11px] font-bold text-gray-400">
                        Cíl: <span class="text-white">${stats.targets.calories} kcal</span>
                    </div>
                </div>

                <!-- Right: 4 Macro Bars -->
                <div class="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${renderMacroBar('Bílkoviny', stats.totals.protein, stats.targets.protein, '#5865F2', '<i class="fas fa-drumstick-bite"></i>')}
                    ${renderMacroBar('Sacharidy', stats.totals.carbs, stats.targets.carbs, '#faa61a', '<i class="fas fa-bread-slice"></i>')}
                    ${renderMacroBar('Tuky', stats.totals.fats, stats.targets.fats, '#ed4245', '<i class="fas fa-bacon"></i>')}
                    ${renderMacroBar('Vláknina', stats.totals.fiber, stats.targets.fiber, '#14b8a6', '<i class="fas fa-seedling"></i>')}
                </div>
            </div>

            ${stats.isProteinGoalMet ? `
                <div class="mt-4 p-2.5 bg-[#3ba55c]/10 border border-[#3ba55c]/30 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[#3ba55c] animate-in fade-in">
                    <i class="fas fa-trophy"></i> <span>Denní cíl bílkovin splněn! Skvělá práce 💪</span>
                </div>
            ` : ''}
        </div>

        <!-- Meals Sections -->
        <div class="space-y-4">
            ${renderMealCard('breakfast', 'Snídaně', '<i class="fas fa-coffee"></i>', stats.meals.breakfast, activeUser, isCurrentLoggedUser)}
            ${renderMealCard('lunch', 'Oběd', '<i class="fas fa-utensils"></i>', stats.meals.lunch, activeUser, isCurrentLoggedUser)}
            ${renderMealCard('dinner', 'Večeře', '<i class="fas fa-moon"></i>', stats.meals.dinner, activeUser, isCurrentLoggedUser)}
            ${renderMealCard('snack', 'Svačiny & Pre-workout', '<i class="fas fa-apple-alt"></i>', stats.meals.snack, activeUser, isCurrentLoggedUser)}
        </div>
    `;
}

function formatDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}. ${m}. ${y}`;
}

/**
 * Global Handlers
 */
window.switchNutritionSubtab = (subtab) => {
    triggerHaptic('light');
    activeSubtab = subtab;
    renderNutrition();
};

window.changeNutritionDate = (offset) => {
    triggerHaptic('light');
    const d = new Date(activeDateKey);
    d.setDate(d.getDate() + offset);
    activeDateKey = d.toISOString().split('T')[0];
    renderNutrition();
};

window.setNutritionDateToday = () => {
    triggerHaptic('medium');
    activeDateKey = new Date().toISOString().split('T')[0];
    renderNutrition();
};

window.switchNutritionUser = (userKey) => {
    triggerHaptic('light');
    activeUserKey = userKey;
    renderNutrition();
};

window.openAddFoodModal = (mealType) => {
    openAddFoodModal(mealType);
};

window.submitQuickFood = async (e) => {
    e.preventDefault();
    triggerHaptic('medium');

    const name = document.getElementById('food-name')?.value?.trim();
    const cals = Number(document.getElementById('food-calories')?.value) || 0;
    const amount = Number(document.getElementById('food-amount')?.value) || null;
    const protein = Number(document.getElementById('food-protein')?.value) || 0;
    const carbs = Number(document.getElementById('food-carbs')?.value) || 0;
    const fats = Number(document.getElementById('food-fats')?.value) || 0;

    if (!name) return;

    const targetUserId = (activeUserKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;
    const newItem = {
        id: 'nutr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        user_id: targetUserId || state.currentUser?.id,
        user_name: activeUserKey,
        date_key: activeDateKey,
        meal_type: window.currentNutritionMealType || 'lunch',
        food_name: name,
        calories: cals,
        protein: protein,
        carbs: carbs,
        fats: fats,
        fiber: 0,
        amount_g: amount,
        created_at: new Date().toISOString()
    };

    if (!state.nutritionLogs) state.nutritionLogs = {};
    if (!state.nutritionLogs[activeDateKey]) state.nutritionLogs[activeDateKey] = [];
    state.nutritionLogs[activeDateKey].push(newItem);

    saveStateToCache();

    window.closeNutritionModal();
    renderNutrition();
    showNotification(`Jídlo „${name}“ (${cals} kcal) bylo zapsáno! 🥗`, 'success');

    // Auto-Loot for nutrition: Award 10 Love Coins when 3+ meals logged today
    const todayStr = new Date().toISOString().split('T')[0];
    if (activeDateKey === todayStr) {
        const todayMeals = state.nutritionLogs[todayStr] || [];
        if (todayMeals.length >= 3 && state.nutritionCoinAwardedDate !== todayStr) {
            state.nutritionCoinAwardedDate = todayStr;
            import('@core/state.js').then(({ awardLoveCoinsToCurrentUser }) => {
                awardLoveCoinsToCurrentUser(10, 'Denní nutriční plán splněn! 🥗🥑');
            });
            import('@core/sound.js').then(s => s.playSuccessChime?.());
            import('@core/utils.js').then(u => u.triggerConfetti?.());
        }
    }

    try {
        await supabase.from('nutrition_logs').insert([newItem]);
    } catch (err) {
        console.warn('[Nutrition] Offline / error syncing log:', err);
    }
};


window.deleteNutritionItem = async (itemId) => {
    triggerHaptic('medium');

    if (!state.nutritionLogs?.[activeDateKey]) return;
    state.nutritionLogs[activeDateKey] = state.nutritionLogs[activeDateKey].filter(i => i.id !== itemId);

    saveStateToCache();
    renderNutrition();
    showNotification('Položka byla smazána.', 'info');

    try {
        await supabase.from('nutrition_logs').delete().eq('id', itemId);
    } catch (err) {
        console.warn('[Nutrition] Delete sync error:', err);
    }
};

window.copyPartnerMealItem = async (itemId) => {
    triggerHaptic('medium');

    const logs = state.nutritionLogs?.[activeDateKey] || [];
    const sourceItem = logs.find(i => i.id === itemId);
    if (!sourceItem) return;

    const currentLoggedUserKey = isJosef() ? 'josef' : 'klarka';
    const myUserId = (currentLoggedUserKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;

    const copiedItem = {
        ...sourceItem,
        id: 'nutr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        user_id: myUserId || state.currentUser?.id,
        user_name: currentLoggedUserKey,
        created_at: new Date().toISOString()
    };

    if (!state.nutritionLogs[activeDateKey]) state.nutritionLogs[activeDateKey] = [];
    state.nutritionLogs[activeDateKey].push(copiedItem);

    saveStateToCache();
    showNotification(`Zkopírováno „${sourceItem.food_name}“ do tvého deníku! 📋✨`, 'success');

    activeUserKey = currentLoggedUserKey;
    renderNutrition();

    try {
        await supabase.from('nutrition_logs').insert([copiedItem]);
    } catch (err) {
        console.warn('[Nutrition] Sync copy error:', err);
    }
};

window.copyPartnerFullMeal = async (mealType) => {
    triggerHaptic('medium');

    const logs = state.nutritionLogs?.[activeDateKey] || [];
    const targetPartnerId = (activeUserKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;

    const partnerItems = logs.filter(item => {
        const isMatchUser = item.user_id ? item.user_id === targetPartnerId : item.user_name === activeUserKey;
        return isMatchUser && item.meal_type === mealType;
    });

    if (partnerItems.length === 0) return;

    const currentLoggedUserKey = isJosef() ? 'josef' : 'klarka';
    const myUserId = (currentLoggedUserKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;

    const copiedItems = partnerItems.map(item => ({
        ...item,
        id: 'nutr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        user_id: myUserId || state.currentUser?.id,
        user_name: currentLoggedUserKey,
        created_at: new Date().toISOString()
    }));

    copiedItems.forEach(item => state.nutritionLogs[activeDateKey].push(item));
    saveStateToCache();

    showNotification(`Zkopírováno ${copiedItems.length} položek z jídla partnera! 🍽️✨`, 'success');

    activeUserKey = currentLoggedUserKey;
    renderNutrition();

    try {
        await supabase.from('nutrition_logs').insert(copiedItems);
    } catch (err) {
        console.warn('[Nutrition] Sync copy batch error:', err);
    }
};
