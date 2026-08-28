/**
 * Performance-Optimized Luxury Ambient Engine
 * Zero JS main-thread cost; all lighting and elevation handled natively via GPU-accelerated CSS.
 */

let isSpotlightInitialized = false;

export function initSpotlight() {
    if (isSpotlightInitialized || typeof window === 'undefined') return;
    isSpotlightInitialized = true;
    // Native GPU CSS transitions replace heavy pointermove event listeners
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSpotlight, { once: true });
    } else {
        initSpotlight();
    }
}
