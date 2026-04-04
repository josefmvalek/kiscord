import { supabase } from '../core/supabase.js';
import { loadMarked, loadKaTeX } from '../core/loader.js';

/**
 * MaturitaHub 2026 - Topic Viewer Module
 * Uses Marked.js for Markdown and KaTeX for Mathematics.
 */

export async function openTopic(topicId) {
    const container = document.getElementById('main-content');
    if (!container) return;
    
    // 1. Loading State
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-40 animate-pulse">
            <div class="w-12 h-12 border-4 border-blurple border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-gray-500 font-black uppercase tracking-widest text-[10px]">Načítám studijní materiály...</p>
        </div>
    `;

    try {
        // Load libraries and data in parallel
        const [libraries, topicData] = await Promise.all([
            Promise.all([loadMarked(), loadKaTeX()]),
            supabase.from('matura_topics').select('*').eq('id', topicId).single()
        ]);

        const { data: topic, error } = topicData;
        if (error || !topic) throw new Error("Téma nebylo nalezeno v databázi.");

        renderTopicContent(container, topic);
    } catch (err) {
        console.error("Viewer Error:", err);
        container.innerHTML = `
            <div class="card p-20 text-center space-y-6 bg-darkSecondary/30 border border-white/5 mx-auto max-w-2xl mt-20">
                <div class="text-6xl">⚠️</div>
                <h2 class="text-2xl font-black italic text-white uppercase">Něco se nepovedlo</h2>
                <p class="text-gray-400 text-sm">${err.message}</p>
                <button onclick="window.location.hash = '#library'" class="bg-blurple hover:bg-blurple/90 text-white font-black px-10 py-4 rounded-2xl transition shadow-xl uppercase tracking-widest text-xs">
                    Zpět do knihovny
                </button>
            </div>
        `;
    }
}

function renderTopicContent(container, topic) {
    const topicId = topic.id;
    
    // Configure marked to open links in new tab
    const renderer = new marked.Renderer();
    const linkRenderer = renderer.link;
    renderer.link = (hrefData, title, text) => {
        // Handle both string and object formats from marked.js
        const href = (typeof hrefData === 'object') ? hrefData.href : hrefData;
        
        if (!href) return text || '';
        
        const isLocal = href.startsWith('#') || href.startsWith('/');
        const html = linkRenderer.call(renderer, hrefData, title, text);
        return isLocal ? html : html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
    };

    // Parse content
    let htmlContent = '';
    try {
        const parseFn = (typeof marked.parse === 'function') ? marked.parse : (marked.marked ? marked.marked.parse : null);
        if (!parseFn) throw new Error("Marked library not properly loaded.");
        
        htmlContent = parseFn(topic.content || '_Toto téma zatím nemá žádný obsah._', { renderer });
    } catch (e) {
        console.error("Marked Parse Error:", e);
        htmlContent = `<div class="p-8 border border-accent-danger/20 bg-accent-danger/5 rounded-2xl text-accent-danger text-sm font-bold">Chyba při vykreslování obsahu: ${e.message}</div>`;
    }

    container.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-12 pb-40 animate-fade-in relative px-4">
            <!-- Header Navigation -->
            <button onclick="window.location.hash = '#library'" class="text-gray-500 hover:text-white transition flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group">
                <i class="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i> Zpět do knihovny
            </button>

            <!-- Topic Info -->
            <div class="space-y-6">
                <div class="flex items-center gap-3">
                    <span class="bg-blurple/10 text-blurple px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blurple/20">
                        ${topic.category}
                    </span>
                    <span class="text-gray-600 text-[10px] font-black uppercase tracking-widest opacity-60">
                        <i class="fas fa-fingerprint mr-1"></i> ID: ${topicId}
                    </span>
                </div>
                
                <h1 class="text-4xl md:text-6xl font-black italic text-white tracking-tighter uppercase leading-none break-words">
                    ${topic.title}
                </h1>
                
                ${topic.description ? `
                    <p class="text-xl text-gray-400 italic font-medium leading-relaxed border-l-4 border-blurple/20 pl-6 py-2">
                        "${topic.description}"
                    </p>
                ` : ''}
            </div>

            <div class="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>

            <!-- Main Content Area -->
            <div class="content-wrapper" id="markdown-viewer-body">
                ${htmlContent}
            </div>

            <!-- Floating Action Controls -->
            <div class="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-darkSecondary/90 backdrop-blur-2xl p-2 rounded-3xl border border-white/10 shadow-2xl z-50 ring-1 ring-white/10">
                <button id="viewer-edit-btn" class="w-14 h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center transition active:scale-90 group" title="Upravit">
                    <i class="fas fa-pen-nib group-hover:rotate-12 transition-transform"></i>
                </button>
                <div class="w-px h-8 bg-white/10"></div>
                <button id="viewer-done-btn" class="bg-blurple hover:bg-blurple/90 text-white font-black px-10 h-14 rounded-2xl transition shadow-lg active:scale-95 uppercase tracking-widest text-xs flex items-center gap-3">
                    <i class="fas fa-check-double"></i> Mám naučeno
                </button>
            </div>
        </div>
    `;

    // Initialize KaTeX Math
    const mathArea = document.getElementById('markdown-viewer-body');
    if (window.renderMathInElement && mathArea) {
        renderMathInElement(mathArea, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
        });
    }

    // Attach Event Handlers
    const editBtn = document.getElementById('viewer-edit-btn');
    const doneBtn = document.getElementById('viewer-done-btn');

    if (editBtn) {
        editBtn.onclick = () => {
            window.location.hash = `#edit/${topicId}`;
        };
    }

    if (doneBtn) {
        doneBtn.onclick = async () => {
            const { cycleStatus } = await import('./library.js');
            await cycleStatus(topicId);
            window.location.hash = '#library';
        };
    }

    // Scroll to top on enter
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
