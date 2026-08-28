import { supabase } from './supabase.js';
import { state } from './state.js';
import { getTodayKey } from './utils.js';

let mainChannel = null;
// Cache partner ID aby se nemusel hledat při každém push volání
let cachedPartnerId = null;

/**
 * Vrátí Supabase user ID partnera (toho kdo není přihlášený).
 */
async function getPartnerId() {
    if (cachedPartnerId) return cachedPartnerId;

    const myId = state.currentUser?.id;
    if (!myId) return null;

    // 1. Primární zdroj: state.user_ids (naplňuje se po revalidaci)
    const { jose, klarka } = state.user_ids || {};
    if (jose && klarka) {
        cachedPartnerId = (myId === jose) ? klarka : jose;
        console.log('[Push] Partner ID from state.user_ids:', cachedPartnerId);
        return cachedPartnerId;
    }

    // 2. Fallback: profiles tabulka — vrací všechny uživatele, veřejně čitelná
    try {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, username');

        if (profiles && profiles.length > 0) {
            // Najdi profil který není můj
            const partnerProfile = profiles.find(p => p.id !== myId);
            if (partnerProfile) {
                cachedPartnerId = partnerProfile.id;
                console.log('[Push] Partner ID from profiles:', cachedPartnerId);
                return cachedPartnerId;
            }
        }
    } catch (e) {
        console.warn('[Push] Could not fetch partner ID from profiles:', e);
    }

    console.warn('[Push] Could not determine partner ID.');
    return null;
}


/**
 * Initializes all real-time subscriptions for the application.
 * This is called once after the user is signed in.
 */
