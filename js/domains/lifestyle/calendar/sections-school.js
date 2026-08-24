/**
 * VUT FIT School Events Actions for Calendar Day Modal
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { getCurrentModalDateKey } from './state.js';

export async function addSchoolEvent() {
    const currentModalDateKey = getCurrentModalDateKey();
    const input = document.getElementById("school-input");
    const title = input?.value?.trim();

    if (!title || !currentModalDateKey) return;

    if (!state.schoolEvents) state.schoolEvents = {};
    state.schoolEvents[currentModalDateKey] = {
        title: title,
        type: "exam",
    };

    try {
        const { supabase } = await import('@core/supabase.js');
        const { error } = await supabase.from('school_events').upsert({
            date_key: currentModalDateKey,
            title: title,
            type: "exam"
        });
        if (error) console.error('[Calendar] Error saving school event:', error);
    } catch (err) {
        console.error('[Calendar] School event save failed:', err);
    }

    const display = document.getElementById("school-event-display");
    const form = document.getElementById("school-add-form");
    const text = document.getElementById("school-event-text");

    if (display && form && text) {
        display.classList.remove("hidden");
        form.classList.add("hidden");
        text.innerText = title;
        const delBtn = display.querySelector("button");
        if (delBtn) delBtn.onclick = () => deleteSchoolEvent();
    }

    const { renderCalendar } = await import('./index.js');
    renderCalendar();
    triggerHaptic("success");
}

export async function deleteSchoolEvent() {
    const currentModalDateKey = getCurrentModalDateKey();
    if (!currentModalDateKey) return;

    triggerHaptic('heavy');
    if (state.schoolEvents) delete state.schoolEvents[currentModalDateKey];

    try {
        const { supabase } = await import('@core/supabase.js');
        const { error } = await supabase.from('school_events').delete().eq('date_key', currentModalDateKey);
        if (error) console.error('[Calendar] Error deleting school event:', error);
    } catch (err) {
        console.error('[Calendar] School event delete failed:', err);
    }

    const display = document.getElementById("school-event-display");
    const form = document.getElementById("school-add-form");
    const input = document.getElementById("school-input");

    if (display && form && input) {
        display.classList.add("hidden");
        form.classList.remove("hidden");
        input.value = "";
    }

    const { renderCalendar } = await import('./index.js');
    renderCalendar();
}
