# ADR-0004: Standardized Module Lifecycle Interface & Router Decoupling

## Status
Accepted

## Context
`router.js` byl přetížen specifickou logikou jednotlivých modulů a dosahoval 1 440+ řádků kódu. Chyběl standardizovaný životní cyklus modulů, což vedlo k riziku memory leaků (neukončené intervaly, WebSockets a listenery).

## Decision Drivers
* Redukce velikosti a komplexity routeru
* Automatizace úklidu zdrojů (Memory Management)
* Snadné zapojení nových modulů bez zásahu do jádra routeru

## Decision
1. Zavedení `AppModule` rozhraní (`mount`, `unmount`, `onStateChange`) a `CleanupCollector` v `js/core/module-lifecycle.js`.
2. Dekompozice `router.js` do podmodulů v `js/core/router/` (`channel-registry.js`, `navigation.js`, `module-loader.js`).
3. `js/core/router.js` slouží jako čistá fasáda.

## Consequences
### Positive
* Router je rozdělen do modulárních, testovatelných komponent
* Automatická prevence memory leaků přes `CleanupCollector`
* Zachována 100% zpětná kompatibilita pro stávající moduly přes `wrapLegacyModule`

### Negative
* Žádná významná negativa
