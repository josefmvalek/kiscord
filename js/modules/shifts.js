import { state, ensureShiftsData } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { safeUpsert } from '../core/offline.js';
import { showNotification } from '../core/theme.js';

let weekOffset = 0;
let isSaving = false;

// List of shift presets
export const SHIFT_PRESETS = {
    'ranni': { label: 'Ranní 🌅', emoji: '🌅', color: 'from-amber-400 to-orange-500', start: '06:00', end: '14:00' },
    'odpoledni': { label: 'Odpolední 🌆', emoji: '🌆', color: 'from-indigo-400 to-purple-600', start: '14:00', end: '22:00' },
    'volno': { label: 'Volno 🌴', emoji: '🌴', color: 'from-emerald-400 to-teal-500', start: '00:00', end: '24:00' },
    'custom': { label: 'Vlastní ⚙️', emoji: '⚙️', color: 'from-blue-400 to-cyan-500', start: '', end: '' }
};

export async function renderShifts() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Make sure we have state user IDs and shift data loaded
    await ensureShiftsData();

    // Set a global reference for rerendering
    window.renderShifts = renderShifts;

    const weekDates = getWeekDates(weekOffset);
    const startOfWeekStr = formatDate(weekDates[0]);
    const endOfWeekStr = formatDate(weekDates[6]);

    // Build the shift overlap detection text
    const overlapsText = detectOverlaps(weekDates);

    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16">
            <!-- Header section -->
            <div class="sticky top-0 z-50 bg-[#36393f]/90 backdrop-blur-md pb-4 pt-6 px-6 border-b border-white/5 shadow-lg">
                <div class="flex justify-between items-center w-full max-w-3xl mx-auto">
                    <div>
                        <h2 class="text-2xl font-black text-white uppercase tracking-tighter leading-tight flex items-center gap-2">
                           <i class="fas fa-business-time text-[#faa61a]"></i> Plánovač Směn
                        </h2>
                        <p class="text-xs text-white/50 font-semibold tracking-wide mt-1">
                            Slaďme naše směny v Rakousku a vyražme do hor! 🏔️
                        </p>
                    </div>
                </div>
                
                <!-- Week navigation -->
                <div class="flex justify-between items-center w-full max-w-3xl mx-auto mt-6 bg-white/[0.02] border border-white/5 rounded-2xl p-2">
                    <button onclick="window.changeShiftsWeek(-1)" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> Předchozí
                    </button>
                    <span class="text-xs font-black uppercase tracking-widest text-white/80">
                        ${startOfWeekStr} – ${endOfWeekStr}
                    </span>
                    <button onclick="window.changeShiftsWeek(1)" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                        Další <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            <div class="max-w-3xl mx-auto px-4 pt-6 space-y-6">
                <!-- Overlap detector board -->
                <div class="glass-card bg-gradient-to-r from-purple-950/40 to-indigo-950/40 rounded-3xl border border-purple-500/20 p-6 shadow-xl relative overflow-hidden group">
                    <div class="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-purple-500/20 group-hover:scale-110 transition-transform">
                            🥳
                        </div>
                        <div class="flex-1">
                            <h3 class="text-white text-base font-black uppercase tracking-widest leading-tight">Detektor Společného Volna</h3>
                            <p class="text-xs text-purple-200/80 leading-relaxed font-medium mt-2">
                                ${overlapsText}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Shifts list / days of the week -->
                <div class="space-y-3">
                    ${weekDates.map(date => renderDayRow(date)).join('')}
                </div>
            </div>
        </div>

        <!-- Shift Editor Modal Container -->
        <div id="shift-modal-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] hidden items-center justify-center p-4">
            <div class="glass-card bg-[#2f3136] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative animate-scale-up">
                <button onclick="window.closeShiftModal()" class="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <i class="fas fa-times"></i>
                </button>
                
                <h3 id="modal-day-title" class="text-lg font-black text-white uppercase tracking-wider mb-2">Nastavit směnu</h3>
                <p id="modal-day-subtitle" class="text-xs text-white/40 mb-6 font-semibold">Vyber si typ směny nebo zadej vlastní čas</p>

                <!-- Options -->
                <div class="grid grid-cols-2 gap-3 mb-6">
                    ${Object.entries(SHIFT_PRESETS).map(([type, value]) => `
                        <button onclick="window.selectShiftTypePreset('${type}')" 
                                id="preset-btn-${type}"
                                class="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-left transition-all flex flex-col gap-2 group/btn">
                            <span class="text-2xl group-hover/btn:scale-110 transition-transform">${value.emoji}</span>
                            <span class="text-xs font-bold text-white">${value.label}</span>
                            <span class="text-[10px] text-white/40">${value.start && value.end ? `${value.start} - ${value.end}` : 'Zadat vlastní'}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- Custom time picker (hidden by default) -->
                <div id="custom-shift-times" class="space-y-4 mb-6 hidden">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5">Začátek</label>
                            <input type="time" id="shift-start" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-purple-500/50">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5">Konec</label>
                            <input type="time" id="shift-end" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-purple-500/50">
                        </div>
                    </div>
                </div>

                <!-- Optional Note -->
                <div class="mb-6">
                    <label class="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5">Poznámka (volitelné)</label>
                    <input type="text" id="shift-note" placeholder="Např. inventura, ranní porada, volnější den..." 
                           class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-medium placeholder-white/20 focus:outline-none focus:border-purple-500/50">
                </div>

                <!-- Actions -->
                <div class="flex gap-3">
                    <button onclick="window.deleteShift()" class="flex-1 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl transition-all border border-red-500/20">
                        Smazat směnu
                    </button>
                    <button onclick="window.saveShift()" class="flex-[2] py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                        Uložit
                    </button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Global hook for changing weeks
window.changeShiftsWeek = (dir) => {
    triggerHaptic('light');
    weekOffset += dir;
    renderShifts();
};

let activeModalDate = null;
let activeSelectedPreset = 'ranni';

// Open shift modal
window.openShiftModal = (dateStr) => {
    triggerHaptic('medium');
    activeModalDate = dateStr;

    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const localDate = new Date(yr, mo - 1, dy);
    const formattedDate = localDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });
    document.getElementById('modal-day-title').textContent = formattedDate;

    // Get current user shift if it exists
    const dayData = state.shifts[dateStr] || {};
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids.jose;
    const myShift = isMeJose ? dayData.jose : dayData.klarka;

    // Fill form
    if (myShift) {
        activeSelectedPreset = myShift.shift_type;
        document.getElementById('shift-note').value = myShift.note || '';
        document.getElementById('shift-start').value = myShift.time_start || '';
        document.getElementById('shift-end').value = myShift.time_end || '';
    } else {
        activeSelectedPreset = 'ranni';
        document.getElementById('shift-note').value = '';
        document.getElementById('shift-start').value = '';
        document.getElementById('shift-end').value = '';
    }

    // Refresh UI selections
    window.selectShiftTypePreset(activeSelectedPreset);

    // Show modal
    const modal = document.getElementById('shift-modal-overlay');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// Close modal
window.closeShiftModal = () => {
    const modal = document.getElementById('shift-modal-overlay');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    activeModalDate = null;
};

// Select shift preset type
window.selectShiftTypePreset = (type) => {
    triggerHaptic('light');
    activeSelectedPreset = type;

    // Update buttons
    Object.keys(SHIFT_PRESETS).forEach(k => {
        const btn = document.getElementById(`preset-btn-${k}`);
        if (btn) {
            if (k === type) {
                btn.classList.add('bg-purple-500/10', 'border-purple-500/50', 'ring-1', 'ring-purple-500/20');
                btn.classList.remove('bg-white/5', 'border-white/5');
            } else {
                btn.classList.remove('bg-purple-500/10', 'border-purple-500/50', 'ring-1', 'ring-purple-500/20');
                btn.classList.add('bg-white/5', 'border-white/5');
            }
        }
    });

    // Custom time fields toggle
    const customTimes = document.getElementById('custom-shift-times');
    if (customTimes) {
        if (type === 'custom') {
            customTimes.classList.remove('hidden');
        } else {
            customTimes.classList.add('hidden');
        }
    }
};

// Save shift
window.saveShift = async () => {
    if (isSaving || !activeModalDate) return;
    isSaving = true;
    triggerHaptic('medium');

    const note = document.getElementById('shift-note').value.trim();
    let timeStart = '';
    let timeEnd = '';

    if (activeSelectedPreset === 'custom') {
        timeStart = document.getElementById('shift-start').value;
        timeEnd = document.getElementById('shift-end').value;
    } else {
        timeStart = SHIFT_PRESETS[activeSelectedPreset].start;
        timeEnd = SHIFT_PRESETS[activeSelectedPreset].end;
    }

    const payload = {
        date_key: activeModalDate,
        user_id: state.currentUser?.id,
        shift_type: activeSelectedPreset,
        time_start: timeStart || null,
        time_end: timeEnd || null,
        note: note || null
    };

    // If updating, include existing shift id to upsert cleanly
    const dayData = state.shifts[activeModalDate] || {};
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids.jose;
    const myShift = isMeJose ? dayData.jose : dayData.klarka;
    if (myShift?.id) {
        payload.id = myShift.id;
    }

    try {
        const { data, error } = await safeUpsert('brigade_shifts', payload, 'id');
        if (error) throw error;

        // Optimistic UI updates
        if (!state.shifts[activeModalDate]) state.shifts[activeModalDate] = {};
        const savedRecord = (data && data[0]) ? data[0] : payload;
        
        const localShiftData = {
            id: savedRecord.id || 'temp-' + Date.now(),
            shift_type: activeSelectedPreset,
            time_start: timeStart,
            time_end: timeEnd,
            note: note,
            user_id: state.currentUser?.id
        };

        if (isMeJose) {
            state.shifts[activeModalDate].jose = localShiftData;
        } else {
            state.shifts[activeModalDate].klarka = localShiftData;
        }

        showNotification('Směna byla úspěšně uložena! 📅', 'success');
        window.closeShiftModal();
        renderShifts();
    } catch (err) {
        console.error('[Shifts] Save failed:', err);
        showNotification('Chyba při ukládání směny... 🦝', 'error');
    } finally {
        isSaving = false;
    }
};

// Delete shift
window.deleteShift = async () => {
    if (isSaving || !activeModalDate) return;
    
    const dayData = state.shifts[activeModalDate] || {};
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids.jose;
    const myShift = isMeJose ? dayData.jose : dayData.klarka;

    if (!myShift) {
        window.closeShiftModal();
        return;
    }

    if (!confirm('Opravdu chceš smazat tuto směnu?')) return;
    isSaving = true;
    triggerHaptic('medium');

    try {
        // Delete shift from Supabase
        const { error } = await supabase.from('brigade_shifts').delete().eq('id', myShift.id);
        if (error) throw error;

        // Clean local state
        if (isMeJose) {
            delete state.shifts[activeModalDate].jose;
        } else {
            delete state.shifts[activeModalDate].klarka;
        }

        showNotification('Směna byla smazána.', 'success');
        window.closeShiftModal();
        renderShifts();
    } catch (err) {
        console.error('[Shifts] Delete failed:', err);
        showNotification('Chyba při mazání směny...', 'error');
    } finally {
        isSaving = false;
    }
};

// Helpers for dates
function getWeekDates(offsetWeeks = 0) {
    const dates = [];
    const now = new Date();
    // Monday as start of week in Europe
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) + (offsetWeeks * 7);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function formatDate(date) {
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
}

export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Render a single day row
function renderDayRow(date) {
    const dateKey = formatDateKey(date);
    const dayName = date.toLocaleDateString('cs-CZ', { weekday: 'long' });
    const dayNum = date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
    
    const dayData = state.shifts[dateKey] || {};
    const joseShift = dayData.jose;
    const klarkaShift = dayData.klarka;

    // Determine currently logged-in user to show "Upravit" button
    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids.jose;

    const isToday = formatDateKey(new Date()) === dateKey;

    return `
        <div class="glass-card bg-white/[0.02] border ${isToday ? 'border-[#faa61a]/30 bg-[#faa61a]/[0.01]' : 'border-white/5'} rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
            <div class="flex items-center gap-4">
                <div class="w-14 text-center">
                    <span class="block text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-[#faa61a]' : 'text-white/40'}">${dayName.slice(0, 3)}</span>
                    <span class="block text-base font-black ${isToday ? 'text-white' : 'text-white/80'} mt-0.5">${dayNum}</span>
                </div>
                
                <div class="h-8 w-[1px] bg-white/5 hidden md:block"></div>

                <!-- User Shifts badges -->
                <div class="flex flex-wrap gap-3 items-center">
                    <!-- Jose Shift Badge -->
                    ${renderUserShiftBadge('Jožka', joseShift, '🔵')}
                    <!-- Klárka Shift Badge -->
                    ${renderUserShiftBadge('Klárka', klarkaShift, '🔴')}
                </div>
            </div>

            <!-- Edit button -->
            <div>
                <button onclick="window.openShiftModal('${dateKey}')" 
                        class="w-full md:w-auto px-4 py-2 text-xs font-black uppercase tracking-widest text-white/50 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl border border-white/5 transition-all">
                    Upravit
                </button>
            </div>
        </div>
    `;
}

function renderUserShiftBadge(userName, shift, markerEmoji) {
    if (!shift) {
        return `
            <div class="flex items-center gap-2 px-3.5 py-2 bg-white/5 rounded-2xl border border-white/5 opacity-40">
                <span class="text-xs text-white/50 font-bold">${markerEmoji} ${userName}:</span>
                <span class="text-[10px] font-bold uppercase tracking-widest text-white/30">Nezadáno</span>
            </div>
        `;
    }

    const preset = SHIFT_PRESETS[shift.shift_type] || SHIFT_PRESETS.custom;
    const timeStr = shift.time_start && shift.time_end ? `${shift.time_start} - ${shift.time_end}` : '';

    return `
        <div class="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-br ${preset.color}/10 border border-white/10 rounded-2xl group/badge relative">
            <span class="text-xs text-white/90 font-black">${markerEmoji} ${userName}:</span>
            <span class="text-xs font-bold text-white flex items-center gap-1">
                <span>${preset.emoji}</span>
                <span>${preset.label.split(' ')[0]}</span>
            </span>
            ${timeStr ? `<span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-white/80">${timeStr}</span>` : ''}
            ${shift.note ? `
                <div class="group-hover/badge:opacity-100 opacity-0 pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 rounded-xl bg-gray-900 border border-white/10 text-[10px] font-medium text-white/80 shadow-xl transition-opacity text-center z-10">
                    ${shift.note}
                </div>
            ` : ''}
        </div>
    `;
}

// Comprehensive overlap detection algorithm
export function detectOverlaps(weekDates) {
    const overlaps = [];
    let countUnset = 0;

    weekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        const dayData = state.shifts[dateKey] || {};
        const jose = dayData.jose;
        const klarka = dayData.klarka;

        const dayName = date.toLocaleDateString('cs-CZ', { weekday: 'long' });

        if (!jose || !klarka) {
            countUnset++;
            return;
        }

        // Both Free
        if (jose.shift_type === 'volno' && klarka.shift_type === 'volno') {
            overlaps.push(`**v ${dayName}** máme **celý den společné volno! 🌴🥳**`);
            return;
        }

        // Both Mornings free (both odpoledni)
        if (jose.shift_type === 'odpoledni' && klarka.shift_type === 'odpoledni') {
            overlaps.push(`**v ${dayName}** máme společné **dopoledne** (do 14:00) ☕`);
            return;
        }

        // Both Evenings free (both ranni)
        if (jose.shift_type === 'ranni' && klarka.shift_type === 'ranni') {
            overlaps.push(`**v ${dayName}** máme společné **odpoledne a večer** (od 14:00!) ☀️🍻`);
            return;
        }

        // One working morning, one working afternoon (opposite shifts)
        if ((jose.shift_type === 'ranni' && klarka.shift_type === 'odpoledni') || 
            (jose.shift_type === 'odpoledni' && klarka.shift_type === 'ranni')) {
            // Opposite shifts
            overlaps.push(`**v ${dayName}** pracujeme naopak 😔 (sladíme se aspoň večer u filmu)`);
            return;
        }

        // One working morning, one free
        if (jose.shift_type === 'ranni' && klarka.shift_type === 'volno') {
            overlaps.push(`**v ${dayName}** máme společný čas **od 14:00** (po Jožkově ranní směně) 🥪`);
            return;
        }
        if (klarka.shift_type === 'ranni' && jose.shift_type === 'volno') {
            overlaps.push(`**v ${dayName}** máme společný čas **od 14:00** (po Klárčině ranní směně) 🧺`);
            return;
        }

        // One working afternoon, one free
        if (jose.shift_type === 'odpoledni' && klarka.shift_type === 'volno') {
            overlaps.push(`**v ${dayName}** máme společné **dopoledne** (do 14:00, než jde Jožka pracovat) 🥐`);
            return;
        }
        if (klarka.shift_type === 'odpoledni' && jose.shift_type === 'volno') {
            overlaps.push(`**v ${dayName}** máme společné **dopoledne** (do 14:00, než jde Klárka pracovat) 🍳`);
            return;
        }

        // Custom time overlap calculations
        if (jose.shift_type === 'custom' || klarka.shift_type === 'custom') {
            // Simple generic message for custom
            overlaps.push(`**v ${dayName}** máme nepravidelné směny, zkontrolujte časy! ⚙️`);
        }
    });

    if (countUnset === 7) {
        return "Zatím nemáme rozvržené žádné směny na tento týden. Klikněte na tlačítka **Upravit** u jednotlivých dní a slaďte své plány! 🇦🇹";
    }

    if (overlaps.length === 0) {
        return "Na tento týden se nám bohužel nepodařilo detekovat žádný delší překryv společného volna... 😔";
    }

    return "Tento týden to vypadá skvěle! 🌟<br>" + overlaps.map(o => `• ${o}`).join('<br>');
}

// Subscribe to real-time events to rerender shifts
window.addEventListener('shifts-updated', () => {
    if (state.currentChannel === 'shifts') {
        ensureShiftsData(true).then(() => {
            if (typeof window.renderShifts === 'function') {
                window.renderShifts();
            }
        });
    }
});
