/**
 * VUT FIT WIS Points Tracker & Subjects Management
 */

import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal, renderInputGroup, focusFirstInputInModal } from '@core/ui.js';
import { safeInsert, safeUpsert } from '@core/offline.js';
import { FIT_PRESET_SUBJECTS } from '../schedule.js';
import { getSubjectsData, calculateGrade } from './store.js';

export function renderPointsView() {
    const subjectsData = getSubjectsData();

    if (subjectsData.length === 0) {
        return `
            <div class="bg-[#202225]/80 border border-gray-800 rounded-3xl p-10 text-center space-y-4">
                <div class="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto text-emerald-400">
                    📚
                </div>
                <div>
                    <h3 class="text-sm font-black text-white uppercase tracking-wider">Zatím nemáte přidané předměty</h3>
                    <p class="text-xs text-gray-400 mt-1 max-w-md mx-auto">Přidejte si předměty 1. semestru (např. IZP, IUS, IDA, IMA1) a sledujte své body z projektů a půlsemestrálek do zápočtu!</p>
                </div>
                <div class="flex justify-center gap-2 pt-2">
                    <button onclick="window.StudyPlanner.seedFITFirstSemesterSubjects()" class="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition">
                        ⚡ Načíst 1. semestr FITu jedním klikem
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="space-y-6">
            <!-- Rychlý přehled semestru -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="bg-[#202225] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <span class="text-[9px] font-black uppercase text-gray-400 tracking-wider block">Předmětů v semestru</span>
                        <span class="text-lg font-black text-white">${subjectsData.length}</span>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg">
                        🎓
                    </div>
                </div>

                <div class="bg-[#202225] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <span class="text-[9px] font-black uppercase text-gray-400 tracking-wider block">Zápočty splněny</span>
                        <span class="text-lg font-black text-emerald-400">
                            ${subjectsData.filter(s => (Number(s.points_labs || 0) + Number(s.points_projects || 0) + Number(s.points_midterm || 0)) >= (s.min_credit_points || 20)).length} / ${subjectsData.length}
                        </span>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg">
                        ✅
                    </div>
                </div>

                <div class="bg-[#202225] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <span class="text-[9px] font-black uppercase text-gray-400 tracking-wider block">Průměr bodů před zkouškou</span>
                        <span class="text-lg font-black text-amber-400">
                            ${Math.round(subjectsData.reduce((acc, s) => acc + (Number(s.points_labs || 0) + Number(s.points_projects || 0) + Number(s.points_midterm || 0)), 0) / (subjectsData.length || 1))} b.
                        </span>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg">
                        📊
                    </div>
                </div>
            </div>

            <!-- Mřížka předmětů -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                ${subjectsData.map(s => {
                    const labs = Number(s.points_labs || 0);
                    const proj = Number(s.points_projects || 0);
                    const mid = Number(s.points_midterm || 0);
                    const exam = Number(s.points_exam || 0);
                    
                    const termPoints = labs + proj + mid;
                    const totalPoints = termPoints + exam;
                    const minZapocet = Number(s.min_credit_points || 20);
                    const hasZapocet = termPoints >= minZapocet;

                    const needForE = Math.max(0, 50 - termPoints);
                    const needForA = Math.max(0, 90 - termPoints);

                    const grade = calculateGrade(totalPoints);

                    return `
                        <div class="bg-gradient-to-br from-[#202225] to-[#18191c] border border-gray-800/80 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
                            <!-- Horní lišta předmětu -->
                            <div class="flex justify-between items-start gap-3">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="px-2.5 py-0.5 rounded-lg bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 text-xs font-black font-mono">
                                            ${s.code}
                                        </span>
                                        <span class="text-xs font-black text-white tracking-wide truncate">${s.name}</span>
                                    </div>
                                    <span class="text-[10px] text-gray-400 font-medium block mt-1">${s.semester || '1. semestr'}</span>
                                </div>

                                <div class="text-right">
                                    <span class="text-xl font-black ${grade.color} font-mono block leading-none">${totalPoints} <span class="text-xs text-gray-500">/ 100</span></span>
                                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${grade.badge} inline-block mt-1">Známka: ${grade.letter}</span>
                                </div>
                            </div>

                            <!-- Rozpad bodů (Laborky, Projekty, Půlsemestrálka, Zkouška) -->
                            <div class="grid grid-cols-4 gap-2 text-center select-none">
                                <div class="bg-black/30 border border-white/5 rounded-xl p-2">
                                    <span class="text-[8px] text-gray-400 font-bold uppercase block">Laborky</span>
                                    <span class="text-xs font-black text-emerald-400">${labs} b.</span>
                                </div>
                                <div class="bg-black/30 border border-white/5 rounded-xl p-2">
                                    <span class="text-[8px] text-gray-400 font-bold uppercase block">Projekty</span>
                                    <span class="text-xs font-black text-blue-400">${proj} b.</span>
                                </div>
                                <div class="bg-black/30 border border-white/5 rounded-xl p-2">
                                    <span class="text-[8px] text-gray-400 font-bold uppercase block">Půlsem.</span>
                                    <span class="text-xs font-black text-amber-400">${mid} b.</span>
                                </div>
                                <div class="bg-black/30 border border-white/5 rounded-xl p-2">
                                    <span class="text-[8px] text-gray-400 font-bold uppercase block">Zkouška</span>
                                    <span class="text-xs font-black text-purple-400">${exam} b.</span>
                                </div>
                            </div>

                            <!-- ProgressBar a stav zápočtu -->
                            <div class="space-y-1.5">
                                <div class="flex justify-between text-[10px] font-bold">
                                    <span class="${hasZapocet ? 'text-emerald-400' : 'text-amber-400'} flex items-center gap-1">
                                        <i class="fas ${hasZapocet ? 'fa-check-circle' : 'fa-hourglass-half'}"></i>
                                        ${hasZapocet ? 'Zápočet splněn!' : `Do zápočtu chybí ještě ${minZapocet - termPoints} b.`}
                                    </span>
                                    <span class="text-gray-400 font-mono">${termPoints} b. z semestru (min. ${minZapocet})</span>
                                </div>
                                <div class="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" style="width: ${Math.min(100, (totalPoints / 100) * 100)}%"></div>
                                </div>
                            </div>

                            <!-- Kalkulačka na zkoušku & Akce -->
                            <div class="flex items-center justify-between pt-2 border-t border-gray-800/80 text-[10px]">
                                <div class="text-gray-400 font-medium leading-tight">
                                    Na zkoušce stačí <strong class="text-white">${needForE} b.</strong> na 'E', nebo <strong class="text-amber-400">${needForA} b.</strong> na 'A'.
                                </div>
                                <div class="flex items-center gap-2">
                                    <button onclick="window.StudyPlanner.openEditSubjectPointsModal('${s.id}')" 
                                            class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-bold uppercase text-[9px] transition">
                                        Upravit body
                                    </button>
                                    <button onclick="window.StudyPlanner.deleteSubjectItem('${s.id}')" 
                                            class="text-gray-600 hover:text-red-400 p-1 transition"
                                            title="Smazat předmět">
                                        <i class="fas fa-trash-alt text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

export function openAddSubjectModalFIT() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div>
                <label class="block text-[9px] text-gray-400 font-black uppercase tracking-wider mb-2">Rychlý výběr 1. semestru FIT:</label>
                <div class="flex flex-wrap gap-1.5">
                    ${FIT_PRESET_SUBJECTS.map(p => `
                        <button type="button" 
                                onclick="window.StudyPlanner.applySubjectPresetPoints('${p.code}', '${p.name}')"
                                class="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-emerald-500/30 text-emerald-400 hover:text-white border border-emerald-500/20 text-[10px] font-black transition-all">
                            + ${p.code}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Kód předmětu',
                    id: 'fit-sub-code',
                    placeholder: 'např. IZP'
                })}
                ${renderInputGroup({
                    label: 'Semestr',
                    id: 'fit-sub-sem',
                    value: '1. semestr (Zima)'
                })}
            </div>

            ${renderInputGroup({
                label: 'Celý název předmětu',
                id: 'fit-sub-name',
                placeholder: 'např. Základy programování'
            })}

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Minimální body pro zápočet',
                    id: 'fit-sub-min',
                    type: 'number',
                    value: '20'
                })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cílová známka</label>
                    <select id="fit-sub-grade" class="w-full bg-[#18191c] text-white text-xs p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 transition-all">
                        <option value="A">A (90–100 b.) 🌟</option>
                        <option value="B">B (80–89 b.)</option>
                        <option value="C">C (70–79 b.)</option>
                        <option value="E">E (50–59 b. - Hlavně projít!)</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2.5 w-full">
            <button onclick="document.getElementById('add-subject-points-modal')?.remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.StudyPlanner.saveSubjectPointsItem()" 
                    data-modal-primary
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer">
                Uložit předmět
            </button>
        </div>
    `;

    document.getElementById('add-subject-points-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-subject-points-modal',
        title: 'Přidat předmět do bodového systému',
        subtitle: 'VUT FIT WIS Tracker 🎯',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-subject-points-modal')?.remove()"
    }));

    const el = document.getElementById('add-subject-points-modal');
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
        focusFirstInputInModal('add-subject-points-modal');
    }
}

