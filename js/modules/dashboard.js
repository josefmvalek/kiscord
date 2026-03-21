
import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { isJosef } from '../core/auth.js';
import { getTodayData, updateHealth, updateBedtime, startSleep, wakeUp, startSleepTimer } from './health.js';
import { triggerHaptic, triggerConfetti, getInflectedName, getTodayKey } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { getTetrisScore } from './games.js';
import { broadcastSunlight } from '../core/sync.js';

// --- HELPERS ---

function getDaysTogether() {
    const start = new Date(state.startDate);
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// --- VISUAL GENERATORS (Mood/Water/Movement/Sleep) ---

export function generateMoodSlider(currentMood) {
    let value = typeof currentMood === 'number' ? currentMood : 5;
    const bubbleImage = `img/mood/${value}.jpg`;

    return `
    <div class="mood-slider-container" id="mood-slider-wrapper" 
        onmousedown="this.classList.add('dragging')"
        onmouseup="this.classList.remove('dragging'); import('./js/modules/dashboard.js').then(m => m.hideMoodBubble())"
        ontouchstart="this.classList.add('dragging')"
        ontouchend="this.classList.remove('dragging'); import('./js/modules/dashboard.js').then(m => m.hideMoodBubble())"
        onpointerup="this.classList.remove('dragging'); import('./js/modules/dashboard.js').then(m => m.hideMoodBubble())">
        <div class="mood-bubble-wrapper" id="mood-bubble">
            <div class="mood-bubble">
                <img src="${bubbleImage}" id="mood-bubble-img" alt="Mood" onerror="this.src='img/app/czippel2_kytka.jpg'">
            </div>
            <div class="mood-rating-value" id="mood-bubble-value">${value}/10</div>
        </div>
        <input type="range" min="1" max="10" step="1" value="${value}"
            oninput="import('./js/modules/dashboard.js').then(m => m.updateMoodVisuals(this.value))"
            onchange="import('./js/modules/health.js').then(m => m.updateHealth('mood', parseInt(this.value)))"
            class="mood-range"
            id="mood-range-input">
        <div class="flex justify-between w-full px-1 mt-2">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n =>
        `<span class="text-[10px] font-bold text-gray-500 mood-number ${n === value ? 'active' : ''}" 
                       id="mood-num-${n}" 
                       onclick="import('./js/modules/dashboard.js').then(m => m.updateMoodVisuals(${n})); document.getElementById('mood-range-input').value=${n}; import('./js/modules/health.js').then(m => m.updateHealth('mood', ${n}))">
                    ${n}
                </span>`
    ).join('')}
        </div>
    </div>
  `;
}

export function updateMoodVisuals(val) {
    const value = parseInt(val);
    const bubbleWrapper = document.getElementById('mood-bubble');
    const bubbleImg = document.getElementById('mood-bubble-img');
    const bubbleVal = document.getElementById('mood-bubble-value');

    if (bubbleImg) bubbleImg.src = `img/mood/${value}.jpg`;
    if (bubbleVal) bubbleVal.innerText = `${value}/10`;

    const percent = ((value - 1) / 9) * 100;
    const offset = 14 - (percent * 0.28);

    if (bubbleWrapper) {
        bubbleWrapper.style.left = `calc(${percent}% + ${offset}px)`;
        bubbleWrapper.classList.add('active');
    }

    for (let i = 1; i <= 10; i++) {
        const span = document.getElementById(`mood-num-${i}`);
        if (span) {
            if (i === value) {
                span.classList.add('active');
                if (i <= 3) span.style.textShadow = "0 0 10px rgba(100, 86, 136, 0.8)"; // Lavender
                else if (i === 5) span.style.textShadow = "0 0 15px rgba(194, 140, 174, 1)"; // Glow for Soft Pink 5
                else if (i <= 7) span.style.textShadow = "0 0 10px rgba(248, 213, 196, 0.8)"; // Peach
                else if (i === 10) span.style.textShadow = "0 0 20px rgba(27, 67, 50, 1)"; // Emerald
                else span.style.textShadow = "0 0 10px rgba(82, 183, 136, 0.8)"; // Mint Green shadow
            } else {
                span.classList.remove('active');
                span.style.textShadow = "none";
            }
        }
    }

    triggerHaptic("light");
    
    // Vizuálně potichu updatnout slunečnici bez překreslení celého dashboardu
    const todayKey = getTodayKey();
    if (state.healthData && state.healthData[todayKey]) {
        state.healthData[todayKey].mood = value;
    }
    updateSunflowersDOM();
}

export function hideMoodBubble() {
    const bubbleWrapper = document.getElementById('mood-bubble');
    if (bubbleWrapper) {
        bubbleWrapper.classList.remove('active');
    }
}

export function updateWaterVisuals() {
    const todayKey = getTodayKey();
    const data = state.healthData && state.healthData[todayKey] ? state.healthData[todayKey] : { water: 0 };
    const waterCount = data.water || 0;
    
    const container = document.getElementById('water-container');
    if (container) container.innerHTML = generateWaterIcons(waterCount);
    
    const counter = document.getElementById('water-count');
    if (counter) counter.innerText = `${waterCount}/8`;
    
    updateSunflowersDOM();
}

// Listen for health updates from health.js to keep dashboard in sync
window.addEventListener('health-updated', () => {
    // Only update if we are actually on the dashboard
    if (document.getElementById('sunflower-me-container')) {
        updateWaterVisuals();
        updateMovementVisuals();
        // updateSunflowersDOM is already called inside the visuals updaters
    }
});

export function generateWaterIcons(count) {
    let html = "";
    for (let i = 1; i <= 8; i++) {
        const isFull = i <= count;
        const colorClass = isFull ? "text-[#00e5ff] scale-110 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[#202225] hover:text-[#40444b]";
        const borderStyle = isFull ? "" : "filter: drop-shadow(0 0 1px #555);";
        html += `<button onclick="import('./js/core/utils.js').then(u => u.triggerHaptic('light')); import('./js/modules/health.js').then(m => m.updateHealth('water', ${i}))" class="text-2xl transition-all duration-200 p-1 transform active:scale-95 z-20 relative cursor-pointer ${colorClass}" style="${borderStyle}"><i class="fas fa-tint pointer-events-none"></i></button>`;
    }
    return html;
}

export function updateMovementVisuals() {
    const todayKey = getTodayKey();
    const data = state.healthData && state.healthData[todayKey] ? state.healthData[todayKey] : { movement: [] };
    const container = document.getElementById('movement-container');
    if (container) container.innerHTML = generateMovementChips(data.movement);
    
    updateSunflowersDOM();
}

export function generateMovementChips(movement = []) {
    if (!movement || !Array.isArray(movement)) movement = [];
    
    const activities = [
        { id: 'gym', icon: '💪', label: 'Fitko', color: 'text-red-400', border: 'border-red-500/50', bg: 'bg-red-500/10' },
        { id: 'walk', icon: '🌲', label: 'Procházka', color: 'text-green-400', border: 'border-green-500/50', bg: 'bg-green-500/10' }
    ];

    return activities.map(act => {
        const isActive = movement.includes(act.id);
        const activeClass = isActive
            ? `${act.bg} ${act.color} ${act.border} shadow-[0_0_10px_rgba(0,0,0,0.3)]`
            : "bg-[#36393f] text-gray-500 border-gray-700 hover:border-gray-500";

        return `
          <button onclick="import('./js/modules/health.js').then(m => m.updateHealth('movement', '${act.id}'))" 
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 transform active:scale-95 ${activeClass}">
              <span class="text-lg">${act.icon}</span>
              <span class="text-xs font-bold uppercase">${act.label}</span>
              ${isActive ? '<i class="fas fa-check text-[10px] ml-1"></i>' : ''}
          </button>
      `;
    }).join('');
}

function getSleepColor(hours) {
    if (hours < 5) return { class: "text-[#ed4245]", hex: "#ed4245", label: "Zombie 🧟‍♀️" };
    else if (hours < 7) return { class: "text-[#faa61a]", hex: "#faa61a", label: "Ujde to 😐" };
    else if (hours < 9) return { class: "text-[#3ba55c]", hex: "#3ba55c", label: "Ideál ✨" };
    else return { class: "text-[#eb459e]", hex: "#eb459e", label: "Růženka 👸" };
}

// --- SUNFLOWER SYNC ---

let sunlightChannel = null;

export function initSunlightRealtime() {
    // Redundant - functionality moved to sync.js
    // We just ensure global listeners are attached
    setupDashboardGlobalListeners();
}

let dashboardListenersSet = false;
function setupDashboardGlobalListeners() {
    if (dashboardListenersSet) return;

    window.addEventListener('health-updated', (e) => {
        if (state.currentChannel === 'dashboard') {
            updateSunflowersDOM();
            // If it's from the other user, we might need to refresh health UI specifically
            if (e.detail?.source === 'realtime') {
                updateWaterVisuals();
                updateMovementVisuals();
                const mood = state.healthData[getTodayKey()]?.mood;
                if (mood !== undefined) updateMoodVisuals(mood, true);
            }
        }
    });

    window.addEventListener('sunlight-received', (e) => {
        triggerHaptic('heavy');
        
        // Sunny visual flash
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 bg-[#ffd700] mix-blend-overlay opacity-60 z-[9999] pointer-events-none transition-opacity duration-1000";
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.style.opacity = '0'; }, 300);
        setTimeout(() => { overlay.remove(); }, 1500);
        
        showNotification("Dostal/a jsi sluneční paprsek! ☀️", "success");
    });

    window.addEventListener('planned-dates-updated', () => {
        // If we are on the dashboard, we need to refresh the 'next event' card
        if (state.currentChannel === 'dashboard') {
            // Simple approach: re-render the dashboard to update the 'next event' logic
            renderDashboard();
        }
    });

    dashboardListenersSet = true;
}

