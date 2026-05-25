import { triggerHaptic } from '../core/utils.js';
import { openAustrianGermanFlashcards } from './flashcards.js';
import { supabase } from '../core/supabase.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';

// Austrian German static default glossary database
const DEFAULT_AUSTRIAN_DICTIONARY = [
    // Pozdravy
    { austrian: "Servus!", german: "Hallo / Tschüss", czech: "Ahoj / Čus!", category: "Greetings 💬", example: "Servus Oida! (Čau kámo!)" },
    { austrian: "Grüß Gott!", german: "Guten Tag", czech: "Dobrý den! (Tradiční alpský pozdrav)", category: "Greetings 💬", example: "Grüß Gott, wie kann ich Ihnen helfen? (Dobrý den, jak vám mohu pomoci?)" },
    { austrian: "Pfiat di!", german: "Auf Wiedersehen (zu einer Person)", czech: "Sbohem / Měj se!", category: "Greetings 💬", example: "Pfiat di, bis morgen! (Měj se, na viděnou zítra!)" },
    { austrian: "Pfiat enk!", german: "Auf Wiedersehen (zu mehreren Personen)", czech: "Sbohem vám všem / Mějte se!", category: "Greetings 💬", example: "Pfiat enk, schöne Grüße daheim! (Mějte se všichni, pozdravujte doma!)" },
    { austrian: "Dere!", german: "Habe d'Ehre (Servus)", czech: "Čau / Těbůh!", category: "Greetings 💬", example: "Dere! Was gibt es Neues? (Čau! Co je nového?)" },

    // Jídlo & Restaurace
    { austrian: "Semmel", german: "Brötchen", czech: "Houska / Žemle", category: "Food & Drinks 🥨", example: "Zwei Semmeln, bitte. (Dvě housky, prosím.)" },
    { austrian: "Sackerl", german: "Tüte / Tasche", czech: "Sáček / Taška / Igelitka", category: "Food & Drinks 🥨", example: "Brauchen Sie ein Sackerl? (Potřebujete tašku?)" },
    { austrian: "Almdudler", german: "Kräuterlimonade", czech: "Tradiční rakouská bylinková limonáda", category: "Food & Drinks 🥨", example: "Ein Almdudler gespritzt, bitte. (Jeden míchaný Almdudler, prosím.)" },
    { austrian: "Melange", german: "Milchkaffee mit Milchschaum", czech: "Vídeňská káva (s mléčnou pěnou)", category: "Food & Drinks 🥨", example: "Ein Wiener Melange und ein Stück Sachertorte. (Jednu vídeňskou kávu a kousek dortu Sacher.)" },
    { austrian: "Erdapfel", german: "Kartoffel", czech: "Brambor", category: "Food & Drinks 🥨", example: "Erdäpfelsalat ist eine Spezialität hier. (Bramborový salát je zdejší specialitou.)" },
    { austrian: "Topfen", german: "Quark", czech: "Tvaroh", category: "Food & Drinks 🥨", example: "Ich liebe Topfenstrudel! (Miluju tvarohový štrúdl!)" },
    { austrian: "Marille", german: "Aprikose", czech: "Meruňka", category: "Food & Drinks 🥨", example: "Marillenknödel sind so lecker. (Meruňkové knedlíky jsou tak lahodné.)" },
    { austrian: "Paradeiser", german: "Tomate", czech: "Rajče", category: "Food & Drinks 🥨", example: "Frische Paradeiser vom Markt. (Čerstvá rajčata z trhu.)" },
    { austrian: "Krügerl", german: "Halber Liter Bier", czech: "Půllitr (velké pivo)", category: "Food & Drinks 🥨", example: "Noch ein Krügerl, bitte! (Ještě jeden půllitr piva, prosím!)" },

    // Práce
    { austrian: "Hackeln", german: "Arbeiten", czech: "Dřít / Pracovat / Makat", category: "Workplace 🛠️", example: "Morgen muss ich wieder hackeln gehen. (Zítra musím jít zase makat.)" },
    { austrian: "Sperrstund", german: "Ladenschluss / Polizeistunde", czech: "Zavíračka / Konec pracovní doby", category: "Workplace 🛠️", example: "Es ist fast Sperrstund, wir müssen aufräumen. (Je skoro zavíračka, musíme uklidit.)" },
    { austrian: "Hetschn", german: "Eile / Hektik", czech: "Spěch / Shon / Honička", category: "Workplace 🛠️", example: "Keine Hetschn, wir haben Zeit! (Žádný spěch, máme čas!)" },
    { austrian: "Semmelbrösel", german: "Paniermehl", czech: "Strouhanka", category: "Workplace 🛠️", example: "Wir brauchen Semmelbrösel für das Schnitzel. (Na řízek potřebujeme strouhanku.)" },
    { austrian: "Pickerl", german: "Aufkleber / Vignette", czech: "Nálepka / Dálniční známka / STK", category: "Workplace 🛠️", example: "Hast du das Pickerl auf die Windschutzscheibe geklebt? (Nalepil jsi známku na čelní sklo?)" },

    // Dialekt & Slang
    { austrian: "Oida", german: "Alter / Kumpel / Oh Mann (universell)", czech: "Kámo / Vole / Ty jo! (Univerzální alpské zvolání)", category: "Slang 🏔️", example: "Oida, das ist extrem geil! (Ty jo, to je mega hustý!)" },
    { austrian: "Leiwand", german: "Großartig / Cool", czech: "Skvělý / Parádní / Boží", category: "Slang 🏔️", example: "Der Ausflug war ur leiwand! (Ten výlet byl fakt parádní!)" },
    { austrian: "Schmäh", german: "Humor / Witz / leere Redensart", czech: "Humor / Kecy / Vtipkování", category: "Slang 🏔️", example: "Glaub ihm nicht, das ist nur sein Schmäh. (Nevěř mu, to jsou jen ty jeho kecy.)" },
    { austrian: "ur-", german: "sehr / extrem (Verstärkung)", czech: "Mega- / Prase- / Hrozně (předpona)", category: "Slang 🏔️", example: "Es ist heute ur kalt da draußen! (Dneska je venku hrozná kosa!)" },
    { austrian: "Bussi", german: "Küsschen", czech: "Hubička / Pusinka", category: "Slang 🏔️", example: "Bussi für dich! (Pusu pro tebe!)" },
    { austrian: "Baba!", german: "Tschüss", czech: "Ahoj! / Čau! (při loučení)", category: "Slang 🏔️", example: "Baba, schönen Abend noch! (Čau, hezký zbytek večera!)" }
];

