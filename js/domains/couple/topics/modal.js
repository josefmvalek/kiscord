/**
 * Conversation Topics Modals DOM Initializer
 */

export function ensureModals() {
    if (!document.getElementById("topic-modal")) {
        const topicModal = document.createElement("div");
        topicModal.id = "topic-modal";
        topicModal.className = "fixed inset-0 z-[130] hidden bg-[#18191c]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in transition-all duration-500 p-4 md:p-8";
        topicModal.innerHTML = `
            <!-- Top Controls -->
            <div class="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
                <button id="bookmark-filter-btn" onclick="window.Topics.toggleViewBookmarks()"
                    class="text-gray-400 hover:text-[#faa61a] w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-90 shadow-xl" title="Zobrazit záložky">
                    <i class="fas fa-bookmark text-xl"></i>
                </button>
                <button onclick="window.Topics.closeTopicModal()"
                    class="text-gray-400 hover:text-white w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-90 shadow-xl">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <!-- Main Content Container -->
            <div class="max-w-2xl w-full flex flex-col items-center gap-8 md:gap-10 animate-scale-in scale-95 md:scale-100">
                
                <!-- Category Label -->
                <div class="flex flex-col items-center text-center">
                    <div id="topic-badge" class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 mb-2">Kategorie</div>
                    <h3 id="topic-title-display" class="text-white/40 font-bold text-sm tracking-widest uppercase">Téma otázky</h3>
                </div>

                <!-- Premium Card -->
                <div id="question-card" class="w-full premium-fact-card rounded-[2.5rem] p-8 md:p-14 shadow-2xl border border-white/10 flex flex-col items-center justify-center text-center relative group overflow-hidden transition-all duration-500 min-h-[350px] md:min-h-[400px]">
                    <div id="topic-card-bar" class="absolute top-0 left-0 w-full h-1.5 opacity-80"></div>
                    
                    <i class="fas fa-quote-left absolute top-8 left-8 text-5xl md:text-7xl opacity-5 text-white group-hover:scale-110 group-hover:opacity-10 transition-all duration-700"></i>
                    <i class="fas fa-quote-right absolute bottom-8 right-8 text-5xl md:text-7xl opacity-5 text-white group-hover:scale-110 group-hover:opacity-10 transition-all duration-700"></i>

                    <!-- Floating Icon -->
                    <div id="topic-modal-icon-container" class="mb-8 w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white/5 flex items-center justify-center text-5xl md:text-7xl shadow-2xl border border-white/10 animate-float shadow-[0_15px_35px_rgba(0,0,0,0.3)]">
                        <span id="topic-modal-icon">✨</span>
                    </div>

                    <!-- Question Text -->
                    <div class="relative z-10 w-full">
                        <p id="topic-question-display" class="text-xl md:text-3xl lg:text-4xl font-black text-white leading-tight md:leading-tight tracking-tight px-2 drop-shadow-lg">
                            "Načítám otázku..."
                        </p>
                    </div>
                </div>

                <!-- Interaction Bar -->
                <div id="topic-controls" class="flex flex-col items-center gap-8 w-full max-w-md">
                    <div class="flex items-center justify-between w-full">
                        <button id="btn-prev-question" onclick="window.Topics.prevQuestion()" class="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-all shadow-xl active:scale-90 group">
                            <i class="fas fa-chevron-left group-hover:-translate-x-1 transition-transform"></i>
                        </button>

                        <button id="done-btn" onclick="window.Topics.markQuestionDone()" class="px-10 h-14 rounded-2xl bg-[#3ba55c] hover:bg-[#2d7d44] text-white font-black text-sm tracking-widest shadow-[0_10px_30px_rgba(59,165,92,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 border border-white/10">
                            <i class="fas fa-check-circle text-lg"></i> HOTOVO!
                        </button>

                        <button id="btn-next-question" onclick="window.Topics.nextQuestion()" class="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-all shadow-xl active:scale-90 group">
                            <i class="fas fa-chevron-right group-hover:translate-x-1 transition-transform"></i>
                        </button>
                    </div>

                    <div class="flex items-center justify-between w-full px-4 border-t border-white/5 pt-6">
                        <button id="topic-bookmark-btn" onclick="window.Topics.toggleQuestionBookmark()" class="text-gray-500 hover:text-[#faa61a] transition-all flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest group">
                            <i class="far fa-bookmark transition-transform group-hover:scale-125"></i> Uložit si na potom
                        </button>
                        <div id="topic-progress-text" class="text-gray-500 text-[10px] font-black tracking-[0.2em] uppercase opacity-70">Otázka 0 z 0</div>
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
                    <button onclick="window.Topics.confirmResetTopic()" class="flex-[2] bg-[#faa61a] hover:bg-[#c88515] text-white py-3 rounded-xl font-bold shadow-lg transition active:scale-95">Ano, resetovat</button>
                </div>
            </div>
        `;
        document.body.appendChild(resetModal);
    }
}
