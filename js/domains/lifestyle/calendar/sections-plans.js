/**
 * Date Plans, Custom Events & Checklist Actions for Calendar Day Modal
 */

import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showConfirmDialog } from '@core/theme.js';
import { getCurrentModalDateKey } from './state.js';

export async function deletePlannedDate(dateKey) {
    if (!state.plannedDates) state.plannedDates = {};
    delete state.plannedDates[dateKey];

    try {
        const { supabase } = await import('@core/supabase.js');
        await supabase.from('planned_dates').delete().eq('date_key', dateKey);
    } catch (err) {
        console.error('Failed to delete planned date:', err);
    }

    saveStateToCache();
    const { showDayDetail } = await import('./day-modal.js');
    const { renderCalendar } = await import('./index.js');
    showDayDetail(dateKey);
    renderCalendar();
    triggerHaptic("medium");
    window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Plán smazán 🗑️", type: "info" } }));
}

export async function addCustomPlan() {
    const currentModalDateKey = getCurrentModalDateKey();
    const type = document.getElementById("plan-type")?.value || 'date';
    const name = document.getElementById("plan-name")?.value || '';
    const time = document.getElementById("plan-time")?.value || '';
    const backup = document.getElementById("plan-backup")?.value?.trim() || '';
    const checklistRaw = document.getElementById("plan-checklist")?.value?.trim() || '';
    const checklist = checklistRaw
        ? checklistRaw.split(',').map(s => ({ text: s.trim(), done: false })).filter(i => i.text)
        : [];

    if (!name || !currentModalDateKey) return;

    // Shift conflict validation
    if (time) {
        const dayShifts = (state.shifts || {})[currentModalDateKey];
        if (dayShifts) {
            let conflictMsg = "";
            
            // Check for Jožka
            if (dayShifts.jose && dayShifts.jose.shift_type !== 'volno' && dayShifts.jose.time_start && dayShifts.jose.time_end) {
                const start = dayShifts.jose.time_start;
                const end = dayShifts.jose.time_end;
                if (time >= start && time <= end) {
                    conflictMsg += `• Jožka má v tuto dobu směnu (${start} - ${end})\n`;
                }
            }
            
            // Check for Klárka
            if (dayShifts.klarka && dayShifts.klarka.shift_type !== 'volno' && dayShifts.klarka.time_start && dayShifts.klarka.time_end) {
                const start = dayShifts.klarka.time_start;
                const end = dayShifts.klarka.time_end;
                if (time >= start && time <= end) {
                    conflictMsg += `• Klárka má v tuto dobu směnu (${start} - ${end})\n`;
                }
            }
            
            if (conflictMsg) {
                const confirmSave = await showConfirmDialog(`⚠️ Pozor! Plánovaný čas koliduje s pracovní směnou:\n\n${conflictMsg}\nChceš plán přesto uložit?`, 'Uložit i tak', 'Zrušit');
                if (!confirmSave) {
                    triggerHaptic("heavy");
                    return;
                }
            }
        }
    }

    if (!state.plannedDates) state.plannedDates = {};
    
    const planId = crypto.randomUUID();
    const planData = {
        id: planId,
        name: name,
        cat: type,
        time: time,
        note: '',
        status: 'idea',
        backup_plan: backup,
        checklist: checklist
    };
    state.plannedDates[currentModalDateKey] = planData;

    try {
        const { supabase } = await import('@core/supabase.js');
        const { error } = await supabase.from('planned_dates').upsert({
            id: planId,
            date_key: currentModalDateKey,
            name: name,
            cat: type,
            time: time,
            note: '',
            status: 'idea',
            backup_plan: backup,
            checklist: JSON.stringify(checklist),
            updated_at: new Date().toISOString()
        }, { onConflict: 'date_key' });

        if (error) throw error;
    } catch (err) {
        console.error('Failed to save custom plan:', err);
        window.dispatchEvent(new CustomEvent('notification', { 
            detail: { message: "Chyba synchronizace se serverem ☁️", type: "error" } 
        }));
    }

    const { showDayDetail } = await import('./day-modal.js');
    const { renderCalendar } = await import('./index.js');
    showDayDetail(currentModalDateKey);
    renderCalendar();
    triggerHaptic("success");
}

export async function cyclePlanStatus(dateKey) {
    const plan = (state.plannedDates || {})[dateKey];
    if (!plan) return;

    const statusOrder = ['idea', 'confirmed', 'happened'];
    const current = plan.status || 'idea';
    const nextStatus = statusOrder[(statusOrder.indexOf(current) + 1) % statusOrder.length];

    plan.status = nextStatus;
    triggerHaptic('light');

    try {
        const { supabase } = await import('@core/supabase.js');
        await supabase.from('planned_dates')
            .update({ status: nextStatus })
            .eq('date_key', dateKey);
    } catch (err) {
        console.error('Failed to update plan status:', err);
    }

    const { showDayDetail } = await import('./day-modal.js');
    const { renderCalendar } = await import('./index.js');
    showDayDetail(dateKey);
    renderCalendar();
}

export async function toggleChecklistItem(dateKey, itemIndex) {
    const plan = (state.plannedDates || {})[dateKey];
    if (!plan || !plan.checklist) return;

    plan.checklist[itemIndex].done = !plan.checklist[itemIndex].done;
    triggerHaptic('light');

    try {
        const { supabase } = await import('@core/supabase.js');
        await supabase.from('planned_dates')
            .update({ checklist: JSON.stringify(plan.checklist) })
            .eq('date_key', dateKey);
    } catch (err) {
        console.error('Failed to update checklist:', err);
    }

    const { showDayDetail } = await import('./day-modal.js');
    showDayDetail(dateKey);
}
