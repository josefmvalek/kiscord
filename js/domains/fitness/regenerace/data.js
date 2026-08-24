/**
 * regenerace/data.js
 * Statická data a témata pro modul Regenerace.
 * Odděleno od hlavního modulu pro přehlednost a snadnou editaci.
 */

export const REGENERACE_START_DATE = new Date('2026-04-15');

/** Barevná témata pro karty suplementů */
export const SUPPLEMENT_THEMES = {
    iron: {
        bg: 'from-[#2a1111] to-[#1a0a0a]',
        border: 'border-red-500/20',
        accent: 'text-red-400',
        iconBg: 'bg-red-500/10',
        benefit: 'from-red-500/20 to-transparent',
        benefitBorder: 'border-red-500',
        benefitText: 'text-red-400',
        dot: 'bg-red-400',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
        badge: 'bg-red-500/10 border-red-500/20 text-red-400',
        pulse: 'bg-red-400'
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
        glow: 'shadow-[0_0_30px_rgba(234,179,8,0.3)]',
        badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
        pulse: 'bg-yellow-400'
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
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
        badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        pulse: 'bg-purple-400'
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
        glow: 'shadow-[0_0_30px_rgba(255,255,255,0.1)]',
        badge: 'bg-green-500/10 border-green-500/20 text-green-400',
        pulse: 'bg-green-400'
    }
};

