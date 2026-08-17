import { supabase } from '../../core/supabase.js';
import { state } from '../../core/state.js';
import { triggerHaptic, getTodayKey } from '../../core/utils.js';
import { showNotification } from '../../core/theme.js';
import { broadcastPlanUpdate } from '../../core/sync.js';

let dashboardTimer = null;
let quickPlanData = { cat: 'date', name: '', time: '19:00' };

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
        let title = 'Naplánovat rande či hovor? 🥂';

        if (step === 1) {
            title = 'Co podnikneme?';
            content = `
                <div class="grid grid-cols-1 gap-2.5">
                    <button onclick="window.selectQuickPlanCategory('date')" 
                            class="bg-[#2b2d31] hover:bg-[#35373c] p-4 rounded-2xl border border-[#202225] hover:border-[#eb459e]/50 transition-all flex items-center gap-4 text-left group cursor-pointer active:scale-98">
                        <div class="text-3xl bg-[#eb459e]/15 p-3 rounded-xl group-hover:scale-110 transition">🥂</div>
                        <div>
                            <div class="font-black text-white uppercase text-xs tracking-wider flex items-center gap-1.5">
                                Rande / Dobrodružství <span class="text-[10px] text-[#eb459e]">❤️</span>
                            </div>
                            <p class="text-xs text-[#949ba4] mt-0.5">Večeře, procházka, piknik nebo společný výlet.</p>
                        </div>
                    </button>

                    <button onclick="window.selectQuickPlanCategory('discord')" 
                            class="bg-[#2b2d31] hover:bg-[#35373c] p-4 rounded-2xl border border-[#202225] hover:border-[#5865F2]/50 transition-all flex items-center gap-4 text-left group cursor-pointer active:scale-98">
                        <div class="text-3xl bg-[#5865F2]/15 p-3 rounded-xl group-hover:scale-110 transition">🎧</div>
                        <div>
                            <div class="font-black text-white uppercase text-xs tracking-wider flex items-center gap-1.5">
                                Discord Call / Gamesky <span class="text-[10px] text-[#5865F2]">🎮</span>
                            </div>
                            <p class="text-xs text-[#949ba4] mt-0.5">Pokec, streamování nebo hraní her.</p>
                        </div>
                    </button>

                    <button onclick="window.selectQuickPlanCategory('movie')" 
                            class="bg-[#2b2d31] hover:bg-[#35373c] p-4 rounded-2xl border border-[#202225] hover:border-[#faa61a]/50 transition-all flex items-center gap-4 text-left group cursor-pointer active:scale-98">
                        <div class="text-3xl bg-[#faa61a]/15 p-3 rounded-xl group-hover:scale-110 transition">🎬</div>
                        <div>
                            <div class="font-black text-white uppercase text-xs tracking-wider flex items-center gap-1.5">
                                Film / Seriál <span class="text-[10px] text-[#faa61a]">🍿</span>
                            </div>
                            <p class="text-xs text-[#949ba4] mt-0.5">Společné koukání na film v posteli nebo v kině.</p>
                        </div>
                    </button>
                </div>
            `;
        } else {
            const catInfo = {
                discord: { icon: '🎧', title: 'Discord Call & Pokec', placeholder: 'Např. Minecraft, streamování, pokec...' },
                date: { icon: '🥂', title: 'Rande & Výlet', placeholder: 'Např. Večeře v centru, procházka v parku, zmrzlina...' },
                movie: { icon: '🎬', title: 'Film / Seriál', placeholder: 'Např. Marvelovka, nový díl seriálu...' }
            }[quickPlanData.cat] || { icon: '📅', title: 'Plán', placeholder: 'Co podnikneme?' };

            title = `${catInfo.icon} ${catInfo.title}`;
            content = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-[11px] font-black text-[#949ba4] uppercase tracking-wider mb-2">Co přesně budeme dělat?</label>
                        <div class="bg-[#1e1f22] p-3 rounded-xl border border-[#36393f] focus-within:border-[#5865F2] transition-colors">
                            <input type="text" id="qp-name" 
                                   placeholder="${catInfo.placeholder}"
                                   value="${quickPlanData.name || ''}"
                                   class="w-full bg-transparent text-white text-sm outline-none placeholder-[#72767d]">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-[11px] font-black text-[#949ba4] uppercase tracking-wider mb-2">V kolik hodin?</label>
                        <div class="flex gap-2 items-center">
                             <input type="time" id="qp-time" value="${quickPlanData.time || '19:00'}" 
                                    class="bg-[#1e1f22] text-white text-sm p-3 rounded-xl border border-[#36393f] outline-none flex-1 font-mono font-bold">
                             <div class="flex gap-1">
                                <button type="button" onclick="document.getElementById('qp-time').value = '18:00'" class="bg-[#1e1f22] hover:bg-[#35373c] px-3 py-2 rounded-xl text-xs font-bold text-[#dbdee1] border border-[#36393f]">18:00</button>
                                <button type="button" onclick="document.getElementById('qp-time').value = '20:00'" class="bg-[#1e1f22] hover:bg-[#35373c] px-3 py-2 rounded-xl text-xs font-bold text-[#dbdee1] border border-[#36393f]">20:00</button>
                             </div>
                        </div>
                    </div>

                    <div class="pt-2 space-y-2">
                        <button type="button" onclick="window.submitQuickPlan()" 
                                class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3.5 rounded-xl font-black uppercase tracking-wider text-xs transition active:scale-95 shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]">
                            <i class="fas fa-paper-plane text-xs"></i> Odeslat pozvánku partnerovi
                        </button>
                        <button type="button" onclick="window.showQuickPlanModal(1)" 
                                class="w-full py-2 text-[#949ba4] hover:text-white text-xs font-bold uppercase transition">
                            <i class="fas fa-arrow-left mr-1"></i> Zpět na výběr typu
                        </button>
                    </div>
                </div>
            `;
        }

        const modalHtml = ui.renderModal({
            id: 'quick-plan-modal',
            title: title,
            subtitle: step === 1 ? 'Vyber si kategorii' : 'Nastav čas a podrobnosti',
            content: content,
            onClose: "document.getElementById('quick-plan-modal')?.remove()"
        });

        document.getElementById('quick-plan-modal')?.remove();

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        const modal = document.getElementById('quick-plan-modal');
        if (modal) modal.style.display = 'flex';
    });
}

export function selectQuickPlanCategory(cat) {
    quickPlanData.cat = cat;
    triggerHaptic('light');
    showQuickPlanModal(2);
}

export async function submitQuickPlan() {
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
        cat: quickPlanData.cat || 'date',
        time: time || '19:00',
        proposed_by: state.currentUser?.id,
        status: 'pending'
    };

    try {
        if (!state.plannedDates) state.plannedDates = {};
        state.plannedDates[todayKey] = newPlan;

        const { error } = await supabase.from('planned_dates').upsert(newPlan, { onConflict: 'date_key' });
        if (error) throw error;

        showNotification("Pozvánka odeslána! 💌", "success");
        broadcastPlanUpdate({ type: 'proposal', name: name, cat: quickPlanData.cat });

        const { renderDashboard } = await import('../dashboard.js');
        renderDashboard();

    } catch (err) {
        console.error("Plan submit error:", err);
        showNotification("Chyba při odesílání plánu.", "error");
    }
}

export async function respondToPlan(dateKey, status) {
    if (!state.plannedDates || !state.plannedDates[dateKey]) return;

    triggerHaptic(status === 'confirmed' ? 'success' : 'medium');

    try {
        const { error } = await supabase.from('planned_dates')
            .update({ status: status })
            .eq('date_key', dateKey);

        if (error) throw error;

        state.plannedDates[dateKey].status = status;
        showNotification(status === 'confirmed' ? "Plán potvrzen! ❤️" : "Plán zrušen.", "info");

        broadcastPlanUpdate({ type: 'response', status: status, dateKey: dateKey });
        const { renderDashboard } = await import('../dashboard.js');
        renderDashboard();
    } catch (err) {
        console.error("Response error:", err);
    }
}

export function showRejectionModal(dateKey) {
    import('../../core/ui.js').then(ui => {
        const reasons = [
            { id: 'tired', text: 'Jsem dnes unavený/á... 😴' },
            { id: 'study', text: 'Musím se učit na FIT 📚' },
            { id: 'busy', text: 'Už něco mám 🏃‍♀️' },
            { id: 'vibe', text: 'Dnes nemám energii ✨' }
        ];

        const content = `
            <div class="space-y-3">
                <p class="text-xs text-[#949ba4]">To nevadí! ❤️ Dej partnerovi vědět proč:</p>
                <div class="grid grid-cols-1 gap-2">
                    ${reasons.map(r => `
                        <button onclick="window.rejectPlanWithReason('${dateKey}', '${r.text}')"
                                class="w-full bg-[#2b2d31] hover:bg-[#35373c] p-3.5 rounded-xl border border-[#202225] hover:border-[#ed4245]/40 text-left transition text-xs font-bold text-[#dbdee1] cursor-pointer">
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
            onClose: "document.getElementById('rejection-modal')?.remove()"
        });

        document.getElementById('rejection-modal')?.remove();
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
        const modal = document.getElementById('rejection-modal');
        if (modal) modal.style.display = 'flex';
    });
}

export async function rejectPlanWithReason(dateKey, reason) {
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

        if (state.plannedDates && state.plannedDates[dateKey]) {
            state.plannedDates[dateKey].status = 'rejected';
            state.plannedDates[dateKey].rejection_reason = reason;
        }
        showNotification("Plán zrušen s důvodem.", "info");

        const { renderDashboard } = await import('../dashboard.js');
        renderDashboard();
    } catch (err) {
        console.error("Rejection error:", err);
    }
}
