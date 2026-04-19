/**
 * matura/actions.js
 * Akce a realtime logika pro Maturita modul.
 *
 * Exportuje:
 *  - cycleStatus(itemId)        – přepínání stavu tématu (none → started → done → none)
 *  - updateTopicCardUI(itemId)  – targeted update jedné karty bez re-renderu celého listu
 *  - triggerSOS()               – odeslání SOS signálu partnerovi
 */

import { state } from '../../core/state.js';
import { supabase } from '../../core/supabase.js';
import { showNotification } from '../../core/theme.js';
import { triggerHaptic, triggerConfetti } from '../../core/utils.js';
import { broadcastMaturaSOS } from '../../core/sync.js';

// --- CYCLE STATUS ---

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

    // Persist to Supabase
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
                showNotification(`Chyba při ukládání stavu: ${error.message} (Kód: ${error.code})`, 'error');
            }
        } catch (e) {
            console.warn('[Matura] Unexpected network error:', e);
            showNotification('Chyba sítě při ukládání stavu.', 'error');
        }
    }

    // Targeted update – nevykresluje celý list znovu
    updateTopicCardUI(itemId);
}

// --- UPDATE CARD UI ---

/**
 * Aktualizuje jedinou kartu tématu bez re-renderu celého listu.
 * @param {string} itemId
 */
export async function updateTopicCardUI(itemId) {
    const card = document.getElementById(`topic-card-${itemId}`);
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

    // Update Header icon/title/author
    const iconWrapper = card.querySelector('.group-hover\\:scale-110');
    if (iconWrapper) iconWrapper.textContent = item.icon;

    const catLabel = card.querySelector('.matura-cat-label');
    if (catLabel) catLabel.textContent = item.cat || 'Ostatní';

    const titleEl = card.querySelector('.matura-topic-title');
    if (titleEl) {
        titleEl.textContent = item.title;
        titleEl.title = item.title;
    }

    const authorDiv = card.querySelector('.matura-topic-author');
    if (authorDiv) {
        authorDiv.innerHTML = item.author ? `<p class="text-xs text-[var(--text-muted)] italic">${item.author}</p>` : '';
    }

    const jStatusIcon = joseProg.status === 'done' ? '✅' : (joseProg.status === 'started' ? '📖' : '⚪');
    const jStatusClass = joseProg.status === 'done' ? 'text-green-400' : (joseProg.status === 'started' ? 'text-blue-400' : 'text-gray-600');
    const kStatusIcon = klarkaProg.status === 'done' ? '✅' : (klarkaProg.status === 'started' ? '✍️' : '⚪');
    const kStatusClass = klarkaProg.status === 'done' ? 'text-[#eb459e]' : (klarkaProg.status === 'started' ? 'text-purple-400' : 'text-gray-600');

    // Update můj status button
    const myStatusBtn = card.querySelector('.matura-my-status-btn');
    if (myStatusBtn) {
        const iconEl = myStatusBtn.querySelector('.status-icon');
        const textEl = myStatusBtn.querySelector('.status-text');
        if (iconEl) iconEl.textContent = state.currentUser?.name === 'Jožka' ? jStatusIcon : kStatusIcon;
        if (textEl) {
            textEl.textContent = state.currentUser?.name === 'Jožka'
                ? (joseProg.status === 'done' ? 'Umím' : (joseProg.status === 'started' ? 'Dělám' : 'Nic'))
                : (klarkaProg.status === 'done' ? 'Umím' : (klarkaProg.status === 'started' ? 'Dělám' : 'Nic'));
            textEl.className = `text-[9px] font-bold uppercase ${state.currentUser?.name === 'Jožka' ? jStatusClass : kStatusClass} truncate status-text`;
        }
    }

    // Update partnerův status
    const partnerStatusDiv = card.querySelector('.matura-partner-status-pill');
    if (partnerStatusDiv) {
        const iconEl = partnerStatusDiv.querySelector('.status-icon');
        const textEl = partnerStatusDiv.querySelector('.status-text');
        if (iconEl) iconEl.textContent = state.currentUser?.name === 'Jožka' ? kStatusIcon : jStatusIcon;
        if (textEl) {
            textEl.textContent = state.currentUser?.name === 'Jožka'
                ? (klarkaProg.status === 'done' ? 'Umím' : (klarkaProg.status === 'started' ? 'Dělám' : 'Nic'))
                : (joseProg.status === 'done' ? 'Umím' : (joseProg.status === 'started' ? 'Dělám' : 'Nic'));
            textEl.className = `text-[9px] font-bold uppercase ${state.currentUser?.name === 'Jožka' ? kStatusClass : jStatusClass} truncate status-text`;
        }
    }

    // Async update progress bars
    const [sr, pr] = await Promise.all([
        import('../../modules/spaced_repetition.js'),
        import('../../modules/progress.js')
    ]);
    const mastery = await sr.getTopicMastery(itemId);
    const mTextEl = document.getElementById(`mastery-text-${itemId}`);
    const mBarEl = document.getElementById(`mastery-bar-${itemId}`);
    if (mTextEl && mBarEl) {
        mTextEl.textContent = `${mastery}%`;
        mBarEl.style.width = `${mastery}%`;
    }

    const stats = await pr.getTopicProgress(itemId);
    const rTextEl = document.getElementById(`read-text-${itemId}`);
    const rBarEl = document.getElementById(`read-bar-${itemId}`);
    if (rTextEl && rBarEl) {
        const { done, total } = stats;
        rTextEl.textContent = total > 0 ? `${done} / ${total} kapitol hotovo` : (done > 0 ? `${done} kapitol hotovo` : 'Zatím nečteno');
        rBarEl.style.width = `${total > 0 ? Math.round((done / total) * 100) : Math.min(100, done * 20)}%`;
    }

    // Pokud bylo právě přidáno content, přepneme tlačítko Write → Show
    if (item.has_content) {
        const actionBtn = card.querySelector('button[onclick*="openEditor"]');
        if (actionBtn) {
            actionBtn.setAttribute('onclick', `window.loadModule('matura').then(m => m.openKnowledgeBase('${itemId}'))`);
            actionBtn.className = 'flex-1 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] rounded-xl flex items-center justify-center gap-2 transition-all border border-[#5865F2]/30 group/btn shadow-lg';
            actionBtn.innerHTML = `<i class="fas fa-book-open text-xs group-hover/btn:scale-110 transition"></i><span class="text-[10px] font-black uppercase tracking-widest">Zobrazit</span>`;
        }
    }
}

// --- SOS ---

export function triggerSOS() {
    triggerHaptic('heavy');
    const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárce' : 'Jožkovi';
    showNotification(`SOS SIGNÁL VYSLÁN! 🚨 ${partnerName} právě přišlo upozornění.`, 'error');
    broadcastMaturaSOS();
    playBellSound();
}

// --- REAL-TIME LISTENERS ---

window.addEventListener('matura-sos-received', (e) => {
    const sender = e.detail.name;
    triggerHaptic('heavy');
    playBellSound();
    showNotification(`🚨 SOS OD: ${sender.toUpperCase()}! Potřebuje tvou pozornost/objetí/čokoládu!`, 'error');
});

// --- HELPERS ---

export function playBellSound() {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
        audio.volume = 0.5;
        audio.play();
    } catch (e) { console.warn('Bell sound failed', e); }
}
