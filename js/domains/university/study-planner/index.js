/**
 * VUT FIT Study Planner Module Orchestrator
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';

export * from './store.js';
export * from './pomodoro.js';
export * from './points.js';
export * from './deadlines.js';

import {
    getActiveTab,
    setActiveTab,
    getDeadlinesData,
    loadSubjects,
    loadDeadlines,
    calculateGrade,
    getDeadlineTypeBadge
} from './store.js';

import {
    renderCoworkingWidget,
    toggleStudyPomodoro
} from './pomodoro.js';

import {
    renderPointsView,
    openAddSubjectModalFIT,
    openEditSubjectPointsModal,
    saveSubjectPointsItem,
    updateSubjectPoints,
    deleteSubjectItem,
    seedFITFirstSemesterSubjects,
    applySubjectPresetPoints
} from './points.js';

import {
    renderDeadlinesView,
    openAddDeadlineModal,
    saveDeadlineItem,
    toggleDeadlineComplete,
    deleteDeadlineItem
} from './deadlines.js';

export async function renderStudyPlanner() {
    if (state.currentChannel !== 'study-planner') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await Promise.all([loadSubjects(), loadDeadlines()]);

    const todayStr = new Date().toISOString().split('T')[0];
    const deadlinesData = getDeadlinesData();
    const upcomingDeadlines = deadlinesData.filter(d => !d.is_completed).sort((a, b) => a.deadline_date.localeCompare(b.deadline_date));
    const urgentCount = upcomingDeadlines.filter(d => {
        const diff = Math.ceil((new Date(d.deadline_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 2;
    }).length;

    const activeTab = getActiveTab();

    container.innerHTML = `
        <div class="h-full bg-[var(--bg-app)] flex flex-col font-sans animate-fade-in relative overflow-hidden select-none">
            <!-- Header bar -->
            <div class="bg-[var(--bg-secondary)] shadow-md z-10 flex-shrink-0 border-b border-[var(--border-subtle)] p-4 lg:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                        <button onclick="window.StudyPlanner.setTab('points')" 
                                class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'points' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-calculator text-[10px]"></i> <span class="text-[10px] uppercase font-black">Bodový systém (0–100)</span>
                        </button>
                        <button onclick="window.StudyPlanner.setTab('deadlines')" 
                                class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'deadlines' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-hourglass-half text-[10px]"></i> 
                            <span class="text-[10px] uppercase font-black">Deadliny</span>
                            ${urgentCount > 0 ? `<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>` : ''}
                        </button>
                    </div>

                    ${activeTab === 'points' ? `
                        <button onclick="window.StudyPlanner.openAddSubjectModalFIT()" 
                                class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                            <i class="fas fa-plus text-xs"></i> <span>Přidat předmět</span>
                        </button>
                    ` : `
                        <button onclick="window.StudyPlanner.openAddDeadlineModal()" 
                                class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                            <i class="fas fa-plus text-xs"></i> <span>Nový deadline</span>
                        </button>
                    `}
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-28">
                <div class="max-w-6xl mx-auto space-y-6">

                    <!-- Spolu-studovna & Synchronizované Pomodoro -->
                    ${renderCoworkingWidget()}

                    ${activeTab === 'points' ? renderPointsView() : renderDeadlinesView(upcomingDeadlines)}

                </div>
            </div>
        </div>
    `;

    attachWindowStudyPlanner();
}

export function setStudyPlannerTab(tab) {
    triggerHaptic('light');
    setActiveTab(tab);
    renderStudyPlanner();
}

export function attachWindowStudyPlanner() {
    window.StudyPlanner = {
        render: renderStudyPlanner,
        setTab: setStudyPlannerTab,
        openAddSubjectModalFIT,
        openEditSubjectPointsModal,
        saveSubjectPointsItem,
        updateSubjectPoints,
        deleteSubjectItem,
        seedFITFirstSemesterSubjects,
        applySubjectPresetPoints,
        openAddDeadlineModal,
        saveDeadlineItem,
        toggleDeadlineComplete,
        deleteDeadlineItem,
        toggleStudyPomodoro,
        calculateGrade,
        getDeadlineTypeBadge
    };

    // Backward compatibility globals
    window.renderStudyPlanner = renderStudyPlanner;
    window.setStudyPlannerTab = setStudyPlannerTab;
    window.openAddSubjectModalFIT = openAddSubjectModalFIT;
    window.openEditSubjectPointsModal = openEditSubjectPointsModal;
    window.saveSubjectPointsItem = saveSubjectPointsItem;
    window.updateSubjectPoints = updateSubjectPoints;
    window.deleteSubjectItem = deleteSubjectItem;
    window.seedFITFirstSemesterSubjects = seedFITFirstSemesterSubjects;
    window.applySubjectPresetPoints = applySubjectPresetPoints;
    window.openAddDeadlineModal = openAddDeadlineModal;
    window.saveDeadlineItem = saveDeadlineItem;
    window.toggleDeadlineComplete = toggleDeadlineComplete;
    window.deleteDeadlineItem = deleteDeadlineItem;
    window.toggleStudyPomodoro = toggleStudyPomodoro;
}

if (typeof window !== 'undefined') {
    attachWindowStudyPlanner();
}

export default {
    renderStudyPlanner,
    setStudyPlannerTab,
    attachWindowStudyPlanner
};
