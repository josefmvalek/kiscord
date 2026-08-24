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
    calculateSleepEfficiency, 
    calculateSleepDebt, 
    calculateSleepCycles, 
    analyzePairSleepSynergy 
} from '../../js/domains/fitness/sleep/sleepEngine.js';

describe('Sleep Engine & Ultradian Architecture', () => {

    describe('Sleep Efficiency Calculation', () => {
        it('should return 100% when sleep duration equals time in bed', () => {
            const efficiency = calculateSleepEfficiency(8.0, 8.0);
            expect(efficiency).toBe(100);
        });

        it('should calculate accurate CBT-I efficiency ratio', () => {
            const efficiency = calculateSleepEfficiency(7.0, 9.0);
            expect(efficiency).toBe(78); // 7/9 = 77.7% -> 78%
        });
    });

    describe('Sleep Debt Calculation', () => {
        it('should calculate 0 debt when 8h target is met daily', () => {
            const mockLogs = {
                '2026-08-22': { sleep_duration_hours: 8.0 },
                '2026-08-21': { sleep_duration_hours: 8.0 },
                '2026-08-20': { sleep_duration_hours: 8.0 }
            };
            const debt = calculateSleepDebt(mockLogs, 8.0);
            expect(debt).toBe(0);
        });

        it('should accumulate sleep debt when sleeping less than baseline', () => {
            const mockLogs = {
                '2026-08-22': { sleep_duration_hours: 6.0 }, // +2h debt
                '2026-08-21': { sleep_duration_hours: 7.0 }  // +1h debt
            };
            const debt = calculateSleepDebt(mockLogs, 8.0);
            expect(debt).toBe(3.0);
        });
    });

    describe('90-Minute Sleep Cycle Calculator', () => {
        it('should calculate exact recommended bedtimes for 06:30 wake-up', () => {
            const suggestions = calculateSleepCycles({ wakeTime: '06:30', latencyMinutes: 15 });
            expect(suggestions.length).toBe(4);

            // 5 cycles = 7.5h + 15m latency = 7h 45m before 06:30 -> 22:45
            const fiveCycles = suggestions.find(s => s.cycles === 5);
            expect(fiveCycles).toBeTruthy();
            expect(fiveCycles.timeStr).toBe('22:45');

            // 6 cycles = 9.0h + 15m latency = 9h 15m before 06:30 -> 21:15
            const sixCycles = suggestions.find(s => s.cycles === 6);
            expect(sixCycles).toBeTruthy();
            expect(sixCycles.timeStr).toBe('21:15');
        });

        it('should generate wake-up times when going to sleep now', () => {
            const suggestions = calculateSleepCycles({ sleepNow: true, latencyMinutes: 15 });
            expect(suggestions.length).toBe(4);
            expect(suggestions[0].cycles).toBe(6);
        });
    });

    describe('Pair Sleep Synergy', () => {
        it('should compare sleep duration and restfulness when slept together vs solo', () => {
            const mockLogs = {
                '2026-08-22': { sleep_duration_hours: 8.5, restfulness_score: 5, slept_together: true },
                '2026-08-21': { sleep_duration_hours: 8.5, restfulness_score: 5, slept_together: true },
                '2026-08-20': { sleep_duration_hours: 6.5, restfulness_score: 3, slept_together: false }
            };

            const synergy = analyzePairSleepSynergy(mockLogs);
            expect(synergy.togetherCount).toBe(2);
            expect(synergy.soloCount).toBe(1);
            expect(parseFloat(synergy.avgDurationTogether)).toBeGreaterThan(parseFloat(synergy.avgDurationSolo));
            expect(parseFloat(synergy.avgRestfulnessTogether)).toBe(5.0);
        });
    });
});
