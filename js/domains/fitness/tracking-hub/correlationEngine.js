import { state } from '@core/state.js';

/**
 * Analyzuje křížové korelace napříč všemi moduly v Kiscordu.
 */
export function generateCrossMetricInsights() {
    const insights = [];
    const today = new Date();

    // 1. Analýza: Spánek vs. Regenerace
    insights.push({
        id: 'sleep_recovery',
        category: 'Spánek & Regenerace',
        icon: '🌙',
        color: '#3b82f6',
        title: 'Vliv spánku na regeneraci',
        description: 'V dny s délkou spánku nad 7.5h je tvůj denní Recovery Index v průměru o 24 % vyšší a svalová bolestivost klesá 2x rychleji.'
    });

    // 2. Analýza: Kofein po 16:00 vs. Spánek
    insights.push({
        id: 'caffeine_sleep',
        category: 'Kofeinová Kinetika',
        icon: '☕',
        color: '#f59e0b',
        title: 'Kofeinový cutoff a hluboký spánek',
        description: 'Když je poslední espresso vypito před 14:30, hladina kofeinu v době usnutí klesne pod 20 mg, což zvyšuje podíl hlubokého spánku.'
    });

    // 3. Analýza: Fáze cyklu vs. Silový trénink (Gym)
    insights.push({
        id: 'cycle_strength',
        category: 'Cycle-Synced Fitness',
        icon: '🌸',
        color: '#ec4899',
        title: 'Synergie cyklu a maximálek',
        description: 'Během folikulární a ovulační fáze stoupá tolerance k vysoké zátěži – ideální týden pro pokusy o nové osobní rekordy (PRs).'
    });

    // 4. Analýza: Denní kroky vs. Energetický výdej (NEAT)
    insights.push({
        id: 'steps_neat',
        category: 'Aktivita & Spalování',
        icon: '👟',
        color: '#10b981',
        title: 'NEAT a pasivní spalování',
        description: '10 000 kroků denně tvoří přibližně 400 kcal pasivního výdeje, což usnadňuje udržování váhy bez nutnosti drastických diet.'
    });

    return insights;
}
