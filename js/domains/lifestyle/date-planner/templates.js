/**
 * Date Planner & Map HTML Templates
 */

import { state } from '@core/state.js';

export function renderMapLayout(selectedCountry) {
    return `
        <div class="flex h-full relative overflow-hidden bg-[#202225] select-none">
            <!-- Sidebar (List & Route) -->
            <div id="planner-sidebar" class="w-80 md:w-96 bg-[#2f3136] flex flex-col border-r border-[#202225] absolute z-30 h-full transition-transform duration-300 transform -translate-x-full shadow-2xl">
                
                <!-- Sidebar Header -->
                <div class="p-4 bg-[#202225] border-b border-[#18191c] flex justify-between items-center">
                    <h2 class="text-white font-black text-sm flex items-center gap-2 tracking-wide uppercase">
                        <i class="fas fa-map-marked-alt text-[#5865F2]"></i> Plánovač rande & míst
                    </h2>
                    <button onclick="document.getElementById('planner-sidebar').classList.add('-translate-x-full')" class="text-gray-400 hover:text-white p-1 rounded-lg transition" title="Zavřít panel">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>

                <!-- Quick Rande Matcher Banner in Sidebar -->
                <div class="p-3 bg-gradient-to-r from-[#eb459e]/15 to-[#5865F2]/15 border-b border-white/5 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">💖</span>
                        <div>
                            <div class="text-xs font-black text-white">Nevíte kam vyrazit?</div>
                            <div class="text-[10px] text-gray-400">Spusťte Tinder pro rande!</div>
                        </div>
                    </div>
                    <button onclick="window.KiscordMap.openDateMatcher()" class="px-3 py-1.5 bg-[#eb459e] hover:bg-[#d63b8c] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition shadow-md">
                        Spustit ➔
                    </button>
                </div>

                <!-- ROUTE SECTION -->
                <div class="bg-[#292b2f] p-3.5 border-b border-[#202225]">
                    <div class="flex justify-between items-center mb-2.5">
                        <div class="text-xs font-black text-[#eb459e] flex items-center gap-1.5 uppercase tracking-wider">
                            <i class="fas fa-route"></i> NAŠE TRASA (<span id="route-count">0</span>)
                        </div>
                        <button onclick="window.KiscordMap.clearRoute()" class="text-[11px] text-gray-400 hover:text-red-400 transition flex items-center gap-1" title="Vymazat trasu">
                            <i class="fas fa-trash-alt"></i> Vymazat
                        </button>
                    </div>

                    <div id="route-stats"></div>

                    <div id="route-list" class="space-y-1.5 mb-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        <!-- Route items injected here -->
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="window.KiscordMap.openGoogleMapsRoute()" class="bg-[#202225] hover:bg-[#36393f] text-gray-200 hover:text-white text-xs font-bold py-2.5 px-3 rounded-xl transition border border-white/5 flex items-center justify-center gap-1.5 shadow-sm">
                            <i class="fab fa-google text-[#4285F4]"></i> Google Maps ↗
                        </button>
                        <button onclick="window.KiscordMap.saveRouteToCalendar()" class="bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5">
                            <i class="fas fa-calendar-check"></i> Uložit rande 🥂
                        </button>
                    </div>
                </div>

                <!-- Filter & List Header -->
                <div class="p-3 bg-[#2f3136] text-[10px] font-black text-gray-400 uppercase tracking-wider flex justify-between items-center border-b border-[#202225]">
                    <span>Uložená místa (${(state.dateLocations || []).length})</span>
                    <span class="text-gray-500 font-medium">Klikni pro zobrazení</span>
                </div>

                <!-- List -->
                <div id="location-list" class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#2f3136]">
                    <!-- Items injected here -->
                </div>
            </div>

            <!-- Map Area -->
            <div class="flex-1 relative h-full bg-[#202225]">
                <div id="leaflet-map" class="w-full h-full z-10 outline-none"></div>

                <!-- OVERLAYS (Floating UI - Google Maps Style) -->
                <div class="absolute top-4 left-4 right-4 z-[20] flex flex-col gap-2.5 pointer-events-none max-w-xl mx-auto">
                    
                    <!-- Search & Actions Bar -->
                    <div class="relative pointer-events-auto w-full">
                        <div class="flex items-center gap-2 bg-[#2f3136]/95 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                            
                            <!-- Search Input Group -->
                            <div class="flex-1 relative flex items-center">
                                <i class="fas fa-search text-gray-400 ml-3 mr-2 pointer-events-none transition group-focus-within:text-[#5865F2]"></i>
                                <input type="text" id="planner-search" placeholder="Hledat místo jako na Google Maps..." 
                                    oninput="window.KiscordMap.searchLocations(this.value)"
                                    onfocus="window.KiscordMap.searchLocations(this.value)"
                                    class="w-full bg-transparent text-gray-100 placeholder-gray-400 text-sm py-2.5 pr-8 outline-none font-medium">
                                <button id="search-clear-btn" onclick="document.getElementById('planner-search').value = ''; window.KiscordMap.searchLocations('');" 
                                    class="hidden absolute right-2 text-gray-400 hover:text-white p-1 transition">
                                    <i class="fas fa-times-circle text-sm"></i>
                                </button>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex items-center gap-1.5 pr-1">
                                <button onclick="window.KiscordMap.openDateMatcher()" 
                                    class="w-10 h-10 bg-gradient-to-br from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white rounded-xl shadow-lg flex items-center justify-center transition transform hover:scale-105 active:scale-95 flex-shrink-0" 
                                    title="Rande Matcher (Tinder pro rande 💖)">
                                    <i class="fas fa-heart text-base animate-pulse"></i>
                                </button>
                                <button onclick="window.KiscordMap.showAddLocationModal()" 
                                    class="w-10 h-10 bg-[#3ba55c] hover:bg-[#2d7d46] text-white rounded-xl shadow-lg flex items-center justify-center transition transform hover:scale-105 active:scale-95 flex-shrink-0" 
                                    title="Přidat nové místo">
                                    <i class="fas fa-plus text-base"></i>
                                </button>
                                <button onclick="window.KiscordMap.pickRandomLocation()" 
                                    class="w-10 h-10 bg-[#eb459e] hover:bg-[#d63b8c] text-white rounded-xl shadow-lg flex items-center justify-center transition transform hover:scale-105 active:scale-95 flex-shrink-0" 
                                    title="Náhodný výběr rande (Kostka 🎲)">
                                    <i class="fas fa-dice text-base"></i>
                                </button>
                                <button onclick="document.getElementById('planner-sidebar').classList.toggle('-translate-x-full')" 
                                    class="w-10 h-10 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl shadow-lg flex items-center justify-center transition transform hover:scale-105 active:scale-95 flex-shrink-0"
                                    title="Otevřít seznam a trasu">
                                    <i class="fas fa-list-ul text-base"></i>
                                </button>
                            </div>
                        </div>

                        <!-- LIVE SEARCH DROPDOWN -->
                        <div id="planner-search-dropdown" class="hidden absolute left-0 right-0 top-full mt-2 bg-[#2f3136]/98 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col z-50 animate-fade-in">
                        </div>
                    </div>

                    <!-- Category Filters Bar -->
                    <div class="flex items-center justify-between gap-2 pointer-events-auto">
                        <div class="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 mask-linear-fade">
                            <button onclick="window.KiscordMap.filterMap('all')" data-filter="all" class="filter-btn active whitespace-nowrap px-3.5 py-1.5 rounded-full bg-[#5865F2] text-white text-[11px] font-black shadow-md transition transform hover:scale-105">
                                Vše
                            </button>
                            <button onclick="window.KiscordMap.filterMap('view')" data-filter="view" class="filter-btn whitespace-nowrap px-3.5 py-1.5 rounded-full bg-[#2f3136]/90 backdrop-blur text-gray-300 border border-white/5 text-[11px] font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1.5">
                                <span>⛰️</span> Výhledy
                            </button>
                            <button onclick="window.KiscordMap.filterMap('food')" data-filter="food" class="filter-btn whitespace-nowrap px-3.5 py-1.5 rounded-full bg-[#2f3136]/90 backdrop-blur text-gray-300 border border-white/5 text-[11px] font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1.5">
                                <span>🍔</span> Jídlo
                            </button>
                            <button onclick="window.KiscordMap.filterMap('walk')" data-filter="walk" class="filter-btn whitespace-nowrap px-3.5 py-1.5 rounded-full bg-[#2f3136]/90 backdrop-blur text-gray-300 border border-white/5 text-[11px] font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1.5">
                                <span>🌲</span> Příroda
                            </button>
                            <button onclick="window.KiscordMap.filterMap('fun')" data-filter="fun" class="filter-btn whitespace-nowrap px-3.5 py-1.5 rounded-full bg-[#2f3136]/90 backdrop-blur text-gray-300 border border-white/5 text-[11px] font-bold shadow-md transition hover:bg-[#36393f] hover:text-white flex items-center gap-1.5">
                                <span>⚡</span> Zábava
                            </button>
                        </div>

                        <!-- Country Switch Pill -->
                        <div class="flex gap-1 bg-[#2f3136]/90 backdrop-blur p-1 rounded-full border border-white/5 shadow-md flex-shrink-0">
                            <button onclick="window.KiscordMap.switchCountry('CZ')" id="country-btn-cz" 
                                    class="country-btn px-2.5 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1 ${selectedCountry === 'CZ' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-gray-400 hover:text-white'}">
                                <span>🇨🇿</span> CZ
                            </button>
                            <button onclick="window.KiscordMap.switchCountry('AT')" id="country-btn-at" 
                                    class="country-btn px-2.5 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1 ${selectedCountry === 'AT' ? 'bg-[#eb459e] text-white shadow-sm' : 'text-gray-400 hover:text-white'}">
                                <span>🇦🇹</span> AT
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Bottom Sheet / Detail Panel -->
                <div id="detail-panel" class="absolute bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[420px] bg-[#36393f]/95 backdrop-blur-xl rounded-3xl shadow-2xl z-[50] transition-all duration-300 translate-y-[130%] flex flex-col max-h-[85vh] border border-white/10 overflow-hidden">
                </div>
            </div>
        </div>
    `;
}

