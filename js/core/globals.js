import { triggerConfetti, triggerHaptic } from './utils.js';
import { toggleTheme, showNotification, toggleValentineMode } from './theme.js';
import { switchChannel } from './router.js';
import { toggleUserPopout, toggleMobileMenu } from './app-ui.js';
import { handleLogin } from './auth-handler.js';

window.loadModule = (name) => {
    switch(name) {
        // Core
        case 'ai_helper': return import('./ai_helper.js');
        case 'auth': return import('./auth.js');
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
        case 'globals': return import('./globals.js');
        // Modules
        case 'achievements': return import('../modules/achievements.js');
        case 'bucketlist': return import('../modules/bucketlist.js');
        case 'calendar': return import('../modules/calendar.js');
        case 'confession': return import('../modules/confession.js');
        case 'coupleQuiz': return import('../modules/coupleQuiz.js');
        case 'dailyQuestions': return import('../modules/dailyQuestions.js');
        case 'dashboard': return import('../modules/dashboard.js');
        case 'drawGallery': return import('../modules/drawGallery.js');
        case 'flashcards': return import('../modules/flashcards.js');
        case 'funfacts': return import('../modules/funfacts.js');
        case 'gameDraw': return import('../modules/gameDraw.js');
        case 'gameWho': return import('../modules/gameWho.js');
        case 'games': return import('../modules/games.js');
        case 'gamesHub': return import('../modules/gamesHub.js');
        case 'health': return import('../modules/health.js');
        case 'health_ui': return import('../modules/dashboard/health_ui.js');
        case 'highlighter': return import('../modules/highlighter.js');
        case 'letters': return import('../modules/letters.js');
        case 'library': return import('../modules/library.js');
        case 'map': return import('../modules/map.js');
        case 'matura': return import('../modules/matura.js');
        case 'profile': return import('../modules/profile.js');
        case 'progress': return import('../modules/progress.js');
        case 'quests': return import('../modules/quests.js');
        case 'quiz': return import('../modules/quiz.js');
        case 'regenerace': return import('../modules/regenerace.js');
        case 'restore': return import('../modules/restore.js');
        case 'search': return import('../modules/search.js');
        case 'settings': return import('../modules/settings.js');
        case 'spaced_repetition': return import('../modules/spaced_repetition.js');
        case 'stats': return import('../modules/stats.js');
        case 'tierlist': return import('../modules/tierlist.js');
        case 'timeline': return import('../modules/timeline.js');
        case 'topics': return import('../modules/topics.js');
        case 'watchlist': return import('../modules/watchlist.js');
        default: console.error('Unknown loadModule request:', name); return Promise.reject(new Error('Module not found'));
    }
};

export function exposeGlobals() {
    window.switchChannel = switchChannel;
    window.triggerConfetti = triggerConfetti;
    window.triggerHaptic = triggerHaptic;
    window.toggleTheme = toggleTheme;
    window.toggleValentineMode = toggleValentineMode;
    window.showNotification = showNotification;

    // UI Toggles
    window.toggleUserPopout = toggleUserPopout;
    window.toggleMobileMenu = toggleMobileMenu;
    window.handleLogin = handleLogin;

    // Modals & form
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
        if (id === 'gallery-modal' && window.Timeline && window.Timeline.closeGallery) window.Timeline.closeGallery();
    };

    // Library Lazy Functions
    const libraryFn = (fn) => (...args) => {
        if (window.Library && window.Library[fn]) return window.Library[fn](...args);
        return import('../modules/library.js').then(m => m[fn](...args));
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
    const confessionFn = (fn) => (...args) => import('../modules/confession.js').then(m => m[fn](...args));
    window.startConfession = confessionFn('startConfession');
    window.responseYes = confessionFn('responseYes');
    window.responseNo = confessionFn('responseNo');

    // Topics Lazy Functions
    const topicsFn = (fn) => (...args) => {
        if (window.Topics && window.Topics[fn]) return window.Topics[fn](...args);
        return import('../modules/topics.js').then(m => m[fn](...args));
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
        return import('../modules/calendar.js').then(m => m[fn](...args));
    };
    window.showDayDetail = calendarFn('showDayDetail');
    window.closeDayModal = calendarFn('closeDayModal');
    window.addSchoolEvent = calendarFn('addSchoolEvent');
    window.deleteSchoolEvent = calendarFn('deleteSchoolEvent');

    // Timeline Lazy Functions
    const timelineFn = (fn) => (...args) => {
        if (window.Timeline && window.Timeline[fn]) return window.Timeline[fn](...args);
        return import('../modules/timeline.js').then(m => m[fn](...args));
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
    window.renderGlobalSearch = (...args) => import('../modules/search.js').then(m => m.renderGlobalSearch(...args));

    // Map Lazy Functions
    window.selectLocation = (...args) => {
        if (window.KiscordMap && window.KiscordMap.selectLocation) return window.KiscordMap.selectLocation(...args);
        return import('../modules/map.js').then(m => m.selectLocation(...args));
    };

    // Health (for dashboard inline handlers)
    const healthFn = (fn) => (...args) => import('../modules/health.js').then(m => m[fn](...args));
    window.updateHealth = healthFn('updateHealth');
    window.updateBedtime = healthFn('updateBedtime');
    window.startSleep = healthFn('startSleep');
    window.wakeUp = healthFn('wakeUp');
    window.startSleepTimer = healthFn('startSleepTimer');

    // Dashboard Functions (imported at top in main, but accessed globally... wait, we need to bind these properly)
    window.updateMoodVisuals = (...args) => import('../modules/dashboard.js').then(m=>m.updateMoodVisuals(...args));
    window.updateSleep = (...args) => import('../modules/dashboard.js').then(m=>m.updateSleep(...args));
    window.refreshDashboardFact = (...args) => import('../modules/dashboard.js').then(m=>m.refreshDashboardFact(...args));
    window.handleWelcomeChat = (...args) => import('../modules/dashboard.js').then(m=>m.handleWelcomeChat(...args));
    window.renderDashboard = (...args) => import('../modules/dashboard.js').then(m=>m.renderDashboard(...args));

    // Achievements
    window.toggleAchievement = (...args) => import('../modules/achievements.js').then(m => m.toggleAchievement(...args));

    // Watchlist
    window.rollTheDice = () => {
        if (window.Watchlist && window.Watchlist.rollTheDice) return window.Watchlist.rollTheDice();
        return import('../modules/watchlist.js').then(m => m.rollTheDice());
    };

    // Extra Timeline
    window.renderTimeline = timelineFn('renderTimeline');

    // Migration
    import('../migration.js').then(m => {
        window.migrateStaticContentToSupabase = m.migrateStaticContentToSupabase;
    });
}
