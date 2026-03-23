import { state, saveStateToCache } from '../core/state.js';
import { triggerHaptic, getTodayKey } from '../core/utils.js';
import { supabase } from '../core/supabase.js';
import { broadcastHealthUpdate } from '../core/sync.js';
import { safeUpsert } from '../core/offline.js';

// --- INITIALIZATION ---
// Load sleep session if exists
const savedSession = localStorage.getItem('klarka_sleep_session');
if (savedSession) {
    try {
        state.currentSleepSession = JSON.parse(savedSession);
        if (state.currentSleepSession && state.currentSleepSession.isSleeping) {
            startSleepTimer();
        }
    } catch (e) {
        console.error("Error parsing sleep session:", e);
    }
}

// --- DATA LOGIC ---

export function getTodayData() {
    const todayKey = getTodayKey();

    // Ensure healthData exists
    if (!state.healthData) state.healthData = {};

    if (!state.healthData[todayKey]) {
        state.healthData[todayKey] = {
            water: 0,
            mood: 5,
            sleep: 0,
            movement: []
        };
        saveStateToCache();
    }
    return state.healthData[todayKey];
}

export async function updateHealth(type, value) {
    const data = getTodayData();
    const todayKey = getTodayKey();

    // --- LOGIC PER TYPE ---
    if (type === 'mood') {
        data.mood = value;
    }
    else if (type === 'water') {
        // Toggle logic for water buttons:
        // If clicking the current level, decrease by 1 (unfill).
        // Otherwise set to clicked level.
        if (data.water === value) data.water = value - 1;
        else data.water = value;
    }
    else if (type === 'movement') {
        if (!data.movement || !Array.isArray(data.movement)) {
            data.movement = [];
        }
        // Val is ID (e.g. 'gym')
        const activityId = value;
        const index = data.movement.indexOf(activityId);

        if (index !== -1) {
            // Remove
            data.movement.splice(index, 1);
            triggerHaptic('light');
        } else {
            // Add
            data.movement.push(activityId);
            triggerHaptic('success');
        }
    }

    // --- SAVE ---
    state.healthData[todayKey] = data;
    
    // Cloud Save (Supabase) - Offline Ready
    const { error } = await safeUpsert('health_data', {
        date_key: todayKey,
        user_id: state.currentUser.id,
        water: data.water,
        sleep: data.sleep || 0,
        mood: data.mood,
        movement: data.movement,
        bedtime: data.bedtime // Added: persist bedtime
    });
    if (error) console.error("Error saving health to Supabase:", error);
    else {
        // Successful save - Broadcast the up-to-date row to partner
        broadcastHealthUpdate({
            date_key: todayKey,
            user_id: state.currentUser.id,
            water: data.water,
            sleep: data.sleep,
            mood: data.mood,
            movement: data.movement
        });
    }

    // Achievement Hook
    import('./achievements.js').then(m => {
        m.checkHealthAchievements(todayKey, data, state.healthData);
    });

    // Local Fallback Save - User Specific
    const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(state.healthData));

    // --- RE-RENDER ---
    // Essential to update UI state (active classes, colors)
    // We dispatch a custom event so other modules (Dashboard) can react
    window.dispatchEvent(new CustomEvent('health-updated'));
}

export function updateBedtime(time) {
    const data = getTodayData();
    const todayKey = getTodayKey();
    data.bedtime = time;
    const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(state.healthData));
    triggerHaptic('light');

    // Cloud Save (Supabase)
    safeUpsert('health_data', {
        date_key: todayKey,
        user_id: state.currentUser.id,
        water: data.water || 0,
        sleep: data.sleep || 0,
        mood: data.mood || 5,
        movement: data.movement || [],
        bedtime: time
    }).then(({ error }) => {
        if (error) console.error("Error saving bedtime to Supabase:", error);
    });

    // Broadcast bedtime update
    broadcastHealthUpdate({
        date_key: todayKey,
        user_id: state.currentUser.id,
        water: data.water || 0,
        sleep: data.sleep || 0,
        mood: data.mood || 5,
        movement: data.movement || [],
        bedtime: time
    });
}

export function saveDailyNote() {
    const note = document.getElementById('daily-note').value;
    const key = getTodayKey();

    if (!state.healthData[key]) getTodayData(); // Ensure exists

    const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(state.healthData));

    // Visual feedback
    const btn = document.querySelector('#daily-note + button');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Uloženo';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    }
    triggerHaptic('success');
}


// --- SLEEP TRACKER LOGIC ---

// REMOVED getSleepColor and generateSleepSlider - they are in health_ui.js

// --- SLEEP TIMER (PROGRESSIVE) ---

