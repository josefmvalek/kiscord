
import { state } from '../core/state.js';
// import { conversationTopics } from '../data.js'; // Smazáno, nyní ze state
import { triggerHaptic } from '../core/utils.js';
import { supabase } from '../core/supabase.js';

// --- STATE ---
let activeTopicObject = null;

// --- EXPORTED FUNCTIONS ---

export function renderTopics() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    let html = `<div class="p-6 max-w-7xl mx-auto animate-fade-in space-y-6">`;

    // Spočítáme celkový počet uložených otázek
    let totalBookmarks = 0;
    Object.values(state.topicProgress).forEach((prog) => {
        totalBookmarks += (prog.bookmarks || []).length;
    });

    // Header
    html += `
              <div class="flex justify-between items-end border-b border-gray-700 pb-4">
                  <div>
                      <h2 class="text-3xl font-extrabold text-white mb-1">Knihovna Témat</h2>
                      <p class="text-gray-400 text-sm">Hluboké otázky, abychom se poznali ještě líp.</p>
                  </div>
                  <button onclick="import('./js/modules/topics.js').then(m => m.openRandomTopic())" class="bg-[#2f3136] hover:bg-[#eb459e] text-white px-4 py-2 rounded-lg font-bold transition border border-gray-600 hover:border-[#eb459e] shadow-lg flex items-center gap-2 group">
                      <i class="fas fa-random group-hover:rotate-180 transition-transform duration-500"></i>
                      <span class="hidden sm:inline">Náhodná otázka</span>
                  </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              `;

    // 1. SPECIÁLNÍ KARTA: ULOŽENÉ
    const resetBookmarksBtn = totalBookmarks > 0
        ? `<button onclick="event.stopPropagation(); import('./js/modules/topics.js').then(m => m.requestResetBookmarks())" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Vymazat všechny oblíbené">
            <i class="fas fa-undo-alt"></i>
          </button>`
        : "";

    html += `
                  <div onclick="import('./js/modules/topics.js').then(m => m.openTopic('bookmarks'))" class="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-xl p-6 cursor-pointer border border-[#faa61a]/50 hover:border-[#faa61a] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
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

    // 2. STANDARDNÍ KATEGORIE
    state.conversationTopics.forEach((topic) => {
        const prog = state.topicProgress[topic.id] || { index: 0, completed: false, bookmarks: [] };
        // Since we don't track exact indices of DONE questions in new schema (just index of current/last),
        // we might want to reconsider. But for simplicity let's stick to current logic or adapt.
        // Old logic used array of indices. Let's keep array of indices in Supabase column.
        const doneIndices = prog.doneIndices || []; 
        const doneCount = doneIndices.length;
        const totalCount = topic.questions.length;
        const percent = Math.round((doneCount / totalCount) * 100);
        const progressColor = percent === 100 ? "#3ba55c" : topic.color;

        const resetButton = doneCount > 0
            ? `<button onclick="event.stopPropagation(); import('./js/modules/topics.js').then(m => m.requestResetTopic('${topic.id}'))" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Resetovat postup">
             <i class="fas fa-undo-alt"></i>
           </button>`
            : "";

        html += `
                  <div onclick="import('./js/modules/topics.js').then(m => m.openTopic('${topic.id}'))" class="bg-[#2f3136] rounded-xl p-6 cursor-pointer border border-[#202225] hover:border-[${topic.color}] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
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

