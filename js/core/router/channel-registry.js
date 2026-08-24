import { state, saveStateToCache } from '../state.js';
import { triggerHaptic } from '../utils.js';
import { serverDefinitions } from '../servers.js';

export const DEFAULT_COLLAPSED_CATEGORIES = ['📦 ARCHIV', '⚙️ SYSTÉM & INFO'];

/** @type {import('../../types/state.js').ChannelCategory[]} */
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
            { id: 'health-engine', name: 'health-engine', icon: '<i class="fas fa-bolt"></i>', type: 'text', color: '#ec4899', desc: 'All-in-One Bento Grid Hub & Křížové korelace ⚡' },
            { id: 'sleep-tracker', name: 'spánek-a-sny', icon: '<i class="fas fa-moon"></i>', type: 'text', color: '#3b82f6', desc: 'Spánková efektivita, 90min cykly & párová synergie 🌙💤' },
            { id: 'cycle-tracker', name: 'menstruační-cyklus', icon: '<i class="fas fa-heart"></i>', type: 'text', color: '#ec4899', desc: 'Sledování cyklu, fází & párové soukromí 🌸' },
            { id: 'step-tracker', name: 'krokoměr', icon: '<i class="fas fa-shoe-prints"></i>', type: 'text', color: '#10b981', desc: 'Kroky, aktivní chůze & automatický sync 👟' },
            { id: 'biohacks', name: 'biohacks', icon: '<i class="fas fa-dna"></i>', type: 'text', color: '#8b5cf6', desc: 'Kofeinová křivka, půst & Recovery Index ☕⏳' },
            { id: 'gym-tracker', name: 'posilovna', icon: '<i class="fas fa-dumbbell"></i>', type: 'text', color: '#faa61a', desc: 'Logování tréninků a sledování maximálek 🏋️‍♂️💪' },
            { id: 'nutrition', name: 'výživa', icon: '<i class="fas fa-apple-alt"></i>', type: 'text', color: '#14b8a6', desc: 'Nutriční tracker, kalorie, makra & oblíbená jídla 🥗🥑' },
            { id: 'body-metrics', name: 'tělo-a-míry', icon: '<i class="fas fa-ruler-combined"></i>', type: 'text', color: '#3ba55c', desc: 'Sledování váhy, tělesných obvodů & biometrie ⚖️📐' },
            { id: 'habits', name: 'návyky', icon: '<i class="fas fa-check-circle"></i>', type: 'text', color: '#3ba55c', desc: 'Sledování denních návyků & odměny v Love Coins 🌿' },
            { id: 'regenerace', name: 'regenerace', icon: '<i class="fas fa-leaf"></i>', type: 'text', color: '#3ba55c', desc: 'Proč a jak brát suplementy. 🌿' }
        ]
    },
    {
        name: "💖 NÁŠ SVĚT & PŘÍBĚH",
        items: [
            { id: 'love-shop', name: 'obchůdek', icon: '<i class="fas fa-store"></i>', type: 'text', color: '#faa61a', desc: 'Láskyplný obchůdek a spížka na kupóny. 🪙🎁' },
            { id: 'dotek', name: 'dotek-na-dálku', icon: '<i class="fas fa-heartbeat"></i>', type: 'text', color: '#eb459e', desc: 'Haptic Touchpad & přenos tlukotu srdce v reálném čase 🫀' },
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
            { id: 'rozhodovac', name: 'rozhodovací-aréna', icon: '<i class="fas fa-gavel"></i>', type: 'text', color: '#faa61a', desc: 'Kdo vybere jídlo, film či úkol? 1v1 duely a Kolo Osudu ⚔️🍕' },
            { id: 'library', name: 'knihovna', icon: '<i class="fas fa-film"></i>', type: 'text', color: '#5865F2', desc: 'Filmy, seriály, hry & katalog 🍿🎮' },
            { id: 'watchlist', name: 'watchlist', icon: '<i class="fas fa-heart"></i>', type: 'text', color: '#eb459e', desc: 'Společná přání, Spolu-seznam & Tinder ❤️' },
            { id: 'wrapped', name: 'couple-wrapped', icon: '<i class="fas fa-sparkles"></i>', type: 'text', color: '#faa61a', desc: 'Spotify-style rekapitulace vztahu & Stories karta 📊✨' },
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
    } else if (typeof window !== 'undefined' && typeof window.renderChannels === 'function') {
        window.renderChannels();
    }
}

export function collapseAllCategories() {
    if (!state.settings) state.settings = {};
    if (!state.settings.sidebar) state.settings.sidebar = {};
    state.settings.sidebar.collapsedCategories = channelCategories.map(cat => cat.name);
    triggerHaptic('medium');
    saveStateToCache();
    if (typeof window !== 'undefined' && typeof window.renderChannels === 'function') {
        window.renderChannels();
    }
}

export function expandAllCategories() {
    if (!state.settings) state.settings = {};
    if (!state.settings.sidebar) state.settings.sidebar = {};
    state.settings.sidebar.collapsedCategories = [];
    triggerHaptic('medium');
    saveStateToCache();
    if (typeof window !== 'undefined' && typeof window.renderChannels === 'function') {
        window.renderChannels();
    }
}

export function getChannelItemById(channelId) {
    if (!channelId) return null;
    if (channelId === 'dashboard') return { id: 'dashboard', name: 'Můj Den', icon: '<i class="fas fa-heart"></i>', color: '#eb459e', desc: 'Tvůj osobní přehled a zdraví ❤️' };
    if (channelId === 'calendar') return { id: 'calendar', name: 'Kalendář', icon: '<i class="fas fa-calendar-alt"></i>', color: '#5865F2', desc: 'Plánování našich akcí a školy 📅' };
    if (channelId === 'love-shop') return { id: 'love-shop', name: 'obchůdek', icon: '<i class="fas fa-store"></i>', color: '#faa61a', desc: 'Láskyplný obchůdek a spížka na kupóny. 🪙🎁' };

    for (const cat of channelCategories) {
        const found = cat.items.find(i => i.id === channelId);
        if (found) return found;
    }
    for (const server of serverDefinitions) {
        for (const cat of server.categories) {
            const found = cat.items.find(i => i.id === channelId);
            if (found) return found;
        }
    }
    return null;
}

export function toggleFavoriteChannel(channelId) {
    if (!state.settings) state.settings = {};
    if (!state.settings.sidebar) state.settings.sidebar = {};
    if (!Array.isArray(state.settings.sidebar.favoriteChannels)) {
        state.settings.sidebar.favoriteChannels = ['dashboard', 'calendar', 'love-shop', 'gym-tracker'];
    }
    const favs = state.settings.sidebar.favoriteChannels;
    const idx = favs.indexOf(channelId);
    if (idx !== -1) {
        favs.splice(idx, 1);
        triggerHaptic('light');
    } else {
        favs.push(channelId);
        triggerHaptic('success');
    }
    saveStateToCache();
    if (typeof window !== 'undefined' && typeof window.renderChannels === 'function') {
        window.renderChannels();
    }
}

if (typeof window !== 'undefined') {
    window.toggleFavoriteChannel = toggleFavoriteChannel;
}
