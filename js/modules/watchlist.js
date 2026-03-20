import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { triggerHaptic } from '../core/utils.js';

// --- MODERN WATCHLIST HUB ---

export async function renderWatchlist() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Prvotní UI (skelet)
    container.innerHTML = `
        <div class="flex flex-col h-full animate-fade-in bg-[#36393f] relative overflow-hidden">
            <!-- Background Decoration -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-[#5865F2]/10 rounded-full blur-[100px]"></div>
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-[#eb459e]/10 rounded-full blur-[100px]"></div>

            <!-- HEADER -->
            <div class="relative bg-[#2f3136]/80 backdrop-blur-md border-b border-[#202225] p-6 lg:p-8 z-10">
                <div class="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                            <i class="fas fa-magic text-[#FAA61A] animate-pulse"></i> Náš Entertainment Hub
                        </h1>
                        <p class="text-gray-400 text-sm mt-1">Co si dneska dáme za dobrodružství? 🍿🎮</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="import('./js/modules/watchlist.js').then(m => m.rollTheDice())" 
                            class="bg-gradient-to-r from-[#5865F2] to-[#eb459e] text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl hover:shadow-[#5865F2]/40 transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
                            <i class="fas fa-dice"></i> NÁHODA ROZHODNE
                        </button>
                    </div>
                </div>
            </div>

            <!-- WATCHLIST CONTENT -->
            <div id="wl-loading" class="flex-1 flex items-center justify-center">
                 <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2]"></div>
            </div>
            
            <div id="wl-container" class="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 hidden">
                <div class="max-w-6xl mx-auto space-y-12 pb-20">
                    <!-- Společné (Together Mode) -->
                    <section id="wl-together-section" class="hidden">
                        <div class="flex items-center gap-4 mb-6">
                            <div class="h-px bg-gradient-to-r from-transparent via-[#eb459e] to-transparent flex-1"></div>
                            <h2 class="text-xs font-black text-[#eb459e] uppercase tracking-[0.2em] px-4 flex items-center gap-2">
                                <i class="fas fa-heart"></i> SPOLU-SEZNAM
                            </h2>
                            <div class="h-px bg-gradient-to-r from-transparent via-[#eb459e] to-transparent flex-1"></div>
                        </div>
                        <div id="wl-together-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"></div>
                    </section>

                    <!-- POSLEDNÍ RECENZE (Memories) -->
                    <section id="wl-memories-section" class="mb-12 hidden">
                        <div class="flex items-center gap-4 mb-6">
                            <h2 class="text-xs font-black text-[#eb459e] uppercase tracking-[0.2em] flex items-center gap-2">
                                <i class="fas fa-history"></i> Nedávné zážitky & Recenze
                            </h2>
                            <div class="h-px bg-[#202225] flex-1"></div>
                        </div>
                        <div id="wl-memories-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <!-- History items here -->
                        </div>
                    </section>

                    <!-- Osobní Watchlisty -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <section id="wl-my-section">
                             <div class="flex items-center gap-4 mb-6">
                                <h2 class="text-xs font-black text-[#5865F2] uppercase tracking-[0.2em]">Moje přání 🙋‍♂️</h2>
                                <div class="h-px bg-[#5865F2]/20 flex-1"></div>
                            </div>
                            <div id="wl-my-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-4"></div>
                        </section>

                        <section id="wl-her-section">
                             <div class="flex items-center gap-4 mb-6">
                                <h2 class="text-xs font-black text-[#f47fff] uppercase tracking-[0.2em]">Klářina přání 👸</h2>
                                <div class="h-px bg-[#f47fff]/20 flex-1"></div>
                            </div>
                            <div id="wl-her-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-4"></div>
                        </section>
                    </div>

                    <!-- POSLEDNÍ RECENZE (Memories) -->
                </div>
            </div>
        </div>`;

    fetchAndRenderWatchlist();
}