export function setupRealtimeSync() {
    window.supabase = supabase;
    if (mainChannel) return;

    const todayKey = getTodayKey();

    // 1. Create a single channel for all broadcast and database changes
    mainChannel = supabase.channel('kiscord-sync-system')
        // A. Handle Broadcasts (e.g., Sunlight)
        .on('broadcast', { event: 'send-sunlight' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            
            // Dispatch global event for UI effects
            window.dispatchEvent(new CustomEvent('sunlight-received', { 
                detail: { from: payload.payload.from } 
            }));
        })
        // A2. Handle Broadcasts (Health Sync - Bypasses RLS issues)
        .on('broadcast', { event: 'health-update' }, (payload) => {
            const row = payload.payload.data;
            if (!row || row.date_key !== todayKey) return;
            if (payload.payload.from === state.currentUser?.id) return;

            // Update partner state (DO NOT update state.healthData - that is for the local user)
            const oldMood = state.partnerHealthData?.mood;
            state.partnerHealthData = row;

            // --- MOOD SUPPORT NOTIFICATION ---
            if (row.mood > 0 && row.mood <= 3 && row.mood !== oldMood) {
                const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
                const msg = `${partnerName} se dneska necítí úplně nejlíp... 🥺 Pošli mu/jí sluníčko!`;
                
                import('./notifications.js').then(m => {
                    m.handlePartnerAction('mood', msg);
                });
            }

            // Notify UI modules
            window.dispatchEvent(new CustomEvent('health-updated', { 
                detail: { source: 'realtime', data: row } 
            }));
        })
        // A3. Handle Broadcasts (Game Vote Cast - Instant feedback)
        .on('broadcast', { event: 'game-vote-cast' }, (payload) => {
            if (payload.payload.user_id === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('game-vote-updated', { detail: { payload: payload.payload } }));
        })
        // A4. Handle Broadcasts (Matura SOS)
        .on('broadcast', { event: 'matura-sos' }, (payload) => {
            if (payload.payload.user_id === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('matura-sos-received', { detail: payload.payload }));
        })
        // A5. Handle Broadcasts (Pomodoro Update)
        .on('broadcast', { event: 'pomodoro-update' }, (payload) => {
            if (payload.payload.user_id === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('pomodoro-updated', { detail: payload.payload }));
        })
        // A6. Handle Broadcasts (Plan Updates)
        .on('broadcast', { event: 'plan-update' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            
            // Check if user has planning notifications enabled
            const config = state.settings.notifications?.partner?.planning;
            if (config && !config.enabled) return;

            const { type, name, status } = payload.payload;
            let msg = "";
            
            if (type === 'proposal') {
                msg = `Nová pozvánka: ${name}! ❤️`;
            } else if (type === 'response') {
                msg = status === 'confirmed' ? "Plán byl potvrzen! 🥂" : "Plán byl zrušen. 🥀";
            }
            
            if (msg && typeof window.showNotification === 'function') {
                window.showNotification(msg, "info");
                if (config?.haptic && typeof triggerHaptic === 'function') triggerHaptic('medium');
            }
        })
        // A7. Handle Broadcasts (Sleep Status)
        .on('broadcast', { event: 'sleep-status' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            
            if (payload.payload.isSleeping) {
                const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
                const msg = `${partnerName} právě zalehl/a do postýlky. Sladké sny! 🌙💤`;
                
                import('./notifications.js').then(m => {
                    m.handlePartnerAction('sleep', msg);
                });
            }
        })
        // A8. Handle Broadcasts (Tinder Match)
        .on('broadcast', { event: 'tinder-match' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            
            window.dispatchEvent(new CustomEvent('tinder-match-received', { 
                detail: payload.payload 
            }));
            
            if (state.currentChannel !== 'watchlist' && typeof window.showNotification === 'function') {
                const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
                const msg = `Máme shodu! ${partnerName} a ty se shodujete na filmu "${payload.payload.media?.title || 'filmu'}"! 🍿💖`;
                window.showNotification(msg, 'success');
            }
        })
        // A9. Handle Broadcasts (Haptic Touch Pulse)
        .on('broadcast', { event: 'haptic-pulse' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('haptic-pulse-received', { 
                detail: payload.payload 
            }));
        })
        // A10. Handle Broadcasts (Ambient Activity Status)
        .on('broadcast', { event: 'ambient-activity' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('ambient-activity-received', { 
                detail: payload.payload 
            }));
        })
        // A11. Handle Broadcasts (Thumbkiss Live Touch Coordinates)
        .on('broadcast', { event: 'touch-pos' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('touch-pos-received', { 
                detail: payload.payload 
            }));
        })
        // A12. Handle Broadcasts (Gym Cheering Energy)
        .on('broadcast', { event: 'gym-cheer' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('gym-cheer-received', { 
                detail: payload.payload 
            }));
        })
        // A13. Handle Broadcasts (Gym Shared Rest Timer Sync)
        .on('broadcast', { event: 'gym-rest-sync' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('gym-rest-sync-received', { 
                detail: payload.payload 
            }));
        })
        // A14. Handle Broadcasts (Study Focus & Pomodoro Sync)
        .on('broadcast', { event: 'study-focus' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('study-focus-received', { 
                detail: payload.payload 
            }));
        })
        // A15. Handle Broadcasts (Cycle Update)
        .on('broadcast', { event: 'cycle-update' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            state.partnerCycleData = payload.payload.data;
            window.dispatchEvent(new CustomEvent('cycle-updated', { 
                detail: payload.payload 
            }));
        })
        // A16. Handle Broadcasts (Step & Activity Update)
        .on('broadcast', { event: 'step-update' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            window.dispatchEvent(new CustomEvent('steps-updated', { 
                detail: payload.payload 
            }));
        })


        // B. Handle Database Changes (Health Data)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'health_data' 
        }, (payload) => {
            const row = payload.new || payload.old;
            if (!row || row.date_key !== todayKey) return;

            // Route update based on user_id
            if (row.user_id === state.currentUser?.id) {
                // Update local state (My data)
                    state.healthData[row.date_key] = {
                        water: row.water,
                        sleep: row.sleep || 0,
                        mood: row.mood,
                        movement: row.movement || [],
                        bedtime: row.bedtime,
                        pills: row.pills || false,
                        supplements: row.supplements || { iron: false, zinc: false, magnesium: false }
                    };
            } else {
                // Update partner state (Their data)
                state.partnerHealthData = row;
            }

            // Notify UI modules
            window.dispatchEvent(new CustomEvent('health-updated', { 
                detail: { source: 'realtime', data: row } 
            }));
        })
        // C. Handle Database Changes (Quests & Bucket List)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'coop_quests'
        }, () => {
             window.dispatchEvent(new CustomEvent('quests-updated'));
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bucket_list'
        }, () => {
             window.dispatchEvent(new CustomEvent('quests-updated'));
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'planned_dates'
        }, (payload) => {
             const row = payload.new || payload.old;
             if (row) {
                 if (payload.eventType === 'DELETE') {
                     delete state.plannedDates[row.date_key];
                 } else {
                     state.plannedDates[row.date_key] = {
                         id: row.id,
                         name: row.name,
                         cat: row.cat,
                         time: row.time,
                         note: row.note,
                         status: row.status || 'idea',
                         proposed_by: row.proposed_by,
                         rejection_reason: row.rejection_reason || '',
                         backup_plan: row.backup_plan || '',
                         checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist) : (row.checklist || [])
                     };
                 }
             }
             window.dispatchEvent(new CustomEvent('planned-dates-updated', { detail: { payload } }));
        })
        // E. Handle Database Changes (Game Votes)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'game_votes'
        }, (payload) => {
             window.dispatchEvent(new CustomEvent('game-vote-updated', { 
                 detail: { source: 'database', payload: payload.new } 
             }));
        })
        // F. Handle Database Changes (Timeline)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'timeline_events'
        }, () => {
             // We don't update state directly to keep it simple, just notify UI to re-fetch
             window.dispatchEvent(new CustomEvent('timeline-updated'));
        })
        // G. Handle Database Changes (Library)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'library_content'
        }, () => {
             window.dispatchEvent(new CustomEvent('library-updated'));
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'library_ratings'
        }, () => {
             window.dispatchEvent(new CustomEvent('library-updated'));
        })
        // H. Handle Database Changes (Matura Pomodoro)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'matura_pomodoro'
        }, (payload) => {
             window.dispatchEvent(new CustomEvent('pomodoro-updated', { detail: { source: 'database', payload: payload.new || payload.old } }));
        })
        // I. Handle Database Changes (Love Letters)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'love_letters'
        }, (payload) => {
             if (payload.new && payload.new.sender_id !== state.currentUser?.id) {
                 window.dispatchEvent(new CustomEvent('letter-received', { detail: payload.new }));

                 // Web Push — funguje i při zavřené appce
                 sendPushToPartner(
                     '💌 Nový dopis pro tebe!',
                     `Dostal/a jsi nový dopis: "${payload.new.title || 'Bez názvu'}"`,
                     'letter'
                 );
             }
        })
        // J. Handle Database Changes (Brigade Shifts)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'brigade_shifts'
        }, (payload) => {
             window.dispatchEvent(new CustomEvent('shifts-updated', { detail: payload }));
        })
        // K. Handle Database Changes (Austrian German Vocabulary)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'austrian_vocab'
        }, (payload) => {
             window.dispatchEvent(new CustomEvent('vocab-updated', { detail: payload }));
        })
        // L. Handle Database Changes (Profiles for Love Coins Sync)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
        }, (payload) => {
             const row = payload.new;
             if (!row) return;
             
             const coins = row.love_coins || 0;
             if (row.id === state.user_ids.jose) {
                 state.loveCoins.jose = coins;
             } else if (row.id === state.user_ids.klarka) {
                 state.loveCoins.klarka = coins;
             }
             
             window.dispatchEvent(new CustomEvent('love-shop-updated'));
             if (typeof window.renderLevelUI === 'function') window.renderLevelUI();
        })
        // M. Handle Database Changes (User Coupons / Inventory Sync)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'user_coupons'
        }, (payload) => {
             if (state.currentUser?.id) {
                 supabase
                     .from('user_coupons')
                     .select('*, love_shop_items(*)')
                     .eq('owner_id', state.currentUser.id)
                     .order('is_redeemed', { ascending: true })
                     .order('has_star', { ascending: false })
                     .order('created_at', { ascending: false })
                     .then(({ data }) => {
                          if (data) {
                              if (payload.eventType === 'INSERT' && payload.new && payload.new.owner_id === state.currentUser?.id) {
                                  import('./utils.js').then(m => {
                                      m.triggerConfetti?.();
                                      m.triggerHaptic?.('success');
                                  });
                                  if (typeof window.showNotification === 'function') {
                                      const partnerName = state.currentUser?.name === 'Jožka' ? 'Klárka' : 'Jožka';
                                      window.showNotification(`🎁 Dostal/a jsi nový kupón od ${partnerName}!`, 'success');
                                  }
                              }
                              state.inventory = data;
                              window.dispatchEvent(new CustomEvent('love-shop-updated'));
                          }
                     });
             }
        })
        .subscribe((status) => {
            console.log(`[Sync] Realtime status: ${status}`);
        });
}

