/**
 * Geolocation, Geocoding & OpenStreetMap Search Engine
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { 
    getSelectedCountry, 
    setSelectedCountry, 
    getPreviewMarker, 
    setPreviewMarker, 
    setLastMapClick, 
    setSelectedLocCat 
} from './state.js';

let searchAbortController = null;
let searchDebounceTimer = null;

/**
 * Infer category and appropriate emoji from OSM place data, category, or title keywords
 */
export function inferCategoryAndIcon(place, name = '') {
    const combined = `${place?.osmType || ''} ${place?.osmClass || ''} ${place?.type || ''} ${place?.class || ''} ${place?.category || ''} ${place?.display_name || ''} ${name || place?.name || ''}`.toLowerCase();

    // Food & Drinks
    if (combined.match(/\b(cafe|kavárna|kava|coffee|espresso|cukrárna|pekárna|bakery|pastry)\b/)) {
        return { cat: 'food', icon: '☕' };
    }
    if (combined.match(/\b(pizza|pizzeria|pizzerie)\b/)) {
        return { cat: 'food', icon: '🍕' };
    }
    if (combined.match(/\b(ice_cream|zmrzlina|gelato)\b/)) {
        return { cat: 'food', icon: '🍦' };
    }
    if (combined.match(/\b(burger|fast_food|bistro|restaurant|restaurace|food|jídelna|menza|oběd|večeře)\b/)) {
        return { cat: 'food', icon: '🍔' };
    }
    if (combined.match(/\b(pub|hospoda|bar|pivovar|beer|brewery|víno|vinárna|wine)\b/)) {
        return { cat: 'food', icon: '🍷' };
    }

    // Viewpoints, Castles & Sights
    if (combined.match(/\b(castle|hrad|zámek|chateau|palace|ruins|zřícenina)\b/)) {
        return { cat: 'view', icon: '🏰' };
    }
    if (combined.match(/\b(tower|rozhledna|věž|viewpoint|vyhlídka|lookout)\b/)) {
        return { cat: 'view', icon: '🌅' };
    }
    if (combined.match(/\b(peak|vrchol|hora|mountain|hill|monument|památník|attraction|sight)\b/)) {
        return { cat: 'view', icon: '⛰️' };
    }

    // Nature, Walks & Parks
    if (combined.match(/\b(park|garden|zahrada|arboretum|botanical)\b/)) {
        return { cat: 'walk', icon: '🌿' };
    }
    if (combined.match(/\b(forest|les|nature_reserve|rezervace|trail|stezka|procházka|hiking|lake|jezero|rybník|river|řeka|vodopád|waterfall)\b/)) {
        return { cat: 'walk', icon: '🌲' };
    }
    if (combined.match(/\b(zoo|safari|zookoutek|fauna)\b/)) {
        return { cat: 'walk', icon: '🦁' };
    }

    // Fun & Entertainment
    if (combined.match(/\b(cinema|kino|theatre|divadlo)\b/)) {
        return { cat: 'fun', icon: '🎬' };
    }
    if (combined.match(/\b(museum|muzeum|gallery|galerie|exhibition|výstava)\b/)) {
        return { cat: 'fun', icon: '🎟️' };
    }
    if (combined.match(/\b(bowling|billiard|laser|escape|úniková|aquapark|bazén|wellness|sauna|arcade|karting|motokáry|minigolf)\b/)) {
        return { cat: 'fun', icon: '🎳' };
    }

    return { cat: 'view', icon: '📍' };
}

/**
 * Search online places via OpenStreetMap Nominatim / Geocoding API
 */
