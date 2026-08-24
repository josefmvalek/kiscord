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
import { getServerForChannel } from '../../js/core/servers.js';
import { calculateDailyNutrition, calculatePortionMacros } from '../../js/domains/fitness/nutrition/macroCalculator.js';
import { renderMacroDonut, renderMacroBar, renderMealCard } from '../../js/domains/fitness/nutrition/components.js';
import { renderNutrition } from '../../js/domains/fitness/nutrition/index.js';

describe('Nutrition & Macro Tracker Module (#výživa)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="messages-container"></div>';
        state.user_ids = { jose: 'user_jose_123', klarka: 'user_klara_456' };
        state.currentUser = { id: 'user_jose_123', name: 'Josef' };
        state.nutritionTargets = {
            josef: { calories: 2500, protein: 160, carbs: 290, fats: 75, fiber: 30 },
            klarka: { calories: 1900, protein: 110, carbs: 220, fats: 60, fiber: 25 }
        };
        state.nutritionLogs = {
            '2026-08-22': [
                {
                    id: 'item_1',
                    user_id: 'user_jose_123',
                    user_name: 'josef',
                    date_key: '2026-08-22',
                    meal_type: 'breakfast',
                    food_name: 'Ovesná kaše s proteinem',
                    calories: 450,
                    protein: 35,
                    carbs: 55,
                    fats: 8,
                    fiber: 7,
                    amount_g: 80
                },
                {
                    id: 'item_2',
                    user_id: 'user_jose_123',
                    user_name: 'josef',
                    date_key: '2026-08-22',
                    meal_type: 'lunch',
                    food_name: 'Kuřecí prsa s rýží a brokolicí',
                    calories: 650,
                    protein: 55,
                    carbs: 70,
                    fats: 12,
                    fiber: 5,
                    amount_g: 350
                },
                {
                    id: 'item_3',
                    user_id: 'user_klara_456',
                    user_name: 'klarka',
                    date_key: '2026-08-22',
                    meal_type: 'lunch',
                    food_name: 'Kuřecí prsa s rýží (menší porce)',
                    calories: 450,
                    protein: 38,
                    carbs: 50,
                    fats: 9,
                    fiber: 4,
                    amount_g: 250
                }
            ]
        };
    });

    it('should correctly resolve nutrition channel to fitness server', () => {
        const server = getServerForChannel('nutrition');
        expect(server).toBeDefined();
        expect(server.id).toBe('fitness');
    });

    it('should calculate daily nutrition totals, remaining macros and meal breakdowns for Josef', () => {
        const stats = calculateDailyNutrition('2026-08-22', 'josef');

        expect(stats.totals.calories).toBe(1100);
        expect(stats.totals.protein).toBe(90);
        expect(stats.totals.carbs).toBe(125);
        expect(stats.totals.fats).toBe(20);
        expect(stats.totals.fiber).toBe(12);

        // Target comparison
        expect(stats.targets.calories).toBe(2500);
        expect(stats.remaining.calories).toBe(1400);
        expect(stats.remaining.protein).toBe(70);
        expect(stats.isProteinGoalMet).toBe(false);

        // Meals grouping
        expect(stats.meals.breakfast.length).toBe(1);
        expect(stats.meals.lunch.length).toBe(1);
        expect(stats.meals.dinner.length).toBe(0);
    });

    it('should calculate daily nutrition totals accurately for Klarka', () => {
        const stats = calculateDailyNutrition('2026-08-22', 'klarka');

        expect(stats.totals.calories).toBe(450);
        expect(stats.totals.protein).toBe(38);
        expect(stats.targets.calories).toBe(1900);
        expect(stats.remaining.calories).toBe(1450);
        expect(stats.meals.lunch.length).toBe(1);
    });

    it('should scale portion macros accurately with calculatePortionMacros', () => {
        const baseFood = { calories: 200, protein: 20, carbs: 10, fats: 5, fiber: 2 };
        const portion150g = calculatePortionMacros(baseFood, 150);

        expect(portion150g.calories).toBe(300);
        expect(portion150g.protein).toBe(30);
        expect(portion150g.carbs).toBe(15);
        expect(portion150g.fats).toBe(7.5);
        expect(portion150g.fiber).toBe(3);
    });

    it('should render macro donut with proper progress values and labels', () => {
        const donutHtml = renderMacroDonut(1100, 2500, 1400);
        expect(donutHtml).toContain('Kalorie');
        expect(donutHtml).toContain('1100');
        expect(donutHtml).toContain('zbývá 1400');
        expect(donutHtml).toContain('stroke-dashoffset');
    });

    it('should render horizontal macro bar with checkmark when goal is met', () => {
        const barNotMet = renderMacroBar('Bílkoviny', 90, 160, '#5865F2', '<i class="fas fa-drumstick-bite"></i>');
        expect(barNotMet).toContain('90g');
        expect(barNotMet).toContain('/ 160g');
        expect(barNotMet).not.toContain('fa-check-circle');

        const barMet = renderMacroBar('Bílkoviny', 165, 160, '#5865F2', '<i class="fas fa-drumstick-bite"></i>');
        expect(barMet).toContain('165g');
        expect(barMet).toContain('fa-check-circle');
    });

    it('should render meal card with food items, calories, and action buttons', () => {
        const items = state.nutritionLogs['2026-08-22'].filter(i => i.meal_type === 'breakfast');
        const cardHtml = renderMealCard('breakfast', 'Snídaně', '<i class="fas fa-coffee"></i>', items, 'josef', true);

        expect(cardHtml).toContain('Snídaně');
        expect(cardHtml).toContain('Ovesná kaše s proteinem');
        expect(cardHtml).toContain('450');
        expect(cardHtml).toContain('Přidat jídlo');
    });

    it('should mount and render #výživa channel completely into DOM', () => {
        renderNutrition();
        const container = document.getElementById('messages-container');

        expect(container).not.toBeNull();
        expect(container.innerHTML).toContain('Kalorie');
        expect(container.innerHTML).toContain('Bílkoviny');
        expect(container.innerHTML).toContain('Snídaně');
        expect(container.innerHTML).toContain('Oběd');
        expect(container.innerHTML).toContain('Večeře');
        expect(container.innerHTML).toContain('Svačiny');
    });
});
