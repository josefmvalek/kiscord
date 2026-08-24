import { state } from '@core/state.js';
import { isJosef } from '@core/auth.js';
import { triggerHaptic } from '@core/utils.js';
import { DEFAULT_PROFILES, calculateFullBiometrics } from './biometricsCalculator.js';
import { renderWeightTrendHero, renderCircumferencesSection } from './components.js';
import { openLogWeightModal, openLogCircumferencesModal, openBiometricsProfileModal } from './modals.js';

let activeUserKey = isJosef() ? 'josef' : 'klarka';
let activeSubtab = 'overview'; // 'overview' | 'circumferences' | 'biometrics' | 'photos'

/**
 * Main render function for #tělo-a-míry channel.
 */
export function renderBodyMetrics() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    if (!activeUserKey) {
        activeUserKey = isJosef() ? 'josef' : 'klarka';
    }

    const targetUserId = (activeUserKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;
    const measurements = (state.gymBodyMeasurements || []).filter(m => {
        if (m.user_id && targetUserId) return m.user_id === targetUserId;
        if (m.user_name) return m.user_name.toLowerCase() === activeUserKey.toLowerCase();
        return true;
    });

    const weightEntries = measurements.filter(m => m.weight);
    const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : (activeUserKey === 'josef' ? 82 : 62);
    const currentFat = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].body_fat : null;

    const profile = (state.biometricsProfiles && state.biometricsProfiles[activeUserKey]) || DEFAULT_PROFILES[activeUserKey] || DEFAULT_PROFILES.josef;
    const bioData = calculateFullBiometrics(profile, currentWeight, currentFat);

    container.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 md:p-6 space-y-5 animate-in fade-in duration-200">
            <!-- Header Bar -->
            <div class="bg-[#2f3136] p-4 rounded-2xl border border-white/5 shadow-lg space-y-3">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-2.5">
                        <span class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3ba55c] to-[#14b8a6] text-white flex items-center justify-center text-lg shadow-md">
                            <i class="fas fa-ruler-combined"></i>
                        </span>
                        <div>
                            <h2 class="text-base font-black text-white tracking-wide uppercase">Tělo, Míry & Biometrika</h2>
                            <p class="text-[11px] text-gray-400">Centrální hub tělesného progresu a biometrických dat</p>
                        </div>
                    </div>

                    <!-- Profile Switcher (Josef / Klárka) -->
                    <div class="flex p-1 bg-[#202225] rounded-xl border border-white/5 gap-1">
                        <button 
                            onclick="window.switchBodyMetricsUser('josef')" 
                            class="px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${activeUserKey === 'josef' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                        >
                            <span>🏋️‍♂️ Josef</span>
                        </button>
                        <button 
                            onclick="window.switchBodyMetricsUser('klarka')" 
                            class="px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${activeUserKey === 'klarka' ? 'bg-[#eb459e] text-white shadow-sm' : 'text-gray-400 hover:text-white'}"
                        >
                            <span>🌸 Klárka</span>
                        </button>
                    </div>
                </div>

                <!-- Subtabs -->
                <div class="grid grid-cols-4 p-1 bg-[#202225] rounded-xl border border-white/5 gap-1 text-xs">
                    <button 
                        onclick="window.switchBodyMetricsSubtab('overview')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'overview' ? 'bg-[#3ba55c] text-white shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-weight-scale text-xs"></i> <span>Váha & Cíle</span>
                    </button>
                    <button 
                        onclick="window.switchBodyMetricsSubtab('circumferences')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'circumferences' ? 'bg-[#5865F2] text-white shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-ruler-combined text-xs"></i> <span>Obvody</span>
                    </button>
                    <button 
                        onclick="window.switchBodyMetricsSubtab('biometrics')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'biometrics' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-brain text-xs"></i> <span>BMR & TDEE</span>
                    </button>
                    <button 
                        onclick="window.switchBodyMetricsSubtab('photos')" 
                        class="py-2 rounded-lg font-black transition flex items-center justify-center gap-1.5 ${activeSubtab === 'photos' ? 'bg-[#faa61a] text-black shadow-md' : 'text-gray-400 hover:text-white'}"
                    >
                        <i class="fas fa-camera text-xs"></i> <span>Fotodeník</span>
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div class="space-y-5">
                ${activeSubtab === 'overview' ? `
                    ${renderWeightTrendHero(bioData, weightEntries, activeUserKey)}
                    ${renderCircumferencesSection(measurements, activeUserKey)}
                ` : ''}

                ${activeSubtab === 'circumferences' ? `
                    ${renderCircumferencesSection(measurements, activeUserKey)}
                ` : ''}

                ${activeSubtab === 'biometrics' ? renderBiometricsDetailedView(bioData, activeUserKey) : ''}
                ${activeSubtab === 'photos' ? renderPhotosGalleryView() : ''}
            </div>
        </div>
    `;
}

function renderBiometricsDetailedView(bioData, userKey) {
    return `
        <div class="space-y-4">
            <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-white/5">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold">
                            <i class="fas fa-brain"></i>
                        </span>
                        <div>
                            <h3 class="text-sm font-black text-white uppercase tracking-wider">Metabolismus & Výdej Energie</h3>
                            <p class="text-[10px] text-gray-400">Přesný výpočet metabolismu na základě věku, výšky a aktivity</p>
                        </div>
                    </div>
                    <button 
                        onclick="window.openBiometricsProfileModal('${userKey}')"
                        class="py-1.5 px-3 bg-[#202225] hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition border border-white/5 flex items-center gap-1.5"
                    >
                        <i class="fas fa-gear text-[10px]"></i> <span>Upravit parametry</span>
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="bg-[#202225] p-3.5 rounded-xl border border-white/5">
                        <span class="text-[10px] text-gray-400 font-bold uppercase block">BMR (Bazální výdej)</span>
                        <div class="text-2xl font-black text-white mt-1">${bioData.bmr} <span class="text-xs text-gray-400 font-normal">kcal</span></div>
                        <p class="text-[10px] text-gray-500 mt-1">Energie potřebná pro základní funkce těla v klidu</p>
                    </div>

                    <div class="bg-[#202225] p-3.5 rounded-xl border border-white/5">
                        <span class="text-[10px] text-gray-400 font-bold uppercase block">TDEE (Celkový denní výdej)</span>
                        <div class="text-2xl font-black text-emerald-400 mt-1">${bioData.tdee} <span class="text-xs text-gray-400 font-normal">kcal</span></div>
                        <p class="text-[10px] text-gray-500 mt-1">${bioData.activityLevel.name} (${bioData.activityLevel.factor}x BMR)</p>
                    </div>

                    <div class="bg-[#202225] p-3.5 rounded-xl border border-white/5">
                        <span class="text-[10px] text-gray-400 font-bold uppercase block">Doporučená hydratace</span>
                        <div class="text-2xl font-black text-sky-400 mt-1">${(bioData.targetWaterMl / 1000).toFixed(1)} <span class="text-xs text-gray-400 font-normal">litrů / den</span></div>
                        <p class="text-[10px] text-gray-500 mt-1">35 ml na kg váhy + tréninkový přídavek</p>
                    </div>
                </div>

                <!-- Nutrition Breakdown for Goal -->
                <div class="p-4 bg-[#202225] rounded-xl border border-white/5 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-white uppercase tracking-wider">Doporučená denní makra podle profilu:</span>
                        <span class="text-xs font-black text-indigo-400">${bioData.targetCalories} kcal</span>
                    </div>

                    <div class="grid grid-cols-3 gap-2 text-center text-xs">
                        <div class="p-2 bg-[#2f3136] rounded-lg">
                            <span class="text-[10px] text-[#5865F2] font-bold block uppercase">Bílkoviny</span>
                            <span class="font-black text-white">${bioData.macros.protein}g</span>
                        </div>
                        <div class="p-2 bg-[#2f3136] rounded-lg">
                            <span class="text-[10px] text-[#faa61a] font-bold block uppercase">Sacharidy</span>
                            <span class="font-black text-white">${bioData.macros.carbs}g</span>
                        </div>
                        <div class="p-2 bg-[#2f3136] rounded-lg">
                            <span class="text-[10px] text-[#ed4245] font-bold block uppercase">Tuky</span>
                            <span class="font-black text-white">${bioData.macros.fats}g</span>
                        </div>
                    </div>

                    <button 
                        onclick="window.applyBiometricsToNutrition('${userKey}')"
                        class="w-full py-2.5 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 mt-2"
                    >
                        <i class="fas fa-bolt"></i> <span>Aplikovat tento plán do kanálu #výživa</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderPhotosGalleryView() {
    return `
        <div class="bg-[#2f3136] p-5 rounded-2xl border border-white/5 shadow-lg space-y-4 text-center py-10">
            <span class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-2">
                <i class="fas fa-camera"></i>
            </span>
            <h3 class="text-base font-black text-white uppercase tracking-wider">Fotodeník Formy & Before / After</h3>
            <p class="text-xs text-gray-400 max-w-md mx-auto">
                Vizuální sledování změn postavy v čase. Progresové fotky jsou bezpečně šifrovány a ukládány v Kiscordu.
            </p>
            <div class="pt-2">
                <button onclick="window.showNotification && window.showNotification('Nahrávání fotek je aktivní v plném profilu.', 'info')" class="py-2.5 px-5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition">
                    <i class="fas fa-cloud-arrow-up mr-1.5"></i> <span>Přidat novou fotku formy</span>
                </button>
            </div>
        </div>
    `;
}

// Global Event Bindings
window.switchBodyMetricsUser = (userKey) => {
    triggerHaptic('light');
    activeUserKey = userKey;
    renderBodyMetrics();
};

window.switchBodyMetricsSubtab = (subtab) => {
    triggerHaptic('light');
    activeSubtab = subtab;
    renderBodyMetrics();
};

window.openLogWeightModal = (userKey) => {
    openLogWeightModal(userKey);
};

window.openLogCircumferencesModal = (userKey) => {
    openLogCircumferencesModal(userKey);
};

window.openBiometricsProfileModal = (userKey) => {
    openBiometricsProfileModal(userKey);
};
