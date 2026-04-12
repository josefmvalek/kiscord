import { state, saveStateToCache, stateEvents } from '../core/state.js';
import { changeTheme, showNotification, showConfirmDialog } from '../core/theme.js';
import { triggerHaptic, requestNotificationPermission } from '../core/utils.js';
import { signOut } from '../core/auth.js';
import { triggerNotification } from '../core/notifications.js';

export function renderSettings() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Safety fallback for missing notification settings (from older cache)
    if (!state.settings.notifications) {
        state.settings.notifications = {
            nativeEnabled: false,
            reminders: {},
            partner: {},
            system: {}
        };
    }
    if (!state.settings.notifications.reminders) state.settings.notifications.reminders = {};
    if (!state.settings.notifications.reminders.water) {
        Object.assign(state.settings.notifications.reminders, {
            water: { enabled: true, interval: 120, haptic: true, sound: false },
            pills: { enabled: true, time: '08:00', haptic: true, sound: true },
            movement: { enabled: true, time: '17:00', haptic: true, sound: false },
            bedtime: { enabled: true, time: '22:30', haptic: true, sound: false }
        });
    }
    if (!state.settings.notifications.reminders.iron) {
        Object.assign(state.settings.notifications.reminders, {
            iron: { enabled: false, time: '07:30', haptic: true, sound: true },
            zinc: { enabled: false, time: '13:00', haptic: true, sound: true },
            magnesium: { enabled: false, time: '21:00', haptic: true, sound: true }
        });
    }
    if (!state.settings.notifications.partner || !state.settings.notifications.partner.sunlight) {
        state.settings.notifications.partner = {
            sunlight: { enabled: true, haptic: true, sound: true },
            dailyQuestions: { enabled: true, haptic: true, sound: true },
            letters: { enabled: true, haptic: true, sound: true },
            confessions: { enabled: true, haptic: true, sound: true },
            mood: { enabled: true, haptic: true, sound: false }
        };
    }
    if (!state.settings.notifications.system || !state.settings.notifications.system.quests) {
        state.settings.notifications.system = {
            quests: { enabled: true, haptic: true, sound: false },
            dates: { enabled: true, haptic: true, sound: true }
        };
    }

    // 1. Render the stable shell only if it doesn't already exist
    let scrollContainer = document.getElementById("settings-scroll-container");
    if (!scrollContainer) {
        container.innerHTML = `
            <div class="flex flex-col h-full bg-[#36393f]">
                <div id="settings-scroll-container" class="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div id="settings-content-area" class="max-w-3xl mx-auto space-y-12 pb-20">
                        <!-- HEADER rendered once -->
                        <div class="space-y-2 mb-8">
                            <h1 class="text-3xl font-extrabold text-white flex items-center gap-3">
                                <i class="fas fa-cog text-[#99aab5]"></i> Nastavení
                            </h1>
                            <p class="text-[#b9bbbe]">Vylaď si Kiscord přesně tak, jak ho máš v oblibě.</p>
                        </div>
                        <div id="settings-dynamic-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 2. Render dynamic content
    const dynamicContent = document.getElementById("settings-dynamic-content");
    if (!dynamicContent) return;

    dynamicContent.innerHTML = `

                    <!-- APPEARANCE SECTION -->
                    <section class="space-y-6">
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3">
                            <i class="fas fa-palette text-[#eb459e]"></i>
                            <h2 class="text-xs font-bold text-[#8e9297] uppercase tracking-wider">Vzhled a Téma</h2>
                        </div>
                        
                        <!-- Theme Grid -->
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            ${renderThemeOption('default', 'Kiscord Dark', 'bg-[#36393f]')}
                            ${renderThemeOption('light', 'Light Mode', 'bg-white')}
                            ${renderThemeOption('valentines', 'Valentýn', 'bg-gradient-to-br from-[#ff7597] to-[#ff4d79]')}
                            ${renderThemeOption('christmas', 'Vánoce', 'bg-gradient-to-br from-red-600 to-green-700')}
                            ${renderThemeOption('tetris', 'Tetris War', 'bg-[#000000]')}
                        </div>

                        <!-- Glassmorphism Intensity -->
                        <div class="bg-[#2f3136] p-4 rounded-xl space-y-4 border border-white/5 shadow-inner">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-white font-bold">Glassmorphismus</h3>
                                    <p class="text-xs text-[#b9bbbe]">Efekt skleněného pozadí a rozostření napříč aplikací.</p>
                                </div>
                                <div class="relative inline-flex items-center cursor-pointer" onclick="window.toggleSetting('glassmorphism', this)">
                                    <div class="w-11 h-6 rounded-full transition-colors ${state.settings.glassmorphism ? 'bg-[#853ee6]' : 'bg-[#4f545c]'}"></div>
                                    <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${state.settings.glassmorphism ? 'translate-x-5' : ''}"></div>
                                </div>
                            </div>
                            
                            <div id="glass-slider-section" class="space-y-2 animate-fade-in ${state.settings.glassmorphism ? '' : 'hidden'}">
                                <div class="flex justify-between text-[10px] font-bold text-[#8e9297] uppercase">
                                    <span>Intenzita Blur (Rozostření)</span>
                                    <span id="blur-val">${state.settings.blurIntensity}px</span>
                                </div>
                                <input type="range" min="0" max="30" value="${state.settings.blurIntensity}" 
                                    class="w-full h-1.5 kiscord-slider appearance-none cursor-pointer"
                                    style="background: ${getSliderStyle(state.settings.blurIntensity, 0, 30)}"
                                    oninput="window.updateSliderLabel(this, 'system', 'blur', 0, 30)">
                            </div>
                        </div>
                    </section>

                    <!-- DASHBOARD WIDGETS -->
                    <section class="space-y-6 pt-6">
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3">
                            <i class="fas fa-th-large text-[#5865F2]"></i>
                            <h2 class="text-xs font-bold text-[#8e9297] uppercase tracking-wider">Moje Nástěnka (Widgety)</h2>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${renderWidgetToggle('health', 'Zdraví a Aktivita', 'Voda, spánek, nálada a pohyb.')}
                            ${renderWidgetToggle('supplements', 'Regenerace a Suplementy', 'Přehled braní suplementů (Železo, Zinek...).')}
                            ${renderWidgetToggle('tetris', 'Tetris Tracker', 'Tvoje skóre a soupeření s partnerem.')}
                            ${renderWidgetToggle('quests', 'Společné Questy', 'Přehled aktivních úkolů a progresu.')}
                            ${renderWidgetToggle('funfacts', 'Zajímavosti dne', 'Náhodné fakty o zvířatech a světě.')}
                        </div>
                    </section>

                    <!-- NOTIFICATIONS SECTION -->
                    <section class="space-y-6 pt-6">
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3">
                            <i class="fas fa-bell text-[#faa61a]"></i>
                            <h2 class="text-xs font-bold text-[#8e9297] uppercase tracking-wider">Notifikace a Připomínky</h2>
                        </div>

                        <div class="space-y-5">
                            <h3 class="text-[10px] font-black text-[#8e9297] uppercase tracking-[2px] mb-2 px-1">Zdraví a Rutina</h3>
                            <div class="grid grid-cols-1 gap-3">
                                ${renderNotificationCard('reminders', 'water', 'Pitný režim', 'slider')}
                                ${renderNotificationCard('reminders', 'pills', 'Léky a Vitamíny', 'multi-time')}
                                ${renderNotificationCard('reminders', 'bedtime', 'Večerka', 'time')}
                            </div>

                            <h3 class="text-[10px] font-black text-[#8e9297] uppercase tracking-[2px] mt-8 mb-2 px-1">Suplementy</h3>
                            <div class="bg-black/10 p-3 rounded-2xl border border-white/5 shadow-inner">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    ${renderNotificationCard('reminders', 'iron', 'Železo', 'time')}
                                    ${renderNotificationCard('reminders', 'zinc', 'Zinek', 'time')}
                                    ${renderNotificationCard('reminders', 'magnesium', 'Hořčík', 'time')}
                                </div>
                            </div>

                            <h3 class="text-[10px] font-black text-[#8e9297] uppercase tracking-[2px] mt-8 mb-2 px-1">Partner a Láska</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                ${renderNotificationCard('partner', 'sunlight', 'Sluníčko', 'none')}
                                ${renderNotificationCard('partner', 'dailyQuestions', 'Otázky', 'none')}
                                ${renderNotificationCard('partner', 'letters', 'Dopisy', 'none')}
                            </div>
                        </div>
                    </section>
                    
                    <!-- SYSTEM SECTION -->
                    <section class="space-y-6 pt-6">
                        <div class="flex items-center gap-3 border-b border-white/5 pb-3">
                            <i class="fas fa-terminal text-[#3ba55c]"></i>
                            <h2 class="text-xs font-bold text-[#8e9297] uppercase tracking-wider">Systém a Data</h2>
                        </div>
                        
                        <div class="space-y-3">
                            <div class="bg-[#2f3136] p-4 rounded-xl border border-white/5 flex flex-col gap-4">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1 mr-4">
                                        <h3 class="text-white font-bold text-sm">Systémová oznámení 📱</h3>
                                        <p class="text-[10px] text-[#b9bbbe]">Umožní telefonu vibrovat a svítit i na zamčené obrazovce.</p>
                                    </div>
                                    <div class="relative inline-flex items-center cursor-pointer flex-shrink-0" onclick="window.handleNativeNotifRequest(this)">
                                        <div class="w-10 h-5 rounded-full transition-colors ${state.settings.notifications.nativeEnabled ? 'bg-[#3ba55c]' : 'bg-[#4f545c]'}"></div>
                                        <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${state.settings.notifications.nativeEnabled ? 'translate-x-5' : ''}"></div>
                                    </div>
                                </div>
                                
                                <div class="flex items-center justify-between text-[10px] bg-black/20 p-2 rounded-lg border border-white/5">
                                    <span class="text-white/40 uppercase font-black">Stav prohlížeče:</span>
                                    <span id="browser-notif-status" class="font-bold">Zjišťuji...</span>
                                </div>
                            </div>
                            <div class="bg-[#2f3136] p-4 rounded-xl flex items-center justify-between border border-white/5">
                                <div>
                                    <h3 class="text-white font-bold">Doteková odezva (Haptika)</h3>
                                    <p class="text-xs text-[#b9bbbe]">Jemné vibrace při interakci (pouze na mobilu).</p>
                                </div>
                                <div class="relative inline-flex items-center cursor-pointer" onclick="window.toggleSetting('haptics', this)">
                                    <div class="w-11 h-6 rounded-full transition-colors ${state.settings.haptics ? 'bg-[#853ee6]' : 'bg-[#4f545c]'}"></div>
                                    <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${state.settings.haptics ? 'translate-x-5' : ''}"></div>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button onclick="window.confirmClearCache()" class="flex items-center gap-3 p-4 bg-[#2f3136] hover:bg-[#ed4245]/20 rounded-xl border border-white/5 transition group">
                                    <div class="w-10 h-10 rounded-lg bg-[#202225] flex items-center justify-center text-[#ed4245] group-hover:bg-[#ed4245] group-hover:text-white transition">
                                        <i class="fas fa-trash-alt"></i>
                                    </div>
                                    <div class="text-left">
                                        <div class="text-white font-bold text-sm">Vymazat mezipaměť</div>
                                        <div class="text-[10px] text-[#b9bbbe]">Resetuje lokální data a vynutí synchronizaci.</div>
                                    </div>
                                </button>
                                
                                <button onclick="window.handleSettingsSignOut()" class="flex items-center gap-3 p-4 bg-[#2f3136] hover:bg-[#202225] rounded-xl border border-white/5 transition group">
                                    <div class="w-10 h-10 rounded-lg bg-[#202225] flex items-center justify-center text-[#faa61a]">
                                        <i class="fas fa-sign-out-alt"></i>
                                    </div>
                                    <div class="text-left">
                                        <div class="text-white font-bold text-sm">Odhlásit se</div>
                                        <div class="text-[10px] text-[#b9bbbe]">Ukončí aktuální relaci na tomto zařízení.</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </section>
                    
                    <div class="pt-8 text-center">
                        <div class="text-[var(--text-muted)] text-[10px] uppercase font-black opacity-50">Kiscord v2.1.2 (BETA)</div>
                        <div class="text-[var(--text-muted)] text-[10px] mt-1 opacity-30">Vytvořeno s láskou pro tu nejlepší holku. ❤️</div>
                    </div>
    `;

    // Expose helpers globally for inline handlers
    window.toggleSetting = toggleSetting;
    window.updateBlurIntensity = updateBlurIntensity;
    window.toggleWidget = toggleWidget;
    window.toggleNotif = toggleNotif;
    window.updateNotifValue = updateNotifValue;
    window.addPillReminder = addPillReminder;
    window.removePillReminder = removePillReminder;
    window.updatePillReminder = (category, id, index, field, value) => {
        state.settings.notifications[category][id].reminders[index][field] = value;
        saveStateToCache();
    };
    window.autoSizeInput = (el) => {
        const minWidth = el.placeholder ? el.placeholder.length : 1;
        el.style.width = Math.max(minWidth, el.value.length) + 1 + "ch";
    };
    window.updateSliderLabel = (el, cat, id, min = 30, max = 360) => {
        const valEl = document.getElementById(id === 'blur' ? 'blur-val' : `val-${cat}-${id}`);
        if (valEl) valEl.textContent = id === 'blur' ? `${el.value}px` : `${el.value} min`;

        // Update track color live
        const percentage = ((el.value - min) / (max - min)) * 100;
        const color = id === 'water' ? '#00d2ff' : '#853ee6';
        el.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #202225 ${percentage}%, #202225 100%)`;

        if (id === 'blur') updateBlurIntensity(el.value);
    };

    window.previewNotification = function (category, id, btn) {
        const card = btn.closest('.notif-card');
        if (card) {
            card.classList.remove('notif-pulse');
            void card.offsetWidth; // Force reflow
            card.classList.add('notif-pulse');
        }

        btn.blur(); // Basic cleanup

        const config = state.settings.notifications[category][id];
        let message = "Testovací notifikace 🔔";

        if (id === 'water') message = "Čas se napít! 💧";
        if (id === 'pills') message = "Nezapomeň na svoje léky! 💊";
        if (id === 'bedtime') message = "Je čas jít do postýlky. 🌙";
        if (id === 'sunlight') message = "Myslím na tebe! ☀️";
        if (id === 'dailyQuestions') message = "Denní otázka byla zodpovězena! ❓";
        if (id === 'letters') message = "Dostal/a jsi nový dopis! 💌";
        if (id === 'iron') message = "Nezapomeň na železo! 🩸 (Ne s kávou!)";
        if (id === 'zinc') message = "Čas na zinek! ✨";
        if (id === 'magnesium') message = "Čas na hořčík před spaním! 🌙";

        // Call the core notification engine
        triggerNotification(category, id, message);
    };
    window.toggleNotifFeedback = toggleNotifFeedback;
    window.confirmClearCache = confirmClearCache;

    window.handleNativeNotifRequest = async (toggle) => {
        const isCurrentlyEnabled = state.settings.notifications.nativeEnabled;

        if (!isCurrentlyEnabled) {
            const granted = await requestNotificationPermission();
            if (granted) {
                state.settings.notifications.nativeEnabled = true;
                showNotification("Systémové notifikace byly povoleny! 🎉", "success");
            } else {
                showNotification("Byl zamítnut přístup k notifikacím. Zkontroluj nastavení prohlížeče.", "error");
            }
        } else {
            state.settings.notifications.nativeEnabled = false;
            showNotification("Nativní notifikace byly vypnuty.", "info");
        }

        saveStateToCache();
        renderSettings(); // Re-render to update UI
    };

    window.updateBrowserNotifStatus = () => {
        const el = document.getElementById('browser-notif-status');
        if (!el) return;

        const permission = Notification.permission;
        let text = 'Neznámý';
        let color = 'text-gray-400';

        if (permission === 'granted') { text = 'POVOLENO'; color = 'text-[#3ba55c]'; }
        else if (permission === 'denied') { text = 'ZABLOKOVÁNO'; color = 'text-[#ed4245]'; }
        else { text = 'VÝCHOZÍ (Čeká)'; color = 'text-[#faa61a]'; }

        el.textContent = text;
        el.className = `font-bold ${color}`;
    };

    // Initial status check
    setTimeout(window.updateBrowserNotifStatus, 100);

    window.handleSettingsSignOut = async () => {
        if (await showConfirmDialog("Opravdu se chceš odhlásit?")) {
            signOut();
        }
    };
}

