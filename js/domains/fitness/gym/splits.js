/**
 * Training Splits & Weekly Schedule Management for Kiscord Gym
 * Enables configuring weekly splits (PPL, Upper/Lower, Arnold, Custom),
 * day-of-week template mappings, smart shift actions, and calendar integration.
 */

import { supabase } from '@core/supabase.js';
import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal } from '@core/ui.js';
import { startWorkout, startFreeWorkout } from './activeWorkout.js';

export const DAYS_OF_WEEK = [
    { id: 1, name: 'Pondělí', short: 'Po', icon: '⚡' },
    { id: 2, name: 'Úterý', short: 'Út', icon: '🔥' },
    { id: 3, name: 'Středa', short: 'St', icon: '💪' },
    { id: 4, name: 'Čtvrtek', short: 'Čt', icon: '🎯' },
    { id: 5, name: 'Pátek', short: 'Pá', icon: '🚀' },
    { id: 6, name: 'Sobota', short: 'So', icon: '🏆' },
    { id: 7, name: 'Neděle', short: 'Ne', icon: '🛌' }
];

export const SPLIT_PRESETS = {
    ppl_4day: {
        name: 'Push / Pull / Legs + Upper (4 dny)',
        desc: 'Klasický 4denní split ideální pro regeneraci a růst síly.',
        pattern: [
            { dayOfWeek: 1, splitName: 'Push Day 🦍', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 2, splitName: 'Volno / Regenerace 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 3, splitName: 'Pull Day 🧗‍♂️', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 4, splitName: 'Volno / Regenerace 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 5, splitName: 'Leg Day 🦵', isRest: false, preferredTime: '16:30' },
            { dayOfWeek: 6, splitName: 'Upper Body Pump ⚡', isRest: false, preferredTime: '11:00' },
            { dayOfWeek: 7, splitName: 'Volno / Regenerace 🛌', isRest: true, preferredTime: null }
        ]
    },
    ppl_3day: {
        name: 'Push / Pull / Legs (3 dny)',
        desc: 'Časově efektivní 3denní split rozprostřený po celém týdnu.',
        pattern: [
            { dayOfWeek: 1, splitName: 'Push Day 🦍', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 2, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 3, splitName: 'Pull Day 🧗‍♂️', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 4, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 5, splitName: 'Leg Day 🦵', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 6, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 7, splitName: 'Volno 🛌', isRest: true, preferredTime: null }
        ]
    },
    upper_lower_4day: {
        name: 'Upper / Lower (4 dny)',
        desc: 'Střídání vršku a spodku těla 2× týdně pro maximální frekvenci.',
        pattern: [
            { dayOfWeek: 1, splitName: 'Upper Body A 🦍', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 2, splitName: 'Lower Body A 🦵', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 3, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 4, splitName: 'Upper Body B ⚡', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 5, splitName: 'Lower Body B 🚀', isRest: false, preferredTime: '16:30' },
            { dayOfWeek: 6, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 7, splitName: 'Volno 🛌', isRest: true, preferredTime: null }
        ]
    },
    full_body_3day: {
        name: 'Full Body (3 dny)',
        desc: 'Komplexní procvičení celého těla v každém tréninku.',
        pattern: [
            { dayOfWeek: 1, splitName: 'Full Body A 🏋️‍♂️', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 2, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 3, splitName: 'Full Body B 🏋️‍♂️', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 4, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 5, splitName: 'Full Body C 🏋️‍♂️', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 6, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 7, splitName: 'Volno 🛌', isRest: true, preferredTime: null }
        ]
    },
    arnold_5day: {
        name: 'Arnold Split (5 dní)',
        desc: 'Klasický kulturistický split: Hrudník+Záda, Ramena+Ruce, Nohy.',
        pattern: [
            { dayOfWeek: 1, splitName: 'Hrudník & Záda 🦍', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 2, splitName: 'Ramena & Ruce 💪', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 3, splitName: 'Nohy & Břicho 🦵', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 4, splitName: 'Hrudník & Záda 🦍', isRest: false, preferredTime: '17:00' },
            { dayOfWeek: 5, splitName: 'Ramena & Ruce 💪', isRest: false, preferredTime: '16:30' },
            { dayOfWeek: 6, splitName: 'Volno 🛌', isRest: true, preferredTime: null },
            { dayOfWeek: 7, splitName: 'Volno 🛌', isRest: true, preferredTime: null }
        ]
    }
};