export async function searchOnlinePlaces(query) {
    if (!query || query.trim().length < 2) return [];

    if (searchAbortController) {
        searchAbortController.abort();
    }
    searchAbortController = new AbortController();

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&addressdetails=1&limit=8&accept-language=cs,en`;
        const res = await fetch(url, {
            signal: searchAbortController.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!res.ok) throw new Error('Geocoding API response not ok');
        const data = await res.json();

        return (data || []).map(item => {
            const rawName = item.name || (item.display_name ? item.display_name.split(',')[0].trim() : 'Místo');
            const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || item.address?.suburb || '';
            const road = item.address?.road || item.address?.neighbourhood || '';
            const country = item.address?.country || '';
            const countryCode = (item.address?.country_code || '').toUpperCase();
            
            const subtitleParts = [road, city, country].filter(Boolean);
            const address = subtitleParts.join(', ') || item.display_name;

            const inferred = inferCategoryAndIcon({
                osmType: item.type,
                osmClass: item.class,
                display_name: item.display_name,
                name: rawName
            });

            return {
                id: `osm_${item.osm_id || Math.random().toString(36).substr(2, 9)}`,
                name: rawName,
                fullName: item.display_name,
                address: address,
                city: city,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                countryCode: countryCode,
                country: countryCode === 'AT' ? 'AT' : 'CZ',
                osmType: item.type || item.class || 'místo',
                cat: inferred.cat,
                icon: inferred.icon,
                isOnline: true
            };
        });
    } catch (err) {
        if (err.name === 'AbortError') return [];
        console.warn('[Geocoding Search Error]', err);
        return [];
    }
}

/**
 * Reverse geocode coordinates to human-readable address & name
 */
export async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=cs,en`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const item = await res.json();
        if (!item || !item.display_name) return null;

        const rawName = item.name || item.address?.amenity || item.address?.tourism || item.address?.leisure || (item.display_name.split(',')[0].trim());
        const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '';
        const road = item.address?.road || item.address?.neighbourhood || '';
        const countryCode = (item.address?.country_code || '').toUpperCase();

        const inferred = inferCategoryAndIcon({
            osmType: item.type,
            osmClass: item.class,
            display_name: item.display_name,
            name: rawName
        });

        return {
            name: rawName || 'Nové místo',
            address: [road, city, item.address?.country].filter(Boolean).join(', ') || item.display_name,
            city: city,
            country: countryCode === 'AT' ? 'AT' : 'CZ',
            cat: inferred.cat,
            icon: inferred.icon
        };
    } catch (err) {
        console.warn('[Reverse Geocode Error]', err);
        return null;
    }
}

export function closeSearchDropdown() {
    const dropdown = document.getElementById('planner-search-dropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    }
}

export async function searchLocations(query) {
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', !query || query.length === 0);
    }

    const dropdown = document.getElementById('planner-search-dropdown');
    if (!dropdown) return;

    const selectedCountry = getSelectedCountry();

    if (!query || query.trim().length === 0) {
        closeSearchDropdown();
        if (window.KiscordMap?.renderLocationList && window.KiscordMap?.renderMarkers) {
            const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
            window.KiscordMap.renderLocationList(countryLocations);
            window.KiscordMap.renderMarkers(countryLocations);
        }
        return;
    }

    const term = query.toLowerCase().trim();

    // Local saved places search
    const allLocal = state.dateLocations || [];
    const localMatches = allLocal.filter(l => 
        (l.name && l.name.toLowerCase().includes(term)) || 
        (l.desc && l.desc.toLowerCase().includes(term)) ||
        (l.address && l.address.toLowerCase().includes(term)) ||
        (l.city && l.city.toLowerCase().includes(term))
    );

    dropdown.classList.remove('hidden');
    dropdown.innerHTML = `
        <div class="p-4 flex items-center justify-between text-xs text-gray-400 border-b border-white/5 bg-[#202225]/50">
            <span class="flex items-center gap-2"><i class="fas fa-spinner animate-spin text-[#5865F2]"></i> Hledám na Google Maps...</span>
            <span class="text-[10px] text-gray-500 font-mono">OpenStreetMap / Nominatim</span>
        </div>
        <div id="dropdown-local-results" class="p-2 space-y-1"></div>
        <div id="dropdown-online-results" class="p-2 space-y-1 border-t border-white/5 bg-[#202225]/30"></div>
    `;

    const localContainer = document.getElementById('dropdown-local-results');
    if (localContainer) {
        if (localMatches.length > 0) {
            localContainer.innerHTML = `
                <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-1 flex items-center gap-1.5">
                    <i class="fas fa-bookmark text-[#eb459e]"></i> Naše uložená místa (${localMatches.length})
                </div>
                ${localMatches.map(l => `
                    <div onclick="window.KiscordMap.jumpToLocation('${l.id}'); window.KiscordMap.closeSearchDropdown();" 
                         class="p-2.5 hover:bg-[#36393f] rounded-xl cursor-pointer transition flex items-center gap-3 group">
                        <div class="w-8 h-8 rounded-lg bg-[#202225] flex items-center justify-center text-base group-hover:scale-110 transition flex-shrink-0">${l.icon || '📍'}</div>
                        <div class="min-w-0 flex-1">
                            <div class="text-sm font-bold text-gray-100 truncate group-hover:text-white">${l.name}</div>
                            <div class="text-[10px] text-gray-400 truncate">${l.desc || l.address || (l.country === 'AT' ? 'Rakousko' : 'Česko')}</div>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-md bg-[#5865F2]/20 text-[#5865F2] font-bold">Uloženo</span>
                    </div>
                `).join('')}
            `;
        } else {
            localContainer.innerHTML = `
                <div class="text-[11px] text-gray-500 italic px-3 py-1.5">
                    Žádné z našich uložených míst neodpovídá "${query}"
                </div>
            `;
        }
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        const onlineResults = await searchOnlinePlaces(term);
        const onlineContainer = document.getElementById('dropdown-online-results');
        if (!onlineContainer) return;

        if (onlineResults.length > 0) {
            onlineContainer.innerHTML = `
                <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-1.5 flex items-center justify-between">
                    <span class="flex items-center gap-1.5"><i class="fas fa-globe-europe text-[#3ba55c]"></i> Výsledky z mapy (Google Maps styl)</span>
                    <span class="text-[9px] text-gray-500">Klikni pro náhled & přidání</span>
                </div>
                ${onlineResults.map((item) => `
                    <div onclick="window.KiscordMap.previewOnlinePlace(${JSON.stringify(item).replace(/"/g, '&quot;')})" 
                         class="p-2.5 hover:bg-[#36393f] rounded-xl cursor-pointer transition flex items-center gap-3 group border border-transparent hover:border-white/5">
                        <div class="w-8 h-8 rounded-lg bg-[#202225] flex items-center justify-center text-base group-hover:scale-110 transition flex-shrink-0">${item.icon}</div>
                        <div class="min-w-0 flex-1">
                            <div class="text-sm font-bold text-gray-100 truncate group-hover:text-white flex items-center gap-2">
                                <span class="truncate">${item.name}</span>
                                <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-semibold uppercase flex-shrink-0">${item.osmType}</span>
                            </div>
                            <div class="text-[10px] text-gray-400 truncate">${item.address}</div>
                        </div>
                        <button onclick="event.stopPropagation(); window.KiscordMap.quickAddOnlinePlace(${JSON.stringify(item).replace(/"/g, '&quot;')})" 
                                class="px-2.5 py-1.5 bg-[#3ba55c] hover:bg-[#2d7d46] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm flex-shrink-0"
                                title="Rychle přidat do plánovače">
                            <i class="fas fa-plus text-[9px]"></i> Přidat
                        </button>
                    </div>
                `).join('')}
            `;
        } else {
            onlineContainer.innerHTML = `
                <div class="text-[11px] text-gray-500 italic p-3 text-center">
                    Nenašli jsme žádná online místa pro "${query}". Zkus upřesnit město nebo název. 🌍
                </div>
            `;
        }
    }, 300);
}

