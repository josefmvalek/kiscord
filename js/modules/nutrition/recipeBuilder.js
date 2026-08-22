import { state, saveStateToCache } from '../../core/state.js';
import { triggerHaptic, escapeHTML } from '../../core/utils.js';
import { showNotification } from '../../core/theme.js';

let draftIngredients = [];

/**
 * Calculates recipe totals and per-portion values.
 */
export function calculateRecipeNutrition(ingredients = [], portions = 1) {
    const validPortions = Math.max(1, Number(portions) || 1);
    const totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        totalWeightGrams: 0
    };

    ingredients.forEach(ing => {
        const factor = (Number(ing.amount_g) || 100) / 100;
        totals.calories += (Number(ing.calories) || 0) * factor;
        totals.protein += (Number(ing.protein) || 0) * factor;
        totals.carbs += (Number(ing.carbs) || 0) * factor;
        totals.fats += (Number(ing.fats) || 0) * factor;
        totals.fiber += (Number(ing.fiber) || 0) * factor;
        totals.totalWeightGrams += Number(ing.amount_g) || 100;
    });

    return {
        portions: validPortions,
        total: {
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fats: Math.round(totals.fats * 10) / 10,
            fiber: Math.round(totals.fiber * 10) / 10,
            weight_g: Math.round(totals.totalWeightGrams)
        },
        perPortion: {
            calories: Math.round(totals.calories / validPortions),
            protein: Math.round((totals.protein / validPortions) * 10) / 10,
            carbs: Math.round((totals.carbs / validPortions) * 10) / 10,
            fats: Math.round((totals.fats / validPortions) * 10) / 10,
            fiber: Math.round((totals.fiber / validPortions) * 10) / 10,
            weight_g: Math.round(totals.totalWeightGrams / validPortions)
        }
    };
}

/**
 * Renders the Recipe Builder & Batch Meal Prep View.
 */
