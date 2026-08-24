/**
 * Conversation Topics Player & Interaction Logic
 */

import { state } from '@core/state.js';
import { safeUpsert } from '@core/offline.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { ensureModals } from './modal.js';
import { getActiveTopicObject, setActiveTopicObject } from './state.js';

export function openTopic(id) {
    ensureModals();
    state.topicSessionHistory = []; // Reset history
    state.isViewingBookmarks = false; // Reset filter

    let activeTopic = null;

    // 1. ALL BOOKMARKS LOGIC
    if (id === "bookmarks") {
        let allBookmarkedQuestions = [];
        (state.conversationTopics || []).forEach((topic) => {
            const prog = (state.topicProgress && state.topicProgress[topic.id]) || {};
            const savedIndices = prog.bookmarks || [];
            savedIndices.forEach((index) => {
                if (topic.questions && topic.questions[index]) {
                    allBookmarkedQuestions.push(topic.questions[index]);
                }
            });
        });

        if (allBookmarkedQuestions.length === 0) {
            showNotification("Zatím nemáš žádné uložené otázky! ❤️", "info");
            return;
        }

        activeTopic = {
            id: "bookmarks",
            title: "Všechny oblíbené",
            icon: "💖",
            color: "#faa61a",
            questions: allBookmarkedQuestions,
        };
    }
    // 2. STANDARD CATEGORY LOGIC
    else {
        const topic = (state.conversationTopics || []).find((t) => t.id === id);
        if (!topic) return;
        activeTopic = topic;
    }

    setActiveTopicObject(activeTopic);
    state.currentTopicId = activeTopic.id;

    // UI Setup
    const bookmarkToggleBtn = document.getElementById("bookmark-filter-btn");
    if (bookmarkToggleBtn) {
        if (state.currentTopicId === "bookmarks") {
            bookmarkToggleBtn.style.display = "none";
        } else {
            bookmarkToggleBtn.style.display = "flex";
            if (state.isViewingBookmarks) {
                bookmarkToggleBtn.classList.add("bg-[#faa61a]", "text-white", "border-transparent");
                bookmarkToggleBtn.classList.remove("bg-white/5", "text-gray-400", "border-white/10");
            } else {
                bookmarkToggleBtn.classList.remove("bg-[#faa61a]", "text-white", "border-transparent");
                bookmarkToggleBtn.classList.add("bg-white/5", "text-gray-400", "border-white/10");
            }
        }
    }

    // Modal Styling
    const badge = document.getElementById("topic-badge");
    if (badge) {
        badge.style.backgroundColor = `${activeTopic.color}20`;
        badge.style.color = activeTopic.color;
        badge.style.borderColor = `${activeTopic.color}40`;
    }

    const titleDisplay = document.getElementById("topic-title-display");
    if (titleDisplay) {
        titleDisplay.innerText = activeTopic.title;
    }

    const icon = document.getElementById("topic-modal-icon");
    if (icon) icon.innerText = activeTopic.icon;

    const bar = document.getElementById("topic-card-bar");
    if (bar) bar.style.background = `linear-gradient(to right, ${activeTopic.color}, #5865F2)`;

    const card = document.getElementById("question-card");
    if (card) {
        card.style.borderColor = `${activeTopic.color}20`;
        card.style.boxShadow = `0 20px 50px rgba(0,0,0,0.5), 0 0 20px ${activeTopic.color}10`;
    }

    const modal = document.getElementById("topic-modal");
    if (modal) {
        modal.style.display = "flex";
        modal.classList.remove("opacity-0");
    }

    nextQuestion(true);
}

export function openRandomTopic() {
    const topics = state.conversationTopics || [];
    if (topics.length === 0) return;
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    openTopic(randomTopic.id);
}

export function nextQuestion(firstLoad = false) {
    const topic = getActiveTopicObject();
    if (!topic || !topic.questions) return;
    let availableIndices = [];

    if (state.currentTopicId === "bookmarks") {
        availableIndices = topic.questions.map((_, index) => index);
        const el = document.getElementById("topic-progress-text");
        if (el) el.innerText = `${availableIndices.length} celkem`;
    } else {
        const prog = (state.topicProgress && state.topicProgress[state.currentTopicId]) || { doneIndices: [], bookmarks: [] };
        const doneIndices = prog.doneIndices || [];
        const bookmarkedIndices = prog.bookmarks || [];

        const el = document.getElementById("topic-progress-text");
        if (state.isViewingBookmarks) {
            availableIndices = bookmarkedIndices;
            if (el) el.innerText = `${availableIndices.length} (uloženo)`;
        } else {
            availableIndices = topic.questions.map((_, index) => index).filter((index) => !doneIndices.includes(index));
            if (el) el.innerText = `Zbývá ${availableIndices.length}`;
        }
    }

    const card = document.getElementById("question-card");
    const textEl = document.getElementById("topic-question-display");
    const controls = document.getElementById("topic-controls");
    const bookmarkBtn = document.getElementById("topic-bookmark-btn");

    if (bookmarkBtn) bookmarkBtn.style.visibility = "hidden";
    if (controls) controls.style.visibility = "hidden";
    
    if (availableIndices.length === 0) {
        if (textEl) {
            if (state.currentTopicId === "bookmarks") {
                textEl.innerHTML = `<span class="text-white/40 font-bold">Nemáš žádné uložené otázky. <br>Přidej si je srdíčkem v kategoriích!</span>`;
            } else {
                textEl.innerHTML = state.isViewingBookmarks
                    ? `<span class="text-white/40 font-bold">Zatím sis v této kategorii nic neuložila.</span>`
                    : `<span class="text-[#3ba55c] font-black uppercase tracking-widest">🎉 Všechny otázky z této kategorie jsou probrány!</span>`;
            }
        }
        return;
    }

    if (bookmarkBtn) bookmarkBtn.style.visibility = "visible";
    if (controls) controls.style.visibility = "visible";

    const nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

    // Render Content
    state.currentQuestionIndex = nextIndex;
    if (textEl) textEl.innerText = topic.questions[nextIndex];

    if (state.topicSessionHistory[state.topicSessionHistory.length - 1] !== nextIndex) {
        state.topicSessionHistory.push(nextIndex);
    }

    updateBackButtonState();
    updateBookmarkIconState();

    if (!firstLoad && card) {
        card.classList.remove("animate-fade-in");
        card.classList.add("scale-95", "opacity-50");
        setTimeout(() => {
            card.classList.remove("scale-95", "opacity-50");
            card.classList.add("scale-100", "opacity-100");
        }, 150);
    }
}

