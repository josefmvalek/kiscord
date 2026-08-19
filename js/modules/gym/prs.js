import { state } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { renderModal } from '../../core/ui.js';
import { calculateWeeklyVolume, calculateMuscleBalance, getExerciseProgression } from './analytics.js';
import { getMyName, getPartnerName, getMyEmoji, getPartnerEmoji } from './shared.js';
import { renderMuscleHeatMapCard } from './muscleMap.js';
import { openFitnessWrappedModal } from './annualWrapped.js';


export let currentAnalyticsData = null;
export function setCurrentAnalyticsData(data) { currentAnalyticsData = data; }

export function renderPRsTab() {
    const prs = state.gymPRs || [];
    const exercises = state.gymExercises || [];

    const myPRs = prs.filter(p => p.user_id === state.currentUser?.id);
    const partnerPRs = prs.filter(p => p.user_id !== state.currentUser?.id);

    const partnerName = getPartnerName();
    const myEmoji = getMyEmoji();
    const partnerEmoji = getPartnerEmoji();

    // Volume Load data for current user
    const volumeData = calculateWeeklyVolume(state.currentUser?.id, 6);
    const currentTons = volumeData.currentWeek.tons;
    const diffPct = volumeData.diffPercent;

    // Muscle Balance data
    const muscleData = calculateMuscleBalance(state.currentUser?.id, 7);

    return `
        <div class="space-y-6">
            <!-- Top Action Banner: Fitness Wrapped -->
            <div class="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-pink-500/15 border border-white/10 shadow-xl select-none">
                <div class="flex items-center gap-3">
                    <span class="text-2xl animate-bounce-slow">🏆</span>
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-[#faa61a] block font-mono">Statistický Přehled</span>
                        <h4 class="text-xs font-black text-white uppercase tracking-tight leading-none mt-0.5">Tvoje Fitness Cesta & Rekordy</h4>
                    </div>
                </div>
                <button onclick="window.Gym.openFitnessWrappedModal()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-[10px] uppercase tracking-wider transition shadow-md flex items-center gap-1.5 flex-shrink-0">
                    <i class="fas fa-chart-pie text-xs"></i> <span>Můj Wrapped</span>
                </button>
            </div>

            <!-- 1. Volume Load & Muscle Analytics Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Weekly Volume Card -->
                <div class="glass-card bg-gradient-to-br from-[#faa61a]/10 via-[#faa61a]/5 to-transparent border border-[#faa61a]/25 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <span class="text-[9px] font-black uppercase text-amber-400/80 tracking-widest block font-sans">Týdenní Objem (Volume Load)</span>
                            <h3 class="text-2xl font-black text-white font-mono mt-0.5">
                                ${currentTons} <span class="text-sm text-gray-400 font-sans font-bold">tun</span>
                            </h3>
                        </div>
                        <div class="px-2.5 py-1 rounded-xl ${diffPct >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'} text-[10px] font-black font-mono flex items-center gap-1">
                            <span>${diffPct >= 0 ? '▲ +' : '▼ '}${diffPct}%</span>
                            <span class="text-[8px] font-sans font-normal text-gray-400">vs min. týden</span>
                        </div>
                    </div>

                    <!-- Mini weekly volume bars -->
                    <div class="mt-4 pt-3 border-t border-white/5">
                        <div class="flex items-end justify-between gap-2 h-14 select-none">
                            ${volumeData.weeks.map((w, idx) => {
                                const maxTons = Math.max(...volumeData.weeks.map(wk => wk.tons), 1);
                                const heightPct = Math.max(12, Math.round((w.tons / maxTons) * 100));
                                const isCurrent = idx === volumeData.weeks.length - 1;

                                return `
                                    <div class="flex-1 flex flex-col items-center gap-1 group/bar relative" title="${w.label}: ${w.tons} tun (${w.volumeKg} kg, ${w.setsCount} sérií)">
                                        <div class="w-full rounded-lg transition-all ${isCurrent ? 'bg-[#faa61a] shadow-lg shadow-[#faa61a]/20' : 'bg-white/10 hover:bg-white/20'}" style="height: ${heightPct}%;"></div>
                                        <span class="text-[7.5px] font-mono font-bold ${isCurrent ? 'text-amber-400' : 'text-gray-500'}">${w.label}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Muscle Balance (Svalová mapa) Card -->
                <div class="glass-card bg-black/20 border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <div>
                                <span class="text-[9px] font-black uppercase text-gray-400 tracking-widest block font-sans">Svalová Vyváženost (7 dní)</span>
                                <h4 class="text-sm font-black text-white font-sans mt-0.5">
                                    Odcvičeno ${muscleData.totalSets} sérií
                                </h4>
                            </div>
                            ${muscleData.neglected.length > 0 ? `
                                <div class="px-2 py-0.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 text-[9px] font-black uppercase tracking-wider" title="0 sérií tento týden">
                                    ⚠️ ${muscleData.neglected.map(n => n.id).join(', ')}
                                </div>
                            ` : `
                                <div class="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                                    ✨ Vyváženo
                                </div>
                            `}
                        </div>

                        <!-- Muscle bars -->
                        <div class="space-y-1.5 mt-3 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            ${muscleData.breakdown.slice(0, 5).map(m => `
                                <div class="space-y-0.5 text-[10px]">
                                    <div class="flex justify-between items-center text-gray-300 font-bold">
                                        <span class="flex items-center gap-1">${m.emoji} ${m.id}</span>
                                        <span class="font-mono text-gray-400">${m.sets} sérií (${m.percentage}%)</span>
                                    </div>
                                    <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all" style="width: ${m.percentage}%; background-color: ${m.color};"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Anatomical Muscle Heat Map (Front & Back) -->
            ${renderMuscleHeatMapCard(state.currentUser?.id)}

            <!-- 2. Personal Records Header & Grid -->
            <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none pt-2">
                <i class="fas fa-trophy text-[#faa61a]"></i> Osobní Rekordy (PRs)
            </h2>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- My PRs -->
                <div class="space-y-3">
                    <h3 class="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                        <span>Moje Maximálky ${myEmoji}</span>
                        <span class="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono">${myPRs.length}</span>
                    </h3>

                    <div class="space-y-2">
                        ${myPRs.length === 0 ? `
                            <div class="p-6 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl text-center text-xs text-white/40 italic">
                                Zatím nemáš zapsané žádné rekordy.
                            </div>
                        ` : myPRs.map(pr => {
                            const ex = exercises.find(e => e.id === pr.exercise_id) || { name: pr.exercise_id, category: 'Ostatní' };
                            const dateStr = new Date(pr.achieved_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

                            return `
                                <div onclick="window.Gym.openExerciseAnalyticsModal('${pr.exercise_id}')" class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/15 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition group select-none">
                                    <div>
                                        <span class="text-[8px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                                        <h4 class="text-xs font-bold text-white leading-snug group-hover:text-[#faa61a] transition-colors">${ex.name}</h4>
                                    </div>

                                    <div class="text-right font-mono">
                                        <div class="text-sm font-black text-[#faa61a] leading-none">${pr.weight} kg</div>
                                        <div class="text-[9px] text-gray-500 font-bold mt-1">${pr.reps} rep • ${dateStr}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Partner PRs -->
                <div class="space-y-3">
                    <h3 class="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                        <span>Maximálky ${partnerName} ${partnerEmoji}</span>
                        <span class="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono">${partnerPRs.length}</span>
                    </h3>

                    <div class="space-y-2">
                        ${partnerPRs.length === 0 ? `
                            <div class="p-6 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl text-center text-xs text-white/40 italic">
                                ${partnerName} zatím nemá zapsané žádné rekordy.
                            </div>
                        ` : partnerPRs.map(pr => {
                            const ex = exercises.find(e => e.id === pr.exercise_id) || { name: pr.exercise_id, category: 'Ostatní' };
                            const dateStr = new Date(pr.achieved_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

                            return `
                                <div onclick="window.Gym.openExerciseAnalyticsModal('${pr.exercise_id}')" class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/15 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition group select-none">
                                    <div>
                                        <span class="text-[8px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                                        <h4 class="text-xs font-bold text-white leading-snug group-hover:text-[#eb459e] transition-colors">${ex.name}</h4>
                                    </div>

                                    <div class="text-right font-mono">
                                        <div class="text-sm font-black text-[#eb459e] leading-none">${pr.weight} kg</div>
                                        <div class="text-[9px] text-gray-500 font-bold mt-1">${pr.reps} rep • ${dateStr}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function openExerciseAnalyticsModal(exerciseId) {
    triggerHaptic('light');

    const ex = state.gymExercises.find(e => e.id === exerciseId);
    if (!ex) return;

    const logs = state.gymLogs || [];
    const myId = state.currentUser?.id;
    const partnerName = getPartnerName();
    const myEmoji = getMyEmoji();
    const partnerEmoji = getPartnerEmoji();

    const parseUserHistory = (userId) => {
        const history = [];
        logs.filter(l => l.user_id === userId).forEach(log => {
            if (log.exercises) {
                log.exercises.forEach(le => {
                    if (le.exercise_id === exerciseId && le.sets) {
                        const completedSets = le.sets.filter(s => s.completed);
                        if (completedSets.length > 0) {
                            const maxW = completedSets.reduce((max, s) => Math.max(max, parseFloat(s.weight) || 0), 0);
                            const vol = completedSets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
                            const max1RM = completedSets.reduce((max, s) => {
                                const w = parseFloat(s.weight) || 0;
                                const r = parseInt(s.reps) || 0;
                                const oneRM = r === 1 ? w : w * (1 + r / 30);
                                return Math.max(max, oneRM);
                            }, 0);

                            history.push({
                                logId: log.id,
                                workoutName: log.name,
                                date: log.date_key,
                                rawDate: new Date(log.logged_at || log.date_key),
                                maxWeight: maxW,
                                volume: vol,
                                est1RM: Math.round(max1RM * 10) / 10,
                                setsStr: completedSets.map(s => `${s.weight}kg × ${s.reps}`).join(', ')
                            });
                        }
                    }
                });
            }
        });
        history.sort((a, b) => a.rawDate - b.rawDate);
        return history;
    };

    const myHistory = parseUserHistory(myId);
    const partnerLogs = logs.filter(l => l.user_id && l.user_id !== myId);
    const partnerUserId = partnerLogs.length > 0 ? partnerLogs[0].user_id : null;
    const partnerHistory = partnerUserId ? parseUserHistory(partnerUserId) : [];

    setCurrentAnalyticsData({
        exerciseName: ex.name,
        category: ex.category,
        myHistory,
        partnerHistory,
        currentMetric: 'maxWeight',
        currentUserFilter: 'me'
    });

    const contentHtml = `
        <div class="space-y-4 text-left font-sans min-w-0">
            <!-- User filter tabs (Já / Partner / Oba) -->
            <div class="flex items-center justify-between gap-2">
                <div class="flex gap-1 p-1 bg-black/30 border border-white/5 rounded-xl select-none">
                    <button onclick="window.Gym.setAnalyticsUser('me')" id="btn-user-me" class="py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition bg-amber-500 text-black">
                        ${myEmoji} Já
                    </button>
                    <button onclick="window.Gym.setAnalyticsUser('partner')" id="btn-user-partner" class="py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition text-gray-400 hover:text-white">
                        ${partnerEmoji} ${partnerName}
                    </button>
                    ${partnerHistory.length > 0 && myHistory.length > 0 ? `
                        <button onclick="window.Gym.setAnalyticsUser('both')" id="btn-user-both" class="py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition text-gray-400 hover:text-white">
                            ⚡ Oba
                        </button>
                    ` : ''}
                </div>

                <!-- Metric tabs -->
                <div class="flex gap-1 p-1 bg-black/30 border border-white/5 rounded-xl select-none">
                    <button onclick="window.Gym.renderAnalyticsChart('maxWeight')" id="btn-metric-maxWeight" class="py-1 px-2 rounded-lg text-[9px] font-bold transition bg-[#faa61a] text-black font-mono">
                        Max
                    </button>
                    <button onclick="window.Gym.renderAnalyticsChart('est1RM')" id="btn-metric-est1RM" class="py-1 px-2 rounded-lg text-[9px] font-bold transition text-gray-400 hover:text-white font-mono">
                        1RM
                    </button>
                    <button onclick="window.Gym.renderAnalyticsChart('volume')" id="btn-metric-volume" class="py-1 px-2 rounded-lg text-[9px] font-bold transition text-gray-400 hover:text-white font-mono">
                        Objem
                    </button>
                </div>
            </div>

            <!-- Chart container -->
            <div id="analytics-chart-container" class="relative bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-center min-h-[220px]">
            </div>

            <!-- History list container -->
            <div class="space-y-2 mt-4">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Historie pokusů</label>
                <div id="analytics-history-list" class="max-h-48 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2.5">
                    <!-- Populated by renderAnalyticsHistory -->
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end w-full">
            <button onclick="document.getElementById('exercise-analytics-modal').remove()" 
                    class="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-[10px] uppercase tracking-wider transition">
                Zavřít
            </button>
        </div>
    `;

    document.getElementById('exercise-analytics-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'exercise-analytics-modal',
        title: ex.name,
        subtitle: `Analýza a historie zvedaných vah (${ex.category}) 📊`,
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('exercise-analytics-modal').remove()"
    }));

    document.getElementById('exercise-analytics-modal').classList.remove('hidden');
    document.getElementById('exercise-analytics-modal').classList.add('flex');

    renderAnalyticsChart('maxWeight');
    renderAnalyticsHistory();
}

export function setAnalyticsUser(userFilter) {
    triggerHaptic('light');
    if (!currentAnalyticsData) return;
    currentAnalyticsData.currentUserFilter = userFilter;

    // Update user button styling
    ['me', 'partner', 'both'].forEach(u => {
        const btn = document.getElementById(`btn-user-${u}`);
        if (!btn) return;
        if (u === userFilter) {
            btn.className = "py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition bg-amber-500 text-black";
        } else {
            btn.className = "py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition text-gray-400 hover:text-white";
        }
    });

    renderAnalyticsChart(currentAnalyticsData.currentMetric || 'maxWeight');
    renderAnalyticsHistory();
}

function renderAnalyticsHistory() {
    const data = currentAnalyticsData;
    if (!data) return;

    const container = document.getElementById('analytics-history-list');
    if (!container) return;

    const userFilter = data.currentUserFilter || 'me';
    let history = [];
    if (userFilter === 'me') history = data.myHistory || [];
    else if (userFilter === 'partner') history = data.partnerHistory || [];
    else history = [...(data.myHistory || []), ...(data.partnerHistory || [])].sort((a, b) => a.rawDate - b.rawDate);

    if (history.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 italic text-center py-6">Zatím žádné dokončené zápisy pro tento výběr.</p>`;
        return;
    }

    container.innerHTML = [...history].reverse().map(h => {
        const dateStr = new Date(h.rawDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: '2-digit' });
        return `
            <div class="flex items-start justify-between gap-3 text-xs border-b border-white/[0.03] pb-2 last:border-0 last:pb-0 font-mono">
                <div class="min-w-0">
                    <div class="font-bold text-gray-200 font-sans truncate max-w-[180px]">${h.workoutName}</div>
                    <div class="text-[10px] text-gray-500 font-semibold mt-0.5">${h.setsStr}</div>
                </div>
                <div class="text-right flex-shrink-0">
                    <span class="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/40 block w-max ml-auto leading-none mb-1 font-sans">${dateStr}</span>
                    <span class="font-bold text-[#faa61a]">${h.maxWeight} kg</span>
                    <span class="text-[10px] text-gray-500 block">Objem: ${h.volume} kg</span>
                </div>
            </div>
        `;
    }).join('');
}

export function renderAnalyticsChart(metric) {
    triggerHaptic('light');

    const data = currentAnalyticsData;
    if (!data) return;
    data.currentMetric = metric;

    const container = document.getElementById('analytics-chart-container');
    if (!container) return;

    const metrics = ['maxWeight', 'est1RM', 'volume'];
    metrics.forEach(m => {
        const btn = document.getElementById(`btn-metric-${m}`);
        if (btn) {
            if (m === metric) {
                btn.className = "py-1 px-2 rounded-lg text-[9px] font-bold transition bg-[#faa61a] text-black font-mono shadow-sm";
            } else {
                btn.className = "py-1 px-2 rounded-lg text-[9px] font-bold transition text-gray-400 hover:text-white font-mono bg-transparent";
            }
        }
    });

    const userFilter = data.currentUserFilter || 'me';
    const myHistory = data.myHistory || [];
    const partnerHistory = data.partnerHistory || [];

    if (userFilter === 'both') {
        // Render dual-line chart
        container.innerHTML = _renderDualAnalyticsChart(myHistory, partnerHistory, metric);
        return;
    }

    const history = userFilter === 'partner' ? partnerHistory : myHistory;
    const lineColor = userFilter === 'partner' ? '#eb459e' : '#faa61a';
    const userLabel = userFilter === 'partner' ? getPartnerName() : 'Já';

    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <span class="text-4xl block mb-2">🦉</span>
                <p class="text-xs text-gray-500 font-bold">${userLabel} zatím nemá žádná data pro tento graf.</p>
            </div>
        `;
        return;
    }

    const unit = metric === 'volume' ? 'kg volume' : 'kg';
    const svgWidth = 430;
    const svgHeight = 180;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const values = history.map(h => h[metric]);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    const valRange = maxVal - minVal;
    const yMax = valRange === 0 ? maxVal + 10 : maxVal + valRange * 0.15;
    const yMin = valRange === 0 ? Math.max(0, minVal - 10) : Math.max(0, minVal - valRange * 0.15);
    const yRange = yMax - yMin || 1;

    const points = [];
    const N = history.length;

    history.forEach((h, idx) => {
        const x = paddingLeft + (N > 1 ? (idx / (N - 1)) * chartWidth : chartWidth / 2);
        const y = paddingTop + (1 - (h[metric] - yMin) / yRange) * chartHeight;
        points.push({ x, y, val: h[metric], date: h.date });
    });

    let svgHtml = `
        <svg class="w-full h-full min-h-[180px] min-w-[280px]" viewBox="0 0 ${svgWidth} ${svgHeight}">
            <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.0" />
                </linearGradient>
            </defs>

            <line x1="${paddingLeft}" y1="${paddingTop}" x2="${svgWidth - paddingRight}" y2="${paddingTop}" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="${paddingLeft}" y1="${paddingTop + chartHeight / 2}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartHeight / 2}" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartHeight}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />

            <text x="${paddingLeft - 8}" y="${paddingTop + 3}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-weight="bold">${Math.round(yMax)}</text>
            <text x="${paddingLeft - 8}" y="${paddingTop + chartHeight / 2 + 3}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-weight="bold">${Math.round(yMin + yRange / 2)}</text>
            <text x="${paddingLeft - 8}" y="${paddingTop + chartHeight + 3}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-weight="bold">${Math.round(yMin)}</text>
    `;

    if (points.length > 0) {
        let areaPath = `M ${points[0].x} ${paddingTop + chartHeight}`;
        points.forEach(p => { areaPath += ` L ${p.x} ${p.y}`; });
        areaPath += ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;

        let linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            linePath += ` L ${points[i].x} ${points[i].y}`;
        }

        svgHtml += `<path d="${areaPath}" fill="url(#chart-area-grad)" />`;
        svgHtml += `<path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px ${lineColor}66);" />`;

        points.forEach((p, idx) => {
            const dateObj = new Date(p.date);
            const dateStr = dateObj.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
            const shouldShowLabel = idx === 0 || idx === N - 1 || (N > 2 && idx === Math.floor(N / 2));
            if (shouldShowLabel) {
                svgHtml += `<text x="${p.x}" y="${paddingTop + chartHeight + 15}" fill="rgba(255,255,255,0.25)" font-size="8" text-anchor="middle" font-weight="bold">${dateStr}</text>`;
            }
            svgHtml += `
                <g class="chart-node group/node" cursor="pointer">
                    <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${lineColor}" stroke="#202225" stroke-width="1.5" />
                    <circle cx="${p.x}" cy="${p.y}" r="9" fill="${lineColor}26" class="opacity-0 hover:opacity-100 transition duration-150" />
                    <title>${dateStr}: ${p.val} ${unit}</title>
                </g>
            `;
        });
    }

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}

