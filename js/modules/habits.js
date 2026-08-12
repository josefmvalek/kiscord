import { supabase } from '../core/supabase.js';
import { state, ensureLoveShopData } from '../core/state.js';
import { triggerHaptic, triggerConfetti, getTodayKey } from '../core/utils.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';

let habitsData = [];
let habitLogs = [];

export async function renderHabits() {
    if (state.currentChannel !== 'habits') return;
    const container = document.getElementById("messages-container");
    if (!container) return;

    await loadHabitsData();

    const todayStr = getTodayKey();
    const myId = state.currentUser?.id;
    const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';

    const myHabits = habitsData.filter(h => h.user_id === myId || h.is_shared);
    const partnerHabits = habitsData.filter(h => h.user_id !== myId && !h.is_shared);

    const completedTodayCount = myHabits.filter(h => isHabitCompletedToday(h.id, todayStr)).length;
    const totalHabitsCount = myHabits.length;
    const pct = totalHabitsCount > 0 ? Math.round((completedTodayCount / totalHabitsCount) * 100) : 0;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <!-- Header bar -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-[#3ba55c]/10 flex items-center justify-center text-xl text-[#3ba55c] border border-[#3ba55c]/20">
                        🌿
                    </div>
                    <div>
                        <h1 class="text-base font-black text-white uppercase tracking-tight leading-none">Habits & Návyky Tracker</h1>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Denní rutina + Odměna +5 Love Coins za splnění! 🪙</p>
                    </div>
                </div>

                <button onclick="window.openAddHabitModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center">
                    <i class="fas fa-plus text-xs"></i> Přidat návyk
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-6 pb-24">
                <div class="max-w-4xl mx-auto space-y-6">

                    <!-- Today Banner -->
                    <div class="glass-card bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-3 select-none">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-0.5">Dnešní plnění (${todayStr})</span>
                                <h3 class="text-sm font-black text-white uppercase tracking-wider">Tvá denní rutina</h3>
                            </div>
                            <span class="text-base font-black text-emerald-400 font-mono">${completedTodayCount} / ${totalHabitsCount} (${pct}%)</span>
                        </div>

                        <div class="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" style="width: ${pct}%"></div>
                        </div>
                    </div>

                    <!-- My Habits Section -->
                    <div class="space-y-3">
                        <h2 class="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <span>Moje Návyky 🌿</span>
                            <span class="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono">${myHabits.length}</span>
                        </h2>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${myHabits.length === 0 ? `
                                <div class="col-span-full p-8 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl text-center text-xs text-gray-500 italic">
                                    Zatím nemáš zadané žádné osobní ani společné návyky. Přidej první tlačítkem výše!
                                </div>
                            ` : myHabits.map(h => {
                                const isDone = isHabitCompletedToday(h.id, todayStr);
                                const streak = calculateHabitStreak(h.id);

                                return `
                                    <div class="glass-card bg-white/[0.02] border ${isDone ? 'border-[#3ba55c]/30 bg-[#3ba55c]/[0.02]' : 'border-white/5'} rounded-2xl p-4 flex items-center justify-between gap-4 transition group">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <button onclick="window.toggleHabitToday('${h.id}')" class="w-10 h-10 rounded-2xl border transition-all duration-200 flex items-center justify-center text-lg ${isDone ? 'bg-[#3ba55c] border-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/20' : 'bg-black/30 border-white/10 hover:border-white/20 text-gray-500'}">
                                                <i class="fas ${isDone ? 'fa-check' : 'fa-plus'}"></i>
                                            </button>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-sm font-bold text-white truncate">${h.icon || '🌿'} ${h.name}</span>
                                                    ${h.is_shared ? `<span class="text-[8px] font-black uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">Společný</span>` : ''}
                                                </div>
                                                <p class="text-[10px] text-gray-400 font-medium mt-0.5 truncate">${h.description || 'Pravidelný návyk'}</p>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3 flex-shrink-0 select-none">
                                            <div class="text-right font-mono">
                                                <div class="text-xs font-black text-amber-400 flex items-center justify-end gap-1">
                                                    <span>🔥 ${streak}</span>
                                                </div>
                                                <div class="text-[8px] text-gray-500 font-bold uppercase mt-0.5">+5 🪙 coins</div>
                                            </div>
                                            <button onclick="window.deleteHabitItem('${h.id}')" class="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition">
                                                <i class="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Partner Habits Section -->
                    ${partnerHabits.length > 0 ? `
                        <div class="space-y-3 pt-4">
                            <h2 class="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2 pl-1">
                                <span>Návyky ${partnerName} 👸</span>
                                <span class="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono">${partnerHabits.length}</span>
                            </h2>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-80">
                                ${partnerHabits.map(h => {
                                    const isDone = isHabitCompletedToday(h.id, todayStr);
                                    const streak = calculateHabitStreak(h.id);

                                    return `
                                        <div class="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                                            <div class="flex items-center gap-3 min-w-0">
                                                <div class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm ${isDone ? 'text-[#3ba55c]' : 'text-gray-600'} font-bold">
                                                    ${isDone ? '✓' : '○'}
                                                </div>
                                                <div class="min-w-0">
                                                    <div class="text-xs font-bold text-gray-300 truncate">${h.icon || '🌿'} ${h.name}</div>
                                                    <div class="text-[9px] text-gray-500 font-medium mt-0.5">${isDone ? 'Dnes splněno! 🎉' : 'Zatím nesplněno'}</div>
                                                </div>
                                            </div>
                                            <span class="text-xs font-black text-amber-400 font-mono">🔥 ${streak}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                </div>
            </div>
        </div>
    `;

    attachWindowHabits();
}

function isHabitCompletedToday(habitId, todayStr) {
    return habitLogs.some(l => l.habit_id === habitId && l.date_key === todayStr);
}

function calculateHabitStreak(habitId) {
    const logs = habitLogs.filter(l => l.habit_id === habitId).map(l => l.date_key).sort().reverse();
    if (logs.length === 0) return 0;

    let streak = 0;
    let curr = new Date();

    for (let i = 0; i < 30; i++) {
        const dStr = curr.toISOString().split('T')[0];
        if (logs.includes(dStr)) {
            streak++;
            curr.setDate(curr.getDate() - 1);
        } else if (i === 0) {
            // Check yesterday if today hasn't been logged yet
            curr.setDate(curr.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

async function loadHabitsData() {
    try {
        const [habitsRes, logsRes] = await Promise.all([
            supabase.from('app_habits').select('*'),
            supabase.from('app_habit_logs').select('*')
        ]);
        if (habitsRes.data) habitsData = habitsRes.data;
        else habitsData = JSON.parse(localStorage.getItem('kiscord_local_habits') || '[]');

        if (logsRes.data) habitLogs = logsRes.data;
        else habitLogs = JSON.parse(localStorage.getItem('kiscord_local_habit_logs') || '[]');
    } catch (e) {
        console.warn("[Habits] Load fallback to localStorage:", e);
        habitsData = JSON.parse(localStorage.getItem('kiscord_local_habits') || '[]');
        habitLogs = JSON.parse(localStorage.getItem('kiscord_local_habit_logs') || '[]');
    }
}

function saveLocalHabits() {
    localStorage.setItem('kiscord_local_habits', JSON.stringify(habitsData));
}

function saveLocalHabitLogs() {
    localStorage.setItem('kiscord_local_habit_logs', JSON.stringify(habitLogs));
}

export function openAddHabitModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-3 gap-3">
                ${renderInputGroup({
                    label: 'Ikona (Emoji)',
                    id: 'habit-icon',
                    value: '💧'
                })}
                <div class="col-span-2">
                    ${renderInputGroup({
                        label: 'Název návyku',
                        id: 'habit-name',
                        placeholder: 'např. Vypít 2.5l vody, Učení FIT 1h...'
                    })}
                </div>
            </div>

            ${renderInputGroup({
                label: 'Popis nebo cíl',
                id: 'habit-desc',
                placeholder: 'např. Každé ráno po probuzení sklenice vody...'
            })}

            <div class="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                <input type="checkbox" id="habit-shared" class="w-4 h-4 rounded accent-[#3ba55c]">
                <label for="habit-shared" class="text-xs font-bold text-white cursor-pointer select-none">
                    Společný návyk pro oba (Jožka & Klárka) 🤝
                </label>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-habit-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.saveHabitItem()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit návyk
            </button>
        </div>
    `;

    document.getElementById('add-habit-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-habit-modal',
        title: 'Přidat Nový Návyk',
        subtitle: 'Vybuduj si skvělé rutiny 🌿',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-habit-modal').remove()"
    }));

    document.getElementById('add-habit-modal').classList.remove('hidden');
    document.getElementById('add-habit-modal').classList.add('flex');
}

export async function saveHabitItem() {
    triggerHaptic('medium');

    const icon = document.getElementById('habit-icon').value.trim() || '🌿';
    const name = document.getElementById('habit-name').value.trim();
    const desc = document.getElementById('habit-desc').value.trim();
    const isShared = document.getElementById('habit-shared').checked;

    if (!name) {
        showNotification('Napište název návyku!', 'warning');
        return;
    }

    const newHabit = {
        id: crypto.randomUUID(),
        user_id: state.currentUser?.id,
        icon,
        name,
        description: desc,
        is_shared: isShared
    };

    try {
        const { error } = await supabase
            .from('app_habits')
            .insert(newHabit);

        if (error) {
            console.warn("[Habits] DB insert error, fallback to local storage:", error);
        }
    } catch (e) {
        console.warn("[Habits] DB exception, fallback to local storage:", e);
    }

    habitsData.push(newHabit);
    saveLocalHabits();

    showNotification('Nový návyk založen! 🌿', 'success');
    document.getElementById('add-habit-modal')?.remove();
    renderHabits();
}

export async function toggleHabitToday(habitId) {
    const todayStr = getTodayKey();
    const myId = state.currentUser?.id;
    const isDone = isHabitCompletedToday(habitId, todayStr);

    if (isDone) {
        triggerHaptic('light');
        habitLogs = habitLogs.filter(l => !(l.habit_id === habitId && l.date_key === todayStr && l.user_id === myId));
        saveLocalHabitLogs();

        try {
            await supabase
                .from('app_habit_logs')
                .delete()
                .eq('habit_id', habitId)
                .eq('date_key', todayStr)
                .eq('user_id', myId);
        } catch (e) {
            console.warn("[Habits] DB delete exception:", e);
        }
    } else {
        triggerHaptic('success');
        triggerConfetti();

        const newLog = {
            id: crypto.randomUUID(),
            habit_id: habitId,
            user_id: myId,
            date_key: todayStr
        };

        habitLogs.push(newLog);
        saveLocalHabitLogs();

        try {
            await supabase
                .from('app_habit_logs')
                .insert(newLog);

            // Award +5 Love Coins for completing a habit!
            const isMeJose = state.currentUser?.id === state.user_ids?.jose;
            const currentCoins = isMeJose ? (state.loveCoins?.jose || 0) : (state.loveCoins?.klarka || 0);
            const newCoins = currentCoins + 5;

            await supabase
                .from('profiles')
                .update({ love_coins: newCoins })
                .eq('id', myId);

            await ensureLoveShopData(true);
        } catch (e) {
            console.warn("[Habits] DB insert log exception:", e);
        }

        showNotification('Návyk splněn! Získáváte +5 Love Coins! 🪙🎉', 'success');
    }

    renderHabits();
}

export async function deleteHabitItem(id) {
    if (!confirm('Opravdu smazat tento návyk?')) return;

    triggerHaptic('medium');

    habitsData = habitsData.filter(h => h.id !== id);
    saveLocalHabits();

    try {
        await supabase.from('app_habits').delete().eq('id', id);
    } catch (e) {
        console.warn("[Habits] DB delete exception:", e);
    }

    showNotification('Návyk smazán.', 'info');
    renderHabits();
}


function attachWindowHabits() {
    window.openAddHabitModal = openAddHabitModal;
    window.saveHabitItem = saveHabitItem;
    window.toggleHabitToday = toggleHabitToday;
    window.deleteHabitItem = deleteHabitItem;
}
