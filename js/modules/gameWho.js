import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';

let subscription = null;

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

    // Pick a question (could be daily or random)
    // For now, let's use a "Daily Game Question" based on date
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const qIndex = dateSeed % state.gameQuestions.length;
    const currentQ = state.gameQuestions[qIndex];

    setupRealtime(currentQ.id);

    renderContent(currentQ);
}

function renderContent(question) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const josefId = '00000000-0000-0000-0000-000000000001';
    const klarkaId = '00000000-0000-0000-0000-000000000002';

    // Correctly identify current user identity
    const isJosef = state.currentUser?.email.toLowerCase().includes('josef') || state.currentUser?.email.toLowerCase().includes('jozk');
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
                <div class="mb-8">
                    <span class="px-3 py-1 bg-[#faa61a]/20 text-[#faa61a] rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">Kdo spíše?</span>
                    <h2 class="text-3xl md:text-5xl font-black text-white leading-tight mb-4">${question.text}</h2>
                    <p class="text-gray-400">Oba vyberte jednu osobu. Schodnete se?</p>
                </div>

                <div class="grid grid-cols-2 gap-6 md:gap-12 mt-12 px-4">
                    <!-- Josef Button -->
                    <button onclick="window.submitGameVote('${question.id}', '${josefId}')" 
                        class="vote-btn flex flex-col items-center group transition-all"
                        ${myVote ? 'disabled' : ''}>
                        <div class="relative mb-4">
                            <img src="img/app/czippel2_vanoce.png" class="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover shadow-lg border-4 ${myVote?.voted_for_user_id === josefId ? 'border-[#faa61a] ring-4 ring-[#faa61a]/30' : 'border-[#202225] group-hover:border-[#faa61a]/50'} transition-all ${myVote && myVote.voted_for_user_id !== josefId ? 'grayscale' : ''}">
                            ${myVote?.voted_for_user_id === josefId ? '<div class="absolute -top-3 -right-3 w-10 h-10 bg-[#faa61a] rounded-full flex items-center justify-center text-white shadow-lg animate-bounce-short"><i class="fas fa-check"></i></div>' : ''}
                        </div>
                        <span class="text-xl font-bold ${myVote?.voted_for_user_id === josefId ? 'text-[#faa61a]' : 'text-gray-300'}">Jožka</span>
                    </button>

                    <!-- Klárka Button -->
                    <button onclick="window.submitGameVote('${question.id}', '${klarkaId}')" 
                        class="vote-btn flex flex-col items-center group transition-all"
                        ${myVote ? 'disabled' : ''}>
                        <div class="relative mb-4">
                            <img src="img/app/klarka_profilovka.webp" class="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover shadow-lg border-4 ${myVote?.voted_for_user_id === klarkaId ? 'border-[#faa61a] ring-4 ring-[#faa61a]/30' : 'border-[#202225] group-hover:border-[#faa61a]/50'} transition-all ${myVote && myVote.voted_for_user_id !== klarkaId ? 'grayscale' : ''}">
                            ${myVote?.voted_for_user_id === klarkaId ? '<div class="absolute -top-3 -right-3 w-10 h-10 bg-[#faa61a] rounded-full flex items-center justify-center text-white shadow-lg animate-bounce-short"><i class="fas fa-check"></i></div>' : ''}
                        </div>
                        <span class="text-xl font-bold ${myVote?.voted_for_user_id === klarkaId ? 'text-[#faa61a]' : 'text-gray-300'}">Klárka</span>
                    </button>
                </div>

                <!-- Status / Results -->
                <div class="mt-16 min-h-[100px] flex items-center justify-center">
                    ${!myVote ? 
                        '<p class="text-gray-500 animate-pulse italic">Čekám na tvůj hlas...</p>' : 
                        (!partnerVote ? 
                            '<div class="bg-[#2f3136] px-6 py-4 rounded-xl flex items-center gap-4 text-white font-medium border border-[#202225]"><i class="fas fa-spinner fa-spin text-[#faa61a]"></i> Čekám na partnerovo hlasování...</div>' :
                            (isMatched ? 
                                '<div class="animate-bounce-short"><h3 class="text-3xl font-black text-[#faa61a] mb-2">SHODA! ✨</h3><p class="text-white">Myslíte si to oba stejně!</p></div>' :
                                '<div class="grayscale opacity-80"> <h3 class="text-xl font-bold text-gray-400 mb-2">Neshodli jste se...</h3><p class="text-gray-500 text-sm">Každý máte jiný názor, a to je v pořádku!</p></div>'
                            )
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
}

function setupRealtime(questionId) {
    if (subscription) return;

    subscription = supabase
        .channel('game-votes-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_votes' }, payload => {
            const newVote = payload.new;
            if (newVote.question_id === questionId) {
                // Check if already in state
                if (!state.gameVotes.find(v => v.id === newVote.id)) {
                    state.gameVotes.push(newVote);
                    
                    // Re-render if we are on this page
                    if (state.currentChannel === 'game-who') {
                        const q = state.gameQuestions.find(g => g.id === questionId);
                        renderContent(q);
                    }
                }
            }
        })
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}
