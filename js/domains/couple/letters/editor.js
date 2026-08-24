import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { playArcade } from '@core/sound.js';
import { awardLoveCoinsToCurrentUser } from '@core/state.js';

export function renderCompose() {
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + 1);
    const minDateStr = minDate.toISOString().slice(0, 16);

    return `<div class="bg-[#2f3136] rounded-2xl p-8 border border-white/5 animate-fade-in shadow-2xl">
        <h2 class="text-xl font-black text-white mb-8 flex items-center gap-3">
            <i class="fas fa-pencil-alt text-[#eb459e]"></i> Nový Vzkaz
        </h2>
        
        <div class="flex flex-col gap-8 max-w-2xl mx-auto">
            <!-- 1. Název dopisu -->
            <div>
                <label class="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">
                    Název dopisu
                </label>
                <input type="text" id="letter-title" placeholder="Ke tvému výročí..." 
                    class="w-full bg-[#202225] text-white text-sm p-4 rounded-xl border border-white/5 outline-none focus:border-[#eb459e]/50 transition placeholder-gray-700 shadow-inner">
            </div>

            <!-- 2. Tvé vyznání -->
            <div class="flex flex-col">
                <label class="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">
                    Tvé vyznání
                </label>
                <textarea id="letter-content" placeholder="Napiš něco od srdce..." 
                    class="w-full min-h-[250px] bg-[#202225] text-white text-base p-6 rounded-2xl border border-white/5 outline-none focus:border-[#eb459e]/50 transition resize-none placeholder-gray-700 leading-relaxed font-main shadow-inner"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- 3. Fotografie -->
                <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">
                        <i class="fas fa-camera text-[#eb459e] mr-2"></i> Fotografie (Volitelná)
                    </label>
                    <div class="flex items-center gap-4 bg-[#202225] p-3 rounded-xl border border-white/5">
                        <div id="letter-photo-preview-container" class="relative group">
                            <button onclick="document.getElementById('letter-photo-input').click()" 
                                class="relative w-16 h-16 bg-[#36393f] hover:bg-[#40444b] text-gray-500 hover:text-white rounded-xl flex items-center justify-center transition shadow-inner overflow-hidden border border-white/5 focus:border-[#eb459e] outline-none group/btn">
                                <i id="letter-photo-placeholder-icon" class="fas fa-image text-2xl transition-transform group-hover/btn:scale-110 ${pendingFile ? 'hidden' : ''}"></i>
                                <img id="letter-photo-preview-img" src="${pendingFile ? URL.createObjectURL(pendingFile) : ''}" 
                                     class="${pendingFile ? '' : 'hidden'} absolute inset-0 w-full h-full object-cover" />
                            </button>
                        </div>

                        <input type="file" id="letter-photo-input" class="hidden" accept="image/*" 
                            onchange="window.loadModule('letters').then(m => m.handlePhotoSelect(this))">
                        
                        <div id="letter-photo-preview-box" class="${pendingFile ? '' : 'hidden'} flex-1 flex flex-col min-w-0">
                            <span id="letter-photo-name" class="text-xs text-gray-300 font-bold truncate">${pendingFile ? pendingFile.name : ''}</span>
                            <span class="text-[10px] text-gray-600 italic leading-none mt-1">Snímek vybrán</span>
                        </div>

                        <div id="letter-photo-actions" class="${pendingFile ? '' : 'hidden'}">
                            <button onclick="window.loadModule('letters').then(m => m.removePhoto())" 
                                class="text-gray-500 hover:text-red-500 transition-all p-3 rounded-xl hover:bg-red-500/10">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 4. Čas odhalení -->
                <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">
                        <i class="fas fa-clock text-[#faa61a] mr-2"></i> Čas odhalení
                    </label>
                    <input type="datetime-local" id="letter-unlock" min="${minDateStr}"
                        class="w-full bg-[#202225] text-white text-sm p-4 rounded-xl border border-white/5 outline-none focus:border-[#faa61a]/50 transition shadow-inner">
                </div>
            </div>
        </div>

        <div class="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-white/5 max-w-2xl mx-auto">
            <button onclick="window.loadModule('letters').then(m => m.setView('inbox'))"
                class="px-8 py-3 rounded-xl text-gray-500 hover:text-white transition font-bold text-sm">
                Zrušit
            </button>
            <button onclick="window.loadModule('letters').then(m => m.sendLetter())"
                class="px-12 py-3 rounded-xl bg-[#eb459e] hover:bg-[#d63b8c] text-white font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#eb459e]/20 flex items-center gap-3">
                <i class="fas fa-paper-plane"></i> Odeslat dopis
            </button>
        </div>
    </div>`;
}