/**
 * Broadcasts a health update to the other user.
 * This is used to bypass RLS restrictions for Real-time events.
 */
export async function broadcastHealthUpdate(data) {
    if (!mainChannel) return;

    await mainChannel.send({
        type: 'broadcast',
        event: 'health-update',
        payload: { 
            from: state.currentUser?.id,
            data: data
        }
    });
}

/**
 * Sends a Web Push notification to the partner via Edge Function.
 * Works even when the partner has the app closed.
 */
async function sendPushToPartner(title, body, tag = 'kiscord-push') {
    const partnerId = await getPartnerId();

    if (!partnerId) {
        console.warn('[Push] Partner ID not found — partner may not have push subscriptions yet.');
        return;
    }

    try {
        const { error } = await supabase.functions.invoke('send-push', {
            body: { userId: partnerId, title, body, tag },
        });
        if (error) console.error('[Push] Edge Function error:', error);
        else console.log(`[Push] 📨 Push sent to partner (${partnerId})`);
    } catch (err) {
        console.error('[Push] Failed to call send-push:', err);
    }
}


/**
 * Sends a sunlight broadcast to the other user.
 */
export async function broadcastSunlight() {
    if (!mainChannel) return;

    await mainChannel.send({
        type: 'broadcast',
        event: 'send-sunlight',
        payload: { from: state.currentUser?.id }
    });

    // Web Push — funguje i při zavřené appce
    sendPushToPartner(
        'Sluňíčko pro tebe! ☀️',
        `${state.currentUser?.name || 'Partner'} ti poslal/a sluňíčkový paprsek!`,
        'sunlight'
    );
}

