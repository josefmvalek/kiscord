import { describe, it, expect, beforeEach, vi } from 'vitest';

const { defaultMockSplits, defaultMockTemplates, defaultMockExercises } = vi.hoisted(() => {
    const defaultMockTemplates = [
        { id: 'tmpl-push', name: 'Push Day 🦍', exercises: [{ exercise_id: 'bench_press', sets: 4, weight: 80, reps: 8 }] },
        { id: 'tmpl-pull', name: 'Pull Day 🧗‍♂️', exercises: [{ exercise_id: 'pull_up', sets: 4, weight: 0, reps: 10 }] },
        { id: 'tmpl-legs', name: 'Leg Day 🦵', exercises: [{ exercise_id: 'squat', sets: 4, weight: 100, reps: 8 }] },
        { id: 'tmpl-upper', name: 'Upper Body ⚡', exercises: [{ exercise_id: 'bench_press', sets: 3, weight: 70, reps: 10 }] }
    ];

    const defaultMockSplits = [
        {
            id: 'split-1',
            user_id: 'user-jose',
            name: 'Push Pull Legs 4-denní',
            description: 'Klasický objemový split',
            is_active: true,
            rotation_mode: 'fixed_days',
            schedule_pattern: [
                { dayOfWeek: 1, splitName: 'Push Day 🦍', isRest: false, templateId: 'tmpl-push', preferredTime: '17:00' },
                { dayOfWeek: 2, splitName: 'Volno / Regenerace 🛌', isRest: true, templateId: null, preferredTime: null },
                { dayOfWeek: 3, splitName: 'Pull Day 🧗‍♂️', isRest: false, templateId: 'tmpl-pull', preferredTime: '17:00' },
                { dayOfWeek: 4, splitName: 'Volno / Regenerace 🛌', isRest: true, templateId: null, preferredTime: null },
                { dayOfWeek: 5, splitName: 'Leg Day 🦵', isRest: false, templateId: 'tmpl-legs', preferredTime: '16:30' },
                { dayOfWeek: 6, splitName: 'Upper Body ⚡', isRest: false, templateId: 'tmpl-upper', preferredTime: '11:00' },
                { dayOfWeek: 7, splitName: 'Volno / Regenerace 🛌', isRest: true, templateId: null, preferredTime: null }
            ]
        }
    ];

    const defaultMockExercises = [
        { id: 'bench_press', name: 'Bench Press', category: 'Hrudník' },
        { id: 'squat', name: 'Dřep', category: 'Nohy' }
    ];

    return { defaultMockSplits, defaultMockTemplates, defaultMockExercises };
});

vi.mock('@core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase({
            training_splits: defaultMockSplits,
            gym_templates: defaultMockTemplates,
            gym_exercises: defaultMockExercises,
            gym_logs: []
        })
    };
});

vi.mock('@core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    getTodayKey: () => '2026-08-17' // Monday
}));

vi.mock('@core/theme.js', () => ({
    showNotification: vi.fn(),
    showConfirmDialog: vi.fn(() => Promise.resolve(true))
}));

import { state } from '@core/state.js';
import {
    DAYS_OF_WEEK,
    SPLIT_PRESETS,
    getActiveTrainingSplit,
    getActiveSplitForDay,
    renderSplitOverviewBarHtml,
    openSplitManagerModal,
    onSplitDayRestToggle,
    applySplitPreset,
    saveTrainingSplitFromForm,
    deleteTrainingSplit,
    shiftActiveSplitDays,
    startSplitWorkout
} from '@domains/fitness/gym/splits.js';

