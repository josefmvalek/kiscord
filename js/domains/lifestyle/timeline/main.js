import { state, saveStateToCache } from '@core/state.js';
import { supabase } from '@core/supabase.js';

import { deduplicateAndSortEvents } from './dedup.js';
import { 
    ensureModals, 
    openGallery, 
    closeGallery, 
    changeGalleryImage, 
    deleteCurrentPhoto, 
    confirmDeletePhoto, 
    togglePinPhoto, 
    getStableRotation 
} from './gallery.js';
import { 
    CATEGORIZED_ICONS, 
    renderIconPickerHTML, 
    switchIconCategory, 
    refreshIconPicker, 
    openEventModal, 
    closeEventModal, 
    saveEvent, 
    deleteEvent, 
    uploadPhoto, 
    saveHighlight, 
    toggleMilestone 
} from './editor.js';

export { 
    deduplicateAndSortEvents, 
    ensureModals, 
    openGallery, 
    closeGallery, 
    changeGalleryImage, 
    deleteCurrentPhoto, 
    confirmDeletePhoto, 
    togglePinPhoto, 
    CATEGORIZED_ICONS, 
    renderIconPickerHTML, 
    switchIconCategory, 
    refreshIconPicker, 
    openEventModal, 
    closeEventModal, 
    saveEvent, 
    deleteEvent, 
    uploadPhoto, 
    saveHighlight, 
    toggleMilestone 
};

let dbEvents = [];
let searchQuery = "";

export function ensureWindowTimeline() {
    if (!window.Timeline) {
        window.Timeline = {
            renderTimeline, 
            toggleTimelineCard, 
            openGallery: (id) => openGallery(id, dbEvents), 
            closeGallery,
            changeGalleryImage, 
            deleteCurrentPhoto, 
            confirmDeletePhoto: () => confirmDeletePhoto(renderTimeline),
            searchTimeline, 
            uploadPhoto: (id, input) => uploadPhoto(id, input, renderTimeline), 
            saveHighlight, 
            toggleMilestone: (id, status) => toggleMilestone(id, status, renderTimeline),
            openEventModal: (id) => openEventModal(id, dbEvents), 
            closeEventModal, 
            saveEvent: (id) => saveEvent(id, renderTimeline), 
            deleteEvent: (id) => deleteEvent(id, renderTimeline),
            switchIconCategory, 
            refreshIconCategory: refreshIconPicker, 
            refreshIconPicker,
            jumpToTimeline, 
            switchViewMode, 
            togglePinPhoto: (url, eventId, title, date) => togglePinPhoto(url, eventId, title, date, renderTimeline)
        };
    }
    ensureModals();
}