/**
 * Returns the currently active training split for current user.
 */
export function getActiveTrainingSplit() {
    const splits = state.trainingSplits || [];
    const mySplits = splits.filter(s => !s.user_id || s.user_id === state.currentUser?.id);
    return mySplits.find(s => s.is_active) || mySplits[0] || state.activeTrainingSplit || null;
}

/**
 * Returns split configuration for a specific day of week (1..7) or dateKey (YYYY-MM-DD).
 * @param {number|string|Date} targetDay
 * @returns {object|null} { dayOfWeek, splitName, templateId, isRest, preferredTime, template }
 */
export function getActiveSplitForDay(targetDay) {
    const activeSplit = getActiveTrainingSplit();
    if (!activeSplit || !Array.isArray(activeSplit.schedule_pattern)) return null;

    let dayOfWeekNum = 1;
    if (typeof targetDay === 'number') {
        dayOfWeekNum = targetDay;
    } else if (typeof targetDay === 'string') {
        const d = new Date(targetDay + 'T12:00:00');
        const jsDay = d.getDay();
        dayOfWeekNum = jsDay === 0 ? 7 : jsDay;
    } else if (targetDay instanceof Date) {
        const jsDay = targetDay.getDay();
        dayOfWeekNum = jsDay === 0 ? 7 : jsDay;
    }

    const dayConfig = activeSplit.schedule_pattern.find(p => p.dayOfWeek === dayOfWeekNum);
    if (!dayConfig) return null;

    const template = dayConfig.templateId ? (state.gymTemplates || []).find(t => t.id === dayConfig.templateId) : null;

    return {
        ...dayConfig,
        splitTitle: activeSplit.name,
        template
    };
}

/**
 * Renders the top Split Overview Strip (Po–Ne) in the Gym Templates Tab.
 */
