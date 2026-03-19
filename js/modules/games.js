
import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { supabase } from '../core/supabase.js';

// --- TETRIS TRACKER ---

export function getTetrisScore() {
    return state.tetris || { jose: 0, klarka: 0 };
}

export async function updateTetrisScore(who, amount) {
    if (who === 'reset') {
        const ok = await window.showConfirmDialog('Opravdu resetovat skóre?', 'Resetovat', 'Zrušit');
        if (!ok) return;
        state.tetris.jose = 0;
        state.tetris.klarka = 0;
        
        // Save both resets to Supabase
        await Promise.all([
            supabase.from('tetris_scores').upsert({ user_id: '00000000-0000-0000-0000-000000000001', score: 0 }),
            supabase.from('tetris_scores').upsert({ user_id: '00000000-0000-0000-0000-000000000002', score: 0 })
        ]);
    } else {
        const key = who === 'jose' ? 'jose' : 'klarka';
        state.tetris[key] += amount;

        if (amount > 0) {
            if (typeof triggerHaptic === 'function') triggerHaptic('success');
            // window.triggerConfetti() removed for performance
            if (window.showNotification) window.showNotification(`${who === 'jose' ? 'Jožka' : 'Klárka'} vyhrává bod! 🧱`, 'success');
        }

        // Save to Supabase
        try {
            const targetUserId = who === 'jose' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002';
            await supabase.from('tetris_scores').upsert({
                user_id: targetUserId,
                score: state.tetris[key],
                updated_at: new Date().toISOString()
            });
        } catch (err) {
            console.error("Failed to save tetris score", err);
        }
    }

    // Re-render
    if (state.currentChannel === 'dashboard') {
        if (window.renderDashboard) window.renderDashboard();
    } else if (state.currentChannel === 'tetris' || state.currentChannel === 'games') {
        renderTetrisTracker();
    }
}

export function renderTetrisTracker() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const score = getTetrisScore();
    const leader = score.jose > score.klarka ? 'Jožka' : (score.jose < score.klarka ? 'Klárka' : 'Remíza');
    const leaderColor = score.jose > score.klarka ? 'text-[#5865F2]' : score.jose < score.klarka ? 'text-[#eb459e]' : 'text-gray-400';

    const isJose = state.currentUser.name === 'Jožka';
    const currKey = isJose ? 'jose' : 'klarka';
    const partKey = isJose ? 'klarka' : 'jose';
    const currName = isJose ? 'Jožka' : 'Klárka';
    const partName = isJose ? 'Klárka' : 'Jožka';
    const currEmoji = isJose ? '🦝' : '🐸';
    const partEmoji = isJose ? '🐸' : '🦝';
    const currColor = isJose ? '#5865F2' : '#eb459e';
    const partColor = isJose ? '#eb459e' : '#5865F2';

    container.innerHTML = `
    <div class="p-4 max-w-lg mx-auto space-y-6 animate-fade-in pb-24 pt-8">
       
       <div class="text-center mb-8">
          <h1 class="text-4xl font-black text-white mb-2 tracking-tight" style="font-family: 'Press Start 2P', cursive; text-shadow: 4px 4px #000;">TETRIS ARÉNA</h1>
          <p class="text-gray-400 text-sm font-bold uppercase tracking-widest">Nekonečná válka o čest</p>
       </div>

       <div class="bg-[#2f3136] rounded-xl shadow-2xl border border-[#202225] overflow-hidden relative">
            <div class="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

            <div class="p-8 relative z-10">
                <div class="flex items-center justify-between gap-6 mb-8">
                   <!-- ME -->
                   <div class="flex-1 flex flex-col items-center group">
                       <div class="w-24 h-24 rounded-full bg-[#5865F2]/10 flex items-center justify-center border-4 border-[#5865F2] mb-4 relative cursor-pointer transition transform active:scale-95 hover:shadow-[0_0_20px_rgba(88,101,242,0.5)]" 
                            onclick="import('./js/modules/games.js').then(m => m.updateTetrisScore('${currKey}', 1))">
                           <div class="text-6xl">${currEmoji}</div>
                           <div class="absolute -bottom-2 -right-2 bg-[#5865F2] w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold shadow-md group-hover:scale-110 transition">+1</div>
                       </div>
                       <div class="text-lg font-bold text-gray-300 mb-1">Ty (${currName})</div>
                       <div class="text-5xl font-black text-[#5865F2] tracking-tighter filter drop-shadow-lg" id="score-${currKey}">${score[currKey]}</div>
                   </div>

                   <!-- VS -->
                   <div class="flex flex-col items-center opacity-30">
                       <div class="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">VS</div>
                       <div class="h-24 w-1 bg-white rounded-full"></div>
                   </div>

                   <!-- PARTNER -->
                   <div class="flex-1 flex flex-col items-center group">
                       <div class="w-24 h-24 rounded-full bg-[#eb459e]/10 flex items-center justify-center border-4 border-[#eb459e] mb-4 relative cursor-pointer transition transform active:scale-95 hover:shadow-[0_0_20px_rgba(235,69,158,0.5)]" 
                            onclick="import('./js/modules/games.js').then(m => m.updateTetrisScore('${partKey}', 1))">
                           <div class="text-6xl">${partEmoji}</div>
                           <div class="absolute -bottom-2 -left-2 bg-[#eb459e] w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold shadow-md group-hover:scale-110 transition">+1</div>
                       </div>
                       <div class="text-lg font-bold text-gray-300 mb-1">${partName}</div>
                       <div class="text-5xl font-black text-[#eb459e] tracking-tighter filter drop-shadow-lg" id="score-${partKey}">${score[partKey]}</div>
                   </div>
                </div>

               <div class="bg-[#202225]/80 backdrop-blur rounded-xl p-4 flex items-center justify-between border border-gray-700">
                   <div class="flex flex-col">
                       <span class="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Aktuální lídr</span>
                       <span id="tetris-leader-text" class="text-xl font-bold ${leaderColor}">${leader}</span>
                   </div>
                   <button onclick="import('./js/modules/games.js').then(m => m.updateTetrisScore('reset'))" class="text-xs bg-[#2f3136] hover:bg-red-500/20 text-gray-500 hover:text-red-400 border border-gray-600 hover:border-red-500/50 px-4 py-2 rounded transition uppercase font-bold">
                       Reset
                   </button>
               </div>
            </div>
       </div>

       <button onclick="window.switchChannel('dashboard')" class="w-full py-4 rounded-xl border border-[#202225] bg-[#2f3136] text-gray-400 hover:text-white hover:bg-[#36393f] transition font-bold text-sm uppercase tracking-wider">
            <i class="fas fa-arrow-left mr-2"></i> Zpět na dashboard
       </button>
    </div>
  `;
}

