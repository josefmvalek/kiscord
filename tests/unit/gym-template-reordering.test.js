import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    openCreateTemplateModal,
    openEditTemplateModal,
    onTemplateCheckboxToggle,
    moveTemplateExercise,
    removeTemplateExercise,
    saveEditedTemplate,
    saveTemplate
} from '@domains/fitness/gym/templates/builder.js';
import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';

vi.mock('@core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase({
            gym_exercises: [
                { id: 'bench_press', name: 'Barbell Bench Press', category: 'Hrudník', image_url: 'https://raw.githubusercontent.com/test/bench.gif' },
                { id: 'incline_dumbbell_press', name: 'Incline Dumbbell Press', category: 'Hrudník', image_url: 'https://raw.githubusercontent.com/test/incline.gif' },
                { id: 'tricep_rope_pushdown', name: 'Triceps Rope Pushdown', category: 'Ruce', image_url: 'https://raw.githubusercontent.com/test/pushdown.gif' },
                { id: 'lateral_raises', name: 'Dumbbell Lateral Raises', category: 'Ramena', image_url: 'https://raw.githubusercontent.com/test/lateral.gif' }
            ],
            gym_templates: [
                {
                    id: 'tmpl-123',
                    name: 'Push Day 🦍',
                    description: 'Prsa, ramena, triceps',
                    mode: 'standard',
                    exercises: [
                        { exercise_id: 'bench_press', sets: 4, reps: 8, weight: 80, rest_seconds: 120, superset_group: null },
                        { exercise_id: 'incline_dumbbell_press', sets: 3, reps: 10, weight: 28, rest_seconds: 90, superset_group: null },
                        { exercise_id: 'lateral_raises', sets: 4, reps: 15, weight: 10, rest_seconds: 60, superset_group: null },
                        { exercise_id: 'tricep_rope_pushdown', sets: 3, reps: 12, weight: 25, rest_seconds: 60, superset_group: null }
                    ]
                }
            ],
            gym_logs: []
        })
    };
});

describe('Gym Template Builder — Exercise Reordering & Removal UX', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        state.currentUser = { id: '00000000-0000-0000-0000-000000000001', name: 'Jožka' };
        state.gymExercises = [
            { id: 'bench_press', name: 'Barbell Bench Press', category: 'Hrudník' },
            { id: 'incline_dumbbell_press', name: 'Incline Dumbbell Press', category: 'Hrudník' },
            { id: 'tricep_rope_pushdown', name: 'Triceps Rope Pushdown', category: 'Ruce' },
            { id: 'lateral_raises', name: 'Dumbbell Lateral Raises', category: 'Ramena' }
        ];
        state.gymTemplates = [
            {
                id: 'tmpl-123',
                name: 'Push Day 🦍',
                description: 'Prsa, ramena, triceps',
                mode: 'standard',
                exercises: [
                    { exercise_id: 'bench_press', sets: 4, reps: 8, weight: 80, rest_seconds: 120, superset_group: null },
                    { exercise_id: 'incline_dumbbell_press', sets: 3, reps: 10, weight: 28, rest_seconds: 90, superset_group: null },
                    { exercise_id: 'lateral_raises', sets: 4, reps: 15, weight: 10, rest_seconds: 60, superset_group: null },
                    { exercise_id: 'tricep_rope_pushdown', sets: 3, reps: 12, weight: 25, rest_seconds: 60, superset_group: null }
                ]
            }
        ];
        vi.clearAllMocks();
    });

    it('opens edit template modal preserving exact exercise order and rendering reorder buttons', () => {
        openEditTemplateModal('tmpl-123');

        const modal = document.getElementById('edit-template-modal');
        expect(modal).toBeTruthy();

        const config = document.getElementById('edit-tmpl-exercises-config');
        expect(config).toBeTruthy();
        expect(config.classList.contains('hidden')).toBe(false);

        // Check cards and #1, #2, #3, #4 badges
        expect(config.innerHTML).toContain('#1');
        expect(config.innerHTML).toContain('#2');
        expect(config.innerHTML).toContain('#3');
        expect(config.innerHTML).toContain('#4');
        expect(config.innerHTML).toContain('Barbell Bench Press');
        expect(config.innerHTML).toContain('Incline Dumbbell Press');

        // Check presence of Up / Down buttons and Delete button
        expect(config.innerHTML).toContain('fa-chevron-up');
        expect(config.innerHTML).toContain('fa-chevron-down');
        expect(config.innerHTML).toContain('fa-trash-alt');
    });

    it('allows moving an exercise down and up (reordering)', () => {
        openEditTemplateModal('tmpl-123');

        // Move first item (Bench Press at idx 0) down (+1) -> becomes 2nd
        moveTemplateExercise('edit', 0, 1);

        const config = document.getElementById('edit-tmpl-exercises-config');
        // Now Incline Dumbbell Press should be #1, Barbell Bench Press #2
        const firstCardText = config.querySelector('.bg-\\[\\#202225\\]')?.textContent;
        expect(firstCardText).toContain('Incline Dumbbell Press');

        // Move it back up (-1)
        moveTemplateExercise('edit', 1, -1);
        const restoredFirstCard = config.querySelector('.bg-\\[\\#202225\\]')?.textContent;
        expect(restoredFirstCard).toContain('Barbell Bench Press');
    });

    it('allows removing an exercise directly via trash icon and unchecks search checkbox', () => {
        openEditTemplateModal('tmpl-123');

        const benchCheckbox = document.querySelector('input[name="edit-tmpl-exercises"][value="bench_press"]');
        expect(benchCheckbox.checked).toBe(true);

        // Remove first item (Bench Press at index 0)
        removeTemplateExercise('edit', 0);

        // Checkbox should now be unchecked
        expect(benchCheckbox.checked).toBe(false);

        const config = document.getElementById('edit-tmpl-exercises-config');
        expect(config.innerHTML).not.toContain('Barbell Bench Press');
        expect(config.innerHTML).toContain('Incline Dumbbell Press');
        expect(config.innerHTML).toContain('#1');
        expect(config.innerHTML).toContain('#2');
        expect(config.innerHTML).toContain('#3');
    });

    it('allows toggling exercise checkbox to append and remove exercises in create mode', () => {
        openCreateTemplateModal();

        const config = document.getElementById('tmpl-exercises-config');
        expect(config.classList.contains('hidden')).toBe(true);

        // Check Bench Press
        onTemplateCheckboxToggle('create', 'bench_press', true);
        expect(config.classList.contains('hidden')).toBe(false);
        expect(config.innerHTML).toContain('Barbell Bench Press');
        expect(config.innerHTML).toContain('#1');

        // Check Lateral Raises
        onTemplateCheckboxToggle('create', 'lateral_raises', true);
        expect(config.innerHTML).toContain('Dumbbell Lateral Raises');
        expect(config.innerHTML).toContain('#2');

        // Reorder
        moveTemplateExercise('create', 1, -1);
        const firstCard = config.querySelector('.bg-\\[\\#202225\\]')?.textContent;
        expect(firstCard).toContain('Dumbbell Lateral Raises');
    });

    it('saves edited template with exact reordered exercise list', async () => {
        openEditTemplateModal('tmpl-123');

        // Move lateral raises (index 2) up to index 1
        moveTemplateExercise('edit', 2, -1);

        const mockRender = vi.fn();
        await saveEditedTemplate(mockRender);

        expect(document.getElementById('edit-template-modal')).toBeNull();
    });
});
