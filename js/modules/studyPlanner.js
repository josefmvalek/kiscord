import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';

let deadlinesData = [];

export async function renderStudyPlanner() {
    if (state.currentChannel !== 'study-planner') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await loadDeadlines();

    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingDeadlines = deadlinesData.filter(d => !d.is_completed).sort((a, b) => a.deadline_date.localeCompare(b.deadline_date));
    const completedDeadlines = deadlinesData.filter(d => d.is_completed).sort((a, b) => b.deadline_date.localeCompare(a.deadline_date));

    const totalCount = deadlinesData.length;
    const completedCount = completedDeadlines.length;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <!-- Header bar -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-[#3ba55c]/10 flex items-center justify-center text-xl text-[#3ba55c] border border-[#3ba55c]/20">
                        📝
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight leading-none">Studijní Plánovač FIT</h1>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Zkoušky, projekty & deadliny VUT FIT 🎓</p>
                    </div>
                </div>

                <button onclick="window.openAddDeadlineModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center">
                    <i class="fas fa-plus text-xs"></i> Nový deadline
                </button>
            </div>

            <!-- Main scroll view -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-24">
                <div class="max-w-4xl mx-auto space-y-6">

                    <!-- Progress Banner -->
                    <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-3 select-none">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-0.5">Semestrální Progress</span>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">Splněné úkoly a zkoušky</h3>
                            </div>
                            <span class="text-base font-black text-[#3ba55c] font-mono">${completedCount} / ${totalCount} (${progressPct}%)</span>
                        </div>

                        <div class="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" style="width: ${progressPct}%"></div>
                        </div>
                    </div>

                    <!-- Upcoming Deadlines -->
                    <div class="space-y-3">
                        <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <i class="fas fa-hourglass-half text-amber-400"></i>
                            <span>Nadcházející deadliny (${upcomingDeadlines.length})</span>
                        </h2>

                        <div class="space-y-3">
                            ${upcomingDeadlines.length === 0 ? `
                                <div class="p-8 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl text-center text-xs text-gray-500 italic">
                                    Žádné nadcházející deadliny! Užijte si volno. 🎉
                                </div>
                            ` : upcomingDeadlines.map(item => {
                                const diffDays = Math.ceil((new Date(item.deadline_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                                const isUrgent = diffDays <= 3;
                                const dateFormatted = new Date(item.deadline_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

                                return `
                                    <div class="glass-card bg-white/[0.02] border ${isUrgent ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-white/5'} rounded-2xl p-4 flex items-center justify-between gap-4 transition group">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <button onclick="window.toggleDeadlineComplete('${item.id}', true)" class="w-7 h-7 rounded-xl border border-white/10 hover:border-[#3ba55c] hover:bg-[#3ba55c]/20 text-transparent hover:text-[#3ba55c] flex items-center justify-center transition">
                                                <i class="fas fa-check text-xs"></i>
                                            </button>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${getDeadlineTypeBadge(item.type)}">${item.type}</span>
                                                    <span class="text-xs font-bold text-white truncate">${item.subject_code ? item.subject_code + ' — ' : ''}${item.title}</span>
                                                </div>
                                                ${item.description ? `<p class="text-[10px] text-gray-400 font-medium mt-1 leading-snug truncate">${item.description}</p>` : ''}
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3 flex-shrink-0 select-none">
                                            <div class="text-right font-mono">
                                                <div class="text-xs font-black ${isUrgent ? 'text-amber-400 animate-pulse' : 'text-gray-300'}">${dateFormatted}</div>
                                                <div class="text-[9px] text-gray-500 font-bold mt-0.5">${diffDays === 0 ? 'Dnes!' : (diffDays === 1 ? 'Zítra!' : `za ${diffDays} dní`)}</div>
                                            </div>
                                            <button onclick="window.deleteDeadlineItem('${item.id}')" class="text-white/20 hover:text-red-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition">
                                                <i class="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Completed Deadlines -->
                    ${completedDeadlines.length > 0 ? `
                        <div class="space-y-3 pt-4">
                            <h2 class="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 pl-1">
                                <i class="fas fa-check-circle text-emerald-400"></i>
                                <span>Splněno (${completedDeadlines.length})</span>
                            </h2>

                            <div class="space-y-2 opacity-60">
                                ${completedDeadlines.map(item => `
                                    <div class="bg-black/20 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-4">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <button onclick="window.toggleDeadlineComplete('${item.id}', false)" class="w-6 h-6 rounded-lg bg-[#3ba55c] text-white flex items-center justify-center">
                                                <i class="fas fa-check text-[10px]"></i>
                                            </button>
                                            <span class="text-xs font-bold text-gray-400 line-through truncate">${item.subject_code ? item.subject_code + ' — ' : ''}${item.title}</span>
                                        </div>
                                        <button onclick="window.deleteDeadlineItem('${item.id}')" class="text-white/20 hover:text-red-400 p-1">
                                            <i class="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                </div>
            </div>
        </div>
    `;

    attachWindowStudyPlanner();
}

function getDeadlineTypeBadge(type) {
    if (type === 'Zkouška') return 'bg-red-500/20 text-red-300 border border-red-500/30';
    if (type === 'Projekt') return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    if (type === 'Zápočet') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
}

async function loadDeadlines() {
    try {
        const { data, error } = await supabase.from('school_deadlines').select('*').order('deadline_date', { ascending: true });
        if (!error && data) {
            deadlinesData = data;
        } else {
            deadlinesData = [];
        }
    } catch (e) {
        console.error("[StudyPlanner] Failed to load deadlines:", e);
        deadlinesData = [];
    }
}

export function openAddDeadlineModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Zkratka předmětu',
                    id: 'dl-code',
                    placeholder: 'např. IAL, IUS...'
                })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Typ povinnosti</label>
                    <select id="dl-type" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                        <option value="Projekt">Projekt / Úkol 💻</option>
                        <option value="Zkouška">Zkouška 📝</option>
                        <option value="Zápočet">Zápočet 🎓</option>
                        <option value="Prezentace">Prezentace 🎤</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Název zadání / téma',
                id: 'dl-title',
                placeholder: 'např. Odevzdání 1. projektu, Písemka...'
            })}

            ${renderInputGroup({
                label: 'Datum deadline / zkoušky',
                id: 'dl-date',
                type: 'date',
                value: new Date().toISOString().split('T')[0]
            })}

            ${renderInputGroup({
                label: 'Popis / poznámka',
                id: 'dl-desc',
                placeholder: 'Podrobnosti o odevzdání...'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-deadline-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.saveDeadlineItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
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

    document.getElementById('add-deadline-modal').classList.remove('hidden');
    document.getElementById('add-deadline-modal').classList.add('flex');
}

export async function saveDeadlineItem() {
    triggerHaptic('medium');

    const code = document.getElementById('dl-code').value.trim();
    const type = document.getElementById('dl-type').value;
    const title = document.getElementById('dl-title').value.trim();
    const date = document.getElementById('dl-date').value;
    const desc = document.getElementById('dl-desc').value.trim();

    if (!title) {
        showNotification('Napište název zadání!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('school_deadlines')
            .insert({
                user_id: state.currentUser?.id,
                subject_code: code.toUpperCase(),
                title,
                type,
                deadline_date: date,
                description: desc,
                is_completed: false
            });

        if (error) throw error;

        triggerConfetti();
        showNotification('Deadline uložen! 📝', 'success');
        document.getElementById('add-deadline-modal')?.remove();
        renderStudyPlanner();
    } catch (e) {
        console.error("[StudyPlanner] Save error:", e);
        showNotification('Nepodařilo se uložit: ' + e.message, 'danger');
    }
}

export async function toggleDeadlineComplete(id, completed) {
    triggerHaptic(completed ? 'success' : 'light');
    if (completed) triggerConfetti();

    try {
        const { error } = await supabase
            .from('school_deadlines')
            .update({ is_completed: completed })
            .eq('id', id);

        if (error) throw error;

        renderStudyPlanner();
    } catch (e) {
        console.error("[StudyPlanner] Toggle error:", e);
    }
}

export async function deleteDeadlineItem(id) {
    if (!confirm('Opravdu smazat tento deadline?')) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase.from('school_deadlines').delete().eq('id', id);
        if (error) throw error;

        showNotification('Deadline smazán.', 'info');
        renderStudyPlanner();
    } catch (e) {
        console.error("[StudyPlanner] Delete error:", e);
    }
}

function attachWindowStudyPlanner() {
    window.openAddDeadlineModal = openAddDeadlineModal;
    window.saveDeadlineItem = saveDeadlineItem;
    window.toggleDeadlineComplete = toggleDeadlineComplete;
    window.deleteDeadlineItem = deleteDeadlineItem;
}
