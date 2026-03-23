import { state } from '../../core/state.js';
import { triggerHaptic, getTodayKey } from '../../core/utils.js';
import { renderCalendar } from '../calendar.js';
import { getMoodColor } from './grid.js';

let currentModalDateKey = null;

export function getCurrentModalDateKey() {
    return currentModalDateKey;
}

import { renderModal, renderButton, renderInputGroup } from '../../core/ui.js';

export function ensureModals() {
    if (!document.getElementById("day-modal")) {
        const modalHtml = renderModal({
            id: 'day-modal',
            title: '<span id="modal-date-title">Datum</span>',
            subtitle: '<span id="modal-date-subtitle">Den v týdnu</span>',
            content: `
                <div id="modal-section-date" class="space-y-3"></div>
                <div id="modal-section-school" class="hidden space-y-4 pt-4 border-t border-white/5">
                    <h4 class="text-xs font-bold text-[#faa61a] uppercase mb-2 flex items-center gap-2"><i class="fas fa-graduation-cap"></i> Škola</h4>
                    <div id="school-event-display" class="hidden bg-[#faa61a]/10 border border-[#faa61a]/30 rounded-xl p-3 flex justify-between items-center">
                        <span id="school-event-text" class="text-white text-sm font-medium"></span>
                        <button class="text-red-400 hover:text-red-200 p-1"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div id="school-add-form" class="flex gap-2">
                       <input type="text" id="school-input" placeholder="Zkouška, test..." class="flex-1 bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#faa61a]/50 transition-all">
                       <button onclick="import('./js/modules/calendar.js').then(m => m.addSchoolEvent())" class="bg-[#faa61a] hover:bg-[#c88515] text-white px-4 rounded-xl transition shadow-lg active:scale-95"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                
                <div id="modal-section-health" class="space-y-4 pt-4 border-t border-white/5">
                    <div class="flex items-center justify-between">
                        <h4 class="text-xs font-bold text-[#3ba55c] uppercase flex items-center gap-2"><i class="fas fa-heartbeat"></i> Zdraví & Restart</h4>
                        <button onclick="import('./js/modules/calendar.js').then(m => m.toggleHealthEdit())" class="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-widest transition">Upravit</button>
                    </div>
                    
                    <div id="health-display-grid" class="grid grid-cols-2 gap-3">
                        <div class="bg-black/10 p-3 rounded-xl border border-white/5">
                            <span class="block text-[8px] text-gray-500 uppercase font-black mb-1 tracking-widest">Voda</span>
                            <span id="modal-health-water" class="text-white font-bold text-sm">0/8</span>
                        </div>
                        <div class="bg-black/10 p-3 rounded-xl border border-white/5">
                            <span class="block text-[8px] text-gray-500 uppercase font-black mb-1 tracking-widest">Spánek</span>
                            <span id="modal-health-sleep" class="text-white font-bold text-sm">-</span>
                        </div>
                        <div class="bg-black/10 p-3 rounded-xl border border-white/5">
                            <span class="block text-[8px] text-gray-500 uppercase font-black mb-1 tracking-widest">Nálada</span>
                            <span id="modal-health-mood" class="text-white font-bold text-sm">-</span>
                        </div>
                        <div class="bg-black/10 p-3 rounded-xl border border-white/5">
                            <span class="block text-[8px] text-gray-500 uppercase font-black mb-1 tracking-widest">Pohyb</span>
                            <div id="modal-health-movement" class="flex flex-wrap gap-1"></div>
                        </div>
                    </div>

                    <div id="health-edit-form" class="hidden space-y-4 bg-black/10 p-4 rounded-xl border border-white/10 animate-fade-in shadow-inner">
                        <div class="grid grid-cols-2 gap-3">
                            ${renderInputGroup({ label: 'Voda (ks)', id: 'edit-health-water', type: 'number' })}
                            ${renderInputGroup({ label: 'Spánek (h)', id: 'edit-health-sleep', type: 'number', attr: 'step="0.5"' })}
                        </div>
                        ${renderInputGroup({ label: 'Nálada (1-10)', id: 'edit-health-mood', type: 'number', attr: 'min="1" max="10"' })}
                        ${renderInputGroup({ label: 'Pohyb (gym, walk...)', id: 'edit-health-movement' })}
                        
                        <div class="flex gap-2 pt-2">
                             ${renderButton({ text: 'Zrušit', variant: 'secondary', className: 'flex-1', onclick: "import('./js/modules/calendar.js').then(m => m.toggleHealthEdit())" })}
                             ${renderButton({ text: 'Uložit', variant: 'success', className: 'flex-[2]', onclick: "import('./js/modules/calendar.js').then(m => m.saveHealthRecord())" })}
                        </div>
                    </div>
                </div>
            `
        });
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
    }
}