export function renderSplitOverviewBarHtml() {
    const activeSplit = getActiveTrainingSplit();
    const todayJsDay = new Date().getDay();
    const todayDayOfWeek = todayJsDay === 0 ? 7 : todayJsDay;

    if (!activeSplit) {
        return `
            <div class="glass-card bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                        📅
                    </div>
                    <div>
                        <h4 class="text-sm font-black text-white uppercase tracking-wider">Nastav si svůj tréninkový split</h4>
                        <p class="text-xs text-white/50 font-medium mt-0.5">Zvol si dny v týdnu pro Push, Pull, Legs nebo Upper/Lower a propoj je s kalendářem!</p>
                    </div>
                </div>
                <button onclick="window.Gym.openSplitManagerModal()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#faa61a] to-[#e09216] hover:from-[#fbb138] hover:to-[#eb9b1d] text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-2 flex-shrink-0">
                    <i class="fas fa-magic text-xs"></i> Nastavit split
                </button>
            </div>
        `;
    }

    const pattern = activeSplit.schedule_pattern || [];
    const workoutDaysCount = pattern.filter(p => !p.isRest).length;

    return `
        <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div class="flex items-center gap-2.5">
                    <span class="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <i class="fas fa-calendar-check text-[10px]"></i> ${workoutDaysCount}× týdně
                    </span>
                    <h3 class="text-sm font-black text-white uppercase tracking-wider">${activeSplit.name}</h3>
                </div>
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button onclick="window.Gym.openSplitManagerModal('${activeSplit.id}')" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 text-xs font-bold transition flex items-center gap-1.5">
                        <i class="fas fa-cog text-xs text-[#faa61a]"></i> Upravit split
                    </button>
                    <button onclick="window.Gym.openSplitManagerModal()" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 text-xs font-bold transition flex items-center gap-1.5">
                        <i class="fas fa-plus text-xs"></i> Jiný split
                    </button>
                </div>
            </div>

            <!-- 7-Day Matrix Strip -->
            <div class="grid grid-cols-7 gap-1.5 sm:gap-2 select-none">
                ${DAYS_OF_WEEK.map(day => {
                    const dayConfig = pattern.find(p => p.dayOfWeek === day.id);
                    const isToday = day.id === todayDayOfWeek;
                    const isRest = !dayConfig || dayConfig.isRest;
                    const splitName = dayConfig?.splitName || (isRest ? 'Volno' : 'Trénink');
                    const time = dayConfig?.preferredTime ? `<span class="text-[9px] font-mono text-gray-400 block truncate">${dayConfig.preferredTime}</span>` : '';

                    let bgClass = isRest ? 'bg-black/20 border-white/5 text-gray-400' : 'bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-300 shadow-sm';
                    if (isToday) {
                        bgClass += ' ring-2 ring-[#faa61a] ring-offset-2 ring-offset-[#2f3136]';
                    }

                    return `
                        <div class="flex flex-col items-center justify-between p-2 rounded-2xl border text-center transition-all min-h-[76px] ${bgClass}">
                            <div class="flex items-center gap-1">
                                <span class="text-[10px] font-black uppercase ${isToday ? 'text-[#faa61a]' : 'text-gray-400'}">${day.short}</span>
                                ${isToday ? `<span class="w-1.5 h-1.5 rounded-full bg-[#faa61a] animate-pulse"></span>` : ''}
                            </div>
                            <div class="my-1 w-full px-0.5">
                                <span class="text-[10px] font-extrabold block truncate leading-tight ${isRest ? 'text-gray-400' : 'text-white'}">
                                    ${splitName}
                                </span>
                                ${time}
                            </div>
                            <div>
                                ${isRest ? `<span class="text-[11px]">🛌</span>` : `<span class="text-[11px]">${day.icon}</span>`}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Opens Split Manager Modal (Create or Edit Training Split).
 */
export async function openSplitManagerModal(splitId = null) {
    triggerHaptic('light');
    await ensureGymData();

    const splits = state.trainingSplits || [];
    const templates = state.gymTemplates || [];
    const currentSplit = splitId ? splits.find(s => s.id === splitId) : getActiveTrainingSplit();

    const initialPattern = currentSplit?.schedule_pattern || SPLIT_PRESETS.ppl_4day.pattern;
    const initialName = currentSplit?.name || 'Push / Pull / Legs (4 dny)';
    const initialDesc = currentSplit?.description || 'Můj týdenní tréninkový rozvrh';

    const contentHtml = `
        <div class="space-y-4 text-left">
            <!-- Preset Quick Picker -->
            <div class="space-y-1.5">
                <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Přednastavené šablony splitu</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button type="button" onclick="window.Gym.applySplitPreset('ppl_4day')" class="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-left transition group">
                        <span class="text-xs font-bold text-white block group-hover:text-amber-300 leading-tight">Push / Pull / Legs</span>
                        <span class="text-[9px] text-gray-400">4 dny (PPL + Upper)</span>
                    </button>
                    <button type="button" onclick="window.Gym.applySplitPreset('upper_lower_4day')" class="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-left transition group">
                        <span class="text-xs font-bold text-white block group-hover:text-amber-300 leading-tight">Upper / Lower</span>
                        <span class="text-[9px] text-gray-400">4 dny v týdnu</span>
                    </button>
                    <button type="button" onclick="window.Gym.applySplitPreset('ppl_3day')" class="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-left transition group">
                        <span class="text-xs font-bold text-white block group-hover:text-amber-300 leading-tight">PPL Klasik</span>
                        <span class="text-[9px] text-gray-400">3 dny v týdnu</span>
                    </button>
                    <button type="button" onclick="window.Gym.applySplitPreset('full_body_3day')" class="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-left transition group">
                        <span class="text-xs font-bold text-white block group-hover:text-amber-300 leading-tight">Full Body</span>
                        <span class="text-[9px] text-gray-400">3 dny (Po/St/Pá)</span>
                    </button>
                    <button type="button" onclick="window.Gym.applySplitPreset('arnold_5day')" class="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-left transition group">
                        <span class="text-xs font-bold text-white block group-hover:text-amber-300 leading-tight">Arnold Split</span>
                        <span class="text-[9px] text-gray-400">5 dní (Kulturistika)</span>
                    </button>
                    <button type="button" onclick="window.Gym.applySplitPreset('custom')" class="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-left transition group">
                        <span class="text-xs font-bold text-white block group-hover:text-amber-300 leading-tight">Vlastní split</span>
                        <span class="text-[9px] text-gray-400">Nastavit od nuly</span>
                    </button>
                </div>
            </div>

            <!-- Split Name & Description -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Název splitu</label>
                    <input type="text" id="split-name-input" value="${initialName}" placeholder="např. Push Pull Legs 4-denní" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#faa61a] transition font-bold">
                </div>
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Popis</label>
                    <input type="text" id="split-desc-input" value="${initialDesc}" placeholder="např. Silový objem, léto 2026..." class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#faa61a] transition">
                </div>
            </div>

            <!-- 7-Day Day Configurator -->
            <div class="space-y-2">
                <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rozložení dnů v týdnu</label>
                <div id="split-days-container" class="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    ${renderSplitDaysFormHtml(initialPattern, templates)}
                </div>
            </div>

            <input type="hidden" id="split-id-hidden" value="${currentSplit?.id || ''}">
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-between items-center w-full">
            <div>
                ${currentSplit?.id ? `
                    <button type="button" onclick="window.Gym.deleteTrainingSplit('${currentSplit.id}')" class="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs uppercase tracking-wider transition">
                        <i class="fas fa-trash-alt mr-1"></i> Smazat
                    </button>
                ` : ''}
            </div>
            <div class="flex gap-2">
                <button type="button" onclick="document.getElementById('split-manager-modal')?.remove()" class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition">
                    Zrušit
                </button>
                <button type="button" onclick="window.Gym.saveTrainingSplitFromForm()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
                    <i class="fas fa-save text-xs"></i> Uložit split
                </button>
            </div>
        </div>
    `;

    document.getElementById('split-manager-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'split-manager-modal',
        title: 'Tréninkový Split & Týdenní Rozvrh',
        subtitle: 'Nastav si dny v týdnu pro jednotlivé partie a šablony 🏋️‍♂️📅',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('split-manager-modal')?.remove()"
    }));

    document.getElementById('split-manager-modal')?.classList.remove('hidden');
    document.getElementById('split-manager-modal')?.classList.add('flex');
}

