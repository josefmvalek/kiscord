const GLOBAL_DRIVE_LINK = "https://drive.google.com/drive/folders/19KnBcai5wHxwlryX_keLO9zPs8Qvj48l?usp=sharing";

var quizQuestions = [
  {
    question:
      "Jsem certifikovaný skaut, který bezpečně pozná všechny hvězdy na obloze.",
    correct: false,
    explanation:
      "MÝTUS! ❌ Poznám jen 'vrtulníky'. Sirius si to bude pamatovat navždy.",
  },
  {
    question:
      "Když se učíme matematiku, jsem to já, kdo vysvětluje integrály tobě.",
    correct: false,
    explanation:
      "MÝTUS! ❌ Jsem ztracený případ. Díky za tvou nekonečnou trpělivost.",
  },
  {
    question: "Nejlepší investice tvého života byla Casio kalkulačka.",
    correct: true,
    explanation: "FAKT! ✅ Proto máš teď i tu plyšovou verzi.",
  },
  {
    question:
      "Tvé zranění nohy vzniklo při extrémním sportu zvaném 'sezení u počítače'.",
    correct: true,
    explanation: "FAKT! ✅ A sprcha tomu dala korunu. Nebezpečný život geeka.",
  },
  {
    question:
      "Podolí je samostatná, hrdá metropole, která nemá s Kunovicemi nic společného.",
    correct: false,
    explanation: "MÝTUS! ❌ Je to jen předměstí, smiř se s tím. 😉",
  },
  {
    question:
      "Můj orientační smysl v Geoguessru je na úrovni profesionálního kartografa.",
    correct: false,
    explanation: "MÝTUS! ❌ Všechno je pro mě Brazílie nebo Rusko.",
  },
  {
    question:
      "Když řídíš, vypadáš podle mě jako bys jela 'opilá a bez světel'.",
    correct: true,
    explanation: "FAKT! ✅ Ale je to jen vtip! (Většinou). Vždycky dojedeme.",
  },
  {
    question: "Pes, kterého jsme potkali na výletě, byl vycvičený záchranář.",
    correct: false,
    explanation: "MÝTUS! ❌ Byl to vycvičený zloděj špekáčků.",
  },
  {
    question: "Chobotnice je tvé spirituální zvíře.",
    correct: true,
    explanation:
      "FAKT! ✅ Nebo sova. Obojí sedí perfektně na tvůj multitasking a ponocování.",
  },
  {
    question: "Popcorn je nástroj ďábla určený k ničení zubů.",
    correct: true,
    explanation: "FAKT! ✅ Gumídci jsou superior snack.",
  },
  {
    question: "Nero hrál na lyru, když hořel Řím.",
    correct: false,
    explanation:
      "MÝTUS! ❌ Díky za lekci dějepisu, paní učitelko. Už si to pamatuju.",
  },
];

