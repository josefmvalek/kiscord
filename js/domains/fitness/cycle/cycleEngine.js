/**
 * Cycle Engine: Mathematical modeling of menstrual phases,
 * ovulation prediction, rolling average cycle estimation,
 * and cycle-synced lifestyle/fitness recommendations.
 */

export const CYCLE_PHASES = {
    MENSTRUAL: {
        id: 'menstrual',
        name: 'Menstruační fáze',
        shortName: 'Menstruace',
        icon: '🩸',
        color: '#ec4899',
        themeClass: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
        energy: 'Nižší energie & regenerace',
        workout: 'Lehká chůze, jóga, mobilita nebo úplný odpočinek. Netlač na PR.',
        nutrition: 'Doplňuj železo (špenát, hovězí), hořčík, teplé polévky a dostatek vody.',
        partnerTip: 'Dopřej jí maximální klid a pohodlí, uvař čaj, připrav deku nebo převezmi domácí povinnosti.'
    },
    FOLLICULAR: {
        id: 'follicular',
        name: 'Folikulární fáze',
        shortName: 'Folikulární',
        icon: '🌱',
        color: '#10b981',
        themeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        energy: 'Stoupající energie, optimismus & síla',
        workout: 'Skvělý čas na silový trénink, progresivní přetížení, HIIT a nové výzvy.',
        nutrition: 'Vyšší citlivost na inzulín – tělo skvěle pálí sacharidy (ovesné vločky, rýže, ovoce).',
        partnerTip: 'Skvělý čas na společné výlety, sport, kreativní plány a nové zážitky!'
    },
    OVULATORY: {
        id: 'ovulatory',
        name: 'Ovulační fáze',
        shortName: 'Ovulace',
        icon: '✨',
        color: '#8b5cf6',
        themeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        energy: 'Vrchol energie, komunikace & sebevědomí',
        workout: 'Maximální síla a PR pokusy v posilovně! Tělo podává špičkový výkon.',
        nutrition: 'Dostatek bílkovin a antioxidantů (bobulovité ovoce, zelený čaj, ořechy).',
        partnerTip: 'Vrchol energie a nálady – ideální na romantické rande, večeři ve městě a společný čas.'
    },
    LUTEAL: {
        id: 'luteal',
        name: 'Luteální fáze (PMS)',
        shortName: 'Luteální',
        icon: '🌙',
        color: '#f59e0b',
        themeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        energy: 'Klesající energie, potřeba zpomalení',
        workout: 'Udržovací trénink, vyšší série s nižší váhou, plavání, klidná chůze.',
        nutrition: 'Bazální metabolismus stoupá (+150-300 kcal). Zdravé tuky (avokádo, hořká čokoláda 85%+).',
        partnerTip: 'Buď mimořádně trpělivý a vnímavý. Masáž zad, čokoláda a žádné zbytečné hádky dělají zázraky.'
    }
};

/**
 * Analyzuje historii logů a vrátí pole počátečních dat jednotlivých period.
 */
export function getPeriodStartDates(cycleLogs = []) {
    if (!cycleLogs || cycleLogs.length === 0) return [];

    const sorted = [...cycleLogs]
        .filter(l => l.flow_intensity && l.flow_intensity !== 'none')
        .sort((a, b) => new Date(a.date_key) - new Date(b.date_key));

    const startDates = [];
    let lastDate = null;

    for (const log of sorted) {
        const currentDate = new Date(log.date_key);
        if (!lastDate) {
            startDates.push(log.date_key);
            lastDate = currentDate;
        } else {
            const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));
            // Pokud je mezera větší než 10 dní, jedná se o nový cyklus
            if (diffDays > 10) {
                startDates.push(log.date_key);
            }
            lastDate = currentDate;
        }
    }

    return startDates;
}

/**
 * Vypočte adaptivní průměrnou délku cyklu z historie.
 */
