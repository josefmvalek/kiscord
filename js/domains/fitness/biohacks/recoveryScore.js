import { state } from '@core/state.js';
import { getTodayKey } from '@core/utils.js';

/**
 * Algoritmus pro denní Recovery Index (Whoop/Oura styl).
 */
export function calculateDailyRecoveryScore(customInputs = {}) {
    const todayKey = getTodayKey();
    const health = (state.healthData && state.healthData[todayKey]) || {};

    // 1. Spánek (35% váha)
    // Ideál: 8 hodin
    const sleepHours = customInputs.sleepHours !== undefined ? customInputs.sleepHours : (health.sleep || 7.5);
    let sleepScore = 0;
    if (sleepHours >= 7.5 && sleepHours <= 9.0) {
        sleepScore = 100;
    } else if (sleepHours >= 6.5) {
        sleepScore = 80;
    } else if (sleepHours >= 5.5) {
        sleepScore = 55;
    } else {
        sleepScore = 30;
    }

    // 2. Hydratace (15% váha)
    // 0-4 úrovně vody (target 3-4)
    const waterLevel = customInputs.waterLevel !== undefined ? customInputs.waterLevel : (health.water || 2);
    const waterScore = Math.min(100, Math.round((waterLevel / 4) * 100));

    // 3. Svalová regenerace / Soreness (25% váha)
    // Pokud má uživatel zapsanou vysokou bolestivost svalů, skóre klesá
    const sorenessLevel = customInputs.sorenessLevel !== undefined ? customInputs.sorenessLevel : 2; // 1-5 (1 = fresh, 5 = brutal sore)
    const sorenessScore = Math.max(20, 100 - (sorenessLevel - 1) * 20);

    // 4. Tréninková zátěž z včerejška (15% váha)
    const strainLevel = customInputs.strainLevel !== undefined ? customInputs.strainLevel : 3; // 1-5
    const strainScore = Math.max(30, 100 - (strainLevel - 1) * 15);

    // 5. Nálada / subjektivní pocit (10% váha)
    const moodVal = customInputs.moodVal !== undefined ? customInputs.moodVal : (health.mood || 7);
    const moodScore = Math.min(100, Math.round((moodVal / 10) * 100));

    // Výpočet váženého průměru
    const totalScore = Math.round(
        sleepScore * 0.35 +
        sorenessScore * 0.25 +
        waterScore * 0.15 +
        strainScore * 0.15 +
        moodScore * 0.10
    );

    let category = 'green';
    let statusLabel = 'Připraven k výkonu';
    let themeClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    let directive = 'Vynikající regenerace! Dnes je skvělý den na těžký silový trénink, progresivní přetížení nebo náročné úkoly.';

    if (totalScore < 50) {
        category = 'red';
        statusLabel = 'Potřeba odpočinku';
        themeClass = 'text-red-400 border-red-500/30 bg-red-500/10';
        directive = 'Tělo je unavené a potřebuje regeneraci. Vynechej těžké zvedání vah, dopřej si lehkou chůzi, saunu a jdi spát před 22:30.';
    } else if (totalScore < 78) {
        category = 'yellow';
        statusLabel = 'Udržovací stav';
        themeClass = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
        directive = 'Standardní regenerace. Vhodný den pro technický trénink střední intenzity s dostatkem pauz mezi sériemi.';
    }

    return {
        score: totalScore,
        category,
        statusLabel,
        themeClass,
        directive,
        breakdown: {
            sleepScore,
            sorenessScore,
            waterScore,
            strainScore,
            moodScore
        }
    };
}
