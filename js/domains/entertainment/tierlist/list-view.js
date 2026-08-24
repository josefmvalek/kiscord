import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';

export async function loadTierLists() {
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
            await import('@core/state.js').then(s => s.ensureLibraryData(true));
            pool = state.library.movies.filter(m => state.ratings[m.id]).map(m => ({ id: m.id, name: m.title, icon: m.icon || '🎬' }));
        } else if (cat === 'timeline') {
            await import('@core/state.js').then(s => s.ensureTimelineData());
            pool = state.timelineEvents.map(e => ({ id: e.id, name: e.title, icon: e.icon || '📸' }));
        } else if (cat === 'locations') {
            await import('@core/state.js').then(s => s.ensureMapData());
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

