import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn()
    }))
  },
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
  getTodayKey: vi.fn(() => '2026-08-21')
}));

vi.mock('../../js/core/sound.js', () => ({
  playHeartbeat: vi.fn(),
  playFanfare: vi.fn(),
  playChime: vi.fn(),
  playPageFlip: vi.fn()
}));

import { state } from '../../js/core/state.js';
import { calculateCoupleWrapped } from '../../js/modules/coupleWrapped.js';

describe('Spotify-Style Couple Wrapped Analytics Engine', () => {
  beforeEach(() => {
    state.currentUser = { name: 'Jožka', email: 'jozka@kiscord.app' };
    state.gymLogs = [
      {
        logged_at: '2026-08-10',
        duration_seconds: 3600,
        exercises: [
          {
            name: 'Bench Press',
            sets: [
              { completed: true, weight: 100, reps: 10, type: 'N' },
              { completed: true, weight: 100, reps: 10, type: 'N' }
            ]
          }
        ]
      },
      {
        logged_at: '2026-08-15',
        duration_seconds: 1800,
        exercises: [
          {
            name: 'Dřepy',
            sets: [
              { completed: true, weight: 150, reps: 10, type: 'N' }
            ]
          }
        ]
      }
    ];

    state.ratings = {
      'm1': { status: 'seen', rating: 5, updated_at: '2026-08-12' },
      'm2': { status: 'seen', rating: 4.5, updated_at: '2026-08-14' }
    };

    state.watchlist = [
      { id: 'w1', is_mutual: true },
      { id: 'w2', hearted_by_both: true }
    ];

    state.inventory = [
      { id: 'c1', is_redeemed: true, redeemed_at: '2026-08-05', title: 'Masáž zad', cost: 20 },
      { id: 'c2', is_redeemed: true, redeemed_at: '2026-08-12', title: 'Snídaně do postele', cost: 15 }
    ];

    state.coopQuests = [
      { id: 'q1', is_completed: true }
    ];

    state.healthData = {
      '2026-08-10': { water: 8, mood: 9, sleep: 8 },
      '2026-08-11': { water: 8, mood: 10, sleep: 7 }
    };
  });

  it('should accurately calculate total fitness tonnage and comparisons', () => {
    const wrapped = calculateCoupleWrapped('all');
    // Bench: 100*10*2 = 2000kg. Dřepy: 150*10 = 1500kg. Total: 3500kg = 3.5 tons.
    expect(wrapped.totalVolumeKg).toBe(3500);
    expect(wrapped.totalTons).toBe('3.5');
    expect(wrapped.gymWorkoutsCount).toBe(2);
    expect(wrapped.totalGymHours).toBe(2); // (3600+1800)/3600 = 1.5 rounded to 2
  });

  it('should aggregate seen media and mutual matches', () => {
    const wrapped = calculateCoupleWrapped('all');
    expect(wrapped.seenMediaCount).toBe(2);
    expect(wrapped.topRatedCount).toBe(2);
    expect(wrapped.mutualMatchesCount).toBe(2);
  });

  it('should summarize redeemed love shop coupons and categories', () => {
    const wrapped = calculateCoupleWrapped('all');
    expect(wrapped.redeemedCouponsCount).toBe(2);
    expect(wrapped.massageCount).toBe(1);
    expect(wrapped.breakfastCount).toBe(1);
    expect(wrapped.totalCoinsSpent).toBe(35);
  });

  it('should aggregate health metrics like water and mood', () => {
    const wrapped = calculateCoupleWrapped('all');
    expect(wrapped.totalWaterDroplets).toBe(16);
    expect(wrapped.avgMood).toBe('9.5');
    expect(wrapped.totalSleepHours).toBe(15);
  });

  it('should compute relationship level and rank title', () => {
    const wrapped = calculateCoupleWrapped('all');
    expect(wrapped.relationshipLevel).toBeGreaterThanOrEqual(1);
    expect(typeof wrapped.rankTitle).toBe('string');
  });

  it('should aggregate bucket list, days together and tetris leader', () => {
    state.bucketList = [
      { id: 'b1', is_completed: true },
      { id: 'b2', is_completed: false }
    ];
    state.tetris = { jose: 1500, klarka: 1200 };

    const wrapped = calculateCoupleWrapped('all');
    expect(wrapped.completedBucketCount).toBe(1);
    expect(wrapped.tetrisLeader).toBe('Jožka');
    expect(wrapped.daysTogether).toBeGreaterThanOrEqual(0);
  });
});
