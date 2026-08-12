import { supabase } from '../../core/supabase.js';
import { state } from '../../core/state.js';
import { triggerHaptic, getTodayKey } from '../../core/utils.js';
import { showNotification } from '../../core/theme.js';
import { broadcastPlanUpdate } from '../../core/sync.js';

let dashboardTimer = null;
let quickPlanData = { cat: 'discord', name: '', time: '' };

export function getCategoryIcon(cat) {
    const icons = { food: '🍔', walk: '🌲', view: '⛰️', fun: '⚡', movie: '🎬', discord: '🎧', game: '🎮', date: '🥂' };
    return icons[cat] || '📅';
}

export function startDashboardTimer(nextDate) {
    if (dashboardTimer) clearInterval(dashboardTimer);
    if (!nextDate) return;

    const [dateKey, entry] = nextDate;
    const targetDate = new Date(`${dateKey}T${entry.time || '00:00'}:00`);

    const updateTimer = () => {
        const timerEl = document.getElementById('countdown-timer');
        if (!timerEl) { clearInterval(dashboardTimer); return; }

        const diff = targetDate - new Date();
        if (diff <= 0) { timerEl.innerText = "PRÁVĚ TEĎ! ❤️"; clearInterval(dashboardTimer); return; }

        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        timerEl.innerText = `${h}:${m}:${s}`;
    };

    updateTimer();
    dashboardTimer = setInterval(updateTimer, 1000);
}

export async function handleNextDateClick(dateKey) {
    triggerHaptic('light');
    if (typeof window.switchChannel === 'function') {
        window.switchChannel('calendar');
    }
    const { showDayDetail } = await import('../calendar.js');
    setTimeout(() => { showDayDetail(dateKey); }, 50);
}

export function showQuickPlanModal(step = 1) {
    import('../../core/ui.js').then(ui => {
        let content = '';
        let title = 'Naplánovat něco?';

        if (step === 1) {
            title = 'Co podnikneme?';
            content = `
                <div class="grid grid-cols-1 gap-3">
                    <button onclick="window.loadModule('dashboard').then(m => m.selectQuickPlanCategory('discord'))" 
                            class="bg-black/20 hover:bg-[#5865F2]/20 p-5 rounded-2xl border border-white/5 hover:border-[#5865F2]/50 transition-all flex items-center gap-4 group">
                        <div class="text-3xl bg-[#5865F2]/10 p-3 rounded-xl group-hover:scale-110 transition">🎧</div>
                        <div class="text-left">
                            <div class="font-bold text-white uppercase text-xs tracking-widest">Discord Call</div>
                            <p class="text-[10px] text-gray-500">Pokec, streamování nebo jen tak být spolu.</p>
                        </div>
                    </button>
                    <button onclick="window.loadModule('dashboard').then(m => m.selectQuickPlanCategory('date'))" 
                            class="bg-black/20 hover:bg-[#eb459e]/20 p-5 rounded-2xl border border-white/5 hover:border-[#eb459e]/50 transition-all flex items-center gap-4 group">
                        <div class="text-3xl bg-[#eb459e]/10 p-3 rounded-xl group-hover:scale-110 transition">🥂</div>
                        <div class="text-left">
                            <div class="font-bold text-white uppercase text-xs tracking-widest">Rande</div>
                            <p class="text-[10px] text-gray-500">Venku, doma, večera nebo dobrodružství.</p>
                        </div>
                    </button>
                    <button onclick="window.loadModule('dashboard').then(m => m.selectQuickPlanCategory('movie'))" 
                            class="bg-black/20 hover:bg-[#faa61a]/20 p-5 rounded-2xl border border-white/5 hover:border-[#faa61a]/50 transition-all flex items-center gap-4 group">
                        <div class="text-3xl bg-[#faa61a]/10 p-3 rounded-xl group-hover:scale-110 transition">🎬</div>
                        <div class="text-left">
                            <div class="font-bold text-white uppercase text-xs tracking-widest">Film / Seriál</div>
                            <p class="text-[10px] text-gray-500">Společné koukání na Netflix nebo kino.</p>
                        </div>
                    </button>
                </div>
            `;
        } else {
            const catInfo = {
                discord: { icon: '🎧', title: 'Discord Call' },
                date: { icon: '🥂', title: 'Rande' },
                movie: { icon: '🎬', title: 'Film / Seriál' }
            }[quickPlanData.cat];

            title = `${catInfo.icon} ${catInfo.title}`;
            content = `
                <div class="space-y-5 animate-fade-in">
                    ${ui.renderInputGroup({
                        label: 'Co přesně budeme dělat?',
                        id: 'qp-name',
                        placeholder: 'Např. Minecraft, Marvelovka, Procházka...',
                        value: quickPlanData.name
                    })}
                    
                    <div class="space-y-2">
                        <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kdy?</label>
                        <div class="flex gap-2">
                             <input type="time" id="qp-time" class="bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none flex-1">
                             <div class="flex gap-1">
                                <button onclick="document.getElementById('qp-time').value = '20:00'" class="bg-white/5 hover:bg-white/10 px-3 rounded-lg text-[10px] font-bold text-gray-400">20:00</button>
                                <button onclick="document.getElementById('qp-time').value = '21:00'" class="bg-white/5 hover:bg-white/10 px-3 rounded-lg text-[10px] font-bold text-gray-400">21:00</button>
                             </div>
                        </div>
                    </div>

                    <div class="pt-2">
                        <button onclick="window.loadModule('dashboard').then(m => m.submitQuickPlan())" 
                                class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition active:scale-95 shadow-xl flex items-center justify-center gap-2">
                            <i class="fas fa-paper-plane text-[10px]"></i> Odeslat pozvánku
                        </button>
                        <button onclick="window.loadModule('dashboard').then(m => m.showQuickPlanModal(1))" 
                                class="w-full mt-3 text-gray-500 hover:text-white py-1 text-[10px] font-bold uppercase transition">
                            <i class="fas fa-arrow-left mr-1"></i> Zpět na výběr
                        </button>
                    </div>
                </div>
            `;
        }

        const modalHtml = ui.renderModal({
            id: 'quick-plan-modal',
            title: title,
            subtitle: step === 1 ? 'Vyber si typ aktivity' : 'Doplň podrobnosti',
            content: content,
            onClose: "document.getElementById('quick-plan-modal').remove()"
        });

        document.getElementById('quick-plan-modal')?.remove();

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        document.getElementById('quick-plan-modal').style.display = 'flex';
    });
}

