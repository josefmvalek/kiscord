# State Management

Kiscord používá centralizovaný, reaktivní systém správy stavu (state management) založený na jediném globálním objektu `state`. Tento systém zajišťuje synchronizaci mezi databází, lokální pamětí a uživatelským rozhraním.

## 1. Globální Objekt `state`
Definován v `js/core/state.js`, objekt `state` obsahuje všechna data aplikace – od zdravotních záznamů po nastavení témat.

### Ukázka definice (zkráceno):
```javascript
const state = {
    currentChannel: "welcome",
    healthData: {},
    library: { movies: [], series: [], games: [] },
    achievements: [],
    settings: {
        theme: 'default',
        haptics: true
    },
    // Příznaky pro lazy loading
    _loaded: {
        calendar: false,
        library: false,
        achievements: false
    }
};
```

## 2. Event Bus (`stateEvents`)
Pro zajištění reaktivity UI bez použití těžkých frameworků (jako React) používá Kiscord jednoduchý **Pub/Sub (Publish/Subscribe)** model.

- **`stateEvents.on(event, callback)`**: Zaregistruje posluchače na změnu určité části stavu.
- **`stateEvents.emit(event, data)`**: Vyvolá upozornění pro všechny připojené komponenty, že se data změnila a je třeba je znovu vyrenderovat.

### Příklad použití:
```javascript
// V modulu pro renderování
stateEvents.on('health', () => {
    renderHealthUI();
});

// V modulu pro ukládání dat
function updateWater(val) {
    state.healthData[today].water = val;
    stateEvents.emit('health'); // Spustí re-render
}
```

## 3. Caching & Persistence
Aplikace využívá `localStorage` pro ukládání stavu, což umožňuje okamžitý start aplikace i v offline režimu.

- **`saveStateToCache()`**: Serializuje vybrané části objektu `state` a uloží je pod klíčem `kiscord_state_cache`.
- **`loadStateFromCache()`**: Načte data při inicializaci aplikace.
- **SWR (Stale-While-Revalidate)**: Aplikace nejprve zobrazí data z cache a na pozadí provede fetch z Supabase pro aktualizaci (`initializeState`).

## 4. Lazy Loading Dat
Z důvodu optimalizace výkonu a šetření dat se ne všechna data stahují při startu. Každý modul má svého „energetika“ (např. `ensureCalendarData`), který:
1. Zkontroluje, zda jsou data už načtena (`state._loaded`).
2. Pokud ne (nebo pokud jsou data „stale“ – starší než 5 minut), provede fetch z Supabase.
3. Označí data za načtená a emituje událost pro UI.

```javascript
async function ensureLibraryData(force = false) {
    if (state._loaded.library && !force && !isStale('library')) return;
    // ... fetch logic ...
    markLoaded('library');
    stateEvents.emit('library');
}
```

## 5. Offline Queue
Všechny zápisové operace (Upsert, Insert, Delete) prochází přes `js/core/offline.js`, který v případě výpadku sítě ukládá požadavky do fronty a synchronizuje je po obnovení spojení.
