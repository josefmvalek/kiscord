import { state, saveStateToCache } from '../state.js';
import { triggerHaptic } from '../utils.js';
import {
    serverDefinitions,
    getServerById,
    getServerForChannel,
    renderServersList,
    updateServerActiveStates,
    applyServerAmbientTheme,
    updateHeaderLoveCoins
} from '../servers.js';
import {
    DEFAULT_COLLAPSED_CATEGORIES,
    channelCategories,
    getChannelItemById,
    toggleCategoryCollapse,
    collapseAllCategories,
    expandAllCategories,
    toggleFavoriteChannel
} from './channel-registry.js';
import { moduleMap } from './module-loader.js';
import { updateMobileBottomNav } from './bottom-nav.js';

export const SERVER_BOTTOM_NAV_MAP = {
    'home': [
        { id: 'dashboard', name: 'Můj Den', icon: '<i class="fas fa-heart"></i>', color: '#eb459e' },
        { id: 'calendar', name: 'Kalendář', icon: '<i class="fas fa-calendar-alt"></i>', color: '#5865F2' },
        { id: 'love-shop', name: 'Obchůdek', icon: '<i class="fas fa-store"></i>', color: '#faa61a' },
        { id: 'daily-questions', name: 'Otázka', icon: '<i class="fas fa-question-circle"></i>', color: '#3ba55c' }
    ],
    'love': [
        { id: 'love-shop', name: 'Obchůdek', icon: '<i class="fas fa-store"></i>', color: '#faa61a' },
        { id: 'dateplanner', name: 'Rande', icon: '<i class="fas fa-glass-cheers"></i>', color: '#eb459e' },
        { id: 'timeline', name: 'Vzpomínky', icon: '<i class="fas fa-camera-retro"></i>', color: '#ff73fa' },
        { id: 'letters', name: 'Dopisy', icon: '<i class="fas fa-envelope-open-text"></i>', color: '#f47b67' }
    ],
    'fitness': [
        { id: 'gym-tracker', name: 'Posilovna', icon: '<i class="fas fa-dumbbell"></i>', color: '#faa61a' },
        { id: 'nutrition', name: 'Jídelníček', icon: '<i class="fas fa-utensils"></i>', color: '#57f287' },
        { id: 'sleep', name: 'Spánek', icon: '<i class="fas fa-moon"></i>', color: '#5865f2' },
        { id: 'body-metrics', name: 'Biometrie', icon: '<i class="fas fa-weight"></i>', color: '#00aff4' }
    ],
    'fit': [
        { id: 'schedule', name: 'Rozvrh', icon: '<i class="fas fa-clock"></i>', color: '#3b82f6' },
        { id: 'study-planner', name: 'WIS & Úkoly', icon: '<i class="fas fa-tasks"></i>', color: '#5865f2' },
        { id: 'dorm-hub', name: 'Kolej', icon: '<i class="fas fa-building"></i>', color: '#10b981' },
        { id: 'finance-tracker', name: 'Finance', icon: '<i class="fas fa-wallet"></i>', color: '#f59e0b' }
    ],
    'media': [
        { id: 'knihovna', name: 'Knihovna', icon: '<i class="fas fa-film"></i>', color: '#eb459e' },
        { id: 'arcade-arena', name: 'Hry', icon: '<i class="fas fa-gamepad"></i>', color: '#5865f2' },
        { id: 'puzzle', name: 'Puzzle', icon: '<i class="fas fa-puzzle-piece"></i>', color: '#faa61a' },
        { id: 'listen-together', name: 'Hudba', icon: '<i class="fas fa-headphones"></i>', color: '#1db954' }
    ],
    'archive': [
        { id: 'archive', name: 'Trezor', icon: '<i class="fas fa-archive"></i>', color: '#853ee6' },
        { id: 'brigade', name: 'Směny', icon: '<i class="fas fa-briefcase"></i>', color: '#f59e0b' },
        { id: 'restore-data', name: 'Obnova', icon: '<i class="fas fa-history"></i>', color: '#3b82f6' },
        { id: 'stats', name: 'Statistiky', icon: '<i class="fas fa-chart-pie"></i>', color: '#10b981' }
    ],
    'system': [
        { id: 'appearance', name: 'Vzhled', icon: '<i class="fas fa-palette"></i>', color: '#eb459e' },
        { id: 'notifications-center', name: 'Oznámení', icon: '<i class="fas fa-bell"></i>', color: '#faa61a' },
        { id: 'manual-guide', name: 'Návod', icon: '<i class="fas fa-book-open"></i>', color: '#57f287' },
        { id: 'changelog', name: 'Novinky', icon: '<i class="fas fa-bullhorn"></i>', color: '#5865f2' }
    ]
};

