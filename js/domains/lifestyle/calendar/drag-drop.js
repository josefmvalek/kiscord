/**
 * Drag & Drop and Duration Resize Engine for Kiscord Calendar
 * Supports pointer, mouse, and touch drag gestures for direct rescheduling.
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { supabase } from '@core/supabase.js';
import { START_HOUR, HOUR_HEIGHT, END_HOUR } from './week-view.js';
import { minutesToTime, timeToMinutes } from './time-engine.js';
import { renderCalendar } from './index.js';

let dragState = null;

/**
 * Initializes Drag & Drop and Resize listeners on the calendar container.
 * @param {HTMLElement} container 
 */
export function initCalendarDragDrop(container) {
    if (!container) return;

    // Attach listeners on container via event delegation
    container.onpointerdown = handlePointerDown;
}

function handlePointerDown(e) {
    // 1. Check if clicking on a resize handle
    const resizeHandle = e.target.closest('.cal-resize-handle');
    if (resizeHandle) {
        const card = resizeHandle.closest('.cal-event-card');
        if (!card) return;
        e.preventDefault();
        e.stopPropagation();

        const eventData = getEventDataFromCard(card);
        if (!eventData) return;

        dragState = {
            mode: 'resize',
            card,
            eventData,
            startY: e.clientY,
            initialDuration: eventData.durationMinutes || 60,
            dateKey: card.closest('.cal-day-column')?.getAttribute('data-date-key')
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return;
    }

    // 2. Check if dragging an event card
    const card = e.target.closest('.cal-event-card');
    if (card && !e.target.closest('button') && !e.target.closest('.no-drag')) {
        const eventData = getEventDataFromCard(card);
        if (!eventData || eventData.type === 'fit') {
            // FIT school schedule is read-only anchor
            return;
        }

        // Prepare drag state on slight movement
        dragState = {
            mode: 'drag_pending',
            card,
            eventData,
            startX: e.clientX,
            startY: e.clientY,
            sourceDateKey: card.closest('.cal-day-column')?.getAttribute('data-date-key'),
            ghost: null
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }
}

function handlePointerMove(e) {
    if (!dragState) return;

    if (dragState.mode === 'drag_pending') {
        const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
        if (dist > 6) {
            dragState.mode = 'dragging';
            triggerHaptic('light');

            // Create floating ghost
            const ghost = dragState.card.cloneNode(true);
            ghost.classList.add('cal-drag-ghost', 'fixed', 'pointer-events-none', 'z-50', 'opacity-90', 'scale-105', 'shadow-2xl');
            ghost.style.width = `${dragState.card.offsetWidth}px`;
            ghost.style.height = `${dragState.card.offsetHeight}px`;
            document.body.appendChild(ghost);
            dragState.ghost = ghost;

            dragState.card.style.opacity = '0.3';
        }
        return;
    }

    if (dragState.mode === 'dragging' && dragState.ghost) {
        dragState.ghost.style.left = `${e.clientX - (dragState.ghost.offsetWidth / 2)}px`;
        dragState.ghost.style.top = `${e.clientY - 20}px`;

        // Highlight drop target column
        clearDropHighlights();
        const hoveredCol = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cal-day-column');
        if (hoveredCol) {
            hoveredCol.classList.add('cal-drop-target-active');
        }
    } else if (dragState.mode === 'resize') {
        const deltaY = e.clientY - dragState.startY;
        const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60 / 15) * 15;
        const newDuration = Math.max(15, Math.min(360, dragState.initialDuration + deltaMinutes));

        const height = Math.max(20, (newDuration / 60) * HOUR_HEIGHT);
        dragState.card.style.height = `${height}px`;
        dragState.currentDuration = newDuration;
    }
}

async function handlePointerUp(e) {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);

    if (!dragState) return;

    if (dragState.mode === 'dragging') {
        clearDropHighlights();
        triggerHaptic('medium');

        if (dragState.ghost) {
            dragState.ghost.remove();
        }
        dragState.card.style.opacity = '1';

        // Detect target column and time slot
        const hoveredCol = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cal-day-column');
        if (hoveredCol) {
            const targetDateKey = hoveredCol.getAttribute('data-date-key');
            const rect = hoveredCol.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            const hourIndex = Math.floor(offsetY / HOUR_HEIGHT);
            const targetHour = Math.min(END_HOUR, Math.max(START_HOUR, START_HOUR + hourIndex));
            const newTimeStr = `${String(targetHour).padStart(2, '0')}:00`;

            await applyEventReschedule(dragState.eventData, dragState.sourceDateKey, targetDateKey, newTimeStr);
        }
    } else if (dragState.mode === 'resize' && dragState.currentDuration) {
        triggerHaptic('light');
        await applyEventDurationResize(dragState.eventData, dragState.dateKey, dragState.currentDuration);
    }

    dragState = null;
}

function clearDropHighlights() {
    document.querySelectorAll('.cal-drop-target-active').forEach(el => {
        el.classList.remove('cal-drop-target-active');
    });
}

function getEventDataFromCard(card) {
    const title = card.getAttribute('title') || '';
    const onclickStr = card.getAttribute('onclick') || '';
    const match = onclickStr.match(/Calendar\.openEventDetail\(this,\s*({.*?}),\s*['"](.*?)['"]\)/);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1].replace(/&quot;/g, '"'));
        } catch {}
    }
    return { title, type: 'date', durationMinutes: 60 };
}

/**
 * Reschedules an event to a new date and time.
 */
export async function applyEventReschedule(eventData, sourceDateKey, targetDateKey, newTimeStr) {
    const type = eventData.type;

    if (type === 'date' || type === 'gym') {
        // Update plannedDates
        const plan = (state.plannedDates || {})[sourceDateKey];
        if (plan) {
            delete state.plannedDates[sourceDateKey];
            state.plannedDates[targetDateKey] = {
                ...plan,
                date_key: targetDateKey,
                time: newTimeStr
            };

            try {
                await supabase.from('planned_dates').delete().eq('date_key', sourceDateKey);
                await supabase.from('planned_dates').upsert({
                    ...plan,
                    date_key: targetDateKey,
                    time: newTimeStr
                });
            } catch (e) {
                console.warn('[DragDrop] Supabase sync notice:', e);
            }
        }
    }

    renderCalendar();
}

/**
 * Resizes duration of an event.
 */
export async function applyEventDurationResize(eventData, dateKey, newDurationMinutes) {
    const plan = (state.plannedDates || {})[dateKey];
    if (plan) {
        plan.durationMinutes = newDurationMinutes;
    }
    renderCalendar();
}
