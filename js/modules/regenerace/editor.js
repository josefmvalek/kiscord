/**
 * regenerace/editor.js
 * Kompletní editor pro Regenerace modul.
 *
 * Exportuje:
 *  - renderEditor(container, content)  – vyrenderuje editor UI
 *  - syncEditorState()                 – synchronizuje DOM → state
 *  - getActiveEditorTab()              – vrací aktuální tab
 *  - setActiveEditorTab(tab)           – nastaví tab (voláno z window.switchEditorTab)
 */

import { state } from '../../core/state.js';
import { supabase } from '../../core/supabase.js';
import { triggerHaptic } from '../../core/utils.js';
import { DEFAULT_CONTENT } from './data.js';

// ---------------------------------------------------------------------------
// MODULE STATE – sdílený editor tab stav
// ---------------------------------------------------------------------------

let activeEditorTab = 'hero';

export function getActiveEditorTab() { return activeEditorTab; }
export function setActiveEditorTab(tab) { activeEditorTab = tab; }

// ---------------------------------------------------------------------------
// EDITOR RENDER – Sub-sekce
// ---------------------------------------------------------------------------

function renderHeroEditor(content) {
    return `
        <section class="${activeEditorTab === 'hero' ? '' : 'hidden'} space-y-6">
            <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-widest border-l-2 border-[#5865f2] pl-3">Úvodní karta</h3>
            <div class="space-y-3">
                <input type="text" id="edit-hero-title" value="${content.hero.title}" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#5865f2] transition-all">
                <textarea id="edit-hero-text" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-[#5865f2] transition-all h-24">${content.hero.text}</textarea>
                <textarea id="edit-hero-subtext" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-[#5865f2] transition-all h-20">${content.hero.subtext}</textarea>
            </div>
        </section>
    `;
}

