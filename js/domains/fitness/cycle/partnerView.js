import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { getPartnerPrivacyData } from './cycleEngine.js';

/**
 * Vykreslí empatický párový náhled pro partnera s ohledem na soukromí.
 */
export function renderPartnerCycleCard(cycleState, settings) {
    const privacy = getPartnerPrivacyData(cycleState, settings);

    if (!privacy.isShared) {
        return `
        <div class="bento-card bg-[#202225]/80 border border-white/5 p-5 text-center">
            <span class="text-2xl mb-2 block">🔒</span>
            <h3 class="text-sm font-bold text-gray-300">Cyklus a intimní data</h3>
            <p class="text-xs text-gray-500 mt-1">Klárka má nastavené soukromí pro tento modul.</p>
        </div>
        `;
    }

    return `
    <div class="bento-card bento-card-cycle relative overflow-hidden space-y-4">
        <!-- Glow accent -->
        <div class="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-pink-500/15 blur-2xl pointer-events-none"></div>

        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center text-lg shadow-sm">
                    ${privacy.phaseIcon}
                </span>
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-pink-400">Párový status • Klárka</span>
                    <h3 class="text-base font-black text-white">${privacy.phaseName} ${privacy.dayOfCycle ? `(Den ${privacy.dayOfCycle})` : ''}</h3>
                </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${privacy.themeClass}">
                Aktivní fáze
            </span>
        </div>

        <!-- Energy indicator -->
        ${privacy.energy ? `
        <div class="p-3 bg-[#202225] rounded-xl border border-white/5 flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-300">Stav energie:</span>
            <span class="text-xs font-bold text-pink-300">${privacy.energy}</span>
        </div>
        ` : ''}

        <!-- Partner Support Tip -->
        ${privacy.partnerTip ? `
        <div class="p-4 rounded-xl bg-gradient-to-r from-pink-950/40 to-purple-950/30 border border-pink-500/20 space-y-1.5">
            <div class="flex items-center gap-2 text-xs font-black text-pink-300">
                <i class="fas fa-heart text-pink-400"></i>
                <span>Jak dnes Klárku nejlépe podpořit:</span>
            </div>
            <p class="text-xs text-gray-200 leading-relaxed">${privacy.partnerTip}</p>
        </div>
        ` : ''}

        <!-- Quick Partner Action -->
        <div class="pt-2 flex items-center gap-2">
            <button 
                onclick="window.sendPartnerCycleCare()" 
                class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition active:scale-95"
            >
                <i class="fas fa-hand-holding-heart"></i>
                <span>Poslat pohlazení & čokoládu 💖</span>
            </button>
        </div>
    </div>
    `;
}

// Global action handler for partner care button
if (typeof window !== 'undefined') {
    window.sendPartnerCycleCare = async function() {
        triggerHaptic('heartbeat');
        if (typeof window.sendHapticTouchPulse === 'function') {
            await window.sendHapticTouchPulse();
        }
        if (typeof window.showNotification === 'function') {
            window.showNotification('Poslal jsi Klárce lásku a pohlazení! 🫀✨', 'success');
        }
    };
}
