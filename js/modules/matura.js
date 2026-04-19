import { state, ensureMaturaData, refreshMaturaTopics } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { supabase } from '../core/supabase.js';
import { renderModal, renderInputGroup } from '../core/ui.js';
import { broadcastMaturaSOS, broadcastPomodoroUpdate } from '../core/sync.js';
import { initPomodoro, togglePomodoro } from './matura/pomodoro.js';
import { renderDashboard, handleMaturaSearch, renderTodaysMissions } from './matura/dashboard.js';
import { renderList } from './matura/list.js';
import { cycleStatus, updateTopicCardUI, triggerSOS, playBellSound } from './matura/actions.js';
import { safeInsert, safeUpsert, safeUpdate, enqueueOperation } from '../core/offline.js';
import { uploadFile } from '../core/storage.js';
import { getAssetUrl } from '../core/assets.js';


/**
 * Main entry point for Matura channels
 */
export async function renderMatura(channelId) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Load topics from DB if not already loaded (or refresh)
    if (channelId.startsWith('matura-')) {
        await ensureMaturaData(true);
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
    } else {
        el.classList.remove('theme-dark');
        el.classList.add('theme-light');
    }

    // Update Toggle Icon (Moon for Light Mode, Sun for Dark Mode)
    const icon = el.querySelector('.theme-toggle-icon');
    if (icon) {
        if (isLight) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            showNotification("Místní režim: Tmavý 🌙", "info");
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            showNotification("Místní režim: Světlý ☀️", "success");
        }
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





