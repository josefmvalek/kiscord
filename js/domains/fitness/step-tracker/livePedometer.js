import { triggerHaptic } from '@core/utils.js';

let isListening = false;
let sessionSteps = 0;
let sessionStartTime = null;
let sessionTimerInterval = null;
let wakeLock = null;

// Accelerometer filtering variables
let lastMagnitude = 0;
let isPeak = false;
let lastStepTime = 0;
const STEP_THRESHOLD = 11.5; // m/s^2 magnitude threshold
const MIN_STEP_INTERVAL_MS = 280; // max ~3.5 steps/sec

/**
 * Požádá o oprávnění ke čtení senzorů pohybu (nutné zejména na iOS Safari).
 */
export async function requestMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceMotionEvent.requestPermission();
            return permissionState === 'granted';
        } catch (e) {
            console.warn("Motion permission error:", e);
            return false;
        }
    }
    return true; // Na Androidu a ostatních prohlížečích je povoleno automaticky
}

/**
 * Spustí aktivní Walk/Run session.
 */
export async function startLiveWalkSession(onUpdate) {
    const hasPermission = await requestMotionPermission();
    if (!hasPermission) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Pro live krokoměr je potřeba povolit přístup k pohybovým senzorům.', 'warning');
        }
        return false;
    }

    // Acquire WakeLock to keep screen alive
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {
            console.warn("WakeLock request error:", e);
        }
    }

    sessionSteps = 0;
    sessionStartTime = Date.now();
    isListening = true;

    window.addEventListener('devicemotion', handleMotion);

    sessionTimerInterval = setInterval(() => {
        if (typeof onUpdate === 'function') {
            const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
            const km = (sessionSteps * 0.00075).toFixed(2);
            const kcal = Math.round(sessionSteps * 0.04);
            onUpdate({
                steps: sessionSteps,
                distanceKm: km,
                calories: kcal,
                elapsedSeconds: elapsedSec,
                isActive: true
            });
        }
    }, 1000);

    triggerHaptic('success');
    return true;
}

/**
 * Zpracování pohybu akcelerometru a detekce kroků
 */
function handleMotion(event) {
    if (!isListening) return;

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null) return;

    // Vypočti velikost vektoru zrychlení
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = Date.now();

    // Detekce lokálního maxima (kroku)
    if (magnitude > STEP_THRESHOLD && magnitude > lastMagnitude) {
        isPeak = true;
    } else if (isPeak && magnitude < lastMagnitude) {
        if (now - lastStepTime > MIN_STEP_INTERVAL_MS) {
            sessionSteps++;
            lastStepTime = now;

            // Haptická odezva každých 100 kroků
            if (sessionSteps % 100 === 0) {
                triggerHaptic('light');
            }
        }
        isPeak = false;
    }

    lastMagnitude = magnitude;
}

/**
 * Zastaví aktivní Walk session a vrátí naměřená data.
 */
export function stopLiveWalkSession() {
    isListening = false;
    window.removeEventListener('devicemotion', handleMotion);

    if (sessionTimerInterval) {
        clearInterval(sessionTimerInterval);
        sessionTimerInterval = null;
    }

    if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
    }

    const elapsedSec = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const km = (sessionSteps * 0.00075).toFixed(2);
    const kcal = Math.round(sessionSteps * 0.04);

    triggerHaptic('success');

    return {
        steps: sessionSteps,
        distanceKm: km,
        calories: kcal,
        elapsedSeconds: elapsedSec
    };
}
