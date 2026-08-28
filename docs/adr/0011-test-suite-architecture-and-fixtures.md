# ADR-0011: Test Suite Architecture, Reusable Mock Builders, and Shared E2E Test Fixtures

* **Status:** Accepted
* **Datum:** 2026-08-26
* **Rozhodčí:** Jozka & Antigravity (Code Refactoring, Clean Code & Architecture Decision Records)

---

## 1. Kontext a Problém

Při rozvoji projektu Kiscord vznikla rozsáhlá testovací sada (68 testovacích souborů, 475 jednotkových/integračních testů ve Vitest a 5 komplexních scénářů v Playwright). Detailní audit odhalil následující architektonické a Clean Code nedostatky:

1. **Masivní duplikace mocků (Porušení DRY):**
   - V desítkách unit testů se opakovala ruční 20–50řádková konfigurace `vi.mock('../../js/core/supabase.js')`, `vi.mock('../../js/core/theme.js')`, `vi.mock('../../js/core/sound.js')` a `vi.mock('../../js/core/utils.js')`.
2. **Křehkost a tiché pády (Fragile Mocks):**
   - Ad-hoc implementace mocků neposkytovaly kompletní řetězitelné PostgREST rozhraní (např. chybějící `.order()`, `.limit()`, `.maybeSingle()`), což vedlo k tichým `TypeError` výjimkám unikajícím do stderr při spouštění asynchronních loaderů (`ensureGymData`, `ensureStudyData`).
3. **Mrtvý kód v testech (Dead Mock Boilerplate):**
   - Testy ověřující čistě statické konstanty a konfigurační registry obsahovaly zbytečné mocky celého backendu a audia.
4. **Duplikace v E2E Playwright testech:**
   - Každá z 5 E2E specifikací obsahovala 35 řádků identického kódu pro syntézu mock JWT tokenů a zápis session do `localStorage`.
5. **Absence standardizovaného Test Data Builder / Object Mother patternu:**
   - Chyběla centrální tvorba entit (`User`, `Shift`, `GymLog`, `Coupon`, `Quest`), data se v testech mutovala ad-hoc.

---

## 2. Rozhodnutí

Rozhodli jsme se standardizovat testovací architekturu a zavést sadu znovupoužitelných testovacích komponent:

1. **Univerzální Fluent QueryBuilder & Supabase Mock (`tests/fixtures/mock-supabase.js`):**
   - Vytvořena funkce `createChainableQueryBuilder()`, která implementuje kompletní PostgREST řetězení (`.select()`, `.insert()`, `.update()`, `.upsert()`, `.delete()`, `.eq()`, `.neq()`, `.order()`, `.limit()`, `.single()`, `.maybeSingle()`, `.match()`) a je přímo awaitable (thenable).
   - Vytvořena funkce `createMockSupabase(tableDataMap)`, která simuluje kompletní instanci klienta včetně Realtime kanálů (`.channel().on().send()`), Storage bucketů a Auth metod.

2. **Domain Test Data Builders & State Reset (`tests/fixtures/factories.js`):**
   - Implementován pattern Object Mother s továrnami `createTestUser()`, `createTestPartner()`, `createTestShift()`, `createTestGymExercise()`, `createTestGymLog()`, `createTestPlannedDate()`, `createTestCoupon()`, `createTestQuest()`, `createTestMovie()`.
   - Vytvořena funkce `resetTestState(state, customOverrides)` pro spolehlivou izolaci testů.

3. **Playwright E2E Auth & Routing Fixture (`tests/fixtures/playwright-helpers.js`):**
   - Vytvořeny funkce `setupMockAuthSession(page, userOverrides)` a `setupDefaultApiRoutes(page, options)` eliminující 30+ řádků duplicitního boilerplate kódu v každém Playwright `.spec.js` souboru.

4. **Globální rozšíření Test Runner Setupu (`tests/setup.js` & `package.json`):**
   - Rozšířen `tests/setup.js` o bezpečné mocky `matchMedia` a `Audio` pro prostředí `happy-dom`.
   - Přidán standardizovaný skript `"test:coverage": "vitest run --coverage"` do `package.json`.

---

## 3. Důsledky

### Pozitivní:
* **Odstranění stovek řádků duplicitního kódu** napříč unit, integration a E2E testy.
* **100% čistý běh testů bez skrytých `TypeError` chyb v konzoli**.
* **Jednotný a konzistentní přístup** k mockování databáze, realtime a autentizace.
* **Rychlejší psaní nových testů** díky hotovým builderům a fixturám.
* **Vysoká odolnost vůči refaktoringu produkčního kódu** díky kompletnímu chainable QueryBuilderu.

### Negativní / Úskalí:
* Vývojáři musí vědět o existenci `tests/fixtures/` a používat sdílené factory namísto vytváření vlastních izolovaných mocků.
