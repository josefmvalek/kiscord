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

    // Server-side CRON now handles background reminders (water, pills, bedtime).
    // Local checkReminders was removed to prevent duplicate notifications.

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
 * External gateways for notifications
 */
export function handlePartnerAction(id, message) { triggerNotification('partner', id, message); }
export function handleSystemAction(id, message) { triggerNotification('system', id, message); }

/**
 * Triggers a notification with haptics and sound based on user preferences.
 */
export function triggerNotification(category, id, message) {
    const section = state.settings?.notifications?.[category];
    const config = section?.[id];
    
    if (config && config.enabled === false) return;

    // 1. Show UI Toast
    showNotification(message, category === 'reminders' ? 'info' : 'success');

    // 2. Trigger Haptics
    if ((!config || config.haptic !== false) && state.settings?.haptics !== false) {
        triggerHaptic('heavy');
    }

    // 3. Send Native System Notification
    sendLocalNotification(message, { 
        tag: id,
        renotify: true,
        silent: false
    });
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

/**
 * Send a background Web Push notification to a target user via the Supabase send-push Edge Function.
 * @param {string} targetUserId
 * @param {object} options
 * @param {string} options.title - Notification title
 * @param {string} [options.body=''] - Notification body text
 * @param {string} [options.tag='kiscord-push'] - Collapsing/grouping tag
 * @param {string} [options.url='/'] - Deep link URL
 * @param {string} [options.channel=''] - Target channel ID (e.g. 'daily-questions', 'dorm-hub')
 * @returns {Promise<boolean>}
 */
export async function sendPushNotification(targetUserId, { title, body = '', tag = 'kiscord-push', url = '/', channel = '' }) {
    if (!targetUserId || !title) return false;

    try {
        const payload = {
            userId: targetUserId,
            title,
            body,
            tag,
            url: channel ? `/?channel=${channel}` : url,
            channel
        };

        const { data, error } = await supabase.functions.invoke('send-push', {
            body: payload
        });

        if (error) {
            console.warn('[Push] Edge function error:', error);
            return false;
        }

        console.log('[Push] Push notification dispatched successfully:', data);
        return true;
    } catch (err) {
        console.warn('[Push] Failed to invoke send-push:', err);
        return false;
    }
}

/**
 * Send a background Web Push notification directly to the partner (Josef or Klárka).
 * @param {object} options
 * @param {string} options.title - Notification title
 * @param {string} [options.body=''] - Notification body text
 * @param {string} [options.tag='partner-action'] - Notification tag
 * @param {string} [options.url='/'] - Deep link URL
 * @param {string} [options.channel=''] - Target channel ID
 * @returns {Promise<boolean>}
 */
export async function sendPushToPartner(options) {
    if (!state.currentUser?.id) return false;

    // Resolve partner ID
    const myId = state.currentUser.id;
    let partnerId = null;

    if (state.user_ids?.jose && state.user_ids?.klarka) {
        partnerId = (myId === state.user_ids.jose) ? state.user_ids.klarka : state.user_ids.jose;
    }

    if (!partnerId) {
        console.warn('[Push] Partner user ID could not be determined.');
        return false;
    }

    return sendPushNotification(partnerId, options);
}
