import { state, saveStateToCache } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { updateHealth } from '@domains/fitness/health.js';

/**
 * Inicializuje plovoucí FAB a spodní Quick-Log drawer v aplikaci
 */
export function initQuickLogDrawer() {
    let existingFab = document.getElementById('global-quick-log-fab');
    if (existingFab) return;

    // 1. Vytvoření FAB tlačítka
    const fab = document.createElement('button');
    fab.id = 'global-quick-log-fab';
    fab.className = 'quick-log-fab';
    fab.setAttribute('aria-label', 'Rychlý záznam');
    fab.innerHTML = '<i class="fas fa-plus text-lg"></i>';
    fab.onclick = openQuickLogDrawer;
    document.body.appendChild(fab);

    // 2. Vytvoření Drawer kontejneru
    const drawer = document.createElement('div');
    drawer.id = 'global-quick-log-drawer';
    drawer.className = 'quick-log-drawer';
    drawer.onclick = (e) => {
        if (e.target === drawer) closeQuickLogDrawer();
    };

    drawer.innerHTML = `
    <div class="quick-log-sheet space-y-4">
        <!-- Drawer Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5865f2] to-[#ec4899] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    ⚡
                </span>
                <div>
                    <h3 class="text-sm font-black text-white">1-Tap Rychlý Záznam</h3>
                    <p class="text-[11px] text-gray-400">Zapiš metriku za méně než 2 sekundy</p>
                </div>
            </div>
            <button onclick="window.closeQuickLogDrawer()" class="w-8 h-8 rounded-lg bg-[#202225] text-gray-400 hover:text-white flex items-center justify-center transition">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Quick Log Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <!-- 💧 Voda -->
            <button 
                onclick="window.quickLogWater(1)" 
                class="p-3 bg-[#202225] hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/5 rounded-xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center"
            >
                <span class="text-xl">💧</span>
                <span class="font-bold text-gray-200">+0.5 L Voda</span>
                <span class="text-[10px] text-cyan-400 font-semibold">Hydratace</span>
            </button>

            <!-- ☕ Káva -->
            <button 
                onclick="window.quickLogCaffeineDrawer('espresso', 63)" 
                class="p-3 bg-[#202225] hover:bg-amber-500/20 hover:border-amber-500/40 border border-white/5 rounded-xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center"
            >
                <span class="text-xl">☕</span>
                <span class="font-bold text-gray-200">+1 Espresso</span>
                <span class="text-[10px] text-amber-400 font-semibold">+63 mg kofeinu</span>
            </button>

            <!-- 👟 Kroky -->
            <button 
                onclick="window.quickLogStepsDrawer(2000)" 
                class="p-3 bg-[#202225] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/5 rounded-xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center"
            >
                <span class="text-xl">👟</span>
                <span class="font-bold text-gray-200">+2 000 Kroků</span>
                <span class="text-[10px] text-emerald-400 font-semibold">1.5 km chůze</span>
            </button>

            <!-- 🌸 Cyklus / Nálada -->
            <button 
                onclick="window.quickOpenCycleModal()" 
                class="p-3 bg-[#202225] hover:bg-pink-500/20 hover:border-pink-500/40 border border-white/5 rounded-xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center"
            >
                <span class="text-xl">🌸</span>
                <span class="font-bold text-gray-200">Záznam Cyklu</span>
                <span class="text-[10px] text-pink-400 font-semibold">Symptomy & nálada</span>
            </button>
        </div>
    </div>
    `;
    document.body.appendChild(drawer);
}

export function openQuickLogDrawer() {
    triggerHaptic('light');
    const drawer = document.getElementById('global-quick-log-drawer');
    if (drawer) drawer.classList.add('open');
}

export function closeQuickLogDrawer() {
    const drawer = document.getElementById('global-quick-log-drawer');
    if (drawer) drawer.classList.remove('open');
}

// Global actions
if (typeof window !== 'undefined') {
    window.openQuickLogDrawer = openQuickLogDrawer;
    window.closeQuickLogDrawer = closeQuickLogDrawer;

    window.quickLogWater = (increment) => {
        triggerHaptic('success');
        updateHealth('water', increment);
        closeQuickLogDrawer();
        if (typeof window.showNotification === 'function') {
            window.showNotification('Hydratace zapsána! 💧', 'success');
        }
    };

    window.quickLogCaffeineDrawer = (id, mg) => {
        if (typeof window.quickLogCaffeine === 'function') {
            window.quickLogCaffeine(id, mg);
        }
        closeQuickLogDrawer();
    };

    window.quickLogStepsDrawer = (amount) => {
        if (typeof window.quickAddSteps === 'function') {
            window.quickAddSteps(amount);
        }
        closeQuickLogDrawer();
    };

    window.quickOpenCycleModal = () => {
        closeQuickLogDrawer();
        if (typeof window.openCycleLogModal === 'function') {
            window.openCycleLogModal(getTodayKey());
        }
    };
}
