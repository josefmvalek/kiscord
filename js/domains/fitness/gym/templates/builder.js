import { supabase } from '@core/supabase.js';
import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { getCategoryEmoji, getExerciseThumbnailHtml, openExerciseGuideModal } from '../exercises.js';
import { startWorkout } from '../active-workout/index.js';
import { renderSplitOverviewBarHtml } from '../splits.js';

export function renderTemplatesTab() {
    const templates = state.gymTemplates || [];
    const splitBarHtml = renderSplitOverviewBarHtml();
    
    return `
        <div class="space-y-6">
            <!-- Training Split Overview Strip -->
            ${splitBarHtml}

            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                    <i class="fas fa-list-ul text-[#faa61a]"></i> Tréninkové plány & Šablony
                </h2>
                <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button onclick="window.Gym.openSplitManagerModal()" class="px-3 sm:px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                        <i class="fas fa-calendar-alt text-xs text-amber-400"></i> Můj Split
                    </button>
                    <button onclick="window.Gym.startFreeWorkout()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-amber-500/15 flex-1 sm:flex-none justify-center">
                        <i class="fas fa-bolt text-xs"></i> Volný trénink
                    </button>
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
                    const hasSupersets = (t.exercises || []).some(e => e.superset_group);

                    let modeBadge = '';
                    if (t.mode === 'circuit') {
                        modeBadge = `<span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">⚡ Kruháč (${t.circuit_rounds || 3} kola)</span>`;
                    } else if (t.mode === 'amrap') {
                        modeBadge = `<span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">⏱ AMRAP (${t.amrap_minutes || 20}m)</span>`;
                    } else if (t.mode === 'emom') {
                        modeBadge = `<span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30">⌛ EMOM (${t.emom_minutes || 15}m)</span>`;
                    }
                    
                    return `
                        <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-0.5">
                            <div>
                                <div class="flex justify-between items-start gap-4 mb-2">
                                    <div>
                                        <div class="flex items-center gap-2 flex-wrap mb-1">
                                            ${modeBadge}
                                            ${hasSupersets ? `<span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">⚡ Supersety</span>` : ''}
                                        </div>
                                        <h3 class="text-base font-black text-white tracking-tight uppercase leading-snug">${t.name}</h3>
                                    </div>
                                    <div class="flex gap-1.5 select-none flex-shrink-0">
                                        <button onclick="window.Gym.cloneTemplate('${t.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-emerald-400/10 transition" title="Duplikovat plán">
                                            <i class="far fa-copy text-[10px]"></i>
                                        </button>
                                        <button onclick="window.Gym.openScheduleTemplateModal('${t.id}', event)" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition" title="Naplánovat do kalendáře">
                                            <i class="far fa-calendar-plus text-[10px]"></i>
                                        </button>
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

                            <div class="flex gap-2">
                                <button onclick="window.Gym.startWorkout('${t.id}')" class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#faa61a] to-[#e09216] hover:from-[#fbb138] hover:to-[#eb9b1d] text-black font-black text-xs uppercase tracking-widest transition shadow-lg transform active:scale-[0.98] flex items-center justify-center gap-2">
                                    <i class="fas fa-play text-[10px]"></i> Spustit trénink
                                </button>
                                <button onclick="window.Gym.openScheduleTemplateModal('${t.id}', event)" class="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 font-black text-xs transition flex items-center justify-center shadow-md" title="Naplánovat do kalendáře">
                                    <i class="far fa-calendar-alt text-sm"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Modal state for active template exercises being configured
let modalTemplateExercises = [];

function syncInputsToModalTemplateExercises(mode) {
    if (!Array.isArray(modalTemplateExercises)) return;
    modalTemplateExercises.forEach(item => {
        const exId = item.exercise_id;
        const setsEl = document.getElementById(`${mode}-ex-sets-${exId}`);
        const repsEl = document.getElementById(`${mode}-ex-reps-${exId}`);
        const weightEl = document.getElementById(`${mode}-ex-weight-${exId}`);
        const restEl = document.getElementById(`${mode}-ex-rest-${exId}`);
        const supersetEl = document.getElementById(`${mode}-ex-superset-${exId}`);

        if (setsEl) item.sets = parseInt(setsEl.value, 10) || 4;
        if (repsEl) item.reps = parseInt(repsEl.value, 10) || 10;
        if (weightEl) item.weight = parseFloat(weightEl.value) || 0;
        if (restEl) item.rest_seconds = parseInt(restEl.value, 10) || 90;
        if (supersetEl) item.superset_group = supersetEl.value || null;
    });
}

