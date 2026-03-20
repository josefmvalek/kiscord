import { state } from '../core/state.js';
// import { library } from '../data.js'; // Smazáno, nyní ze state
import { triggerHaptic } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { supabase } from '../core/supabase.js';

// --- LIBRARY RENDERING ---

function ensureModals() {
    if (!document.getElementById("download-modal")) {
        const dlModal = document.createElement("div");
        dlModal.id = "download-modal";
        dlModal.className = "fixed inset-0 z-[80] hidden modal-backdrop items-center justify-center p-4";
        dlModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden animate-fade-in">
                <div class="p-6">
                    <div class="text-5xl text-center mb-4">🧲</div>
                    <h3 class="font-bold text-white text-center text-xl mb-2">Stahování</h3>
                    <p class="text-gray-300 text-center mb-6" id="download-message"></p>
                    <div class="space-y-4">
                        <button onclick="import('./js/modules/library.js').then(m => m.openMagnetLink())"
                            class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-3">
                            <i class="fas fa-magnet"></i> Otevřít v qBittorrent
                        </button>
                        <button onclick="import('./js/modules/library.js').then(m => m.openGoogleDrive())"
                            class="w-full bg-[#3ba55c] hover:bg-[#2d7d46] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-3">
                            <i class="fab fa-google-drive"></i> Google Drive (záložní)
                        </button>
                        <button onclick="closeModal('download-modal')"
                            class="w-full bg-[#4f545c] hover:bg-[#5d6269] text-white py-3 rounded-lg">
                            Zrušit
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dlModal);
    }

    if (!document.getElementById("history-modal")) {
        const histModal = document.createElement("div");
        histModal.id = "history-modal";
        histModal.className = "fixed inset-0 z-[90] hidden modal-backdrop items-center justify-center p-4";
        histModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden animate-fade-in">
                <div class="bg-black/20 p-5 border-b border-white/5 flex justify-between items-center">
                    <h3 class="font-bold text-white flex items-center gap-2">
                        <i class="fas fa-history text-[#eb459e]"></i> Deníček sledování
                    </h3>
                    <button onclick="closeModal('history-modal')" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-5 space-y-4">
                    <input type="hidden" id="history-item-id" />
                    <div>
                        <label class="block text-[#b9bbbe] text-[10px] font-bold uppercase mb-2 tracking-widest text-center">Jak se ti to líbilo?</label>
                        <div id="star-rating" class="flex justify-center text-3xl mb-4">
                            ${[1, 2, 3, 4, 5].map(i => `<button onclick="import('./js/modules/library.js').then(m => m.setStarRating(${i}))" class="star-btn transition-transform hover:scale-125 focus:outline-none" data-rating="${i}"><i class="fas fa-star text-gray-700"></i></button>`).join('')}
                        </div>
                        <input type="hidden" id="history-rating" value="0" />
                    </div>
                    <div>
                        <label class="block text-[#b9bbbe] text-[10px] font-bold uppercase mb-2 tracking-widest">Stav sledování</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button onclick="import('./js/modules/library.js').then(m => m.setHistoryStatus('unseen'))" id="status-unseen" class="status-btn p-3 rounded-xl border border-gray-700 hover:bg-[#40444b] text-center transition opacity-50 flex flex-col items-center">
                                <span class="text-xl mb-1">💤</span>
                                <span class="text-[9px] font-black uppercase text-gray-400">V plánu</span>
                            </button>
                            <button onclick="import('./js/modules/library.js').then(m => m.setHistoryStatus('watching'))" id="status-watching" class="status-btn p-3 rounded-xl border border-gray-700 hover:bg-[#40444b] text-center transition opacity-50 flex flex-col items-center">
                                <span class="text-xl mb-1">🍿</span>
                                <span class="text-[9px] font-black uppercase text-blue-400">Koukáme</span>
                            </button>
                            <button onclick="import('./js/modules/library.js').then(m => m.setHistoryStatus('seen'))" id="status-seen" class="status-btn p-3 rounded-xl border border-gray-700 hover:bg-[#40444b] text-center transition opacity-50 flex flex-col items-center">
                                <span class="text-xl mb-1">🔥</span>
                                <span class="text-[9px] font-black uppercase text-green-400">Viděno</span>
                            </button>
                        </div>
                    </div>
                    <div id="history-date-wrapper" class="hidden animate-slide-up">
                        <label class="block text-[#b9bbbe] text-[10px] font-bold uppercase mb-1 tracking-widest">Kdy to bylo?</label>
                        <input type="date" id="history-date" class="w-full bg-[#202225] text-white p-2.5 rounded-lg border border-[#2f3136] focus:border-[#eb459e] outline-none text-sm shadow-inner" />
                    </div>
                    <div id="history-reaction-wrapper" class="hidden animate-slide-up space-y-4">
                        <label class="block text-[#b9bbbe] text-[10px] font-bold uppercase mb-1 tracking-widest leading-none">Tvůj verdikt</label>
                        <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            ${[
            { e: '💖', t: 'Srdcovka', c: 'eb459e' },
            { e: '🍿', t: 'Pohoda', c: '5865F2' },
            { e: '🧠', t: 'Hluboké', c: 'faa61a' },
            { e: '😴', t: 'Nuda', c: 'b9bbbe' },
            { e: '👎', t: 'Blbost', c: 'ed4245' }
        ].map(r => `
                                <button onclick="import('./js/modules/library.js').then(m => m.setReactionInput('${r.e} ${r.t}', this))" class="verdict-btn bg-[#202225] hover:bg-[#${r.c}]/10 border border-[#2f3136] rounded-xl p-2.5 transition flex flex-col items-center gap-1 group">
                                    <span class="text-xl group-hover:scale-110 transition">${r.e}</span>
                                    <span class="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">${r.t}</span>
                                </button>
                            `).join('')}
                        </div>
                        <div class="relative group mt-2">
                            <textarea id="history-reaction" placeholder="Dojmy, pocity, vzpomínky..." class="w-full bg-[#202225] text-white p-3.5 rounded-xl border border-[#2f3136] focus:border-[#eb459e]/50 outline-none transition min-h-[100px] text-sm resize-none shadow-inner custom-scrollbar italic placeholder:text-gray-600"></textarea>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-4">
                        <button onclick="import('./js/modules/library.js').then(m => m.deleteHistory())" class="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl font-bold transition border border-red-500/30"><i class="fas fa-trash-alt mr-2 text-xs"></i>Smazat</button>
                        <button onclick="import('./js/modules/library.js').then(m => m.saveHistory())" class="flex-[2] bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-xl font-bold shadow-lg transition">Uložit záznam</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(histModal);
    }

    if (!document.getElementById("delete-history-modal")) {
        const delHistModal = document.createElement("div");
        delHistModal.id = "delete-history-modal";
        delHistModal.className = "fixed inset-0 z-[150] hidden modal-backdrop items-center justify-center p-4";
        delHistModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-sm border border-red-500/50 p-8 text-center animate-fade-in">
                <div class="text-4xl mb-3 text-[#ed4245]"><i class="fas fa-trash-alt"></i></div>
                <h3 class="text-xl font-bold text-white mb-2">Smazat historii?</h3>
                <p class="text-gray-300 mb-6 text-sm">Opravdu chceš smazat záznam o tomhle filmu? Tuhle akci nejde vzít zpět.</p>
                <div class="flex gap-3">
                    <button onclick="closeModal('delete-history-modal')" class="flex-1 bg-[#2f3136] hover:bg-[#40444b] text-white py-2 rounded font-bold transition">Zrušit</button>
                    <button onclick="import('./js/modules/library.js').then(m => m.confirmDeleteHistory())" class="flex-1 bg-[#ed4245] hover:bg-[#c03537] text-white py-2 rounded font-bold transition">Smazat</button>
                </div>
            </div>
        `;
        document.body.appendChild(delHistModal);
    }

    if (!document.getElementById("library-plan-modal")) {
        const planModal = document.createElement("div");
        planModal.id = "library-plan-modal";
        planModal.className = "fixed inset-0 z-[140] hidden modal-backdrop items-center justify-center p-4";
        planModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden animate-fade-in">
                <div class="bg-black/20 p-5 border-b border-white/5 flex justify-between items-center">
                    <h3 class="font-bold text-white flex items-center gap-2"><i class="fas fa-calendar-plus text-[#5865F2]"></i> Naplánovat v kalendáři</h3>
                    <button onclick="closeModal('library-plan-modal')" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-5 space-y-4">
                    <div class="flex items-center gap-3 bg-[#202225] p-3 rounded-lg"><div id="lib-plan-icon" class="text-2xl">🎬</div><div><h4 id="lib-plan-title" class="font-bold text-white text-sm">Název</h4><p id="lib-plan-cat" class="text-[9px] text-gray-500 uppercase font-bold">Kategorie</p></div></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Datum</label><input type="date" id="lib-plan-date" class="w-full bg-[#202225] text-white p-2 rounded border border-[#2f3136] outline-none focus:border-[#5865F2] text-sm" /></div>
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Čas (volitelně)</label><input type="time" id="lib-plan-time" class="w-full bg-[#202225] text-white p-2 rounded border border-[#2f3136] outline-none focus:border-[#5865F2] text-sm" /></div>
                    </div>
                    <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Poznámka</label><input type="text" id="lib-plan-note" placeholder="Deka, víno, popcorn..." class="w-full bg-[#202225] text-white p-2 rounded border border-[#2f3136] outline-none focus:border-[#5865F2] text-sm" /></div>
                    <button onclick="import('./js/modules/library.js').then(m => m.confirmLibraryPlan())" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-2 rounded transition shadow-md mt-2">Uložit do kalendáře</button>
                </div>
            </div>
        `;
        document.body.appendChild(planModal);
    }
}