export function switchServer(serverId, targetChannelId = null, push = true) {
    const server = getServerById(serverId);
    if (!server) return;

    triggerHaptic('selection');
    import('../sound.js').then(s => s.playServerPop?.());
    console.log(`[NAV] Switching to server: ${server.id} (${server.name})`);

    state.currentServer = server.id;
    saveStateToCache();

    // 1. Update active states in server sidebar
    updateServerActiveStates(server.id);

    // 2. Apply ambient theme to DOM
    applyServerAmbientTheme(server.id);

    // 3. Re-render channels sidebar for active server
    renderChannels();
    updateMobileBottomNav(state.currentChannel);

    // 4. Open target channel ONLY if explicitly specified
    if (targetChannelId) {
        switchChannel(targetChannelId, push);
    }
}

export function renderChannels() {
    const container = document.getElementById("channels-container");
    if (!container) return;

    const currentServer = getServerById(state.currentServer || 'home');

    // Update Server Header in Channels Sidebar with custom Banner Styling
    const serverHeaderContainer = document.getElementById("server-header-container");
    const serverHeaderEl = document.getElementById("server-header-title");
    if (serverHeaderEl) {
        serverHeaderEl.innerHTML = `
            <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm opacity-90 flex-shrink-0">${currentServer.icon}</span>
                <span class="truncate text-sm font-extrabold tracking-wide">${currentServer.name}</span>
            </div>
        `;
    }
    if (serverHeaderContainer) {
        serverHeaderContainer.style.background = currentServer.gradient
            ? `linear-gradient(135deg, ${currentServer.color}33, ${currentServer.color}11)`
            : '';
        serverHeaderContainer.style.borderBottomColor = `${currentServer.color}40`;
    }

    applyServerAmbientTheme(currentServer.id);
    updateHeaderLoveCoins();

    const hidden = state.settings?.sidebar?.hiddenChannels || [];
    const order = state.settings?.sidebar?.channelOrder || [];
    const catOrder = state.settings?.sidebar?.categoryOrder || [];
    const catMap = state.settings?.sidebar?.channelCategoryMap || {};
    const collapsedCategories = Array.isArray(state.settings?.sidebar?.collapsedCategories)
        ? state.settings.sidebar.collapsedCategories
        : DEFAULT_COLLAPSED_CATEGORIES;
    const favoriteChannels = Array.isArray(state.settings?.sidebar?.favoriteChannels)
        ? state.settings.sidebar.favoriteChannels
        : ['dashboard', 'calendar', 'love-shop', 'gym-tracker'];

    // 1. Pinned Calendar Super-Channel Summary
    let todaySummary = { eventsCount: 0, summary: 'Dnes • Společný čas ✨' };
    try {
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const czMonths = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
        const formattedDate = `${now.getDate()}. ${czMonths[now.getMonth()]}`;

        const todayDeadlines = Array.isArray(state.schoolDeadlines) ? state.schoolDeadlines.filter(dl => dl && dl.deadline_date === todayKey) : [];
        const todayStudy = Array.isArray(state.studyPlannerItems) ? state.studyPlannerItems.filter(item => item && item.dueDate === todayKey && !item.completed) : [];
        const todayPlans = Array.isArray(state.customPlans) ? state.customPlans.filter(p => p && p.date_key === todayKey) : [];
        const todayDates = Array.isArray(state.plannedDates)
            ? state.plannedDates.filter(d => d && d.date_key === todayKey)
            : (state.plannedDates?.[todayKey] ? [state.plannedDates[todayKey]] : []);
        const todayShifts = Array.isArray(state.shiftsSchedule) ? state.shiftsSchedule.filter(s => s && s.date_key === todayKey) : [];
        const todayGym = Array.isArray(state.gymLogs) ? state.gymLogs.filter(g => g && g.date_key === todayKey) : [];

        const totalCount = todayDeadlines.length + todayStudy.length + todayPlans.length + todayDates.length + todayShifts.length + todayGym.length;
        
        let highlight = '';
        if (todayDeadlines.length + todayStudy.length > 0) highlight = 'zkouška/škola';
        else if (todayDates.length + todayPlans.length > 0) highlight = 'společný plán';
        else if (todayGym.length > 0) highlight = 'trénink';
        else if (todayShifts.length > 0) highlight = 'směna';

        todaySummary = {
            eventsCount: totalCount,
            summary: totalCount > 0 
                ? `Dnes: ${totalCount} ${totalCount === 1 ? 'událost' : (totalCount < 5 ? 'události' : 'událostí')}${highlight ? ` • ${highlight}` : ''}`
                : `Dnes (${formattedDate}) • Vše čisté ✨`
        };
    } catch (e) {
        console.warn('[Calendar] Quick summary count failed:', e);
    }

    const isCalendarActive = state.currentChannel === 'calendar';
    let html = "";

    if (state.currentServer === 'all') {
        if (!hidden.includes('dashboard') && !catMap['dashboard']) {
            const isActive = state.currentChannel === 'dashboard';
            html += `
                <div class="channel-link group flex items-center px-2.5 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] mb-1 mt-1 ${isActive ? 'active bg-[var(--bg-modifier-selected)] text-[var(--text-header)] font-bold' : ''}" data-channel="dashboard">
                    <div class="w-5 text-center mr-2.5 text-lg text-[#eb459e] flex items-center justify-center flex-shrink-0"><i class="fas fa-heart"></i></div>
                    <div class="flex-1 font-bold text-sm text-[var(--text-header)] truncate">Můj Den</div>
                </div>
            `;
        }
        if (!hidden.includes('calendar') && !catMap['calendar']) {
            const isActive = state.currentChannel === 'calendar';
            html += `
                <div class="channel-link group flex items-center px-2.5 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] mb-3 ${isActive ? 'active bg-[var(--bg-modifier-selected)] text-[var(--text-header)] font-bold' : ''}" data-channel="calendar">
                    <div class="w-5 text-center mr-2.5 text-lg text-[#5865F2] flex items-center justify-center flex-shrink-0"><i class="fas fa-calendar-alt"></i></div>
                    <div class="flex-1 font-bold text-sm text-[var(--text-header)] truncate">Kalendář</div>
                </div>
            `;
        }
    } else {
        // PINNED CALENDAR SUPER-CHANNEL CARD (Discord Clean Pattern)
        html += `
            <div class="px-2 pt-1 pb-1.5">
                <div class="channel-link pinned-calendar-card group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all shadow-sm active:scale-[0.98] select-none ${isCalendarActive ? 'active ring-1 ring-[var(--blurple)]' : ''}" data-channel="calendar" title="Otevřít Kalendář">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--blurple)] to-[#7289da] text-white flex items-center justify-center text-xs shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <span class="text-[13.5px] font-bold text-[var(--text-header)] truncate">Kalendář</span>
                        ${todaySummary.eventsCount > 0 ? `<span class="px-1.5 py-0.5 rounded-full bg-[var(--blurple)] text-white text-[9px] font-black tracking-tight flex-shrink-0">${todaySummary.eventsCount}</span>` : ''}
                    </div>
                    <i class="fas fa-chevron-right text-[10px] text-[var(--text-muted)] group-hover:text-white group-hover:translate-x-0.5 transition-all ml-2 flex-shrink-0 opacity-60 group-hover:opacity-100"></i>
                </div>
            </div>
        `;

        // ⭐ FAVORITES SECTION on Home server
        if (state.currentServer === 'home' && favoriteChannels.length > 0) {
            const isFavCollapsed = collapsedCategories.includes('⭐ OBLÍBENÉ');
            const favItems = favoriteChannels.map(id => getChannelItemById(id)).filter(Boolean);

            if (favItems.length > 0) {
                html += `
                    <div class="category-wrapper mt-1 mb-2 border-b border-[var(--border-subtle)] pb-2" data-category="⭐ OBLÍBENÉ">
                        <div class="category-header group flex items-center px-2.5 py-1 mx-1.5 rounded-md cursor-pointer select-none text-[var(--text-muted)] hover:text-[var(--text-header)] hover:bg-[var(--bg-modifier-hover)]/40 transition-colors ${isFavCollapsed ? 'collapsed' : ''}" data-category="⭐ OBLÍBENÉ">
                            <i class="category-chevron fas fa-chevron-down text-[10px] text-amber-400 mr-2 transition-transform duration-200 flex-shrink-0 ${isFavCollapsed ? '-rotate-90' : 'rotate-0'}"></i>
                            <span class="text-xs font-black uppercase tracking-wider truncate flex-1 text-amber-400/90">⭐ Oblíbené</span>
                        </div>
                        <div class="category-items ${isFavCollapsed ? 'collapsed' : ''}">
                            <div class="category-items-inner space-y-0.5 py-0.5">
                `;

                favItems.forEach(channel => {
                    const iconColor = channel.color ? `style="color: ${channel.color}"` : '';
                    const isActive = state.currentChannel === channel.id;

                    html += `
                        <div class="channel-link group flex items-center px-2.5 py-1.5 mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] mb-0.5 ${isActive ? 'active bg-[var(--bg-modifier-selected)] text-[var(--text-header)] font-bold' : ''}" data-channel="${channel.id}" data-keep-server="true">
                            <div class="mr-2.5 w-5 text-center text-base flex items-center justify-center flex-shrink-0" ${iconColor}>${channel.icon}</div>
                            <div class="flex-1 font-semibold text-[13px] truncate group-hover:text-[var(--text-normal)] transition-colors">${channel.name}</div>
                            <button type="button" class="channel-fav-star active p-1 text-amber-400 hover:text-amber-300 transition-transform active:scale-90" 
                                    onclick="event.stopPropagation(); window.toggleFavoriteChannel && window.toggleFavoriteChannel('${channel.id}')" 
                                    title="Odebrat z oblíbených">
                                <i class="fas fa-star text-[10px]"></i>
                            </button>
                        </div>
                    `;
                });

                html += `
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    // 3. Dynamic Server Categories
    const baseCategories = (state.currentServer === 'all')
        ? channelCategories
        : (currentServer.categories || channelCategories);

    const clonedCategories = baseCategories.map(cat => ({
        name: cat.name,
        items: [...cat.items]
    }));

    Object.entries(catMap).forEach(([channelId, targetCatName]) => {
        let foundItem = null;
        let sourceCat = null;

        clonedCategories.forEach(cat => {
            const idx = cat.items.findIndex(item => item.id === channelId);
            if (idx !== -1) {
                foundItem = cat.items[idx];
                sourceCat = cat;
                cat.items.splice(idx, 1);
            }
        });

        if (foundItem) {
            const targetCat = clonedCategories.find(cat => cat.name === targetCatName);
            if (targetCat) {
                targetCat.items.push(foundItem);
            } else if (sourceCat) {
                sourceCat.items.push(foundItem);
            }
        }
    });

    clonedCategories.sort((a, b) => {
        const indexA = catOrder.indexOf(a.name);
        const indexB = catOrder.indexOf(b.name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    clonedCategories.forEach(cat => {
        const visibleItems = cat.items.filter(item => !hidden.includes(item.id));
        if (visibleItems.length === 0) return;

        visibleItems.sort((a, b) => {
            const indexA = order.indexOf(a.id);
            const indexB = order.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        const isCollapsed = collapsedCategories.includes(cat.name);

        html += `
            <div class="category-wrapper mt-3 mb-0.5" data-category="${cat.name}">
                <div class="category-header group flex items-center px-2.5 py-1.5 mx-1.5 rounded-md cursor-pointer select-none text-[var(--text-muted)] hover:text-[var(--text-header)] hover:bg-[var(--bg-modifier-hover)]/40 transition-colors ${isCollapsed ? 'collapsed' : ''}" data-category="${cat.name}">
                    <i class="category-chevron fas fa-chevron-down text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-normal)] mr-2 transition-transform duration-200 flex-shrink-0 ${isCollapsed ? '-rotate-90' : 'rotate-0'}"></i>
                    <span class="text-xs font-bold uppercase tracking-wider truncate flex-1">${cat.name}</span>
                </div>
                <div class="category-items ${isCollapsed ? 'collapsed' : ''}">
                    <div class="category-items-inner space-y-0.5 py-0.5">
        `;

        visibleItems.forEach(channel => {
            const iconColor = channel.color ? `style="color: ${channel.color}"` : '';
            const isActive = state.currentChannel === channel.id;
            const isFav = favoriteChannels.includes(channel.id);

            html += `
                <div class="channel-link group flex items-center px-2.5 py-1.5 mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] mb-0.5 ${isActive ? 'active bg-[var(--bg-modifier-selected)] text-[var(--text-header)] font-bold' : ''}" data-channel="${channel.id}">
                    <div class="mr-2.5 w-5 text-center text-base flex items-center justify-center flex-shrink-0" ${iconColor}>${channel.icon}</div>
                    <div class="flex-1 font-semibold text-[13.5px] truncate group-hover:text-[var(--text-normal)] transition-colors">${channel.name}</div>
                    <button type="button" class="channel-fav-star ${isFav ? 'active' : ''} p-1 text-[var(--text-muted)] hover:text-amber-400 transition-transform active:scale-90" 
                            data-action="toggleFavoriteChannel" 
                            data-channel-id="${channel.id}" 
                            data-stop-propagation="true" 
                            data-haptic="light"
                            title="${isFav ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}">
                        <i class="fa${isFav ? 's' : 'r'} fa-star text-[10px]"></i>
                    </button>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

