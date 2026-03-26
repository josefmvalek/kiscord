import { supabase } from '../core/supabase.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { state, ensureBucketListData } from '../core/state.js';
import { safeUpsert, safeInsert } from '../core/offline.js';
import { showNotification } from '../core/theme.js';
import { autoUnlock } from './achievements.js';
import { uploadFile } from '../core/storage.js';
import { renderErrorState, renderButton } from '../core/ui.js';

// Lokální state pro tento modul
// Central state is used (state.bucketList)
let subscription = null;
let currentSelectedCategory = null; // null = auto
let isHeartUpdating = false; // Lock for toggleHeart
let activeStatusFilter = 'all'; // 'all' | 'idea' | 'planned' | 'in_progress' | 'done'

const CATEGORIES = {
    'cestování': { icon: '✈️', keywords: ['výlet', 'cesta', 'rakousko', 'itálie', 'moře', 'letenka', 'trip', 'dovolená', 'praha', 'brno', 'vídeň'], color: '#5865F2' },
    'jídlo': { icon: '🍕', keywords: ['jídlo', 'večeře', 'restaurace', 'vaření', 'pizza', 'sushi', 'burger', 'degustace', 'pívečko', 'víno'], color: '#ed4245' },
    'dobrodružství': { icon: '🌲', keywords: ['hory', 'les', 'kempování', 'stan', 'adrenalin', 'skákání', 'ferata', 'trek', 'příroda'], color: '#3ba55c' },
    'domov': { icon: '🏠', keywords: ['domov', 'pokoj', 'renovace', 'zahrada', 'nábytek', 'byt', 'dům'], color: '#faa61a' },
    'zábava': { icon: '💡', keywords: ['kino', 'koncert', 'párty', 'hra', 'muzeum', 'divadlo', 'festival', 'akce'], color: '#eb459e' }
};

// --- STATUS DEFINITIONS ---
const STATUSES = {
    idea:        { icon: '💭', label: 'Nápad',       color: '#b9bbbe', bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   text: 'text-gray-400' },
    planned:     { icon: '📅', label: 'Naplánováno', color: '#5865F2', bg: 'bg-[#5865F2]/10', border: 'border-[#5865F2]/30', text: 'text-[#5865F2]' },
    in_progress: { icon: '🏃', label: 'V procesu',   color: '#faa61a', bg: 'bg-[#faa61a]/10', border: 'border-[#faa61a]/30', text: 'text-[#faa61a]' },
    done:        { icon: '✅', label: 'Splněno',      color: '#3ba55c', bg: 'bg-[#3ba55c]/10', border: 'border-[#3ba55c]/30', text: 'text-[#3ba55c]' }
};

const STATUS_ORDER = ['idea', 'planned', 'in_progress', 'done'];

function getItemStatus(item) {
    // Backward compatibility: if status column missing, derive from is_completed
    if (item.status) return item.status;
    return item.is_completed ? 'done' : 'idea';
}

function getAutoCategory(title) {
    const lowerTitle = title.toLowerCase();
    for (const [cat, data] of Object.entries(CATEGORIES)) {
        if (data.keywords.some(k => lowerTitle.includes(k))) return cat;
    }
    return 'jiné';
}

// --- RENDER ---

