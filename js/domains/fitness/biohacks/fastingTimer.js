import { triggerHaptic } from '@core/utils.js';

export const FASTING_PROTOCOLS = [
    { id: '16_8', name: '16:8 Leangains', fastHours: 16, eatHours: 8, desc: 'Zlatý standard pro spalování tuků a energii' },
    { id: '18_6', name: '18:6 Pro pokročilé', fastHours: 18, eatHours: 6, desc: 'Hlubší ketóza a buněčná regenerace' },
    { id: '20_4', name: '20:4 Warrior Diet', fastHours: 20, eatHours: 4, desc: 'Maximální fokus během dne a večerní hostina' },
    { id: 'omad', name: 'OMAD (23:1)', fastHours: 23, eatHours: 1, desc: 'Jedno jídlo denně, maximální autofagie' }
];

export const METABOLIC_STAGES = [
    { minHours: 0, maxHours: 4, label: 'Trávení (Anabolismus)', icon: '🍽️', color: '#3b82f6', desc: 'Tělo tráví poslední jídlo, hladina inzulínu je zvýšená.' },
    { minHours: 4, maxHours: 8, label: 'Pokles inzulínu', icon: '📉', color: '#10b981', desc: 'Hladina krevního cukru se stabilizuje, začíná odpočinek trávicí soustavy.' },
    { minHours: 8, maxHours: 12, label: 'Spalování tuků', icon: '🔥', color: '#f59e0b', desc: 'Zásoby glykogenu klesají, tělo přepíná na energii z vlastních tukových zásob.' },
    { minHours: 12, maxHours: 18, label: 'Ketóza & Autofagie', icon: '✨', color: '#ec4899', desc: 'Začíná proces autofagie – tělo recykluje poškozené buňky a snižuje zánětlivost.' },
    { minHours: 18, maxHours: 99, label: 'Hluboká autofagie', icon: '🧬', color: '#8b5cf6', desc: 'Vrchol buněčné obnovy, zvýšení růstového hormonu (HGH) a maximální čistota mysli.' }
];

/**
 * Získá aktuální fázi metabolismu podle odpracovaných hodin půstu.
 */
export function getMetabolicStage(elapsedHours) {
    for (const stage of METABOLIC_STAGES) {
        if (elapsedHours >= stage.minHours && elapsedHours < stage.maxHours) {
            return stage;
        }
    }
    return METABOLIC_STAGES[METABOLIC_STAGES.length - 1];
}

/**
 * Vypočítá stav aktivního půstu.
 */
export function calculateFastingProgress(session) {
    if (!session || !session.start_iso || !session.is_active) {
        return { isActive: false };
    }

    const startMs = new Date(session.start_iso).getTime();
    const nowMs = Date.now();
    const elapsedMs = Math.max(0, nowMs - startMs);
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    const targetHours = session.target_hours || 16;
    const progressPercent = Math.min(100, Math.round((elapsedHours / targetHours) * 100));

    const stage = getMetabolicStage(elapsedHours);

    const remainingHours = Math.max(0, targetHours - elapsedHours);
    const hours = Math.floor(elapsedHours);
    const minutes = Math.floor((elapsedHours - hours) * 60);

    return {
        isActive: true,
        elapsedHours,
        hours,
        minutes,
        targetHours,
        progressPercent,
        remainingHours: remainingHours.toFixed(1),
        stage,
        isCompleted: elapsedHours >= targetHours
    };
}
