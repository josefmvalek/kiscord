// Supabase Edge Function: send-push
// Odesílá Web Push notifikaci konkrétnímu uživateli
// Volá se přes supabase.functions.invoke('send-push', { body: { ... } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// web-push compatible VAPID signing for Deno
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

        // Načti push subscripce cílového uživatele
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys')
            .eq('user_id', userId);

        if (error) throw error;
        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // VAPID secrets z environment
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:josefmvalek@gmail.com';

        const payload = JSON.stringify({ title, body: body || '', tag: tag || 'kiscord-push', url: url || '/' });

        let sent = 0;
        const errors: string[] = [];

        for (const sub of subscriptions) {
            try {
                await sendWebPush(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    payload,
                    vapidPublicKey,
                    vapidPrivateKey,
                    vapidSubject,
                );
                sent++;
            } catch (pushErr) {
                console.error('[send-push] Push failed for endpoint:', sub.endpoint, pushErr);
                errors.push(String(pushErr));

                // Pokud je endpoint neplatný (410 Gone), smaž ho z DB
                if (String(pushErr).includes('410') || String(pushErr).includes('404')) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('endpoint', sub.endpoint);
                }
            }
        }

        return new Response(JSON.stringify({ sent, errors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[send-push] Error:', err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

// ---------------------------------------------------------------------------
// VAPID Web Push implementation (Deno-native, no npm dependencies)
// ---------------------------------------------------------------------------

async function sendWebPush(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    vapidPublicKey: string,
    vapidPrivateKey: string,
    vapidSubject: string,
) {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // 1. Build VAPID JWT
    const jwt = await buildVapidJwt(vapidSubject, audience, vapidPrivateKey);
    const authHeader = `vapid t=${jwt},k=${vapidPublicKey}`;

    // 2. Encrypt payload using Web Push encryption (RFC 8291)
    const { encrypted, salt, serverPublicKey } = await encryptPayload(
        payload,
        subscription.keys.p256dh,
        subscription.keys.auth,
    );

    // 3. Send HTTP request to push service
    const res = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400',
            'Urgency': 'normal',
        },
        body: encrypted,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Push failed: ${res.status} ${text}`);
    }
}

async function buildVapidJwt(subject: string, audience: string, privateKeyB64: string): Promise<string> {
    const header = { alg: 'ES256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claims = { aud: audience, exp: now + 43200, sub: subject };

    const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const claimsB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
    const signingInput = `${headerB64}.${claimsB64}`;

    const privateKeyBytes = base64urlDecode(privateKeyB64);
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        toPkcs8(privateKeyBytes),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
    );

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        new TextEncoder().encode(signingInput),
    );

    return `${signingInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

async function encryptPayload(
    payload: string,
    p256dhB64: string,
    authB64: string,
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(payload);
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Import receiver public key
    const receiverPublicKeyBytes = base64urlDecode(p256dhB64);
    const receiverPublicKey = await crypto.subtle.importKey(
        'raw',
        receiverPublicKeyBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        [],
    );

    // Generate ephemeral server key pair
    const serverKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits'],
    );
    const serverPublicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey('raw', serverKeyPair.publicKey),
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: receiverPublicKey },
        serverKeyPair.privateKey,
        256,
    );

    // Auth secret
    const authSecret = base64urlDecode(authB64);

    // HKDF for encryption key and nonce (RFC 8291 / aes128gcm)
    const prk = await hkdf(authSecret, new Uint8Array(sharedSecret), buildInfo('auth', new Uint8Array(0), new Uint8Array(0)), 32);
    const cek = await hkdf(salt, prk, buildInfo('aesgcm128', serverPublicKeyRaw, receiverPublicKeyBytes), 16);
    const nonce = await hkdf(salt, prk, buildInfo('nonce', serverPublicKeyRaw, receiverPublicKeyBytes), 12);

    // Encrypt
    const contentKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
    const record = new Uint8Array(plaintext.length + 2);
    record.set(plaintext);
    // padding delimiter
    record[plaintext.length] = 2;

    const encryptedContent = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, contentKey, record),
    );

    // Build aes128gcm content (RFC 8291 §2.1)
    // salt(16) + rs(4) + idlen(1) + serverPublicKey(65) + encrypted
    const rs = 4096;
    const header = new Uint8Array(16 + 4 + 1 + serverPublicKeyRaw.length);
    let offset = 0;
    header.set(salt, offset); offset += 16;
    new DataView(header.buffer).setUint32(offset, rs); offset += 4;
    header[offset++] = serverPublicKeyRaw.length;
    header.set(serverPublicKeyRaw, offset);

    const result = new Uint8Array(header.length + encryptedContent.length);
    result.set(header);
    result.set(encryptedContent, header.length);

    return { encrypted: result, salt, serverPublicKey: serverPublicKeyRaw };
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
    const label = new TextEncoder().encode(`Content-Encoding: ${type}\0`);
    const context = type === 'auth'
        ? new Uint8Array(0)
        : (() => {
            const ctx = new Uint8Array(5 + clientKey.length + 2 + serverKey.length + 2);
            let o = 0;
            new TextEncoder().encode('P-256\0').forEach(b => ctx[o++] = b);
            new DataView(ctx.buffer).setUint16(o, serverKey.length); o += 2;
            ctx.set(serverKey, o); o += serverKey.length;
            new DataView(ctx.buffer).setUint16(o, clientKey.length); o += 2;
            ctx.set(clientKey, o);
            return ctx;
        })();
    const info = new Uint8Array(label.length + context.length);
    info.set(label);
    info.set(context, label.length);
    return info;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const keyMaterial = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        keyMaterial,
        length * 8,
    );
    return new Uint8Array(bits);
}

function base64urlEncode(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    return Uint8Array.from(atob(padded + pad), c => c.charCodeAt(0));
}

function toPkcs8(rawPrivateKey: Uint8Array): Uint8Array {
    // Correct PKCS#8 DER encoding for EC P-256 private key
    // Structure:
    //   SEQUENCE {
    //     INTEGER 0 (version)
    //     SEQUENCE { OID ecPublicKey, OID P-256 }
    //     OCTET STRING {
    //       SEQUENCE { INTEGER 1, OCTET STRING <32-byte raw key> }
    //     }
    //   }
    //
    // This wraps the raw 32-byte key in a proper ECPrivateKey (RFC 5915) then PKCS#8 (RFC 5958)

    // ECPrivateKey ::= SEQUENCE { version INTEGER (1), privateKey OCTET STRING }
    const ecPrivKey = new Uint8Array([
        0x30, 0x23,             // SEQUENCE, length 35
        0x02, 0x01, 0x01,       // INTEGER version = 1
        0x04, 0x20,             // OCTET STRING, length 32
        ...rawPrivateKey        // raw private key bytes
    ]);

    // AlgorithmIdentifier for ecPublicKey + P-256
    const algorithmId = new Uint8Array([
        0x30, 0x13,                                     // SEQUENCE, length 19
        0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID 1.2.840.10045.2.1 (ecPublicKey)
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07 // OID 1.2.840.10045.3.1.7 (P-256)
    ]);

    // OCTET STRING wrapping ECPrivateKey
    const octetWrapped = new Uint8Array([0x04, ecPrivKey.length, ...ecPrivKey]);

    // Outer SEQUENCE (version + algorithmId + octetWrapped)
    const versionBytes = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0
    const innerLen = versionBytes.length + algorithmId.length + octetWrapped.length;
    const outerSeq = new Uint8Array([0x30, innerLen, ...versionBytes, ...algorithmId, ...octetWrapped]);

    return outerSeq;
}

