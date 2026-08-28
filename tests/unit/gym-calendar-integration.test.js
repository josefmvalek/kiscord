import { describe, it, expect, beforeEach, vi } from 'vitest';

const { defaultMockExercises, defaultMockTemplates, defaultMockLogs } = vi.hoisted(() => {
  const defaultMockExercises = [
    { id: 'bench_press', name: 'Bench Press', category: 'Hrudník' },
    { id: 'squat', name: 'Dřep', category: 'Nohy' }
  ];
  const defaultMockTemplates = [
    { id: 'tmpl-push', name: 'Push Day 🦍', exercises: [{ exercise_id: 'bench_press', sets: 3, weight: 60, reps: 8 }] }
  ];
  const defaultMockLogs = [
    {
      id: 'log-1',
      user_id: 'user-jose',
      name: 'Push Day 🦍',
      duration_seconds: 3600,
      date_key: '2026-08-17',
      exercises: [
        {
          exercise_id: 'bench_press',
          exercise_name: 'Bench Press',
          sets: [{ weight: 85, reps: 8, completed: true }]
        }
      ],
      cheers: ['user-klarka']
    }
  ];
  return { defaultMockExercises, defaultMockTemplates, defaultMockLogs };
});

vi.mock('@core/supabase.js', async () => {
  const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
  return {
    supabase: createMockSupabase({
      gym_templates: defaultMockTemplates,
      gym_exercises: defaultMockExercises,
      gym_logs: defaultMockLogs
    })
  };
});

vi.mock('@core/utils.js', () => ({
  triggerHaptic: vi.fn(),
  triggerConfetti: vi.fn(),
  getTodayKey: () => '2026-08-17',
}));

vi.mock('@core/theme.js', () => ({
  showNotification: vi.fn(),
  showConfirmDialog: vi.fn(() => Promise.resolve(true)),
}));

import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { generateFilterButtons, generateCalendarGrid } from '@domains/lifestyle/calendar/grid.js';
import { showDayDetail, ensureModals, deleteGymLog, deleteGymPlan, openEditGymLog } from '@domains/lifestyle/calendar/modals.js';
import { saveScheduledTemplate, openManualLogModal, onManualTemplateChange, addManualSet, removeManualSet, saveManualLog, openEditGymLogModal, saveEditGymLog } from '@domains/fitness/gym/templates.js';

