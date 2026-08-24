import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { playArcade } from '@core/sound.js';
import { showNotification } from '@core/theme.js';
import { renderModal, renderInputGroup } from '@core/ui.js';
import { awardLoveCoinsToCurrentUser } from '@core/state.js';

export function openAddChallengeModal() {
    triggerHaptic('light');

    // Prepare scheduled date selection list (Days 1 to 92)
    const options = [];
    const dept = new Date('2026-05-31T00:00:00');
    const nowKey = new Date().toISOString().split("T")[0];

    for (let day = 1; day <= 92; day++) {
        const d = new Date(dept);
        d.setDate(dept.getDate() + day - 1);
        const dateKey = d.toISOString().split("T")[0];
        const dateNice = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
        const label = `Den ${day} (${dateNice})${dateKey === nowKey ? ' - DNES ⏳' : ''}`;
        options.push(`<option value="${dateKey}">${label}</option>`);
    }

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název vlastní výzvy',
                id: 'custom-chall-title',
                placeholder: 'např. Ochutnávka Mozartových koulí'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Popis výzvy (co musíte splnit)</label>
                <textarea id="custom-chall-desc" placeholder="např. Kupte v obchodě 3 různé značky Mozartových koulí a udělejte si slepý test chuti..." 
                          class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#3ba55c]/50 transition-all min-h-[80px]"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                    <select id="custom-chall-category" 
                            class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#3ba55c]/30 focus:bg-[#202225] transition-all">
                        <option value="Zábava 🎭">Zábava 🎭</option>
                        <option value="Vaření 🥨">Vaření 🥨</option>
                        <option value="Romantické 💖" selected>Romantické 💖</option>
                        <option value="Vtipné 🦝">Vtipné 🦝</option>
                        <option value="Němčina 🥨">Němčina 🥨</option>
                        <option value="Průzkum 🏔️">Průzkum 🏔️</option>
                    </select>
                </div>

                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Naplánovat na den pobytu</label>
                    <select id="custom-chall-date" 
                            class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#3ba55c]/30 focus:bg-[#202225] transition-all">
                        ${options.join('')}
                    </select>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('add-custom-chall-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button onclick="window.AlpskaVyzva.saveCustomChallenge()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-[#3ba55c]/20">
                Uložit výzvu ✍️
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'add-custom-chall-modal',
        title: 'Naplánovat vlastní výzvu',
        subtitle: 'Vytvořte si vlastní dobrodružství na míru 🏔️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('add-custom-chall-modal').remove()"
    }));

    document.getElementById('add-custom-chall-modal').classList.remove('hidden');
    document.getElementById('add-custom-chall-modal').classList.add('flex');
}

export async function saveCustomChallenge() {
    triggerHaptic('medium');

    const title = document.getElementById('custom-chall-title').value.trim();
    const description = document.getElementById('custom-chall-desc').value.trim();
    const category = document.getElementById('custom-chall-category').value;
    const dateKey = document.getElementById('custom-chall-date').value;

    if (!title || !description) {
        showNotification('Prosím vyplňte název a popis výzvy!', 'warning');
        return;
    }

    try {
        // Fetch existing completion states if present to avoid erasing
        const { data: existing } = await supabase
            .from('brigade_challenges')
            .select('*')
            .eq('date_key', dateKey)
            .maybeSingle();

        const payload = {
            date_key: dateKey,
            title,
            description,
            category,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            payload.id = existing.id;
        }

        const { error } = await supabase
            .from('brigade_challenges')
            .upsert(payload, { onConflict: 'date_key' });

        if (error) throw error;

        showNotification('Vlastní výzva byla úspěšně naplánována! ✍️🏔️', 'success');
        document.getElementById('add-custom-chall-modal')?.remove();

        await ensureChallengesData(true);
        renderAlpskaVyzva();
    } catch (err) {
        console.error('Chyba při ukládání vlastní výzvy:', err);
        showNotification('Nepodařilo se uložit vlastní výzvu.', 'danger');
    }
}

// Complete modal
export function openCompleteChallengeModal(dateKey) {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Tvůj komentář k plnění',
                id: 'chall-note',
                placeholder: 'např. Kráva mě málem snědla, ale fotku mám! 😂'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nahrát fotku důkazu (nepovinné)</label>
                <div class="flex items-center gap-3">
                    <button onclick="document.getElementById('chall-photo').click()" 
                            class="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition flex items-center gap-2">
                        <i class="fas fa-camera text-[#3ba55c]"></i> Vybrat fotku
                    </button>
                    <span id="chall-filename" class="text-xs text-gray-500 italic">Nebyl vybrán žádný soubor</span>
                    <input type="file" id="chall-photo" class="hidden" accept="image/*" 
                           onchange="document.getElementById('chall-filename').textContent = this.files[0] ? this.files[0].name : 'Nebyl vybrán žádný soubor'">
                </div>
            </div>

            <div class="flex items-center gap-2.5 bg-black/20 p-3.5 rounded-xl border border-white/5 select-none">
                <input type="checkbox" id="chall-to-timeline" checked 
                       class="w-4 h-4 rounded border-gray-700 bg-gray-800 text-[#3ba55c] focus:ring-[#3ba55c]/20">
                <div class="flex-1">
                    <label for="chall-to-timeline" class="block text-xs font-bold text-white cursor-pointer">Přidat fotku i do naší společné Timeline 📸</label>
                    <span class="block text-[9px] text-gray-500 leading-tight">Uchovejte si tuto vzpomínku navždycky v hlavní galerii vzpomínek!</span>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('complete-chall-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button id="chall-save-btn" onclick="window.AlpskaVyzva.saveChallengeCompletion('${dateKey}')" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20">
                Odeslat splnění 🎉
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'complete-chall-modal',
        title: 'Splnit výzvu!',
        subtitle: 'Zaznamenej své zážitky z této alpské mise ⛰️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('complete-chall-modal').remove()"
    }));

    document.getElementById('complete-chall-modal').classList.remove('hidden');
    document.getElementById('complete-chall-modal').classList.add('flex');
}

