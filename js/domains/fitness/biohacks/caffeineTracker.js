import { triggerHaptic } from '@core/utils.js';

export const CAFFEINE_BEVERAGES = [
    { id: 'espresso', name: 'Espresso', mg: 63, icon: '☕' },
    { id: 'double_espresso', name: 'Double Espresso / Doppio', mg: 126, icon: '☕☕' },
    { id: 'cappuccino', name: 'Cappuccino / Flat White', mg: 80, icon: '🥛' },
    { id: 'filter_coffee', name: 'Filtrovaná káva (V60 / Batch)', mg: 140, icon: '☕' },
    { id: 'monster', name: 'Monster Energy (500ml)', mg: 160, icon: '⚡' },
    { id: 'redbull', name: 'Red Bull (250ml)', mg: 80, icon: '🔋' },
    { id: 'matcha', name: 'Matcha Latte / Čaj', mg: 70, icon: '🍵' },
    { id: 'black_tea', name: 'Černý čaj', mg: 47, icon: '🫖' },
    { id: 'preworkout', name: 'Pre-workout booster', mg: 250, icon: '🔥' }
];

const CAFFEINE_HALF_LIFE_HOURS = 5.0;

/**
 * Vypočte zbývající kofein v krvi v daný čas ze seznamu dávek.
 */
export function calculateBloodCaffeine(entries = [], targetTime = new Date()) {
    const targetMs = targetTime.getTime();
    let totalMg = 0;

    for (const entry of entries) {
        const entryTime = new Date(entry.time).getTime();
        const diffHours = (targetMs - entryTime) / (1000 * 60 * 60);

        if (diffHours >= 0) {
            // C(t) = C0 * (0.5)^(t / 5)
            const remaining = entry.caffeine_mg * Math.pow(0.5, diffHours / CAFFEINE_HALF_LIFE_HOURS);
            totalMg += remaining;
        }
    }

    return Math.round(totalMg);
}

/**
 * Vypočte 24-hodinovou křivku kofeinu v krvi (po hodinách).
 */
export function generate24HourCaffeineCurve(entries = []) {
    const points = [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0); // od 6:00 ráno do 2:00 ráno

    for (let h = 0; h <= 20; h++) {
        const timePoint = new Date(startOfDay.getTime() + h * 3600 * 1000);
        const mg = calculateBloodCaffeine(entries, timePoint);
        points.push({
            hour: timePoint.getHours(),
            timeLabel: `${timePoint.getHours()}:00`,
            mg: mg
        });
    }

    return points;
}

/**
 * Vypočte doporučený Caffeine Cutoff Time pro kvalitní spánek.
 */
export function calculateSleepCutoffTime(bedtimeHour = 23, safeThresholdMg = 25) {
    // Pro bezpečnou hladinu <25mg kofeinu v době usnutí
    // Čas = Bedtime - 8 až 9 hodin
    let cutoffHour = bedtimeHour - 8;
    if (cutoffHour < 0) cutoffHour += 24;
    return `${cutoffHour}:00`;
}
