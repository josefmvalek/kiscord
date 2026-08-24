import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';

export function setupRealtime(id) {
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


export async function toggleDuelMode() {
    if (!activeTierList) return;
    const newDuelStatus = !activeTierList.is_duel;
    triggerHaptic('medium');

    try {
        const updates = { is_duel: newDuelStatus };
        if (newDuelStatus && !activeTierList.duel_data?.revealed) {
            updates.duel_data = {
                jose: structuredClone(activeTierList.data),
                klarka: structuredClone(activeTierList.data),
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


