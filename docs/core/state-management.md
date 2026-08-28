# State Management

> Kiscord uses a centralized, reactive state management pattern centered around a single global `state` object. This system synchronizes Supabase data, local browser storage, and UI components without framework runtimes.

---

## 1. Global `state` Container

Defined in `js/core/state.js`, the `state` object maintains all client-side application data:

```javascript
const state = {
    currentChannel: "dashboard",
    currentUser: null,
    healthData: {},
    library: { movies: [], series: [], games: [] },
    watchHistory: {},
    watchlist: [],
    achievements: [],
    settings: {
        theme: 'default',
        haptics: true
    },
    // Lazy-loading indicators
    _loaded: {
        calendar: false,
        library: false,
        gym: false,
        achievements: false
    }
};
```

---

## 2. Event Bus (`stateEvents`)

To achieve UI reactivity without heavy frameworks, Kiscord uses a lightweight **Pub/Sub (Publish/Subscribe)** pattern:

- **`stateEvents.on(event, callback)`**: Registers a UI component listener for a specific data domain.
- **`stateEvents.emit(event, data)`**: Notifies subscribed components to re-render when data updates.

### Usage Example:
```javascript
// Inside a UI rendering module
stateEvents.on('health', () => {
    renderHealthUI();
});

// Inside a mutation handler
export function updateWater(val) {
    state.healthData[today].water = val;
    stateEvents.emit('health'); // Triggers synchronous UI re-render
}
```

---

## 3. Caching & Persistence

The application uses `localStorage` for state caching, enabling instantaneous application startup and offline availability:

- **`saveStateToCache()`**: Serializes selected `state` domains to `kiscord_state_cache`.
- **`loadStateFromCache()`**: Hydrates state immediately upon application load.
- **SWR (Stale-While-Revalidate)**: The app displays cached data immediately while fetching fresh records in the background (`initializeState`).

---

## 4. On-Demand Lazy Data Loading (`loaders.js`) & Unified Bootstrap

To optimize bandwidth and memory, data is fetched only when navigating to a channel or via unified server procedures:

1. **Unified Dashboard Bootstrap (`get_full_dashboard_bootstrap`)**:
   - Fetches complete dashboard state (personal health, partner health, habits & logs, active quests, pinned drawing, tetris, next event) in 1 network call (< 90ms).
2. **On-Demand Domain Loaders (`loaders.js`)**:
   - Checks if data is already loaded in `state._loaded`.
   - If absent or stale (older than 5 minutes via `isStale()`), retrieves records from Supabase.
   - Marks the domain as loaded and emits a notification to the event bus.

```javascript
export async function ensureLibraryData(force = false) {
    if (state._loaded.library && !force && !isStale('library')) return;
    // ... Supabase fetch logic ...
    markLoaded('library');
    stateEvents.emit('library');
}
```

---

## 5. Multi-Tier SWR Repository Layer (`js/core/repositories/`)

For data-heavy domains (`GymRepository`, `CoupleRepository`, `UniversityRepository`), the `BaseRepository` provides automatic multi-tier caching:
- **L1 In-Memory Cache (`Map`)**: Sub-1ms micro-caching within the active session.
- **L2 IndexedDB Async Storage (`idb.js`)**: Persistent offline store.
- **Background SWR Revalidation**: Instant UI rendering from cache with background network refresh and event notification.

---

## 6. Offline Mutation Queue

All database writes (Upsert, Insert, Delete) are wrapped by `js/core/offline.js`, saving operations to `kiscord_sync_queue` during connection loss and automatically flushing when online.

