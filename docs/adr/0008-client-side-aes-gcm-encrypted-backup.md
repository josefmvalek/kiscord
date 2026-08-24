# ADR-0008: Client-Side AES-GCM Encrypted Backup & Restore (.kiscord)

## Status
Accepted

## Context
Uživatelé požadovali možnost offline zálohování všech společných vzpomínek, financí, logů a dat do přenositelného souboru s maximální kryptografickou ochranou.

## Decision
Implementovat klientské šifrování v [js/core/crypto-backup.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/crypto-backup.js) pomocí:
1. PBKDF2 (SHA-256, 100 000 iterací, 16B salt) pro derivaci klíče z hesla.
2. AES-GCM 256-bit (12B IV) pro autentizované šifrování.
3. Formát souboru `.kiscord`.

## Consequences
### Positive
* Data jsou zašifrována přímo v prohlížeči před jakýmkoliv exportem
* Nulová možnost prolomení bez znalosti hesla
