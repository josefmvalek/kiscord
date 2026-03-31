-- Vytvoření tabulky pro Maturitní Akademii (pokud neexistuje)
CREATE TABLE IF NOT EXISTS public.matura_kb (
    item_id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    sections_count INTEGER DEFAULT 0
);

-- Nastavení RLS (Row Level Security)
ALTER TABLE public.matura_kb ENABLE ROW LEVEL SECURITY;

-- Smazat staré politiky, pokud existují (aby to nepadalo na chybě)
DROP POLICY IF EXISTS "Allow public read access" ON public.matura_kb;
DROP POLICY IF EXISTS "Allow public insert access" ON public.matura_kb;
DROP POLICY IF EXISTS "Allow public update access" ON public.matura_kb;

-- Vytvoření nových politik
CREATE POLICY "Allow public read access" ON public.matura_kb FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.matura_kb FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.matura_kb FOR UPDATE USING (true);

-- Vložení prvního tématu (Informatika 01)
INSERT INTO public.matura_kb (item_id, content, sections_count) 
VALUES ('it1', '# **Maturitní otázka 01: Data a informace**

## **1. Teoretický základ: Data, informace a komunikace**

- **Data:** Prosté údaje, které samy o sobě nedávají smysl. Jsou to surové stavební kameny (čísla, znaky).
- **Informace:** Data s významem a v kontextu. Představují poznatek o dění v reálném světě a jsou na datech přímo závislé.
- **In-formatio** (ztvárnění, utváření), poznatek o dění v reálném světě
- **Míra neurčitosti (Claude Shannon):** Informace omezuje neurčitost a nejistotu. Čím méně informací máme, tím větší je neurčitost (a naopak).
- **Veličina informace:** Lze ji přesně měřit a má svou jednotku (**bit**). Na začátku získávání máme minimum informací, na konci maximum.

### **Otázky:**  
**Rozdíl mezi daty a informacemi (včetně příkladů)**

Základem je pochopit, že **informace = data + kontext/význam**.

- **Data:** Jsou to surové údaje, které samy o sobě nedávají smysl.
    - _Příklad:_ Číslo „38,5“ nebo slovo „Nemocnice“.
- **Informace:** Data, kterým dodáme význam a zasadíme je do souvislostí.
    - _Příklad:_ „Tělesná teplota pacienta je 38,5 °C.“ (Teď už víme, co to číslo znamená a že je to problém) .
- **Vztah:** Informace jsou na datech přímo závislé. Bez dat není co interpretovat.

**Claude Shannon a míra neurčitosti**

Pro ústní zkoušku je skvělé zmínit, že informace **omezuje neurčitost a nejistotu**.

- **Princip:** Čím více informací získáme, tím méně možností nám zbývá.
- **Příklady:**
    1. **Hádání zvířete:** Na začátku může jít o jakékoli zvíře na světě (maximální neurčitost). Každá odpověď (Má to srst? Je to savec?) je informace, která vylučuje tisíce jiných možností.
    2. **Zjišťování bydliště:** Postupným kladením otázek zužujeme okruh z celého světa na stát, město, ulici a číslo popisné.

### **Klíčové pojmy z teorie informace:**

- **Typy dat:** Data mohou být **analogová** (spojitá, např. zvuk na desce) nebo **digitální** (zapsaná v binární soustavě). Dále je dělíme na strukturovaná (databáze) a nestrukturovaná (text).
- **Šum:** Nežádoucí složka, která znehodnocuje informaci nebo ztěžuje její přenos.
- **Redundance:** Nadbytečnost informací. Slouží k zajištění srozumitelnosti nebo k ochraně proti chybám při přenosu.
- **Entropie:** Míra neurčitosti systému. Čím vyšší je entropie, tím méně informací o systému máme k dispozici.

## **2. Strategie získávání informací**

Způsob, jakým se ptáme a hledáme, zásadně ovlivňuje rychlost dosažení výsledku.

- **Zjišťovací otázky:** Vhodná informatická otázka očekává jednoznačnou odpověď (ano/ne, pravda/nepravda).
- **Efektivita:** Čím méně otázek potřebujeme, tím rychleji informaci získáme. „Chytrá“ otázka vyloučí co nejvíce nevyhovujících možností najednou.
- **Metody vyhledávání:**
    - **Binární vyhledávání (Půlení intervalu):** Extrémně účinné i u velkých množin dat. Funguje v seřazené množině.
        - _Příklad:_ Hledáš slovo ve slovníku o 1000 stranách. Neotevíráš stranu po straně. Otevřeš prostředek (strana 500). Je slovo dál? Ano. Právě jsi zahodil prvních 500 stran. Opakuješ na zbylých 500 stranách.
    - **Rozhodovací strom:** Grafické schéma, které tě vede k výsledku pomocí větvení.
        - Příklad: Technická podpora. „Svítí kontrolka? (Ano/Ne)“ -> Pokud Ano: „Je červená? (Ano/Ne)“. Každá větev vede k jiné informaci.
    - **Náhodná otázka:** Neefektivní metoda bez logického systému.

### **Množství informace jako měřitelná veličina**

- Informaci v informatice nevnímáme jen pocitově, ale jako veličinu, která má svou jednotku (bit), lze ji přesně měřit a dále s ní matematicky pracovat.
- **Základní principy:**
    - **Časový průběh:** Nejméně informací o daném problému máme na začátku (maximální nejistota), zatímco nejvíce jich máme na konci procesu jejich získávání.
    - **Matematický vztah:** Množství získané informace lze vyjádřit jako rozdíl mezi stavem znalostí „po“ a „před“ akcí.

## **3. Zdroje dat a vyhledávání na internetu**

Dnešní doba se označuje jako **informační věk**.

### **Kde se berou data?**

- **Přímé pořízení:** Měření, výzkum, experiment, rozhovor, pozorování, dotazník. Je to zdlouhavé, ale data jsou spolehlivá a přesná.
- **Externí data:**
    - **Otevřená data:** Zdarma dostupná, např. Národní katalog otevřených dat (NKOD).
    - **Komerční data:** Zpoplatněná data k profesionálnímu využití.
- **Mediální zdroje:** Internet, TV, sociální sítě, fóra, podcasty, tištěná média.

### **Aktivní vyhledávání a získávání informací**

V dnešním informačním věku máme k dispozici obrovské **množství zdrojů**, které dělíme na **digitální** a **tradiční.**

### **Hlavní zdroje informací:**

- **Internetové vyhledávače:** Google, Bing, Yahoo, DuckDuckGo a český Seznam.cz.
- **Digitalizovaná média:** Převedené knihy, písemnosti a dokumenty z archivů do digitální podoby.
- **AI jazykové modely a chatboti:** Moderní nástroj pro získávání a zpracování informací.
    - **Historický milník:** První chatbot **Eliza (1966)** vs. nejznámější současný chatbot **ChatGPT (2022)**.
- **Sociální sítě:** Facebook, Discord, X (Twitter), Instagram, LinkedIn, WhatsApp a další.
- **Tištěná média:** Knihy, časopisy, noviny a portál **Knihovny.cz**

### **Vyhledávání na internetu**

Internet je dynamické prostředí, které neustále roste.

- **Statistika:** Na internetu existují více než **2 miliardy webových stránek**, z nichž je přibližně 300 milionů aktivních.
- **Historie:** Úplně první webová stránka vznikla **6. srpna 1991**.
- **Nástroje:** Kromě textového vyhledávání se využívá i **vyhledávání obrázkem** a rozvíjí se uživatelské rozhraní (UI) prohlížečů.

### **Jak funguje internetový vyhledávač (např. Google):**

Vyhledávač neprohledává internet v reálném čase, ale pracuje s vlastní databází ve třech krocích:

1. **Crawling (Procházení):** Softwaroví roboti (**crawleři**) neustále procházejí web, načítají stránky and ukládají je do databáze. Zpravodajské weby navštěvují častěji kvůli aktuálnosti.
2. **Indexace:** Vyhledávač analyzuje text, obrázky, videa, metadata a klíčová slova. Stránku zatřídí podle jejího zaměření a účelu, aby ji mohl rychle zobrazit ve výsledcích.
3. **Vyhodnocení dotazu:** Algoritmy prohledají relevantní stránky v indexu a zohlední faktory jako lokalita uživatele, kvalita stránky, historie hledání a čerstvost obsahu

### **Pokročilé vyhledávání a SEO**

- Abychom získali co nejpřesnější informaci, musíme umět vyhledávač správně instruovat.
- **Vyhledávací operátory a zpřesňování:**
    - **Klíčová slova:** Použití více slov zpřesňuje výsledek.
    - **Uvozovky "":** Hledání přesné fráze v daném pořadí.
    - **Mínus -:** Vyloučení konkrétního slova z výsledků.
    - **Plus + / Mezera:** Kombinace pojmů.
    - **site:doména:** Vyhledávání pouze v rámci konkrétního webu.
    - **@soc.síť:** Vyhledávání na konkrétní sociální síti.
    - **Vyhledávání obrázkem**
- **Moderní prvky a optimalizace:**
    - **Featured snippet (Doporučený úryvek):** AI generovaný text na začátku výsledků. **Důležité pro zkoušku:** Vždy je nutné ověřit jeho pravdivost, AI může halucinovat.
    - **SEO (Search Engine Optimization):** Optimalizace webu pro organické (neplacené) výsledky.
- **Typy výsledků:**
    - **Organické (přirozené) odkazy**: Zobrazují se na základě své kvality, relevance a důvěryhodnosti. Neobsahují označení „reklama“. Typicky jde o Wikipedii, blogy, fóra nebo informační weby.
    - **Reklama (placená):** Firmy (např. e-shopy) si platí za to, aby se objevily na předních příčkách pro určitá klíčová slova.
- **SEO – Optimalizace pro vyhledávače:**
    - Cílem SEO je dostat web na přední pozice v organických výsledcích bez placení za reklamu.
- **Klíčové faktory úspěchu:**
    - **Kvalitní obsah**: Text musí být relevantní pro uživatele.
    - **Technická struktura**: Web musí být přehledný pro indexaci robotem.
    - **Rychlost a mobilita:** Stránka se musí načítat rychle a vypadat dobře na mobilu.
    - **Backlinks (Zpětné odkazy):** Odkazy z jiných kvalitních webů, které slouží jako „doporučení“ pro vyhledávač.

## **4. Kvalita informací a kritické myšlení**

Není informace jako informace. Musíme rozlišovat jejich původ a kvalitu.

### **Druhy zdrojů**

- **Primární:** Nezkreslené, originální (vědecké studie, zákony, rukopisy, rozhovory).
- **Sekundární:** Zprostředkované (zprávy, učebnice, slovníky, recenze, biografie); citují primární zdroje.
- **Pravidlo:** Čím blíže jsme k primárnímu zdroji, tím lépe.

### **Kvalita informačního zdroje**

- Recenzované vědecké články (nejvyšší úroveň důvěryhodnosti)
- Odborné články a knihy
- Úřední zprávy, data a dokumenty
- Seriózní noviny, časopisy, veřejnoprávní média
- Bulvární noviny, časopisy a média
- Sociální sítě, blogy, chatovací aplikace, sdílené informace
- Dezinformační média (nejnižší úroveň důvěryhodnosti)

### **Hodnocení kvality**

**Kvalitní** informace musí být: **Správná (přesná), relevantní, objektivní, aktuální a kompletní.**

### **Zkreslení a dezinformace**

- **Zkreslení dat:** Vzniká chybou při pořizování (např. výběrové zkreslení – vzorek nereprezentuje celou skupinu).
- **Kognitivní zkreslení:** Psychologické chyby v úsudku (konfirmační zkreslení, efekt kotvy, zkreslení přeživších).
- **Příklady:**
    - **Konfirmační (potvrzovací) zkreslení**
        - Tendence vyhledávat, interpretovat a upřednostňovat pouze ty informace, které potvrzují naše stávající přesvědčení, zatímco ty opačné ignorujeme.
        - **Příklad:** Pokud je někdo přesvědčený, že káva je nezdravá, bude na internetu klikat pouze na články s titulky jako „Rizika pití kávy“. Studie, které prokazují pozitivní účinky kávy, bude podvědomě považovat za nespolehlivé nebo zaplacené.
    - **2. Efekt kotvy (Anchoring)**
        - Naše rozhodování je nepřiměřeně ovlivněno první informací, kterou obdržíme (tzv. „kotva“), i když s problémem přímo nesouvisí.
        - **Příklad:** V obchodě vidíš tričko za **1 500 Kč**, které je ale přeškrtnuté a stojí **800 Kč**. Částka 1 500 Kč posloužila jako kotva. Tričko ti teď připadá jako výhodná koupě, přestože jeho reálná hodnota může být stále nižší než 800 Kč.
    - **3. Zkreslení přeživších (Survivorship bias)**
        - Soustředíme se na lidi nebo věci, které prošly nějakým výběrovým procesem („přežily“), a zcela přehlížíme ty, které neuspěly, protože nejsou vidět.
        - **Příklad:** Často slýcháme příběhy miliardářů (jako Bill Gates nebo Mark Zuckerberg), kteří nedokončili školu a uspěli. To vede k mylnému závěru, že vysoká škola není pro úspěch potřeba. Už ale nevidíme ty miliony lidí, kteří školu nedokončili a skončili v dluzích nebo na nekvalifikovaných pozicích.
    - **Zkreslení dostupnosti (Availability bias)**
        - Máme tendenci přikládat větší váhu informacím, které si snadno vybavíme (často ty nejnovější nebo nejděsivější).
        - **Příklad:** Lidé se víc bojí útoku žraloka než autonehody, protože o žralocích jsou v médiích šokující zprávy, i když je to statisticky méně pravděpodobné.
    - **Publikační zkreslení**
        - Do médií a studií se častěji dostávají „zajímavé“ a pozitivní výsledky než ty negativní (které se pak nepublikují).
- **Dezinformace:** Cílená, záměrně lživá informace s úmyslem oklamat příjemce.
- **Kritické myšlení**
    - **Definice**: Jde o proces hodnocení informací a tvrzení s cílem vytvořit si vlastní, informovaný úsudek.
    - **Aktivní přístup:** Nejde o pouhé přijímání dat, ale o aktivní zkoumání pravdivosti, relevantnosti a důvěryhodnosti zdroje.
    - **Souvislosti:** Informace musíme umět dávat do širších souvislostí, nikoliv je vnímat izolovaně.
- **Proč je důležité?**
    - **Obrana proti manipulaci:** Pomáhá nám odhalit podvod nebo pokus o citové ovlivnění.
    - **Rozhodování:** Vede ke správnému rozhodování na základě faktů, nikoliv domněnek.
    - **Rozlišení kvality:** Pomáhá odlišit kvalitní, podložené informace od dezinformací.

## **5. Autorské právo a citace**

### Právní rámec a vznik autorského práva (Vše se řídí Autorským zákonem č. 121/2000 Sb.)

- **Vznik práva:** Autorské právo vzniká automaticky ve chvíli, kdy je dílo vytvořeno (např. v momentě, kdy dopíšeš řádek kódu nebo vyfotíš fotku).
- **Účel:** Chrání autora proti zneužití jeho díla a brání jiným osobám v nelegálním výdělku na cizí práci.
- **Užití pro vlastní potřebu a vzdělávání:** Dílo lze legálně využít pro soukromé účely nebo ve škole pro výuku bez nutnosti žádat o svolení.
- **Výňatky a citace:** Je legální použít výňatek z cizího díla (např. odstavec z knihy do tvého referátu) v odůvodněné míře, ale musíš uvést autora, název díla a pramen.

### Správná podoba citace (ISO 690)

V Česku se nejčastěji setkáš s mezinárodní normou **ISO 690**. Existují i jiné styly jako **APA** nebo **MLA**, ale ISO 690 je u nás standardem.

- **Prvky citace knihy:**
- Při citování klasické knihy musíš dodržet toto pořadí:
    - Autor
    - Název knihy
    - Vydání
    - Místo vydání
    - Nakladatel
    - Rok vydání
    - ISBN (mezinárodní číslo knihy).
    - Příklad: DŘÍMALKA, Filip. Budoucnost NEpráce. EF1 marketing & management s.r.o, 2023. ISBN 9788011037727.
- Důležité upozornění: Citování se liší podle typu zdroje – jinak citujeme video na YouTube, jinak článek na webu, obrázek nebo zákon.

### Licence Creative Commons (CC)

Licence CC umožňují autorům nabídnout svá díla veřejnosti k dalšímu šíření za jasně daných podmínek, aniž by je musel kdokoli osobně kontaktovat.

Licence se skládá ze čtyř základních prvků, které se mohou kombinovat:

- **BY (Attribution) – Uveďte autora:** Tento prvek ti umožňuje dílo šířit, vystavovat i měnit, ale máš povinnost vždy uvést původního autora.
- **NC (Noncommercial) – Neužívejte komerčně:** Dílo smíš používat a šířit, ale nesmíš na něm vydělávat; je určeno pouze pro nevýdělečné účely.
- **ND (No Derivative Works) – Nezpracovávejte:** Dílo smíš šířit pouze v jeho původní podobě. Nesmíš ho upravovat, stříhat, modifikovat ani z něj vytvářet odvozená díla.
- **SA (Share Alike) – Zachovejte licenci:** Pokud dílo jakkoliv upravíš, musíš výsledek šířit dál pod stejnou nebo velmi podobnou (kompatibilní) licencí, jakou mělo původní dílo.

### Časté dotazy k autorskému právu

- **„Můžu si stáhnout film pro vlastní potřebu?“** – Podle českého práva je stahování zveřejněného audiovizuálního díla pro osobní potřebu legální (pokud ho dál nešíříš), ale nesmíš přitom obcházet technické ochrany (např. ochranu proti kopírování na DVD).
- **„Co je to ISBN?“** – Zkratka pro _International Standard Book Number_. Je to unikátní číselný kód, který jednoznačně identifikuje vydání konkrétní knihy po celém světě.
- **„Co se stane, když necituji zdroj?“** – Dopouštíš se **plagiátorství**, což je etický i právní přestupek, který může vést k vyloučení ze školy nebo k soudnímu sporu.

## **6. AI a jazykové modely (LLM)**

### Podstata a princip fungování AI

Jazykové modely jsou systémy založené na **umělé inteligenci**. Nejsou to vyhledávače v pravém slova smyslu, ale generativní systémy.

- **Trénink:** Jsou natrénované na obrovském množství textových dat z internetu (knihy, články, diskuse, kód).
- **Princip predikce:** Fungují na základě pravděpodobnostního odhadu následujících slov. Na základě kontextu AI odhaduje, jaké slovo by mělo následovat, aby věta dávala smysl, a postupně tak skládá celé texty.
- **Multimodalita:** Moderní modely nepracují jen s textem, ale přijímají i zvukové vstupy, obrázky nebo připojené soubory.

### Práce s AI: Prompting

Způsob, jakým s AI komunikujeme, se nazývá **prompting**.

- Prompt: Je to otázka, úkol nebo příkaz, který modelu zadáváme.
- Iterativní proces: Prompt obvykle postupně zpřesňujeme (tzv. ladění promptu), abychom dosáhli co nejlepšího výsledku.
- Vhodné vs. nevhodné úkoly: Je nutné rozlišovat, na co se AI hodí (např. shrnutí textu, kreativní psaní, pomoc s kódem) a na co ne (např. přesné matematické výpočty bez ověření nebo hledání nejaktuálnějších zpráv, pokud model nemá přístup k internetu).

### Historický kontext a nástroje AI

- **ELIZA (1966):** První historický chatbot, který simuloval psychoterapeuta pomocí jednoduchého nahrazování klíčových slov.
- **ChatGPT (2022):** Průlomový model od OpenAI, který odstartoval současnou vlnu popularity AI.
- **Současné špičkové modely:** Mezi nejznámější patří **ChatGPT** (OpenAI), **Gemini** (Google), **Claude** (Anthropic) nebo **Mistral AI**.

### Rizika a kritický přístup k AI

- **AI halucinace:** Jazykové modely mohou generovat informace, které znějí velmi přesvědčivě a gramaticky správně, ale jsou fakticky zcela vymyšlené.
- **Nutnost prověřování:** Veškeré odpovědi z jazykových modelů je nutné prověřovat pomocí jiných nezávislých zdrojů.', 28)
ON CONFLICT (item_id) DO UPDATE SET content = EXCLUDED.content, sections_count = EXCLUDED.sections_count;
