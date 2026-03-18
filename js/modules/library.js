import { state } from '../core/state.js';
// import { library } from '../data.js'; // Smazáno, nyní ze state
import { triggerHaptic } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { supabase } from '../core/supabase.js';

// --- LIBRARY RENDERING ---

export function renderLibrary(category) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const items = state.library[category] || [];

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

    let html = `<div class="p-6 pb-20 animate-fade-in space-y-10">`;

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
            const isBookmarked = watchlist.some((w) => typeof w === "object" ? w.id === item.id : w === item.id);

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
    const index = state.watchlist.findIndex(w => (typeof w === 'object' ? w.id === id : w === id));

    const item = state.library[state.currentChannel].find(i => i.id === id);
    const itemType = state.currentChannel === "games" ? "game" : "movie";

    if (index === -1) {
        state.watchlist.push({ id, type: itemType });
        triggerHaptic('success');
        if (typeof window.showNotification === 'function') window.showNotification('Přidáno do seznamu přání ❤️', 'success');

        await supabase.from('library_watchlist').insert({
            media_id: id.toString(),
            type: itemType,
            added_by: state.currentUser.id
        });
    } else {
        state.watchlist.splice(index, 1);
        triggerHaptic('light');

        await supabase.from('library_watchlist').delete().match({ media_id: id.toString() });
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
    const item = state.watchHistory[id] || { status: "unseen", date: "", reaction: "" };

    document.getElementById("history-item-id").value = id;
    document.getElementById("history-modal").style.display = "flex";

    if (item.date) document.getElementById("history-date").value = item.date;
    else document.getElementById("history-date").valueAsDate = new Date();

    document.getElementById("history-reaction").value = item.reaction || "";

    setHistoryStatus(item.status);
}

export function setHistoryStatus(status) {
    currentHistoryStatus = status;

    document.querySelectorAll(".status-btn").forEach((btn) => {
        btn.classList.add("opacity-50", "border-gray-600");
        btn.classList.remove("opacity-100", "border-[#eb459e]", "bg-[#2f3136]");
    });

    const activeBtn = document.getElementById(`status-${status}`);
    if (activeBtn) {
        activeBtn.classList.remove("opacity-50", "border-gray-600");
        activeBtn.classList.add("opacity-100", "border-[#eb459e]", "bg-[#2f3136]");
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
    const id = document.getElementById("history-item-id").value;
    const date = document.getElementById("history-date").value;
    const reaction = document.getElementById("history-reaction").value;

    const currentRating = state.ratings[id] || 0;

    if (currentHistoryStatus === "unseen") {
        delete state.watchHistory[id];
        await supabase.from('library_ratings').delete().match({ media_id: id.toString() });
    } else {
        state.watchHistory[id] = currentHistoryStatus;
        // In this version, we store rating separately in state.ratings
        // We update the DB with both status and current rating
        await supabase.from('library_ratings').upsert({
            media_id: id.toString(),
            rating: currentRating,
            status: currentHistoryStatus,
            updated_at: new Date().toISOString()
        });
    }

    if (window.closeModal) window.closeModal("history-modal");
    else document.getElementById("history-modal").style.display = "none";

    if (window.showNotification) window.showNotification("Deníček aktualizován! 📝", "success");

    renderLibrary(state.currentChannel);
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
