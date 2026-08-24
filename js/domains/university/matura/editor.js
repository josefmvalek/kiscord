/**
 * Knowledge Base & Topic Editor for Matura Module
 */

import { state, refreshMaturaTopics } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { showNotification } from '@core/theme.js';
import { triggerHaptic } from '@core/utils.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { enqueueOperation } from '@core/offline.js';
import { uploadFile } from '@core/storage.js';
import { updateTopicCardUI } from './actions.js';

export function formatMarkdown(text) {
    if (!text) return '';

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

    // 1. Math preprocessing
    const mathBlocks = [];
    if (window.katex) {
        processedText = processedText.replace(/\$\$(.*?)\$\$/gs, (match, p1) => {
            const id = `@@@MATH_BLOCK_${mathBlocks.length}@@@`;
            try {
                mathBlocks.push({ id, html: `<div class="my-6 overflow-x-auto py-4 flex justify-center text-lg md:text-xl text-white shadow-inner bg-white/5 rounded-2xl border border-white/5 font-serif">${window.katex.renderToString(p1.trim(), { displayMode: true, throwOnError: false })}</div>` });
            } catch (e) {
                mathBlocks.push({ id, html: `<code class="text-red-400">$${p1}$</code>` });
            }
            return id;
        });

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

    // Marked parser
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
        processedText = processedText
            .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-white mb-6 mt-8 italic uppercase tracking-tighter shadow-sm">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black text-white mb-4 mt-6 italic uppercase tracking-tighter border-b border-white/10 pb-2">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mb-2 mt-4">$1</h3>')
            .replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\b_(.*?)_\b/g, '<em>$1</em>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
            
        processedText = processedText.split('\n\n').map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<div') || trimmed.includes('@@@MATH_')) return block;
            return `<p class="mb-4">${block.replace(/\n/g, ' ')}</p>`;
        }).join('\n');
    }

    mathBlocks.forEach(block => {
        processedText = processedText.split(block.id).join(block.html);
    });

    return processedText;
}

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

        if (window.updateKBPreview) window.updateKBPreview();
    }
    triggerHaptic('light');
}

