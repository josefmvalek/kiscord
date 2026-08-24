import { triggerHaptic } from '@core/utils.js';
import { getCountdownHtml, renderInfoTabHtml } from './guide.js';
import {
    renderChecklistTabHtml,
    calculateTotalProgress,
    togglePackingItem,
    searchPackingList,
    filterPackingList,
    toggleCategoryCollapse,
    resetPackingList
} from './packlist.js';

let activeTab = 'info'; // 'info' | 'checklist'

export {
    getCountdownHtml,
    renderInfoTabHtml,
    renderChecklistTabHtml,
    calculateTotalProgress,
    togglePackingItem,
    searchPackingList,
    filterPackingList,
    toggleCategoryCollapse,
    resetPackingList
};

export function switchAustriaTab(tab) {
    activeTab = tab;
    triggerHaptic('light');

    const contentArea = document.getElementById("austria-info-content-area");
    const tabBtnInfo = document.getElementById("tab-btn-info");
    const tabBtnChecklist = document.getElementById("tab-btn-checklist");

    if (contentArea) {
        contentArea.innerHTML = activeTab === 'info' ? renderInfoTabHtml() : renderChecklistTabHtml();
    }

    if (tabBtnInfo && tabBtnChecklist) {
        if (activeTab === 'info') {
            tabBtnInfo.className = "text-xs font-black uppercase tracking-wider py-1 border-b-2 border-[#ff5252] text-white transition-all";
            tabBtnChecklist.className = "text-xs font-black uppercase tracking-wider py-1 border-b-2 border-transparent text-gray-400 hover:text-white transition-all flex items-center gap-1.5";
        } else {
            tabBtnInfo.className = "text-xs font-black uppercase tracking-wider py-1 border-b-2 border-transparent text-gray-400 hover:text-white transition-all";
            tabBtnChecklist.className = "text-xs font-black uppercase tracking-wider py-1 border-b-2 border-[#ff5252] text-white transition-all flex items-center gap-1.5";
        }
    }
}

export function renderAustriaInfo() {
    // Expose functions globally to window for onclick handlers
    window.switchAustriaTab = switchAustriaTab;
    window.togglePackingItem = togglePackingItem;
    window.searchPackingList = searchPackingList;
    window.filterPackingList = filterPackingList;
    window.toggleCategoryCollapse = toggleCategoryCollapse;
    window.resetPackingList = resetPackingList;

    const container = document.getElementById("messages-container");
    if (!container) return;

    triggerHaptic('light');

    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16 font-sans">
            <!-- Header Banner -->
            <div class="relative bg-gradient-to-br from-red-950 via-slate-900 to-indigo-950/40 border-b border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[190px] pt-6">
                <div class="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                <!-- Austrian flag subtle accent stripes -->
                <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-white to-red-600"></div>
                
                <div class="relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 shadow-xl mb-2 animate-bounce-slow">
                    <i class="fas fa-info-circle text-white text-xl drop-shadow-md"></i>
                </div>
                <h1 class="relative z-10 text-xl lg:text-2xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Rakousko: Informace Hub 🏔️ℹ️</h1>
                <p class="relative z-10 text-gray-300 font-semibold mt-0.5 text-center text-[10px] uppercase tracking-wider max-w-md">Vše důležité na jednom místě</p>
                
                <!-- Navigation Tabs inside Header -->
                <div class="flex justify-center w-full border-t border-white/5 bg-black/10 mt-5 py-2.5 gap-6 relative z-10">
                    <button onclick="window.switchAustriaTab('info')" id="tab-btn-info" 
                            class="text-xs font-black uppercase tracking-wider py-1 border-b-2 ${activeTab === 'info' ? 'border-[#ff5252] text-white' : 'border-transparent text-gray-400 hover:text-white'} transition-all">
                        ℹ️ Průvodce a informace
                    </button>
                    <button onclick="window.switchAustriaTab('checklist')" id="tab-btn-checklist" 
                            class="text-xs font-black uppercase tracking-wider py-1 border-b-2 ${activeTab === 'checklist' ? 'border-[#ff5252] text-white' : 'border-transparent text-gray-400 hover:text-white'} transition-all flex items-center gap-1.5">
                        🎒 Co zabalit s sebou
                        <span id="header-progress-badge" class="bg-red-500/20 text-[#ff5252] border border-red-500/30 text-[8px] font-black px-1.5 py-0.5 rounded-full select-none">
                            ${calculateTotalProgress()}%
                        </span>
                    </button>
                </div>
            </div>

            <div class="max-w-4xl mx-auto px-4 pt-6" id="austria-info-content-area">
                ${activeTab === 'info' ? renderInfoTabHtml() : renderChecklistTabHtml()}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Start auto-updating countdown timer safely
    if (window._austriaInfoTimer) clearInterval(window._austriaInfoTimer);
    window._austriaInfoTimer = setInterval(() => {
        const el = document.getElementById("austria-countdown-widget");
        if (!el) {
            clearInterval(window._austriaInfoTimer);
            return;
        }
        el.outerHTML = `<div id="austria-countdown-widget">${getCountdownHtml()}</div>`;
    }, 30000); // refresh every 30 seconds
}