// --- DATA: ZAJÍMAVOSTI O SOVÁCH A CHOBOTNICÍCH ---
var factsLibrary = {
  octopus: [
    {
      icon: "🐙",
      text: "Chobotnice mají tři srdce: dvě žaberní pumpují krev přes žábry k okysličení a jedno hlavní ji rozvádí do zbytku těla.",
    },
    {
      icon: "🐙",
      text: "Krev chobotnice je modrá, protože obsahuje hemocyanin založený na mědi, který je v chladných vodách efektivnější než železo.",
    },
    {
      icon: "🐙",
      text: "Chobotnice mají jeden centrální mozek, ale dvě třetiny všech neuronů jsou rozmístěny v chapadlech, takže každé rameno má částečně vlastní „mysl“.",
    },
    {
      icon: "🐙",
      text: "Chobotnice nemají kosti, jedinou pevnou částí je zobák z keratinu, takže se protáhnou jakýmkoliv otvorem, kterým projde tento zobák.",
    },
    {
      icon: "🐙",
      text: "Každé z osmi ramen chobotnice má až 240 přísavek s chemoreceptory, díky kterým chobotnice „ochutnává“ vše, čeho se dotkne.",
    },
    {
      icon: "🐙",
      text: "Oči chobotnice jsou velmi podobné lidským, ale jsou barvoslepé; paradoxně však kůže chobotnice obsahuje světlocitlivé proteiny a dokáže „vidět“ světlo.",
    },
    {
      icon: "🐙",
      text: "Chobotnice dýchají žábrami, ale dokážou krátce přežít na souši díky absorpci kyslíku vlhkou kůží.",
    },
    {
      icon: "🐙",
      text: "Když chobotnice plave pomocí reaktivního pohonu, její hlavní srdce se zastaví, což ji vyčerpává, a proto se raději plazí po dně.",
    },
    {
      icon: "🐙",
      text: "Chobotnice mají vysoce vyvinutý smysl pro polohu vlastního těla (propriocepci), ačkoliv je tělo chobotnice měkké a flexibilní.",
    },
    {
      icon: "🐙",
      text: "Chobotnice jsou považovány za nejinteligentnější bezobratlé živočichy na Zemi.",
    },
    {
      icon: "🐙",
      text: "Chobotnice kokosová byla pozorována, jak nosí skořápky kokosových ořechů a používá je jako mobilní úkryt.",
    },
    {
      icon: "🐙",
      text: "Chobotnice dokážou řešit složité problémy, jako je otevření šroubovací sklenice zevnitř nebo průchod bludištěm.",
    },
    {
      icon: "🐙",
      text: "Chobotnice mají schopnost učení se pozorováním a disponují krátkodobou i dlouhodobou pamětí.",
    },
    {
      icon: "🐙",
      text: "U chobotnic bylo pozorováno chování připomínající hru, například opakované posílání předmětů proudem vody.",
    },
    {
      icon: "🐙",
      text: "V zajetí dokážou chobotnice rozeznat lidské tváře a k různým ošetřovatelům se chovají odlišně.",
    },
    {
      icon: "🐙",
      text: "Chobotnice jsou mistryněmi úniku, dokážou vylézt z akvária, projít potrubím nebo se přesunout po zemi do jiné nádrže pro potravu.",
    },
    {
      icon: "🐙",
      text: "Některé druhy chobotnic při lovu stříkají vodu na kraby na souši, aby je spláchly do moře.",
    },
    {
      icon: "🐙",
      text: "Chobotnice dokážou editovat svou vlastní RNA, což jim umožňuje přepisovat genetické instrukce a rychle se adaptovat například na změnu teploty.",
    },
    {
      icon: "🐙",
      text: "Chobotnice zvládnou změnu barvy celého těla za méně než 0,3 sekundy.",
    },
    {
      icon: "🐙",
      text: "K maskování využívají chobotnice tři vrstvy buněk: chromatofory (barva), iridofory (odlesky) a leukofory (bílý podklad).",
    },
    {
      icon: "🐙",
      text: "Pomocí svalů v kůži dokážou chobotnice změnit texturu svého těla z hladké na ostnatou, aby splynuly s okolím.",
    },
    {
      icon: "🐙",
      text: "Chobotnice maskovaná (Thaumoctopus mimicus) dokáže tvarem i pohybem napodobit jiné živočichy, jako jsou perutýni nebo mořští hadi.",
    },
    {
      icon: "🐙",
      text: "V ohrožení vypouštějí chobotnice inkoust, který vytvoří clonu a zároveň otupí čich predátora.",
    },
    {
      icon: "🐙",
      text: "Změny barev slouží chobotnicím i ke komunikaci – tmavá barva často značí agresi, světlá strach.",
    },
    {
      icon: "🐙",
      text: "V případě nouze mohou chobotnice odvrhnout chapadlo, které se dál hýbe a láká predátora; chapadlo chobotnici později doroste.",
    },
    {
      icon: "🐙",
      text: "Většina druhů chobotnic žije velmi krátce, obvykle jen 1 až 2 roky, obří druhy maximálně 5 let.",
    },
    {
      icon: "🐙",
      text: "Samci chobotnic mají speciální rameno zvané hectocotylus, kterým předávají sperma; u některých druhů ho samici „odevzdají“ a odplavou.",
    },
    {
      icon: "🐙",
      text: "Rozmnožování je pro chobotnice smrtelné – samci umírají brzy po páření, samice po vylíhnutí vajíček.",
    },
    {
      icon: "🐙",
      text: "Samice chobotnice po nakladení vajíček přestane jíst a po celou dobu inkubace je chrání a ovívá, nakonec umírá vyčerpáním.",
    },
    {
      icon: "🐙",
      text: "Mláďata chobotnic rostou extrémně rychle, některé druhy mohou zvýšit svou váhu o 5 % každý den.",
    },
    {
      icon: "🐙",
      text: "Největší chobotnice velká může mít rozpětí ramen až 9 metrů a vážit přes 270 kg.",
    },
    {
      icon: "🐙",
      text: "Nejmenší druh chobotnice Octopus wolfi měří jen asi 2,5 cm a váží méně než gram.",
    },
    {
      icon: "🐙",
      text: "Všechny chobotnice jsou jedovaté, ale pro člověka je nebezpečná jen jedna skupina.",
    },
    {
      icon: "🐙",
      text: "Malá chobotnice kroužkovaná nese dostatek jedu tetrodotoxinu k usmrcení 26 dospělých lidí a neexistuje na něj protijed.",
    },
    {
      icon: "🐙",
      text: "Chobotnice Dumbo žije v hloubkách až 4 000 metrů a má ploutve připomínající sloní uši.",
    },
    {
      icon: "🐙",
      text: "Samice chobotnic rodu Argonauta si vytvářejí vlastní vápencovou schránku pro ochranu vajíček.",
    },
    {
      icon: "🐙",
      text: "Chobotnice jsou na Zemi déle než dinosauři, nejstarší fosilie předka chobotnice je stará asi 296 milionů let.",
    },
    {
      icon: "🐙",
      text: "V roce 2010 se proslavila chobotnice Paul, která údajně úspěšně předpovídala výsledky fotbalového mistrovství světa.",
    },
    {
      icon: "🐙",
      text: "V mytologii a kultuře jsou chobotnice často zobrazovány jako monstra, například Kraken.",
    },
    {
      icon: "🐙",
      text: "Ve stresových situacích nebo při přemnožení se chobotnice mohou uchylovat ke kanibalismu.",
    },
    {
      icon: "🐙",
      text: "Genom chobotnice je velmi složitý a obsahuje unikátní genové rodiny, které se u jiných živočichů nevyskytují.",
    },
  ],
  owl: [
    {
      icon: "🦉",
      text: "Sovy nemají klasické oční bulvy, ale protáhlé oční trubice pevně ukotvené v lebce, takže nemohou hýbat očima.",
    },
    {
      icon: "🦉",
      text: "Kvůli nepohyblivým očím musejí sovy otáčet celou hlavou, což zvládnou až o 270 stupňů.",
    },
    {
      icon: "🦉",
      text: "Krk sovy obsahuje 14 krčních obratlů, což je dvakrát více, než mají lidé, a umožňuje to extrémní rotaci hlavy.",
    },
    {
      icon: "🦉",
      text: "Sovy mají speciální systém krevního zásobení, který zabraňuje přerušení toku krve do mozku při otáčení hlavy.",
    },
    {
      icon: "🦉",
      text: "Sluch sovy je tak dokonalý, že některé druhy dokážou lokalizovat kořist v naprosté tmě pouze podle zvuku.",
    },
    {
      icon: "🦉",
      text: "Některé sovy, jako kalous ušatý, mají asymetrické ušní otvory (jeden výš než druhý), což jim pomáhá přesně zaměřit zdroj zvuku.",
    },
    {
      icon: "🦉",
      text: "Obličejový závoj sovy, tvořený peřím, funguje jako parabola, která zachycuje zvuky a směruje je přímo do uší.",
    },
    {
      icon: "🦉",
      text: "Sovy jsou dalekozraké a na blízko vidí špatně, proto si při krmení pomáhají hmatovými štětinami kolem zobáku.",
    },
    {
      icon: "🦉",
      text: "Oči sovy jsou chráněny třemi víčky: jedním na mrkání, jedním na spaní a třetím (mžurkou) na čištění oka.",
    },
    {
      icon: "🦉",
      text: "Nohy sovy jsou zygodaktylní, což znamená, že dva prsty směřují dopředu a dva dozadu, přičemž jeden zadní prst se může otočit dopředu.",
    },
    {
      icon: "🦉",
      text: "Let sovy je téměř neslyšný díky speciálnímu hřebínku na okraji letek, který rozbíjí proudění vzduchu.",
    },
    {
      icon: "🦉",
      text: "Tichý let umožňuje sově překvapit kořist, která ji neslyší přilétat ani v naprostém tichu noci.",
    },
    {
      icon: "🦉",
      text: "Sovy jsou výhradně masožraví dravci a živí se pestrou stravou od hmyzu přes ryby až po malé savce.",
    },
    {
      icon: "🦉",
      text: "Protože sovy nemají zuby, polykají menší kořist vcelku.",
    },
    {
      icon: "🦉",
      text: "Na rozdíl od jiných ptáků sovy nemají vole, takže potrava putuje přímo do žaludku.",
    },
    {
      icon: "🦉",
      text: "Nestravitelné zbytky, jako jsou kosti a srst, sovy vyvrhují ve formě šišatých vývržků.",
    },
    {
      icon: "🦉",
      text: "Rozborem vývržků sovy mohou vědci přesně určit, čím se daná sova v poslední době živila.",
    },
    {
      icon: "🦉",
      text: "Některé sovy, například asijské ketupy, jsou specializované na lov ryb a nohy mají pokryté ostrými šupinami, aby jim kluzká kořist nevyklouzla.",
    },
    {
      icon: "🦉",
      text: "Sova pálená má drápy se zoubkovaným okrajem, což jí pomáhá lépe uchopit drobné hlodavce.",
    },
    {
      icon: "🦉",
      text: "Výr velký je jednou z nejsilnějších sov a troufne si ulovit i lišku nebo srnče.",
    },
    {
      icon: "🦉",
      text: "Stisk pařátů sovy je extrémně silný; například puštík obecný vyvine tlak až 13 kg na centimetr čtvereční.",
    },
    {
      icon: "🦉",
      text: "Ačkoliv jsou sovy známé jako noční tvorové, některé druhy, jako sovice sněžní, loví i ve dne.",
    },
    {
      icon: "🦉",
      text: "Ne všechny sovy houkají; například sýček se ozývá pronikavým pískáním a sova pálená spíše syčí a chrápe.",
    },
    {
      icon: "🦉",
      text: "Mláďata sov v ohrožení syčí, čímž se snaží napodobit zvuk hada a odstrašit predátora.",
    },
    {
      icon: "🦉",
      text: "Sovy komunikují také řečí těla, klapáním zobáku nebo tleskáním křídly.",
    },
    {
      icon: "🦉",
      text: "Většina sov žije samotářsky, ale sova pálená někdy tvoří volná společenstva na jednom nocovišti.",
    },
    {
      icon: "🦉",
      text: "Sovy jsou silně teritoriální ptáci a své území si hájí hlasitým voláním.",
    },
    {
      icon: "🦉",
      text: "Většina druhů sov tvoří monogamní páry, které spolu často zůstávají celý život.",
    },
    {
      icon: "🦉",
      text: "Sovy si nestaví vlastní hnízda, ale obsazují dutiny stromů, skalní římsy nebo stará hnízda dravců.",
    },
    {
      icon: "🦉",
      text: "Sýček králičí je netypická sova, která hnízdí v podzemních norách vyhrabaných jinými zvířaty.",
    },
    {
      icon: "🦉",
      text: "Vejce sovy jsou kulatá a bílá a zahřívá je výhradně samice, kterou samec krmí.",
    },
    {
      icon: "🦉",
      text: "Protože sova začíná sedět na vejcích hned po snesení prvního, mláďata se líhnou postupně a jsou různě velká.",
    },
    {
      icon: "🦉",
      text: "V dobách nedostatku potravy přežijí jen nejsilnější mláďata sovy a často dochází k sourozeneckému kanibalismu.",
    },
    {
      icon: "🦉",
      text: "Počet vajec, která sova snese, často závisí na množství potravy v daném roce; v dobách přemnožení hrabošů to může být až 14 vajec.",
    },
    {
      icon: "🦉",
      text: "Mláďata sovy se rodí slepá a pokrytá bílým prachovým peřím.",
    },
    {
      icon: "🦉",
      text: "Většina sov nemigruje, ale sovice sněžní se při nedostatku potravy v Arktidě vydává na dlouhé cesty až do střední Evropy.",
    },
    {
      icon: "🦉",
      text: "Největší sovou světa je výr Blakistonův, který může mít rozpětí křídel až dva metry.",
    },
    {
      icon: "🦉",
      text: "Jednou z nejmenších sov je kulíšek trpasličí, který váží méně než golfový míček.",
    },
    {
      icon: "🦉",
      text: "Sovice sněžní má peří bílé barvy, které jí umožňuje dokonale splynout s arktickým sněhem.",
    },
    {
      icon: "🦉",
      text: "Sova pálená má obličejový závoj ve tvaru srdce, což je pro tento druh typické.",
    },
    {
      icon: "🦉",
      text: "Puštík vousatý je velká sova, které se díky jejímu tichému letu přezdívá „přízračný létající medvěd“.",
    },
    {
      icon: "🦉",
      text: "Sovy se vyskytují na všech kontinentech světa s výjimkou Antarktidy.",
    },
    {
      icon: "🦉",
      text: "V řecké mytologii byla sova posvátným ptákem bohyně Athény a symbolem moudrosti.",
    },
    {
      icon: "🦉",
      text: "Ve starém Římě bylo houkání sovy považováno za předzvěst smrti nebo neštěstí.",
    },
    {
      icon: "🦉",
      text: "V mnoha kulturách jsou sovy spojovány s magií, čarodějnictvím a světem duchů.",
    },
    {
      icon: "🦉",
      text: "V sérii Harry Potter slouží sovy jako poštovní doručovatelé, přičemž nejslavnější je sova sněžná jménem Hedvika.",
    },
    {
      icon: "🦉",
      text: "Sova je oblíbeným motivem v heraldice a často se objevuje v městských znacích.",
    },
    {
      icon: "🦉",
      text: "Ačkoliv má sova pověst moudrého zvířete, její mozek je poměrně malý a v inteligenci ji předčí krkavcovití ptáci.",
    },
    {
      icon: "🦉",
      text: "Sovy mají velmi slabý čich, takže jim nevadí lovit například skunky.",
    },
    {
      icon: "🦉",
      text: "Sýček obecný, dříve běžná sova českého venkova, je dnes kriticky ohrožený kvůli změnám v zemědělství.",
    },
    {
      icon: "🦉",
      text: "Pro ochranu sov ornitologové často vyvěšují speciální budky, které nahrazují duté stromy.",
    },
    {
      icon: "🦉",
      text: "Sovy v zajetí se mohou dožít až 60 let, zatímco v divočině je jejich život výrazně kratší.",
    },
    {
      icon: "🦉",
      text: "Peří sovy často připomíná kůru stromů, což jí poskytuje dokonalé maskování během denního odpočinku.",
    },
    {
      icon: "🦉",
      text: "Skupina sov se v angličtině poeticky nazývá „parlament“.",
    },
    {
      icon: "🦉",
      text: "Ačkoliv to nedělají rády, sovy dokážou v případě nouze plavat pomocí křídel.",
    },
  ],
  raccoon: [
    {
      icon: "🦝",
      text: "Mývalové si jídlo 'neumývají' z hygieny, ale namáčejí ho, aby si zvlhčili tlapky a lépe hmatem prozkoumali, co jedí.",
    },
    {
      icon: "🦝",
      text: "Mýval severní (Procyon lotor) je nejznámějším a nejrozšířenějším druhem mývala.",
    },
    {
      icon: "🦝",
      text: "Přední tlapky, které má mýval, obsahují až pětkrát více mechanoreceptorů než tlapky většiny ostatních savců.",
    },
    {
      icon: "🦝",
      text: "Mýval má neuvěřitelně citlivé přední tlapky, jejichž hmatová schopnost se zesiluje ve vodě, což mu umožňuje identifikovat potravu i bez zraku.",
    },
    {
      icon: "🦝",
      text: "V každé přední tlapce má mýval pět prstů s extrémně pohyblivými klouby, které fungují téměř jako lidské ruce.",
    },
    {
      icon: "🦝",
      text: "Mýval nemá palec, ale jeho tlapky jsou tak šikovné, že dokáže otevřít zip, západku, šroubovat víčka nebo otočit klikou.",
    },
    {
      icon: "🦝",
      text: "Na svých citlivých tlapkách má mýval papilární linie (obdoba otisků prstů), které jsou u každého jedince jedinečné.",
    },
    {
      icon: "🦝",
      text: "Mýval má na předních tlapkách více nervových zakončení než většina ostatních savců, což z nich dělá hlavní smyslový orgán.",
    },
    {
      icon: "🦝",
      text: "Mýval dokáže otočit zadní tlapky o 180 stupňů, což mu umožňuje šplhat ze stromů hlavou dolů.",
    },
    {
      icon: "🦝",
      text: "Mýval má extrémně pružná zápěstí, která mu umožňují otočit přední tlapky téměř o 180 stupňů, což je neocenitelné při prohledávání škvír a děr.",
    },
    {
      icon: "🦝",
      text: "Charakteristická černá maska kolem očí pomáhá mývalovi snižovat odlesky světla a lépe vidět v noci.",
    },
    {
      icon: "🦝",
      text: "Vědci se domnívají, že maska, kterou má mýval, pomáhá také v rozpoznávání jednotlivých jedinců mezi sebou.",
    },
    {
      icon: "🦝",
      text: "Ocas s pruhy, který má každý mýval, slouží částečně jako tuková zásoba na zimu a má obvykle 5 až 7 černých kroužků.",
    },
    {
      icon: "🦝",
      text: "Ocas, který má mýval, není chápavý (prehensilní), ale zvíře ho používá pro udržování rovnováhy při lezení a stoji na zadních.",
    },
    {
      icon: "🦝",
      text: "Dospělý mýval může vážit od 2 do 14 kilogramů, přičemž největší zaznamenaný divoký jedinec vážil přes 28 kg.",
    },
    {
      icon: "🦝",
      text: "Mýval má hustou, voděodolnou srst s přibližně 90 % podsady, která ho dokonale chrání před chladem a umožňuje mu přežít i drsné zimy.",
    },
    {
      icon: "🦝",
      text: "Srst, kterou má mýval, se skládá z husté podsady a delších pesíků; barva se může lišit od světle šedé po téměř černou.",
    },
    {
      icon: "🦝",
      text: "Mýval má velmi husté a dlouhé vibrisy (hmatové vousy) nejen na čenichu, ale také nad drápy a na loktech.",
    },
    {
      icon: "🦝",
      text: "Mýval má velmi ostré a nesvrnitelné drápy, díky kterým je výborným lezcem.",
    },
    {
      icon: "🦝",
      text: "Lebka, kterou má mýval, je uzpůsobena tak, že má velmi silný skus na svou velikost.",
    },
    {
      icon: "🦝",
      text: "Mýval má 40 zubů, včetně ostrých špičáků pro trhání masa a plochých stoliček pro drcení rostlin.",
    },
    {
      icon: "🦝",
      text: "Mýval je schopen regulovat svou tělesnou teplotu pocením přes tlapky a dýcháním s otevřenou tlamou.",
    },
    {
      icon: "🦝",
      text: "Průměrná tělesná teplota, kterou má mýval, je kolem 38,1 °C.",
    },
    {
      icon: "🦝",
      text: "Samci mývala jsou obvykle o 15 až 20 % těžší než samice.",
    },
    {
      icon: "🦝",
      text: "Mýval má na zadních nohách pět prstů, stejně jako člověk.",
    },
    {
      icon: "🦝",
      text: "Mýval má na zadních nohách delší chodidla než na předních, což mu pomáhá při vzpřímeném postoji a chůzi.",
    },
    {
      icon: "🦝",
      text: "Mýval má na čenichu holou, černou kůži, která je velmi citlivá na teplotu a hmatové podněty.",
    },
    {
      icon: "🦝",
      text: "Díky pružné páteři se mýval dokáže protáhnout otvorem o průměru pouhých 10-12 centimetrů.",
    },
    {
      icon: "🦝",
      text: "Mýval má oproti podobně velkým savcům relativně malé srdce a plíce.",
    },
    {
      icon: "🦝",
      text: "Mýval má v poměru k tělu velmi velká játra, což mu pomáhá zpracovávat různé toxiny z potravy.",
    },
    {
      icon: "🦝",
      text: "Mýval je považován za jedno z nejinteligentnějších zvířat, srovnatelné s opicemi rhesus.",
    },
    {
      icon: "🦝",
      text: "Podle některých studií má mýval inteligenci srovnatelnou s primáty, pokud jde o řešení problémů a manipulaci s předměty.",
    },
    {
      icon: "🦝",
      text: "V testech paměti si mýval dokázal pamatovat řešení úkolů po dobu tří let.",
    },
    {
      icon: "🦝",
      text: "Mýval má binokulární vidění, které mu poskytuje dobré vnímání hloubky a vzdálenosti.",
    },
    {
      icon: "🦝",
      text: "Mýval má víčko zvané membrana nictitans (mžurka), které funguje jako „brýle na plavání“ a chrání jeho oči pod vodou.",
    },
    {
      icon: "🦝",
      text: "Mýval má vynikající noční vidění díky tapetum lucidum, vrstvě buněk za sítnicí, která odráží světlo (proto mu svítí oči).",
    },
    {
      icon: "🦝",
      text: "Hmatové fousky nad tlapkami umožňují mývalovi identifikovat předměty, aniž by se jich přímo dotkl kůží.",
    },
    {
      icon: "🦝",
      text: "Mýval vydává více než 50 různých zvuků, včetně syčení, vrčení, hvízdání, vrkání a cvrlikání.",
    },
    {
      icon: "🦝",
      text: "Mýval má vynikající sluch a dokáže vnímat tóny až do frekvence 85 kHz.",
    },
    {
      icon: "🦝",
      text: "Mýval dokáže slyšet i velmi tiché zvuky, jako je pohyb hmyzu v trouchnivějícím dřevě nebo žížal pod zemí.",
    },
    {
      icon: "🦝",
      text: "Výrazné, kulaté ušní boltce, které má mýval, mu pomáhají lépe zachycovat zvuky, ale jsou náchylné k omrzlinám.",
    },
    {
      icon: "🦝",
      text: "Mýval má průměrný mozek s vysoce vyvinutým čichovým bulbem a mozečkem (centrum rovnováhy a motoriky).",
    },
    {
      icon: "🦝",
      text: "Mýval má vynikající čich, který využívá nejen k hledání potravy, ale také k navigaci a komunikaci.",
    },
    {
      icon: "🦝",
      text: "Vědci zjistili, že mýval dokáže rozlišovat mezi různými geometrickými tvary.",
    },
    {
      icon: "🦝",
      text: "Mýval má vynikající prostorovou paměť a dokáže si zapamatovat umístění mnoha zdrojů potravy na velkém území.",
    },
    {
      icon: "🦝",
      text: "Mýval má slabý čich na pižmo, které vylučují chřestýši, a proto je občasnou obětí těchto hadů.",
    },
    {
      icon: "🦝",
      text: "Mýval je primárně noční zvíře, ale může být aktivní i ve dne, pokud hledá potravu nebo žije v bezpečném prostředí.",
    },
    {
      icon: "🦝",
      text: "Mýtus, že mýval si myje jídlo z čistotnosti, je mylný; ve skutečnosti zkoumá předmět hmatem pod vodou.",
    },
    {
      icon: "🦝",
      text: "Mýval má tendenci si „oplachovat“ potravu i v suchém prostředí, což naznačuje, že jde o vrozený vzorec chování (air washing).",
    },
    {
      icon: "🦝",
      text: "Když se cítí ohrožen, mýval se snaží vypadat větší tím, že naježí srst a prohne hřbet.",
    },
    {
      icon: "🦝",
      text: "Mýval je velmi zvědavý a zároveň opatrný, což je kombinace, která mu umožňuje úspěšně kolonizovat nová prostředí.",
    },
    {
      icon: "🦝",
      text: "Mýval neupadá do pravého zimního spánku, ale do stavu strnulosti (torporu).",
    },
    {
      icon: "🦝",
      text: "Během zimy může mýval ztratit až 50 % své tělesné hmotnosti, protože žije z tukových zásob.",
    },
    {
      icon: "🦝",
      text: "Mýval má občasnou a nepravidelnou činnost během zimy, může vyjít z doupěte například během oblevy.",
    },
    {
      icon: "🦝",
      text: "Mýval je obvykle samotář, ale v oblastech s dostatkem jídla mohou samice sdílet společné území.",
    },
    {
      icon: "🦝",
      text: 'Sociální struktura mývala je složitější, než se dříve myslelo; samci někdy vytvářejí "spojenecká uskupení".',
    },
    {
      icon: "🦝",
      text: 'Mýval si často vytváří "latríny", specifická místa, kam chodí opakovaně vykonávat potřebu.',
    },
    {
      icon: "🦝",
      text: "Mýval dokáže otevřít složité zámky na popelnicích, chladničky s venkovním ventilem a některé typy oken.",
    },
    {
      icon: "🦝",
      text: "Mýval je skvělý plavec a dokáže ve vodě vydržet i několik hodin, i když bez důvodu do vody nerad vstupuje.",
    },
    {
      icon: "🦝",
      text: "Přestože vypadá zavalitě, mýval dokáže běžet rychlostí až 24 km/h, i když jeho běh vypadá jako kolébání.",
    },
    {
      icon: "🦝",
      text: "Mýval dokáže bez zranění přežít pád z výšky až 12 metrů díky schopnosti se uvolnit a přizpůsobit dopad.",
    },
    {
      icon: "🦝",
      text: "Mýval má velmi vyvinutý smysl pro hru, mláďata i dospělí se často pouští do hravého zápasení.",
    },
    {
      icon: "🦝",
      text: "Mýval má zvláštní fascinaci pro lesklé předměty, které si někdy odnáší – tento jev se nazývá „mývalí kleptomanie“.",
    },
    {
      icon: "🦝",
      text: "Mýval má ve zvyku si značkovat teritorium močí, trusem a sekrety z pachových žláz.",
    },
    {
      icon: "🦝",
      text: "Mýval má ve zvyku si sedat na zadní část těla a předníma nohama si podávat potravu k tlamě.",
    },
    {
      icon: "🦝",
      text: "Mýval se ráno vrací na stejné místo ke spánku, pokud se necítí být vyrušován.",
    },
    {
      icon: "🦝",
      text: "Mýval je všežravec a sní téměř cokoliv: od ovoce a hmyzu po ryby a odpadky.",
    },
    {
      icon: "🦝",
      text: "Mýval má rozmanitý jídelníček, který se mění podle ročního období (jaro = maso, léto/podzim = rostliny).",
    },
    {
      icon: "🦝",
      text: "Mýval má velmi rád kukuřici a dokáže zničit celá pole tím, že strhává klasy.",
    },
    {
      icon: "🦝",
      text: "Pokud mýval najde ptačí hnízdo, nepohrdne vajíčky ani mláďaty.",
    },
    {
      icon: "🦝",
      text: "Mýval dokáže ulovit i menší ondatru, veverku, žáby, raky a škeble.",
    },
    {
      icon: "🦝",
      text: "Mýval má v oblibě žáby a dokáže je pomocí svých tlapek zbavit jedovaté kůže dříve, než je sní.",
    },
    {
      icon: "🦝",
      text: "V městském prostředí se mýval často stává obézním kvůli stravě bohaté na cukry a tuky z odpadků.",
    },
    {
      icon: "🦝",
      text: "Mýval má odolný trávicí systém, který si poradí i s mírně zkaženým masem nebo některými toxickými houbami.",
    },
    {
      icon: "🦝",
      text: "Mýval má schopnost spolknout velké množství potravy naráz a poté ji v klidu trávit v bezpečí.",
    },
    {
      icon: "🦝",
      text: "Mýval má v oblibě hrozny a může způsobit značné škody na vinicích.",
    },
    {
      icon: "🦝",
      text: "Mýval má silné zuby, kterými dokáže rozdrtit i velmi tvrdé skořápky ořechů nebo exoskelety bezobratlých.",
    },
    {
      icon: "🦝",
      text: "Mýval má ve zvyku si potravu někdy schovávat na později, i když si nedělá velké dlouhodobé zásoby.",
    },
    {
      icon: "🦝",
      text: "Původním domovem mývala jsou smíšené lesy Severní a Střední Ameriky.",
    },
    {
      icon: "🦝",
      text: "Mýval má schopnost přežít ve velmi různorodých biotopech, od pralesů a hor až po velkoměsta.",
    },
    {
      icon: "🦝",
      text: "Ve městech se mýval naučil využívat kanalizaci jako podzemní dálnici pro bezpečný přesun.",
    },
    {
      icon: "🦝",
      text: "Hustota populace mývala ve městech může být až 20x vyšší než v divoké přírodě.",
    },
    {
      icon: "🦝",
      text: "Mýval často obsazuje opuštěné nory, dutiny stromů, půdy domů nebo komíny.",
    },
    {
      icon: "🦝",
      text: "Mýval má v oblibě spát na vyvýšených místech, jako jsou opuštěná hnízda vran.",
    },
    {
      icon: "🦝",
      text: "Ačkoliv je mýval pozemní zvíře, v případě povodní se dokáže přesunout do koruny stromů na několik dní.",
    },
    {
      icon: "🦝",
      text: "Mýval má denní teritorium o velikosti od 1 do 20 km² v závislosti na pohlaví a zdrojích potravy.",
    },
    {
      icon: "🦝",
      text: "Mýval byl do Evropy (zejména Německa) zavlečen ve 20. století kvůli kožešinám a pro myslivecké účely.",
    },
    {
      icon: "🦝",
      text: "Dnes je mýval v Německu invazním druhem a jeho populace přesahuje milion jedinců.",
    },
    {
      icon: "🦝",
      text: "V Japonsku se mýval stal invazním druhem poté, co byl dovážen jako domácí mazlíček.",
    },
    {
      icon: "🦝",
      text: "Mýval se vyskytuje i na Kavkaze a v částech Ruska, kam byl rovněž uměle vysazen.",
    },
    {
      icon: "🦝",
      text: "Mýval má v České republice status nepůvodního druhu a vyskytuje se hlavně na západě území.",
    },
    {
      icon: "🦝",
      text: "Na ostrově Barbados žije vzácný poddruh mývala, který je menší než jeho pevninský příbuzný.",
    },
    {
      icon: "🦝",
      text: "Mýval krabožravý je příbuzný mývala severního a žije v Jižní Americe.",
    },
    {
      icon: "🦝",
      text: "Mýval dokáže přežít i velmi tuhé zimy v severních oblastech Kanady.",
    },
    {
      icon: "🦝",
      text: "Samice mývala je březí přibližně 63 až 65 dní.",
    },
    { icon: "🦝", text: "Mýval má obvykle ve vrhu 2 až 5 mláďat." },
    {
      icon: "🦝",
      text: "Mláďata mývala se rodí slepá, hluchá a váží jen kolem 60-75 gramů.",
    },
    {
      icon: "🦝",
      text: "Oči otevírají malí mývalové až po třech týdnech života.",
    },
    {
      icon: "🦝",
      text: "Typická maska na obličeji je u mývala viditelná již asi 10 dní po narození.",
    },
    {
      icon: "🦝",
      text: "Mládě mývala začíná jíst pevnou stravu kolem 7. týdne života.",
    },
    {
      icon: "🦝",
      text: "Pokud je mládě v nebezpečí, matka mývala ho přenáší v tlamě jako kočka koťata.",
    },
    {
      icon: "🦝",
      text: "Samice mývala je velmi agresivní a obětavá, pokud brání svá mláďata.",
    },
    {
      icon: "🦝",
      text: "Mladý mýval zůstává s matkou první zimu a osamostatňuje se až následující jaro.",
    },
    { icon: "🦝", text: "Samec mývala se nepodílí na výchově mláďat." },
    {
      icon: "🦝",
      text: "Mýval má samce, který se nazývá „kocour“, a samici „kočka“ (v anglické terminologii boar/sow).",
    },
    {
      icon: "🦝",
      text: "Úmrtnost mladých mývalů v prvním roce života může dosahovat až 50 %.",
    },
    {
      icon: "🦝",
      text: "Jako mládě má mýval modré oči, které se později změní na tmavě hnědé.",
    },
    {
      icon: "🦝",
      text: "Mýval má krátkou dobu páření, která obvykle připadá na leden až březen.",
    },
    {
      icon: "🦝",
      text: "Latinský název Procyon lotor, který nese mýval, znamená v překladu „před psem“ (Procyon) a „pradlá“ (lotor).",
    },
    {
      icon: "🦝",
      text: 'Slovo "mýval" v angličtině (raccoon) pochází z indiánského slova aroughcun, což znamená "ten, kdo škrábe rukama".',
    },
    {
      icon: "🦝",
      text: 'Aztékové nazývali mývala mapachitli, což znamená "ten, kdo bere vše do svých rukou".',
    },
    {
      icon: "🦝",
      text: "Mýval má v němčině jméno „Waschbär“ (medvěd prací).",
    },
    {
      icon: "🦝",
      text: "Mýval má ve francouzštině jméno „raton laveur“ (malý prací krysa).",
    },
    { icon: "🦝", text: "Mýval má v japonštině jméno „araiguma“." },
    {
      icon: "🦝",
      text: "Mýval má v angličtině hovorovou přezdívku „trash panda“ (odpadková panda).",
    },
    {
      icon: "🦝",
      text: "Prezident USA Calvin Coolidge měl ochočeného mývala jménem Rebecca, který chodil po Bílém domě.",
    },
    {
      icon: "🦝",
      text: "V 18. a 19. století byla kožešina, kterou má mýval, používána jako platidlo v některých oblastech USA.",
    },
    {
      icon: "🦝",
      text: 'Slavná čepice zvaná "coonskin cap" je vyrobena z kožešiny a ocasu mývala.',
    },
    {
      icon: "🦝",
      text: "Indiánské kmeny často zobrazují mývala v mýtech jako šibala nebo podvodníka.",
    },
    {
      icon: "🦝",
      text: "V kresleném filmu Strážci Galaxie vystupuje geneticky upravený mýval jménem Rocket.",
    },
    {
      icon: "🦝",
      text: "V Torontu se mýval stal neoficiálním maskotem města kvůli jejich obrovskému počtu.",
    },
    {
      icon: "🦝",
      text: 'Skupina mývalů se v angličtině nazývá "gaze" (pohled).',
    },
    {
      icon: "🦝",
      text: "Mýval má v Japonsku kultovní status díky anime seriálu „Araiguma Rascal“ ze 70. let.",
    },
    {
      icon: "🦝",
      text: "Mýval má podle fosilních nálezů předky, kteří žili před 25 miliony let v Evropě a později se přesunuli do Ameriky.",
    },
    {
      icon: "🦝",
      text: "Mýval je jedním z hlavních přenašečů vztekliny v Severní Americe.",
    },
    {
      icon: "🦝",
      text: "Mýval může hostit parazitickou hlístici Baylisascaris procyonis, která je nebezpečná pro člověka.",
    },
    {
      icon: "🦝",
      text: "Zdravý mýval si pečlivě čistí srst, aby se zbavil parazitů.",
    },
    {
      icon: "🦝",
      text: "Mýval může přenášet psinku, která je nebezpečná pro domácí psy.",
    },
    {
      icon: "🦝",
      text: "Ve městech trpí mýval často zubními kazy kvůli konzumaci sladkých odpadků.",
    },
    {
      icon: "🦝",
      text: "Mýval má přirozené nepřátele, jako jsou kojoti, velké sovy, aligátoři a rysi.",
    },
    {
      icon: "🦝",
      text: "Největší hrozbou pro mývala jsou ve městech automobily.",
    },
    {
      icon: "🦝",
      text: "Na Guadaloupe existoval druh mývala, který byl vyhuben.",
    },
    {
      icon: "🦝",
      text: "Albínský mýval je v přírodě extrémně vzácný (šance 1 ku 750 000).",
    },
    {
      icon: "🦝",
      text: "Častější než albín je mýval s erytrismem, který má zrzavou srst.",
    },
    {
      icon: "🦝",
      text: "Mýval se v zajetí dokáže naučit používat toaletu.",
    },
    {
      icon: "🦝",
      text: "I když je mýval roztomilý, jako domácí mazlíček je velmi náročný a často destruktivní.",
    },
    {
      icon: "🦝",
      text: "Mýval byl kdysi klasifikován jako příbuzný medvědů, jindy jako příbuzný psů.",
    },
    {
      icon: "🦝",
      text: "Dnes víme, že mýval patří do čeledi medvídkovitých (Procyonidae).",
    },
    {
      icon: "🦝",
      text: "Nejpříbuznějším zvířetem, které má mýval v přírodě, je nosál, kynkažu nebo olingo.",
    },
    {
      icon: "🦝",
      text: "V některých kulturách se věří, že když vám mýval zkříží cestu, přinese to změnu nebo odhalení tajemství.",
    },
    {
      icon: "🦝",
      text: "Mýval je důkazem neuvěřitelné schopnosti přírody adaptovat se na změny způsobené člověkem.",
    },
    {
      icon: "🦝",
      text: "Mýval má často blechy a klíšťata, ale díky častému čištění srsti je udržuje v nízkém počtu.",
    },
    {
      icon: "🦝",
      text: "Mýval má ve zvyku si budovat hnízdo z listí a mechu, ale nepohrdne ani starým gaučem na půdě.",
    },
    {
      icon: "🦝",
      text: "Mývala nemají rádi včelaři, protože dokáže zničit úly ve snaze dostat se k medu a larevám.",
    },
    {
      icon: "🦝",
      text: "Mýval má přirozenou imunitu vůči jedu některých hadů, ale ne všech.",
    },
    {
      icon: "🦝",
      text: "Mýval má ve svém genomu pozůstatky endogenních retrovirů, které vypovídají o jeho evoluci.",
    },
    {
      icon: "🦝",
      text: "Mýval ve volné přírodě žije průměrně 2-3 roky, v zajetí až 20 let.",
    },
    {
      icon: "🦝",
      text: "Mýval má ve svém přirozeném prostředí důležitou roli roznašeče semen.",
    },
    {
      icon: "🦝",
      text: "Mýval má také roli „čističe“, protože požírá mršiny.",
    },
    {
      icon: "🦝",
      text: "Mýval má tendenci si vytvářet „základny“ na území, odkud vyráží na lov.",
    },
    {
      icon: "🦝",
      text: "Mýval má občas konflikty s kočkami, ale většinou se jim vyhýbá (nebo jim jen krade jídlo).",
    },
    {
      icon: "🦝",
      text: "Mýval má někdy ve svém doupěti „spolubydlící“ jako jsou vačice, které toleruje.",
    },
    {
      icon: "🦝",
      text: "Mýval má velmi šikovné přední končetiny, které vědci studují pro vývoj robotických rukou.",
    },
    {
      icon: "🦝",
      text: "Existují kavárny (např. v Jižní Koreji), kde si zákazníci mohou hrát s ochočeným mývalem.",
    },
    { icon: "🦝", text: "Mýval dokáže rozvázat tkaničky u bot." },
    { icon: "🦝", text: "Mýval se dokáže naučit reagovat na své jméno." },
    {
      icon: "🦝",
      text: "Mléko, kterým samice mývala krmí mladé, je extrémně tučné a výživné.",
    },
    {
      icon: "🦝",
      text: "Mýval se na podzim stává hyperfagickým – to znamená, že má neustálý, nezvladatelný hlad, aby se vykrmil na zimu.",
    },
    {
      icon: "🦝",
      text: "Mýval dokáže sjet po kmeni stromu dolů jako hasič po tyči, pokud spěchá.",
    },
    {
      icon: "🦝",
      text: "Mýval má 5 prstů na každé noze, ale stopy zadních nohou vypadají jinak než předních (zadní připomínají malé dětské chodidlo).",
    },
    {
      icon: "🦝",
      text: "Mýval má nezaměnitelný charakter – je to inteligentní a neposedný tvor, který si podmanil divočinu i město.",
    },
  ],
};

