import { state, saveStateToCache } from './state.js';
import { triggerHaptic } from './utils.js';
import * as StaticPages from '../modules/static.js';

/** @type {Record<string, () => Promise<any>>} */
export const moduleMap = {
    'calendar': () => import('../modules/calendar.js'),
    'timeline': () => import('../modules/timeline.js'),
    'library': () => import('../modules/library.js'),
    'topics': () => import('../modules/topics.js'),
    'games': () => import('../modules/games.js'),
    'confession': () => import('../modules/confession.js'),
    'health': () => import('../modules/health.js'),
    'bucketlist': () => import('../modules/bucketlist.js'),
    'achievements': () => import('../modules/achievements.js'),
    'daily-questions': () => import('../modules/dailyQuestions.js'),
    'game-who': () => import('../modules/gameWho.js'),
    'game-draw': () => import('../modules/gameDraw.js'),
    'funfacts': () => import('../modules/funfacts.js'),
    'map': () => import('../modules/map.js'),
    'search': () => import('../modules/search.js'),
    'profile': () => import('../modules/profile.js'),
    'tierlist': () => import('../modules/tierlist.js'),
    'stats': () => import('../modules/stats.js'),
    'matura': () => import('../modules/matura.js'),
    'restore-data': () => import('../modules/restore.js'),
    'settings': () => import('../modules/settings.js'),
    'regenerace': () => import('../modules/regenerace.js'),
    'shifts': () => import('../modules/shifts.js'),
    'austrian-german': () => import('../modules/austrianGerman.js'),
    'kasicka': () => import('../modules/kasicka.js'),
    'alpska-vyzva': () => import('../modules/alpskaVyzva.js'),
    'alpsky-denicek': () => import('../modules/alpskyDenicek.js'),
    'changelog': () => import('../modules/changelog.js'),
    'gym-tracker': () => import('../modules/gym.js'),
    'austria-info': () => import('../modules/austriaInfo.js'),
    'love-shop': () => import('../modules/loveShop.js'),
    'dorm-hub': () => import('../modules/dormHub.js'),
    'schedule': () => import('../modules/schedule.js'),
    'study-planner': () => import('../modules/studyPlanner.js'),
    'laptop-comparison': () => import('../modules/laptopComparison.js'),
    'habits': () => import('../modules/habits.js'),
    'finance-tracker': () => import('../modules/financeTracker.js'),
    'finance': () => import('../modules/financeTracker.js'),
    'decision-matcher': () => import('../modules/decisionMatcher.js')
};

export const DEFAULT_COLLAPSED_CATEGORIES = ['📦 ARCHIV', '⚙️ SYSTÉM & INFO'];