function _renderDualAnalyticsChart(myHist, partnerHist, metric) {
    const myName = getMyName();
    const partnerName = getPartnerName();
    const unit = metric === 'volume' ? 'kg volume' : 'kg';

    const allValues = [...myHist.map(h => h[metric]), ...partnerHist.map(h => h[metric])];
    if (allValues.length === 0) {
        return `<div class="text-center text-gray-500 text-xs py-8">Nedostatek dat pro srovnání</div>`;
    }

    const svgWidth = 430;
    const svgHeight = 180;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const yMax = maxVal + (maxVal - minVal) * 0.15 + 5;
    const yMin = Math.max(0, minVal - (maxVal - minVal) * 0.15 - 5);
    const yRange = yMax - yMin || 1;

    const mapPoints = (hist) => hist.map((h, i) => ({
        x: paddingLeft + (hist.length > 1 ? (i / (hist.length - 1)) * chartWidth : chartWidth / 2),
        y: paddingTop + (1 - (h[metric] - yMin) / yRange) * chartHeight,
        val: h[metric],
        date: h.date
    }));

    const myPoints = mapPoints(myHist);
    const partnerPoints = mapPoints(partnerHist);

    const makeLinePath = (pts) => pts.length === 0 ? '' : pts.reduce((p, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${p} L ${pt.x} ${pt.y}`, '');

    const myMax = myHist.length > 0 ? Math.max(...myHist.map(h => h[metric])) : 0;
    const partnerMax = partnerHist.length > 0 ? Math.max(...partnerHist.map(h => h[metric])) : 0;

    return `
        <div class="w-full">
            <div class="flex items-center justify-between mb-2 text-[10px] font-mono px-2 select-none">
                <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#faa61a]"></span><span class="text-white font-bold">${myName}</span> (${myMax}${unit})</span>
                    <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#eb459e]"></span><span class="text-white font-bold">${partnerName}</span> (${partnerMax}${unit})</span>
                </div>
                ${myMax > 0 && partnerMax > 0 ? `
                    <span class="text-[9px] font-bold ${myMax >= partnerMax ? 'text-amber-400' : 'text-pink-400'}">
                        ${myMax >= partnerMax ? `${myName} +${Math.round(myMax - partnerMax)}kg` : `${partnerName} +${Math.round(partnerMax - myMax)}kg`}
                    </span>
                ` : ''}
            </div>
            <svg class="w-full h-full min-h-[160px]" viewBox="0 0 ${svgWidth} ${svgHeight}">
                <line x1="${paddingLeft}" y1="${paddingTop}" x2="${svgWidth - paddingRight}" y2="${paddingTop}" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
                <line x1="${paddingLeft}" y1="${paddingTop + chartHeight / 2}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartHeight / 2}" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
                <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartHeight}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />

                ${myPoints.length > 0 ? `<path d="${makeLinePath(myPoints)}" fill="none" stroke="#faa61a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                ${partnerPoints.length > 0 ? `<path d="${makeLinePath(partnerPoints)}" fill="none" stroke="#eb459e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}

                ${myPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#faa61a" stroke="#202225" stroke-width="1.5"><title>${myName}: ${p.val} ${unit}</title></circle>`).join('')}
                ${partnerPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#eb459e" stroke="#202225" stroke-width="1.5"><title>${partnerName}: ${p.val} ${unit}</title></circle>`).join('')}
            </svg>
        </div>
    `;
}

