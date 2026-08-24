import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic, requestNotificationPermission } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { triggerNotification, initPushSubscription } from '@core/notifications.js';
import { getSliderStyle } from './appearance.js';

export function renderNotificationCard(category, id, title, inputType = 'none') {
    const config = state.settings.notifications[category][id];
    const isEnabled = config.enabled;
    const themeClass = `notif-theme-${id}`;

    const themeIcons = {
        water: '<i class="fas fa-droplet text-[10px] text-blue-200 animate-pulse"></i>',
        pills: '<i class="fas fa-heartbeat text-[10px] text-emerald-200 animate-pulse"></i>',
        bedtime: '<i class="fas fa-moon text-[10px] text-yellow-200 drop-shadow-[0_0_5px_rgba(253,251,202,0.5)] animate-pulse"></i>',
        sunlight: '<i class="fas fa-sun text-[10px] text-[#fcc419] drop-shadow-[0_0_8px_rgba(252,196,25,0.6)] animate-pulse"></i>',
        dailyQuestions: '<i class="fas fa-lightbulb text-[11px] text-orange-200 drop-shadow-[0_0_8px_rgba(255,144,0,0.5)] animate-pulse"></i>',
        letters: '<i class="fas fa-envelope text-[11px] text-white animate-pulse"></i>',
        planning: '<i class="fas fa-calendar-alt text-[10px] text-pink-300 animate-pulse"></i>',
        mood: '<i class="fas fa-heart text-[10px] text-red-400 animate-pulse"></i>',
        sleep: '<i class="fas fa-moon text-[10px] text-indigo-300 animate-pulse"></i>',
        iron: '<i class="fas fa-tint text-[10px] text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)] animate-pulse"></i>',
        zinc: '<i class="fas fa-star text-[10px] text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)] animate-pulse"></i>',
        magnesium: '<i class="fas fa-moon text-[10px] text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)] animate-pulse"></i>'
    };

    const secondaryIcon = themeIcons[id] || '';

    return `
        <div class="p-4 rounded-xl border border-white/5 space-y-4 notif-card transition-all ${themeClass}">
            <div class="flex items-center justify-between relative z-10">
                <div class="flex-1 mr-4">
                    <div class="flex items-center gap-2">
                        <h3 class="font-bold text-lg text-white">${title}</h3>
                        ${secondaryIcon}
                    </div>
                </div>
                <div class="relative inline-flex items-center cursor-pointer flex-shrink-0" onclick="window.toggleNotif('${category}', '${id}', this)">
                    <div class="w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-[#853ee6]' : 'bg-black/40'}"></div>
                    <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-5' : ''}"></div>
                </div>
            </div>
            
            <div class="notif-controls flex flex-wrap gap-4 items-center pt-2 border-t border-white/10 relative z-10 ${isEnabled ? '' : 'hidden'}">
                <div class="flex gap-2">
                    <button onclick="window.toggleNotifFeedback('${category}', '${id}', 'haptic', this)" 
                            title="Haptika (Vibrace)"
                            class="w-8 h-8 rounded-lg flex items-center justify-center transition bg-black/20 border border-white/5 hover:border-white/10">
                        <i class="fas fa-mobile-screen-button text-xs transition-colors ${config.haptic ? 'text-[#853ee6]' : 'text-white/40'}"></i>
                    </button>
                    <button onclick="window.previewNotification('${category}', '${id}', this)" 
                            title="Vyzkoušet notifikaci"
                            class="w-8 h-8 rounded-lg flex items-center justify-center transition bg-black/20 border border-white/5 test-notif-btn">
                        <i class="fas fa-play text-[10px] text-white/60"></i>
                    </button>
                </div>

                ${inputType === 'time' ? `
                    <div class="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                        <i class="fas fa-clock text-[10px] text-white/40"></i>
                        <input type="time" value="${config.time}" 
                               onchange="window.updateNotifValue('${category}', '${id}', 'time', this.value)"
                               class="bg-transparent text-white text-xs outline-none cursor-pointer">
                    </div>
                ` : ''}

                ${inputType === 'multi-time' ? `
                    <div class="flex flex-wrap items-center gap-2 w-full">
                        ${(config.reminders || []).map((r, idx) => `
                            <div class="flex items-center gap-1.5 bg-black/20 px-2 py-1.5 rounded-lg border border-white/10 group animate-slide-in">
                                <input type="time" value="${r.time}" 
                                       onchange="window.updatePillReminder('${category}', '${id}', ${idx}, 'time', this.value)"
                                       class="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer">
                                <input type="text" value="${r.label}" 
                                       oninput="window.updatePillReminder('${category}', '${id}', ${idx}, 'label', this.value); window.autoSizeInput(this)"
                                       style="width: ${Math.max(1, r.label.length) + 1}ch"
                                       class="bg-transparent text-white/70 text-[10px] font-medium border-l border-white/10 pl-2 outline-none transition-all">
                                <button onclick="window.removePillReminder('${category}', '${id}', ${idx})" 
                                        class="text-red-400 opacity-40 hover:opacity-100 transition pl-1">
                                    <i class="fas fa-times text-[10px]"></i>
                                </button>
                            </div>
                        `).join('')}
                        <div class="flex items-center gap-2 bg-black/10 px-2 py-1.5 rounded-lg border border-dashed border-white/10 hover:border-white/20 transition-all cursor-pointer">
                            <input type="time" id="pill-time-${id}" class="bg-transparent text-white text-[10px] outline-none cursor-pointer">
                            <input type="text" id="pill-label-${id}" placeholder="Přidat lék..." 
                                   oninput="window.autoSizeInput(this)"
                                   style="width: 10ch"
                                   class="bg-transparent text-white/40 text-[10px] outline-none border-l border-white/10 pl-2 transition-all">
                            <button onclick="window.addPillReminder('${category}', '${id}')" class="text-white/60 hover:text-white hover:scale-110 transition">
                                <i class="fas fa-plus text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                ` : ''}

                ${inputType === 'slider' ? `
                    <div class="flex-1 min-w-[150px] space-y-1">
                        <div class="flex justify-between text-[8px] font-black text-white/40 uppercase tracking-widest">
                            <span>Interval</span>
                            <span id="val-${category}-${id}" class="text-white/80">${config.interval} min</span>
                        </div>
                        <input type="range" min="30" max="360" step="30" value="${config.interval}" 
                               oninput="window.updateSliderLabel(this, '${category}', '${id}', 30, 360)"
                               onchange="window.updateNotifValue('${category}', '${id}', 'interval', this.value)"
                               style="background: ${getSliderStyle(config.interval, 30, 360, id === 'water' ? '#00d2ff' : '#853ee6')}"
                               class="w-full h-1 kiscord-slider ${id === 'water' ? 'water-slider' : ''} appearance-none cursor-pointer">
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

export function toggleNotif(category, id, el) {
    triggerHaptic('light');
    const config = state.settings.notifications[category][id];
    config.enabled = !config.enabled;

    const bg = el.querySelector('.rounded-full');
    const dot = el.querySelector('.absolute.bg-white');
    if (bg && dot) {
        if (config.enabled) {
            bg.classList.replace('bg-[#4f545c]', 'bg-[#853ee6]');
            dot.classList.add('translate-x-5');
        } else {
            bg.classList.replace('bg-[#853ee6]', 'bg-[#4f545c]');
            dot.classList.remove('translate-x-5');
        }
    }

    const controls = el.closest('.notif-card').querySelector('.notif-controls');
    if (controls) controls.classList.toggle('hidden', !config.enabled);

    saveStateToCache();
}

export function toggleNotifFeedback(category, id, type, btn) {
    triggerHaptic('light');
    const config = state.settings.notifications[category][id];
    config[type] = !config[type];

    const icon = btn.querySelector('i');
    if (icon) {
        const activeColor = type === 'haptic' ? 'text-[#853ee6]' : 'text-[#faa61a]';
        icon.classList.toggle(activeColor, config[type]);
        icon.classList.toggle('text-[#4f545c]', !config[type]);
    }

    saveStateToCache();
}

export function updateNotifValue(category, id, field, value) {
    if (field === 'interval') value = parseInt(value);
    state.settings.notifications[category][id][field] = value;
    saveStateToCache();
}

export function addPillReminder(category, id, refreshFn) {
    const timeInput = document.getElementById(`pill-time-${id}`);
    const labelInput = document.getElementById(`pill-label-${id}`);

    if (!timeInput || !timeInput.value) return;

    const time = timeInput.value;
    const label = labelInput ? labelInput.value || 'Léky' : 'Léky';

    const reminders = state.settings.notifications[category][id].reminders;
    reminders.push({ time, label });
    reminders.sort((a, b) => a.time.localeCompare(b.time));

    saveStateToCache();
    if (refreshFn) refreshFn();
}

export function removePillReminder(category, id, index, refreshFn) {
    state.settings.notifications[category][id].reminders.splice(index, 1);
    saveStateToCache();
    if (refreshFn) refreshFn();
}

export async function handleNativeNotifRequest(toggle, refreshFn) {
    const isCurrentlyEnabled = state.settings.notifications.nativeEnabled;

    if (!isCurrentlyEnabled) {
        const granted = await requestNotificationPermission();
        if (granted) {
            state.settings.notifications.nativeEnabled = true;
            await initPushSubscription();
            showNotification("Systémové notifikace byly povoleny! 🎉", "success");
        } else {
            showNotification("Byl zamítnut přístup k notifikacím. Zkontroluj nastavení prohlížeče.", "error");
        }
    } else {
        state.settings.notifications.nativeEnabled = false;
        showNotification("Nativní notifikace byly vypnuty.", "info");
    }

    saveStateToCache();
    if (refreshFn) refreshFn();
}
