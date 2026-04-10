import { state, refreshMaturaTopics } from '../../core/state.js';
import { supabase } from '../../core/supabase.js';
import { triggerHaptic, triggerConfetti, showNotification, updateTopicCardUI, broadcastPomodoroUpdate } from './shared.js';
import { renderModal } from '../../core/ui.js';
import { safeUpsert, enqueueOperation } from '../../core/offline.js';
import { uploadFile } from '../../core/storage.js';

/**
 * Knowledge Base Reader
 */
export async function openKnowledgeBase(itemId) {
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

    document.getElementById('hl-popover')?.remove();

    if (window.showNotification) showNotification('Stahuji data z databáze...', 'info');

    let dbContent = '';
    try {
        const { data, error } = await supabase
            .from('matura_kb')
            .select('*')
            .eq('item_id', itemId)
            .maybeSingle();

        if (error) throw error;
        dbContent = data?.content || '';

        // Backfill sections count if missing
        if (data && (!data.sections_count || data.sections_count === 0) && dbContent) {
            const count = dbContent.split('\n').filter(l => l.trim().match(/^#{1,3}\s+.+$/)).length;
            if (count > 0) {
                await supabase.from('matura_kb').update({ sections_count: count }).eq('item_id', itemId);
                if (state.maturaKBContent[itemId]) state.maturaKBContent[itemId].sections_count = count;
                updateTopicCardUI(itemId);
            }
        }

        state.maturaKBContent[itemId] = {
            content: dbContent,
            updated_at: data?.updated_at || data?.created_at || new Date().toISOString()
        };
    } catch (e) {
        console.error("Supabase Matura fetch error:", e);
    }

    // Load dependencies
    try {
        const { loadMarked, loadHighlightJS, loadKaTeX } = await import('../../core/loader.js');
        await Promise.all([loadMarked(), loadHighlightJS(), loadKaTeX()]);
    } catch (e) {
        console.warn("[Matura] Failed to load some dependencies, using fallback parser.");
    }

    const isMobile = window.innerWidth < 768;
    const modalId = `kb-modal-${itemId}`;
    const quizExists = item.quizzes && item.quizzes.length > 0;
    const cardsExists = item.flashcards && item.flashcards.length > 0;
    
    // Actions HTML
    const actions = `
        <div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full">
            <div class="flex flex-wrap items-center gap-1 flex-1 sm:flex-none">
                <div class="flex items-center gap-1 flex-1 sm:flex-none">
                    ${quizExists ? `
                        <button onclick="import('/js/modules/quiz.js').then(m => m.openQuiz('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#48b4e0] hover:bg-[#3ba1cc] text-[#1b1d20] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(72,180,224,0.3)]">
                            <i class="fas fa-play text-[8px]"></i> <span>Cvičný test</span>
                        </button>
                        <button data-ai-action="quiz-${itemId}"
                                onclick="import('/js/modules/matura.js').then(async m => { if(await window.showConfirmDialog('Chceš test vygenerovat znovu? Původní otázky budou smazány.', 'Ano', 'Zrušit')) m.generateAIQuiz('${itemId}'); })"
                                class="bg-white/5 hover:bg-white/10 text-gray-500 p-2.5 rounded-xl text-xs transition min-w-[40px] flex items-center justify-center border border-white/5" title="Vygenerovat test znovu">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    ` : `
                        <button data-ai-action="quiz-${itemId}"
                                onclick="import('/js/modules/matura.js').then(m => m.generateAIQuiz('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#48b4e0]/10 hover:bg-[#48b4e0]/20 text-[#48b4e0] border border-[#48b4e0]/30 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition">
                            <i class="fas fa-file-alt text-[8px]"></i> Generovat test
                        </button>
                    `}
                </div>
                <div class="flex items-center gap-1 flex-1 sm:flex-none">
                    ${cardsExists ? `
                        <button onclick="import('/js/modules/flashcards.js').then(m => m.openFlashcards('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#eb459e] hover:bg-[#d83c8d] text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(235,69,158,0.3)]">
                            <i class="fas fa-layer-group text-[8px]"></i> <span>Kartičky</span>
                        </button>
                        <button data-ai-action="cards-${itemId}"
                                onclick="import('/js/modules/matura.js').then(async m => { if(await window.showConfirmDialog('Chceš kartičky vygenerovat znovu?', 'Ano', 'Zrušit')) m.generateAITest('${itemId}'); })"
                                class="bg-white/5 hover:bg-white/10 text-gray-500 p-2.5 rounded-xl text-xs transition min-w-[40px] flex items-center justify-center border border-white/5" title="Vygenerovat kartičky znovu">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    ` : `
                        <button data-ai-action="cards-${itemId}"
                                onclick="import('/js/modules/matura.js').then(m => m.generateAITest('${itemId}'))" 
                                class="flex-1 sm:flex-none bg-[#eb459e]/10 hover:bg-[#eb459e]/20 text-[#eb459e] border border-[#eb459e]/30 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition">
                            <i class="fas fa-magic text-[8px]"></i> Generovat kartičky
                        </button>
                    `}
                </div>
            </div>
            <div class="flex items-center gap-1 pt-2 sm:pt-0 sm:ml-auto border-t border-white/5 sm:border-0 grow sm:grow-0 overflow-x-auto no-scrollbar">
                <button onclick="import('/js/modules/matura.js').then(m => m.openEditor('${itemId}'))" 
                        class="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition border border-white/5">
                    <i class="fas fa-pencil-alt text-[8px]"></i> <span class="hidden sm:inline">Upravit</span>
                </button>
                <button onclick="import('/js/modules/matura.js').then(m => m.openNotes('${itemId}'))" 
                        class="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition border border-white/5">
                    <i class="fas fa-sticky-note text-[8px]"></i> <span class="hidden sm:inline">Poznámky</span>
                </button>
                <button onclick="import('/js/modules/matura.js').then(m => m.openGeminiSettings())" 
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
            <div class="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-12 matura-content-wrapper relative bg-[var(--bg-primary)]">
                <div id="kb-content-${itemId}" class="matura-content markdown-body max-w-none min-h-[60vh]">
                    ${formattedContent}
                </div>
            </div>
            ${isMobile ? `<div id="kb-sidebar-backdrop-${itemId}" class="fixed inset-0 z-[1010] bg-black/60 hidden opacity-0 transition-opacity duration-300 backdrop-blur-sm" onclick="import('/js/modules/matura.js').then(m => m.toggleMobileTOC('${itemId}'))"></div>` : ''}
            <div id="kb-sidebar-${itemId}" class="${isMobile ? 'fixed inset-x-0 bottom-0 top-auto z-[1011] translate-y-full max-h-[85vh] rounded-t-3xl border-t overscroll-contain' : 'w-80 border-l'} bg-[var(--bg-secondary)] border-white/5 flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar p-6 space-y-8 shadow-2xl transition-transform duration-300">
                <div class="md:hidden sticky -top-6 bg-[var(--bg-secondary)] pt-6 pb-6 -mx-6 px-6 -mt-6 z-50 flex justify-center items-center border-b border-transparent cursor-pointer" onclick="import('/js/modules/matura.js').then(m => m.toggleMobileTOC('${itemId}'))">
                    <div class="w-16 h-1.5 rounded-full bg-white/20 pointer-events-none"></div>
                </div>
                <div class="space-y-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-[#5865F2] flex items-center gap-2">
                        <i class="fas fa-list-ul"></i> Navigace
                    </h3>
                    <ul class="space-y-1 text-xs text-gray-400 font-medium">${tocHtml || '<li class="italic opacity-50 pl-2">Žádné sekce...</li>'}</ul>
                </div>
                <div class="space-y-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-[#eb459e] flex items-center gap-2">
                        <i class="fas fa-star"></i> Klíčové body
                    </h3>
                    <ul id="kb-highlights-list" class="space-y-3 text-xs text-gray-400">
                        <li class="italic opacity-50 pl-3">Načítám body...</li>
                    </ul>
                </div>
                <div class="pt-6 border-t border-white/5 space-y-4">
                    <div class="text-[8px] font-black uppercase text-gray-600 tracking-tighter">Legenda zvýraznění</div>
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-400"><span class="w-1.5 h-1.5 rounded-full bg-[#facc15]"></span> Důležité k pochopení</div>
                        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-400"><span class="w-1.5 h-1.5 rounded-full bg-[#f87171]"></span> Nutno nabiflovat</div>
                        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-400"><span class="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span> Již bezpečně ovládám</div>
                    </div>
                </div>
            </div>
            ${isMobile ? `
                <button onclick="import('/js/modules/matura.js').then(m => m.toggleMobileTOC('${itemId}'))" 
                        class="fixed bottom-32 right-6 w-14 h-14 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-full shadow-2xl flex items-center justify-center z-[1000] animate-bounce-slow border-4 border-[var(--bg-primary)] scale-100 active:scale-95 transition-transform">
                    <i class="fas fa-list-ul text-xl"></i>
                </button>
            ` : ''}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: modalId, title: item.title, subtitle: `${item.cat || 'Maturita'} • ${item.author || 'Okruh'}`,
        content: modalContent, size: 'full', actions: actions,
        onClose: `import('/js/modules/matura.js').then(m => m.closeKnowledgeBase('${modalId}'))`
    }));

    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    triggerHaptic('medium');

    // Header Extra
    const headerExtra = document.getElementById(`${modalId}-header-extra`);
    if (headerExtra) {
        headerExtra.innerHTML = `
            <div class="flex items-center gap-2">
                <button onclick="import('/js/modules/matura.js').then(m => m.toggleAllSections('${itemId}'))" class="matura-collapse-all-btn" id="btn-toggle-all-${itemId}" title="Sbalit/Rozbalit vše">Sbalit vše</button>
                <button onclick="import('/js/modules/matura.js').then(m => m.toggleLocalTheme('${modalId}'))" class="p-2 rounded-full hover:bg-white/5 text-[var(--interactive-normal)] hover:text-[var(--text-header)] transition-all" title="Přepnout téma okna">
                    <i class="fas fa-sun theme-toggle-icon"></i>
                </button>
            </div>
        `;
    }

    applyCollapsibleSections(itemId);
    import('../progress.js').then(m => m.initProgress(modalId, itemId));
    import('../highlighter.js').then(m => {
        window.refreshKBContent = (highlights, applyFn) => {
            const contentDiv = document.getElementById(`kb-content-${itemId}`);
            if (!contentDiv) return;
            contentDiv.innerHTML = formattedContent;
            applyCollapsibleSections(itemId);
            import('../progress.js').then(pr => pr.mountCheckboxes(modalId));
            highlights.forEach(hl => applyFn(contentDiv, hl));
        };
        m.initHighlighter(modalId, itemId);
    });
}

function generateTOC(html, itemId) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const headings = temp.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) return '';

    return Array.from(headings).map(h => {
        const level = h.tagName.toLowerCase();
        const text = h.textContent.trim();
        const slug = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const indent = level === 'h1' ? 'pl-0 font-bold text-[var(--text-header)]' : (level === 'h2' ? 'pl-3 text-[var(--text-normal)]' : 'pl-6 opacity-60 text-[var(--text-muted)]');
        return `<li class="${indent} hover:text-[var(--blurple)] cursor-pointer transition py-2 md:py-0.5 truncate font-medium text-[11px]" onclick="document.querySelectorAll('.matura-content h1, .matura-content h2, .matura-content h3').forEach(el => { const elSlug = el.textContent.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); if (elSlug === '${slug}') el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); import('/js/modules/matura.js').then(m => { const sb = document.getElementById('kb-sidebar-${itemId}'); if(sb && sb.classList.contains('translate-y-0')) m.toggleMobileTOC('${itemId}'); });">${text}</li>`;
    }).join('');
}

export function formatMarkdown(text) {
    if (!text) return '';
    let processedText = text.replace(/\r\n/g, '\n');
    const topicMap = {};
    Object.values(state.maturaTopics || {}).flat().forEach(t => { topicMap[t.title.toLowerCase()] = t.id; });
    processedText = processedText.replace(/\[\[(.*?)\]\]/g, (match, title) => {
        const foundId = topicMap[title.toLowerCase()];
        return foundId ? `<span class="matura-wikilink" onclick="import('/js/modules/matura.js').then(m => m.openKnowledgeBase('${foundId}'))">${title}</span>` : `<span class="text-[var(--text-muted)] italic opacity-60" title="Téma nenalezeno">[[${title}]]</span>`;
    });

    const mathBlocks = [];
    if (window.katex) {
        processedText = processedText.replace(/\$\$(.*?)\$\$/gs, (match, p1) => {
            const id = `@@@MATH_BLOCK_${mathBlocks.length}@@@`;
            try { mathBlocks.push({ id, html: `<div class="my-6 overflow-x-auto py-4 flex justify-center text-lg md:text-xl text-white shadow-inner bg-white/5 rounded-2xl border border-white/5 font-serif">${window.katex.renderToString(p1.trim(), { displayMode: true, throwOnError: false })}</div>` }); } catch (e) { mathBlocks.push({ id, html: `<code class="text-red-400">$${p1}$</code>` }); }
            return id;
        });
        processedText = processedText.replace(/\$([^\$]+?)\$/g, (match, p1) => {
            const id = `@@@MATH_INLINE_${mathBlocks.length}@@@`;
            try { mathBlocks.push({ id, html: `<span class="bg-white/5 px-2 py-0.5 rounded-md border border-white/5 mx-0.5 font-serif">${window.katex.renderToString(p1, { displayMode: false, throwOnError: false })}</span>` }); } catch (e) { mathBlocks.push({ id, html: `<code class="text-xs text-red-400">$${p1}$</code>` }); }
            return id;
        });
    }

    if (typeof marked !== 'undefined' && marked.parse) {
        processedText = marked.parse(processedText);
    } else {
        processedText = processedText.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-white mb-6 mt-8 italic uppercase tracking-tighter shadow-sm">$1</h1>').replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black text-white mb-4 mt-6 italic uppercase tracking-tighter border-b border-white/10 pb-2">$1</h2>').replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mb-2 mt-4">$1</h3>').replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 mb-2">$1</li>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedText = processedText.split('\n\n').map(block => block.trim() && !block.startsWith('<') ? `<p class="mb-4">${block.replace(/\n/g, ' ')}</p>` : block).join('\n');
    }

    mathBlocks.forEach(block => { processedText = processedText.split(block.id).join(block.html); });
    return processedText;
}

export function updateCollapseAllButtonText(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    const btn = document.getElementById(`btn-toggle-all-${itemId}`);
    if (!container || !btn) return;
    const anyExpanded = Array.from(container.querySelectorAll('.matura-collapsible-content')).some(c => !c.classList.contains('collapsed'));
    btn.textContent = anyExpanded ? 'Sbalit vše' : 'Rozbalit vše';
}

/**
 * Editor
 */
export async function openEditor(itemId, existingContent = null) {
    const isMobile = window.innerWidth < 768;
    document.querySelectorAll('[id^="kb-modal-"]').forEach(el => el.remove());
    document.getElementById('edit-modal')?.remove();
    document.getElementById('hl-popover')?.remove();

    let currentContent = existingContent;
    if (currentContent === null && state.maturaKBContent[itemId]) currentContent = state.maturaKBContent[itemId].content;
    if (currentContent === null) {
        showNotification('Načítám data pro editor...', 'info');
        const { data: kbData } = await supabase.from('matura_kb').select('*').eq('item_id', itemId).maybeSingle();
        currentContent = kbData?.content || '';
        state.maturaKBContent[itemId] = { content: currentContent, updated_at: kbData?.updated_at || kbData?.created_at };
    }

    const draft = localStorage.getItem('matura_draft_' + itemId);
    let initialContent = (draft && draft !== currentContent && await window.showConfirmDialog("Obnovit neuložený koncept?", "Obnovit", "Zrušit")) ? draft : currentContent;

    const modalHtml = `
        <div class="flex-1 flex flex-col md:flex-row bg-[#1b1d20] relative h-full overflow-hidden">
            ${isMobile ? `
                <div class="flex bg-[#2f3136] border-b border-white/5 p-1 gap-1">
                    <button id="tab-write" onclick="import('/js/modules/matura.js').then(m => m.switchEditorTab('write'))" class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-[#5865F2] bg-white/5 rounded-xl border border-[#5865F2]/30 transition-all"><i class="fas fa-pen-nib mr-2"></i> Psát</button>
                    <button id="tab-preview" onclick="import('/js/modules/matura.js').then(m => m.switchEditorTab('preview'))" class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-all"><i class="fas fa-eye mr-2"></i> Náhled</button>
                </div>
            ` : ''}
            <div id="editor-col" class="flex-1 flex flex-col border-r border-white/5">
                <div class="sticky top-0 z-50 bg-[#2f3136] border-b border-white/10 flex items-center gap-1 p-2 overflow-x-auto scrollbar-none shadow-lg">
                    <button onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '# ', '')" class="w-10 h-10 flex text-gray-300 hover:bg-white/5 rounded-lg transition items-center justify-center"><i class="fas fa-heading"></i></button>
                    <button onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '**', '**')" class="w-10 h-10 flex text-gray-300 hover:bg-white/5 rounded-lg transition items-center justify-center font-bold">B</button>
                    <button onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '*', '*')" class="w-10 h-10 flex text-gray-300 hover:bg-white/5 rounded-lg transition items-center justify-center italic">I</button>
                    <button onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '- ', '')" class="w-10 h-10 flex text-gray-300 hover:bg-white/5 rounded-lg transition items-center justify-center"><i class="fas fa-list-ul"></i></button>
                    <button onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '\\u0060\\u0060\\u0060\\n', '\\n\\u0060\\u0060\\u0060')" class="w-10 h-10 flex text-gray-300 hover:bg-white/5 rounded-lg transition items-center justify-center"><i class="fas fa-code"></i></button>
                    <button onmousedown="event.preventDefault(); window.insertAtCursor('textarea-kb', '[', '](URL)')" class="w-10 h-10 flex text-gray-300 hover:bg-white/5 rounded-lg transition items-center justify-center"><i class="fas fa-link"></i></button>
                    <label class="w-10 h-10 flex items-center justify-center text-[#5865F2] hover:bg-white/5 rounded-lg transition cursor-pointer"><i class="fas fa-image text-sm"></i><input type="file" accept="image/*" class="hidden" onchange="import('/js/modules/matura.js').then(m => m.handleImageUpload(this, '${itemId}'))"></label>
                </div>
                <textarea id="textarea-kb" class="flex-1 w-full bg-transparent text-gray-200 p-6 md:p-8 outline-none text-base font-mono leading-relaxed resize-none custom-scrollbar" oninput="window.updateKBPreview(); window.saveKBDraft('${itemId}')">${initialContent}</textarea>
            </div>
            <div id="preview-col" class="hidden md:flex flex-1 flex-col bg-[#36393f] overflow-y-auto custom-scrollbar border-l border-black/20">
                <div class="bg-[#2f3136] border-b border-white/5 p-2 px-4 flex items-center justify-between"><span class="text-[9px] font-black uppercase text-gray-500 tracking-widest">Živý náhled</span><span id="draft-status" class="text-[9px] font-bold text-gray-600 italic">V pořádku</span></div>
                <div id="preview-kb" class="markdown-body p-8 prose prose-invert max-w-none"></div>
            </div>
            <input type="hidden" id="kb-fetched-at" value="${state.maturaKBContent[itemId]?.updated_at || ''}">
        </div>
        <div class="p-4 bg-[var(--bg-tertiary)] border-t border-white/5 flex items-center justify-between gap-4">
             <button onclick="document.getElementById('edit-modal').remove()" class="text-gray-500 font-bold uppercase text-[10px] px-4 hover:text-white transition">Zrušit</button>
             <div class="flex items-center gap-3"><span id="save-warning" class="hidden text-[#ed4245] text-[10px] font-bold animate-pulse">POZOR: Někdo jiný změnil tento zápis!</span><button onclick="import('/js/modules/matura.js').then(m => m.saveKBContent('${itemId}'))" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest transition shadow-[0_0_20px_rgba(59,165,92,0.3)] active:scale-95">Uložit zápis</button></div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({ id: 'edit-modal', title: 'Editor zápisu', subtitle: 'Markdown & Real-time Preview ✍️', content: modalHtml, size: 'full', onClose: "document.getElementById('edit-modal')?.remove()" }));
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');

    window.updateKBPreview = () => { const txt = document.getElementById('textarea-kb'); const pre = document.getElementById('preview-kb'); if (txt && pre) pre.innerHTML = formatMarkdown(txt.value); };
    window.saveKBDraft = (id) => { const txt = document.getElementById('textarea-kb'); if (txt) { localStorage.setItem(`matura_draft_${id}`, txt.value); const status = document.getElementById('draft-status'); if (status) { status.textContent = "Koncept uložen " + new Date().toLocaleTimeString(); status.classList.add('text-green-500'); } } };
    window.insertAtCursor = (id, start, end) => { const txt = document.getElementById(id); if (!txt) return; const s = txt.selectionStart; const e = txt.selectionEnd; const val = txt.value; const textToInsert = start + val.substring(s, e) + end; txt.value = val.substring(0, s) + textToInsert + val.substring(e); txt.focus(); txt.selectionStart = s + start.length; txt.selectionEnd = s + start.length + (e - s); window.updateKBPreview(); window.saveKBDraft(itemId); };

    window.updateKBPreview();
    const textarea = document.getElementById('textarea-kb');
    if (textarea) {
        textarea.addEventListener('paste', async (e) => {
            const cb = e.clipboardData;
            for (const item of cb.items) {
                if (item.type.indexOf("image") !== -1) {
                    const file = item.getAsFile();
                    if (file) { e.preventDefault(); const url = await uploadFile('timeline-photos', file, 'matura'); if (url) { window.insertAtCursor('textarea-kb', `\\n![obrázek](${url})\\n`, ''); window.updateKBPreview(); } }
                }
            }
        });
    }
}

