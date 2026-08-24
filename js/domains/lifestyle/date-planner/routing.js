/**
 * Date Route Planner & Distance Math Module
 */

import { state } from '@core/state.js';
import { safeUpsert } from '@core/offline.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { getRoutePolyline, setRoutePolyline } from './state.js';

/**
 * Calculate Haversine distance between two coordinates in km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate total route stats
 */
export function calculateRouteStats(stops) {
    if (!stops || stops.length < 2) {
        return { distanceKm: 0, distanceFormatted: '0 km', walkingTimeFormatted: '0 min', drivingTimeFormatted: '0 min' };
    }

    let totalKm = 0;
    for (let i = 0; i < stops.length - 1; i++) {
        totalKm += calculateDistance(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng);
    }

    const walkingHours = totalKm / 4.5;
    const walkingMins = Math.round(walkingHours * 60);
    const drivingHours = totalKm / 50;
    const drivingMins = Math.max(5, Math.round(drivingHours * 60));

    const distanceFormatted = totalKm < 1 ? `${Math.round(totalKm * 1000)} m` : `${totalKm.toFixed(1)} km`;
    const walkingTimeFormatted = walkingMins > 60 ? `${Math.floor(walkingMins / 60)}h ${walkingMins % 60}m` : `${walkingMins} min`;
    const drivingTimeFormatted = drivingMins > 60 ? `${Math.floor(drivingMins / 60)}h ${drivingMins % 60}m` : `${drivingMins} min`;

    return {
        distanceKm: totalKm,
        distanceFormatted,
        walkingTimeFormatted,
        drivingTimeFormatted
    };
}

/**
 * Draw or update the visual polyline connecting all route stops on Leaflet map
 */