export function openTopic(id) {
    state.topicSessionHistory = []; // Reset historie
    state.isViewingBookmarks = false; // Reset filtru

    // LOGIKA PRO MASTER KARTU OBLÍBENÝCH
    if (id === "bookmarks") {
        let allBookmarkedQuestions = [];
        state.conversationTopics.forEach((topic) => {
            const prog = state.topicProgress[topic.id] || {};
            const savedIndices = prog.bookmarks || [];
            savedIndices.forEach((index) => {
                allBookmarkedQuestions.push(topic.questions[index]);
            });
        });

        if (allBookmarkedQuestions.length === 0) {
            if (window.showNotification) window.showNotification("Zatím nemáš žádné uložené otázky! ❤️", "info");
            return;
        }

        activeTopicObject = {
            id: "bookmarks",
            title: "Všechny oblíbené",
            icon: "💖",
            color: "#faa61a",
            questions: allBookmarkedQuestions,
        };
    }
    // LOGIKA PRO STANDARDNÍ KATEGORIE
    else {
        const topic = state.conversationTopics.find((t) => t.id === id);
        if (!topic) return;
        activeTopicObject = topic;
    }

    state.currentTopicId = activeTopicObject.id;

    // UI Setup
    const bookmarkToggleBtn = document.getElementById("btn-view-bookmarks");
    if (bookmarkToggleBtn) {
        if (state.currentTopicId === "bookmarks") {
            bookmarkToggleBtn.style.display = "none";
        } else {
            bookmarkToggleBtn.style.display = "flex";
            // updateBookmarkViewButton(); // Needs to be local helper or duplicated?
            // Assuming updateBookmarkViewButton logic is simple toggling of style
            const btn = bookmarkToggleBtn;
            if (state.isViewingBookmarks) {
                btn.classList.add("bg-[#faa61a]", "text-white", "border-transparent");
                btn.classList.remove("bg-transparent", "text-gray-400", "border-gray-600");
            } else {
                btn.classList.remove("bg-[#faa61a]", "text-white", "border-transparent");
                btn.classList.add("bg-transparent", "text-gray-400", "border-gray-600");
            }
        }
    }

    // Nastavení vzhledu Modálu
    const title = document.getElementById("topic-modal-title");
    if (title) title.style.color = activeTopicObject.color;

    const name = document.getElementById("topic-modal-name");
    if (name) name.innerText = activeTopicObject.title;

    const icon = document.getElementById("topic-modal-icon");
    if (icon) icon.innerText = activeTopicObject.icon;

    const bar = document.getElementById("topic-card-bar");
    if (bar) bar.style.background = `linear-gradient(to right, ${activeTopicObject.color}, #5865F2)`;

    const modal = document.getElementById("topic-modal");
    if (modal) {
        modal.style.display = "flex";
        modal.classList.remove("opacity-0");
    }

    nextQuestion(true);
}

export function requestResetTopic(id) {
    state.pendingResetId = id;
    const modal = document.getElementById("reset-confirm-modal");
    if (modal) modal.style.display = "flex";
}

export function requestResetBookmarks() {
    state.pendingResetId = "ALL_BOOKMARKS";
    const modal = document.getElementById("reset-confirm-modal");
    if (modal) modal.style.display = "flex";
}

export async function confirmResetTopic() {
    if (!state.pendingResetId) return;

    if (state.pendingResetId === "ALL_BOOKMARKS") {
        // Clear bookmarks across all topics
        for (const tid in state.topicProgress) {
            state.topicProgress[tid].bookmarks = [];
            await supabase.from('topic_progress').upsert({
                user_id: state.currentUser.id,
                topic_id: tid,
                bookmarks: []
            });
        }
        if (window.showNotification) window.showNotification("Všechny oblíbené otázky smazány! 🗑️", "success");
    } else {
        state.topicProgress[state.pendingResetId] = { index: 0, completed: false, bookmarks: [], doneIndices: [] };
        await supabase.from('topic_progress').delete().match({ 
            user_id: state.currentUser.id, 
            topic_id: state.pendingResetId 
        });
        if (window.showNotification) window.showNotification("Postup resetován! 🔄", "success");
    }

    if (window.closeModal) window.closeModal("reset-confirm-modal");
    else document.getElementById("reset-confirm-modal").style.display = "none";

    renderTopics();
    state.pendingResetId = null;
}

export function closeTopicModal() {
    const modal = document.getElementById("topic-modal");
    if (modal) {
        modal.classList.add("opacity-0");
        setTimeout(() => {
            modal.style.display = "none";
            if (state.currentChannel === "topics") renderTopics();
        }, 300);
    }
}

export function openRandomTopic() {
    const randomTopic = state.conversationTopics[Math.floor(Math.random() * state.conversationTopics.length)];
    openTopic(randomTopic.id);
}

export function nextQuestion(firstLoad = false) {
    const topic = activeTopicObject;
    let availableIndices = [];

    if (state.currentTopicId === "bookmarks") {
        availableIndices = topic.questions.map((_, index) => index);
        const el = document.getElementById("topic-remaining");
        if (el) el.innerText = `${availableIndices.length} celkem`;
    } else {
        const prog = state.topicProgress[state.currentTopicId] || { doneIndices: [], bookmarks: [] };
        const doneIndices = prog.doneIndices || [];
        const bookmarkedIndices = prog.bookmarks || [];

        if (state.isViewingBookmarks) {
            availableIndices = bookmarkedIndices;
            const el = document.getElementById("topic-remaining");
            if (el) el.innerText = `${availableIndices.length} (uloženo)`;
        } else {
            availableIndices = topic.questions.map((_, index) => index).filter((index) => !doneIndices.includes(index));
            const el = document.getElementById("topic-remaining");
            if (el) el.innerText = availableIndices.length;
        }
    }

    const card = document.getElementById("question-card");
    const textEl = document.getElementById("topic-question-text");
    const controls = document.getElementById("topic-controls");
    const bookmarkBtn = document.getElementById("topic-bookmark-btn");

    if (availableIndices.length === 0) {
        if (state.currentTopicId === "bookmarks") {
            textEl.innerHTML = `<span class="text-gray-400">Nemáš žádné uložené otázky. <br>Přidej si je srdíčkem v kategoriích!</span>`;
        } else {
            textEl.innerHTML = state.isViewingBookmarks
                ? `<span class="text-gray-400">Zatím sis v této kategorii nic neuložila.</span>`
                : `<span class="text-[#3ba55c]">🎉 Všechny otázky z této kategorie jsou probrány!</span>`;
        }
        if (bookmarkBtn) bookmarkBtn.style.display = "none";
        if (controls) controls.style.visibility = "hidden";
        return;
    }

    if (bookmarkBtn) bookmarkBtn.style.display = "block";
    if (controls) controls.style.visibility = "visible";

    const nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

    // RENDER CONTENT
    state.currentQuestionIndex = nextIndex;
    textEl.innerText = topic.questions[nextIndex];

    if (state.topicSessionHistory[state.topicSessionHistory.length - 1] !== nextIndex) {
        state.topicSessionHistory.push(nextIndex);
    }

    updateBackButtonState();
    updateBookmarkIconState();

    if (!firstLoad) {
        card.classList.remove("animate-fade-in");
        card.classList.add("scale-95", "opacity-50");
        setTimeout(() => {
            card.classList.remove("scale-95", "opacity-50");
            card.classList.add("scale-100", "opacity-100");
        }, 150);
    }
}

