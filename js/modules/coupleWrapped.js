import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { playFanfare, playChime, playPageFlip } from '../core/sound.js';

// =====================================================================
// 📊 EXPANDED COUPLE WRAPPED & RELATIONSHIP ANALYTICS ENGINE
// =====================================================================

let currentSlideIdx = 0;
let storyTimer = null;
let isStoryPaused = false;
let currentStoryPeriod = 'all';

/**
 * Helper to get names and emojis safely.
 */
export function getNames() {
    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const myName = isJose ? 'Jožka' : 'Klárka';
    const partnerName = isJose ? 'Klárka' : 'Jožka';
    const myEmoji = isJose ? '🦁' : '🌻';
    const partnerEmoji = isJose ? '🌻' : '🦁';
    return { myName, partnerName, myEmoji, partnerEmoji };
}

/**
 * Calculates days together from start date.
 */
export function calculateDaysTogether() {
    const start = new Date(state.startDate || "2025-12-24");
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

/**
 * Safe roundRect implementation for canvas 2D contexts.
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Comprehensive data aggregator across ALL application domains.
 * @param {'all'|'year'|'month'} period
 * @param {number} [targetYear]
 * @param {number} [targetMonth]
 */
export function calculateCoupleWrapped(period = 'all', targetYear = null, targetMonth = null) {
    const currentYear = targetYear || new Date().getFullYear();
    const currentMonth = targetMonth !== null ? targetMonth : new Date().getMonth();

    const isDateInPeriod = (dateStr) => {
        if (!dateStr) return true;
        if (period === 'all') return true;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return true;
        if (period === 'year') {
            return d.getFullYear() === currentYear;
        }
        if (period === 'month') {
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }
        return true;
    };

    // 1. Days Together & Milestones
    const daysTogether = calculateDaysTogether();

    // 2. Fitness & Gym Tracking
    const gymLogs = (state.gymLogs || []).filter(l => isDateInPeriod(l.logged_at || l.date_key));
    let totalVolumeKg = 0;
    let totalSetsCount = 0;
    let totalGymSeconds = 0;
    const exerciseUsage = {};
    const workoutDays = new Set();

    gymLogs.forEach(log => {
        totalGymSeconds += log.duration_seconds || 0;
        const dateKey = log.logged_at || log.date_key;
        if (dateKey) workoutDays.add(dateKey.split('T')[0]);

        (log.exercises || []).forEach(ex => {
            const exName = ex.name || ex.exercise_name || 'Cvik';
            if (!exerciseUsage[exName]) exerciseUsage[exName] = { count: 0, sets: 0, maxWeight: 0 };
            exerciseUsage[exName].count++;

            (ex.sets || []).forEach(s => {
                if (s.completed && s.type !== 'W') {
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps) || 0;
                    totalVolumeKg += w * r;
                    totalSetsCount++;
                    exerciseUsage[exName].sets++;
                    if (w > exerciseUsage[exName].maxWeight) exerciseUsage[exName].maxWeight = w;
                }
            });
        });
    });

    let topExercise = { name: 'Bench Press', sets: 0, maxWeight: 0 };
    let maxSets = 0;
    Object.entries(exerciseUsage).forEach(([name, data]) => {
        if (data.sets > maxSets) {
            maxSets = data.sets;
            topExercise = { name, ...data };
        }
    });

    const totalTons = (totalVolumeKg / 1000).toFixed(1);
    const elephants = (totalVolumeKg / 6000).toFixed(1);
    const cars = (totalVolumeKg / 1500).toFixed(1);
    const prsCount = (state.gymPRs || []).length;

    // 3. Media, Watchlist & Tinder Matcher
    const ratings = state.ratings || {};
    const seenMedia = Object.values(ratings).filter(r => r.status === 'seen' && isDateInPeriod(r.updated_at || r.created_at));
    const watchlist = state.watchlist || [];
    const mutualWishlist = watchlist.filter(w => w.hearted_by_both || w.is_mutual);
    const topRatedMedia = seenMedia.filter(r => r.rating >= 4.5);

    // 4. Love Shop & Romance Economy
    const inventory = state.inventory || [];
    const redeemedCoupons = inventory.filter(c => c.is_redeemed && isDateInPeriod(c.redeemed_at));
    const giftedCoupons = inventory.filter(c => isDateInPeriod(c.created_at));
    const totalCoinsSpent = redeemedCoupons.reduce((sum, c) => sum + (c.love_shop_items?.price || c.cost || 10), 0);
    const totalCoinsInCirculation = (state.loveCoins?.jose || 0) + (state.loveCoins?.klarka || 0);

    const massageCoupons = redeemedCoupons.filter(c => (c.title || c.love_shop_items?.title || '').toLowerCase().includes('masáž'));
    const breakfastCoupons = redeemedCoupons.filter(c => (c.title || c.love_shop_items?.title || '').toLowerCase().includes('snídan'));

    // 5. Shared Dreams, Dates & Memory Timeline
    const bucketList = state.bucketList || [];
    const completedBucketCount = bucketList.filter(b => b.is_completed || b.status === 'done').length;
    const timelineEvents = state.timelineEvents || [];
    const timelinePhotosCount = timelineEvents.reduce((acc, ev) => acc + (ev.images?.length || 1), 0);
    const dateLocations = state.dateLocations || [];
    const plannedDatesCount = Object.keys(state.plannedDates || {}).length;

    // 6. Arcade, Mini-games & Battles
    const tetrisJose = state.tetris?.jose || 0;
    const tetrisKlarka = state.tetris?.klarka || 0;
    const tetrisLeader = tetrisJose > tetrisKlarka ? 'Jožka' : tetrisKlarka > tetrisJose ? 'Klárka' : 'Remíza';
    const drawingsCount = (state.drawStrokes?.length ? 1 : 0) + (state.pinnedDrawing ? 1 : 0);
    const questsCompleted = (state.coopQuests || []).filter(q => q.is_completed).length;
    const unlockedAchievements = state.achievements?.length || 0;

    // 7. Health, Hydration, Sleep & Mood
    const healthHistory = Object.entries(state.healthData || {}).filter(([dateKey]) => isDateInPeriod(dateKey));
    let totalWaterDroplets = 0;
    let moodSum = 0;
    let moodCount = 0;
    let totalSleepHours = 0;
    let perfectWaterDays = 0;

    healthHistory.forEach(([_, h]) => {
        if (h.water) {
            const w = parseInt(h.water) || 0;
            totalWaterDroplets += w;
            if (w >= 8) perfectWaterDays++;
        }
        if (h.mood) {
            moodSum += parseFloat(h.mood) || 0;
            moodCount++;
        }
        if (h.sleep) totalSleepHours += parseFloat(h.sleep) || 0;
    });

    const avgMood = moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '8.8';
    const totalWaterLiters = ((totalWaterDroplets * 250) / 1000).toFixed(0);

    // 8. Relationship Level & Status Calculation
    const totalXP = (gymLogs.length * 20) + 
                    (seenMedia.length * 15) + 
                    (redeemedCoupons.length * 25) + 
                    (completedBucketCount * 50) + 
                    (questsCompleted * 60) + 
                    (unlockedAchievements * 30);
                    
    const calculatedLevel = Math.max(1, Math.floor(totalXP / 100) + 1);

    let rankTitle = 'Soulmates in Training 💖';
    if (calculatedLevel >= 5) rankTitle = 'Dynamic Duo 🤝';
    if (calculatedLevel >= 15) rankTitle = 'Power Couple ⚡';
    if (calculatedLevel >= 30) rankTitle = 'Legendary Partners 👑';
    if (calculatedLevel >= 50) rankTitle = 'Mythic Soulmates ✨';

    return {
        period,
        year: currentYear,
        monthName: new Intl.DateTimeFormat('cs-CZ', { month: 'long' }).format(new Date(currentYear, currentMonth)),
        daysTogether,
        gymWorkoutsCount: gymLogs.length,
        totalGymHours: Math.round(totalGymSeconds / 3600),
        totalVolumeKg: Math.round(totalVolumeKg),
        totalTons,
        elephants,
        cars,
        totalSetsCount,
        topExercise,
        prsCount,
        seenMediaCount: seenMedia.length,
        mutualMatchesCount: mutualWishlist.length,
        topRatedCount: topRatedMedia.length,
        redeemedCouponsCount: redeemedCoupons.length,
        giftedCouponsCount: giftedCoupons.length,
        totalCoinsSpent,
        totalCoinsInCirculation,
        massageCount: massageCoupons.length,
        breakfastCount: breakfastCoupons.length,
        completedBucketCount,
        timelinePhotosCount,
        dateLocationsCount: dateLocations.length,
        plannedDatesCount,
        tetrisJose,
        tetrisKlarka,
        tetrisLeader,
        drawingsCount,
        questsCompleted,
        unlockedAchievements,
        totalWaterDroplets,
        totalWaterLiters,
        perfectWaterDays,
        avgMood,
        totalSleepHours: Math.round(totalSleepHours),
        relationshipLevel: calculatedLevel,
        rankTitle
    };
}

