
import { state, initializeState } from './core/state.js';
import { initTheme, toggleTheme, showNotification, toggleValentineMode } from './core/theme.js';
import { triggerConfetti } from './core/utils.js';
import { getCurrentUser, signIn, onAuthChange } from './core/auth.js';
import {
    renderDashboard,
    renderWelcome,
    handleWelcomeChat,
    updateMoodVisuals,
    updateSleep,
    refreshDashboardFact,
    showNextFact,
    addMessageToChat
} from './modules/dashboard.js';
import { renderQuests, setupQuestsRealtime, cleanupQuestsRealtime } from './modules/quests.js';
import { initLevels, renderLevelUI } from './modules/levels.js';
import { renderMap, selectLocation } from './modules/map.js';
import {
    renderCalendar,
    showDayDetail,
    closeDayModal,
    addSchoolEvent,
    deleteSchoolEvent
} from './modules/calendar.js';
import {
    renderTimeline,
    openGallery,
    closeGallery,
    changeGalleryImage,
    uploadPhoto,
    deletePhoto
} from './modules/timeline.js';
import {
    renderLibrary,
    openDownloadModal,
    openMagnetLink,
    openGoogleDrive,
    toggleWatchlist,
    playTrailer,
    openHistoryModal,
    setHistoryStatus,
    saveHistory,
    exportWatchlist,
    clearWatchlist,
    openPlanningModal,
    confirmLibraryPlan
} from './modules/library.js';
import {
    renderTopics,
    closeTopicModal,
    toggleViewBookmarks,
    toggleQuestionBookmark,
    prevQuestion,
    nextQuestion,
    markQuestionDone,
    confirmResetTopic
} from './modules/topics.js';
import { renderTetrisTracker as renderTetris, renderPuzzleGame as renderPuzzle } from './modules/games.js';
import { startConfession, responseYes, responseNo } from './modules/confession.js';
import { updateHealth, updateBedtime, startSleep, wakeUp, startSleepTimer } from './modules/health.js';
import { migrateLocalDataToSupabase } from './migration.js';
import { renderBucketList, addBucketItem, toggleItem, deleteItem, cleanupRealtime as bucketCleanup } from './modules/bucketlist.js';
import { renderAchievements, toggleAchievement, cleanupRealtime as achCleanup } from './modules/achievements.js';

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // 0. Listen for auth changes
    onAuthChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            const user = session?.user;
            if (user) {
                const loginEl = document.getElementById('login-screen');
                const appEl = document.getElementById('app-interface');
                if (loginEl) loginEl.classList.add('hidden');
                if (appEl) appEl.classList.add('show');
                updateUserProfileUI(user);

                // --- UPDATE: Refresh data for new user ---
                await initializeState();
                
                // Re-render current or default channel
                const currentChan = state.currentChannel || 'dashboard';
                switchChannel(currentChan);
            }
        } else if (event === 'SIGNED_OUT') {
            const loginEl = document.getElementById('login-screen');
            const appEl = document.getElementById('app-interface');
            if (loginEl) loginEl.classList.remove('hidden');
            if (appEl) appEl.classList.remove('show');
        }
    });

    // 1. Initial Auth Check
    const user = await getCurrentUser();
    if (!user) {
        const loginEl = document.getElementById('login-screen');
        if (loginEl) loginEl.classList.remove('hidden');
    } else {
        const loginEl = document.getElementById('login-screen');
        const appEl = document.getElementById('app-interface');
        if (loginEl) loginEl.classList.add('hidden');
        if (appEl) appEl.classList.add('show');
        updateUserProfileUI(user);
    }

    // 2. Fetch initial state from Supabase
    await initializeState();
    setupQuestsRealtime();
    initLevels();

    // Run migration once if data exists but hasn't been moved yet
    if (!localStorage.getItem('klarka_migration_done')) {
        const migratedCount = await migrateLocalDataToSupabase();
        // Only reload if something was actually migrated to avoid infinite loop on empty storage
        if (migratedCount > 0) {
            window.location.reload(); 
        }
    }

    // Static content migration (forced re-run to fix previous incomplete sync)
        // Statický obsah (data.js) - vynucená migrace v4 pro fix prázdných tabulek
        if (!localStorage.getItem('klarka_static_migration_v4_done')) {
            console.log("🚀 Starting forced static content migration v4...");
            const { migrateStaticContentToSupabase } = await import('./migration.js');
            await migrateStaticContentToSupabase();
            localStorage.setItem('klarka_static_migration_v4_done', 'true');
            console.log("🎉 Static content migration v4 finished - reloading to apply...");
            window.location.reload();
        }

    // 3. Theme Init
    initTheme();

    // 4. Render Channels
    renderChannels();


    // 5. Render Initial Channel (Welcome or Saved)
    const savedChannel = localStorage.getItem('klarka_last_channel') || 'welcome';
    switchChannel(savedChannel);

    // 6. Global Event Listeners (Navigation)
    setupNavigation();
    setupSearch();

    // 7. Expose Global Functions (for inline html handlers)
    exposeGlobals();
});

