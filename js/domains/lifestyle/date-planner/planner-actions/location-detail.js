import { supabase } from '@core/supabase.js';
import { state, awardLoveCoinsToCurrentUser } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal } from '@core/ui.js';

export function isSecretDateLocked(plan, currentUserName) {
    if (!plan || !plan.is_secret) return false;
    const creator = plan.created_by || plan.proposto_by || 'Josef';
    
    if (currentUserName && currentUserName.toLowerCase() === creator.toLowerCase()) {
        return false;
    }
    if (plan.is_manually_unlocked) return false;

    const unlockHours = plan.secret_unlock_hours !== undefined ? plan.secret_unlock_hours : 1;
    const eventDateStr = plan.date_key || plan.date || '';
    const eventTimeStr = plan.time || '18:00';
    const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr}:00`);
    if (isNaN(eventDateTime.getTime())) return false;

    const unlockTime = new Date(eventDateTime.getTime() - unlockHours * 60 * 60 * 1000);
    return new Date() < unlockTime;
}

export function selectLocation(id) {
    try {
        const loc = (state.dateLocations || []).find((l) => String(l.id) === String(id));
        if (!loc) return;
        setSelectedDateLocation(loc);

        const sidebar = document.getElementById("planner-sidebar");
        if (sidebar && window.innerWidth < 768) sidebar.classList.add("-translate-x-full");

        const panel = document.getElementById("detail-panel");
        if (!panel) return;

        panel.style.transform = "";
        panel.classList.remove("translate-y-[130%]");
        panel.classList.add("translate-y-0");

        const currentRating = (state.dateRatings && state.dateRatings[loc.id]) || 0;
        const notes = ["Nic moc 😕", "Ušlo to 🙂", "Dobrý! 😃", "Super rande! 😍", "Best date ever! 💍"];
        const noteText = currentRating > 0 ? notes[currentRating - 1] : "";

        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
            const color = i <= currentRating ? "text-[#faa61a]" : "text-gray-600";
            starsHtml += `<i class="fas fa-star ${color} cursor-pointer hover:text-yellow-400 transition hover:scale-125" onclick="window.KiscordMap.rateDate('${loc.id}', ${i})"></i>`;
        }

        const searchSuffix = (loc.country === 'AT') ? " Zell am See, Rakousko" : " Česká republika";
        const mapsUrl = loc.url ? loc.url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + (loc.address ? ', ' + loc.address : searchSuffix))}`;

        const locationEvents = (state.timelineEvents || []).filter(e => String(e.location_id) === String(loc.id));
        const locationPhotos = [];
        locationEvents.forEach(e => {
            if (!e.images) return;
            let imgs = e.images;
            if (typeof imgs === 'string') {
                try { imgs = JSON.parse(imgs); } catch (_) { imgs = [imgs]; }
            }
            if (!Array.isArray(imgs)) return;
            imgs.forEach(img => {
                if (img) {
                    locationPhotos.push({ url: img, eventId: e.id, title: e.title, date: e.event_date });
                }
            });
        });

        const photosHtml = locationPhotos.length > 0
            ? locationPhotos.map(photo => {
                const rot = (Math.random() * 4 - 2).toFixed(1);
                return `
                    <div class="relative bg-white p-2 pb-6 shadow-md rounded-lg border border-gray-200 hover:scale-105 hover:rotate-0 transition-all duration-300 cursor-pointer select-none group/polaroid"
                         style="transform: rotate(${rot}deg);"
                         onclick="event.stopPropagation(); window.openGallery ? window.openGallery('${photo.eventId}') : null">
                        
                        <div class="w-full aspect-square overflow-hidden bg-gray-100 rounded-sm">
                            <img src="${photo.url}" class="w-full h-full object-cover transition duration-300 group-hover/polaroid:scale-110" />
                        </div>
                        <div class="absolute bottom-1.5 left-2 right-2 text-center font-bold text-xs truncate" style="font-family: 'Indie Flower', cursive; color: #4a5568;">
                            ${photo.title || 'Vzpomínka'}
                        </div>
                    </div>
                `;
            }).join('')
            : `<div class="col-span-full py-6 text-center text-gray-400 bg-[#202225]/60 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center gap-1.5">
                <i class="far fa-images text-2xl text-gray-500"></i>
                <p class="text-xs font-bold text-gray-300">Zatím tu nemáte žádné společné fotky.</p>
                <p class="text-[10px] text-gray-500">Nahrajte první vzpomínku níže! 👇</p>
               </div>`;

        panel.innerHTML = `
            <div class="p-5 md:p-6 overflow-y-auto max-h-[85vh] custom-scrollbar relative space-y-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-12 h-12 rounded-2xl bg-[#202225] flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                            ${loc.icon || '📍'}
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="text-xl font-black text-white leading-tight truncate">${loc.name}</h3>
                            <div class="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                <i class="fas fa-map-marker-alt text-[#eb459e] text-[10px]"></i>
                                <span class="truncate font-medium">${loc.desc || loc.address || "Bez popisu"}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.KiscordMap.closeLocationDetail()"
                            class="flex-shrink-0 w-9 h-9 bg-[#202225] hover:bg-[#ed4245] text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition shadow-lg group">
                        <i class="fas fa-times text-base group-hover:rotate-90 transition-transform"></i>
                    </button>
                </div>

                <div class="flex items-center justify-between bg-[#202225] px-3.5 py-2.5 rounded-2xl border border-white/5">
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">HODNOCENÍ:</span>
                    <div class="flex items-center gap-2">
                        <div class="flex text-base gap-1">${starsHtml}</div>
                        ${noteText ? `<span class="text-[#faa61a] text-[10px] font-bold italic animate-fade-in">${noteText}</span>` : ''}
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <button onclick="window.KiscordMap.addToRoute('${loc.id}')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition transform hover:scale-105 active:scale-95">
                        <i class="fas fa-plus"></i> Do trasy
                    </button>
                    <button onclick="document.getElementById('location-gallery-section')?.scrollIntoView({ behavior: 'smooth' })" class="bg-[#202225] hover:bg-[#2f3136] text-gray-200 hover:text-white border border-white/5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition">
                        <i class="fas fa-images text-[#eb459e]"></i> Fotky (${locationPhotos.length})
                    </button>
                    <a href="${mapsUrl}" target="_blank" class="bg-[#202225] hover:bg-[#2f3136] text-gray-200 hover:text-white border border-white/5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition">
                        <i class="fas fa-external-link-alt text-[#4285F4]"></i> Navigace
                    </a>
                </div>

                <div id="weather-container-${loc.id}" class="flex w-full">
                    <div class="flex items-center gap-3 bg-[#202225] p-3 rounded-2xl border border-white/5 w-full text-gray-400">
                        <i class="fas fa-spinner animate-spin text-[#eb459e]"></i>
                        <span class="text-xs font-medium">Načítám aktuální počasí...</span>
                    </div>
                </div>

                <div class="bg-[#202225] rounded-2xl p-4 border border-white/5 shadow-inner space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fas fa-calendar-alt text-[#eb459e]"></i> Naplánovat rande na toto místo
                        </span>
                        <label class="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" id="secret-date-toggle" onchange="document.getElementById('secret-date-fields').classList.toggle('hidden', !this.checked)" class="rounded text-[#eb459e] focus:ring-0">
                            <span class="text-[10px] font-bold text-pink-400">🔒 Tajné rande</span>
                        </label>
                    </div>

                    <div>
                        <input type="datetime-local" id="date-input" class="w-full bg-[#2f3136] text-white text-xs p-2.5 rounded-xl border border-transparent focus:border-[#eb459e] outline-none transition">
                    </div>
                    <div>
                        <input type="text" id="note-input" placeholder="Poznámka (např. Dáme si skleničku a dortík...)" class="w-full bg-[#2f3136] text-white text-xs p-2.5 rounded-xl border border-transparent focus:border-[#3ba55c] outline-none transition">
                    </div>

                    <div id="secret-date-fields" class="hidden p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl space-y-2.5 animate-fade-in">
                        <div class="text-[9px] font-black text-pink-400 uppercase tracking-wider flex items-center gap-1">
                            <i class="fas fa-user-secret"></i> Detaily pro překvapení partnera
                        </div>
                        <div>
                            <input type="text" id="secret-hint" placeholder="💡 Nápověda (např. Bude to sladké a s krásným výhledem...)" class="w-full bg-[#202225] text-white text-xs p-2 rounded-lg border border-white/5 outline-none">
                        </div>
                        <div>
                            <input type="text" id="secret-dress" placeholder="👟 Co na sebe (např. Pohodlné boty a teplý svetr)" class="w-full bg-[#202225] text-white text-xs p-2 rounded-lg border border-white/5 outline-none">
                        </div>
                    </div>

                    <button onclick="window.KiscordMap.saveDateToCalendar()" class="w-full bg-gradient-to-r from-[#3ba55c] to-[#2d7d46] hover:opacity-95 text-white py-2.5 rounded-xl flex items-center justify-center text-xs font-bold shadow-lg transition transform hover:scale-[1.01] active:scale-95">
                        <i class="fas fa-save mr-1.5"></i> Uložit rande do kalendáře 📅
                    </button>
                </div>

                <div class="flex gap-2 pt-1">
                    <button onclick="window.KiscordMap.editLocation('${loc.id}')" class="flex-1 bg-[#202225] hover:bg-[#2f3136] text-gray-300 hover:text-white py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 border border-white/5">
                        <i class="fas fa-pen text-[10px]"></i> Upravit
                    </button>
                    <button onclick="window.KiscordMap.deleteLocation('${loc.id}')" class="flex-1 bg-[#ed4245]/10 hover:bg-[#ed4245] text-[#ed4245] hover:text-white py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 border border-[#ed4245]/20">
                        <i class="fas fa-trash-alt text-[10px]"></i> Smazat
                    </button>
                </div>

                <div id="location-gallery-section" class="pt-3 border-t border-white/5">
                    <h4 class="text-sm font-black text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <i class="fas fa-images text-[#eb459e]"></i> Společné vzpomínky (${locationPhotos.length})
                    </h4>
                    <div class="grid grid-cols-2 gap-3">
                        ${photosHtml}
                    </div>
                </div>

                <div class="pt-3 border-t border-white/5">
                    <h4 class="text-sm font-black text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <i class="fas fa-camera text-[#eb459e]"></i> Přidat vzpomínku z rande
                    </h4>
                    <form id="upload-memory-form" onsubmit="event.preventDefault(); window.KiscordMap.uploadLocationMemory(event, '${loc.id}')" class="space-y-3">
                        <div>
                            <input type="text" id="memory-title" placeholder="Název vzpomínky (např. Naše první káva zde...)" required
                                   class="w-full bg-[#202225] text-white text-xs p-2.5 rounded-xl border border-transparent focus:border-[#eb459e] outline-none transition">
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <input type="date" id="memory-date" required
                                   class="w-full bg-[#202225] text-white text-xs p-2.5 rounded-xl border border-transparent focus:border-[#eb459e] outline-none transition">
                            <select id="memory-icon" class="w-full bg-[#202225] text-white text-xs p-2.5 rounded-xl border border-transparent focus:border-[#eb459e] outline-none transition">
                                <option value="❤️">❤️ Srdce</option>
                                <option value="☕">☕ Káva</option>
                                <option value="🍕">🍕 Jídlo</option>
                                <option value="🎬">🎬 Kino</option>
                                <option value="🚶">🚶 Procházka</option>
                                <option value="🍷">🍷 Víno</option>
                                <option value="✨">✨ Kouzlo</option>
                            </select>
                        </div>
                        <div>
                            <textarea id="memory-desc" rows="2" placeholder="Jaké to bylo? Co jsme zažili?"
                                      class="w-full bg-[#202225] text-white text-xs p-2.5 rounded-xl border border-transparent focus:border-[#eb459e] outline-none transition resize-none"></textarea>
                        </div>
                        <div>
                            <input type="file" id="memory-file" accept="image/*" required class="hidden" onchange="document.getElementById('memory-file-label').innerHTML = '<i class=\\'fas fa-check text-green-400\\'></i> ' + this.files[0]?.name">
                            <div onclick="document.getElementById('memory-file').click()" id="memory-file-label"
                                 class="w-full bg-[#202225] hover:bg-[#25282c] text-gray-400 hover:text-white border border-dashed border-white/10 hover:border-[#eb459e] p-3 rounded-xl text-center text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer">
                                 <i class="fas fa-cloud-upload-alt text-base text-[#eb459e]"></i>
                                 <span>Vyber fotografii...</span>
                            </div>
                        </div>
                        <button type="submit" id="memory-submit-btn"
                                class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white py-3 rounded-xl font-black text-xs shadow-lg transition transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2">
                            <i class="fas fa-heart animate-pulse"></i> Uložit vzpomínku ❤️
                        </button>
                    </form>
                </div>
            </div>
        `;

        const weatherContainerId = `weather-container-${loc.id}`;
        setTimeout(async () => {
            const container = document.getElementById(weatherContainerId);
            if (!container) return;
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,apparent_temperature,is_day,weather_code`);
                if (!res.ok) throw new Error("Weather API failed");
                const data = await res.json();
                if (!data.current) throw new Error("No current weather data");
                const temp = Math.round(data.current.temperature_2m);
                const apparent = Math.round(data.current.apparent_temperature);
                const code = data.current.weather_code;

                const weatherMap = {
                    0: { icon: "fa-sun text-yellow-400", text: "Jasno ☀️" },
                    1: { icon: "fa-cloud-sun text-orange-300", text: "Skoro jasno 🌤️" },
                    2: { icon: "fa-cloud-sun text-gray-300", text: "Polojasno ⛅" },
                    3: { icon: "fa-cloud text-gray-400", text: "Zataženo ☁️" },
                    45: { icon: "fa-smog text-gray-500", text: "Mlha 🌫️" },
                    51: { icon: "fa-cloud-rain text-blue-400", text: "Mrholení 🌧️" },
                    61: { icon: "fa-cloud-showers-heavy text-blue-500", text: "Déšť 🌧️" },
                    71: { icon: "fa-snowflake text-blue-300", text: "Sněžení ❄️" },
                    95: { icon: "fa-bolt text-yellow-500", text: "Bouřka ⚡" }
                };

                const weather = weatherMap[code] || { icon: "fa-thermometer-half text-red-400", text: "Aktuální počasí" };

                container.innerHTML = `
                    <div class="flex items-center justify-between bg-[#202225] p-3 rounded-2xl border border-white/5 w-full shadow-inner animate-fade-in">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-[#2f3136] flex items-center justify-center text-lg shadow-sm">
                                <i class="fas ${weather.icon}"></i>
                            </div>
                            <div>
                                <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest">AKTUÁLNÍ POČASÍ</div>
                                <div class="text-xs text-gray-200 font-bold">${weather.text}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xl font-black text-white">${temp}°C</div>
                            <div class="text-[9px] text-gray-400 font-medium">Pocitově: ${apparent}°C</div>
                        </div>
                    </div>
                `;
            } catch (e) {
                container.innerHTML = `
                    <div class="flex items-center gap-2 text-xs text-gray-400 bg-[#202225] p-3 rounded-2xl border border-white/5 w-full shadow-inner">
                        <i class="fas fa-cloud-sun text-gray-500"></i>
                        <span>Předpověď počasí k dispozici při připojení k internetu.</span>
                    </div>
                `;
            }
        }, 100);

        if (state.mapInstance) {
            const mapContainer = document.getElementById("leaflet-map");
            if (mapContainer) {
                const mapHeight = mapContainer.offsetHeight;
                const targetPoint = state.mapInstance.project([loc.lat, loc.lng], 16);
                const pointOffset = new L.Point(0, mapHeight * 0.15);
                const newCenter = state.mapInstance.unproject(targetPoint.add(pointOffset), 16);
                state.mapInstance.flyTo(newCenter, 16, { animate: true, duration: 1.2 });
            } else {
                state.mapInstance.flyTo([loc.lat, loc.lng], 16);
            }
        }

    } catch (err) {
        console.error("[selectLocation] Error:", err);
    }
}

export function closeLocationDetail() {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    panel.style.transform = "";
    panel.classList.remove("translate-y-0");
    panel.classList.add("translate-y-[130%]");
}

export async function rateDate(id, rating) {
    if (!state.dateRatings) state.dateRatings = {};

    if (state.dateRatings[id] === rating) {
        delete state.dateRatings[id];
        rating = 0;
    } else {
        state.dateRatings[id] = rating;
    }

    try {
        if (rating === 0) {
            await supabase.from('date_ratings').delete().eq('location_id', id);
        } else {
            await safeUpsert('date_ratings', {
                location_id: id,
                user_id: state.currentUser?.id,
                rating: rating,
                updated_at: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error('Failed to save date rating:', err);
    }

    triggerHaptic("success");

    selectLocation(id);
    const selectedCountry = getSelectedCountry();
    const countryLocations = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
    const currentFilter = state.dateFilter || 'all';
    const filtered = currentFilter === 'all' ? countryLocations : countryLocations.filter(l => l.cat === currentFilter);
    renderLocationList(filtered);
    renderMarkers(filtered);
}

export async function saveDateToCalendar() {
    const dateInput = document.getElementById("date-input")?.value;
    const noteInput = document.getElementById("note-input")?.value || "";
    const isSecret = document.getElementById("secret-date-toggle")?.checked || false;
    const secretHint = document.getElementById("secret-hint")?.value || "";
    const secretDress = document.getElementById("secret-dress")?.value || "";

    const selectedDateLocation = state.dateLocations?.find(l => String(l.id) === String(state.selectedLocationId)) || (state.dateLocations && state.dateLocations[0]);

    if (!dateInput || !selectedDateLocation) {
        showNotification("Vyber prosím datum a čas rande! 📅", "error");
        return;
    }

    const dateKey = dateInput.split("T")[0];
    if (!state.plannedDates) state.plannedDates = {};

    const currentUserName = state.currentUser?.name || 'Josef';

    const planEntry = {
        id: selectedDateLocation.id,
        name: selectedDateLocation.name,
        cat: selectedDateLocation.cat || 'date',
        time: dateInput.split("T")[1] || '18:00',
        note: noteInput,
        is_secret: isSecret,
        secret_hint: secretHint,
        secret_dress_code: secretDress,
        secret_unlock_hours: 1,
        created_by: currentUserName
    };
    state.plannedDates[dateKey] = planEntry;

    try {
        await safeUpsert('planned_dates', {
            date_key: dateKey,
            user_id: state.currentUser?.id,
            location_id: selectedDateLocation.id,
            name: planEntry.name,
            cat: planEntry.cat || 'date',
            time: planEntry.time,
            note: planEntry.note,
            is_secret: isSecret,
            secret_hint: secretHint,
            secret_dress_code: secretDress,
            secret_unlock_hours: 1,
            created_by: currentUserName,
            updated_at: new Date().toISOString()
        });
        
        const successMsg = isSecret 
            ? `Tajné rande připraveno! 🔒 Partner uvidí jen nápovědu a odpočet.`
            : `Rande na "${selectedDateLocation.name}" uloženo do kalendáře! 📅🥂`;
        showNotification(successMsg, "success");
        triggerConfetti();
    } catch (err) {
        console.error('Failed to save planned date:', err);
        showNotification("Nepodařilo se uložit rande do kalendáře.", "error");
    }
    
    closeLocationDetail();
}

export function pickRandomLocation() {
    const selectedCountry = getSelectedCountry();
    const candidates = (state.dateLocations || []).filter(l => (l.country || 'CZ') === selectedCountry);
    if (candidates.length === 0) {
        showNotification("V této zemi zatím nejsou žádná místa! 🎲", "error");
        return;
    }
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    selectLocation(winner.id);
    showNotification(`🎲 Kostka vybrala: "${winner.name}"!`, "success");
    triggerConfetti();
}

export function jumpToLocation(id) {
    const loc = (state.dateLocations || []).find(l => String(l.id) === String(id));
    if (!loc || !state.mapInstance) return;
    
    const locCountry = loc.country || 'CZ';
    const selectedCountry = getSelectedCountry();
    if (selectedCountry !== locCountry) {
        switchCountry(locCountry);
    }
    
    setTimeout(() => {
        state.mapInstance.flyTo([loc.lat, loc.lng], 16, {
            animate: true,
            duration: 1.2
        });
        selectLocation(id);
    }, 150);
}

