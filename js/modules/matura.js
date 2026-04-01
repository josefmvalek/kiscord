import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { supabase } from '../core/supabase.js';
import { renderModal } from '../core/ui.js';
import { broadcastMaturaSOS, broadcastPomodoroUpdate } from '../core/sync.js';
import { safeInsert, safeUpsert, safeUpdate, enqueueOperation } from '../core/offline.js';
import { uploadFile } from '../core/storage.js';

let pomodoroInterval = null;
let pomodoroState = { status: 'stopped', timeLeft: 0, partnerStudying: false };

/**
 * Main entry point for Matura channels
 */
export async function renderMatura(channelId) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Load topics from DB if not already loaded (or refresh)
    if (channelId.startsWith('matura-')) {
        await refreshMaturaTopics();
    }

    if (channelId === 'matura-dashboard') {
        renderDashboard(container);
    } else if (channelId === 'matura-czech') {
        const user = state.currentUser?.name === 'Jožka' ? 'jozka' : 'klarka';
        renderList(container, `czech_${user}`);
    } else if (channelId === 'matura-it') {
        renderList(container, 'it');
    }
}

/**
 * Toggles a local theme (Light/Dark) on a specific container without affecting the app.
 */
export function toggleLocalTheme(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    triggerHaptic('medium');
    const isLight = el.classList.contains('theme-light');

    if (isLight) {
        el.classList.remove('theme-light');
        el.classList.add('theme-dark');
        showNotification("Místní režim: Tmavý 🌙", "info");
    } else {
        el.classList.remove('theme-dark');
        el.classList.add('theme-light');
        showNotification("Místní režim: Světlý ☀️", "success");
    }
}

async function refreshMaturaTopics() {
    const { data, error } = await supabase.from('matura_topics').select('*').order('title');
    if (data) {
        // Group by category_id to mimic old maturaData structure
        const grouped = data.reduce((acc, topic) => {
            if (!acc[topic.category_id]) acc[topic.category_id] = [];
            acc[topic.category_id].push(topic);
            return acc;
        }, {});
        state.maturaTopics = grouped;
    }
}

/**
 * Triggers a re-render of the current Matura view and cleans up the Knowledge Base
 */
export function closeKnowledgeBase(modalId) {
    document.getElementById(modalId)?.remove();
    // Cleanup highlighter instance
    import('./highlighter.js').then(m => {
        if (m.destroyHighlighter) m.destroyHighlighter();
    });
    // Re-render current channel to update progress bars
    renderMatura(state.currentChannel);
}

// --- DASHBOARD RENDERING ---

function renderDashboard(container) {
    const user = state.currentUser?.name;
    const maturityDate = user === 'Jožka'
        ? new Date('2026-05-19T08:00:00')
        : new Date('2026-05-25T08:00:00');

    const now = new Date();
    const diff = maturityDate - now;
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    // Calculate Progress
    const subjects = ['czech_jozka', 'czech_klarka', 'it'];
    let totalItems = 0;
    let completedItems = 0;

    subjects.forEach(sub => {
        const items = state.maturaTopics?.[sub] || [];
        totalItems += items.length;

        items.forEach(item => {
            const prog = state.maturaProgress[item.id] || {};
            // We check progress for BOTH users if it's the partner view, 
            // but for simplicity on dashboard we show combined mastery
            if (prog.jose?.status === 'done') completedItems += 0.5;
            if (prog.klarka?.status === 'done') completedItems += 0.5;
        });
    });

    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    container.innerHTML = `
        <div id="matura-dashboard-container" class="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in relative min-h-full">
            <!-- Glow background -->
            <div class="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#eb459e]/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div class="text-center space-y-2 relative">
                <button onclick="import('/js/modules/matura.js').then(m => m.toggleLocalTheme('matura-dashboard-container'))" 
                        class="absolute right-0 top-0 p-3 rounded-full hover:bg-white/5 text-[var(--interactive-normal)] hover:text-[var(--text-header)] transition-all"
                        title="Přepnout téma okna">
                    <i class="fas fa-sun block theme-dark:hidden"></i>
                    <i class="fas fa-moon hidden theme-dark:block"></i>
                </button>
                <h1 class="text-3xl md:text-5xl font-black text-[var(--text-header)] tracking-tighter uppercase italic">
                    <span class="text-[#eb459e]">Cesta</span> ke svobodě
                </h1>
                <p class="text-[var(--interactive-normal)] text-sm tracking-widest uppercase font-bold mb-4">Maturitní Akademie 2026</p>
                
                <!-- Search Bar -->
                <div class="max-w-xl mx-auto relative group">
                    <div class="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#5865F2] transition-colors">
                        <i class="fas fa-search text-sm"></i>
                    </div>
                    <input type="text" 
                        oninput="import('/js/modules/matura.js').then(m => m.handleMaturaSearch(this.value))"
                        placeholder="Hledat téma, autora nebo okruh..." 
                        class="w-full bg-[var(--bg-secondary)] border border-white/5 group-hover:border-white/10 focus:border-[#5865F2]/50 focus:ring-4 focus:ring-[#5865F2]/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-[var(--text-header)] placeholder-gray-500 outline-none transition-all shadow-xl font-bold tracking-tight">
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/5 px-2 py-1 rounded text-[8px] font-black uppercase text-gray-500 tracking-widest border border-white/5 pointer-events-none group-focus-within:opacity-0 transition">Matura Search</div>
                </div>
            </div>

            <!-- Countdown -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-white/5 shadow-2xl flex flex-col items-center justify-center text-center group hover:border-[#eb459e]/30 transition-all duration-300">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Dní do vysvobození</div>
                    <div class="text-7xl font-black text-[var(--text-header)] group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(235,69,158,0.3)]">${days}</div>
                    <div class="text-xs text-[#eb459e] font-bold mt-4 uppercase">Uteče to jako voda! 🌊</div>
                </div>

                    <div class="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-white/5 shadow-2xl flex flex-col justify-center gap-4">
                        <div class="flex justify-between items-end">
                            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Přečteno (Pasivní)</div>
                            <div class="text-2xl font-black text-[var(--text-header)] italic">${progressPercent}%</div>
                        </div>
                        <div class="w-full h-2 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div class="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full transition-all duration-1000 ease-out" style="width: ${progressPercent}%"></div>
                        </div>
                        
                        <div class="flex justify-between items-end mt-2">
                            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-[#eb459e]">Ovládnuto (Aktivní)</div>
                            <div class="text-2xl font-black text-white italic" id="total-mastery-text">...%</div>
                        </div>
                        <div class="w-full h-4 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div id="total-mastery-bar" class="h-full bg-gradient-to-r from-[#5865F2] to-[#eb459e] rounded-full shadow-[0_0_15px_rgba(88,101,242,0.4)] transition-all duration-1000 ease-out" style="width: 0%"></div>
                        </div>
                    </div>
                </div>

            <!-- SOS & Quests -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onclick="import('/js/modules/matura.js').then(m => m.triggerSOS())" 
                        class="bg-[#ed4245]/20 hover:bg-[#ed4245]/30 border border-[#ed4245]/30 p-6 rounded-2xl transition-all group flex flex-col items-center gap-2">
                    <div class="text-3xl group-hover:scale-110 transition">🆘</div>
                    <div class="text-xs font-black text-[#ed4245] uppercase tracking-widest leading-none">Panic Button</div>
                    <div class="text-[9px] text-red-500/60 uppercase font-bold">Potřebuji pauzu/čoko/objetí</div>
                </button>

                <div class="col-span-1 md:col-span-2 bg-[var(--bg-secondary)] border border-white/5 p-6 rounded-2xl flex items-center gap-6">
                    <div class="text-4xl">🎓</div>
                    <div>
                        <h3 class="font-black text-[var(--text-header)] uppercase tracking-tight text-sm">Další Milestone</h3>
                        <p class="text-xs text-[var(--text-muted)]">Pokud oba dokončíte <b>prvních 10 děl</b>, jdeme na pořádnou večeři! 🍔</p>
                    </div>
                </div>
            </div>

            <!-- Focus Mode -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Streak & Today's Mission -->
                <div class="lg:col-span-1 space-y-4">
                    <div class="bg-[var(--bg-secondary)] border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                        <div>
                            <div class="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Tvůj Streak</div>
                            <div class="text-3xl font-black text-[var(--text-header)] flex items-center gap-2">
                                <span class="text-orange-500 animate-pulse">🔥</span> 
                                ${state.maturaStreaks[state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka'] || 0} dní
                            </div>
                        </div>
                        <div class="text-right">
                             <div class="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">${state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka'}</div>
                             <div class="text-xl font-bold text-[var(--text-muted)] flex items-center gap-1 justify-end">
                                <span>🔥</span> ${state.maturaStreaks[state.currentUser?.name === 'Jožka' ? 'klarka' : 'jose'] || 0}
                             </div>
                        </div>
                    </div>

                    <div class="bg-[var(--bg-secondary)] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:scale-125 transition-transform"><i class="fas fa-bullseye text-4xl"></i></div>
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-[#5865F2] mb-4 flex items-center gap-2">
                            <i class="fas fa-calendar-check"></i> Dnešní mise
                        </h3>
                        <div id="todays-mission-list" class="space-y-3">
                            <!-- Populated via JS -->
                            <div class="text-[var(--text-muted)] text-[10px] italic">Žádné plány na dnešek... Odpočívej! 💤</div>
                        </div>
                    </div>
                </div>

                <!-- Timer -->
                <div class="lg:col-span-2 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
                     <div class="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div class="text-center md:text-left">
                            <h2 class="text-2xl font-black text-[var(--text-header)] uppercase italic leading-none mb-2">Společný Focus Hub</h2>
                            <p class="text-xs text-[var(--text-muted)]">Zapni Pomodoro a studujte synchronizovaně.</p>
                        </div>
                        <div class="flex items-center gap-6">
                            <div id="pomodoro-timer" class="text-4xl font-black text-[var(--text-header)] font-mono bg-black/20 px-6 py-4 rounded-2xl border border-white/5 tabular-nums">25:00</div>
                            <button id="pomodoro-btn" onclick="import('/js/modules/matura.js').then(m => m.togglePomodoro())" 
                                    class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition active:scale-95 disabled:opacity-50">
                                Start 🧠
                            </button>
                        </div>
                     </div>
                     <div id="pomodoro-status-list" class="mt-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                         <!-- Populated via JS -->
                     </div>
                </div>
            </div>
        </div>
    `;



    // Calculate Total Mastery Async
    import('./spaced_repetition.js').then(async sr => {
        const subjects = ['czech', 'it'];
        let totalMasterySum = 0;
        let totalSubjectsCount = 0;

        for (const sub of subjects) {
            const items = state.maturaTopics?.[sub] || [];
            for (const item of items) {
                totalMasterySum += await sr.getTopicMastery(item.id);
                totalSubjectsCount++;
            }
        }

        const finalMastery = totalSubjectsCount > 0 ? Math.round(totalMasterySum / totalSubjectsCount) : 0;
        const textEl = document.getElementById('total-mastery-text');
        const barEl = document.getElementById('total-mastery-bar');
        if (textEl && barEl) {
            textEl.textContent = `${finalMastery}%`;
            barEl.style.width = `${finalMastery}%`;
        }
    });

    renderTodaysMissions();
    initPomodoro();
}