/**
 * Broadcasts a game vote cast to the other user for instant feedback.
 */
export async function broadcastGameVote(payload) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'game-vote-cast',
        payload: { ...payload, user_id: state.currentUser?.id }
    });
}

/**
 * Broadcasts a sleep status update (started/stopped) to the partner.
 */
export async function broadcastSleepStatus(isSleeping) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'sleep-status',
        payload: { from: state.currentUser?.id, isSleeping }
    });
}

/**
 * Sends a Matura SOS signal to the other user.
 */
export async function broadcastMaturaSOS() {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'matura-sos',
        payload: { user_id: state.currentUser?.id, name: state.currentUser?.name }
    });

    // Web Push — funguje i při zavřené appce
    sendPushToPartner(
        '🚨 Matura SOS!',
        `${state.currentUser?.name || 'Partner'} potřebuje pomoc s maturitou!`,
        'matura-sos'
    );
}

/**
 * Broadcasts a Pomodoro timer update.
 */
export async function broadcastPomodoroUpdate(payload) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'pomodoro-update',
        payload: { ...payload, user_id: state.currentUser?.id }
    });
}

/**
 * Broadcasts a planning update (new plan, confirm, reject) to the partner for instant toast notifications.
 */
export async function broadcastPlanUpdate(payload) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'plan-update',
        payload: { ...payload, from: state.currentUser?.id }
    });
}

/**
 * Broadcasts a Tinder Match to the partner.
 */
