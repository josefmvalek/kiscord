import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'coupon_new_1' }], error: null })
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      })),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(function() {
        return Object.assign(Promise.resolve({ data: [], error: null }), {
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        });
      })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn().mockResolvedValue({})
    })),
    removeChannel: vi.fn()
  }
}));

vi.mock('../../js/core/theme.js', () => ({
  showNotification: vi.fn(),
  showConfirmDialog: vi.fn()
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn()
}));

vi.mock('../../js/core/sound.js', () => ({
  playCoinsSound: vi.fn()
}));

vi.mock('../../js/core/sync.js', () => ({
  notifyPartnerCouponGifted: vi.fn().mockResolvedValue({}),
  notifyPartnerCouponRedeemed: vi.fn().mockResolvedValue({})
}));

import { state } from '../../js/core/state.js';
import { buyCoupon, redeemCoupon, fulfillObligation, vetoCoupon } from '../../js/domains/couple/love-shop/actions.js';
import { cleanTitle, getItemDesign } from '../../js/domains/couple/love-shop/design.js';
import { attachActionDispatcher } from '../../js/shared/dom/action-dispatcher.js';

describe('Love Shop Modularized Actions & Helpers', () => {
  beforeEach(() => {
    state.currentUser = { id: 'user-jose' };
    state.user_ids = { jose: 'user-jose', klarka: 'user-klarka' };
    state.loveCoins = { jose: 200, klarka: 100 };
    state.shopItems = [
      { id: 'item-1', title: '👑 Pán Dálkového Ovladače', cost: 80, category: 'dominance' },
      { id: 'item-2', title: '🧼 Úklidový Free Pass', cost: 120, category: 'compromises' }
    ];
    state.inventory = [];
    state.partnerObligations = [];
    state.userCoupons = [];
  });

  describe('Design & Cleaning Helpers', () => {
    it('cleanTitle should strip leading emoji and trim text', () => {
      expect(cleanTitle('👑 Pán Dálkového Ovladače')).toBe('Pán Dálkového Ovladače');
      expect(cleanTitle('🧼   Úklidový Free Pass  ')).toBe('Úklidový Free Pass');
      expect(cleanTitle('')).toBe('');
    });

    it('getItemDesign should return styled fontawesome icon and glow color', () => {
      const design = getItemDesign('Pán Dálkového Ovladače');
      expect(design.fa).toContain('fa-tv');
      expect(design.border).toContain('amber');
    });
  });

  describe('Domain Actions', () => {
    it('should successfully buy perk for self, deduct coins, and update inventory optimistically', async () => {
      await buyCoupon('item-1', 'Test Note', 'self_perk');

      expect(state.loveCoins.jose).toBe(120); // 200 - 80
      expect(state.inventory.length).toBe(1);
      expect(state.inventory[0].note).toBe('Test Note');
      expect(state.inventory[0].owner_id).toBe('user-jose');
    });

    it('should reject purchase when balance is insufficient', async () => {
      state.loveCoins.jose = 30; // Item costs 80
      await buyCoupon('item-1', '', 'self_perk');

      expect(state.loveCoins.jose).toBe(30);
      expect(state.inventory.length).toBe(0);
    });

    it('should redeem perk and update coupon state', async () => {
      const coupon = { id: 'cp-1', is_redeemed: false, love_shop_items: { title: '👑 Ovladač' } };
      state.inventory = [coupon];

      await redeemCoupon('cp-1');
      expect(coupon.is_redeemed).toBe(true);
      expect(coupon.redeemed_at).toBeDefined();
    });

    it('should fulfill partner obligation and update coupon status', async () => {
      const obligation = { id: 'ob-1', is_fulfilled: false };
      state.partnerObligations = [obligation];

      await fulfillObligation('ob-1');
      expect(obligation.is_fulfilled).toBe(true);
      expect(obligation.fulfilled_at).toBeDefined();
    });
  });

  describe('Action Dispatcher Event Delegation', () => {
    it('should invoke registered handler when matching data-action element is clicked', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      button.setAttribute('data-action', 'buy-item');
      button.setAttribute('data-id', 'item-42');
      container.appendChild(button);

      let handledId = null;
      const cleanup = attachActionDispatcher(container, {
        'buy-item': (dataset) => {
          handledId = dataset.id;
        }
      });

      button.click();
      expect(handledId).toBe('item-42');

      cleanup();
    });
  });
});
