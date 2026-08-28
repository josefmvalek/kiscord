import { vi } from 'vitest';

/**
 * Creates a fluent/chainable QueryBuilder mock that behaves like Supabase's PostgREST client.
 * Supports chaining (.select().eq().order().limit()...) and is directly awaitable as a Promise.
 *
 * @param {Object} options
 * @param {any} [options.defaultData=[]] - Data to resolve on execution
 * @param {any} [options.defaultError=null] - Error to resolve/reject on execution
 * @returns {Object} Chainable QueryBuilder
 */
export function createChainableQueryBuilder({ defaultData = [], defaultError = null } = {}) {
    let resolvedData = defaultData;
    let resolvedError = defaultError;

    const builder = {
        _setData(data) {
            resolvedData = data;
            return builder;
        },
        _setError(err) {
            resolvedError = err;
            return builder;
        },

        // Query execution / Filters
        select: vi.fn((_columns) => builder),
        insert: vi.fn((payload) => {
            if (Array.isArray(resolvedData) && payload) {
                const items = Array.isArray(payload) ? payload : [payload];
                resolvedData.push(...items);
            }
            return builder;
        }),
        update: vi.fn((payload) => {
            if (Array.isArray(resolvedData) && payload) {
                resolvedData.forEach(item => Object.assign(item, payload));
            }
            return builder;
        }),
        upsert: vi.fn((payload, _opts) => {
            if (Array.isArray(resolvedData) && payload) {
                const items = Array.isArray(payload) ? payload : [payload];
                resolvedData.push(...items);
            }
            return builder;
        }),
        delete: vi.fn(() => {
            return builder;
        }),


        // Filter operators
        eq: vi.fn((_col, _val) => builder),
        neq: vi.fn((_col, _val) => builder),
        gt: vi.fn((_col, _val) => builder),
        gte: vi.fn((_col, _val) => builder),
        lt: vi.fn((_col, _val) => builder),
        lte: vi.fn((_col, _val) => builder),
        like: vi.fn((_col, _val) => builder),
        ilike: vi.fn((_col, _val) => builder),
        is: vi.fn((_col, _val) => builder),
        in: vi.fn((_col, _vals) => builder),
        or: vi.fn((_filters) => builder),
        not: vi.fn((_col, _op, _val) => builder),
        contains: vi.fn((_col, _val) => builder),
        containedBy: vi.fn((_col, _val) => builder),
        range: vi.fn((_from, _to) => builder),

        // Modifiers
        order: vi.fn((_col, _opts) => builder),
        limit: vi.fn((_count) => builder),
        offset: vi.fn((_offset) => builder),

        // Single / MaybeSingle
        single: vi.fn(() => Promise.resolve({
            data: Array.isArray(resolvedData) ? (resolvedData[0] || null) : resolvedData,
            error: resolvedError
        })),
        maybeSingle: vi.fn(() => Promise.resolve({
            data: Array.isArray(resolvedData) ? (resolvedData[0] || null) : resolvedData,
            error: resolvedError
        })),

        // Match helper (used in some repositories and offline sync)
        match: vi.fn((_criteria) => builder),

        // Promise / Awaitable interface
        then(resolve, reject) {
            return Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve, reject);
        },
        catch(reject) {
            return Promise.resolve({ data: resolvedData, error: resolvedError }).catch(reject);
        }
    };

    return builder;
}

/**
 * Creates a complete mock Supabase client instance.
 *
 * @param {Object} [tableDataMap={}] Map of tableName -> custom initial data
 * @returns {Object} Mock Supabase client
 */
export function createMockSupabase(tableDataMap = {}) {
    const activeBuilders = new Map();

    const getBuilderForTable = (tableName) => {
        if (!activeBuilders.has(tableName)) {
            const tableData = tableDataMap[tableName] !== undefined ? tableDataMap[tableName] : [];
            activeBuilders.set(tableName, createChainableQueryBuilder({ defaultData: tableData }));
        }
        return activeBuilders.get(tableName);
    };

    const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb) => {
            if (typeof cb === 'function') cb('SUBSCRIBED');
            return mockChannel;
        }),
        send: vi.fn().mockResolvedValue({ status: 'ok' }),
        unsubscribe: vi.fn().mockResolvedValue('ok')
    };

    const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path.png' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob([]), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://supabase.co/storage/v1/object/public/${path}` } }))
    };

    return {
        from: vi.fn((tableName) => getBuilderForTable(tableName)),
        channel: vi.fn((_channelName) => mockChannel),
        removeChannel: vi.fn().mockResolvedValue('ok'),
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
        },
        storage: {
            from: vi.fn((_bucket) => mockStorageBucket)
        },
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: { sent: 1 }, error: null })
        },
        rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
        _getBuilderForTable: getBuilderForTable,
        _activeBuilders: activeBuilders
    };
}