export async function broadcastTinderMatch(media) {
    if (!mainChannel) return;
    await mainChannel.send({
        type: 'broadcast',
        event: 'tinder-match',
        payload: { 
            from: state.currentUser?.id,
            media: media
        }
    });
}

/**
 * Sends notification and broadcast when a coupon is gifted to the partner.
 */
export async function notifyPartnerCouponGifted(couponTitle, note = '') {
    if (mainChannel) {
        await mainChannel.send({
            type: 'broadcast',
            event: 'coupon-gifted',
            payload: {
                from: state.currentUser?.id,
                title: couponTitle,
                note: note
            }
        });
    }

    const senderName = state.currentUser?.name || 'Partner';
    const bodyText = note 
        ? `${senderName} ti daroval/a: "${couponTitle}" 🎁\nVzkaz: "${note}"`
        : `${senderName} ti daroval/a nový kupón: "${couponTitle}" 🎁`;

    sendPushToPartner(
        'Nový kupón ve Spížce! 🎁',
        bodyText,
        'coupon-gifted'
    );
}

/**
 * Sends notification and broadcast when a coupon is redeemed by the user.
 */
export async function notifyPartnerCouponRedeemed(couponTitle) {
    if (mainChannel) {
        await mainChannel.send({
            type: 'broadcast',
            event: 'coupon-redeemed',
            payload: {
                from: state.currentUser?.id,
                title: couponTitle
            }
        });
    }

    const redeemerName = state.currentUser?.name || 'Partner';
    sendPushToPartner(
        'Kupón uplatněn! 🔔',
        `${redeemerName} právě uplatnil/a kupón: "${couponTitle}"! ✨`,
        'coupon-redeemed'
    );
}

/**
 * Broadcasts a haptic touch pulse pattern to the partner in real-time.
 */
export async function broadcastHapticPulse(pulseData) {
    if (!mainChannel || mainChannel.state !== 'joined') return;
    try {
        await mainChannel.send({
            type: 'broadcast',
            event: 'haptic-pulse',
            payload: {
                from: state.currentUser?.id,
                senderName: state.currentUser?.name,
                timestamp: Date.now(),
                ...pulseData
            }
        });
    } catch (e) {}
}

/**
 * Broadcasts ambient activity status (active channel, state, battery) to the partner.
 */
export async function broadcastAmbientActivity(activityData) {
    if (!mainChannel || mainChannel.state !== 'joined') return;
    const payload = typeof activityData === 'string' 
        ? { channel: activityData, activity: getActivityLabelForChannel(activityData) }
        : activityData;

    try {
        await mainChannel.send({
            type: 'broadcast',
            event: 'ambient-activity',
            payload: {
                from: state.currentUser?.id,
                senderName: state.currentUser?.name,
                timestamp: Date.now(),
                ...payload
            }
        });
    } catch (e) {}
}

export function getActivityLabelForChannel(channelId) {
    const map = {
        'dashboard': 'Prohlíží Můj Den ☀️',
        'calendar': 'Plánuje v Kalendáři 📅',
        'gym-tracker': 'Cvičí v Posilovně 🏋️‍♂️',
        'nutrition': 'Zapisuje jídelníček 🥗',
        'body-metrics': 'Sleduje tělesné míry ⚖️',
        'schedule': 'Sleduje rozvrh FIT 📚',
        'study-planner': 'Učí se na zkoušky 🎯',
        'dorm-hub': 'Kolejní hub & prádelník 🏢',
        'library': 'Vybírá filmy & hry 🍿',
        'watchlist': 'Swipuje na Watchlistu 🎬',
        'love-shop': 'Vybírá v Obchůdku 🎁',
        'dotek': 'Přenáší tlukot srdce 🫀',
        'dateplanner': 'Plánuje rande 🥂',
        'bucketlist': 'Prohlíží Bucket List ✨',
        'timeline': 'Prohlíží vzpomínky 🎞️',
        'games-hub': 'Hraje v Herním Doupěti 🕹️',
        'settings': 'Upravuje Nastavení ⚙️'
    };
    return map[channelId] || `Aktivní v #${channelId}`;
}

