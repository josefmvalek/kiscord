import { state } from '@core/state.js';
import { getTodayKey } from '@core/utils.js';
import {
    generateSunflowerSVG,
    interpolateColor,
    getSleepCenterColors
} from '@shared/components/Sunflower.js';

export { generateSunflowerSVG, interpolateColor, getSleepCenterColors };

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
        
        const isSleeping = isPartnerId 
            ? (data.bedtime && new Date() - new Date(data.bedtime) < 12 * 60 * 60 * 1000 && (new Date().getHours() >= 21 || new Date().getHours() <= 10))
            : (data.bedtime && !data.wake_time && state.currentSleepSession?.isSleeping);
        
        if (isSleeping) wrapper.classList.add('sf-sleep');
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
        const sleepColors = getSleepCenterColors(data.sleep);
        centers[0].setAttribute('fill', sleepColors.outer);
        centers[1].setAttribute('fill', sleepColors.inner);
        
        // Update Face Opacity
        const faceOpacity = 0.4 + (Math.min(10, data.sleep || 0) / 10) * 0.6;
        svg.querySelectorAll('.sf-face').forEach(el => {
            el.setAttribute('opacity', faceOpacity);
        });
    }
}
