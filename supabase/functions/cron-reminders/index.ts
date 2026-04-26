// Supabase Edge Function: cron-reminders
// Spouští se přes pg_cron každých 15 minut.
// Kontroluje nastavení uživatelů a jejich health_data pro odeslání připomínek (Léky, Voda, Večerka)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webPush from 'npm:web-push';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Funkce pro získání dnešního klíče YYYY-MM-DD v lokálním čase (předpoklad: Evropa/Prague nebo server time)
function getTodayKey() {
    const today = new Date();
    // Posun pro CET/CEST (jednoduchý hack, ideálně použít Intl)
    const cetOffset = 2 * 60 * 60 * 1000; 
    const localDate = new Date(today.getTime() + cetOffset);
    return localDate.toISOString().split('T')[0];
}

function getCurrentTimeStr() {
    const today = new Date();
    const cetOffset = 2 * 60 * 60 * 1000; 
    const localDate = new Date(today.getTime() + cetOffset);
    return `${String(localDate.getUTCHours()).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:josefmvalek@gmail.com';

        webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        const todayKey = getTodayKey();
        const currentTimeStr = getCurrentTimeStr();
        console.log(`[Cron] Running for ${todayKey} at ${currentTimeStr}`);

        // 1. Načti všechny profily s povolenými notifikacemi (mají settings)
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, username, settings')
            .not('settings', 'is', null);

        if (pError) throw pError;

        let notificationsSent = 0;

        for (const profile of profiles) {
            const settings = profile.settings?.notifications?.reminders;
            if (!settings) continue;

            // 2. Načti health_data pro dnešek
            const { data: healthData, error: hError } = await supabase
                .from('health_data')
                .select('*')
                .eq('user_id', profile.id)
                .eq('date_key', todayKey)
                .maybeSingle();

            if (hError) {
                console.error(`Error fetching health data for ${profile.id}:`, hError);
                continue;
            }

            const data = healthData || { water: 0, pills: false, notified_reminders: {} };
            const notified = data.notified_reminders || {};
            let shouldUpdateHealthData = false;
            let pendingMessages: string[] = [];

            // --- A) KONTROLA LÉKŮ ---
            if (settings.pills?.enabled && settings.pills.reminders) {
                if (!notified.pills) notified.pills = [];
                // Léky se neberou jako "splněno globálně", kontrolujeme každý čas zvlášť
                // nebo jednoduše: pokud data.pills == true, vzal vše.
                // Pro zjednodušení: upozorníme v daný čas, pokud ještě nejsou vzaty (nebo aspoň odškrtne ten čas)
                if (!data.pills) {
                    for (const r of settings.pills.reminders) {
                        const { time, label } = r;
                        if (currentTimeStr >= time && !notified.pills.includes(time)) {
                            pendingMessages.push(`Čas na tvoje léky: ${label} (${time})! 💊`);
                            notified.pills.push(time);
                            shouldUpdateHealthData = true;
                        }
                    }
                }
            }

            // --- B) KONTROLA VEČERKY ---
            if (settings.bedtime?.enabled && profile.username?.includes('Klárka')) {
                if (currentTimeStr >= settings.bedtime.time && !notified.bedtime) {
                    pendingMessages.push("Sluníčko, už je čas jít spát. 🌙 Dobrou noc!");
                    notified.bedtime = true;
                    shouldUpdateHealthData = true;
                }
            }

            // --- C) KONTROLA VODY ---
            // Serverový CRON běží každých 15 minut. Pošleme vodu např. každé 2 hodiny, pokud je < 8.
            if (settings.water?.enabled && data.water < 8) {
                const intervalMinutes = settings.water.interval || 120;
                const lastWaterTimestamp = notified.last_water_ts || 0;
                const nowMs = Date.now();
                
                if (nowMs - lastWaterTimestamp > intervalMinutes * 60 * 1000) {
                    // Posílat jen mezi 8:00 a 22:00
                    const hour = parseInt(currentTimeStr.split(':')[0], 10);
                    if (hour >= 8 && hour <= 21) {
                        pendingMessages.push("Nezapomeň pít! 💧 Dnes ti ještě chybí do splnění cíle.");
                        notified.last_water_ts = nowMs;
                        shouldUpdateHealthData = true;
                    }
                }
            }

            // Odeslání push notifikací
            if (pendingMessages.length > 0) {
                const { data: subs } = await supabase
                    .from('push_subscriptions')
                    .select('endpoint, keys')
                    .eq('user_id', profile.id);

                if (subs && subs.length > 0) {
                    for (const msg of pendingMessages) {
                        const payload = JSON.stringify({
                            title: msg,
                            body: '',
                            tag: 'kiscord-reminder',
                            url: '/'
                        });

                        for (const sub of subs) {
                            try {
                                await webPush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
                                notificationsSent++;
                                console.log(`[Cron] Push sent to ${profile.username}: ${msg}`);
                            } catch (e: any) {
                                if (e.statusCode === 410 || e.statusCode === 404) {
                                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                                }
                            }
                        }
                    }
                }

                // Aktualizace notified stavu v health_data
                if (shouldUpdateHealthData) {
                    await supabase.from('health_data').upsert({
                        user_id: profile.id,
                        date_key: todayKey,
                        water: data.water,
                        pills: data.pills,
                        notified_reminders: notified
                    }, { onConflict: 'user_id, date_key' });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, notificationsSent }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('[Cron] Fatal error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