// --- NAVIGATION ---

function setupNavigation() {
    document.querySelectorAll('.channel-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Remove active class from all
            document.querySelectorAll('.channel-link').forEach(l => {
                l.classList.remove('active', 'bg-[#36393f]', 'text-white');
                l.classList.add('text-[#b9bbbe]');
            });

            // Add active to clicked
            const target = e.currentTarget;
            target.classList.add('active', 'bg-[#36393f]', 'text-white');
            target.classList.remove('text-[#b9bbbe]');

            // Switch
            const channelId = target.getAttribute('data-channel');
            switchChannel(channelId);
        });
    });
}

// --- INFO RENDERERS ---

function renderManual() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto text-gray-300 space-y-8 animate-fade-in">
            <div class="text-center mb-10">
                <div class="w-20 h-20 bg-[#5865F2] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <i class="fas fa-book text-3xl text-white"></i>
                </div>
                <h1 class="text-3xl font-bold text-white mb-2">Jak používat Kiscord</h1>
                <p class="text-gray-400">Rychlý průvodce všemi funkcemi</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Dashboard -->
                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#5865F2] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#ed4245] flex items-center justify-center mr-3 text-sm">❤️</span>
                        Můj Den
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Tady najdeš přehled všeho důležitého. Počet dní, co jsme spolu, náhodný fakt o zvířátkách,
                        aktuální náladu a graf spánku. Vše na jednom místě.
                    </p>
                </div>

                <!-- Calendar -->
                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#FEE75C] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#FEE75C] text-black flex items-center justify-center mr-3 text-sm">📅</span>
                        Kalendář
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Společný plánovač. Vidíš tady naše výročí, naplánovaná rande a můžeš si sem psát i školní povinnosti,
                        aby ti nic neuteklo.
                    </p>
                </div>

                <!-- Map -->
                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#3ba55c] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#3ba55c] flex items-center justify-center mr-3 text-sm">🗺️</span>
                        Rande Plánovač
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Interaktivní mapa míst, kam můžeme vyrazit. Filtruj podle nálady (jídlo, procházka, výhled)
                        a objevuj nová místa pro naše rande.
                    </p>
                </div>

                <!-- Library -->
                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#5865F2] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center mr-3 text-sm">📚</span>
                        Knihovna
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Seznam filmů, seriálů a her, které si chceme zahrát nebo pustit. Můžeš si je rovnou stáhnout
                        nebo označit jako zhlédnuté.
                    </p>
                </div>
            </div>

            <div class="bg-[#2f3136] p-6 rounded-xl border border-[#faa61a]">
                <h3 class="text-xl font-bold text-[#faa61a] mb-2 flex items-center gap-2">
                    <i class="fas fa-lightbulb"></i> Tip
                </h3>
                <p class="text-sm text-gray-300">
                    Aplikace podporuje <strong>Valentýnský mód</strong>! Klikni na srdíčko v horní liště a celá aplikace zrůžoví. 💕
                </p>
            </div>
        </div>
    `;
}

// --- PLACEHOLDERS ---

function renderMusicBot() {
    const container = document.getElementById("messages-container");
    if (!container) return;
    
    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center bg-[#36393f] relative overflow-hidden animate-fade-in p-4 md:p-8">
            <!-- Glow background -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#1DB954]/20 rounded-full blur-[100px] pointer-events-none opacity-60"></div>
            
            <div class="z-10 w-full h-[calc(100vh-140px)] max-w-7xl mx-auto flex flex-col items-center justify-start mt-4">
                <div class="mb-4 flex flex-col md:flex-row items-center gap-4 text-center md:text-left flex-shrink-0">
                    <div class="w-14 h-14 rounded-2xl bg-[#1DB954] flex items-center justify-center shadow-[0_0_20px_rgba(29,185,84,0.5)]">
                        <i class="fab fa-spotify text-3xl text-black"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-white tracking-tight">Kiscord <span class="text-[#1DB954]">Radio</span></h2>
                        <p class="text-gray-400 font-medium text-md">Náš společný vibes playlist</p>
                    </div>
                </div>

                <div class="w-full flex-1 bg-black/40 backdrop-blur-xl border border-[#1DB954]/20 p-2 md:p-3 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(29,185,84,0.3)] hover:border-[#1DB954]/40 flex flex-col">
                    <iframe data-testid="embed-iframe" style="border-radius:16px; flex: 1;" src="https://open.spotify.com/embed/playlist/2zUVrUmI3NHhIPtiboRE9O?utm_source=generator&theme=0" width="100%" height="100%" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                </div>
            </div>
        </div>
    `;
}

