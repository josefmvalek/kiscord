import { triggerHaptic } from '../core/utils.js';

export function renderChangelog() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    triggerHaptic('light');

    const changelogs = [
        {
            version: "v3.0.0",
            title: "Alpská Edice — Plná Integrace 🏔️🔒",
            date: "25. května 2026",
            badge: "Nejnovější",
            badgeColor: "bg-gradient-to-r from-pink-500 to-purple-600",
            intro: "Vítejte v dosud největším updatu Kiscordu! Tento update přináší kompletní provázání všech alpských modulů, zabezpečení a zjednodušení každodenního používání během naší rakouské brigády.",
            changes: [
                {
                    category: "Plánovač Rande & Lokace 🗺️",
                    items: [
                        "<b>CZ/AT Přepínač na mapě:</b> Snadné přepínání mezi českou a rakouskou edicí jedním kliknutím. Automaticky přesune mapu na <b>Hotel Woferlgut v Bruck an der Großglocknerstraße</b> a vyfiltruje pouze příslušná místa.",
                        "<b>Minimalistický Darkmode Popup:</b> Leaflet popupy mají nový, moderní tmavý Discord vzhled s oblými rohy, stíny a vyladěnou typografií.",
                        "<b>Správa lokací přímo v plánovači:</b> Přidána tlačítka <i>Upravit detaily</i> a <i>Smazat místo</i> přímo do panelu plánovače, což umožňuje kompletní správu míst z mapy bez jakéhokoliv omezení."
                    ]
                },
                {
                    category: "Kalendář ➔ Alpský Deníček 📅📔",
                    items: [
                        "<b>Rychlé indikátory v kalendáři:</b> Každá buňka kalendáře nyní přehledně zobrazuje status zámku dnešního zápisu (📔🔒 / 📔🔓) a průměrné hvězdičkové hodnocení dne.",
                        "<b>Provázání detailu dne:</b> Zobrazení Highlights & Rants podléhající double-lock privátní pojistce přímo v modalovém okně dne s tlačítkem pro okamžitý přechod do deníčku."
                    ]
                },
                {
                    category: "Plánovač Směn ➔ Kasička 🕒💶",
                    items: [
                        "<b>Tlačítko Připsat mzdu:</b> U každé dokončené směny v minulosti můžete jedním kliknutím připsat výdělek přímo do kasičky.",
                        "<b>Nastavitelná hodinová mzda:</b> V záhlaví směn lze libovolně upravit hodinovou mzdu (defaultně 14 €/h), která se ukládá do paměti prohlížeče.",
                        "<b>Hlídání duplicity:</b> Aplikace inteligentně hlídá finanční transakce a nedovolí vám připsat mzdu za stejnou směnu dvakrát (tlačítko se změní na zelené <i>Mzda připsána ✅</i>)."
                    ]
                },
                {
                    category: "Hlasový Alpský Deníček 🎙️",
                    items: [
                        "<b>Hlasové poznámky k zápisům:</b> Možnost nahrát až 15s hlasový vzkaz přímo při psaní deníku pomocí <i>MediaRecorder API</i>.",
                        "<b>Audio přehrávače:</b> Záznam se ukládá do Supabase Storage a přehrávač se automaticky vykreslí v deníku i v kalendáři pro oba partnery po odemčení dne."
                    ]
                },
                {
                    category: "Welcome Dashboard Widget 🃏",
                    items: [
                        "<b>Dnešní Alpská Výzva:</b> Interaktivní stírací los na úvodní stránce. Setřením prstem nebo myší odhalíte výzvu pro dnešní den s přímým tlačítkem do sekce výzev."
                    ]
                }
            ]
        },
        {
            version: "v2.5.0",
            title: "Rakouský Balíček — Příprava na Alpy 🏔️🎒",
            date: "Duben 2026",
            badge: "Předchozí",
            badgeColor: "bg-[#4f545c]",
            intro: "Zavedení prvních alpských modulů určených pro naši blížící se tříměsíční brigádu v Rakousku.",
            changes: [
                {
                    category: "Plánovač Směn 🕒",
                    items: [
                        "Vytvoření kalendářního plánovače pro sladění našich pracovních směn a volných dnů."
                    ]
                },
                {
                    category: "Rakouská Kasička 💶",
                    items: [
                        "Evidence společných příjmů a výdajů v Eurech.",
                        "<b>Schnitzel-O-Meter:</b> Zábavný ukazatel, kolik vídeňských řízků si za našetřené peníze můžeme koupit."
                    ]
                },
                {
                    category: "Rakouská Němčina 🇩🇪📖",
                    items: [
                        "Survival slovníček a interaktivní flashcards s nejčastějšími alpskými výrazy a frázemi z hotelového prostředí."
                    ]
                }
            ]
        },
        {
            version: "v2.0.0",
            title: "Maturitní Hub — Společně to dáme! 🎓",
            date: "Březen 2026",
            badge: "Starší",
            badgeColor: "bg-[#4f545c]/50",
            intro: "Kompletní studijní koutek pro přípravu na maturitu, literární rozbory a IT okruhy.",
            changes: [
                {
                    category: "Čeština & IT Okruhy 📖💻",
                    items: [
                        "Zpracované čtenářské deníky, literární díla a rozbory pro maturitu z češtiny.",
                        "Technická témata z informatiky včetně algoritmů, sítí a databází."
                    ]
                },
                {
                    category: "Pomodoro & Studijní statistiky ⏱️",
                    items: [
                        "Integrovaný Pomodoro časovač pro efektivní učení s motivačními zvukovými signály a sledováním odstudovaného času."
                    ]
                }
            ]
        },
        {
            version: "v1.0.0",
            title: "Kiscord Core — Začátek Naší Cesty 💖",
            date: "Únor 2026",
            badge: "První verze",
            badgeColor: "bg-emerald-500/30 text-emerald-400",
            intro: "Zrození našeho vlastního soukromého prostoru inspirovaného Discordem. První pilíře a srdce celé aplikace.",
            changes: [
                {
                    category: "Jádro Aplikace ⚙️",
                    items: [
                        "Věrný Discord design, postranní panel s kanály rozdělenými do tematických kategorií.",
                        "Bezpečné přihlášení a real-time synchronizace dat přes Supabase."
                    ]
                },
                {
                    category: "Zábava & Hry 🎮",
                    items: [
                        "Konverzační témata, zamilované dopisy s časovým zámkem, Tetris skóre tracker a kvízy."
                    ]
                }
            ]
        }
    ];

    let html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16 font-sans select-none">
            <!-- Header -->
            <div class="relative bg-gradient-to-br from-slate-900 via-[#2f3136] to-indigo-950/40 p-6 border-b border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
                <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                <div class="absolute -left-20 -bottom-20 w-48 h-48 bg-[#faa61a]/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div class="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#faa61a] to-orange-600 shadow-xl mb-3 animate-bounce-slow">
                    <i class="fas fa-bullhorn text-white text-2xl drop-shadow-md"></i>
                </div>
                <h1 class="relative z-10 text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Kiscord Changelog 📢</h1>
                <p class="relative z-10 text-gray-300 font-semibold mt-1 text-center text-xs max-w-md">Historie verzí a sledování pokroku vývoje naší aplikace.</p>
            </div>

            <div class="max-w-3xl mx-auto px-4 pt-8 pb-10 space-y-12">
    `;

    changelogs.forEach(log => {
        let changesHtml = "";
        log.changes.forEach(cat => {
            changesHtml += `
                <div class="space-y-2">
                    <h4 class="text-xs font-black text-[#faa61a] uppercase tracking-wider pl-2 border-l-2 border-[#faa61a] mb-2">${cat.category}</h4>
                    <ul class="space-y-2 pl-4 text-xs text-gray-300 list-disc list-outside">
                        ${cat.items.map(item => `<li class="leading-relaxed">${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        });

        html += `
            <div class="relative group/version animate-fade-in">
                <!-- Timeline vertical line and dot -->
                <div class="absolute -left-4 top-0 bottom-0 w-0.5 bg-[#4f545c]/20 group-last/version:bottom-auto group-last/version:h-8"></div>
                <div class="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-[#faa61a] border-4 border-[#36393f] shadow group-hover/version:scale-125 transition-transform"></div>

                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300 shadow-lg space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                        <div class="flex items-center gap-3">
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${log.badgeColor} shadow-sm">${log.version}</span>
                            <h2 class="text-base md:text-lg font-black text-white leading-tight uppercase">${log.title}</h2>
                        </div>
                        <span class="text-[10px] text-gray-400 font-semibold"><i class="far fa-clock mr-1"></i> ${log.date}</span>
                    </div>

                    <p class="text-xs text-gray-400 italic leading-relaxed pl-1">${log.intro}</p>

                    <div class="space-y-6 pt-2">
                        ${changesHtml}
                    </div>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}
