/**
 * Conversation Topics Administration, Reset, Export & Creation
 */

import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { safeUpsert } from '@core/offline.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { getSelectedTopicId, setSelectedTopicId } from './state.js';

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
        for (const tid in state.topicProgress) {
            state.topicProgress[tid].bookmarks = [];
            try {
                await safeUpsert('topic_progress', {
                    user_id: state.currentUser?.id,
                    topic_id: tid,
                    bookmarks: []
                });
            } catch (e) { console.error("[Topics] Error saving topic progress:", e); }
        }
        showNotification("Všechny oblíbené otázky smazány! 🗑️", "success");
    } else {
        if (!state.topicProgress) state.topicProgress = {};
        state.topicProgress[state.pendingResetId] = { index: 0, completed: false, bookmarks: [], doneIndices: [] };
        const { error } = await supabase.from('topic_progress').delete().match({ 
            user_id: state.currentUser?.id, 
            topic_id: state.pendingResetId 
        });
        if (error) console.error('[Topics] Reset topic delete error:', error);
        showNotification("Postup resetován! 🔄", "success");
    }

    if (window.closeModal) window.closeModal("reset-confirm-modal");
    else {
        const el = document.getElementById("reset-confirm-modal");
        if (el) el.style.display = "none";
    }

    state.pendingResetId = null;
    window.Topics?.render?.();
}

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
                        ${(state.conversationTopics || []).map(t => `
                            <button onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); this.dataset.selected = 'true'; window.Topics.setTopicId('${t.id}')" 
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
                <button onclick="window.Topics.saveNewTopicQuestion()" class="w-full bg-[#eb459e] hover:bg-[#d63b8c] text-white py-4 rounded-xl font-black text-lg transition shadow-xl transform active:scale-95">
                    PŘIDAT OTÁZKU 💖
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export async function saveNewTopicQuestion() {
    const text = document.getElementById('nt-text')?.value.trim();
    const topicId = getSelectedTopicId();
    
    if (!text || !topicId) {
        showNotification("Vyber kategorii a napiš text otázky!", "warning");
        return;
    }
    
    triggerHaptic('success');
    
    try {
        const topic = (state.conversationTopics || []).find(t => t.id === topicId);
        if (!topic) throw new Error("Kategorie nenalezena.");
        const updatedQuestions = [...(topic.questions || []), text];
        
        const { error } = await supabase.from('conversation_topics').update({
            questions: updatedQuestions
        }).eq('id', topicId);
        
        if (error) throw error;
        
        topic.questions = updatedQuestions;
        showNotification(`Otázka přidána do kategorie ${topic.title}! ✨`, "success");
        triggerConfetti();
        
        document.getElementById('topic-add-modal')?.remove();
        window.Topics?.render?.();
    } catch (err) {
        console.error("[Topics] Save Topic Question Error:", err);
        showNotification("Chyba při ukládání: " + err.message, "danger");
    }
}

export async function exportTopicsToTxt() {
    triggerHaptic('light');
    const topics = state.conversationTopics || [];
    
    if (topics.length === 0) {
        showNotification("Žádná témata k exportu nebyla nalezena.", "error");
        return;
    }

    let text = "KISCORD - EXPORT KONVERZAČNÍCH TÉMAT\n";
    text += "======================================\n\n";

    topics.forEach(t => {
        text += `${t.icon} ${t.title.toUpperCase()}\n`;
        text += "-".repeat(t.title.length + 4) + "\n";
        if (t.questions && Array.isArray(t.questions)) {
            t.questions.forEach((q, i) => {
                text += `${i + 1}. ${q}\n`;
            });
        }
        text += "\n";
    });

    try {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kiscord_temata_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification("Seznam otázek byl úspěšně vyexportován. 📄", "success");
    } catch (err) {
        console.error("[Topics] Export Topics Error:", err);
        showNotification("Chyba při exportu souboru.", "danger");
    }
}

export async function clearOldTopicQuestions() {
    const confirmed = await showConfirmDialog("Opravdu chceš vymazat VŠECHNY OTÁZKY v původních kategoriích? (Kategorie samotné zůstanou prázdné a připravené na tvoje nové otázky).");
    if (!confirmed) return;
    
    triggerHaptic('medium');
    const oldTitles = [
        'Vztah & Emoce',
        'Sny & Budoucnost', 
        'Zábava & Hypotézy',
        'Hluboké & Osobní',
        'Dětství & Nostalgie'
    ];

    try {
        const { data: topics, error: fetchErr } = await supabase
            .from('conversation_topics')
            .select('id')
            .in('title', oldTitles);

        if (fetchErr) throw fetchErr;

        const { error: updateErr } = await supabase
            .from('conversation_topics')
            .update({ questions: [] })
            .in('title', oldTitles);

        if (updateErr) throw updateErr;

        if (topics && topics.length > 0) {
            const topicIds = topics.map(t => t.id);
            await supabase
                .from('topic_progress')
                .delete()
                .in('topic_id', topicIds);
        }

        showNotification("Otázky v původních kategoriích vymazány! 🧹", "success");
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        console.error("[Topics] Clear Questions Error:", err);
        showNotification("Chyba při mazání: " + err.message, "danger");
    }
}
