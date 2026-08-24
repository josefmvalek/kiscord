/**
 * Maturita Module Orchestrator & Canonical Entry Point
 */

import { state, ensureMaturaData } from '@core/state.js';
import { renderDashboard, handleMaturaSearch, renderTodaysMissions } from './dashboard.js';
import { renderList } from './list.js';
import { initPomodoro, togglePomodoro, pomodoroState } from './pomodoro.js';
import { 
    openKnowledgeBase, 
    closeKnowledgeBase, 
    toggleLocalTheme, 
    toggleMobileTOC, 
    applyCollapsibleSections, 
    toggleAllSections, 
    updateCollapseAllButtonText 
} from './kb.js';
import { 
    openEditor, 
    saveKBContent, 
    switchEditorTab, 
    handleImageUpload, 
    handleKBEditorPaste, 
    uploadAndInsertImage, 
    addNewTopic, 
    openTopicEditor, 
    saveTopicMetadata, 
    formatMarkdown 
} from './editor.js';
import { 
    openGeminiSettings, 
    generateAITest, 
    generateAIQuiz, 
    checkApiKey 
} from './ai.js';
import { 
    openPDFViewer, 
    downloadSinglePDF, 
    downloadAllAsZip, 
    generatePDFFromMarkdown 
} from './export.js';
import { 
    cycleStatus, 
    updateTopicCardUI, 
    updateMaturaStreak, 
    showScheduleMenu, 
    scheduleTopic, 
    removeMission, 
    openNotes, 
    saveNotes, 
    triggerSOS, 
    playBellSound, 
    silentBackfillCount 
} from './actions.js';

export {
    renderDashboard,
    handleMaturaSearch,
    renderTodaysMissions,
    renderList,
    initPomodoro,
    togglePomodoro,
    pomodoroState,
    openKnowledgeBase,
    closeKnowledgeBase,
    toggleLocalTheme,
    toggleMobileTOC,
    applyCollapsibleSections,
    toggleAllSections,
    updateCollapseAllButtonText,
    openEditor,
    saveKBContent,
    switchEditorTab,
    handleImageUpload,
    handleKBEditorPaste,
    uploadAndInsertImage,
    addNewTopic,
    openTopicEditor,
    saveTopicMetadata,
    formatMarkdown,
    openGeminiSettings,
    generateAITest,
    generateAIQuiz,
    checkApiKey,
    openPDFViewer,
    downloadSinglePDF,
    downloadAllAsZip,
    generatePDFFromMarkdown,
    cycleStatus,
    updateTopicCardUI,
    updateMaturaStreak,
    showScheduleMenu,
    scheduleTopic,
    removeMission,
    openNotes,
    saveNotes,
    triggerSOS,
    playBellSound,
    silentBackfillCount
};

/**
 * Main entry point for Matura channels
 */
export async function renderMatura(channelId) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    if (channelId && channelId.startsWith('matura-')) {
        await ensureMaturaData(true);
    }

    if (channelId === 'matura-dashboard') {
        renderDashboard(container);
    } else if (channelId === 'matura-czech') {
        const user = state.currentUser?.name === 'Jožka' ? 'jozka' : 'klarka';
        renderList(container, `czech_${user}`);
    } else if (channelId === 'matura-it') {
        renderList(container, 'it');
    }
}

// Global Matura helper registration for compatibility
window.KiscordMatura = {
    renderMatura,
    renderDashboard,
    renderList,
    openKnowledgeBase,
    closeKnowledgeBase,
    openEditor,
    saveKBContent,
    openNotes,
    saveNotes,
    generateAITest,
    generateAIQuiz,
    openPDFViewer,
    downloadSinglePDF,
    downloadAllAsZip,
    cycleStatus,
    scheduleTopic,
    removeMission,
    openTopicEditor,
    saveTopicMetadata,
    addNewTopic,
    togglePomodoro,
    triggerSOS
};

export default {
    renderMatura,
    renderDashboard,
    handleMaturaSearch,
    renderTodaysMissions,
    renderList,
    initPomodoro,
    togglePomodoro,
    pomodoroState,
    openKnowledgeBase,
    closeKnowledgeBase,
    toggleLocalTheme,
    toggleMobileTOC,
    applyCollapsibleSections,
    toggleAllSections,
    updateCollapseAllButtonText,
    openEditor,
    saveKBContent,
    switchEditorTab,
    handleImageUpload,
    handleKBEditorPaste,
    uploadAndInsertImage,
    addNewTopic,
    openTopicEditor,
    saveTopicMetadata,
    formatMarkdown,
    openGeminiSettings,
    generateAITest,
    generateAIQuiz,
    checkApiKey,
    openPDFViewer,
    downloadSinglePDF,
    downloadAllAsZip,
    generatePDFFromMarkdown,
    cycleStatus,
    updateTopicCardUI,
    updateMaturaStreak,
    showScheduleMenu,
    scheduleTopic,
    removeMission,
    openNotes,
    saveNotes,
    triggerSOS,
    playBellSound,
    silentBackfillCount
};