export function handleMaturaSearch(query) {
    if (!query || query.trim().length === 0) {
        // If empty, just re-show dashboard
        const container = document.getElementById("messages-container");
        renderDashboard(container);
        return;
    }

    import('./search.js').then(search => {
        search.renderGlobalSearch(query);
    });
}

// --- LIST RENDERING ---

function renderList(container, subject) {
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
                    <button onclick="import('/js/modules/matura.js').then(m => m.addNewTopic('${subject}'))" 
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

        // Jožka Status
        const jStatusIcon = joseProg.status === 'done' ? '✅' : (joseProg.status === 'started' ? '📖' : '⚪');
        const jStatusClass = joseProg.status === 'done' ? 'text-green-400' : (joseProg.status === 'started' ? 'text-blue-400' : 'text-gray-600');

        // Klárka Status
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
                        <div class="text-[9px] font-black uppercase text-[#5865F2] tracking-widest mb-0.5">${item.cat || 'Ostatní'}</div>
                        <h3 class="font-bold text-[var(--text-header)] leading-tight truncate px-0.5 group-hover:text-[#5865F2] transition-colors" title="${item.title}">${item.title}</h3>
                        ${item.author ? `<p class="text-xs text-[var(--text-muted)] italic">${item.author}</p>` : ''}
                    </div>
                </div>

                ${item.description ? `<p class="matura-topic-description">"${item.description}"</p>` : ''}

                <!-- Status Context (Me & Partner) -->
                <div class="grid grid-cols-2 gap-2 mb-4">
                    <!-- Controls for CURRENT USER only -->
                    <div class="flex flex-col gap-1">
                        <label class="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-tighter px-1">Tvůj Stav</label>
                        <button onclick="import('/js/modules/matura.js').then(m => m.cycleStatus('${item.id}'))" 
                                class="bg-black/10 hover:bg-black/20 border border-white/5 p-2 rounded-xl flex items-center justify-center gap-2 transition active:scale-90 overflow-hidden matura-my-status-btn">
                            <span class="text-xs transition-transform duration-500 status-icon">${state.currentUser?.name === 'Jožka' ? jStatusIcon : kStatusIcon}</span>
                            <span class="text-[9px] font-bold uppercase ${state.currentUser?.name === 'Jožka' ? jStatusClass : kStatusClass} truncate status-text">
                                ${state.currentUser?.name === 'Jožka' ? (joseProg.status === 'done' ? 'Umím' : (joseProg.status === 'started' ? 'Dělám' : 'Nic')) : (klarkaProg.status === 'done' ? 'Umím' : (klarkaProg.status === 'started' ? 'Dělám' : 'Nic'))}
                            </span>
                        </button>
                    </div>

                    <!-- Info about PARTNER -->
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

                <!-- Stats Container -->
                <div class="mb-4 space-y-3">
                    <!-- Mastery Progress (Flashcards) -->
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            <span>Biflování (Mastery)</span>
                            <span id="mastery-text-${item.id}" class="text-[#eb459e] font-bold">0%</span>
                        </div>
                        <div class="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                            <div id="mastery-bar-${item.id}" class="h-full bg-[#eb459e] transition-all duration-1000 w-0"></div>
                        </div>
                    </div>

                    <!-- Read Progress (Checkboxes) -->
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
                        <button onclick="import('/js/modules/matura.js').then(m => m.openKnowledgeBase('${item.id}'))"
                           class="flex-1 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] rounded-xl flex items-center justify-center gap-2 transition-all border border-[#5865F2]/30 group/btn shadow-lg">
                            <i class="fas fa-book-open text-xs group-hover/btn:scale-110 transition"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Zobrazit</span>
                        </button>
                    ` : `
                         <button onclick="import('/js/modules/matura.js').then(m => m.openEditor('${item.id}'))"
                           class="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 group/btn shadow-lg">
                            <i class="fas fa-pencil-alt text-xs group-hover/btn:scale-110 transition"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest font-black">Napsat</span>
                        </button>
                    `}
                    ${item.file ? `
                        <button onclick="import('/js/modules/matura.js').then(m => m.openPDFViewer('${item.file}', '${item.title}'))"
                           class="bg-[#3ba55c]/20 hover:bg-[#3ba55c]/30 text-[#3ba55c] rounded-xl flex items-center justify-center w-12 transition-all border border-[#3ba55c]/30 group/btn shadow-lg">
                            <i class="fas fa-eye text-xs group-hover/btn:scale-125 transition"></i>
                        </button>
                    ` : ''}

                    ${item.flashcards ? `
                        <button onclick="import('./js/modules/flashcards.js').then(m => m.openFlashcards('${item.id}'))"
                           class="bg-[#eb459e]/20 hover:bg-[#eb459e]/30 text-[#eb459e] rounded-xl flex items-center justify-center w-12 transition-all border border-[#eb459e]/30 group/flash shadow-lg tooltip" data-tip="Flashcards 🎴">
                            <i class="fas fa-brain text-xs group-hover/flash:scale-125 transition"></i>
                        </button>
                    ` : ''}
                    
                    <button onclick="import('/js/modules/matura.js').then(m => m.openNotes('${item.id}'))" 
                            class="bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl flex items-center justify-center w-10 transition-all border border-white/5 tooltip" data-tip="Poznámky">
                        <i class="fas fa-sticky-note text-xs"></i>
                    </button>
                    
                    <button onclick="import('/js/modules/matura.js').then(m => m.showScheduleMenu('${item.id}', this))" 
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
        import('./spaced_repetition.js'),
        import('./progress.js')
    ]).then(async ([sr, pr]) => {
        for (const item of items) {
            // 1. Mastery Status
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

            // 2. Read Progress (Checkboxes)
            const stats = await pr.getTopicProgress(item.id);
            const rTextEl = document.getElementById(`read-text-${item.id}`);
            const rBarEl = document.getElementById(`read-bar-${item.id}`);

            if (rTextEl && rBarEl) {
                const { done, total } = stats;
                if (total > 0) {
                    rTextEl.textContent = `${done} / ${total} kapitol hotovo`;
                    const progressWidth = Math.round((done / total) * 100);
                    rBarEl.style.width = `${progressWidth}%`;
                } else {
                    // Try to trigger a silent backfill if total is 0 but item might have content
                    if (item.has_content) {
                        import('./matura.js').then(m => m.silentBackfillCount(item.id));
                    }
                    rTextEl.textContent = done > 0 ? `${done} kapitol hotovo` : 'Zatím nečteno';
                    const progressWidth = Math.min(100, done * 20);
                    rBarEl.style.width = `${progressWidth}%`;
                }
            }
        }
    });
}

// --- ACTIONS ---

export async function cycleStatus(itemId) {
    const prog = state.maturaProgress[itemId] || {
        jose: { status: 'none', notes: '' },
        klarka: { status: 'none', notes: '' }
    };
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';
    const current = prog[userKey].status;

    let next = 'none';
    if (current === 'none') next = 'started';
    else if (current === 'started') next = 'done';
    else if (current === 'done') next = 'none';

    prog[userKey].status = next;
    state.maturaProgress[itemId] = prog;

    triggerHaptic(next === 'done' ? 'success' : 'light');
    if (next === 'done') triggerConfetti();

    // Persist to Supabase
    try {
        await supabase.from('matura_topic_progress').upsert({
            item_id: itemId,
            user_id: state.currentUser?.id,
            status: next,
            notes: prog[userKey].notes,
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn("[Matura] Supabase error (probably table missing), using local state.");
    }

    // TARGETED UPDATE instead of full re-render
    updateTopicCardUI(itemId);
}

/**
 * Updates only a single topic card in the UI without re-rendering the whole list
 */
export async function updateTopicCardUI(itemId) {
    const card = document.getElementById(`topic-card-${itemId}`);
    if (!card) return;

    // 1. Get latest progress from state (locally updated in cycleStatus)
    const prog = state.maturaProgress[itemId] || {
        jose: { status: 'none', notes: '' },
        klarka: { status: 'none', notes: '' }
    };

    // Find item info
    let item = null;
    for (const cat in state.maturaTopics) {
        item = state.maturaTopics[cat].find(i => i.id === itemId);
        if (item) break;
    }
    if (!item) return;

    const joseProg = prog.jose || { status: 'none', notes: '' };
    const klarkaProg = prog.klarka || { status: 'none', notes: '' };

    const jStatusIcon = joseProg.status === 'done' ? '✅' : (joseProg.status === 'started' ? '📖' : '⚪');
    const jStatusClass = joseProg.status === 'done' ? 'text-green-400' : (joseProg.status === 'started' ? 'text-blue-400' : 'text-gray-600');
    const kStatusIcon = klarkaProg.status === 'done' ? '✅' : (klarkaProg.status === 'started' ? '✍️' : '⚪');
    const kStatusClass = klarkaProg.status === 'done' ? 'text-[#eb459e]' : (klarkaProg.status === 'started' ? 'text-purple-400' : 'text-gray-600');

    // Update Status Buttons
    const myStatusBtn = card.querySelector('.matura-my-status-btn');
    if (myStatusBtn) {
        const iconEl = myStatusBtn.querySelector('.status-icon');
        const textEl = myStatusBtn.querySelector('.status-text');
        if (iconEl) iconEl.textContent = state.currentUser?.name === 'Jožka' ? jStatusIcon : kStatusIcon;
        if (textEl) {
            textEl.textContent = state.currentUser?.name === 'Jožka' ? (joseProg.status === 'done' ? 'Umím' : (joseProg.status === 'started' ? 'Dělám' : 'Nic')) : (klarkaProg.status === 'done' ? 'Umím' : (klarkaProg.status === 'started' ? 'Dělám' : 'Nic'));
            textEl.className = `text-[9px] font-bold uppercase ${state.currentUser?.name === 'Jožka' ? jStatusClass : kStatusClass} truncate status-text`;
        }
    }

    // Update Partner Status
    const partnerStatusDiv = card.querySelector('.matura-partner-status-pill');
    if (partnerStatusDiv) {
        const iconEl = partnerStatusDiv.querySelector('.status-icon');
        const textEl = partnerStatusDiv.querySelector('.status-text');
        if (iconEl) iconEl.textContent = state.currentUser?.name === 'Jožka' ? kStatusIcon : jStatusIcon;
        if (textEl) {
            textEl.textContent = state.currentUser?.name === 'Jožka' ? (klarkaProg.status === 'done' ? 'Umím' : (klarkaProg.status === 'started' ? 'Dělám' : 'Nic')) : (joseProg.status === 'done' ? 'Umím' : (joseProg.status === 'started' ? 'Dělám' : 'Nic'));
            textEl.className = `text-[9px] font-bold uppercase ${state.currentUser?.name === 'Jožka' ? kStatusClass : jStatusClass} truncate status-text`;
        }
    }

    // Update Mastery & Read Progress bars if needed (Async)
    const [sr, pr] = await Promise.all([import('./spaced_repetition.js'), import('./progress.js')]);
    const mastery = await sr.getTopicMastery(itemId);
    const mTextEl = document.getElementById(`mastery-text-${itemId}`);
    const mBarEl = document.getElementById(`mastery-bar-${itemId}`);
    if (mTextEl && mBarEl) {
        mTextEl.textContent = `${mastery}%`;
        mBarEl.style.width = `${mastery}%`;
    }

    const stats = await pr.getTopicProgress(itemId);
    const rTextEl = document.getElementById(`read-text-${itemId}`);
    const rBarEl = document.getElementById(`read-bar-${itemId}`);
    if (rTextEl && rBarEl) {
        const { done, total } = stats;
        rTextEl.textContent = total > 0 ? `${done} / ${total} kapitol hotovo` : (done > 0 ? `${done} kapitol hotovo` : 'Zatím nečteno');
        rBarEl.style.width = `${total > 0 ? Math.round((done / total) * 100) : Math.min(100, done * 20)}%`;
    }

    // Update "Write" to "Show" if content was just saved
    if (item.has_content) {
        const actionBtn = card.querySelector('button[onclick*="openEditor"]');
        if (actionBtn) {
            actionBtn.setAttribute('onclick', `import('/js/modules/matura.js').then(m => m.openKnowledgeBase('${itemId}'))`);
            actionBtn.className = "flex-1 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] rounded-xl flex items-center justify-center gap-2 transition-all border border-[#5865F2]/30 group/btn shadow-lg";
            actionBtn.innerHTML = `<i class="fas fa-book-open text-xs group-hover/btn:scale-110 transition"></i><span class="text-[10px] font-black uppercase tracking-widest">Zobrazit</span>`;
        }
    }
}

export function triggerSOS() {
    triggerHaptic('heavy');
    const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárce' : 'Jožkovi';
    showNotification(`SOS SIGNÁL VYSLÁN! 🚨 ${partnerName} právě přišlo upozornění.`, 'error');

    // Broadcast to partner
    broadcastMaturaSOS();
    playBellSound();
}

// --- REAL-TIME LISTENERS ---

window.addEventListener('matura-sos-received', (e) => {
    const sender = e.detail.name;
    triggerHaptic('heavy');
    playBellSound();
    showNotification(`🚨 SOS OD: ${sender.toUpperCase()}! Potřebuje tvou pozornost/objetí/čokoládu!`, 'error');
});

function playBellSound() {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
        audio.volume = 0.5;
        audio.play();
    } catch (e) { console.warn("Bell sound failed", e); }
}

// --- POMODORO LOGIC ---

async function initPomodoro() {
    // 1. Fetch initial state from DB
    const { data } = await supabase.from('matura_pomodoro').select('*').eq('id', 'global').single();

    if (data) {
        updatePomodoroFromData(data);
    } else {
        // Create initial row if missing
        await supabase.from('matura_pomodoro').insert({ id: 'global', status: 'stopped', duration_minutes: 25 });
    }

    // 2. Setup listeners
    window.addEventListener('pomodoro-updated', (e) => {
        const data = e.detail.source === 'database' ? e.detail.payload : e.detail;
        if (data.type === 'schedule-sync') {
            // Fetch entire schedule to be safe
            supabase.from('matura_schedule').select('*').gte('scheduled_date', new Date().toISOString().split('T')[0])
                .then(({ data }) => {
                    if (data) {
                        state.maturaSchedule = data;
                        renderTodaysMissions();
                    }
                });
            return;
        }
        updatePomodoroFromData(data);
    });
}

function updatePomodoroFromData(data) {
    pomodoroState.status = data.status;

    if (data.status === 'running' && data.started_at) {
        const startedAt = new Date(data.started_at);
        const now = new Date();
        const elapsed = Math.floor((now - startedAt) / 1000);
        const total = data.duration_minutes * 60;
        pomodoroState.timeLeft = Math.max(0, total - elapsed);

        if (pomodoroState.timeLeft > 0) {
            startLocalTimer();
        } else {
            stopLocalTimer();
            pomodoroState.status = 'stopped';
        }
    } else {
        stopLocalTimer();
        pomodoroState.timeLeft = data.duration_minutes * 60;
    }

    updatePomodoroUI();
}

function startLocalTimer() {
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    pomodoroInterval = setInterval(() => {
        pomodoroState.timeLeft--;
        if (pomodoroState.timeLeft <= 0) {
            stopLocalTimer();
            pomodoroState.status = 'stopped';
            playBellSound();
            showNotification('STUDIUM DOKONČENO! 🧠 Skvělá práce, dej si pauzu.', 'success');
        }
        updatePomodoroUI();
    }, 1000);
}

function stopLocalTimer() {
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    pomodoroInterval = null;
}

export async function togglePomodoro() {
    const isRunning = pomodoroState.status === 'running';
    const nextStatus = isRunning ? 'stopped' : 'running';
    const nextStartedAt = nextStatus === 'running' ? new Date().toISOString() : null;

    const update = {
        id: 'global',
        status: nextStatus,
        started_at: nextStartedAt,
        duration_minutes: 25,
        last_updated_by: state.currentUser?.id,
        updated_at: new Date().toISOString()
    };

    // Update DB
    await supabase.from('matura_pomodoro').upsert(update);

    // Broadcast for instant effect
    broadcastPomodoroUpdate(update);
    updatePomodoroFromData(update);

    triggerHaptic(nextStatus === 'running' ? 'success' : 'medium');
}

function updatePomodoroUI() {
    const timerEl = document.getElementById('pomodoro-timer');
    const btnEl = document.getElementById('pomodoro-btn');
    const statusListEl = document.getElementById('pomodoro-status-list');

    if (timerEl) {
        const mins = Math.floor(pomodoroState.timeLeft / 60);
        const secs = pomodoroState.timeLeft % 60;
        timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (btnEl) {
        btnEl.textContent = pomodoroState.status === 'running' ? 'Stop 🛑' : 'Start 🧠';
        btnEl.className = pomodoroState.status === 'running'
            ? "bg-[#ed4245] hover:bg-[#c03537] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition active:scale-95"
            : "bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition active:scale-95";
    }

    if (statusListEl) {
        const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
        const partnerImg = state.currentUser?.name === 'Jožka' ? 'img/app/klarka_profilovka.webp' : 'img/app/jozka_profilovka.webp';
        const isStudying = pomodoroState.status === 'running';

        statusListEl.innerHTML = `
            <div class="flex-shrink-0 bg-white/5 px-4 py-2 rounded-full text-[10px] font-bold ${isStudying ? 'text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'text-gray-400'} uppercase tracking-widest flex items-center gap-2">
                <img src="${partnerImg}" class="w-4 h-4 rounded-full object-cover ${isStudying ? '' : 'grayscale opacity-50'}"> 
                ${partnerName} ${isStudying ? 'právě poctivě studuje... 🔥' : 'se teď fláká...'}
            </div>
            <div class="flex-shrink-0 bg-white/5 px-4 py-2 rounded-full text-[10px] font-bold ${isStudying ? 'text-[#eb459e] border border-[#eb459e]/20' : 'text-gray-400'} uppercase tracking-widest flex items-center gap-2">
                <img src="${state.currentUser?.name === 'Jožka' ? 'img/app/jozka_profilovka.webp' : 'img/app/klarka_profilovka.webp'}" class="w-4 h-4 rounded-full object-cover ${isStudying ? '' : 'grayscale opacity-50'}"> 
                Já ${isStudying ? 'makám na své budoucnosti! 🚀' : 'mám v plánu studovat.'}
            </div>
        `;
    }
}

// --- GAMIFICATION & PLANNER ---

export async function updateMaturaStreak() {
    if (!state.currentUser) return;

    const today = new Date().toISOString().split('T')[0];
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';

    try {
        const { data, error } = await supabase.from('matura_streaks').select('*').eq('user_id', state.currentUser.id).maybeSingle();

        let newStreak = 1;
        let lastDate = data?.last_study_date;

        if (data) {
            if (lastDate === today) return; // Už dnes studoval

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                newStreak = data.current_streak + 1;
            }
        }

        await supabase.from('matura_streaks').upsert({
            user_id: state.currentUser.id,
            current_streak: newStreak,
            max_streak: Math.max(newStreak, data?.max_streak || 0),
            last_study_date: today,
            updated_at: new Date().toISOString()
        });

        state.maturaStreaks[userKey] = newStreak;

        // Unlock Achievements
        if (newStreak === 3) import('./achievements.js').then(a => a.autoUnlock('matura_streak_3'));
        if (newStreak === 7) import('./achievements.js').then(a => a.autoUnlock('matura_streak_7'));

        showNotification(`🔥 STUDIJNÍ STREAK: ${newStreak} dní! Jen tak dál!`, 'success');
        triggerHaptic('success');
        triggerConfetti();

    } catch (e) {
        console.error("Streak error:", e);
    }
}

export function showScheduleMenu(itemId, btn) {
    const rect = btn.getBoundingClientRect();
    const menuHtml = `
        <div id="schedule-popover" class="fixed z-[1000] bg-[#222428] border border-white/10 rounded-xl shadow-2xl p-2 animate-fade-in w-44" 
             style="top: ${rect.top - 180}px; left: ${rect.left - 60}px;">
            <div class="text-[8px] font-black uppercase text-gray-500 mb-2 px-2">Naplánovat na</div>
            <button onclick="import('/js/modules/matura.js').then(m => m.scheduleTopic('${itemId}', 'today'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Dnes 🎯</button>
            <button onclick="import('/js/modules/matura.js').then(m => m.scheduleTopic('${itemId}', 'tomorrow'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Zítra 📅</button>
            <button onclick="import('/js/modules/matura.js').then(m => m.scheduleTopic('${itemId}', 'overmorrow'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Pozítří 🚀</button>
            <div class="h-px bg-white/5 my-1 mx-2"></div>
            <div class="px-2 pb-1">
                <input type="date" id="custom-schedule-date" 
                       class="w-full bg-black/40 text-[10px] text-white p-1 rounded-md border border-white/10 outline-none"
                       onchange="import('/js/modules/matura.js').then(m => m.scheduleTopic('${itemId}', this.value))">
            </div>
        </div>
    `;

    document.getElementById('schedule-popover')?.remove();
    document.body.insertAdjacentHTML('beforeend', menuHtml);

    const closeMenu = (e) => {
        if (!e.target.closest('#schedule-popover')) {
            document.getElementById('schedule-popover')?.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

export async function scheduleTopic(itemId, dateOption) {
    let dateStr;
    if (dateOption === 'today') {
        dateStr = new Date().toISOString().split('T')[0];
    } else if (dateOption === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        dateStr = d.toISOString().split('T')[0];
    } else if (dateOption === 'overmorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        dateStr = d.toISOString().split('T')[0];
    } else {
        dateStr = dateOption; // Assuming valid YYYY-MM-DD from input
    }

    try {
        const newMission = {
            user_id: state.currentUser.id,
            item_id: itemId,
            scheduled_date: dateStr
        };

        const { data, error } = await supabase.from('matura_schedule').insert(newMission).select();
        if (error) throw error;

        // Dynamic update
        if (data && data[0]) {
            state.maturaSchedule.push(data[0]);
            renderTodaysMissions(); // Update dashboard if open
            broadcastPomodoroUpdate({ type: 'schedule-sync' }); // Reuse broadcast for sync notification
        }

        showNotification(`Téma naplánováno na ${dateStr}! 🎯`, 'success');
        triggerHaptic('success');
    } catch (e) {
        showNotification("Už máš v té době jiný plán nebo toto téma naplánované!", 'warning');
    }

    document.getElementById('schedule-popover')?.remove();
}

function renderTodaysMissions() {
    const listEl = document.getElementById('todays-mission-list');
    if (!listEl) return;

    const today = new Date().toISOString().split('T')[0];
    const myMissions = state.maturaSchedule.filter(s => s.user_id === state.currentUser?.id && s.scheduled_date === today);

    if (myMissions.length === 0) {
        listEl.innerHTML = '<div class="text-gray-500 text-[10px] italic">Žádné plány na dnešek... Odpočívej! 💤</div>';
        return;
    }

    listEl.innerHTML = '';
    myMissions.forEach(m => {
        // Find item title from state.maturaTopics
        let item = null;
        if (state.maturaTopics) {
            for (const cat in state.maturaTopics) {
                const found = state.maturaTopics[cat].find(i => i.id === m.item_id);
                if (found) {
                    item = found;
                    break;
                }
            }
        }

        if (!item) return;

        const div = document.createElement('div');
        div.className = "bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3 group/mission hover:border-[#5865F2]/40 transition-all relative overflow-hidden";
        div.innerHTML = `
            <div class="text-xl group-hover/mission:scale-110 transition-transform">${item.icon}</div>
            <div class="flex-1 min-w-0">
                <div class="text-[9px] font-bold text-white truncate px-0.5">${item.title}</div>
                <div class="text-[8px] text-gray-500 uppercase font-black">Studijní cíl</div>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="import('/js/modules/matura.js').then(m => m.openKnowledgeBase('${item.id}'))" 
                        class="bg-[#5865F2]/20 text-[#5865F2] w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#5865F2]/40 transition tooltip" data-tip="Studovat">
                    <i class="fas fa-play text-[10px]"></i>
                </button>
                <button onclick="import('/js/modules/matura.js').then(m => m.removeMission('${m.id}'))" 
                        class="text-gray-600 hover:text-[#ed4245] w-6 h-8 flex items-center justify-center transition-colors tooltip" data-tip="Zrušit misi">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </div>
        `;
        listEl.appendChild(div);
    });
}

export async function removeMission(missionId) {
    if (!state.currentUser) return;

    try {
        const { error } = await supabase.from('matura_schedule').delete().eq('id', missionId);
        if (error) throw error;

        // Dynamic local update
        state.maturaSchedule = state.maturaSchedule.filter(m => m.id !== missionId);
        renderTodaysMissions();

        // Broadcast to partner
        broadcastPomodoroUpdate({ type: 'schedule-sync' });

        showNotification("Mise zrušena 🗑️", "info");
        triggerHaptic('light');
    } catch (e) {
        console.error("Remove mission error:", e);
        showNotification("Nepodařilo se smazat misi.", "error");
    }
}

export function openPDFViewer(url, title) {
    const modalHtml = `
        <div class="flex-1 w-full bg-black relative animate-fade-in">
            <iframe src="${url}" class="absolute inset-0 w-full h-full border-none" title="${title}"></iframe>
        </div>
        <div class="p-4 bg-black/40 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <p class="text-[10px] text-gray-500 uppercase tracking-widest font-black">Maturitní materiály 🎓</p>
                <a href="${url}" download class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2">
                    <i class="fas fa-download"></i> Stáhnout PDF
                </a>
            </div>
            <p class="text-[10px] text-gray-400 italic font-medium opacity-60">Problémy se zobrazením? Použijte Chrome nebo Stáhnout PDF.</p>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'pdf-modal',
        title: title,
        subtitle: 'Režim soustředěného čtení 📖',
        content: modalHtml,
        size: 'full',
        onClose: "document.getElementById('pdf-modal')?.remove()"
    }));
    document.getElementById('pdf-modal').classList.remove('hidden');
    document.getElementById('pdf-modal').classList.add('flex');
    triggerHaptic('medium');
}