const animalFacts = [...factsLibrary.octopus, ...factsLibrary.owl];

const funFacts = [
  "Chobotnice mají tři srdce a modrou krev.",
  "Sovy mohou otočit hlavu až o 270 stupňů.",
  "První verze Tetrisu vznikla v roce 1984 v Moskvě.",
  "Vesmír voní jako spálený steak, střelný prach a maliny.",
  "Sirius je nejjasnější hvězda noční oblohy (a není to vrtulník).",
  "Císař Nero prý při požáru Říma vůbec nebyl ve městě.",
  "Lidé sdílí 50 % DNA s banány (někdy to tak i vypadá).",
  "VUT FIT má ve znaku sovu (nebo něco, co ji připomíná).",
];

/*
// --- DEPRECATED: Timeline results are now managed via Supabase ---
var timelineEvents = [
  {
    title: "Kde to všechno začalo – Clash Royale",
    icon: "fa-shield-alt",
    color: "#5865F2", // Modrá
    desc: "Zeptal jsem se tě, jestli nedáme 1v1 (samozřejmě jsem vyhrál). <br>(P.S. Ten deck si fakt už změň, ať máš aspoň teoretickou šanci.)",
    images: [], // Příklad: ["fotky/clash1.jpg", "fotky/clash2.png"]
  },
  {
    title: "Nekonečný Scroll & Teorie",
    icon: "fa-mobile-alt",
    color: "#3ba55c", // Zelená
    desc: "Šest miliónů poslaných Reels a hodiny konverzací o životě. Jsi jediný člověk s dostatečným procesorovým výkonem na to, aby pobral moje teorie.",
    images: ["img/timeline/dzus.jpg"],
  },
  {
    title: "Discord Maratony",
    icon: "fa-graduation-cap",
    color: "#faa61a", // Žlutá
    desc: "271k+ hodin volání. Od tvé nekonečné trpělivosti a obětavosti při doučování mého autistického ADHD mozku až po naše bitvy ve hrách.",
    images: ["img/timeline/matika_dis.png"],
  },
  {
    title: "Ohýnek u Vlčnovských búd",
    icon: "fa-fire",
    color: "#eb459e", // Růžová
    desc: "Já sehnal dřevo, ty jsi řídila. Pes nám sežral večeři, potkali jsme náhodného Holanďana a já nás hrdinně bránil sekerou proti dřevěné soše.",
    images: [],
    locationId: 111 // Vlčnovské búdy
  },
  {
    title: "Hody Mařatice",
    icon: "fa-wine-glass",
    color: "#ed4245", // Červená
    desc: "Večer, kdy jsi mi zachránila prdel. Dotáhla jsi mě do auta a vyslechla si moje opilecké ujišťování.",
    images: ["img/timeline/maratice_tomac.jpg", "img/timeline/auto_rotor.jpg"],
    locationId: 324 // Bowling Mařatice (blízko)
  },
  {
    title: "Polešovice & Požár",
    icon: "fa-star",
    color: "#5865F2",
    desc: "Navigace, hasiči, výhled na požár. Tady jsi mě poprvé fact-checknula s Nerem a od té doby věřím mýtům.",
    images: [],
    locationId: 203 // Floriánka (Polešovice)
  },
  {
    title: "Basketbal, Modrá a Velehrad",
    icon: "fa-basketball-ball",
    color: "#faa61a",
    desc: "Málem nás sejmul autobus, zlomená noha na basketu, mlha na rozhledně a yappování v altánku u rybníka.",
    images: ["img/rozhledna_modra.jpg", "img/rozhledna_modra_2.jpg"],
    locationId: 206 // Rozhledna Modrá
  },
  {
    title: "Tento dárek",
    date: "2025-12-24",
    icon: "fa-gift",
    color: "gradient", // Speciální flag
    desc: "Všechny naše vzpomínky na jednom místě. Diddyblud kalkulator a 5 metrů HDMI kabelu.",
    images: [],
  },
  {
    title: "První rande",
    date: "2025-12-26",
    icon: "fa-heart",
    color: "#ed4245", // Červená
    desc: "Stezka lovců mamutů v Boršicích, větrný mlýn v Jalubí, procházka kolem rybníka, chill na chatě s ohýnkem.",
    images: [],
    locationId: 308 // Stezka Lovců Mamutů
  },
  {
    title: "Staré Hutě a Buchlovský kámen",
    date: "2025-12-30",
    icon: "fa-tree",
    color: "darkgreen",
    desc: "Navigování se ve Starých Hutích, trasa přes les, začalo sněžit, potom nám svítilo slunko pro parádní výhled u Buchlovského kamene. Nakonec ještě nákup pro Silvestrovskou chatu (která nebyla), úklid a spravování střechy na chatě.",
    images: [
      "img/timeline/bk_1.jpg",
      "img/timeline/bk_2.jpg",
      "img/timeline/bk_3.jpg",
      "img/timeline/bk_4.jpg",
      "img/timeline/bk_5.jpg",
      "img/timeline/bk_6.jpg",
    ],
    locationId: 252 // Buchlovský kámen
  },
  {
    title: "Procházka Kunovice, Sady, Rybník",
    date: "2026-01-01",
    icon: "fa-snowflake",
    color: "LightSkyBlue",
    desc: "Procházka kolem Olšavy, kolotoč, Kostel v Sadech (hřbitov) (highlight divné písmo na hrobě??), přes východ zpátky do Kunovic a tam si sednout k rybníku",
    images: [],
    locationId: 104 // Rybník Kunovice
  },
  {
    title: "Noční tůra Rochuz, Rovnina, Amfík",
    date: "2026-01-03",
    icon: "fa-thermometer-empty",
    color: "midnightBlue",
    desc: "Tůra v noci při měsíčku (Vlčí úplněk). Šli jsme přes Rochuz na Rovninu, kde jsme našli skvělou lavičku na pokec. Potom jsme šli tmou lesem na Amfík na jezero, které stálo za hovno (ale naše hluboké otázky a rozhovory byly super). Vrátili jsme se zpátky na lavičku a kvůli zmrzlým nohám jsme zdrhali Velehradskou do auta, kde jsme doplnili náš nedostatek dopaminu sledováním Reelsek.",
    images: [
      "img/timeline/rovnina.jpg",
      "img/timeline/rovnina_love.jpg",
      "img/timeline/rovnina_srdce.jpg",
      "img/timeline/rovnina_lavicka.jpg",
      "img/timeline/rovnina_chcani.jpg",
    ],
  },
  {
    title: "Procházka po Podolí a Room tour",
    date: "2026-01-08",
    icon: "fa-home",
    color: "OrangeRed",
    desc: "Spožděným autobusem se Jožka dopravil do Podolí, podíval se, jestli měla jakási hospůdka otevřeno a bleskovým tempem šel zazvonit. Šli jsme pár metrů od Klárčina domu, kde nikdy nebyla - na okruh kolem tůní a mokřadů v Podolí (bylo tam zamrzlé jezírko (jupí!)). Samozřejmně bez mapy jsme se dokázali přes pole napojit na pokračování trasy (byl tam pěkný výhled z kopce), kde někdo dealoval drogy asi, nevím. Aby Jožka stihnul bus, tempíčkem jsme se došli ohřát ke Klárce domů, kde udělala skvělý room tour. Potom jsme spolu šli na zastávku a časově nám to perfektně vyšlo.",
    images: [
      "img/timeline/podoli_hospoda.jpg",
      "img/timeline/podoli_zvonek.jpg",
      "img/timeline/podoli_bus.jpg",
    ],
  },
  {
    title: "Procházka kolem jezer v ONV, LIDL, Rozhledna Radošov",
    date: "2026-01-01",
    icon: "fa-low-vision",
    color: "LightSkyBlue",
    desc: "V -7°C jsme se rozhodli jít na procházku. Šli jsme teda (poprvé v zimních botech) kolem jezer v Ostrožské Nové Vsi. Jezera byla pěkně zamrzlá, zasněžená a hlavně bílá. Poprosili jsme jednu starší moudrou (nabízela radu) paní, jestli by nás nevyfotila, fotky se velmi povedly. Šli jsme kolem ostrůvku s chatkami a najednou začalo foukat, tak jsme se šli schovat/ohřát do auta. Po rychlém ohřátí jsme se rozhodli se někam projet, třeba do Lidlu do Veselí. Tam si Jožka koupil kolu a jeli jsme na rozhlednu Radošov. Vedla k ní jenom polňačka, ale to by se dalo přežít. Co bylo horší, bylo počasí u té rozhledny. Vyfotili jsme se, ale pak jsme zdrhali do auta (ještě předtím Jožkovi foukalo do prdele při chcaní na kadiboudě.). Klárka šla stezku důvěry se zavřenýma očima, až tak moc foukalo. V autě jsme se s výhledem na krajinu ohřáli a jeli dom.",
    images: [
      "img/timeline/onv_snih.jpg",
      "img/timeline/onv_klarka.jpg",
      "img/timeline/onv_jezero_1.jpg",
      "img/timeline/onv_jezero_2.jpg",
      "img/timeline/onv_rozhledna.jpg",
    ],
  },
  {
    title: "Hradčovice: Rozhledna a auto před smrtí",
    date: "2026-01-16",
    icon: "fa-car-crash",
    color: "Tomato",
    desc: "Krátké, ale nabité rande. Jeli jsme na rozhlednu do Hradčovic, což byla pro nás premiéra. Dojeli jsme, ale Klárka musela parkovat, to byla zas premiéra pro ni. Cesta na rozhlednu vedla kolem prasečí farmy, takže vůně hnoje nám nahoře zajistila tu pravou romantiku (😘🔥). Měli jsme v plánu pokračovat do Brodu, ale po chvilce jízdy si Klárka všimla, že nám nesvítí světla (tentokrát si aspoň všimla). Zastavili jsme u silnice a snažili se zjistit, co je špatně. A když selhalo mačkání všech páček a čudlíků, zeptali jsme se AI. Diagnóza AI byla taková, že nám (autu) zbývá posledních 15 minut života a že za žádnou cenu nemáme vypínat motor. Mírná panika ze strany Klárky, ale pochopitelné. Najednou u nás zastavili borci, co jeli asi ze stavby. Na hlavách helmy, v ruce nějaký paklíč a že nás zachrání. Chyba byla nejspíš někde v obvodech, tak jsme je slušně odmítli. Šlo se volat mamince (příteli na telefonu). Maminka řekla že nějak se dopravit domů musíme, takže nezbývala jiná možnost než prostě jet. Naštěstí při manuálním podržení dálkových světel auto svítilo. Klárka vyhodila Jožku u Rotoru jako vždycky a ironicky když vjížděla do Podolí, světla začala svítit úplně v pohodě. Jakoby nic. Menší džojk.",
    images: ["img/timeline/hradcovice_rozhledna.jpg", "img/timeline/hradcovice_auto.jpg"],
  },
  {
    title: "Salaš: Lízátka, gravitace a záporák Santa",
    date: "2026-01-23",
    icon: "fa-gift",
    color: "HotPink",
    desc: "Po týdenní pauze dostalo auto po opravě nový život, takže se Jožka rozhodl řídit jak magor (aspoň podle Klárky). Projeli jsme se až na Salaš, kde se Klárka po Jožkově (úspěšném!) zaparkování rozhodla předat dárek k měsíčnímu výročí o den dřív, kdybychom se nemohli hned na další den vidět. Vytáhla kytici vyrobenou z XXL jahodových lízátek … a Jožka byl schopný ji asi po pěti sekundách dropnout na zem, takže se celá rozsypala. Pozitivum? Aspoň bylo jednodušší si rovnou jedno lízátko vzít. Už při cestě do kopce k rozhledně nám „mírně“ podkluzovaly nohy. Ještě jsme ani nebyli nahoře a už jsme věděli, že cesta dolů bude jízda (po prdeli). Po romantické chvíli nahoře jsme se rozhodli sednout si dole pod rozhlednou. Na výběr byl altánek, nebo dřevěná mokrá lavička. V altánku byla na Klárku moc velká tma a na Jožku zase moc malý výhled na hvězdy (které na obloze stejně nebyly). Zvolili jsme teda mokrou prdel a fajn pokec. Cestou zpátky jsme šli kolem rozsvíceného Santova (záporáckého) domečku, kde se k nám přidala místní číča. Držela se nás celou cestu dolů a měla to štěstí, že nás mohla vidět v plné parádě klouzat jak debily. Teda, hlavně Jožku, jak hází držku aj s mobilem v ruce. Klárka byla samozřejmě šikovná (a taky jištěná, jak to jen šlo). Dole jsme dali kočičce sbohem a šli se zahřát do auta. A že jsme se zahřáli… 🔥",
    images: ["img/timeline/salas_lizatka.jpg", "img/timeline/salas_kocka.jpg"],
  },
  {
    title: "Tajná mise: Klaus, Pokémoni a osudná procházka",
    date: "2026-01-24",
    icon: "fa-user-secret",
    color: "MidnightBlue",
    desc: "Jelikož šli Jožkovi rodiče na ples a v baráku zůstala jen Anička, naskytla se jedinečná příležitost – první společné sledování filmu (na tajňačku). Po složitém vyjednávání (pořád ale lepším než s Elen) a ujišťování, že se rodiče nevrátí dřív a že Klárka nebude muset přespat ve skříni, navečer konečně dorazila. Přinesla strategický úplatek – lízátko pro Aničku (prý se u toho cítila jako Epstein, ale účel světí prostředky). Cora ji přivítala po svém, taky začala vrčet na impostory co byli venku (jeden impostor už byl uvnitř). Dali jsme partičku Rummy, proběhla rychlá house tour a následně VIP room tour v Jožkově pokoji. Tam došlo na předání výročního dárku (flaška) and na flexení se vzácnými Pokémon kartičkami. Potom jsme se konečně dostali ke zlatému hřebu večera, filmu Klaus. Oběma se líbil, tak jsme na tu vánoční atmosféru chtěli navázat procházkou po Kunovicích kolem Olšavy. Viděli jsme nějakou pofiderní akci před halou, asi byla chyba tama jít, ale pořád menší chyba než ta, že si Jožka nevzal nákrčník. Nemoc a týden bez hlasu byla krutá daň, ale ten večer za to stál. Večer jsme zakončili v autě, kde jsme se „rychle“ loučili... což se protáhlo na klasickou hodinu.",
    images: ["img/timeline/klaus_film.jpg", "img/timeline/pokemon_cards.jpg"],
  },
  {
    title: "Pohotovost: Bobřík bolesti a boss fight s maminkou",
    date: "2026-01-27",
    icon: "fa-hospital-user",
    color: "Crimson",
    desc: "Všichni ví, že Klárka je moc šikovná. Dokonce tak šikovná, že si v tělocviku při volejbale zvládla na poslední chvíli zlikvidovat prst. Při řešení informatického bobříka to musela být fakt paráda, prý jí v tom tepalo jak prase. Šurdovi o zranění samozřejmě neřekla (proč taky, však to nic nebylo, že?). Když jsme se po DIPu konečně uviděli, Klárka začala polemizovat, jestli s tím jít k doktorovi teď, večer, nebo radši vůbec. Jožka nasadil přesvědčovací taktiku, ale i tak jsme se po cestě skoro dvakrát otočili zpátky na bus. Definitivně to rozhodlo až náhodné střetnutí s Marcem. I když se Klárce pořád nechtělo, už jsme si to štrádovali k nemocnici. Na recepci šikovná Klárka popsala situaci a zapsala se. Když jsme se v čekárně pohodlně usadili, došlo jí, že někde stihla ztratit lístek (který platila, i když neměla – nemocnice scammnula). Čekání jsme si krátili hraním Clashka a vyřizováním hovorů s maminkou (Jožka dokonce zvedl paní Klárkové mobil). Absolutní highlight přišel, když Klárka vyšla z ordinace s „náprstkem“ na ruce. Jožka ji změřil pohledem přes celou chodbu a zahlásil: „Tak to si děláš prdel.“ Diagnóza: Zlomený a naražený prst. 6 týdnů bez tělocviku. Odvoz domů zajistila maminka, což znamenalo Jožkovo první střetnutí s „paní Klárkovou“. I když se chtěl původně dopravit sám (posraný až za ušama), nebylo se čeho bát. Maminka byla velmi sympatická, jenom mu z nějakého důvodu vykala, což přidalo na zajímavosti. Konverzace v autě nás zavedla od toho, že Klárka je kritická osoba a vidí jenom černé scénáře, až k finálnímu potvrzení od maminky že ano, Klárka mě doma fakt popsala jako divného člověka. Díky 😘.",
    images: ["img/timeline/nemocnice_prst.jpg", "img/timeline/nemocnice_clash.jpg"],
  },
  {
    title: "Chata: Vysvědčení, granáty a digitální amnézie",
    date: "2026-01-29",
    icon: "fa-bomb",
    color: "SaddleBrown",
    desc: "Měli jsme po vysvědčení a výsledky byly krásné, tak jsme to šli oslavit randíčkem na chatu. Po příchodu začal Jožka vybalovat inventář, který se zdál bezedný. První bačkory, potom nálepky na flašku, deka a zvadlá, vlhká česneková bageta. První mise: zatopit. Jožka šel pro dřevo, venku už byla tma, tak šla Klárka dělat osvětlovače. S plnou náručí polen se Jožkovi povedlo zakymácet, šlápnout do prázdna a celkem solidně se rozbít. Zázračně ale vyvázl bez bolístky. V chatě jsme zatopili a chtěli být co nejblíž plamínkům. Jožka dostal geniální nápad přisunout gauč ke krbu. Asi pět minut s ním v úzkém prostoru zápasil, ale jakmile ho odsunul, zjevil se poklad. Děda si tam nejspíš pro případ nouze (nebo apokalypsy) schovával granáty. Po opatrném prozkoumání a fotodokumentaci nálezu nastala krize. Jožka se chtěl podívat na fotky, ale mozek vyhlásil stávku. Nevěděl, jakým vzorem odemknout vlastní mobil. Po půl hodině marných hackerských pokusů o dobytí se do přístroje to vzdal. Nezbývalo než si od té mentální námahy odpočinout u ohně se svou skvělou děvčinou. Až do noci jsme „odpočívali“ (bylo to velmi fajn) a potom jeli domů.",
    images: ["img/timeline/chata_granaty.jpg", "img/timeline/chata_bageta.jpg"],
  },
  {
    title: "Ples GUH: Placatka, gambleři a unboxing v autě",
    date: "2026-01-30",
    icon: "fa-glass-cheers",
    color: "Gold",
    desc: "Klárka se opět chopila volantu (protože druhý den psala přijímačky), takže Jožka měl zelenou k pití – i když s jeho nefungujícím hlasem a školními okolnostmi to nebyl úplně doporučený lékařský postup. Parkování proběhlo u vlakáče a po hodině intenzivního zdravení starých známých se přešlo na Tomáč. Jožka, navzdory slibům, vytáhl placatku. Klárčin bodavý, nevěřící a zklamaný pohled? Ten se jen tak nezapomene. Co se dá dělat? Nic. Stalo se. Přesunuli jsme se ke stolu ke spolužačkám a jejich „zajímavým“ boyfriendům. Jeden byl trochu mimo. Druhý (asi David?) byl totálně mimo – na druhém konci vesmíru, v jiné galaxii. Zainvestovali jsme do tomboly: Klárka 800, Jožka 200. Gambleři na život a na smrt. Šli jsme se nadechnout na vzduch, kde jsme potkali trenéra Vojtu a Filipa Churého. Klárka si s ním bohužel potřásla rukou (dodnes si to nemůže odpustit) a následně se demonstrativně utřela do Jožky. Tato rande nebudeme zapomínat.",
    images: ["img/timeline/ples_unboxing.jpg", "img/timeline/ples_tombola.jpg"],
  },
  {
    title: "Taxikář, jednosměrka a růžové kalhotky",
    date: "2026-02-06",
    icon: "fa-taxi",
    color: "DeepPink",
    desc: "Tohle rande bylo sice kratší, ale aj tak byl adrenalin. Byl zrovna den plesu obchodky. Jožka měl za sebou drsnou pokerovou partičku s Milanem, Štěpánem a Jirkosem, zatímco Klárka vyfasovala roli půlnočního taxikáře pro Bětku, Elen a Káju. Když Jožka dohrál, zkusil štěstí a zeptal se, jestli by ta nejhodnější duše na světě nehodila jeho kámoše do města. Klárka byla pochopitelně absolutně nadšená, že si do svého čistého auta naloží zrovna ty dva experty, co má z celé školy suverénně 'nejradši'. Náběr bandičky ožralů proběhl u mařackého hřbitova, kde už Štěpán preventivně svíral pohotovostní blicí pytlík. Prostě romantika. Po úspěšném výsadku v centru jsme tak intenzivně přemýšleli, kam se na tu naši chvíli zašijeme, až jsme si vůbec nevšimli, že si to suverénně štrádujeme v protisměru jednosměrkou u Hradební. Po krátkém infarktu a vydýchání jsme se radši strategicky stáhli do bezpečí na parkoviště pod Rochuzem. Tam proběhla svěřovací chvilka (která se po tom stresu hodila).",
    images: [],
  },
  {
    title: "Valentýn",
    date: "2026-02-14",
    icon: "fa-heart",
    color: "#ed4245",
    desc: "Po náročném týdnu tajného tvoření dárků jsme se konečně dočkali svátku zamilovaných. Původně byl plán zopáknout si naše úplně první rande. Jelikož ale bylo venku hnusně, museli jsme přehodnotit taktiku. I tak to ale bylo jasných 10/10. První zastávka proběhla u větrného mlýna v Jalubí, kde došlo na výměnu dárků. Klárka znovu dokázala, jak moc je šikovná, a jenom se v duchu modlila, aby tentokrát Jožka její výtvor hned nerozbil jak minule. Dostal od ní nádhernou kytici vyrobenou z takových těch chlupatých čistících drátků (žinylka se to jmenuje, vzdělávám se!), k tomu vlastnoručně upletené, voňavé plyšové srdíčko a krásné přáníčko. Jožkův balíček tvořilo Lego dvou slunečnic a přání, které se (asi osudově) svou zprávou hodně shodovalo s tím Klárčiným.",
    images: [],
    locationId: 108,
  },
  {
    title: "Vyjížďka k búdám a do Brodu",
    date: "2026-02-20",
    icon: "fa-car",
    color: "#faa61a",
    desc: "Z původně plánovaného rychlého předání kytky na spravení nálady se nakonec neplánovaně vyklubalo plnohodnotné rande. Jožka chtěl Klárce dodat trochu energie, a tak dorazil s modrým hyacintem. Kytka zafungovala na jedničku, a tak jsme rovnou nabrali směr na naše staré dobré místo, kde to všechno začalo – k Vlčnovským búdám. Protože Klárku pořád zlobil ten její zlikvidovaný prst, chvilku jsme v autě vedli strategickou poradu, jestli má vůbec cenu riskovat venku omrzliny. Než padlo rozhodnutí, zahřáli jsme se v autě, čehož Jožka využil k tomu, aby vytasil kompletní antický lore o hyacintech. Nakonec jsme se hecli, že se aspoň na chvilku provětráme, a došli jsme až k altánku. Už se začalo stmívat a odměnou nám byl luxusní výhled na rozsvícený Uherský Brod, který bylo nutné ihned zdokumentovat.",
    images: [],
    locationId: 111,
  },
  {
    title: "Procházka kolem Cimburku",
    date: "2026-02-28",
    icon: "fa-hiking",
    color: "ForestGreen",
    desc: "Protože Jožka ráno psal SCIA, potřeboval se odreagovat a po dost dlouhé době bylo načase zase dát nějaké rande s procházkou. Vyjeli jsme si teda směr Cimburk, klasicky bez navigace, dokud to jde. Tentokrát se nám to ale trochu vymstilo. Oba jsme byli v neprobádaném prostředí (Osvětimany) a jednou jsme (Jožka) špatně odbočili. S pomocí mistra navigátora Klárky jsme ale nakonec do našeho cíle, na parkoviště pod Cimburkem, trefili (Jožka sice málem trefil strom a auta v protisměru, ale byla to jízda). Když se nám tak povedlo trefit na parkoviště bez navigace, řekli jsme si, že to zopakujeme a budeme se dál řídit jenom informačními tabulemi a turistickými značkami.",
    images: [],
    locationId: 216,
  },
  {
    title: "Chata s přáteli a noční výprava",
    date: "2026-03-06",
    icon: "fa-fire-alt",
    color: "SaddleBrown",
    desc: "Když se k Jožkovi doneslo, že by Elen chtěla uspořádat nějaký ohýnek s opékáním špekáčků, nemohl to nechat jen tak. Na tyhle věci je přece mistr, takže se nabídka nedala odmítnout. Sestavila se nám četa: Jožka, Klárka, Elen, Kája, Tom a Kryštof. Aby na chatě nenastaly zbytečné logistické komplikace, Klárka s Elen ráno obstaraly zásoby and Jožka jakožto správný hospodář dovezl fresh matračky a dal chatu do pucu. Řidič nebyl nikdo jiný než Jožka. První nabral Klárku (přechod ze zpátečky na jedničku byl samozřejmě na jedničku), pak Toma s Kryštofem (bez zbytečného točení) a nakonec Elen s Kájou (bez troubení, že ano). Zafirka sice dostala zabrat, ale díky svému nadanému řidiči zvládla s nákladem i cvakajícím kolem dopravit všechny bezpečně až do cíle.",
    images: [],
  },
];
*/