export function showDayDetail(dateKey) {
    ensureModals();
    currentModalDateKey = dateKey;
    const dateObj = new Date(dateKey);

    triggerHaptic('light');

    const todayKey = getTodayKey();
    const isPast = dateKey < todayKey;

    const titleEl = document.getElementById("modal-date-title");
    const subEl = document.getElementById("modal-date-subtitle");
    if (titleEl) titleEl.innerText = dateObj.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" });
    if (subEl) subEl.innerText = dateObj.toLocaleDateString("cs-CZ", { weekday: "long", year: "numeric" });

    const health = (state.healthData || {})[dateKey];
    const plannedDate = (state.plannedDates || {})[dateKey];
    const schoolEvent = (state.schoolEvents || {})[dateKey];
    const movieHistory = (state.movieHistory || {})[dateKey];
    const timelineEvent = (state.timelineEvents || []).find((e) => e.event_date === dateKey);

    const dateSection = document.getElementById("modal-section-date");
    const schoolSection = document.getElementById("modal-section-school");
    const healthSection = document.getElementById("modal-section-health");

    // A) PLÁNY
    const showDateSection = !isPast || timelineEvent || plannedDate || (movieHistory && movieHistory.length > 0);

    if (showDateSection && dateSection) {
        let plansHtml = `<h4 class="text-xs font-bold text-[#eb459e] uppercase mb-2 flex items-center gap-2"><i class="fas fa-calendar-day"></i> Plány & Vzpomínky</h4>`;

        if (timelineEvent) {
            plansHtml += `
            <div class="bg-gradient-to-r from-[#5865F2]/10 to-[#eb459e]/10 border border-[#5865F2]/30 rounded-lg p-3 relative group hover:border-[#eb459e] transition cursor-pointer"
                 onclick="import('./js/modules/calendar.js').then(m => m.closeDayModal()); import('./js/modules/timeline.js').then(m => m.jumpToTimeline('${timelineEvent.id}'))">
                <div class="font-bold text-white text-sm flex items-center justify-between gap-2">
                    <span class="flex items-center gap-2">
                        <i class="fas ${timelineEvent.icon || "fa-star"} text-[#faa61a]"></i>
                        ${timelineEvent.title}
                    </span>
                    <i class="fas fa-external-link-alt text-[10px] text-gray-500 group-hover:text-white transition"></i>
                </div>
                <div class="text-[10px] text-gray-400 mt-1 italic">Kliknutím přejdeš na záznam v Timeline</div>
            </div>`;
        } else if (plannedDate) {
            const iconsMap = {
                food: '🍔',
                walk: '🌲',
                view: '⛰️',
                fun: '⚡',
                movie: '🎬',
                discord: '🎧',
                game: '🎮',
                date: '🥂'
            };
            const icon = iconsMap[plannedDate.cat] || "📍";

            plansHtml += `
            <div class="bg-[#eb459e]/10 border border-[#eb459e]/30 rounded-lg p-3 relative group">
                <div class="font-bold text-white text-sm flex items-center gap-2"><span>${icon}</span> ${plannedDate.name}</div>
                <div class="text-xs text-gray-300 mt-1">Čas: ${plannedDate.time || "Neurčeno"}</div>
                <div class="text-xs text-gray-400 mt-1 italic">${plannedDate.note || ""}</div>
                <button onclick="import('./js/modules/calendar.js').then(m => m.deletePlannedDate('${dateKey}'))" class="absolute top-2 right-2 text-red-400 hover:text-red-200 p-2 transition"><i class="fas fa-trash"></i></button>
            </div>`;
        } else {
            plansHtml += `
            <div class="flex flex-col gap-2">
                <div class="flex gap-2">
                    <select id="plan-type" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none flex-1">
                        <option value="discord">🎧 Discord</option>
                        <option value="game">🎮 Hra</option>
                        <option value="movie">🎬 Film</option>
                        <option value="date">📍 Rande</option>
                    </select>
                    <input type="time" id="plan-time" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none w-20">
                </div>
                <div class="flex gap-2">
                    <input type="text" id="plan-name" placeholder="Co podnikneme?" class="flex-1 bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none">
                    <button onclick="import('./js/modules/calendar.js').then(m => m.addCustomPlan())" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 rounded transition"><i class="fas fa-plus"></i></button>
                </div>
            </div>`;
        }

        if (movieHistory && movieHistory.length > 0) {
            plansHtml += `<div class="mt-4 space-y-3">`;
            movieHistory.forEach(item => {
                const libItem = [...(state.library?.movies || []), ...(state.library?.series || [])].find(m => m.id === item.media_id);
                const title = libItem ? libItem.title : "Neznámý film";
                const icon = libItem && libItem.icon ? libItem.icon : "🎬";
                const ratingStars = "⭐".repeat(item.rating || 0);
                
                plansHtml += `
                <div class="bg-[#2f3136] border border-[#202225] rounded-xl p-3 hover:border-[#eb459e]/30 transition cursor-pointer"
                     onclick="import('./js/modules/library.js').then(m => m.openHistoryModal(${item.media_id}))">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="text-xl">${icon}</div>
                        <div class="flex-1 overflow-hidden">
                            <div class="text-xs font-bold text-white truncate">${title}</div>
                            <div class="text-[10px] text-yellow-400">${ratingStars}</div>
                        </div>
                        ${item.status === 'seen' ? '<div class="text-sm">🔥</div>' : '<div class="text-sm">🍿</div>'}
                    </div>
                    ${item.reaction ? `<div class="bg-[#202225] p-2 rounded-lg text-xs text-gray-300 italic border-l-2 border-[#eb459e] mt-1">"${item.reaction}"</div>` : `<div class="text-[10px] text-gray-500 italic ml-1">Bez recenze...</div>`}
                </div>`;
            });
            plansHtml += `</div>`;
        }

        dateSection.innerHTML = plansHtml;
        dateSection.classList.remove("hidden");
    } else if (dateSection) {
        dateSection.classList.add("hidden");
    }

    // B) ŠKOLA
    if (schoolSection) {
        if (isPast) {
            schoolSection.classList.add("hidden");
        } else {
            schoolSection.classList.remove("hidden");
            const schoolDisplay = document.getElementById("school-event-display");
            const schoolForm = document.getElementById("school-add-form");

            if (schoolEvent) {
                schoolDisplay.classList.remove("hidden");
                schoolForm.classList.add("hidden");
                document.getElementById("school-event-text").innerText = schoolEvent.title;
                const delBtn = schoolDisplay.querySelector("button");
                delBtn.onclick = () => deleteSchoolEvent();
            } else {
                schoolDisplay.classList.add("hidden");
                schoolForm.classList.remove("hidden");
                document.getElementById("school-input").value = "";
            }
        }
    }

    // C) ZDRAVÍ
    if (healthSection) {
        healthSection.classList.remove("hidden");
        
        document.getElementById("modal-health-water").innerText = "0/8";
        document.getElementById("modal-health-sleep").innerText = "-";
        document.getElementById("modal-health-mood").innerText = "-";
        const moveContainer = document.getElementById("modal-health-movement");
        if (moveContainer) moveContainer.innerHTML = '<span class="text-gray-500 italic text-[10px]">Žádný pohyb</span>';
        
        const displayGrid = document.getElementById("health-display-grid");
        const editForm = document.getElementById("health-edit-form");
        if (displayGrid) displayGrid.classList.remove("hidden");
        if (editForm) editForm.classList.add("hidden");

        if (health) {
            document.getElementById("modal-health-water").innerText = `${health.water || 0}/8`;

            let sleepText = "-";
            if (typeof health.sleep === 'number') {
                const h = health.sleep;
                let icon = "😐";
                if (h < 5) icon = "🧟‍♀️"; else if (h >= 9) icon = "👸"; else if (h >= 7) icon = "✨";
                sleepText = `${h}h ${icon}`;
            } else if (health.sleep) {
                const sleepMap = { zombie: "Zombie 🧟‍♀️", ok: "Ujde to 😐", good: "Růženka 👸" };
                sleepText = sleepMap[health.sleep] || "-";
            }
            document.getElementById("modal-health-sleep").innerHTML = sleepText;
            
            let moodText = "-";
            if (typeof health.mood === 'number') {
                let val = health.mood;
                if (val > 10) val = Math.round(val / 10);
                const hexColor = getMoodColor(val);
                moodText = `<span class="px-2 py-0.5 rounded font-bold text-white shadow-sm" style="background-color: ${hexColor}">${val}/10</span>`;
            } else if (health.mood) {
                const moodIcons = { happy: "🥰", tired: "😴", sad: "😢", angry: "😡", horny: "😈" };
                moodText = `${health.mood} ${moodIcons[health.mood] || ""}`;
            }
            document.getElementById("modal-health-mood").innerHTML = moodText;

            if (moveContainer) {
                const moveIconMap = { gym: "💪 Fitko", walk: "🌲 Proch.", run: "🏃‍♀️ Běh", yoga: "🧘‍♀️ Jóga", sex: "🔥 Love", clean: "🧹 Úklid", bike: "🚲 Kolo" };
                const moves = health.movement || [];
                if (moves.length > 0) {
                    moveContainer.innerHTML = moves.map((m) => `<span class="bg-[#202225] px-2 py-1 rounded text-[10px] border border-gray-700">${moveIconMap[m] || m}</span>`).join("");
                }
            }
        }
    }

    const modal = document.getElementById("day-modal");
    if (modal) modal.style.display = "flex";
}

