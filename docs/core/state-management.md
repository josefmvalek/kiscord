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

## 2. Reactivity: Event Bus (`stateEvents`) & Reactive Signals (`signals.js`)

To achieve UI reactivity without heavy frameworks, Kiscord pairs a Pub/Sub event bus with fine-grained reactive signals:

- **Pub/Sub Bus (`stateEvents`)**:
  - `stateEvents.on(event, callback)`: Registers a UI component listener for a domain.
  - `stateEvents.emit(event, data)`: Notifies subscribed components to re-render when data updates.
- **Reactive Signals (`signals.js`)**:
  - `createSignal(initialValue)`: Fine-grained reactive values `[getter, setter]`.
  - `createEffect(callback)`: Automatically tracks dependencies and re-executes on mutation.

### Usage Example:
```javascript
import { state, stateEvents } from './state.js';
import { createSignal, createEffect } from './signals.js';

// Signals example for granular widgets
const [water, setWater] = createSignal(state.healthData[today]?.water || 0);
createEffect(() => {
    document.querySelector('#water-count').textContent = water();
});
```

---

## 3. Caching & Persistence (`js/core/idb.js`)

The application uses **IndexedDB** (`kiscord_db`) for asynchronous state caching with transparent `localStorage` fallback/migration:

- **`saveStateToCache()`**: Serializes state to IndexedDB keyval store.
- **`loadStateFromCache()`**: Hydrates state immediately upon application load (< 10ms).
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

