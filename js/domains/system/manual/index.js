/**
 * Kiscord - Návod & Kompletní průvodce aplikací (#návod) Orchestrator
 */

import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { toggleTheme, showNotification } from '@core/theme.js';
import { 
    KEY_CHANNELS, 
    CATEGORIES, 
    FLYWHEEL_NODES, 
    GUIDE_ITEMS, 
    SHORTCUTS, 
    FAQS, 
    VOUCHER_PRICES 
} from './data.js';
import { 
    activePerspective, 
    activeCategory, 
    searchQuery, 
    activeFlywheelNode, 
    activeSimulatorTab, 
    simCoinsState, 
    simOfflineState, 
    simSunflowerState, 
    setActivePerspective, 
    setActiveCategory, 
    setSearchQuery, 
    setActiveFlywheelNode, 
    setActiveSimulatorTab, 
    getExploredChannels, 
    recordChannelExploration, 
    calculateExplorationStats 
} from './state.js';
import { 
    renderCoinsCalculatorResult, 
    renderOfflineSimulatorResult, 
    renderSunflowerPreviewResult, 
    renderSimulatorContent 
} from './simulators.js';
import { 
    renderGuideItemCard, 
    renderManualLayout 
} from './templates.js';

export {
    KEY_CHANNELS,
    CATEGORIES,
    FLYWHEEL_NODES,
    GUIDE_ITEMS,
    SHORTCUTS,
    FAQS,
    VOUCHER_PRICES,
    getExploredChannels,
    recordChannelExploration,
    calculateExplorationStats
};

function executeSwitchChannel(channelId) {
    recordChannelExploration(channelId);
    if (typeof window !== 'undefined' && typeof window.switchChannel === 'function') {
        window.switchChannel(channelId);
    } else {
        import('@core/router.js').then(r => r.switchChannel(channelId)).catch(console.error);
    }
}

function updateCategoryPillsUI() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        const isSelected = btn.dataset.category === activeCategory;
        btn.className = `category-btn px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
            isSelected 
            ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' 
            : 'bg-[#2f3136] text-gray-300 hover:bg-[#36393f] hover:text-white border border-white/5'
        }`;
    });
}

function updateFlywheelNodesUI() {
    const resetBtn = document.getElementById('flywheel-reset-btn');
    if (resetBtn) {
        resetBtn.classList.toggle('hidden', !activeFlywheelNode);
    }

    document.querySelectorAll('.flywheel-node-card').forEach(card => {
        const isSelected = card.dataset.node === activeFlywheelNode;
        card.className = `flywheel-node-card cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
            isSelected 
            ? 'bg-black/50 border-amber-400 shadow-lg shadow-amber-400/20 scale-105' 
            : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/30'
        }`;
    });
}

function updateExplorationUI() {
    const stats = calculateExplorationStats();

    const pctEl = document.getElementById('exploration-pct-text');
    if (pctEl) pctEl.textContent = `${stats.pct}%`;

    const barEl = document.getElementById('exploration-progress-bar');
    if (barEl) barEl.style.width = `${stats.pct}%`;

    const descEl = document.getElementById('exploration-desc-text');
    if (descEl) {
        descEl.innerHTML = `
            <span>Navštíveno: <strong class="text-white">${stats.explored.length}</strong> / ${stats.total} modulů</span>
            ${stats.pct === 100 ? '<span class="text-emerald-400 font-bold">Dokončeno! 🏆</span>' : '<span>Zbývá ' + stats.remaining + '</span>'}
        `;
    }
}

