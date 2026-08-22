import { state, saveStateToCache } from './state.js';
import { triggerHaptic } from './utils.js';

/**
 * @typedef {Object} ChannelItem
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} [type]
 * @property {string} [color]
 * @property {string} [desc]
 */

/**
 * @typedef {Object} ServerCategory
 * @property {string} name
 * @property {ChannelItem[]} items
 */

/**
 * @typedef {Object} ServerDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} shortName
 * @property {string} icon
 * @property {string} color
 * @property {string} [gradient]
 * @property {string} [badgeColor]
 * @property {string} defaultChannel
 * @property {string} description
 * @property {ServerCategory[]} categories
 */

/** @type {ServerDefinition[]} */
export const serverDefinitions = [
    {
        id: 'home',
        name: 'Kiscord Hub',
        shortName: 'DM',
        icon: '<i class="fab fa-discord"></i>',
        color: '#5865F2',
        gradient: 'linear-gradient(135deg, #5865F2, #7289DA)',
        defaultChannel: 'dashboard',
        description: 'Domovský přehled, kalendář a denní rutina ❤️',
        categories: [
            {
                name: '📌 HLAVNÍ PŘEHLED',
                items: [
                    { id: 'dashboard', name: 'Můj Den', icon: '<i class="fas fa-heart"></i>', color: '#eb459e', desc: 'Tvůj osobní přehled a zdraví ❤️' },
                    { id: 'calendar', name: 'Kalendář', icon: '<i class="fas fa-calendar-alt"></i>', color: '#5865F2', desc: 'Plánování našich akcí a školy 📅' },
                    { id: 'welcome', name: 'uvítání', icon: '<i class="fas fa-door-open"></i>', color: '#99aab5', desc: 'Vítejte na našem soukromém serveru! ❤️' }
                ]
            },
            {
                name: '⚡ RYCHLÉ AKCE',
                items: [
                    { id: 'habits', name: 'návyky', icon: '<i class="fas fa-check-circle"></i>', color: '#3ba55c', desc: 'Sledování denních návyků & odměny v Love Coins 🌿' },
                    { id: 'daily-questions', name: 'denní-otázky', icon: '<i class="fas fa-question-circle"></i>', color: '#99aab5', desc: 'Každý den nová otázka pro nás dva. 🤔' },
                    { id: 'stats', name: 'statistiky', icon: '<i class="fas fa-chart-bar"></i>', color: '#faa61a', desc: 'Čísla našeho vztahu.' }
                ]
            }
        ]
    },
    {
        id: 'love',
        name: 'Náš Svět & Láska',
        shortName: 'LOVE',
        icon: '<i class="fas fa-heart"></i>',
        color: '#eb459e',
        gradient: 'linear-gradient(135deg, #eb459e, #853ee6)',
        defaultChannel: 'love-shop',
        description: 'Láskyplný obchůdek, haptické doteky, vzpomínky a rande 💖',
        categories: [
            {
                name: '🎁 LÁSKA & ZÁŽITKY',
                items: [
                    { id: 'love-shop', name: 'obchůdek', icon: '<i class="fas fa-store"></i>', color: '#faa61a', desc: 'Láskyplný obchůdek a spížka na kupóny. 🪙🎁' },
                    { id: 'dotek', name: 'dotek-na-dálku', icon: '<i class="fas fa-heartbeat"></i>', color: '#eb459e', desc: 'Haptic Touchpad & přenos tlukotu srdce v reálném čase 🫀' },
                    { id: 'dateplanner', name: 'plánovač-rande', icon: '<i class="fas fa-map-marker-alt"></i>', color: '#3ba55c', desc: 'Kam vyrazíme příště?🥂' },
                    { id: 'bucketlist', name: 'bucket-list', icon: '<i class="fas fa-rocket"></i>', color: '#ed4245', desc: 'Všechno, co spolu chceme zažít! ✨' },
                    { id: 'quests', name: 'společné-questy', icon: '<i class="fas fa-shield-alt"></i>', color: '#faa61a', desc: 'Naše společné cíle a progress. 💪' }
                ]
            },
            {
                name: '💌 VZPOMÍNKY & POVÍDÁNÍ',
                items: [
                    { id: 'timeline', name: 'timeline', icon: '<i class="fas fa-history"></i>', color: '#eb459e', desc: 'Naše nejhezčí společné chvilky 🎞️' },
                    { id: 'letters', name: 'dopisy', icon: '<i class="fas fa-envelope-open-text"></i>', color: '#eb459e', desc: 'Vzkazy v láhvi, které se otevřou v čas 💌' },
                    { id: 'daily-questions', name: 'denní-otázky', icon: '<i class="fas fa-question-circle"></i>', color: '#99aab5', desc: 'Každý den nová otázka pro nás dva. 🤔' },
                    { id: 'topics', name: 'témata', icon: '<i class="fas fa-comments"></i>', color: '#faa61a', desc: 'Když nevíme, o čem si povídat... 🥰' },
                    { id: 'achievements', name: 'achievementy', icon: '<i class="fas fa-trophy"></i>', color: '#faa61a', desc: 'Co všechno jsme už dokázali? ⭐' },
                    { id: 'confession', name: 'přiznání', icon: '<i class="fas fa-mask"></i>', color: '#99aab5', desc: 'Anonymní a upřímná přiznání 🤫' }
                ]
            }
        ]
    },
    {
        id: 'fitness',
        name: 'Zdraví & Fitness',
        shortName: 'GYM',
        icon: '<i class="fas fa-dumbbell"></i>',
        color: '#3ba55c',
        gradient: 'linear-gradient(135deg, #3ba55c, #14b8a6)',
        defaultChannel: 'gym-tracker',
        description: 'Logování tréninků, maximálky, návyky a suplementy 🏋️‍♂️💪',
        categories: [
            {
                name: '🏋️‍♂️ TRÉNINK & SÍLA',
                items: [
                    { id: 'gym-tracker', name: 'posilovna', icon: '<i class="fas fa-dumbbell"></i>', color: '#faa61a', desc: 'Logování tréninků a sledování maximálek 🏋️‍♂️💪' },
                    { id: 'habits', name: 'návyky', icon: '<i class="fas fa-check-circle"></i>', color: '#3ba55c', desc: 'Sledování denních návyků & odměny v Love Coins 🌿' }
                ]
            },
            {
                name: '🥗 TĚLO & REGENERACE',
                items: [
                    { id: 'nutrition', name: 'výživa', icon: '<i class="fas fa-apple-alt"></i>', color: '#14b8a6', desc: 'Nutriční tracker, kalorie, makra & oblíbená jídla 🥗🥑' },
                    { id: 'body-metrics', name: 'tělo-a-míry', icon: '<i class="fas fa-ruler-combined"></i>', color: '#3ba55c', desc: 'Sledování váhy, tělesných obvodů & biometrie ⚖️📐' },
                    { id: 'regenerace', name: 'regenerace', icon: '<i class="fas fa-leaf"></i>', color: '#3ba55c', desc: 'Proč a jak brát suplementy. 🌿' }
                ]
            }
        ]
    },
    {
        id: 'fit',
        name: 'VUT FIT & Koleje',
        shortName: 'FIT',
        icon: '<i class="fas fa-graduation-cap"></i>',
        color: '#5865F2',
        gradient: 'linear-gradient(135deg, #5865F2, #853ee6)',
        defaultChannel: 'schedule',
        description: 'Rozvrh hodin, zkouškový plán, koleje a studentské finance 🎓',
        categories: [
            {
                name: '📚 STUDIUM FIT',
                items: [
                    { id: 'schedule', name: 'rozvrh', icon: '<i class="fas fa-calendar-week"></i>', color: '#5865F2', desc: 'Náš společný rozvrh na VUT FIT 📚' },
                    { id: 'study-planner', name: 'studijní-plán', icon: '<i class="fas fa-tasks"></i>', color: '#3ba55c', desc: 'Zkoušky, WIS body a projekty 🎯' },
                    { id: 'laptop-comparison', name: 'počítač', icon: '<i class="fas fa-laptop"></i>', color: '#faa61a', desc: 'Průvodce a srovnání notebooků na VUT FIT 💻✨' }
                ]
            },
            {
                name: '🏢 BRNO & FINANCE',
                items: [
                    { id: 'dorm-hub', name: 'koleje-brno', icon: '<i class="fas fa-building"></i>', color: '#faa61a', desc: 'Prádelník, checklist na pokoj & menzy 🏢' },
                    { id: 'finance-tracker', name: 'finance', icon: '<i class="fas fa-wallet"></i>', color: '#faa61a', desc: 'Osobní rozpočet, kolej & spoření 💶🐖' }
                ]
            }
        ]
    },
    {
        id: 'media',
        name: 'Zábava & Média',
        shortName: 'FUN',
        icon: '<i class="fas fa-gamepad"></i>',
        color: '#faa61a',
        gradient: 'linear-gradient(135deg, #faa61a, #ed4245)',
        defaultChannel: 'library',
        description: 'Filmy, seriály, společné hry, duely a vibes playlist 🍿🎮',
        categories: [
            {
                name: '🍿 MÉDIA & HUDBA',
                items: [
                    { id: 'library', name: 'knihovna', icon: '<i class="fas fa-film"></i>', color: '#5865F2', desc: 'Filmy, seriály, hry & katalog 🍿🎮' },
                    { id: 'watchlist', name: 'watchlist', icon: '<i class="fas fa-heart"></i>', color: '#eb459e', desc: 'Společná přání, Spolu-seznam & Tinder ❤️' },
                    { id: 'wrapped', name: 'couple-wrapped', icon: '<i class="fas fa-sparkles"></i>', color: '#faa61a', desc: 'Spotify-style rekapitulace vztahu & Stories karta 📊✨' },
                    { id: 'music', name: 'music-bot', icon: '<i class="fas fa-music"></i>', color: '#3ba55c', desc: 'Náš společný vibes playlist 🎧' }
                ]
            },
            {
                name: '🎲 HRY & DUELY',
                items: [
                    { id: 'rozhodovac', name: 'rozhodovací-aréna', icon: '<i class="fas fa-gavel"></i>', color: '#faa61a', desc: 'Kdo vybere jídlo, film či úkol? 1v1 duely a Kolo Osudu ⚔️🍕' },
                    { id: 'games-hub', name: 'gamesky', icon: '<i class="fas fa-gamepad"></i>', color: '#faa61a', desc: 'Herní Doupě – Kvízy, Draw Duel, Tetris, Puzzle & Tierlisty 🕹️' }
                ]
            }
        ]
    },
    {
        id: 'archive',
        name: 'Trezor & Archiv',
        shortName: 'ARC',
        icon: '<i class="fas fa-box-archive"></i>',
        color: '#ff5252',
        gradient: 'linear-gradient(135deg, #ff5252, #faa61a)',
        defaultChannel: 'kasicka',
        description: 'Vzpomínky na brigádu v Rakousku a maturitní příprava 🏔️🎓',
        categories: [
            {
                name: '🏔️ RAKOUSKO BRIGÁDA',
                items: [
                    { id: 'kasicka', name: 'rakousko-kasička', icon: '<i class="fas fa-piggy-bank"></i>', color: '#faa61a', desc: 'Původní brigádní finance a Schnitzel-O-Meter 💶🇦🇹' },
                    { id: 'austria-info', name: 'rakousko-info', icon: '<i class="fas fa-info-circle"></i>', color: '#ff5252', desc: 'Důležité informace a seznam věcí na brigádu 🏔️ℹ️' },
                    { id: 'shifts', name: 'plánovač-směn', icon: '<i class="fas fa-business-time"></i>', color: '#faa61a', desc: 'Slaďme naše směny a společné volno 📅' },
                    { id: 'austrian-german', name: 'rakouská-němčina', icon: '<i class="fas fa-utensils"></i>', color: '#eb459e', desc: 'Survival slovníček a flashcards pro Alpy 🏔️' },
                    { id: 'alpska-vyzva', name: 'alpské-výzvy', icon: '<i class="fas fa-mountain"></i>', color: '#3ba55c', desc: 'Každodenní alpské úkoly 🏔️' },
                    { id: 'alpsky-denicek', name: 'alpský-deníček', icon: '<i class="fas fa-journal-whills"></i>', color: '#eb459e', desc: 'Společný locked micro-journal 📔🔒' }
                ]
            },
            {
                name: '🎓 MATURITA',
                items: [
                    { id: 'matura-dashboard', name: 'matura-dashboard', icon: '<i class="fas fa-graduation-cap"></i>', color: '#eb459e', desc: 'Naše cesta ke svobodě! 🎓' },
                    { id: 'matura-czech', name: 'matura-čeština', icon: '<i class="fas fa-book"></i>', color: '#5865F2', desc: 'Rozbory děl a literatura.' },
                    { id: 'matura-it', name: 'matura-it', icon: '<i class="fas fa-laptop-code"></i>', color: '#3ba55c', desc: 'Data, sítě a algoritmy.' }
                ]
            }
        ]
    },
    {
        id: 'system',
        name: 'Systém & Nástroje',
        shortName: 'SYS',
        icon: '<i class="fas fa-cog"></i>',
        color: '#99aab5',
        gradient: 'linear-gradient(135deg, #4f545c, #202225)',
        defaultChannel: 'settings',
        description: 'Nastavení aplikace, statistiky, changelog a nápověda ⚙️',
        categories: [
            {
                name: '⚙️ SPRÁVA & STATISTIKY',
                items: [
                    { id: 'settings', name: 'nastavení', icon: '<i class="fas fa-cog"></i>', color: '#99aab5', desc: 'Přizpůsob si Kiscord podle sebe.' },
                    { id: 'stats', name: 'statistiky', icon: '<i class="fas fa-chart-bar"></i>', color: '#faa61a', desc: 'Čísla našeho vztahu.' },
                    { id: 'restore-data', name: 'obnova-dat', icon: '<i class="fas fa-history"></i>', color: '#5865F2', desc: 'Migrace historických záznamů 🛠️' }
                ]
            },
            {
                name: '📖 DOKUMENTACE & INFO',
                items: [
                    { id: 'changelog', name: 'changelog', icon: '<i class="fas fa-bullhorn"></i>', color: '#faa61a', desc: 'Historie změn a vylepšení v Kiscordu. 📢' },
                    { id: 'manual', name: 'návod', icon: '<i class="fas fa-book"></i>', color: '#99aab5', desc: 'Jak ovládat tuhle aplikaci.' },
                    { id: 'readme', name: 'README.md', icon: '<i class="fas fa-file-alt"></i>', color: '#99aab5', desc: 'Krásného Valentýna té nejúžasnější holce pod sluncem! ❤️' }
                ]
            }
        ]
    }
];

