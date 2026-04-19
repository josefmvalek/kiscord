import { state, stateEvents, ensureRegeneraceData } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { supabase } from '../core/supabase.js';
import { DEFAULT_CONTENT, SUPPLEMENT_THEMES, REGENERACE_START_DATE } from './regenerace/data.js';



let isEditMode = false;
let isHeroCollapsed = true;
let isAnalysisCollapsed = true;
let isManualCollapsed = true;
let isTimelineCollapsed = true;
let isDidYouKnowCollapsed = true;
let collapsedScienceSections = {}; // Track by index or supplementId
let collapsedAnalysisChapters = [true, true, true, true];
let activeEditorTab = 'hero'; 


// --- RENDERING COMPONENTS ---

function renderSupplementCard(supp) {
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

function renderManualItem(m, idx, contentCount) {
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

function renderTimelineCard(t, idx) {
    const themes = [
        { accent: 'text-purple-400', border: 'border-purple-500/20', bg: 'from-purple-500/5', icon: '🧠', shadow: 'shadow-purple-500/10' },
        { accent: 'text-blue-400', border: 'border-blue-500/20', bg: 'from-blue-500/5', icon: '🌬️', shadow: 'shadow-blue-500/10' },
        { accent: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'from-yellow-500/5', icon: '✨', shadow: 'shadow-yellow-500/10' },
        { accent: 'text-green-400', border: 'border-green-500/20', bg: 'from-green-500/5', icon: '🛡️', shadow: 'shadow-green-500/10' }
    ];
    const theme = themes[idx] || themes[0];
    const parsed = formatTimelineCard(t.text);

    // Dynamic State Logic
    const now = new Date();
    const start = new Date(REGENERACE_START_DATE);
    const diffMs = now - start;
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    
    let state = 'future'; 
    const dayRanges = [3, 14, 30, 60];
    const currentThreshold = dayRanges[idx];
    const prevThreshold = idx > 0 ? dayRanges[idx - 1] : -1;

    if (diffMs < 0) state = 'future';
    else if (diffDays > currentThreshold) state = 'past';
    else if (diffDays > prevThreshold && diffDays <= currentThreshold) state = 'active';

    const isActive = state === 'active';
    const isPast = state === 'past';
    const cardClass = isActive ? `shadow-[0_0_20px_rgba(255,255,255,0.05)]` : (isPast ? 'opacity-80' : 'opacity-60');
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

function renderScienceSection(section, sIdx) {
    const theme = SUPPLEMENT_THEMES[section.supplementId] || { bg: 'from-[#111a2a] to-[#0a0f1a]', accent: 'text-indigo-400', border: 'border-indigo-500/20', badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', pulse: 'bg-indigo-400' };
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

function renderDidYouKnowCard(content) {
    if (!content.didYouKnow) return '';
    
    // Indigo/Blue Theme for "Did You Know"
    const theme = {
        bg: 'from-[#1a112a] to-[#0f0a1a]', 
        border: 'border-indigo-500/20',
        accent: 'text-indigo-400',
        iconBg: 'bg-indigo-500/10'
    };

    return `
        <div id="reg-section-didyouknow" class="glass-card bg-gradient-to-br ${theme.bg} rounded-3xl border ${theme.border} overflow-hidden shadow-2xl transition-all duration-300 hover:border-indigo-500/40 relative group/sec">
            <div class="p-6 cursor-pointer flex justify-between items-center" onclick="window.toggleRegeneraceSection('didYouKnow')">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl ${theme.iconBg} border border-indigo-500/20 flex items-center justify-center group-hover/sec:scale-110 transition-transform duration-500">
                        <span class="text-2xl">💡</span>
                    </div>
                    <div>
                        <h2 class="text-white text-lg font-black uppercase tracking-[0.15em] leading-tight">${content.didYouKnow.title}</h2>
                        <p class="text-[10px] ${theme.accent} font-black uppercase tracking-widest mt-1 opacity-80">Vědecká fakta & poznatky</p>
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
                        ${content.didYouKnow.sections.map((section) => `
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
export async function renderRegenerace() {
    window.renderRegenerace = renderRegenerace; // For compatibility
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Load data if not already loaded
    await ensureRegeneraceData();
    // Merge stored data with DEFAULT_CONTENT to ensure new fields (like scienceSections) are present
    const content = state.regeneraceContent ? {
        ...DEFAULT_CONTENT,
        ...state.regeneraceContent,
        // Upgrade legacy scienceStudies (object) to scienceSections (array)
        scienceSections: (state.regeneraceContent.scienceSections && state.regeneraceContent.scienceSections.length > 0)
            ? state.regeneraceContent.scienceSections
            : (state.regeneraceContent.scienceStudies ? [state.regeneraceContent.scienceStudies] : DEFAULT_CONTENT.scienceSections)
    } : DEFAULT_CONTENT;

    // --- ICON SYNC MIGRATION ---
    content.supplements = content.supplements.map(supp => {
        if (supp.id === 'iron' && (supp.icon === '🔴' || !supp.icon)) supp.icon = '🩸';
        if (supp.id === 'zinc' && (supp.icon === '🟡' || !supp.icon)) supp.icon = '✨';
        return supp;
    });

    if (isEditMode) {
        renderEditor(container, content);
    } else {
        renderView(container, content);
    }
}


function renderHolisticAnalysis(content) {
    if (!content.analysis) return '';
    
    // Emerald Theme for Analysis
    const theme = {
        bg: 'from-[#0b2e24] to-[#0a1a16]',
        border: 'border-emerald-500/20',
        accent: 'text-emerald-400',
        iconBg: 'bg-emerald-500/10'
    };

    return `
        <!-- Holistic Analysis Section -->
        <div id="reg-section-analysis" class="glass-card bg-gradient-to-br ${theme.bg} rounded-3xl border ${theme.border} overflow-hidden shadow-2xl transition-all duration-300 hover:border-emerald-500/40 relative group/sec">
            <div class="p-6 cursor-pointer flex justify-between items-center" onclick="window.toggleRegeneraceSection('analysis')">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl ${theme.iconBg} border border-emerald-500/20 flex items-center justify-center group-hover/sec:scale-110 transition-transform duration-500">
                        <span class="text-2xl">🌿</span>
                    </div>
                    <div>
                        <h2 class="text-white text-lg font-black uppercase tracking-[0.15em] leading-tight">Holistický Rozbor</h2>
                        <p class="text-[10px] ${theme.accent} font-black uppercase tracking-widest mt-1 opacity-80">Cesta k obnově vitality</p>
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

                    <!-- Analysis Chapters -->
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
                ${renderHolisticAnalysis(content)}

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
                ${renderDidYouKnowCard(content)}

                <!-- Science Library Section -->
                <div id="reg-section-science" class="space-y-4">
                    ${(content.scienceSections || []).map((section, sIdx) => renderScienceSection(section, sIdx)).join('')}
                </div>

            </div>
        </div>
    `;

    container.innerHTML = html;
}
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
                            <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Podnadpis & Produkt</label>
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


function renderEditor(container, content) {
    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] relative pb-32">
            <!-- Header -->
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
                
                <!-- Tab Navigation -->
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
                
                    <!-- Hero Section -->
                    ${renderHeroEditor(content)}

                    <!-- Holistic Analysis Editor -->
                    ${renderAnalysisEditor(content)}

                    <!-- Supplements Sections -->
                    ${renderSupplementsEditor(content)}

                    <!-- Timeline Editor -->
                    ${renderTimelineEditor(content)}

                    <!-- Manual Editor -->
                    ${renderManualEditor(content)}

                    <!-- Did You Know Editor -->
                    ${renderDidYouKnowEditor(content)}

                    <!-- Science Sections Editor -->
                    ${renderScienceEditor(content)}

                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    setTimeout(setupEditorShortcuts, 50);
}


// Helper: Enhanced Markdown Parser
function parseMarkdown(text) {
    if (!text) return '';
    return text
        // Bold: **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        // Italic: _text_
        .replace(/_(.*?)_/g, '<em class="italic opacity-90">$1</em>')
        // Links: [text](url)
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-indigo-400 hover:text-indigo-300 underline font-black transition-colors">$1</a>')
        // Bullets: Start of line with - or *
        .replace(/^[\-\*]\s(.*)/gm, '<div class="flex items-start gap-2 mb-1"><span class="text-white/40">•</span><span>$1</span></div>')
        // Character prefixes (e.g., "Note: ")
        .replace(/^(.*?):\s/gm, '<span class="text-white/40 font-black uppercase tracking-widest text-[8px] block mb-1">$1:</span> ')
        // Newlines
        .replace(/\n/g, '<br>');
}

function formatTimelineCard(text) {
    const lines = text.split('\n');
    let title = '';
    let sections = [];

    // The first line is always the title
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
            // No label found
            if (sections.length === 0) {
                // Initial content without label (General Description)
                sections.push({ label: '📝 POPIS', content: trimmed });
            } else {
                // Append to previous section
                sections[sections.length - 1].content += ' ' + trimmed;
            }
        }
    });

    return { title, sections };
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
    activeEditorTab = tab;
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
function setupEditorShortcuts() {
    const form = document.getElementById('regenerace-editor-form');
    if (!form) return;

    // Use a single listener for the whole form (delegation)
    form.onkeydown = (e) => {
        const el = e.target;
        const isInput = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text');

        if (isInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();

            const start = el.selectionStart;
            const end = el.selectionEnd;
            const text = el.value;
            const selectedText = text.substring(start, end);

            // Wrap with **
            const newText = text.substring(0, start) + '**' + selectedText + '**' + text.substring(end);
            el.value = newText;

            // Reset selection and focus
            el.focus();
            el.selectionStart = start + 2;
            el.selectionEnd = end + 2;

            triggerHaptic('light');
        }
    };
}

/**
 * Capture all current input values from the DOM and update state.regeneraceContent. 
 * This ensures data persistence during tab switching.
 */
function syncEditorState() {
    const form = document.getElementById('regenerace-editor-form');
    if (!form) return;

    const currentData = state.regeneraceContent || DEFAULT_CONTENT;
    
    // Ensure nested objects exist to avoid crashes
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

window.saveRegeneraceContent = async () => {
    triggerHaptic('success');
    
    syncEditorState();
    
    // Final re-index of everything to ensure data consistency in DB
    if (state.regeneraceContent.scienceSections) {
        state.regeneraceContent.scienceSections.forEach(section => {
            section.items.forEach((item, idx) => item.id = idx + 1);
        });
    }

    // Now state.regeneraceContent is fully updated
    const newContent = state.regeneraceContent;

    try {
        const { error } = await supabase.from('app_knowledge').upsert({
            key: 'regenerace_manual',
            content: newContent,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (error) throw error;

        state.regeneraceContent = newContent;
        isEditMode = false;
        renderRegenerace();
        if (window.showNotification) window.showNotification('Regenerace úspěšně uložena! 🌿', 'success');
    } catch (err) {
        console.error("Save Error:", err);
        if (window.showNotification) window.showNotification('Chyba při ukládání: ' + err.message, 'error');
    }
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

