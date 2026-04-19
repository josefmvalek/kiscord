// Core imports (kept for initialization)
import { state, stateEvents, initializeState, resetLazyLoaders, ensureBucketListData, ensureLibraryData } from './core/state.js';
const APP_VERSION = '2.1.2'; // Service worker update v27

import { renderErrorState } from './core/ui.js';
window.renderErrorState = renderErrorState; // Global for easy access in modules
import { initTheme, toggleTheme, showNotification, toggleValentineMode } from './core/theme.js';
import { triggerConfetti, triggerHaptic } from './core/utils.js';
import { getAssetUrl } from './core/assets.js';
import { getCurrentUser, signIn, onAuthChange, isJosef, isKlarka } from './core/auth.js';
import {
    renderDashboard,
    updateMoodVisuals,
    updateSleep,
    refreshDashboardFact,
    handleWelcomeChat
} from './modules/dashboard.js';
import { setupQuestsRealtime, cleanupQuestsRealtime } from './modules/quests.js';
import { initLevels, renderLevelUI } from './modules/levels.js';
import { setupRealtimeSync } from './core/sync.js';
import { initNotifications } from './core/notifications.js';
import * as StaticPages from './modules/static.js';

// Lazy-loaded modules mapping (for better maintenance)
const moduleMap = {
    'calendar': () => import('./modules/calendar.js'),
    'timeline': () => import('./modules/timeline.js'),
    'library': () => import('./modules/library.js'),
    'topics': () => import('./modules/topics.js'),
    'games': () => import('./modules/games.js'),
    'confession': () => import('./modules/confession.js'),
    'health': () => import('./modules/health.js'),
    'bucketlist': () => import('./modules/bucketlist.js'),
    'achievements': () => import('./modules/achievements.js'),
    'daily-questions': () => import('./modules/dailyQuestions.js'),
    'game-who': () => import('./modules/gameWho.js'),
    'game-draw': () => import('./modules/gameDraw.js'),
    'funfacts': () => import('./modules/funfacts.js'),
    'map': () => import('./modules/map.js'),
    'search': () => import('./modules/search.js'),
    'profile': () => import('./modules/profile.js'),
    'tierlist': () => import('./modules/tierlist.js'),
    'stats': () => import('./modules/stats.js'),
    'matura': () => import('./modules/matura.js'),
    'restore-data': () => import('./modules/restore.js'),
    'settings': () => import('./modules/settings.js'),
    'regenerace': () => import('./modules/regenerace.js')
};


let lastUserId = null;

// --- AUTHENTICATION ---

async function handleAuthState(event, session) {
    const user = session?.user;
    const loginEl = document.getElementById('login-screen');
    const appEl = document.getElementById('app-interface');

    console.log(`[Auth] State Change: ${event}`, { hasUser: !!user });

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (user) {
            if (user.id === lastUserId) return;
            lastUserId = user.id;

            // Priority: Show the UI IMMEDIATELY
            if (loginEl) loginEl.style.display = 'none';
            if (appEl) {
                appEl.classList.add('show');
                appEl.classList.remove('opacity-0');
                appEl.classList.add('opacity-100');
            }
            updateUserProfileUI(user);

            try {
                // Critical background tasks
                await handleMigrations().catch(e => console.error("Migration Error:", e));
                await initializeState().catch(e => console.error("InitializeState Error:", e));
            } catch (err) {
                console.error("[Auth] Background Task Error:", err);
            }

            // Route to content
            const savedChannel = localStorage.getItem('klarka_last_channel');
            const defaultChannel = (savedChannel && savedChannel !== 'welcome') ? savedChannel : 'dashboard';
            
            console.log(`[Auth] Routing to ${defaultChannel}`);
            history.replaceState({ channel: defaultChannel }, "", "");
            switchChannel(defaultChannel, false);
        } else {
            // INITIAL_SESSION with no user means they are not logged in.
            // We must force the login screen to appear, in case a fake auth token hid it pre-emptively.
            if (loginEl) loginEl.style.display = 'flex';
            if (appEl) {
                appEl.classList.remove('show');
                appEl.classList.add('opacity-0');
            }
            lastUserId = null;
        }
    } else if (event === 'SIGNED_OUT') {
        if (loginEl) loginEl.style.display = 'flex';
        if (appEl) {
            appEl.classList.remove('show');
            appEl.classList.add('opacity-0');
        }
        lastUserId = null;
        resetLazyLoaders();
    }
}