/** @type {import('../types/state.js').ChannelCategory[]} */
export const channelCategories = [
    {
        name: "🎓 VUT FIT & KOLEJE",
        items: [
            { id: 'schedule', name: 'rozvrh', icon: '<i class="fas fa-calendar-week"></i>', type: 'text', color: '#5865F2', desc: 'Náš společný rozvrh na VUT FIT 📚' },
            { id: 'study-planner', name: 'studijní-plán', icon: '<i class="fas fa-tasks"></i>', type: 'text', color: '#3ba55c', desc: 'Zkoušky, WIS body a projekty 🎯' },
            { id: 'dorm-hub', name: 'koleje-brno', icon: '<i class="fas fa-building"></i>', type: 'text', color: '#faa61a', desc: 'Prádelník, checklist na pokoj & menzy 🏢' },
            { id: 'finance-tracker', name: 'finance', icon: '<i class="fas fa-wallet"></i>', type: 'text', color: '#faa61a', desc: 'Osobní rozpočet, kolej & spoření 💶🐖' },
            { id: 'laptop-comparison', name: 'počítač', icon: '<i class="fas fa-laptop"></i>', type: 'text', color: '#faa61a', desc: 'Průvodce a srovnání notebooků na VUT FIT 💻✨' }
        ]
    },
    {
        name: "🌿 ZDRAVÍ & FITNESS",
        items: [
            { id: 'gym-tracker', name: 'posilovna', icon: '<i class="fas fa-dumbbell"></i>', type: 'text', color: '#faa61a', desc: 'Logování tréninků a sledování maximálek 🏋️‍♂️💪' },
            { id: 'habits', name: 'návyky', icon: '<i class="fas fa-check-circle"></i>', type: 'text', color: '#3ba55c', desc: 'Sledování denních návyků & odměny v Love Coins 🌿' },
            { id: 'regenerace', name: 'regenerace', icon: '<i class="fas fa-leaf"></i>', type: 'text', color: '#3ba55c', desc: 'Proč a jak brát suplementy. 🌿' }
        ]
    },
    {
        name: "💖 NÁŠ SVĚT & PŘÍBĚH",
        items: [
            { id: 'love-shop', name: 'obchůdek', icon: '<i class="fas fa-store"></i>', type: 'text', color: '#faa61a', desc: 'Láskyplný obchůdek a spížka na kupóny. 🪙🎁' },
            { id: 'dateplanner', name: 'plánovač-rande', icon: '<i class="fas fa-map-marker-alt"></i>', type: 'text', color: '#3ba55c', desc: 'Kam vyrazíme příště?🥂' },
            { id: 'bucketlist', name: 'bucket-list', icon: '<i class="fas fa-rocket"></i>', type: 'text', color: '#ed4245', desc: 'Všechno, co spolu chceme zažít! ✨' },
            { id: 'quests', name: 'společné-questy', icon: '<i class="fas fa-shield-alt"></i>', type: 'text', color: '#faa61a', desc: 'Naše společné cíle a progress. 💪' },
            { id: 'daily-questions', name: 'denní-otázky', icon: '<i class="fas fa-question-circle"></i>', type: 'text', color: '#99aab5', desc: 'Každý den nová otázka pro nás dva. 🤔' },
            { id: 'topics', name: 'témata', icon: '<i class="fas fa-comments"></i>', type: 'text', color: '#faa61a', desc: 'Když nevíme, o čem si povídat... 🥰' },
            { id: 'timeline', name: 'timeline', icon: '<i class="fas fa-history"></i>', type: 'text', color: '#eb459e', desc: 'Naše nejhezčí společné chvilky 🎞️' },
            { id: 'letters', name: 'dopisy', icon: '<i class="fas fa-envelope-open-text"></i>', type: 'text', color: '#eb459e', desc: 'Vzkazy v láhvi, které se otevřou v čas 💌' },
            { id: 'achievements', name: 'achievementy', icon: '<i class="fas fa-trophy"></i>', type: 'text', color: '#faa61a', desc: 'Co všechno jsme už dokázali? ⭐' }
        ]
    },
    {
        name: "🎮 ZÁBAVA & MÉDIA",
        items: [
            { id: 'library', name: 'knihovna', icon: '<i class="fas fa-film"></i>', type: 'text', color: '#5865F2', desc: 'Filmy, seriály, hry & katalog 🍿🎮' },
            { id: 'watchlist', name: 'watchlist', icon: '<i class="fas fa-heart"></i>', type: 'text', color: '#eb459e', desc: 'Společná přání, Spolu-seznam & Tinder ❤️' },
            { id: 'music', name: 'music-bot', icon: '<i class="fas fa-music"></i>', type: 'text', color: '#3ba55c', desc: 'Náš společný vibes playlist 🎧' },
            { id: 'games-hub', name: 'gamesky', icon: '<i class="fas fa-gamepad"></i>', type: 'text', color: '#faa61a', desc: 'Herní Doupě – Kvízy, Draw Duel, Tetris, Puzzle & Tierlisty 🕹️' }
        ]
    },
    {
        name: "📦 ARCHIV",
        items: [
            { id: 'kasicka', name: 'rakousko-kasička', icon: '<i class="fas fa-piggy-bank"></i>', type: 'text', color: '#faa61a', desc: 'Původní brigádní finance a Schnitzel-O-Meter 💶🇦🇹' },
            { id: 'austria-info', name: 'rakousko-info', icon: '<i class="fas fa-info-circle"></i>', type: 'text', color: '#ff5252', desc: 'Důležité informace a seznam věcí na brigádu 🏔️ℹ️' },
            { id: 'shifts', name: 'plánovač-směn', icon: '<i class="fas fa-business-time"></i>', type: 'text', color: '#faa61a', desc: 'Slaďme naše směny a společné volno 📅' },
            { id: 'austrian-german', name: 'rakouská-němčina', icon: '<i class="fas fa-utensils"></i>', type: 'text', color: '#eb459e', desc: 'Survival slovníček a flashcards pro Alpy 🏔️' },
            { id: 'alpska-vyzva', name: 'alpské-výzvy', icon: '<i class="fas fa-mountain"></i>', type: 'text', color: '#3ba55c', desc: 'Každodenní alpské úkoly 🏔️' },
            { id: 'alpsky-denicek', name: 'alpský-deníček', icon: '<i class="fas fa-journal-whills"></i>', type: 'text', color: '#eb459e', desc: 'Společný locked micro-journal 📔🔒' },
            { id: 'matura-dashboard', name: 'matura-dashboard', icon: '<i class="fas fa-graduation-cap"></i>', type: 'text', color: '#eb459e', desc: 'Naše cesta ke svobodě! 🎓' },
            { id: 'matura-czech', name: 'matura-čeština', icon: '<i class="fas fa-book"></i>', type: 'text', color: '#5865F2', desc: 'Rozbory děl a literatura.' },
            { id: 'matura-it', name: 'matura-it', icon: '<i class="fas fa-laptop-code"></i>', type: 'text', color: '#3ba55c', desc: 'Data, sítě a algoritmy.' }
        ]
    },
    {
        name: "⚙️ SYSTÉM & INFO",
        items: [
            { id: 'stats', name: 'statistiky', icon: '<i class="fas fa-chart-bar"></i>', type: 'text', color: '#faa61a', desc: 'Čísla našeho vztahu.' },
            { id: 'settings', name: 'nastavení', icon: '<i class="fas fa-cog"></i>', type: 'text', color: '#99aab5', desc: 'Přizpůsob si Kiscord podle sebe.' },
            { id: 'changelog', name: 'changelog', icon: '<i class="fas fa-bullhorn"></i>', type: 'text', color: '#faa61a', desc: 'Historie změn a vylepšení v Kiscordu. 📢' },
            { id: 'welcome', name: 'uvítání', icon: '<i class="fas fa-door-open"></i>', type: 'text', color: '#99aab5', desc: 'Vítejte na našem soukromém serveru! ❤️' },
            { id: 'manual', name: 'návod', icon: '<i class="fas fa-book"></i>', type: 'text', color: '#99aab5', desc: 'Jak ovládat tuhle aplikaci.' },
            { id: 'readme', name: 'README.md', icon: '<i class="fas fa-file-alt"></i>', type: 'text', color: '#99aab5', desc: 'Krásného Valentýna té nejúžasnější holce pod sluncem! ❤️' }
        ]
    }
];

