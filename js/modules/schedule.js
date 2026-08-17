import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';
import { isJosef } from '../core/auth.js';

let activeViewMode = 'grid'; // 'grid' | 'agenda'
let activeUserFilter = 'all'; // 'all' | 'jose' | 'klarka'
let scheduleData = [];

// Předvolby předmětů pro 1. ročník VUT FIT
export const FIT_PRESET_SUBJECTS = [
    { code: 'IZP', name: 'Základy programování', type: 'Přednáška', defaultRoom: 'E112', color: 'indigo' },
    { code: 'IUS', name: 'Úvod do softwarového inženýrství', type: 'Přednáška', defaultRoom: 'D105', color: 'blue' },
    { code: 'IDA', name: 'Diskrétní matematika', type: 'Přednáška', defaultRoom: 'E112', color: 'emerald' },
    { code: 'IMA1', name: 'Matematická analýza 1', type: 'Přednáška', defaultRoom: 'D105', color: 'amber' },
    { code: 'ITW', name: 'Tvorba webových stránek', type: 'Laboratoř', defaultRoom: 'C228', color: 'teal' },
    { code: 'INC', name: 'Návrh číslicových systémů', type: 'Přednáška', defaultRoom: 'E112', color: 'purple' },
    { code: 'IAL', name: 'Algoritmy', type: 'Přednáška', defaultRoom: 'D105', color: 'rose' }
];

// FIT Učebny a nápovědy k areálu Božetěchova
export const FIT_ROOM_HINTS = {
    'E112': 'Budova E — Hlavní velká aula (přízemí)',
    'E104': 'Budova E — Velká posluchárna',
    'E105': 'Budova E — Přednáškový sál',
    'D105': 'Budova D — Velká posluchárna',
    'D106': 'Budova D — Posluchárna',
    'C228': 'Budova C — Počítačová laboratoř (2. patro)',
    'C230': 'Budova C — Počítačová laboratoř (2. patro)',
    'A112': 'Budova A — Historická budova / seminární místnost',
    'A113': 'Budova A — Seminární místnost',
    'L301': 'Budova L — Cvičebna',
    'Knihovna': 'Knihovna FIT — Areál Božetěchova',
    'Respirium': 'Respirium FIT — Místo na kávu a odpočinek'
};

const DAYS_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];

/**
 * Hlavní vykreslení rozvrhu
 */
