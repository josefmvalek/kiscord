import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                }),
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
import { getFastingState, startFast, endFast, calculateFastingProgress, renderFastingCard } from '../../js/domains/fitness/nutrition/fastingTimer.js';
import { calculateSmoothedWeightTrend, calculateAdaptiveTDEE, renderTDEECoachCard } from '../../js/domains/fitness/nutrition/tdee-coach.js';
import { parseFoodNaturalLanguage } from '../../js/domains/fitness/nutrition/nlpParser.js';
import { calculateRecipeNutrition, renderRecipeBuilder } from '../../js/domains/fitness/nutrition/recipeBuilder.js';
import { getWeeklyNutritionStats, renderWeeklyAnalytics } from '../../js/domains/fitness/nutrition/weeklyAnalytics.js';
import { renderNutrition } from '../../js/domains/fitness/nutrition/index.js';

describe('Premium Nutrition & Macro Ecosystem (#výživa 2.0)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.user_ids = { jose: 'user_jose_123', klarka: 'user_klara_456' };
        state.currentUser = { id: 'user_jose_123', name: 'Josef' };
        state.fastingState = {};
        state.nutritionTargets = {
            josef: { calories: 2500, protein: 160, carbs: 290, fats: 75, fiber: 30 },
            klarka: { calories: 1900, protein: 110, carbs: 220, fats: 60, fiber: 25 }
        };
        state.savedFoods = [];
        state.nutritionLogs = {
            '2026-08-22': [
                { id: '1', user_id: 'user_jose_123', user_name: 'josef', date_key: '2026-08-22', meal_type: 'breakfast', food_name: 'Vejce a vločky', calories: 500, protein: 40, carbs: 60, fats: 10, fiber: 6 }
            ]
        };
        state.gymBodyMeasurements = [
            { date_key: '2026-08-01', user_id: 'user_jose_123', weight: 83.0 },
            { date_key: '2026-08-10', user_id: 'user_jose_123', weight: 82.5 },
            { date_key: '2026-08-20', user_id: 'user_jose_123', weight: 82.0 }
        ];
    });

    describe('1. Intermittent Fasting (IF) Timer', () => {
        it('should initialize and transition fasting states correctly', () => {
            const initial = getFastingState('josef');
            expect(initial.isActive).toBe(false);

            startFast('josef', '16-8');
            const active = getFastingState('josef');
            expect(active.isActive).toBe(true);
            expect(active.presetId).toBe('16-8');
            expect(active.fastStartTime).not.toBeNull();

            const progress = calculateFastingProgress('josef');
            expect(progress.isActive).toBe(true);
            expect(progress.preset.fastHours).toBe(16);
            expect(progress.status).toBe('fasting');

            endFast('josef');
            const finished = getFastingState('josef');
            expect(finished.isActive).toBe(false);
        });

        it('should render fasting card with timer UI and controls', () => {
            const cardHtml = renderFastingCard('josef');
            expect(cardHtml).toContain('Intermittent Fasting');
            expect(cardHtml).toContain('16:8 LeanGains');
            expect(cardHtml).toContain('Zahájit nový půst');
        });
    });

    describe('2. Adaptive TDEE & Smart Coach', () => {
        it('should smooth weight trends with Exponential Moving Average (EMA)', () => {
            const raw = [
                { date: '2026-08-01', weight: 83.0 },
                { date: '2026-08-02', weight: 84.0 }, // Water fluctuation
                { date: '2026-08-03', weight: 82.8 }
            ];

            const smoothed = calculateSmoothedWeightTrend(raw, 0.15);
            expect(smoothed.length).toBe(3);
            expect(smoothed[0].smoothed).toBe(83.0);
            expect(smoothed[1].smoothed).toBeLessThan(84.0); // Smoothed out peak
            expect(smoothed[2].smoothed).toBe(83.1);
        });

        it('should calculate adaptive TDEE and macro splits for Cut, Bulk, and Maintain', () => {
            const tdeeData = calculateAdaptiveTDEE('josef', 14);

            expect(tdeeData.estimatedTDEE).toBeGreaterThan(1500);
            expect(tdeeData.programs.cut.calories).toBeLessThan(tdeeData.estimatedTDEE);
            expect(tdeeData.programs.bulk.calories).toBeGreaterThan(tdeeData.estimatedTDEE);
            expect(tdeeData.programs.maintain.calories).toBe(tdeeData.estimatedTDEE);

            expect(tdeeData.programs.cut.protein).toBeGreaterThan(150);
            expect(tdeeData.programs.cut.fats).toBeGreaterThan(40);
            expect(tdeeData.programs.cut.carbs).toBeGreaterThan(100);
        });

        it('should render TDEE coach card with program options', () => {
            const cardHtml = renderTDEECoachCard('josef');
            expect(cardHtml).toContain('Adaptivní TDEE Kouč');
            expect(cardHtml).toContain('Rýsování (Cut)');
            expect(cardHtml).toContain('Objem (Bulk)');
            expect(cardHtml).toContain('Udržování');
        });
    });

    describe('3. AI / NLP Natural Language Food Parser', () => {
        it('should parse natural language text into structured food items and calculate macros', () => {
            const input = "2 vejce, 80g ovesne vlocky, 30g protein, banan";
            const parsed = parseFoodNaturalLanguage(input);

            expect(parsed.length).toBe(4);

            // Vejce
            const egg = parsed.find(i => i.food_name.toLowerCase().includes('vejce'));
            expect(egg).toBeDefined();
            expect(egg.protein).toBeGreaterThan(10);

            // Vločky
            const oats = parsed.find(i => i.food_name.toLowerCase().includes('vlocky'));
            expect(oats).toBeDefined();
            expect(oats.amount_g).toBe(80);
            expect(oats.carbs).toBeGreaterThan(40);

            // Protein
            const prot = parsed.find(i => i.food_name.toLowerCase().includes('protein'));
            expect(prot).toBeDefined();
            expect(prot.amount_g).toBe(30);
            expect(prot.protein).toBeGreaterThan(20);

            // Banán
            const banana = parsed.find(i => i.food_name.toLowerCase().includes('banan'));
            expect(banana).toBeDefined();
            expect(banana.calories).toBeGreaterThan(80);
        });
    });

    describe('4. Recipe & Meal Prep Batch Calculator', () => {
        it('should accurately calculate total recipe macros and per-portion values', () => {
            const ingredients = [
                { name: 'Mleté hovězí', amount_g: 500, calories: 215, protein: 26, carbs: 0, fats: 12, fiber: 0 },
                { name: 'Těstoviny', amount_g: 300, calories: 350, protein: 12, carbs: 70, fats: 2, fiber: 3 },
                { name: 'Olivový olej', amount_g: 20, calories: 884, protein: 0, carbs: 0, fats: 100, fiber: 0 }
            ];

            const result = calculateRecipeNutrition(ingredients, 4);

            expect(result.portions).toBe(4);
            expect(result.total.weight_g).toBe(820);
            expect(result.perPortion.weight_g).toBe(205);

            expect(result.total.calories).toBeGreaterThan(2000);
            expect(result.perPortion.calories).toBe(575);
            expect(result.perPortion.protein).toBeGreaterThan(30);
        });

        it('should render recipe builder view', () => {
            const viewHtml = renderRecipeBuilder();
            expect(viewHtml).toContain('Kalkulátor Receptů & Meal Prep');
            expect(viewHtml).toContain('Počet porcí');
            expect(viewHtml).toContain('Uložit recept');
        });
    });

    describe('5. Weekly Analytics & Consistency Tracking', () => {
        it('should aggregate 7-day weekly statistics and compute macro distribution', () => {
            const stats = getWeeklyNutritionStats('2026-08-22', 'josef');

            expect(stats.days.length).toBe(7);
            expect(stats.averages.calories).toBeGreaterThan(0);
            expect(stats.macroSplit.proteinPct).toBeGreaterThan(0);
            expect(stats.macroSplit.proteinPct + stats.macroSplit.carbsPct + stats.macroSplit.fatsPct).toBeCloseTo(100, -1);
        });

        it('should render weekly analytics with adherence bar chart', () => {
            const viewHtml = renderWeeklyAnalytics('2026-08-22', 'josef');
            expect(viewHtml).toContain('Týdenní Adherence Kalorií');
            expect(viewHtml).toContain('Poměr Kalorického Příjmu');
            expect(viewHtml).toContain('Konzistence & Protein Streak');
        });
    });

    describe('6. Channel Integration & Subtab Switching', () => {
        it('should mount full nutrition ecosystem into DOM and support subtabs', () => {
            renderNutrition();
            const container = document.getElementById('messages-container');

            expect(container).not.toBeNull();
            expect(container.innerHTML).toContain('Deník');
            expect(container.innerHTML).toContain('Půst (IF)');
            expect(container.innerHTML).toContain('Recepty');
            expect(container.innerHTML).toContain('TDEE');
        });
    });
});
