/**
 * IndexedDB Storage Engine for Kiscord
 * Provides asynchronous, high-capacity, non-blocking offline storage
 * for state snapshots, sync queues, and binary media assets.
 */

const DB_NAME = 'kiscord_db';
const DB_VERSION = 1;
const STORE_KEYVAL = 'keyval';
const STORE_MEDIA = 'media';

let _dbPromise = null;
let _idbDisabled = false;

/**
 * Open or retrieve the cached IndexedDB instance.
 * @returns {Promise<IDBDatabase|null>}
 */
export function getDB() {
    if (_idbDisabled || typeof indexedDB === 'undefined') {
        return Promise.resolve(null);
    }

    if (!_dbPromise) {
        _dbPromise = new Promise((resolve) => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = /** @type {IDBOpenDBRequest} */ (event.target).result;
                    if (!db.objectStoreNames.contains(STORE_KEYVAL)) {
                        db.createObjectStore(STORE_KEYVAL);
                    }
                    if (!db.objectStoreNames.contains(STORE_MEDIA)) {
                        db.createObjectStore(STORE_MEDIA);
                    }
                };

                request.onsuccess = (event) => {
                    const db = /** @type {IDBOpenDBRequest} */ (event.target).result;
                    resolve(db);
                };

                request.onerror = (err) => {
                    console.warn('[IDB] IndexedDB open error, falling back:', err);
                    _idbDisabled = true;
                    resolve(null);
                };
            } catch (e) {
                console.warn('[IDB] IndexedDB unavailable:', e);
                _idbDisabled = true;
                resolve(null);
            }
        });
    }

    return _dbPromise;
}

/**
 * Retrieve a value from an IndexedDB object store.
 * @param {string} key
 * @param {'keyval'|'media'} [storeName='keyval']
 * @returns {Promise<any>}
 */
export async function idbGet(key, storeName = STORE_KEYVAL) {
    try {
        const db = await getDB();
        if (!db) {
            const fallback = localStorage.getItem(`idb_fb_${storeName}_${key}`);
            return fallback ? JSON.parse(fallback) : null;
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn(`[IDB] get('${key}') error:`, e);
        try {
            const fallback = localStorage.getItem(`idb_fb_${storeName}_${key}`);
            return fallback ? JSON.parse(fallback) : null;
        } catch {
            return null;
        }
    }
}

/**
 * Set a value in an IndexedDB object store.
 * @param {string} key
 * @param {any} value
 * @param {'keyval'|'media'} [storeName='keyval']
 * @returns {Promise<boolean>}
 */
export async function idbSet(key, value, storeName = STORE_KEYVAL) {
    try {
        const db = await getDB();
        if (!db) {
            localStorage.setItem(`idb_fb_${storeName}_${key}`, JSON.stringify(value));
            return true;
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(value, key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn(`[IDB] set('${key}') error:`, e);
        try {
            localStorage.setItem(`idb_fb_${storeName}_${key}`, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Delete a key from an IndexedDB object store.
 * @param {string} key
 * @param {'keyval'|'media'} [storeName='keyval']
 * @returns {Promise<boolean>}
 */
export async function idbDelete(key, storeName = STORE_KEYVAL) {
    try {
        const db = await getDB();
        if (!db) {
            localStorage.removeItem(`idb_fb_${storeName}_${key}`);
            return true;
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn(`[IDB] delete('${key}') error:`, e);
        try {
            localStorage.removeItem(`idb_fb_${storeName}_${key}`);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Clear all records in an IndexedDB object store.
 * @param {'keyval'|'media'} [storeName='keyval']
 * @returns {Promise<boolean>}
 */
export async function idbClear(storeName = STORE_KEYVAL) {
    try {
        const db = await getDB();
        if (!db) {
            if (typeof localStorage !== 'undefined') {
                const prefix = `idb_fb_${storeName}_`;
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(prefix)) {
                        keysToRemove.push(k);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
            }
            return true;
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn(`[IDB] clear('${storeName}') error:`, e);
        return false;
    }
}
