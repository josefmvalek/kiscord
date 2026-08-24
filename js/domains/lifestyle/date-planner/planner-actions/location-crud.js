import { supabase } from '@core/supabase.js';
import { state, awardLoveCoinsToCurrentUser } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { selectLocation } from './location-detail.js';

export function showAddLocationModal(prefillData = null) {
    const lastMapClick = getLastMapClick();
    const coords = prefillData || lastMapClick;
    const selectedLocCat = coords.cat || 'view';
    setSelectedLocCat(selectedLocCat);
    const selectedCountry = getSelectedCountry();

    const modal = document.createElement('div');
    modal.id = 'location-add-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in';
    modal.innerHTML = renderAddLocationModalTemplate(coords, selectedCountry, selectedLocCat);
    
    document.body.appendChild(modal);
}

export async function saveNewLocation() {
    const name = document.getElementById('nl-name')?.value.trim();
    const desc = document.getElementById('nl-desc')?.value.trim();
    const icon = document.getElementById('nl-icon')?.value.trim() || '📍';
    const lat = parseFloat(document.getElementById('nl-lat')?.value);
    const lng = parseFloat(document.getElementById('nl-lng')?.value);
    const selectedCountry = getSelectedCountry();
    const country = document.getElementById('nl-country')?.value || selectedCountry;
    const cat = getSelectedLocCat() || 'view';
    
    if (!name || isNaN(lat) || isNaN(lng) || !cat) {
        showNotification("Vyplň prosím název místa a souřadnice!", "warning");
        return;
    }
    
    triggerHaptic('success');
    
    try {
        const { data: newLocs, error } = await safeInsert('date_locations', [{
            name: name,
            description: desc,
            icon: icon,
            lat: lat,
            lng: lng,
            category: cat,
            country: country
        }]);
        
        if (error) throw error;

        const newId = newLocs && newLocs.length > 0 ? newLocs[0].id : Date.now();

        const photoInput = document.getElementById('nl-photo');
        let photoUrl = null;
        if (photoInput && photoInput.files && photoInput.files[0] && navigator.onLine) {
            photoUrl = await uploadFile('location-photos', photoInput.files[0], `locations/${newId}`);
            if (photoUrl) {
                await supabase.from('date_locations').update({ image_url: photoUrl }).eq('id', newId);
            }
        }
        
        if (!state.dateLocations) state.dateLocations = [];
        state.dateLocations.push({
            id: newId,
            name,
            desc,
            icon,
            lat,
            lng,
            cat,
            image_url: photoUrl,
            country: country
        });
        
        showNotification(`Místo "${name}" bylo přidáno do mapy! 🎈`, "success");
        triggerConfetti();
        
        document.getElementById('location-add-modal')?.remove();
        
        const previewMarker = getPreviewMarker();
        if (previewMarker && state.mapInstance) {
            state.mapInstance.removeLayer(previewMarker);
            setPreviewMarker(null);
        }

        if (country !== selectedCountry) {
            switchCountry(country);
        } else {
            const countryLocations = state.dateLocations.filter(l => (l.country || 'CZ') === selectedCountry);
            renderMarkers(countryLocations);
            renderLocationList(countryLocations);
        }

        selectLocation(newId);
        
    } catch (err) {
        console.error("Save Location Error:", err);
        showNotification("Chyba při ukládání: " + err.message, "error");
    }
}

export function editLocation(id) {
    const loc = (state.dateLocations || []).find(l => String(l.id) === String(id));
    if (!loc) return;
    
    setSelectedLocCat(loc.cat || 'view');
    
    const modal = document.createElement('div');
    modal.id = 'location-edit-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in';
    modal.innerHTML = renderEditLocationModalTemplate(loc);
    
    document.body.appendChild(modal);
}

