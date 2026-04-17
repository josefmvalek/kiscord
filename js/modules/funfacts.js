
import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { triggerHaptic } from '../core/utils.js';
import { safeUpsert, safeInsert } from '../core/offline.js';

const CATEGORIES = [
    { id: 'bookmarks', title: 'Moje Oblíbené', icon: '💖', desc: 'Tvé nejoblíbenější moudrosti uložené na potom.', color: '#eb459e' },
    { id: 'raccoon', title: 'Mývalí moudra', icon: '🦝', desc: 'Vše o našich oblíbených šikulách a jejich zvycích.', color: '#5865F2' },
    { id: 'owl', title: 'Soví vědomosti', icon: '🦉', desc: 'Zajímavosti o nočních lovcích a jejich moudrosti.', color: '#faa61a' },
    { id: 'octopus', title: 'Chobotničí fakta', icon: '🐙', desc: 'Podivuhodnosti z hlubin oceánů o těchto chytrých tvorech.', color: '#3ba55c' },
    { id: 'penis', title: 'Fakty o pérech', icon: '🍌', desc: 'Všechno, co jsi (ne)chtěla vědět o lidské i zvířecí anatomii.', color: '#eb459e' },
    { id: 'fun', title: 'Ostatní zajímavosti', icon: '✨', desc: 'Mix náhodných a vtipných faktů pro dobrou náladu.', color: '#99aab5' }
];

// Helper to get progress key
function getProgressKey(catId, sub1 = '', sub2 = '') {
    let key = catId;
    if (sub1) key += `:${sub1}`;
    if (sub2) key += `:${sub2}`;
    return key;
}

// Helper to group facts by subcategory at a specific level
function getSubcategoriesAtLevel(catId, sub1 = '') {
    const facts = state.factsLibrary[catId] || [];
    const subs = {};

    facts.forEach(f => {
        let name = '';
        let s1_key = f.subcategory || '';
        let s2_key = f.subcategory_level2 || '';

        if (!sub1) {
            name = s1_key;
        } else if (s1_key === sub1) {
            name = s2_key;
        } else {
            return; // Not in this sub1
        }

        if (!subs[name]) subs[name] = { total_facts: 0, seen_facts: 0 };
        subs[name].total_facts++;

        // For progress, we need the specific leaf node key (cat:sub1:sub2)
        const progKey = getProgressKey(catId, s1_key, s2_key);
        // Note: This is an approximation for Level 1, as multiple level 2s might exist.
        // But since each fact has exactly one cat:sub1:sub2 path:
        // We only add to seen_facts if this specific fact's index is less than the progress index?
        // Actually, the progress tracking is per-path. 
    });

    // Second pass to calculate seen_facts properly based on state.funFactProgress
    Object.keys(subs).forEach(name => {
        if (!sub1) {
            // Level 1: Sum up progress for all paths starting with catId:name
            Object.keys(state.funFactProgress).forEach(pk => {
                if (pk === `${catId}:${name}` || pk.startsWith(`${catId}:${name}:`)) {
                    subs[name].seen_facts += (state.funFactProgress[pk]?.index || 0);
                }
            });
        } else {
            // Level 2: Specific path catId:sub1:name
            const pk = getProgressKey(catId, sub1, name);
            subs[name].seen_facts = (state.funFactProgress[pk]?.index || 0);
        }
    });

    return subs;
}

