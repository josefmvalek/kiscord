
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
            supabase.from('tetris_scores').upsert({ user_id: state.tetris.jose_id, score: 0 }),
            supabase.from('tetris_scores').upsert({ user_id: state.tetris.klarka_id, score: 0 })
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
            const targetUserId = who === 'jose' ? state.tetris.jose_id : state.tetris.klarka_id;
            if (!targetUserId) {
                console.error("Missing target user ID for score update");
                return;
            }
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
    if (state.puzzleInstance && typeof state.puzzleInstance.destroy === 'function') {
        state.puzzleInstance.destroy();
        state.puzzleInstance = null;
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
                    if (!puzzleImages.find(p => p.src === img)) {
                        puzzleImages.push({ src: img, name: event.title, isTimeline: true });
                    }
                });
            }
        });
    }

    // Add images from Database
    if (state.dbPuzzleImages) {
        state.dbPuzzleImages.forEach(dbImg => {
            const existingIndex = puzzleImages.findIndex(p => p.src === dbImg.src);
            if (existingIndex !== -1) {
                // If it's already there (e.g. hardcoded), but we have it in DB, 
                // we mark it as deletable if it's the same DB entry.
                puzzleImages[existingIndex].id = dbImg.id;
                puzzleImages[existingIndex].isDeletable = true;
            } else {
                puzzleImages.push(dbImg);
            }
        });
    }

    const currentImageSrc = selectedImage || (puzzleImages.length > 0 ? puzzleImages[0].src : "img/puzzle/puzzle_myval_sova_foto.jpg");

    const galleryHtml = puzzleImages.map(img =>
        `<div onclick="import('./js/modules/games.js').then(m => m.renderPuzzleGame('${img.src}'))" 
            class="flex-shrink-0 cursor-pointer border-2 ${img.src === currentImageSrc ? 'border-[#ff69b4]' : 'border-transparent'} rounded overflow-hidden hover:scale-105 transition w-16 h-16 bg-black/20">
          <img src="${img.src}" class="w-full h-full object-cover opacity-80 hover:opacity-100" onerror="this.parentElement.style.display='none'">
       </div>`
    ).join('');

    container.innerHTML = `
      <div class="flex flex-col h-full bg-[#202225] p-4 items-center justify-center overflow-hidden relative">
          <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/hearts.png')] opacity-10 pointer-events-none"></div>
          
          <div class="z-10 text-center mb-6">
              <h1 class="text-3xl font-black text-[#ff69b4] drop-shadow-lg" style="font-family: 'Comic Sans MS', cursive">Puzzle 🧩</h1>
              <p class="text-[#fab1c6] text-sm font-bold">Vyber si vzpomínku a poskládej ji!</p>
          </div>

          <div id="puzzle-container" class="relative bg-black/50 p-2 rounded-xl shadow-2xl border-4 border-[#ff69b4] mb-6"></div>

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
          
          <div class="mt-6 flex flex-wrap gap-4 justify-center">
             <button onclick="import('./js/modules/games.js').then(m => m.renderPuzzleGame('${currentImageSrc}'))" class="bg-[#ff1493] hover:bg-[#ff0080] text-white px-6 py-2.5 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2">
                 <i class="fas fa-undo"></i> Restart
             </button>
             <button onclick="import('./js/modules/games.js').then(m => m.showPuzzleGallery())" class="bg-[#ff69b4] hover:bg-[#ff1493] text-white px-6 py-2.5 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2">
                 <i class="fas fa-images"></i> Galerie
             </button>
             <button onclick="document.getElementById('puzzle-upload-input').click()" class="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full font-bold border border-white/20 transition flex items-center gap-2">
                 <i class="fas fa-upload"></i> Nahrát
             </button>
             <input type="file" id="puzzle-upload-input" class="hidden" accept="image/*" onchange="import('./js/modules/games.js').then(m => m.uploadPuzzleImage(this.files[0]))">
             <button onclick="window.switchChannel('dashboard')" class="bg-transparent hover:text-white text-gray-400 px-4 py-2.5 rounded-full font-bold transition">
                 Zpět
             </button>
          </div>
      </div>
  `;

    // Dynamic Load of Puzzle Engine
    const initPuzzle = () => {
        // Double check instance cleanup
        if (state.puzzleInstance && typeof state.puzzleInstance.destroy === 'function') {
            state.puzzleInstance.destroy();
        }
        state.puzzleInstance = new PuzzleGame('puzzle-container', currentImageSrc, 3);
    };

    if (typeof PuzzleGame === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/modules/puzzle.js';
        script.onload = initPuzzle;
        document.body.appendChild(script);
    } else {
        initPuzzle();
    }

    // Fetch extra images from DB if not already done recently
    if (!state.puzzleImagesFetched) {
        state.puzzleImagesFetched = true; // Mark early to avoid loops
        supabase.from('puzzle_images').select('*').then(({ data }) => {
            if (data && data.length > 0) {
                state.dbPuzzleImages = data.map(d => ({ id: d.id, src: d.url, name: d.name, isDeletable: true }));
                // re-render gallery if we found new ones
                renderPuzzleGame(selectedImage || currentImageSrc);
            }
        });
    }
}