var sleepTimerInterval = null;

export function startSleepTimer() {
    if (sleepTimerInterval) clearInterval(sleepTimerInterval);

    // Update immediately then every minute
    updateSleepVisuals();
    sleepTimerInterval = setInterval(updateSleepVisuals, 60000); // 1 minuta
}

export function stopSleepTimer() {
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
    }
}

export function updateSleepVisuals() {
    if (!state.currentSleepSession || !state.currentSleepSession.isSleeping) return;

    const now = new Date();
    const startTime = new Date(state.currentSleepSession.startTime);
    let diffMs = now - startTime;
    if (isNaN(startTime.getTime()) || diffMs < 0) diffMs = 0;

    // Convert to decimal hours for slider width
    let diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 12) diffHours = 12; // Cap visual at 12h

    // Format text (Hours + Min)
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Get Elements
    const progressBar = document.getElementById('sleep-progress-bar');
    const marker = document.getElementById('sleep-marker');
    const textEl = document.getElementById('sleep-value-text');
    const labelEl = document.getElementById('sleep-session-label'); 

    // Import color from health_ui.js (unified source of truth)
    import('/js/modules/dashboard/health_ui.js').then(m => {
        const color = m.getSleepColor(diffHours);

        // Update Slider (Visual only, no save)
        if (progressBar) {
            progressBar.style.width = `${(diffHours / 10) * 100}%`;
            progressBar.style.backgroundColor = color.hex;
            progressBar.style.boxShadow = `0 0 15px ${color.hex}80`;
        }
        if (marker) {
            marker.style.left = `${(diffHours / 10) * 100}%`;
        }

        // Update Main Text
        if (textEl) {
            textEl.innerHTML = `${hours} <span class="text-sm opacity-80 font-bold text-gray-400">hod</span> <span class="text-2xl opacity-60 font-bold text-gray-500">${mins} <span class="text-sm">min</span></span>`;
            textEl.className = `font-black text-4xl ${color.class} transition-colors duration-200 leading-none drop-shadow-md filter brightness-110 flex items-baseline gap-2`;
        }

        // Update Small Label
        if (labelEl) {
            labelEl.textContent = `Spíš ${hours}h ${mins}m`;
        }
    });
}

// --- SLEEP CONTROLS ---

export function startSleep() {
    state.currentSleepSession = {
        isSleeping: true,
        startTime: new Date().toISOString(),
        bedTime: new Date().toISOString()
    };
    // Save
    localStorage.setItem('klarka_sleep_session', JSON.stringify(state.currentSleepSession));

    triggerGoodnightOverlay();
    startSleepTimer();

    // Refresh UI
    window.dispatchEvent(new CustomEvent('health-updated'));
    
    const controls = document.getElementById('sleep-controls-container');
    if (controls) {
        import('/js/modules/dashboard/health_ui.js').then(m => {
            controls.innerHTML = m.generateSleepControls(getTodayData());
        });
    }
}

export async function wakeUp() {
    if (!state.currentSleepSession || !state.currentSleepSession.isSleeping) return;

    const now = new Date();
    let startTimeStr = state.currentSleepSession.startTime;
    
    // VALIDATION: If startTime is missing or invalid, do not record duration
    if (!startTimeStr) {
        console.warn("[Sleep] No startTime found, skipping duration record.");
    } else {
        const startTime = new Date(startTimeStr);
        if (isNaN(startTime.getTime())) {
            console.warn("[Sleep] Invalid startTime, skipping duration record.");
        } else {
            const diffMs = now - startTime;
            // Prevent Jan 1, 1970 bug (diff would be ~492000 hours)
            const diffHours = diffMs / (1000 * 60 * 60);
            
            if (diffHours > 24 || diffHours < 0) {
                 console.warn(`[Sleep] Impossible duration detected (${diffHours.toFixed(1)}h), skipping record.`);
            } else {
                // Save actual sleep to Today's data
                const data = getTodayData();
                data.sleep = parseFloat(diffHours.toFixed(1)); // Round to 1 decimal
                const todayKey = getTodayKey();
                state.healthData[todayKey] = data;

                // Cloud Save (Supabase)
                try {
                    const { error } = await supabase.from('health_data').upsert({
                        date_key: todayKey,
                        user_id: state.currentUser.id,
                        water: data.water,
                        sleep: data.sleep,
                        mood: data.mood,
                        movement: data.movement
                    });
                    if (error) console.error("Error saving sleep to Supabase:", error);

                    // Broadcast update so partner sees it immediately
                    broadcastHealthUpdate({
                        date_key: todayKey,
                        user_id: state.currentUser.id,
                        water: data.water,
                        sleep: data.sleep,
                        mood: data.mood,
                        movement: data.movement
                    });

                    // Achievement Hook
                    import('./achievements.js').then(m => {
                        m.checkHealthAchievements(todayKey, data, state.healthData);
                    });

                    const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
                    localStorage.setItem(storageKey, JSON.stringify(state.healthData));
                } catch (e) {
                    console.error("[Sleep] Error during wakeUp sequence:", e);
                }
            }
        }
    }

    // Reset Session ALWAYS
    state.currentSleepSession = { isSleeping: false, startTime: null };
    localStorage.removeItem('klarka_sleep_session');

    stopSleepTimer();
    triggerGoodMorningOverlay();

    // Refresh UI
    if (state.currentChannel === 'dashboard') {
        window.dispatchEvent(new CustomEvent('health-updated')); // Re-render dashboard
        const controls = document.getElementById('sleep-controls-container');
        if (controls) {
            import('/js/modules/dashboard/health_ui.js').then(m => {
                const data = getTodayData();
                controls.innerHTML = m.generateSleepControls(data);
                
                // ALSO reset the visual slider state manually on wake up 
                m.updateSleep(data.sleep || 0);
            });
        }
    }
}

