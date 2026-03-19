
import { state } from '../core/state.js';

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
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-black text-white mb-2">Encyklopedie Kiscordu 📚</h1>
                    <p class="text-gray-400">Všechno, co jsi (ne)chtěla vědět o našich oblíbených zvířátkách.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;

    CATEGORIES.forEach(cat => {
        const count = (state.factsLibrary[cat.id] || []).length;
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
                <div class="mt-auto flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-gray-500">Celkem faktů</span>
                    <span class="text-sm font-mono bg-[#202225] px-3 py-1 rounded-full text-white/80 border border-white/5">${count}</span>
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

    let html = `
        <div class="flex-1 flex flex-col bg-[#36393f] animate-fade-in overflow-hidden">
            <!-- Header detailu -->
            <div class="bg-[#2f3136] p-4 md:p-6 border-b border-[#202225] shadow-md z-10">
                <div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <button onclick="import('./js/modules/funfacts.js').then(m => m.renderFunFacts())" 
                                class="w-10 h-10 rounded-full bg-[#202225] hover:bg-[#40444b] text-white flex items-center justify-center transition-all border border-white/5">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <div>
                            <h2 class="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                                <span class="hidden sm:inline">${cat.icon}</span> ${cat.title}
                            </h2>
                            <p class="text-xs text-gray-400 hidden sm:block">${cat.desc}</p>
                        </div>
                    </div>
                    <div class="text-xs font-mono bg-[#202225] px-3 py-2 rounded-lg text-gray-400 border border-white/5">
                        ${facts.length} POŽEHNÁNÍ
                    </div>
                </div>
            </div>

            <!-- List faktů -->
            <div class="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div class="max-w-3xl mx-auto space-y-4 pb-20">
                    ${facts.length === 0 ? '<div class="text-center py-20 text-gray-500 italic">V této kategorii zatím nic není...</div>' : ''}
                    ${facts.map(f => `
                        <div class="bg-[#2f3136] rounded-2xl p-6 border border-[#202225] hover:border-[${cat.color}]/30 hover:bg-[#32353b] transition-all duration-300 shadow-sm flex gap-5 items-start animate-fade-in">
                            <div class="text-4xl bg-[#202225] w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner border border-white/5">
                                ${f.icon || cat.icon}
                            </div>
                            <div class="text-gray-200 text-sm md:text-base leading-relaxed font-medium pt-1">
                                ${f.text}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