/**
 * Získá server definici podle serverId
 * @param {string} serverId 
 * @returns {ServerDefinition}
 */
export function getServerById(serverId) {
    return serverDefinitions.find(s => s.id === serverId) || serverDefinitions[0];
}

/**
 * Zjistí, do kterého serveru daný kanál patří
 * @param {string} channelId 
 * @returns {ServerDefinition}
 */
export function getServerForChannel(channelId) {
    if (!channelId) return serverDefinitions[0];

    // Check custom mapped server in state if any
    const customMap = state.settings?.sidebar?.channelServerMap || {};
    if (customMap[channelId]) {
        const found = serverDefinitions.find(s => s.id === customMap[channelId]);
        if (found) return found;
    }

    // Search across all server definitions
    for (const server of serverDefinitions) {
        for (const cat of server.categories) {
            if (cat.items.some(item => item.id === channelId)) {
                return server;
            }
        }
    }

    // Special aliases / sub-routes
    const aliases = {
        'movies': 'media',
        'series': 'media',
        'games': 'media',
        'tetris': 'media',
        'puzzle': 'media',
        'quiz': 'media',
        'game-who': 'media',
        'game-draw': 'media',
        'tierlist': 'media',
        'decision-matcher': 'media',
        'decision-arena': 'media',
        'funfacts': 'love',
        'map': 'love',
        'profile': 'system'
    };

    if (aliases[channelId]) {
        const found = serverDefinitions.find(s => s.id === aliases[channelId]);
        if (found) return found;
    }

    return serverDefinitions[0]; // Default to Home
}

