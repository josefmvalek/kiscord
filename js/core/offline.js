import { supabase } from './supabase.js';
import { showNotification } from './theme.js';
import { idbGet, idbSet } from './idb.js';

const QUEUE_KEY = 'kiscord_sync_queue';
let _memoryQueue = null;
let _isProcessing = false;

/**
 * Load the sync queue from memory/IndexedDB/localStorage.
 * @returns {Promise<Array<any>>}
 */
export async function getQueue() {
    if (_memoryQueue !== null) return _memoryQueue;

    try {
        let queue = await idbGet(QUEUE_KEY);
        if (!queue || queue.length === 0) {
            const legacy = localStorage.getItem(QUEUE_KEY);
            if (legacy) {
                try {
                    queue = JSON.parse(legacy);
                    await idbSet(QUEUE_KEY, queue);
                } catch {
                    queue = [];
                }
            } else {
                queue = [];
            }
        }
        _memoryQueue = Array.isArray(queue) ? queue : [];
    } catch {
        try {
            _memoryQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        } catch {
            _memoryQueue = [];
        }
    }
    return _memoryQueue;
}

/**
 * Enqueue a Supabase operation for later processing with metadata.
 * @param {string} table - The table name
 * @param {string} action - 'upsert', 'insert', 'update', 'delete'
 * @param {object} data - The data payload
 * @param {object|null} [match=null] - Optional match criteria
 * @param {object} [metadata={}] - Optional metadata like expected_server_version
 */
export function enqueueOperation(table, action, data, match = null, metadata = {}) {
    let queue = [];
    try {
        queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        queue = [];
    }

    const timestamp = new Date().toISOString();
    const op = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `op-${Date.now()}-${Math.random()}`,
        timestamp,
        client_updated_at: timestamp,
        table,
        action,
        data,
        match,
        retry_count: 0,
        expected_server_version: metadata.expected_server_version || null,
        last_error: null
    };

    queue.push(op);

    _memoryQueue = queue;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    idbSet(QUEUE_KEY, queue).catch(() => {});
    console.log(`[OFFLINE] Operation queued for ${table}:`, data);
    updateHeaderOfflineBadge();
}

/**
 * Calculate exponential backoff delay with jitter in milliseconds.
 * @param {number} retryCount
 * @returns {number} Delay in ms
 */
export function getExponentialBackoffDelay(retryCount) {
    const base = 1000;
    const maxDelay = 30000;
    const exponent = Math.min(retryCount, 5);
    const delay = Math.min(base * Math.pow(2, exponent), maxDelay);
    const jitter = Math.random() * 500;
    return delay + jitter;
}

/**
 * Process all pending operations in the sync queue.
 */
export async function processSyncQueue() {
    if (!navigator.onLine) {
        updateHeaderOfflineBadge();
        return;
    }

    if (_isProcessing) {
        return;
    }

    let queue = [];
    try {
        queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        queue = await getQueue();
    }

    if (queue.length === 0) {
        updateHeaderOfflineBadge();
        return;
    }

    _isProcessing = true;
    updateHeaderOfflineBadge();
    console.log(`[OFFLINE] Processing ${queue.length} pending operations...`);

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
                const matchCriteria = op.match || { id: op.data.id };
                result = await supabase.from(op.table).update(op.data).match(matchCriteria);
            } else if (op.action === 'delete') {
                const matchCriteria = op.match || op.data;
                result = await supabase.from(op.table).delete().match(matchCriteria);
            }

            if (result && result.error) throw result.error;
            successCount++;
        } catch (err) {
            console.error(`[OFFLINE] Failed to process operation ${op.id}:`, err);
            op.retry_count = (op.retry_count || 0) + 1;
            op.last_error = err?.message || 'Network/DB error';
            remainingQueue.push(op);
        }
    }

    _memoryQueue = remainingQueue;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    await idbSet(QUEUE_KEY, remainingQueue);
    _isProcessing = false;
    updateHeaderOfflineBadge();

    if (successCount > 0) {
        window.dispatchEvent(new CustomEvent('sync-completed', { detail: { processed: successCount, remaining: remainingQueue.length } }));
    }
}