// Active combined dictionary
export const AUSTRIAN_DICTIONARY = [];

let hasLoadedVocab = false;
let activeFilter = 'all';
let searchQuery = '';

// Load custom vocab and merge with static dictionary
export async function loadVocabData() {
    try {
        const { data, error } = await supabase
            .from('austrian_vocab')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Reset and populate AUSTRIAN_DICTIONARY
        AUSTRIAN_DICTIONARY.length = 0;
        AUSTRIAN_DICTIONARY.push(...DEFAULT_AUSTRIAN_DICTIONARY);

        if (data) {
            data.forEach(item => {
                AUSTRIAN_DICTIONARY.push({
                    id: item.id,
                    austrian: item.austrian,
                    german: item.german,
                    czech: item.czech,
                    category: item.category,
                    example: item.example,
                    created_by: item.created_by,
                    isCustom: true
                });
            });
        }
        hasLoadedVocab = true;
    } catch (e) {
        console.error("[AustrianGerman] Failed to load custom vocabulary:", e);
        // Fallback
        if (AUSTRIAN_DICTIONARY.length === 0) {
            AUSTRIAN_DICTIONARY.push(...DEFAULT_AUSTRIAN_DICTIONARY);
        }
    }
}

// Setup real-time listener
if (!window._vocabListenerAttached) {
    window.addEventListener('vocab-updated', async () => {
        await loadVocabData();
        const container = document.getElementById("messages-container");
        if (container && window.renderAustrianGerman) {
            window.renderAustrianGerman();
        }
    });
    window._vocabListenerAttached = true;
}

