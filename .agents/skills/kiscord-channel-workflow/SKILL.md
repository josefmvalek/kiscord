---
name: kiscord-channel-workflow
description: >-
  Standard operating procedure for adding, refactoring, or testing channels and domain modules in Kiscord.
  Trigger whenever creating a new channel, adding a sidebar item, mounting a new view, or wiring up a domain module in js/domains/.
---

# Kiscord Channel & Domain Workflow

This runbook guides you through creating or modifying channels in Kiscord adhering to the Domain-Driven Architecture and the Router Facade.

---

## Architecture Overview
Every channel in Kiscord follows a 5-step integration lifecycle:
1. **Sidebar Category Entry**: Defined in `js/core/router/channel-registry.js`.
2. **Route Loader Mapping**: Defined in `js/core/router/module-loader.js` (inside `ROUTE_REGISTRY`).
3. **Domain Implementation**: Located in `js/domains/<domain>/<feature>.js` or `js/domains/<domain>/<feature>/index.js`.
4. **Data Loader & SWR Cache**: Registered in `js/core/loaders.js` using `isStale()`.
5. **Unit Verification**: Tested in `tests/unit/<feature>.test.js`.

---

## Step 1: Register Channel in `channel-registry.js`
Open [js/core/router/channel-registry.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/router/channel-registry.js) and add the channel item into the appropriate category in `channelCategories`:

```javascript
{
    id: 'my-new-channel',
    name: 'Můj Nový Kanál',
    icon: '✨',             // Emoji icon
    type: 'domain_name',     // e.g. 'lifestyle', 'fitness', 'university', 'couple'
    color: '#8b5cf6',       // Hex accent color
    desc: 'Krátký popis kanálu pro tooltip a vyhledávání'
}
```

---

## Step 2: Map Route in `module-loader.js`
Open [js/core/router/module-loader.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/router/module-loader.js) and add the dynamic import to `ROUTE_REGISTRY`:

```javascript
'my-new-channel': {
    loader: () => import('../../domains/<domain>/my-feature.js'),
    render: (m, c, channelId, params) => m.renderMyFeature(c, params)
}
```
*Note: `c` is the main content container element `#main-content`.*

---

## Step 3: Implement Domain Module
Create or edit the module in `js/domains/<domain>/my-feature.js`.
Always support clean unmounting and prevent memory leaks:

```javascript
import { CleanupCollector } from '../../core/module-lifecycle.js';
import { state } from '../../core/state.js';
import { triggerHaptic } from '../../core/utils.js';

export async function renderMyFeature(container, params = {}) {
    const cleanups = new CleanupCollector();
    
    container.innerHTML = `
        <div class="channel-view p-6 max-w-5xl mx-auto">
            <h1 class="text-2xl font-bold text-[var(--text-header)] mb-4">Můj Nový Kanál</h1>
            <div id="my-feature-content" class="bg-[var(--bg-secondary)] border border-white/5 rounded-xl p-4 backdrop-blur-md">
                <!-- Content here -->
            </div>
        </div>
    `;

    // Example event listener with automatic cleanup
    const btn = container.querySelector('#some-button');
    if (btn) {
        cleanups.addEventListener(btn, 'click', () => {
            triggerHaptic('light');
            // Action
        });
    }

    // Return cleanup hook for the router
    return {
        unmount() {
            cleanups.cleanup();
        }
    };
}
```

---

## Step 4: Add Data Loader (If loading from Supabase)
In [js/core/loaders.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/loaders.js):
```javascript
export async function ensureMyFeatureData(force = false) {
    const key = 'my_feature_data';
    if (!force && !isStale(key, 15)) return; // Cache for 15 minutes
    
    // Fetch via repository or Supabase
    // Update state.myFeature
    markLoaded(key);
}
```

---

## Step 5: Verification & Quality Gate
Run the automated verification suite:
```bash
npm run typecheck
npm run test:run
```
Add unit tests in `tests/unit/my-new-channel.test.js` verifying the render and state interactions.
