/**
 * iCalendar (RFC 5545) Sync, Export & Import Engine for Kiscord Calendar
 * Generates standard .ics files compatible with Apple Calendar, Google Calendar,
 * and Outlook, and parses imported .ics files.
 */

import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { formatDateKey, parseDateKey, timeToMinutes } from './time-engine.js';

/**
 * Formats a Date object and time string into iCalendar format (e.g. 20260825T140000).
 * @param {Date} date 
 * @param {string|null} timeStr "HH:MM"
 * @returns {string}
 */
export function formatICSDateTime(date, timeStr = null) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    if (!timeStr) {
        return `${y}${m}${d}`;
    }

    const [hh, mm] = timeStr.split(':');
    return `${y}${m}${d}T${String(hh || '00').padStart(2, '0')}${String(mm || '00').padStart(2, '0')}00`;
}

/**
 * Escapes special characters for iCalendar text fields.
 * @param {string} str 
 * @returns {string}
 */
export function escapeICSText(str) {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Generates a full RFC 5545 VCALENDAR string.
 * @param {object} options 
 * @returns {string}
 */
export function generateICSString(options = { includeFIT: true, includeGym: true, includePlans: true, includeDeadlines: true }) {
    const now = new Date();
    const dtstamp = formatICSDateTime(now, `${now.getHours()}:${now.getMinutes()}`) + 'Z';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Kiscord//Lifestyle Calendar 2.0//CS',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Kiscord Kalendář',
        'X-WR-TIMEZONE:Europe/Prague'
    ];

    // 1. FIT VUT Timetable items (weekly recurrence RRULE)
    if (options.includeFIT && (state.scheduleItems || []).length > 0) {
        const dayCodes = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
        
        // Find reference Monday of current semester
        const refMonday = new Date();
        const diff = refMonday.getDate() - refMonday.getDay() + (refMonday.getDay() === 0 ? -6 : 1);
        refMonday.setDate(diff);

        state.scheduleItems.forEach((sub, idx) => {
            const dayNum = sub.day_of_week;
            if (dayNum < 1 || dayNum > 5) return;

            const eventDate = new Date(refMonday);
            eventDate.setDate(refMonday.getDate() + (dayNum - 1));

            const dtStart = formatICSDateTime(eventDate, sub.time_start || '08:00');
            const dtEnd = formatICSDateTime(eventDate, sub.time_end || '10:00');
            const dayCode = dayCodes[dayNum];

            lines.push(
                'BEGIN:VEVENT',
                `UID:fit-${sub.id || sub.subject_code || idx}-${dtStart}@kiscord.app`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART;TZID=Europe/Prague:${dtStart}`,
                `DTEND;TZID=Europe/Prague:${dtEnd}`,
                `RRULE:FREQ=WEEKLY;BYDAY=${dayCode};COUNT=14`,
                `SUMMARY:${escapeICSText(`[${sub.subject_code || 'FIT'}] ${sub.name || 'Výuka'}`)}`,
                `DESCRIPTION:${escapeICSText(`${sub.type || 'Přednáška / Cvičení'} • ${sub.teacher || ''}`)}`,
                `LOCATION:${escapeICSText(sub.room ? `FIT VUT, ${sub.room}` : 'FIT VUT Božetěchova')}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            );
        });
    }

    // 2. Gym Workouts
    if (options.includeGym && (state.gymLogs || []).length > 0) {
        state.gymLogs.forEach(log => {
            if (!log.date_key) return;
            const logDate = parseDateKey(log.date_key);
            let timeStr = '16:00';
            if (log.created_at) {
                try {
                    const cd = new Date(log.created_at);
                    if (!isNaN(cd.getTime())) {
                        timeStr = `${String(cd.getHours()).padStart(2, '0')}:${String(cd.getMinutes()).padStart(2, '0')}`;
                    }
                } catch {}
            }

            const dtStart = formatICSDateTime(logDate, timeStr);
            const durMin = Math.round((log.duration_seconds || 3600) / 60);
            const endDate = new Date(logDate);
            const startMin = timeToMinutes(timeStr) || (16 * 60);
            const endMin = startMin + durMin;
            const dtEnd = formatICSDateTime(endDate, `${Math.floor(endMin / 60)}:${endMin % 60}`);

            const exercisesDesc = (log.exercises || []).map(ex => 
                `• ${ex.exercise_name}: ${(ex.sets || []).length} sérií`
            ).join('\n');

            lines.push(
                'BEGIN:VEVENT',
                `UID:gym-${log.id || log.date_key}@kiscord.app`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART;TZID=Europe/Prague:${dtStart}`,
                `DTEND;TZID=Europe/Prague:${dtEnd}`,
                `SUMMARY:${escapeICSText(`🏋️ ${log.name || 'Posilovna'}`)}`,
                `DESCRIPTION:${escapeICSText(`Trénink (${durMin} min)\n${exercisesDesc}`)}`,
                'LOCATION:Posilovna',
                'STATUS:CONFIRMED',
                'END:VEVENT'
            );
        });
    }

    // 3. Planned Dates & Romantic activities
    if (options.includePlans && state.plannedDates) {
        Object.entries(state.plannedDates).forEach(([dateKey, plan]) => {
            if (!plan || !plan.name) return;
            const planDate = parseDateKey(dateKey);
            const timeStr = plan.time || '18:00';
            const durMin = plan.durationMinutes || 90;

            const dtStart = formatICSDateTime(planDate, timeStr);
            const startMin = timeToMinutes(timeStr) || (18 * 60);
            const endMin = startMin + durMin;
            const dtEnd = formatICSDateTime(planDate, `${Math.floor(endMin / 60)}:${endMin % 60}`);

            const checklistDesc = (plan.checklist || []).map(c => 
                `[${c.done ? 'X' : ' '}] ${c.text}`
            ).join('\n');

            lines.push(
                'BEGIN:VEVENT',
                `UID:plan-${dateKey}-${plan.id || 'date'}@kiscord.app`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART;TZID=Europe/Prague:${dtStart}`,
                `DTEND;TZID=Europe/Prague:${dtEnd}`,
                `SUMMARY:${escapeICSText(`❤️ ${plan.name}`)}`,
                `DESCRIPTION:${escapeICSText(`Kategorie: ${plan.cat || 'rande'}\n${checklistDesc ? `\nChecklist:\n${checklistDesc}` : ''}`)}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            );
        });
    }

    // 4. School Deadlines (with VALARM)
    if (options.includeDeadlines && (state.schoolDeadlines || []).length > 0) {
        state.schoolDeadlines.forEach(dl => {
            if (!dl.deadline_date) return;
            const dlDate = parseDateKey(dl.deadline_date);
            const timeStr = dl.deadline_time || '23:59';
            const dtStart = formatICSDateTime(dlDate, timeStr);

            lines.push(
                'BEGIN:VEVENT',
                `UID:deadline-${dl.id}@kiscord.app`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART;TZID=Europe/Prague:${dtStart}`,
                `DTEND;TZID=Europe/Prague:${dtStart}`,
                `SUMMARY:${escapeICSText(`🔥 DEADLINE: [${dl.subject_code || 'FIT'}] ${dl.title}`)}`,
                `DESCRIPTION:${escapeICSText(`Termín odevzdání předmětu ${dl.subject_code || ''}`)}`,
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                'DESCRIPTION:Připomenutí termínu',
                'TRIGGER:-PT2H',
                'END:VALARM',
                'END:VEVENT'
            );
        });
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

/**
 * Downloads the generated .ics file to user's device.
 */
export function downloadCalendarICS(filename = 'kiscord-calendar.ics', options) {
    triggerHaptic('medium');
    const icsContent = generateICSString(options);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.appendChild(a);
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Parses an iCalendar string and extracts events.
 * @param {string} icsText 
 * @returns {Array<object>}
 */
export function parseICSStringToEvents(icsText) {
    if (!icsText || typeof icsText !== 'string') return [];

    const events = [];
    const veventBlocks = icsText.split(/BEGIN:VEVENT/i).slice(1);

    veventBlocks.forEach(block => {
        const summaryMatch = block.match(/SUMMARY(?:;[^:]+)?:(.*)/i);
        const dtstartMatch = block.match(/DTSTART(?:;[^:]+)?:(.*)/i);
        const locationMatch = block.match(/LOCATION(?:;[^:]+)?:(.*)/i);
        const descMatch = block.match(/DESCRIPTION(?:;[^:]+)?:(.*)/i);

        if (!summaryMatch || !dtstartMatch) return;

        let title = summaryMatch[1].replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ').trim();
        let rawDate = dtstartMatch[1].trim();

        // Extract date and time
        let dateKey = '';
        let time = '12:00';

        if (rawDate.includes('T')) {
            const [dPart, tPart] = rawDate.split('T');
            dateKey = `${dPart.slice(0, 4)}-${dPart.slice(4, 6)}-${dPart.slice(6, 8)}`;
            time = `${tPart.slice(0, 2)}:${tPart.slice(2, 4)}`;
        } else {
            dateKey = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
        }

        let cat = 'date';
        if (/gym|posilovna|trénink/i.test(title)) cat = 'gym';
        if (/fit|vut|přednáška|cvičení/i.test(title)) cat = 'fit';

        events.push({
            title,
            dateKey,
            time,
            cat,
            location: locationMatch ? locationMatch[1].trim() : '',
            description: descMatch ? descMatch[1].trim() : '',
            durationMinutes: 60
        });
    });

    return events;
}

/**
 * Displays the Export/Import modal in the UI.
 */
export function showExportICSModal() {
    triggerHaptic('light');

    const modal = document.createElement('div');
    modal.id = 'cal-export-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-[#2f3136] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-5 select-none" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-xl bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-file-export"></i>
                    </span>
                    <h3 class="text-sm font-black text-white uppercase tracking-wider">Export do iCalendar (.ics)</h3>
                </div>
                <button onclick="document.getElementById('cal-export-modal').remove()" class="w-7 h-7 rounded-lg bg-[#202225] hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>

            <p class="text-xs text-gray-400 mb-4">
                Vyexportuj svůj Kiscord rozvrh a plány pro Apple Kalendář (iOS/macOS), Google Kalendář nebo Outlook.
            </p>

            <div class="space-y-2.5 bg-[#202225] p-3.5 rounded-xl border border-white/5 mb-4">
                <label class="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                    <input type="checkbox" id="exp-fit" checked class="rounded accent-[#5865F2]">
                    <span>🎓 Rozvrh výuky VUT FIT</span>
                </label>
                <label class="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                    <input type="checkbox" id="exp-gym" checked class="rounded accent-[#5865F2]">
                    <span>🏋️‍♂️ Tréninky v Posilovně</span>
                </label>
                <label class="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                    <input type="checkbox" id="exp-plans" checked class="rounded accent-[#5865F2]">
                    <span>❤️ Společné plány & Rande</span>
                </label>
                <label class="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                    <input type="checkbox" id="exp-deadlines" checked class="rounded accent-[#5865F2]">
                    <span>🔥 Školní deadliny & Upozornění</span>
                </label>
            </div>

            <div class="flex gap-2">
                <button onclick="document.getElementById('cal-export-modal').remove()" class="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition">
                    Zavřít
                </button>
                <button onclick="Calendar.downloadICSFromUI()" class="flex-1 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-[#5865F2]/20">
                    <i class="fas fa-download"></i> Stáhnout .ics
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

export function downloadICSFromUI() {
    const includeFIT = document.getElementById('exp-fit')?.checked ?? true;
    const includeGym = document.getElementById('exp-gym')?.checked ?? true;
    const includePlans = document.getElementById('exp-plans')?.checked ?? true;
    const includeDeadlines = document.getElementById('exp-deadlines')?.checked ?? true;

    downloadCalendarICS('kiscord-calendar.ics', {
        includeFIT,
        includeGym,
        includePlans,
        includeDeadlines
    });

    document.getElementById('cal-export-modal')?.remove();
}
