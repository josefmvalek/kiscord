
let hasUserInteracted = false;

// Sledování interakce uživatele (nutné pro audio/haptiku)
if (typeof document !== 'undefined') {
    ['click', 'touchstart', 'keydown'].forEach(evt =>
        document.addEventListener(evt, () => hasUserInteracted = true, { once: true })
    );
}

export function triggerHaptic(type = "light") {
    // Haptika funguje jen po interakci a na podporovaných zařízeních
    if (!navigator.vibrate || !hasUserInteracted) return;

    if (type === "light")
        navigator.vibrate(5); // Jemné ťuknutí
    else if (type === "medium")
        navigator.vibrate(15); // Potvrzení
    else if (type === "heavy")
        navigator.vibrate(30); // Chyba/Důležité
    else if (type === "success") navigator.vibrate([10, 30, 10]); // Dvojité
}

export function normalizeText(text) {
    if (!text) return "";
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
}

export function triggerConfetti() {
    const container = document.createElement('div');
    container.className = 'aura-fx-container';
    
    // 1. The Aura Ring (Halo)
    const ring = document.createElement('div');
    ring.className = 'aura-ring';
    container.appendChild(ring);
    
    // 2. The Sparkles (Floating high-quality ✨)
    const sparkleEmojis = ['✨', '☀️', '💖', '✨'];
    for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'aura-sparkle';
        sparkle.innerText = sparkleEmojis[i % sparkleEmojis.length];
        
        // Random drift direction
        const dx = (Math.random() - 0.5) * 300; // -150 to 150px
        const dy = (Math.random() - 0.5) * 200 - 50; // -150 to 50px
        
        sparkle.style.setProperty('--dx', `${dx}px`);
        sparkle.style.setProperty('--dy', `${dy}px`);
        sparkle.style.left = '50%';
        sparkle.style.top = '50%';
        sparkle.style.animationDelay = `${Math.random() * 0.5}s`;
        
        container.appendChild(sparkle);
    }
    
    document.body.appendChild(container);
    
    // Cleanup
    setTimeout(() => {
        if (container.parentNode) {
            document.body.removeChild(container);
        }
    }, 2500);
}

/**
 * Czech name declension for Jožka and Klárka
 * @param {string} name 
 * @param {number} caseNum (1-7)
 */
export function getInflectedName(name, caseNum) {
    if (!name) return "";
    const lower = name.toLowerCase();
    const isKlarka = lower.includes('klár') || lower.includes('klar');
    const isJozka = lower.includes('jožk') || lower.includes('jozk');

    if (isKlarka) {
        switch (caseNum) {
            case 2: return 'Klárky';
            case 3: return 'Klárce';
            case 4: return 'Klárku';
            case 6: return 'Klárce';
            case 7: return 'Klárkou';
            case 5: return 'Klárko';
            default: return 'Klárka';
        }
    }
    if (isJozka) {
        switch (caseNum) {
            case 2: return 'Jožky';
            case 3: return 'Jožkovi';
            case 4: return 'Jožku';
            case 6: return 'Jožkovi';
            case 7: return 'Jožkou';
            case 5: return 'Jožko';
            default: return 'Jožka';
        }
    }
    return name;
}

/**
 * Simple pause for async functions (useful for retries)
 */
export const sleep = ms => new Promise(res => setTimeout(res, ms));
