import { supabase } from '../core/supabase.js';
import { state, ensureMaturaData } from '../core/state.js';
import { loadMarked, loadKaTeX, loadCodeMirror } from '../core/loader.js';
import { showAlert, showConfirm } from '../main.js';

/**
 * MaturitaHub 2026 - Topic Editor Module
 */

export async function openNewTopic() {
    const container = document.getElementById('main-content');
    if (!container) return;
    
    await Promise.all([loadMarked(), loadKaTeX(), loadCodeMirror()]);
    renderEditor(container, {
        title: '',
        category: 'Informatika',
        description: '',
        content: '',
        icon: '📝'
    });
}

export async function editTopic(topicId) {
    const container = document.getElementById('main-content');
    if (!container) return;
    
    // Loading State
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-40 animate-pulse">
            <div class="w-12 h-12 border-4 border-blurple border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-gray-500 font-black uppercase tracking-widest text-[10px]">Připravuji profesionální editor...</p>
        </div>
    `;

    try {
        const [libraries, topicData] = await Promise.all([
            Promise.all([loadMarked(), loadKaTeX(), loadCodeMirror()]),
            supabase.from('matura_topics').select('*').eq('id', topicId).single()
        ]);
        
        const { data: topic, error } = topicData;
        if (error || !topic) throw new Error("Téma nebylo nalezeno.");

        renderEditor(container, topic);
    } catch (error) {
        console.error("Edit Load Error:", error);
        showAlert("Chyba", error.message, "❌");
        window.location.hash = '#library';
    }
}

function renderEditor(container, topic) {
    const isNew = !topic.id;
    
    // Activate Zen Mode
    document.body.classList.add('zen-mode');
    
    container.innerHTML = `
        <div class="animate-fade-in flex flex-col h-screen">
            <!-- Sticky Header Bar -->
            <div class="editor-header bg-darkSecondary/80 backdrop-blur-2xl border-b border-white/5 flex items-center gap-6 px-6 py-2">
                <button id="editor-cancel-btn" class="text-gray-500 hover:text-white transition text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="flex-1 flex items-center gap-3">
                    <input type="text" id="edit-title" value="${topic.title || ''}" placeholder="Název tématu..." 
                           class="flex-1 bg-transparent border-none text-xl font-black italic text-white uppercase tracking-tighter outline-none placeholder:text-white/10">
                </div>
                
                <button id="editor-save-btn" class="bg-blurple hover:bg-blurple/90 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2">
                    <i class="fas fa-save"></i> Uložit
                </button>
            </div>

            <!-- Ultra-Compact Meta Row -->
            <div class="bg-darkSecondary/20 border-b border-white/5 px-6 py-1.5 flex items-center gap-4">
                <div class="flex items-center gap-2">
                    <span class="text-[8px] font-black uppercase text-gray-600">Icon</span>
                    <input type="text" id="edit-icon" value="${topic.icon || '📝'}" class="w-8 bg-transparent border-none text-center outline-none">
                </div>
                <div class="w-px h-3 bg-white/5"></div>
                <div class="flex items-center gap-2">
                    <span class="text-[8px] font-black uppercase text-gray-600">Cat</span>
                    <select id="edit-category" class="bg-transparent border-none text-[10px] font-bold text-gray-400 outline-none cursor-pointer">
                        <option value="Čeština" ${topic.category === 'Čeština' ? 'selected' : ''}>Čeština</option>
                        <option value="Informatika" ${topic.category === 'Informatika' ? 'selected' : ''}>Informatika</option>
                        <option value="Matematika" ${topic.category === 'Matematika' ? 'selected' : ''}>Matematika</option>
                        <option value="Ostatní" ${topic.category === 'Ostatní' ? 'selected' : ''}>Ostatní</option>
                    </select>
                </div>
                <div class="w-px h-3 bg-white/5"></div>
                <div class="flex-1 flex items-center gap-2 overflow-hidden">
                    <span class="text-[8px] font-black uppercase text-gray-600">Desc</span>
                    <input type="text" id="edit-description" value="${topic.description || ''}" placeholder="Krátký popis tématu..." 
                           class="flex-1 bg-transparent border-none text-[10px] font-medium text-gray-500 outline-none truncate">
                </div>
            </div>

            <!-- Markdown Toolbar -->
            <div class="editor-toolbar">
                <button class="toolbar-btn" data-tool="h1" title="Nadpis H1 (Alt+1)"><i class="fas fa-heading"></i></button>
                <button class="toolbar-btn" data-tool="h2" title="Nadpis H2 (Alt+2)" style="font-size: 0.75rem;">H2</button>
                <button class="toolbar-btn" data-tool="h3" title="Nadpis H3 (Alt+3)" style="font-size: 0.7rem;">H3</button>
                <div class="toolbar-group-divider"></div>
                <button class="toolbar-btn" data-tool="bold" title="Tučné (Ctrl+B)"><i class="fas fa-bold"></i></button>
                <button class="toolbar-btn" data-tool="italic" title="Kurzíva (Ctrl+I)"><i class="fas fa-italic"></i></button>
                <div class="toolbar-group-divider"></div>
                <button class="toolbar-btn" data-tool="list" title="Seznam (Alt+L)"><i class="fas fa-list-ul"></i></button>
                <button class="toolbar-btn" data-tool="quote" title="Citace"><i class="fas fa-quote-right"></i></button>
                <button class="toolbar-btn" data-tool="code" title="Kód (Alt+K)"><i class="fas fa-code"></i></button>
                <div class="toolbar-group-divider"></div>
                <button class="toolbar-btn" data-tool="link" title="Odkaz"><i class="fas fa-link"></i></button>
                <button class="toolbar-btn" data-tool="table" title="Vložit tabulku (Alt+T)"><i class="fas fa-table"></i></button>
                <button class="toolbar-btn" data-tool="math" title="Matematický blok (Alt+M)"><i class="fas fa-calculator"></i></button>
            </div>

            <!-- Maximized Split Editor View -->
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 bg-darkPrimary min-h-0 overflow-hidden">
                <!-- Editor Pane -->
                <div class="flex flex-col border-r border-white/5 min-h-0 overflow-hidden">
                    <div class="editor-pane-header">
                        <i class="fas fa-feather-alt text-blurple"></i>
                        <span>Pro Editor (Markdown)</span>
                    </div>
                    <div id="cm-editor-container" class="flex-1 overflow-hidden"></div>
                </div>

                <!-- Preview Pane -->
                <div class="flex flex-col min-h-0 bg-darkSecondary/5 overflow-hidden">
                    <div class="editor-pane-header">
                        <i class="fas fa-eye text-blurple"></i>
                        <span>Live Preview</span>
                    </div>
                    <div id="live-preview-area" class="flex-1 p-10 overflow-y-auto content-wrapper custom-scrollbar">
                        <!-- Rendered HTML -->
                    </div>
                </div>
            </div>
        </div>
    `;

    const previewArea = document.getElementById('live-preview-area');

    function exitEditor() {
        document.body.classList.remove('zen-mode');
    }

    // Initialize CodeMirror
    const cm = CodeMirror(document.getElementById('cm-editor-container'), {
        value: topic.content || '',
        mode: 'gfm',
        theme: 'abbott',
        lineWrapping: true,
        lineNumbers: true,
        tabSize: 4,
        extraKeys: {
            "Enter": "newlineAndIndentContinueMarkdownList",
            "Ctrl-B": (cm) => insertMarkdown('bold'),
            "Cmd-B": (cm) => insertMarkdown('bold'),
            "Ctrl-I": (cm) => insertMarkdown('italic'),
            "Cmd-I": (cm) => insertMarkdown('italic'),
            "Alt-1": (cm) => insertMarkdown('h1'),
            "Alt-2": (cm) => insertMarkdown('h2'),
            "Alt-3": (cm) => insertMarkdown('h3'),
            "Alt-L": (cm) => insertMarkdown('list'),
            "Alt-T": (cm) => insertMarkdown('table'),
            "Alt-M": (cm) => insertMarkdown('math'),
            "Alt-K": (cm) => insertMarkdown('code')
        }
    });

    // Markdown Toolbar Logic
    function insertMarkdown(type) {
        const selectedText = cm.getSelection();
        const tools = {
            h1: { prefix: '# ', wrap: '' },
            h2: { prefix: '## ', wrap: '' },
            h3: { prefix: '### ', wrap: '' },
            bold: { prefix: '**', wrap: '**' },
            italic: { prefix: '*', wrap: '*' },
            list: { prefix: '- ', wrap: '' },
            quote: { prefix: '> ', wrap: '' },
            code: { prefix: '```\n', wrap: '\n```' },
            link: { prefix: '[', wrap: '](url)' },
            table: { prefix: '\n| Sloupec 1 | Sloupec 2 |\n|---|---|\n| Text 1 | Text 2 |\n', wrap: '' },
            math: { prefix: '\n$$\n', wrap: '\n$$\n' }
        };

        const tool = tools[type];
        if (!tool) return;

        cm.replaceSelection(tool.prefix + selectedText + tool.wrap);
        cm.focus();
        updatePreview();
    }

    // Handle Toolbar Clicks
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.onclick = () => insertMarkdown(btn.dataset.tool);
    });

    // Live Preview Logic
    function updatePreview() {
        const rawContent = cm.getValue();
        const renderer = new marked.Renderer();
        const linkRenderer = renderer.link;
        renderer.link = (hrefData, title, text) => {
            const href = (typeof hrefData === 'object') ? hrefData.href : hrefData;
            if (!href) return text || '';
            const isLocal = href.startsWith('#') || href.startsWith('/');
            const html = linkRenderer.call(renderer, hrefData, title, text);
            return isLocal ? html : html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
        };

        try {
            const parseFn = (typeof marked.parse === 'function') ? marked.parse : (marked.marked ? marked.marked.parse : null);
            if (!parseFn) throw new Error("Marked not loaded.");
            
            const html = parseFn(rawContent || '_Náhled se zobrazí zde..._', { renderer });
            previewArea.innerHTML = html;
        } catch (e) {
            console.error("Preview Render Error:", e);
            previewArea.innerHTML = `<div class="p-4 text-accent-danger text-xs font-bold">Chyba náhledu: ${e.message}</div>`;
        }
        
        if (window.renderMathInElement && previewArea) {
            renderMathInElement(previewArea, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
    }

    cm.on('change', () => {
        updatePreview();
    });

    // Button Actions
    document.getElementById('editor-cancel-btn').onclick = async () => {
        if (await showConfirm("Zrušit změny?", "Všechny neuložené úpravy budou ztraceny.", "⚠️")) {
            exitEditor();
            window.location.hash = isNew ? '#library' : `#view/${topic.id}`;
        }
    };

    document.getElementById('editor-save-btn').onclick = async () => {
        const data = {
            author_id: state.currentUser.id,
            title: document.getElementById('edit-title').value,
            category: document.getElementById('edit-category').value,
            description: document.getElementById('edit-description').value,
            content: cm.getValue(),
            icon: document.getElementById('edit-icon').value,
            updated_at: new Date().toISOString()
        };

        if (!data.title || !data.content) {
            return showAlert("Varování", "Název a obsah jsou povinné!", "⚠️");
        }

        try {
            if (isNew) {
                const { error } = await supabase.from('matura_topics').insert(data);
                if (error) throw error;
                showAlert("Úspěch", "Téma bylo vytvořeno!", "✅");
            } else {
                const { error } = await supabase.from('matura_topics').update(data).eq('id', topic.id);
                if (error) throw error;
                showAlert("Úspěch", "Změny byly uloženy!", "✅");
            }
            
            await ensureMaturaData(true);
            exitEditor();
            window.location.hash = isNew ? '#library' : `#view/${topic.id}`;
        } catch (error) {
            console.error("Save Error:", error);
            showAlert("Chyba", "Nepodařilo se uložit: " + error.message, "❌");
        }
    };

    updatePreview();
}