describe('Gym Training Splits Module', () => {
    beforeEach(() => {
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        state.trainingSplits = JSON.parse(JSON.stringify(defaultMockSplits));
        state.gymTemplates = JSON.parse(JSON.stringify(defaultMockTemplates));
        state.activeTrainingSplit = state.trainingSplits[0];
        document.body.innerHTML = '';
    });

    it('should provide complete DAYS_OF_WEEK configuration (Po-Ne)', () => {
        expect(DAYS_OF_WEEK).toHaveLength(7);
        expect(DAYS_OF_WEEK[0].name).toBe('Pondělí');
        expect(DAYS_OF_WEEK[6].name).toBe('Neděle');
    });

    it('should have standard split presets (PPL 4-day, Upper/Lower, PPL 3-day, Full Body, Arnold)', () => {
        expect(SPLIT_PRESETS.ppl_4day).toBeDefined();
        expect(SPLIT_PRESETS.upper_lower_4day).toBeDefined();
        expect(SPLIT_PRESETS.ppl_3day).toBeDefined();
        expect(SPLIT_PRESETS.full_body_3day).toBeDefined();
        expect(SPLIT_PRESETS.arnold_5day).toBeDefined();

        expect(SPLIT_PRESETS.ppl_4day.pattern).toHaveLength(7);
    });

    it('should retrieve active training split for current user', () => {
        const active = getActiveTrainingSplit();
        expect(active).toBeDefined();
        expect(active.id).toBe('split-1');
        expect(active.name).toBe('Push Pull Legs 4-denní');
    });

    it('should return correct split configuration for specific day of week or dateKey', () => {
        // Monday (1) -> Push Day
        const mondaySplit = getActiveSplitForDay(1);
        expect(mondaySplit).toBeDefined();
        expect(mondaySplit.isRest).toBe(false);
        expect(mondaySplit.splitName).toBe('Push Day 🦍');
        expect(mondaySplit.template).toBeDefined();
        expect(mondaySplit.template.name).toBe('Push Day 🦍');

        // Tuesday (2) -> Rest Day
        const tuesdaySplit = getActiveSplitForDay(2);
        expect(tuesdaySplit.isRest).toBe(true);

        // DateKey string: '2026-08-17' (Monday)
        const dateKeySplit = getActiveSplitForDay('2026-08-17');
        expect(dateKeySplit.splitName).toBe('Push Day 🦍');
    });

    it('should render Split Overview Strip HTML correctly', () => {
        const html = renderSplitOverviewBarHtml();
        expect(html).toContain('Push Pull Legs 4-denní');
        expect(html).toContain('4× týdně');
        expect(html).toContain('Po');
        expect(html).toContain('Push Day 🦍');
    });

    it('should render empty state when no split is configured', () => {
        state.trainingSplits = [];
        state.activeTrainingSplit = null;
        const html = renderSplitOverviewBarHtml();
        expect(html).toContain('Nastav si svůj tréninkový split');
        expect(html).toContain('Nastavit split');
    });

    it('should open Split Manager Modal and render 7-day form inputs', async () => {
        await openSplitManagerModal('split-1');
        const modal = document.getElementById('split-manager-modal');
        expect(modal).not.toBeNull();
        expect(modal.innerHTML).toContain('Tréninkový Split & Týdenní Rozvrh');
        expect(document.getElementById('split-name-input').value).toBe('Push Pull Legs 4-denní');
        expect(document.getElementById('split-day-row-1')).not.toBeNull();
        expect(document.getElementById('split-day-row-7')).not.toBeNull();
    });

    it('should apply split preset and populate day inputs with auto-matched templates', () => {
        document.body.innerHTML = `
            <input type="text" id="split-name-input" value="" />
            <input type="text" id="split-desc-input" value="" />
            <div id="split-days-container"></div>
        `;

        applySplitPreset('upper_lower_4day');
        expect(document.getElementById('split-name-input').value).toContain('Upper / Lower');
        expect(document.getElementById('split-days-container').innerHTML).toContain('Upper Body A');
    });

    it('should shift split days forward (+1 day) correctly', async () => {
        const initialMon = state.activeTrainingSplit.schedule_pattern[0].splitName;
        expect(initialMon).toBe('Push Day 🦍');

        await shiftActiveSplitDays(1);

        // After shift +1, dayOfWeek 1 will have what was on Sunday (Rest Day)
        const updatedMon = state.activeTrainingSplit.schedule_pattern[0];
        expect(updatedMon.isRest).toBe(true);
    });

    it('should handle startSplitWorkout', async () => {
        await expect(startSplitWorkout('tmpl-push')).resolves.not.toThrow();
        await expect(startSplitWorkout(null)).resolves.not.toThrow();
    });
});
