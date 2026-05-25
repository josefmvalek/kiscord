import { describe, it, expect } from 'vitest';

/**
 * Jednoduchá a robustní deduplikační a řadící funkce pro časovou osu.
 * Zajišťuje, že v seznamu událostí nebudou dvě identické události (se stejným titulkem a datem)
 * a že události jsou seřazeny sestupně podle data.
 */
export function deduplicateAndSortEvents(events) {
  if (!events || !Array.isArray(events)) return [];

  const seen = new Set();
  const uniqueEvents = [];

  for (const event of events) {
    const key = `${event.title || ''}_${event.event_date || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(event);
    }
  }

  return uniqueEvents.sort((a, b) => {
    const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
    return dateB - dateA; // Sestupně (nejnovější nahoře)
  });
}

describe('Timeline Deduplication & Sorting', () => {
  it('should remove duplicate events with same title and date', () => {
    const rawEvents = [
      { id: '1', title: 'Výlet na Hallstatt', event_date: '2026-05-15', description: 'První záznam' },
      { id: '2', title: 'Výlet na Hallstatt', event_date: '2026-05-15', description: 'Duplicitní záznam' },
      { id: '3', title: 'Nákupy v Linci', event_date: '2026-05-16', description: 'Jiná událost' },
    ];

    const result = deduplicateAndSortEvents(rawEvents);
    
    expect(result.length).toBe(2);
    // Matrix comparison to verify duplicates are deleted
    const titles = result.map(e => e.title);
    expect(titles).toContain('Výlet na Hallstatt');
    expect(titles).toContain('Nákupy v Linci');
    // Description should be from the first occurrence
    const hallstatt = result.find(e => e.title === 'Výlet na Hallstatt');
    expect(hallstatt.description).toBe('První záznam');
  });

  it('should sort timeline events chronologically descending', () => {
    const rawEvents = [
      { id: '1', title: 'Nejstarší', event_date: '2026-05-01' },
      { id: '2', title: 'Nejnovější', event_date: '2026-05-20' },
      { id: '3', title: 'Prostřední', event_date: '2026-05-10' },
    ];

    const result = deduplicateAndSortEvents(rawEvents);

    expect(result[0].title).toBe('Nejnovější');
    expect(result[1].title).toBe('Prostřední');
    expect(result[2].title).toBe('Nejstarší');
  });

  it('should handle empty or null values gracefully', () => {
    expect(deduplicateAndSortEvents(null)).toEqual([]);
    expect(deduplicateAndSortEvents([])).toEqual([]);
  });
});
