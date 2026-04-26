# Skupina D: Společná Cesta a Vzpomínky

Tyto moduly slouží jako digitální archiv vztahu, od prvních setkání až po plánování budoucnosti.

## 1. Timeline (Naše Společná Cesta)
**Soubor**: `js/modules/timeline.js`

Chronologický deník všech důležitých momentů s důrazem na vizuální vyprávění.

### Klíčové vlastnosti:
- **Časová osa**: Události jsou seskupeny podle měsíců a let.
- **Polaroidová Galerie**: Speciální komponenta pro zobrazení fotografií s "polaroid" efektem, datem a lepící páskou. Podporuje gesta (swipe) a full-screen režim.
- **Milníky (Milestones)**: Možnost označit událost jako klíčovou (ikona korunky), doprovázenou konfetami.
- **Uživatelské Highlighty**: Každý partner může k události připsat svůj osobní postřeh nebo "vtipný moment".
- **Integrace s Mapou**: Pokud je k události přiřazena lokace, lze na ni jedním kliknutím přejít v modulu Mapa.

---

## 2. Mapa & Plánovač Rande
**Soubor**: `js/modules/map.js`

Interaktivní plánovač založený na mapě (Leaflet.js) pro objevování nových míst a hodnocení těch navštívených.

### Funkcionalita:
- **Kategorizace míst**: Procházky, Výhledy, Zábava a Jídlo s barevně odlišenými piny.
- **Plánovač trasy**: Sidebar umožňující přidat až 10 míst do seznamu a následně celou trasu otevřít v Google Maps.
- **Hodnocení (Star System)**: Pětihvězdičkový systém hodnocení rande s textovými popisky.
- **Propojení se vzpomínkami**: Místa, na kterých se již odehrála událost z Timelinu, jsou označena pulzujícím srdcem.
- **Plánování do kalendáře**: Možnost nastavit čas a poznámku k místu, což automaticky vytvoří záznam v modulu Kalendář.

---

## 3. Digitální Dopisy
**Soubor**: `js/modules/letters.js`

Systém pro posílání dlouhých, promyšlených vzkazů, které se odemykají v budoucnu.

### Klíčové vlastnosti:
- **Časové odemknutí (Timed Lock)**: Dopis lze odeslat s datem v budoucnosti. Do té doby vidí příjemce v inboxu pouze zámek a čas odpočtu.
- **Potvrzení o přečtení**: Odesílatel vidí, zda už si partner jeho dopis přečetl.
- **Prémiový prohlížeč**: Pokročilý fullscreen prohlížeč přiložených fotografií s podporou pinch-to-zoom a stahování.
- **Archivace**: Třídění na Doručené, Odeslané a Koncepty (Compose view).

---

## 4. Confession (Speciální Patch)
**Soubor**: `js/modules/confession.js`

Unikátní interaktivní modul navržený jako "překvapení", využívající technickou estetiku aplikace.

### Fáze zážitku:
1. **Terminal Simulation**: Vizuální simulace příkazové řádky (CMD), která "skenuje" data aplikace (logs, inside jokes) a potvrzuje kompatibilitu.
2. **Typewriter Message**: Heartfelt vyznání psané strojem s progresivním odhalováním textu.
3. **Interaktivní rozhodnutí**: Finální otázka s možností volby, která dynamicky mění závěr zážitku a spouští vizuální efekty (konfety, haptika).
