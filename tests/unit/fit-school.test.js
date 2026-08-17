import { describe, it, expect, vi } from 'vitest';

// Mock Supabase module to prevent CDN import issues in Node environment
vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null }),
            delete: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}));

import { calculateGrade } from '../../js/modules/studyPlanner.js';
import { calculateDayFreeSlots, FIT_PRESET_SUBJECTS, FIT_ROOM_HINTS } from '../../js/modules/schedule.js';
import { BRNO_CAMPUS_FOOD } from '../../js/modules/dormHub.js';

describe('VUT FIT Studijní Plánovač & Bodový systém', () => {
    it('should correctly calculate grades based on points (A, B, C, D, E, F)', () => {
        expect(calculateGrade(95).letter).toBe('A');
        expect(calculateGrade(90).letter).toBe('A');
        expect(calculateGrade(85).letter).toBe('B');
        expect(calculateGrade(79).letter).toBe('C');
        expect(calculateGrade(65).letter).toBe('D');
        expect(calculateGrade(50).letter).toBe('E');
        expect(calculateGrade(49).letter).toBe('F');
        expect(calculateGrade(0).letter).toBe('F');
    });

    it('should provide preset 1st semester subjects for VUT FIT', () => {
        expect(FIT_PRESET_SUBJECTS.length).toBeGreaterThanOrEqual(5);
        const codes = FIT_PRESET_SUBJECTS.map(s => s.code);
        expect(codes).toContain('IZP');
        expect(codes).toContain('IUS');
        expect(codes).toContain('IDA');
        expect(codes).toContain('IMA1');
    });

    it('should contain FIT classroom hints', () => {
        expect(FIT_ROOM_HINTS['E112']).toContain('aula');
        expect(FIT_ROOM_HINTS['D105']).toContain('Budova D');
        expect(FIT_ROOM_HINTS['C228']).toContain('laboratoř');
    });
});

describe('VUT FIT Rozvrh & Volná okénka', () => {
    it('should detect full free day when neither partner has classes', () => {
        const slots = calculateDayFreeSlots([], []);
        expect(slots).toEqual(['Celý den volno']);
    });

    it('should detect free slots when both partners have gaps', () => {
        const joseEvents = [
            { time_start: '08:00', time_end: '10:00' },
            { time_start: '14:00', time_end: '16:00' }
        ];
        const klarkaEvents = [
            { time_start: '08:00', time_end: '10:00' },
            { time_start: '16:00', time_end: '18:00' }
        ];

        const freeSlots = calculateDayFreeSlots(joseEvents, klarkaEvents);
        // The slot 10:00-12:00 and 12:00-14:00 (Oběd) should be free for both
        expect(freeSlots).toContain('10:00-12:00');
        expect(freeSlots).toContain('12:00-14:00 (Oběd)');
    });
});

describe('Koleje & Brno Campus Hub', () => {
    it('should list essential Brno campus and FIT food options', () => {
        expect(BRNO_CAMPUS_FOOD.length).toBeGreaterThanOrEqual(4);
        const names = BRNO_CAMPUS_FOOD.map(f => f.name);
        expect(names).toContain('Menza Purkyňova');
        expect(names).toContain('Menza Kolejní (PPV)');
        expect(names).toContain('Pizzerie & Bistro Božetěchova');
    });
});