export async function renderSchedule() {
    if (state.currentChannel !== 'schedule') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await loadScheduleData();

    const isMeJose = state.currentUser?.name === 'Jožka' || isJosef(state.currentUser) || state.currentUser?.id === state.user_ids?.jose;
    const partnerName = isMeJose ? "Klárka" : "Jožka";

    // Výpočet živého stavu
    const liveStatus = calculateLiveStatus();
    // Výpočet společných volných oken
    const freeSlotsSummary = calculateWeeklyFreeOverlapsSummary();

    container.innerHTML = `
        <div class="h-full bg-[#18191c] flex flex-col font-sans animate-fade-in relative overflow-hidden select-none">
            <!-- Header bar -->
            <div class="bg-[#202225] shadow-md z-10 flex-shrink-0 border-b border-gray-800/80 p-4 lg:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5865F2]/25 to-blue-600/10 flex items-center justify-center text-xl text-[#5865F2] border border-[#5865F2]/30 shadow-inner">
                        🎓
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <span>VUT FIT Rozvrh 2.0</span>
                            <span class="bg-[#5865F2]/20 text-[#5865F2] text-[8px] font-black px-2 py-0.5 rounded-full border border-[#5865F2]/30">Brno • Božetěchova</span>
                        </h1>
                        <p class="text-[10px] text-gray-400 font-medium">Interaktivní rozvrh, společná volná okénka & učebny</p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    <!-- Přepínač Grid / Agenda -->
                    <div class="flex bg-black/40 border border-gray-800 rounded-xl p-1 text-xs font-bold">
                        <button onclick="window.setScheduleViewMode('grid')" 
                                class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeViewMode === 'grid' ? 'bg-[#5865F2] text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-th text-[10px]"></i> <span class="text-[10px] uppercase font-black">Mřížka</span>
                        </button>
                        <button onclick="window.setScheduleViewMode('agenda')" 
                                class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeViewMode === 'agenda' ? 'bg-[#5865F2] text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                            <i class="fas fa-list text-[10px]"></i> <span class="text-[10px] uppercase font-black">Agenda</span>
                        </button>
                    </div>

                    <!-- Filtr Uživatelů -->
                    <div class="flex bg-black/40 border border-gray-800 rounded-xl p-1 text-xs font-bold">
                        <button onclick="window.setScheduleUserFilter('all')" 
                                class="px-2.5 py-1.5 rounded-lg transition-all text-[10px] uppercase font-black ${activeUserFilter === 'all' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'}">
                            Oba 🤝
                        </button>
                        <button onclick="window.setScheduleUserFilter('jose')" 
                                class="px-2.5 py-1.5 rounded-lg transition-all text-[10px] uppercase font-black ${activeUserFilter === 'jose' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}">
                            Jožka 🔵
                        </button>
                        <button onclick="window.setScheduleUserFilter('klarka')" 
                                class="px-2.5 py-1.5 rounded-lg transition-all text-[10px] uppercase font-black ${activeUserFilter === 'klarka' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}">
                            Klárka 🔴
                        </button>
                    </div>

                    <button onclick="window.openAddSubjectModal()" 
                            class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95">
                        <i class="fas fa-plus text-xs"></i> <span>Přidat hodinu</span>
                    </button>
                </div>
            </div>

            <!-- Content Scroll Area -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-28">
                <div class="max-w-6xl mx-auto space-y-6">

                    <!-- TOP WIDGETS: Živý status + Společná volná okénka -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- 1. Live status widget -->
                        <div class="bg-gradient-to-br from-[#202225] to-[#1a1c1e] border border-gray-800 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-[9px] font-black uppercase tracking-widest text-[#5865F2] flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full ${liveStatus.inProgress ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}"></span>
                                    ${liveStatus.inProgress ? 'Právě probíhá výuka' : 'Aktuální stav'}
                                </span>
                                <span class="text-[10px] font-bold text-gray-500 font-mono">${liveStatus.currentTimeStr}</span>
                            </div>

                            <div class="flex items-center gap-3.5">
                                <div class="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-2xl flex-shrink-0">
                                    ${liveStatus.icon}
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-sm font-black text-white truncate leading-tight">${liveStatus.title}</h3>
                                    <p class="text-[11px] text-gray-400 font-medium mt-0.5 leading-snug">${liveStatus.subtitle}</p>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Společná volná okénka na kolejích / kávu -->
                        <div class="bg-gradient-to-br from-[#202225] to-[#1a1c1e] border border-gray-800 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                                    <i class="fas fa-heart text-pink-400"></i> Společný čas & Volná okénka
                                </span>
                                <span class="text-[10px] font-black text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full">Koleje & Menza</span>
                            </div>

                            <div class="flex items-center gap-3.5">
                                <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl text-amber-400 flex-shrink-0">
                                    ☕
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-xs font-bold text-gray-200 leading-snug">${freeSlotsSummary.headline}</h3>
                                    <p class="text-[10.5px] text-gray-400 font-medium mt-0.5 leading-snug">${freeSlotsSummary.details}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ROZVRHOVÝ POHLED: GRID NEBO AGENDA -->
                    ${activeViewMode === 'grid' ? renderWeeklyGridView() : renderAgendaView()}

                </div>
            </div>
        </div>
    `;

    attachWindowSchedule();
}

/**
 * Týdenní mřížka (Grid View)
 */
