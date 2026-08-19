import { describe, it, expect, beforeEach, vi } from 'vitest';

const createSelectChain = () => {
  const chain = {
    order: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve) => Promise.resolve({ data: state.gymTemplates || [], error: null }).then(resolve),
    catch: (reject) => Promise.resolve({ data: state.gymTemplates || [], error: null }).catch(reject)
  };
  return chain;
};

const mockInsert = vi.fn((data) => ({
  select: vi.fn(() => Promise.resolve({ data: [Array.isArray(data) ? data[0] : data], error: null }))
}));

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => createSelectChain(),
      insert: mockInsert
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
  calculateWeeklyVolume,
  calculateMuscleBalance,
  getExerciseProgression,
  cloneTemplate,
  MUSCLE_CATEGORIES
} from '../../js/modules/gym/analytics.js';
import { state } from '../../js/core/state.js';

describe('Gym Analytics: Volume Load, Muscle Balance & Template Cloning', () => {
  beforeEach(() => {
    state.currentUser = { id: 'user-jose', name: 'Jožka' };
    state.gymExercises = [
      { id: 'bench_press', name: 'Bench Press', category: 'Hrudník' },
      { id: 'lat_pulldown', name: 'Stahování kladky', category: 'Záda' },
      { id: 'squat', name: 'Dřep', category: 'Nohy' }
    ];

    state.gymTemplates = [
      {
        id: 'tmpl-push',
        name: 'Push Day 🦍',
        exercises: [
          { exercise_id: 'bench_press', sets: 4, reps: 8, weight: 80 }
        ]
      }
    ];

    state.gymLogs = [
      {
        id: 'log-1',
        user_id: 'user-jose',
        date_key: '2026-08-17',
        name: 'Push Day 🦍',
        exercises: [
          {
            exercise_id: 'bench_press',
            exercise_name: 'Bench Press',
            sets: [
              { weight: 80, reps: 10, completed: true, type: 'N' }, // 800 kg
              { weight: 90, reps: 8, completed: true, type: 'N' },  // 720 kg
              { weight: 100, reps: 5, completed: true, type: 'N' }  // 500 kg
              // total = 2020 kg = 2.02 tons
            ]
          }
        ]
      }
    ];
  });

  describe('Volume Load Calculation', () => {
    it('calculates total weekly volume in kg and tons', () => {
      const volume = calculateWeeklyVolume('user-jose', 4);
      expect(volume.currentWeek).toBeDefined();
      expect(volume.currentWeek.volumeKg).toBe(2020);
      expect(volume.currentWeek.tons).toBe(2);
      expect(volume.currentWeek.setsCount).toBe(3);
    });

    it('returns 0 volume for inactive user', () => {
      const volume = calculateWeeklyVolume('user-other', 4);
      expect(volume.currentWeek.volumeKg).toBe(0);
      expect(volume.currentWeek.tons).toBe(0);
    });
  });

  describe('Muscle Balance (Svalová mapa)', () => {
    it('calculates set distribution and highlights neglected muscles', () => {
      const balance = calculateMuscleBalance('user-jose', 7);
      expect(balance.totalSets).toBe(3);

      const chest = balance.breakdown.find(b => b.id === 'Hrudník');
      expect(chest.sets).toBe(3);
      expect(chest.percentage).toBe(100);

      const back = balance.breakdown.find(b => b.id === 'Záda');
      expect(back.sets).toBe(0);

      // Check neglected categories
      const neglectedIds = balance.neglected.map(n => n.id);
      expect(neglectedIds).toContain('Záda');
      expect(neglectedIds).toContain('Nohy');
    });
  });

  describe('Exercise Progression History', () => {
    it('returns chronological performance history with estimated 1RM', () => {
      const history = getExerciseProgression('bench_press', 'user-jose');
      expect(history).toHaveLength(1);
      expect(history[0].dateKey).toBe('2026-08-17');
      expect(history[0].maxWeight).toBe(100);
      expect(history[0].estimated1RM).toBe(116.7); // 100 * (1 + 5/30) = 116.7 kg
      expect(history[0].volumeKg).toBe(2020);
    });
  });

  describe('Template Cloning', () => {
    it('clones template with scaling and creates new template in state', async () => {
      await cloneTemplate('tmpl-push', 0.8, 'Push Day pro Klárku 👸');

      expect(mockInsert).toHaveBeenCalled();
      const cloned = state.gymTemplates.find(t => t.name === 'Push Day pro Klárku 👸');
      expect(cloned).toBeDefined();
      expect(cloned.exercises[0].weight).toBe(64); // 80 * 0.8 = 64 kg
    });
  });
});
