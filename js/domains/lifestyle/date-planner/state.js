/**
 * Date Planner & Map Local State Management
 */

let selectedDateLocation = null;
let lastMapClick = { lat: 49.069, lng: 17.464, name: '', address: '' };
let selectedLocCat = 'view';
let selectedCountry = 'CZ'; // 'CZ' | 'AT'
let previewMarker = null;
let routePolyline = null;
let markersMemories = [];

export function getSelectedDateLocation() {
    return selectedDateLocation;
}

export function setSelectedDateLocation(loc) {
    selectedDateLocation = loc;
}

export function getLastMapClick() {
    return lastMapClick;
}

export function setLastMapClick(data) {
    lastMapClick = { ...lastMapClick, ...data };
}

export function getSelectedLocCat() {
    return selectedLocCat;
}

export function setSelectedLocCat(cat) {
    selectedLocCat = cat;
}

export function getSelectedCountry() {
    return selectedCountry;
}

export function setSelectedCountry(country) {
    selectedCountry = country;
}

export function getPreviewMarker() {
    return previewMarker;
}

export function setPreviewMarker(marker) {
    previewMarker = marker;
}

export function getRoutePolyline() {
    return routePolyline;
}

export function setRoutePolyline(polyline) {
    routePolyline = polyline;
}

export function getMarkersMemories() {
    return markersMemories;
}

export function setMarkersMemories(memories) {
    markersMemories = memories;
}
