
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

    // 1. Filter Library
    const foundLibrary = [];
    libraryCategories.forEach(cat => {
        if (state.library[cat]) {
            state.library[cat].forEach(item => {
                if (normalizeText(item.title).includes(safeQuery)) {
                    foundLibrary.push({ ...item, type: cat, originalType: 'library' });
                }
            });
        }
    });

    // 2. Filter Locations
    const foundLocations = state.dateLocations.filter(loc =>
        normalizeText(loc.name).includes(safeQuery) ||
        normalizeText(loc.desc).includes(safeQuery)
    ).map(l => ({ ...l, originalType: 'location' }));

    // 3. Filter Matura Topics
    const foundMatura = [];
    if (state.maturaTopics) {
        Object.keys(state.maturaTopics).forEach(catId => {
            state.maturaTopics[catId].forEach(topic => {
                if (normalizeText(topic.title).includes(safeQuery) || 
                    (topic.author && normalizeText(topic.author).includes(safeQuery)) ||
                    (topic.cat && normalizeText(topic.cat).includes(safeQuery))) {
                    foundMatura.push({ ...topic, originalType: 'matura' });
                }
            });
        });
    }

    const totalResults = foundLibrary.length + foundLocations.length + foundMatura.length;

    if (totalResults === 0) {
        container.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full text-gray-500">
              <i class="fas fa-search text-4xl mb-4 opacity-50"></i>
              <p>Nic nenalezeno pro "<strong>${query}</strong>"... 😢</p>
              <button onclick="document.getElementById('search-input').value=''; renderGlobalSearch('');" class="mt-4 text-[#00e5ff] hover:underline">Zrušit hledání</button>
          </div>`;
        return;
    }

    let html = `<div class="p-6 pb-20 space-y-8 animate-fade-in">
                  <h2 class="text-xl font-bold text-white border-b border-[#202225] pb-2">
                       Výsledky hledání: "${query}" <span class="text-sm text-gray-500 ml-2">(${totalResults})</span>
                  </h2>`;

    // --- LIBRARY RESULTS ---
    if (foundLibrary.length > 0) {
        html += `<div><h3 class="text-gray-400 font-bold uppercase text-xs mb-3">Knihovna (${foundLibrary.length})</h3>
               <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">`;

        foundLibrary.forEach(item => {
            // Reuse existing library card logic or simplified version
            // Ideally we should import renderLibraryCard logic, but for now lets inline a simplified one
            // or use openPlanningModal import dynamically
            const safeTitle = (item.title || "").replace(/'/g, "\\'");
            html += `
              <div class="bg-[#2f3136] rounded-xl overflow-hidden border border-[#202225] hover:border-[#5865F2] transition shadow-lg flex flex-col group cursor-pointer"
                   onclick="import('./js/modules/library.js').then(m => m.openHistoryModal(${item.id}))">
                  <div class="h-32 bg-[#202225] flex items-center justify-center text-4xl">${item.icon || "🎬"}</div>
                  <div class="p-3">
                      <h4 class="font-bold text-white text-sm truncate">${highlightText(item.title, query)}</h4>
                      <p class="text-[10px] text-gray-500 uppercase mt-1">${item.type}</p>
                  </div>
              </div>
           `;
        });
        html += `</div></div>`;
    }

    // --- MATURA RESULTS ---
    if (foundMatura.length > 0) {
        html += `<div><h3 class="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-3 flex items-center gap-2"><i class="fas fa-graduation-cap text-[#eb459e]"></i> Maturitní Akademie (${foundMatura.length})</h3>
               <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">`;

        foundMatura.forEach(topic => {
            html += `
              <div class="bg-[#2f3136] p-4 rounded-2xl border border-white/5 hover:border-[#5865F2] transition-all shadow-xl cursor-pointer flex gap-4 items-center group relative overflow-hidden"
                   onclick="import('./js/modules/matura.js').then(m => m.openKnowledgeBase('${topic.id}'))">
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
        html += `</div></div>`;
    }

    // --- LOCATION RESULTS ---
    if (foundLocations.length > 0) {
        html += `<div><h3 class="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-3 flex items-center gap-2"><i class="fas fa-map-marker-alt text-[#eb459e]"></i> Rande Místa (${foundLocations.length})</h3>
               <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">`;

        foundLocations.forEach(loc => {
            html += `
              <div class="bg-[#2f3136] p-4 rounded-xl border border-[#202225] hover:border-[#eb459e] transition shadow-lg cursor-pointer flex gap-4 items-center group"
                   onclick="window.switchChannel('dateplanner'); setTimeout(() => import('./js/modules/map.js').then(m => m.selectLocation(${loc.id})), 100)">
                  <div class="text-2xl">${loc.icon || "📍"}</div>
                  <div>
                      <h4 class="font-bold text-white group-hover:text-[#eb459e] transition">${highlightText(loc.name, query)}</h4>
                      <p class="text-xs text-gray-400 line-clamp-1">${highlightText(loc.desc || "", query)}</p>
                  </div>
              </div>
           `;
        });
        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}