/**
 * Vyrenderuje ikony serverů do levé lišty (#servers-container)
 */
export function renderServersList() {
    const container = document.getElementById('servers-container');
    if (!container) return;

    const currentServerId = state.currentServer || 'home';

    let html = '';

    serverDefinitions.forEach((server, index) => {
        const isActive = server.id === currentServerId;
        const isHome = server.id === 'home';

        html += `
            <div class="server-item-wrapper relative w-full flex items-center justify-center py-1 group" data-server="${server.id}">
                <!-- Discord White Pill Indicator -->
                <div class="server-pill absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 pointer-events-none ${isActive ? 'h-10 opacity-100' : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'}"></div>
                
                <!-- Server Icon Button (Squircle Transition) -->
                <button type="button" 
                        class="server-icon-btn relative w-12 h-12 flex items-center justify-center transition-all duration-300 select-none cursor-pointer focus:outline-none ${isActive ? 'active rounded-[16px] text-white shadow-lg' : 'rounded-[24px] hover:rounded-[16px] text-[var(--text-normal)] hover:text-white bg-[var(--bg-primary)] hover:bg-[var(--bg-modifier-hover)]'}"
                        style="${isActive ? `background: ${server.gradient || server.color}; box-shadow: 0 4px 14px ${server.color}40;` : ''}"
                        onclick="window.switchServer && window.switchServer('${server.id}')"
                        title="${server.name}"
                        aria-label="${server.name}">
                    <span class="text-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                        ${server.icon}
                    </span>
                </button>

                <!-- Discord Tooltip Bubble -->
                <div class="server-tooltip hidden md:group-hover:flex absolute left-[78px] z-[100] px-3 py-1.5 rounded-lg bg-[#18191c]/95 backdrop-blur-md text-white text-xs font-bold whitespace-nowrap shadow-2xl border border-white/10 items-center pointer-events-none animate-fade-in">
                    <span>${server.name}</span>
                    <div class="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#18191c] border-l border-b border-white/10 rotate-45"></div>
                </div>
            </div>
        `;

        // Add divider separator after Home/DM server
        if (isHome) {
            html += `
                <div class="server-separator w-8 h-[2px] bg-[var(--border-subtle)] rounded my-1"></div>
            `;
        }
    });

    container.innerHTML = html;
}