export function closeDayModal() {
    const modal = document.getElementById("day-modal");
    if (modal) modal.style.display = "none";
    currentModalDateKey = null;
}

export async function deletePlannedDate(dateKey) {
    if (!state.plannedDates) state.plannedDates = {};
    delete state.plannedDates[dateKey];

    try {
        const { supabase } = await import('../../core/supabase.js');
        await supabase.from('planned_dates').delete().eq('date_key', dateKey);
    } catch (err) {
        console.error('Failed to delete planned date:', err);
    }

    showDayDetail(dateKey);
    renderCalendar();
    triggerHaptic("medium");
    window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Plán smazán 🗑️", type: "info" } }));
}

export async function addCustomPlan() {
    const type = document.getElementById("plan-type").value;
    const name = document.getElementById("plan-name").value;
    const time = document.getElementById("plan-time").value;

    if (!name || !currentModalDateKey) return;

    if (!state.plannedDates) state.plannedDates = {};
    
    const planId = crypto.randomUUID();
    state.plannedDates[currentModalDateKey] = {
        id: planId,
        name: name,
        cat: type,
        time: time,
        note: "Vlastní plán",
    };

    try {
        const { supabase } = await import('../../core/supabase.js');
        const { error } = await supabase.from('planned_dates').upsert({
            id: planId,
            date_key: currentModalDateKey,
            name: name,
            cat: type,
            time: time,
            note: "Vlastní plán",
            updated_at: new Date().toISOString()
        }, { onConflict: 'date_key' });

        if (error) throw error;
    } catch (err) {
        console.error('Failed to save custom plan:', err);
        window.dispatchEvent(new CustomEvent('notification', { 
            detail: { message: "Chyba synchronizace se serverem ☁️", type: "error" } 
        }));
    }

    showDayDetail(currentModalDateKey);
    renderCalendar();
    triggerHaptic("success");
}

