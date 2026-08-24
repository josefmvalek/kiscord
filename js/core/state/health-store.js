export const initialHealthState = {
    healthData: {},
    partnerHealthData: null,
    cycleLogs: [],
    cycleSettings: {
        cycle_length_days: 28,
        period_length_days: 5,
        luteal_length_days: 14,
        share_with_partner: true,
        partner_visible_fields: ['phase_name', 'energy_level', 'mood', 'tips']
    },
    partnerCycleData: null,
    stepLogs: {},
    biohackLogs: {},
    sleepLogs: {},
    activeFastingSession: null,
    nutritionLogs: {},
    nutritionTargets: {
        josef: { calories: 2500, protein: 160, carbs: 290, fats: 75, fiber: 30 },
        klarka: { calories: 1900, protein: 110, carbs: 220, fats: 60, fiber: 25 }
    },
    biometricsProfiles: {
        josef: { gender: 'male', age: 24, height_cm: 184, activityLevel: 'moderate', goal: 'maintain', targetWeight_kg: 82.0 },
        klarka: { gender: 'female', age: 23, height_cm: 168, activityLevel: 'moderate', goal: 'maintain', targetWeight_kg: 60.0 }
    },
    savedFoods: []
};

export class HealthStore {
    constructor() {
        this.healthData = {};
        this.partnerHealthData = null;
        this.cycleLogs = [];
        this.cycleSettings = { ...initialHealthState.cycleSettings };
        this.partnerCycleData = null;
        this.stepLogs = {};
        this.biohackLogs = {};
        this.sleepLogs = {};
        this.activeFastingSession = null;
        this.nutritionLogs = {};
        this.nutritionTargets = structuredClone(initialHealthState.nutritionTargets);
        this.biometricsProfiles = structuredClone(initialHealthState.biometricsProfiles);
        this.savedFoods = [];
    }

    setHealthData(dateKey, data) {
        this.healthData[dateKey] = { ...(this.healthData[dateKey] || {}), ...data };
    }

    setCycleLogs(logs) {
        this.cycleLogs = Array.isArray(logs) ? logs : [];
    }

    setNutritionLogs(dateKey, data) {
        this.nutritionLogs[dateKey] = { ...(this.nutritionLogs[dateKey] || {}), ...data };
    }
}