export async function showPuzzleGallery() {
    let puzzleImages = [
        { src: "img/puzzle/puzzle_myval_sova_foto.jpg", name: "Sova & Mýval (Originál)" },
        { src: "img/puzzle/puzzle_myval_zaba_kreslene.jpg", name: "Žabák & Kamarádi (Kreslené)" },
        { src: "img/puzzle/crazy_fight_sova_myval.jpg", name: "Crazy Fight" },
        { src: "img/puzzle/myval_zaba_ai.jpg", name: "AI Art: Mýval & Žába" },
        { src: "img/puzzle/myval_zaba_medvidek.jpg", name: "Trio: Mýval, Žába, Medvídek" }
    ];

    if (state.timelineEvents) {
        state.timelineEvents.forEach(event => {
            if (event.images && event.images.length > 0) {
                event.images.forEach(img => {
                    puzzleImages.push({ src: img, name: event.title });
                });
            }
        });
    }

    if (state.dbPuzzleImages) {
        puzzleImages = [...puzzleImages, ...state.dbPuzzleImages];
    }

    const modalHtml = `
        <div id="puzzle-gallery-modal" class="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-[#2f3136] rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10 relative">
                <div class="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <h2 class="text-xl font-black text-white flex items-center gap-3">
                        <i class="fas fa-images text-[#ff69b4]"></i> Galerie Vzpomínek
                    </h2>
                    <button onclick="this.closest('#puzzle-gallery-modal').remove()" class="text-gray-400 hover:text-white text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="flex-1 overflow-y-auto custom-scrollbar puzzle-gallery-grid">
                    ${puzzleImages.map(img => `
                        <div class="puzzle-card relative cursor-pointer group" 
                             onclick="import('./js/modules/games.js').then(m => { m.renderPuzzleGame('${img.src}'); document.getElementById('puzzle-gallery-modal').remove(); })">
                             <img src="${img.src}" class="w-full h-full object-cover" onerror="this.parentElement.style.display='none'">
                             <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                                <span class="text-[10px] text-white font-bold truncate">${img.name || 'Vzpomínka'}</span>
                             </div>
                             ${img.isDeletable ? `
                                <button onclick="event.stopPropagation(); import('./js/modules/games.js').then(m => m.deletePuzzleImage('${img.id}', '${img.src}'))" 
                                        class="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 z-20" title="Smazat">
                                    <i class="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                    
                    <div onclick="document.getElementById('puzzle-upload-input').click()" 
                         class="puzzle-card border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#ff69b4] hover:border-[#ff69b4] transition bg-white/5 cursor-pointer">
                        <i class="fas fa-plus text-2xl"></i>
                        <span class="text-[10px] font-bold uppercase tracking-wider">Přidat</span>
                    </div>
                </div>

                <div class="p-4 bg-black/10 border-t border-white/5 text-center">
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kliknutím na obrázek začneš hru</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

export async function uploadPuzzleImage(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showNotification("Vyber prosím platný obrázek.", "error");
        return;
    }

    try {
        showNotification("Nahrávám obrázek... ⏳", "info");
        
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = `uploads/${fileName}`;

        // Upload to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('puzzle-images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: urlData } = supabase.storage
            .from('puzzle-images')
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Save to DB
        const { error: dbError } = await supabase.from('puzzle_images').insert({
            url: publicUrl,
            name: file.name.split('.')[0] || "Vlastní puzzle",
            created_by: state.currentUser.id
        });

        if (dbError) throw dbError;

        showNotification("Obrázek byl úspěšně nahrán! 🧩✨", "success");
        state.puzzleImagesFetched = false; // Trigger re-fetch
        renderPuzzleGame(publicUrl);
    } catch (err) {
        console.error("Error uploading puzzle image:", err);
        showNotification(`Chyba při nahrávání: ${err.message}`, "error");
    }
}

export async function deletePuzzleImage(id, url) {
    const ok = await window.showConfirmDialog("Opravdu chceš tuto fotku z galerie smazat?", "Smazat", "Zrušit");
    if (!ok) return;

    try {
        // 1. Delete from storage if it's a Supabase URL
        if (url.includes('puzzle-images') && url.includes('uploads/')) {
            const pathMatch = url.match(/uploads\/[^?]+/);
            if (pathMatch) {
                const filePath = pathMatch[0];
                await supabase.storage.from('puzzle-images').remove([filePath]);
            }
        }

        // 2. Delete from Database
        const { error } = await supabase.from('puzzle_images').delete().eq('id', id);
        if (error) throw error;

        showNotification("Obrázek byl smazán.", "success");
        state.puzzleImagesFetched = false;
        
        // Remove modal and re-render game (which will re-fetch)
        const modal = document.getElementById('puzzle-gallery-modal');
        if (modal) modal.remove();
        renderPuzzleGame();
    } catch (err) {
        console.error("Error deleting puzzle image:", err);
        showNotification("Chyba při mazání obrázku.", "error");
    }
}

export async function addPuzzleImage(url) {
    if (!url || !url.startsWith('http')) {
        showNotification("Zadej prosím platnou URL adresu obrázku.", "error");
        return;
    }

    try {
        const { error } = await supabase.from('puzzle_images').insert({
            url: url,
            name: "Vlastní puzzle",
            created_by: state.currentUser.id
        });

        if (error) throw error;

        showNotification("Obrázek byl přidán do galerie! 🧩", "success");
        state.puzzleImagesFetched = false; // Trigger re-fetch
        renderPuzzleGame(url);
    } catch (err) {
        console.error("Error adding puzzle image:", err);
        showNotification("Nepodařilo se přidat obrázek.", "error");
    }
}