// --- CREATE TEMPLATE MODAL ---
export function openCreateTemplateModal() {
    triggerHaptic('light');

    const exercises = state.gymExercises || [];
    modalTemplateExercises = [];

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Název šablony tréninku',
                    id: 'tmpl-name',
                    placeholder: 'např. Push Day 🦍, Vrch těla...'
                })}

                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Režim tréninku</label>
                    <select id="tmpl-mode" onchange="window.Gym.onTemplateModeChange('create', this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all font-bold">
                        <option value="standard">Standardní trénink</option>
                        <option value="circuit">⚡ Kruhový trénink (Circuit)</option>
                        <option value="amrap">⏱ AMRAP (Co nejvíce kol za čas)</option>
                        <option value="emom">⌛ EMOM (Každou minutu na minutu)</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Popis',
                id: 'tmpl-desc',
                placeholder: 'např. Hrudník, ramena, triceps...'
            })}

            <!-- Mode specific parameters -->
            <div id="create-tmpl-mode-params" class="hidden p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
                <!-- Dynamically populated based on mode -->
            </div>

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Vyber cviky tréninku</label>
                <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition mb-2">
                <div class="max-h-56 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2">
                    ${exercises.map(ex => `
                        <label class="exercise-select-item flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition select-none" data-name="${ex.name.toLowerCase()}" data-category="${ex.category.toLowerCase()}">
                            <input type="checkbox" name="tmpl-exercises" value="${ex.id}" onchange="window.Gym.onTemplateCheckboxToggle('create', '${ex.id}', this.checked)" class="w-4 h-4 rounded accent-[#faa61a] border-white/10 bg-black/20 focus:ring-0 flex-shrink-0">
                            <div class="flex items-center gap-2.5 min-w-0">
                                ${getExerciseThumbnailHtml(ex, 'w-8 h-8')}
                                <div class="min-w-0">
                                    <span class="text-xs font-bold text-white block leading-snug truncate">${ex.name}</span>
                                    <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                                </div>
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

    document.getElementById('create-template-modal')?.remove();

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
    const mode = document.getElementById('tmpl-mode')?.value || 'standard';
    const circuitRounds = parseInt(document.getElementById('create-circuit-rounds')?.value) || 3;
    const amrapMinutes = parseInt(document.getElementById('create-amrap-minutes')?.value) || 20;
    const emomMinutes = parseInt(document.getElementById('create-emom-minutes')?.value) || 15;
    
    syncInputsToModalTemplateExercises('create');

    if (!name) {
        showNotification('Zadej název šablony!', 'warning');
        return;
    }
    if (!modalTemplateExercises || modalTemplateExercises.length === 0) {
        showNotification('Vyber alespoň jeden cvik!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('gym_templates')
            .insert({
                name,
                description,
                mode,
                circuit_rounds: circuitRounds,
                amrap_minutes: amrapMinutes,
                emom_minutes: emomMinutes,
                exercises: modalTemplateExercises,
                created_by: state.currentUser?.id
            });

        if (error) throw error;

        showNotification('Šablona uložena! 🦍🏋️‍♂️', 'success');
        document.getElementById('create-template-modal')?.remove();
        
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to save template:", e);
        showNotification('Nepodařilo se uložit šablonu.', 'danger');
    }
}

export async function deleteTemplate(id, event, renderGymFn) {
    if (event) event.stopPropagation();

    const confirmed = await showConfirmDialog('Opravdu chceš smazat tuto tréninkovou šablonu?');
    if (!confirmed) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase
            .from('gym_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Šablona smazána.', 'info');
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error('[Gym] Failed to delete template:', e);
        showNotification('Nepodařilo se smazat šablonu.', 'danger');
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
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Seeding failed:", e);
        showNotification("Inicializace selhala: " + e.message, "danger");
        if (renderGymFn) renderGymFn();
    }
}

// --- EDIT TEMPLATE MODAL ---
export function openEditTemplateModal(templateId, event) {
    if (event) event.stopPropagation();
    triggerHaptic('light');

    const template = state.gymTemplates.find(t => t.id === templateId);
    if (!template) return;

    const exercises = state.gymExercises || [];
    // Deep clone existing exercises preserving their exact custom order
    modalTemplateExercises = (template.exercises || []).map(e => ({
        exercise_id: e.exercise_id,
        sets: e.sets ?? 4,
        reps: e.reps ?? 10,
        weight: e.weight ?? 10,
        rest_seconds: e.rest_seconds ?? 90,
        superset_group: e.superset_group || null
    }));

    const templateExerciseIds = modalTemplateExercises.map(e => e.exercise_id);
    const tmplMode = template.mode || 'standard';

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Název šablony',
                    id: 'edit-tmpl-name',
                    placeholder: 'např. Push Day 🦍',
                    value: template.name
                })}

                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Režim tréninku</label>
                    <select id="edit-tmpl-mode" onchange="window.Gym.onTemplateModeChange('edit', this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all font-bold">
                        <option value="standard" ${tmplMode === 'standard' ? 'selected' : ''}>Standardní trénink</option>
                        <option value="circuit" ${tmplMode === 'circuit' ? 'selected' : ''}>⚡ Kruhový trénink (Circuit)</option>
                        <option value="amrap" ${tmplMode === 'amrap' ? 'selected' : ''}>⏱ AMRAP (Co nejvíce kol za čas)</option>
                        <option value="emom" ${tmplMode === 'emom' ? 'selected' : ''}>⌛ EMOM (Každou minutu na minutu)</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Popis',
                id: 'edit-tmpl-desc',
                placeholder: 'např. Hrudník, ramena...',
                value: template.description || ''
            })}

            <!-- Mode specific parameters -->
            <div id="edit-tmpl-mode-params" class="${tmplMode === 'standard' ? 'hidden' : ''} p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
                ${renderModeParamsHtml('edit', tmplMode, template)}
            </div>

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Zvolené cviky tréninku</label>
                <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition mb-2">
                <div class="max-h-56 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2">
                    ${exercises.map(ex => {
                        const isChecked = templateExerciseIds.includes(ex.id);
                        return `
                            <label class="exercise-select-item flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition select-none" data-name="${ex.name.toLowerCase()}" data-category="${ex.category.toLowerCase()}">
                                <input type="checkbox" name="edit-tmpl-exercises" value="${ex.id}" ${isChecked ? 'checked' : ''} onchange="window.Gym.onTemplateCheckboxToggle('edit', '${ex.id}', this.checked)" class="w-4 h-4 rounded accent-[#faa61a] border-white/10 bg-black/20 focus:ring-0 flex-shrink-0">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    ${getExerciseThumbnailHtml(ex, 'w-8 h-8')}
                                    <div class="min-w-0">
                                        <span class="text-xs font-bold text-white block leading-snug truncate">${ex.name}</span>
                                        <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                                    </div>
                                </div>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Dynamic configurator for exercise properties & reordering -->
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
    refreshExercisesConfig('edit');
}

export async function saveEditedTemplate(renderGymFn) {
    triggerHaptic('medium');

    const id = document.getElementById('edit-tmpl-id').value;
    const name = document.getElementById('edit-tmpl-name').value.trim();
    const description = document.getElementById('edit-tmpl-desc').value.trim();
    const mode = document.getElementById('edit-tmpl-mode')?.value || 'standard';
    const circuitRounds = parseInt(document.getElementById('edit-circuit-rounds')?.value) || 3;
    const amrapMinutes = parseInt(document.getElementById('edit-amrap-minutes')?.value) || 20;
    const emomMinutes = parseInt(document.getElementById('edit-emom-minutes')?.value) || 15;

    syncInputsToModalTemplateExercises('edit');

    if (!name) {
        showNotification('Zadej název šablony!', 'warning');
        return;
    }
    if (!modalTemplateExercises || modalTemplateExercises.length === 0) {
        showNotification('Vyber alespoň jeden cvik!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('gym_templates')
            .update({
                name,
                description,
                mode,
                circuit_rounds: circuitRounds,
                amrap_minutes: amrapMinutes,
                emom_minutes: emomMinutes,
                exercises: modalTemplateExercises
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Tréninkový plán byl úspěšně upraven! 🏋️‍♂️💪', 'success');
        document.getElementById('edit-template-modal')?.remove();

        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
    } catch (e) {
        console.error("[Gym] Failed to update template:", e);
        showNotification('Nepodařilo se uložit změny plánu.', 'danger');
    }
}

function renderModeParamsHtml(prefix, mode, data = null) {
    if (mode === 'circuit') {
        const rounds = data?.circuit_rounds || 3;
        return `
            <div class="flex items-center justify-between gap-3 text-xs">
                <span class="text-indigo-300 font-bold">⚡ Počet kol kruhového tréninku:</span>
                <input type="number" min="1" max="20" id="${prefix}-circuit-rounds" value="${rounds}" class="w-20 bg-black/40 text-center font-mono font-bold text-white p-1.5 rounded-lg border border-white/10 outline-none focus:border-indigo-500/50">
            </div>
        `;
    }
    if (mode === 'amrap') {
        const mins = data?.amrap_minutes || 20;
        return `
            <div class="flex items-center justify-between gap-3 text-xs">
                <span class="text-amber-300 font-bold">⏱ Časový limit AMRAP (minuty):</span>
                <input type="number" min="1" max="120" id="${prefix}-amrap-minutes" value="${mins}" class="w-20 bg-black/40 text-center font-mono font-bold text-white p-1.5 rounded-lg border border-white/10 outline-none focus:border-amber-500/50">
            </div>
        `;
    }
    if (mode === 'emom') {
        const mins = data?.emom_minutes || 15;
        return `
            <div class="flex items-center justify-between gap-3 text-xs">
                <span class="text-pink-300 font-bold">⌛ Celkový čas EMOM (minuty):</span>
                <input type="number" min="1" max="120" id="${prefix}-emom-minutes" value="${mins}" class="w-20 bg-black/40 text-center font-mono font-bold text-white p-1.5 rounded-lg border border-white/10 outline-none focus:border-pink-500/50">
            </div>
        `;
    }
    return '';
}

export function onTemplateModeChange(prefix, mode) {
    triggerHaptic('light');
    const container = document.getElementById(`${prefix}-tmpl-mode-params`);
    if (!container) return;
    if (mode === 'standard') {
        container.classList.add('hidden');
        container.innerHTML = '';
    } else {
        container.classList.remove('hidden');
        container.innerHTML = renderModeParamsHtml(prefix, mode);
    }
}

// --- TEMPLATE EXERCISE INTERACTION HANDLERS (ORDER & REMOVAL) ---

export function onTemplateCheckboxToggle(mode, exId, isChecked) {
    triggerHaptic('light');
    syncInputsToModalTemplateExercises(mode);

    if (isChecked) {
        if (!modalTemplateExercises.some(item => item.exercise_id === exId)) {
            modalTemplateExercises.push({
                exercise_id: exId,
                sets: 4,
                reps: 10,
                weight: 10,
                rest_seconds: 90,
                superset_group: null
            });
        }
    } else {
        modalTemplateExercises = modalTemplateExercises.filter(item => item.exercise_id !== exId);
    }

    refreshExercisesConfig(mode);
}

export function moveTemplateExercise(mode, index, direction) {
    triggerHaptic('medium');
    syncInputsToModalTemplateExercises(mode);

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modalTemplateExercises.length) return;

    const temp = modalTemplateExercises[index];
    modalTemplateExercises[index] = modalTemplateExercises[targetIndex];
    modalTemplateExercises[targetIndex] = temp;

    refreshExercisesConfig(mode);
}

export function removeTemplateExercise(mode, index) {
    triggerHaptic('medium');
    syncInputsToModalTemplateExercises(mode);

    const removed = modalTemplateExercises.splice(index, 1)[0];
    if (removed) {
        const cbName = mode === 'create' ? 'tmpl-exercises' : 'edit-tmpl-exercises';
        const checkbox = document.querySelector(`input[name="${cbName}"][value="${removed.exercise_id}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
    }

    refreshExercisesConfig(mode);
    showNotification('Cvik byl odebrán ze šablony.', 'info');
}

// --- REFRESH EXERCISES CONFIG (shared between create and edit modals) ---
export function refreshExercisesConfig(mode, template = null) {
    const isCreate = mode === 'create';
    const configContainerId = isCreate ? 'tmpl-exercises-config' : 'edit-tmpl-exercises-config';
    const container = document.getElementById(configContainerId);
    if (!container) return;

    if (!modalTemplateExercises || modalTemplateExercises.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const total = modalTemplateExercises.length;
    let html = `
        <div class="flex items-center justify-between mb-2 ml-1">
            <label class="block text-[10px] text-gray-400 font-black uppercase tracking-widest">
                Pořadí cviků & Parametry (${total})
            </label>
            <span class="text-[9px] text-[#faa61a] font-bold flex items-center gap-1 bg-[#faa61a]/10 px-2 py-0.5 rounded-md border border-[#faa61a]/20">
                <i class="fas fa-arrows-alt-v text-[8px]"></i> Měňte pořadí šipkami ▲ ▼
            </span>
        </div>
        <div class="space-y-2.5 max-h-72 overflow-y-auto border border-white/5 bg-black/20 rounded-2xl p-2.5 custom-scrollbar">
    `;

    modalTemplateExercises.forEach((item, idx) => {
        const exId = item.exercise_id;
        const ex = (state.gymExercises || []).find(e => e.id === exId) || { id: exId, name: exId, category: 'Vlastní' };

        const sets = item.sets ?? 4;
        const reps = item.reps ?? 10;
        const weight = item.weight ?? 10;
        const rest = item.rest_seconds ?? 90;
        const superset = item.superset_group || '';

        html += `
            <div class="bg-[#202225] hover:bg-[#25282d] p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all space-y-2.5 shadow-sm group">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <!-- Order Index Badge -->
                        <span class="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-[#faa61a] font-mono flex-shrink-0">
                            #${idx + 1}
                        </span>

                        <!-- Thumbnail -->
                        <div class="w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 relative">
                            ${getExerciseThumbnailHtml(ex, 'w-full h-full')}
                        </div>

                        <div class="min-w-0 flex-1">
                            <span class="text-xs font-bold text-white block leading-snug truncate group-hover:text-[#faa61a] transition-colors">${ex.name}</span>
                            <span class="text-[8px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                        </div>
                    </div>

                    <!-- Actions: Superset, Reorder Up/Down, Remove -->
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <select id="${mode}-ex-superset-${exId}" class="bg-black/40 text-[9px] font-black uppercase text-amber-300 px-2 py-1 rounded-lg border border-white/5 outline-none hover:border-white/15 transition">
                            <option value="" ${!superset ? 'selected' : ''}>Samostatný</option>
                            <option value="A" ${superset === 'A' ? 'selected' : ''}>⚡ Superset A</option>
                            <option value="B" ${superset === 'B' ? 'selected' : ''}>⚡ Superset B</option>
                        </select>

                        <!-- Move Up Button -->
                        <button type="button" 
                                onclick="window.Gym.moveTemplateExercise('${mode}', ${idx}, -1)" 
                                ${idx === 0 ? 'disabled' : ''}
                                class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:pointer-events-none text-gray-300 hover:text-white flex items-center justify-center text-xs transition border border-white/5 active:scale-95" 
                                title="Posunout cvik nahoru v plánu">
                            <i class="fas fa-chevron-up text-[10px]"></i>
                        </button>

                        <!-- Move Down Button -->
                        <button type="button" 
                                onclick="window.Gym.moveTemplateExercise('${mode}', ${idx}, 1)" 
                                ${idx === total - 1 ? 'disabled' : ''}
                                class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:pointer-events-none text-gray-300 hover:text-white flex items-center justify-center text-xs transition border border-white/5 active:scale-95" 
                                title="Posunout cvik dolů v plánu">
                            <i class="fas fa-chevron-down text-[10px]"></i>
                        </button>

                        <!-- Remove Button -->
                        <button type="button" 
                                onclick="window.Gym.removeTemplateExercise('${mode}', ${idx})" 
                                class="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 flex items-center justify-center text-xs transition border border-red-500/20 shadow-xs ml-0.5 active:scale-95" 
                                title="Odebrat cvik ze šablony">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </button>
                    </div>
                </div>

                <!-- Parameters grid -->
                <div class="grid grid-cols-4 gap-2 pt-0.5">
                    <div class="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <label class="block text-[8px] text-gray-400 font-bold uppercase text-center mb-0.5">Série</label>
                        <input type="number" min="1" max="20" id="${mode}-ex-sets-${exId}" value="${sets}" class="w-full bg-transparent text-center text-xs font-bold text-white outline-none focus:text-amber-400">
                    </div>
                    <div class="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <label class="block text-[8px] text-gray-400 font-bold uppercase text-center mb-0.5">Opakování</label>
                        <input type="number" min="1" max="100" id="${mode}-ex-reps-${exId}" value="${reps}" class="w-full bg-transparent text-center text-xs font-bold text-white outline-none focus:text-amber-400">
                    </div>
                    <div class="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <label class="block text-[8px] text-gray-400 font-bold uppercase text-center mb-0.5">Váha (kg)</label>
                        <input type="number" step="0.5" min="0" max="500" id="${mode}-ex-weight-${exId}" value="${weight}" class="w-full bg-transparent text-center text-xs font-bold text-white outline-none focus:text-amber-400">
                    </div>
                    <div class="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <label class="block text-[8px] text-gray-400 font-bold uppercase text-center mb-0.5">Pauza (s)</label>
                        <input type="number" step="5" min="0" max="600" id="${mode}-ex-rest-${exId}" value="${rest}" class="w-full bg-transparent text-center text-xs font-bold text-white outline-none focus:text-amber-400">
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}


// --- SCHEDULE TEMPLATE TO CALENDAR MODAL ---
export async function openScheduleTemplateModal(templateId, dateKeyOverride) {
    if (typeof dateKeyOverride === 'object' && dateKeyOverride?.stopPropagation) {
        dateKeyOverride.stopPropagation();
        dateKeyOverride = null;
    }
    triggerHaptic('light');

    if (typeof window !== 'undefined' && !window.Gym) {
        const m = await import('../main.js');
        if (m.attachWindowGym) m.attachWindowGym();
    }

    await ensureGymData();
    const templates = state.gymTemplates || [];
    const template = templates.find(t => t.id === templateId) || templates[0];
    if (!template) {
        showNotification('Nenalezena žádná šablona!', 'warning');
        return;
    }

    const defaultDate = (typeof dateKeyOverride === 'string' && dateKeyOverride) 
        ? dateKeyOverride 
        : new Date().toISOString().split('T')[0];

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tréninkový plán</label>
                <select id="sched-template-id" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    ${templates.map(t => `<option value="${t.id}" ${t.id === template.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Datum tréninku</label>
                    <input type="date" id="sched-workout-date" value="${defaultDate}" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                </div>
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Čas (volitelný)</label>
                    <input type="time" id="sched-workout-time" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                </div>
            </div>

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Poznámka / Cíl (volitelné)</label>
                <input type="text" id="sched-workout-note" placeholder="např. zkusit 90kg na bench, s Klárkou..." class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('schedule-template-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveScheduledTemplate()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#faa61a] to-[#e09216] hover:from-[#fbb138] hover:to-[#eb9b1d] text-black font-bold text-[10px] uppercase tracking-wider transition shadow-lg">
                Naplánovat do Kalendáře 📅
            </button>
        </div>
    `;

    document.getElementById('schedule-template-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'schedule-template-modal',
        title: 'Naplánovat trénink',
        subtitle: 'Uložení tréninku do společného kalendáře 🏋️‍♂️📅',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('schedule-template-modal').remove()"
    }));

    document.getElementById('schedule-template-modal')?.classList.remove('hidden');
    document.getElementById('schedule-template-modal')?.classList.add('flex');
}

export async function saveScheduledTemplate(renderGymFn) {
    triggerHaptic('medium');

    const templateId = document.getElementById('sched-template-id')?.value;
    const dateVal = document.getElementById('sched-workout-date')?.value;
    const timeVal = document.getElementById('sched-workout-time')?.value || '';
    const noteVal = document.getElementById('sched-workout-note')?.value?.trim() || '';

    if (!templateId || !dateVal) {
        showNotification('Vyplň datum i šablonu tréninku!', 'warning');
        return;
    }

    const template = (state.gymTemplates || []).find(t => t.id === templateId);
    const tmplName = template ? template.name : 'Trénink';

    const planId = crypto.randomUUID();
    const planData = {
        id: planId,
        date_key: dateVal,
        name: `🏋️‍♂️ ${tmplName}`,
        cat: 'gym',
        time: timeVal,
        note: noteVal || 'Naplánovaný trénink',
        status: 'confirmed',
        backup_plan: '',
        checklist: []
    };

    if (!state.plannedDates) state.plannedDates = {};
    state.plannedDates[dateVal] = planData;

    try {
        const { error } = await supabase.from('planned_dates').upsert({
            id: planId,
            date_key: dateVal,
            name: `🏋️‍♂️ ${tmplName}`,
            cat: 'gym',
            time: timeVal,
            note: noteVal || 'Naplánovaný trénink',
            status: 'confirmed',
            backup_plan: '',
            checklist: '[]',
            updated_at: new Date().toISOString()
        }, { onConflict: 'date_key' });

        if (error) throw error;

        showNotification(`Trénink "${tmplName}" naplánován na ${dateVal}! 📅💪`, 'success');
        document.getElementById('schedule-template-modal')?.remove();

        window.dispatchEvent(new CustomEvent('planned-dates-updated', {
            detail: { payload: { eventType: 'INSERT', new: planData } }
        }));
        if (renderGymFn) renderGymFn();
    } catch (err) {
        console.error('Failed to schedule workout:', err);
        showNotification('Chyba při ukládání plánu tréninku do kalendáře.', 'error');
    }
}

// --- MANUAL LOG MODAL & SETS ---
