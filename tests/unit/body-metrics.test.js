import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
        }))
    }
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    escapeHTML: vi.fn(str => str || '')
}));

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn()
}));

import { state } from '../../js/core/state.js';
import { 
    calculateMifflinStJeor, 
    calculateKatchMcArdle, 
    calculateLBM, 
    calculateFFMI, 
    calculateFullBiometrics 
} from '../../js/domains/fitness/body-metrics/biometricsCalculator.js';
import { renderWeightTrendHero, renderCircumferencesSection } from '../../js/domains/fitness/body-metrics/components.js';
import { applyBiometricsToNutrition } from '../../js/domains/fitness/body-metrics/modals.js';
import { renderBodyMetrics } from '../../js/domains/fitness/body-metrics/index.js';
import { channelCategories, moduleMap } from '../../js/core/router.js';

describe('Body Metrics Hub & Nutrition Integration (#tělo-a-míry)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.user_ids = { jose: 'user_jose_123', klarka: 'user_klara_456' };
        state.currentUser = { id: 'user_jose_123', name: 'Josef' };
        state.nutritionTargets = {
            josef: { calories: 2500, protein: 160, carbs: 290, fats: 75, fiber: 30 },
            klarka: { calories: 1900, protein: 110, carbs: 220, fats: 60, fiber: 25 }
        };
        state.biometricsProfiles = {
            josef: { gender: 'male', age: 24, height_cm: 184, activityLevel: 'moderate', goal: 'maintain', targetWeight_kg: 82.0 },
            klarka: { gender: 'female', age: 23, height_cm: 168, activityLevel: 'moderate', goal: 'maintain', targetWeight_kg: 60.0 }
        };
        state.gymBodyMeasurements = [
            { id: '1', date_key: '2026-08-01', user_id: 'user_jose_123', weight: 83.0, body_fat: 14.5, chest: 106, waist: 82, hips: 98, biceps: 38, thighs: 60 },
            { id: '2', date_key: '2026-08-10', user_id: 'user_jose_123', weight: 82.5, body_fat: 14.2, chest: 106.5, waist: 81.5, hips: 97.5, biceps: 38.5, thighs: 60.5 },
            { id: '3', date_key: '2026-08-20', user_id: 'user_jose_123', weight: 82.0, body_fat: 13.8, chest: 107, waist: 81, hips: 97, biceps: 39, thighs: 61 }
        ];
    });

    describe('1. Biometrics & BMR Calculator Engine', () => {
        it('should calculate BMR via Mifflin-St Jeor formula for male and female', () => {
            // Male: 82kg, 184cm, 24y
            // (10*82) + (6.25*184) - (5*24) + 5 = 820 + 1150 - 120 + 5 = 1855 kcal
            const bmrMale = calculateMifflinStJeor(82, 184, 24, 'male');
            expect(bmrMale).toBe(1855);

            // Female: 60kg, 168cm, 23y
            // (10*60) + (6.25*168) - (5*23) - 161 = 600 + 1050 - 115 - 161 = 1374 kcal
            const bmrFemale = calculateMifflinStJeor(60, 168, 23, 'female');
            expect(bmrFemale).toBe(1374);
        });

        it('should calculate BMR via Katch-McArdle using Lean Body Mass (LBM)', () => {
            // 82kg, 14% body fat -> LBM = 82 * 0.86 = 70.52 kg
            // BMR = 370 + (21.6 * 70.52) = 370 + 1523.23 = 1893 kcal
            const bmrKatch = calculateKatchMcArdle(82, 14);
            expect(bmrKatch).toBe(1893);
        });

        it('should calculate Lean Body Mass (LBM) and Fat-Free Mass Index (FFMI)', () => {
            const lbm = calculateLBM(82, 14);
            expect(lbm).toBe(70.5);

            const ffmi = calculateFFMI(82, 184, 14);
            expect(ffmi).not.toBeNull();
            expect(ffmi.raw).toBeCloseTo(20.8, 1);
            expect(ffmi.normalized).toBeCloseTo(20.6, 1);
            expect(ffmi.category).toBe('Dobře trénovaný / atlet');
        });

        it('should compute full biometrics report with personalized macros for different goals', () => {
            const profile = { gender: 'male', age: 24, height_cm: 184, activityLevel: 'moderate', goal: 'cut', targetWeight_kg: 80 };
            const report = calculateFullBiometrics(profile, 82, 14);

            expect(report.tdee).toBeGreaterThan(2500);
            expect(report.targetCalories).toBeLessThan(report.tdee); // Deficit for Cut
            expect(report.macros.protein).toBeGreaterThanOrEqual(164); // >= 2.0g/kg
            expect(report.targetWaterMl).toBeGreaterThan(3000); // Daily water recommendation
        });
    });

    describe('2. UI Components & Charts', () => {
        it('should render weight trend hero with SVG chart and targets', () => {
            const bioData = calculateFullBiometrics(state.biometricsProfiles.josef, 82, 14);
            const html = renderWeightTrendHero(bioData, state.gymBodyMeasurements, 'josef');

            expect(html).toContain('Tělesná Hmotnost');
            expect(html).toContain('82');
            expect(html).toContain('Vývoj váhy a vyhlazený trend (EMA)');
            expect(html).toContain('Aplikovat do #výživa');
        });

        it('should render body circumferences with delta progression', () => {
            const html = renderCircumferencesSection(state.gymBodyMeasurements, 'josef');

            expect(html).toContain('Obvody Těla');
            expect(html).toContain('Hrudník');
            expect(html).toContain('Biceps');
            expect(html).toContain('Stehna');
        });
    });

    describe('3. Bidirectional Sync into Nutrition Targets', () => {
        it('should update state.nutritionTargets with exact calculated macros when sync is triggered', () => {
            state.biometricsProfiles.josef = {
                gender: 'male',
                age: 24,
                height_cm: 184,
                activityLevel: 'moderate',
                goal: 'bulk',
                targetWeight_kg: 85
            };

            applyBiometricsToNutrition('josef');

            expect(state.nutritionTargets.josef.calories).toBeGreaterThan(2700);
            expect(state.nutritionTargets.josef.protein).toBeGreaterThan(160);
            expect(state.nutritionTargets.josef.carbs).toBeGreaterThan(250);
        });
    });

    describe('4. Channel Mount & Navigation Router Integration', () => {
        it('should mount #tělo-a-míry view into DOM', () => {
            renderBodyMetrics();
            const container = document.getElementById('messages-container');

            expect(container).not.toBeNull();
            expect(container.innerHTML).toContain('Tělo, Míry');
            expect(container.innerHTML).toContain('Obvody');
            expect(container.innerHTML).toContain('BMR');
            expect(container.innerHTML).toContain('Fotodeník');
        });

        it('should be registered in channelCategories and moduleMap', () => {
            expect(moduleMap['body-metrics']).toBeDefined();
            const healthCat = channelCategories.find(c => c.name.includes('ZDRAVÍ'));
            expect(healthCat).toBeDefined();
            const bodyMetricsChannel = healthCat.items.find(i => i.id === 'body-metrics');
            expect(bodyMetricsChannel).toBeDefined();
            expect(bodyMetricsChannel.name).toBe('tělo-a-míry');
        });
    });
});
