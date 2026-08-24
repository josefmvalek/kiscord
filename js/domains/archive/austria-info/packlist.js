import { triggerHaptic } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';

export const DEFAULT_PACKING_LIST = [
    {
        id: "doklady",
        name: "Doklady a finance (Základ všeho) 📄💶",
        items: [
            { id: "doc_op_pas", name: "Občanský průkaz / Cestovní pas", note: "Pas prej není potřeba, i tak ho vezmu", important: true },
            { id: "doc_kopie", name: "Kopie dokladů", note: "Uložit do jiného zavazadla pro případ ztráty (asi netřeba, radši mít)", important: false },
            { id: "doc_smlouva", name: "Vytištěná pracovní smlouva", note: "Nebo potvrzení o přijetí", important: true },
            { id: "doc_ehic", name: "Evropský průkaz zdravotního pojištění", note: "Modrá kartička pojištěnce", important: true },
            { id: "doc_pojisteni", name: "Cestovní pojištění (úraz)", note: "Sociální a zdravotní se strhává z hrubé mzdy na místě", important: false },
            { id: "doc_karta_cash", name: "Platební karta a eura v hotovosti", note: "Na první dny, ideálně 200 EUR v menších bankovkách", important: true }
        ]
    },
    {
        id: "pracovni",
        name: "Pracovní vybavení (Na šichtu) 🛠️🧹",
        items: [
            { id: "work_boty", name: "Kvalitní a velmi pohodlná obuv", note: "Absolutní priorita! Zdravotní boty, tenisky nebo pevné Crocsy", important: true },
            { id: "work_obleceni", name: "Pohodlné kalhoty / legíny pod kolena", note: "Tričko/košili dostaneme, kraťasy na práci NE", important: true },
            { id: "work_indulona", name: "Indulona / krém na ruce", note: "Fyzická práce s čistícími prostředky", important: false },
            { id: "work_ledvinka", name: "Kapsy / ledvinka", note: "Na klíče a mobil na šichtu", important: false }
        ]
    },
    {
        id: "bezne_obleceni",
        name: "Běžné oblečení (Volný čas) 👕👖",
        items: [
            { id: "wear_spodni", name: "Spodní prádlo a ponožky na 14 dní", note: "Vzít i teplejší ponožky", important: true },
            { id: "wear_trika", name: "Trička a tílka", note: "Na střídání", important: false },
            { id: "wear_tepla", name: "Mikina a nepromokavá bunda", note: "V horách umí spadnout teplota k 10 °C a často prší!", important: true },
            { id: "wear_kalhoty", name: "2x džíny/plátěné kalhoty, 1x pohodlné tepláky", note: "Tepláky na pokoj, džíny na ven", important: false },
            { id: "wear_kratasy", name: "2x kraťasy", note: "Na teplé letní dny", important: false },
            { id: "wear_spani", name: "Pohodlné oblečení na spaní", note: "Dle vlastního uvážení", important: false },
            { id: "wear_plavky", name: "Plavky", note: "Máme volný vstup do hotelových bazénů a wellness!", important: true },
            { id: "wear_slunce", name: "Sluneční brýle a kšiltovka/klobouk", note: "Ochrana před horským sluncem", important: false }
        ]
    },
    {
        id: "obuv_mimo",
        name: "Obuv (Mimo práci) 👟🥾",
        items: [
            { id: "shoe_tenisky", name: "Běžné tenisky", note: "Na cesty do obchodu a procházky po městě", important: false },
            { id: "shoe_treky", name: "Treková / turistická obuv", note: "Pevnější nízké nebo kotníkové boty do Alp", important: true },
            { id: "shoe_pantofle", name: "Žabky / gumové pantofle", note: "Neocenitelné do společných sprch a k bazénu", important: true }
        ]
    },
    {
        id: "lekarnicka",
        name: "Lékárnička (Pro tělo a svaly) 💊🩹",
        items: [
            { id: "med_bolest", name: "Léky na bolest a zánět", note: "Ibalgin, Paralen, Panadol", important: true },
            { id: "med_svaly", name: "Mast na uvolnění svalů", note: "Voltaren, koňská mast – po prvních dnech úklidu to bude nejlepší kámoš!", important: true },
            { id: "med_nohy", name: "Náplasti na puchýře a dezinfekce", note: "Hydrokoloidní (např. Compeed), Betadine", important: true },
            { id: "med_traveni", name: "Léky na trávení", note: "Smecta, Endiaron, živočišné uhlí", important: false },
            { id: "med_osobni", name: "Osobní léky na celé 3 měsíce", note: "Alergie, astma atd. – nezapomenout!", important: true },
            { id: "med_kliste", name: "Kleštičky na klíšťata a repelent", note: "Horská příroda", important: false },
            { id: "med_nachlazeni", name: "Přípravky na krk a rýmu", note: "Z přechodů z horka do klimatizace", important: false }
        ]
    },
    {
        id: "drogerie",
        name: "Drogerie a hygiena 🧴🪥",
        items: [
            { id: "drog_zaklad", name: "Kartáček, pasta, sprchový gel, šampon", note: "Zásoba na první 2–3 týdny, zbytek koupíme tam", important: true },
            { id: "drog_deodorant", name: "Antiperspirant / Deodorant", note: "Fyzická práce", important: true },
            { id: "drog_opalovak", name: "Opalovací krém", note: "Horské sluníčko pálí víc", important: true },
            { id: "drog_holeni", name: "Holící potřeby a další hygiena", note: "Dle potřeby", important: false },
            { id: "drog_praci", name: "Prací prostředek (pár kapslí)", note: "Na první praní, než koupíme velké balení na místě", important: false }
        ]
    },
    {
        id: "elektronika",
        name: "Elektronika 📱🔌",
        items: [
            { id: "elec_mobil", name: "Mobil a nabíječka", note: "Základ", important: true },
            { id: "elec_prodlužka", name: "Prodlužovačka s více zásuvkami", note: "Záchrana! Na ubytovně bývá často jen jedna zásuvka na špatném místě", important: true },
            { id: "elec_ntb", name: "Notebook / Tablet + nabíječka", note: "Na filmy, odpočinek nebo komunikaci s rodinou", important: false },
            { id: "elec_powerbanka", name: "Powerbanka", note: "Na celodenní výlety do hor", important: false },
            { id: "elec_sluchatka", name: "Sluchátka", note: "Do vlaku nebo na pokoj", important: false }
        ]
    },
    {
        id: "vychytavky",
        name: "Vychytávky a praktické věci 🎒🔪",
        items: [
            { id: "util_batoh", name: "Malý batoh (20–30 litrů)", note: "Na volnočasové výlety nebo nákupy", important: true },
            { id: "util_lahev", name: "Láhev na vodu / Termoska", note: "Na túry i do práce", important: false },
            { id: "util_hrnek", name: "Hrnek", note: "Vlastní oblíbený", important: false },
            { id: "util_krabicky", name: "Plastové krabičky na jídlo (svačinový box)", note: "Na svačiny na výlety", important: false },
            { id: "util_snura", name: "Šňůra na prádlo a kolíčky", note: "Kdybychom chtěli sušit věci přímo na pokoji", important: false },
            { id: "util_nuz", name: "Zavírací nůž, otvírák na konzervy a víno", note: "Praktický pomocník", important: false },
            { id: "util_siti", name: "Malé šitíčko a zavírací špendlíky", note: "Pro rychlou opravu", important: false }
        ]
    },
    {
        id: "kuchyn",
        name: "Do kuchyně (Na start) ☕🥪",
        items: [
            { id: "kit_konvice", name: "Rychlovarná konvice", note: "Zásadní věc, v penzionu chybí kuchyňka!", important: true },
            { id: "kit_paninovač", name: "Paninovač / toustovač", note: "Na rychlé teplé jídlo na pokoji", important: true },
            { id: "kit_nadobi", name: "Základní nádobí", note: "Krabičky, příbory atd.", important: false },
            { id: "kit_start", name: "Startovací balíček (káva, čaj)", note: "Do začátku na pokoji, než pojedeme do Billy/Hoferu", important: false },
            { id: "kit_koreni", name: "Sůl, pepř a oblíbené koření", note: "V malých sáčcích", important: false },
            { id: "kit_nuz", name: "Kvalitní ostrý nůž", note: "Na krájení jídla", important: false },
            { id: "kit_jar", name: "Utěrka, houbička a malé balení Jaru", note: "Na mytí nádobí na pokoji", important: false }
        ]
    }
];

