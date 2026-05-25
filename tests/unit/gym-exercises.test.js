import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all external modules imported by gym.js
const mockInsert = vi.fn(() => Promise.resolve({ data: [], error: null }));
const mockEq = vi.fn(() => Promise.resolve({ data: [], error: null }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockDelete = vi.fn(() => ({ eq: mockEq }));

vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    })),
  },
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
  getTodayKey: () => '2026-05-25',
}));

vi.mock('../../js/core/state.js', () => ({
  state: {
    gymExercises: [
      { id: 'bench_press', name: 'Bench Press', category: 'Hrudník', is_default: true },
      { id: 'squat', name: 'Dřep s Činkou', category: 'Nohy', is_default: true },
      { id: 'custom_curl', name: 'Záhadný Biceps', category: 'Ruce', is_default: false }
    ],
    gymTemplates: [
      { id: 'temp-1', name: 'Push Split 🦍', exercises: [{ exercise_id: 'bench_press', sets: 4, reps: 8 }] }
    ],
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
  renderModal: ({ id, title, subtitle, content, actions }) => `
    <div id="${id}">
      <h3>${title}</h3>
      <div>${content}</div>
      <div>${actions}</div>
    </div>
  `,
  renderInputGroup: ({ label, id, value }) => `
    <div>
      <label>${label}</label>
      <input id="${id}" value="${value || ''}">
    </div>
  `,
}));

import { state } from '../../js/core/state.js';
import { filterTabExercises, openEditExerciseModal, deleteExercise, startWorkout, onSetInputChange, updateGlobalWorkoutBadge } from '../../js/modules/gym.js';

describe('Gym Exercises Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock window.confirm and window.switchChannel
    global.confirm = vi.fn(() => true);
    window.switchChannel = vi.fn();

    // Setup a mock DOM for testing Cviky Tab
    document.body.innerHTML = `
      <div id="exercises-tab-list">
        <div class="exercise-cat-section" data-cat="hrudník" style="display: block;">
          <h3>Hrudník</h3>
          <div class="exercise-tab-item" data-name="bench press" style="display: flex;">Bench Press</div>
        </div>
        <div class="exercise-cat-section" data-cat="nohy" style="display: block;">
          <h3>Nohy</h3>
          <div class="exercise-tab-item" data-name="dřep s činkou" style="display: flex;">Dřep s Činkou</div>
        </div>
        <div class="exercise-cat-section" data-cat="ruce" style="display: block;">
          <h3>Ruce</h3>
          <div class="exercise-tab-item" data-name="záhadný biceps" style="display: flex;">Záhadný Biceps</div>
        </div>
      </div>
    `;
  });

  describe('filterTabExercises', () => {
    it('should filter items by name and hide empty categories', () => {
      filterTabExercises('dřep');

      const benchItem = document.querySelector('[data-name="bench press"]');
      const squatItem = document.querySelector('[data-name="dřep s činkou"]');
      const curlItem = document.querySelector('[data-name="záhadný biceps"]');

      const chestSection = document.querySelector('[data-cat="hrudník"]');
      const legsSection = document.querySelector('[data-cat="nohy"]');
      const armsSection = document.querySelector('[data-cat="ruce"]');

      expect(benchItem.style.display).toBe('none');
      expect(squatItem.style.display).toBe('flex');
      expect(curlItem.style.display).toBe('none');

      expect(chestSection.style.display).toBe('none');
      expect(legsSection.style.display).toBe('block');
      expect(armsSection.style.display).toBe('none');
    });
  });

  describe('openEditExerciseModal', () => {
    it('should open the edit exercise modal with prefilled data', () => {
      openEditExerciseModal('custom_curl');

      const modal = document.getElementById('edit-exercise-modal');
      expect(modal).toBeTruthy();
      expect(modal.innerHTML).toContain('Upravit Cvik');

      const nameInput = document.getElementById('edit-ex-name');
      expect(nameInput.value).toBe('Záhadný Biceps');

      const select = document.getElementById('edit-ex-cat');
      expect(select.value).toBe('Ruce');
    });
  });

  describe('deleteExercise', () => {
    it('should prompt confirmation and delete custom exercise not in templates directly', async () => {
      await deleteExercise('custom_curl');

      expect(global.confirm).toHaveBeenCalled();
      // Should target gym_exercises
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'custom_curl');
    });

    it('should warning-confirm and clean templates using the exercise first, then delete', async () => {
      // Deleting bench_press which is in template temp-1
      await deleteExercise('bench_press');

      expect(global.confirm).toHaveBeenCalled();
      // 1. Should update template temp-1 to empty exercises list
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'temp-1');

      // 2. Should delete bench_press exercise
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'bench_press');
    });
  });

  describe('Premium Multitasking & Badge Management', () => {
    beforeEach(() => {
      // Clean up body
      const badge = document.getElementById('global-active-workout-badge');
      badge?.remove();
      localStorage.removeItem('kiscord_active_workout');
    });

    it('should update activeWorkout sets and save to storage on input changes', () => {
      // Start workout
      startWorkout('temp-1');

      // Update values
      onSetInputChange(0, 0, 'weight', 85);
      onSetInputChange(0, 0, 'reps', 12);

      // Verify cached values
      const cached = JSON.parse(localStorage.getItem('kiscord_active_workout'));
      expect(cached).toBeTruthy();
      expect(cached.exercises[0].sets[0].weight).toBe(85);
      expect(cached.exercises[0].sets[0].reps).toBe(12);
    });

    it('should render a global active workout badge if active and user on a different channel', () => {
      startWorkout('temp-1');
      
      // Access state to change channel
      state.currentChannel = 'calendar';

      updateGlobalWorkoutBadge();

      const badge = document.getElementById('global-active-workout-badge');
      expect(badge).toBeTruthy();
      expect(badge.innerHTML).toContain('Běží trénink');
    });

    it('should remove the floating badge if user returns to gym-tracker channel', () => {
      startWorkout('temp-1');
      
      state.currentChannel = 'calendar';
      updateGlobalWorkoutBadge();

      // Switch back
      state.currentChannel = 'gym-tracker';
      updateGlobalWorkoutBadge();

      const badge = document.getElementById('global-active-workout-badge');
      expect(badge).toBeNull();
    });
  });
});
