import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeSearchString, matchesExerciseQuery, filterModalExercises, filterTabExercises } from '../../js/domains/fitness/gym/exercises.js';

describe('Gym UX: Smart Multi-Token Search & Normalization', () => {
    describe('normalizeSearchString', () => {
        it('should strip Czech diacritics and convert to lower case', () => {
            expect(normalizeSearchString('Dřep s Velkou Činkou')).toBe('drep s velkou cinkou');
            expect(normalizeSearchString('Předkopávání na stroji')).toBe('predkopavani na stroji');
            expect(normalizeSearchString('Zapažování s jednoručkami (ramena)')).toBe('zapazovani s jednoruckami  ramena');
        });

        it('should handle empty or null inputs gracefully', () => {
            expect(normalizeSearchString('')).toBe('');
            expect(normalizeSearchString(null)).toBe('');
            expect(normalizeSearchString(undefined)).toBe('');
        });
    });

    describe('matchesExerciseQuery', () => {
        const exerciseName = 'Bench Press s Velkou Činkou';
        const exerciseCategory = 'Hrudník';
        const target = `${exerciseName} ${exerciseCategory}`;

        it('should match exact single words regardless of case or accents', () => {
            expect(matchesExerciseQuery(target, 'bench')).toBe(true);
            expect(matchesExerciseQuery(target, 'BENCH')).toBe(true);
            expect(matchesExerciseQuery(target, 'činkou')).toBe(true);
            expect(matchesExerciseQuery(target, 'cinkou')).toBe(true);
            expect(matchesExerciseQuery(target, 'hrudnik')).toBe(true);
        });

        it('should match multiple words in any order', () => {
            expect(matchesExerciseQuery(target, 'velká činka bench')).toBe(true);
            expect(matchesExerciseQuery(target, 'cinka bench')).toBe(true);
            expect(matchesExerciseQuery(target, 'hrudník press')).toBe(true);
            expect(matchesExerciseQuery(target, 'press hrudnik velkou')).toBe(true);
        });

        it('should reject if any token does not match', () => {
            expect(matchesExerciseQuery(target, 'bench dřep')).toBe(false);
            expect(matchesExerciseQuery(target, 'biceps bench')).toBe(false);
        });

        it('should return true when query is empty or only whitespace', () => {
            expect(matchesExerciseQuery(target, '')).toBe(true);
            expect(matchesExerciseQuery(target, '   ')).toBe(true);
        });
    });

    describe('filterModalExercises DOM Filtering', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="add-ex-list">
                    <div class="exercise-select-item" data-name="bench press s velkou činkou" data-category="hrudník"></div>
                    <div class="exercise-select-item" data-name="dřep s velkou činkou" data-category="nohy"></div>
                    <div class="exercise-select-item" data-name="tlaky s jednoručkami v sedě" data-category="ramena"></div>
                    <div class="exercise-select-item" data-name="bicepsový zdvih na scottově lavici" data-category="ruce"></div>
                </div>
            `;
        });

        it('should show only matching items with multi-token query in different order', () => {
            filterModalExercises('činka drep');

            const items = document.querySelectorAll('.exercise-select-item');
            expect(items[0].style.display).toBe('none'); // bench press
            expect(items[1].style.display).toBe('flex'); // dřep s velkou činkou
            expect(items[2].style.display).toBe('none'); // ramena
            expect(items[3].style.display).toBe('none'); // biceps
        });

        it('should match category combined with exercise name', () => {
            filterModalExercises('ramena jednoručky');

            const items = document.querySelectorAll('.exercise-select-item');
            expect(items[0].style.display).toBe('none');
            expect(items[1].style.display).toBe('none');
            expect(items[2].style.display).toBe('flex'); // ramena + jednorucky
            expect(items[3].style.display).toBe('none');
        });

        it('should show all items when query is cleared', () => {
            filterModalExercises('');
            const items = document.querySelectorAll('.exercise-select-item');
            items.forEach(item => {
                expect(item.style.display).toBe('flex');
            });
        });
    });
});
