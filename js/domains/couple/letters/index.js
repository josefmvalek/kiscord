import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderCompose, sendLetter, handlePhotoSelect, removePhoto } from './editor.js';
import { renderInbox, renderSent, openLetter, deleteLetter, openFullscreen } from './viewer.js';

export {
    renderCompose,
    sendLetter,
    handlePhotoSelect,
    removePhoto,
    renderInbox,
    renderSent,
    openLetter,
    deleteLetter,
    openFullscreen
};

let currentView = 'inbox'; // 'inbox' | 'compose' | 'sent'

export async function renderLetters() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Load letters from Supabase - Sorted by newest first as requested
    const { data: letters } = await supabase
        .from('love_letters')
        .select('*')
        .order('created_at', { ascending: false });

    const now = new Date();
    const inbox = (letters || []).filter(l => l.sender_id !== state.currentUser.id);
    const sent = (letters || []).filter(l => l.sender_id === state.currentUser.id);

    container.innerHTML = `
    <div class="flex flex-col h-full bg-[#36393f] text-[#dcddde] font-main overflow-hidden">
        <!-- Discord-style Banner Header -->
        <div class="relative w-full h-32 flex-shrink-0 bg-gradient-to-br from-[#eb459e]/40 via-[#5865F2]/40 to-[#202225] overflow-hidden">
            <div class="absolute inset-0 bg-black/20"></div>
            <div class="relative h-full flex items-center px-8">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-[#eb459e] rounded-2xl flex items-center justify-center shadow-xl transform -rotate-12">
                        <i class="fas fa-envelope-open-text text-white text-3xl"></i>
                    </div>
                    <div>
                        <h1 class="text-3xl font-black text-white tracking-tight leading-tight">Digitální Dopisy</h1>
                    </div>
                </div>
            </div>
            <!-- Decorative curve -->
            <div class="absolute bottom-0 left-0 right-0 h-4 bg-[#36393f] rounded-t-[20px]"></div>
        </div>

        <div class="px-6 flex-1 flex flex-col overflow-hidden">
            <!-- Navigation -->
            <div class="flex items-center gap-4 py-4 border-b border-white/5 mb-4">
                <button onclick="window.loadModule('letters').then(m => m.setView('inbox'))" 
                    class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentView === 'inbox' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}">
                    <i class="fas fa-inbox"></i> Doručené (${inbox.length})
                </button>
                <button onclick="window.loadModule('letters').then(m => m.setView('compose'))" 
                    class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentView === 'compose' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}">
                    <i class="fas fa-edit"></i> Napsat
                </button>
                <button onclick="window.loadModule('letters').then(m => m.setView('sent'))" 
                    class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentView === 'sent' ? 'bg-white/10 text-[#eb459e]' : 'text-gray-400 hover:text-gray-200'}">
                    <i class="fas fa-paper-plane"></i> Odeslané (${sent.length})
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto pb-8 custom-scrollbar scroll-smooth">
                <div id="letters-content-area" class="max-w-3xl mx-auto w-full">
                    ${currentView === 'inbox' ? renderInbox(inbox) : ''}
                    ${currentView === 'compose' ? renderCompose() : ''}
                    ${currentView === 'sent' ? renderSent(sent) : ''}
                </div>
            </div>
        </div>
    </div>`;
}


export function setView(view) {
    currentView = view;
    renderLetters();
}

