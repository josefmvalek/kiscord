import { state, stateEvents, ensureRegeneraceData } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';
import { supabase } from '../core/supabase.js';

const REGENERACE_START_DATE = new Date('2026-04-15');

// Fallback content in case DB is empty or offline
const DEFAULT_CONTENT = {
    hero: {
        title: "Cesta z \"Úsporného režimu\" 💖",
        text: "Tvoje tělo je neuvěřitelně chytrý stroj. Když mu chybí spánek, voda a \"palivo\" ve formě jídla, začne vypínat všechno, co není nezbytné pro přežití. Výsledkem je ta nekonečná únava, bledost a pocit, že \"jen přežíváš\".",
        subtext: "Tady je tvůj plán, jak tělo zase \"nasytit\" kyslíkem a energií, aby se tvé buňky přestaly bát a začaly zase zářit."
    },
    supplements: [
        {
            id: "iron",
            icon: "🩸",
            title: "1. Železo",
            subtitle: "Osobní logistika kyslíku",
            product: "Pharma Activ Železo chelát (60 tobolek)",
            benefit: "Okysličení organismu, tvorba krve a buněčná energie.",
            composition: [
                "Železo (20 mg / 142,8 % RHP): Ve špičkové formě bisglycinátu (chelát).",
                "Vitamín C (150 mg / 187,5 % RHP): Klíč k „odemknutí“ vstřebávání železa ve střevě.",
                "Vitamín B12 (0,2 mg / 8000 % RHP): Extrémně důležitý pro vegetariány. Zodpovídá za regeneraci nervů a tvorbu červených krvinek.",
                "Kyselina listová (0,2 mg / 100 % RHP): nezbytná pro růst nových buněk."
            ],
            deficiency: [
                "**Bledost:** Tvá kůže ztrácí barvu, protože v ní neproudí dostatek sytě rudých, okysličených krvinek.",
                "**Věčná zima:** Neustále studené ruce and nohy. Tělo stahuje teplo z periferií, aby udrželo při životě srdce a mozek.",
                "**Zadýchanávání:** I mírná chůze tě vyčerpá. Tvé plíce nestíhají zásobovat svaly kyslíkem.",
                "**Mozková mlha:** Únava, nesoustředěnost a ospalost hned po probuzení."
            ],
            science: [
                "**Běžné formy:** Soli (oxidy, sulfáty) tělo pozná jako „kov“, dráždí žaludek a způsobují zácpu.",
                "**Chelátová vazba:** Železo je „obalené“ dvěma aminokyselinami. Tvé tělo si myslí, že jí bílkovinu, a železo tak propustí přímo do krve bez podráždění trávení."
            ],
            bonus: "Astma ti ztěžuje nadechování. Železo je složkou hemoglobinu, což je „kamion“, který ten kyslík v krvi nakládá. Bez železa i když se nadechneš, kyslík nemá na co nasednout. Se železem je každý tvůj nádech efektivnější.",
            protocol: [
                "**Dávkování:** 1 tobolka denně.",
                "**Kdy:** Ideálně ráno nalačno (cca 30 minut před snídaní).",
                "**Čím zapít:** Pouze čistou vodou.",
                "**STOP KÁVĚ/ČAJI:** Kofein blokuje vstřebávání železa až o 80 %. Kávu si dej nejdříve hodinu po polknutí železa."
            ],
            timeline: [
                { period: "1. týden", text: "Mírné zlepšení ranní energie." },
                { period: "2.–4. týden", text: "Ústup zadýchávání se a „ledových“ končetin." },
                { period: "2. měsíc", text: "Zdravější barva v obličeji a konec chronické ospalosti." }
            ]
        },
        {
            id: "zinc",
            icon: "✨",
            title: "2. Zinek",
            subtitle: "Architekt krásy a hormonů",
            product: "MOVit Energy Zinek Chelát (15 mg)",
            deficiency: [
                "**Hormonální ticho:** Libido je na nule, protože tělo nemá z čeho vyrábět pohlavní hormony.",
                "**Lámavost:** Nehty se třepí, vlasy padají a pleť vypadá unaveně a bez jasu.",
                "**Pomalé hojení:** Každý škrábanec nebo pupínek se hojí věčnost."
            ],
            science: [
                "**15 mg \"Sweet Spot\":** Přesně to, co ženské tělo potřebuje k restartu hormonální soustavy, aniž by to rozhodilo jiné minerály.",
                "**Syntéza kolagenu:** Zinek dává tvým buňkám pokyn: „Stavte kolagen!“ To vrátí tvé pleti pružnost a lesk."
            ],
            bonus: "Zinek ber vždy po jídle. Na lačný žaludek může vyvolat mírnou nevolnost, protože tělo ho chce okamžitě zpracovávat spolu s živinami."
        },
        {
            id: "magnesium",
            icon: "🌙",
            title: "3. Hořčík",
            subtitle: "Mistr klidu a regenerace",
            product: "Reflex Albion Magnesium (Bisglycinát)",
            deficiency: [
                "**Vnitřní třes:** Cítíš se v napětí, i když se nic neděje.",
                "**Špatný spánek:** I když spíš 8 hodin, probudíš se zmlácená. Mozek se v noci „nevypne“.",
                "**Svalové křeče:** Cukání v oku nebo křeče v lýtkách."
            ],
            science: [
                "**Bisglycinát:** Hořčík navázaný na aminokyselinu glycin. Glycin je v mozku přirozený „uklidňovák“.",
                "**Uvolnění průdušek:** Pro astmatiky kritické – pomáhá dýchat volněji během spánku."
            ],
            bonus: "Ber 2-3 kapsle cca 45 min před spaním. Je to signál pro systém, že „šichta skončila“."
        }
    ],
    manual: [
        { time: "RÁNO (Nalačno)", title: "1x Železo", detail: "Zapij vodou s citronem. Kávu si dej nejdřív za hodinu!" },
        { time: "PO OBĚDĚ", title: "1x Zinek", detail: "Musíš mít něco v žaludku. Pomůže to vytáhnout živiny." },
        { time: "VEČER", title: "2-3x Hořčík", detail: "Tvůj lístek do říše snů cca 45 min před spaním." },
        { time: "NEDĚLE", title: "1x Vitamín D3", detail: "S nejtučnějším jídlem (vejce, ořechy, ryba)." }
    ],
    timeline: [
        {
            period: "PO 3 DNECH",
            text: "**Nervový restart 🧠**\nCo se děje: Hořčík (bisglycinát) začíná sytit tvou centrální nervovou soustavu a modulovat hladinu GABA v mozku.\n\nPocit: „Tichá mysl“. Usínání přestává být bojem s myšlenkami. Ráno se budíš bez pocitu „přejetého kamionu“, protože tvůj spánek konečně dosahuje hlubokých regeneračních fází.\n\nBonus: První známky uvolnění svalového napětí a mírnější reakce na stres."
        },
        {
            period: "PO 14 DNECH",
            text: "**Kyslíková vlna 🌬️**\nCo se děje: Železo začíná budovat nové červené krvinky. Hořčík stabilizuje hladké svalstvo kolem tvých průdušek.\n\nPocit: „Lehký dech“. Schody už nejsou tvůj nepřítel. Při cvičení cítíš, že se nezadýcháš tak rychle jako dřív. Krev začíná efektivně rozvážet kyslík i do okrajových částí těla – tvé ruce a nohy začínají hřát.\n\nBonus: Mizí odpolední propady energie, kdy jsi dřív „vypínala“."
        },
        {
            period: "PO 1 MĚSÍCI",
            text: "**Hormonální renesance ✨**\nCo se děje: Zinek opravil „čtení“ tvé DNA a nastartoval syntézu kolagenu a pohlavních hormonů. Železo (ferritin) se dostává ze zóny ohrožení.\n\nPocit: „Glow-up fáze“. Okolí si všímá, že už nejsi bledá. Tvá pleť se čistí, rány se hojí rychleji a vlasy přestávají zůstávat v hřebenu.\n\nKlíčový zlom: Tvé tělo oficiálně vypíná úsporný režim. Vrací se libido a chuť do života, protože tvá biologie už se necítí v ohrožení."
        },
        {
            period: "PO 2 MĚSÍCÍCH",
            text: "**Biologické mistrovství 🛡️**\nCo se děje: Tvé zásobní sklady (ferritin nad 50 ng/ml) jsou stabilizované. Tělo funguje v plném výkonu.\n\nPocit: „Nová norma“. Stav, kdy máš energii od rána do večera, se stává tvým standardem. Tvé astma je pod kontrolou díky silné imunitě a uvolněným dýchacím cestám.\n\nVýsledek: Už nejsi v módu „přežít den“, ale v módu „ovládnout den“. Tvá biologie je tvým spojencem, ne brzdou."
        }
    ],
    scienceSections: [
        {
            supplementId: "iron",
            title: "VĚDECKÁ DATA: Železo a tvůj organismus",
            intro: "V této sekci najdeš konkrétní data a klinické studie, které vysvětlují, proč je suplementace železa v chelátové formě klíčem k tvé regeneraci. Železo není jen „minerál“ – je to základní prvek, který rozhoduje o tom, jestli tvé tělo pojede v úsporném režimu, nebo bude mít dostatek energie na regeneraci pleti, vlasů a hormonů.",
            items: [
                { id: 1, title: "Konec chronické únavy (i bez anémie)", text: "Mnoho lidí žije v domnění, že železo je potřeba řešit až při vážné chudokrevnosti. Věda však ukazuje, že i mírný pokles zásob železa (hladina ferritinu) dramaticky ovlivňuje kvalitu života.", result: "Pravidelné doplňování železa vedlo k 48% snížení skóre únavy. Tělo přestalo „hladovět“ po kyslíku na buněčné úrovni.", source: "(Zdroj: Vaucher, P., et al., CMAJ)" },
                { id: 2, title: "Maximální vstřebatelnost (Bisglycinát vs. solné formy)", text: "Forma bisglycinátu železnatého (chelát), kterou užíváš, byla vyvinuta pro maximální šetrnost a efektivitu.", result: "Tato forma vykazuje 2× až 4× vyšší absorpci (vstřebatelnost) než běžně prodávané soli železa (oxidy, sulfáty). Chelátová vazba je neutrální, takže železo „proklouzne“ trávicím traktem bez podráždění.", source: "(Zdroj: Layrisse, M., et al., Nutrition)" },
                { id: 3, title: "Fyzický výkon a dýchání", text: "Železo je jádrem hemoglobinu – proteinu, který rozváží kyslík. Pro organismus s astmatem je každá molekula železa kriticky důležitá pro efektivní dýchání.", result: "Optimalizace hladiny železa vedla k 25% nárůstu aerobní kapacity a výraznému snížení tepové frekvence při tréninku. Svaly a plíce pracují s mnohem menším úsilím.", source: "(Zdroj: Burden, R. J., et al., British Journal of Sports Medicine)" },
                { id: 4, title: "Kognitivní funkce: \"Brain Fog\" je minulostí", text: "Železo je nezbytné pro syntézu dopaminu a okysličení mozkové tkáně.", result: "Ženy se srovnanou hladinou železa vykazují v testech pozornosti a paměti o 20 % vyšší rychlost zpracování informací a lepší soustředění.", source: "(Zdroj: Murray-Kolb, L. E., American Journal of Clinical Nutrition)" },
                { id: 5, title: "Synergie s Vitamínem C", text: "Tvá suplementace je navržena tak, aby využila tzv. „synergický efekt“.", result: "Přidání 150 mg vitamínu C zvyšuje absorpci rostlinného železa o více než 300 %. Vitamín C mění železo do formy, která je pro tvé buňky okamžitě využitelná.", source: "(Zdroj: Hallberg, L., et al., Int. J. Vitam. Nutr. Res.)" },
                { id: 6, title: "Revoluce v dávkování: Méně je někdy více", text: "Dlouho se věřilo, že železo se musí brát denně. Moderní výzkum však odhalil hormonálního „strážce“ jménem hepcidin.", result: "Hladina hepcidinu po dávce stoupne na 24h a blokuje další vstřebávání. Braní železa obden může zvýšit absorpci o 34–40 % a snížit vedlejší účinky.", source: "(Zdroj: Stoffel et al., The Lancet Haematology)" },
                { id: 7, title: "\"Normální\" hladina v krvi vs. Funkční optimum", text: "Laboratorní tabulky mají široké rozmezí (např. ferritin 20–300 µg/l). To, že jsi „v normě“, neznamená, že máš dostatek pro špičkový výkon.", result: "Pro optimální energii a stop padání vlasů se ve funkční medicíně doporučuje hladina 50–100 µg/l. Pokud jsi na spodní hranici, tvoje tělo už vnímá deficit.", source: "(Zdroj: Functional Medicine Analysis)" },
                { id: 8, title: "Pozor na „zloděje“ železa: Vápník, káva a čaj", text: "Některé látky vytvářejí se železem nerozpustné komplexy a brání jeho vstřebání. Mezi největší inhibitory patří vápník a taniny.", result: "Káva nebo čaj ihned po jídle mohou snížit absorpci železa až o 60–90 %. Železo doplňuj s odstupem alespoň 2 hodin od mléčných výrobků a kofeinu.", source: "(Zdroj: Hurrell, R., et al., American Journal of Clinical Nutrition)" },
                { id: 9, title: "Chemie synergie: Vitamín C jako katalyzátor", text: "Kyselina askorbová je „klíč“, který mění chemii železa tak, aby ho tvé střevo dokázalo uchopit.", result: "Vitamín C redukuje trojmocné železo ($Fe^{3+}$) na dvojmocné ($Fe^{2+}$), které je pro buňky mnohem snadnější vstřebat. Zvyšuje absorpci až čtyřnásobně.", source: "(Zdroj: AJCN)" },
                { id: 10, title: "Sport a mechanický úbytek (\"Foot-strike\")", text: "Protože pravidelně cvičíš, musíš vědět, že sport železo nejen spotřebovává, ale aktivně „vylučuje“.", result: "Při tvrdších dopadech (běh, skoky) dochází k mechanickému poškození krvinek (hemolýza). Železo doplňuj buď ráno, nebo až několik hodin po tréninku.", source: "(Zdroj: Schena et al.)" }
            ]
        },
        {
            supplementId: "zinc",
            title: "VĚDECKÁ DATA: Zinek a tvůj hormonální upgrade",
            intro: "Zinek je v tvém těle „šéfem logistiky a výstavby“. Jako kofaktor ovládá přes 300 enzymatických procesů a je přímo zodpovědný za to, jak tvé tělo čte tvou DNA a staví podle ní nové tkáně (kůži, vlasy) a hormony (libido, náladu).",
            items: [
                { id: 1, title: "Hormonální restart a obnova libida", text: "Zinek hraje kritickou roli v ose hypothalamus-hypofýza-vaječníky. Bez dostatečné hladiny zinku tvůj endokrinní systém „utichne“, aby šetřil zdroje.", result: "U žen se středním deficitem vedla suplementace k výraznému zvýšení hladiny volného testosteronu a estrogenu, což přímo souvisí s obnovou libida a celkové vitality.", source: "(Zdroj: Kilic, M., et al., Neuro Endocrinology Letters)" },
                { id: 2, title: "STOP padání vlasů a zpevnění keratinu", text: "Tvé vlasy a nehty jsou tvořeny keratinem. Zinek je klíčový minerál, který drží strukturu keratinu pohromadě.", result: "Optimalizace hladiny zinku vedla k 40–60% snížení intenzity vypadávání vlasů a k prokazatelném zpevnění nehtové ploténky už po 12 týdnech.", source: "(Zdroj: Park, H., et al., Annals of Dermatology)" },
                { id: 3, title: "Čistá pleť a syntéza kolagenu", text: "Zinek funguje jako vnitřní „zklidňovač“ zánětů. Reguluje aktivitu mazových žláz a urychluje hojení tkání.", result: "Skupina doplňující zinek vykazovala o 50 % méně zánětlivých projevů na pleti. Zinek navíc stimuluje fibroblasty k tvorbě kolagenu, což navrací pružnost.", source: "(Zdroj: Dreno, B., et al., European Journal of Dermatology)" },
                { id: 4, title: "Maximální tolerance: Proč právě Bisglycinát?", text: "Většina levných zinků v lékárnách dráždí žaludek. Forma chelátu v tvé aplikaci tento problém řeší.", result: "Bisglycinát zinečnatý je identifikován jako aminokyselina, zajistí vynikající toleranci bez potíží. O 43 % vyšší absorpce než u běžného oxidu.", source: "(Zdroj: Gandia, P., et al., International Journal of Vitamin and Nutrition Research)" },
                { id: 5, title: "Imunitní štít (Důležité pro tvé plíce)", text: "Pro astmatiky je jakákoliv infekce riziková. Zinek je nezbytný pro bílé krvinky.", result: "Pravidelná suplementace zinkem zkracuje trvání virových onemocnění o 33 % a snižuje riziko zánětů dýchacích cest.", source: "(Zdroj: Prasad, A. S., et al., American Journal of Clinical Nutrition)" },
                { id: 6, title: "Souboj o trůn: Zinek vs. Měď", text: "Jedním z nejvíce přehlížených faktů je antagonismus mezi zinkem a mědí. Zinek stimuluje protein, který na sebe váže měď.", result: "Dlouhodobý příjem nad 50 mg může vést k deficitu mědi a anémii. Ideální poměr by měl být zhruba 15:1 ve prospěch zinku.", source: "(Zdroj: Kilic, M., et al., Neuro Endocrinology Letters)" },
                { id: 7, title: "Záchrana pro pleť: Účinnost jako antibiotika", text: "Zinek ($Zn^{2+}$) je hvězdou u hormonálního akné. Snižuje produkci mazu a tlumí enzym DHT.", result: "Snížil počet zánětlivých lézí o 50 % během 12 týdnů. Na rozdíl od antibiotik nenarušuje mikrobiom a nevyvolává rezistenci.", source: "(Zdroj: Dermatologic Therapy)" },
                { id: 8, title: "Zinek a PMS: Konec křečím a špatné náladě", text: "Zinek hraje roli v neuroplasticitě a regulaci zánětu během cyklu. Zvyšuje hladinu mozkového faktoru BDNF.", result: "Významně snižuje skóre deprese a úzkosti spojené s cyklem. Díky protizánětlivým účinkům zmírňuje i menstruační křeče.", source: "(Zdroj: Journal of Obstetrics and Gynaecology)" },
                { id: 9, title: "PCOS a inzulínová rezistence", text: "U žen s PCOS je zinek často kriticky nízký. Jeho doplnění zlepšuje inzulínovou senzitivitu o 15–20 %.", result: "Snižuje hladinu cholesterolu, nadměrné ochlupení (hirsutismus) a vypadávání vlasů tím, že reguluje androgeny.", source: "(Zdroj: Biological Trace Element Research)" },
                { id: 10, title: "Rostlinná strava a \"fytátová past\"", text: "Rostlinné zdroje obsahují fytáty, které se zinkem tvoří nerozpustné komplexy. Tabulkové hodnoty pro vegany neplatí.", result: "Fytáty snižují absorpci až o 50 %. Ženy na rostlinné stravě by měly zvýšit příjem o polovinu nebo volit odolný bisglycinát.", source: "(Zdroj: WHO)" }
            ]
        },
        {
            supplementId: "magnesium",
            title: "VĚDECKÁ DATA: Hořčík – Klíč k hlubokému spánku a volnému dechu",
            intro: "Hořčík je v tvém těle „hlavním manažerem relaxace“. Podílí se na více než 600 biochemických reakcích. Pro tebe je naprosto zásadní ze dvou důvodů: jako přirozený „uvolňovač“ průdušek při astmatu a jako „vypínač“ stresu, který tvému tělu dovolí konečně regenerovat.",
            items: [
                { id: 1, title: "Průdušky a dýchání (Astma protokol)", text: "Hořčík funguje jako fyziologický blokátor vápníkových kanálů. Co to znamená? Vápník svaly stahuje (křeč), hořčík je uvolňuje.", result: "Pravidelná suplementace hořčíkem prokázala schopnost snížit reaktivitu průdušek a vedla až k 40% snížení potřeby používat úlevové inhalátory. Pomáhá udržet hladké svalstvo uvolněné.", source: "(Zdroj: Kazaks, A. G., et al., Journal of Asthma)" },
                { id: 2, title: "Architektura spánku a Melatonin", text: "Tvůj hořčík je ve formě bisglycinátu (vazba na glycin). Glycin připravuje tvůj mozek na spánek jako inhibiční neurotransmiter.", result: "Zvyšuje hladinu GABA (brzda úzkosti). Studie potvrzují zkrácení doby usínání o 15–20 minut a výrazné zvýšení kvality hlubokého spánku (NREM 3).", source: "(Zdroj: Abbasi, B., et al., Journal of Research in Medical Sciences)" },
                { id: 3, title: "Kortizol vs. Tvůj endokrinní systém", text: "Stres a fyzická zátěž raketově zvyšují spotřebu hořčíku. Když hořčík dojde, tělo začne produkovat nadbytek kortizolu (stresového hormonu).", result: "Vysoký kortizol blokuje produkci pohlavních hormonů. Optimalizace hladiny hořčíku dává tělu signál bezpečí a umožňuje investovat energii do nálady a sexuality.", source: "(Zdroj: Held, K., et al., Pharmacopsychiatry)" },
                { id: 4, title: "Proč Albion Bisglycinát? (Vstřebatelnost)", text: "Většina hořčíků z lékáren (oxid, citrát) má buď mizivou vstřebatelnost, nebo způsobuje zažívací potíže.", result: "Zatímco oxid má vstřebatelnost kolem 4 %, patentovaná forma Albion Bisglycinát dosahuje maximální biologické dostupnosti bez podráždění střev.", source: "(Zdroj: Schuette, S. A., et al., JPEN)" },
                { id: 5, title: "Bez hořčíku je Vitamín D jen „mrtvý“ pasažér", text: "Mnoho žen doplňuje v zimě vitamín D, ale často bez výsledku. Enzymy, které metabolizují vitamín D v játrech a ledvinách, jsou totiž závislé na hořčíku.", result: "Bez dostatečného hořčíku zůstává vitamín D v neaktivní formě. Suplementace hořčíkem dokáže hladinu vitamínu D „vytáhnout“ nahoru i bez zvyšování jeho vlastních dávek.", source: "(Zdroj: The American Journal of Clinical Nutrition, 2018)" },
                { id: 6, title: "Přírodní „antidepresivum“ a tlumič kortizolu", text: "Hořčík funguje jako „vrátný“ u NMDA receptorů v mozku a blokuje přílišné vzrušení neuronů glutamátem. Při nedostatku jsou neurony „přebuzené“, což cítíme jako úzkost.", result: "Forma bisglycinátu snižuje hladinu ranního kortizolu a výrazně zlepšuje kvalitu hlubokého spánku u žen v chronickém stresu. Je to v podstatě „tekutá meditace“.", source: "(Zdroj: Journal of Nutrients)" },
                { id: 7, title: "Záchranný kruh při PMS a menstruačních křečích", text: "Hořčík uvolňuje svaly (myorelaxans) a tlumí produkci prostaglandinů, které jsou hlavními viníky bolestivých stahů dělohy a otoků prsou.", result: "Pravidelné doplňování vede k poklesu zadržování vody a ústupu křečí. V kombinaci s vitamínem B6 je efekt na psychickou pohodu během PMS ještě výraznější.", source: "(Zdroj: Journal of Caring Sciences)" },
                { id: 8, title: "Migrény a hormonální bouře", text: "Během migrény (zejména té vázané na pokles estrogenu v cyklu) hladina hořčíku v mozku dramaticky klesá, což zvyšuje citlivost na bolest.", result: "Suplementace 400–600 mg hořčíku denně dokáže snížit frekvenci migrenózních záchvatů až o 41 %, čímž konkuruje některým lékům bez vedlejších účinků.", source: "(Zdroj: Americká neurologická akademie (AAN))" },
                { id: 9, title: "„Magnesium Burn Rate“ – Proč ho máš stále málo?", text: "U hořčíku neplatí jen to, kolik ho sníš, ale jak rychle ho vlivem stresu, kávy nebo sportu „spálíš“. Ženy mají míru spotřeby hořčíku (Burn Rate) přirozeně vyšší.", result: "Chronický stres doslova vyplavuje hořčík močí. Cvičením ztrácíš 10–20 % denní dávky. Káva a alkohol fungují jako diuretika, která hořčík z těla vyhání.", source: "(Zdroj: Magnesium Stress Study)" }
            ]
        }
    ]
};