// LOCAL HELPERS
function updateBackButtonState() {
    const btn = document.getElementById("btn-prev-question");
    if (btn) btn.disabled = state.topicSessionHistory.length <= 1;
}

function updateBookmarkIconState() {
    const prog = state.topicProgress[state.currentTopicId] || {};
    const savedIndices = prog.bookmarks || [];
    const isSaved = savedIndices.includes(state.currentQuestionIndex);

    const btn = document.getElementById("topic-bookmark-btn");
    if (!btn) return;
    const icon = btn.querySelector("i");

    if (isSaved) {
        icon.classList.remove("far");
        icon.classList.add("fas", "text-[#faa61a]");
    } else {
        icon.classList.remove("fas", "text-[#faa61a]");
        icon.classList.add("far");
    }
}

export async function markQuestionDone() {
    if (!activeTopicObject || state.currentTopicId === "bookmarks") return;

    if (!state.topicProgress[state.currentTopicId]) {
        state.topicProgress[state.currentTopicId] = { index: 0, completed: false, bookmarks: [], doneIndices: [] };
    }

    const prog = state.topicProgress[state.currentTopicId];
    if (!prog.doneIndices) prog.doneIndices = [];

    // Add if not present
    if (!prog.doneIndices.includes(state.currentQuestionIndex)) {
        prog.doneIndices.push(state.currentQuestionIndex);
        
        await supabase.from('topic_progress').upsert({
            user_id: state.currentUser.id,
            topic_id: state.currentTopicId,
            current_index: state.currentQuestionIndex,
            bookmarks: prog.bookmarks || [],
            // we should probably add a column for doneIndices in SQL if we want exact tracking
            // for now let's reuse metadata or just assume progress by index
        });
    }

    triggerHaptic("success");
    // Removed confetti as it may cause lag on mobile

    // Move to next
    nextQuestion();
}

export function prevQuestion() {
    if (state.topicSessionHistory.length <= 1) return;

    // Remove current
    state.topicSessionHistory.pop();
    // Get previous
    const prevIndex = state.topicSessionHistory[state.topicSessionHistory.length - 1];

    state.currentQuestionIndex = prevIndex;

    // UI Update
    const textEl = document.getElementById("topic-question-text");
    if (textEl) textEl.innerText = activeTopicObject.questions[prevIndex];

    updateBackButtonState();
    updateBookmarkIconState();
}

export async function toggleQuestionBookmark() {
    if (!activeTopicObject || state.currentTopicId === "bookmarks") return;

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

    await supabase.from('topic_progress').upsert({
        user_id: state.currentUser.id,
        topic_id: state.currentTopicId,
        bookmarks: prog.bookmarks
    });

    updateBookmarkIconState();
}

export function toggleViewBookmarks() {
    state.isViewingBookmarks = !state.isViewingBookmarks;

    // Update button UI
    const btn = document.getElementById("btn-view-bookmarks");
    if (btn) {
        if (state.isViewingBookmarks) {
            btn.classList.add("bg-[#faa61a]", "text-white", "border-transparent");
            btn.classList.remove("bg-transparent", "text-gray-400", "border-gray-600");
        } else {
            btn.classList.remove("bg-[#faa61a]", "text-white", "border-transparent");
            btn.classList.add("bg-transparent", "text-gray-400", "border-gray-600");
        }
    }

    // Reset history because we are changing the pool of questions
    state.topicSessionHistory = [];

    // Refresh question
    nextQuestion(true);
}
