import { state, saveStateToCache } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { showNotification } from '@core/theme.js';
import { playPageFlip, playChime } from '@core/sound.js';
import { triggerConfetti } from '@core/utils.js';

let currentGalleryImages = [];
let currentImageIndex = 0;
let currentGalleryTitle = "";
let isGalleryGesturesInit = false;

export function ensureModals() {
    if (!document.getElementById("gallery-modal")) {
        const galleryModal = document.createElement("div");
        galleryModal.id = "gallery-modal";
        galleryModal.className = "fixed inset-0 z-[120] hidden bg-black/90 backdrop-blur-xl flex-col items-center justify-center animate-fade-in";
        galleryModal.innerHTML = `
            <button onclick="Timeline.closeGallery()" class="absolute top-6 right-6 text-gray-400 hover:text-white z-50 w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90">
                <i class="fas fa-times text-2xl"></i>
            </button>
            <div class="relative w-full h-full flex items-center justify-center p-4 md:p-10">
                <button onclick="Timeline.changeGalleryImage(-1)"
                    class="absolute left-2 md:left-8 text-white hover:text-[#5865F2] transition p-4 z-50 bg-black/50 hover:bg-black/80 rounded-full">
                    <i class="fas fa-chevron-left text-2xl md:text-4xl"></i>
                </button>
                <div class="max-w-5xl max-h-full flex flex-col items-center">
                    <img id="gallery-image" src=""
                        class="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl border border-[#2f3136] animate-fade-in" />
                    <div class="mt-4 text-center">
                        <h3 id="gallery-title" class="text-white font-bold text-xl mb-1">Název</h3>
                        <p id="gallery-counter" class="text-gray-400 text-sm">1 / 5</p>
                        <button onclick="Timeline.deleteCurrentPhoto()"
                            class="mt-4 text-xs text-red-500 hover:text-red-400 transition flex items-center gap-1 mx-auto">
                            <i class="fas fa-trash-alt"></i> Smazat tuhle fotku
                        </button>
                    </div>
                </div>
                <button onclick="Timeline.changeGalleryImage(1)"
                    class="absolute right-2 md:right-8 text-white hover:text-[#5865F2] transition p-4 z-50 bg-black/50 hover:bg-black/80 rounded-full">
                    <i class="fas fa-chevron-right text-2xl md:text-4xl"></i>
                </button>
            </div>
        `;
        document.body.appendChild(galleryModal);
    }

    if (!document.getElementById("delete-photo-modal")) {
        const deleteModal = document.createElement("div");
        deleteModal.id = "delete-photo-modal";
        deleteModal.className = "fixed inset-0 z-[150] hidden modal-backdrop items-center justify-center p-4";
        deleteModal.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-sm border border-red-500/50 p-8 text-center animate-fade-in">
                <div class="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-inner"><i class="fas fa-trash-alt"></i></div>
                <h3 class="text-xl font-bold text-white mb-2">Smazat fotku?</h3>
                <p class="text-gray-400 mb-8 text-sm leading-relaxed">Opravdu chceš tuhle fotku smazat? Tuhle akci nejde vzít zpět.</p>
                <div class="flex gap-3">
                    <button onclick="closeModal('delete-photo-modal')" class="flex-1 text-gray-400 hover:text-white font-bold py-2 transition text-xs uppercase tracking-widest">Zrušit</button>
                    <button onclick="Timeline.confirmDeletePhoto()" class="flex-[2] bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg transition active:scale-95">Smazat</button>
                </div>
            </div>
        `;
        document.body.appendChild(deleteModal);
    }
}

export async function openGallery(eventId, eventsList) {
    ensureModals();
    const idNum = Number(eventId);
    const targetEvents = eventsList || state.timelineEvents || [];
    const event = targetEvents.find(e => Number(e.id) === idNum);

    if (!event || !event.images || event.images.length === 0) {
        console.error("Gallery: Event not found or has no images", idNum);
        return;
    }

    currentGalleryImages = event.images;
    currentImageIndex = 0;
    currentGalleryTitle = event.title;

    updateGalleryUI();
    const modal = document.getElementById("gallery-modal");
    if (modal) modal.style.display = "flex";

    document.addEventListener("keydown", handleGalleryKeys);
    initGalleryGestures();
}

export function closeGallery() {
    const modal = document.getElementById("gallery-modal");
    if (modal) modal.style.display = "none";
    document.removeEventListener("keydown", handleGalleryKeys);
}

export function changeGalleryImage(direction) {
    currentImageIndex += direction;
    if (currentImageIndex >= currentGalleryImages.length) currentImageIndex = 0;
    if (currentImageIndex < 0) currentImageIndex = currentGalleryImages.length - 1;
    updateGalleryUI();
}

function updateGalleryUI() {
    const img = document.getElementById("gallery-image");
    const title = document.getElementById("gallery-title");
    const counter = document.getElementById("gallery-counter");

    if (img) {
        img.classList.remove("animate-fade-in");
        void img.offsetWidth;
        img.classList.add("animate-fade-in");
        img.src = currentGalleryImages[currentImageIndex];
    }
    if (title) title.textContent = currentGalleryTitle;
    if (counter) counter.textContent = `${currentImageIndex + 1} z ${currentGalleryImages.length}`;
}

function handleGalleryKeys(e) {
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowRight") changeGalleryImage(1);
    if (e.key === "ArrowLeft") changeGalleryImage(-1);
    if (e.key === "Delete" || e.key === "Backspace") deleteCurrentPhoto();
}

export async function deleteCurrentPhoto() {
    if (currentGalleryImages.length === 0) return;
    const modal = document.getElementById("delete-photo-modal");
    if (modal) modal.style.display = "flex";
}

export async function confirmDeletePhoto(refreshFn) {
    const modal = document.getElementById("delete-photo-modal");
    if (modal) modal.style.display = "none";

    if (currentGalleryImages.length === 0) return;

    const photoUrl = currentGalleryImages[currentImageIndex];

    try {
        const event = (state.timelineEvents || []).find(e => e.images && e.images.includes(photoUrl));
        if (!event) return;

        const updatedImages = event.images.filter(img => img !== photoUrl);
        const { error: dbError } = await supabase
            .from('timeline_events')
            .update({ images: updatedImages })
            .eq('id', event.id);

        if (dbError) throw dbError;

        try {
            const urlParts = photoUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabase.storage.from('media').remove([`timeline/${event.id}/${fileName}`]);
        } catch (storageErr) {
            console.warn("Could not delete from storage, but removed from DB:", storageErr);
        }

        event.images = updatedImages;
        currentGalleryImages = updatedImages;

        if (currentGalleryImages.length === 0) {
            closeGallery();
        } else {
            if (currentImageIndex >= currentGalleryImages.length) {
                currentImageIndex = currentGalleryImages.length - 1;
            }
            updateGalleryUI();
        }

        if (refreshFn) refreshFn();

    } catch (err) {
        console.error("Delete Photo Error:", err);
        showNotification('Smazání fotky se nepovedlo.', 'error');
    }
}

export function togglePinPhoto(url, eventId, title, date, refreshFn) {
    if (!state.settings) state.settings = {};
    if (!state.settings.pinnedPhotos) {
        state.settings.pinnedPhotos = [];
    }

    const isPinned = state.settings.pinnedPhotos.some(p => p.url === url);

    if (isPinned) {
        state.settings.pinnedPhotos = state.settings.pinnedPhotos.filter(p => p.url !== url);
        saveStateToCache();
        playPageFlip();
        showNotification('Fotka byla odepnuta z nástěnky 🗑️', 'info');
        if (refreshFn) refreshFn();
    } else {
        if (state.settings.pinnedPhotos.length >= 3) {
            showNotification('Nástěnka vzpomínek je plná! Můžeš mít připnuté maximálně 3 fotky. Nejprve nějakou odepni.', 'warning');
            return;
        }
        state.settings.pinnedPhotos.push({ url, eventId, title, date });
        saveStateToCache();
        playChime();
        triggerConfetti();
        showNotification('Fotka byla připnuta na nástěnku! 📌', 'success');
        if (refreshFn) refreshFn();
    }
}

export function getStableRotation(str) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const deg = (Math.abs(hash) % 9) - 4;
    return deg === 0 ? 1.5 : deg;
}

let galleryTouchStartX = 0;
let galleryTouchEndX = 0;

export function initGalleryGestures() {
    if (isGalleryGesturesInit) return;
    const modal = document.getElementById("gallery-modal");
    if (!modal) return;

    modal.addEventListener("touchstart", (e) => {
        galleryTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener("touchend", (e) => {
        galleryTouchEndX = e.changedTouches[0].screenX;
        const threshold = 50;
        const diff = galleryTouchStartX - galleryTouchEndX;
        if (Math.abs(diff) > threshold) {
            if (diff > 0) changeGalleryImage(1);
            else changeGalleryImage(-1);
        }
    }, { passive: true });

    isGalleryGesturesInit = true;
}
