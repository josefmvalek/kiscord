# 🤖 Kiscord — Project & Agent Development Guide (AGENTS.md)
> Tento soubor je automaticky načítán do každé session Antigravity. Definuje architekturu, domény, technologický stack, pravidla a postupy pro vývoj aplikace Kiscord.

---

## 1. Identita projektu & Základní filozofie
- **Kiscord** je privátní, vysoce optimalizovaná **Progressive Web App (PWA)** pro dva uživatele (Josef & Klárka), vizuálně a strukturálně stylizovaná po vzoru **Discordu** (tmavý režim, glassmorphism, servery, kanály, boční panely).
- Aplikace propojuje:
  - Studentský život a VUT FIT (rozvrhy, WIS body, koleje Brno, finance).
  - Zdraví a fitness (posilovna, aktivní cvičení, PR analýzy, regenerace, spánek).
  - Partnerský život a vzpomínky (timeline, párové questy, obchůdek s Love Coins, tinder matcher, plánovač rande).
  - Zábavu a média (filmová/herní knihovna s TMDB, minihry, párové kvízy).

---

## 2. Technologický stack & Omezení
- **Runtime & Jazyk**: Čistý **Vanilla JavaScript (ES6+ Modules)**, HTML5, moderní CSS3 a **Tailwind CSS v4** (`@tailwindcss/postcss`).
  - ⚠️ **ZÁKAZ**: Nepřidávat žádné těžké frameworky (React, Vue, Angular, Svelte). Celá aplikace stojí na čistém DOMu a modulárním Vanilla JS.
- **Bundler & Dev Server**: **Vite v6** (`npm run dev`, `npm run build`).
- **Testovací framework**: **Vitest** pro unit/integrační testy (`npm run test:run`) s `happy-dom`. **Playwright** pro E2E (`npm run test:e2e`).
- **Typová kontrola**: **TypeScript v7** v režimu `tsc -p jsconfig.json` (`npm run typecheck`).
- **Backend & Databáze**: **Supabase** (PostgreSQL, Realtime subskripce, Storage, Edge Functions, Row Level Security).
- **PWA & Offline**: Service Worker (`sw.js`), IndexedDB (`js/core/idb.js`), offline synchronizační fronta (`js/core/offline.js`).

---

## 3. Architektura adresářů (Domain-Driven Design)

> ⚠️ **KRITICKÉ PRAVIDLO: Složka `/js/modules/` byla zrušena a refaktorována!**  
> Nikdy nevytvářej ani nehledej soubory v `/js/modules/`. Veškerá logika žije v:

```text
js/
├── core/                       # Základní systémové služby
│   ├── router/                 # Navigace, registry kanálů a module loader
│   │   ├── channel-registry.js # Definice kanálů, kategorie, ikony, oblíbené
│   │   ├── module-loader.js    # ROUTE_REGISTRY a dynamické importy
│   │   └── navigation.js       # switchChannel, mobilní navigace, breadcrumbs
│   ├── repositories/           # SWR repozitáře (BaseRepository)
│   ├── state/                  # State management a domain slices
│   ├── state.js                # Globální state aplikace (Single Source of Truth)
│   ├── signals.js              # Reaktivní signály a efekty (createSignal, createEffect)
│   ├── idb.js                  # IndexedDB úložiště pro offline cache a sync frontu
│   ├── offline.js              # Safe storage, operace safeUpsert / safeDelete
│   ├── sync.js                 # Supabase realtime synchronizace
│   ├── loaders.js              # Lazy-loadery dat s kontrolou isStale()
│   ├── module-lifecycle.js     # Lifecycle management (onMount, onDestroy, CleanupCollector)
│   └── app-ui.js, theme.js, ...# UI utility, audio, theme switcher (7 témat)
├── domains/                    # Aplikační domény (Domain-Driven Design)
│   ├── university/             # VUT FIT: study-planner, dorm-hub, schedule, finance
│   ├── fitness/                # gym (tracker, templates, analytics), bodyMetrics, nutrition
│   ├── couple/                 # love-shop, dateplanner, timeline, bucketlist, letters
│   ├── entertainment/          # library (filmy/hry), watchlist, games-hub, quests
│   ├── lifestyle/              # dashboard (#můj-den), calendar, habits
│   ├── system/                 # settings, changelog, manual, stats, profile
│   └── archive/                # Historické moduly (Rakousko, maturita)
├── shared/                     # Znovupoužitelné UI komponenty, DOM helpers, modaly
├── types/                      # TypeScript definice (database.d.ts)
└── main.js                     # Bootstrapper aplikace
```

