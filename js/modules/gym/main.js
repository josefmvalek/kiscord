import { state, ensureGymData } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';
import {
    activeWorkout, activeTab, setActiveTab,
    loadActiveWorkoutFromStorage, setupRealtime, cleanupRealtime,
    updateGlobalWorkoutBadge, saveActiveWorkoutToStorage,
    syncDefaultExercisesMedia
} from './shared.js';
import {
    renderActiveWorkoutView, openAddExerciseToActiveWorkoutModal,
    addExerciseToActiveWorkout, startWorkout, startFreeWorkout, adjustVal, adjustActiveExerciseWeight,
    toggleSetComplete, setRestDuration, startRestTimer,
    toggleRestTimer, resetRestTimer, toggleTimerSound, cancelWorkout, finishWorkout,
    openFinishWorkoutModal, commitFinishWorkout,
    minimizeWorkout, restoreWorkout, onSetInputChange,
    restoreWorkoutGlobal, renderMinimizedBanner, cycleSetType, filterExByCat,
    applyWeightSuggestion, incrementWorkoutRound, decrementWorkoutRound,
    toggleExerciseSuperset, openRestModeOverlay, adjustRestTime, skipRestTimer,
    handleWorkoutPhotoSelected, clearWorkoutPhoto, openPhotoLightbox,
    toggleWorkoutChecklistItem, moveExerciseUp, moveExerciseDown,
    removeExerciseFromActiveWorkout, openSwapExerciseModal, swapExercise,
    openExerciseNotesModal, saveExerciseNotes, fillSetsFromLastHistory, cycleSetRir
} from './activeWorkout.js';

import {
    renderTemplatesTab, openCreateTemplateModal, saveTemplate,
    deleteTemplate, openEditTemplateModal, saveEditedTemplate,
    checkAndSeed, refreshExercisesConfig, openManualLogModal, saveManualLog,
    openScheduleTemplateModal, saveScheduledTemplate, addManualSet, removeManualSet,
    openEditGymLogModal, saveEditGymLog, onTemplateModeChange
} from './templates.js';
import {
    renderFeedTab, cheerWorkout, deleteLog, openLogDetailModal
} from './feed.js';

import {
    renderPRsTab, openExerciseAnalyticsModal, renderAnalyticsChart, setAnalyticsUser
} from './prs.js';
import {
    renderExercisesTab, filterTabExercises, filterModalExercises,
    openCreateExerciseModal, saveExercise, openEditExerciseModal,
    saveEditedExercise, deleteExercise, openExerciseGuideModal,
    getExerciseThumbnailHtml, getCategoryEmoji, applyExercisePreset
} from './exercises.js';
import {
    openPlateCalculatorModal,
    openWarmupModal,
    calculate1RM,
    calculatePlates
} from './tools.js';
import {
    cloneTemplate
} from './analytics.js';
import {
    renderBodyTrackerTab,
    openLogMeasurementModal,
    saveBodyMeasurement,
    deleteBodyMeasurement,
    openTransformationSliderModal,
    renderBodyChart,
    switchBodyChart
} from './bodyTracker.js';
import {
    setHeatmapTimeframe,
    selectMuscleGroup
} from './muscleMap.js';
import {
    openShareCardModal
} from './gymShare.js';
import {
    openFitnessWrappedModal
} from './annualWrapped.js';

import { getActiveWorkout } from './activeWorkout.js';

export function openCalendarView() {
    triggerHaptic('light');
    window.switchChannel('calendar');
    setTimeout(() => {
        import('../calendar.js').then(m => {
            m.setCalendarFilter('gym');
        });
    }, 50);
}

export function viewInCalendar(dateKey) {
    triggerHaptic('light');
    if (!dateKey) return;
    const [yr, mo] = dateKey.split('-').map(Number);
    window.switchChannel('calendar');
    setTimeout(() => {
        import('../calendar.js').then(m => {
            m.renderCalendar(yr, mo - 1);
            m.showDayDetail(dateKey);
        });
    }, 100);
}