/**
 * Preview an online place on the map with an interactive pin
 */
export function previewOnlinePlace(place) {
    if (!state.mapInstance || !place) return;

    closeSearchDropdown();

    const selectedCountry = getSelectedCountry();
    if (place.country && place.country !== selectedCountry) {
        if (window.KiscordMap?.switchCountry) {
            window.KiscordMap.switchCountry(place.country);
        }
    }

    let previewMarker = getPreviewMarker();
    if (previewMarker && state.mapInstance) {
        state.mapInstance.removeLayer(previewMarker);
        setPreviewMarker(null);
    }

    const previewHtml = `
        <div class="marker-pin animate-bounce" style="background-color: #eb459e; box-shadow: 0 0 20px #eb459e;">
            <i class="fas fa-star text-white"></i>
        </div>
    `;

    const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: previewHtml,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -42],
    });

    previewMarker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(state.mapInstance);
    setPreviewMarker(previewMarker);

    const safePlaceStr = JSON.stringify(place).replace(/"/g, '&quot;');
    const popupHtml = `
        <div style="text-align:center; min-width: 180px; font-family: inherit;">
            <div style="font-size:18px; margin-bottom: 2px;">${place.icon}</div>
            <b style="color:#fff; font-size:14px;">${place.name}</b>
            <span style="font-size:11px; color:#b9bbbe; display:block; margin: 4px 0;">${place.address}</span>
            <div style="display:flex; gap:6px; margin-top:8px;">
                <button onclick="window.KiscordMap.quickAddOnlinePlace(${safePlaceStr})" style="flex:1; background: #3ba55c; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    <i class="fas fa-plus"></i> Přidat do plánovače
                </button>
            </div>
        </div>
    `;

    previewMarker.bindPopup(popupHtml).openPopup();

    state.mapInstance.flyTo([place.lat, place.lng], 16, {
        animate: true,
        duration: 1.5
    });

    triggerHaptic('selection');
}

/**
 * 1-Click add online place with pre-filled metadata
 */
export function quickAddOnlinePlace(place) {
    if (!place) return;
    const selectedCountry = getSelectedCountry();
    setLastMapClick({
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        address: place.address,
        city: place.city,
        country: place.country || selectedCountry,
        cat: place.cat || 'view',
        icon: place.icon || '📍'
    });
    setSelectedLocCat(place.cat || 'view');

    if (window.KiscordMap?.showAddLocationModal) {
        window.KiscordMap.showAddLocationModal(place);
    }
}
