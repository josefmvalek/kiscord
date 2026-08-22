import { state, saveStateToCache } from '../../core/state.js';
import { triggerHaptic, escapeHTML } from '../../core/utils.js';
import { showNotification } from '../../core/theme.js';
import { calculatePortionMacros } from './macroCalculator.js';
import { parseFoodNaturalLanguage } from './nlpParser.js';
import { searchOpenFoodFacts, lookupBarcode } from './openFoodFacts.js';

export const DEFAULT_FOOD_PRESETS = [
    { id: 'f_eggs', name: 'Vejce (2 ks)', amount_g: 110, calories: 155, protein: 13, carbs: 1.1, fats: 11, fiber: 0 },
    { id: 'f_oats', name: 'Ovesné vločky', amount_g: 60, calories: 225, protein: 8, carbs: 36, fats: 4.2, fiber: 6 },
    { id: 'f_chicken', name: 'Kuřecí prsa (restovaná)', amount_g: 150, calories: 245, protein: 46, carbs: 0, fats: 5.5, fiber: 0 },
    { id: 'f_rice', name: 'Jasmínová rýže (vařená)', amount_g: 180, calories: 235, protein: 4.5, carbs: 51, fats: 0.6, fiber: 1 },
    { id: 'f_quark', name: 'Odtučněný tvaroh', amount_g: 250, calories: 170, protein: 30, carbs: 10, fats: 0.5, fiber: 0 },
    { id: 'f_protein_shake', name: 'Proteinový shake (syrovátka)', amount_g: 30, calories: 120, protein: 24, carbs: 2, fats: 1.5, fiber: 0.5 },
    { id: 'f_banana', name: 'Banán (1 ks)', amount_g: 120, calories: 105, protein: 1.3, carbs: 27, fats: 0.3, fiber: 3 },
    { id: 'f_peanut_butter', name: 'Arašídové máslo', amount_g: 25, calories: 150, protein: 6.5, carbs: 5, fats: 12.5, fiber: 1.8 }
];

let activeTab = 'quick'; // 'quick' | 'ai_parser' | 'off_search' | 'saved'
let currentMealType = 'lunch';
let searchDebounceTimeout = null;

/**
 * Opens Add Food Modal with Multi-Modal tabs.
 */
export function openAddFoodModal(mealType = 'lunch', prefilledFood = null) {
    currentMealType = mealType;
    window.currentNutritionMealType = mealType;
    activeTab = prefilledFood ? 'quick' : 'quick';

    triggerHaptic('light');

    let modalEl = document.getElementById('nutrition-modal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'nutrition-modal';
        modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity';
        document.body.appendChild(modalEl);
    }

    renderModalContent(modalEl, prefilledFood);
    modalEl.style.display = 'flex';
}

function renderModalContent(container, prefilledFood = null) {
    const mealTitles = {
        breakfast: 'Snídaně',
        lunch: 'Oběd',
        dinner: 'Večeře',
        snack: 'Svačina / Pre-workout'
    };

    const savedList = [...DEFAULT_FOOD_PRESETS, ...(state.savedFoods || [])];

    container.innerHTML = `
        <div class="bg-[#2f3136] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-4 border-b border-white/5 bg-[#202225]">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-[#14b8a6]/20 text-[#14b8a6] flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-plus"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Přidat do: ${mealTitles[currentMealType] || 'Jídlo'}</h3>
                        <p class="text-[10px] text-gray-400">Rychlé zadání, AI textový parser, vyhledávač nebo oblíbené</p>
                    </div>
                </div>
                <button onclick="window.closeNutritionModal()" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-xs transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Multi-Modal Navigation Tabs -->
            <div class="grid grid-cols-4 p-1 bg-[#202225] border-b border-white/5 gap-1 text-[11px]">
                <button 
                    onclick="window.switchNutritionTab('quick')" 
                    class="py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${activeTab === 'quick' ? 'bg-[#14b8a6] text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                >
                    <i class="fas fa-bolt text-[10px]"></i> <span>Rychlé</span>
                </button>
                <button 
                    onclick="window.switchNutritionTab('ai_parser')" 
                    class="py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${activeTab === 'ai_parser' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                >
                    <i class="fas fa-robot text-[10px]"></i> <span>AI Text</span>
                </button>
                <button 
                    onclick="window.switchNutritionTab('off_search')" 
                    class="py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${activeTab === 'off_search' ? 'bg-[#faa61a] text-black shadow-sm' : 'text-gray-400 hover:text-white'}"
                >
                    <i class="fas fa-search text-[10px]"></i> <span>Hledat</span>
                </button>
                <button 
                    onclick="window.switchNutritionTab('saved')" 
                    class="py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                >
                    <i class="fas fa-star text-[10px]"></i> <span>Oblíbené</span>
                </button>
            </div>

            <!-- Tab Content Area -->
            <div class="p-4 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
                ${activeTab === 'quick' ? renderQuickAddForm(prefilledFood) : ''}
                ${activeTab === 'ai_parser' ? renderAITextParserTab() : ''}
                ${activeTab === 'off_search' ? renderOpenFoodFactsSearchTab() : ''}
                ${activeTab === 'saved' ? renderSavedFoodsList(savedList) : ''}
            </div>
        </div>
    `;
}

