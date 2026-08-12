import { supabase } from '../../core/supabase.js';
import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { showNotification } from '../../core/theme.js';
import { renderModal, renderInputGroup } from '../../core/ui.js';
import {
    activeWorkout, activeTab,
    defaultExercises, defaultTemplates,
    saveActiveWorkoutToStorage
} from './shared.js';

// --- TAB: TEMPLATES & ROUTINES ---
export function renderTemplatesTab() {
    const templates = state.gymTemplates || [];
    
    return `
        <div class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                    <i class="fas fa-list-ul text-[#faa61a]"></i> Tréninkové plány
                </h2>
                <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button onclick="window.Gym.openCreateExerciseModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                        <i class="fas fa-dumbbell text-xs text-gray-400"></i> Nový cvik
                    </button>
                    <button onclick="window.Gym.openManualLogModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                        <i class="fas fa-history text-xs text-gray-400"></i> Zapsat zpětně
                    </button>
                    <button onclick="window.Gym.openCreateTemplateModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center">
                        <i class="fas fa-plus text-xs"></i> Nový plán
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${templates.length === 0 ? `
                    <div class="col-span-full text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                        <span class="text-5xl block mb-4">🦝</span>
                        <h4 class="text-base font-black text-white uppercase tracking-wider">Žádné šablony</h4>
                        <p class="text-xs text-white/40 font-semibold mt-1">Založte si novou tréninkovou šablonu tlačítkem výše!</p>
                    </div>
                ` : templates.map(t => {
                    const exCount = t.exercises ? t.exercises.length : 0;
                    const totalSets = t.exercises ? t.exercises.reduce((sum, e) => sum + (parseInt(e.sets) || 0), 0) : 0;
                    
                    return `
                        <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-0.5">
                            <div>
                                <div class="flex justify-between items-start gap-4 mb-2">
                                    <h3 class="text-base font-black text-white tracking-tight uppercase leading-snug">${t.name}</h3>
                                    <div class="flex gap-1.5 select-none">
                                        <button onclick="window.Gym.openEditTemplateModal('${t.id}', event)" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-[#faa61a] hover:bg-[#faa61a]/10 transition" title="Upravit plán">
                                            <i class="fas fa-edit text-[10px]"></i>
                                        </button>
                                        <button onclick="window.Gym.deleteTemplate('${t.id}', event)" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-500 hover:bg-red-500/10 transition" title="Smazat plán">
                                            <i class="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-400 mb-6 font-medium leading-relaxed">${t.description || 'Bez popisu.'}</p>
                                
                                <div class="flex gap-4 mb-6">
                                    <div class="bg-black/20 px-3 py-1.5 border border-white/5 rounded-xl text-center flex-1">
                                        <span class="text-[9px] font-black text-white/30 uppercase tracking-wider block leading-none mb-1">Cviky</span>
                                        <span class="text-sm font-black text-gray-200 tracking-tight">${exCount}</span>
                                    </div>
                                    <div class="bg-black/20 px-3 py-1.5 border border-white/5 rounded-xl text-center flex-1">
                                        <span class="text-[9px] font-black text-white/30 uppercase tracking-wider block leading-none mb-1">Série</span>
                                        <span class="text-sm font-black text-gray-200 tracking-tight">${totalSets}</span>
                                    </div>
                                </div>
                            </div>

                            <button onclick="window.Gym.startWorkout('${t.id}')" class="w-full py-3 rounded-2xl bg-gradient-to-r from-[#faa61a] to-[#e09216] hover:from-[#fbb138] hover:to-[#eb9b1d] text-black font-black text-xs uppercase tracking-widest transition shadow-lg transform active:scale-[0.98] flex items-center justify-center gap-2">
                                <i class="fas fa-play text-[10px]"></i> Spustit trénink
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// --- CREATE TEMPLATE MODAL ---
export function openCreateTemplateModal() {
    triggerHaptic('light');

    const exercises = state.gymExercises || [];

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název šablony tréninku',
                id: 'tmpl-name',
                placeholder: 'např. Push Day 🦍, Vrch těla...'
            })}

            ${renderInputGroup({
                label: 'Popis',
                id: 'tmpl-desc',
                placeholder: 'např. Hrudník, ramena, triceps...'
            })}

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Vyber cviky tréninku</label>
                <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition mb-2">
                <div class="max-h-60 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2">
                    ${exercises.map(ex => `
                        <label class="exercise-select-item flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition select-none" data-name="${ex.name.toLowerCase()}" data-category="${ex.category.toLowerCase()}">
                            <input type="checkbox" name="tmpl-exercises" value="${ex.id}" onchange="window.Gym.refreshExercisesConfig('create')" class="w-4 h-4 rounded accent-[#faa61a] border-white/10 bg-black/20 focus:ring-0">
                            <div>
                                <span class="text-xs font-bold text-white block leading-snug">${ex.name}</span>
                                <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>

            <!-- Dynamic configurator for exercise properties -->
            <div id="tmpl-exercises-config" class="space-y-3 mt-4 hidden"></div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('create-template-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveTemplate()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Šablonu
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'create-template-modal',
        title: 'Nová Tréninková Šablona',
        subtitle: 'Navrhni si svůj tréninkový split 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('create-template-modal').remove()"
    }));

    document.getElementById('create-template-modal').classList.remove('hidden');
    document.getElementById('create-template-modal').classList.add('flex');
}

export async function saveTemplate(renderGymFn) {
    triggerHaptic('medium');

    const name = document.getElementById('tmpl-name').value.trim();
    const description = document.getElementById('tmpl-desc').value.trim();
    
    const checked = Array.from(document.querySelectorAll('input[name="tmpl-exercises"]:checked')).map(cb => cb.value);

    if (!name) {
        showNotification('Zadej název šablony!', 'warning');
        return;
    }
    if (checked.length === 0) {
        showNotification('Vyber alespoň jeden cvik!', 'warning');
        return;
    }

    // Build exercises structure with inputs from configurator
    const tmplExercises = checked.map(exId => {
        const setsEl = document.getElementById(`create-ex-sets-${exId}`);
        const repsEl = document.getElementById(`create-ex-reps-${exId}`);
        const weightEl = document.getElementById(`create-ex-weight-${exId}`);
        const restEl = document.getElementById(`create-ex-rest-${exId}`);
        return {
            exercise_id: exId,
            sets: setsEl ? parseInt(setsEl.value) || 4 : 4,
            reps: repsEl ? parseInt(repsEl.value) || 10 : 10,
            weight: weightEl ? parseFloat(weightEl.value) || 10 : 10,
            rest_seconds: restEl ? parseInt(restEl.value) || 90 : 90
        };
    });

    try {
        const { error } = await supabase
            .from('gym_templates')
            .insert({
                name,
                description,
                exercises: tmplExercises,
                created_by: state.currentUser?.id
            });

        if (error) throw error;

        showNotification('Šablona uložena! 🦍🏋️‍♂️', 'success');
        document.getElementById('create-template-modal')?.remove();
        
        await ensureGymData(true);
        renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to save template:", e);
        showNotification('Nepodařilo se uložit šablonu.', 'danger');
    }
}

export async function deleteTemplate(id, event, renderGymFn) {
    if (event) event.stopPropagation();

    if (!confirm('Opravdu chceš smazat tuto tréninkovou šablonu?')) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase
            .from('gym_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Šablona smazána.', 'info');
        await ensureGymData(true);
        renderGymFn();
    } catch (e) {
        console.error('[Gym] Failed to delete template:', e);
        showNotification('Nepodařilo se smazat šablonu.', 'danger');
    }
}

// --- EDIT TEMPLATE MODAL ---
export function openEditTemplateModal(templateId, event) {
    if (event) event.stopPropagation();
    triggerHaptic('light');

    const template = state.gymTemplates.find(t => t.id === templateId);
    if (!template) return;

    const exercises = state.gymExercises || [];
    const templateExerciseIds = template.exercises.map(e => e.exercise_id);

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název šablony',
                id: 'edit-tmpl-name',
                placeholder: 'např. Push Day 🦍',
                value: template.name
            })}

            ${renderInputGroup({
                label: 'Popis',
                id: 'edit-tmpl-desc',
                placeholder: 'např. Hrudník, ramena...',
                value: template.description || ''
            })}

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Zvolené cviky tréninku</label>
                <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition mb-2">
                <div class="max-h-60 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2">
                    ${exercises.map(ex => {
                        const isChecked = templateExerciseIds.includes(ex.id);
                        return `
                            <label class="exercise-select-item flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition select-none" data-name="${ex.name.toLowerCase()}" data-category="${ex.category.toLowerCase()}">
                                <input type="checkbox" name="edit-tmpl-exercises" value="${ex.id}" ${isChecked ? 'checked' : ''} onchange="window.Gym.refreshExercisesConfig('edit')" class="w-4 h-4 rounded accent-[#faa61a] border-white/10 bg-black/20 focus:ring-0">
                                <div>
                                    <span class="text-xs font-bold text-white block leading-snug">${ex.name}</span>
                                    <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                                </div>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Dynamic configurator for exercise properties -->
            <div id="edit-tmpl-exercises-config" class="space-y-3 mt-4 hidden"></div>

            <input type="hidden" id="edit-tmpl-id" value="${templateId}">
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('edit-template-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveEditedTemplate()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Změny
            </button>
        </div>
    `;

    document.getElementById('edit-template-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-template-modal',
        title: 'Upravit Tréninkový Plán',
        subtitle: 'Uprav složení cviků a popis splitu 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('edit-template-modal').remove()"
    }));

    document.getElementById('edit-template-modal').classList.remove('hidden');
    document.getElementById('edit-template-modal').classList.add('flex');

    // Render initial exercises config
    window.Gym.refreshExercisesConfig('edit', template);
}

export async function saveEditedTemplate(renderGymFn) {
    triggerHaptic('medium');

    const id = document.getElementById('edit-tmpl-id').value;
    const name = document.getElementById('edit-tmpl-name').value.trim();
    const description = document.getElementById('edit-tmpl-desc').value.trim();
    const checked = Array.from(document.querySelectorAll('input[name="edit-tmpl-exercises"]:checked')).map(cb => cb.value);

    if (!name) {
        showNotification('Zadej název šablony!', 'warning');
        return;
    }
    if (checked.length === 0) {
        showNotification('Vyber alespoň jeden cvik!', 'warning');
        return;
    }

    const template = state.gymTemplates.find(t => t.id === id);
    if (!template) return;

    // Preserving/building exercises structure with inputs from configurator
    const newExercises = checked.map(exId => {
        const setsEl = document.getElementById(`edit-ex-sets-${exId}`);
        const repsEl = document.getElementById(`edit-ex-reps-${exId}`);
        const weightEl = document.getElementById(`edit-ex-weight-${exId}`);
        const restEl = document.getElementById(`edit-ex-rest-${exId}`);
        
        const oldEx = template.exercises.find(e => e.exercise_id === exId);
        return {
            exercise_id: exId,
            sets: setsEl ? parseInt(setsEl.value) || 4 : (oldEx ? oldEx.sets || 4 : 4),
            reps: repsEl ? parseInt(repsEl.value) || 10 : (oldEx ? oldEx.reps || 10 : 10),
            weight: weightEl ? parseFloat(weightEl.value) || 10 : (oldEx ? oldEx.weight || 10 : 10),
            rest_seconds: restEl ? parseInt(restEl.value) || 90 : (oldEx ? oldEx.rest_seconds || 90 : 90)
        };
    });

    try {
        const { error } = await supabase
            .from('gym_templates')
            .update({
                name,
                description,
                exercises: newExercises
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Tréninkový plán byl úspěšně upraven! 🏋️‍♂️💪', 'success');
        document.getElementById('edit-template-modal')?.remove();

        await ensureGymData(true);
        renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to update template:", e);
        showNotification('Nepodařilo se uložit změny plánu.', 'danger');
    }
}

// --- SEED DATA ---
export async function checkAndSeed(renderGymFn) {
    triggerHaptic('medium');
    const container = document.getElementById("messages-container");
    if (container) {
        container.innerHTML = `
            <div class="h-full bg-[#36393f] flex flex-col items-center justify-center font-sans">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#faa61a]"></div>
                <p class="text-xs text-gray-400 mt-4">Zakládám data...</p>
            </div>
        `;
    }

    try {
        console.log("[Gym] Inserting default exercises...");
        const { error: exErr } = await supabase.from('gym_exercises').insert(defaultExercises);
        if (exErr) throw exErr;

        console.log("[Gym] Inserting default templates...");
        const templatesToInsert = defaultTemplates.map(t => ({
            name: t.name,
            description: t.description,
            exercises: t.exercises,
            created_by: state.currentUser?.id
        }));
        const { error: tempErr } = await supabase.from('gym_templates').insert(templatesToInsert);
        if (tempErr) throw tempErr;

        showNotification("Gym database seeded successfully! 🏋️‍♂️", "success");
        await ensureGymData(true);
        renderGymFn();
    } catch (e) {
        console.error("[Gym] Seeding failed:", e);
        showNotification("Inicializace selhala: " + e.message, "danger");
        renderGymFn();
    }
}

// --- REFRESH EXERCISES CONFIG (shared between create and edit modals) ---
export function refreshExercisesConfig(mode, template = null) {
    const isCreate = mode === 'create';
    const cbName = isCreate ? 'tmpl-exercises' : 'edit-tmpl-exercises';
    const configContainerId = isCreate ? 'tmpl-exercises-config' : 'edit-tmpl-exercises-config';
    const container = document.getElementById(configContainerId);
    if (!container) return;

    const checkedBoxes = Array.from(document.querySelectorAll(`input[name="${cbName}"]:checked`));
    if (checkedBoxes.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    // Preserve user inputs if they are already typing before checking/unchecking other items
    const preserved = {};
    checkedBoxes.forEach(cb => {
        const exId = cb.value;
        const setsEl = document.getElementById(`${mode}-ex-sets-${exId}`);
        const repsEl = document.getElementById(`${mode}-ex-reps-${exId}`);
        const weightEl = document.getElementById(`${mode}-ex-weight-${exId}`);
        const restEl = document.getElementById(`${mode}-ex-rest-${exId}`);
        if (setsEl && repsEl && weightEl && restEl) {
            preserved[exId] = {
                sets: setsEl.value,
                reps: repsEl.value,
                weight: weightEl.value,
                rest_seconds: restEl.value
            };
        }
    });

    let html = `
        <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Nastavení parametrů cviků</label>
        <div class="space-y-3 max-h-60 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar">
    `;

    checkedBoxes.forEach(cb => {
        const exId = cb.value;
        const ex = state.gymExercises.find(e => e.id === exId) || { name: exId };

        let sets = 4;
        let reps = 10;
        let weight = 10;
        let rest = 90;

        if (preserved[exId]) {
            sets = preserved[exId].sets;
            reps = preserved[exId].reps;
            weight = preserved[exId].weight;
            rest = preserved[exId].rest_seconds;
        } else if (template && template.exercises) {
            const match = template.exercises.find(e => e.exercise_id === exId);
            if (match) {
                sets = match.sets ?? 4;
                reps = match.reps ?? 10;
                weight = match.weight ?? 10;
                rest = match.rest_seconds ?? 90;
            }
        }

        html += `
            <div class="bg-[#202225] p-3 rounded-xl border border-white/5 space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-white block leading-snug truncate max-w-[200px]">${ex.name}</span>
                    <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category || ''}</span>
                </div>
                <div class="grid grid-cols-4 gap-2">
                    <div>
                        <label class="block text-[8px] text-gray-500 font-bold uppercase mb-0.5 ml-0.5">Série</label>
                        <input type="number" id="${mode}-ex-sets-${exId}" value="${sets}" class="w-full bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                    </div>
                    <div>
                        <label class="block text-[8px] text-gray-500 font-bold uppercase mb-0.5 ml-0.5">Opakování</label>
                        <input type="number" id="${mode}-ex-reps-${exId}" value="${reps}" class="w-full bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                    </div>
                    <div>
                        <label class="block text-[8px] text-gray-500 font-bold uppercase mb-0.5 ml-0.5">Váha (kg)</label>
                        <input type="number" step="0.5" id="${mode}-ex-weight-${exId}" value="${weight}" class="w-full bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                    </div>
                    <div>
                        <label class="block text-[8px] text-gray-500 font-bold uppercase mb-0.5 ml-0.5">Pauza (s)</label>
                        <input type="number" step="5" id="${mode}-ex-rest-${exId}" value="${rest}" class="w-full bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// --- MANUAL LOG MODAL ---
export function openManualLogModal(renderGymFn) {
    triggerHaptic('light');

    const templates = state.gymTemplates || [];
    const exercises = state.gymExercises || [];

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Datum tréninku</label>
                <input type="date" id="manual-date" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all" value="${new Date().toISOString().split('T')[0]}">
            </div>

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tréninkový plán (Šablona)</label>
                <select id="manual-template" onchange="window.Gym.onManualTemplateChange(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <option value="">-- Vyber šablonu --</option>
                    ${templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </div>

            ${renderInputGroup({
                label: 'Délka tréninku (minuty)',
                id: 'manual-duration',
                type: 'number',
                placeholder: 'např. 60',
                value: '60'
            })}

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cviky a váhy</label>
                <div id="manual-exercises-list" class="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    <p class="text-xs text-gray-500 italic">Zatím nevybrána šablona.</p>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('manual-log-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveManualLog()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Trénink
            </button>
        </div>
    `;

    document.getElementById('manual-log-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'manual-log-modal',
        title: 'Zpětný zápis tréninku',
        subtitle: 'Zaznamenej trénink z minulosti 🏋️‍♂️📜',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('manual-log-modal').remove()"
    }));

    // Trigger helper on templates change
    window.Gym.onManualTemplateChange = (tmplId) => {
        const listEl = document.getElementById('manual-exercises-list');
        if (!listEl) return;

        const tmpl = templates.find(t => t.id === tmplId);
        if (!tmpl) {
            listEl.innerHTML = `<p class="text-xs text-gray-500 italic">Zatím nevybrána šablona.</p>`;
            return;
        }

        let exListHtml = '';
        tmpl.exercises.forEach((te, idx) => {
            const ex = exercises.find(e => e.id === te.exercise_id) || { name: te.exercise_id };
            exListHtml += `
                <div class="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-2" data-ex-id="${te.exercise_id}">
                    <div class="text-xs font-bold text-white leading-snug">${ex.name}</div>
                    <div class="grid grid-cols-2 gap-2">
                        ${renderInputGroup({
                            label: 'Váha (kg)',
                            id: `manual-ex-${idx}-weight`,
                            type: 'number',
                            value: te.weight.toString()
                        })}
                        ${renderInputGroup({
                            label: 'Opakování',
                            id: `manual-ex-${idx}-reps`,
                            type: 'number',
                            value: te.reps.toString()
                        })}
                    </div>
                    <input type="hidden" id="manual-ex-${idx}-sets" value="${te.sets}">
                </div>
            `;
        });
        listEl.innerHTML = exListHtml;
    };

    document.getElementById('manual-log-modal').classList.remove('hidden');
    document.getElementById('manual-log-modal').classList.add('flex');
}

export async function saveManualLog(renderGymFn) {
    triggerHaptic('medium');

    const dateVal = document.getElementById('manual-date').value;
    const templateId = document.getElementById('manual-template').value;
    const durationMin = parseInt(document.getElementById('manual-duration').value) || 60;

    if (!templateId) {
        showNotification('Vyber tréninkovou šablonu!', 'warning');
        return;
    }

    const template = state.gymTemplates.find(t => t.id === templateId);
    if (!template) return;

    const loggedExercises = [];
    let hasLoggedAnything = false;

    template.exercises.forEach((te, idx) => {
        const weightEl = document.getElementById(`manual-ex-${idx}-weight`);
        const repsEl = document.getElementById(`manual-ex-${idx}-reps`);
        const setsCount = parseInt(document.getElementById(`manual-ex-${idx}-sets`).value) || 4;

        if (weightEl && repsEl) {
            const weight = parseFloat(weightEl.value) || 0;
            const reps = parseInt(repsEl.value) || 0;

            const setsArray = [];
            for (let s = 0; s < setsCount; s++) {
                setsArray.push({ weight, reps, completed: true });
            }

            const ex = state.gymExercises.find(e => e.id === te.exercise_id) || { name: te.exercise_id };
            loggedExercises.push({
                exercise_id: te.exercise_id,
                exercise_name: ex.name,
                sets: setsArray
            });
            hasLoggedAnything = true;
        }
    });

    if (!hasLoggedAnything) {
        showNotification('Chyba při logování cviků.', 'warning');
        return;
    }

    try {
        const logData = {
            user_id: state.currentUser?.id,
            template_id: templateId,
            name: template.name,
            duration_seconds: durationMin * 60,
            date_key: dateVal,
            exercises: loggedExercises,
            cheers: []
        };

        const { data: newLogs, error: logErr } = await supabase
            .from('gym_logs')
            .insert(logData)
            .select();

        if (logErr) throw logErr;

        const insertedLog = newLogs?.[0];

        // Check for PRs
        for (const ex of loggedExercises) {
            const maxCompletedSet = ex.sets[0]; // All sets are identical in manual entry
            if (maxCompletedSet && maxCompletedSet.weight > 0) {
                const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === ex.exercise_id);
                if (!existingPR || maxCompletedSet.weight > parseFloat(existingPR.weight)) {
                    const prData = {
                        user_id: state.currentUser?.id,
                        exercise_id: ex.exercise_id,
                        weight: maxCompletedSet.weight,
                        reps: maxCompletedSet.reps,
                        achieved_at: new Date().toISOString(),
                        log_id: insertedLog?.id
                    };

                    if (existingPR) {
                        await supabase.from('gym_prs').delete().eq('id', existingPR.id);
                    }
                    await supabase.from('gym_prs').insert(prData);

                    // Auto-unlock PR breaker achievement!
                    import('../achievements.js').then(m => {
                        m.autoUnlock('pr_breaker');
                    });
                }
            }
        }

        import('../../core/utils.js').then(m => m.triggerConfetti());
        showNotification('Zpětný trénink uložen! Získali jste +20 XP! 🎉', 'success');
        document.getElementById('manual-log-modal')?.remove();

        await ensureGymData(true);
        
        // Achieve checks if we logged a workout
        import('../achievements.js').then(m => {
            const myLogsCount = state.gymLogs.filter(l => l.user_id === state.currentUser?.id).length;
            if (myLogsCount >= 10) m.autoUnlock('gym_rat');

            const partnerLogsToday = state.gymLogs.filter(l => l.user_id !== state.currentUser?.id && l.date_key === dateVal);
            if (partnerLogsToday.length > 0) {
                m.autoUnlock('synchro_gym');
            }
        });

        import('../../core/state.js').then(s => s.initializeState());
        renderGymFn();
    } catch (e) {
        console.error("[Gym] Manual log failed:", e);
        showNotification('Chyba ukládání: ' + e.message, 'danger');
    }
}
