/**
 * Matura Actions, Streak Calculation, Missions & Notes
 */

import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { showNotification } from '@core/theme.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { renderModal } from '@core/ui.js';
import { broadcastMaturaSOS, broadcastPomodoroUpdate } from '@core/sync.js';

export async function cycleStatus(itemId) {
    const prog = state.maturaProgress[itemId] || {
        jose: { status: 'none', notes: '' },
        klarka: { status: 'none', notes: '' }
    };
    const userVal = state.currentUser?.name;
    const userKey = userVal === 'Jožka' ? 'jose' : 'klarka';
    const current = prog[userKey].status;

    let next = 'none';
    if (current === 'none') next = 'started';
    else if (current === 'started') next = 'done';
    else if (current === 'done') next = 'none';

    prog[userKey].status = next;
    state.maturaProgress[itemId] = prog;

    triggerHaptic(next === 'done' ? 'success' : 'light');
    if (next === 'done') triggerConfetti();

    if (!state.currentUser?.id) {
        console.error('[Matura] Cannot save status: No current user ID.');
        showNotification('Nebyl jsi identifikován - stav se neuloží. Zkus stránku obnovit.', 'error');
    } else {
        try {
            const { error } = await supabase.from('matura_topic_progress').upsert({
                item_id: itemId,
                user_id: state.currentUser?.id,
                status: next,
                updated_at: new Date().toISOString()
            });

            if (error) {
                console.error('[Matura] Supabase error:', error);
                showNotification(`Chyba při ukládání stavu: ${error.message}`, 'error');
            }
        } catch (e) {
            console.warn('[Matura] Unexpected network error:', e);
            showNotification('Chyba sítě při ukládání stavu.', 'error');
        }
    }

    updateTopicCardUI(itemId);
}

export async function updateTopicCardUI(itemId) {
    const card = document.getElementById(`topic-card-${itemId}`) || document.querySelector(`[data-topic-id="${itemId}"]`);
    if (!card) return;

    const prog = state.maturaProgress[itemId] || {
        jose: { status: 'none', notes: '' },
        klarka: { status: 'none', notes: '' }
    };

    let item = null;
    for (const cat in state.maturaTopics) {
        item = state.maturaTopics[cat].find(i => i.id === itemId);
        if (item) break;
    }
    if (!item) return;

    const joseProg = prog.jose || { status: 'none', notes: '' };
    const klarkaProg = prog.klarka || { status: 'none', notes: '' };

    const iconWrapper = card.querySelector('.group-hover\\:scale-110');
    if (iconWrapper) iconWrapper.textContent = item.icon;

    const catLabel = card.querySelector('.matura-cat-label');
    if (catLabel) catLabel.textContent = item.cat || 'Ostatní';

    const titleEl = card.querySelector('.matura-topic-title');
    if (titleEl) {
        titleEl.textContent = item.title;
        titleEl.title = item.title;
    }

    const authorEl = card.querySelector('.matura-topic-author');
    if (authorEl) {
        authorEl.innerHTML = item.author ? `<p class="text-xs text-[var(--text-muted)] italic">${item.author}</p>` : '';
    }

    const isJozka = state.currentUser?.name === 'Jožka';
    const myProg = isJozka ? joseProg : klarkaProg;
    const partnerProg = isJozka ? klarkaProg : joseProg;

    const myBtn = card.querySelector('.matura-my-status-btn');
    if (myBtn) {
        const iconEl = myBtn.querySelector('.status-icon');
        const textEl = myBtn.querySelector('.status-text');

        const statusIcon = myProg.status === 'done' ? '✅' : (myProg.status === 'started' ? '📖' : '⚪');
        const statusText = myProg.status === 'done' ? 'Umím' : (myProg.status === 'started' ? 'Dělám' : 'Nic');
        const statusClass = myProg.status === 'done' ? 'text-green-400' : (myProg.status === 'started' ? 'text-blue-400' : 'text-gray-600');

        if (iconEl) iconEl.textContent = statusIcon;
        if (textEl) {
            textEl.textContent = statusText;
            textEl.className = `text-[9px] font-bold uppercase ${statusClass} truncate status-text`;
        }
    }

    const partnerPill = card.querySelector('.matura-partner-status-pill');
    if (partnerPill) {
        const iconEl = partnerPill.querySelector('.status-icon');
        const textEl = partnerPill.querySelector('.status-text');

        const partnerIcon = partnerProg.status === 'done' ? '✅' : (partnerProg.status === 'started' ? '✍️' : '⚪');
        const partnerText = partnerProg.status === 'done' ? 'Umím' : (partnerProg.status === 'started' ? 'Dělám' : 'Nic');
        const partnerClass = partnerProg.status === 'done' ? 'text-[#eb459e]' : (partnerProg.status === 'started' ? 'text-purple-400' : 'text-gray-600');

        if (iconEl) iconEl.textContent = partnerIcon;
        if (textEl) {
            textEl.textContent = partnerText;
            textEl.className = `text-[9px] font-bold uppercase ${partnerClass} truncate status-text`;
        }
    }

    // Dot indicators fallback
    const myDot = card.querySelector('.my-status-dot');
    const partnerDot = card.querySelector('.partner-status-dot');
    const getStatusColor = (s) => {
        if (s === 'done') return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
        if (s === 'half' || s === 'started') return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]';
        return 'bg-white/10';
    };

    if (myDot) myDot.className = `my-status-dot w-2 h-2 rounded-full transition-all ${getStatusColor(myProg.status)}`;
    if (partnerDot) partnerDot.className = `partner-status-dot w-2 h-2 rounded-full transition-all ${getStatusColor(partnerProg.status)}`;
}

