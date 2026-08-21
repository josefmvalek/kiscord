/**
 * Deduplicates and sorts timeline events by date descending.
 * @param {Array<object>} events
 * @returns {Array<object>}
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
        return dateB - dateA;
    });
}
