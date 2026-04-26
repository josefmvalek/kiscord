# Routing a Navigace

Kiscord je **Single Page Application (SPA)**. To znamená, že se stránka nikdy fyzicky nerestartuje; veškerá změna obsahu probíhá dynamickou výměnou DOM elementů a manipulací s browser history API.

## 1. Centrální Router (`js/core/router.js`)
Srdcem navigace je funkce `switchChannel(channelId)`. Tato funkce zodpovídá za kompletní životní cyklus přepnutí obrazovky.

### Proces přepnutí kanálu:
1. **Analýza**: Ověří, zda už na daném kanálu nejsme.
2. **Historie**: Přidá záznam do `history.pushState`, aby fungovalo tlačítko „Zpět“.
3. **UI Clean-up**: Zavolá cleanup funkce pro Realtime listenery předchozího modulu (např. `drawCleanup()`).
4. **Lazy Loading**: Importuje příslušný JS modul pomocí dynamického `import()`.
5. **Data Fetch**: Většina modulů před renderem zavolá `ensure*Data()` ze systému State.
6. **Render**: Zavolá hlavní renderovací funkci modulu (např. `m.renderTimeline()`).
7. **Mobilní UI**: Automaticky zavře postranní sidebar na mobilních zařízeních.

## 2. Mapa Modulů (`moduleMap`)
Router udržuje mapování ID kanálů na cesty k jejich souborům. Díky tomu se kód pro konkrétní sekci (např. Mapa) stáhne do prohlížeče až ve chvíli, kdy ji uživatel poprvé otevře.

```javascript
export const moduleMap = {
    'calendar': () => import('../modules/calendar.js'),
    'timeline': () => import('../modules/timeline.js'),
    'matura': () => import('../modules/matura.js'),
    // ... další moduly ...
};
```

## 3. Kategorie a Sidebar
Definice struktury sidebaru je uložena v poli `channelCategories`. Každá položka obsahuje:
- `id`: Interní identifikátor pro routing.
- `name`: Zobrazený název v menu.
- `icon`: HTML pro FontAwesome ikonu.
- `color`: Akcentní barva ikony.

## 4. View Transitions (Experimentální)
Kiscord podporuje **View Transitions API** pro hladké animace mezi sekcemi (pokud to prohlížeč podporuje). To zajišťuje plynulé „přeblikávání“ obsahu, které působí nativněji.

## 5. Podpora tlačítka Zpět
V `main.js` je zaregistrován listener na událost `popstate`:
```javascript
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.channel) {
        switchChannel(e.state.channel, false); // false = nepřidávat znovu do historie
    }
});
```