export async function sendSunlight() {
    triggerHaptic('light');
    
    // Animate local button
    const btn = document.querySelector('.sun-send-btn');
    if (btn) {
        btn.innerHTML = "✨";
        btn.classList.add('bg-yellow-400/50', 'scale-110');
        setTimeout(() => {
            btn.innerHTML = "☀️";
            btn.classList.remove('bg-yellow-400/50', 'scale-110');
        }, 2000);
    }

    await broadcastSunlight();
}

export function updateSunflowersDOM() {
    const todayKey = getTodayKey();
    const data = state.healthData && state.healthData[todayKey] ? state.healthData[todayKey] : { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    
    syncSunflowerSVG("sunflower-me-container", data, false);
    syncSunflowerSVG("sunflower-partner-container", state.partnerHealthData || null, true);
}

export function syncSunflowerSVG(containerId, data, isPartnerId = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let svg = container.querySelector('svg');
    if (!svg) {
        container.innerHTML = generateSunflowerSVG(data, isPartnerId);
        return; 
    }

    if (!data) data = { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };

    // Update global container classes
    const wrapper = container.querySelector('.sunflower-container');
    if (wrapper) {
        if (data.sleep >= 7) wrapper.classList.add('sf-glow');
        else wrapper.classList.remove('sf-glow');
        
        const isSleeping = data.bedtime && !data.wake_time && state.currentSleepSession?.isSleeping;
        if (isSleeping && !isPartnerId) wrapper.classList.add('sf-sleep');
        else wrapper.classList.remove('sf-sleep');
    }

    // Update Stem Leaves based on Water (0-8)
    const water = data.water || 0;
    const swellBonus = Math.max(0, water - 4) * 0.175; // Up to +0.7 scale
    
    const leafData = [
        {y: 140, s: 1},
        {y: 125, s: -1},
        {y: 110, s: 1},
        {y: 95,  s: -1}
    ];

    for (let i = 0; i < 4; i++) {
        const leaf = svg.querySelector(`.sf-leaf-${i}`);
        if (leaf) {
            const isVisible = water > i;
            // Base scale 0.5 when spawned, swelled up to 1.2
            const scaleMag = isVisible ? (0.5 + swellBonus) : 0;
            leaf.style.transform = `scale(${scaleMag * leafData[i].s}, ${scaleMag})`;
        }
    }

    // Update Mood Petals (27 total, sequential clockwise)
    const mood = data.mood || 1;
    const numPetals = 27;
    const visiblePetals = Math.min(numPetals, Math.max(0, (mood - 1) * 3)); 

    for (let i = 0; i < numPetals; i++) {
        const petal = svg.querySelector(`.sf-petal-wrapper-${i}`);
        if (petal) {
            const isMissing = i >= visiblePetals;
            if (isMissing) petal.classList.add('missing');
            else petal.classList.remove('missing');
        }
    }

    // Update Sleep Center
    const centers = svg.querySelectorAll('.sf-center');
    if (centers.length >= 2) {
        centers[0].setAttribute('fill', data.sleep >= 6 ? '#2b1a0d' : '#1a1005');
        centers[1].setAttribute('fill', data.sleep >= 6 ? '#1f1005' : '#0d0601');
    }
}

export function generateSunflowerSVG(data, isPartner = false) {
    if (!data) data = { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    
    let containerClass = "relative flex flex-col items-center justify-end h-36 w-24 sunflower-container";
    if (data.sleep >= 7) containerClass += " sf-glow";
    
    const isSleeping = data.bedtime && !data.wake_time && state.currentSleepSession?.isSleeping;
    if (isSleeping && !isPartner) containerClass += " sf-sleep";

    const mood = data.mood || 1;
    const numPetals = 27;
    const visiblePetals = Math.min(numPetals, Math.max(0, (mood - 1) * 3)); 
    const defsPrefix = isPartner ? 'p' : 'm';
    
    let petalsHTML = "";
    for (let i = 0; i < numPetals; i++) {
        const isMissing = i >= visiblePetals;
        const petalClass = isMissing ? `sf-petal-wrapper sf-petal-wrapper-${i} missing` : `sf-petal-wrapper sf-petal-wrapper-${i}`;
        
        // Exact symmetrical rotation
        const rotation = i * (360 / 27); 
        const isFront = i % 2 !== 0;
        
        // All petals identically shaped, but vastly wider to overlap
        const length = 46; 
        const width = 14; 
        
        // Very subtle stroke contrast to separate the overlapping layers visually without losing uniformity
        const strokeColor = isFront ? `#eab308` : `#ca8a04`;
        
        petalsHTML += `
            <g transform="rotate(${rotation})">
                <g class="${petalClass}" style="transition-delay: ${Math.random() * 0.15}s">
                    <path d="M 0,-16 Q ${width},-${length/2 + 5} 0,-${length} Q -${width},-${length/2 + 5} 0,-16" 
                          fill="url(#petal-grad-${defsPrefix})" stroke="${strokeColor}" stroke-width="0.5"/>
                </g>
            </g>
        `;
    }

    const water = data.water || 0;
    const swellBonus = Math.max(0, water - 4) * 0.175;
    
    const leafData = [
        {y: 140, s: 1},
        {y: 120, s: -1},
        {y: 100, s: 1},
        {y: 80,  s: -1}
    ];

    let leavesHTML = "";
    for (let i = 0; i < 4; i++) {
        const isVisible = water > i;
        const scaleMag = isVisible ? (0.5 + swellBonus) : 0;
        const l = leafData[i];
        const pathData = 'M 0,0 Q 15,-15 30,-5 Q 15,10 0,0';
            
        leavesHTML += `
            <g style="transform: translate(50px, ${l.y}px)">
                <g class="sf-leaf sf-leaf-${i}" style="transform: scale(${scaleMag * l.s}, ${scaleMag})">
                    <path d="${pathData}" fill="#16a34a" stroke="#14532d" stroke-width="1"/>
                </g>
            </g>
        `;
    }

    const buttonHTML = '';

    return `
        <div class="${containerClass}">
            <svg viewBox="0 0 100 150" width="100" height="150" style="overflow: visible; drop-shadow: 0 5px 5px rgba(0,0,0,0.5);">
                <defs>
                    <linearGradient id="petal-grad-${defsPrefix}" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#f59e0b"/>
                        <stop offset="25%" stop-color="#facc15"/>
                        <stop offset="100%" stop-color="#fef08a"/>
                    </linearGradient>

                </defs>
                
                <g class="sf-stem-group">
                    <path class="sf-stem-main" d="M 50,50 L 50,155" fill="none" stroke="#15803d" stroke-width="8" stroke-linecap="round"/>
                    ${leavesHTML}
                </g>
                
                <g transform="translate(50, 40)">
                    <g class="sf-head-group">
                        <g class="sf-head">
                            <circle cx="0" cy="0" r="18" fill="#1e1005" />
                            ${petalsHTML}
                            <circle cx="0" cy="0" r="18" fill="${data.sleep >= 6 ? '#2b1a0d' : '#1a1005'}" stroke="#1f1005" stroke-width="2" class="sf-center"/>
                            <circle cx="0" cy="0" r="14" fill="${data.sleep >= 6 ? '#1f1005' : '#0d0601'}" class="sf-center"/>
                            <circle cx="-5" cy="-2" r="1.5" fill="#facc15" opacity="0.8"/>
                            <circle cx="5" cy="-2" r="1.5" fill="#facc15" opacity="0.8"/>
                            <path d="M -3,3 Q 0,7 3,3" fill="none" stroke="#facc15" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
                        </g>
                    </g>
                </g>
            </svg>
            ${buttonHTML}
        </div>
    `;
}

export function generateSleepSlider(data) {
    const sleepValue = typeof data.sleep === "number" ? data.sleep : 0;
    const sleepColor = getSleepColor(sleepValue);
    const isTracking = state.currentSleepSession && state.currentSleepSession.isSleeping;
    const disabledClass = isTracking ? "opacity-50 grayscale cursor-not-allowed pointer-events-none" : "";
    const disabledAttr = isTracking ? "disabled" : "";
    const trackGradient = `linear-gradient(to right, #ed4245 0%, #faa61a 45%, #3ba55c 65%, #eb459e 100%)`;

    return `
        <div class="flex flex-col justify-between">
            <div class="relative w-full h-8 rounded-full bg-[#202225] overflow-hidden mb-2 shadow-inner border border-black/40 ${disabledClass}">
                 <div class="absolute inset-0 opacity-10" style="background: ${trackGradient}"></div>
                 <input type="range" min="0" max="10" step="0.5" value="${sleepValue}" 
                    oninput="import('./js/modules/dashboard.js').then(m => m.updateSleep(this.value))" 
                    onchange="import('./js/modules/health.js').then(m => m.updateHealth('sleep', parseFloat(this.value)))"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    ${disabledAttr}>
                 <div class="absolute top-0 left-0 h-full transition-none pointer-events-none" id="sleep-progress-bar" style="width: ${(sleepValue / 10) * 100}%; background-color: ${sleepColor.hex}; box-shadow: 0 0 15px ${sleepColor.hex}80;"></div>
                 <div class="absolute top-0 h-full w-1 bg-white shadow-[0_0_5px_black] pointer-events-none transition-none backdrop-blur-sm z-10" id="sleep-marker" style="left: ${(sleepValue / 10) * 100}%; transform: translateX(-50%);"></div>
            </div>
            <div class="flex justify-between items-end px-1 mt-1">
                 <div class="flex items-baseline gap-1" id="sleep-value-wrapper">
                    <span class="font-black text-4xl ${sleepColor.class} transition-colors duration-200 leading-none drop-shadow-md filter brightness-110" id="sleep-value-text">${sleepValue}</span>
                    <span class="text-sm opacity-80 font-bold text-gray-500 uppercase">hod</span>
                 </div>
                 <div class="flex gap-2 items-center bg-[#202225] p-1.5 rounded-lg border border-[#36393f] shadow-sm">
                    ${generateSleepControls(data)}
                </div>
            </div>
        </div>
    `;
}

function generateSleepControls(data) {
    if (state.currentSleepSession && state.currentSleepSession.isSleeping) {
        const startTime = new Date(state.currentSleepSession.startTime);
        const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
        const isNap = state.currentSleepSession.type === 'nap';
        const labelText = isNap ? "Dobíjení..." : "Spíš od";
        const labelClass = isNap ? "text-[#00e5ff]" : "text-[#faa61a]";
        const icon = isNap ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-sun"></i>';
        return `
            <span id="sleep-session-label" class="text-[10px] ${labelClass} font-bold uppercase ml-1 animate-pulse">${labelText} ${timeStr}</span>
            <button onclick="import('./js/modules/health.js').then(m => m.wakeUp())" class="bg-[#faa61a]/10 hover:bg-[#faa61a] text-[#faa61a] hover:text-black px-3 py-1 rounded border border-[#faa61a] transition flex items-center justify-center gap-2 shadow-sm active:scale-95 h-8 font-bold text-xs">
                 ${icon} Vstávat
            </button>
        `;
    } else {
        return `
            <span class="text-[10px] text-gray-400 font-bold uppercase ml-1">Usínání:</span>
            <input type="time" value="${data.bedtime || ""}" onchange="import('./js/modules/health.js').then(m => m.updateBedtime(this.value))" class="bg-transparent text-white text-sm p-1 rounded focus:bg-[#2f3136] outline-none h-8 w-20 text-center font-mono font-bold">
            <button onclick="import('./js/modules/health.js').then(m => m.startSleep())" class="bg-[#2f3136] hover:bg-[#9b59b6] text-gray-400 hover:text-white w-8 h-8 rounded border border-[#36393f] transition flex items-center justify-center shadow-sm active:scale-95">
                 <i class="fas fa-moon"></i>
            </button>
        `;
    }
}

export function updateSleep(val) {
    triggerHaptic("light");
    const sleepValue = val;
    const sleepColor = getSleepColor(sleepValue);
    const progressBar = document.getElementById('sleep-progress-bar');
    const marker = document.getElementById('sleep-marker');
    const textEl = document.getElementById('sleep-value-text');

    if (progressBar) {
        progressBar.style.width = `${(sleepValue / 10) * 100}%`;
        progressBar.style.backgroundColor = sleepColor.hex;
        progressBar.style.boxShadow = `0 0 15px ${sleepColor.hex}80`;
    }
    if (marker) {
        marker.style.left = `${(sleepValue / 10) * 100}%`;
    }
    if (textEl) {
        textEl.innerText = sleepValue;
        textEl.className = `font-black text-4xl ${sleepColor.class} transition-colors duration-200 leading-none drop-shadow-md filter brightness-110`;
    }

    // Uložit mezistav POUZE do RAM (paměti), aby ho následný klik na vodu nepřeplácl starou hodnotou, než se slider uvolní
    import('../core/state.js').then(s => {
        import('../core/utils.js').then(u => {
            const todayKey = u.getTodayKey();
            if (s.state.healthData && s.state.healthData[todayKey]) {
                s.state.healthData[todayKey].sleep = parseFloat(sleepValue);
            }
        }).catch(err => console.error("Error loading utils dynamically:", err));
    }).catch(err => console.error("Error loading state dynamically:", err));
}


// --- CHAT LOGIC ---

export function handleWelcomeChat(e) {
    if (e.key === "Enter") {
        const text = e.target.value.trim();
        if (!text) return;

        triggerHaptic("light");
        addMessageToChat("Klárka", "klarka_profilovka.webp", text);
        e.target.value = "";
        processCommand(text);
    }
}

export function addMessageToChat(name, avatar, text, isBot = false) {
    const container = document.getElementById("new-messages-area");
    const scroller = document.getElementById("chat-scroller");
    if (!container) return;

    const div = document.createElement("div");
    div.className = "message-group animate-fade-in group hover:bg-black/5 -mx-4 px-4 py-1 mt-1";

    const badge = isBot ? `<span class="text-[10px] bg-[#5865F2] text-white px-1 rounded uppercase font-bold flex-shrink-0 ml-1">BOT</span>` : "";
    const colorClass = isBot ? "text-[#5865F2]" : "text-white";
    const avatarSrc = avatar.startsWith('img/') ? avatar : `img/app/${avatar}`;

    div.innerHTML = `
        <div class="flex gap-4 items-start">
            <img src="${avatarSrc}" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md flex-shrink-0" loading="lazy">
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                    <span class="font-bold text-[var(--text-header)] hover:underline cursor-pointer">${name}</span>
                    ${badge}
                    <span class="text-xs text-[var(--interactive-normal)]">Právě teď</span>
                </div>
                <div class="text-[var(--text-normal)] mt-1 ${colorClass}">
                    <p>${text}</p>
                </div>
            </div>
        </div>
    `;

    container.appendChild(div);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;

    // Achievement Hook: Social Butterfly (10 messages)
    if (!isBot) {
        state.messageCount = (state.messageCount || 0) + 1;
        if (state.messageCount >= 10) {
            import('./achievements.js').then(m => m.autoUnlock('social_butterfly'));
        }
    }
}

function processCommand(text) {
    const lower = text.toLowerCase();
    const indicator = document.getElementById("typing-indicator");

    const botReply = (msg, delay = 1000) => {
        if (indicator) indicator.classList.remove('hidden');
        if (indicator) indicator.style.display = "flex";
        setTimeout(() => {
            if (indicator) indicator.style.display = "none";
            triggerHaptic("medium");
            addMessageToChat("System Bot", "jozka_profilovka.jpg", msg, true);
        }, delay);
    };

    if (lower.startsWith("/miluju") || lower.includes("laska") || lower.includes("láska")) {
        botReply("❤️ Alert: Hladina lásky překročila kritickou mez! Systém se roztéká... ❤️", 1000);
        if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
        else triggerConfetti();
    }
    else if (lower.includes("sova") || lower.includes("sovy") || lower.includes("hou")) {
        const facts = state.factsLibrary.owl;
        if (facts && facts.length > 0) {
            const fact = facts[Math.floor(Math.random() * facts.length)];
            botReply(`🦉 ${fact.text}`, 1000);
        } else botReply("🦉 Hou hou! (Zatím o mně nic nevím)", 1000);
    }
    else if (lower.includes("chobotnice") || lower.includes("octopus")) {
        const facts = state.factsLibrary.octopus;
        if (facts && facts.length > 0) {
            const fact = facts[Math.floor(Math.random() * facts.length)];
            botReply(`\🐙 ${fact.text}`, 1000);
        } else botReply("🐙 Bubly bubly... (Supabase se ještě nenaplnil)", 1000);
    }
    else if (lower.includes("mýval") || lower.includes("myval") || lower.includes("raccoon")) {
        const facts = state.factsLibrary.raccoon;
        if (facts && facts.length > 0) {
            const fact = facts[Math.floor(Math.random() * facts.length)];
            botReply(`🦝 ${fact.text}`, 1000);
        } else botReply("🦝 *Krade popelnici* (A o mně nic nevíš?)", 1000);
    }
    else if (lower.includes("tetris")) {
        botReply("🧩 Padá to tam! Jsi připravena na další 1v1? (Jsem ve formě!)", 1000);
    }
    else if (lower.includes("clash") || lower.includes("royale")) {
        botReply("⚔️ Ten deck si fakt už změň... ale stejně si dáme 1v1? 👑", 1000);
    }
    else if (lower.includes("geo") || lower.includes("guessr") || lower.includes("mapa")) {
        botReply("🌍 To je na 100% Brazílie. Nebo Rusko. Nebo to křoví za barákem. Jsem ztracen bez tvé navigace!", 1500);
    }
    else if (lower.includes("podolí") || lower.includes("podoli")) {
        botReply("📍 Error 404: Location 'Podolí' not found. Did you mean: 'Kunovice - Předměstí'?", 1000);
    }
    else if (lower.includes("casio") || lower.includes("kalkulačka")) {
        botReply("🧮 Nejlepší investice života! Plyšová kalkulačka > Bitcoin.", 1000);
    }
    else if (lower.includes("nero") || lower.includes("požár") || lower.includes("oheň")) {
        botReply("🔥 Já vím, já vím... Nero v Římě nebyl a na lyru nehrál. Díky za fact-check, paní učitelko! 🤓", 1200);
    }
    else if (lower.includes("hlad") || lower.includes("jídlo") || lower.includes("jidlo")) {
        botReply("🍔 Co takhle Kafec u Komína? Nebo pizzu v Mařaticích? Mrkni do Plánovače!", 1000);
        setTimeout(() => { if (window.switchChannel) window.switchChannel("dateplanner") }, 2500);
    }
    else if (lower.includes("popcorn") || lower.includes("zuby")) {
        botReply("🍿 Popcorn je nástroj ďábla na ničení zubů! Gumídci jsou superior snack. 🐻", 1000);
    }
    else if (lower.includes("heslo") || lower.includes("password")) {
        botReply("🔐 Tajné heslo je: 'Podolí neexistuje'. (Ale pššt!)", 1000);
    }
    else if (lower.startsWith("/help") || lower.includes("pomoc") || lower.includes("příkazy")) {
        botReply("🤖 **Dostupné příkazy:**\n`/miluju` - Vyznání lásky\n`/sova` - Moudrost\n`/chobotnice` - Biology fact\n`podolí` - Reality check\n`tetris` - Výzva\n`nero` - Historické okénko\n`hlad` - Pomoc s výběrem", 500);
    }
    else if (lower.startsWith("/")) {
        botReply("❌ Neznámý příkaz. Zkus napsat `/help` pro seznam tajných kódů.", 800);
    }
}

export function showNextFact() {
    const display = document.getElementById("fact-display");
    if (!display) return;
    display.style.opacity = "0";
    display.style.transform = "translateY(5px)";

    setTimeout(() => {
        const animalFacts = [...state.factsLibrary.owl, ...state.factsLibrary.octopus, ...state.factsLibrary.raccoon];
        if (animalFacts.length === 0) return;
        const randomFact = animalFacts[Math.floor(Math.random() * animalFacts.length)];

        display.innerHTML = `
            <div class="text-center">
                <div class="text-3xl mb-2">${randomFact.icon}</div>
                <span>${randomFact.text}</span>
            </div>
        `;
        display.style.opacity = "1";
        display.style.transform = "translateY(0)";
    }, 300);
}

export function refreshDashboardFact() {
    const allFacts = [...state.factsLibrary.owl, ...state.factsLibrary.octopus, ...state.factsLibrary.raccoon];
    if (allFacts.length === 0) return;
    const randomFact = allFacts[Math.floor(Math.random() * allFacts.length)];
    const el = document.getElementById("dashboard-fact-text");
    if (el) {
        el.style.opacity = "0";
        setTimeout(() => {
            el.innerHTML = `${randomFact.icon} ${randomFact.text}`;
            el.style.opacity = "1";
        }, 200);
    }
}


// --- MAIN DASHBOARD RENDERER ---

export async function renderDashboard(forceRefresh = false) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Show skeleton/loader if we don't have data yet or if force refreshing
    const todayKey = getTodayKey();
    const hasData = state.healthData && state.healthData[todayKey];

    if (!state.healthData) state.healthData = {};
    if (!state.healthData[todayKey]) {
        state.healthData[todayKey] = { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    }
    if (!state.tetris) state.tetris = { jose: 0, klarka: 0 };

    // Tichá synchronizace na pozadí (neblokuje okamžité vykreslení dashboardu)
    if (navigator.onLine && (!state.dashboardFetched || forceRefresh)) {
        setTimeout(async () => {
            try {
                // Tichá inicializace Realtime posluchače
                initSunlightRealtime();

                const today = new Date().toISOString().split('T')[0];
                
                // Fetch partner's data as well for the sunflower!
                const partnerHealthPromise = supabase.from('health_data')
                    .select('*')
                    .eq('date_key', todayKey)
                    .neq('user_id', state.currentUser.id)
                    .single();

                state.dashboardFetched = true;
                const { data, error } = await supabase.rpc('get_dashboard_data', {
                    p_user_id: state.currentUser.id,
                    p_date: today
                });

                if (!error && data) {
                    state.healthData[todayKey] = data.health || state.healthData[todayKey];
                    if (data.pinned_drawing) state.pinnedDrawing = data.pinned_drawing;
                    if (data.tetris) {
                        state.tetris.jose = data.tetris.jose || 0;
                        state.tetris.klarka = data.tetris.klarka || 0;
                    }
                    if (data.next_event) {
                        if (!state.plannedDates) state.plannedDates = {};
                        state.plannedDates[data.next_event.date_key] = data.next_event;
                    }
                    
                    // Await partner data
                    const { data: pData } = await partnerHealthPromise;
                    if (pData) state.partnerHealthData = pData;

                    // Tichý re-render na pozadí, abychom zapsali nová data (jen pokud jsme na obrazovce)
                    if (state.currentChannel === 'dashboard' && document.getElementById("messages-container")) {
                        renderDashboard(); 
                    }
                }
            } catch (err) {
                console.warn("Tichá synchronizace dashboardu na pozadí selhala (Lze ignorovat, použijí se lokální data):", err);
                state.dashboardFetched = true; // Still mark as fetched to allow sync re-renders
            }
        }, 50);
    }

    const data = getTodayData();
    const dateOptions = { weekday: "long", day: "numeric", month: "long" };
    const niceDate = new Date().toLocaleDateString("cs-CZ", dateOptions);
    const hour = new Date().getHours();
    let greeting = "Dobré ráno";
    if (hour >= 11) greeting = "Ahoj";
    if (hour >= 18) greeting = "Krásný večer";
    const daysTogether = getDaysTogether();


    const todayStr = new Date().toISOString().split("T")[0];
    if (!state.plannedDates) state.plannedDates = {};
    const upcomingDates = Object.entries(state.plannedDates)
        .filter(([date, plan]) => date >= todayStr)
        .sort((a, b) => a[0].localeCompare(b[0]));
    const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

    container.innerHTML = `
          <div class="flex-1 overflow-y-auto no-scrollbar bg-[#36393f] relative w-full h-full pb-20">
              <div class="relative bg-gradient-to-br from-[#5865F2] to-[#eb459e] shadow-lg overflow-hidden flex-shrink-0 pt-3 pb-0 rounded-b-3xl">
                  <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                  <div class="relative z-10 px-6 mb-0 flex justify-between items-end min-h-[140px]">
                      <div id="dashboard-welcome-text" class="pb-2">
                           <p class="text-[10px] font-bold uppercase tracking-wider opacity-80 text-white/90 mb-0.5">${niceDate}</p>
                           <h1 class="text-2xl font-black text-white drop-shadow-md leading-tight">${greeting},<br>${getInflectedName(state.currentUser.name, 5)} 🌞</h1>
                          <div class="flex items-center gap-2 mt-3">
                              <div class="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-center shadow-sm border border-white/10 inline-block min-w-[60px]">
                                  <span class="block text-[8px] uppercase font-bold tracking-widest opacity-90 text-white leading-none mb-0.5">Spolu</span>
                                  <span class="block text-sm font-black text-white leading-none">${daysTogether} dní</span>
                              </div>
                              <button onclick="import('./js/modules/dashboard.js').then(m => m.sendSunlight())" 
                                      class="sun-send-btn w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center text-xl shadow-lg transition-all duration-300 hover:scale-110 active:scale-90 hover:bg-yellow-400/30 group"
                                      title="Poslat slunce">
                                  <span class="group-hover:drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]">☀️</span>
                              </button>
                          </div>
                      </div>
                      
                      <div class="flex gap-2 items-end pb-0">
                          <div id="sunflower-me-container" class="flex flex-col items-center w-24 mb-[-4px] transform translate-y-[2px] relative group">
                              ${generateSunflowerSVG(data, false)}
                              <span class="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow-md z-30 pointer-events-none group-hover:text-white transition-colors">${state.currentUser.name}</span>
                          </div>
                          <div id="sunflower-partner-container" class="flex flex-col items-center w-24 mb-[-4px] transform translate-y-[2px] relative group">
                              ${generateSunflowerSVG(state.partnerHealthData || null, true)}
                              <span class="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow-md z-30 pointer-events-none group-hover:text-white transition-colors">${state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka'}</span>
                          </div>
                      </div>
                  </div>
                  <div class="bg-black/20 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-black/30 transition min-h-[56px]"
                       onclick="${nextDate
            ? `import('./js/modules/calendar.js').then(m => m.showDayDetail('${nextDate[0]}'))`
            : `window.switchChannel('dateplanner')`}">
                      ${nextDate
            ? `<div class="flex items-center gap-3 overflow-hidden">
                                <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm flex-shrink-0">📅</div>
                                 <div class="min-w-0">
                                    <div class="text-[9px] font-bold text-white/70 uppercase tracking-wide flex items-center gap-1">Nejbližší akce <span class="w-1 h-1 bg-[#3ba55c] rounded-full animate-pulse"></span></div>
                                    <div class="font-bold text-white text-sm truncate">${nextDate[1].name}</div>
                                 </div>
                              </div>
                              <div class="flex items-center gap-4">
                                  <div class="text-white/80 text-xs font-black tracking-widest whitespace-nowrap px-3 py-1 bg-white/10 rounded-full border border-white/5 hidden sm:block">${new Date(nextDate[0]).getDate()}.${new Date(nextDate[0]).getMonth() + 1}.</div>
                                  <i class="fas fa-chevron-right text-white/30 text-[10px]"></i>
                              </div>`
             : `<div class="flex items-center gap-3 w-full justify-between">
                                 <div class="flex items-center gap-3">
                                     <div class="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-sm">❓</div>
                                     <div class="text-white/90 text-sm font-medium">Zatím nic v plánu... <span class="font-bold underline decoration-[#faa61a]">Naplánovat?</span></div>
                                 </div>
                                 <i class="fas fa-chevron-right text-white/30 text-[10px]"></i>
                              </div>`
        }
                  </div>
              </div>

              <div class="max-w-3xl mx-auto px-3 mt-4 relative z-20 space-y-3">
                  <div class="space-y-3">
                      <!-- PINNED DRAWING (FRIDGE) -->
                      ${state.pinnedDrawing ? `
                        <div onclick="window.switchChannel('game-draw')" class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 overflow-hidden group cursor-pointer transition hover:border-[#eb459e]/30">
                            <div class="p-4 border-b border-white/5 flex justify-between items-center bg-black/10">
                                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <i class="fas fa-snowflake text-[#00e5ff]"></i> Z Lednice
                                </h3>
                                <span class="text-[9px] bg-[#eb459e]/20 text-[#eb459e] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Mistrovské dílo</span>
                            </div>
                            <div class="relative aspect-video bg-white overflow-hidden">
                                <img src="${state.pinnedDrawing.thumbnail}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                <div class="absolute bottom-4 left-4">
                                    <p class="text-white text-base font-black drop-shadow-md">${state.pinnedDrawing.title || 'Bez názvu'}</p>
                                    <p class="text-white/70 text-[10px] font-bold uppercase">${new Date(state.pinnedDrawing.created_at).toLocaleDateString('cs-CZ')}</p>
                                </div>
                            </div>
                        </div>
                      ` : ''}

                      <!-- SLEEP -->
                      <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6">
                          <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 leading-none">
                            <i class="fas fa-bed text-[#faa61a]"></i> Jak ses vyspala?
                          </h3>
                          <div class="h-full" id="sleep-container">${generateSleepSlider(data)}</div>
                      </div>
                      <!-- WATER -->
                      <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6">
                          <div class="flex justify-between items-center mb-4">
                              <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 leading-none">
                                <i class="fas fa-tint text-[#00e5ff]"></i> Voda
                              </h3>
                              <span class="text-[10px] text-[#00e5ff] font-black bg-[#00e5ff]/10 px-2 py-0.5 rounded-full" id="water-count">${data.water}/8</span>
                          </div>
                          <div class="flex justify-between gap-1" id="water-container">${generateWaterIcons(data.water)}</div>
                      </div>
                      <!-- MOOD & MOVEMENT -->
                      <div class="flex flex-col gap-3">
                          <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6 min-h-[140px] flex flex-col justify-between">
                              <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 leading-none">Jak se cítíš?</h3>
                              <div class="flex justify-between px-1" id="mood-container">${generateMoodSlider(data.mood)}</div>
                          </div>
                          <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6">
                              <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 leading-none">
                                <i class="fas fa-running text-[#3ba55c]"></i> Dnešní pohyb
                              </h3>
                              <div class="flex flex-wrap gap-3" id="movement-container">${generateMovementChips(data.movement)}</div>
                          </div>
                      </div>
                  </div>


                  <!-- TETRIS WIDGET -->
                  ${(() => {
            const tScore = getTetrisScore();
            const tLeader = tScore.jose > tScore.klarka ? 'jose' : (tScore.jose < tScore.klarka ? 'klarka' : 'draw');
            return `
                      <div onclick="window.switchChannel('tetris')" class="bg-[#2f3136] rounded-xl p-3 border border-gray-700 cursor-pointer hover:border-[#faa61a] transition group relative overflow-hidden mt-4 shadow-md">
                        <div class="absolute right-[-10px] top-[-10px] opacity-10 text-6xl text-[#faa61a] rotate-12 group-hover:rotate-45 transition duration-500"><i class="fas fa-shapes"></i></div>
                        <div class="flex justify-between items-center relative z-10">
                          <div class="flex items-center gap-3 ${tLeader === 'jose' ? 'text-green-400 font-bold' : 'text-gray-400'}">
                            <div class="relative"><img src="img/app/jozka_profilovka.jpg" class="w-10 h-10 rounded-full border-2 border-gray-600 object-cover" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Jose'">${tLeader === 'jose' ? '<span class="absolute -top-2 -right-1 text-xs animate-bounce">👑</span>' : ''}</div>
                            <span class="font-mono text-xl tracking-tight">${tScore.jose}</span>
                          </div>
                          <div class="flex flex-col items-center">
                              <div class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Tetris War</div>
                              <div class="text-[9px] bg-[#202225] text-gray-500 px-1 rounded">SEASON 1</div>
                          </div>
                          <div class="flex items-center gap-3 flex-row-reverse ${tLeader === 'klarka' ? 'text-[#eb459e] font-bold' : 'text-gray-400'}">
                            <div class="relative"><img src="img/app/klarka_profilovka.webp" class="w-10 h-10 rounded-full border-2 border-gray-600 object-cover" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Klarka'">${tLeader === 'klarka' ? '<span class="absolute -top-2 -left-1 text-xs animate-bounce">👑</span>' : ''}</div>
                            <span class="font-mono text-xl tracking-tight">${tScore.klarka}</span>
                          </div>
                        </div>
                      </div>`;
        })()}
              </div>
          </div>`;

    if (state.currentSleepSession && state.currentSleepSession.isSleeping) {
        if (typeof window.startSleepTimer === 'function') window.startSleepTimer();
        else import('./health.js').then(m => m.startSleepTimer());
    }
}


export function renderWelcome() {
    const container = document.getElementById("messages-container");
    if (!container) return;
    container.className = "flex-1 flex flex-col bg-[#36393f] relative overflow-hidden";

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Dobré ráno" : (hour < 18 ? "Hezké odpoledne" : "Krásný večer");

    container.innerHTML = `
    <div class="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar space-y-8" id="chat-scroller">
        <!-- HEADER MESSAGE -->
        <div class="message-group animate-fade-in group hover:bg-black/5 -mx-4 px-4 py-2">
            <div class="flex gap-4 items-start">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#5865F2] to-[#eb459e] flex items-center justify-center text-white text-sm font-bold mt-1 shadow-lg ring-2 ring-white/10 flex-shrink-0">
                    <i class="fas fa-sparkles"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-baseline gap-2">
                        <span class="font-bold text-white text-lg">Systém Kiscord</span>
                        <span class="text-[10px] bg-[#5865F2] text-white px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">VERS. 3.0</span>
                        <span class="text-xs text-gray-500 font-medium">Právě teď</span>
                    </div>
                    <div class="text-gray-200 mt-2 space-y-3">
                        <p class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 leading-tight">
                            ${greeting}, ${getInflectedName(state.currentUser.name, 5)}! 👋<br>Vítej v nové éře naší aplikace.
                        </p>
                        <p class="text-sm text-gray-400 max-w-xl leading-relaxed">
                            Kiscord prošel kompletní transformací. Od základů jsme přepsali backend, přidali tunu nových her a vylepšili místo, kde uchováváme naše vzpomínky.
                        </p>
                    </div>

                    <!-- ARCHITECTURE CARD -->
                    <div class="mt-6 bg-[#202225]/50 border border-white/5 rounded-2xl p-5 shadow-inner backdrop-blur-sm group/card hover:bg-[#202225]/80 transition-all duration-300">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-8 h-8 rounded-lg bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
                                <i class="fas fa-database text-sm"></i>
                            </div>
                            <div>
                                <h3 class="text-white font-bold text-sm tracking-wide">Realtime Revolution ⚡</h3>
                                <p class="text-[10px] text-gray-500 uppercase font-black tracking-widest">Powered by Supabase</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div class="text-[#3ba55c] text-xs font-bold mb-1 flex items-center gap-1.5"><i class="fas fa-lock"></i> Soukromá data</div>
                                <p class="text-[11px] text-gray-400">Tvé zdraví (spánek, voda, nálada) je plně v tvých rukách a nikdo jiný ho nevidí.</p>
                            </div>
                            <div class="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div class="text-[#eb459e] text-xs font-bold mb-1 flex items-center gap-1.5"><i class="fas fa-users"></i> Společný prostor</div>
                                <p class="text-[11px] text-gray-400">Timeline, Hry a Questy se synchronizují okamžitě mezi oběma telefony.</p>
                            </div>
                        </div>
                    </div>

                    <!-- TIMELINE TEASER -->
                    <div class="mt-4 bg-[#2f3136] border border-[#eb459e]/20 rounded-2xl p-5 shadow-lg relative overflow-hidden group/timeline cursor-pointer hover:border-[#eb459e]/50 transition-all" onclick="window.switchChannel('timeline')">
                        <div class="absolute top-0 right-0 p-4 opacity-5 text-6xl rotate-12 group-hover/timeline:rotate-0 transition-transform duration-700 font-serif">📸</div>
                        <h3 class="text-[#eb459e] font-black text-lg mb-2 flex items-center gap-2">
                             Naše Společná Cesta 🎞️
                        </h3>
                        <p class="text-gray-300 text-sm mb-4 leading-relaxed pr-8">
                            Timeline byla kompletně upravena. Nyní můžeš přidávat neomezeně fotek, tvořit galerie, zaznamenávat si poznámky k momentům a označovat ty nejdůležitější jako <span class="text-[#faa61a] font-bold">Milníky</span> s výbuchem konfet!
                        </p>
                        <div class="flex gap-2">
                            <span class="px-2 py-0.5 bg-[#eb459e]/10 text-[#eb459e] text-[9px] font-bold rounded uppercase">Polaroid Style</span>
                            <span class="px-2 py-0.5 bg-[#5865F2]/10 text-[#5865F2] text-[9px] font-bold rounded uppercase">Auto-Sync</span>
                            <span class="px-2 py-0.5 bg-[#faa61a]/10 text-[#faa61a] text-[9px] font-bold rounded uppercase">Galerie</span>
                        </div>
                    </div>

                    <!-- FEATURE GRID -->
                    <div class="mt-8">
                        <h4 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">Nové Moduly a Možnosti</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div onclick="window.switchChannel('games-hub')" class="bg-[#2f3136] p-4 rounded-xl border border-transparent hover:border-[#5865F2] hover:bg-[#32353b] transition group/feat cursor-pointer text-center flex flex-col items-center">
                                <div class="text-2xl mb-2 group-hover/feat:scale-110 transition">🎮</div>
                                <div class="text-[11px] font-bold text-gray-200">Herní Doupě</div>
                            </div>
                            <div onclick="window.switchChannel('daily-questions')" class="bg-[#2f3136] p-4 rounded-xl border border-transparent hover:border-[#faa61a] hover:bg-[#32353b] transition group/feat cursor-pointer text-center flex flex-col items-center">
                                <div class="text-2xl mb-2 group-hover/feat:scale-110 transition">💭</div>
                                <div class="text-[11px] font-bold text-gray-200">Denní Otázky</div>
                            </div>
                            <div onclick="window.switchChannel('quests')" class="bg-[#2f3136] p-4 rounded-xl border border-transparent hover:border-[#3ba55c] hover:bg-[#32353b] transition group/feat cursor-pointer text-center flex flex-col items-center">
                                <div class="text-2xl mb-2 group-hover/feat:scale-110 transition">⚔️</div>
                                <div class="text-[11px] font-bold text-gray-200">Společné Questy</div>
                            </div>
                            <div onclick="window.switchChannel('achievements')" class="bg-[#2f3136] p-4 rounded-xl border border-transparent hover:border-[#faa61a] hover:bg-[#32353b] transition group/feat cursor-pointer text-center flex flex-col items-center">
                                <div class="text-2xl mb-2 group-hover/feat:scale-110 transition">🏆</div>
                                <div class="text-[11px] font-bold text-gray-200">Achievementy</div>
                            </div>
                            <div onclick="window.switchChannel('bucketlist')" class="bg-[#2f3136] p-4 rounded-xl border border-transparent hover:border-[#eb459e] hover:bg-[#32353b] transition group/feat cursor-pointer text-center flex flex-col items-center">
                                <div class="text-2xl mb-2 group-hover/feat:scale-110 transition">🪣</div>
                                <div class="text-[11px] font-bold text-gray-200">Bucket List</div>
                            </div>
                            <div onclick="window.switchChannel('letters')" class="bg-[#2f3136] p-4 rounded-xl border border-transparent hover:border-[#eb459e] hover:bg-[#32353b] transition group/feat cursor-pointer text-center flex flex-col items-center">
                                <div class="text-2xl mb-2 group-hover/feat:scale-110 transition">💌</div>
                                <div class="text-[11px] font-bold text-gray-200">Dopisy Času</div>
                            </div>
                            <div onclick="window.switchChannel('calendar')" class="bg-[#2f3136] p-4 rounded-xl border border-transparent hover:border-[#5865F2] hover:bg-[#32353b] transition group/feat cursor-pointer text-center flex flex-col items-center">
                                <div class="text-2xl mb-2 group-hover/feat:scale-110 transition">📅</div>
                                <div class="text-[11px] font-bold text-gray-200">Kalendář 2.0</div>
                            </div>
                            <div class="bg-[#2f3136] p-4 rounded-xl border border-white/5 opacity-50 text-center flex flex-col items-center">
                                <div class="text-2xl mb-2">💎</div>
                                <div class="text-[11px] font-bold text-gray-500">Coming Soon</div>
                            </div>
                        </div>
                    </div>

                    <!-- FOOTER BUTTONS -->
                    <div class="mt-8 flex flex-wrap gap-3">
                        <button onclick="window.switchChannel('dashboard')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-2.5 rounded-xl font-black text-sm transition transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2">
                             Jít na Dashboard <i class="fas fa-arrow-right"></i>
                        </button>
                        <button onclick="document.getElementById('welcome-chat-input').focus()" class="bg-white/5 hover:bg-white/10 text-gray-300 px-6 py-2.5 rounded-xl font-bold text-sm transition border border-white/5">
                             Zeptat se na něco
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div id="new-messages-area"></div>
        <div class="h-4"></div>
    </div>
    
    <div class="px-4 pb-6 pt-2 bg-[#36393f] flex-shrink-0 z-10">
        <div class="bg-[#40444b] rounded-lg flex items-center p-2.5 px-4 shadow-sm relative focus-within:ring-2 ring-[#5865F2]/50 transition-all">
            <div class="flex items-center gap-3 mr-4 text-[#b9bbbe]">
                <button class="hover:text-gray-200 transition bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px]"><i class="fas fa-plus"></i></button>
            </div>
            <input type="text" id="welcome-chat-input" 
                   onkeypress="import('./js/modules/dashboard.js').then(m => m.handleWelcomeChat(event))"
                   autocomplete="off" placeholder="Napiš zprávu nebo zkus /help" 
                   class="bg-transparent text-gray-200 placeholder-[#72767d] w-full outline-none font-light text-sm">
            <div class="flex items-center gap-3 ml-4 text-[#b9bbbe]">
                <i class="fas fa-gift hover:text-gray-200 transition cursor-pointer"></i>
                <i class="fas fa-file-image hover:text-gray-200 transition cursor-pointer"></i>
                <i class="fas fa-smile hover:text-gray-200 transition cursor-pointer"></i>
            </div>
        </div>
    </div>
    `;

    setTimeout(() => {
        const scroller = document.getElementById("chat-scroller");
        if (scroller) scroller.scrollTop = 0;
    }, 100);
}
