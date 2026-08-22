/**
 * Kiscord - Návod & Kompletní průvodce aplikací (#návod)
 * Interaktivní, moderní a praktický přehled všech funkcí, kanálů, zkratek,
 * živých simulátorů a mapy propojenosti celého ekosystému.
 * 
 * Všechny interakce a filtry pracují s fine-grained DOM mutacemi bez celostránkového překreslování.
 */

import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { toggleTheme, showNotification } from '../core/theme.js';

function interpolateColor(color1, color2, factor) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getSleepCenterColors(hours) {
    const h = Math.min(10, Math.max(0, hours || 0));
    const factor = h / 10;
    const outer = interpolateColor('#1a1005', '#6b4226', factor);
    const inner = interpolateColor('#0d0601', '#3d2311', factor);
    return { outer, inner };
}

export function generateSunflowerSVG(data, isPartner = false) {
    if (!data) data = { water: 0, sleep: 0, mood: 5, movement: [], bedtime: null };
    
    let containerClass = "relative flex flex-col items-center justify-end h-36 w-24 sunflower-container";
    if (data.sleep >= 7) containerClass += " sf-glow";
    if (data.bedtime) containerClass += " sf-sleep";

    const mood = data.mood || 1;
    const numPetals = 27;
    const visiblePetals = Math.min(numPetals, Math.max(0, (mood - 1) * 3)); 
    const defsPrefix = isPartner ? 'p' : 'm';
    
    const sleepColors = getSleepCenterColors(data.sleep);
    
    let petalsHTML = "";
    for (let i = 0; i < numPetals; i++) {
        const isMissing = i >= visiblePetals;
        const petalClass = isMissing ? `sf-petal-wrapper sf-petal-wrapper-${i} missing` : `sf-petal-wrapper sf-petal-wrapper-${i}`;
        const rotation = i * (360 / 27); 
        const isFront = i % 2 !== 0;
        const length = 46; 
        const width = 14; 
        const strokeColor = isFront ? `#eab308` : `#ca8a04`;
        
        petalsHTML += `
            <g transform="rotate(${rotation})">
                <g class="${petalClass}">
                    <path d="M 0,-16 Q ${width},-${length/2 + 5} 0,-${length} Q -${width},-${length/2 + 5} 0,-16" 
                          fill="url(#petal-grad-${defsPrefix})" stroke="${strokeColor}" stroke-width="0.5"/>
                </g>
            </g>
        `;
    }

    const water = data.water || 0;
    const swellBonus = Math.max(0, water - 4) * 0.175;
    const leafData = [{y: 140, s: 1}, {y: 120, s: -1}, {y: 100, s: 1}, {y: 80, s: -1}];

    let leavesHTML = "";
    for (let i = 0; i < 4; i++) {
        const isVisible = water > i;
        const scaleMag = isVisible ? (0.5 + swellBonus) : 0;
        const l = leafData[i];
        leavesHTML += `
            <g style="transform: translate(50px, ${l.y}px)">
                <g class="sf-leaf sf-leaf-${i}" style="transform: scale(${scaleMag * l.s}, ${scaleMag})">
                    <path d="M 0,0 Q 15,-15 30,-5 Q 15,10 0,0" fill="#16a34a" stroke="#14532d" stroke-width="1"/>
                </g>
            </g>
        `;
    }

    return `
        <div class="${containerClass}">
            <svg viewBox="0 0 100 150" width="100" height="150" style="overflow: visible; drop-shadow: 0 5px 5px rgba(0,0,0,0.5);">
                <defs>
                    <linearGradient id="petal-grad-${defsPrefix}" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#f59e0b"/><stop offset="25%" stop-color="#facc15"/><stop offset="100%" stop-color="#fef08a"/>
                    </linearGradient>
                </defs>
                <g class="sf-stem-group">
                    <path class="sf-stem-main" d="M 50,50 L 50,155" fill="none" stroke="#15803d" stroke-width="8" stroke-linecap="round"/>
                    ${leavesHTML}
                </g>
                <g transform="translate(50, 40)">
                    <g class="sf-head-group">
                        <g class="sf-head">
                            <circle cx="0" cy="0" r="18" fill="#1e1005" />
                            ${petalsHTML}
                            <circle cx="0" cy="0" r="18" fill="${sleepColors.outer}" stroke="#1f1005" stroke-width="2" class="sf-center" style="transition: fill 0.5s ease;"/>
                            <circle cx="0" cy="0" r="14" fill="${sleepColors.inner}" class="sf-center" style="transition: fill 0.5s ease;"/>
                            <circle cx="-5" cy="-2" r="1.5" fill="#facc15" opacity="${0.4 + (Math.min(10, data.sleep || 0) / 10) * 0.6}" class="sf-face" style="transition: opacity 0.5s ease;"/>
                            <circle cx="5" cy="-2" r="1.5" fill="#facc15" opacity="${0.4 + (Math.min(10, data.sleep || 0) / 10) * 0.6}" class="sf-face" style="transition: opacity 0.5s ease;"/>
                            <path d="M -3,3 Q 0,7 3,3" fill="none" stroke="#facc15" stroke-width="1.5" stroke-linecap="round" opacity="${0.4 + (Math.min(10, data.sleep || 0) / 10) * 0.6}" class="sf-face" style="transition: opacity 0.5s ease;"/>
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    `;
}

function executeSwitchChannel(channelId) {
    recordChannelExploration(channelId);
    if (typeof window !== 'undefined' && typeof window.switchChannel === 'function') {
        window.switchChannel(channelId);
    } else {
        import('../core/router.js').then(r => r.switchChannel(channelId)).catch(console.error);
    }
}

// Global exploration tracker
export const KEY_CHANNELS = [
    'dashboard', 'schedule', 'study-planner', 'dorm-hub', 'finance-tracker',
    'gym-tracker', 'regenerace', 'habits', 'love-shop', 'dateplanner',
    'bucketlist', 'quests', 'daily-questions', 'timeline', 'letters',
    'achievements', 'watchlist', 'games-hub', 'music', 'settings'
];

function getExploredChannels() {
    try {
        const raw = localStorage.getItem('kiscord_explored_channels');
        return raw ? JSON.parse(raw) : ['manual', 'dashboard'];
    } catch {
        return ['manual', 'dashboard'];
    }
}

export function recordChannelExploration(channelId) {
    try {
        const explored = getExploredChannels();
        if (!explored.includes(channelId)) {
            explored.push(channelId);
            localStorage.setItem('kiscord_explored_channels', JSON.stringify(explored));
            updateExplorationUI();
        }
    } catch (e) {
        console.warn('[Manual] Error saving exploration:', e);
    }
}

let activePerspective = 'all'; // 'all' | 'klarka' | 'jozka' | 'couple'
let activeCategory = 'all';
let searchQuery = '';
let activeFlywheelNode = null;
let activeSimulatorTab = 'coins'; // 'coins' | 'offline' | 'sunflower'

// Simulator states
let simCoinsState = {
    water: 8,
    habits: 3,
    gym: 1,
    question: 1
};