/** Záložní obsah pro případ, že DB je prázdná nebo offline */
export const DEFAULT_CONTENT = {
    hero: {
        title: 'Cesta z "Úsporného režimu" 💖',
        text: 'Tvoje tělo je neuvěřitelně chytrý stroj. Když mu chybí spánek, voda a "palivo" ve formě jídla, začne vypínat všechno, co není nezbytné pro přežití. Výsledkem je ta nekonečná únava, bledost a pocit, že "jen přežíváš".',
        subtext: 'Tady je tvůj plán, jak tělo zase "nasytit" kyslíkem a energií, aby se tvé buňky přestaly bát a začaly zase zářit.'
    },
    supplements: [
        {
            id: 'iron',
            icon: '🩸',
            title: '1. Železo',
            subtitle: 'Osobní logistika kyslíku',
            product: 'Pharma Activ Železo chelát (60 tobolek)',
            benefit: 'Okysličení organismu, tvorba krve a buněčná energie.',
            composition: [
                'Železo (20 mg / 142,8 % RHP): Ve špičkové formě bisglycinátu (chelát).',
                'Vitamín C (150 mg / 187,5 % RHP): Klíč k odemknutí vstřebávání železa ve střevě.',
                'Vitamín B12 (0,2 mg / 8000 % RHP): Extrémně důležitý pro vegetariány. Zodpovídá za regeneraci nervů a tvorbu červených krvinek.',
                'Kyselina listová (0,2 mg / 100 % RHP): nezbytná pro růst nových buněk.'
            ],
            deficiency: [
                '**Bledost:** Tvá kůže ztrácí barvu, protože v ní neproudí dostatek sytě rudých, okysličených krvinek.',
                '**Věčná zima:** Neustále studené ruce and nohy. Tělo stahuje teplo z periferií, aby udrželo při životě srdce a mozek.',
                '**Zadýchanávání:** I mírná chůze tě vyčerpá. Tvé plíce nestíhají zásobovat svaly kyslíkem.',
                '**Mozková mlha:** Únava, nesoustředěnost a ospalost hned po probuzení.'
            ],
            science: [
                '**Běžné formy:** Soli (oxidy, sulfáty) tělo pozná jako kov, dráždí žaludek a způsobují zácpu.',
                '**Chelátová vazba:** Železo je obalené dvěma aminokyselinami. Tvé tělo si myslí, že jí bílkovinu, a železo tak propustí přímo do krve bez podráždění trávení.'
            ],
            bonus: 'Astma ti ztěžuje nadechování. Železo je složkou hemoglobinu, což je kamion, který ten kyslík v krvi nakládá. Bez železa i když se nadechneš, kyslík nemá na co nasednout. Se železem je každý tvůj nádech efektivnější.',
            protocol: [
                '**Dávkování:** 1 tobolka denně.',
                '**Kdy:** Ideálně ráno nalačno (cca 30 minut před snídaní).',
                '**Čím zapít:** Pouze čistou vodou.',
                '**STOP KÁVĚ/ČAJI:** Kofein blokuje vstřebávání železa až o 80 %. Kávu si dej nejdříve hodinu po polknutí železa.'
            ],
            timeline: [
                { period: '1. týden', text: 'Mírné zlepšení ranní energie.' },
                { period: '2.–4. týden', text: 'Ústup zadýchávání se a ledových končetin.' },
                { period: '2. měsíc', text: 'Zdravější barva v obličeji a konec chronické ospalosti.' }
            ]
        },
        {
            id: 'zinc',
            icon: '✨',
            title: '2. Zinek',
            subtitle: 'Architekt krásy a hormonů',
            product: 'MOVit Energy Zinek Chelát (15 mg)',
            deficiency: [
                '**Hormonální ticho:** Libido je na nule, protože tělo nemá z čeho vyrábět pohlavní hormony.',
                '**Lámavost:** Nehty se třepí, vlasy padají a pleť vypadá unaveně a bez jasu.',
                '**Pomalé hojení:** Každý škrábanec nebo pupínek se hojí věčnost.'
            ],
            science: [
                '**15 mg Sweet Spot:** Přesně to, co ženské tělo potřebuje k restartu hormonální soustavy, aniž by to rozhodilo jiné minerály.',
                '**Syntéza kolagenu:** Zinek dává tvým buňkám pokyn: Stavte kolagen! To vrátí tvé pleti pružnost a lesk.'
            ],
            bonus: 'Zinek ber vždy po jídle. Na lačný žaludek může vyvolat mírnou nevolnost, protože tělo ho chce okamžitě zpracovávat spolu s živinami.'
        },
        {
            id: 'magnesium',
            icon: '🌙',
            title: '3. Hořčík',
            subtitle: 'Mistr klidu a regenerace',
            product: 'Reflex Albion Magnesium (Bisglycinát)',
            deficiency: [
                '**Vnitřní třes:** Cítíš se v napětí, i když se nic neděje.',
                '**Špatný spánek:** I když spíš 8 hodin, probudíš se zmlácená. Mozek se v noci nevypne.',
                '**Svalové křeče:** Cukání v oku nebo křeče v lýtkách.'
            ],
            science: [
                '**Bisglycinát:** Hořčík navázaný na aminokyselinu glycin. Glycin je v mozku přirozený uklidňovák.',
                '**Uvolnění průdušek:** Pro astmatiky kritické – pomáhá dýchat volněji během spánku.'
            ],
            bonus: 'Ber 2-3 kapsle cca 45 min před spaním. Je to signál pro systém, že šichta skončila.'
        }
    ],
    manual: [
        { time: 'RÁNO (Nalačno)', title: '1x Železo', detail: 'Zapij vodou s citronem. Kávu si dej nejdřív za hodinu!' },
        { time: 'PO OBĚDĚ', title: '1x Zinek', detail: 'Musíš mít něco v žaludku. Pomůže to vytáhnout živiny.' },
        { time: 'VEČER', title: '2-3x Hořčík', detail: 'Tvůj lístek do říše snů cca 45 min před spaním.' },
        { time: 'NEDĚLE', title: '1x Vitamín D3', detail: 'S nejtučnějším jídlem (vejce, ořechy, ryba).' }
    ],
    timeline: [
        {
            period: 'PO 3 DNECH',
            text: '**Nervový restart 🧠**\nCo se děje: Hořčík (bisglycinát) začíná sytit tvou centrální nervovou soustavu a modulovat hladinu GABA v mozku.\n\nPocit: Tichá mysl. Usínání přestává být bojem s myšlenkami. Ráno se budíš bez pocitu přejetého kamionu, protože tvůj spánek konečně dosahuje hlubokých regeneračních fází.\n\nBonus: První známky uvolnění svalového napětí a mírnější reakce na stres.'
        },
        {
            period: 'PO 14 DNECH',
            text: '**Kyslíková vlna 🌬️**\nCo se děje: Železo začíná budovat nové červené krvinky. Hořčík stabilizuje hladké svalstvo kolem tvých průdušek.\n\nPocit: Lehký dech. Schody už nejsou tvůj nepřítel. Při cvičení cítíš, že se nezadýcháš tak rychle jako dřív. Krev začíná efektivně rozvážet kyslík i do okrajových částí těla – tvé ruce a nohy začínají hřát.\n\nBonus: Mizí odpolední propady energie, kdy jsi dřív vypínala.'
        },
        {
            period: 'PO 1 MĚSÍCI',
            text: '**Hormonální renesance ✨**\nCo se děje: Zinek opravil čtení tvé DNA a nastartoval syntézu kolagenu a pohlavních hormonů. Železo (ferritin) se dostává ze zóny ohrožení.\n\nPocit: Glow-up fáze. Okolí si všímá, že už nejsi bledá. Tvá pleť se čistí, rány se hojí rychleji a vlasy přestávají zůstávat v hřebenu.\n\nKlíčový zlom: Tvé tělo oficiálně vypíná úsporný režim. Vrací se libido a chuť do života, protože tvá biologie už se necítí v ohrožení.'
        },
        {
            period: 'PO 2 MĚSÍCÍCH',
            text: '**Biologické mistrovství 🛡️**\nCo se děje: Tvé zásobní sklady (ferritin nad 50 ng/ml) jsou stabilizované. Tělo funguje v plném výkonu.\n\nPocit: Nová norma. Stav, kdy máš energii od rána do večera, se stává tvým standardem. Tvé astma je pod kontrolou díky silné imunitě a uvolněným dýchacím cestám.\n\nVýsledek: Už nejsi v módu přežít den, ale v módu ovládnout den. Tvá biologie je tvým spojencem, ne brzdou.'
        }
    ],
    scienceSections: [
        {
            supplementId: 'iron',
            title: 'VĚDECKÁ DATA: Železo a tvůj organismus',
            intro: 'V této sekci najdeš konkrétní data a klinické studie, které vysvětlují, proč je suplementace železa v chelátové formě klíčem k tvé regeneraci. Železo není jen minerál – je to základní prvek, který rozhoduje o tom, jestli tvé tělo pojede v úsporném režimu, nebo bude mít dostatek energie na regeneraci pleti, vlasů a hormonů.',
            items: [
                { id: 1, title: 'Konec chronické únavy (i bez anémie)', text: 'Mnoho lidí žije v domnění, že železo je potřeba řešit až při vážné chudokrevnosti. Věda však ukazuje, že i mírný pokles zásob železa (hladina ferritinu) dramaticky ovlivňuje kvalitu života.', result: 'Pravidelné doplňování železa vedlo k 48% snížení skóre únavy. Tělo přestalo hladovět po kyslíku na buněčné úrovni.', source: '(Zdroj: Vaucher, P., et al., CMAJ)' },
                { id: 2, title: 'Maximální vstřebatelnost (Bisglycinát vs. solné formy)', text: 'Forma bisglycinátu železnatého (chelát), kterou užíváš, byla vyvinuta pro maximální šetrnost a efektivitu.', result: 'Tato forma vykazuje 2× až 4× vyšší absorpci (vstřebatelnost) než běžně prodávané soli železa (oxidy, sulfáty). Chelátová vazba je neutrální, takže železo proklouzne trávicím traktem bez podráždění.', source: '(Zdroj: Layrisse, M., et al., Nutrition)' },
                { id: 3, title: 'Fyzický výkon a dýchání', text: 'Železo je jádrem hemoglobinu – proteinu, který rozváží kyslík. Pro organismus s astmatem je každá molekula železa kriticky důležitá pro efektivní dýchání.', result: 'Optimalizace hladiny železa vedla k 25% nárůstu aerobní kapacity a výraznému snížení tepové frekvence při tréninku. Svaly a plíce pracují s mnohem menším úsilím.', source: '(Zdroj: Burden, R. J., et al., British Journal of Sports Medicine)' },
                { id: 4, title: 'Kognitivní funkce: Brain Fog je minulostí', text: 'Železo je nezbytné pro syntézu dopaminu a okysličení mozkové tkáně.', result: 'Ženy se srovnanou hladinou železa vykazují v testech pozornosti a paměti o 20 % vyšší rychlost zpracování informací a lepší soustředění.', source: '(Zdroj: Murray-Kolb, L. E., American Journal of Clinical Nutrition)' },
                { id: 5, title: 'Synergie s Vitamínem C', text: 'Tvá suplementace je navržena tak, aby využila tzv. synergický efekt.', result: 'Přidání 150 mg vitamínu C zvyšuje absorpci rostlinného železa o více než 300 %. Vitamín C mění železo do formy, která je pro tvé buňky okamžitě využitelná.', source: '(Zdroj: Hallberg, L., et al., Int. J. Vitam. Nutr. Res.)' },
                { id: 6, title: 'Revoluce v dávkování: Méně je někdy více', text: 'Dlouho se věřilo, že železo se musí brát denně. Moderní výzkum však odhalil hormonálního strážce jménem hepcidin.', result: 'Hladina hepcidinu po dávce stoupne na 24h a blokuje další vstřebávání. Braní železa obden může zvýšit absorpci o 34–40 % a snížit vedlejší účinky.', source: '(Zdroj: Stoffel et al., The Lancet Haematology)' },
                { id: 7, title: 'Normální hladina v krvi vs. Funkční optimum', text: 'Laboratorní tabulky mají široké rozmezí (např. ferritin 20–300 µg/l). To, že jsi v normě, neznamená, že máš dostatek pro špičkový výkon.', result: 'Pro optimální energii a stop padání vlasů se ve funkční medicíně doporučuje hladina 50–100 µg/l. Pokud jsi na spodní hranici, tvoje tělo už vnímá deficit.', source: '(Zdroj: Functional Medicine Analysis)' },
                { id: 8, title: 'Pozor na zloděje železa: Vápník, káva a čaj', text: 'Některé látky vytvářejí se železem nerozpustné komplexy a brání jeho vstřebání. Mezi největší inhibitory patří vápník a taniny.', result: 'Káva nebo čaj ihned po jídle mohou snížit absorpci železa až o 60–90 %. Železo doplňuj s odstupem alespoň 2 hodin od mléčných výrobků a kofeinu.', source: '(Zdroj: Hurrell, R., et al., American Journal of Clinical Nutrition)' },
                { id: 9, title: 'Chemie synergie: Vitamín C jako katalyzátor', text: 'Kyselina askorbová je klíč, který mění chemii železa tak, aby ho tvé střevo dokázalo uchopit.', result: 'Vitamín C redukuje trojmocné železo (Fe³⁺) na dvojmocné (Fe²⁺), které je pro buňky mnohem snadnější vstřebat. Zvyšuje absorpci až čtyřnásobně.', source: '(Zdroj: AJCN)' },
                { id: 10, title: 'Sport a mechanický úbytek (Foot-strike)', text: 'Protože pravidelně cvičíš, musíš vědět, že sport železo nejen spotřebovává, ale aktivně vylučuje.', result: 'Při tvrdších dopadech (běh, skoky) dochází k mechanickému poškození krvinek (hemolýza). Železo doplňuj buď ráno, nebo až několik hodin po tréninku.', source: '(Zdroj: Schena et al.)' }
            ]
        },
        {
            supplementId: 'zinc',
            title: 'VĚDECKÁ DATA: Zinek a tvůj hormonální upgrade',
            intro: 'Zinek je v tvém těle šéfem logistiky a výstavby. Jako kofaktor ovládá přes 300 enzymatických procesů a je přímo zodpovědný za to, jak tvé tělo čte tvou DNA a staví podle ní nové tkáně (kůži, vlasy) a hormony (libido, náladu).',
            items: [
                { id: 1, title: 'Hormonální restart a obnova libida', text: 'Zinek hraje kritickou roli v ose hypothalamus-hypofýza-vaječníky. Bez dostatečné hladiny zinku tvůj endokrinní systém utichne, aby šetřil zdroje.', result: 'U žen se středním deficitem vedla suplementace k výraznému zvýšení hladiny volného testosteronu a estrogenu, což přímo souvisí s obnovou libida a celkové vitality.', source: '(Zdroj: Kilic, M., et al., Neuro Endocrinology Letters)' },
                { id: 2, title: 'STOP padání vlasů a zpevnění keratinu', text: 'Tvé vlasy a nehty jsou tvořeny keratinem. Zinek je klíčový minerál, který drží strukturu keratinu pohromadě.', result: 'Optimalizace hladiny zinku vedla k 40–60% snížení intenzity vypadávání vlasů a k prokazatelném zpevnění nehtové ploténky už po 12 týdnech.', source: '(Zdroj: Park, H., et al., Annals of Dermatology)' },
                { id: 3, title: 'Čistá pleť a syntéza kolagenu', text: 'Zinek funguje jako vnitřní zklidňovač zánětů. Reguluje aktivitu mazových žláz a urychluje hojení tkání.', result: 'Skupina doplňující zinek vykazovala o 50 % méně zánětlivých projevů na pleti. Zinek navíc stimuluje fibroblasty k tvorbě kolagenu, což navrací pružnost.', source: '(Zdroj: Dreno, B., et al., European Journal of Dermatology)' },
                { id: 4, title: 'Maximální tolerance: Proč právě Bisglycinát?', text: 'Většina levných zinků v lékárnách dráždí žaludek. Forma chelátu v tvé aplikaci tento problém řeší.', result: 'Bisglycinát zinečnatý je identifikován jako aminokyselina, zajistí vynikající toleranci bez potíží. O 43 % vyšší absorpce než u běžného oxidu.', source: '(Zdroj: Gandia, P., et al., International Journal of Vitamin and Nutrition Research)' },
                { id: 5, title: 'Imunitní štít (Důležité pro tvé plíce)', text: 'Pro astmatiky je jakákoliv infekce riziková. Zinek je nezbytný pro bílé krvinky.', result: 'Pravidelná suplementace zinkem zkracuje trvání virových onemocnění o 33 % a snižuje riziko zánětů dýchacích cest.', source: '(Zdroj: Prasad, A. S., et al., American Journal of Clinical Nutrition)' },
                { id: 6, title: 'Souboj o trůn: Zinek vs. Měď', text: 'Jedním z nejvíce přehlížených faktů je antagonismus mezi zinkem a mědí. Zinek stimuluje protein, který na sebe váže měď.', result: 'Dlouhodobý příjem nad 50 mg může vést k deficitu mědi a anémii. Ideální poměr by měl být zhruba 15:1 ve prospěch zinku.', source: '(Zdroj: Kilic, M., et al., Neuro Endocrinology Letters)' },
                { id: 7, title: 'Záchrana pro pleť: Účinnost jako antibiotika', text: 'Zinek (Zn²⁺) je hvězdou u hormonálního akné. Snižuje produkci mazu a tlumí enzym DHT.', result: 'Snížil počet zánětlivých lézí o 50 % během 12 týdnů. Na rozdíl od antibiotik nenarušuje mikrobiom a nevyvolává rezistenci.', source: '(Zdroj: Dermatologic Therapy)' },
                { id: 8, title: 'Zinek a PMS: Konec křečím a špatné náladě', text: 'Zinek hraje roli v neuroplasticitě a regulaci zánětu během cyklu. Zvyšuje hladinu mozkového faktoru BDNF.', result: 'Významně snižuje skóre deprese a úzkosti spojené s cyklem. Díky protizánětlivým účinkům zmírňuje i menstruační křeče.', source: '(Zdroj: Journal of Obstetrics and Gynaecology)' },
                { id: 9, title: 'PCOS a inzulínová rezistence', text: 'U žen s PCOS je zinek často kriticky nízký. Jeho doplnění zlepšuje inzulínovou senzitivitu o 15–20 %.', result: 'Snižuje hladinu cholesterolu, nadměrné ochlupení (hirsutismus) a vypadávání vlasů tím, že reguluje androgeny.', source: '(Zdroj: Biological Trace Element Research)' },
                { id: 10, title: 'Rostlinná strava a fytátová past', text: 'Rostlinné zdroje obsahují fytáty, které se zinkem tvoří nerozpustné komplexy. Tabulkové hodnoty pro vegany neplatí.', result: 'Fytáty snižují absorpci až o 50 %. Ženy na rostlinné stravě by měly zvýšit příjem o polovinu nebo volit odolný bisglycinát.', source: '(Zdroj: WHO)' }
            ]
        },
        {
            supplementId: 'magnesium',
            title: 'VĚDECKÁ DATA: Hořčík – Klíč k hlubokému spánku a volnému dechu',
            intro: 'Hořčík je v tvém těle hlavním manažerem relaxace. Podílí se na více než 600 biochemických reakcích. Pro tebe je naprosto zásadní ze dvou důvodů: jako přirozený uvolňovač průdušek při astmatu a jako vypínač stresu, který tvému tělu dovolí konečně regenerovat.',
            items: [
                { id: 1, title: 'Průdušky a dýchání (Astma protokol)', text: 'Hořčík funguje jako fyziologický blokátor vápníkových kanálů. Co to znamená? Vápník svaly stahuje (křeč), hořčík je uvolňuje.', result: 'Pravidelná suplementace hořčíkem prokázala schopnost snížit reaktivitu průdušek a vedla až k 40% snížení potřeby používat úlevové inhalátory. Pomáhá udržet hladké svalstvo uvolněné.', source: '(Zdroj: Kazaks, A. G., et al., Journal of Asthma)' },
                { id: 2, title: 'Architektura spánku a Melatonin', text: 'Tvůj hořčík je ve formě bisglycinátu (vazba na glycin). Glycin připravuje tvůj mozek na spánek jako inhibiční neurotransmiter.', result: 'Zvyšuje hladinu GABA (brzda úzkosti). Studie potvrzují zkrácení doby usínání o 15–20 minut a výrazné zvýšení kvality hlubokého spánku (NREM 3).', source: '(Zdroj: Abbasi, B., et al., Journal of Research in Medical Sciences)' },
                { id: 3, title: 'Kortizol vs. Tvůj endokrinní systém', text: 'Stres a fyzická zátěž raketově zvyšují spotřebu hořčíku. Když hořčík dojde, tělo začne produkovat nadbytek kortizolu (stresového hormonu).', result: 'Vysoký kortizol blokuje produkci pohlavních hormonů. Optimalizace hladiny hořčíku dává tělu signál bezpečí a umožňuje investovat energii do nálady a sexuality.', source: '(Zdroj: Held, K., et al., Pharmacopsychiatry)' },
                { id: 4, title: 'Proč Albion Bisglycinát? (Vstřebatelnost)', text: 'Většina hořčíků z lékáren (oxid, citrát) má buď mizivou vstřebatelnost, nebo způsobuje zažívací potíže.', result: 'Zatímco oxid má vstřebatelnost kolem 4 %, patentovaná forma Albion Bisglycinát dosahuje maximální biologické dostupnosti bez podráždění střev.', source: '(Zdroj: Schuette, S. A., et al., JPEN)' },
                { id: 5, title: 'Bez hořčíku je Vitamín D jen mrtvý pasažér', text: 'Mnoho žen doplňuje v zimě vitamín D, ale často bez výsledku. Enzymy, které metabolizují vitamín D v játrech a ledvinách, jsou totiž závislé na hořčíku.', result: 'Bez dostatečného hořčíku zůstává vitamín D v neaktivní formě. Suplementace hořčíkem dokáže hladinu vitamínu D vytáhnout nahoru i bez zvyšování jeho vlastních dávek.', source: '(Zdroj: The American Journal of Clinical Nutrition, 2018)' },
                { id: 6, title: 'Přírodní antidepresivum a tlumič kortizolu', text: 'Hořčík funguje jako vrátný u NMDA receptorů v mozku a blokuje přílišné vzrušení neuronů glutamátem. Při nedostatku jsou neurony přebuzené, což cítíme jako úzkost.', result: 'Forma bisglycinátu snižuje hladinu ranního kortizolu a výrazně zlepšuje kvalitu hlubokého spánku u žen v chronickém stresu.', source: '(Zdroj: Journal of Nutrients)' },
                { id: 7, title: 'Záchranný kruh při PMS a menstruačních křečích', text: 'Hořčík uvolňuje svaly (myorelaxans) a tlumí produkci prostaglandinů, které jsou hlavními viníky bolestivých stahů dělohy a otoků prsou.', result: 'Pravidelné doplňování vede k poklesu zadržování vody a ústupu křečí. V kombinaci s vitamínem B6 je efekt na psychickou pohodu během PMS ještě výraznější.', source: '(Zdroj: Journal of Caring Sciences)' },
                { id: 8, title: 'Migrény a hormonální bouře', text: 'Během migrény (zejména té vázané na pokles estrogenu v cyklu) hladina hořčíku v mozku dramaticky klesá, což zvyšuje citlivost na bolest.', result: 'Suplementace 400–600 mg hořčíku denně dokáže snížit frekvenci migrenózních záchvatů až o 41 %, čímž konkuruje některým lékům bez vedlejších účinků.', source: '(Zdroj: Americká neurologická akademie (AAN))' },
                { id: 9, title: 'Magnesium Burn Rate – Proč ho máš stále málo?', text: 'U hořčíku neplatí jen to, kolik ho sníš, ale jak rychle ho vlivem stresu, kávy nebo sportu spálíš. Ženy mají míru spotřeby hořčíku (Burn Rate) přirozeně vyšší.', result: 'Chronický stres doslova vyplavuje hořčík močí. Cvičením ztrácíš 10–20 % denní dávky. Káva a alkohol fungují jako diuretika, která hořčík z těla vyhání.', source: '(Zdroj: Magnesium Stress Study)' }
            ]
        }
    ],
    analysis: {
        summary: '🌿 Cesta k obnově tvé vitality a rovnováhy\nTento rozbor ti pomůže pochopit, jak tvé tělo funguje jako jeden propojený celek. Když se zaměříme na dýchání a správnou výživu, tvůj organismus se přestane dusit a začne ti zase sloužit s plnou energií.',
        chapters: [
            {
                id: 'breath',
                title: '1. Plíce jako motor celého těla',
                icon: '🫁',
                content: 'Astma není jen kašel, je to chronický zánět, který tvé tělo neustále vyčerpává. Aby tělo mohlo regenerovat, musí mít kyslík.\n\nMontelukast (Tvé léky): Tento lék funguje tak, že blokuje látky způsobující otok průdušek. Je to efektivní cesta k dýchání bez steroidů.',
                highlight: '⚠️ Důležité varování (Tvá psychika): Montelukast má zdokumentované vedlejší účinky na náladu (úzkosti, deprese). Pokud jsi v minulosti pociťovala temné stavy, tvůj strach je naprosto racionální. Nejsi v tom sama a tvůj pocit je důležitý.\n\nAlternativa existuje: Pokud tě Montelukast děsí, existují inhalační léky (dýchátka). Moderní inhalátory působí pouze v plicích. Do krve se dostane tak zanedbatelné množství, že nemají šanci ovlivnit tvou váhu ani náladu.'
            },
            {
                id: 'survival',
                title: '2. Proč tvoje tělo jede v úsporném režimu?',
                icon: '🧬',
                content: 'Když tělo nemá dostatek kyslíku (astma) a základních živin (vynechávání jídla, žádné maso), přepne se do režimu přežití (Survival Mode).\n\nHormonální priorita: V tomto režimu mozek investuje energii jen do srdce a mozku. Vypíná funkce, které nejsou nezbytné pro okamžité přežití – to zahrnuje kvalitu vlasů a nehtů, hluboký spánek a také libido.',
                highlight: 'Kortizol vs. Klid: Neustálý stres zvyšuje hladinu kortizolu. Ten dává tělu signál: Pozor, jsme v nebezpečí, šetři energií a ukládej tuky! Proto je tak těžké zhubnout, i když jíš málo.\n\nBledost: Bez železa tvá krev nemá dost kamionů na rozvoz kyslíku. Tělo pak stahuje krev z kůže k vnitřním orgánům.'
            },
            {
                id: 'synergy',
                title: '3. Jak tvoje doplňky opravují systém?',
                icon: '🧪',
                content: 'Nevybrali jsme náhodné vitamíny, ale specifické formy (cheláty), které tvé tělo pozná jako potravu a skutečně je využije.',
                highlight: 'Železo + B12 + C: Tahle trojice vyrobí nové červené krvinky. Cílem je, aby ses přestala zadýchávat a vrátila se ti barva do tváří.\nZinek: Klíčový pro hormonální systém a imunitu. Pomáhá stabilizovat tvůj přirozený cyklus a zlepšuje stav pokožky.\nHořčík: Nejdůležitější spojenec. Pomáhá uvolňovat hladké svalstvo kolem průdušek a dává mozku signál bezpečí.'
            },
            {
                id: 'weight',
                title: '4. Pravda o váze a metabolismu',
                icon: '⚖️',
                content: 'Chápu, že se bojíš léků kvůli váze, ale realita je taková:',
                highlight: 'Dýchání spaluje tuky: Spalování tuků vyžaduje kyslík. Bez vyléčeného astmatu tvé tělo tuky prostě nezapálí.\nKonec stresového ukládání: Jakmile začneš dýchat a doplňovat hořčík, klesne kortizol. To dovolí tělu začít uvolňovat tukové zásoby.\nHladovění nefunguje: Tělo, kterému chybí zinek a železo, zpomaluje štítnou žlázu. Suplementy tvůj metabolismus znovu rozsvítí.'
            }
        ]
    },
    didYouKnow: {
        title: 'Co jsi možná nevěděla',
        subtitle: 'Pár vědeckých faktů o tom, proč tvé tělo dělá to, co dělá. Někdy to totiž není tvoje vina, ale čistá chemie.',
        sections: [
            {
                id: 'sleep',
                icon: '🧠',
                title: 'SPÁNEK: Mozková noční směna',
                items: [
                    { title: 'Glymfatická pračka', text: 'Během hlubokého spánku se mozek doslova pere. Funguje to jako kanalizace, která vyplavuje toxiny nahromaděné za celý den. Když nespíš hluboko, tenhle odpad v hlavě zůstává – a to je ta mozková mlha a podrážděnost ráno.' },
                    { title: 'NREM 3 a růstový hormon', text: 'Hluboký spánek je jediné okno v dni, kdy tělo masivně vyplavuje růstový hormon. Ten u dospělých nepomáhá s růstem, ale s opravou pleti, svalů a hormonů. Bez spánku tělo biologicky prostě neopravuje.' }
                ]
            },
            {
                id: 'food',
                icon: '🥯',
                title: 'JÍDLO A HORMONY: Proč hladovění nefunguje',
                items: [
                    { title: 'Kortizolový paradox', text: 'Když vynecháš jídlo, klesne ti cukr. Tělo zpanikaří a vyplaví kortizol (stres), aby cukr vytáhlo ze zásob. Sice nejíš, ale jsi ve stresu, tělo si drží tuk a štítná žláza zpomalí metabolismus, aby přežila zimu.' },
                    { title: 'Hormony hladu', text: 'Špatný spánek a nepravidelné jídlo rozbijí tvé hlídače. Ghrelin (hormon hladu) vystřelí nahoru a Leptin (sytost) klesne. Proto máš někdy nezvladatelné chutě a necítíš se sytá.' }
                ]
            },
            {
                id: 'water',
                icon: '💧',
                title: 'VODA: Palivo pro mozek a krev',
                items: [
                    { title: 'Falešný hlad', text: 'Centrum v mozku, které ovládá žízeň, je hned vedle centra pro hlad. Často, když máš na něco chuť nebo jsi unavená, tělo ve skutečnosti jen zoufale křičí po vodě.' },
                    { title: '2 % kognitivní propasti', text: 'Mozek je z 80 % voda. Ztráta pouhých 2 % vody v těle způsobuje dramatický propad soustředění a únavu. Tvoje únava po obědě často není o jídle, ale o tom, že máš hustou krev.' }
                ]
            }
        ]
    }
};