export async function saveEditedLocation(id) {
    const name = document.getElementById('el-name')?.value.trim();
    const desc = document.getElementById('el-desc')?.value.trim();
    const icon = document.getElementById('el-icon')?.value.trim() || '📍';
    const lat = parseFloat(document.getElementById('el-lat')?.value);
    const lng = parseFloat(document.getElementById('el-lng')?.value);
    const cat = getSelectedLocCat();
    
    if (!name || isNaN(lat) || isNaN(lng) || !cat) {
        showNotification("Vyplň název, kategorii a souřadnice!", "warning");
        return;
    }
    
    try {
        const updatePayload = {
            name: name,
            description: desc,
            icon: icon,
            lat: lat,
            lng: lng,
            category: cat
        };

        const { error } = await supabase.from('date_locations').update(updatePayload).eq('id', id);
        if (error) throw error;
        
        const localLoc = (state.dateLocations || []).find(l => String(l.id) === String(id));
        if (localLoc) {
            localLoc.name = name;
            localLoc.desc = desc;
            localLoc.icon = icon;
            localLoc.lat = lat;
            localLoc.lng = lng;
            localLoc.cat = cat;
        }
        
        showNotification("Místo bylo úspěšně upraveno! ✏️", "success");
        document.getElementById('location-edit-modal')?.remove();
        
        const selectedCountry = getSelectedCountry();
        const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
        renderLocationList(countryLocations);
        renderMarkers(countryLocations);
        selectLocation(id);
        
    } catch (err) {
        console.error("Save Edited Location Error:", err);
        showNotification("Chyba při ukládání: " + err.message, "error");
    }
}

export async function deleteLocation(id) {
    const ok = await showConfirmDialog('Opravdu chceš toto místo smazat z mapy? 🥺', 'Smazat', 'Zrušit');
    if (!ok) return;
    
    try {
        const { error } = await supabase.from('date_locations').delete().eq('id', id);
        if (error) throw error;
        
        state.dateLocations = (state.dateLocations || []).filter(l => String(l.id) !== String(id));
        if (state.route) {
            state.route = state.route.filter(l => String(l.id) !== String(id));
            updateRouteUI();
            renderRoutePolyline();
        }
        
        showNotification("Místo bylo smazáno z mapy. 🗑️", "info");
        closeLocationDetail();
        
        const selectedCountry = getSelectedCountry();
        const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
        renderLocationList(countryLocations);
        renderMarkers(countryLocations);
        
    } catch (err) {
        console.error("Delete Location Error:", err);
        showNotification("Chyba při mazání místa: " + err.message, "error");
    }
}

export async function uploadLocationMemory(event, locationId) {
    if (event) event.preventDefault();

    const titleInput = document.getElementById('memory-title');
    const dateInput = document.getElementById('memory-date');
    const iconInput = document.getElementById('memory-icon');
    const descInput = document.getElementById('memory-desc');
    const fileInput = document.getElementById('memory-file');
    const submitBtn = document.getElementById('memory-submit-btn');

    if (!titleInput || !dateInput || !fileInput) return;

    const title = titleInput.value.trim();
    const dateVal = dateInput.value;
    const icon = iconInput ? iconInput.value : "❤️";
    const desc = descInput ? descInput.value.trim() : "";
    const file = fileInput.files ? fileInput.files[0] : null;

    if (!title || !dateVal || !file) {
        showNotification("Vyplň prosím název, datum a vyber fotku!", "error");
        return;
    }

    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> Nahrávám vzpomínku...`;

    try {
        const newEventObj = {
            title: title,
            event_date: dateVal,
            icon: icon,
            color: '#eb459e',
            description: desc,
            images: [],
            location_id: Number(locationId),
            is_milestone: false,
            user_id: state.currentUser?.id
        };

        const { data: insertedEvents, error: insertError } = await safeInsert('timeline_events', [newEventObj]);
        if (insertError) throw insertError;

        const newEventId = insertedEvents && insertedEvents.length > 0 ? insertedEvents[0].id : Date.now();

        let uploadedPhotoUrl = null;
        if (navigator.onLine) {
            uploadedPhotoUrl = await uploadFile('timeline-photos', file, `events/${newEventId}`);
            if (uploadedPhotoUrl) {
                await supabase.from('timeline_events').update({ images: [uploadedPhotoUrl] }).eq('id', newEventId);
            }
        }

        if (!state.timelineEvents) state.timelineEvents = [];
        state.timelineEvents.unshift({
            id: newEventId,
            title: title,
            event_date: dateVal,
            icon: icon,
            color: '#eb459e',
            description: desc,
            images: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
            location_id: Number(locationId),
            is_milestone: false,
            user_highlights: ""
        });

        if (typeof playChime === 'function') playChime();
        if (typeof triggerConfetti === 'function') triggerConfetti();
        showNotification("Vzpomínka byla uložena! ❤️✨", "success");

        const updatedMemories = state.timelineEvents.filter(e => e.location_id);
        setMarkersMemories(updatedMemories);

        const selectedCountry = getSelectedCountry();
        const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
        renderMarkers(countryLocations);
        selectLocation(locationId);

    } catch (err) {
        console.error("Save Memory Error:", err);
        showNotification("Chyba při ukládání: " + err.message, "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
}

