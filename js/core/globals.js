import { triggerConfetti, triggerHaptic } from './utils.js';
import { toggleTheme, showNotification, toggleValentineMode } from './theme.js';
import { switchChannel } from './router.js';
import { toggleUserPopout, toggleMobileMenu } from './app-ui.js';
import { handleLogin } from './auth-handler.js';
import { state } from './state.js';
import { renderSkeletonLoader, renderMetricCard, closeModal } from './ui.js';
import { openCommandPalette, closeCommandPalette } from './command-palette.js';
import { initKiscordNamespace } from './actions/namespace.js';
import { ActionDispatcher } from './actions/dispatcher.js';

export { ActionDispatcher, initKiscordNamespace };

window.loadModule = (name) => {
    switch(name) {
        // Core
        case 'ai_helper': return import('./ai_helper.js');
        case 'auth': return import('./auth.js');
        case 'commandPalette': return import('./command-palette.js');
        case 'loader': return import('./loader.js');
        case 'migration': return import('../migration.js');
        case 'notifications': return import('./notifications.js');
        case 'offline': return import('./offline.js');
        case 'state': return import('./state.js');
        case 'supabase': return import('./supabase.js');
        case 'sync': return import('./sync.js');
        case 'theme': return import('./theme.js');
        case 'ui': return import('./ui.js');
        case 'utils': return import('./utils.js');
        case 'router': return import('./router.js');
        case 'app-ui': return import('./app-ui.js');
        case 'auth-handler': return import('./auth-handler.js');
        case 'globals': return Promise.resolve({ ActionDispatcher, initKiscordNamespace, exposeGlobals });
        // Modules
        case 'achievements': return import('../domains/entertainment/achievements.js');
        case 'bucketlist': return import('../domains/lifestyle/bucketlist.js');
        case 'calendar': return import('../domains/lifestyle/calendar/index.js');
        case 'confession': return import('../domains/couple/confession.js');
        case 'coupleQuiz': return import('../domains/couple/couple-quiz.js');
        case 'coupleWrapped': return import('../domains/couple/wrapped/index.js');
        case 'dailyQuestions': return import('../domains/couple/daily-questions.js');
        case 'dashboard': return import('../domains/lifestyle/dashboard/index.js');
        case 'drawGallery': return import('../domains/entertainment/draw-gallery.js');
        case 'financeTracker': return import('../domains/archive/finance/index.js');
        case 'flashcards': return import('../domains/entertainment/flashcards.js');
        case 'funfacts': return import('../domains/entertainment/funfacts.js');
        case 'gameDraw': return import('../domains/entertainment/game-draw/index.js');
        case 'gameWho': return import('../domains/entertainment/game-who.js');
        case 'games': return import('../domains/entertainment/games.js');
        case 'gamesHub': return import('../domains/entertainment/games-hub.js');
        case 'gym': return import('../domains/fitness/gym/index.js');
        case 'health': return import('../domains/fitness/health.js');
        case 'health_ui': return import('../domains/lifestyle/dashboard/health_ui.js');
        case 'highlighter': return import('../domains/entertainment/highlighter.js');
        case 'letters': return import('../domains/couple/letters/index.js');
        case 'library': return import('../domains/entertainment/library/index.js');
        case 'loveShop': return import('../domains/couple/love-shop/index.js');
        case 'manual': return import('../domains/system/manual/index.js');
        case 'map': return import('../domains/lifestyle/date-planner/index.js');
        case 'matura': return import('../domains/university/matura/index.js');
        case 'profile': return import('../domains/system/profile.js');
        case 'progress': return import('../domains/system/progress.js');
        case 'quests': return import('../domains/entertainment/quests.js');
        case 'quiz': return import('../domains/entertainment/quiz.js');
        case 'regenerace': return import('../domains/fitness/regenerace.js');
        case 'restore': return import('../domains/archive/restore.js');
        case 'search': return import('../domains/system/search.js');
        case 'settings': return import('../domains/system/settings/index.js');
        case 'spaced_repetition': return import('../domains/entertainment/spaced-repetition.js');
        case 'stats': return import('../domains/entertainment/stats.js');
        case 'studyPlanner': return import('../domains/university/study-planner/index.js');
        case 'tierlist': return import('../domains/entertainment/tierlist/index.js');
        case 'timeline': return import('../domains/lifestyle/timeline/index.js');
        case 'topics': return import('../domains/couple/topics/index.js');
        case 'watchlist': return import('../domains/entertainment/watchlist.js');
        case 'kasicka': return import('../domains/archive/kasicka.js');
        case 'alpskaVyzva': return import('../domains/archive/alpska-vyzva/index.js');
        case 'alpskyDenicek': return import('../domains/archive/alpsky-denicek.js');
        default: console.error('Unknown loadModule request:', name); return Promise.reject(new Error('Module not found'));
    }
};

