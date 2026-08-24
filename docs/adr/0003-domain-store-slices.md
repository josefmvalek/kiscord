# ADR-0003: Modularize State Management into Domain Store Slices & Reactive Bus

## Status
Accepted

## Context
Monolitický `state.js` obsahoval přes 650 řádků a míchal data z 50 různých domén bez jasných hranic.

## Decision Drivers
* Zlepšení čitelnosti a udržovatelnosti kódu
* Možnost izolovaného unit testování jednotlivých doménových storů
* Zachování 100% zpětné kompatibility pro existující moduly přes Facade pattern

## Decision
Rozdělit `state.js` do samostatných doménových sliců v `js/core/state/`:
- `auth-store.js`
- `gym-store.js`
- `health-store.js`
- `couple-store.js`
- `fit-store.js`
- `media-store.js`
- `settings-store.js`
- `event-bus.js`
- `store-persistence.js`
A ponechat `js/core/state.js` jako fasádu agregující všechny slicy.

## Consequences
### Positive
* Čisté rozdělení zodpovědností (Separation of Concerns)
* Typovaný `EventBus` s možností `unsubscribe`
* Zero breaking changes pro stávající moduly

### Negative
* Nutnost spravovat více modulů ve složce `js/core/state/`
