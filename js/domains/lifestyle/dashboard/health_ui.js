import { state } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { getAssetUrl } from '@core/assets.js';
import { updateSunflowersDOM } from './sunflowers.js';
import { getPillsStreak } from '@domains/fitness/health.js';

// --- VISUAL GENERATORS (Mood/Water/Movement/Sleep) ---

const moodColors = [
    '#5865F2', // 1 - Discord Blurple
    '#4752C4', // 2
    '#3BA55C', // 3 - Discord Green
    '#57F287', // 4
    '#FEE75C', // 5 - Yellow
    '#FAA61A', // 6 - Gold/Amber
    '#F26522', // 7 - Orange
    '#ED4245', // 8 - Red
    '#EB459E', // 9 - Pink
    '#FFFFFF'  // 10 - Bright
];

export function getMoodDescriptor(value) {
    const val = parseInt(value) || 5;
    const descriptors = [
        "",
        "😭 Úplně na dně",
        "😢 Velmi špatně",
        "🌧️ Smutno / unavená",
        "😕 Nic moc",
        "😐 Neutrální den",
        "🙂 Docela fajn",
        "😊 Dobrá nálada",
        "🌸 Skvělý den!",
        "💖 Zamilovaná & šťastná",
        "🌟 Naprostá euforie!"
    ];
    return descriptors[val] || "😊 Dobrá nálada";
}

export function generateMoodSlider(currentMood) {
    let value = typeof currentMood === 'number' ? currentMood : 5;
    const bubbleImage = getAssetUrl('mood', value);
    const descriptor = getMoodDescriptor(value);
    const percent = Math.min(100, Math.max(0, ((value - 1) / 9) * 100));
    const moodColor = moodColors[value - 1] || '#faa61a';

    return `
    <div class="space-y-3">
        <!-- Live náhled fotky Czippela & popisek nálady -->
        <div class="flex items-center justify-between pb-1">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] border-2 border-[#faa61a]/60 shadow-md overflow-hidden relative group flex-shrink-0">
                    <img src="${bubbleImage}" id="mood-preview-avatar" alt="Mood" class="w-full h-full object-cover transition-transform duration-200" onerror="this.src='${getAssetUrl('app_kytka')}'">
                </div>
                <div>
                    <span class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Moje nálada dnes</span>
                    <span class="text-xs sm:text-sm font-black text-[var(--text-header)]" id="mood-descriptor-text">${descriptor}</span>
                </div>
            </div>
            <div class="px-2.5 py-1 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] text-center">
                <span class="text-xs font-black text-[#faa61a]" id="mood-badge-value">${value} / 10</span>
            </div>
        </div>

        <!-- Slider container s unifikovaným bílým jezdcem -->
        <div class="mood-slider-container relative" id="mood-slider-wrapper" 
            onmousedown="this.classList.add('dragging')"
            onmouseup="this.classList.remove('dragging'); window.hideMoodBubble()"
            ontouchstart="this.classList.add('dragging')"
            ontouchend="this.classList.remove('dragging'); window.hideMoodBubble()"
            onpointerup="this.classList.remove('dragging'); window.hideMoodBubble()">
            
            <!-- Vyskakovací bublina s velkou fotkou -->
            <div class="mood-bubble-wrapper" id="mood-bubble">
                <div class="mood-bubble bg-[var(--bg-secondary)] border-2 border-[#faa61a] shadow-2xl">
                    <img src="${bubbleImage}" id="mood-bubble-img" alt="Mood" onerror="this.src='${getAssetUrl('app_kytka')}'">
                </div>
                <div class="mood-rating-value text-[var(--text-header)] font-black" id="mood-bubble-value">${value}/10</div>
            </div>

            <!-- Identický slider track jako u spánku -->
            <div class="relative w-full h-5 rounded-full bg-[var(--bg-tertiary)] p-1 border border-[var(--border-subtle)] flex items-center">
                 <input type="range" min="1" max="10" step="1" value="${value}" 
                    oninput="window.updateMoodVisuals(this.value, true)" 
                    onchange="window.loadModule('health').then(m => m.updateHealth('mood', parseInt(this.value)))"
                    onmouseup="document.getElementById('mood-slider-wrapper')?.classList.remove('dragging'); window.hideMoodBubble()"
                    ontouchend="document.getElementById('mood-slider-wrapper')?.classList.remove('dragging'); window.hideMoodBubble()"
                    onpointerup="document.getElementById('mood-slider-wrapper')?.classList.remove('dragging'); window.hideMoodBubble()"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                    id="mood-range-input">
                 
                 <!-- Vyplněný barevný progress -->
                 <div class="h-full rounded-full transition-all duration-100 pointer-events-none" 
                      id="mood-progress-bar" 
                      style="width: ${percent}%; background: linear-gradient(90deg, #5865F2 0%, ${moodColor} 100%);"></div>
                 
                 <!-- Kulatý bílý jezdec -->
                 <div class="absolute h-6 w-6 bg-white rounded-full shadow-md border-2 border-[#faa61a] pointer-events-none z-20 transition-all duration-100 flex items-center justify-center" 
                      id="mood-marker" 
                      style="left: ${percent}%; transform: translateX(-50%);">
                 </div>
            </div>
            
            <div class="flex justify-between w-full px-1 pt-2 select-none">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n =>
                    `<button type="button" 
                           class="text-[11px] font-black cursor-pointer transition-all p-1 ${n === value ? 'text-[var(--text-header)] scale-125 font-black drop-shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-normal)]'}" 
                           id="mood-num-${n}" 
                           onclick="window.updateMoodVisuals(${n}); document.getElementById('mood-range-input').value=${n}; window.loadModule('health').then(m => m.updateHealth('mood', ${n}))">
                        ${n}
                    </button>`
                ).join('')}
            </div>
        </div>
    </div>
    `;
}

