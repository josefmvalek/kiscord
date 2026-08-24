/**
 * Main Day Detail Modal Controller for Kiscord Calendar
 */

import { state } from '@core/state.js';
import { triggerHaptic, getTodayKey } from '@core/utils.js';
import { getMoodColor } from './grid.js';
import { SHIFT_PRESETS } from '@domains/archive/shifts.js';
import { renderModal, renderButton, renderInputGroup } from '@core/ui.js';
import { setCurrentModalDateKey } from './state.js';
import { renderGymSectionHtml } from './sections-gym.js';
import { renderDiarySectionHtml } from './sections-diary.js';

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
    setCurrentModalDateKey(dateKey);
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

            const planStatusDefs = {
                idea:      { icon: '💭', label: 'Nápad',       color: 'text-gray-400',    bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
                confirmed: { icon: '📅', label: 'Potvrzeno',    color: 'text-[#5865F2]', bg: 'bg-[#5865F2]/10', border: 'border-[#5865F2]/30' },
                happened:  { icon: '🎉', label: 'Proběhlo',     color: 'text-[#3ba55c]', bg: 'bg-[#3ba55c]/10', border: 'border-[#3ba55c]/30' }
            };
            const planStatus = plannedDate.status || 'idea';
            const planStatusDef = planStatusDefs[planStatus] || planStatusDefs.idea;

            const currentUserName = state.currentUser?.name || 'Josef';
            const creator = plannedDate.created_by || 'Josef';
            const isCreator = currentUserName.toLowerCase() === creator.toLowerCase();
            
            let isLocked = false;
            if (plannedDate.is_secret && !plannedDate.is_manually_unlocked) {
                if (!isCreator) {
                    const unlockHours = plannedDate.secret_unlock_hours !== undefined ? plannedDate.secret_unlock_hours : 1;
                    const eventDateTime = new Date(`${dateKey}T${plannedDate.time || '18:00'}:00`);
                    if (!isNaN(eventDateTime.getTime())) {
                        const unlockTime = new Date(eventDateTime.getTime() - unlockHours * 60 * 60 * 1000);
                        isLocked = new Date() < unlockTime;
                    }
                }
            }

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

            if (isLocked) {
                plansHtml += `
                <div class="bg-gradient-to-br from-pink-500/15 to-purple-500/15 border-2 border-pink-500/40 rounded-2xl p-4 relative group shadow-xl overflow-hidden animate-fade-in">
                    <div class="flex items-start justify-between gap-2 mb-3">
                        <div class="font-black text-white text-sm flex items-center gap-2">
                            <span class="p-2 rounded-xl bg-pink-500/20 text-pink-300 animate-pulse text-base">🔒</span>
                            <div>
                                <div class="text-xs font-black text-pink-300 uppercase tracking-wide">Tajné rande od ${creator} ✨</div>
                                <div class="text-[10px] text-gray-400 font-medium">Místo se odemkne 1 hodinu před srazem!</div>
                            </div>
                        </div>
                        <button onclick="Calendar.deletePlannedDate('${dateKey}')" class="text-red-400 hover:text-red-200 p-1 transition">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>

                    ${plannedDate.time ? `<div class="text-xs text-white font-bold mb-2 flex items-center gap-1.5 bg-black/20 p-2 rounded-xl w-fit"><i class="far fa-clock text-[#eb459e]"></i> Čas srazu: ${plannedDate.time}</div>` : ''}

                    ${plannedDate.secret_dress_code ? `
                        <div class="bg-black/30 rounded-xl p-2.5 mb-2 text-xs border border-white/5">
                            <span class="text-pink-300 font-bold block text-[10px] uppercase tracking-wider mb-0.5">👟 Co na sebe (Dress Code):</span>
                            <span class="text-gray-200">${plannedDate.secret_dress_code}</span>
                        </div>
                    ` : ''}

                    ${plannedDate.secret_hint ? `
                        <div class="bg-black/30 rounded-xl p-2.5 text-xs border border-white/5">
                            <span class="text-pink-300 font-bold block text-[10px] uppercase tracking-wider mb-0.5">💡 Nápověda:</span>
                            <span class="text-gray-200 italic">„${plannedDate.secret_hint}“</span>
                        </div>
                    ` : ''}
                </div>`;
            } else {
                const secretBadge = plannedDate.is_secret ? `
                    <div class="mb-2 px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                        <i class="fas fa-unlock-alt"></i> ${isCreator ? '🔒 Tajné pro partnera (aktivní nápověda)' : '✨ Odhalené překvapení!'}
                    </div>
                ` : '';

                plansHtml += `
                <div class="bg-[#eb459e]/10 border border-[#eb459e]/30 rounded-xl p-4 relative group shadow-md">
                    ${secretBadge}
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="font-bold text-white text-sm flex items-center gap-2">
                            <span>${icon}</span> ${plannedDate.name}
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
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
                    ${plannedDate.secret_dress_code ? `<div class="mt-2 text-[11px] text-pink-300"><i class="fas fa-tshirt mr-1"></i>${plannedDate.secret_dress_code}</div>` : ''}
                    ${plannedDate.backup_plan ? `<div class="mt-2 bg-black/20 rounded-lg p-2 text-xs text-gray-400"><i class="fas fa-umbrella mr-1 text-[#faa61a]"></i><span class="text-[#faa61a] font-bold">Záloha:</span> ${plannedDate.backup_plan}</div>` : ''}
                    ${checklistHtml}
                </div>`;
            }

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
                <input type="text" id="plan-checklist" placeholder="Checklist položky oddělené čárkami: deka, víno..." 
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
    setCurrentModalDateKey(null);
}
