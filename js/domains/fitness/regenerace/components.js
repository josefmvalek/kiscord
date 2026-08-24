/**
 * regenerace/components.js
 * Pure render komponenty a textové helper funkce pro Regenerace modul.
 *
 * Exportuje:
 *  - renderSupplementCard(supp)
 *  - renderManualItem(m, idx, contentCount)
 *  - renderTimelineCard(t, idx)
 *  - renderScienceSection(section, sIdx, collapsedScienceSections)
 *  - renderDidYouKnowCard(content, isDidYouKnowCollapsed)
 *  - renderHolisticAnalysis(content, isAnalysisCollapsed, collapsedAnalysisChapters)
 *  - parseMarkdown(text)
 *  - formatTimelineCard(text)
 */

import { SUPPLEMENT_THEMES, REGENERACE_START_DATE } from './data.js';

// ---------------------------------------------------------------------------
// HELPER: Enhanced Markdown Parser
// ---------------------------------------------------------------------------

export function parseMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        .replace(/_(.*?)_/g, '<em class="italic opacity-90">$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-indigo-400 hover:text-indigo-300 underline font-black transition-colors">$1</a>')
        .replace(/^[\-\*]\s(.*)/gm, '<div class="flex items-start gap-2 mb-1"><span class="text-white/40">•</span><span>$1</span></div>')
        .replace(/^(.*?):\s/gm, '<span class="text-white/40 font-black uppercase tracking-widest text-[8px] block mb-1">$1:</span> ')
        .replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// HELPER: Timeline Card Text Parser
// ---------------------------------------------------------------------------

export function formatTimelineCard(text) {
    const lines = text.split('\n');
    let title = '';
    let sections = [];

    if (lines[0]) {
        title = lines[0].trim();
        lines.shift();
    }

    let currentSection = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let label = '';
        let content = '';

        if (trimmed.startsWith('Co se děje:')) {
            label = '🔬 MECHANISMUS';
            content = trimmed.replace('Co se děje:', '').trim();
        } else if (trimmed.startsWith('Pocit:')) {
            label = '🧘 TVŮJ POCIT';
            content = trimmed.replace('Pocit:', '').trim();
        } else if (trimmed.startsWith('Bonus:')) {
            label = '🎁 BONUS';
            content = trimmed.replace('Bonus:', '').trim();
        } else if (trimmed.startsWith('Výsledek:')) {
            label = '⚡ VÝSLEDEK';
            content = trimmed.replace('Výsledek:', '').trim();
        } else if (trimmed.startsWith('Klíčový zlom:')) {
            label = '🔑 KLÍČOVÝ ZLOM';
            content = trimmed.replace('Klíčový zlom:', '').trim();
        }

        if (label) {
            sections.push({ label, content });
        } else {
            if (sections.length === 0) {
                sections.push({ label: '📝 POPIS', content: trimmed });
            } else {
                sections[sections.length - 1].content += ' ' + trimmed;
            }
        }
    });

    return { title, sections };
}

// ---------------------------------------------------------------------------
// COMPONENT: Supplement Card
// ---------------------------------------------------------------------------