export function updateMoodVisuals(val, activateBubble = false) {
    const value = parseInt(val);
    const bubbleWrapper = document.getElementById('mood-bubble');
    const bubbleImg = document.getElementById('mood-bubble-img');
    const bubbleVal = document.getElementById('mood-bubble-value');
    const previewAvatar = document.getElementById('mood-preview-avatar');
    const descriptorText = document.getElementById('mood-descriptor-text');
    const badgeVal = document.getElementById('mood-badge-value');
    const progressBar = document.getElementById('mood-progress-bar');
    const marker = document.getElementById('mood-marker');

    const assetUrl = getAssetUrl('mood', value);
    const percent = Math.min(100, Math.max(0, ((value - 1) / 9) * 100));
    const moodColor = moodColors[value - 1] || '#faa61a';

    if (bubbleImg) bubbleImg.src = assetUrl;
    if (bubbleVal) bubbleVal.innerText = `${value}/10`;
    if (previewAvatar) previewAvatar.src = assetUrl;
    if (descriptorText) descriptorText.innerText = getMoodDescriptor(value);
    if (badgeVal) badgeVal.innerText = `${value} / 10`;

    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.style.background = `linear-gradient(90deg, #5865F2 0%, ${moodColor} 100%)`;
    }

    if (marker) {
        marker.style.left = `${percent}%`;
        marker.style.borderColor = moodColor;
    }

    const offset = 14 - (percent * 0.28);
    if (bubbleWrapper) {
        bubbleWrapper.style.left = `calc(${percent}% + ${offset}px)`;
        if (activateBubble) {
            bubbleWrapper.classList.add('active');
        } else {
            bubbleWrapper.classList.remove('active');
        }
    }

    for (let i = 1; i <= 10; i++) {
        const span = document.getElementById(`mood-num-${i}`);
        if (span) {
            if (i === value) {
                span.className = 'text-[11px] font-black cursor-pointer transition-all p-1 text-white scale-125 font-black drop-shadow';
            } else {
                span.className = 'text-[11px] font-black cursor-pointer transition-all p-1 text-[#72767d] hover:text-[#dcddde]';
            }
        }
    }

    triggerHaptic("light");

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
    if (counter) counter.innerText = `${waterCount} / 8 sklenic`;
    
    updateSunflowersDOM();
}