export async function renderGym() {
    if (state.currentChannel !== 'gym-tracker') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    loadActiveWorkoutFromStorage();
    setupRealtime(renderGym);

    if (activeWorkout && !activeWorkout.isMinimized) {
        document.getElementById('floating-settings-btn')?.classList.add('hidden');
        container.innerHTML = renderActiveWorkoutView(renderGym);
        attachWindowGym();
        return;
    } else {
        document.getElementById('floating-settings-btn')?.classList.remove('hidden');
    }

    const templates = state.gymTemplates || [];
    const exercises = state.gymExercises || [];
    if (templates.length === 0 && exercises.length === 0) {
        await checkAndSeed(renderGym);
        return;
    }

    // Auto-sync default exercise GIFs and instructions in background
    syncDefaultExercisesMedia(renderGym);

    let tabContent = '';
    if (activeTab === 'templates') tabContent = renderTemplatesTab();
    else if (activeTab === 'feed') tabContent = renderFeedTab();
    else if (activeTab === 'prs') tabContent = renderPRsTab();
    else if (activeTab === 'measurements') {
        tabContent = renderBodyTrackerTab();
    }
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
                <div class="flex items-center gap-2">
                    <button onclick="window.Gym.openPlateCalculatorModal(60)" class="px-3 py-2 rounded-xl bg-white/5 hover:bg-[#faa61a]/15 text-gray-300 hover:text-[#faa61a] border border-white/5 hover:border-[#faa61a]/30 transition text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm" title="Kalkulačka kotoučů">
                        <span>🧮</span>
                        <span class="hidden sm:inline">Kotouče</span>
                    </button>
                    <button onclick="window.Gym.openCalendarView()" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-[#faa61a]/15 text-gray-300 hover:text-[#faa61a] border border-white/5 hover:border-[#faa61a]/30 transition text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
                        <i class="far fa-calendar-alt text-amber-400"></i>
                        <span class="hidden sm:inline">Kalendář</span>
                    </button>
                </div>
            </div>

            <!-- Main scrollable view -->
            <div class="flex-1 overflow-y-auto w-full p-4 lg:p-6 custom-scrollbar pb-24">
                <div class="max-w-4xl mx-auto">
                    ${renderMinimizedBanner()}

                    <!-- Tab Switcher Bar (Responsive 5-column grid, icon-only on mobile) -->
                    <div class="grid grid-cols-5 gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-[#202225] border border-white/5 rounded-2xl mb-6 select-none shadow-inner">
                        <button onclick="window.Gym.switchTab('templates')" class="py-2.5 px-1 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'templates' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}" title="Plány">
                            <i class="fas fa-list-ul text-sm sm:text-xs"></i>
                            <span class="hidden sm:inline">Plány</span>
                        </button>
                        <button onclick="window.Gym.switchTab('feed')" class="py-2.5 px-1 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'feed' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}" title="Feed">
                            <i class="fas fa-stream text-sm sm:text-xs"></i>
                            <span class="hidden sm:inline">Feed</span>
                        </button>
                        <button onclick="window.Gym.switchTab('prs')" class="py-2.5 px-1 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'prs' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}" title="PRs">
                            <i class="fas fa-trophy text-sm sm:text-xs"></i>
                            <span class="hidden sm:inline">PRs</span>
                        </button>
                        <button onclick="window.Gym.switchTab('measurements')" class="py-2.5 px-1 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'measurements' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}" title="Míry">
                            <i class="fas fa-ruler-combined text-sm sm:text-xs"></i>
                            <span class="hidden sm:inline">Míry</span>
                        </button>
                        <button onclick="window.Gym.switchTab('exercises')" class="py-2.5 px-1 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === 'exercises' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}" title="Cviky">
                            <i class="fas fa-dumbbell text-sm sm:text-xs"></i>
                            <span class="hidden sm:inline">Cviky</span>
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

    // Post-render: initialize body chart if on measurements tab
    if (activeTab === 'measurements') {
        requestAnimationFrame(() => {
            if (typeof switchBodyChart === 'function') {
                switchBodyChart('weight');
            }
        });
    }
}

export function switchTab(tab) {
    triggerHaptic('light');
    setActiveTab(tab);
    renderGym();
}

export function gymCleanup() {
    cleanupRealtime();
    document.getElementById('floating-settings-btn')?.classList.remove('hidden');
}

export function attachWindowGym() {
    window.Gym = {
        renderGym,
        switchTab,
        startWorkout: (id) => startWorkout(id, renderGym),
        startFreeWorkout: () => startFreeWorkout(renderGym),
        adjustVal,
        adjustActiveExerciseWeight,
        toggleSetComplete: (exIdx, setIdx) => toggleSetComplete(exIdx, setIdx, renderGym),
        setRestDuration: (sec) => setRestDuration(sec, renderGym),
        startRestTimer: () => startRestTimer(renderGym),
        toggleRestTimer: () => toggleRestTimer(renderGym),
        resetRestTimer: () => resetRestTimer(renderGym),
        toggleTimerSound: () => toggleTimerSound(renderGym),
        cancelWorkout: () => cancelWorkout(renderGym),
        finishWorkout: () => finishWorkout(renderGym),
        openFinishWorkoutModal: () => openFinishWorkoutModal(renderGym),
        commitFinishWorkout: () => commitFinishWorkout(renderGym),
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
        openScheduleTemplateModal: (id, ev) => openScheduleTemplateModal(id, ev),
        saveScheduledTemplate: () => saveScheduledTemplate(renderGym),
        addManualSet,
        removeManualSet,
        filterModalExercises,
        openManualLogModal: (renderFn, dtKey) => openManualLogModal(renderFn || renderGym, dtKey),
        saveManualLog: () => saveManualLog(renderGym),
        openEditGymLogModal: (logId, dtKey) => openEditGymLogModal(logId, dtKey),
        saveEditGymLog: (logId) => saveEditGymLog(logId, renderGym),
        cheerWorkout: (id) => cheerWorkout(id, renderGym),
        deleteLog: (id) => deleteLog(id, renderGym),
        openLogDetailModal,
        openExerciseAnalyticsModal,
        renderAnalyticsChart,
        setAnalyticsUser,
        filterTabExercises,
        openExerciseGuideModal,
        getExerciseThumbnailHtml,
        getCategoryEmoji,
        applyExercisePreset,
        openEditExerciseModal,
        saveEditedExercise: () => saveEditedExercise(renderGym),
        deleteExercise: (id) => deleteExercise(id, renderGym),
        cycleSetType: (exIdx, setIdx) => cycleSetType(exIdx, setIdx, renderGym),
        refreshExercisesConfig,
        filterExByCat,
        applyWeightSuggestion,
        incrementWorkoutRound: () => incrementWorkoutRound(renderGym),
        decrementWorkoutRound,
        toggleExerciseSuperset: (exIdx) => toggleExerciseSuperset(exIdx, renderGym),
        onTemplateModeChange,
        openAddExerciseToActiveWorkoutModal,
        addExerciseToActiveWorkout: (id) => addExerciseToActiveWorkout(id, renderGym),
        updateGlobalWorkoutBadge,
        openCalendarView,
        viewInCalendar,
        openPlateCalculatorModal,
        openWarmupModal,
        calculate1RM,
        calculatePlates,
        cloneTemplate,
        openLogMeasurementModal,
        saveBodyMeasurement,
        deleteBodyMeasurement,
        openTransformationSliderModal,
        switchBodyChart,
        openRestModeOverlay,
        adjustRestTime,
        skipRestTimer: () => skipRestTimer(renderGym),
        setHeatmapTimeframe: (days) => setHeatmapTimeframe(days, renderGym),
        selectMuscleGroup: (key) => selectMuscleGroup(key, renderGym),
        openShareCardModal,
        openFitnessWrappedModal,
        handleWorkoutPhotoSelected,
        clearWorkoutPhoto,
        openPhotoLightbox,
        toggleWorkoutChecklistItem: (item) => toggleWorkoutChecklistItem(item, renderGym),
        moveExerciseUp: (exIdx) => moveExerciseUp(exIdx, renderGym),
        moveExerciseDown: (exIdx) => moveExerciseDown(exIdx, renderGym),
        removeExerciseFromActiveWorkout: (exIdx) => removeExerciseFromActiveWorkout(exIdx, renderGym),
        openSwapExerciseModal,
        swapExercise: (exIdx, newId) => swapExercise(exIdx, newId, renderGym),
        openExerciseNotesModal,
        saveExerciseNotes: (exIdx, notes) => saveExerciseNotes(exIdx, notes, renderGym),
        fillSetsFromLastHistory: (exIdx) => fillSetsFromLastHistory(exIdx, renderGym),
        cycleSetRir: (exIdx, sIdx) => cycleSetRir(exIdx, sIdx, renderGym),
        getActiveWorkout,
        renderGym
    };
}

// Auto-attach to window immediately on module load
if (typeof window !== 'undefined') {
    attachWindowGym();
}
