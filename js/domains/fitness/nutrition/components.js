import { escapeHTML } from '@core/utils.js';

/**
 * Renders SVG circular progress donut for daily calories.
 */
export function renderMacroDonut(eaten, target, remaining) {
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(1, Math.max(0, eaten / Math.max(1, target)));
    const strokeDashoffset = circumference - (progress * circumference);
    const isOver = eaten > target;

    return `
        <div class="relative flex items-center justify-center w-40 h-40 flex-shrink-0">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <!-- Background Circle -->
                <circle
                    cx="80"
                    cy="80"
                    r="${radius}"
                    stroke="rgba(255, 255, 255, 0.08)"
                    stroke-width="12"
                    fill="transparent"
                />
                <!-- Progress Circle -->
                <circle
                    cx="80"
                    cy="80"
                    r="${radius}"
                    stroke="${isOver ? '#ed4245' : '#3ba55c'}"
                    stroke-width="12"
                    stroke-linecap="round"
                    fill="transparent"
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset}; transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
                />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Kalorie</span>
                <span class="text-2xl font-black text-white tracking-tight leading-tight">${eaten}</span>
                <span class="text-[11px] font-semibold ${isOver ? 'text-rose-400' : 'text-gray-400'}">
                    ${isOver ? `+${Math.abs(remaining)} nad` : `zbývá ${remaining}`}
                </span>
            </div>
        </div>
    `;
}

/**
 * Renders an animated Discord-styled horizontal macro progress bar.
 */
export function renderMacroBar(label, current, target, colorHex, iconHtml) {
    const percent = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
    const isMet = current >= target;

    return `
        <div class="bg-[#202225]/80 p-3 rounded-xl border border-white/5 space-y-1.5 shadow-sm">
            <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                    <span style="color: ${colorHex}">${iconHtml}</span>
                    <span class="font-extrabold text-gray-200 uppercase tracking-wider text-[11px]">${label}</span>
                </div>
                <div class="flex items-center gap-1">
                    <span class="font-black text-white text-xs">${current}g</span>
                    <span class="text-gray-500 text-[10px]">/ ${target}g</span>
                    ${isMet ? '<i class="fas fa-check-circle text-[10px] text-[#3ba55c] ml-1"></i>' : ''}
                </div>
            </div>
            <!-- Bar Container -->
            <div class="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                    class="h-full rounded-full transition-all duration-700 ease-out"
                    style="width: ${percent}%; background-color: ${colorHex}; box-shadow: 0 0 10px ${colorHex}40;"
                ></div>
            </div>
        </div>
    `;
}

/**
 * Renders a Meal Card (e.g. Snídaně, Oběd, Večeře, Svačina) with food items.
 */
export function renderMealCard(mealType, title, iconHtml, items, activeUser, isCurrentLoggedUser) {
    let mealCals = 0;
    let mealProt = 0;
    let mealCarbs = 0;
    let mealFats = 0;

    items.forEach(item => {
        mealCals += Number(item.calories) || 0;
        mealProt += Number(item.protein) || 0;
        mealCarbs += Number(item.carbs) || 0;
        mealFats += Number(item.fats) || 0;
    });

    mealCals = Math.round(mealCals);
    mealProt = Math.round(mealProt * 10) / 10;
    mealCarbs = Math.round(mealCarbs * 10) / 10;
    mealFats = Math.round(mealFats * 10) / 10;

    const itemsHtml = items.length === 0 ? `
        <div class="text-center py-4 text-xs text-gray-500 font-medium italic border border-dashed border-white/5 rounded-xl">
            Zatím žádné zapsané položky
        </div>
    ` : `
        <div class="space-y-1.5">
            ${items.map(item => `
                <div class="flex items-center justify-between p-2.5 bg-[#202225] hover:bg-[#202225]/80 rounded-xl border border-white/5 transition group">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-2 h-2 rounded-full bg-[#14b8a6]"></div>
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-white truncate">${escapeHTML(item.food_name || 'Jídlo')}</div>
                            <div class="text-[10px] text-gray-400 flex items-center gap-2">
                                ${item.amount_g ? `<span>${item.amount_g}g</span> • ` : ''}
                                <span class="text-[#5865F2] font-semibold">${item.protein || 0}g B</span>
                                <span class="text-[#faa61a] font-semibold">${item.carbs || 0}g S</span>
                                <span class="text-[#ed4245] font-semibold">${item.fats || 0}g T</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-xs font-black text-gray-300 mr-1">${item.calories || 0} kcal</span>
                        ${isCurrentLoggedUser ? `
                            <button 
                                onclick="window.deleteNutritionItem && window.deleteNutritionItem('${item.id}')"
                                class="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 flex items-center justify-center text-xs transition"
                                title="Smazat položku"
                            >
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : `
                            <button 
                                onclick="window.copyPartnerMealItem && window.copyPartnerMealItem('${item.id}')"
                                class="px-2 py-1 rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white font-bold text-[10px] flex items-center gap-1 transition"
                                title="Zkopírovat toto jídlo do mého deníku"
                            >
                                <i class="fas fa-copy"></i> <span>Kopírovat</span>
                            </button>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    return `
        <div class="bg-[#2f3136] p-4 rounded-2xl border border-white/5 shadow-md space-y-3">
            <!-- Meal Header -->
            <div class="flex items-center justify-between pb-2 border-b border-white/5">
                <div class="flex items-center gap-2">
                    <span class="text-base text-[#14b8a6]">${iconHtml}</span>
                    <span class="font-black text-sm text-white uppercase tracking-wider">${title}</span>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <span class="text-xs font-black text-white">${mealCals}</span>
                        <span class="text-[10px] text-gray-400">kcal</span>
                        <span class="text-[10px] text-[#5865F2] font-bold ml-1">(${mealProt}g P)</span>
                    </div>
                </div>
            </div>

            <!-- Items List -->
            ${itemsHtml}

            <!-- Meal Actions -->
            ${isCurrentLoggedUser ? `
                <div class="pt-1 flex items-center gap-2">
                    <button 
                        onclick="window.openAddFoodModal && window.openAddFoodModal('${mealType}')"
                        class="flex-1 py-2 px-3 bg-[#202225] hover:bg-[#14b8a6]/20 border border-white/5 hover:border-[#14b8a6]/40 text-gray-300 hover:text-[#14b8a6] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <i class="fas fa-plus text-[10px]"></i> <span>Přidat jídlo</span>
                    </button>
                </div>
            ` : `
                ${items.length > 0 ? `
                    <div class="pt-1">
                        <button 
                            onclick="window.copyPartnerFullMeal && window.copyPartnerFullMeal('${mealType}')"
                            class="w-full py-2 px-3 bg-[#5865F2]/20 hover:bg-[#5865F2] border border-[#5865F2]/40 text-[#5865F2] hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <i class="fas fa-clone text-[10px]"></i> <span>Zkopírovat celý ${title.toLowerCase()}</span>
                        </button>
                    </div>
                ` : ''}
            `}
        </div>
    `;
}
