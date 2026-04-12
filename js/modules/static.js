import { state } from '../core/state.js';
import { loadMarked } from '../core/loader.js';
import { getAssetUrl } from '../core/assets.js';

/**
 * Static & Manual Pages Module
 * Handles rendering of non-dynamic or placeholder pages.
 */

export function renderManual() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto text-gray-300 space-y-8 animate-fade-in">
            <div class="text-center mb-10">
                <div class="w-20 h-20 bg-[#5865F2] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <i class="fas fa-book text-3xl text-white"></i>
                </div>
                <h1 class="text-3xl font-bold text-white mb-2">Jak používat Kiscord</h1>
                <p class="text-gray-400">Rychlý průvodce všemi funkcemi</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#5865F2] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#ed4245] flex items-center justify-center mr-3 text-sm">❤️</span>
                        Můj Den
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Tady najdeš přehled všeho důležitého. Počet dní, co jsme spolu, náhodný fakt o zvířátkách,
                        aktuální náladu a graf spánku. Vše na jednom místě.
                    </p>
                </div>

                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#FEE75C] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#FEE75C] text-black flex items-center justify-center mr-3 text-sm">📅</span>
                        Kalendář
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Společný plánovač. Vidíš tady naše výročí, naplánovaná rande a můžeš si sem psát i školní povinnosti.
                    </p>
                </div>

                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#3ba55c] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#3ba55c] flex items-center justify-center mr-3 text-sm">🗺️</span>
                        Rande Plánovač
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Interaktivní mapa míst, kam můžeme vyrazit. Filtruj podle nálady a objevuj nová místa.
                    </p>
                </div>

                <div class="bg-[#2f3136] p-6 rounded-xl border border-[#202225] hover:border-[#5865F2] transition-colors">
                    <h3 class="text-xl font-bold text-white mb-3 flex items-center">
                        <span class="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center mr-3 text-sm">📚</span>
                        Knihovna
                    </h3>
                    <p class="text-sm leading-relaxed">
                        Seznam filmů, seriálů a her, které si chceme zahrát nebo pustit.
                    </p>
                </div>
            </div>

            <div class="bg-[#2f3136] p-6 rounded-xl border border-[#faa61a]">
                <h3 class="text-xl font-bold text-[#faa61a] mb-2 flex items-center gap-2">
                    <i class="fas fa-lightbulb"></i> Tip
                </h3>
                <p class="text-sm text-gray-300">
                    Aplikace podporuje <strong>Valentýnský mód</strong>! Klikni na srdíčko v horní liště. 💕
                </p>
            </div>
        </div>
    `;
}

export function renderMusicBot() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center bg-[#36393f] relative overflow-hidden animate-fade-in p-2 md:p-6">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
            
            <div class="z-10 w-full h-full max-w-6xl mx-auto flex flex-col items-center justify-center">
                <div class="w-full h-full max-h-[85vh] bg-black/20 backdrop-blur-md border border-white/5 p-1 rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(29,185,84,0.2)] hover:border-[#1DB954]/30 flex flex-col overflow-hidden">
                    <iframe style="border-radius:20px; flex: 1; border: none;" 
                            src="https://open.spotify.com/embed/playlist/2zUVrUmI3NHhIPtiboRE9O?utm_source=generator&theme=0" 
                            width="100%" 
                            height="100%" 
                            allowfullscreen="" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy">
                    </iframe>
                </div>
            </div>
        </div>
    `;
}

export async function renderReadme() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
    `;

    try {
        const response = await fetch('README.md');
        if (!response.ok) throw new Error('README not found');
        const text = await response.text();

        // Dynamically load marked for parsing
        await loadMarked();
        const htmlContent = marked.parse(text);

        // Robust detection for the confession trigger
        const hasConfession = /#\s*k\s*i\s*s\s*c\s*o\s*r\s*d/i.test(text);

        if (hasConfession) {
            container.innerHTML = `
                <div class="h-full flex flex-col p-4 md:p-6 items-start animate-fade-in bg-[#36393f] font-sans">
                    <div class="flex gap-3 md:gap-4 items-start max-w-full md:max-w-2xl group overflow-hidden">
                         <div class="relative flex-shrink-0 mt-0.5">
                             <img id="readme-jozka-avatar" src="${getAssetUrl('jozka_profile')}" alt="Jožka" class="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover shadow-sm bg-[#2f3136]" loading="lazy">
                         </div>
                         
                         <div class="flex-1 min-w-0">
                             <div class="flex items-baseline gap-2 mb-2 md:mb-3">
                                 <span class="font-bold text-white text-sm md:text-base hover:underline cursor-pointer">Jožka</span>
                                 <span class="text-[10px] text-[#b9bbbe] font-medium">Pinned</span>
                             </div>
                             
                             <div id="confession-trigger" 
                                  class="bg-[#2f3136] border border-[#202225] rounded-md p-3 flex items-center gap-3 md:gap-4 w-full max-w-[432px] cursor-pointer hover:bg-[#32353b] transition-colors duration-150">
                                 <div class="w-10 h-11 md:h-12 bg-[#5865F2] rounded-sm flex items-center justify-center text-white text-xl md:text-2xl flex-shrink-0">
                                     <i class="fas fa-file-code"></i>
                                 </div>
                                 <div class="flex-1 min-w-0">
                                     <div class="text-[#00aff4] font-medium text-sm md:text-base truncate hover:underline">system_patch_v2.0.exe</div>
                                     <div class="text-[#b9bbbe] text-[10px] md:text-xs font-medium mt-0.5">1.2 MB • Executable</div>
                                 </div>
                                 <div class="text-[#b9bbbe] hover:text-[#dcddde] transition-colors p-1 md:p-2">
                                     <i class="fas fa-download text-lg md:text-xl"></i>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            `;

            // Add secure listener for Vite-compatible dynamic import
            const trigger = document.getElementById('confession-trigger');
            if (trigger) {
                trigger.addEventListener('click', () => {
                    import('./confession.js').then(m => m.startConfession());
                });
            }
            return;
        }

        container.innerHTML = `
            <div class="p-8 max-w-4xl mx-auto text-gray-300 animate-fade-in font-mono text-sm">
                <div class="bg-[#2f3136] p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1 h-full bg-[#5865F2] opacity-50"></div>
                    <div class="prose prose-invert max-w-none">
                        ${htmlContent}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-red-400">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Nepodařilo se načíst README.md</p>
                <p class="text-xs text-gray-500 mt-2">${err.message}</p>
            </div>
        `;
    }
}
