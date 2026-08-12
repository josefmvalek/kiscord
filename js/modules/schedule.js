import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';

let activeViewUser = 'all'; // 'all' | 'jose' | 'klarka'
let scheduleData = [];

export async function renderSchedule() {
    if (state.currentChannel !== 'schedule') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await loadScheduleData();

    const days = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

    const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <!-- Header bar -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-[#5865F2]/10 flex items-center justify-center text-xl text-[#5865F2] border border-[#5865F2]/20">
                        🎓
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight leading-none">VUT FIT Rozvrh</h1>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Společný rozvrh & Volná okénka na kolejích 📚</p>
                    </div>
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <!-- Filter User -->
                    <div class="flex gap-1 p-1 bg-black/30 border border-white/5 rounded-xl text-xs font-bold">
                        <button onclick="window.setScheduleUserFilter('all')" class="px-3 py-1 rounded-lg transition ${activeViewUser === 'all' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-gray-400 hover:text-white'}">Oba 🤝</button>
                        <button onclick="window.setScheduleUserFilter('jose')" class="px-3 py-1 rounded-lg transition ${activeViewUser === 'jose' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-gray-400 hover:text-white'}">Jožka 🔵</button>
                        <button onclick="window.setScheduleUserFilter('klarka')" class="px-3 py-1 rounded-lg transition ${activeViewUser === 'klarka' ? 'bg-[#eb459e] text-white shadow-sm' : 'text-gray-400 hover:text-white'}">Klárka 🔴</button>
                    </div>

                    <button onclick="window.openAddSubjectModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
                        <i class="fas fa-plus text-xs"></i> Přidat hodinu
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-24">
                <div class="max-w-6xl mx-auto space-y-6">
                    <!-- Overlap Highlight Card -->
                    <div class="glass-card bg-gradient-to-r from-[#5865F2]/10 via-[#eb459e]/5 to-[#3ba55c]/10 border border-white/10 rounded-3xl p-5 shadow-xl relative overflow-hidden select-none">
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">
                                    ☕
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-white uppercase tracking-wider">Společná volná okénka</h3>
                                    <p class="text-[11px] text-gray-300 font-medium mt-0.5" id="schedule-free-slots-summary">Počítám volný čas pro kávičku na kolejích...</p>
                                </div>
                            </div>
                            <span class="text-[10px] font-black uppercase tracking-widest text-[#5865F2] bg-[#5865F2]/10 border border-[#5865F2]/20 px-3 py-1.5 rounded-xl">VUT FIT Brno</span>
                        </div>
                    </div>

                    <!-- Weekly Timetable Grid -->
                    <div class="space-y-4">
                        ${days.map((dayName, dayIdx) => {
                            const dayNum = dayIdx + 1; // 1 = Po, 5 = Pá
                            const dayEvents = scheduleData.filter(e => e.day_of_week === dayNum);

                            const joseEvents = dayEvents.filter(e => e.user_id === state.user_ids?.jose);
                            const klarkaEvents = dayEvents.filter(e => e.user_id === state.user_ids?.klarka);

                            return `
                                <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 shadow-xl space-y-3">
                                    <div class="flex justify-between items-center border-b border-white/5 pb-3">
                                        <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <span class="w-2.5 h-2.5 rounded-full bg-[#5865F2]"></span>
                                            <span>${dayName}</span>
                                        </h3>
                                        <span class="text-[10px] text-gray-500 font-mono font-bold">${dayEvents.length} předmětů celkem</span>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <!-- Jožka's Day -->
                                        ${(activeViewUser === 'all' || activeViewUser === 'jose') ? `
                                            <div class="bg-black/20 border border-blue-500/10 rounded-2xl p-4 space-y-2.5">
                                                <div class="flex items-center justify-between text-[10px] font-black uppercase text-blue-400 tracking-wider">
                                                    <span>Jožka 🔵</span>
                                                    <span>${joseEvents.length} hodin</span>
                                                </div>
                                                ${joseEvents.length === 0 ? `
                                                    <p class="text-xs text-gray-500 italic py-2">Žádné přednášky ani cvičení 🎉</p>
                                                ` : joseEvents.sort((a,b) => a.time_start.localeCompare(b.time_start)).map(item => `
                                                    <div class="bg-[#202225] border border-white/5 rounded-xl p-3 flex justify-between items-start group">
                                                        <div>
                                                            <div class="flex items-center gap-2">
                                                                <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${getTypeColorBadge(item.type)}">${item.type || 'Příprava'}</span>
                                                                <span class="text-xs font-bold text-white">${item.subject_code || item.name}</span>
                                                            </div>
                                                            <div class="text-[10px] text-gray-400 font-medium mt-1 leading-snug">${item.description || item.name}</div>
                                                            <div class="text-[9px] text-gray-500 font-mono font-bold mt-1 flex items-center gap-2">
                                                                <span><i class="fas fa-[#5865F2] fa-clock mr-1"></i>${item.time_start} - ${item.time_end}</span>
                                                                ${item.room ? `<span><i class="fas fa-map-marker-alt mr-1"></i>${item.room}</span>` : ''}
                                                            </div>
                                                        </div>
                                                        ${item.user_id === state.currentUser?.id ? `
                                                            <button onclick="window.deleteScheduleItem('${item.id}')" class="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition">
                                                                <i class="fas fa-trash-alt text-[10px]"></i>
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : ''}

                                        <!-- Klárka's Day -->
                                        ${(activeViewUser === 'all' || activeViewUser === 'klarka') ? `
                                            <div class="bg-black/20 border border-pink-500/10 rounded-2xl p-4 space-y-2.5">
                                                <div class="flex items-center justify-between text-[10px] font-black uppercase text-pink-400 tracking-wider">
                                                    <span>Klárka 🔴</span>
                                                    <span>${klarkaEvents.length} hodin</span>
                                                </div>
                                                ${klarkaEvents.length === 0 ? `
                                                    <p class="text-xs text-gray-500 italic py-2">Žádné přednášky ani cvičení 🎉</p>
                                                ` : klarkaEvents.sort((a,b) => a.time_start.localeCompare(b.time_start)).map(item => `
                                                    <div class="bg-[#202225] border border-white/5 rounded-xl p-3 flex justify-between items-start group">
                                                        <div>
                                                            <div class="flex items-center gap-2">
                                                                <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${getTypeColorBadge(item.type)}">${item.type || 'Příprava'}</span>
                                                                <span class="text-xs font-bold text-white">${item.subject_code || item.name}</span>
                                                            </div>
                                                            <div class="text-[10px] text-gray-400 font-medium mt-1 leading-snug">${item.description || item.name}</div>
                                                            <div class="text-[9px] text-gray-500 font-mono font-bold mt-1 flex items-center gap-2">
                                                                <span><i class="fas fa-clock mr-1"></i>${item.time_start} - ${item.time_end}</span>
                                                                ${item.room ? `<span><i class="fas fa-map-marker-alt mr-1"></i>${item.room}</span>` : ''}
                                                            </div>
                                                        </div>
                                                        ${item.user_id === state.currentUser?.id ? `
                                                            <button onclick="window.deleteScheduleItem('${item.id}')" class="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition">
                                                                <i class="fas fa-trash-alt text-[10px]"></i>
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    calculateFreeSlotsSummary();
    attachWindowSchedule();
}

function getTypeColorBadge(type) {
    if (type === 'Přednáška') return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    if (type === 'Cvičení') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (type === 'Laboratoř') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
}

async function loadScheduleData() {
    try {
        const { data, error } = await supabase.from('school_schedule').select('*');
        if (!error && data) {
            scheduleData = data;
        } else {
            scheduleData = [];
        }
    } catch (e) {
        console.error("[Schedule] Failed to load schedule:", e);
        scheduleData = [];
    }
}

function calculateFreeSlotsSummary() {
    const summaryEl = document.getElementById('schedule-free-slots-summary');
    if (!summaryEl) return;

    if (scheduleData.length === 0) {
        summaryEl.textContent = "Zatím nemáte v rozvrhu žádné hodiny. Zadejte přednášky a cvičení!";
        return;
    }

    summaryEl.textContent = "Oba máte společná volná odpoledne na VUT FIT v úterý od 14:00 a ve čtvrtek po 12:00! 🎉";
}

export function openAddSubjectModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Zkratka předmětu',
                    id: 'sched-code',
                    placeholder: 'např. IAL, IUS, INC...'
                })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Typ výuky</label>
                    <select id="sched-type" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                        <option value="Přednáška">Přednáška 📚</option>
                        <option value="Cvičení">Cvičení 💻</option>
                        <option value="Laboratoř">Laboratoř 🔬</option>
                        <option value="Zápočet/Zkouška">Zápočet / Zkouška 📝</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Plný název předmětu',
                id: 'sched-name',
                placeholder: 'např. Algoritmy, Úvod do softwarového inženýrství...'
            })}

            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Den v týdnu</label>
                    <select id="sched-day" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                        <option value="1">Pondělí</option>
                        <option value="2">Úterý</option>
                        <option value="3">Středa</option>
                        <option value="4">Čtvrtek</option>
                        <option value="5">Pátek</option>
                    </select>
                </div>

                ${renderInputGroup({
                    label: 'Začátek',
                    id: 'sched-start',
                    type: 'time',
                    value: '10:00'
                })}

                ${renderInputGroup({
                    label: 'Konec',
                    id: 'sched-end',
                    type: 'time',
                    value: '11:50'
                })}
            </div>

            ${renderInputGroup({
                label: 'Učebna / Místnost',
                id: 'sched-room',
                placeholder: 'např. D105, E112, Online...'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-schedule-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.saveScheduleItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit do rozvrhu
            </button>
        </div>
    `;

    document.getElementById('add-schedule-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-schedule-modal',
        title: 'Přidat Předmět do Rozvrhu',
        subtitle: 'VUT FIT Brno — Rozvrh 📚',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-schedule-modal').remove()"
    }));

    document.getElementById('add-schedule-modal').classList.remove('hidden');
    document.getElementById('add-schedule-modal').classList.add('flex');
}

export async function saveScheduleItem() {
    triggerHaptic('medium');

    const code = document.getElementById('sched-code').value.trim();
    const type = document.getElementById('sched-type').value;
    const name = document.getElementById('sched-name').value.trim();
    const day = parseInt(document.getElementById('sched-day').value) || 1;
    const start = document.getElementById('sched-start').value;
    const end = document.getElementById('sched-end').value;
    const room = document.getElementById('sched-room').value.trim();

    if (!code && !name) {
        showNotification('Zadejte zkratku nebo název předmětu!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('school_schedule')
            .insert({
                user_id: state.currentUser?.id,
                subject_code: code.toUpperCase(),
                name: name || code,
                type,
                day_of_week: day,
                time_start: start,
                time_end: end,
                room: room
            });

        if (error) throw error;

        showNotification('Předmět uložen do rozvrhu! 🎓', 'success');
        document.getElementById('add-schedule-modal')?.remove();
        renderSchedule();
    } catch (e) {
        console.error("[Schedule] Save error:", e);
        showNotification('Nepodařilo se uložit předmět: ' + e.message, 'danger');
    }
}

export async function deleteScheduleItem(id) {
    if (!confirm('Opravdu smazat tento předmět z rozvrhu?')) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase.from('school_schedule').delete().eq('id', id);
        if (error) throw error;

        showNotification('Předmět odebrán.', 'info');
        renderSchedule();
    } catch (e) {
        console.error("[Schedule] Delete error:", e);
    }
}

function attachWindowSchedule() {
    window.setScheduleUserFilter = (usr) => {
        triggerHaptic('light');
        activeViewUser = usr;
        renderSchedule();
    };
    window.openAddSubjectModal = openAddSubjectModal;
    window.saveScheduleItem = saveScheduleItem;
    window.deleteScheduleItem = deleteScheduleItem;
}
