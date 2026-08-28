import { describe, it, expect } from 'vitest';
import { ARENA_TOPICS, WHEEL_PRESETS } from '../../js/domains/entertainment/decision-arena.js';

describe('Couple Decision Arena Engine', () => {
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
