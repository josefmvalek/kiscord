// Core imports (kept for initialization)
import { state, initializeState } from './core/state.js';
import { initTheme, toggleTheme, showNotification, toggleValentineMode } from './core/theme.js';
import { triggerConfetti, triggerHaptic } from './core/utils.js';
import { getCurrentUser, signIn, onAuthChange } from './core/auth.js';
import {
    renderDashboard,
    updateMoodVisuals,
    updateSleep,
    refreshDashboardFact,
    showNextFact,
    handleWelcomeChat
} from './modules/dashboard.js';
import { setupQuestsRealtime, cleanupQuestsRealtime } from './modules/quests.js';
import { initLevels, renderLevelUI } from './modules/levels.js';
import { setupRealtimeSync } from './core/sync.js';

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
    'profile': () => import('./modules/profile.js')
};

let lastUserId = null;

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // 0. Listen for auth changes
    onAuthChange(async (event, session) => {
        const user = session?.user;
        const loginEl = document.getElementById('login-screen');
        const appEl = document.getElementById('app-interface');

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            if (user) {
                if (user.id === lastUserId) return;
                lastUserId = user.id;

                if (loginEl) loginEl.classList.add('hidden');
                if (appEl) appEl.classList.add('show');
                updateUserProfileUI(user);

                // Run migrations if needed (only once per app Version)
                await handleMigrations();

                // Refresh data for new user
                await initializeState();

                // Re-render current or default channel
                const savedChannel = localStorage.getItem('klarka_last_channel');
                const defaultChannel = (savedChannel && savedChannel !== 'welcome') ? savedChannel : 'dashboard';
                
                // Initialize history with the starting channel
                history.replaceState({ channel: defaultChannel }, "", "");
                
                switchChannel(defaultChannel, false);
            }
        } else if (event === 'SIGNED_OUT') {
            if (loginEl) loginEl.classList.remove('hidden');
            if (appEl) appEl.classList.remove('show');
            lastUserId = null;
        }
    });

    // 1. Initial State Setup (Static/Realtime)
    setupRealtimeSync();
    setupQuestsRealtime();
    initLevels();
    initTheme();
    renderChannels();

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

    // 4. Expose Global Functions
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