// Register listener immediately at top level
onAuthChange(handleAuthState);

// Manual fallback for immediate session detection
getCurrentUser().then(user => {
    if (user && !lastUserId) {
        console.log('[Auth] Manual session detection');
        handleAuthState('INITIAL_SESSION', { user });
    }
});

// --- CONNECTIVITY ---

function setupConnectivityListeners() {
    const bannerId = 'offline-banner';

    const updateStatus = () => {
        const isOffline = !navigator.onLine;
        let banner = document.getElementById(bannerId);

        if (isOffline) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = bannerId;
                banner.className = 'fixed top-0 left-0 w-full z-[10000] bg-[#ed4245] text-white py-2 px-4 text-center text-xs font-bold shadow-lg animate-slide-down flex items-center justify-center gap-2';
                banner.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Jsi offline. Změny se nemusí uložit do databáze!</span>
                `;
                document.body.prepend(banner);

                showNotification("Jsi offline. Některé funkce nemusí fungovat ⚠️", "error");
                triggerHaptic('heavy');
            }
        } else {
            if (banner) {
                banner.classList.add('animate-banner-up');
                setTimeout(() => banner.remove(), 500);

                showNotification("Připojení obnoveno 📶", "success");
                triggerHaptic('success');
            }
        }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus(); // Initial check
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        // Zlepšení: Na localhostu SW vypneme, aby se změny projevovaly hned bez nutnosti bumpovat verzi.
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.unregister();
                    console.log('[Dev] Service Worker odhlášen pro localhost.');
                }
            });
        } else {
            navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed:', err));
        }
    }

    // 1. Initial State Setup (Static/Realtime)
    setupRealtimeSync();
    setupQuestsRealtime();
    initLevels();
    initTheme();
    initNotifications();
    renderChannels();
    checkAppUpdate();
    updateGlobalAssetsUI(); // Initial try


    // 2. Global Event Listeners (Navigation & System)
    setupNavigation();
    setupSearch();
    setupConnectivityListeners();

    // 3. History API Listener (Back button support)
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.channel) {
            console.log(`[NAV] Popstate: returning to ${event.state.channel}`);
            switchChannel(event.state.channel, false);
        } else {
            // Default to dashboard if no state
            switchChannel('dashboard', false);
        }
    });

    // 4. Expose Global Functions & Subscribe to assets
    stateEvents.on('assets', () => {
        updateGlobalAssetsUI();
        if (state.currentUser) updateUserProfileUI(state.currentUser);
    });
    exposeGlobals();
});

async function handleMigrations() {
    // 1. Initial migration from LocalStorage (v1-v4)
    if (!localStorage.getItem('klarka_migration_done')) {
        const { migrateLocalDataToSupabase } = await import('./migration.js');
        const migratedCount = await migrateLocalDataToSupabase();
        if (migratedCount > 0) {
            localStorage.setItem('klarka_migration_done', 'true');
            window.location.reload();
            return;
        }
    }

    // 2. Static content seeding (Non-destructive check)
    // Runs once to ensure Supabase has the default content if tables are empty
    if (!localStorage.getItem('klarka_static_migration_v5_done')) {
        const { migrateStaticContentToSupabase } = await import('./migration.js');
        await migrateStaticContentToSupabase();
        localStorage.setItem('klarka_static_migration_v5_done', 'true');
        // No reload needed here yet
    }

    // 3. Timeline Cleanup (Repair for the duplication bug)
    // Only runs once to remove redundant records while keeping user edits
    if (!localStorage.getItem('klarka_timeline_repair_v1_done')) {
        const { cleanupTimelineDuplicates } = await import('./migration.js');
        const count = await cleanupTimelineDuplicates();
        localStorage.setItem('klarka_timeline_repair_v1_done', 'true');
        if (count > 0) {
            console.log(`✨ Timeline repaired: Removed ${count} duplicates.`);
            window.location.reload(); // Reload to refresh state with clean data
            return;
        }
    }
}

function checkAppUpdate() {
    const lastVersion = localStorage.getItem('kiscord_app_version');
    if (lastVersion && lastVersion !== APP_VERSION) {
        console.log(`[System] App updated: ${lastVersion} -> ${APP_VERSION}`);
        
        // Notify user about update
        setTimeout(() => {
            showNotification(`🚀 Systém aktualizován na v${APP_VERSION}!`, 'success');
        }, 2000);
    }
    localStorage.setItem('kiscord_app_version', APP_VERSION);
}



// --- NAVIGATION ---

function setupNavigation() {
    document.querySelectorAll('.channel-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const channelId = e.currentTarget.getAttribute('data-channel');
            switchChannel(channelId);
        });
    });
}

// --- INFO RENDERERS ---



export async function handleLogin(form) {
    const errorEl = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = form.email.value;
    const password = form.password.value;

    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await signIn(email, password);
        triggerHaptic('success');
    } catch (err) {
        triggerHaptic('heavy');
        errorEl.textContent = "Chyba přihlášení: " + (err.message === "Invalid login credentials" ? "Nesprávný e-mail nebo heslo." : err.message);
        errorEl.classList.remove('hidden');
        form.querySelectorAll('input').forEach(i => i.classList.add('login-input-error'));
        setTimeout(() => {
            form.querySelectorAll('input').forEach(i => i.classList.remove('login-input-error'));
        }, 1000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Přihlásit se</span><i class="fas fa-arrow-right text-xs"></i>';
    }
}

export function updateUserProfileUI(user) {
    const sidebarName = document.getElementById('sidebar-user-name');
    const popoutName = document.getElementById('popout-user-name');
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const popoutAvatar = document.getElementById('popout-user-avatar');
    const bioParagraph = document.getElementById('popout-user-bio');

    const isMeJose = isJosef(user);
    const isMeKlarka = isKlarka(user);

    if (isMeJose) {
        const avatarUrl = getAssetUrl('jozka_profile');
        state.currentUser = { name: 'Jožka', email: user.email, id: user.id, avatar: avatarUrl };
        if (sidebarName) sidebarName.textContent = 'Jožka';
        if (popoutName) popoutName.textContent = 'Jožka';
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (popoutAvatar) popoutAvatar.src = avatarUrl;
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                Systémový Administrátor & Full-Stack Boyfriend<br />
                Třída: ENTP / Chaotický Mýval<br />
                Bio: 📍 Kunovice<br />
                ❄️ Status: Trvale studené ruce.<br />
                🛡️ Upozornění: Pravidelně potřebuje updatovat morální kodex.<br />
            `;
        }
    } else if (isMeKlarka) {
        const avatarUrl = getAssetUrl('klarka_profile');
        state.currentUser = { name: 'Klárka', email: user.email, id: user.id, avatar: avatarUrl };
        if (sidebarName) sidebarName.textContent = 'Klárka';
        if (popoutName) popoutName.textContent = 'Klárka';
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (popoutAvatar) popoutAvatar.src = avatarUrl;
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                Role: Vrchní Fact-Checker & QA Tester<br />
                Třída: Spirituální Sova<br />
                Bio: 📍 Rezidentka sporného území Podolí-Kunovice.<br />
                👀 Pasivní skill: Odmítá nosit brýle, přesto vidí všechny tvoje chyby.<br />
                🦴 Slabina: Vlastní kotníky (a sprchové kouty).<br />
                👸 Status: Královna mývalů.<br />
            `;
        }
    } else {
        const avatarUrl = getAssetUrl('app_kytka');
        state.currentUser = { name: 'Host', email: user.email, id: user.id, avatar: avatarUrl };
        if (sidebarName) sidebarName.textContent = 'Host (Admin)';
        if (popoutName) popoutName.textContent = 'Host';
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (popoutAvatar) popoutAvatar.src = avatarUrl;
        if (bioParagraph) bioParagraph.innerHTML = "Přihlášen jako externí administrátor. Vítejte v systému!";
    }
}

export function updateGlobalAssetsUI() {
    const serverIcon = document.getElementById('server-icon');
    const onlineJozka = document.getElementById('online-avatar-jozka');
    const onlineKlarka = document.getElementById('online-avatar-klarka');
    const readmeAvatar = document.getElementById('readme-jozka-avatar');

    if (serverIcon) serverIcon.src = getAssetUrl('server_icon');
    if (onlineJozka) onlineJozka.src = getAssetUrl('jozka_profile');
    if (onlineKlarka) onlineKlarka.src = getAssetUrl('klarka_profile');
    if (readmeAvatar) readmeAvatar.src = getAssetUrl('jozka_profile');
}

const channelCategories = [
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

function renderChannels() {
    const container = document.getElementById("channels-container");
    if (!container) return;

    let html = "";

    // Special Top Items (Dashboard, Calendar)
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
            const isVoice = channel.type === 'voice';
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

    console.log(`[NAV] Switching to channel: ${channelId} at ${new Date().toLocaleTimeString()}`);
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
    if (typeof renderLevelUI === 'function') renderLevelUI();
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
    import('./modules/tierlist.js').then(m => m.cleanupRealtime?.());

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
            import('./modules/dashboard.js').then(m => m.renderWelcome()).catch(navErr);
            break;
        case 'music':
            StaticPages.renderMusicBot();
            break;
        case 'dashboard':
            renderDashboard();
            break;
        case 'dateplanner':
            import('./core/state.js').then(s => s.ensureMapData()).then(() => moduleMap.map()).then(m => m.renderMap()).catch(navErr);
            break;
        case 'bucketlist':
            import('./core/state.js').then(s => s.ensureBucketListData()).then(() => moduleMap.bucketlist()).then(m => m.renderBucketList()).catch(navErr);
            break;
        case 'calendar':
            import('./core/state.js').then(s => s.ensureCalendarData()).then(() => moduleMap.calendar().then(m => m.renderCalendar())).catch(navErr);
            break;
        case 'timeline':
            import('./core/state.js').then(s => s.ensureTimelineData()).then(() => moduleMap.timeline().then(m => m.renderTimeline())).catch(navErr);
            break;
        case 'movies':
        case 'series':
        case 'games':
            import('./core/state.js').then(s => s.ensureLibraryData()).then(() => moduleMap.library().then(m => m.renderLibrary(channelId))).catch(navErr);
            break;
        case 'watchlist':
            import('./core/state.js').then(s => s.ensureLibraryData()).then(() => import('./modules/watchlist.js')).then(m => m.renderWatchlist()).catch(navErr);
            break;
        case 'topics':
            import('./core/state.js').then(s => s.ensureTopicsData()).then(() => moduleMap.topics()).then(m => m.renderTopics()).catch(navErr);
            break;
        case 'tetris':
            moduleMap.games().then(m => m.renderTetrisTracker()).catch(navErr);
            break;
        case 'puzzle':
            import('./core/state.js').then(s => s.ensureTimelineData()).then(() => moduleMap.games().then(m => m.renderPuzzleGame())).catch(navErr);
            break;
        case 'quiz':
            import('./modules/coupleQuiz.js').then(m => m.renderCoupleQuiz()).catch(navErr);
            break;
        case 'games-hub':
            import('./core/state.js').then(s => s.ensureGamesData()).then(() => import('./modules/gamesHub.js')).then(m => m.renderGamesHub()).catch(navErr);
            break;
        case 'game-who':
            import('./core/state.js').then(s => s.ensureGamesData()).then(() => import('./modules/gameWho.js')).then(m => m.renderGameWho()).catch(navErr);
            break;
        case 'game-draw':
            import('./core/state.js').then(s => Promise.all([s.ensureGamesData(), s.ensureDrawStrokesData()])).then(() => import('./modules/gameDraw.js')).then(m => m.renderGameDraw()).catch(navErr);
            break;
        case 'daily-questions':
            import('./core/state.js').then(s => s.ensureDailyQuizData()).then(() => moduleMap['daily-questions']()).then(m => m.renderDailyQuestions()).catch(navErr);
            break;
        case 'achievements':
            import('./core/state.js').then(s => s.ensureAchievementsData()).then(() => moduleMap.achievements()).then(m => m.renderAchievements()).catch(navErr);
            break;
        case 'quests':
            import('./modules/quests.js').then(m => m.renderQuests()).catch(navErr);
            break;
        case 'funfacts':
            import('./core/state.js').then(s => s.ensureFactsData()).then(() => moduleMap.funfacts().then(m => m.renderFunFacts())).catch(navErr);
            break;
        case 'stats':
            import('./core/state.js').then(s => Promise.all([s.ensureCalendarData(), s.ensureLibraryData()])).then(() => moduleMap.stats().then(m => m.renderStats())).catch(navErr);
            break;
        case 'tierlist':
            moduleMap.tierlist().then(m => m.renderTierList()).catch(navErr);
            break;
        case 'restore-data':
            moduleMap['restore-data']().then(m => m.renderRestoreData()).catch(navErr);
            break;
        case 'letters':
            import('./modules/letters.js').then(m => m.renderLetters()).catch(navErr);
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
            import('./core/state.js').then(s => s.ensureMaturaData()).then(() => moduleMap.matura().then(m => m.renderMatura(channelId))).catch(navErr);
            break;
        case 'settings':
            moduleMap.settings().then(m => m.renderSettings()).catch(navErr);
            break;
        case 'regenerace':
            moduleMap.regenerace().then(m => m.renderRegenerace()).catch(navErr);
            break;
        default:
            import('./modules/dashboard.js').then(m => m.renderWelcome()).catch(navErr);
    }


    // Mobile Sidebar Close
    const sidebar = document.getElementById('sidebar-wrapper');
    const overlay = document.getElementById('mobile-overlay');
    if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    }
}

// --- SEARCH ---

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            moduleMap.search().then(m => m.renderGlobalSearch(m.expandSearchQuery(query)));
        } else {
            // Restore current channel
            switchChannel(state.currentChannel);
        }
    });
}

// --- UI HELPERS FROM SCRIPT.JS ---

function toggleUserPopout() {
    triggerHaptic('light');
    import('./modules/profile.js').then(m => m.toggleUserPopout());
}

function toggleMobileMenu() {
    const sidebar = document.getElementById("sidebar-wrapper");
    const overlay = document.getElementById("mobile-overlay");

    if (!sidebar || !overlay) return;

    triggerHaptic('light');

    const isClosed = sidebar.classList.contains("-translate-x-full");

    if (isClosed) {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    } else {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    }
}

// --- GLOBALS EXPOSURE ---

window.loadModule = (name) => {
    switch(name) {
        // Core
        case 'ai_helper': return import('./core/ai_helper.js');
        case 'auth': return import('./core/auth.js');
        case 'loader': return import('./core/loader.js');
        case 'migration': return import('./migration.js');
        case 'notifications': return import('./core/notifications.js');
        case 'offline': return import('./core/offline.js');
        case 'state': return import('./core/state.js');
        case 'supabase': return import('./core/supabase.js');
        case 'sync': return import('./core/sync.js');
        case 'theme': return import('./core/theme.js');
        case 'ui': return import('./core/ui.js');
        case 'utils': return import('./core/utils.js');
        // Modules
        case 'achievements': return import('./modules/achievements.js');
        case 'bucketlist': return import('./modules/bucketlist.js');
        case 'calendar': return import('./modules/calendar.js');
        case 'confession': return import('./modules/confession.js');
        case 'coupleQuiz': return import('./modules/coupleQuiz.js');
        case 'dailyQuestions': return import('./modules/dailyQuestions.js');
        case 'dashboard': return import('./modules/dashboard.js');
        case 'drawGallery': return import('./modules/drawGallery.js');
        case 'flashcards': return import('./modules/flashcards.js');
        case 'funfacts': return import('./modules/funfacts.js');
        case 'gameDraw': return import('./modules/gameDraw.js');
        case 'gameWho': return import('./modules/gameWho.js');
        case 'games': return import('./modules/games.js');
        case 'gamesHub': return import('./modules/gamesHub.js');
        case 'health': return import('./modules/health.js');
        case 'health_ui': return import('./modules/dashboard/health_ui.js');
        case 'highlighter': return import('./modules/highlighter.js');
        case 'letters': return import('./modules/letters.js');
        case 'library': return import('./modules/library.js');
        case 'map': return import('./modules/map.js');
        case 'matura': return import('./modules/matura.js');
        case 'profile': return import('./modules/profile.js');
        case 'progress': return import('./modules/progress.js');
        case 'quests': return import('./modules/quests.js');
        case 'quiz': return import('./modules/quiz.js');
        case 'regenerace': return import('./modules/regenerace.js');
        case 'restore': return import('./modules/restore.js');
        case 'search': return import('./modules/search.js');
        case 'settings': return import('./modules/settings.js');
        case 'spaced_repetition': return import('./modules/spaced_repetition.js');
        case 'stats': return import('./modules/stats.js');
        case 'tierlist': return import('./modules/tierlist.js');
        case 'timeline': return import('./modules/timeline.js');
        case 'topics': return import('./modules/topics.js');
        case 'watchlist': return import('./modules/watchlist.js');
        default: console.error('Unknown loadModule request:', name); return Promise.reject(new Error('Module not found'));
    }
};

function exposeGlobals() {
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

    // Modals & Library
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
        if (id === 'gallery-modal') closeGallery();
    };

    // Library Lazy Functions
    const libraryFn = (fn) => (...args) => {
        if (window.Library && window.Library[fn]) return window.Library[fn](...args);
        return import('./modules/library.js').then(m => m[fn](...args));
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
    const confessionFn = (fn) => (...args) => import('./modules/confession.js').then(m => m[fn](...args));
    window.startConfession = confessionFn('startConfession');
    window.responseYes = confessionFn('responseYes');
    window.responseNo = confessionFn('responseNo');

    // Topics Lazy Functions
    const topicsFn = (fn) => (...args) => {
        if (window.Topics && window.Topics[fn]) return window.Topics[fn](...args);
        return import('./modules/topics.js').then(m => m[fn](...args));
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
        return import('./modules/calendar.js').then(m => m[fn](...args));
    };
    window.showDayDetail = calendarFn('showDayDetail');
    window.closeDayModal = calendarFn('closeDayModal');
    window.addSchoolEvent = calendarFn('addSchoolEvent');
    window.deleteSchoolEvent = calendarFn('deleteSchoolEvent');

    // Timeline Lazy Functions
    const timelineFn = (fn) => (...args) => {
        if (window.Timeline && window.Timeline[fn]) return window.Timeline[fn](...args);
        return import('./modules/timeline.js').then(m => m[fn](...args));
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
    window.renderGlobalSearch = (...args) => import('./modules/search.js').then(m => m.renderGlobalSearch(...args));

    // Map Lazy Functions
    window.selectLocation = (...args) => {
        if (window.KiscordMap && window.KiscordMap.selectLocation) return window.KiscordMap.selectLocation(...args);
        return import('./modules/map.js').then(m => m.selectLocation(...args));
    };

    // Health (for dashboard inline handlers)
    const healthFn = (fn) => (...args) => import('./modules/health.js').then(m => m[fn](...args));
    window.updateHealth = healthFn('updateHealth');
    window.updateBedtime = healthFn('updateBedtime');
    window.startSleep = healthFn('startSleep');
    window.wakeUp = healthFn('wakeUp');
    window.startSleepTimer = healthFn('startSleepTimer');

    // Dashboard Functions (imported at top)
    window.updateMoodVisuals = updateMoodVisuals;
    window.updateSleep = updateSleep;
    window.refreshDashboardFact = refreshDashboardFact;
    window.handleWelcomeChat = handleWelcomeChat;
    window.renderDashboard = renderDashboard;

    // Achievements
    window.toggleAchievement = (...args) => import('./modules/achievements.js').then(m => m.toggleAchievement(...args));

    // Watchlist
    window.rollTheDice = () => {
        if (window.Watchlist && window.Watchlist.rollTheDice) return window.Watchlist.rollTheDice();
        return import('./modules/watchlist.js').then(m => m.rollTheDice());
    };

    // Extra Timeline
    window.renderTimeline = timelineFn('renderTimeline');

    // Migration
    import('./migration.js').then(m => {
        window.migrateStaticContentToSupabase = m.migrateStaticContentToSupabase;
    });
}

function updateChannelHeader(channelId) {
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
