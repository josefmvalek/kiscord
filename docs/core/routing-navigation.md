# Routing & Channel Navigation

> Kiscord is built as a **Single Page Application (SPA)**. Navigation never refreshes the browser page; all view transitions are handled by dynamic DOM swaps, dynamic ES module imports, and the Browser History API.

---

## 1. Central Router (`js/core/router.js`)

At the center of the navigation architecture is `switchChannel(channelId)`. This function manages the complete transition lifecycle:

### Channel Switch Lifecycle:
1. **Deduplication**: Checks if the requested channel is already active.
2. **History State**: Pushes an entry to `history.pushState` so browser Back/Forward buttons work seamlessly.
3. **UI Cleanup**: Invokes registered cleanup functions to terminate open WebSockets and timers from the previous module (e.g. `drawCleanup()`).
4. **Lazy Loading**: Imports the target module dynamically via `import()`.
5. **Data Fetching**: Initiates on-demand data retrieval via `loaders.js` (e.g. `ensureCalendarData()`).
6. **Rendering**: Executes the module's primary render routine into `#main-content`.
7. **Mobile Drawer**: Automatically closes the sidebar drawer on mobile viewports.

---

## 2. Module Map (`moduleMap`)

The router maintains an asynchronous map of channel IDs to file paths, downloading JavaScript chunks only when the user first opens that channel:

```javascript
export const moduleMap = {
    'calendar': () => import('../modules/calendar.js'),
    'timeline': () => import('../modules/timeline.js'),
    'gym': () => import('../modules/gym/main.js'),
    'library': () => import('../modules/library.js'),
    // ... additional modules ...
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
