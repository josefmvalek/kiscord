import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';

/**
 * Otevře modal s návodem a generátorem automatického syncu kroků
 */
export function openStepWebhookModal() {
    let modal = document.getElementById('step-webhook-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'step-webhook-modal';
        modal.className = 'fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
        document.body.appendChild(modal);
    }

    const userId = state.currentUser?.id || 'TVOJE_USER_ID';
    const supabaseUrl = 'https://nnrorazsiyiedwomgidf.supabase.co';

    const curlSnippet = `curl -X POST '${supabaseUrl}/rest/v1/activity_step_logs' \\
  -H "apikey: SUPABASE_ANON_KEY" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: resolution=merge-duplicates" \\
  -d '{"user_id": "${userId}", "date_key": "2026-08-22", "steps_count": 10450, "source": "apple_health_webhook"}'`;

    modal.innerHTML = `
    <div class="bg-[#2f3136] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
                <span class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-base font-bold">
                    ⚡
                </span>
                <div>
                    <h3 class="text-sm font-black text-white">Automatický Sync Kroků</h3>
                    <p class="text-[11px] text-gray-400">Apple Health & Google Fit automatizace</p>
                </div>
            </div>
            <button onclick="window.closeStepWebhookModal()" class="w-8 h-8 rounded-lg bg-[#202225] text-gray-400 hover:text-white flex items-center justify-center transition">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Explanation -->
        <div class="space-y-2 text-xs text-gray-300">
            <p>Kiscord umožňuje přijímat celodenní kroky přímo z tvého telefonu, aniž bys musel/a cokoliv zadávat ručně nebo mít zapnutou aplikaci.</p>
        </div>

        <!-- Option 1: Apple Shortcuts (iOS) -->
        <div class="p-4 bg-[#202225] rounded-xl border border-white/5 space-y-2">
            <div class="flex items-center gap-2 text-xs font-black text-emerald-400">
                <i class="fab fa-apple text-sm"></i>
                <span>Pro iPhone (iOS Zkratky)</span>
            </div>
            <p class="text-[11px] text-gray-400 leading-relaxed">
                V aplikaci <strong>Zkratky (Shortcuts)</strong> vytvoř novou osobní automatizaci:
                <br>1. Spustit každý den v 23:00.
                <br>2. Akce: <em>Najít vzorky zdraví (Kroky dnes)</em>.
                <br>3. Akce: <em>Získat obsah z URL (POST na Kiscord endpoint)</em>.
            </p>
        </div>

        <!-- Option 2: Android Health Connect -->
        <div class="p-4 bg-[#202225] rounded-xl border border-white/5 space-y-2">
            <div class="flex items-center gap-2 text-xs font-black text-emerald-400">
                <i class="fab fa-android text-sm"></i>
                <span>Pro Android (Tasker / Automate)</span>
            </div>
            <p class="text-[11px] text-gray-400 leading-relaxed">
                Nastav automatizaci, která jednou denně odešle JSON payload do tabulky <code>activity_step_logs</code>.
            </p>
        </div>

        <!-- Code Snippet -->
        <div class="space-y-1">
            <span class="text-[10px] font-black uppercase text-gray-400">API Endpoint & Payload formát</span>
            <pre class="p-3 bg-[#1e1f22] rounded-xl text-[10px] font-mono text-emerald-300 overflow-x-auto border border-white/5">${curlSnippet}</pre>
        </div>

        <button 
            type="button" 
            onclick="window.closeStepWebhookModal()" 
            class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
        >
            Rozumím
        </button>
    </div>
    `;
    modal.style.display = 'flex';
}

if (typeof window !== 'undefined') {
    window.openStepWebhookModal = openStepWebhookModal;
    window.closeStepWebhookModal = () => {
        const modal = document.getElementById('step-webhook-modal');
        if (modal) modal.style.display = 'none';
    };
}
