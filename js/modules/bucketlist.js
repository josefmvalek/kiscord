import { supabase } from '../core/supabase.js';
import { triggerHaptic } from '../core/utils.js';
import { state } from '../core/state.js';
import { autoUnlock } from './achievements.js';

// Lokální state pro tento modul
let bucketListState = [];
let subscription = null;
let currentSelectedCategory = null; // null = auto

const CATEGORIES = {
    'cestování': { icon: '✈️', keywords: ['výlet', 'cesta', 'rakousko', 'itálie', 'moře', 'letenka', 'trip', 'dovolená', 'praha', 'brno', 'vídeň'], color: '#5865F2' },
    'jídlo': { icon: '🍕', keywords: ['jídlo', 'večeře', 'restaurace', 'vaření', 'pizza', 'sushi', 'burger', 'degustace', 'pívečko', 'víno'], color: '#ed4245' },
    'dobrodružství': { icon: '🌲', keywords: ['hory', 'les', 'kempování', 'stan', 'adrenalin', 'skákání', 'ferata', 'trek', 'příroda'], color: '#3ba55c' },
    'domov': { icon: '🏠', keywords: ['domov', 'pokoj', 'renovace', 'zahrada', 'nábytek', 'byt', 'dům'], color: '#faa61a' },
    'zábava': { icon: '💡', keywords: ['kino', 'koncert', 'párty', 'hra', 'muzeum', 'divadlo', 'festival', 'akce'], color: '#eb459e' }
};

function getAutoCategory(title) {
    const lowerTitle = title.toLowerCase();
    for (const [cat, data] of Object.entries(CATEGORIES)) {
        if (data.keywords.some(k => lowerTitle.includes(k))) return cat;
    }
    return 'jiné';
}

// --- RENDER ---

export async function renderBucketList() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Prvotní UI (kostra + loading state)
    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative">
             <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <!-- Vizuální pozadí -->
                <div class="absolute inset-0 opacity-20 bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop'); filter: blur(4px);"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#2f3136] to-transparent"></div>

                <div class="relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#faa61a] to-[#ed4245] shadow-lg mb-4 transform hover:rotate-12 transition-transform">
                    <i class="fas fa-star text-white text-3xl drop-shadow-md"></i>
                </div>
                <h1 class="relative z-10 text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-lg text-center">Společný Bucket List</h1>
                <p class="relative z-10 text-gray-300 font-medium mt-2 text-center max-w-md">Sny, přání a  nápady, který jednou zažijeme.</p>
            </div>

            <!-- Input Sekce -->
            <div class="w-full max-w-2xl mx-auto px-4 -mt-6 z-20">
                <div class="bg-[#202225] rounded-2xl p-4 lg:p-6 shadow-2xl border border-white/5 flex flex-col gap-4">
                    <div class="flex flex-col sm:flex-row gap-3">
                        <input type="text" id="bucket-input-title" placeholder="Přidat nápad..." class="flex-1 bg-[#2f3136] text-white px-5 py-4 rounded-xl border border-transparent focus:border-[#faa61a] focus:outline-none transition-all placeholder-gray-500 font-medium text-lg shadow-inner">
                        <button onclick="import('./js/modules/bucketList.js').then(m => m.addBucketItem())" class="bg-[#faa61a] hover:bg-[#e09115] text-white px-8 py-4 rounded-xl font-black shadow-[0_10px_20px_rgba(250,166,26,0.3)] transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap uppercase tracking-widest text-sm">
                            <i class="fas fa-plus mr-2"></i> Přidat
                        </button>
                    </div>

                    <!-- Category Selector -->
                    <div class="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
                        <span class="text-[10px] font-black uppercase text-white/30 tracking-widest mr-2">Kategorie:</span>
                        ${Object.entries(CATEGORIES).map(([id, data]) => `
                            <button id="cat-btn-${id}" onclick="import('./js/modules/bucketList.js').then(m => m.setBucketCategory('${id}'))" 
                                class="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group/cat">
                                <span class="text-base group-hover/cat:scale-125 transition-transform">${data.icon}</span>
                                <span class="text-[10px] font-bold text-gray-400 group-hover/cat:text-white uppercase tracking-tighter">${id}</span>
                            </button>
                        `).join('')}
                        <button id="cat-btn-auto" onclick="import('./js/modules/bucketList.js').then(m => m.setBucketCategory(null))" 
                            class="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-[#faa61a]/30 bg-[#faa61a]/10 transition-all font-black text-[10px] text-[#faa61a] uppercase tracking-widest">
                            Auto ✨
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-4 lg:p-8 custom-scrollbar relative">
                <!-- Loading State -->
                <div id="bucket-loading" class="absolute inset-0 flex items-center justify-center bg-[#36393f] z-10">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#faa61a]"></div>
                </div>

                <!-- Grid pro karty -->
                <div id="bucket-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 opacity-0 transition-opacity duration-500">
                    <!-- Položky se vygenerují sem -->
                </div>
            </div>
        </div>
    `;

    // 1. Připojení Realtime Listeners (pokud už nejsme)
    setupRealtime();

    // 2. První Fetch dat
    await fetchBucketData();
}

// --- LOGIKA ---

async function fetchBucketData() {
    const loadingEl = document.getElementById('bucket-loading');
    const gridEl = document.getElementById('bucket-grid');
    if (!gridEl) return;

    try {
        const { data, error } = await supabase
            .from('bucket_list')
            .select('*')
            .order('is_completed', { ascending: true }) // Nesplněné první
            .order('created_at', { ascending: false }); // Nejnovější první

        if (error) throw error;

        bucketListState = data || [];
        renderGrid();

        if (loadingEl) loadingEl.style.display = 'none';
        gridEl.classList.remove('opacity-0');

    } catch (e) {
        console.error("Chyba při načítání Bucket Listu:", e);
        gridEl.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-10 text-gray-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4 text-[#ed4245]"></i>
                <p>Jejda, nepodařilo se načíst sny ze Supabase.</p>
            </div>
        `;
        if (loadingEl) loadingEl.style.display = 'none';
        gridEl.classList.remove('opacity-0');
    }
}