function renderThemeOption(id, name, bgClass) {
    const isActive = state.settings.theme === id;
    return `
        <div onclick="window.updateThemeSetting('${id}')" 
            class="relative h-24 rounded-xl cursor-pointer border-2 transition-all overflow-hidden ${isActive ? 'border-[#853ee6] scale-105 shadow-lg z-10' : 'border-[#202225] hover:border-[#4f545c] opacity-80 hover:opacity-100'}">
            <div class="absolute inset-0 ${bgClass}"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                <div class="text-white font-bold text-xs truncate">${name}</div>
            </div>
            ${isActive ? '<div class="absolute top-2 right-2 w-5 h-5 bg-[#853ee6] rounded-full flex items-center justify-center text-white text-[10px] shadow-md"><i class="fas fa-check"></i></div>' : ''}
        </div>
    `;
}

function renderWidgetToggle(id, title, desc) {
    const isEnabled = state.settings.dashboardWidgets[id];
    return `
        <div class="bg-[#2f3136] p-4 rounded-xl flex items-center justify-between border border-white/5">
            <div class="flex-1 mr-4">
                <h3 class="text-white font-bold text-sm">${title}</h3>
                <p class="text-[10px] text-[#b9bbbe] line-clamp-1">${desc}</p>
            </div>
            <div class="relative inline-flex items-center cursor-pointer flex-shrink-0" onclick="window.toggleWidget('${id}', this)">
                <div class="w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-[#853ee6]' : 'bg-[#4f545c]'}"></div>
                <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-5' : ''}"></div>
            </div>
        </div>
    `;
}

