import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => {
  return {
    supabase: {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        upsert: () => Promise.resolve({ data: [], error: null }),
      }),
    },
  };
});

import { detectOverlaps, formatDateKey } from '../../js/modules/shifts.js';
import { state } from '../../js/core/state.js';

describe('Shift Overlap Detector', () => {
  beforeEach(() => {
    // Reset state shifts
    state.shifts = {};
    state.user_ids = {
      jose: 'jose-id-123',
      klarka: 'klarka-id-456'
    };
  });

  const weekDates = [
    new Date(2026, 5, 1), // Monday
    new Date(2026, 5, 2), // Tuesday
    new Date(2026, 5, 3), // Wednesday
    new Date(2026, 5, 4), // Thursday
    new Date(2026, 5, 5), // Friday
    new Date(2026, 5, 6), // Saturday
    new Date(2026, 5, 7), // Sunday
  ];

  it('should return default message if no shifts are set', () => {
    const message = detectOverlaps(weekDates);
    expect(message).toContain('Zatím nemáme rozvržené žádné směny');
  });

  it('should return sad message if no overlaps are detected', () => {
    // Setup unknown shifts on one day so countUnset < 7, but overlaps.length === 0
    state.shifts['2026-06-01'] = {
      jose: { shift_type: 'unknown' },
      klarka: { shift_type: 'unknown' }
    };

    const message = detectOverlaps(weekDates);
    expect(message).toContain('nepodařilo detekovat žádný delší překryv');
  });

  it('should detect when both have the day off (Společné volno 🌴)', () => {
    const mondayKey = '2026-06-01';
    state.shifts[mondayKey] = {
      jose: { shift_type: 'volno', time_start: '00:00', time_end: '24:00' },
      klarka: { shift_type: 'volno', time_start: '00:00', time_end: '24:00' }
    };

    const message = detectOverlaps(weekDates);
    expect(message).toContain('máme **celý den společné volno! 🌴🥳**');
  });

  it('should detect when both work mornings (Společné odpoledne 🍻)', () => {
    const mondayKey = '2026-06-01';
    state.shifts[mondayKey] = {
      jose: { shift_type: 'ranni', time_start: '06:00', time_end: '14:00' },
      klarka: { shift_type: 'ranni', time_start: '06:00', time_end: '14:00' }
    };

    const message = detectOverlaps(weekDates);
    expect(message).toContain('máme společné **odpoledne a večer** (od 14:00!) ☀️🍻');
  });

  it('should detect when both work afternoons (Společné dopoledne ☕)', () => {
    const mondayKey = '2026-06-01';
    state.shifts[mondayKey] = {
      jose: { shift_type: 'odpoledni', time_start: '14:00', time_end: '22:00' },
      klarka: { shift_type: 'odpoledni', time_start: '14:00', time_end: '22:00' }
    };

    const message = detectOverlaps(weekDates);
    expect(message).toContain('máme společné **dopoledne** (do 14:00) ☕');
  });

  it('should detect when they work opposite shifts 😔', () => {
    const mondayKey = '2026-06-01';
    state.shifts[mondayKey] = {
      jose: { shift_type: 'ranni', time_start: '06:00', time_end: '14:00' },
      klarka: { shift_type: 'odpoledni', time_start: '14:00', time_end: '22:00' }
    };

    const message = detectOverlaps(weekDates);
    expect(message).toContain('pracujeme naopak 😔');
  });

  it('should detect when one has off and one has morning shift', () => {
    const mondayKey = '2026-06-01';
    state.shifts[mondayKey] = {
      jose: { shift_type: 'ranni', time_start: '06:00', time_end: '14:00' },
      klarka: { shift_type: 'volno', time_start: '00:00', time_end: '24:00' }
    };

    const message = detectOverlaps(weekDates);
    expect(message).toContain('máme společný čas **od 14:00** (po Jožkově ranní směně) 🥪');
  });

  it('should detect when one has off and one has afternoon shift', () => {
    const mondayKey = '2026-06-01';
    state.shifts[mondayKey] = {
      jose: { shift_type: 'volno', time_start: '00:00', time_end: '24:00' },
      klarka: { shift_type: 'odpoledni', time_start: '14:00', time_end: '22:00' }
    };

    const message = detectOverlaps(weekDates);
    expect(message).toContain('máme společné **dopoledne** (do 14:00, než jde Klárka pracovat) 🍳');
  });

  it('should format date key to YYYY-MM-DD correctly', () => {
    const testDate = new Date(2026, 4, 22); // 22. May 2026
    const key = formatDateKey(testDate);
    expect(key).toBe('2026-05-22');
  });
});
