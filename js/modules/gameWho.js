import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { safeInsert, safeUpsert } from '../core/offline.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { getAssetUrl } from '../core/assets.js';

let subscription = null;
let sessionQuestionIndex = -1; // -1 means find first available
let eventListenerAdded = false;

function findSmartQuestionIndex() {
    if (state.gameQuestions.length === 0) return 0;
    
    // Find first question where NOT both users have voted
    for (let i = 0; i < state.gameQuestions.length; i++) {
        const q = state.gameQuestions[i];
        const myVote = state.gameVotes.find(v => v.question_id === q.id && v.user_id === state.currentUser?.id);
        const partnerVote = state.gameVotes.find(v => v.question_id === q.id && v.user_id !== state.currentUser?.id);
        
        if (!myVote || !partnerVote) return i;
    }
    
    return 0; // Fallback to first if all answered
}

export function renderGameWho() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    if (state.gameQuestions.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
                <p class="text-xl font-bold">Žádné otázky v databázi</p>
                <p class="mt-2">Spusťte SQL skript pro přidání otázek.</p>
            </div>
        `;
        return;
    }

    if (sessionQuestionIndex === -1) {
        sessionQuestionIndex = findSmartQuestionIndex();
    }
    
    const currentQ = state.gameQuestions[sessionQuestionIndex % state.gameQuestions.length];

    if (!eventListenerAdded) {
        window.addEventListener('game-vote-updated', (e) => {
            if (state.currentChannel !== 'game-who') return;
            
            const payload = e.detail.payload;
            const activeQ = state.gameQuestions[sessionQuestionIndex % state.gameQuestions.length];
            
            if (activeQ && payload.question_id === activeQ.id) {
                // Check if already in state
                const existing = state.gameVotes.find(v => (v.id && v.id === payload.id) || (v.user_id === payload.user_id && v.question_id === payload.question_id));
                if (!existing) {
                    state.gameVotes.push(payload);
                    renderGameWho();
                } else if (e.detail.source === 'database' && !existing.id) {
                    // Update the temporary broadcast vote with the real DB record
                    Object.assign(existing, payload);
                    renderGameWho();
                }
            }
        });
        eventListenerAdded = true;
    }

    renderContent(currentQ);
}

function renderContent(question) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const josefId = state.user_ids?.jose || '00000000-0000-0000-0000-000000000001';
    const klarkaId = state.user_ids?.klarka || '00000000-0000-0000-0000-000000000002';

    // Correctly identify current user identity
    const isJosef = state.currentUser?.id === josefId;
    const myId = isJosef ? josefId : klarkaId;
    const partnerId = isJosef ? klarkaId : josefId;

    // Get current votes for this question
    const myVote = state.gameVotes.find(v => v.question_id === question.id && v.user_id === state.currentUser?.id);
    const partnerVote = state.gameVotes.find(v => v.question_id === question.id && v.user_id !== state.currentUser?.id);

    const bothVoted = myVote && partnerVote;
    const isMatched = bothVoted && myVote.voted_for_user_id === partnerVote.voted_for_user_id;

    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center p-6 bg-[#36393f] relative overflow-hidden animate-fade-in text-center">
            <!-- Background Decoration -->
            <div class="absolute -top-20 -left-20 w-64 h-64 bg-[#faa61a]/10 rounded-full blur-[80px]"></div>
            <div class="absolute -bottom-20 -right-20 w-80 h-80 bg-[#faa61a]/5 rounded-full blur-[100px]"></div>

            <div class="z-10 max-w-2xl w-full">
                <div class="mb-8 relative group">
                    <span class="px-3 py-1 bg-[#faa61a]/20 text-[#faa61a] rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">Kdo spíše?</span>
                    ${state.currentUser && (state.currentUser.email.toLowerCase().includes('josef') || state.currentUser.email.toLowerCase().includes('jozk')) ? `
                        <button onclick="window.loadModule('gameWho').then(m => m.showAddGameQuestionModal())" class="absolute -top-1 right-0 md:-right-8 opacity-0 group-hover:opacity-100 bg-[#2f3136] hover:bg-[#faa61a] text-white hover:text-black p-2 rounded-lg transition shadow-lg" title="Přidat otázku">
                            <i class="fas fa-plus"></i>
                        </button>
                    ` : ''}
                    <h2 class="text-3xl md:text-5xl font-black text-white leading-tight mb-4">${question.text}</h2>
                    <p class="text-gray-400">Oba vyberte jednu osobu. Schodnete se?</p>
                </div>

                <div class="grid grid-cols-2 gap-6 md:gap-12 mt-12 px-4">
                    <!-- Josef Button -->
                    <button onclick="window.submitGameVote('${question.id}', '${josefId}')" 
                        class="vote-btn flex flex-col items-center group transition-all"
                        ${myVote ? 'disabled' : ''}>
                        <div class="relative mb-4">
                            <img src="${getAssetUrl('jozka_profile')}" class="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover shadow-lg border-4 ${myVote?.voted_for_user_id === josefId ? 'border-[#faa61a] ring-4 ring-[#faa61a]/30' : 'border-[#202225] group-hover:border-[#faa61a]/50'} transition-all ${myVote && myVote.voted_for_user_id !== josefId ? 'grayscale' : ''}">
                            ${myVote?.voted_for_user_id === josefId ? '<div class="absolute -top-3 -right-3 w-10 h-10 bg-[#faa61a] rounded-full flex items-center justify-center text-white shadow-lg animate-bounce-short"><i class="fas fa-check"></i></div>' : ''}
                        </div>
                        <span class="text-xl font-bold ${myVote?.voted_for_user_id === josefId ? 'text-[#faa61a]' : 'text-gray-300'}">Jožka</span>
                    </button>

                    <!-- Klárka Button -->
                    <button onclick="window.submitGameVote('${question.id}', '${klarkaId}')" 
                        class="vote-btn flex flex-col items-center group transition-all"
                        ${myVote ? 'disabled' : ''}>
                        <div class="relative mb-4">
                            <img src="${getAssetUrl('klarka_profile')}" class="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover shadow-lg border-4 ${myVote?.voted_for_user_id === klarkaId ? 'border-[#faa61a] ring-4 ring-[#faa61a]/30' : 'border-[#202225] group-hover:border-[#faa61a]/50'} transition-all ${myVote && myVote.voted_for_user_id !== klarkaId ? 'grayscale' : ''}">
                            ${myVote?.voted_for_user_id === klarkaId ? '<div class="absolute -top-3 -right-3 w-10 h-10 bg-[#faa61a] rounded-full flex items-center justify-center text-white shadow-lg animate-bounce-short"><i class="fas fa-check"></i></div>' : ''}
                        </div>
                        <span class="text-xl font-bold ${myVote?.voted_for_user_id === klarkaId ? 'text-[#faa61a]' : 'text-gray-300'}">Klárka</span>
                    </button>
                </div>

                <!-- Status / Results -->
                <div class="mt-16 min-h-[120px] flex flex-col items-center justify-center gap-6">
                    ${!myVote ? 
                        '<p class="text-gray-500 animate-pulse italic">Čekám na tvůj hlas...</p>' : 
                        (!partnerVote ? 
                            '<div class="bg-[#2f3136] px-6 py-4 rounded-xl flex items-center gap-4 text-white font-medium border border-[#202225] shadow-lg"><i class="fas fa-spinner fa-spin text-[#faa61a]"></i> Čekám na partnerovo hlasování...</div>' :
                            `<div>
                                ${isMatched ? 
                                    '<div class="animate-bounce-short mb-6"><h3 class="text-3xl font-black text-[#faa61a] mb-2 uppercase tracking-tighter shadow-sm">SHODA! ✨</h3><p class="text-white opacity-90">Myslíte si to oba stejně!</p></div>' :
                                    '<div class="grayscale opacity-80 mb-6"> <h3 class="text-xl font-bold text-gray-400 mb-2">Neshodli jste se...</h3><p class="text-gray-500 text-sm">Každý máte jiný názor, a to je v pořádku!</p></div>'
                                }
                                <button onclick="window.nextGameQuestion()" 
                                    class="px-8 py-3 bg-[#faa61a] hover:bg-[#e09216] text-black font-black rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2 mx-auto">
                                    Další otázka <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>`
                        )
                    }
                </div>
            </div>
        </div>
    `;

    // Global handler
    window.submitGameVote = async (questionId, targetUserId) => {
        if (!state.currentUser) return;
        
        // Disable buttons immediately to prevent double-click errors
        document.querySelectorAll('.vote-btn').forEach(b => b.disabled = true);
        
        try {
            const { data, error } = await supabase
                .from('game_votes')
                .insert([{
                    question_id: questionId,
                    user_id: state.currentUser.id,
                    voted_for_user_id: targetUserId
                }])
                .select();

            if (error) {
                // If the error is a duplicate key, it means we already voted (maybe from another tab or fast click)
                if (error.code === '23505') {
                    console.log("Already voted for this question.");
                    return; 
                }
                throw error;
            }

            state.gameVotes.push(data[0]);
            renderContent(question);
            triggerHaptic('medium');
            
            // 2. Broadcast immediately for partner's UI
            import('../core/sync.js').then(m => m.broadcastGameVote(data[0]));
            
            // Check if match was MADE by this vote
            const isJosef = state.currentUser.email.toLowerCase().includes('josef') || state.currentUser.email.toLowerCase().includes('jozk');
            const partnerId = !isJosef; // This is actually logic to check the OTHER vote in state
            
            const pVote = state.gameVotes.find(v => v.question_id === questionId && v.user_id !== state.currentUser.id);
            
            if (pVote && pVote.voted_for_user_id === targetUserId) {
                triggerConfetti();
                showNotification("Skvěle! Máte shodu! 🥂", "success");
            }

        } catch (err) {
            console.error("Vote error:", err);
            showNotification("Hlasování se nezdařilo.", "error");
        }
    };

    // Handler for next question
    window.nextGameQuestion = () => {
        // Find NEXT unanswered question
        let nextIdx = (sessionQuestionIndex + 1) % state.gameQuestions.length;
        let found = false;
        
        // Loop through to find next unanswered
        for (let i = 0; i < state.gameQuestions.length; i++) {
            const checkIdx = (nextIdx + i) % state.gameQuestions.length;
            const q = state.gameQuestions[checkIdx];
            const myVote = state.gameVotes.find(v => v.question_id === q.id && v.user_id === state.currentUser?.id);
            const partnerVote = state.gameVotes.find(v => v.question_id === q.id && v.user_id !== state.currentUser?.id);
            
            if (!myVote || !partnerVote) {
                sessionQuestionIndex = checkIdx;
                found = true;
                break;
            }
        }
        
        if (!found) {
            // If all are answered, just move to next linearly
            sessionQuestionIndex = nextIdx;
        }
        
        triggerHaptic('light');
        renderGameWho();
    };
}