/**
 * Renderuje interaktivní Live Rich Presence Hub v pravém panelu
 */
export function renderRichPresenceHub() {
    const container = document.getElementById('rich-presence-members-container');
    if (!container) return;

    const isMeJose = state.currentUser?.name === 'Jožka' || state.currentUser?.id === state.user_ids?.jose;
    const partnerName = isMeJose ? 'Klárka' : 'Jožka';
    const myName = isMeJose ? 'Jožka' : 'Klárka';
    const partnerAvatar = isMeJose ? "🦉" : "🦝";
    const myAvatar = isMeJose ? "🦝" : "🦉";
    const partnerColor = isMeJose ? "#eb459e" : "#5865F2";
    const myColor = isMeJose ? "#5865F2" : "#eb459e";

    const partnerActivity = state.partnerPresenceActivity || 'Online na Kiscordu';
    const partnerMood = state.partnerHealthData?.mood;
    const moodEmoji = partnerMood >= 4 ? '☀️' : (partnerMood >= 2 ? '⛅' : (partnerMood ? '🌧️' : '✨'));

    container.innerHTML = `
        <!-- Local User Card -->
        <div class="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)]/40 border border-[var(--border-subtle)] group">
            <div class="relative flex-shrink-0">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2" style="border-color: ${myColor}; background: ${myColor}20;">
                    ${myAvatar}
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--green)] rounded-full border-2 border-[var(--bg-secondary)]"></div>
            </div>
            <div class="min-w-0 flex-1">
                <div class="font-bold text-[var(--text-header)] text-xs truncate flex items-center gap-1.5">
                    <span>${myName}</span>
                    <span class="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-white/10 text-[var(--text-muted)]">Ty</span>
                </div>
                <div class="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                    <span class="text-[var(--green)]">●</span> <span>${getActivityLabelForChannel(state.currentChannel || 'dashboard')}</span>
                </div>
            </div>
        </div>

        <!-- Partner Live Rich Presence Card -->
        <div class="p-2.5 rounded-xl bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-tertiary)] border border-[var(--border-default)] shadow-sm space-y-2 group hover:border-[var(--border-strong)] transition-all">
            <div class="flex items-center gap-2.5">
                <div class="relative flex-shrink-0">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 shadow-sm" style="border-color: ${partnerColor}; background: ${partnerColor}20;">
                        ${partnerAvatar}
                    </div>
                    <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--green)] rounded-full border-2 border-[var(--bg-secondary)] animate-pulse"></div>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="font-bold text-[var(--text-header)] text-xs truncate flex items-center justify-between">
                        <span>${partnerName}</span>
                        <span class="text-[11px]" title="Dnešní nálada">${moodEmoji}</span>
                    </div>
                    <div id="partner-presence-status" class="text-[10px] text-[var(--blurple)] font-medium truncate flex items-center gap-1">
                        <i class="fas fa-sparkles text-[8px]"></i>
                        <span>${partnerActivity}</span>
                    </div>
                </div>
            </div>

            <!-- Partner Live Focus / DND Indicator (if studying) -->
            ${state.partnerStudyFocus?.status === 'focus' ? `
                <div class="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-[10px] text-emerald-300 font-bold animate-pulse">
                    <span class="truncate flex items-center gap-1">
                        <i class="fas fa-bell-slash text-[9px]"></i> <span>Fokus: ${state.partnerStudyFocus.taskName || 'Studium'}</span>
                    </span>
                    <span class="text-[9px] bg-emerald-500/20 px-1 rounded">${state.partnerStudyFocus.remainingMinutes || 25}m</span>
                </div>
            ` : ''}

            <!-- Partner Quick Action Buttons -->
            <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                ${state.partnerPresenceActivity?.includes('Cvičí') || state.partnerPresenceActivity?.includes('Posilovně') ? `
                    <button type="button" onclick="window.sendGymCheer && window.sendGymCheer()" 
                            class="col-span-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-[#faa61a]/25 to-red-500/25 hover:from-[#faa61a]/35 hover:to-red-500/35 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm animate-pulse"
                            title="Poslat energii a zafandit do série!">
                        <i class="fas fa-fire text-orange-400"></i>
                        <span>Zafandit do série! 🔥</span>
                    </button>
                ` : `
                    <button type="button" onclick="window.sendHapticTouchPulse && window.sendHapticTouchPulse()" 
                            class="px-2 py-1.5 rounded-lg bg-[#eb459e]/15 hover:bg-[#eb459e]/25 text-[#eb459e] border border-[#eb459e]/30 text-[10px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer select-none"
                            title="Odeslat partnerovi haptický tlukot srdce">
                        <i class="fas fa-heartbeat text-[10px]"></i>
                        <span>Dotek</span>
                    </button>
                    <button type="button" onclick="window.sendSunlight && window.sendSunlight()" 
                            class="px-2 py-1.5 rounded-lg bg-[#faa61a]/15 hover:bg-[#faa61a]/25 text-[#faa61a] border border-[#faa61a]/30 text-[10px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer select-none"
                            title="Poslat partnerovi sluníčko a konfety">
                        <i class="fas fa-sun text-[10px]"></i>
                        <span>Sluníčko</span>
                    </button>
                `}
            </div>
        </div>
    `;
}