function renderReadme() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
    `;

    fetch('README.md')
        .then(response => {
            if (!response.ok) throw new Error('README not found');
            return response.text();
        })
        .then(text => {
            // Simple markdown-like parsing
            const htmlContent = text
                .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mb-4 border-b border-gray-700 pb-2">$1</h1>')
                .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-8 mb-4">$1</h2>')
                .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mt-6 mb-3">$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<strong class="text-gray-200">$1</strong>')
                .replace(/`([^`]+)`/gim, '<code class="bg-[#2f3136] px-1 rounded text-sm font-mono text-gray-300">$1</code>')
                .replace(/\n/gim, '<br>');

            container.innerHTML = `
                <div class="p-8 max-w-4xl mx-auto text-gray-300 animate-fade-in font-mono text-sm">
                    <div class="bg-[#2f3136] p-8 rounded-xl border border-[#202225] shadow-lg">
                        ${htmlContent}
                    </div>
                </div>
            `;
        })
        .catch(err => {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-red-400">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Nepodařilo se načíst README.md</p>
                    <p class="text-xs text-gray-500 mt-2">${err.message}</p>
                </div>
            `;
        });
}

function renderUpgrade() {
    const container = document.getElementById("messages-container");
    if (container) container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500 text-xl font-bold">🚀 Upgrade systému... brzy!</div>';
}

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
    } catch (err) {
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

    const isJosef = user.email.toLowerCase().includes('josef') || user.email.toLowerCase().includes('jozk');

    if (isJosef) {
        state.currentUser = { name: 'Jožka', email: user.email, id: user.id };
        if (sidebarName) sidebarName.textContent = 'Jožka';
        if (popoutName) popoutName.textContent = 'Jožka';
        if (sidebarAvatar) sidebarAvatar.src = 'img/app/czippel2_vanoce.png';
        if (popoutAvatar) popoutAvatar.src = 'img/app/czippel2_vanoce.png';
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                📍 Bydlí v Brně (ale srdcem v Polešovicích).<br />
                🦝 Spirituální zvíře: Mýval (protože vymýšlí hlouposti).<br />
                🔥 Do aplikace přidal backend, aby vše fungovalo.<br />
                <span class="text-[#5865F2] font-bold">Status:</span> Developer & Přítel.
            `;
        }
    } else {
        state.currentUser = { name: 'Klárka', email: user.email, id: user.id };
        if (sidebarName) sidebarName.textContent = 'Klárka';
        if (popoutName) popoutName.textContent = 'Klárka';
        if (sidebarAvatar) sidebarAvatar.src = 'img/app/klarka_profilovka.webp';
        if (popoutAvatar) popoutAvatar.src = 'img/app/klarka_profilovka.webp';
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                📍 Věří, že Podolí je skutečné místo.<br />
                🦉 Spirituální zvíře: Sova (protože ponocuje).<br />
                🔥 Přežila se mnou Hody i požár v Polešovicích.<br />
                <span class="text-[#eb459e] font-bold">Status:</span> Vrchní navigátor (občas).
            `;
        }
    }
}

const channelCategories = [
    {
        name: "SOCIAL",
        items: [
            { id: 'welcome', name: 'uvítání', icon: '<i class="fas fa-door-open"></i>', type: 'text', desc: 'Vítejte na našem soukromém serveru! ❤️' },
            { id: 'music', name: 'music-bot', icon: '<i class="fas fa-music"></i>', type: 'text', color: '#3ba55c', desc: 'Náš společný vibes playlist 🎧' }
        ]
    },
    {
        name: "RANDE",
        items: [
            { id: 'dateplanner', name: 'plánovač', icon: '<i class="fas fa-map-marker-alt"></i>', type: 'text', color: '#3ba55c', desc: 'Kam vyrazíme příště? 🥂' },
            { id: 'timeline', name: 'timeline', icon: '<i class="fas fa-history"></i>', type: 'text', color: '#eb459e', desc: 'Naše nejhezčí společné chvilky 🎞️' },
            { id: 'topics', name: 'témata', icon: '<i class="fas fa-comments"></i>', type: 'text', color: '#faa61a', desc: 'Když nevíme, o čem si povídat... 🥰' },
            { id: 'bucketlist', name: 'bucket-list', icon: '<i class="fas fa-rocket"></i>', type: 'text', color: '#ed4245', desc: 'Všechno, co spolu chceme zažít! ✨' },
            { id: 'letters', name: 'dopisy', icon: '<i class="fas fa-envelope-open-text"></i>', type: 'text', color: '#eb459e', desc: 'Vzkazy v láhvi, které se otevřou v čas 💌' },
            { id: 'quiz', name: 'kvízy pro dva', icon: '<i class="fas fa-brain"></i>', type: 'text', color: '#5865F2', desc: 'Kdo vás lépe zná? 🧠' }
        ]
    },
    {
        name: "KNIHOVNA",
        items: [
            { id: 'movies', name: 'filmy', icon: '<i class="fas fa-film"></i>', type: 'text', color: '#5865F2', desc: 'Co nás čeká v kině i doma 🍿' },
            { id: 'series', name: 'seriály', icon: '<i class="fas fa-tv"></i>', type: 'text', color: '#5865F2', desc: 'Maratony pod dekou 🎞️' },
            { id: 'games', name: 'hry', icon: '<i class="fas fa-gamepad"></i>', type: 'text', color: '#5865F2', desc: 'Vyzvi mě na souboj! ⚔️' },
            { id: 'puzzle', name: 'Puzzle', icon: '<i class="fas fa-puzzle-piece"></i>', type: 'text', color: '#eb459e', desc: 'Skládejte naše vzpomínky kousek po kousku.' },
            { id: 'tetris', name: 'tetris tracker', icon: '<i class="fas fa-shapes"></i>', type: 'text', color: '#faa61a', desc: 'Sezóna v Tetris War začíná! 🏆' }
        ]
    },
    {
        name: "INFO",
        items: [
            { id: 'quests', name: 'společné-questy', icon: '<i class="fas fa-shield-alt"></i>', type: 'text', color: '#faa61a', desc: 'Naše společné cíle a progress. 💪' },
            { id: 'achievements', name: 'achievementy', icon: '<i class="fas fa-trophy"></i>', type: 'text', color: '#faa61a', desc: 'Co všechno jsme už dokázali? ⭐' },
            { id: 'manual', name: 'návod', icon: '<i class="fas fa-book"></i>', type: 'text', color: '#99aab5', desc: 'Jak ovládat tuhle aplikaci.' },
            { id: 'readme', name: 'README.md', icon: '<i class="fas fa-file-alt"></i>', type: 'text', color: '#99aab5', desc: 'Technické detaily o projektu.' }
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

export function switchChannel(channelId) {
    console.log("Switching to channel:", channelId);
    state.currentChannel = channelId;
    localStorage.setItem('klarka_last_channel', channelId);

    // Update Sidebar UI (ensure sync if switched programmatically)
    document.querySelectorAll('.channel-link').forEach(l => {
        l.classList.remove('active', 'bg-[#36393f]', 'text-white');
        l.classList.add('text-[#b9bbbe]');
        if (l.getAttribute('data-channel') === channelId) {
            l.classList.add('active', 'bg-[#36393f]', 'text-white');
            l.classList.remove('text-[#b9bbbe]');
        }
    });

    // Sync Level UI
    if (typeof renderLevelUI === 'function') renderLevelUI();

    // Clear Search Input when switching
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";

    // Update Header
    updateChannelHeader(channelId);

    // Render Content
    const container = document.getElementById("messages-container");
    if (container) container.innerHTML = ""; // Clear current

    // Route
    switch (channelId) {
        case 'welcome':
            renderWelcome();
            break;
        case 'music':
            renderMusicBot();
            break;
        case 'dashboard':
            renderDashboard();
            break;
        case 'dateplanner': // Map / Date Planner
            renderMap();
            break;
        case 'bucketlist':
            renderBucketList();
            break;
        case 'calendar':
            renderCalendar();
            break;
        case 'timeline':
            renderTimeline();
            break;
        case 'movies':
        case 'series':
        case 'games': // Library Categories
            renderLibrary(channelId);
            break;
        case 'topics': // Quiz / Topics
            renderTopics();
            break;
        case 'tetris':
            renderTetris();
            break;
        case 'puzzle':
            renderPuzzle();
            break;
        case 'achievements':
            renderAchievements();
            break;
        case 'quests':
            renderQuests();
            break;
        case 'letters':
            import('./modules/letters.js').then(m => m.renderLetters());
            break;
        case 'quiz':
            import('./modules/coupleQuiz.js').then(m => m.renderCoupleQuiz());
            break;
        case 'manual':
            renderManual();
            break;
        case 'readme':
            renderReadme();
            break;
        case 'upgrade':
            renderUpgrade();
            break;
        default:
            renderWelcome();
    }

    // Mobile Sidebar Close (if applicable)
    const sidebar = document.getElementById('sidebar-wrapper');
    const overlay = document.getElementById('mobile-overlay');
    if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    }
}

// --- SEARCH ---

import { expandSearchQuery, renderGlobalSearch } from './modules/search.js';

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            renderGlobalSearch(expandSearchQuery(query));
        } else {
            // Restore current channel
            switchChannel(state.currentChannel);
        }
    });
}

// --- UI HELPERS FROM SCRIPT.JS ---

function toggleUserPopout() {
    const popout = document.getElementById("user-popout");
    if (popout) {
        popout.classList.toggle("active");
        if (popout.classList.contains("active")) {
            setTimeout(() => {
                document.addEventListener("click", closePopoutOutside);
            }, 100);
        }
    }
}

function closePopoutOutside(e) {
    const popout = document.getElementById("user-popout");
    if (popout && !e.target.closest(".user-popout") && !e.target.closest(".h-\\[52px\\]")) {
        popout.classList.remove("active");
        document.removeEventListener("click", closePopoutOutside);
    }
}

function toggleMobileMenu() {
    const sidebar = document.getElementById("sidebar-wrapper");
    const overlay = document.getElementById("mobile-overlay");

    if (!sidebar || !overlay) return;

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

function exposeGlobals() {
    window.switchChannel = switchChannel;
    window.triggerConfetti = triggerConfetti;
    window.toggleTheme = toggleTheme;
    window.toggleValentineMode = toggleValentineMode;
    window.showNotification = showNotification;

    // UI Toggles
    window.toggleUserPopout = toggleUserPopout;
    window.toggleMobileMenu = toggleMobileMenu;

    // Modals & Library
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
        if (id === 'gallery-modal') closeGallery();
    };
    window.openDownloadModal = openDownloadModal;
    window.openMagnetLink = openMagnetLink;
    window.openGoogleDrive = openGoogleDrive;
    window.toggleWatchlist = toggleWatchlist;
    window.playTrailer = playTrailer;
    window.openHistoryModal = openHistoryModal;
    window.setHistoryStatus = setHistoryStatus;
    window.saveHistory = saveHistory;
    window.exportWatchlist = exportWatchlist;
    window.clearWatchlist = clearWatchlist;
    window.openPlanningModal = openPlanningModal;
    window.confirmLibraryPlan = confirmLibraryPlan;
    window.startConfession = startConfession;

    // Confession
    window.responseYes = responseYes;
    window.responseNo = responseNo;

    // Timeline
    window.openGallery = openGallery;
    window.closeGallery = closeGallery;
    window.changeGalleryImage = changeGalleryImage;
    window.handleLogin = handleLogin;

    // Topics
    window.closeTopicModal = closeTopicModal;
    window.toggleViewBookmarks = toggleViewBookmarks;
    window.toggleQuestionBookmark = toggleQuestionBookmark;
    window.prevQuestion = prevQuestion;
    window.nextQuestion = nextQuestion;
    window.markQuestionDone = markQuestionDone;
    window.confirmResetTopic = confirmResetTopic;

    // Calendar
    window.showDayDetail = showDayDetail;
    window.closeDayModal = closeDayModal;
    window.addSchoolEvent = addSchoolEvent;
    window.deleteSchoolEvent = deleteSchoolEvent;

    // Map
    window.selectLocation = selectLocation;

    // Health (for dashboard inline handlers)
    window.updateHealth = updateHealth;
    window.updateBedtime = updateBedtime;
    window.startSleep = startSleep;
    window.wakeUp = wakeUp;
    window.startSleepTimer = startSleepTimer;
    window.updateMoodVisuals = updateMoodVisuals;
    window.updateSleep = updateSleep;
    window.refreshDashboardFact = refreshDashboardFact;
    window.showNextFact = showNextFact;
    window.handleWelcomeChat = handleWelcomeChat;
    window.renderDashboard = renderDashboard;

    // Bucket List
    window.addBucketItem = addBucketItem;
    window.toggleItem = toggleItem;
    window.deleteItem = deleteItem;

    // Achievements
    window.toggleAchievement = toggleAchievement;

    // Timeline
    window.renderTimeline = renderTimeline;
    window.openGallery = openGallery;
    window.closeGallery = closeGallery;
    window.changeGalleryImage = changeGalleryImage;
    window.uploadPhoto = uploadPhoto;
    window.deletePhoto = deletePhoto;

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