export function renderAddLocationModalTemplate(coords, selectedCountry, selectedLocCat) {
    return `
        <div class="bg-[#36393f] w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-scale-up">
            <div class="p-5 border-b border-white/5 flex justify-between items-center bg-[#2f3136]">
                <h3 class="text-base font-black text-white tracking-wider uppercase flex items-center gap-2">
                    <i class="fas fa-map-pin text-[#3ba55c]"></i> Přidat nové místo na mapu
                </h3>
                <button onclick="this.closest('#location-add-modal').remove()" class="text-gray-400 hover:text-white p-1 rounded-lg transition">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div>
                     <label class="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Kategorie místa</label>
                     <div class="grid grid-cols-4 gap-2">
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('view')" 
                            class="p-2.5 rounded-2xl border-2 ${selectedLocCat === 'view' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">⛰️</span>
                            <span class="text-[9px] font-black text-white">VÝHLED</span>
                        </button>
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('food')" 
                            class="p-2.5 rounded-2xl border-2 ${selectedLocCat === 'food' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">🍔</span>
                            <span class="text-[9px] font-black text-white">JÍDLO</span>
                        </button>
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('walk')" 
                            class="p-2.5 rounded-2xl border-2 ${selectedLocCat === 'walk' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">🌲</span>
                            <span class="text-[9px] font-black text-white">PŘÍRODA</span>
                        </button>
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('fun')" 
                            class="p-2.5 rounded-2xl border-2 ${selectedLocCat === 'fun' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">⚡</span>
                            <span class="text-[9px] font-black text-white">ZÁBAVA</span>
                        </button>
                     </div>
                </div>

                <div class="grid grid-cols-4 gap-3">
                    <div class="col-span-3">
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Název místa</label>
                        <input type="text" id="nl-name" value="${coords.name || ''}" placeholder="Např. Skvělá kavárna v centru" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 focus:border-[#5865F2] outline-none transition text-xs font-bold">
                    </div>
                     <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Emoji</label>
                        <input type="text" id="nl-icon" value="${coords.icon || '📍'}" placeholder="☕" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 focus:border-[#5865F2] outline-none transition text-sm text-center">
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Adresa nebo popis lokality</label>
                    <textarea id="nl-desc" placeholder="Proč sem vyrazit? Co doporučujete ochutnat / vidět..." class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 focus:border-[#5865F2] outline-none transition text-xs min-h-[60px] resize-none">${coords.address || coords.desc || ''}</textarea>
                </div>

                <div class="grid grid-cols-3 gap-2">
                     <div>
                        <label class="block text-[9px] font-black text-gray-400 uppercase mb-1">Šířka (Lat)</label>
                        <input type="number" id="nl-lat" step="any" value="${coords.lat ? coords.lat.toFixed(6) : '49.069000'}" class="w-full bg-[#202225] text-gray-300 p-2.5 rounded-xl border border-white/5 text-[11px]">
                    </div>
                     <div>
                        <label class="block text-[9px] font-black text-gray-400 uppercase mb-1">Délka (Lng)</label>
                        <input type="number" id="nl-lng" step="any" value="${coords.lng ? coords.lng.toFixed(6) : '17.464000'}" class="w-full bg-[#202225] text-gray-300 p-2.5 rounded-xl border border-white/5 text-[11px]">
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-gray-400 uppercase mb-1">Země</label>
                        <select id="nl-country" class="w-full bg-[#202225] text-white p-2.5 rounded-xl border border-white/5 text-[11px]">
                            <option value="CZ" ${selectedCountry === 'CZ' ? 'selected' : ''}>🇨🇿 Česko</option>
                            <option value="AT" ${selectedCountry === 'AT' ? 'selected' : ''}>🇦🇹 Rakousko</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Fotka místa (volitelné)</label>
                    <div class="flex items-center gap-3 bg-[#202225] p-3 rounded-xl border border-white/5">
                        <button type="button" onclick="document.getElementById('nl-photo').click()" class="w-9 h-9 bg-[#2f3136] rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition">
                            <i class="fas fa-camera"></i>
                        </button>
                        <input type="file" id="nl-photo" class="hidden" accept="image/*" onchange="const f = this.files[0]; if(f) document.getElementById('nl-photo-name').innerText = f.name;">
                        <span id="nl-photo-name" class="text-xs text-gray-400 truncate italic">Klikni pro výběr fotky...</span>
                    </div>
                </div>
            </div>
            
            <div class="p-5 bg-[#2f3136] border-t border-white/5">
                <button onclick="window.KiscordMap.saveNewLocation()" class="w-full bg-gradient-to-r from-[#3ba55c] to-[#2d7d46] hover:opacity-95 text-white py-3.5 rounded-2xl font-black text-sm transition shadow-xl transform active:scale-95 flex items-center justify-center gap-2">
                    <i class="fas fa-check"></i> ULOŽIT MÍSTO DO MAPY 🗺️
                </button>
            </div>
        </div>
    `;
}