export function generateWaterIcons(count) {
    let html = "";
    for (let i = 1; i <= 8; i++) {
        const isFull = i <= count;
        const colorClass = isFull 
            ? "text-[#00aff4] bg-[#00aff4]/15 border border-[#00aff4]/50 shadow-sm" 
            : "text-[var(--text-muted)] bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:text-[#00aff4] hover:bg-[var(--bg-modifier-hover)]";

        html += `
            <button type="button"
                    onclick="window.loadModule('utils').then(u => u.triggerHaptic('light')); window.loadModule('health').then(m => m.updateHealth('water', ${i}))" 
                    class="w-full min-w-0 h-11 rounded-xl transition-all duration-150 flex items-center justify-center text-base sm:text-lg active:scale-95 cursor-pointer outline-none ${colorClass}"
                    title="${i} sklenic vody">
                <i class="fas fa-tint pointer-events-none"></i>
            </button>
        `;
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
        { id: 'gym', icon: '💪', label: 'Fitko', color: 'text-[#eb459e]', border: 'border-[#eb459e]/50', bg: 'bg-[#eb459e]/15' },
        { id: 'walk', icon: '🌲', label: 'Procházka', color: 'text-[#3ba55c]', border: 'border-[#3ba55c]/50', bg: 'bg-[#3ba55c]/15' }
    ];

    return activities.map(act => {
        const isActive = movement.includes(act.id);
        const activeClass = isActive
            ? `${act.bg} ${act.color} ${act.border} font-black shadow-sm`
            : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-[var(--bg-modifier-hover)] hover:text-[var(--text-header)]";

        return `
          <button type="button"
                  onclick="window.loadModule('health').then(m => m.updateHealth('movement', '${act.id}'))" 
                  class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all duration-200 active:scale-95 w-full min-h-[44px] ${activeClass}">
              <span class="text-lg">${act.icon}</span>
              <span class="text-xs font-bold uppercase tracking-wider">${act.label}</span>
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
        { id: 'magnesium', icon: '🌙', label: 'Hořčík', activeClass: 'text-[var(--blurple)] bg-[var(--blurple)]/15 border-[var(--blurple)]/50 shadow-sm' },
        { id: 'zinc', icon: '✨', label: 'Zinek', activeClass: 'text-[#faa61a] bg-[#faa61a]/15 border-[#faa61a]/50 shadow-sm' },
        { id: 'iron', icon: '🩸', label: 'Železo', activeClass: 'text-[#ed4245] bg-[#ed4245]/15 border-[#ed4245]/50 shadow-sm' }
    ];

    return activities.map(act => {
        const isActive = supplements[act.id];
        const currentClass = isActive
            ? act.activeClass
            : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-[var(--bg-modifier-hover)] hover:text-[var(--text-header)]";

        return `
          <button type="button"
                  onclick="window.loadModule('health').then(m => m.updateHealth('supplements', '${act.id}'))" 
                  class="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 active:scale-95 min-h-[64px] ${currentClass}">
              <span class="text-xl leading-none">${act.icon}</span>
              <span class="text-[11px] font-black uppercase tracking-wider">${act.label}</span>
              <span class="text-[9px] font-bold ${isActive ? 'opacity-100 text-emerald-400' : 'opacity-0'} transition-opacity">Vzato <i class="fas fa-check text-[8px]"></i></span>
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
        ? "bg-[#3ba55c]/15 text-[#3ba55c] border-[#3ba55c]/50 font-black shadow-sm"
        : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-[var(--bg-modifier-hover)] hover:text-[var(--text-header)]";

    const streakColor = isTaken ? 'text-amber-400' : 'text-[var(--text-muted)]';
    const streakHtml = `
        <div class="flex items-center justify-center gap-1.5 mt-2 ${streakColor} text-[10px] font-black uppercase tracking-wider">
            <span>Streak:</span>
            <span class="text-sm font-black text-amber-400">${streak}</span>
            <span class="text-base ${streak > 0 && isTaken ? 'animate-fire-pulse' : ''}">🔥</span>
            <span>dní</span>
        </div>
    `;

    return `
      <div class="flex flex-col w-full items-center">
          <button type="button"
                  onclick="window.loadModule('health').then(m => m.updateHealth('pills', ${!isTaken}))" 
                  class="flex items-center gap-2 px-3 py-3 rounded-xl border transition-all duration-200 active:scale-95 w-full justify-center min-h-[44px] ${activeClass}">
              <span class="text-lg">💊</span>
              <span class="text-xs font-bold uppercase tracking-wider">Léky vzaty</span>
              ${isTaken ? '<i class="fas fa-check text-[10px] ml-1"></i>' : ''}
          </button>
          ${streakHtml}
      </div>
    `;
}

// --- SLEEP TRACKER 2.0 (High Precision, Presets & Quality Feedback) ---

export function getSleepInfo(hours) {
    const num = parseFloat(hours) || 0;
    if (num <= 0) return { class: "text-[var(--text-muted)]", hex: "#72767d", label: "Nezadáno 😴", pill: "bg-[var(--bg-tertiary)] text-[var(--text-muted)]" };
    if (num < 5) return { class: "text-[#ed4245]", hex: "#ed4245", label: "Zombie 🧟‍♀️ (Málo spánku)", pill: "bg-[#ed4245]/15 text-[#ed4245] border border-[#ed4245]/30" };
    if (num < 7) return { class: "text-[#faa61a]", hex: "#faa61a", label: "Ujde to 😐 (Chce to kafe ☕)", pill: "bg-[#faa61a]/15 text-[#faa61a] border border-[#faa61a]/30" };
    if (num < 9) return { class: "text-[#3ba55c]", hex: "#3ba55c", label: "Ideál ✨ (Krásně vyspaná)", pill: "bg-[#3ba55c]/15 text-[#3ba55c] border border-[#3ba55c]/30" };
    return { class: "text-[#eb459e]", hex: "#eb459e", label: "Růženka 👸 (Královský relax)", pill: "bg-[#eb459e]/15 text-[#eb459e] border border-[#eb459e]/30" };
}

export function getSleepColor(hours) {
    return getSleepInfo(hours);
}

export function generateSleepSlider(data) {
    const sleepValue = typeof data.sleep === "number" ? data.sleep : 0;
    const sleepInfo = getSleepInfo(sleepValue);
    const isTracking = state.currentSleepSession && state.currentSleepSession.isSleeping;
    const disabledClass = isTracking ? "opacity-50 grayscale cursor-not-allowed pointer-events-none" : "";
    const disabledAttr = isTracking ? "disabled" : "";

    const percent = Math.min(100, Math.max(0, (sleepValue / 10) * 100));

    return `
        <div class="space-y-3">
            <!-- Horní indikátor kvality spánku -->
            <div class="flex justify-between items-center">
                <div class="flex items-baseline gap-1.5" id="sleep-value-wrapper">
                    <span class="font-black text-3xl ${sleepInfo.class} font-mono leading-none" id="sleep-value-text">${sleepValue}</span>
                    <span class="text-xs font-bold text-[var(--text-muted)] uppercase">hodin</span>
                </div>
                <div id="sleep-quality-badge" class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${sleepInfo.pill}">
                    ${sleepInfo.label}
                </div>
            </div>

            <!-- Interaktivní slider s plynulým barevným přechodem -->
            <div class="relative w-full h-5 rounded-full bg-[var(--bg-tertiary)] p-1 border border-[var(--border-subtle)] ${disabledClass} flex items-center">
                 <input type="range" min="0" max="10" step="0.5" value="${sleepValue}" 
                    oninput="window.updateSleep(this.value)" 
                    onchange="window.loadModule('health').then(m => m.updateHealth('sleep', parseFloat(this.value)))"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                    ${disabledAttr}>
                 
                 <!-- Vyplněný barevný progress -->
                 <div class="h-full rounded-full transition-all duration-100 pointer-events-none" 
                      id="sleep-progress-bar" 
                      style="width: ${percent}%; background: linear-gradient(90deg, #5865F2 0%, ${sleepInfo.hex} 100%);"></div>
                 
                 <!-- Kulatý bílý jezdec -->
                 <div class="absolute h-6 w-6 bg-white rounded-full shadow-md border-2 border-[#5865F2] pointer-events-none z-20 transition-all duration-100 flex items-center justify-center" 
                      id="sleep-marker" 
                      style="left: ${percent}%; transform: translateX(-50%);">
                 </div>
            </div>

            <!-- Rychlé volby hodin pro 1 kliknutí (Mobile-First Presets) -->
            <div class="flex justify-between items-center gap-1.5 pt-1">
                <div class="flex gap-1 flex-1">
                    ${[5, 6, 7, 8, 9].map(h => `
                        <button type="button" 
                                onclick="window.updateSleep(${h}); window.loadModule('health').then(m => m.updateHealth('sleep', ${h}))"
                                class="flex-1 py-1 text-[11px] font-black rounded-lg transition-all ${Math.round(sleepValue) === h ? 'bg-[var(--blurple)] text-white shadow-sm' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] border border-[var(--border-subtle)]'}">
                            ${h}h
                        </button>
                    `).join('')}
                </div>

                <!-- Usínání a noční režim -->
                <div id="sleep-controls-container" class="flex gap-1.5 items-center bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-xl border border-[var(--border-subtle)]">
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
        const labelClass = isNap ? "text-[#00aff4]" : "text-[#faa61a]";
        const icon = isNap ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-sun"></i>';
        return `
            <span id="sleep-session-label" class="text-[10px] ${labelClass} font-bold uppercase ml-1 animate-pulse">${labelText} ${timeStr}</span>
            <button onclick="window.loadModule('health').then(m => m.wakeUp())" class="bg-[#faa61a]/20 hover:bg-[#faa61a] text-[#faa61a] hover:text-black px-2.5 py-1 rounded-lg border border-[#faa61a]/40 transition flex items-center justify-center gap-1 shadow-sm active:scale-95 font-bold text-[10px]">
                 ${icon} Vstávat
            </button>
        `;
    } else {
        return `
            <span class="text-[10px] text-[var(--text-muted)] font-bold uppercase">Usínání:</span>
            <input type="time" value="${data.bedtime || ""}" onchange="window.loadModule('health').then(m => m.updateBedtime(this.value))" class="bg-transparent text-[var(--text-header)] text-xs p-0.5 rounded focus:bg-[var(--bg-modifier-hover)] outline-none h-6 w-14 text-center font-mono font-bold">
            <button onclick="window.loadModule('health').then(m => m.startSleep())" class="bg-[var(--bg-tertiary)] hover:bg-[var(--blurple)] text-[var(--text-muted)] hover:text-white w-6 h-6 rounded-lg border border-[var(--border-subtle)] transition flex items-center justify-center shadow-sm active:scale-95" title="Zahájit spánek">
                 <i class="fas fa-moon text-[10px]"></i>
            </button>
        `;
    }
}

export function updateSleep(val) {
    triggerHaptic("light");
    const sleepValue = parseFloat(val) || 0;
    const sleepInfo = getSleepInfo(sleepValue);
    const progressBar = document.getElementById('sleep-progress-bar');
    const marker = document.getElementById('sleep-marker');
    const textEl = document.getElementById('sleep-value-text');
    const badgeEl = document.getElementById('sleep-quality-badge');

    const percent = Math.min(100, Math.max(0, (sleepValue / 10) * 100));

    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.style.background = `linear-gradient(90deg, #5865F2 0%, ${sleepInfo.hex} 100%)`;
    }
    if (marker) {
        marker.style.left = `${percent}%`;
    }
    if (textEl) {
        textEl.innerText = sleepValue;
        textEl.className = `font-black text-3xl ${sleepInfo.class} font-mono leading-none`;
    }
    if (badgeEl) {
        badgeEl.className = `px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${sleepInfo.pill}`;
        badgeEl.innerText = sleepInfo.label;
    }

    const todayKey = getTodayKey();
    if (state.healthData && state.healthData[todayKey]) {
        state.healthData[todayKey].sleep = sleepValue;
    }
    updateSunflowersDOM();
}
