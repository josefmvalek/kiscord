/**
 * Static Data & Content Catalogs for Kiscord Manual (#návod)
 */

export const KEY_CHANNELS = [
    'dashboard', 'schedule', 'study-planner', 'dorm-hub', 'finance-tracker',
    'gym-tracker', 'regenerace', 'habits', 'love-shop', 'dateplanner',
    'bucketlist', 'quests', 'daily-questions', 'timeline', 'letters',
    'achievements', 'watchlist', 'games-hub', 'music', 'settings'
];

export const CATEGORIES = [
    { id: 'all', name: '🌟 Všechny funkce', color: '#5865F2' },
    { id: 'core', name: '❤️ Můj Den & Zdraví', color: '#ed4245' },
    { id: 'vut', name: '🎓 VUT FIT & Koleje', color: '#3ba55c' },
    { id: 'gym', name: '🏋️‍♂️ Fitness & Posilovna', color: '#faa61a' },
    { id: 'love', name: '💖 Láska & Zážitky', color: '#eb459e' },
    { id: 'media', name: '🎮 Zábava & Herní Doupě', color: '#5865F2' },
    { id: 'system', name: '⚙️ Systém & Vychytávky', color: '#99aab5' }
];

export const FLYWHEEL_NODES = [
    {
        id: 'node-health',
        icon: 'fas fa-heartbeat',
        color: '#ed4245',
        title: '1. Zdraví & Disciplína',
        subtitle: 'Voda, spánek, návyky & gym',
        desc: 'Každodenní zápis hydratace (8 kapek), splněných návyků a tréninků v posilovně.',
        targetCategory: 'core'
    },
    {
        id: 'node-coins',
        icon: 'fas fa-coins',
        color: '#faa61a',
        title: '2. Love Coins & XP',
        subtitle: 'Automatické odměny',
        desc: 'Databáze okamžitě odměňuje aktivitu mincemi a zvyšuje společnou vztahovou úroveň.',
        targetCategory: 'love'
    },
    {
        id: 'node-shop',
        icon: 'fas fa-store',
        color: '#eb459e',
        title: '3. Mývalí Tržnice',
        subtitle: 'Nákup voucherů & kupónů',
        desc: 'Love Coins proměníš v romantické poukazy (masáž zad, snídaně do postele, výběr filmu).',
        targetCategory: 'love'
    },
    {
        id: 'node-calendar',
        icon: 'fas fa-calendar-check',
        color: '#5865F2',
        title: '4. Kalendář & Rande',
        subtitle: 'Automatické plánování',
        desc: 'Uplatněný kupón si jedním kliknutím naplánujete na konkrétní den do společného kalendáře.',
        targetCategory: 'core'
    },
    {
        id: 'node-timeline',
        icon: 'fas fa-trophy',
        color: '#3ba55c',
        title: '5. Kronika & Trofeje',
        subtitle: 'Vzpomínky a achievementy',
        desc: 'Prožité zážitky se ukládají do Timeline s fotkami a odemykají trofeje v Síni slávy.',
        targetCategory: 'love'
    }
];

