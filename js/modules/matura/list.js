/**
 * matura/list.js
 * Rendering mřížky témat (karet) pro Maturita modul.
 *
 * Exportuje:
 *  - renderList(container, subject) – vyrenderuje mřížku karet témat
 */

import { state } from '../../core/state.js';

export function renderList(container, subject) {
    const items = state.maturaTopics?.[subject] || [];
    const isCzech = subject.startsWith('czech');
    const displayName = isCzech ? 'Čeština' : 'Informatika';
    const subIcon = isCzech ? '📚' : '💻';

    let html = `
        <div class="p-4 md:p-8 max-w-6xl mx-auto space-y-10 animate-fade-in relative mb-20">
             <div class="flex items-center justify-between">
                <h1 class="text-2xl md:text-4xl font-black text-white flex items-center gap-4 italic uppercase tracking-tighter">
                    <span class="bg-[#5865F2] p-3 rounded-2xl shadow-xl text-2xl">${subIcon}</span>
                    ${displayName}
                </h1>
                <div class="flex items-center gap-4">
                    <div class="text-right hidden md:block">
                        <div class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Maturitní Okruh</div>
                        <div class="bg-[var(--bg-secondary)] px-3 py-1 rounded-full text-xs font-bold text-[var(--text-muted)] border border-white/5">Celkem ${items.length} témat</div>
                    </div>
                    <button onclick="window.loadModule('matura').then(m => m.addNewTopic('${subject}'))" 
                            class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white p-3 rounded-2xl flex items-center gap-2 font-black uppercase text-[10px] transition shadow-lg active:scale-95">
                        <i class="fas fa-plus"></i> <span class="hidden sm:inline">Nové téma</span>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    `;

    items.forEach(item => {
        const prog = state.maturaProgress[item.id] || {
            jose: { status: 'none', notes: '' },
            klarka: { status: 'none', notes: '' }
        };

        const joseProg = prog.jose || { status: 'none', notes: '' };
        const klarkaProg = prog.klarka || { status: 'none', notes: '' };

        const jStatusIcon = joseProg.status === 'done' ? '✅' : (joseProg.status === 'started' ? '📖' : '⚪');
        const jStatusClass = joseProg.status === 'done' ? 'text-green-400' : (joseProg.status === 'started' ? 'text-blue-400' : 'text-gray-600');
        const kStatusIcon = klarkaProg.status === 'done' ? '✅' : (klarkaProg.status === 'started' ? '✍️' : '⚪');
        const kStatusClass = klarkaProg.status === 'done' ? 'text-[#eb459e]' : (klarkaProg.status === 'started' ? 'text-purple-400' : 'text-gray-600');

        html += `
            <div id="topic-card-${item.id}" data-topic-id="${item.id}" class="bg-[var(--bg-secondary)] rounded-2xl border border-white/5 p-5 hover:border-[#5865F2]/40 transition-all flex flex-col group overflow-hidden relative shadow-md">
                ${item.file ? `
                    <div class="absolute -right-4 -top-4 w-16 h-16 bg-[#3ba55c]/10 rounded-full blur-xl group-hover:bg-[#3ba55c]/20 transition-all"></div>
                ` : ''}

                <div class="flex items-start gap-4 mb-4">
                    <div class="text-4xl group-hover:scale-110 transition-transform duration-300 transform-gpu">${item.icon}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2 mb-0.5">
                            <div class="text-[9px] font-black uppercase text-[#5865F2] tracking-widest matura-cat-label">${item.cat || 'Ostatní'}</div>
                            <button onclick="window.loadModule('matura').then(m => m.openTopicEditor('${item.id}'))" class="text-gray-600 hover:text-[#5865F2] transition-colors p-1 -m-1" title="Upravit informace">
                                <i class="fas fa-pencil-alt text-[8px]"></i>
                            </button>
                        </div>
                        <h3 class="font-bold text-[var(--text-header)] leading-tight truncate px-0.5 group-hover:text-[#5865F2] transition-colors matura-topic-title" title="${item.title}">${item.title}</h3>
                        <div class="matura-topic-author">${item.author ? `<p class="text-xs text-[var(--text-muted)] italic">${item.author}</p>` : ''}</div>
                    </div>
                </div>

                ${item.description ? `<p class="matura-topic-description">"${item.description}"</p>` : ''}

                <div class="grid grid-cols-2 gap-2 mb-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-tighter px-1">Tvůj Stav</label>
                        <button onclick="window.loadModule('matura').then(m => m.cycleStatus('${item.id}'))" 
                                class="bg-black/10 hover:bg-black/20 border border-white/5 p-2 rounded-xl flex items-center justify-center gap-2 transition active:scale-90 overflow-hidden matura-my-status-btn">
                            <span class="text-xs transition-transform duration-500 status-icon">${state.currentUser?.name === 'Jožka' ? jStatusIcon : kStatusIcon}</span>
                            <span class="text-[9px] font-bold uppercase ${state.currentUser?.name === 'Jožka' ? jStatusClass : kStatusClass} truncate status-text">
                                ${state.currentUser?.name === 'Jožka' ? (joseProg.status === 'done' ? 'Umím' : (joseProg.status === 'started' ? 'Dělám' : 'Nic')) : (klarkaProg.status === 'done' ? 'Umím' : (klarkaProg.status === 'started' ? 'Dělám' : 'Nic'))}
                            </span>
                        </button>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-tighter px-1">${state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka'}</label>
                        <div class="bg-black/5 border border-dashed border-white/5 p-2 rounded-xl flex items-center justify-center gap-2 opacity-60 matura-partner-status-pill">
                            <span class="text-xs status-icon">${state.currentUser?.name === 'Jožka' ? kStatusIcon : jStatusIcon}</span>
                            <span class="text-[9px] font-bold uppercase ${state.currentUser?.name === 'Jožka' ? kStatusClass : jStatusClass} truncate status-text">
                                ${state.currentUser?.name === 'Jožka' ? (klarkaProg.status === 'done' ? 'Umím' : (klarkaProg.status === 'started' ? 'Dělám' : 'Nic')) : (joseProg.status === 'done' ? 'Umím' : (joseProg.status === 'started' ? 'Dělám' : 'Nic'))}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="mb-4 space-y-3">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            <span>Biflování (Mastery)</span>
                            <span id="mastery-text-${item.id}" class="text-[#eb459e] font-bold">0%</span>
                        </div>
                        <div class="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                            <div id="mastery-bar-${item.id}" class="h-full bg-[#eb459e] transition-all duration-1000 w-0"></div>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            <span>Přečteno (Kapitoly)</span>
                            <span id="read-text-${item.id}" class="text-[#3ba55c] font-bold">Zatím nečteno</span>
                        </div>
                        <div class="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                            <div id="read-bar-${item.id}" class="h-full bg-[#3ba55c] transition-all duration-1000 w-0"></div>
                        </div>
                    </div>
                </div>

                <div class="mt-auto flex gap-2 h-10">
                    ${item.has_content ? `
                        <button onclick="window.loadModule('matura').then(m => m.openKnowledgeBase('${item.id}'))"
                           class="flex-1 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] rounded-xl flex items-center justify-center gap-2 transition-all border border-[#5865F2]/30 group/btn shadow-lg">
                            <i class="fas fa-book-open text-xs group-hover/btn:scale-110 transition"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Zobrazit</span>
                        </button>
                    ` : `
                         <button onclick="window.loadModule('matura').then(m => m.openEditor('${item.id}')).catch(e => console.error('Failed to load matura editor', e))"
                           class="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 group/btn shadow-lg">
                            <i class="fas fa-pencil-alt text-xs group-hover/btn:scale-110 transition"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest font-black">Napsat</span>
                        </button>
                    `}
                    ${item.file ? `
                        <button onclick="window.loadModule('matura').then(m => m.openPDFViewer('${item.file}', '${item.title}')).catch(e => console.error('Failed to load PDF viewer', e))"
                           class="bg-[#3ba55c]/20 hover:bg-[#3ba55c]/30 text-[#3ba55c] rounded-xl flex items-center justify-center w-12 transition-all border border-[#3ba55c]/30 group/btn shadow-lg">
                            <i class="fas fa-eye text-xs group-hover/btn:scale-125 transition"></i>
                        </button>
                    ` : ''}
                    ${item.flashcards ? `
                        <button onclick="window.loadModule('flashcards').then(m => m.openFlashcards('${item.id}'))"
                           class="bg-[#eb459e]/20 hover:bg-[#eb459e]/30 text-[#eb459e] rounded-xl flex items-center justify-center w-12 transition-all border border-[#eb459e]/30 group/flash shadow-lg tooltip" data-tip="Flashcards 🎴">
                            <i class="fas fa-brain text-xs group-hover/flash:scale-125 transition"></i>
                        </button>
                    ` : ''}
                    <button onclick="window.loadModule('matura').then(m => m.openNotes('${item.id}'))" 
                            class="bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl flex items-center justify-center w-10 transition-all border border-white/5 tooltip" data-tip="Poznámky">
                        <i class="fas fa-sticky-note text-xs"></i>
                    </button>
                    <button onclick="window.loadModule('matura').then(m => m.showScheduleMenu('${item.id}', this))" 
                            class="bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl flex items-center justify-center w-10 transition-all border border-white/5 tooltip" data-tip="Naplánovat">
                        <i class="fas fa-calendar-alt text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;

    // Async load both mastery and read progress
    Promise.all([
        import('../../modules/spaced_repetition.js'),
        import('../../modules/progress.js')
    ]).then(async ([sr, pr]) => {
        for (const item of items) {
            const mastery = await sr.getTopicMastery(item.id);
            const mTextEl = document.getElementById(`mastery-text-${item.id}`);
            const mBarEl = document.getElementById(`mastery-bar-${item.id}`);

            if (mTextEl && mBarEl) {
                mTextEl.textContent = `${mastery}%`;
                mBarEl.style.width = `${mastery}%`;
                if (mastery >= 80) mBarEl.className = 'h-full bg-[#3ba55c] transition-all duration-1000';
                else if (mastery >= 40) mBarEl.className = 'h-full bg-[#faa61a] transition-all duration-1000';
                else mBarEl.className = 'h-full bg-[#ed4245] transition-all duration-1000';
            }

            const stats = await pr.getTopicProgress(item.id);
            const rTextEl = document.getElementById(`read-text-${item.id}`);
            const rBarEl = document.getElementById(`read-bar-${item.id}`);

            if (rTextEl && rBarEl) {
                const { done, total } = stats;
                if (total > 0) {
                    rTextEl.textContent = `${done} / ${total} kapitol hotovo`;
                    rBarEl.style.width = `${Math.round((done / total) * 100)}%`;
                } else {
                    if (item.has_content) {
                        import('../../modules/matura.js').then(m => m.silentBackfillCount(item.id));
                    }
                    rTextEl.textContent = done > 0 ? `${done} kapitol hotovo` : 'Zatím nečteno';
                    rBarEl.style.width = `${Math.min(100, done * 20)}%`;
                }
            }
        }
    });
}
