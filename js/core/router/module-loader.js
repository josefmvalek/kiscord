/**
 * Kiscord Router Module Loader & Route Registry
 * Declarative route mapping, dynamic imports, lifecycle management and Error Boundary.
 */

import { unmountActiveModule, setActiveMount, CleanupCollector } from '../module-lifecycle.js';
import * as StaticPages from '../../domains/system/static.js';

/**
 * Type definition for a route definition.
 * @typedef {Object} RouteDefinition
 * @property {() => Promise<any>} loader - Dynamic import function
 * @property {(mod: any, container: HTMLElement, channelId: string, params?: Record<string, any>) => any} render - Module mount/render adapter
 */

/** @type {Record<string, RouteDefinition>} */
const ROUTE_REGISTRY = {
    // 1. Static Pages & Shell
    'welcome': {
        loader: () => import('../../domains/lifestyle/dashboard/index.js'),
        render: (m, c) => m.renderWelcome(c)
    },
    'readme': {
        loader: () => Promise.resolve(StaticPages),
        render: (m, c) => m.renderReadme(c)
    },
    'music': {
        loader: () => Promise.resolve(StaticPages),
        render: (m, c) => m.renderMusic(c)
    },
    'changelog': {
        loader: () => import('../../domains/system/changelog.js'),
        render: (m, c) => m.renderChangelog(c)
    },
    'manual': {
        loader: () => import('../../domains/system/manual/index.js'),
        render: (m, c) => m.renderManual(c)
    },
    'settings': {
        loader: () => import('../../domains/system/settings/index.js'),
        render: (m, c) => m.renderSettings(c)
    },
    'profile': {
        loader: () => import('../../domains/system/profile.js'),
        render: (m, c) => m.renderProfile(c)
    },
    'search': {
        loader: () => import('../../domains/system/search.js'),
        render: (m, c) => m.renderSearch(c)
    },

    // 2. Lifestyle & Overview
    'dashboard': {
        loader: () => import('../../domains/lifestyle/dashboard/index.js'),
        render: (m, c) => m.renderDashboard(c)
    },
    'calendar': {
        loader: () => import('../../domains/lifestyle/calendar/index.js'),
        render: (m) => m.renderCalendar()
    },
    'timeline': {
        loader: () => import('../../domains/lifestyle/timeline/index.js'),
        render: (m, c) => m.renderTimeline(c)
    },
    'dateplanner': {
        loader: () => import('../../domains/lifestyle/date-planner/index.js'),
        render: (m, c) => m.renderMap(c)
    },
    'map': {
        loader: () => import('../../domains/lifestyle/date-planner/index.js'),
        render: (m, c) => m.renderMap(c)
    },
    'habits': {
        loader: () => import('../../domains/lifestyle/habits.js'),
        render: (m, c) => m.renderHabits(c)
    },
    'bucketlist': {
        loader: () => import('../../domains/lifestyle/bucketlist.js'),
        render: (m, c) => m.renderBucketList(c)
    },

    // 3. Couple & Intimacy
    'love-shop': {
        loader: () => import('../../domains/couple/love-shop/index.js'),
        render: (m, c) => m.renderLoveShop(c)
    },
    'dotek': {
        loader: () => import('../../domains/couple/haptic-touch.js'),
        render: (m, c) => m.renderHapticTouch(c)
    },
    'daily-questions': {
        loader: () => import('../../domains/couple/daily-questions.js'),
        render: (m, c) => m.renderDailyQuestions(c)
    },
    'topics': {
        loader: () => import('../../domains/couple/topics/index.js'),
        render: (m, c) => m.renderTopics(c)
    },
    'letters': {
        loader: () => import('../../domains/couple/letters/index.js'),
        render: (m, c) => m.renderLetters(c)
    },
    'confession': {
        loader: () => import('../../domains/couple/confession.js'),
        render: (m, c) => m.renderConfession(c)
    },
    'couple-quiz': {
        loader: () => import('../../domains/couple/couple-quiz.js'),
        render: (m, c) => m.renderCoupleQuiz(c)
    },
    'wrapped': {
        loader: () => import('../../domains/couple/wrapped/index.js'),
        render: (m, c) => m.renderCoupleWrapped(c)
    },

    // 4. Fitness & Health
    'gym-tracker': {
        loader: () => import('../../domains/fitness/gym/index.js'),
        render: (m, c) => m.renderGym(c)
    },
    'nutrition': {
        loader: () => import('../../domains/fitness/nutrition/index.js'),
        render: (m, c) => m.renderNutrition(c)
    },
    'tdee-coach': {
        loader: () => import('../../domains/fitness/nutrition/tdee-coach.js'),
        render: (m, c) => m.renderTdeeCoach?.(c)
    },
    'body-metrics': {
        loader: () => import('../../domains/fitness/body-metrics/index.js'),
        render: (m, c) => m.renderBodyMetrics(c)
    },
    'tracking-hub': {
        loader: () => import('../../domains/fitness/tracking-hub/index.js'),
        render: (m, c) => m.renderTrackingHub(c)
    },
    'sleep-tracker': {
        loader: () => import('../../domains/fitness/sleep/index.js'),
        render: (m, c) => m.renderSleepTracker(c)
    },
    'cycle-tracker': {
        loader: () => import('../../domains/fitness/cycle/index.js'),
        render: (m, c) => m.renderCycleTracker(c)
    },
    'step-tracker': {
        loader: () => import('../../domains/fitness/step-tracker/index.js'),
        render: (m, c) => m.renderStepTracker(c)
    },
    'biohacks': {
        loader: () => import('../../domains/fitness/biohacks/index.js'),
        render: (m, c) => m.renderBioHacks(c)
    },
    'health': {
        loader: () => import('../../domains/fitness/health.js'),
        render: (m, c) => m.renderHealth(c)
    },
    'regenerace': {
        loader: () => import('../../domains/fitness/regenerace.js'),
        render: (m, c) => m.renderRegenerace(c)
    },

    // 5. University (VUT FIT)
    'schedule': {
        loader: () => import('../../domains/university/schedule.js'),
        render: (m, c) => m.renderSchedule(c)
    },
    'study-planner': {
        loader: () => import('../../domains/university/study-planner/index.js'),
        render: (m, c) => m.renderStudyPlanner(c)
    },
    'dorm-hub': {
        loader: () => import('../../domains/university/dorm-hub.js'),
        render: (m, c) => m.renderDormHub(c)
    },
    'laptop-comparison': {
        loader: () => import('../../domains/university/laptop-comparison.js'),
        render: (m, c) => m.renderLaptopComparison(c)
    },
    'finance-tracker': {
        loader: () => import('../../domains/archive/finance/index.js'),
        render: (m, c) => m.renderFinanceTracker(c)
    },
    'matura': {
        loader: () => import('../../domains/university/matura/index.js'),
        render: (m, c, ch) => m.renderMatura(ch, c)
    },

    // 6. Entertainment & Games
    'library': {
        loader: () => import('../../domains/entertainment/library/index.js'),
        render: (m, c, ch, params) => m.renderLibrary(params?.category || 'movies')
    },
    'watchlist': {
        loader: () => import('../../domains/entertainment/watchlist.js'),
        render: (m, c, ch, params) => m.renderWatchlist(typeof params?.category === 'string' ? params.category : null)
    },
    'netflix-matcher': {
        loader: () => import('../../domains/entertainment/netflix-matcher.js'),
        render: (m, c) => m.renderNetflixMatcher(c)
    },
    'decision-arena': {
        loader: () => import('../../domains/entertainment/decision-arena.js'),
        render: (m, c) => m.renderDecisionArena(c)
    },
    'decision-matcher': {
        loader: () => import('../../domains/entertainment/decision-matcher.js'),
        render: (m, c) => m.renderDecisionMatcher(c)
    },
    'tierlist': {
        loader: () => import('../../domains/entertainment/tierlist/index.js'),
        render: (m, c) => m.renderTierList(c)
    },
    'games-hub': {
        loader: () => import('../../domains/entertainment/games-hub.js'),
        render: (m, c) => m.renderGamesHub(c)
    },
    'games': {
        loader: () => import('../../domains/entertainment/games.js'),
        render: (m, c) => m.renderGames(c)
    },
    'puzzle': {
        loader: () => import('../../domains/entertainment/puzzle.js'),
        render: (m, c) => m.renderPuzzle(c)
    },
    'game-who': {
        loader: () => import('../../domains/entertainment/game-who.js'),
        render: (m, c) => m.renderGameWho(c)
    },
    'game-draw': {
        loader: () => import('../../domains/entertainment/game-draw/index.js'),
        render: (m, c) => m.renderGameDraw(c)
    },
    'draw-gallery': {
        loader: () => import('../../domains/entertainment/draw-gallery.js'),
        render: (m, c) => m.renderDrawGallery(c)
    },
    'flashcards': {
        loader: () => import('../../domains/entertainment/flashcards.js'),
        render: (m, c) => m.renderFlashcards(c)
    },
    'funfacts': {
        loader: () => import('../../domains/entertainment/funfacts.js'),
        render: (m, c) => m.renderFunFacts(c)
    },
    'quests': {
        loader: () => import('../../domains/entertainment/quests.js'),
        render: (m, c) => m.renderQuests(c)
    },
    'achievements': {
        loader: () => import('../../domains/entertainment/achievements.js'),
        render: (m, c) => m.renderAchievements(c)
    },
    'stats': {
        loader: () => import('../../domains/entertainment/stats.js'),
        render: (m, c) => m.renderStats(c)
    },

    // 7. Archive & Historical
    'shifts': {
        loader: () => import('../../domains/archive/shifts.js'),
        render: (m, c) => m.renderShifts(c)
    },
    'austrian-german': {
        loader: () => import('../../domains/archive/austrian-german.js'),
        render: (m, c) => m.renderAustrianGerman(c)
    },
    'austria-info': {
        loader: () => import('../../domains/archive/austria-info/index.js'),
        render: (m, c) => m.renderAustriaInfo(c)
    },
    'kasicka': {
        loader: () => import('../../domains/archive/kasicka.js'),
        render: (m, c) => m.renderKasicka(c)
    },
    'alpska-vyzva': {
        loader: () => import('../../domains/archive/alpska-vyzva/index.js'),
        render: (m, c) => m.renderAlpskaVyzva(c)
    },
    'alpsky-denicek': {
        loader: () => import('../../domains/archive/alpsky-denicek.js'),
        render: (m, c) => m.renderAlpskyDenicek(c)
    },
    'restore-data': {
        loader: () => import('../../domains/archive/restore.js'),
        render: (m, c) => m.renderRestoreData(c)
    }
};