export function updateHeaderOfflineBadge() {
    const badge = document.getElementById('header-offline-badge');
    const textEl = document.getElementById('header-offline-text');
    if (!badge || !textEl) return;

    const count = _memoryQueue ? _memoryQueue.length : 0;
    const isOffline = !navigator.onLine;

    if (isOffline) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
        badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider flex-shrink-0 animate-pulse select-none';
        textEl.textContent = `Offline (${count})`;
    } else if (count > 0) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
        badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider flex-shrink-0 select-none';
        textEl.textContent = `Sync (${count})`;
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }
}

// Global listener for online status
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[NETWORK] Connection restored. Flushing queue...');
        const statusEl = document.getElementById('user-status');
        if (statusEl) {
            statusEl.textContent = 'Online';
            statusEl.classList.remove('text-[#ed4245]', 'animate-pulse');
            statusEl.parentElement?.classList.remove('text-[#ed4245]');
        }
        updateHeaderOfflineBadge();
        processSyncQueue();
    });

    window.addEventListener('offline', () => {
        console.log('[NETWORK] Connection lost.');
        const statusEl = document.getElementById('user-status');
        if (statusEl) {
            statusEl.textContent = 'Offline (Změny se ukládají lokálně)';
            statusEl.classList.add('text-[#ed4245]', 'animate-pulse');
            statusEl.parentElement?.classList.add('text-[#ed4245]');
        }
        updateHeaderOfflineBadge();
    });
}

// Initial check on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        updateHeaderOfflineBadge();
    });
}

if (typeof navigator !== 'undefined' && navigator.onLine) {
    processSyncQueue();
}

/**
 * Perform a Supabase upsert if online, or queue it if offline.
 * @template {keyof import('../types/database.js').Database['public']['Tables']} T
 * @param {T} table - The Supabase table name
 * @param {import('../types/database.js').TablesInsert<T>} data - Record payload to upsert
 * @param {string|null} [onConflict=null] - Optional column list for conflict resolution
 * @returns {Promise<{ data: any, error: any, offline?: boolean }>}
 */
export async function safeUpsert(table, data, onConflict = null) {
    if (!navigator.onLine) {
        enqueueOperation(table, 'upsert', data);
        return { data: null, error: null, offline: true };
    }
    const options = onConflict ? { onConflict } : {};
    return supabase.from(table).upsert(data, options).select();
}

/**
 * Perform a Supabase insert if online, or queue it if offline.
 * @template {keyof import('../types/database.js').Database['public']['Tables']} T
 * @param {T} table - The Supabase table name
 * @param {import('../types/database.js').TablesInsert<T>} data - Record payload to insert
 * @returns {Promise<{ data: any, error: any, offline?: boolean }>}
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
 * @template {keyof import('../types/database.js').Database['public']['Tables']} T
 * @param {T} table - The Supabase table name
 * @param {import('../types/database.js').TablesUpdate<T>} data - Update payload
 * @param {Record<string, any>|null} [match=null] - Optional match criteria
 * @returns {Promise<{ data: any, error: any, offline?: boolean }>}
 */
export async function safeUpdate(table, data, match = null) {
    if (!navigator.onLine) {
        enqueueOperation(table, 'update', data, match);
        return { data: null, error: null, offline: true };
    }
    const query = supabase.from(table).update(data);
    return match ? query.match(match) : query.eq('id', data.id);
}

/**
 * Perform a Supabase delete if online, or queue it if offline.
 * @template {keyof import('../types/database.js').Database['public']['Tables']} T
 * @param {T} table - The Supabase table name
 * @param {string|Record<string, any>} matchCriteria - Record ID or match object
 * @returns {Promise<{ data: any, error: any, offline?: boolean }>}
 */
export async function safeDelete(table, matchCriteria) {
    if (!navigator.onLine) {
        const isObject = typeof matchCriteria === 'object' && matchCriteria !== null;
        const opData = isObject ? matchCriteria : { id: matchCriteria };
        const opMatch = isObject ? matchCriteria : { id: matchCriteria };
        enqueueOperation(table, 'delete', opData, opMatch);
        return { data: null, error: null, offline: true };
    }
    const query = supabase.from(table).delete();
    return typeof matchCriteria === 'object' && matchCriteria !== null
        ? query.match(matchCriteria)
        : query.eq('id', matchCriteria);
}
