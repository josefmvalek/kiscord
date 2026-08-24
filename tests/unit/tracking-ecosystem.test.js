import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
                gte: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                })
            }),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
        }))
    }
}));

vi.mock('../../js/core/utils.js', () => ({
    triggerHaptic: vi.fn(),
    getTodayKey: vi.fn(() => '2026-08-22'),
    escapeHTML: vi.fn(str => str || '')
}));

import { 
    calculateCurrentCycleState, 
    calculateAdaptiveCycleLength, 
    getPartnerPrivacyData,
    CYCLE_PHASES 
} from '../../js/domains/fitness/cycle/cycleEngine.js';
import { 
    calculateBloodCaffeine, 
    calculateSleepCutoffTime 
} from '../../js/domains/fitness/biohacks/caffeineTracker.js';
import { 
    getMetabolicStage, 
    calculateFastingProgress 
} from '../../js/domains/fitness/biohacks/fastingTimer.js';
import { calculateDailyRecoveryScore } from '../../js/domains/fitness/biohacks/recoveryScore.js';
import { generateCrossMetricInsights } from '../../js/domains/fitness/tracking-hub/correlationEngine.js';

describe('Tracking Ecosystem & BioHacks Suite', () => {

    describe('Cycle Engine', () => {
        it('should correctly calculate adaptive cycle length from history', () => {
            const startDates = ['2026-05-01', '2026-05-29', '2026-06-26']; // 28-day intervals
            const avg = calculateAdaptiveCycleLength(startDates, 28);
            expect(avg).toBe(28);
        });

        it('should identify Menstrual phase during first 5 days', () => {
            const startDate = '2026-08-20';
            const today = new Date('2026-08-22'); // Day 3
            const state = calculateCurrentCycleState(today, [{ date_key: startDate, flow_intensity: 'medium' }], { cycle_length_days: 28, period_length_days: 5 });

            expect(state.dayOfCycle).toBe(3);
            expect(state.phase.id).toBe(CYCLE_PHASES.MENSTRUAL.id);
        });

        it('should identify Follicular phase on Day 8', () => {
            const startDate = '2026-08-14';
            const today = new Date('2026-08-22'); // Day 9
            const state = calculateCurrentCycleState(today, [{ date_key: startDate, flow_intensity: 'medium' }], { cycle_length_days: 28, period_length_days: 5 });

            expect(state.phase.id).toBe(CYCLE_PHASES.FOLLICULAR.id);
        });

        it('should identify Ovulatory phase around Day 14', () => {
            const startDate = '2026-08-08';
            const today = new Date('2026-08-22'); // Day 15
            const state = calculateCurrentCycleState(today, [{ date_key: startDate, flow_intensity: 'medium' }], { cycle_length_days: 28, period_length_days: 5 });

            expect(state.phase.id).toBe(CYCLE_PHASES.OVULATORY.id);
        });

        it('should correctly filter data for partner privacy', () => {
            const cycleState = {
                dayOfCycle: 22,
                phase: CYCLE_PHASES.LUTEAL
            };

            const privacyShared = getPartnerPrivacyData(cycleState, { 
                share_with_partner: true, 
                partner_visible_fields: ['phase_name', 'tips'] 
            });

            expect(privacyShared.isShared).toBe(true);
            expect(privacyShared.phaseName).toBe('Luteální fáze (PMS)');
            expect(privacyShared.partnerTip).toBeTruthy();

            const privacyDisabled = getPartnerPrivacyData(cycleState, { share_with_partner: false });
            expect(privacyDisabled.isShared).toBe(false);
        });
    });

    describe('Caffeine Kinetics', () => {
        it('should accurately calculate 5-hour half life decay', () => {
            const now = new Date('2026-08-22T15:00:00Z');
            const fiveHoursLater = new Date('2026-08-22T20:00:00Z');

            const entries = [
                { id: '1', time: now.toISOString(), beverage: 'espresso', caffeine_mg: 100 }
            ];

            const initial = calculateBloodCaffeine(entries, now);
            expect(initial).toBe(100);

            const decayed = calculateBloodCaffeine(entries, fiveHoursLater);
            expect(decayed).toBe(50); // Exact 50% half-life
        });

        it('should calculate sleep cutoff time 8 hours before bed', () => {
            const cutoff = calculateSleepCutoffTime(23); // 23:00 bedtime -> 15:00 cutoff
            expect(cutoff).toBe('15:00');
        });
    });

    describe('Fasting Timer', () => {
        it('should determine correct metabolic stage by elapsed hours', () => {
            expect(getMetabolicStage(2).label).toContain('Trávení');
            expect(getMetabolicStage(6).label).toContain('Pokles inzulínu');
            expect(getMetabolicStage(10).label).toContain('Spalování tuků');
            expect(getMetabolicStage(14).label).toContain('Ketóza & Autofagie');
            expect(getMetabolicStage(20).label).toContain('Hluboká autofagie');
        });

        it('should compute fasting progress percentage', () => {
            const now = Date.now();
            const eightHoursAgo = new Date(now - 8 * 3600 * 1000).toISOString();

            const session = {
                start_iso: eightHoursAgo,
                target_hours: 16,
                is_active: true
            };

            const progress = calculateFastingProgress(session);
            expect(progress.isActive).toBe(true);
            expect(progress.hours).toBe(8);
            expect(progress.progressPercent).toBe(50);
        });
    });

    describe('Recovery Score & Cross-Metric Intelligence', () => {
        it('should calculate green recovery score for optimal inputs', () => {
            const recovery = calculateDailyRecoveryScore({
                sleepHours: 8.0,
                waterLevel: 4,
                sorenessLevel: 1,
                strainLevel: 2,
                moodVal: 9
            });

            expect(recovery.score).toBeGreaterThanOrEqual(80);
            expect(recovery.category).toBe('green');
        });

        it('should calculate red recovery score for poor sleep and high soreness', () => {
            const recovery = calculateDailyRecoveryScore({
                sleepHours: 4.5,
                waterLevel: 1,
                sorenessLevel: 5,
                strainLevel: 5,
                moodVal: 3
            });

            expect(recovery.score).toBeLessThan(50);
            expect(recovery.category).toBe('red');
        });

        it('should generate cross-metric insights across domains', () => {
            const insights = generateCrossMetricInsights();
            expect(insights.length).toBeGreaterThanOrEqual(4);
            expect(insights.some(i => i.id === 'cycle_strength')).toBe(true);
            expect(insights.some(i => i.id === 'caffeine_sleep')).toBe(true);
        });
    });
});