function renderAnalysisEditor(content) {
    return `
        <section class="${activeEditorTab === 'analysis' ? '' : 'hidden'} space-y-12">
            <div class="space-y-4">
                <h3 class="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500 pl-3">Úvod rozboru</h3>
                <textarea id="edit-analysis-summary" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-emerald-500 transition-all h-32">${content.analysis?.summary || ''}</textarea>
            </div>
            <div class="space-y-8" id="analysis-chapters-list">
                ${(content.analysis?.chapters || []).map((chapter, idx) => `
                    <div class="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4 relative group/chap">
                        <button onclick="window.removeAnalysisChapter(${idx})" class="absolute top-6 right-6 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/chap:opacity-100 hover:bg-red-500/20 transition-all flex items-center justify-center">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                        <div class="flex items-center gap-3 mb-2">
                            <input type="text" id="edit-analysis-chapter-icon-${idx}" value="${chapter.icon}" class="w-12 bg-black/20 border border-white/10 rounded-xl p-2 text-center text-xl">
                            <input type="text" id="edit-analysis-chapter-title-${idx}" value="${chapter.title}" class="flex-1 bg-black/20 border border-white/10 rounded-xl p-2 text-white font-bold uppercase tracking-widest text-xs">
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Hlavní obsah</label>
                                <textarea id="edit-analysis-chapter-content-${idx}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-32">${chapter.content}</textarea>
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1 mb-1 block">Highlight / Varování / Boxík</label>
                                <textarea id="edit-analysis-chapter-highlight-${idx}" class="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-[11px] text-emerald-100/90 font-bold h-24">${chapter.highlight || ''}</textarea>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="window.addAnalysisChapter()" class="w-full py-4 rounded-3xl border-2 border-dashed border-emerald-500/20 text-emerald-500/40 hover:border-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                <i class="fas fa-plus-circle"></i> Přidat další bod do rozboru
            </button>
        </section>
    `;
}

function renderSupplementsEditor(content) {
    return `
        <div class="${activeEditorTab === 'supps' ? '' : 'hidden'} space-y-8">
            ${content.supplements.map((supp, index) => `
                <section class="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div class="flex items-center gap-3 mb-4">
                        <input type="text" id="edit-supp-icon-${index}" value="${supp.icon}" class="w-12 bg-black/20 border border-white/10 rounded-xl p-2 text-center text-xl">
                        <input type="text" id="edit-supp-title-${index}" value="${supp.title}" class="flex-1 bg-black/20 border border-white/10 rounded-xl p-2 text-white font-bold uppercase tracking-widest">
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Podnadpis &amp; Produkt</label>
                            <input type="text" id="edit-supp-subtitle-${index}" value="${supp.subtitle}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 mb-2">
                            <input type="text" id="edit-supp-product-${index}" value="${supp.product}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-[11px] text-gray-400">
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-[#3ba55c] uppercase tracking-widest ml-1 mb-1 block">Klíčový přínos (Krátký text)</label>
                            <input type="text" id="edit-supp-benefit-${index}" value="${supp.benefit || ''}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300">
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-yellow-400 uppercase tracking-widest ml-1 mb-1 block">Složení produktu (každý na nový řádek)</label>
                            <textarea id="edit-supp-composition-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-24">${(supp.composition || []).join('\n')}</textarea>
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-red-400 uppercase tracking-widest ml-1 mb-1 block">Symptomy nedostatku (každý na nový řádek)</label>
                            <textarea id="edit-supp-deficiency-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-32">${supp.deficiency.join('\n')}</textarea>
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-[#5865f2] uppercase tracking-widest ml-1 mb-1 block">Proč to funguje / Věda (každý na nový řádek)</label>
                            <textarea id="edit-supp-science-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-32">${supp.science.join('\n')}</textarea>
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-[#faa61a] uppercase tracking-widest ml-1 mb-1 block">Dávkování / Protokol (každý na nový řádek)</label>
                            <textarea id="edit-supp-protocol-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-24">${(supp.protocol || []).join('\n')}</textarea>
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Bonus / Timing Poznámka</label>
                            <textarea id="edit-supp-bonus-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-gray-300 italic h-20">${supp.bonus}</textarea>
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-[#3ba55c] uppercase tracking-widest ml-1 mb-1 block">Specifická časová osa (period:text, jeden na řádek)</label>
                            <textarea id="edit-supp-timeline-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-gray-300 h-24">${(supp.timeline || []).map(t => `${t.period}:${t.text}`).join('\n')}</textarea>
                        </div>
                    </div>
                </section>
            `).join('')}
        </div>
    `;
}

function renderTimelineEditor(content) {
    return `
        <section class="${activeEditorTab === 'timeline' ? '' : 'hidden'} space-y-8">
            <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Biologická proměna</h3>
            <div class="space-y-6" id="timeline-items-list">
                ${content.timeline.map((t, index) => `
                    <div class="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4 relative group/time">
                        <button onclick="window.removeTimelineItem(${index})" class="absolute top-6 right-6 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/time:opacity-100 hover:bg-red-500/20 transition-all flex items-center justify-center">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                        <div>
                            <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Období / Fáze</label>
                            <input type="text" id="edit-timeline-period-${index}" value="${t.period}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white font-bold">
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Popis proměny (Markdown)</label>
                            <textarea id="edit-timeline-text-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-48 leading-relaxed">${t.text}</textarea>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="window.addTimelineItem()" class="w-full py-4 rounded-3xl border-2 border-dashed border-indigo-500/20 text-indigo-500/40 hover:border-indigo-500/40 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                <i class="fas fa-plus-circle"></i> Přidat další milník do časové osy
            </button>
        </section>
    `;
}

function renderManualEditor(content) {
    return `
        <section class="${activeEditorTab === 'manual' ? '' : 'hidden'} space-y-6">
            <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-widest border-l-2 border-[#3ba55c] pl-3">Denní manuál</h3>
            <div class="grid grid-cols-1 gap-4" id="manual-items-list">
                ${content.manual.map((m, index) => `
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-3 items-center group/man">
                        <input type="text" id="edit-manual-time-${index}" value="${m.time}" class="bg-black/20 border border-white/10 rounded-lg p-2 text-[10px] text-gray-400 font-bold uppercase">
                        <input type="text" id="edit-manual-title-${index}" value="${m.title}" class="bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white font-bold">
                        <input type="text" id="edit-manual-detail-${index}" value="${m.detail}" class="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-gray-300">
                        <button onclick="window.removeManualItem(${index})" class="md:justify-self-end w-8 h-8 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/man:opacity-100 hover:bg-red-500/20 transition-all flex items-center justify-center">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
            <button onclick="window.addManualItem()" class="w-full py-4 rounded-2xl border-2 border-dashed border-green-500/20 text-green-500/40 hover:border-green-500/40 hover:text-green-500 hover:bg-green-500/5 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                <i class="fas fa-plus-circle"></i> Přidat další bod do manuálu
            </button>
        </section>
    `;
}

function renderScienceEditor(content) {
    return `
        <section class="${activeEditorTab === 'science' ? '' : 'hidden'} space-y-12">
            <h3 class="text-white text-lg font-black uppercase tracking-[0.2em] flex items-center gap-3">
                <i class="fas fa-microscope text-indigo-400"></i> Vědecká Knihovna
            </h3>
            <div class="space-y-16">
                ${(content.scienceSections || []).map((section, sIdx) => `
                    <div class="space-y-6 p-8 bg-black/20 rounded-[2.5rem] border border-white/5 relative">
                        <div class="absolute -top-4 left-8 px-4 py-1 bg-indigo-500 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">
                            Kapitola: ${section.supplementId.toUpperCase()}
                        </div>
                        <div class="space-y-4">
                            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nadpis kapitoly</label>
                            <input type="text" id="edit-science-section-${sIdx}-title" value="${section.title}" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500 transition-all">
                            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block mt-4">Úvodní text</label>
                            <textarea id="edit-science-section-${sIdx}-intro" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-indigo-500 transition-all h-28">${section.intro}</textarea>
                        </div>
                        <div class="space-y-8 pt-6">
                            ${section.items.map((item, iIdx) => `
                                <div class="bg-[#2f3136] p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl relative group/study">
                                    <button onclick="window.removeScienceItem(${sIdx}, ${iIdx})" class="absolute top-6 right-6 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/study:opacity-100 hover:bg-red-500/20 transition-all flex items-center justify-center z-20">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Studie #${iIdx + 1}</span>
                                    </div>
                                    <div class="space-y-3">
                                        <input type="text" id="edit-science-section-${sIdx}-item-${iIdx}-title" value="${item.title}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white font-black uppercase text-xs">
                                        <textarea id="edit-science-section-${sIdx}-item-${iIdx}-text" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-gray-300 text-sm h-24">${item.text}</textarea>
                                        <textarea id="edit-science-section-${sIdx}-item-${iIdx}-result" class="w-full bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-white font-bold text-sm h-24">${item.result}</textarea>
                                        <input type="text" id="edit-science-section-${sIdx}-item-${iIdx}-source" value="${item.source}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                                    </div>
                                </div>
                            `).join('')}
                            <button onclick="window.addScienceItem(${sIdx})" class="w-full py-6 rounded-3xl border-2 border-dashed border-indigo-500/20 text-indigo-500/40 hover:border-indigo-500/40 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                                <i class="fas fa-plus-circle"></i> Přidat další studii k ${section.supplementId === 'iron' ? 'železu' : (section.supplementId === 'zinc' ? 'zinku' : 'hořčíku')}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function renderDidYouKnowEditor(content) {
    if (!content.didYouKnow) return '';
    return `
        <section class="${activeEditorTab === 'didyouknow' ? '' : 'hidden'} space-y-12">
            <div class="space-y-4">
                <h3 class="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Úvod sekce "Věděla jsi že"</h3>
                <input type="text" id="edit-dyk-title" value="${content.didYouKnow.title}" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-indigo-500 transition-all">
                <textarea id="edit-dyk-subtitle" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-indigo-500 transition-all h-24">${content.didYouKnow.subtitle}</textarea>
            </div>
            <div class="space-y-8" id="dyk-sections-list">
                ${content.didYouKnow.sections.map((section, sIdx) => `
                    <div class="p-8 bg-black/20 rounded-[2.5rem] border border-white/5 space-y-6 relative group/dyksec">
                        <button onclick="window.removeDidYouKnowSection(${sIdx})" class="absolute top-8 right-8 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover/dyksec:opacity-100 hover:bg-red-500/20 transition-all flex items-center justify-center z-10">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                        <div class="flex items-center gap-4 mb-2">
                            <input type="text" id="edit-dyk-section-${sIdx}-icon" value="${section.icon}" class="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl text-center text-2xl outline-none focus:border-indigo-500 transition-all">
                            <div class="flex-1">
                                <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Název podsekce</label>
                                <input type="text" id="edit-dyk-section-${sIdx}-title" value="${section.title}" class="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white font-bold uppercase tracking-widest text-xs outline-none focus:border-indigo-500 transition-all">
                            </div>
                        </div>
                        <div class="space-y-4 pt-4">
                            <div class="flex justify-between items-center mb-2">
                                <label class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Jednotlivá fakta</label>
                            </div>
                            <div class="space-y-6">
                                ${section.items.map((item, iIdx) => `
                                    <div class="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-3 relative group/dykitem">
                                        <button onclick="window.removeDidYouKnowItem(${sIdx}, ${iIdx})" class="absolute top-4 right-4 w-6 h-6 rounded-md bg-red-500/10 text-red-400 opacity-0 group-hover/dykitem:opacity-100 hover:bg-red-500/20 transition-all flex items-center justify-center">
                                            <i class="fas fa-times text-[10px]"></i>
                                        </button>
                                        <input type="text" id="edit-dyk-section-${sIdx}-item-${iIdx}-title" value="${item.title}" class="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-[11px] text-indigo-300 font-black uppercase tracking-widest">
                                        <textarea id="edit-dyk-section-${sIdx}-item-${iIdx}-text" class="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-xs text-gray-300 h-20 leading-relaxed">${item.text}</textarea>
                                    </div>
                                `).join('')}
                            </div>
                            <button onclick="window.addDidYouKnowItem(${sIdx})" class="w-full py-3 rounded-2xl border border-dashed border-indigo-500/20 text-indigo-500/40 hover:border-indigo-500/40 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                                <i class="fas fa-plus"></i> Přidat fakt k ${section.title || 'této sekci'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="window.addDidYouKnowSection()" class="w-full py-6 rounded-[2.5rem] border-2 border-dashed border-indigo-500/10 text-indigo-500/30 hover:border-indigo-500/30 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                <i class="fas fa-layer-group"></i> Přidat celou novou sekci faktů
            </button>
        </section>
    `;
}

// ---------------------------------------------------------------------------
// MAIN EDITOR ORCHESTRATOR
// ---------------------------------------------------------------------------

export function renderEditor(container, content) {
    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] relative pb-32">
            <div class="sticky top-0 z-50 bg-[#36393f] pb-4 pt-6 px-6 border-b border-white/10 shadow-lg">
                <div class="flex justify-between items-center w-full max-w-2xl mx-auto">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter">Editor Regenerace</h2>
                    <div class="flex gap-2">
                        <button onclick="window.toggleRegeneraceEdit()" class="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all">Zrušit</button>
                        <button onclick="window.saveRegeneraceContent()" class="px-6 py-2 rounded-xl text-xs font-black bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/20 hover:scale-105 transition-all">Uložit vše</button>
                    </div>
                </div>
            </div>

            <div class="max-w-2xl mx-auto px-4 py-8">
                <div class="flex flex-wrap gap-2 mb-8 bg-black/20 p-2 rounded-2xl border border-white/5">
                    ${[
                        { id: 'hero', icon: '🎁', label: 'Úvod' },
                        { id: 'analysis', icon: '🧬', label: 'Rozbor' },
                        { id: 'supps', icon: '💊', label: 'Suplementy' },
                        { id: 'timeline', icon: '📈', label: 'Časová osa' },
                        { id: 'manual', icon: '🥗', label: 'Manuál' },
                        { id: 'didyouknow', icon: '💡', label: 'Fakta' },
                        { id: 'science', icon: '📖', label: 'Knihovna' }
                    ].map(tab => `
                        <button onclick="window.switchEditorTab('${tab.id}')" 
                                class="flex-1 min-w-[120px] py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-black text-[10px] uppercase tracking-widest
                                ${activeEditorTab === tab.id 
                                    ? 'bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'}">
                            <span>${tab.icon}</span>
                            <span>${tab.label}</span>
                        </button>
                    `).join('')}
                </div>

                <div id="regenerace-editor-form" class="space-y-12">
                    ${renderHeroEditor(content)}
                    ${renderAnalysisEditor(content)}
                    ${renderSupplementsEditor(content)}
                    ${renderTimelineEditor(content)}
                    ${renderManualEditor(content)}
                    ${renderDidYouKnowEditor(content)}
                    ${renderScienceEditor(content)}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    setTimeout(setupEditorShortcuts, 50);
}

// ---------------------------------------------------------------------------
// KEYBOARD SHORTCUTS
// ---------------------------------------------------------------------------

function setupEditorShortcuts() {
    const form = document.getElementById('regenerace-editor-form');
    if (!form) return;

    form.onkeydown = (e) => {
        const el = e.target;
        const isInput = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text');

        if (isInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const text = el.value;
            const selectedText = text.substring(start, end);
            el.value = text.substring(0, start) + '**' + selectedText + '**' + text.substring(end);
            el.focus();
            el.selectionStart = start + 2;
            el.selectionEnd = end + 2;
            triggerHaptic('light');
        }
    };
}

// ---------------------------------------------------------------------------
// SYNC EDITOR STATE (DOM → state.regeneraceContent)
// ---------------------------------------------------------------------------

export function syncEditorState() {
    const form = document.getElementById('regenerace-editor-form');
    if (!form) return;

    const currentData = state.regeneraceContent || DEFAULT_CONTENT;
    const baseContent = {
        ...DEFAULT_CONTENT,
        ...currentData,
        analysis: currentData.analysis || DEFAULT_CONTENT.analysis,
        timeline: currentData.timeline || DEFAULT_CONTENT.timeline
    };

    const syncedContent = {
        hero: {
            title: document.getElementById('edit-hero-title')?.value || baseContent.hero.title,
            text: document.getElementById('edit-hero-text')?.value || baseContent.hero.text,
            subtext: document.getElementById('edit-hero-subtext')?.value || baseContent.hero.subtext
        },
        supplements: baseContent.supplements.map((supp, i) => {
            const iconEl = document.getElementById(`edit-supp-icon-${i}`);
            const titleEl = document.getElementById(`edit-supp-title-${i}`);
            const subEl = document.getElementById(`edit-supp-subtitle-${i}`);
            const prodEl = document.getElementById(`edit-supp-product-${i}`);
            const benEl = document.getElementById(`edit-supp-benefit-${i}`);
            const compEl = document.getElementById(`edit-supp-composition-${i}`);
            const defEl = document.getElementById(`edit-supp-deficiency-${i}`);
            const sciEl = document.getElementById(`edit-supp-science-${i}`);
            const protEl = document.getElementById(`edit-supp-protocol-${i}`);
            const bonEl = document.getElementById(`edit-supp-bonus-${i}`);
            const timeEl = document.getElementById(`edit-supp-timeline-${i}`);

            return {
                id: supp.id,
                icon: iconEl ? iconEl.value : supp.icon,
                title: titleEl ? titleEl.value : supp.title,
                subtitle: subEl ? subEl.value : supp.subtitle,
                product: prodEl ? prodEl.value : supp.product,
                benefit: benEl ? benEl.value : supp.benefit,
                composition: compEl ? compEl.value.split('\n').filter(l => l.trim()) : supp.composition,
                deficiency: defEl ? defEl.value.split('\n').filter(l => l.trim()) : supp.deficiency,
                science: sciEl ? sciEl.value.split('\n').filter(l => l.trim()) : supp.science,
                protocol: protEl ? protEl.value.split('\n').filter(l => l.trim()) : supp.protocol,
                bonus: bonEl ? bonEl.value : supp.bonus,
                timeline: timeEl ? timeEl.value.split('\n').filter(l => l.trim()).map(l => {
                    const [period, ...textParts] = l.split(':');
                    return { period: period.trim(), text: textParts.join(':').trim() };
                }) : supp.timeline
            };
        }),
        manual: baseContent.manual.map((m, i) => {
            const timeEl = document.getElementById(`edit-manual-time-${i}`);
            const titleEl = document.getElementById(`edit-manual-title-${i}`);
            const detEl = document.getElementById(`edit-manual-detail-${i}`);
            return {
                time: timeEl ? timeEl.value : m.time,
                title: titleEl ? titleEl.value : m.title,
                detail: detEl ? detEl.value : m.detail
            };
        }),
        scienceSections: (baseContent.scienceSections || []).map((section, sIdx) => {
            const titleEl = document.getElementById(`edit-science-section-${sIdx}-title`);
            const introEl = document.getElementById(`edit-science-section-${sIdx}-intro`);
            return {
                supplementId: section.supplementId,
                title: titleEl ? titleEl.value : section.title,
                intro: introEl ? introEl.value : section.intro,
                items: section.items.map((item, iIdx) => {
                    const iTitleEl = document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-title`);
                    const iTextEl = document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-text`);
                    const iResEl = document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-result`);
                    const iSrcEl = document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-source`);
                    return {
                        id: item.id,
                        title: iTitleEl ? iTitleEl.value : item.title,
                        text: iTextEl ? iTextEl.value : item.text,
                        result: iResEl ? iResEl.value : item.result,
                        source: iSrcEl ? iSrcEl.value : item.source
                    };
                })
            };
        }),
        analysis: {
            summary: document.getElementById('edit-analysis-summary')?.value || baseContent.analysis.summary,
            chapters: (baseContent.analysis?.chapters || []).map((chapter, idx) => {
                const iconEl = document.getElementById(`edit-analysis-chapter-icon-${idx}`);
                const titleEl = document.getElementById(`edit-analysis-chapter-title-${idx}`);
                const contEl = document.getElementById(`edit-analysis-chapter-content-${idx}`);
                const highEl = document.getElementById(`edit-analysis-chapter-highlight-${idx}`);
                return {
                    id: chapter.id,
                    icon: iconEl ? iconEl.value : chapter.icon,
                    title: titleEl ? titleEl.value : chapter.title,
                    content: contEl ? contEl.value : chapter.content,
                    highlight: highEl ? highEl.value : chapter.highlight
                };
            })
        },
        timeline: baseContent.timeline.map((t, i) => {
            const perEl = document.getElementById(`edit-timeline-period-${i}`);
            const textEl = document.getElementById(`edit-timeline-text-${i}`);
            return {
                period: perEl ? perEl.value : t.period,
                text: textEl ? textEl.value : t.text
            };
        }),
        didYouKnow: {
            title: document.getElementById('edit-dyk-title')?.value || baseContent.didYouKnow.title,
            subtitle: document.getElementById('edit-dyk-subtitle')?.value || baseContent.didYouKnow.subtitle,
            sections: baseContent.didYouKnow.sections.map((sec, sIdx) => {
                const iconEl = document.getElementById(`edit-dyk-section-${sIdx}-icon`);
                const titleEl = document.getElementById(`edit-dyk-section-${sIdx}-title`);
                return {
                    icon: iconEl ? iconEl.value : sec.icon,
                    title: titleEl ? titleEl.value : sec.title,
                    items: sec.items.map((item, iIdx) => {
                        const iTitleEl = document.getElementById(`edit-dyk-section-${sIdx}-item-${iIdx}-title`);
                        const iTextEl = document.getElementById(`edit-dyk-section-${sIdx}-item-${iIdx}-text`);
                        return {
                            title: iTitleEl ? iTitleEl.value : item.title,
                            text: iTextEl ? iTextEl.value : item.text
                        };
                    })
                };
            })
        }
    };

    state.regeneraceContent = syncedContent;
}

// ---------------------------------------------------------------------------
// SAVE TO DATABASE
// ---------------------------------------------------------------------------

export async function saveRegeneraceContent(renderRegeneraceFn) {
    triggerHaptic('success');
    syncEditorState();

    if (state.regeneraceContent.scienceSections) {
        state.regeneraceContent.scienceSections.forEach(section => {
            section.items.forEach((item, idx) => item.id = idx + 1);
        });
    }

    const newContent = state.regeneraceContent;

    try {
        const { error } = await supabase.from('app_knowledge').upsert({
            key: 'regenerace_manual',
            content: newContent,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (error) throw error;

        state.regeneraceContent = newContent;
        renderRegeneraceFn();
        if (window.showNotification) window.showNotification('Regenerace úspěšně uložena! 🌿', 'success');
    } catch (err) {
        console.error('Save Error:', err);
        if (window.showNotification) window.showNotification('Chyba při ukládání: ' + err.message, 'error');
    }
}
