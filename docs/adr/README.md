# 🏛️ Architecture Decision Records (ADR)

Tento adresář obsahuje evidenci klíčových architektonických rozhodnutí projektu **Kiscord** podle metodiky Michael Nygard / MADR standardu.

---

## 📑 Rejstřík ADR

| ADR | Název | Stav | Datum |
|---|---|---|---|
| [ADR-0001](0001-vanilla-js-swr-architecture.md) | Pure Vanilla JS Architecture with Dynamic ES Modules and SWR Cache | **Accepted** | 2026-08-21 |
| [ADR-0002](0002-supabase-postgresql-rls.md) | Supabase PostgreSQL Backend with Row Level Security (RLS) | **Accepted** | 2026-08-22 |
| [ADR-0003](0003-domain-store-slices.md) | Modularize State Management into Domain Store Slices & Reactive Bus | **Accepted** | 2026-08-23 |
| [ADR-0004](0004-module-lifecycle-router-decoupling.md) | Standardized Module Lifecycle Interface & Router Decoupling | **Accepted** | 2026-08-23 |
| [ADR-0005](0005-resilient-offline-sync-conflict-detection.md) | Conflict-Aware Offline Sync Queue with Exponential Backoff | **Accepted** | 2026-08-23 |
| [ADR-0006](0006-reactive-signals-engine.md) | Lightweight Reactive Signals Engine (~60 LOC Vanilla JS) | **Accepted** | 2026-08-23 |
| [ADR-0007](0007-webrtc-peer-to-peer-channel.md) | WebRTC Peer-to-Peer Direct Intimacy Channel (Sub-10ms) | **Accepted** | 2026-08-23 |
| [ADR-0008](0008-client-side-aes-gcm-encrypted-backup.md) | Client-Side AES-GCM Encrypted Backup & Restore (.kiscord) | **Accepted** | 2026-08-23 |
| [ADR-0009](0009-discord-slash-commands-voice-logging.md) | Discord Slash Commands & Smart Voice Logging Engine | **Accepted** | 2026-08-23 |

---

## 🔄 Životní cyklus ADR
```
Proposed → Accepted → Deprecated → Superseded
              ↓
           Rejected
```
