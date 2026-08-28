# 📅 Kiscord Kalendář 3.0 — Technická Dokumentace & Architektura
### Spatial Zen, Frosted-Glass Luxe & AI Spotlight Edition

> **Kompletní technická specifikace, systémový design a architektonický přehled modulu Kalendář 3.0 pro aplikaci Kiscord (Project-K).**

---

## 📑 Obsah

1. [Přehled a Cíle Systému (Spatial Zen)](#1-přehled-a-cíle-systému-spatial-zen)
2. [Modulární Struktura Kódu](#2-modulární-struktura-kódu)
3. [Design Systém, Tokeny & GPU Animace (Fáze 1)](#3-design-systém-tokeny--gpu-animace-fáze-1)
4. [Měsíční Mřížka 3.0: Zen Edition & Zen Peek HUD (Fáze 2)](#4-měsíční-mřížka-30-zen-edition--zen-peek-hud-fáze-2)
5. [Týdenní 24h Mřížka: Time Spotlight & Romantic Gap (Fáze 3)](#5-týdenní-24h-mřížka-time-spotlight--romantic-gap-fáze-3)
6. [Interaktivita, Klávesové Zkratky & AI Spotlight Command Bar (Fáze 4)](#6-interaktivita-klávesové-zkratky--ai-spotlight-command-bar-fáze-4)
7. [Specializované Telemetrické Filtry](#7-specializované-telemetrické-filtry)
8. [Ranní Briefing, Partnerský Radar & iCal Sync](#8-ranní-briefing-partnerský-radar--ical-sync)
9. [Časový Engine & Kolizní Algoritmus](#9-časový-engine--kolizní-algoritmus)
10. [Verifikace & Testovací Pokrytí](#10-verifikace--testovací-pokrytí)

---

## 1. Přehled a Cíle Systému (Spatial Zen)

Modul **Kalendář 3.0** představuje vlajkovou loď lifestylového plánování v aplikaci Kiscord (s přímým přesahem do budoucí komerční aplikace *DuoTime*). Architektura verze 3.0 prošla kompletní transformací zaměřenou na **Spatial Zen**, **Progressive Disclosure** a **Frosted-Glass Cyber-Luxe** estetiku podle vzorů předních světových aplikací (*Linear, Notion Calendar / Cron, Structured, Apple Health a Rise*).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ARCHITEKTURNÍ PILÍŘE 3.0                           │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│ 💎 Frosted-Glass Luxe        │ 🧘 Smart Event Hierarchy     │ ⏱️ Time Laser │
│ • Translucentní karty 12-24px│ • Max 1–2 Hero čipy v buňce  │    & Spotlight│
│ • Levý 3.5px doménový akcent │ • Sbalený "+N další" čip     │ • Nightscape  │
│ • Skleněné vrstvy a aury     │ • Minimalistické Vitality    │   24h gradient│
│                              │   Dots (💧, 😴, ⚡, 💊)       │ • Romantic Gap│
└──────────────────────────────┴──────────────────────────────┴───────────────┘
```

### Klíčové inovace verze 3.0:
- **Zero-Clutter Měsíční Přehled**: Odstranění 250+ soupeřících vizuálních prvků. V buňce měsíce se zobrazují max. **1–2 prioritní Hero čipy** s automatickým sbalením dalších událostí do `+N další`.
- **Minimalistické Vitality Dots**: Původní těžkopádný textový blok nahrazen 3 zářícími mikro-tečkami (azurová pro vodu, fialová pro spánek, barevná pro náladu, pilulka pro vitamíny).
- **Zen Peek HUD Popover**: Plovoucí mikro-náhled na hover (`200ms` debounce) s počasím, kompletní telemetrií dne a 1-click rychlými akcemi (`+1 Voda`, `+ Plán`, `Detail ›`).
- **Nightscape 24h Týdenní Gradient**: Ambientní světelné pozadí odrážející cirkadiánní rytmus (hluboká indigová noc $\rightarrow$ čistý grafitový den $\rightarrow$ teplý soumrak).
- **Now Laser 3.0 & Time Spotlight**: Živý časový laser s pulzujícím diamantovým majákem a vertikálním světelným kuželem na sloupec aktuálního dne.
- **Romantic Gap In-Grid Zones**: Automatická detekce volných večerních oken pro rande a jejich zobrazení v rozvrhu jako interaktivních šampaňsko-růžových slotů.
- **AI Spotlight Command Bar (`Cmd+K` / `Ctrl+K` / `Mezerník` / `N`)**: Okamžité vyhledávání a přirozené plánování v češtině (NLP) s detekcí kolizí a živým preview.

---

## 2. Modulární Struktura Kódu

Architektura kalendáře žije v adresáři `js/domains/lifestyle/calendar/`:

```
js/domains/lifestyle/calendar/
├── index.js              # Orchestrátor, AI Spotlight Command Bar, klávesové zkratky, top bar
├── state.js              # Centrální stav (režimy zobrazení, filtry, anchor date, session, animace)
├── time-engine.js        # Matematické jádro: deterministické souřadnice, kolize, ISO klíče
├── week-view.js          # 24h týdenní rozvrh, Nightscape gradient, Now Laser 3.0, Romantic Gap
├── month-view.js         # Bezscrollové měsíční zobrazení, Smart Event Hierarchy, Vitality Dots
├── quick-popover.js      # Zen Peek HUD, 1-click Quick Add dialog, checklist toggle
├── day-modal.js          # Plnohodnotný Bento modal detailu dne (editace zdraví, plánů, směn)
├── nlp-quick-add.js      # Natural Language parser pro češtinu, detektor kolizí, Gap Finder
├── partner-radar.js      # Partnerský odpočet do dalšího rande a interaktivní Love Pulse
├── daily-briefing.js     # Ranní přehled dne, analýza spánku a 1-click Discord export
├── weather.js            # Poskytovatel meteorologické předpovědi (teplota, stav, ikony)
├── recurring-events.js   # Expanze opakovaných událostí a rutin (týdenní výuka FIT, tréninky)
├── weekly-analytics.js   # Týdenní analytický drawer pro agregaci spánku, tréninků a návyků
├── drag-drop.js          # Plynulé drag & drop přeplánování a změna délky událostí
└── ics-sync.js           # RFC 5545 export a import standardních .ics souborů
```

---

## 3. Design Systém, Tokeny & GPU Animace (Fáze 1)

### A) Design Tokens ([css/tokens.css](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/css/tokens.css))
Definovány v `:root` pro konzistentní vzhled a snadnou údržbu:

```css
/* Surface & Borders */
--cal-surface-cell: rgba(47, 49, 54, 0.45);
--cal-surface-card: rgba(32, 34, 37, 0.85);
--cal-surface-hover: rgba(255, 255, 255, 0.05);
--cal-border-subtle: rgba(255, 255, 255, 0.07);
--cal-border-hover: rgba(255, 255, 255, 0.18);

/* Doménové Gradienty & Akcenty */
--cal-fit-accent: #6ee7b7;       /* Emerald FIT */
--cal-gym-accent: #fcd34d;       /* Amber Gym */
--cal-date-accent: #f9a8d4;      /* Romantic Pink */
--cal-deadline-accent: #fda4af;  /* Urgent Rose */
--cal-movie-accent: #d8b4fe;     /* Purple Cinema */
--cal-diary-accent: #93c5fd;     /* Blue Diary */

/* Vitality & Biometrics */
--cal-water-color: #00e5ff;
--cal-sleep-color: #a855f7;
--cal-mood-glow: #ec4899;

/* Pružinové Křivky (Easing) */
--cal-spring-snappy: cubic-bezier(0.16, 1, 0.3, 1);
--cal-spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### B) GPU-Akcelerované Animace ([css/animations.css](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/css/animations.css))
- `@keyframes calCellPopIn`: Plynulé pružinové naskakování buněk kalendáře.
- `@keyframes calSlideNext` / `calSlidePrev`: GPU-akcelerovaný horizontální přechod mezi měsíci/týdny.
- `@keyframes calLaserBeaconPulse`: Pulzující záře diamantového majáku aktuálního času.
- `@keyframes calRomanticShimmer`: Jemná šampaňsko-růžová animace volných slotů na rande.
- `@keyframes calZenPeekIn`: Plynulý nástup plovoucího HUD náhledu.

---

## 4. Měsíční Mřížka 3.0: Zen Edition & Zen Peek HUD (Fáze 2)

Implementováno v `month-view.js` a `quick-popover.js`:

### A) Smart Event Hierarchy & Prioritizace
Všechny události dne jsou agregovány do jednotného prioritizovaného pole:
1. 🔥 **Neodevzdané deadliny a zkoušky FIT** (Priorita 1)
2. ❤️ **Naplánované rande a výlety** (Priorita 2)
3. 🎓 **Přednášky a laboratoře FIT** (Priorita 3)
4. 🏋️‍♂️ **Tréninky v posilovně** (Priorita 4)
5. ⭐ **Milníky vztahu**, 🎬 **Filmy**, 📝 **Deníček** (Priorita 5–7)

Buňka zobrazuje **max. 1–2 Hero čipy**. Při $\ge 3$ událostech se automaticky vykreslí sbalený čip `+N další`, který po kliknutí či hoveru otevře kompletní agendu.

### B) Minimalistické Vitality Dots
Spodní řádek buňky obsahuje 3 zářící mikro-tečky:
- 💧 **Voda**: Azurová tečka s pulzující aurou při splnění cíle $\ge 8$ sklenic.
- 😴 **Spánek**: Fialová tečka s luminiscencí při optimálním spánku $\ge 7.5\text{h}$.
- ⚡ **Nálada/Energie**: Tečka zbarvená podle nálady dne (1–10).
- 💊 **Vitamíny**: Miniaturní indikátor splněných vitamínů/léků.

### C) Zen Peek HUD Popover
Při najetí myší na buňku (`hover` s 200ms debounce) se otevře plovoucí frosted-glass karta:
- **Hlavička**: Plný název dne + počasí (`☀️ 24°C`).
- **Telemetrie**: Přesné hodnoty spánku, vody a nálady.
- **Agenda**: Kompletní chronologický seznam událostí.
- **Rychlé Akce v patičce**: `[💧 +1 Voda]`, `[+ Plán]`, `[Detail ›]`.

---

## 5. Týdenní 24h Mřížka: Time Spotlight & Romantic Gap (Fáze 3)

Implementováno v `week-view.js`:

### A) Zen Týdenní Hlavičky
Čistá vertikální struktura bez textového šumu:
1. **Den v týdnu**: `PO`, `ÚT`, `ST`... (dnešek zářivě modrý `#5865F2`).
2. **Číslo dne**: Zářivý kruhový odznak s hloubkovým stínem pro dnešek.
3. **Počasí**: Kompaktní čip s ikonou a teplotou.
4. **Vitality Dots**: 3 mikro-tečky pod počasím.
5. **Hero Untimed Badge**: Max. 1 subtilní frosted čip pro celodenní akci či urgentní deadline.

### B) Nightscape 24h Ambientní Gradient
Pozadí 24-hodinového rozvrhu plynule přechází podle denní doby:
- `00:00 – 06:00`: Kosmická indigová noc (`rgba(15, 15, 26, 0.7)`).
- `07:00 – 17:00`: Čistý grafitový den pro maximální čitelnost karet.
- `18:00 – 23:00`: Teplý soumračný tón (`rgba(37, 28, 48, 0.25)`).

### C) Now Laser 3.0 & Time Spotlight
- **Now Laser**: Zářící horizontální paprsek s pulzujícím diamantovým majákem a bublinou aktuálního času.
- **Column Spotlight**: Jemný vertikální světelný kužel na sloupci dnešního dne (`cal-today-spotlight`).

### D) Romantic Gap In-Grid Zones
Algoritmus `findBestRomanticGaps` analyzuje rozvrh a detekuje volná večerní okna $\ge 90\text{ min}$ bez kolizí se školou či gymem. V rozvrhu se vykreslí pruhovaný slot `.cal-romantic-gap-slot`:
- Kliknutím na slot se otevře **Quick Add** s předvyplněným časem a kategorií *Rande*.

---

## 6. Interaktivita, Klávesové Zkratky & AI Spotlight Command Bar (Fáze 4)

Implementováno v `index.js` a `nlp-quick-add.js`:

### A) AI Spotlight Command Bar
Aktivuje se stiskem `Cmd+K`, `Ctrl+K`, `Mezerníku` nebo `N`:
- **Plovoucí skleněný terminál** (`backdrop-blur-2xl`, `border-white/15`).
- **Živé NLP parsování v češtině**:
  - *"Zítra v 17:00 Push Day"* $\rightarrow$ úterý 17:00, kategorie 🏋️ Gym.
  - *"Pátek 19:30 Večeře s Klárkou"* $\rightarrow$ pátek 19:30, kategorie ❤️ Rande.
  - *"Středa 14:00 Projekt WIS"* $\rightarrow$ středa 14:00, kategorie 🎓 FIT.
- **Detekce kolizí v reálném čase**: Varování, pokud v daném čase již existuje přednáška či trénink.
- **Rychlé návrhy & příkazy**: Okamžité prokliky při prázdném vstupu.

### B) Kompletní Přehled Klávesových Zkratek

| Klávesa | Akce | Popis |
|---|---|---|
| `Cmd+K` / `Ctrl+K` / `Mezerník` | **Spotlight Command Bar** | Otevře plovoucí AI vyhledávání a NLP plánování |
| `W` | **Týdenní pohled** | Přepne na 24h rozvrh (Week View) |
| `M` | **Měsíční pohled** | Přepne na no-scroll mřížku (Month View) |
| `A` | **Agenda pohled** | Přepne na chronologický seznam (Agenda View) |
| `T` | **Skočit na Dnešek** | Okamžitě vycentruje kalendář na dnešní den |
| `←` / `J` | **Předchozí období** | Posun o týden / měsíc zpět |
| `→` / `K` | **Další období** | Posun o týden / měsíc dopředu |
| `1` – `6` | **Přepínání filtrů** | Vše (1), FIT (2), Gym (3), Spánek (4), Voda (5), Zdraví (6) |
| `G` | **Romantic Gap Finder** | Otevře vyhledávač volných oken na rande |
| `D` | **Ranní Briefing** | Otevře ranní přehled dne s Discord exportem |
| `E` | **Export iCal** | Otevře exportní dialog standardu RFC 5545 |
| `?` / `Shift+/` | **Nápověda zkratek** | Zobrazí Bento přehled všech klávesových zkratek |
| `ESC` | **Zavřít dialogy** | Okamžitě zavře všechny otevřené popovery a modály |

---

## 7. Specializované Telemetrické Filtry

Při přepnutí filtru v horní liště se buňky měsíčního i týdenního zobrazení přepnou do dedikovaného telemetrického módu:

1. 💧 **Voda (Liquid Tank)**: Vizuální nádrž s SVG vlnami a procentuálním naplněním. Při dosažení $8/8$ sklenic buňka získá Aqua záři. Obsahuje in-cell tlačítko `[+1]`.
2. 😴 **Spánek (Hypnogram)**: Noční obloha s personifikovanými avatary (👸 Královský $\ge 9\text{h}$, ✨ Optimální $\ge 7.5\text{h}$, 🥱 Průměrný, 🧟‍♀️ Deficit).
3. 🏋️‍♂️ **Gym (Muscle Pump Flare)**: Zlatavá aura, součet odcvičených minut, celkový objem sérií a název tréninku.
4. 🎓 **FIT (Cyber Radar)**: Zvýraznění laboratoří, přednášek s čísly místností a pulzující deadliny s odpočtem.
5. 💜 **Zdraví & Nálada (Aura Heatmap)**: Radiant mesh gradienty zbarvené podle skóre nálady (1–10) s indikátory menstruačního cyklu.

---

## 8. Ranní Briefing, Partnerský Radar & iCal Sync

- **Ranní Briefing (`daily-briefing.js`)**: Analýza spánku a regenerace, lokální počasí, dnešní program na FIT a tréninky, 1-click Discord markdown clipboard export.
- **Partnerský Radar (`partner-radar.js`)**: Živý odpočet do dalšího rande s odznáčkem v záhlaví a tlačítkem pro odeslání srdečního pulzu (*Love Pulse*) s haptikou a zvukem.
- **iCalendar Standard Sync (`ics-sync.js`)**: Plná podpora RFC 5545 pro obousměrný export a import událostí do Apple Calendar, Google Calendar a Outlooku s podporou pravidla `RRULE` pro opakované přednášky.

---

## 9. Časový Engine & Kolizní Algoritmus

Soubor `time-engine.js` poskytuje deterministické matematické funkce bez externích závislostí:

### A) Výpočet Souřadnic (`calculateEventCoordinates`)
$$\text{top} = \frac{\text{startMinutes} - (\text{startHour} \times 60)}{60} \times \text{HOUR\_HEIGHT}$$
$$\text{height} = \max\left(20, \frac{\text{durationMinutes}}{60} \times \text{HOUR\_HEIGHT}\right)$$

### B) Kolizní Balicí Algoritmus (`calculateEventCollisions`)
Překrývající se události jsou seskupeny do sloupcových klastrů a každé kartě je přiřazen index sloupce `colIndex` a celkový počet `totalCols`.

---

## 10. Verifikace & Testovací Pokrytí

Modul Kalendář 3.0 je stoprocentně pokryt automatickými integračními a jednotkovými testy ve frameworku **Vitest**:

```bash
npm run test:run -- tests/unit/calendar-week-view.test.js tests/unit/calendar-phase3.test.js tests/unit/calendar-quick-popover.test.js tests/unit/calendar-phase4.test.js
```

### Výsledky Testovací Sady:
- **Testovací soubory**: `4 passed (4)`
- **Celkový počet testů**: `51 passed (51)`
- **Úspěšnost**: `100 %`
