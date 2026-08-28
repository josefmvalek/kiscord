import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks
vi.mock('../../js/core/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ data: [{ id: 'pr-1' }], error: null })),
      select: () => Promise.resolve({ data: [], error: null }),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
    })),
  },
}));

vi.mock('../../js/core/sound.js', () => ({
  playBeep: vi.fn(),
  playChime: vi.fn(),
  playArcade: vi.fn(),
}));

vi.mock('../../js/core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
  getTodayKey: () => '2026-08-26',
}));

vi.mock('../../js/core/theme.js', () => ({
  showNotification: vi.fn(),
  showConfirmDialog: vi.fn(() => Promise.resolve(true)),
}));

import {
  activeWorkout,
  setActiveWorkout,
  loadActiveWorkoutFromStorage,
  saveActiveWorkoutToStorage
} from '../../js/domains/fitness/gym/shared.js';

import {
  toggleSetComplete,
  addSetToActiveExercise,
  removeSetFromActiveExercise,
  adjustVal,
  adjustActiveExerciseWeight,
  toggleWorkoutChecklistItem,
  cycleSetRir
} from '../../js/domains/fitness/gym/active-workout/actions.js';

import { renderActiveWorkoutView } from '../../js/domains/fitness/gym/active-workout/render.js';
import { showNotification } from '../../js/core/theme.js';

describe('Active Workout - Set Operations & Fine-Grained Reactivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = `
      <div id="messages-container"></div>
      <div id="active-workout-progress" style="width: 0%"></div>
    `;

    // Set an active workout in shared state
    setActiveWorkout({
      template_id: 'test-tmpl',
      name: 'Chest Day 🦍',
      started_at: new Date().toISOString(),
      isMinimized: false,
      exercises: [
        {
          exercise_id: 'bench_press',
          name: 'Bench Press',
          category: 'Hrudník',
          rest_seconds: 90,
          sets: [
            { weight: 80, reps: 10, completed: false, type: 'N', rir: null },
            { weight: 85, reps: 8, completed: false, type: 'N', rir: null }
          ]
        }
      ]
    });
  });

  it('should toggle set completion without reference errors and update UI/storage', () => {
    const renderGymMock = vi.fn();
    const exIdx = 0;
    const setIdx = 0;

    // Render DOM structure for set-row
    document.body.innerHTML += `
      <div id="set-row-0-0">
        <button id="complete-btn-0-0"></button>
        <input id="weight-input-0-0" value="80" />
        <input id="reps-input-0-0" value="10" />
      </div>
      <div id="active-workout-progress" style="width: 0%"></div>
    `;

    expect(activeWorkout.exercises[0].sets[0].completed).toBe(false);

    // Toggle set complete
    expect(() => {
      toggleSetComplete(exIdx, setIdx, renderGymMock);
    }).not.toThrow();

    expect(activeWorkout.exercises[0].sets[0].completed).toBe(true);

    // Toggle set uncompleted
    expect(() => {
      toggleSetComplete(exIdx, setIdx, renderGymMock);
    }).not.toThrow();

    expect(activeWorkout.exercises[0].sets[0].completed).toBe(false);
  });

  it('should add a new set using fine-grained DOM patch without full page re-render when container exists', () => {
    const renderGymMock = vi.fn();
    document.body.innerHTML += `
      <div id="active-exercise-sets-0"></div>
      <span id="active-exercise-sets-count-0">2 sérií</span>
      <div id="active-workout-progress" style="width: 0%"></div>
    `;

    expect(activeWorkout.exercises[0].sets.length).toBe(2);

    addSetToActiveExercise(0, renderGymMock);

    expect(activeWorkout.exercises[0].sets.length).toBe(3);
    const addedSet = activeWorkout.exercises[0].sets[2];
    expect(addedSet.weight).toBe(85);
    expect(addedSet.reps).toBe(8);
    expect(addedSet.completed).toBe(false);

    // Fine-grained DOM update: should NOT call full page re-render
    expect(renderGymMock).not.toHaveBeenCalled();
    expect(document.getElementById('active-exercise-sets-count-0').textContent).toBe('3 sérií');
    expect(document.getElementById('set-row-0-2')).not.toBeNull();
  });

  it('should remove a set by index using fine-grained DOM patch without full page re-render', () => {
    const renderGymMock = vi.fn();
    document.body.innerHTML += `
      <div id="active-exercise-sets-0"></div>
      <span id="active-exercise-sets-count-0">2 sérií</span>
      <div id="active-workout-progress" style="width: 0%"></div>
    `;

    expect(activeWorkout.exercises[0].sets.length).toBe(2);

    removeSetFromActiveExercise(0, 1, renderGymMock);

    expect(activeWorkout.exercises[0].sets.length).toBe(1);
    expect(activeWorkout.exercises[0].sets[0].weight).toBe(80);

    // Fine-grained DOM update: should NOT call full page re-render
    expect(renderGymMock).not.toHaveBeenCalled();
    expect(document.getElementById('active-exercise-sets-count-0').textContent).toBe('1 sérií');
    expect(document.getElementById('set-row-0-0')).not.toBeNull();
    expect(document.getElementById('set-row-0-1')).toBeNull();
  });

  it('should prevent removing the last remaining set and show warning', () => {
    const renderGymMock = vi.fn();
    activeWorkout.exercises[0].sets = [{ weight: 80, reps: 10, completed: false, type: 'N' }];

    removeSetFromActiveExercise(0, 0, renderGymMock);

    expect(activeWorkout.exercises[0].sets.length).toBe(1);
    expect(showNotification).toHaveBeenCalledWith('Cvik musí mít alespoň 1 sérii!', 'warning');
  });

  it('should toggle checklist items and cycle RIR with fine-grained DOM updates without full page re-render', () => {
    const renderGymMock = vi.fn();
    document.body.innerHTML += `
      <button id="checklist-btn-creatine">💊 Kreatin</button>
      <button id="rir-btn-0-0">RIR -</button>
    `;

    toggleWorkoutChecklistItem('creatine', renderGymMock);
    expect(activeWorkout.checklist.creatine).toBe(true);
    expect(renderGymMock).not.toHaveBeenCalled();
    expect(document.getElementById('checklist-btn-creatine').textContent).toContain('✓');

    cycleSetRir(0, 0, renderGymMock);
    expect(activeWorkout.exercises[0].sets[0].rir).toBe(2);
    expect(renderGymMock).not.toHaveBeenCalled();
    expect(document.getElementById('rir-btn-0-0').textContent).toBe('RIR 2');
  });

  it('should render "+ Přidat sérii" and remove set button in active workout view HTML', () => {
    const html = renderActiveWorkoutView();
    expect(html).toContain('window.Gym.addSetToActiveExercise(0)');
    expect(html).toContain('window.Gym.removeSetFromActiveExercise(0, 0)');
    expect(html).toContain('Přidat sérii');
  });
});
