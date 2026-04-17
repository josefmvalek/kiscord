import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { showNotification } from '../core/theme.js';
import { triggerHaptic } from '../core/utils.js';

export async function renderGallery() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Loading state
    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center bg-[#202225] text-gray-400">
            <i class="fas fa-spinner fa-spin text-4xl mb-4 text-[#eb459e]"></i>
            <p>Otevírám Lednici...</p>
        </div>
    `;

    try {
        const { data: drawings, error } = await supabase
            .from('drawings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderGalleryContent(drawings);
    } catch (err) {
        console.error("Gallery load error:", err);
        showNotification("Nepodařilo se načíst galerii.", "error");
    }
}

function renderGalleryContent(drawings) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full flex flex-col bg-[#202225] animate-fade-in">
            <!-- Header -->
            <div class="p-6 bg-[#2f3136] border-b border-[#202225] flex items-center justify-between shadow-lg z-10">
                <div class="flex items-center gap-4">
                    <button onclick="window.loadModule('gameDraw').then(m => m.renderGameDraw())" class="w-10 h-10 flex items-center justify-center rounded-full bg-[#36393f] text-gray-400 hover:text-white hover:bg-[#4f545c] transition">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl font-black text-white flex items-center gap-3">
                            <i class="fas fa-snowflake text-[#00b0f4]"></i> Digitální Lednice
                        </h2>
                        <p class="text-gray-400 text-xs uppercase tracking-widest font-bold">Vaše společné vzpomínky a čmáranice</p>
                    </div>
                </div>
                <div class="text-gray-500 text-sm font-bold">
                    ${drawings.length} výkresů
                </div>
            </div>

            <!-- Grid -->
            <div class="flex-1 overflow-y-auto p-6 scrollbar-hide">
                ${drawings.length === 0 ? `
                    <div class="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                        <i class="fas fa-paint-brush text-6xl mb-4"></i>
                        <p class="text-xl">Lednice je zatím prázdná...</p>
                        <p class="text-sm">Běžte něco nakreslit!</p>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        ${drawings.map(d => `
                            <div class="group bg-[#2f3136] rounded-2xl overflow-hidden border border-[#202225] hover:border-[#eb459e]/50 transition-all duration-300 shadow-lg hover:shadow-[#eb459e]/10 flex flex-col">
                                <!-- Thumbnail -->
                                <div class="aspect-square bg-white relative overflow-hidden cursor-pointer" onclick="window.loadModule('drawGallery').then(m => m.viewFullImage('${d.thumbnail}', '${d.title.replace(/'/g, "\\'")}'))">
                                    <img src="${d.thumbnail}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500">
                                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <i class="fas fa-search-plus text-white text-3xl"></i>
                                    </div>
                                </div>
                                
                                <!-- Meta -->
                                <div class="p-4 flex flex-col gap-1">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-white font-bold truncate pr-2">${d.title || 'Bez názvu'}</h3>
                                        <button onclick="window.loadModule('drawGallery').then(m => m.deleteDrawing('${d.id}'))" class="text-gray-600 hover:text-red-400 p-1 transition">
                                            <i class="fas fa-trash-alt text-xs"></i>
                                        </button>
                                    </div>
                                    <div class="flex items-center justify-between mt-2">
                                        <span class="text-[10px] text-gray-500 font-bold uppercase">${new Date(d.created_at).toLocaleDateString('cs-CZ')}</span>
                                        <button onclick="window.loadModule('drawGallery').then(m => m.pinDrawing('${d.id}'))" class="text-[10px] px-2 py-0.5 bg-[#5865F2]/10 text-[#5865F2] rounded-full font-bold hover:bg-[#5865F2] hover:text-white transition" title="Připnout na Dashboard">
                                            PIN
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

export function viewFullImage(src, title) {
    const overlay = document.createElement('div');
    overlay.className = "fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in";
    overlay.onclick = () => overlay.remove();

    overlay.innerHTML = `
        <div class="absolute top-6 right-6 flex gap-4">
             <button class="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                <i class="fas fa-times text-xl"></i>
             </button>
        </div>
        <div class="max-w-4xl w-full h-full flex flex-col items-center justify-center gap-6" onclick="event.stopPropagation()">
            <img src="${src}" class="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg">
            <h2 class="text-2xl font-bold text-white text-center">${title}</h2>
        </div>
    `;

    document.body.appendChild(overlay);
}

export async function deleteDrawing(id) {
    if (!confirm("Opravdu chceš tento výkres smazat z Lednice?")) return;

    try {
        const { error } = await supabase.from('drawings').delete().eq('id', id);
        if (error) throw error;

        showNotification("Výkres smazán.", "success");
        triggerHaptic('light');
        renderGallery(); // Refresh
    } catch (err) {
        console.error("Delete error:", err);
        showNotification("Smazání se nezdařilo.", "error");
    }
}

export async function pinDrawing(id) {
    try {
        // Upsert first record only
        const { error } = await supabase.from('pinned_drawings').upsert({
            id: '00000000-0000-0000-0000-000000000001', // Fixed ID for the single global pin
            drawing_id: id,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;

        // Update local state for immediate feedback
        const { data: fullDrawing } = await supabase.from('drawings').select('*').eq('id', id).maybeSingle();
        state.pinnedDrawing = fullDrawing;

        showNotification("Výkres připnut na Dashboard! 📌", "success");
        triggerHaptic('success');
    } catch (err) {
        console.error("Pin error:", err);
        showNotification("Připnutí se nezdařilo.", "error");
    }
}