/**
 * Odešle okamžitý haptický tlukot srdce partnerovi
 */
export async function sendHapticTouchPulse() {
    await broadcastHapticPulse({ type: 'poke', strength: 'medium' });
    import('./sound.js').then(s => s.playHeartbeat?.());
    import('./utils.js').then(u => u.triggerHaptic?.('heartbeat'));
    import('./theme.js').then(t => t.showNotification('Tlukot srdce byl odeslán partnerovi! 🫀❤️', 'love'));
}

/**
 * Odešle sluneční paprsek a konfety partnerovi
 */
export async function sendSunlight() {
    if (mainChannel) {
        await mainChannel.send({
            type: 'broadcast',
            event: 'send-sunlight',
            payload: { from: state.currentUser?.id, name: state.currentUser?.name }
        });
    }
    import('./utils.js').then(u => {
        u.triggerConfetti?.();
        u.triggerHaptic?.('success');
    });
    import('./sound.js').then(s => s.playSuccessChime?.());
    import('./theme.js').then(t => t.showNotification('Sluníčko bylo odesláno partnerovi! ☀️💛', 'info'));
}

/**
 * Odešle fandící energii do série cvičícímu partnerovi
 */
export async function sendGymCheer() {
    if (mainChannel) {
        await mainChannel.send({
            type: 'broadcast',
            event: 'gym-cheer',
            payload: { from: state.currentUser?.id, name: state.currentUser?.name }
        });
    }
    import('./utils.js').then(u => {
        u.triggerConfetti?.();
        u.triggerHaptic?.('success');
    });
    import('./sound.js').then(s => s.playSuccessChime?.());
    import('./theme.js').then(t => t.showNotification('Poslal/a jsi partnerovi energii do série! 🔥💪', 'success'));
}

/**
 * Přenáší realtime souřadnice prstu v Thumbkiss ploše
 */
export async function broadcastTouchPosition({ x, y, active }) {
    if (!mainChannel) return;
    try {
        await mainChannel.send({
            type: 'broadcast',
            event: 'touch-pos',
            payload: { from: state.currentUser?.id, name: state.currentUser?.name, x, y, active }
        });
    } catch (err) {
        console.warn('[Sync] Broadcast touch-pos error:', err);
    }
}

/**
 * Synchronizuje pauzovací časovač v posilovně
 */
export async function broadcastGymRestSync({ duration, startedAt }) {
    if (!mainChannel) return;
    try {
        await mainChannel.send({
            type: 'broadcast',
            event: 'gym-rest-sync',
            payload: { from: state.currentUser?.id, duration, startedAt }
        });
    } catch (err) {
        console.warn('[Sync] Broadcast gym-rest-sync error:', err);
    }
}

