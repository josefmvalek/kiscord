import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import {
    loadTierLists,
    renderTableMissingState,
    renderListView,
    showDeleteModal,
    deleteTierList,
    getCategoryIcon,
    showCreateModal,
    handleCreate
} from './list-view.js';
import {
    openEditor,
    renderEditorUI,
    renderTierRow,
    renderItem,
    initSortable,
    updateInternalState,
    findItemInCurrentState,
    saveTierList
} from './editor.js';
import {
    setupRealtime,
    cleanupRealtime,
    toggleDuelMode,
    renderDuelStatusBar,
    markReady,
    revealDuel
} from './duel.js';

export {
    loadTierLists,
    renderTableMissingState,
    renderListView,
    showDeleteModal,
    deleteTierList,
    getCategoryIcon,
    showCreateModal,
    handleCreate,
    openEditor,
    renderEditorUI,
    renderTierRow,
    renderItem,
    initSortable,
    updateInternalState,
    findItemInCurrentState,
    saveTierList,
    setupRealtime,
    cleanupRealtime,
    toggleDuelMode,
    renderDuelStatusBar,
    markReady,
    revealDuel
};

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
                
                <div class="mt-6 flex flex-wrap items-center justify-center gap-3 relative z-10">
                    <button onclick="window.switchChannel('games-hub'); triggerHaptic('light')" 
                            class="bg-[#202225] hover:bg-[#2f3136] text-gray-300 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center gap-2">
                        <i class="fas fa-arrow-left"></i> Zpět do herny
                    </button>
                    <button onclick="TierList.showCreateModal()" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
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

