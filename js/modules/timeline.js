import { state, saveStateToCache } from '../core/state.js';
// import { timelineEvents } from '../data.js'; // Smazáno, nyní ze state
import { supabase } from '../core/supabase.js';
import { showConfirmDialog, showNotification } from '../core/theme.js';
import { triggerConfetti } from '../core/utils.js';
import { safeInsert } from '../core/offline.js';
import { uploadFile } from '../core/storage.js';

// --- STATE ---
let currentGalleryImages = [];
let currentImageIndex = 0;
let currentGalleryTitle = "";
let isGalleryGesturesInit = false;
let dbEvents = []; // Loaded from Supabase
let searchQuery = "";

// --- ICON PICKER DATA ---
const CATEGORIZED_ICONS = {
    favorites: {
        label: 'Srdce',
        icon: '❤️',
        items: ['fa-heart', 'fa-star', '🥰', '❤️', '✨', '🔥', '🌹', '👑', '🕊️', '💍']
    },
    activities: {
        label: 'Zábava',
        icon: '🎬',
        items: ['fa-camera', 'fa-film', 'fa-music', 'fa-gamepad', '🎞️', '🎡', '💃', '🕺', '🎨', '🧶', '🎮', '🎧']
    },
    food: {
        label: 'Jídlo',
        icon: '🍕',
        items: ['fa-utensils', 'fa-cocktail', '🍕', '🍦', '🥂', '🍣', '🍷', '🍰', '🍫', '🍔', '🥟', '🧉']
    },
    travel: {
        label: 'Místa',
        icon: '✈️',
        items: ['fa-plane', 'fa-car', 'fa-map-marked-alt', '🏰', '🌅', '🏖️', '🏔️', '⛺', '🚕', '🚂', '🚲', '🏙️']
    }
};

// --- EXPORTED FUNCTIONS ---