export async function renderTimeline() {
    ensureWindowTimeline();
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Show Loader
    container.innerHTML = `
        <div class="h-full flex items-center justify-center bg-[#36393f]">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2]"></div>
        </div>
    `;

    try {
        if (state.timelineEvents && state.timelineEvents.length > 0) {
            dbEvents = state.timelineEvents;
        } else {
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
                    description: e.description,
                    images: e.images || [],
                    location_id: e.location_id,
                    user_highlights: e.user_highlights || "",
                    is_milestone: e.is_milestone || false
                }));
                state.timelineEvents = dbEvents;
            }
        }

        const filteredEvents = searchQuery
            ? dbEvents.filter(e => 
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
              )
            : dbEvents;

        const groupedEvents = {};
        filteredEvents.forEach((event) => {
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
        });

        const isAlbumMode = state.settings && state.settings.timelineViewMode === 'album';

        let html = `
          <div class="h-full flex flex-col bg-[#36393f] overflow-hidden">
              <div class="flex-shrink-0 z-20 bg-[#36393f] p-4 md:p-8 pb-4 border-b border-[#202225]/50 shadow-lg">
                  <div class="max-w-4xl mx-auto w-full">
                      <h3 class="text-white font-bold text-2xl mb-0 pl-4 border-l-4 border-[#5865F2] flex flex-wrap items-center justify-between gap-4">
                          <div class="flex items-center gap-3">
                            <i class="fas fa-history text-[#5865F2]"></i> Naše Společná Cesta
                          </div>
                          
                          <div class="flex flex-wrap items-center gap-3">
                              <div class="flex bg-[#202225] p-0.5 rounded-lg border border-[#2f3136] select-none">
                                  <button onclick="Timeline.switchViewMode('list')" 
                                          class="px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${!isAlbumMode ? 'bg-[#5865F2] text-white shadow' : 'text-gray-400 hover:text-white'}">
                                      <i class="fas fa-list"></i> Seznam
                                  </button>
                                  <button onclick="Timeline.switchViewMode('album')" 
                                          class="px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${isAlbumMode ? 'bg-[#5865F2] text-white shadow' : 'text-gray-400 hover:text-white'}">
                                      <i class="fas fa-images"></i> Album
                                  </button>
                              </div>

                              <button onclick="Timeline.openEventModal()" 
                                      class="bg-[#3ba55c] hover:bg-[#2d7d44] text-white text-xs px-3 py-2 rounded font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95">
                                  <i class="fas fa-plus"></i> Nová vzpomínka
                              </button>

                              <div class="relative w-full max-w-[200px] md:max-w-[300px]">
                                  <input type="text" 
                                         id="timeline-search"
                                         placeholder="Hledat..." 
                                         value="${searchQuery}"
                                         oninput="Timeline.searchTimeline(this.value)"
                                         class="w-full bg-[#202225] text-xs text-white px-3 py-2 rounded-full border border-[#2f3136] focus:border-[#5865F2] outline-none transition-all pl-8">
                                  <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]"></i>
                              </div>
                          </div>
                      </h3>
                  </div>
              </div>

              <div class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-6">
                  <div class="max-w-4xl mx-auto w-full pb-20">
        `;

        if (isAlbumMode) {
            const albumPhotos = [];
            filteredEvents.forEach(event => {
                if (event.images && event.images.length > 0) {
                    event.images.forEach(imgUrl => {
                        albumPhotos.push({
                            url: imgUrl,
                            event: event
                        });
                    });
                }
            });

            if (albumPhotos.length === 0) {
                html += `
                    <div class="flex flex-col items-center justify-center py-20 text-center select-none">
                        <div class="w-20 h-20 bg-[#2f3136]/50 rounded-full flex items-center justify-center mb-6 shadow-inner text-gray-500">
                            <i class="fas fa-camera text-3xl"></i>
                        </div>
                        <h3 class="text-white font-bold text-lg mb-2">Žádné fotky k zobrazení</h3>
                        <p class="text-gray-400 text-sm max-w-sm">Nahraj nějaké fotky ke svým vzpomínkám v zobrazení seznamu a vytvoř si tak digitální album!</p>
                    </div>
                `;
            } else {
                html += `
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-items-center pt-4">
                `;

                albumPhotos.forEach(photo => {
                    const imgUrl = photo.url;
                    const event = photo.event;
                    const isPinned = state.settings.pinnedPhotos && state.settings.pinnedPhotos.some(p => p.url === imgUrl);

                    let dateStr = "";
                    if (event.event_date) {
                        const d = new Date(event.event_date);
                        dateStr = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                    const polaroidDate = dateStr || "Kdysi dávno";

                    html += `
                        <div class="relative bg-[#fbfbfb] p-4 pb-12 shadow-xl border border-gray-200/50 rounded-sm hover:scale-105 hover:rotate-0 hover:z-30 transition-all duration-300 group cursor-pointer"
                             style="width: 240px; transform: rotate(${getStableRotation(imgUrl)}deg);">
                             <button onclick="event.stopPropagation(); Timeline.togglePinPhoto('${imgUrl}', '${event.id}', \`${event.title.replace(/'/g, "\\'")}\`, '${event.event_date || ''}')" 
                                     class="absolute -top-3 left-1/2 -translate-x-1/2 z-20 transition-transform active:scale-90"
                                     title="${isPinned ? 'Odepnout z nástěnky' : 'Připnout na nástěnku (max 3)'}">
                                 <i class="fas fa-thumbtack text-2xl ${isPinned ? 'text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] scale-110' : 'text-gray-400 opacity-60 md:opacity-0 md:group-hover:opacity-100 hover:text-red-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]'}"></i>
                             </button>
                             
                             <div class="w-full aspect-square overflow-hidden bg-gray-100 border border-gray-200" 
                                  onclick="Timeline.openGallery('${event.id}')">
                                 <img src="${imgUrl}" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
                             </div>
                             
                             <div class="mt-4 text-center px-2">
                                 <h4 class="font-bold text-gray-800 text-lg truncate" style="font-family: 'Indie Flower', cursive;">${event.title}</h4>
                                 <p class="text-xs text-gray-500 mt-1 select-none" style="font-family: 'Indie Flower', cursive;">${polaroidDate}</p>
                             </div>
                             
                             <div class="absolute inset-x-0 bottom-1 flex justify-center opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-gradient-to-t from-white via-white/90 to-transparent pt-4 pb-1">
                                 <button onclick="event.stopPropagation(); Timeline.jumpToTimeline('${event.id}')"
                                         class="text-xs text-[#5865F2] hover:text-[#4752c4] font-bold flex items-center gap-1">
                                     <i class="fas fa-eye"></i> Detail události
                                 </button>
                             </div>
                        </div>
                    `;
                });

                html += `</div>`;
            }
        } else {
            html += `<div class="space-y-10">`;

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
                        galleryBtn = `
                        <div class="mt-4 pt-4 border-t border-[#4f545c]/10"></div>
                    `;
                    }

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

            html += `</div>`;
        }

        html += `</div></div></div>`;
        container.innerHTML = html;

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
        body.style.maxHeight = (body.scrollHeight + 100) + "px";

        setTimeout(() => {
            if (!body.classList.contains('max-h-0')) body.style.maxHeight = 'none';
        }, 500);
    }
}

export function searchTimeline(query) {
    searchQuery = query;
    renderTimeline();
}

export function jumpToTimeline(id) {
    if (window.switchChannel) window.switchChannel('timeline');

    if (state.settings && state.settings.timelineViewMode === 'album') {
        state.settings.timelineViewMode = 'list';
        saveStateToCache();
    }

    setTimeout(() => {
        renderTimeline();
        
        setTimeout(() => {
            const element = document.getElementById(`timeline-event-${id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const body = element.querySelector('.card-body');
                if (body && body.classList.contains('max-h-0')) {
                    toggleTimelineCard(element);
                }
                element.classList.add('ring-4', 'ring-[#eb459e]', 'scale-105', 'transition-transform');
                setTimeout(() => {
                    element.classList.remove('ring-4', 'ring-[#eb459e]', 'scale-105');
                }, 1500);
            }
        }, 100);
    }, 200);
}

export function switchViewMode(mode) {
    if (!state.settings) state.settings = {};
    state.settings.timelineViewMode = mode;
    saveStateToCache();
    renderTimeline();
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
