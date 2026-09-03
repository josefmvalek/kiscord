---
name: kiscord-supabase-sync
description: >-
  Best practices for Supabase database operations, migrations, SWR caching, offline sync, and realtime updates in Kiscord.
  Trigger when creating or updating database queries, adding tables, writing Supabase migrations, configuring RLS, or debugging offline synchronization.
---

# Kiscord Supabase, Repositories & Offline Sync

This skill establishes best practices for data persistence, offline resilience, and realtime synchronization in the Kiscord ecosystem.

---

## 1. Core Architecture
Data flow in Kiscord prioritizes offline-first experience and Stale-While-Revalidate (SWR):

```
UI Component
   │
   ├──▶ SWR Repository (BaseRepository) ──▶ IndexedDB Cache (Instant render)
   │                                     └──▶ Supabase Fetch (Background revalidate)
   │
   └──▶ safeUpsert() / safeInsert() ──▶ Optimistic Local UI Update
                                     ├──▶ Online: Supabase Mutation
                                     └──▶ Offline: Enqueued in IndexedDB Sync Queue
```

---

## 2. Using SWR Repositories (`js/core/repositories/`)
When fetching and mutating table collections, extend or use `BaseRepository`:

```javascript
import { BaseRepository } from './base-repository.js';

class DatesRepository extends BaseRepository {
    constructor() {
        super('planned_dates', { maxAgeMs: 5 * 60 * 1000, primaryKey: 'id' });
    }
}

export const datesRepository = new DatesRepository();
```

Usage in domain modules:
```javascript
// Instant return from cache, transparent background revalidation
const dates = await datesRepository.getAll();

// Reactive subscription to repository changes
const unsubscribe = datesRepository.subscribe(updatedDates => {
    renderDatesList(updatedDates);
});
```

---

## 3. Safe Offline Mutations (`js/core/offline.js`)
Never call `supabase.from(table).upsert()` directly in UI handlers without offline handling. Always use the safe wrappers:

```javascript
import { safeUpsert, safeInsert, safeDelete } from '../core/offline.js';

// Upsert with match columns
await safeUpsert('health_data', {
    user_id: state.currentUser.id,
    date_key: getTodayKey(),
    water: 8,
    sleep: 7.5
}, ['user_id', 'date_key']);

// Delete with match condition
await safeDelete('planned_dates', { id: eventId });
```

These functions:
1. Apply optimistic local state update immediately.
2. Attempt network request to Supabase.
3. If network fails or user is offline, enqueue operation into IndexedDB `sync_queue`.
4. The queue automatically drains when the `online` event fires.

---

## 4. Realtime Broadcasting (`js/core/sync.js`)
To notify the partner of actions across devices in real time:

```javascript
import { supabase } from './supabase.js';

// Broadcast custom events
export async function broadcastCustomEvent(payload) {
    const channel = supabase.channel('couple_sync');
    await channel.send({
        type: 'broadcast',
        event: 'custom_update',
        payload
    });
}
```

---

## 5. Migrations & Database Types
- Database migrations live in `supabase/migrations/`.
- When adding or altering tables:
  1. Create a timestamped SQL migration file: `supabase/migrations/<timestamp>_<feature>.sql`.
  2. Always enable Row Level Security (RLS):
     ```sql
     ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Allow pair access" ON public.my_table
         FOR ALL USING (auth.uid() IS NOT NULL);
     ```
  3. Regenerate TypeScript definitions:
     ```bash
     npm run types:db
     ```
  4. Verify that `npm run typecheck` passes cleanly.
