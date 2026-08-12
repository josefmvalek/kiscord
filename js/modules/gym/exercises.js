import { supabase } from '../../core/supabase.js';
import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { showNotification } from '../../core/theme.js';
import { renderModal, renderInputGroup } from '../../core/ui.js';

export function renderExercisesTab() {
    const exercises = state.gymExercises || [];
    const categories = ['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho', 'Ostatní'];

    return `
        <div class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                    <i class="fas fa-dumbbell text-[#7289da]"></i> Katalog cviků
                </h2>
                <button onclick="window.Gym.openCreateExerciseModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center">
                    <i class="fas fa-plus text-xs"></i> Nový cvik
                </button>
            </div>

            <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterTabExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition shadow-md">

            <div class="space-y-6" id="exercises-tab-list">
                ${categories.map(cat => {
                    const catExercises = exercises.filter(e => e.category === cat);
                    if (catExercises.length === 0) return '';

                    const badgeColors = {
                        'Hrudník': 'border-l-blue-400',
                        'Záda': 'border-l-emerald-400',
                        'Ramena': 'border-l-amber-400',
                        'Nohy': 'border-l-indigo-400',
                        'Ruce': 'border-l-pink-400',
                        'Břicho': 'border-l-red-400',
                        'Ostatní': 'border-l-gray-400'
                    };
                    const borderClass = badgeColors[cat] || 'border-l-gray-400';

                    return `
                        <div class="space-y-3 exercise-cat-section" data-cat="${cat.toLowerCase()}">
                            <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 border-l-4 ${borderClass} flex items-center gap-2 leading-none">
                                <span>${cat}</span>
                                <span class="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono">${catExercises.length}</span>
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                ${catExercises.map(ex => `
                                    <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 transition duration-150 exercise-tab-item" data-name="${ex.name.toLowerCase()}">
                                        <div class="min-w-0">
                                            <h4 class="text-xs font-bold text-white truncate leading-snug">${ex.name}</h4>
                                            ${ex.is_default ? `
                                                <span class="text-[8px] font-black uppercase text-white/20 tracking-wider">Výchozí</span>
                                            ` : `
                                                <span class="text-[8px] font-black uppercase text-[#7289da]/80 tracking-wider">Vlastní</span>
                                            `}
                                        </div>
                                        
                                        <div class="flex gap-1 flex-shrink-0 select-none">
                                            <button onclick="window.Gym.openExerciseAnalyticsModal('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition" title="Zobrazit graf pokroku">
                                                <i class="fas fa-chart-line text-[10px]"></i>
                                            </button>
                                            <button onclick="window.Gym.openEditExerciseModal('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-[#faa61a] hover:bg-[#faa61a]/10 transition" title="Upravit název/partii">
                                                <i class="fas fa-edit text-[10px]"></i>
                                            </button>
                                            <button onclick="window.Gym.deleteExercise('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition" title="Smazat cvik">
                                                <i class="fas fa-trash-alt text-[10px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

export function filterTabExercises(query) {
    const q = query.toLowerCase().trim();
    
    const items = document.querySelectorAll('.exercise-tab-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name') || '';
        if (name.includes(q)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    const sections = document.querySelectorAll('.exercise-cat-section');
    sections.forEach(sec => {
        const cat = sec.getAttribute('data-cat') || '';
        const visibleItems = sec.querySelectorAll('.exercise-tab-item[style*="display: flex"], .exercise-tab-item:not([style*="display: none"])');
        
        if (cat.includes(q) || visibleItems.length > 0) {
            sec.style.display = 'block';
            if (cat.includes(q) && q.length > 0) {
                sec.querySelectorAll('.exercise-tab-item').forEach(i => i.style.display = 'flex');
            }
        } else {
            sec.style.display = 'none';
        }
    });
}

export function filterModalExercises(query) {
    const q = query.toLowerCase().trim();
    const items = document.querySelectorAll('.exercise-select-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name') || '';
        const category = item.getAttribute('data-category') || '';
        if (name.includes(q) || category.includes(q)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

export function openCreateExerciseModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název nového cviku',
                id: 'new-ex-name',
                placeholder: 'např. Dřep s činkou vzadu, Peck Deck...'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie / Partie</label>
                <select id="new-ex-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <option value="Hrudník">Hrudník</option>
                    <option value="Záda">Záda</option>
                    <option value="Ramena">Ramena</option>
                    <option value="Nohy">Nohy</option>
                    <option value="Ruce">Ruce</option>
                    <option value="Břicho">Břicho</option>
                    <option value="Ostatní">Ostatní</option>
                </select>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('create-exercise-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveExercise()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Vytvořit Cvik
            </button>
        </div>
    `;

    document.getElementById('create-exercise-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'create-exercise-modal',
        title: 'Vytvořit Vlastní Cvik',
        subtitle: 'Rozšiř svůj katalog cviků 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('create-exercise-modal').remove()"
    }));

    document.getElementById('create-exercise-modal').classList.remove('hidden');
    document.getElementById('create-exercise-modal').classList.add('flex');
}

