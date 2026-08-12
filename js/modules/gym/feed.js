import { supabase } from '../../core/supabase.js';
import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic, triggerConfetti } from '../../core/utils.js';
import { showNotification } from '../../core/theme.js';

export function renderFeedTab() {
    const logs = state.gymLogs || [];
    
    return `
        <div class="space-y-6">
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
                    const userName = isMe ? state.currentUser?.name : (state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka');
                    const userAvatar = isMe ? '🦝' : '👸';
                    
                    const dateObj = new Date(log.logged_at || log.date_key);
                    const niceDate = dateObj.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                    
                    const durationMin = Math.round((log.duration_seconds || 0) / 60);
                    
                    const cheers = log.cheers || [];
                    const hasCheered = cheers.includes(state.currentUser?.id);
                    
                    return `
                        <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
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
                                        <button onclick="window.Gym.deleteLog('${log.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition" title="Smazat záznam">
                                            <i class="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono select-none">
                                ${log.exercises ? log.exercises.map(e => {
                                    const completedSets = e.sets ? e.sets.filter(s => s.completed) : [];
                                    if (completedSets.length === 0) return '';

                                    return `
                                        <div class="bg-black/20 border border-white/5 rounded-2xl p-3 space-y-1">
                                            <div class="text-xs font-bold text-gray-200 font-sans truncate">${e.exercise_name || e.exercise_id}</div>
                                            <div class="text-[10px] text-[#faa61a]/90 font-bold truncate">
                                                ${completedSets.map(s => `${s.weight}kg x ${s.reps}`).join(' • ')}
                                            </div>
                                        </div>
                                    `;
                                }).join('') : ''}
                            </div>

                            <div class="flex justify-between items-center pt-2 border-t border-white/5 select-none">
                                <div class="flex items-center gap-2">
                                    <button onclick="window.Gym.cheerWorkout('${log.id}')" class="px-3 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 text-xs font-bold ${hasCheered ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}">
                                        <span>💪</span>
                                        <span>Fandit</span>
                                        ${cheers.length > 0 ? `<span class="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono">${cheers.length}</span>` : ''}
                                    </button>
                                </div>

                                <div class="text-[10px] text-gray-500 font-bold font-mono">
                                    +20 XP Získáno
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
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
    if (!confirm('Opravdu chceš smazat tento záznam o tréninku?')) return;

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
