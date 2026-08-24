# ADR-0006: Lightweight Reactive Signals Engine

## Status
Accepted

## Context
Aplikace Kiscord vyžadovala jemnozrnnou reaktivitu bez frameworkového runtime balíku, aby se eliminovalo zbytečné přerenderování celých DOM podstromů a ztráta focusu ve formulářích při dynamických změnách stavu (např. odpočet stopek, logování vody).

## Decision
Zavést nativní **Signals Engine** (`createSignal`, `createEffect`, `createComputed`, `bindText`, `bindClass`, `bindAttr`) v [js/core/signals.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/signals.js) o velikosti ~60 řádků Vanilla JS.

## Consequences
### Positive
* Bleskové selektivní DOM mutace
* Nulový runtime overhead
* Snadná integrace s existujícím stavem
