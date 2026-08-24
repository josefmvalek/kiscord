# ADR-0001: Pure Vanilla JS Architecture with Dynamic ES Modules and SWR Cache

## Status
Accepted

## Context
Aplikace Kiscord slouží jako osobní a párové operační centrum (PWA) pro mobilní i desktopová zařízení.
Vyžaduje okamžitý náběh (okolo 100-200ms), offline provoz a plynulý chod na mobilních prohlížečích bez latence.

## Decision Drivers
* Blesková odezva a minimální velikost bundle
* Nativní integrace s moderními Web API (View Transitions, Haptics, IDB)
* Snadná rozšiřitelnost o desítky nezávislých modulů

## Considered Options
* **Option 1: React / Next.js SPA** (Vysoký runtime overhead, hydration cost, pomalejší initial paint na mobilech)
* **Option 2: Pure Vanilla JS + ES Modules + Vite** (Zero framework bundle, nativní DOM, manuální správa stavu)
* **Option 3: Svelte** (Kompilovaný bez runtime, ale vyžaduje specifický toolchain a komponentový vendor lock-in)

## Decision
Zvolili jsme **Pure Vanilla JS (ES6+)** s nástrojem **Vite**, dynamickým lazy-loadingem přes `import()` a víceúrovňovým SWR cachem (IndexedDB + localStorage).

## Consequences
### Positive
* Okamžitý first paint z lokální paměti bez čekání na hydrataci
* Plná kontrola nad DOM životním cyklem a přechody přes View Transitions API
* Minimální závislosti třetích stran

### Negative
* Nutnost vlastní správy UI reaktivity a životního cyklu komponent
* Absence automatického VDOM diffingu