export function toggleCategoryCollapse(categoryName) {
    if (!state.settings) state.settings = {};
    if (!state.settings.sidebar) state.settings.sidebar = {};
    if (!Array.isArray(state.settings.sidebar.collapsedCategories)) {
        state.settings.sidebar.collapsedCategories = [...DEFAULT_COLLAPSED_CATEGORIES];
    }

    const collapsed = state.settings.sidebar.collapsedCategories;
    const index = collapsed.indexOf(categoryName);
    const isNowCollapsed = index === -1;

    if (isNowCollapsed) {
        collapsed.push(categoryName);
    } else {
        collapsed.splice(index, 1);
    }

    triggerHaptic('light');
    saveStateToCache();

    // Smooth inline DOM transition
    const wrapper = document.querySelector(`.category-wrapper[data-category="${categoryName}"]`);
    if (wrapper) {
        const header = wrapper.querySelector('.category-header');
        const items = wrapper.querySelector('.category-items');
        const chevron = wrapper.querySelector('.category-chevron');

        if (header) header.classList.toggle('collapsed', isNowCollapsed);
        if (chevron) {
            chevron.classList.toggle('-rotate-90', isNowCollapsed);
            chevron.classList.toggle('rotate-0', !isNowCollapsed);
        }
        if (items) {
            items.classList.toggle('collapsed', isNowCollapsed);
        }
    } else {
        renderChannels();
    }
}

export function collapseAllCategories() {
    if (!state.settings) state.settings = {};
    if (!state.settings.sidebar) state.settings.sidebar = {};
    state.settings.sidebar.collapsedCategories = channelCategories.map(cat => cat.name);
    triggerHaptic('medium');
    saveStateToCache();
    renderChannels();
}

export function expandAllCategories() {
    if (!state.settings) state.settings = {};
    if (!state.settings.sidebar) state.settings.sidebar = {};
    state.settings.sidebar.collapsedCategories = [];
    triggerHaptic('medium');
    saveStateToCache();
    renderChannels();
}

