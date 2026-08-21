import { state, saveStateToCache } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { triggerNotification } from '../../core/notifications.js';
import { renderChannels } from '../../core/router.js';

import { 
    renderThemeOption, 
    updateThemeSetting, 
    toggleSetting, 
    updateBlurIntensity, 
    getSliderStyle 
} from './appearance.js';

import { 
    renderWidgetToggle, 
    toggleWidget 
} from './widgets.js';

import { 
    renderNotificationCard, 
    toggleNotif, 
    toggleNotifFeedback, 
    updateNotifValue, 
    addPillReminder, 
    removePillReminder, 
    handleNativeNotifRequest 
} from './notifications.js';

import { 
    renderAllChannelsTogglesGrouped, 
    renderDraggableChannelsListGrouped, 
    renderDraggableCategoriesList, 
    toggleChannelVisibility, 
    resetSidebarLayout 
} from './sidebar.js';

import { 
    confirmClearCache, 
    handleSettingsSignOut, 
    migrateManualMoviesToTMDB 
} from './dataManager.js';

export function renderSettings() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Safety fallback for missing notification settings
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
    if (!state.settings.notifications.partner || !state.settings.notifications.partner.planning || !state.settings.notifications.partner.mood) {
        state.settings.notifications.partner = {
            ...state.settings.notifications.partner,
            sunlight: state.settings.notifications.partner?.sunlight || { enabled: true, haptic: true, sound: true },
            dailyQuestions: state.settings.notifications.partner?.dailyQuestions || { enabled: true, haptic: true, sound: true },
            letters: state.settings.notifications.partner?.letters || { enabled: true, haptic: true, sound: true },
            planning: state.settings.notifications.partner?.planning || { enabled: true, haptic: true, sound: true },
            mood: { enabled: true, haptic: true, sound: true },
            sleep: { enabled: true, haptic: true, sound: true }
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
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                ${renderThemeOption('default', 'Kiscord Dark', 'bg-[#36393f]')}
                ${renderThemeOption('light', 'Light Mode', 'bg-white')}
                ${renderThemeOption('valentines', 'Valentýn', 'bg-gradient-to-br from-[#ff7597] to-[#ff4d79]')}
                ${renderThemeOption('christmas', 'Vánoce', 'bg-gradient-to-br from-red-600 to-green-700')}
                ${renderThemeOption('tetris', 'Tetris War', 'bg-[#000000]')}
                ${renderThemeOption('forest', 'Lesní ticho 🌲', 'bg-gradient-to-br from-[#2d4a2d] to-[#1a2a1a]')}
                ${renderThemeOption('gold', 'Zlatý věk 👑', 'bg-gradient-to-br from-[#d4af37] to-[#1a160d]')}
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
                ${renderWidgetToggle('health', 'Zdraví a Aktivita 💧', 'Voda, spánek, nálada a pohyb.')}
                ${renderWidgetToggle('supplements', 'Regenerace a Suplementy 💊', 'Přehled braní suplementů (Hořčík, Zinek, Železo...).')}
                ${renderWidgetToggle('schoolDorm', 'VUT FIT & Koleje Live 🎓', 'Dnešní výuka, společná okénka a odpočet pračky.')}
                ${renderWidgetToggle('dailyQuestion', 'Dnešní otázka ❓', 'Naše každodenní společná otázka pro oba.')}
                ${renderWidgetToggle('loveShop', 'Vztahový Rituál & Tržnice ❤️', 'Level vztahu, konto mincí a rychlý stav Spížky.')}
                ${renderWidgetToggle('tetris', 'Tetris Tracker 🕹️', 'Tvoje skóre a soupeření s partnerem.')}
                ${renderWidgetToggle('quests', 'Společné Questy 🛡️', 'Přehled aktivních úkolů a progresu.')}
                ${renderWidgetToggle('funfacts', 'Zajímavosti dne ✨', 'Náhodné fakty o zvířatech a světě.')}
            </div>
        </section>

        <!-- SIDEBAR CUSTOMIZATION SECTION -->
        <section class="space-y-6 pt-6 animate-fade-in">
            <div class="flex items-center gap-3 border-b border-white/5 pb-3">
                <i class="fas fa-bars text-[#853ee6]"></i>
                <h2 class="text-xs font-bold text-[#8e9297] uppercase tracking-wider">Uspořádání bočního panelu</h2>
            </div>
            
            <div class="bg-[#2f3136] p-4 rounded-xl border border-white/5 space-y-4 shadow-inner">
                <div class="flex border-b border-white/5 pb-2">
                    <button onclick="window.setSidebarSettingsTab('toggle')" id="sidebar-tab-toggle" 
                        class="flex-1 py-1.5 text-xs font-extrabold tracking-wider uppercase text-center text-white border-b-2 border-[#853ee6] transition-all">
                        👁️ Zobrazit / Skrýt
                    </button>
                    <button onclick="window.setSidebarSettingsTab('sort')" id="sidebar-tab-sort" 
                        class="flex-1 py-1.5 text-xs font-extrabold tracking-wider uppercase text-center text-gray-400 hover:text-white border-b-2 border-transparent transition-all">
                        🧩 Řazení kanálů
                    </button>
                    <button onclick="window.setSidebarSettingsTab('categories')" id="sidebar-tab-categories" 
                        class="flex-1 py-1.5 text-xs font-extrabold tracking-wider uppercase text-center text-gray-400 hover:text-white border-b-2 border-transparent transition-all">
                        📂 Řazení sekcí
                    </button>
                </div>
                
                <div id="sidebar-content-toggle" class="space-y-4">
                    <p class="text-[10px] font-bold text-[#8e9297] uppercase tracking-wider leading-relaxed">Zvolte kanály, které chcete vidět v bočním panelu:</p>
                    <div class="space-y-5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        ${renderAllChannelsTogglesGrouped()}
                    </div>
                </div>
                
                <div id="sidebar-content-sort" class="hidden space-y-4">
                    <p class="text-[10px] font-bold text-[#8e9297] uppercase tracking-wider leading-relaxed">Přetažením karet nahoru nebo dolů si přizpůsobte pořadí kanálů:</p>
                    <div class="space-y-5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        ${renderDraggableChannelsListGrouped()}
                    </div>
                </div>

                <div id="sidebar-content-categories" class="hidden space-y-4">
                    <p class="text-[10px] font-bold text-[#8e9297] uppercase tracking-wider leading-relaxed">Přetažením sekcí si přizpůsobte pořadí celých kategorií v panelu:</p>
                    <div id="sortable-categories-list" class="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        ${renderDraggableCategoriesList()}
                    </div>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-white/5 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <button onclick="window.expandAllCategories(); window.showNotification && window.showNotification('Všechny sekce rozbaleny! 📂', 'info')" 
                            class="px-3 py-1.5 bg-[#202225] hover:bg-gray-800 text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-700/50 hover:border-gray-600 transition-all flex items-center gap-1.5 active:scale-95">
                            <i class="fas fa-folder-open text-[9px] text-[#5865F2]"></i> <span>Rozbalit vše</span>
                        </button>
                        <button onclick="window.collapseAllCategories(); window.showNotification && window.showNotification('Všechny sekce sbaleny! 📁', 'info')" 
                            class="px-3 py-1.5 bg-[#202225] hover:bg-gray-800 text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-700/50 hover:border-gray-600 transition-all flex items-center gap-1.5 active:scale-95">
                            <i class="fas fa-folder text-[9px] text-[#eb459e]"></i> <span>Sbalit vše</span>
                        </button>
                    </div>
                    <button onclick="window.resetSidebarLayout()" 
                        class="px-3 py-1.5 bg-[#202225] hover:bg-gray-800 text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-700/50 hover:border-gray-600 transition-all flex items-center gap-1.5 active:scale-95">
                        <i class="fas fa-undo text-[9px]"></i> <span>Obnovit výchozí</span>
                    </button>
                </div>
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
                    ${renderNotificationCard('partner', 'planning', 'Plánování', 'none')}
                    ${renderNotificationCard('partner', 'dailyQuestions', 'Otázky', 'none')}
                    ${renderNotificationCard('partner', 'letters', 'Dopisy', 'none')}
                    ${renderNotificationCard('partner', 'mood', 'Podpora nálady', 'none')}
                    ${renderNotificationCard('partner', 'sleep', 'Uspávání', 'none')}
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

                <div class="bg-[#2f3136] p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div>
                        <h3 class="text-white font-bold">Zvukové efekty 🎵</h3>
                        <p class="text-xs text-[#b9bbbe]">Jemné a hravé zvuky při interakci a úspěších.</p>
                    </div>
                    <div class="relative inline-flex items-center cursor-pointer" onclick="window.toggleSetting('soundEnabled', this)">
                        <div class="w-11 h-6 rounded-full transition-colors ${state.settings.soundEnabled ? 'bg-[#853ee6]' : 'bg-[#4f545c]'}"></div>
                        <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${state.settings.soundEnabled ? 'translate-x-5' : ''}"></div>
                    </div>
                </div>

                <button onclick="window.migrateManualMoviesToTMDB()" class="w-full flex items-center gap-3 p-4 bg-[#2f3136] hover:bg-[#5865F2]/20 rounded-xl border border-white/5 transition group text-left">
                    <div class="w-10 h-10 rounded-lg bg-[#202225] flex items-center justify-center text-[#5865F2] group-hover:bg-[#5865F2] group-hover:text-white transition flex-shrink-0">
                        <i class="fas fa-magic animate-pulse"></i>
                    </div>
                    <div>
                        <div class="text-white font-bold text-sm">Hromadná TMDB synchronizace 🪄</div>
                        <div class="text-[10px] text-[#b9bbbe]">Vyhledá ruční filmy na TMDB, stáhne k nim hodnocení, plakáty, délku a automaticky je roztřídí, přičemž zachová torrent a Google Drive odkazy!</div>
                    </div>
                </button>

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

    // Global bindings for inline DOM handlers
    window.toggleSetting = toggleSetting;
    window.updateBlurIntensity = updateBlurIntensity;
    window.updateThemeSetting = (theme) => updateThemeSetting(theme, refreshSettings);
    window.toggleWidget = toggleWidget;
    window.toggleNotif = toggleNotif;
    window.toggleNotifFeedback = toggleNotifFeedback;
    window.updateNotifValue = updateNotifValue;
    window.addPillReminder = (cat, id) => addPillReminder(cat, id, refreshSettings);
    window.removePillReminder = (cat, id, idx) => removePillReminder(cat, id, idx, refreshSettings);
    window.handleNativeNotifRequest = (toggle) => handleNativeNotifRequest(toggle, renderSettings);
    window.confirmClearCache = confirmClearCache;
    window.handleSettingsSignOut = handleSettingsSignOut;
    window.migrateManualMoviesToTMDB = migrateManualMoviesToTMDB;
    window.toggleChannelVisibility = (id, el) => toggleChannelVisibility(id, el, refreshSettings);
    window.resetSidebarLayout = () => resetSidebarLayout(refreshSettings);

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

        const percentage = ((el.value - min) / (max - min)) * 100;
        const color = id === 'water' ? '#00d2ff' : '#853ee6';
        el.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #202225 ${percentage}%, #202225 100%)`;

        if (id === 'blur') updateBlurIntensity(el.value);
    };

    window.previewNotification = function (category, id, btn) {
        const card = btn.closest('.notif-card');
        if (card) {
            card.classList.remove('notif-pulse');
            void card.offsetWidth;
            card.classList.add('notif-pulse');
        }

        btn.blur();

        let message = "Testovací notifikace 🔔";
        if (id === 'water') message = "Čas se napít! 💧";
        if (id === 'pills') message = "Nezapomeň na svoje léky! 💊";
        if (id === 'bedtime') message = "Je čas jít do postýlky. 🌙";
        if (id === 'sunlight') message = "Myslím na tebe! ☀️";
        if (id === 'dailyQuestions') message = "Denní otázka byla zodpovězena! ❓";
        if (id === 'letters') message = "Dostal/a jsi nový dopis! 💌";
        if (id === 'planning') message = "Nová pozvánka na rande! 🥂";
        if (id === 'iron') message = "Nezapomeň na železo! 🩸 (Ne s kávou!)";
        if (id === 'zinc') message = "Čas na zinek! ✨";
        if (id === 'magnesium') message = "Čas na hořčík před spaním! 🌙";

        triggerNotification(category, id, message);
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

    setTimeout(window.updateBrowserNotifStatus, 100);

    // Initialize SortableJS
    setTimeout(() => {
        const sortContainers = document.querySelectorAll('.sortable-category-list');
        if (sortContainers.length > 0 && typeof Sortable !== 'undefined') {
            sortContainers.forEach(container => {
                new Sortable(container, {
                    group: 'channels',
                    animation: 150,
                    onEnd: function(evt) {
                        const targetCategoryName = evt.to.getAttribute('data-category');
                        const channelId = evt.item.getAttribute('data-id');
                        
                        if (targetCategoryName && channelId) {
                            if (!state.settings.sidebar.channelCategoryMap) {
                                state.settings.sidebar.channelCategoryMap = {};
                            }
                            if (targetCategoryName === 'main') {
                                delete state.settings.sidebar.channelCategoryMap[channelId];
                            } else {
                                state.settings.sidebar.channelCategoryMap[channelId] = targetCategoryName;
                            }
                        }

                        const allCards = document.querySelectorAll('.sortable-category-list [data-id]');
                        const newOrder = Array.from(allCards).map(card => card.getAttribute('data-id'));
                        
                        state.settings.sidebar.channelOrder = newOrder;
                        saveStateToCache();
                        renderChannels();
                    }
                });
            });
        }

        const catContainer = document.getElementById('sortable-categories-list');
        if (catContainer && typeof Sortable !== 'undefined') {
            new Sortable(catContainer, {
                animation: 150,
                onEnd: function() {
                    const cards = catContainer.querySelectorAll('[data-name]');
                    const newCatOrder = Array.from(cards).map(card => card.getAttribute('data-name'));
                    
                    state.settings.sidebar.categoryOrder = newCatOrder;
                    saveStateToCache();
                    renderChannels();
                }
            });
        }
    }, 150);

    window.setSidebarSettingsTab = (tab) => {
        triggerHaptic('light');
        const toggleBtn = document.getElementById('sidebar-tab-toggle');
        const sortBtn = document.getElementById('sidebar-tab-sort');
        const catBtn = document.getElementById('sidebar-tab-categories');
        const toggleContent = document.getElementById('sidebar-content-toggle');
        const sortContent = document.getElementById('sidebar-content-sort');
        const catContent = document.getElementById('sidebar-content-categories');
        
        [toggleBtn, sortBtn, catBtn].forEach(btn => {
            btn?.classList.remove('border-[#853ee6]', 'text-white');
            btn?.classList.add('border-transparent', 'text-gray-400');
        });
        
        [toggleContent, sortContent, catContent].forEach(content => {
            content?.classList.add('hidden');
        });
        
        if (tab === 'toggle') {
            toggleBtn?.classList.add('border-[#853ee6]', 'text-white');
            toggleBtn?.classList.remove('border-transparent', 'text-gray-400');
            toggleContent?.classList.remove('hidden');
        } else if (tab === 'sort') {
            sortBtn?.classList.add('border-[#853ee6]', 'text-white');
            sortBtn?.classList.remove('border-transparent', 'text-gray-400');
            sortContent?.classList.remove('hidden');
        } else if (tab === 'categories') {
            catBtn?.classList.add('border-[#853ee6]', 'text-white');
            catBtn?.classList.remove('border-transparent', 'text-gray-400');
            catContent?.classList.remove('hidden');
        }
    };
}

export function refreshSettings() {
    const scrollContainer = document.getElementById('settings-scroll-container');
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    renderSettings();

    setTimeout(() => {
        const newContainer = document.getElementById('settings-scroll-container');
        if (newContainer) newContainer.scrollTop = scrollTop;
    }, 0);
}