export async function renderBucketList() {
    // Expose API to window to ensure event handlers use the same module instance
    window.BucketList = { 
        cycleStatus, setStatusFilter, addBucketItem, setBucketCategory, 
        toggleHeart, deleteItem, uploadImage 
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative">
             <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden">
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
                        <button onclick="BucketList.addBucketItem()" class="bg-[#faa61a] hover:bg-[#e09115] text-white px-8 py-4 rounded-xl font-black shadow-[0_10px_20px_rgba(250,166,26,0.3)] transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap uppercase tracking-widest text-sm">
                            <i class="fas fa-plus mr-2"></i> Přidat
                        </button>
                    </div>

                    <!-- Category Selector -->
                    <div class="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
                        <span class="text-[10px] font-black uppercase text-white/30 tracking-widest mr-2">Kategorie:</span>
                        ${Object.entries(CATEGORIES).map(([id, data]) => `
                            <button id="cat-btn-${id}" onclick="BucketList.setBucketCategory('${id}')" 
                                class="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group/cat">
                                <span class="text-base group-hover/cat:scale-125 transition-transform">${data.icon}</span>
                                <span class="text-[10px] font-bold text-gray-400 group-hover/cat:text-white uppercase tracking-tighter">${id}</span>
                            </button>
                        `).join('')}
                        <button id="cat-btn-auto" onclick="BucketList.setBucketCategory(null)" 
                            class="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-[#faa61a]/30 bg-[#faa61a]/10 transition-all font-black text-[10px] text-[#faa61a] uppercase tracking-widest">
                            Auto ✨
                        </button>
                    </div>

                    <!-- Status Filter -->
                    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <span class="text-[10px] font-black uppercase text-white/30 tracking-widest mr-1 flex-shrink-0">Filtr:</span>
                        <button id="sf-all" onclick="BucketList.setStatusFilter('all')"
                            class="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 bg-white/10 text-white">
                            Vše
                        </button>
                        ${Object.entries(STATUSES).map(([id, s]) => `
                            <button id="sf-${id}" onclick="BucketList.setStatusFilter('${id}')"
                                class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 bg-white/5 text-gray-400">
                                <span>${s.icon}</span> ${s.label}
                            </button>
                        `).join('')}
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

    setupRealtime();
    await ensureBucketListData();
    renderGrid();

    const catScroll = container.querySelector('.no-scrollbar');
    if (catScroll) {
        catScroll.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) { e.preventDefault(); catScroll.scrollLeft += e.deltaY; }
        });
    }
}

// --- LOGIKA ---

// REMOVED fetchBucketData - now handled by ensureBucketListData in state.js

