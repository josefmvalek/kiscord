import { state, stateEvents, ensureRegeneraceData } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { supabase } from '../core/supabase.js';
import { DEFAULT_CONTENT, SUPPLEMENT_THEMES, REGENERACE_START_DATE } from './regenerace/data.js';
import { renderSupplementCard, renderManualItem, renderTimelineCard, renderScienceSection, renderDidYouKnowCard, renderHolisticAnalysis, parseMarkdown, formatTimelineCard } from './regenerace/components.js';
import { renderEditor, syncEditorState, saveRegeneraceContent, setActiveEditorTab } from './regenerace/editor.js';



let isEditMode = false;
let isHeroCollapsed = true;
let isAnalysisCollapsed = true;
let isManualCollapsed = true;
let isTimelineCollapsed = true;
let isDidYouKnowCollapsed = true;
let collapsedScienceSections = {}; // Track by index or supplementId
let collapsedAnalysisChapters = [true, true, true, true];



function renderView(container, content) {
    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] relative pb-12">
            
            <!-- Hero Header -->
            <div class="sticky top-0 z-50 bg-[#36393f]/90 backdrop-blur-md pb-4 pt-6 px-6 border-b border-white/5 shadow-lg">
                <div class="flex justify-between items-center w-full max-w-2xl mx-auto">
                    <div>
                        <h2 class="text-2xl font-black text-white uppercase tracking-tighter leading-tight flex items-center gap-2">
                           <i class="fas fa-leaf text-[#3ba55c]"></i> Regenerace
                        </h2>
                    </div>
                    <button onclick="window.toggleRegeneraceEdit()" class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <i class="fas fa-pen text-sm"></i>
                    </button>
                </div>

                <!-- Quick Navigation Bar -->
                <div class="w-full max-w-2xl mx-auto mt-4">
                    <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                        ${[
                            { id: 'analysis', icon: '🧬', label: 'Rozbor' },
                            { id: 'supps', icon: '💊', label: 'Doplňky' },
                            { id: 'manual', icon: '🥗', label: 'Manuál' },
                            { id: 'timeline', icon: '📈', label: 'Proměna' },
                            { id: 'didyouknow', icon: '💡', label: 'Fakta' },
                            { id: 'science', icon: '📖', label: 'Knihovna' }
                        ].map(item => `
                            <button onclick="window.scrollToRegeneraceSection('${item.id}')" 
                                    class="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all group/nav">
                                <span class="text-xs group-hover/nav:scale-110 transition-transform">${item.icon}</span>
                                <span class="text-[9px] font-black uppercase tracking-widest text-white/50 group-hover/nav:text-white transition-colors">${item.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="max-w-2xl mx-auto px-4 pt-4 pb-12 space-y-4 animate-fade-in">
                
                <!-- Hero Section -->
                <div id="reg-section-hero" class="glass-card bg-gradient-to-br from-[#1a0b2e] to-[#0f0a1a] rounded-3xl border border-purple-500/20 overflow-hidden shadow-2xl transition-all duration-300 hover:border-purple-500/40 relative group/sec">
                    <div class="p-6 cursor-pointer flex justify-between items-center" onclick="window.toggleRegeneraceHero()">
                        <div class="flex items-center gap-4">
                            <span class="text-2xl animate-bounce-subtle">🎁</span>
                            <h2 class="text-white text-lg font-black uppercase tracking-[0.15em] leading-tight">Něco pro tebe :-)</h2>
                        </div>
                        <div id="reg-hero-chevron" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover/sec:text-white transition-all transform ${isHeroCollapsed ? '' : 'rotate-180'} border border-white/5">
                            <i class="fas fa-chevron-down text-sm"></i>
                        </div>
                    </div>
                    
                    <div id="reg-hero-content" class="transition-all duration-700 overflow-hidden ${isHeroCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'} px-6">
                        <div class="border-t border-white/5 pt-6 pb-6 space-y-4">
                            <p class="text-sm font-medium leading-relaxed text-purple-200">
                                ${parseMarkdown(content.hero.text)}
                            </p>
                            <p class="text-xs text-purple-200/60 leading-relaxed font-medium">
                                ${parseMarkdown(content.hero.subtext)}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Holistic Analysis Section -->
                ${renderHolisticAnalysis(content, isAnalysisCollapsed, collapsedAnalysisChapters)}

                <!-- Supplements -->
                <div id="reg-section-supps" class="space-y-4">
                    ${content.supplements.map(supp => renderSupplementCard(supp)).join('')}
                </div>

                <!-- Practical Manual -->
                <div id="reg-section-manual" class="space-y-4">
                    <div class="glass-card bg-gradient-to-br from-[#112a1a] to-[#0a1a0f] rounded-3xl border border-green-500/10 overflow-hidden shadow-2xl transition-all duration-300 hover:border-green-500/30 hover:shadow-green-500/5 group/sec">
                        <div class="p-6 cursor-pointer flex justify-between items-center" onclick="window.toggleRegeneraceSection('manual')">
                            <div class="flex items-center gap-5">
                                <div class="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-green-500/20 group-hover/sec:scale-110 transition-transform">🥗</div>
                                <div>
                                    <h3 class="text-white text-base font-black uppercase tracking-widest leading-tight">Praktický manuál</h3>
                                    <p class="text-[10px] text-green-400 font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Daily Protocol & Dosage</p>
                                </div>
                            </div>
                            <div id="reg-manual-chevron" class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover/sec:text-white transition-all transform ${isManualCollapsed ? '' : 'rotate-180'} border border-white/5">
                                <i class="fas fa-chevron-down text-xs"></i>
                            </div>
                        </div>
                        
                        <div id="reg-manual-content" class="transition-all duration-700 overflow-hidden ${isManualCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'} px-6">
                            <div class="space-y-0 relative border-l border-white/5 ml-5 pl-8 pt-4 pb-6">
                                ${content.manual.map((m, idx) => renderManualItem(m, idx, content.manual.length)).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Global Roadmap (TVÁ BIOLOGICKÁ PROMĚNA) -->
                <div id="reg-section-timeline" class="space-y-4">
                    <div class="glass-card bg-gradient-to-br from-[#111a2a] to-[#0a0f1a] rounded-3xl border border-blue-500/10 overflow-hidden shadow-2xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/5 group/sec">
                        <div class="p-6 cursor-pointer flex justify-between items-center" onclick="window.toggleRegeneraceSection('timeline')">
                            <div class="flex items-center gap-5">
                                <div class="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-blue-500/20 group-hover/sec:scale-110 transition-transform">📈</div>
                                <div>
                                    <h3 class="text-white text-base font-black uppercase tracking-widest leading-tight">Biologická proměna</h3>
                                    <p class="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Progress Timeline</p>
                                </div>
                            </div>
                            <div id="reg-timeline-chevron" class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover/sec:text-white transition-all transform ${isTimelineCollapsed ? '' : 'rotate-180'} border border-white/5">
                                <i class="fas fa-chevron-down text-xs"></i>
                            </div>
                        </div>

                        <div id="reg-timeline-content" class="transition-all duration-[800ms] overflow-hidden ${isTimelineCollapsed ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100'} px-6">
                            <div class="space-y-6 relative ml-2 pt-6 pb-6">
                                <!-- Connecting Line -->
                                <div class="absolute left-6 top-10 bottom-10 w-0.5 bg-white/5 z-0"></div>
                                
                                <!-- Dynamic Progress Line -->
                                ${(() => {
                                    const now = new Date();
                                    const start = new Date(REGENERACE_START_DATE);
                                    const diffDays = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
                                    
                                    let fillPercent = 0;
                                    if (diffDays > 0) {
                                        if (diffDays <= 3) fillPercent = 10;
                                        else if (diffDays <= 14) fillPercent = 35;
                                        else if (diffDays <= 30) fillPercent = 65;
                                        else fillPercent = 100;
                                    }
                                    
                                    return `<div class="absolute left-6 top-10 bottom-10 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 z-0 transition-all duration-[2000ms] animate-reg-flow" style="height: ${fillPercent}%"></div>`;
                                })()}

                                ${content.timeline.map((t, idx) => renderTimelineCard(t, idx)).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Did You Know Section -->
                ${renderDidYouKnowCard(content, isDidYouKnowCollapsed)}

                <!-- Science Library Section -->
                <div id="reg-section-science" class="space-y-4">
                    ${(content.scienceSections || []).map((section, sIdx) => renderScienceSection(section, sIdx, collapsedScienceSections)).join('')}
                </div>

            </div>
        </div>
    `;

    container.innerHTML = html;
}


// Global Interactivity
window.toggleRegeneraceEdit = () => {
    if (isEditMode) {
        // Leaving edit mode, maybe sync one last time
        syncEditorState();
    }
    isEditMode = !isEditMode;
    renderRegenerace();
};

window.switchEditorTab = (tab) => {
    triggerHaptic('light'); // Added feedback for better UX
    syncEditorState(); // Capture unsaved changes before switching
    setActiveEditorTab(tab);
    renderRegenerace();
};

// --- CRUD OPERATIONS FOR EDITOR ---

window.addAnalysisChapter = () => {
    syncEditorState();
    const chapters = state.regeneraceContent.analysis.chapters || [];
    const nextNum = chapters.length + 1;
    chapters.push({
        id: 'new-chapter-' + Date.now(),
        icon: '📌',
        title: `${nextNum}. Nová kapitola`,
        content: '',
        highlight: ''
    });
    renderRegenerace();
};

window.removeAnalysisChapter = (idx) => {
    if (!confirm('Opravdu smazat tuto kapitolu rozboru?')) return;
    syncEditorState();
    state.regeneraceContent.analysis.chapters.splice(idx, 1);
    
    // Optional: Re-number titles if they follow the "N. Title" pattern
    state.regeneraceContent.analysis.chapters.forEach((chap, i) => {
        const match = chap.title.match(/^(\d+)\.\s(.*)/);
        if (match) {
            chap.title = `${i + 1}. ${match[2]}`;
        }
    });
    
    renderRegenerace();
};

window.addManualItem = () => {
    syncEditorState();
    state.regeneraceContent.manual.push({
        time: 'KDYKOLIV',
        title: 'Nový krok',
        detail: ''
    });
    renderRegenerace();
};

window.removeManualItem = (idx) => {
    syncEditorState();
    state.regeneraceContent.manual.splice(idx, 1);
    renderRegenerace();
};

window.addScienceItem = (sIdx) => {
    syncEditorState();
    const section = state.regeneraceContent.scienceSections[sIdx];
    section.items.push({
        id: section.items.length + 1,
        title: 'Nová studie',
        text: '',
        result: '',
        source: '(Zdroj: )'
    });
    // Re-index to be sure
    section.items.forEach((item, idx) => item.id = idx + 1);
    renderRegenerace();
};

window.removeScienceItem = (sIdx, iIdx) => {
    if (!confirm('Opravdu smazat tuto studii?')) return;
    syncEditorState();
    state.regeneraceContent.scienceSections[sIdx].items.splice(iIdx, 1);
    // Re-index remaining items
    state.regeneraceContent.scienceSections[sIdx].items.forEach((item, idx) => {
        item.id = idx + 1;
    });
    renderRegenerace();
};

window.addTimelineItem = () => {
    syncEditorState();
    state.regeneraceContent.timeline.push({
        period: 'PO X DNECH',
        text: '**Nová proměna**\nPopis...'
    });
    renderRegenerace();
};

window.removeTimelineItem = (idx) => {
    if (!confirm('Opravdu smazat tento milník z časové osy?')) return;
    syncEditorState();
    state.regeneraceContent.timeline.splice(idx, 1);
    renderRegenerace();
};

window.toggleRegeneraceHero = () => {
    isHeroCollapsed = !isHeroCollapsed;
    
    // Direct DOM manipulation to prevent scroll jump
    const content = document.getElementById('reg-hero-content');
    const chevron = document.getElementById('reg-hero-chevron');
    if (content && chevron) {
        if (isHeroCollapsed) {
            content.classList.add('max-h-0', 'opacity-0');
            content.classList.remove('max-h-[1000px]', 'opacity-100');
            chevron.classList.remove('rotate-180');
        } else {
            content.classList.remove('max-h-0', 'opacity-0');
            content.classList.add('max-h-[1000px]', 'opacity-100');
            chevron.classList.add('rotate-180');
        }
    }
};

window.toggleRegeneraceSection = (section, id = null) => {
    triggerHaptic('light');
    let targetId = '';
    let chevronId = '';
    let maxH = 'max-h-[2000px]';
    let collapsed = false;

    if (section === 'manual') {
        isManualCollapsed = !isManualCollapsed;
        targetId = 'reg-manual-content';
        chevronId = 'reg-manual-chevron';
        collapsed = isManualCollapsed;
        maxH = 'max-h-[2000px]';
    } else if (section === 'timeline') {
        isTimelineCollapsed = !isTimelineCollapsed;
        targetId = 'reg-timeline-content';
        chevronId = 'reg-timeline-chevron';
        collapsed = isTimelineCollapsed;
        maxH = 'max-h-[3000px]';
    } else if (section === 'analysis') {
        isAnalysisCollapsed = !isAnalysisCollapsed;
        targetId = 'reg-analysis-content';
        chevronId = 'reg-analysis-chevron';
        collapsed = isAnalysisCollapsed;
        maxH = 'max-h-[3000px]';
    } else if (section === 'hero') {
        isHeroCollapsed = !isHeroCollapsed;
        targetId = 'reg-hero-content';
        chevronId = 'reg-hero-chevron';
        collapsed = isHeroCollapsed;
        maxH = 'max-h-[1000px]';
    } else if (section === 'didYouKnow') {
        isDidYouKnowCollapsed = !isDidYouKnowCollapsed;
        targetId = 'reg-didyouknow-content';
        chevronId = 'reg-didyouknow-chevron';
        collapsed = isDidYouKnowCollapsed;
        maxH = 'max-h-[3000px]';
    } else if (section === 'science') {
        collapsedScienceSections[id] = collapsedScienceSections[id] === undefined ? false : !collapsedScienceSections[id];
        targetId = `reg-science-content-${id}`;
        chevronId = `reg-science-chevron-${id}`;
        collapsed = collapsedScienceSections[id] !== false;
        maxH = 'max-h-[5000px]';
    }

    // Direct DOM manipulation
    const content = document.getElementById(targetId);
    const chevron = document.getElementById(chevronId);
    if (content && chevron) {
        if (collapsed) {
            content.classList.add('max-h-0', 'opacity-0');
            content.classList.remove(maxH, 'opacity-100');
            chevron.classList.remove('rotate-180');
        } else {
            content.classList.remove('max-h-0', 'opacity-0');
            content.classList.add(maxH, 'opacity-100');
            chevron.classList.add('rotate-180');
        }
    }
};

window.scrollToRegeneraceSection = (sectionId) => {
    triggerHaptic('medium');
    
    // 1. Ensure the section is expanded
    if (sectionId === 'analysis' && isAnalysisCollapsed) window.toggleRegeneraceSection('analysis');
    if (sectionId === 'manual' && isManualCollapsed) window.toggleRegeneraceSection('manual');
    if (sectionId === 'timeline' && isTimelineCollapsed) window.toggleRegeneraceSection('timeline');
    if (sectionId === 'didyouknow' && isDidYouKnowCollapsed) window.toggleRegeneraceSection('didYouKnow');
    
    // Note: 'supps' and 'science' are containers for multiple items, so we just scroll there
    
    const target = document.getElementById(`reg-section-${sectionId}`);
    if (target) {
        // Find the scrollable container (the one with overflow-y-auto)
        const scrollContainer = target.closest('.overflow-y-auto');
        
        if (scrollContainer) {
            const headerOffset = 140; // Height of the sticky header + nav chips
            
            // Calculate position of target relative to the scroll container
            const containerRect = scrollContainer.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const relativeTop = targetRect.top - containerRect.top + scrollContainer.scrollTop;
            
            scrollContainer.scrollTo({
                top: relativeTop - headerOffset,
                behavior: "smooth"
            });

            // 2. Visual Feedback (Glow)
            target.classList.remove('reg-section-highlight');
            void target.offsetWidth; // Trigger reflow
            target.classList.add('reg-section-highlight');
        } else {
            // Fallback to basic scroll into view if container not found
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};


window.toggleAnalysisChapter = (idx) => {
    triggerHaptic('light');
    collapsedAnalysisChapters[idx] = !collapsedAnalysisChapters[idx];
    
    const content = document.getElementById(`analysis-chapter-content-${idx}`);
    const chevron = document.getElementById(`analysis-chapter-chevron-${idx}`);
    
    if (content && chevron) {
        if (collapsedAnalysisChapters[idx]) {
            content.classList.add('max-h-0', 'opacity-0');
            content.classList.remove('max-h-[1000px]', 'opacity-100');
            chevron.classList.remove('rotate-180');
        } else {
            content.classList.remove('max-h-0', 'opacity-0');
            content.classList.add('max-h-[1000px]', 'opacity-100');
            chevron.classList.add('rotate-180');
        }
    }
};

window.toggleSupplementDetail = (id) => {
    triggerHaptic('light');
    const detail = document.getElementById(`detail-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    const card = document.getElementById(`supp-${id}`);

    if (!detail || !arrow || !card) return;

    // Is it currently open? (since we use transition, we check max-height or opacity)
    const isClosed = detail.classList.contains('max-h-0');


    // Toggle current
    if (isClosed) {
        detail.classList.remove('max-h-0', 'opacity-0');
        detail.classList.add('max-h-[9999px]', 'opacity-100');
        arrow.classList.add('rotate-180');
        card.classList.add('ring-1', 'ring-white/10', 'bg-white/[0.05]');
    } else {
        detail.classList.add('max-h-0', 'opacity-0');
        detail.classList.remove('max-h-[9999px]', 'opacity-100');
        arrow.classList.remove('rotate-180');
        card.classList.remove('ring-1', 'ring-white/10', 'bg-white/[0.05]');
    }
};

// --- EDITOR SHORTCUTS ---
window.saveRegeneraceContent = async () => {
    isEditMode = false;
    await saveRegeneraceContent(renderRegenerace);
};

// --- DID YOU KNOW EDITING HELPERS ---
window.addDidYouKnowSection = () => {
    syncEditorState();
    if (!state.regeneraceContent.didYouKnow) {
        state.regeneraceContent.didYouKnow = JSON.parse(JSON.stringify(DEFAULT_CONTENT.didYouKnow));
    }
    state.regeneraceContent.didYouKnow.sections.push({
        icon: '🔬',
        title: 'NOVÁ SEKCE',
        items: [{ title: 'Nové faktum', text: 'Text faktu...' }]
    });
    renderRegenerace();
};

window.removeDidYouKnowSection = (sIdx) => {
    if (!confirm('Opravdu smazat celou tuto sekci faktů?')) return;
    syncEditorState();
    state.regeneraceContent.didYouKnow.sections.splice(sIdx, 1);
    renderRegenerace();
};

window.addDidYouKnowItem = (sIdx) => {
    syncEditorState();
    state.regeneraceContent.didYouKnow.sections[sIdx].items.push({
        title: 'Nové faktum',
        text: 'Text faktu...'
    });
    renderRegenerace();
};

window.removeDidYouKnowItem = (sIdx, iIdx) => {
    syncEditorState();
    state.regeneraceContent.didYouKnow.sections[sIdx].items.splice(iIdx, 1);
    renderRegenerace();
};

