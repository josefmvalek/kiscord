import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }))
  },
}));

vi.mock('../../js/core/theme.js', () => ({
  changeTheme: vi.fn(),
  showNotification: vi.fn(),
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
}));

import { calculateLevelFromXP, LEVEL_MILESTONES } from '../../js/domains/entertainment/levels.js';

describe('Progressive Relationship Leveling 2.0', () => {
  it('should calculate Level 1 for 0 XP', () => {
    const res = calculateLevelFromXP(0);
    expect(res.level).toBe(1);
    expect(res.title).toBe('Mývalí začátečníci 🦝');
    expect(res.progressPercentage).toBe(0);
    expect(res.nextXP).toBe(100);
  });

  it('should calculate progress percentage inside Level 1', () => {
    const res = calculateLevelFromXP(50);
    expect(res.level).toBe(1);
    expect(res.progressPercentage).toBe(50);
    expect(res.xpInLevel).toBe(50);
    expect(res.xpNeededForLevel).toBe(100);
  });

  it('should promote to Level 2 at 100 XP', () => {
    const res = calculateLevelFromXP(100);
    expect(res.level).toBe(2);
    expect(res.title).toBe('Hledači pokladů 🔍');
    expect(res.progressPercentage).toBe(0);
    expect(res.minXP).toBe(100);
    expect(res.nextXP).toBe(250);
  });

  it('should correctly calculate higher milestones (Level 5 Forest and Level 10 Gold)', () => {
    const lvl5 = calculateLevelFromXP(700);
    expect(lvl5.level).toBe(5);
    expect(lvl5.theme).toBe('forest');
    expect(lvl5.title).toBe('Nerozlučná dvojka 🤝');

    const lvl10 = calculateLevelFromXP(3200);
    expect(lvl10.level).toBe(10);
    expect(lvl10.theme).toBe('gold');
    expect(lvl10.title).toBe('Legendární pár 🏆');
  });

  it('should handle edge cases and extreme high XP gracefully', () => {
    const resZero = calculateLevelFromXP(-50);
    expect(resZero.level).toBe(1);

    const resInfinite = calculateLevelFromXP(50000);
    expect(resInfinite.level).toBe(25);
    expect(resInfinite.title).toBe('Nekonečná láska ♾️');
  });
});
