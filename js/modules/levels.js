import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { changeTheme } from '../core/theme.js';

// --- CONFIGURATION ---
const XP_PER_LEVEL = 100; // Každých 100 XP je jeden level

const LEVEL_TITLES = {
    1: { name: "Mývalí začátečníci 🦝", color: "from-gray-400 to-gray-500" },
    2: { name: "Hledači pokladů 🔍", color: "from-blue-400 to-indigo-500" },
    3: { name: "Snoví parťáci ✨", color: "from-indigo-400 to-purple-500" },
    4: { name: "Bezpečný přístav ⚓", color: "from-cyan-400 to-blue-500" },
    5: { name: "Nerozlučná dvojka 🤝", color: "from-emerald-400 to-teal-500", theme: "forest" },
    7: { name: "Mistři harmonie 🧘", color: "from-orange-400 to-pink-500" },
    10: { name: "Legendární pár 🏆", color: "from-yellow-400 to-orange-500", theme: "gold" }
};

let currentXP = 0;
let currentLevel = 1;

export async function initLevels() {
    console.log("[Levels] Initializing system...");
    await updateRelationshipXP();
    
    // Poslech na změny v důležitých tabulkách pro Realtime XP update
    const channel = supabase.channel('levels-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'health_data' }, (payload) => {
            console.log("[Levels] Realtime update from health_data", payload);
            updateRelationshipXP();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bucket_list' }, (payload) => {
            console.log("[Levels] Realtime update from bucket_list", payload);
            updateRelationshipXP();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline' }, (payload) => {
            console.log("[Levels] Realtime update from timeline", payload);
            updateRelationshipXP();
        })
        .subscribe((status) => {
            console.log("[Levels] Subscription status:", status);
        });
}

export async function updateRelationshipXP() {
    try {
        // Krátký timeout pro jistotu, že DB stihla vše zprocesovat před RPC voláním
        await new Promise(res => setTimeout(res, 500));

        const { data, error } = await supabase.rpc('get_relationship_xp');
        if (error) throw error;

        const newXP = parseInt(data) || 0;
        const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;

        // Vizualizace změny (sidebar badge blikne)
        const badge = document.getElementById('sidebar-level-badge');
        if (badge && newXP !== currentXP) {
             badge.classList.add('ring-2', 'ring-[#faa61a]', 'scale-105');
             setTimeout(() => badge.classList.remove('ring-2', 'ring-[#faa61a]', 'scale-105'), 1000);
        }

        // Level Up oslava!
        if (newLevel > currentLevel && currentLevel !== 1) {
            triggerLevelUp(newLevel);
        }

        currentXP = newXP;
        currentLevel = newLevel;

        renderLevelUI();
    } catch (e) {
        console.error("[Levels] Error fetching XP:", e);
    }
}

function triggerLevelUp(level) {
    triggerConfetti();
    triggerHaptic('success');
    
    const titleInfo = getLevelTitle(level);
    
    // Automaticky aplikovat nové téma, pokud je odemčeno
    if (titleInfo.theme) {
        changeTheme(titleInfo.theme);
        window.dispatchEvent(new CustomEvent('notification', { 
            detail: { 
                message: `LEVEL UP! Odemčeno nové téma: ${titleInfo.theme.toUpperCase()}! 🎨`, 
                type: "success" 
            } 
        }));
    }

    // Zobrazit notifikaci o změně titulu
    window.dispatchEvent(new CustomEvent('notification', { 
        detail: { 
            message: `LEVEL UP! Nyní jste: ${titleInfo.name} 🎉`, 
            type: "success" 
        } 
    }));
}

function getLevelTitle(level) {
    const milestones = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
    const closestMilestone = milestones.find(m => m <= level) || 1;
    return LEVEL_TITLES[closestMilestone];
}

export function renderLevelUI() {
    // 1. Sidebar Badge
    renderSidebarLevel();
}

function renderSidebarLevel() {
    const titleInfo = getLevelTitle(currentLevel);
    // Sidebar profile section is the one at the bottom with name
    const sidebarProfile = document.querySelector('#sidebar-wrapper [onclick="toggleUserPopout()"]')?.parentElement;
    
    if (!sidebarProfile) return;

    // Najdeme nebo vytvoříme badge
    let badge = document.getElementById('sidebar-level-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'sidebar-level-badge';
        badge.className = 'mx-2 mb-2 px-3 py-2 rounded-xl bg-[#202225] border border-gray-700/50 flex flex-col gap-1 cursor-pointer transition-all hover:border-[#faa61a]/30';
        badge.onclick = () => toggleUserPopout();
        // Insert before the user popout trigger
        const trigger = sidebarProfile.querySelector('[onclick="toggleUserPopout()"]');
        sidebarProfile.insertBefore(badge, trigger);
    }

    const nextXP = currentLevel * XP_PER_LEVEL;
    const progressXP = currentXP % XP_PER_LEVEL;
    const percentage = Math.round((progressXP / XP_PER_LEVEL) * 100);

    badge.innerHTML = `
        <div class="flex justify-between items-center mb-1">
            <span class="text-[10px] font-black text-white uppercase tracking-wider">Level ${currentLevel}</span>
            <span class="text-[9px] text-[#faa61a] font-bold">${currentXP} XP</span>
        </div>
        <div class="w-full h-1.5 bg-[#2f3136] rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r ${titleInfo.color} transition-all duration-1000" style="width: ${percentage}%"></div>
        </div>
        <span class="text-[9px] text-gray-500 font-medium truncate italic mt-1 text-center">${titleInfo.name}</span>
    `;
    
    badge.title = `Do dalšího levelu zbývá ${XP_PER_LEVEL - progressXP} XP`;
}
