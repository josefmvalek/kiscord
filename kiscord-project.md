# Kiscord — Kompletní dokumentace projektu

> **Verze:** v14 (aktuální) | **Deploy:** [kiscord.vercel.app](https://kiscord.vercel.app) | **Backend:** Supabase | **Stack:** Vanilla JS/CSS, HTML, PWA

---

## 1. Co je Kiscord?

Kiscord je vysoce personalizovaná **Progressive Web App (PWA)** pro dva uživatele — **Jožku** a **Klárku**. Slouží jako soukromá platforma pro jejich vztah: zdraví, vzpomínky, zábava, plánování, hry a vzdělávání. Vizuálně je inspirován Discordem (tmavý theme, boční sidebar s kanály, Discord font a barvy).

Aplikace je plně **offline-capable** (Service Worker + localStorage cache), má real-time synchronizaci přes Supabase Realtime a je navržena jako PWA (instalovatelná na mobil).

---

## 2. Uživatelé a Role

| Uživatel | Email | Role |
|---|---|---|
| **Jožka** | jozka@... | Admin — může přidávat achievementy, questy, fakta, media do knihovny |
| **Klárka** | klarka@... | User — plná funkcionalita, bez admin akcí |

Identita uživatele se detekuje přes `auth.js:isJosef()` a `isKlarka()` a ovlivňuje, které admin tlačítka jsou zobrazeny.

Vztah začal **24. 12. 2025** (`state.startDate = "2025-12-24"`).

---

## 3. Architektura

### 3.1 Soubory a struktura

```
kiscord/
├── index.html              # Jeden HTML soubor — sidebar + content area
├── style.css               # Entry point, importuje css/ files
├── css/
│   ├── tokens.css          # CSS proměnné + 5 témat
│   ├── base.css            # Reset, body, scrollbary, FontAwesome
│   ├── animations.css      # @keyframes + .animate-* utility třídy
│   ├── components.css      # UI komponenty (karty, modaly, slidery...)
│   └── modules.css         # Feature-specific (mapa, tier list mobile...)
├── js/
│   ├── main.js             # Inicializace, routing, auth, sidebar
│   ├── core/
│   │   ├── state.js       - [x] **Sprint 4: Bezpečnost a Infrastruktura**
    - [x] Zapnutí RLS u všech tabulek v Supabase
    - [x] Implementace nahrávání médií (Supabase Storage)
    - [x] Integrace fotek do Timeline a Bucket Listu
    - [x] Příprava na Push Notifikace (Permissions & Test button)
- [x] **Závěrečná Kontrola a Verifikace**
    - [x] Testování všech nových UI prvků
    - [x] Verifikace RLS funkčnosti
    - [x] Kontrola DB schématu a oprava mappingu v state.jsi
│   │   ├── auth.js         # Supabase Auth wrapper
│   │   ├── supabase.js     # Supabase client inicializace
│   │   ├── theme.js        # Témata, notifikace, confetti
│   │   ├── sync.js         # Realtime sync broadcasty
│   │   ├── offline.js      # safeInsert/safeUpsert/safeDelete (offline queue)
│   │   ├── ui.js           # Reusable HTML helper funkce (renderModal atd.)
│   │   ├── utils.js        # triggerHaptic, triggerConfetti, getTodayKey...
│   │   ├── loader.js       # Loading screen logika
│   │   └── storage.js      # localStorage helpers
│   └── modules/            # Lazy-loaded feature modules (17 modulů + subdirs)
├── sw.js                   # Service Worker (cache: kiscord-v14)
├── manifest.json           # PWA manifest
└── supabase/               # SQL migrace a setup skripty
```

### 3.2 Routing

Vše je single-page app. Navigace funguje přes `switchChannel(channelId)` v `main.js`. Každý sidebar link zavolá tuto funkci, která:

1. Lazy-importuje příslušný modul (`moduleMap[channelId]()`)
2. Zavolá příslušnou `render*()` funkci
3. Aktualizuje `state.currentChannel`
4. Zvýrazní aktivní sidebar link

### 3.3 Globální state (`core/state.js`)

Centrální singleton `state` objekt, inicializovaný přes `initializeState()`. Data se načítají z Supabase při každém přihlášení a ukládají do localStorage jako cache pro offline režim.

**Klíčová data v state:**
- `state.healthData` — zdravotní data per den (`{ water, mood, sleep, movement }`)
- `state.library` — filmy, seriály, hry
- `state.watchHistory` — stav sledování per media ID
- `state.timelineEvents` — timeline záznamy
- `state.achievements` — odemčené achievementy
- `state.achievementDefinitions` — definice všech achievementů (z DB)
- `state.coopQuests` — aktivní co-op questy (z DB)
- `state.factsLibrary` — { raccoon, owl, octopus, fun, penis }
- `state.factFavorites` — oblíbená fakta
- `state.plannedDates` — plánovaná rande v kalendáři
- `state.funFactProgress` — progress klíčovaný jako `catId:sub1:sub2`
- `state.currentUser` — přihlášený uživatel
- `state.user_ids` — ID Jožky a Klárky

### 3.4 Offline systém (`core/offline.js`)

`safeInsert()`, `safeUpsert()`, `safeDelete()` — wrappery kolem Supabase operací, které přidávají do offline fronty při výpadku a synchronizují po obnovení spojení.

---

## 4. Všechny kanály (sekce aplikace)

### 4.1 `welcome` — Uvítací obrazovka

Zobrazí se po přihlášení. Obsahuje emoji maskota (🦝), uvítací text s inflektovaným jménem uživatele a dvě rychlá tlačítka: **Můj Den** a **Kalendář**.

Na mobilech zobrazuje nápovědu „Přejeď zleva pro menu".

---

### 4.2 `dashboard` — Můj Den

**Soubory:** `modules/dashboard.js`, `modules/dashboard/health_ui.js`, `modules/dashboard/sunflowers.js`, `modules/dashboard/chat.js`

Hlavní denní přehled. Obsahuje:

#### Mood Slider
- Slider 1–10 s emoji bublinkou, která se zobrazuje při přetahování
- Barevný přechod: modrá (smutno) → žlutá (střed) → zelená/zlatá (šťastná)
- Ukládání okamžité do Supabase + broadcast partnerovi přes Realtime

#### Sledování vody
- 8 kapek, toggle logika (klik na aktivní kapku = odebrat)
- Confetti po dosažení 8/8
- Achievement: `hydration_master`

#### Spánkový tracker
- Tlačítka: **Jít spát** / **Vstát** / **Zdřímnout** / **Nabito**
- `startSleep()` → uloží `startTime`, spustí timer, zobrazí Good Night overlay (🌙)
- `wakeUp()` → vypočte délku spánku, uloží do Supabase, zobrazí Good Morning overlay (☀️ + confetti)
- Real-time aktualizace progressbaru každou minutu
- Overlays: Dobrou noc (automaticky zmizí po 4.5s), Dobré ráno, Nap mode, Recharged

#### Pohyb (Movement chips)
- Čipy/tagy pro aktivity: Gym, Chůze, Jogging, Jízda na kole, atd.
- Toggle – aktivní = uloženo do `movement[]` pole

#### Sunflower Sync
- SVG animovaná slunečnice zobrazující zdravotní stav OBOU uživatelů
- Stav: Vzkvétající (oba dobře), Vadnoucí (jeden špatně), Spící (noc)
- Odesílání „slunečního paprsku" partnerovi → konfetti + Aura VFX
- Real-time přes Supabase Broadcast channel

#### Tetris Mini-Tracker
- Zobrazení aktuálního skóre šampiónátu (Jožka vs. Klárka)
- Inline aktualizace skóre tahu

#### Chat s Jožkou
- Jedno-stranný real-time „chat" kde Jožka nechává zprávy
- Denní random fakt o mývalovi
- Tlačítko na refresh faktu

---

### 4.3 `calendar` — Kalendář

**Soubory:** `modules/calendar.js`, `modules/calendar/grid.js`, `modules/calendar/modals.js`

Měsíční přehledový kalendář s filtrováním.

**Funkce:**
- Navigace měsíc vpřed/vzad (šipky)
- Filter tlačítka: Vše / Zdraví / Filmy / Rande / Škola
- Každý den v gridu zobrazuje indikátory: nálada (emoji), voda (kapky), pohyb, film/seriál, plánované rande, školní událost
- Klik na den → detail modal s celým denním přehledem
- Přidání/editace plánovaného rande přímo z detailu dne
- **Heatmap nálad** — barevné podbarvení buněk podle hodnoty nálady
- Library integration — filmy/seriály se zobrazí v den, kdy byly označeny jako viděné
- Real-time sync: změny v `planned_dates` tabulce se okamžitě propagují do gridu

---

### 4.4 `library` — Filmy / `series` — Seriály / `games` — Hry

**Soubor:** `modules/library.js`

Tři sekce sdílené knihovny médií. Média jsou rozdělena do žánrových skupin (sticky headery).

**Každá karta médií obsahuje:**
- Emoji ikona (poster area)
- Název a Mood Tags (vibes)
- Stav sledování: 💤 V plánu / 🍿 Rozkoukáno / 🔥 Viděno
- Status badge (zelený/modrý overlay)
- ❤️ Bookmark (wishlist/watchlist)
- ▶️ Trailer odkaz (YouTube)
- 📅 Naplánovat do kalendáře
- ⬇️ Stáhnout (Magnet link + Google Drive záloha)
- ⭐ Záznam do deníčku (hodnocení 1-5 hvězd + verdikt emoji + note)

**Modaly:**
- **Deníček sledování** — hvězdičkové hodnocení, stav, datum, verdikt (💖 Srdcovka / 🍿 Pohoda / 🧠 Hluboké / 😴 Nuda / 👎 Blbost) + textová reakce
- **Stahování** — výběr Magnet Link nebo Google Drive
- **Naplánovat** — přidání do kalendáře s datem, časem a poznámkou

**Admin funkce (jen Jožka):**
- Přidání nového média (název, emoji ikona, žánr, magnet, gdrive, mood tagy)
- Stránka `#nastaveni` → `renderUpgrade()` → speciální easter egg `system_patch_v2.0.exe` → spustí `confession.js`

---

### 4.5 `watchlist` — Wishlist

**Soubor:** `modules/watchlist.js`

Záložková sekce — zobrazuje vše, co má uživatel přidáno do ❤️ wishlistu z knihovny.

- Kompaktní karty s heartíkem na odebrání
- Persystováno v Supabase tabulce `library_watchlist`

---

### 4.6 `timeline` — Timeline vzpomínek

**Soubor:** `modules/timeline.js` (~1000 řádků)

Chronologicky řazené záznamy ze vztahu (události, výlety, milníky, fotky).

**Funkce:**
- Přidání záznamu s datem, názvem, popisem, ikonou (emoji nebo FA icon), barvou, fotkou (URL)
- **Milníky** — speciální záznamy s korunou 👑 a zlatým glowem
- **Polaroid fotky** — efekt fotografií s páskou lepicí páskou nahoře
- Skupiny polaroidů v přehledovém řezu (stack s rotací)
- Filter: Vše / Milníky / S fotkou / Podle roku
- Editace a mazání záznamů
- **Icon Picker** — výběr emoji nebo Font Awesome ikony z mřížky
- Real-time sync přes Supabase

---

### 4.7 `map` — Mapa rande

**Soubor:** `modules/map.js` (~40KB)

Leaflet.js mapa se špendlíky míst, kde jsme byli.

**Funkce:**
- Custom Discord-styled špendlíky (Discord blurple barva)
- Klik na špendlík → spodní sheet (nebo boční panel na desktopu) s detailem lokace
- **Mobile Bottom Sheet** s drag-to-dismiss gestem (touch swipe dolů)
- Přidání nové lokace: název, emoji, popis, kategorie, datum, fotka
- Editace a mazání lokací
- **Filtry** podle kategorie (Jídlo, Příroda, Výlet, Doma...)
- Clustering kolem blízkých bodů
- Popup okna stylizovaná do Discord dark theme

---

### 4.8 `topics` — Konverzační témata

**Soubor:** `modules/topics.js`

Sbírka diskuzních témat a otázek k rozhovoru pro pár.

**Funkce:**
- Kategorie témat (Budoucnost, Zábava, Intimita, Filosofie...)
- Karty témat s progressbarem (kolik otázek zodpovězeno)
- Pokračování v tématu (pamatuje si, kde se skončilo)
- Bookmarks (oblíbená témata)
- Real-time sync progress přes Supabase

---

### 4.9 `funfacts` — Encyklopedie

**Soubor:** `modules/funfacts.js` (~750 řádků)

Sbírka vzdělávacích faktů organizovaných do kategorií a subkategorií.

**Kategorie:**
| ID | Název | Popis |
|---|---|---|
| `raccoon` | Mývalí moudra 🦝 | Vše o mývalech |
| `owl` | Soví vědomosti 🦉 | Fakta o sovách |
| `octopus` | Chobotničí fakta 🐙 | Chobotnice |
| `penis` | Fakty o pérech 🍌 | Anatomická fakta (humor) |
| `fun` | Ostatní zajímavosti ✨ | Mix |
| `bookmarks` | Moje Oblíbené 💖 | Uložená fakta |

**Funkce:**
- Dvouúrovňové subkategorie (level 1 → level 2 → fact card)
- Progress tracker — kolik faktů přečteno v každé větvi
- Random Mix mode (pro `penis` kategorii)
- ❤️ Uložení faktu do oblíbených (persistováno v `app_fact_favorites`)
- Reset progress per sekci (s potvrzením)
- Přidání nového faktu (admin + user)

---

### 4.10 `achievements` — Síň Slávy

**Soubor:** `modules/achievements.js`

Sbírka achievementů/odznáčků — manuálně i automaticky odemykaných milníků vztahu.

**Funkce:**
- Kategorie achievementů (z DB tabulky `achievement_categories`)
- Progress bar (celkové % odemčeno)
- Každý achievement: ikona, název, popis, datum odemčení, barva
- Klik = toggle odemčení (s confetti efektem)
- Admin: přidání nového achievementu (ID, název, popis, emoji, kategorie, gradient barva)
- Real-time sync přes Supabase channel
- **Auto-unlock hook** `autoUnlock(id)` — zavolán automaticky z jiných modulů

**Automaticky odemykané achievementy:**
| ID | Podmínka |
|---|---|
| `hydration_master` | 8/8 kapek v jeden den |
| `euphoria` | Nálada 10/10 |
| `zombie_survivor` | Spánek < 4 hodiny |
| `sleeping_beauty` | 7 dní v řadě spánek 7+ hodin |
| `fact_enthusiast` | Projití celé sekce faktů |

---

### 4.11 `quests` — Co-op Questy

**Soubor:** `modules/quests.js`

Měsíční spolupráceorientované výzvy (úkoly, které sledují data z celé aplikace).

**Typy sledování (quest types):**
| Typ | Popis |
|---|---|
| `sum_water` | Celkové kapky vody (oba) |
| `both_sleep` | Dny, kdy oba spali 7+ hodin |
| `count_shared_movement` | Dny, kdy oba zaznamenali pohyb |
| `count_shared_mood_high` | Dny, kdy oba měli náladu 8+ |
| `count_bucket` | Splněné bucket list položky |
| `count_new_timeline` | Nové timeline záznamy |
| `count_completed_dates` | Absolvovaná plánovaná rande |
| `count_sunlight_sent` | Odeslané sluneční aury |
| `sum_tetris_score` | Celkové tetris skóre |
| `count_daily_questions` | Zodpovězené denní otázky |

Data se načítají přes Supabase RPC funkce. Admin může přidávat nové questy.

---

### 4.12 `bucketlist` — Bucket List

**Soubor:** `modules/bucketlist.js`

Sdílený seznam snů a přání, které chceme společně zažít.

**Funkce:**
- Přidání položky s automatickou kategorizací (podle klíčových slov) nebo manuálním výběrem
- Kategorie: ✈️ Cestování / 🍕 Jídlo / 🌲 Dobrodružství / 🏠 Domov / 💡 Zábava
- ❤️ Toggle srdíčka — každý uživatel může označit jako prioritu
- „Společná priorita" badge pokud oba označili (🌟 zlatá barva)
- Zaškrtnutí jako splněné → confetti + „Mise Splněna!" razítko
- Sekce „Síň Slávy Splněných Snů" pro archivované položky
- Real-time sync přes Supabase

---

### 4.13 `health` — Zdravotní přehled (modul)

**Soubor:** `modules/health.js`

Backend logika pro zdravotní data (dashboard UI ji renderuje přes `dashboard/health_ui.js`).

**Funkce:**
- `updateHealth(type, value)` — ukládá náladu/vodu/pohyb + broadcast partnerovi
- `updateBedtime(time)` — nastavení času pro postel
- `saveDailyNote()` — denní poznámka (local only)
- Spánkový timer (`startSleepTimer`, `stopSleepTimer`, `updateSleepVisuals`)
- `startSleep()` / `wakeUp()` — kompletní spánkový cyklus s validací (zabraňuje Jan 1, 1970 bugu)
- Achievement hooky pro zdravotní data
- Overlays: Dobrou noc 🌙, Dobré ráno ☀️, Nap mode 🔋, Dobito ⚡

---

### 4.14 `tierlist` — Tier List Creator

**Soubor:** `modules/tierlist.js` (~700 řádků)

Vytváření rankingových žebříčků (S/A/B/C/D tiery) pomocí drag & drop.

**Funkce:**
- Vytvoření tier listu: název, kategorie (Filmy/Seriály/Jiné)
- Editace: přidávání položek s emoji ikonou a názvem
- **SortableJS** drag & drop pro přesouvání mezi tiery a bankíku
- **DUEL mode** — náhodné souboje 1:1 mezi položkami pro automatické řazení (Elo-like systém)
  - Toggle tlačítko „DUEL" v headeru editoru
  - Zobrazení dvou náhodných položek z bankíku k porovnání
  - Výběr vítěze → přesun do vyššího tieru
- Real-time sync — změny vidí druhý uživatel okamžitě
- Smazání tier listu — Discord-styled potvrzovací modal (se zahopením při potvrzení)
- Autor tier listu — každý list zobrazuje, kdo ho vytvořil
- **Defensivní null-checks** na `activeTierList` (oprava z v14)
- Mobile responsive: flex-wrap layout, truncated text

---

### 4.15 `dailyQuestions` — Denní otázky

**Soubor:** `modules/dailyQuestions.js`

Každodenní otázka a odpovědi od obou partnerů.

**Funkce:**
- Denní otázka vylosovaná ze Supabase
- Odpovědi obou uživatelů (textová pole)
- Historie předchozích dní s odpověďmi
- Vidíš odpověď partnera až po odeslání vlastní
- Real-time zobrazení nové odpovědi partnera

---

### 4.16 `confession` — Zpověď / Easter Egg

**Soubor:** `modules/confession.js`

Skrytá sekce přístupná přes:
1. Sidebar kanál `confession`
2. `system_patch_v2.0.exe` soubor v sekci `#nastaveni`
3. README.md trigger `# kiscord`

Obsahuje interaktivní zpovědní flow — Jožka vyznává Klárce věci skrze série obrazovek/karet se speciální animací a přechody.

---

### 4.17 `levels` — XP systém

**Soubor:** `modules/levels.js`

Jednoduché XP/level skóre zobrazené u uživatele v sidebaru.

- Level bar / progress indikátor
- Přidávání XP za různé aktivity
- Real-time sync

---

### 4.18 `puzzle` — Galerie puzzlů

**Soubor:** `modules/puzzle.js`

Fotogalerie a puzzle obrázky. Výběr fotografie z galerie a zobrazení jako puzzle.

---

### 4.19 `coupleQuiz` — Párový kvíz

**Soubor:** `modules/coupleQuiz.js` (~33KB)

Interaktivní kvíz — otázky a odpovědi pro oba uživatele s hodnocením.

---

### 4.20 `games` — Herní hub

**Soubory:** `modules/games.js`, `modules/gamesHub.js`, `modules/gameDraw.js`, `modules/gameWho.js`, `modules/drawGallery.js`

Miniherní sekce:

- **Kdo by spíš...** (`gameWho.js`) — hlasování o výrocích
- **Kreslení** (`gameDraw.js`) — sdílené canvas kreslení s broadcastem tahů přes Realtime
  - Různé barvy, tloušťky, guma, clear
  - Pinnutá kresba v galerii
- **Galerie kreseb** (`drawGallery.js`) — archiv všech nakreslených výtvorů
- **Tetris** (`games.js`) — šampionát, sledování skóre

---

### 4.21 `letters` — Dopisy

**Soubor:** `modules/letters.js`

Soukromé dopisy a zprávy mezi uživateli.

---

### 4.22 `profile` — Profil

**Soubor:** `modules/profile.js`

Uživatelský profil — avatar, zobrazení přihlašovacích informací.

---

### 4.23 `search` — Globální vyhledávání

**Soubor:** `modules/search.js`

Vyhledávání napříč knihovnou médií. Výsledky filtrované v reálném čase. Přístupné přes lupu v sidebaru. Funkce `renderGlobalSearch` je exposovaná na `window` objekt.

---

## 5. Témata (Themes)

Přepínání témat přes `toggleTheme()` v `core/theme.js`. Téma se uloží do localStorage.

| Téma | ID | Popis |
|---|---|---|
| **Výchozí Discord** | — | Tmavé modré Discord barvy |
| **Valentýn** | `theme-valentines` | Růžové a červené, Comic Sans font |
| **Vánoce** | `theme-christmas` | Tmavě červené, zlaté akcenty |
| **Tetris** | `theme-tetris` | Neonové barvy, pixel font `Press Start 2P` |
| **Les** | `theme-forest` | Zelené, přírodní tóny |
| **Zlato** | `theme-gold` | Zlaté, luxusní barvy |

CSS custom properties jsou přepsány přes třídu na `body` elementu. Nastaveny v `css/tokens.css`.

---

## 6. PWA a Service Worker

- `manifest.json` — instalovatelná na mobil (ikona, název, barva)
- `sw.js` — Cache-first strategie, CACHE_NAME = `kiscord-v14`
- Offline banner (červený pruh nahoře) pokud `!navigator.onLine`
- Offline queue v `core/offline.js` — operace se provádí po obnovení spojení

---

## 7. Supabase databáze

### Tabulky

| Tabulka | Popis |
|---|---|
| `health_data` | Denní zdravotní záznamy (water, mood, sleep, movement, bedtime) |
| `timeline_events` | Timeline záznamy vztahu |
| `bucket_list` | Bucket list položky (shared) |
| `achievements` | Odemčené achievementy (per user) |
| `achievement_definitions` | Definice achievementů |
| `achievement_categories` | Kategorie achievementů |
| `coop_quests` | Definice co-op questů |
| `library_media` | Filmy, seriály, hry |
| `library_ratings` | Hodnocení a stav sledování médií |
| `library_watchlist` | Wishlist médií (per user) |
| `planned_dates` | Naplánovaná rande v kalendáři |
| `date_locations` | Mapa — lokace rande |
| `app_facts` | Fakta z encyklopedie |
| `app_fact_favorites` | Oblíbená fakta (per user) |
| `fun_fact_progress` | Progress čtení faktů (per user, per path) |
| `conversation_topics` | Konverzační témata |
| `topic_progress` | Progress v tématech |
| `tier_lists` | Tier list data (JSON) |
| `daily_questions` | Denní otázky |
| `daily_answers` | Odpovědi na denní otázky |
| `xp_events` | XP záznamy pro level systém |

### RPC Funkce (použité v Quests)

- `get_shared_water_stats(month_prefix)` — součet kapek vody obou
- `get_shared_sleep_sync(min_hours, month_prefix)` — dny kdy oba spali X+ hodin
- `get_shared_movement_stats(month_prefix)` — dny kdy oba hýbali
- `get_shared_mood_high_stats(month_prefix)` — dny kdy oba měli náladu 8+
- `get_new_timeline_stats(month_prefix)` — nové timeline záznamy
- `get_completed_dates_stats(month_prefix)` — splněná rande
- `get_sunlight_sent_stats(month_prefix)` — odeslané sluneční aury
- `get_tetris_total_score()` — celkové tetris skóre
- `get_daily_questions_stats(month_prefix)` — zodpovězené otázky

---

## 8. Realtime Synchronizace

Probíhá přes dvě metody:

1. **Supabase Realtime** — `postgres_changes` listenery na tabulky (achievements, tier_lists, bucket_list, planned_dates...)
2. **Supabase Broadcast** — real-time události bez ukládání do DB
   - `broadcast:health-update` — zdravotní data (nálada, voda, pohyb)
   - `broadcast:sunlight` — sluneční aura efekt
   - `broadcast:draw-stroke` — tahy v kreslení

---

## 9. Klíčové utility

### `core/utils.js`

| Funkce | Popis |
|---|---|
| `triggerHaptic(type)` | Vibrační feedback (light/medium/heavy/success/warning) |
| `triggerConfetti()` | Barevné konfety efekt (canvas-confetti) |
| `getTodayKey()` | Vrátí datum ve formátu `YYYY-MM-DD` |
| `getInflectedName(name, pad)` | Česká skloňování jmen (Klárka → Klárko, Klárky...) |

### `core/theme.js`

| Funkce | Popis |
|---|---|
| `showNotification(message, type)` | Toast notifikace (success/error/info) |
| `toggleTheme()` | Přepnutí tématu |
| `initTheme()` | Načtení uloženého tématu |
| `toggleValentineMode()` | Speciální Valentine toggle |

---

## 10. Verze a cache-busting

Všechny dynamické importy používají `?v=19`:
```js
import('./modules/tierlist.js?v=19')
```

Service Worker cache: `kiscord-v14`

Statické soubory v HTML: `style.css?v=19`, `main.js?v=19`

Při bumpu verze je třeba aktualizovat na všech místech konzistentně.

---

## 11. Spuštění projektu lokálně

```bash
# Instalace závislostí (jen dev server)
npm install

# Spuštění dev serveru
npm start
# → http://localhost:3000
```

Produkční deploy probíhá automaticky přes Vercel po `git push` do `main` větve.

---

## 12. Aktuální stav (ke dni 25.3.2026)

- ✅ Verze v14 — stabilní, bez known runtimeerrorů
- ✅ CSS refaktorizace dokončena (style.css = entry point, 5 souborů v css/)
- ✅ Tier List DUEL flow stabilní (null-check na `activeTierList`)
- ✅ Confession flow funkční
- ⚠️ RLS políce Supabase jsou `USING (true)` — doporučeno zpřísnit na konkrétní user_ids
