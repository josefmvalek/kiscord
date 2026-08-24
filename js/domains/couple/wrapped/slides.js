/**
 * HTML Templates for 8 Fullscreen Spotify-Style Story Slides
 */

import { getNames } from './analytics.js';

export function buildStorySlides(stats) {
    const { myName, partnerName, myEmoji, partnerEmoji } = getNames();
    const periodLabel = stats.period === 'month' 
        ? `${stats.monthName} ${stats.year}` 
        : stats.period === 'year' ? `Rok ${stats.year}` : 'Náš Celý Příběh';

    return [
        // Slide 1: Intro & Days Together
        `
            <div class="space-y-5 text-center select-none animate-scale-in">
                <div class="flex justify-center -space-x-4 text-4xl py-2">
                    <span class="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center shadow-lg transform -rotate-6 animate-pulse">${myEmoji}</span>
                    <span class="w-16 h-16 rounded-3xl bg-pink-500/20 border-2 border-pink-400/40 flex items-center justify-center shadow-lg transform rotate-6 animate-pulse">${partnerEmoji}</span>
                </div>
                <div>
                    <span class="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] block font-mono">Kiscord Wrapped</span>
                    <h2 class="text-3xl font-black text-white tracking-tight uppercase mt-1">${periodLabel}</h2>
                    <p class="text-xs text-gray-300 mt-1 font-medium">${myName} & ${partnerName} • <strong class="text-pink-400">${stats.daysTogether} dní spolu</strong> ❤️</p>
                </div>
                <div class="p-5 rounded-3xl bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-amber-500/20 border border-white/15 shadow-2xl space-y-2">
                    <span class="text-[9px] font-black uppercase text-pink-300 tracking-wider block font-mono">Dosažený Vztahový Status</span>
                    <div class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300">${stats.rankTitle}</div>
                    <div class="inline-block px-3 py-1 rounded-full bg-white/10 text-white font-mono font-bold text-xs">Level ${stats.relationshipLevel}</div>
                </div>
            </div>
        `,
        // Slide 2: Fitness & Iron Tonnage
        `
            <div class="space-y-4 text-center select-none animate-scale-in">
                <span class="text-5xl inline-block transform hover:rotate-12 transition-transform">🏋️‍♂️</span>
                <div>
                    <span class="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] block font-mono">Fitness & Železo</span>
                    <h2 class="text-3xl font-black text-white tracking-tight">${stats.totalTons} Tun</h2>
                    <p class="text-xs text-gray-300 mt-1">Celková nazvedaná váha v posilovně</p>
                </div>
                <div class="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 shadow-xl">
                    <div class="grid grid-cols-2 gap-2 text-left font-mono">
                        <div class="bg-black/30 p-2.5 rounded-2xl border border-white/5">
                            <span class="text-[9px] text-gray-400 block uppercase">Tréninků</span>
                            <span class="text-lg font-black text-emerald-300">${stats.gymWorkoutsCount}×</span>
                        </div>
                        <div class="bg-black/30 p-2.5 rounded-2xl border border-white/5">
                            <span class="text-[9px] text-gray-400 block uppercase">Sérií</span>
                            <span class="text-lg font-black text-white">${stats.totalSetsCount}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-around gap-2 pt-2 border-t border-white/10 font-mono text-[11px]">
                        <div class="text-center">
                            <span class="text-2xl block">🐘</span>
                            <span class="text-white font-bold">${stats.elephants}×</span>
                            <span class="text-gray-400 block text-[9px]">dospělý slon</span>
                        </div>
                        <div class="text-center">
                            <span class="text-2xl block">🚗</span>
                            <span class="text-white font-bold">${stats.cars}×</span>
                            <span class="text-gray-400 block text-[9px]">osobní auto</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        // Slide 3: Movies & Matcher
        `
            <div class="space-y-4 text-center select-none animate-scale-in">
                <span class="text-5xl inline-block">🍿</span>
                <div>
                    <span class="text-[10px] font-black uppercase text-purple-400 tracking-[0.2em] block font-mono">Filmy, Seriály & Tinder</span>
                    <h2 class="text-3xl font-black text-white tracking-tight">${stats.seenMediaCount} Zhlédnuto</h2>
                    <p class="text-xs text-gray-300 mt-1">Společných filmových večerů</p>
                </div>
                <div class="p-5 rounded-3xl bg-purple-500/10 border border-purple-500/30 space-y-3 shadow-xl text-left">
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">🎲</span>
                            <div>
                                <h4 class="text-xs font-bold text-white">Shod v Tinder Matcheru</h4>
                                <p class="text-[10px] text-gray-400">Okamžitá shoda na první dobrou</p>
                            </div>
                        </div>
                        <span class="text-base font-black text-pink-400 font-mono">${stats.mutualMatchesCount}×</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">⭐</span>
                            <div>
                                <h4 class="text-xs font-bold text-white">Top 5★ Hodnocení</h4>
                                <p class="text-[10px] text-gray-400">Filmy, které vás nadchly</p>
                            </div>
                        </div>
                        <span class="text-base font-black text-amber-400 font-mono">${stats.topRatedCount}</span>
                    </div>
                </div>
            </div>
        `,
        // Slide 4: Love Shop & Vouchers
        `
            <div class="space-y-4 text-center select-none animate-scale-in">
                <span class="text-5xl inline-block">🎟️</span>
                <div>
                    <span class="text-[10px] font-black uppercase text-pink-400 tracking-[0.2em] block font-mono">Láskyplný Obchůdek</span>
                    <h2 class="text-3xl font-black text-white tracking-tight">${stats.redeemedCouponsCount} Voucherů</h2>
                    <p class="text-xs text-gray-300 mt-1">Uplatněných v reálném životě</p>
                </div>
                <div class="p-5 rounded-3xl bg-gradient-to-br from-pink-500/15 to-rose-500/15 border border-pink-500/30 space-y-3 shadow-xl">
                    <div class="grid grid-cols-2 gap-2 text-center font-mono">
                        <div class="p-3 rounded-2xl bg-black/30 border border-white/5">
                            <span class="text-2xl block">💆</span>
                            <span class="text-sm font-black text-pink-300">${stats.massageCount}×</span>
                            <span class="text-[9px] text-gray-400 block mt-0.5">Masáž</span>
                        </div>
                        <div class="p-3 rounded-2xl bg-black/30 border border-white/5">
                            <span class="text-2xl block">🍳</span>
                            <span class="text-sm font-black text-amber-300">${stats.breakfastCount}×</span>
                            <span class="text-[9px] text-gray-400 block mt-0.5">Snídaně</span>
                        </div>
                    </div>
                    <div class="p-2.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono px-3">
                        <span class="text-gray-400">Celkem utraceno mincí:</span>
                        <span class="text-amber-400 font-bold">🪙 ${stats.totalCoinsSpent} Love Coins</span>
                    </div>
                </div>
            </div>
        `,
        // Slide 5: Shared Dreams, Bucket List & Memories
        `
            <div class="space-y-4 text-center select-none animate-scale-in">
                <span class="text-5xl inline-block">🚀</span>
                <div>
                    <span class="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] block font-mono">Sny & Vzpomínky</span>
                    <h2 class="text-3xl font-black text-white tracking-tight">${stats.completedBucketCount} Splněno</h2>
                    <p class="text-xs text-gray-300 mt-1">Společných zážitků z Bucket Listu</p>
                </div>
                <div class="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-xl text-left">
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">🗺️</span>
                            <div>
                                <h4 class="text-xs font-bold text-white">Míst na Mapě Rande</h4>
                                <p class="text-[10px] text-gray-400">Oblíbená a navštívená místa</p>
                            </div>
                        </div>
                        <span class="text-base font-black text-amber-300 font-mono">${stats.dateLocationsCount} míst</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">📸</span>
                            <div>
                                <h4 class="text-xs font-bold text-white">Fotografií v Timeline</h4>
                                <p class="text-[10px] text-gray-400">Uchovaných vzácných momentů</p>
                            </div>
                        </div>
                        <span class="text-base font-black text-pink-300 font-mono">${stats.timelinePhotosCount} snímků</span>
                    </div>
                </div>
            </div>
        `,
        // Slide 6: Arcade Battles & Mini-games
        `
            <div class="space-y-4 text-center select-none animate-scale-in">
                <span class="text-5xl inline-block">🕹️</span>
                <div>
                    <span class="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] block font-mono">Herní Doupě & Souboje</span>
                    <h2 class="text-3xl font-black text-white tracking-tight">Tetris & Kvízy</h2>
                    <p class="text-xs text-gray-300 mt-1">Zábava a vzájemné výzvy pro dva</p>
                </div>
                <div class="p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 space-y-3 shadow-xl text-left">
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div>
                            <span class="text-[10px] text-gray-400 uppercase font-mono block">Vládce Tetrisu</span>
                            <h4 class="text-sm font-black text-indigo-300">👑 ${stats.tetrisLeader}</h4>
                        </div>
                        <span class="text-xs font-mono text-gray-300">J: ${stats.tetrisJose} | K: ${stats.tetrisKlarka}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div>
                            <span class="text-[10px] text-gray-400 uppercase font-mono block">Draw Duel Plátno</span>
                            <h4 class="text-sm font-black text-white">🎨 Kresby a skici</h4>
                        </div>
                        <span class="text-sm font-black text-pink-400 font-mono">${stats.drawingsCount} děl</span>
                    </div>
                </div>
            </div>
        `,
        // Slide 7: Health & Daily Care
        `
            <div class="space-y-4 text-center select-none animate-scale-in">
                <span class="text-5xl inline-block">🌻</span>
                <div>
                    <span class="text-[10px] font-black uppercase text-cyan-400 tracking-[0.2em] block font-mono">Péče o Zdraví & Náladu</span>
                    <h2 class="text-3xl font-black text-white tracking-tight">${stats.avgMood} / 10</h2>
                    <p class="text-xs text-gray-300 mt-1">Průměrná společná nálada</p>
                </div>
                <div class="p-5 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 space-y-3 shadow-xl text-left">
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">💧</span>
                            <div>
                                <h4 class="text-xs font-bold text-white">Vypito Vody</h4>
                                <p class="text-[10px] text-gray-400">${stats.perfectWaterDays} perfektních dnů (8 kapek)</p>
                            </div>
                        </div>
                        <span class="text-base font-black text-cyan-300 font-mono">${stats.totalWaterLiters} Litrů</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                        <div class="flex items-center gap-2.5">
                            <span class="text-xl">🌙</span>
                            <div>
                                <h4 class="text-xs font-bold text-white">Společný Spánek</h4>
                                <p class="text-[10px] text-gray-400">Naspáno celkem hodin</p>
                            </div>
                        </div>
                        <span class="text-base font-black text-indigo-300 font-mono">${stats.totalSleepHours} hod</span>
                    </div>
                </div>
            </div>
        `,
        // Slide 8: Summary & Export Card
        `
            <div class="space-y-4 text-center select-none animate-scale-in relative z-20">
                <span class="text-4xl inline-block">👑</span>
                <div>
                    <span class="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] block font-mono">Finální Souhrn</span>
                    <h2 class="text-2xl font-black text-white uppercase tracking-tight">${myName} & ${partnerName}</h2>
                </div>
                <div class="p-4 rounded-3xl bg-gradient-to-br from-[#1e1f22] to-[#2b2d31] border border-white/15 space-y-2 text-left text-xs font-mono shadow-2xl">
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span class="text-gray-400">🏋️ Železo v gymu:</span>
                        <span class="text-emerald-400 font-bold">${stats.totalTons} tun</span>
                    </div>
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span class="text-gray-400">🍿 Zhlédnuto filmů:</span>
                        <span class="text-purple-400 font-bold">${stats.seenMediaCount}</span>
                    </div>
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span class="text-gray-400">🎟️ Uplatněno voucherů:</span>
                        <span class="text-pink-400 font-bold">${stats.redeemedCouponsCount}</span>
                    </div>
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span class="text-gray-400">🚀 Splněné sny:</span>
                        <span class="text-amber-400 font-bold">${stats.completedBucketCount}</span>
                    </div>
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span class="text-gray-400">💧 Vypito vody:</span>
                        <span class="text-cyan-400 font-bold">${stats.totalWaterLiters} L</span>
                    </div>
                    <div class="flex items-center justify-between pt-0.5">
                        <span class="text-gray-400">✨ Vztahový status:</span>
                        <span class="text-amber-300 font-black">LVL ${stats.relationshipLevel}</span>
                    </div>
                </div>

                <div class="pt-1 relative z-30">
                    <button id="wrapped-open-card-preview-btn" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2 transform active:scale-95">
                        <i class="fas fa-camera-retro"></i> <span>Zobrazit & Sdílet Stories Kartu</span>
                    </button>
                </div>
            </div>
        `
    ];
}
