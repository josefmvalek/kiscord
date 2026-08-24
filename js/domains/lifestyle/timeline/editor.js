import { state, saveStateToCache, awardLoveCoinsToCurrentUser } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { triggerConfetti } from '@core/utils.js';
import { safeInsert } from '@core/offline.js';
import { uploadFile } from '@core/storage.js';

export const CATEGORIZED_ICONS = {
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

export function openEventModal(eventId = null, eventsList = []) {
    let modal = document.getElementById("event-crud-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "event-crud-modal";
        modal.className = "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4";
        modal.style.display = "none";
        document.body.appendChild(modal);
    }

    const idNum = eventId ? Number(eventId) : null;
    const event = idNum ? eventsList.find(e => Number(e.id) === idNum) : null;
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

export function closeEventModal() {
    const modal = document.getElementById("event-crud-modal");
    if (modal) modal.style.display = "none";
}

export async function saveEvent(eventId, refreshFn) {
    const titleValue = document.getElementById("edit-title")?.value;
    const dateValue = document.getElementById("edit-date")?.value || null;
    const iconValue = document.getElementById("edit-icon")?.value || "fa-heart";
    const descValue = document.getElementById("edit-desc")?.value;

    if (!titleValue) return showNotification("Název je povinný!", "error");

    const idNum = eventId ? Number(eventId) : null;
    const eventData = {
        title: titleValue,
        event_date: dateValue,
        icon: iconValue,
        description: descValue,
        color: idNum ? (state.timelineEvents?.find(e => Number(e.id) === idNum)?.color || "#5865F2") : "#5865F2"
    };

    try {
        let finalEventId = eventId;
        let isNew = !eventId;
        let result;

        if (isNew) {
            result = await safeInsert('timeline_events', eventData);
            if (result.error) throw result.error;

            if (result.offline) {
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
            result = await supabase.from('timeline_events').update(eventData).eq('id', eventId).select();
            if (result.error) throw result.error;
        }

        const photoInput = document.getElementById('edit-photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            if (!navigator.onLine) {
                showNotification("Fotku nelze nahrát offline. Vzpomínka uložena bez fotky.", "warning");
            } else if (finalEventId) {
                try {
                    const file = photoInput.files[0];
                    const publicUrl = await uploadFile('timeline-photos', file, `events/${finalEventId}`);

                    if (publicUrl) {
                        const currentEvent = (state.timelineEvents || []).find(e => String(e.id) === String(finalEventId)) || { images: [] };
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

        if (isNew) {
            triggerConfetti();
            await awardLoveCoinsToCurrentUser(10, 'Nová vzpomínka v Timeline! 📸❤️');
        }

        showNotification(isNew ? "Nová vzpomínka přidána! ❤️" : "Vzpomínka upravena ✨", "success");
        closeEventModal();

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
        if (refreshFn) refreshFn();

    } catch (err) {
        console.error("Save Event Error:", err);
        showNotification("Chyba při ukládání.", "error");
    }
}

export async function deleteEvent(eventId, refreshFn) {
    const ok = await showConfirmDialog('Fakt chceš tuhle vzpomínku smazat? 🥺', 'Smazat', 'Zrušit');
    if (!ok) return;

    try {
        const idNum = Number(eventId);
        const { error } = await supabase.from('timeline_events').delete().eq('id', idNum);
        if (error) throw error;

        state.timelineEvents = state.timelineEvents.filter(e => Number(e.id) !== idNum);
        saveStateToCache();
        showNotification("Vzpomínka smazána.", "info");
        closeEventModal();
        if (refreshFn) refreshFn();
    } catch (err) {
        console.error("Delete Event Error:", err);
        showNotification("Chyba při mazání.", "error");
    }
}

export async function saveHighlight(eventId, text) {
    try {
        const { error } = await supabase
            .from('timeline_events')
            .update({ user_highlights: text })
            .eq('id', eventId);

        if (error) throw error;

        const idNum = Number(eventId);
        const ev = state.timelineEvents.find(e => Number(e.id) === idNum);
        if (ev) ev.user_highlights = text;

        showNotification('Poznámka uložena ✨', 'success');
    } catch (e) {
        console.error("Error saving highlight:", e);
        showNotification('Chyba při ukládání poznámky', 'error');
    }
}

export async function toggleMilestone(eventId, status, refreshFn) {
    try {
        const { error } = await supabase
            .from('timeline_events')
            .update({ is_milestone: status })
            .eq('id', eventId);

        if (error) throw error;

        const idNum = Number(eventId);
        const ev = (state.timelineEvents || []).find(e => Number(e.id) === idNum);
        if (ev) ev.is_milestone = status;

        if (status) {
            triggerConfetti();
        }

        if (refreshFn) refreshFn();

    } catch (err) {
        console.error("Toggle Milestone Error:", err);
    }
}

export async function uploadPhoto(eventId, input, refreshFn) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const btn = input.previousElementSibling;
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> Nahrávám...`;
    btn.disabled = true;

    try {
        const publicUrl = await uploadFile('timeline-photos', file, `timeline/${eventId}`);
        if (!publicUrl) throw new Error("Nepodařilo se získat URL po nahrání.");

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

        if (refreshFn) refreshFn();
        showNotification('Fotka úspěšně nahrána! 📸', 'success');
    } catch (err) {
        console.error("Upload Error:", err);
        showNotification('Nahrávání se nepovedlo. Zkontroluj bucket timeline-photos.', 'error');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}
