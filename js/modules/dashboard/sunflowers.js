import { state } from '../../core/state.js';
import { getTodayKey } from '../../core/utils.js';

/**
 * Updates both sunflowers (me and partner) in the DOM.
 */
export function updateSunflowersDOM() {
    const todayKey = getTodayKey();
    const data = state.healthData && state.healthData[todayKey] ? state.healthData[todayKey] : { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    
    syncSunflowerSVG("sunflower-me-container", data, false);
    syncSunflowerSVG("sunflower-partner-container", state.partnerHealthData || null, true);
}

/**
 * Synchronizes an existing Sunflower SVG with new data, or generates it if missing.
 */
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
            const scaleMag = isVisible ? (0.5 + swellBonus) : 0;
            leaf.style.transform = `scale(${scaleMag * leafData[i].s}, ${scaleMag})`;
        }
    }

    // Update Mood Petals (27 total)
    const mood = data.mood || 1;
    const numPetals = 27;
    const visiblePetals = Math.min(numPetals, Math.max(0, (mood - 1) * 3)); 

    for (let i = 0; i < numPetals; i++) {
        const petal = svg.querySelector(`.sf-petal-wrapper-${i}`);
        if (petal) {
            if (i >= visiblePetals) petal.classList.add('missing');
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

/**
 * Generates the full HTML for a Sunflower SVG.
 */
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
        const rotation = i * (360 / 27); 
        const isFront = i % 2 !== 0;
        const length = 46; 
        const width = 14; 
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
    const leafData = [{y: 140, s: 1}, {y: 120, s: -1}, {y: 100, s: 1}, {y: 80, s: -1}];

    let leavesHTML = "";
    for (let i = 0; i < 4; i++) {
        const isVisible = water > i;
        const scaleMag = isVisible ? (0.5 + swellBonus) : 0;
        const l = leafData[i];
        leavesHTML += `
            <g style="transform: translate(50px, ${l.y}px)">
                <g class="sf-leaf sf-leaf-${i}" style="transform: scale(${scaleMag * l.s}, ${scaleMag})">
                    <path d="M 0,0 Q 15,-15 30,-5 Q 15,10 0,0" fill="#16a34a" stroke="#14532d" stroke-width="1"/>
                </g>
            </g>
        `;
    }

    return `
        <div class="${containerClass}">
            <svg viewBox="0 0 100 150" width="100" height="150" style="overflow: visible; drop-shadow: 0 5px 5px rgba(0,0,0,0.5);">
                <defs>
                    <linearGradient id="petal-grad-${defsPrefix}" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#f59e0b"/><stop offset="25%" stop-color="#facc15"/><stop offset="100%" stop-color="#fef08a"/>
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
                            <circle cx="-5" cy="-2" r="1.5" fill="#facc15" opacity="0.8"/><circle cx="5" cy="-2" r="1.5" fill="#facc15" opacity="0.8"/>
                            <path d="M -3,3 Q 0,7 3,3" fill="none" stroke="#facc15" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    `;
}
