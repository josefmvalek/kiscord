# Kiscord Developer Onboarding & Architecture Guide

> **Comprehensive engineering guide and onboarding reference for Kiscord (Project-K).**  
> This interactive document guides engineers, architects, and contributors through local setup, system architecture, Supabase database modeling, and developer workflows.

---

## 1. Project Overview & Context

Kiscord is a highly customized, private **Progressive Web App (PWA)** styled after Discord (dark mode, glassmorphism, channel sidebar, notification chimes, and haptics). It is built for two primary users (**Josef & Klárka**) as a central companion application for daily life.

### Core Functional Domains
1. **Daily Routine & Health**: Hydration tracker (8 droplets), sleep logging with active session timers, mood tracking with reactive SVG sunflowers, and daily notes.
2. **University Studies (VUT FIT & Dorm Life)**: Timetables with room hints, WIS points tracker, assignment deadlines, floor laundry room machine bookings, room packing checklist, and personal finances.
3. **Fitness Ecosystem (Gym Tracker)**: 15-module gym tracker featuring a floating active workout HUD, rest timer with sound/haptics, 100+ animated GIF exercises, 1RM progression charts, anatomical muscle volume heatmaps, and body measurement tracking.
4. **Relationship, Dreams & Memories**: Couple coupon shop redeemable with Love Coins, interactive date map (Leaflet), shared bucket list, photo timeline, and time-locked message capsules.
5. **Entertainment & Arcade**: Media library with TMDB integration, mutual match discovery (*Spolu-seznam*), dedicated movie/series/game Tinder Matchers, and two-player Arcade Hub (Draw Duel, Couple Quizzes, Who Is More Likely To?, Photo Puzzle, Tetris War).

---

## 2. Quick Start & Local Setup

Setting up a fresh development environment takes under 5 minutes.

### Prerequisites

| Tool | Required Version | Purpose |
|---|---|---|
| **Node.js** | `>= 20.0.0` (LTS) | JavaScript runtime environment |
| **npm** | `>= 10.0.0` | Package and script manager |
| **Python** | `>= 3.10` | Documentation and md-document tooling |
| **Modern Browser** | Chrome / Edge / Safari / Firefox | Testing PWA and View Transitions API |

### Setup Commands

```bash
# 1. Clone the repository
git clone https://github.com/josefmvalek/project-k.git
cd project-k

# 2. Install dependencies
npm install

# 3. Start local development server (Vite)
npm run dev

## 4. Run test suites & type check
npm run test:run
npm run typecheck
```

> [!NOTE]
> The development server runs on `http://localhost:5173`. Thanks to Vite Hot Module Replacement (HMR), edits to JavaScript, CSS, and HTML are reflected instantly.

### Verification Checklist
- [ ] Dev server is running on `http://localhost:5173` without terminal or browser console errors.
- [ ] All 19 test suites (131 tests) pass cleanly via `npm run test:run`.
- [ ] Static type check passes with 0 errors via `npm run typecheck`.
- [ ] Navigating to the page renders the Discord-themed dashboard and sidebar.
- [ ] DevTools $\rightarrow$ Application confirms the Service Worker is registered and IndexedDB (`kiscord_db`) holds cached state.

---

## 3. Technology Stack & Design Decisions

Kiscord intentionally avoids heavy frontend frameworks (React, Angular). Instead, it prioritizes maximum speed, zero runtime overhead, and clean vanilla JavaScript.

| Layer | Technology | Rationale |
|---|---|---|
| **Core Frontend** | Vanilla JavaScript (ES6+ Modules) | Zero framework runtime cost, instant DOM manipulation, complete memory control |
| **Type Safety** | JSDoc + Supabase TypeScript Types | Compile-time validation without bundling step (`tsc -p jsconfig.json`) |
| **Styling & Theming** | CSS Variables + Tailwind CSS | Authentic Discord Dark theme, 7 switchable themes, glassmorphism blur effects |
| **Build Tooling** | Vite 6 | Lightning-fast startup, ES module dynamic code splitting, rapid HMR |
| **Backend & DB** | Supabase (PostgreSQL 15+) | Row Level Security (RLS), Realtime WebSockets, Storage buckets, PL/pgSQL RPCs |
| **Local Storage** | IndexedDB (`js/core/idb.js`) | Asynchronous, non-blocking, multi-gigabyte capacity for state & binary assets |
| **PWA & Offline** | Service Worker + Cache API | 3-tier caching hierarchy, zero-data-loss offline sync queue |
| **Unit Testing** | Vitest + Happy-DOM | High-speed in-memory testing without heavy browser process overhead |
| **E2E Testing** | Playwright | Multi-browser end-to-end automation for critical user journeys |
| **Hosting & CI/CD** | Vercel | Instant deployments and branch previews on every push |

---

## 4. Core Architecture & Application Lifecycle

The application operates as a **Single Page Application (SPA)** with dynamic on-demand module loading.

