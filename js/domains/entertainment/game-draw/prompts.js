import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { isJosef } from '@core/auth.js';
import { playChime } from '@core/sound.js';
import { drawState } from './state.js';
import { broadcastPrompt } from './realtime-sync.js';

export const CURATED_PROMPTS = [
    // 💖 Romantika & Vztah
    "Nakresli naše první rande",
    "Náš vysněný domov za 10 let",
    "Jak si představuješ naši příští dovolenou",
    "Naše oblíbené společné jídlo",
    "Romantická večeře při svíčkách",
    "Náš společný mazlíček v budoucnosti",
    "Co na tobě nejvíc miluju",

    // 😂 Vtipné & Šílené
    "Nakresli mě ráno před kávou",
    "Já jako superhrdina s bizarní superschopností",
    "Partner jako roztomilá brambora",
    "Jak vaříš ty vs jak vařím já",
    "Mimozemšťan, který se snaží pochopit náš vztah",
    "Kočka v obleku na důležitém pracovním pohovoru",

    // 🎓 FIT VUT & Studentský život
    "Zkouškové období v jedné kresbě",
    "Předtermín z algoritmů v pátek večer",
    "Náš pokoj na kolejích snů",
    "Káva z automatu zachraňující život",

    // ⏱️ Výzvy
    "Kresli celou dobu bez zvednutí prstu ze stolu!",
    "Nakresli svůj oblíbený film pouze třemi tahy",
    "Portrét partnera kreslený nedominantní rukou"
];

/**
 * Pick a random prompt from DB or curated fallback
 */
export function pickRandomPrompt() {
    const dbPrompts = (state.gamePrompts && state.gamePrompts.length > 0) 
        ? state.gamePrompts.map(p => p.text) 
        : [];
    
    const pool = dbPrompts.length > 0 ? [...dbPrompts, ...CURATED_PROMPTS] : CURATED_PROMPTS;
    
    // Avoid picking same prompt twice consecutively
    let nextPrompt = pool[Math.floor(Math.random() * pool.length)];
    if (nextPrompt === drawState.currentPrompt && pool.length > 1) {
        nextPrompt = pool[(pool.indexOf(nextPrompt) + 1) % pool.length];
    }

    drawState.currentPrompt = nextPrompt;
    
    const el = document.getElementById('draw-prompt-text');
    if (el) {
        el.textContent = nextPrompt;
        el.classList.remove('animate-pulse');
        void el.offsetWidth;
        el.classList.add('animate-pulse');
    }

    broadcastPrompt(nextPrompt);
    triggerHaptic('medium');
    playChime();
}

/**
 * Show Modal to add custom prompt
 */
export function showAddPromptModal() {
    const existing = document.getElementById('add-prompt-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'add-prompt-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md" onclick="this.parentElement.remove()"></div>
        <div class="bg-[#2f3136] border border-[#eb459e]/30 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col z-10">
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <i class="fas fa-lightbulb text-[#eb459e]"></i> Nové téma pro kreslení
                    </h3>
                    <button onclick="this.closest('#add-prompt-modal').remove()" class="text-gray-400 hover:text-white transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-1.5 ml-1">Zadání / Nápad</label>
                        <textarea id="prompt-input-text" rows="3" class="w-full bg-[#202225] text-white p-3.5 rounded-xl border border-white/10 outline-none focus:border-[#eb459e] focus:ring-1 focus:ring-[#eb459e] transition resize-none placeholder-gray-500 text-sm" placeholder="Např. Nakresli naše příští rande v Paříži..."></textarea>
                    </div>
                    <div class="flex items-center gap-2 pt-2">
                        <button onclick="window.saveNewPrompt()" class="flex-1 bg-gradient-to-r from-[#eb459e] to-[#da3086] hover:brightness-110 text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95 text-sm flex items-center justify-center gap-2">
                            <i class="fas fa-check"></i> Uložit a použít
                        </button>
                        ${isJosef(state.currentUser) ? `
                            <button onclick="window.showPromptManagementModal()" class="bg-[#202225] hover:bg-[#36393f] text-gray-300 hover:text-white px-4 py-3 rounded-xl border border-white/5 transition" title="Správa témat">
                                <i class="fas fa-cog"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('prompt-input-text')?.focus();
}

/**
 * Save new prompt to Supabase
 */
export async function saveNewPrompt() {
    const input = document.getElementById('prompt-input-text');
    const text = input?.value.trim();
    if (!text) {
        showNotification("Zadej text tématu!", "error");
        return;
    }

    try {
        const { data, error } = await supabase.from('game_prompts').insert([{ text }]).select();
        if (error) throw error;

        if (data && data[0]) {
            if (!state.gamePrompts) state.gamePrompts = [];
            state.gamePrompts.push(data[0]);
            
            drawState.currentPrompt = text;
            const el = document.getElementById('draw-prompt-text');
            if (el) el.textContent = text;
            broadcastPrompt(text);

            showNotification("Téma přidáno do seznamu! ✨", "success");
            triggerHaptic('success');
            playChime();
            document.getElementById('add-prompt-modal')?.remove();
        }
    } catch (err) {
        console.error("[Prompts] Failed to save prompt:", err);
        showNotification("Chyba při ukládání tématu.", "error");
    }
}

/**
 * Show management modal for deleting/viewing database prompts
 */
export function showPromptManagementModal() {
    document.getElementById('add-prompt-modal')?.remove();
    const existing = document.getElementById('manage-prompts-modal');
    if (existing) existing.remove();

    const dbPrompts = state.gamePrompts || [];

    const modal = document.createElement('div');
    modal.id = 'manage-prompts-modal';
    modal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in text-left';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/85 backdrop-blur-md" onclick="this.parentElement.remove()"></div>
        <div class="bg-[#2f3136] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] z-10">
            <div class="p-5 border-b border-white/5 flex justify-between items-center bg-[#202225]/60">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <i class="fas fa-tasks text-[#eb459e]"></i> Správa uložených témat (${dbPrompts.length})
                </h3>
                <button onclick="this.closest('#manage-prompts-modal').remove()" class="text-gray-400 hover:text-white transition p-1">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                ${dbPrompts.length === 0 ? `
                    <div class="text-center text-gray-400 py-10">
                        <i class="fas fa-inbox text-3xl mb-2 opacity-40"></i>
                        <p class="text-sm">Vlastní témata jsou zatím prázdná.</p>
                        <p class="text-xs text-gray-500 mt-1">Používají se výchozí kurátorská témata.</p>
                    </div>
                ` : dbPrompts.map(p => `
                    <div class="flex items-center justify-between gap-4 bg-[#202225] p-3.5 rounded-xl border border-white/5 hover:border-[#eb459e]/30 transition group">
                        <span class="text-gray-200 text-sm font-medium flex-1">${p.text}</span>
                        <button onclick="window.deletePrompt('${p.id}')" 
                                class="text-gray-500 hover:text-red-400 p-2 rounded-lg transition" 
                                title="Smazat téma">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Delete prompt from database
 */
export async function deletePrompt(id) {
    const confirmed = await showConfirmDialog('Opravdu smazat toto téma pro kreslení?');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('game_prompts').delete().eq('id', id);
        if (error) throw error;

        state.gamePrompts = (state.gamePrompts || []).filter(p => p.id !== id);
        showNotification("Téma smazáno.", "info");
        triggerHaptic('light');
        
        // Refresh management modal
        showPromptManagementModal();
    } catch (err) {
        console.error("[Prompts] Failed to delete prompt:", err);
        showNotification("Chyba při mazání tématu.", "error");
    }
}
