/**
 * VUT FIT Deadlines & Projects Tracker
 */

import { supabase } from '@core/supabase.js';
import { state, awardLoveCoinsToCurrentUser } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { getDeadlinesData, setDeadlinesData, getDeadlineTypeBadge } from './store.js';

export function renderDeadlinesView(upcomingDeadlines) {
    const todayStr = new Date().toISOString().split('T')[0];
    const deadlinesData = getDeadlinesData();
    const completed = deadlinesData.filter(d => d.is_completed).sort((a, b) => b.deadline_date.localeCompare(a.deadline_date));

    return `
        <div class="space-y-6">
            <!-- Nadcházející deadliny -->
            <div class="space-y-3">
                <div class="flex justify-between items-center">
                    <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-hourglass-half text-amber-400"></i>
                        <span>Nadcházející deadliny a projekty (${upcomingDeadlines.length})</span>
                    </h3>
                </div>

                <div class="space-y-3">
                    ${upcomingDeadlines.length === 0 ? `
                        <div class="p-8 bg-[#202225]/50 border border-dashed border-gray-800 rounded-3xl text-center text-xs text-gray-500 italic">
                            Žádné hořící deadliny! Užijte si volno nebo čas na kolejích. 🎉
                        </div>
                    ` : upcomingDeadlines.map(item => {
                        const diffDays = Math.ceil((new Date(item.deadline_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                        const isUrgent = diffDays >= 0 && diffDays <= 2;
                        const dateFormatted = new Date(item.deadline_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
                        const typeStyle = getDeadlineTypeBadge(item.type);

                        return `
                            <div class="bg-[#202225] border ${isUrgent ? 'border-rose-500/40 bg-rose-500/[0.03] shadow-rose-500/10' : 'border-gray-800'} rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group shadow-md">
                                <div class="flex items-center gap-3.5 min-w-0">
                                    <button onclick="window.StudyPlanner.toggleDeadlineComplete('${item.id}', true)" 
                                            class="w-8 h-8 rounded-xl border border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/20 text-transparent hover:text-emerald-400 flex items-center justify-center transition flex-shrink-0"
                                            title="Označit jako hotové">
                                        <i class="fas fa-check text-xs"></i>
                                    </button>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${typeStyle}">${item.type || 'Projekt'}</span>
                                            ${item.subject_code ? `<span class="text-xs font-mono font-black text-[#5865F2]">${item.subject_code}</span>` : ''}
                                            <span class="text-xs font-black text-white truncate">${item.title}</span>
                                        </div>
                                        ${item.description ? `<p class="text-[10.5px] text-gray-400 mt-0.5 truncate">${item.description}</p>` : ''}
                                    </div>
                                </div>

                                <div class="flex items-center gap-4 flex-shrink-0 select-none">
                                    <div class="text-right font-mono">
                                        <div class="text-xs font-black ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-gray-200'}">
                                            ${dateFormatted} ${item.deadline_time ? `<span class="text-[10px] text-gray-400">(${item.deadline_time})</span>` : ''}
                                        </div>
                                        <div class="text-[9px] font-bold ${isUrgent ? 'text-rose-400' : 'text-gray-500'} mt-0.5">
                                            ${diffDays < 0 ? 'Po termínu!' : (diffDays === 0 ? 'Dnes o půlnoci! 🔥' : (diffDays === 1 ? 'Zítra! ⚠️' : `za ${diffDays} dní`))}
                                        </div>
                                    </div>
                                    <button onclick="window.StudyPlanner.deleteDeadlineItem('${item.id}')" 
                                            class="text-gray-400 hover:text-red-400 active:text-red-500 p-1.5 rounded-lg transition" 
                                            title="Smazat deadline">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Hotové úkoly (Historie) -->
            ${completed.length > 0 ? `
                <div class="space-y-3 pt-4 border-t border-gray-800">
                    <h3 class="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-check-double text-emerald-500"></i>
                        <span>Odevzdané a splněné úkoly (${completed.length})</span>
                    </h3>

                    <div class="space-y-2 opacity-75 hover:opacity-100 transition-opacity">
                        ${completed.map(item => `
                            <div class="bg-[#18191c] border border-gray-800/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                                <div class="flex items-center gap-2.5 truncate">
                                    <button onclick="window.StudyPlanner.toggleDeadlineComplete('${item.id}', false)" class="text-emerald-400 text-xs p-0.5">
                                        <i class="fas fa-check-circle"></i>
                                    </button>
                                    <span class="line-through text-gray-400 truncate">${item.subject_code ? item.subject_code + ' — ' : ''}${item.title}</span>
                                </div>
                                <button onclick="window.StudyPlanner.deleteDeadlineItem('${item.id}')" class="text-gray-400 hover:text-red-400 active:text-red-500 p-1.5 transition rounded-lg" title="Smazat deadline">
                                    <i class="fas fa-trash-alt text-xs"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

export function openAddDeadlineModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Kód předmětu',
                    id: 'dl-code',
                    placeholder: 'např. IZP, IUS...'
                })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Typ deadlinu</label>
                    <select id="dl-type" class="w-full bg-[#18191c] text-white text-xs p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 transition-all">
                        <option value="Projekt">Programovací projekt 💻</option>
                        <option value="Půlsemestrálka">Půlsemestrálka 📊</option>
                        <option value="Zkouška">Termín zkoušky 🏆</option>
                        <option value="Laborka">Příprava do laborky 🔬</option>
                        <option value="Úkol">Domácí úkol 📝</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Název úkolu / zadání',
                id: 'dl-title',
                placeholder: 'např. Projekt 1 - Práce s textovými daty'
            })}

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Datum odevzdání',
                    id: 'dl-date',
                    type: 'date',
                    value: new Date().toISOString().split('T')[0]
                })}
                ${renderInputGroup({
                    label: 'Čas odevzdání',
                    id: 'dl-time',
                    type: 'time',
                    value: '23:59'
                })}
            </div>

            ${renderInputGroup({
                label: 'Popis / poznámka (WIS, Moodle link)',
                id: 'dl-desc',
                placeholder: 'např. Odevzdání přes WIS, limit 15 bodů...'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2.5 w-full">
            <button onclick="document.getElementById('add-deadline-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.StudyPlanner.saveDeadlineItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95">
                Uložit deadline
            </button>
        </div>
    `;

    document.getElementById('add-deadline-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-deadline-modal',
        title: 'Přidat Studijní Deadline',
        subtitle: 'VUT FIT Plánovač 📝',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-deadline-modal').remove()"
    }));

    const el = document.getElementById('add-deadline-modal');
    el?.classList.remove('hidden');
    el?.classList.add('flex');
}

export async function saveDeadlineItem() {
    triggerHaptic('medium');

    const code = document.getElementById('dl-code')?.value.trim();
    const type = document.getElementById('dl-type')?.value;
    const title = document.getElementById('dl-title')?.value.trim();
    const date = document.getElementById('dl-date')?.value;
    const time = document.getElementById('dl-time')?.value || '23:59';
    const desc = document.getElementById('dl-desc')?.value.trim();

    if (!title) {
        showNotification('Napište název zadání!', 'warning');
        return;
    }

    try {
        const { error } = await supabase.from('school_deadlines').insert({
            user_id: state.currentUser?.id,
            subject_code: code.toUpperCase(),
            title,
            type,
            deadline_date: date,
            deadline_time: time,
            description: desc,
            is_completed: false
        });

        if (error) throw error;

        triggerConfetti();
        showNotification('Deadline uložen! 📝', 'success');
        document.getElementById('add-deadline-modal')?.remove();
        window.StudyPlanner?.render?.();
    } catch (e) {
        console.error("[StudyPlanner] Save error:", e);
        showNotification('Nepodařilo se uložit: ' + e.message, 'danger');
    }
}

export function toggleDeadlineComplete(id, completed) {
    triggerHaptic(completed ? 'success' : 'light');
    if (completed) {
        triggerConfetti();
        awardLoveCoinsToCurrentUser(15, 'Splněný studijní deadline na FITu! 🎯').catch(() => {});
    }

    const deadlinesData = getDeadlinesData();
    const item = deadlinesData.find(d => d.id === id);
    if (item) item.is_completed = completed;
    window.StudyPlanner?.render?.();

    // Background cloud persist
    supabase.from('school_deadlines').update({ is_completed: completed }).eq('id', id).catch(e => {
        console.error("[StudyPlanner] Toggle error in background:", e);
    });
}

export function deleteDeadlineItem(id) {
    triggerHaptic('light');
    const deadlinesData = getDeadlinesData();
    setDeadlinesData(deadlinesData.filter(d => d.id !== id));
    showNotification('Deadline smazán.', 'info');
    window.StudyPlanner?.render?.();

    // Background cloud persist
    supabase.from('school_deadlines').delete().eq('id', id).catch(e => {
        console.error("[StudyPlanner] Delete error in background:", e);
    });
}
