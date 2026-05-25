import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

vi.mock('../../js/core/state.js', () => {
  return {
    state: {
      currentUser: { id: 'jose-123' },
    },
  };
});

import { calculateSM2 } from '../../js/modules/spaced_repetition.js';

describe('Spaced Repetition Algorithm (SM-2)', () => {
  it('should initialize stats when currentStats is undefined or empty', () => {
    // Under SM-2, undefined input defaults to ease_factor: 2.5, interval: 0, repetition_count: 0.
    // If result is 'good':
    // - repetition_count becomes 1
    // - interval becomes 1
    // - ease_factor increases from 2.5 by 0.1 to 2.6
    const statsGood = calculateSM2(null, 'good');
    expect(statsGood.repetition_count).toBe(1);
    expect(statsGood.interval).toBe(1);
    expect(statsGood.ease_factor).toBe(2.6);
    expect(statsGood.next_review).toBeDefined();
    expect(statsGood.last_review).toBeDefined();

    // If result is 'bad':
    // - repetition_count becomes 0
    // - interval becomes 1
    // - ease_factor decreases from 2.5 by 0.2 to 2.3
    const statsBad = calculateSM2(null, 'bad');
    expect(statsBad.repetition_count).toBe(0);
    expect(statsBad.interval).toBe(1);
    expect(statsBad.ease_factor).toBe(2.3);
  });

  it('should advance intervals correctly on sequential correct reviews', () => {
    // 1st correct review (repetition_count: 0 -> 1)
    let stats = calculateSM2(null, 'good');
    expect(stats.repetition_count).toBe(1);
    expect(stats.interval).toBe(1);

    // 2nd correct review (repetition_count: 1 -> 2)
    stats = calculateSM2(stats, 'good');
    expect(stats.repetition_count).toBe(2);
    expect(stats.interval).toBe(6);

    // 3rd correct review (repetition_count: 2 -> 3)
    // interval = Math.round(6 * ease_factor) = Math.round(6 * 2.7) = 16
    stats = calculateSM2(stats, 'good');
    expect(stats.repetition_count).toBe(3);
    expect(stats.interval).toBe(16);
    expect(stats.ease_factor).toBeCloseTo(2.8);
  });

  it('should reset progress when review is bad', () => {
    // Setup high progress state
    const current = {
      repetition_count: 4,
      interval: 45,
      ease_factor: 2.9,
    };

    const stats = calculateSM2(current, 'bad');
    expect(stats.repetition_count).toBe(0);
    expect(stats.interval).toBe(1);
    expect(stats.ease_factor).toBeCloseTo(2.7); // 2.9 - 0.2
  });

  it('should respect ease factor lower limit of 1.3', () => {
    const lowEase = {
      repetition_count: 1,
      interval: 1,
      ease_factor: 1.4,
    };

    const stats = calculateSM2(lowEase, 'bad');
    expect(stats.ease_factor).toBe(1.3); // capped at 1.3
  });
});
