# 🚀 Kiscord: Strategický Masterplan, Analýza Trhu & Roadmapa

> **Dokument strategických rozhodnutí, tržní analýzy a komerčního plánu pro transformaci projektu Kiscord z osobního monolitu na profitabilní ekosystém aplikací.**

---

## 📌 1. Exekutivní shrnutí & Realistický verdikt

| Aspekt | Monolitický Kiscord (Dnes) | Rodina aplikací (Cílový stav) |
| :--- | :--- | :--- |
| **Technická úroveň** | ⭐⭐⭐⭐⭐ (9.5/10) – Offline-first, reaktivní, 200+ testů | ⭐⭐⭐⭐⭐ (9.5/10) |
| **Produktový fokus** | ⭐ (1.5/10) – Feature bloat, lokální specifika (VUT, Rakousko) | ⭐⭐⭐⭐ (8.5/10) – Jasná hodnota a cílovka |
| **Šance na 400 € / měsíc** | **< 1 %** (Jako monolit neprodejné) | **75–85 %** (Reálné při 80 předplatitelích) |
| **Cílová skupina** | Pouze Josef & Klárka | 1. Fitness jednotlivci & Gym Bros<br>2. Zamilované páry |
| **Monetizace** | Žádná | B2C Freemium předplatné ($4.99–$7.99 / měs.) |

### 💡 Hlavní strategický závěr:
Kiscord je **technický klenot**, ale **produktově přehlcený monolit**. Řešením není všechno zahodit ani pokračovat v nekonečném přidávání kanálů, ale **rozdělit kód do dvou samostatných, čistých aplikací se sdílenou databází (Supabase)**.

---

## 🏗️ 2. Architektura rodiny: Ekosystém 2 aplikací

Místo jedné obří aplikace vzniknou **2 specializované aplikace** nad jedním Supabase backendem:

```
                          ┌────────────────────────────────────────┐
                          │   JEDNOTNÝ BACKEND (Supabase + Auth)   │
                          └───────────────────┬────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │                                                 │
          ┌──────────▼──────────┐                           ┌──────────▼──────────┐
          │ APP 1: PULSE / FORGE│                           │  APP 2: DUOTIME     │
          │ (Bio & Gym Tracker) │                           │ (Párový Kalendář)   │
          └──────────┬──────────┘                           └──────────┬──────────┘
                     │                                                 │
                     └───────────────► ⚡ SYNERGY BRIDGE ◄──────────────┘
                                    (Love Coins & Přelévání)
```

### 🏋️ Aplikace 1: *PulseOS* / *Forge* (Bio-Tracking & Gym OS)
* **Pro koho:** Jednotlivci, sportovci, kamarádi v gymu (Gym Bros) i páry.
* **Klíčové moduly:** 
  * Gym Tracker (100+ cviků, GIFy, 1RM křivky, série, RIR/RPE, svalová heatmapa).
  * Výživa & TDEE (Dynamický výdej energie ve stylu MacroFactor, makra, půst IF).
  * Biometrie (Ranní váha EMA, 6 obvodů, FFMI, křížové korelace).
  * Denní rutina (Spánek, hydratace, zvyky, regenerace).
* **Fungování:** 100% samostatně použitelné i pro sólo uživatele (žádná závislost na partnerovi).

### 💖 Aplikace 2: *DuoTime* / *TwoFold* (Párový Lifestyle Kalendář)
* **Pro koho:** Páry žijící spolu i na dálku.
* **Klíčové moduly:**
  * Sdílený interaktivní kalendář (volná okna, společný čas).
  * Plánovač rande & mapové trasy s rozpočtem.
  * Zábava & Watchlist (TMDB databáze, **Tinder Matcher na filmy a jídlo**, Kolo osudu).
  * Intimita & Haptika (**Haptic Touch / Heartbeat** v reálném čase, denní otázky, dopisy).
  * Love Shop (Uplatňování kuponů za Love Coins).

### ⚡ Synergy Bridge (Unikátní přidaná hodnota):
Pokud má uživatel obě aplikace a partnera:
1. Odcvičený trénink nohou v *PulseOS* $\rightarrow$ v kalendáři partnera v *DuoTime* se objeví notifikace: *"Pepa dnes zničil nohy v gymu!"*.
2. Splněná hydratace a trénink $\rightarrow$ zisk **+50 Love Coins** do *Love Shopu* na nákup kuponu na rande.

---

## 🥊 3. Pozicování: Páry vs. "Gym Bros" (The Co-op Engine)

Aby se neomezil trh pouze na páry, bude **Aplikace 1 (Fitness)** obsahovat volitelný **režim partnerství**:

```
                       ┌─────────────────────────────────────┐
                       │     VOLBA REŽIMU PŘI ONBOARDINGU    │
                       └──────────────────┬──────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
   ┌────────▼────────┐           ┌────────▼────────┐           ┌────────▼────────┐
   │ 💖 COUPLE CO-OP │           │ ⚔️ GYM BRO DUO  │           │  🐺 SOLO CHAD   │
   │ Generuje Love   │           │ 1v1 Leaderboard │           │ Čistý tracker   │
   │ Coins pro rande │           │ Sázky o protein │           │ bez sociálního  │
   │ a Love Shop     │           │ Kdo vynechá platí│          │ balastu         │
   └─────────────────┘           └─────────────────┘           └─────────────────┘
```

* **Výhoda:** Aplikaci si může stáhnout gym bro s kámošem a sázet se o protein, aniž by viděl růžová srdíčka, a zároveň ji může používat pár pro vzájemnou motivaci.

---

## 📋 4. Audit a osud modulů Kiscordu

