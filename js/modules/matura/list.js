import { state, refreshMaturaTopics } from '../../core/state.js';
import { supabase } from '../../core/supabase.js';
import { triggerHaptic, showNotification, updateTopicCardUI } from './shared.js';

export async function renderList(container, categoryId) {
    const topics = state.maturaTopics?.[categoryId] || [];
    const isJozka = state.currentUser?.name === 'Jožka';

    container.innerHTML = `
        <div class="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in relative">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-black text-white italic tracking-tighter uppercase">
                        ${categoryId.includes('czech') ? 'Český Jazyk' : 'Informatika'}
                    </h1>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Okruhy k maturitní zkoušce</p>
                </div>
                <div class="flex items-center gap-2">
                     <button onclick="window.loadModule('matura').then(m => m.addNewTopic('${categoryId}'))" 
                             class="bg-white/5 hover:bg-white/10 text-gray-400 p-3 rounded-xl border border-white/5 transition" title="Přidat téma">
                         <i class="fas fa-plus"></i>
                     </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="matura-topics-grid">
                ${topics.map(t => renderTopicCard(t, isJozka)).join('')}
            </div>
        </div>
    `;
}

function renderTopicCard(item, isJozka) {
    const prog = state.maturaProgress[item.id] || {};
    const me = isJozka ? 'jose' : 'klarka';
    const partner = isJozka ? 'klarka' : 'jose';

    const myStatus = prog[me]?.status || 'none';
    const partnerStatus = prog[partner]?.status || 'none';

    const getStatusColor = (s) => {
        if (s === 'done') return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
        if (s === 'half') return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]';
        return 'bg-white/10';
    };

    return `
        <div data-topic-id="${item.id}" class="matura-card bg-[#2f3136] border border-white/5 rounded-2xl p-5 hover:border-[#5865F2]/40 transition-all group relative overflow-hidden flex flex-col justify-between h-full">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="text-3xl grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-110">${item.icon || '📝'}</div>
                    <div class="min-w-0">
                        <h3 class="text-sm font-bold text-white truncate group-hover:text-[#5865F2] transition-colors leading-tight">${item.title}</h3>
                        <div class="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">${item.author || 'Okruh'}</div>
                    </div>
                </div>
                <div class="flex flex-col gap-1 items-end">
                    <div class="my-status-dot w-2 h-2 rounded-full ${getStatusColor(myStatus)}" title="Můj progres"></div>
                    <div class="partner-status-dot w-2 h-2 rounded-full ${getStatusColor(partnerStatus)}" title="Partnerův progres"></div>
                </div>
            </div>

            <div class="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-white/5">
                <div class="flex items-center gap-1">
                    <button onclick="window.loadModule('matura').then(m => m.openKnowledgeBase('${item.id}'))" 
                            class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2">
                        <i class="fas fa-book-open"></i> Studovat
                    </button>
                    <button onclick="window.loadModule('matura').then(m => m.cycleStatus('${item.id}', this))" 
                            class="bg-white/5 hover:bg-white/10 text-gray-400 p-2 rounded-xl border border-white/5 transition tooltip" data-tip="Změnit stav">
                        <i class="fas fa-check-circle"></i>
                    </button>
                </div>
                <button onclick="window.loadModule('matura').then(m => m.showScheduleMenu('${item.id}', this))"
                        class="text-gray-600 hover:text-[#eb459e] p-2 transition-colors">
                    <i class="fas fa-calendar-plus text-xs"></i>
                </button>
            </div>
            
            ${item.has_content ? '<div class="absolute top-0 right-0 w-8 h-8 bg-green-500/10 rounded-bl-2xl flex items-center justify-center text-[10px] text-green-500" title="Obsahuje zápis"><i class="fas fa-file-alt"></i></div>' : ''}
        </div>
    `;
}

export async function cycleStatus(itemId, btn) {
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';
    const prog = state.maturaProgress[itemId] || { jose: { status: 'none' }, klarka: { status: 'none' } };
    
    let current = prog[userKey]?.status || 'none';
    let next = 'started';
    if (current === 'started') next = 'half';
    else if (current === 'half') next = 'done';
    else if (current === 'done') next = 'none';

    // Update local state
    if (!prog[userKey]) prog[userKey] = { status: 'none' };
    prog[userKey].status = next;
    state.maturaProgress[itemId] = prog;

    updateTopicCardUI(itemId);
    triggerHaptic('light');

    try {
        await supabase.from('matura_topic_progress').upsert({
            item_id: itemId,
            user_id: state.currentUser?.id,
            status: next,
            updated_at: new Date().toISOString()
        });
        
        if (next === 'done') {
            showNotification('Skvělá práce! Jedno téma hotovo! 🎉', 'success');
            triggerConfetti();
        }
    } catch (e) {
        showNotification('Uloženo lokálně! ⚠️', 'warning');
    }
}

export function handleMaturaSearch(query) {
    const container = document.getElementById('matura-topics-grid');
    if (!container) return;

    if (!query) {
        // Restore current list (Czech or IT)
        const channel = state.currentChannel;
        if (channel === 'matura-czech') {
            const user = state.currentUser?.name === 'Jožka' ? 'jozka' : 'klarka';
            renderList(document.getElementById("messages-container"), `czech_${user}`);
        } else if (channel === 'matura-it') {
            renderList(document.getElementById("messages-container"), 'it');
        }
        return;
    }

    const q = query.toLowerCase();
    const allTopics = Object.values(state.maturaTopics || {}).flat();
    const filtered = allTopics.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.author && t.author.toLowerCase().includes(q)) ||
        (t.cat && t.cat.toLowerCase().includes(q))
    );

    const isJozka = state.currentUser?.name === 'Jožka';
    container.innerHTML = filtered.map(t => renderTopicCard(t, isJozka)).join('');
}

export async function addNewTopic(categoryId) {
    const title = await window.showPromptDialog("Název nového tématu:");
    if (!title) return;

    try {
        const { data, error } = await supabase.from('matura_topics').insert({
            category_id: categoryId,
            title: title,
            author: state.currentUser?.name === 'Jožka' ? 'Jožka' : 'Klárka',
            icon: '📝'
        }).select().single();

        if (error) throw error;
        showNotification("Téma přidáno! 🚀", "success");
        await refreshMaturaTopics();
        const container = document.getElementById("messages-container");
        renderList(container, categoryId);
    } catch (e) {
        showNotification("Chyba při přidávání tématu.", "error");
    }
}
