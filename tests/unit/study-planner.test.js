import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../../js/core/state.js';
import { 
    calculateGrade, 
    getDeadlineTypeBadge, 
    getActiveTab, 
    setActiveTab, 
    getSubjectsData, 
    setSubjectsData,
    getDeadlinesData,
    setDeadlinesData
} from '../../js/domains/university/study-planner/store.js';
import { renderPointsView } from '../../js/domains/university/study-planner/points.js';
import { renderDeadlinesView, toggleDeadlineComplete } from '../../js/domains/university/study-planner/deadlines.js';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            delete: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
            match: vi.fn(() => Promise.resolve({ data: null, error: null })),
            select: vi.fn().mockReturnThis(),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
    }
}));

vi.mock('../../js/core/theme.js', () => ({
    showNotification: vi.fn(),
    showConfirmDialog: vi.fn(() => Promise.resolve(true))
}));

describe('VUT FIT Study Planner Sub-Modules (js/modules/studyPlanner/)', () => {
    beforeEach(() => {
        state.currentUser = { id: 'user-josef', name: 'Jožka' };
        setActiveTab('points');
        setSubjectsData([]);
        setDeadlinesData([]);
    });

    describe('Grade Calculations & Type Badges (store.js)', () => {
        it('should correctly calculate ECTS grade letter and colors based on total points', () => {
            expect(calculateGrade(95).letter).toBe('A');
            expect(calculateGrade(85).letter).toBe('B');
            expect(calculateGrade(75).letter).toBe('C');
            expect(calculateGrade(65).letter).toBe('D');
            expect(calculateGrade(50).letter).toBe('E');
            expect(calculateGrade(49).letter).toBe('F');
        });

        it('should return appropriate CSS badge classes for deadline types', () => {
            expect(getDeadlineTypeBadge('Projekt')).toContain('bg-blue-500');
            expect(getDeadlineTypeBadge('Půlsemestrálka')).toContain('bg-amber-500');
            expect(getDeadlineTypeBadge('Zkouška')).toContain('bg-purple-500');
            expect(getDeadlineTypeBadge('Domácí úkol')).toContain('bg-emerald-500');
        });
    });

    describe('Points View & Subjects (points.js)', () => {
        it('should render subject cards with points breakdown and zapocet status', () => {
            const subjects = [
                {
                    id: 'sub-1',
                    code: 'IZP',
                    name: 'Základy programování',
                    semester: '1. semestr',
                    min_credit_points: 20,
                    points_labs: 10,
                    points_projects: 15,
                    points_midterm: 10,
                    points_exam: 40
                }
            ];
            setSubjectsData(subjects);

            const html = renderPointsView();
            expect(html).toContain('IZP');
            expect(html).toContain('Základy programování');
            expect(html).toContain('Zápočet splněn!');
            expect(html).toContain('75'); // 10+15+10+40 = 75b (Grade C)
            expect(html).toContain('Známka: C');
        });
    });

    describe('Deadlines Tracker (deadlines.js)', () => {
        it('should render upcoming and completed deadlines list', () => {
            const deadlines = [
                {
                    id: 'dl-1',
                    subject_code: 'IZP',
                    title: 'Projekt 1 - Práce s textem',
                    type: 'Projekt',
                    deadline_date: '2026-11-20',
                    deadline_time: '23:59',
                    is_completed: false
                },
                {
                    id: 'dl-2',
                    subject_code: 'IUS',
                    title: 'Model informačního systému',
                    type: 'Projekt',
                    deadline_date: '2026-10-15',
                    is_completed: true
                }
            ];
            setDeadlinesData(deadlines);

            const html = renderDeadlinesView([deadlines[0]]);
            expect(html).toContain('Projekt 1 - Práce s textem');
            expect(html).toContain('Model informačního systému');
            expect(html).toContain('Odevzdané a splněné úkoly (1)');
        });

        it('should toggle deadline completion status locally and update item state', () => {
            const deadlines = [
                { id: 'dl-1', title: 'Task 1', is_completed: false }
            ];
            setDeadlinesData(deadlines);

            toggleDeadlineComplete('dl-1', true);
            expect(deadlines[0].is_completed).toBe(true);
        });
    });
});