export async function updateMaturaStreak() {
    if (!state.currentUser) return;

    const today = new Date().toISOString().split('T')[0];
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';

    try {
        const { data, error } = await supabase.from('matura_streaks').select('*').eq('user_id', state.currentUser.id).maybeSingle();

        let newStreak = 1;
        let lastDate = data?.last_study_date;

        if (data) {
            if (lastDate === today) return;

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                newStreak = data.current_streak + 1;
            }
        }

        await supabase.from('matura_streaks').upsert({
            user_id: state.currentUser.id,
            current_streak: newStreak,
            max_streak: Math.max(newStreak, data?.max_streak || 0),
            last_study_date: today,
            updated_at: new Date().toISOString()
        });

        if (!state.maturaStreaks) state.maturaStreaks = {};
        state.maturaStreaks[userKey] = newStreak;

        if (newStreak === 3) import('@domains/entertainment/achievements.js').then(a => a.autoUnlock('matura_streak_3')).catch(() => {});
        if (newStreak === 7) import('@domains/entertainment/achievements.js').then(a => a.autoUnlock('matura_streak_7')).catch(() => {});

        showNotification(`🔥 STUDIJNÍ STREAK: ${newStreak} dní! Jen tak dál!`, 'success');
        triggerHaptic('success');
        triggerConfetti();

    } catch (e) {
        console.error("Streak error:", e);
    }
}

