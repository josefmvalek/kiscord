import { supabase } from '../core/supabase.js';
import { state, saveStateToCache } from '../core/state.js';
import { safeInsert } from '../core/offline.js';
import { triggerHaptic } from '../core/utils.js';

let subscription = null;

export function renderDailyQuestions() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    if (!state.dailyQuestion) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-8 text-center bg-[#36393f]">
                <div class="text-6xl mb-6">🏜️</div>
                <h2 class="text-2xl font-bold text-white mb-2">Zatím žádné otázky</h2>
                <p class="text-gray-400 max-w-md">Vypadá to, že v databázi ještě nejsou žádné otázky. Přidej je v SQL editoru!</p>
            </div>
        `;
        return;
    }

    const myAnswer = state.dailyAnswers.find(a => a.user_id === state.currentUser.id);
    const partnerAnswer = state.dailyAnswers.find(a => a.user_id !== state.currentUser.id);
    const isRevealed = !!(myAnswer && partnerAnswer);

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in">
            <!-- Header -->
            <div class="bg-[#2f3136] shadow-sm z-10 flex-shrink-0 border-b border-[#202225] p-6 lg:p-10 flex flex-col items-center text-center relative">
                <div class="absolute top-4 right-4 group">
                    <button onclick="import('./js/modules/dailyQuestions.js').then(m => m.showAddQuestionModal())" class="bg-[#5865F2] hover:bg-[#4752c4] text-white p-3 rounded-full shadow-lg transition-all active:scale-95" title="Navrhnout novou otázku">
                        <i class="fas fa-plus"></i>
                    </button>
                    <span class="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none uppercase font-bold tracking-widest border border-gray-700">Navrhnout otázku</span>
                </div>

                <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#faa61a] to-[#eb459e] shadow-lg mb-6 flex items-center justify-center transform hover:rotate-6 transition-transform">
                    <i class="fas fa-comment-alt text-white text-3xl"></i>
                </div>
                <h1 class="text-3xl font-black text-white tracking-tight uppercase">Dnešní Otázka</h1>
                <p class="text-gray-400 mt-2 text-sm font-medium max-w-sm">Upřímnost je základ. Odpovědi se odemknou, až odpovíte oba! ❤️</p>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                <div class="max-w-4xl mx-auto space-y-8 pb-20">
                    
                    <!-- Question Card -->
                    <div class="bg-[#2f3136] rounded-3xl p-8 border-2 border-[#faa61a]/30 shadow-2xl relative overflow-hidden group">
                        <div class="absolute -right-4 -bottom-4 text-9xl opacity-5 group-hover:opacity-10 transition-opacity rotate-12 select-none pointer-events-none">🥰</div>
                        <h2 class="text-2xl md:text-3xl font-bold text-white leading-tight relative z-10">
                            "${state.dailyQuestion.text}"
                        </h2>
                    </div>

                    <!-- Answers Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <!-- My Answer Slot -->
                        <div class="space-y-3">
                            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Tvoje odpověď</h3>
                            ${renderMyAnswerSlot(myAnswer)}
                        </div>

                        <!-- Partner Answer Slot -->
                        <div class="space-y-3">
                            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Partnerova odpověď</h3>
                            ${renderPartnerAnswerSlot(partnerAnswer, !!myAnswer)}
                        </div>

                    </div>
                    
                    ${isRevealed ? `
                        <div class="animate-bounce-slow text-center py-10">
                            <div class="inline-flex items-center gap-2 bg-[#faa61a]/20 text-[#faa61a] px-4 py-2 rounded-full border border-[#faa61a]/30 font-bold text-sm">
                                <i class="fas fa-lock-open"></i> Odpovědi odemčeny!
                            </div>
                        </div>
                    ` : ''}

                </div>
            </div>
        </div>
    `;

    setupRealtime();
}

function renderMyAnswerSlot(myAnswer) {
    if (myAnswer) {
        return `
            <div class="bg-[#202225] p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[150px] flex flex-col justify-between">
                <p class="text-gray-200 leading-relaxed font-medium">${myAnswer.answer_text}</p>
                <div class="text-[10px] text-gray-500 mt-4 flex items-center gap-1">
                    <i class="fas fa-check-circle text-[#3ba55c]"></i> Odesláno ${new Date(myAnswer.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        `;
    } else {
        return `
            <div class="bg-[#2f3136] p-6 rounded-2xl border-2 border-dashed border-gray-700 hover:border-[#5865F2] transition-colors" id="answer-form-container">
                <textarea id="daily-answer-input" placeholder="Tady napiš svoji upřímnou odpověď..." 
                          class="w-full bg-transparent text-white border-0 focus:ring-0 outline-none resize-none min-h-[100px] placeholder-gray-600 font-medium"></textarea>
                <button onclick="import('./js/modules/dailyQuestions.js').then(m => m.submitAnswer())" 
                        id="btn-submit-answer"
                        class="mt-4 w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-xl font-bold transition transform hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center gap-2">
                    <i class="fas fa-paper-plane text-xs"></i> Odeslat moji odpověď
                </button>
            </div>
        `;
    }
}

