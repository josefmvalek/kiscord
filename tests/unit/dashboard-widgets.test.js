import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    generateHabitsDashboardWidget, 
    toggleHabitFromDashboard 
} from '../../js/domains/lifestyle/dashboard/habits-widget.js';
import { generateFitAndDormDashboardWidget } from '../../js/domains/lifestyle/dashboard/fit-dorm-widget.js';
import { generateLoveAndLevelsWidget } from '../../js/domains/lifestyle/dashboard/love-levels-widget.js';
import { generateDailyQuestionCard } from '../../js/domains/lifestyle/dashboard/daily-question-widget.js';

vi.mock('../../js/core/supabase.js', async () => {
    const { createMockSupabase } = await import('../fixtures/mock-supabase.js');
    return {
        supabase: createMockSupabase()
    };
});

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn()
}));

describe('Dashboard Bento Widgets Decomposition', () => {
    beforeEach(() => {
        localStorage.clear();
        state.currentUser = { id: 'user-jose', name: 'Jožka' };
        state.user_ids = { jose: 'user-jose', klarka: 'user-klarka' };
        state.loveCoins = { jose: 120, klarka: 85 };
        state.relationshipXP = 150;
        state.inventory = [];
        state.schoolDeadlines = [];
        state.scheduleItems = [];
        state.dailyQuestion = null;
        state.dailyAnswers = [];
    });

    describe('Habits Bento Widget (habits-widget.js)', () => {
        it('should render empty state when no habits are configured', () => {
            const html = generateHabitsDashboardWidget();
            expect(html).toContain('Zatím nemáš zadané žádné denní návyky');
            expect(html).toContain('+ Přidat návyk');
        });

        it('should render habits progress and completion count', () => {
            const habits = [
                { id: 'h1', title: 'Vypít sklenici vody', user_id: 'user-jose', streak: 5 },
                { id: 'h2', title: '10 kliků', user_id: 'user-jose', streak: 2 }
            ];
            localStorage.setItem('kiscord_local_habits', JSON.stringify(habits));

            const html = generateHabitsDashboardWidget();
            expect(html).toContain('0/2 splněno');
            expect(html).toContain('Vypít sklenici vody');
            expect(html).toContain('10 kliků');
            expect(html).toContain('5 dní v kuse');
        });

        it('should optimistically toggle habit completion in localStorage', () => {
            const habits = [
                { id: 'h1', title: 'Ranní meditace', user_id: 'user-jose', streak: 3 }
            ];
            localStorage.setItem('kiscord_local_habits', JSON.stringify(habits));

            toggleHabitFromDashboard('h1');

            const logs = JSON.parse(localStorage.getItem('kiscord_local_habit_logs') || '[]');
            expect(logs.some(l => l.habit_id === 'h1' && l.user_id === 'user-jose')).toBe(true);

            // Toggle back off
            toggleHabitFromDashboard('h1');
            const updatedLogs = JSON.parse(localStorage.getItem('kiscord_local_habit_logs') || '[]');
            expect(updatedLogs.some(l => l.habit_id === 'h1' && l.user_id === 'user-jose')).toBe(false);
        });
    });

    describe('VUT FIT & Dormitory Widget (fit-dorm-widget.js)', () => {
        it('should render university widget with deadlines', () => {
            const todayStr = new Date().toISOString().split('T')[0];
            state.schoolDeadlines = [
                {
                    id: 'dl-1',
                    title: 'Projekt IPP 1. úloha',
                    subject_code: 'IPP',
                    deadline_date: todayStr,
                    deadline_time: '23:59',
                    is_completed: false
                }
            ];

            const html = generateFitAndDormDashboardWidget();
            expect(html).toContain('VUT FIT & Koleje Brno');
            expect(html).toContain('Projekt IPP 1. úloha');
            expect(html).toContain('[IPP]');
            expect(html).toContain('Dnes!');
        });
    });

    describe('Love & Levels Widget (love-levels-widget.js)', () => {
        it('should render relationship level, XP bar and Love Coins balance', () => {
            state.inventory = [
                { id: 'inv-1', name: 'Masáž zad', is_redeemed: false }
            ];

            const html = generateLoveAndLevelsWidget();
            expect(html).toContain('Vztahový Rituál & Tržnice');
            expect(html).toContain('120'); // Jožka's coins
            expect(html).toContain('85');  // Klárka's coins
            expect(html).toContain('1 kupón');
            expect(html).toContain('Milníky');
        });
    });

    describe('Daily Question Card (daily-question-widget.js)', () => {
        it('should return empty string when no daily question exists', () => {
            expect(generateDailyQuestionCard()).toBe('');
        });

        it('should render question and input area when user has not answered yet', () => {
            state.dailyQuestion = {
                id: 'q-1',
                text: 'Jaká je tvoje nejoblíbenější společná vzpomínka z léta?'
            };

            const html = generateDailyQuestionCard();
            expect(html).toContain('Dnešní otázka pro nás dva');
            expect(html).toContain('Jaká je tvoje nejoblíbenější společná vzpomínka z léta?');
            expect(html).toContain('dashboard-daily-answer-input');
            expect(html).toContain('Odeslat moji odpověď');
        });

        it('should render both answers when revealed', () => {
            state.dailyQuestion = {
                id: 'q-1',
                text: 'Co bychom měli dnes uvařit?'
            };
            state.dailyAnswers = [
                { question_id: 'q-1', user_id: 'user-jose', answer_text: 'Těstoviny carbonara' },
                { question_id: 'q-1', user_id: 'user-klarka', answer_text: 'Domácí pizzu' }
            ];

            const html = generateDailyQuestionCard();
            expect(html).toContain('Těstoviny carbonara');
            expect(html).toContain('Domácí pizzu');
            expect(html).toContain('Společný kód odemčen');
        });
    });
});
