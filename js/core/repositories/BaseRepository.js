import { supabase } from '../supabase.js';
import { safeUpsert, safeInsert, safeUpdate, safeDelete } from '../offline.js';
import { idbGet, idbSet, idbDelete } from '../idb.js';

// In-memory SWR metadata store for fast micro-caching
const memCache = new Map();

export class BaseRepository {
    /**
     * @param {string} tableName
     */
    constructor(tableName) {
        this.tableName = tableName;
    }

    /**
     * SWR (Stale-While-Revalidate) Cache Wrapper
     * Returns stale cached data immediately if available, while asynchronously revalidating in background.
     * 
     * @template T
     * @param {string} cacheKey - Unique key for the query (e.g. 'gym_logs_user_123')
     * @param {() => Promise<T>} fetcher - Async function that fetches fresh data from network
     * @param {Object} [options={}]
     * @param {number} [options.ttlMs=300000] - Time to live in ms (default 5 minutes)
     * @param {(freshData: T) => void} [options.onRevalidate] - Callback invoked when background fetch completes with new data
     * @param {boolean} [options.fallbackToCacheOnError=true] - If network fails, return cached data even if expired
     * @returns {Promise<T>}
     */
    async getWithSWR(cacheKey, fetcher, options = {}) {
        const {
            ttlMs = 300000, // 5 minutes
            onRevalidate = null,
            fallbackToCacheOnError = true
        } = options;

        const fullKey = `swr_${this.tableName}_${cacheKey}`;
        const now = Date.now();

        // 1. Check in-memory cache first, then IndexedDB
        let cached = memCache.get(fullKey);
        if (!cached) {
            try {
                cached = await idbGet(fullKey);
                if (cached) memCache.set(fullKey, cached);
            } catch (e) {
                console.warn(`[${this.tableName}Repository] IDB SWR read error:`, e);
            }
        }

        const isFresh = cached && (now - cached.timestamp < ttlMs);

        // 2. Background Revalidation Helper
        const revalidate = async () => {
            try {
                const freshData = await fetcher();
                const cacheEntry = { data: freshData, timestamp: Date.now() };
                
                memCache.set(fullKey, cacheEntry);
                await idbSet(fullKey, cacheEntry);

                if (typeof onRevalidate === 'function') {
                    onRevalidate(freshData);
                }
                return freshData;
            } catch (err) {
                console.warn(`[${this.tableName}Repository] SWR revalidation failed:`, err);
                if (cached && fallbackToCacheOnError) {
                    return cached.data;
                }
                throw err;
            }
        };

        // 3. If we have fresh cached data, return it immediately without background fetch
        if (isFresh) {
            return cached.data;
        }

        // 4. If we have stale cached data, return it immediately and trigger background revalidation
        if (cached) {
            // Trigger background async revalidation without awaiting
            revalidate().catch(() => {});
            return cached.data;
        }

        // 5. No cache available -> await initial fetch
        return await revalidate();
    }

    /**
     * Invalidate SWR Cache for a specific key
     * @param {string} cacheKey 
     */
    async invalidateCache(cacheKey) {
        const fullKey = `swr_${this.tableName}_${cacheKey}`;
        memCache.delete(fullKey);
        try {
            await idbDelete(fullKey);
        } catch (e) {
            console.warn(`[${this.tableName}Repository] Failed to delete SWR cache:`, e);
        }
    }

    /**
     * Fetch all records matching criteria
     * @param {Record<string, any>} [filters={}]
     * @param {string} [orderBy=null]
     * @param {boolean} [ascending=false]
     */
    async getAll(filters = {}, orderBy = null, ascending = false) {
        let query = supabase.from(this.tableName).select('*');

        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                query = query.eq(key, val);
            }
        });

        if (orderBy) {
            query = query.order(orderBy, { ascending });
        }

        const { data, error } = await query;
        if (error) {
            console.error(`[${this.tableName}Repository] Error fetching records:`, error);
            throw error;
        }
        return data || [];
    }

    /**
     * Fetch all records using SWR caching
     * @param {Record<string, any>} [filters={}]
     * @param {string} [orderBy=null]
     * @param {boolean} [ascending=false]
     * @param {Object} [swrOptions={}]
     */
    async getAllWithSWR(filters = {}, orderBy = null, ascending = false, swrOptions = {}) {
        const cacheKey = `all_${JSON.stringify(filters)}_${orderBy}_${ascending}`;
        return this.getWithSWR(
            cacheKey,
            () => this.getAll(filters, orderBy, ascending),
            swrOptions
        );
    }

    /**
     * Fetch record by ID
     * @param {string} id
     */
    async getById(id) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error(`[${this.tableName}Repository] Error fetching by ID ${id}:`, error);
            throw error;
        }
        return data;
    }

    /**
     * Fetch record by ID using SWR caching
     * @param {string} id 
     * @param {Object} [swrOptions={}] 
     */
    async getByIdWithSWR(id, swrOptions = {}) {
        return this.getWithSWR(
            `id_${id}`,
            () => this.getById(id),
            swrOptions
        );
    }

    /**
     * Safe upsert record (online or offline sync queue)
     * @param {object} record
     * @param {string|null} [onConflict=null]
     */
    async save(record, onConflict = null) {
        return safeUpsert(this.tableName, record, onConflict);
    }

    /**
     * Safe insert record
     * @param {object} record
     */
    async insert(record) {
        return safeInsert(this.tableName, record);
    }

    /**
     * Safe update record
     * @param {object} record
     * @param {Record<string, any>|null} [match=null]
     */
    async update(record, match = null) {
        return safeUpdate(this.tableName, record, match);
    }

    /**
     * Safe delete record by ID or match
     * @param {string|Record<string, any>} matchCriteria
     */
    async delete(matchCriteria) {
        return safeDelete(this.tableName, matchCriteria);
    }
}
