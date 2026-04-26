# Skupina B: Vzdělávání a Pozvání

Tato skupina modulů slouží k prohlubování znalostí, systematickému studiu a podpoře zdravého životního stylu.

## 1. Maturita 2026
**Soubor**: `js/modules/matura.js` (a submoduly v `js/modules/matura/*`)

Komplexní studijní ekosystém navržený pro přípravu k maturitní zkoušce.

### Klíčové součásti:
- **Study Dashboard**: Zobrazuje aktuální studijní sérii (Streak), naplánované „mise“ pro daný den a umožňuje spustit SOS volání o pomoc (notifikace partnerovi).
- **Knowledge Base (KB)**:
    - **Markdown Editor**: Podporuje formátování, vkládání obrázků a matematických vzorců (KaTeX).
    - **Interaktivní Obsah (TOC)**: Automaticky generovaná navigace podle nadpisů.
    - **Highlighter**: Systém pro barevné zvýrazňování textu (Důležité, Biflování, Ovládám).
- **AI Integrace (Gemini)**:
    - **Generování Testů**: Automatická tvorba kvízů z obsahu zápisku.
    - **Flashcards**: Generování studijních kartiček.
- **Pomodoro Timer**: Integrovaný časovač soustředění s synchronizací stavu mezi partnery.

### Technická zajímavost (Highlighting):
Systém využívá `highlighter.js` pro manipulaci s DOMem bez poškození struktury Markdownu, což umožňuje perzistentní barevné značení přímo v textu.

---

## 2. Regenerace
**Soubor**: `js/modules/regenerace.js`

Personalizovaný průvodce biohackingem a zdravím, vytvořený na míru pro Klárku.

### Sekce modulu:
- **Holistický Rozbor**: Hloubková analýza zdravotních mechanismů.
- **Katalog Suplementů**: Detailní karty doplňků stravy (Železo, Zinek, Hořčík) s popisem účinků a dávkováním.
- **Biologická Proměna (Timeline)**: Vizuální osa pokroku s dynamickým progress barem, který se plní v čase od začátku regeneračního protokolu (`REGENERACE_START_DATE`).
- **Vědecká Knihovna**: Výtahy z odborných studií a klinických testů.

---

## 3. Encyklopedie (Funfacts)
**Soubor**: `js/modules/funfacts.js`

Modul pro objevování zajímavostí rozdělený do tematických kategorií.

### Architektura kategorií:
Modul využívá třístupňovou hierarchii:
1. **Hlavní kategorie**: (např. 🦝 Mývalí moudra, 🦉 Soví vědomosti).
2. **Podkategorie L1**: (např. Anatomie, Chování).
3. **Podkategorie L2**: (např. Tlapky, Srst).

### Funkce:
- **Míra osvícení**: Pro každou kategorii se sleduje progres (kolik faktů již uživatel viděl) pomocí tabulky `fun_fact_progress`.
- **Oblíbené (Bookmarks)**: Možnost uložit si konkrétní fakt srdíčkem do vlastní sbírky.
- **Random Mix**: Speciální režim pro „všehochuť“ faktů.