/**
 * Channel alias resolution dictionary.
 * @type {Record<string, string>}
 */
const ROUTE_ALIASES = {
    'date-planner': 'dateplanner',
    'map': 'dateplanner',
    'finance': 'finance-tracker',
    'health-engine': 'tracking-hub',
    'spanek': 'sleep-tracker',
    'spanek-a-sny': 'sleep-tracker',
    'cyklus': 'cycle-tracker',
    'menstruacni-cyklus': 'cycle-tracker',
    'krokomer': 'step-tracker',
    'kroky': 'step-tracker',
    'telo-a-miry': 'body-metrics',
    'rozhodovac': 'decision-arena',
    'matura-dashboard': 'matura',
    'matura-czech': 'matura',
    'matura-it': 'matura'
};

/**
 * Backward-compatible moduleMap export.
 * @type {Record<string, () => Promise<any>>}
 */
export const moduleMap = new Proxy({}, {
    get(_, prop) {
        if (typeof prop !== 'string') return undefined;
        const targetKey = ROUTE_ALIASES[prop] || prop;
        const route = ROUTE_REGISTRY[targetKey];
        return route ? route.loader : undefined;
    },
    has(_, prop) {
        if (typeof prop !== 'string') return false;
        const targetKey = ROUTE_ALIASES[prop] || prop;
        return targetKey in ROUTE_REGISTRY;
    },
    ownKeys() {
        return Array.from(new Set([...Object.keys(ROUTE_REGISTRY), ...Object.keys(ROUTE_ALIASES)]));
    },
    getOwnPropertyDescriptor(_, prop) {
        return {
            enumerable: true,
            configurable: true,
            writable: false,
            value: this.get(_, prop)
        };
    }
});

