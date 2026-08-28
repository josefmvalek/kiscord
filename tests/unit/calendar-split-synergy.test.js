import { describe, it, expect, beforeEach, vi } from 'vitest';

const { defaultMockSplits, defaultMockTemplates, defaultMockLogs } = vi.hoisted(() => {
    const defaultMockTemplates = [
        { id: 'tmpl-push', name: 'Push Day 🦍', exercises: [{ exercise_id: 'bench_press', sets: 4, weight: 80, reps: 8 }] },
        { id: 'tmpl-pull', name: 'Pull Day 🧗‍♂️', exercises: [{ exercise_id: 'pull_up', sets: 4, weight: 0, reps: 10 }] }
    ];

    const defaultMockSplits = [
        {
            id: 'split-1',
            user_id: 'user-jose',
            name: 'Push Pull Legs 4-denní',
            is_active: true,
            rotation_mode: 'fixed_days',
            schedule_pattern: [
                { dayOfWeek: 1, splitName: 'Push Day 🦍', isRest: false, templateId: 'tmpl-push', preferredTime: '17:00' },
                { dayOfWeek: 2, splitName: 'Volno / Regenerace 🛌', isRest: true, templateId: null, preferredTime: null },
                { dayOfWeek: 3, splitName: 'Pull Day 🧗‍♂️', isRest: false, templateId: 'tmpl-pull', preferredTime: '17:00' },
                { dayOfWeek: 4, splitName: 'Volno 🛌', isRest: true, templateId: null, preferredTime: null },
                { dayOfWeek: 5, splitName: 'Leg Day 🦵', isRest: false, templateId: null, preferredTime: '16:30' },
                { dayOfWeek: 6, splitName: 'Upper Body ⚡', isRest: false, templateId: null, preferredTime: '11:00' },
                { dayOfWeek: 7, splitName: 'Volno 🛌', isRest: true, templateId: null, preferredTime: null }
            ]
        }
    ];

    const defaultMockLogs = [
        {
            id: 'log-1',
            user_id: 'user-jose',
            name: 'Push Day 🦍',
            duration_seconds: 3600,
            date_key: '2026-08-17',
            exercises: [
                { exercise_id: 'bench_press', exercise_name: 'Bench Press', sets: [{ weight: 85, reps: 8, completed: true }] }
            ]
        }
    ];

    return { defaultMockSplits, defaultMockTemplates, defaultMockLogs };
});

vi.mock('@core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase({
            training_splits: defaultMockSplits,
            gym_templates: defaultMockTemplates,
            gym_logs: defaultMockLogs
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
import { generateWeekView } from '@domains/lifestyle/calendar/week-view.js';
import { getDailyBriefingData } from '@domains/lifestyle/calendar/daily-briefing.js';
import { renderGymSectionHtml } from '@domains/lifestyle/calendar/sections-gym.js';

describe('Calendar & Training Split Synergy', () => {
    beforeEach(() => {
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        state.trainingSplits = JSON.parse(JSON.stringify(defaultMockSplits));
        state.activeTrainingSplit = state.trainingSplits[0];
        state.gymTemplates = JSON.parse(JSON.stringify(defaultMockTemplates));
        state.gymLogs = JSON.parse(JSON.stringify(defaultMockLogs));
        state.plannedDates = {};
        state.healthData = {};
        state.calendarFilter = 'all';
        document.body.innerHTML = '';
    });

    it('should show logged gym workout badge on completed day in week view', () => {
        const weekHtml = generateWeekView('2026-08-17');
        expect(weekHtml).toContain('Push Day 🦍');
        expect(weekHtml).toContain('Odcvičeno: Push Day 🦍');
    });

    it('should show ambient split badge on unlogged workout day in week view', () => {
        // Wednesday (2026-08-19) -> Pull Day, no log
        const weekHtml = generateWeekView('2026-08-17');
        expect(weekHtml).toContain('Pull Day 🧗‍♂️');
    });

    it('should populate today training split recommendation in Daily Briefing', () => {
        // Test Monday
        const briefingMon = getDailyBriefingData(new Date('2026-08-17T10:00:00'));
        expect(briefingMon.gymRecommendation).toContain('Push Day 🦍');
        expect(briefingMon.gymSplitObj).toBeDefined();
        expect(briefingMon.gymSplitObj.isRest).toBe(false);

        // Test Tuesday (Rest Day)
        const briefingTue = getDailyBriefingData(new Date('2026-08-18T10:00:00'));
        expect(briefingTue.gymRecommendation).toContain('Volno / Regenerace 🛌');
        expect(briefingTue.gymSplitObj.isRest).toBe(true);
    });

    it('should render split recommendation card in Day Modal (sections-gym.js) when no log exists', () => {
        // Wednesday 2026-08-19 (Pull Day, no logs)
        const dayHtml = renderGymSectionHtml('2026-08-19');
        expect(dayHtml).toContain('Tréninkový Split');
        expect(dayHtml).toContain('Pull Day 🧗‍♂️');
        expect(dayHtml).toContain('Pull Day 🧗‍♂️ • Pull Day 🧗‍♂️');
    });

    it('should render rest day badge in Day Modal when date is a Rest Day', () => {
        // Tuesday 2026-08-18 (Rest Day)
        const dayHtml = renderGymSectionHtml('2026-08-18');
        expect(dayHtml).toContain('Volno / Rest Day (Regenerace)');
    });
});