/**
 * Builds 8 rich story slide templates for the fullscreen Stories modal.
 */
function buildStorySlides(stats) {
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

/**
 * Generates a high-resolution 1080x1920 PNG image on an offscreen HTML5 canvas.
 */
export async function generateWrappedCardImage(stats) {
    const { myName, partnerName } = getNames();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Background Gradient (Dark Discord Aesthetic)
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#0f1012');
    bgGrad.addColorStop(0.3, '#1e1b2e');
    bgGrad.addColorStop(0.7, '#131926');
    bgGrad.addColorStop(1, '#090a0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative Glow Orbs
    const orb1 = ctx.createRadialGradient(250, 400, 50, 250, 400, 500);
    orb1.addColorStop(0, 'rgba(235, 69, 158, 0.25)');
    orb1.addColorStop(1, 'transparent');
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, 1080, 1920);

    const orb2 = ctx.createRadialGradient(850, 1400, 50, 850, 1400, 600);
    orb2.addColorStop(0, 'rgba(88, 101, 242, 0.25)');
    orb2.addColorStop(1, 'transparent');
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, 1080, 1920);

    // Header Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    drawRoundedRect(ctx, 340, 140, 400, 70, 35);
    ctx.fill();

    ctx.font = 'bold 30px monospace, sans-serif';
    ctx.fillStyle = '#faa61a';
    ctx.textAlign = 'center';
    ctx.fillText('💖 KISCORD WRAPPED', 540, 186);

    // Title
    const periodLabel = stats.period === 'month' 
        ? `${stats.monthName.toUpperCase()} ${stats.year}` 
        : stats.period === 'year' ? `ROK ${stats.year}` : 'NÁŠ CELÝ PŘÍBĚH';
    ctx.font = '900 68px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(periodLabel, 540, 290);

    ctx.font = 'bold 38px sans-serif';
    ctx.fillStyle = '#eb459e';
    ctx.fillText(`${myName} & ${partnerName} • ${stats.daysTogether} dní spolu`, 540, 355);

    // Rank Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, 140, 410, 800, 130, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 24px monospace, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('VZTAHOVÝ STATUS & LEVEL', 540, 455);

    ctx.font = '900 42px sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`${stats.rankTitle} (LVL ${stats.relationshipLevel})`, 540, 510);

    // 5 Metric Cards
    const cards = [
        { icon: '🏋️‍♂️', title: 'NAZVEDÁNO ŽELEZA', val: `${stats.totalTons} Tun`, sub: `${stats.gymWorkoutsCount} tréninků (${stats.elephants}× slon)`, color: '#34d399' },
        { icon: '🍿', title: 'FILMŮ & SERIÁLŮ', val: `${stats.seenMediaCount} Zhlédnuto`, sub: `${stats.mutualMatchesCount} Tinder shod večer`, color: '#c084fc' },
        { icon: '🎟️', title: 'LÁSKYPLNÝ OBCHŮDEK', val: `${stats.redeemedCouponsCount} Voucherů`, sub: `${stats.massageCount}× masáž, ${stats.breakfastCount}× snídaně`, color: '#f472b6' },
        { icon: '🚀', title: 'BUCKET LIST & ZÁŽITKY', val: `${stats.completedBucketCount} Splněno`, sub: `${stats.dateLocationsCount} míst na mapě • ${stats.timelinePhotosCount} fotek`, color: '#fbbf24' },
        { icon: '💧', title: 'HYDRATACE & PÉČE', val: `${stats.totalWaterLiters} L Vody`, sub: `Nálada ${stats.avgMood}/10 • ${stats.totalSleepHours}h spánku`, color: '#38bdf8' }
    ];

    cards.forEach((c, idx) => {
        const y = 570 + (idx * 225);
        ctx.fillStyle = 'rgba(30, 31, 34, 0.75)';
        drawRoundedRect(ctx, 140, y, 800, 195, 32);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '50px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.icon, 180, y + 115);

        ctx.font = 'bold 22px monospace, sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(c.title, 270, y + 68);

        ctx.font = '900 44px sans-serif';
        ctx.fillStyle = c.color;
        ctx.fillText(c.val, 270, y + 125);

        ctx.font = 'medium 24px sans-serif';
        ctx.fillStyle = '#d1d5db';
        ctx.fillText(c.sub, 270, y + 165);
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px monospace, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('vygenerováno v kiscord app • kiscord.app', 540, 1780);

    return canvas.toDataURL('image/png');
}

/**
 * Shows interactive high-res Stories Card Preview Modal with Download, Share and Copy buttons.
 */
export async function showWrappedCardPreviewModal(stats) {
    triggerHaptic('success');
    const imgUrl = await generateWrappedCardImage(stats);

    const modalId = 'wrapped-card-preview-modal';
    document.getElementById(modalId)?.remove();

    const modalHtml = `
        <div id="${modalId}" class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-in select-none">
            <div class="relative max-w-sm sm:max-w-md w-full max-h-[95vh] bg-[#1e1f22] border border-white/20 rounded-3xl p-5 flex flex-col justify-between shadow-2xl overflow-y-auto custom-scrollbar">
                <!-- Top Header -->
                <div class="flex items-center justify-between pb-3 border-b border-white/10">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">📸</span>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Stories Karta (9:16)</h3>
                    </div>
                    <button id="preview-modal-close-btn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>

                <!-- Image Preview Frame -->
                <div class="my-4 flex items-center justify-center rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
                    <img src="${imgUrl}" alt="Kiscord Wrapped Card" class="max-h-[60vh] w-auto object-contain rounded-xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300" />
                </div>

                <!-- Action Buttons -->
                <div class="space-y-2 pt-2">
                    <div class="grid grid-cols-2 gap-2">
                        <button id="preview-download-btn" class="py-3 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2">
                            <i class="fas fa-download"></i> <span>Stáhnout PNG</span>
                        </button>
                        <button id="preview-share-btn" class="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2">
                            <i class="fas fa-share-alt"></i> <span>Sdílet</span>
                        </button>
                    </div>
                    <button id="preview-copy-btn" class="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
                        <i class="fas fa-copy"></i> <span>Zkopírovat do schránky</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeBtn = document.getElementById('preview-modal-close-btn');
    const downloadBtn = document.getElementById('preview-download-btn');
    const shareBtn = document.getElementById('preview-share-btn');
    const copyBtn = document.getElementById('preview-copy-btn');

    closeBtn?.addEventListener('click', () => {
        document.getElementById(modalId)?.remove();
    });

    downloadBtn?.addEventListener('click', () => {
        triggerHaptic('success');
        const link = document.createElement('a');
        link.download = `kiscord-wrapped-${stats.period}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = imgUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
        if (typeof window.showNotification === 'function') {
            window.showNotification('📸 Karta byla uložena do zařízení!', 'success');
        }
    });

    shareBtn?.addEventListener('click', async () => {
        triggerHaptic('medium');
        try {
            const res = await fetch(imgUrl);
            const blob = await res.blob();
            const file = new File([blob], 'kiscord-wrapped.png', { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Náš Kiscord Wrapped 💖',
                    text: 'Tady je rekapitulace našeho společného světa na Kiscordu!',
                    files: [file]
                });
                return;
            }
        } catch (e) {
            console.log('[Wrapped] Share cancelled or unsupported:', e);
        }

        // Fallback: download
        const link = document.createElement('a');
        link.download = `kiscord-wrapped-${stats.period}.png`;
        link.href = imgUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
        if (typeof window.showNotification === 'function') {
            window.showNotification('📸 Karta stažena! Můžete ji nahrát na Instagram / TikTok Stories.', 'info');
        }
    });

    copyBtn?.addEventListener('click', async () => {
        triggerHaptic('light');
        try {
            const res = await fetch(imgUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            if (typeof window.showNotification === 'function') {
                window.showNotification('📋 Obrázek byl zkopírován do schránky!', 'success');
            }
        } catch (e) {
            console.log('[Wrapped] Clipboard copy failed:', e);
            if (typeof window.showNotification === 'function') {
                window.showNotification('Obrázek stažen do zařízení.', 'info');
            }
        }
    });
}

