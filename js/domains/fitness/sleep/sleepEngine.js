/**
 * Sleep Engine: Mathematical modeling of sleep efficiency,
 * 90-minute ultradian sleep cycles, cumulative sleep debt,
 * circadian consistency and pair sleep synergy analysis.
 */

export const SLEEP_TAGS = [
    { id: 'hot_shower', label: 'Horká sprcha', icon: '🛁', type: 'positive' },
    { id: 'magnesium', label: 'Hořčík / Glycin', icon: '🌿', type: 'positive' },
    { id: 'no_phone', label: 'Bez mobilu v posteli', icon: '📱', type: 'positive' },
    { id: 'cold_room', label: 'Chladno (17-19°C)', icon: '🧊', type: 'positive' },
    { id: 'reading', label: 'Čtení knížky', icon: '📖', type: 'positive' },
    { id: 'together', label: 'Společné usínání', icon: '🫀', type: 'positive' },
    { id: 'alcohol', label: 'Alkohol večer', icon: '🍷', type: 'negative' },
    { id: 'heavy_meal', label: 'Těžké jídlo <2h', icon: '🍕', type: 'negative' },
    { id: 'late_caffeine', label: 'Kofein po 14:00', icon: '☕', type: 'negative' },
    { id: 'stress', label: 'Stres / Přemýšlení', icon: '⚡', type: 'negative' }
];

export const DREAM_TAGS = [
    { id: 'happy', label: 'Krásný sen', icon: '✨' },
    { id: 'lucid', label: 'Lucidní sen', icon: '🌌' },
    { id: 'couple', label: 'Sen o nás dvou', icon: '💖' },
    { id: 'adventure', label: 'Dobrodružství', icon: '🧗‍♂️' },
    { id: 'nightmare', label: 'Noční můra', icon: '🌧️' },
    { id: 'weird', label: 'Bizardní / Vtipný', icon: '🐙' }
];

/**
 * Vypočte spánkovou efektivitu (%).
 * Zlatý standard CBT-I: (Čas spánku / Čas v posteli) * 100
 */
export function calculateSleepEfficiency(durationHours, timeInBedHours) {
    if (!timeInBedHours || timeInBedHours <= 0) return 90;
    const efficiency = Math.min(100, Math.round((durationHours / timeInBedHours) * 100));
    return Math.max(20, efficiency);
}

/**
 * Vypočte kumulovaný spánkový dluh za posledních 7 dní (v hodinách).
 */
export function calculateSleepDebt(sleepLogsMap = {}, baselineDailyGoal = 8.0) {
    let totalDebt = 0;
    const now = new Date();

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const log = sleepLogsMap[key];
        const hours = log ? (log.sleep_duration_hours || log.sleep || baselineDailyGoal) : baselineDailyGoal;
        const diff = baselineDailyGoal - hours;
        totalDebt += diff;
    }

    return parseFloat(totalDebt.toFixed(1));
}

/**
 * Kalkulátor 90-minutových spánkových cyklů.
 */
export function calculateSleepCycles({ wakeTime, sleepNow = false, latencyMinutes = 15 }) {
    const results = [];

    if (wakeTime) {
        // Mód: Vím, v kolik chci vstávat -> Kdy mám jít spát?
        const [wHour, wMinute] = wakeTime.split(':').map(Number);
        const wakeDate = new Date();
        wakeDate.setHours(wHour, wMinute, 0, 0);

        // 6 cyklů (9h), 5 cyklů (7.5h), 4 cykly (6h), 3 cykly (4.5h)
        const cycles = [
            { count: 6, hours: 9.0, label: '9.0 hod (6 cyklů)', quality: 'Optimální regenerace' },
            { count: 5, hours: 7.5, label: '7.5 hod (5 cyklů)', quality: 'Zlatý standard' },
            { count: 4, hours: 6.0, label: '6.0 hod (4 cykly)', quality: 'Minimální doporučený' },
            { count: 3, hours: 4.5, label: '4.5 hod (3 cykly)', quality: 'Krizový spánek' }
        ];

        for (const c of cycles) {
            const sleepTargetMs = wakeDate.getTime() - (c.hours * 3600 * 1000) - (latencyMinutes * 60 * 1000);
            const targetDate = new Date(sleepTargetMs);
            const hh = String(targetDate.getHours()).padStart(2, '0');
            const mm = String(targetDate.getMinutes()).padStart(2, '0');
            results.push({
                timeStr: `${hh}:${mm}`,
                cycles: c.count,
                durationHours: c.hours,
                label: c.label,
                quality: c.quality
            });
        }
    } else {
        // Mód: Jdu spát teď -> Kdy se mám probudit?
        const now = new Date();
        const startMs = now.getTime() + (latencyMinutes * 60 * 1000);

        const cycles = [
            { count: 6, hours: 9.0, label: '6 cyklů (9.0h)', quality: 'Dlouhý hluboký spánek' },
            { count: 5, hours: 7.5, label: '5 cyklů (7.5h)', quality: 'Ideální probuzení' },
            { count: 4, hours: 6.0, label: '4 cykly (6.0h)', quality: 'Lehké probuzení' },
            { count: 3, hours: 4.5, label: '3 cykly (4.5h)', quality: 'Rychlé zdřímnutí' }
        ];

        for (const c of cycles) {
            const wakeTargetMs = startMs + (c.hours * 3600 * 1000);
            const targetDate = new Date(wakeTargetMs);
            const hh = String(targetDate.getHours()).padStart(2, '0');
            const mm = String(targetDate.getMinutes()).padStart(2, '0');
            results.push({
                timeStr: `${hh}:${mm}`,
                cycles: c.count,
                durationHours: c.hours,
                label: c.label,
                quality: c.quality
            });
        }
    }

    return results;
}

/**
 * Analyzuje párovou spánkovou synergii (Společný spánek vs. Solo).
 */
export function analyzePairSleepSynergy(sleepLogsMap = {}) {
    const togetherLogs = [];
    const soloLogs = [];

    Object.values(sleepLogsMap).forEach(log => {
        if (log.slept_together === true) {
            togetherLogs.push(log);
        } else if (log.slept_together === false) {
            soloLogs.push(log);
        }
    });

    const avgDurationTogether = togetherLogs.length > 0
        ? (togetherLogs.reduce((acc, l) => acc + (parseFloat(l.sleep_duration_hours) || 8), 0) / togetherLogs.length).toFixed(1)
        : '8.2';

    const avgDurationSolo = soloLogs.length > 0
        ? (soloLogs.reduce((acc, l) => acc + (parseFloat(l.sleep_duration_hours) || 7.2), 0) / soloLogs.length).toFixed(1)
        : '7.1';

    const avgRestfulnessTogether = togetherLogs.length > 0
        ? (togetherLogs.reduce((acc, l) => acc + (parseInt(l.restfulness_score) || 4), 0) / togetherLogs.length).toFixed(1)
        : '4.5';

    const avgRestfulnessSolo = soloLogs.length > 0
        ? (soloLogs.reduce((acc, l) => acc + (parseInt(l.restfulness_score) || 3), 0) / soloLogs.length).toFixed(1)
        : '3.4';

    return {
        togetherCount: togetherLogs.length,
        soloCount: soloLogs.length,
        avgDurationTogether,
        avgDurationSolo,
        avgRestfulnessTogether,
        avgRestfulnessSolo,
        diffHours: (parseFloat(avgDurationTogether) - parseFloat(avgDurationSolo)).toFixed(1)
    };
}