/**
 * Renders the 7-day row editors for the modal form.
 */
function renderSplitDaysFormHtml(pattern, templates) {
    return DAYS_OF_WEEK.map(day => {
        const dayConfig = (pattern || []).find(p => p.dayOfWeek === day.id) || {
            dayOfWeek: day.id,
            splitName: day.id === 7 ? 'Volno / Regenerace 🛌' : 'Trénink 💪',
            isRest: day.id === 7,
            preferredTime: day.id === 7 ? '' : '17:00',
            templateId: ''
        };

        const isRest = !!dayConfig.isRest;
        const splitName = dayConfig.splitName || '';
        const prefTime = dayConfig.preferredTime || '';
        const tmplId = dayConfig.templateId || '';

        return `
            <div class="p-3 rounded-2xl bg-[#202225] border border-white/5 space-y-2.5" id="split-day-row-${day.id}">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black text-amber-300 font-mono">
                            ${day.short}
                        </span>
                        <span class="text-xs font-bold text-white">${day.name}</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-gray-300">
                            <input type="checkbox" id="split-day-rest-${day.id}" ${isRest ? 'checked' : ''} onchange="window.Gym.onSplitDayRestToggle(${day.id})" class="w-4 h-4 rounded accent-[#faa61a] bg-black/20 border-white/10">
                            <span>🛌 Rest Day</span>
                        </label>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 ${isRest ? 'opacity-40 pointer-events-none' : ''}" id="split-day-inputs-${day.id}">
                    <div class="space-y-1">
                        <label class="block text-[8px] text-gray-500 font-bold uppercase ml-0.5">Název dne / partie</label>
                        <input type="text" id="split-day-name-${day.id}" value="${splitName}" placeholder="např. Push Day 🦍" class="w-full bg-black/30 text-white text-xs p-2 rounded-xl border border-white/5 outline-none focus:border-[#faa61a]/40 transition font-medium">
                    </div>
                    <div class="space-y-1">
                        <label class="block text-[8px] text-gray-500 font-bold uppercase ml-0.5">Přiřazená šablona</label>
                        <select id="split-day-tmpl-${day.id}" class="w-full bg-black/30 text-white text-xs p-2 rounded-xl border border-white/5 outline-none focus:border-[#faa61a]/40 transition font-medium">
                            <option value="">-- Bez šablony (obecný) --</option>
                            ${templates.map(t => `<option value="${t.id}" ${t.id === tmplId ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="block text-[8px] text-gray-500 font-bold uppercase ml-0.5">Preferovaný čas</label>
                        <input type="time" id="split-day-time-${day.id}" value="${prefTime}" class="w-full bg-black/30 text-white text-xs p-2 rounded-xl border border-white/5 outline-none focus:border-[#faa61a]/40 transition font-mono">
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Handles toggling rest day checkbox in modal.
 */
export function onSplitDayRestToggle(dayId) {
    const isRest = document.getElementById(`split-day-rest-${dayId}`)?.checked;
    const inputsContainer = document.getElementById(`split-day-inputs-${dayId}`);
    const nameInput = document.getElementById(`split-day-name-${dayId}`);

    if (inputsContainer) {
        if (isRest) {
            inputsContainer.classList.add('opacity-40', 'pointer-events-none');
            if (nameInput && !nameInput.value.includes('Volno')) {
                nameInput.dataset.previousName = nameInput.value;
                nameInput.value = 'Volno / Regenerace 🛌';
            }
        } else {
            inputsContainer.classList.remove('opacity-40', 'pointer-events-none');
            if (nameInput && nameInput.value.includes('Volno')) {
                nameInput.value = nameInput.dataset.previousName || 'Trénink 💪';
            }
        }
    }
}

/**
 * Applies a preset pattern into the active modal.
 */
export function applySplitPreset(presetKey) {
    triggerHaptic('light');
    const preset = SPLIT_PRESETS[presetKey];
    if (!preset && presetKey !== 'custom') return;

    const templates = state.gymTemplates || [];
    let pattern = [];

    if (presetKey === 'custom') {
        pattern = DAYS_OF_WEEK.map(d => ({
            dayOfWeek: d.id,
            splitName: d.id === 7 ? 'Volno 🛌' : 'Trénink 💪',
            isRest: d.id === 7,
            preferredTime: d.id === 7 ? '' : '17:00',
            templateId: ''
        }));
        document.getElementById('split-name-input').value = 'Můj vlastní split';
    } else {
        pattern = preset.pattern;
        document.getElementById('split-name-input').value = preset.name;
        document.getElementById('split-desc-input').value = preset.desc;
    }

    // Try to auto-match templates by keywords (Push -> push template, etc.)
    pattern = pattern.map(p => {
        if (p.isRest) return p;
        const nameLower = p.splitName.toLowerCase();
        const matchedTmpl = templates.find(t => {
            const tLower = t.name.toLowerCase();
            if (nameLower.includes('push') && tLower.includes('push')) return true;
            if (nameLower.includes('pull') && tLower.includes('pull')) return true;
            if (nameLower.includes('leg') && (tLower.includes('leg') || tLower.includes('nohy'))) return true;
            if (nameLower.includes('upper') && (tLower.includes('upper') || tLower.includes('vrch'))) return true;
            if (nameLower.includes('lower') && (tLower.includes('lower') || tLower.includes('spodek'))) return true;
            if (nameLower.includes('full') && tLower.includes('full')) return true;
            return false;
        });
        return {
            ...p,
            templateId: matchedTmpl ? matchedTmpl.id : ''
        };
    });

    const container = document.getElementById('split-days-container');
    if (container) {
        container.innerHTML = renderSplitDaysFormHtml(pattern, templates);
    }
    showNotification(`Použit vzorec: ${preset ? preset.name : 'Vlastní split'}`, 'info');
}

/**
 * Collects form inputs and saves the Training Split to Supabase & State.
 */
export async function saveTrainingSplitFromForm() {
    triggerHaptic('medium');

    const splitId = document.getElementById('split-id-hidden')?.value || null;
    const name = document.getElementById('split-name-input')?.value?.trim();
    const description = document.getElementById('split-desc-input')?.value?.trim() || '';

    if (!name) {
        showNotification('Zadej název splitu!', 'warning');
        return;
    }

    const schedule_pattern = DAYS_OF_WEEK.map(day => {
        const isRest = document.getElementById(`split-day-rest-${day.id}`)?.checked || false;
        const splitName = document.getElementById(`split-day-name-${day.id}`)?.value?.trim() || (isRest ? 'Volno' : 'Trénink');
        const templateId = document.getElementById(`split-day-tmpl-${day.id}`)?.value || null;
        const preferredTime = document.getElementById(`split-day-time-${day.id}`)?.value || null;

        return {
            dayOfWeek: day.id,
            splitName,
            isRest,
            templateId: isRest ? null : templateId,
            preferredTime: isRest ? null : preferredTime
        };
    });

    try {
        const userId = state.currentUser?.id;
        const payload = {
            name,
            description,
            is_active: true,
            rotation_mode: 'fixed_days',
            schedule_pattern,
            user_id: userId
        };

        let savedSplit = null;

        if (splitId) {
            const { data, error } = await supabase
                .from('training_splits')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', splitId)
                .select()
                .single();
            if (error) throw error;
            savedSplit = data;
        } else {
            // First mark other splits of this user as is_active = false
            await supabase
                .from('training_splits')
                .update({ is_active: false })
                .eq('user_id', userId);

            const { data, error } = await supabase
                .from('training_splits')
                .insert(payload)
                .select()
                .single();
            if (error) throw error;
            savedSplit = data;
        }

        // Update local state
        await ensureGymData(true);

        showNotification('Tréninkový split úspěšně uložen! 🦍📅', 'success');
        document.getElementById('split-manager-modal')?.remove();

        // Refresh active views
        if (typeof window !== 'undefined') {
            if (window.Gym?.renderTemplatesTab) {
                const tabEl = document.getElementById('gym-tab-templates');
                if (tabEl) tabEl.innerHTML = window.Gym.renderTemplatesTab();
            }
            if (window.Calendar?.renderCalendar) {
                window.Calendar.renderCalendar();
            }
        }
    } catch (e) {
        console.error('[Gym] Failed to save training split:', e);
        showNotification('Chyba při ukládání splitu: ' + e.message, 'danger');
    }
}

/**
 * Deletes a training split.
 */
export async function deleteTrainingSplit(splitId) {
    triggerHaptic('medium');
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento tréninkový split?', 'Smazat', 'Zrušit');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('training_splits').delete().eq('id', splitId);
        if (error) throw error;

        await ensureGymData(true);
        showNotification('Split byl smazán.', 'info');
        document.getElementById('split-manager-modal')?.remove();

        if (window.Gym?.renderTemplatesTab) {
            const tabEl = document.getElementById('gym-tab-templates');
            if (tabEl) tabEl.innerHTML = window.Gym.renderTemplatesTab();
        }
        if (window.Calendar?.renderCalendar) {
            window.Calendar.renderCalendar();
        }
    } catch (e) {
        console.error('[Gym] Failed to delete training split:', e);
        showNotification('Chyba při mazání splitu.', 'danger');
    }
}

/**
 * Shifts the training split schedule (e.g. +1 day forward or -1 day backward)
 * to accommodate unexpected life events without guilt!
 */
export async function shiftActiveSplitDays(daysOffset = 1) {
    triggerHaptic('medium');
    const activeSplit = getActiveTrainingSplit();
    if (!activeSplit || !Array.isArray(activeSplit.schedule_pattern)) {
        showNotification('Nemáš aktivní žádný tréninkový split!', 'warning');
        return;
    }

    const currentPattern = [...activeSplit.schedule_pattern];
    // Rotate pattern array by daysOffset
    const len = currentPattern.length; // 7
    const normalizedOffset = ((daysOffset % len) + len) % len;

    const newPattern = currentPattern.map((p, idx) => {
        const sourceIdx = (idx - normalizedOffset + len) % len;
        const sourceDay = currentPattern[sourceIdx];
        return {
            ...sourceDay,
            dayOfWeek: p.dayOfWeek // keep day of week key constant, rotate content
        };
    });

    activeSplit.schedule_pattern = newPattern;
    if (state.activeTrainingSplit && state.activeTrainingSplit.id === activeSplit.id) {
        state.activeTrainingSplit.schedule_pattern = newPattern;
    }
    const foundInSplits = (state.trainingSplits || []).find(s => s.id === activeSplit.id);
    if (foundInSplits) {
        foundInSplits.schedule_pattern = newPattern;
    }

    try {
        const { error } = await supabase
            .from('training_splits')
            .update({ schedule_pattern: newPattern, updated_at: new Date().toISOString() })
            .eq('id', activeSplit.id);

        if (error) throw error;

        await ensureGymData(true);
        showNotification(`Tréninkový split posunut o ${daysOffset > 0 ? '+' : ''}${daysOffset} den! ⏭️`, 'success');

        if (window.Calendar?.renderCalendar) {
            window.Calendar.renderCalendar();
        }
        if (window.Gym?.renderTemplatesTab) {
            const tabEl = document.getElementById('gym-tab-templates');
            if (tabEl) tabEl.innerHTML = window.Gym.renderTemplatesTab();
        }
    } catch (e) {
        console.error('[Gym] Shift split error:', e);
        showNotification('Chyba při posunu splitu: ' + e.message, 'danger');
    }
}


/**
 * 1-click start workout from split card.
 */
export async function startSplitWorkout(templateId, fallbackName = 'Trénink') {
    triggerHaptic('medium');
    if (templateId) {
        startWorkout(templateId);
    } else {
        startFreeWorkout();
    }
}