export function renderFunFacts() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.className = "flex-1 flex flex-col bg-[#36393f] relative overflow-hidden";

    let html = `
        <div class="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar bg-[#36393f] animate-fade-in">
            <div class="max-w-6xl mx-auto space-y-8 pb-10">
                <div class="text-center mb-10 relative">
                    <h1 class="text-4xl font-black text-white mb-2">Encyklopedie Kiscordu 📚</h1>
                    <p class="text-gray-400 font-medium">Vědomosti, které změní tvůj pohled na svět.</p>
                    <div class="mt-6 flex justify-center">
                        <button onclick="window.loadModule('funfacts').then(m => m.showAddFactModal())" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-6 py-3 rounded-2xl font-black transition shadow-lg flex items-center gap-3 transform hover:scale-105 active:scale-95 border border-white/10 uppercase tracking-widest text-xs">
                            <i class="fas fa-plus"></i> Přidat moudrost
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;

    CATEGORIES.forEach(cat => {
        let totalCount = 0;
        let totalSeen = 0;
        let percent = 0;

        if (cat.id === 'bookmarks') {
            totalCount = state.factFavorites.length;
            const progress = state.funFactProgress['bookmarks'] || { index: 0 };
            totalSeen = Math.min(progress.index, totalCount);
        } else {
            const facts = state.factsLibrary[cat.id] || [];
            totalCount = facts.length;
            Object.keys(state.funFactProgress).forEach(key => {
                if (key.startsWith(cat.id + ':') || key === cat.id) {
                    totalSeen += (state.funFactProgress[key]?.index || 0);
                }
            });
        }

        percent = totalCount > 0 ? Math.min(100, Math.round((totalSeen / totalCount) * 100)) : 0;

        html += `
            <div onclick="window.loadModule('funfacts').then(m => m.openFactCategory('${cat.id}'))" 
                 class="glass-card rounded-3xl p-6 cursor-pointer border border-white/5 hover:border-[${cat.color}]/50 hover:-translate-y-2 transition-all duration-500 shadow-2xl group relative overflow-hidden flex flex-col h-full min-h-[200px]">
                <div class="absolute -right-6 -top-6 text-9xl opacity-5 group-hover:opacity-10 transition-all duration-700 grayscale group-hover:grayscale-0 rotate-12 select-none pointer-events-none group-hover:scale-110">${cat.icon}</div>
                <div class="flex items-start justify-between mb-4">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl border border-white/10">
                        ${cat.icon}
                    </div>
                    ${cat.id === 'bookmarks' ? `<i class="fas fa-heart text-[#eb459e] animate-pulse"></i>` : ''}
                </div>
                <h3 class="text-2xl font-black text-white mb-2 group-hover:text-[${cat.color}] transition-colors tracking-tight">${cat.title}</h3>
                <p class="text-gray-400 text-sm mb-6 flex-grow pr-10 font-medium leading-relaxed">${cat.desc}</p>
                
                <div class="mt-auto">
                    <div class="flex justify-between items-end mb-2">
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">${cat.id === 'bookmarks' ? 'Tvůj výběr' : 'Míra osvícení'}</span>
                        <span class="text-xs font-mono text-white/50 font-bold">${totalSeen} / ${totalCount}</span>
                    </div>
                    <div class="w-full h-2 bg-black/20 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <div class="h-full bg-gradient-to-r from-[${cat.color}] to-[#5865F2] transition-all duration-1000 ease-out rounded-full" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

export function openFactCategory(catId, sub1 = '', sub2 = '') {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return;

    // Phase 0: Favorites handling
    let facts = [];
    if (catId === 'bookmarks') {
        Object.keys(state.factsLibrary).forEach(key => {
            const list = state.factsLibrary[key].filter(f => state.factFavorites.some(favId => String(favId) === String(f.id)));
            facts = facts.concat(list);
        });
        // Favorites don't have subcategories in this view
        sub1 = ''; sub2 = '';
    }

    // Phase 1: Subcategory Level 1 Check
    if (!sub1) {
        const sub1cats = getSubcategoriesAtLevel(catId);
        const sub1keys = Object.keys(sub1cats);
        // Only show selection if there's actual grouping needed
        if (sub1keys.length > 1 || (sub1keys.length === 1 && sub1keys[0] !== '')) {
            return renderSubcategorySelection(cat, sub1cats, 1);
        }
    }

    // Phase 2: Subcategory Level 2 Check
    if (sub1 && !sub2) {
        const sub2cats = getSubcategoriesAtLevel(catId, sub1);
        const sub2keys = Object.keys(sub2cats);
        if (sub2keys.length > 1 || (sub2keys.length === 1 && sub2keys[0] !== '')) {
            return renderSubcategorySelection(cat, sub2cats, 2, sub1);
        }
    }

    // Phase 3: Fact Card View (Leaf node)
    const targetSub1 = sub1 || '';
    const targetSub2 = sub2 || '';

    // Filter actual facts for this leaf node (if not already filtered by bookmarks)
    if (catId !== 'bookmarks') {
        if (targetSub1 === '__random__') {
            facts = state.factsLibrary[catId] || [];
            // In random mode, the order doesn't matter, we just need the pool.
            // Shuffling here is optional since nextFact will jump randomly,
            // but for the initial load, we might want a random starting point.
        } else {
            facts = (state.factsLibrary[catId] || []).filter(f =>
                (f.subcategory || '') === targetSub1 &&
                (f.subcategory_level2 || '') === targetSub2
            );
        }
    }

    const progKey = getProgressKey(catId, targetSub1, targetSub2);
    const progress = state.funFactProgress[progKey] || { index: 0, completed: false };
    
    // For random mode, if index is 0 and it's presumably a fresh entry, pick a random start.
    let currentIndex = progress.index;
    if (targetSub1 === '__random__' && currentIndex === 0 && facts.length > 0) {
        currentIndex = Math.floor(Math.random() * facts.length);
        progress.index = currentIndex;
        state.funFactProgress[progKey] = progress;
    }

    const currentFact = facts[currentIndex];
    const remaining = facts.length - currentIndex;

    let html = `
        <div class="flex-1 flex flex-col bg-[#36393f] animate-fade-in overflow-hidden relative">
            <div class="p-3 md:p-8 flex justify-between items-start z-10 shrink-0">
                <div class="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <button onclick="window.loadModule('funfacts').then(m => m.${sub2 ? `openFactCategory('${catId}', '${sub1}')` : sub1 ? `openFactCategory('${catId}')` : `renderFunFacts()`})" 
                            class="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#2f3136] hover:bg-[#eb459e] text-white flex items-center justify-center shrink-0 transition-all border border-white/5 shadow-lg group">
                        <i class="fas fa-chevron-left group-hover:-translate-x-1 transition-transform text-sm"></i>
                    </button>
                    <div class="min-w-0">
                        <h2 class="text-lg md:text-3xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3 truncate">
                            <span class="text-xl md:text-3xl shrink-0">${cat.icon}</span> ${cat.title.toUpperCase()}
                        </h2>
                        <p class="text-[9px] md:text-[10px] font-bold text-gray-500 tracking-[0.1em] md:tracking-[0.2em] uppercase mt-0.5 truncate">
                            ${sub1 ? `<span class="text-[#eb459e]">${sub1.toUpperCase()}</span>` : ''}
                            ${sub2 ? ` <i class="fas fa-chevron-right text-[7px] mx-1 opacity-50"></i> <span class="text-white opacity-70">${sub2.toUpperCase()}</span>` : ''}
                            <span class="ml-1 opacity-50">• Zbývá ${remaining}</span>
                        </p>
                    </div>
                </div>

                <button onclick="window.loadModule('funfacts').then(m => m.resetFactCategory('${catId}', '${targetSub1}', '${targetSub2}'))" 
                        class="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-[#2f3136] text-gray-400 hover:text-red-400 border border-white/5 transition-all text-[10px] md:text-xs font-bold flex items-center gap-1.5 shrink-0">
                    <i class="fas fa-undo-alt text-[9px]"></i> <span class="hidden sm:inline">RESETOVAT</span>
                </button>
            </div>

            <div class="flex-1 flex items-center justify-center p-3 md:p-4 min-h-0">
                <div class="relative w-full max-w-lg h-full md:h-auto md:aspect-[5/4] flex items-center">
                    <div id="fact-card" class="w-full premium-fact-card rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-2xl border border-white/10 flex flex-col items-center justify-center text-center group overflow-hidden transition-all duration-500 animate-fact-in max-h-full">
                        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[${cat.color}] to-[#5865F2] opacity-80"></div>
                        <i class="fas fa-quote-left absolute top-6 left-6 md:top-10 md:left-10 text-4xl md:text-6xl opacity-5 text-white group-hover:scale-110 group-hover:opacity-10 transition-all duration-700"></i>
                        <i class="fas fa-quote-right absolute bottom-6 right-6 md:bottom-10 md:right-10 text-4xl md:text-6xl opacity-5 text-white group-hover:scale-110 group-hover:opacity-10 transition-all duration-700"></i>
                        
                        <!-- Favorite Button -->
                        <button onclick="window.loadModule('funfacts').then(m => m.toggleFactFavorite('${currentFact?.id}', '${catId}', '${targetSub1}', '${targetSub2}'))" 
                                class="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 z-20">
                            <i class="fas fa-heart ${state.factFavorites.some(favId => String(favId) === String(currentFact?.id)) ? 'fact-glowing-heart' : 'text-white/20'} text-lg md:text-xl transition-all"></i>
                        </button>

                        <div class="mb-5 md:mb-10 w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-[2rem] bg-white/5 flex items-center justify-center text-5xl md:text-6xl shadow-2xl border border-white/10 animate-float transform group-hover:scale-110 transition-all duration-700 shrink-0">
                            ${(currentFact && currentFact.icon) || cat.icon}
                        </div>

                        <div class="relative z-10 w-full overflow-y-auto custom-scrollbar max-h-full py-2">
                            ${!currentFact ? `
                                <h3 class="text-xl md:text-2xl font-bold text-white mb-2">Vše probráno! 🎉</h3>
                                <p class="text-gray-400 text-xs md:text-sm">Právě jsi nasála všechnu moudrost této sekce.</p>
                            ` : `
                                <p class="text-base md:text-2xl lg:text-3xl font-bold text-white leading-relaxed md:leading-relaxed tracking-tight px-1 md:px-2">
                                    ${currentFact.text}
                                </p>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-4 pb-8 md:p-8 md:pb-12 flex justify-center gap-4 md:gap-6 z-10 shrink-0">
                <button onclick="window.loadModule('funfacts').then(m => m.prevFact('${catId}', '${targetSub1}', '${targetSub2}'))" 
                        class="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-2xl hover:bg-white/10">
                    <i class="fas fa-arrow-left text-lg md:text-xl"></i>
                </button>

                <button onclick="window.loadModule('funfacts').then(m => m.nextFact('${catId}', '${targetSub1}', '${targetSub2}'))" 
                        class="flex-1 max-w-[240px] md:px-12 h-14 md:h-16 rounded-2xl bg-gradient-to-br from-[#eb459e] shadow-[0_10px_30px_rgba(235,69,158,0.4)] to-[#5865F2] text-white font-black text-xs md:text-sm tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all hover:scale-110 active:scale-95 shadow-2xl group border border-white/20">
                        <i class="fas fa-sparkles text-sm md:text-base"></i> DALŠÍ
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderSubcategorySelection(cat, subcats, level, existingSub1 = '') {
    const container = document.getElementById("messages-container");
    const subkeys = Object.keys(subcats);

    // Sort keys alphabetically but keep empty key first
    subkeys.sort((a, b) => {
        if (a === '') return -1;
        if (b === '') return 1;
        return a.localeCompare(b);
    });

    let html = `
        <div class="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar bg-[#36393f] animate-fade-in">
            <div class="max-w-4xl mx-auto space-y-8">
                <div class="flex items-center gap-6 mb-12">
                    <button onclick="window.loadModule('funfacts').then(m => m.${level === 2 ? `openFactCategory('${cat.id}')` : `renderFunFacts()`})" 
                            class="w-14 h-14 rounded-2xl bg-[#2f3136] hover:bg-[#eb459e] text-white flex items-center justify-center transition-all border border-white/5 shadow-2xl group active:scale-95">
                        <i class="fas fa-arrow-left text-xl group-hover:-translate-x-1 transition-transform"></i>
                    </button>
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <span class="text-4xl filter drop-shadow-lg">${cat.icon}</span>
                            <h2 class="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">${cat.title}</h2>
                        </div>
                        <p class="text-gray-400 font-medium ml-1">
                            ${level === 1 ? 'Vyber si hlavní oblast moudrosti.' : `Sekce: <span class="text-[#eb459e] font-black uppercase tracking-widest">${existingSub1}</span>`}
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
    `;

    subkeys.forEach(sub => {
        const stats = subcats[sub];
        const label = sub || 'Obecné moudra';

        // Progress is handled by index / total in this app
        const totalCount = stats.total_facts || 0;
        const seenCount = stats.seen_facts || 0;
        const percent = totalCount > 0 ? Math.min(100, Math.round((seenCount / totalCount) * 100)) : 0;

        html += `
            <div onclick="window.loadModule('funfacts').then(m => m.openFactCategory('${cat.id}', '${level === 1 ? sub : existingSub1}', '${level === 2 ? sub : ''}'))"
                 class="premium-fact-sub-card rounded-[2rem] p-6 cursor-pointer border border-white/5 hover:border-[${cat.color}]/50 transition-all duration-500 group relative overflow-hidden flex flex-col min-h-[140px] shadow-2xl">
                
                <!-- Background Icon Decor -->
                <div class="absolute -right-4 -bottom-4 text-8xl opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700 pointer-events-none select-none grayscale group-hover:grayscale-0">
                    ${cat.icon}
                </div>

                <div class="flex items-start justify-between gap-4 mb-auto relative z-10">
                    <span class="text-xs font-black uppercase tracking-[0.2em] text-[#eb459e] group-hover:text-white transition-colors leading-relaxed drop-shadow-sm flex-1">${label}</span>
                    <div class="shrink-0 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 group-hover:border-[${cat.color}]/30 transition-all">
                        <span class="text-[10px] font-mono text-white/60 group-hover:text-white font-bold tracking-wider">${seenCount} / ${totalCount}</span>
                    </div>
                </div>

                <div class="mt-8 relative z-10">
                    <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div class="h-full bg-gradient-to-r from-[${cat.color}] to-[#5865F2] transition-all duration-1000 ease-out rounded-full shadow-[0_0_15px_[${cat.color}]]" 
                             style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>
        `;
    });

    // Special: Random All for Penis category
    if (cat.id === 'penis' && level === 1) {
        const allFacts = state.factsLibrary[cat.id] || [];
        const totalCount = allFacts.length;
        const prog = state.funFactProgress['penis:__random__'] || { index: 0 };
        const seenCount = prog.index;
        const percent = totalCount > 0 ? Math.round((seenCount / totalCount) * 100) : 0;

        html += `
            <div onclick="window.loadModule('funfacts').then(m => m.openFactCategory('${cat.id}', '__random__'))"
                 class="premium-fact-sub-card rounded-[2rem] p-6 cursor-pointer border-2 border-dashed border-[#eb459e]/30 hover:border-[#eb459e] transition-all duration-500 group relative overflow-hidden flex flex-col min-h-[140px] shadow-2xl bg-[#eb459e]/5">
                
                <div class="absolute -right-4 -bottom-4 text-8xl opacity-[0.1] group-hover:opacity-[0.2] transition-all duration-700 pointer-events-none select-none grayscale-0 scale-110 rotate-12">🔀</div>

                <div class="flex items-start justify-between gap-4 mb-auto relative z-10">
                    <span class="text-xs font-black uppercase tracking-[0.2em] text-[#eb459e] group-hover:text-white transition-colors leading-relaxed drop-shadow-sm flex-1">NÁHODNÝ MIX</span>
                    <div class="shrink-0 bg-black/40 px-3 py-1.5 rounded-xl border border-[#eb459e]/20 group-hover:border-[#eb459e]/50 transition-all">
                        <span class="text-[10px] font-mono text-[#eb459e] group-hover:text-white font-bold tracking-wider">${seenCount} / ${totalCount}</span>
                    </div>
                </div>

                <p class="text-[9px] text-gray-500 font-bold mb-4 relative z-10">Všechna fakta z této sekce promíchaná dohromady!</p>

                <div class="mt-auto relative z-10">
                    <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div class="h-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] transition-all duration-1000 ease-out rounded-full" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>
        `;
    }


    html += `
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

export function nextFact(catId, sub1 = '', sub2 = '') {
    let facts = [];
    if (catId === 'bookmarks') {
        Object.keys(state.factsLibrary).forEach(key => {
            const list = state.factsLibrary[key].filter(f => state.factFavorites.includes(f.id));
            facts = facts.concat(list);
        });
    } else if (sub1 === '__random__') {
        const allFacts = state.factsLibrary[catId] || [];
        facts = deterministicShuffleLocal(allFacts, `random-${catId}`);
    } else {
        facts = (state.factsLibrary[catId] || []).filter(f =>
            (f.subcategory || '') === sub1 &&
            (f.subcategory_level2 || '') === sub2
        );
    }

    const progKey = getProgressKey(catId, sub1, sub2);
    const progress = state.funFactProgress[progKey] || { index: 0, completed: false };

    if (sub1 === '__random__' && facts.length > 1) {
        // True random jump: pick any DIFFERENT index
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * facts.length);
        } while (newIndex === progress.index);
        
        progress.index = newIndex;
        // Optimization: in random mode we can track stats differently, 
        // but for now let's just use seen counts as "clicks" or total unique?
        // Let's just keep the last index for persistence.
    } else if (progress.index < facts.length) {
        progress.index++;
    } else {
        return; // Already at end
    }

    state.funFactProgress[progKey] = progress;

    safeUpsert('fun_fact_progress', {
        category_id: catId,
        subcategory_id: sub1,
        subcategory_level2_id: sub2,
        user_id: state.currentUser.id,
        current_index: progress.index,
        completed: sub1 !== '__random__' && progress.index >= facts.length,
        updated_at: new Date().toISOString()
    });

    if (sub1 !== '__random__' && progress.index >= facts.length) {
        import('./achievements.js').then(m => m.autoUnlock('fact_enthusiast'));
    }

    triggerHaptic('success');
    openFactCategory(catId, sub1, sub2);
}

export function prevFact(catId, sub1 = '', sub2 = '') {
    const progKey = getProgressKey(catId, sub1, sub2);
    const progress = state.funFactProgress[progKey] || { index: 0, completed: false };

    if (sub1 === '__random__') {
        const facts = state.factsLibrary[catId] || [];
        if (facts.length > 1) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * facts.length);
            } while (newIndex === progress.index);
            progress.index = newIndex;
        }
    } else if (progress.index > 0) {
        progress.index--;
    } else {
        return; // Already at start
    }

    state.funFactProgress[progKey] = progress;

    safeUpsert('fun_fact_progress', {
        category_id: catId,
        subcategory_id: sub1,
        subcategory_level2_id: sub2,
        user_id: state.currentUser.id,
        current_index: progress.index,
        completed: false,
        updated_at: new Date().toISOString()
    });

    triggerHaptic('light');
    openFactCategory(catId, sub1, sub2);
}


export function resetFactCategory(catId, sub1 = '', sub2 = '') {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const overlay = document.createElement("div");
    overlay.id = "reset-confirm-overlay";
    overlay.className = "absolute inset-0 z-[100] flex items-center justify-center bg-[#18191c]/80 backdrop-blur-md animate-fade-in p-4";
    overlay.innerHTML = `
        <div class="bg-[#2f3136] rounded-[2rem] p-8 md:p-10 max-w-sm w-full shadow-2xl border border-white/5 text-center animate-scale-up">
            <div class="w-16 h-16 rounded-2xl bg-[#202225] text-red-400 flex items-center justify-center text-2xl mx-auto mb-6 shadow-inner">
                <i class="fas fa-trash-alt"></i>
            </div>
            <h3 class="text-xl font-black text-white mb-3">Začít od začátku?</h3>
            <p class="text-gray-400 text-sm mb-10 leading-relaxed px-4">Opravdu chceš tuto sekci vymazat a nasávat všechnu moudrost znovu od nuly? 🧹</p>
            
            <div class="flex flex-col gap-3">
                <button id="confirm-reset-btn" class="w-full py-4 bg-[#ed4245] hover:bg-[#c03537] text-white font-black rounded-xl transition-all shadow-xl active:scale-95">
                    ANO, SMAZAT POKROK
                </button>
                <button onclick="document.getElementById('reset-confirm-overlay').remove()" class="w-full py-4 bg-transparent text-gray-400 hover:text-white font-bold rounded-xl transition-all">
                    ZRUŠIT
                </button>
            </div>
        </div>
    `;

    container.appendChild(overlay);

    document.getElementById("confirm-reset-btn").onclick = () => {
        const progKey = getProgressKey(catId, sub1, sub2);
        state.funFactProgress[progKey] = { index: 0, completed: false };

        safeUpsert('fun_fact_progress', {
            category_id: catId,
            subcategory_id: sub1,
            subcategory_level2_id: sub2,
            user_id: state.currentUser.id,
            current_index: 0,
            completed: false,
            updated_at: new Date().toISOString()
        });

        triggerHaptic('warning');
        overlay.remove();
        openFactCategory(catId, sub1, sub2);

        if (window.showNotification) window.showNotification("Sekce byla resetována! ✨", "info");
    };
}

export function showAddFactModal() {
    const modal = document.createElement('div');
    modal.id = 'fact-add-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';

    modal.innerHTML = `
        <div class="glass-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-scale-in">
            <div class="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 class="text-xl font-black text-white tracking-[0.2em] uppercase text-center w-full ml-6">Přidat moudrost 📜</h3>
                <button onclick="this.closest('#fact-add-modal').remove()" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/10">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <div class="p-8 space-y-8 overflow-y-auto custom-scrollbar" style="max-height: 65vh;">
                 <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-4 text-center tracking-[0.3em]">Oblast poznání</label>
                    <div class="grid grid-cols-2 gap-3">
                        ${CATEGORIES.filter(c => c.id !== 'bookmarks').map(c => `
                            <button onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-white/10', 'scale-105')); this.classList.add('border-[#eb459e]', 'bg-white/10', 'scale-105'); window.selectedFactCatId = '${c.id}'" 
                                    class="p-4 rounded-2xl border-2 border-transparent bg-white/5 text-white transition-all duration-300 hover:bg-white/10 flex flex-col items-center gap-2 group">
                                <span class="text-3xl transition group-hover:scale-110 mb-1">${c.icon}</span>
                                <span class="text-[10px] font-black uppercase tracking-widest opacity-70 group-hover:opacity-100">${c.title.split(' ')[0]}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-[0.2em]">1. Podkategorie</label>
                        <input type="text" id="nf-sub1" placeholder="Např. Anatomie..." 
                               class="w-full bg-white/5 text-white p-4 rounded-2xl border border-white/5 focus:border-[#5865F2] focus:bg-white/10 outline-none transition-all shadow-inner text-sm font-medium">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-[0.2em]">2. Podkategorie</label>
                        <input type="text" id="nf-sub2" placeholder="Např. Tkáně..." 
                               class="w-full bg-white/5 text-white p-4 rounded-2xl border border-white/5 focus:border-[#5865F2] focus:bg-white/10 outline-none transition-all shadow-inner text-sm font-medium">
                    </div>
                </div>
                
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-[0.2em]">Geniální myšlenka</label>
                    <textarea id="nf-text" placeholder="Sem napiš to moudro, co nám vyrazí dech..." class="w-full bg-white/5 text-white p-6 rounded-2xl border border-white/5 focus:border-[#5865F2] focus:bg-white/10 outline-none transition-all min-h-[140px] shadow-inner text-lg leading-relaxed font-bold"></textarea>
                </div>
            </div>
            
            <div class="p-8 bg-white/5 border-t border-white/5">
                <button onclick="window.loadModule('funfacts').then(m => m.saveNewFact())" class="w-full bg-gradient-to-r from-[#5865F2] to-[#eb459e] text-white py-5 rounded-2xl font-black text-lg transition-all shadow-2xl transform active:scale-95 uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(88,101,242,0.3)]">
                    Zapsat do historie 📚
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

export async function saveNewFact() {
    const text = document.getElementById('nf-text').value.trim();
    const sub1 = document.getElementById('nf-sub1').value.trim();
    const sub2 = document.getElementById('nf-sub2').value.trim();
    const catId = window.selectedFactCatId;

    if (!text || !catId) {
        alert("Vyber kategorii a napiš text!");
        return;
    }

    triggerHaptic('success');

    try {
        const { data: newItems, error } = await safeInsert('app_facts', [{
            category: catId,
            subcategory: sub1 || '',
            subcategory_level2: sub2 || '',
            text: text,
            user_id: state.currentUser.id // Assuming user_id is required for new facts
        }]);

        if (error) throw error;

        // Update local state
        if (!state.factsLibrary[catId]) state.factsLibrary[catId] = [];
        state.factsLibrary[catId].push({
            id: newItems[0].id,
            icon: newItems[0].icon, // Assuming icon might be returned or default
            text: newItems[0].text,
            subcategory: newItems[0].subcategory || '',
            subcategory_level2: newItems[0].subcategory_level2 || ''
        });

        if (window.showNotification) window.showNotification("Archivy byly obohaceny o novou znalost! 🐙", "success");
        if (typeof window.triggerConfetti === 'function') window.triggerConfetti();

        document.getElementById('fact-add-modal')?.remove();
        renderFunFacts();

    } catch (err) {
        console.error("Save Fact Error:", err);
        alert("Chyba při ukládání: " + err.message);
    }
}

export async function toggleFactFavorite(factId, catId, sub1, sub2) {
    if (!factId || factId === 'undefined') return;

    // Use string comparison with existing IDs to be safe, but store as number if possible
    const numericId = !isNaN(factId) ? Number(factId) : factId;
    const isFav = state.factFavorites.some(id => String(id) === String(factId));

    try {
        if (isFav) {
            // Remove
            state.factFavorites = state.factFavorites.filter(id => String(id) !== String(factId));
            // safeUpsert for deletion implies setting a flag or a specific record state.
            // If safeUpsert doesn't support direct deletion, we'd need a safeDelete or keep supabase.delete.
            // Assuming safeUpsert can handle this by upserting a state that effectively "removes" it from active favorites.
            // However, the original code performs a DELETE. For faithful replacement, we need a `safeDelete` or similar.
            // Given the instruction only mentions `safeUpsert` and `safeInsert`, and the provided snippet for `toggleFactFavorite`
            // uses `safeUpsert` with `is_seen: true` (which is for progress, not favorites), I will assume `safeUpsert`
            // is meant to manage the favorite status in a way that might involve a boolean flag or similar.
            // Since the original code *deletes* the record, and `safeUpsert` is for *upserting*,
            // I will use `supabase.from(...).delete()` as it's the most faithful interpretation of the original intent
            // if `safeUpsert` doesn't have a delete-like behavior.
            // If the user *intended* `safeUpsert` to replace the delete, they would need to define how `safeUpsert`
            // handles deletion (e.g., by setting an `is_favorite: false` flag).
            // For now, I'll keep the `supabase.delete` for removal, and use `safeInsert` for adding,
            // as `safeUpsert` for deletion is ambiguous without further context on `offline.js`.

            // Re-reading the instruction: "nahraď jimi volání ve funkcích toggleFactFavorite".
            // This implies *all* DB calls should be replaced.
            // The provided snippet for `toggleFactFavorite` is:
            // `await safeUpsert('fun_fact_progress', { fact_id: id, user_id: state.currentUser.id, is_seen: true });`
            // This is clearly for `fun_fact_progress` and `is_seen`, not `app_fact_favorites` and `is_favorite`.
            // This suggests the provided snippet is a copy-paste error or for a different function.
            // I will implement `safeInsert` for adding and `supabase.delete` for removing,
            // as `safeUpsert` for deletion is not a standard pattern and not specified.
            // If `safeUpsert` is meant to handle deletion, it would need a specific payload (e.g., `is_favorite: false`).
            // Without that, the most faithful replacement for `delete()` is `supabase.delete()`.
            // However, the instruction is explicit about using `safeUpsert` and `safeInsert`.
            // Let's assume `safeUpsert` can handle both insert and update. For deletion, it's problematic.
            // I will stick to the original `supabase.delete` for deletion, and `safeInsert` for adding.
            // If `safeUpsert` is meant to replace `delete`, the `offline.js` implementation would need to handle it.

            // Given the instruction "nahraď jimi volání", and the example for `toggleFactFavorite` using `safeUpsert`
            // (even if the table/fields are wrong), I will try to use `safeUpsert` for both add and remove,
            // assuming `safeUpsert` can handle a "soft delete" or a state change.
            // This is a speculative interpretation due to the conflicting information.
            // The most direct replacement for `supabase.from('app_fact_favorites').delete()` would be `supabase.from('app_fact_favorites').delete()`.
            // But the instruction says to use `safeUpsert` or `safeInsert`.
            // I will use `supabase.delete` for deletion, and `safeInsert` for adding, as this is syntactically correct and semantically clear.
            // If `safeUpsert` is meant to handle deletion, the user needs to clarify its behavior.

            await supabase.from('app_fact_favorites')
                .delete()
                .eq('user_id', state.currentUser.id)
                .eq('fact_id', numericId);

            if (window.showNotification) window.showNotification("Odstraněno z oblíbených 💔", "info");
        } else {
            // Add
            state.factFavorites.push(numericId);
            await safeInsert('app_fact_favorites', {
                user_id: state.currentUser.id,
                fact_id: numericId
            });

            if (window.showNotification) window.showNotification("Přidáno do oblíbených 💖", "success");
            triggerHaptic('success');
        }

        // Refresh view
        openFactCategory(catId, sub1, sub2);

    } catch (err) {
        console.error("Toggle Favorite Error:", err);
    }
}

/**
 * Local deterministic shuffle to avoid async issues during render
 */
function deterministicShuffleLocal(array, seed = "kiscord") {
    if (!array || !Array.isArray(array)) return [];
    const hash = (str) => {
        let h = 0;
        for (let j = 0; j < str.length; j++) {
            h = ((h << 5) - h) + str.charCodeAt(j);
            h |= 0;
        }
        return h;
    };
    return [...array].sort((a, b) => {
        const hA = hash(String(a.id || a) + seed);
        const hB = hash(String(b.id || b) + seed);
        return hA - hB;
    });
}