function renderQuickAddForm(food = null) {
    return `
        <form id="quick-food-form" onsubmit="window.submitQuickFood(event)" class="space-y-3">
            <div>
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Název jídla / položky</label>
                <input 
                    type="text" 
                    id="food-name" 
                    required 
                    placeholder="např. Kuřecí steak s rýží" 
                    value="${food?.food_name || food?.name || ''}"
                    class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14b8a6] transition"
                />
            </div>

            <div class="grid grid-cols-2 gap-2.5">
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Kalorie (kcal)</label>
                    <input 
                        type="number" 
                        id="food-calories" 
                        required 
                        min="0"
                        placeholder="kcal" 
                        value="${food?.calories ?? ''}"
                        class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#14b8a6] transition"
                    />
                </div>
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Gramáž porce (g / ml)</label>
                    <input 
                        type="number" 
                        id="food-amount" 
                        min="0"
                        placeholder="např. 150" 
                        value="${food?.amount_g ?? ''}"
                        class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14b8a6] transition"
                    />
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label class="block text-[10px] font-black text-[#5865F2] uppercase tracking-wider mb-1">Bílkoviny (g)</label>
                    <input 
                        type="number" 
                        id="food-protein" 
                        step="0.1" 
                        min="0"
                        placeholder="g" 
                        value="${food?.protein ?? ''}"
                        class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#5865F2] transition"
                    />
                </div>
                <div>
                    <label class="block text-[10px] font-black text-[#faa61a] uppercase tracking-wider mb-1">Sacharidy (g)</label>
                    <input 
                        type="number" 
                        id="food-carbs" 
                        step="0.1" 
                        min="0"
                        placeholder="g" 
                        value="${food?.carbs ?? ''}"
                        class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#faa61a] transition"
                    />
                </div>
                <div>
                    <label class="block text-[10px] font-black text-[#ed4245] uppercase tracking-wider mb-1">Tuky (g)</label>
                    <input 
                        type="number" 
                        id="food-fats" 
                        step="0.1" 
                        min="0"
                        placeholder="g" 
                        value="${food?.fats ?? ''}"
                        class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#ed4245] transition"
                    />
                </div>
            </div>

            <div class="pt-2 flex items-center gap-2">
                <button 
                    type="submit" 
                    class="flex-1 py-2.5 px-4 bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-[#14b8a6]/20 flex items-center justify-center gap-2"
                >
                    <i class="fas fa-check"></i> <span>Zapsat jídlo</span>
                </button>
            </div>
        </form>
    `;
}

function renderAITextParserTab() {
    return `
        <div class="space-y-3">
            <div>
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
                    Napiš celé jídlo přirozenou větou:
                </label>
                <textarea 
                    id="ai-food-textarea"
                    rows="3"
                    placeholder="např. 2 míchaná vejce na másle, 80g ovesné vločky, 30g protein, banán"
                    class="w-full bg-[#202225] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#5865F2] transition leading-relaxed"
                ></textarea>
            </div>

            <button 
                type="button" 
                onclick="window.runAIFoodParser()"
                class="w-full py-2.5 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
            >
                <i class="fas fa-wand-magic-sparkles"></i> <span>Rozpoznat a zapsat položky</span>
            </button>

            <div id="ai-parser-preview" class="space-y-2 pt-2"></div>
        </div>
    `;
}

function renderOpenFoodFactsSearchTab() {
    return `
        <div class="space-y-3">
            <div class="flex items-center gap-2">
                <div class="relative flex-1">
                    <i class="fas fa-search absolute left-3 top-3 text-gray-500 text-xs"></i>
                    <input 
                        type="text" 
                        id="off-search-input"
                        placeholder="Hledej produkt nebo EAN kód..."
                        oninput="window.handleOFFSearchInput(this.value)"
                        class="w-full bg-[#202225] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#faa61a]"
                    />
                </div>
            </div>

            <div id="off-search-results" class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                <div class="text-center py-6 text-xs text-gray-500 italic">
                    Zadej alespoň 2 znaky pro vyhledání v databázi OpenFoodFacts
                </div>
            </div>
        </div>
    `;
}

