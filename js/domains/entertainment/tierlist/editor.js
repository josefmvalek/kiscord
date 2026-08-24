import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal } from '@core/ui.js';

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

