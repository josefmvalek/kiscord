import { describe, it, expect, beforeEach, vi } from 'vitest';

const createSelectChain = () => {
  const chain = {
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve) => Promise.resolve({ data: state.gymBodyMeasurements || [], error: null }).then(resolve),
    catch: (reject) => Promise.resolve({ data: state.gymBodyMeasurements || [], error: null }).catch(reject)
  };
  return chain;
};

const mockInsert = vi.fn((data) => ({
  select: vi.fn(() => Promise.resolve({ data: [Array.isArray(data) ? data[0] : data], error: null }))
}));

const mockDelete = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ error: null }))
}));

const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ error: null }))
}));

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => createSelectChain(),
      insert: mockInsert,
      delete: mockDelete,
      update: mockUpdate
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
  renderBodyTrackerTab,
  saveBodyMeasurement,
  deleteBodyMeasurement,
  openTransformationSliderModal
} from '../../js/modules/gym/bodyTracker.js';
import { state } from '../../js/core/state.js';

describe('Gym Body Tracker & Measurements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    state.currentUser = { id: 'user-jose', name: 'Jožka' };
    state.gymBodyMeasurements = [
      {
        id: 'bm-2',
        user_id: 'user-jose',
        date_key: '2026-08-17',
        weight: 78.5,
        body_fat: 14.0,
        waist: 82,
        arms: 38.5,
        chest: 104,
        thighs: 58,
        photo_url: 'https://example.com/after.jpg',
        notes: 'Forma po ranním tréninku'
      },
      {
        id: 'bm-1',
        user_id: 'user-jose',
        date_key: '2026-06-01',
        weight: 82.0,
        body_fat: 17.5,
        waist: 86,
        arms: 37.0,
        chest: 102,
        thighs: 59,
        photo_url: 'https://example.com/before.jpg',
        notes: 'Výchozí stav'
      }
    ];
  });

  describe('renderBodyTrackerTab', () => {
    it('renders latest stats with comparison differences', () => {
      const html = renderBodyTrackerTab();
      expect(html).toContain('78.5 kg');
      expect(html).toContain('-3.5 kg'); // 78.5 - 82.0 = -3.5
      expect(html).toContain('-3.5 %');  // 14.0 - 17.5 = -3.5
      expect(html).toContain('-4 cm');   // 82 - 86 = -4 cm (waist)
      expect(html).toContain('+1.5 cm'); // 38.5 - 37.0 = +1.5 cm (arms)
      expect(html).toContain('Před / Po');
    });

    it('renders empty state message when no measurements exist', () => {
      state.gymBodyMeasurements = [];
      const html = renderBodyTrackerTab();
      expect(html).toContain('Zatím nemáš zapsané žádné tělesné míry');
    });
  });

  describe('saveBodyMeasurement', () => {
    it('saves new measurement record into state and triggers notification', async () => {
      // Simulate modal inputs in DOM
      document.body.innerHTML = `
        <input id="bm-date" value="2026-08-17" />
        <input id="bm-weight" value="78.0" />
        <input id="bm-body-fat" value="13.8" />
        <input id="bm-waist" value="81" />
        <input id="bm-arms" value="39" />
        <input id="bm-chest" value="105" />
        <input id="bm-thighs" value="58" />
        <input id="bm-hips" value="97" />
        <input id="bm-photo-url" value="" />
        <input id="bm-notes" value="Před dovolenou" />
      `;

      await saveBodyMeasurement();

      expect(mockInsert).toHaveBeenCalled();
      expect(state.gymBodyMeasurements[0].weight).toBe(78.0);
      expect(state.gymBodyMeasurements[0].waist).toBe(81);
    });
  });

  describe('deleteBodyMeasurement', () => {
    it('deletes measurement from state when confirmed', async () => {
      await deleteBodyMeasurement('bm-2');

      expect(mockDelete).toHaveBeenCalled();
      expect(state.gymBodyMeasurements.find(m => m.id === 'bm-2')).toBeUndefined();
      expect(state.gymBodyMeasurements).toHaveLength(1);
    });
  });

  describe('openTransformationSliderModal', () => {
    it('opens before/after transformation modal when at least 2 photo logs exist', () => {
      openTransformationSliderModal();

      const modal = document.getElementById('transformation-modal');
      expect(modal).not.toBeNull();
      expect(modal.innerHTML).toContain('Porovnání Formy');
      expect(modal.innerHTML).toContain('Před: 2026-06-01');
      expect(modal.innerHTML).toContain('Po: 2026-08-17');
    });
  });
});
