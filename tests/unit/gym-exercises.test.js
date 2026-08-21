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
  showConfirmDialog: vi.fn(() => Promise.resolve(true)),
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
import { showConfirmDialog } from '../../js/core/theme.js';
import { filterTabExercises, openEditExerciseModal, deleteExercise, startWorkout, onSetInputChange, updateGlobalWorkoutBadge } from '../../js/modules/gym.js';

describe('Gym Exercises Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock window.confirm and window.switchChannel
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
    it('should show only matching exercises and categories based on search query', () => {
      filterTabExercises('biceps');

      const items = document.querySelectorAll('.exercise-tab-item');
      expect(items[0].style.display).toBe('none'); // Bench press
      expect(items[1].style.display).toBe('none'); // Dřep
      expect(items[2].style.display).toBe('flex'); // Biceps

      const sections = document.querySelectorAll('.exercise-cat-section');
      expect(sections[0].style.display).toBe('none'); // Hrudník
      expect(sections[1].style.display).toBe('none'); // Nohy
      expect(sections[2].style.display).toBe('block'); // Ruce
    });

    it('should show all items if query is empty or spaces', () => {
      filterTabExercises('   ');

      const items = document.querySelectorAll('.exercise-tab-item');
      items.forEach(item => expect(item.style.display).toBe('flex'));

      const sections = document.querySelectorAll('.exercise-cat-section');
      sections.forEach(sec => expect(sec.style.display).toBe('block'));
    });
  });

  describe('openEditExerciseModal', () => {
    it('should render modal with existing exercise name and category prefilled', () => {
      openEditExerciseModal('custom_curl');

      const modal = document.getElementById('edit-exercise-modal');
      expect(modal).not.toBeNull();

      const nameInput = document.getElementById('edit-ex-name');
      expect(nameInput.value).toBe('Záhadný Biceps');

      const select = document.getElementById('edit-ex-cat');
      expect(select.value).toBe('Ruce');
    });
  });

  describe('deleteExercise', () => {
    it('should prompt confirmation and delete custom exercise not in templates directly', async () => {
      await deleteExercise('custom_curl');

      expect(showConfirmDialog).toHaveBeenCalled();
      // Should target gym_exercises
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'custom_curl');
    });

    it('should warning-confirm and clean templates using the exercise first, then delete', async () => {
      // Deleting bench_press which is in template temp-1
      await deleteExercise('bench_press');

      expect(showConfirmDialog).toHaveBeenCalled();
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
      document.body.innerHTML = `
        <div id="global-workout-mini-bar" class="hidden">
          <span id="mini-bar-title"></span>
          <span id="mini-bar-timer"></span>
          <span id="mini-bar-subtitle"></span>
        </div>
        <span id="mobile-nav-gym-dot" class="hidden"></span>
      `;
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

    it('should show global active workout mini-bar if active and user on a different channel', () => {
      startWorkout('temp-1');
      
      // Access state to change channel
      state.currentChannel = 'calendar';

      updateGlobalWorkoutBadge();

      const miniBar = document.getElementById('global-workout-mini-bar');
      expect(miniBar).toBeTruthy();
      expect(miniBar.classList.contains('hidden')).toBe(false);
    });

    it('should hide the floating mini-bar if user returns to gym-tracker channel', () => {
      startWorkout('temp-1');
      
      state.currentChannel = 'calendar';
      updateGlobalWorkoutBadge();

      // Switch back
      state.currentChannel = 'gym-tracker';
      updateGlobalWorkoutBadge();

      const miniBar = document.getElementById('global-workout-mini-bar');
      expect(miniBar.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Pokročilé logování sérií a Časovač odpočinku', () => {
    it('should pre-fill sets with type Normal and support set type cycling', async () => {
      const { cycleSetType } = await import('../../js/modules/gym.js');
      startWorkout('temp-1');

      // The workout should have 4 sets of Bench Press by default, all 'N' type
      const cached = JSON.parse(localStorage.getItem('kiscord_active_workout'));
      expect(cached.exercises[0].sets[0].type).toBe('N');

      // Cycle set type: N -> W
      cycleSetType(0, 0);
      const cached2 = JSON.parse(localStorage.getItem('kiscord_active_workout'));
      expect(cached2.exercises[0].sets[0].type).toBe('W');

      // Cycle set type: W -> D
      cycleSetType(0, 0);
      const cached3 = JSON.parse(localStorage.getItem('kiscord_active_workout'));
      expect(cached3.exercises[0].sets[0].type).toBe('D');
    });

    it('should load exercise-specific rest timers from template', async () => {
      // Mock template with specific rest_seconds
      state.gymTemplates = [
        { id: 'temp-rest', name: 'Timer Split', exercises: [{ exercise_id: 'bench_press', sets: 3, reps: 8, rest_seconds: 120 }] }
      ];

      startWorkout('temp-rest');

      const cached = JSON.parse(localStorage.getItem('kiscord_active_workout'));
      expect(cached.exercises[0].rest_seconds).toBe(120);
    });

    it('should dynamically append a new ad-hoc exercise during active workout', async () => {
      const { addExerciseToActiveWorkout } = await import('../../js/modules/gym.js');
      
      // Start initial workout
      state.gymTemplates = [
        { id: 'temp-1', name: 'Push Split 🦍', exercises: [{ exercise_id: 'bench_press', sets: 4, reps: 8 }] }
      ];
      startWorkout('temp-1');

      // Now add 'custom_curl' as ad-hoc exercise
      addExerciseToActiveWorkout('custom_curl');

      // Verify that active workout cache now has two exercises
      const cached = JSON.parse(localStorage.getItem('kiscord_active_workout'));
      expect(cached.exercises.length).toBe(2);
      expect(cached.exercises[1].exercise_id).toBe('custom_curl');
      expect(cached.exercises[1].sets.length).toBe(3); // Default 3 sets for ad-hoc with no history
    });
  });

  describe('Vizuální prvky cviků & Průvodce technikou', () => {
    it('should generate image thumbnail when image_url exists and emoji fallback when absent', async () => {
      const { getExerciseThumbnailHtml, getCategoryEmoji } = await import('../../js/modules/gym.js');

      expect(getCategoryEmoji('Hrudník')).toBe('🦍');
      expect(getCategoryEmoji('Záda')).toBe('🦅');
      expect(getCategoryEmoji('Neznámá')).toBe('🏋️‍♂️');

      const exWithImg = { id: 'ex-img', name: 'Bench', category: 'Hrudník', image_url: 'https://example.com/bench.png' };
      const htmlImg = getExerciseThumbnailHtml(exWithImg);
      expect(htmlImg).toContain('img src="https://example.com/bench.png"');

      const exNoImg = { id: 'ex-no-img', name: 'Dřep', category: 'Nohy', image_url: null };
      const htmlNoImg = getExerciseThumbnailHtml(exNoImg);
      expect(htmlNoImg).toContain('🦵');
    });

    it('should render technique guide modal with instructions and personal record', async () => {
      const { openExerciseGuideModal } = await import('../../js/modules/gym.js');

      state.gymExercises.push({
        id: 'guide_ex',
        name: 'Rozpažky na kladce',
        category: 'Hrudník',
        secondary_muscles: ['Přední ramena'],
        instructions: 'Udržujte hrudník nahoře a lokty v mírném úhlu.',
        image_url: 'https://example.com/fly.gif'
      });

      state.gymPRs.push({
        user_id: 'user-1',
        exercise_id: 'guide_ex',
        weight: 25,
        reps: 12
      });

      openExerciseGuideModal('guide_ex');

      const modal = document.getElementById('exercise-guide-modal');
      expect(modal).not.toBeNull();
      expect(modal.innerHTML).toContain('Rozpažky na kladce');
      expect(modal.innerHTML).toContain('Udržujte hrudník nahoře');
      expect(modal.innerHTML).toContain('Přední ramena');
      expect(modal.innerHTML).toContain('25 kg × 12 op.');
    });

    it('should prefill create exercise form inputs from preset template', async () => {
      const { applyExercisePreset, POPULAR_EXERCISE_PRESETS } = await import('../../js/modules/gym.js');

      expect(POPULAR_EXERCISE_PRESETS.length).toBeGreaterThan(5);

      document.body.innerHTML = `
        <input id="new-ex-name" value="">
        <select id="new-ex-cat"><option value="Hrudník">Hrudník</option><option value="Ramena">Ramena</option></select>
        <input id="new-ex-secondary" value="">
        <input id="new-ex-image-url" value="">
        <textarea id="new-ex-instructions"></textarea>
      `;

      applyExercisePreset(0);

      const nameInput = document.getElementById('new-ex-name');
      const imgInput = document.getElementById('new-ex-image-url');
      const preset0 = POPULAR_EXERCISE_PRESETS[0];

      expect(nameInput.value).toBe(preset0.name);
      expect(imgInput.value).toBe(preset0.image_url);
    });
  });

  describe('Phase 3: Couple Challenges & Advanced Workout Modes', () => {
    it('correctly detects sync workout day when both users trained', async () => {
      const { isSyncWorkoutDay, getAllSyncDays } = await import('../../js/modules/gym/coupleGym.js');
      state.currentUser = { id: 'user-1' };
      state.gymLogs = [
        { id: 'log-1', user_id: 'user-1', date_key: '2026-08-19' },
        { id: 'log-2', user_id: 'user-2', date_key: '2026-08-19' }
      ];

      expect(isSyncWorkoutDay('2026-08-19')).toBe(true);
      expect(getAllSyncDays()).toContain('2026-08-19');
    });

    it('returns false for sync day if only one user trained', async () => {
      const { isSyncWorkoutDay, getAllSyncDays } = await import('../../js/modules/gym/coupleGym.js');
      state.currentUser = { id: 'user-1' };
      state.gymLogs = [
        { id: 'log-1', user_id: 'user-1', date_key: '2026-08-19' }
      ];

      expect(isSyncWorkoutDay('2026-08-19')).toBe(false);
      expect(getAllSyncDays()).toHaveLength(0);
    });

    it('calculates couple weekly streak correctly', async () => {
      const { calculateCoupleStreak } = await import('../../js/modules/gym/coupleGym.js');
      state.currentUser = { id: 'user-1' };
      state.gymLogs = [
        { id: 'log-1', user_id: 'user-1', date_key: '2026-08-19', logged_at: '2026-08-19T10:00:00Z' },
        { id: 'log-2', user_id: 'user-2', date_key: '2026-08-19', logged_at: '2026-08-19T11:00:00Z' }
      ];

      const streak = calculateCoupleStreak();
      expect(streak.currentStreakWeeks).toBeGreaterThanOrEqual(1);
      expect(streak.thisWeekCompleted).toBe(true);
    });

    it('initializes Circuit mode with rounds count and supports round increments', async () => {
      const { incrementWorkoutRound, getActiveWorkout } = await import('../../js/modules/gym/activeWorkout.js');
      state.currentUser = { id: 'user-1' };
      state.gymTemplates = [
        {
          id: 'tmpl-circuit-1',
          name: 'Kruhový Fullbody',
          mode: 'circuit',
          circuit_rounds: 4,
          exercises: [
            { exercise_id: 'bench_press', sets: 3, reps: 10, weight: 50, superset_group: 'A' },
            { exercise_id: 'squat', sets: 3, reps: 10, weight: 20, superset_group: 'A' }
          ]
        }
      ];

      startWorkout('tmpl-circuit-1');
      const active = getActiveWorkout();
      expect(active).not.toBeNull();
      expect(active.mode).toBe('circuit');
      expect(active.circuitRounds).toBe(4);
      expect(active.currentRound).toBe(1);

      incrementWorkoutRound();
      expect(active.currentRound).toBe(2);
    });

    it('initializes AMRAP mode and supports round counting', async () => {
      const { incrementWorkoutRound, decrementWorkoutRound, getActiveWorkout } = await import('../../js/modules/gym/activeWorkout.js');
      state.currentUser = { id: 'user-1' };
      state.gymTemplates = [
        {
          id: 'tmpl-amrap-1',
          name: 'AMRAP Blast',
          mode: 'amrap',
          amrap_minutes: 25,
          exercises: [
            { exercise_id: 'bench_press', sets: 4, reps: 12, weight: 40 }
          ]
        }
      ];

      startWorkout('tmpl-amrap-1');
      const active = getActiveWorkout();
      expect(active).not.toBeNull();
      expect(active.mode).toBe('amrap');
      expect(active.amrapMinutes).toBe(25);
      expect(active.amrapRoundsCompleted).toBe(0);

      incrementWorkoutRound();
      expect(active.amrapRoundsCompleted).toBe(1);

      decrementWorkoutRound();
      expect(active.amrapRoundsCompleted).toBe(0);
    });

    it('preserves superset_group from template and allows cycling', async () => {
      const { toggleExerciseSuperset, getActiveWorkout } = await import('../../js/modules/gym/activeWorkout.js');
      state.currentUser = { id: 'user-1' };
      state.gymTemplates = [
        {
          id: 'tmpl-circuit-1',
          name: 'Kruhový Fullbody',
          mode: 'circuit',
          circuit_rounds: 4,
          exercises: [
            { exercise_id: 'bench_press', sets: 3, reps: 10, weight: 50, superset_group: 'A' }
          ]
        }
      ];

      startWorkout('tmpl-circuit-1');
      const active = getActiveWorkout();
      expect(active.exercises[0].superset_group).toBe('A');

      toggleExerciseSuperset(0);
      expect(active.exercises[0].superset_group).toBe('B');

      toggleExerciseSuperset(0);
      expect(active.exercises[0].superset_group).toBeNull();

      toggleExerciseSuperset(0);
      expect(active.exercises[0].superset_group).toBe('A');
    });
  });

  describe('Phase 4: Muscle Heat Map, REST MODE, Share Card & Wrapped', () => {
    it('calculates muscle heatmap sets and volume by muscle groups', async () => {
      const { calculateMuscleHeatmap, renderMuscleHeatMapCard } = await import('../../js/modules/gym/muscleMap.js');
      state.currentUser = { id: 'user-1' };
      state.gymLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          date_key: '2026-08-19',
          logged_at: '2026-08-19T10:00:00Z',
          exercises: [
            {
              exercise_name: 'Bench Press',
              category: 'Hrudník',
              sets: [
                { completed: true, weight: 80, reps: 8, type: 'N' },
                { completed: true, weight: 80, reps: 8, type: 'N' }
              ]
            },
            {
              exercise_name: 'Biceps Curls',
              category: 'Ruce',
              sets: [
                { completed: true, weight: 15, reps: 10, type: 'N' }
              ]
            }
          ]
        }
      ];

      const heatmap = calculateMuscleHeatmap('user-1', 30);
      expect(heatmap.totalSets).toBe(3);
      expect(heatmap.muscles.chest.sets).toBe(2);
      expect(heatmap.muscles.chest.volumeKg).toBe(1280);
      expect(heatmap.muscles.biceps.sets).toBe(1);

      const html = renderMuscleHeatMapCard('user-1');
      expect(html).toContain('Svalová Heat Mapa');
      expect(html).toContain('svg');
    });

    it('calculates fitness wrapped statistics with comparisons', async () => {
      const { calculateFitnessWrapped } = await import('../../js/modules/gym/annualWrapped.js');
      state.currentUser = { id: 'user-1' };
      state.gymLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          duration_seconds: 3600,
          date_key: '2026-08-19',
          exercises: [
            {
              exercise_name: 'Bench Press',
              sets: [
                { completed: true, weight: 100, reps: 10, type: 'N' }, // 1000 kg = 1 t
                { completed: true, weight: 100, reps: 10, type: 'N' }  // 1000 kg = 1 t
              ]
            }
          ]
        }
      ];
      state.gymPRs = [
        { id: 'pr-1', user_id: 'user-1', exercise_id: 'bench_press', weight: 100 }
      ];

      const wrapped = calculateFitnessWrapped('user-1');
      expect(wrapped.workoutsCount).toBe(1);
      expect(wrapped.totalHours).toBe(1);
      expect(wrapped.totalVolumeKg).toBe(2000);
      expect(wrapped.totalTons).toBe('2.0');
      expect(wrapped.topExercise.name).toBe('Bench Press');
      expect(wrapped.prsCount).toBe(1);
    });

    it('supports fullscreen rest mode controls and adjustment', async () => {
      const { openRestModeOverlay, adjustRestTime, skipRestTimer } = await import('../../js/modules/gym/activeWorkout.js');
      state.currentUser = { id: 'user-1' };
      
      openRestModeOverlay();
      const overlay = document.getElementById('fullscreen-rest-overlay');
      expect(overlay).not.toBeNull();
      expect(overlay.textContent).toContain('REST MODE');

      adjustRestTime(15);
      expect(overlay).not.toBeNull();

      skipRestTimer();
      expect(document.getElementById('fullscreen-rest-overlay')).toBeNull();
    });

    it('finds last exercise history for ghost performance data (Phase 5.1)', async () => {
      const { getLastExerciseHistory } = await import('../../js/modules/gym/analytics.js');
      state.currentUser = { id: 'user-1' };
      state.gymLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          date_key: '2026-08-10',
          exercises: [
            {
              exercise_id: 'bench_press',
              sets: [
                { completed: true, weight: 80, reps: 8, type: 'N' },
                { completed: true, weight: 85, reps: 6, type: 'N' }
              ]
            }
          ]
        }
      ];

      const history = getLastExerciseHistory('bench_press', 'user-1');
      expect(history).not.toBeNull();
      expect(history.dateKey).toBe('2026-08-10');
      expect(history.sets.length).toBe(2);
      expect(history.sets[0].weight).toBe(80);
      expect(history.sets[0].reps).toBe(8);
    });

    it('supports free workout start without template (Phase 5.1)', async () => {
      const { startFreeWorkout, getActiveWorkout } = await import('../../js/modules/gym/activeWorkout.js');
      startFreeWorkout();
      const active = getActiveWorkout();
      expect(active).not.toBeNull();
      expect(active.name).toContain('Volný trénink');
      expect(active.templateId).toBeNull();
      expect(active.exercises.length).toBe(0);
      expect(active.checklist.creatine).toBe(false);
    });

    it('supports exercise reordering up and down (Phase 5.2)', async () => {
      const { startFreeWorkout, addExerciseToActiveWorkout, moveExerciseUp, moveExerciseDown, getActiveWorkout } = await import('../../js/modules/gym/activeWorkout.js');
      startFreeWorkout();
      addExerciseToActiveWorkout('bench_press');
      addExerciseToActiveWorkout('squat');

      const active = getActiveWorkout();
      expect(active.exercises[0].exercise_id).toBe('bench_press');
      expect(active.exercises[1].exercise_id).toBe('squat');

      moveExerciseDown(0);
      expect(active.exercises[0].exercise_id).toBe('squat');
      expect(active.exercises[1].exercise_id).toBe('bench_press');

      moveExerciseUp(1);
      expect(active.exercises[0].exercise_id).toBe('bench_press');
      expect(active.exercises[1].exercise_id).toBe('squat');
    });

    it('supports swapping exercise alternative and saving machine notes (Phase 5.2)', async () => {
      const { startFreeWorkout, addExerciseToActiveWorkout, swapExercise, saveExerciseNotes, getActiveWorkout } = await import('../../js/modules/gym/activeWorkout.js');
      startFreeWorkout();
      addExerciseToActiveWorkout('bench_press');

      const active = getActiveWorkout();
      expect(active.exercises[0].exercise_id).toBe('bench_press');

      swapExercise(0, 'custom_curl');
      expect(active.exercises[0].exercise_id).toBe('custom_curl');
      expect(active.exercises[0].name).toBe('Záhadný Biceps');

      saveExerciseNotes(0, 'Sedák č. 4, kolík 10');
      expect(active.exercises[0].user_notes).toBe('Sedák č. 4, kolík 10');
    });

    it('supports cycling RIR and toggling checklist items (Phase 5.5)', async () => {
      const { startFreeWorkout, addExerciseToActiveWorkout, cycleSetRir, toggleWorkoutChecklistItem, getActiveWorkout } = await import('../../js/modules/gym/activeWorkout.js');
      startFreeWorkout();
      addExerciseToActiveWorkout('bench_press');

      const active = getActiveWorkout();
      expect(active.checklist.water).toBe(false);
      toggleWorkoutChecklistItem('water');
      expect(active.checklist.water).toBe(true);

      // Cycle RIR on set 0
      cycleSetRir(0, 0);
      expect(active.exercises[0].sets[0].rir).toBe(2);
      cycleSetRir(0, 0);
      expect(active.exercises[0].sets[0].rir).toBe(1);
    });
  });
});



