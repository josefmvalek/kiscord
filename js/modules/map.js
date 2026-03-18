import { state } from '../core/state.js';
// import { dateLocations, timelineEvents } from '../data.js'; // Smazáno, nyní ze state
import { triggerHaptic, getTodayKey } from '../core/utils.js';
import { showNotification } from '../core/theme.js'; // Fallback or imported

// --- STATE ---
let selectedDateLocation = null;

// --- ROUTE LOGIC ---

export function addToRoute(id) {
    const loc = state.dateLocations.find(l => l.id === id);
    if (!loc) return;

    if (state.route.length >= 10) {
        if (window.showNotification) window.showNotification("Trasa je plná! (Max 10)", "error");
        return;
    }

    state.route.push(loc);
    updateRouteUI();
    if (window.showNotification) window.showNotification(`Přidáno: ${loc.name}`, "success");

    // Animate badge
    const badge = document.getElementById("route-count");
    if (badge) {
        badge.classList.add("scale-150", "text-[#eb459e]");
        setTimeout(() => badge.classList.remove("scale-150", "text-[#eb459e]"), 300);
    }
}

export function removeFromRoute(index) {
    state.route.splice(index, 1);
    updateRouteUI();
}

export function clearRoute() {
    state.route = [];
    updateRouteUI();
}

