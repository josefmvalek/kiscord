import { supabase } from '../core/supabase.js';
import { triggerHaptic } from '../core/utils.js';
import { state } from '../core/state.js';
import { autoUnlock } from './achievements.js';

// Lokální state pro tento modul
let bucketListState = [];
let subscription = null; // Pro odhlášení realtime při opuštění modulu

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
                <p class="relative z-10 text-gray-300 font-medium mt-2 text-center max-w-md">Sny, přání a bláznivý nápady, který jednou zažijeme.</p>
            </div>

            <!-- Input Sekce -->
            <div class="w-full max-w-2xl mx-auto px-4 -mt-6 z-20">
                <div class="bg-[#202225] rounded-xl p-4 shadow-xl border border-gray-700/50 flex flex-col sm:flex-row gap-3">
                    <input type="text" id="bucket-input-title" placeholder="Přidat bláznivý nápad..." class="flex-1 bg-[#2f3136] text-white px-4 py-3 rounded-lg border border-transparent focus:border-[#faa61a] focus:outline-none transition-colors placeholder-gray-500 font-medium">
                    <button onclick="import('./js/modules/bucketlist.js').then(m => m.addBucketItem())" class="bg-[#faa61a] hover:bg-[#e09115] text-white px-6 py-3 rounded-lg font-bold shadow-[0_0_15px_rgba(250,166,26,0.2)] transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap">
                        <i class="fas fa-plus mr-2"></i> Přidat
                    </button>
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
            <div class="col-span-full flex flex-col items-center justify-center p-20 text-center animate-fade-in">
                <div class="text-6xl mb-6 opacity-20 group-hover:opacity-100 transition-opacity">☁️</div>
                <h3 class="text-2xl font-bold text-gray-400 mb-2">Zatím tu nic není</h3>
                <p class="text-gray-500">Tak na co ještě čekáš? Vymysli to nejbláznivější, co chceš zažít!</p>
            </div>
        `;
        return;
    }

    // Rozdělení na splněné a nesplněné (jen pro pořadí zobrazení)
    const active = bucketListState.filter(item => !item.is_completed);
    const completed = bucketListState.filter(item => item.is_completed);

    let html = '';

    // Generování karet
    const generateCard = (item) => {
        const isDone = item.is_completed;
        const colorTitle = isDone ? 'text-gray-400 line-through' : 'text-white';
        const colorCard = isDone ? 'bg-[#2f3136] opacity-60 border-gray-700 grayscale' : 'bg-[#2f3136] border-[#202225] hover:border-[#faa61a]/50 hover:shadow-[0_8px_30px_rgba(250,166,26,0.1)]';
        
        const dateStr = item.completed_at 
            ? new Date(item.completed_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
            : '';

        const actionBtn = isDone
            ? `<button onclick="import('./js/modules/bucketlist.js').then(m => m.toggleItem('${item.id}', false))" class="text-gray-500 hover:text-white transition p-2"><i class="fas fa-undo"></i></button>`
            : `<button onclick="import('./js/modules/bucketlist.js').then(m => m.toggleItem('${item.id}', true))" class="text-gray-400 hover:text-[#3ba55c] transition p-2 hover:scale-125 transform"><i class="far fa-check-circle text-2xl"></i></button>`;

        return `
            <div class="${colorCard} rounded-2xl p-5 border transition-all duration-300 transform hover:-translate-y-1 relative group animate-fade-in flex flex-col h-full">
                <!-- Delete btn (hidden but on hover) -->
                <button onclick="import('./js/modules/bucketlist.js').then(m => m.deleteItem('${item.id}'))" class="absolute top-3 right-3 text-red-500/0 group-hover:text-red-500/50 hover:!text-red-500 transition-colors pointer-events-none group-hover:pointer-events-auto">
                    <i class="fas fa-trash text-sm"></i>
                </button>

                <div class="flex-1 pr-6">
                    <h3 class="font-bold text-lg ${colorTitle} mb-2 leading-tight">${item.title}</h3>
                    ${item.description ? `<p class="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-3">${item.description}</p>` : ''}
                </div>

                <div class="mt-auto pt-4 flex items-center justify-between border-t border-gray-700/30">
                     <span class="text-[10px] font-mono text-gray-500 ${isDone ? 'flex items-center gap-1 font-bold text-[#faa61a]' : ''}">
                         ${isDone ? `<i class="fas fa-trophy text-[#faa61a]"></i> Splněno ${dateStr}` : `Máme to v plánu`}
                     </span>
                     ${actionBtn}
                </div>
            </div>
        `;
    };

    html += active.map(generateCard).join('');
    
    if (completed.length > 0) {
        if (active.length > 0) {
            html += `<div class="col-span-full border-t border-gray-700/50 my-4 relative">
                        <span class="absolute left-1/2 -ml-10 -top-3 bg-[#36393f] px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Splněno</span>
                     </div>`;
        }
        html += completed.map(generateCard).join('');
    }

    gridEl.innerHTML = html;
}

// --- AKCE ---

export async function addBucketItem() {
    const inputEl = document.getElementById('bucket-input-title');
    const title = inputEl.value.trim();

    if (!title) return;

    // Optimistický UI update vložení
    inputEl.value = '';
    triggerHaptic('light');

    const { error } = await supabase.from('bucket_list').insert([{
        title: title,
        is_completed: false
    }]);

    if (error) {
        console.error("Chyba při přidávání:", error);
    } else {
        // Okamžitá obnova dat
        await fetchBucketData();
        
        // Auto-achievement: Snílci (přidána první položka)
        if (bucketListState && bucketListState.length >= 1) {
             autoUnlock('bucket_starter');
        }
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
    if (subscription) return; // Už posloucháme

    subscription = supabase
        .channel('custom-all-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bucket_list' },
            (payload) => {
                console.log('Realtime change received!', payload);
                // Refreshneme data ze Supabase (nebo updatneme lokální pole)
                // Pro jistotu přesnosti dat pošleme fetch, nebo rovnou updatneme. 
                // Fetch je bezpečnější pro řazení
                fetchBucketData();
            }
        )
        .subscribe();
}

// Call toto při zavření modulu (např v main.js switchChannel) pokud chceš ušetřit konexe
export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}
