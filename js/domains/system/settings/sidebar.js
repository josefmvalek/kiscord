import { state, saveStateToCache } from '@core/state.js';
import { channelCategories, renderChannels } from '@core/router.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';

export function cleanTitle(title) {
    if (!title) return '';
    return title.replace(/^[\s\p{Emoji}]+/u, '').trim();
}

export function renderChannelToggle(id, name, iconHtml) {
    const hidden = state.settings.sidebar?.hiddenChannels || [];
    const isVisible = !hidden.includes(id);
    
    return `
        <div class="bg-[#202225] p-3.5 rounded-xl border border-white/5 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-2 min-w-0">
                <span class="w-5 text-center flex items-center justify-center flex-shrink-0 text-sm">${iconHtml}</span>
                <span class="text-white text-xs font-extrabold truncate uppercase tracking-wider">${cleanTitle(name)}</span>
            </div>
            <div class="relative inline-flex items-center cursor-pointer flex-shrink-0" onclick="window.toggleChannelVisibility('${id}', this)">
                <div class="w-9 h-5 rounded-full transition-colors ${isVisible ? 'bg-[#3ba55c]' : 'bg-[#4f545c]'}"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isVisible ? 'translate-x-4' : ''}"></div>
            </div>
        </div>
    `;
}

export function renderAllChannelsTogglesGrouped() {
    let html = "";
    
    // 1. Render Hlavní Kanály
    html += `
        <div class="space-y-2.5">
            <div class="text-[10px] font-black text-[#eb459e] uppercase tracking-[1.5px] border-b border-white/5 pb-1 flex items-center gap-1.5">
                <i class="fas fa-star text-[9px]"></i> <span>Hlavní Kanály</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                ${renderChannelToggle('dashboard', 'Můj Den', '<i class="fas fa-heart text-[#eb459e]"></i>')}
                ${renderChannelToggle('calendar', 'Kalendář', '<i class="fas fa-calendar-alt text-[#5865F2]"></i>')}
            </div>
        </div>
    `;

    // 2. Render rest of categories
    channelCategories.forEach(cat => {
        html += `
            <div class="space-y-2.5 mt-5">
                <div class="text-[10px] font-black text-gray-400 uppercase tracking-[1.5px] border-b border-white/5 pb-1 flex items-center gap-1.5">
                    <i class="fas fa-folder-open text-[9px] text-gray-500"></i> <span>${cat.name}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    ${cat.items.map(item => renderChannelToggle(item.id, item.name, item.icon)).join('')}
                </div>
            </div>
        `;
    });
    
    return html;
}

export function renderDraggableItemHtml(item) {
    return `
        <div class="bg-[#202225] p-3 rounded-xl border border-white/5 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-gray-800/40 transition-all select-none shadow-sm" data-id="${item.id}">
            <div class="flex items-center gap-3 min-w-0">
                <span class="text-white/30 text-xs flex-shrink-0 cursor-grab"><i class="fas fa-grip-vertical"></i></span>
                <span class="w-5 text-center flex items-center justify-center flex-shrink-0 text-sm">${item.icon}</span>
                <span class="text-white text-xs font-black uppercase tracking-wider truncate">${cleanTitle(item.name || item.title)}</span>
            </div>
            <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest flex-shrink-0"><i class="fas fa-arrows-alt-v mr-1"></i> Přetáhnout</div>
        </div>
    `;
}

