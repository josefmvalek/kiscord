/**
 * Love Ritual, Levels & Coins Bento Widget for Main Dashboard (#můj-den)
 */

import { state } from '@core/state.js';
import { isJosef } from '@core/auth.js';
import { getCurrentLevelData } from '@domains/entertainment/levels.js';

export function generateLoveAndLevelsWidget() {
    const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const myCoins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);
    const partnerName = isMeJose ? "Klárka" : "Jožka";
    const partnerCoins = isMeJose ? (state.loveCoins?.klarka || 0) : (state.loveCoins?.jose || 0);

    const levelInfo = getCurrentLevelData();
    const unredeemedCoupons = (state.inventory || []).filter(c => !c.is_redeemed);
    const unredeemedCount = unredeemedCoupons.length;

    return `
        <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-3.5 select-none relative overflow-hidden">
            <!-- Horní lišta -->
            <div class="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                <div class="flex items-center gap-2">
                    <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        ❤️ Vztahový Rituál & Tržnice
                    </h3>
                    <span class="text-[9px] bg-[var(--bg-tertiary)] text-amber-400 font-bold px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">Level ${levelInfo.level}</span>
                </div>

                <div class="flex items-center gap-1.5">
                    <button onclick="window.openRelationshipMilestonesModal()" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        <i class="fas fa-trophy text-[9px]"></i> Milníky
                    </button>
                    <button onclick="window.switchChannel('love-shop')" 
                            class="px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--blurple)] hover:text-[var(--text-header)] rounded-lg text-[10px] font-black uppercase tracking-wider transition border border-[var(--border-subtle)] flex items-center gap-1">
                        <i class="fas fa-store text-[9px]"></i> Obchůdek
                    </button>
                </div>
            </div>

            <!-- Střední část: Progress bar do dalšího levelu -->
            <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-amber-500/30 transition-all"
                 onclick="window.openRelationshipMilestonesModal()" title="Klikni pro zobrazení Stromu milníků">
                <div class="flex justify-between items-center text-[10px] font-bold mb-1.5">
                    <span class="text-[var(--text-normal)] flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                        Postup do Levelu ${levelInfo.level + 1}
                    </span>
                    <span class="text-amber-400 font-black">${levelInfo.currentXP} / ${levelInfo.nextXP} XP (${levelInfo.progressPercentage}%)</span>
                </div>
                <div class="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden p-[1px] border border-[var(--border-subtle)]">
                    <div class="h-full rounded-full bg-gradient-to-r ${levelInfo.color} transition-all duration-700" style="width: ${levelInfo.progressPercentage}%"></div>
                </div>
            </div>

            <!-- Spodní část: Peněženky a Spížka -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Peněženka -->
                <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                        <span class="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest block">Tvoje konto</span>
                        <span class="text-sm font-black text-yellow-400 flex items-center gap-1">${myCoins} <i class="fas fa-coins text-[10px] text-yellow-500"></i></span>
                    </div>
                    <div class="text-right">
                        <span class="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest block">${partnerName}</span>
                        <span class="text-sm font-black text-[var(--text-normal)] flex items-center justify-end gap-1">${partnerCoins} <i class="fas fa-coins text-[10px] text-gray-400"></i></span>
                    </div>
                </div>

                <!-- Spížka rychlý status -->
                <div class="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between cursor-pointer transition"
                     onclick="window.switchChannel('love-shop')">
                    <div class="min-w-0 pr-2">
                        <span class="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest block">Moje Spížka</span>
                        <span class="text-xs font-bold ${unredeemedCount > 0 ? 'text-[#eb459e]' : 'text-[var(--text-normal)]'} truncate block">
                            ${unredeemedCount > 0 ? `🎁 ${unredeemedCount} kupón${unredeemedCount > 1 ? (unredeemedCount < 5 ? 'y' : 'ů') : ''}` : 'Prázdná'}
                        </span>
                    </div>
                    <i class="fas fa-chevron-right text-[var(--text-muted)] text-[10px]"></i>
                </div>
            </div>
        </div>
    `;
}
