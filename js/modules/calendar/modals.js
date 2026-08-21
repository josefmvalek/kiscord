import { state, saveStateToCache } from '../../core/state.js';
import { triggerHaptic, getTodayKey } from '../../core/utils.js';
import { renderCalendar } from '../calendar.js';
import { getMoodColor } from './grid.js';
import { safeUpsert } from '../../core/offline.js';
import { SHIFT_PRESETS } from '../shifts.js';
import { showConfirmDialog, showNotification } from '../../core/theme.js';
import { supabase } from '../../core/supabase.js';

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
            size: 'lg',
            content: `
                <div id="modal-section-health" class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h4 class="text-xs font-bold text-[#3ba55c] uppercase flex items-center gap-2"><i class="fas fa-heartbeat"></i> Zdraví & Restart</h4>
                        <button onclick="Calendar.toggleHealthEdit()" class="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-widest transition">Upravit</button>
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
                        <div class="bg-black/10 p-3 rounded-xl border border-white/5">
                            <span class="block text-[8px] text-gray-500 uppercase font-black mb-1 tracking-widest">Léky</span>
                            <span id="modal-health-pills" class="text-white font-bold text-sm">-</span>
                        </div>
                        <div class="bg-black/10 p-3 rounded-xl border border-white/5 col-span-2">
                            <span class="block text-[8px] text-gray-500 uppercase font-black mb-1 tracking-widest">Suplementy</span>
                            <div id="modal-health-supplements" class="flex gap-3 mt-1"></div>
                        </div>
                    </div>

                    <div id="health-edit-form" class="hidden space-y-4 bg-black/10 p-4 rounded-xl border border-white/10 animate-fade-in shadow-inner">
                        <div class="grid grid-cols-2 gap-3">
                            ${renderInputGroup({ label: 'Voda (ks)', id: 'edit-health-water', type: 'number' })}
                            ${renderInputGroup({ label: 'Spánek (h)', id: 'edit-health-sleep', type: 'number', attr: 'step="0.5"' })}
                        </div>
                        <div class="flex flex-wrap gap-4 mb-2 mt-2 px-1">
                              <div class="flex items-center gap-2">
                                 <input type="checkbox" id="edit-health-pills" class="w-4 h-4 rounded text-[#e74c3c] bg-[#202225] border-white/10 accent-[#e74c3c] cursor-pointer" />
                                 <label for="edit-health-pills" class="text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer">Léky</label>
                              </div>
                              <div class="flex items-center gap-2">
                                 <input type="checkbox" id="edit-health-iron" class="w-4 h-4 rounded text-red-400 bg-[#202225] border-white/10 accent-red-400 cursor-pointer" />
                                 <label for="edit-health-iron" class="text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer">Železo</label>
                              </div>
                              <div class="flex items-center gap-2">
                                 <input type="checkbox" id="edit-health-zinc" class="w-4 h-4 rounded text-yellow-400 bg-[#202225] border-white/10 accent-yellow-400 cursor-pointer" />
                                 <label for="edit-health-zinc" class="text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer">Zinek</label>
                              </div>
                              <div class="flex items-center gap-2">
                                 <input type="checkbox" id="edit-health-magnesium" class="w-4 h-4 rounded text-purple-400 bg-[#202225] border-white/10 accent-purple-400 cursor-pointer" />
                                 <label for="edit-health-magnesium" class="text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer">Hořčík</label>
                              </div>
                        </div>
                        ${renderInputGroup({ label: 'Nálada (1-10)', id: 'edit-health-mood', type: 'number', attr: 'min="1" max="10"' })}
                        ${renderInputGroup({ label: 'Pohyb (gym, walk...)', id: 'edit-health-movement' })}
                        
                        <div class="flex gap-2 pt-2">
                             ${renderButton({ text: 'Zrušit', variant: 'secondary', className: 'flex-1', onclick: "Calendar.toggleHealthEdit()" })}
                             ${renderButton({ text: 'Uložit', variant: 'success', className: 'flex-[2]', onclick: "Calendar.saveHealthRecord()" })}
                        </div>
                    </div>
                </div>

                <div id="modal-section-shifts" class="hidden space-y-4 pt-4 border-t border-white/5"></div>

                <div id="modal-section-gym" class="hidden space-y-4 pt-4 border-t border-white/5"></div>

                <div id="modal-section-date" class="hidden space-y-3 pt-4 border-t border-white/5"></div>

                <div id="modal-section-diary" class="hidden space-y-4 pt-4 border-t border-white/5"></div>
                
                <div id="modal-section-school" class="hidden space-y-4 pt-4 border-t border-white/5">
                    <h4 class="text-xs font-bold text-[#faa61a] uppercase mb-2 flex items-center gap-2"><i class="fas fa-graduation-cap"></i> Škola</h4>
                    <div id="school-event-display" class="hidden bg-[#faa61a]/10 border border-[#faa61a]/30 rounded-xl p-3 flex justify-between items-center">
                        <span id="school-event-text" class="text-white text-sm font-medium"></span>
                        <button class="text-red-400 hover:text-red-200 p-1"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div id="school-add-form" class="flex gap-2">
                       <input type="text" id="school-input" placeholder="Zkouška, test..." class="flex-1 bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#faa61a]/50 transition-all">
                       <button onclick="Calendar.addSchoolEvent()" class="bg-[#faa61a] hover:bg-[#c88515] text-white px-4 rounded-xl transition shadow-lg active:scale-95"><i class="fas fa-plus"></i></button>
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
    const [yr, mo, dy] = dateKey.split('-').map(Number);
    const dateObj = new Date(yr, mo - 1, dy);

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
                 onclick="Calendar.closeDayModal(); window.loadModule('timeline').then(m => m.jumpToTimeline('${timelineEvent.id}'))">
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
                food: '🍔', walk: '🌲', view: '⛰️', fun: '⚡',
                movie: '🎬', discord: '🎧', game: '🎮', date: '🥂', gym: '🏋️‍♂️'
            };
            const icon = iconsMap[plannedDate.cat] || '📍';

            // Status
            const planStatusDefs = {
                idea:      { icon: '💭', label: 'Nápad',       color: 'text-gray-400',    bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
                confirmed: { icon: '📅', label: 'Potvrzeno',    color: 'text-[#5865F2]', bg: 'bg-[#5865F2]/10', border: 'border-[#5865F2]/30' },
                happened:  { icon: '🎉', label: 'Proběhlo',     color: 'text-[#3ba55c]', bg: 'bg-[#3ba55c]/10', border: 'border-[#3ba55c]/30' }
            };
            const planStatusOrder = ['idea', 'confirmed', 'happened'];
            const planStatus = plannedDate.status || 'idea';
            const planStatusDef = planStatusDefs[planStatus] || planStatusDefs.idea;

            // Checklist
            const checklist = plannedDate.checklist || [];
            const checklistHtml = checklist.length > 0 ? `
                <div class="mt-3 space-y-1.5">
                    <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Checklist</div>
                    ${checklist.map((item, idx) => `
                        <div class="flex items-center gap-2 group/check">
                            <button onclick="Calendar.toggleChecklistItem('${dateKey}', ${idx})" 
                                    class="w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${item.done ? 'bg-[#3ba55c] border-[#3ba55c] text-white' : 'border-gray-600 text-transparent hover:border-gray-400'}">
                                <i class="fas fa-check text-[8px]"></i>
                            </button>
                            <span class="text-xs ${item.done ? 'line-through text-gray-600' : 'text-gray-300'}">${item.text}</span>
                        </div>
                    `).join('')}
                </div>
            ` : '';

            plansHtml += `
            <div class="bg-[#eb459e]/10 border border-[#eb459e]/30 rounded-xl p-4 relative group">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="font-bold text-white text-sm flex items-center gap-2">
                        <span>${icon}</span> ${plannedDate.name}
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <!-- Status badge - clickable cycle -->
                        <button onclick="Calendar.cyclePlanStatus('${dateKey}')"
                                title="Klik pro změnu stavu"
                                class="flex items-center gap-1 px-2 py-1 rounded-lg ${planStatusDef.bg} ${planStatusDef.border} border ${planStatusDef.color} text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 active:scale-95">
                            ${planStatusDef.icon} ${planStatusDef.label}
                        </button>
                        <button onclick="Calendar.deletePlannedDate('${dateKey}')" class="text-red-400 hover:text-red-200 p-1 transition">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                ${plannedDate.time ? `<div class="text-xs text-gray-400 mb-1"><i class="far fa-clock text-[#5865F2] mr-1"></i>${plannedDate.time}</div>` : ''}
                ${plannedDate.note && plannedDate.note !== 'Vlastní plán' ? `<div class="text-xs text-gray-400 italic">${plannedDate.note}</div>` : ''}
                ${plannedDate.backup_plan ? `<div class="mt-2 bg-black/20 rounded-lg p-2 text-xs text-gray-400"><i class="fas fa-umbrella mr-1 text-[#faa61a]"></i><span class="text-[#faa61a] font-bold">Záloha:</span> ${plannedDate.backup_plan}</div>` : ''}
                ${checklistHtml}
            </div>`;

        } else {
            plansHtml += `
            <div class="flex flex-col gap-2">
                <div class="flex gap-2">
                    <select id="plan-type" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none flex-1">
                        <option value="gym">🏋️‍♂️ Posilovna</option>
                        <option value="discord">🎧 Discord</option>
                        <option value="game">🎮 Hra</option>
                        <option value="movie">🎬 Film</option>
                        <option value="date">📍 Rande</option>
                    </select>
                    <input type="time" id="plan-time" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none w-20">
                </div>
                <input type="text" id="plan-name" placeholder="Co podnikneme?" class="flex-1 bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none">
                <input type="text" id="plan-backup" placeholder="Záložní plán (pokud prší...)" 
                       class="flex-1 bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none focus:border-[#faa61a]/50 transition">
                <input type="text" id="plan-checklist" placeholder="Checklist položky oddělené přípoji: deka, víno..." 
                       class="flex-1 bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition">
                <button onclick="Calendar.addCustomPlan()" class="bg-[#5865F2] hover:bg-[#4752c4] text-white py-2 rounded transition font-bold text-xs flex items-center justify-center gap-2">
                    <i class="fas fa-plus"></i> Přidat plán
                </button>
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
                     onclick="window.loadModule('library').then(m => m.openHistoryModal(${item.media_id}))">
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

    // B) ŠKOLA & DEADLINY
    if (schoolSection) {
        schoolSection.classList.remove("hidden");
        const schoolDisplay = document.getElementById("school-event-display");
        const schoolForm = document.getElementById("school-add-form");

        const dayDate = new Date(dateKey);
        const dayOfWeek = dayDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const daySchedule = (state.scheduleItems || []).filter(s => s.day_of_week === dayOfWeek);
        const deadlinesOnDate = (state.schoolDeadlines || []).filter(d => d.deadline_date === dateKey);

        let schoolHtml = '';

        if (!isWeekend && daySchedule.length > 0) {
            schoolHtml += `
                <div class="space-y-2 mb-3 bg-[#202225] border border-emerald-500/20 rounded-2xl p-3">
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/5">
                        <span class="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fas fa-graduation-cap"></i> VUT FIT Výuka (${daySchedule.length} hod.):
                        </span>
                        <button onclick="window.switchChannel('schedule')" class="text-[9px] font-bold text-emerald-400/80 hover:text-emerald-300 transition uppercase tracking-wider flex items-center gap-1">
                            Celý rozvrh <i class="fas fa-arrow-right text-[7px]"></i>
                        </button>
                    </div>
                    <div class="space-y-1.5 pt-0.5">
                        ${daySchedule.sort((a, b) => (a.time_start || '').localeCompare(b.time_start || '')).map(sub => `
                            <div class="flex items-center justify-between bg-black/30 border border-white/5 p-2 rounded-xl text-xs">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded">[${sub.subject_code || 'FIT'}]</span>
                                    <div class="min-w-0">
                                        <div class="text-xs font-bold text-white truncate">${sub.name}</div>
                                        <span class="text-[9px] text-gray-400 block">${sub.type || 'Výuka'} • Učebna ${sub.room || 'Božetěchova'}</span>
                                    </div>
                                </div>
                                <span class="text-[10px] text-emerald-300 font-mono font-bold ml-2 flex-shrink-0">${sub.time_start} - ${sub.time_end}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (schoolEvent) {
            schoolHtml += `
                <div class="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5 mb-2">
                    <span class="text-xs font-bold text-white">${schoolEvent.title}</span>
                    <button onclick="Calendar.deleteSchoolEvent()" class="text-gray-500 hover:text-red-400 p-1 transition"><i class="fas fa-trash-alt text-xs"></i></button>
                </div>
            `;
        }

        if (deadlinesOnDate.length > 0) {
            schoolHtml += `
                <div class="space-y-1.5 mb-2">
                    <span class="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">FIT Deadliny & Zkoušky:</span>
                    ${deadlinesOnDate.map(dl => `
                        <div class="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-xl text-xs">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">${dl.subject_code || 'FIT'}</span>
                                <span class="${dl.is_completed ? 'line-through text-gray-500' : 'text-white font-bold'} truncate">${dl.title}</span>
                            </div>
                            <span class="text-[10px] text-gray-400 font-mono">${dl.deadline_time || '23:59'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (schoolHtml) {
            if (schoolDisplay) {
                schoolDisplay.innerHTML = schoolHtml;
                schoolDisplay.classList.remove("hidden");
            }
            if (schoolForm) schoolForm.classList.add("hidden");
        } else {
            if (schoolDisplay) schoolDisplay.classList.add("hidden");
            if (schoolForm) {
                schoolForm.classList.remove("hidden");
                const inp = document.getElementById("school-input");
                if (inp) inp.value = "";
            }
        }
    }

    // C) ZDRAVÍ
    if (healthSection) {
        healthSection.classList.remove("hidden");
        
        document.getElementById("modal-health-water").innerText = "0/8";
        document.getElementById("modal-health-sleep").innerText = "-";
        document.getElementById("modal-health-mood").innerText = "-";
        const pillsSpan = document.getElementById("modal-health-pills");
        if (pillsSpan) pillsSpan.innerText = "-";
        const suppsContainer = document.getElementById("modal-health-supplements");
        if (suppsContainer) suppsContainer.innerHTML = '<span class="text-gray-500 italic text-[10px]">Nic</span>';
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
            if (pillsSpan) {
                pillsSpan.innerText = health.pills ? "Ano 💊" : "Ne";
            }
            if (suppsContainer) {
                const s = health.supplements || { iron: false, zinc: false, magnesium: false };
                const items = [
                    { id: 'iron', icon: '🩸', label: 'Železo', color: 'text-red-400' },
                    { id: 'zinc', icon: '✨', label: 'Zinek', color: 'text-yellow-400' },
                    { id: 'magnesium', icon: '🌙', label: 'Hořčík', color: 'text-purple-400' }
                ];
                suppsContainer.innerHTML = items.map(it => `
                    <div class="flex items-center gap-1.5 opacity-${s[it.id] ? '100' : '20'} transition-opacity">
                        <span class="text-sm">${it.icon}</span>
                        <span class="text-[9px] font-bold uppercase ${s[it.id] ? it.color : 'text-gray-500'}">${it.label}</span>
                    </div>
                `).join('');
            }
        }
    }

    // D) SMĚNY & PRÁCE
    const shiftsSection = document.getElementById("modal-section-shifts");
    if (shiftsSection) {
        const dayShifts = (state.shifts || {})[dateKey];
        shiftsSection.classList.remove("hidden");
        
        let shiftsHtml = `
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-bold text-[#faa61a] uppercase flex items-center gap-2"><i class="fas fa-business-time"></i> Směny & Volno</h4>
                <button onclick="Calendar.closeDayModal(); window.loadModule('shifts')" class="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-widest transition">
                    Upravit
                </button>
            </div>
        `;

        const jose = dayShifts?.jose;
        const klarka = dayShifts?.klarka;

        if (jose && klarka && jose.shift_type === 'volno' && klarka.shift_type === 'volno') {
            shiftsHtml += `
                <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center mb-3">
                    <span class="text-xs font-black text-emerald-400 uppercase tracking-widest">🌴 Společné volno! 🥳</span>
                </div>
            `;
        }

        const josePreset = jose ? (SHIFT_PRESETS[jose.shift_type] || SHIFT_PRESETS.custom) : null;
        const klarkaPreset = klarka ? (SHIFT_PRESETS[klarka.shift_type] || SHIFT_PRESETS.custom) : null;

        const joseTime = jose && jose.time_start && jose.time_end ? `${jose.time_start} - ${jose.time_end}` : '';
        const klarkaTime = klarka && klarka.time_start && klarka.time_end ? `${klarka.time_start} - ${klarka.time_end}` : '';

        shiftsHtml += `
            <div class="grid grid-cols-2 gap-3">
                <!-- Jožka -->
                <div class="p-3 rounded-xl border ${jose ? 'bg-blue-500/5 border-blue-500/20' : 'bg-black/10 border-white/5 opacity-50'}">
                    <span class="block text-[8px] text-blue-400 uppercase font-black tracking-widest mb-1">Jožka</span>
                    ${jose ? `
                        <div class="flex items-center gap-1.5 mb-1">
                            <span class="text-base">${josePreset.emoji}</span>
                            <span class="text-xs font-bold text-white">${josePreset.label.split(' ')[0]}</span>
                        </div>
                        ${joseTime ? `<span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white/80">${joseTime}</span>` : ''}
                        ${jose.note ? `<p class="text-[9px] text-gray-400 mt-1.5 italic truncate" title="${jose.note}">"${jose.note}"</p>` : ''}
                    ` : `
                        <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nezadáno</span>
                    `}
                </div>
                <!-- Klárka -->
                <div class="p-3 rounded-xl border ${klarka ? 'bg-pink-500/5 border-pink-500/20' : 'bg-black/10 border-white/5 opacity-50'}">
                    <span class="block text-[8px] text-pink-400 uppercase font-black tracking-widest mb-1">Klárka</span>
                    ${klarka ? `
                        <div class="flex items-center gap-1.5 mb-1">
                            <span class="text-base">${klarkaPreset.emoji}</span>
                            <span class="text-xs font-bold text-white">${klarkaPreset.label.split(' ')[0]}</span>
                        </div>
                        ${klarkaTime ? `<span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white/80">${klarkaTime}</span>` : ''}
                        ${klarka.note ? `<p class="text-[9px] text-gray-400 mt-1.5 italic truncate" title="${klarka.note}">"${klarka.note}"</p>` : ''}
                    ` : `
                        <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nezadáno</span>
                    `}
                </div>
            </div>
        `;

        shiftsSection.innerHTML = shiftsHtml;
    }

    // E) ALPSKÝ DENÍČEK
    const diarySection = document.getElementById("modal-section-diary");
    if (diarySection) {
        const diaryHtml = renderDiarySectionHtml(dateKey);
        if (diaryHtml) {
            diarySection.innerHTML = diaryHtml;
            diarySection.classList.remove("hidden");
        } else {
            diarySection.classList.add("hidden");
        }
    }

    // F) POSILOVNA & TRÉNINKY
    const gymSection = document.getElementById("modal-section-gym");
    if (gymSection) {
        const gymHtml = renderGymSectionHtml(dateKey);
        if (gymHtml) {
            gymSection.innerHTML = gymHtml;
            gymSection.classList.remove("hidden");
        } else {
            gymSection.classList.add("hidden");
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

export async function openGymLog(dateKey) {
    closeDayModal();
    const { ensureGymData } = await import('../../core/state.js');
    await ensureGymData();
    const m = await import('../gym/index.js');
    if (m.attachWindowGym) m.attachWindowGym();
    await m.openManualLogModal(null, dateKey);
}

export async function openGymSchedule(dateKey) {
    const { ensureGymData, state } = await import('../../core/state.js');
    await ensureGymData();
    const templates = state.gymTemplates || [];
    if (templates.length === 0) {
        showNotification('Nejprve si vytvoř tréninkový plán v Posilovně!', 'info');
        closeDayModal();
        window.switchChannel('gym-tracker');
        return;
    }
    closeDayModal();
    const m = await import('../gym/index.js');
    if (m.attachWindowGym) m.attachWindowGym();
    await m.openScheduleTemplateModal(templates[0].id, dateKey);
}

export async function openEditGymLog(logId, dateKey) {
    closeDayModal();
    const { ensureGymData } = await import('../../core/state.js');
    await ensureGymData();
    const m = await import('../gym/index.js');
    if (m.attachWindowGym) m.attachWindowGym();
    await m.openEditGymLogModal(logId, dateKey);
}

export async function deleteGymLog(logId, dateKey) {
    triggerHaptic('medium');
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento zaznamenaný trénink?', 'Smazat', 'Zrušit');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('gym_logs').delete().eq('id', logId);
        if (error) throw error;

        await supabase.from('gym_prs').delete().eq('log_id', logId);

        state.gymLogs = (state.gymLogs || []).filter(l => l.id !== logId);
        state.gymPRs = (state.gymPRs || []).filter(p => p.log_id !== logId);

        showNotification('Trénink byl smazán.', 'info');
        window.dispatchEvent(new CustomEvent('gym-logs-updated', { detail: { dateKey } }));

        showDayDetail(dateKey);
        renderCalendar();
    } catch (err) {
        console.error('Failed to delete gym log:', err);
        showNotification('Chyba při mazání tréninku: ' + err.message, 'danger');
    }
}

export async function deleteGymPlan(planId, dateKey) {
    triggerHaptic('medium');
    const confirmed = await showConfirmDialog('Opravdu chceš smazat tento naplánovaný trénink z kalendáře?', 'Smazat', 'Zrušit');
    if (!confirmed) return;

    try {
        let query = supabase.from('planned_dates').delete();
        if (planId) {
            query = query.eq('id', planId);
        } else {
            query = query.eq('date_key', dateKey);
        }
        const { error } = await query;
        if (error) throw error;

        if (state.plannedDates) {
            delete state.plannedDates[dateKey];
        }

        showNotification('Naplánovaný trénink byl odstraněn.', 'info');
        window.dispatchEvent(new CustomEvent('planned-dates-updated', {
            detail: { payload: { eventType: 'DELETE', old: { date_key: dateKey, id: planId } } }
        }));

        showDayDetail(dateKey);
        renderCalendar();
    } catch (err) {
        console.error('Failed to delete gym plan:', err);
        showNotification('Chyba při mazání plánu: ' + err.message, 'danger');
    }
}

function renderGymSectionHtml(dateKey) {
    const gymLogs = (state.gymLogs || []).filter(l => l.date_key === dateKey);
    const plannedDate = (state.plannedDates || {})[dateKey];
    const isPlannedGym = plannedDate && (plannedDate.cat === 'gym' || (plannedDate.name || '').toLowerCase().includes('posilov') || (plannedDate.name || '').toLowerCase().includes('trénink') || (plannedDate.name || '').toLowerCase().includes('fitko'));
    const isToday = dateKey === getTodayKey();

    let logsHtml = '';
    if (gymLogs.length > 0) {
        logsHtml = gymLogs.map(log => {
            const isMe = log.user_id === state.currentUser?.id;
            const userName = isMe ? (state.currentUser?.name || 'Já') : (state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka');
            const userAvatar = (log.user_id === state.user_ids?.jose || (!isMe && state.currentUser?.name !== 'Jožka')) ? '🦝' : '👸';
            const userColor = (log.user_id === state.user_ids?.jose || (!isMe && state.currentUser?.name !== 'Jožka')) ? 'text-blue-300' : 'text-pink-300';
            const durationMin = Math.round((log.duration_seconds || 0) / 60);

            // Exercise summary
            const exercises = log.exercises || [];
            const exSummary = exercises.map(ex => {
                const completedSets = (ex.sets || []).filter(s => s.completed);
                if (completedSets.length === 0) return '';
                const count = completedSets.length;
                const setsWord = (count >= 1 && count <= 4) ? 'série' : 'sérií';

                // Check if all sets have identical weight and reps
                const allSame = completedSets.every(s => s.weight === completedSets[0].weight && s.reps === completedSets[0].reps);

                let setsContentHtml = '';
                if (allSame && count > 1) {
                    const first = completedSets[0];
                    const weightStr = first.weight > 0 ? `${first.weight} kg` : 'Vlastní váha';
                    setsContentHtml = `
                        <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono font-bold text-amber-300">
                                ${count}× ${weightStr} × ${first.reps} op.
                            </span>
                        </div>
                    `;
                } else {
                    setsContentHtml = `
                        <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                            ${completedSets.map((s, sIdx) => {
                                const weightStr = s.weight > 0 ? `${s.weight}kg` : 'BW';
                                return `
                                    <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono font-bold text-amber-300">
                                        ${weightStr} × ${s.reps}
                                    </span>
                                `;
                            }).join('')}
                        </div>
                    `;
                }

                return `
                    <div class="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                        <div class="flex justify-between items-center gap-2">
                            <span class="font-bold text-gray-100 text-xs leading-snug">${ex.exercise_name || ex.exercise_id}</span>
                            <span class="text-[10px] text-[#faa61a] font-mono font-bold bg-[#faa61a]/10 border border-[#faa61a]/20 px-2 py-0.5 rounded-lg flex-shrink-0">
                                ${count} ${setsWord}
                            </span>
                        </div>
                        ${setsContentHtml}
                    </div>
                `;
            }).filter(Boolean).join('');

            // PRs achieved
            const prs = (state.gymPRs || []).filter(p => p.log_id === log.id || (p.achieved_at && p.achieved_at.startsWith(dateKey) && p.user_id === log.user_id));
            const prsHtml = prs.length > 0 ? `
                <div class="mt-2 flex flex-wrap gap-1.5">
                    ${prs.map(pr => {
                        const exObj = (state.gymExercises || []).find(e => e.id === pr.exercise_id);
                        return `
                            <div class="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                <span>🏆 PR:</span>
                                <span>${exObj?.name || pr.exercise_id}</span>
                                <span class="font-bold font-mono text-white">${pr.weight} kg</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '';

            return `
                <div class="bg-gradient-to-br from-[#faa61a]/10 to-transparent border border-[#faa61a]/30 rounded-xl p-3.5 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-base">${userAvatar}</span>
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[10px] font-black ${userColor} uppercase tracking-wider">${userName}</span>
                                    ${durationMin > 0 ? `<span class="text-[9px] text-gray-400 font-mono">⏱️ ${durationMin} min</span>` : ''}
                                </div>
                                <h5 class="text-xs font-black text-white uppercase tracking-tight">${log.name}</h5>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            ${(log.cheers && log.cheers.length > 0) ? `
                                <span class="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-amber-400 text-[10px] font-bold">
                                    💪 ${log.cheers.length}
                                </span>
                            ` : ''}
                            ${(isMe || !log.user_id) ? `
                                <button onclick="Calendar.openEditGymLog('${log.id}', '${dateKey}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-amber-400 hover:bg-amber-400/10 transition" title="Upravit trénink">
                                    <i class="fas fa-pencil-alt text-[10px]"></i>
                                </button>
                                <button onclick="Calendar.deleteGymLog('${log.id}', '${dateKey}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition" title="Smazat trénink">
                                    <i class="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${exSummary ? `<div class="space-y-1.5 pt-1">${exSummary}</div>` : ''}
                    ${prsHtml}
                </div>
            `;
        }).join('');
    }

    let planHtml = '';
    if (isPlannedGym) {
        planHtml = `
            <div class="bg-[#faa61a]/10 border border-[#faa61a]/40 border-dashed rounded-xl p-3 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                    <span class="text-lg">📅</span>
                    <div>
                        <div class="text-[9px] font-black text-amber-400 uppercase tracking-wider">Naplánovaný trénink</div>
                        <div class="text-xs font-bold text-white">${plannedDate.name}</div>
                        ${plannedDate.time ? `<div class="text-[10px] text-gray-400 font-mono"><i class="far fa-clock text-[#faa61a] mr-1"></i>${plannedDate.time}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    ${isToday ? `
                        <button onclick="Calendar.closeDayModal(); window.switchChannel('gym-tracker');" 
                                class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[10px] font-black uppercase tracking-wider transition shadow-md shadow-emerald-500/20">
                            ▶️ Začít
                        </button>
                    ` : ''}
                    <button onclick="Calendar.deleteGymPlan('${plannedDate.id || ''}', '${dateKey}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition" title="Smazat naplánovaný trénink">
                        <i class="fas fa-trash-alt text-[10px]"></i>
                    </button>
                </div>
            </div>
        `;
    }

    const emptyHtml = (!gymLogs.length && !isPlannedGym) ? `
        <div class="bg-black/10 border border-white/5 rounded-xl p-3 text-center">
            <p class="text-xs text-gray-400 font-medium">V tento den nebyl zaznamenán žádný trénink.</p>
        </div>
    ` : '';

    return `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <h4 class="text-xs font-bold text-[#faa61a] uppercase flex items-center gap-2">
                    <i class="fas fa-dumbbell"></i> Posilovna & Tréninky
                </h4>
                <div class="flex items-center gap-1.5">
                    <button onclick="Calendar.closeDayModal(); window.switchChannel('gym-tracker');" 
                            class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider transition">
                        Posilovna 🏋️‍♂️
                    </button>
                </div>
            </div>

            ${logsHtml}
            ${planHtml}
            ${emptyHtml}

            <div class="flex flex-wrap gap-2 pt-1">
                ${isToday ? `
                    <button onclick="Calendar.closeDayModal(); window.switchChannel('gym-tracker');" 
                            class="flex-1 min-w-[130px] py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5">
                        <i class="fas fa-play"></i> Zahájit trénink
                    </button>
                ` : ''}
                <button onclick="Calendar.openGymLog('${dateKey}')" 
                        class="flex-1 min-w-[130px] py-2 px-3 bg-[#faa61a]/15 hover:bg-[#faa61a]/25 text-[#faa61a] border border-[#faa61a]/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5">
                    <i class="fas fa-plus"></i> Zapsat trénink
                </button>
                <button onclick="Calendar.openGymSchedule('${dateKey}')" 
                        class="flex-1 min-w-[130px] py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5">
                    <i class="far fa-calendar-plus"></i> Naplánovat plán
                </button>
            </div>
        </div>
    `;
}

function renderDiarySectionHtml(dateKey) {
    const diaryEntries = state.brigadeDiary || [];
    const dayEntries = diaryEntries.filter(e => e.date_key === dateKey);

    if (dayEntries.length === 0) {
        return ""; // No diary logged for this day
    }

    const jose = dayEntries.find(e => e.user_id === state.user_ids?.jose);
    const klarka = dayEntries.find(e => e.user_id === state.user_ids?.klarka);

    const isRevealed = !!(jose && klarka);
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids?.jose;

    const renderCol = (userLabel, userColor, entry, isMe) => {
        if (!entry) {
            return `
                <div class="flex flex-col items-center justify-center py-4 opacity-30 text-center">
                    <i class="fas fa-clock text-xs mb-1"></i>
                    <span class="text-[9px] font-bold uppercase tracking-wider">Nezadáno</span>
                </div>
            `;
        }

        const canSee = isMe || isRevealed;
        if (!canSee) {
            return `
                <div class="flex flex-col items-center justify-center py-4 text-center text-amber-500 animate-pulse">
                    <i class="fas fa-lock text-sm mb-1"></i>
                    <span class="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Uzamčeno</span>
                </div>
            `;
        }

        const stars = Array.from({ length: 5 }).map((_, i) => `<i class="${i < entry.rating ? 'fas' : 'far'} fa-star text-[8px] text-[#faa61a]"></i>`).join('');

        // Audio voice note if available
        let audioHtml = "";
        if (entry.voice_note_url) {
            audioHtml = `
                <div class="mt-2 pt-2 border-t border-white/5">
                    <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-1">🎙️ Hlasová vzpomínka</span>
                    <audio src="${entry.voice_note_url}" controls class="w-full h-6 rounded-lg bg-black/20 text-xs scale-90 origin-left"></audio>
                </div>
            `;
        }

        return `
            <div class="space-y-1.5 mt-1 text-left">
                <div class="flex justify-between items-center">
                    <div class="flex gap-0.5">${stars}</div>
                    <span class="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Hotovo ✅</span>
                </div>
                <div class="border-t border-white/5 pt-1.5 space-y-1.5">
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">🌸 Highlight</span>
                        <p class="text-[11px] text-gray-200 leading-normal font-semibold">${entry.highlight_text}</p>
                    </div>
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">🌋 Rant</span>
                        <p class="text-[11px] text-red-300/80 leading-normal font-medium">${entry.rant_text}</p>
                    </div>
                    ${audioHtml}
                </div>
            </div>
        `;
    };

    let headerStars = "";
    if (isRevealed) {
        const avg = Math.round((jose.rating + klarka.rating) / 2);
        headerStars = `<div class="flex items-center gap-0.5 text-[#faa61a]">` +
            Array.from({ length: 5 }).map((_, i) => `<i class="${i < avg ? 'fas' : 'far'} fa-star text-xs"></i>`).join('') +
            `</div>`;
    }

    return `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <h4 class="text-xs font-bold text-pink-400 uppercase flex items-center gap-2">
                    <i class="fas fa-journal-whills"></i> Alpský Deníček
                </h4>
                <div class="flex items-center gap-2">
                    ${headerStars}
                    <button onclick="Calendar.closeDayModal(); window.switchChannel('alpsky-denicek');" 
                            class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-wider transition">
                        Otevřít deník 📔
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-black/15 rounded-xl border border-white/5 relative overflow-hidden">
                    <span class="text-[8px] font-black uppercase tracking-widest text-blue-300 block mb-1">Jožka</span>
                    ${renderCol('Jožka', 'blue-300', jose, isMeJose)}
                </div>
                <div class="p-3 bg-black/15 rounded-xl border border-white/5 relative overflow-hidden">
                    <span class="text-[8px] font-black uppercase tracking-widest text-pink-300 block mb-1">Klárka</span>
                    ${renderCol('Klárka', 'pink-300', klarka, !isMeJose)}
                </div>
            </div>
        </div>
    `;
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

    saveStateToCache();
    showDayDetail(dateKey);
    renderCalendar();
    triggerHaptic("medium");
    window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Plán smazán 🗑️", type: "info" } }));
}

export async function addCustomPlan() {
    const type = document.getElementById("plan-type").value;
    const name = document.getElementById("plan-name").value;
    const time = document.getElementById("plan-time").value;
    const backup = document.getElementById("plan-backup")?.value?.trim() || '';
    const checklistRaw = document.getElementById("plan-checklist")?.value?.trim() || '';
    const checklist = checklistRaw
        ? checklistRaw.split(',').map(s => ({ text: s.trim(), done: false })).filter(i => i.text)
        : [];

    if (!name || !currentModalDateKey) return;

    // Kontrola konfliktů se směnami partnerů
    if (time) {
        const dayShifts = (state.shifts || {})[currentModalDateKey];
        if (dayShifts) {
            let conflictMsg = "";
            
            // Kontrola pro Jožku
            if (dayShifts.jose && dayShifts.jose.shift_type !== 'volno' && dayShifts.jose.time_start && dayShifts.jose.time_end) {
                const start = dayShifts.jose.time_start;
                const end = dayShifts.jose.time_end;
                if (time >= start && time <= end) {
                    conflictMsg += `• Jožka má v tuto dobu směnu (${start} - ${end})\n`;
                }
            }
            
            // Kontrola pro Klárku
            if (dayShifts.klarka && dayShifts.klarka.shift_type !== 'volno' && dayShifts.klarka.time_start && dayShifts.klarka.time_end) {
                const start = dayShifts.klarka.time_start;
                const end = dayShifts.klarka.time_end;
                if (time >= start && time <= end) {
                    conflictMsg += `• Klárka má v tuto dobu směnu (${start} - ${end})\n`;
                }
            }
            
            if (conflictMsg) {
                const confirmSave = await showConfirmDialog(`⚠️ Pozor! Plánovaný čas koliduje s pracovní směnou:\n\n${conflictMsg}\nChceš plán přesto uložit?`, 'Uložit i tak', 'Zrušit');
                if (!confirmSave) {
                    triggerHaptic("heavy");
                    return;
                }
            }
        }
    }

    if (!state.plannedDates) state.plannedDates = {};
    
    const planId = crypto.randomUUID();
    const planData = {
        id: planId,
        name: name,
        cat: type,
        time: time,
        note: '',
        status: 'idea',
        backup_plan: backup,
        checklist: checklist
    };
    state.plannedDates[currentModalDateKey] = planData;

    try {
        const { supabase } = await import('../../core/supabase.js');
        const { error } = await supabase.from('planned_dates').upsert({
            id: planId,
            date_key: currentModalDateKey,
            name: name,
            cat: type,
            time: time,
            note: '',
            status: 'idea',
            backup_plan: backup,
            checklist: JSON.stringify(checklist),
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

export async function addSchoolEvent() {
    const input = document.getElementById("school-input");
    const title = input.value.trim();

    if (!title || !currentModalDateKey) return;

    if (!state.schoolEvents) state.schoolEvents = {};
    state.schoolEvents[currentModalDateKey] = {
        title: title,
        type: "exam",
    };

    try {
        const { supabase } = await import('../../core/supabase.js');
        const { error } = await supabase.from('school_events').upsert({
            date_key: currentModalDateKey,
            title: title,
            type: "exam"
        });
        if (error) console.error('[Calendar] Error saving school event:', error);
    } catch (err) {
        console.error('[Calendar] School event save failed:', err);
    }

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

export async function deleteSchoolEvent() {
    if (!currentModalDateKey) return;

    triggerHaptic('heavy');
    if (state.schoolEvents) delete state.schoolEvents[currentModalDateKey];

    try {
        const { supabase } = await import('../../core/supabase.js');
        const { error } = await supabase.from('school_events').delete().eq('date_key', currentModalDateKey);
        if (error) console.error('[Calendar] Error deleting school event:', error);
    } catch (err) {
        console.error('[Calendar] School event delete failed:', err);
    }

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
        const pillsEl = document.getElementById("edit-health-pills");

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
        if (pillsEl) pillsEl.checked = !!health.pills;

        const supps = health.supplements || { iron: false, zinc: false, magnesium: false };
        const ironEl = document.getElementById("edit-health-iron");
        const zincEl = document.getElementById("edit-health-zinc");
        const magnesiumEl = document.getElementById("edit-health-magnesium");
        if (ironEl) ironEl.checked = !!supps.iron;
        if (zincEl) zincEl.checked = !!supps.zinc;
        if (magnesiumEl) magnesiumEl.checked = !!supps.magnesium;

        displayGrid.classList.add("hidden");
        editForm.classList.remove("hidden");
    } else {
        displayGrid.classList.remove("hidden");
        editForm.classList.add("hidden");
    }
}

export async function saveHealthRecord() {
    if (!currentModalDateKey) return;
    
    const water = parseInt(document.getElementById("edit-health-water").value) || 0;
    const sleepInput = document.getElementById("edit-health-sleep").value;
    const sleep = sleepInput ? parseFloat(sleepInput) : undefined;
    
    const moodInput = document.getElementById("edit-health-mood").value;
    const mood = moodInput ? parseInt(moodInput) : undefined;
    
    const movementStr = document.getElementById("edit-health-movement").value;
    const movement = movementStr ? movementStr.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : [];
    
    const pillsEl = document.getElementById("edit-health-pills");
    const pills = pillsEl ? pillsEl.checked : false;

    const supplements = {
        iron: document.getElementById("edit-health-iron")?.checked || false,
        zinc: document.getElementById("edit-health-zinc")?.checked || false,
        magnesium: document.getElementById("edit-health-magnesium")?.checked || false
    };

    const existing = (state.healthData || {})[currentModalDateKey] || {};

    let newHealth = {
        ...existing,
        water,
        movement,
        pills,
        supplements
    };
    
    if (sleep !== undefined) newHealth.sleep = sleep;
    if (mood !== undefined) newHealth.mood = mood;

    if (!state.healthData) state.healthData = {};
    state.healthData[currentModalDateKey] = newHealth;

    // Uložit do Supabase (s offline podporou přes safeUpsert)
    const { error } = await safeUpsert('health_data', {
        date_key: currentModalDateKey,
        user_id: state.currentUser.id,
        water: newHealth.water,
        sleep: newHealth.sleep,
        mood: newHealth.mood,
        movement: newHealth.movement,
        pills: newHealth.pills,
        supplements: newHealth.supplements
    });
    if (error) console.error("[Calendar] Error saving health record to Supabase:", error);

    import('../achievements.js').then(m => {
        m.checkHealthAchievements(currentModalDateKey, newHealth, state.healthData);
    });

    // Uložit do hlavní state cache (aby přetrvalo po refreshi)
    saveStateToCache();
    
    showDayDetail(currentModalDateKey);
    renderCalendar();
    
    triggerHaptic("success");
    window.dispatchEvent(new CustomEvent('notification', { detail: { message: "Zdraví uloženo 🏥", type: "success" } }));
}

// --- RANDE PLANNER HELPERS ---

export async function cyclePlanStatus(dateKey) {
    const plan = (state.plannedDates || {})[dateKey];
    if (!plan) return;

    const statusOrder = ['idea', 'confirmed', 'happened'];
    const current = plan.status || 'idea';
    const nextStatus = statusOrder[(statusOrder.indexOf(current) + 1) % statusOrder.length];

    plan.status = nextStatus;
    triggerHaptic('light');

    try {
        const { supabase } = await import('../../core/supabase.js');
        await supabase.from('planned_dates')
            .update({ status: nextStatus })
            .eq('date_key', dateKey);
    } catch (err) {
        console.error('Failed to update plan status:', err);
    }

    showDayDetail(dateKey);
    renderCalendar();
}

export async function toggleChecklistItem(dateKey, itemIndex) {
    const plan = (state.plannedDates || {})[dateKey];
    if (!plan || !plan.checklist) return;

    plan.checklist[itemIndex].done = !plan.checklist[itemIndex].done;
    triggerHaptic('light');

    try {
        const { supabase } = await import('../../core/supabase.js');
        await supabase.from('planned_dates')
            .update({ checklist: JSON.stringify(plan.checklist) })
            .eq('date_key', dateKey);
    } catch (err) {
        console.error('Failed to update checklist:', err);
    }

    showDayDetail(dateKey);
}