export function renderEditLocationModalTemplate(loc) {
    return `
        <div class="bg-[#36393f] w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-scale-up">
            <div class="p-5 border-b border-white/5 flex justify-between items-center bg-[#2f3136]">
                <h3 class="text-base font-black text-white tracking-wider uppercase flex items-center gap-2">
                    <i class="fas fa-pen text-[#5865F2]"></i> Upravit místo
                </h3>
                <button onclick="this.closest('#location-edit-modal').remove()" class="text-gray-400 hover:text-white p-1 rounded-lg transition">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div>
                     <label class="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Kategorie místa</label>
                     <div class="grid grid-cols-4 gap-2">
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('view')" class="p-2.5 rounded-2xl border-2 ${loc.cat === 'view' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">⛰️</span>
                            <span class="text-[9px] font-black text-white">VÝHLED</span>
                        </button>
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('food')" class="p-2.5 rounded-2xl border-2 ${loc.cat === 'food' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">🍔</span>
                            <span class="text-[9px] font-black text-white">JÍDLO</span>
                        </button>
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('walk')" class="p-2.5 rounded-2xl border-2 ${loc.cat === 'walk' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">🌲</span>
                            <span class="text-[9px] font-black text-white">PŘÍRODA</span>
                        </button>
                        <button type="button" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('border-[#eb459e]', 'bg-[#202225]')); this.classList.add('border-[#eb459e]', 'bg-[#202225]'); window.KiscordMap.setLocCat('fun')" class="p-2.5 rounded-2xl border-2 ${loc.cat === 'fun' ? 'border-[#eb459e] bg-[#202225]' : 'border-transparent bg-[#2f3136]'} transition flex flex-col items-center gap-1">
                            <span class="text-xl">⚡</span>
                            <span class="text-[9px] font-black text-white">ZÁBAVA</span>
                        </button>
                     </div>
                </div>

                <div class="grid grid-cols-4 gap-3">
                    <div class="col-span-3">
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Název</label>
                        <input type="text" id="el-name" value="${loc.name}" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 focus:border-[#5865F2] outline-none transition text-xs font-bold">
                    </div>
                     <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Emoji</label>
                        <input type="text" id="el-icon" value="${loc.icon || '📍'}" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 focus:border-[#5865F2] outline-none transition text-sm text-center">
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Popis</label>
                    <textarea id="el-desc" class="w-full bg-[#202225] text-white p-3 rounded-xl border border-white/5 focus:border-[#5865F2] outline-none transition text-xs min-h-[60px] resize-none">${loc.desc || ""}</textarea>
                </div>

                <div class="grid grid-cols-2 gap-3">
                     <div>
                        <label class="block text-[9px] font-black text-gray-400 uppercase mb-1">Šířka (Lat)</label>
                        <input type="number" id="el-lat" step="any" value="${loc.lat}" class="w-full bg-[#202225] text-gray-300 p-2.5 rounded-xl border border-white/5 text-[11px]">
                    </div>
                     <div>
                        <label class="block text-[9px] font-black text-gray-400 uppercase mb-1">Délka (Lng)</label>
                        <input type="number" id="el-lng" step="any" value="${loc.lng}" class="w-full bg-[#202225] text-gray-300 p-2.5 rounded-xl border border-white/5 text-[11px]">
                    </div>
                </div>
            </div>
            
            <div class="p-5 border-t border-white/5 bg-[#2f3136]">
                <button onclick="window.KiscordMap.saveEditedLocation('${loc.id}')" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3.5 rounded-2xl font-black text-sm transition shadow-xl transform active:scale-95 flex items-center justify-center gap-2">
                    <i class="fas fa-save"></i> ULOŽIT ZMĚNY 💾
                </button>
            </div>
        </div>
    `;
}