let isEditMode = false;

export async function renderRegenerace() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    // Load data if not already loaded
    await ensureRegeneraceData();
    // Merge stored data with DEFAULT_CONTENT to ensure new fields (like scienceSections) are present
    const content = state.regeneraceContent ? {
        ...DEFAULT_CONTENT,
        ...state.regeneraceContent,
        // Upgrade legacy scienceStudies (object) to scienceSections (array)
        scienceSections: (state.regeneraceContent.scienceSections && state.regeneraceContent.scienceSections.length > 0)
            ? state.regeneraceContent.scienceSections
            : (state.regeneraceContent.scienceStudies ? [state.regeneraceContent.scienceStudies] : DEFAULT_CONTENT.scienceSections)
    } : DEFAULT_CONTENT;

    if (isEditMode) {
        renderEditor(container, content);
    } else {
        renderView(container, content);
    }
}

const SUPPLEMENT_THEMES = {
    iron: {
        bg: 'from-[#2a1111] to-[#1a0a0a]',
        border: 'border-red-500/20',
        accent: 'text-red-400',
        iconBg: 'bg-red-500/10',
        benefit: 'from-red-500/20 to-transparent',
        benefitBorder: 'border-red-500',
        benefitText: 'text-red-400',
        dot: 'bg-red-400',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]'
    },
    zinc: {
        bg: 'from-[#2a2411] to-[#1a160a]',
        border: 'border-yellow-500/20',
        accent: 'text-yellow-400',
        iconBg: 'bg-yellow-500/10',
        benefit: 'from-yellow-500/20 to-transparent',
        benefitBorder: 'border-yellow-500',
        benefitText: 'text-yellow-400',
        dot: 'bg-yellow-400',
        glow: 'shadow-[0_0_15px_rgba(234,179,8,0.1)]'
    },
    magnesium: {
        bg: 'from-[#1a112a] to-[#0f0a1a]',
        border: 'border-purple-500/20',
        accent: 'text-purple-400',
        iconBg: 'bg-purple-500/10',
        benefit: 'from-purple-500/20 to-transparent',
        benefitBorder: 'border-purple-500',
        benefitText: 'text-purple-400',
        dot: 'bg-purple-400',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]'
    },
    default: {
        bg: 'from-[#2f3136] to-[#202225]',
        border: 'border-white/5',
        accent: 'text-[#3ba55c]',
        iconBg: 'bg-white/5',
        benefit: 'from-[#3ba55c]/20 to-transparent',
        benefitBorder: 'border-[#3ba55c]',
        benefitText: 'text-[#43b581]',
        dot: 'bg-[#3ba55c]',
        glow: 'shadow-none'
    }
};