export async function saveKBContent(itemId) {
    const textarea = document.getElementById('textarea-kb');
    if (!textarea) return;
    const content = textarea.value;

    try {
        const { data: latest } = await supabase.from('matura_kb').select('*').eq('item_id', itemId).maybeSingle();
        const serverUpdate = latest?.updated_at || latest?.created_at;
        const localFetched = document.getElementById('kb-fetched-at')?.value || '';

        if (serverUpdate && localFetched && serverUpdate !== localFetched && !(await window.showConfirmDialog("Někdo jiný tento zápis změnil! Přemazat?", "Ano", "Zrušit"))) return;

        const { error, offline } = await safeUpsert('matura_kb', { item_id: itemId, content, sections_count: content.split('\\n').filter(l => l.trim().match(/^#{1,3}\\s+.+$/)).length || 0, updated_at: new Date().toISOString() });
        if (error) throw error;

        await supabase.from('matura_topics').update({ has_content: true }).eq('id', itemId);
        state.maturaKBContent[itemId] = { content, updated_at: new Date().toISOString() };
        showNotification('Uloženo! 📚', 'success');
        triggerHaptic('success');
        localStorage.removeItem(`matura_draft_${itemId}`);
        document.getElementById('edit-modal')?.remove();
        await refreshMaturaTopics();
        updateTopicCardUI(itemId);
    } catch (e) { showNotification('Chyba při ukládání.', 'error'); }
}

/**
 * AI
 */
export async function generateAIQuiz(itemId) {
    // Check API Key
    let key = localStorage.getItem('GEMINI_API_KEY');
    if (!key) { key = await window.showPromptDialog("Vlož Gemini API klíč:"); if (key) localStorage.setItem('GEMINI_API_KEY', key); else return; }

    const prog = window.showProgress ? window.showProgress('AI připravuje test...') : null;
    try {
        const { data: kbData } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
        const { AI } = await import('../../core/ai_helper.js');
        const quiz = await AI.generateQuiz(itemId, kbData?.content || '');
        if (quiz) {
            await supabase.from('matura_topics').update({ quizzes: quiz }).eq('id', itemId);
            await refreshMaturaTopics();
            updateTopicCardUI(itemId);
            showNotification('Test připraven! ✅', 'success');
        }
    } catch (e) { showNotification('Chyba AI generování.', 'error'); }
    if (prog) prog.close();
}

export async function generateAITest(itemId) {
    let key = localStorage.getItem('GEMINI_API_KEY');
    if (!key) { key = await window.showPromptDialog("Vlož Gemini API klíč:"); if (key) localStorage.setItem('GEMINI_API_KEY', key); else return; }

    const prog = window.showProgress ? window.showProgress('AI připravuje kartičky...') : null;
    try {
        const { data: kbData } = await supabase.from('matura_kb').select('content').eq('item_id', itemId).maybeSingle();
        const { AI } = await import('../../core/ai_helper.js');
        const cards = await AI.generateFlashcards(itemId, kbData?.content || '');
        if (cards) {
            await supabase.from('matura_topics').update({ flashcards: cards }).eq('id', itemId);
            await refreshMaturaTopics();
            updateTopicCardUI(itemId);
            showNotification('Kartičky připraveny! 🃏', 'success');
        }
    } catch (e) { showNotification('Chyba AI generování.', 'error'); }
    if (prog) prog.close();
}

/**
 * UI Helpers
 */

/**
 * UI Helpers
 */
export function applyCollapsibleSections(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    if (!container) return;
    const headings = container.querySelectorAll('h2');
    headings.forEach(h => {
        h.classList.add('matura-collapsible-header');
        h.innerHTML = `<i class="fas fa-chevron-down mr-3 text-xs opacity-30 transition-transform duration-300"></i>${h.innerHTML}`;
        let content = [];
        let next = h.nextElementSibling;
        while (next && next.tagName !== 'H2') {
            content.push(next);
            next = next.nextElementSibling;
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'matura-collapsible-content';
        h.parentNode.insertBefore(wrapper, h.nextElementSibling);
        content.forEach(el => wrapper.appendChild(el));
        h.onclick = () => { h.classList.toggle('collapsed'); wrapper.classList.toggle('collapsed'); updateCollapseAllButtonText(itemId); };
    });
}

export function toggleAllSections(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    if (!container) return;
    const headers = container.querySelectorAll('h2');
    const contents = container.querySelectorAll('.matura-collapsible-content');
    const anyExpanded = Array.from(contents).some(c => !c.classList.contains('collapsed'));
    headers.forEach(h => anyExpanded ? h.classList.add('collapsed') : h.classList.remove('collapsed'));
    contents.forEach(c => anyExpanded ? c.classList.add('collapsed') : c.classList.remove('collapsed'));
    updateCollapseAllButtonText(itemId);
}


export async function openGeminiSettings() {
    const key = await window.showPromptDialog("Vlož Gemini API klíč:", localStorage.getItem('GEMINI_API_KEY') || '');
    if (key !== null) { localStorage.setItem('GEMINI_API_KEY', key); showNotification("API klíč uložen.", "success"); }
}

export async function handleImageUpload(input, itemId) {
    if (!input.files || !input.files[0]) return;
    const url = await uploadFile('timeline-photos', input.files[0], 'matura');
    if (url) { window.insertAtCursor('textarea-kb', `\n![obrázek](${url})\n`, ''); window.updateKBPreview(); }
}

export function switchEditorTab(tab) {
    const editor = document.getElementById('editor-col');
    const preview = document.getElementById('preview-col');
    const btnWrite = document.getElementById('tab-write');
    const btnPreview = document.getElementById('tab-preview');
    if (tab === 'write') {
        editor.classList.remove('hidden', 'md:flex'); editor.classList.add('flex');
        preview.classList.remove('flex'); preview.classList.add('hidden', 'md:flex');
        btnWrite.classList.add('bg-white/5', 'border-[#5865F2]/30', 'text-[#5865F2]');
        btnPreview.classList.remove('bg-white/5', 'border-[#5865F2]/30', 'text-[#5865F2]');
    } else {
        editor.classList.remove('flex'); editor.classList.add('hidden', 'md:flex');
        preview.classList.remove('hidden', 'md:flex'); preview.classList.add('flex');
        btnPreview.classList.add('bg-white/5', 'border-[#5865F2]/30', 'text-[#5865F2]');
        btnWrite.classList.remove('bg-white/5', 'border-[#5865F2]/30', 'text-[#5865F2]');
    }
}

export function openNotes(itemId) {
    const prog = state.maturaProgress[itemId] || {};
    const user = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';
    const notes = prog[user]?.notes || '';
    const modalHtml = `<div class="space-y-4"><label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Moje poznámky</label><textarea id="notes-textarea" class="w-full h-48 bg-[#202225] text-white p-4 rounded-xl border border-white/5 outline-none focus:border-[#eb459e]/50 transition-all text-sm custom-scrollbar">${notes}</textarea></div>`;
    const actions = `<button onclick="import('/js/modules/matura.js').then(m => m.saveNotes('${itemId}'))" class="bg-[#eb459e] hover:bg-[#d83c8d] text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-lg active:scale-95">Uložit poznámky</button>`;
    document.body.insertAdjacentHTML('beforeend', renderModal({ id: 'notes-modal', title: 'Poznámky k tématu', subtitle: 'Společný whiteboard ✍️', content: modalHtml, actions: actions, onClose: "document.getElementById('notes-modal')?.remove()" }));
    document.getElementById('notes-modal').classList.remove('hidden');
    document.getElementById('notes-modal').classList.add('flex');
    triggerHaptic('light');
}

export async function saveNotes(itemId) {
    const val = document.getElementById('notes-textarea').value;
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';
    const prog = state.maturaProgress[itemId] || {};
    if (!prog[userKey]) prog[userKey] = { status: 'none', notes: '' };
    prog[userKey].notes = val;
    state.maturaProgress[itemId] = prog;
    try {
        await supabase.from('matura_topic_progress').upsert({ item_id: itemId, user_id: state.currentUser?.id, status: prog[userKey].status, notes: val, updated_at: new Date().toISOString() });
        showNotification('Poznámky uloženy! ✅', 'success');
        triggerHaptic('success');
    } catch (e) {
        showNotification('Uloženo lokálně! 📝', 'warning');
    }
    document.getElementById("notes-modal")?.remove();
}

export function toggleMobileTOC(itemId) {
    const sidebar = document.getElementById(`kb-sidebar-${itemId}`);
    const backdrop = document.getElementById(`kb-sidebar-backdrop-${itemId}`);
    if (!sidebar) return;
    const isShowing = sidebar.classList.contains('translate-y-0');
    if (isShowing) {
        sidebar.classList.remove('translate-y-0'); sidebar.classList.add('translate-y-full');
        if (backdrop) { backdrop.classList.add('hidden'); backdrop.classList.remove('opacity-100'); }
    } else {
        sidebar.classList.remove('translate-y-full'); sidebar.classList.add('translate-y-0');
        if (backdrop) { backdrop.classList.remove('hidden'); setTimeout(() => backdrop.classList.add('opacity-100'), 10); }
        triggerHaptic('light');
    }
}