// REMOVED duplicate generateSleepControls here. 
// It is now fully managed in dashboard/health_ui.js for consistency.

// --- OVERLAYS ---

export function triggerGoodnightOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in cursor-pointer group';
    overlay.onclick = () => { 
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.remove(), 300);
    };
    overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-bounce">🌙</div>
        <h2 class="text-3xl font-bold text-[#5865F2] mb-2">Dobrou noc, ${state.currentUser.name}!</h2>
        <p class="text-gray-400">Sladké sny... 😴</p>
        <div class="mt-8 text-[10px] text-white/20 uppercase tracking-[0.3em] group-hover:text-white/40 transition-colors">Klikni kamkoliv pro zavření</div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.classList.add('opacity-0', 'transition-opacity', 'duration-1000');
            setTimeout(() => overlay.remove(), 1000);
        }
    }, 4500);
}

export function triggerGoodMorningOverlay() {
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in cursor-pointer group';
    overlay.onclick = () => {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.remove(), 300);
    };
    overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-spin-slow">☀️</div>
        <h2 class="text-3xl font-bold text-[#faa61a] mb-2">Dobré ráno!</h2>
        <p class="text-gray-400">Vyspaná do růžova? 👸</p>
        <div class="mt-8 text-[10px] text-white/20 uppercase tracking-[0.3em] group-hover:text-white/40 transition-colors">Klikni kamkoliv pro zavření</div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.classList.add('opacity-0', 'transition-opacity', 'duration-1000');
            setTimeout(() => overlay.remove(), 1000);
        }
    }, 5000);
}

export function triggerNapOverlay() {
    // Quick Nap Logic - just visual, doesn't start full tracker
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm cursor-pointer';
    overlay.onclick = () => { triggerRechargedOverlay(); overlay.remove(); };
    overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-pulse">🔋</div>
        <h2 class="text-2xl font-bold text-[#faa61a] mb-4">Režim nabíjení...</h2>
        <p class="text-gray-400 text-sm mb-8">Dej si 20 minut. Až budeš ready, klikni sem.</p>
        <div class="w-16 h-16 border-4 border-[#faa61a] border-t-transparent rounded-full animate-spin"></div>
    `;
    document.body.appendChild(overlay);
}

export function triggerRechargedOverlay() {
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm pointer-events-none';
    overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-bounce">⚡</div>
        <h2 class="text-3xl font-bold text-[#00e5ff] mb-2">DOBITO!</h2>
        <p class="text-gray-400">Jsi připravena na cokoliv! 💪</p>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.classList.add('opacity-0', 'transition-opacity', 'duration-1000');
        setTimeout(() => overlay.remove(), 1000);
    }, 2000);
}

export function refreshDashboardFact() {
    const facts = state.factsLibrary.raccoon || [];
    const randomFact = facts[Math.floor(Math.random() * facts.length)];

    const container = document.getElementById('dashboard-fact-container');
    if (container) {
        // Animate out
        container.style.opacity = '0';
        container.style.transform = 'translateY(5px)';

        setTimeout(() => {
            container.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="text-2xl bg-[#202225] p-2 rounded-lg">${randomFact.icon || '🦝'}</div>
                    <div>
                        <p class="text-gray-300 text-sm italic leading-relaxed">"${randomFact.text}"</p>
                    </div>
                </div>
           `;
            // Animate in
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 300);
    }
}
