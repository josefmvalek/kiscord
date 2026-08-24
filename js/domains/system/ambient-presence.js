import { state } from '@core/state.js';
import { broadcastAmbientActivity } from '@core/sync.js';
import { triggerHaptic } from '@core/utils.js';

// =====================================================================
// 🌐 AMBIENT LIVE PRESENCE ENGINE
// =====================================================================

let partnerPresenceState = {
    isOnline: false,
    lastSeen: Date.now(),
    activity: '✨ Připraven/a',
    channel: 'welcome',
    batteryLevel: null,
    isCharging: false
};

let presenceHeartbeatTimer = null;
let isPresenceListenerActive = false;

const CHANNEL_ACTIVITY_MAP = {
    'dashboard': '🌻 Prohlíží Můj Den',
    'gym-tracker': '🏋️ Cvičí v posilovně',
    'watchlist': '🍿 Vybírá film v Matcheru',
    'library': '🎬 Prochází filmotéku',
    'game-draw': '🎨 Kreslí v Draw Duelu',
    'games-hub': '🕹️ V herním doupěti',
    'quiz': '🧠 Hraje kvíz o nás',
    'love-shop': '🎟️ Prohlíží Obchůdek',
    'dotek': '🫀 Na Haptic Touchpadu',
    'wrapped': '📊 Prohlíží Wrapped Stories',
    'calendar': '📅 Plánuje v Kalendáři',
    'dateplanner': '🗺️ Plánuje rande na mapě',
    'timeline': '🎞️ Prohlíží vzpomínky',
    'letters': '💌 Čte dopisy v láhvi',
    'habits': '🌿 Plní denní návyky'
};

/**
 * Gets partner's name and emoji.
 */
function getPartnerInfo() {
    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const partnerName = isJose ? 'Klárka' : 'Jožka';
    const partnerEmoji = isJose ? '🌻' : '🦁';
    return { partnerName, partnerEmoji };
}

/**
 * Reads battery info safely from navigator.getBattery().
 */
async function getBatteryInfo() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        try {
            const b = await navigator.getBattery();
            return {
                batteryLevel: Math.round(b.level * 100),
                isCharging: b.charging
            };
        } catch (e) {
            return { batteryLevel: null, isCharging: false };
        }
    }
    return { batteryLevel: null, isCharging: false };
}

/**
 * Broadcasts the current user's active channel & state to the partner.
 * @param {string} channelId
 */
export async function broadcastMyPresence(channelId) {
    const targetChannel = channelId || state.currentChannel || 'dashboard';
    const activity = CHANNEL_ACTIVITY_MAP[targetChannel] || '✨ V aplikaci';
    const battery = await getBatteryInfo();

    await broadcastAmbientActivity({
        channel: targetChannel,
        activity,
        batteryLevel: battery.batteryLevel,
        isCharging: battery.isCharging,
        isOnline: true
    });
}

/**
 * Handles incoming ambient status updates from partner.
 */
export function handleIncomingAmbientActivity(payload) {
    partnerPresenceState = {
        isOnline: true,
        lastSeen: Date.now(),
        activity: payload.activity || '✨ V aplikaci',
        channel: payload.channel || 'dashboard',
        batteryLevel: payload.batteryLevel ?? null,
        isCharging: payload.isCharging || false
    };

    updateAmbientPresenceWidgetUI();
}

/**
 * Injects or updates the Ambient Presence pill in the main header.
 */
export function updateAmbientPresenceWidgetUI() {
    let widgetEl = document.getElementById('ambient-presence-pill');
    const { partnerName, partnerEmoji } = getPartnerInfo();

    // If widget does not exist, attempt to insert into header or top of content
    if (!widgetEl) {
        const header = document.getElementById('chat-header') || document.querySelector('.channel-header') || document.querySelector('header');
        if (!header) return;

        const widgetHtml = `
            <div id="ambient-presence-pill" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition cursor-pointer select-none ml-auto group">
                <!-- Content will be injected dynamically -->
            </div>
        `;
        header.insertAdjacentHTML('beforeend', widgetHtml);
        widgetEl = document.getElementById('ambient-presence-pill');

        widgetEl?.addEventListener('click', () => {
            triggerHaptic('light');
            if (typeof window.switchChannel === 'function') {
                window.switchChannel('dotek');
            }
        });
    }

    if (!widgetEl) return;

    // Check if partner is considered online (activity within last 3 minutes)
    const isRecentlyActive = (Date.now() - partnerPresenceState.lastSeen) < (3 * 60 * 1000);
    const statusDotColor = isRecentlyActive ? 'bg-emerald-400' : 'bg-amber-400/60';

    let batteryBadge = '';
    if (partnerPresenceState.batteryLevel !== null) {
        const isLow = partnerPresenceState.batteryLevel < 20;
        const icon = partnerPresenceState.isCharging 
            ? 'fa-bolt text-yellow-400' 
            : isLow ? 'fa-battery-empty text-red-400' : 'fa-battery-half text-gray-400';
        batteryBadge = `
            <span class="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-black/20">
                <i class="fas ${icon}"></i> ${partnerPresenceState.batteryLevel}%
            </span>
        `;
    }

    widgetEl.innerHTML = `
        <div class="relative flex items-center justify-center">
            <span class="text-base transform group-hover:scale-110 transition-transform">${partnerEmoji}</span>
            <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${statusDotColor} border border-[#2f3136]"></span>
        </div>
        <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold text-white text-xs truncate">${partnerName}:</span>
            <span class="text-gray-300 text-xs truncate max-w-[140px]">${partnerPresenceState.activity}</span>
        </div>
        ${batteryBadge}
        <i class="fas fa-heart text-pink-400/80 text-[10px] ml-1 group-hover:scale-125 transition-transform"></i>
    `;
}

/**
 * Initializes Ambient Presence listeners and recurring pulse.
 */
export function setupAmbientPresence() {
    if (isPresenceListenerActive) return;

    window.addEventListener('ambient-activity-received', (e) => {
        handleIncomingAmbientActivity(e.detail);
    });

    // Send heartbeat presence every 60 seconds
    clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = setInterval(() => {
        if (state.currentUser?.id) {
            broadcastMyPresence(state.currentChannel);
        }
    }, 60000);

    isPresenceListenerActive = true;
    updateAmbientPresenceWidgetUI();
}

// Auto-initialize
setupAmbientPresence();