export function updateRouteUI() {
    const list = document.getElementById("route-list");
    const count = document.getElementById("route-count");
    if (!list || !count) return;

    count.innerText = state.route.length;

    if (state.route.length === 0) {
        list.innerHTML = '<div class="text-[10px] text-gray-500 italic text-center py-2">Vyber místa a klikni na "+ Přidat do trasy"</div>';
        return;
    }

    list.innerHTML = state.route.map((loc, i) => `
        <div class="flex items-center justify-between bg-[#202225] p-2 rounded border-l-2 border-[#eb459e] animate-fade-in group">
            <div class="flex items-center gap-2 overflow-hidden">
                <span class="text-[10px] bg-[#2f3136] text-gray-400 w-4 h-4 rounded-full flex items-center justify-center font-bold">${i + 1}</span>
                <span class="text-xs text-gray-200 truncate font-medium">${loc.name}</span>
            </div>
            <button onclick="import('./js/modules/map.js').then(m => m.removeFromRoute(${i}))" class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join("");
}

export function openGoogleMapsRoute() {
    if (state.route.length === 0) {
        if (window.showNotification) window.showNotification("Trasa je prázdná!", "error");
        return;
    }

    const origin = `${state.route[0].lat},${state.route[0].lng}`;
    const destination = `${state.route[state.route.length - 1].lat},${state.route[state.route.length - 1].lng}`;

    let waypoints = "";
    if (state.route.length > 2) {
        waypoints = "&waypoints=" + state.route.slice(1, -1).map(l => `${l.lat},${l.lng}`).join("|");
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
}

// --- EXPORTED FUNCTIONS ---

export function renderMap() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="flex h-full relative overflow-hidden">
            <!-- Sidebar (List & Route) -->
            <div id="planner-sidebar" class="w-80 bg-[#2f3136] flex flex-col border-r border-[#202225] absolute z-30 h-full transition-transform duration-300 transform -translate-x-full shadow-2xl">
                
                <!-- Sidebar Header -->
                <div class="p-4 bg-[#202225] border-b border-[#18191c] flex justify-between items-center">
                    <h2 class="text-white font-bold flex items-center gap-2">
                        <i class="fas fa-map-marked-alt text-[#5865F2]"></i> Plánovač
                    </h2>
                    <button onclick="document.getElementById('planner-sidebar').classList.add('-translate-x-full')" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- ROUTE SECTION -->
                <div class="bg-[#292b2f] p-3 border-b border-[#202225]">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-xs font-bold text-[#eb459e] flex items-center gap-1">
                            <i class="fas fa-map"></i> TRASA (<span id="route-count">0</span>)
                        </div>
                        <button onclick="import('./js/modules/map.js').then(m => m.clearRoute())" class="text-[10px] text-gray-400 hover:text-red-400 transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div id="route-list" class="space-y-1 mb-2">
                        <div class="text-[10px] text-gray-500 italic text-center py-2">Vyber místa a klikni na "+ Přidat do trasy"</div>
                    </div>
                    <button onclick="import('./js/modules/map.js').then(m => m.openGoogleMapsRoute())" class="w-full bg-[#202225] hover:bg-[#2f3136] text-gray-300 hover:text-white text-xs font-bold py-2 rounded transition border border-[#2f3136]">
                        Otevřít v Google Maps ↗
                    </button>
                </div>

                <!-- Filter & List Header -->
                <div class="p-2 bg-[#2f3136] text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-4">
                    Seznam míst
                </div>

                <!-- List -->
                <div id="location-list" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-[#2f3136]">
                    <!-- Items injected here -->
                </div>
            </div>

            <!-- Map Area -->
            <div class="flex-1 relative h-full bg-[#202225]">
                <div id="leaflet-map" class="w-full h-full z-10 outline-none"></div>

                <!-- OVERLAYS (Floating UI) -->
                <div class="absolute top-4 left-4 right-4 z-[20] flex flex-col gap-3 pointer-events-none max-w-xl mx-auto">
                    
                    <!-- Search & Actions Row -->
                    <div class="flex gap-2 pointer-events-auto shadow-xl">
                        <div class="flex-1 relative group">
                             <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i class="fas fa-search text-gray-400 group-focus-within:text-white transition"></i>
                            </div>
                            <input type="text" id="planner-search" placeholder="Kam vyrazíme?" 
                                oninput="import('./js/modules/map.js').then(m => m.searchLocations(this.value))"
                                class="w-full bg-[#2f3136] text-gray-200 placeholder-gray-500 text-sm rounded-lg pl-10 pr-4 py-3 border border-[#202225] outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition">
                        </div>
                        <button onclick="import('./js/modules/map.js').then(m => m.pickRandomLocation())" class="w-12 h-[46px] bg-[#eb459e] hover:bg-[#d63b8c] text-white rounded-lg shadow-lg flex items-center justify-center transition transform hover:scale-105 active:scale-95" title="Náhodné místo">
                            <i class="fas fa-dice text-xl"></i>
                        </button>
                        <button onclick="document.getElementById('planner-sidebar').classList.toggle('-translate-x-full')" class="w-12 h-[46px] bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-lg shadow-lg flex items-center justify-center transition transform hover:scale-105 active:scale-95">
                            <i class="fas fa-list text-xl"></i>
                        </button>
                    </div>

                    <!-- Filters Row -->
                    <div class="flex gap-2 overflow-x-auto pointer-events-auto no-scrollbar pb-1 mask-linear-fade">
                        <button onclick="import('./js/modules/map.js').then(m => m.filterMap('all'))" data-filter="all" class="filter-btn active whitespace-nowrap px-4 py-1.5 rounded-full bg-[#5865F2] text-white text-xs font-bold shadow-md transition transform hover:scale-105">
                            Vše
                        </button>
                        <button onclick="import('./js/modules/map.js').then(m => m.filterMap('walk'))" data-filter="walk" class="filter-btn whitespace-nowrap px-4 py-1.5 rounded-full bg-[#2f3136] text-gray-300 border border-[#202225] text-xs font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1">
                            <i class="fas fa-tree text-[#3ba55c]"></i> Procházky
                        </button>
                        <button onclick="import('./js/modules/map.js').then(m => m.filterMap('view'))" data-filter="view" class="filter-btn whitespace-nowrap px-4 py-1.5 rounded-full bg-[#2f3136] text-gray-300 border border-[#202225] text-xs font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1">
                            <i class="fas fa-binoculars text-[#eb459e]"></i> Výhledy
                        </button>
                        <button onclick="import('./js/modules/map.js').then(m => m.filterMap('fun'))" data-filter="fun" class="filter-btn whitespace-nowrap px-4 py-1.5 rounded-full bg-[#2f3136] text-gray-300 border border-[#202225] text-xs font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1">
                            <i class="fas fa-bolt text-[#ed4245]"></i> Zábava
                        </button>
                         <button onclick="import('./js/modules/map.js').then(m => m.filterMap('food'))" data-filter="food" class="filter-btn whitespace-nowrap px-4 py-1.5 rounded-full bg-[#2f3136] text-gray-300 border border-[#202225] text-xs font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1">
                            <i class="fas fa-utensils text-[#faa61a]"></i> Jídlo
                        </button>
                    </div>
                </div>
                
                <!-- Bottom Sheet / Detail Panel -->
                <div id="detail-panel" class="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#36393f] rounded-xl shadow-2xl z-[40] transition-all duration-300 translate-y-[120%] flex flex-col max-h-[70vh] border border-[#202225]">
                    <!-- Content injected by selectLocation -->
                </div>
            </div>
        </div>
    `;

    // Initialize Map logic
    setTimeout(async () => {
        if (state.mapInstance) {
            state.mapInstance.remove();
            state.mapInstance = null;
        }

        const map = L.map("leaflet-map", { zoomControl: false }).setView([49.069, 17.464], 13);
        state.mapInstance = map;

        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            {
                attribution: "© OpenStreetMap © CARTO",
                subdomains: "abcd",
                maxZoom: 19,
            },
        ).addTo(map);

        await fetchMarkersMemories();
        renderMarkers(state.dateLocations);
        renderLocationList(state.dateLocations);
        updateRouteUI();
    }, 100);
}

