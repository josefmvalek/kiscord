/**
 * Biometrics Calculator Engine
 * Calculates BMR, TDEE, Lean Body Mass (LBM), FFMI, and customized macro targets.
 */

export const ACTIVITY_LEVELS = [
    { id: 'sedentary', name: 'Sedavý styl', factor: 1.2, desc: 'Kancelářská práce, minimální pohyb' },
    { id: 'light', name: 'Lehká aktivita', factor: 1.375, desc: '1–3x týdně lehký trénink nebo procházky' },
    { id: 'moderate', name: 'Střední aktivita', factor: 1.55, desc: '3–5x týdně silový trénink v posilovně' },
    { id: 'heavy', name: 'Vysoká aktivita', factor: 1.725, desc: '6–7x týdně náročný trénink' },
    { id: 'athlete', name: 'Extrémní / Atlet', factor: 1.9, desc: 'Dvoufázové tréninky nebo fyzická práce' }
];

export const DEFAULT_PROFILES = {
    josef: {
        gender: 'male',
        age: 24,
        height_cm: 184,
        activityLevel: 'moderate',
        goal: 'maintain', // 'cut' | 'maintain' | 'bulk'
        targetWeight_kg: 82.0
    },
    klarka: {
        gender: 'female',
        age: 23,
        height_cm: 168,
        activityLevel: 'moderate',
        goal: 'maintain',
        targetWeight_kg: 60.0
    }
};

/**
 * Calculates BMR using the Mifflin-St Jeor formula.
 */
export function calculateMifflinStJeor(weightKg, heightCm, ageYears, gender = 'male') {
    const w = Number(weightKg) || 75;
    const h = Number(heightCm) || 175;
    const a = Number(ageYears) || 25;

    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    if (gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    return Math.round(bmr);
}

/**
 * Calculates BMR using the Katch-McArdle formula (based on Lean Body Mass).
 */
export function calculateKatchMcArdle(weightKg, bodyFatPct) {
    if (!bodyFatPct || bodyFatPct <= 0 || bodyFatPct >= 60) return null;
    const lbmKg = weightKg * (1 - (bodyFatPct / 100));
    const bmr = 370 + (21.6 * lbmKg);
    return Math.round(bmr);
}

/**
 * Calculates Lean Body Mass (LBM) in kg.
 */
export function calculateLBM(weightKg, bodyFatPct) {
    if (!bodyFatPct) return null;
    const lbm = weightKg * (1 - (bodyFatPct / 100));
    return Math.round(lbm * 10) / 10;
}

/**
 * Calculates Fat-Free Mass Index (FFMI) and normalized FFMI.
 */
export function calculateFFMI(weightKg, heightCm, bodyFatPct) {
    const lbm = calculateLBM(weightKg, bodyFatPct);
    if (!lbm || !heightCm) return null;

    const heightM = heightCm / 100;
    const rawFfmi = lbm / (heightM * heightM);
    // Normalized FFMI for tall/short individuals
    const normalizedFfmi = rawFfmi + (6.1 * (1.8 - heightM));

    return {
        raw: Math.round(rawFfmi * 10) / 10,
        normalized: Math.round(normalizedFfmi * 10) / 10,
        category: getFFMICategory(normalizedFfmi)
    };
}

function getFFMICategory(ffmi) {
    if (ffmi < 18) return 'Podprůměrná svalová hmota';
    if (ffmi < 20) return 'Průměrná svalová hmota';
    if (ffmi < 22) return 'Dobře trénovaný / atlet';
    if (ffmi < 24) return 'Pokročilý naturální kulturista';
    return 'Elitní genetika / vrcholová forma';
}

/**
 * Calculates full biometrics report and customized nutrition plan.
 */
export function calculateFullBiometrics(profile, currentWeightKg, currentBodyFatPct = null) {
    const p = { ...(DEFAULT_PROFILES[profile?.userKey] || DEFAULT_PROFILES.josef), ...profile };
    const weight = Number(currentWeightKg) || (p.gender === 'male' ? 82 : 62);
    const height = Number(p.height_cm) || 175;
    const age = Number(p.age) || 24;

    const actLevel = ACTIVITY_LEVELS.find(a => a.id === p.activityLevel) || ACTIVITY_LEVELS[2];
    const bmrMifflin = calculateMifflinStJeor(weight, height, age, p.gender);
    const bmrKatch = currentBodyFatPct ? calculateKatchMcArdle(weight, currentBodyFatPct) : null;
    const effectiveBmr = bmrKatch || bmrMifflin;

    const tdee = Math.round(effectiveBmr * actLevel.factor);

    // Goal adjustments
    let goalCalorieMultiplier = 1.0;
    let proteinPerKg = p.gender === 'male' ? 2.0 : 1.8;
    let fatPerKg = 0.9;

    if (p.goal === 'cut') {
        goalCalorieMultiplier = 0.80; // 20% deficit
        proteinPerKg = p.gender === 'male' ? 2.2 : 2.0;
        fatPerKg = 0.8;
    } else if (p.goal === 'bulk') {
        goalCalorieMultiplier = 1.12; // 12% surplus
        proteinPerKg = p.gender === 'male' ? 2.0 : 1.8;
        fatPerKg = 1.0;
    }

    const targetCalories = Math.round(tdee * goalCalorieMultiplier);
    const targetProtein = Math.round(weight * proteinPerKg);
    const targetFats = Math.round(weight * fatPerKg);

    const caloriesFromProtAndFat = (targetProtein * 4) + (targetFats * 9);
    const remainingCarbCals = Math.max(0, targetCalories - caloriesFromProtAndFat);
    const targetCarbs = Math.round(remainingCarbCals / 4);

    const lbm = currentBodyFatPct ? calculateLBM(weight, currentBodyFatPct) : null;
    const ffmi = currentBodyFatPct ? calculateFFMI(weight, height, currentBodyFatPct) : null;

    // Recommended daily water (ml) ~ 35ml per kg + 500ml for training
    const targetWaterMl = Math.round((weight * 35) + 500);

    return {
        weight,
        height,
        age,
        gender: p.gender,
        activityLevel: actLevel,
        bmr: effectiveBmr,
        tdee,
        targetCalories,
        macros: {
            protein: targetProtein,
            carbs: targetCarbs,
            fats: targetFats,
            fiber: Math.round(targetCalories / 1000 * 14)
        },
        lbm,
        ffmi,
        targetWaterMl,
        targetWeight: p.targetWeight_kg || weight
    };
}
