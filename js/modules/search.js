
import { state } from '../core/state.js';
// import { library, dateLocations, factsLibrary, libraryCategories } from '../data.js'; // Smazáno
import { normalizeText } from '../core/utils.js';

const libraryCategories = ["movies", "series", "games"];

// --- SEARCH LOGIC ---

export function expandSearchQuery(query) {
    // Easter egg / Synonym expansion
    // (Simple implementation based on original script, can be expanded)
    return query;
}

export function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="bg-[#faa61a] text-black font-bold px-0.5 rounded">$1</span>');
}
export function renderGlobalSearch(query) {
    const container = document.getElementById("messages-container");
    if (!container) return;
    const safeQuery = normalizeText(query);

    // Filter Matura Topics ONLY
    const foundMatura = [];
    if (state.maturaTopics) {
        Object.keys(state.maturaTopics).forEach(catId => {
            state.maturaTopics[catId].forEach(topic => {
                const searchStr = `${topic.title} ${topic.author || ''} ${topic.cat || ''}`;
                if (normalizeText(searchStr).includes(safeQuery)) {
                    foundMatura.push({ ...topic, originalType: 'matura' });
                }
            });
        });
    }

    const totalResults = foundMatura.length;

    const searchBarHtml = `
        <div class="max-w-xl mx-auto relative group mb-12 matura-search-wrapper">
            <div class="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#5865F2] transition-colors">
                <i class="fas fa-search text-sm"></i>
            </div>
            <input type="text" id="global-search-input"
                value="${query}"
                oninput="window.loadModule('matura').then(m => m.handleMaturaSearch(this.value))"
                placeholder="Hledat v tématech..." 
                class="w-full bg-[var(--bg-secondary)] border border-white/5 group-hover:border-white/10 focus:border-[#5865F2]/50 focus:ring-4 focus:ring-[#5865F2]/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-[var(--text-header)] placeholder-gray-500 outline-none transition-all shadow-xl font-bold tracking-tight">
            <button onclick="window.loadModule('matura').then(m => m.handleMaturaSearch(''))" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Common Wrapper to ensure consistent width
    let html = `<div class="w-full p-6 pb-20 max-w-5xl mx-auto min-h-full">
                  ${searchBarHtml}`;

    if (totalResults === 0) {
        html += `
              <div class="flex flex-col items-center justify-center py-20 text-gray-500">
                  <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
                  <p>Žádné maturitní téma pro "<strong>${query}</strong>" nenalezeno... 😢</p>
                  <button onclick="window.loadModule('matura').then(m => m.handleMaturaSearch(''))" class="mt-4 text-[#5865F2] hover:underline font-bold uppercase text-[10px] tracking-widest">Smazat a vrátit se</button>
              </div>
          </div>`;
        container.innerHTML = html;
        return;
    }

    html += `
            <div class="max-w-4xl mx-auto space-y-10">
                <h2 class="text-xl font-bold text-white border-b border-white/5 pb-4 flex items-center justify-between">
                    <span>Maturitní výsledky pro: "${query}"</span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-[#5865F2] bg-[#5865F2]/10 px-3 py-1 rounded-full">${totalResults} nalezeno</span>
                </h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    `;

    foundMatura.forEach(topic => {
        html += `
          <div class="bg-[#2f3136] p-4 rounded-2xl border border-white/5 hover:border-[#5865F2] transition-all shadow-xl cursor-pointer flex gap-4 items-center group relative overflow-hidden"
               onclick="window.loadModule('matura').then(m => m.openKnowledgeBase('${topic.id}'))">
              <div class="text-3xl transform group-hover:scale-110 transition duration-300 transform-gpu">${topic.icon}</div>
              <div class="flex-1 min-w-0">
                  <div class="text-[9px] font-black uppercase text-[#5865F2] tracking-widest mb-0.5 opacity-60">${topic.cat || 'Ostatní'}</div>
                  <h4 class="font-bold text-white group-hover:text-[#5865F2] transition text-sm truncate">${highlightText(topic.title, query)}</h4>
                  ${topic.author ? `<p class="text-[10px] text-gray-500 italic truncate">${highlightText(topic.author, query)}</p>` : ''}
              </div>
              <div class="absolute -right-2 -bottom-2 w-12 h-12 bg-[#5865F2]/5 rounded-full blur-xl group-hover:bg-[#5865F2]/10 transition-all"></div>
          </div>
       `;
    });

    html += `</div></div></div>`;
    container.innerHTML = html;
}
