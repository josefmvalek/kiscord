/**
 * Interactive Actions, Sunlight, Easter Eggs & Bedtime Notifications for Dashboard
 */

import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { broadcastSunlight } from '@core/sync.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { getTodayData } from '@domains/fitness/health.js';
import { isJosef } from '@core/auth.js';

let bedtimeReminderInterval = null;
let easterEggClicks = 0;
let lastEasterEggClick = 0;

export function sendSunlight() {
    triggerHaptic('success');
    triggerConfetti();
    showNotification("Poslal/a jsi sluneční paprsek! ☀️💛", "success");

    Promise.resolve(supabase.from('sunlight_history').insert([{ from_user_id: state.currentUser?.id }])).catch(() => {});
    broadcastSunlight();

    import('@core/notifications.js').then(m => {
        const senderName = state.currentUser?.name?.includes('Josef') ? 'Josef' : (state.currentUser?.name?.includes('Klára') ? 'Klárka' : 'Partner');
        m.sendPushToPartner({
            title: 'Kiscord ☀️',
            body: `${senderName} ti posílá hřejivý sluneční paprsek! 💛`,
            tag: 'sunlight',
            channel: 'dashboard'
        }).catch(() => {});
    }).catch(() => {});
}

export function inspectPartnerSunflower(isPartner) {
    triggerHaptic('light');
    const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const name = isPartner ? (isMeJose ? 'Klárka' : 'Jožka') : (isMeJose ? 'Jožka' : 'Klárka');
    const data = isPartner ? state.partnerHealthData : getTodayData();

    if (!data) {
        showNotification(`🌻 ${name} dnes zatím nemá zapsaná data.`, "info");
        return;
    }

    const water = data.water ? `${data.water}/8 vody 💧` : null;
    const sleep = data.sleep ? `${data.sleep}h spánku 😴` : null;
    const mood = data.mood ? `nálada ${data.mood}/10 🌸` : null;
    const pills = data.pills ? 'léky vzaty 💊' : null;

    const summary = [water, sleep, mood, pills].filter(Boolean).join(' • ');
    showNotification(`🌻 ${name} dnes: ${summary || 'Zatím odpočívá ✨'}`, "info");
}

export function initBedtimeReminder() {
    if (state.currentUser?.name !== 'Klárka') return;
    if (bedtimeReminderInterval) clearInterval(bedtimeReminderInterval);

    const savedTime = localStorage.getItem('kiscord_bedtime_reminder_time') || '23:00';
    const [remindHour, remindMin] = savedTime.split(':').map(Number);

    const check = () => {
        if (state.currentSleepSession?.isSleeping) return;
        if (document.getElementById('bedtime-reminder-widget')) return;
        if (state.currentChannel !== 'dashboard') return;

        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        if (h > remindHour || (h === remindHour && m >= remindMin)) {
            showBedtimeReminderWidget();
        }
    };

    check();
    bedtimeReminderInterval = setInterval(check, 60000);
}

function showBedtimeReminderWidget() {
    if (document.getElementById('bedtime-reminder-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'bedtime-reminder-widget';
    widget.className = 'fixed bottom-6 right-4 z-[90] animate-slide-up';
    widget.innerHTML = `
        <div class="bg-[#1e1f22] border border-[#5865F2]/40 rounded-2xl p-4 shadow-2xl max-w-[220px] relative overflow-hidden group">
            <button onclick="document.getElementById('bedtime-reminder-widget')?.remove()" 
                    class="absolute top-2 right-2 text-[#72767d] hover:text-white text-[10px] transition z-10">
                <i class="fas fa-times"></i>
            </button>
            <div class="relative z-10">
                <div class="text-3xl mb-2 animate-pulse">🌙</div>
                <p class="text-white text-xs font-bold mb-3 leading-snug">Čas spát,<br>Klárko! 😴</p>
                <button onclick="window.loadModule('health').then(m => m.startSleep()); document.getElementById('bedtime-reminder-widget')?.remove();"
                        class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-2 px-3 rounded-xl text-[11px] font-black transition active:scale-95 shadow">
                    <i class="fas fa-moon mr-1"></i> Jít spát
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);
    setTimeout(() => widget.remove(), 120000);
}

export function handleEasterEggClick() {
    const now = Date.now();
    if (now - lastEasterEggClick > 1000) {
        easterEggClicks = 1;
    } else {
        easterEggClicks++;
    }
    lastEasterEggClick = now;

    if (easterEggClicks >= 5) {
        triggerEasterEgg();
        easterEggClicks = 0;
    }
}

function triggerEasterEgg() {
    triggerHaptic('heavy');
    let overlay = document.getElementById('easter-egg-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'easter-egg-overlay';
        overlay.onclick = () => overlay.classList.remove('show');
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div id="easter-egg-message">Miluji tě, Sluníčko moje! 💖</div>
        <div class="text-[10px] text-gray-500 mt-10 uppercase tracking-widest font-black">(Klikni pro návrat)</div>
    `;
    overlay.classList.add('show');
}

export function getDaysTogether() {
    const start = new Date(state.startDate || '2024-04-28');
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}
