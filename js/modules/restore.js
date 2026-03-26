import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerConfetti } from '../core/utils.js';

export function renderRestoreData() {
    const container = document.getElementById('messages-container');
    container.innerHTML = `
        <div class="p-8 max-w-2xl mx-auto">
            <h1 class="text-3xl font-black text-white mb-4">Obnova Dat (Klárka)</h1>
            <p class="text-gray-400 mb-6">Tato sekce slouží k jednorázové obnově chybějících dat za leden a únor 2026 ze záložního JSON souboru.</p>
            
            <div class="bg-[#2f3136] p-6 rounded-2xl border border-white/5 space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-gray-300">Stav: Připraveno k importu</span>
                    <span id="restore-status" class="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-black">READY</span>
                </div>
                
                <button id="start-restore-btn" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-black py-3 rounded-lg transition transform active:scale-95">
                    SPUSTIT OBNOVU DAT
                </button>
                
                <div id="restore-log" class="text-[10px] font-mono text-gray-500 h-32 overflow-y-auto bg-black/20 p-2 rounded">
                    Zde se zobrazí průběh...
                </div>
            </div>
        </div>
    `;

    document.getElementById('start-restore-btn').onclick = startRestoration;
}

async function startRestoration() {
    const btn = document.getElementById('start-restore-btn');
    const logEl = document.getElementById('restore-log');
    const statusEl = document.getElementById('restore-status');
    
    const log = (msg) => {
        logEl.innerHTML += `<div>${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    };

    btn.disabled = true;
    btn.innerText = "IMPORTUJI...";
    statusEl.innerText = "IN PROGRESS";
    statusEl.className = "text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-black";

    try {
        log("Načítám exportní soubor...");
        const response = await fetch('/kiscord-export-2026-03-18.json');
        const exportData = await response.json();
        
        const klarka_id = '37de6e55-d7e2-4dc1-8e12-280bd043b0e7';
        const health = exportData.data.klarka_health;
        
        const mood_map = { 'happy': 9, 'ok': 7, 'tired': 4, 'sad': 3, 'angry': 2, null: 5 };
        const sleep_map = { 'good': 8, 'ok': 6, 'zombie': 3, null: 0 };

        log(`Nalezeno ${Object.keys(health).length} záznamů zdraví.`);
        
        let count = 0;
        for (const [date_key, data] of Object.entries(health)) {
            let mood = data.mood;
            if (typeof mood === 'string') mood = mood_map[mood] || 5;
            else if (mood === null) mood = 5;

            let sleep = data.sleep;
            if (typeof sleep === 'string') sleep = sleep_map[sleep] || 0;
            else if (sleep === null) sleep = 0;

            const { error } = await supabase.from('health_data').upsert({
                date_key,
                user_id: klarka_id,
                water: data.water || 0,
                sleep: sleep,
                mood: mood,
                movement: data.movement || [],
                bedtime: data.bedtime || ''
            });

            if (error) log(`CHYBA [${date_key}]: ${error.message}`);
            else if (count % 10 === 0) log(`Zpracováno: ${count}/${Object.keys(health).length}`);
            count++;
        }

        log("Obnova herních dat...");
        const klarka_tetris = exportData.data.klarka_tetris_score?.klarka || 0;
        await supabase.from('tetris_scores').upsert({ user_id: klarka_id, score: klarka_tetris });

        log("Obnova témat a záložek...");
        const topic_progress = exportData.data.klarka_topic_progress || {};
        for (const [cat, progress] of Object.entries(topic_progress)) {
            await supabase.from('topic_progress').upsert({ user_id: klarka_id, category: cat, completed_indices: progress });
        }

        const topic_bookmarks = exportData.data.klarka_topic_bookmarks || {};
        for (const [cat, bookmarks] of Object.entries(topic_bookmarks)) {
            await supabase.from('app_topic_bookmarks').upsert({ user_id: klarka_id, category: cat, bookmarked_indices: bookmarks });
        }

        log("HOTOVO! Data byla úspěšně nahrána.");
        statusEl.innerText = "SUCCESS";
        statusEl.className = "text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500 font-black";
        btn.innerText = "DOKONČENO";
        triggerConfetti();

    } catch (err) {
        log(`FATÁLNÍ CHYBA: ${err.message}`);
        statusEl.innerText = "ERROR";
        statusEl.className = "text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500 font-black";
        btn.disabled = false;
        btn.innerText = "Zkusit znovu";
    }
}
