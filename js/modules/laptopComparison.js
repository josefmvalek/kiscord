import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal } from '../core/ui.js';

let activeCategory = 'top3';
let selectedLaptopId = localStorage.getItem('kiscord_klarka_laptop_choice') || null;
let klarkaNote = localStorage.getItem('kiscord_klarka_laptop_note') || '';

const LAPTOP_DATA = {
    top3: [
        {
            id: 'thinkpad-e14',
            badge: '🛡️ Dostupný & Odolný',
            title: 'Lenovo ThinkPad E14',
            subtitle: 'Praktický, matný, nerozbitný držák na VUT FIT',
            price: '15 000 – 18 000 Kč',
            category: 'midrange',
            specs: {
                cpu: 'AMD Ryzen 5 (řady 7000 / 8000)',
                ram: '16 GB RAM (rozšiřitelná!)',
                ssd: '512 GB SSD',
                display: '14" IPS Matný (1920x1200)',
                weight: '1.43 kg',
                battery: '8-11 hodin'
            },
            highlights: [
                'Nejlepší notebooková klávesnice na trhu (skvělá na psaní kódů)',
                'Legendární černý ThinkPad design + TrackPoint red dot',
                'Nerozbitná vojenská odolnost MIL-STD-810H',
                '100% kompatibilita s Linuxem / WSL2 pro předměty na FITu'
            ],
            tip: 'Verze Gen 5 (cca 1–2 roky stará) má téměř stejné tělo jako Gen 6, ale seženete ji ve výprodejích nebo jako zánovní za skvělou cenu!',
            image: '💻'
        },
        {
            id: 'zenbook-14',
            badge: '✨ Stylový & Lehký',
            title: 'Asus Zenbook 14 OLED',
            subtitle: 'Nádherný displej, tenoučký a lehoučký do ruky i batohu',
            price: '22 000 – 28 000 Kč',
            category: 'premium',
            specs: {
                cpu: 'AMD Ryzen 7 / Intel Core Ultra 5/7',
                ram: '16 GB až 32 GB RAM',
                ssd: '512 GB / 1 TB SSD',
                display: '14" 2.8K OLED (120Hz, šetří oči)',
                weight: '1.20 kg (Ultra lehký!)',
                battery: '12-15 hodin'
            },
            highlights: [
                'Neskutečně lehký na každodenní nošení do školy v batohu (jen 1.2 kg)',
                'Nádherný OLED displej s perfektním kontrastem — nebolí z něj oči při nočním programování',
                'Celokovové prémiové tělo v elegantní tmavé barvě',
                'Dlouhá výdrž na baterii na celodenní přednášky'
            ],
            tip: 'Pokud budget dovolí, zkusit sehnat konfiguraci s 32 GB RAM pro absolutní výkon bez jakýchkoliv kompromisů!',
            image: '👑'
        },
        {
            id: 'yoga-7',
            badge: '🔄 Překlápěcí 2in1',
            title: 'Lenovo Yoga 7 2-in-1',
            subtitle: 'Plnohodnotný výpočetní výkon + čárání do skript jako na tabletu',
            price: '21 000 – 26 000 Kč',
            category: 'convertible',
            specs: {
                cpu: 'AMD Ryzen 5/7 nebo Intel Core Ultra',
                ram: '16 GB až 32 GB RAM',
                ssd: '512 GB SSD',
                display: '14" Dotykový OLED/IPS (360° kloub + Stylus)',
                weight: '1.49 kg',
                battery: '10-13 hodin'
            },
            highlights: [
                'Dá se překlopit o 360° — slouží jako tablet na psaní poznámek nebo stojánek na filmy',
                'V balení bývá dotykový stylus (pero) na čárání do přednáškových skript',
                'Pevné kovové klouby a prémiové zpracování',
                'Stejně vysoký výkon na programování jako běžný klasický notebook'
            ],
            tip: 'Ideální volba, pokud nechceš tahat zvlášť iPad/tablet a zvlášť notebook!',
            image: '🎨'
        }
    ],
    midrange: [
        {
            id: 'thinkpad-e14',
            title: 'Lenovo ThinkPad E14 Gen 5 / Gen 6',
            price: '15 000 – 18 000 Kč',
            why: 'Skvělá odolnost, nejlepší klávesnice na psaní na trhu a legendární kompatibilita s Linuxem (pokud si na něj bude chtít udělat dualboot nebo ho mít na virtuálce).',
            params: 'AMD Ryzen 5 (řady 7000 nebo 8000), 16 GB RAM (rozšiřitelná!), 512 GB SSD.',
            whyStar: 'Verze Gen 5 (cca 1–2 roky stará) má téměř stejné šasi jako novější verze, ale seženete ji ve výprodejích nebo jako zánovní za skvělou cenu.'
        },
        {
            id: 'asus-vivobook',
            title: 'Asus Vivobook 14 / 15 (s AMD Ryzen)',
            price: '14 000 – 17 000 Kč',
            why: 'Příjemný, lehký a moderní notebook s tenkými rámečky. V poměru cena/výkon drží dlouhodobě top příčky. Má velmi dobré displeje s poměrem 16:10 (víc řádků kódu na obrazovce).',
            params: 'AMD Ryzen 5 (např. 7530U/7535HS nebo novější), 16 GB RAM, 512 GB SSD.',
            whyStar: 'Super volba pro ty, co chtějí svěží design a tenké tělo za velmi rozumnou cenu.'
        }
    ],
    premium: [
        {
            id: 'zenbook-14',
            title: 'Asus Zenbook 14 OLED',
            price: '22 000 – 28 000 Kč',
            why: 'Absolutní miláček studentů. Ultra lehký (cca 1,2 kg), tenký a má nádherný OLED displej s perfektním kontrastem, který šetří oči při nočním psaní kódů. Obrovská výdrž baterie.',
            params: '32 GB RAM (nebo 16 GB RAM), procesor AMD Ryzen 7 (řada 8000) nebo Intel Core Ultra 5 / 7, 512 GB / 1 TB SSD.',
            whyStar: 'Nejlepší celkový zážitek z používání a nejlehčí notebook do batohu.'
        },
        {
            id: 'thinkpad-t14',
            title: 'Lenovo ThinkPad T14 / T14s (Gen 3 / Gen 4)',
            price: '20 000 – 25 000 Kč (Repas / Zánovní / Výprodej)',
            why: 'Vyšší manažerská a pracovní třída ThinkPadů. T-řada je nezničitelná. Tělo z hořčíku a uhlíkových vláken, dlouhá výdrž a extrémně tichý chod.',
            params: 'AMD Ryzen 7 / Intel Core i7, 16-32 GB RAM, 512 GB SSD.',
            whyStar: 'Tip: Tyto modely se vyplatí kupovat jako tzv. předváděcí / zánovní kusy se zárukou – získáte notebook původně za 40 tisíc v rozpočtu do 25 tisíc.'
        }
    ],
    convertible: [
        {
            id: 'yoga-7',
            title: 'Lenovo Yoga 7 2-in-1 (14")',
            price: '21 000 – 26 000 Kč',
            why: 'Kovový, elegantní a pevný konvertibilní notebook. Dá se překlopit o 360° a slouží jako tablet s dotykovým displejem nebo stojánek na přednášky. Součástí bývá i stylus (pero) na poznámky.',
            params: 'AMD Ryzen 5/7 nebo Intel Core Ultra, 16–32 GB RAM, 512 GB SSD.',
            whyStar: 'Na rozdíl od levných konvertiblů má pevné klouby, skvělý displej a plnohodnotné komponenty na programování.'
        }
    ]
};