export async function openKnowledgeBase(itemId) {
    let item = null;
    if (state.maturaTopics) {
        for (const cat in state.maturaTopics) {
            const found = state.maturaTopics[cat].find(i => i.id === itemId);
            if (found) {
                item = found;
                break;
            }
        }
    }

    if (!item) return;

    // Clean up previous instances
    document.querySelectorAll('[id^="kb-modal-"]').forEach(el => el.remove());
    document.getElementById('hl-popover')?.remove();

    if (window.showNotification) showNotification('Stahuji data z databáze...', 'info');

    let dbContent = '';
    try {
        // Use * to be resilient to schema differences
        const { data, error } = await supabase
            .from('matura_kb')
            .select('*')
            .eq('item_id', itemId)
            .maybeSingle();

        if (error) throw error;
        dbContent = data?.content || '';

        // --- BACKFILL sections_count IF MISSING ---
        if (data && (!data.sections_count || data.sections_count === 0) && dbContent) {
            const count = dbContent.split('\n').filter(l => l.trim().match(/^#{1,3}\s+.+$/)).length;
            if (count > 0) {
                console.log(`[Matura] Backfilling sections_count for ${itemId}: ${count}`);
                await supabase.from('matura_kb').update({ sections_count: count }).eq('item_id', itemId);
                // Update local state to reflect change immediately if card is re-rendered
                if (state.maturaKBContent[itemId]) state.maturaKBContent[itemId].sections_count = count;
                updateTopicCardUI(itemId);
            }
        }

        // Update Cache
        state.maturaKBContent[itemId] = {
            content: dbContent,
            updated_at: data?.updated_at || data?.created_at || new Date().toISOString()
        };
    } catch (e) {
        console.error("Supabase Matura fetch error:", e);
    }

    const isMobile = window.innerWidth < 768;
    const modalId = `kb-modal-${itemId}`;
    const actions = `
        <button onclick="import('/js/modules/matura.js').then(m => m.generateAITest('${itemId}'))" 
                class="bg-[#eb459e]/10 hover:bg-[#eb459e]/20 text-[#eb459e] border border-[#eb459e]/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg">
            <span class="animate-pulse">AI</span> Generovat test
        </button>
        <button onclick="import('/js/modules/matura.js').then(m => m.openEditor('${itemId}'))" 
                class="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition">
            <i class="fas fa-pencil-alt text-[8px]"></i> Upravit zápis
        </button>
    `;

    const formattedContent = dbContent ? formatMarkdown(dbContent) : '<p class="text-gray-500 italic">Zatím zde není žádný zápis. Klikni na Upravit a začni tvořit! ✍️</p>';
    const tocHtml = generateTOC(formattedContent, itemId);

    const modalContent = `
        <div class="flex flex-col md:flex-row h-full overflow-hidden bg-[var(--bg-tertiary)] relative">
            <!-- MAIN CONTENT AREA -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-12 matura-content-wrapper relative bg-[var(--bg-primary)]">
                <div id="kb-content-${itemId}" class="matura-content markdown-body prose prose-invert max-w-none min-h-[60vh]">
                    ${formattedContent}
                </div>
            </div>

            <!-- SIDEBAR (TOC/Highlights) -->
            ${isMobile ? `<div id="kb-sidebar-backdrop-${itemId}" class="fixed inset-0 z-[1010] bg-black/60 hidden opacity-0 transition-opacity duration-300 backdrop-blur-sm" onclick="import('/js/modules/matura.js').then(m => m.toggleMobileTOC('${itemId}'))"></div>` : ''}
            <div id="kb-sidebar-${itemId}" class="${isMobile ? 'fixed inset-x-0 bottom-0 top-auto z-[1011] translate-y-full max-h-[85vh] rounded-t-3xl border-t overscroll-contain' : 'w-80 border-l'} bg-[var(--bg-secondary)] border-white/5 flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar p-6 space-y-8 shadow-2xl transition-transform duration-300">
                <!-- Mobile Close Handle -->
                <div class="md:hidden sticky -top-6 bg-[var(--bg-secondary)] pt-6 pb-6 -mx-6 px-6 -mt-6 z-50 flex justify-center items-center border-b border-transparent cursor-pointer" onclick="import('/js/modules/matura.js').then(m => m.toggleMobileTOC('${itemId}'))">
                    <div class="w-16 h-1.5 rounded-full bg-white/20 pointer-events-none"></div>
                </div>
                
                <!-- Navigation (TOC) -->
                <div class="space-y-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-[#5865F2] flex items-center gap-2">
                        <i class="fas fa-list-ul"></i> Navigace
                    </h3>
                    <ul class="space-y-1 text-xs text-gray-400 font-medium">
                        ${tocHtml || '<li class="italic opacity-50 pl-2">Žádné sekce...</li>'}
                    </ul>
                </div>

                <!-- Key Points (Highlights) -->
                <div class="space-y-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-[#eb459e] flex items-center gap-2">
                        <i class="fas fa-star"></i> Klíčové body
                    </h3>
                    <ul id="kb-highlights-list" class="space-y-3 text-xs text-gray-400">
                        <li class="italic opacity-50 pl-3">Načítám body...</li>
                    </ul>
                </div>

                <!-- Meta/Legend -->
                <div class="pt-6 border-t border-white/5 space-y-4">
                    <div class="text-[8px] font-black uppercase text-gray-600 tracking-tighter">Legenda zvýraznění</div>
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-[#facc15]"></span> Důležité k pochopení
                        </div>
                        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-[#f87171]"></span> Nutno nabiflovat
                        </div>
                        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span> Již bezpečně ovládám
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile FAB for TOC -->
            ${isMobile ? `
                <button onclick="import('/js/modules/matura.js').then(m => m.toggleMobileTOC('${itemId}'))" 
                        class="fixed bottom-24 right-6 w-14 h-14 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-full shadow-2xl flex items-center justify-center z-[1000] animate-bounce-slow border-4 border-[var(--bg-primary)] scale-100 active:scale-95 transition-transform">
                    <i class="fas fa-list-ul text-xl"></i>
                </button>
            ` : ''}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: modalId,
        title: item.title,
        subtitle: `${item.cat || 'Maturita'} • ${item.author || 'Okruh'}`,
        content: modalContent,
        size: 'full',
        actions: actions,
        onClose: `import('/js/modules/matura.js').then(m => m.closeKnowledgeBase('${modalId}'))`
    }));

    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    triggerHaptic('medium');

    // INITIALIZE SPECIAL FEATURES
    // 0. Table Responsiveness (Data Labels for Mobile)
    initTableResponsiveness(itemId);

    // 1. Theme Toggle Injection
    const headerExtra = document.getElementById(`${modalId}-header-extra`);
    if (headerExtra) {
        headerExtra.innerHTML = `
            <button onclick="import('/js/modules/matura.js').then(m => m.toggleLocalTheme('${modalId}'))" 
                    class="p-2 rounded-full hover:bg-white/5 text-[var(--interactive-normal)] hover:text-[var(--text-header)] transition-all"
                    title="Přepnout téma okna">
                <i class="fas fa-sun block theme-dark:hidden"></i>
                <i class="fas fa-moon hidden theme-dark:block"></i>
            </button>
        `;
    }

    // 1. Chapters Checkboxes
    import('./progress.js').then(m => m.initProgress(modalId, itemId));

    // 2. Highlighting System
    import('./highlighter.js').then(m => {
        // Setup internal hook for highlighter to trigger re-renders
        window.refreshKBContent = (highlights, applyFn) => {
            const contentDiv = document.getElementById(`kb-content-${itemId}`);
            if (!contentDiv) return;

            // Re-render core markdown first to clean any messy spans
            contentDiv.innerHTML = formattedContent;

            // Re-apply chapter checkboxes
            import('./progress.js').then(pr => pr.mountCheckboxes(modalId));

            // Apply highlights
            highlights.forEach(hl => applyFn(contentDiv, hl));
        };
        m.initHighlighter(modalId, itemId);
    });
}

/**
 * Generates a clickable Table of Contents from HTML headings
 */
function generateTOC(html, itemId) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const headings = temp.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) return '';

    return Array.from(headings).map(h => {
        const level = h.tagName.toLowerCase();
        const text = h.textContent.trim();
        const slug = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        // Add ID to the original heading in the HTML if possible (will do in refactor if needed)
        // For now, TOC links rely on finding the same slug

        const indent = level === 'h1' ? 'pl-0 font-bold text-[var(--text-header)]' : (level === 'h2' ? 'pl-3 text-[var(--text-normal)]' : 'pl-6 opacity-60 text-[var(--text-muted)]');
        return `
            <li class="${indent} hover:text-[var(--blurple)] cursor-pointer transition py-2 md:py-0.5 truncate font-medium text-[11px]" 
                onclick="document.querySelectorAll('.matura-content h1, .matura-content h2, .matura-content h3').forEach(el => {
                    const elSlug = el.textContent.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                    if (elSlug === '${slug}') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                import('/js/modules/matura.js').then(m => {
                    const sb = document.getElementById('kb-sidebar-${itemId}');
                    if(sb && sb.classList.contains('translate-y-0')) m.toggleMobileTOC('${itemId}');
                });">
                ${text}
            </li>
        `;
    }).join('');
}

/**
 * Toggles the Table of Contents sidebar as a bottom sheet on mobile devices.
 */
export function toggleMobileTOC(itemId) {
    const sidebar = document.getElementById(`kb-sidebar-${itemId}`);
    const backdrop = document.getElementById(`kb-sidebar-backdrop-${itemId}`);
    if (!sidebar) return;

    const isShowing = sidebar.classList.contains('translate-y-0');
    if (isShowing) {
        sidebar.classList.remove('translate-y-0');
        sidebar.classList.add('translate-y-full');
        if (backdrop) {
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0');
            setTimeout(() => backdrop.classList.add('hidden'), 300);
        }
    } else {
        sidebar.classList.remove('translate-y-full');
        sidebar.classList.add('translate-y-0');
        sidebar.scrollTop = 0; // Fix scrolling issue
        if (backdrop) {
            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                backdrop.classList.add('opacity-100');
            }, 10);
        }
        triggerHaptic('light');
    }
}

/**
 * Switches between Write and Preview tabs in the mobile editor.
 */
export function switchEditorTab(tab) {
    const editorCol = document.getElementById('editor-col');
    const previewCol = document.getElementById('preview-col');
    const tabWrite = document.getElementById('tab-write');
    const tabPreview = document.getElementById('tab-preview');

    if (!editorCol || !previewCol || !tabWrite || !tabPreview) return;

    if (tab === 'write') {
        editorCol.classList.remove('hidden');
        previewCol.classList.add('hidden');
        previewCol.classList.remove('flex');

        tabWrite.className = 'flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-[#5865F2] bg-white/5 rounded-xl border border-[#5865F2]/30 transition-all';
        tabPreview.className = 'flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-300 transition-all';
    } else {
        editorCol.classList.add('hidden');
        previewCol.classList.remove('hidden');
        previewCol.classList.add('flex');

        tabPreview.className = 'flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-[#eb459e] bg-white/5 rounded-xl border border-[#eb459e]/30 transition-all';
        tabWrite.className = 'flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-300 transition-all';

        // Trigger Preview Update
        if (window.updateKBPreview) window.updateKBPreview();
    }
    triggerHaptic('light');
}

export async function openEditor(itemId, existingContent = null) {
    const isMobile = window.innerWidth < 768;
    // 1. Cleanup all existing Matura modals to prevent ID conflicts
    document.querySelectorAll('[id^="kb-modal-"]').forEach(el => el.remove());
    document.getElementById('edit-modal')?.remove();
    document.getElementById('hl-popover')?.remove();

    let currentContent = existingContent;
    let lastUpdatedAt = null;

    // 2. Check Cache if not passed directly
    if (currentContent === null && state.maturaKBContent[itemId]) {
        currentContent = state.maturaKBContent[itemId].content;
        lastUpdatedAt = state.maturaKBContent[itemId].updated_at;
    }

    // 3. Fallback to DB if still missing
    if (currentContent === null) {
        if (window.showNotification) showNotification('Načítám data pro editor...', 'info');
        const { data: kbData } = await supabase.from('matura_kb').select('*').eq('item_id', itemId).maybeSingle();
        currentContent = kbData?.content || '';
        lastUpdatedAt = kbData?.updated_at || kbData?.created_at;

        // Sync cache
        state.maturaKBContent[itemId] = { content: currentContent, updated_at: lastUpdatedAt };
    }

    // Check local draft
    const draft = localStorage.getItem('matura_draft_' + itemId);
    let initialContent = currentContent;
    if (draft && draft !== currentContent) {
        if (confirm("Obnovit neulozeny koncept?")) {
            initialContent = draft;
        }
    }

    const modalHtml = `
        <div class="flex-1 flex flex-col md:flex-row bg-[#1b1d20] relative h-full overflow-hidden">
            <!-- MOBILE TABS -->
            ${isMobile ? `
                <div class="flex bg-[#2f3136] border-b border-white/5 p-1 gap-1">
                    <button id="tab-write" onclick="import('/js/modules/matura.js').then(m => m.switchEditorTab('write'))" 
                            class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-[#5865F2] bg-white/5 rounded-xl border border-[#5865F2]/30 transition-all">
                        <i class="fas fa-pen-nib mr-2"></i> Psát
                    </button>
                    <button id="tab-preview" onclick="import('/js/modules/matura.js').then(m => m.switchEditorTab('preview'))" 
                            class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-all">
                        <i class="fas fa-eye mr-2"></i> Náhled
                    </button>
                </div>
            ` : ''}

            <!-- EDITOR COLUMN -->
            <div id="editor-col" class="flex-1 flex flex-col border-r border-white/5">
                <!-- Toolbar -->
                <div class="sticky top-0 z-50 bg-[#2f3136] border-b border-white/10 flex items-center gap-1 p-2 overflow-x-auto scrollbar-none shadow-lg">
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '# ', '')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition" title="Nadpis"><i class="fas fa-heading"></i></button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '**', '**')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition font-bold">B</button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '*', '*')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition italic">I</button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '- ', '')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition"><i class="fas fa-list-ul"></i></button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '\u0060\u0060\u0060\n', '\n\u0060\u0060\u0060')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition"><i class="fas fa-code"></i></button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '[', '](URL)')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition"><i class="fas fa-link"></i></button>
                    <div class="w-px h-6 bg-white/10 mx-1"></div>
                    <label class="w-10 h-10 flex items-center justify-center text-[#5865F2] hover:bg-white/5 rounded-lg transition cursor-pointer">
                        <i class="fas fa-image text-sm"></i>
                        <input type="file" accept="image/*" class="hidden" onchange="import('/js/modules/matura.js').then(m => m.handleImageUpload(this, '${itemId}'))">
                    </label>
                </div>
                
                
                <textarea id="textarea-kb" 
                    class="flex-1 w-full bg-transparent text-gray-200 p-6 md:p-8 outline-none text-base font-mono leading-relaxed resize-none custom-scrollbar"
                    oninput="window.updateKBPreview(); window.saveKBDraft('${itemId}')"
                    placeholder="Začni psát své zápisky v Markdownu..."></textarea>
            </div>

            <!-- PREVIEW COLUMN (Hidden on mobile by default) -->
            <div id="preview-col" class="hidden md:flex flex-1 flex-col bg-[#36393f] overflow-y-auto custom-scrollbar border-l border-black/20">
                <div class="bg-[#2f3136] border-b border-white/5 p-2 px-4 flex items-center justify-between">
                    <span class="text-[9px] font-black uppercase text-gray-500 tracking-widest">Živý náhled</span>
                    <span id="draft-status" class="text-[9px] font-bold text-gray-600 italic">V pořádku</span>
                </div>
                <div id="preview-kb" class="markdown-body p-8 prose prose-invert max-w-none">
                    <!-- Live rendered content -->
                </div>
            </div>

            <!-- Global Editor State -->
            <input type="hidden" id="kb-fetched-at" value="${lastUpdatedAt || ''}">
        </div>
        
        <!-- Action Bar -->
        <div class="p-4 bg-[var(--bg-tertiary)] border-t border-white/5 flex items-center justify-between gap-4">
             <button onclick="document.getElementById('edit-modal').remove()" class="text-gray-500 font-bold uppercase text-[10px] px-4 hover:text-white transition">Zrušit</button>
             <div class="flex items-center gap-3">
                 <span id="save-warning" class="hidden text-[#ed4245] text-[10px] font-bold animate-pulse">POZOR: Někdo jiný změnil tento zápis!</span>
                 <button onclick="import('/js/modules/matura.js').then(m => m.saveKBContent('${itemId}'))" 
                         class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest transition shadow-[0_0_20px_rgba(59,165,92,0.3)] active:scale-95">
                     Uložit zápis
                 </button>
             </div>
        </div>
    `;

    // Modal is already cleaned up above

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-modal',
        title: 'Editor zápisu',
        subtitle: 'Markdown & Real-time Preview ✍️',
        content: modalHtml,
        size: 'full',
        onClose: "document.getElementById('edit-modal')?.remove()"
    }));

    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');

    // Safely set initial content
    const textareaEl = document.getElementById('textarea-kb');
    if (textareaEl) {
        textareaEl.value = initialContent;

        // Add Keyboard Shortcuts
        textareaEl.addEventListener('keydown', (e) => {
            const isMod = e.ctrlKey || e.metaKey;
            const isAlt = e.altKey;

            // Bold: Ctrl+B
            if (isMod && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                window.insertAtCursor('textarea-kb', '**', '**');
            }
            // Italic: Ctrl+I
            else if (isMod && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                window.insertAtCursor('textarea-kb', '*', '*');
            }
            // Save: Ctrl+S or Ctrl+Enter
            else if (isMod && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
                e.preventDefault();
                import('/js/modules/matura.js').then(m => m.saveKBContent(itemId));
            }
            // Headings: Alt+1, Alt+2, Alt+3
            else if (isAlt && e.key === '1') {
                e.preventDefault();
                window.insertAtCursor('textarea-kb', '# ', '');
            }
            else if (isAlt && e.key === '2') {
                e.preventDefault();
                window.insertAtCursor('textarea-kb', '## ', '');
            }
            else if (isAlt && e.key === '3') {
                e.preventDefault();
                window.insertAtCursor('textarea-kb', '### ', '');
            }
        });
    }

    // Inject Preview & Helper logic
    window.updateKBPreview = () => {
        const txt = document.getElementById('textarea-kb');
        const pre = document.getElementById('preview-kb');
        if (txt && pre) pre.innerHTML = formatMarkdown(txt.value);
    };

    window.saveKBDraft = (id) => {
        const txt = document.getElementById('textarea-kb');
        if (txt) {
            localStorage.setItem(`matura_draft_${id}`, txt.value);
            const status = document.getElementById('draft-status');
            if (status) {
                status.textContent = "Koncept uložen " + new Date().toLocaleTimeString();
                status.classList.add('text-green-500');
            }
        }
    };

    window.insertAtCursor = (id, start, end) => {
        const txt = document.getElementById(id);
        if (!txt) return;

        const s = txt.selectionStart;
        const e = txt.selectionEnd;
        const val = txt.value;
        const selectedText = val.substring(s, e);
        const textToInsert = start + selectedText + end;

        // Try to use execCommand for better undo history and scroll preservation
        txt.focus();
        let success = false;
        try {
            success = document.execCommand('insertText', false, textToInsert);
        } catch (err) {
            success = false;
        }

        if (!success) {
            // Fallback for browsers that don't support insertText on textarea
            const scrollTop = txt.scrollTop;
            txt.value = val.substring(0, s) + textToInsert + val.substring(e);
            txt.focus();
            txt.scrollTop = scrollTop;
        }

        // Adjust selection if we wrapped something to keep the selection intact
        if (selectedText.length > 0) {
            txt.selectionStart = s + start.length;
            txt.selectionEnd = s + start.length + selectedText.length;
        } else {
            txt.selectionStart = txt.selectionEnd = s + start.length;
        }

        window.updateKBPreview();
        window.saveKBDraft(itemId);
    };

    // Initial render
    window.updateKBPreview();

    // Setup periodic concurrency check
    const checkInterval = setInterval(async () => {
        if (!document.getElementById('edit-modal')) {
            clearInterval(checkInterval);
            return;
        }
        const { data } = await supabase.from('matura_kb').select('updated_at').eq('item_id', itemId).maybeSingle();
        const serverUpdate = data?.updated_at;
        const localFetched = document.getElementById('kb-fetched-at')?.value;

        if (serverUpdate && localFetched && serverUpdate !== localFetched) {
            document.getElementById('save-warning')?.classList.remove('hidden');
            document.getElementById('save-warning').textContent = "⚠️ POZOR: Tento zápis byl změněn někým jiným!";
        }
    }, 5000);
}

export async function saveKBContent(itemId) {
    const textarea = document.getElementById('textarea-kb');
    if (!textarea) return;
    const content = textarea.value;

    try {
        // Concurrency Check (Safe check for updated_at)
        const { data: latest } = await supabase.from('matura_kb').select('*').eq('item_id', itemId).maybeSingle();
        const serverUpdate = latest?.updated_at || latest?.created_at;
        const localFetched = document.getElementById('kb-fetched-at')?.value || '';

        if (serverUpdate && localFetched && serverUpdate !== localFetched) {
            if (!confirm("Mezitím někdo jiný zápis změnil. Opravdu chceš své změny uložit a přepsat ty jeho?")) {
                return;
            }
        }

        const { data: result, error, offline } = await safeUpsert('matura_kb', {
            item_id: itemId,
            content: content,
            sections_count: content.split('\n').filter(l => l.trim().match(/^#{1,3}\s+.+$/)).length || 0,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;

        // Update topic flag & Cache
        if (offline) {
            // If offline, we still update local state immediately so UI feels fast
            state.maturaKBContent[itemId] = { content: content, updated_at: new Date().toISOString() };
            enqueueOperation('matura_topics', 'update', { id: itemId, has_content: true });

            showNotification('Uloženo lokálně (offline) 💾', 'info');
        } else {
            await supabase.from('matura_topics').update({ has_content: true }).eq('id', itemId);
            state.maturaKBContent[itemId] = { content: content, updated_at: new Date().toISOString() };
            showNotification('Zápis úspěšně uložen! 📚', 'success');
        }

        triggerHaptic('success');
        localStorage.removeItem(`matura_draft_${itemId}`);
        document.getElementById('edit-modal')?.remove();

        // REFRESH ONLY THE SPECIFIC CARD + DATA

        await refreshMaturaTopics();
        updateTopicCardUI(itemId);
    } catch (e) {
        console.error("Save Error:", e);
        showNotification('Chyba při ukládání: ' + (e.message || 'Zkontroluj připojení'), 'error');
    }
}

export async function handleImageUpload(input, itemId) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showNotification('Obrázek je příliš velký (max 5MB)', 'error');
        return;
    }

    const label = input.parentElement;
    const originalIcon = label.innerHTML;

    // UI Feedback
    label.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i>';
    label.style.pointerEvents = 'none';
    showNotification('Nahrávám obrázek...', 'info');

    try {
        // Use central storage helper with 'timeline-photos' bucket (confirmed in SQL) and 'matura' subfolder
        const publicUrl = await uploadFile('timeline-photos', file, 'matura');

        if (publicUrl) {
            window.insertAtCursor('textarea-kb', `\n![obrázek](${publicUrl})\n`, '');
            showNotification('Obrázek vložen! 🖼️', 'success');
            triggerHaptic('success');
        } else {
            throw new Error("Upload failed to return URL");
        }
    } catch (error) {
        console.error('Image upload error:', error);
        showNotification('Chyba při nahrávání obrázku. Zkontroluj připojení nebo Supabase bucket "timeline-photos".', 'error');
        triggerHaptic('heavy');
    } finally {
        label.innerHTML = originalIcon;
        label.style.pointerEvents = 'auto';
        input.value = ''; // Reset input
    }
}

export async function addNewTopic(categoryId) {
    const title = prompt("Název nového tématu:");
    if (!title) return;

    const id = categoryId.substring(0, 2) + Date.now().toString().slice(-6);
    const newTopic = {
        id,
        category_id: categoryId,
        title,
        icon: '📝',
        cat: 'Uživatel',
        has_content: false,
        flashcards: []
    };

    try {
        await supabase.from('matura_topics').insert(newTopic);
        await refreshMaturaTopics();
        renderMatura(state.currentChannel);
        showNotification('Téma přidáno! ✍️', 'success');
    } catch (e) {
        showNotification('Chyba při přidávání tématu.', 'error');
    }
}

function formatMarkdown(text) {
    if (!text) return '';

    // 1. Smart Table Fix & Cleanup
    let processedText = text;
    if (processedText.includes('|')) {
        const lines = processedText.split('\n');

        let inTable = false;
        let headerFound = false;

        const cleanedLines = lines.filter((l) => {
            const trimmed = l.trim();
            const isPipeLine = trimmed.includes('|');
            // A separator must contain at least one dash and only pipes/spaces/dashes
            const isSeparator = isPipeLine && trimmed.includes('-') && trimmed.replace(/[|\s-]/g, '').length === 0 && trimmed.length > 2;
            const isEmptyPipeLine = isPipeLine && !isSeparator && trimmed.replace(/[|\s]/g, '').length === 0;

            if (isPipeLine) {
                if (!inTable) {
                    inTable = true;
                    headerFound = false;
                    return true;
                }

                // Discard empty pipe lines that would break table structure (e.g. between header and separator)
                if (isEmptyPipeLine && !headerFound) return false;

                if (isSeparator) {
                    if (!headerFound) {
                        headerFound = true;
                        return true; // Keep first separator
                    }
                    return false; // Remove redundant separators
                }
                return true;
            } else {
                inTable = false;
                headerFound = false;
                return true;
            }
        });

        processedText = cleanedLines.join('\n');
    }

    // 2. Math preprocessing (protect math from marked using non-conflicting delimiters)
    const mathBlocks = [];

    if (window.katex) {
        // Multi-line math
        processedText = processedText.replace(/\$\$(.*?)\$\$/gs, (match, p1) => {
            const id = `@@@MATH_BLOCK_${mathBlocks.length}@@@`;
            try {
                mathBlocks.push({ id, html: `<div class="my-6 overflow-x-auto py-2 flex justify-center text-lg md:text-xl text-white shadow-inner bg-white/5 rounded-2xl border border-white/5 font-serif">${window.katex.renderToString(p1, { displayMode: true, throwOnError: false })}</div>` });
            } catch (e) {
                mathBlocks.push({ id, html: `<code class="text-red-400">${p1}</code>` });
            }
            return id;
        });

        // Inline math
        processedText = processedText.replace(/\$(.*?)\$/g, (match, p1) => {
            const id = `@@@MATH_INLINE_${mathBlocks.length}@@@`;
            try {
                mathBlocks.push({ id, html: `<span class="bg-white/5 px-2 py-0.5 rounded-md border border-white/5 mx-0.5 font-serif">${window.katex.renderToString(p1, { displayMode: false, throwOnError: false })}</span>` });
            } catch (e) {
                mathBlocks.push({ id, html: `<code class="text-xs text-red-400">${p1}</code>` });
            }
            return id;
        });
    }

    // 3. Marked.js configuration & parsing
    if (window.marked && typeof marked.parse === 'function') {
        const renderer = new marked.Renderer();
        const linkRenderer = renderer.link;
        renderer.link = (href, title, text) => {
            const html = linkRenderer.call(renderer, href, title, text);
            return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
        };

        marked.setOptions({
            renderer: renderer,
            highlight: function (code, lang) {
                if (window.hljs && lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return code;
            },
            breaks: true,
            gfm: true
        });

        processedText = marked.parse(processedText);
    } else {
        // Fallback for H1-H3 if marked fails to load (with nested bold/italic support)
        processedText = processedText
            .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-white mb-6 mt-8 italic uppercase tracking-tighter shadow-sm">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black text-white mb-4 mt-6 italic uppercase tracking-tighter border-b border-white/10 pb-2">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mb-2 mt-4">$1</h3>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
    }

    // 4. Math postprocessing (restore math blocks)
    mathBlocks.forEach(block => {
        // Use exact string replacement to avoid regex issues
        processedText = processedText.split(block.id).join(block.html);
    });

    return processedText;
}

/**
 * Responsive Tables Support
 */
function initTableResponsiveness(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    if (!container) return;

    container.querySelectorAll('table').forEach(table => {
        // Find headers
        let headers = [];
        const ths = table.querySelectorAll('thead th');
        if (ths.length > 0) {
            headers = Array.from(ths).map(th => th.textContent.trim());
        } else {
            // Fallback for tables without thead (marked usually generates it, though)
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                headers = Array.from(firstRow.querySelectorAll('td, th')).map(el => el.textContent.trim());
            }
        }

        // Apply data-labels to each cell
        table.querySelectorAll('tbody tr, tr').forEach(tr => {
            // If this is the header row, skip it
            if (tr.querySelector('th')) return;

            Array.from(tr.querySelectorAll('td')).forEach((td, i) => {
                if (headers[i]) {
                    td.setAttribute('data-label', headers[i]);
                }
            });
        });
    });
}

/**
 * AI GENERATION
 */
export async function generateAITest(itemId) {
    if (window.showNotification) showNotification('✨ AI analyzuje tvé zápisky...', 'info');

    try {
        const { data: kbData } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
        const content = kbData?.content || '';
        if (!content || content.length < 50) {
            if (window.showNotification) showNotification('Zápis je příliš krátký pro tvorbu testu.', 'warning');
            return;
        }

        let topic = null;
        if (state.maturaTopics) {
            for (const cat in state.maturaTopics) {
                const found = state.maturaTopics[cat].find(i => i.id === itemId);
                if (found) {
                    topic = found;
                    break;
                }
            }
        }

        const { AI } = await import('../core/ai_helper.js');
        const flashcards = await AI.generateFlashcards(topic?.title || 'Téma', content);

        if (flashcards && flashcards.length > 0) {
            const { error } = await supabase.from('matura_topics').update({
                flashcards: flashcards
            }).eq('id', itemId);

            if (error) throw error;

            // Re-sync local topics
            await refreshMaturaTopics();

            if (window.showNotification) showNotification(`✨ Test vygenerován! (${flashcards.length} otázek)`, 'success');
            if (window.triggerConfetti) window.triggerConfetti();
            triggerHaptic('success');
        }
    } catch (e) {
        console.error("AI Gen Error:", e);
        if (window.showNotification) {
            if (e.message.includes('API')) {
                showNotification('Pro AI testy musíš nastavit GEMINI_API_KEY v localStorage!', 'warning');
            } else {
                showNotification('Chyba při generování testu.', 'error');
            }
        }
    }
}

export function openNotes(itemId) {
    const prog = state.maturaProgress[itemId] || {};
    const user = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';
    const userProg = prog[user] || { notes: '' };
    const notes = userProg.notes || '';

    const modalHtml = `
        <div class="space-y-4">
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Moje soukromé poznámky a taháky</label>
            <textarea id="notes-textarea" 
                class="w-full h-48 bg-[#202225] text-white p-4 rounded-xl border border-white/5 outline-none focus:border-[#eb459e]/50 transition-all text-sm custom-scrollbar"
                placeholder="Sem si piš své klíčové body, citáty nebo cokoliv, co se ti hodí připomenout...">${notes}</textarea>
        </div>
    `;

    const actions = `
        <button onclick="import('/js/modules/matura.js').then(m => m.saveNotes('${itemId}'))"
                class="bg-[#eb459e] hover:bg-[#d83c8d] text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-lg active:scale-95">
            Uložit poznámky
        </button>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'notes-modal',
        title: 'Poznámky k tématu',
        subtitle: 'Společný whiteboard ✍️',
        content: modalHtml,
        actions: actions,
        onClose: "document.getElementById('notes-modal')?.remove()"
    }));
    document.getElementById('notes-modal').classList.remove('hidden');
    document.getElementById('notes-modal').classList.add('flex');
    triggerHaptic('light');
}

