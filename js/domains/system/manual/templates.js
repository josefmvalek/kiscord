/**
 * HTML Templates for Kiscord Manual (#návod)
 */

import { CATEGORIES, FLYWHEEL_NODES, SHORTCUTS, FAQS } from './data.js';

export function renderGuideItemCard(item) {
    return `
        <div class="flex flex-col justify-between bg-[#2f3136] rounded-2xl border border-white/5 hover:border-white/15 p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 group">
            
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-black/30 border border-white/5 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                            <i class="${item.icon}"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-white text-base md:text-lg group-hover:text-[#5865F2] transition-colors">
                                ${item.title}
                            </h3>
                            <span class="text-xs font-mono text-gray-400">${item.channelName}</span>
                        </div>
                    </div>

                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold border ${item.badgeColor} whitespace-nowrap">
                        ${item.badge}
                    </span>
                </div>

                <!-- Summary -->
                <p class="text-xs md:text-sm text-gray-300 leading-relaxed">
                    ${item.summary}
                </p>

                <!-- Bullets -->
                <ul class="space-y-1.5 text-xs text-gray-300">
                    ${item.bullets.map(b => `
                        <li class="flex items-start gap-2">
                            <span class="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                            <span class="leading-relaxed">${b}</span>
                        </li>
                    `).join('')}
                </ul>

                <!-- Pro Tip -->
                ${item.proTip ? `
                    <div class="bg-black/25 rounded-xl p-3 border border-amber-400/20 flex items-start gap-2.5 text-xs text-amber-200/90">
                        <i class="fas fa-lightbulb text-amber-400 mt-0.5 flex-shrink-0"></i>
                        <div class="leading-snug">
                            <strong class="text-amber-400">Pro-Tip:</strong> ${item.proTip}
                        </div>
                    </div>
                ` : ''}

                <!-- Related Channels Tags -->
                ${item.relatedChannels && item.relatedChannels.length > 0 ? `
                    <div class="pt-2 flex flex-wrap items-center gap-1.5">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Související:</span>
                        ${item.relatedChannels.map(rel => `
                            <button 
                                type="button"
                                onclick="window.manualGuide.jumpToChannel('${rel.id}')"
                                class="px-2 py-0.5 rounded-md bg-black/40 hover:bg-[#5865F2]/20 hover:text-[#5865F2] border border-white/5 text-[10px] font-medium text-gray-400 transition"
                            >
                                ${rel.name}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <!-- Footer Action Button -->
            <div class="pt-5 mt-4 border-t border-white/5 flex items-center justify-between">
                <span class="text-[11px] text-gray-400">
                    Kanál: <code class="text-gray-300 font-mono font-bold">${item.channelName}</code>
                </span>
                <button 
                    type="button"
                    onclick="window.manualGuide.jumpToChannel('${item.channelId}')"
                    class="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
                >
                    <span>Přejít do kanálu</span>
                    <i class="fas fa-arrow-right text-[10px]"></i>
                </button>
            </div>

        </div>
    `;
}

export function renderManualLayout(params) {
    const {
        activePerspective,
        explorationPct,
        exploredCount,
        keyChannelsTotal,
        activeFlywheelNode,
        activeCategory,
        searchQuery,
        activeSimulatorTab
    } = params;

    return `
        <style>
            .custom-range {
                -webkit-appearance: none;
                width: 100%;
                height: 6px;
                background: #18191c;
                border-radius: 9999px;
                outline: none;
                border: 1px solid rgba(255,255,255,0.08);
                transition: all 0.2s ease;
            }
            .custom-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #5865F2;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(88, 101, 242, 0.6);
                border: 2px solid #ffffff;
                transition: transform 0.15s ease, background-color 0.15s ease;
            }
            .custom-range::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                background: #7983f5;
            }
            .custom-range::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #5865F2;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(88, 101, 242, 0.6);
                border: 2px solid #ffffff;
                transition: transform 0.15s ease;
            }
        </style>

        <div class="h-full overflow-y-auto bg-[var(--bg-primary)] p-4 md:p-8 space-y-8 animate-fade-in custom-scrollbar text-[var(--text-normal)]">
            
            <!-- HERO HEADER -->
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5865F2]/20 via-[#eb459e]/15 to-[#faa61a]/15 p-6 md:p-10 border border-white/10 shadow-2xl backdrop-blur-xl">
                <div class="absolute -right-10 -top-10 w-48 h-48 bg-[#5865F2]/20 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -left-10 -bottom-10 w-48 h-48 bg-[#eb459e]/20 rounded-full blur-3xl pointer-events-none"></div>

                <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div class="space-y-3 text-center md:text-left max-w-2xl">
                        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white shadow-sm backdrop-blur-md">
                            <i class="fas fa-compass text-amber-400"></i>
                            <span>Interaktivní Portál Kiscord v2.5</span>
                        </div>
                        <h1 class="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
                            <span>Jak funguje Kiscord</span>
                            <span class="text-2xl md:text-3xl animate-bounce">🧭</span>
                        </h1>
                        <p class="text-sm md:text-base text-gray-300 leading-relaxed">
                            Kompletní přehled principů, propojenosti ekosystému, interaktivních simulátorů a všech 55+ kanálů vytvořených na míru pro Josefa a Klárku.
                        </p>
                    </div>

                    <!-- Quick Action Hero Widget -->
                    <div class="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto flex-shrink-0">
                        <button type="button" onclick="window.switchChannel('dashboard')" class="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-pink-500/25 transition transform active:scale-95 flex items-center justify-center gap-2.5">
                            <i class="fas fa-heart"></i>
                            <span>Otevřít Můj Den</span>
                        </button>
                        <button type="button" onclick="window.manualGuide.quickTheme()" class="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm transition transform active:scale-95 flex items-center justify-center gap-2.5 backdrop-blur-md">
                            <i class="fas fa-palette text-amber-400"></i>
                            <span>Přepnout téma</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- PERSPECTIVE SWITCHER & EXPLORER PROGRESS -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                <div class="lg:col-span-2 rounded-2xl bg-[#202225]/90 border border-white/5 p-5 backdrop-blur-md flex flex-col justify-between gap-3">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Přepínač perspektivy</span>
                        <h2 class="text-sm md:text-base font-bold text-white mt-0.5">Komu je návod přizpůsoben?</h2>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        ${[
                            { id: 'all', label: '🌟 Vše', desc: 'Všechny kanály' },
                            { id: 'klarka', label: '👸 Pro Klárku', desc: 'Zdraví & relax' },
                            { id: 'jozka', label: '🤴 Pro Jožku', desc: 'FIT & Gym' },
                            { id: 'couple', label: '💑 Společně', desc: 'Hry & Láska' }
                        ].map(p => `
                            <button 
                                type="button"
                                data-perspective="${p.id}"
                                onclick="window.manualGuide.setPerspective('${p.id}')"
                                class="perspective-btn p-2.5 rounded-xl text-left transition-all border ${
                                    activePerspective === p.id 
                                    ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25 scale-[1.02]' 
                                    : 'bg-black/20 border-white/5 text-gray-300 hover:bg-black/30 hover:text-white'
                                }"
                            >
                                <div class="font-bold text-xs">${p.label}</div>
                                <div class="text-[10px] opacity-75 truncate">${p.desc}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div id="exploration-badge-container" class="rounded-2xl bg-[#202225]/90 border border-white/5 p-5 backdrop-blur-md flex flex-col justify-between gap-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-bold">🧭</span>
                            <span class="text-xs font-bold text-white">Kiscord Průzkumník</span>
                        </div>
                        <span id="exploration-pct-text" class="text-xs font-mono font-bold text-amber-400">${explorationPct}%</span>
                    </div>

                    <div class="space-y-1.5">
                        <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                            <div id="exploration-progress-bar" class="bg-gradient-to-r from-[#5865F2] via-[#eb459e] to-[#faa61a] h-full transition-all duration-500 rounded-full" style="width: ${explorationPct}%;"></div>
                        </div>
                        <p id="exploration-desc-text" class="text-[11px] text-gray-400 flex items-center justify-between">
                            <span>Navštíveno: <strong class="text-white">${exploredCount}</strong> / ${keyChannelsTotal} modulů</span>
                            ${explorationPct === 100 ? '<span class="text-emerald-400 font-bold">Dokončeno! 🏆</span>' : '<span>Zbývá ' + (keyChannelsTotal - exploredCount) + '</span>'}
                        </p>
                    </div>
                </div>
            </div>

            <!-- INTERACTIVE ECOSYSTEM FLYWHEEL -->
            <div class="rounded-3xl bg-gradient-to-b from-[#202225] to-[#2f3136]/80 border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-4">
                    <div>
                        <div class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest">
                            <i class="fas fa-project-diagram"></i>
                            <span>The Kiscord Flywheel</span>
                        </div>
                        <h2 class="text-lg md:text-xl font-black text-white">Jak jsou data v Kiscordu propojená?</h2>
                        <p class="text-xs md:text-sm text-gray-400">Kliknutím na jednotlivé fáze zvýrazníš související moduly a tok dat v reálném čase.</p>
                    </div>

                    <button type="button" id="flywheel-reset-btn" onclick="window.manualGuide.selectFlywheelNode(null)" class="${activeFlywheelNode ? '' : 'hidden'} text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
                        Zobrazit celý koloběh
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    ${FLYWHEEL_NODES.map(node => {
                        const isSelected = activeFlywheelNode === node.id;
                        return `
                            <div 
                                data-node="${node.id}"
                                onclick="window.manualGuide.selectFlywheelNode('${node.id}')"
                                class="flywheel-node-card cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
                                    isSelected 
                                    ? 'bg-black/50 border-amber-400 shadow-lg shadow-amber-400/20 scale-105' 
                                    : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/30'
                                }"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm" style="background: ${node.color}20; color: ${node.color};">
                                        <i class="${node.icon}"></i>
                                    </div>
                                    <span class="text-[10px] font-mono text-gray-500 font-bold">FÁZE</span>
                                </div>

                                <div class="space-y-1">
                                    <h3 class="font-bold text-white text-xs md:text-sm leading-snug">${node.title}</h3>
                                    <div class="text-[10px] font-semibold" style="color: ${node.color};">${node.subtitle}</div>
                                    <p class="text-[11px] text-gray-400 leading-relaxed mt-1">${node.desc}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- LIVE SIMULATORS & PLAYGROUNDS -->
            <div class="rounded-3xl bg-[#202225] border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                        <div class="inline-flex items-center gap-1.5 text-xs font-bold text-[#5865F2] uppercase tracking-widest">
                            <i class="fas fa-flask"></i>
                            <span>Interaktivní Pískoviště</span>
                        </div>
                        <h2 class="text-lg md:text-xl font-black text-white">Vyzkoušej si principy Kiscordu naživo</h2>
                    </div>

                    <div class="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                        ${[
                            { id: 'coins', icon: 'fas fa-coins text-amber-400', label: 'Love Coins kalkulačka' },
                            { id: 'offline', icon: 'fas fa-wifi text-emerald-400', label: 'Offline Sync simulátor' },
                            { id: 'sunflower', icon: 'fas fa-sun text-yellow-400', label: 'Slunečnice náhled' }
                        ].map(tab => `
                            <button 
                                type="button"
                                data-tab="${tab.id}"
                                onclick="window.manualGuide.setSimulatorTab('${tab.id}')"
                                class="sim-tab-btn px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                                    activeSimulatorTab === tab.id 
                                    ? 'bg-[#5865F2] text-white shadow' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }"
                            >
                                <i class="${tab.icon}"></i>
                                <span>${tab.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div id="simulator-content-area" class="transition-opacity duration-200"></div>
            </div>

            <!-- SEARCH & CATEGORY FILTER BAR -->
            <div class="sticky top-0 z-20 space-y-3 bg-[var(--bg-primary)]/95 backdrop-blur-xl py-3 border-b border-white/5">
                <div class="relative w-full">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input 
                        type="text" 
                        id="manual-search-input" 
                        placeholder="Hledat funkci, kanál, téma, klávesovou zkratku..." 
                        value="${searchQuery}"
                        oninput="window.manualGuide.handleSearch(event)"
                        class="w-full bg-[#202225] text-white text-sm pl-11 pr-10 py-3 rounded-2xl border border-white/10 outline-none focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/20 transition shadow-inner"
                    >
                    ${searchQuery ? `
                        <button type="button" onclick="window.manualGuide.clearSearch()" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>

                <div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
                    ${CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return `
                            <button 
                                type="button"
                                data-category="${cat.id}"
                                onclick="window.manualGuide.setCategory('${cat.id}')"
                                class="category-btn px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
                                    isActive 
                                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' 
                                    : 'bg-[#2f3136] text-gray-300 hover:bg-[#36393f] hover:text-white border border-white/5'
                                }"
                            >
                                <span>${cat.name}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- DYNAMIC GUIDE CARDS GRID -->
            <div id="manual-cards-container" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>

            <!-- KEYBOARD SHORTCUTS & GESTURES CHEAT SHEET -->
            <div class="rounded-2xl bg-[#202225] border border-white/5 p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-bold text-white flex items-center gap-2.5">
                        <i class="fas fa-keyboard text-[#5865F2]"></i>
                        <span>Klávesové zkratky & Gesta</span>
                    </h2>
                    <span class="text-xs text-gray-400">Pro efektivní ovládání</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${SHORTCUTS.map(sc => `
                        <div class="bg-black/20 p-3.5 rounded-xl border border-white/5 flex items-start gap-3">
                            <div class="w-8 h-8 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                                <i class="${sc.icon}"></i>
                            </div>
                            <div class="space-y-1">
                                <div class="font-mono font-bold text-xs text-amber-400 bg-black/40 px-2 py-0.5 rounded border border-white/5 inline-block">
                                    ${sc.key}
                                </div>
                                <p class="text-xs text-gray-300 leading-snug">${sc.desc}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- FAQ ACCORDION -->
            <div class="rounded-2xl bg-[#202225] border border-white/5 p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-bold text-white flex items-center gap-2.5">
                        <i class="fas fa-question-circle text-amber-400"></i>
                        <span>Často kladené otázky (FAQ)</span>
                    </h2>
                    <span class="text-xs text-gray-400">Řešení častých situací</span>
                </div>

                <div class="space-y-3">
                    ${FAQS.map((faq, idx) => `
                        <div class="rounded-xl bg-black/20 border border-white/5 overflow-hidden transition">
                            <button 
                                type="button"
                                onclick="window.manualGuide.toggleFaq(${idx})" 
                                class="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition"
                            >
                                <span class="font-bold text-sm text-white">${faq.q}</span>
                                <i id="faq-icon-${idx}" class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"></i>
                            </button>
                            <div id="faq-ans-${idx}" class="hidden p-4 pt-0 text-xs md:text-sm text-gray-300 leading-relaxed border-t border-white/5 bg-black/10">
                                ${faq.a}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- FOOTER INFO -->
            <div class="text-center py-6 space-y-2 border-t border-white/5 text-xs text-gray-500">
                <p class="font-medium text-gray-400">Kiscord — Vyrobeno s láskou pro Josefa a Klárku ❤️</p>
                <p>Máš nápad na novou funkci nebo vylepšení? Dej vědět Jožkovi nebo zapiš nápad do #společné-questy!</p>
            </div>

        </div>
    `;
}
