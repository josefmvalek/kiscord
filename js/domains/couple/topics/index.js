/**
 * Conversation Topics Module Orchestrator
 */

import { state } from '@core/state.js';

export * from './state.js';
export * from './modal.js';
export * from './player.js';
export * from './management.js';

import {
    setSelectedTopicId
} from './state.js';

import {
    ensureModals
} from './modal.js';

import {
    openTopic,
    openRandomTopic,
    nextQuestion,
    prevQuestion,
    markQuestionDone,
    toggleQuestionBookmark,
    toggleViewBookmarks,
    closeTopicModal
} from './player.js';

import {
    requestResetTopic,
    requestResetBookmarks,
    confirmResetTopic,
    showAddTopicQuestionModal,
    saveNewTopicQuestion,
    exportTopicsToTxt,
    clearOldTopicQuestions
} from './management.js';

export function renderTopics() {
    attachWindowTopics();
    ensureModals();

    const container = document.getElementById("messages-container");
    if (!container) return;

    if (!state.topicProgress) state.topicProgress = {};
    if (!state.conversationTopics) state.conversationTopics = [];

    // Trigger lazy loading if data is not loaded yet
    if (state.conversationTopics.length === 0) {
        import('@core/loaders.js').then(l => l.ensureTopicsData?.()).then(() => {
            if (state.currentChannel === 'topics') renderTopics();
        }).catch(err => console.warn('[Topics] Lazy load failed:', err));
    }

    let html = `<div class="p-6 max-w-7xl mx-auto animate-fade-in space-y-6">`;

    // Calculate total bookmarks
    let totalBookmarks = 0;
    Object.values(state.topicProgress || {}).forEach((prog) => {
        if (prog && prog.bookmarks) {
            totalBookmarks += prog.bookmarks.length;
        }
    });

    // Header
    html += `
        <div class="flex justify-between items-end border-b border-gray-700 pb-4">
            <div>
                <h2 class="text-3xl font-extrabold text-white mb-1">Knihovna Témat</h2>
                <p class="text-gray-400 text-sm">Hluboké otázky, abychom se poznali ještě líp.</p>
            </div>
            <div class="flex gap-2">
                <button onclick="window.Topics.exportTopicsToTxt()" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg font-bold transition shadow-lg flex items-center gap-2">
                    <i class="fas fa-file-export"></i>
                    <span class="hidden sm:inline">Exportovat</span>
                </button>
                <button onclick="window.Topics.showAddTopicQuestionModal()" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-4 py-2 rounded-lg font-bold transition shadow-lg flex items-center gap-2">
                    <i class="fas fa-plus"></i>
                    <span class="hidden sm:inline">Nová otázka</span>
                </button>
                <button onclick="window.Topics.openRandomTopic()" class="bg-[#2f3136] hover:bg-[#eb459e] text-white px-4 py-2 rounded-lg font-bold transition border border-gray-600 hover:border-[#eb459e] shadow-lg flex items-center gap-2 group">
                    <i class="fas fa-random group-hover:rotate-180 transition-transform duration-500"></i>
                    <span class="hidden sm:inline">Náhodná</span>
                </button>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;

    // 1. Favorites master card
    const resetBookmarksBtn = totalBookmarks > 0
        ? `<button onclick="event.stopPropagation(); window.Topics.requestResetBookmarks()" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Vymazat všechny oblíbené">
            <i class="fas fa-undo-alt"></i>
          </button>`
        : "";

    html += `
        <div onclick="window.Topics.openTopic('bookmarks')" class="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-xl p-6 cursor-pointer border border-[#faa61a]/50 hover:border-[#faa61a] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
            ${resetBookmarksBtn}
            <div class="absolute -right-6 -bottom-6 text-9xl opacity-10 group-hover:opacity-20 transition-opacity rotate-12 select-none pointer-events-none grayscale-0">💖</div>
            <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#202225] group-hover:scale-110 transition-transform duration-300 shadow-md text-[#faa61a] border border-[#faa61a]/30">💖</div>
            </div>
            <h3 class="text-xl font-bold text-white mb-2 group-hover:text-[#faa61a] transition-colors">Moje Oblíbené</h3>
            <p class="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow pr-6">Všechny otázky, které sis uložila na později, hezky pohromadě.</p>
            <div class="mt-auto">
                <div class="flex justify-between text-xs font-bold text-[#faa61a] mb-1">
                    <span>Uloženo</span>
                    <span>${totalBookmarks} otázek</span>
                </div>
                <div class="w-full bg-[#202225] h-2 rounded-full overflow-hidden">
                    <div class="h-full bg-[#faa61a]" style="width: ${totalBookmarks > 0 ? "100%" : "0%"}"></div>
                </div>
            </div>
        </div>
    `;

    // 2. Standard categories
    (state.conversationTopics || []).forEach((topic) => {
        const prog = (state.topicProgress && state.topicProgress[topic.id]) || { index: 0, completed: false, bookmarks: [] };
        const doneIndices = prog.doneIndices || []; 
        const doneCount = doneIndices.length;
        const totalCount = (topic.questions && topic.questions.length) || 0;
        const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        const progressColor = percent === 100 ? "#3ba55c" : topic.color;

        const resetButton = doneCount > 0
            ? `<button onclick="event.stopPropagation(); window.Topics.requestResetTopic('${topic.id}')" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Resetovat postup">
             <i class="fas fa-undo-alt"></i>
           </button>`
            : "";

        html += `
            <div onclick="window.Topics.openTopic('${topic.id}')" class="bg-[#2f3136] rounded-xl p-6 cursor-pointer border border-[#202225] hover:border-[${topic.color}] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
                 ${resetButton}
                <div class="absolute -right-6 -bottom-6 text-9xl opacity-5 group-hover:opacity-10 transition-opacity grayscale group-hover:grayscale-0 rotate-12 select-none pointer-events-none">${topic.icon}</div>
                <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#202225] group-hover:scale-110 transition-transform duration-300 shadow-md" style="color: ${topic.color}">${topic.icon}</div>
                </div>
                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-[${topic.color}] transition-colors">${topic.title}</h3>
                <p class="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow pr-6">${topic.desc}</p>
                <div class="mt-auto">
                    <div class="flex justify-between text-xs font-bold text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>${doneCount} / ${totalCount}</span>
                    </div>
                    <div class="w-full bg-[#202225] h-2 rounded-full overflow-hidden">
                        <div class="h-full transition-all duration-1000 ease-out" style="width: ${percent}%; background-color: ${progressColor}"></div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

export function attachWindowTopics() {
    window.Topics = { 
        render: renderTopics,
        renderTopics,
        openTopic,
        requestResetTopic,
        requestResetBookmarks, 
        confirmResetTopic,
        closeTopicModal,
        openRandomTopic,
        nextQuestion, 
        markQuestionDone,
        prevQuestion,
        toggleQuestionBookmark, 
        toggleViewBookmarks,
        showAddTopicQuestionModal,
        saveNewTopicQuestion,
        exportTopicsToTxt,
        clearOldTopicQuestions,
        setTopicId: (id) => setSelectedTopicId(id)
    };

    window.renderTopics = renderTopics;
}

if (typeof window !== 'undefined') {
    attachWindowTopics();
}

export default {
    renderTopics,
    attachWindowTopics
};