/**
 * Renders an Error Boundary card in the container on navigation/mount failures.
 * @param {HTMLElement} container
 * @param {string} channelId
 * @param {Error|any} err
 */
function renderModuleErrorBoundary(container, channelId, err) {
    console.error(`[NAV] Navigation Error in channel '${channelId}':`, err);
    if (!container) return;

    container.innerHTML = `
        <div class="p-8 text-center flex flex-col items-center justify-center min-h-[50vh] animate-fade-in select-none">
            <div class="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center text-2xl mb-4 shadow-lg">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="text-xl font-black text-white mb-2 tracking-tight">Chyba při načítání modulu #${channelId}</h3>
            <p class="text-sm text-[var(--text-muted)] max-w-md mb-6 leading-relaxed">
                ${err?.message || 'Nastala neočekávaná chyba při vykreslování této sekce.'}
            </p>
            <div class="flex items-center gap-3">
                <button onclick="window.switchChannel ? window.switchChannel('${channelId}') : window.location.reload()" 
                        class="px-5 py-2.5 rounded-xl bg-[var(--blurple)] hover:bg-[var(--blurple-hover)] text-white font-bold text-xs transition shadow-md active:scale-95 flex items-center gap-2">
                    <i class="fas fa-redo text-xs"></i>
                    <span>Zkusit znovu</span>
                </button>
                <button onclick="window.switchChannel ? window.switchChannel('dashboard') : window.location.reload()" 
                        class="px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-normal)] font-bold text-xs border border-[var(--border-subtle)] transition active:scale-95">
                    Zpět na přehled
                </button>
            </div>
        </div>
    `;
}

/**
 * Executes cleanup and mounts the target module for a channel.
 * @param {string} channelId
 * @param {HTMLElement} container
 * @param {Record<string, any>} [params]
 */
export async function mountChannelModule(channelId, container, params = {}) {
    if (!container) return;

    // 1. Unmount currently active module & run cleanups
    unmountActiveModule();

    // 2. Resolve channel key and alias
    const resolvedKey = ROUTE_ALIASES[channelId] || channelId;
    const route = ROUTE_REGISTRY[resolvedKey] || ROUTE_REGISTRY['welcome'];

    try {
        const module = await route.loader();
        container.classList.remove('channel-content-fading');
        const cleanup = await route.render(module, container, channelId, params);

        if (typeof cleanup === 'function') {
            setActiveMount(cleanup);
        }
    } catch (err) {
        renderModuleErrorBoundary(container, channelId, err);
    }
}