// --- LIBRARY DATA ---
var library = {
  movies: [
    {
      id: 103,
      title: "Angry Birds",
      icon: "🐦",
      cat: "Animáky & Pohádky",
      magnet:
        "magnet:?xt=urn:btih:3cfd78366ccfe2f5ce6d0f7d17f6e6abdc46cabd&dn=Angry.Birds.ve.filmu.2016.1080p.BluRay.CZ.SK.AC3.x264-Mr.MUX&xl=2196742337",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 116,
      title: "Shrek",
      icon: "🧅",
      cat: "Animáky & Pohádky",
      magnet:
        "magnet:?xt=urn:btih:ab2acd192c6bb60d5445c3216cacf72f609e21e1&dn=Shrek.Complete.Collection.1080p.CZ.EN.MixeD.x265-R.i.H&xl=24813754031",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 128,
      title: "Za plotem",
      icon: "🦝",
      cat: "Animáky & Pohádky",
      magnet:
        "magnet:?xt=urn:btih:a4078b0b3e7b1e12f51855ca313eac8ea1231b2c&dn=Za%20plotem%20%28Over%20the%20Hedge%29.2006.CZ.WebRip.1080p.10b.HEVC.C4U.mkv&xl=1903318064",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 127,
      title: "Úžasňákovi",
      icon: "🦸",
      cat: "Animáky & Pohádky",
      magnet:
        "magnet:?xt=urn:btih:2df5d449cf518fe2b9c1b1314b7735194c3b45e6&dn=%C3%9A%C5%BEas%C5%88%C3%A1kovi.avi&xl=1793605632",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 113,
      title: "Rango",
      icon: "🦎",
      cat: "Animáky & Pohádky",
      magnet:
        "magnet:?xt=urn:btih:bf1e9444f0ec40cae01e818de909e0456eedb541&dn=Rango.2011.Blu-ray.1080p.Extended.Cut.x264-CZ.SK.EN&xl=7072763782",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 5,
      title: "Klaus",
      icon: "🎅",
      cat: "Animáky & Pohádky",
      magnet:
        "magnet:?xt=urn:btih:1de24ef937f587ab64e284025582c27cf41246d9&dn=Klaus.2019.HDR.2160p.WEBRip.x265.CZ-iNTENSO&xl=5919259882",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 101,
      title: "21 Jump Street",
      icon: "👮",
      cat: "Komedie",
      magnet:
        "magnet:?xt=urn:btih:a7420cc60bde351b57d2f8c031d74a3177b05f65&dn=21%2C22%20Jump%20Street%202012%2C2014%201080p%20%28Multi%29%20WEB-DL%20HEVC%20x265%205.1%20BONE&xl=4540117518",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 102,
      title: "22 Jump Street",
      icon: "🚔",
      cat: "Komedie",
      magnet:
        "magnet:?xt=urn:btih:a7420cc60bde351b57d2f8c031d74a3177b05f65&dn=21%2C22%20Jump%20Street%202012%2C2014%201080p%20%28Multi%29%20WEB-DL%20HEVC%20x265%205.1%20BONE&xl=4540117518",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 122,
      title: "Borat",
      icon: "👍",
      cat: "Komedie",
      magnet:
        "magnet:?xt=urn:btih:4a80c302f3443fb48374ee2fd74a0fc7b637ffe2&dn=Borat%20%282006%29%20FHD%20cz%20en.mkv&xl=2050976063",
      gdrive:
        "https://drive.google.com/file/d/1yTGPSkYW4KskCqjXb9PlSeNYSsuoOqoG/view?usp=sharing",
    },
    {
      id: 118,
      title: "The Hangover",
      icon: "😵",
      cat: "Komedie",
      magnet:
        "magnet:?xt=urn:btih:bf4512d9861586190359e6c4552e3f9427a930e3&dn=The%20Hangover%20Trilogy%202009%2C2011%2C2013%2C%201080p%20BluRay%20HEVC%20x265%205.1%20BONE&xl=4674467377",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 124,
      title: "Drž hubu!",
      icon: "🤐",
      cat: "Komedie",
      magnet:
        "magnet:?xt=urn:btih:df7c4d2dcd42597e96068bf8d366dd452e9489f8&dn=Dr%C5%BE%20hubu%21%20%282003%29%20FHD%20cz%20fr.mkv&xl=2143250882",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 123,
      title: "Dědictví",
      icon: "🚜",
      cat: "Komedie",
      magnet:
        "magnet:?xt=urn:btih:ca95eb295f94086eecc166c6f0c245db7c4882eb&dn=Dedictvi%20aneb%20kurvahosigutntag%20%281992%29%20%5BCZ%5D%5BBDRip%5D%5B1080p%5D%5BHEVC%5D.mkv&xl=2867771371",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 115,
      title: "Scary Movie 1-5",
      icon: "👻",
      cat: "Komedie",
      magnet:
        "magnet:?xt=urn:btih:d9f7d0a6308a77b53bc1f04ced920c0c614e1cb7&dn=Scary%20Movie%201-5%20Collection%202000-2013%201080p%20BluRay%20HEVC%20x265%205.1%20BONE&xl=6644413780",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 2,
      title: "The Dark Knight",
      icon: "🦇",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:a4ea09adf3c9a51fe719b0358aa37cbe7545f63f&dn=The.Dark.Knight.2008.1080p.BluRay.DDP5.1.x265.10bit-GalaxyRG265%5BTGx%5D&xl=4315567522",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 7,
      title: "The Matrix",
      icon: "💊",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:db63243fdcc154dfd1034d9ae6f939be563f7973&dn=The%20Matrix%20%281999%29%202160p%20H265%2010%20bit%20DV%20HDR10%2B%20ita%20eg%20AC3%205.1%20sub%20ita%20eng%20Licdom.mkv&xl=4291914323",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 105,
      title: "Deadpool",
      icon: "⚔️",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:19ec5948aa22e430ceef97c559a685d81018fc87&dn=Deadpool.2016.1080p.BluRay.DDP5.1.x265.10bit-GalaxyRG265%5BTGx%5D&xl=2749846096",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 110,
      title: "Logan",
      icon: "🐺",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:0480637222dd5a1a2e7a199c56cce0b00c35b51c&dn=Logan%20%282017%29%20%5B1080p%5D%20%5BYTS.AG%5D&xl=2248685741",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 107,
      title: "Guardians of the Galaxy",
      icon: "🌌",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:2479bc7abfbca9921eb61318e567ad2c40971c95&dn=Guardians.of.the.Galaxy.2014.IMAX.1080p.BluRay.DDP5.1.x265.10bit-GalaxyRG265%5BTGx%5D&xl=2737487733",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 114,
      title: "Ready Player One",
      icon: "🕶️",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:0b2a8eac63a94cedf31118400f3f4bcb08b72d1a&dn=Ready%20Player%20One%20%282018%29%20%5BBluRay%5D%20%5B1080p%5D%20%5BYTS.AM%5D&xl=2415181864",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 121,
      title: "Alien",
      icon: "👽",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:dffbfb159af59bd3eb8cf720b8fa99b6ac72ba78&dn=Alien%201979%20DC%20REMASTERED%201080p%20BluRay%20HEVC%20x265%205.1%20BONE.mkv&xl=2075161124",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 111,
      title: "Mad Max: Fury Road",
      icon: "🔥",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:dbac9177cdbb06dfcb0ced506170b47b6f5e9796&dn=Mad.Max.Fury.Road.2015.1080p.BluRay.DDP5.1.x265.10bit-GalaxyRG265%5BTGx%5D&xl=3959350923",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 119,
      title: "LOTR Trilogie",
      icon: "💍",
      cat: "Akční & Sci-Fi",
      magnet:
        "magnet:?xt=urn:btih:c8216c593a3bc4e660b9b12d49bb91b5857ae7bc&dn=The.Lord.Of.The.Rings.Trilogy.Extended.Remastered.1080p.BluRay.x265%20-88&xl=12166339629",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 1,
      title: "The Shawshank Redemption",
      icon: "🔓",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:e79a5b4ac27a9e66adf91689a98deb0d3ba7674b&dn=The.Shawshank.Redemption.1994.1080p.BluRay.x265.AAC.5.1%20-88&xl=2384290903",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 4,
      title: "Pulp Fiction",
      icon: "🍔",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:2516dd0343be41e7292b40441fcd84646c156d96&dn=Pulp%20Fiction%20Historky%20z%20podsveti%201994&xl=3066884151",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 6,
      title: "Fight Club",
      icon: "👊",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:70981326246aaea630c288c2429e683aa2690603&dn=Fight.Club.1999.REMASTERED.1080p.BluRay.DDP5.1.x265.10bit-GalaxyRG265%5BTGx%5D&xl=4301531029",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 8,
      title: "Whiplash",
      icon: "🥁",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:419dc46785809c0a9760be3046fb8cb880cf8493&dn=Whiplash%20%282014%29%20%2B%20Extras%20%281080p%20BluRay%20x265%20HEVC%2010bit%20AAC%207.1%20afm72%29&xl=4633276114",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 106,
      title: "Donnie Darko",
      icon: "🐰",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:8ecc1f141602919fc05d36eb88e6f1dca295019a&dn=Donnie.Darko.2001.REMASTERED.DC.1080p.BluRay.H264.AAC%20%5B88%5D&xl=2740960879",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 112,
      title: "Prisoners",
      icon: "🔦",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:e778030429d87438eb4f4a3b8197e5996c79f0e7&dn=Prisoners.2013.1080p.BluRay.DDP5.1.x265.10bit-GalaxyRG265%5BTGx%5D&xl=2681606834",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 125,
      title: "Seven",
      icon: "📦",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:61d09d1a63b8a630a8825307f87a9c14b268e382&dn=Seven%20-%20Se7en%20%281995%29%202160p%20H265%2010%20bit%20DV%20ita%20eng%20AC3%205.1%20sub%20ita%20eng%20NUita%20NUeng-Licdom.mkv&xl=3885400010",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 126,
      title: "The Social Network",
      icon: "👍",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:5c918fd1b8e6c2316463617d3727a2cfe1b24d4e&dn=The.Social.Network.2010.iTA.ENG.AC3.SUB.iTA.ENG.BluRay.HEVC.1080p.x265.jeddak-MIRCrew.mkv&xl=2946953369",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 109,
      title: "Le Mans 66",
      icon: "🏎️",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:84e8d7aba68140f12a4789ced23e0b7a1b278aa6&dn=Le%20Mans%2066%20Ford%20v%20Ferrari%20BluRay%201080xH264%20Ita%20Eng%20AC3%205.1%20Sub%20Ita%20Eng&xl=3828506737",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 117,
      title: "The Gentlemen",
      icon: "🥃",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:8896eea0fcf5ab67b547f980a53141217cded510&dn=The%20Gentlemen%20%282019%29%20%281080p%20BluRay%20x265%20HEVC%2010bit%20AAC%207.1%20Vyndros%29&xl=4387443401",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 120,
      title: "The Thing",
      icon: "❄️",
      cat: "Drama & Thriller",
      magnet:
        "magnet:?xt=urn:btih:4823e1956eba859311db0621ca9ea7d5bb4a66ca&dn=The.Thing.1982.REMASTERED.1080p.BluRay.x264.AAC5.0-ShAaNiG&xl=2142451662",
      gdrive: GLOBAL_DRIVE_LINK,
    },
  ],
  series: [
    {
      id: 9,
      title: "Breaking Bad",
      icon: "🧪",
      cat: "Seriály",
      magnet:
        "magnet:?xt=urn:btih:7118a27453275949493ab3d77b709456404e0ef6&dn=Breaking%20Bad%20%282008%29%20Season%201-5%20S01-S05%20%281080p%20BluRay%20x265%20HEVC%2010bit%20AAC%205.1%20Silence%29&xl=150389060754",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 11,
      title: "Mr. Robot",
      icon: "💻",
      cat: "Seriály",
      magnet:
        "magnet:?xt=urn:btih:704122faa6db389c8e2eff2dbd12e5aa8712fe63&dn=Mr.Robot.COMPLETE.1080p.BluRay.AV1.DDP.5.1-dAV1nci&xl=30529111722",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 12,
      title: "True Detective S1",
      icon: "🕵️",
      cat: "Seriály",
      magnet:
        "magnet:?xt=urn:btih:6f6fe19e361b14dc74c4a1dae8e51e802ef65ae7&dn=True%20Detective%20Season%201%20%20%281080p%20BD%20x265%2010bit%20FS84%20Joy%29&xl=5543662591",
      gdrive: GLOBAL_DRIVE_LINK,
    },
  ],
  games: [
    {
      id: 13,
      title: "Tetris Effect",
      icon: "🧩",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:e38087a21f8acab8e6f7120cd0622af10eaeb280&dn=Tetris.Effect.Connected.v2.0.2.rar&xl=3216489007",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 14,
      title: "Hades",
      icon: "⚡",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:70947d6b874a01385511d50166cb2d23855facb1&dn=Hades.v1.38100.zip&xl=11582699763",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 15,
      title: "Dead Cells",
      icon: "💀",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:3fed513b1d4172969a0239c0b0730e5c5a18894b&dn=Dead%20Cells%20%5BFitGirl%20Repack%5D&xl=2472856355",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 301,
      title: "Balatro",
      icon: "🃏",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:8823764e16d978e6e0f9b46bf8a66416dad2f505&dn=Balatro.v1.0.1N&xl=66744928",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 302,
      title: "Brotato",
      icon: "🥔",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:364d8768cc4628a3ad59a44644c34f324624fbea&dn=Brotato.v1.1.13.0&xl=308392977",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 303,
      title: "Kingdom: Two Crowns",
      icon: "👑",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:05c33ad86589f64f0b26b51902e2edde80603f29&dn=Kingdom.Two.Crowns.v2.3&xl=4656710442",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 304,
      title: "Mafia II: DE",
      icon: "🔫",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:4ed851ea6c87126480d2049f7b4d47fbb2d9e28f&dn=Mafia%20II%20-%20Definitive%20Edition%20%5BFitGirl%20Repack%5D&xl=13314267858",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 305,
      title: "Papa's Freezeria",
      icon: "🍦",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:9c56c4604c305af0f51d908dc7930b7da48f8e77&dn=Papas.Freezeria.Deluxe&xl=63577281",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 306,
      title: "Stackflow",
      icon: "💻",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:16e4c04d877d0fc94fa1d0fee3763d5fb3fbc0be&dn=Stackflow.v0.9&xl=129021781",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 307,
      title: "Enter the Gungeon",
      icon: "🔫",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:d83d3e3e9f40a1d0ae2b5aacf2360fb2ddcb7abb&dn=Enter.the.Gungeon.v2.1.3.zip&xl=670706499",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 308,
      title: "Hades II",
      icon: "🌙",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:3fb5b6737355f1d93e77969d7638fee90806b9d8&dn=Hades.II.v1.133066.rar&xl=9079366716",
      gdrive: GLOBAL_DRIVE_LINK,
    },
    {
      id: 309,
      title: "Jump King",
      icon: "👑",
      cat: "Hry",
      magnet:
        "magnet:?xt=urn:btih:ee670e09061d5e5694ea356a8029a280766739e5&dn=Jump.King.v1.06.rar&xl=1313998599",
      gdrive: GLOBAL_DRIVE_LINK,
    },
  ],
};

