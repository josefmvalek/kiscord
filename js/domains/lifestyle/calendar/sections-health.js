/**
 * Health Section & Health Editor for Calendar Day Modal
 */

import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { safeUpsert } from '@core/offline.js';
import { getCurrentModalDateKey } from './state.js';

export function toggleHealthEdit() {
    const currentModalDateKey = getCurrentModalDateKey();
    const displayGrid = document.getElementById("health-display-grid");
    const editForm = document.getElementById("health-edit-form");
    if (!displayGrid || !editForm) return;

    if (editForm.classList.contains("hidden")) {
        triggerHaptic('light');
        const health = (state.healthData || {})[currentModalDateKey] || {};
        
        const waterEl = document.getElementById("edit-health-water");
        const sleepEl = document.getElementById("edit-health-sleep");
        const moodEl = document.getElementById("edit-health-mood");
        const moveEl = document.getElementById("edit-health-movement");
        const pillsEl = document.getElementById("edit-health-pills");

        if (waterEl) waterEl.value = health.water || 0;
        
        let sleepVal = health.sleep;
        if (typeof sleepVal === 'string') {
           if (sleepVal === 'zombie') sleepVal = 4;
           else if (sleepVal === 'good') sleepVal = 8;
           else sleepVal = 7;
        }
        if (sleepEl) sleepEl.value = sleepVal !== undefined ? sleepVal : "";

        let moodVal = health.mood;
        if (typeof moodVal === 'number' && moodVal > 10) moodVal = Math.round(moodVal / 10);
        if (typeof moodVal === 'string') {
            if (moodVal === 'happy' || moodVal === 'horny') moodVal = 9;
            else if (moodVal === 'sad' || moodVal === 'angry') moodVal = 3;
            else moodVal = 5;
        }
        if (moodEl) moodEl.value = moodVal !== undefined ? moodVal : "";

        const moves = health.movement || [];
        if (moveEl) moveEl.value = moves.join(", ");
        if (pillsEl) pillsEl.checked = !!health.pills;

        const supps = health.supplements || { iron: false, zinc: false, magnesium: false };
        const ironEl = document.getElementById("edit-health-iron");
        const zincEl = document.getElementById("edit-health-zinc");
        const magnesiumEl = document.getElementById("edit-health-magnesium");
        if (ironEl) ironEl.checked = !!supps.iron;
        if (zincEl) zincEl.checked = !!supps.zinc;
        if (magnesiumEl) magnesiumEl.checked = !!supps.magnesium;

        displayGrid.classList.add("hidden");
        editForm.classList.remove("hidden");
    } else {
        displayGrid.classList.remove("hidden");
        editForm.classList.add("hidden");
    }
}

export async function saveHealthRecord() {
    const currentModalDateKey = getCurrentModalDateKey();
    if (!currentModalDateKey) return;
    
    const water = parseInt(document.getElementById("edit-health-water")?.value) || 0;
    const sleepInput = document.getElementById("edit-health-sleep")?.value;
    const sleep = sleepInput ? parseFloat(sleepInput) : undefined;
    
    const moodInput = document.getElementById("edit-health-mood")?.value;
    const mood = moodInput ? parseInt(moodInput) : undefined;
    
    const movementStr = document.getElementById("edit-health-movement")?.value;
    const movement = movementStr ? movementStr.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : [];
    
    const pillsEl = document.getElementById("edit-health-pills");
    const pills = pillsEl ? pillsEl.checked : false;

    const supplements = {
        iron: document.getElementById("edit-health-iron")?.checked || false,
        zinc: document.getElementById("edit-health-zinc")?.checked || false,
        magnesium: document.getElementById("edit-health-magnesium")?.checked || false
    };

    const existing = (state.healthData || {})[currentModalDateKey] || {};

    let newHealth = {
        ...existing,
        water,
        movement,
        pills,
        supplements
    };
    
    if (sleep !== undefined) newHealth.sleep = sleep;
    if (mood !== undefined) newHealth.mood = mood;

    if (!state.healthData) state.healthData = {};
    state.healthData[currentModalDateKey] = newHealth;

    // Save to Supabase (with offline sync queue support via safeUpsert)
    const { error } = await safeUpsert('health_data', {
        date_key: currentModalDateKey,
        user_id: state.currentUser?.id,
        water: newHealth.water,
        sleep: newHealth.sleep,
        mood: newHealth.mood,
        movement: newHealth.movement,
        pills: newHealth.pills,
        supplements: newHealth.supplements
    });
    if (error) console.error("[Calendar] Error saving health record to Supabase:", error);

    import('@domains/entertainment/achievements.js').then(m => {
        m.checkHealthAchievements(currentModalDateKey, newHealth, state.healthData);
    }).catch(() => {});

    // Save to main state cache for offline resilience
    saveStateToCache();
    
    const { showDayDetail } = await import('./day-modal.js');
    const { renderCalendar } = await import('./index.js');
    showDayDetail(currentModalDateKey);
    renderCalendar();
    
    triggerHaptic("success");
    window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Zdraví uloženo 🏥", type: "success" } }));
}