export async function renderAustrianGerman() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    window.renderAustrianGerman = renderAustrianGerman;

    if (!hasLoadedVocab) {
        await loadVocabData();
    }

    const categories = ['all', ...new Set(AUSTRIAN_DICTIONARY.map(w => w.category))];

    // Filter dictionary
    const filtered = AUSTRIAN_DICTIONARY.filter(item => {
        const matchesCategory = activeFilter === 'all' || item.category === activeFilter;
        const matchesSearch = searchQuery === '' || 
            item.austrian.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.german.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.czech.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16">
            <!-- Header section -->
            <div class="sticky top-0 z-50 bg-[#36393f]/90 backdrop-blur-md pb-4 pt-6 px-6 border-b border-white/5 shadow-lg">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-3xl mx-auto">
                    <div>
                        <h2 class="text-2xl font-black text-white uppercase tracking-tighter leading-tight flex items-center gap-2">
                           <i class="fas fa-utensils text-[#eb459e]"></i> Rakouská Němčina
                        </h2>
                        <p class="text-xs text-white/50 font-semibold tracking-wide mt-1">
                            Alpský survival slovníček & flashcards pro naši brigádu! 🇦🇹
                        </p>
                    </div>
                    
                    <div class="flex gap-2 self-end md:self-auto">
                        <!-- Add Custom Vocab Button -->
                        <button onclick="window.openAddVocabModal()" 
                                class="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group">
                            <i class="fas fa-plus text-[#eb459e] group-hover:scale-110 transition-transform"></i> Přidat slovíčko
                        </button>
                        
                        <!-- Flashcard Trigger Button -->
                        <button onclick="window.startAustrianFlashcards()" 
                                class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#eb459e] to-purple-600 hover:from-[#f55da8] hover:to-purple-700 text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2 group">
                            <span class="animate-bounce-subtle">🥨</span> Kartičky
                        </button>
                    </div>
                </div>

                <!-- Search and Categories -->
                <div class="w-full max-w-3xl mx-auto mt-6 space-y-3">
                    <div class="relative">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm"></i>
                        <input type="text" id="german-search" placeholder="Vyhledat frázi, překlad nebo význam..." 
                               value="${searchQuery}"
                               oninput="window.filterGermanSearch(this.value)"
                               class="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white text-xs font-semibold placeholder-white/20 focus:outline-none focus:border-[#eb459e]/50 focus:bg-white/[0.08] transition-all">
                    </div>

                    <!-- Category filter chips -->
                    <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                        ${categories.map(cat => `
                            <button onclick="window.filterGermanCategory('${cat}')" 
                                    class="flex-shrink-0 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all
                                           ${activeFilter === cat 
                                               ? 'bg-[#eb459e]/10 border-[#eb459e]/50 text-[#eb459e]' 
                                               : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10 hover:text-white'}">
                                ${cat === 'all' ? 'Všechno 🌍' : cat}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Vocabulary Cards List -->
            <div class="max-w-3xl mx-auto px-4 pt-6">
                ${filtered.length === 0 ? `
                    <div class="text-center py-16">
                        <span class="text-5xl block mb-4">🦝</span>
                        <h4 class="text-lg font-black text-white uppercase tracking-wider">Žádná slovíčka nenalezena</h4>
                        <p class="text-xs text-white/40 font-semibold mt-1">Zkus zadat jiný vyhledávací výraz</p>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${filtered.map(item => renderVocabCard(item)).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Single vocabulary card rendering helper
function renderVocabCard(item) {
    return `
        <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group relative overflow-hidden">
            <div>
                <div class="flex justify-between items-start gap-2 mb-3">
                    <span class="text-2xl font-black text-white italic group-hover:text-amber-400 transition-colors">
                        "${item.austrian}"
                    </span>
                    <div class="flex items-center gap-1.5 z-10">
                        <span class="text-[9px] font-black uppercase tracking-widest text-[#eb459e] bg-[#eb459e]/10 px-2 py-0.5 rounded-full">
                            ${item.category}
                        </span>
                        ${item.isCustom ? `
                            <button onclick="window.deleteCustomVocab('${item.id}', event)" 
                                    class="text-white/30 hover:text-red-400 p-1 hover:bg-white/5 rounded transition-all text-xs" 
                                    title="Smazat slovíčko">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="space-y-2 mt-4 border-t border-white/5 pt-3">
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block">Spisovná němčina</span>
                        <span class="text-xs font-bold text-white/70">${item.german}</span>
                    </div>
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block">Český překlad</span>
                        <span class="text-xs font-black text-white/90">${item.czech}</span>
                    </div>
                    ${item.example ? `
                        <div class="bg-black/20 p-2.5 rounded-xl border border-white/5 mt-2">
                            <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">Příklad použití</span>
                            <span class="text-[10px] font-semibold italic text-purple-200/80">"${item.example}"</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Global actions
window.filterGermanSearch = (val) => {
    searchQuery = val;
    renderAustrianGerman();
};

window.filterGermanCategory = (cat) => {
    triggerHaptic('light');
    activeFilter = cat;
    renderAustrianGerman();
};

window.startAustrianFlashcards = () => {
    triggerHaptic('medium');
    openAustrianGermanFlashcards(AUSTRIAN_DICTIONARY);
};

window.openAddVocabModal = () => {
    triggerHaptic('light');
    
    const contentHtml = `
        <div class="space-y-4">
            ${renderInputGroup({
                label: 'Rakouský výraz / dialekt (např. Marille)',
                id: 'vocab-austrian',
                placeholder: 'Zadej rakouský výraz...'
            })}
            ${renderInputGroup({
                label: 'Spisovná němčina (např. Aprikose)',
                id: 'vocab-german',
                placeholder: 'Zadej spisovný výraz...'
            })}
            ${renderInputGroup({
                label: 'Český překlad (např. Meruňka)',
                id: 'vocab-czech',
                placeholder: 'Zadej český překlad...'
            })}
            
            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                <select id="vocab-category" onchange="window.onVocabCategoryChange(this.value)"
                    class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#eb459e]/30 focus:bg-[#202225] transition-all">
                    <option value="Greetings 💬">Greetings 💬</option>
                    <option value="Food & Drinks 🥨" selected>Food & Drinks 🥨</option>
                    <option value="Workplace 🛠️">Workplace 🛠️</option>
                    <option value="Slang 🏔️">Slang 🏔️</option>
                    <option value="custom">Napsat vlastní kategorii... ✍️</option>
                </select>
            </div>
            
            <div id="vocab-custom-category-group" class="hidden space-y-1 mt-3 animate-fade-in">
                ${renderInputGroup({
                    label: 'Název vlastní kategorie',
                    id: 'vocab-custom-category',
                    placeholder: 'např. Nákupy 🛒'
                })}
            </div>
            
            ${renderInputGroup({
                label: 'Příklad použití v větě (volitelné)',
                id: 'vocab-example',
                placeholder: 'např. Marillenknödel sind lecker.'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-vocab-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button onclick="window.saveCustomVocab()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#eb459e] to-purple-600 hover:from-[#f55da8] hover:to-purple-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-[#eb459e]/20">
                Uložit slovíčko
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-vocab-modal',
        title: 'Přidat rakouské slovíčko',
        subtitle: 'Zaznamenej si slovíčko z terénu 🇦🇹',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-vocab-modal').remove()"
    }));

    document.getElementById('add-vocab-modal').classList.remove('hidden');
    document.getElementById('add-vocab-modal').classList.add('flex');
};

window.onVocabCategoryChange = (val) => {
    const group = document.getElementById('vocab-custom-category-group');
    if (val === 'custom') {
        group.classList.remove('hidden');
        group.classList.add('animate-fade-in');
    } else {
        group.classList.add('hidden');
        group.classList.remove('animate-fade-in');
    }
};

window.saveCustomVocab = async () => {
    triggerHaptic('medium');
    
    const austrian = document.getElementById('vocab-austrian').value.trim();
    const german = document.getElementById('vocab-german').value.trim();
    const czech = document.getElementById('vocab-czech').value.trim();
    const example = document.getElementById('vocab-example').value.trim();
    
    let category = document.getElementById('vocab-category').value;
    if (category === 'custom') {
        category = document.getElementById('vocab-custom-category').value.trim();
        if (!category) {
            showNotification('Prosím zadej název vlastní kategorie!', 'warning');
            return;
        }
    }

    if (!austrian || !german || !czech) {
        showNotification('Prosím vyplň všechna povinná pole!', 'warning');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
            .from('austrian_vocab')
            .insert({
                austrian,
                german,
                czech,
                category,
                example: example || null,
                created_by: user ? user.id : null
            });

        if (error) throw error;

        showNotification('Slovíčko bylo úspěšně uloženo a synchronizováno! 🎉', 'success');
        document.getElementById('add-vocab-modal')?.remove();
        
        // Refresh local data
        await loadVocabData();
        renderAustrianGerman();
    } catch (err) {
        console.error('Chyba při ukládání slovíčka:', err);
        showNotification('Nepodařilo se uložit slovíčko do databáze.', 'danger');
    }
};

window.deleteCustomVocab = async (id, event) => {
    if (event) event.stopPropagation();
    
    if (!confirm('Opravdu chceš smazat toto slovíčko pro vás oba?')) return;
    
    triggerHaptic('medium');
    
    try {
        const { error } = await supabase
            .from('austrian_vocab')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Slovíčko bylo smazáno.', 'info');
        
        // Refresh local data
        await loadVocabData();
        renderAustrianGerman();
    } catch (err) {
        console.error('Chyba při mazání slovíčka:', err);
        showNotification('Nepodařilo se smazat slovíčko.', 'danger');
    }
};