// --- PUZZLE GAME ---

export function renderPuzzleGame(selectedImage = null) {
    if (state.puzzleInstance) {
        // state.puzzleInstance.destroy(); // Assuming destroy method exists
        // state.puzzleInstance = null;
        // Puzzle logic is complex variable in global scope from script.js, we need to replicate class or assume it's global
        // In script.js: state.puzzleInstance = new PuzzleGame(...)
        // PuzzleGame is likely defined in puzzle.js (external script) or we need to import it.
        // The code loads 'puzzle.js' dynamically.
    }

    const container = document.getElementById("messages-container");
    if (!container) return;

    let puzzleImages = [
        { src: "img/puzzle/puzzle_myval_sova_foto.jpg", name: "Sova & Mýval (Originál)" },
        { src: "img/puzzle/puzzle_myval_zaba_kreslene.jpg", name: "Žabák & Kamarádi (Kreslené)" },
        { src: "img/puzzle/crazy_fight_sova_myval.jpg", name: "Crazy Fight" },
        { src: "img/puzzle/myval_zaba_ai.jpg", name: "AI Art: Mýval & Žába" },
        { src: "img/puzzle/myval_zaba_medvidek.jpg", name: "Trio: Mýval, Žába, Medvídek" }
    ];

    // Add user photos from timeline
    if (state.timelineEvents) {
        state.timelineEvents.forEach(event => {
            if (event.images && event.images.length > 0) {
                event.images.forEach(img => {
                    puzzleImages.push({ src: img, name: event.title });
                });
            }
        });
    }

    const currentImageSrc = selectedImage || puzzleImages[0].src;

    const galleryHtml = puzzleImages.map(img =>
        `<div onclick="import('./js/modules/games.js').then(m => m.renderPuzzleGame('${img.src}'))" 
            class="cursor-pointer border-2 ${img.src === currentImageSrc ? 'border-[#ff69b4]' : 'border-transparent'} rounded overflow-hidden hover:scale-105 transition">
          <img src="${img.src}" class="w-16 h-16 object-cover opacity-80 hover:opacity-100">
       </div>`
    ).join('');

    container.innerHTML = `
      <div class="flex flex-col h-full bg-[#202225] p-4 items-center justify-center overflow-hidden relative">
          <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/hearts.png')] opacity-10 pointer-events-none"></div>
          
          <div class="z-10 text-center mb-2">
              <h1 class="text-3xl font-black text-[#ff69b4] drop-shadow-lg" style="font-family: 'Comic Sans MS', cursive">Puzzle 🧩</h1>
              <p class="text-[#fab1c6] text-sm font-bold">Vyber si fotku a poskládej ji!</p>
          </div>

          <div class="flex gap-2 mb-4 overflow-x-auto max-w-full p-2 bg-black/30 rounded-xl backdrop-blur-sm z-20 custom-scrollbar">
              ${galleryHtml}
          </div>

          <div id="puzzle-container" class="relative bg-black/50 p-2 rounded-xl shadow-2xl border-4 border-[#ff69b4] mb-4"></div>

          <div class="flex gap-8 text-white font-mono text-xl bg-black/30 p-4 rounded-xl backdrop-blur-sm border border-[#ff69b4]/30">
              <div class="flex flex-col items-center">
                  <span class="text-xs text-[#ff69b4] uppercase font-bold">Čas</span>
                  <span id="puzzle-timer">0:00</span>
              </div>
              <div class="flex flex-col items-center">
                  <span class="text-xs text-[#ff69b4] uppercase font-bold">tahy</span>
                  <span id="puzzle-moves">0</span>
              </div>
          </div>
          
          <div class="mt-4 flex gap-4">
             <button onclick="import('./js/modules/games.js').then(m => m.renderPuzzleGame('${currentImageSrc}'))" class="bg-[#ff1493] hover:bg-[#ff0080] text-white px-6 py-2 rounded-full font-bold shadow-lg transition transform hover:scale-105">
                 Restartovat 🔄
             </button>
             <button onclick="window.switchChannel('dashboard')" class="bg-[#2f3136] hover:bg-[#40444b] text-gray-300 px-6 py-2 rounded-full font-bold transition">
                 Zpět
             </button>
          </div>
      </div>
  `;

    // Dynamic Load of Puzzle Engine
    if (typeof PuzzleGame === 'undefined') {
        const script = document.createElement('script');
        script.src = 'puzzle.js'; // Assuming this file exists in root or js/
        script.onload = () => {
            // Assuming PuzzleGame is global class
            state.puzzleInstance = new PuzzleGame('puzzle-container', currentImageSrc, 3);
        };
        document.body.appendChild(script);
    } else {
        state.puzzleInstance = new PuzzleGame('puzzle-container', currentImageSrc, 3);
    }
}
