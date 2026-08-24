import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';

export function showAddPromptModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="bg-[#2f3136] border border-[#f472b6]/20 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">
            <div class="p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-plus-circle text-[#f472b6]"></i> Přidat téma kreslení
                </h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Téma / Úkol</label>
                        <textarea id="prompt-text" rows="3" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 outline-none focus:border-[#f472b6] transition resize-none" placeholder="Např. Nakresli nás na Marsu..."></textarea>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.loadModule('gameDraw').then(m => m.saveNewPrompt())" class="w-full bg-[#f472b6] hover:bg-[#db2777] text-white font-bold py-3 rounded-xl shadow-lg transition transform hover:scale-[1.02] active:scale-95">
                            Uložit téma
                        </button>
                        ${isJosef(state.currentUser) ? `
                            <button onclick="window.loadModule('gameDraw').then(m => m.showPromptManagementModal())" class="bg-[#2f3136] hover:bg-[#3ba55c] text-white p-2 rounded-xl transition" title="Spravovat témata">
                                <i class="fas fa-cog"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('prompt-text')?.focus();
}

export async function saveNewPrompt() {
    const text = document.getElementById('prompt-text')?.value.trim();
    if (!text) {
        if (window.showNotification) window.showNotification("Zadej text tématu!", "error");
        return;
    }

    try {
        const { data, error } = await supabase.from('game_prompts').insert([{ text }]).select();
        if (error) throw error;

        if (data && data[0]) {
            state.gamePrompts.push(data[0]);
            if (window.showNotification) window.showNotification("Téma přidáno! ✨", "success");
            document.querySelector('.animate-fade-in')?.remove();
            
            // If currently picking, re-render
            const pText = document.getElementById('prompt-display');
            if (pText && pText.innerText.includes('?')) {
                pickPrompt();
            }
        }
    } catch (err) {
        console.error("Failed to save prompt:", err);
        if (window.showNotification) window.showNotification("Chyba při ukládání.", "error");
    }
}

export function pickPrompt() {
    const pool = state.gamePrompts.length > 0 ? state.gamePrompts.map(p => p.text) : [
        "Nakresli naše první rande", 
        "Nakresli naše vysněné bydlení", 
        "Nakresli nás za 50 let"
    ];
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const display = document.getElementById('prompt-display');
    if (display) {
        display.innerText = winner;
        if (broadcastChannel) broadcastChannel.postMessage({ type: 'PICK_PROMPT', text: winner });
    }
}

// Ensure pickPrompt is used where static prompts were used

export function showPromptManagementModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in text-left';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/90 backdrop-blur-md" onclick="this.parentElement.remove()"></div>
        <div class="bg-[#2f3136] border border-white/5 w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">
            <div class="p-6 border-b border-white/5 flex justify-between items-center bg-[#202225]/50">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <i class="fas fa-tasks text-[#f472b6]"></i> Správa témat
                </h3>
                <button onclick="this.closest('.animate-fade-in').remove()" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                ${state.gamePrompts.length === 0 ? '<p class="text-center text-gray-500 py-8">Žádná témata v databázi.</p>' : 
                  state.gamePrompts.map(p => `
                    <div class="flex items-center justify-between gap-4 bg-[#202225] p-3 rounded-xl border border-white/5 group hover:border-[#f472b6]/30 transition">
                        <span class="text-gray-200 text-sm font-medium">${p.text}</span>
                        <button onclick="window.loadModule('gameDraw').then(m => m.deletePrompt('${p.id}'))" 
                                class="text-gray-400 hover:text-red-400 active:text-red-500 transition p-2 rounded-lg" 
                                title="Smazat téma">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

export async function deletePrompt(id) {
    const confirmed = await showConfirmDialog('Opravdu smazat toto téma pro kreslení?');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('game_prompts').delete().eq('id', id);
        if (error) throw error;

        state.gamePrompts = state.gamePrompts.filter(p => p.id !== id);
        showNotification("Téma smazáno.", "info");
        
        // Refresh management modal if open
        const modal = document.querySelector('.z-\\[110\\]');
        if (modal) {
            modal.remove();
            showPromptManagementModal();
        }
    } catch (err) {
        console.error("Failed to delete prompt:", err);
    }
}