function renderSavedFoodsList(savedList) {
    return `
        <div class="space-y-2">
            <p class="text-[11px] text-gray-400 mb-2">Kliknutím na jídlo jej ihned zapíšeš do vybraného chodu:</p>
            <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                ${savedList.map(food => `
                    <div 
                        onclick="window.selectSavedFoodPreset('${food.id}')"
                        class="flex items-center justify-between p-2.5 bg-[#202225] hover:bg-[#14b8a6]/10 border border-white/5 hover:border-[#14b8a6]/30 rounded-xl cursor-pointer transition group"
                    >
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold text-white group-hover:text-[#14b8a6] transition truncate">${escapeHTML(food.name)}</div>
                            <div class="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                                <span>${food.amount_g || 100}g</span> • 
                                <span class="text-[#5865F2] font-semibold">${food.protein}g B</span>
                                <span class="text-[#faa61a] font-semibold">${food.carbs}g S</span>
                                <span class="text-[#ed4245] font-semibold">${food.fats}g T</span>
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0 ml-2">
                            <span class="text-xs font-black text-white">${food.calories}</span>
                            <span class="text-[10px] text-gray-400 block">kcal</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Global Event Bindings
window.closeNutritionModal = () => {
    const el = document.getElementById('nutrition-modal');
    if (el) el.style.display = 'none';
};

window.switchNutritionTab = (tab) => {
    activeTab = tab;
    const el = document.getElementById('nutrition-modal');
    if (el) renderModalContent(el);
};

window.selectSavedFoodPreset = (foodId) => {
    const savedList = [...DEFAULT_FOOD_PRESETS, ...(state.savedFoods || [])];
    const food = savedList.find(f => f.id === foodId);
    if (!food) return;

    activeTab = 'quick';
    const el = document.getElementById('nutrition-modal');
    if (el) renderModalContent(el, food);
};

window.runAIFoodParser = () => {
    const text = document.getElementById('ai-food-textarea')?.value?.trim();
    if (!text) return;

    triggerHaptic('medium');
    const parsed = parseFoodNaturalLanguage(text);

    if (parsed.length === 0) {
        showNotification('Nebylo rozpoznáno žádné jídlo.', 'warning');
        return;
    }

    // Insert all parsed items into state
    parsed.forEach(item => {
        const newItem = {
            id: 'nutr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            user_id: state.currentUser?.id,
            user_name: state.currentUser?.name || 'josef',
            date_key: new Date().toISOString().split('T')[0],
            meal_type: currentMealType,
            food_name: item.food_name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            fiber: item.fiber || 0,
            amount_g: item.amount_g,
            created_at: new Date().toISOString()
        };

        const todayKey = newItem.date_key;
        if (!state.nutritionLogs) state.nutritionLogs = {};
        if (!state.nutritionLogs[todayKey]) state.nutritionLogs[todayKey] = [];
        state.nutritionLogs[todayKey].push(newItem);
    });

    saveStateToCache();
    window.closeNutritionModal();
    showNotification(`AI úspěšně rozpoznalo a zapsalo ${parsed.length} položek! 🤖🥗`, 'success');

    import('./index.js').then(m => m.renderNutrition()).catch(() => {});
};

window.handleOFFSearchInput = (query) => {
    if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(async () => {
        const resultsEl = document.getElementById('off-search-results');
        if (!resultsEl) return;

        if (query.trim().length < 2) {
            resultsEl.innerHTML = `<div class="text-center py-6 text-xs text-gray-500 italic">Zadej alespoň 2 znaky...</div>`;
            return;
        }

        resultsEl.innerHTML = `<div class="text-center py-6 text-xs text-gray-400 animate-pulse"><i class="fas fa-spinner fa-spin mr-1"></i> Vyhledávám v OpenFoodFacts...</div>`;

        const isBarcodeOnly = /^\d{8,14}$/.test(query.trim());
        const products = isBarcodeOnly ? [await lookupBarcode(query.trim())].filter(Boolean) : await searchOpenFoodFacts(query);

        if (products.length === 0) {
            resultsEl.innerHTML = `<div class="text-center py-6 text-xs text-gray-500 italic">Žádné výsledky nenalezeny.</div>`;
            return;
        }

        resultsEl.innerHTML = products.map(prod => `
            <div 
                onclick="window.selectOFFProduct('${encodeURIComponent(JSON.stringify(prod))}')"
                class="flex items-center justify-between p-2.5 bg-[#202225] hover:bg-[#faa61a]/10 border border-white/5 hover:border-[#faa61a]/30 rounded-xl cursor-pointer transition group"
            >
                <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-white group-hover:text-[#faa61a] transition truncate">${escapeHTML(prod.name)}</div>
                    <div class="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>na 100g</span> • 
                        <span class="text-[#5865F2] font-semibold">${prod.protein}g B</span>
                        <span class="text-[#faa61a] font-semibold">${prod.carbs}g S</span>
                        <span class="text-[#ed4245] font-semibold">${prod.fats}g T</span>
                    </div>
                </div>
                <div class="text-right flex-shrink-0 ml-2">
                    <span class="text-xs font-black text-white">${prod.calories}</span>
                    <span class="text-[10px] text-gray-400 block">kcal</span>
                </div>
            </div>
        `).join('');
    }, 300);
};

window.selectOFFProduct = (encodedJson) => {
    const prod = JSON.parse(decodeURIComponent(encodedJson));
    activeTab = 'quick';
    const el = document.getElementById('nutrition-modal');
    if (el) renderModalContent(el, prod);
};