function updateFilteredList() {
    const container = document.getElementById("manual-cards-container");
    if (!container) return;

    const filtered = GUIDE_ITEMS.filter(item => {
        if (activePerspective !== 'all' && item.perspectives && !item.perspectives.includes(activePerspective)) {
            return false;
        }

        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        if (!matchesCategory) return false;

        if (!searchQuery) return true;

        const textToSearch = `${item.title} ${item.channelName} ${item.summary} ${item.bullets.join(' ')} ${item.keywords} ${item.proTip || ''}`.toLowerCase();
        return textToSearch.includes(searchQuery);
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12 text-center bg-[#202225]/50 rounded-2xl border border-white/5">
                <i class="fas fa-search text-4xl text-gray-500 mb-3"></i>
                <h3 class="text-lg font-bold text-white">Nebyly nalezeny žádné výsledky</h3>
                <p class="text-xs text-gray-400 mt-1">Zkus upravit hledaný výraz "${searchQuery}" nebo přepnout perspektivu či kategorii.</p>
                <button type="button" onclick="window.manualGuide.clearSearch()" class="mt-4 px-4 py-2 rounded-xl bg-[#5865F2] text-white text-xs font-bold shadow-md hover:bg-[#4752C4] transition">
                    Zrušit filtr vyhledávání
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(renderGuideItemCard).join('');
}

export function renderManual() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    recordChannelExploration('manual');
    const stats = calculateExplorationStats();

    window.manualGuide = {
        setPerspective: (p) => {
            setActivePerspective(p);
            triggerHaptic('light');
            
            document.querySelectorAll('.perspective-btn').forEach(btn => {
                const isSelected = btn.dataset.perspective === p;
                btn.className = `perspective-btn p-2.5 rounded-xl text-left transition-all border ${
                    isSelected 
                    ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25 scale-[1.02]' 
                    : 'bg-black/20 border-white/5 text-gray-300 hover:bg-black/30 hover:text-white'
                }`;
            });
            updateFilteredList();
        },
        setCategory: (catId) => {
            setActiveCategory(catId);
            setActiveFlywheelNode(null);
            triggerHaptic('light');

            updateCategoryPillsUI();
            updateFlywheelNodesUI();
            updateFilteredList();
        },
        selectFlywheelNode: (nodeId) => {
            if (activeFlywheelNode === nodeId) {
                setActiveFlywheelNode(null);
                setActiveCategory('all');
            } else {
                setActiveFlywheelNode(nodeId);
                const node = FLYWHEEL_NODES.find(n => n.id === nodeId);
                if (node) setActiveCategory(node.targetCategory);
            }
            triggerHaptic('medium');

            updateFlywheelNodesUI();
            updateCategoryPillsUI();
            updateFilteredList();
        },
        setSimulatorTab: (tabId) => {
            setActiveSimulatorTab(tabId);
            triggerHaptic('light');

            document.querySelectorAll('.sim-tab-btn').forEach(btn => {
                const isSelected = btn.dataset.tab === tabId;
                btn.className = `sim-tab-btn px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                    isSelected 
                    ? 'bg-[#5865F2] text-white shadow' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`;
            });
            renderSimulatorContent();
        },
        updateSimCoins: (field, value) => {
            simCoinsState[field] = Number(value);
            triggerHaptic('selection');
            renderCoinsCalculatorResult();
        },
        simToggleOffline: (goOnline) => {
            simOfflineState.isOnline = goOnline;
            triggerHaptic('medium');
            renderOfflineSimulatorResult();
        },
        simAddOfflineAction: () => {
            simOfflineState.queueCount += 1;
            triggerHaptic('light');
            showNotification('Záznam byl bezpečně uložen do lokální IndexedDB fronty! 📦', 'info');
            renderOfflineSimulatorResult();
        },
        simFlushQueue: () => {
            if (simOfflineState.queueCount === 0) return;
            simOfflineState.isSyncing = true;
            renderOfflineSimulatorResult();
            setTimeout(() => {
                simOfflineState.queueCount = 0;
                simOfflineState.isSyncing = false;
                triggerHaptic('success');
                triggerConfetti();
                showNotification('Všechna offline data byla úspěšně odeslána do Supabase! 🎉', 'success');
                renderOfflineSimulatorResult();
                updateExplorationUI();
            }, 900);
        },
        updateSimSunflower: (field, value) => {
            if (field === 'mood') simSunflowerState.mood = Number(value);
            if (field === 'sleepHours') simSunflowerState.sleepHours = Number(value);
            if (field === 'sleep') {
                if (typeof value === 'boolean') {
                    simSunflowerState.isSleeping = value;
                } else {
                    simSunflowerState.sleepHours = Number(value);
                }
            }
            if (field === 'water') simSunflowerState.water = Number(value);
            if (field === 'sleeping' || field === 'isSleeping') simSunflowerState.isSleeping = Boolean(value);
            triggerHaptic('selection');
            renderSunflowerPreviewResult();
        },
        handleSearch: (e) => {
            setSearchQuery(e.target.value.toLowerCase().trim());
            updateFilteredList();
        },
        clearSearch: () => {
            setSearchQuery('');
            const input = document.getElementById('manual-search-input');
            if (input) input.value = '';
            updateFilteredList();
        },
        jumpToChannel: (channelId) => {
            triggerHaptic('medium');
            triggerConfetti();
            showNotification(`Přepínám do kanálu #${channelId}...`, 'info');
            executeSwitchChannel(channelId);
        },
        toggleFaq: (idx) => {
            const el = document.getElementById(`faq-ans-${idx}`);
            const icon = document.getElementById(`faq-icon-${idx}`);
            if (el) {
                const isHidden = el.classList.contains('hidden');
                el.classList.toggle('hidden', !isHidden);
                if (icon) {
                    icon.classList.toggle('rotate-180', isHidden);
                }
                triggerHaptic('light');
            }
        },
        quickTheme: () => {
            toggleTheme();
            triggerHaptic('success');
            showNotification('Téma bylo úspěšně přepnuto! 🎨', 'success');
        }
    };

    container.innerHTML = renderManualLayout({
        activePerspective,
        explorationPct: stats.pct,
        exploredCount: stats.explored.length,
        keyChannelsTotal: stats.total,
        activeFlywheelNode,
        activeCategory,
        searchQuery,
        activeSimulatorTab
    });

    renderSimulatorContent();
    updateFilteredList();
}

export default {
    renderManual,
    recordChannelExploration,
    getExploredChannels,
    calculateExplorationStats,
    KEY_CHANNELS,
    CATEGORIES,
    FLYWHEEL_NODES,
    GUIDE_ITEMS,
    SHORTCUTS,
    FAQS,
    VOUCHER_PRICES
};