export const GUIDE_ITEMS = [
    // --- 1. MŮJ DEN & ZDRAVÍ ---
    {
        id: 'dashboard',
        category: 'core',
        perspectives: ['all', 'klarka', 'jozka', 'couple'],
        title: 'Můj Den & Slunečnice',
        channelId: 'dashboard',
        channelName: 'Můj Den',
        icon: 'fas fa-heart text-pink-500',
        badge: 'Denní centrum',
        badgeColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        summary: 'Tvůj hlavní denní přehled. Obsahuje živé animované slunečnice synchronizované s náladou a spánkem partnera v reálném čase.',
        bullets: [
            '<strong>Slunečnice v reálném čase:</strong> Okamžitě vidíš, jak se dnes tvůj partner vyspal a jakou má náladu.',
            '<strong>Sunlight Pulse (Paprsek):</strong> Klikni na tlačítko sluníčka a pošli partnerovi hřejivý světelný paprsek a konfety na displej!',
            '<strong>Fakt dne & Ranní zpráva:</strong> Každý den se vygeneruje nový zajímavý fakt ze zvířecího světa a vědy.',
            '<strong>Rychlé rande pozvánky:</strong> Možnost jedním kliknutím potvrdit nebo navrhnout rande.'
        ],
        proTip: 'Dlouhým stiskem nebo klikem na slunečnici si zobrazíš detailní stav dne!',
        relatedChannels: [
            { id: 'habits', name: '#návyky' },
            { id: 'calendar', name: 'Kalendář' },
            { id: 'daily-questions', name: '#denní-otázky' }
        ],
        keywords: 'dashboard můj den slunečnice nálada spánek sunlight pulse paprsek konfety fakt dne přehled'
    },
    {
        id: 'health-tracker',
        category: 'core',
        perspectives: ['all', 'klarka', 'jozka'],
        title: 'Biometrie, Voda & Spánkový Tracker',
        channelId: 'dashboard',
        channelName: 'Můj Den',
        icon: 'fas fa-tint text-sky-400',
        badge: 'Zdraví & Love Coins',
        badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        summary: 'Sleduj hydrataci, náladu, spánkové cykly a suplementaci. Vše se automaticky ukládá a odměňuje tě mincemi.',
        bullets: [
            '<strong>Pitný režim (8 kapek):</strong> Každé kliknutí na kapku přidá sklenici vody. Při dosažení 8 kapek získáš Love Coins a achievement!',
            '<strong>Spánkový tracker:</strong> Tlačítko "Jdu spát" zapne živé měření délky spánku s progresním pruhem. Ráno stačí kliknout na "Vstávám".',
            '<strong>Náladoměr (1–10):</strong> Interaktivní posuvník s barevnými glow efekty a smajlíky.',
            '<strong>Vitamíny & Suplementy:</strong> Jednoklikové přepínače pro ranní a večerní vitamíny (Železo, Zinek, Hořčík).'
        ],
        proTip: 'Spánkový tracker funguje i když zavřeš aplikaci nebo vypneš mobil – čas se počítá na serveru!',
        relatedChannels: [
            { id: 'regenerace', name: '#regenerace' },
            { id: 'habits', name: '#návyky' },
            { id: 'gym-tracker', name: '#posilovna' }
        ],
        keywords: 'zdraví voda hydratace spánek nálada vitamíny suplementy kapky náladoměr biometrie'
    },
    {
        id: 'habits',
        category: 'core',
        perspectives: ['all', 'klarka', 'jozka'],
        title: 'Denní Návyky & Streaky',
        channelId: 'habits',
        channelName: '#návyky',
        icon: 'fas fa-check-circle text-emerald-400',
        badge: 'Disciplína & Odměny',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        summary: 'Buduj si pozitivní návyky (procházka, čtení, protažení, učení). Každý splněný zvyk ti generuje Love Coins!',
        bullets: [
            '<strong>Denní odškrtávání:</strong> Jednoduché zaškrtnutí v dashboardu nebo detailním kanálu #návyky.',
            '<strong>Počítadlo sérií (Streak):</strong> Udržuj nepřerušenou šňůru dnů a odemykej bonusové multiplikátory mincí.',
            '<strong>Tvorba vlastních zvyků:</strong> Nastav si vlastní návyky s ikonami, frekvencí a popisem.'
        ],
        proTip: 'Splněním všech návyků za daný den získáš zlatý bonusový balíček Love Coins.',
        relatedChannels: [
            { id: 'love-shop', name: '#obchůdek' },
            { id: 'achievements', name: '#achievementy' },
            { id: 'dashboard', name: 'Můj Den' }
        ],
        keywords: 'návyky habits zvyky streak odměny love coins disciplína denní úkoly'
    },

    // --- 2. VUT FIT & KOLEJE BRNO ---
    {
        id: 'schedule',
        category: 'vut',
        perspectives: ['all', 'jozka', 'couple'],
        title: 'Společný Rozvrh VUT FIT',
        channelId: 'schedule',
        channelName: '#rozvrh',
        icon: 'fas fa-calendar-week text-indigo-400',
        badge: 'VUT FIT Božetěchova',
        badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        summary: 'Interaktivní týdenní rozvrh hodin přizpůsobený studiu na FIT VUT v Brně.',
        bullets: [
            '<strong>Barevné rozlišení výuky:</strong> Přednášky (modrá), cvičení (zelená), počítačové laborky (oranžová).',
            '<strong>Navigace po areálu FIT:</strong> Kliknutím na učebnu (např. D105, C228, E112) se zobrazí nápověda k budově a patru v areálu Božetěchova.',
            '<strong>Detektor společných oken:</strong> Automaticky najde a zvýrazní časová okna, kdy máme oba volno na společný oběd v menze nebo kávu.'
        ],
        proTip: 'Můžeš si přepínat mezi zobrazením celého týdne a dnešního dne pro maximální přehlednost na mobilu.',
        relatedChannels: [
            { id: 'study-planner', name: '#studijní-plán' },
            { id: 'dorm-hub', name: '#koleje-brno' },
            { id: 'calendar', name: 'Kalendář' }
        ],
        keywords: 'rozvrh schedule vut fit božetěchova učebny přednášky cvičení laborky volná okna oběd'
    },
    {
        id: 'study-planner',
        category: 'vut',
        perspectives: ['all', 'jozka'],
        title: 'Studijní Plán, Kredity & WIS Body',
        channelId: 'study-planner',
        channelName: '#studijní-plán',
        icon: 'fas fa-tasks text-emerald-400',
        badge: 'WIS & Zkoušky',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        summary: 'Centrální přehled všech předmětů, získaných bodů ve WISu, zápočtů a termínů zkoušek.',
        bullets: [
            '<strong>Počítadlo bodů a zápočtů:</strong> Zapisuj průběžné body z půlsemestrálek a projektů. Vidíš, kolik ti chybí k zápočtu.',
            '<strong>Zkouškové milníky:</strong> Odpočty do zkoušek a barevné hodnocení splněných předmětů (A až E).'
        ],
        proTip: 'Zapisuj si body průběžně hned po zveřejnění ve WISu – budeš mít dokonalý klid před zkouškovým!',
        relatedChannels: [
            { id: 'schedule', name: '#rozvrh' },
            { id: 'dorm-hub', name: '#koleje-brno' }
        ],
        keywords: 'studijní plán study planner wis fit vut zkoušky zápočty body kredity předměty'
    },
    {
        id: 'dorm-hub',
        category: 'vut',
        perspectives: ['all', 'jozka', 'couple'],
        title: 'Kolejní Hub PPV (Praní & Nákupy)',
        channelId: 'dorm-hub',
        channelName: '#koleje-brno',
        icon: 'fas fa-building text-amber-400',
        badge: 'PPV Koleje Brno',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        summary: 'Praktický pomocník pro život na kolejích Pod Palackého vrchem v Brně.',
        bullets: [
            '<strong>Časovač pračky & sušičky:</strong> Spusť si odpočet praní na PPV. Aplikace ti pošle notifikaci, jakmile prádlo dopere.',
            '<strong>Sdílený nákupní seznam:</strong> Synchronizovaný seznam potravin do Lidlu a Billy u kolejí v reálném čase.'
        ],
        proTip: 'Při zaškrtnutí položky v nákupním seznamu se změna okamžitě promítne partnerovi na mobilu.',
        relatedChannels: [
            { id: 'schedule', name: '#rozvrh' },
            { id: 'finance-tracker', name: '#finance' }
        ],
        keywords: 'koleje dorm hub ppv pod palackého vrchem pračka praní nákupní seznam nákupy lidl brno'
    },

    // --- 3. FITNESS & REGENERACE ---
    {
        id: 'gym-tracker',
        category: 'gym',
        perspectives: ['all', 'jozka'],
        title: 'Posilovna & Workout Tracker',
        channelId: 'gym-tracker',
        channelName: '#posilovna',
        icon: 'fas fa-dumbbell text-amber-400',
        badge: 'Tréninky & Svaly',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        summary: 'Kompletní tréninkový deník s cviky, váhami, sériemi, časovačem odpočinku a 1RM kalkulačkou.',
        bullets: [
            '<strong>Tréninkové plány:</strong> Push / Pull / Legs, Fullbody nebo vlastní tréninky s historií.',
            '<strong>Časovač odpočinku:</strong> Automatické měření pauzy mezi sériemi s haptickým signálem.',
            '<strong>1RM kalkulačka & PR:</strong> Automatický záznam osobních rekordů a výpočet maximálky.',
            '<strong>Plovoucí lišta (Floating Bar):</strong> Během tréninku máš dole na displeji plovoucí lištu – můžeš procházet ostatní kanály a trénink běží dál na pozadí.'
        ],
        proTip: 'Kliknutím na ikonku historie u cviku okamžitě vidíš, s jakou vahou jsi cvičil minule!',
        relatedChannels: [
            { id: 'regenerace', name: '#regenerace' },
            { id: 'dashboard', name: 'Můj Den' },
            { id: 'achievements', name: '#achievementy' }
        ],
        keywords: 'posilovna gym workout trénink cviky váhy série odpočinek pr maximálka plovoucí lišta'
    },
    {
        id: 'regenerace',
        category: 'gym',
        perspectives: ['all', 'jozka', 'klarka'],
        title: 'Regenerace & Svalová Mapa',
        channelId: 'regenerace',
        channelName: '#regenerace',
        icon: 'fas fa-spa text-teal-400',
        badge: 'Regenerace & Svaly',
        badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        summary: 'Interaktivní anatomická mapa svalové únavy, recovery skóre a doporučení pro odpočinek.',
        bullets: [
            '<strong>Barevná mapa svalů:</strong> Zelená (připraveno), Žlutá (lehká únava), Červená (potřebuje regenerovat).',
            '<strong>Recovery Score:</strong> Výpočet celkové připravenosti těla na základě spánku, tréninků a času od posledního cvičení.'
        ],
        proTip: 'Červené svaly potřebují alespoň 48 hodin na plnou regeneraci a syntézu bílkovin.',
        relatedChannels: [
            { id: 'gym-tracker', name: '#posilovna' },
            { id: 'dashboard', name: 'Můj Den' }
        ],
        keywords: 'regenerace recovery svaly svalová mapa únava odpočinek skóre anatomie'
    },

    // --- 4. LÁSKA, ZÁŽITKY & ROMANTIKA ---
    {
        id: 'love-shop',
        category: 'love',
        perspectives: ['all', 'couple', 'klarka', 'jozka'],
        title: 'Mývalí Tržnice (#obchůdek)',
        channelId: 'love-shop',
        channelName: '#obchůdek',
        icon: 'fas fa-store text-pink-400',
        badge: 'Kupóny & Vouchery',
        badgeColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        summary: 'Romantický partnerský obchůdek, kde proměňuješ své vydělané Love Coins v reálné poukazy a zážitky.',
        bullets: [
            '<strong>Nákup voucherů:</strong> Masáže, snídaně do postele, palačinkové rande, právo na výběr filmu a další.',
            '<strong>Uplatnění kupónu:</strong> Kliknutím na "Uplatnit" se partnerovi odešle notifikace a kupón se přesune do aktivních závazků.',
            '<strong>Tvorba vlastních kupónů:</strong> Můžeš partnerovi vytvořit vlastní originální poukazy s libovolnou cenou a popisem.'
        ],
        proTip: 'Uplatněný kupón si můžeš rovnou jedním kliknutím naplánovat do Kalendáře na konkrétní den!',
        relatedChannels: [
            { id: 'habits', name: '#návyky' },
            { id: 'calendar', name: 'Kalendář' },
            { id: 'achievements', name: '#achievementy' }
        ],
        keywords: 'obchůdek love shop mývalí tržnice mince love coins vouchery kupóny masáž snídaně nákupy'
    },
    {
        id: 'dateplanner',
        category: 'love',
        perspectives: ['all', 'couple'],
        title: 'Plánovač Rande & Interaktivní Mapa',
        channelId: 'dateplanner',
        channelName: '#plánovač-rande',
        icon: 'fas fa-map-marked-alt text-emerald-400',
        badge: 'Rande & Výlety',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        summary: 'Interaktivní mapa míst v ČR i Rakousku (Zell am See) s plánovačem tras a Rande Matcherem.',
        bullets: [
            '<strong>Kategorie míst:</strong> Výhledy (⛰️), Jídlo & kavárny (🍔), Procházky v přírodě (🌲), Zábava (⚡).',
            '<strong>💖 Rande Matcher:</strong> Swipování míst jako na Tinderu – jakmile máte shodu, aplikace vám navrhne termín rande!',
            '<strong>Sestavování tras:</strong> Přidávej zastávky do trasy výletu, sleduj odhadovaný čas cesty a vzdálenost a jedním klikem otevři navigaci v Google Maps.',
            '<strong>🔒 Tajné rande:</strong> Naplánuj překvapení – partner vidí jen nápovědu a odpočet, místo se odemkne až před schůzkou.'
        ],
        proTip: 'Kliknutím na Kostku osudu vybere aplikace náhodné rande z vašich uložených míst!',
        relatedChannels: [
            { id: 'calendar', name: 'Kalendář' },
            { id: 'timeline', name: '#timeline' }
        ],
        keywords: 'mapa plánovač rande date planner výlety zell am see místa kavárny vyhlídky trasy tajné rande'
    },
    {
        id: 'bucketlist',
        category: 'love',
        perspectives: ['all', 'couple'],
        title: 'Společný Bucket List & Sny',
        channelId: 'bucketlist',
        channelName: '#bucketlist',
        icon: 'fas fa-list-check text-indigo-400',
        badge: 'Naše Cíle & Sny',
        badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        summary: 'Seznam našich společných snů, cestovatelských přání a životních cílů k odškrtávání.',
        bullets: [
            '<strong>Kategorie snů:</strong> Cestování, Zážitky, Domov, Zábava a Osobní rozvoj.',
            '<strong>Splněno & Fotovzpomínka:</strong> Po splnění se cíl přesune mezi oslavené milníky a můžeš k němu nahrát fotku.'
        ],
        proTip: 'Ke každému snu můžeš přidat odhadovaný rozpočet i cílové datum.',
        relatedChannels: [
            { id: 'timeline', name: '#timeline' },
            { id: 'achievements', name: '#achievementy' }
        ],
        keywords: 'bucket list sny questy výzvy společné cíle zážitky cestování přání'
    },
    {
        id: 'letters-timeline',
        category: 'love',
        perspectives: ['all', 'couple', 'klarka'],
        title: 'Vzkazy v Láhvi & Kronika Timeline',
        channelId: 'timeline',
        channelName: '#timeline',
        icon: 'fas fa-history text-pink-400',
        badge: 'Vzpomínky & Vzkazy',
        badgeColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        summary: 'Uchovávej naše nejkrásnější společné okamžiky a posílej vzkazy, které se odemknou až v budoucnu.',
        bullets: [
            '<strong>Kronika Timeline (#timeline):</strong> Vizuální časová osa našich zážitků, fotogalerie s lightboxem a popisky.',
            '<strong>Časové dopisy (#dopisy):</strong> Napiš partnerovi zprávu a zamkni ji k určitému datu (např. na výročí nebo narozeniny). Zpráva se otevře přesně v daný den!'
        ],
        proTip: 'Časový dopis po odeslání nejde předčasně otevřít – je to skutečné digitální tajemství.',
        relatedChannels: [
            { id: 'letters', name: '#dopisy' },
            { id: 'achievements', name: '#achievementy' }
        ],
        keywords: 'timeline kronika vzpomínky fotky fotogalerie dopisy vzkazy v láhvi tajné zprávy výročí'
    },
    {
        id: 'achievements',
        category: 'love',
        perspectives: ['all', 'couple', 'jozka', 'klarka'],
        title: 'Síň Slávy & Achievementy',
        channelId: 'achievements',
        channelName: '#achievementy',
        icon: 'fas fa-trophy text-amber-400',
        badge: 'Párové Trofeje',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        summary: 'Trofeje a milníky oslavující naše zdraví, společné zážitky i vtipné situace.',
        bullets: [
            '<strong>Automatické odemykání:</strong> Systém sám sleduje splnění podmínek (např. 7 dní spánku v kuse, 100 nachozených km, nákup v Obchůdku).',
            '<strong>Okamžitá synchronizace:</strong> Když jeden z vás odemkne trofej, druhému na mobilu vyskočí oslavná animace s konfetami.'
        ],
        proTip: 'V síni slávy můžete vytvářet i vlastní unikátní achievementy!',
        relatedChannels: [
            { id: 'habits', name: '#návyky' },
            { id: 'gym-tracker', name: '#posilovna' },
            { id: 'love-shop', name: '#obchůdek' }
        ],
        keywords: 'achievementy trofeje síň slávy odznaky milníky úspěchy oslava'
    },

    // --- 5. ZÁBAVA, MÉDIA & HERNÍ DOUPĚ ---
    {
        id: 'library-watchlist',
        category: 'media',
        perspectives: ['all', 'couple', 'klarka'],
        title: 'Knihovna, Watchlist & Tinder Matcher',
        channelId: 'watchlist',
        channelName: '#watchlist',
        icon: 'fas fa-film text-purple-400',
        badge: 'Filmy & Seriály',
        badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        summary: 'Konec věčnému dohadování "Na co se dneska podíváme?". Swipujte jako na Tinderu nebo nechte rozhodnout Kostku osudu.',
        bullets: [
            '<strong>Tinder Matcher:</strong> Swipuj filmy a hry doprava (chci) nebo doleva (nechci). Při vzájemné shodě vyskočí MATCH!',
            '<strong>💖 Spolu-seznam:</strong> Automatický seznam titulů, které chceme vidět oba, s možností rovnou naplánovat večer do kalendáře.',
            '<strong>🎲 Kostka osudu:</strong> Nevíte si rady? Klikněte na Kostku a ta náhodně vybere z vašich společných přání.',
            '<strong>Mediální katalog (#knihovna):</strong> Databáze filmů, seriálů a her s TMDB propojením, trailery na YouTube a hodnocením.'
        ],
        proTip: 'V katalogu vidíte i odznáček, pokud má film v přáních partner (např. "Klárka si přeje 👸").',
        relatedChannels: [
            { id: 'library', name: '#knihovna' },
            { id: 'calendar', name: 'Kalendář' },
            { id: 'games-hub', name: '#gamesky' }
        ],
        keywords: 'knihovna watchlist tinder matcher filmy seriály hry spolu seznam kostka osudu tmdb youtube'
    },
    {
        id: 'games-hub',
        category: 'media',
        perspectives: ['all', 'couple'],
        title: 'Herní Doupě (Arcade Hub)',
        channelId: 'games-hub',
        channelName: '#gamesky',
        icon: 'fas fa-gamepad text-emerald-400',
        badge: 'Párové Hry & Kvízy',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        summary: 'Centrální herní aréna s minihrami pro dva hráče v reálném čase.',
        bullets: [
            '<strong>🎨 Draw Duel:</strong> Kooperativní kreslení a hádání na živém digitálním plátně.',
            '<strong>❓ Kdo z nás spíš?:</strong> Zábavné hlasování o našich zvycích a vtipných situacích.',
            '<strong>🧠 Párové kvízy:</strong> Vytvořte si navzájem kvízy a otestujte, jak dobře se znáte.',
            '<strong>🧩 Foto Puzzle:</strong> Posuvné hlavolamy složené z našich reálných společných fotek.',
            '<strong>🕹️ Retro Tetris bitva:</strong> Klasický Tetris s online žebříčkem nejvyššího skóre.',
            '<strong>🏆 Tierlisty:</strong> Tvořte společné žebříčky jídel, filmů a zážitků (kategorie S až D).'
        ],
        proTip: 'V Tetrisu se skóre synchronizuje do globální tabulky lídrů – kdo drží aktuální rekord?',
        relatedChannels: [
            { id: 'achievements', name: '#achievementy' },
            { id: 'watchlist', name: '#watchlist' }
        ],
        keywords: 'hry gamesky arcade quiz draw duel kdo spíš tetris puzzle tierlist doupě zábava'
    },
    {
        id: 'music-bot',
        category: 'media',
        perspectives: ['all', 'couple'],
        title: 'Music Bot (Spotify Playlist)',
        channelId: 'music',
        channelName: '#music-bot',
        icon: 'fas fa-music text-green-400',
        badge: 'Společná Hudba',
        badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
        summary: 'Integrovaný přehrávač našeho společného Spotify playlistu s nejlepšími písničkami.',
        bullets: [
            'Pusťte si společný playlist přímo v prostředí Kiscordu při učení, cvičení nebo odpočinku.'
        ],
        proTip: 'Přehrávač můžete nechat hrát na pozadí při procházení rozvrhu nebo cvičení v gymu.',
        relatedChannels: [
            { id: 'dashboard', name: 'Můj Den' },
            { id: 'gym-tracker', name: '#posilovna' }
        ],
        keywords: 'hudba music bot spotify playlist písničky přehrávač vibes'
    },

    // --- 6. SYSTÉM, VYCHYTÁVKY & FAQ ---
    {
        id: 'settings-themes',
        category: 'system',
        perspectives: ['all', 'klarka', 'jozka'],
        title: '7 Vizuálních Témat & Nastavení',
        channelId: 'settings',
        channelName: '#nastavení',
        icon: 'fas fa-paint-brush text-purple-400',
        badge: 'Přizpůsobení',
        badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        summary: 'Přizpůsob si Kiscord podle své nálady. Můžeš volit ze 7 jedinečných grafických témat a ovládat notifikace.',
        bullets: [
            '<strong>7 grafických témat:</strong> Kiscord Dark (klasika), Light (světlý), Valentýn (růžovo-červený), Vánoce (sváteční), Tetris (retro neon), Forest (přírodní zelený), Zlaté (luxusní gold).',
            '<strong>Haptika & Zvuky:</strong> Nastav si jemné vibrace a zvukové efekty při klikání a odemykání achievementů.',
            '<strong>Web Push Notifikace:</strong> Povol si upozornění na zprávy, pračku a ranní sluneční paprsky.'
        ],
        proTip: 'Téma můžeš bleskově přepnout i kliknutím na ikonu paletky v záhlaví aplikace!',
        relatedChannels: [
            { id: 'dashboard', name: 'Můj Den' }
        ],
        keywords: 'nastavení témata themes dark mode light mode valentýn vánoce tetris forest gold zvuky haptika notifikace'
    },
    {
        id: 'offline-pwa',
        category: 'system',
        perspectives: ['all', 'jozka'],
        title: 'Offline Režim & PWA Synchronizace',
        channelId: 'settings',
        channelName: '#nastavení',
        icon: 'fas fa-wifi text-emerald-400',
        badge: 'Funguje i bez signálu',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        summary: 'Kiscord funguje kdekoliv – v metru, letadle i na horách bez signálu.',
        bullets: [
            '<strong>Automatická mezipaměť (IndexedDB):</strong> Všechna data se ukládají lokálně v telefonu.',
            '<strong>Sync Fronta (Offline Queue):</strong> Cokoliv zapíšeš bez internetu (např. trénink v suterénním gymu nebo vypitou vodu), se uloží do fronty a automaticky se odešle na Supabase hned po připojení k síti.'
        ],
        proTip: 'Kiscord si můžeš nainstalovat na domovskou obrazovku mobilu jako plnohodnotnou aplikaci (PWA) bez nutnosti App Store / Google Play!',
        relatedChannels: [
            { id: 'dashboard', name: 'Můj Den' },
            { id: 'gym-tracker', name: '#posilovna' }
        ],
        keywords: 'offline pwa synchronizace internet bez signálu mezipaměť fronta sync queue mobil aplikace'
    }
];