function renderView(container, content) {
    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] relative pb-28">
            
            <!-- Hero Header -->
            <div class="sticky top-0 z-50 bg-[#36393f]/90 backdrop-blur-md pb-4 pt-6 px-6 border-b border-white/5 shadow-lg">
                <div class="flex justify-between items-center w-full max-w-2xl mx-auto">
                    <div>
                        <h2 class="text-2xl font-black text-white uppercase tracking-tighter leading-tight flex items-center gap-2">
                           <i class="fas fa-leaf text-[#3ba55c]"></i> Regenerace
                        </h2>
                        <p class="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1 opacity-60 italic">Mastering your biology ✨</p>
                    </div>
                    <button onclick="window.toggleRegeneraceEdit()" class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <i class="fas fa-pen text-sm"></i>
                    </button>
                </div>
            </div>

            <div class="max-w-2xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
                
                <!-- Hero -->
                <div class="bg-gradient-to-br from-[#10002B] to-[#3C096C] rounded-[2rem] p-8 shadow-2xl border border-white/10 relative overflow-hidden">
                    <div class="absolute -top-10 -right-10 text-9xl opacity-10 select-none pointer-events-none">🔋</div>
                    <div class="relative z-10">
                        <h3 class="text-white text-xl font-black mb-3 uppercase tracking-wide">${content.hero.title}</h3>
                        <p class="text-white/90 text-[15px] leading-relaxed font-medium">${content.hero.text}</p>
                        <p class="text-white/70 text-sm leading-relaxed mt-3 font-medium">${content.hero.subtext}</p>
                    </div>
                </div>

                <!-- Supplements -->
                <div class="space-y-4">
                    ${content.supplements.map(supp => {
        const theme = SUPPLEMENT_THEMES[supp.id] || SUPPLEMENT_THEMES.default;
        return `
                        <div class="supplement-item bg-gradient-to-br ${theme.bg} rounded-2xl border ${theme.border} overflow-hidden transition-all duration-300 shadow-xl ${theme.glow}" id="supp-${supp.id}">
                            <div class="p-6 cursor-pointer flex items-center justify-between group" onclick="window.toggleSupplementDetail('${supp.id}')">
                                <div class="flex items-center gap-5">
                                    <div class="w-12 h-12 ${theme.iconBg} rounded-xl flex items-center justify-center text-3xl transition-transform group-hover:rotate-12">${supp.icon}</div>
                                    <div>
                                        <h4 class="text-white font-black uppercase text-sm tracking-widest">${supp.title}</h4>
                                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-60">${supp.subtitle}</p>
                                    </div>
                                </div>
                                <div class="text-white/20 transition-transform duration-300 transform" id="arrow-${supp.id}"><i class="fas fa-chevron-down"></i></div>
                            </div>
                            <div class="hidden px-6 pb-6 animate-slide-down" id="detail-${supp.id}">
                                <div class="pt-6 border-t border-white/5 space-y-8">
                                    
                                    <!-- 1. Highlight Benefit -->
                                    ${supp.benefit ? `
                                    <div class="bg-gradient-to-r ${theme.benefit} p-4 rounded-xl border-l-4 ${theme.benefitBorder} shadow-inner">
                                        <h5 class="text-[10px] font-black ${theme.benefitText} uppercase tracking-[0.2em] mb-1">Klíčový přínos</h5>
                                        <p class="text-white font-bold text-sm leading-relaxed">${supp.benefit}</p>
                                    </div>
                                    ` : ''}

                                    <!-- 2. Composition & Technicals -->
                                    <div class="flex flex-col gap-6">
                                        <p class="text-[10px] text-gray-500 font-black uppercase tracking-widest opacity-80 pl-1">${supp.product}</p>
                                        
                                        ${supp.composition ? `
                                        <div class="bg-black/20 rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                                            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <i class="fas fa-microscope text-4xl"></i>
                                            </div>
                                            <h5 class="text-[10px] font-black ${theme.accent} uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <i class="fas fa-vial"></i> Co najdeš v každé dávce?
                                            </h5>
                                            <div class="flex flex-col gap-3">
                                                ${supp.composition.map(c => {
                                                    const accentColor = theme.accent.replace('text-', '');
                                                    const colonIndex = c.indexOf(':');
                                                    let title = c;
                                                    let desc = '';

                                                    if (colonIndex !== -1) {
                                                        title = c.substring(0, colonIndex).replace(/\*\*/g, '').trim();
                                                        desc = c.substring(colonIndex + 1).trim();
                                                    } else {
                                                        title = c.replace(/\*\*/g, '').trim();
                                                    }

                                                    return `
                                                    <div class="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all group/item shadow-sm">
                                                        <div class="mt-1.5 w-1.5 h-1.5 rounded-full bg-${accentColor} shadow-[0_0_12px_rgba(255,255,255,0.15)] flex-shrink-0"></div>
                                                        <div class="text-[11.5px] leading-relaxed">
                                                            <span class="font-black text-white tracking-wide">${title}${desc ? ':' : ''}</span>
                                                            ${desc ? `<span class="text-white/60 font-medium ml-1">${parseMarkdown(desc)}</span>` : ''}
                                                        </div>
                                                    </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </div>
                                        ` : ''}
                                    </div>

                                    <!-- 3. The Core: Deficiency vs Science -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                                        <!-- Deficiency Column -->
                                        <div class="space-y-4">
                                            <h5 class="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <i class="fas fa-bullseye opacity-50"></i> Jak vypadá tvůj nedostatek?
                                            </h5>
                                            <div class="space-y-3">
                                                ${supp.deficiency.map(d => `
                                                    <div class="group/item flex items-start gap-3 bg-white/[0.02] hover:bg-red-500/[0.05] p-3 rounded-xl border border-white/5 hover:border-red-500/10 transition-all">
                                                        <div class="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60 group-hover/item:opacity-100 transition-opacity"></div>
                                                        <div class="text-sm text-gray-200 leading-relaxed group-hover/item:text-white transition-colors">${parseMarkdown(d)}</div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>

                                        <!-- Science Column -->
                                        <div class="space-y-4">
                                            <h5 class="text-[10px] font-black ${theme.accent} uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <i class="fas fa-atom opacity-50"></i> Proč tato forma funguje?
                                            </h5>
                                            <div class="space-y-4">
                                                <div class="text-sm text-gray-200 space-y-3 leading-relaxed">
                                                    ${supp.science.map(s => `<p class="pl-4 border-l border-white/10">${parseMarkdown(s)}</p>`).join('')}
                                                </div>
                                                <div class="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10 mt-6 relative overflow-hidden group/bonus">
                                                    <i class="fas fa-lightbulb absolute -right-3 -bottom-3 text-5xl opacity-5 group-hover/bonus:scale-110 group-hover/bonus:opacity-10 transition-all duration-700"></i>
                                                    <p class="text-xs text-indigo-200/90 leading-relaxed italic opacity-80 relative z-10">${supp.bonus}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 4. Protocol & Results -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                        <!-- Protocol -->
                                        ${supp.protocol ? `
                                        <div class="bg-amber-500/[0.03] rounded-2xl p-5 border border-amber-500/10">
                                            <h5 class="text-[10px] font-black text-[#faa61a] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <i class="fas fa-clipboard-list opacity-50"></i> Protokol užívání
                                            </h5>
                                            <div class="space-y-2">
                                                ${supp.protocol.map(p => `
                                                    <div class="flex items-center gap-3 text-sm text-gray-200">
                                                        <i class="fas fa-check text-[8px] text-[#faa61a]/60"></i>
                                                        <span>${parseMarkdown(p)}</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                        ` : ''}

                                        <!-- Timeline Roadmap -->
                                        ${supp.timeline ? `
                                        <div class="bg-black/20 rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                                            <h5 class="text-[10px] font-black ${theme.accent} uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <i class="fas fa-route opacity-50 text-xs"></i> Časová osa výsledků
                                            </h5>
                                            <div class="space-y-0 relative">
                                                <!-- Continuous Line -->
                                                <div class="absolute left-[11px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>
                                                
                                                ${supp.timeline.map((t, idx) => `
                                                    <div class="flex items-start gap-6 relative ${idx !== supp.timeline.length - 1 ? 'pb-8' : ''}">
                                                        <!-- The Node -->
                                                        <div class="mt-1 relative z-10">
                                                            <div class="w-6 h-6 rounded-lg bg-black flex items-center justify-center border border-white/10 group-hover:border-${theme.accent}/40 transition-colors">
                                                                <div class="w-2 h-2 rounded-full ${theme.dot} ${theme.glow}"></div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div class="flex flex-col">
                                                            <div class="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 mb-2 w-fit">
                                                                <span class="text-[9px] font-black text-white uppercase tracking-wider">${t.period}</span>
                                                            </div>
                                                            <span class="text-[13px] text-gray-200 font-medium leading-[1.6] transition-colors hover:text-white">${t.text}</span>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                        ` : ''}
                                    </div>

                                </div>
                            </div>
                        </div>
                        `;
    }).join('')}
                </div>

                <!-- Practical Manual -->
                <div class="space-y-6 pt-4">
                    <h3 class="text-white text-lg font-black uppercase tracking-widest flex items-center gap-3">
                        <span class="w-10 h-10 rounded-2xl bg-[#3ba55c]/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,165,92,0.1)]">🥗</span>
                        Praktický manuál pro tebe
                    </h3>
                    
                    <div class="space-y-0 relative border-l-2 border-white/5 ml-5 pl-8">
                        ${content.manual.map((m, idx) => `
                            <div class="relative group ${idx !== content.manual.length - 1 ? 'pb-8' : ''}">
                                <!-- Roadmap Node -->
                                <div class="absolute -left-[45px] top-4 w-8 h-8 rounded-xl bg-[#2f3136] border border-white/10 flex items-center justify-center z-10 shadow-xl group-hover:scale-110 transition-transform">
                                     <div class="w-2 h-2 rounded-full bg-[#3ba55c] shadow-[0_0_10px_rgba(59,165,92,0.4)]"></div>
                                </div>
                                
                                <div class="bg-gradient-to-r from-white/[0.04] to-transparent p-6 rounded-3xl border border-white/5 group-hover:border-white/10 transition-all duration-500 hover:shadow-2xl">
                                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                                        <div class="flex items-center gap-3">
                                            <span class="px-3 py-1 rounded-lg bg-[#3ba55c]/10 text-[10px] font-black text-[#3ba55c] uppercase tracking-widest border border-[#3ba55c]/20">
                                                ${m.time}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-2 opacity-50">
                                            <div class="w-1.5 h-1.5 rounded-full bg-[#3ba55c]/50 animate-pulse"></div>
                                            <span class="text-[9px] text-white font-bold uppercase tracking-widest leading-none">Status: Aktivní</span>
                                        </div>
                                    </div>
                                    <h4 class="text-white font-black text-[15px] uppercase tracking-wide mb-2">${m.title}</h4>
                                    <p class="text-sm text-gray-200 leading-relaxed font-medium group-hover:text-white transition-colors">${m.detail}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Global Roadmap (TVÁ BIOLOGICKÁ PROMĚNA) -->
                <div class="space-y-8 pt-4">
                    <h3 class="text-white text-lg font-black uppercase tracking-widest flex items-center gap-3 px-2">
                        <span class="w-10 h-10 rounded-2xl bg-[#5865f2]/20 flex items-center justify-center shadow-[0_0_15px_rgba(88,101,242,0.2)] text-base">📈</span>
                        TVÁ BIOLOGICKÁ PROMĚNA: Časová osa
                    </h3>

                    <div class="space-y-6 relative ml-2">
                        <!-- Connecting Line -->
                        <div class="absolute left-6 top-10 bottom-10 w-0.5 bg-white/5 z-0"></div>
                        
                        <!-- Dynamic Progress Line -->
                        ${(() => {
                            const now = new Date();
                            const start = new Date(REGENERACE_START_DATE);
                            const diffDays = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
                            
                            // Calculate percentage of line to fill (very approximate based on current active phase)
                            let fillPercent = 0;
                            if (diffDays > 0) {
                                if (diffDays <= 3) fillPercent = 10;
                                else if (diffDays <= 14) fillPercent = 35;
                                else if (diffDays <= 30) fillPercent = 65;
                                else fillPercent = 100;
                            }
                            
                            return `<div class="absolute left-6 top-10 bottom-10 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 z-0 transition-all duration-[2000ms]" style="height: ${fillPercent}%"></div>`;
                        })()}

                        ${content.timeline.map((t, idx) => {
        const themes = [
            { accent: 'text-purple-400', border: 'border-purple-500/20', bg: 'from-purple-500/5', icon: '🧠', shadow: 'shadow-purple-500/10' },
            { accent: 'text-blue-400', border: 'border-blue-500/20', bg: 'from-blue-500/5', icon: '🌬️', shadow: 'shadow-blue-500/10' },
            { accent: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'from-yellow-500/5', icon: '✨', shadow: 'shadow-yellow-500/10' },
            { accent: 'text-green-400', border: 'border-green-500/20', bg: 'from-green-500/5', icon: '🛡️', shadow: 'shadow-green-500/10' }
        ];
        const theme = themes[idx] || themes[0];
        const parsed = formatTimelineCard(t.text);

        // Dynamic State Logic
        const now = new Date();
        const start = new Date(REGENERACE_START_DATE);
        const diffMs = now - start;
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        
        let state = 'future'; // past, active, future
        
        // Phase Day Thresholds (logic based on content period names)
        const dayRanges = [3, 14, 30, 60];
        const currentThreshold = dayRanges[idx];
        const prevThreshold = idx > 0 ? dayRanges[idx - 1] : -1;

        if (diffMs < 0) {
            state = 'future';
        } else if (diffDays > currentThreshold) {
            state = 'past';
        } else if (diffDays > prevThreshold && diffDays <= currentThreshold) {
            state = 'active';
        }

        const isActive = state === 'active';
        const isPast = state === 'past';
        
        // Dynamic Styles
        const cardClass = isActive 
            ? `ring-2 ring-${theme.accent.replace('text-', '')}/50 shadow-[0_0_20px_rgba(255,255,255,0.05)] animate-[pulse_3s_infinite]` 
            : (isPast ? 'opacity-80' : 'opacity-60');
            
        const iconClass = isActive ? `scale-110 ${theme.shadow} border-${theme.accent.replace('text-', '')}/50` : 'opacity-50';

        return `
                            <div class="relative flex gap-6 z-10 group animate-fade-in" style="animation-delay: ${idx * 150}ms">
                                <!-- Node -->
                                <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#2f3136] border border-white/10 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500 ${iconClass}">
                                     <span class="text-2xl">${theme.icon}</span>
                                </div>

                                <!-- Card -->
                                <div class="flex-1 glass-card bg-gradient-to-br ${theme.bg} to-transparent rounded-[2rem] p-6 border ${theme.border} ${theme.shadow} space-y-5 transition-all duration-700 ${cardClass}">
                                    <div class="flex justify-between items-start">
                                        <div class="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                            <span class="text-[10px] font-black text-white uppercase tracking-widest">${t.period}</span>
                                            ${isPast ? '<i class="fas fa-check-circle text-green-500 ml-2 text-[8px]"></i>' : ''}
                                        </div>
                                    </div>

                                    <h4 class="text-white text-xl font-black uppercase tracking-tight leading-tight">${parsed.title}</h4>

                                    <div class="space-y-4 pt-2">
                                        ${parsed.sections.map(sec => `
                                            <div class="space-y-1.5 group/sec">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">${sec.label}</span>
                                                </div>
                                                <p class="text-[13px] text-gray-300 leading-relaxed font-medium group-hover/sec:text-white transition-colors">
                                                    ${sec.content}
                                                </p>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                            `;
    }).join('')}
                    </div>
                </div>

                <!-- Science Library Section -->
                ${(content.scienceSections || []).map(section => {
        const theme = SUPPLEMENT_THEMES[section.supplementId] || { accent: 'text-indigo-400', border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/10' };
        const accentColor = theme.accent.replace('text-', '');

        return `
                    <div class="pt-10 space-y-8 border-t border-white/5">
                        <div class="flex flex-col gap-3">
                            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${accentColor}/10 border border-${accentColor}/20 w-fit">
                                <span class="w-2 h-2 rounded-full bg-${accentColor} animate-pulse"></span>
                                <span class="text-[9px] font-black text-${accentColor} uppercase tracking-[0.2em] opacity-80">Klinicky ověřeno</span>
                            </div>
                            <h3 class="text-white text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <i class="fas fa-microscope text-${accentColor}"></i> ${section.title}
                            </h3>
                            <p class="text-sm text-gray-400 leading-relaxed max-w-xl font-medium italic opacity-80">${section.intro}</p>
                        </div>

                        <div class="space-y-6">
                            ${section.items.map(item => `
                                <div class="bg-gradient-to-br from-[#2f3136]/50 to-transparent p-6 rounded-3xl border border-white/5 hover:border-${accentColor}/20 transition-all duration-300 group">
                                    <div class="flex items-start gap-5">
                                        <div class="w-10 h-10 rounded-2xl bg-${accentColor}/5 flex items-center justify-center text-${accentColor} font-black text-lg border border-${accentColor}/10 group-hover:bg-${accentColor}/10 transition-colors">
                                            ${item.id}
                                        </div>
                                        <div class="flex-1 space-y-3">
                                            <h4 class="text-white font-black text-base uppercase tracking-wide leading-tight group-hover:text-${accentColor} transition-colors">${item.title}</h4>
                                            <p class="text-sm text-gray-300 leading-relaxed font-medium">${item.text}</p>
                                            <div class="bg-${accentColor}/5 p-4 rounded-2xl border-l-2 border-${accentColor}/30">
                                                <p class="text-sm text-gray-200 font-bold leading-relaxed">${item.result}</p>
                                            </div>
                                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest pt-2">${item.source}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    `;
    }).join('')}

            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderEditor(container, content) {
    const html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] relative pb-32">
            <!-- Header -->
            <div class="sticky top-0 z-50 bg-[#36393f] pb-4 pt-6 px-6 border-b border-white/10 shadow-lg">
                <div class="flex justify-between items-center w-full max-w-2xl mx-auto">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter">Editor Regenerace</h2>
                    <div class="flex gap-2">
                        <button onclick="window.toggleRegeneraceEdit()" class="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all">Zrušit</button>
                        <button onclick="window.saveRegeneraceContent()" class="px-6 py-2 rounded-xl text-xs font-black bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/20 hover:scale-105 transition-all">Uložit vše</button>
                    </div>
                </div>
            </div>

            <div class="max-w-2xl mx-auto px-4 py-8 space-y-12" id="regenerace-editor-form">
                
                <!-- Hero Section -->
                <section class="space-y-4">
                    <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-widest border-l-2 border-[#5865f2] pl-3">Úvodní karta</h3>
                    <div class="space-y-3">
                        <input type="text" id="edit-hero-title" value="${content.hero.title}" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#5865f2] transition-all">
                        <textarea id="edit-hero-text" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-[#5865f2] transition-all h-24">${content.hero.text}</textarea>
                        <textarea id="edit-hero-subtext" class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-[#5865f2] transition-all h-20">${content.hero.subtext}</textarea>
                    </div>
                </section>

                <!-- Supplements Sections -->
                ${content.supplements.map((supp, index) => `
                    <section class="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                        <div class="flex items-center gap-3 mb-4">
                            <input type="text" id="edit-supp-icon-${index}" value="${supp.icon}" class="w-12 bg-black/20 border border-white/10 rounded-xl p-2 text-center text-xl">
                            <input type="text" id="edit-supp-title-${index}" value="${supp.title}" class="flex-1 bg-black/20 border border-white/10 rounded-xl p-2 text-white font-bold uppercase tracking-widest">
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Podnadpis & Produkt</label>
                                <input type="text" id="edit-supp-subtitle-${index}" value="${supp.subtitle}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 mb-2">
                                <input type="text" id="edit-supp-product-${index}" value="${supp.product}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-[11px] text-gray-400">
                            </div>

                            <div>
                                <label class="text-[9px] font-black text-[#3ba55c] uppercase tracking-widest ml-1 mb-1 block">Klíčový přínos (Krátký text)</label>
                                <input type="text" id="edit-supp-benefit-${index}" value="${supp.benefit || ''}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300">
                            </div>

                            <div>
                                <label class="text-[9px] font-black text-yellow-400 uppercase tracking-widest ml-1 mb-1 block">Složení produktu (každý na nový řádek)</label>
                                <textarea id="edit-supp-composition-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-24">${(supp.composition || []).join('\n')}</textarea>
                            </div>

                            <div>
                                <label class="text-[9px] font-black text-red-400 uppercase tracking-widest ml-1 mb-1 block">Symptomy nedostatku (každý na nový řádek)</label>
                                <textarea id="edit-supp-deficiency-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-32">${supp.deficiency.join('\n')}</textarea>
                            </div>

                            <div>
                                <label class="text-[9px] font-black text-[#5865f2] uppercase tracking-widest ml-1 mb-1 block">Proč to funguje / Věda (každý na nový řádek)</label>
                                <textarea id="edit-supp-science-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-32">${supp.science.join('\n')}</textarea>
                            </div>

                            <div>
                                <label class="text-[9px] font-black text-[#faa61a] uppercase tracking-widest ml-1 mb-1 block">Dávkování / Protokol (každý na nový řádek)</label>
                                <textarea id="edit-supp-protocol-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-300 h-24">${(supp.protocol || []).join('\n')}</textarea>
                            </div>

                            <div>
                                <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Bonus / Timing Poznámka</label>
                                <textarea id="edit-supp-bonus-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-gray-300 italic h-20">${supp.bonus}</textarea>
                            </div>

                            <div>
                                <label class="text-[9px] font-black text-[#3ba55c] uppercase tracking-widest ml-1 mb-1 block">Specifická časová osa (period:text, jeden na řádek)</label>
                                <textarea id="edit-supp-timeline-${index}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-gray-300 h-24">${(supp.timeline || []).map(t => `${t.period}:${t.text}`).join('\n')}</textarea>
                            </div>
                        </div>
                    </section>
                `).join('')}

                <!-- Manual Editor -->
                <section class="space-y-4">
                    <h3 class="text-[10px] font-black text-gray-500 uppercase tracking-widest border-l-2 border-[#3ba55c] pl-3">Denní manuál</h3>
                    <div class="grid grid-cols-1 gap-4">
                        ${content.manual.map((m, index) => `
                            <div class="bg-white/5 p-4 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input type="text" id="edit-manual-time-${index}" value="${m.time}" class="bg-black/20 border border-white/10 rounded-lg p-2 text-[10px] text-gray-400 font-bold uppercase">
                                <input type="text" id="edit-manual-title-${index}" value="${m.title}" class="bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white font-bold">
                                <input type="text" id="edit-manual-detail-${index}" value="${m.detail}" class="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-gray-300">
                            </div>
                        `).join('')}
                    </div>
                </section>

                <!-- Science Sections Editor -->
                <section class="space-y-12 pt-10 border-t-2 border-white/5">
                    <h3 class="text-white text-lg font-black uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-microscope text-indigo-400"></i> Vědecká Knihovna
                    </h3>
                    
                    <div class="space-y-16">
                        ${(content.scienceSections || []).map((section, sIdx) => `
                            <div class="space-y-6 p-8 bg-black/20 rounded-[2.5rem] border border-white/5 relative">
                                <div class="absolute -top-4 left-8 px-4 py-1 bg-indigo-500 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">
                                    Kapitola: ${section.supplementId.toUpperCase()}
                                </div>

                                <div class="space-y-4">
                                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nadpis kapitoly</label>
                                    <input type="text" id="edit-science-section-${sIdx}-title" value="${section.title}" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500 transition-all">
                                    
                                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block mt-4">Úvodní text</label>
                                    <textarea id="edit-science-section-${sIdx}-intro" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-indigo-500 transition-all h-28">${section.intro}</textarea>
                                </div>
                                
                                <div class="space-y-8 pt-6">
                                    ${section.items.map((item, iIdx) => `
                                        <div class="bg-[#2f3136] p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl">
                                            <div class="flex items-center justify-between">
                                                <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Studie #${item.id}</span>
                                            </div>
                                            
                                            <div class="space-y-3">
                                                <input type="text" id="edit-science-section-${sIdx}-item-${iIdx}-title" value="${item.title}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white font-black uppercase text-xs">
                                                <textarea id="edit-science-section-${sIdx}-item-${iIdx}-text" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-gray-300 text-sm h-24">${item.text}</textarea>
                                                <textarea id="edit-science-section-${sIdx}-item-${iIdx}-result" class="w-full bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-white font-bold text-sm h-24">${item.result}</textarea>
                                                <input type="text" id="edit-science-section-${sIdx}-item-${iIdx}-source" value="${item.source}" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>

            </div>
        </div>
    `;

    container.innerHTML = html;
    setTimeout(setupEditorShortcuts, 50);
}

// Helper: Simple Markdown Parser (Bold only for now)
function parseMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        .replace(/_(.*?)_/g, '<em class="italic opacity-90">$1</em>')
        .replace(/\n/g, '<br>');
}

function formatTimelineCard(text) {
    const lines = text.split('\n');
    let title = '';
    let sections = [];

    // The first line is usually the title in **...**
    if (lines[0] && lines[0].startsWith('**')) {
        title = lines[0].replace(/\*\*/g, '').trim();
        lines.shift();
    }

    let currentSection = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let label = '';
        let content = '';

        if (trimmed.startsWith('Co se děje:')) {
            label = '🔬 MECHANISMUS';
            content = trimmed.replace('Co se děje:', '').trim();
        } else if (trimmed.startsWith('Pocit:')) {
            label = '🧘 TVŮJ POCIT';
            content = trimmed.replace('Pocit:', '').trim();
        } else if (trimmed.startsWith('Bonus:')) {
            label = '🎁 BONUS';
            content = trimmed.replace('Bonus:', '').trim();
        } else if (trimmed.startsWith('Výsledek:')) {
            label = '⚡ VÝSLEDEK';
            content = trimmed.replace('Výsledek:', '').trim();
        } else if (trimmed.startsWith('Klíčový zlom:')) {
            label = '🔑 KLÍČOVÝ ZLOM';
            content = trimmed.replace('Klíčový zlom:', '').trim();
        }

        if (label) {
            sections.push({ label, content });
        } else if (sections.length > 0) {
            // Append to previous if no new label found
            sections[sections.length - 1].content += ' ' + trimmed;
        }
    });

    return { title, sections };
}

// Global Interactivity
window.toggleRegeneraceEdit = () => {
    triggerHaptic('medium');
    isEditMode = !isEditMode;
    renderRegenerace();
};

window.toggleSupplementDetail = (id) => {
    triggerHaptic('light');
    const detail = document.getElementById(`detail-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    const card = document.getElementById(`supp-${id}`);

    if (!detail) return;
    const isOpen = !detail.classList.contains('hidden');

    document.querySelectorAll('[id^="detail-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="arrow-"]').forEach(el => el.classList.remove('rotate-180'));
    document.querySelectorAll('.supplement-item').forEach(el => el.classList.remove('ring-2', 'ring-[#5865f2]/50', 'bg-[#3b3e44]'));

    if (!isOpen) {
        detail.classList.remove('hidden');
        arrow.classList.add('rotate-180');
        card.classList.add('ring-2', 'ring-[#5865f2]/50', 'bg-[#3b3e44]');
    }
};

// --- EDITOR SHORTCUTS ---
function setupEditorShortcuts() {
    const form = document.getElementById('regenerace-editor-form');
    if (!form) return;

    // Use a single listener for the whole form (delegation)
    form.onkeydown = (e) => {
        const el = e.target;
        const isInput = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text');

        if (isInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();

            const start = el.selectionStart;
            const end = el.selectionEnd;
            const text = el.value;
            const selectedText = text.substring(start, end);

            // Wrap with **
            const newText = text.substring(0, start) + '**' + selectedText + '**' + text.substring(end);
            el.value = newText;

            // Reset selection and focus
            el.focus();
            el.selectionStart = start + 2;
            el.selectionEnd = end + 2;

            triggerHaptic('light');
        }
    };
}

window.saveRegeneraceContent = async () => {
    triggerHaptic('success');

    // Upgrade/Normalize logic before save to prevent data loss
    const currentData = state.regeneraceContent || DEFAULT_CONTENT;
    const content = {
        ...currentData,
        scienceSections: (currentData.scienceSections && currentData.scienceSections.length > 0)
            ? currentData.scienceSections
            : (currentData.scienceStudies ? [currentData.scienceStudies] : DEFAULT_CONTENT.scienceSections)
    };

    // Aggregate data from inputs
    const newContent = {
        hero: {
            title: document.getElementById('edit-hero-title').value,
            text: document.getElementById('edit-hero-text').value,
            subtext: document.getElementById('edit-hero-subtext').value
        },
        supplements: content.supplements.map((supp, i) => ({
            id: supp.id,
            icon: document.getElementById(`edit-supp-icon-${i}`).value,
            title: document.getElementById(`edit-supp-title-${i}`).value,
            subtitle: document.getElementById(`edit-supp-subtitle-${i}`).value,
            product: document.getElementById(`edit-supp-product-${i}`).value,
            benefit: document.getElementById(`edit-supp-benefit-${i}`).value,
            composition: document.getElementById(`edit-supp-composition-${i}`).value.split('\n').filter(l => l.trim()),
            deficiency: document.getElementById(`edit-supp-deficiency-${i}`).value.split('\n').filter(l => l.trim()),
            science: document.getElementById(`edit-supp-science-${i}`).value.split('\n').filter(l => l.trim()),
            protocol: document.getElementById(`edit-supp-protocol-${i}`).value.split('\n').filter(l => l.trim()),
            timeline: document.getElementById(`edit-supp-timeline-${i}`).value.split('\n').filter(l => l.trim()).map(l => {
                const [period, ...textParts] = l.split(':');
                return { period: period.trim(), text: textParts.join(':').trim() };
            }),
            bonus: document.getElementById(`edit-supp-bonus-${i}`).value
        })),
        manual: content.manual.map((m, i) => ({
            time: document.getElementById(`edit-manual-time-${i}`).value,
            title: document.getElementById(`edit-manual-title-${i}`).value,
            detail: document.getElementById(`edit-manual-detail-${i}`).value
        })),
        scienceSections: (content.scienceSections || []).map((section, sIdx) => ({
            supplementId: section.supplementId,
            title: document.getElementById(`edit-science-section-${sIdx}-title`).value,
            intro: document.getElementById(`edit-science-section-${sIdx}-intro`).value,
            items: section.items.map((item, iIdx) => ({
                id: item.id,
                title: document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-title`).value,
                text: document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-text`).value,
                result: document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-result`).value,
                source: document.getElementById(`edit-science-section-${sIdx}-item-${iIdx}-source`).value
            }))
        }))
    };

    try {
        const { error } = await supabase.from('app_knowledge').upsert({
            key: 'regenerace_manual',
            content: newContent,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (error) throw error;

        state.regeneraceContent = newContent;
        isEditMode = false;
        renderRegenerace();
        if (window.showNotification) window.showNotification('Regenerace úspěšně uložena! 🌿', 'success');
    } catch (err) {
        console.error("Save Error:", err);
        if (window.showNotification) window.showNotification('Chyba při ukládání: ' + err.message, 'error');
    }
};