export async function renderLaptopComparison() {
    if (state.currentChannel !== 'laptop-comparison') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full bg-[var(--bg-app)] flex flex-col font-sans animate-fade-in relative overflow-hidden select-none">
            <!-- Header Bar -->
            <div class="bg-[var(--bg-secondary)] shadow-md z-10 flex-shrink-0 border-b border-[var(--border-subtle)] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-xl text-amber-400 border border-amber-500/20 shadow-inner">
                        💻
                    </div>
                    <div>
                        <h1 class="text-base font-black text-[var(--text-header)] uppercase tracking-tight leading-none">Výběr Notebooku na VUT FIT pro Klárku 🎓</h1>
                        <p class="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">Srovnání nejlepších možností bez bolesti hlavy ✨</p>
                    </div>
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button onclick="window.switchLaptopTab('top3')" id="tab-btn-top3" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeCategory === 'top3' ? 'bg-[var(--blurple)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-header)]'}">
                        ⭐ 3 Favoriti
                    </button>
                    <button onclick="window.switchLaptopTab('midrange')" id="tab-btn-midrange" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeCategory === 'midrange' ? 'bg-[var(--blurple)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-header)]'}">
                        💰 15k–18k Kč
                    </button>
                    <button onclick="window.switchLaptopTab('premium')" id="tab-btn-premium" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeCategory === 'premium' ? 'bg-[var(--blurple)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-header)]'}">
                        👑 Premium
                    </button>
                    <button onclick="window.switchLaptopTab('convertible')" id="tab-btn-convertible" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeCategory === 'convertible' ? 'bg-[var(--blurple)] text-white shadow-lg' : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-header)]'}">
                        🔄 2in1 Tablet
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-8 pb-24">
                <div class="max-w-5xl mx-auto space-y-8">

                    <!-- Klárka Selected Card Notification -->
                    ${selectedLaptopId ? renderSelectedLaptopBanner() : ''}

                    <!-- MAIN TOP 3 SHOWCASE -->
                    <div id="laptop-tab-content-top3" class="${activeCategory === 'top3' ? 'space-y-6' : 'hidden'}">
                        <div class="text-center space-y-1 max-w-xl mx-auto mb-6">
                            <span class="text-[10px] font-black text-[#eb459e] uppercase tracking-widest block">Jak vybrat a nemít z toho hlavobol:</span>
                            <h2 class="text-xl font-black text-white uppercase tracking-tight">3 Hlavní Zástupci ke zvážení 🛍️</h2>
                            <p class="text-xs text-gray-400 leading-relaxed">Vybrali jsme 3 konkrétní nejlepší zástupce z každého světa. Stačí si vybrat, který tě nejvíce chytí za srdce!</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            ${LAPTOP_DATA.top3.map(laptop => renderTop3LaptopCard(laptop)).join('')}
                        </div>
                    </div>

                    <!-- MIDRANGE TAB -->
                    <div id="laptop-tab-content-midrange" class="${activeCategory === 'midrange' ? 'space-y-6' : 'hidden'}">
                        <div class="border-b border-white/10 pb-3 flex items-center justify-between">
                            <div>
                                <h2 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>💰 Zlatá Střední Cesta (15 000 – 18 000 Kč)</span>
                                </h2>
                                <p class="text-xs text-gray-400 mt-0.5">Ideální kategorie pro ušetření budgetu při zachování maximální výdrže na celý bakalář.</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${LAPTOP_DATA.midrange.map(item => renderDetailLaptopCard(item)).join('')}
                        </div>
                    </div>

                    <!-- PREMIUM TAB -->
                    <div id="laptop-tab-content-premium" class="${activeCategory === 'premium' ? 'space-y-6' : 'hidden'}">
                        <div class="border-b border-white/10 pb-3 flex items-center justify-between">
                            <div>
                                <h2 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>👑 Vyšší Třída & Premium (22 000 – 28 000 Kč)</span>
                                </h2>
                                <p class="text-xs text-gray-400 mt-0.5">Maximální komfort, OLED displej šetřící oči, celokovová těla a obrovská výdrž baterie.</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${LAPTOP_DATA.premium.map(item => renderDetailLaptopCard(item)).join('')}
                        </div>
                    </div>

                    <!-- CONVERTIBLE TAB -->
                    <div id="laptop-tab-content-convertible" class="${activeCategory === 'convertible' ? 'space-y-6' : 'hidden'}">
                        <div class="border-b border-white/10 pb-3 flex items-center justify-between">
                            <div>
                                <h2 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>🔄 Překlápěcí 2-in-1 Alternativa (Dotykový Tablet)</span>
                                </h2>
                                <p class="text-xs text-gray-400 mt-0.5">Plnohodnotné programovací komponenty + možnost překlopení o 360° a psaní poznámek perem.</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-6">
                            ${LAPTOP_DATA.convertible.map(item => renderDetailLaptopCard(item)).join('')}
                        </div>
                    </div>

                    <!-- HARDWARE CHECKLIST FOR VUT FIT -->
                    <div class="glass-card bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-blue-900/20 border border-purple-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div class="flex items-center gap-3 border-b border-white/10 pb-3">
                            <span class="text-2xl">💡</span>
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">Rádce na VUT FIT (Hardware Checklist)</h3>
                                <p class="text-xs text-purple-200/70 font-semibold">Na co si dát pozor při výběru jakéhokoliv modelu:</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-1">
                                <div class="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="fas fa-memory"></i> RAM: Minimálně 16 GB RAM
                                </div>
                                <p class="text-[11px] text-gray-300 leading-relaxed">
                                    Naprosto zásadní pro plynulý běh IDE editorů (VS Code, CLion), záložek v prohlížeči, virtualizace a Dockeru. Pokud je verze s 32 GB RAM, je to výhra na celé studium.
                                </p>
                            </div>

                            <div class="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-1">
                                <div class="text-xs font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="fas fa-microchip"></i> Procesor: AMD Ryzen nebo Intel Core Ultra
                                </div>
                                <p class="text-[11px] text-gray-300 leading-relaxed">
                                    <strong>AMD Ryzen 5/7 (7000, 8000, AI 300)</strong> je top doporučení (skvělá výdrž baterie + grafický výkon). <strong>Intel Core Ultra (100/200)</strong> má též skvělou výdrž.
                                </p>
                            </div>

                            <div class="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-1">
                                <div class="text-xs font-black text-pink-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="fas fa-[#eb459e] fa-ruler-combined"></i> Displej & Velikost: 14 palců
                                </div>
                                <p class="text-[11px] text-gray-300 leading-relaxed">
                                    14" je pro holku na denní nošení v batohu absolutní sweet-spot mezi hmotností a velikostí obrazovky. 15.6" už bývá zbytečně těžký a velký.
                                </p>
                            </div>

                            <div class="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-1">
                                <div class="text-xs font-black text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <i class="fab fa-windows"></i> OS: Windows 11 (x86 Architektura)
                                </div>
                                <p class="text-[11px] text-gray-300 leading-relaxed">
                                    V prváku na FITu se vám bude hodit architektura x86 (Intel/AMD) na předměty jako ISU (programování na strojové úrovni) a C/C++. Snadné WSL2 nebo dualboot!
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Klárka Preference Note Box -->
                    <div class="glass-card bg-black/30 border border-white/10 rounded-3xl p-6 space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span>✍️ Klárčina Poznámka nebo Pání k notebooku</span>
                            </h3>
                            <span class="text-[10px] text-gray-500 font-bold uppercase">Ukládá se pro Jožku</span>
                        </div>
                        
                        <textarea id="klarka-notebook-note" 
                                  placeholder="Napiš sem jakýkoliv dotaz, barvu, nebo jestli si ho chceš jít předem osahat do Alzy..." 
                                  class="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2] transition resize-none h-24">${klarkaNote}</textarea>

                        <div class="flex justify-end">
                            <button onclick="window.saveKlarkaNotebookNote()" class="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs uppercase tracking-wider transition shadow-lg active:scale-95">
                                Uložit poznámku 💾
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    attachWindowLaptopHandlers();
}

