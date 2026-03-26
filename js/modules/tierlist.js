import { supabase } from '../core/supabase.js';
import { state, saveStateToCache } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { renderModal, renderButton } from '../core/ui.js';

let activeTierList = null; // { id, title, category, tiers: [], pool: [] }
let subscription = null;

export async function renderTierList() {
    // Expose API to window
    window.TierList = { 
        showCreateModal, handleCreate, openEditor, saveTierList, 
        toggleDuelMode, renderTierList, showDeleteModal, deleteTierList,
        markReady, revealDuel
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    // Prvotní UI (seznam nebo editor)
    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in overflow-hidden">
            <!-- Header -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-6 lg:p-8 flex flex-col items-center justify-center relative">
                <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div class="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-[#5865F2] bg-[#202225] shadow-[0_0_20px_rgba(88,101,242,0.3)] mb-4">
                    <i class="fas fa-layer-group text-[#5865F2] text-2xl"></i>
                </div>
                <h1 class="relative z-10 text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Tier List Creator</h1>
                <p class="relative z-10 text-gray-400 font-medium mt-2 text-center max-w-md">Rankuj vše od nejlepších vzpomínek po oblíbené filmy.</p>
                
                <div class="mt-6 flex gap-4 relative z-10">
                    <button onclick="TierList.showCreateModal()" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nový Tier List
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div id="tierlist-content" class="flex-1 overflow-y-auto w-full p-4 lg:p-8 custom-scrollbar">
                <div id="tierlist-list" class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Načtené tier listy -->
                    <div class="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 italic">
                         <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2] mb-4"></div>
                         Načítám tvoje žebříčky...
                    </div>
                </div>
            </div>
        </div>
    `;

    loadTierLists();
    cleanupRealtime();
}

function setupRealtime(id) {
    if (subscription) cleanupRealtime();

    subscription = supabase
        .channel(`tier-list-${id}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'tier_lists', filter: `id=eq.${id}` },
            (payload) => {
                console.log('[REALTIME] Received remote update:', payload);
                // Only update if the change didn't come from us (simplified: if data changed)
                if (JSON.stringify(payload.new.data) !== JSON.stringify(activeTierList.data) || 
                    JSON.stringify(payload.new.duel_data) !== JSON.stringify(activeTierList.duel_data) ||
                    payload.new.is_duel !== activeTierList.is_duel) {
                    activeTierList = payload.new;
                    renderEditorUI();
                }
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

async function loadTierLists() {
    try {
        const { data, error } = await supabase
            .from('tier_lists')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
             if (error.code === '42P01') {
                 // Tabulka neexistuje - ukážeme návod
                 renderTableMissingState();
                 return;
             }
             throw error;
        }

        renderListView(data);
    } catch (err) {
        console.error("Load tier lists error:", err);
        const listContainer = document.getElementById('tierlist-list');
        if (listContainer) listContainer.innerHTML = `<div class="col-span-full text-center py-20 text-red-400">Chyba při načítání dat.</div>`;
    }
}

