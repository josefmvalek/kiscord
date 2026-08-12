import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import {
    activeWorkout, activeTab, setActiveTab,
    loadActiveWorkoutFromStorage, setupRealtime, cleanupRealtime,
    updateGlobalWorkoutBadge, saveActiveWorkoutToStorage
} from './shared.js';
import {
    renderActiveWorkoutView, openAddExerciseToActiveWorkoutModal,
    addExerciseToActiveWorkout, startWorkout, adjustVal,
    toggleSetComplete, setRestDuration, startRestTimer,
    toggleRestTimer, resetRestTimer, cancelWorkout, finishWorkout,
    minimizeWorkout, restoreWorkout, onSetInputChange,
    restoreWorkoutGlobal, renderMinimizedBanner, cycleSetType
} from './activeWorkout.js';
import {
    renderTemplatesTab, openCreateTemplateModal, saveTemplate,
    deleteTemplate, openEditTemplateModal, saveEditedTemplate,
    checkAndSeed, refreshExercisesConfig, openManualLogModal, saveManualLog
} from './templates.js';
import {
    renderFeedTab, cheerWorkout, deleteLog
} from './feed.js';
import {
    renderPRsTab, openExerciseAnalyticsModal, renderAnalyticsChart
} from './prs.js';
import {
    renderExercisesTab, filterTabExercises, filterModalExercises,
    openCreateExerciseModal, saveExercise, openEditExerciseModal,
    saveEditedExercise, deleteExercise
} from './exercises.js';


export async function renderGym() {
    if (state.currentChannel !== 'gym-tracker') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    loadActiveWorkoutFromStorage();
    setupRealtime(renderGym);

    if (activeWorkout && !activeWorkout.isMinimized) {
        container.innerHTML = renderActiveWorkoutView(renderGym);
        attachWindowGym();
        return;
    }

    const templates = state.gymTemplates || [];
    const exercises = state.gymExercises || [];
    if (templates.length === 0 && exercises.length === 0) {
        await checkAndSeed(renderGym);
        return;
    }

    let tabContent = '';
    if (activeTab === 'templates') tabContent = renderTemplatesTab();
    else if (activeTab === 'feed') tabContent = renderFeedTab();
    else if (activeTab === 'prs') tabContent = renderPRsTab();
    else if (activeTab === 'exercises') tabContent = renderExercisesTab();

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <!-- Header bar -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex justify-between items-center gap-4 select-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-[#faa61a]/10 flex items-center justify-center text-xl text-[#faa61a] border border-[#faa61a]/20">
                        🏋️‍♂️
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight leading-none">Fitness Tracker</h1>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Tréninky & Společné Pokroky 💪</p>
                    </div>
                </div>
            </div>

            <!-- Main scrollable view -->
            <div class="flex-1 overflow-y-auto w-full p-4 lg:p-6 custom-scrollbar pb-24">
                <div class="max-w-4xl mx-auto">
                    ${renderMinimizedBanner()}

                    <!-- Tab Switcher Bar -->
                    <div class="flex gap-1.5 p-1.5 bg-[#202225] border border-white/5 rounded-2xl mb-6 select-none shadow-inner">
                        <button onclick="window.Gym.switchTab('templates')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'templates' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}">
                            <i class="fas fa-list-ul"></i> Plány
                        </button>
                        <button onclick="window.Gym.switchTab('feed')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'feed' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}">
                            <i class="fas fa-stream"></i> Feed
                        </button>
                        <button onclick="window.Gym.switchTab('prs')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'prs' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}">
                            <i class="fas fa-trophy"></i> PRs
                        </button>
                        <button onclick="window.Gym.switchTab('exercises')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'exercises' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}">
                            <i class="fas fa-dumbbell"></i> Cviky
                        </button>
                    </div>

                    <!-- Active Tab Container -->
                    <div id="gym-tab-content" class="animate-fade-in">
                        ${tabContent}
                    </div>
                </div>
            </div>
        </div>
    `;

    attachWindowGym();
}

export function switchTab(tab) {
    triggerHaptic('light');
    setActiveTab(tab);
    renderGym();
}

export function gymCleanup() {
    cleanupRealtime();
}

function attachWindowGym() {
    window.Gym = {
        renderGym,
        switchTab,
        startWorkout: (id) => startWorkout(id, renderGym),
        adjustVal,
        toggleSetComplete: (exIdx, setIdx) => toggleSetComplete(exIdx, setIdx, renderGym),
        setRestDuration: (sec) => setRestDuration(sec, renderGym),
        startRestTimer: () => startRestTimer(renderGym),
        toggleRestTimer: () => toggleRestTimer(renderGym),
        resetRestTimer: () => resetRestTimer(renderGym),
        cancelWorkout: () => cancelWorkout(renderGym),
        finishWorkout: () => finishWorkout(renderGym),
        minimizeWorkout: () => minimizeWorkout(renderGym),
        restoreWorkout: () => restoreWorkout(renderGym),
        onSetInputChange,
        restoreWorkoutGlobal,
        openCreateExerciseModal,
        saveExercise: () => saveExercise(renderGym),
        openCreateTemplateModal,
        saveTemplate: () => saveTemplate(renderGym),
        deleteTemplate: (id, ev) => deleteTemplate(id, ev, renderGym),
        openEditTemplateModal,
        saveEditedTemplate: () => saveEditedTemplate(renderGym),
        filterModalExercises,
        openManualLogModal: () => openManualLogModal(renderGym),
        saveManualLog: () => saveManualLog(renderGym),
        cheerWorkout: (id) => cheerWorkout(id, renderGym),
        deleteLog: (id) => deleteLog(id, renderGym),
        openExerciseAnalyticsModal,
        renderAnalyticsChart,
        filterTabExercises,
        openEditExerciseModal,
        saveEditedExercise: () => saveEditedExercise(renderGym),
        deleteExercise: (id) => deleteExercise(id, renderGym),
        cycleSetType: (exIdx, setIdx) => cycleSetType(exIdx, setIdx, renderGym),
        refreshExercisesConfig,
        openAddExerciseToActiveWorkoutModal,
        addExerciseToActiveWorkout: (id) => addExerciseToActiveWorkout(id, renderGym),
        updateGlobalWorkoutBadge
    };
}
