import { supabase } from '../core/supabase.js';
import { state, saveStateToCache } from '../core/state.js';
import { safeInsert, safeDelete } from '../core/offline.js';
import { isJosef } from '../core/auth.js';
import { triggerHaptic } from '../core/utils.js';

// --- DEFINICE ACHIEVEMENTŮ ---
// ACHIEVEMENT_CATEGORIES and ACHIEVEMENT_LIST are now fetched from state.achievementCategories and state.achievementDefinitions

// let unlockedState = []; // ODSTRANĚNO - nyní používáme state.achievements
let subscription = null;

// --- RENDER ---

export async function renderAchievements() {
    // Expose API to window
    window.Achievements = { 
        renderAchievements, toggleAchievement, autoUnlock, 
        showAddAchievementModal, saveNewAchievement 
    };

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
                
                ${isJosef(state.currentUser) ? `
                    <button onclick="window.Achievements.showAddAchievementModal()" class="relative z-10 mt-4 bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-4 py-2 rounded-lg font-bold shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nový Achievement
                    </button>
                ` : ''}
                
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
    renderCategories(); // Nyní rendrujeme rovnou ze state
}

// --- LOGIKA ---

// ODSTRANĚNO: fetchUnlockedAchievements – data se nyní načítají v state.js:initializeState()

function renderCategories() {
    const containerEl = document.getElementById('ach-container');
    const loadingEl = document.getElementById('ach-loading');
    const progressEl = document.getElementById('achievements-progress');
    if (!containerEl) return;

    // Aktualizace progress baru
    if (progressEl) {
        progressEl.classList.remove('hidden');
        const unlockedCount = state.achievements.length;
        const totalCount = state.achievementDefinitions.length;
        const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
        
        document.getElementById('progress-text').innerText = `${unlockedCount} / ${totalCount} (${percentage}%)`;
        document.getElementById('progress-bar').style.width = `${percentage}%`;
    }

    let html = '';

    state.achievementCategories.forEach(category => {
        const categoryAchievements = state.achievementDefinitions.filter(a => a.category === category.id);
        if (categoryAchievements.length === 0) return;

        html += `
            <section class="animate-fade-in-up">
                <h2 class="text-xl font-bold text-gray-300 mb-6 border-b border-gray-700/50 pb-2 pl-2 border-l-4 border-l-[#faa61a]">
                    ${category.name}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        `;

        categoryAchievements.forEach(ach => {
            const unlockedData = state.achievements.find(u => u.id === ach.id);
            const isUnlocked = !!unlockedData;
            
            html += generateAchievementCard(ach, isUnlocked, unlockedData?.unlocked_at);
        });

        html += `</div></section>`;
    });

    containerEl.innerHTML = html;
    if (loadingEl) loadingEl.style.display = 'none';
    containerEl.classList.remove('opacity-0');
}

