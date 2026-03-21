import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { isJosef } from '../core/auth.js';

// Quests are now fetched from state.coopQuests (Supabase)

let questData = {};

export async function renderQuests() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col h-full bg-[#36393f] overflow-hidden animate-fade-in">
            <div class="bg-[#2f3136] shadow-sm z-10 flex-shrink-0 border-b border-[#202225]">
                <div class="px-6 py-4 flex justify-between items-center max-w-5xl mx-auto w-full">
                    <h2 class="text-2xl font-black text-white flex items-center gap-3">
                        <span class="bg-[#faa61a] p-2 rounded-lg shadow-lg">⚔️</span>
                        Společné Questy
                    </h2>
                    <div class="flex gap-2">
                        ${isJosef(state.currentUser) ? `
                            <button onclick="import('./js/modules/quests.js').then(m => m.showAddQuestModal())" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-3 py-2 rounded-lg transition-all font-bold text-sm flex items-center gap-2">
                                <i class="fas fa-plus"></i> Nová mise
                            </button>
                        ` : ''}
                        <button id="refresh-quests" class="bg-[#4f545c] hover:bg-[#5d6269] text-white p-2 rounded-lg transition-colors">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div id="quests-loader" class="flex flex-col items-center justify-center py-20">
                    <div class="w-12 h-12 border-4 border-[#faa61a] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p class="text-gray-400 font-bold animate-pulse">Sčítám vaše úsilí...</p>
                </div>
                <div id="quests-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto hidden">
                    <!-- Quests go here -->
                </div>
            </div>
        </div>
    `;

    document.getElementById('refresh-quests')?.addEventListener('click', () => {
        triggerHaptic('light');
        fetchQuestProgress();
    });

    await fetchQuestProgress();

    // Hidden debug info
    const debugEl = document.createElement('div');
    debugEl.id = 'quests-debug-info';
    debugEl.className = 'hidden';
    debugEl.innerHTML = `<pre class="text-[10px] text-gray-500 p-4">${JSON.stringify({ user: state.currentUser, questData }, null, 2)}</pre>`;
    container.appendChild(debugEl);
}

async function fetchQuestProgress() {
    const loader = document.getElementById('quests-loader');
    const grid = document.getElementById('quests-grid');

    try {
        const d = new Date();
        const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        console.log(`[Quests] Fetching for prefix: ${monthPrefix}`);

        // 1. Voda (suma pro tento měsíc)
        const { data: waterData, error: wErr } = await supabase.rpc('get_shared_water_stats', { month_prefix: monthPrefix });
        if (wErr) console.error("[Quests] Water RPC Error:", wErr);
        
        // 2. Spánek (dny kdy oba 7+)
        const { data: sleepData, error: sErr } = await supabase.rpc('get_shared_sleep_sync', { min_hours: 7, month_prefix: monthPrefix });
        if (sErr) console.error("[Quests] Sleep RPC Error:", sErr);

        // 3. Bucket (splněné)
        const { data: bucketData, error: bErr } = await supabase.from('bucket_list').select('id').eq('is_completed', true);
        if (bErr) console.error("[Quests] Bucket Fetch Error:", bErr);

        console.log(`[Quests] Received data:`, { waterData, sleepData, bucketCount: bucketData?.length });

        questData = {
            sum_water: parseInt(waterData) || 0,
            both_sleep: parseInt(sleepData) || 0,
            count_bucket: bucketData ? bucketData.length : 0
        };

        renderQuestCards();
        
        const debugEl = document.getElementById('quests-debug-info');
        if (debugEl) debugEl.innerHTML = `<pre class="text-[10px] text-gray-500 p-4">${JSON.stringify({ user: state.currentUser, questData }, null, 2)}</pre>`;

        if (loader) loader.classList.add('hidden');
        if (grid) grid.classList.remove('hidden');

    } catch (e) {
        console.error("[Quests] Unexpected Fetch Error:", e);
        renderQuestCards();
        if (loader) loader.classList.add('hidden');
        if (grid) grid.classList.remove('hidden');
    }
}

function renderQuestCards() {
    const grid = document.getElementById('quests-grid');
    if (!grid) return;

    if (!state.coopQuests || state.coopQuests.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center opacity-50">
                <i class="fas fa-scroll text-5xl mb-4"></i>
                <p>Zatím žádné aktivní mise.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = state.coopQuests.map(q => {
        const progress = questData[q.type] || 0;
        const percentage = Math.min(Math.round((progress / q.goal) * 100), 100);
        const isDone = progress >= q.goal;

        return `
            <div class="bg-[#2f3136] rounded-2xl border border-gray-700/50 p-6 shadow-xl relative overflow-hidden group transition-all hover:border-[#faa61a]/30">
                ${isDone ? `<div class="absolute -top-2 -right-2 bg-[#faa61a] text-white text-[10px] font-black px-4 py-1 rotate-12 shadow-lg z-20">DOKONČENO!</div>` : ''}
                
                <div class="flex items-start gap-4 mb-6">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${q.color} flex items-center justify-center text-3xl shadow-lg transform group-hover:scale-110 transition-transform">
                        ${q.icon}
                    </div>
                    <div class="flex-1">
                        <h3 class="text-white font-black text-lg mb-1">${q.title}</h3>
                        <p class="text-gray-400 text-xs leading-relaxed">${q.description || q.desc}</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex justify-between items-end">
                        <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pokrok</span>
                        <span class="text-white font-bold text-sm">${progress} / ${q.goal} ${q.unit}</span>
                    </div>
                    
                    <div class="w-full h-3 bg-[#202225] rounded-full overflow-hidden border border-gray-800">
                        <div class="h-full bg-gradient-to-r ${q.color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(250,166,26,0.2)]"
                             style="width: ${percentage}%">
                        </div>
                    </div>

                    <p class="text-[9px] text-center text-gray-500 font-bold uppercase tracking-tighter">
                        ${isDone ? '🏆 Skvělá práce, mývale a sovo!' : `${percentage}% splněno`}
                    </p>
                </div>
            </div>
        `;
    }).join("");
}

let questsListenersSet = false;

export function setupQuestsRealtime() {
    if (questsListenersSet) return;

    const refreshCallback = () => {
        if (state.currentChannel === 'quests') {
            fetchQuestProgress();
        }
    };

    window.addEventListener('quests-updated', refreshCallback);
    window.addEventListener('health-updated', refreshCallback);

    questsListenersSet = true;
}

export function cleanupQuestsRealtime() {
    // Listeners are usually persistent, but we could remove them if needed
}

// --- ADMIN UI ---

export function showAddQuestModal() {
    const modal = document.createElement('div');
    modal.id = 'quest-admin-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-[#36393f] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-6 border-b border-gray-700 flex justify-between items-center">
                <h3 class="text-xl font-black text-white tracking-widest uppercase">Nová společná mise ⚔️</h3>
                <button onclick="this.closest('#quest-admin-modal').remove()" class="text-gray-400 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Název mise</label>
                    <input type="text" id="q-title" placeholder="Např. Lovci zážitků" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#faa61a] outline-none transition">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Popis (co musí Klárka udělat?)</label>
                    <textarea id="q-desc" placeholder="Popiš úkol..." class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#faa61a] outline-none transition min-h-[80px]"></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Ikona (emoji)</label>
                        <input type="text" id="q-icon" placeholder="🚀" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#faa61a] outline-none transition">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Cíl (číslo)</label>
                        <input type="number" id="q-goal" placeholder="5" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#faa61a] outline-none transition">
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Jednotka</label>
                        <input type="text" id="q-unit" placeholder="položek" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#faa61a] outline-none transition">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Typ sledování</label>
                        <select id="q-type" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#faa61a] outline-none transition">
                            <option value="sum_water" selected>Voda (společně)</option>
                            <option value="both_sleep">Spánek (oba splněno)</option>
                            <option value="count_bucket">Bucket List (splněné)</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Barva (Tailwind Gradient)</label>
                    <input type="text" id="q-color" value="from-orange-400 to-red-500" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-transparent focus:border-[#faa61a] outline-none transition font-mono text-xs">
                    <p class="text-[9px] text-gray-500 mt-1">from-{color}-{weight} to-{color}-{weight}</p>
                </div>
            </div>
            
            <div class="p-6 bg-[#2f3136] border-t border-gray-700">
                <button onclick="import('./js/modules/quests.js').then(m => m.saveNewQuest())" class="w-full bg-[#3ba55c] hover:bg-[#2d7d46] text-white py-4 rounded-xl font-black text-lg transition shadow-xl transform active:scale-95">
                    VYTVOŘIT MISI ⚔️
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export async function saveNewQuest() {
    const title = document.getElementById('q-title').value.trim();
    const description = document.getElementById('q-desc').value.trim();
    const icon = document.getElementById('q-icon').value.trim();
    const goal = parseInt(document.getElementById('q-goal').value);
    const unit = document.getElementById('q-unit').value.trim();
    const type = document.getElementById('q-type').value;
    const color = document.getElementById('q-color').value.trim();
    
    if (!title || !goal) {
        alert("Název a cíl jsou povinné!");
        return;
    }
    
    triggerHaptic('success');
    
    try {
        const { error } = await supabase.from('coop_quests').insert([{
            title, description, icon, goal, unit, type, color
        }]);
        
        if (error) throw error;
        
        // Refresh state
        const { data } = await supabase.from('coop_quests').select('*').eq('is_active', true);
        if (data) state.coopQuests = data;
        
        // Close modal
        document.getElementById('quest-admin-modal')?.remove();
        
        // Toast
        if (window.showNotification) window.showNotification("Nová mise byla vyhlášena! ⚔️", "success");
        
        // Re-render
        renderQuests();
        
    } catch (err) {
        console.error("Save Quest Error:", err);
        alert("Chyba při ukládání: " + err.message);
    }
}