function ensureModals() {
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

export async function renderTimeline() {
    // Expose API to window
    window.Timeline = {
        renderTimeline, toggleTimelineCard, openGallery, closeGallery,
        changeGalleryImage, deleteCurrentPhoto, confirmDeletePhoto,
        searchTimeline, uploadPhoto, saveHighlight, toggleMilestone,
        openEventModal, closeEventModal, saveEvent, deleteEvent,
        switchIconCategory, refreshIconCategory: refreshIconPicker, // Alias if needed
        jumpToTimeline
    };

    ensureModals();
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Show Loader
    container.innerHTML = `
        <div class="h-full flex items-center justify-center bg-[#36393f]">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2]"></div>
        </div>
    `;

    try {
        // Use state.timelineEvents as primary source
        if (state.timelineEvents && state.timelineEvents.length > 0) {
            dbEvents = state.timelineEvents;
        } else {
            // Fallback: Fetch directly if state isn't ready or empty
            const { data, error } = await supabase
                .from('timeline_events')
                .select('*')
                .order('event_date', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (!error && data) {
                dbEvents = data.map(e => ({
                    id: e.id,
                    title: e.title,
                    event_date: e.event_date,
                    icon: e.icon,
                    color: e.color,
                    description: e.description, // Changed from 'desc' to 'description' to match original
                    images: e.images || [],
                    location_id: e.location_id,
                    user_highlights: e.user_highlights || "",
                    is_milestone: e.is_milestone || false
                }));
                state.timelineEvents = dbEvents;
            }
        }

        // Filter by Search
        const filteredEvents = searchQuery
            ? dbEvents.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
            : dbEvents;


        // 3. Group events by Date (Year/Month)
        const groupedEvents = {};
        filteredEvents.forEach((event, index) => {
            let groupKey = "Dávné vzpomínky";

            if (event.event_date) {
                const dateObj = new Date(event.event_date);
                if (!isNaN(dateObj.getTime())) {
                    const month = dateObj.toLocaleString('cs-CZ', { month: 'long' });
                    const year = dateObj.getFullYear();
                    const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
                    groupKey = `${monthCapitalized} ${year}`;
                }
            }

            if (!groupedEvents[groupKey]) {
                groupedEvents[groupKey] = [];
            }
            groupedEvents[groupKey].push(event);
        });        // 4. Build HTML
        let html = `
          <div class="h-full flex flex-col bg-[#36393f] overflow-hidden">
              <!-- Sticky Header -->
              <div class="flex-shrink-0 z-20 bg-[#36393f] p-4 md:p-8 pb-4 border-b border-[#202225]/50 shadow-lg">
                  <div class="max-w-4xl mx-auto w-full">
                      <h3 class="text-white font-bold text-2xl mb-0 pl-4 border-l-4 border-[#5865F2] flex flex-wrap items-center justify-between gap-4">
                          <div class="flex items-center gap-3">
                            <i class="fas fa-history text-[#5865F2]"></i> Naše Společná Cesta
                          </div>
                          
                          <div class="flex items-center gap-3">
                              <!-- Add Event Button -->
                              <button onclick="Timeline.openEventModal()" 
                                      class="bg-[#3ba55c] hover:bg-[#2d7d44] text-white text-xs px-3 py-2 rounded font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95">
                                  <i class="fas fa-plus"></i> Nová vzpomínka
                              </button>

                              <!-- Search Bar -->
                              <div class="relative w-full max-w-[200px] md:max-w-[300px]">
                                  <input type="text" 
                                         id="timeline-search"
                                         placeholder="Hledat vzpomínku..." 
                                         value="${searchQuery}"
                                         oninput="Timeline.searchTimeline(this.value)"
                                         class="w-full bg-[#202225] text-xs text-white px-3 py-2 rounded-full border border-[#2f3136] focus:border-[#5865F2] outline-none transition-all pl-8">
                                  <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]"></i>
                              </div>
                          </div>
                      </h3>
                  </div>
              </div>

              <!-- Scrollable Content -->
              <div class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-6">
                  <div class="max-w-4xl mx-auto w-full space-y-10 pb-20">
        `;


        for (const [groupName, events] of Object.entries(groupedEvents)) {
            html += `
                <div class="animate-fade-in">
                    <div class="flex items-center gap-4 mb-4 select-none">
                        <div class="h-[1px] flex-1 bg-[#4f545c] opacity-50"></div>
                        <span class="text-xs font-bold text-[#8e9297] uppercase tracking-wider">${groupName}</span>
                        <div class="h-[1px] flex-1 bg-[#4f545c] opacity-50"></div>
                    </div>
                    <div class="space-y-2">
            `;

            events.forEach((event) => {
                const isGradient = event.color === "gradient";
                const iconBgColor = isGradient ? "" : `background-color: ${event.color}`;
                const gradientClass = isGradient ? "bg-gradient-to-r from-[#5865F2] to-[#eb459e]" : "bg-[#2f3136]";

                let dateStr = "";
                if (event.event_date) {
                    const d = new Date(event.event_date);
                    dateStr = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
                }
                const polaroidDate = dateStr || "Kdysi dávno";

                let descHtml = "";
                if (event.description) {
                    // Split by single or double newline to ensure paragraphs are handled correctly
                    const paragraphs = event.description.split(/\n+/).filter(p => p.trim() !== "");
                    descHtml = paragraphs.map(p => `<p class="mb-3 text-gray-300 leading-relaxed text-sm">${p.trim()}</p>`).join("");
                }

                let galleryBtn = "";
                if (event.images && event.images.length > 0) {
                    const thumbnails = event.images.slice(0, 3).map(src => `
                        <div class="polaroid-frame polaroid-thumb polaroid-stack" onclick="event.stopPropagation(); Timeline.openGallery('${event.id}')">
                            <img src="${src}" loading="lazy">
                            <div class="polaroid-date">${polaroidDate}</div>
                            <div class="polaroid-tape"></div>
                        </div>
                    `).join("");
                    const moreThumbnails = event.images.length > 3 ? `<div class="w-8 h-8 rounded bg-[#202225] flex items-center justify-center text-[10px] text-gray-400 border border-[#202225] ml-2">+${event.images.length - 3}</div>` : "";

                    galleryBtn = `
                <div class="mt-4 pt-4 border-t border-[#4f545c]/10 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1">
                            ${thumbnails}
                            ${moreThumbnails}
                        </div>
                        <button onclick="event.stopPropagation(); Timeline.openGallery('${event.id}')" class="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 py-1.5 rounded transition shadow group/btn">
                            <i class="fas fa-images group-hover/btn:scale-110 transition-transform"></i>
                            <span class="text-xs font-bold">Zobrazit galerii (${event.images.length})</span>
                        </button>
                    </div>
                </div>
                `;
                } else {
                    // If no images, still show a way to add one
                    galleryBtn = `
                    <div class="mt-4 pt-4 border-t border-[#4f545c]/10"></div>
                `;
                }

                // Upload Button
                const uploadBtnHtml = `
                <div class="mt-2 text-right">
                             <button onclick="document.getElementById('photo-upload-${event.id}').click()" 
                                 class="mt-3 text-[#5865F2] hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#5865F2]/10">
                                 <i class="fas fa-camera"></i> Přidat fotku
                             </button>
                             <input type="file" id="photo-upload-${event.id}" class="hidden" accept="image/*" 
                                 onchange="Timeline.uploadPhoto('${event.id}', this)">
                </div>
            `;

                // Highlight UI
                const highlightText = event.user_highlights || "";
                const highlightsHtml = `
                    <div class="mt-4 p-3 bg-[#faa61a]/10 border border-[#faa61a]/20 rounded-lg group/h">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-bold text-[#faa61a] uppercase tracking-tighter flex items-center gap-1">
                                <i class="fas fa-pen-nib"></i> Náš Highlight
                            </span>
                            <i class="fas fa-edit text-[#faa61a] opacity-0 group-hover/h:opacity-100 transition-opacity cursor-pointer"></i>
                        </div>
                        <textarea 
                            onclick="event.stopPropagation()"
                            onblur="Timeline.saveHighlight('${event.id}', this.value)"
                            class="w-full bg-transparent text-xs text-gray-200 resize-none border-none focus:ring-0 p-0 placeholder-gray-500" 
                            placeholder="Přidej svůj postřeh k tomuhle momentu..."
                            rows="2">${highlightText}</textarea>
                    </div>
                `;

                const milestoneClass = event.is_milestone ? 'milestone-card' : '';
                const crownIcon = event.is_milestone ? `<i class="fas fa-crown milestone-crown text-[#faa61a] absolute -top-1 -right-1 z-10 text-xs"></i>` : '';

                html += `
                <div id="timeline-event-${event.id}" class="timeline-forum-card bg-[#36393f] rounded-lg border border-[#202225] hover:border-[#4f545c] transition-colors relative overflow-hidden group cursor-pointer ${milestoneClass}" onclick="Timeline.toggleTimelineCard(this)">
                    ${crownIcon}
                    <div class="p-4 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${gradientClass}" style="${iconBgColor}">
                            <i class="fas ${event.icon} text-white text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <h4 class="font-bold text-white text-base md:text-lg truncate group-hover:text-[#5865F2] transition-colors">${event.title}</h4>
                                <div class="flex items-center gap-2">
                                    <button onclick="event.stopPropagation(); Timeline.toggleMilestone('${event.id}', ${!event.is_milestone})" class="text-[#4f545c] hover:text-[#faa61a] transition-colors" title="Označit jako milník">
                                        <i class="fas fa-crown ${event.is_milestone ? 'text-[#faa61a]' : ''}"></i>
                                    </button>
                                    <button onclick="event.stopPropagation(); Timeline.openEventModal('${event.id}')" class="text-[#4f545c] hover:text-[#5865F2] transition-colors" title="Upravit událost">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="text-xs text-[#8e9297] flex items-center gap-2 mt-0.5">
                                ${dateStr ? `<span class="flex items-center gap-1"><i class="far fa-calendar-alt"></i> ${dateStr}</span>` : ''}
                                ${event.location_id ? `
                                    <button onclick="event.stopPropagation(); window.loadModule('map').then(m => m.jumpToLocation(${event.location_id}))" class="flex items-center gap-1 text-[#5865F2] hover:underline">
                                        <i class="fas fa-map-marker-alt"></i> Lokace uložena
                                    </button>` : ''}
                            </div>
                        </div>
                        <div class="text-[#4f545c] group-hover:text-gray-300 transition-colors px-2">
                            <i class="fas fa-chevron-down transform transition-transform duration-300 dropdown-icon"></i>
                        </div>
                    </div>

                    <div class="card-body max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out px-4 md:px-16" style="visibility: hidden; transform-origin: top;">
                        <div class="pb-5 pt-2 border-t border-[#4f545c]/20 mt-2">
                            <div class="pl-4 border-l-4 border-[#4f545c] bg-[#2f3136]/50 py-3 pr-3 rounded-r">
                               ${descHtml}
                            </div>
                            ${highlightsHtml}
                            ${galleryBtn}
                            ${uploadBtnHtml}
                        </div>
                    </div>
                </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        html += `</div></div></div>`;
        container.innerHTML = html;

        // Restore Search Focus
        if (searchQuery) {
            const searchInput = document.getElementById("timeline-search");
            if (searchInput) {
                searchInput.focus();
                searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
            }
        }

    } catch (err) {
        console.error("Timeline Error:", err);
        container.innerHTML = `
            <div class="p-8 text-center bg-[#2f3136] m-8 rounded-xl border border-red-500/50">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <h3 class="text-white font-bold text-xl mb-2">Chyba při načítání Timeline</h3>
                <p class="text-gray-400 mb-4">${err.message || 'Nepodařilo se připojit k Supabase.'}</p>
                <button onclick="Timeline.renderTimeline()" class="bg-[#5865F2] text-white px-6 py-2 rounded-lg font-bold">Zkusit znovu</button>
            </div>
        `;
    }
}



export function toggleTimelineCard(cardElement) {
    const body = cardElement.querySelector('.card-body');
    const icon = cardElement.querySelector('.dropdown-icon');

    const isOpen = !body.classList.contains('max-h-0');

    if (isOpen) {
        body.classList.add('max-h-0', 'opacity-0');
        body.style.maxHeight = '0px';
        setTimeout(() => {
            if (body.classList.contains('max-h-0')) {
                body.style.visibility = 'hidden';
                body.style.maxHeight = null;
            }
        }, 500);
        icon.classList.remove('rotate-180');
        cardElement.classList.remove('bg-[#32353b]', 'border-[#5865F2]');
    } else {
        body.style.visibility = 'visible';
        body.classList.remove('max-h-0', 'opacity-0');
        icon.classList.add('rotate-180');
        cardElement.classList.add('bg-[#32353b]', 'border-[#5865F2]');
        body.style.maxHeight = (body.scrollHeight + 100) + "px"; // Buffer for padding/margins

        setTimeout(() => {
            if (!body.classList.contains('max-h-0')) body.style.maxHeight = 'none';
        }, 500);
    }
}

export function openGallery(eventId) {
    const idNum = Number(eventId);
    const event = dbEvents.find(e => Number(e.id) === idNum);
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

export async function saveHighlight(eventId, text) {
    try {
        const { error } = await supabase
            .from('timeline_events')
            .update({ user_highlights: text })
            .eq('id', eventId);

        if (error) throw error;

        // Update local state
        const idNum = Number(eventId);
        const ev = state.timelineEvents.find(e => Number(e.id) === idNum);
        if (ev) ev.user_highlights = text;

        showNotification('Poznámka uložena ✨', 'success');
    } catch (e) {
        console.error("Error saving highlight:", e);
        showNotification('Chyba při ukládání poznámky', 'error');
    }
}

export async function toggleMilestone(eventId, status) {
    try {
        const { error } = await supabase
            .from('timeline_events')
            .update({ is_milestone: status })
            .eq('id', eventId);

        if (error) throw error;

        const idNum = Number(eventId);
        const ev = dbEvents.find(e => Number(e.id) === idNum);
        if (ev) ev.is_milestone = status;

        if (status) {
            triggerConfetti();
        }

        renderTimeline();

    } catch (err) {
        console.error("Toggle Milestone Error:", err);
    }
}

export async function uploadPhoto(eventId, input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    // UI Feedback
    const btn = input.previousElementSibling;
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> Nahrávám...`;
    btn.disabled = true;

    try {
        // Use central storage helper - confirmed bucket name is 'timeline-photos'
        const publicUrl = await uploadFile('timeline-photos', file, `timeline/${eventId}`);
        if (!publicUrl) throw new Error("Nepodařilo se získat URL po nahrání.");

        // Ensure eventId is a number for state lookup
        const idNum = Number(eventId);
        const event = state.timelineEvents.find(e => Number(e.id) === idNum);

        if (!event) throw new Error("Událost nebyla nalezena v paměti.");

        const newImages = [...(event.images || []), publicUrl];

        const { error: updateError } = await supabase
            .from('timeline_events')
            .update({ images: newImages })
            .eq('id', idNum);

        if (updateError) throw updateError;

        event.images = newImages;
        dbEvents = state.timelineEvents;

        renderTimeline();
        showNotification('Fotka úspěšně nahrána! 📸', 'success');
    } catch (err) {
        console.error("Upload Error:", err);
        showNotification('Nahrávání se nepovedlo. Zkontroluj bucket timeline-photos.', 'error');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
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

export function searchTimeline(query) {
    searchQuery = query;
    // We don't want to re-render EVERYTHING on every keystroke if it's too much,
    // but with < 100 events it's fine.
    renderTimeline();
}

export async function deleteCurrentPhoto() {
    if (currentGalleryImages.length === 0) return;
    const modal = document.getElementById("delete-photo-modal");
    if (modal) modal.style.display = "flex";
}

export async function confirmDeletePhoto() {
    const modal = document.getElementById("delete-photo-modal");
    if (modal) modal.style.display = "none";

    if (currentGalleryImages.length === 0) return;

    const photoUrl = currentGalleryImages[currentImageIndex];

    try {
        // Find which event this photo belongs to
        const event = dbEvents.find(e => e.images && e.images.includes(photoUrl));
        if (!event) return;

        // 1. Remove from Database
        const updatedImages = event.images.filter(img => img !== photoUrl);
        const { error: dbError } = await supabase
            .from('timeline_events')
            .update({ images: updatedImages })
            .eq('id', event.id);

        if (dbError) throw dbError;

        // 2. Try to remove from Storage (optional but good practice)
        // Extract filename from URL
        try {
            const urlParts = photoUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabase.storage.from('media').remove([`timeline/${event.id}/${fileName}`]);
        } catch (storageErr) {
            console.warn("Could not delete from storage, but removed from DB:", storageErr);
        }

        // 3. Update Local State
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

        renderTimeline();

    } catch (err) {
        console.error("Delete Photo Error:", err);
        showNotification('Smazání fotky se nepovedlo.', 'error');
    }
}

// --- GESTURES ---
let galleryTouchStartX = 0;
let galleryTouchEndX = 0;

function initGalleryGestures() {
    if (isGalleryGesturesInit) return;
    const modal = document.getElementById("gallery-modal");
    if (!modal) return;

    modal.addEventListener("touchstart", (e) => {
        galleryTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener("touchend", (e) => {
        galleryTouchEndX = e.changedTouches[0].screenX;
        handleGallerySwipe();
    }, { passive: true });

    isGalleryGesturesInit = true;
}

function handleGallerySwipe() {
    const threshold = 50;
    const diff = galleryTouchStartX - galleryTouchEndX;
    if (Math.abs(diff) > threshold) {
        if (diff > 0) changeGalleryImage(1); // Left swipe -> Next
        else changeGalleryImage(-1); // Right swipe -> Prev
    }
}

export function jumpToTimeline(id) {
    if (window.switchChannel) window.switchChannel('timeline');

    setTimeout(() => {
        const element = document.getElementById(`timeline-event-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-[#eb459e]', 'scale-105', 'transition-transform');
            setTimeout(() => {
                element.classList.remove('ring-4', 'ring-[#eb459e]', 'scale-105');
            }, 1500);
        }
    }, 100);
}

// --- EVENT CRUD MODAL ---

export function openEventModal(eventId = null) {
    let modal = document.getElementById("event-crud-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "event-crud-modal";
        modal.className = "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4";
        modal.style.display = "none";
        document.body.appendChild(modal);
    }

    const idNum = eventId ? Number(eventId) : null;
    const event = idNum ? dbEvents.find(e => Number(e.id) === idNum) : null;
    const title = event ? "Upravit vzpomínku" : "Nová vzpomínka";

    modal.innerHTML = `
        <div class="bg-[#36393f] w-full max-w-lg rounded-xl shadow-2xl border border-[#202225] overflow-hidden animate-scale-in">
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fas ${event ? 'fa-edit' : 'fa-plus-circle'} text-[#5865F2]"></i> ${title}
                    </h3>
                    <button onclick="Timeline.closeEventModal()" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Název události</label>
                        <input type="text" id="edit-title" value="${event ? event.title : ''}" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-[#2f3136] focus:border-[#5865F2] outline-none">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Datum</label>
                            <input type="date" id="edit-date" value="${event ? (event.event_date || '') : ''}" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-[#2f3136] focus:border-[#5865F2] outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ikona / Emoji</label>
                            <div class="flex gap-2 mb-2">
                                <input type="text" id="edit-icon" value="${event ? event.icon : 'fa-heart'}" placeholder="fa-heart nebo 🍕" class="flex-1 bg-[#202225] text-white p-3 rounded-lg border border-[#2f3136] focus:border-[#5865F2] outline-none">
                            </div>
                            
                            <div id="icon-picker-container" class="space-y-2">
                                ${renderIconPickerHTML(event ? event.icon : 'fa-heart')}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Popis</label>
                        <textarea id="edit-desc" rows="5" class="w-full bg-[#202225] text-white p-3 rounded-lg border border-[#2f3136] focus:border-[#5865F2] outline-none resize-none">${event ? event.description : ''}</textarea>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Přidat fotku</label>
                        <div class="flex items-center gap-4 bg-[#202225] p-3 rounded-lg border border-[#2f3136]">
                            <button onclick="document.getElementById('edit-photo').click()" class="w-12 h-12 bg-[#2f3136] hover:bg-[#4f545c] text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition shadow-inner">
                                <i class="fas fa-camera text-xl"></i>
                            </button>
                            <input type="file" id="edit-photo" class="hidden" accept="image/*" onchange="const f = this.files[0]; if(f) { document.getElementById('photo-preview-name').innerText = f.name; document.getElementById('photo-preview-container').classList.remove('hidden'); }">
                            <div id="photo-preview-container" class="hidden flex-1 flex items-center justify-between">
                                <span id="photo-preview-name" class="text-xs text-gray-400 truncate max-w-[150px]"></span>
                                <button onclick="document.getElementById('edit-photo').value=''; document.getElementById('photo-preview-container').classList.add('hidden')" class="text-red-500 hover:text-red-400 text-xs">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <span id="photo-hint" class="text-[10px] text-gray-500 italic">Klikni pro výběr souboru</span>
                        </div>
                    </div>
                    
                    ${eventId ? `
                    <div class="pt-2">
                        <button onclick="Timeline.deleteEvent('${eventId}')" class="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                            <i class="fas fa-trash-alt"></i> Smazat tuhle vzpomínku
                        </button>
                    </div>
                    ` : ''}
                </div>

                <div class="mt-8 flex gap-3">
                    <button onclick="Timeline.closeEventModal()" class="flex-1 bg-[#4f545c] hover:bg-[#5d6269] text-white py-3 rounded-lg font-bold transition">Zrušit</button>
                    <button onclick="Timeline.saveEvent(${eventId ? `'${eventId}'` : 'null'})" class="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-lg font-bold shadow-lg transition transform hover:scale-105">Uložit</button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

export function renderIconPickerHTML(selectedIcon, activeCategory = 'favorites') {
    const categories = Object.keys(CATEGORIZED_ICONS);

    const tabsHtml = categories.map(cat => `
        <button onclick="Timeline.switchIconCategory('${cat}', '${selectedIcon}')" 
                class="icon-picker-tab ${cat === activeCategory ? 'active' : ''}" 
                title="${CATEGORIZED_ICONS[cat].label}">
            <span>${CATEGORIZED_ICONS[cat].icon}</span>
        </button>
    `).join('');

    const iconsHtml = CATEGORIZED_ICONS[activeCategory].items.map(ico => {
        const isActive = ico === selectedIcon;
        const isFA = ico.startsWith('fa-');
        return `
            <button onclick="document.getElementById('edit-icon').value='${ico}'; Timeline.refreshIconPicker('${ico}', '${activeCategory}')" 
                    class="icon-item ${isActive ? 'active' : ''}">
                ${isFA ? `<i class="fas ${ico}"></i>` : `<span>${ico}</span>`}
            </button>
        `;
    }).join('');

    return `
        <div class="flex gap-1 mb-2 border-b border-[#2f3136] pb-2">
            ${tabsHtml}
        </div>
        <div class="icon-grid custom-scrollbar">
            ${iconsHtml}
        </div>
    `;
}

export function switchIconCategory(category, selectedIcon) {
    const container = document.getElementById('icon-picker-container');
    if (container) {
        container.innerHTML = renderIconPickerHTML(selectedIcon, category);
    }
}

export function refreshIconPicker(selectedIcon, category) {
    const container = document.getElementById('icon-picker-container');
    if (container) {
        container.innerHTML = renderIconPickerHTML(selectedIcon, category);
    }
}

export function closeEventModal() {
    const modal = document.getElementById("event-crud-modal");
    if (modal) modal.style.display = "none";
}

export async function saveEvent(eventId) {
    const titleValue = document.getElementById("edit-title").value;
    const dateValue = document.getElementById("edit-date").value || null;
    const iconValue = document.getElementById("edit-icon").value || "fa-heart";
    const descValue = document.getElementById("edit-desc").value;

    if (!titleValue) return showNotification("Název je povinný!", "error");

    const idNum = eventId ? Number(eventId) : null;
    const eventData = {
        title: titleValue,
        event_date: dateValue,
        icon: iconValue,
        description: descValue,
        color: idNum ? dbEvents.find(e => Number(e.id) === idNum).color : "#5865F2"
    };

    try {
        let finalEventId = eventId;
        let isNew = !eventId;
        let result;

        if (isNew) {
            // 1. Create event first (to get ID for storage path if online)
            result = await safeInsert('timeline_events', eventData);
            if (result.error) throw result.error;

            if (result.offline) {
                // Manually add to state for immediate offline feedback
                const tempId = Date.now();
                state.timelineEvents.unshift({
                    id: tempId,
                    ...eventData,
                    images: [],
                    offline_pending: true
                });
                finalEventId = tempId;
            } else if (result.data && result.data[0]) {
                finalEventId = result.data[0].id;
            }
        } else {
            // Update
            result = await supabase.from('timeline_events').update(eventData).eq('id', eventId).select();
            if (result.error) throw result.error;
        }

        // 2. Handle Photo Upload (only if online and file selected)
        const photoInput = document.getElementById('edit-photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            if (!navigator.onLine) {
                showNotification("Fotku nelze nahrát offline. Vzpomínka uložena bez fotky.", "warning");
            } else if (finalEventId) {
                try {
                    const file = photoInput.files[0];
                    const publicUrl = await uploadFile('timeline-photos', file, `events/${finalEventId}`);

                    if (publicUrl) {
                        // Append to existing images
                        const currentEvent = dbEvents.find(e => String(e.id) === String(finalEventId)) || { images: [] };
                        const updatedImages = [...(currentEvent.images || []), publicUrl];

                        await supabase.from('timeline_events')
                            .update({ images: updatedImages })
                            .eq('id', finalEventId);
                    }
                } catch (uploadErr) {
                    console.error("Delayed upload error:", uploadErr);
                    showNotification("Vzpomínka uložena, ale fotka se nenahrála.", "warning");
                }
            }
        }

        showNotification(isNew ? "Nová vzpomínka přidána! ❤️" : "Vzpomínka upravena ✨", "success");
        closeEventModal();

        // Refresh local state (ONLY if online)
        if (navigator.onLine) {
            const { data: timelineData, error: loadErr } = await supabase
                .from('timeline_events')
                .select('*')
                .order('event_date', { ascending: false, nullsFirst: false });

            if (!loadErr && timelineData) {
                state.timelineEvents = timelineData.map(e => ({
                    id: e.id,
                    title: e.title,
                    event_date: e.event_date,
                    icon: e.icon,
                    color: e.color,
                    description: e.description,
                    images: e.images || [],
                    location_id: e.location_id,
                    user_highlights: e.user_highlights || "",
                    is_milestone: e.is_milestone || false
                }));
            }
        }

        saveStateToCache();
        renderTimeline();

    } catch (err) {
        console.error("Save Event Error:", err);
        window.showNotification("Chyba při ukládání.", "error");
    }
}

export async function deleteEvent(eventId) {
    const ok = await showConfirmDialog('Fakt chceš tuhle vzpomínku smazat? 🥺', 'Smazat', 'Zrušit');
    if (!ok) return;

    try {
        const idNum = Number(eventId);
        const { error } = await supabase.from('timeline_events').delete().eq('id', idNum);
        if (error) throw error;

        state.timelineEvents = state.timelineEvents.filter(e => Number(e.id) !== idNum);
        saveStateToCache();
        window.showNotification("Vzpomínka smazána.", "info");
        closeEventModal();
        renderTimeline();
    } catch (err) {
        console.error("Delete Event Error:", err);
        window.showNotification("Chyba při mazání.", "error");
    }
}

window.addEventListener('timeline-updated', async () => {
    try {
        const { data: timelineData, error: loadErr } = await supabase
            .from('timeline_events')
            .select('*')
            .order('event_date', { ascending: false, nullsFirst: false });

        if (!loadErr && timelineData) {
            state.timelineEvents = timelineData.map(e => ({
                id: e.id,
                title: e.title,
                event_date: e.event_date,
                icon: e.icon,
                color: e.color,
                description: e.description,
                images: e.images || [],
                location_id: e.location_id,
                user_highlights: e.user_highlights || "",
                is_milestone: e.is_milestone || false
            }));

            if (state.currentChannel === 'timeline') {
                renderTimeline();
            }
        }
    } catch (err) {
        console.error("Realtime Timeline Refresh Error:", err);
    }
});