// --- POMODORO LOGIC (presunuto do ./matura/pomodoro.js) ---
// initPomodoro() a togglePomodoro() jsou importovany nahore
// pomodoroState je exportovan z ./matura/pomodoro.js

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
            <button onclick="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', 'today'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Dnes 🎯</button>
            <button onclick="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', 'tomorrow'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Zítra 📅</button>
            <button onclick="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', 'overmorrow'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Pozítří 🚀</button>
            <div class="h-px bg-white/5 my-1 mx-2"></div>
            <div class="px-2 pb-1">
                <input type="date" id="custom-schedule-date" 
                       class="w-full bg-black/40 text-[10px] text-white p-1 rounded-md border border-white/10 outline-none"
                       onchange="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', this.value))">
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
    // Close any existing KB modals first (ensures single modal experience for wikilinks)
    const existingModals = document.querySelectorAll('[id^="kb-modal-"]');
    existingModals.forEach(m => m.remove());

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

    // --- DYNAMIC LOAD DEPENDENCIES ---
    try {
        const { loadMarked, loadHighlightJS, loadKaTeX } = await import('../core/loader.js');
        await Promise.all([loadMarked(), loadHighlightJS(), loadKaTeX()]);
    } catch (e) {
        console.warn("[Matura] Failed to load some dependencies, using fallback parser.");
    }

    const isMobile = window.innerWidth < 768;
    const modalId = `kb-modal-${itemId}`;
    const quizExists = item.quizzes && item.quizzes.length > 0;
    const cardsExists = item.flashcards && item.flashcards.length > 0;
    const actions = `
        <div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full">
            <!-- Tests & Cards -->
            <div class="flex flex-wrap items-center gap-1 flex-1 sm:flex-none">
                <!-- QUIZ -->
                <div class="flex items-center gap-1 flex-1 sm:flex-none">
                    ${quizExists ? `
                        <button onclick="window.loadModule('quiz').then(m => m.openQuiz('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#48b4e0] hover:bg-[#3ba1cc] text-[#1b1d20] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(72,180,224,0.3)]">
                            <i class="fas fa-play text-[8px]"></i> <span>Cvičný test</span>
                        </button>
                        <button data-ai-action="quiz-${itemId}"
                                onclick="window.loadModule('matura').then(async m => { if(await window.showConfirmDialog('Chceš test vygenerovat znovu? Původní otázky budou smazány.', 'Ano', 'Zrušit')) m.generateAIQuiz('${itemId}'); })"
                                class="bg-white/5 hover:bg-white/10 text-gray-500 p-2.5 rounded-xl text-xs transition min-w-[40px] flex items-center justify-center border border-white/5" title="Vygenerovat test znovu">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    ` : `
                        <button data-ai-action="quiz-${itemId}"
                                onclick="window.loadModule('matura').then(m => m.generateAIQuiz('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#48b4e0]/10 hover:bg-[#48b4e0]/20 text-[#48b4e0] border border-[#48b4e0]/30 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition">
                            <i class="fas fa-file-alt text-[8px]"></i> Generovat test
                        </button>
                    `}
                </div>

                <!-- CARDS -->
                <div class="flex items-center gap-1 flex-1 sm:flex-none">
                    ${cardsExists ? `
                        <button onclick="window.loadModule('flashcards').then(m => m.openFlashcards('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#eb459e] hover:bg-[#d83c8d] text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(235,69,158,0.3)]">
                            <i class="fas fa-layer-group text-[8px]"></i> <span>Kartičky</span>
                        </button>
                        <button data-ai-action="cards-${itemId}"
                                onclick="window.loadModule('matura').then(async m => { if(await window.showConfirmDialog('Chceš kartičky vygenerovat znovu?', 'Ano', 'Zrušit')) m.generateAITest('${itemId}'); })"
                                class="bg-white/5 hover:bg-white/10 text-gray-500 p-2.5 rounded-xl text-xs transition min-w-[40px] flex items-center justify-center border border-white/5" title="Vygenerovat kartičky znovu">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    ` : `
                        <button data-ai-action="cards-${itemId}"
                                onclick="window.loadModule('matura').then(m => m.generateAITest('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#eb459e]/10 hover:bg-[#eb459e]/20 text-[#eb459e] border border-[#eb459e]/30 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition">
                            <i class="fas fa-magic text-[8px]"></i> Generovat kartičky
                        </button>
                    `}
                </div>
            </div>

            <!-- ADMIN ACTIONS -->
            <div class="flex items-center gap-1 pt-2 sm:pt-0 sm:ml-auto border-t border-white/5 sm:border-0 grow sm:grow-0 overflow-x-auto no-scrollbar">
                <button onclick="window.loadModule('matura').then(m => m.openEditor('${itemId}'))" 
                        class="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition border border-white/5">
                    <i class="fas fa-pencil-alt text-[8px]"></i> <span class="hidden sm:inline">Upravit</span>
                </button>
                <button onclick="window.loadModule('matura').then(m => m.openNotes('${itemId}'))" 
                        class="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition border border-white/5">
                    <i class="fas fa-sticky-note text-[8px]"></i> <span class="hidden sm:inline">Poznámky</span>
                </button>
                <button onclick="window.loadModule('matura').then(m => m.openGeminiSettings())" 
                        class="bg-white/5 hover:bg-white/10 text-gray-500 border border-white/10 px-3 py-2 rounded-xl text-[10px] transition shrink-0" title="Nastavení Gemini API">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        </div>
    `;

    const formattedContent = dbContent ? formatMarkdown(dbContent) : '<p class="text-gray-500 italic">Zatím zde není žádný zápis. Klikni na Upravit a začni tvořit! ✍️</p>';
    const tocHtml = generateTOC(formattedContent, itemId);

    const modalContent = `
        <div class="flex flex-col md:flex-row h-full overflow-hidden bg-[var(--bg-tertiary)] relative">
            <!-- MAIN CONTENT AREA -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-12 matura-content-wrapper relative bg-[var(--bg-primary)]">
                <div id="kb-content-${itemId}" class="matura-content markdown-body max-w-none min-h-[60vh]">
                    ${formattedContent}
                </div>
            </div>

            <!-- SIDEBAR (TOC/Highlights) -->
            ${isMobile ? `<div id="kb-sidebar-backdrop-${itemId}" class="fixed inset-0 z-[1010] bg-black/60 hidden opacity-0 transition-opacity duration-300 backdrop-blur-sm" onclick="window.loadModule('matura').then(m => m.toggleMobileTOC('${itemId}'))"></div>` : ''}
            <div id="kb-sidebar-${itemId}" class="${isMobile ? 'fixed inset-x-0 bottom-0 top-auto z-[1011] translate-y-full max-h-[85vh] rounded-t-3xl border-t overscroll-contain' : 'w-80 border-l'} bg-[var(--bg-secondary)] border-white/5 flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar p-6 space-y-8 shadow-2xl transition-transform duration-300">
                <!-- Mobile Close Handle -->
                <div class="md:hidden sticky -top-6 bg-[var(--bg-secondary)] pt-6 pb-6 -mx-6 px-6 -mt-6 z-50 flex justify-center items-center border-b border-transparent cursor-pointer" onclick="window.loadModule('matura').then(m => m.toggleMobileTOC('${itemId}'))">
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
                <button onclick="window.loadModule('matura').then(m => m.toggleMobileTOC('${itemId}'))" 
                        class="fixed bottom-32 right-6 w-14 h-14 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-full shadow-2xl flex items-center justify-center z-[1000] animate-bounce-slow border-4 border-[var(--bg-primary)] scale-100 active:scale-95 transition-transform">
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
        onClose: `window.loadModule('matura').then(m => m.closeKnowledgeBase('${modalId}'))`
    }));

    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    triggerHaptic('medium');

    // INITIALIZE SPECIAL FEATURES
    // 0. Chapters Checkboxes (Previously also had table responsiveness here)

    // 1. Theme Toggle & Collapse Injections
    const headerExtra = document.getElementById(`${modalId}-header-extra`);
    if (headerExtra) {
        headerExtra.innerHTML = `
            <div class="flex items-center gap-2">
                <button onclick="window.loadModule('matura').then(m => m.toggleAllSections('${itemId}'))" 
                        class="matura-collapse-all-btn"
                        id="btn-toggle-all-${itemId}"
                        title="Sbalit/Rozbalit vše">
                    Sbalit vše
                </button>
                <button onclick="window.loadModule('matura').then(m => m.toggleLocalTheme('${modalId}'))" 
                        class="p-2 rounded-full hover:bg-white/5 text-[var(--interactive-normal)] hover:text-[var(--text-header)] transition-all"
                        title="Přepnout téma okna">
                    <i class="fas fa-sun theme-toggle-icon"></i>
                </button>
            </div>
        `;
    }

    // 1.5. Collapsible Sections Logic
    applyCollapsibleSections(itemId);

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

            // Re-apply collapsible logic
            applyCollapsibleSections(itemId);

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
                window.loadModule('matura').then(m => {
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
        if (await window.showConfirmDialog("Už máš rozdělanou práci! Obnovit neuložený koncept?", "Obnovit", "Zahasit")) {
            initialContent = draft;
        }
    }

    const modalHtml = `
        <div class="flex-1 flex flex-col md:flex-row bg-[#1b1d20] relative h-full overflow-hidden">
            <!-- MOBILE TABS -->
            ${isMobile ? `
                <div class="flex bg-[#2f3136] border-b border-white/5 p-1 gap-1">
                    <button id="tab-write" onclick="window.loadModule('matura').then(m => m.switchEditorTab('write'))" 
                            class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-[#5865F2] bg-white/5 rounded-xl border border-[#5865F2]/30 transition-all">
                        <i class="fas fa-pen-nib mr-2"></i> Psát
                    </button>
                    <button id="tab-preview" onclick="window.loadModule('matura').then(m => m.switchEditorTab('preview'))" 
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
                        <input type="file" accept="image/*" class="hidden" onchange="window.loadModule('matura').then(m => m.handleImageUpload(this, '${itemId}'))">
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
                 <button onclick="window.loadModule('matura').then(m => m.saveKBContent('${itemId}'))" 
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

        // Attach paste listener via JS (more reliable than inline)
        requestAnimationFrame(() => {
            const textarea = document.getElementById('textarea-kb');
            if (textarea) {
                textarea.addEventListener('paste', (e) => handleKBEditorPaste(e, itemId));
            }
        });

        // Handle Keyboard Shortcuts
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
                window.loadModule('matura').then(m => m.saveKBContent(itemId));
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
            if (await window.showConfirmDialog("⚠️ POZOR: Někdo jiný tento zápis změnil! Pokud ho teď uložíš, přemažeš jeho změny. Chceš to opravdu udělat?", "Ano, přemazat", "Zrušit")) {
                // Continue
            } else {
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
    
    const label = input.parentElement;
    await uploadAndInsertImage(file, itemId, label);
    input.value = ''; // Reset input
}

/**
 * Handles paste event in the KB Editor to support image pasting from clipboard
 */
export async function handleKBEditorPaste(event, itemId) {
    const cb = (event.clipboardData || window.clipboardData);
    if (!cb) return;

    // If there is string data (text), we prefer the text paste (default behavior)
    // Most apps that put both text and image (like Word/Chrome) do so for formatting,
    // but users usually want the text in a markdown editor.
    const hasText = cb.getData('text/plain').length > 0;
    
    // Check for images
    const items = cb.items;
    for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            if (file) {
                // If we also have text, we ONLY upload if it's a "real" file (not just a clipboard buffer from an app)
                // But generally, if there is text, we let the default paste happen.
                if (hasText) {
                    console.log("[Matura] Text and Image both present, preferring text.");
                    return; 
                }

                // Prevent default paste if we only found an image
                event.preventDefault();
                console.log("[Matura] Image detected in clipboard (no text), uploading...", file.name);
                await uploadAndInsertImage(file, itemId);
            }
        }
    }
}

/**
 * Common logic for uploading an image and inserting markdown link at cursor
 * @param {File} file 
 * @param {string} itemId 
 * @param {HTMLElement} feedbackElement Optional element to show loading spinner on
 */
export async function uploadAndInsertImage(file, itemId, feedbackElement = null) {
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Obrázek je příliš velký (max 5MB)', 'error');
        return;
    }

    let originalContent = '';
    if (feedbackElement) {
        originalContent = feedbackElement.innerHTML;
        feedbackElement.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i>';
        feedbackElement.style.pointerEvents = 'none';
    }

    showNotification('Nahrávám obrázek...', 'info');

    try {
        const publicUrl = await uploadFile('timeline-photos', file, 'matura');

        if (publicUrl) {
            window.insertAtCursor('textarea-kb', `\n![obrázek](${publicUrl})\n`, '');
            showNotification('Obrázek vložen! 🖼️', 'success');
            triggerHaptic('success');
            
            // Trigger preview update
            if (window.updateKBPreview) window.updateKBPreview();
        } else {
            throw new Error("Upload failed to return URL");
        }
    } catch (error) {
        console.error('Image upload error:', error);
        showNotification('Chyba při nahrávání obrázku. Zkontroluj připojení nebo bucket.', 'error');
        triggerHaptic('heavy');
    } finally {
        if (feedbackElement) {
            feedbackElement.innerHTML = originalContent;
            feedbackElement.style.pointerEvents = 'auto';
        }
    }
}

export async function addNewTopic(categoryId) {
    const title = await window.showPromptDialog("Název nového tématu:");
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

    // 0. Standardize newlines (normalize \r\n to \n)
    let processedText = text.replace(/\r\n/g, '\n');

    // WIKILINKS Implementation: [[Topic Name]]
    const topicMap = {};
    Object.values(state.maturaTopics || {}).flat().forEach(t => {
        topicMap[t.title.toLowerCase()] = t.id;
    });

    processedText = processedText.replace(/\[\[(.*?)\]\]/g, (match, title) => {
        const foundId = topicMap[title.toLowerCase()];
        if (foundId) {
            return `<span class="matura-wikilink" onclick="window.loadModule('matura').then(m => m.openKnowledgeBase('${foundId}'))">${title}</span>`;
        }
        return `<span class="text-[var(--text-muted)] italic opacity-60" title="Téma nenalezeno">[[${title}]]</span>`;
    });

    // 1. Math preprocessing (Do this BEFORE any other processing to protect formulas)
    const mathBlocks = [];
    if (window.katex) {
        // Multi-line math
        processedText = processedText.replace(/\$\$(.*?)\$\$/gs, (match, p1) => {
            const id = `@@@MATH_BLOCK_${mathBlocks.length}@@@`;
            try {
                mathBlocks.push({ id, html: `<div class="my-6 overflow-x-auto py-4 flex justify-center text-lg md:text-xl text-white shadow-inner bg-white/5 rounded-2xl border border-white/5 font-serif">${window.katex.renderToString(p1.trim(), { displayMode: true, throwOnError: false })}</div>` });
            } catch (e) {
                mathBlocks.push({ id, html: `<code class="text-red-400">$${p1}$</code>` });
            }
            return id;
        });

        // Inline math
        processedText = processedText.replace(/\$([^\$]+?)\$/g, (match, p1) => {
            const id = `@@@MATH_INLINE_${mathBlocks.length}@@@`;
            try {
                mathBlocks.push({ id, html: `<span class="bg-white/5 px-2 py-0.5 rounded-md border border-white/5 mx-0.5 font-serif">${window.katex.renderToString(p1, { displayMode: false, throwOnError: false })}</span>` });
            } catch (e) {
                mathBlocks.push({ id, html: `<code class="text-xs text-red-400">$${p1}$</code>` });
            }
            return id;
        });
    }

    // 3. Marked.js configuration & parsing
    let parser = null;
    if (typeof marked !== 'undefined') {
        parser = marked.parse || (typeof marked === 'function' ? marked : null);
    }
    
    if (parser) {
        const renderer = (marked.Renderer) ? new marked.Renderer() : null;
        if (renderer) {
            const linkRenderer = renderer.link;
            renderer.link = (href, title, text) => {
                const html = linkRenderer.call(renderer, href, title, text);
                return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
            };
        }

        if (marked.setOptions) {
            marked.setOptions({
                renderer: renderer,
                highlight: function (code, lang) {
                    if (window.hljs && lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return code;
                },
                breaks: false,
                gfm: true
            });
        }
        processedText = (typeof parser === 'function') ? parser(processedText) : marked.parse(processedText);
    } else {
        // BETTER FALLBACK: Handle headers, lists, and basic formatting without destructive <br> tags
        processedText = processedText
            .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-white mb-6 mt-8 italic uppercase tracking-tighter shadow-sm">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black text-white mb-4 mt-6 italic uppercase tracking-tighter border-b border-white/10 pb-2">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mb-2 mt-4">$1</h3>')
            .replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\b_(.*?)_\b/g, '<em>$1</em>') // Support _italic_
            .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Support *italic*
            
        // Simple paragraph wrapping
        processedText = processedText.split('\n\n').map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            // Don't wrap if it's already an HTML block or contains a protected math token
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<div') || trimmed.includes('@@@MATH_')) return block;
            return `<p class="mb-4">${block.replace(/\n/g, ' ')}</p>`;
        }).join('\n');
    }

    // 4. Math postprocessing
    mathBlocks.forEach(block => {
        // Use exact string replacement to avoid regex issues
        processedText = processedText.split(block.id).join(block.html);
    });

    return processedText;
}


const checkApiKey = async (isRetry = false) => {
    let key = localStorage.getItem('GEMINI_API_KEY');
    const isValid = key && key.trim().length > 15 && key !== 'undefined' && key !== 'null';
    
    if (!isValid || isRetry) {
        const msg = isRetry 
            ? "Bohužel, zadaný API klíč je neplatný. Vlož prosím správný klíč (případně ho získej zdarma na aistudio.google.com):"
            : "Pro generování AI testů potřebuješ Gemini API klíč. Zkopíruj ho sem (získáš ho zdarma na aistudio.google.com):";
        
        const newKey = await window.showPromptDialog(msg);
        if (newKey && newKey.trim().length > 15) {
            localStorage.setItem('GEMINI_API_KEY', newKey.trim());
            return true;
        }
        return false;
    }
    return true;
};

export async function openGeminiSettings() {
    let currentKey = localStorage.getItem('GEMINI_API_KEY') || '';
    const maskedKey = currentKey && currentKey.length > 8 ? currentKey.substring(0, 4) + '...' + currentKey.substring(currentKey.length - 4) : 'Žádný klíč';
    
    const newKey = await window.showPromptDialog(`Aktuální Gemini API klíč: ${maskedKey}\n\nVlož nový klíč nebo nech prázdné pro smazání (klíč získáš na aistudio.google.com):`, currentKey);
    
    if (newKey !== null) {
        if (newKey.trim() === '') {
            localStorage.removeItem('GEMINI_API_KEY');
            if (window.showNotification) showNotification('API klíč byl smazán.', 'info');
        } else {
            localStorage.setItem('GEMINI_API_KEY', newKey.trim());
            if (window.showNotification) showNotification('API klíč byl úspěšně uložen! ✅', 'success');
        }
    }
}

/**
 * Locks / unlocks all buttons sharing a data-ai-action attribute.
 */
function _lockAIButtons(action, locked) {
    document.querySelectorAll(`[data-ai-action="${action}"]`).forEach(b => {
        b.disabled = locked;
        if (locked) {
            b.classList.add('opacity-50', 'cursor-wait');
        } else {
            b.classList.remove('opacity-50', 'cursor-wait');
        }
    });
}

/**
 * AI GENERATION - STUDY CARDS
 */
export async function generateAITest(itemId) {
    if (!(await checkApiKey())) return;

    _lockAIButtons(`cards-${itemId}`, true);

    const prog = window.showProgress ? window.showProgress('AI připravuje studijní kartičky (15-20 ks)...') : null;
    let progressVal = 10;
    const interval = setInterval(() => {
        if (progressVal < 95) {
            progressVal += (95 - progressVal) * 0.1;
            if (prog) prog.setProgress(progressVal);
        }
    }, 1000);

    try {
        const { data: kbData } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
        const content = kbData?.content || '';
        if (!content || content.length < 50) {
            clearInterval(interval);
            if (prog) prog.close();
            showNotification('Zápis je příliš krátký pro tvorbu kartiček.', 'warning');
            return;
        }

        let topicTitle = 'Téma';
        if (state.maturaTopics) {
            for (const cat in state.maturaTopics) {
                const found = state.maturaTopics[cat].find(i => i.id === itemId);
                if (found) { topicTitle = found.title; break; }
            }
        }

        const { AI } = await import('../core/ai_helper.js');
        const flashcards = await AI.generateFlashcards(topicTitle, content);

        clearInterval(interval);
        if (prog) {
            prog.setProgress(100);
            prog.setMessage('Kartičky hotovy! 🃏 Ukládám...');
        }

        if (flashcards && flashcards.length > 0) {
            const { error } = await supabase.from('matura_topics').update({ flashcards }).eq('id', itemId);
            if (error) throw error;

            await refreshMaturaTopics();
            if (window.triggerConfetti) window.triggerConfetti();
            triggerHaptic('success');
            updateTopicCardUI(itemId);
            showNotification(`Kartičky jsou připraveny! 🃏 (${flashcards.length} ks) Klikni na tlačítko níže.`, 'success');

            setTimeout(() => { if (prog) prog.close(); }, 1000);
        }
    } catch (e) {
        clearInterval(interval);
        if (prog) prog.close();
        handleAIGenError(e);
    } finally {
        _lockAIButtons(`cards-${itemId}`, false);
    }
}

function handleAIGenError(e) {
    console.error("AI Gen Error:", e);

    if (e.message === 'API_KEY_MISSING') {
        showNotification('Chybí Gemini API klíč! Klikni na ⚙️ a vlož ho.', 'error');
        checkApiKey(false);
    } else if (e.message === 'API_KEY_INVALID') {
        showNotification('Gemini API klíč je neplatný. Vlož prosím správný klíč.', 'error');
        checkApiKey(true);
    } else if (e.message === 'API_LIMIT_REACHED') {
        showNotification('⏳ AI limit vyčerpán — systém to zkusil 5× a nepodařilo se. Zkus to prosím za chvíli.', 'warning');
    } else if (e.message === 'AI_PARSING_ERROR') {
        showNotification('AI vrátila neúplnou odpověď. Zkus téma trochu zkrátit nebo zkus znovu.', 'error');
    } else if (e.message === 'AI_EMPTY_RESPONSE') {
        showNotification('AI nevrátila žádná data. Ověř obsah zápisku a zkus znovu.', 'error');
    } else {
        showNotification(`Nepodařilo se vygenerovat data. ${e.message || 'Zkontroluj připojení.'}`, 'error');
    }
}

/**
 * AI GENERATION - MCQ QUIZ
 */
export async function generateAIQuiz(itemId) {
    if (!(await checkApiKey())) return;

    _lockAIButtons(`quiz-${itemId}`, true);

    const prog = window.showProgress ? window.showProgress('AI připravuje test (15-20 otázek)...') : null;
    let progressVal = 5;
    const interval = setInterval(() => {
        if (progressVal < 92) {
            progressVal += (92 - progressVal) * 0.12;
            if (prog) prog.setProgress(progressVal);
        }
    }, 1000);

    try {
        const { data: kbData } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
        const content = kbData?.content || '';

        if (!content || content.length < 50) {
            clearInterval(interval);
            if (prog) prog.close();
            showNotification('Zápis je příliš krátký pro tvorbu testu.', 'warning');
            return;
        }

        let topicTitle = 'Téma';
        if (state.maturaTopics) {
            for (const cat in state.maturaTopics) {
                const found = state.maturaTopics[cat].find(i => i.id === itemId);
                if (found) { topicTitle = found.title; break; }
            }
        }

        const { AI } = await import('../core/ai_helper.js');
        const quiz = await AI.generateQuiz(topicTitle, content);

        clearInterval(interval);
        if (prog) {
            prog.setProgress(100);
            prog.setMessage('Test připraven! 🎉 Ukládám...');
        }

        if (quiz && quiz.length > 0) {
            const { error } = await supabase.from('matura_topics').update({ quizzes: quiz }).eq('id', itemId);
            if (error) throw error;

            await refreshMaturaTopics();
            updateTopicCardUI(itemId);

            if (window.triggerConfetti) window.triggerConfetti();
            triggerHaptic('success');

            // Show notification instead of auto-opening (avoids timing race condition)
            showNotification(`Test je připraven! ✅ (${quiz.length} otázek) Klikni na "Cvičný test" pro spuštění.`, 'success');
            setTimeout(() => { if (prog) prog.close(); }, 1500);
        }
    } catch (e) {
        clearInterval(interval);
        if (prog) prog.close();
        console.error("AI Quiz Gen Error:", e);
        handleAIGenError(e);
    } finally {
        _lockAIButtons(`quiz-${itemId}`, false);
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
        <button onclick="window.loadModule('matura').then(m => m.saveNotes('${itemId}'))"
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

/**
 * Post-processes rendered Markdown to make H2 and H3 sections collapsible.
 */
export function applyCollapsibleSections(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    if (!container) return;

    // Select all H2 and H3 headers
    const headers = container.querySelectorAll('h2, h3');
    
    headers.forEach(header => {
        // Prepare header
        header.classList.add('matura-collapsible-header');
        
        // Create content wrapper (Grid container)
        const wrapper = document.createElement('div');
        wrapper.className = 'matura-collapsible-content';
        
        // Create inner content (Grid child)
        const inner = document.createElement('div');
        inner.className = 'matura-collapsible-inner';
        
        // Identify which elements belong to this header
        // We move siblings into the inner wrapper until we hit another header of same level or higher
        const level = parseInt(header.tagName.substring(1));
        
        let next = header.nextElementSibling;
        while (next && !['H1', 'H2', 'H3'].includes(next.tagName)) {
            if (level === 3 && next.tagName === 'H2') break;
            
            const current = next;
            next = next.nextElementSibling;
            inner.appendChild(current);
        }
        
        // Assemble
        wrapper.appendChild(inner);
        header.parentNode.insertBefore(wrapper, next);
        
        // Click handler
        header.onclick = (e) => {
            // Don't toggle if we clicked a link inside the header (unlikely but safe)
            if (e.target.tagName === 'A') return;
            
            header.classList.toggle('collapsed');
            wrapper.classList.toggle('collapsed');
            triggerHaptic('light');
            
            // Update "Collapse All" button text if needed
            updateCollapseAllButtonText(itemId);
        };
    });
}

/**
 * Toggles all collapsible sections within a knowledge base item.
 */
export function toggleAllSections(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    if (!container) return;

    const headers = container.querySelectorAll('.matura-collapsible-header');
    const contents = container.querySelectorAll('.matura-collapsible-content');
    
    // Determine target state (if any are expanded, we collapse all)
    const anyExpanded = Array.from(contents).some(c => !c.classList.contains('collapsed'));
    
    headers.forEach(h => {
        if (anyExpanded) h.classList.add('collapsed');
        else h.classList.remove('collapsed');
    });
    
    contents.forEach(c => {
        if (anyExpanded) c.classList.add('collapsed');
        else c.classList.remove('collapsed');
    });

    updateCollapseAllButtonText(itemId);
    triggerHaptic('medium');
}

export function updateCollapseAllButtonText(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    const btn = document.getElementById(`btn-toggle-all-${itemId}`);
    if (!container || !btn) return;

    const anyExpanded = Array.from(container.querySelectorAll('.matura-collapsible-content'))
                             .some(c => !c.classList.contains('collapsed'));
    
    btn.textContent = anyExpanded ? 'Sbalit vše' : 'Rozbalit vše';
}

/**
 * Metadata Editor for Matura Topics
 */
export async function openTopicEditor(itemId) {
    let item = null;
    for (const cat in state.maturaTopics) {
        item = state.maturaTopics[cat].find(i => i.id === itemId);
        if (item) break;
    }
    if (!item) return;

    const modalHtml = `
        <div class="space-y-4">
            ${renderInputGroup({
                label: 'Ikona (Emoji)',
                id: 'edit-topic-icon',
                value: item.icon || '📓',
                placeholder: 'Vlož emoji...'
            })}
            ${renderInputGroup({
                label: 'Název tématu',
                id: 'edit-topic-title',
                value: item.title,
                placeholder: 'Zadej název...'
            })}
            ${renderInputGroup({
                label: 'Podkategorie / Předmět',
                id: 'edit-topic-cat',
                value: item.cat || '',
                placeholder: 'např. Renesance, Hardware...'
            })}
            ${renderInputGroup({
                label: 'Autor / Podtitul',
                id: 'edit-topic-author',
                value: item.author || '',
                placeholder: 'např. William Shakespeare...'
            })}
        </div>
    `;

    const actions = `
        <button onclick="window.loadModule('matura').then(m => m.saveTopicMetadata('${itemId}'))"
                class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-lg active:scale-95">
            Uložit změny
        </button>
        <button onclick="document.getElementById('topic-edit-modal').remove()"
                class="text-gray-500 hover:text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition">
            Zrušit
        </button>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'topic-edit-modal',
        title: 'Upravit informace o tématu',
        subtitle: 'Změny se projeví u obou uživatelů 👥',
        content: modalHtml,
        actions: actions,
        onClose: "document.getElementById('topic-edit-modal')?.remove()"
    }));
    
    document.getElementById('topic-edit-modal').classList.remove('hidden');
    document.getElementById('topic-edit-modal').classList.add('flex');
    triggerHaptic('light');
}

export async function saveTopicMetadata(itemId) {
    const icon = document.getElementById('edit-topic-icon').value;
    const title = document.getElementById('edit-topic-title').value;
    const cat = document.getElementById('edit-topic-cat').value;
    const author = document.getElementById('edit-topic-author').value;

    if (!title) {
        showNotification("Název tématu nesmí být prázdný!", "warning");
        return;
    }

    try {
        const updateData = {
            icon,
            title,
            cat,
            author,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('matura_topics')
            .update(updateData)
            .eq('id', itemId);

        if (error) throw error;

        // Update local state
        for (const categoryId in state.maturaTopics) {
            const index = state.maturaTopics[categoryId].findIndex(i => i.id === itemId);
            if (index !== -1) {
                state.maturaTopics[categoryId][index] = { 
                    ...state.maturaTopics[categoryId][index], 
                    ...updateData 
                };
                break;
            }
        }

        showNotification("Změny uloženy! ✅", "success");
        triggerHaptic('success');
        
        document.getElementById('topic-edit-modal')?.remove();
        
        // Refresh the specific card
        updateTopicCardUI(itemId);
    } catch (e) {
        console.error("Save metadata error:", e);
        showNotification("Chyba při ukládání změn.", "error");
    }
}

