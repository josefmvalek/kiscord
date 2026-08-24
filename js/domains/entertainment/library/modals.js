import { triggerHaptic } from '@core/utils.js';
import { getAssetUrl } from '@core/assets.js';
import { state } from '@core/state.js';
import { safeInsert } from '@core/offline.js';

let currentDownloadLinks = { magnet: "", gdrive: "" };
let currentPlanData = { title: "", type: "" };

export function ensureModals() {
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
                        <button onclick="Library.openMagnetLink()"
                            class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-3">
                            <i class="fas fa-magnet"></i> Otevřít v qBittorrent
                        </button>
                        <button onclick="Library.openGoogleDrive()"
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
                        <div id="star-rating" class="flex justify-center gap-1 text-3xl mb-4">
                            ${[1, 2, 3, 4, 5].map(i => `<button onclick="Library.setStarRating(${i})" class="star-btn transition-transform hover:scale-125 focus:outline-none" data-rating="${i}"><i class="fas fa-star"></i></button>`).join('')}
                        </div>
                        <input type="hidden" id="history-rating" value="0" />
                    </div>
                    <div>
                        <label class="block text-[#b9bbbe] text-[10px] font-bold uppercase mb-2 tracking-widest">Stav sledování</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button onclick="Library.setHistoryStatus('unseen')" id="status-unseen" class="status-btn p-3 rounded-xl border border-gray-700 hover:bg-[#40444b] text-center transition opacity-50 flex flex-col items-center">
                                <span class="text-xl mb-1">💤</span>
                                <span class="text-[9px] font-black uppercase text-gray-400">V plánu</span>
                            </button>
                            <button onclick="Library.setHistoryStatus('watching')" id="status-watching" class="status-btn p-3 rounded-xl border border-gray-700 hover:bg-[#40444b] text-center transition opacity-50 flex flex-col items-center">
                                <span class="text-xl mb-1">🍿</span>
                                <span class="text-[9px] font-black uppercase text-blue-400">Koukáme</span>
                            </button>
                            <button onclick="Library.setHistoryStatus('seen')" id="status-seen" class="status-btn p-3 rounded-xl border border-gray-700 hover:bg-[#40444b] text-center transition opacity-50 flex flex-col items-center">
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
                                <button onclick="Library.setReactionInput('${r.e} ${r.t}', this)" class="verdict-btn bg-[#202225] hover:bg-[#${r.c}]/10 border border-[#2f3136] rounded-xl p-2.5 transition flex flex-col items-center gap-1 group">
                                    <span class="text-xl group-hover:scale-110 transition">${r.e}</span>
                                    <span class="text-[9px] font-bold text-gray-400 group-hover:text-white">${r.t}</span>
                                </button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="history-reaction" />
                    </div>
                </div>
                <div class="bg-black/20 p-5 border-t border-white/5 flex gap-3">
                    <button onclick="Library.deleteHistory()" id="delete-history-btn" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center hidden">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button onclick="Library.saveHistory()" class="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white py-2.5 rounded-xl font-bold transition shadow-lg text-sm">
                        Uložit do deníčku
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(histModal);
    }

    if (!document.getElementById("planning-modal")) {
        const planModal = document.createElement("div");
        planModal.id = "planning-modal";
        planModal.className = "fixed inset-0 z-[90] hidden modal-backdrop items-center justify-center p-4";
        planModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 overflow-hidden animate-fade-in">
                <div class="bg-black/20 p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 class="font-bold text-white flex items-center gap-2 text-sm">
                        <i class="far fa-calendar-plus text-[#5865F2]"></i> Naplánovat rande / promítání
                    </h3>
                    <button onclick="closeModal('planning-modal')" class="text-gray-400 hover:text-white text-xs">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-4 space-y-3">
                    <input type="hidden" id="lib-plan-title" />
                    <input type="hidden" id="lib-plan-type" />
                    <p class="text-xs text-gray-300" id="lib-plan-desc"></p>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Datum</label><input type="date" id="lib-plan-date" class="w-full bg-[#202225] text-white p-2 rounded border border-[#2f3136] outline-none focus:border-[#5865F2] text-sm" /></div>
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Čas (volitelně)</label><input type="time" id="lib-plan-time" class="w-full bg-[#202225] text-white p-2 rounded border border-[#2f3136] outline-none focus:border-[#5865F2] text-sm" /></div>
                    </div>
                    <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Poznámka</label><input type="text" id="lib-plan-note" placeholder="Deka, víno, popcorn..." class="w-full bg-[#202225] text-white p-2 rounded border border-[#2f3136] outline-none focus:border-[#5865F2] text-sm" /></div>
                    <button onclick="Library.confirmLibraryPlan()" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-2 rounded transition shadow-md mt-2">Uložit do kalendáře</button>
                </div>
            </div>
        `;
        document.body.appendChild(planModal);
    }

    if (!document.getElementById("delete-media-modal")) {
        const delModal = document.createElement("div");
        delModal.id = "delete-media-modal";
        delModal.className = "fixed inset-0 z-[200] hidden modal-backdrop items-center justify-center p-4";
        delModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-sm border border-red-500/50 p-8 text-center animate-fade-in">
                <div class="text-4xl mb-3 text-[#ed4245]"><i class="fas fa-exclamation-triangle"></i></div>
                <h3 class="text-xl font-bold text-white mb-2">Smazat položku?</h3>
                <p class="text-gray-300 mb-6 text-sm">Opravdu chceš smazat <span id="delete-media-name" class="font-bold text-white"></span> z knihovny? Tuhle akci nejde vzít zpět.</p>
                <div class="flex gap-3">
                    <button onclick="closeModal('delete-media-modal')" class="flex-1 bg-[#2f3136] hover:bg-[#40444b] text-white py-2 rounded font-bold transition">Zrušit</button>
                    <button id="confirm-delete-media-btn" class="flex-1 bg-[#ed4245] hover:bg-[#c03537] text-white py-2 rounded font-bold transition">Smazat</button>
                </div>
            </div>
        `;
        document.body.appendChild(delModal);
    }
}

