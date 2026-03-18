import { supabase } from '../core/supabase.js';
import { triggerHaptic } from '../core/utils.js';

// --- DEFINICE ACHIEVEMENTŮ ---
const ACHIEVEMENT_CATEGORIES = [
    { id: 'tutorial', name: '🟢 The Tutorial (Naše začátky)' },
    { id: 'exploration', name: '🔵 Exploration & World Events (Naše cesty)' },
    { id: 'easter_eggs', name: '🔴 Inside Jokes & Easter Eggs (Naše bizáry)' },
    { id: 'dlc', name: '🟡 Upcoming DLC (Naše roadmapa)' },
    { id: 'health_system', name: '🩺 Health & System (Automatické)' }
];

const ACHIEVEMENT_LIST = [
    // 🟢 The Tutorial (Naše začátky)
    { id: 'math_cipher', category: 'tutorial', title: 'Matematická šifra', description: 'Úspěšné získání legendárních výpisků z matematiky, které odstartovalo celou naši story.', icon: '📐', color: 'from-green-400 to-green-600' },
    { id: 'discord_residents', category: 'tutorial', title: 'Discord Residents', description: 'Prolomení hranice 6 hodin v jednom kuse v callu bez jediného „dropu“ konverzace.', icon: '🎧', color: 'from-[#5865F2] to-indigo-600' },
    { id: 'hello_world', category: 'tutorial', title: 'Hello World', description: 'Oficiální „zakliknutí“ vztahu v aplikaci (24. 12.).', icon: '💻', color: 'from-pink-400 to-rose-600' },
    { id: 'sidequest_starter', category: 'tutorial', title: 'Sidequest Starter', description: 'Absolvování prvního společného táboráku u Vlčnovských búd.', icon: '🔥', color: 'from-orange-400 to-red-500' },

    // 🔵 Exploration & World Events (Naše cesty)
    { id: 'mammoth_hunters', category: 'exploration', title: 'Lovci mamutů', description: 'Přežití prvního oficiálního rande v Boršicích v mrazivých podmínkách.', icon: '🦣', color: 'from-cyan-400 to-blue-600' },
    { id: 'golden_hour', category: 'exploration', title: 'Zlatá hodinka', description: 'Nalezení Slunce u Buchlovského kamene.', icon: '🌅', color: 'from-yellow-300 to-orange-500' },
    { id: 'geopolitics', category: 'exploration', title: 'Geopolitický převrat', description: 'Úspěšné přesvědčení občana Podolí, že je ve skutečnosti hrdým Kunovjanem.', icon: '🌍', color: 'from-emerald-400 to-teal-600' },
    { id: 'survival_mode', category: 'exploration', title: 'Survival Mode', description: 'Bezpečný návrat domů autem, kterému se uprostřed noci rozhodla vypovědět službu světla.', icon: '🚗', color: 'from-neutral-600 to-neutral-900' },

    // 🔴 Inside Jokes & Easter Eggs (Naše bizáry)
    { id: 'atc_control', category: 'easter_eggs', title: 'Řízení letového provozu', description: 'Správná identifikace letadla vs. hvězdy dříve, než proběhne povinný „fact-check“.', icon: '✈️', color: 'from-red-400 to-red-600' },
    { id: 'newton_sacrifice', category: 'easter_eggs', title: 'Newtonova oběť', description: 'Praktický důkaz toho, že přisednutí vlastního kotníku vede k okamžitému rebuildu končetiny v sádře.', icon: '🦵', color: 'from-zinc-400 to-zinc-600' },
    { id: 'sowl_synergy', category: 'easter_eggs', title: 'Sowl & Raccoon Synergy', description: 'Harmonické spojení moudré sovy a mývala.', icon: '🦉', color: 'from-purple-400 to-fuchsia-600' },

    // 🟡 Upcoming DLC (Naše roadmapa)
    { id: 'alps_dlc', category: 'dlc', title: 'Alps Expansion Pack', description: 'Společné nasazení ve Woferlgutu.', icon: '🏔️', color: 'from-amber-200 to-yellow-500' },
    { id: 'fit_survivors', category: 'dlc', title: 'FIT Survivors', description: 'Úspěšné zkompilování prvního semestru na VUT FIT bez ztráty duševního zdraví.', icon: '💻', color: 'from-red-600 to-red-800' },
    { id: 'cips_alpha', category: 'dlc', title: 'Cip’s Alpha Version', description: 'Pořízení prvního psa a jeho oficiální pojmenování podle schválené dokumentace.', icon: '🐕', color: 'from-yellow-600 to-amber-800' },

    // 🩺 Health & System (Automatické)
    { id: 'hydration_master', category: 'health_system', title: 'Piháchův Vodník', description: 'Bez hydrování není žití. Vypito minimálně 8/8 pohárků vody za den.', icon: '💧', color: 'from-blue-400 to-cyan-500' },
    { id: 'sleeping_beauty', category: 'health_system', title: 'Šípková Růženka', description: 'Poctivý 7+ hodinový spánek držen alespoň 7 dní v kuse.', icon: '👸', color: 'from-pink-300 to-purple-400' },
    { id: 'euphoria', category: 'health_system', title: 'Vrchol Nálady', description: 'Dosažena úroveň štěstí 10/10.', icon: '🌞', color: 'from-yellow-400 to-yellow-600' },
    { id: 'zombie_survivor', category: 'health_system', title: 'Zombie Mód', description: 'Zvládnutý den s méně než 4 hodinami spánku.', icon: '🧟', color: 'from-gray-600 to-gray-800' },
    { id: 'bucket_starter', category: 'health_system', title: 'Snílci', description: 'Přidána první společná položka do Bucket Listu.', icon: '🚀', color: 'from-orange-400 to-red-500' }
];

