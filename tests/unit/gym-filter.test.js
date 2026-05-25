import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all external modules imported by gym.js
vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => Promise.resolve({ data: [], error: null }),
      delete: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
  getTodayKey: () => '2026-05-25',
}));

vi.mock('../../js/core/state.js', () => ({
  state: {
    gymExercises: [],
    gymTemplates: [],
    gymLogs: [],
    gymPRs: [],
    currentUser: { id: 'user-1', name: 'Jožka' },
    user_ids: { jose: 'user-1', klarka: 'user-2' },
  },
  ensureGymData: () => Promise.resolve(),
  saveStateToCache: () => {},
}));

vi.mock('../../js/core/theme.js', () => ({
  showNotification: vi.fn(),
}));

vi.mock('../../js/core/ui.js', () => ({
  renderModal: () => '',
  renderInputGroup: () => '',
}));

import { filterModalExercises } from '../../js/modules/gym.js';

describe('Gym Exercise Modal Search Filter', () => {
  beforeEach(() => {
    // Setup a mock DOM for searching exercises
    document.body.innerHTML = `
      <div id="exercise-list">
        <label class="exercise-select-item" data-name="bench press" data-category="hrudník">
          <span>Bench Press</span>
        </label>
        <label class="exercise-select-item" data-name="dřep s velkou činkou" data-category="nohy">
          <span>Dřep s Velkou Činkou</span>
        </label>
        <label class="exercise-select-item" data-name="bicepsový zdvih s jč" data-category="ruce">
          <span>Bicepsový zdvih s JČ</span>
        </label>
      </div>
    `;
  });

  it('should display all items when query is empty', () => {
    filterModalExercises('');
    const items = document.querySelectorAll('.exercise-select-item');
    items.forEach(item => {
      expect(item.style.display).toBe('flex');
    });
  });

  it('should match search query by exercise name', () => {
    filterModalExercises('bench');
    
    const bench = document.querySelector('[data-name="bench press"]');
    const squat = document.querySelector('[data-name="dřep s velkou činkou"]');
    const curl = document.querySelector('[data-name="bicepsový zdvih s jč"]');

    expect(bench.style.display).toBe('flex');
    expect(squat.style.display).toBe('none');
    expect(curl.style.display).toBe('none');
  });

  it('should match search query by exercise category (partie)', () => {
    filterModalExercises('nohy');

    const bench = document.querySelector('[data-name="bench press"]');
    const squat = document.querySelector('[data-name="dřep s velkou činkou"]');
    const curl = document.querySelector('[data-name="bicepsový zdvih s jč"]');

    expect(bench.style.display).toBe('none');
    expect(squat.style.display).toBe('flex');
    expect(curl.style.display).toBe('none');
  });

  it('should handle case insensitivity and extra spaces', () => {
    filterModalExercises('  BICEPSOVÝ  ');

    const bench = document.querySelector('[data-name="bench press"]');
    const squat = document.querySelector('[data-name="dřep s velkou činkou"]');
    const curl = document.querySelector('[data-name="bicepsový zdvih s jč"]');

    expect(bench.style.display).toBe('none');
    expect(squat.style.display).toBe('none');
    expect(curl.style.display).toBe('flex');
  });
});
