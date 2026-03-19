
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
    if (typeof confetti !== 'function') return;

    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
    };

    function randomInOut(min, max) {
        return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function () {
        var timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        var particleCount = 50 * (timeLeft / duration);

        // Konfety padají náhodně ze dvou stran
        confetti(
            Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInOut(0.1, 0.3), y: Math.random() - 0.2 },
            }),
        );
        confetti(
            Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInOut(0.7, 0.9), y: Math.random() - 0.2 },
            }),
        );
    }, 250);
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
            default: return 'Jožka';
        }
    }
    return name;
}
