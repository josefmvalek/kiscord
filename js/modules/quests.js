import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { safeInsert } from '../core/offline.js';
import { triggerHaptic } from '../core/utils.js';
import { isJosef } from '../core/auth.js';
import { renderModal, renderButton, renderInputGroup } from '../core/ui.js';
import { showNotification } from '../core/theme.js';

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
                            <button onclick="window.loadModule('quests').then(m => m.showAddQuestModal())" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-3 py-2 rounded-lg transition-all font-bold text-sm flex items-center gap-2">
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

        const [
            { data: waterData },
            { data: sleepData },
            { data: bucketData },
            { data: movementData },
            { data: moodData },
            { data: timelineData },
            { data: datesData },
            { data: sunlightData },
            { data: tetrisData },
            { data: questionsData },
            { data: definitionData }
        ] = await Promise.all([
            supabase.rpc('get_shared_water_stats', { month_prefix: monthPrefix }),
            supabase.rpc('get_shared_sleep_sync', { min_hours: 7, month_prefix: monthPrefix }),
            supabase.from('bucket_list').select('id', { count: 'exact' }).eq('is_completed', true),
            supabase.rpc('get_shared_movement_stats', { month_prefix: monthPrefix }),
            supabase.rpc('get_shared_mood_high_stats', { month_prefix: monthPrefix }),
            supabase.rpc('get_new_timeline_stats', { month_prefix: monthPrefix }),
            supabase.rpc('get_completed_dates_stats', { month_prefix: monthPrefix }),
            supabase.rpc('get_sunlight_sent_stats', { month_prefix: monthPrefix }),
            supabase.rpc('get_tetris_total_score'),
            supabase.rpc('get_daily_questions_stats', { month_prefix: monthPrefix }),
            supabase.from('coop_quests').select('*').eq('is_active', true)
        ]);

        if (definitionData) state.coopQuests = definitionData;

        questData = {
            sum_water: parseInt(waterData) || 0,
            both_sleep: parseInt(sleepData) || 0,
            count_bucket: bucketData?.count || 0,
            count_shared_movement: parseInt(movementData) || 0,
            count_shared_mood_high: parseInt(moodData) || 0,
            count_new_timeline: parseInt(timelineData) || 0,
            count_completed_dates: parseInt(datesData) || 0,
            count_sunlight_sent: parseInt(sunlightData) || 0,
            sum_tetris_score: parseInt(tetrisData) || 0,
            count_daily_questions: parseInt(questionsData) || 0
        };

        renderQuestCards();
        
        if (loader) loader.classList.add('hidden');
        if (grid) grid.classList.remove('hidden');

    } catch (e) {
        console.error("[Quests] Unexpected Fetch Error:", e);
        if (loader) loader.classList.add('hidden');
        if (grid) {
            grid.classList.remove('hidden');
            grid.innerHTML = window.renderErrorState({
                message: "Nepodařilo se mi spočítat vaše questy. Zkus to prosím znovu.",
                onRetry: "window.loadModule('quests').then(m => m.renderQuests())"
            });
        }
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
                    
                    <div class="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-gray-800/50">
                        <div class="h-full bg-gradient-to-r ${q.color} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                             style="width: ${percentage}%; min-width: ${percentage > 0 ? '4px' : '0'}">
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
    const modalContent = `
        <div class="space-y-4">
            ${renderInputGroup({ label: 'Název mise', id: 'q-title', placeholder: 'Např. Lovci zážitků' })}
            
            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest text-left">Popis (co musí Klárka udělat?)</label>
                <textarea id="q-desc" placeholder="Popiš úkol..." class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all min-h-[80px]"></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                ${renderInputGroup({ label: 'Ikona (emoji)', id: 'q-icon', placeholder: '🚀' })}
                ${renderInputGroup({ label: 'Cíl (číslo)', id: 'q-goal', type: 'number', placeholder: '5' })}
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                ${renderInputGroup({ label: 'Jednotka', id: 'q-unit', placeholder: 'položek' })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest text-left">Typ sledování</label>
                    <select id="q-type" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                        <optgroup label="Zdraví">
                            <option value="sum_water" selected>Voda (společně)</option>
                            <option value="both_sleep">Spánek (oba splněno)</option>
                            <option value="count_shared_movement">Společný pohyb (dny kdy oba)</option>
                            <option value="count_shared_mood_high">Vysoká nálada (oba 8+)</option>
                        </optgroup>
                        <optgroup label="Zážitky">
                            <option value="count_bucket">Bucket List (celkem)</option>
                            <option value="count_new_timeline">Timeline (nové záznamy)</option>
                            <option value="count_completed_dates">Plánovač (absolvovaná rande)</option>
                        </optgroup>
                        <optgroup label="Interakce">
                            <option value="count_sunlight_sent">Sluneční aura (odesláno)</option>
                            <option value="sum_tetris_score">Tetris (společné skóre)</option>
                            <option value="count_daily_questions">Denní otázky (odpovědi)</option>
                        </optgroup>
                    </select>
                </div>
            </div>
            
            ${renderInputGroup({ label: 'Barva (Tailwind Gradient)', id: 'q-color', value: 'from-orange-400 to-red-500', attr: 'style="font-family: monospace;"' })}
        </div>
    `;

    const modalActions = renderButton({
        text: 'VYTVOŘIT MISI ⚔️',
        onclick: "window.loadModule('quests').then(m => m.saveNewQuest())",
        className: 'w-full py-4 text-lg'
    });

    const modalHtml = renderModal({
        id: 'quest-admin-modal',
        title: 'Nová společná mise',
        subtitle: 'Vyhlášení nové výzvy',
        content: modalContent,
        actions: modalActions,
        onClose: "document.getElementById('quest-admin-modal').remove()"
    });
    
    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    const modalElement = container.firstElementChild;
    document.body.appendChild(modalElement);
    modalElement.classList.replace('hidden', 'flex');
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
        showNotification("Název a cíl jsou povinné!", "error");
        return;
    }
    
    triggerHaptic('success');
    
    try {
        const { error } = await safeInsert('coop_quests', [{
            id: crypto.randomUUID(),
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
        showNotification("Chyba při ukládání: " + err.message, "error");
    }
}

/**
 * TAILWIND v4 SAFELIST (Scanning trick)
 * Tyto třídy zde musí být vypsány staticky, aby je Tailwind scanner v4 zahrnul 
 * do výsledného CSS balíčku, i když se v kódu používají dynamicky.
 * 
 * BARVY:
 * from-orange-400 to-red-500
 * from-blue-400 to-blue-600
 * from-green-400 to-emerald-600
 * from-yellow-400 to-orange-500
 * from-purple-400 to-pink-500
 * from-indigo-400 to-purple-600
 * from-red-400 to-orange-600
 * from-sky-400 to-blue-500
 * from-emerald-400 to-teal-600
 * from-pink-400 to-rose-500
 * shadow-[0_0_15px_rgba(255,255,255,0.1)]
 */