export function renderSupplementCard(supp) {
    const theme = SUPPLEMENT_THEMES[supp.id] || SUPPLEMENT_THEMES.default;
    return `
        <div class="supplement-item bg-gradient-to-br ${theme.bg} rounded-2xl border ${theme.border} overflow-hidden transition-all duration-300 ${theme.glow}" id="supp-${supp.id}">
            <div class="p-6 cursor-pointer flex items-center justify-between group" onclick="window.toggleSupplementDetail('${supp.id}')">
                <div class="flex items-center gap-5">
                    <div class="w-12 h-12 ${theme.iconBg} rounded-xl flex items-center justify-center text-3xl transition-transform group-hover:rotate-12">${supp.icon}</div>
                    <div>
                        <h4 class="text-white font-black uppercase text-sm tracking-widest">${supp.title}</h4>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-60">${supp.subtitle}</p>
                    </div>
                </div>
                <div class="text-white/20 transition-transform duration-500 transform" id="arrow-${supp.id}"><i class="fas fa-chevron-down"></i></div>
            </div>
            <div class="transition-all duration-700 overflow-hidden max-h-0 opacity-0 px-6 pb-0" id="detail-${supp.id}">
                <div class="pt-6 border-t border-white/5 space-y-8 pb-6">
                    
                    ${supp.benefit ? `
                    <div class="bg-gradient-to-r ${theme.benefit} p-4 rounded-xl border-l-4 ${theme.benefitBorder} shadow-inner">
                        <h5 class="text-[10px] font-black ${theme.benefitText} uppercase tracking-[0.2em] mb-1">Klíčový přínos</h5>
                        <p class="text-white font-bold text-sm leading-relaxed">${supp.benefit}</p>
                    </div>
                    ` : ''}

                    <div class="flex flex-col gap-6">
                        <p class="text-[10px] text-gray-500 font-black uppercase tracking-widest opacity-80 pl-1">${supp.product}</p>
                        
                        ${supp.composition ? `
                        <div class="bg-black/20 rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <i class="fas fa-microscope text-4xl"></i>
                            </div>
                            <h5 class="text-[10px] font-black ${theme.accent} uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <i class="fas fa-vial"></i> Co najdeš v každé dávce?
                            </h5>
                            <div class="flex flex-col gap-3">
                                ${supp.composition.map(c => {
                                    const accentColor = theme.accent.replace('text-', '');
                                    const colonIndex = c.indexOf(':');
                                    let title = c;
                                    let desc = '';
                                    if (colonIndex !== -1) {
                                        title = c.substring(0, colonIndex).replace(/\*\*/g, '').trim();
                                        desc = c.substring(colonIndex + 1).trim();
                                    } else {
                                        title = c.replace(/\*\*/g, '').trim();
                                    }
                                    return `
                                    <div class="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all group/item shadow-sm">
                                        <div class="mt-1.5 w-1.5 h-1.5 rounded-full bg-${accentColor} shadow-[0_0_12px_rgba(255,255,255,0.15)] flex-shrink-0"></div>
                                        <div class="text-[11.5px] leading-relaxed">
                                            <span class="font-black text-white tracking-wide">${title}${desc ? ':' : ''}</span>
                                            ${desc ? `<span class="text-white/60 font-medium ml-1">${parseMarkdown(desc)}</span>` : ''}
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                        <div class="space-y-4">
                            <h5 class="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <i class="fas fa-bullseye opacity-50"></i> Jak vypadá tvůj nedostatek?
                            </h5>
                            <div class="space-y-3">
                                ${supp.deficiency.map(d => `
                                    <div class="group/item flex items-start gap-3 bg-white/[0.02] hover:bg-red-500/[0.05] p-3 rounded-xl border border-white/5 hover:border-red-500/10 transition-all">
                                        <div class="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60 group-hover/item:opacity-100 transition-opacity"></div>
                                        <div class="text-sm text-gray-200 leading-relaxed group-hover/item:text-white transition-colors">${parseMarkdown(d)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-4">
                            <h5 class="text-[10px] font-black ${theme.accent} uppercase tracking-widest mb-4 flex items-center gap-2">
                                <i class="fas fa-atom opacity-50"></i> Proč tato forma funguje?
                            </h5>
                            <div class="space-y-4">
                                <div class="text-sm text-gray-200 space-y-3 leading-relaxed">
                                    ${supp.science.map(s => `<p class="pl-4 border-l border-white/10">${parseMarkdown(s)}</p>`).join('')}
                                </div>
                                <div class="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10 mt-6 relative overflow-hidden group/bonus">
                                    <i class="fas fa-lightbulb absolute -right-3 -bottom-3 text-5xl opacity-5 group-hover/bonus:scale-110 group-hover/bonus:opacity-10 transition-all duration-700"></i>
                                    <p class="text-xs text-indigo-200/90 leading-relaxed italic opacity-80 relative z-10">${supp.bonus}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        ${supp.protocol ? `
                        <div class="bg-amber-500/[0.03] rounded-2xl p-5 border border-amber-500/10">
                            <h5 class="text-[10px] font-black text-[#faa61a] uppercase tracking-widest mb-4 flex items-center gap-2">
                                <i class="fas fa-clipboard-list opacity-50"></i> Protokol užívání
                            </h5>
                            <div class="space-y-2">
                                ${supp.protocol.map(p => `
                                    <div class="flex items-center gap-3 text-sm text-gray-200">
                                        <i class="fas fa-check text-[8px] text-[#faa61a]/60"></i>
                                        <span>${parseMarkdown(p)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        ${supp.timeline ? `
                        <div class="bg-black/20 rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                            <h5 class="text-[10px] font-black ${theme.accent} uppercase tracking-widest mb-6 flex items-center gap-2">
                                <i class="fas fa-route opacity-50 text-xs"></i> Časová osa výsledků
                            </h5>
                            <div class="space-y-0 relative">
                                <div class="absolute left-[11px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>
                                ${supp.timeline.map((t, idx) => `
                                    <div class="flex items-start gap-6 relative ${idx !== supp.timeline.length - 1 ? 'pb-8' : ''}">
                                        <div class="mt-1 relative z-10">
                                            <div class="w-6 h-6 rounded-lg bg-black flex items-center justify-center border border-white/10">
                                                <div class="w-2 h-2 rounded-full ${theme.dot} ${theme.glow}"></div>
                                            </div>
                                        </div>
                                        <div class="flex flex-col">
                                            <div class="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 mb-2 w-fit">
                                                <span class="text-[9px] font-black text-white uppercase tracking-wider">${t.period}</span>
                                            </div>
                                            <span class="text-[13px] text-gray-200 font-medium leading-[1.6] transition-colors hover:text-white">${t.text}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// COMPONENT: Manual Item
// ---------------------------------------------------------------------------

export function renderManualItem(m, idx, contentCount) {
    return `
        <div class="relative group ${idx !== contentCount - 1 ? 'pb-8' : ''}">
            <div class="absolute -left-[41px] top-4 w-6 h-6 rounded-lg bg-[#2f3136] border border-white/10 flex items-center justify-center z-10 shadow-xl group-hover:scale-110 transition-transform">
                 <div class="w-1.5 h-1.5 rounded-full bg-[#3ba55c] shadow-[0_0_8px_rgba(59,165,92,0.4)]"></div>
            </div>
            <div class="bg-white/[0.02] p-5 rounded-2xl border border-white/5 group-hover:border-green-500/20 transition-all duration-500">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                    <span class="px-2 py-0.5 rounded-md bg-green-500/10 text-[9px] font-black text-green-400 uppercase tracking-widest border border-green-500/20 w-fit">
                        ${m.time}
                    </span>
                </div>
                <h4 class="text-white font-black text-sm uppercase tracking-wide mb-1 opacity-90">${m.title}</h4>
                <p class="text-[13px] text-gray-300 leading-relaxed font-medium group-hover:text-white transition-colors">${parseMarkdown(m.detail)}</p>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// COMPONENT: Timeline Card
// ---------------------------------------------------------------------------

export function renderTimelineCard(t, idx) {
    const themes = [
        { accent: 'text-purple-400', border: 'border-purple-500/20', bg: 'from-purple-500/5', icon: '🧠', shadow: 'shadow-purple-500/10' },
        { accent: 'text-blue-400', border: 'border-blue-500/20', bg: 'from-blue-500/5', icon: '🌬️', shadow: 'shadow-blue-500/10' },
        { accent: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'from-yellow-500/5', icon: '✨', shadow: 'shadow-yellow-500/10' },
        { accent: 'text-green-400', border: 'border-green-500/20', bg: 'from-green-500/5', icon: '🛡️', shadow: 'shadow-green-500/10' }
    ];
    const theme = themes[idx] || themes[0];
    const parsed = formatTimelineCard(t.text);

    const now = new Date();
    const start = new Date(REGENERACE_START_DATE);
    const diffMs = now - start;
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    let cardState = 'future';
    const dayRanges = [3, 14, 30, 60];
    const currentThreshold = dayRanges[idx];
    const prevThreshold = idx > 0 ? dayRanges[idx - 1] : -1;

    if (diffMs < 0) cardState = 'future';
    else if (diffDays > currentThreshold) cardState = 'past';
    else if (diffDays > prevThreshold && diffDays <= currentThreshold) cardState = 'active';

    const isActive = cardState === 'active';
    const isPast = cardState === 'past';
    const cardClass = isActive ? 'shadow-[0_0_20px_rgba(255,255,255,0.05)]' : (isPast ? 'opacity-80' : 'opacity-60');
    const iconClass = isActive ? `scale-110 ${theme.shadow} border-${theme.accent.replace('text-', '')}/50 animate-reg-glow` : 'opacity-50';

    return `
        <div class="relative flex gap-6 z-10 group animate-fade-in" style="animation-delay: ${idx * 150}ms">
            <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#2f3136] border border-white/10 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500 ${iconClass}">
                 <span class="text-2xl">${theme.icon}</span>
            </div>
            <div class="flex-1 glass-card bg-gradient-to-br ${theme.bg} to-transparent rounded-[2rem] p-6 border ${theme.border} ${theme.shadow} space-y-4 transition-all duration-700 ${cardClass}">
                <div class="flex justify-between items-start">
                    <div class="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        <span class="text-[9px] font-black text-white uppercase tracking-widest">${t.period}</span>
                        ${isPast ? '<i class="fas fa-check-circle text-green-500 ml-2 text-[8px]"></i>' : ''}
                    </div>
                </div>
                ${(() => {
                    const rawTitle = parsed.title.replace(/\*\*/g, '');
                    const colonIndex = rawTitle.indexOf(':');
                    if (colonIndex !== -1) {
                        const label = rawTitle.substring(0, colonIndex).trim();
                        const main = rawTitle.substring(colonIndex + 1).trim();
                        return `
                            <div class="space-y-1">
                                <span class="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1">${label}:</span>
                                <h4 class="text-white text-base font-black uppercase tracking-tight leading-tight">${parseMarkdown(main)}</h4>
                            </div>
                        `;
                    }
                    return `<h4 class="text-white text-base font-black uppercase tracking-tight leading-tight">${parseMarkdown(parsed.title)}</h4>`;
                })()}
                <div class="space-y-3 pt-1">
                    ${parsed.sections.map(sec => `
                        <div class="space-y-1 group/sec">
                            ${sec.label && sec.label !== '📝 POPIS' ? `<span class="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">${sec.label}</span>` : ''}
                            <p class="text-[12px] text-gray-300 leading-relaxed font-medium group-hover/sec:text-white transition-colors">${parseMarkdown(sec.content)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// COMPONENT: Science Section
// Přijímá collapsedScienceSections jako parametr (byl module-level state)
// ---------------------------------------------------------------------------

export function renderScienceSection(section, sIdx, collapsedScienceSections) {
    const theme = SUPPLEMENT_THEMES[section.supplementId] || {
        bg: 'from-[#111a2a] to-[#0a0f1a]',
        accent: 'text-indigo-400',
        border: 'border-indigo-500/20',
        badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
        pulse: 'bg-indigo-400'
    };
    const accentColor = theme.accent.replace('text-', '');
    const isCollapsed = collapsedScienceSections[sIdx] !== false;

    return `
        <div class="space-y-4">
            <div class="glass-card bg-gradient-to-br ${theme.bg} rounded-3xl border ${theme.border} overflow-hidden shadow-2xl transition-all duration-300 hover:border-${accentColor}/30 hover:shadow-${accentColor}/5 group/sec">
                <div class="p-6 cursor-pointer flex justify-between items-start" onclick="window.toggleRegeneraceSection('science', ${sIdx})">
                    <div class="flex flex-col gap-3">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full ${theme.badge} border w-fit">
                            <span class="w-1.5 h-1.5 rounded-full ${theme.pulse} animate-pulse"></span>
                            <span class="text-[8px] font-black uppercase tracking-[0.2em] opacity-80">Klinicky ověřeno</span>
                        </div>
                        <h3 class="text-white text-base font-black uppercase tracking-widest flex items-center gap-3">
                            <i class="fas fa-microscope text-${accentColor} opacity-50"></i> ${section.title}
                        </h3>
                        <p class="text-xs text-gray-400 leading-relaxed max-w-xl font-medium italic opacity-60">${section.intro}</p>
                    </div>
                    <div id="reg-science-chevron-${sIdx}" class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover/sec:text-white transition-all transform ${isCollapsed ? '' : 'rotate-180'} mt-1 border border-white/5 flex-shrink-0">
                        <i class="fas fa-chevron-down text-xs"></i>
                    </div>
                </div>

                <div id="reg-science-content-${sIdx}" class="transition-all duration-700 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'} px-6">
                    <div class="space-y-6 pt-2 pb-6 border-t border-white/5">
                        ${section.items.map((item, iIdx) => `
                            <div class="bg-white/[0.02] p-6 rounded-2xl border border-white/5 hover:border-${accentColor}/20 transition-all duration-300 group/item">
                                <div class="flex items-start gap-5">
                                    <div class="w-9 h-9 rounded-xl bg-${accentColor}/5 flex items-center justify-center text-${accentColor} font-black text-sm border border-${accentColor}/10 group-hover/item:bg-${accentColor}/10 transition-colors">
                                        ${iIdx + 1}
                                    </div>
                                    <div class="flex-1 space-y-3">
                                        <h4 class="text-white font-black text-[14px] uppercase tracking-wide leading-tight group-hover/item:text-${accentColor} transition-colors">${item.title}</h4>
                                        <p class="text-[13px] text-gray-300 leading-relaxed font-medium">${parseMarkdown(item.text)}</p>
                                        <div class="bg-${accentColor}/5 p-4 rounded-xl border-l-2 border-${accentColor}/30">
                                            <p class="text-[13px] text-gray-200 font-bold leading-relaxed">${parseMarkdown(item.result)}</p>
                                        </div>
                                        <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest pt-1">${item.source}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// COMPONENT: Did You Know Card
// Přijímá isDidYouKnowCollapsed jako parametr
// ---------------------------------------------------------------------------

export function renderDidYouKnowCard(content, isDidYouKnowCollapsed) {
    if (!content.didYouKnow) return '';

    return `
        <div id="reg-section-didyouknow" class="glass-card bg-gradient-to-br from-[#1a112a] to-[#0f0a1a] rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl transition-all duration-300 hover:border-indigo-500/40 relative group/sec">
            <div class="p-6 cursor-pointer flex justify-between items-center" onclick="window.toggleRegeneraceSection('didYouKnow')">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover/sec:scale-110 transition-transform duration-500">
                        <span class="text-2xl">💡</span>
                    </div>
                    <div>
                        <h2 class="text-white text-lg font-black uppercase tracking-[0.15em] leading-tight">${content.didYouKnow.title}</h2>
                        <p class="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1 opacity-80">Vědecká fakta &amp; poznatky</p>
                    </div>
                </div>
                <div id="reg-didyouknow-chevron" class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 transition-all duration-500 ${isDidYouKnowCollapsed ? '' : 'rotate-180'}">
                    <i class="fas fa-chevron-down text-xs"></i>
                </div>
            </div>

            <div id="reg-didyouknow-content" class="transition-all duration-700 overflow-hidden ${isDidYouKnowCollapsed ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100'} px-6">
                <div class="border-t border-white/5 pt-6 pb-6 space-y-6">
                    <p class="text-[13px] font-medium leading-relaxed text-indigo-100/80 italic">
                        ${parseMarkdown(content.didYouKnow.subtitle)}
                    </p>
                    <div class="grid grid-cols-1 gap-4">
                        ${content.didYouKnow.sections.map(section => `
                            <div class="bg-black/20 rounded-2xl border border-white/5 p-5 space-y-4 hover:border-indigo-500/20 transition-all">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">${section.icon}</span>
                                    <h4 class="text-white font-black text-xs uppercase tracking-wider">${section.title}</h4>
                                </div>
                                <div class="space-y-4">
                                    ${section.items.map(item => `
                                        <div class="space-y-1">
                                            <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">${item.title}</span>
                                            <p class="text-[12px] text-gray-300 leading-relaxed font-medium">
                                                ${parseMarkdown(item.text)}
                                            </p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// COMPONENT: Holistic Analysis
// Přijímá isAnalysisCollapsed a collapsedAnalysisChapters jako parametry
// ---------------------------------------------------------------------------

export function renderHolisticAnalysis(content, isAnalysisCollapsed, collapsedAnalysisChapters) {
    if (!content.analysis) return '';

    return `
        <div id="reg-section-analysis" class="glass-card bg-gradient-to-br from-[#0b2e24] to-[#0a1a16] rounded-3xl border border-emerald-500/20 overflow-hidden shadow-2xl transition-all duration-300 hover:border-emerald-500/40 relative group/sec">
            <div class="p-6 cursor-pointer flex justify-between items-center" onclick="window.toggleRegeneraceSection('analysis')">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover/sec:scale-110 transition-transform duration-500">
                        <span class="text-2xl">🌿</span>
                    </div>
                    <div>
                        <h2 class="text-white text-lg font-black uppercase tracking-[0.15em] leading-tight">Holistický Rozbor</h2>
                        <p class="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-1 opacity-80">Cesta k obnově vitality</p>
                    </div>
                </div>
                <div id="reg-analysis-chevron" class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 transition-all duration-500 ${isAnalysisCollapsed ? '' : 'rotate-180'}">
                    <i class="fas fa-chevron-down text-xs"></i>
                </div>
            </div>

            <div id="reg-analysis-content" class="transition-all duration-700 overflow-hidden ${isAnalysisCollapsed ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100'} px-6">
                <div class="border-t border-white/5 pt-6 pb-6 space-y-6">
                    <p class="text-[13px] font-medium leading-relaxed text-emerald-100/80 italic">
                        ${parseMarkdown(content.analysis.summary)}
                    </p>
                    <div class="space-y-4">
                        ${content.analysis.chapters.map((chapter, idx) => {
                            const isChapterCollapsed = collapsedAnalysisChapters[idx] !== false;
                            return `
                            <div class="bg-black/20 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
                                <div class="p-4 cursor-pointer flex justify-between items-center hover:bg-white/5 transition-colors" onclick="window.toggleAnalysisChapter(${idx})">
                                    <div class="flex items-center gap-3">
                                        <span class="text-xl">${chapter.icon}</span>
                                        <h4 class="text-white font-black text-xs uppercase tracking-wider">${chapter.title}</h4>
                                    </div>
                                    <div id="analysis-chapter-chevron-${idx}" class="text-white/20 transition-all duration-300 ${isChapterCollapsed ? '' : 'rotate-180'}">
                                        <i class="fas fa-chevron-down text-[10px]"></i>
                                    </div>
                                </div>
                                <div id="analysis-chapter-content-${idx}" class="transition-all duration-500 overflow-hidden ${isChapterCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}">
                                    <div class="px-4 pb-5 space-y-4">
                                        <div class="h-px bg-gradient-to-r from-emerald-500/20 to-transparent"></div>
                                        <p class="text-[12px] text-gray-300 leading-relaxed font-medium">
                                            ${parseMarkdown(chapter.content)}
                                        </p>
                                        ${chapter.highlight ? `
                                            <div class="bg-emerald-500/5 p-4 rounded-xl border-l-2 border-emerald-500/30">
                                                <p class="text-[12px] text-emerald-100/90 font-bold leading-relaxed">
                                                    ${parseMarkdown(chapter.highlight)}
                                                </p>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}