export function renderRecipeBuilder() {
    const recipes = (state.savedFoods || []).filter(f => f.isRecipe);

    return `
        <div class="space-y-6">
            <!-- New Recipe Creator -->
            <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-white/5">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-amber-500/20 text-[#faa61a] flex items-center justify-center text-sm font-bold">
                            <i class="fas fa-blender"></i>
                        </span>
                        <div>
                            <h3 class="text-sm font-black text-white uppercase tracking-wider">Kalkulátor Receptů & Meal Prep</h3>
                            <p class="text-[10px] text-gray-400">Přidej ingredience a spočítej přesná makra na 1 porci</p>
                        </div>
                    </div>
                </div>

                <form id="recipe-builder-form" onsubmit="window.saveCreatedRecipe(event)" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="sm:col-span-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Název receptu</label>
                            <input 
                                type="text" 
                                id="recipe-name" 
                                required 
                                placeholder="např. Boloňské těstoviny (4 porce)"
                                class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#faa61a]"
                            />
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Počet porcí</label>
                            <input 
                                type="number" 
                                id="recipe-portions" 
                                required 
                                min="1" 
                                value="4" 
                                oninput="window.updateRecipePreview()"
                                class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#faa61a]"
                            />
                        </div>
                    </div>

                    <!-- Ingredients List -->
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Ingredience receptu:</label>
                        <div id="recipe-ingredients-list" class="space-y-1.5 max-h-48 overflow-y-auto">
                            ${renderDraftIngredientsList()}
                        </div>

                        <!-- Add Ingredient Input Row -->
                        <div class="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-2 border-t border-white/5">
                            <input type="text" id="ing-name" placeholder="Ingredience (např. Hovězí mleté)" class="sm:col-span-2 bg-[#202225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white" />
                            <input type="number" id="ing-amount" placeholder="Gramáž (g)" class="bg-[#202225] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                            <input type="number" id="ing-cals" placeholder="Kcal / 100g" class="bg-[#202225] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                            <input type="number" id="ing-prot" placeholder="Protein / 100g" step="0.1" class="bg-[#202225] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                            <button 
                                type="button" 
                                onclick="window.addDraftIngredient()"
                                class="bg-[#faa61a] hover:bg-[#faa61a]/90 text-black font-extrabold rounded-lg text-xs py-1.5 transition flex items-center justify-center gap-1"
                            >
                                <i class="fas fa-plus"></i> <span>Přidat</span>
                            </button>
                        </div>
                    </div>

                    <!-- Dynamic Live Calculated Macros per Portion Preview -->
                    <div id="recipe-live-preview" class="p-3 bg-[#202225] rounded-xl border border-amber-500/20 text-xs flex items-center justify-between">
                        ${renderRecipePreviewHtml()}
                    </div>

                    <button 
                        type="submit" 
                        class="w-full py-2.5 bg-[#faa61a] hover:bg-[#faa61a]/90 text-black font-black uppercase tracking-wider rounded-xl text-xs transition shadow-lg shadow-[#faa61a]/20 flex items-center justify-center gap-2"
                    >
                        <i class="fas fa-save"></i> <span>Uložit recept do oblíbených jídel</span>
                    </button>
                </form>
            </div>

            <!-- Saved Recipes List -->
            <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-3">
                <h4 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-book-open text-[#faa61a]"></i> <span>Moje Uložené Recepty (${recipes.length})</span>
                </h4>

                ${recipes.length === 0 ? `
                    <div class="text-center py-6 text-xs text-gray-500 italic">Zatím nemáš uložené žádné recepty. Vytvoř si první výše!</div>
                ` : `
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${recipes.map(rec => `
                            <div class="bg-[#202225] p-3.5 rounded-xl border border-white/5 space-y-2 flex flex-col justify-between">
                                <div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-extrabold text-white truncate">${escapeHTML(rec.name)}</span>
                                        <span class="text-[10px] text-[#faa61a] font-bold">${rec.portions || 1} porce</span>
                                    </div>
                                    <div class="text-[10px] text-gray-400 mt-1">
                                        Na 1 porci (${rec.amount_g}g):
                                    </div>
                                    <div class="text-xs font-black text-white mt-0.5">
                                        ${rec.calories} kcal <span class="text-[10px] font-normal text-gray-400">(${rec.protein}g B • ${rec.carbs}g S • ${rec.fats}g T)</span>
                                    </div>
                                </div>
                                <div class="pt-2 flex items-center gap-2">
                                    <button 
                                        onclick="window.quickLogSavedRecipe('${rec.id}')"
                                        class="flex-1 py-1.5 bg-[#14b8a6]/20 hover:bg-[#14b8a6] text-[#14b8a6] hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                    >
                                        <i class="fas fa-plus text-[10px]"></i> <span>Zapsat 1 porci</span>
                                    </button>
                                    <button 
                                        onclick="window.deleteSavedRecipe('${rec.id}')"
                                        class="w-7 h-7 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 rounded-lg text-xs flex items-center justify-center transition"
                                    >
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderDraftIngredientsList() {
    if (draftIngredients.length === 0) {
        return `<div class="text-[11px] text-gray-500 italic p-2 bg-[#202225] rounded-lg">Zatím nebyly přidány žádné ingredience.</div>`;
    }
    return draftIngredients.map((ing, idx) => `
        <div class="flex items-center justify-between p-2 bg-[#202225] rounded-lg border border-white/5 text-xs">
            <span class="font-bold text-white">${escapeHTML(ing.name)} (${ing.amount_g}g)</span>
            <div class="flex items-center gap-3">
                <span class="text-gray-400">${Math.round(ing.calories * ing.amount_g / 100)} kcal</span>
                <span class="text-[#5865F2] font-semibold">${Math.round(ing.protein * ing.amount_g / 100 * 10) / 10}g P</span>
                <button type="button" onclick="window.removeDraftIngredient(${idx})" class="text-gray-500 hover:text-rose-400 text-xs">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderRecipePreviewHtml() {
    const portions = Number(document.getElementById('recipe-portions')?.value) || 4;
    const calc = calculateRecipeNutrition(draftIngredients, portions);

    return `
        <div>
            <span class="text-[10px] text-gray-400 uppercase font-bold block">Hodnoty na 1 porci:</span>
            <span class="text-sm font-black text-white">${calc.perPortion.calories} kcal</span>
            <span class="text-gray-400 text-[11px] ml-1">(${calc.perPortion.protein}g B • ${calc.perPortion.carbs}g S • ${calc.perPortion.fats}g T)</span>
        </div>
        <div class="text-right text-[11px] text-gray-400">
            Celkem: <strong class="text-white">${calc.total.calories} kcal</strong> (${calc.total.weight_g}g)
        </div>
    `;
}

// Global window event bindings
window.addDraftIngredient = () => {
    const name = document.getElementById('ing-name')?.value?.trim();
    const amount = Number(document.getElementById('ing-amount')?.value) || 100;
    const cals = Number(document.getElementById('ing-cals')?.value) || 150;
    const prot = Number(document.getElementById('ing-prot')?.value) || 5;

    if (!name) {
        showNotification('Zadej prosím název ingredience.', 'warning');
        return;
    }

    draftIngredients.push({
        name,
        amount_g: amount,
        calories: cals,
        protein: prot,
        carbs: Math.round(cals * 0.1),
        fats: Math.round(cals * 0.03),
        fiber: 0
    });

    document.getElementById('ing-name').value = '';
    document.getElementById('ing-amount').value = '';
    document.getElementById('ing-cals').value = '';
    document.getElementById('ing-prot').value = '';

    triggerHaptic('light');
    window.updateRecipePreview();
};

window.removeDraftIngredient = (idx) => {
    draftIngredients.splice(idx, 1);
    triggerHaptic('light');
    window.updateRecipePreview();
};

window.updateRecipePreview = () => {
    const listEl = document.getElementById('recipe-ingredients-list');
    if (listEl) listEl.innerHTML = renderDraftIngredientsList();
    const prevEl = document.getElementById('recipe-live-preview');
    if (prevEl) prevEl.innerHTML = renderRecipePreviewHtml();
};

window.saveCreatedRecipe = (e) => {
    e.preventDefault();
    const name = document.getElementById('recipe-name')?.value?.trim();
    const portions = Number(document.getElementById('recipe-portions')?.value) || 4;

    if (!name || draftIngredients.length === 0) {
        showNotification('Přidej alespoň jednu ingredienci!', 'warning');
        return;
    }

    const calc = calculateRecipeNutrition(draftIngredients, portions);
    const newRecipe = {
        id: 'rec_' + Date.now(),
        isRecipe: true,
        name,
        portions,
        amount_g: calc.perPortion.weight_g,
        calories: calc.perPortion.calories,
        protein: calc.perPortion.protein,
        carbs: calc.perPortion.carbs,
        fats: calc.perPortion.fats,
        fiber: calc.perPortion.fiber,
        ingredients: [...draftIngredients]
    };

    if (!state.savedFoods) state.savedFoods = [];
    state.savedFoods.push(newRecipe);

    saveStateToCache();
    draftIngredients = [];
    triggerHaptic('success');
    showNotification(`Recept „${name}“ byl uložen! 🍲✨`, 'success');

    import('./index.js').then(m => m.renderNutrition()).catch(() => {});
};

window.quickLogSavedRecipe = (recipeId) => {
    const rec = (state.savedFoods || []).find(f => f.id === recipeId);
    if (!rec) return;

    window.openAddFoodModal('lunch', rec);
};

window.deleteSavedRecipe = (recipeId) => {
    state.savedFoods = (state.savedFoods || []).filter(f => f.id !== recipeId);
    saveStateToCache();
    triggerHaptic('medium');
    showNotification('Recept byl smazán.', 'info');
    import('./index.js').then(m => m.renderNutrition()).catch(() => {});
};