export function renderChannels() {
    const container = document.getElementById("channels-container");
    if (!container) return;

    const hidden = state.settings?.sidebar?.hiddenChannels || [];
    const order = state.settings?.sidebar?.channelOrder || [];
    const catOrder = state.settings?.sidebar?.categoryOrder || [];
    const catMap = state.settings?.sidebar?.channelCategoryMap || {};
    const collapsedCategories = Array.isArray(state.settings?.sidebar?.collapsedCategories)
        ? state.settings.sidebar.collapsedCategories
        : DEFAULT_COLLAPSED_CATEGORIES;

    console.log('[DEBUG] renderChannels - hidden:', hidden);
    console.log('[DEBUG] renderChannels - catMap:', JSON.stringify(catMap));
    console.log('[DEBUG] renderChannels - order:', order);

    const mainChannelDefinitions = {
        dashboard: { id: 'dashboard', name: 'Můj Den', icon: '<i class="fas fa-heart"></i>', color: '#eb459e', desc: 'Tvůj osobní přehled a zdraví ❤️' },
        calendar: { id: 'calendar', name: 'Kalendář', icon: '<i class="fas fa-calendar-alt"></i>', color: '#5865F2', desc: 'Plánování našich akcí a školy 📅' }
    };

    let html = "";

    // Special Top Items (Dashboard and Calendar) - render at top only if not moved to a category
    console.log('[DEBUG] dashboard top rendering check:', !hidden.includes('dashboard'), !catMap['dashboard']);
    if (!hidden.includes('dashboard') && !catMap['dashboard']) {
        const isActive = state.currentChannel === 'dashboard';
        html += `
            <div class="channel-link group flex items-center px-2.5 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] mb-1 mt-1 ${isActive ? 'active bg-[var(--bg-modifier-selected)] text-[var(--text-header)] font-bold' : ''}" data-channel="dashboard">
                <div class="w-5 text-center mr-2.5 text-lg text-[#eb459e] flex items-center justify-center flex-shrink-0"><i class="fas fa-heart"></i></div>
                <div class="flex-1 font-bold text-sm text-[var(--text-header)] truncate">Můj Den</div>
            </div>
        `;
    }
    console.log('[DEBUG] calendar top rendering check:', !hidden.includes('calendar'), !catMap['calendar']);
    if (!hidden.includes('calendar') && !catMap['calendar']) {
        const isActive = state.currentChannel === 'calendar';
        html += `
            <div class="channel-link group flex items-center px-2.5 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] mb-3 ${isActive ? 'active bg-[var(--bg-modifier-selected)] text-[var(--text-header)] font-bold' : ''}" data-channel="calendar">
                <div class="w-5 text-center mr-2.5 text-lg text-[#5865F2] flex items-center justify-center flex-shrink-0"><i class="fas fa-calendar-alt"></i></div>
                <div class="flex-1 font-bold text-sm text-[var(--text-header)] truncate">Kalendář</div>
            </div>
        `;
    }

    // Deep clone categories so we can dynamically restructure items without altering the original array
    const clonedCategories = channelCategories.map(cat => ({
        name: cat.name,
        items: [...cat.items]
    }));

    // Move items to their custom categories if mapped
    Object.entries(catMap).forEach(([channelId, targetCatName]) => {
        let foundItem = null;
        let sourceCat = null;

        clonedCategories.forEach(cat => {
            const idx = cat.items.findIndex(item => item.id === channelId);
            if (idx !== -1) {
                foundItem = cat.items[idx];
                sourceCat = cat;
                cat.items.splice(idx, 1); // Remove from source category
            }
        });

        // Fallback for main channels (dashboard or calendar) that are not in default categories list
        if (!foundItem && mainChannelDefinitions[channelId]) {
            foundItem = mainChannelDefinitions[channelId];
        }

        if (foundItem) {
            const targetCat = clonedCategories.find(cat => cat.name === targetCatName);
            if (targetCat) {
                targetCat.items.push(foundItem); // Add to target category
            } else if (sourceCat) {
                sourceCat.items.push(foundItem); // Fallback
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

        // Skip empty category headers
        if (visibleItems.length === 0) return;

        // Sort items inside each category according to the custom channelOrder list
        visibleItems.sort((a, b) => {
            const indexA = order.indexOf(a.id);
            const indexB = order.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        const isCollapsed = collapsedCategories.includes(cat.name);
        const hasActiveChannel = visibleItems.some(i => i.id === state.currentChannel);

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

            html += `
                <div class="channel-link group flex items-center px-2.5 py-1.5 mx-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-header)] mb-0.5 ${isActive ? 'active bg-[var(--bg-modifier-selected)] text-[var(--text-header)] font-bold' : ''}" data-channel="${channel.id}">
                    <div class="mr-2.5 w-5 text-center text-base flex items-center justify-center flex-shrink-0" ${iconColor}>${channel.icon}</div>
                    <div class="flex-1 font-semibold text-[13.5px] truncate group-hover:text-[var(--text-normal)] transition-colors">${channel.name}</div>
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

export function setupNavigation() {
    const container = document.getElementById("channels-container");
    if (!container || container._hasNavListener) return;

    // Use event delegation on the parent container so listeners survive innerHTML updates
    container.addEventListener('click', (e) => {
        const header = e.target.closest('.category-header');
        if (header) {
            const catName = header.getAttribute('data-category');
            if (catName) toggleCategoryCollapse(catName);
            return;
        }

        const link = e.target.closest('.channel-link');
        if (link) {
            const channelId = link.getAttribute('data-channel');
            switchChannel(channelId);
        }
    });

    container._hasNavListener = true;
}

export function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            moduleMap.search().then(m => m.renderGlobalSearch(m.expandSearchQuery(query)));
        } else {
            switchChannel(state.currentChannel);
        }
    });
}

export function updateChannelHeader(channelId) {
    const nameEl = document.getElementById('channel-name');
    const descEl = document.getElementById('channel-desc');
    const iconEl = document.getElementById('channel-icon');

    if (channelId === 'dashboard') {
        if (nameEl) nameEl.textContent = 'Můj Den';
        if (descEl) descEl.textContent = 'Tvůj osobní přehled a zdraví ❤️';
        if (iconEl) {
            iconEl.className = 'fas fa-heart text-[#eb459e] text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    if (channelId === 'changelog') {
        if (nameEl) nameEl.textContent = 'changelog';
        if (descEl) descEl.textContent = 'Historie změn a vylepšení v Kiscordu. 📢';
        if (iconEl) {
            iconEl.className = 'fas fa-bullhorn text-[#faa61a] text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    if (channelId === 'calendar') {
        if (nameEl) nameEl.textContent = 'Společný Kalendář';
        if (descEl) descEl.textContent = 'Plánování našich akcí a školy 📅';
        if (iconEl) {
            iconEl.className = 'fas fa-calendar-alt text-[#5865F2] text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    if (channelId === 'restore-data') {
        if (nameEl) nameEl.textContent = 'Obnova Dat';
        if (descEl) descEl.textContent = 'Migrace historických záznamů 🛠️';
        if (iconEl) {
            iconEl.className = 'fas fa-history text-blue-400 text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    // Find in categories
    let found = null;
    channelCategories.forEach(cat => {
        const item = cat.items.find(i => i.id === channelId);
        if (item) found = item;
    });

    if (found) {
        if (nameEl) nameEl.textContent = found.name;
        if (descEl) descEl.textContent = found.desc || '';
        if (iconEl) {
            iconEl.className = 'text-xl mr-2 flex items-center justify-center w-6 h-6';
            iconEl.innerHTML = found.icon;
            iconEl.style.color = found.color || 'inherit';
        }
    }
}

export function switchChannel(channelId, push = true) {
    if (state.currentChannel === channelId && document.getElementById("messages-container")?.innerHTML !== "") {
        console.log(`[NAV] Already on channel ${channelId}, skipping full re-render.`);
        return;
    }

    // Update browser history
    if (push) {
        history.pushState({ channel: channelId }, "", "");
    }

    // Haptic feedback for navigation
    triggerHaptic('light');

    // Play page flip sound
    import('./sound.js').then(m => m.playPageFlip()).catch(e => console.warn('[Sound] Failed to play page flip:', e));

    console.log(`[NAV] Switching to channel: ${channelId}`);
    state.currentChannel = channelId;
    localStorage.setItem('klarka_last_channel', channelId);

    // Auto-expand category containing current channel if collapsed
    if (state.settings?.sidebar) {
        const collapsed = state.settings.sidebar.collapsedCategories || DEFAULT_COLLAPSED_CATEGORIES;
        if (collapsed && collapsed.length > 0) {
            const catMap = state.settings.sidebar.channelCategoryMap || {};
            let parentCat = catMap[channelId];
            if (!parentCat) {
                const foundCat = channelCategories.find(cat => cat.items.some(i => i.id === channelId));
                if (foundCat) parentCat = foundCat.name;
            }
            if (parentCat && collapsed.includes(parentCat)) {
                state.settings.sidebar.collapsedCategories = collapsed.filter(c => c !== parentCat);
                saveStateToCache();
                renderChannels();
            }
        }
    }

    // Update Sidebar UI
    document.querySelectorAll('.channel-link').forEach(l => {
        const isCurrent = l.getAttribute('data-channel') === channelId;
        l.classList.toggle('active', isCurrent);
        l.classList.toggle('bg-[var(--bg-modifier-selected)]', isCurrent);
        l.classList.toggle('text-[var(--text-header)]', isCurrent);
        l.classList.toggle('font-bold', isCurrent);
    });

    // Update Mobile Bottom Nav & Workout Mini Bar
    updateMobileBottomNav(channelId);
    updateGlobalWorkoutMiniBar();

    // Icons/Header
    if (typeof window.renderLevelUI === 'function') window.renderLevelUI();
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    updateChannelHeader(channelId);

    // Refresh global active gym workout badge if present
    if (window.Gym && typeof window.Gym.updateGlobalWorkoutBadge === 'function') {
        window.Gym.updateGlobalWorkoutBadge();
    }

    // Render Content
    const container = document.getElementById("messages-container");
    if (container) container.innerHTML = "";

    // Centralized Realtime & Interval Cleanup
    const cleanups = [
        'achCleanup', 'dailyCleanup', 'bucketCleanup', 'whoCleanup', 'drawCleanup',
        'cleanupQuestsRealtime', 'calendarCleanup', 'timelineCleanup', 'gymCleanup',
        'alpskaVyzvaCleanup', 'alpskyDenicekCleanup', 'dormHubCleanup', 'cleanupPlanningTimer', 'loveShopCleanup'
    ];
    cleanups.forEach(fn => { if (typeof window[fn] === 'function') window[fn](); });

    // Tier List special cleanup
    import('../modules/tierlist.js').then(m => m.cleanupRealtime?.());

    // Centrální error handler pro navigační chyby
    const navErr = (err) => {
        console.error(`[NAV] Navigating to ${channelId} failed:`, err);
        if (window.renderErrorState) {
            container.innerHTML = window.renderErrorState({
                message: `Nepodařilo se přepnout na kanál ${channelId}... 🦝`,
                onRetry: `switchChannel('${channelId}')`
            });
        } else {
            container.innerHTML = `<div class="p-8 text-center text-red-400">Chyba navigace: ${err.message}</div>`;
        }
    };

    // Route
    switch (channelId) {
        case 'welcome':
            import('../modules/dashboard.js').then(m => m.renderWelcome()).catch(navErr);
            break;
        case 'music':
            StaticPages.renderMusicBot();
            break;
        case 'dashboard':
            import('../modules/dashboard.js').then(m => m.renderDashboard());
            break;
        case 'dateplanner':
            import('./state.js').then(s => s.ensureMapData()).then(() => moduleMap.map()).then(m => m.renderMap()).catch(navErr);
            break;
        case 'bucketlist':
            import('./state.js').then(s => s.ensureBucketListData()).then(() => moduleMap.bucketlist()).then(m => m.renderBucketList()).catch(navErr);
            break;
        case 'calendar':
            import('./state.js').then(s => s.ensureCalendarData()).then(() => moduleMap.calendar().then(m => m.renderCalendar())).catch(navErr);
            break;
        case 'timeline':
            import('./state.js').then(s => s.ensureTimelineData()).then(() => moduleMap.timeline().then(m => m.renderTimeline())).catch(navErr);
            break;
        case 'library':
        case 'movies':
        case 'series':
        case 'games':
            import('./state.js').then(s => s.ensureLibraryData()).then(() => moduleMap.library().then(m => m.renderLibrary(channelId === 'library' ? 'movies' : channelId))).catch(navErr);
            break;
        case 'watchlist':
            import('./state.js').then(s => s.ensureLibraryData()).then(() => import('../modules/watchlist.js')).then(m => m.renderWatchlist()).catch(navErr);
            break;
        case 'topics':
            import('./state.js').then(s => s.ensureTopicsData()).then(() => moduleMap.topics()).then(m => m.renderTopics()).catch(navErr);
            break;
        case 'tetris':
            moduleMap.games().then(m => m.renderTetrisTracker()).catch(navErr);
            break;
        case 'puzzle':
            import('./state.js').then(s => s.ensureTimelineData()).then(() => moduleMap.games().then(m => m.renderPuzzleGame())).catch(navErr);
            break;
        case 'quiz':
            import('../modules/coupleQuiz.js').then(m => m.renderCoupleQuiz()).catch(navErr);
            break;
        case 'games-hub':
            import('./state.js').then(s => s.ensureGamesData()).then(() => import('../modules/gamesHub.js')).then(m => m.renderGamesHub()).catch(navErr);
            break;
        case 'game-who':
            import('./state.js').then(s => s.ensureGamesData()).then(() => import('../modules/gameWho.js')).then(m => m.renderGameWho()).catch(navErr);
            break;
        case 'game-draw':
            import('./state.js').then(s => Promise.all([s.ensureGamesData(), s.ensureDrawStrokesData()])).then(() => import('../modules/gameDraw.js')).then(m => m.renderGameDraw()).catch(navErr);
            break;
        case 'daily-questions':
            import('./state.js').then(s => s.ensureDailyQuizData()).then(() => moduleMap['daily-questions']()).then(m => m.renderDailyQuestions()).catch(navErr);
            break;
        case 'love-shop':
            import('./state.js').then(s => s.ensureLoveShopData()).then(() => moduleMap['love-shop']()).then(m => m.renderLoveShop()).catch(navErr);
            break;
        case 'achievements':
            import('./state.js').then(s => s.ensureAchievementsData()).then(() => moduleMap.achievements()).then(m => m.renderAchievements()).catch(navErr);
            break;
        case 'quests':
            import('../modules/quests.js').then(m => m.renderQuests()).catch(navErr);
            break;
        case 'funfacts':
            import('./state.js').then(s => s.ensureFactsData()).then(() => moduleMap.funfacts().then(m => m.renderFunFacts())).catch(navErr);
            break;
        case 'stats':
            import('./state.js').then(s => Promise.all([s.ensureCalendarData(), s.ensureLibraryData()])).then(() => moduleMap.stats().then(m => m.renderStats())).catch(navErr);
            break;
        case 'tierlist':
            moduleMap.tierlist().then(m => m.renderTierList()).catch(navErr);
            break;
        case 'restore-data':
            moduleMap['restore-data']().then(m => m.renderRestoreData()).catch(navErr);
            break;
        case 'letters':
            import('../modules/letters.js').then(m => m.renderLetters()).catch(navErr);
            break;
        case 'manual':
            StaticPages.renderManual();
            break;
        case 'readme':
            StaticPages.renderReadme();
            break;
        case 'matura-dashboard':
        case 'matura-czech':
        case 'matura-it':
            import('./state.js').then(s => s.ensureMaturaData()).then(() => moduleMap.matura().then(m => m.renderMatura(channelId))).catch(navErr);
            break;
        case 'austria-info':
            moduleMap['austria-info']().then(m => m.renderAustriaInfo()).catch(navErr);
            break;
        case 'shifts':
            import('./state.js').then(s => s.ensureShiftsData()).then(() => moduleMap.shifts().then(m => m.renderShifts())).catch(navErr);
            break;
        case 'austrian-german':
            moduleMap['austrian-german']().then(m => m.renderAustrianGerman()).catch(navErr);
            break;
        case 'rakousko-kasicka':
        case 'kasicka':
            import('./state.js').then(s => s.ensureFinancesData()).then(() => moduleMap.kasicka().then(m => m.renderKasicka())).catch(navErr);
            break;
        case 'alpska-vyzva':
            import('./state.js').then(s => s.ensureChallengesData()).then(() => moduleMap['alpska-vyzva']().then(m => m.renderAlpskaVyzva())).catch(navErr);
            break;
        case 'alpsky-denicek':
            import('./state.js').then(s => s.ensureDiaryData()).then(() => moduleMap['alpsky-denicek']().then(m => m.renderAlpskyDenicek())).catch(navErr);
            break;
        case 'settings':
            moduleMap.settings().then(m => m.renderSettings()).catch(navErr);
            break;
        case 'regenerace':
            moduleMap.regenerace().then(m => m.renderRegenerace()).catch(navErr);
            break;
        case 'schedule':
            moduleMap.schedule().then(m => m.renderSchedule()).catch(navErr);
            break;
        case 'study-planner':
            moduleMap['study-planner']().then(m => m.renderStudyPlanner()).catch(navErr);
            break;
        case 'dorm-hub':
            moduleMap['dorm-hub']().then(m => m.renderDormHub()).catch(navErr);
            break;
        case 'laptop-comparison':
            moduleMap['laptop-comparison']().then(m => m.renderLaptopComparison()).catch(navErr);
            break;
        case 'habits':
            moduleMap.habits().then(m => m.renderHabits()).catch(navErr);
            break;

        case 'finance':
        case 'finance-tracker':
            moduleMap['finance-tracker']().then(m => m.renderFinanceTracker()).catch(navErr);
            break;
        case 'gym-tracker':
            import('./state.js').then(s => s.ensureGymData()).then(() => moduleMap['gym-tracker']().then(m => m.renderGym())).catch(navErr);
            break;


        case 'changelog':
            moduleMap['changelog']().then(m => m.renderChangelog()).catch(navErr);
            break;
        default:
            import('../modules/dashboard.js').then(m => m.renderWelcome()).catch(navErr);
    }

    // Mobile Sidebar Close
    const sidebar = document.getElementById('sidebar-wrapper');
    const overlay = document.getElementById('mobile-overlay');
    if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    }
}

// --- MOBILE NAVIGATION & WORKOUT MINI-BAR HELPERS ---

export function updateMobileBottomNav(channelId) {
    const nav = document.getElementById('mobile-bottom-nav');
    if (!nav) return;

    nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const directBtn = nav.querySelector(`.mobile-nav-btn[data-nav-channel="${channelId}"]`);
    if (directBtn) {
        directBtn.classList.add('active');
        return;
    }

    const vutChannels = ['schedule', 'study-planner', 'dorm-hub', 'finance-tracker', 'laptop-comparison'];
    if (vutChannels.includes(channelId)) {
        const vutBtn = nav.querySelector('.mobile-nav-btn[data-nav-category="vut"]');
        if (vutBtn) vutBtn.classList.add('active');
        return;
    }

    const moreBtn = nav.querySelector('.mobile-nav-btn[data-nav-category="more"]');
    if (moreBtn) moreBtn.classList.add('active');
}

export function toggleMobileCategorySheet(catType) {
    const backdrop = document.getElementById('mobile-sheet-backdrop');
    if (!backdrop) return;

    if (!backdrop.classList.contains('hidden') && backdrop.dataset.currentCat === catType) {
        closeMobileCategorySheet();
        return;
    }

    openMobileCategorySheet(catType);
}

export function openMobileCategorySheet(catType) {
    triggerHaptic('light');
    const backdrop = document.getElementById('mobile-sheet-backdrop');
    const content = document.getElementById('mobile-sheet-content');
    const body = document.getElementById('mobile-sheet-body');
    if (!backdrop || !content || !body) return;

    backdrop.dataset.currentCat = catType;

    let title = '';
    let items = [];

    if (catType === 'vut') {
        title = '🎓 VUT FIT & Koleje Brno';
        items = [
            { id: 'schedule', name: 'Rozvrh FIT', icon: 'fa-calendar-week', color: 'text-indigo-400', desc: 'Týdenní rozvrh, volná okna & učebny' },
            { id: 'study-planner', name: 'Studijní Plán', icon: 'fa-tasks', color: 'text-emerald-400', desc: 'Zkoušky, WIS body & deadliny' },
            { id: 'dorm-hub', name: 'Koleje & Prádelna', icon: 'fa-building', color: 'text-amber-400', desc: 'Časovač pračky, nákupy & menzy' },
            { id: 'finance-tracker', name: 'Finance Brno', icon: 'fa-wallet', color: 'text-yellow-400', desc: 'Společný studentský rozpočet' },
            { id: 'laptop-comparison', name: 'Počítač', icon: 'fa-laptop', color: 'text-blue-400', desc: 'Průvodce notebooky na FIT' }
        ];
    } else {
        title = '💬 Náš Svět & Zábava';
        items = [
            { id: 'habits', name: 'Návyky Tracker', icon: 'fa-check-circle', color: 'text-emerald-400', desc: 'Denní rutina (+5 Love Coins)' },
            { id: 'love-shop', name: 'Láskyplný Obchůdek', icon: 'fa-store', color: 'text-pink-400', desc: 'Spížka na kupóny & mince' },
            { id: 'daily-questions', name: 'Denní Otázky', icon: 'fa-question-circle', color: 'text-amber-400', desc: 'Každodenní otázka pro nás dva' },
            { id: 'topics', name: 'Témata', icon: 'fa-comments', color: 'text-orange-400', desc: 'O čem si dnes popovídat' },
            { id: 'quiz', name: 'Kvízy & Hry', icon: 'fa-brain', color: 'text-purple-400', desc: 'Kdo lépe zná, Draw duel...' },
            { id: 'timeline', name: 'Timeline Vzpomínek', icon: 'fa-history', color: 'text-pink-400', desc: 'Naše nejhezčí společné chvilky' },
            { id: 'letters', name: 'Dopisy v láhvi', icon: 'fa-envelope-open-text', color: 'text-rose-400', desc: 'Vzkazy pro budoucí já' },
            { id: 'settings', name: 'Nastavení', icon: 'fa-cog', color: 'text-gray-400', desc: 'Vzhled, barvy a správa účtu' },
            { id: '_all_channels', name: 'Všechny Kanály', icon: 'fa-bars', color: 'text-indigo-400', desc: 'Otevřít kompletní Discord menu' }
        ];
    }

    body.innerHTML = `
        <div class="space-y-3 pb-6">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <h3 class="text-sm font-black text-[var(--text-header)] uppercase tracking-wider">${title}</h3>
                <button onclick="window.closeMobileCategorySheet()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[var(--text-muted)] flex items-center justify-center text-sm transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 gap-2">
                ${items.map(item => `
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] border border-[var(--border-subtle)] transition active:scale-95 cursor-pointer group"
                         onclick="${item.id === '_all_channels' ? 'window.closeMobileCategorySheet(); window.toggleMobileMenu();' : `window.switchChannel('${item.id}'); window.closeMobileCategorySheet();`}">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-lg ${item.color} flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                                <i class="fas ${item.icon}"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="text-xs font-black text-[var(--text-header)] truncate">${item.name}</h4>
                                <p class="text-[10px] text-[var(--text-muted)] font-medium truncate mt-0.5">${item.desc}</p>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-xs text-[var(--text-muted)] group-hover:text-[var(--text-header)] group-hover:translate-x-0.5 transition-all"></i>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        content.classList.remove('translate-y-full');
        content.classList.add('translate-y-0');
    });
}

export function closeMobileCategorySheet() {
    const backdrop = document.getElementById('mobile-sheet-backdrop');
    const content = document.getElementById('mobile-sheet-content');
    if (!backdrop || !content) return;

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    content.classList.remove('translate-y-0');
    content.classList.add('translate-y-full');

    setTimeout(() => {
        backdrop.classList.add('hidden');
    }, 300);
}

let miniBarLiveTicker = null;

export function updateGlobalWorkoutMiniBar() {
    const bar = document.getElementById('global-workout-mini-bar');
    const gymDot = document.getElementById('mobile-nav-gym-dot');
    if (!bar) return;

    let active = null;
    try {
        const raw = localStorage.getItem('kiscord_active_workout');
        if (raw) active = JSON.parse(raw);
    } catch(e) {}

    const isGymChannel = state.currentChannel === 'gym-tracker';

    if (active) {
        if (gymDot) gymDot.classList.remove('hidden');
        if (!isGymChannel) {
            bar.classList.remove('hidden');
            bar.classList.add('flex');

            const titleEl = document.getElementById('mini-bar-title');
            const timerEl = document.getElementById('mini-bar-timer');
            const subEl = document.getElementById('mini-bar-subtitle');

            const updateDisplay = () => {
                if (titleEl) titleEl.textContent = active.name || active.templateName || 'Trénink';

                let startMs = 0;
                if (typeof active.startTime === 'number') {
                    startMs = active.startTime;
                } else if (typeof active.startTime === 'string') {
                    startMs = new Date(active.startTime).getTime();
                }

                const now = Date.now();
                let elapsedSec = 0;
                if (!isNaN(startMs) && startMs > 0) {
                    elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
                } else {
                    elapsedSec = Number(active.durationSeconds) || 0;
                }

                const h = Math.floor(elapsedSec / 3600);
                const m = Math.floor((elapsedSec % 3600) / 60);
                const s = elapsedSec % 60;
                const timeStr = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

                let restRemaining = 0;
                if (active.isRestTimerRunning) {
                    const restStart = active.restStartedAt ? Number(active.restStartedAt) : 0;
                    if (!isNaN(restStart) && restStart > 0) {
                        const restElapsed = Math.floor((now - restStart) / 1000);
                        restRemaining = Math.max(0, (active.restTimeDuration || 90) - restElapsed);
                    } else {
                        restRemaining = active.restTimeRemaining || 0;
                    }
                }

                if (timerEl) {
                    if (active.isRestTimerRunning && restRemaining > 0) {
                        timerEl.innerHTML = `<span class="text-white font-mono">${timeStr}</span> <span class="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">☕ ${restRemaining}s</span>`;
                    } else {
                        timerEl.innerHTML = `<span class="text-white font-mono">${timeStr}</span>`;
                    }
                }

                // Find the first exercise with uncompleted sets, or the first/last as fallback
                let currEx = (active.exercises || []).find(ex => (ex.sets || []).some(set => !set.completed));
                if (!currEx && active.exercises && active.exercises.length > 0) {
                    currEx = active.exercises[active.exercises.length - 1];
                }

                if (subEl) {
                    if (currEx) {
                        const setsDone = (currEx.sets || []).filter(set => set.completed).length;
                        const totalSets = (currEx.sets || []).length;
                        const allDone = setsDone === totalSets && totalSets > 0;
                        subEl.textContent = `${currEx.name} (Série ${setsDone}/${totalSets})${allDone ? ' ✅' : ''}`;
                    } else {
                        subEl.textContent = 'Trénink probíhá...';
                    }
                }
            };

            updateDisplay();

            if (miniBarLiveTicker) clearInterval(miniBarLiveTicker);
            miniBarLiveTicker = setInterval(() => {
                try {
                    const latest = localStorage.getItem('kiscord_active_workout');
                    if (latest) active = JSON.parse(latest);
                } catch(e) {}
                updateDisplay();
            }, 1000);
        } else {
            if (miniBarLiveTicker) { clearInterval(miniBarLiveTicker); miniBarLiveTicker = null; }
            bar.classList.add('hidden');
            bar.classList.remove('flex');
        }
    } else {
        if (miniBarLiveTicker) { clearInterval(miniBarLiveTicker); miniBarLiveTicker = null; }
        if (gymDot) gymDot.classList.add('hidden');
        bar.classList.add('hidden');
        bar.classList.remove('flex');
    }
}

// Global window attachments for easy integration & onclick triggers
window.switchChannel = switchChannel;
window.renderChannels = renderChannels;
window.toggleCategoryCollapse = toggleCategoryCollapse;
window.collapseAllCategories = collapseAllCategories;
window.expandAllCategories = expandAllCategories;
window.toggleMobileCategorySheet = toggleMobileCategorySheet;
window.openMobileCategorySheet = openMobileCategorySheet;
window.closeMobileCategorySheet = closeMobileCategorySheet;
window.updateGlobalWorkoutMiniBar = updateGlobalWorkoutMiniBar;