export function exposeGlobals() {
    initKiscordNamespace();

    window.state = state;
    window.switchChannel = switchChannel;
    window.triggerConfetti = triggerConfetti;
    window.triggerHaptic = triggerHaptic;
    window.toggleTheme = toggleTheme;
    window.toggleValentineMode = toggleValentineMode;
    window.showNotification = showNotification;
    window.renderSkeletonLoader = renderSkeletonLoader;
    window.renderMetricCard = renderMetricCard;
    window.openCommandPalette = openCommandPalette;
    window.closeCommandPalette = closeCommandPalette;

    // UI Toggles
    window.toggleUserPopout = toggleUserPopout;
    window.toggleMobileMenu = toggleMobileMenu;
    window.handleLogin = handleLogin;

    // Modals & form
    window.closeModal = closeModal;

    // Library Lazy Functions
    const libraryFn = (fn) => (...args) => {
        if (window.Library && window.Library[fn]) return window.Library[fn](...args);
        return import('../domains/entertainment/library/index.js').then(m => m[fn](...args));
    };
    window.openDownloadModal = libraryFn('openDownloadModal');
    window.openMagnetLink = libraryFn('openMagnetLink');
    window.openGoogleDrive = libraryFn('openGoogleDrive');
    window.toggleWatchlist = libraryFn('toggleWatchlist');
    window.playTrailer = libraryFn('playTrailer');
    window.openHistoryModal = libraryFn('openHistoryModal');
    window.setHistoryStatus = libraryFn('setHistoryStatus');
    window.setReactionInput = libraryFn('setReactionInput');
    window.saveHistory = libraryFn('saveHistory');
    window.exportWatchlist = libraryFn('exportWatchlist');
    window.clearWatchlist = libraryFn('clearWatchlist');
    window.openPlanningModal = libraryFn('openPlanningModal');
    window.confirmLibraryPlan = libraryFn('confirmLibraryPlan');

    // Confession Lazy Functions
    const confessionFn = (fn) => (...args) => import('../domains/couple/confession.js').then(m => m[fn](...args));
    window.startConfession = confessionFn('startConfession');
    window.responseYes = confessionFn('responseYes');
    window.responseNo = confessionFn('responseNo');

    // Topics Lazy Functions
    const topicsFn = (fn) => (...args) => {
        if (window.Topics && window.Topics[fn]) return window.Topics[fn](...args);
        return import('../domains/couple/topics/index.js').then(m => m[fn](...args));
    };
    window.closeTopicModal = topicsFn('closeTopicModal');
    window.toggleViewBookmarks = topicsFn('toggleViewBookmarks');
    window.toggleQuestionBookmark = topicsFn('toggleQuestionBookmark');
    window.prevQuestion = topicsFn('prevQuestion');
    window.nextQuestion = topicsFn('nextQuestion');
    window.markQuestionDone = topicsFn('markQuestionDone');
    window.confirmResetTopic = topicsFn('confirmResetTopic');

    // Calendar Lazy Functions
    const calendarFn = (fn) => (...args) => {
        if (window.Calendar && window.Calendar[fn]) return window.Calendar[fn](...args);
        return import('../domains/lifestyle/calendar/index.js').then(m => m[fn](...args));
    };
    window.showDayDetail = calendarFn('showDayDetail');
    window.closeDayModal = calendarFn('closeDayModal');
    window.addSchoolEvent = calendarFn('addSchoolEvent');
    window.deleteSchoolEvent = calendarFn('deleteSchoolEvent');

    // Timeline Lazy Functions
    const timelineFn = (fn) => (...args) => {
        if (window.Timeline && window.Timeline[fn]) return window.Timeline[fn](...args);
        return import('../domains/lifestyle/timeline/index.js').then(m => m[fn](...args));
    };
    window.openGallery = timelineFn('openGallery');
    window.closeGallery = timelineFn('closeGallery');
    window.changeGalleryImage = timelineFn('changeGalleryImage');
    window.uploadPhoto = timelineFn('uploadPhoto');
    window.deleteCurrentPhoto = timelineFn('deleteCurrentPhoto');
    window.confirmDeletePhoto = timelineFn('confirmDeletePhoto');
    window.saveHighlight = timelineFn('saveHighlight');
    window.toggleMilestone = timelineFn('toggleMilestone');
    window.toggleTimelineCard = timelineFn('toggleTimelineCard');
    window.openEventModal = timelineFn('openEventModal');
    window.closeEventModal = timelineFn('closeEventModal');
    window.saveEvent = timelineFn('saveEvent');
    window.deleteEvent = timelineFn('deleteEvent');
    window.jumpToTimeline = timelineFn('jumpToTimeline');
    window.searchTimeline = timelineFn('searchTimeline');
    window.renderGlobalSearch = (...args) => import('../domains/system/search.js').then(m => m.renderGlobalSearch(...args));

    // Map Lazy Functions
    window.selectLocation = (...args) => {
        if (window.KiscordMap && window.KiscordMap.selectLocation) return window.KiscordMap.selectLocation(...args);
        return import('../domains/lifestyle/date-planner/index.js').then(m => m.selectLocation(...args));
    };

    // Health (for dashboard inline handlers)
    const healthFn = (fn) => (...args) => import('../domains/fitness/health.js').then(m => m[fn](...args));
    window.updateHealth = healthFn('updateHealth');
    window.updateBedtime = healthFn('updateBedtime');
    window.startSleep = healthFn('startSleep');
    window.wakeUp = healthFn('wakeUp');
    window.startSleepTimer = healthFn('startSleepTimer');

    // Dashboard Functions (imported at top in main, but accessed globally... wait, we need to bind these properly)
    window.updateMoodVisuals = (...args) => import('../domains/lifestyle/dashboard/index.js').then(m=>m.updateMoodVisuals(...args));
    window.updateSleep = (...args) => import('../domains/lifestyle/dashboard/index.js').then(m=>m.updateSleep(...args));
    window.refreshDashboardFact = (...args) => import('../domains/lifestyle/dashboard/index.js').then(m=>m.refreshDashboardFact(...args));
    window.handleWelcomeChat = (...args) => import('../domains/lifestyle/dashboard/index.js').then(m=>m.handleWelcomeChat(...args));
    window.renderDashboard = (...args) => import('../domains/lifestyle/dashboard/index.js').then(m=>m.renderDashboard(...args));

    // Achievements
    window.toggleAchievement = (...args) => import('../domains/entertainment/achievements.js').then(m => m.toggleAchievement(...args));

    // Watchlist
    window.rollTheDice = () => {
        if (window.Watchlist && window.Watchlist.rollTheDice) return window.Watchlist.rollTheDice();
        return import('../domains/entertainment/watchlist.js').then(m => m.rollTheDice());
    };

    // Extra Timeline
    window.renderTimeline = timelineFn('renderTimeline');

    // Migration
    import('../migration.js').then(m => {
        window.migrateStaticContentToSupabase = m.migrateStaticContentToSupabase;
    });
}
