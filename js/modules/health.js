import { state } from '../core/state.js';
import { triggerHaptic, getTodayKey } from '../core/utils.js';
// import { factsLibrary } from '../data.js'; // Smazáno, nyní ze state
import { supabase } from '../core/supabase.js';

// --- DATA LOGIC ---

export function getTodayData() {
    const todayKey = getTodayKey();

    // Ensure healthData exists
    if (!state.healthData) state.healthData = {};

    if (!state.healthData[todayKey]) {
        state.healthData[todayKey] = {
            water: 0,
            mood: 50,
            sleep: 0,
            movement: [] // Array of IDs: 'gym', 'walk', 'sex'
        };
        // Save empty state immediately fallback - User Specific
        const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
        localStorage.setItem(storageKey, JSON.stringify(state.healthData));
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
    
    // Cloud Save (Supabase)
    const { error } = await supabase.from('health_data').upsert({
        date_key: todayKey,
        user_id: state.currentUser.id,
        water: data.water,
        sleep: data.sleep,
        mood: data.mood,
        movement: data.movement
    });
    if (error) console.error("Error saving health to Supabase:", error);

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

// --- UI GENERATORS ---

export function generateWaterIcons() {
    const data = getTodayData();
    const waterCount = data.water || 0;
    let html = '';

    for (let i = 1; i <= 8; i++) {
        const isFilled = i <= waterCount;
        const opacity = isFilled ? 'opacity-100' : 'opacity-30 hover:opacity-100';
        const scale = isFilled ? 'scale-110' : 'scale-100';
        const shadow = isFilled ? 'drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]' : '';

        html += `
            <button onclick="import('./js/modules/health.js').then(m => m.updateHealth('water', ${i}))" 
                    class="transition-all duration-300 transform ${opacity} ${scale} ${shadow} hover:scale-125 active:scale-90"
                    title="${i * 250}ml">
                <i class="fas fa-tint text-2xl text-[#00e5ff]"></i>
            </button>
        `;
    }
    return html;
}

export function generateMoodSlider() {
    const data = getTodayData();
    const currentMood = data.mood || 50; // 0-100
    // Convert 0-100 to 1-10 scale for display
    const moodVal = Math.round(currentMood / 10) || 5;

    let icon = '😐';
    // Mapování podle Czippelometru
    if (moodVal <= 10) icon = '💎';
    if (moodVal <= 9) icon = '🥰';
    if (moodVal <= 8) icon = '🕺';
    if (moodVal <= 7) icon = '🧙‍♀️';
    if (moodVal <= 6) icon = '🚬';
    if (moodVal <= 5) icon = '🫤';
    if (moodVal <= 4) icon = '😐';
    if (moodVal <= 3) icon = '🙈';
    if (moodVal <= 2) icon = '💩';
    if (moodVal <= 1) icon = '🤬';

    return `
        <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center text-[#eb459e] font-bold">
                <span id="mood-val-display" class="text-2xl">${moodVal}/10</span>
                <span id="mood-icon-display" class="text-4xl animate-bounce-slow">${icon}</span>
            </div>
            <input type="range" min="10" max="100" step="10" value="${currentMood}" 
                   class="w-full h-3 bg-[#2f3136] rounded-lg appearance-none cursor-pointer accent-[#eb459e] hover:accent-[#ff69b4] transition-all"
                   oninput="import('./js/modules/health.js').then(m => m.updateMoodVisuals(this.value));"
                   onchange="import('./js/modules/health.js').then(m => m.updateHealth('mood', this.value))">
            <div class="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>🤬 Zmar</span>
                <span>😐 Meh</span>
                <span>💎 Top</span>
            </div>
        </div>
    `;
}

export function updateMoodVisuals(val) {
    const moodVal = Math.round(val / 10);
    const display = document.getElementById('mood-val-display');
    const iconDisplay = document.getElementById('mood-icon-display');

    if (display) display.innerText = `${moodVal}/10`;

    let icon = '😐';
    if (moodVal === 1) icon = '🤬';
    else if (moodVal === 2) icon = '💩';
    else if (moodVal === 3) icon = '🙈';
    else if (moodVal === 4) icon = '😐';
    else if (moodVal === 5) icon = '🫤';
    else if (moodVal === 6) icon = '🚬';
    else if (moodVal === 7) icon = '🧙‍♀️';
    else if (moodVal === 8) icon = '🕺';
    else if (moodVal === 9) icon = '🥰';
    else if (moodVal === 10) icon = '💎';

    if (iconDisplay) iconDisplay.innerText = icon;
}

export function generateMovementChips() {
    const data = getTodayData();
    const activeMoves = data.movement || [];

    const activities = [
        { id: 'gym', icon: '💪', label: 'Fitko' },
        { id: 'walk', icon: '🌲', label: 'Procházka' },
        { id: 'run', icon: '🏃‍♀️', label: 'Běh' },
        { id: 'yoga', icon: '🧘‍♀️', label: 'Jóga' },
        { id: 'sex', icon: '🔥', label: 'Love' },
        { id: 'clean', icon: '🧹', label: 'Úklid' }
    ];

    return activities.map(act => {
        const isActive = activeMoves.includes(act.id);
        const bgClass = isActive ? 'bg-[#3ba55c] text-white border-[#3ba55c] shadow-[0_0_10px_rgba(59,165,92,0.4)]' : 'bg-[#2f3136] text-gray-400 border-gray-700 hover:border-gray-500';

        return `
            <button onclick="import('./js/modules/health.js').then(m => m.updateHealth('movement', '${act.id}'))" 
                    class="${bgClass} border px-3 py-2 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95">
                <span class="text-lg">${act.icon}</span>
                <span class="text-xs font-bold uppercase tracking-wide">${act.label}</span>
            </button>
        `;
    }).join('');
}

// --- SLEEP TRACKER LOGIC ---

export function getSleepColor(hours) {
    if (hours >= 9) return { hex: '#e040fb', class: 'text-[#e040fb]' }; // Růženka (Purple/Pink)
    if (hours >= 7) return { hex: '#00e5ff', class: 'text-[#00e5ff]' }; // Ideál (Cyan)
    if (hours >= 5) return { hex: '#faa61a', class: 'text-[#faa61a]' }; // Nic moc (Orange)
    return { hex: '#ed4245', class: 'text-[#ed4245]' }; // Zombie (Red)
}

export function generateSleepSlider() {
    const data = getTodayData();
    const currentSleep = data.sleep || 0; // Hours
    const color = getSleepColor(currentSleep);

    return `
        <div class="relative pt-6 pb-2 px-2">
             <div class="absolute -top-1 left-0 right-0 flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>Zombie</span>
                <span>Ideál</span>
                <span>Růženka</span>
            </div>
            
            <input type="range" min="0" max="12" step="0.5" value="${currentSleep}" 
                   class="w-full h-4 bg-[#2f3136] rounded-full appearance-none cursor-pointer shadow-inner"
                   style="background: linear-gradient(to right, #ed4245 0%, #faa61a 40%, #00e5ff 60%, #e040fb 100%); opacity: 0.8;"
                   oninput="document.getElementById('sleep-val-display').innerText = this.value + 'h'; document.getElementById('sleep-val-display').style.color = import('./js/modules/health.js').then(m => m.getSleepColor(this.value).hex);"
                   onchange="import('./js/modules/health.js').then(m => m.updateHealth('sleep', parseFloat(this.value)))">
            
            <div class="mt-3 text-center">
                <span id="sleep-val-display" class="text-3xl font-black drop-shadow-md transition-colors" style="color: ${color.hex}">${currentSleep}h</span>
            </div>
        </div>
    `;
}

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
    const diffMs = now - startTime;

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
    const labelEl = document.getElementById('sleep-session-label'); // New label in controls

    const color = getSleepColor(diffHours);

    // Update Slider (Visual only, no save)
    if (progressBar) {
        progressBar.style.width = `${(diffHours / 12) * 100}%`;
        progressBar.style.backgroundColor = color.hex;
        progressBar.style.boxShadow = `0 0 15px ${color.hex}80`;
    }
    if (marker) {
        marker.style.left = `${(diffHours / 12) * 100}%`;
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
    const controls = document.getElementById('sleep-controls-container');
    if (controls) controls.innerHTML = generateSleepControls();
}

export async function wakeUp() {
    if (!state.currentSleepSession) return;

    const now = new Date();
    const startTime = new Date(state.currentSleepSession.startTime);
    const diffMs = now - startTime;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Save actual sleep to Today's data
    const data = getTodayData();
    data.sleep = parseFloat(diffHours.toFixed(1)); // Round to 1 decimal
    const todayKey = getTodayKey();
    state.healthData[todayKey] = data;

    // Cloud Save
    const { error } = await supabase.from('health_data').upsert({
        date_key: todayKey,
        water: data.water,
        sleep: data.sleep,
        mood: data.mood,
        movement: data.movement
    });
    if (error) console.error("Error saving sleep to Supabase:", error);

    const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(state.healthData));

    // Reset Session
    state.currentSleepSession = { isSleeping: false, startTime: null };
    localStorage.removeItem('klarka_sleep_session');

    stopSleepTimer();
    triggerGoodMorningOverlay();

    // Refresh UI
    if (state.currentChannel === 'dashboard') {
        window.dispatchEvent(new CustomEvent('health-updated')); // Re-render dashboard
    }
}

export function generateSleepControls() {
    const isSleeping = state.currentSleepSession?.isSleeping;

    if (isSleeping) {
        return `
            <div class="bg-[#2f3136] rounded-xl p-4 border border-[#5865F2]/50 shadow-lg animate-pulse-slow">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-[#5865F2] uppercase tracking-widest animate-pulse">🌙 Režim spánku aktivní</span>
                    <span id="sleep-session-label" class="text-xs text-gray-400 font-mono">Počítám ovečky...</span>
                </div>
                
                <div class="flex items-center justify-between">
                     <div id="sleep-value-text" class="text-2xl font-black text-white">
                        -- <span class="text-sm text-gray-500">min</span>
                     </div>
                     <button onclick="import('./js/modules/health.js').then(m => m.wakeUp())" 
                             class="bg-[#eb459e] hover:bg-[#ff69b4] text-white px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(235,69,158,0.4)] transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
                         <i class="fas fa-sun text-yellow-300"></i> Vstávat
                     </button>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="flex gap-2">
                <button onclick="import('./js/modules/health.js').then(m => m.startSleep())" 
                        class="flex-1 bg-[#202225] border border-[#5865F2] hover:bg-[#5865F2] text-gray-300 hover:text-white px-4 py-3 rounded-xl font-bold transition group">
                    <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">😴</div>
                    <div class="text-[10px] uppercase tracking-wide">Jdu spát</div>
                </button>
                
                 <button onclick="import('./js/modules/health.js').then(m => m.triggerNapOverlay())" 
                        class="flex-1 bg-[#202225] border border-[#faa61a] hover:bg-[#faa61a] text-gray-300 hover:text-white px-4 py-3 rounded-xl font-bold transition group">
                    <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">🔋</div>
                    <div class="text-[10px] uppercase tracking-wide">Šlofík</div>
                </button>
            </div>
        `;
    }
}

// --- OVERLAYS ---

export function triggerGoodnightOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in pointer-events-none';
    overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-bounce">🌙</div>
        <h2 class="text-3xl font-bold text-[#5865F2] mb-2">Dobrou noc, ${state.currentUser.name}!</h2>
        <p class="text-gray-400">Sladké sny... 😴</p>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.classList.add('opacity-0', 'transition-opacity', 'duration-1000');
        setTimeout(() => overlay.remove(), 1000);
    }, 2500);
}

export function triggerGoodMorningOverlay() {
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in pointer-events-none';
    overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-spin-slow">☀️</div>
        <h2 class="text-3xl font-bold text-[#faa61a] mb-2">Dobré ráno!</h2>
        <p class="text-gray-400">Vyspaná do růžova? 👸</p>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.classList.add('opacity-0', 'transition-opacity', 'duration-1000');
        setTimeout(() => overlay.remove(), 1000);
    }, 3000);
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
