import { state } from '../../core/state.js';
import { getAssetUrl } from '../../core/assets.js';
import { supabase } from '../../core/supabase.js';
import { triggerHaptic, showNotification, broadcastPomodoroUpdate, pomodoroState } from './shared.js';

/**
 * POMODORO TIMER
 */
export function togglePomodoro() {
    if (pomodoroState.status === 'running') {
        stopPomodoro();
    } else {
        startPomodoro();
    }
}

function startPomodoro() {
    pomodoroState.status = 'running';
    pomodoroState.timeLeft = 25 * 60;
    
    // Notify Partner
    broadcastPomodoroUpdate({ type: 'start' });

    pomodoroState.interval = setInterval(() => {
        pomodoroState.timeLeft--;
        if (pomodoroState.timeLeft <= 0) {
            clearInterval(pomodoroState.interval);
            pomodoroState.status = 'idle';
            showNotification('Pomodoro hotové! Dej si pauzu. ☕', 'success');
            triggerHaptic('heavy');
            broadcastPomodoroUpdate({ type: 'finish' });
        }
        updatePomodoroUI();
    }, 1000);

    updatePomodoroUI();
    triggerHaptic('medium');
}

function stopPomodoro() {
    clearInterval(pomodoroState.interval);
    pomodoroState.status = 'idle';
    broadcastPomodoroUpdate({ type: 'stop' });
    updatePomodoroUI();
    triggerHaptic('light');
}

export function updatePomodoroUI() {
    const timerEl = document.getElementById('pomodoro-timer');
    const btnEl = document.getElementById('pomodoro-btn');
    const statusListEl = document.getElementById('pomodoro-status-list');

    if (timerEl) {
        const mins = Math.floor(pomodoroState.timeLeft / 60);
        const secs = pomodoroState.timeLeft % 60;
        timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (btnEl) {
        btnEl.textContent = pomodoroState.status === 'running' ? 'Stop 🛑' : 'Start 🧠';
        btnEl.className = pomodoroState.status === 'running'
            ? "bg-[#ed4245] hover:bg-[#c03537] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition active:scale-95"
            : "bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition active:scale-95";
    }

    if (statusListEl) {
        const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
        const partnerImg = state.currentUser?.name === 'Jožka' ? getAssetUrl('klarka_profile') : getAssetUrl('jozka_profile');
        const isStudying = pomodoroState.status === 'running';

        statusListEl.innerHTML = `
            <div class="flex-shrink-0 bg-white/5 px-4 py-2 rounded-full text-[10px] font-bold ${isStudying ? 'text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'text-gray-400'} uppercase tracking-widest flex items-center gap-2">
                <img src="${partnerImg}" class="w-4 h-4 rounded-full object-cover ${isStudying ? '' : 'grayscale opacity-50'}"> 
                ${partnerName} ${isStudying ? 'právě poctivě studuje... 🔥' : 'se teď fláká...'}
            </div>
            <div class="flex-shrink-0 bg-white/5 px-4 py-2 rounded-full text-[10px] font-bold ${isStudying ? 'text-[#eb459e] border border-[#eb459e]/20' : 'text-gray-400'} uppercase tracking-widest flex items-center gap-2">
                <img src="${state.currentUser?.name === 'Jožka' ? getAssetUrl('jozka_profile') : getAssetUrl('klarka_profile')}" class="w-4 h-4 rounded-full object-cover ${isStudying ? '' : 'grayscale opacity-50'}"> 
                Já ${isStudying ? 'makám na své budoucnosti! 🚀' : 'mám v plánu studovat.'}
            </div>
        `;
    }
}

/**
 * SOS PANIC BUTTON
 */
export function triggerSOS() {
    if (window.chan) {
        window.chan.send({
            type: 'broadcast',
            event: 'matura-sos',
            payload: {
                sender: state.currentUser?.name,
                message: 'POTŘEBUJU POMOCT SE STUDIEM! 🆘💀',
                timestamp: Date.now()
            }
        });
        showNotification('SOS odesláno! Partner je na cestě... 🏃💨', 'error');
        triggerHaptic('heavy');
    }
}

/**
 * SCHEDULING
 */
export async function scheduleTopic(itemId, dateOption) {
    let dateStr;
    if (dateOption === 'today') {
        dateStr = new Date().toISOString().split('T')[0];
    } else if (dateOption === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        dateStr = d.toISOString().split('T')[0];
    } else if (dateOption === 'overmorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        dateStr = d.toISOString().split('T')[0];
    } else {
        dateStr = dateOption; // Assuming valid YYYY-MM-DD from input
    }

    try {
        const { data, error } = await supabase.from('matura_schedule').insert({
            user_id: state.currentUser.id,
            item_id: itemId,
            scheduled_date: dateStr
        }).select();

        if (error) throw error;

        if (data && data[0]) {
            state.maturaSchedule.push(data[0]);
            import('./dashboard.js').then(d => d.renderTodaysMissions());
            broadcastPomodoroUpdate({ type: 'schedule-sync' });
        }

        showNotification(`Téma naplánováno na ${dateStr}! 🎯`, 'success');
        triggerHaptic('success');
    } catch (e) {
        showNotification("Už máš v té době jiný plán nebo toto téma naplánované!", 'warning');
    }
}

export async function removeMission(missionId) {
    try {
        const { error } = await supabase.from('matura_schedule').delete().eq('id', missionId);
        if (error) throw error;

        state.maturaSchedule = state.maturaSchedule.filter(m => m.id !== missionId);
        import('./dashboard.js').then(d => d.renderTodaysMissions());
        broadcastPomodoroUpdate({ type: 'schedule-sync' });

        showNotification("Mise zrušena 🗑️", "info");
        triggerHaptic('light');
    } catch (e) {
        showNotification("Nepodařilo se smazat misi.", "error");
    }
}
