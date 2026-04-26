import { state, stateEvents } from './state.js';
import { triggerHaptic, getTodayKey, sendLocalNotification, urlBase64ToUint8Array } from './utils.js';
import { showNotification } from './theme.js';
import { supabase } from './supabase.js';

// VAPID Public Key (musí odpovídat VAPID_PUBLIC_KEY nastavenému v Supabase secrets)
const VAPID_PUBLIC_KEY = 'BNX5YosXTGS7oHTjl5l0Lk7HDwj88JUxjw8_EdjwnMmPfiJ5D0Qz5r3kQZAqwRYa39u1pPsGj-gN79ApaU4eSro';

// Cache for last notified timestamps to prevent spam
const lastNotified = {
    water: 0,
    pills: {}, // { todayKey: [time1, time2] }
    bedtime: 0
};

/**
 * Initializes the notification engine.
 */
export function initNotifications() {
    console.log("[Notifications] Engine initialized.");

    // PREVENT CATCH-UP NOTIFICATIONS ON REFRESH
    // 1. Water: Start interval from now
    lastNotified.water = Date.now();

    // 2. Bedtime: If already past bedtime today, don't notify again
    const todayKey = getTodayKey();
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const bedtimeConfig = state.settings.notifications.reminders.bedtime;
    if (bedtimeConfig.enabled && currentTimeStr >= bedtimeConfig.time) {
        lastNotified.bedtime = todayKey;
    }

    // 3. Pills: Mark all past scheduled pills today as already notified
    const pillConfig = state.settings.notifications.reminders.pills;
    if (pillConfig.enabled && pillConfig.reminders) {
        lastNotified.pills[todayKey] = pillConfig.reminders
            .filter(r => currentTimeStr >= r.time)
            .map(r => r.time);
    }
    
    // Background ticker (every 5 minutes)
    setInterval(checkReminders, 5 * 60 * 1000);
    
    // Initial silent check (skip triggering, just for state if needed in future)
    // For now, we just let the ticker handle the first real one after 5 mins
    // or if the user performs some action.

    // --- PARTNER ACTION LISTENERS ---
    
    window.addEventListener('sunlight-received', () => handlePartnerAction('sunlight', "Posílá ti sluneční paprsek! ☀️"));
    
    window.addEventListener('daily-questions-updated', (e) => {
        if (e.detail?.source === 'database') { 
             handlePartnerAction('dailyQuestions', "Partner odpověděl na dnešní otázku! ❓");
        }
    });

    window.addEventListener('letter-received', (e) => {
        handlePartnerAction('letters', `Dostal/a jsi nový dopis: ${e.detail?.title || 'Bez názvu'} 💌`);
    });

    // --- SYSTEM ACTION LISTENERS ---

    window.addEventListener('quests-updated', () => {
        handleSystemAction('quests', "Naše společné questy byly aktualizovány! 🛡️");
    });

    window.addEventListener('planned-dates-updated', (e) => {
        if (e.detail?.payload?.eventType === 'INSERT') {
            handleSystemAction('dates', "Máme naplánované nové rande! 🥂");
        }
    });
}

/**
 * Checks all health and routine reminders against current state and settings.
 */
function checkReminders() {
    if (state.currentChannel === 'settings') return;

    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentTimeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
    const todayKey = getTodayKey();
    const data = state.healthData[todayKey] || { water: 0, pills: false };
    const config = state.settings.notifications.reminders;

    // 1. Water Reminder
    if (config.water.enabled && data.water < 8) {
        const lastWaterTime = lastNotified.water;
        const intervalMs = config.water.interval * 60 * 1000;
        if (Date.now() - lastWaterTime > intervalMs) {
            triggerNotification('reminders', 'water', "Nezapomeň pít! 💧 Už jsi dlouho neměla sklenici vody.");
            lastNotified.water = Date.now();
        }
    }

    // 2. Pills Reminder (Multiple Times Support with Labels)
    if (config.pills.enabled) {
        if (!lastNotified.pills[todayKey]) lastNotified.pills[todayKey] = [];
        
        const reminders = config.pills.reminders || [];
        reminders.forEach(reminder => {
            const { time, label } = reminder;
            // If current time is after scheduled time AND we haven't notified for THIS specific scheduled time today
            if (currentTimeStr >= time && !lastNotified.pills[todayKey].includes(time)) {
                triggerNotification('reminders', 'pills', `Čas na tvoje léky: ${label} (${time})! 💊`);
                lastNotified.pills[todayKey].push(time);
            }
        });
    }

    // 3. Bedtime Reminder
    if (config.bedtime.enabled && state.currentUser?.name === 'Klárka') {
        if (currentTimeStr >= config.bedtime.time && lastNotified.bedtime !== todayKey) {
             triggerNotification('reminders', 'bedtime', "Sluníčko, už je čas jít spát. 🌙 Dobrou noc!");
             lastNotified.bedtime = todayKey;
        }
    }
}

/**
 * External gateways for notifications
 */
export function handlePartnerAction(id, message) { triggerNotification('partner', id, message); }
export function handleSystemAction(id, message) { triggerNotification('system', id, message); }

/**
 * Triggers a notification with haptics and sound based on user preferences.
 */
export function triggerNotification(category, id, message) {
    const section = state.settings.notifications[category];
    if (!section) return;
    const config = section[id];
    
    if (!config || !config.enabled) return;

    // 1. Show UI Toast
    showNotification(message, category === 'reminders' ? 'info' : 'success');

    // 2. Trigger Haptics
    if (config.haptic && state.settings.haptics) {
        triggerHaptic('heavy');
    }

    // 3. Send Native System Notification
    if (state.settings.notifications.nativeEnabled) {
        sendLocalNotification(message, { 
            tag: id,
            renotify: true,
            silent: false
        });
    }
}

/**
 * Registers this browser/device for Web Push notifications.
 * Saves the subscription endpoint + keys to Supabase.
 * Called after the user grants notification permission.
 */
export async function initPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Web Push not supported on this device.');
        return false;
    }

    if (Notification.permission !== 'granted') {
        console.warn('[Push] Notification permission not granted.');
        return false;
    }

    if (!state.currentUser?.id) {
        console.warn('[Push] No current user.');
        return false;
    }

    try {
        const swReg = await navigator.serviceWorker.ready;

        // Subscribeuj k Web Push (nebo získej existující subscripci)
        const subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const subJson = subscription.toJSON();
        const endpoint = subJson.endpoint;
        const keys = {
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || '',
        };

        // Ulož subscripci do Supabase (upsert — pokud už existuje, aktualizuj)
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                { user_id: state.currentUser.id, endpoint, keys },
                { onConflict: 'endpoint' }
            );

        if (error) {
            console.error('[Push] Failed to save subscription:', error);
            return false;
        }

        console.log('[Push] ✅ Push subscription registered successfully.');
        return true;
    } catch (err) {
        console.error('[Push] Failed to subscribe:', err);
        return false;
    }
}