export function calculateAdaptiveCycleLength(startDates = [], defaultLength = 28) {
    if (startDates.length < 2) return defaultLength;

    const intervals = [];
    for (let i = 1; i < startDates.length; i++) {
        const d1 = new Date(startDates[i - 1]);
        const d2 = new Date(startDates[i]);
        const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        if (days >= 20 && days <= 45) {
            intervals.push(days);
        }
    }

    if (intervals.length === 0) return defaultLength;
    const avg = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;
    return Math.round(avg);
}

/**
 * Vypočítá aktuální stav cyklu pro dané datum.
 */
export function calculateCurrentCycleState(targetDate = new Date(), cycleLogs = [], settings = {}) {
    const defaultCycle = settings.cycle_length_days || 28;
    const defaultPeriod = settings.period_length_days || 5;
    const lutealLength = settings.luteal_length_days || 14;

    const startDates = getPeriodStartDates(cycleLogs);
    const avgCycleLength = calculateAdaptiveCycleLength(startDates, defaultCycle);

    // Pokud nemáme žádné záznamy, použijeme referenční datum
    let lastPeriodStart = startDates.length > 0 ? startDates[startDates.length - 1] : null;
    
    if (!lastPeriodStart) {
        // Fallback: nastavit na 10 dní zpět
        const fallback = new Date();
        fallback.setDate(fallback.getDate() - 10);
        lastPeriodStart = fallback.toISOString().split('T')[0];
    }

    const startD = new Date(lastPeriodStart);
    const targetD = new Date(targetDate);
    const dayOfCycle = Math.max(1, Math.round((targetD - startD) / (1000 * 60 * 60 * 24)) + 1);

    const normalizedDay = ((dayOfCycle - 1) % avgCycleLength) + 1;
    const ovulationDay = Math.max(10, avgCycleLength - lutealLength);

    let phase = CYCLE_PHASES.FOLLICULAR;
    if (normalizedDay <= defaultPeriod) {
        phase = CYCLE_PHASES.MENSTRUAL;
    } else if (normalizedDay < ovulationDay - 1) {
        phase = CYCLE_PHASES.FOLLICULAR;
    } else if (normalizedDay <= ovulationDay + 1) {
        phase = CYCLE_PHASES.OVULATORY;
    } else {
        phase = CYCLE_PHASES.LUTEAL;
    }

    // Predikce příští periody a ovulace
    const daysUntilNextPeriod = avgCycleLength - normalizedDay + 1;
    const nextPeriodDate = new Date(targetD);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + daysUntilNextPeriod);

    const isFertileWindow = (normalizedDay >= ovulationDay - 4 && normalizedDay <= ovulationDay + 1);

    return {
        dayOfCycle: normalizedDay,
        totalCycleLength: avgCycleLength,
        periodLength: defaultPeriod,
        ovulationDay,
        phase,
        isFertileWindow,
        daysUntilNextPeriod,
        nextPeriodDateStr: nextPeriodDate.toISOString().split('T')[0],
        lastPeriodStartStr: lastPeriodStart,
        progressPercent: Math.round((normalizedDay / avgCycleLength) * 100)
    };
}

/**
 * Filtruje data pro partnera dle pravidel soukromí.
 */
export function getPartnerPrivacyData(cycleState, settings = {}) {
    if (!settings.share_with_partner) {
        return { isShared: false, message: 'Sdílení s partnerem je vypnuto.' };
    }

    const fields = settings.partner_visible_fields || ['phase_name', 'energy_level', 'mood', 'tips'];

    return {
        isShared: true,
        phaseName: fields.includes('phase_name') ? cycleState.phase.name : 'Aktivní cyklus',
        phaseIcon: cycleState.phase.icon,
        dayOfCycle: fields.includes('phase_name') ? cycleState.dayOfCycle : null,
        energy: fields.includes('energy_level') ? cycleState.phase.energy : null,
        partnerTip: fields.includes('tips') ? cycleState.phase.partnerTip : null,
        workout: fields.includes('tips') ? cycleState.phase.workout : null,
        themeClass: cycleState.phase.themeClass,
        color: cycleState.phase.color
    };
}