// --- DATE PLANNER DATA ---
var dateLocations = [
  // --- 100+: PROCHÁZKY - Parky, Voda & Místa (Dříve 300+) ---
  {
    id: 101,
    name: "Kunovský les",
    cat: "walk",
    lat: 49.053913,
    lng: 17.449622,
    desc: "Procházka po rovině, ideální na pokec.",
  },
  {
    id: 102,
    name: "Smetanovy sady (UH)",
    cat: "walk",
    lat: 49.066836,
    lng: 17.46869,
    desc: "Park v centru UH, kousek od Slovácké búdy.",
  },
  {
    id: 103,
    name: "Zámecký park Buchlovice",
    cat: "walk",
    lat: 49.0838,
    lng: 17.3369,
    desc: "Nádherný park, pávi a pohoda.",
  },
  {
    id: 104,
    name: "Rybník Kunovice",
    cat: "walk",
    lat: 49.041773,
    lng: 17.478465,
    desc: "Hezká procházka po Kunovicích kolem rybníku.",
  },
  {
    id: 105,
    name: "Štěrkopísková jezera",
    cat: "walk",
    lat: 49.018258,
    lng: 17.426915,
    desc: "Alfrédov. Čistá voda, v létě na koupání, v zimě na otužování.",
  },
  {
    id: 106,
    name: "Luhačovická přehrada",
    cat: "walk",
    lat: 49.123999,
    lng: 17.778854,
    desc: "Procházka kolem přehrady, koupaliště.",
  },
  {
    id: 107,
    name: "Přehrada Lučina",
    cat: "walk",
    lat: 48.862398,
    lng: 17.392934,
    desc: "Jezero s možností koupání a procházka za Radějovem.",
  },
  {
    id: 108,
    name: "Staré Hutě",
    cat: "walk",
    lat: 49.129433,
    lng: 17.277701,
    desc: "Krásná procházka v údolí pod Buchlovem.",
  },
  {
    id: 109,
    name: "Bunč",
    cat: "walk",
    lat: 49.177,
    lng: 17.3515,
    desc: "Turistické centrum Chřibů, kousek na Brdo.",
  },
  {
    id: 110,
    name: "Zámeček Pepčín",
    cat: "walk",
    lat: 49.026573,
    lng: 17.586872,
    desc: "Ruiny zámečku u Drslavic, tajemné místo.",
  },
  {
    id: 111,
    name: "Vlčnovské búdy",
    cat: "walk",
    lat: 49.01928,
    lng: 17.591636,
    desc: "Místo činu (ohniště, pes, sekerka).",
  },
  {
    id: 112,
    name: "Podolí",
    cat: "walk",
    lat: 49.038929,
    lng: 17.532952,
    desc: "Expedice do neexistující obce.",
  },

  // --- 200+: VÝHLEDY - Rozhledny, Kopce & Památky (Dříve 100+) ---
  {
    id: 201,
    name: "Rozhledna Salaš",
    cat: "view",
    lat: 49.142871,
    lng: 17.352267,
    desc: "Designová rozhledna ve tvaru sedmiček. Super výhled na Chřiby.",
  },
  {
    id: 202,
    name: "Rozhledna Rovnina",
    cat: "view",
    lat: 49.071519,
    lng: 17.513178,
    desc: "Klasika nad Jarošovem. Kousek pěšky, hezký výhled na Hradiště.",
  },
  {
    id: 203,
    name: "Floriánka",
    cat: "view",
    lat: 49.037799,
    lng: 17.326382,
    desc: "Kousek od Polešovic. Víme, že tam fouká, ale výhled na vinohrady top.",
  },
  {
    id: 204,
    name: "Maják Šrotík",
    cat: "view",
    lat: 49.07395,
    lng: 17.42684,
    desc: "Ve Staráku v Kovozoo. Trochu bizár, ale vtipný.",
  },
  {
    id: 205,
    name: "Velký Lopeník",
    cat: "view",
    lat: 48.940368,
    lng: 17.779172,
    desc: "Túra na hranice. Dřevěná rozhledna, pořádný výšlap.",
  },
  {
    id: 206,
    name: "Rozhledna Modrá",
    cat: "view",
    lat: 49.119035,
    lng: 17.403316,
    desc: "Malá dřevěná rozhledna v těch sadech nad Modrou.",
  },
  {
    id: 207,
    name: "Rozhledna Brdo",
    cat: "view",
    lat: 49.1865,
    lng: 17.3085,
    desc: "Nejvyšší kamenná rozhledna v Chřibech.",
  },
  {
    id: 208,
    name: "Větrný mlýn Jalubí",
    cat: "view",
    lat: 49.124389,
    lng: 17.431,
    desc: "Nově postavený mlýn. Krátká procházka a super fotky.",
  },
  {
    id: 209,
    name: "Rozhledna Doubí",
    cat: "view",
    lat: 49.0392,
    lng: 17.3036,
    desc: "Menší rozhledna v polích, výhled na Chřiby a Bílé Karpaty.",
  },
  {
    id: 210,
    name: "Bukovanský mlýn",
    cat: "view",
    lat: 49.036979,
    lng: 17.091398,
    desc: "Rozhledna, minigolf a restaurace kousek od Kyjova. Krásný výlet.",
  },
  {
    id: 211,
    name: "Rozhledna Radošov",
    cat: "view",
    lat: 48.924786,
    lng: 17.427983,
    desc: "Pěkná rozhledna za Veselím n. M.",
  },
  {
    id: 212,
    name: "Rozhledna Travičná",
    cat: "view",
    lat: 48.860205,
    lng: 17.365718,
    desc: "Pěkná rozhledna za Radějovem.",
  },
  {
    id: 213,
    name: "Velká Javořina",
    cat: "view",
    lat: 48.8585,
    lng: 17.671,
    desc: "Nejvyšší hora Bílých Karpat, vysílač a daleké výhledy.",
  },
  {
    id: 230,
    name: "Hrad Buchlov",
    cat: "view",
    lat: 49.107481,
    lng: 17.310858,
    desc: "Klasika. Vyhlídka z věže je povinnost.",
  },
  {
    id: 231,
    name: "Kaple svaté Barbory",
    cat: "view",
    lat: 49.108641,
    lng: 17.318941,
    desc: "Modlivka. Nejlepší místo na západ slunce pod Buchlovem.",
  },
  {
    id: 232,
    name: "Zřícenina Cimburk",
    cat: "view",
    lat: 49.1037,
    lng: 17.2162,
    desc: "Romantická zřícenina u Koryčan. Málo lidí, hodně klidu.",
  },
  {
    id: 233,
    name: "Hradisko sv. Klimenta",
    cat: "view",
    lat: 49.0854,
    lng: 17.2177,
    desc: "Hradisko v lesích. Klid, historie a Gorazd.",
  },
  {
    id: 234,
    name: "Zřícenina Střílky",
    cat: "view",
    lat: 49.135,
    lng: 17.2205,
    desc: "Zřícenina s krásným výhledem, kousek od Střílek.",
  },
  {
    id: 235,
    name: "Kaple svatého Rocha",
    cat: "view",
    lat: 49.076822,
    lng: 17.494639,
    desc: "Ještě kousek nad skanzenem. Krásný výhled na západ slunce nad UH.",
  },
  {
    id: 236,
    name: "Zámek Milotice",
    cat: "view",
    lat: 48.959258,
    lng: 17.138092,
    desc: "Barokní perla. Ty zahrady jsou na procházku jak dělané.",
  },
  {
    id: 237,
    name: "Hrad Malenovice",
    cat: "view",
    lat: 49.20348,
    lng: 17.599559,
    desc: "Zajímavý hrad/zámek, procházka v lese.",
  },
  {
    id: 238,
    name: "Velehrad (Bazilika)",
    cat: "view",
    lat: 49.1035,
    lng: 17.3958,
    desc: "Je to tam hezké, i když nejsme věřící. Zmrzlina u cesty.",
  },
  {
    id: 239,
    name: "Kostel Panny Marie (Sady)",
    cat: "view",
    lat: 49.052542,
    lng: 17.481772,
    desc: "Výšina sv. Metoděje, archeologické naleziště a výhled.",
  },
  {
    id: 250,
    name: "Kazatelna",
    cat: "view",
    lat: 49.095453,
    lng: 17.226237,
    desc: "Skalní útvar v Chřibech. Prý se odtud kázalo.",
  },
  {
    id: 251,
    name: "Kozel",
    cat: "view",
    lat: 49.097599,
    lng: 17.216784,
    desc: "Skála v Chřibech, co vypadá... no jako kozel. Kousek od Kazatelny.",
  },
  {
    id: 252,
    name: "Buchlovský kámen",
    cat: "view",
    lat: 49.1172,
    lng: 17.2889,
    desc: "Osamělý pískovcový skalní útvar v Chřibech.",
  },
  {
    id: 253,
    name: "Břestecká Skála",
    cat: "view",
    lat: 49.111593,
    lng: 17.335545,
    desc: "Pískovcové skály v Chřibech, kousek od Břestku.",
  },

  // --- 300+: ZÁBAVA - Sport, Zvířata & Akce (Dříve 200+) ---
  {
    id: 301,
    name: "Kovozoo Staré Město",
    cat: "fun",
    lat: 49.07395,
    lng: 17.42684,
    desc: "Zvířata ze šrotu. Projdeme se, dáme fotku s gepardem.",
  },
  {
    id: 302,
    name: "ZOO Lešná",
    cat: "fun",
    lat: 49.2747,
    lng: 17.7136,
    desc: "Nejhezčí ZOO v okolí. Rejnoci a zámek.",
  },
  {
    id: 303,
    name: "Staroměstská Minizoo",
    cat: "fun",
    lat: 49.0765,
    lng: 17.4365,
    desc: "Malá zoo ve Staráku (Rybníček).",
  },
  {
    id: 304,
    name: "Živá Voda Modrá",
    cat: "fun",
    lat: 49.103295,
    lng: 17.406936,
    desc: "Ten podvodní tunel s vyžranýma kaprama. A prury.",
  },
  {
    id: 305,
    name: "Archeoskanzen Modrá",
    cat: "fun",
    lat: 49.105611,
    lng: 17.409365,
    desc: "Historie, Velká Morava a tak. Hned vedle Živé vody.",
  },
  {
    id: 306,
    name: "Skanzen Rochus",
    cat: "fun",
    lat: 49.071833,
    lng: 17.489,
    desc: "Procházka mezi starýma barákama nad Mařaticama.",
  },
  {
    id: 307,
    name: "Skanzen Strážnice",
    cat: "fun",
    lat: 48.904117,
    lng: 17.3122,
    desc: "Velký skanzen s vinohrady.",
  },
  {
    id: 308,
    name: "Stezka Lovců Mamutů",
    cat: "fun",
    lat: 49.05458,
    lng: 17.349503,
    desc: "Naučná stezka s dřevěnými zvířaty u Boršic.",
  },
  {
    id: 309,
    name: "Letecké muzeum Kunovice",
    cat: "fun",
    lat: 49.034854,
    lng: 17.458005,
    desc: "Naganský expres a stíhačky. Povinnost.",
  },
  {
    id: 310,
    name: "Slovácké muzeum",
    cat: "fun",
    lat: 49.056575,
    lng: 17.360344,
    desc: "Muzeum v parku, historie Slovácka.",
  },
  {
    id: 320,
    name: "Kino Hvězda UH",
    cat: "fun",
    lat: 49.067479,
    lng: 17.468837,
    desc: "Popcorn (i když leze do zubů) a nějaký film z watchlistu.",
  },
  {
    id: 321,
    name: "Aquapark UH",
    cat: "fun",
    lat: 49.067042,
    lng: 17.472961,
    desc: "Tobogány nebo wellness? Spíš ten wellness.",
  },
  {
    id: 322,
    name: "Laser Game UH",
    cat: "fun",
    lat: 49.063,
    lng: 17.47,
    desc: "Ať vidíme, kdo má lepší mušku (já).",
  },
  {
    id: 323,
    name: "Motokáry Staré Město",
    cat: "fun",
    lat: 49.072239,
    lng: 17.42046,
    desc: "Trocha adrenalinu na parkovišti (Rec Group).",
  },
  {
    id: 324,
    name: "Bowling Mařatice",
    cat: "fun",
    lat: 49.061068,
    lng: 17.481452,
    desc: "Klasika, když prší. Pivo a koule.",
  },
  {
    id: 325,
    name: "Sport Centrum Morava",
    cat: "fun",
    lat: 49.0682,
    lng: 17.4856,
    desc: "Bowling a pizza v Mařaticích.",
  },
  {
    id: 326,
    name: "Discgolf Kunovský les",
    cat: "fun",
    lat: 49.0543,
    lng: 17.4485,
    desc: "Házení talířem na koše. Je to sranda a je to v lese.",
  },
  {
    id: 327,
    name: "Minigolf Horní Němčí",
    cat: "fun",
    lat: 48.9275,
    lng: 17.6255,
    desc: "Fajn minigolf trochu dál, ale v přírodě.",
  },
  {
    id: 328,
    name: "Slovácký dvůr",
    cat: "fun",
    lat: 49.011805,
    lng: 17.440694,
    desc: "Adventure golf a koupání v Ostrožské.",
  },
  {
    id: 329,
    name: "Baloncentrum Břestek",
    cat: "fun",
    lat: 49.094338,
    lng: 17.355034,
    desc: "Koukat jak startují balóny a dát si limonádu.",
  },
  {
    id: 330,
    name: "Amfík Bukovina",
    cat: "fun",
    lat: 49.061544,
    lng: 17.516969,
    desc: "Když bude nějaká akce nebo letní kino. Pěkný areál.",
  },
  {
    id: 331,
    name: "Basketbal Kunovice",
    cat: "fun",
    lat: 49.044594,
    lng: 17.470963,
    desc: "Basketbal U Pálenice.",
  },

  // --- 400+: JÍDLO & KÁVA (Zůstává) ---
  {
    id: 401,
    name: "Kafec U Komína",
    cat: "food",
    lat: 49.072781,
    lng: 17.455032,
    desc: "Nejlepší vafle a kafe v UH.",
  },
  {
    id: 402,
    name: "Zašívárna U Osla",
    cat: "food",
    lat: 49.062827,
    lng: 17.423105,
    desc: "Skvělá atmosféra a dobré pití.",
  },
  {
    id: 403,
    name: "Hospůdka na Haldě",
    cat: "food",
    lat: 49.056575,
    lng: 17.360344,
    desc: "Ryby a pohoda v Boršicích.",
  },
];

