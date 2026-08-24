/**
 * Live Playgrounds & Interactive Simulators for Kiscord Manual (#návod)
 */

import { generateSunflowerSVG } from '@shared/components/Sunflower.js';
import { VOUCHER_PRICES } from './data.js';
import { 
    activeSimulatorTab, 
    simCoinsState, 
    simOfflineState, 
    simSunflowerState 
} from './state.js';

export function renderCoinsCalculatorResult() {
    const container = document.getElementById('sim-coins-result');
    if (!container) return;

    const wEl = document.getElementById('sim-val-water');
    if (wEl) wEl.textContent = `${simCoinsState.water} / 8 kapek`;
    const hEl = document.getElementById('sim-val-habits');
    if (hEl) hEl.textContent = `${simCoinsState.habits} z 5`;

    const totalCoins = (simCoinsState.water >= 8 ? 5 : simCoinsState.water) + 
                       (simCoinsState.habits * 2) + 
                       (simCoinsState.gym ? 10 : 0) + 
                       (simCoinsState.question ? 3 : 0);

    const affordable = VOUCHER_PRICES.filter(v => v.cost <= totalCoins);

    container.innerHTML = `
        <div class="bg-gradient-to-br from-amber-500/15 via-pink-500/10 to-transparent p-5 rounded-2xl border border-amber-400/30 space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Dnešní zisk:</span>
                <span class="text-2xl font-black text-amber-300 font-mono flex items-center gap-1.5">
                    <i class="fas fa-coins text-amber-400"></i> +${totalCoins} LC
                </span>
            </div>

            <p class="text-xs text-gray-300 leading-relaxed">
                Za dnešní disciplínu si můžeš v <span class="text-rose-400 font-bold">#obchůdku</span> rovnou koupit:
            </p>

            <div class="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                ${affordable.length > 0 ? affordable.map(v => `
                    <div class="flex items-center justify-between text-xs bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                        <span class="text-white font-medium truncate">${v.title}</span>
                        <span class="text-amber-400 font-bold font-mono text-[11px] flex-shrink-0">${v.cost} LC</span>
                    </div>
                `).join('') : `
                    <p class="text-xs text-gray-400 italic">Přidej ještě pár kapek vody nebo návyk a odemkneš první romantický voucher!</p>
                `}
            </div>

            <button type="button" onclick="window.switchChannel('love-shop')" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 active:scale-95">
                <i class="fas fa-store"></i>
                <span>Přejít do Mývalí Tržnice</span>
            </button>
        </div>
    `;
}

export function renderOfflineSimulatorResult() {
    const badge = document.getElementById('sim-network-badge');
    const body = document.getElementById('sim-offline-body');
    if (!badge || !body) return;

    badge.innerHTML = simOfflineState.isOnline ? `
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Online (Supabase připojen)
        </span>
    ` : `
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-red-400"></span>
            Offline (Bez signálu)
        </span>
    `;

    body.innerHTML = `
        <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
            <span class="text-xs font-bold text-gray-300">1. Stav sítě</span>
            <div class="flex flex-col gap-2">
                <button type="button" onclick="window.manualGuide.simToggleOffline(false)" class="py-2 rounded-lg text-xs font-bold border transition ${!simOfflineState.isOnline ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">
                    🚇 Vypnout síť (Simulace metra)
                </button>
                <button type="button" onclick="window.manualGuide.simToggleOffline(true)" class="py-2 rounded-lg text-xs font-bold border transition ${simOfflineState.isOnline ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">
                    📶 Obnovit Wi-Fi / 4G
                </button>
            </div>
        </div>

        <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
            <span class="text-xs font-bold text-gray-300">2. Provedená akce</span>
            <button type="button" onclick="window.manualGuide.simAddOfflineAction()" class="w-full py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow">
                <i class="fas fa-plus"></i>
                <span>Zapsat sérii v gymu</span>
            </button>
            <div class="text-[11px] text-gray-400">
                Položek ve frontě: <strong class="text-white font-mono">${simOfflineState.queueCount}</strong>
            </div>
        </div>

        <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3 flex flex-col justify-between">
            <div>
                <span class="text-xs font-bold text-gray-300">3. Stav synchronizace</span>
                <p class="text-[11px] text-gray-400 mt-1">
                    ${simOfflineState.isSyncing ? 'Synchronizuji data se serverem...' : 
                      simOfflineState.queueCount > 0 ? (simOfflineState.isOnline ? 'Čeká na odeslání do Supabase' : 'Uloženo bezpečně v IndexedDB') : 'Všechna data jsou synchronizována'}
                </p>
            </div>

            <button 
                type="button"
                onclick="window.manualGuide.simFlushQueue()" 
                ${simOfflineState.queueCount === 0 || !simOfflineState.isOnline || simOfflineState.isSyncing ? 'disabled' : ''}
                class="w-full py-2 rounded-lg text-xs font-bold transition ${
                    simOfflineState.queueCount > 0 && simOfflineState.isOnline 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-95' 
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }"
            >
                ${simOfflineState.isSyncing ? '<i class="fas fa-spinner fa-spin mr-1"></i> Odesílám...' : '🚀 Odeslat frontu do cloudu'}
            </button>
        </div>
    `;
}