function generateAchievementCard(ach, isUnlocked, dateStrRaw) {
    const dateStr = dateStrRaw ? new Date(dateStrRaw).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
    
    // Vizuál podle stavu
    const cardBg = isUnlocked ? 'bg-[#2f3136] border-gray-700/50' : 'bg-[#202225]/80 border-gray-800';
    const iconContainer = isUnlocked 
        ? `bg-gradient-to-br ${ach.color} shadow-lg shadow-${ach.color.split(' ')[1].replace('to-', '')}/20` 
        : 'bg-gray-800/50 grayscale opacity-40';
    
    const titleColor = isUnlocked ? 'text-white font-bold' : 'text-gray-400 font-bold';
    const descColor = isUnlocked ? 'text-gray-400' : 'text-gray-500'; 
    const padlockColor = isUnlocked ? 'text-[#3ba55c]' : 'text-gray-600';
    
    // Odemčeni click
    const onClick = isUnlocked 
        ? `onclick="window.Achievements.toggleAchievement('${ach.id}', false)"` 
        : `onclick="window.Achievements.toggleAchievement('${ach.id}', true)"`;

    return `
        <div ${onClick} class="${cardBg} border rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 transform ${isUnlocked ? 'hover:-translate-y-1 hover:shadow-xl cursor-pointer' : 'hover:-translate-y-0.5 hover:bg-[#2f3136]/40 cursor-pointer'} group relative overflow-hidden h-full">
            
            ${isUnlocked ? `<div class="absolute -top-10 -right-10 w-20 h-20 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-colors"></div>` : ''}

            ${isUnlocked ? `<div class="absolute top-2 right-2 text-xs font-mono text-gray-500 font-bold">${dateStr}</div>` : `<div class="absolute top-2 right-2 text-xs ${padlockColor}"><i class="fas fa-lock"></i></div>`}

            <div class="${iconContainer} w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 transition-transform ${isUnlocked ? 'group-hover:scale-110' : 'group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100'}">
                ${ach.icon}
            </div>
            
            <h3 class="${titleColor} mb-2 line-clamp-2">${ach.title}</h3>
            
            <p class="text-xs ${descColor} mt-auto line-clamp-3">
                ${ach.description}
            </p>
            
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px] z-20">
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
    
    try {
        if (unlock) {
            if (typeof window.triggerConfetti === 'function') {
                window.triggerConfetti();
            }
            
            const { error } = await safeInsert('achievements', [{
                id: id,
                user_id: state.currentUser.id,
                unlocked_at: new Date().toISOString()
            }]);

            if (error) throw error;
        } else {
            const { error } = await safeDelete('achievements', id);
            if (error) throw error;
        }
    } catch (err) {
        console.error("Chyba při změně achievementu:", err);
        window.showNotification("Nepodařilo se uložit změnu.", "error");
    }

    // Refresh dat proběhne buď přes Realtime, nebo ho zde pro jistotu vynutíme
    // fetchUnlockedAchievements() už neexistuje, fetchujeme rovnou celé
    const { data } = await supabase.from('achievements').select('*');
    if (data) {
        state.achievements = data;
        saveStateToCache();
        renderCategories();
    }
}

// --- REALTIME ---

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('achievements-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'achievements' },
            async () => {
                // Refresh globálního state a UI při jakékoliv změně (i od druhého uživatele)
                const { data } = await supabase.from('achievements').select('*');
                if (data) {
                    state.achievements = data;
                    renderCategories();
                }
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
    if (state.achievements.some(u => u.id === id)) return;

    // Ještě pro jistotu fetch ze Supabase (přece jen to mohl odemknout druhý)
    const { data } = await supabase.from('achievements').select('id').eq('id', id).maybeSingle();
    if (data) {
        // Pokud tam je, ale nebyl v state, updatneme state
        const { data: allData } = await supabase.from('achievements').select('*');
        if (allData) state.achievements = allData;
        return; 
    }

    // Můžeme odemknout!
    triggerHaptic('success');
    if (typeof window.triggerConfetti === 'function') {
        window.triggerConfetti();
    }
    
    const achievementObj = state.achievementDefinitions.find(a => a.id === id);
    if (achievementObj) {
        // Notifikace pro uživatele (pokud UI běží)
        window.dispatchEvent(new CustomEvent('notification', { 
            detail: { message: `🏆 Odznáček odemčen: ${achievementObj.title}!`, type: "success" } 
        }));
    }

    const { error } = await safeInsert('achievements', [{
        id: id,
        user_id: state.currentUser.id,
        unlocked_at: new Date().toISOString()
    }]);

    if (error) {
         console.error("Chyba auto-unlock:", error);
    } else {
         const { data: allData } = await supabase.from('achievements').select('*');
         if (allData) {
             state.achievements = allData;
             saveStateToCache();
             renderCategories();
         }
    }
}

// Hook zavolaný z calendar.js:saveHealthRecord
export async function checkHealthAchievements(currentDateKey, healthData, healthDataMap = {}) {
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
    if (healthData.sleep >= 7 && healthDataMap) {
        // Zkusíme najít 6 předchozích dní a zkontrolovat jejich spánek
        const d = new Date(currentDateKey);
        let consecutiveGoodSleep = 1; // Dnešek už víme, že má 7+

        for (let i = 1; i < 7; i++) {
            d.setDate(d.getDate() - 1);
            const pastKey = d.toISOString().split('T')[0];
            const pastData = healthDataMap[pastKey];

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

export function showAddAchievementModal() {
    const modal = document.createElement('div');
    modal.id = 'add-achievement-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in text-left';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="bg-[#2f3136] border border-[#faa61a]/20 w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden">
            <div class="p-6">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <i class="fas fa-trophy text-[#faa61a]"></i> Nový Achievement
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">ID (unikátní, např. alps_trip)</label>
                        <input type="text" id="ach-id" class="w-full bg-[#202225] text-white p-2.5 rounded-xl border border-white/5 outline-none focus:border-[#faa61a] transition" placeholder="alps_trip">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Název</label>
                        <input type="text" id="ach-title" class="w-full bg-[#202225] text-white p-2.5 rounded-xl border border-white/5 outline-none focus:border-[#faa61a] transition" placeholder="Alpský dobyvatel">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kategorie</label>
                        <select id="ach-category" class="w-full bg-[#202225] text-white p-2.5 rounded-xl border border-white/5 outline-none focus:border-[#faa61a] transition">
                            ${state.achievementCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Popis</label>
                        <textarea id="ach-desc" rows="2" class="w-full bg-[#202225] text-white p-2.5 rounded-xl border border-white/5 outline-none focus:border-[#faa61a] transition resize-none"></textarea>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ikona (Emoji)</label>
                        <input type="text" id="ach-icon" class="w-full bg-[#202225] text-white p-2.5 rounded-xl border border-white/5 outline-none focus:border-[#faa61a] transition text-center" placeholder="🏔️">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Barva (Tailwind gradient)</label>
                        <input type="text" id="ach-color" class="w-full bg-[#202225] text-white p-2.5 rounded-xl border border-white/5 outline-none focus:border-[#faa61a] transition" value="from-amber-200 to-yellow-500">
                    </div>
                </div>
                <button onclick="window.Achievements.saveNewAchievement()" class="w-full mt-6 bg-[#faa61a] hover:bg-[#e09216] text-black font-black py-3 rounded-xl shadow-lg transition transform hover:scale-[1.02] active:scale-95">
                    Vytvořit milník
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

export async function saveNewAchievement() {
    const id = document.getElementById('ach-id').value.trim();
    const title = document.getElementById('ach-title').value.trim();
    const category = document.getElementById('ach-category').value;
    const description = document.getElementById('ach-desc').value.trim();
    const icon = document.getElementById('ach-icon').value.trim() || '🏆';
    const color = document.getElementById('ach-color').value.trim();

    if (!id || !title) {
        if (window.showNotification) window.showNotification("ID a Název jsou povinné!", "error");
        return;
    }

    // Pozitivní kontrola na frontendu předem
    if (state.achievementDefinitions.some(a => a.id === id)) {
        if (window.showNotification) window.showNotification(`ID "${id}" už existuje! Zvol prosím jiné.`, "error");
        return;
    }

    try {
        const { data, error } = await safeInsert('achievement_definitions', [{
            id, category, title, description, icon, color
        }]);

        if (error) throw error;

        if (data && data[0]) {
            state.achievementDefinitions.push(data[0]);
            if (window.showNotification) window.showNotification("Achievement vytvořen! 🏆", "success");
            document.getElementById('add-achievement-modal')?.remove();
            renderCategories();
        }
    } catch (err) {
        console.error("Failed to save achievement:", err);
        let errorMsg = "Chyba při ukládání.";
        
        if (err.code === '23505') {
            errorMsg = "ID musí být unikátní (toto ID už v databázi je).";
        } else if (err.message) {
            errorMsg = `Chyba: ${err.message}`;
        }
        
        if (window.showNotification) window.showNotification(errorMsg, "error");
    }

}