// --- TOPIC LIBRARY DATA ---
var conversationTopics = [
  {
    id: "personality",
    title: "Osobnost a vnitřní svět",
    icon: "🧠",
    color: "#eb459e",
    desc: "Psychika, emoce, strachy a sebepoznání.",
    questions: [
      "Máš pocit, že se lidem ukazuješ taková, jaká opravdu jsi, nebo nosíš na veřejnosti nějakou „masku“? Kdy ji sundáváš?",
      "Kdybys mohla něco změnit na svém vzhledu nebo povaze, co by to bylo (pokud vůbec něco)?",
      "Co ti dokáže nejrychleji zkazit náladu?",
      "Kdy jsi naposledy plakala a proč? (Slzy štěstí se taky počítají).",
      "Čeho se v životě nejvíc bojíš?",
      "Jaká emoce je pro tebe nejtěžší na vyjádření/prožití? (Hněv, smutek, bezmoc...?)",
      "Když jsi ve stresu nebo smutná, potřebuješ spíše fyzický kontakt a blízkost, nebo prostor a samotu?",
      "Trpíš někdy „impostor syndromem“?",
      "Co ti v životě bere nejvíce energie, aniž by si toho ostatní všimli?",
      "Co je pro tebe horší: Selhat sama před sebou, nebo zklamat někoho jiného?",
      "Co je pro tebe těžší: Přijmout kompliment, nebo přijmout konstruktivní kritiku?",
      "Co ti dává pocit největšího bezpečí?",
      "Jsi spíše člověk, který se rozhoduje srdcem, nebo hlavou?",
      "Jak moc dáš na svou intuici? Vzpomeň si na situaci, kdy ti intuice zachránila kůži nebo měla pravdu proti logice.",
      "Máš nějaký zlozvyk, kterého by ses ráda zbavila?",
      "Co je ta nejtěžší věc, kterou jsi musela v životě překonat?",
      "Kdy se cítíš nejvíce sama sebou?",
      "Kdybys mohla ze své paměti vymazat jednu konkrétní událost, udělala bys to, i kdyby to znamenalo, že se z ní nepoučíš?",
      "Máš tendenci problémy řešit hned, jak vzniknou, nebo čekáš, až „vyhnijí“?",
      "Jsi ranní ptáče, nebo noční sova?",
      "Jak se chováš, když jsi nemocná? Chceš být opečovávaná, nebo chceš být sama?",
      "Co je první věc, které si na lidech všimneš?",
      "Sbíráš (nebo sbírala jsi někdy) něco?",
      "Kdybys mohla na jeden den být mužem, co bys zkusila jako první?",
    ],
  },
  {
    id: "values",
    title: "Hodnoty a pohled na svět",
    icon: "⚖️",
    color: "#3ba55c",
    desc: "Etika, morálka, společnost a názory.",
    questions: [
      "Co pro tebe znamená svoboda? Cítíš se svobodná?",
      "Věříš na osud (že věci jsou dané), nebo si myslíš, že jsme strůjci svého štěstí?",
      "Je podle tebe někdy v pořádku lhát? Pokud ano, v jaké situaci?",
      "Je pro tebe důležitější pravda, nebo laskavost? (Řekneš krutou pravdu, nebo milosrdnou lež?)",
      "Myslíš si, že se lidé mohou skutečně zásadně změnit?",
      "Odpouštíš lidem snadno, nebo si křivdy pamatuješ dlouho?",
      "Věříš v karmu (co dáš, to se ti vrátí)?",
      "Kdybys našla peněženku s velkou hotovostí a věděla jistě, že patří někomu, kdo ty peníze vůbec nepotřebuje (zkorumpovaný politik, miliardář), vrátila bys ji?",
      "Myslíš si, že účel světí prostředky? Kdy je v pořádku udělat něco špatného pro dobrou věc?",
      "Co si myslíš o lidech, kteří podvádějí na daních? Je to krádež, nebo „boj proti systému“?",
      "Myslíš si, že má každý člověk svou cenu, za kterou by se dal „koupit“?",
      "Kdybys mohla vyřešit jeden celosvětový problém lusknutím prstu, který by to byl?",
      "Co si myslíš, že je dnes ve společnosti nejvíce přeceňováno?",
      "Byla bys raději nejchytřejší člověk na světě, který je nešťastný, nebo průměrný, ale naprosto šťastný?",
      "Kdybys mohla zavést jeden zákon, který by museli všichni dodržovat, co by to bylo?",
      "Věříš spíše v kolektivní odpovědnost, nebo v tvrdý individualismus (každý sám za sebe)?",
      "Jaký máš vztah k charitě a pomoci cizím lidem?",
      "Jaký máš názor na feminismus v dnešní podobě?",
      "Bojíš se o budoucnost planety (klima), nebo věříš, že to lidstvo nějak vyřeší?",
      "Co je podle tebe největší problém naší generace? (Psychické zdraví, neschopnost závazků, sociální sítě...?)",
      "Myslíš si, že vzdělávací systém (škola) připravuje lidi na reálný život? Co bys v něm změnila?",
      "Myslíš si, že je dnešní doba pro výchovu dětí těžší nebo lehčí než doba našich rodičů?",
      "Co si myslíš o konceptu manželství? Je to přežitek, nebo důležitý závazek?",
      "Jaký máš názor na sociální sítě - spojují nás, nebo rozdělují?",
      "Myslíš si, že sociální sítě lidem spíše pomáhají, nebo škodí?",
      "Co si myslíš o umělé inteligenci?",
      "Kdybys měla moc zrušit jednu existující technologii (internet, auta, atomovky...), která by to byla?",
    ],
  },
  {
    id: "relationships",
    title: "Láska, rodina a přátelé",
    icon: "❤️",
    color: "#ed4245",
    desc: "Partnerství, my dva, vztahy v rodině.",
    questions: [
      "Kde nás vidíš za 5 let?",
      "Proč jsi se do mě vlastně zamilovala?",
      "Jsi teď v životě šťastná?",
      "Kdy ses cítila v našem vztahu nejvíce milovaná?",
      "Co tě na mně na našem prvním rande nejvíc zaujalo (nebo vyděsilo)?",
      "Co si myslíš, že je naše největší společná silná stránka?",
      "Existuje něco, co bys chtěla, abychom spolu dělali častěji?",
      "V čem jsme si podle tebe nejvíce podobní a v čem nejvíce rozdílní?",
      "Jaká je tvá představa o ideálním společném víkendu?",
      "Kdybys měla popsat naši „kulturu páru“ (naše zvyky, humor, pravidla) někomu cizímu, co bys řekla?",
      "Co bys chtěla, abych o tobě věděl, ale nikdy ses neodvážila nebo neměla příležitost to říct?",
      "Existuje otázka, na kterou se mě bojíš zeptat, protože se bojíš odpovědi?",
      "V jaké situaci jsem ti v minulosti nevědomky ublížil a nikdy jsme to pořádně neprobrali?",
      "Co si myslíš, že mi na tobě vadí, ale nikdy jsem to neřekl nahlas? (Tvoje domněnka).",
      "Co je pro tebe ve vztahu neodpustitelná zrada (kromě nevěry)?",
      "Jak moc je pro tebe důležité, abychom měli společné koníčky, oproti tomu mít každý svůj svět?",
      "Věříš na lásku na první pohled, nebo se láska musí vybudovat?",
      "Co je podle tebe na muži nejvíc hot (nemyslím vzhled, ale vlastnost nebo chování)?",
      "Co tě na mně fyzicky nejvíce přitahuje?",
      "Líbí se ti projevování lásky na veřejnosti (držení za ruce, líbání), nebo si to necháváš na doma?",
      "Máš ráda překvapení, nebo raději víš, co se bude dít?",
      "Co je pro tebe větší romantika: večeře při svíčkách, nebo společný výšlap na kopec při západu slunce?",
      "Jaká je tvá nejoblíbenější vzpomínka na nás dva?",
      "Co dělám, co tě vždycky zaručeně rozesměje?",
      "Co dělám, co tě zaručeně vytáčí?",
      "Kdybychom si pořídili v budoucnu zvíře, jaké by to bylo a jak by se jmenovalo?",
      "Co pro tebe znamená slovo „domov“? Je to místo, lidé nebo pocit?",
      "Jaký máš vztah se svými sourozenci? Změnilo se to s věkem?",
      "Jak důležité je pro tebe mít dobré vztahy s rodinou partnera?",
      "A naopak - za co jsi svým rodičům nejvíc vděčná a chtěla bys to předat dál?",
      "Jaký výchovný prvek tvých rodičů bys nikdy nepoužila na své děti?",
      "Byla bys raději přísný rodič s respektem, nebo rodič-kamarád?",
      "Jaký máš názor na tradiční rozdělení rolí (muž živitel, žena v domácnosti) vs. moderní rovnost?",
      "Chtěla bys na stáří bydlet blízko rodiny, nebo někde v klidu na samotě?",
      "Co je pro tebe u přátelství absolutní „deal-breaker“ (důvod k ukončení přátelství)?",
      "Máš raději velkou partu známých, nebo dva až tři velmi blízké přátele?",
      "Kdyby ses dozvěděla, že partner tvé nejlepší kamarádky ji podvádí, řekla bys jí to, i kdyby to mohlo zničit vaše přátelství?",
      "Vadí ti pomlouvání, nebo si ráda poslechneš „šťavnaté drby“?",
      "Dokážeš udržet tajemství, i když tě to svrbí na jazyku?",
      "Půjčuješ ráda lidem věci nebo peníze, nebo se držíš hesla „pořádek dělá přátele“?",
      "Cítíš se lépe ve společnosti mužů, nebo žen?",
      "Dáváš lidem druhé šance?",
    ],
  },
  {
    id: "lifepath",
    title: "Dětství, práce a cesty",
    icon: "👣",
    color: "#faa61a",
    desc: "Minulost, kariéra, úspěch a cestování.",
    questions: [
      "Jaká je tvá úplně nejranější vzpomínka?",
      "Která rodinná tradice z dětství je pro tebe nejdůležitější a chtěla bys ji předat dál?",
      "Kdybys mohla vrátit čas a říct svému mladšímu „já“ jednu věc, co by to bylo?",
      "Jakou radu bys dala svému o 10 let staršímu já?",
      "Kdybys mohla změnit jednu věc na způsobu, jakým jsi byla vychována, co by to bylo?",
      "Čím jsi chtěla být, když jsi byla malá, a proč se to změnilo (nebo nezměnilo)?",
      "Jakou největší lumpárnu jsi v dětství provedla, na kterou se nepřišlo (nebo přišlo až pozdě)?",
      "Měla jsi jako dítě nějaký iracionální strach?",
      "Jaká knížka nebo film tě v dětství nejvíce ovlivnily?",
      "Co považuješ za svůj největší pracovní nebo studijní úspěch?",
      "Co bys dělala, kdybys věděla, že nemůžeš neuspět?",
      "Co je pro tebe v životě největší definicí úspěchu? (Peníze, rodina, klid, sláva...?)",
      "Co byla tvá vůbec nejhorší brigáda nebo práce?",
      "Pracuješ raději v týmu, nebo jsi „vlk samotář“?",
      "Jsi přirozený vůdce, nebo se raději necháš vést?",
      "Co tě v práci nebo ve škole dokáže nejvíc naštvat?",
      "Jsi typ, který věci řeší hned, nebo prokrastinuješ do poslední chvíle?",
      "Kdybys nemusela řešit peníze, čím by ses živila?",
      "Co bys dělala, kdybys vyhrála v loterii takovou částku, že bys už nikdy nemusela pracovat?",
      "Jak nejlépe relaxuješ po náročném dni? Co ti dobije baterky?",
      "Za co jsi v životě nejvíce vděčná?",
      "Lituješ v životě něčeho, co jsi neudělala?",
      "Jaké je nejkrásnější místo, které jsi kdy navštívila, a proč ti utkvělo v paměti?",
      "Kdybys mohla zítra odjet a žít jeden rok v jakékoliv jiné zemi, která by to byla?",
      "Cestovala bys raději sama, nebo bys raději zůstala doma, kdyby nikdo nemohl jet s tebou?",
      "Jaký typ cestovatele jsi? Plánuješ každou minutu, nebo se necháváš unášet náhodou?",
      "Máš raději luxusní hotel se snídaní do postele, nebo spaní pod širákem u ohně?",
      "Co je ta jedna věc, která ti v kufru nikdy nesmí chybět (kromě dokladů a peněz)?",
      "Jaká je nejšílenější nebo nejadrenalinovější věc, kterou jsi na cestách zažila?",
      "Existuje místo na světě, kam by ses v životě nechtěla podívat?",
      "Bojíš se stárnutí, nebo to bereš jako přirozenou věc?",
      "Jak bys chtěla, aby si tě lidé pamatovali, až tu jednou nebudeš?",
      "Co bys dělala, kdybys zítra přišla o všechno (majetek, práci)?",
      "Uvažovala bys někdy o plastické operaci, nebo chceš stárnout přirozeně?",
      "Přemýšlela jsi někdy nad tím, co bys napsala do závěti?",
    ],
  },
  {
    id: "dreams_culture",
    title: "Sny, fantazie a kultura",
    icon: "✨",
    color: "#5865F2",
    desc: "Útěk od reality, hypotetické otázky a to, co sytí duši.",
    questions: [
      "Jak vypadá tvůj naprosto dokonalý den od probuzení až do usnutí?",
      "Kdybys mohla zítra ráno vstát a mít jakoukoliv novou schopnost nebo dovednost, jaká by to byla?",
      "Kterou jednu věc bys chtěla stihnout, než zemřeš (top položka na bucket listu)?",
      "Je nějaký sen, který jsi vzdala, ale stále na něj občas myslíš?",
      "Kdybys mohla žít v jakémkoliv fiktivním světě (kniha/film/hra), ale jen jako obyčejný občan, kde by to bylo?",
      "Jaké roční období nejlépe vystihuje tvou povahu?",
      "Co pro tebe znamená ticho? Je to klid, nebo tě to znervózňuje?",
      "Kdyby sis mohla vybrat, že budeš žít v jakékoliv jiné době, kterou bys zvolila?",
      "Kdyby sis mohla dát večeři s jakýmikoliv třemi lidmi (živými či mrtvými), koho bys pozvala?",
      "Kdyby v tvém domě hořelo a všichni lidé i zvířata by byli v bezpečí, jakou jednu věc bys zachránila?",
      "Kdyby ses mohla proměnit v jakékoliv zvíře na jeden den, jaké by to bylo?",
      "Kdybys byla neviditelná na jeden den, co bys dělala?",
      "Kdybys napsala knihu, o čem by byla?",
      "Jaký citát nebo motto se ti vybaví, když je ti těžko?",
      "Kdyby sis mohla vybrat jednu dovednost umělce (malovat jako Picasso, zpívat jako Adele...), co by to bylo?",
      "Který film jsi viděla tolikrát, že znáš zpaměti skoro všechny hlášky?",
      "Sleduješ raději dokumenty o realitě, nebo filmy, které tě od reality odtrhnou?",
      "Posloucháš raději podcasty/audioknihy, nebo dáváš přednost tištěnému slovu?",
      "Jaký žánr hudby absolutně nesneseš?",
      "Byla jsi někdy na koncertě?",
      "Máš nějaký skrytý talent, o kterém moc lidí neví?",
      "Jakou vlastnost na lidech obdivuješ nejvíce a jakou naopak nesnášíš?",
      "Co je podle tebe smyslem života?",
      "Myslíš si, že lidé jsou v jádru dobří, nebo zlí?",
      "Myslíš si, že jsme ve vesmíru sami, nebo věříš na mimozemský život?",
      "Věříš spíše na vědu a fakta, nebo na intuici a duchovno (nebo oboje)?",
      "Co si myslíš, že se stane po smrti?",
      "Chtěla bys žít věčně, kdyby to šlo?",
      "Kdybys mohla znát přesné datum své smrti, chtěla bys ho vědět?",
      "Kdybys mohla položit jednu otázku „vševědoucí bytosti“ a dostat pravdivou odpověď, na co by ses zeptala?",
      "Věříš na duchy, mimozemšťany nebo konspirační teorie? Jestli ano, na které?",
      "Zažila jsi někdy něco nadpřirozeného nebo nevysvětlitelného?",
      "Máš často pocit déjà vu?",
    ],
  },
  {
    id: "fun_dilemmas",
    title: "Zábava, jídlo a dilemata",
    icon: "🤪",
    color: "#ff5252",
    desc: "Odlehčení, smích, trapasy a rychlé volby.",
    questions: [
      "Jakou písničku bys musela zpívat v karaoke, abys to „rozbila“?",
      "Jaký je nejhorší dárek, který jsi kdy dostala, a musela jsi předstírat radost?",
      "Máš nějakou „guilty pleasure“ (provinilé potěšení) - třeba reality show, písničku nebo jídlo?",
      "Jaký je tvůj nejoblíbenější svátek v roce a proč?",
      "Co je první věc, kterou uděláš ráno na mobilu?",
      "Preferuješ volání, nebo psaní zpráv?",
      "Vadí ti, když někdo u jídla kouká do telefonu?",
      "Máš raději papírový diář, nebo všechno píšeš do mobilu?",
      "Sleduješ zprávy a politiku, nebo se snažíš od toho distancovat?",
      "Sladké, nebo slané?",
      "Káva, nebo čaj? A kolik šálků denně je „moc“?",
      "Jaké nejpodivnější jídlo jsi kdy v životě snědla?",
      "Jaké nejlepší (nebo nejdivnější) jídlo jsi v zahraničí ochutnala?",
      "Kdybys musela vybrat jen 5 surovin, které bys mohla používat do konce života, jaké by to byly?",
      "Kdybys musela jíst jedno jídlo do konce života, co by to bylo?",
      "Jaké je tvé absolutní „comfort food“ (jídlo pro útěchu), když je ti hozně?",
      "Odsuzuješ lidi podle toho, jak jedí nebo jak se chovají u stolu?",
      "Co by sis objednala jako své „poslední jídlo“ před popravou?",
      "Kdyby nastala zombie apokalypsa, jaká by byla tvoje zbraň a strategie?",
      "Kdybychom ztroskotali na pustém ostrově, kdo z nás by přežil déle a proč?",
      "Kdybys mohla spáchat jeden zločin a měla jistotu, že tě nikdy nechytí, co bys udělala? (Vyloupení banky? Pomsta?)",
      "Kdybys mohla udělat jednu věc nelegální, co by to bylo?",
      "Kdybys byla sériový vrah, jaký by byl tvůj „podpis“ na místě činu?",
      "Kdybys mě musela zabít a zbavit se těla tak, aby na to nikdo nepřišel, jak bys to udělala?",
      "(Mám se bát?)",
      "Kdybychom byli kanibalové, kterou část mého těla bys snědla jako první?",
      "Jak by zněla tvoje vězeňská přezdívka a za co bys tam seděla?",
      "Kdyby tě zavřeli do blázince, co bys řekla lékařům, abys je přesvědčila, že nejsi blázen? (A věřili by ti?)",
      "Kterou konspirační teorii bys vymyslela, abys zmátla lidi?",
      "Kdybys mohla založit kult, co byste uctívali?",
      "Kdyby ses stala diktátorkou malé země, jaký by byl tvůj první zákon?",
      "Kdyby ses probudila a zjistila, že jsi jediný člověk na Zemi, co bys udělala jako úplně první věc?",
      "Kdyby mimozemšťané přistáli a řekli: „Vezměte nás ke svému vůdci,“ ke komu bys je dovedla?",
      "Kdyby internet zítra zmizel, jak by ses živila?",
      "Kdyby zvířata uměla mluvit, které by bylo největší „hovado“?",
      "Co si myslíš, že si o nás myslí náš pes/kočka?",
      "Myslíš, že mají ryby žízeň?",
      "Věříš, že existují víly a trpaslíci?",
      "Kdyby sis musela změnit jméno na nějaký druh zeleniny, jak by ses jmenovala?",
      "Kdyby ses mohla proměnit v jakýkoliv kus nábytku, čím bys chtěla být?",
      "Kdybys mohla nahradit podání ruky jakýmkoliv jiným gestem, co by to bylo?",
      "Jaký zvuk nebo hluk absolutně nesnášíš? (Polystyren, křída na tabuli, mlaskání...?)",
      "Kdybys byla opačného pohlaví, myslíš, že bys chodila se svým současným já?",
      "Kdybychom si prohodili těla na jeden den (jako ve filmu), co bys s mým tělem udělala, abych měl druhý den problém?",
      "Kdybych byl zatčen, co by si tvoje rodina myslela, že jsem provedl?",
      "Kdybys měla napsat inzerát sama na sebe do seznamky, ale musela bys uvést jen své špatné vlastnosti, co by tam stálo?",
      "Měla jsi někdy trapnou přezdívku?",
      "Jaká je nejtrapnější věc, která se ti kdy stala?",
      "Stalo se ti někdy, že ses smála tak moc, až sis trochu učůrla?",
      "Čůráš ve sprše?",
      "Jak dlouho jsi nejdéle vydržela bez sprchy a proč?",
      "Čicháš si k vlastnímu oblečení, abys zjistila, jestli se dá ještě nosit?",
      "Šťouráš se v nose, když jsi v autě sama? A co s tím úlovkem uděláš?",
      "Kdybys musela sníst jednu věc z koše, co by bylo „nejpřijatelnější“?",
      "Za jakou finanční částku bys byla ochotná sníst živého pavouka?",
      "Máš nějakou fobii, o které nevím? (Pavouci, výšky, klauni, malé dírky...?)",
      "Co je pro tebe horší představa: Ztratit paměť a nevědět, kdo jsi, nebo ztratit pohyblivost?",
      "Toaletní papír: odvíjet vrchem, nebo spodem?",
      "Mačkáš toaletní papír do kuličky, nebo ho pečlivě skládáš?",
      "Raději bys uměla létat, nebo číst myšlenky?",
      "Kdyby sis mohla vybrat jednu superschopnost: Teleportace (být kdekoliv hned), nebo Cestování časem?",
      "Kdybys mohla cestovat časem, podívala bys se raději do minulosti (na historii), nebo do budoucnosti (jak to tu bude vypadat)?",
      "Chtěla bys raději znát svou budoucnost, nebo změnit svou minulost?",
      "Hory, nebo moře? (Ale musíš si vybrat jen jedno na zbytek života).",
      "Vzdala bys se raději hudby, nebo filmů/seriálů?",
      "Mít možnost mluvit všemi jazyky světa, nebo umět mluvit se zvířaty?",
      "Žít ve velkoměstě v malém bytě, nebo na samotě ve velkém domě?",
      "Raději bys byla vždy o 10 minut dřív, nebo vždy o 20 minut později?",
      "Romantická večeře doma při svíčkách, nebo v luxusní restauraci?",
      "Raději bys měla ruce místo nohou, nebo nohy místo rukou?",
      "Chtěla bys raději neustále cítit smrad, který by nikdo jiný necítil, nebo bys raději smrděla, ale sama bys to necítila?",
      "Raději bys bojovala s jednou kachnou velikosti koně, nebo se stovkou koní o velikosti kachny?",
      "Raději bys mluvila nahlas všechno, co si myslíš, nebo bys navždy ztratila schopnost mluvit?",
      "Raději bys měla na čele třetí oko, nebo třetí ruku vyrůstající ze zad?",
      "Raději bys musela všude chodit pozadu, nebo bys musela každou větu, kterou řekneš, zakřičet?",
      "Raději bys neměla kolena, nebo lokty?",
      "Chtěla bys raději vědět, kdy přesně zemřeš, nebo jak přesně zemřeš?",
    ],
  },
];

// --- SMART SEARCH DATA ---
const searchSynonyms = {
  walk: [
    "procházka",
    "les",
    "příroda",
    "výšlap",
    "hory",
    "🌲",
    "venku",
    "vzduch",
  ],
  food: [
    "jídlo",
    "restaurace",
    "kafe",
    "oběd",
    "večeře",
    "burger",
    "pizza",
    "🍔",
    "☕",
    "hlad",
  ],
  view: [
    "výhled",
    "rozhledna",
    "kopec",
    "vyhlídka",
    "👀",
    "panorama",
    "západ slunce",
  ],
  fun: ["zábava", "hra", "sport", "kino", "akce", "🎉", "bowling", "laser"],
  movie: ["film", "koukání", "kino", "🎬", "sleduj", "pohádka"],
  game: ["hra", "pařba", "🎮", "play", "skóre"],
  love: ["láska", "rande", "❤️", "spolu", "miluju"],
};