export function renderSunflowerPreviewResult() {
    const container = document.getElementById('sim-sunflower-visual');
    if (!container) return;

    const mEl = document.getElementById('sim-sf-mood-val');
    if (mEl) mEl.textContent = `${simSunflowerState.mood}/10`;
    const sEl = document.getElementById('sim-sf-sleep-val');
    if (sEl) sEl.textContent = `${simSunflowerState.sleepHours} hod`;
    const wEl = document.getElementById('sim-sf-water-val');
    if (wEl) wEl.textContent = `${simSunflowerState.water}/8 kapek`;

    const sfData = {
        mood: simSunflowerState.mood,
        sleep: simSunflowerState.sleepHours,
        water: simSunflowerState.water,
        bedtime: simSunflowerState.isSleeping ? new Date().toISOString() : null,
        movement: []
    };

    const moodEmoji = simSunflowerState.mood >= 8 ? '😄 Skvělá' : simSunflowerState.mood >= 5 ? '🙂 Dobrá' : '🥺 Unavená';

    container.innerHTML = `
        <div class="transform scale-90 sm:scale-100 transition-all duration-300 flex items-center justify-center">
            ${generateSunflowerSVG(sfData, false)}
        </div>

        <div class="text-center mt-3 space-y-1 border-t border-white/5 pt-2 w-full">
            <span class="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                <span>Nálada: ${simSunflowerState.mood}/10 (${moodEmoji})</span>
            </span>
            <span class="text-[11px] text-gray-400 font-medium">
                ${simSunflowerState.isSleeping ? '🌙 Partner právě spí (Zzz režim aktivní)' : '☀️ Partner je vzhůru a aktivní'}
            </span>
        </div>
    `;
}