export function renderMarkers(locations) {
    if (!state.mapInstance) return;

    state.mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            state.mapInstance.removeLayer(layer);
        }
    });

    locations.forEach((loc) => {
        let color = "#5865F2";
        let iconClass = "fa-map-marker-alt";
        if (loc.cat === "food") { color = "#faa61a"; iconClass = "fa-utensils"; }
        if (loc.cat === "view") { color = "#eb459e"; iconClass = "fa-binoculars"; }
        if (loc.cat === "walk") { color = "#3ba55c"; iconClass = "fa-tree"; }
        if (loc.cat === "fun") { color = "#ed4245"; iconClass = "fa-bolt"; }

        const rating = state.dateRatings[loc.id] || 0;
        if (rating === 5) { color = "#ffd700"; iconClass = "fa-heart"; }

        // Fetch memory from Supabase (using a simple local cache or just dbEvents if we can)
        // For now, we'll try to find it in the data we already might have or fetch it
        // To keep it simple and performant, we'll use a small optimization:
        // We can fetch all timeline events with location_id once in renderMarkers.
        
        const memory = markersMemories.find(e => String(e.location_id) === String(loc.id));

        let markerHtml = `<div class="marker-pin" style="background-color: ${color};"><i class="fas ${iconClass}"></i></div>`;
        if (memory) {
            markerHtml = `<div class="marker-pin" style="background-color: ${color}; box-shadow: 0 0 10px #eb459e;"><i class="fas fa-heart text-white animate-pulse"></i></div>`;
        }

        const customIcon = L.divIcon({
            className: "custom-div-icon",
            html: markerHtml,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -35],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(state.mapInstance);

        const starStr = rating > 0 ? `<br><span style="color:#faa61a; font-size:14px; letter-spacing:2px;">${"★".repeat(rating)}</span>` : "";

        let popupContent = `
        <div style="text-align:center; min-width: 150px;">
            <b style="color:#fff;font-size:14px">${loc.name}</b>
            ${starStr}<br>
            <span style="font-size:11px;color:#b9bbbe; display:block; margin-bottom: 5px;">${loc.desc || ""}</span>`;

        if (memory) {
            popupContent += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #4f545c;">
                <div style="color:#eb459e; font-weight:bold; font-size:10px; text-transform:uppercase; margin-bottom:2px;">
                    <i class="fas fa-history"></i> Naše Vzpomínka
                </div>
                <div style="color:#fff; font-size:12px; font-weight:bold;">${memory.event_date || ''}</div>
                <div style="color:#dcddde; font-size:11px; font-style:italic;">"${memory.title}"</div>
                
                <button onclick="import('./js/modules/timeline.js').then(m => m.jumpToTimeline('${memory.id}'))" style="margin-top: 5px; background: #eb459e; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer; width: 100%;">
                    <i class="fas fa-external-link-alt"></i> Přejít na vzpomínku
                </button>
            </div>`;
        }
        popupContent += `</div>`;

        marker.bindPopup(popupContent);
        marker.on("click", () => selectLocation(loc.id));
    });
}

let markersMemories = [];
export async function fetchMarkersMemories() {
    try {
        const { supabase } = await import('../core/supabase.js');
        const { data } = await supabase.from('timeline_events').select('id, title, event_date, location_id');
        markersMemories = data || [];
    } catch (e) {
        console.error("Failed to fetch memories for markers", e);
    }
}

// Scavenger Hunt Logic (Simplified)

export function renderLocationList(locations) {
    const listContainer = document.getElementById("location-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const sortedLocs = [...locations].sort((a, b) => {
        const rateA = state.dateRatings[a.id] || 0;
        const rateB = state.dateRatings[b.id] || 0;
        return rateB - rateA;
    });

    if (sortedLocs.length === 0) {
        listContainer.innerHTML = '<div class="text-gray-500 text-xs text-center p-4">Nic nenalezeno... 🔍</div>';
        return;
    }

    sortedLocs.forEach((loc) => {
        const icons = { view: "⛰️", food: "🍔", fun: "⚡", walk: "🌲" };
        let icon = icons[loc.cat] || "📍";
        const rating = state.dateRatings[loc.id] || 0;
        let ratingHtml = rating > 0 ? `<div class="text-[#faa61a] text-[10px] mt-0.5">${"★".repeat(rating)}</div>` : "";
        const borderClass = rating > 0 ? "border-[#faa61a]/50" : "border-[#202225]";

        listContainer.innerHTML += `
        <div onclick="import('./js/modules/map.js').then(m => m.selectLocation(${loc.id}))" class="p-3 bg-[#36393f] hover:bg-[#40444b] rounded cursor-pointer transition flex items-center gap-3 border ${borderClass} group mb-1 relative overflow-hidden">
            ${rating > 0 ? '<div class="absolute top-0 right-0 w-3 h-3 bg-[#faa61a] rounded-bl-lg"></div>' : ""}
            <div class="text-lg group-hover:scale-110 transition">${icon}</div>
            <div class="min-w-0">
                <div class="font-bold text-gray-200 text-sm truncate">${loc.name}</div>
                <div class="text-[10px] text-gray-500 truncate">${loc.desc || ""}</div>
                ${ratingHtml}
            </div>
        </div>`;
    });
}

export function filterMap(category) {
    // Clear search
    const mobileSearch = document.getElementById("planner-search-mobile");
    const desktopSearch = document.getElementById("planner-search-desktop");
    if (mobileSearch) mobileSearch.value = "";
    if (desktopSearch) desktopSearch.value = "";

    const filtered = category === "all" ? state.dateLocations : state.dateLocations.filter((l) => l.cat === category);
    renderLocationList(filtered);
    renderMarkers(filtered);

    // Update Buttons
    const buttons = document.querySelectorAll(".filter-btn");
    const activeColors = { all: "bg-[#5865F2]", view: "bg-[#eb459e]", fun: "bg-[#ed4245]", food: "bg-[#faa61a]", walk: "bg-[#3ba55c]" };

    buttons.forEach((btn) => {
        const btnCat = btn.getAttribute("data-filter");
        const isActive = btnCat === category;

        btn.className = btn.className
            .replace(/bg-\[#\w+\]/g, "")
            .replace("text-white", "")
            .replace("text-gray-300", "")
            .replace("shadow-lg", "")
            .replace("scale-105", "");

        if (isActive) {
            btn.classList.add(activeColors[btnCat], "text-white", "shadow-lg", "scale-105");
            btn.classList.remove("bg-[#202225]/90");
        } else {
            btn.classList.add("text-gray-400");
            if (btn.classList.contains("backdrop-blur")) btn.classList.add("bg-[#202225]/90");
            else btn.classList.add("bg-[#202225]");
        }
    });
}

export function selectLocation(id) {
    const loc = dateLocations.find((l) => l.id === id);
    if (!loc) return;
    selectedDateLocation = loc;

    const sidebar = document.getElementById("planner-sidebar");
    if (sidebar && window.innerWidth < 768) sidebar.classList.add("-translate-x-full");

    const panel = document.getElementById("detail-panel");
    if (!panel) return;

    // Show panel
    panel.style.transform = "translateY(0)";

    // Rating Logic
    const currentRating = state.dateRatings[loc.id] || 0;
    const notes = ["Nic moc 😕", "Ušlo to 🙂", "Dobrý! 😃", "Super rande! 😍", "Best date ever! 💍"];
    const noteText = currentRating > 0 ? notes[currentRating - 1] : "";

    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
        const color = i <= currentRating ? "text-[#faa61a]" : "text-gray-600";
        starsHtml += `<i class="fas fa-star ${color} cursor-pointer hover:text-yellow-400 transition" onclick="import('./js/modules/map.js').then(m => m.rateDate(${loc.id}, ${i}))"></i>`;
    }

    // Google Maps URL
    let mapsUrl = loc.url ? loc.url : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(loc.name + " Česká republika");

    panel.innerHTML = `
        <!-- Handle -->
        <div id="sheet-handle" class="w-full h-6 flex items-center justify-center cursor-grab active:cursor-grabbing border-b border-[#202225] hover:bg-[#2f3136] rounded-t-xl" onclick="document.getElementById('detail-panel').style.transform='translateY(120%)'">
            <div class="w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>
        
        <!-- Close -->
        <button onclick="document.getElementById('detail-panel').style.transform='translateY(120%)'" class="absolute top-2 right-4 text-gray-400 hover:text-white p-2 z-10">
            <i class="fas fa-times"></i>
        </button>

        <div class="p-6 overflow-y-auto max-h-[70vh]">
            <!-- Header & Weather -->
            <div class="mb-2">
                <h3 class="text-2xl font-bold text-white leading-tight mb-1">${loc.name}</h3>
                <div class="flex items-center gap-2 text-xs text-gray-400">
                    <i class="fas fa-sun text-yellow-500"></i>
                    <span class="font-medium">-1°C • Jasno</span>
                </div>
            </div>

            <p class="text-gray-400 text-sm mb-4 leading-relaxed">${loc.desc || ""}</p>

            <!-- Rating -->
            <div class="flex items-center gap-2 mb-6 bg-[#202225] p-2 rounded-lg border border-[#2f3136]">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">HODNOCENÍ:</span>
                <div class="flex text-lg gap-0.5">${starsHtml}</div>
                ${noteText ? `<span class="text-[#faa61a] text-[10px] font-bold italic ml-2 animate-fade-in">${noteText}</span>` : ''}
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-3 gap-3 mb-6">
                <button onclick="import('./js/modules/map.js').then(m => m.addToRoute(${loc.id}))" class="bg-[#5865F2] hover:bg-[#4752c4] text-white py-2.5 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95">
                    <i class="fas fa-plus"></i> Přidat
                </button>
                <button onclick="window.showNotification('Galerie se připravuje 📸', 'info')" class="bg-[#2f3136] hover:bg-[#36393f] text-gray-300 hover:text-white border border-[#202225] py-2.5 rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition">
                    <i class="fas fa-images text-[#eb459e]"></i> Fotky (0)
                </button>
                <a href="${mapsUrl}" target="_blank" class="bg-[#2f3136] hover:bg-[#36393f] text-gray-300 hover:text-white border border-[#202225] py-2.5 rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition">
                    <i class="fas fa-external-link-alt"></i> Mapa
                </a>
            </div>

            <!-- Date Planner Section -->
            <div class="bg-[#202225] rounded-xl p-4 border border-[#2f3136] shadow-inner">
                <div class="mb-4">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Kdy to vidíš?</label>
                    <div class="flex gap-2">
                        <input type="datetime-local" id="date-input" class="flex-1 bg-[#2f3136] text-white text-sm p-2.5 rounded-lg border border-[#202225] outline-none focus:border-[#eb459e] focus:bg-[#36393f] transition h-10">
                        <button onclick="import('./js/modules/map.js').then(m => m.saveDateToCalendar())" class="w-10 h-10 bg-[#5865F2] text-white rounded-lg flex items-center justify-center hover:bg-[#4752c4] transition shadow-lg" title="Uložit do kalendáře">
                            <i class="far fa-calendar-plus text-lg"></i>
                        </button>
                    </div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Poznámka</label>
                    <div class="flex gap-2">
                         <input type="text" id="note-input" placeholder="Dáme pak kafe?" class="flex-1 bg-[#2f3136] text-white text-sm p-2.5 rounded-lg border border-[#202225] outline-none focus:border-[#3ba55c] focus:bg-[#36393f] transition">
                         <button onclick="import('./js/modules/map.js').then(m => m.saveDateToCalendar())" class="w-10 h-10 bg-[#3ba55c] text-white rounded-lg flex items-center justify-center hover:bg-[#2d7d46] shadow-lg transition transform hover:scale-105 active:scale-95">
                            <i class="fas fa-save"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // FlyTo with Center Offset
    if (state.mapInstance) {
        // Calculate offset to show map above the panel
        const mapContainer = document.getElementById("leaflet-map");
        if (mapContainer) {
            const mapHeight = mapContainer.offsetHeight;
            const targetPoint = state.mapInstance.project([loc.lat, loc.lng], 16);
            // Smaller offset (0.15 instead of 0.25) to prevent cutting off from top
            const pointOffset = new L.Point(0, mapHeight * 0.15);
            const newCenter = state.mapInstance.unproject(targetPoint.add(pointOffset), 16);

            state.mapInstance.flyTo(newCenter, 16, {
                animate: true,
                duration: 1.5
            });
        } else {
            state.mapInstance.flyTo([loc.lat, loc.lng], 16);
        }
    }
}

export async function rateDate(id, rating) {
    // Toggle Logic: If clicking the same rating, remove it (set to 0)
    if (state.dateRatings[id] === rating) {
        delete state.dateRatings[id];
        rating = 0;
    } else {
        state.dateRatings[id] = rating;
    }

    // Save to Supabase
    try {
        const { supabase } = await import('../core/supabase.js');
        if (rating === 0) {
            await supabase.from('date_ratings').delete().eq('location_id', id);
        } else {
            await supabase.from('date_ratings').upsert({
                location_id: id,
                rating: rating,
                user_id: state.currentUser?.id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'location_id' });
        }
    } catch (err) {
        console.error('Failed to save date rating:', err);
    }

    triggerHaptic("success");

    // Refresh UI
    selectLocation(id);
    renderLocationList(state.dateFilter === 'all' ? state.dateLocations : state.dateLocations.filter(l => l.cat === state.dateFilter));
    renderMarkers(state.dateFilter === 'all' ? state.dateLocations : state.dateLocations.filter(l => l.cat === state.dateFilter));
}

export async function saveDateToCalendar() {
    const dateInput = document.getElementById("date-input").value;
    const noteInput = document.getElementById("note-input")?.value || "";

    if (!dateInput || !selectedDateLocation) {
        if (window.showNotification) window.showNotification("Vyber datum a místo!", "error");
        return;
    }

    const dateKey = dateInput.split("T")[0];
    if (!state.plannedDates) state.plannedDates = {};

    const planEntry = {
        id: selectedDateLocation.id,
        name: selectedDateLocation.name,
        cat: selectedDateLocation.cat,
        time: dateInput.split("T")[1],
        note: noteInput
    };
    state.plannedDates[dateKey] = planEntry;

    // Save to Supabase
    try {
        const { supabase } = await import('../core/supabase.js');
        await supabase.from('planned_dates').upsert({
            date_key: dateKey,
            name: planEntry.name,
            cat: planEntry.cat,
            time: planEntry.time,
            note: planEntry.note,
            updated_at: new Date().toISOString()
        }, { onConflict: 'date_key' });
    } catch (err) {
        console.error('Failed to save planned date:', err);
    }

    if (window.showNotification) window.showNotification("Rande uloženo do kalendáře! 📅", "success");

    // Refresh to show saved state if needed, or close panel
    document.getElementById('detail-panel').style.transform = 'translateY(120%)';
}

export function pickRandomLocation() {
    // Basic implementation based on script.js
    const candidates = state.dateLocations; // Apply filter if needed taking from DOM
    if (candidates.length === 0) return;
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    selectLocation(winner.id);
    if (window.showNotification) window.showNotification(`🎲 Kostka vybrala: ${winner.name}`, "success");
}

export function searchLocations(query) {
    const term = query.toLowerCase();
    const filtered = state.dateLocations.filter(l => l.name.toLowerCase().includes(term) || l.desc.toLowerCase().includes(term));
    renderLocationList(filtered);
    renderMarkers(filtered);
}
export function jumpToLocation(id) {
    const loc = state.dateLocations.find(l => l.id === id);
    if (!loc || !state.mapInstance) return;
    
    // Switch to map channel if not already there
    if (window.switchChannel) window.switchChannel('map');
    
    // Fly to location
    setTimeout(() => {
        state.mapInstance.flyTo([loc.lat, loc.lng], 16, {
            animate: true,
            duration: 1.5
        });
        
        // Open popup
        state.mapInstance.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                const latLng = layer.getLatLng();
                if (latLng.lat === loc.lat && latLng.lng === loc.lng) {
                    layer.openPopup();
                }
            }
        });
    }, 100);
}
