import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { triggerHaptic } from '../core/utils.js';

// --- DIGITAL LOVE LETTERS MODULE ---

let currentView = 'inbox'; // 'inbox' | 'compose' | 'sent'

export async function renderLetters() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Load letters from Supabase
    const { data: letters } = await supabase
        .from('love_letters')
        .select('*')
        .order('unlock_at', { ascending: true });

    const now = new Date();
    const inbox = (letters || []).filter(l => l.sender_id !== state.currentUser.id);
    const sent = (letters || []).filter(l => l.sender_id === state.currentUser.id);
    const unreadCount = inbox.filter(l => !l.is_read && new Date(l.unlock_at) <= now).length;

    container.innerHTML = `
    <div class="flex flex-col h-full animate-fade-in">

        <!-- HEADER -->
        <div class="bg-gradient-to-r from-[#eb459e]/20 to-[#5865F2]/20 border-b border-[#202225] p-6">
            <div class="max-w-2xl mx-auto">
                <h1 class="text-2xl font-black text-white flex items-center gap-3 mb-1">
                    <i class="fas fa-envelope-open-text text-[#eb459e]"></i>
                    Digitální Dopisy
                    ${unreadCount > 0 ? `<span class="bg-[#eb459e] text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">${unreadCount} nový</span>` : ''}
                </h1>
                <p class="text-gray-400 text-sm">Vzkazy v láhvi 💌 – odemknou se přesně ve tvůj čas</p>
            </div>
        </div>

        <!-- TABS -->
        <div class="border-b border-[#202225] bg-[#2f3136]">
            <div class="max-w-2xl mx-auto flex">
                <button onclick="import('./js/modules/letters.js').then(m => m.setView('inbox'))"
                    class="letter-tab ${currentView === 'inbox' ? 'active' : ''} flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2">
                    <i class="fas fa-inbox"></i> Doručené (${inbox.length})
                </button>
                <button onclick="import('./js/modules/letters.js').then(m => m.setView('compose'))"
                    class="letter-tab ${currentView === 'compose' ? 'active' : ''} flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2">
                    <i class="fas fa-pen"></i> Napsat
                </button>
                <button onclick="import('./js/modules/letters.js').then(m => m.setView('sent'))"
                    class="letter-tab ${currentView === 'sent' ? 'active' : ''} flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2">
                    <i class="fas fa-paper-plane"></i> Odeslaný (${sent.length})
                </button>
            </div>
        </div>

        <!-- CONTENT -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div class="max-w-2xl mx-auto space-y-4 pb-8">
                ${currentView === 'inbox' ? renderInbox(inbox) : ''}
                ${currentView === 'compose' ? renderCompose() : ''}
                ${currentView === 'sent' ? renderSent(sent) : ''}
            </div>
        </div>
    </div>

    <style>
        .letter-tab { color: #72767d; border-bottom: 2px solid transparent; }
        .letter-tab.active { color: #eb459e; border-bottom-color: #eb459e; }
        .letter-tab:hover { color: #fff; background: #36393f; }
    </style>
    `;
}

