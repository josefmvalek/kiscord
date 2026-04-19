import { state, ensureLibraryData, ensureBucketListData, ensureAchievementsData } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { renderVitalityPanels } from './stats/charts.js';

export async function renderStats() {
    // Expose API to window
    window.Stats = { testNotification, requestPushPermission, exportAllData };

    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in overflow-y-auto custom-scrollbar">
            <!-- Header -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div class="relative z-10 flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#eb459e] shadow-2xl mb-4 transform hover:scale-110 transition-transform">
                    <i class="fas fa-chart-line text-white text-4xl"></i>
                </div>
                <h1 class="relative z-10 text-3xl font-black text-white tracking-tight text-center uppercase">Statistiky Našeho Světa</h1>
                <p class="relative z-10 text-gray-400 font-medium mt-2 text-center max-w-md">Čísla, která vyprávějí náš příběh.</p>
            </div>

            <div class="p-4 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
                <!-- Top Row: Big Numbers -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${renderStatCard('Dní Spolu', calculateDaysTogether(), 'fa-heart', 'text-[#ed4245]', 'bg-[#ed4245]/10')}
                    ${renderStatCard('Splněné Sny', calculateCompletedBuckets(), 'fa-rocket', 'text-[#faa61a]', 'bg-[#faa61a]/10', 'stat-buckets')}
                    ${renderStatCard('Filmové Večery', calculateTotalMovies(), 'fa-film', 'text-[#5865F2]', 'bg-[#5865F2]/10', 'stat-movies')}
                    ${renderStatCard('Získané milníky', calculateUnlockedAchievementsCount(), 'fa-medal', 'text-[#FEE75C]', 'bg-[#FEE75C]/10', 'stat-achievements')}
                </div>

                <!-- Detailed Stats Sections -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Mood Overview -->
                    <div class="bg-[#2f3136] rounded-3xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-8 opacity-5">
                            <i class="fas fa-grin-beam text-8xl"></i>
                        </div>
                        <h3 class="text-xl font-black text-white mb-6 flex items-center gap-3">
                            <i class="fas fa-smile text-[#3ba55c]"></i> Průměrná Nálada
                        </h3>
                        <div id="mood-stats-container" class="space-y-6">
                             <div class="animate-pulse flex space-x-4">
                                <div class="flex-1 space-y-4 py-1">
                                    <div class="h-4 bg-white/5 rounded w-3/4"></div>
                                    <div class="h-8 bg-white/5 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Library Progress -->
                    <div class="bg-[#2f3136] rounded-3xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-8 opacity-5">
                            <i class="fas fa-book-open text-8xl"></i>
                        </div>
                        <h3 class="text-xl font-black text-white mb-6 flex items-center gap-3">
                            <i class="fas fa-bookmark text-[#5865F2]"></i> Knihovna v číslech
                        </h3>
                        <div id="library-stats-container" class="grid grid-cols-2 gap-4">
                            <!-- JS injected stats -->
                        </div>
                    </div>
                </div>

                <!-- Consolidated Wellness Dashboard -->
                <div class="bg-[#2f3136] rounded-3xl border border-white/5 p-4 md:p-8 shadow-xl relative overflow-hidden group">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                        <h3 class="text-2xl font-black text-white flex items-center gap-4">
                            <div class="w-10 h-10 bg-[#7B2CBF]/10 rounded-xl flex items-center justify-center border border-[#7B2CBF]/20 shadow-lg shadow-[#7B2CBF]/10">
                                <i class="fas fa-heartbeat text-[#7B2CBF]"></i>
                            </div>
                            Wellness Dashboard
                        </h3>
                        <!-- Dominant KPI Summary (Grid on mobile, flex on desktop) -->
                        <div id="vitality-summary" class="grid grid-cols-2 lg:flex gap-3">
                            <!-- JS Injected Tiles (Css injection handles the 2+1 layout) -->
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div id="chart-mood" class="w-full bg-black/10 rounded-2xl border border-white/5 overflow-hidden"></div>
                        <div id="chart-sleep" class="w-full bg-black/10 rounded-2xl border border-white/5 overflow-hidden"></div>
                        <div id="chart-water" class="w-full bg-black/10 rounded-2xl border border-white/5 overflow-hidden"></div>
                    </div>
                </div>

                <!-- Notification Settings Section -->
                <div class="bg-[#2f3136] rounded-3xl border border-white/5 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
                    <div class="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
                        <i class="fas fa-bell text-9xl rotate-12"></i>
                    </div>
                    <div class="flex items-center gap-6 relative z-10">
                        <div class="w-16 h-16 rounded-2xl bg-[#5865F2]/20 flex items-center justify-center text-3xl text-[#5865F2]">
                            <i class="fas fa-bell"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-white">Push Oznámení</h3>
                            <p class="text-gray-400 text-sm">Zůstaň v obraze, i když nejsi v aplikaci.</p>
                            <div id="notification-status-text" class="text-[10px] font-bold uppercase tracking-widest mt-2">
                                Stav: <span class="text-gray-500">Zjišťuji...</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 relative z-10 w-full md:w-auto">
                        <button onclick="Stats.testNotification()" 
                                class="flex-1 md:flex-none border border-[#5865F2]/30 hover:bg-[#5865F2]/10 text-[#5865F2] px-6 py-4 rounded-2xl font-black transition text-xs uppercase tracking-widest">
                            <i class="fas fa-paper-plane mr-2"></i> Test
                        </button>
                        <button onclick="Stats.requestPushPermission()" 
                                id="notif-request-btn"
                                class="flex-1 md:flex-none bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-4 rounded-2xl font-black shadow-xl transition transform hover:scale-105 active:scale-95 text-xs uppercase tracking-widest">
                            Povolit 🔔
                        </button>
                    </div>
                </div>

                <!-- Data Export Section -->
                <div class="bg-gradient-to-r from-[#5865F2]/20 to-[#eb459e]/20 rounded-3xl border border-white/10 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                            <i class="fas fa-file-export text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-white">Záloha tvých dat</h3>
                            <p class="text-gray-300 text-sm">Stáhni si kompletní historii tvého koutku v JSON formátu.</p>
                        </div>
                    </div>
                    <button onclick="Stats.exportAllData()" 
                            class="bg-white text-[#2f3136] hover:bg-gray-200 px-8 py-4 rounded-2xl font-black shadow-xl transition transform hover:scale-105 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-sm shrink-0">
                        <i class="fas fa-download"></i> Exportovat vše
                    </button>
                </div>
            </div>
            
            <div class="h-20 flex-shrink-0"></div> <!-- Spacer -->
        </div>
    `;

    fetchDetailedStats();
    updateNotificationStatusUI();
}

export async function requestPushPermission() {
    import('../core/utils.js').then(async m => {
        const granted = await m.requestNotificationPermission();
        if (granted) {
            m.sendLocalNotification("Kiscord: Oznámení povolena! ✨", { body: "Teď už ti nic neuteče." });
            updateNotificationStatusUI();
        } else {
            window.dispatchEvent(new CustomEvent('notification', {
                detail: { message: "Oznámení byla zamítnuta nebo nejsou podporována.", type: "error" }
            }));
        }
    });
}

export function testNotification() {
    import('../core/utils.js').then(m => {
        if (Notification.permission === 'granted') {
            m.sendLocalNotification("Testovací mňouknutí! 🐾", {
                body: "Takhle budou vypadat tvoje budoucí notifikace z Kiscordu.",
                vibrate: [200, 100, 200]
            });
        } else {
            window.dispatchEvent(new CustomEvent('notification', {
                detail: { message: "Nejdřív musíš notifikace povolit! 😊", type: "info" }
            }));
        }
    });
}

function updateNotificationStatusUI() {
    const textEl = document.getElementById('notification-status-text');
    const btn = document.getElementById('notif-request-btn');
    if (!textEl || !btn) return;

    const status = Notification.permission;
    if (status === 'granted') {
        textEl.innerHTML = 'Stav: <span class="text-[#3ba55c]">Aktivní ✅</span>';
        btn.innerHTML = 'Povolené <i class="fas fa-check ml-1"></i>';
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-default');
        btn.classList.remove('hover:scale-105', 'active:scale-95');
    } else if (status === 'denied') {
        textEl.innerHTML = 'Stav: <span class="text-[#ed4245]">Zablokováno ❌</span>';
        btn.innerHTML = 'Blokováno';
    } else {
        textEl.innerHTML = 'Stav: <span class="text-gray-500">Nenastaveno ❓</span>';
    }
}

function renderStatCard(label, value, icon, iconColor, bgColor, id) {
    return `
        <div class="bg-[#2f3136] rounded-3xl border border-white/5 p-6 shadow-xl hover:border-[#5865F2]/30 transition-all group overflow-hidden relative">
            <div class="absolute -right-4 -bottom-4 w-24 h-24 ${bgColor} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-center gap-4 mb-4">
                <div class="w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center ${iconColor} text-lg">
                    <i class="fas ${icon}"></i>
                </div>
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${label}</span>
            </div>
            <div class="text-4xl font-black text-white tracking-tighter" ${id ? `id="${id}"` : ''}>${value}</div>
        </div>
    `;
}

// --- CALCULATION HELPERS ---

function calculateDaysTogether() {
    const start = new Date("2025-12-24"); // Datum startu vztahu dle projektu
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

function calculateCompletedBuckets() {
    if (!state.bucketList) return 0;
    return state.bucketList.filter(i => i.status === 'done' || i.is_completed).length;
}

function calculateTotalMovies() {
    if (!state.movieHistory) return 0;
    // movieHistory is an object keyed by dateKey
    return Object.values(state.movieHistory).flat().length;
}

function calculateUnlockedAchievementsCount() {
    return state.achievements?.length || 0;
}

async function fetchDetailedStats() {
    // Wait for all shared data dependencies
    await Promise.all([
        ensureLibraryData(),
        ensureBucketListData(),
        ensureAchievementsData()
    ]);

    // Update Top Row cards (might have been rendered as 0 initially)
    const bucketsEl = document.getElementById('stat-buckets');
    const moviesEl = document.getElementById('stat-movies');
    const achEl = document.getElementById('stat-achievements');
    if (bucketsEl) bucketsEl.innerText = calculateCompletedBuckets();
    if (moviesEl) moviesEl.innerText = calculateTotalMovies();
    if (achEl) achEl.innerText = calculateUnlockedAchievementsCount();

    // 1. Mood average
    renderMoodStats();

    // 2. Library breakdowns
    renderLibraryStats();

    // 3. Render Charts
    setTimeout(() => {
        updateVitalitySummary();
        renderVitalityPanels({
            mood: 'chart-mood',
            sleep: 'chart-sleep',
            water: 'chart-water'
        });
    }, 100);
}

function updateVitalitySummary() {
    const container = document.getElementById('vitality-summary');
    if (!container) return;

    // Use exact 14-day window matching charts.js logic
    const moodArr = [];
    const sleepArr = [];
    const waterArr = [];
    const now = new Date();
    
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const key = `${y}-${m}-${day}`;
        const entry = state.healthData[key] || {};
        
        let mVal = entry.mood || 0;
        if (mVal > 10) mVal = Math.round(mVal / 10);
        moodArr.push(mVal);
        sleepArr.push(entry.sleep || 0);
        waterArr.push(entry.water || 0);
    }

    const validMoods = moodArr.filter(v => v > 0);
    const avgMood = validMoods.length > 0 ? (validMoods.reduce((a,b)=>a+b,0)/validMoods.length).toFixed(1) : "0.0";
    const avgSleep = (sleepArr.reduce((a,b)=>a+b,0)/14).toFixed(1);
    const avgWater = (waterArr.reduce((a,b)=>a+b,0)/14).toFixed(1);

    container.innerHTML = `
        <!-- Mood Tile -->
        <div class="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg group hover:border-[#7B2CBF]/50 transition-all duration-300">
            <div class="w-10 h-10 rounded-xl bg-[#7B2CBF]/10 flex items-center justify-center border border-[#7B2CBF]/20 group-hover:bg-[#7B2CBF]/20">
                <i class="fas fa-heart text-[#7B2CBF]"></i>
            </div>
            <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nálada</p>
                <p class="text-lg font-black text-white leading-tight">${avgMood}<span class="text-xs text-gray-500 ml-0.5">/10</span></p>
            </div>
        </div>
        <!-- Sleep Tile -->
        <div class="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg group hover:border-[#7289da]/50 transition-all duration-300">
            <div class="w-10 h-10 rounded-xl bg-[#7289da]/10 flex items-center justify-center border border-[#7289da]/20 group-hover:bg-[#7289da]/20">
                <i class="fas fa-moon text-[#7289da]"></i>
            </div>
            <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Spánek</p>
                <p class="text-lg font-black text-white leading-tight">${avgSleep}<span class="text-xs text-gray-500 ml-0.5">h</span></p>
            </div>
        </div>
        <!-- Water Tile (Full width on mobile) -->
        <div class="col-span-2 lg:col-span-1 flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg group hover:border-[#00e5ff]/50 transition-all duration-300">
            <div class="w-10 h-10 rounded-xl bg-[#00e5ff]/10 flex items-center justify-center border border-[#00e5ff]/20 group-hover:bg-[#00e5ff]/20">
                <i class="fas fa-droplet text-[#00e5ff]"></i>
            </div>
            <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Voda</p>
                <p class="text-lg font-black text-white leading-tight">${avgWater}<span class="text-xs text-gray-500 ml-0.5">skl</span></p>
            </div>
        </div>
    `;
}

function renderMoodStats() {
    const container = document.getElementById('mood-stats-container');
    if (!container) return;

    const healthData = state.healthData || {};
    const moods = Object.values(healthData)
        .map(h => (typeof h.mood === 'number' && h.mood > 10) ? h.mood / 10 : h.mood)
        .filter(m => typeof m === 'number' && m > 0);

    if (moods.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">Zatím málo dat pro analýzu nálady...</p>';
        return;
    }

    const avg = (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1);
    const last7 = moods.slice(-7);
    const avg7 = (last7.reduce((a, b) => a + b, 0) / last7.length).toFixed(1);

    container.innerHTML = `
        <div class="flex items-end justify-between gap-4">
            <div>
                <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Celkový průměr</div>
                <div class="text-5xl font-black text-white tracking-tighter">${avg}<span class="text-lg text-gray-500">/10</span></div>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-black text-[#faa61a] uppercase tracking-widest mb-1">Posledních 7 dní</div>
                <div class="text-3xl font-black text-[#faa61a] tracking-tighter">${avg7}</div>
            </div>
        </div>
        
        <div class="relative pt-4">
            <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                <span>Včerejšek</span>
                <span>Dnes</span>
            </div>
            <div class="h-2 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                ${last7.map(m => `
                    <div class="h-full flex-1" style="background-color: ${getMoodColor(m)}; opacity: ${0.4 + (m / 10) * 0.6}"></div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderLibraryStats() {
    const container = document.getElementById('library-stats-container');
    if (!container) return;

    const movies = state.library?.movies?.length || 0;
    const series = state.library?.series?.length || 0;
    const seen = state.movieHistory ? Object.values(state.movieHistory).flat().length : 0;

    container.innerHTML = `
        <div class="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">V Knihovně</div>
            <div class="text-2xl font-black text-white">${movies + series}</div>
            <div class="text-[10px] text-gray-500 mt-1">${movies} filmů, ${series} seriálů</div>
        </div>
        <div class="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div class="text-[10px] font-black text-[#5865F2] uppercase tracking-widest mb-1">Zkouknuto</div>
            <div class="text-2xl font-black text-[#5865F2]">${seen}</div>
            <div class="text-[10px] text-gray-500 mt-1">Celkem viděno</div>
        </div>
    `;
}

function getMoodColor(val) {
    if (val <= 3) return '#ed4245'; // Red
    if (val <= 5) return '#faa61a'; // Orange
    if (val <= 7) return '#FEE75C'; // Yellow
    if (val <= 9) return '#3ba55c'; // Green
    return '#eb459e'; // Pink/Awesome
}

// --- EXPORT FUNCTIONALITY ---

export async function exportAllData() {
    import('../core/utils.js').then(async m => {
        m.triggerHaptic('heavy');

        const exportObj = {
            version: '1.0',
            exported_at: new Date().toISOString(),
            user: state.currentUser?.name,
            data: {
                health: state.healthData || {},
                bucketList: state.bucketList || [],
                movieHistory: state.movieHistory || {},
                plannedDates: state.plannedDates || {},
                confessions: state.confessions || [],
                achievements: state.unlockedAchievements || []
            }
        };

        const dataStr = JSON.stringify(exportObj, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `kiscord_export_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        window.dispatchEvent(new CustomEvent('notification', {
            detail: { message: "Záloha stažena! 💾", type: "success" }
        }));
    });
}
