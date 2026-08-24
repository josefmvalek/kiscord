import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    getCurrentModalDateKey, 
    setCurrentModalDateKey, 
    getCalSession, 
    setCalSession 
} from '../../js/domains/lifestyle/calendar/state.js';
import { renderDiarySectionHtml } from '../../js/domains/lifestyle/calendar/sections-diary.js';
import { renderGymSectionHtml } from '../../js/domains/lifestyle/calendar/sections-gym.js';
import { cyclePlanStatus, toggleChecklistItem } from '../../js/domains/lifestyle/calendar/sections-plans.js';

// Mock Supabase
vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
    }
}));

// Mock theme confirm dialog
vi.mock('../../js/core/theme.js', () => ({
    showConfirmDialog: vi.fn(() => Promise.resolve(true)),
    showNotification: vi.fn()
}));

describe('Calendar Sub-Modules & Sections Decomposition', () => {
    beforeEach(() => {
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        state.user_ids = { jose: 'user-jose', klarka: 'user-klarka' };
        state.plannedDates = {};
        state.healthData = {};
        state.gymLogs = [];
        state.gymPRs = [];
        state.brigadeDiary = [];
        setCurrentModalDateKey(null);
    });

    describe('Calendar Session & State Pointer', () => {
        it('should get and set current modal date key', () => {
            expect(getCurrentModalDateKey()).toBeNull();
            setCurrentModalDateKey('2026-08-24');
            expect(getCurrentModalDateKey()).toBe('2026-08-24');
        });

        it('should get and set calendar year/month session', () => {
            setCalSession(2026, 7); // August 2026
            const session = getCalSession();
            expect(session.year).toBe(2026);
            expect(session.month).toBe(7);
        });
    });

    describe('Date Plans & Checklists (sections-plans.js)', () => {
        it('should cycle plan status between idea -> confirmed -> happened -> idea', async () => {
            state.plannedDates['2026-08-25'] = {
                id: 'plan-1',
                name: 'Piknik na Kraví hoře',
                status: 'idea'
            };

            await cyclePlanStatus('2026-08-25');
            expect(state.plannedDates['2026-08-25'].status).toBe('confirmed');

            await cyclePlanStatus('2026-08-25');
            expect(state.plannedDates['2026-08-25'].status).toBe('happened');

            await cyclePlanStatus('2026-08-25');
            expect(state.plannedDates['2026-08-25'].status).toBe('idea');
        });

        it('should toggle checklist items between done and not done', async () => {
            state.plannedDates['2026-08-25'] = {
                id: 'plan-1',
                name: 'Kino',
                checklist: [
                    { text: 'Koupit popcorn', done: false },
                    { text: 'Vzít mikinu', done: true }
                ]
            };

            await toggleChecklistItem('2026-08-25', 0);
            expect(state.plannedDates['2026-08-25'].checklist[0].done).toBe(true);

            await toggleChecklistItem('2026-08-25', 1);
            expect(state.plannedDates['2026-08-25'].checklist[1].done).toBe(false);
        });
    });

    describe('Gym Section HTML Rendering (sections-gym.js)', () => {
        it('should render empty state message when no gym logs exist', () => {
            const html = renderGymSectionHtml('2026-08-24');
            expect(html).toContain('V tento den nebyl zaznamenán žádný trénink.');
            expect(html).toContain('Posilovna & Tréninky');
        });

        it('should render completed workout with exercise sets and user avatar', () => {
            state.gymLogs = [
                {
                    id: 'log-1',
                    date_key: '2026-08-24',
                    user_id: 'user-jose',
                    name: 'Push Day',
                    duration_seconds: 3600,
                    exercises: [
                        {
                            exercise_name: 'Bench Press',
                            sets: [
                                { weight: 80, reps: 8, completed: true },
                                { weight: 80, reps: 8, completed: true }
                            ]
                        }
                    ]
                }
            ];

            const html = renderGymSectionHtml('2026-08-24');
            expect(html).toContain('Push Day');
            expect(html).toContain('Bench Press');
            expect(html).toContain('80 kg');
            expect(html).toContain('⏱️ 60 min');
        });
    });

    describe('Alpský Deníček Section (sections-diary.js)', () => {
        it('should return empty string when no diary entries exist for day', () => {
            const html = renderDiarySectionHtml('2026-08-24');
            expect(html).toBe('');
        });

        it('should render diary section with highlight and rant when entry exists', () => {
            state.brigadeDiary = [
                {
                    date_key: '2026-08-24',
                    user_id: 'user-jose',
                    rating: 5,
                    highlight_text: 'Krásná túra k vodopádům',
                    rant_text: 'Bolely mě nohy'
                },
                {
                    date_key: '2026-08-24',
                    user_id: 'user-klarka',
                    rating: 4,
                    highlight_text: 'Výborný štrúdl',
                    rant_text: 'Zima nahoře'
                }
            ];

            const html = renderDiarySectionHtml('2026-08-24');
            expect(html).toContain('Alpský Deníček');
            expect(html).toContain('Krásná túra k vodopádům');
            expect(html).toContain('Výborný štrúdl');
        });
    });
});