export function selectQuickPlanCategory(cat) {
    quickPlanData.cat = cat;
    triggerHaptic('light');
    showQuickPlanModal(2);
}

export async function submitQuickPlan(renderDashboardFn) {
    const name = document.getElementById('qp-name')?.value.trim();
    const time = document.getElementById('qp-time')?.value.trim();

    if (!name) return showNotification("Napiš, co budeme dělat!", "warning");

    triggerHaptic('success');
    document.getElementById('quick-plan-modal')?.remove();

    const todayKey = getTodayKey();
    const planId = crypto.randomUUID();

    const newPlan = {
        id: planId,
        date_key: todayKey,
        name: name,
        cat: quickPlanData.cat,
        time: time,
        proposed_by: state.currentUser.id,
        status: 'pending'
    };

    try {
        const { error } = await supabase.from('planned_dates').upsert(newPlan, { onConflict: 'date_key' });
        if (error) throw error;

        showNotification("Pozvánka odeslána! 💌", "success");
        broadcastPlanUpdate({ type: 'proposal', name: name, cat: quickPlanData.cat });

        state.plannedDates[todayKey] = newPlan;
        if (renderDashboardFn) renderDashboardFn();

    } catch (err) {
        console.error("Plan submit error:", err);
        showNotification("Chyba při odesílání plánu.", "error");
    }
}

export async function respondToPlan(dateKey, status, renderDashboardFn) {
    const plan = state.plannedDates[dateKey];
    if (!plan) return;

    triggerHaptic(status === 'confirmed' ? 'success' : 'medium');

    try {
        const { error } = await supabase.from('planned_dates')
            .update({ status: status })
            .eq('date_key', dateKey);

        if (error) throw error;

        state.plannedDates[dateKey].status = status;
        showNotification(status === 'confirmed' ? "Plán potvrzen! ❤️" : "Plán zrušen.", "info");

        broadcastPlanUpdate({ type: 'response', status: status, dateKey: dateKey });
        if (renderDashboardFn) renderDashboardFn();
    } catch (err) {
        console.error("Response error:", err);
    }
}

export function showRejectionModal(dateKey) {
    import('../../core/ui.js').then(ui => {
        const reasons = [
            { id: 'tired', text: 'Jsem unavený/á... 😴' },
            { id: 'study', text: 'Musím se učit 📚' },
            { id: 'busy', text: 'Už něco mám 🏃‍♀️' },
            { id: 'vibe', text: 'Nemám dnes energii ✨' }
        ];

        const content = `
            <div class="space-y-2">
                <p class="text-xs text-gray-400 mb-4 px-1 italic">To nevadí! ❤️ Vyber důvod, ať partner ví...</p>
                <div class="grid grid-cols-1 gap-2">
                    ${reasons.map(r => `
                        <button onclick="window.loadModule('dashboard').then(m => m.rejectPlanWithReason('${dateKey}', '${r.text}'))"
                                class="w-full bg-black/20 hover:bg-red-500/10 p-4 rounded-xl border border-white/5 hover:border-red-500/30 text-left transition text-sm text-gray-200">
                            ${r.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        const modalHtml = ui.renderModal({
            id: 'rejection-modal',
            title: 'Teď raději ne?',
            content: content,
            onClose: "document.getElementById('rejection-modal').remove()"
        });

        document.getElementById('rejection-modal')?.remove();
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        document.getElementById('rejection-modal').style.display = 'flex';
    });
}

export async function rejectPlanWithReason(dateKey, reason, renderDashboardFn) {
    triggerHaptic('medium');
    document.getElementById('rejection-modal')?.remove();

    try {
        const { error } = await supabase.from('planned_dates')
            .update({
                status: 'rejected',
                rejection_reason: reason
            })
            .eq('date_key', dateKey);

        if (error) throw error;

        state.plannedDates[dateKey].status = 'rejected';
        state.plannedDates[dateKey].rejection_reason = reason;
        if (renderDashboardFn) renderDashboardFn();
        showNotification("Plán zrušen s důvodem.", "info");
    } catch (err) {
        console.error("Rejection error:", err);
    }
}