function renderGrid() {
    const gridEl = document.getElementById('bucket-grid');
    if (!gridEl) return;

    const loadingEl = document.getElementById('bucket-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    gridEl.classList.remove('opacity-0');

    const bucketItems = state.bucketList || [];

    // Apply status filter
    let filtered = bucketItems.filter(item => {
        const st = getItemStatus(item);
        return activeStatusFilter === 'all' || st === activeStatusFilter;
    });

    // Update filter button active states
    ['all', ...Object.keys(STATUSES)].forEach(id => {
        const btn = document.getElementById(`sf-${id}`);
        if (!btn) return;
        const isActive = activeStatusFilter === id;
        if (isActive) {
            btn.classList.add('border-[#faa61a]/40', 'bg-[#faa61a]/15', 'text-[#faa61a]');
            btn.classList.remove('border-white/5', 'bg-white/5', 'text-gray-400', 'border-white/10', 'bg-white/10', 'text-white');
        } else {
            btn.classList.remove('border-[#faa61a]/40', 'bg-[#faa61a]/15', 'text-[#faa61a]');
            if (id === 'all') {
                btn.classList.add('border-white/10', 'bg-white/5', 'text-gray-400');
            } else {
                btn.classList.add('border-white/5', 'bg-white/5', 'text-gray-400');
            }
        }
    });

    if (filtered.length === 0) {
        gridEl.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-20 text-center animate-fade-in text-white/50">
                <div class="text-7xl mb-6 animate-pulse">☁️</div>
                <h3 class="text-2xl font-black uppercase tracking-tighter">${activeStatusFilter === 'all' ? 'Zatím se nezdá nic...' : 'Žádné položky v tomto stavu'}</h3>
                <p class="text-gray-500 max-w-xs mx-auto">${activeStatusFilter === 'all' ? 'Vymysli to nejbláznivější, co spolu chceme zažít!' : 'Zkus jiný filtr.'}</p>
            </div>
        `;
        return;
    }

    // Sorting: Both Hearted > 1 Heart > Newest; done always last within filter
    const sortedItems = [...filtered].sort((a, b) => {
        const aSt = getItemStatus(a);
        const bSt = getItemStatus(b);
        if (aSt === 'done' !== bSt === 'done') return aSt === 'done' ? 1 : -1;

        const aHearts = (a.priority_users || []).length;
        const bHearts = (b.priority_users || []).length;
        if (aHearts !== bHearts) return bHearts - aHearts;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const active = sortedItems.filter(item => getItemStatus(item) !== 'done');
    const completed = sortedItems.filter(item => getItemStatus(item) === 'done');

    const generateCard = (item) => {
        const status = getItemStatus(item);
        const isDone = status === 'done';
        const statusDef = STATUSES[status] || STATUSES.idea;
        const hearts = item.priority_users || [];
        const myHeart = hearts.includes(state.currentUser?.id);
        const bothHearted = hearts.length >= 2;
        const catData = CATEGORIES[item.category] || { icon: '✨', color: '#faa61a' };
        const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];
        const nextStatusDef = STATUSES[nextStatus];

        return `
            <div class="relative group animate-fade-in flex flex-col h-full transform transition-all duration-500 hover:-translate-y-2">
                <div class="glass-card relative flex-1 ${statusDef.border} border rounded-[2rem] p-6 flex flex-col ${isDone ? 'opacity-60' : ''}">
                    
                    ${item.image_url ? `
                        <div class="absolute inset-0 rounded-[2rem] overflow-hidden opacity-20 pointer-events-none">
                            <img src="${item.image_url}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-[#2f3136] via-transparent to-transparent"></div>
                        </div>
                    ` : ''}
                    ${isDone ? '<div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none"><span class="rotate-[-12deg] bg-[#3ba55c] text-white px-4 py-1.5 rounded-xl font-black text-xl tracking-widest uppercase shadow-xl ring-4 ring-[#3ba55c]/20">Mise Splněna!</span></div>' : ''}

                    <!-- Header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <div class="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-lg border border-white/5">${catData.icon}</div>
                            <!-- Status Badge — clickable cycle -->
                            <button onclick="BucketList.cycleStatus('${item.id}', '${status}')"
                                    title="Klikni pro přepnutí stavu → ${nextStatusDef.label}"
                                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${statusDef.bg} ${statusDef.border} border ${statusDef.text} transition-all hover:opacity-80 active:scale-95 text-[9px] font-black uppercase tracking-widest">
                                ${statusDef.icon} ${statusDef.label}
                            </button>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="BucketList.toggleHeart('${item.id}')" 
                                class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${myHeart ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}">
                                <i class="${myHeart ? 'fas' : 'far'} fa-heart text-sm transition-transform active:scale-150"></i>
                            </button>
                            <button onclick="BucketList.deleteItem('${item.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-transparent group-hover:text-red-500/40 hover:!text-red-500 transition-all active:scale-90">
                                <i class="fas fa-trash text-[9px]"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 mb-5">
                        ${bothHearted ? '<div class="text-[#faa61a] text-[8px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 animate-pulse"><i class="fas fa-star text-[10px]"></i> Společná priorita</div>' : ''}
                        <h3 class="text-xl font-black text-white leading-[1.1] mb-2">${item.title}</h3>
                        ${item.description ? `<p class="text-gray-400/80 text-sm leading-relaxed line-clamp-2">${item.description}</p>` : ''}
                        
                        <div class="mt-3 flex items-center gap-2">
                            <button onclick="document.getElementById('bucket-upload-${item.id}').click()" 
                                    class="text-[9px] font-black text-white/30 hover:text-[#faa61a] transition-colors uppercase tracking-widest flex items-center gap-1">
                                <i class="fas fa-camera"></i> ${item.image_url ? 'Změnit fotku' : 'Přidat fotku'}
                            </button>
                            <input type="file" id="bucket-upload-${item.id}" class="hidden" accept="image/*" 
                                   onchange="BucketList.uploadImage('${item.id}', this)">
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                        <div class="flex -space-x-2">
                            ${hearts.map(uid => `
                                <div class="w-6 h-6 rounded-full border-2 border-[#2f3136] bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-[8px] font-black text-white shadow">
                                    ${uid === state.user_ids?.jose ? 'J' : 'K'}
                                </div>
                            `).join('')}
                            ${hearts.length === 0 ? '<span class="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Bez srdíček</span>' : ''}
                            ${bothHearted ? '<span class="text-[9px] text-[#faa61a] font-black uppercase tracking-widest ml-2">OBA!</span>' : ''}
                        </div>
                        
                        <!-- Quick status jump to DONE -->
                        ${!isDone ? `
                        <button onclick="BucketList.cycleStatus('${item.id}', 'in_progress')"
                                title="Označit jako splněno"
                                class="group/done w-10 h-10 rounded-[1.2rem] flex items-center justify-center bg-white/5 text-white/20 hover:bg-[#3ba55c] hover:text-white transition-all duration-300 border border-white/5 hover:border-[#3ba55c] hover:shadow-[0_0_15px_rgba(59,165,92,0.3)]">
                            <i class="fas fa-check text-base"></i>
                        </button>
                        ` : `
                        <button onclick="BucketList.cycleStatus('${item.id}', 'done')"
                                title="Vrátit do nápadu"
                                class="w-10 h-10 rounded-[1.2rem] flex items-center justify-center bg-[#3ba55c] text-white transition-all border border-[#3ba55c] shadow-lg">
                            <i class="fas fa-undo-alt text-sm"></i>
                        </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    };

    let html = '';

    if (active.length > 0) {
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

export function setStatusFilter(filterId) {
    activeStatusFilter = filterId;
    triggerHaptic('light');
    renderGrid();
}

export async function addBucketItem() {
    const inputEl = document.getElementById('bucket-input-title');
    const title = inputEl.value.trim();
    if (!title) return;

    inputEl.value = '';
    triggerHaptic('light');

    const category = currentSelectedCategory || getAutoCategory(title);

    try {
        const { error } = await safeInsert('bucket_list', [{
            title: title,
            status: 'idea',
            is_completed: false,
            category: category
        }]);

        if (error) {
            throw error;
        } else {
            setBucketCategory(null);
            await ensureBucketListData(true);
            showNotification('Nápad přidán! 💭', 'success');
        }
    } catch (e) {
        console.error("Chyba při přidávání Bucket List položky:", e);
        showNotification('Chyba při přidávání nápadu.', 'error');
    }
}

export async function cycleStatus(id, currentStatus) {
    const item = state.bucketList.find(i => i.id === id);
    if (!item) return;

    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    // If clicking the done check button directly from in_progress, jump to done
    // Otherwise cycle forward
    let newStatus;
    if (currentStatus === 'in_progress') {
        // The ✅ button on card triggers cycleStatus('in_progress') → go to done
        newStatus = 'done';
    } else if (currentStatus === 'done') {
        // Undo button → back to idea
        newStatus = 'idea';
    } else {
        // Status badge click → cycle forward
        newStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    }

    const isDone = newStatus === 'done';

    triggerHaptic(isDone ? 'success' : 'medium');
    if (isDone && typeof window.triggerConfetti === 'function') {
        window.triggerConfetti();
        showNotification('Mise splněna! 🏆', 'success');
    }

    const updatePayload = {
        status: newStatus,
        is_completed: isDone,
        completed_at: isDone ? new Date().toISOString() : null
    };

    // Optimistic update
    item.status = newStatus;
    item.is_completed = isDone;
    renderGrid();

    const { error } = await supabase.from('bucket_list')
        .update(updatePayload)
        .eq('id', id);

    if (error) {
        console.error("Chyba při updatu statusu:", error);
        await ensureBucketListData(true); // Re-fetch on error
    }
}

// Keep old toggleItem for backward compat if called externally
export async function toggleItem(id, isCompleted) {
    await cycleStatus(id, isCompleted ? 'in_progress' : 'done');
}

export async function toggleHeart(id) {
    if (isHeartUpdating) return;
    
    const item = state.bucketList.find(i => i.id === id);
    if (!item || !state.currentUser) return;

    isHeartUpdating = true;
    try {
        let heartsSet = new Set(item.priority_users || []);
        const myId = state.currentUser.id;

        if (heartsSet.has(myId)) {
            heartsSet.delete(myId);
            triggerHaptic('light');
        } else {
            heartsSet.add(myId);
            triggerHaptic('medium');
        }

        const newHearts = Array.from(heartsSet);

        const { error } = await supabase.from('bucket_list')
            .update({ priority_users: newHearts })
            .eq('id', id);

        if (!error) {
            item.priority_users = newHearts;
            renderGrid();
        }
    } finally {
        isHeartUpdating = false;
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
        await ensureBucketListData(true);
    }
}

export async function uploadImage(id, input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    showNotification('Nahrávám fotku... ⏳', 'info');

    try {
        const publicUrl = await uploadFile('media', file, `bucketlist/${id}`);
        if (!publicUrl) throw new Error("Upload se nepovedl.");

        const { error } = await supabase.from('bucket_list')
            .update({ image_url: publicUrl })
            .eq('id', id);

        if (error) throw error;

        // Update local state
        const item = state.bucketList.find(i => i.id === id);
        if (item) item.image_url = publicUrl;
        
        renderGrid();
        showNotification('Fotka nahrána! 📸', 'success');
    } catch (err) {
        console.error("Bucket image upload error:", err);
        showNotification('Chyba při nahrávání fotky.', 'error');
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
                ensureBucketListData(true).then(() => renderGrid());
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