function renderInbox(letters) {
    if (letters.length === 0) {
        return `<div class="text-center py-20">
            <div class="text-6xl mb-4">📭</div>
            <p class="text-gray-400 text-sm">Žádné dopisy... zatím</p>
            <p class="text-gray-600 text-xs mt-1">Počkej, až ti někdo napíše 💌</p>
        </div>`;
    }

    const now = new Date();
    return letters.map(letter => {
        const unlockDate = new Date(letter.unlock_at);
        const isUnlocked = unlockDate <= now;
        const timeLeft = formatTimeLeft(unlockDate);
        const senderName = letter.sender_id !== state.currentUser.id ? (state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka') : 'Ty';

        if (isUnlocked) {
            return `
            <div class="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-xl border border-[#eb459e]/30 shadow-lg overflow-hidden cursor-pointer hover:border-[#eb459e] transition group"
                 onclick="import('./js/modules/letters.js').then(m => m.openLetter('${letter.id}'))">
                <div class="bg-gradient-to-r from-[#eb459e]/10 to-transparent p-4 border-b border-[#eb459e]/20">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="text-2xl">${letter.is_read ? '💌' : '📩'}</div>
                            <div>
                                <h3 class="font-bold text-white group-hover:text-[#eb459e] transition">${letter.title}</h3>
                                <p class="text-xs text-gray-400">od ${senderName} · ${unlockDate.toLocaleDateString('cs-CZ')}</p>
                            </div>
                        </div>
                        ${!letter.is_read ? '<span class="bg-[#eb459e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NOVÝ</span>' : ''}
                    </div>
                </div>
                <div class="p-4">
                    <p class="text-gray-400 text-sm line-clamp-2">${letter.content.substring(0, 120)}${letter.content.length > 120 ? '...' : ''}</p>
                    <p class="text-xs text-[#eb459e] mt-2 font-bold"><i class="fas fa-arrow-right mr-1"></i> Přečíst celý dopis</p>
                </div>
            </div>`;
        } else {
            return `
            <div class="bg-[#2f3136] rounded-xl border border-[#202225] shadow-lg overflow-hidden opacity-75">
                <div class="p-4 flex items-center gap-4">
                    <div class="w-14 h-14 bg-[#202225] rounded-xl flex items-center justify-center text-2xl shrink-0">🔒</div>
                    <div class="flex-1">
                        <h3 class="font-bold text-gray-400">Zamčený dopis</h3>
                        <p class="text-xs text-gray-500 mt-0.5">od ${senderName}</p>
                        <div class="mt-2 bg-[#202225] rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                            <i class="fas fa-clock text-[#faa61a] text-xs"></i>
                            <span class="text-[#faa61a] text-xs font-bold">Otevře se za ${timeLeft}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    }).join('');
}

function renderCompose() {
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + 1);
    const minDateStr = minDate.toISOString().slice(0, 16);

    return `
    <div class="bg-[#2f3136] rounded-xl border border-[#202225] overflow-hidden shadow-xl">
        <div class="bg-gradient-to-r from-[#eb459e]/20 to-[#5865F2]/20 p-4 border-b border-[#202225]">
            <h2 class="font-bold text-white flex items-center gap-2">
                <i class="fas fa-feather-alt text-[#eb459e]"></i> Nový Dopis
            </h2>
            <p class="text-xs text-gray-400 mt-1">Napište vzkaz, který se otevře v přesný moment 💌</p>
        </div>

        <div class="p-5 space-y-4">
            <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Název dopisu</label>
                <input type="text" id="letter-title" placeholder="Ke tvému výročí..." maxlength="80"
                    class="w-full bg-[#202225] text-white text-sm p-3 rounded-lg border border-[#202225] outline-none focus:border-[#eb459e] transition placeholder-gray-600">
            </div>

            <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Zpráva</label>
                <textarea id="letter-content" rows="8" placeholder="Drahá Klárko / Jožko...&#10;&#10;..."
                    class="w-full bg-[#202225] text-white text-sm p-3 rounded-lg border border-[#202225] outline-none focus:border-[#eb459e] transition resize-none placeholder-gray-600 leading-relaxed"></textarea>
            </div>

            <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    <i class="fas fa-clock text-[#faa61a] mr-1"></i> Datum a čas odhalení
                </label>
                <input type="datetime-local" id="letter-unlock" min="${minDateStr}"
                    class="w-full bg-[#202225] text-white text-sm p-3 rounded-lg border border-[#202225] outline-none focus:border-[#faa61a] transition">
                <p class="text-[10px] text-gray-500 mt-1">Druhý uvidí zamčenou obálku s odpočtem – dopis se otevře přesně v tento čas.</p>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <button onclick="import('./js/modules/letters.js').then(m => m.setView('inbox'))"
                    class="py-3 rounded-lg border border-[#202225] text-gray-400 hover:text-white hover:bg-[#36393f] transition font-bold text-sm">
                    Zrušit
                </button>
                <button onclick="import('./js/modules/letters.js').then(m => m.sendLetter())"
                    class="py-3 rounded-lg bg-[#eb459e] hover:bg-[#d63b8c] text-white font-bold text-sm transition transform hover:scale-105 active:scale-95 shadow-lg">
                    <i class="fas fa-paper-plane mr-2"></i> Odeslat 💌
                </button>
            </div>
        </div>
    </div>`;
}

function renderSent(letters) {
    if (letters.length === 0) {
        return `<div class="text-center py-20">
            <div class="text-6xl mb-4">✉️</div>
            <p class="text-gray-400 text-sm">Ještě jsi nic nenapsal/a</p>
            <button onclick="import('./js/modules/letters.js').then(m => m.setView('compose'))"
                class="mt-4 bg-[#eb459e] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#d63b8c] transition">
                Napsat první dopis
            </button>
        </div>`;
    }

    const now = new Date();
    return letters.map(letter => {
        const unlockDate = new Date(letter.unlock_at);
        const isUnlocked = unlockDate <= now;
        return `
        <div class="bg-[#2f3136] rounded-xl border border-[#202225] p-4 flex items-center gap-4 shadow-md">
            <div class="text-2xl shrink-0">${isUnlocked ? '📬' : '📮'}</div>
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-white truncate">${letter.title}</h3>
                <p class="text-xs text-gray-500 mt-0.5">
                    ${isUnlocked
                        ? `<span class="text-[#3ba55c]"><i class="fas fa-check-circle mr-1"></i>Doručeno ${unlockDate.toLocaleDateString('cs-CZ')}</span>`
                        : `<span class="text-[#faa61a]"><i class="fas fa-clock mr-1"></i>Odhalí se ${unlockDate.toLocaleDateString('cs-CZ')} ${unlockDate.toLocaleTimeString('cs-CZ', {hour: '2-digit', minute: '2-digit'})}</span>`
                    }
                </p>
            </div>
            <button onclick="import('./js/modules/letters.js').then(m => m.deleteLetter('${letter.id}'))"
                class="text-gray-600 hover:text-red-400 transition p-2 rounded hover:bg-red-400/10">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>`;
    }).join('');
}

export async function openLetter(id) {
    const { data: letter } = await supabase.from('love_letters').select('*').eq('id', id).single();
    if (!letter) return;

    // Mark as read
    if (!letter.is_read) {
        await supabase.from('love_letters').update({ is_read: true }).eq('id', id);
    }

    const senderName = letter.sender_id !== state.currentUser.id
        ? (state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka')
        : 'Ty';

    const container = document.getElementById("messages-container");
    container.innerHTML = `
    <div class="flex flex-col h-full animate-fade-in">
        <div class="bg-gradient-to-r from-[#eb459e]/20 to-[#5865F2]/20 border-b border-[#202225] p-4 flex items-center gap-4">
            <button onclick="import('./js/modules/letters.js').then(m => m.renderLetters())"
                class="text-gray-400 hover:text-white transition p-2 rounded hover:bg-[#36393f]">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div>
                <h1 class="font-bold text-white">${letter.title}</h1>
                <p class="text-xs text-gray-400">od ${senderName} · ${new Date(letter.unlock_at).toLocaleDateString('cs-CZ')}</p>
            </div>
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div class="max-w-2xl mx-auto">
                <div class="text-center mb-8">
                    <div class="text-6xl mb-4 animate-bounce" style="animation-duration: 2s;">💌</div>
                </div>
                <div class="bg-[#2f3136] rounded-2xl border border-[#eb459e]/20 shadow-2xl overflow-hidden">
                    <div class="bg-gradient-to-r from-[#eb459e]/10 to-[#5865F2]/10 px-6 py-4 border-b border-[#eb459e]/10">
                        <p class="text-xs text-gray-500 uppercase tracking-widest">Dopis od ${senderName}</p>
                    </div>
                    <div class="p-6">
                        <p class="text-gray-200 leading-relaxed whitespace-pre-wrap text-sm" style="font-family: Georgia, serif; line-height: 2;">${letter.content}</p>
                    </div>
                    <div class="px-6 pb-4 text-right">
                        <p class="text-gray-500 text-xs italic">— ${senderName} ❤️</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function sendLetter() {
    const title = document.getElementById('letter-title')?.value.trim();
    const content = document.getElementById('letter-content')?.value.trim();
    const unlockAt = document.getElementById('letter-unlock')?.value;

    if (!title || !content || !unlockAt) {
        if (window.showNotification) window.showNotification('Vyplň všechna pole!', 'error');
        return;
    }

    try {
        const { error } = await supabase.from('love_letters').insert({
            sender_id: state.currentUser.id,
            title,
            content,
            unlock_at: new Date(unlockAt).toISOString(),
            is_read: false
        });

        if (error) throw error;
        triggerHaptic('success');
        if (window.showNotification) window.showNotification('Dopis odeslán! 💌', 'success');
        currentView = 'sent';
        renderLetters();
    } catch (err) {
        console.error('Failed to send letter:', err);
        if (window.showNotification) window.showNotification('Chyba při odesílání!', 'error');
    }
}

export async function deleteLetter(id) {
    const ok = await window.showConfirmDialog('Smazat tento dopis?', 'Smazat', 'Zrušit');
    if (!ok) return;
    await supabase.from('love_letters').delete().eq('id', id);
    renderLetters();
}

export function setView(view) {
    currentView = view;
    renderLetters();
}

function formatTimeLeft(date) {
    const now = new Date();
    const diff = date - now;
    if (diff <= 0) return 'teď';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} dní a ${hours} hodin`;
    if (hours > 0) return `${hours} hodin a ${minutes} minut`;
    return `${minutes} minut`;
}
