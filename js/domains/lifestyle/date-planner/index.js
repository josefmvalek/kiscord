/**
 * Date Planner & Interactive Map Module Orchestrator
 */

import { state } from '@core/state.js';
import { loadLeaflet } from '@core/loader.js';
import { showNotification } from '@core/theme.js';
import { 
    getSelectedCountry, 
    setSelectedLocCat, 
    setLastMapClick, 
    getMarkersMemories, 
    setMarkersMemories 
} from './state.js';
import { 
    inferCategoryAndIcon, 
    searchOnlinePlaces, 
    reverseGeocode, 
    searchLocations, 
    closeSearchDropdown, 
    previewOnlinePlace, 
    quickAddOnlinePlace 
} from './geocoding.js';
import { 
    calculateDistance, 
    calculateRouteStats, 
    renderRoutePolyline, 
    clearRoutePolyline, 
    addToRoute, 
    removeFromRoute, 
    moveRouteItem, 
    clearRoute, 
    updateRouteUI, 
    openGoogleMapsRoute, 
    saveRouteToCalendar 
} from './routing.js';
import { 
    renderMarkers, 
    fetchMarkersMemories, 
    renderLocationList, 
    filterMap, 
    switchCountry 
} from './leaflet.js';
import { 
    selectLocation, 
    closeLocationDetail, 
    rateDate, 
    saveDateToCalendar, 
    pickRandomLocation, 
    jumpToLocation, 
    showAddLocationModal, 
    saveNewLocation, 
    editLocation, 
    saveEditedLocation, 
    deleteLocation, 
    uploadLocationMemory, 
    openDateMatcher, 
    handleMatcherSwipe, 
    pickRandomFromMatcher, 
    quickScheduleMatchedDate, 
    isSecretDateLocked 
} from './actions.js';
import { renderMapLayout } from './templates.js';

export {
    inferCategoryAndIcon,
    searchOnlinePlaces,
    reverseGeocode,
    searchLocations,
    closeSearchDropdown,
    previewOnlinePlace,
    quickAddOnlinePlace,
    calculateDistance,
    calculateRouteStats,
    renderRoutePolyline,
    clearRoutePolyline,
    addToRoute,
    removeFromRoute,
    moveRouteItem,
    clearRoute,
    updateRouteUI,
    openGoogleMapsRoute,
    saveRouteToCalendar,
    renderMarkers,
    fetchMarkersMemories,
    renderLocationList,
    filterMap,
    switchCountry,
    selectLocation,
    closeLocationDetail,
    rateDate,
    saveDateToCalendar,
    pickRandomLocation,
    jumpToLocation,
    showAddLocationModal,
    saveNewLocation,
    editLocation,
    saveEditedLocation,
    deleteLocation,
    uploadLocationMemory,
    openDateMatcher,
    handleMatcherSwipe,
    pickRandomFromMatcher,
    quickScheduleMatchedDate,
    isSecretDateLocked
};

export const renderDatePlanner = renderMap;

export function renderMap() {
    const selectedCountry = getSelectedCountry();

    // Expose API to window
    window.KiscordMap = {
        renderMap,
        renderDatePlanner,
        addToRoute,
        removeFromRoute,
        moveRouteItem,
        clearRoute,
        updateRouteUI,
        openGoogleMapsRoute,
        saveRouteToCalendar,
        renderMarkers,
        fetchMarkersMemories,
        renderLocationList,
        filterMap,
        selectLocation,
        rateDate,
        saveDateToCalendar,
        closeLocationDetail,
        pickRandomLocation,
        searchLocations,
        jumpToLocation,
        showAddLocationModal,
        saveNewLocation,
        uploadLocationMemory,
        switchCountry,
        editLocation,
        saveEditedLocation,
        deleteLocation,
        previewOnlinePlace,
        quickAddOnlinePlace,
        closeSearchDropdown,
        openDateMatcher,
        handleMatcherSwipe,
        pickRandomFromMatcher,
        quickScheduleMatchedDate,
        renderRoutePolyline,
        clearRoutePolyline,
        setLocCat: (cat) => { setSelectedLocCat(cat); }
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = renderMapLayout(selectedCountry);

    // Initialize Map logic
    setTimeout(async () => {
        await loadLeaflet();

        if (state.mapInstance) {
            state.mapInstance.remove();
            state.mapInstance = null;
        }

        const centerCoords = selectedCountry === 'CZ' ? [49.069, 17.464] : [47.28358, 12.81648];
        const centerZoom = selectedCountry === 'CZ' ? 13 : 12;
        const map = L.map("leaflet-map", { zoomControl: false }).setView(centerCoords, centerZoom);
        state.mapInstance = map;

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            {
                attribution: "© OpenStreetMap © CARTO",
                subdomains: "abcd",
                maxZoom: 19,
            },
        ).addTo(map);

        map.on('click', async (e) => {
            setLastMapClick({ lat: e.latlng.lat, lng: e.latlng.lng, name: '', address: '' });
            
            const geo = await reverseGeocode(e.latlng.lat, e.latlng.lng);
            if (geo) {
                setLastMapClick({
                    name: geo.name,
                    address: geo.address,
                    city: geo.city,
                    country: geo.country,
                    cat: geo.cat,
                    icon: geo.icon
                });
            }

            const placeLabel = geo?.name ? `"${geo.name}"` : 'zvolené místo';
            showNotification(`Kliknuto na ${placeLabel}! Klikni na '+' pro přidání do plánovače 📍`, "info");
        });

        document.addEventListener('click', (e) => {
            const searchBar = document.getElementById('planner-search');
            const dropdown = document.getElementById('planner-search-dropdown');
            if (dropdown && !dropdown.contains(e.target) && e.target !== searchBar) {
                closeSearchDropdown();
            }
        });

        // Ensure Map Data (dateLocations & dateRatings)
        if (!state.dateLocations || state.dateLocations.length === 0 || !state._loaded.map) {
            await import('@core/loaders.js').then(l => l.ensureMapData?.()).catch(e => console.warn('[Map] ensureMapData error:', e));
        }

        // Fetch Memories
        if (state.timelineEvents && state.timelineEvents.length > 0) {
            const memories = state.timelineEvents.filter(e => e.location_id);
            setMarkersMemories(memories);
        } else {
            await fetchMarkersMemories();
        }
        
        // Render current country items & polyline
        const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
        renderMarkers(countryLocations);
        renderLocationList(countryLocations);
        updateRouteUI();
        renderRoutePolyline();
    }, 100);
}

export default {
    renderMap,
    renderDatePlanner,
    addToRoute,
    removeFromRoute,
    moveRouteItem,
    clearRoute,
    updateRouteUI,
    openGoogleMapsRoute,
    saveRouteToCalendar,
    renderMarkers,
    fetchMarkersMemories,
    renderLocationList,
    filterMap,
    selectLocation,
    rateDate,
    saveDateToCalendar,
    closeLocationDetail,
    pickRandomLocation,
    searchLocations,
    jumpToLocation,
    showAddLocationModal,
    saveNewLocation,
    uploadLocationMemory,
    switchCountry,
    editLocation,
    saveEditedLocation,
    deleteLocation,
    previewOnlinePlace,
    quickAddOnlinePlace,
    closeSearchDropdown,
    openDateMatcher,
    handleMatcherSwipe,
    pickRandomFromMatcher,
    quickScheduleMatchedDate,
    renderRoutePolyline,
    clearRoutePolyline
};
