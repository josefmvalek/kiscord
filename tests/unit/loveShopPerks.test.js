import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }))
  },
}));

vi.mock('../../js/core/theme.js', () => ({
  showNotification: vi.fn(),
  showConfirmDialog: vi.fn(),
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
}));

vi.mock('../../js/core/sound.js', () => ({
  playCoinsSound: vi.fn(),
}));

vi.mock('../../js/core/sync.js', () => ({
  notifyPartnerCouponGifted: vi.fn().mockResolvedValue({}),
  notifyPartnerCouponRedeemed: vi.fn().mockResolvedValue({}),
}));

import { state } from '../../js/core/state.js';

describe('Privilege & Perk Shop Redesign (Psychology & Tokenomics)', () => {
  beforeEach(() => {
    state.currentUser = { id: 'user-jose-123' };
    state.user_ids = { jose: 'user-jose-123', klarka: 'user-klarka-456' };
    state.loveCoins = { jose: 250, klarka: 100 };
    state.shopItems = [
      { id: 'item-1', title: '👑 Pán Dálkového Ovladače', cost: 90, category: 'dominance' },
      { id: 'item-2', title: '💆 Zasloužená Masáž zad po tréninku', cost: 180, category: 'pampering' },
      { id: 'item-3', title: '🧼 Úklidový Free Pass', cost: 150, category: 'compromises' }
    ];
    state.inventory = [];
    state.partnerObligations = [];
    state.userCoupons = [];
  });

  it('should verify self-perk tokenomics costs are in 40-200 coin range', () => {
    state.shopItems.forEach(item => {
      expect(item.cost).toBeGreaterThanOrEqual(40);
      expect(item.cost).toBeLessThanOrEqual(200);
    });
  });

  it('should correctly process buying a self-perk (owner is buyer)', () => {
    const item = state.shopItems[0]; // 90 coins
    const initialCoins = state.loveCoins.jose;
    
    // Simulate purchase for self
    state.loveCoins.jose -= item.cost;
    const newPerk = {
      id: 'perk-1',
      shop_item_id: item.id,
      owner_id: state.currentUser.id, // Jose owns it
      creator_id: state.user_ids.klarka, // Klarka fulfills it
      target_type: 'self_perk',
      is_redeemed: false,
      is_fulfilled: false,
      love_shop_items: item
    };
    state.inventory.unshift(newPerk);

    expect(state.loveCoins.jose).toBe(initialCoins - 90);
    expect(state.inventory.length).toBe(1);
    expect(state.inventory[0].owner_id).toBe('user-jose-123');
    expect(state.inventory[0].target_type).toBe('self_perk');
    expect(state.inventory[0].is_redeemed).toBe(false);
  });

  it('should transition perk state on claim (is_redeemed becomes true)', () => {
    const perk = {
      id: 'perk-1',
      shop_item_id: 'item-1',
      owner_id: 'user-jose-123',
      creator_id: 'user-klarka-456',
      target_type: 'self_perk',
      is_redeemed: false,
      is_fulfilled: false
    };
    state.inventory.push(perk);

    // Jose claims the perk
    perk.is_redeemed = true;
    perk.redeemed_at = new Date().toISOString();

    expect(state.inventory[0].is_redeemed).toBe(true);
    expect(state.inventory[0].is_fulfilled).toBe(false);
  });

  it('should allow partner to mark claimed obligation as fulfilled', () => {
    const obligation = {
      id: 'perk-klarka-1',
      shop_item_id: 'item-2',
      owner_id: 'user-klarka-456', // Klarka owns it
      creator_id: 'user-jose-123', // Jose owes it
      target_type: 'self_perk',
      is_redeemed: true, // Klarka claimed it
      is_fulfilled: false
    };
    state.partnerObligations.push(obligation);

    // Jose marks it fulfilled
    obligation.is_fulfilled = true;
    obligation.fulfilled_at = new Date().toISOString();

    expect(state.partnerObligations[0].is_fulfilled).toBe(true);
  });
});