/**
 * Opens the interactive Fullscreen Stories Modal.
 */
export function openCoupleWrappedStories(period = 'all') {
    currentStoryPeriod = period;
    const stats = calculateCoupleWrapped(period);
    const slides = buildStorySlides(stats);
    currentSlideIdx = 0;
    isStoryPaused = false;

    triggerHaptic('medium');
    triggerConfetti();
    playFanfare();

    const modalId = 'couple-wrapped-stories-modal';
    document.getElementById(modalId)?.remove();

    const modalHtml = `
        <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-in select-none">
            <div id="story-frame-container" class="relative max-w-sm w-full aspect-[9/16] bg-[#1e1f22] border border-white/15 rounded-[32px] p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
                <!-- Top Header: Segmented Progress Bars -->
                <div class="relative z-30 space-y-3">
                    <div class="flex items-center gap-1.5 w-full">
                        ${slides.map((_, i) => `
                            <div class="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div id="story-progress-${i}" class="h-full bg-white transition-all duration-100 ${i === 0 ? 'w-0' : 'w-0'}"></div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-400 px-1">
                        <span class="font-mono text-[10px] font-bold uppercase text-amber-400">✨ Kiscord Wrapped</span>
                        <button id="story-close-btn" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>

                <!-- Slide Content Container -->
                <div id="story-slide-viewport" class="relative z-20 my-auto flex items-center justify-center">
                    ${slides[0]}
                </div>

                <!-- Bottom Navigation Buttons -->
                <div class="relative z-30 flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                    <button id="story-prev-btn" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs uppercase tracking-wider transition opacity-0 pointer-events-none">
                        Zpět
                    </button>
                    <button id="story-next-btn" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5">
                        <span>Další</span> <i class="fas fa-arrow-right text-[10px]"></i>
                    </button>
                </div>

                <!-- Left/Right Tap Zones for Touch Navigation (padded so buttons are clickable) -->
                <div id="story-tap-left" class="absolute left-0 top-20 bottom-24 w-1/3 z-10 cursor-pointer"></div>
                <div id="story-tap-right" class="absolute right-0 top-20 bottom-24 w-2/3 z-10 cursor-pointer"></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const viewport = document.getElementById('story-slide-viewport');
    const prevBtn = document.getElementById('story-prev-btn');
    const nextBtn = document.getElementById('story-next-btn');
    const closeBtn = document.getElementById('story-close-btn');
    const tapLeft = document.getElementById('story-tap-left');
    const tapRight = document.getElementById('story-tap-right');
    const frameContainer = document.getElementById('story-frame-container');

    const updateSlideView = () => {
        if (!viewport) return;
        viewport.innerHTML = slides[currentSlideIdx];
        playPageFlip();

        // Update Progress Bars
        slides.forEach((_, i) => {
            const bar = document.getElementById(`story-progress-${i}`);
            if (bar) {
                if (i < currentSlideIdx) bar.style.width = '100%';
                else if (i === currentSlideIdx) bar.style.width = '0%';
                else bar.style.width = '0%';
            }
        });

        // Prev btn visibility
        if (currentSlideIdx > 0) {
            prevBtn.className = 'px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs uppercase tracking-wider transition opacity-100 pointer-events-auto';
        } else {
            prevBtn.className = 'px-4 py-2 rounded-xl bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition opacity-0 pointer-events-none';
        }

        // Next btn text
        if (currentSlideIdx === slides.length - 1) {
            nextBtn.innerHTML = '<span>Hotovo 🎉</span>';
            // Bind card preview listener on the last slide
            setTimeout(() => {
                document.getElementById('wrapped-open-card-preview-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showWrappedCardPreviewModal(stats);
                });
            }, 50);
        } else {
            nextBtn.innerHTML = '<span>Další</span> <i class="fas fa-arrow-right text-[10px]"></i>';
        }

        startProgressTimer();
    };

    const startProgressTimer = () => {
        clearInterval(storyTimer);
        let progress = 0;
        const currentBar = document.getElementById(`story-progress-${currentSlideIdx}`);
        if (!currentBar) return;

        storyTimer = setInterval(() => {
            if (isStoryPaused) return;
            progress += 2;
            if (currentBar) currentBar.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(storyTimer);
                if (currentSlideIdx < slides.length - 1) {
                    currentSlideIdx++;
                    updateSlideView();
                }
            }
        }, 100);
    };

    const nextSlide = () => {
        triggerHaptic('light');
        if (currentSlideIdx < slides.length - 1) {
            currentSlideIdx++;
            updateSlideView();
        } else {
            clearInterval(storyTimer);
            document.getElementById(modalId)?.remove();
        }
    };

    const prevSlide = () => {
        triggerHaptic('light');
        if (currentSlideIdx > 0) {
            currentSlideIdx--;
            updateSlideView();
        }
    };

    // Hold to pause story
    const pauseStory = () => { isStoryPaused = true; };
    const resumeStory = () => { isStoryPaused = false; };

    frameContainer?.addEventListener('mousedown', pauseStory);
    frameContainer?.addEventListener('mouseup', resumeStory);
    frameContainer?.addEventListener('touchstart', pauseStory, { passive: true });
    frameContainer?.addEventListener('touchend', resumeStory, { passive: true });

    nextBtn?.addEventListener('click', nextSlide);
    prevBtn?.addEventListener('click', prevSlide);
    tapRight?.addEventListener('click', nextSlide);
    tapLeft?.addEventListener('click', prevSlide);

    closeBtn?.addEventListener('click', () => {
        clearInterval(storyTimer);
        document.getElementById(modalId)?.remove();
    });

    updateSlideView();
}