function renderGrid() {
    const gridEl = document.getElementById('bucket-grid');
    if (!gridEl) return;

    if (bucketListState.length === 0) {
        gridEl.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-20 text-center animate-fade-in text-white/50">
                <div class="text-7xl mb-6 animate-pulse">☁️</div>
                <h3 class="text-2xl font-black uppercase tracking-tighter">Zatím se nezdá nic...</h3>
                <p class="text-gray-500 max-w-xs mx-auto">Vymysli to nejbláznivější, co spolu chceme zažít!</p>
            </div>
        `;
        return;
    }

    // Sorting: Both Hearted > 1 Heart > Newest
    const sortedItems = [...bucketListState].sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;

        const aHearts = (a.priority_users || []).length;
        const bHearts = (b.priority_users || []).length;
        if (aHearts !== bHearts) return bHearts - aHearts;

        return new Date(b.created_at) - new Date(a.created_at);
    });

    const active = sortedItems.filter(item => !item.is_completed);
    const completed = sortedItems.filter(item => item.is_completed);

    const generateCard = (item) => {
        const isDone = item.is_completed;
        const hearts = item.priority_users || [];
        const myHeart = hearts.includes(state.currentUser?.id);
        const bothHearted = hearts.length >= 2;
        const catData = CATEGORIES[item.category] || { icon: '✨', color: '#faa61a' };

        const dateStr = item.completed_at
            ? new Date(item.completed_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
            : '';

        return `
            <div class="relative group animate-fade-in flex flex-col h-full transform transition-all duration-500 hover:-translate-y-2">
                <!-- Background Blur/Glow -->
                <div class="absolute inset-x-0 -bottom-4 h-1/2 bg-gradient-to-t transition-all duration-700 blur-[30px] opacity-0 group-hover:opacity-20" style="from: ${catData.color}; to: transparent;"></div>
                
                <!-- Main Glass Card -->
                <div class="relative flex-1 bg-[#2f3136]/50 backdrop-blur-2xl border border-white/5 group-hover:border-${bothHearted ? '[#faa61a]/40' : 'white/20'} rounded-[2rem] p-6 lg:p-7 flex flex-col shadow-2xl transition-all duration-500 ${isDone ? 'grayscale-70 opacity-50' : ''}">
                    
                    ${isDone ? '<div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none"><span class="rotate-[-12deg] bg-[#3ba55c] text-white px-4 py-1.5 rounded-xl font-black text-xl tracking-widest uppercase shadow-xl ring-4 ring-[#3ba55c]/20">Mise Splněna!</span></div>' : ''}

                    <!-- Header -->
                    <div class="flex items-center justify-between mb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl shadow-inner border border-white/5 transition-transform group-hover:scale-110 group-hover:rotate-6">${catData.icon}</div>
                            <div class="flex flex-col">
                                <span class="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 truncate max-w-[80px]">${item.category}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                             <button onclick="import('./js/modules/bucketList.js').then(m => m.toggleHeart('${item.id}'))" 
                                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${myHeart ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}">
                                <i class="${myHeart ? 'fas' : 'far'} fa-heart transition-transform active:scale-150"></i>
                             </button>
                             <button onclick="import('./js/modules/bucketList.js').then(m => m.deleteItem('${item.id}'))" class="w-8 h-8 rounded-lg flex items-center justify-center text-transparent group-hover:text-red-500/40 hover:!text-red-500 transition-all active:scale-90">
                                <i class="fas fa-trash text-[10px]"></i>
                             </button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 mb-6">
                        ${bothHearted ? '<div class="text-[#faa61a] text-[8px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 animate-pulse"><i class="fas fa-star text-[10px]"></i> Společná priorita</div>' : ''}
                        <h3 class="text-xl md:text-2xl font-black text-white leading-[1.1] mb-2 group-hover:text-${bothHearted ? '[#faa61a]' : 'white'} transition-colors">${item.title}</h3>
                        ${item.description ? `<p class="text-gray-400/80 text-sm leading-relaxed line-clamp-2 font-medium">${item.description}</p>` : ''}
                    </div>

                    <!-- Footer -->
                    <div class="mt-auto pt-5 border-t border-white/5 flex items-center justify-between">
                         <div class="flex items-center gap-2">
                            <div class="flex -space-x-2">
                                ${hearts.map(uid => `
                                    <div class="w-7 h-7 rounded-full border-2 border-[#2f3136] bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-[9px] font-black text-white shadow-xl">
                                        ${uid === '00000000-0000-0000-0000-000000000001' ? 'J' : 'K'}
                                    </div>
                                `).join('')}
                            </div>
                            <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest ml-1">${hearts.length === 0 ? 'Bez srdíček' : (bothHearted ? 'OBA!' : 'Čeká se...')}</span>
                         </div>
                         
                         <button onclick="import('./js/modules/bucketList.js').then(m => m.toggleItem('${item.id}', ${!isDone}))" 
                            class="group/btn relative w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 ${isDone ? 'bg-[#3ba55c] text-white shadow-[#3ba55c]/20 shadow-lg' : 'bg-white/5 text-white/20 hover:bg-[#3ba55c] hover:text-white hover:shadow-[#3ba55c]/30 hover:shadow-xl'}">
                            <i class="fas ${isDone ? 'fa-undo-alt' : 'fa-check'} text-base"></i>
                         </button>
                    </div>
                </div>
            </div>
        `;
    };

    let html = '';

    if (active.length > 0) {
        // Show non-completed items
        html += active.map(generateCard).join('');
    }

    if (completed.length > 0) {
        html += `<div class="col-span-full py-16 flex items-center gap-8 group/sep">
                    <div class="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/10"></div>
                    <div class="px-8 py-3 bg-white/5 backdrop-blur-md rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] border border-white/5 shadow-xl transition-all group-hover/sep:text-[#3ba55c] group-hover/sep:border-[#3ba55c]/20">Síň Slávy Splněných Snů 🏆</div>
                    <div class="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/10"></div>
                 </div>`;
        html += completed.map(generateCard).join('');
    }

    gridEl.innerHTML = html;
}

// --- AKCE ---

export function setBucketCategory(cat) {
    currentSelectedCategory = cat;
    triggerHaptic('light');
    
    // Update UI highlights
    document.querySelectorAll('[id^="cat-btn-"]').forEach(btn => {
        btn.classList.remove('bg-[#faa61a]/20', 'border-[#faa61a]/40', 'ring-2', 'ring-[#faa61a]/20');
        btn.classList.add('bg-white/5', 'border-white/5');
    });

    const targetId = cat ? `cat-btn-${cat}` : 'cat-btn-auto';
    const activeBtn = document.getElementById(targetId);
    if (activeBtn) {
        activeBtn.classList.remove('bg-white/5', 'border-white/5');
        activeBtn.classList.add('bg-[#faa61a]/20', 'border-[#faa61a]/40', 'ring-2', 'ring-[#faa61a]/20');
    }
}

export async function addBucketItem() {
    const inputEl = document.getElementById('bucket-input-title');
    const title = inputEl.value.trim();

    if (!title) return;

    inputEl.value = '';
    triggerHaptic('light');

    // Use selected category or fallback to auto
    const category = currentSelectedCategory || getAutoCategory(title);

    const { error } = await supabase.from('bucket_list').insert([{
        title: title,
        is_completed: false,
        category: category
    }]);

    if (error) {
        console.error("Chyba při přidávání:", error);
    } else {
        // Reset selection
        setBucketCategory(null);
        await fetchBucketData();
    }
}

export async function toggleHeart(id) {
    const item = bucketListState.find(i => i.id === id);
    if (!item || !state.currentUser) return;

    let hearts = [...(item.priority_users || [])];
    const myId = state.currentUser.id;

    if (hearts.includes(myId)) {
        hearts = hearts.filter(h => h !== myId);
        triggerHaptic('light');
    } else {
        hearts.push(myId);
        triggerHaptic('medium');
    }

    const { error } = await supabase.from('bucket_list')
        .update({ priority_users: hearts })
        .eq('id', id);

    if (!error) {
        // Update local state immediately for snappy feel
        item.priority_users = hearts;
        renderGrid();
    }
}

export async function toggleItem(id, isCompleted) {
    triggerHaptic(isCompleted ? 'success' : 'medium');
    if (isCompleted && typeof window.triggerConfetti === 'function') {
        window.triggerConfetti();
    }

    const { error } = await supabase.from('bucket_list')
        .update({
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', id);

    if (error) {
        console.error("Chyba při updatu položky:", error);
    } else {
        await fetchBucketData();
    }
}

export async function deleteItem(id) {
    const ok = await window.showConfirmDialog('Opravdu chceš tento sen smazat navždycky?', 'Smazat', 'Zrušit');
    if (!ok) return;

    triggerHaptic('medium');
    const { error } = await supabase.from('bucket_list').delete().eq('id', id);
    if (error) {
        console.error("Chyba při mazání položky:", error);
    } else {
        await fetchBucketData();
    }
}

// --- REALTIME ---

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('bucket-list-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bucket_list' },
            (payload) => {
                console.log('Bucket realtime change:', payload.eventType);
                fetchBucketData();
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}