export async function saveChallengeCompletion(dateKey) {
    const btn = document.getElementById('chall-save-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Odesílám...';
    }

    triggerHaptic('medium');

    const note = document.getElementById('chall-note').value.trim();
    const photoInput = document.getElementById('chall-photo');
    const toTimeline = document.getElementById('chall-to-timeline').checked;

    // Find challenge details
    const departureDate = new Date('2026-05-31T00:00:00');
    const targetDate = new Date(dateKey);
    const diffMs = targetDate - departureDate;
    const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let title = "🎒 Alpská výzva";
    let desc = "";
    let category = "Plánovaná";

    // Try finding custom or static challenge
    const dbRecord = state.brigadeChallenges?.find(c => c.date_key === dateKey) || {};
    if (dbRecord.title) {
        title = dbRecord.title;
        desc = dbRecord.description;
        category = dbRecord.category;
    } else if (dayIndex >= 0) {
        const idx = dayIndex % CHALLENGES_POOL.length;
        const current = CHALLENGES_POOL[idx];
        title = current.title;
        desc = current.description;
        category = current.category;
    }

    try {
        let imageUrl = null;
        if (photoInput.files && photoInput.files.length > 0) {
            const file = photoInput.files[0];
            showNotification('Nahrávám fotografii důkazu... 📸', 'info');
            imageUrl = await uploadFile('media', file, `challenges/${dateKey}/${state.currentUser.id}`);
            if (!imageUrl) throw new Error("Upload se nezdařil.");
        }

        const myId = state.currentUser?.id;
        const isJose = myId === state.user_ids?.jose;

        // Fetch existing challenge record for today
        const { data: existing } = await supabase
            .from('brigade_challenges')
            .select('*')
            .eq('date_key', dateKey)
            .maybeSingle();

        let payload = {};

        if (existing) {
            payload = {
                id: existing.id,
                completed_by_jose: isJose ? true : existing.completed_by_jose,
                completed_by_klarka: !isJose ? true : existing.completed_by_klarka,
                jose_note: isJose ? (note || 'Splněno!') : existing.jose_note,
                klarka_note: !isJose ? (note || 'Splněno!') : existing.klarka_note,
                jose_image_url: (isJose && imageUrl) ? imageUrl : existing.jose_image_url,
                klarka_image_url: (!isJose && imageUrl) ? imageUrl : existing.klarka_image_url,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('brigade_challenges')
                .update(payload)
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            payload = {
                date_key: dateKey,
                title,
                description: desc,
                category,
                completed_by_jose: isJose,
                completed_by_klarka: !isJose,
                jose_note: isJose ? (note || 'Splněno!') : null,
                klarka_note: !isJose ? (note || 'Splněno!') : null,
                jose_image_url: isJose ? imageUrl : null,
                klarka_image_url: !isJose ? imageUrl : null,
                completed_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('brigade_challenges')
                .insert(payload);

            if (error) throw error;
        }

        // PUSH TO TIMELINE IF CHECKED & PHOTO UPLOADED
        if (toTimeline && imageUrl) {
            showNotification('Propojuji s naší Timeline... 🔗', 'info');
            const { error: timelineErr } = await supabase
                .from('timeline_events')
                .insert({
                    title: `Alpská Výzva: ${title}`,
                    event_date: dateKey,
                    icon: "🏔️",
                    color: "#3ba55c",
                    description: `${state.currentUser.name} splnil/a alpskou výzvu dne: "${desc}". \nKomentář: ${note || 'Bez komentáře.'} \n#rakousko2026`,
                    images: [imageUrl]
                });

            if (timelineErr) {
                console.error("Timeline insertion failed:", timelineErr);
                showNotification('Výzva uložena, ale propojení s Timeline se nezdařilo.', 'warning');
            } else {
                showNotification('Vzpomínka úspěšně uložena do Timeline! 📸', 'success');
            }
        }

        triggerConfetti();
        showNotification('Výzva byla zaznamenána! Skvělá práce! 🏆', 'success');
        document.getElementById('complete-chall-modal')?.remove();
        document.getElementById('challenge-detail-modal')?.remove();

        await ensureChallengesData(true);
        renderAlpskaVyzva();

    } catch (err) {
        console.error('Chyba při plnění výzvy:', err);
        showNotification('Nepodařilo se zaznamenat splnění výzvy.', 'danger');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Zkusit znovu 🔁';
        }
    }
}

// Challenge Detail Modal (from "All challenges" list)
export function viewChallengeDetail(dateKey, dayNum, isPastOrToday) {
    triggerHaptic('light');

    // Find database completion record
    const dbRecord = state.brigadeChallenges?.find(c => c.date_key === dateKey) || {};
    const completedByJose = dbRecord.completed_by_jose || false;
    const completedByKlarka = dbRecord.completed_by_klarka || false;

    let challenge = null;

    if (dbRecord.title && dbRecord.description) {
        challenge = {
            title: dbRecord.title,
            description: dbRecord.description,
            category: dbRecord.category || "Plánovaná ✍️"
        };
    } else {
        const idx = (dayNum - 1) % CHALLENGES_POOL.length;
        challenge = CHALLENGES_POOL[idx];
    }

    const myId = state.currentUser?.id;
    const isMeJose = myId === state.user_ids?.jose;
    const amICompleted = isMeJose ? completedByJose : completedByKlarka;

    const joseStatusText = completedByJose 
        ? `<span class="text-xs font-bold text-emerald-400">Splnil ✅ ${dbRecord.jose_note ? `<br><span class="text-[10px] text-gray-400">"${dbRecord.jose_note}"</span>` : ''}</span>`
        : `<span class="text-xs text-gray-500">Nesplnil ⏳</span>`;

    const klarkaStatusText = completedByKlarka
        ? `<span class="text-xs font-bold text-emerald-400">Splnila ✅ ${dbRecord.klarka_note ? `<br><span class="text-[10px] text-gray-400">"${dbRecord.klarka_note}"</span>` : ''}</span>`
        : `<span class="text-xs text-gray-500">Nesplnila ⏳</span>`;

    const contentHtml = `
        <div class="space-y-5 text-left">
            <div class="bg-black/20 p-5 rounded-2xl border border-white/5 text-center">
                <span class="text-[9px] font-black uppercase tracking-widest text-[#3ba55c] bg-[#3ba55c]/10 px-3 py-1 rounded-full w-fit mx-auto mb-3 block">
                    ${challenge.category}
                </span>
                <h3 class="text-white text-lg font-black italic">"${challenge.title}"</h3>
                <p class="text-gray-400 text-xs mt-2 leading-relaxed font-medium">${challenge.description}</p>
            </div>

            <!-- Photos Gallery inside modal -->
            ${(dbRecord.jose_image_url || dbRecord.klarka_image_url) ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    ${dbRecord.jose_image_url ? `
                        <div class="bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <img src="${dbRecord.jose_image_url}" loading="lazy" class="w-full h-32 object-cover rounded-lg">
                            <span class="text-[8px] font-black text-blue-300 uppercase tracking-widest mt-1.5 block">🔵 Jožka</span>
                        </div>
                    ` : ''}
                    ${dbRecord.klarka_image_url ? `
                        <div class="bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <img src="${dbRecord.klarka_image_url}" loading="lazy" class="w-full h-32 object-cover rounded-lg">
                            <span class="text-[8px] font-black text-pink-300 uppercase tracking-widest mt-1.5 block">🔴 Klárka</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Completion states -->
            <div class="space-y-3 bg-black/15 p-4 rounded-xl border border-white/5">
                <h4 class="text-[9px] font-black text-white/40 uppercase tracking-widest">Stav plnění</h4>
                <div class="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span class="text-xs font-bold text-gray-400">🔵 Jožka</span>
                    <span>${joseStatusText}</span>
                </div>
                <div class="flex justify-between items-center py-1.5">
                    <span class="text-xs font-bold text-gray-400">🔴 Klárka</span>
                    <span>${klarkaStatusText}</span>
                </div>
            </div>
        </div>
    `;

    // Action buttons inside detail modal
    let actionsHtml = `<button onclick="document.getElementById('challenge-detail-modal').remove()" 
                               class="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">Zavřít</button>`;

    if (isPastOrToday && !amICompleted) {
        actionsHtml = `
            <div class="flex gap-2 w-full">
                <button onclick="document.getElementById('challenge-detail-modal').remove()" 
                        class="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                    Zavřít
                </button>
                <button onclick="window.AlpskaVyzva.openCompleteChallengeModal('${dateKey}')" 
                        class="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#3ba55c] to-emerald-500 hover:from-[#49c26c] hover:to-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                    Splnit výzvu! 🎉
                </button>
            </div>
        `;
    }

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'challenge-detail-modal',
        title: `Výzva ze dne ${dayNum}`,
        subtitle: `Detail úkolu a důkazů 📸`,
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('challenge-detail-modal').remove()"
    }));

    document.getElementById('challenge-detail-modal').classList.remove('hidden');
    document.getElementById('challenge-detail-modal').classList.add('flex');
}