export function addSchoolEvent() {
    const input = document.getElementById("school-input");
    const title = input.value.trim();

    if (!title || !currentModalDateKey) return;

    if (!state.schoolEvents) state.schoolEvents = {};
    state.schoolEvents[currentModalDateKey] = {
        title: title,
        type: "exam",
    };

    import('../../core/supabase.js').then(({ supabase }) => {
        supabase.from('school_events').upsert({
            date_key: currentModalDateKey,
            title: title,
            type: "exam"
        });
    });

    const display = document.getElementById("school-event-display");
    const form = document.getElementById("school-add-form");
    const text = document.getElementById("school-event-text");

    if (display && form && text) {
        display.classList.remove("hidden");
        form.classList.add("hidden");
        text.innerText = title;
        const delBtn = display.querySelector("button");
        if (delBtn) delBtn.onclick = () => deleteSchoolEvent();
    }

    renderCalendar();
    triggerHaptic("success");
}

export function deleteSchoolEvent() {
    if (!currentModalDateKey) return;

    triggerHaptic('heavy');
    if (state.schoolEvents) delete state.schoolEvents[currentModalDateKey];

    import('../../core/supabase.js').then(({ supabase }) => {
        supabase.from('school_events').delete().eq('date_key', currentModalDateKey);
    });

    const display = document.getElementById("school-event-display");
    const form = document.getElementById("school-add-form");
    const input = document.getElementById("school-input");

    if (display && form && input) {
        display.classList.add("hidden");
        form.classList.remove("hidden");
        input.value = "";
    }

    renderCalendar();
}

