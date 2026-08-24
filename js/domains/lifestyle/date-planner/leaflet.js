/**
 * Leaflet Map Renderer & Location Markers
 */

import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { 
    getSelectedCountry, 
    setSelectedCountry, 
    getPreviewMarker, 
    getMarkersMemories, 
    setMarkersMemories 
} from './state.js';

export function renderMarkers(locations) {
    if (!state.mapInstance) return;

    const previewMarker = getPreviewMarker();
    const markersMemories = getMarkersMemories();

    state.mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer !== previewMarker) {
            state.mapInstance.removeLayer(layer);
        }
    });

    (locations || []).forEach((loc) => {
        let color = "#5865F2";
        let iconClass = "fa-map-marker-alt";
        if (loc.cat === "food") { color = "#faa61a"; iconClass = "fa-utensils"; }
        if (loc.cat === "view") { color = "#eb459e"; iconClass = "fa-binoculars"; }
        if (loc.cat === "walk") { color = "#3ba55c"; iconClass = "fa-tree"; }
        if (loc.cat === "fun") { color = "#ed4245"; iconClass = "fa-bolt"; }

        const rating = (state.dateRatings && state.dateRatings[loc.id]) || 0;
        if (rating === 5) { color = "#ffd700"; iconClass = "fa-heart"; }

        const memory = (markersMemories || []).find(e => String(e.location_id) === String(loc.id));

        let markerHtml = `<div class="marker-pin" style="background-color: ${color};"><i class="fas ${iconClass}"></i></div>`;
        if (memory) {
            markerHtml = `<div class="marker-pin" style="background-color: ${color}; box-shadow: 0 0 15px #eb459e;"><i class="fas fa-heart text-white animate-pulse"></i></div>`;
        }

        const customIcon = L.divIcon({
            className: "custom-div-icon",
            html: markerHtml,
            iconSize: [32, 44],
            iconAnchor: [16, 44],
            popupAnchor: [0, -38],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(state.mapInstance);

        const starStr = rating > 0 ? `<div style="color:#faa61a; font-size:13px; margin: 2px 0;">${"★".repeat(rating)}</div>` : "";

        let popupContent = `
        <div style="text-align:center; min-width: 160px; font-family: inherit;">
            <b style="color:#fff; font-size:14px;">${loc.name}</b>
            ${starStr}
            <span style="font-size:11px; color:#b9bbbe; display:block; margin: 3px 0;">${loc.desc || loc.address || ""}</span>
        `;

        if (memory) {
            popupContent += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #4f545c;">
                <div style="color:#eb459e; font-weight:bold; font-size:10px; text-transform:uppercase;">
                    <i class="fas fa-history"></i> Naše Vzpomínka
                </div>
                <div style="color:#fff; font-size:11px; font-weight:bold;">${memory.event_date || ''}</div>
                <div style="color:#dcddde; font-size:11px; font-style:italic;">"${memory.title}"</div>
            </div>`;
        }

        popupContent += `
            <button onclick="window.KiscordMap.selectLocation('${loc.id}')" style="margin-top: 8px; background: #5865F2; color: white; border: none; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: bold; cursor: pointer; width: 100%;">
                Detail & Plán rande ➔
            </button>
        </div>`;

        marker.bindPopup(popupContent);
        marker.on("click", () => {
            if (window.KiscordMap?.selectLocation) {
                window.KiscordMap.selectLocation(loc.id);
            }
        });
    });
}

export async function fetchMarkersMemories() {
    if (state.timelineEvents && state.timelineEvents.length > 0) {
        const memories = state.timelineEvents.filter(e => e.location_id);
        setMarkersMemories(memories);
        return;
    }
    try {
        const { data } = await supabase.from('timeline_events').select('id, title, event_date, location_id').not('location_id', 'is', null);
        setMarkersMemories(data || []);
    } catch (e) {
        console.error("Failed to fetch memories for markers", e);
    }
}

export function renderLocationList(locations) {
    const listContainer = document.getElementById("location-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const sortedLocs = [...(locations || [])].sort((a, b) => {
        const rateA = (state.dateRatings && state.dateRatings[a.id]) || 0;
        const rateB = (state.dateRatings && state.dateRatings[b.id]) || 0;
        return rateB - rateA;
    });

    if (sortedLocs.length === 0) {
        listContainer.innerHTML = `
            <div class="text-gray-400 text-xs text-center p-6 bg-[#202225]/40 rounded-2xl border border-dashed border-[#202225]">
                <i class="fas fa-map-marker-alt text-2xl text-gray-500 mb-2 block"></i>
                Zatím tu nejsou žádná místa odpovídající filtru.<br>Vyhledej nebo přidej nové místo nahoře! 📍
            </div>
        `;
        return;
    }

    sortedLocs.forEach((loc) => {
        const icons = { view: "⛰️", food: "🍔", fun: "⚡", walk: "🌲" };
        let icon = loc.icon || icons[loc.cat] || "📍";
        const rating = (state.dateRatings && state.dateRatings[loc.id]) || 0;
        let ratingHtml = rating > 0 ? `<div class="text-[#faa61a] text-[10px] font-bold mt-0.5">${"★".repeat(rating)}</div>` : "";
        const borderClass = rating > 0 ? "border-[#faa61a]/40" : "border-white/5";

        listContainer.innerHTML += `
        <div onclick="window.KiscordMap.selectLocation('${loc.id}')" class="p-3 bg-[#36393f] hover:bg-[#40444b] rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-3 border ${borderClass} group relative overflow-hidden shadow-sm hover:scale-[1.01]">
            ${rating > 0 ? '<div class="absolute top-0 right-0 w-3.5 h-3.5 bg-[#faa61a] rounded-bl-lg"></div>' : ""}
            <div class="text-2xl group-hover:scale-110 transition-transform flex-shrink-0 w-10 h-10 rounded-xl bg-[#202225] flex items-center justify-center">${icon}</div>
            <div class="min-w-0 flex-1">
                <div class="font-bold text-gray-100 text-sm truncate group-hover:text-white">${loc.name}</div>
                <div class="text-[11px] text-gray-400 truncate">${loc.desc || loc.address || ""}</div>
                ${ratingHtml}
            </div>
            <i class="fas fa-chevron-right text-xs text-gray-500 group-hover:text-[#5865F2] group-hover:translate-x-0.5 transition-all"></i>
        </div>`;
    });
}

export function filterMap(category = 'all') {
    state.dateFilter = category;
    const selectedCountry = getSelectedCountry();
    const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
    const filtered = category === 'all' ? countryLocations : countryLocations.filter(l => l.cat === category);
    renderLocationList(filtered);
    renderMarkers(filtered);

    // Update Buttons
    const buttons = document.querySelectorAll(".filter-btn");
    const activeColors = {
        all: "bg-[#5865F2]", view: "bg-[#eb459e]", fun: "bg-[#ed4245]", food: "bg-[#faa61a]", walk: "bg-[#3ba55c]"
    };

    buttons.forEach((btn) => {
        const btnCat = btn.getAttribute("data-filter");
        const isActive = btnCat === category;

        btn.className = btn.className
            .replace(/bg-\[#\w+\]/g, "")
            .replace(/bg-\w+-\d+/g, "")
            .replace("text-white", "")
            .replace("text-gray-300", "")
            .replace("shadow-lg", "")
            .replace("scale-105", "");

        if (isActive) {
            btn.classList.add(activeColors[btnCat] || "bg-[#5865F2]", "text-white", "shadow-lg", "scale-105");
            btn.classList.remove("bg-[#2f3136]/90");
        } else {
            btn.classList.add("text-gray-300", "bg-[#2f3136]/90");
        }
    });
}

export function switchCountry(country) {
    setSelectedCountry(country);
    const selectedCountry = country;
    
    const btnCz = document.getElementById("country-btn-cz");
    const btnAt = document.getElementById("country-btn-at");
    if (btnCz && btnAt) {
        if (selectedCountry === 'CZ') {
            btnCz.className = "country-btn px-2.5 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1 bg-[#5865F2] text-white shadow-sm";
            btnAt.className = "country-btn px-2.5 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1 text-gray-400 hover:text-white";
        } else {
            btnCz.className = "country-btn px-2.5 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1 text-gray-400 hover:text-white";
            btnAt.className = "country-btn px-2.5 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1 bg-[#eb459e] text-white shadow-sm";
        }
    }

    if (state.mapInstance) {
        const centerCoords = selectedCountry === 'CZ' ? [49.069, 17.464] : [47.28358, 12.81648];
        const centerZoom = selectedCountry === 'CZ' ? 13 : 12;
        state.mapInstance.flyTo(centerCoords, centerZoom, { animate: true, duration: 1.2 });
    }

    const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
    renderLocationList(countryLocations);
    renderMarkers(countryLocations);
}
