/**
 * Knowledge Base Reader, Table of Contents & Collapsible Sections for Matura Module
 */

import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { showNotification } from '@core/theme.js';
import { triggerHaptic } from '@core/utils.js';
import { renderModal } from '@core/ui.js';
import { updateTopicCardUI } from './actions.js';
import { formatMarkdown } from './editor.js';

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

export function closeKnowledgeBase(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.remove();
    document.getElementById('hl-popover')?.remove();
    import('@domains/entertainment/highlighter.js').then(m => {
        if (m.destroyHighlighter) m.destroyHighlighter();
    }).catch(() => {});
}

export function toggleMobileTOC(itemId) {
    const sidebar = document.getElementById(`kb-sidebar-${itemId}`);
    const backdrop = document.getElementById(`kb-sidebar-backdrop-${itemId}`);
    if (!sidebar) return;
    const isShowing = sidebar.classList.contains('translate-y-0');
    if (isShowing) {
        sidebar.classList.remove('translate-y-0'); 
        sidebar.classList.add('translate-y-full');
        if (backdrop) { 
            backdrop.classList.add('hidden'); 
            backdrop.classList.remove('opacity-100'); 
        }
    } else {
        sidebar.classList.remove('translate-y-full'); 
        sidebar.classList.add('translate-y-0');
        if (backdrop) { 
            backdrop.classList.remove('hidden'); 
            setTimeout(() => backdrop.classList.add('opacity-100'), 10); 
        }
        triggerHaptic('light');
    }
}

export function applyCollapsibleSections(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    if (!container) return;

    const headers = container.querySelectorAll('h2, h3');
    
    headers.forEach(header => {
        header.classList.add('matura-collapsible-header');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'matura-collapsible-content';
        
        const inner = document.createElement('div');
        inner.className = 'matura-collapsible-inner';
        
        const level = parseInt(header.tagName.substring(1));
        
        let next = header.nextElementSibling;
        while (next && !['H1', 'H2', 'H3'].includes(next.tagName)) {
            if (level === 3 && next.tagName === 'H2') break;
            
            const current = next;
            next = next.nextElementSibling;
            inner.appendChild(current);
        }
        
        wrapper.appendChild(inner);
        header.parentNode.insertBefore(wrapper, next);
        
        header.onclick = (e) => {
            if (e.target.tagName === 'A') return;
            
            header.classList.toggle('collapsed');
            wrapper.classList.toggle('collapsed');
            triggerHaptic('light');
            
            updateCollapseAllButtonText(itemId);
        };
    });
}