```
                    ┌────────────────────────┐
                    │    index.html Shell    │
                    └───────────┬────────────┘
                                │ (Initial Load)
                                ▼
                    ┌────────────────────────┐
                    │     js/app.js Init     │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  js/core/     │       │  js/core/     │       │  js/core/     │
│  auth.js      │       │  state.js     │       │  router.js    │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │ (IndexedDB Cache)     │
        │                       ▼                       ▼
        │               ┌───────────────┐       ┌───────────────┐
        │               │ js/core/      │       │ Dynamic       │
        │               │ idb.js        │       │ Module Import │
        │               └───────────────┘       └───────────────┘
        │                                               │
        └───────────────────────┬───────────────────────┘
                                ▼
                    ┌────────────────────────┐
                    │  Render Channel to DOM │
                    └───────────────┘────────┘
```

### 1. State Management (`js/core/state.js`)
- Single global reactive container `state`.
- **Pub/Sub Event Bus (`stateEvents`)**: UI modules register listeners (e.g. `stateEvents.on('health', callback)`).
- **High-Capacity Cache Persistence**: Automatically saves state snapshots asynchronously to **IndexedDB** (`kiscord_db` $\rightarrow$ `keyval` store).
- **SWR (Stale-While-Revalidate)**: Renders cached data immediately while fetching fresh records in the background (`initializeState`).

### 2. Navigation & Router (`js/core/router.js`)
- `switchChannel(channelId)` orchestrates:
  1. Invoking cleanup callbacks to terminate open WebSockets and timers.
  2. Pushing records to `history.pushState` for browser navigation.
  3. Triggering lazy data fetchers in `loaders.js`.
  4. Dynamically importing module chunks via `import()`.
  5. Rendering UI into `#main-content` using the **View Transitions API**.
  6. Closing the mobile drawer automatically.

### 3. Synchronization & Offline Queue (`js/core/offline.js`)
- Safe mutation wrappers: `safeUpsert()`, `safeInsert()`, and `safeDelete()`.
- If offline, mutations are queued in `kiscord_sync_queue` (persisted in IndexedDB).
- When `window.addEventListener('online')` fires, the queue is processed sequentially and pushed to Supabase.

---

## 5. Channel Catalog (55+ Channels Across 7 Categories)

### Category 1: 📌 Pinned (Always at Top)
- **`#dashboard`** (`dashboard.js`): Personal overview, Sunflower mood sync, hydration (8 water droplets), sleep timer and wake tracker, Fact of the Day, and quick notes.
- **`#kalendář`** (`calendar.js`): Monthly calendar combining dates, university milestones, and memory highlights with mood heatmap shading.

### Category 2: 🎓 VUT FIT & KOLEJE (University & Dorm Life)
- **`#rozvrh`** (`schedule.js`): Weekly timetable, campus building room hints, and joint free slot calculator.
- **`#studijní-plán`** (`studyPlanner.js`): WIS point tracking, credit requirements, and exam countdowns.
- **`#koleje-brno`** (`dormHub.js`): Floor laundry machine booking tracker, dorm packing checklist, and cafeteria menus.
- **`#finance`** (`financeTracker.js`): Personal Brno budget + savings goal piggy bank (*Kasička*).
- **`#počítač`** (`laptopComparison.js`): Computer specification comparison guide for CS students.

### Category 3: 🌿 ZDRAVÍ & FITNESS
- **`#posilovna`** (`gym/`): 15 submodules (active HUD, rest timer, 100+ animated GIF exercises, 1RM progression charts, muscle volume heatmap, couple gym streak, annual wrapped).
- **`#návyky`** (`habits.js`): Daily ritual tracking with Love Coins rewards.
- **`#regenerace`** (`regenerace/`): Evidence-based supplement guide and recovery science.

### Category 4: 💖 NÁŠ SVĚT & PŘÍBĚH
- **`#obchůdek`** (`loveShop.js`): Couple coupon shop and redeemed voucher inventory pantry.
- **`#plánovač-rande`** (`map.js`): Interactive Leaflet map with pinned favorite date spots and routes.
- **`#bucket-list`** (`bucketlist.js`): Shared dream bucket list with priorities and photo uploads.
- **`#společné-questy`** (`quests.js`): Cooperative missions and milestones.
- **`#denní-otázky`** (`dailyQuestions.js`) & **`#témata`** (`topics.js`): Daily conversational prompts and deep-talk card decks.
- **`#timeline`** (`timeline.js`): Photo memory timeline with lightbox gallery.
- **`#dopisy`** (`letters.js`): Time-locked message capsules for future anniversaries.
- **`#achievementy`** (`achievements.js`): Gamified relationship trophies.

