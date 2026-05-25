import { describe, it, expect } from 'vitest';
import { getTodayKey } from '../../js/core/utils.js';

describe('Date & Timezone Utilities', () => {
  it('should format today key correctly as YYYY-MM-DD', () => {
    const todayKey = getTodayKey();
    expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(todayKey).toBe(expected);
  });

  it('should parse YYYY-MM-DD timezone-safely without shifting', () => {
    const dateStr = '2026-06-01';
    
    // Parse using timezone-safe splitting approach
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const localDate = new Date(yr, mo - 1, dy);

    expect(localDate.getFullYear()).toBe(2026);
    expect(localDate.getMonth()).toBe(5); // June is 5 (0-indexed)
    expect(localDate.getDate()).toBe(1);

    // Verify it formats to "1. 6. 2026" or similar in cs-CZ locale
    const formatted = localDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
    expect(formatted.replace(/\s/g, '')).toBe('1.6.2026');
  });

  it('should handle leap years correctly', () => {
    const leapDateStr = '2028-02-29';
    const [yr, mo, dy] = leapDateStr.split('-').map(Number);
    const localDate = new Date(yr, mo - 1, dy);

    expect(localDate.getFullYear()).toBe(2028);
    expect(localDate.getMonth()).toBe(1); // February is 1
    expect(localDate.getDate()).toBe(29);
  });
});
