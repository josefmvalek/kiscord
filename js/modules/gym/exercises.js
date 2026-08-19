import { supabase } from '../../core/supabase.js';
import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import { showNotification, showConfirmDialog } from '../../core/theme.js';
import { renderModal, renderInputGroup } from '../../core/ui.js';
import { calculate1RM } from './tools.js';
import { POPULAR_EXERCISE_PRESETS, defaultExercises } from './shared.js';

export const CATEGORY_EMOJIS = {
    'Hrudník': '🦍',
    'Záda': '🦅',
    'Ramena': '🥥',
    'Nohy': '🦵',
    'Ruce': '💪',
    'Břicho': '🍫',
    'Ostatní': '🏋️‍♂️'
};

export function getCategoryEmoji(category) {
    return CATEGORY_EMOJIS[category] || '🏋️‍♂️';
}

/**
 * Returns HTML for exercise thumbnail with image or emoji fallback.
 */
export function getExerciseThumbnailHtml(ex, sizeClass = 'w-12 h-12') {
    if (!ex) return `<div class="${sizeClass} rounded-xl bg-black/30 border border-white/5 flex items-center justify-center text-lg">🏋️‍♂️</div>`;

    const defaultEx = defaultExercises.find(d => d.id === ex.id);
    const imageUrl = ex.image_url || defaultEx?.image_url;
    const emoji = getCategoryEmoji(ex.category);

    if (imageUrl) {
        return `
            <div class="${sizeClass} rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 cursor-pointer group/thumb relative shadow-sm" onclick="event.stopPropagation(); window.Gym.openExerciseGuideModal('${ex.id}')" title="Kliknutím zobrazíte techniku cviku">
                <img src="${imageUrl}" alt="${ex.name}" class="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-lg\\'>${emoji}</div>';" />
            </div>
        `;
    }

    return `
        <div class="${sizeClass} rounded-xl bg-black/30 border border-white/5 flex items-center justify-center text-lg flex-shrink-0 cursor-pointer hover:border-amber-400/40 transition select-none" onclick="event.stopPropagation(); window.Gym.openExerciseGuideModal('${ex.id}')" title="Kliknutím zobrazíte techniku cviku">
            ${emoji}
        </div>
    `;
}

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
                                    <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition duration-150 exercise-tab-item cursor-pointer group" data-name="${ex.name.toLowerCase()}" onclick="window.Gym.openExerciseGuideModal('${ex.id}')">
                                        <div class="flex items-center gap-3 min-w-0">
                                            ${getExerciseThumbnailHtml(ex, 'w-12 h-12')}
                                            <div class="min-w-0">
                                                <h4 class="text-xs font-bold text-white truncate leading-snug group-hover:text-[#faa61a] transition-colors">${ex.name}</h4>
                                                <div class="flex items-center gap-1.5 mt-0.5">
                                                    ${ex.is_default ? `
                                                        <span class="text-[8px] font-black uppercase text-white/20 tracking-wider">Výchozí</span>
                                                    ` : `
                                                        <span class="text-[8px] font-black uppercase text-[#7289da]/80 tracking-wider">Vlastní</span>
                                                    `}
                                                    ${ex.instructions ? `<span class="text-[8px] text-amber-400/80 font-mono">📖 Návod</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="flex gap-1 flex-shrink-0 select-none" onclick="event.stopPropagation()">
                                            <button onclick="window.Gym.openExerciseAnalyticsModal('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition" title="Zobrazit graf pokroku">
                                                <i class="fas fa-chart-line text-[10px]"></i>
                                            </button>
                                            <button onclick="window.Gym.openEditExerciseModal('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-[#faa61a] hover:bg-[#faa61a]/10 transition" title="Upravit cvik">
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

// ==========================================
// EXERCISE TECHNIQUE GUIDE MODAL
// ==========================================

export function openExerciseGuideModal(exerciseId) {
    triggerHaptic('light');

    let ex = state.gymExercises.find(e => e.id === exerciseId);
    const defaultEx = defaultExercises.find(d => d.id === exerciseId);
    if (!ex && defaultEx) ex = defaultEx;
    if (!ex) return;

    const pr = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === exerciseId);
    const est1RM = pr ? calculate1RM(pr.weight, pr.reps) : null;
    const emoji = getCategoryEmoji(ex.category);
    const imageUrl = ex.image_url || defaultEx?.image_url;
    const instructions = ex.instructions || defaultEx?.instructions;

    const rawSecondary = (ex.secondary_muscles && (Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles.length > 0 : ex.secondary_muscles.trim()))
        ? ex.secondary_muscles
        : (defaultEx?.secondary_muscles || []);

    const secondaryList = Array.isArray(rawSecondary) 
        ? rawSecondary 
        : (typeof rawSecondary === 'string' ? rawSecondary.split(',').map(s => s.trim()) : []);

    const contentHtml = `
        <div class="space-y-4 text-left font-sans">
            <!-- Large Image / Animation Container (Square Aspect Ratio) -->
            ${imageUrl ? `
                <div class="relative w-full max-w-[320px] aspect-square mx-auto rounded-3xl overflow-hidden border border-white/10 bg-white shadow-2xl group flex items-center justify-center p-2">
                    <img src="${imageUrl}" alt="${ex.name}" class="w-full h-full object-contain rounded-2xl" onerror="this.parentElement.classList.add('hidden');" />
                    <div class="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[10px] text-white font-mono border border-white/10 flex items-center gap-1 shadow-md">
                        <span>${emoji}</span>
                        <span>${ex.category}</span>
                    </div>
                </div>
            ` : `
                <div class="w-full max-w-[320px] aspect-square mx-auto rounded-3xl bg-gradient-to-br from-white/5 to-black/40 border border-white/10 flex flex-col items-center justify-center text-center p-4 shadow-inner">
                    <span class="text-6xl mb-2">${emoji}</span>
                    <span class="text-sm font-bold text-gray-200 font-sans">${ex.name}</span>
                    <span class="text-xs text-gray-400 font-mono mt-0.5">${ex.category}</span>
                </div>
            `}

            <!-- Muscles Targeted -->
            <div class="space-y-1.5">
                <div class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Zapojené svalové partie:</div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="px-2.5 py-1 rounded-xl bg-[#faa61a]/15 border border-[#faa61a]/30 text-amber-300 font-bold text-xs flex items-center gap-1">
                        <span>🎯 Primární:</span>
                        <strong class="text-white">${ex.category}</strong>
                    </span>
                    ${secondaryList.map(sec => `
                        <span class="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium">
                            ${sec}
                        </span>
                    `).join('')}
                </div>
            </div>

            <!-- Technique Instructions -->
            <div class="space-y-1.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div class="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <span>📖</span>
                    <span>Správná technika a tipy k provedení:</span>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed font-sans mt-1">
                    ${ex.instructions || 'K tomuto cviku zatím není zapsán podrobný návod na techniku. Můžeš ho přidat při editaci cviku ✏️.'}
                </p>
            </div>

            <!-- Personal Record Banner -->
            ${pr ? `
                <div class="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 font-mono text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🏆</span>
                        <div>
                            <div class="text-[10px] font-black text-amber-400 uppercase font-sans">Tvůj osobní rekord</div>
                            <div class="text-white font-bold">${pr.weight} kg × ${pr.reps} op.</div>
                        </div>
                    </div>
                    ${est1RM ? `
                        <div class="text-right">
                            <div class="text-[10px] text-gray-400 font-sans">Odhadované 1RM</div>
                            <div class="text-amber-300 font-bold">~${est1RM} kg</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-between items-center w-full gap-2">
            <button onclick="window.Gym.openExerciseAnalyticsModal('${ex.id}'); document.getElementById('exercise-guide-modal')?.remove();" 
                    class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-[10px] uppercase tracking-wider transition flex items-center gap-1.5">
                <i class="fas fa-chart-line text-[10px]"></i> Historie pokroků
            </button>
            <button onclick="document.getElementById('exercise-guide-modal')?.remove()" 
                    class="px-5 py-2.5 rounded-xl bg-[#faa61a] hover:bg-[#e09216] text-black font-black text-[10px] uppercase tracking-wider transition">
                Zavřít
            </button>
        </div>
    `;

    document.getElementById('exercise-guide-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'exercise-guide-modal',
        title: `${ex.name} ${emoji}`,
        subtitle: `Průvodce cvikem a správná technika (${ex.category})`,
        size: 'lg',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('exercise-guide-modal')?.remove()"
    }));

    const modalEl = document.getElementById('exercise-guide-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }
}

// ==========================================
// CREATE & EDIT EXERCISE MODALS
// ==========================================

export function openCreateExerciseModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left font-sans">
            <!-- Quick Preset Template Picker -->
            <div class="p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 rounded-2xl space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span>⚡</span> Rychlý výběr z populárních šablon cviků
                    </span>
                    <span class="text-[9px] text-gray-400 font-mono font-bold">1 klik = vyplněno</span>
                </div>
                <select id="preset-exercise-selector" onchange="window.Gym.applyExercisePreset(this.value)" class="w-full bg-[#18191c] text-white text-xs p-2.5 rounded-xl border border-amber-500/30 outline-none focus:border-amber-400 transition font-bold cursor-pointer">
                    <option value="">-- Vybrat šablonu (${POPULAR_EXERCISE_PRESETS.length} cviků s GymVisual GIFy) --</option>
                    ${POPULAR_EXERCISE_PRESETS.map((p, idx) => `
                        <option value="${idx}">${getCategoryEmoji(p.category)} ${p.name} (${p.category})</option>
                    `).join('')}
                </select>
            </div>

            ${renderInputGroup({
                label: 'Název nového cviku',
                id: 'new-ex-name',
                placeholder: 'např. Dřep s činkou vzadu, Peck Deck...'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie / Primární partie</label>
                <select id="new-ex-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all font-bold">
                    <option value="Hrudník">Hrudník 🦍</option>
                    <option value="Záda">Záda 🦅</option>
                    <option value="Ramena">Ramena 🥥</option>
                    <option value="Nohy">Nohy 🦵</option>
                    <option value="Ruce">Ruce 💪</option>
                    <option value="Břicho">Břicho 🍫</option>
                    <option value="Ostatní">Ostatní 🏋️‍♂️</option>
                </select>
            </div>

            ${renderInputGroup({
                label: 'Sekundární svaly (volitelné, oddělené čárkou)',
                id: 'new-ex-secondary',
                placeholder: 'např. Triceps, Přední ramena...'
            })}

            ${renderInputGroup({
                label: 'URL obrázku nebo GIFu (volitelné)',
                id: 'new-ex-image-url',
                placeholder: 'https://raw.githubusercontent.com/... nebo vlastní GIF URL'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Návod na správnou techniku (volitelné)</label>
                <textarea id="new-ex-instructions" rows="3" placeholder="Popiš správnou techniku, polohu těla a dýchání..." class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition"></textarea>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('create-exercise-modal')?.remove()" 
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
        size: 'lg',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('create-exercise-modal')?.remove()"
    }));

    const modalEl = document.getElementById('create-exercise-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }
}

export function applyExercisePreset(presetIndex) {
    if (presetIndex === "" || presetIndex === null || presetIndex === undefined) return;
    const preset = POPULAR_EXERCISE_PRESETS[parseInt(presetIndex, 10)];
    if (!preset) return;

    triggerHaptic('light');

    const nameInput = document.getElementById('new-ex-name');
    const catSelect = document.getElementById('new-ex-cat');
    const secInput = document.getElementById('new-ex-secondary');
    const imgInput = document.getElementById('new-ex-image-url');
    const instTextarea = document.getElementById('new-ex-instructions');

    if (nameInput) nameInput.value = preset.name;
    if (catSelect) catSelect.value = preset.category;
    if (secInput) secInput.value = (preset.secondary_muscles || []).join(', ');
    if (imgInput) imgInput.value = preset.image_url || '';
    if (instTextarea) instTextarea.value = preset.instructions || '';

    showNotification(`Šablona "${preset.name}" vyplněna ⚡`, 'info');
}

export async function saveExercise(renderGymFn) {
    triggerHaptic('medium');

    const name = document.getElementById('new-ex-name')?.value.trim();
    const category = document.getElementById('new-ex-cat')?.value || 'Hrudník';
    const secondaryStr = document.getElementById('new-ex-secondary')?.value.trim() || '';
    const imageUrl = document.getElementById('new-ex-image-url')?.value.trim() || null;
    const instructions = document.getElementById('new-ex-instructions')?.value.trim() || null;

    if (!name) {
        showNotification('Prosím zadej název cviku!', 'warning');
        return;
    }

    const secondaryMuscles = secondaryStr 
        ? secondaryStr.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    try {
        const { error } = await supabase
            .from('gym_exercises')
            .insert({
                id,
                name,
                category,
                secondary_muscles: secondaryMuscles,
                image_url: imageUrl,
                instructions,
                is_default: false,
                created_by: state.currentUser?.id
            });

        if (error) {
            console.error("[Gym] Supabase insert error:", error);
            if (error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
                showNotification('⚠️ V Supabase chybí sloupce pro obrázky. Spusť migraci 20260818_gym_exercise_media.sql v Supabase SQL editoru!', 'warning', 8000);
            }
            throw error;
        }

        showNotification('Nový cvik byl úspěšně přidán! 🏋️‍♂️', 'success');
        document.getElementById('create-exercise-modal')?.remove();
        
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
        else if (window.Gym && window.Gym.renderGym) window.Gym.renderGym();
    } catch (e) {
        console.error("[Gym] Failed to save exercise:", e);
        showNotification(`Nepodařilo se uložit cvik: ${e.message || 'Zkontroluj unikátnost názvu'}`, 'danger');
    }
}

export function openEditExerciseModal(exerciseId) {
    triggerHaptic('light');

    let ex = state.gymExercises.find(e => e.id === exerciseId);
    const defaultEx = defaultExercises.find(d => d.id === exerciseId);
    if (!ex && defaultEx) ex = defaultEx;
    if (!ex) return;

    const rawSecondary = (ex.secondary_muscles && (Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles.length > 0 : ex.secondary_muscles.trim()))
        ? ex.secondary_muscles
        : (defaultEx?.secondary_muscles || []);

    const secondaryStr = Array.isArray(rawSecondary)
        ? rawSecondary.join(', ')
        : (rawSecondary || '');

    const imageUrl = ex.image_url || defaultEx?.image_url || '';
    const instructions = ex.instructions || defaultEx?.instructions || '';

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
                <select id="edit-ex-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all font-bold">
                    ${['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho', 'Ostatní'].map(cat => `
                        <option value="${cat}" ${ex.category === cat ? 'selected' : ''}>${cat}</option>
                    `).join('')}
                </select>
            </div>

            ${renderInputGroup({
                label: 'Sekundární svaly (oddělené čárkou)',
                id: 'edit-ex-secondary',
                placeholder: 'např. Triceps, Ramena...',
                value: secondaryStr
            })}

            ${renderInputGroup({
                label: 'URL obrázku nebo GIFu',
                id: 'edit-ex-image-url',
                placeholder: 'https://...',
                value: imageUrl
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Návod na správnou techniku</label>
                <textarea id="edit-ex-instructions" rows="3" placeholder="Popiš správnou techniku, polohu těla a dýchání..." class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition">${instructions}</textarea>
            </div>
            
            <input type="hidden" id="edit-ex-id" value="${exerciseId}">
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('edit-exercise-modal')?.remove()" 
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
        subtitle: 'Uprav detaily a techniku cviku 🏋️‍♂️',
        size: 'lg',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('edit-exercise-modal')?.remove()"
    }));

    const modalEl = document.getElementById('edit-exercise-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }
}

export async function saveEditedExercise(renderGymFn) {
    triggerHaptic('medium');

    const id = document.getElementById('edit-ex-id')?.value;
    const name = document.getElementById('edit-ex-name')?.value.trim();
    const category = document.getElementById('edit-ex-cat')?.value;
    const secondaryStr = document.getElementById('edit-ex-secondary')?.value.trim() || '';
    const imageUrl = document.getElementById('edit-ex-image-url')?.value.trim() || null;
    const instructions = document.getElementById('edit-ex-instructions')?.value.trim() || null;

    if (!name) {
        showNotification('Název cviku nesmí být prázdný!', 'warning');
        return;
    }

    const secondaryMuscles = secondaryStr 
        ? secondaryStr.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    try {
        const { error } = await supabase
            .from('gym_exercises')
            .update({
                name,
                category,
                secondary_muscles: secondaryMuscles,
                image_url: imageUrl,
                instructions
            })
            .eq('id', id);

        if (error) {
            console.error("[Gym] Supabase update error:", error);
            if (error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
                showNotification('⚠️ V Supabase chybí sloupce pro obrázky. Spusť migraci 20260818_gym_exercise_media.sql v Supabase SQL editoru!', 'warning', 8000);
            }
            throw error;
        }

        showNotification('Cvik byl úspěšně upraven! 🏋️‍♂️', 'success');
        document.getElementById('edit-exercise-modal')?.remove();
        
        await ensureGymData(true);
        if (renderGymFn) renderGymFn();
        else if (window.Gym && window.Gym.renderGym) window.Gym.renderGym();
    } catch (e) {
        console.error("[Gym] Failed to edit exercise:", e);
        showNotification(`Nepodařilo se uložit změny cviku: ${e.message || 'Chyba databáze'}`, 'danger');
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

    const confirmed = await showConfirmDialog(confirmMsg);
    if (!confirmed) return;

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
        else if (window.Gym && window.Gym.renderGym) window.Gym.renderGym();
    } catch (e) {
        console.error("[Gym] Failed to delete exercise:", e);
        showNotification('Nepodařilo se smazat cvik z databáze.', 'danger');
    }
}
