# ADR-0002: Supabase PostgreSQL Backend with Row Level Security (RLS)

## Status
Accepted

## Context
Projekt vyžaduje reálný backend pro synchronizaci dat mezi dvěma uživateli, WebSockets komunikaci (hry, přítomnost) a bezpečné úložiště souborů (fotky, dokumenty), aniž by bylo nutné spravovat a platit vlastní Node.js/Python server.

## Decision Drivers
* Nulová režie na údržbu serverové infrastruktury
* Přísné oddělení soukromých dat (finance, zdraví) a sdílených dat (kalendář, média)
* Podpora Realtime WebSockets z krabice

## Considered Options
* **Option 1: Vlastní Node.js / Express REST API + PostgreSQL** (Vyžaduje hostování serveru, správu endpointů a autentizace)
* **Option 2: Firebase / Firestore** (NoSQL model nevhodný pro relační data a reporting, proprietární vendor lock-in)
* **Option 3: Supabase (PostgreSQL + RLS + Realtime)** (Relační SQL databáze, RLS na úrovni jádra, zero-backend architektura)

## Decision
Využít **Supabase (PostgreSQL 15+)** s **Row Level Security (RLS)** politikami a PL/pgSQL RPC procedurami namísto vlastního API serveru.

## Consequences
### Positive
* Bezpečnost vynucena přímo na úrovni PostgreSQL jádra
* Přímý přístup z klienta přes Supabase JS SDK bez nutnosti psát REST/GraphQL boilerplate
* Nativní realtime synchronizace (Postgres Changes & Broadcast)

### Negative
* Přímé propojení klientského kódu s databázovým schématem
* Nutnost udržovat TypeScript typy v synchronizaci se schématem