export function renderDraggableChannelsListGrouped() {
    const hidden = state.settings.sidebar?.hiddenChannels || [];
    const order = state.settings.sidebar?.channelOrder || [];
    const catMap = state.settings.sidebar?.channelCategoryMap || {};

    const mainChannelDefinitions = {
        dashboard: { id: 'dashboard', name: 'Můj Den', icon: '<i class="fas fa-heart text-[#eb459e]"></i>' },
        calendar: { id: 'calendar', name: 'Kalendář', icon: '<i class="fas fa-calendar-alt text-[#5865F2]"></i>' }
    };
    
    let html = "";
    
    const mainItems = [];
    if (!hidden.includes('dashboard') && !catMap['dashboard']) {
        mainItems.push(mainChannelDefinitions.dashboard);
    }
    if (!hidden.includes('calendar') && !catMap['calendar']) {
        mainItems.push(mainChannelDefinitions.calendar);
    }
    
    if (mainItems.length > 0) {
        mainItems.sort((a, b) => {
            const indexA = order.indexOf(a.id);
            const indexB = order.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        html += `
            <div class="space-y-2.5">
                <div class="text-[10px] font-black text-[#eb459e] uppercase tracking-[1.5px] border-b border-white/5 pb-1 flex items-center gap-1.5">
                    <i class="fas fa-star text-[9px]"></i> <span>Hlavní Kanály</span>
                </div>
                <div class="sortable-category-list space-y-2" data-category="main">
                    ${mainItems.map(item => renderDraggableItemHtml(item)).join('')}
                </div>
            </div>
        `;
    }

    const clonedCategories = channelCategories.map(cat => ({
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

        if (!foundItem && mainChannelDefinitions[channelId]) {
            foundItem = mainChannelDefinitions[channelId];
        }

        if (foundItem) {
            const targetCat = clonedCategories.find(cat => cat.name === targetCatName);
            if (targetCat) {
                targetCat.items.push(foundItem);
            } else if (sourceCat) {
                sourceCat.items.push(foundItem);
            }
        }
    });

    const catOrder = state.settings.sidebar?.categoryOrder || [];
    const sortedCats = [...clonedCategories];
    sortedCats.sort((a, b) => {
        const indexA = catOrder.indexOf(a.name);
        const indexB = catOrder.indexOf(b.name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    sortedCats.forEach(cat => {
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

        html += `
            <div class="space-y-2.5 mt-5">
                <div class="text-[10px] font-black text-gray-400 uppercase tracking-[1.5px] border-b border-white/5 pb-1 flex items-center gap-1.5">
                    <i class="fas fa-folder-open text-[9px] text-gray-500"></i> <span>${cat.name}</span>
                </div>
                <div class="sortable-category-list space-y-2" data-category="${cat.name}">
                    ${visibleItems.map(item => renderDraggableItemHtml(item)).join('')}
                </div>
            </div>
        `;
    });
    
    return html;
}

export function renderDraggableCategoriesList() {
    const catOrder = state.settings.sidebar?.categoryOrder || [];
    const sortedCats = [...channelCategories];
    
    sortedCats.sort((a, b) => {
        const indexA = catOrder.indexOf(a.name);
        const indexB = catOrder.indexOf(b.name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return sortedCats.map(cat => `
        <div class="bg-[#202225] p-3.5 rounded-xl border border-white/5 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-gray-800/40 transition-all select-none shadow-sm animate-fade-in" data-name="${cat.name}">
            <div class="flex items-center gap-3 min-w-0">
                <span class="text-white/30 text-xs flex-shrink-0 cursor-grab"><i class="fas fa-grip-vertical"></i></span>
                <span class="w-5 text-center flex items-center justify-center flex-shrink-0 text-sm text-gray-500"><i class="fas fa-folder-open text-xs"></i></span>
                <span class="text-white text-xs font-black uppercase tracking-wider truncate">${cat.name}</span>
            </div>
            <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest flex-shrink-0"><i class="fas fa-arrows-alt-v mr-1"></i> Přetáhnout sekci</div>
        </div>
    `).join('');
}

export function toggleChannelVisibility(id, el, refreshFn) {
    triggerHaptic('light');
    const hidden = state.settings.sidebar.hiddenChannels || [];
    const index = hidden.indexOf(id);
    
    if (index === -1) {
        hidden.push(id);
    } else {
        hidden.splice(index, 1);
    }
    
    state.settings.sidebar.hiddenChannels = hidden;
    saveStateToCache();
    
    const bg = el.querySelector('.rounded-full');
    const dot = el.querySelector('.absolute.bg-white');
    const isVisible = !hidden.includes(id);
    
    if (bg && dot) {
        if (isVisible) {
            bg.classList.replace('bg-[#4f545c]', 'bg-[#3ba55c]');
            dot.classList.add('translate-x-4');
        } else {
            bg.classList.replace('bg-[#3ba55c]', 'bg-[#4f545c]');
            dot.classList.remove('translate-x-4');
        }
    }
    
    renderChannels();
    
    clearTimeout(window._settingsRefreshTimeout);
    window._settingsRefreshTimeout = setTimeout(() => {
        if (refreshFn) refreshFn();
    }, 1200);
}

export function resetSidebarLayout(refreshFn) {
    triggerHaptic('medium');
    state.settings.sidebar.hiddenChannels = [];
    state.settings.sidebar.channelOrder = [];
    state.settings.sidebar.categoryOrder = [];
    state.settings.sidebar.channelCategoryMap = {};
    state.settings.sidebar.collapsedCategories = ['📦 ARCHIV', '⚙️ SYSTÉM & INFO'];
    saveStateToCache();
    
    showNotification("Boční panel obnoven do výchozího stavu! 🔄", "success");
    renderChannels();
    if (refreshFn) refreshFn();
}
