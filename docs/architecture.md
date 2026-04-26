# Architektura a Jádro Aplikace

Tento dokument slouží jako hlavní rozcestník pro pochopení technického fungování aplikace Kiscord. Aplikace je navržena jako moderní, reaktivní PWA (Progressive Web App) s důrazem na modularitu a real-time synchronizaci.

## 🏗️ Celkové schéma
Aplikace využívá **Single Page Architecture (SPA)** s dynamickým načítáním modulů (Lazy Loading). To zajišťuje bleskové reakce a plynulé přechody mezi „kanály“.

### Hlavní pilíře architektury:

1. **Vstupní bod (`main.js`)**:
   - Inicializuje Supabase připojení a autentizaci.
   - Registruje Service Workera pro PWA.
   - Spouští hlavní UI smyčku a nastavuje globální event listenery.

2. **[State Management](./core/state-management.md)**:
   - Centrální objekt `state` drží aktuální data aplikace.
   - Využívá Pub/Sub systém pro distribuci změn do UI komponent.
   - Zajišťuje automatické verzování a ukládání do `localStorage` pro okamžitý start v offline režimu.

3. **[Routing a Navigace](./core/routing-navigation.md)**:
   - Simulace „Discord kanálů“ pomocí asynchronního routeru.
   - Podpora **View Transitions API** pro hladké animace mezi sekcemi.
   - Automatický úklid (cleanup) paměti při přepínání modulů.

4. **[Synchronizace a Real-time](./core/sync-realtime.md)**:
   - Přímé napojení na Supabase Realtime (PostgreSQL Changes).
   - Mechanismy pro řešení konfliktů při simultánní editaci oběma partnery.
   - **Sync Queue**: Fronta pro odložené odeslání změn provedených v offline režimu.

---

## 🛠️ Modulární Systém
Každá sekce aplikace (např. Kalendář, Maturita, Mapa) je samostatným JS modulem v adresáři `/js/modules/`. Tyto moduly jsou izolovány a komunikují s jádrem pomocí standardizovaného API.

*Pro detailnější technický popis jednotlivých částí jádra klikni na odkazy výše.*