function renderPartnerAnswerSlot(partnerAnswer, iHaveAnswered) {
    if (partnerAnswer && iHaveAnswered) {
        return `
            <div class="bg-[#202225] p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[150px] animate-fade-in">
                <p class="text-gray-200 leading-relaxed font-medium">${partnerAnswer.answer_text}</p>
                <div class="text-[10px] text-gray-500 mt-4">Od partnera</div>
            </div>
        `;
    } else if (partnerAnswer && !iHaveAnswered) {
        return `
            <div class="bg-[#2f3136] p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[150px] flex flex-col items-center justify-center text-center group">
                <div class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-4 text-[#faa61a] animate-pulse">
                    <i class="fas fa-lock text-xl"></i>
                </div>
                <p class="text-white font-bold text-sm">Partner už odpověděl!</p>
                <p class="text-gray-500 text-xs mt-1">Odpověď uvidíš, až napíšeš tu svoji.</p>
            </div>
        `;
    } else {
        return `
            <div class="bg-[#202225]/50 p-6 rounded-2xl border border-gray-800 shadow-inner min-h-[150px] flex flex-col items-center justify-center text-center opacity-40">
                <div class="w-12 h-12 rounded-full bg-gray-900/50 flex items-center justify-center mb-4 text-gray-600">
                    <i class="fas fa-clock text-xl"></i>
                </div>
                <p class="text-gray-500 font-bold text-sm uppercase tracking-tighter">Čekáme na partnera...</p>
            </div>
        `;
    }
}

export async function submitAnswer() {
    const input = document.getElementById('daily-answer-input');
    const answer = input?.value.trim();
    if (!answer) return;

    const btn = document.getElementById('btn-submit-answer');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Odesílám...';
    }

    try {
        const { error } = await safeInsert('daily_answers', [{
            question_id: state.dailyQuestion.id,
            user_id: state.currentUser.id,
            answer_text: answer
        }]);

        if (error) throw error;

        triggerHaptic('success');
        
        // Refresh local state and re-render
        const { data } = await supabase.from('daily_answers').select('*').eq('question_id', state.dailyQuestion.id);
        if (data) state.dailyAnswers = data;
        
        const partnerAnswer = state.dailyAnswers.find(a => a.user_id !== state.currentUser.id);
        if (partnerAnswer && typeof window.triggerConfetti === 'function') {
            window.triggerConfetti();
        }

        saveStateToCache();
        renderDailyQuestions();

    } catch (err) {
        console.error("Chyba při odesílání odpovědi:", err);
        if (window.showNotification) window.showNotification("Nepodařilo se odeslat odpověď.", "error");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane text-xs"></i> Zkusit znovu';
        }
    }
}

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('daily-answers-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'daily_answers', filter: `question_id=eq.${state.dailyQuestion?.id}` },
            async (payload) => {
                console.log('Nová odpověď v reálném čase!', payload);
                // Refresh answers
                const { data } = await supabase.from('daily_answers').select('*').eq('question_id', state.dailyQuestion.id);
                if (data) {
                    state.dailyAnswers = data;
                    
                    // Pokud jsme oba odpověděli, ukážeme konfety
                    const myAnswer = state.dailyAnswers.find(a => a.user_id === state.currentUser.id);
                    const partnerAnswer = state.dailyAnswers.find(a => a.user_id !== state.currentUser.id);
                    if (myAnswer && partnerAnswer && typeof window.triggerConfetti === 'function') {
                        window.triggerConfetti();
                    }
                    
                    renderDailyQuestions();
                }
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}

// --- ADD NEW QUESTION ---

export function showAddQuestionModal() {
    const modal = document.createElement('div');
    modal.id = 'question-suggest-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-[#36393f] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center bg-[#2f3136]">
                <h3 class="text-xl font-black text-white tracking-widest uppercase">Navrhnout otázku 🤔</h3>
                <button onclick="this.closest('#question-suggest-modal').remove()" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-6">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-3">Text otázky</label>
                    <textarea id="nq-text" placeholder="Např. Jaká je tvoje nejoblíbenější vzpomínka na naše začátky?" class="w-full bg-[#202225] text-white p-4 rounded-xl border-2 border-transparent focus:border-[#faa61a] outline-none transition min-h-[120px] shadow-inner text-lg leading-relaxed"></textarea>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-3">Kategorie</label>
                    <select id="nq-cat" class="w-full bg-[#202225] text-white p-4 rounded-xl border-2 border-transparent focus:border-[#faa61a] outline-none transition font-bold">
                        <option value="love" selected>Láska & Vztahy ❤️</option>
                        <option value="future">Budoucnost 🔮</option>
                        <option value="deep">Hluboké zamyšlení 🧠</option>
                        <option value="fun">Zábava & Relax 😄</option>
                    </select>
                </div>
            </div>
            
            <div class="p-6 bg-[#2f3136] border-t border-gray-700">
                <button onclick="import('./js/modules/dailyQuestions.js').then(m => m.saveNewQuestion())" class="w-full bg-gradient-to-r from-[#faa61a] to-[#eb459e] text-white py-4 rounded-xl font-black text-lg transition shadow-[0_0_20px_rgba(250,166,26,0.2)] transform active:scale-95">
                    PŘIDAT DO OSUDÍ 🗳️
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export async function saveNewQuestion() {
    const text = document.getElementById('nq-text').value.trim();
    const category = document.getElementById('nq-cat').value;
    
    if (!text) return;
    
    triggerHaptic('success');
    
    try {
        const { error } = await safeInsert('daily_questions', [{
            text, category,
            user_id: state.currentUser.id
        }]);
        
        if (error) throw error;
        
        // Notification
        if (window.showNotification) window.showNotification("Otázka byla přidána do poolu! 🧠", "success");
        if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
        
        // Close modal
        document.getElementById('question-suggest-modal')?.remove();
        
    } catch (err) {
        console.error("Save Question Error:", err);
        if (window.showNotification) window.showNotification("Chyba při ukládání: " + err.message, "error");
    }
}