/**
 * Main Channel View for #wrapped / #statistiky.
 */
export function renderCoupleWrapped() {
    const container = document.getElementById('main-content') || document.getElementById('messages-container');
    if (!container) return;

    const statsAll = calculateCoupleWrapped('all');
    const statsMonth = calculateCoupleWrapped('month');
    const { myName, partnerName } = getNames();

    container.innerHTML = `
        <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in custom-scrollbar">
            <!-- Hero Banner with Direct Stories Launch -->
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/40 via-[#1e1f22] to-amber-900/30 border border-white/10 p-6 sm:p-8 shadow-2xl">
                <div class="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div class="space-y-3 text-center sm:text-left">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                            <i class="fas fa-sparkles"></i> Spotify-Style Rekapitulace Vztahu
                        </div>
                        <h1 class="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">Couple Wrapped & Statistiky</h1>
                        <p class="text-xs sm:text-sm text-gray-300 max-w-xl">
                            Kompletní přehled ${myName} & ${partnerName}: <strong>${statsAll.daysTogether} dní spolu</strong>, ${statsAll.totalTons} tun železa, ${statsAll.seenMediaCount} filmů, ${statsAll.completedBucketCount} splněných snů a uplatněné vouchery!
                        </p>
                    </div>

                    <div class="flex flex-col gap-2.5 w-full sm:w-auto flex-shrink-0">
                        <button id="launch-stories-all-btn" class="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 hover:opacity-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2 transform active:scale-95">
                            <i class="fas fa-play"></i> <span>Spustit Stories</span>
                        </button>
                        <button id="launch-stories-month-btn" class="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
                            <i class="fas fa-calendar-alt text-amber-400"></i> <span>Tento Měsíc (${statsMonth.monthName})</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Key Metrics 6-Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div class="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 shadow-sm">
                    <span class="text-2xl">❤️</span>
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Dní Spolu</span>
                    <span class="text-xl font-black text-pink-400 font-mono">${statsAll.daysTogether}</span>
                    <span class="text-[9px] text-gray-500 block">od 24.12.2025</span>
                </div>
                <div class="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 shadow-sm">
                    <span class="text-2xl">🏋️‍♂️</span>
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">V Gymu</span>
                    <span class="text-xl font-black text-emerald-400 font-mono">${statsAll.totalTons} T</span>
                    <span class="text-[9px] text-gray-500 block">${statsAll.gymWorkoutsCount} tréninků</span>
                </div>
                <div class="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 shadow-sm">
                    <span class="text-2xl">🍿</span>
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Filmy</span>
                    <span class="text-xl font-black text-purple-400 font-mono">${statsAll.seenMediaCount}</span>
                    <span class="text-[9px] text-gray-500 block">${statsAll.mutualMatchesCount} Tinder shod</span>
                </div>
                <div class="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 shadow-sm">
                    <span class="text-2xl">🎟️</span>
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Vouchery</span>
                    <span class="text-xl font-black text-pink-400 font-mono">${statsAll.redeemedCouponsCount}</span>
                    <span class="text-[9px] text-gray-500 block">${statsAll.massageCount}× masáž</span>
                </div>
                <div class="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 shadow-sm">
                    <span class="text-2xl">🚀</span>
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Bucket List</span>
                    <span class="text-xl font-black text-amber-400 font-mono">${statsAll.completedBucketCount}</span>
                    <span class="text-[9px] text-gray-500 block">splněných snů</span>
                </div>
                <div class="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 shadow-sm">
                    <span class="text-2xl">✨</span>
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Vztahový Status</span>
                    <span class="text-lg font-black text-amber-300 truncate block">LVL ${statsAll.relationshipLevel}</span>
                    <span class="text-[9px] text-gray-400 font-bold block truncate">${statsAll.rankTitle}</span>
                </div>
            </div>

            <!-- Instant Story Card Preview Section -->
            <div class="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 class="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <i class="fas fa-camera-retro text-pink-400"></i> Export Karty na Instagram Stories / TikTok
                        </h3>
                        <p class="text-xs text-gray-400 mt-0.5">Vygenerujte si 9:16 infografiku v plném rozlišení jedním kliknutím.</p>
                    </div>
                    <button id="quick-open-card-modal-btn" class="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs transition flex items-center gap-2 shadow-md">
                        <i class="fas fa-eye"></i> <span>Zobrazit & Sdílet Kartu</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('launch-stories-all-btn')?.addEventListener('click', () => openCoupleWrappedStories('all'));
    document.getElementById('launch-stories-month-btn')?.addEventListener('click', () => openCoupleWrappedStories('month'));
    document.getElementById('quick-open-card-modal-btn')?.addEventListener('click', () => {
        showWrappedCardPreviewModal(statsAll);
    });
}