export function toggleAllSections(itemId) {
    const container = document.getElementById(`kb-content-${itemId}`);
    if (!container) return;

    const headers = container.querySelectorAll('.matura-collapsible-header');
    const contents = container.querySelectorAll('.matura-collapsible-content');
    
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
    showNotification('Stahuji data z databáze...', 'info');

    let dbContent = '';
    try {
        const { data, error } = await supabase
            .from('matura_kb')
            .select('*')
            .eq('item_id', itemId)
            .maybeSingle();

        if (error) throw error;
        dbContent = data?.content || '';

        if (data && (!data.sections_count || data.sections_count === 0) && dbContent) {
            const count = dbContent.split('\n').filter(l => l.trim().match(/^#{1,3}\s+.+$/)).length;
            if (count > 0) {
                await supabase.from('matura_kb').update({ sections_count: count }).eq('item_id', itemId);
                if (state.maturaKBContent[itemId]) state.maturaKBContent[itemId].sections_count = count;
                updateTopicCardUI(itemId);
            }
        }

        if (!state.maturaKBContent) state.maturaKBContent = {};
        state.maturaKBContent[itemId] = {
            content: dbContent,
            updated_at: data?.updated_at || data?.created_at || new Date().toISOString()
        };
    } catch (e) {
        console.error("Supabase Matura fetch error:", e);
    }

    const content = dbContent || state.maturaKBContent?.[itemId]?.content || '';
    const modalId = `kb-modal-${itemId}`;
    const isMobile = window.innerWidth < 768;

    const sections = [];
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
            const level = trimmed.startsWith('# ') ? 1 : (trimmed.startsWith('## ') ? 2 : 3);
            const title = trimmed.replace(/^#{1,3}\s+/, '');
            const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            sections.push({ level, title, anchor });
        }
    });

    const parsedHTML = formatMarkdown(content);

    const modalHtml = `
        <div id="kb-container-${itemId}" class="flex-1 flex flex-col md:flex-row bg-[var(--bg-primary)] relative h-full overflow-hidden text-[var(--text-normal)]">
            
            <!-- Mobile Sticky Header -->
            ${isMobile ? `
                <div id="kb-sidebar-backdrop-${itemId}" class="fixed inset-0 z-[1010] bg-black/60 hidden opacity-0 transition-opacity duration-300 backdrop-blur-sm" onclick="window.loadModule('matura').then(m => m.toggleMobileTOC('${itemId}'))"></div>
                <div class="md:hidden sticky -top-6 bg-[var(--bg-secondary)] pt-6 pb-6 -mx-6 px-6 -mt-6 z-50 flex justify-center items-center border-b border-transparent cursor-pointer" onclick="window.loadModule('matura').then(m => m.toggleMobileTOC('${itemId}'))">
                    <button class="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] font-black uppercase text-gray-400">
                        <i class="fas fa-list-ul text-[#5865F2]"></i> 
                        <span>Osnova tématu (${sections.length})</span>
                        <i class="fas fa-chevron-down text-[8px] opacity-40 ml-1"></i>
                    </button>
                </div>
            ` : ''}

            <!-- TOC Sidebar -->
            <div id="kb-sidebar-${itemId}" class="w-full md:w-64 bg-[var(--bg-secondary)] border-b md:border-b-0 md:border-r border-white/5 flex flex-col flex-shrink-0 z-[1020]
                 ${isMobile ? 'fixed bottom-0 left-0 right-0 max-h-[70vh] rounded-t-3xl shadow-2xl transition-transform duration-300 transform translate-y-full border-t border-white/10' : ''}">
                <div class="p-4 border-b border-white/5 flex items-center justify-between">
                    <span class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Obsah tématu</span>
                    <div class="flex items-center gap-1">
                        <button onclick="window.loadModule('matura').then(m => m.toggleAllSections('${itemId}'))" class="matura-collapse-all-btn" id="btn-toggle-all-${itemId}" title="Sbalit/Rozbalit vše">Sbalit vše</button>
                        ${isMobile ? `<button onclick="window.loadModule('matura').then(m => m.toggleMobileTOC('${itemId}'))" class="p-2 text-gray-500 hover:text-white"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    ${sections.map((sec, idx) => `
                        <a href="#${sec.anchor}" 
                           onclick="${isMobile ? `window.loadModule('matura').then(m => m.toggleMobileTOC('${itemId}'));` : ''}"
                           class="block px-3 py-2 rounded-xl text-xs font-bold text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)] hover:bg-[var(--background-modifier-hover)] transition-all truncate
                           ${sec.level === 1 ? 'font-black text-[var(--text-header)] mt-2 bg-white/5' : (sec.level === 2 ? 'pl-4' : 'pl-6 text-[10px] opacity-75')}">
                            ${sec.title}
                        </a>
                    `).join('')}
                    ${sections.length === 0 ? '<p class="text-xs text-gray-600 italic p-4 text-center">Tento zápis nemá žádné nadpisy.</p>' : ''}
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar relative flex flex-col justify-between">
                <div class="max-w-4xl mx-auto w-full space-y-8">
                    <!-- Top Action Bar inside content -->
                    <div class="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/5">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">${item.icon || '📚'}</span>
                            <div>
                                <h1 class="text-xl md:text-2xl font-black text-[var(--text-header)] tracking-tight">${item.title}</h1>
                                <p class="text-xs text-[var(--text-muted)]">${item.author || item.cat || 'Maturitní okruh'}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5 flex-wrap">
                            <button onclick="window.loadModule('matura').then(m => m.generateAIQuiz('${itemId}'))" 
                                    class="bg-[#eb459e]/15 hover:bg-[#eb459e]/25 text-[#eb459e] border border-[#eb459e]/30 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5" title="Vygenerovat interaktivní test přes AI">
                                <i class="fas fa-robot"></i> <span>AI Test</span>
                            </button>
                            <button onclick="window.loadModule('matura').then(m => m.generateAITest('${itemId}'))" 
                                    class="bg-[#5865F2]/15 hover:bg-[#5865F2]/25 text-[#5865F2] border border-[#5865F2]/30 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5" title="Vygenerovat kartičky přes AI">
                                <i class="fas fa-layer-group"></i> <span>Kartičky</span>
                            </button>
                            <button onclick="window.loadModule('matura').then(m => m.openEditor('${itemId}'))" 
                                    class="bg-white/5 hover:bg-white/10 text-[var(--text-header)] border border-white/10 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5">
                                <i class="fas fa-edit"></i> <span>Upravit</span>
                            </button>
                            <button onclick="window.loadModule('matura').then(m => m.openNotes('${itemId}'))" 
                                    class="bg-white/5 hover:bg-white/10 text-[var(--text-header)] border border-white/10 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5">
                                <i class="fas fa-sticky-note"></i> <span>Poznámky</span>
                            </button>
                            <button onclick="window.loadModule('matura').then(m => m.downloadSinglePDF('${itemId}'))" id="btn-pdf-${itemId}" 
                                    class="bg-white/5 hover:bg-white/10 text-[var(--text-header)] border border-white/10 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5" title="Stáhnout jako PDF">
                                <i class="fas fa-file-pdf text-red-400"></i> <span>PDF</span>
                            </button>
                            <button onclick="window.loadModule('matura').then(m => m.openGeminiSettings())" 
                                    class="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition" title="Nastavení AI Klíče">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button onclick="window.loadModule('matura').then(m => m.toggleLocalTheme('kb-container-${itemId}'))" 
                                    class="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition" title="Přepnout lokální téma (Světlý/Tmavý)">
                                <i class="fas fa-sun theme-toggle-icon"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Rendered Markdown Body -->
                    <div id="kb-content-${itemId}" class="markdown-body prose prose-invert max-w-none text-[var(--text-normal)]">
                        ${parsedHTML || '<div class="text-center py-20 text-gray-500 italic">Tento zápis je zatím prázdný. Klikni na "Upravit" pro přidání textu. 📝</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: modalId,
        title: item.title,
        subtitle: 'Znalostní báze 🧠',
        content: modalHtml,
        size: 'full',
        onClose: `window.loadModule('matura').then(m => m.closeKnowledgeBase('${modalId}'))`
    }));

    document.getElementById(modalId)?.classList.remove('hidden');
    document.getElementById(modalId)?.classList.add('flex');

    applyCollapsibleSections(itemId);

    // Initialize highlighter
    import('@domains/entertainment/highlighter.js').then(m => {
        if (m.initHighlighter) m.initHighlighter(`kb-content-${itemId}`, itemId);
    }).catch(() => {});

    triggerHaptic('light');
}