export function cleanupRealtime() {
    // Relying on core sync system
}

export function showAddGameQuestionModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in text-left';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="bg-[#2f3136] border border-[#faa61a]/20 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">
            <div class="p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-plus-circle text-[#faa61a]"></i> Přidat "Kdo spíše?"
                </h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kdo spíše...</label>
                        <textarea id="game-q-text" rows="3" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 outline-none focus:border-[#faa61a] transition resize-none" placeholder="Např. ...vymyslí větší hovadinu?"></textarea>
                    </div>
                    <button onclick="window.loadModule('gameWho').then(m => m.saveNewGameQuestion())" class="w-full bg-[#faa61a] hover:bg-[#e09216] text-black font-black py-3 rounded-xl shadow-lg transition transform hover:scale-[1.02] active:scale-95">
                        Uložit otázku
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('game-q-text')?.focus();
}

export async function saveNewGameQuestion() {
    const text = document.getElementById('game-q-text')?.value.trim();
    if (!text) {
        if (window.showNotification) window.showNotification("Zadej text otázky!", "error");
        return;
    }

    try {
        const fullText = text.startsWith('Kdo spíše') ? text : `Kdo spíše ${text.startsWith('...') ? text.substring(3).trim() : text}`;
        const { data, error } = await safeInsert('game_questions', [{
            text: fullText,
            user_id: state.currentUser.id
        }]);
        if (error) throw error;

        if (data && data[0]) {
            state.gameQuestions.push(data[0]);
            if (window.showNotification) window.showNotification("Otázka přidána! ✨", "success");
            document.querySelector('.animate-fade-in')?.remove();
            
            // Jump to the new question to show it
            sessionQuestionIndex = state.gameQuestions.length - 1;
            renderGameWho();
        }
    } catch (err) {
        console.error("Failed to save game question:", err);
        if (window.showNotification) window.showNotification("Chyba při ukládání.", "error");
    }
}
