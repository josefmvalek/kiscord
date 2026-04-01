import { supabase } from './supabase.js';
import { showNotification } from './theme.js';

const QUEUE_KEY = 'kiscord_sync_queue';

/**
 * Enqueue a Supabase operation for later processing.
 * @param {string} table - The table name
 * @param {string} action - 'upsert', 'insert', 'update', 'delete'
 * @param {object} data - The data payload
 */
export function enqueueOperation(table, action, data) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');

    // Check if we already have a pending upsert for this specific record (optional optimization)
    // For now, simplicity is better: just add to queue.

    queue.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        table,
        action,
        data
    });

    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OFFLINE] Operation queued for ${table}:`, data);
}

/**
 * Process all pending operations in the sync queue.
 */
export async function processSyncQueue() {
    if (!navigator.onLine) return;

    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log(`[OFFLINE] Processing ${queue.length} pending operations...`);
    showNotification(`Synchronizace ${queue.length} změn...`, 'info');

    const remainingQueue = [];
    let successCount = 0;

    for (const op of queue) {
        try {
            let result;
            if (op.action === 'upsert') {
                result = await supabase.from(op.table).upsert(op.data);
            } else if (op.action === 'insert') {
                result = await supabase.from(op.table).insert(op.data);
            } else if (op.action === 'update') {
                result = await supabase.from(op.table).update(op.data).match({ id: op.data.id });
            } else if (op.action === 'delete') {
                result = await supabase.from(op.table).delete().match({ id: op.data.id });
            }

            if (result.error) throw result.error;
            successCount++;
        } catch (err) {
            console.error(`[OFFLINE] Failed to process operation ${op.id}:`, err);
            // Keep in queue if it's a network error, maybe remove if it's a data error (RLS etc)
            // For now, if it fails, we keep it and try later.
            remainingQueue.push(op);
        }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));

    if (successCount > 0) {
        showNotification(`Synchronizace dokončena (${successCount} změn).`, 'success');
        // Trigger a global event to refresh state if needed
        window.dispatchEvent(new CustomEvent('sync-completed'));
    }
}

// Global listener for online status
window.addEventListener('online', () => {
    console.log('[NETWORK] Connection restored. Flushing queue...');
    const statusEl = document.getElementById('user-status');
    if (statusEl) {
        statusEl.textContent = 'Online';
        statusEl.classList.remove('text-[#ed4245]', 'animate-pulse');
        statusEl.parentElement.classList.remove('text-[#ed4245]');
    }
    processSyncQueue();
});

window.addEventListener('offline', () => {
    console.log('[NETWORK] Connection lost.');
    const statusEl = document.getElementById('user-status');
    if (statusEl) {
        statusEl.textContent = 'Offline (Změny se ukládají lokálně)';
        statusEl.classList.add('text-[#ed4245]', 'animate-pulse');
        statusEl.parentElement.classList.add('text-[#ed4245]');
    }
});

// Initial check on load
if (navigator.onLine) {
    processSyncQueue();
} else {
    // Manually trigger offline UI if we start offline
    const statusEl = document.getElementById('user-status');
    if (statusEl) {
        statusEl.textContent = 'Offline (Změny se ukládají lokálně)';
        statusEl.classList.add('text-[#ed4245]', 'animate-pulse');
    }
}

/**
 * Perform a Supabase upsert if online, or queue it if offline.
 */
export async function safeUpsert(table, data) {
    if (!navigator.onLine) {
        enqueueOperation(table, 'upsert', data);
        return { data: null, error: null, offline: true };
    }
    return supabase.from(table).upsert(data).select();
}

/**
 * Perform a Supabase insert if online, or queue it if offline.
 */
export async function safeInsert(table, data) {
    if (!navigator.onLine) {
        enqueueOperation(table, 'insert', data);
        return { data: null, error: null, offline: true };
    }
    return supabase.from(table).insert(data).select();
}

/**
 * Perform a Supabase update if online, or queue it if offline.
 * NOTE: For offline simplicity, we expect 'data' to contain the ID for matching in processQueue.
 */
export async function safeUpdate(table, data, match = null) {
    if (!navigator.onLine) {
        enqueueOperation(table, 'update', data);
        return { data: null, error: null, offline: true };
    }
    const query = supabase.from(table).update(data);
    return match ? query.match(match) : query.eq('id', data.id);
}

/**
 * Perform a Supabase delete if online, or queue it if offline.
 */
export async function safeDelete(table, id) {
    if (!navigator.onLine) {
        enqueueOperation(table, 'delete', { id });
        return { data: null, error: null, offline: true };
    }
    return supabase.from(table).delete().eq('id', id);
}