export function applySubjectPresetPoints(code, name) {
    const codeEl = document.getElementById('fit-sub-code');
    const nameEl = document.getElementById('fit-sub-name');
    if (codeEl) codeEl.value = code;
    if (nameEl) nameEl.value = name;
}

export function openEditSubjectPointsModal(id) {
    triggerHaptic('light');
    const subjectsData = getSubjectsData();
    const s = subjectsData.find(sub => sub.id === id);
    if (!s) return;

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <span class="text-xs font-black text-[#5865F2] font-mono mr-1">${s.code}</span>
                <span class="text-xs font-bold text-[var(--text-header)]">${s.name}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Body z laborek / cvičení',
                    id: 'fit-edit-labs',
                    type: 'number',
                    inputmode: 'decimal',
                    step: '0.5',
                    value: String(s.points_labs || 0)
                })}
                ${renderInputGroup({
                    label: 'Body z projektů (WIS)',
                    id: 'fit-edit-proj',
                    type: 'number',
                    inputmode: 'decimal',
                    step: '0.5',
                    value: String(s.points_projects || 0)
                })}
            </div>

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Body z půlsemestrálky',
                    id: 'fit-edit-mid',
                    type: 'number',
                    inputmode: 'decimal',
                    step: '0.5',
                    value: String(s.points_midterm || 0)
                })}
                ${renderInputGroup({
                    label: 'Body ze zkoušky',
                    id: 'fit-edit-exam',
                    type: 'number',
                    inputmode: 'decimal',
                    step: '0.5',
                    value: String(s.points_exam || 0)
                })}
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2.5 w-full">
            <button onclick="document.getElementById('edit-points-modal')?.remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.StudyPlanner.updateSubjectPoints('${s.id}')" 
                    data-modal-primary
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer">
                Uložit body
            </button>
        </div>
    `;

    document.getElementById('edit-points-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-points-modal',
        title: 'Zapsat body předmětu',
        subtitle: `${s.code} — ${s.name}`,
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('edit-points-modal')?.remove()"
    }));

    const el = document.getElementById('edit-points-modal');
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
        focusFirstInputInModal('edit-points-modal');
    }
}

export async function saveSubjectPointsItem() {
    triggerHaptic('medium');

    const code = document.getElementById('fit-sub-code')?.value.trim();
    const name = document.getElementById('fit-sub-name')?.value.trim();
    const semester = document.getElementById('fit-sub-sem')?.value?.trim() || '1';
    const minPoints = Number(document.getElementById('fit-sub-min')?.value) || 20;
    const targetGrade = document.getElementById('fit-sub-grade')?.value || 'A';

    if (!code || !name) {
        showNotification('Vyplňte kód i název předmětu!', 'warning');
        return;
    }

    const newSub = {
        id: crypto.randomUUID(),
        user_id: state.currentUser?.id,
        code: code.toUpperCase(),
        name,
        semester,
        min_credit_points: minPoints,
        target_grade: targetGrade,
        points_labs: 0,
        points_projects: 0,
        points_midterm: 0,
        points_exam: 0,
        created_at: new Date().toISOString()
    };

    try {
        await safeInsert('school_subjects', newSub);
        const subjectsData = getSubjectsData();
        subjectsData.push(newSub);

        triggerConfetti();
        showNotification('Předmět přidán do bodového plánovače! 🎯', 'success');
        document.getElementById('add-subject-points-modal')?.remove();
        window.StudyPlanner?.render?.();
    } catch (e) {
        console.error("[StudyPlanner] Error saving subject:", e);
        showNotification('Chyba při ukládání: ' + e.message, 'danger');
    }
}

export async function updateSubjectPoints(id) {
    triggerHaptic('medium');

    const labs = Number(document.getElementById('fit-edit-labs')?.value) || 0;
    const proj = Number(document.getElementById('fit-edit-proj')?.value) || 0;
    const mid = Number(document.getElementById('fit-edit-mid')?.value) || 0;
    const exam = Number(document.getElementById('fit-edit-exam')?.value) || 0;

    const subjectsData = getSubjectsData();
    const targetSub = subjectsData.find(sub => sub.id === id);
    if (targetSub) {
        targetSub.points_labs = labs;
        targetSub.points_projects = proj;
        targetSub.points_midterm = mid;
        targetSub.points_exam = exam;
    }

    try {
        await safeUpsert('school_subjects', {
            id,
            points_labs: labs,
            points_projects: proj,
            points_midterm: mid,
            points_exam: exam,
            updated_at: new Date().toISOString()
        });

        triggerConfetti();
        showNotification('Body byly úspěšně zapsány! 📚✨', 'success');
        document.getElementById('edit-points-modal')?.remove();
        window.StudyPlanner?.render?.();
    } catch (e) {
        console.error("[StudyPlanner] Error updating points:", e);
        showNotification('Chyba při aktualizaci bodů: ' + e.message, 'danger');
    }
}

export async function deleteSubjectItem(id) {
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento předmět ze studijního plánu?');
    if (!confirmed) return;
    triggerHaptic('light');

    try {
        const { error } = await supabase.from('school_subjects').delete().eq('id', id);
        if (error) throw error;
        showNotification('Předmět smazán.', 'info');
        window.StudyPlanner?.render?.();
    } catch (e) {
        console.error("[StudyPlanner] Delete error:", e);
    }
}

export async function seedFITFirstSemesterSubjects() {
    triggerHaptic('medium');
    const firstSem = [
        { code: 'IZP', name: 'Základy programování', semester: '1. semestr (Zima)', min_credit_points: 20 },
        { code: 'IUS', name: 'Úvod do softwarového inženýrství', semester: '1. semestr (Zima)', min_credit_points: 20 },
        { code: 'IDA', name: 'Diskrétní matematika', semester: '1. semestr (Zima)', min_credit_points: 20 },
        { code: 'IMA1', name: 'Matematická analýza 1', semester: '1. semestr (Zima)', min_credit_points: 20 },
        { code: 'ITW', name: 'Tvorba webových stránek', semester: '1. semestr (Zima)', min_credit_points: 20 }
    ];

    const records = firstSem.map(s => ({
        user_id: state.currentUser?.id,
        ...s,
        points_labs: 0,
        points_projects: 0,
        points_midterm: 0,
        points_exam: 0
    }));

    try {
        const { error } = await supabase.from('school_subjects').insert(records);
        if (error) throw error;
        triggerConfetti();
        showNotification('Předměty 1. semestru načteny! 🚀', 'success');
        window.StudyPlanner?.render?.();
    } catch (e) {
        showNotification('Chyba při načítání: ' + e.message, 'danger');
    }
}
