import { state } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { renderModal } from '../../core/ui.js';

export let currentAnalyticsData = null;
export function setCurrentAnalyticsData(data) { currentAnalyticsData = data; }

export function renderPRsTab() {
    const prs = state.gymPRs || [];
    const exercises = state.gymExercises || [];

    const myPRs = prs.filter(p => p.user_id === state.currentUser?.id);
    const partnerPRs = prs.filter(p => p.user_id !== state.currentUser?.id);

    const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';

    return `
        <div class="space-y-6">
            <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                <i class="fas fa-trophy text-[#faa61a]"></i> Osobní Rekordy (PRs)
            </h2>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- My PRs -->
                <div class="space-y-3">
                    <h3 class="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                        <span>Moje Maximálky 🦝</span>
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
                        <span>Maximálky ${partnerName} 👸</span>
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
    const exHistory = [];

    logs.forEach(log => {
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

                        exHistory.push({
                            logId: log.id,
                            workoutName: log.name,
                            date: log.date_key,
                            rawDate: new Date(log.logged_at || log.date_key),
                            maxWeight: maxW,
                            volume: vol,
                            est1RM: Math.round(max1RM * 10) / 10,
                            setsStr: completedSets.map(s => `${s.weight}kg x ${s.reps}`).join(', ')
                        });
                    }
                }
            });
        }
    });

    exHistory.sort((a, b) => a.rawDate - b.rawDate);

    setCurrentAnalyticsData({
        exerciseName: ex.name,
        category: ex.category,
        history: exHistory
    });

    const contentHtml = `
        <div class="space-y-4 text-left font-sans min-w-0">
            <div class="flex gap-1.5 p-1 bg-black/30 border border-white/5 rounded-xl select-none max-w-md">
                <button onclick="window.Gym.renderAnalyticsChart('maxWeight')" id="btn-metric-maxWeight" class="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center">
                    Maximálka
                </button>
                <button onclick="window.Gym.renderAnalyticsChart('est1RM')" id="btn-metric-est1RM" class="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center">
                    Odhad 1RM
                </button>
                <button onclick="window.Gym.renderAnalyticsChart('volume')" id="btn-metric-volume" class="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center">
                    Objem
                </button>
            </div>

            <div id="analytics-chart-container" class="relative bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-center min-h-[220px]">
            </div>

            <div class="space-y-2 mt-4">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Historie pokusů</label>
                <div class="max-h-48 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2.5">
                    ${exHistory.length === 0 ? `
                        <p class="text-xs text-gray-500 italic text-center py-6">Zatím žádné dokončené zápisy pro tento cvik.</p>
                    ` : [...exHistory].reverse().map(h => {
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
                    }).join('')}
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
}

export function renderAnalyticsChart(metric) {
    triggerHaptic('light');

    const data = currentAnalyticsData;
    if (!data) return;

    const container = document.getElementById('analytics-chart-container');
    if (!container) return;

    const metrics = ['maxWeight', 'est1RM', 'volume'];
    metrics.forEach(m => {
        const btn = document.getElementById(`btn-metric-${m}`);
        if (btn) {
            if (m === metric) {
                btn.className = "flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center bg-[#faa61a] text-black shadow-sm font-sans";
            } else {
                btn.className = "flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center bg-transparent text-gray-400 hover:text-white font-sans";
            }
        }
    });

    const history = data.history || [];
    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <span class="text-4xl block mb-2">🦉</span>
                <p class="text-xs text-gray-500 font-bold">Žádná data pro vykreslení grafu.</p>
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
    const yRange = yMax - yMin;

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
                    <stop offset="0%" stop-color="#faa61a" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="#faa61a" stop-opacity="0.0" />
                </linearGradient>
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
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
        points.forEach(p => {
            areaPath += ` L ${p.x} ${p.y}`;
        });
        areaPath += ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;

        let linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            linePath += ` L ${points[i].x} ${points[i].y}`;
        }

        svgHtml += `<path d="${areaPath}" fill="url(#chart-area-grad)" />`;
        svgHtml += `<path d="${linePath}" fill="none" stroke="#faa61a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(250,166,26,0.45));" />`;

        points.forEach((p, idx) => {
            const dateObj = new Date(p.date);
            const dateStr = dateObj.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
            
            const shouldShowLabel = idx === 0 || idx === N - 1 || (N > 2 && idx === Math.floor(N / 2));
            if (shouldShowLabel) {
                svgHtml += `
                    <text x="${p.x}" y="${paddingTop + chartHeight + 15}" fill="rgba(255,255,255,0.25)" font-size="8" text-anchor="middle" font-weight="bold">${dateStr}</text>
                `;
            }

            svgHtml += `
                <g class="chart-node group/node" cursor="pointer">
                    <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#faa61a" stroke="#202225" stroke-width="1.5" />
                    <circle cx="${p.x}" cy="${p.y}" r="9" fill="rgba(250,166,26,0.15)" class="opacity-0 hover:opacity-100 transition duration-150" />
                    <title>${dateStr}: ${p.val} ${unit}</title>
                </g>
            `;
        });
    }

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}
