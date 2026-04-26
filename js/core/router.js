import { state } from './state.js';
import { triggerHaptic } from './utils.js';
import * as StaticPages from '../modules/static.js';

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
    'regenerace': () => import('../modules/regenerace.js')
};

export const channelCategories = [
    {
        name: "ZÁBAVA & HRY",
        items: [
            { id: 'topics', name: 'témata', icon: '<i class="fas fa-comments"></i>', type: 'text', color: '#faa61a', desc: 'Když nevíme, o čem si povídat... 🥰' },
            { id: 'funfacts', name: 'zajímavosti', icon: '<i class="fas fa-lightbulb"></i>', type: 'text', color: '#eb459e', desc: 'Vše o mývalech, sovách a tak...' },
            { id: 'daily-questions', name: 'denní-otázky', icon: '<i class="fas fa-question-circle"></i>', type: 'text', color: '#99aab5', desc: 'Každý den nová otázka pro nás dva. 🤔' },
            { id: 'quiz', name: 'kvízy', icon: '<i class="fas fa-brain"></i>', type: 'text', color: '#5865F2', desc: 'Kdo vás lépe zná? 🧠' },
            { id: 'games-hub', name: 'gamesky', icon: '<i class="fas fa-gamepad"></i>', type: 'text', color: '#3ba55c', desc: 'Kdo spíše, Draw Duel... 🎮' },
            { id: 'puzzle', name: 'puzzle', icon: '<i class="fas fa-puzzle-piece"></i>', type: 'text', color: '#eb459e', desc: 'Skládejte naše vzpomínky kousek po kousku.' },
            { id: 'tetris', name: 'tetris-tracker', icon: '<i class="fas fa-shapes"></i>', type: 'text', color: '#faa61a', desc: 'Sezóna v Tetris War začíná! 🏆' },
            { id: 'tierlist', name: 'tier-listy', icon: '<i class="fas fa-layer-group"></i>', type: 'text', color: '#5865F2', desc: 'Rankujme všechno od rande po filmy! 🏆' }
        ]
    },

    {
        name: "PLÁNOVÁNÍ",
        items: [
            { id: 'dateplanner', name: 'plánovač-rande', icon: '<i class="fas fa-map-marker-alt"></i>', type: 'text', color: '#3ba55c', desc: 'Kam vyrazíme příště?🥂' },
            { id: 'bucketlist', name: 'bucket-list', icon: '<i class="fas fa-rocket"></i>', type: 'text', color: '#ed4245', desc: 'Všechno, co spolu chceme zažít! ✨' },
            { id: 'quests', name: 'společné-questy', icon: '<i class="fas fa-shield-alt"></i>', type: 'text', color: '#faa61a', desc: 'Naše společné cíle a progress. 💪' }
        ]
    },
    {
        name: "VZPOMÍNKY",
        items: [
            { id: 'timeline', name: 'timeline', icon: '<i class="fas fa-history"></i>', type: 'text', color: '#eb459e', desc: 'Naše nejhezčí společné chvilky 🎞️' },
            { id: 'letters', name: 'dopisy', icon: '<i class="fas fa-envelope-open-text"></i>', type: 'text', color: '#eb459e', desc: 'Vzkazy v láhvi, které se otevřou v čas 💌' },
            { id: 'achievements', name: 'achievementy', icon: '<i class="fas fa-trophy"></i>', type: 'text', color: '#faa61a', desc: 'Co všechno jsme už dokázali? ⭐' }
        ]
    },
    {
        name: "KNIHOVNA",
        items: [
            { id: 'movies', name: 'filmy', icon: '<i class="fas fa-film"></i>', type: 'text', color: '#5865F2', desc: 'Co nás čeká v kině i doma 🍿' },
            { id: 'series', name: 'seriály', icon: '<i class="fas fa-tv"></i>', type: 'text', color: '#5865F2', desc: 'Maratony pod dekou 🎞️' },
            { id: 'watchlist', name: 'watchlist', icon: '<i class="fas fa-heart text-[#eb459e]"></i>', type: 'text', color: '#eb459e', desc: 'Náš společný seznam přání a osud 🎬🌟' },
            { id: 'games', name: 'hry', icon: '<i class="fas fa-dice"></i>', type: 'text', color: '#ff5252', desc: 'Hry' },
            { id: 'music', name: 'music-bot', icon: '<i class="fas fa-music"></i>', type: 'text', color: '#3ba55c', desc: 'Náš společný vibes playlist 🎧' }
        ]
    },
    {
        name: "MATURITA 2026",
        items: [
            { id: 'matura-dashboard', name: 'dashboard', icon: '<i class="fas fa-rocket"></i>', type: 'text', color: '#eb459e', desc: 'Naše cesta ke svobodě! 🎓' },
            { id: 'matura-czech', name: 'čeština', icon: '<i class="fas fa-book"></i>', type: 'text', color: '#5865F2', desc: 'Rozbory děl a literatura.' },
            { id: 'matura-it', name: 'informatika', icon: '<i class="fas fa-laptop-code"></i>', type: 'text', color: '#3ba55c', desc: 'Data, sítě a algoritmy.' }
        ]
    },
    {
        name: "SYSTÉM",
        items: [
            { id: 'regenerace', name: 'regenerace', icon: '<i class="fas fa-leaf"></i>', type: 'text', color: '#3ba55c', desc: 'Proč a jak brát suplementy. 🌿' },
            { id: 'stats', name: 'statistiky', icon: '<i class="fas fa-chart-bar"></i>', type: 'text', color: '#faa61a', desc: 'Čísla našeho vztahu.' },
            { id: 'settings', name: 'nastavení', icon: '<i class="fas fa-cog"></i>', type: 'text', color: '#99aab5', desc: 'Přizpůsob si Kiscord podle sebe.' },
            { id: 'welcome', name: 'uvítání', icon: '<i class="fas fa-door-open"></i>', type: 'text', desc: 'Vítejte na našem soukromém serveru! ❤️' },
            { id: 'manual', name: 'návod', icon: '<i class="fas fa-book"></i>', type: 'text', color: '#99aab5', desc: 'Jak ovládat tuhle aplikaci.' },
            { id: 'readme', name: 'README.md', icon: '<i class="fas fa-file-alt"></i>', type: 'text', color: '#99aab5', desc: 'Krásného Valentýna té nejúžasnější holce pod sluncem! ❤️' }
        ]
    }
];

