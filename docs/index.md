# Kiscord — Projektová Dokumentace

Vítejte v hlavní dokumentaci projektu **Kiscord**. Tato dokumentace slouží jako technický průvodce architekturou, databázovým modelem a funkčními moduly aplikace.

## 1. O Projektu
Kiscord je vysoce personalizovaná **Progressive Web App (PWA)** navržená pro specifické potřeby dvou uživatelů (**Jožka** a **Klárka**). Aplikace kombinuje prvky sociální platformy, studijního asistenta, zdravotního trackeru a sdíleného archivu vzpomínek.

### Hlavní Vize
- **Soukromí**: Uzavřený systém pro dva lidi.
- **Vizuální styl**: Inspirováno Discordem (Dark mode, sidebar, terminologie kanálů).
- **Dostupnost**: Plná podpora offline režimu (PWA) a real-time synchronizace.

## 2. Technologický Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Custom Tokens).
- **Backend & DB**: [Supabase](https://supabase.com/) (Auth, PostgreSQL, Realtime, Storage).
- **PWA**: Service Worker (Cache API), Manifest.
- **Hostování**: [Vercel](https://vercel.com/).

## 3. Struktura Dokumentace

### 🏛️ [Architektura a Jádro](./architecture.md)
Jak aplikace funguje pod kapotou: state management, routing a synchronizace.
- [State Management](./core/state-management.md)
- [Routing a Navigace](./core/routing-navigation.md)
- [Sync a Realtime](./core/sync-realtime.md)

### 💾 [Databázový Model](./database.md)
Detailní popis tabulek v Supabase, RLS politik a RPC funkcí.

### 🧩 [Moduly a Kanály](./modules/index.md)
Podrobný popis každé sekce aplikace:
- **[Denní rutina (Core Features)](./modules/core-features.md)**: Dashboard, Zdraví, Kalendář.
- **[Vzdělávání](./modules/education.md)**: Maturita 2026, Regenerace.
- **[Zábava](./modules/interactivity.md)**: Hry, Kvízy, Tier Listy.
- **[Vzpomínky](./modules/journey.md)**: Timeline, Mapa, Dopisy.

### 🚀 [DevOps a Deployment](./dev-ops.md)
Informace o sw.js, verzování a deploymentu na Vercel.

---
*Poslední aktualizace: 2026-04-20*
