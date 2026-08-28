export {
    renderGym,
    switchTab,
    gymCleanup,
    openCalendarView,
    viewInCalendar,
    attachWindowGym
} from './main.js';

export {
    startWorkout,
    startFreeWorkout,
    renderActiveWorkoutView,
    adjustVal,
    adjustActiveExerciseWeight,
    toggleSetComplete,
    setRestDuration,
    startRestTimer,
    toggleRestTimer,
    resetRestTimer,
    cancelWorkout,
    finishWorkout,
    openFinishWorkoutModal,
    commitFinishWorkout,
    minimizeWorkout,
    restoreWorkout,
    onSetInputChange,
    restoreWorkoutGlobal,
    renderMinimizedBanner,
    cycleSetType,
    openAddExerciseToActiveWorkoutModal,
    addExerciseToActiveWorkout,
    toggleTimerSound,
    filterExByCat,
    applyWeightSuggestion,
    incrementWorkoutRound,
    decrementWorkoutRound,
    toggleExerciseSuperset,
    openRestModeOverlay,
    adjustRestTime,
    skipRestTimer,
    handleWorkoutPhotoSelected,
    clearWorkoutPhoto,
    openPhotoLightbox,
    toggleWorkoutChecklistItem,
    moveExerciseUp,
    moveExerciseDown,
    removeExerciseFromActiveWorkout,
    openSwapExerciseModal,
    swapExercise,
    openExerciseNotesModal,
    saveExerciseNotes,
    fillSetsFromLastHistory,
    cycleSetRir,
    addSetToActiveExercise,
    removeSetFromActiveExercise
} from './activeWorkout.js';

export {
    renderTemplatesTab,
    openCreateTemplateModal,
    saveTemplate,
    deleteTemplate,
    openEditTemplateModal,
    saveEditedTemplate,
    checkAndSeed,
    refreshExercisesConfig,
    openManualLogModal,
    saveManualLog,
    openScheduleTemplateModal,
    saveScheduledTemplate,
    addManualSet,
    removeManualSet,
    openEditGymLogModal,
    saveEditGymLog,
    onTemplateModeChange
} from './templates.js';

export {
    renderFeedTab,
    cheerWorkout,
    deleteLog,
    openLogDetailModal
} from './feed.js';

export {
    isSyncWorkoutDay,
    getAllSyncDays,
    calculateCoupleStreak,
    renderCoupleGymBannerHtml
} from './coupleGym.js';


export {
    renderPRsTab,
    openExerciseAnalyticsModal,
    renderAnalyticsChart,
    setAnalyticsUser
} from './prs.js';

export {
    renderExercisesTab,
    filterTabExercises,
    filterModalExercises,
    openCreateExerciseModal,
    saveExercise,
    openEditExerciseModal,
    saveEditedExercise,
    deleteExercise,
    openExerciseGuideModal,
    getExerciseThumbnailHtml,
    getCategoryEmoji,
    applyExercisePreset,
    openExerciseCatalogModal,
    filterCatalogExercises,
    setCatalogCategoryFilter,
    importCatalogExercise
} from './exercises.js';

export {
    updateGlobalWorkoutBadge,
    cleanupRealtime,
    POPULAR_EXERCISE_PRESETS,
    getMyName,
    getPartnerName,
    getMyEmoji,
    getPartnerEmoji
} from './shared.js';


export {
    calculate1RM,
    get1RMPercentages,
    calculatePlates,
    renderPlateBarbellVisual,
    openPlateCalculatorModal,
    generateWarmupSets,
    openWarmupModal,
    getExerciseTargetSuggestion,
    STANDARD_PLATES,
    BAR_TYPES
} from './tools.js';

export {
    calculateWeeklyVolume,
    calculateMuscleBalance,
    getExerciseProgression,
    cloneTemplate,
    getLastExerciseHistory,
    MUSCLE_CATEGORIES
} from './analytics.js';

export {
    renderBodyTrackerTab,
    openLogMeasurementModal,
    saveBodyMeasurement,
    deleteBodyMeasurement,
    openTransformationSliderModal
} from './bodyTracker.js';

export {
    renderMuscleHeatMapCard,
    setHeatmapTimeframe,
    selectMuscleGroup,
    calculateMuscleHeatmap
} from './muscleMap.js';

export {
    createWorkoutShareCanvas,
    openShareCardModal
} from './gymShare.js';

export {
    calculateFitnessWrapped,
    openFitnessWrappedModal
} from './annualWrapped.js';

export {
    DAYS_OF_WEEK,
    SPLIT_PRESETS,
    getActiveTrainingSplit,
    getActiveSplitForDay,
    renderSplitOverviewBarHtml,
    openSplitManagerModal,
    onSplitDayRestToggle,
    applySplitPreset,
    saveTrainingSplitFromForm,
    deleteTrainingSplit,
    shiftActiveSplitDays,
    startSplitWorkout
} from './splits.js';

