import { state } from '@core/state.js';

/**
 * Calculates total nutrition statistics for a specific user and date.
 * @param {string} dateKey - 'YYYY-MM-DD'
 * @param {string} userKey - 'josef' | 'klarka'
 * @returns {object} Calculated daily macro breakdown
 */
export function calculateDailyNutrition(dateKey, userKey = 'josef') {
    const logs = state.nutritionLogs?.[dateKey] || [];
    const targetUserId = (userKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;
    
    // Filter items belonging to the selected user (fallback to match username if user_id is pending)
    const userLogs = logs.filter(item => {
        if (item.user_id && targetUserId) return item.user_id === targetUserId;
        if (item.user_name) return item.user_name.toLowerCase() === userKey.toLowerCase();
        return true;
    });

    const totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        meals: {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
        }
    };

    userLogs.forEach(item => {
        const cal = Number(item.calories) || 0;
        const p = Number(item.protein) || 0;
        const c = Number(item.carbs) || 0;
        const f = Number(item.fats) || 0;
        const fib = Number(item.fiber) || 0;

        totals.calories += cal;
        totals.protein += p;
        totals.carbs += c;
        totals.fats += f;
        totals.fiber += fib;

        const meal = (item.meal_type || 'snack').toLowerCase();
        if (!totals.meals[meal]) totals.meals[meal] = [];
        totals.meals[meal].push(item);
    });

    const userTargets = state.nutritionTargets?.[userKey] || {
        calories: userKey === 'josef' ? 2500 : 1900,
        protein: userKey === 'josef' ? 160 : 110,
        carbs: userKey === 'josef' ? 290 : 220,
        fats: userKey === 'josef' ? 75 : 60,
        fiber: userKey === 'josef' ? 30 : 25
    };

    return {
        dateKey,
        userKey,
        totals: {
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fats: Math.round(totals.fats * 10) / 10,
            fiber: Math.round(totals.fiber * 10) / 10
        },
        targets: userTargets,
        meals: totals.meals,
        remaining: {
            calories: Math.round(userTargets.calories - totals.calories),
            protein: Math.round((userTargets.protein - totals.protein) * 10) / 10,
            carbs: Math.round((userTargets.carbs - totals.carbs) * 10) / 10,
            fats: Math.round((userTargets.fats - totals.fats) * 10) / 10,
            fiber: Math.round((userTargets.fiber - totals.fiber) * 10) / 10
        },
        percentages: {
            calories: Math.min(100, Math.round((totals.calories / Math.max(1, userTargets.calories)) * 100)),
            protein: Math.min(100, Math.round((totals.protein / Math.max(1, userTargets.protein)) * 100)),
            carbs: Math.min(100, Math.round((totals.carbs / Math.max(1, userTargets.carbs)) * 100)),
            fats: Math.min(100, Math.round((totals.fats / Math.max(1, userTargets.fats)) * 100)),
            fiber: Math.min(100, Math.round((totals.fiber / Math.max(1, userTargets.fiber)) * 100))
        },
        isProteinGoalMet: totals.protein >= userTargets.protein
    };
}

/**
 * Calculates macros for a given portion amount in grams based on 100g base values.
 */
export function calculatePortionMacros(baseFood, amountGrams) {
    const factor = (Number(amountGrams) || 100) / 100;
    return {
        calories: Math.round((baseFood.calories || 0) * factor),
        protein: Math.round((baseFood.protein || 0) * factor * 10) / 10,
        carbs: Math.round((baseFood.carbs || 0) * factor * 10) / 10,
        fats: Math.round((baseFood.fats || 0) * factor * 10) / 10,
        fiber: Math.round((baseFood.fiber || 0) * factor * 10) / 10
    };
}