---

## 4. Klíčové architektonické konvence pro Agenta

### A. Práce se stavem (State & Signals)
1. **Nikdy nemutuj stav nekontrolovaně**: Globální stav žije v `state` v [js/core/state.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/state.js).
2. Pro ukládání do mezipaměti volej `saveStateToCache()` (automaticky ukládá do IndexedDB i `localStorage`).
3. Pro reaktivní UI komponenty používej signály z [js/core/signals.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/signals.js) (`createSignal`, `createEffect`).

### B. Databáze, SWR Repozitáře & Offline Sync
1. Pro práci s daty z tabulek používej repozitáře z `js/core/repositories/` dědící z `BaseRepository` (poskytují Stale-While-Revalidate cachování a offline odolnost).
2. Pro přímé zápisy do Supabase volej `safeUpsert(table, data, matchKeys)`, `safeInsert()`, `safeDelete()` z [js/core/offline.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/offline.js). Tyto metody automaticky obslouží lokální optimistický update a v případě výpadku zařadí operaci do IndexedDB synchronizační fronty.
3. RLS politiky jsou nastaveny pro 2 uživatele — vždy respektuj `user_id` a partnerskou relaci.

### C. Stylování & Discord Design Tokens
1. Kiscord kombinuje **Tailwind CSS v4** s Discord CSS proměnnými:
   - Pozadí: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-tertiary)`, `var(--card-bg)`
   - Text: `var(--text-header)`, `var(--text-normal)`, `var(--text-muted)`
   - Akcenty: `var(--accent-primary)`, `var(--accent-hover)`, `var(--discord-blurple)`
   - Efekty: Glassmorphism `backdrop-blur-md`, `border-white/10`
2. **Haptika**: Při interakcích volej `triggerHaptic('light' | 'medium' | 'success')`.

### D. Životní cyklus modulů (Lifecycle)
Každý kanálový modul montovaný přes router by měl podporovat čisté odpojení (prevence memory leaků a běžících intervalů):
- Využívej `CleanupCollector` nebo vracej objekt `{ unmount: () => { ... } }` / `onDestroy`.

---

## 5. Povinný ověřovací rituál (Quality Gates)
Po provedení jakýchkoliv změn v kódu **VŽDY** spusť:
1. **Typová kontrola**: `npm run typecheck` — musí projít bez chyb.
2. **Unit testy**: `npm run test:run` — všech 75 testovacích souborů (528+ testů) musí projít.
3. Pokud vytváříš nový kanál nebo funkci, přidej unit test do `tests/unit/`.

---

## 6. Odkazy na Architecture Decision Records (ADR)
Před zásadními úpravami jádra nahlédni do [docs/adr/](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/docs/adr/):
- `0001`: Vanilla JS & SWR Architecture
- `0002`: Supabase PostgreSQL & Row Level Security
- `0003`: Domain Store Slices
- `0004`: Module Lifecycle & Router Decoupling
- `0005`: Resilient Offline Sync & Conflict Detection
- `0006`: Reactive Signals Engine
- `0007`: WebRTC Peer-to-Peer Data Channel
- `0008`: Client-Side AES-GCM Encrypted Backup
- `0010`: Database Performance & Unified Bootstrap
- `0011`: Test Suite Architecture & Fixtures