function setupConnectivityListeners() {
    window.addEventListener('online', () => {
        showNotification("Připojení obnoveno 📶", "success");
        triggerHaptic('success');
    });

    window.addEventListener('offline', () => {
        showNotification("Jsi offline. Některé funkce nemusí fungovat ⚠️", "error");
        triggerHaptic('heavy');
    });
}

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
        <div class="h-full flex flex-col items-center justify-center bg-[#36393f] relative overflow-hidden animate-fade-in p-2 md:p-6">
            <!-- Glow background -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
            
            <div class="z-10 w-full h-full max-w-6xl mx-auto flex flex-col items-center justify-center">
                <div class="w-full h-full max-h-[85vh] bg-black/20 backdrop-blur-md border border-white/5 p-1 rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(29,185,84,0.2)] hover:border-[#1DB954]/30 flex flex-col overflow-hidden">
                    <iframe data-testid="embed-iframe" 
                            style="border-radius:20px; flex: 1; border: none;" 
                            src="https://open.spotify.com/embed/playlist/2zUVrUmI3NHhIPtiboRE9O?utm_source=generator&theme=0" 
                            width="100%" 
                            height="100%" 
                            allowfullscreen="" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy">
                    </iframe>
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

            // Robust detection for the confession trigger (case-insensitive, ignores extra whitespace)
            const hasConfession = /#\s*k\s*i\s*s\s*c\s*o\s*r\s*d/i.test(text);

            if (hasConfession) {
                // FAITHFUL DISCORD UI (Secret & Authentic)
                container.innerHTML = `
                    <div class="h-full flex flex-col p-4 md:p-6 items-start animate-fade-in bg-[#36393f] font-sans">
                        <div class="flex gap-3 md:gap-4 items-start max-w-full md:max-w-2xl group overflow-hidden">
                             <!-- Avatar -->
                             <div class="relative flex-shrink-0 mt-0.5">
                                 <img src="img/app/jozka_profilovka.jpg" alt="Jožka" class="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover shadow-sm bg-[#2f3136]" loading="lazy">
                             </div>
                             
                             <div class="flex-1 min-w-0">
                                 <!-- Header -->
                                 <div class="flex items-baseline gap-2 mb-2 md:mb-3">
                                     <span class="font-bold text-white text-sm md:text-base hover:underline cursor-pointer">Jožka</span>
                                     <span class="text-[10px] text-[#b9bbbe] font-medium">Pinned</span>
                                 </div>
                                 
                                 <!-- THE PATCH FILE BLOCK (Authentic Discord Style) -->
                                 <div onclick="import('./js/modules/confession.js').then(m => m.startConfession())" 
                                      class="bg-[#2f3136] border border-[#202225] rounded-md p-3 flex items-center gap-3 md:gap-4 w-full max-w-[432px] cursor-pointer hover:bg-[#32353b] transition-colors duration-150">
                                     
                                     <!-- File Icon -->
                                     <div class="w-10 h-11 md:h-12 bg-[#5865F2] rounded-sm flex items-center justify-center text-white text-xl md:text-2xl flex-shrink-0">
                                         <i class="fas fa-file-code"></i>
                                     </div>

                                     <div class="flex-1 min-w-0">
                                         <div class="text-[#00aff4] font-medium text-sm md:text-base truncate hover:underline">system_patch_v2.0.exe</div>
                                         <div class="text-[#b9bbbe] text-[10px] md:text-xs font-medium mt-0.5">1.2 MB • Executable</div>
                                     </div>

                                     <!-- Download Icon -->
                                     <div class="text-[#b9bbbe] hover:text-[#dcddde] transition-colors p-1 md:p-2">
                                         <i class="fas fa-download text-lg md:text-xl"></i>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="p-8 max-w-4xl mx-auto text-gray-300 animate-fade-in font-mono text-sm">
                    <div class="bg-[#2f3136] p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full bg-[#5865F2] opacity-50"></div>
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

    const isJosef = user.email.toLowerCase().includes('josef') || user.email.toLowerCase().includes('jozk');

    if (isJosef) {
        const avatarPath = 'img/app/jozka_profilovka.jpg';
        state.currentUser = { name: 'Jožka', email: user.email, id: user.id, avatar: avatarPath };
        if (sidebarName) sidebarName.textContent = 'Jožka';
        if (popoutName) popoutName.textContent = 'Jožka';
        if (sidebarAvatar) sidebarAvatar.src = avatarPath;
        if (popoutAvatar) popoutAvatar.src = avatarPath;
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                Systémový Administrátor & Full-Stack Boyfriend<br />
                Třída: ENTP / Chaotický Mýval<br />
                Bio: 📍 Kunovice<br />
                ❄️ Status: Trvale studené ruce.<br />
                🛡️ Upozornění: Pravidelně potřebuje updatovat morální kodex.<br />
            `;
        }
    } else {
        const avatarPath = 'img/app/klarka_profilovka.webp';
        state.currentUser = { name: 'Klárka', email: user.email, id: user.id, avatar: avatarPath };
        if (sidebarName) sidebarName.textContent = 'Klárka';
        if (popoutName) popoutName.textContent = 'Klárka';
        if (sidebarAvatar) sidebarAvatar.src = avatarPath;
        if (popoutAvatar) popoutAvatar.src = avatarPath;
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                Role: Vrchní Fact-Checker & QA Tester<br />
                Třída: Spirituální Sova<br />
                Bio: 📍 Rezidentka sporného území Podolí-Kunovice.<br />
                👀 Pasivní skill: Odmítá nosit brýle, přesto vidí všechny tvoje chyby.<br />
                🦴 Slabina: Vlastní kotníky (a sprchové kouty).<br />
            `;
        }
    }
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
            { id: 'tetris', name: 'tetris-tracker', icon: '<i class="fas fa-shapes"></i>', type: 'text', color: '#faa61a', desc: 'Sezóna v Tetris War začíná! 🏆' }
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
        name: "SYSTÉM",
        items: [
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

    // Cleanup Realtime Subscriptions from previous channels
    if (typeof achCleanup === 'function') achCleanup();
    if (typeof dailyCleanup === 'function') dailyCleanup();
    if (typeof bucketCleanup === 'function') bucketCleanup();
    if (typeof cleanupQuestsRealtime === 'function') cleanupQuestsRealtime();
    if (typeof whoCleanup === 'function') whoCleanup();
    if (typeof drawCleanup === 'function') drawCleanup();

    // Route
    switch (channelId) {
        case 'welcome':
            import('./modules/dashboard.js').then(m => m.renderWelcome());
            break;
        case 'music':
            renderMusicBot();
            break;
        case 'dashboard':
            renderDashboard();
            break;
        case 'dateplanner':
            moduleMap.map().then(m => m.renderMap());
            break;
        case 'bucketlist':
            moduleMap.bucketlist().then(m => m.renderBucketList());
            break;
        case 'calendar':
            moduleMap.calendar().then(m => m.renderCalendar());
            break;
        case 'timeline':
            moduleMap.timeline().then(m => m.renderTimeline());
            break;
        case 'movies':
        case 'series':
        case 'games':
            moduleMap.library().then(m => m.renderLibrary(channelId));
            break;
        case 'watchlist':
            import('./modules/watchlist.js').then(m => m.renderWatchlist());
            break;
        case 'topics':
            moduleMap.topics().then(m => m.renderTopics());
            break;
        case 'tetris':
            moduleMap.games().then(m => m.renderTetrisTracker());
            break;
        case 'puzzle':
            moduleMap.games().then(m => m.renderPuzzleGame());
            break;
        case 'quiz':
            import('./modules/coupleQuiz.js').then(m => m.renderCoupleQuiz());
            break;
        case 'games-hub':
            import('./modules/gamesHub.js').then(m => m.renderGamesHub());
            break;
        case 'game-who':
            import('./modules/gameWho.js').then(m => m.renderGameWho());
            break;
        case 'game-draw':
            import('./modules/gameDraw.js').then(m => m.renderGameDraw());
            break;
        case 'daily-questions':
            moduleMap['daily-questions']().then(m => m.renderDailyQuestions());
            break;
        case 'achievements':
            moduleMap.achievements().then(m => m.renderAchievements());
            break;
        case 'quests':
            import('./modules/quests.js').then(m => m.renderQuests());
            break;
        case 'funfacts':
            moduleMap.funfacts().then(m => m.renderFunFacts());
            break;
        case 'letters':
            import('./modules/letters.js').then(m => m.renderLetters());
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
            import('./modules/dashboard.js').then(m => m.renderWelcome());
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

    // Modals & Library
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
        if (id === 'gallery-modal') closeGallery();
    };

    // Library Lazy Functions
    const libraryFn = (fn) => (...args) => import('./modules/library.js').then(m => m[fn](...args));
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
    const topicsFn = (fn) => (...args) => import('./modules/topics.js').then(m => m[fn](...args));
    window.closeTopicModal = topicsFn('closeTopicModal');
    window.toggleViewBookmarks = topicsFn('toggleViewBookmarks');
    window.toggleQuestionBookmark = topicsFn('toggleQuestionBookmark');
    window.prevQuestion = topicsFn('prevQuestion');
    window.nextQuestion = topicsFn('nextQuestion');
    window.markQuestionDone = topicsFn('markQuestionDone');
    window.confirmResetTopic = topicsFn('confirmResetTopic');

    // Calendar Lazy Functions
    const calendarFn = (fn) => (...args) => import('./modules/calendar.js').then(m => m[fn](...args));
    window.showDayDetail = calendarFn('showDayDetail');
    window.closeDayModal = calendarFn('closeDayModal');
    window.addSchoolEvent = calendarFn('addSchoolEvent');
    window.deleteSchoolEvent = calendarFn('deleteSchoolEvent');

    // Timeline Lazy Functions
    const timelineFn = (fn) => (...args) => import('./modules/timeline.js').then(m => m[fn](...args));
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

    // Map Lazy Functions
    window.selectLocation = (...args) => import('./modules/map.js').then(m => m.selectLocation(...args));

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
    window.showNextFact = showNextFact;
    window.handleWelcomeChat = handleWelcomeChat;
    window.renderDashboard = renderDashboard;

    // Bucket List
    window.addBucketItem = (...args) => import('./modules/bucketlist.js').then(m => m.addBucketItem(...args));
    window.toggleItem = (...args) => import('./modules/bucketlist.js').then(m => m.toggleItem(...args));
    window.deleteItem = (...args) => import('./modules/bucketlist.js').then(m => m.deleteItem(...args));

    // Achievements
    window.toggleAchievement = (...args) => import('./modules/achievements.js').then(m => m.toggleAchievement(...args));

    // Watchlist
    window.rollTheDice = () => import('./modules/watchlist.js').then(m => m.rollTheDice());

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