export function renderRoutePolyline() {
    if (!state.mapInstance || typeof L === 'undefined') return;

    let polyline = getRoutePolyline();
    if (polyline) {
        state.mapInstance.removeLayer(polyline);
        setRoutePolyline(null);
    }

    const route = state.route || [];
    if (route.length < 2) return;

    const latlngs = route.map(loc => [loc.lat, loc.lng]);
    const stats = calculateRouteStats(route);

    polyline = L.polyline(latlngs, {
        color: '#eb459e',
        weight: 5,
        opacity: 0.9,
        dashArray: '10, 12',
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(state.mapInstance);
    setRoutePolyline(polyline);

    polyline.bindPopup(`
        <div style="text-align:center; font-family: inherit; padding: 4px;">
            <b style="color:#eb459e; font-size:12px;">🗺️ Trasa rande (${route.length} zastávek)</b>
            <div style="font-size:11px; color:#fff; font-weight:bold; margin-top:2px;">Celkem: ${stats.distanceFormatted}</div>
            <div style="font-size:10px; color:#b9bbbe;">🚶 ${stats.walkingTimeFormatted} pěšky • 🚗 ${stats.drivingTimeFormatted} autem</div>
        </div>
    `);

    try {
        state.mapInstance.fitBounds(polyline.getBounds(), { padding: [60, 60], maxZoom: 16 });
    } catch (e) {
        // Safe catch if coords are identical
    }
}

export function clearRoutePolyline() {
    const polyline = getRoutePolyline();
    if (polyline && state.mapInstance) {
        state.mapInstance.removeLayer(polyline);
        setRoutePolyline(null);
    }
}

export function addToRoute(id) {
    const loc = (state.dateLocations || []).find(l => String(l.id) === String(id));
    if (!loc) return;

    if (!state.route) state.route = [];

    if (state.route.some(r => String(r.id) === String(id))) {
        if (window.showNotification) window.showNotification(`"${loc.name}" už v trase je! 🗺️`, "info");
        return;
    }

    if (state.route.length >= 12) {
        if (window.showNotification) window.showNotification("Trasa je plná! (Max 12 míst)", "error");
        return;
    }

    state.route.push(loc);
    updateRouteUI();
    renderRoutePolyline();
    if (window.showNotification) window.showNotification(`Přidáno do trasy: ${loc.name} 🚩`, "success");
    triggerHaptic('selection');

    const badge = document.getElementById("route-count");
    if (badge) {
        badge.classList.add("scale-150", "text-[#eb459e]");
        setTimeout(() => badge.classList.remove("scale-150", "text-[#eb459e]"), 300);
    }
}

export function removeFromRoute(index) {
    if (!state.route) return;
    state.route.splice(index, 1);
    updateRouteUI();
    renderRoutePolyline();
    triggerHaptic('light');
}

export function moveRouteItem(index, direction) {
    if (!state.route) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.route.length) return;
    
    const [item] = state.route.splice(index, 1);
    state.route.splice(newIndex, 0, item);
    updateRouteUI();
    renderRoutePolyline();
    triggerHaptic('light');
}

export function clearRoute() {
    state.route = [];
    clearRoutePolyline();
    updateRouteUI();
    if (window.showNotification) window.showNotification("Trasa byla vymazána.", "info");
    triggerHaptic('medium');
}

export function updateRouteUI() {
    const list = document.getElementById("route-list");
    const count = document.getElementById("route-count");
    const statsContainer = document.getElementById("route-stats");
    if (!list || !count) return;

    const route = state.route || [];
    count.textContent = String(route.length);

    if (route.length === 0) {
        list.innerHTML = `
            <div class="text-[11px] text-gray-400 italic text-center py-4 bg-[#202225]/60 rounded-xl border border-dashed border-[#2f3136] px-2">
                <i class="fas fa-route text-lg mb-1 text-gray-500 block"></i>
                Vyber místa na mapě a klikni na "+ Přidat do trasy" pro sestavení rande výletu! ✨
            </div>
        `;
        if (statsContainer) statsContainer.innerHTML = '';
        return;
    }

    const stats = calculateRouteStats(route);
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="flex items-center justify-between bg-[#202225] p-2.5 rounded-xl border border-[#2f3136] mb-3 text-xs shadow-inner">
                <div class="flex items-center gap-1.5 text-gray-200 font-black">
                    <i class="fas fa-arrows-alt-h text-[#5865F2]"></i>
                    <span>${stats.distanceFormatted}</span>
                </div>
                <div class="flex items-center gap-3 text-gray-400 text-[11px] font-medium">
                    <span title="Odhad pěšky"><i class="fas fa-walking text-[#3ba55c] mr-1"></i>${stats.walkingTimeFormatted}</span>
                    <span title="Odhad autem"><i class="fas fa-car text-[#faa61a] mr-1"></i>${stats.drivingTimeFormatted}</span>
                </div>
            </div>
        `;
    }

    list.innerHTML = route.map((loc, i) => `
        <div class="flex items-center justify-between bg-[#202225] p-2.5 rounded-xl border-l-4 border-[#eb459e] border border-white/5 animate-fade-in group hover:bg-[#25282c] transition shadow-sm">
            <div class="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer" onclick="window.KiscordMap.selectLocation('${loc.id}')">
                <span class="text-[10px] bg-[#5865F2] text-white w-5 h-5 rounded-full flex items-center justify-center font-black flex-shrink-0 shadow-sm">${i + 1}</span>
                <div class="min-w-0 flex-1">
                    <span class="text-xs text-gray-200 truncate font-bold block">${loc.name}</span>
                    <span class="text-[10px] text-gray-500 truncate block">${loc.desc || loc.address || ''}</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                ${i > 0 ? `<button onclick="window.KiscordMap.moveRouteItem(${i}, -1)" class="text-gray-500 hover:text-white p-1 rounded transition text-[10px]" title="Posunout nahoru"><i class="fas fa-chevron-up"></i></button>` : ''}
                ${i < route.length - 1 ? `<button onclick="window.KiscordMap.moveRouteItem(${i}, 1)" class="text-gray-500 hover:text-white p-1 rounded transition text-[10px]" title="Posunout dolů"><i class="fas fa-chevron-down"></i></button>` : ''}
                <button onclick="window.KiscordMap.removeFromRoute(${i})" class="text-gray-400 hover:text-red-400 active:text-red-500 p-1.5 rounded transition" title="Odebrat z trasy">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>
    `).join("");
}

export function openGoogleMapsRoute() {
    const route = state.route || [];
    if (route.length === 0) {
        if (window.showNotification) window.showNotification("Trasa je prázdná! Přidej nejdřív místa.", "error");
        return;
    }

    const origin = `${route[0].lat},${route[0].lng}`;
    const destination = `${route[route.length - 1].lat},${route[route.length - 1].lng}`;

    let waypoints = "";
    if (route.length > 2) {
        waypoints = "&waypoints=" + route.slice(1, -1).map(l => `${l.lat},${l.lng}`).join("|");
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
}

export async function saveRouteToCalendar() {
    const route = state.route || [];
    if (route.length === 0) {
        if (window.showNotification) window.showNotification("Trasa je prázdná!", "error");
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const routeName = `Rande Trasa: ${route.map(r => r.name).slice(0, 3).join(' ➔ ')}${route.length > 3 ? '...' : ''}`;
    const routeNote = `Naplánovaná trasa (${route.length} zastávek):\n` + route.map((r, i) => `${i + 1}. ${r.name}`).join('\n');

    try {
        await safeUpsert('planned_dates', {
            date_key: todayStr,
            user_id: state.currentUser?.id,
            name: routeName,
            cat: 'date',
            time: '14:00',
            note: routeNote,
            updated_at: new Date().toISOString()
        });

        if (window.showNotification) window.showNotification("Celá trasa uložena do kalendáře jako rande! 📅🥂", "success");
        triggerConfetti();
    } catch (e) {
        console.error("Save route to calendar error:", e);
        if (window.showNotification) window.showNotification("Chyba při ukládání trasy do kalendáře.", "error");
    }
}
