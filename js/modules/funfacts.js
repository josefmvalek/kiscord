
import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';

const CATEGORIES = [
    { id: 'raccoon', title: 'Mývalí moudra', icon: '🦝', desc: 'Vše o našich oblíbených šikulách a jejich zvycích.', color: '#5865F2' },
    { id: 'owl', title: 'Soví vědomosti', icon: '🦉', desc: 'Zajímavosti o nočních lovcích a jejich moudrosti.', color: '#faa61a' },
    { id: 'octopus', title: 'Chobotničí fakta', icon: '🐙', desc: 'Podivuhodnosti z hlubin oceánů o těchto chytrých tvorech.', color: '#3ba55c' },
    { id: 'fun', title: 'Ostatní zajímavosti', icon: '✨', desc: 'Mix náhodných a vtipných faktů pro dobrou náladu.', color: '#eb459e' }
];

export function renderFunFacts() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Reset container classes
    container.className = "flex-1 flex flex-col bg-[#36393f] relative overflow-hidden";

    let html = `
        <div class="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar bg-[#36393f] animate-fade-in">
            <div class="max-w-6xl mx-auto space-y-8 pb-10">
                <div class="text-center mb-10 relative">
                    <h1 class="text-4xl font-black text-white mb-2">Encyklopedie Kiscordu 📚</h1>
                    <p class="text-gray-400">Všechno, co jsi (ne)chtěla vědět o našich oblíbených zvířátkách.</p>
                    <div class="mt-6 flex justify-center">
                        <button onclick="import('./js/modules/funfacts.js').then(m => m.showAddFactModal())" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-6 py-3 rounded-2xl font-black transition shadow-lg flex items-center gap-3 transform hover:scale-105 active:scale-95 border border-white/10 uppercase tracking-widest text-xs">
                            <i class="fas fa-plus"></i> Přidat moudrost
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;

    CATEGORIES.forEach(cat => {
        const facts = state.factsLibrary[cat.id] || [];
        const progress = state.funFactProgress[cat.id] || { index: 0, completed: false };
        const totalCount = facts.length;
        const seenCount = progress.index;
        const percent = totalCount > 0 ? Math.min(100, Math.round((seenCount / totalCount) * 100)) : 0;
        html += `
            <div onclick="import('./js/modules/funfacts.js').then(m => m.openFactCategory('${cat.id}'))" 
                 class="bg-[#2f3136] rounded-2xl p-6 cursor-pointer border border-[#202225] hover:border-[${cat.color}] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
                <div class="absolute -right-6 -bottom-6 text-9xl opacity-5 group-hover:opacity-10 transition-opacity grayscale group-hover:grayscale-0 rotate-12 select-none pointer-events-none">${cat.icon}</div>
                <div class="flex items-start justify-between mb-4">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-[#202225] group-hover:scale-110 transition-transform duration-300 shadow-md border border-white/5">
                        ${cat.icon}
                    </div>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2 group-hover:text-[${cat.color}] transition-colors">${cat.title}</h3>
                <p class="text-gray-400 text-sm mb-6 flex-grow pr-10">${cat.desc}</p>
                
                <!-- Progress Section -->
                <div class="mt-auto">
                    <div class="flex justify-between items-end mb-2">
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Míra osvícení</span>
                        <span class="text-xs font-mono text-white/50">${seenCount} / ${totalCount}</span>
                    </div>
                    <div class="w-full h-1.5 bg-[#202225] rounded-full overflow-hidden border border-white/5">
                        <div class="h-full bg-gradient-to-r from-[${cat.color}] to-[#5865F2] transition-all duration-1000 ease-out" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
                </div>
                ${(CATEGORIES.every(c => (state.factsLibrary[c.id] || []).length === 0)) 
                    ? '<div class="text-center py-20 text-gray-500">Načítám vědomosti ze Supabase... ⌛</div>' 
                    : ''}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

export function openFactCategory(catId) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return;

    const facts = state.factsLibrary[catId] || [];
    const progress = state.funFactProgress[catId] || { index: 0, completed: false };
    const currentIndex = progress.index;

    const currentFact = facts[currentIndex];
    const remaining = facts.length - currentIndex;

    let html = `
        <div class="flex-1 flex flex-col bg-[#36393f] animate-fade-in overflow-hidden relative">
            <!-- Header Section -->
            <div class="p-4 md:p-8 flex justify-between items-start z-10">
                <div class="flex items-center gap-4">
                    <button onclick="import('./js/modules/funfacts.js').then(m => m.renderFunFacts())" 
                            class="w-10 h-10 rounded-xl bg-[#2f3136] hover:bg-[#eb459e] text-white flex items-center justify-center transition-all border border-white/5 shadow-lg group">
                        <i class="fas fa-chevron-left group-hover:-translate-x-1 transition-transform"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span class="text-3xl">${cat.icon}</span> ${cat.title.toUpperCase()}
                        </h2>
                        <p class="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1">
                            Zbývá ${remaining} požehnání
                        </p>
                    </div>
                </div>

                <button onclick="import('./js/modules/funfacts.js').then(m => m.resetFactCategory('${catId}'))" 
                        class="px-4 py-2 rounded-xl bg-[#2f3136] text-gray-400 hover:text-red-400 border border-white/5 transition-all text-xs font-bold flex items-center gap-2">
                    <i class="fas fa-undo-alt text-[10px]"></i> RESETOVAT
                </button>
            </div>

            <!-- Card Content Area -->
            <div class="flex-1 flex items-center justify-center p-4">
                <div class="relative w-full max-w-lg aspect-[4/5] md:aspect-[5/4]">
                    <!-- Main Card -->
                    <div id="fact-card" class="absolute inset-0 bg-[#2f3136] rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-white/5 flex flex-col items-center justify-center text-center group overflow-hidden transition-all duration-500">
                        <!-- Decorative Elements -->
                        <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[${cat.color}] to-[#5865F2]"></div>
                        <i class="fas fa-quote-left absolute top-10 left-10 text-6xl opacity-10 text-white group-hover:scale-120 transition-transform duration-700"></i>
                        <i class="fas fa-quote-right absolute bottom-10 right-10 text-6xl opacity-10 text-white group-hover:scale-120 transition-transform duration-700"></i>
                        
                        <!-- Icon Circle -->
                        <div class="mb-10 w-24 h-24 rounded-3xl bg-[#202225] flex items-center justify-center text-5xl shadow-inner border border-white/5 animate-float transform group-hover:rotate-6 transition-transform">
                            ${(currentFact && currentFact.icon) || cat.icon}
                        </div>

                        <!-- Text content -->
                        <div class="relative z-10 w-full">
                            ${!currentFact ? `
                                <h3 class="text-2xl font-bold text-white mb-4">Vše probráno! 🎉</h3>
                                <p class="text-gray-400 text-sm">Právě jsi nasála všechnu moudrost této kategorie.</p>
                            ` : `
                                <p class="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-relaxed tracking-tight px-2">
                                    ${currentFact.text}
                                </p>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Controls Area -->
            <div class="p-8 flex justify-center gap-4 z-10">
                <button onclick="import('./js/modules/funfacts.js').then(m => m.prevFact('${catId}'))" 
                        class="w-16 h-16 rounded-2xl bg-[#2f3136] border border-white/5 text-gray-500 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl">
                    <i class="fas fa-undo text-xl"></i>
                </button>

                <button onclick="import('./js/modules/funfacts.js').then(m => m.nextFact('${catId}'))" 
                        class="px-10 h-16 rounded-2xl bg-gradient-to-br from-[#eb459e] to-[#5865F2] text-white font-black text-sm tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl group">
                        <i class="fas fa-check text-base"></i> PROBRÁNO
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

export function nextFact(catId) {
    const facts = state.factsLibrary[catId] || [];
    const progress = state.funFactProgress[catId] || { index: 0, completed: false };
    
    if (progress.index < facts.length) {
        progress.index++;
        state.funFactProgress[catId] = progress;
        
        // Sync with Supabase (Personal)
        import('../core/supabase.js').then(({ supabase }) => {
            supabase.from('fun_fact_progress').upsert({
                category_id: catId,
                user_id: state.currentUser.id,
                current_index: progress.index,
                completed: progress.index >= facts.length,
                updated_at: new Date().toISOString()
            }).then(() => {});
        });

        // Achievement Hook
        if (progress.index >= facts.length) {
            import('./achievements.js').then(m => m.autoUnlock('fact_enthusiast'));
        }

        triggerHaptic('success');
        openFactCategory(catId);
    }
}

export function prevFact(catId) {
    const progress = state.funFactProgress[catId] || { index: 0, completed: false };
    
    if (progress.index > 0) {
        progress.index--;
        state.funFactProgress[catId] = progress;
        
        // Sync with Supabase
        import('../core/supabase.js').then(({ supabase }) => {
            supabase.from('fun_fact_progress').upsert({
                category_id: catId,
                user_id: state.currentUser.id,
                current_index: progress.index,
                completed: false,
                updated_at: new Date().toISOString()
            }).then(() => {});
        });

        triggerHaptic('light');
        openFactCategory(catId);
    }
}

export function resetFactCategory(catId) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const cat = CATEGORIES.find(c => c.id === catId);
    
    // Inject custom confirm modal directly into the container as an overlay
    const overlay = document.createElement("div");
    overlay.id = "reset-confirm-overlay";
    overlay.className = "absolute inset-0 z-[100] flex items-center justify-center bg-[#18191c]/80 backdrop-blur-md animate-fade-in p-4";
    overlay.innerHTML = `
        <div class="bg-[#2f3136] rounded-[2rem] p-8 md:p-10 max-w-sm w-full shadow-2xl border border-white/5 text-center animate-scale-up">
            <div class="w-16 h-16 rounded-2xl bg-[#202225] text-red-400 flex items-center justify-center text-2xl mx-auto mb-6 shadow-inner">
                <i class="fas fa-trash-alt"></i>
            </div>
            <h3 class="text-xl font-black text-white mb-3">Začít od začátku?</h3>
            <p class="text-gray-400 text-sm mb-10 leading-relaxed px-4">Opravdu chceš tuhle kategorii vymazat a nasávat všechnu moudrost znovu od nuly? 🧹</p>
            
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

    // Add logic for actual reset
    document.getElementById("confirm-reset-btn").onclick = () => {
        state.funFactProgress[catId] = { index: 0, completed: false };
        
        import('../core/supabase.js').then(({ supabase }) => {
            supabase.from('fun_fact_progress').upsert({
                category_id: catId,
                user_id: state.currentUser.id,
                current_index: 0,
                completed: false,
                updated_at: new Date().toISOString()
            }).then(() => {});
        });

        triggerHaptic('warning');
        overlay.remove();
        openFactCategory(catId);
        
        if (window.showNotification) window.showNotification("Kategorie byla resetována! ✨", "info");
    };
}

// --- ADD NEW FACT ---

export function showAddFactModal() {
    const modal = document.createElement('div');
    modal.id = 'fact-add-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-[#36393f] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center bg-[#2f3136]">
                <h3 class="text-xl font-black text-white tracking-widest uppercase text-center w-full ml-6">Nové moudro do archivu 📜</h3>
                <button onclick="this.closest('#fact-add-modal').remove()" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-6">
                 <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-3 text-center tracking-widest">Kategorie znalostí</label>
                    <div class="grid grid-cols-2 gap-3">
                        ${CATEGORIES.map(c => `
                            <button onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.selectedFactCatId = '${c.id}'" 
                                    class="p-4 rounded-xl border-2 border-transparent bg-[#2f3136] text-white transition hover:border-gray-500 flex flex-col items-center gap-2 group">
                                <span class="text-2xl transition group-hover:scale-110">${c.icon}</span>
                                <span class="text-[10px] font-black uppercase tracking-tighter">${c.title.split(' ')[0]}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Text faktu</label>
                    <textarea id="nf-text" placeholder="Např. Mývalové si jídlo nemyjí proto, že by byli čistotní, ale aby si ho lépe ohmatali..." class="w-full bg-[#202225] text-white p-4 rounded-xl border-2 border-transparent focus:border-[#5865F2] outline-none transition min-h-[120px] shadow-inner text-lg leading-relaxed"></textarea>
                </div>
            </div>
            
            <div class="p-6 bg-[#2f3136] border-t border-gray-700">
                <button onclick="import('./js/modules/funfacts.js').then(m => m.saveNewFact())" class="w-full bg-gradient-to-r from-[#5865F2] to-[#eb459e] text-white py-4 rounded-xl font-black text-xl transition shadow-xl transform active:scale-95 uppercase tracking-widest">
                    ULOŽIT ZNALOST 📚
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export async function saveNewFact() {
    const text = document.getElementById('nf-text').value.trim();
    const catId = window.selectedFactCatId;
    
    if (!text || !catId) {
        alert("Vyber kategorii a napiš text!");
        return;
    }
    
    triggerHaptic('success');
    
    try {
        const { supabase } = await import('../core/supabase.js');
        const { data: newItems, error } = await supabase.from('app_facts').insert([{
            category: catId,
            text: text
        }]).select();
        
        if (error) throw error;
        
        // Update local state
        if (!state.factsLibrary[catId]) state.factsLibrary[catId] = [];
        state.factsLibrary[catId].push(newItems[0]);
        
        // Notification
        if (window.showNotification) window.showNotification("Archivy byly obohaceny o novou znalost! 🐙", "success");
        if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
        
        // Close modal
        document.getElementById('fact-add-modal')?.remove();
        
        // Refresh UI
        renderFunFacts();
        
    } catch (err) {
        console.error("Save Fact Error:", err);
        alert("Chyba při ukládání: " + err.message);
    }
}
