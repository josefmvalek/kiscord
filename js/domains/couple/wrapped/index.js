/**
 * Kiscord Couple Wrapped & Relationship Analytics Module Orchestrator
 */

import { triggerHaptic } from '@core/utils.js';

export * from './analytics.js';
export * from './slides.js';
export * from './player.js';
export * from './canvas-export.js';

import { calculateCoupleWrapped, getNames } from './analytics.js';
import { openCoupleWrappedStories } from './player.js';
import { showCardPreviewModal } from './canvas-export.js';

let currentPeriod = 'all';

export function renderCoupleWrapped(period = null) {
    if (period) currentPeriod = period;
    const container = document.getElementById("messages-container");
    if (!container) return;

    const stats = calculateCoupleWrapped(currentPeriod);
    const { myName, partnerName } = getNames();

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden select-none">
            <!-- Header bar -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 flex items-center justify-center text-2xl text-pink-400 border border-pink-500/30 shadow-inner">
                        💖
                    </div>
                    <div>
                        <h1 class="text-lg font-black text-white uppercase tracking-tight leading-none flex items-center gap-2">
                            <span>Náš Roční & Vztahový Souhrn</span>
                            <span class="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 font-bold font-mono">WRAPPED</span>
                        </h1>
                        <p class="text-xs text-gray-400 font-semibold mt-1">${myName} & ${partnerName} • Společné milníky a statistiky 🎒✨</p>
                    </div>
                </div>

                <!-- Action Buttons & Period Selector -->
                <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <div class="flex bg-[#202225] p-1 rounded-xl border border-white/5 text-xs font-black font-mono">
                        <button onclick="window.CoupleWrapped.changePeriod('all')" class="px-3 py-1.5 rounded-lg transition-all ${currentPeriod === 'all' ? 'bg-[#5865F2] text-white shadow' : 'text-gray-400 hover:text-white'}">Vše</button>
                        <button onclick="window.CoupleWrapped.changePeriod('year')" class="px-3 py-1.5 rounded-lg transition-all ${currentPeriod === 'year' ? 'bg-[#5865F2] text-white shadow' : 'text-gray-400 hover:text-white'}">Tento Rok</button>
                        <button onclick="window.CoupleWrapped.changePeriod('month')" class="px-3 py-1.5 rounded-lg transition-all ${currentPeriod === 'month' ? 'bg-[#5865F2] text-white shadow' : 'text-gray-400 hover:text-white'}">Tento Měsíc</button>
                    </div>

                    <button onclick="window.CoupleWrapped.openStories()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-pink-500/25 active:scale-95 flex items-center gap-2">
                        <i class="fas fa-play text-xs"></i> Spustit Stories
                    </button>
                </div>
            </div>

            <!-- Bento Dashboard Grid -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-24">
                <div class="max-w-4xl mx-auto space-y-6">
                    
                    <!-- HERO BANNER -->
                    <div class="glass-card bg-gradient-to-br from-pink-950/30 via-slate-900 to-purple-950/30 border border-pink-500/20 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div class="space-y-2 text-center md:text-left z-10">
                            <span class="text-[10px] font-black uppercase tracking-widest text-pink-400 font-mono">Dosažený Vztahový Status</span>
                            <h2 class="text-3xl font-black text-white tracking-tight">${stats.rankTitle}</h2>
                            <p class="text-xs text-gray-300 font-medium">${myName} & ${partnerName} • Celkem <strong class="text-amber-400">${stats.daysTogether} dní</strong> společného příběhu ❤️</p>
                        </div>

                        <div class="flex items-center gap-3 z-10">
                            <div class="px-5 py-3 rounded-2xl bg-black/40 border border-white/10 text-center font-mono">
                                <span class="text-[10px] text-gray-400 block uppercase">Level</span>
                                <span class="text-2xl font-black text-amber-400">${stats.relationshipLevel}</span>
                            </div>
                            <button onclick="window.CoupleWrapped.showShareCard()" class="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition active:scale-95 text-sm" title="Stáhnout Stories Kartu">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>

                    <!-- METRICS GRID -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
                        
                        <!-- 1. Gym -->
                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                            <div class="flex items-center justify-between text-emerald-400">
                                <span class="text-2xl">🏋️‍♂️</span>
                                <span class="text-xs font-bold uppercase tracking-wider">Fitness</span>
                            </div>
                            <div>
                                <span class="text-2xl font-black text-white block">${stats.totalTons} Tun</span>
                                <span class="text-xs text-gray-400">${stats.gymWorkoutsCount} tréninků • ${stats.totalSetsCount} sérií</span>
                            </div>
                            <div class="text-[11px] text-gray-400 border-t border-white/5 pt-2">
                                Ekvivalent: <strong>${stats.elephants}×</strong> slon 🐘
                            </div>
                        </div>

                        <!-- 2. Movies -->
                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                            <div class="flex items-center justify-between text-purple-400">
                                <span class="text-2xl">🍿</span>
                                <span class="text-xs font-bold uppercase tracking-wider">Kultura</span>
                            </div>
                            <div>
                                <span class="text-2xl font-black text-white block">${stats.seenMediaCount} Filmů</span>
                                <span class="text-xs text-gray-400">${stats.mutualMatchesCount} shod v Tinderu</span>
                            </div>
                            <div class="text-[11px] text-gray-400 border-t border-white/5 pt-2">
                                <strong>${stats.topRatedCount}</strong> filmů s plným hodnocením 5★
                            </div>
                        </div>

                        <!-- 3. Love Shop -->
                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                            <div class="flex items-center justify-between text-pink-400">
                                <span class="text-2xl">🎟️</span>
                                <span class="text-xs font-bold uppercase tracking-wider">Romantika</span>
                            </div>
                            <div>
                                <span class="text-2xl font-black text-white block">${stats.redeemedCouponsCount} Voucherů</span>
                                <span class="text-xs text-gray-400">Utraceno 🪙 ${stats.totalCoinsSpent} Love Coins</span>
                            </div>
                            <div class="text-[11px] text-gray-400 border-t border-white/5 pt-2">
                                💆 ${stats.massageCount}× masáž • 🍳 ${stats.breakfastCount}× snídaně
                            </div>
                        </div>

                        <!-- 4. Bucket List -->
                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                            <div class="flex items-center justify-between text-amber-400">
                                <span class="text-2xl">🚀</span>
                                <span class="text-xs font-bold uppercase tracking-wider">Sny</span>
                            </div>
                            <div>
                                <span class="text-2xl font-black text-white block">${stats.completedBucketCount} Cílů</span>
                                <span class="text-xs text-gray-400">${stats.dateLocationsCount} míst na mapě</span>
                            </div>
                            <div class="text-[11px] text-gray-400 border-t border-white/5 pt-2">
                                📸 ${stats.timelinePhotosCount} fotek v Timeline
                            </div>
                        </div>

                        <!-- 5. Games & Arcade -->
                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                            <div class="flex items-center justify-between text-indigo-400">
                                <span class="text-2xl">🕹️</span>
                                <span class="text-xs font-bold uppercase tracking-wider">Hry</span>
                            </div>
                            <div>
                                <span class="text-2xl font-black text-white block">Tetris</span>
                                <span class="text-xs text-gray-400">${stats.tetrisLeader}</span>
                            </div>
                            <div class="text-[11px] text-gray-400 border-t border-white/5 pt-2">
                                🎨 ${stats.drawingsCount} kreseb • ${stats.questsCompleted} splněných questů
                            </div>
                        </div>

                        <!-- 6. Health & Wellness -->
                        <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-lg space-y-3">
                            <div class="flex items-center justify-between text-cyan-400">
                                <span class="text-2xl">💧</span>
                                <span class="text-xs font-bold uppercase tracking-wider">Péče</span>
                            </div>
                            <div>
                                <span class="text-2xl font-black text-white block">${stats.totalWaterLiters} L Vody</span>
                                <span class="text-xs text-gray-400">Společná nálada ${stats.avgMood} / 10</span>
                            </div>
                            <div class="text-[11px] text-gray-400 border-t border-white/5 pt-2">
                                😴 ${stats.totalSleepHours} naspaných hodin
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    `;

    attachWindowCoupleWrapped();
}

export function changePeriod(period) {
    triggerHaptic('light');
    currentPeriod = period;
    renderCoupleWrapped();
}

export function attachWindowCoupleWrapped() {
    window.CoupleWrapped = {
        render: renderCoupleWrapped,
        changePeriod,
        openStories: () => openCoupleWrappedStories(currentPeriod),
        showShareCard: () => {
            const stats = calculateCoupleWrapped(currentPeriod);
            showCardPreviewModal(stats);
        }
    };
    window.openCoupleWrappedStories = openCoupleWrappedStories;
}

if (typeof window !== 'undefined') {
    attachWindowCoupleWrapped();
}

export default {
    renderCoupleWrapped,
    changePeriod,
    openCoupleWrappedStories,
    calculateCoupleWrapped,
    attachWindowCoupleWrapped
};
