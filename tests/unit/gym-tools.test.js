import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

vi.mock('../../js/core/theme.js', () => ({
  showNotification: vi.fn(),
  showConfirmDialog: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
  getTodayKey: () => '2026-08-17',
}));

import {
  calculate1RM,
  get1RMPercentages,
  calculatePlates,
  generateWarmupSets,
  getExerciseTargetSuggestion,
  renderPlateBarbellVisual,
  STANDARD_PLATES,
  BAR_TYPES
} from '../../js/domains/fitness/gym/tools.js';
import { state } from '../../js/core/state.js';

describe('Gym Tools: 1RM, Plate Calculator & Warm-up Generator', () => {
  describe('1RM Calculator', () => {
    it('returns exact weight for 1 rep', () => {
      expect(calculate1RM(100, 1)).toBe(100);
      expect(calculate1RM(60, 1)).toBe(60);
    });

    it('calculates 1RM accurately with Epley formula', () => {
      // Epley: w * (1 + r / 30) -> 80 * (1 + 8 / 30) = 80 * 1.2666 = 101.3
      const result = calculate1RM(80, 8);
      expect(result).toBe(101.3);
    });

    it('calculates 1RM accurately with Brzycki formula', () => {
      // Brzycki: w * (36 / (37 - r)) -> 100 * (36 / 32) = 112.5
      const result = calculate1RM(100, 5, 'brzycki');
      expect(result).toBe(112.5);
    });

    it('handles zero and negative inputs safely', () => {
      expect(calculate1RM(0, 10)).toBe(0);
      expect(calculate1RM(100, 0)).toBe(0);
      expect(calculate1RM(-50, 5)).toBe(0);
    });

    it('generates percentage table for 1RM', () => {
      const pcts = get1RMPercentages(100);
      expect(pcts.length).toBe(10);
      expect(pcts[0]).toEqual({ pct: 100, reps: '1', weight: 100 });
      expect(pcts[1]).toEqual({ pct: 95, reps: '2', weight: 95 });
      expect(pcts[3]).toEqual({ pct: 85, reps: '5-6', weight: 85 });
      expect(pcts[4]).toEqual({ pct: 80, reps: '7-8', weight: 80 });
    });
  });

  describe('Plate Calculator', () => {
    it('handles empty bar when target weight equals bar weight', () => {
      const calc = calculatePlates(20, 20);
      expect(calc.totalLoaded).toBe(20);
      expect(calc.weightPerSide).toBe(0);
      expect(calc.plates).toHaveLength(0);
    });

    it('calculates correct plates per side for 60 kg (20kg bar + 20kg per side)', () => {
      // (60 - 20) / 2 = 20 kg per side -> 1x 20kg
      const calc = calculatePlates(60, 20);
      expect(calc.totalLoaded).toBe(60);
      expect(calc.weightPerSide).toBe(20);
      expect(calc.plates).toEqual([
        expect.objectContaining({ weight: 20, count: 1 })
      ]);
    });

    it('calculates correct plates per side for 82.5 kg (20kg bar + 31.25kg per side)', () => {
      // (82.5 - 20) / 2 = 31.25 kg -> 1x 25kg, 1x 5kg, 1x 1.25kg
      const calc = calculatePlates(82.5, 20);
      expect(calc.totalLoaded).toBe(82.5);
      expect(calc.weightPerSide).toBe(31.25);
      expect(calc.plates).toEqual([
        expect.objectContaining({ weight: 25, count: 1 }),
        expect.objectContaining({ weight: 5, count: 1 }),
        expect.objectContaining({ weight: 1.25, count: 1 })
      ]);
    });

    it('calculates correct plates per side for 100 kg on 15kg bar', () => {
      // (100 - 15) / 2 = 42.5 kg -> 1x 25kg, 1x 15kg, 1x 2.5kg
      const calc = calculatePlates(100, 15);
      expect(calc.totalLoaded).toBe(100);
      expect(calc.weightPerSide).toBe(42.5);
      expect(calc.plates).toEqual([
        expect.objectContaining({ weight: 25, count: 1 }),
        expect.objectContaining({ weight: 15, count: 1 }),
        expect.objectContaining({ weight: 2.5, count: 1 })
      ]);
    });

    it('renders barbell visualization HTML correctly', () => {
      const calc = calculatePlates(80, 20);
      const html = renderPlateBarbellVisual(calc);
      expect(html).toContain('Naložení na jednu stranu osy');
      expect(html).toContain('80 kg');
      expect(html).toContain('kotouč');
    });
  });

  describe('Warm-up Generator', () => {
    it('generates ascending warm-up sets marked as type W', () => {
      const warmup = generateWarmupSets(100, 8, 20);
      expect(warmup.length).toBeGreaterThanOrEqual(3);
      
      // All sets must have type 'W'
      expect(warmup.every(s => s.type === 'W')).toBe(true);

      // Set 1: Empty bar (20kg)
      expect(warmup[0].weight).toBe(20);
      expect(warmup[0].reps).toBe(10);

      // Subsequent sets should have increasing weights and decreasing reps
      for (let i = 1; i < warmup.length; i++) {
        expect(warmup[i].weight).toBeGreaterThanOrEqual(warmup[i - 1].weight);
        expect(warmup[i].reps).toBeLessThanOrEqual(warmup[i - 1].reps);
      }
    });

    it('handles light weights gracefully', () => {
      const warmup = generateWarmupSets(20, 10, 20);
      expect(warmup).toHaveLength(1);
      expect(warmup[0].weight).toBe(20);
    });
  });

  describe('Progressive Overload Assistant', () => {
    beforeEach(() => {
      state.currentUser = { id: 'user-jose', name: 'Jožka' };
      state.gymLogs = [
        {
          id: 'log-prev',
          user_id: 'user-jose',
          date_key: '2026-08-10',
          exercises: [
            {
              exercise_id: 'bench_press',
              exercise_name: 'Bench Press',
              sets: [
                { weight: 80, reps: 8, completed: true, type: 'N' },
                { weight: 80, reps: 7, completed: true, type: 'N' }
              ]
            }
          ]
        }
      ];
    });

    it('finds previous best set and generates overload suggestions', () => {
      const target = getExerciseTargetSuggestion('bench_press', 'user-jose');
      expect(target).not.toBeNull();
      expect(target.lastWeight).toBe(80);
      expect(target.lastReps).toBe(8);
      expect(target.estimated1RM).toBe(101.3);
      expect(target.suggestions).toHaveLength(2);
      expect(target.suggestions[0].text).toContain('+2.5 kg');
      expect(target.suggestions[1].text).toContain('+1 op.');
    });

    it('returns null if exercise was never performed', () => {
      const target = getExerciseTargetSuggestion('unknown_exercise', 'user-jose');
      expect(target).toBeNull();
    });
  });
});