export const SHORTCUTS = [
    { key: 'Ctrl + K / ⌘ + K', desc: 'Rychlé vyhledávání kanálů a akcí (Command Palette)', icon: 'fas fa-search' },
    { key: 'Esc', desc: 'Okamžité zavření kteréhokoliv otevřeného modálního okna či menu', icon: 'fas fa-times' },
    { key: 'Swipe doprava / doleva', desc: 'V Tinder Matcheru (#watchlist) bleskové hodnocení filmů', icon: 'fas fa-arrows-alt-h' },
    { key: 'Klik na slunečnici', desc: 'V Můj Den zobrazení detailního přehledu a stavu dne', icon: 'fas fa-sun' },
    { key: 'Plovoucí lišta gymu', desc: 'Kliknutím na spodní lištu otevřeš/minimalizuješ probíhající trénink', icon: 'fas fa-dumbbell' }
];

export const FAQS = [
    {
        q: 'Jak získám více Love Coins (mincí)?',
        a: 'Love Coins získáš automaticky za aktivní život v Kiscordu: za vypití 8 kapek vody (5 mincí), za každý splněný denní návyk (2 mince), za dokončený trénink v posilovně (10 mincí), za zodpovězení denní otázky (3 mince) a za splnění společných questů.'
    },
    {
        q: 'Může Kiscord fungovat bez připojení k internetu?',
        a: 'Ano! Kiscord je plnohodnotná PWA aplikace se Service Workerem a lokální IndexedDB databází. Můžeš logovat tréninky i zdraví v offline režimu – jakmile se připojíš k Wi-Fi nebo mobilním datům, všechny změny se samy tiše sesynchronizují se serverem.'
    },
    {
        q: 'Jak fungují časově uzamčené dopisy (#dopisy)?',
        a: 'Při psaní dopisu zvolíš cílové datum v budoucnu (např. výročí, Valentýn, narozeniny). Dopisy jsou v databázi zašifrované a až do zvoleného dne se partnerovi zobrazují jako zapečetěná obálka s odpočtem.'
    },
    {
        q: 'Jak nainstalovat Kiscord na plochu mobilu?',
        a: 'V Safari na iOS klikni na tlačítko Sdílet a zvol "Přidat na plochu". Na Androidu v Chromu klikni na tři tečky a zvol "Nainstalovat aplikaci". Kiscord pak běží přes celou obrazovku jako nativní aplikace.'
    },
    {
        q: 'Kde najdu přehled a srovnání rozvrhu, abychom věděli, kdy máme společné volno?',
        a: 'V kanálu #rozvrh klikni na tlačítko "Společná volná okna". Algoritmus automaticky porovná oba rozvrhy a vypíše časy, kdy máme oba volno na oběd v menze nebo kávu.'
    }
];

export const VOUCHER_PRICES = [
    { title: '💆 Poctivá masáž zad', cost: 15 },
    { title: '👸 Hlava na klíně & Drbání', cost: 10 },
    { title: '🍿 Výběr filmu bez remcání', cost: 20 },
    { title: '🍳 Snídaně do postele', cost: 30 },
    { title: '🧹 Úklidový Free Pass', cost: 25 },
    { title: '🍕 Právo na poslední kousek', cost: 10 }
];
