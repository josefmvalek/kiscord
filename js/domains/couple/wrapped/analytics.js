/**
 * Couple Wrapped Data Analytics & Aggregation Engine
 */

import { state } from '@core/state.js';

export function getNames() {
    const isJose = (state.currentUser?.name || '').toLowerCase().includes('jož') || 
                   (state.currentUser?.name || '').toLowerCase().includes('josef');
    const myName = isJose ? 'Jožka' : 'Klárka';
    const partnerName = isJose ? 'Klárka' : 'Jožka';
    const myEmoji = isJose ? '🦁' : '🌻';
    const partnerEmoji = isJose ? '🌻' : '🦁';
    return { myName, partnerName, myEmoji, partnerEmoji };
}

export function calculateDaysTogether() {
    const start = new Date(state.startDate || "2025-12-24");
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

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
    const timelinePhotosCount = timelineEvents.filter(e => e.image_url && isDateInPeriod(e.event_date)).length;
    const dateLocations = state.dateLocations || [];
    const plannedDatesCount = Object.keys(state.plannedDates || {}).length;

    // 6. Mini-games, Quests & Badges
    const tetrisJose = state.arcadeScores?.tetris?.jose ?? state.tetris?.jose ?? 0;
    const tetrisKlarka = state.arcadeScores?.tetris?.klarka ?? state.tetris?.klarka ?? 0;
    const tetrisLeader = tetrisJose > tetrisKlarka ? 'Jožka' : (tetrisKlarka > tetrisJose ? 'Klárka' : 'Remíza 🤝');
    const drawingsCount = (state.drawings || []).length;
    const questsCompleted = (state.coopQuests || []).filter(q => q.is_completed).length;
    const unlockedAchievements = (state.achievements || []).length;

    // 7. Health & Wellness Synergy
    let totalWaterDroplets = 0;
    let perfectWaterDays = 0;
    let moodSum = 0;
    let moodCount = 0;
    let totalSleepHours = 0;

    Object.entries(state.healthData || {}).forEach(([dateKey, h]) => {
        if (isDateInPeriod(dateKey)) {
            const w = parseInt(h.water) || 0;
            totalWaterDroplets += w;
            if (w >= 8) perfectWaterDays++;

            if (h.mood) {
                moodSum += parseFloat(h.mood);
                moodCount++;
            }
            if (h.sleep) {
                totalSleepHours += parseFloat(h.sleep);
            }
        }
    });

    const totalWaterLiters = (totalWaterDroplets * 0.25).toFixed(1);
    const avgMood = moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '8.5';

    // 8. Relationship Level & Calculated Rank
    const calculatedLevel = Math.max(
        Math.floor((daysTogether * 2 + gymLogs.length * 5 + redeemedCoupons.length * 10 + seenMedia.length * 4 + completedBucketCount * 15) / 50),
        1
    );

    let rankTitle = 'Nové Lásky 🌱';
    if (calculatedLevel >= 5) rankTitle = 'Spřízněné Duše 💫';
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
