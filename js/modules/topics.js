import { state } from '../core/state.js';
// import { conversationTopics } from '../data.js'; // Smazáno, nyní ze state
import { safeUpsert } from '../core/offline.js';
import { triggerHaptic } from '../core/utils.js';
import { supabase } from '../core/supabase.js';

// --- STATE ---
let activeTopicObject = null;

// --- EXPORTED FUNCTIONS ---

function ensureModals() {
    if (!document.getElementById("topic-modal")) {
        const topicModal = document.createElement("div");
        topicModal.id = "topic-modal";
        topicModal.className = "fixed inset-0 z-[130] hidden bg-[var(--bg-primary)]/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in";
        topicModal.innerHTML = `
            <div class="absolute top-6 right-6 flex gap-3">
                <button id="bookmark-filter-btn" onclick="import('./js/modules/topics.js?v=14').then(m => m.toggleViewBookmarks())"
                    class="text-gray-400 hover:text-[#faa61a] w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90" title="Zobrazit záložky">
                    <i class="fas fa-bookmark text-2xl"></i>
                </button>
                <button onclick="import('./js/modules/topics.js?v=14').then(m => m.closeTopicModal())"
                    class="text-gray-400 hover:text-white w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <div class="max-w-2xl w-full px-6 text-center animate-scale-in">
                <div id="topic-badge" class="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-[#5865F2]/20 text-[#5865F2]">Kategorie</div>
                <h2 id="topic-title-display" class="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">Téma otázky</h2>
                <div class="relative min-h-[150px] flex items-center justify-center mb-8">
                    <p id="topic-question-display" class="text-lg md:text-2xl text-gray-200 leading-relaxed italic">"Načítám otázku..."</p>
                </div>
                <div class="flex flex-col items-center gap-6">
                    <div class="flex items-center gap-4">
                        <button onclick="import('./js/modules/topics.js?v=14').then(m => m.prevQuestion())" class="w-12 h-12 rounded-full bg-[#2f3136] hover:bg-[#4f545c] text-white flex items-center justify-center transition-all shadow-lg active:scale-90"><i class="fas fa-chevron-left"></i></button>
                        <button id="done-btn" onclick="import('./js/modules/topics.js?v=14').then(m => m.markQuestionDone())" class="px-8 py-4 rounded-full bg-[#3ba55c] hover:bg-[#2d7d44] text-white font-bold text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"><i class="fas fa-check-circle"></i> Hotovo!</button>
                        <button onclick="import('./js/modules/topics.js?v=14').then(m => m.nextQuestion())" class="w-12 h-12 rounded-full bg-[#2f3136] hover:bg-[#4f545c] text-white flex items-center justify-center transition-all shadow-lg active:scale-90"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="flex items-center gap-6">
                        <button id="topic-bookmark-btn" onclick="import('./js/modules/topics.js?v=14').then(m => m.toggleQuestionBookmark())" class="text-gray-500 hover:text-[#faa61a] transition-colors flex items-center gap-2 text-sm font-bold"><i class="far fa-bookmark"></i> Uložit si na potom</button>
                        <div id="topic-progress-text" class="text-gray-500 text-xs font-mono tracking-widest uppercase">Otázka 0 z 0</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(topicModal);
    }

    if (!document.getElementById("reset-confirm-modal")) {
        const resetModal = document.createElement("div");
        resetModal.id = "reset-confirm-modal";
        resetModal.className = "fixed inset-0 z-[150] hidden modal-backdrop items-center justify-center p-4";
        resetModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-sm border border-[#faa61a]/50 p-8 text-center animate-fade-in">
                <div class="w-16 h-16 bg-[#faa61a]/20 text-[#faa61a] rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-inner"><i class="fas fa-undo-alt"></i></div>
                <h3 class="text-xl font-bold text-white mb-2">Resetovat pokrok?</h3>
                <p class="text-gray-400 mb-8 text-sm leading-relaxed">Opravdu chceš smazat všechnu historii v tomhle tématu a začít od první otázky?</p>
                <div class="flex gap-3">
                    <button onclick="window.closeModal ? window.closeModal('reset-confirm-modal') : this.closest('#reset-confirm-modal').style.display='none'" class="flex-1 text-gray-400 hover:text-white font-bold py-2 transition text-xs uppercase tracking-widest">Zrušit</button>
                    <button onclick="import('./js/modules/topics.js?v=14').then(m => m.confirmResetTopic())" class="flex-[2] bg-[#faa61a] hover:bg-[#c88515] text-white py-3 rounded-xl font-bold shadow-lg transition active:scale-95">Ano, resetovat</button>
                </div>
            </div>
        `;
        document.body.appendChild(resetModal);
    }
}