let unlockedState = []; // Pole IDček odemčených achievementů ze Supabase
let subscription = null;

// --- RENDER ---

export async function renderAchievements() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Prvotní UI (kostra + loading state)
    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
             <!-- Hlavička -->
             <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-6 lg:p-8 flex flex-col items-center justify-center relative">
                <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div class="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-[#faa61a] bg-[#202225] shadow-[0_0_20px_rgba(250,166,26,0.5)] mb-4">
                    <i class="fas fa-trophy text-[#faa61a] text-2xl"></i>
                </div>
                <h1 class="relative z-10 text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Síň Slávy</h1>
                <p class="relative z-10 text-gray-400 font-medium mt-2 text-center max-w-md">Naše příběhy a milníky vytesané do kamene.</p>
                
                <div id="achievements-progress" class="mt-6 w-full max-w-md relative z-10 hidden">
                    <div class="flex justify-between text-xs font-bold text-gray-400 mb-1">
                        <span>Odemčeno</span>
                        <span id="progress-text">0 / 0</span>
                    </div>
                    <div class="h-3 bg-[#202225] rounded-full overflow-hidden shadow-inner">
                        <div id="progress-bar" class="h-full bg-gradient-to-r from-[#faa61a] to-[#ed4245] w-0 transition-all duration-1000"></div>
                    </div>
                </div>
            </div>

            <!-- Obsah -->
            <div class="flex-1 overflow-y-auto w-full mx-auto p-4 lg:p-8 custom-scrollbar relative">
                <div id="ach-loading" class="absolute inset-0 flex items-center justify-center bg-[#36393f] z-10">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#faa61a]"></div>
                </div>

                <div id="ach-container" class="max-w-6xl mx-auto opacity-0 transition-opacity duration-500 pb-20 space-y-12">
                    <!-- Kategorie a Grid se vygenerují sem -->
                </div>
            </div>
        </div>
    `;

    setupRealtime();
    await fetchUnlockedAchievements();
}

// --- LOGIKA ---

async function fetchUnlockedAchievements() {
    const loadingEl = document.getElementById('ach-loading');
    const containerEl = document.getElementById('ach-container');
    const progressEl = document.getElementById('achievements-progress');
    if (!containerEl) return;

    try {
        const { data, error } = await supabase
            .from('achievements')
            .select('*');

        if (error) throw error;

        unlockedState = data || [];
        
        renderCategories();

        if (progressEl) {
            progressEl.classList.remove('hidden');
            const unlockedCount = unlockedState.length;
            const totalCount = ACHIEVEMENT_LIST.length;
            const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
            
            document.getElementById('progress-text').innerText = `${unlockedCount} / ${totalCount} (${percentage}%)`;
            document.getElementById('progress-bar').style.width = `${percentage}%`;
        }

        if (loadingEl) loadingEl.style.display = 'none';
        containerEl.classList.remove('opacity-0');

    } catch (e) {
        console.error("Chyba při načítání achievementů:", e);
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function renderCategories() {
    const containerEl = document.getElementById('ach-container');
    if (!containerEl) return;

    let html = '';

    ACHIEVEMENT_CATEGORIES.forEach(category => {
        const categoryAchievements = ACHIEVEMENT_LIST.filter(a => a.category === category.id);
        if (categoryAchievements.length === 0) return;

        html += `
            <section class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-gray-300 mb-6 border-b border-gray-700/50 pb-2 pl-2 border-l-4 border-l-[#faa61a]">
                    ${category.name}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        `;

        categoryAchievements.forEach(ach => {
            const unlockedData = unlockedState.find(u => u.id === ach.id);
            const isUnlocked = !!unlockedData;
            
            html += generateAchievementCard(ach, isUnlocked, unlockedData?.unlocked_at);
        });

        html += `</div></section>`;
    });

    containerEl.innerHTML = html;
}

function generateAchievementCard(ach, isUnlocked, dateStrRaw) {
    const dateStr = dateStrRaw ? new Date(dateStrRaw).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
    
    // Vizuál podle stavu
    const cardBg = isUnlocked ? 'bg-[#2f3136] border-gray-700/50' : 'bg-[#202225] border-gray-800 opacity-60 grayscale';
    const iconContainer = isUnlocked 
        ? `bg-gradient-to-br ${ach.color} shadow-lg shadow-${ach.color.split(' ')[1].replace('to-', '')}/20` 
        : 'bg-gray-800';
    
    const titleColor = isUnlocked ? 'text-white font-bold' : 'text-gray-500 font-medium';
    const descColor = isUnlocked ? 'text-gray-400' : 'text-gray-600 blur-[2px] select-none'; 
    
    // Odemčeni click
    const onClick = isUnlocked 
        ? `onclick="import('./js/modules/achievements.js').then(m => m.toggleAchievement('${ach.id}', false))"` 
        : `onclick="import('./js/modules/achievements.js').then(m => m.toggleAchievement('${ach.id}', true))"`;

    return `
        <div ${onClick} class="${cardBg} border rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 transform ${isUnlocked ? 'hover:-translate-y-1 hover:shadow-xl cursor-pointer' : 'hover:opacity-100 hover:grayscale-0 cursor-pointer'} group relative overflow-hidden h-full">
            
            ${isUnlocked ? `<div class="absolute -top-10 -right-10 w-20 h-20 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-colors"></div>` : ''}

            ${isUnlocked ? `<div class="absolute top-2 right-2 text-xs font-mono text-gray-500 font-bold">${dateStr}</div>` : '<div class="absolute top-2 right-2 text-xs text-gray-600"><i class="fas fa-lock"></i></div>'}

            <div class="${iconContainer} w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 transition-transform group-hover:scale-110">
                ${ach.icon}
            </div>
            
            <h3 class="${titleColor} mb-2 line-clamp-2">${ach.title}</h3>
            
            <p class="text-xs ${descColor} mt-auto transition-all group-hover:blur-none line-clamp-3">
                ${ach.description}
            </p>
            
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm z-20">
                <span class="text-white font-bold text-sm bg-[#5865F2] px-4 py-2 rounded-full shadow-lg">
                    ${isUnlocked ? '<i class="fas fa-undo mr-2"></i> Zamknout' : '<i class="fas fa-unlock mr-2"></i> Odemknout'}
                </span>
            </div>
        </div>
    `;
}

// --- AKCE (MANUÁLNÍ ODŠKRTNUTÍ) ---

export async function toggleAchievement(id, unlock) {
    triggerHaptic(unlock ? 'success' : 'medium');
    
    if (unlock) {
        if (typeof window.triggerConfetti === 'function') {
            window.triggerConfetti();
        }
        
        const { error } = await supabase.from('achievements').insert([{
            id: id,
            unlocked_at: new Date().toISOString()
        }]);

        if (error) console.error("Chyba při odemykání:", error);
    } else {
        const { error } = await supabase.from('achievements').delete().eq('id', id);
        if (error) console.error("Chyba při zamykání:", error);
    }

    await fetchUnlockedAchievements();
}

// --- REALTIME ---

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('achievements-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'achievements' },
            (payload) => {
                fetchUnlockedAchievements();
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}

// --- AUTOMATIC ACHIEVEMENTS HOOKS ---

export async function autoUnlock(id) {
    // Zkontroluje, zda už to není v unlockedState (abychom nedělali query/konfety zbytečně)
    if (unlockedState.some(u => u.id === id)) return;

    // Ještě pro jistotu fetch ze Supabase (přece jen to mohl odemknout druhý)
    const { data } = await supabase.from('achievements').select('id').eq('id', id).single();
    if (data) return; // Už je odemčeno

    // Můžeme odemknout!
    triggerHaptic('success');
    if (typeof window.triggerConfetti === 'function') {
        window.triggerConfetti();
    }
    
    const achievementObj = ACHIEVEMENT_LIST.find(a => a.id === id);
    if (achievementObj) {
        // Notifikace pro uživatele (pokud UI běží)
        window.dispatchEvent(new CustomEvent('notification', { 
            detail: { message: `🏆 Odznáček odemčen: ${achievementObj.title}!`, type: "success" } 
        }));
    }

    const { error } = await supabase.from('achievements').insert([{
        id: id,
        unlocked_at: new Date().toISOString()
    }]);

    if (error) {
         console.error("Chyba auto-unlock:", error);
    } else {
         fetchUnlockedAchievements(); // Refresh listu na pozadí
    }
}

// Hook zavolaný z calendar.js:saveHealthRecord
export async function checkHealthAchievements(currentDateKey, healthData, allHealthState = {}) {
    // 1. Piháchův Vodník: 8/8 kapek
    if (healthData.water >= 8) {
        await autoUnlock('hydration_master');
    }

    // 2. Euphoria: Štěstí 10
    if (healthData.mood === 10) {
        await autoUnlock('euphoria');
    }

    // 3. Zombie: Spánek < 4 (a > 0 pro jistotu, že je zadán)
    if (healthData.sleep > 0 && healthData.sleep < 4) {
        await autoUnlock('zombie_survivor');
    }

    // 4. Šípková Růženka (7 dní v kuse 7+ spánek)
    if (healthData.sleep >= 7 && allHealthState) {
        // Zkusíme najít 6 předchozích dní a zkontrolovat jejich spánek
        const d = new Date(currentDateKey);
        let consecutiveGoodSleep = 1; // Dnešek už víme, že má 7+

        for (let i = 1; i < 7; i++) {
            d.setDate(d.getDate() - 1);
            const pastKey = d.toISOString().split('T')[0];
            const pastData = allHealthState[pastKey];

            let pastSleep = pastData?.sleep;
            if (typeof pastSleep === 'string') {
                if(pastSleep === 'good') pastSleep = 8;
                else if(pastSleep === 'avg') pastSleep = 7;
                else pastSleep = 4;
            }

            if (pastSleep !== undefined && pastSleep >= 7) {
                consecutiveGoodSleep++;
            } else {
                break; // Řetězec se přerušil
            }
        }

        if (consecutiveGoodSleep >= 7) {
            await autoUnlock('sleeping_beauty');
        }
    }
}