export function renderLibrary(category) {
    ensureModals();
    const container = document.getElementById("messages-container");
    if (!container) return;

    const items = state.library[category] || [];

    if (state.loadError) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center bg-[#36393f] text-gray-400 p-6 text-center animate-fade-in">
                <div class="text-8xl mb-6 filter drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">🦉❄️</div>
                <h3 class="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Sova nemůže najít knížky...</h3>
                <p class="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
                    Nepodařilo se načíst obsah knihovny. Zkusíme to znovu?
                </p>
                <button onclick="import('./js/core/state.js').then(async m => { await m.initializeState(); import('./js/modules/library.js').then(l => l.renderLibrary('${category}')); }); triggerHaptic('light')" 
                        class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all transform hover:scale-105 active:scale-95 shadow-xl flex items-center gap-3">
                    <i class="fas fa-sync-alt"></i>
                    Zkusit znovu
                </button>
            </div>
        `;
        return;
    }

    if (items.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500"><i class="fas fa-ghost text-4xl mb-4 opacity-50"></i><p>Nic tu není...</p></div>`;
        return;
    }

    // Grouping & Sorting
    const groups = {};
    items.forEach((item) => {
        const catName = item.cat || "Ostatní";
        if (!groups[catName]) groups[catName] = [];
        groups[catName].push(item);
    });

    const categoryOrder = [
        "Akční", "Sci-Fi", "Komedie", "Animovaný", "Fantasy", "Drama", "Horor", "Romantický",
        "Dobrodružný", "RPG", "FPS", "Strategie", "Simulátor", "Závodní"
    ];

    const sortedCategories = Object.keys(groups).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    let html = `
        <div class="px-6 pt-6 flex justify-between items-center max-w-7xl mx-auto w-full">
            <h2 class="text-2xl font-black text-white flex items-center gap-3 tracking-widest uppercase">
                <span class="bg-[#5865F2] p-2 rounded-lg shadow-lg">🎬</span>
                ${category === 'movies' ? 'Filmy' : (category === 'series' ? 'Seriály' : 'Hry')}
            </h2>
            <button onclick="import('./js/modules/library.js').then(m => m.showAddMediaModal('${category}'))" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-4 py-2 rounded-lg transition-all font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95">
                <i class="fas fa-plus"></i> Přidat do knihovny
            </button>
        </div>
        <div class="p-6 pb-20 animate-fade-in space-y-10">
    `;

    sortedCategories.forEach((catName) => {
        const groupItems = groups[catName].sort((a, b) => a.title.localeCompare(b.title));

        html += `
              <div>
                  <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-[#202225] pb-2 sticky top-0 bg-[#36393f] z-30 pt-2">
                      <span class="text-[#eb459e]">#</span> ${catName}
                      <span class="text-xs text-gray-500 font-normal ml-auto bg-[#202225] px-2 py-1 rounded-full">${groupItems.length}</span>
                  </h2>
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">`;

        groupItems.forEach((item) => {
            const historyData = state.watchHistory[item.id] || {};
            const status = historyData.status || "unseen";
            const userRating = historyData.rating || 0;
            const watchlist = state.watchlist || [];
            const isBookmarked = watchlist.some((w) => w.id === item.id && w.user_id === state.currentUser?.id);

            const safeTitle = (item.title || "").replace(/'/g, "\\'");
            const safeMagnet = (item.magnet || "").replace(/'/g, "\\'");
            const safeGdrive = (item.gdrive || "").replace(/'/g, "\\'");
            const safeTrailer = (item.trailer || "").replace(/'/g, "\\'");
            const itemType = category === "games" ? "game" : "movie";

            let statusBadge = "";
            if (status === "seen")
                statusBadge = '<span class="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-md z-10"><i class="fas fa-check"></i> VIDĚNO</span>';
            else if (status === "watching")
                statusBadge = '<span class="absolute top-2 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-md z-10"><i class="fas fa-play"></i> ROZKOUKÁNO</span>';

            html += `
                  <div class="library-card group relative bg-[#2f3136] rounded-xl overflow-hidden border border-[#202225] hover:border-[#5865F2] transition-all shadow-lg flex flex-col">
                      ${statusBadge}

                      <button onclick="event.stopPropagation(); import('./js/modules/library.js').then(m => m.toggleWatchlist(${item.id}))" 
                              class="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur hover:bg-[#eb459e] flex items-center justify-center transition ${isBookmarked ? "text-[#eb459e] bg-white/10" : "text-gray-400"}">
                          <i class="${isBookmarked ? "fas" : "far"} fa-heart"></i>
                      </button>

                      <div class="poster-area h-40 bg-[#202225] flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-500 relative cursor-pointer" 
                           onclick="import('./js/modules/library.js').then(m => m.openHistoryModal(${item.id}))">
                          ${item.icon}
                          ${item.trailer ? '<div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i class="fas fa-play text-white/80 text-3xl drop-shadow-lg"></i></div>' : ""}
                      </div>

                      <div class="p-3 flex flex-col flex-1">
                          <div class="flex flex-wrap gap-1 mb-2">
                              ${(item.mood_tags || []).map(tag => `<span class="text-[9px] bg-[#5865F2]/20 text-[#5865F2] px-1.5 py-0.5 rounded border border-[#5865F2]/20 font-bold">${tag}</span>`).join('')}
                          </div>
                          <h3 class="font-bold text-white text-sm leading-tight mb-1 group-hover:text-[#5865F2] transition line-clamp-2" title="${item.title}">${item.title}</h3>
                          <div class="mt-auto pt-3 border-t border-[#202225] flex justify-between items-center gap-1">
                              ${item.trailer
                    ? `<button onclick="event.stopPropagation(); import('./js/modules/library.js').then(m => m.playTrailer('${safeTrailer}'))" class="text-gray-400 hover:text-[#ff0000] p-1.5 rounded transition"><i class="fab fa-youtube"></i></button>`
                    : `<div class="w-6"></div>`
                }
                              <button onclick="event.stopPropagation(); import('./js/modules/library.js').then(m => m.openPlanningModal('${safeTitle}', '${itemType}'))" class="text-gray-400 hover:text-[#5865F2] p-1.5 rounded transition" title="Naplánovat"><i class="far fa-calendar-plus"></i></button>

                              <button onclick="event.stopPropagation(); import('./js/modules/library.js').then(m => m.openDownloadModal('${safeMagnet}', '${safeGdrive}'))" class="text-gray-400 hover:text-[#3ba55c] p-1.5 rounded transition"><i class="fas fa-cloud-download-alt"></i></button>

                              <button onclick="event.stopPropagation(); import('./js/modules/library.js').then(m => m.openHistoryModal(${item.id}))" class="${userRating > 0 ? "text-[#faa61a]" : "text-gray-400"} hover:text-white p-1.5 rounded transition"><i class="${userRating > 0 ? "fas" : "far"} fa-star"></i></button>
                          </div>
                      </div>
                  </div>`;
        });
        html += `</div></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// --- ITEM ACTIONS ---

export async function toggleWatchlist(id) {
    if (!state.watchlist) state.watchlist = [];
    const index = state.watchlist.findIndex(w => w.id === id && w.user_id === state.currentUser?.id);

    const item = state.library[state.currentChannel].find(i => i.id === id);
    const itemType = state.currentChannel === "games" ? "game" : "movie";

    if (index === -1) {
        state.watchlist.push({ id, type: itemType, user_id: state.currentUser?.id });
        triggerHaptic('success');
        if (typeof window.showNotification === 'function') window.showNotification('Přidáno do seznamu přání ❤️', 'success');

        await supabase.from('library_watchlist').insert({
            media_id: id,
            type: itemType,
            added_by: state.currentUser?.id
        });
    } else {
        state.watchlist.splice(index, 1);
        triggerHaptic('light');

        await supabase.from('library_watchlist').delete().match({ 
            media_id: id,
            added_by: state.currentUser?.id
        });
    }

    renderLibrary(state.currentChannel);
}

export function playTrailer(url_or_title) {
    if (url_or_title.startsWith('http')) {
        window.open(url_or_title, '_blank');
    } else {
        const query = encodeURIComponent(`${url_or_title} trailer`);
        const url = `https://www.youtube.com/results?search_query=${query}`;
        window.open(url, "_blank");
    }
}

// --- DOWNLOADS (Magnet & GDrive) ---

let currentDownloadLinks = { magnet: "", gdrive: "" };

export function openDownloadModal(magnet, gdrive) {
    currentDownloadLinks = { magnet, gdrive };

    const modal = document.getElementById("download-modal");
    if (!modal) return;

    triggerHaptic('light');

    // We don't set hrefs on buttons because we use onclick="openMagnetLink()"
    modal.style.display = "flex";
}

export function openMagnetLink() {
    if (currentDownloadLinks.magnet) {
        window.location.href = currentDownloadLinks.magnet;
        if (window.showNotification) window.showNotification("Spouštím qBittorrent...", "success");
    } else {
        if (window.showNotification) window.showNotification("Magnet link nenalezen.", "error");
    }
    if (window.closeModal) window.closeModal("download-modal");
    else document.getElementById("download-modal").style.display = "none";
}

export function openGoogleDrive() {
    if (currentDownloadLinks.gdrive) {
        window.open(currentDownloadLinks.gdrive, "_blank");
        if (window.showNotification) window.showNotification("Otevírám Google Drive...", "success");
    } else {
        if (window.showNotification) window.showNotification("Odkaz na Google Drive není k dispozici.", "info");
    }
    if (window.closeModal) window.closeModal("download-modal");
    else document.getElementById("download-modal").style.display = "none";
}


// --- HISTORY & RATING ---

let currentHistoryStatus = "unseen";

export function openHistoryModal(id) {
    // In current state.js, watchHistory stores an object: { status, date, reaction, rating }
    let item = state.watchHistory[id];
    
    // Fallback if it's the old simple string format or missing
    if (!item || typeof item === 'string') {
        item = { 
            status: typeof item === 'string' ? item : "unseen", 
            date: "", 
            reaction: "", 
            rating: state.ratings[id] || 0 
        };
    }

    document.getElementById("history-item-id").value = id;
    document.getElementById("history-modal").style.display = "flex";
    triggerHaptic('light');
    
    // Set date: from item or today
    if (item.date) document.getElementById("history-date").value = item.date;
    else document.getElementById("history-date").valueAsDate = new Date();

    const reaction = item.reaction || "";
    document.getElementById("history-reaction").value = reaction;
    
    // Highlight verdict button if matches
    document.querySelectorAll(".verdict-btn").forEach(btn => {
        btn.classList.remove("active");
        const verdictText = btn.querySelector("span:last-child")?.innerText;
        const emoji = btn.querySelector("span:first-child")?.innerText;
        if (reaction.includes(emoji) || (verdictText && reaction.toLowerCase().includes(verdictText.toLowerCase()))) {
            btn.classList.add("active");
        }
    });
    
    // Trigger star rating and status UI updates
    setStarRating(item.rating || 0);
    setHistoryStatus(item.status);
}

export function setReactionInput(text, btn) {
    const input = document.getElementById("history-reaction");
    if (!input) return;

    triggerHaptic('light');

    // Reset all verdict buttons
    document.querySelectorAll(".verdict-btn").forEach(b => b.classList.remove("active"));
    
    if (btn) {
        btn.classList.add("active");
        // If the textarea is empty or just has another emoji, replace it. 
        // If it has a custom comment, just prepend the verdict.
        const currentVal = input.value.trim();
        const emojiMatch = currentVal.match(/^(\p{Emoji_Presentation}\s[^\n]+)/u);
        
        if (!currentVal || emojiMatch) {
            input.value = text;
        } else {
            // Keep the comment but update the verdict if it's there
            input.value = text + "\n" + currentVal;
        }
    } else {
        input.value = text;
    }
}

export function setStarRating(rating) {
    triggerHaptic('light');
    document.getElementById("history-rating").value = rating;
    const stars = document.querySelectorAll(".star-btn");
    stars.forEach(btn => {
        const r = parseInt(btn.getAttribute("data-rating"));
        if (r <= rating) {
            btn.classList.add("text-[#faa61a]");
            btn.classList.remove("text-gray-600");
        } else {
            btn.classList.remove("text-[#faa61a]");
            btn.classList.add("text-gray-600");
        }
    });
}

export function setHistoryStatus(status) {
    triggerHaptic('light');
    currentHistoryStatus = status;

    document.querySelectorAll(".status-btn").forEach((btn) => {
        btn.classList.add("opacity-50");
        btn.classList.remove("bg-[#40444b]", "border-[#eb459e]");
    });

    const activeBtn = document.getElementById(`status-${status}`);
    if (activeBtn) {
        activeBtn.classList.remove("opacity-50");
        activeBtn.classList.add("bg-[#40444b]", "border-[#eb459e]");
    }

    const dateWrapper = document.getElementById("history-date-wrapper");
    const reactionWrapper = document.getElementById("history-reaction-wrapper");

    if (status === "unseen") {
        dateWrapper.classList.add("hidden");
        reactionWrapper.classList.add("hidden");
    } else if (status === "watching") {
        dateWrapper.classList.remove("hidden");
        reactionWrapper.classList.add("hidden");
    } else if (status === "seen") {
        dateWrapper.classList.remove("hidden");
        reactionWrapper.classList.remove("hidden");
    }
}

export async function saveHistory() {
    const id = parseInt(document.getElementById("history-item-id").value);
    const date = document.getElementById("history-date").value;
    const reaction = document.getElementById("history-reaction").value;
    const rating = parseInt(document.getElementById("history-rating").value) || 0;

    const { supabase } = await import('../core/supabase.js');

    // Logic: if not "unseen", we might want a date. 
    const finalDate = (currentHistoryStatus !== "unseen" && !date) ? new Date().toISOString().split('T')[0] : date;

    if (currentHistoryStatus === "unseen") {
        delete state.watchHistory[id];
        delete state.ratings[id];
        await supabase.from('library_ratings').delete().match({ media_id: id });
        triggerHaptic('heavy');
    } else {
        triggerHaptic('success');
        // Save to Supabase
        const { error } = await supabase.from('library_ratings').upsert({
            media_id: id,
            rating: rating,
            status: currentHistoryStatus,
            reaction: reaction,
            seen_date: finalDate || null,
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error("Save history error:", error);
            if (window.showNotification) window.showNotification("Chyba při ukládání... 😕", "error");
            return;
        }

        // Update local state
        state.ratings[id] = rating;
        state.watchHistory[id] = {
            rating: rating,
            status: currentHistoryStatus,
            date: finalDate,
            reaction: reaction
        };
    }

    // Refresh calendar state if date changed
    if (finalDate) {
        if (!state.movieHistory[finalDate]) state.movieHistory[finalDate] = [];
        state.movieHistory[finalDate] = state.movieHistory[finalDate].filter(m => m.media_id !== id);
        
        if (currentHistoryStatus === 'seen') {
            state.movieHistory[finalDate].push({
                media_id: id,
                rating: rating,
                status: currentHistoryStatus,
                reaction: reaction
            });
        }
    }

    if (window.closeModal) window.closeModal("history-modal");
    else document.getElementById("history-modal").style.display = "none";

    if (window.showNotification) window.showNotification("Deníček aktualizován! 📝", "success");

    renderLibrary(state.currentChannel);

    if (state.currentChannel === 'calendar') {
        import('./calendar.js').then(m => m.renderCalendar());
    } else if (state.currentChannel === 'watchlist') {
        import('./watchlist.js').then(m => m.renderWatchlist());
    }
}

export function deleteHistory() {
    triggerHaptic('light');
    const id = document.getElementById("history-item-id").value;
    if (!id) return;
    document.getElementById("delete-history-modal").style.display = "flex";
}

export async function confirmDeleteHistory() {
    const id = parseInt(document.getElementById("history-item-id").value);
    if (!id) return;

    triggerHaptic('heavy');

    try {
        const { error } = await supabase.from('library_ratings').delete().match({ media_id: id });
        if (error) throw error;

        // Find and remove from movieHistory (by date)
        if (state.watchHistory[id]?.date) {
            const date = state.watchHistory[id].date;
            if (state.movieHistory[date]) {
                state.movieHistory[date] = state.movieHistory[date].filter(m => m.media_id !== id);
            }
        }

        delete state.watchHistory[id];
        delete state.ratings[id];

        if (window.closeModal) {
            window.closeModal("delete-history-modal");
            window.closeModal("history-modal");
        } else {
            document.getElementById("delete-history-modal").style.display = "none";
            document.getElementById("history-modal").style.display = "none";
        }

        if (window.showNotification) window.showNotification("Záznam smazán 🗑️", "success");

        renderLibrary(state.currentChannel);
        
        if (state.currentChannel === 'calendar') {
            import('./calendar.js').then(m => m.renderCalendar());
        } else if (state.currentChannel === 'watchlist') {
            import('./watchlist.js').then(m => m.renderWatchlist());
        }
    } catch (e) {
        console.error("Delete history error:", e);
        if (window.showNotification) window.showNotification("Chyba při mazání... 😕", "error");
    }
}

// --- PLANNING ---

let currentPlanData = { title: "", type: "" };

export function openPlanningModal(title, type) {
    currentPlanData = { title, type };

    const titleEl = document.getElementById("plan-item-title");
    const typeEl = document.getElementById("plan-item-type");

    if (titleEl) titleEl.innerText = title;
    if (typeEl) typeEl.innerText = type === "game" ? "HRA" : "FILM / SERIÁL";

    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("lib-plan-date");
    if (dateInput) dateInput.value = today;

    const noteInput = document.getElementById("lib-plan-note");
    if (noteInput) noteInput.value = "";

    triggerHaptic('light');
    document.getElementById("library-plan-modal").style.display = "flex";
}

export async function confirmLibraryPlan() {
    const dateStr = document.getElementById("lib-plan-date").value;
    const timeStr = document.getElementById("lib-plan-time").value;
    const noteStr = document.getElementById("lib-plan-note").value;

    if (!dateStr) {
        if (window.showNotification) window.showNotification("Musíš vybrat datum!", "error");
        return;
    }

    const newPlan = {
        name: currentPlanData.title,
        cat: currentPlanData.type,
        time: timeStr,
        note: noteStr || "Z knihovny",
        date_key: dateStr
    };

    state.plannedDates[dateStr] = newPlan;

    triggerHaptic('success');
    await supabase.from('planned_dates').insert(newPlan);

    if (window.closeModal) window.closeModal("library-plan-modal");
    else document.getElementById("library-plan-modal").style.display = "none";

    if (window.showNotification) window.showNotification(`📅 Naplánováno: ${currentPlanData.title}`, "success");
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
}

// --- MANUAL & UPGRADE ---

export function renderManual() {
    const container = document.getElementById("messages-container");
    container.innerHTML = `
                      <div class="flex gap-4 items-start animate-fade-in"><img src="img/app/jozka_profilovka.jpg"
                       alt="Jožka"
                       class="w-10 h-10 rounded-full object-cover mt-1 shadow-md"><div class="flex-1"><div class="flex items-baseline gap-2"><span class="font-bold text-[var(--text-header)]">Jožka</span><span class="text-xs text-[var(--interactive-normal)]">Pinned</span></div><div class="bg-gradient-to-br from-[#2f3136] to-[#202225] border-l-4 border-[#faa61a] p-4 rounded-r-lg mt-3"><h3 class="font-bold text-white text-lg mb-3 flex items-center gap-2"><i class="fas fa-graduation-cap text-[#faa61a]"></i> Návod na stahování</h3><div class="space-y-4"><div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">1</div><div><p class="font-bold text-white">Instalace qBittorrent</p><p class="text-[var(--text-normal)] text-sm">Stáhni si z <a href="https://www.qbittorrent.org/download.php" target="_blank" class="text-[#5865F2] hover:underline font-bold">qbittorrent.org/download</a>. Neboj, není to virus.</p></div></div><div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">2</div><div><p class="font-bold text-white">Magnet Link 🧲</p><p class="text-[var(--text-normal)] text-sm">V knihovně klikni na ikonu stahování u položky. Otevře se ti to přímo v klientovi.</p></div></div><div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">3</div><div><p class="font-bold text-white">HDMI kabel (ten 5m)</p><p class="text-[var(--text-normal)] text-sm">Připoj notebook k TV, zmáčkni <code class="bg-black px-1 rounded text-white">Win + P</code> a vyber "Duplicate" nebo "Extend".</p></div></div></div></div></div></div>`;
}

export function renderUpgrade() {
    const container = document.getElementById("messages-container");
    container.innerHTML = `
                  <div class="message-group animate-fade-in">
                      <div class="message-actions">
                          <i class="fas fa-download text-gray-400 hover:text-white cursor-pointer p-1" data-tooltip="Rychlé stažení"></i>
                      </div>
                      <div class="flex gap-4 items-start">
                          <img src="img/app/jozka_profilovka.jpg" alt="Jožka" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md" loading="lazy">
                          <div class="flex-1">
                              <div class="flex items-baseline gap-2">
                                  <span class="font-bold text-[var(--text-header)]">Jožka</span>
                                  <span class="text-xs text-[var(--interactive-normal)]">Pinned</span>
                              </div>
                              <div onclick="import('./js/modules/library.js').then(m => m.startConfession())" class="mt-4 bg-[#2f3136] border border-[#292b2f] rounded p-3 flex items-center gap-3 w-full max-w-sm cursor-pointer hover:bg-[#36393f] transition group">
                                  <div class="file-icon-wrapper w-10 h-10 flex items-center justify-center text-4xl text-[#5865F2]">
                                      <i class="fas fa-file-code"></i>
                                  </div>
                                  <div class="flex-1 min-w-0">
                                      <div class="text-[#5865F2] font-medium truncate group-hover:underline text-sm">system_patch_v2.0.exe</div>
                                      <div class="text-xs text-[#b9bbbe]">1.2 MB • Executable</div>
                                  </div>
                                  <div class="text-[#b9bbbe] hover:text-white transition text-lg">
                                      <i class="fas fa-download"></i>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>`;
}

export function startConfession() {
    import('./confession.js').then(m => m.startConfession());
}

// Watchlist export/clear helpers
export function exportWatchlist() {
    // Basic alert or logic
    if (window.showNotification) window.showNotification("Export zatím není implementován (Jožka je líný)", "info");
}

export async function clearWatchlist() {
    state.watchlist = [];
    await supabase.from('library_watchlist').delete().not('media_id', 'is', null); 
    renderLibrary(state.currentChannel);
    if (window.showNotification) window.showNotification("Watchlist vyčištěn", "success");
}

// --- ADD NEW MEDIA ---

export function showAddMediaModal(category) {
    triggerHaptic('light');
    const modal = document.createElement('div');
    modal.id = 'media-admin-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
    
    const displayType = category === 'movies' ? 'film' : (category === 'series' ? 'seriál' : 'hru');
    const categories = category === 'games' 
        ? ["RPG", "FPS", "Strategie", "Simulátor", "Závodní", "Ostatní"]
        : ["Akční", "Sci-Fi", "Komedie", "Animovaný", "Fantasy", "Drama", "Horor", "Romantický", "Dobrodružný", "Ostatní"];

    modal.innerHTML = `
        <div class="bg-[#36393f] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center bg-[#2f3136]">
                <h3 class="text-xl font-black text-white tracking-widest uppercase">Přidat nový ${displayType} 🎬</h3>
                <button onclick="this.closest('#media-admin-modal').remove()" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Název</label>
                    <input type="text" id="m-title" placeholder="Např. Inception" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#5865F2] outline-none transition">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Ikona (emoji)</label>
                        <input type="text" id="m-icon" placeholder="🎬" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#5865F2] outline-none transition text-center text-2xl">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Kategorie</label>
                        <select id="m-cat" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#5865F2] outline-none transition">
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Magnet Link (volitelné)</label>
                    <input type="text" id="m-magnet" placeholder="magnet:?xt=..." class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#5865F2] outline-none transition text-xs font-mono">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Google Drive Link (volitelné)</label>
                    <input type="text" id="m-gdrive" placeholder="https://drive.google.com/..." class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#5865F2] outline-none transition text-xs">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Mood Tags / Vibes (oddělit čárkou)</label>
                    <input type="text" id="m-moods" placeholder="Např. Doják, Napínavé, Pohoda" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#5865F2] outline-none transition text-xs">
                </div>
            </div>
            
            <div class="p-6 bg-[#2f3136] border-t border-gray-700">
                <button onclick="import('./js/modules/library.js').then(m => m.saveNewMedia('${category}'))" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-4 rounded-xl font-black text-lg transition shadow-xl transform active:scale-95">
                    ULOŽIT DO KNIHOVNY 🚀
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export async function saveNewMedia(category) {
    const title = document.getElementById('m-title').value.trim();
    const icon = document.getElementById('m-icon').value.trim() || "🎬";
    const cat = document.getElementById('m-cat').value;
    const magnet = document.getElementById('m-magnet').value.trim();
    const gdrive = document.getElementById('m-gdrive').value.trim();
    const moodTags = document.getElementById('m-moods').value.split(',').map(t => t.trim()).filter(t => t !== "");
    
    if (!title) {
        alert("Název je povinný!");
        return;
    }
    
    const dbType = category === 'movies' ? 'movie' : (category === 'series' ? 'series' : 'game');
    
    triggerHaptic('success');
    
    try {
        const { data: newItems, error } = await supabase.from('library_content').insert([{
            type: dbType,
            title, icon, category: cat, magnet, gdrive,
            mood_tags: moodTags
        }]).select();
        
        if (error) throw error;
        
        // Update local state
        const newItem = newItems[0];
        if (!state.library[category]) state.library[category] = [];
        state.library[category].push({
            id: newItem.id,
            title: newItem.title,
            icon: newItem.icon,
            cat: newItem.category,
            magnet: newItem.magnet,
            gdrive: newItem.gdrive,
            mood_tags: newItem.mood_tags
        });
        
        // Close modal
        document.getElementById('media-admin-modal')?.remove();
        
        // Notification
        if (window.showNotification) window.showNotification(`${title} přidán do knihovny!`, "success");
        if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
        
        // Re-render
        renderLibrary(category);
        
    } catch (err) {
        console.error("Save Media Error:", err);
        alert("Chyba při ukládání: " + err.message);
    }
}