async function fetchAndRenderWatchlist() {
    try {
        // Fetch watchlist and content
        const { data: watchlistData, error: wlError } = await supabase
            .from('library_watchlist')
            .select('*, library_content(*)');
        
        if (wlError) throw wlError;

        const loading = document.getElementById('wl-loading');
        const container = document.getElementById('wl-container');
        if (loading) loading.style.display = 'none';
        if (container) container.classList.remove('hidden');

        const togetherGrid = document.getElementById('wl-together-grid');
        const myGrid = document.getElementById('wl-my-grid');
        const herGrid = document.getElementById('wl-her-grid');
        const togetherSection = document.getElementById('wl-together-section');

        if (!watchlistData || watchlistData.length === 0) {
            allGrid.innerHTML = `
                <div class="col-span-full py-20 text-center">
                    <i class="fas fa-heart-broken text-6xl text-gray-700 mb-4"></i>
                    <p class="text-gray-500 font-medium">Zatím jste si nic nevybrali...</p>
                    <p class="text-gray-600 text-xs mt-2">Běžte do Knihovny a zaklikněte srdíčko u toho, co vás zaujme!</p>
                </div>
            `;
            return;
        }

        // Processing: Count occurrences for Together mode
        const itemMap = {};
        watchlistData.forEach(entry => {
            const item = entry.library_content;
            if (!item) return;
            if (!itemMap[item.id]) {
                itemMap[item.id] = { ...item, users: [], type: entry.type };
            }
            itemMap[item.id].users.push(entry.added_by);
        });

        const items = Object.values(itemMap);
        const togetherItems = items.filter(i => new Set(i.users).size >= 2);
        
        // Items ONLY added by me or ONLY by her
        const myEntries = items.filter(i => i.users.length === 1 && i.users[0] === state.currentUser?.id);
        const herEntries = items.filter(i => i.users.length === 1 && i.users[0] !== state.currentUser?.id);

        // Render Together Mode
        if (togetherItems.length > 0) {
            togetherSection.classList.remove('hidden');
            togetherGrid.innerHTML = togetherItems.map(item => renderWlCard(item, true)).join('');
        }

        // Render Mine
        if (myGrid) {
            myGrid.innerHTML = myEntries.length > 0 
                ? myEntries.map(item => renderWlCard(item, false)).join('')
                : '<div class="col-span-full py-4 text-center text-xs text-gray-600">Tvůj seznam je prázdný</div>';
        }

        // Render Hers
        if (herGrid) {
            herGrid.innerHTML = herEntries.length > 0
                ? herEntries.map(item => renderWlCard(item, false)).join('')
                : '<div class="col-span-full py-4 text-center text-xs text-gray-600">Klárka tu ještě nic nemá</div>';
        }

        // Render Memories
        renderMemories();

    } catch (err) {
        console.error("Watchlist Fetch Error:", err);
        const loading = document.getElementById('wl-loading');
        if (loading) loading.style.display = 'none';
        const container = document.getElementById('wl-container');
        if (container) container.classList.remove('hidden');
    }
}

