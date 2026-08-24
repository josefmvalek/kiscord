import { supabase } from '@core/supabase.js';
import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal } from '@core/ui.js';
import { getMyName, getPartnerName, getMyEmoji, getPartnerEmoji } from './shared.js';
import { calculate1RM } from './tools.js';
import { renderCoupleGymBannerHtml, isSyncWorkoutDay } from './coupleGym.js';

export function renderFeedTab() {
    const logs = state.gymLogs || [];
    
    return `
        <div class="space-y-6">
            ${renderCoupleGymBannerHtml()}

            <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                <i class="fas fa-stream text-[#3ba55c]"></i> Historie & Společný Feed
            </h2>

            <div class="space-y-4">
                ${logs.length === 0 ? `
                    <div class="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                        <span class="text-5xl block mb-4">🏆</span>
                        <h4 class="text-base font-black text-white uppercase tracking-wider">Zatím žádné odcvičené tréninky</h4>
                        <p class="text-xs text-white/40 font-semibold mt-1">Dokončete svůj první trénink a oslavte ho společně!</p>
                    </div>
                ` : logs.map(log => {
                    const isMe = log.user_id === state.currentUser?.id;
                    const userName = isMe ? getMyName() : getPartnerName();
                    const userAvatar = isMe ? getMyEmoji() : getPartnerEmoji();
                    const isSync = isSyncWorkoutDay(log.date_key);
                    
                    const dateObj = new Date(log.logged_at || log.date_key);
                    const niceDate = dateObj.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                    
                    const durationMin = Math.round((log.duration_seconds || 0) / 60);
                    const totalSets = (log.exercises || []).reduce((sum, e) => sum + (e.sets || []).filter(s => s.completed).length, 0);
                    const totalVolume = (log.exercises || []).reduce((sum, e) =>
                        sum + (e.sets || []).filter(s => s.completed).reduce((sv, s) => sv + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
                    
                    const cheers = log.cheers || [];
                    const hasCheered = cheers.includes(state.currentUser?.id);
                    
                    return `
                        <div class="glass-card bg-white/[0.02] border ${isSync ? 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-white/5'} rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4 group cursor-pointer hover:border-white/10 transition" onclick="window.Gym.openLogDetailModal('${log.id}')">
                            ${isSync ? `
                                <div class="absolute top-0 right-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[8px] font-black uppercase px-2.5 py-0.5 rounded-b-lg tracking-widest flex items-center gap-1 shadow-sm">
                                    <span>⚡</span>
                                    <span>Sync Day</span>
                                </div>
                            ` : ''}

                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl border border-white/10 shadow-inner">
                                        ${userAvatar}
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs font-black text-white leading-tight">${userName}</span>
                                            <span class="text-[9px] font-mono text-gray-500 uppercase">${niceDate}</span>
                                        </div>
                                        <h3 class="text-sm font-black text-[#faa61a] uppercase tracking-tight leading-snug mt-0.5">${log.name}</h3>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2">
                                    <div class="bg-black/20 border border-white/5 px-3 py-1 rounded-xl text-right font-mono select-none">
                                        <span class="text-[9px] font-bold text-gray-500 block leading-none">Čas</span>
                                        <span class="text-xs font-bold text-gray-200">${durationMin} min</span>
                                    </div>

                                    ${isMe ? `
                                        <button onclick="event.stopPropagation(); window.Gym.deleteLog('${log.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition" title="Smazat záznam">
                                            <i class="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono select-none">
                                ${(log.exercises || []).map(e => {
                                    const completedSets = e.sets ? e.sets.filter(s => s.completed) : [];
                                    if (completedSets.length === 0) return '';

                                    return `
                                        <div class="bg-black/20 border border-white/5 rounded-2xl p-3 space-y-1">
                                            <div class="text-xs font-bold text-gray-200 font-sans truncate">${e.exercise_name || e.exercise_id}</div>
                                            <div class="text-[10px] text-[#faa61a]/90 font-bold truncate">
                                                ${completedSets.map(s => `${s.weight}kg × ${s.reps}${s.rir !== undefined && s.rir !== null ? ` <span class="text-purple-300 font-mono text-[8px]">(RIR ${s.rir})</span>` : ''}`).join(' • ')}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>

                            ${log.photo_url ? `
                                <div class="mt-2.5 rounded-2xl overflow-hidden border border-white/10 max-h-64 cursor-pointer shadow-lg bg-black/40 relative group" onclick="event.stopPropagation(); window.Gym.openPhotoLightbox('${log.photo_url}')" title="Rozkliknout fotku na celou obrazovku">
                                    <img src="${log.photo_url}" alt="Gym Selfie" class="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition duration-300" />
                                    <div class="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1 border border-white/10">
                                        <span>📸</span> <span>Zvětšit</span>
                                    </div>
                                </div>
                            ` : ''}

                            <div class="flex justify-between items-center pt-2 border-t border-white/5 select-none flex-wrap gap-2">
                                <div class="flex items-center gap-2">
                                    <button onclick="event.stopPropagation(); window.Gym.cheerWorkout('${log.id}')" class="px-3 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 text-xs font-bold ${hasCheered ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}">
                                        <span>💪</span>
                                        <span>Fandit</span>
                                        ${cheers.length > 0 ? `<span class="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono">${cheers.length}</span>` : ''}
                                    </button>
                                    <button onclick="event.stopPropagation(); window.Gym.openShareCardModal('${log.id}')" class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 border border-white/5 transition flex items-center gap-1.5 text-xs font-bold" title="Sdílet tréninkovou kartu">
                                        <i class="fas fa-share-alt text-[#faa61a]"></i>
                                        <span class="text-[10px] uppercase font-black">Sdílet</span>
                                    </button>
                                    <button onclick="event.stopPropagation(); window.Gym.viewInCalendar('${log.date_key}')" class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition flex items-center gap-1.5 text-xs font-bold" title="Zobrazit v kalendáři">
                                        <i class="far fa-calendar-alt text-[#faa61a]"></i>
                                        <span class="text-[10px] uppercase font-black">Kalendář</span>
                                    </button>
                                </div>

                                <div class="flex items-center gap-2.5 text-[10px] text-gray-500 font-mono">
                                    ${log.checklist ? `
                                        <div class="flex items-center gap-0.5 text-xs" title="Splněný checklist">
                                            ${log.checklist.creatine ? '<span>💊</span>' : ''}
                                            ${log.checklist.preworkout ? '<span>⚡</span>' : ''}
                                            ${log.checklist.water ? '<span>💧</span>' : ''}
                                            ${log.checklist.protein ? '<span>🥤</span>' : ''}
                                        </div>
                                    ` : ''}
                                    <span>${totalSets} sérií</span>
                                    ${totalVolume > 0 ? `<span class="text-amber-400/70">${Math.round(totalVolume / 100) / 10} t</span>` : ''}
                                    <span class="text-emerald-400/70">+20 XP</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

export function openLogDetailModal(logId) {
    triggerHaptic('light');
    const log = (state.gymLogs || []).find(l => l.id === logId);
    if (!log) return;

    const isMe = log.user_id === state.currentUser?.id;
    const userName = isMe ? getMyName() : getPartnerName();
    const userEmoji = isMe ? getMyEmoji() : getPartnerEmoji();
    const dateStr = new Date(log.logged_at || log.date_key).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const durationMin = Math.round((log.duration_seconds || 0) / 60);

    // Stats
    const totalSets = (log.exercises || []).reduce((sum, e) => sum + (e.sets || []).filter(s => s.completed).length, 0);
    const totalVolume = (log.exercises || []).reduce((sum, e) =>
        sum + (e.sets || []).filter(s => s.completed).reduce((sv, s) => sv + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
    const maxWeight = (log.exercises || []).reduce((max, e) =>
        Math.max(max, ...(e.sets || []).filter(s => s.completed).map(s => parseFloat(s.weight) || 0)), 0);

    // Find same-name previous log for volume comparison
    const myPrevLogs = (state.gymLogs || []).filter(l => l.name === log.name && l.id !== log.id && l.user_id === log.user_id);
    const prevVolume = myPrevLogs.length > 0
        ? myPrevLogs[0].exercises?.reduce((sum, e) =>
            sum + (e.sets || []).filter(s => s.completed).reduce((sv, s) => sv + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0) || 0
        : 0;
    const volumeDiff = prevVolume > 0 ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100) : null;

    const contentHtml = `
        <div class="space-y-5 font-sans">
            <!-- Header -->
            <div class="flex items-center gap-3 pb-4 border-b border-white/5">
                <div class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/10">${userEmoji}</div>
                <div>
                    <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">${userName} • ${dateStr}</div>
                    <div class="text-sm font-black text-[#faa61a] uppercase tracking-tight mt-0.5">${log.name}</div>
                </div>
            </div>

            <!-- Stats pills -->
            <div class="grid grid-cols-4 gap-2">
                <div class="bg-black/30 border border-white/5 rounded-2xl p-3 text-center">
                    <div class="text-[9px] font-black text-gray-400 uppercase tracking-wider">Čas</div>
                    <div class="text-sm font-black text-white font-mono mt-0.5">${durationMin}<span class="text-xs text-gray-500"> min</span></div>
                </div>
                <div class="bg-black/30 border border-white/5 rounded-2xl p-3 text-center">
                    <div class="text-[9px] font-black text-gray-400 uppercase tracking-wider">Série</div>
                    <div class="text-sm font-black text-white font-mono mt-0.5">${totalSets}</div>
                </div>
                <div class="bg-black/30 border border-white/5 rounded-2xl p-3 text-center">
                    <div class="text-[9px] font-black text-gray-400 uppercase tracking-wider">Objem</div>
                    <div class="text-sm font-black text-amber-400 font-mono mt-0.5">${Math.round(totalVolume / 100) / 10}<span class="text-xs text-gray-500"> t</span></div>
                </div>
                <div class="bg-black/30 border border-white/5 rounded-2xl p-3 text-center">
                    <div class="text-[9px] font-black text-gray-400 uppercase tracking-wider">Max</div>
                    <div class="text-sm font-black text-white font-mono mt-0.5">${maxWeight}<span class="text-xs text-gray-500"> kg</span></div>
                </div>
            </div>

            ${log.photo_url ? `
                <div class="rounded-2xl overflow-hidden border border-white/10 max-h-72 cursor-pointer shadow-lg bg-black/40 relative group" onclick="window.Gym.openPhotoLightbox('${log.photo_url}')" title="Rozkliknout fotku">
                    <img src="${log.photo_url}" alt="Gym Selfie" class="w-full h-56 sm:h-64 object-cover group-hover:scale-105 transition duration-300" />
                </div>
            ` : ''}

            ${volumeDiff !== null ? `
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl ${volumeDiff >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'} text-xs font-bold">
                    <span>${volumeDiff >= 0 ? '▲' : '▼'} ${volumeDiff >= 0 ? '+' : ''}${volumeDiff}% objem vs. předchozí ${log.name}</span>
                </div>
            ` : ''}

            <!-- Exercise breakdown -->
            <div class="space-y-2">
                <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cviky & Série</div>
                ${(log.exercises || []).map(e => {
                    const completedSets = (e.sets || []).filter(s => s.completed);
                    if (completedSets.length === 0) return '';
                    const exVolume = completedSets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
                    const exMax = completedSets.reduce((m, s) => Math.max(m, parseFloat(s.weight) || 0), 0);
                    const est1RM = completedSets.reduce((m, s) => Math.max(m, calculate1RM(s.weight, s.reps)), 0);
                    return `
                        <div class="bg-black/20 border border-white/5 rounded-2xl p-3.5">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <span class="text-xs font-bold text-white">${e.exercise_name || e.exercise_id}</span>
                                <div class="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                    <span>Max: <strong class="text-amber-400">${exMax}kg</strong></span>
                                    ${est1RM > 0 ? `<span>1RM: ~<strong class="text-purple-400">${est1RM}kg</strong></span>` : ''}
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                ${completedSets.map((s, idx) => `
                                    <span class="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-mono font-bold text-gray-200 ${s.type === 'W' ? 'text-amber-400/70' : ''} ${s.type === 'D' ? 'text-fuchsia-400/70' : ''} ${s.type === 'F' ? 'text-red-400/70' : ''}">
                                        ${idx + 1}. ${s.weight}kg×${s.reps}
                                        ${s.type !== 'N' ? `<span class="text-[8px] opacity-70">${s.type}</span>` : ''}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-between items-center w-full gap-2 flex-wrap">
            <div class="flex items-center gap-2">
                <button onclick="window.Gym.openShareCardModal('${log.id}')" class="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1.5">
                    <i class="fas fa-share-alt"></i> Sdílet Kartu
                </button>
                <button onclick="window.Gym.viewInCalendar('${log.date_key}'); document.getElementById('log-detail-modal')?.remove()" class="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-[10px] uppercase tracking-wider transition flex items-center gap-1.5">
                    <i class="far fa-calendar-alt text-[#faa61a]"></i> Kalendář
                </button>
            </div>
            <button onclick="document.getElementById('log-detail-modal')?.remove()" class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zavřít
            </button>
        </div>
    `;

    document.getElementById('log-detail-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'log-detail-modal',
        title: log.name,
        subtitle: `Detail tréninku • ${dateStr} 💪`,
        size: 'lg',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('log-detail-modal')?.remove()"
    }));

    const el = document.getElementById('log-detail-modal');
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    }
}



export async function cheerWorkout(logId, renderGymFn) {
    triggerHaptic('success');

    const log = state.gymLogs.find(l => l.id === logId);
    if (!log) return;

    const myId = state.currentUser?.id;
    let cheers = log.cheers || [];

    if (cheers.includes(myId)) {
        cheers = cheers.filter(id => id !== myId);
    } else {
        cheers.push(myId);
        triggerConfetti();
    }

    try {
        const { error } = await supabase
            .from('gym_logs')
            .update({ cheers })
            .eq('id', logId);

        if (error) throw error;

        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to cheer workout:", e);
    }
}

export async function deleteLog(logId, renderGymFn) {
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento záznam o tréninku?');
    if (!confirmed) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase
            .from('gym_logs')
            .delete()
            .eq('id', logId);

        if (error) throw error;

        showNotification('Záznam tréninku smazán.', 'info');
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error('[Gym] Failed to delete log:', e);
        showNotification('Nepodařilo se smazat záznam.', 'danger');
    }
}