export function openDownloadModal(magnet, gdrive) {
    ensureModals();
    currentDownloadLinks = { magnet, gdrive };

    const modal = document.getElementById("download-modal");
    if (!modal) return;

    triggerHaptic('light');
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

export function openPlanningModal(title, type) {
    ensureModals();
    currentPlanData = { title, type };

    const titleEl = document.getElementById("lib-plan-title");
    const descEl = document.getElementById("lib-plan-desc");

    if (titleEl) titleEl.value = title;
    if (descEl) descEl.innerText = `${type === "game" ? "Hra" : "Film/Seriál"}: ${title}`;

    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("lib-plan-date");
    if (dateInput) dateInput.value = today;

    const noteInput = document.getElementById("lib-plan-note");
    if (noteInput) noteInput.value = "";

    triggerHaptic('light');
    const modal = document.getElementById("planning-modal");
    if (modal) modal.style.display = "flex";
}

export async function confirmLibraryPlan() {
    const dateStr = document.getElementById("lib-plan-date")?.value;
    const timeStr = document.getElementById("lib-plan-time")?.value;
    const noteStr = document.getElementById("lib-plan-note")?.value;

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
    await safeInsert('planned_dates', newPlan);

    if (window.closeModal) window.closeModal("planning-modal");
    else document.getElementById("planning-modal").style.display = "none";

    if (window.showNotification) window.showNotification(`📅 Naplánováno: ${currentPlanData.title}`, "success");
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
}

export function renderManual() {
    const container = document.getElementById("messages-container");
    if (!container) return;
    container.innerHTML = `
        <div class="flex gap-4 items-start animate-fade-in">
            <img src="${getAssetUrl('jozka_profile')}" alt="Jožka" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md">
            <div class="flex-1">
                <div class="flex items-baseline gap-2">
                    <span class="font-bold text-[var(--text-header)]">Jožka</span>
                    <span class="text-xs text-[var(--interactive-normal)]">Pinned</span>
                </div>
                <div class="bg-gradient-to-br from-[#2f3136] to-[#202225] border-l-4 border-[#faa61a] p-4 rounded-r-lg mt-3">
                    <h3 class="font-bold text-white text-lg mb-3 flex items-center gap-2"><i class="fas fa-graduation-cap text-[#faa61a]"></i> Návod na stahování</h3>
                    <div class="space-y-4">
                        <div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">1</div><div><p class="font-bold text-white">Instalace qBittorrent</p><p class="text-[var(--text-normal)] text-sm">Stáhni si z <a href="https://www.qbittorrent.org/download.php" target="_blank" class="text-[#5865F2] hover:underline font-bold">qbittorrent.org/download</a>. Neboj, není to virus.</p></div></div>
                        <div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">2</div><div><p class="font-bold text-white">Magnet Link 🧲</p><p class="text-[var(--text-normal)] text-sm">V knihovně klikni na ikonu stahování u položky. Otevře se ti to přímo v klientovi.</p></div></div>
                        <div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">3</div><div><p class="font-bold text-white">HDMI kabel (ten 5m)</p><p class="text-[var(--text-normal)] text-sm">Připoj notebook k TV, zmáčkni <code class="bg-black px-1 rounded text-white">Win + P</code> a vyber "Duplicate" nebo "Extend".</p></div></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderUpgrade() {
    const container = document.getElementById("messages-container");
    if (!container) return;
    container.innerHTML = `
        <div class="message-group animate-fade-in">
            <div class="flex gap-4 items-start">
                <img src="${getAssetUrl('jozka_profile')}" alt="Jožka" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md" loading="lazy">
                <div class="flex-1">
                    <div class="flex items-baseline gap-2">
                        <span class="font-bold text-[var(--text-header)]">Jožka</span>
                        <span class="text-xs text-[var(--interactive-normal)]">Pinned</span>
                    </div>
                    <div onclick="window.loadModule('library').then(m => m.startConfession())" class="mt-4 bg-[#2f3136] border border-[#292b2f] rounded p-3 flex items-center gap-3 w-full max-w-sm cursor-pointer hover:bg-[#36393f] transition group">
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
        </div>
    `;
}

export function startConfession() {
    import('@domains/couple/confession.js').then(m => m.startConfession());
}