export function renderSimulatorContent() {
    const container = document.getElementById('simulator-content-area');
    if (!container) return;

    if (activeSimulatorTab === 'coins') {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-black/25 p-6 rounded-2xl border border-white/5 animate-fade-in">
                
                <div class="space-y-4">
                    <h3 class="font-bold text-white text-sm flex items-center gap-2">
                        <i class="fas fa-sliders-h text-amber-400"></i>
                        <span>Nastav si dnešní aktivitu:</span>
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">💧 Vypito vody: <strong id="sim-val-water" class="text-sky-400">${simCoinsState.water} / 8 kapek</strong></span>
                                <span class="text-amber-400 text-[11px] font-mono">${simCoinsState.water >= 8 ? '+5 mincí (Bonus)' : '+' + simCoinsState.water + ' mincí'}</span>
                            </div>
                            <input type="range" min="0" max="8" value="${simCoinsState.water}" oninput="window.manualGuide.updateSimCoins('water', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">🌿 Splněno návyků: <strong id="sim-val-habits" class="text-emerald-400">${simCoinsState.habits} z 5</strong></span>
                                <span class="text-amber-400 text-[11px] font-mono">+${simCoinsState.habits * 2} mincí</span>
                            </div>
                            <input type="range" min="0" max="5" value="${simCoinsState.habits}" oninput="window.manualGuide.updateSimCoins('habits', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">🏋️‍♂️ Trénink v posilovně:</span>
                                <span class="text-amber-400 text-[11px] font-mono">${simCoinsState.gym ? '+10 mincí' : '+0 mincí'}</span>
                            </div>
                            <div class="flex gap-2">
                                <button type="button" onclick="window.manualGuide.updateSimCoins('gym', 1)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${simCoinsState.gym ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Ano (Trénoval/a)</button>
                                <button type="button" onclick="window.manualGuide.updateSimCoins('gym', 0)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${!simCoinsState.gym ? 'bg-white/10 border-white/20 text-white shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Rest day</button>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">🤔 Denní otázka pro pár:</span>
                                <span class="text-amber-400 text-[11px] font-mono">${simCoinsState.question ? '+3 mince' : '+0 mincí'}</span>
                            </div>
                            <div class="flex gap-2">
                                <button type="button" onclick="window.manualGuide.updateSimCoins('question', 1)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${simCoinsState.question ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Zodpovězena</button>
                                <button type="button" onclick="window.manualGuide.updateSimCoins('question', 0)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${!simCoinsState.question ? 'bg-white/10 border-white/20 text-white shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Nezodpovězena</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="sim-coins-result" class="space-y-4 flex flex-col justify-between"></div>
            </div>
        `;
        renderCoinsCalculatorResult();
    } else if (activeSimulatorTab === 'offline') {
        container.innerHTML = `
            <div class="bg-black/25 p-6 rounded-2xl border border-white/5 space-y-6 animate-fade-in">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div>
                        <h3 class="font-bold text-white text-sm">Simulátor chování PWA mezipaměti & fronty</h3>
                        <p class="text-xs text-gray-400">Vyzkoušej si, co se stane, když ztratíš signál v metru a zapíšeš trénink nebo vodu.</p>
                    </div>
                    <div id="sim-network-badge"></div>
                </div>

                <div id="sim-offline-body" class="grid grid-cols-1 sm:grid-cols-3 gap-4"></div>
            </div>
        `;
        renderOfflineSimulatorResult();
    } else if (activeSimulatorTab === 'sunflower') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/25 p-6 rounded-2xl border border-white/5 items-center animate-fade-in">
                <div class="space-y-4">
                    <div>
                        <h3 class="font-bold text-white text-sm">Živý náhled reakce autentické Slunečnice</h3>
                        <p class="text-xs text-gray-300 leading-relaxed mt-1">
                            Slunečnice na <strong class="text-pink-400 cursor-pointer hover:underline" onclick="window.switchChannel('dashboard')">Můj Den</strong> je živý SVG organismus s 27 zlatými okvětními lístky, dynamickým stonkem s listy a hřejivým spánkovým jádrem.
                        </p>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">Náladoměr (1–10): <strong id="sim-sf-mood-val" class="text-pink-400">${simSunflowerState.mood}/10</strong></span>
                                <span class="text-[10px] text-gray-400">Ovlivňuje počet lístků</span>
                            </div>
                            <input type="range" min="1" max="10" value="${simSunflowerState.mood}" oninput="window.manualGuide.updateSimSunflower('mood', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">Délka spánku: <strong id="sim-sf-sleep-val" class="text-amber-400">${simSunflowerState.sleepHours} hod</strong></span>
                                <span class="text-[10px] text-gray-400">Jádro & Záře při ≥7h</span>
                            </div>
                            <input type="range" min="0" max="10" value="${simSunflowerState.sleepHours}" oninput="window.manualGuide.updateSimSunflower('sleep', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">Vypitá voda: <strong id="sim-sf-water-val" class="text-sky-400">${simSunflowerState.water}/8 kapek</strong></span>
                                <span class="text-[10px] text-gray-400">Růst listů na stonku</span>
                            </div>
                            <input type="range" min="0" max="8" value="${simSunflowerState.water}" oninput="window.manualGuide.updateSimSunflower('water', this.value)" class="custom-range">
                        </div>

                        <div>
                            <span class="block text-xs font-semibold text-gray-300 mb-1.5">Režim spánku:</span>
                            <div class="flex gap-2">
                                <button type="button" onclick="window.manualGuide.updateSimSunflower('sleeping', false)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${!simSunflowerState.isSleeping ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">☀️ Vzhůru (Otevřené oči)</button>
                                <button type="button" onclick="window.manualGuide.updateSimSunflower('sleeping', true)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${simSunflowerState.isSleeping ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">🌙 Spí (Zzz & Náklon)</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="sim-sunflower-visual" class="flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl border border-white/5 min-h-[220px]"></div>
            </div>
        `;
        renderSunflowerPreviewResult();
    }
}