function renderTop3LaptopCard(laptop) {
    const isSelected = selectedLaptopId === laptop.id;

    return `
        <div class="glass-card bg-gradient-to-b from-white/[0.04] to-black/30 border ${isSelected ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)] bg-amber-500/[0.03]' : 'border-white/10 hover:border-white/20'} rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden">
            <div class="space-y-4">
                <div class="flex justify-between items-start">
                    <span class="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        ${laptop.badge}
                    </span>
                    <span class="text-2xl">${laptop.image}</span>
                </div>

                <div>
                    <h3 class="text-lg font-black text-white leading-snug">${laptop.title}</h3>
                    <p class="text-xs text-gray-400 font-medium mt-1 leading-relaxed">${laptop.subtitle}</p>
                </div>

                <div class="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">Cenová relace</span>
                    <span class="text-xs font-black text-emerald-400 font-mono">${laptop.price}</span>
                </div>

                <!-- Spec Grid -->
                <div class="space-y-2 border-t border-white/5 pt-3 text-[11px]">
                    <div class="flex justify-between text-gray-300">
                        <span class="text-gray-500 font-bold">Procesor:</span>
                        <span class="font-bold text-right">${laptop.specs.cpu}</span>
                    </div>
                    <div class="flex justify-between text-gray-300">
                        <span class="text-gray-500 font-bold">RAM:</span>
                        <span class="font-bold text-right text-amber-300">${laptop.specs.ram}</span>
                    </div>
                    <div class="flex justify-between text-gray-300">
                        <span class="text-gray-500 font-bold">Displej:</span>
                        <span class="font-bold text-right">${laptop.specs.display}</span>
                    </div>
                    <div class="flex justify-between text-gray-300">
                        <span class="text-gray-500 font-bold">Hmotnost:</span>
                        <span class="font-bold text-right text-emerald-400">${laptop.specs.weight}</span>
                    </div>
                </div>

                <!-- Highlights -->
                <div class="space-y-1.5 border-t border-white/5 pt-3">
                    <span class="text-[9px] font-black uppercase text-gray-500 tracking-wider">Hlavní Výhody:</span>
                    <ul class="space-y-1">
                        ${laptop.highlights.map(h => `
                            <li class="text-[10.5px] text-gray-300 flex items-start gap-1.5 leading-tight">
                                <span class="text-emerald-400 flex-shrink-0">✓</span>
                                <span>${h}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>

            <div class="pt-6 border-t border-white/5 mt-4 space-y-2">
                <button onclick="window.selectLaptopChoice('${laptop.id}', '${laptop.title}')" 
                        class="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 ${isSelected ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-400/20' : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'}">
                    ${isSelected ? '❤️ Můj Hlavní Favorit!' : 'Vybrat jako favorita ❤️'}
                </button>
            </div>
        </div>
    `;
}

function renderDetailLaptopCard(item) {
    const isSelected = selectedLaptopId === item.id;

    return `
        <div class="glass-card bg-black/25 border ${isSelected ? 'border-amber-400 bg-amber-500/[0.02]' : 'border-white/5'} rounded-3xl p-6 space-y-4">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-base font-black text-white">${item.title}</h3>
                    <span class="text-xs font-black text-emerald-400 font-mono mt-0.5 block">${item.price}</span>
                </div>
                ${isSelected ? `<span class="text-xs font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Favorit ❤️</span>` : ''}
            </div>

            <div class="space-y-2 text-xs text-gray-300">
                <div>
                    <span class="text-[9px] font-black text-gray-500 uppercase tracking-wider block mb-0.5">Proč zrovna tenhle:</span>
                    <p class="leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">${item.why}</p>
                </div>

                <div>
                    <span class="text-[9px] font-black text-gray-500 uppercase tracking-wider block mb-0.5">Klíčové parametry:</span>
                    <p class="font-bold text-amber-300 bg-black/20 p-2.5 rounded-xl border border-white/5 font-mono text-[11px]">${item.params}</p>
                </div>

                ${item.whyStar ? `
                    <div class="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl">
                        <span class="text-[9px] font-black uppercase text-purple-300 tracking-wider block mb-0.5">💡 Tip na nákup:</span>
                        <p class="text-[11px] text-purple-200 leading-snug">${item.whyStar}</p>
                    </div>
                ` : ''}
            </div>

            <button onclick="window.selectLaptopChoice('${item.id}', '${item.title}')" class="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition border border-white/5 flex items-center justify-center gap-1.5 active:scale-95">
                ${isSelected ? '❤️ Vybráno jako favorit' : 'Zvolit tento model'}
            </button>
        </div>
    `;
}

function renderSelectedLaptopBanner() {
    const laptop = LAPTOP_DATA.top3.find(l => l.id === selectedLaptopId) || 
                   LAPTOP_DATA.midrange.find(l => l.id === selectedLaptopId) ||
                   LAPTOP_DATA.premium.find(l => l.id === selectedLaptopId) ||
                   LAPTOP_DATA.convertible.find(l => l.id === selectedLaptopId);

    const title = laptop ? laptop.title : selectedLaptopId;

    return `
        <div class="glass-card bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-2 border-amber-400/40 rounded-3xl p-5 shadow-2xl flex items-center justify-between gap-4 animate-pulse-slow">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-amber-400 text-black font-black flex items-center justify-center text-xl shadow-lg">
                    👑
                </div>
                <div>
                    <span class="text-[9px] font-black uppercase text-amber-300 tracking-widest block">Vybraný favorit pro Klárku:</span>
                    <h4 class="text-sm font-black text-white uppercase tracking-wider">${title}</h4>
                </div>
            </div>
            <button onclick="window.clearLaptopChoice()" class="text-xs text-gray-400 hover:text-white underline font-bold uppercase tracking-wider">
                Změnit výběr
            </button>
        </div>
    `;
}

export function switchLaptopTab(tab) {
    triggerHaptic('light');
    activeCategory = tab;

    ['top3', 'midrange', 'premium', 'convertible'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const content = document.getElementById(`laptop-tab-content-${t}`);
        if (btn) {
            btn.className = `px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${t === tab ? 'bg-[#5865F2] text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`;
        }
        if (content) {
            content.classList.toggle('hidden', t !== tab);
        }
    });
}

export async function selectLaptopChoice(id, name) {
    triggerHaptic('success');
    triggerConfetti();

    selectedLaptopId = id;
    localStorage.setItem('kiscord_klarka_laptop_choice', id);

    showNotification(`Vybráno jako favorit: ${name}! ❤️💻`, 'success');
    renderLaptopComparison();
}

export function clearLaptopChoice() {
    triggerHaptic('light');
    selectedLaptopId = null;
    localStorage.removeItem('kiscord_klarka_laptop_choice');
    renderLaptopComparison();
}

export function saveKlarkaNotebookNote() {
    triggerHaptic('medium');
    const input = document.getElementById('klarka-notebook-note');
    if (!input) return;

    klarkaNote = input.value.trim();
    localStorage.setItem('kiscord_klarka_laptop_note', klarkaNote);

    showNotification('Poznámka uložena! 💾', 'success');
}

function attachWindowLaptopHandlers() {
    window.switchLaptopTab = switchLaptopTab;
    window.selectLaptopChoice = selectLaptopChoice;
    window.clearLaptopChoice = clearLaptopChoice;
    window.saveKlarkaNotebookNote = saveKlarkaNotebookNote;
}