export async function saveNotes(itemId) {
    const val = document.getElementById('notes-textarea').value;
    const prog = state.maturaProgress[itemId] || {
        jose: { status: 'none', notes: '' },
        klarka: { status: 'none', notes: '' }
    };
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';

    // Update local state
    if (!prog[userKey]) prog[userKey] = { status: 'none', notes: '' };
    prog[userKey].notes = val;
    state.maturaProgress[itemId] = prog;

    try {
        await supabase.from('matura_topic_progress').upsert({
            item_id: itemId,
            user_id: state.currentUser?.id,
            status: prog[userKey].status, // Zachovat stávající status
            notes: val,
            updated_at: new Date().toISOString()
        });
        showNotification('Poznámky uloženy! ✅', 'success');
        triggerHaptic('success');
    } catch (e) {
        console.warn("[Matura] Supabase error, using local state.");
        showNotification('Uloženo lokálně! 📝', 'warning');
    }

    document.getElementById("notes-modal")?.remove();
}

/**
 * Silently updates the sections_count in the DB if it is missing.
 * Used during card rendering to ensure progress totals are eventually correct.
 */
export async function silentBackfillCount(itemId) {
    if (!itemId) return;

    try {
        const { data, error } = await supabase
            .from('matura_kb')
            .select('content, sections_count')
            .eq('item_id', itemId)
            .single();

        if (error || !data || !data.content) return;
        if (data.sections_count > 0) return; // Already has it

        const count = data.content.split('\n').filter(l => l.trim().match(/^#{1,3}\s+.+$/)).length;
        if (count > 0) {
            await supabase.from('matura_kb').update({ sections_count: count }).eq('item_id', itemId);
            updateTopicCardUI(itemId);
        }
    } catch (e) { }
}