export function renderTopics() {
    ensureModals();
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
                  <div class="flex gap-2">
                      <button onclick="import('./js/modules/topics.js?v=14').then(m => m.showAddTopicQuestionModal())" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-4 py-2 rounded-lg font-bold transition shadow-lg flex items-center gap-2">
                          <i class="fas fa-plus"></i>
                          <span class="hidden sm:inline">Nová otázka</span>
                      </button>
                      <button onclick="import('./js/modules/topics.js?v=14').then(m => m.openRandomTopic())" class="bg-[#2f3136] hover:bg-[#eb459e] text-white px-4 py-2 rounded-lg font-bold transition border border-gray-600 hover:border-[#eb459e] shadow-lg flex items-center gap-2 group">
                          <i class="fas fa-random group-hover:rotate-180 transition-transform duration-500"></i>
                          <span class="hidden sm:inline">Náhodná</span>
                      </button>
                  </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              `;

    // 1. SPECIÁLNÍ KARTA: ULOŽENÉ
    const resetBookmarksBtn = totalBookmarks > 0
        ? `<button onclick="event.stopPropagation(); import('./js/modules/topics.js?v=14').then(m => m.requestResetBookmarks())" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Vymazat všechny oblíbené">
            <i class="fas fa-undo-alt"></i>
          </button>`
        : "";

    html += `
                  <div onclick="import('./js/modules/topics.js?v=14').then(m => m.openTopic('bookmarks'))" class="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-xl p-6 cursor-pointer border border-[#faa61a]/50 hover:border-[#faa61a] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
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
            ? `<button onclick="event.stopPropagation(); import('./js/modules/topics.js?v=14').then(m => m.requestResetTopic('${topic.id}'))" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Resetovat postup">
             <i class="fas fa-undo-alt"></i>
           </button>`
            : "";

        html += `
                  <div onclick="import('./js/modules/topics.js?v=14').then(m => m.openTopic('${topic.id}'))" class="bg-[#2f3136] rounded-xl p-6 cursor-pointer border border-[#202225] hover:border-[${topic.color}] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
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
    ensureModals();
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
            try {
                await safeUpsert('topic_progress', {
                    user_id: state.currentUser.id,
                    topic_id: tid,
                    bookmarks: []
                });
            } catch (e) { console.error("Error saving topic progress:", e); }
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
    const textEl = document.getElementById("topic-question-display");
    const controls = document.getElementById("topic-controls");
    const bookmarkBtn = document.getElementById("topic-bookmark-btn");

    if (!textEl) return; // Guard: modal may not be mounted

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

    if (!firstLoad && card) {
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
    const textEl = document.getElementById("topic-question-display");
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

// --- ADD NEW TOPIC QUESTION ---

export function showAddTopicQuestionModal() {
    const modal = document.createElement('div');
    modal.id = 'topic-add-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-[#36393f] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center bg-[#2f3136]">
                <h3 class="text-xl font-black text-white tracking-widest uppercase">Nová otázka do knihovny 🗨️</h3>
                <button onclick="this.closest('#topic-add-modal').remove()" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-6">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-3 text-center">Vyber kategorii</label>
                    <div class="grid grid-cols-2 gap-3" id="q-topic-selector">
                        ${state.conversationTopics.map(t => `
                            <button onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); this.dataset.selected = 'true'; window.selectedTopicId = '${t.id}'" 
                                    class="p-4 rounded-xl border-2 border-transparent bg-[#2f3136] text-white transition hover:border-gray-500 flex flex-col items-center gap-2 group">
                                <span class="text-2xl transition group-hover:scale-110">${t.icon}</span>
                                <span class="text-xs font-bold uppercase tracking-tighter">${t.title}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-3">Znění otázky</label>
                    <textarea id="nt-text" placeholder="Co bys dělala, kdybychom vyhráli v loterii?" class="w-full bg-[#202225] text-white p-4 rounded-xl border-2 border-transparent focus:border-[#eb459e] outline-none transition min-h-[100px] shadow-inner text-lg leading-relaxed"></textarea>
                </div>
            </div>
            
            <div class="p-6 bg-[#2f3136] border-t border-gray-700">
                <button onclick="import('./js/modules/topics.js?v=14').then(m => m.saveNewTopicQuestion())" class="w-full bg-[#eb459e] hover:bg-[#d63b8c] text-white py-4 rounded-xl font-black text-lg transition shadow-xl transform active:scale-95">
                    PŘIDAT OTÁZKU 💖
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export async function saveNewTopicQuestion() {
    const text = document.getElementById('nt-text').value.trim();
    const topicId = window.selectedTopicId;
    
    if (!text || !topicId) {
        alert("Vyber kategorii a napiš text!");
        return;
    }
    
    triggerHaptic('success');
    
    try {
        const topic = state.conversationTopics.find(t => t.id === topicId);
        const updatedQuestions = [...topic.questions, text];
        
        const { error } = await supabase.from('conversation_topics').update({
            questions: updatedQuestions
        }).eq('id', topicId);
        
        if (error) throw error;
        
        // Update local state
        topic.questions = updatedQuestions;
        
        // Notification
        if (window.showNotification) window.showNotification(`Otázka přidána do kategorie ${topic.title}! ✨`, "success");
        if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
        
        // Close modal
        document.getElementById('topic-add-modal')?.remove();
        
        // Refresh UI
        renderTopics();
        
    } catch (err) {
        console.error("Save Topic Question Error:", err);
        alert("Chyba při ukládání: " + err.message);
    }
}