| Původní Kanál / Modul | Cílové umístění | Status a role |
| :--- | :--- | :--- |
| **`#posilovna`** (Gym HUD, 1RM, GIFy) | **APP 1 (Fitness)** | Hlavní klenot aplikace |
| **`#výživa`** (Kalorie, TDEE, AI parser) | **APP 1 (Fitness)** | Prémiový adaptivní výživový kouč |
| **`#tělo-a-míry`** (Váha EMA, obvody, FFMI) | **APP 1 (Fitness)** | Biometrické centrum |
| **`#dashboard`** (Můj Den, voda, spánek) | **APP 1 (Fitness)** | Denní přehled |
| **`#spánek-a-sny`**, **`#biohacks`**, **`#regenerace`**| **APP 1 (Fitness)** | Wellness a regenerace |
| **`#kalendář`** (Události, volná okna) | **APP 2 (Lifestyle)** | Hlavní tab párového kalendáře |
| **`#plánovač-rande`** (Mapy a trasy) | **APP 2 (Lifestyle)** | Rande a výlety |
| **`#watchlist`** + `netflixMatcher` (Tinder) | **APP 2 (Lifestyle)** | Výběr filmů a seriálů |
| **`#love-shop`**, `#bucket-list`, `#quests` | **APP 2 (Lifestyle)** | Vztahová herní ekonomika |
| **`#dotek-na-dálku`** (Haptika), `#dopisy` | **APP 2 (Lifestyle)** | Intimita na dálku |
| **`#rozhodovací-aréna`**, `#gamesky` | **APP 2 (Lifestyle)** | Minihry, duely, kvízy |
| **`#rozvrh`**, `#studijní-plán`, `#koleje-brno` | ❌ **VYNECHAT** | Ponechat jen v privátním Kiscordu |
| **`#rakousko-*`**, `#matura-*`, `#music-bot` | ❌ **VYNECHAT** | Ponechat jen v privátním Kiscordu |

---

## 💰 5. Jednotková ekonomika: Cesta ke 400 EUR / měsíc

Pro dosažení cíle **400 EUR / měsíc (10 000 Kč / měsíčně)** při ceně **4.99 EUR / měsíc**:

* **Počet platících zákazníků:** **80 lidí** (nebo 40 párů).
* **Potřebná uživatelská základna (při 4% konverzi):** **2 000 stažení / registrací**.
* **Fixní náklady:** **0–25 EUR / měsíc** (Supabase + Vercel).
* **Čistý zisk:** **~375+ EUR měsíčně (Marže 94 %)**.

### Cenová struktura (Bundle Suite):
* **Pouze Fitness App (*PulseOS*):** $5.99 / měsíc ($44.99 / rok).
* **Pouze Partnerský Kalendář (*DuoTime*):** $3.99 / měsíc ($29.99 / rok za pár).
* **🏆 DuoLife Suite (Obě aplikace):** **$7.99 / měsíc ($59.99 / rok pro oba)**.

---

## 🗺️ 6. Realistická 18měsíční Roadmapa

```
[Měsíc 1–2] FÁZE 0: Laboratoř & Stabilizace
 ├── Dokončit tracking ekosystém v Kiscordu (Váha EMA, TDEE, Gym HUD)
 └── Otestovat denní spolehlivost a offline synchronizaci s Klárkou

[Měsíc 3–4] FÁZE 1: Extrakce App 1 (Fitness) & Uzavřená Beta
 ├── Vytvořit čisté 4-tabové mobilní UI pro PulseOS
 ├── Nasadit onboarding s volbou režimu (Solo / Gym Bro / Couple)
 └── Uzavřená beta pro 30 kamarádů z posilovny a okolí (Cíl: D30 Retence > 30 %)

[Měsíc 5–6] FÁZE 2: Veřejný Launch App 1 & První Příjmy
 ├── Integrace platební brány Stripe (Freemium + $5.99/mo Pro)
 ├── Spuštění virálních krátkých videí (Gym Bro sázky, porovnání 1RM na TikToku/Reels)
 └── Cíl: Prvních 1 000 uživatelů a $1 000 MRR

[Měsíc 7–8] FÁZE 3: Stavba App 2 (DuoTime) & Synergy Bridge
 ├── Extrakce Kalendáře, Map, Filmového Tinderu a Love Shopu
 └── Zprovoznění realtime můstku (Love Coins z fitka do shopu)

[Měsíc 9–10] FÁZE 4: Ekosystémový Launch & Balíček Suite
 ├── Spuštění DuoTime a bundle předplatného ($7.99/mo)
 ├── Cross-sell kampaň uvnitř Fitness aplikace
 └── Cíl: $5 000 – $10 000 MRR

[Měsíc 11–18] FÁZE 5: Nativní Store (Capacitor/iOS) & Škálování
 ├── Zabalení do iOS / Android nativních balíčků (In-App Purchases)
 ├── Spolupráce s mikro-influencery (fitness páry)
 └── Cíl: Škálování na $25 000 – $40 000 MRR ($300k–$500k ARR)
```

---

## 🧭 7. Tři zlatá pravidla pro Josefa (Founder Guidelines)

1. **Dnes nic nerozděluj:** Dokonči stávající moduly v Kiscordu tak, ať tě baví je denně používat. Kiscord ti slouží jako dokonalá testovací laboratoř.
2. **Pravidlo 50/50 od Fáze 2:** Jakmile spustíš aplikaci pro veřejnost, 50 % času věnuj kódování a 50 % času tvorbě obsahu a mluvení s uživateli.
3. **Neměj strach říct si o peníze:** Zpoplatnění pokročilých funkcí (MacroFactor TDEE, neomezené cviky, párová synchronizace) je jediný způsob, jak ověřit skutečnou hodnotu produktu.

---
*Vytvořeno v rámci strategické session Kiscord dne 23. 8. 2026.*