function renderTableMissingState() {
    const listContainer = document.getElementById('tierlist-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="col-span-full py-12 px-6 bg-[#2f3136] rounded-2xl border border-[#faa61a]/30 text-center animate-fade-in-up">
            <div class="text-4xl mb-4">🚧</div>
            <h3 class="text-xl font-bold text-white mb-2">Databáze není připravena</h3>
            <p class="text-gray-400 max-w-md mx-auto mb-6">
                Pro spuštění Tier List Creator je potřeba v Supabase Dashboardu spustit SQL migraci:
                <code class="block bg-black/40 p-3 mt-4 rounded-xl text-xs text-[#faa61a] font-mono select-all">20260324_tier_list_schema.sql</code>
            </p>
            <button onclick="window.location.reload()" class="text-[#5865F2] hover:underline font-bold">
                <i class="fas fa-sync-alt mr-2"></i> Zkusit znovu
            </button>
        </div>
    `;
}

function renderListView(tierLists) {
    const listContainer = document.getElementById('tierlist-list');
    if (!listContainer) return;

    if (!tierLists || tierLists.length === 0) {
        listContainer.innerHTML = `
            <div class="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
                <i class="fas fa-ghost text-5xl mb-4 opacity-20"></i>
                <p>Zatím jsi nevytvořil žádný Tier List.</p>
                <button onclick="TierList.showCreateModal()" class="mt-4 text-[#5865F2] hover:underline font-bold">Začni teď!</button>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = tierLists.map(tl => {
        const isCreator = tl.creator_id === state.currentUser?.id;
        
        return `
            <div onclick="TierList.openEditor('${tl.id}')" 
                 class="bg-[#2f3136] border border-white/5 rounded-2xl p-6 hover:border-[#5865F2]/50 hover:bg-[#32353b] cursor-pointer transition-all group overflow-hidden relative">
                
                <div class="absolute top-0 right-0 w-32 h-32 bg-[#5865F2]/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-[#5865F2]/10 transition-colors pointer-events-none"></div>
                
                ${isCreator ? `
                    <button id="delete-btn-${tl.id}" onclick="event.stopPropagation(); TierList.showDeleteModal('${tl.id}', '${tl.title.replace(/'/g, "\\'")}')" 
                            class="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#ed4245] text-white flex items-center justify-center transition-all z-50 shadow-xl">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                ` : ''}

                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 rounded-xl bg-[#202225] flex items-center justify-center text-xl">
                        ${getCategoryIcon(tl.category)}
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white line-clamp-1">${tl.title}</h3>
                        <p class="text-xs text-gray-500 uppercase font-black tracking-widest leading-none mt-1">${tl.category}</p>
                    </div>
                </div>
                
                <div class="flex gap-1 overflow-hidden h-8 mb-4">
                     ${(tl.data.tiers || []).slice(0, 5).map(t => `<div class="h-full w-2 rounded-sm" style="background-color: ${t.color || '#5865F2'}"></div>`).join('')}
                </div>
    
                <div class="text-xs text-gray-400 flex items-center justify-between">
                    <span>Položek: ${tl.data.pool?.length + tl.data.tiers?.reduce((acc, t) => acc + (t.items?.length || 0), 0) || 0}</span>
                    <i class="fas fa-arrow-right opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
            </div>
        `;
    }).join('');
}

export function showDeleteModal(id, title) {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'delete-confirm-modal';
    
    const content = `
        <div class="text-center py-4">
            <div class="w-20 h-20 bg-[#ed4245]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                <i class="fas fa-trash-alt text-3xl text-[#ed4245]"></i>
            </div>
            <p class="text-gray-300 text-base leading-relaxed">
                Opravdu chceš smazat žebříček <span class="text-white font-bold">"${title}"</span>?<br>
                Tuto akci nelze vzít zpět.
            </p>
        </div>
    `;

    const actions = `
        ${renderButton({ 
            text: 'Zrušit', 
            variant: 'secondary', 
            onclick: "document.getElementById('delete-confirm-modal').remove()",
            className: 'flex-1'
        })}
        ${renderButton({ 
            text: 'Smazat žebříček', 
            variant: 'danger', 
            onclick: `TierList.deleteTierList('${id}'); document.getElementById('delete-confirm-modal').remove();`,
            className: 'flex-1'
        })}
    `;

    modalContainer.innerHTML = renderModal({
        id: 'delete-confirm-inner',
        title: 'Smazat žebříček',
        subtitle: 'Potvrzení akce',
        content: content,
        actions: actions,
        onClose: "document.getElementById('delete-confirm-modal').remove()"
    });

    document.body.appendChild(modalContainer);
    
    // Show modal (remove 'hidden' class from the inner modal generated by renderModal)
    const innerModal = document.getElementById('delete-confirm-inner');
    if (innerModal) {
        innerModal.classList.remove('hidden');
        innerModal.classList.add('flex');
    }
}

export async function deleteTierList(id) {
    triggerHaptic('heavy');

    try {
        const { error } = await supabase
            .from('tier_lists')
            .delete()
            .eq('id', id);

        if (error) throw error;

        window.showNotification("Žebříček smazán 🗑️", "success");
        renderTierList(); // Refresh list
    } catch (err) {
        console.error("Delete error:", err);
        window.showNotification("Chyba při mazání: " + err.message, "error");
    }
}