export function showScheduleMenu(itemId, btn) {
    const rect = btn.getBoundingClientRect();
    const menuHtml = `
        <div id="schedule-popover" class="fixed z-[1000] bg-[#222428] border border-white/10 rounded-xl shadow-2xl p-2 animate-fade-in w-44" 
             style="top: ${rect.top - 180}px; left: ${rect.left - 60}px;">
            <div class="text-[8px] font-black uppercase text-gray-500 mb-2 px-2">Naplánovat na</div>
            <button onclick="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', 'today'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Dnes 🎯</button>
            <button onclick="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', 'tomorrow'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Zítra 📅</button>
            <button onclick="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', 'overmorrow'))" class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-[10px] font-bold text-white flex items-center justify-between">Pozítří 🚀</button>
            <div class="h-px bg-white/5 my-1 mx-2"></div>
            <div class="px-2 pb-1">
                <input type="date" id="custom-schedule-date" 
                       class="w-full bg-black/40 text-[10px] text-white p-1 rounded-md border border-white/10 outline-none"
                       onchange="window.loadModule('matura').then(m => m.scheduleTopic('${itemId}', this.value))">
            </div>
        </div>
    `;

    document.getElementById('schedule-popover')?.remove();
    document.body.insertAdjacentHTML('beforeend', menuHtml);

    const closeMenu = (e) => {
        if (!e.target.closest('#schedule-popover')) {
            document.getElementById('schedule-popover')?.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

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
        dateStr = dateOption;
    }

    try {
        const newMission = {
            user_id: state.currentUser?.id,
            item_id: itemId,
            scheduled_date: dateStr
        };

        const { data, error } = await supabase.from('matura_schedule').insert(newMission).select();
        if (error) throw error;

        if (data && data[0]) {
            if (!state.maturaSchedule) state.maturaSchedule = [];
            state.maturaSchedule.push(data[0]);
            import('./dashboard.js').then(d => d.renderTodaysMissions?.()).catch(() => {});
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

        if (state.maturaSchedule) {
            state.maturaSchedule = state.maturaSchedule.filter(m => m.id !== missionId);
        }
        import('./dashboard.js').then(d => d.renderTodaysMissions?.()).catch(() => {});
        broadcastPomodoroUpdate({ type: 'schedule-sync' });

        showNotification("Mise zrušena 🗑️", "info");
        triggerHaptic('light');
    } catch (e) {
        console.error("Remove mission error:", e);
        showNotification("Nepodařilo se smazat misi.", "error");
    }
}

export function openNotes(itemId) {
    const prog = state.maturaProgress[itemId] || {};
    const user = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';
    const userProg = prog[user] || { notes: '' };
    const notes = userProg.notes || '';

    const modalHtml = `
        <div class="space-y-4">
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Moje soukromé poznámky a taháky</label>
            <textarea id="notes-textarea" 
                class="w-full h-48 bg-[#202225] text-white p-4 rounded-xl border border-white/5 outline-none focus:border-[#eb459e]/50 transition-all text-sm custom-scrollbar"
                placeholder="Sem si piš své klíčové body, citáty nebo cokoliv, co se ti hodí připomenout...">${notes}</textarea>
        </div>
    `;

    const actions = `
        <button onclick="window.loadModule('matura').then(m => m.saveNotes('${itemId}'))"
                class="bg-[#eb459e] hover:bg-[#d83c8d] text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-lg active:scale-95">
            Uložit poznámky
        </button>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'notes-modal',
        title: 'Poznámky k tématu',
        subtitle: 'Společný whiteboard ✍️',
        content: modalHtml,
        actions: actions,
        onClose: "document.getElementById('notes-modal')?.remove()"
    }));
    document.getElementById('notes-modal')?.classList.remove('hidden');
    document.getElementById('notes-modal')?.classList.add('flex');
    triggerHaptic('light');
}

export async function saveNotes(itemId) {
    const val = document.getElementById('notes-textarea')?.value;
    const prog = state.maturaProgress[itemId] || {
        jose: { status: 'none', notes: '' },
        klarka: { status: 'none', notes: '' }
    };
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';

    if (!prog[userKey]) prog[userKey] = { status: 'none', notes: '' };
    prog[userKey].notes = val;
    state.maturaProgress[itemId] = prog;

    try {
        await supabase.from('matura_topic_progress').upsert({
            item_id: itemId,
            user_id: state.currentUser?.id,
            status: prog[userKey].status,
            notes: val,
            updated_at: new Date().toISOString()
        });
        showNotification('Poznámky uloženy! ✅', 'success');
        triggerHaptic('success');
    } catch (e) {
        console.warn("[Matura] Supabase error, using local state.");
        showNotification('Uloženo lokálně! 📝', 'warning');
    }

    document.getElementById("notes-modal")?.remove();
}

export function triggerSOS() {
    broadcastMaturaSOS({
        sender: state.currentUser?.name,
        message: 'POTŘEBUJU POMOCT SE STUDIEM! 🆘💀',
        timestamp: Date.now()
    });
    showNotification('SOS odesláno! Partner je na cestě... 🏃💨', 'error');
    triggerHaptic('heavy');
}

export function playBellSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
}

export async function silentBackfillCount(itemId) {
    if (!itemId) return;

    try {
        const { data, error } = await supabase
            .from('matura_kb')
            .select('content, sections_count')
            .eq('item_id', itemId)
            .single();

        if (error || !data || !data.content) return;
        if (data.sections_count > 0) return;

        const count = data.content.split('\n').filter(l => l.trim().match(/^#{1,3}\s+.+$/)).length;
        if (count > 0) {
            await supabase.from('matura_kb').update({ sections_count: count }).eq('item_id', itemId);
            updateTopicCardUI(itemId);
        }
    } catch (e) { }
}
