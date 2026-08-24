import { calculateSmoothedWeightTrend } from '../nutrition/tdeeCoach.js';
import { escapeHTML } from '@core/utils.js';

/**
 * Renders the Weight Trend Hero card with SVG chart.
 */
export function renderWeightTrendHero(bioData, weightHistory = [], userKey = 'josef') {
    const rawWeights = weightHistory.map(w => ({
        date: w.date_key || w.date,
        weight: Number(w.weight),
        body_fat: w.body_fat ? Number(w.body_fat) : null
    })).filter(w => w.weight > 0).sort((a, b) => a.date.localeCompare(b.date));

    const smoothed = calculateSmoothedWeightTrend(rawWeights, 0.15);
    const currentWeight = bioData.weight;
    const targetWeight = bioData.targetWeight;
    const weightDiff = Math.round((currentWeight - targetWeight) * 10) / 10;
    const latestFat = rawWeights.length > 0 ? rawWeights[rawWeights.length - 1].body_fat : null;

    return `
        <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-5">
            <!-- Header with Quick Stats -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#3ba55c] flex items-center justify-center text-sm font-bold">
                            <i class="fas fa-weight-scale"></i>
                        </span>
                        <div>
                            <h3 class="text-sm font-black text-white uppercase tracking-wider">Tělesná Hmotnost & Cíl</h3>
                            <p class="text-[10px] text-gray-400">Profil: ${userKey === 'josef' ? 'Josef 🏋️‍♂️' : 'Klárka 🌸'} • Cíl: ${bioData.targetWeight} kg</p>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        onclick="window.openLogWeightModal('${userKey}')"
                        class="py-2 px-3.5 bg-[#3ba55c] hover:bg-[#3ba55c]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-[#3ba55c]/20 flex items-center gap-1.5"
                    >
                        <i class="fas fa-plus text-[10px]"></i> <span>Zapsat váhu</span>
                    </button>
                    <button 
                        onclick="window.openBiometricsProfileModal('${userKey}')"
                        class="p-2 bg-[#202225] hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs transition border border-white/5"
                        title="Nastavení biometrického profilu"
                    >
                        <i class="fas fa-user-gear"></i>
                    </button>
                </div>
            </div>

            <!-- Stats Metric Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-[#202225] p-3 rounded-xl border border-white/5 text-center">
                    <span class="text-[10px] text-gray-400 font-bold block uppercase">Aktuální váha</span>
                    <span class="text-xl font-black text-white mt-0.5 block">${currentWeight} <span class="text-xs font-normal text-gray-400">kg</span></span>
                </div>
                <div class="bg-[#202225] p-3 rounded-xl border border-white/5 text-center">
                    <span class="text-[10px] text-gray-400 font-bold block uppercase">Cílová váha</span>
                    <span class="text-xl font-black text-[#3ba55c] mt-0.5 block">${targetWeight} <span class="text-xs font-normal text-gray-400">kg</span></span>
                    <span class="text-[9px] text-gray-500">${weightDiff === 0 ? 'Cíl splněn! 🎯' : `${weightDiff > 0 ? `-${weightDiff} kg do cíle` : `+${Math.abs(weightDiff)} kg do cíle`}`}</span>
                </div>
                <div class="bg-[#202225] p-3 rounded-xl border border-white/5 text-center">
                    <span class="text-[10px] text-gray-400 font-bold block uppercase">Tělesný tuk</span>
                    <span class="text-xl font-black text-indigo-400 mt-0.5 block">${latestFat ? `${latestFat}%` : '–'}</span>
                    <span class="text-[9px] text-gray-500">${bioData.lbm ? `${bioData.lbm} kg svalů (LBM)` : 'Nezadáno'}</span>
                </div>
                <div class="bg-[#202225] p-3 rounded-xl border border-white/5 text-center">
                    <span class="text-[10px] text-gray-400 font-bold block uppercase">FFMI Index</span>
                    <span class="text-xl font-black text-amber-400 mt-0.5 block">${bioData.ffmi ? bioData.ffmi.normalized : '–'}</span>
                    <span class="text-[9px] text-gray-500 truncate block">${bioData.ffmi ? bioData.ffmi.category : '–'}</span>
                </div>
            </div>

            <!-- SVG Weight Trend Line Chart -->
            <div class="bg-[#202225] p-4 rounded-xl border border-white/5 space-y-2">
                <div class="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                    <span class="font-bold text-gray-300 flex items-center gap-2">
                        <i class="fas fa-chart-line text-[#3ba55c]"></i> Vývoj váhy a vyhlazený trend (EMA)
                    </span>
                    <div class="flex items-center gap-3 text-[10px]">
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Měření</span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span> Trend (EMA)</span>
                    </div>
                </div>

                ${renderSvgWeightChart(rawWeights, smoothed)}
            </div>

            <!-- 1-Click Sync Banner to Nutrition -->
            <div class="p-3.5 bg-gradient-to-r from-[#5865F2]/20 to-[#14b8a6]/20 border border-[#5865F2]/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div class="text-center sm:text-left">
                    <span class="text-xs font-black text-white block">🎯 Personalizovaný denní výživový plán</span>
                    <span class="text-[11px] text-gray-300">
                        BMR: <strong>${bioData.bmr} kcal</strong> • TDEE: <strong>${bioData.tdee} kcal</strong> • Cíl: <strong>${bioData.targetCalories} kcal</strong> (${bioData.macros.protein}g P)
                    </span>
                </div>
                <button 
                    onclick="window.applyBiometricsToNutrition('${userKey}')"
                    class="py-2 px-4 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center gap-1.5 whitespace-nowrap"
                >
                    <i class="fas fa-bolt"></i> <span>Aplikovat do #výživa</span>
                </button>
            </div>
        </div>
    `;
}