### Category 5: 🎮 ZÁBAVA & MÉDIA
- **`#knihovna`** (`library.js`): Movies, series, and games catalogue with TMDB search, game modes (Staples vs Backlog), and magnet links.
- **`#watchlist`** (`watchlist.js`): Mutual matches (*Spolu-seznam*), personal wishlists, **Tinder Matcher**, and **Dice of Chance**.
- **`#gamesky`** (`gamesHub.js`): Central Arcade Hub unifying Draw Duel, Who Is More Likely To?, Couple Quizzes, Photo Puzzle, Tetris War Tracker, Tier Lists, and Fact Encyclopedia.
- **`#music-bot`** (`static.js`): Shared playlist and web audio player.

### Category 6: 📦 ARCHIV (Default Collapsed)
- **`#rakousko-kasička`** (`kasicka.js`) & **`#rakousko-info`** (`austriaInfo.js`): Alpine work earnings archive and seasonal work guidelines.
- **`#plánovač-směn`** (`shifts.js`) & **`#rakouská-němčina`** (`austrianGerman.js`): Work shift scheduler and dialect phrasebook.
- **`#matura-*`** (`matura.js`): High school graduation study tracker and knowledge base (Czech literature, IT systems, Pomodoro timer).

### Category 7: ⚙️ SYSTÉM & INFO (Default Collapsed)
- **`#statistiky`** (`stats.js`): Relationship data analytics.
- **`#nastavení`** (`settings.js`): 7 visual themes switcher (Default Dark, Light, Valentines, Christmas, Tetris, Forest, Gold), audio/haptics, and cache tools.
- **`#changelog`** (`changelog.js`): Release version history.

---

## 6. Database Schema & Security (Supabase)

Database operations run on PostgreSQL 15+ in Supabase with strict **Row Level Security (RLS)** enforcement.

```
                    ┌─────────────────────────┐
                    │      auth.users         │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     public.profiles     │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ health_data  │         │ gym_workouts │         │app_finances  │
└──────────────┘         └───────┬──────┘         └──────────────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │   gym_sets   │
                         └──────────────┘
```

### Security Archetypes:
1. **Private Personal Tables** (`app_finances`, `health_data`, `gym_body_measurements`):
   - Policy: `auth.uid() = user_id`. User records remain completely isolated.
2. **Shared Couple Tables** (`library_content`, `timeline_events`, `planned_dates`, `dorm_checklist`):
   - Policy: `authenticated` users have full read and write access.

---

## 7. Developer Cookbook & Common Recipes

### Recipe A: Adding a New Channel / Feature

1. Create `js/modules/myFeature.js`:
   ```javascript
   import { state, stateEvents } from '../core/state.js';
   import { safeUpsert } from '../core/offline.js';

   export async function renderMyFeature() {
       const root = document.getElementById('main-content');
       root.innerHTML = `
           <div class="channel-header">
               <h2><i class="fa-solid fa-star text-accent"></i> My New Feature</h2>
           </div>
           <div class="card p-4">Feature content goes here...</div>
       `;
   }
   ```

2. Register in `js/core/router.js`:
   ```javascript
   export const moduleMap = {
       // ... existing modules ...
       'my-feature': () => import('../modules/myFeature.js'),
   };
   ```

3. Add channel definition to `channelCategories` in `js/core/router.js`.

### Recipe B: Creating a Database Migration

1. Create a migration file in `supabase/migrations/YYYYMMDD_feature_name.sql`:
   ```sql
   CREATE TABLE public.my_custom_table (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
       title TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE public.my_custom_table ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Allow authenticated" ON public.my_custom_table
       FOR ALL TO authenticated USING (true) WITH CHECK (true);
   ```

### Recipe C: Running Tests

```bash
# Run unit and integration tests
npm run test:run

# Run interactive test watcher
npm test

# Run Playwright E2E tests
npm run test:e2e
```

---

## 8. Troubleshooting & Debugging Guide

> [!IMPORTANT]
> **Common developer issues and fixes:**

1. **Client displays stale build after deployment**:
   - Increment `CACHE_NAME` in `public/sw.js`.
   - In the application, open `#nastavení` and trigger **"Clear Cache and Reload"**.

2. **Offline queue failed to synchronize**:
   - Inspect `localStorage.getItem('kiscord_sync_queue')` in DevTools.
   - Check console logs for database constraint errors.

3. **RLS permission denied (403)**:
   - Ensure the user is logged in with a valid session via `supabase.auth.getSession()`.
   - Verify that an active policy exists on the table for role `authenticated`.

---

## 9. Role-Specific Guidance

- **👶 Junior Developer**: Review `tests/unit/` to understand module APIs and start with UI component tweaks.
- **🧑‍💻 Senior Architect**: Inspect database indexes in `supabase/migrations/` and enforce cleanup hook discipline in `router.js`.
- **🤝 Contributor**: Always verify that `npm run test:run` passes before submitting PRs, following conventional commits (`feat:`, `fix:`, `docs:`).

---
*Documentation compiled for project Kiscord.*
