# Skupina F: Systém, Progrese a Gamifikace

Tyto moduly tvoří technické a herní jádro aplikace, které motivuje k aktivitě a umožňuje personalizaci.

## 1. Nastavení (Settings)
**Soubor**: `js/modules/settings.js`

Komplexní centrum pro správu vzhledu a chování aplikace.

### Klíčové oblasti:
- **Témata (Themes)**: Přepínání mezi vizuálními styly (Kiscord Dark, Light, Valentýn, Vánoce, Tetris).
- **Vzhled**: Kontrola nad "Glassmorphismem" (intenzita rozostření pozadí) a viditelností widgetů na nástěnce.
- **Notifikační Engine**: 
    - Detailní nastavení pro každý typ připomínky (Voda, Léky, Večerka).
    - Možnost zapnout/vypnout haptickou odezvu a zvuk pro každou notifikaci zvlášť.
    - Správa nativních systémových oznámení.
- **Správa dat**: Funkce pro vymazání mezipaměti (cache) a odhlášení.

---

## 2. Síň Slávy (Achievements)
**Soubor**: `js/modules/achievements.js`

Sbírka odznaků oslavující důležité milníky a návyky.

### Funkcionalita:
- **Kategorie**: Třídění na Zdraví, Vztah, Zážitky a Speciální akce.
- **Auto-Unlock Systém**: Modul obsahuje "hooky", které automaticky odemykají odznáčky na základě dat (např. *Hydration Master* při 8 sklenicích vody, *Sleeping Beauty* při 7 dnech dobrého spánku).
- **Realtime synchronizace**: Pokud jeden z partnerů odemkne achievement, druhý to okamžitě uvidí v UI doprovázené konfetami.
- **Admin UI**: Možnost pro Jožku definovat nové achievementy přímo v aplikaci.

---

## 3. Levely a Relationship XP
**Soubor**: `js/modules/levels.js`

Systém měřící "úroveň" vztahu na základě společné aktivity.

### Mechanika:
- **Výpočet XP**: Body se sčítají ze všech modulů (vyplněné zdraví, splněné položky v bucket listu, nové vzpomínky na timeline) pomocí Supabase RPC funkce.
- **Tituly**: Každý level (nebo skupina levelů) má svůj název (např. *Hledači pokladů*).
- **Odměny**: Dosažení určitých milníků (např. Level 5) automaticky odemyká a aplikuje nová schémata vzhledu.
- **Sidebar Badge**: Dynamický prvek v bočním menu s progress barem, který blikne při každém zisku XP.

---

## 4. Společné Questy (Co-op Missions)
**Soubor**: `js/modules/quests.js`

Měsíční výzvy, které vyžadují spolupráci obou uživatelů.

### Přehled:
- **Typy questů**: Sčítání společné spotřeby vody, synchronizace spánku, společné pohybové aktivity nebo dosahování vysokého skóre v Tetrisu.
- **Agregace dat**: Využívá pokročilé SQL funkce pro porovnávání dat obou uživatelů v reálném čase.
- **Vizuální Progress**: Karty s barevnými gradienty a ukazateli splnění v procentech.
- **Nové mise**: Rozhraní pro vyhlášení nové mise (název, popis, cíl, emoji a typ sledování).