export async function sendLetter() {
    const title = document.getElementById('letter-title')?.value.trim();
    const content = document.getElementById('letter-content')?.value.trim();
    const unlockAt = document.getElementById('letter-unlock')?.value;

    if (!title || !content || !unlockAt) {
        if (window.showNotification) window.showNotification('Vyplň všechna pole!', 'error');
        return;
    }

    const btn = document.querySelector('button[onclick*="sendLetter"]');
    const originalBtnHTML = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i> Odesílám...';
        }

        let imageUrl = null;
        if (pendingFile) {
            // Confirming folder permission for letters in verified timeline-photos bucket
            imageUrl = await uploadFile('timeline-photos', pendingFile, 'letters');
            if (!imageUrl) {
                throw new Error("Soubor se nepodařilo uložit do 'timeline-photos'. Zkontroluj prosím připojení.");
            }
        }

        const { error } = await supabase.from('love_letters').insert({
            sender_id: state.currentUser.id,
            title,
            content,
            unlock_at: new Date(unlockAt).toISOString(),
            is_read: false,
            image_url: imageUrl
        });

        if (error) {
            console.error("[Letters] Database Insert Error:", error);
            throw new Error(`Chyba databáze: ${error.message}`);
        }

        // Achievement Hook: Letter Writer
        import('@domains/entertainment/achievements.js').then(m => m.autoUnlock('letter_writer'));

        // Award +5 Love Coins
        await awardLoveCoinsToCurrentUser(5, 'odeslání zamilovaného dopisu');

        import('@core/sound.js').then(m => m.playChime());
        triggerHaptic('success');
        if (window.showNotification) window.showNotification('Dopis odeslán! 💌', 'success');
        
        pendingFile = null; // Reset state
        currentView = 'sent';
        renderLetters();
    } catch (err) {
        console.error('Failed to send letter:', err);
        const errorMsg = err.message || 'Chyba serveru';
        if (window.showNotification) window.showNotification(`Nepovedlo se odeslat: ${errorMsg}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHTML;
        }
    }
}


function compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas compression failed"));
                        return;
                    }
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

export async function handlePhotoSelect(input) {
    const file = input.files[0];
    if (!file) return;

    let processedFile = file;

    // Pokud je soubor obrázek a je větší než 1 MB, zkomprimujeme ho klientsky
    if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
        showNotification('Zpracovávám a optimalizuji fotku... ⏳', 'info');
        try {
            processedFile = await compressImage(file);
            const origSize = (file.size / (1024 * 1024)).toFixed(2);
            const newSize = (processedFile.size / (1024 * 1024)).toFixed(2);
            console.log(`[Letters] Obrázek zmenšen z ${origSize}MB na ${newSize}MB`);
            showNotification(`Obrázek byl optimalizován (${origSize}MB -> ${newSize}MB) ✨`, 'success');
        } catch (err) {
            console.warn('[Letters] Chyba při kompresi obrázku:', err);
            showNotification('Obrázek se nepodařilo optimalizovat, nahraje se v původní kvalitě.', 'info');
        }
    }

    pendingFile = processedFile; // Persist in module state

    const nameEl = document.getElementById('letter-photo-name');
    const previewBox = document.getElementById('letter-photo-preview-box');
    const previewImg = document.getElementById('letter-photo-preview-img');
    const icon = document.getElementById('letter-photo-placeholder-icon');
    const actions = document.getElementById('letter-photo-actions');

    if (nameEl) nameEl.innerText = processedFile.name;
    if (previewBox) previewBox.classList.remove('hidden');
    if (actions) actions.classList.remove('hidden');
    
    if (previewImg && icon) {
        previewImg.src = URL.createObjectURL(processedFile);
        previewImg.classList.remove('hidden');
        icon.classList.add('hidden');
    }
}

export function removePhoto() {
    pendingFile = null; // Clear from module state
    const input = document.getElementById('letter-photo-input');
    const nameEl = document.getElementById('letter-photo-name');
    const previewBox = document.getElementById('letter-photo-preview-box');
    const previewImg = document.getElementById('letter-photo-preview-img');
    const icon = document.getElementById('letter-photo-placeholder-icon');
    const actions = document.getElementById('letter-photo-actions');

    if (input) input.value = '';
    if (nameEl) nameEl.innerText = '';
    if (previewBox) previewBox.classList.add('hidden');
    if (actions) actions.classList.add('hidden');
    
    if (previewImg && icon) {
        previewImg.src = '';
        previewImg.classList.add('hidden');
        icon.classList.remove('hidden');
    }
}

