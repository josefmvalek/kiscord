# 📚 Kiscord — Project & Technical Documentation

> **Welcome to the central technical documentation hub for Kiscord.**  
> This documentation serves as a reference guide for the system architecture, Supabase database schemas, functional modules, and DevOps processes.

---

## ⚡ Quick Navigation

| Section | Document | Description |
|---|---|---|
| 🚀 **Onboarding & Setup** | [Interactive HTML Guide](./developer-onboarding.html) \| [Markdown Version](./developer-onboarding.md) | Single-file interactive developer guide with sticky TOC, real-time search, and code copying |
| 📅 **Kalendář 2.0 Spec** | [Interactive HTML Spec](./calendar-2.0.html) \| [Markdown Spec](./modules/calendar-2.0.md) | Full technical specification: 24h time-grid, collision engine, fit-viewport month grid, daily briefing, and mobile UX |
| 🏛️ **Architecture & Core** | [System Architecture](./architecture.md) | SPA lifecycle, SWR repositories, dynamic module lazy loading, View Transitions |
| 📑 **ADR Index** | [Architecture Decision Records](./adr/README.md) | Records of all 10 architectural decisions (ADR 0001–0010) following the MADR standard |
| 🗺️ **Strategy & Roadmap** | [Strategy & Roadmap](./STRATEGY_AND_ROADMAP.md) | Comprehensive development roadmap, milestones, and release strategy |
| 💾 **Database & Backend** | [Database Model & Supabase](./database.md) | PostgreSQL table schemas, Row Level Security (RLS) policies, RPCs, and Storage buckets |
| ⚙️ **DevOps & PWA** | [DevOps, PWA & Caching](./dev-ops.md) | Service Worker (3-tier cache strategy), offline sync queue, build & Vercel deployment |
| 🧩 **Module Catalog** | [All Channels Overview](./modules/index.md) | 55+ channels organized across 7 categories |
| 🤖 **AI Model Index** | [LLM Context Index](../llms.txt) | Token-efficient context file for AI coding assistants |

---

## 🏗️ About the Project

Kiscord is a highly personalized **Progressive Web App (PWA)** tailored to the specific needs of two users (**Josef and Klárka**). It seamlessly combines couple life management, VUT FIT university companion tools, a comprehensive fitness and health tracker, a media entertainment center, and a shared memory archive.

### Core Architectural Pillars:
1. **Privacy & Security**: Closed two-user system guarded by Supabase Row Level Security (RLS).
2. **Discord Dark Aesthetics**: Authentic visual style (glassmorphism, collapsible channel sidebar, 7 switchable themes, fluid micro-interactions).
3. **Full Offline Resilience**: Service Worker (`public/sw.js`), `localStorage` cache hydration, and asynchronous `kiscord_sync_queue`.
4. **Real-time Synchronization**: Instant data and event broadcast across devices via Supabase Realtime WebSockets.

---

## 🗺️ Documentation Structure

```
docs/
├── developer-onboarding.html   # Interactive single-file HTML documentation (md-document)
├── developer-onboarding.md     # Source Markdown guide for engineers
├── index.md                    # Main documentation index
├── architecture.md             # Core architecture and lifecycle
├── database.md                 # Supabase PostgreSQL schemas, RLS, and Storage
├── dev-ops.md                  # PWA, Service Worker caching, and CI/CD
├── core/
│   ├── routing-navigation.md   # Asynchronous router, categories, and View Transitions
│   ├── state-management.md     # Global reactive state container and Pub/Sub event bus
│   └── sync-realtime.md        # Realtime WebSocket channels, presence, and broadcasts
└── modules/
    ├── index.md                # 55+ module index
    ├── core-features.md        # Dashboard (Můj Den), Health, and Calendar
    ├── vut-fit.md              # Timetable, WIS Points, Dorm Hub, and Personal Finance
    ├── gym.md                  # Complete Gym Tracker, Active HUD, Rest Timer, and PRs
    ├── journey.md              # Love Shop, Date Planner Map, Bucket List, Timeline, Letters
    ├── interactivity.md        # Media Library, Shared Watchlist, Tinder Matcher, Arcade Hub
    ├── education.md            # Recovery Guide, Graduation Knowledge Base, Alpine Archive
    └── system.md               # 7 Themes Engine, Achievements, XP Levels, Co-op Quests
```

---

> [!TIP]
> For the fastest onboarding experience, open [developer-onboarding.html](./developer-onboarding.html) directly in any browser.
