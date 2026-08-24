/**
 * Shared Sunflower Component (SVG Generator & Color Math)
 * Used across Dashboard and Interactive Manual
 */

/**
 * Helper to interpolate between two hex colors.
 * @param {string} color1 - Hex color '#RRGGBB'
 * @param {string} color2 - Hex color '#RRGGBB'
 * @param {number} factor - Between 0 and 1
 * @returns {string} Interpolated hex color '#RRGGBB'
 */
export function interpolateColor(color1, color2, factor) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Returns outer and inner center colors based on sleep hours (0-10).
 * @param {number} hours
 * @returns {{ outer: string, inner: string }}
 */
export function getSleepCenterColors(hours) {
    const h = Math.min(10, Math.max(0, hours || 0));
    const factor = h / 10;
    // From very dark brown to a lighter, warmer brown
    const outer = interpolateColor('#1a1005', '#6b4226', factor);
    const inner = interpolateColor('#0d0601', '#3d2311', factor);
    return { outer, inner };
}

/**
 * Generates the full HTML for a Sunflower SVG.
 * @param {Object} [data] - { water: number, sleep: number, mood: number, movement: Array, bedtime: string|null }
 * @param {boolean} [isPartner=false]
 * @returns {string} HTML string
 */
export function generateSunflowerSVG(data, isPartner = false) {
    if (!data) data = { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    
    let containerClass = "relative flex flex-col items-center justify-end h-36 w-24 sunflower-container";
    if (data.sleep >= 7) containerClass += " sf-glow";
    
    // Check sleep status safely
    let isSleeping = false;
    if (data.bedtime) {
        const diffMs = new Date() - new Date(data.bedtime);
        const hoursNow = new Date().getHours();
        if (isPartner) {
            isSleeping = diffMs < 12 * 60 * 60 * 1000 && (hoursNow >= 21 || hoursNow <= 10);
        } else {
            isSleeping = !data.wake_time;
        }
    }
    
    if (isSleeping) containerClass += " sf-sleep";

    const mood = data.mood || 1;
    const numPetals = 27;
    const visiblePetals = Math.min(numPetals, Math.max(0, (mood - 1) * 3)); 
    const defsPrefix = isPartner ? 'p' : 'm';
    
    // Calculate sleep colors for SVG generation
    const sleepColors = getSleepCenterColors(data.sleep);
    
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
                            <circle cx="0" cy="0" r="18" fill="${sleepColors.outer}" stroke="#1f1005" stroke-width="2" class="sf-center" style="transition: fill 0.5s ease;"/>
                            <circle cx="0" cy="0" r="14" fill="${sleepColors.inner}" class="sf-center" style="transition: fill 0.5s ease;"/>
                            <circle cx="-5" cy="-2" r="1.5" fill="#facc15" opacity="${0.4 + (Math.min(10, data.sleep || 0) / 10) * 0.6}" class="sf-face" style="transition: opacity 0.5s ease;"/>
                            <circle cx="5" cy="-2" r="1.5" fill="#facc15" opacity="${0.4 + (Math.min(10, data.sleep || 0) / 10) * 0.6}" class="sf-face" style="transition: opacity 0.5s ease;"/>
                            <path d="M -3,3 Q 0,7 3,3" fill="none" stroke="#facc15" stroke-width="1.5" stroke-linecap="round" opacity="${0.4 + (Math.min(10, data.sleep || 0) / 10) * 0.6}" class="sf-face" style="transition: opacity 0.5s ease;"/>
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    `;
}