/**
 * Synchronizuje Pomodoro focus a status studia
 */
export async function broadcastStudyFocus({ taskName, status, durationMinutes, startedAt }) {
    if (!mainChannel) return;
    try {
        await mainChannel.send({
            type: 'broadcast',
            event: 'study-focus',
            payload: { from: state.currentUser?.id, name: state.currentUser?.name, taskName, status, durationMinutes, startedAt }
        });
    } catch (err) {
        console.warn('[Sync] Broadcast study-focus error:', err);
    }
}

/**
 * Synchronizuje změny cyklu a fází (respektuje nastavené filtry soukromí)
 */
export async function broadcastCycleUpdate(cycleData) {
    if (!mainChannel) return;
    try {
        await mainChannel.send({
            type: 'broadcast',
            event: 'cycle-update',
            payload: { from: state.currentUser?.id, data: cycleData }
        });
    } catch (err) {
        console.warn('[Sync] Broadcast cycle-update error:', err);
    }
}

/**
 * Synchronizuje počet kroků a aktivitu pro párové výzvy
 */
export async function broadcastStepUpdate(stepData) {
    if (!mainChannel) return;
    try {
        await mainChannel.send({
            type: 'broadcast',
            event: 'step-update',
            payload: { from: state.currentUser?.id, data: stepData }
        });
    } catch (err) {
        console.warn('[Sync] Broadcast step-update error:', err);
    }
}

// Global exposure
if (typeof window !== 'undefined') {
    window.renderRichPresenceHub = renderRichPresenceHub;
    window.sendHapticTouchPulse = sendHapticTouchPulse;
    window.sendSunlight = sendSunlight;
    window.sendGymCheer = sendGymCheer;
    window.broadcastAmbientActivity = broadcastAmbientActivity;
    window.broadcastTouchPosition = broadcastTouchPosition;
    window.broadcastGymRestSync = broadcastGymRestSync;
    window.broadcastStudyFocus = broadcastStudyFocus;
    window.broadcastCycleUpdate = broadcastCycleUpdate;
    window.broadcastStepUpdate = broadcastStepUpdate;


    // Listen to real-time events for Live Presence
    window.addEventListener('ambient-activity-received', (e) => {
        if (e.detail?.activity) {
            state.partnerPresenceActivity = e.detail.activity;
            renderRichPresenceHub();
        }
    });

    window.addEventListener('haptic-pulse-received', () => {
        import('./sound.js').then(s => s.playHeartbeat?.());
        import('./utils.js').then(u => u.triggerHaptic?.('heartbeat'));
        import('./theme.js').then(t => t.showNotification('Přišel ti dotek na dálku od partnera! 🫀❤️', 'love'));
    });

    window.addEventListener('gym-cheer-received', (e) => {
        const senderName = e.detail?.name || 'Partner';
        import('./utils.js').then(u => {
            u.triggerConfetti?.();
            u.triggerHaptic?.('success');
        });
        import('./sound.js').then(s => s.playSuccessChime?.());
        import('./theme.js').then(t => t.showNotification(`🔥 ${senderName} ti právě poslal/a energii a zafandil/a do série! 💪`, 'success'));
        
        // Dispatch event for workout HUD overlay
        window.dispatchEvent(new CustomEvent('gym-cheer-overlay', { detail: e.detail }));
    });

    window.addEventListener('study-focus-received', (e) => {
        state.partnerStudyFocus = e.detail;
        renderRichPresenceHub();
        if (e.detail?.status === 'focus') {
            import('./theme.js').then(t => t.showNotification(`📚 ${e.detail.name || 'Partner'} zahájil/a studijní fokus: ${e.detail.taskName || 'Úkol'} (25 min)`, 'info'));
        }
    });
}


/**
 * Cleans up subscriptions (e.g., on sign out).
 */
export function cleanupRealtimeSync() {
    if (mainChannel) {
        supabase.removeChannel(mainChannel);
        mainChannel = null;
    }
    cachedPartnerId = null; // Reset cache při odhlášení
}