let activeTab = 'info'; // 'info' | 'checklist'
let searchQuery = '';
let activeFilter = 'all'; // 'all' | 'unpacked' | 'packed'
let collapsedCategories = {}; // map of categoryId -> boolean

// LocalStorage key for storing checked items
const STORAGE_KEY = 'kiscord_austria_packing_state';

// Load checked items from LocalStorage
function getCheckedItems() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("[AustriaInfo] Failed to read packing state:", e);
        return {};
    }
}

// Save checked status
function setCheckedItem(itemId, isChecked) {
    const state = getCheckedItems();
    if (isChecked) {
        state[itemId] = true;
    } else {
        delete state[itemId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Get HTML for the Countdown / Progress widget

export function renderChecklistTabHtml() {
    const checkedState = getCheckedItems();
    let totalItems = 0;
    let checkedItems = 0;

    // Pre-calculate progress
    DEFAULT_PACKING_LIST.forEach(cat => {
        cat.items.forEach(item => {
            totalItems++;
            if (checkedState[item.id]) {
                checkedItems++;
            }
        });
    });

    const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

    // Filter list based on search and selected filter
    const filteredCategories = DEFAULT_PACKING_LIST.map(cat => {
        const matchingItems = cat.items.filter(item => {
            const matchesSearch = searchQuery === '' || 
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase()));

            const isChecked = !!checkedState[item.id];
            const matchesFilter = activeFilter === 'all' || 
                (activeFilter === 'unpacked' && !isChecked) || 
                (activeFilter === 'packed' && isChecked);

            return matchesSearch && matchesFilter;
        });

        return {
            ...cat,
            items: matchingItems
        };
    }).filter(cat => cat.items.length > 0);

    return `
        <div class="space-y-6 animate-scale-up">
            <!-- Progress Bar Card -->
            <div class="glass-card bg-gradient-to-r from-red-950/20 via-[#2f3136] to-red-950/10 border border-white/5 rounded-3xl p-5 shadow-lg">
                <div class="flex justify-between items-center mb-2.5">
                    <div>
                        <h4 class="text-xs font-black uppercase tracking-wider text-white">Stav tvého balení 🎒</h4>
                        <p class="text-[10px] text-white/50 font-bold mt-0.5">
                            Už máš sbaleno <span class="text-white">${checkedItems}</span> z <span class="text-white">${totalItems}</span> věcí.
                        </p>
                    </div>
                    <div class="text-right">
                        <span class="text-base font-black text-[#ff5252]">${progressPercent}%</span>
                    </div>
                </div>
                <!-- Progress Line -->
                <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                    <div class="bg-gradient-to-r from-red-500 to-rose-600 h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                </div>
            </div>

            <!-- Search, Filters and Actions Panel -->
            <div class="flex flex-col sm:flex-row gap-3 items-center justify-between w-full bg-black/10 p-3.5 rounded-2xl border border-white/5">
                <!-- Search Input -->
                <div class="relative w-full sm:w-64">
                    <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 text-xs"></i>
                    <input type="text" id="packing-search" placeholder="Hledat položku..." 
                           value="${searchQuery}"
                           oninput="window.searchPackingList(this.value)"
                           class="w-full bg-[#202225] border border-white/5 rounded-xl pl-9 pr-3.5 py-2 text-white text-xs font-semibold placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-all">
                </div>

                <!-- Filter and Reset Buttons -->
                <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div class="flex bg-black/20 rounded-xl p-0.5 border border-white/5">
                        <button onclick="window.filterPackingList('all')" 
                                class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                                       ${activeFilter === 'all' ? 'bg-[#ff5252] text-white' : 'text-gray-400 hover:text-white'}">
                            Vše
                        </button>
                        <button onclick="window.filterPackingList('unpacked')" 
                                class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                                       ${activeFilter === 'unpacked' ? 'bg-[#ff5252] text-white' : 'text-gray-400 hover:text-white'}">
                            Nezabaleno
                        </button>
                        <button onclick="window.filterPackingList('packed')" 
                                class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                                       ${activeFilter === 'packed' ? 'bg-[#ff5252] text-white' : 'text-gray-400 hover:text-white'}">
                            Sbaleno
                        </button>
                    </div>

                    <!-- Reset Button -->
                    <button onclick="window.resetPackingList()" 
                            class="p-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-all text-xs" 
                            title="Resetovat seznam věcí">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>
            </div>

            <!-- Categories and Items -->
            <div class="space-y-4">
                ${filteredCategories.length === 0 ? `
                    <div class="text-center py-16 bg-white/[0.01] rounded-3xl border border-white/5">
                        <span class="text-4xl block mb-3">🐹</span>
                        <h4 class="text-xs font-black text-white uppercase tracking-wider">Žádné položky k zobrazení</h4>
                        <p class="text-[10px] text-white/30 font-semibold mt-1">Zkus upravit filtry nebo vyhledávací dotaz.</p>
                    </div>
                ` : filteredCategories.map(cat => {
                    const isCollapsed = !!collapsedCategories[cat.id];
                    const catCheckedCount = cat.items.filter(item => checkedState[item.id]).length;
                    const catTotalCount = cat.items.length;
                    const catComplete = catCheckedCount === catTotalCount;

                    return `
                        <div class="glass-card bg-white/[0.02] border ${catComplete ? 'border-emerald-500/20 bg-emerald-500/[0.005]' : 'border-white/5'} rounded-3xl overflow-hidden transition-all duration-300">
                            <!-- Category Header -->
                            <div onclick="window.toggleCategoryCollapse('${cat.id}')"
                                 class="flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors select-none">
                                <div class="flex items-center gap-3">
                                    <span class="text-white text-xs font-black uppercase tracking-wider">${cat.name}</span>
                                    <span class="text-[9px] px-2 py-0.5 rounded-full font-black ${catComplete ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-black/20 text-gray-400'}">
                                        ${catCheckedCount}/${catTotalCount}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2">
                                    ${catComplete ? '<span class="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Kompletní ✅</span>' : ''}
                                    <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-gray-500 text-xs"></i>
                                </div>
                            </div>

                            <!-- Category Items List -->
                            <div class="${isCollapsed ? 'hidden' : 'block'} border-t border-white/5 bg-black/10 divide-y divide-white/5">
                                ${cat.items.map(item => {
                                    const isChecked = !!checkedState[item.id];
                                    return `
                                        <div onclick="window.togglePackingItem('${item.id}')"
                                             class="flex items-start gap-3.5 px-5 py-3.5 hover:bg-white/[0.02] cursor-pointer transition-colors select-none group">
                                            
                                            <!-- Checkbox input styled -->
                                            <div class="pt-0.5">
                                                <div class="w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0
                                                           ${isChecked 
                                                               ? 'bg-gradient-to-r from-red-500 to-rose-500 border-red-500 text-white' 
                                                               : 'border-gray-600 group-hover:border-red-500/50 bg-black/20'}">
                                                    ${isChecked ? '<i class="fas fa-check text-[10px]"></i>' : ''}
                                                </div>
                                            </div>

                                            <div class="flex-1 min-w-0">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <span class="text-xs font-bold leading-tight transition-all
                                                                 ${isChecked ? 'text-gray-500 line-through' : 'text-gray-200'}">
                                                        ${item.name}
                                                    </span>
                                                    ${item.important ? `
                                                        <span class="text-[7px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded">
                                                            Nutné!
                                                        </span>
                                                    ` : ''}
                                                </div>
                                                ${item.note ? `
                                                    <p class="text-[10px] leading-snug font-semibold mt-1 transition-all
                                                              ${isChecked ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-300'}">
                                                        ${item.note}
                                                    </p>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// DYNAMIC COMPONENT ACTIONS
// ----------------------------------------------------

// Calculate total percent of checklist packed
export function calculateTotalProgress() {
    const checkedState = getCheckedItems();
    let total = 0;
    let checked = 0;

    DEFAULT_PACKING_LIST.forEach(cat => {
        cat.items.forEach(item => {
            total++;
            if (checkedState[item.id]) {
                checked++;
            }
        });
    });

    return total > 0 ? Math.round((checked / total) * 100) : 0;
}

// Switch tabs inside the Austria info view

export function togglePackingItem(itemId) {
    triggerHaptic('light');
    const checkedState = getCheckedItems();
    const isCheckedNow = !checkedState[itemId];

    setCheckedItem(itemId, isCheckedNow);

    // Dynamic partial refresh of checklist view
    const contentArea = document.getElementById("austria-info-content-area");
    if (contentArea && activeTab === 'checklist') {
        contentArea.innerHTML = renderChecklistTabHtml();
    }

    // Refresh progress badge in header
    const progressBadge = document.getElementById("header-progress-badge");
    if (progressBadge) {
        progressBadge.textContent = `${calculateTotalProgress()}%`;
    }
}

// Search packing list live input
export function searchPackingList(val) {
    searchQuery = val;
    // Rerender checklist
    const contentArea = document.getElementById("austria-info-content-area");
    if (contentArea && activeTab === 'checklist') {
        contentArea.innerHTML = renderChecklistTabHtml();
    }
}

// Filter packing list tabs
export function filterPackingList(filter) {
    triggerHaptic('light');
    activeFilter = filter;
    
    // Rerender checklist
    const contentArea = document.getElementById("austria-info-content-area");
    if (contentArea && activeTab === 'checklist') {
        contentArea.innerHTML = renderChecklistTabHtml();
    }
}

// Expand / Collapse category container
export function toggleCategoryCollapse(categoryId) {
    triggerHaptic('light');
    collapsedCategories[categoryId] = !collapsedCategories[categoryId];
    
    // Rerender checklist
    const contentArea = document.getElementById("austria-info-content-area");
    if (contentArea && activeTab === 'checklist') {
        contentArea.innerHTML = renderChecklistTabHtml();
    }
}

// Full reset of packed items
export async function resetPackingList() {
    const confirmed = await showConfirmDialog("Opravdu chceš resetovat celého sbaleného průvodce a začít znova? 🎒");
    if (!confirmed) return;
    
    triggerHaptic('heavy');
    localStorage.removeItem(STORAGE_KEY);
    showNotification("Seznam věcí byl kompletně vyčištěn.", "info");

    // Rerender checklist
    const contentArea = document.getElementById("austria-info-content-area");
    if (contentArea && activeTab === 'checklist') {
        contentArea.innerHTML = renderChecklistTabHtml();
    }

    // Refresh progress badge in header
    const progressBadge = document.getElementById("header-progress-badge");
    if (progressBadge) {
        progressBadge.textContent = `${calculateTotalProgress()}%`;
    }
}
