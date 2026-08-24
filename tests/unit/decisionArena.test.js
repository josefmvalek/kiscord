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
  triggerConfetti: vi.fn()
}));

vi.mock('../../js/core/sound.js', () => ({
  playFanfare: vi.fn(),
  playChime: vi.fn(),
  playHeartbeat: vi.fn()
}));

vi.mock('../../js/core/theme.js', () => ({
  showNotification: vi.fn()
}));

import { ARENA_TOPICS, WHEEL_PRESETS } from '../../js/domains/entertainment/decision-arena.js';
import { state } from '../../js/core/state.js';

describe('Couple Decision Arena Engine', () => {
  beforeEach(() => {
    state.currentUser = { name: 'Jožka', email: 'jozka@kiscord.app' };
    state.loveCoins = { jose: 20, klarka: 30 };
  });

  it('should define core relationship decision topics', () => {
    expect(ARENA_TOPICS.length).toBeGreaterThanOrEqual(4);
    const foodTopic = ARENA_TOPICS.find(t => t.id === 'food');
    expect(foodTopic).toBeDefined();
    expect(foodTopic.winnerBadge).toContain('Šéf Kuchyně');
  });

  it('should provide comprehensive presets for Wheel of Fortune', () => {
    expect(WHEEL_PRESETS.food).toBeDefined();
    expect(WHEEL_PRESETS.food.length).toBeGreaterThanOrEqual(5);
    expect(WHEEL_PRESETS.movie).toBeDefined();
    expect(WHEEL_PRESETS.chore).toBeDefined();
  });
});