function renderWeeklyGridView() {
    return `
        <div class="space-y-4">
            ${DAYS_NAMES.map((dayName, dayIdx) => {
                const dayNum = dayIdx + 1;
                const dayEvents = scheduleData.filter(e => e.day_of_week === dayNum);

                const joseEvents = dayEvents.filter(e => isUserJose(e.user_id));
                const klarkaEvents = dayEvents.filter(e => isUserKlarka(e.user_id));

                const filteredEvents = activeUserFilter === 'jose' 
                    ? joseEvents 
                    : (activeUserFilter === 'klarka' ? klarkaEvents : dayEvents);

                const freeSlots = calculateDayFreeSlots(joseEvents, klarkaEvents);

                return `
                    <div class="bg-[#202225]/80 border border-gray-800/80 rounded-3xl p-5 shadow-xl space-y-4">
                        <!-- Den v týdnu hlavička -->
                        <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                            <div class="flex items-center gap-2.5">
                                <span class="w-3 h-3 rounded-full bg-[#5865F2] shadow-sm shadow-[#5865F2]/50"></span>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">${dayName}</h3>
                            </div>
                            <div class="flex items-center gap-3 text-[10px]">
                                ${freeSlots.length > 0 ? `
                                    <span class="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                        <i class="fas fa-coffee text-[9px]"></i> Volno: ${freeSlots.join(', ')}
                                    </span>
                                ` : ''}
                                <span class="text-gray-500 font-bold font-mono">${filteredEvents.length} předmětů</span>
                            </div>
                        </div>

                        <!-- Karty předmětů -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            ${filteredEvents.length === 0 ? `
                                <div class="col-span-full p-6 text-center text-gray-500 text-xs italic bg-black/20 rounded-2xl border border-gray-800/50">
                                    Žádná výuka v tento den – ideální čas na projekty nebo odpočinek! 🎉
                                </div>
                            ` : filteredEvents.sort((a, b) => (a.time_start || '').localeCompare(b.time_start || '')).map(item => {
                                const isJose = isUserJose(item.user_id);
                                const ownerLabel = isJose ? 'Jožka 🔵' : 'Klárka 🔴';
                                const typeStyle = getTypeStyle(item.type);
                                const roomHint = FIT_ROOM_HINTS[item.room] || item.building || 'Areál Božetěchova';

                                return `
                                    <div class="bg-[#18191c] border ${typeStyle.border} rounded-2xl p-4 flex justify-between items-start gap-3 shadow-md hover:border-white/20 transition-all group relative overflow-hidden">
                                        <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${typeStyle.bar}"></div>
                                        
                                        <div class="min-w-0 pl-1.5 space-y-1.5 flex-1">
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${typeStyle.badge}">${item.type || 'Přednáška'}</span>
                                                <span class="text-[9px] font-bold ${isJose ? 'text-blue-400' : 'text-pink-400'}">${ownerLabel}</span>
                                            </div>

                                            <div>
                                                <h4 class="text-xs font-black text-white truncate tracking-wide">
                                                    ${item.subject_code ? `<span class="text-[#5865F2] font-mono mr-1">${item.subject_code}</span>` : ''}
                                                    ${item.name}
                                                </h4>
                                                ${item.notes ? `<p class="text-[10px] text-gray-400 mt-0.5 truncate">${item.notes}</p>` : ''}
                                            </div>

                                            <div class="flex items-center gap-3 text-[10px] text-gray-400 font-mono pt-1">
                                                <span class="flex items-center gap-1 text-gray-300 font-bold">
                                                    <i class="fas fa-clock text-[#5865F2] text-[9px]"></i> ${item.time_start} – ${item.time_end}
                                                </span>
                                                ${item.room ? `
                                                    <span class="flex items-center gap-1 text-amber-400 font-bold cursor-help" title="${roomHint}">
                                                        <i class="fas fa-map-marker-alt text-[9px]"></i> ${item.room}
                                                    </span>
                                                ` : ''}
                                            </div>
                                        </div>

                                        <button onclick="window.deleteScheduleItem('${item.id}')" 
                                                class="text-gray-600 hover:text-red-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                                title="Smazat hodinu">
                                            <i class="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Agendový pohled (Agenda View)
 */
function renderAgendaView() {
    const sorted = [...scheduleData].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return (a.time_start || '').localeCompare(b.time_start || '');
    });

    return `
        <div class="bg-[#202225]/80 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i class="fas fa-calendar-alt text-[#5865F2]"></i> Kompletní týdenní rozvrh hodin
            </h3>

            <div class="divide-y divide-gray-800">
                ${sorted.map(item => {
                    const dayName = DAYS_NAMES[item.day_of_week - 1] || 'Neznámý den';
                    const isJose = isUserJose(item.user_id);
                    const typeStyle = getTypeStyle(item.type);
                    const roomHint = FIT_ROOM_HINTS[item.room] || 'Areál Božetěchova';

                    return `
                        <div class="py-3.5 flex items-center justify-between gap-4 group">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-16 text-center flex-shrink-0">
                                    <span class="text-[9px] font-black uppercase text-[#5865F2] block">${dayName}</span>
                                    <span class="text-[10px] text-gray-400 font-mono font-bold">${item.time_start}</span>
                                </div>
                                <div class="w-2 h-8 rounded-full bg-gradient-to-b ${typeStyle.bar} flex-shrink-0"></div>
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2">
                                        <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${typeStyle.badge}">${item.type}</span>
                                        <span class="text-xs font-bold text-white truncate">${item.subject_code ? item.subject_code + ' — ' : ''}${item.name}</span>
                                    </div>
                                    <span class="text-[10px] text-gray-400 font-medium block mt-0.5">${item.room ? `Učebna: ${item.room} (${roomHint})` : 'Božetěchova'} • ${isJose ? 'Jožka 🔵' : 'Klárka 🔴'}</span>
                                </div>
                            </div>

                            <button onclick="window.deleteScheduleItem('${item.id}')" class="text-gray-600 hover:text-red-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition">
                                <i class="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Modální okno pro přidání nové hodiny s předvolbami FITu
 */
export function openAddSubjectModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <!-- Rychlé předvolby FIT 1. ročník -->
            <div>
                <label class="block text-[9px] text-gray-400 font-black uppercase tracking-wider mb-2">Rychlé předvolby 1. semestru FIT:</label>
                <div class="flex flex-wrap gap-1.5">
                    ${FIT_PRESET_SUBJECTS.map(p => `
                        <button type="button" 
                                onclick="window.applySubjectPreset('${p.code}', '${p.name}', '${p.type}', '${p.defaultRoom}')"
                                class="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-[#5865F2]/30 text-[#5865F2] hover:text-white border border-[#5865F2]/20 text-[10px] font-black transition-all">
                            + ${p.code}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Zkratka předmětu',
                    id: 'sched-code',
                    placeholder: 'např. IZP, IUS, IDA...'
                })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Typ výuky</label>
                    <select id="sched-type" class="w-full bg-[#18191c] text-white text-xs p-3 rounded-xl border border-gray-700 outline-none focus:border-[#5865F2] transition-all">
                        <option value="Přednáška">Přednáška 📘</option>
                        <option value="Laboratoř">Počítačová laborka 💻</option>
                        <option value="Cvičení">Seminární cvičení 📐</option>
                        <option value="Zkouška">Zápočet / Půlsemestrálka 🔴</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Plný název předmětu',
                id: 'sched-name',
                placeholder: 'např. Základy programování'
            })}

            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Den v týdnu</label>
                    <select id="sched-day" class="w-full bg-[#18191c] text-white text-xs p-3 rounded-xl border border-gray-700 outline-none focus:border-[#5865F2] transition-all">
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

            <div class="grid grid-cols-2 gap-3">
                ${renderInputGroup({
                    label: 'Učebna (E112, D105, C228...)',
                    id: 'sched-room',
                    placeholder: 'např. E112'
                })}
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pro koho</label>
                    <select id="sched-user" class="w-full bg-[#18191c] text-white text-xs p-3 rounded-xl border border-gray-700 outline-none focus:border-[#5865F2] transition-all">
                        <option value="current">Pro mě</option>
                        <option value="both">Pro oba (společný předmět)</option>
                    </select>
                </div>
            </div>

            ${renderInputGroup({
                label: 'Poznámka (volitelné)',
                id: 'sched-notes',
                placeholder: 'např. Sudý týden / Vzít si notebook'
            })}
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2.5 w-full">
            <button onclick="document.getElementById('add-subject-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.saveScheduleSubject()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-95">
                Uložit hodinu
            </button>
        </div>
    `;

    document.getElementById('add-subject-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-subject-modal',
        title: 'Přidat předmět / cvičení',
        subtitle: 'VUT FIT Rozvrh 🎓',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-subject-modal').remove()"
    }));

    const modalEl = document.getElementById('add-subject-modal');
    modalEl?.classList.remove('hidden');
    modalEl?.classList.add('flex');
}

export async function saveScheduleSubject() {
    triggerHaptic('medium');

    const code = document.getElementById('sched-code')?.value.trim();
    const type = document.getElementById('sched-type')?.value;
    const name = document.getElementById('sched-name')?.value.trim();
    const day = parseInt(document.getElementById('sched-day')?.value) || 1;
    const start = document.getElementById('sched-start')?.value;
    const end = document.getElementById('sched-end')?.value;
    const room = document.getElementById('sched-room')?.value.trim();
    const userOption = document.getElementById('sched-user')?.value;
    const notes = document.getElementById('sched-notes')?.value.trim();

    if (!name && !code) {
        showNotification('Zadejte alespoň název nebo zkratku předmětu!', 'warning');
        return;
    }

    const records = [];
    if (userOption === 'both' && state.user_ids?.jose && state.user_ids?.klarka) {
        records.push(
            { user_id: state.user_ids.jose, subject_code: (code || name).toUpperCase(), name: name || code, type, day_of_week: day, time_start: start, time_end: end, room, notes },
            { user_id: state.user_ids.klarka, subject_code: (code || name).toUpperCase(), name: name || code, type, day_of_week: day, time_start: start, time_end: end, room, notes }
        );
    } else {
        records.push({
            user_id: state.currentUser?.id,
            subject_code: (code || name).toUpperCase(),
            name: name || code,
            type,
            day_of_week: day,
            time_start: start,
            time_end: end,
            room,
            notes
        });
    }

    try {
        const { error } = await supabase.from('schedule_items').insert(records);
        if (error) throw error;

        triggerConfetti();
        showNotification('Předmět úspěšně přidán do rozvrhu! 📚', 'success');
        document.getElementById('add-subject-modal')?.remove();
        renderSchedule();
    } catch (e) {
        console.error("[Schedule] Error saving subject:", e);
        showNotification('Chyba při ukládání: ' + e.message, 'error');
    }
}

export async function deleteScheduleItem(id) {
    triggerHaptic('light');
    try {
        const { error } = await supabase.from('schedule_items').delete().eq('id', id);
        if (error) throw error;
        showNotification('Hodina odstraněna.', 'info');
        renderSchedule();
    } catch (e) {
        console.error("[Schedule] Delete error:", e);
    }
}

// --- HELPER LOGIC ---

async function loadScheduleData() {
    try {
        const { data, error } = await supabase.from('schedule_items').select('*');
        if (!error && data) {
            scheduleData = data;
        }
    } catch (e) {
        console.warn("[Schedule] Data load fallback:", e);
    }
}

function calculateLiveStatus() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Ne, 1 = Po, 5 = Pá
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    if (currentDay === 0 || currentDay === 6) {
        return {
            inProgress: false,
            title: "Je víkend! Žádná výuka.",
            subtitle: "Užijte si společný volný čas a načerpejte energii.",
            icon: "🎉",
            currentTimeStr
        };
    }

    const todayEvents = scheduleData.filter(e => e.day_of_week === currentDay);
    const active = todayEvents.find(e => e.time_start <= currentTimeStr && e.time_end >= currentTimeStr);

    if (active) {
        return {
            inProgress: true,
            title: `${active.subject_code || ''} ${active.name}`,
            subtitle: `Do konce zbývá: ${active.time_end} • Učebna: ${active.room || 'Božetěchova'}`,
            icon: "💻",
            currentTimeStr
        };
    }

    const nextUpcoming = todayEvents
        .filter(e => e.time_start > currentTimeStr)
        .sort((a, b) => a.time_start.localeCompare(b.time_start))[0];

    if (nextUpcoming) {
        return {
            inProgress: false,
            title: `Další hodina: ${nextUpcoming.subject_code || nextUpcoming.name}`,
            subtitle: `Začíná v ${nextUpcoming.time_start} v učebně ${nextUpcoming.room || 'Božetěchova'}`,
            icon: "⏳",
            currentTimeStr
        };
    }

    return {
        inProgress: false,
        title: "Dnes už máte hotovo!",
        subtitle: "Všechny dnešní přednášky i cvičení skončily.",
        icon: "☕",
        currentTimeStr
    };
}

export function calculateDayFreeSlots(joseEvents, klarkaEvents) {
    const allBusy = [...joseEvents, ...klarkaEvents];
    if (allBusy.length === 0) return ['Celý den volno'];

    // Jednoduché hledání společných oken mezi 10:00 - 16:00
    const checkPoints = [
        { start: '10:00', end: '12:00', label: '10:00-12:00' },
        { start: '12:00', end: '14:00', label: '12:00-14:00 (Oběd)' },
        { start: '14:00', end: '16:00', label: '14:00-16:00' },
        { start: '16:00', end: '18:00', label: '16:00-18:00' }
    ];

    const free = [];
    checkPoints.forEach(slot => {
        const conflict = allBusy.some(e => !(e.time_end <= slot.start || e.time_start >= slot.end));
        if (!conflict) free.push(slot.label);
    });

    return free;
}

function calculateWeeklyFreeOverlapsSummary() {
    const today = new Date().getDay();
    const dayEvents = scheduleData.filter(e => e.day_of_week === (today >= 1 && today <= 5 ? today : 1));
    const joseEvents = dayEvents.filter(e => isUserJose(e.user_id));
    const klarkaEvents = dayEvents.filter(e => isUserKlarka(e.user_id));

    const free = calculateDayFreeSlots(joseEvents, klarkaEvents);
    if (free.length === 0) {
        return {
            headline: "Dnes nabitý rozvrh bez delších pauz",
            details: "Večer na kolejích si to vynahradíte u dobrého čaje!"
        };
    }

    return {
        headline: `Společné volno dnes: ${free.slice(0, 2).join(' a ')}`,
        details: "Skvělý čas na společný oběd v menze Purkyňova nebo respiriu FITu."
    };
}

function isUserJose(userId) {
    return userId === state.user_ids?.jose;
}

function isUserKlarka(userId) {
    return userId === state.user_ids?.klarka;
}

function getTypeStyle(type) {
    switch (type) {
        case 'Laboratoř':
            return { border: 'border-emerald-500/30', bar: 'from-emerald-400 to-teal-600', badge: 'bg-emerald-500/20 text-emerald-300' };
        case 'Cvičení':
            return { border: 'border-amber-500/30', bar: 'from-amber-400 to-yellow-600', badge: 'bg-amber-500/20 text-amber-300' };
        case 'Zkouška':
            return { border: 'border-rose-500/40', bar: 'from-rose-500 to-red-600', badge: 'bg-rose-500/20 text-rose-300' };
        default:
            return { border: 'border-[#5865F2]/30', bar: 'from-[#5865F2] to-indigo-600', badge: 'bg-[#5865F2]/20 text-[#5865F2]' };
    }
}

function attachWindowSchedule() {
    window.setScheduleViewMode = (mode) => {
        activeViewMode = mode;
        renderSchedule();
    };
    window.setScheduleUserFilter = (user) => {
        activeUserFilter = user;
        renderSchedule();
    };
    window.openAddSubjectModal = openAddSubjectModal;
    window.saveScheduleSubject = saveScheduleSubject;
    window.deleteScheduleItem = deleteScheduleItem;
    window.applySubjectPreset = (code, name, type, room) => {
        const elCode = document.getElementById('sched-code');
        const elName = document.getElementById('sched-name');
        const elType = document.getElementById('sched-type');
        const elRoom = document.getElementById('sched-room');
        if (elCode) elCode.value = code;
        if (elName) elName.value = name;
        if (elType) elType.value = type;
        if (elRoom) elRoom.value = room;
    };
}