export async function saveExercise(renderGymFn) {
    triggerHaptic('medium');

    const name = document.getElementById('new-ex-name').value.trim();
    const category = document.getElementById('new-ex-cat').value;

    if (!name) {
        showNotification('Prosím zadej název cviku!', 'warning');
        return;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    try {
        const { error } = await supabase
            .from('gym_exercises')
            .insert({
                id,
                name,
                category,
                is_default: false,
                created_by: state.currentUser?.id
            });

        if (error) throw error;

        showNotification('Nový cvik byl úspěšně přidán! 🏋️‍♂️', 'success');
        document.getElementById('create-exercise-modal')?.remove();
        
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to save exercise:", e);
        showNotification('Nepodařilo se uložit cvik. Zkontroluj unikátnost názvu.', 'danger');
    }
}

export function openEditExerciseModal(exerciseId) {
    triggerHaptic('light');

    const ex = state.gymExercises.find(e => e.id === exerciseId);
    if (!ex) return;

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název cviku',
                id: 'edit-ex-name',
                placeholder: 'např. Dřep s činkou vzadu...',
                value: ex.name
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie / Partie</label>
                <select id="edit-ex-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    ${['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho', 'Ostatní'].map(cat => `
                        <option value="${cat}" ${ex.category === cat ? 'selected' : ''}>${cat}</option>
                    `).join('')}
                </select>
            </div>
            
            <input type="hidden" id="edit-ex-id" value="${exerciseId}">
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('edit-exercise-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveEditedExercise()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Změny
            </button>
        </div>
    `;

    document.getElementById('edit-exercise-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-exercise-modal',
        title: 'Upravit Cvik',
        subtitle: 'Uprav detaily cviku z katalogu 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('edit-exercise-modal').remove()"
    }));

    document.getElementById('edit-exercise-modal').classList.remove('hidden');
    document.getElementById('edit-exercise-modal').classList.add('flex');
}

export async function saveEditedExercise(renderGymFn) {
    triggerHaptic('medium');

    const id = document.getElementById('edit-ex-id').value;
    const name = document.getElementById('edit-ex-name').value.trim();
    const category = document.getElementById('edit-ex-cat').value;

    if (!name) {
        showNotification('Název cviku nesmí být prázdný!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('gym_exercises')
            .update({
                name,
                category
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Cvik byl úspěšně upraven! 🏋️‍♂️', 'success');
        document.getElementById('edit-exercise-modal')?.remove();
        
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to edit exercise:", e);
        showNotification('Nepodařilo se uložit změny cviku.', 'danger');
    }
}

export async function deleteExercise(exerciseId, renderGymFn) {
    triggerHaptic('medium');

    const ex = state.gymExercises.find(e => e.id === exerciseId);
    if (!ex) return;

    const templatesWithEx = (state.gymTemplates || []).filter(t => 
        t.exercises && t.exercises.some(te => te.exercise_id === exerciseId)
    );

    let confirmMsg = `Opravdu chceš smazat cvik "${ex.name}" z katalogu?`;
    if (ex.is_default) {
        confirmMsg = `⚠️ Pozor: "${ex.name}" je výchozí společný cvik. Opravdu ho chceš smazat?`;
    }

    if (templatesWithEx.length > 0) {
        const tNames = templatesWithEx.map(t => `"${t.name}"`).join(', ');
        confirmMsg = `⚠️ Pozor! Cvik "${ex.name}" je aktuálně používán v šablonách: ${tNames}.\n\nPokud ho smažeš, bude z těchto šablon AUTOMATICKY odebrán. Chceš přesto pokračovat?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
        for (const t of templatesWithEx) {
            const updatedExercises = t.exercises.filter(te => te.exercise_id !== exerciseId);
            
            const { error: tErr } = await supabase
                .from('gym_templates')
                .update({ exercises: updatedExercises })
                .eq('id', t.id);

            if (tErr) throw tErr;
        }

        const { error: exErr } = await supabase
            .from('gym_exercises')
            .delete()
            .eq('id', exerciseId);

        if (exErr) throw exErr;

        showNotification(`Cvik "${ex.name}" byl úspěšně smazán.`, 'info');
        
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to delete exercise:", e);
        showNotification('Nepodařilo se smazat cvik z databáze.', 'danger');
    }
}