export function renderChannels() {
    const container = document.getElementById("channels-container");
    if (!container) return;

    let html = "";

    // Special Top Items
    html += `
        <div class="channel-link group flex items-center px-2 py-1 mx-2 rounded cursor-pointer transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-gray-100 text-gray-400 mb-0.5 mt-2" data-channel="dashboard">
            <div class="w-5 text-center mr-2 text-lg text-[#eb459e]"><i class="fas fa-heart"></i></div>
            <div class="flex-1 font-bold text-gray-200">Můj Den</div>
        </div>
        <div class="channel-link group flex items-center px-2 py-1 mx-2 rounded cursor-pointer transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-gray-100 text-gray-400 mb-4" data-channel="calendar">
            <div class="w-5 text-center mr-2 text-lg text-[#5865F2]"><i class="fas fa-calendar-alt"></i></div>
            <div class="flex-1 font-bold text-gray-200">Kalendář</div>
        </div>
    `;

    channelCategories.forEach(cat => {
        html += `
            <h3 class="px-4 mt-4 mb-1 text-xs font-bold text-[#8e9297] uppercase hover:text-gray-300 transition-colors cursor-default select-none">${cat.name}</h3>
        `;

        cat.items.forEach(channel => {
            const iconColor = channel.color ? `style="color: ${channel.color}"` : '';

            html += `
                <div class="channel-link group flex items-center px-2 py-1 mx-2 rounded cursor-pointer transition-colors hover:bg-[var(--background-modifier-hover)] hover:text-gray-100 text-gray-400 mb-0.5 opacity-90 hover:opacity-100" data-channel="${channel.id}">
                    <div class="mr-2 w-5 text-center text-lg" ${iconColor}>${channel.icon}</div>
                    <div class="flex-1 font-medium truncate group-hover:text-gray-200 transition-colors">${channel.name}</div>
                </div>
            `;
        });
    });

    container.innerHTML = html;
}

export function setupNavigation() {
    document.querySelectorAll('.channel-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const channelId = e.currentTarget.getAttribute('data-channel');
            switchChannel(channelId);
        });
    });
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

    console.log(`[NAV] Switching to channel: ${channelId}`);
    state.currentChannel = channelId;
    localStorage.setItem('klarka_last_channel', channelId);

    // Update Sidebar UI
    document.querySelectorAll('.channel-link').forEach(l => {
        l.classList.remove('active', 'bg-[#36393f]', 'text-white');
        l.classList.add('text-[#b9bbbe]');
        if (l.getAttribute('data-channel') === channelId) {
            l.classList.add('active', 'bg-[#36393f]', 'text-white');
            l.classList.remove('text-[#b9bbbe]');
        }
    });

    // Icons/Header
    if (typeof window.renderLevelUI === 'function') window.renderLevelUI();
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    updateChannelHeader(channelId);

    // Render Content
    const container = document.getElementById("messages-container");
    if (container) container.innerHTML = "";

    // Centralized Realtime Cleanup
    const cleanups = [
        'achCleanup', 'dailyCleanup', 'bucketCleanup', 'whoCleanup', 'drawCleanup',
        'cleanupQuestsRealtime', 'calendarCleanup', 'timelineCleanup'
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
        case 'movies':
        case 'series':
        case 'games':
            import('./state.js').then(s => s.ensureLibraryData()).then(() => moduleMap.library().then(m => m.renderLibrary(channelId))).catch(navErr);
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
        case 'settings':
            moduleMap.settings().then(m => m.renderSettings()).catch(navErr);
            break;
        case 'regenerace':
            moduleMap.regenerace().then(m => m.renderRegenerace()).catch(navErr);
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