export function toggleHealthEdit() {
    const displayGrid = document.getElementById("health-display-grid");
    const editForm = document.getElementById("health-edit-form");
    if (!displayGrid || !editForm) return;

    if (editForm.classList.contains("hidden")) {
        triggerHaptic('light');
        const health = (state.healthData || {})[currentModalDateKey] || {};
        
        const waterEl = document.getElementById("edit-health-water");
        const sleepEl = document.getElementById("edit-health-sleep");
        const moodEl = document.getElementById("edit-health-mood");
        const moveEl = document.getElementById("edit-health-movement");

        if (waterEl) waterEl.value = health.water || 0;
        
        let sleepVal = health.sleep;
        if (typeof sleepVal === 'string') {
           if(sleepVal === 'zombie') sleepVal = 4;
           else if(sleepVal === 'good') sleepVal = 8;
           else sleepVal = 7;
        }
        if (sleepEl) sleepEl.value = sleepVal !== undefined ? sleepVal : "";

        let moodVal = health.mood;
        if (typeof moodVal === 'number' && moodVal > 10) moodVal = Math.round(moodVal / 10);
        if (typeof moodVal === 'string') {
            if(moodVal === 'happy' || moodVal === 'horny') moodVal = 9;
            else if(moodVal === 'sad' || moodVal === 'angry') moodVal = 3;
            else moodVal = 5;
        }
        if (moodEl) moodEl.value = moodVal !== undefined ? moodVal : "";

        const moves = health.movement || [];
        if (moveEl) moveEl.value = moves.join(", ");

        displayGrid.classList.add("hidden");
        editForm.classList.remove("hidden");
    } else {
        displayGrid.classList.remove("hidden");
        editForm.classList.add("hidden");
    }
}

export function saveHealthRecord() {
    if (!currentModalDateKey) return;
    
    const water = parseInt(document.getElementById("edit-health-water").value) || 0;
    const sleepInput = document.getElementById("edit-health-sleep").value;
    const sleep = sleepInput ? parseFloat(sleepInput) : undefined;
    
    const moodInput = document.getElementById("edit-health-mood").value;
    const mood = moodInput ? parseInt(moodInput) : undefined;
    
    const movementStr = document.getElementById("edit-health-movement").value;
    const movement = movementStr ? movementStr.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : [];

    const existing = (state.healthData || {})[currentModalDateKey] || {};

    let newHealth = {
        ...existing,
        water,
        movement
    };
    
    if (sleep !== undefined) newHealth.sleep = sleep;
    if (mood !== undefined) newHealth.mood = mood;

    if (!state.healthData) state.healthData = {};
    state.healthData[currentModalDateKey] = newHealth;

    import('../../core/supabase.js').then(({ supabase }) => {
        supabase.from('health_data').upsert({
            date_key: currentModalDateKey,
            user_id: state.currentUser.id,
            water: newHealth.water,
            sleep: newHealth.sleep,
            mood: newHealth.mood,
            movement: newHealth.movement
        });
    });

    import('../achievements.js').then(m => {
        m.checkHealthAchievements(currentModalDateKey, newHealth, state.healthData);
    });

    const storageKey = `vault_health_${state.currentUser.name.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(state.healthData));
    
    showDayDetail(currentModalDateKey);
    renderCalendar();
    
    triggerHaptic("success");
    window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Zdraví uloženo 🏥", type: "success" } }));
}