function renderMemories() {
    const memoriesContainer = document.getElementById('wl-memories-list');
    const memoriesSection = document.getElementById('wl-memories-section');
    if (!memoriesContainer || !memoriesSection) return;

    // Flatten movieHistory and sort by date
    const allHistory = [];
    const historyData = state.movieHistory || {};
    Object.keys(historyData).forEach(date => {
        (historyData[date] || []).forEach(item => {
            allHistory.push({ ...item, seen_date: date });
        });
    });

    allHistory.sort((a, b) => new Date(b.seen_date) - new Date(a.seen_date));
    const recent = allHistory.slice(0, 6);

    if (recent.length > 0) {
        memoriesSection.classList.remove('hidden');
        memoriesContainer.innerHTML = recent.map(item => {
            const libItem = [...state.library.movies, ...state.library.series].find(m => m.id === item.media_id);
            const title = libItem ? libItem.title : "Neznámý titul";
            const icon = libItem ? libItem.icon : "🎬";
            const ratingStars = "⭐".repeat(item.rating || 0);
            
            return `
                <div class="bg-[#2f3136] border border-[#202225] rounded-xl p-3 flex items-center gap-4 hover:border-[#eb459e]/30 transition group cursor-pointer" 
                     onclick="import('./js/modules/library.js').then(m => m.openHistoryModal(${item.media_id}))">
                    <div class="w-12 h-12 rounded-lg bg-[#202225] flex items-center justify-center text-3xl group-hover:scale-110 transition">
                        ${icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[10px] text-[#eb459e] font-bold uppercase mb-0.5">${new Date(item.seen_date).toLocaleDateString('cs-CZ')}</div>
                        <div class="text-sm font-bold text-white truncate">${title}</div>
                        <div class="text-xs text-yellow-400 mt-1">${ratingStars}</div>
                    </div>
                    <div class="text-2xl opacity-50 group-hover:opacity-100 transition">
                        ${item.status === 'seen' ? '🔥' : '🍿'}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        memoriesSection.classList.add('hidden');
    }
}

function renderWlCard(item, isTogether) {
    const iconClass = item.type === 'game' ? 'fa-gamepad' : 'fa-film';
    return `
        <div class="relative group cursor-pointer" onclick="import('./js/modules/library.js').then(m => m.openHistoryModal(${item.id}))">
            <!-- Card Overlay with Moods -->
            <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-xl pointer-events-none">
                <div class="flex flex-wrap gap-1">
                    ${(item.mood_tags || []).slice(0, 2).map(tag => `<span class="text-[8px] bg-[#5865F2]/30 text-white px-1.5 py-0.5 rounded border border-[#5865F2]/50">${tag}</span>`).join('')}
                </div>
            </div>

            <!-- The Card -->
            <div class="bg-[#2f3136] rounded-xl overflow-hidden border ${isTogether ? 'border-[#eb459e]/50 shadow-[0_0_15px_rgba(235,69,158,0.2)]' : 'border-[#202225]'} hover:border-[#5865F2] transition shadow-lg aspect-[3/4] flex flex-col">
                <div class="flex-1 flex items-center justify-center text-5xl bg-[#202225] group-hover:scale-110 transition-transform duration-500">
                    ${item.icon || '🎞️'}
                </div>
                <div class="p-3 bg-[#2f3136] border-t border-[#202225]">
                    <h3 class="text-xs font-bold text-white truncate mb-1">${item.title}</h3>
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] text-gray-500 uppercase font-black tracking-wider"><i class="fas ${iconClass} mr-1"></i> ${item.type}</span>
                        ${isTogether ? `<i class="fas fa-heart text-[#eb459e] text-[10px]"></i>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- RANDOMIZER ---

export async function rollTheDice() {
    triggerHaptic('medium');
    
    // Fetch Together Items specifically
    const { data: watchlistData } = await supabase
        .from('library_watchlist')
        .select('*, library_content(*)');

    const itemMap = {};
    (watchlistData || []).forEach(entry => {
        const item = entry.library_content;
        if (!item) return;
        if (!itemMap[item.id]) itemMap[item.id] = { ...item, users: new Set() };
        itemMap[item.id].users.add(entry.added_by);
    });

    const pool = Object.values(itemMap).filter(i => i.users.size >= 2);
    
    if (pool.length === 0) {
        if (window.showNotification) window.showNotification("Nenašel jsem nic, co chcete vidět oba. Zkuste nejdřív společně srdíčkovat!", "info");
        return;
    }

    const winner = pool[Math.floor(Math.random() * pool.length)];

    // SHOW MODAL
    showWinnerModal(winner);
}

function showWinnerModal(item) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in';
    modal.innerHTML = `
        <div class="bg-[#2f3136] border border-[#5865F2]/50 rounded-3xl p-10 max-w-sm w-full text-center shadow-[0_0_50px_rgba(88,101,242,0.3)] animate-scale-up">
            <div class="text-3xl font-black text-[#5865F2] mb-2">OSUD ROZHODL! 🌟</div>
            <div class="text-gray-400 text-sm mb-8 italic">Dneska si dáme...</div>
            
            <div class="w-32 h-32 bg-[#202225] rounded-3xl mx-auto flex items-center justify-center text-7xl mb-6 shadow-inner border border-white/5">
                ${item.icon}
            </div>
            
            <h2 class="text-2xl font-black text-white mb-2 leading-tight">${item.title}</h2>
            <p class="text-[#FAA61A] font-bold text-sm mb-8 uppercase tracking-widest">${item.type === 'game' ? 'Hra' : 'Filmový večer'}</p>
            
            <div class="flex flex-col gap-3">
                <button onclick="this.closest('div.fixed').remove(); import('./js/modules/library.js').then(m => m.openPlanningModal('${item.title.replace(/'/g, "\\'")}', '${item.type === 'game' ? 'game' : 'movie'}'))" 
                    class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-4 rounded-xl font-black transition transform hover:scale-105">
                    NAPLÁNOVAT TEĎ! 📅
                </button>
                <button onclick="this.closest('div.fixed').remove()" class="w-full py-2 text-gray-500 hover:text-white transition text-sm">
                    Možná jindy...
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
}