function getCategoryIcon(cat) {
    switch (cat) {
        case 'movies': return '🍿';
        case 'timeline': return '🎞️';
        case 'locations': return '📍';
        default: return '🧩';
    }
}

// --- MODALS ---

export function showCreateModal() {
    const modal = document.createElement('div');
    modal.id = 'tierlist-create-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in text-left';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm shadow-inner" onclick="this.parentElement.remove()"></div>
        <div class="bg-[#2f3136] border border-[#5865F2]/20 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden animate-scale-in">
            <div class="p-8">
                <h3 class="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <i class="fas fa-plus-circle text-[#5865F2]"></i> Nový Žebříček
                </h3>
                
                <div class="space-y-5">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Název žebříčku</label>
                        <input type="text" id="tl-title" class="w-full bg-[#202225] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-[#5865F2] transition text-lg" placeholder="Moje nejlepší... ">
                    </div>
                    
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kategorie (Zdroj dat)</label>
                        <div class="grid grid-cols-2 gap-3">
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="tl-cat" value="movies" class="peer sr-only" checked>
                                <div class="p-4 bg-[#202225] rounded-2xl border border-white/5 peer-checked:border-[#5865F2] peer-checked:bg-[#5865F2]/10 transition-all text-center group-hover:bg-[#32353b]">
                                    <div class="text-2xl mb-1">🍿</div>
                                    <div class="text-[10px] font-bold text-gray-400 uppercase">Filmy</div>
                                </div>
                            </label>
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="tl-cat" value="timeline" class="peer sr-only">
                                <div class="p-4 bg-[#202225] rounded-2xl border border-white/5 peer-checked:border-[#eb459e] peer-checked:bg-[#eb459e]/10 transition-all text-center group-hover:bg-[#32353b]">
                                    <div class="text-2xl mb-1">🎞️</div>
                                    <div class="text-[10px] font-bold text-gray-400 uppercase">Vzpomínky</div>
                                </div>
                            </label>
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="tl-cat" value="locations" class="peer sr-only">
                                <div class="p-4 bg-[#202225] rounded-2xl border border-white/5 peer-checked:border-[#3ba55c] peer-checked:bg-[#3ba55c]/10 transition-all text-center group-hover:bg-[#32353b]">
                                    <div class="text-2xl mb-1">📍</div>
                                    <div class="text-[10px] font-bold text-gray-400 uppercase">Rande</div>
                                </div>
                            </label>
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="tl-cat" value="custom" class="peer sr-only">
                                <div class="p-4 bg-[#202225] rounded-2xl border border-white/5 peer-checked:border-[#faa61a] peer-checked:bg-[#faa61a]/10 transition-all text-center group-hover:bg-[#32353b]">
                                    <div class="text-2xl mb-1">🧩</div>
                                    <div class="text-[10px] font-bold text-gray-400 uppercase">Vlastní</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <button onclick="TierList.handleCreate()" class="w-full mt-8 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black py-4 rounded-2xl shadow-lg transition transform hover:scale-[1.02] active:scale-95 text-lg">
                    Vytvořit žebříček
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

export async function handleCreate() {
    const title = document.getElementById('tl-title').value.trim();
    const cat = document.querySelector('input[name="tl-cat"]:checked').value;

    if (!title) {
        window.showNotification("Zadej prosím název!", "error");
        return;
    }

    triggerHaptic('medium');

    try {
        // Fetch pool items based on category
        let pool = [];
        if (cat === 'movies') {
            await import('../core/state.js').then(s => s.ensureLibraryData(true));
            pool = state.library.movies.filter(m => state.ratings[m.id]).map(m => ({ id: m.id, name: m.title, icon: m.icon || '🎬' }));
        } else if (cat === 'timeline') {
            await import('../core/state.js').then(s => s.ensureTimelineData());
            pool = state.timelineEvents.map(e => ({ id: e.id, name: e.title, icon: e.icon || '📸' }));
        } else if (cat === 'locations') {
            await import('../core/state.js').then(s => s.ensureMapData());
            pool = state.dateLocations.map(l => ({ id: l.id, name: l.name, icon: l.icon || '📍' }));
        }

        const initialData = {
            tiers: [
                { id: 'tier-s', name: 'S', color: '#ff7f7f', items: [] },
                { id: 'tier-a', name: 'A', color: '#ffbf7f', items: [] },
                { id: 'tier-b', name: 'B', color: '#ffff7f', items: [] },
                { id: 'tier-c', name: 'C', color: '#7fff7f', items: [] },
                { id: 'tier-d', name: 'D', color: '#7fbfff', items: [] }
            ],
            pool: pool
        };

        const { data, error } = await supabase.from('tier_lists').insert([{
            title,
            category: cat,
            creator_id: state.currentUser.id,
            data: initialData
        }]).select();

        if (error) throw error;
        
        document.getElementById('tierlist-create-modal')?.remove();
        if (data && data[0]) {
            openEditor(data[0].id);
        }
    } catch (err) {
        console.error("Create fail:", err);
        window.showNotification("Chyba při vytváření: " + err.message, "error");
    }
}

// --- EDITOR ---

export async function openEditor(id) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2]"></div></div>`;

    try {
        const { data, error } = await supabase.from('tier_lists').select('*').eq('id', id).single();
        if (error) throw error;

        activeTierList = data;
        setupRealtime(id);
        renderEditorUI();
    } catch (err) {

        console.error("Open editor error:", err);
        renderTierList();
    }
}

