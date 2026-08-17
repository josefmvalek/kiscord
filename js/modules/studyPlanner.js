import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';
import { FIT_PRESET_SUBJECTS } from './schedule.js';

let activeTab = 'points'; // 'points' | 'deadlines'
let subjectsData = [];
let deadlinesData = [];

export async function renderStudyPlanner() {
    if (state.currentChannel !== 'study-planner') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await Promise.all([loadSubjects(), loadDeadlines()]);

    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingDeadlines = deadlinesData.filter(d => !d.is_completed).sort((a, b) => a.deadline_date.localeCompare(b.deadline_date));
    const urgentCount = upcomingDeadlines.filter(d => {
        const diff = Math.ceil((new Date(d.deadline_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 2;
    }).length;

    container.innerHTML = `
        <div class="h-full bg-[#18191c] flex flex-col font-sans animate-fade-in relative overflow-hidden select-none">
            <!-- Header bar -->
            <div class="bg-[#202225] shadow-md z-10 flex-shrink-0 border-b border-gray-800/80 p-4 lg:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-600/10 flex items-center justify-center text-xl text-emerald-400 border border-emerald-500/30 shadow-inner">
                        🎯
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <span>VUT FIT Studijní Hub</span>
                            <span class="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">WIS Body & Deadliny</span>
                        </h1>
                        <p class="text-[10px] text-gray-400 font-medium">Kalkulačka bodů do zápočtu, známky a půlnoční projekty</p>
                    </div>
                </div>

                <div class="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    <!-- Přepínač záložek -->
                    <div class="flex bg-black/40 border border-gray-800 rounded-xl p-1 text-xs font-bold">
                        <button onclick="window.setStudyPlannerTab('points')" 
                                class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'points' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-calculator text-[10px]"></i> <span class="text-[10px] uppercase font-black">Bodový systém (0–100)</span>
                        </button>
                        <button onclick="window.setStudyPlannerTab('deadlines')" 
                                class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'deadlines' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-hourglass-half text-[10px]"></i> 
                            <span class="text-[10px] uppercase font-black">Deadliny</span>
                            ${urgentCount > 0 ? `<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>` : ''}
                        </button>
                    </div>

                    ${activeTab === 'points' ? `
                        <button onclick="window.openAddSubjectModalFIT()" 
                                class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                            <i class="fas fa-plus text-xs"></i> <span>Přidat předmět</span>
                        </button>
                    ` : `
                        <button onclick="window.openAddDeadlineModal()" 
                                class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                            <i class="fas fa-plus text-xs"></i> <span>Nový deadline</span>
                        </button>
                    `}
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-28">
                <div class="max-w-6xl mx-auto space-y-6">

                    ${activeTab === 'points' ? renderPointsView() : renderDeadlinesView(upcomingDeadlines)}

                </div>
            </div>
        </div>
    `;

    attachWindowStudyPlanner();
}

/**
 * 🎯 Záložka 1: Bodový systém FIT (0–100 bodů) & Kalkulačka známek
 */
function renderPointsView() {
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
                    <button onclick="window.seedFITFirstSemesterSubjects()" class="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition">
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

                    // Výpočet kolik bodů chybí na známky ze zkoušky (max zkouška 50b)
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
                                    <button onclick="window.openEditSubjectPointsModal('${s.id}')" 
                                            class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-bold uppercase text-[9px] transition">
                                        Upravit body
                                    </button>
                                    <button onclick="window.deleteSubjectItem('${s.id}')" 
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

/**
 * 📝 Záložka 2: Deadliny & Projekty (Deadline Tracker)
 */
function renderDeadlinesView(upcomingDeadlines) {
    const todayStr = new Date().toISOString().split('T')[0];
    const completed = deadlinesData.filter(d => d.is_completed).sort((a, b) => b.deadline_date.localeCompare(a.deadline_date));

    return `
        <div class="space-y-6">
            <!-- Nadcházející deadliny -->
            <div class="space-y-3">
                <div class="flex justify-between items-center">
                    <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-hourglass-half text-amber-400"></i>
                        <span>Nadcházející deadliny a projekty (${upcomingDeadlines.length})</span>
                    </h3>
                </div>

                <div class="space-y-3">
                    ${upcomingDeadlines.length === 0 ? `
                        <div class="p-8 bg-[#202225]/50 border border-dashed border-gray-800 rounded-3xl text-center text-xs text-gray-500 italic">
                            Žádné hořící deadliny! Užijte si volno nebo čas na kolejích. 🎉
                        </div>
                    ` : upcomingDeadlines.map(item => {
                        const diffDays = Math.ceil((new Date(item.deadline_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                        const isUrgent = diffDays >= 0 && diffDays <= 2;
                        const dateFormatted = new Date(item.deadline_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
                        const typeStyle = getDeadlineTypeBadge(item.type);

                        return `
                            <div class="bg-[#202225] border ${isUrgent ? 'border-rose-500/40 bg-rose-500/[0.03] shadow-rose-500/10' : 'border-gray-800'} rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group shadow-md">
                                <div class="flex items-center gap-3.5 min-w-0">
                                    <button onclick="window.toggleDeadlineComplete('${item.id}', true)" 
                                            class="w-8 h-8 rounded-xl border border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/20 text-transparent hover:text-emerald-400 flex items-center justify-center transition flex-shrink-0"
                                            title="Označit jako hotové">
                                        <i class="fas fa-check text-xs"></i>
                                    </button>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${typeStyle}">${item.type || 'Projekt'}</span>
                                            ${item.subject_code ? `<span class="text-xs font-mono font-black text-[#5865F2]">${item.subject_code}</span>` : ''}
                                            <span class="text-xs font-black text-white truncate">${item.title}</span>
                                        </div>
                                        ${item.description ? `<p class="text-[10.5px] text-gray-400 mt-0.5 truncate">${item.description}</p>` : ''}
                                    </div>
                                </div>

                                <div class="flex items-center gap-4 flex-shrink-0 select-none">
                                    <div class="text-right font-mono">
                                        <div class="text-xs font-black ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-gray-200'}">
                                            ${dateFormatted} ${item.deadline_time ? `<span class="text-[10px] text-gray-400">(${item.deadline_time})</span>` : ''}
                                        </div>
                                        <div class="text-[9px] font-bold ${isUrgent ? 'text-rose-400' : 'text-gray-500'} mt-0.5">
                                            ${diffDays < 0 ? 'Po termínu!' : (diffDays === 0 ? 'Dnes o půlnoci! 🔥' : (diffDays === 1 ? 'Zítra! ⚠️' : `za ${diffDays} dní`))}
                                        </div>
                                    </div>
                                    <button onclick="window.deleteDeadlineItem('${item.id}')" class="text-gray-600 hover:text-red-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Hotové úkoly (Historie) -->
            ${completed.length > 0 ? `
                <div class="space-y-3 pt-4 border-t border-gray-800">
                    <h3 class="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-check-double text-emerald-500"></i>
                        <span>Odevzdané a splněné úkoly (${completed.length})</span>
                    </h3>

                    <div class="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                        ${completed.map(item => `
                            <div class="bg-[#18191c] border border-gray-800/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                                <div class="flex items-center gap-2.5 truncate">
                                    <button onclick="window.toggleDeadlineComplete('${item.id}', false)" class="text-emerald-400 text-xs">
                                        <i class="fas fa-check-circle"></i>
                                    </button>
                                    <span class="line-through text-gray-400 truncate">${item.subject_code ? item.subject_code + ' — ' : ''}${item.title}</span>
                                </div>
                                <button onclick="window.deleteDeadlineItem('${item.id}')" class="text-gray-600 hover:text-red-400 p-1">
                                    <i class="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// --- MODÁLNÍ OKNA ---

export function openAddSubjectModalFIT() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div>
                <label class="block text-[9px] text-gray-400 font-black uppercase tracking-wider mb-2">Rychlý výběr 1. semestru FIT:</label>
                <div class="flex flex-wrap gap-1.5">
                    ${FIT_PRESET_SUBJECTS.map(p => `
                        <button type="button" 
                                onclick="window.applySubjectPresetPoints('${p.code}', '${p.name}')"
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
            <button onclick="document.getElementById('add-subject-points-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.saveSubjectPointsItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95">
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
        onClose: "document.getElementById('add-subject-points-modal').remove()"
    }));

    const el = document.getElementById('add-subject-points-modal');
    el?.classList.remove('hidden');
    el?.classList.add('flex');
}

export function openEditSubjectPointsModal(id) {
    triggerHaptic('light');
    const s = subjectsData.find(sub => sub.id === id);
    if (!s) return;

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="bg-[#18191c] p-3 rounded-xl border border-gray-800">
                <span class="text-xs font-black text-[#5865F2] font-mono mr-1">${s.code}</span>
                <span class="text-xs font-bold text-white">${s.name}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Body z laborek / cvičení',
                    id: 'fit-edit-labs',
                    type: 'number',
                    value: String(s.points_labs || 0)
                })}
                ${renderInputGroup({
                    label: 'Body z projektů (WIS)',
                    id: 'fit-edit-proj',
                    type: 'number',
                    value: String(s.points_projects || 0)
                })}
            </div>

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Body z půlsemestrálky',
                    id: 'fit-edit-mid',
                    type: 'number',
                    value: String(s.points_midterm || 0)
                })}
                ${renderInputGroup({
                    label: 'Body ze zkoušky',
                    id: 'fit-edit-exam',
                    type: 'number',
                    value: String(s.points_exam || 0)
                })}
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2.5 w-full">
            <button onclick="document.getElementById('edit-points-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.updateSubjectPoints('${s.id}')" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95">
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
        onClose: "document.getElementById('edit-points-modal').remove()"
    }));

    const el = document.getElementById('edit-points-modal');
    el?.classList.remove('hidden');
    el?.classList.add('flex');
}

export function openAddDeadlineModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Kód předmětu',
                    id: 'dl-code',
                    placeholder: 'např. IZP, IUS...'
                })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Typ deadlinu</label>
                    <select id="dl-type" class="w-full bg-[#18191c] text-white text-xs p-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 transition-all">
                        <option value="Projekt">Programovací projekt 💻</option>
                        <option value="Půlsemestrálka">Půlsemestrálka 📊</option>
                        <option value="Zkouška">Termín zkoušky 🏆</option>
                        <option value="Laborka">Příprava do laborky 🔬</option>
                        <option value="Úkol">Domácí úkol 📝</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Název úkolu / zadání',
                id: 'dl-title',
                placeholder: 'např. Projekt 1 - Práce s textovými daty'
            })}

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Datum odevzdání',
                    id: 'dl-date',
                    type: 'date',
                    value: new Date().toISOString().split('T')[0]
                })}
                ${renderInputGroup({
                    label: 'Čas odevzdání',
                    id: 'dl-time',
                    type: 'time',
                    value: '23:59'
                })}
            </div>

            ${renderInputGroup({
                label: 'Popis / poznámka (WIS, Moodle link)',
                id: 'dl-desc',
                placeholder: 'např. Odevzdání přes WIS, limit 15 bodů...'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2.5 w-full">
            <button onclick="document.getElementById('add-deadline-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.saveDeadlineItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95">
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

    const el = document.getElementById('add-deadline-modal');
    el?.classList.remove('hidden');
    el?.classList.add('flex');
}

// --- DATABASE OPERATIONS ---

async function loadSubjects() {
    try {
        const { data, error } = await supabase.from('school_subjects').select('*').order('created_at');
        if (!error && data) subjectsData = data;
    } catch (e) {
        console.warn("[StudyPlanner] Subjects load fallback:", e);
    }
}

async function loadDeadlines() {
    try {
        const { data, error } = await supabase.from('school_deadlines').select('*');
        if (!error && data) deadlinesData = data;
    } catch (e) {
        console.warn("[StudyPlanner] Deadlines load fallback:", e);
    }
}

export async function saveSubjectPointsItem() {
    triggerHaptic('medium');

    const code = document.getElementById('fit-sub-code')?.value.trim();
    const name = document.getElementById('fit-sub-name')?.value.trim();
    const semester = document.getElementById('fit-sub-sem')?.value.trim();
    const minPoints = Number(document.getElementById('fit-sub-min')?.value) || 20;
    const targetGrade = document.getElementById('fit-sub-grade')?.value || 'A';

    if (!code || !name) {
        showNotification('Vyplňte kód i název předmětu!', 'warning');
        return;
    }

    try {
        const { error } = await supabase.from('school_subjects').insert({
            user_id: state.currentUser?.id,
            code: code.toUpperCase(),
            name,
            semester,
            min_credit_points: minPoints,
            target_grade: targetGrade
        });
        if (error) throw error;

        triggerConfetti();
        showNotification('Předmět přidán do bodového plánovače! 🎯', 'success');
        document.getElementById('add-subject-points-modal')?.remove();
        renderStudyPlanner();
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

    try {
        const { error } = await supabase.from('school_subjects').update({
            points_labs: labs,
            points_projects: proj,
            points_midterm: mid,
            points_exam: exam,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) throw error;

        showNotification('Body předmětu úspěšně aktualizovány! 📊', 'success');
        document.getElementById('edit-points-modal')?.remove();
        renderStudyPlanner();
    } catch (e) {
        console.error("[StudyPlanner] Error updating points:", e);
        showNotification('Chyba při aktualizaci: ' + e.message, 'danger');
    }
}

export async function deleteSubjectItem(id) {
    if (!confirm('Opravdu smazat tento předmět?')) return;
    triggerHaptic('light');

    try {
        const { error } = await supabase.from('school_subjects').delete().eq('id', id);
        if (error) throw error;
        showNotification('Předmět smazán.', 'info');
        renderStudyPlanner();
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
        renderStudyPlanner();
    } catch (e) {
        showNotification('Chyba při načítání: ' + e.message, 'danger');
    }
}

export async function saveDeadlineItem() {
    triggerHaptic('medium');

    const code = document.getElementById('dl-code')?.value.trim();
    const type = document.getElementById('dl-type')?.value;
    const title = document.getElementById('dl-title')?.value.trim();
    const date = document.getElementById('dl-date')?.value;
    const time = document.getElementById('dl-time')?.value || '23:59';
    const desc = document.getElementById('dl-desc')?.value.trim();

    if (!title) {
        showNotification('Napište název zadání!', 'warning');
        return;
    }

    try {
        const { error } = await supabase.from('school_deadlines').insert({
            user_id: state.currentUser?.id,
            subject_code: code.toUpperCase(),
            title,
            type,
            deadline_date: date,
            deadline_time: time,
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
        const { error } = await supabase.from('school_deadlines').update({ is_completed: completed }).eq('id', id);
        if (error) throw error;
        renderStudyPlanner();
    } catch (e) {
        console.error("[StudyPlanner] Toggle error:", e);
    }
}

export async function deleteDeadlineItem(id) {
    triggerHaptic('light');
    try {
        const { error } = await supabase.from('school_deadlines').delete().eq('id', id);
        if (error) throw error;
        showNotification('Deadline smazán.', 'info');
        renderStudyPlanner();
    } catch (e) {
        console.error("[StudyPlanner] Delete error:", e);
    }
}

export function calculateGrade(totalPoints) {
    if (totalPoints >= 90) return { letter: 'A', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' };
    if (totalPoints >= 80) return { letter: 'B', color: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300' };
    if (totalPoints >= 70) return { letter: 'C', color: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' };
    if (totalPoints >= 60) return { letter: 'D', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' };
    if (totalPoints >= 50) return { letter: 'E', color: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' };
    return { letter: 'F', color: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' };
}

function getDeadlineTypeBadge(type) {
    switch (type) {
        case 'Projekt':
            return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case 'Půlsemestrálka':
            return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
        case 'Zkouška':
            return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
        default:
            return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
}

function attachWindowStudyPlanner() {
    window.setStudyPlannerTab = (tab) => {
        activeTab = tab;
        renderStudyPlanner();
    };
    window.openAddSubjectModalFIT = openAddSubjectModalFIT;
    window.openEditSubjectPointsModal = openEditSubjectPointsModal;
    window.openAddDeadlineModal = openAddDeadlineModal;
    window.saveSubjectPointsItem = saveSubjectPointsItem;
    window.updateSubjectPoints = updateSubjectPoints;
    window.deleteSubjectItem = deleteSubjectItem;
    window.seedFITFirstSemesterSubjects = seedFITFirstSemesterSubjects;
    window.saveDeadlineItem = saveDeadlineItem;
    window.toggleDeadlineComplete = toggleDeadlineComplete;
    window.deleteDeadlineItem = deleteDeadlineItem;
    window.applySubjectPresetPoints = (code, name) => {
        const elCode = document.getElementById('fit-sub-code');
        const elName = document.getElementById('fit-sub-name');
        if (elCode) elCode.value = code;
        if (elName) elName.value = name;
    };
}
