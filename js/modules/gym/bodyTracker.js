import { state, ensureGymData, awardLoveCoinsToCurrentUser } from '../../core/state.js';
import { triggerHaptic, triggerConfetti, getTodayKey } from '../../core/utils.js';
import { showNotification, showConfirmDialog } from '../../core/theme.js';
import { renderModal, renderInputGroup } from '../../core/ui.js';
import { supabase } from '../../core/supabase.js';
import { getPartnerName } from './shared.js';

// ==========================================
// BODY TRACKER & MEASUREMENTS TAB
// ==========================================

export function renderBodyTrackerTab() {
    const measurements = (state.gymBodyMeasurements || []).filter(m => m.user_id === state.currentUser?.id);
    const partnerName = getPartnerName();

    // Latest measurement & First measurement for diff
    const latest = measurements[0] || null;
    const oldest = measurements[measurements.length - 1] || null;

    const calcDiff = (field) => {
        if (!latest || !oldest || latest.id === oldest.id) return null;
        const valL = parseFloat(latest[field]);
        const valO = parseFloat(oldest[field]);
        if (isNaN(valL) || isNaN(valO)) return null;
        const diff = Math.round((valL - valO) * 10) / 10;
        return diff > 0 ? `+${diff}` : `${diff}`;
    };

    const photosList = measurements.filter(m => m.photo_url);

    return `
        <div class="space-y-6">
            <!-- Header & Actions -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#faa61a]/10 via-black/20 to-transparent p-5 rounded-3xl border border-[#faa61a]/20">
                <div>
                    <span class="text-[9px] font-black uppercase tracking-widest text-[#faa61a] block mb-0.5 font-mono">Tělesné Míry & Forma</span>
                    <h2 class="text-lg font-black text-white uppercase tracking-wider leading-none">Měření Těla & Transformace 📏</h2>
                </div>
                <div class="flex items-center gap-2">
                    ${photosList.length >= 2 ? `
                        <button onclick="window.Gym.openTransformationSliderModal()" class="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm">
                            <span>📸</span>
                            <span>Před / Po</span>
                        </button>
                    ` : ''}
                    <button onclick="window.Gym.openLogMeasurementModal()" class="px-4 py-2 rounded-xl bg-[#faa61a] hover:bg-[#e09216] text-black font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-1.5">
                        <i class="fas fa-plus text-[10px]"></i>
                        <span>Zapsat míry</span>
                    </button>
                </div>
            </div>

            <!-- Body Trend Chart -->
            ${measurements.length >= 2 ? `
                <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-xl">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trend v čase</span>
                        <div class="flex gap-1 p-0.5 bg-black/30 border border-white/5 rounded-xl">
                            <button onclick="window.Gym.switchBodyChart('weight')" id="bchart-btn-weight" class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition bg-amber-500 text-black">Váha</button>
                            <button onclick="window.Gym.switchBodyChart('body_fat')" id="bchart-btn-body_fat" class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition text-gray-400 hover:text-white">Tuk</button>
                            <button onclick="window.Gym.switchBodyChart('waist')" id="bchart-btn-waist" class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition text-gray-400 hover:text-white">Pas</button>
                            <button onclick="window.Gym.switchBodyChart('arms')" id="bchart-btn-arms" class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition text-gray-400 hover:text-white">Paže</button>
                        </div>
                    </div>
                    <div id="body-chart-container" class="relative bg-black/20 rounded-2xl p-3 min-h-[160px] flex items-center justify-center">
                        <!-- Rendered by switchBodyChart after mount -->
                    </div>
                </div>
            ` : ''}

            <!-- Current Summary Cards -->
            ${latest ? `
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <!-- Váha -->
                    <div class="glass-card bg-black/20 border border-white/5 rounded-2xl p-3.5 text-center">
                        <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Váha</span>
                        <div class="text-lg font-black text-white font-mono mt-0.5">${latest.weight ? `${latest.weight} kg` : '—'}</div>
                        ${calcDiff('weight') ? `<span class="text-[9px] font-bold font-mono ${parseFloat(calcDiff('weight')) <= 0 ? 'text-emerald-400' : 'text-amber-400'}">${calcDiff('weight')} kg</span>` : ''}
                    </div>

                    <!-- Tuk -->
                    <div class="glass-card bg-black/20 border border-white/5 rounded-2xl p-3.5 text-center">
                        <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Tuk</span>
                        <div class="text-lg font-black text-white font-mono mt-0.5">${latest.body_fat ? `${latest.body_fat} %` : '—'}</div>
                        ${calcDiff('body_fat') ? `<span class="text-[9px] font-bold font-mono ${parseFloat(calcDiff('body_fat')) <= 0 ? 'text-emerald-400' : 'text-amber-400'}">${calcDiff('body_fat')} %</span>` : ''}
                    </div>

                    <!-- Pas -->
                    <div class="glass-card bg-black/20 border border-white/5 rounded-2xl p-3.5 text-center">
                        <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Pas</span>
                        <div class="text-lg font-black text-white font-mono mt-0.5">${latest.waist ? `${latest.waist} cm` : '—'}</div>
                        ${calcDiff('waist') ? `<span class="text-[9px] font-bold font-mono ${parseFloat(calcDiff('waist')) <= 0 ? 'text-emerald-400' : 'text-amber-400'}">${calcDiff('waist')} cm</span>` : ''}
                    </div>

                    <!-- Paže (Biceps) -->
                    <div class="glass-card bg-black/20 border border-white/5 rounded-2xl p-3.5 text-center">
                        <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Paže</span>
                        <div class="text-lg font-black text-white font-mono mt-0.5">${latest.arms ? `${latest.arms} cm` : '—'}</div>
                        ${calcDiff('arms') ? `<span class="text-[9px] font-bold font-mono ${parseFloat(calcDiff('arms')) >= 0 ? 'text-emerald-400' : 'text-gray-400'}">${calcDiff('arms')} cm</span>` : ''}
                    </div>

                    <!-- Hrudník -->
                    <div class="glass-card bg-black/20 border border-white/5 rounded-2xl p-3.5 text-center">
                        <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Hrudník</span>
                        <div class="text-lg font-black text-white font-mono mt-0.5">${latest.chest ? `${latest.chest} cm` : '—'}</div>
                        ${calcDiff('chest') ? `<span class="text-[9px] font-bold font-mono ${parseFloat(calcDiff('chest')) >= 0 ? 'text-emerald-400' : 'text-gray-400'}">${calcDiff('chest')} cm</span>` : ''}
                    </div>

                    <!-- Stehna -->
                    <div class="glass-card bg-black/20 border border-white/5 rounded-2xl p-3.5 text-center">
                        <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono">Stehna</span>
                        <div class="text-lg font-black text-white font-mono mt-0.5">${latest.thighs ? `${latest.thighs} cm` : '—'}</div>
                        ${calcDiff('thighs') ? `<span class="text-[9px] font-bold font-mono text-gray-400">${calcDiff('thighs')} cm</span>` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- History List -->
            <div class="space-y-3">
                <h3 class="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                    <span>Historie Měření</span>
                    <span class="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono">${measurements.length}</span>
                </h3>

                ${measurements.length === 0 ? `
                    <div class="p-8 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl text-center space-y-3">
                        <div class="text-4xl">📏</div>
                        <div class="text-xs font-bold text-gray-300">Zatím nemáš zapsané žádné tělesné míry.</div>
                        <p class="text-[10px] text-gray-500 max-w-sm mx-auto">Sleduj vývoj pasu, paží, hrudníku a tělesného tuku v čase pro maximální motivaci!</p>
                        <button onclick="window.Gym.openLogMeasurementModal()" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition">
                            + Zapsat první míry
                        </button>
                    </div>
                ` : `
                    <div class="space-y-2.5">
                        ${measurements.map(m => {
                            const dateStr = new Date(m.date_key).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

                            return `
                                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                                    <div class="flex items-center gap-3">
                                        ${m.photo_url ? `
                                            <img src="${m.photo_url}" class="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0 cursor-pointer hover:scale-105 transition" onclick="window.open('${m.photo_url}', '_blank')">
                                        ` : `
                                            <div class="w-12 h-12 rounded-xl bg-black/30 border border-white/5 flex items-center justify-center text-xl text-gray-400 flex-shrink-0">
                                                📏
                                            </div>
                                        `}
                                        <div>
                                            <div class="text-xs font-black text-white font-sans">${dateStr}</div>
                                            <div class="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-gray-400 font-mono">
                                                ${m.weight ? `<span class="bg-white/5 px-2 py-0.5 rounded text-amber-300 font-bold">${m.weight} kg</span>` : ''}
                                                ${m.body_fat ? `<span class="bg-white/5 px-2 py-0.5 rounded text-purple-300 font-bold">${m.body_fat}% tuk</span>` : ''}
                                                ${m.waist ? `<span>Pas: <strong class="text-white">${m.waist}cm</strong></span>` : ''}
                                                ${m.arms ? `<span>Paže: <strong class="text-white">${m.arms}cm</strong></span>` : ''}
                                                ${m.chest ? `<span>Hrudník: <strong class="text-white">${m.chest}cm</strong></span>` : ''}
                                            </div>
                                            ${m.notes ? `<div class="text-[9px] text-gray-500 italic mt-1 font-sans font-normal">„${m.notes}“</div>` : ''}
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1.5 self-end sm:self-center">
                                        <button onclick="window.Gym.deleteBodyMeasurement('${m.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition" title="Smazat záznam">
                                            <i class="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

// ==========================================
// MODAL: LOG NEW MEASUREMENTS
// ==========================================

export function openLogMeasurementModal() {
    triggerHaptic('light');

    const todayStr = getTodayKey();

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Datum měření',
                    id: 'bm-date',
                    type: 'date',
                    value: todayStr
                })}

                ${renderInputGroup({
                    label: 'Tělesná váha (kg)',
                    id: 'bm-weight',
                    type: 'number',
                    placeholder: 'např. 78.5'
                })}
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                ${renderInputGroup({
                    label: 'Tělesný tuk (%)',
                    id: 'bm-body-fat',
                    type: 'number',
                    placeholder: 'např. 14.2'
                })}

                ${renderInputGroup({
                    label: 'Pas (cm)',
                    id: 'bm-waist',
                    type: 'number',
                    placeholder: 'např. 82'
                })}

                ${renderInputGroup({
                    label: 'Paže / Biceps (cm)',
                    id: 'bm-arms',
                    type: 'number',
                    placeholder: 'např. 38.5'
                })}

                ${renderInputGroup({
                    label: 'Hrudník (cm)',
                    id: 'bm-chest',
                    type: 'number',
                    placeholder: 'např. 104'
                })}

                ${renderInputGroup({
                    label: 'Stehna (cm)',
                    id: 'bm-thighs',
                    type: 'number',
                    placeholder: 'např. 58'
                })}

                ${renderInputGroup({
                    label: 'Boky (cm)',
                    id: 'bm-hips',
                    type: 'number',
                    placeholder: 'např. 98'
                })}
            </div>

            ${renderInputGroup({
                label: 'URL progresové fotky (volitelné)',
                id: 'bm-photo-url',
                placeholder: 'https://...'
            })}

            ${renderInputGroup({
                label: 'Poznámka',
                id: 'bm-notes',
                placeholder: 'např. Měřeno ráno nalačno...'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('log-measurement-modal')?.remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveBodyMeasurement()" 
                    class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-[10px] uppercase tracking-wider transition shadow-lg shadow-amber-500/20">
                📏 Uložit měření
            </button>
        </div>
    `;

    document.getElementById('log-measurement-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'log-measurement-modal',
        title: 'Zapsat tělesné míry 📏',
        subtitle: 'Sleduj svůj progres a transformaci postavy',
        size: 'lg',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('log-measurement-modal')?.remove()"
    }));

    const modalEl = document.getElementById('log-measurement-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }
}

export async function saveBodyMeasurement() {
    triggerHaptic('medium');

    const date = document.getElementById('bm-date')?.value || getTodayKey();
    const weight = parseFloat(document.getElementById('bm-weight')?.value) || null;
    const bodyFat = parseFloat(document.getElementById('bm-body-fat')?.value) || null;
    const waist = parseFloat(document.getElementById('bm-waist')?.value) || null;
    const arms = parseFloat(document.getElementById('bm-arms')?.value) || null;
    const chest = parseFloat(document.getElementById('bm-chest')?.value) || null;
    const thighs = parseFloat(document.getElementById('bm-thighs')?.value) || null;
    const hips = parseFloat(document.getElementById('bm-hips')?.value) || null;
    const photoUrl = document.getElementById('bm-photo-url')?.value?.trim() || null;
    const notes = document.getElementById('bm-notes')?.value?.trim() || null;

    if (!weight && !waist && !arms && !chest && !bodyFat) {
        showNotification('Vyplň alespoň jednu hodnotu (váhu nebo míru)!', 'warning');
        return;
    }

    const newRecord = {
        user_id: state.currentUser?.id,
        date_key: date,
        weight,
        body_fat: bodyFat,
        waist,
        arms,
        chest,
        thighs,
        hips,
        photo_url: photoUrl,
        notes
    };

    try {
        const { data: created, error } = await supabase
            .from('gym_body_measurements')
            .insert(newRecord)
            .select();

        if (error) throw error;

        const inserted = created?.[0] || newRecord;
        if (!state.gymBodyMeasurements) state.gymBodyMeasurements = [];
        state.gymBodyMeasurements.unshift(inserted);

        // Sort by date desc
        state.gymBodyMeasurements.sort((a, b) => b.date_key.localeCompare(a.date_key));

        awardLoveCoinsToCurrentUser(5, 'Zápis tělesných mír 📏');
        triggerConfetti();
        showNotification('Tělesné míry úspěšně zapsány! (+5 🪙)', 'success');

        document.getElementById('log-measurement-modal')?.remove();

        await ensureGymData(true);
        if (typeof window !== 'undefined' && window.Gym && window.Gym.renderGym) {
            window.Gym.renderGym();
        }
    } catch (err) {
        console.error('Save measurement error:', err);
        showNotification('Chyba při ukládání měření: ' + err.message, 'danger');
    }
}

export async function deleteBodyMeasurement(id) {
    triggerHaptic('light');

    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento záznam měření?');
    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('gym_body_measurements')
            .delete()
            .eq('id', id);

        if (error) throw error;

        state.gymBodyMeasurements = (state.gymBodyMeasurements || []).filter(m => m.id !== id);
        showNotification('Záznam měření byl smazán.', 'info');

        if (typeof window !== 'undefined' && window.Gym && window.Gym.renderGym) {
            window.Gym.renderGym();
        }
    } catch (err) {
        console.error('Delete measurement error:', err);
        showNotification('Chyba při mazání: ' + err.message, 'danger');
    }
}

// ==========================================
// TRANSFORMATION BEFORE / AFTER SLIDER
// ==========================================

export function openTransformationSliderModal() {
    triggerHaptic('medium');

    const measurements = (state.gymBodyMeasurements || [])
        .filter(m => m.user_id === state.currentUser?.id && m.photo_url)
        .sort((a, b) => a.date_key.localeCompare(b.date_key));

    if (measurements.length < 2) {
        showNotification('Pro porovnání potřebuješ alespoň 2 záznamy s fotkou!', 'warning');
        return;
    }

    const beforeItem = measurements[0];
    const afterItem = measurements[measurements.length - 1];

    const contentHtml = `
        <div class="space-y-4 text-center">
            <div class="flex justify-between items-center px-4 text-xs font-mono font-bold text-gray-300">
                <span class="text-amber-400">Před: ${beforeItem.date_key} (${beforeItem.weight || '?'} kg)</span>
                <span class="text-emerald-400">Po: ${afterItem.date_key} (${afterItem.weight || '?'} kg)</span>
            </div>

            <!-- Interactive Before/After Visual -->
            <div class="relative w-full max-w-md mx-auto aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 select-none shadow-2xl bg-black" id="transform-slider-box">
                <!-- After Image (Background) -->
                <img src="${afterItem.photo_url}" class="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" />

                <!-- Before Image (Clipped Foreground) -->
                <div id="before-image-clipper" class="absolute inset-0 overflow-hidden" style="width: 50%;">
                    <img src="${beforeItem.photo_url}" class="absolute inset-0 w-full h-full object-cover max-w-none select-none pointer-events-none" style="width: 100%; height: 100%;" />
                </div>

                <!-- Slider Divider Line -->
                <div id="slider-divider-line" class="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-ew-resize flex items-center justify-center" style="left: 50%;">
                    <div class="w-8 h-8 rounded-full bg-white text-black text-xs font-black flex items-center justify-center shadow-lg border border-black/20 transform -translate-x-1/2 select-none">
                        ◀▶
                    </div>
                </div>

                <!-- Native Range Slider on top for smooth touch & drag -->
                <input type="range" min="0" max="100" value="50" id="transform-range-input" 
                       class="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-30" 
                       oninput="window.Gym.onTransformSliderInput(this.value)" />
            </div>

            <p class="text-[10px] text-gray-500 font-mono">Posouvej jezdcem pro zobrazení transformace</p>
        </div>
    `;

    document.getElementById('transformation-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'transformation-modal',
        title: 'Porovnání Formy (Před / Po) 📸✨',
        subtitle: 'Skvělá práce! Podívej se na své výsledky',
        size: 'md',
        content: contentHtml,
        onClose: "document.getElementById('transformation-modal')?.remove()"
    }));

    const modalEl = document.getElementById('transformation-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }

    if (typeof window !== 'undefined') {
        window.Gym = window.Gym || {};
        window.Gym.onTransformSliderInput = (val) => {
            const clipper = document.getElementById('before-image-clipper');
            const line = document.getElementById('slider-divider-line');
            if (clipper) clipper.style.width = `${val}%`;
            if (line) line.style.left = `${val}%`;
        };
    }
}

// ==========================================
// BODY TREND CHART (SVG line chart)
// ==========================================

const BODY_CHART_CONFIG = {
    weight:   { label: 'Váha (kg)',     color: '#faa61a', lowerIsBetter: false },
    body_fat: { label: 'Tuk (%)',       color: '#a855f7', lowerIsBetter: true  },
    waist:    { label: 'Pas (cm)',      color: '#3b82f6', lowerIsBetter: true  },
    arms:     { label: 'Paže (cm)',     color: '#10b981', lowerIsBetter: false  },
    chest:    { label: 'Hrudník (cm)',  color: '#f43f5e', lowerIsBetter: false  },
    thighs:   { label: 'Stehna (cm)',  color: '#f97316', lowerIsBetter: false  }
};

/**
 * Renders an SVG line chart for a given body metric over time.
 * @param {Array} measurements - Sorted measurements (newest first)
 * @param {string} field - The field to chart (e.g. 'weight')
 * @returns {string} SVG HTML string
 */
export function renderBodyChart(measurements, field) {
    const cfg = BODY_CHART_CONFIG[field] || { label: field, color: '#faa61a', lowerIsBetter: false };
    const data = measurements
        .filter(m => parseFloat(m[field]) > 0)
        .slice(0, 12)
        .reverse(); // oldest first for left-to-right chart

    if (data.length < 2) {
        return `<div class="text-center text-gray-500 text-xs font-bold py-8">Nedostatek dat pro zobrazení (potřeba alespoň 2 záznamy)</div>`;
    }

    const values = data.map(d => parseFloat(d[field]));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const W = 100; // viewBox width percentage units
    const H = 100;
    const PAD = 8;
    const chartW = W - PAD * 2;
    const chartH = H - PAD * 2;

    const points = values.map((v, i) => {
        const x = PAD + (i / (data.length - 1)) * chartW;
        const y = PAD + (1 - (v - minVal) / range) * chartH;
        return { x, y, v, date: data[i].date_key };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    // Fill area under the line
    const fillArea = `${points[0].x},${PAD + chartH} ` + polyline + ` ${points[points.length-1].x},${PAD + chartH}`;

    const latestVal = values[values.length - 1];
    const firstVal = values[0];
    const diff = Math.round((latestVal - firstVal) * 10) / 10;
    const isGood = cfg.lowerIsBetter ? diff <= 0 : diff >= 0;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

    return `
        <div class="w-full select-none">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[9px] font-mono text-gray-500">${cfg.label}</span>
                <span class="text-[10px] font-black font-mono ${isGood ? 'text-emerald-400' : 'text-red-400'}">${diffStr} celkem</span>
            </div>
            <svg viewBox="0 0 100 100" class="w-full" style="height:140px;" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="body-chart-fill-${field}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${cfg.color}" stop-opacity="0.25"/>
                        <stop offset="100%" stop-color="${cfg.color}" stop-opacity="0.02"/>
                    </linearGradient>
                </defs>
                <!-- Grid lines -->
                <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${PAD + chartH}" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
                <line x1="${PAD}" y1="${PAD + chartH}" x2="${PAD + chartW}" y2="${PAD + chartH}" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
                <!-- Fill -->
                <polygon points="${fillArea}" fill="url(#body-chart-fill-${field})"/>
                <!-- Line -->
                <polyline points="${polyline}" fill="none" stroke="${cfg.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Data dots -->
                ${points.map((p, i) => `
                    <circle cx="${p.x}" cy="${p.y}" r="${i === points.length - 1 ? 2.5 : 1.5}" fill="${cfg.color}" opacity="${i === points.length - 1 ? 1 : 0.6}"/>
                `).join('')}
                <!-- Labels: first and last value -->
                <text x="${points[0].x}" y="${points[0].y - 3}" font-size="5" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="monospace">${firstVal}</text>
                <text x="${points[points.length-1].x}" y="${points[points.length-1].y - 3}" font-size="5" fill="${cfg.color}" text-anchor="middle" font-family="monospace" font-weight="bold">${latestVal}</text>
            </svg>
            <div class="flex justify-between text-[8px] text-gray-600 font-mono mt-1">
                <span>${data[0].date_key}</span>
                <span>${data[data.length-1].date_key}</span>
            </div>
        </div>
    `;
}

/**
 * Switches the body tracker chart to a different metric.
 * Pure DOM update – no full re-render.
 */
export function switchBodyChart(field) {
    const measurements = (state.gymBodyMeasurements || []).filter(m => m.user_id === state.currentUser?.id);
    const container = document.getElementById('body-chart-container');
    if (!container) return;

    container.innerHTML = renderBodyChart(measurements, field);

    // Update tab button styles
    const cfg = BODY_CHART_CONFIG[field] || { color: '#faa61a' };
    ['weight', 'body_fat', 'waist', 'arms', 'chest', 'thighs'].forEach(f => {
        const btn = document.getElementById(`bchart-btn-${f}`);
        if (!btn) return;
        if (f === field) {
            btn.className = `px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition bg-amber-500 text-black`;
            btn.style.background = cfg.color;
        } else {
            btn.className = `px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition text-gray-400 hover:text-white`;
            btn.style.background = '';
        }
    });
}