function renderNotificationCard(category, id, title, inputType = 'none') {
    const config = state.settings.notifications[category][id];
    const isEnabled = config.enabled;

    // Mapping IDs to specific premium themes
    const themeClass = `notif-theme-${id}`;

    // Themed Icons for the title area
    const themeIcons = {
        water: '<i class="fas fa-droplet text-[10px] text-blue-200 animate-pulse"></i>',
        pills: '<i class="fas fa-heartbeat text-[10px] text-emerald-200 animate-pulse"></i>',
        bedtime: '<i class="fas fa-moon text-[10px] text-yellow-200 drop-shadow-[0_0_5px_rgba(253,251,202,0.5)] animate-pulse"></i>',
        sunlight: '<i class="fas fa-sun text-[10px] text-[#fcc419] drop-shadow-[0_0_8px_rgba(252,196,25,0.6)] animate-pulse"></i>',
        dailyQuestions: '<i class="fas fa-lightbulb text-[11px] text-orange-200 drop-shadow-[0_0_8px_rgba(255,144,0,0.5)] animate-pulse"></i>',
        letters: '<i class="fas fa-envelope text-[11px] text-white animate-pulse"></i>',
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
                <!-- Feedback Controls -->
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

                <!-- Value Controls -->
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

// ACTION HANDLERS

/**
 * Re-renders settings while preserving the scroll position of the inner container.
 */
function refreshSettings() {
    const scrollContainer = document.getElementById('settings-scroll-container');
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    renderSettings();

    // Restore scroll position after a slight delay to allow DOM to settle
    setTimeout(() => {
        const newContainer = document.getElementById('settings-scroll-container');
        if (newContainer) newContainer.scrollTop = scrollTop;
    }, 0);
}

window.updateThemeSetting = (theme) => {
    triggerHaptic('medium');
    state.settings.theme = theme;
    changeTheme(theme);
    saveStateToCache();
    refreshSettings();
    showNotification(`Téma změněno na ${theme.toUpperCase()}`, "success");
};

function toggleSetting(key, el) {
    triggerHaptic('light');
    state.settings[key] = !state.settings[key];

    // Smooth side effects for glassmorphism
    if (key === 'glassmorphism') {
        const sliderSection = document.getElementById('glass-slider-section');
        if (sliderSection) sliderSection.classList.toggle('hidden', !state.settings.glassmorphism);
        applyGlassEffect();
    }

    // Update switch UI
    const bg = el.querySelector('.rounded-full');
    const dot = el.querySelector('.absolute.bg-white');
    if (bg && dot) {
        if (state.settings[key]) {
            bg.classList.replace('bg-[#4f545c]', 'bg-[#853ee6]');
            dot.classList.add('translate-x-5');
        } else {
            bg.classList.replace('bg-[#853ee6]', 'bg-[#4f545c]');
            dot.classList.remove('translate-x-5');
        }
    }

    saveStateToCache();
}

function updateBlurIntensity(val) {
    state.settings.blurIntensity = parseInt(val);
    const valEl = document.getElementById('blur-val');
    if (valEl) valEl.textContent = `${val}px`;

    applyGlassEffect();
    // Debounced save
    clearTimeout(window._blurSaveTimeout);
    window._blurSaveTimeout = setTimeout(() => saveStateToCache(), 1000);
}

function toggleWidget(id, el) {
    triggerHaptic('light');
    state.settings.dashboardWidgets[id] = !state.settings.dashboardWidgets[id];

    // Update switch UI
    const bg = el.querySelector('.rounded-full');
    const dot = el.querySelector('.absolute.bg-white');
    if (bg && dot) {
        if (state.settings.dashboardWidgets[id]) {
            bg.classList.replace('bg-[#4f545c]', 'bg-[#853ee6]');
            dot.classList.add('translate-x-5');
        } else {
            bg.classList.replace('bg-[#853ee6]', 'bg-[#4f545c]');
            dot.classList.remove('translate-x-5');
        }
    }

    saveStateToCache();
    stateEvents.emit('settings_changed');
}

function toggleNotif(category, id, el) {
    triggerHaptic('light');
    const config = state.settings.notifications[category][id];
    config.enabled = !config.enabled;

    // Update switch UI
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

    // Toggle sub-controls
    const controls = el.closest('.notif-card').querySelector('.notif-controls');
    if (controls) controls.classList.toggle('hidden', !config.enabled);

    saveStateToCache();
}

function toggleNotifFeedback(category, id, type, btn) {
    triggerHaptic('light');
    const config = state.settings.notifications[category][id];
    config[type] = !config[type];

    // Update button UI
    const icon = btn.querySelector('i');
    if (icon) {
        const activeColor = type === 'haptic' ? 'text-[#853ee6]' : 'text-[#faa61a]';
        icon.classList.toggle(activeColor, config[type]);
        icon.classList.toggle('text-[#4f545c]', !config[type]);
    }

    saveStateToCache();
}

function updateNotifValue(category, id, field, value) {
    if (field === 'interval') value = parseInt(value);
    state.settings.notifications[category][id][field] = value;
    saveStateToCache();
    // No full refresh needed, value is updated live in the DOM via updateSliderLabel or time change
}

function addPillReminder(category, id) {
    const timeInput = document.getElementById(`pill-time-${id}`);
    const labelInput = document.getElementById(`pill-label-${id}`);

    if (!timeInput || !timeInput.value) return;

    const time = timeInput.value;
    const label = labelInput ? labelInput.value || 'Léky' : 'Léky';

    const reminders = state.settings.notifications[category][id].reminders;
    reminders.push({ time, label });
    reminders.sort((a, b) => a.time.localeCompare(b.time));

    saveStateToCache();
    refreshSettings();
}

function removePillReminder(category, id, index) {
    state.settings.notifications[category][id].reminders.splice(index, 1);
    saveStateToCache();
    refreshSettings();
}

function getSliderStyle(val, min, max, color = '#853ee6') {
    const percentage = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #202225 ${percentage}%, #202225 100%)`;
}

function applyGlassEffect() {
    const root = document.documentElement;
    if (state.settings.glassmorphism) {
        root.style.setProperty('--glass-blur', `${state.settings.blurIntensity}px`);
        root.style.setProperty('--glass-opacity', '0.1');
    } else {
        root.style.setProperty('--glass-blur', '0px');
        root.style.setProperty('--glass-opacity', '1');
    }
}

async function confirmClearCache() {
    if (await showConfirmDialog("Smazat uživatelská data a mezipaměť? Restartuje se celá aplikace.", "Ano, smazat", "Zrušit")) {
        triggerHaptic('heavy');
        localStorage.clear();
        window.location.reload();
    }
}
