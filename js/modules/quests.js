import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';

// --- QUEST DEFINITIONS ---
const COOP_QUESTS = [
    {
        id: 'water_shared',
        title: '💧 Vodní nádrže',
        desc: 'Vypijte společně 150 sklenic body za tento měsíc.',
        icon: '🌊',
        color: 'from-blue-400 to-cyan-500',
        goal: 150,
        unit: 'sklenic',
        type: 'sum_water'
    },
    {
        id: 'sleep_shared',
        title: '😴 Spánková harmonie',
        desc: 'Oba spěte aspoň 7 hodin ve stejnou noc (aspoň 5x za týden).',
        icon: '✨',
        color: 'from-indigo-500 to-purple-600',
        goal: 5,
        unit: 'nocí',
        type: 'both_sleep'
    },
    {
        id: 'bucket_shared',
        title: '🚀 Lovci zážitků',
        desc: 'Splňte společně 5 nových věcí z Bucket Listu.',
        icon: '🗺️',
        color: 'from-orange-400 to-red-500',
        goal: 5,
        unit: 'položek',
        type: 'count_bucket'
    }
];

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
                    <button id="refresh-quests" class="bg-[#4f545c] hover:bg-[#5d6269] text-white p-2 rounded-lg transition-colors">
                        <i class="fas fa-sync-alt"></i>
                    </button>
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
            water_shared: parseInt(waterData) || 0,
            sleep_shared: parseInt(sleepData) || 0,
            bucket_shared: bucketData ? bucketData.length : 0
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

    grid.innerHTML = COOP_QUESTS.map(q => {
        const progress = questData[q.id] || 0;
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
                        <p class="text-gray-400 text-xs leading-relaxed">${q.desc}</p>
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

let questsSubscription = null;

export function setupQuestsRealtime() {
    if (questsSubscription) return;

    questsSubscription = supabase
        .channel('quests-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'health_data' },
            () => {
                fetchQuestProgress();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bucket_list' },
            () => {
                fetchQuestProgress();
            }
        )
        .subscribe();
}

export function cleanupQuestsRealtime() {
    if (questsSubscription) {
        supabase.removeChannel(questsSubscription);
        questsSubscription = null;
    }
}