export function prevQuestion() {
    if (!state.topicSessionHistory || state.topicSessionHistory.length <= 1) return;

    // Remove current
    state.topicSessionHistory.pop();
    // Get previous
    const prevIndex = state.topicSessionHistory[state.topicSessionHistory.length - 1];

    state.currentQuestionIndex = prevIndex;

    const activeTopic = getActiveTopicObject();
    const textEl = document.getElementById("topic-question-display");
    if (textEl && activeTopic && activeTopic.questions) {
        textEl.innerText = activeTopic.questions[prevIndex];
    }

    updateBackButtonState();
    updateBookmarkIconState();
}

export function markQuestionDone() {
    const activeTopic = getActiveTopicObject();
    if (!activeTopic || state.currentTopicId === "bookmarks") return;

    if (!state.topicProgress) state.topicProgress = {};
    if (!state.topicProgress[state.currentTopicId]) {
        state.topicProgress[state.currentTopicId] = { index: 0, completed: false, bookmarks: [], doneIndices: [] };
    }

    const prog = state.topicProgress[state.currentTopicId];
    if (!prog.doneIndices) prog.doneIndices = [];

    if (!prog.doneIndices.includes(state.currentQuestionIndex)) {
        prog.doneIndices.push(state.currentQuestionIndex);
        
        // Background cloud persist
        safeUpsert('topic_progress', {
            user_id: state.currentUser?.id,
            topic_id: state.currentTopicId,
            current_index: state.currentQuestionIndex,
            done_indices: prog.doneIndices,
            bookmarks: prog.bookmarks || []
        }).catch(e => console.warn("[Topics] Save progress error:", e));
    }

    triggerHaptic("success");
    nextQuestion();
}

export function toggleQuestionBookmark() {
    const activeTopic = getActiveTopicObject();
    if (!activeTopic || state.currentTopicId === "bookmarks") return;

    if (!state.topicProgress) state.topicProgress = {};
    if (!state.topicProgress[state.currentTopicId]) {
        state.topicProgress[state.currentTopicId] = { index: 0, completed: false, bookmarks: [], doneIndices: [] };
    }

    const prog = state.topicProgress[state.currentTopicId];
    if (!prog.bookmarks) prog.bookmarks = [];

    const index = state.currentQuestionIndex;
    const bIndex = prog.bookmarks.indexOf(index);

    if (bIndex !== -1) {
        prog.bookmarks.splice(bIndex, 1);
        triggerHaptic("light");
    } else {
        prog.bookmarks.push(index);
        triggerHaptic("medium");
    }

    updateBookmarkIconState();

    // Background cloud persist
    safeUpsert('topic_progress', {
        user_id: state.currentUser?.id,
        topic_id: state.currentTopicId,
        bookmarks: prog.bookmarks
    }).catch(e => console.warn("[Topics] Bookmark error:", e));
}

export function toggleViewBookmarks() {
    state.isViewingBookmarks = !state.isViewingBookmarks;

    const btn = document.getElementById("bookmark-filter-btn");
    if (btn) {
        if (state.isViewingBookmarks) {
            btn.classList.add("bg-[#faa61a]", "text-white", "border-transparent");
            btn.classList.remove("bg-white/5", "text-gray-400", "border-white/10");
        } else {
            btn.classList.remove("bg-[#faa61a]", "text-white", "border-transparent");
            btn.classList.add("bg-white/5", "text-gray-400", "border-white/10");
        }
    }

    state.topicSessionHistory = [];
    nextQuestion(true);
}

export function closeTopicModal() {
    const modal = document.getElementById("topic-modal");
    if (modal) {
        modal.classList.add("opacity-0");
        setTimeout(() => {
            modal.style.display = "none";
            if (state.currentChannel === "topics") window.Topics?.render?.();
        }, 300);
    }
}

export function updateBackButtonState() {
    const btn = document.getElementById("btn-prev-question");
    if (btn) btn.disabled = !state.topicSessionHistory || state.topicSessionHistory.length <= 1;
}

export function updateBookmarkIconState() {
    const prog = (state.topicProgress && state.topicProgress[state.currentTopicId]) || {};
    const savedIndices = prog.bookmarks || [];
    const isSaved = savedIndices.includes(state.currentQuestionIndex);

    const btn = document.getElementById("topic-bookmark-btn");
    if (!btn) return;
    const icon = btn.querySelector("i");
    if (!icon) return;

    if (isSaved) {
        icon.classList.remove("far");
        icon.classList.add("fas", "text-[#faa61a]");
    } else {
        icon.classList.remove("fas", "text-[#faa61a]");
        icon.classList.add("far");
    }
}
