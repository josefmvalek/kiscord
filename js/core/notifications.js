import { state, stateEvents } from './state.js';
import { triggerHaptic, getTodayKey, sendLocalNotification } from './utils.js';
import { showNotification } from './theme.js';

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
    
    // Background ticker (every 5 minutes)
    setInterval(checkReminders, 5 * 60 * 1000);
    
    // Immediate check
    checkReminders();

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