/**
 * Efektivně aktualizuje stav aktivních pilulek a tříd na server ikonách bez nutnosti kompletního re-renderu
 * @param {string} activeServerId 
 */
export function updateServerActiveStates(activeServerId) {
    const wrappers = document.querySelectorAll('.server-item-wrapper');
    if (!wrappers || wrappers.length === 0) {
        renderServersList();
        return;
    }

    wrappers.forEach(wrapper => {
        const serverId = wrapper.getAttribute('data-server');
        const isActive = serverId === activeServerId;
        const pill = wrapper.querySelector('.server-pill');
        const btn = wrapper.querySelector('.server-icon-btn');
        const server = getServerById(serverId);

        if (pill) {
            if (isActive) {
                pill.classList.remove('h-0', 'opacity-0');
                pill.classList.add('h-10', 'opacity-100');
            } else {
                pill.classList.remove('h-10', 'opacity-100');
                pill.classList.add('h-0', 'opacity-0');
            }
        }

        if (btn) {
            if (isActive) {
                btn.classList.add('active', 'rounded-[16px]', 'text-white', 'shadow-lg');
                btn.classList.remove('rounded-[24px]', 'bg-[var(--bg-primary)]', 'text-[var(--text-normal)]');
                btn.style.background = server.gradient || server.color;
                btn.style.boxShadow = `0 4px 14px ${server.color}40`;
            } else {
                btn.classList.remove('active', 'rounded-[16px]', 'text-white', 'shadow-lg');
                btn.classList.add('rounded-[24px]', 'bg-[var(--bg-primary)]', 'text-[var(--text-normal)]');
                btn.style.background = '';
                btn.style.boxShadow = '';
            }
        }
    });
}