function renderSvgWeightChart(rawWeights, smoothed) {
    if (rawWeights.length === 0) {
        return `<div class="py-12 text-center text-xs text-gray-500 italic">Zatím nebyla zapsána žádná váha. Zapiš své první ranní vážení výše!</div>`;
    }

    const width = 600;
    const height = 160;
    const padding = 25;

    const allVals = rawWeights.map(r => r.weight);
    const minVal = Math.min(...allVals) - 1.5;
    const maxVal = Math.max(...allVals) + 1.5;
    const valRange = Math.max(1, maxVal - minVal);

    const getX = (idx) => padding + (idx * ((width - (padding * 2)) / Math.max(1, rawWeights.length - 1)));
    const getY = (val) => height - padding - (((val - minVal) / valRange) * (height - (padding * 2)));

    // Points for raw weights
    const rawPoints = rawWeights.map((w, idx) => `${getX(idx)},${getY(w.weight)}`).join(' ');
    // Points for smoothed trend
    const smoothedPoints = smoothed.map((s, idx) => `${getX(idx)},${getY(s.smoothed)}`).join(' ');

    return `
        <div class="w-full overflow-x-auto">
            <svg viewBox="0 0 ${width} ${height}" class="w-full h-40">
                <!-- Grid Lines -->
                <line x1="${padding}" y1="${getY(minVal)}" x2="${width - padding}" y2="${getY(minVal)}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
                <line x1="${padding}" y1="${getY((minVal + maxVal) / 2)}" x2="${width - padding}" y2="${getY((minVal + maxVal) / 2)}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
                <line x1="${padding}" y1="${getY(maxVal)}" x2="${width - padding}" y2="${getY(maxVal)}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />

                <!-- Smoothed Trend Line (Indigo) -->
                ${smoothed.length > 1 ? `
                    <polyline fill="none" stroke="#818cf8" stroke-width="2.5" stroke-dasharray="4 2" points="${smoothedPoints}" />
                ` : ''}

                <!-- Actual Weight Line (Emerald) -->
                ${rawWeights.length > 1 ? `
                    <polyline fill="none" stroke="#3ba55c" stroke-width="3" stroke-linecap="round" points="${rawPoints}" />
                ` : ''}

                <!-- Dots for entries -->
                ${rawWeights.map((w, idx) => `
                    <circle cx="${getX(idx)}" cy="${getY(w.weight)}" r="4.5" fill="#3ba55c" stroke="#202225" stroke-width="2" />
                    <text x="${getX(idx)}" y="${getY(w.weight) - 8}" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="bold">${w.weight}</text>
                `).join('')}
            </svg>
        </div>
    `;
}

/**
 * Renders Body Circumferences Section (Chest, Waist, Hips, Biceps, Thighs).
 */
export function renderCircumferencesSection(measurements = [], userKey = 'josef') {
    const sorted = [...measurements].sort((a, b) => (b.date_key || b.date).localeCompare(a.date_key || a.date));
    const latest = sorted[0] || {};
    const oldest = sorted[sorted.length - 1] || {};

    const parts = [
        { id: 'chest', name: 'Hrudník', icon: 'fa-shirt', val: latest.chest, firstVal: oldest.chest },
        { id: 'waist', name: 'Pas / Břicho', icon: 'fa-ruler-horizontal', val: latest.waist, firstVal: oldest.waist },
        { id: 'hips', name: 'Boky', icon: 'fa-arrows-left-right', val: latest.hips, firstVal: oldest.hips },
        { id: 'biceps', name: 'Biceps', icon: 'fa-dumbbell', val: latest.biceps, firstVal: oldest.biceps },
        { id: 'thighs', name: 'Stehna', icon: 'fa-person-walking', val: latest.thighs, firstVal: oldest.thighs },
        { id: 'calves', name: 'Lýtka', icon: 'fa-shoe-prints', val: latest.calves, firstVal: oldest.calves }
    ];

    return `
        <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-white/5">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-indigo-500/20 text-[#5865F2] flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-ruler-combined"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Obvody Těla</h3>
                        <p class="text-[10px] text-gray-400">Sledování změn v centimetrech</p>
                    </div>
                </div>
                <button 
                    onclick="window.openLogCircumferencesModal('${userKey}')"
                    class="py-2 px-3.5 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-[#5865F2]/20 flex items-center gap-1.5"
                >
                    <i class="fas fa-plus text-[10px]"></i> <span>Zapsat míry</span>
                </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                ${parts.map(p => {
                    const diff = (p.val && p.firstVal && sorted.length > 1) ? Math.round((p.val - p.firstVal) * 10) / 10 : null;
                    return `
                        <div class="bg-[#202225] p-3 rounded-xl border border-white/5 flex flex-col justify-between text-center space-y-1">
                            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate">${p.name}</span>
                            <div class="text-base font-black text-white">${p.val ? `${p.val} <span class="text-[10px] font-normal text-gray-400">cm</span>` : '–'}</div>
                            <span class="text-[9px] font-bold ${diff > 0 ? 'text-emerald-400' : (diff < 0 ? 'text-rose-400' : 'text-gray-500')}">
                                ${diff !== null ? `${diff > 0 ? `+${diff}` : diff} cm` : '–'}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}
