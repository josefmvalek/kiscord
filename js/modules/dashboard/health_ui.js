import { state } from '../../core/state.js';
import { triggerHaptic, getTodayKey } from '../../core/utils.js';
import { getAssetUrl } from '../../core/assets.js';
import { updateSunflowersDOM } from './sunflowers.js';
import { getPillsStreak } from '../health.js';

// --- VISUAL GENERATORS (Mood/Water/Movement/Sleep) ---

const moodColors = [
    '#10002B', // 1
    '#240046', // 2
    '#3C096C', // 3
    '#5A189A', // 4
    '#7B2CBF', // 5
    '#9D4EDD', // 6
    '#C77DFF', // 7
    '#E0AAFF', // 8
    '#F2D5FF', // 9
    '#FFFFFF'  // 10
];


export function generateMoodSlider(currentMood) {
    let value = typeof currentMood === 'number' ? currentMood : 5;
    const bubbleImage = getAssetUrl('mood', value);

    return `
    <div class="mood-slider-container" id="mood-slider-wrapper" 
        onmousedown="this.classList.add('dragging')"
        onmouseup="this.classList.remove('dragging'); window.loadModule('dashboard').then(m => m.hideMoodBubble())"
        ontouchstart="this.classList.add('dragging')"
        ontouchend="this.classList.remove('dragging'); window.loadModule('dashboard').then(m => m.hideMoodBubble())"
        onpointerup="this.classList.remove('dragging'); window.loadModule('dashboard').then(m => m.hideMoodBubble())">
        <div class="mood-bubble-wrapper" id="mood-bubble">
            <div class="mood-bubble">
                <img src="${bubbleImage}" id="mood-bubble-img" alt="Mood" onerror="this.src='${getAssetUrl('app_kytka')}'">
            </div>
            <div class="mood-rating-value" id="mood-bubble-value">${value}/10</div>
        </div>
        <input type="range" min="1" max="10" step="1" value="${value}"
            oninput="window.loadModule('dashboard').then(m => m.updateMoodVisuals(this.value, true))"
            onchange="window.loadModule('health').then(m => m.updateHealth('mood', parseInt(this.value)))"
            onmouseup="document.getElementById('mood-slider-wrapper')?.classList.remove('dragging'); window.loadModule('dashboard').then(m => m.hideMoodBubble())"
            ontouchend="document.getElementById('mood-slider-wrapper')?.classList.remove('dragging'); window.loadModule('dashboard').then(m => m.hideMoodBubble())"
            onpointerup="document.getElementById('mood-slider-wrapper')?.classList.remove('dragging'); window.loadModule('dashboard').then(m => m.hideMoodBubble())"
            class="mood-range"
            id="mood-range-input"
            style="background: linear-gradient(to right, ${moodColors[value - 1]} ${((value - 1) / 9) * 100}%, #202225 ${((value - 1) / 9) * 100}%)">
        <div class="flex justify-between w-full px-1 mt-2">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n =>
        `<span class="text-[10px] font-bold text-gray-500 mood-number ${n === value ? 'active' : ''}" 
                       id="mood-num-${n}" 
                       onclick="window.loadModule('dashboard').then(m => m.updateMoodVisuals(${n})); document.getElementById('mood-range-input').value=${n}; window.loadModule('health').then(m => m.updateHealth('mood', ${n}))">
                    ${n}
                </span>`
    ).join('')}
        </div>
    </div>
  `;
}