let simOfflineState = {
    isOnline: true,
    queueCount: 0,
    isSyncing: false
};

let simSunflowerState = {
    mood: 8,
    sleepHours: 8,
    water: 6,
    isSleeping: false
};

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
            '<strong>WIS Body & Zápočty:</strong> Sleduj průběžný stav bodů z půlsemestrálek a projektů.',
            '<strong>Kalkulačka úspěšnosti:</strong> Automaticky spočítá, kolik bodů ještě potřebuješ ze zkoušky na známku A, B, C, D, E.',
            '<strong>Odpočty do zkoušek:</strong> Živý odpočet dní a hodin do odevzdání projektů a termínů zkoušek.'
        ],
        proTip: 'Předměty si můžeš barevně označit podle priority a obtížnosti.',
        relatedChannels: [
            { id: 'schedule', name: '#rozvrh' },
            { id: 'calendar', name: 'Kalendář' },
            { id: 'laptop-comparison', name: '#počítač' }
        ],
        keywords: 'studijní plán wis body kredity zkoušky zápočty fit projekty předměty známky'
    },
    {
        id: 'dorm-hub',
        category: 'vut',
        perspectives: ['all', 'klarka', 'jozka'],
        title: 'Koleje Brno & Prádelník',
        channelId: 'dorm-hub',
        channelName: '#koleje-brno',
        icon: 'fas fa-building text-amber-400',
        badge: 'Kolejní život',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        summary: 'Vše pro pohodlný život na kolejích – sledování praček, balící checklist pokoje a jídelníčky menz.',
        bullets: [
            '<strong>Prádelník s minutkou:</strong> Spusť si časovač praní. Aplikace ti pošle upozornění 5 minut před koncem, abys včas vyndal prádlo.',
            '<strong>Kolejní checklist:</strong> Přehledný seznam věcí na pokoj (přivezeno / potřeba dokoupit).',
            '<strong>Radar menz:</strong> Přímé odkazy na denní menu v Menze Kolejní (PPV) a Menze Purkyňova.'
        ],
        proTip: 'Časovač praní běží na pozadí a upozorní tě i při zamčené obrazovce.',
        relatedChannels: [
            { id: 'finance-tracker', name: '#finance' },
            { id: 'schedule', name: '#rozvrh' }
        ],
        keywords: 'koleje kolej prádelník pračka praní checklist pokoj menza menzy purkyňova kolejní ppv brno'
    },
    {
        id: 'finance-tracker',
        category: 'vut',
        perspectives: ['all', 'jozka'],
        title: 'Osobní Finance & Kasička',
        channelId: 'finance-tracker',
        channelName: '#finance',
        icon: 'fas fa-wallet text-amber-400',
        badge: 'Rozpočet & Spoření',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        summary: 'Soukromý rozpočet pro život v Brně a spořicí prasátko na společné cíle i osobní sny.',
        bullets: [
            '<strong>Brněnský rozpočet:</strong> Evidence příjmů a výdajů v kategoriích (Koleje, Menza, Nákupy, Doprava, Zábava).',
            '<strong>Kasička (Spořicí cíle):</strong> Vytvoř si cíle (např. Dovolená, Monitor, Rezerva) s progress bary a rychlými tlačítky (+100 Kč, +500 Kč, +1000 Kč).',
            '<strong>Soukromí zaručeno:</strong> Osobní finanční záznamy jsou viditelné pouze pro tebe díky Supabase RLS.'
        ],
        proTip: 'Po dosažení 100 % cíle v Kasičce vystřelí konfety a cíl se slavnostně označí jako splněný! 🎉',
        relatedChannels: [
            { id: 'dorm-hub', name: '#koleje-brno' },
            { id: 'love-shop', name: '#obchůdek' }
        ],
        keywords: 'finance kasička rozpočet výdaje příjmy spoření peníze brno kolej menza cíle'
    },
    {
        id: 'laptop-comparison',
        category: 'vut',
        perspectives: ['all', 'jozka'],
        title: 'Průvodce Výběrem Notebooku',
        channelId: 'laptop-comparison',
        channelName: '#počítač',
        icon: 'fas fa-laptop text-cyan-400',
        badge: 'Hardware pro IT',
        badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        summary: 'Detailní srovnání parametrů notebooků ideálních pro programování a studium informatiky na FIT.',
        bullets: [
            '<strong>Klíčové metriky:</strong> Srovnání výdrže baterie, váhy, výkonu CPU/GPU a kvality displeje.',
            '<strong>Poznámky & Hodnocení:</strong> Výhody a nevýhody jednotlivých kandidátů.'
        ],
        proTip: 'Na FIT se hodí notebook s dobrou výdrží baterie a pohodlnou klávesnicí na dlouhé kódování.',
        relatedChannels: [
            { id: 'study-planner', name: '#studijní-plán' },
            { id: 'finance-tracker', name: '#finance' }
        ],
        keywords: 'počítač notebook laptop hardware fit vut parametry displej baterie srovnání'
    },

    // --- 3. FITNESS & POSILOVNA ---
    {
        id: 'gym-tracker',
        category: 'gym',
        perspectives: ['all', 'jozka', 'klarka'],
        title: 'Gym Tracker & Plovoucí Workout HUD',
        channelId: 'gym-tracker',
        channelName: '#posilovna',
        icon: 'fas fa-dumbbell text-amber-500',
        badge: 'Kompletní Fitness Hub',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        summary: 'Nejpokročilejší fitness ekosystém. Trénink můžeš logovat přímo v posilovně s plovoucí spodní lištou, která běží na pozadí.',
        bullets: [
            '<strong>Plovoucí Workout Bar:</strong> Spusť trénink a klidně procházej jakýkoliv jiný kanál Kiscordu. Časovač pauzy a aktuální cvik máš stále vespod obrazovky.',
            '<strong>Rest Timer s pípnutím:</strong> Automatický odpočet pauzy mezi sériemi s audio gongem a haptickou vibrací.',
            '<strong>Předpřipravené šablony:</strong> Push / Pull / Legs, Upper / Lower, Fullbody nebo vlastní trénink.',
            '<strong>Katalog 100+ cviků s GIFy:</strong> Správná technika, zapojené svaly a animované ukázky.',
            '<strong>Automatické 1RM rekordy:</strong> Při zapsání nového rekordu aplikace automaticky spočítá odhadované 1RM a spustí oslavnou notifikaci.',
            '<strong>Anatomická svalová mapa:</strong> Vizuální heatmapa zatížení svalových partií.'
        ],
        proTip: 'V nástrojích posilovny najdeš i kalkulačku kotoučů na osu (Plate Calculator), abys nemusel v hlavě počítat váhy!',
        relatedChannels: [
            { id: 'regenerace', name: '#regenerace' },
            { id: 'habits', name: '#návyky' },
            { id: 'achievements', name: '#achievementy' }
        ],
        keywords: 'posilovna gym tracker workout trénink cviky série váhy maximálky 1rm svalová mapa kotouče timer hud'
    },
    {
        id: 'regenerace',
        category: 'gym',
        perspectives: ['all', 'klarka'],
        title: 'Regenerace & Vědecký Průvodce',
        channelId: 'regenerace',
        channelName: '#regenerace',
        icon: 'fas fa-leaf text-emerald-400',
        badge: 'Biohacking & Zdraví',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        summary: 'Vědecky podložený průvodce tělesnou regenerací, cirkadiánním rytmem a správnou suplementací pro Klárku.',
        bullets: [
            '<strong>Karty suplementů:</strong> Dávkování, nejlepší čas užívání a účinky (Železo, Zinek, Hořčík, Kreatin, Omega-3).',
            '<strong>Časová osa protokolu:</strong> Sledování týdnů na regeneračním plánu a vnímané zlepšení energie.',
            '<strong>Vědecké studie:</strong> Shrnutí lékařských poznatků pro lepší spánek a regeneraci svalů.'
        ],
        proTip: 'Hořčík bisglycinát je nejlepší užívat cca 30–60 minut před spaním pro hlubší spánek.',
        relatedChannels: [
            { id: 'gym-tracker', name: '#posilovna' },
            { id: 'dashboard', name: 'Můj Den' }
        ],
        keywords: 'regenerace biohacking suplementy vitamíny hořčík železo zinek spánek věda protokol'
    },

    // --- 4. LÁSKA, NÁŠ SVĚT & ZÁŽITKY ---
    {
        id: 'love-shop',
        category: 'love',
        perspectives: ['all', 'klarka', 'jozka', 'couple'],
        title: 'Mývalí Tržnice (Love Shop) & Kupóny',
        channelId: 'love-shop',
        channelName: '#obchůdek',
        icon: 'fas fa-store text-rose-400',
        badge: 'Mince & Poukazy',
        badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        summary: 'Místo, kde proměníš své těžce vydřené Love Coins za romantické a zábavné poukazy na míru!',
        bullets: [
            '<strong>Katalog poukazů:</strong> Masáž zad, Drbání hlavičky, Snídaně do postele, Výběr filmu bez remcání, Úklidový Free Pass...',
            '<strong>Spížka kupónů:</strong> Všechny zakoupené vouchery máš uložené ve spížce. Můžeš je kdykoliv uplatnit!',
            '<strong>Přímé plánování do Kalendáře:</strong> Při uplatnění kupónu si můžete rovnou vybrat datum a čas a událost se zapíše do společného kalendáře.',
            '<strong>Kámen-Nůžky-Papír:</strong> Zábavná minihra o Love Coins přímo v tržnici.'
        ],
        proTip: 'Love Coins získáš za pití vody, odškrtávání návyků, logování tréninků v gymu a plnění společných questů!',
        relatedChannels: [
            { id: 'habits', name: '#návyky' },
            { id: 'calendar', name: 'Kalendář' },
            { id: 'quests', name: '#společné-questy' }
        ],
        keywords: 'obchůdek love shop mývalí tržnice kupóny mince love coins poukazy masáž snídaně spížka'
    },
    {
        id: 'date-planner',
        category: 'love',
        perspectives: ['all', 'klarka', 'couple'],
        title: 'Plánovač Rande & Mapa Míst',
        channelId: 'dateplanner',
        channelName: '#plánovač-rande',
        icon: 'fas fa-map-marker-alt text-emerald-400',
        badge: 'Interaktivní Mapa',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        summary: 'Interaktivní mapa našich oblíbených kaváren, restaurací, vyhlídek a míst, kam chceme vyrazit příště.',
        bullets: [
            '<strong>Barevné špendlíky:</strong> Navštíveno (zelená), V plánu (žlutá), Wishlist (fialová).',
            '<strong>Filtrování podle nálady:</strong> Romantická večeře, rychlá káva, procházka v přírodě nebo dobrodružství.',
            '<strong>Navigace na jedno kliknutí:</strong> Otevři vybrané místo přímo v Google Mapách.'
        ],
        proTip: 'Nové místo můžeš přidat přímo kliknutím do mapy nebo zadáním adresy!',
        relatedChannels: [
            { id: 'bucketlist', name: '#bucket-list' },
            { id: 'calendar', name: 'Kalendář' },
            { id: 'timeline', name: '#timeline' }
        ],
        keywords: 'mapa rande dateplanner místa výlety kavárny restaurace podniky brno výlet wishlist'
    },
    {
        id: 'bucketlist-quests',
        category: 'love',
        perspectives: ['all', 'couple', 'klarka', 'jozka'],
        title: 'Bucket List & Společné Questy',
        channelId: 'bucketlist',
        channelName: '#bucket-list',
        icon: 'fas fa-rocket text-rose-500',
        badge: 'Sny & Výzvy',
        badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        summary: 'Všechny velké i malé sny, které chceme společně prožít, a kooperativní výzvy s progress barem.',
        bullets: [
            '<strong>Bucket List (#bucket-list):</strong> Seznam společných přání s fotkami po splnění a prioritami.',
            '<strong>Společné Questy (#společné-questy):</strong> Dlouhodobé párové cíle (např. 100 km nachozeno, 50 společných tréninků, 20 přečtených knih).'
        ],
        proTip: 'Ke každému splněnému bodu z Bucket Listu můžete nahrát památeční fotku!',
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

/**
 * Hlavní vykreslovací funkce kanálu #návod
 */
export function renderManual() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    recordChannelExploration('manual');
    const explored = getExploredChannels();
    const explorationPct = Math.min(100, Math.round((explored.length / KEY_CHANNELS.length) * 100));

    window.manualGuide = {
        setPerspective: (p) => {
            activePerspective = p;
            triggerHaptic('light');
            
            // In-place UI update of buttons
            document.querySelectorAll('.perspective-btn').forEach(btn => {
                const isSelected = btn.dataset.perspective === p;
                btn.className = `perspective-btn p-2.5 rounded-xl text-left transition-all border ${
                    isSelected 
                    ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25 scale-[1.02]' 
                    : 'bg-black/20 border-white/5 text-gray-300 hover:bg-black/30 hover:text-white'
                }`;
            });
            updateFilteredList();
        },
        setCategory: (catId) => {
            activeCategory = catId;
            activeFlywheelNode = null;
            triggerHaptic('light');

            // In-place UI update of category buttons & flywheel nodes
            updateCategoryPillsUI();
            updateFlywheelNodesUI();
            updateFilteredList();
        },
        selectFlywheelNode: (nodeId) => {
            if (activeFlywheelNode === nodeId) {
                activeFlywheelNode = null;
                activeCategory = 'all';
            } else {
                activeFlywheelNode = nodeId;
                const node = FLYWHEEL_NODES.find(n => n.id === nodeId);
                if (node) activeCategory = node.targetCategory;
            }
            triggerHaptic('medium');

            updateFlywheelNodesUI();
            updateCategoryPillsUI();
            updateFilteredList();
        },
        setSimulatorTab: (tabId) => {
            activeSimulatorTab = tabId;
            triggerHaptic('light');

            // In-place update of tab buttons
            document.querySelectorAll('.sim-tab-btn').forEach(btn => {
                const isSelected = btn.dataset.tab === tabId;
                btn.className = `sim-tab-btn px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                    isSelected 
                    ? 'bg-[#5865F2] text-white shadow' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`;
            });
            renderSimulatorContent();
        },
        updateSimCoins: (field, value) => {
            simCoinsState[field] = Number(value);
            triggerHaptic('selection');
            renderCoinsCalculatorResult();
        },
        simToggleOffline: (goOnline) => {
            simOfflineState.isOnline = goOnline;
            triggerHaptic('medium');
            renderOfflineSimulatorResult();
        },
        simAddOfflineAction: () => {
            simOfflineState.queueCount += 1;
            triggerHaptic('light');
            showNotification('Záznam byl bezpečně uložen do lokální IndexedDB fronty! 📦', 'info');
            renderOfflineSimulatorResult();
        },
        simFlushQueue: () => {
            if (simOfflineState.queueCount === 0) return;
            simOfflineState.isSyncing = true;
            renderOfflineSimulatorResult();
            setTimeout(() => {
                simOfflineState.queueCount = 0;
                simOfflineState.isSyncing = false;
                triggerHaptic('success');
                triggerConfetti();
                showNotification('Všechna offline data byla úspěšně odeslána do Supabase! 🎉', 'success');
                renderOfflineSimulatorResult();
            }, 900);
        },
        updateSimSunflower: (field, value) => {
            if (field === 'mood') simSunflowerState.mood = Number(value);
            if (field === 'sleepHours') simSunflowerState.sleepHours = Number(value);
            if (field === 'sleep') {
                if (typeof value === 'boolean') {
                    simSunflowerState.isSleeping = value;
                } else {
                    simSunflowerState.sleepHours = Number(value);
                }
            }
            if (field === 'water') simSunflowerState.water = Number(value);
            if (field === 'sleeping' || field === 'isSleeping') simSunflowerState.isSleeping = Boolean(value);
            triggerHaptic('selection');
            renderSunflowerPreviewResult();
        },
        handleSearch: (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            updateFilteredList();
        },
        clearSearch: () => {
            searchQuery = '';
            const input = document.getElementById('manual-search-input');
            if (input) input.value = '';
            updateFilteredList();
        },
        jumpToChannel: (channelId) => {
            triggerHaptic('medium');
            triggerConfetti();
            showNotification(`Přepínám do kanálu #${channelId}...`, 'info');
            executeSwitchChannel(channelId);
        },
        toggleFaq: (idx) => {
            const el = document.getElementById(`faq-ans-${idx}`);
            const icon = document.getElementById(`faq-icon-${idx}`);
            if (el) {
                const isHidden = el.classList.contains('hidden');
                el.classList.toggle('hidden', !isHidden);
                if (icon) {
                    icon.classList.toggle('rotate-180', isHidden);
                }
                triggerHaptic('light');
            }
        },
        quickTheme: () => {
            toggleTheme();
            triggerHaptic('success');
            showNotification('Téma bylo úspěšně přepnuto! 🎨', 'success');
        }
    };

    container.innerHTML = `
        <style>
            /* Custom Range Sliders for Discord aesthetic */
            .custom-range {
                -webkit-appearance: none;
                width: 100%;
                height: 6px;
                background: #18191c;
                border-radius: 9999px;
                outline: none;
                border: 1px solid rgba(255,255,255,0.08);
                transition: all 0.2s ease;
            }
            .custom-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #5865F2;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(88, 101, 242, 0.6);
                border: 2px solid #ffffff;
                transition: transform 0.15s ease, background-color 0.15s ease;
            }
            .custom-range::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                background: #7983f5;
            }
            .custom-range::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #5865F2;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(88, 101, 242, 0.6);
                border: 2px solid #ffffff;
                transition: transform 0.15s ease;
            }
        </style>

        <div class="h-full overflow-y-auto bg-[var(--bg-primary)] p-4 md:p-8 space-y-8 animate-fade-in custom-scrollbar text-[var(--text-normal)]">
            
            <!-- HERO HEADER -->
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5865F2]/20 via-[#eb459e]/15 to-[#faa61a]/15 p-6 md:p-10 border border-white/10 shadow-2xl backdrop-blur-xl">
                <div class="absolute -right-10 -top-10 w-48 h-48 bg-[#5865F2]/20 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -left-10 -bottom-10 w-48 h-48 bg-[#eb459e]/20 rounded-full blur-3xl pointer-events-none"></div>

                <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div class="space-y-3 text-center md:text-left max-w-2xl">
                        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white shadow-sm backdrop-blur-md">
                            <i class="fas fa-compass text-amber-400"></i>
                            <span>Interaktivní Portál Kiscord v2.5</span>
                        </div>
                        <h1 class="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
                            <span>Jak funguje Kiscord</span>
                            <span class="text-2xl md:text-3xl animate-bounce">🧭</span>
                        </h1>
                        <p class="text-sm md:text-base text-gray-300 leading-relaxed">
                            Kompletní přehled principů, propojenosti ekosystému, interaktivních simulátorů a všech 55+ kanálů vytvořených na míru pro Josefa a Klárku.
                        </p>
                    </div>

                    <!-- Quick Action Hero Widget -->
                    <div class="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto flex-shrink-0">
                        <button type="button" onclick="window.switchChannel('dashboard')" class="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-pink-500/25 transition transform active:scale-95 flex items-center justify-center gap-2.5">
                            <i class="fas fa-heart"></i>
                            <span>Otevřít Můj Den</span>
                        </button>
                        <button type="button" onclick="window.manualGuide.quickTheme()" class="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm transition transform active:scale-95 flex items-center justify-center gap-2.5 backdrop-blur-md">
                            <i class="fas fa-palette text-amber-400"></i>
                            <span>Přepnout téma</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- PERSPECTIVE SWITCHER & EXPLORER PROGRESS -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                <!-- Perspective Switcher (2 cols on lg) -->
                <div class="lg:col-span-2 rounded-2xl bg-[#202225]/90 border border-white/5 p-5 backdrop-blur-md flex flex-col justify-between gap-3">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Přepínač perspektivy</span>
                        <h2 class="text-sm md:text-base font-bold text-white mt-0.5">Komu je návod přizpůsoben?</h2>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        ${[
                            { id: 'all', label: '🌟 Vše', desc: 'Všechny kanály' },
                            { id: 'klarka', label: '👸 Pro Klárku', desc: 'Zdraví & relax' },
                            { id: 'jozka', label: '🤴 Pro Jožku', desc: 'FIT & Gym' },
                            { id: 'couple', label: '💑 Společně', desc: 'Hry & Láska' }
                        ].map(p => `
                            <button 
                                type="button"
                                data-perspective="${p.id}"
                                onclick="window.manualGuide.setPerspective('${p.id}')"
                                class="perspective-btn p-2.5 rounded-xl text-left transition-all border ${
                                    activePerspective === p.id 
                                    ? 'bg-[#5865F2] border-[#5865F2] text-white shadow-lg shadow-[#5865F2]/25 scale-[1.02]' 
                                    : 'bg-black/20 border-white/5 text-gray-300 hover:bg-black/30 hover:text-white'
                                }"
                            >
                                <div class="font-bold text-xs">${p.label}</div>
                                <div class="text-[10px] opacity-75 truncate">${p.desc}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Explorer Quest Badge -->
                <div id="exploration-badge-container" class="rounded-2xl bg-[#202225]/90 border border-white/5 p-5 backdrop-blur-md flex flex-col justify-between gap-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-bold">🧭</span>
                            <span class="text-xs font-bold text-white">Kiscord Průzkumník</span>
                        </div>
                        <span id="exploration-pct-text" class="text-xs font-mono font-bold text-amber-400">${explorationPct}%</span>
                    </div>

                    <div class="space-y-1.5">
                        <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                            <div id="exploration-progress-bar" class="bg-gradient-to-r from-[#5865F2] via-[#eb459e] to-[#faa61a] h-full transition-all duration-500 rounded-full" style="width: ${explorationPct}%;"></div>
                        </div>
                        <p id="exploration-desc-text" class="text-[11px] text-gray-400 flex items-center justify-between">
                            <span>Navštíveno: <strong class="text-white">${explored.length}</strong> / ${KEY_CHANNELS.length} modulů</span>
                            ${explorationPct === 100 ? '<span class="text-emerald-400 font-bold">Dokončeno! 🏆</span>' : '<span>Zbývá ' + (KEY_CHANNELS.length - explored.length) + '</span>'}
                        </p>
                    </div>
                </div>
            </div>

            <!-- INTERACTIVE ECOSYSTEM FLYWHEEL (PROPOJENOST SYSTÉMU) -->
            <div class="rounded-3xl bg-gradient-to-b from-[#202225] to-[#2f3136]/80 border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-4">
                    <div>
                        <div class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest">
                            <i class="fas fa-project-diagram"></i>
                            <span>The Kiscord Flywheel</span>
                        </div>
                        <h2 class="text-lg md:text-xl font-black text-white">Jak jsou data v Kiscordu propojená?</h2>
                        <p class="text-xs md:text-sm text-gray-400">Kliknutím na jednotlivé fáze zvýrazníš související moduly a tok dat v reálném čase.</p>
                    </div>

                    <button type="button" id="flywheel-reset-btn" onclick="window.manualGuide.selectFlywheelNode(null)" class="${activeFlywheelNode ? '' : 'hidden'} text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
                        Zobrazit celý koloběh
                    </button>
                </div>

                <!-- Interactive Node Chain -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    ${FLYWHEEL_NODES.map(node => {
                        const isSelected = activeFlywheelNode === node.id;
                        return `
                            <div 
                                data-node="${node.id}"
                                onclick="window.manualGuide.selectFlywheelNode('${node.id}')"
                                class="flywheel-node-card cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
                                    isSelected 
                                    ? 'bg-black/50 border-amber-400 shadow-lg shadow-amber-400/20 scale-105' 
                                    : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/30'
                                }"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm" style="background: ${node.color}20; color: ${node.color};">
                                        <i class="${node.icon}"></i>
                                    </div>
                                    <span class="text-[10px] font-mono text-gray-500 font-bold">FÁZE</span>
                                </div>

                                <div class="space-y-1">
                                    <h3 class="font-bold text-white text-xs md:text-sm leading-snug">${node.title}</h3>
                                    <div class="text-[10px] font-semibold" style="color: ${node.color};">${node.subtitle}</div>
                                    <p class="text-[11px] text-gray-400 leading-relaxed mt-1">${node.desc}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- LIVE SIMULATORS & PLAYGROUNDS -->
            <div class="rounded-3xl bg-[#202225] border border-white/10 p-6 md:p-8 space-y-6 shadow-2xl">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                        <div class="inline-flex items-center gap-1.5 text-xs font-bold text-[#5865F2] uppercase tracking-widest">
                            <i class="fas fa-flask"></i>
                            <span>Interaktivní Pískoviště</span>
                        </div>
                        <h2 class="text-lg md:text-xl font-black text-white">Vyzkoušej si principy Kiscordu naživo</h2>
                    </div>

                    <!-- Simulator Tabs with solid FontAwesome Icons -->
                    <div class="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                        ${[
                            { id: 'coins', icon: 'fas fa-coins text-amber-400', label: 'Love Coins kalkulačka' },
                            { id: 'offline', icon: 'fas fa-wifi text-emerald-400', label: 'Offline Sync simulátor' },
                            { id: 'sunflower', icon: 'fas fa-sun text-yellow-400', label: 'Slunečnice náhled' }
                        ].map(tab => `
                            <button 
                                type="button"
                                data-tab="${tab.id}"
                                onclick="window.manualGuide.setSimulatorTab('${tab.id}')"
                                class="sim-tab-btn px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                                    activeSimulatorTab === tab.id 
                                    ? 'bg-[#5865F2] text-white shadow' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }"
                            >
                                <i class="${tab.icon}"></i>
                                <span>${tab.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Simulator Dynamic Content Area -->
                <div id="simulator-content-area" class="transition-opacity duration-200">
                    <!-- Injected via renderSimulatorContent() -->
                </div>
            </div>

            <!-- SEARCH & CATEGORY FILTER BAR -->
            <div class="sticky top-0 z-20 space-y-3 bg-[var(--bg-primary)]/95 backdrop-blur-xl py-3 border-b border-white/5">
                
                <!-- Search Input -->
                <div class="relative w-full">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input 
                        type="text" 
                        id="manual-search-input" 
                        placeholder="Hledat funkci, kanál, téma, klávesovou zkratku..." 
                        value="${searchQuery}"
                        oninput="window.manualGuide.handleSearch(event)"
                        class="w-full bg-[#202225] text-white text-sm pl-11 pr-10 py-3 rounded-2xl border border-white/10 outline-none focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/20 transition shadow-inner"
                    >
                    ${searchQuery ? `
                        <button type="button" onclick="window.manualGuide.clearSearch()" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>

                <!-- Category Pills -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
                    ${CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return `
                            <button 
                                type="button"
                                data-category="${cat.id}"
                                onclick="window.manualGuide.setCategory('${cat.id}')"
                                class="category-btn px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
                                    isActive 
                                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' 
                                    : 'bg-[#2f3136] text-gray-300 hover:bg-[#36393f] hover:text-white border border-white/5'
                                }"
                            >
                                <span>${cat.name}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- DYNAMIC GUIDE CARDS GRID -->
            <div id="manual-cards-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Cards injected dynamically via updateFilteredList() -->
            </div>

            <!-- KEYBOARD SHORTCUTS & GESTURES CHEAT SHEET -->
            <div class="rounded-2xl bg-[#202225] border border-white/5 p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-bold text-white flex items-center gap-2.5">
                        <i class="fas fa-keyboard text-[#5865F2]"></i>
                        <span>Klávesové zkratky & Gesta</span>
                    </h2>
                    <span class="text-xs text-gray-400">Pro efektivní ovládání</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${SHORTCUTS.map(sc => `
                        <div class="bg-black/20 p-3.5 rounded-xl border border-white/5 flex items-start gap-3">
                            <div class="w-8 h-8 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                                <i class="${sc.icon}"></i>
                            </div>
                            <div class="space-y-1">
                                <div class="font-mono font-bold text-xs text-amber-400 bg-black/40 px-2 py-0.5 rounded border border-white/5 inline-block">
                                    ${sc.key}
                                </div>
                                <p class="text-xs text-gray-300 leading-snug">${sc.desc}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- FAQ ACCORDION -->
            <div class="rounded-2xl bg-[#202225] border border-white/5 p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-bold text-white flex items-center gap-2.5">
                        <i class="fas fa-question-circle text-amber-400"></i>
                        <span>Často kladené otázky (FAQ)</span>
                    </h2>
                    <span class="text-xs text-gray-400">Řešení častých situací</span>
                </div>

                <div class="space-y-3">
                    ${FAQS.map((faq, idx) => `
                        <div class="rounded-xl bg-black/20 border border-white/5 overflow-hidden transition">
                            <button 
                                type="button"
                                onclick="window.manualGuide.toggleFaq(${idx})" 
                                class="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition"
                            >
                                <span class="font-bold text-sm text-white">${faq.q}</span>
                                <i id="faq-icon-${idx}" class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"></i>
                            </button>
                            <div id="faq-ans-${idx}" class="hidden p-4 pt-0 text-xs md:text-sm text-gray-300 leading-relaxed border-t border-white/5 bg-black/10">
                                ${faq.a}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- FOOTER INFO -->
            <div class="text-center py-6 space-y-2 border-t border-white/5 text-xs text-gray-500">
                <p class="font-medium text-gray-400">Kiscord — Vyrobeno s láskou pro Josefa a Klárku ❤️</p>
                <p>Máš nápad na novou funkci nebo vylepšení? Dej vědět Jožkovi nebo zapiš nápad do #společné-questy!</p>
            </div>

        </div>
    `;

    renderSimulatorContent();
    updateFilteredList();
}

/**
 * UI State Sync Helpers for fine-grained DOM updates without page redraws
 */
function updateCategoryPillsUI() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        const isSelected = btn.dataset.category === activeCategory;
        btn.className = `category-btn px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
            isSelected 
            ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' 
            : 'bg-[#2f3136] text-gray-300 hover:bg-[#36393f] hover:text-white border border-white/5'
        }`;
    });
}

function updateFlywheelNodesUI() {
    const resetBtn = document.getElementById('flywheel-reset-btn');
    if (resetBtn) {
        resetBtn.classList.toggle('hidden', !activeFlywheelNode);
    }

    document.querySelectorAll('.flywheel-node-card').forEach(card => {
        const isSelected = card.dataset.node === activeFlywheelNode;
        card.className = `flywheel-node-card cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
            isSelected 
            ? 'bg-black/50 border-amber-400 shadow-lg shadow-amber-400/20 scale-105' 
            : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/30'
        }`;
    });
}

function updateExplorationUI() {
    const explored = getExploredChannels();
    const explorationPct = Math.min(100, Math.round((explored.length / KEY_CHANNELS.length) * 100));

    const pctEl = document.getElementById('exploration-pct-text');
    if (pctEl) pctEl.textContent = `${explorationPct}%`;

    const barEl = document.getElementById('exploration-progress-bar');
    if (barEl) barEl.style.width = `${explorationPct}%`;

    const descEl = document.getElementById('exploration-desc-text');
    if (descEl) {
        descEl.innerHTML = `
            <span>Navštíveno: <strong class="text-white">${explored.length}</strong> / ${KEY_CHANNELS.length} modulů</span>
            ${explorationPct === 100 ? '<span class="text-emerald-400 font-bold">Dokončeno! 🏆</span>' : '<span>Zbývá ' + (KEY_CHANNELS.length - explored.length) + '</span>'}
        `;
    }
}

/**
 * Render dynamic active simulator tab without whole-page redraws
 */
function renderSimulatorContent() {
    const container = document.getElementById('simulator-content-area');
    if (!container) return;

    if (activeSimulatorTab === 'coins') {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-black/25 p-6 rounded-2xl border border-white/5 animate-fade-in">
                
                <!-- Inputs -->
                <div class="space-y-4">
                    <h3 class="font-bold text-white text-sm flex items-center gap-2">
                        <i class="fas fa-sliders-h text-amber-400"></i>
                        <span>Nastav si dnešní aktivitu:</span>
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">💧 Vypito vody: <strong id="sim-val-water" class="text-sky-400">${simCoinsState.water} / 8 kapek</strong></span>
                                <span class="text-amber-400 text-[11px] font-mono">${simCoinsState.water >= 8 ? '+5 mincí (Bonus)' : '+' + simCoinsState.water + ' mincí'}</span>
                            </div>
                            <input type="range" min="0" max="8" value="${simCoinsState.water}" oninput="window.manualGuide.updateSimCoins('water', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">🌿 Splněno návyků: <strong id="sim-val-habits" class="text-emerald-400">${simCoinsState.habits} z 5</strong></span>
                                <span class="text-amber-400 text-[11px] font-mono">+${simCoinsState.habits * 2} mincí</span>
                            </div>
                            <input type="range" min="0" max="5" value="${simCoinsState.habits}" oninput="window.manualGuide.updateSimCoins('habits', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">🏋️‍♂️ Trénink v posilovně:</span>
                                <span class="text-amber-400 text-[11px] font-mono">${simCoinsState.gym ? '+10 mincí' : '+0 mincí'}</span>
                            </div>
                            <div class="flex gap-2">
                                <button type="button" onclick="window.manualGuide.updateSimCoins('gym', 1)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${simCoinsState.gym ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Ano (Trénoval/a)</button>
                                <button type="button" onclick="window.manualGuide.updateSimCoins('gym', 0)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${!simCoinsState.gym ? 'bg-white/10 border-white/20 text-white shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Rest day</button>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">🤔 Denní otázka pro pár:</span>
                                <span class="text-amber-400 text-[11px] font-mono">${simCoinsState.question ? '+3 mince' : '+0 mincí'}</span>
                            </div>
                            <div class="flex gap-2">
                                <button type="button" onclick="window.manualGuide.updateSimCoins('question', 1)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${simCoinsState.question ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Zodpovězena</button>
                                <button type="button" onclick="window.manualGuide.updateSimCoins('question', 0)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${!simCoinsState.question ? 'bg-white/10 border-white/20 text-white shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">Nezodpovězena</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Result & Voucher Affordability -->
                <div id="sim-coins-result" class="space-y-4 flex flex-col justify-between">
                    <!-- Injected by renderCoinsCalculatorResult() -->
                </div>
            </div>
        `;
        renderCoinsCalculatorResult();
    } else if (activeSimulatorTab === 'offline') {
        container.innerHTML = `
            <div class="bg-black/25 p-6 rounded-2xl border border-white/5 space-y-6 animate-fade-in">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div>
                        <h3 class="font-bold text-white text-sm">Simulátor chování PWA mezipaměti & fronty</h3>
                        <p class="text-xs text-gray-400">Vyzkoušej si, co se stane, když ztratíš signál v metru a zapíšeš trénink nebo vodu.</p>
                    </div>
                    <div id="sim-network-badge">
                        <!-- Injected -->
                    </div>
                </div>

                <div id="sim-offline-body" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <!-- Injected -->
                </div>
            </div>
        `;
        renderOfflineSimulatorResult();
    } else if (activeSimulatorTab === 'sunflower') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/25 p-6 rounded-2xl border border-white/5 items-center animate-fade-in">
                <div class="space-y-4">
                    <div>
                        <h3 class="font-bold text-white text-sm">Živý náhled reakce autentické Slunečnice</h3>
                        <p class="text-xs text-gray-300 leading-relaxed mt-1">
                            Slunečnice na <strong class="text-pink-400 cursor-pointer hover:underline" onclick="window.switchChannel('dashboard')">Můj Den</strong> je živý SVG organismus s 27 zlatými okvětními lístky, dynamickým stonkem s listy a hřejivým spánkovým jádrem.
                        </p>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">Náladoměr (1–10): <strong id="sim-sf-mood-val" class="text-pink-400">${simSunflowerState.mood}/10</strong></span>
                                <span class="text-[10px] text-gray-400">Ovlivňuje počet lístků</span>
                            </div>
                            <input type="range" min="1" max="10" value="${simSunflowerState.mood}" oninput="window.manualGuide.updateSimSunflower('mood', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">Délka spánku: <strong id="sim-sf-sleep-val" class="text-amber-400">${simSunflowerState.sleepHours} hod</strong></span>
                                <span class="text-[10px] text-gray-400">Jádro & Záře při ≥7h</span>
                            </div>
                            <input type="range" min="0" max="10" value="${simSunflowerState.sleepHours}" oninput="window.manualGuide.updateSimSunflower('sleep', this.value)" class="custom-range">
                        </div>

                        <div>
                            <div class="flex justify-between text-xs font-semibold mb-1.5">
                                <span class="text-gray-300">Vypitá voda: <strong id="sim-sf-water-val" class="text-sky-400">${simSunflowerState.water}/8 kapek</strong></span>
                                <span class="text-[10px] text-gray-400">Růst listů na stonku</span>
                            </div>
                            <input type="range" min="0" max="8" value="${simSunflowerState.water}" oninput="window.manualGuide.updateSimSunflower('water', this.value)" class="custom-range">
                        </div>

                        <div>
                            <span class="block text-xs font-semibold text-gray-300 mb-1.5">Režim spánku:</span>
                            <div class="flex gap-2">
                                <button type="button" onclick="window.manualGuide.updateSimSunflower('sleeping', false)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${!simSunflowerState.isSleeping ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">☀️ Vzhůru (Otevřené oči)</button>
                                <button type="button" onclick="window.manualGuide.updateSimSunflower('sleeping', true)" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${simSunflowerState.isSleeping ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">🌙 Spí (Zzz & Náklon)</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Authentic Live Sunflower Visual Preview Container -->
                <div id="sim-sunflower-visual" class="flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl border border-white/5 min-h-[220px]">
                    <!-- Injected -->
                </div>
            </div>
        `;
        renderSunflowerPreviewResult();
    }
}

function renderCoinsCalculatorResult() {
    const container = document.getElementById('sim-coins-result');
    if (!container) return;

    // Update labels
    const wEl = document.getElementById('sim-val-water');
    if (wEl) wEl.textContent = `${simCoinsState.water} / 8 kapek`;
    const hEl = document.getElementById('sim-val-habits');
    if (hEl) hEl.textContent = `${simCoinsState.habits} z 5`;

    const totalCoins = (simCoinsState.water >= 8 ? 5 : simCoinsState.water) + 
                       (simCoinsState.habits * 2) + 
                       (simCoinsState.gym ? 10 : 0) + 
                       (simCoinsState.question ? 3 : 0);

    const affordable = VOUCHER_PRICES.filter(v => v.cost <= totalCoins);

    container.innerHTML = `
        <div class="bg-gradient-to-br from-amber-500/15 via-pink-500/10 to-transparent p-5 rounded-2xl border border-amber-400/30 space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Dnešní zisk:</span>
                <span class="text-2xl font-black text-amber-300 font-mono flex items-center gap-1.5">
                    <i class="fas fa-coins text-amber-400"></i> +${totalCoins} LC
                </span>
            </div>

            <p class="text-xs text-gray-300 leading-relaxed">
                Za dnešní disciplínu si můžeš v <span class="text-rose-400 font-bold">#obchůdku</span> rovnou koupit:
            </p>

            <div class="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                ${affordable.length > 0 ? affordable.map(v => `
                    <div class="flex items-center justify-between text-xs bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                        <span class="text-white font-medium truncate">${v.title}</span>
                        <span class="text-amber-400 font-bold font-mono text-[11px] flex-shrink-0">${v.cost} LC</span>
                    </div>
                `).join('') : `
                    <p class="text-xs text-gray-400 italic">Přidej ještě pár kapek vody nebo návyk a odemkneš první romantický voucher!</p>
                `}
            </div>

            <button type="button" onclick="window.switchChannel('love-shop')" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 active:scale-95">
                <i class="fas fa-store"></i>
                <span>Přejít do Mývalí Tržnice</span>
            </button>
        </div>
    `;
}

function renderOfflineSimulatorResult() {
    const badge = document.getElementById('sim-network-badge');
    const body = document.getElementById('sim-offline-body');
    if (!badge || !body) return;

    badge.innerHTML = simOfflineState.isOnline ? `
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Online (Supabase připojen)
        </span>
    ` : `
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-red-400"></span>
            Offline (Bez signálu)
        </span>
    `;

    body.innerHTML = `
        <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
            <span class="text-xs font-bold text-gray-300">1. Stav sítě</span>
            <div class="flex flex-col gap-2">
                <button type="button" onclick="window.manualGuide.simToggleOffline(false)" class="py-2 rounded-lg text-xs font-bold border transition ${!simOfflineState.isOnline ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">
                    🚇 Vypnout síť (Simulace metra)
                </button>
                <button type="button" onclick="window.manualGuide.simToggleOffline(true)" class="py-2 rounded-lg text-xs font-bold border transition ${simOfflineState.isOnline ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'}">
                    📶 Obnovit Wi-Fi / 4G
                </button>
            </div>
        </div>

        <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
            <span class="text-xs font-bold text-gray-300">2. Provedená akce</span>
            <button type="button" onclick="window.manualGuide.simAddOfflineAction()" class="w-full py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow">
                <i class="fas fa-plus"></i>
                <span>Zapsat sérii v gymu</span>
            </button>
            <div class="text-[11px] text-gray-400">
                Položek ve frontě: <strong class="text-white font-mono">${simOfflineState.queueCount}</strong>
            </div>
        </div>

        <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3 flex flex-col justify-between">
            <div>
                <span class="text-xs font-bold text-gray-300">3. Stav synchronizace</span>
                <p class="text-[11px] text-gray-400 mt-1">
                    ${simOfflineState.isSyncing ? 'Synchronizuji data se serverem...' : 
                      simOfflineState.queueCount > 0 ? (simOfflineState.isOnline ? 'Čeká na odeslání do Supabase' : 'Uloženo bezpečně v IndexedDB') : 'Všechna data jsou synchronizována'}
                </p>
            </div>

            <button 
                type="button"
                onclick="window.manualGuide.simFlushQueue()" 
                ${simOfflineState.queueCount === 0 || !simOfflineState.isOnline || simOfflineState.isSyncing ? 'disabled' : ''}
                class="w-full py-2 rounded-lg text-xs font-bold transition ${
                    simOfflineState.queueCount > 0 && simOfflineState.isOnline 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-95' 
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }"
            >
                ${simOfflineState.isSyncing ? '<i class="fas fa-spinner fa-spin mr-1"></i> Odesílám...' : '🚀 Odeslat frontu do cloudu'}
            </button>
        </div>
    `;
}

function renderSunflowerPreviewResult() {
    const container = document.getElementById('sim-sunflower-visual');
    if (!container) return;

    // Update labels
    const mEl = document.getElementById('sim-sf-mood-val');
    if (mEl) mEl.textContent = `${simSunflowerState.mood}/10`;
    const sEl = document.getElementById('sim-sf-sleep-val');
    if (sEl) sEl.textContent = `${simSunflowerState.sleepHours} hod`;
    const wEl = document.getElementById('sim-sf-water-val');
    if (wEl) wEl.textContent = `${simSunflowerState.water}/8 kapek`;

    const sfData = {
        mood: simSunflowerState.mood,
        sleep: simSunflowerState.sleepHours,
        water: simSunflowerState.water,
        bedtime: simSunflowerState.isSleeping ? new Date().toISOString() : null,
        movement: []
    };

    const moodEmoji = simSunflowerState.mood >= 8 ? '😄 Skvělá' : simSunflowerState.mood >= 5 ? '🙂 Dobrá' : '🥺 Unavená';

    container.innerHTML = `
        <div class="transform scale-90 sm:scale-100 transition-all duration-300 flex items-center justify-center">
            ${generateSunflowerSVG(sfData, false)}
        </div>

        <div class="text-center mt-3 space-y-1 border-t border-white/5 pt-2 w-full">
            <span class="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                <span>Nálada: ${simSunflowerState.mood}/10 (${moodEmoji})</span>
            </span>
            <span class="text-[11px] text-gray-400 font-medium">
                ${simSunflowerState.isSleeping ? '🌙 Partner právě spí (Zzz režim aktivní)' : '☀️ Partner je vzhůru a aktivní'}
            </span>
        </div>
    `;
}

/**
 * Filtrování a vykreslení karet na základě vyhledávání, kategorie a zvolené perspektivy
 */
function updateFilteredList() {
    const container = document.getElementById("manual-cards-container");
    if (!container) return;

    const filtered = GUIDE_ITEMS.filter(item => {
        // Perspective filter
        if (activePerspective !== 'all' && item.perspectives && !item.perspectives.includes(activePerspective)) {
            return false;
        }

        // Category filter
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        if (!matchesCategory) return false;

        if (!searchQuery) return true;

        const textToSearch = `${item.title} ${item.channelName} ${item.summary} ${item.bullets.join(' ')} ${item.keywords} ${item.proTip || ''}`.toLowerCase();
        return textToSearch.includes(searchQuery);
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12 text-center bg-[#202225]/50 rounded-2xl border border-white/5">
                <i class="fas fa-search text-4xl text-gray-500 mb-3"></i>
                <h3 class="text-lg font-bold text-white">Nebyly nalezeny žádné výsledky</h3>
                <p class="text-xs text-gray-400 mt-1">Zkus upravit hledaný výraz "${searchQuery}" nebo přepnout perspektivu či kategorii.</p>
                <button type="button" onclick="window.manualGuide.clearSearch()" class="mt-4 px-4 py-2 rounded-xl bg-[#5865F2] text-white text-xs font-bold shadow-md hover:bg-[#4752C4] transition">
                    Zrušit filtr vyhledávání
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="flex flex-col justify-between bg-[#2f3136] rounded-2xl border border-white/5 hover:border-white/15 p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 group">
            
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-black/30 border border-white/5 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                            <i class="${item.icon}"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-white text-base md:text-lg group-hover:text-[#5865F2] transition-colors">
                                ${item.title}
                            </h3>
                            <span class="text-xs font-mono text-gray-400">${item.channelName}</span>
                        </div>
                    </div>

                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold border ${item.badgeColor} whitespace-nowrap">
                        ${item.badge}
                    </span>
                </div>

                <!-- Summary -->
                <p class="text-xs md:text-sm text-gray-300 leading-relaxed">
                    ${item.summary}
                </p>

                <!-- Bullets -->
                <ul class="space-y-1.5 text-xs text-gray-300">
                    ${item.bullets.map(b => `
                        <li class="flex items-start gap-2">
                            <span class="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                            <span class="leading-relaxed">${b}</span>
                        </li>
                    `).join('')}
                </ul>

                <!-- Pro Tip -->
                ${item.proTip ? `
                    <div class="bg-black/25 rounded-xl p-3 border border-amber-400/20 flex items-start gap-2.5 text-xs text-amber-200/90">
                        <i class="fas fa-lightbulb text-amber-400 mt-0.5 flex-shrink-0"></i>
                        <div class="leading-snug">
                            <strong class="text-amber-400">Pro-Tip:</strong> ${item.proTip}
                        </div>
                    </div>
                ` : ''}

                <!-- Related Channels Tags -->
                ${item.relatedChannels && item.relatedChannels.length > 0 ? `
                    <div class="pt-2 flex flex-wrap items-center gap-1.5">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Související:</span>
                        ${item.relatedChannels.map(rel => `
                            <button 
                                type="button"
                                onclick="window.manualGuide.jumpToChannel('${rel.id}')"
                                class="px-2 py-0.5 rounded-md bg-black/40 hover:bg-[#5865F2]/20 hover:text-[#5865F2] border border-white/5 text-[10px] font-medium text-gray-400 transition"
                            >
                                ${rel.name}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <!-- Footer Action Button -->
            <div class="pt-5 mt-4 border-t border-white/5 flex items-center justify-between">
                <span class="text-[11px] text-gray-400">
                    Kanál: <code class="text-gray-300 font-mono font-bold">${item.channelName}</code>
                </span>
                <button 
                    type="button"
                    onclick="window.manualGuide.jumpToChannel('${item.channelId}')"
                    class="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
                >
                    <span>Přejít do kanálu</span>
                    <i class="fas fa-arrow-right text-[10px]"></i>
                </button>
            </div>

        </div>
    `).join('');
}
