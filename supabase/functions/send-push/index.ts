// Supabase Edge Function: send-push
// Odesílá Web Push notifikaci konkrétnímu uživateli
// Volá se přes supabase.functions.invoke('send-push', { body: { ... } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webPush from 'npm:web-push';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { userId, title, body, tag, url } = await req.json();

        if (!userId || !title) {
            return new Response(JSON.stringify({ error: 'Missing userId or title' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Supabase admin client (service role — bypasses RLS)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // VAPID credentials from environment
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:josefmvalek@gmail.com';

        webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        // Načti push subscripce cílového uživatele
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys')
            .eq('user_id', userId);

        if (error) throw error;

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ sent: 0, message: 'No subscriptions found for user' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const payload = JSON.stringify({
            title,
            body: body || '',
            tag: tag || 'kiscord-push',
            url: url || '/',
        });

        let sent = 0;
        const errors: string[] = [];

        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    payload,
                );
                sent++;
                console.log(`[Push] ✅ Sent to endpoint: ${sub.endpoint.slice(0, 60)}...`);
            } catch (err: any) {
                const msg = `${sub.endpoint.slice(0, 60)}: ${err.message} (status: ${err.statusCode})`;
                errors.push(msg);
                console.error(`[Push] ❌ Failed: ${msg}`);

                // Subscription expired or invalid — smazat z DB
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                    console.log('[Push] 🗑️ Removed expired subscription.');
                }
            }
        }

        return new Response(
            JSON.stringify({ sent, total: subscriptions.length, errors }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err: any) {
        console.error('[Push] Fatal error:', err.message);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
