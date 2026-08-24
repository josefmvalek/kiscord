/**
 * Conflict Resolver Modal
 * Allows users to resolve data collisions between local offline edits and remote partner updates.
 */

export function showConflictModal({ table, localData, serverData, onResolve }) {
    const existing = document.getElementById('kiscord-conflict-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'kiscord-conflict-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn';

    modal.innerHTML = `
        <div class="bg-[var(--bg-secondary)] border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div class="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div>
                    <h3 class="text-base font-extrabold text-[var(--text-header)]">Detekován konflikt dat</h3>
                    <p class="text-xs text-[var(--text-muted)]">Záznam v tabulce <code class="text-amber-400 font-mono">${table}</code> byl upraven partnerem, zatímco jsi byl(a) offline.</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] space-y-2">
                    <div class="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Tvoje lokální verze</div>
                    <pre class="font-mono text-[11px] text-[var(--text-normal)] overflow-x-auto max-h-40 whitespace-pre-wrap">${JSON.stringify(localData, null, 2)}</pre>
                </div>
                <div class="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] space-y-2">
                    <div class="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Verze od partnera</div>
                    <pre class="font-mono text-[11px] text-[var(--text-normal)] overflow-x-auto max-h-40 whitespace-pre-wrap">${JSON.stringify(serverData, null, 2)}</pre>
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button id="conflict-btn-server" class="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-header)] text-xs font-bold transition active:scale-95">
                    Ponechat partnera
                </button>
                <button id="conflict-btn-local" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md">
                    Použít moji verzi
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#conflict-btn-server')?.addEventListener('click', () => {
        modal.remove();
        if (typeof onResolve === 'function') onResolve('server');
    });

    modal.querySelector('#conflict-btn-local')?.addEventListener('click', () => {
        modal.remove();
        if (typeof onResolve === 'function') onResolve('local');
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('kiscord-sync-conflict', (e) => {
        if (e.detail) {
            showConflictModal(e.detail);
        }
    });
}