describe('Gym & Calendar Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    window.Gym = {
      onManualTemplateChange,
      removeManualSet
    };

    state.startDate = '2025-01-01';
    state.currentUser = { id: 'user-jose', name: 'Jožka' };
    state.user_ids = { jose: 'user-jose', klarka: 'user-klarka' };
    state.calendarFilter = 'all';
    state.shifts = {};
    state.healthData = {};
    state.plannedDates = {};
    state.schoolEvents = {};
    state.movieHistory = {};
    state.timelineEvents = [];
    state.brigadeDiary = [];
    state.gymExercises = [...defaultMockExercises];
    state.gymTemplates = [...defaultMockTemplates];
    state.gymLogs = [...defaultMockLogs];
    state.gymPRs = [
      {
        id: 'pr-1',
        user_id: 'user-jose',
        exercise_id: 'bench_press',
        weight: 85,
        reps: 8,
        achieved_at: '2026-08-17T10:00:00Z',
        log_id: 'log-1'
      }
    ];
  });

  it('includes gym filter button in generateFilterButtons()', () => {
    const buttonsHtml = generateFilterButtons();
    expect(buttonsHtml).toContain('Posilovna');
    expect(buttonsHtml).toContain('fa-dumbbell');
    expect(buttonsHtml).toContain('Calendar.setCalendarFilter(\'gym\')');
  });

  it('renders gym workout indicator in calendar grid for "all" filter mode', () => {
    state.calendarFilter = 'all';
    const gridHtml = generateCalendarGrid(2026, 7); // August 2026 (0-indexed month 7)
    expect(gridHtml).toContain('🏋️‍♂️');
    expect(gridHtml).toContain('Push Day 🦍');
  });

  it('renders gym details in "gym" filter mode', () => {
    state.calendarFilter = 'gym';
    const gridHtml = generateCalendarGrid(2026, 7);
    expect(gridHtml).toContain('Push Day 🦍');
    expect(gridHtml).toContain('60m');
    expect(gridHtml).toContain('1s'); // 1 set
  });

  it('renders planned workout in "gym" filter mode when scheduled in planned_dates', () => {
    state.calendarFilter = 'gym';
    state.plannedDates['2026-08-20'] = {
      id: 'plan-123',
      name: '🏋️‍♂️ Leg Day 🦵',
      cat: 'gym',
      date_key: '2026-08-20',
      time: '18:00'
    };

    const gridHtml = generateCalendarGrid(2026, 7);
    expect(gridHtml).toContain('🏋️‍♂️ Leg Day 🦵');
    expect(gridHtml).toContain('Plán');
  });

  it('renders rich gym section in Day Detail modal with completed workout and PR badge', () => {
    ensureModals();
    showDayDetail('2026-08-17');

    const modal = document.getElementById('cal-day-detail-modal') || document.getElementById('day-modal');
    expect(modal).not.toBeNull();
    expect(modal.innerHTML).toContain('Push Day 🦍');
    expect(modal.innerHTML).toContain('Posilovna');
  });

  it('saves scheduled template to planned_dates in database with cat: gym', async () => {
    document.body.innerHTML = `
      <select id="sched-template-id">
        <option value="tmpl-push" selected>Push Day 🦍</option>
      </select>
      <input type="date" id="sched-workout-date" value="2026-08-25">
      <input type="time" id="sched-workout-time" value="17:30">
      <input type="text" id="sched-workout-note" value="Společný trénink">
      <div id="schedule-template-modal"></div>
    `;

    const renderGymMock = vi.fn();
    await saveScheduledTemplate(renderGymMock);

    expect(state.plannedDates['2026-08-25']).toBeDefined();
    expect(state.plannedDates['2026-08-25'].cat).toBe('gym');
    expect(state.plannedDates['2026-08-25'].name).toContain('Push Day 🦍');
    expect(supabase.from).toHaveBeenCalledWith('planned_dates');
  });

  it('allows adding and removing individual sets in manual log modal', async () => {
    await openManualLogModal();
    window.Gym.onManualTemplateChange('tmpl-push');

    const setsContainer = document.getElementById('manual-sets-0');
    expect(setsContainer).not.toBeNull();
    // Template has 3 sets, so 3 rows should be rendered initially
    let rows = setsContainer.querySelectorAll('.manual-set-row');
    expect(rows.length).toBe(3);

    // Add a 4th set
    addManualSet(0, 70, 6);
    rows = setsContainer.querySelectorAll('.manual-set-row');
    expect(rows.length).toBe(4);
    const lastRow = rows[3];
    expect(lastRow.querySelector('.manual-set-num').textContent).toBe('4');
    expect(lastRow.querySelector('.manual-set-weight').value).toBe('70');
    expect(lastRow.querySelector('.manual-set-reps').value).toBe('6');

    // Remove the 2nd set
    const removeBtn = rows[1].querySelector('button');
    removeManualSet(removeBtn);
    rows = setsContainer.querySelectorAll('.manual-set-row');
    expect(rows.length).toBe(3);
    expect(rows[0].querySelector('.manual-set-num').textContent).toBe('1');
    expect(rows[1].querySelector('.manual-set-num').textContent).toBe('2');
    expect(rows[2].querySelector('.manual-set-num').textContent).toBe('3');
  });

  it('deletes completed workout and PRs from calendar modal', async () => {
    ensureModals();
    showDayDetail('2026-08-17');
    expect(state.gymLogs.length).toBe(1);

    await deleteGymLog('log-1', '2026-08-17');

    expect(state.gymLogs.find(l => l.id === 'log-1')).toBeUndefined();
    expect(state.gymPRs.find(p => p.log_id === 'log-1')).toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('gym_logs');
  });

  it('deletes planned gym workout from calendar modal', async () => {
    state.plannedDates['2026-08-20'] = {
      id: 'plan-123',
      name: '🏋️‍♂️ Leg Day 🦵',
      cat: 'gym',
      date_key: '2026-08-20'
    };

    await deleteGymPlan('plan-123', '2026-08-20');

    expect(state.plannedDates['2026-08-20']).toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('planned_dates');
  });

  it('opens edit workout modal with prefilled data and saves updates', async () => {
    await openEditGymLogModal('log-1', '2026-08-17');

    const modal = document.getElementById('edit-gym-log-modal');
    expect(modal).not.toBeNull();

    const nameInput = document.getElementById('edit-log-name');
    expect(nameInput.value).toBe('Push Day 🦍');

    // Modify workout name and set weight
    nameInput.value = 'Push Day Extrémní 🔥';
    const weightInput = modal.querySelector('.manual-set-weight');
    if (weightInput) weightInput.value = '90';

    await saveEditGymLog('log-1');

    const updatedLog = state.gymLogs.find(l => l.id === 'log-1');
    expect(updatedLog.name).toBe('Push Day Extrémní 🔥');
    expect(supabase.from).toHaveBeenCalledWith('gym_logs');
  });
});


