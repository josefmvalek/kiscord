/**
 * Calendar Grid Compatibility Layer
 * Re-exports month and week grid generators.
 */

export * from './month-view.js';
export * from './week-view.js';

import { generateMonthView } from './month-view.js';

// Backward compatibility alias
export const generateCalendarGrid = generateMonthView;
