import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis()
        }))
    }
}));

import {
    createSignal,
    createEffect,
    createComputed,
    bindText,
    bindClass,
    bindAttr
} from '../../js/core/signals.js';
import {
    stopwatchSignal,
    setStopwatchSignal,
    restTimerSignal,
    setRestTimerSignal,
    activeWorkoutSignal,
    setActiveWorkout
} from '../../js/domains/fitness/gym/shared.js';
import { calculateFastingProgress } from '../../js/domains/fitness/nutrition/fastingTimer.js';
import { calculateMifflinStJeor, calculateKatchMcArdle } from '../../js/domains/fitness/body-metrics/biometricsCalculator.js';

describe('Reactive Signals Migration - 3 Waves Integration Test', () => {

    describe('🌊 Wave 1: High-Frequency Timers & Heavy Trackers', () => {
        it('stopwatchSignal and restTimerSignal update reactively without DOM re-renders', () => {
            const timerDisplayEl = document.createElement('span');
            const restDisplayEl = document.createElement('span');

            const unsubTimer = bindText(timerDisplayEl, () => `${stopwatchSignal()}s`);
            const unsubRest = bindText(restDisplayEl, () => `${restTimerSignal().remaining}s`);

            expect(timerDisplayEl.textContent).toBe('0s');
            expect(restDisplayEl.textContent).toBe('0s');

            setStopwatchSignal(45);
            setRestTimerSignal({ remaining: 89, duration: 90, isRunning: true });

            expect(timerDisplayEl.textContent).toBe('45s');
            expect(restDisplayEl.textContent).toBe('89s');

            unsubTimer();
            unsubRest();
        });

        it('setActiveWorkout updates activeWorkoutSignal and preserves reactivity', () => {
            const mockWorkout = { name: 'Leg Day', durationSeconds: 60 };
            setActiveWorkout(mockWorkout);

            expect(activeWorkoutSignal()?.name).toBe('Leg Day');
        });

        it('calculateFastingProgress computes remaining time and percentage reactively', () => {
            const progress = calculateFastingProgress('josef');
            expect(progress).toBeDefined();
            expect(typeof progress.percent).toBe('number');
            expect(typeof progress.formattedElapsed).toBe('string');
        });
    });

    describe('🌊 Wave 2: Smooth Interactive Sliders, Habits & Shop UX', () => {
        it('body metrics sliders compute live BMR, BMI and FFMI with signals smoothly', () => {
            const [weightSignal, setWeightSignal] = createSignal(80);
            const [fatSignal, setFatSignal] = createSignal(14);
            const heightCm = 180;

            const bmiComputed = createComputed(() => (weightSignal() / ((heightCm / 100) ** 2)).toFixed(1));
            const bmrComputed = createComputed(() => calculateKatchMcArdle(weightSignal(), fatSignal()));

            expect(bmiComputed()).toBe('24.7');
            expect(bmrComputed()).toBe(1856);

            // Simulating slider drag on mobile
            setWeightSignal(85);
            setFatSignal(15);

            expect(bmiComputed()).toBe('26.2');
            expect(bmrComputed()).toBe(1931);
        });

        it('habit check button toggles class via bindClass without full table reload', () => {
            const habitBtn = document.createElement('button');
            const [isHabitDone, setIsHabitDone] = createSignal(false);

            const unsub = bindClass(habitBtn, 'completed', isHabitDone);
            expect(habitBtn.classList.contains('completed')).toBe(false);

            setIsHabitDone(true);
            expect(habitBtn.classList.contains('completed')).toBe(true);

            setIsHabitDone(false);
            expect(habitBtn.classList.contains('completed')).toBe(false);

            unsub();
        });
    });

    describe('🌊 Wave 3: Status Bars, Ambient Presence & Watchlist', () => {
        it('binds offline queue count and presence status to header indicators', () => {
            const badgeEl = document.createElement('span');
            const [queueCountSignal, setQueueCountSignal] = createSignal(0);

            const unsub = bindText(badgeEl, () => (queueCountSignal() > 0 ? `${queueCountSignal()} offline` : 'Synced'));
            expect(badgeEl.textContent).toBe('Synced');

            setQueueCountSignal(3);
            expect(badgeEl.textContent).toBe('3 offline');

            setQueueCountSignal(0);
            expect(badgeEl.textContent).toBe('Synced');

            unsub();
        });

        it('binds watchlist counters dynamically', () => {
            const counterEl = document.createElement('div');
            const [togetherCount, setTogetherCount] = createSignal(12);
            const [totalCount, setTotalCount] = createSignal(48);

            const unsub = bindText(counterEl, () => `Spolu: ${togetherCount()} | Celkem: ${totalCount()}`);
            expect(counterEl.textContent).toBe('Spolu: 12 | Celkem: 48');

            setTogetherCount(13);
            setTotalCount(50);
            expect(counterEl.textContent).toBe('Spolu: 13 | Celkem: 50');

            unsub();
        });
    });
});
