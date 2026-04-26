# Skupina C: Interaktivita a Zábava

Moduly v této skupině jsou navrženy pro posílení vzájemného vztahu skrze společné aktivity, hry a upřímnou komunikaci.

## 1. Denní Otázky
**Soubor**: `js/modules/dailyQuestions.js`

Každodenní rituál, který pokládá partnerům stejnou otázku a odemyká odpovědi až po reakci obou stran.

### Funkcionalita:
- **Blind Reveal**: Odpověď partnera je rozmazaná/zamčená, dokud uživatel neodešle svou vlastní odpověď.
- **Real-time synchronizace**: Okamžité zobrazení odpovědi partnera po odeslání díky Supabase Realtime.
- **Chronologický Archiv**: Možnost procházet starší otázky a odpovědi v přehledném seznamu.
- **Správa otázek**: Uživatelé mohou navrhovat nové otázky, které jsou následně náhodně vybírány.
- **Speciální události**: Modul obsahuje logiku pro injektáž speciálních otázek (např. k 100. dni vztahu).

---

## 2. Konverzační Témata
**Soubor**: `js/modules/topics.js`

Knihovna hlubokých i zábavných otázek pro chvíle, kdy partneři chtějí vést smysluplný rozhovor.

### Klíčové vlastnosti:
- **Kategorizace**: Otázky jsou rozděleny do témat jako (Láska, Budoucnost, Nostalgie, Hypotézy).
- **Systém postupu**: Každé téma sleduje, které otázky již byly probrány (`done_indices`), a umožňuje resetování pokroku.
- **Záložky (Bookmarks)**: Možnost uložit si zajímavé otázky na později do Master kategorie "Moje Oblíbené".
- **Interaktivní karty**: Otázky se zobrazují na prémiových kartách s animací rotace a náhodným výběrem z dostupného poolu.
- **Export**: Generování `.txt` souboru s celou knihovnou otázek.

---

## 3. Herní Doupě & Tier Listy
**Soubory**: `js/modules/gamesHub.js`, `js/modules/tierlist.js`

### Herní Doupě:
Rozcestník pro interaktivní minihry:
- **Kdo spíše?**: Hlasování o tom, kdo z dvojice má k danému tvrzení blíže.
- **Draw Duel**: Společné digitální plátno pro kreslení a hádání.
- **Puzzle**: Minihry pro volný čas.

### Tier List Creator:
Pokročilý nástroj pro hodnocení a řazení věcí do kategorií (S až D).
- **Drag & Drop**: Využívá knihovnu `SortableJS` pro intuitivní přesouvání položek.
- **Režim DUEL**: 
    1. Každý partner řadí položky tajně.
    2. Modul sleduje stav "Připraven" pro oba hráče.
    3. Po odhalení se zobrazí shody (zvýrazněné zlatým lemem) a rozdíly v názorech.
- **Dynamické zdroje**: Automaticky generuje položky z jiných částí aplikace (filmy z Knihovny, vzpomínky z Timelinu, rande z Mapy).
