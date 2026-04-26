# Skupina E: Entertainment Hub (Knihovna)

Tato sekce spravuje společnou sbírku digitální zábavy – od filmů přes seriály až po hry, včetně historie sledování a seznamu přání.

## 1. Knihovna Médií
**Soubor**: `js/modules/library.js`

Centrální katalog rozdělený na Filmy, Seriály a Hry s pokročilou správou obsahu.

### Funkce:
- **Kategorizace a Tagování**: Položky jsou tříděny podle žánrů a doplňovány o "Mood Tags" (např. *Doják*, *Napínavé*, *Pohoda*), které pomáhají s výběrem podle nálady.
- **Stahování a Streamování**:
    - **Magnet Linky**: Přímé propojení s torrent klientem (qBittorrent).
    - **Google Drive**: Alternativní zdroj pro přímé stažení.
    - **Trailers**: Rychlý přístup k ukázkám na YouTube.
- **Deníček sledování (Watch History)**:
    - **Stav**: Sledování (Watching), Viděno (Seen), V plánu (Unseen).
    - **Hodnocení**: Pětihvězdičkový systém.
    - **Verdikty**: Textové recenze s rychlými presety (Srdcovka, Hluboké, Nuda).
- **Manuál pro techniky**: Integrovaný návod (injektovaný jako zpráva od Jožky) pro nastavení stahování a propojení s TV.

---

## 2. Watchlist Hub
**Soubor**: `js/modules/watchlist.js`

Inteligentní přehled zájmů obou partnerů, který usnadňuje rozhodování, co sledovat.

### Unikátní vlastnosti:
- **Spolu-seznam (Together Mode)**: Modul automaticky detekuje průnik zájmů. Položky, které si "ocentrují" oba partneři, se zobrazí v prioritní sekci se zlatým lemem.
- **Osobní sekce**: Rozdělení na "Moje přání" a "Přání partnera" (včetně personalizovaných ikon a barev podle toho, kdo je přihlášen).
- **Deníček zážitků**: Rychlý náhled na 6 nejnovějších recenzí a hodnocení ze společné historie.

---

## 3. Decision Maker (Roll the Dice)
**Implementace**: `Watchlist.rollTheDice()`

Funkce pro řešení rozhodovací paralýzy:
1. **Filtrování**: Vybere pouze položky ze *Spolu-seznamu* (shodné zájmy).
2. **Animace**: Spustí vizuální efekt "házení kostkou".
3. **Winner Modal**: Zobrazí vítěze ve velkém modálu s konfetami a nabídne okamžité naplánování do kalendáře.