export async function openEditor(itemId, existingContent = null) {
    const isMobile = window.innerWidth < 768;
    document.querySelectorAll('[id^="kb-modal-"]').forEach(el => el.remove());
    document.getElementById('edit-modal')?.remove();
    document.getElementById('hl-popover')?.remove();

    let currentContent = existingContent;
    let lastUpdatedAt = null;

    if (currentContent === null && state.maturaKBContent[itemId]) {
        currentContent = state.maturaKBContent[itemId].content;
        lastUpdatedAt = state.maturaKBContent[itemId].updated_at;
    }

    if (currentContent === null) {
        showNotification('Načítám data pro editor...', 'info');
        const { data: kbData } = await supabase.from('matura_kb').select('*').eq('item_id', itemId).maybeSingle();
        currentContent = kbData?.content || '';
        lastUpdatedAt = kbData?.updated_at || kbData?.created_at;
        state.maturaKBContent[itemId] = { content: currentContent, updated_at: lastUpdatedAt };
    }

    const draft = localStorage.getItem('matura_draft_' + itemId);
    let initialContent = currentContent;
    if (draft && draft !== currentContent) {
        if (await window.showConfirmDialog?.("Už máš rozdělanou práci! Obnovit neuložený koncept?", "Obnovit", "Zahasit")) {
            initialContent = draft;
        }
    }

    const modalHtml = `
        <div class="flex-1 flex flex-col md:flex-row bg-[#1b1d20] relative h-full overflow-hidden">
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

            <div id="editor-col" class="flex-1 flex flex-col border-r border-white/5">
                <div class="sticky top-0 z-50 bg-[#2f3136] border-b border-white/10 flex items-center gap-1 p-2 overflow-x-auto scrollbar-none shadow-lg">
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor?.('textarea-kb', '# ', '')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition" title="Nadpis"><i class="fas fa-heading"></i></button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor?.('textarea-kb', '**', '**')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition font-bold">B</button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor?.('textarea-kb', '*', '*')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition italic">I</button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor?.('textarea-kb', '- ', '')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition"><i class="fas fa-list-ul"></i></button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor?.('textarea-kb', '\`\`\`\\n', '\\n\`\`\`')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition"><i class="fas fa-code"></i></button>
                    <button type="button" onmousedown="event.preventDefault(); window.insertAtCursor?.('textarea-kb', '[', '](URL)')" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/5 rounded-lg transition"><i class="fas fa-link"></i></button>
                    <div class="w-px h-6 bg-white/10 mx-1"></div>
                    <label class="w-10 h-10 flex items-center justify-center text-[#5865F2] hover:bg-white/5 rounded-lg transition cursor-pointer">
                        <i class="fas fa-image text-sm"></i>
                        <input type="file" accept="image/*" class="hidden" onchange="window.loadModule('matura').then(m => m.handleImageUpload(this, '${itemId}'))">
                    </label>
                </div>
                
                <textarea id="textarea-kb" 
                    class="flex-1 w-full bg-transparent text-gray-200 p-6 md:p-8 outline-none text-base font-mono leading-relaxed resize-none custom-scrollbar"
                    oninput="window.updateKBPreview?.(); window.saveKBDraft?.('${itemId}')"
                    placeholder="Začni psát své zápisky v Markdownu..."></textarea>
            </div>

            <div id="preview-col" class="hidden md:flex flex-1 flex-col bg-[#36393f] overflow-y-auto custom-scrollbar border-l border-black/20">
                <div class="bg-[#2f3136] border-b border-white/5 p-2 px-4 flex items-center justify-between">
                    <span class="text-[9px] font-black uppercase text-gray-500 tracking-widest">Živý náhled</span>
                    <span id="draft-status" class="text-[9px] font-bold text-gray-600 italic">V pořádku</span>
                </div>
                <div id="preview-kb" class="markdown-body p-8 prose prose-invert max-w-none"></div>
            </div>

            <input type="hidden" id="kb-fetched-at" value="${lastUpdatedAt || ''}">
        </div>
        
        <div class="p-4 bg-[var(--bg-tertiary)] border-t border-white/5 flex items-center justify-between gap-4">
             <button onclick="document.getElementById('edit-modal')?.remove()" class="text-gray-500 font-bold uppercase text-[10px] px-4 hover:text-white transition">Zrušit</button>
             <div class="flex items-center gap-3">
                 <span id="save-warning" class="hidden text-[#ed4245] text-[10px] font-bold animate-pulse">POZOR: Někdo jiný změnil tento zápis!</span>
                 <button onclick="window.loadModule('matura').then(m => m.saveKBContent('${itemId}'))" 
                         class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest transition shadow-[0_0_20px_rgba(59,165,92,0.3)] active:scale-95">
                     Uložit zápis
                 </button>
             </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-modal',
        title: 'Editor zápisu',
        subtitle: 'Markdown & Real-time Preview ✍️',
        content: modalHtml,
        size: 'full',
        onClose: "document.getElementById('edit-modal')?.remove()"
    }));

    document.getElementById('edit-modal')?.classList.remove('hidden');
    document.getElementById('edit-modal')?.classList.add('flex');

    const textareaEl = document.getElementById('textarea-kb');
    if (textareaEl) {
        textareaEl.value = initialContent;

        requestAnimationFrame(() => {
            textareaEl.addEventListener('paste', (e) => {
                handleKBEditorPaste(e, itemId);
            });
        });
    }

    window.updateKBPreview = () => {
        const preview = document.getElementById('preview-kb');
        const txt = document.getElementById('textarea-kb');
        if (preview && txt) {
            preview.innerHTML = formatMarkdown(txt.value);
            if (window.hljs) {
                preview.querySelectorAll('pre code').forEach((el) => {
                    hljs.highlightElement(el);
                });
            }
        }
    };

    window.saveKBDraft = (tId) => {
        const txt = document.getElementById('textarea-kb')?.value;
        if (txt !== undefined) {
            localStorage.setItem('matura_draft_' + tId, txt);
            const status = document.getElementById('draft-status');
            if (status) status.textContent = 'Uloženo jako koncept lokálně ' + new Date().toLocaleTimeString();
        }
    };

    window.insertAtCursor = (areaId, before, after) => {
        const textarea = document.getElementById(areaId);
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        textarea.value = text.substring(0, start) + before + selected + after + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
        window.updateKBPreview();
        window.saveKBDraft(itemId);
    };

    window.updateKBPreview();
    triggerHaptic('medium');
}

export async function saveKBContent(itemId) {
    const content = document.getElementById('textarea-kb')?.value;
    if (content === undefined) return;

    const sectionsCount = content.split('\n').filter(l => l.trim().match(/^#{1,3}\s+.+$/)).length;

    const payload = {
        item_id: itemId,
        content: content,
        sections_count: sectionsCount,
        updated_at: new Date().toISOString()
    };

    showNotification('Ukládám do cloudu... ⏳', 'info');

    try {
        let offline = false;
        try {
            const { error } = await supabase.from('matura_kb').upsert(payload);
            if (error) throw error;
        } catch (netErr) {
            console.warn("[Matura] Network/Supabase error on save:", netErr);
            enqueueOperation('matura_kb', 'upsert', payload);
            offline = true;
        }

        if (offline) {
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
    input.value = '';
}

export async function handleKBEditorPaste(event, itemId) {
    const cb = (event.clipboardData || window.clipboardData);
    if (!cb) return;

    const hasText = cb.getData('text/plain').length > 0;
    const items = cb.items;
    for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            if (file) {
                if (hasText) {
                    return; 
                }
                event.preventDefault();
                await uploadAndInsertImage(file, itemId);
            }
        }
    }
}

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
            window.insertAtCursor?.('textarea-kb', `\n![obrázek](${publicUrl})\n`, '');
            showNotification('Obrázek vložen! 🖼️', 'success');
            triggerHaptic('success');
            if (window.updateKBPreview) window.updateKBPreview();
        } else {
            throw new Error("Upload failed to return URL");
        }
    } catch (error) {
        console.error('Image upload error:', error);
        showNotification('Chyba při nahrávání obrázku.', 'error');
        triggerHaptic('heavy');
    } finally {
        if (feedbackElement) {
            feedbackElement.innerHTML = originalContent;
            feedbackElement.style.pointerEvents = 'auto';
        }
    }
}

export async function addNewTopic(categoryId) {
    const title = await window.showPromptDialog?.("Název nového tématu:");
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
        if (window.loadModule) {
            window.loadModule('matura').then(m => m.renderMatura(state.currentChannel));
        }
        showNotification('Téma přidáno! ✍️', 'success');
    } catch (e) {
        showNotification('Chyba při přidávání tématu.', 'error');
    }
}

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
        <button onclick="document.getElementById('topic-edit-modal')?.remove()"
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
    
    document.getElementById('topic-edit-modal')?.classList.remove('hidden');
    document.getElementById('topic-edit-modal')?.classList.add('flex');
    triggerHaptic('light');
}

export async function saveTopicMetadata(itemId) {
    const icon = document.getElementById('edit-topic-icon')?.value;
    const title = document.getElementById('edit-topic-title')?.value;
    const cat = document.getElementById('edit-topic-cat')?.value;
    const author = document.getElementById('edit-topic-author')?.value;

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
        updateTopicCardUI(itemId);
    } catch (e) {
        console.error("Save metadata error:", e);
        showNotification("Chyba při ukládání změn.", "error");
    }
}
