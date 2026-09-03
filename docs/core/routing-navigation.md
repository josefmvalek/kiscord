# Routing & Channel Navigation

> Kiscord is built as a **Single Page Application (SPA)**. Navigation never refreshes the browser page; all view transitions are handled by dynamic DOM swaps, dynamic ES module imports, and the Browser History API.

---

## 1. Decoupled Router & Facade (`js/core/router/` & `js/core/router.js`)

Channel navigation is organized into decoupled services exposed through a unified facade:
- **`channel-registry.js`**: Channel definitions, category grouping, icons, colors, and favorites.
- **`module-loader.js`**: Declarative `ROUTE_REGISTRY` mapping channel IDs to lazy dynamic imports and render adapters.
- **`navigation.js`**: Navigation engine handling URL history, View Transitions, breadcrumbs, and mobile drawer.
- **`router.js`**: Central facade re-exporting the router API.

At the center of the navigation architecture is `switchChannel(channelId)`. This function manages the complete transition lifecycle:

### Channel Switch Lifecycle:
1. **Deduplication**: Checks if the requested channel is already active.
2. **History State**: Pushes an entry to `history.pushState` so browser Back/Forward buttons work seamlessly.
3. **UI Cleanup**: Invokes registered cleanup functions (`unmount()`) via `CleanupCollector` from `module-lifecycle.js`.
4. **Lazy Loading**: Imports the target domain module dynamically via `import()`.
5. **Data Fetching**: Initiates on-demand data retrieval via `loaders.js` (e.g. `ensureCalendarData()`).
6. **Rendering**: Executes the module's primary render routine into `#main-content` wrapped in View Transitions.
7. **Mobile Drawer**: Automatically closes the sidebar drawer on mobile viewports.

---

## 2. Route Registry (`ROUTE_REGISTRY`)

Located in `js/core/router/module-loader.js`, `ROUTE_REGISTRY` maps channel IDs to lazy domain imports and render adapters:

```javascript
export const ROUTE_REGISTRY = {
    'calendar': {
        loader: () => import('../../domains/lifestyle/calendar/index.js'),
        render: (m) => m.renderCalendar()
    },
    'gym': {
        loader: () => import('../../domains/fitness/gym/index.js'),
        render: (m, c) => m.renderGym(c)
    },
    'library': {
        loader: () => import('../../domains/entertainment/library/index.js'),
        render: (m, c) => m.renderLibrary(c)
    },
    // ... additional domain routes ...
};
```

---

## 3. Sidebar Categories & Collapsible Sections

The sidebar structure is defined in `channelCategories`. Channels are grouped into authentic Discord-style categories:
- `name`: Category header with styled icon (e.g., `🎓 VUT FIT & KOLEJE`, `🌿 ZDRAVÍ & FITNESS`, `💬 NÁŠ SVĚT & RANDE`, `📦 ARCHIV`).
- `items`: Channel list containing `id`, `name`, `icon`, `color`, and `desc`.

### Collapsible Category Features:
- Clicking a category header (`.category-header`) toggles its collapsed state with an animated chevron.
- Archive and System categories (`DEFAULT_COLLAPSED_CATEGORIES`) are collapsed by default.
- Collapse state (`collapsedCategories`) is persisted to `localStorage` and synced with the user's profile.
- Switching to a channel residing inside a collapsed category automatically expands that category to keep the active channel in view.

---

## 4. View Transitions API

Kiscord leverages the native **View Transitions API** (`document.startViewTransition`) to provide smooth, app-like animated transitions between channels.

---

## 5. Browser History Integration

In `main.js`, a `popstate` listener ensures native back/forward button navigation:

```javascript
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.channel) {
        switchChannel(e.state.channel, false); // false = do not push duplicate history entry
    }
});
```