function renderEditorUI() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in overflow-hidden relative">
            <!-- Discord-style Header -->
            <div class="min-h-12 border-b border-[#202225] flex flex-wrap items-center justify-between px-4 py-2 gap-2 bg-[#36393f] z-20 shadow-sm flex-shrink-0">
                <div class="flex items-center gap-2 md:gap-3">
                    <button onclick="TierList.renderTierList()" class="text-gray-400 hover:text-white transition-colors p-1">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="w-px h-6 bg-white/5 mx-0.5 md:mx-1"></div>
                    <i class="fas fa-layer-group text-gray-400 hidden sm:block"></i>
                    <div class="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <h2 class="text-white font-bold text-xs md:text-sm truncate max-w-[120px] md:max-w-none">${activeTierList.title}</h2>
                        <span class="text-[9px] w-fit bg-[#202225] text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">${activeTierList.category}</span>
                    </div>
                </div>
                
                <div class="flex items-center gap-2">
                    <button id="duel-toggle-btn" onclick="TierList.toggleDuelMode()" 
                            class="${activeTierList.is_duel ? 'bg-[#eb459e] text-white shadow-[0_0_15px_rgba(235,69,158,0.5)]' : 'bg-[#5865F2] text-white border-2 border-white/20 hover:bg-[#4752c4]'} px-3 md:px-5 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 active:scale-90 uppercase tracking-wider">
                        <i class="fas fa-swords"></i> <span>${activeTierList.is_duel ? 'Duel Aktivní' : 'Duel'}</span>
                    </button>
                    <button onclick="TierList.saveTierList()" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-2 md:px-3 py-1.5 rounded text-[10px] md:text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#5865F2]/20">
                        <i class="fas fa-save"></i> <span class="hidden xs:inline">Uložit</span>
                    </button>
                </div>
            </div>

            <!-- Duel Status Bar -->
            ${activeTierList.is_duel ? renderDuelStatusBar() : ''}

            <!-- Centered Workspace -->
            <div class="flex-1 overflow-y-auto custom-scrollbar bg-[#36393f]">
                <div class="max-w-4xl mx-auto py-8 px-4 md:px-6">
                    <main class="space-y-6">
                        <!-- Tiers Section -->
                        <div id="tiers-container" class="space-y-1.5 rounded-xl overflow-hidden shadow-2xl">
                            ${activeTierList.data.tiers.map(tier => renderTierRow(tier)).join('')}
                        </div>

                        <!-- Item Pool Section -->
                        <div class="mt-10">
                            <div class="flex items-center gap-3 mb-4 pl-1">
                                <div class="h-px flex-1 bg-white/5"></div>
                                <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Balíček položek</h3>
                                <div class="h-px flex-1 bg-white/5"></div>
                            </div>
                            
                            <div id="item-pool" class="bg-[#2f3136]/30 border-2 border-dashed border-white/5 rounded-2xl p-6 min-h-[160px] flex flex-wrap justify-center gap-3 sortable-tier transition-all hover:bg-[#2f3136]/50" data-tier-id="pool">
                                ${activeTierList.data.pool.map(item => renderItem(item)).join('')}
                            </div>
                            
                            <p class="text-[10px] text-center text-gray-600 mt-4 font-medium italic">
                                Přetáhněte položky do žebříčku výše 👆
                            </p>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    `;

    initSortable();
}

function renderTierRow(tier) {
    const user = state.currentUser.name?.toLowerCase().includes('klárka') ? 'klarka' : 'jose';
    const isRevealed = activeTierList.duel_data?.revealed;
    
    let displayItems = tier.items || [];

    if (activeTierList.is_duel) {
        if (!isRevealed) {
            displayItems = activeTierList.duel_data[user]?.tiers?.find(t => t.id === tier.id)?.items || [];
        } else {
            const joseItems = activeTierList.duel_data.jose?.tiers?.find(t => t.id === tier.id)?.items || [];
            const klarkaItems = activeTierList.duel_data.klarka?.tiers?.find(t => t.id === tier.id)?.items || [];
            
            // Items in BOTH (Matches)
            const matches = joseItems.filter(ji => klarkaItems.find(ki => ki.id === ji.id));
            const onlyJose = joseItems.filter(ji => !klarkaItems.find(ki => ki.id === ji.id));
            const onlyKlarka = klarkaItems.filter(ki => !joseItems.find(ji => ji.id === ki.id));
            
            return `
                <div class="flex min-h-[110px] mb-1.5 group/row transition-all duration-300">
                    <div class="w-16 md:w-28 flex-shrink-0 flex items-center justify-center rounded-l-2xl text-black/80 font-black text-xl md:text-2xl shadow-[inset_-4px_0_8px_rgba(0,0,0,0.1)] border-r border-black/5" style="background-color: ${tier.color}">
                        ${tier.name}
                    </div>
                    <div class="flex-1 bg-[#2f3136]/40 backdrop-blur-sm rounded-r-2xl border border-white/5 p-2 md:p-4 flex flex-wrap gap-2 md:gap-3 items-center group-hover/row:bg-[#2f3136]/60 transition-colors">
                        ${matches.map(item => renderItem(item, 'match')).join('')}
                        ${onlyJose.map(item => renderItem(item, 'jose')).join('')}
                        ${onlyKlarka.map(item => renderItem(item, 'klarka')).join('')}
                    </div>
                </div>
            `;
        }
    }

    return `
        <div class="flex min-h-[90px] group/row mb-1.5 transition-all duration-300">
            <div class="w-16 md:w-28 flex-shrink-0 flex items-center justify-center rounded-l-2xl text-black/80 font-black text-xl md:text-2xl shadow-[inset_-4px_0_8px_rgba(0,0,0,0.1)] border-r border-black/5" style="background-color: ${tier.color}">
                ${tier.name}
            </div>
            <div id="${tier.id}" class="flex-1 bg-[#2f3136]/40 backdrop-blur-sm rounded-r-2xl border border-white/5 p-2 md:p-3 flex flex-wrap gap-2 md:gap-3 items-center sortable-tier group-hover/row:bg-[#2f3136]/60 transition-colors" data-tier-id="${tier.id}">
                ${displayItems.map(item => renderItem(item)).join('')}
            </div>
        </div>
    `;
}

function renderItem(item, badge = null) {
    let badgeHtml = '';
    let extraClasses = '';
    
    if (badge === 'match') {
        badgeHtml = `
            <div class="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-[#faa61a] border-2 border-[#202225] text-black shadow-lg z-10 animate-bounce">
                <i class="fas fa-check text-[10px] font-black"></i>
            </div>
            <div class="absolute inset-0 rounded-xl border-2 border-[#faa61a]/50 animate-pulse pointer-events-none"></div>
        `;
        extraClasses = 'ring-2 ring-[#faa61a]/30 scale-105 z-10';
    } else if (badge === 'jose') {
        badgeHtml = '<div class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 border-2 border-[#202225] flex items-center justify-center text-[8px] text-white font-bold shadow-lg">M</div>';
    } else if (badge === 'klarka') {
        badgeHtml = '<div class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-pink-500 border-2 border-[#202225] flex items-center justify-center text-[8px] text-white font-bold shadow-lg">S</div>';
    }

    const isFontAwesome = item.icon && item.icon.startsWith('fa-');
    const iconHtml = isFontAwesome ? `<i class="fas ${item.icon} text-[#5865F2] group-hover:scale-110 transition-transform"></i>` : item.icon;

    return `
        <div class="bg-[#202225] hover:bg-[#32353b] border border-white/5 hover:border-[#5865F2]/30 rounded-xl p-3 flex items-center gap-3 shadow-md cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 group relative ${extraClasses}" data-item-id="${item.id}">
             ${badgeHtml}
             <div class="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-lg">${iconHtml}</div>
             <span class="text-xs font-bold text-gray-200 select-none whitespace-nowrap pointer-events-none">${item.name}</span>
        </div>
    `;
}


function initSortable() {
    if (typeof Sortable === 'undefined') {
        console.error("SortableJS not loaded");
        return;
    }

    const tiers = document.querySelectorAll('.sortable-tier');
    tiers.forEach(el => {
        Sortable.create(el, {
            group: 'tiers',
            animation: 200,
            ghostClass: 'opacity-10',
            chosenClass: 'scale-105',
            dragClass: 'shadow-2xl',
            onEnd: () => {
                updateInternalState();
            }
        });
    });
}

function updateInternalState() {
    if (!activeTierList) return;

    const tiers = document.querySelectorAll('.sortable-tier');
    const newData = { tiers: [], pool: [] };

    tiers.forEach(container => {
        const tierId = container.getAttribute('data-tier-id');
        const items = Array.from(container.children).map(child => {
            const itemId = child.getAttribute('data-item-id');
            return findItemInCurrentState(itemId);
        }).filter(i => i !== null);

        if (tierId === 'pool') {
            newData.pool = items;
        } else {
            const tierTemplate = activeTierList.data.tiers.find(t => t.id === tierId);
            newData.tiers.push({ ...tierTemplate, items: items });
        }
    });

    if (activeTierList.is_duel && !activeTierList.duel_data?.revealed) {
        const user = state.currentUser.name?.toLowerCase().includes('klárka') ? 'klarka' : 'jose';
        activeTierList.duel_data[user] = newData;
    } else {
        activeTierList.data = newData;
    }
}

function findItemInCurrentState(id) {
    let item = activeTierList.data.pool.find(i => i.id == id);
    if (item) return item;
    
    for (const tier of activeTierList.data.tiers) {
        item = tier.items.find(i => i.id == id);
        if (item) return item;
    }
    return null;
}

export async function saveTierList() {
    if (!activeTierList) return;
    triggerHaptic('success');
    
    try {
        const payload = { data: activeTierList.data };
        if (activeTierList.is_duel) {
            payload.duel_data = activeTierList.duel_data;
            payload.is_duel = true;
        }

        const { error } = await supabase.from('tier_lists').update(payload).eq('id', activeTierList.id);
        if (error) throw error;
        window.showNotification("Žebříček uložen! 💾", "success");
        if (!activeTierList.is_duel) triggerConfetti();
    } catch (err) {
        console.error("Save error:", err);
        window.showNotification("Chyba při ukládání.", "error");
    }
}

export async function toggleDuelMode() {
    if (!activeTierList) return;
    const newDuelStatus = !activeTierList.is_duel;
    triggerHaptic('medium');

    try {
        const updates = { is_duel: newDuelStatus };
        if (newDuelStatus && !activeTierList.duel_data?.revealed) {
            updates.duel_data = {
                jose: JSON.parse(JSON.stringify(activeTierList.data)),
                klarka: JSON.parse(JSON.stringify(activeTierList.data)),
                revealed: false
            };
        }

        const { error } = await supabase.from('tier_lists').update(updates).eq('id', activeTierList.id);
        if (error) throw error;
        window.showNotification(newDuelStatus ? "Duel spuštěn! ⚔️" : "Duel ukončen.", "success");
    } catch (err) {
        window.showNotification("Chyba při přepnutí duelu.");
    }
}

function renderDuelStatusBar() {
    const isRevealed = activeTierList.duel_data?.revealed;
    const joseReady = activeTierList.duel_data?.jose_ready;
    const klarkaReady = activeTierList.duel_data?.klarka_ready;
    const user = state.currentUser.name?.toLowerCase().includes('klárka') ? 'klarka' : 'jose';
    const amIReady = activeTierList.duel_data?.[`${user}_ready`];

    return `
        <div class="bg-[#eb459e]/5 border-b border-[#eb459e]/20 p-2 md:p-2.5 flex items-center justify-center gap-3 md:gap-8 text-[9px] md:text-[11px] font-bold tracking-wider uppercase z-10 shadow-sm overflow-x-auto no-scrollbar">
            <div class="flex items-center gap-1.5 md:gap-2.5 flex-shrink-0">
                <div class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-[#202225] ${joseReady ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-[#4f545c]'} transition-all duration-500"></div>
                <span class="${joseReady ? 'text-green-400' : 'text-gray-400'} text-[10px] md:text-inherit">Jožka</span>
            </div>
            
            <div class="bg-[#eb459e]/10 px-2 md:px-4 py-1.5 rounded-full border border-[#eb459e]/20 flex items-center gap-1.5 md:gap-2 text-[#eb459e] animate-pulse flex-shrink-0">
                <i class="fas fa-swords text-[10px]"></i>
                <span class="hidden xs:inline text-[9px] md:text-inherit">SOUBOJ ŽEBŘÍČKŮ</span>
            </div>

            <div class="flex items-center gap-1.5 md:gap-2.5 flex-shrink-0">
                <span class="${klarkaReady ? 'text-green-400' : 'text-gray-400'} text-[10px] md:text-inherit">Klárka</span>
                <div class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-[#202225] ${klarkaReady ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-[#4f545c]'} transition-all duration-500"></div>
            </div>
            
            <div class="h-4 md:h-6 w-px bg-white/5 mx-1 md:mx-2"></div>
            
            ${!isRevealed ? `
                <button onclick="TierList.markReady()" 
                        class="${amIReady ? 'bg-[#3ba55c] shadow-green-900/40' : 'bg-[#eb459e] shadow-[#eb459e]/20'} text-white px-3 md:px-5 py-1.5 rounded-full text-[9px] md:text-[10px] font-black shadow-lg transition-all transform hover:scale-105 active:scale-95 flex-shrink-0">
                    ${amIReady ? 'PŘIPRAVEN ✅' : 'HOTOVO'}
                </button>
            ` : ''}
            
            ${joseReady && klarkaReady && !isRevealed ? `
                <button onclick="TierList.revealDuel()" 
                        class="bg-yellow-500 text-black px-5 py-1.5 rounded-full text-[10px] font-black shadow-lg shadow-yellow-500/20 animate-bounce active:scale-95">
                    ODHALIT VÝSLEDKY! 🔥
                </button>
            ` : ''}
        </div>
    `;
}

export async function markReady() {
    if (!activeTierList || !activeTierList.duel_data) {
        console.error("[TIERLIST] markReady failed: No active tier list or duel data.");
        return;
    }
    const user = state.currentUser.name?.toLowerCase().includes('klárka') ? 'klarka' : 'jose';
    const currentReady = activeTierList.duel_data[`${user}_ready`];
    const isReady = !currentReady;
    
    triggerHaptic('medium');
    
    try {
        const newDuelData = { ...activeTierList.duel_data, [`${user}_ready`]: isReady };
        const { error } = await supabase.from('tier_lists').update({ duel_data: newDuelData }).eq('id', activeTierList.id);
        if (error) throw error;
    } catch (err) {
        console.error("Ready err:", err);
    }
}

export async function revealDuel() {
    if (!activeTierList || !activeTierList.duel_data) {
        console.error("[TIERLIST] revealDuel failed: No active tier list or duel data.");
        return;
    }
    triggerConfetti();
    triggerHaptic('heavy');
    
    try {
        const newDuelData = { ...activeTierList.duel_data, revealed: true };
        const { error } = await supabase.from('tier_lists').update({ duel_data: newDuelData }).eq('id', activeTierList.id);
        if (error) throw error;
        window.showNotification("VÝSLEDKY ODHALENY! 🎉", "success");
    } catch (err) {
        console.error("Reveal err:", err);
    }
}