export function updateMoodVisuals(val, activateBubble = false) {
    const value = parseInt(val);
    const bubbleWrapper = document.getElementById('mood-bubble');
    const bubbleImg = document.getElementById('mood-bubble-img');
    const bubbleVal = document.getElementById('mood-bubble-value');

    if (bubbleImg) bubbleImg.src = getAssetUrl('mood', value);
    if (bubbleVal) bubbleVal.innerText = `${value}/10`;

    const percent = ((value - 1) / 9) * 100;
    const offset = 14 - (percent * 0.28);

    if (bubbleWrapper) {
        bubbleWrapper.style.left = `calc(${percent}% + ${offset}px)`;
        if (activateBubble) {
            bubbleWrapper.classList.add('active');
        } else {
            bubbleWrapper.classList.remove('active');
        }
    }

    const input = document.getElementById('mood-range-input');
    if (input) {
        // Fixní barva pro každý stupeň (z palety Vivid Nightfall)
        const currentColor = moodColors[value - 1];
        input.style.background = `linear-gradient(to right, ${currentColor} ${percent}%, #202225 ${percent}%)`;
    }

    for (let i = 1; i <= 10; i++) {
        const span = document.getElementById(`mood-num-${i}`);
        if (span) {
            if (i === value) {
                span.classList.add('active');
                const color = moodColors[i - 1];
                span.style.textShadow = `0 0 ${i === 10 ? '20px' : '10px'} ${color}80`; // Adjust shadow intensity for 10
            } else {
                span.classList.remove('active');
                span.style.textShadow = "none";
            }
        }
    }

    triggerHaptic("light");
    
    // Update container glow
    const moodContainer = document.getElementById('mood-container');
    if (moodContainer) {
        const color = moodColors[value - 1];
        // Only update the closest glass-card parent to avoid inner borders/shadows
        const cardNode = moodContainer.closest('.glass-card');
        if (cardNode) {
            cardNode.style.boxShadow = `0 10px 50px -10px ${color}30, 0 0 30px ${color}10`;
            cardNode.style.borderColor = `${color}40`;
        }
    }

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

export function generateWaterIcons(count) {
    let html = "";
    for (let i = 1; i <= 8; i++) {
        const isFull = i <= count;
        // Použití CSS třídy .water-glow pro prémiový neonový efekt
        const colorClass = isFull ? "text-[#00e5ff] scale-110 water-glow" : "text-[#202225] opacity-40 hover:opacity-100 hover:text-[#40444b]";
        const borderStyle = isFull ? "" : "filter: drop-shadow(0 0 1px #555);";
        html += `<button onclick="window.loadModule('utils').then(u => u.triggerHaptic('light')); window.loadModule('health').then(m => m.updateHealth('water', ${i}))" 
                        class="text-2xl transition-all duration-300 p-1 transform active:scale-90 z-20 relative cursor-pointer outline-none ${colorClass}" 
                        style="${borderStyle}">
                    <i class="fas fa-tint pointer-events-none"></i>
                 </button>`;
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
        { id: 'gym', icon: '💪', label: 'Fitko', color: 'text-fuchsia-400', border: 'border-fuchsia-500/50', bg: 'bg-fuchsia-500/10' },
        { id: 'walk', icon: '🌲', label: 'Procházka', color: 'text-green-400', border: 'border-green-500/50', bg: 'bg-green-500/10' }
    ];

    return activities.map(act => {
        const isActive = movement.includes(act.id);
        const activeClass = isActive
            ? `${act.bg} ${act.color} ${act.border} shadow-[0_0_10px_rgba(0,0,0,0.3)]`
            : "bg-[#36393f] text-gray-500 border-gray-700 hover:border-gray-500";

        return `
          <button onclick="window.loadModule('health').then(m => m.updateHealth('movement', '${act.id}'))" 
                  class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 transform active:scale-95 w-full ${activeClass}">
              <span class="text-lg">${act.icon}</span>
              <span class="text-xs font-bold uppercase">${act.label}</span>
              ${isActive ? '<i class="fas fa-check text-[10px] ml-1"></i>' : ''}
          </button>
      `;
    }).join('');
}

export function updateSupplementsVisuals() {
    const todayKey = getTodayKey();
    const data = state.healthData && state.healthData[todayKey] ? state.healthData[todayKey] : { supplements: { iron: false, zinc: false, magnesium: false } };
    const container = document.getElementById('supplements-container');
    if (container) container.innerHTML = generateSupplementsChips(data.supplements);
    
    updateSunflowersDOM();
}

export function generateSupplementsChips(supplements = { iron: false, zinc: false, magnesium: false }) {
    if (!supplements) supplements = { iron: false, zinc: false, magnesium: false };
    
    const activities = [
        { id: 'iron', icon: '🩸', label: 'Železo', activeClass: 'text-red-400 bg-red-500/10 border-red-500/50 shadow-[0_0_10px_rgba(237,66,69,0.3)]' },
        { id: 'zinc', icon: '✨', label: 'Zinek', activeClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_10px_rgba(250,166,26,0.3)]' },
        { id: 'magnesium', icon: '🌙', label: 'Hořčík', activeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/50 shadow-[0_0_10px_rgba(155,89,182,0.3)]' }
    ];

    return activities.map(act => {
        const isActive = supplements[act.id];
        const currentClass = isActive
            ? act.activeClass
            : "bg-[#36393f] text-gray-500 border-gray-700 hover:border-gray-500";

        return `
          <button onclick="window.loadModule('health').then(m => m.updateHealth('supplements', '${act.id}'))" 
                  class="flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-300 transform active:scale-95 ${currentClass}">
              <span class="text-xl leading-none filter drop-shadow-md pb-1">${act.icon}</span>
              <span class="text-[10px] font-black uppercase tracking-widest">${act.label}</span>
              <span class="text-[9px] uppercase font-bold ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity">Vzato <i class="fas fa-check text-[8px] ml-0.5"></i></span>
          </button>
      `;
    }).join('');
}

export function updatePillsVisuals() {
    const todayKey = getTodayKey();
    const data = state.healthData && state.healthData[todayKey] ? state.healthData[todayKey] : { pills: false };
    const container = document.getElementById('pills-container');
    if (container) container.innerHTML = generatePillsChip(data.pills, getPillsStreak());
    
    updateSunflowersDOM();
}

export function generatePillsChip(isTaken = false, streak = 0) {
    const activeClass = isTaken
        ? "bg-blue-500/10 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        : "bg-[#36393f] text-gray-500 border-gray-700 hover:border-gray-500";

    const streakColor = isTaken ? 'text-orange-400' : 'text-gray-600 opacity-40';
    const streakHtml = `
        <div class="flex flex-col items-center justify-center mt-2 transition-all duration-500 ${streakColor}">
            <div class="flex items-center gap-1">
                <span class="text-2xl font-black tracking-tighter transition-all duration-500 ${isTaken ? 'scale-110 drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]' : ''}">${streak}</span>
                <span class="text-base ${streak > 0 && isTaken ? 'animate-fire-pulse' : ''}">🔥</span>
            </div>
            <div class="text-[8px] font-black uppercase tracking-[0.2em] leading-none mt-1 opacity-70">Dní v řadě</div>
        </div>
    `;

    return `
      <div class="flex flex-col w-full items-center">
          <button onclick="window.loadModule('health').then(m => m.updateHealth('pills', ${!isTaken}))" 
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 transform active:scale-95 w-full justify-center ${activeClass}">
              <span class="text-lg">💊</span>
              <span class="text-xs font-bold uppercase">Vzala</span>
              ${isTaken ? '<i class="fas fa-check text-[10px] ml-1"></i>' : ''}
          </button>
          ${streakHtml}
      </div>
    `;
}

export function getSleepColor(hours) {
    if (hours < 5) return { class: "text-[#ed4245]", hex: "#ed4245", label: "Zombie 🧟‍♀️" };
    else if (hours < 7) return { class: "text-[#faa61a]", hex: "#faa61a", label: "Ujde to 😐" };
    else if (hours < 9) return { class: "text-[#3ba55c]", hex: "#3ba55c", label: "Ideál ✨" };
    else return { class: "text-[#eb459e]", hex: "#eb459e", label: "Růženka 👸" };
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
                    oninput="window.loadModule('dashboard').then(m => m.updateSleep(this.value))" 
                    onchange="window.loadModule('health').then(m => m.updateHealth('sleep', parseFloat(this.value)))"
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
                 <div id="sleep-controls-container" class="flex gap-2 items-center bg-[#202225] p-1.5 rounded-lg border border-[#36393f] shadow-sm">
                    ${generateSleepControls(data)}
                </div>
            </div>
        </div>
    `;
}

export function generateSleepControls(data) {
    if (state.currentSleepSession && state.currentSleepSession.isSleeping) {
        const startTime = new Date(state.currentSleepSession.startTime);
        const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
        const isNap = state.currentSleepSession.type === 'nap';
        const labelText = isNap ? "Dobíjení..." : "Spíš od";
        const labelClass = isNap ? "text-[#00e5ff]" : "text-[#faa61a]";
        const icon = isNap ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-sun"></i>';
        return `
            <span id="sleep-session-label" class="text-[10px] ${labelClass} font-bold uppercase ml-1 animate-pulse">${labelText} ${timeStr}</span>
            <button onclick="window.loadModule('health').then(m => m.wakeUp())" class="bg-[#faa61a]/10 hover:bg-[#faa61a] text-[#faa61a] hover:text-black px-3 py-1 rounded border border-[#faa61a] transition flex items-center justify-center gap-2 shadow-sm active:scale-95 h-8 font-bold text-xs">
                 ${icon} Vstávat
            </button>
        `;
    } else {
        return `
            <span class="text-[10px] text-gray-400 font-bold uppercase ml-1">Usínání:</span>
            <input type="time" value="${data.bedtime || ""}" onchange="window.loadModule('health').then(m => m.updateBedtime(this.value))" class="bg-transparent text-white text-sm p-1 rounded focus:bg-[#2f3136] outline-none h-8 w-20 text-center font-mono font-bold">
            <button onclick="window.loadModule('health').then(m => m.startSleep())" class="bg-[#2f3136] hover:bg-[#9b59b6] text-gray-400 hover:text-white w-8 h-8 rounded border border-[#36393f] transition flex items-center justify-center shadow-sm active:scale-95">
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

    const todayKey = getTodayKey();
    if (state.healthData && state.healthData[todayKey]) {
        state.healthData[todayKey].sleep = parseFloat(sleepValue);
    }
}

export function generateTetrisMiniTracker() {
    const score = state.tetris || { jose: 0, klarka: 0 };
    const joseScore = score.jose || 0;
    const klarkaScore = score.klarka || 0;
    
    const joseLeading = joseScore > klarkaScore;
    const klarkaLeading = klarkaScore > joseScore;

    return `
    <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-6 cursor-pointer hover:bg-black/10 transition-all duration-300 group overflow-hidden relative" 
         onclick="window.switchChannel('tetris')">
        
        <div class="absolute inset-0 bg-gradient-to-r from-[#5865F2]/5 via-transparent to-[#eb459e]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div class="flex justify-between items-center mb-6 relative z-10">
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                <i class="fas fa-th text-[#5865F2]"></i> Tetris War
            </h3>
            ${joseLeading || klarkaLeading ? `<span class="text-[9px] font-black text-yellow-400/80 uppercase tracking-widest bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">Aktuální lídr 🏆</span>` : ''}
        </div>

        <div class="flex items-center justify-between gap-2 relative z-10">
            <!-- Jose (Raccoon) -->
            <div class="flex items-center gap-4 flex-1">
                <div class="relative">
                    <img src="${getAssetUrl('jozka_profile')}" class="w-12 h-12 rounded-full border-2 ${joseLeading ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,166,26,0.4)]' : 'border-white/10'} object-cover group-hover:scale-105 transition-transform duration-500">
                    ${joseLeading ? '<div class="absolute -top-3 -left-1 text-xl drop-shadow-md animate-crown">👑</div>' : ''}
                </div>
                <div>
                    <div class="text-3xl font-black ${joseLeading ? 'text-white' : 'text-gray-500'} tracking-tighter transition-colors">${joseScore}</div>
                </div>
            </div>
            
            <div class="flex flex-col items-center">
                <div class="text-[9px] font-black text-gray-600 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-lg border border-white/5">VS</div>
            </div>

            <!-- Klarka (Frog) -->
            <div class="flex items-center gap-4 flex-1 justify-end text-right">
                <div>
                    <div class="text-3xl font-black ${klarkaLeading ? 'text-white' : 'text-gray-500'} tracking-tighter transition-colors">${klarkaScore}</div>
                </div>
                <div class="relative">
                    <img src="${getAssetUrl('klarka_profile')}" class="w-12 h-12 rounded-full border-2 ${klarkaLeading ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,166,26,0.4)]' : 'border-white/10'} object-cover group-hover:scale-105 transition-transform duration-500">
                    ${klarkaLeading ? '<div class="absolute -top-3 -right-1 text-xl drop-shadow-md animate-crown">👑</div>' : ''}
                </div>
            </div>
        </div>
    </div>
    `;
}
