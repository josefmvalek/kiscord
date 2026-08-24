# ADR-0005: Conflict-Aware Offline Sync Queue with Exponential Backoff

## Status
Accepted

## Context
Původní offline synchronizační fronta prováděla naivní FIFO přepisování dat bez metadat a bez exponenciálního backoffu, což mohlo vést k přepisu dat při souběžné offline editaci.

## Decision Drivers
* Spolehlivost zápisů při nestabilním mobilním připojení
* Ochrana proti ztrátě dat při kolizích editací obou partnerů
* Uživatelsky přívětivé vizuální rozhraní pro řešení konfliktů

## Decision
1. Obohacení operací v `js/core/offline.js` o `client_updated_at`, `retry_count`, `last_error` a `expected_server_version`.
2. Implementace exponenciálního backoffu s jitterem: $T = \min(1000 \times 2^{\text{retry\_count}} + \text{jitter}, 30000)\,\text{ms}$.
3. Zavedení `js/core/ui/conflict-modal.js` pro vizuální řešení kolizí dat.

## Consequences
### Positive
* Robustní odbavování fronty i při opakovaných výpadcích sítě
* Žádná tichá ztráta dat při souběžné offline práci
