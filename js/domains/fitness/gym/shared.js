import { supabase } from '@core/supabase.js';
import { state, ensureGymData } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { playChime, playBeep } from '@core/sound.js';
import { showNotification } from '@core/theme.js';

import { createSignal } from '@core/signals.js';

// --- ACTIVE WORKOUT STATE & SIGNALS ---
export const ACTIVE_WORKOUT_KEY = 'kiscord_active_workout';
export let activeWorkout = null;
export let activeTab = 'templates'; // 'templates' | 'feed' | 'prs' | 'exercises'
export let subscription = null;
export let stopwatchInterval = null;
export let restTimerInterval = null;
export let restTimeRemaining = 0;
export let restTimeDuration = 90; // Default 90 seconds
export let isRestTimerRunning = false;
export let restStartedAt = null;

// Reactive Signals
export const [stopwatchSignal, setStopwatchSignal] = createSignal(0);
export const [restTimerSignal, setRestTimerSignal] = createSignal({ remaining: 0, duration: 90, isRunning: false });
export const [activeWorkoutSignal, setActiveWorkoutSignal] = createSignal(null);

// Setters (needed because ES module exports are read-only bindings for importers)
export function setActiveWorkout(val) { 
    activeWorkout = val; 
    setActiveWorkoutSignal(val);
}
export function setActiveTab(val) { activeTab = val; }
export function setSubscription(val) { subscription = val; }
export function setStopwatchInterval(val) { stopwatchInterval = val; }
export function setRestTimerInterval(val) { restTimerInterval = val; }
export function setRestTimeRemaining(val) { 
    restTimeRemaining = val; 
    setRestTimerSignal({ remaining: val, duration: restTimeDuration, isRunning: isRestTimerRunning });
}
export function setRestTimeDuration(val) { 
    restTimeDuration = val; 
    setRestTimerSignal({ remaining: restTimeRemaining, duration: val, isRunning: isRestTimerRunning });
}
export function setIsRestTimerRunning(val) { 
    isRestTimerRunning = val; 
    setRestTimerSignal({ remaining: restTimeRemaining, duration: restTimeDuration, isRunning: val });
}
export function setRestStartedAt(val) { restStartedAt = val; }


// --- USER / PARTNER IDENTITY HELPERS ---
// Use these everywhere instead of hardcoded name comparisons

export function getMyName() {
    return state.currentUser?.name || 'Já';
}

export function getPartnerName() {
    const me = state.currentUser?.name;
    if (me === 'Jožka') return 'Klárka';
    if (me === 'Klárka') return 'Jožka';
    return 'Partner';
}

export function getMyEmoji() {
    return state.currentUser?.name === 'Klárka' ? '👸' : '🦝';
}

export function getPartnerEmoji() {
    return state.currentUser?.name === 'Klárka' ? '🦝' : '👸';
}

// --- DEFAULT DATABASE SEED DATA (350+ Curated Exercises with GymVisual GIFs) ---
export const defaultExercises = [
    {
        id: "bench_press",
        name: "Barbell Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Přední ramena"],
        instructions: "Lehněte si na rovnou lavici, lopatky stáhněte k sobě a dolů. Osu spusťte kontrolovaně ke spodní části hrudníku a s výdechem plynule vytlačte nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0025-EIeI8Vf.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "dumbbell_bench_press",
        name: "Dumbbell Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Přední ramena"],
        instructions: "Lehněte si na rovnou lavici. Spouštějte jednoručky kontrolovaně do úrovně hrudníku s roztažením prsních svalů a plynule vytlačte zpět.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0289-SpYC0Kp.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "incline_barbell_bench",
        name: "Incline Barbell Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Horní hrudník","Přední ramena","Triceps"],
        instructions: "Lavici nastavte na úhel 30–45°. Osu spouštějte k horní části hrudníku (klíční kosti) a vytlačujte nahoru bez propínání loktů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0047-3TZduzM.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "incline_dumbbell_press",
        name: "Incline Dumbbell Press",
        category: "Hrudník",
        secondary_muscles: ["Horní hrudník","Přední ramena","Triceps"],
        instructions: "Na lavici se sklonem 30–45° spouštějte jednoručky po stranách hrudníku a vytlačujte je nahoru do jemného dotyku nad horními prsy.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0314-ns0SIbU.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "decline_barbell_bench",
        name: "Decline Barbell Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Spodní hrudník","Triceps"],
        instructions: "V leže hlavou dolů spouštějte činku ke spodní linii prsou. Skvělý cvik na plnost a spodní okraj prsních svalů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0033-GrO65fd.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "decline_dumbbell_press",
        name: "Decline Dumbbell Press",
        category: "Hrudník",
        secondary_muscles: ["Spodní hrudník","Triceps"],
        instructions: "Hlavou dolů kontrolovaně spouštějte jednoručky a silou spodních prsou vytlačujte nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0301-DwhEmmE.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "dumbbell_flys",
        name: "Flat Dumbbell Flys",
        category: "Hrudník",
        secondary_muscles: ["Přední ramena"],
        instructions: "S mírně pokrčenými lokty spouštějte jednoručky do stran, dokud neucítíte intenzivní protažení prsních svalů, poté stáhněte zpět.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0308-yz9nUhF.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "incline_dumbbell_flys",
        name: "Incline Dumbbell Flys",
        category: "Hrudník",
        secondary_muscles: ["Horní hrudník","Přední ramena"],
        instructions: "Na šikmé lavici rozpažujte paže obloukem do stran a v horní pozici zatněte horní část prsních svalů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0319-ESOd5Pl.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "decline_dumbbell_flys",
        name: "Decline Dumbbell Flys",
        category: "Hrudník",
        secondary_muscles: ["Spodní hrudník"],
        instructions: "Rozpažujte činky na negativně skloněné lavici s důrazem na protažení a zacílení spodních vláken prsního svalu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0305-cwsAI4G.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "cable_crossover",
        name: "Cable Crossover (High to Low)",
        category: "Hrudník",
        secondary_muscles: ["Vnitřní hrudník","Přední ramena"],
        instructions: "Stůjte mírně nakloněni dopředu mezi kladkami. Plynule stahujte madla před tělo a v dolní fázi zkřižte zápěstí pro maximální stisk.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0227-Pr9Rhf4.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "cable_incline_fly",
        name: "Low Cable Flys (Upper Chest)",
        category: "Hrudník",
        secondary_muscles: ["Horní hrudník","Přední ramena"],
        instructions: "Z dolní polohy kladek táhněte madla obloukem zespodu nahoru před hrudník se silným zatnutím klíční části prsních svalů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0179-FVmZVhk.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "chest_dips",
        name: "Chest Dips",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Přední ramena"],
        instructions: "Předkloňte trup dopředu a lokty držte mírně od těla. Klesejte do pravého úhlu v loktech a vytlačte se nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0251-9WTm7dq.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "push_ups",
        name: "Push-ups",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Střed těla","Přední ramena"],
        instructions: "Dlaně na šířku ramen, tělo jako struna. Klesejte hrudníkem k zemi a silou prsou a paží se vytlačte nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-I4hDWkc.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "diamond_push_ups",
        name: "Diamond Push-ups",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Vnitřní hrudník"],
        instructions: "Spojte palce a ukazováčky pod hrudníkem do tvaru diamantu. Výborný cvik na triceps a středovou část prsou.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0302-xXm4nYq.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "pec_deck",
        name: "Pec Deck Machine (Butterfly)",
        category: "Hrudník",
        secondary_muscles: ["Přední ramena"],
        instructions: "Pevně opřete záda o lavičku stroje. Plynule svírejte ramena stroje před hrudníkem a na 1 sekundu stlačte prsa k sobě.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0596-v3xmPAR.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "chest_press_machine",
        name: "Machine Chest Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Přední ramena"],
        instructions: "Nastavte výšku sedáku tak, aby madla byla v úrovni prsou. Vytlačujte zátěž dopředu s plnou kontrolou.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0576-DOoWcnA.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "smith_bench_press",
        name: "Smith Machine Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Přední ramena"],
        instructions: "Vedená dráha činky umožňuje bezpečné zacílení prsních svalů i bez sparingpartnera až do absolutního selhání.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0748-trqKQv2.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "smith_incline_press",
        name: "Smith Machine Incline Press",
        category: "Hrudník",
        secondary_muscles: ["Horní hrudník","Přední ramena","Triceps"],
        instructions: "Nastavte lavičku do multipressu a zaměřte se na horní prsa s perfektní kontrolou tempa.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0757-5v7KYld.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "deadlift",
        name: "Barbell Conventional Deadlift",
        category: "Záda",
        secondary_muscles: ["Hýždě","Hamstringy","Trapézy","Vzpřimovače páteře"],
        instructions: "Osa nad středy chodidel, rovná záda, zpevněný trup. Zvedejte osu plynulým tahem nohou a pánve.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0032-ila4NZS.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "sumo_deadlift",
        name: "Barbell Sumo Deadlift",
        category: "Záda",
        secondary_muscles: ["Hýždě","Vnitřní stehna","Spodní záda"],
        instructions: "Široký postoj, špičky vytočené do stran. Vzpřímený trup zapojuje více nohy a hýždě s menším zatížením beder.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0118-SzX3uzM.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "pull_ups",
        name: "Pull-ups (Overhand Grip)",
        category: "Záda",
        secondary_muscles: ["Biceps","Zadní ramena","Předloktí"],
        instructions: "Široký úchop nadhmatem. Z plného visu táhněte hrudník k hrazdě, lokty stahujte k tělu a lopatky k sobě.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0652-lBDjFxJ.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "chin_ups",
        name: "Chin-ups (Underhand Grip)",
        category: "Záda",
        secondary_muscles: ["Biceps","Široký zádový sval"],
        instructions: "Úchop podhmatem na šířku ramen. Masivně zapojuje bicepsy i spodní zádové svaly.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0253-G70mEAJ.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "lat_pulldown",
        name: "Wide-Grip Lat Pulldown",
        category: "Záda",
        secondary_muscles: ["Biceps","Zadní ramena"],
        instructions: "Mírný záklon, hrudník vypnutý. Tyč stahujte k horní části hrudníku a v dolní pozici zatněte křídla.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0198-RVwzP10.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "lat_pulldown_close",
        name: "Cable Straight Arm Pulldown",
        category: "Záda",
        secondary_muscles: ["Biceps","Mezilopatkové svaly"],
        instructions: "Úzký neutrální úchop. Adaptér stahujte ke klíčním kostem pro hluboké protažení a šířku zad.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0238-x69MAlq.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "barbell_rows",
        name: "Barbell Bent-Over Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Trapézy","Zadní ramena"],
        instructions: "Předklon 45° s rovnými zády. Přitahujte osu k pupku, lokty veďte těsně podél těla.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0027-eZyBC3j.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "pendlay_row",
        name: "Pendlay Row",
        category: "Záda",
        secondary_muscles: ["Trapézy","Biceps","Vzpřimovače páteře"],
        instructions: "Trup rovnoběžně se zemí. Každé opakování začíná z podlahy výbušným přitažením k hrudníku.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0069-gfk9kD4.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "dumbbell_row_one_arm",
        name: "Dumbbell One Arm Bent-over Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Zadní ramena"],
        instructions: "Jedno koleno a dlaň na lavičce. Přitahujte činku obloukem k boku a stáhněte lopatku.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0292-C0MA9bC.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "seated_cable_row",
        name: "Seated Cable Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Mezilopatkové svaly","Zadní ramena"],
        instructions: "Sedněte si rovně, hrudník dopředu. Táhněte madlo k pasu a silně stiskněte mezilopatkové svaly.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0239-Tq6gbK6.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "t_bar_row",
        name: "T-Bar Row",
        category: "Záda",
        secondary_muscles: ["Trapézy","Biceps","Střed těla"],
        instructions: "Pevný postoj v předklonu. Zvedejte T-osu k hrudníku pro budování maximální tloušťky zad.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0808-4OaumBr.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "chest_supported_row",
        name: "Chest-Supported Incline Row",
        category: "Záda",
        secondary_muscles: ["Zadní ramena","Biceps","Mezilopatkové svaly"],
        instructions: "Lehněte si břichem na šikmou lavici. Eliminujete zatížení spodních zad a čistě izolujete mezilopatkové svaly.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0335-xMjBKwn.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "straight_arm_pulldown",
        name: "Straight-Arm Cable Pullover",
        category: "Záda",
        secondary_muscles: ["Dlouhá hlava tricepsu","Pilovitý sval"],
        instructions: "S lehkým pokrčením v loktech stlačujte tyč obloukem dolů ke stehnům pro izolaci latissimů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0237-DT14T9T.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "dumbbell_pullover",
        name: "Dumbbell Pullover",
        category: "Záda",
        secondary_muscles: ["Hrudník","Triceps","Pilovitý sval"],
        instructions: "Lehněte si horní částí zad napříč přes lavici. Spouštějte činku za hlavu do hlubokého protažení.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0375-9XjtHvS.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "hyperextension",
        name: "Hyperextension (on Bench)",
        category: "Záda",
        secondary_muscles: ["Hýždě","Hamstringy","Vzpřimovače páteře"],
        instructions: "Na šikmé lavici klesejte trupem dolů a plynule se narovnejte do roviny bez nadměrného prohnutí v bedrech.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0488-zkgRrbK.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "good_mornings",
        name: "Barbell Good Mornings",
        category: "Záda",
        secondary_muscles: ["Hamstringy","Hýždě","Vzpřimovače páteře"],
        instructions: "Činka na trapézech. S lehkým pokrčením kolen tlačte boky dozadu a předklánějte se v kyčlích.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0044-XlZ4lAC.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "shrugs_barbell",
        name: "Barbell Shrug",
        category: "Záda",
        secondary_muscles: ["Horní trapézy"],
        instructions: "Ve stoji zvedejte ramena přímo vzhůru k uším bez rotace ramen a nahoře zatněte trapézy.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0095-dG7tG5y.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "shrugs_dumbbell",
        name: "Dumbbell Shrug",
        category: "Záda",
        secondary_muscles: ["Horní trapézy"],
        instructions: "Držte jednoručky podél těla a zvedejte ramena nahoru s 1sekundovou výdrží v kontrakci.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0406-NJzBsGJ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "military_press",
        name: "Barbell Overhead Press (OHP)",
        category: "Ramena",
        secondary_muscles: ["Přední ramena","Triceps","Střed těla"],
        instructions: "Stůjte pevně, zpevněte břicho i hýždě. Vytlačte osu z klíčních kostí přímo nad hlavu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0091-kTbSH9h.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "shoulder_press_dumbbell",
        name: "Seated Dumbbell Shoulder Press",
        category: "Ramena",
        secondary_muscles: ["Přední ramena","Triceps","Horní hrudník"],
        instructions: "Sedněte si s oporou zad. Vytlačujte jednoručky nad hlavu do jemného dotyku nahoře.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0405-znQUdHY.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "arnold_press",
        name: "Arnold Press",
        category: "Ramena",
        secondary_muscles: ["Přední a střední ramena","Triceps"],
        instructions: "Začněte s dlaněmi k obličeji. Během tlaku vzhůru vytáčejte dlaně dopředu a nahoře propněte.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0286-izMnLqz.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "lateral_raises",
        name: "Dumbbell Lateral Raises",
        category: "Ramena",
        secondary_muscles: ["Trapézy"],
        instructions: "Mírný předklon, lokty lehce pokrčené. Zvedejte paže do stran do úrovně ramen, malíčky mírně nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0334-DsgkuIt.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "seated_lateral_raises",
        name: "Seated Dumbbell Lateral Raises",
        category: "Ramena",
        secondary_muscles: ["Střední ramena"],
        instructions: "Sedněte si na lavičku, eliminujte kmitání nohou a čistě zvedejte činky do stran do roviny ramen.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0403-lyKCLmK.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "cable_lateral_raise",
        name: "Cable Lateral Raise",
        category: "Ramena",
        secondary_muscles: ["Střední ramena"],
        instructions: "Tahem lanka do strany udržujte konstantní tenzi ve svalu po celé dráze pohybu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0190-YTur5nR.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "incline_lateral_raise",
        name: "Incline Lying Lateral Raise",
        category: "Ramena",
        secondary_muscles: ["Střední ramena"],
        instructions: "Lehněte si na bok na šikmou lavici. Extrémní zatížení středního deltového svalu v natažené pozici.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0320-ByX0WxV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "front_raises_dumbbell",
        name: "Dumbbell Full Can Lateral Raise",
        category: "Ramena",
        secondary_muscles: ["Přední ramena"],
        instructions: "Střídavě zvedejte činky přímo před sebe do výšky očí s mírně pokrčenými lokty.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0311-AQ0mC4Y.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "front_barbell_raise",
        name: "Barbell Front Raise",
        category: "Ramena",
        secondary_muscles: ["Přední ramena","Horní hrudník"],
        instructions: "Uchopte osu nadhmatem a plynule zvedejte před sebe do úrovně ramen.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0041-b2Uoz54.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "face_pulls",
        name: "Face Pulls (Rope Cable)",
        category: "Ramena",
        secondary_muscles: ["Zadní ramena","Rotátorová manžeta","Trapézy"],
        instructions: "Táhněte lano k očím/čelu s roztažením loktů a vnější rotací ramen pro zdravá a kulatá ramena.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0168-hBGWILP.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "rear_delt_fly_dumbbell",
        name: "Dumbbell Reverse Fly",
        category: "Ramena",
        secondary_muscles: ["Zadní ramena","Mezilopatkové svaly"],
        instructions: "V hlubokém předklonu zvedejte činky do stran a soustřeďte se na izolaci zadní hlavy deltů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0383-EAs3xL9.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "reverse_pec_deck",
        name: "Reverse Pec Deck (Rear Delts)",
        category: "Ramena",
        secondary_muscles: ["Zadní ramena","Trapézy"],
        instructions: "Sedněte si čelem k opěrce stroje. Tlačte ramena stroje dozadu s lehkým pokrčením v loktech.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0579-7F1DVzn.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "cable_rear_delt_fly",
        name: "Cross-Cable Rear Delt Fly",
        category: "Ramena",
        secondary_muscles: ["Zadní ramena","Mezilopatkové svaly"],
        instructions: "Uchopte protilehlá lanka bez madel a táhněte paže křížem do stran a dozadu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0225-P5p0j8B.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "upright_row_barbell",
        name: "Barbell Upright Row V. 2",
        category: "Ramena",
        secondary_muscles: ["Střední ramena","Trapézy"],
        instructions: "Osu tahejte podél těla nahoru k hrudníku, lokty vedou pohyb a směřují vzhůru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0119-83HoW9X.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "upright_row_cable",
        name: "Cable Wrist Curl",
        category: "Ramena",
        secondary_muscles: ["Střední ramena","Trapézy"],
        instructions: "Kladka udržuje plynulý odpor. Táhněte tyč podél trupu k bradě s lokty nahoře.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0247-LrV4s90.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "landmine_press",
        name: "Landmine Shoulder Press",
        category: "Ramena",
        secondary_muscles: ["Horní hrudník","Triceps","Střed těla"],
        instructions: "Jednoručně vytlačujte konec osy nahoru a dopředu. Šetrné k ramenním kloubům.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0573-rUXfn3R.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "squat",
        name: "Barbell Back Squat",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Spodní záda"],
        instructions: "Osa na trapézech, nohy na šířku ramen. Klesejte boky dolů pod úroveň kolen, váha na celých chodidlech.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0043-qXTaZnJ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "front_squat",
        name: "Barbell Front Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Střed těla","Hýždě"],
        instructions: "Osa leží na předních ramenech. Trup držte maximálně vzpřímený pro intenzivní zatížení kvadricepsů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0039-IeTIEqg.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "goblet_squat",
        name: "Goblet Squat (Dumbbell/Kettlebell)",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hýždě","Břicho"],
        instructions: "Činku držte oběma rukama u hrudníku. Dřepujte mezi kolena s rovnými zády a zpevněným břichem.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0312-2NpxjC1.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "bulgarian_split_squat",
        name: "Bulgarian Split Squats",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Kvadricepsy","Hamstringy"],
        instructions: "Jedna noha opřená vzadu o lavičku. Klesejte předním kolenem do pravého úhlu s důrazem na hýždě.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0099-gGNQmVt.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "leg_press",
        name: "Leg Press 45°",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hýždě"],
        instructions: "Chodidla na šířku ramen na středu desky. Spouštějte závaží do 90° v kolenou a plynule vytlačte přes paty.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0740-tj41Nu6.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "hack_squat",
        name: "Hack Squat Machine",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hýždě"],
        instructions: "Opřete se zády o opěrku stroje a klesejte do hlubokého dřepu pro maximální napumpování předních stehen.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0739-10Z2DXU.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "leg_extensions",
        name: "Leg Extensions",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy"],
        instructions: "V sedě zvedejte nohy do úplného propnutí kolen a nahoře na 1 sekundu zatněte kvadricepsy.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0585-my33uHU.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "lying_leg_curls",
        name: "Lying Leg Curls",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Lýtka"],
        instructions: "Lehněte si na břicho, pánev tlačte do podložky a přitahujte válec k hýždím se zatnutím hamstringů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0599-Zg3XY7P.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "seated_leg_curls",
        name: "Seated Leg Curls",
        category: "Nohy",
        secondary_muscles: ["Hamstringy"],
        instructions: "V sedě stlačujte válec pod kolena se silným zatnutím zadní strany stehen v plném rozsahu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0600-PQ2AtC3.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "romanian_deadlift",
        name: "Barbell Romanian Deadlift (RDL)",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Hýždě","Spodní záda"],
        instructions: "Mírně pokrčená kolena. Tlačte boky dozadu a spouštějte osu pod kolena do plného protažení hamstringů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0085-wQ2c4XD.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "dumbbell_rdl",
        name: "Dumbbell Romanian Deadlift (RDL)",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Hýždě"],
        instructions: "S jednoručkami u stehen se předklánějte v kyčlích a plynulým tahem hýždí a hamstringů se vracejte nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0387-gH5fRsC.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "hip_thrust_barbell",
        name: "Isometric Wipers",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy"],
        instructions: "Lopatky opřené o lavičku, osa na bocích. Vytlačujte pánev nahoru do plného propnutí a zatnutí hýždí.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0500-11wrviz.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "glute_bridge",
        name: "Glute Bridge",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy"],
        instructions: "Lehněte si na záda s pokrčenými koleny a zvedejte pánev nahoru se silným stiskem hýždí.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0473-nuBF9MO.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "walking_lunges",
        name: "Walking Dumbbell Lunges",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Kvadricepsy","Hamstringy"],
        instructions: "Dělejte dlouhé kroky dopředu, zadní koleno těsně nad zem. Plynulý krok a rovný trup.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0337-L2V5Nan.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "reverse_lunges",
        name: "Reverse Lunges",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Kvadricepsy"],
        instructions: "Z výchozího stoje ukročte jednou nohou vzad a klesejte kolenem k zemi. Šetrnější ke kolenům.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0078-VaP75jl.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "standing_calf_raise",
        name: "Barbell Standing Calf Raise",
        category: "Nohy",
        secondary_muscles: ["Dvojhlavý sval lýtkový (Gastrocnemius)"],
        instructions: "Z plného protažení paty dolů se zvedněte na špičky a podržte vrcholnou kontrakci na 1 sekundu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1372-8ozhUIZ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "seated_calf_raise",
        name: "Barbell Seated Calf Raise",
        category: "Nohy",
        secondary_muscles: ["Šikmý sval lýtkový (Soleus)"],
        instructions: "V sedě na stroji zvedejte špičky s důrazem na hloubku lýtka a plný rozsah pohybu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0088-ktsFQAZ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "abductor_machine",
        name: "Lever Seated Hip Abduction",
        category: "Nohy",
        secondary_muscles: ["Střední hýžďový sval"],
        instructions: "V sedě tlačte kolena od sebe do stran s krátkou výdrží v maximálním roznožení.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0597-CHpahtl.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "adductor_machine",
        name: "Lever Seated Hip Adduction",
        category: "Nohy",
        secondary_muscles: ["Přitahovače stehen (Vnitřní stehna)"],
        instructions: "Tlačte kolena plynule k sobě a zatněte vnitřní stranu stehen.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0598-oHsrypV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "step_ups",
        name: "Dumbbell Step-Ups",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Kvadricepsy","Lýtka"],
        instructions: "Střídavě vystupujte celým chodidlem na lavičku a zvedejte tělo silou přední nohy.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0415-SxHteRW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "barbell_curl",
        name: "Barbell Bicep Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Stůjte vzpřímeně, lokty u těla. Zvedejte činku k hrudníku plynulým obloukem bez houpání tělem.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0031-25GPyDY.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ez_bar_curl",
        name: "EZ-Bar Bicep Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "EZ osa šetří zápěstí a lokty. Fixujte lokty u těla a táhněte činku silou bicepsů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0447-6TG6x2w.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "dumbbell_curl",
        name: "Dumbbell Biceps Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Při zvedání vytáčejte malíček nahoru (supinace) pro maximální vrchol kontrakce bicepsu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0294-NbVPDMW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "hammer_curls",
        name: "Dumbbell Hammer Curls",
        category: "Ruce",
        secondary_muscles: ["Hluboký sval pažní (Brachialis)","Předloktí"],
        instructions: "Dlaně směřují k sobě po celou dobu. Buduje tloušťku paže a sílu úchopu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0313-slDvUAU.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "incline_dumbbell_curl",
        name: "Incline Dumbbell Bicep Curl",
        category: "Ruce",
        secondary_muscles: ["Dlouhá hlava bicepsu"],
        instructions: "Na lavici s úhlem 45° nechte paže viset kolmo dolů pro extrémní protažení dlouhé hlavy bicepsu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0316-B3Rxp6L.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "preacher_curl",
        name: "Preacher Curl (Scott Bench)",
        category: "Ruce",
        secondary_muscles: ["Krátká hlava bicepsu"],
        instructions: "Opřete nadloktí o šikmou opěrku a eliminujte jakýkoliv souhyb těla pro čistou izolaci bicepsu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0448-DgZQ11d.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "concentration_curl",
        name: "Dumbbell Concentration Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps"],
        instructions: "Loket opřený o vnitřní stranu stehna. Pomalu a čistě zvedejte činku k rameni se zatnutím.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0297-gvsWLQw.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "cable_bicep_curl",
        name: "Low Cable Bicep Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps"],
        instructions: "Kladka poskytuje nepřetržité svalové napětí po celé dráze pohybu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0164-mTT3KLn.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "cable_high_biceps_curl",
        name: "Cable Lying Close-grip Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps"],
        instructions: "Stůjte uprostřed s rozpaženými pažemi a přitahujte madla k uším do vrcholné kontrakce.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0182-61GrD55.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "reverse_barbell_curl",
        name: "Reverse Grip Barbell Curl (Forearms)",
        category: "Ruce",
        secondary_muscles: ["Vřetenní sval (Brachioradialis)","Předloktí"],
        instructions: "Úchop nadhmatem. Extrémně účinný cvik na horní stranu předloktí a sílu úchopu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0080-xNrS20v.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "tricep_rope_pushdown",
        name: "Triceps Rope Pushdown",
        category: "Ruce",
        secondary_muscles: ["Vnější hlava tricepsu"],
        instructions: "Lokty u těla. V dolní fázi roztáhněte konce lana od sebe a propněte paže.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0241-gAwDzB3.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "tricep_bar_pushdown",
        name: "Cable Pushdown (with Rope Attachment)",
        category: "Ruce",
        secondary_muscles: ["Triceps"],
        instructions: "Tlačte tyč přímo dolů do plného uzamčení loktů a na vteřinu zatněte triceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0200-dU605di.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "skull_crushers_ez",
        name: "Barbell Lying Triceps Extension Skull Crusher",
        category: "Ruce",
        secondary_muscles: ["Dlouhá hlava tricepsu"],
        instructions: "V leže na lavici spouštějte osu k čelu a silou tricepsů vytlačte zpět nahoru.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0060-h8LFzo9.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "overhead_dumbbell_extension",
        name: "Overhead Seated Dumbbell Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Dlouhá hlava tricepsu"],
        instructions: "Činku držte oběma rukama nad hlavou a spouštějte za krk do hlubokého protažení.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0417-dPmaUaU.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "cable_overhead_triceps",
        name: "Cable Overhead Triceps Extension (rope Attachment)",
        category: "Ruce",
        secondary_muscles: ["Dlouhá hlava tricepsu"],
        instructions: "Stůjte zády ke kladce, lano táhněte zpoza hlavy dopředu do plného propnutí paží.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0194-2IxROQ1.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "close_grip_bench_press",
        name: "Close-Grip Bench Press",
        category: "Ruce",
        secondary_muscles: ["Triceps","Hrudník","Přední ramena"],
        instructions: "Úchop na šířku ramen, lokty podél těla. Špičkový objemový cvik na tricepsy.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0030-J6Dx1Mu.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "dips_triceps",
        name: "Side Hip Abduction",
        category: "Ruce",
        secondary_muscles: ["Triceps","Hrudník"],
        instructions: "Držte trup vzpřímeně a lokty u těla pro maximální přenesení zátěže na triceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0710-7WaDzyL.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "bench_dips",
        name: "Bench Dips",
        category: "Ruce",
        secondary_muscles: ["Triceps","Přední ramena"],
        instructions: "Ruce opřené za zády o lavičku, nohy před sebou. Klesejte hýžděmi těsně podél lavice.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0139-50BETrz.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "tricep_kickback_dumbbell",
        name: "Dumbbell Incline Twisted Flyes",
        category: "Ruce",
        secondary_muscles: ["Triceps"],
        instructions: "Trup v předklonu, loket vysoko u těla. Zanožujte předloktí dozadu do úplného propnutí.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0331-1PLE8e9.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "wrist_curls_barbell",
        name: "Barbell Wrist Curl V. 2",
        category: "Ruce",
        secondary_muscles: ["Ohybače předloktí"],
        instructions: "Předloktí položte na lavičku a ohýbejte pouze zápěstí nahoru a dolů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0125-6kSxYnw.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "plank",
        name: "Standard Plank (Forearm)",
        category: "Břicho",
        secondary_muscles: ["Střed těla","Ramena","Hýždě"],
        instructions: "Tělo tvoří rovnou přímku. Zpevněte břicho, hýždě i stehna a klidně dýchejte na čas.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0464-CosupLu.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "side_plank",
        name: "Side Plank",
        category: "Břicho",
        secondary_muscles: ["Šikmé břišní svaly","Hýždě"],
        instructions: "Opřete se o jedno předloktí, tělo v přímce. Držte boky nahoře a nepropadejte k zemi.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3544-5VXmnV5.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "hanging_leg_raise",
        name: "Hanging Leg Raises",
        category: "Břicho",
        secondary_muscles: ["Spodní břicho","Ohybače kyčlí"],
        instructions: "Z plného visu zvedejte rovné nohy k hrazdě bez houpání trupem.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0472-I3tsCnC.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "hanging_knee_raise",
        name: "Hanging Knee Raises",
        category: "Břicho",
        secondary_muscles: ["Spodní břicho"],
        instructions: "Ve visu přitahujte pokrčená kolena k hrudníku se stlačením spodního břicha.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0474-pj0X0tF.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "crunches",
        name: "Crunch Floor",
        category: "Břicho",
        secondary_muscles: ["Přímý sval břišní"],
        instructions: "Zvedejte pouze lopatky ze země s výdechem a silným zatnutím břišních svalů.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0274-TFqbd8t.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "cable_crunch",
        name: "Cable Kneeling Crunch",
        category: "Břicho",
        secondary_muscles: ["Přímý sval břišní"],
        instructions: "V kleče držte lano u spánků a sbalujte trup směrem ke kolenům silou břicha.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0175-WW95auq.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ab_wheel_rollout",
        name: "Ab Wheel Rollout",
        category: "Břicho",
        secondary_muscles: ["Hluboký stabilizační systém","Latissimy","Ramena"],
        instructions: "Z kleku se pomalu natahujte dopředu a silou břicha se sbalte zpět do výchozí pozice.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0857-NAgVB3t.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "russian_twist",
        name: "Russian Twist",
        category: "Břicho",
        secondary_muscles: ["Šikmé břišní svaly"],
        instructions: "V mírném záklonu se zvednutýma nohama rotujte trupem a dotýkejte se kotoučem stran.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0687-XVDdcoj.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "bicycle_crunches",
        name: "Bicycle Crunches",
        category: "Břicho",
        secondary_muscles: ["Šikmé břišní svaly","Spodní břicho"],
        instructions: "Střídavě přitahujte protilehlý loket ke kolenu s plynulou rotací trupu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0972-tZkGYZ9.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "mountain_climbers",
        name: "Mountain Climbers",
        category: "Břicho",
        secondary_muscles: ["Střed těla","Kardio","Ramena"],
        instructions: "V pozici vzporu dynamicky přitahujte kolena střídavě k hrudníku.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0630-RJgzwny.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "v_ups",
        name: "V-Ups",
        category: "Břicho",
        secondary_muscles: ["Celé břicho"],
        instructions: "V leže na zádech současně zvedejte rovné nohy i trup a dotkněte se prstů u nohou.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0538-S37C94C.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "lying_leg_raise",
        name: "Lying Floor Leg Raises",
        category: "Břicho",
        secondary_muscles: ["Spodní břicho"],
        instructions: "Pevně přitiskněte bedra k podložce a zvedejte nohy do kolmice.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0590-2KGnL6M.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "decline_sit_ups",
        name: "Decline Bench Sit-ups",
        category: "Břicho",
        secondary_muscles: ["Přímý sval břišní","Ohybače kyčlí"],
        instructions: "Zaklesněte nohy na šikmé lavici a zvedejte trup s plynulým zatnutím břicha.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0282-QLL2gdc.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "woodchopper_cable",
        name: "Cable Twist",
        category: "Břicho",
        secondary_muscles: ["Šikmé břišní svaly","Ramena"],
        instructions: "Táhněte kladku úhlopříčně přes tělo shora dolů s rotací boků a trupu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0243-aVs3BR3.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "burpees",
        name: "Burpees",
        category: "Kardio",
        secondary_muscles: ["Celé tělo","Kardiovaskulární systém"],
        instructions: "Z dřepu do kliku na zemi, odraz zpět do dřepu a výskok s tlesknutím nad hlavou.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0180-hvV79Si.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "jump_rope",
        name: "Jump Rope",
        category: "Kardio",
        secondary_muscles: ["Lýtka","Ramena","Koordinace"],
        instructions: "Skákejte na špičkách s lehkým dopadem a plynulým točením švihadla ze zápěstí.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0798-a8VDgLw.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "kettlebell_swing",
        name: "Kettlebell Swing",
        category: "Kardio",
        secondary_muscles: ["Hýždě","Hamstringy","Spodní záda","Ramena"],
        instructions: "Švih vychází z výbušného pohybu kyčlí dopředu, nikoliv z tahu paží.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0539-yCvYdi7.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "box_jump",
        name: "Standing Behind Neck Press",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hýždě","Lýtka"],
        instructions: "Z podřepu výbušně vyskočte oběma nohama na bednu a měkce dopadněte na celé chodidlo.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0788-xDh0lJr.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "jumping_jacks",
        name: "Jumping Jacks",
        category: "Kardio",
        secondary_muscles: ["Lýtka","Ramena","Kardio"],
        instructions: "Dynamické roznožování s tlesknutím paží nad hlavou v rychlém tempu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0540-osdXT3K.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "high_knees",
        name: "High Knees",
        category: "Kardio",
        secondary_muscles: ["Ohybače kyčlí","Lýtka","Břicho"],
        instructions: "Běhejte na špičkách a zvedejte kolena do výšky pasu s energickým souhybem paží.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0537-vzAxBtt.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "treadmill_running",
        name: "Triceps Dip",
        category: "Kardio",
        secondary_muscles: ["Nohy","Kardiovaskulární systém"],
        instructions: "Plynulý běžecký krok, vzpřímený trup a pravidelné dýchání na zvolenou rychlost a sklon.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0814-X6C6i5Y.gif",
        metric_type: "distance_duration",
        is_default: true
    },
    {
        id: "stationary_bike",
        name: "Stationary Bike",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Kardio"],
        instructions: "Šlapání s nastaveným odporem pro šetrné a účinné kardio bez nárazů na klouby.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2138-H1PESYI.gif",
        metric_type: "distance_duration",
        is_default: true
    },
    {
        id: "air_bike_sprint",
        name: "Air Bike",
        category: "Kardio",
        secondary_muscles: ["Celé tělo","Kvadricepsy","Kardio"],
        instructions: "Zapojte současně nohy i paže pro maximální kalorický výdej a anaerobní kapacitu.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0003-1ZFqTDN.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "battle_ropes",
        name: "Battle Ropes",
        category: "Kardio",
        secondary_muscles: ["Ramena","Ruce","Střed těla"],
        instructions: "V mírném podřepu střídavě či současně vytvářejte vlnění lany s maximální intenzitou.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0128-RJa4tCo.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_archer_push_up",
        name: "Archer Push Up",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena","Střed těla"],
        instructions: "Start in a push-up position with your hands slightly wider than shoulder-width apart. Extend one arm straight out to the side, parallel to the ground. Lower your body by bending your elbows, keeping your back straight and core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3294-A9qxk2F.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_assisted_chest_dip_kneeling",
        name: "Assisted Chest Dip (kneeling)",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Adjust the machine to your desired height and secure your knees on the pad. Grasp the handles with your palms facing down and your arms fully extended. Lower your body by bending your elbows until your upper arms are parallel to the floor.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0009-PAgTVaK.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_assisted_wide_grip_chest_dip_kneeling",
        name: "Assisted Wide-grip Chest Dip (kneeling)",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Adjust the machine to your desired height and secure your knees on the pad. Grasp the handles with a wide grip and keep your elbows slightly bent. Lower your body by bending your elbows until your upper arms are parallel to the floor.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2364-PnZJIrk.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_decline_pullover",
        name: "Barbell Decline Pullover",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Lie down on a decline bench with your head lower than your hips and your feet secured. Hold the barbell with a pronated grip (palms facing away from you) and your hands slightly wider than shoulder-width apart. Extend your arms above your chest, keeping a slight bend in your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1255-9sgNE2O.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_decline_wide_grip_press",
        name: "Barbell Decline Wide-grip Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Lie on a decline bench with your feet secured and your head lower than your hips. Grasp the barbell with a wide grip, slightly wider than shoulder-width apart. Lower the barbell to your chest, keeping your elbows out to the sides.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0036-hl8DUh8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_front_raise_and_pullover",
        name: "Barbell Front Raise and Pullover",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, palms facing down. Keep your arms straight and raise the barbell in front of you until it reaches shoulder height. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0040-33AzZeV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_guillotine_bench_press",
        name: "Barbell Guillotine Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart. Lower the barbell slowly towards your neck, keeping your elbows pointed outwards.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0045-GXoaSgn.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_reverse_grip_decline_bench_press",
        name: "Barbell Reverse Grip Decline Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Lie on a decline bench with your feet secured and your head lower than your hips. Grasp the barbell with a reverse grip, slightly wider than shoulder-width apart. Unrack the barbell and lower it slowly towards your chest, keeping your elbows tucked in.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1256-DotAgEF.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_reverse_grip_incline_bench_press",
        name: "Barbell Reverse Grip Incline Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Set up an incline bench at a 45-degree angle. Lie down on the bench with your feet flat on the ground. Grasp the barbell with a reverse grip, hands slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1257-DU7I633.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_wide_bench_press",
        name: "Barbell Wide Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the barbell with a wide grip, slightly wider than shoulder-width apart. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0122-JsKq9so.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_wide_reverse_grip_bench_press",
        name: "Barbell Wide Reverse Grip Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the barbell with a wide reverse grip, slightly wider than shoulder-width apart. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1258-945zpRg.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_bench_press",
        name: "Cable Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Adjust the cable machine to chest height and attach the handles. Stand facing away from the machine with your feet shoulder-width apart. Grasp the handles with an overhand grip and step forward to create tension in the cables.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0151-7xI5MXA.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_cross_over_variation",
        name: "Cable Cross-over Variation",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Adjust the cable pulleys to chest height. Stand in the center of the cable machine with one foot in front of the other. Grasp the handles with your palms facing down and your arms extended out to the sides.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0155-0CXGHya.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_decline_fly",
        name: "Cable Decline Fly",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Adjust the cable machine to a decline position. Stand facing away from the machine with your feet shoulder-width apart. Hold the handles with your palms facing forward and your arms extended straight out in front of you.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0158-7saC5zz.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_decline_one_arm_press",
        name: "Cable Decline One Arm Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Adjust the cable machine to a decline position. Stand facing away from the machine and grab the handle with one hand. Position yourself with your back against the decline bench and your arm extended straight in front of you.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1260-KHGNa16.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_decline_press",
        name: "Cable Decline Press",
        category: "Hrudník",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Adjust the cable machine to a decline position. Sit on the decline bench facing the cable machine. Grasp the handles with an overhand grip and position them at chest level.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1261-2Pya1cP.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_incline_bench_press",
        name: "Cable Incline Bench Press",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Adjust the bench to a 45-degree incline. Attach the cable handles to the high pulleys. Sit on the bench facing the cable machine with your feet flat on the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0169-Vh0GsK4.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_incline_fly",
        name: "Cable Incline Fly",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Adjust the cable machine to a low position and attach the handles. Sit on an incline bench with your back against the pad and feet flat on the floor. Grasp the handles with an overhand grip and extend your arms straight out in front of you.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0171-tBWXbIT.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_lying_fly",
        name: "Cable Lying Fly",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Attach the handles to the cables and lie flat on a bench with your feet flat on the ground. Hold the handles with your palms facing each other and your arms extended straight above your chest. Keeping a slight bend in your elbows, lower your arms out to the sides in a wide arc until you feel a stretch in your chest.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0185-lJJ7Yq8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_middle_fly",
        name: "Cable Middle Fly",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Attach cables to both sides of a cable machine at chest height. Stand in the center of the machine with one foot slightly in front of the other. Grasp the handles with an overhand grip and extend your arms out to the sides.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0188-xLYSdtg.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_decline_chest_fly",
        name: "Cable One Arm Decline Chest Fly",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Attach a D-handle to a low pulley cable machine and set the bench to a decline angle. Lie down on the bench with your head towards the machine and grab the handle with your right hand. Extend your arm straight up above your chest, keeping a slight bend in your elbow.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1262-w4dLzSx.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_fly_on_exercise_ball",
        name: "Cable One Arm Fly on Exercise Ball",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Sit on an exercise ball with your feet flat on the ground and your back straight. Hold a cable handle in one hand and extend your arm out to the side, parallel to the ground. Keep your elbow slightly bent and your palm facing forward.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1263-hHy8tQG.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_incline_fly_on_exercise_ball",
        name: "Cable One Arm Incline Fly on Exercise Ball",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Sit on an exercise ball with your feet flat on the ground and your back against an incline bench. Hold a cable handle in one hand with your arm extended and palm facing inward. Keeping a slight bend in your elbow, slowly lower your arm out to the side until your hand is in line with your shoulder.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1264-P14Dz9D.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_incline_press",
        name: "Cable One Arm Incline Press",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Adjust the cable machine to a low pulley position. Sit on an incline bench facing away from the cable machine. Grasp the handle with one hand and bring it up to shoulder height.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1265-GKEH6jj.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_incline_press_on_exercise_ball",
        name: "Cable One Arm Incline Press on Exercise Ball",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Sit on an exercise ball with your feet flat on the ground and your back resting against an incline bench. Hold a cable handle in one hand and position your arm at a 90-degree angle with your elbow bent. Press the cable handle forward and upward, extending your arm fully.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1266-6t00BsF.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_lateral_bent_over",
        name: "Cable One Arm Lateral Bent-over",
        category: "Hrudník",
        secondary_muscles: ["Ramena","trapezius"],
        instructions: "Stand with your feet shoulder-width apart, facing a cable machine. Grasp the handle with one hand and step back to create tension on the cable. Bend forward at the waist, keeping your back straight and your core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0191-dB07vDu.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_press_on_exercise_ball",
        name: "Cable One Arm Press on Exercise Ball",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Sit on an exercise ball with your feet flat on the ground and your back straight. Hold a cable handle in one hand and position your arm at chest height, elbow bent. Place your other hand on your hip for stability.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1267-MKIelrR.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_press_on_exercise_ball",
        name: "Cable Press on Exercise Ball",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Sit on an exercise ball with your feet flat on the ground and your knees at a 90-degree angle. Hold the cable handles at chest height with your palms facing down and your elbows bent. Engage your core and press the cable handles forward until your arms are fully extended.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1268-vAwm6rK.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_seated_chest_press",
        name: "Cable Seated Chest Press",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Adjust the seat height and cable handles to a comfortable position. Sit on the bench with your back straight and feet flat on the floor. Grasp the cable handles with an overhand grip at shoulder height.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2144-nIR4Rwl.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_standing_up_straight_crossovers",
        name: "Cable Standing Up Straight Crossovers",
        category: "Hrudník",
        secondary_muscles: ["Ramena","Triceps"],
        instructions: "Stand in the middle of a cable machine with your feet shoulder-width apart. Hold the handles of the cables with your palms facing down and your arms extended straight out to the sides. Keeping your arms straight, bring your hands together in front of your body, crossing them over each other.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1269-UKWTJWR.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_alternate_lateral_pulldown",
        name: "Alternate Lateral Pulldown",
        category: "Záda",
        secondary_muscles: ["Biceps","rhomboids"],
        instructions: "Sit on the cable machine with your back straight and feet flat on the ground. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart. Lean back slightly and pull the handles towards your chest, squeezing your shoulder blades together.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0007-4IKbhHV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_archer_pull_up",
        name: "Archer Pull Up",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Start by hanging from a pull-up bar with an overhand grip, slightly wider than shoulder-width apart. Engage your core and pull your shoulder blades down and back. As you pull yourself up, bend one arm and bring your elbow towards your side, while keeping the other arm straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3293-72BC5Za.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_assisted_parallel_close_grip_pull_up",
        name: "Assisted Parallel Close Grip Pull-up",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Adjust the machine to your desired weight and height. Place your hands on the parallel bars with a close grip, palms facing each other. Hang from the bars with your arms fully extended and your feet off the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0015-vrhHa6D.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_assisted_pull_up",
        name: "Assisted Pull-up",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Adjust the machine to your desired weight and height settings. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart. Hang with your arms fully extended and your feet off the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0017-kiJ4Z2K.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_assisted_standing_chin_up",
        name: "Assisted Standing Chin-up",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Adjust the machine to your desired assistance level. Stand on the foot platform and grip the handles with an overhand grip, slightly wider than shoulder-width apart. Keep your chest up and shoulders back, engage your core, and slightly bend your knees.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1431-7OeHptV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_assisted_standing_pull_up",
        name: "Assisted Standing Pull-up",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Adjust the machine to your desired weight and height settings. Stand facing the machine with your feet shoulder-width apart. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1432-f4xtKBj.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_back_lever",
        name: "Back Lever",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí","Střed těla"],
        instructions: "Start by hanging from a pull-up bar with an overhand grip, hands slightly wider than shoulder-width apart. Engage your core and pull your shoulder blades down and back. Bend your knees and tuck them towards your chest.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3297-GaSzzuh.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_back_pec_stretch",
        name: "Back Pec Stretch",
        category: "Záda",
        secondary_muscles: ["Ramena","Hrudník"],
        instructions: "Stand tall with your feet shoulder-width apart. Extend your arms straight out in front of you, parallel to the ground. Cross your arms in front of your body, with your right arm over your left arm.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1405-chfnQnM.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_barbell_bent_arm_pullover",
        name: "Barbell Bent Arm Pullover",
        category: "Záda",
        secondary_muscles: ["Triceps","Hrudník"],
        instructions: "Lie flat on a bench with your head at one end and your feet on the floor. Hold a barbell with a shoulder-width grip and extend your arms straight above your chest. Lower the barbell behind your head while keeping your arms slightly bent.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1316-cA9FuWG.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_decline_bent_arm_pullover",
        name: "Barbell Decline Bent Arm Pullover",
        category: "Záda",
        secondary_muscles: ["Triceps","Hrudník"],
        instructions: "Lie down on a decline bench with your head lower than your hips and your feet secured. Hold a barbell with a pronated grip (palms facing away from you) and extend your arms straight above your chest. Lower the barbell behind your head in a controlled manner, keeping your arms slightly bent.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0034-hMEptv0.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_decline_wide_grip_pullover",
        name: "Barbell Decline Wide-grip Pullover",
        category: "Záda",
        secondary_muscles: ["Triceps","Hrudník"],
        instructions: "Lie on a decline bench with your head lower than your hips and your feet secured. Hold a barbell with a wide grip and extend your arms straight above your chest. Lower the barbell behind your head in a controlled manner, keeping your arms straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0037-Hj4FOCd.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_incline_row",
        name: "Barbell Incline Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Set up an incline bench at a 45-degree angle. Lie face down on the bench with your chest against the pad and your feet flat on the ground. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0049-dmgMp3n.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_one_arm_bent_over_row",
        name: "Barbell One Arm Bent Over Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Stand with your feet shoulder-width apart, knees slightly bent, and hold a barbell with one hand using an overhand grip. Bend forward at the hips, keeping your back straight and your head in a neutral position. Pull the barbell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0064-Jsgsc27.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_pendlay_row",
        name: "Barbell Pendlay Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Stand with your feet shoulder-width apart and your knees slightly bent. Bend forward at the hips, keeping your back straight and your chest up. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3017-r0z6xzQ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_pullover",
        name: "Barbell Pullover",
        category: "Záda",
        secondary_muscles: ["Hrudník","Triceps"],
        instructions: "Lie flat on a bench with your head at one end and your feet on the floor. Hold a barbell with a shoulder-width grip and extend your arms straight above your chest. Keeping your arms straight, lower the barbell behind your head in a controlled manner until you feel a stretch in your lats.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0073-i6LWjok.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_pullover_to_press",
        name: "Barbell Pullover to Press",
        category: "Záda",
        secondary_muscles: ["Triceps","Hrudník","Ramena"],
        instructions: "Lie flat on a bench with your head at one end and your feet on the ground. Hold the barbell with a pronated grip (palms facing away from you) and extend your arms straight above your chest. Keeping your arms straight, lower the barbell behind your head in an arc-like motion until you feel a stretch in your lats.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0022-znLogoF.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_reverse_grip_incline_bench_row",
        name: "Barbell Reverse Grip Incline Bench Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Set up an incline bench at a 45-degree angle. Sit on the bench facing the backrest with your chest against it. Grab the barbell with a reverse grip (palms facing down) and hands slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1317-8d8qJQI.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_bench_pull_ups",
        name: "Bench Pull-ups",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Position yourself under a bar or a sturdy horizontal surface that is at chest height. Grab the bar or surface with an overhand grip, slightly wider than shoulder-width apart. Hang with your arms fully extended and your body straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3019-mExgrF9.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bodyweight_squatting_row",
        name: "Bodyweight Squatting Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Ramena"],
        instructions: "Stand with your feet shoulder-width apart, holding onto a sturdy object or suspension trainer with your arms extended. Lower your body into a squat position, keeping your back straight and your knees behind your toes. From the squat position, pull your body up towards the object or suspension trainer, squeezing your shoulder blades together.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3168-3xK09Sk.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bodyweight_standing_close_grip_one_arm_row",
        name: "Bodyweight Standing Close-grip One Arm Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Stand with your feet shoulder-width apart, knees slightly bent, and hold a dumbbell in one hand with a neutral grip. Bend forward at the hips, keeping your back straight and your core engaged. Pull the dumbbell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3156-v2DfH14.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bodyweight_standing_close_grip_row",
        name: "Bodyweight Standing Close-grip Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Stand with your feet shoulder-width apart and knees slightly bent. Bend forward at the waist, keeping your back straight and your core engaged. Extend your arms straight in front of you, gripping the bar or handles with a close grip.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3158-tig3PXb.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bodyweight_standing_one_arm_row",
        name: "Bodyweight Standing One Arm Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Stand with your feet shoulder-width apart, knees slightly bent, and hold a dumbbell in one hand. Bend forward at the hips, keeping your back straight and your core engaged. Let the dumbbell hang straight down in front of you, with your arm fully extended.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3162-xbkPfaw.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bodyweight_standing_row",
        name: "Bodyweight Standing Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Ramena"],
        instructions: "Stand with your feet shoulder-width apart and knees slightly bent. Grasp a bar or handles with an overhand grip, palms facing down. Keep your back straight and core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3166-wd4ds3s.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_cable_bar_lateral_pulldown",
        name: "Cable Bar Lateral Pulldown",
        category: "Záda",
        secondary_muscles: ["Biceps","rhomboids","rear deltoids"],
        instructions: "Adjust the cable pulley to a high position and attach a straight bar. Sit facing the cable machine with your feet flat on the ground and your knees slightly bent. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0150-eYnzaCm.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_cross_over_lateral_pulldown",
        name: "Cable Cross-over Lateral Pulldown",
        category: "Záda",
        secondary_muscles: ["Biceps","rhomboids","rear deltoids"],
        instructions: "Attach a cable handle to each side of a cable machine at shoulder height. Stand in the middle of the machine with your feet shoulder-width apart. Grasp the handles with an overhand grip and step back to create tension in the cables.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0153-OQ1otBN.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_decline_seated_wide_grip_row",
        name: "Cable Decline Seated Wide-grip Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Sit on the decline bench facing the cable machine with your feet securely placed on the footrests. Grasp the cable attachment with a wide overhand grip, palms facing down. Lean back slightly, keeping your back straight and your core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0159-kesXOpB.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_floor_seated_wide_grip_row",
        name: "Cable Floor Seated Wide-grip Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Sit on the floor with your legs extended and your back straight. Attach a cable handle to a low pulley and position the cable machine behind you. Grasp the handle with a wide overhand grip, palms facing down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0160-veXwo0D.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_high_row_kneeling",
        name: "Cable High Row (kneeling)",
        category: "Záda",
        secondary_muscles: ["Biceps","Ramena"],
        instructions: "Attach a straight bar to a cable machine at chest height. Kneel down in front of the cable machine and grab the bar with an overhand grip, hands shoulder-width apart. Sit back on your heels, keeping your back straight and your core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0167-ZSJNetl.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_incline_bench_row",
        name: "Cable Incline Bench Row",
        category: "Záda",
        secondary_muscles: ["Biceps","rear deltoids"],
        instructions: "Set up an incline bench at a 45-degree angle and attach a cable handle to the low pulley. Sit on the bench facing the cable machine with your feet flat on the floor and your knees slightly bent. Grasp the cable handle with an overhand grip and extend your arms fully in front of you.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1318-yaMIo4D.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_incline_pushdown",
        name: "Cable Incline Pushdown",
        category: "Záda",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Attach a straight bar to a high pulley cable machine. Stand facing away from the machine with your feet shoulder-width apart. Grasp the bar with an overhand grip, hands slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0172-1PK5Uo3.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_lat_pulldown_full_range_of_motion",
        name: "Cable Lat Pulldown Full Range Of Motion",
        category: "Záda",
        secondary_muscles: ["Biceps","rhomboids","rear deltoids"],
        instructions: "Sit on the lat pulldown machine with your knees positioned under the pads. Grasp the cable bar with an overhand grip, slightly wider than shoulder-width apart. Lean back slightly and keep your chest up, maintaining a slight arch in your lower back.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2330-LEprlgG.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_lateral_pulldown_with_rope_attachment",
        name: "Cable Lateral Pulldown (with Rope Attachment)",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Attach a rope attachment to the cable machine at a high position. Stand facing the machine with your feet shoulder-width apart. Grasp the rope with an overhand grip, palms facing each other.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0177-CuaWCmC.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_lateral_pulldown_with_v_bar",
        name: "Cable Lateral Pulldown with V-Bar",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Sit down on the cable pulldown machine and grab the v-bar attachment with an overhand grip. Adjust the knee pad so that your thighs are secured under it. Keep your back straight and lean back slightly.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2616-4c9BhzB.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_lying_extension_pullover_with_rope_attachment",
        name: "Cable Lying Extension Pullover (with Rope Attachment)",
        category: "Záda",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Attach a rope to a cable machine and set the pulley at the highest position. Lie down on a bench with your head towards the cable machine. Hold the rope with both hands and extend your arms straight up above your chest.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0184-Q2Eu1Ax.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_bent_over_row",
        name: "Cable One Arm Bent Over Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Stand facing a cable machine with your feet shoulder-width apart. Bend your knees slightly and hinge forward at the hips, keeping your back straight. Grasp the cable handle with one hand, palm facing inward, and extend your arm fully.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0189-EIsE3u8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_pulldown",
        name: "Cable One Arm Pulldown",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Attach a single handle to a high pulley cable machine. Stand facing the machine with your feet shoulder-width apart. Grasp the handle with an overhand grip and extend your arm fully.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3563-U5INZY6.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_straight_back_high_row_kneeling",
        name: "Cable One Arm Straight Back High Row (kneeling)",
        category: "Záda",
        secondary_muscles: ["Biceps","Ramena"],
        instructions: "Attach a handle to a cable machine at waist height. Kneel down facing the cable machine and grab the handle with one hand. Keep your back straight and your core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0193-WrYPP2g.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_palm_rotational_row",
        name: "Cable Palm Rotational Row",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Attach a handle to a cable machine at waist height. Stand facing the machine with your feet shoulder-width apart. Grasp the handle with an overhand grip, palms facing down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1319-OmQ8w0p.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_pulldown_pro_lat_bar",
        name: "Cable Pulldown (pro Lat Bar)",
        category: "Záda",
        secondary_muscles: ["Biceps","Předloktí"],
        instructions: "Adjust the seat height so that your thighs are parallel to the ground and your feet are flat on the floor. Grasp the lat bar with an overhand grip, slightly wider than shoulder-width apart. Sit down and lean back slightly, keeping your chest up and your back straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0197-qdRxqCj.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_pushdown_straight_arm_v_2",
        name: "Cable Pushdown (straight Arm) V. 2",
        category: "Záda",
        secondary_muscles: ["Triceps","Ramena"],
        instructions: "Attach a straight bar to a high pulley cable machine. Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees. Grasp the bar with an overhand grip, keeping your arms straight and your palms facing down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0199-PskORrA.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_one_arm_snatch",
        name: "Barbell One Arm Snatch",
        category: "Ramena",
        secondary_muscles: ["Trapézy","Předloktí","Střed těla"],
        instructions: "Stand with your feet shoulder-width apart, toes pointing slightly outwards. Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Bend your knees and lower your hips into a squat position, keeping your back straight and chest up.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0067-xHKN2s8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_rear_delt_raise",
        name: "Barbell Rear Delt Raise",
        category: "Ramena",
        secondary_muscles: ["Trapézy","rhomboids"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, palms facing down. Bend your knees slightly and hinge forward at the hips, keeping your back straight. Raise the barbell out to the sides, keeping your arms straight, until they are parallel to the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0075-Ln9iTbU.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_rear_delt_row",
        name: "Barbell Rear Delt Row",
        category: "Ramena",
        secondary_muscles: ["trapezius","rhomboids","Biceps"],
        instructions: "Stand with your feet shoulder-width apart and knees slightly bent. Hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart. Bend forward at the hips, keeping your back straight and chest up.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0076-S9zHIvU.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_behind_head_military_press",
        name: "Barbell Seated Behind Head Military Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Sit on a bench with your back straight and feet flat on the ground. Hold the barbell with an overhand grip, slightly wider than shoulder-width apart. Lift the barbell off the rack and bring it down to shoulder level, behind your head.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0086-ngPpyRS.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_bradford_rocky_press",
        name: "Barbell Seated Bradford Rocky Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Sit on a bench with your back straight and feet flat on the ground. Hold the barbell with an overhand grip, slightly wider than shoulder-width apart. Lift the barbell to shoulder height, keeping your elbows slightly bent and pointing forward.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0087-0dCyly0.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_skier",
        name: "Barbell Skier",
        category: "Ramena",
        secondary_muscles: ["Triceps","Střed těla"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell in front of your thighs with an overhand grip. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up. Simultaneously lift the barbell up towards your shoulders while jumping slightly off the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0100-4Leypho.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_bradford_press",
        name: "Barbell Standing Bradford Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Stand with your feet shoulder-width apart and hold the barbell in front of your shoulders with an overhand grip. Press the barbell overhead, fully extending your arms. Lower the barbell back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0105-dCPESfR.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_close_grip_military_press",
        name: "Barbell Standing Close Grip Military Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Stand with your feet shoulder-width apart and hold the barbell with an overhand grip, hands slightly closer than shoulder-width apart. Lift the barbell to shoulder height, keeping your elbows close to your body. Press the barbell overhead, extending your arms fully.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1456-wdRZISl.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_front_raise_over_head",
        name: "Barbell Standing Front Raise Over Head",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Stand with your feet shoulder-width apart, holding a barbell in front of your thighs with an overhand grip. Keep your back straight and engage your core. Slowly raise the barbell in front of you, keeping your arms straight and your palms facing down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0107-S8mo30S.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_wide_military_press",
        name: "Barbell Standing Wide Military Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Stand with your feet shoulder-width apart and hold the barbell with an overhand grip, slightly wider than shoulder-width. Lift the barbell to shoulder height, keeping your elbows slightly in front of the bar. Press the barbell overhead, extending your arms fully.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1457-Kyd9Rz5.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_thruster",
        name: "Barbell Thruster",
        category: "Ramena",
        secondary_muscles: ["Kvadricepsy","Hýždě","Hamstringy"],
        instructions: "Start by standing with your feet shoulder-width apart, holding a barbell at shoulder height with an overhand grip. Lower into a squat position by bending your knees and pushing your hips back. As you reach the bottom of the squat, explosively drive through your heels to stand up, simultaneously pressing the barbell overhead.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3305-f7Y9eDZ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_upright_row",
        name: "Barbell Upright Row",
        category: "Ramena",
        secondary_muscles: ["Trapézy","Biceps"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart. Let the barbell hang in front of your thighs, arms fully extended. Keeping your back straight and core engaged, exhale and lift the barbell straight up towards your chin, leading with your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0120-UDlhcO8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_upright_row_v_3",
        name: "Barbell Upright Row V. 3",
        category: "Ramena",
        secondary_muscles: ["Trapézy","Biceps"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart. Let the barbell hang in front of your thighs, arms fully extended. Keeping your core engaged and back straight, exhale as you lift the barbell straight up towards your chin, leading with your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0121-fI18Rbc.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_wide_grip_upright_row",
        name: "Barbell Wide-grip Upright Row",
        category: "Ramena",
        secondary_muscles: ["Trapézy","Biceps"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands wider than shoulder-width apart. Let the barbell hang in front of your thighs, arms fully extended. Keeping your back straight, exhale and lift the barbell straight up towards your chin, leading with your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0123-RgJDRR1.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_alternate_shoulder_press",
        name: "Cable Alternate Shoulder Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Stand with your feet shoulder-width apart and grasp the handles of the cable machine with an overhand grip. Position your hands at shoulder height, with your palms facing forward. Keep your core engaged and your back straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0148-KHPZL0b.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_cross_over_revers_fly",
        name: "Cable Cross-over Revers Fly",
        category: "Ramena",
        secondary_muscles: ["rhomboids","trapezius"],
        instructions: "Attach a D-handle to each low pulley cable and stand in the middle of the cable crossover machine. Grasp the handles with a pronated grip (palms facing down) and take a step forward, positioning your feet shoulder-width apart. Bend your knees slightly and lean forward at the waist, keeping your back straight and your abs engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0154-aqvSOQE.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_forward_raise",
        name: "Cable Forward Raise",
        category: "Ramena",
        secondary_muscles: ["Triceps","Předloktí"],
        instructions: "Stand with your feet shoulder-width apart and your knees slightly bent. Hold the cable handle with an overhand grip, palms facing down, and your arms fully extended in front of you. Keeping your arms straight, raise the cable handle up to shoulder level.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0161-hvHhCv8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_front_raise",
        name: "Cable Front Raise",
        category: "Ramena",
        secondary_muscles: ["Triceps","Předloktí"],
        instructions: "Stand with your feet shoulder-width apart and grasp the cable handle with an overhand grip. Keep your back straight and your core engaged. Raise the cable handle in front of you, keeping your arms straight and your palms facing down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0162-u2X71Np.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_kneeling_rear_delt_row_with_rope_male",
        name: "Cable Kneeling Rear Delt Row (with Rope) (male)",
        category: "Ramena",
        secondary_muscles: ["trapezius","rhomboids","Biceps"],
        instructions: "Attach a rope handle to a low cable pulley and kneel down facing the machine. Grasp the rope with a neutral grip (palms facing each other) and extend your arms fully in front of you. Keeping your back straight and core engaged, pull the rope towards your body by retracting your shoulder blades.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3697-G61cXLk.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_lateral_raise",
        name: "Cable Lateral Raise",
        category: "Ramena",
        secondary_muscles: ["Trapézy","Triceps"],
        instructions: "Stand with your feet shoulder-width apart and grasp the cable handles with an overhand grip. Keep your arms straight and your core engaged. Raise your arms out to the sides until they are parallel to the floor.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0178-goJ6ezq.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_one_arm_lateral_raise",
        name: "Cable One Arm Lateral Raise",
        category: "Ramena",
        secondary_muscles: ["Trapézy","Triceps"],
        instructions: "Stand with your feet shoulder-width apart, facing the cable machine. Hold the cable handle with one hand, palm facing down, and stand far enough away from the machine so that there is tension on the cable. Keep your arm straight and slowly raise it out to the side until it is parallel to the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0192-wEulIzp.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_rear_delt_row_stirrups",
        name: "Cable Rear Delt Row (stirrups)",
        category: "Ramena",
        secondary_muscles: ["trapezius","rhomboids","Biceps"],
        instructions: "Attach a stirrup handle to a low cable pulley and stand facing the machine. Grasp the handle with your left hand and take a step back with your right foot, positioning your body at a slight angle. Bend your knees slightly and hinge forward at the hips, keeping your back straight and your core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0202-yUdIGNs.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_rear_delt_row_with_rope",
        name: "Cable Rear Delt Row (with Rope)",
        category: "Ramena",
        secondary_muscles: ["trapezius","rhomboids","Biceps"],
        instructions: "Attach a rope handle to a low pulley cable machine. Stand facing the machine with your feet shoulder-width apart. Grasp the rope handle with an overhand grip, palms facing each other.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0203-wqNPGCg.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_seated_rear_lateral_raise",
        name: "Cable Seated Rear Lateral Raise",
        category: "Ramena",
        secondary_muscles: ["Trapézy","rhomboids"],
        instructions: "Sit on a bench facing the cable machine with your feet flat on the ground. Grasp the cable handles with an overhand grip and extend your arms straight in front of you. Keeping your arms straight, slowly raise them out to the sides until they are parallel to the floor.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0215-x825CZm.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_seated_shoulder_internal_rotation",
        name: "Cable Seated Shoulder Internal Rotation",
        category: "Ramena",
        secondary_muscles: ["rotator cuff","Triceps"],
        instructions: "Sit on a bench or chair facing the cable machine with your feet flat on the ground. Hold the cable handle with your arm extended straight out in front of you, parallel to the ground. Keep your elbow slightly bent and your shoulder blades pulled back and down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0216-YPoVrBi.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_shoulder_press",
        name: "Cable Shoulder Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","Mezilopatkové svaly"],
        instructions: "Adjust the cable machine so that the handles are at shoulder height. Stand facing away from the machine with your feet shoulder-width apart. Grasp the handles with an overhand grip and bring them up to shoulder level, with your elbows bent and pointing outwards.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0219-PzQanLE.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_standing_rear_delt_row_with_rope",
        name: "Cable Standing Rear Delt Row (with Rope)",
        category: "Ramena",
        secondary_muscles: ["trapezius","rhomboids","Biceps"],
        instructions: "Stand facing a cable machine with your feet shoulder-width apart. Hold the cable attachment with both hands, palms facing each other, and step back to create tension in the cable. Keep your back straight and your core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0233-ZfyAGhK.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_standing_shoulder_external_rotation",
        name: "Cable Standing Shoulder External Rotation",
        category: "Ramena",
        secondary_muscles: ["rotator cuff","trapezius"],
        instructions: "Stand with your feet shoulder-width apart and your knees slightly bent. Hold the cable handle with your arm extended in front of you, parallel to the ground. Keep your elbow slightly bent and your shoulder blades pulled back.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0235-FWdVhcW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_supine_reverse_fly",
        name: "Cable Supine Reverse Fly",
        category: "Ramena",
        secondary_muscles: ["trapezius","rhomboids"],
        instructions: "Attach a D-handle to a low pulley cable machine and lie face down on a flat bench. Grasp the D-handle with each hand, palms facing down, and extend your arms straight out in front of you. Keeping your arms straight, raise them out to the sides until they are parallel to the floor.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0240-PQcUlDi.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_upright_row",
        name: "Cable Upright Row",
        category: "Ramena",
        secondary_muscles: ["Trapézy","Biceps"],
        instructions: "Stand with your feet shoulder-width apart, knees slightly bent, and hold the cable attachment with an overhand grip. Keep your back straight and your core engaged throughout the exercise. Pull the cable attachment straight up towards your chin, leading with your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0246-cALKspW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_dumbbell_arnold_press",
        name: "Dumbbell Arnold Press",
        category: "Ramena",
        secondary_muscles: ["Triceps","upper chest"],
        instructions: "Sit on a bench with back support and hold a dumbbell in each hand at shoulder level, palms facing your body and elbows bent. Press the dumbbells upward until your arms are fully extended and your palms are facing forward. Rotate your wrists as you lift, so that your palms are facing forward at the top of the movement.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2137-Xy4jlWA.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_dumbbell_arnold_press_v_2",
        name: "Dumbbell Arnold Press V. 2",
        category: "Ramena",
        secondary_muscles: ["Triceps","upper chest"],
        instructions: "Sit on a bench with back support and hold a dumbbell in each hand at shoulder level, palms facing your body and elbows bent. Press the dumbbells upward until your arms are fully extended and your palms are facing forward. Rotate your wrists as you lift, so that your palms end up facing forward at the top of the movement.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0287-eOrFCnx.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_all_fours_squad_stretch",
        name: "All Fours Squad Stretch",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Hýždě"],
        instructions: "Start on all fours with your hands directly under your shoulders and your knees directly under your hips. Extend one leg straight back, keeping your knee bent and your foot flexed. Slowly lower your hips towards the ground, feeling a stretch in your quads.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1512-qBcKorM.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_ankle_circles",
        name: "Ankle Circles",
        category: "Nohy",
        secondary_muscles: ["ankle stabilizers"],
        instructions: "Sit on the ground with your legs extended in front of you. Lift one leg off the ground and rotate your ankle in a circular motion. Perform the desired number of circles in one direction, then switch to the other direction.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1368-uL9CsKm.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_arms_apart_circular_toe_touch_male",
        name: "Arms Apart Circular Toe Touch (male)",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Kvadricepsy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and arms extended to the sides. Keeping your legs straight, bend forward at the waist and reach down towards your toes with your right hand. As you reach down, simultaneously lift your left leg straight up behind you, maintaining balance.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3214-RtyAsy1.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_backward_jump",
        name: "Backward Jump",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Hýždě","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart. Bend your knees slightly and jump backwards, pushing off with both feet. Land softly on the balls of your feet, bending your knees to absorb the impact.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1473-SaDOwk7.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_balance_board",
        name: "Balance Board",
        category: "Nohy",
        secondary_muscles: ["Lýtka","Hamstringy","Hýždě"],
        instructions: "Place the balance board on a flat surface. Step onto the balance board with one foot, ensuring it is centered. Slowly shift your weight onto the foot on the balance board, keeping your core engaged.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0020-xAySMB0.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_barbell_bench_front_squat",
        name: "Barbell Bench Front Squat",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Hýždě","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart and the barbell resting on your upper chest, just below your collarbone. Hold the barbell with an overhand grip, keeping your elbows up and your upper arms parallel to the ground. Lower your body down into a squat position by bending at the knees and hips, keeping your back straight and your chest up.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0024-Y7YcmIJ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_bench_squat",
        name: "Barbell Bench Squat",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Set up a barbell on a squat rack at chest height. Stand facing away from the rack, with your feet shoulder-width apart. Bend your knees and lower your body down into a squat position, keeping your back straight and chest up.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0026-W9pFVv1.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_clean_and_press",
        name: "Barbell Clean and Press",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Hýždě","Ramena"],
        instructions: "Stand with your feet shoulder-width apart and the barbell on the floor in front of you. Bend your knees and hinge at the hips to lower down and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Drive through your heels and extend your hips and knees to lift the barbell off the floor, keeping it close to your body.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0028-SGY8Zui.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_clean_grip_front_squat",
        name: "Barbell Clean-grip Front Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart and the barbell resting on your upper chest, with your elbows pointing forward. Lower your body by bending your knees and pushing your hips back, as if you are sitting back into a chair. Keep your chest up and your back straight as you lower down, making sure your knees do not go past your toes.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0029-qi996YS.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_floor_calf_raise",
        name: "Barbell Floor Calf Raise",
        category: "Nohy",
        secondary_muscles: ["Hamstringy"],
        instructions: "Place a barbell on the floor in front of you. Stand with the balls of your feet on the edge of the barbell, with your heels hanging off. Hold onto a stable object for balance if needed.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1370-2IHEa2T.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_front_squat",
        name: "Barbell Front Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart, toes slightly turned out. Hold the barbell in front of your shoulders, resting it on your collarbone and shoulders. Engage your core and keep your chest up as you lower your body down into a squat position, pushing your hips back and bending your knees.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0042-zG0zs85.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_full_squat_back_pov",
        name: "Barbell Full Squat (back Pov)",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart, toes slightly turned out. Hold the barbell across your upper back, resting it on your traps or rear delts. Engage your core and keep your chest up as you begin to lower your body down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1461-DhMl549.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_full_squat_side_pov",
        name: "Barbell Full Squat (side Pov)",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart, toes slightly turned out. Hold the barbell across your upper back, resting it on your traps or rear delts. Engage your core and keep your chest up as you begin to lower your body down.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1462-iYzB0Cz.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_full_zercher_squat",
        name: "Barbell Full Zercher Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and toes slightly turned out. Hold the barbell in the crooks of your elbows, with your hands gripping the barbell for stability. Engage your core and keep your chest lifted as you lower your hips back and down into a squat position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1545-vR1vold.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_glute_bridge",
        name: "Barbell Glute Bridge",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Spodní záda"],
        instructions: "Start by lying flat on your back on the ground with your knees bent and feet flat on the floor. Place a barbell across your hips, holding it securely with both hands. Engage your glutes and core muscles, then lift your hips off the ground until your body forms a straight line from your knees to your shoulders.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1409-qKBpF7I.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_glute_bridge_two_legs_on_bench_male",
        name: "Barbell Glute Bridge Two Legs on Bench (male)",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Střed těla"],
        instructions: "Start by sitting on the edge of a bench with your upper back resting against it and your feet flat on the ground, hip-width apart. Place a barbell across your hips, holding it securely with both hands. Engage your glutes and core muscles, then press through your heels to lift your hips off the bench, creating a straight line from your knees to your shoulders.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3562-qg2PGl6.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_hack_squat",
        name: "Barbell Hack Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart and your toes slightly turned out. Hold the barbell behind your legs, resting it on your upper thighs. Lower your body by bending at the knees and hips, keeping your back straight and your chest up.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0046-5VCj6iH.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_high_bar_squat",
        name: "Barbell High Bar Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart, toes slightly turned out. Place the barbell on your upper back, resting it on your traps. Engage your core and keep your chest up as you begin to squat down, pushing your hips back and bending your knees.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1436-Gnfo4FM.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_jefferson_squat",
        name: "Barbell Jefferson Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and toes slightly turned out. Hold the barbell with an overhand grip, resting it on the front of your body, just below your waist. Step your left foot forward and your right foot back, keeping your feet shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0051-pkSoCW9.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_jump_squat",
        name: "Barbell Jump Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart, holding a barbell across your upper back. Lower your body into a squat position by bending your knees and pushing your hips back. Once you reach the bottom of the squat, explode upwards by jumping off the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0053-1gFNTZV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lateral_lunge",
        name: "Barbell Lateral Lunge",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart, holding a barbell across your upper back. Take a big step to the side with your right foot, keeping your left foot planted. Bend your right knee and lower your body down into a lunge position, keeping your left leg straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1410-py1HSzx.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_low_bar_squat",
        name: "Barbell Low Bar Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and the barbell resting on your upper back. Keeping your chest up and core engaged, slowly lower your body by bending your knees and pushing your hips back. Continue lowering until your thighs are parallel to the ground or slightly below.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1435-bTpEUcm.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lunge",
        name: "Barbell Lunge",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart and a barbell resting on your upper back. Take a step forward with your right foot, keeping your torso upright. Lower your body by bending your right knee until your thigh is parallel to the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0054-t8iSghb.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lying_lifting_on_hip",
        name: "Barbell Lying Lifting (on Hip)",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Kvadricepsy"],
        instructions: "Lie flat on your back on a bench with your feet flat on the ground and your knees bent. Hold the barbell with an overhand grip and position it on your hips. Engaging your glutes, lift your hips off the bench until your body forms a straight line from your knees to your shoulders.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0058-SNFfUff.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_narrow_stance_squat",
        name: "Barbell Narrow Stance Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and toes pointing slightly outward. Hold the barbell across your upper back, resting it on your traps or rear delts. Engage your core and keep your chest up as you slowly lower your body by bending your knees and pushing your hips back.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0063-elhhVgj.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_one_arm_side_deadlift",
        name: "Barbell One Arm Side Deadlift",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Kvadricepsy","Spodní záda"],
        instructions: "Stand with your feet shoulder-width apart, holding a barbell in one hand with an overhand grip. Keep your back straight and your core engaged. Bend at the hips and lower the barbell towards the outside of your leg, keeping your arm straight and your chest up.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0066-2DxtqHL.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_one_leg_squat",
        name: "Barbell One Leg Squat",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell across your upper back. Lift one foot off the ground and extend it forward, keeping it parallel to the ground. Bend your standing leg and lower your body down as if sitting back into a chair, keeping your chest up and your back straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0068-uKyN64F.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_rack_pull",
        name: "Barbell Rack Pull",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Spodní záda"],
        instructions: "Set up a barbell on a rack at knee height. Stand with your feet shoulder-width apart, toes pointing slightly outwards. Bend at the hips and knees to lower yourself down and grip the barbell with an overhand grip, hands shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0074-za9Ni4z.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_rear_lunge_v_2",
        name: "Barbell Rear Lunge V. 2",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell across your upper back. Take a step backward with your right foot, landing on the ball of your foot. Bend both knees to lower your body until your left thigh is parallel to the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0077-62Nw60O.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_calf_raise",
        name: "Barbell Seated Calf Raise",
        category: "Nohy",
        secondary_muscles: ["Hamstringy"],
        instructions: "Sit on a bench with your feet flat on the floor and a barbell resting on your thighs. Place the balls of your feet on a raised platform, such as a block or step. Lower your heels as far as possible, feeling a stretch in your calves.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1371-ipvgBnC.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_good_morning",
        name: "Barbell Seated Good Morning",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Spodní záda"],
        instructions: "Sit on a bench with your feet flat on the ground and a barbell resting on your upper back. Keep your back straight and your chest up. Slowly hinge forward at the hips, lowering your torso towards the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0090-d960PgE.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_side_split_squat",
        name: "Barbell Side Split Squat",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Stand with your feet wider than shoulder-width apart, toes pointing slightly outward. Hold a barbell across your upper back, resting it on your traps. Engage your core and keep your chest up as you lower your body down into a squat position, bending at the knees and hips.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0098-W31mMjd.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_side_split_squat_v_2",
        name: "Barbell Side Split Squat V. 2",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Stand with your feet wider than shoulder-width apart, toes pointing slightly outwards. Hold a barbell across your upper back, resting it on your shoulders. Take a big step to the side with your right foot, keeping your left foot planted.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0097-HUEqZ1y.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_single_leg_deadlift",
        name: "Barbell Single Leg Deadlift",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Spodní záda"],
        instructions: "Stand with your feet hip-width apart, holding a barbell in front of your thighs with an overhand grip. Shift your weight onto your left foot and lift your right foot slightly off the ground. Hinge forward at the hips, keeping your back straight and your right leg extended behind you for balance.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1756-gEyURal.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_speed_squat",
        name: "Barbell Speed Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart, toes slightly turned out. Hold the barbell across your upper back, resting it on your traps or rear delts. Engage your core and keep your chest up as you lower your hips back and down, as if sitting into a chair.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0101-euI1BwR.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_split_squat_v_2",
        name: "Barbell Split Squat V. 2",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart, holding a barbell across your upper back. Take a large step forward with your right foot, keeping your torso upright. Lower your body by bending your knees and hips until your right thigh is parallel to the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2810-HBYyX94.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_squat_on_knees",
        name: "Barbell Squat (on Knees)",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Start by kneeling on the ground with your knees hip-width apart and your toes pointing forward. Place a barbell across your shoulders, gripping it with an overhand grip and your hands slightly wider than shoulder-width apart. Engage your core and keep your chest lifted as you slowly lower your body down by bending your knees, keeping your back straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0102-oR7O9LW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_squat_jump_step_rear_lunge",
        name: "Barbell Squat Jump Step Rear Lunge",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Start by standing with your feet shoulder-width apart, holding a barbell across your upper back. Lower your body into a squat position by bending your knees and pushing your hips back. Explode upwards, jumping off the ground as high as you can.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2798-RYcV1kH.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_leg_calf_raise",
        name: "Barbell Standing Leg Calf Raise",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Hýždě"],
        instructions: "Stand with your feet shoulder-width apart and place a barbell across your upper back. Raise your heels off the ground as high as possible, using your calves. Pause for a moment at the top, then slowly lower your heels back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0108-rGwhJ5o.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_rocking_leg_calf_raise",
        name: "Barbell Standing Rocking Leg Calf Raise",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Kvadricepsy"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell across your upper back. Raise your heels off the ground as high as possible, balancing on the balls of your feet. Slowly lower your heels back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0111-6HiHHe0.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_step_up",
        name: "Barbell Step-up",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand in front of a bench or step with a barbell resting on your upper back. Place one foot on the bench or step, ensuring your entire foot is in contact with the surface. Push through your heel and step up onto the bench or step, fully extending your hip and knee.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0114-Kxquu2E.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_stiff_leg_good_morning",
        name: "Barbell Stiff Leg Good Morning",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Spodní záda"],
        instructions: "Stand with your feet shoulder-width apart and your knees slightly bent. Hold the barbell across your upper back, resting it on your traps. Keeping your back straight, hinge forward at the hips, pushing your glutes back.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0115-JrOHAZc.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_straight_leg_deadlift",
        name: "Barbell Straight Leg Deadlift",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Spodní záda"],
        instructions: "Stand with your feet shoulder-width apart and your toes pointing forward. Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart. Bend at your hips and lower the barbell towards the ground, keeping your back straight and your knees slightly bent.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0116-hrVQWvE.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_sumo_deadlift",
        name: "Barbell Sumo Deadlift",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Kvadricepsy","Spodní záda"],
        instructions: "Stand with your feet wider than shoulder-width apart, toes pointing outwards. Place a barbell on the ground in front of you, centered between your feet. Bend your knees and lower your hips, keeping your back straight and chest up, to grip the barbell with an overhand grip.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0117-KgI0tqW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_wide_squat",
        name: "Barbell Wide Squat",
        category: "Nohy",
        secondary_muscles: ["Hýždě","Hamstringy","Lýtka"],
        instructions: "Stand with your feet wider than shoulder-width apart, toes pointing slightly outward. Hold the barbell across your upper back, resting it on your traps or rear delts. Engage your core and keep your chest up as you lower your body down into a squat, pushing your hips back and bending your knees.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0124-s7HX1BY.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_zercher_squat",
        name: "Barbell Zercher Squat",
        category: "Nohy",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and toes slightly turned out. Hold the barbell in the crooks of your elbows, with your hands gripping the bar for stability. Engage your core and keep your chest lifted as you lower your hips back and down into a squat position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0127-LSTChY9.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_basic_toe_touch_male",
        name: "Basic Toe Touch (male)",
        category: "Nohy",
        secondary_muscles: ["Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and your arms by your sides. Bend forward at the waist, keeping your back straight and your knees slightly bent. Reach down towards your toes with your hands, keeping your legs as straight as possible.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3212-BbfB8Gb.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bench_hip_extension",
        name: "Bench Hip Extension",
        category: "Nohy",
        secondary_muscles: ["Hamstringy"],
        instructions: "Sit on a bench with your back against the bench and your feet flat on the ground. Place your hands on the bench for support. Engage your glutes and hamstrings, then lift your hips off the bench until your body forms a straight line from your knees to your shoulders.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0130-u27Kcdz.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_assisted_triceps_dip_kneeling",
        name: "Assisted Triceps Dip (kneeling)",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Adjust the machine to your desired weight and height. Kneel down on the pad facing the machine, with your hands gripping the handles. Lower your body by bending your elbows, keeping your back straight and close to the machine.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0019-J60bN17.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_alternate_biceps_curl",
        name: "Barbell Alternate Biceps Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand up straight with your feet shoulder-width apart and hold a barbell in each hand, palms facing forward. Keep your upper arms stationary and exhale as you curl the weights while contracting your biceps. Continue to raise the barbells until your biceps are fully contracted and the barbells are at shoulder level.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0023-Yza7XrQ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_biceps_curl_with_arm_blaster",
        name: "Barbell Biceps Curl (with Arm Blaster)",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing up. Place your upper arms against the arm blaster, keeping your elbows close to your torso. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2407-aee2Fcj.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_decline_close_grip_to_skull_press",
        name: "Barbell Decline Close Grip to Skull Press",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Lie on a decline bench with your head lower than your feet and hold a barbell with a close grip. Lower the barbell towards your forehead by bending your elbows, keeping your upper arms stationary. Pause for a moment, then extend your arms to press the barbell back up to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0035-LMGXZn8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_drag_curl",
        name: "Barbell Drag Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing up. Let the barbell hang at arm's length in front of your thighs. Keeping your upper arms stationary, curl the barbell up towards your chest by contracting your biceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0038-IENzBdA.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_incline_close_grip_bench_press",
        name: "Barbell Incline Close Grip Bench Press",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Set up an incline bench at a 45-degree angle. Lie down on the bench with your feet flat on the ground. Grasp the barbell with a close grip, slightly narrower than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1719-gx7s7uF.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_incline_reverse_grip_press",
        name: "Barbell Incline Reverse-grip Press",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Set up an incline bench at a 45-degree angle. Lie back on the bench and grasp the barbell with a reverse grip, hands slightly wider than shoulder-width apart. Unrack the barbell and lower it towards your upper chest, keeping your elbows tucked in.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0048-641mIfk.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_jm_bench_press",
        name: "Barbell Jm Bench Press",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart. Lower the barbell to your chest, keeping your elbows tucked in close to your body.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0052-ZsiqXYa.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lying_back_of_the_head_tricep_extension",
        name: "Barbell Lying Back Of The Head Tricep Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your head at the end of the bench. Hold a barbell with an overhand grip, hands shoulder-width apart, and extend your arms straight up over your chest. Keeping your upper arms stationary, slowly lower the barbell behind your head by bending your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1720-yg8Totb.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lying_close_grip_press",
        name: "Barbell Lying Close-grip Press",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the barbell with a close grip, hands shoulder-width apart, palms facing towards your feet. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0055-EcaV7aL.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lying_close_grip_triceps_extension",
        name: "Barbell Lying Close-grip Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your head at the end of the bench. Grasp the barbell with a close grip, hands shoulder-width apart, palms facing up. Extend your arms fully, lifting the barbell above your chest.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0056-HJ63mSO.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lying_extension",
        name: "Barbell Lying Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your head at the end of the bench. Hold the barbell with an overhand grip, hands shoulder-width apart, and extend your arms straight up over your chest. Keeping your upper arms stationary, slowly lower the barbell towards your forehead by bending your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0057-EMpUwRI.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lying_preacher_curl",
        name: "Barbell Lying Preacher Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Sit on a preacher bench with your chest against the pad and your arms extended over the edge, holding a barbell with an underhand grip. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps. Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0059-SYJ4Bkt.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_lying_triceps_extension",
        name: "Barbell Lying Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your head at the end of the bench. Hold the barbell with an overhand grip, hands shoulder-width apart, and extend your arms straight up over your chest. Keeping your upper arms stationary, slowly lower the barbell towards your forehead by bending your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0061-iZop9xO.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_one_arm_floor_press",
        name: "Barbell One Arm Floor Press",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Lie flat on your back on the floor with your knees bent and feet flat on the ground. Hold the barbell with one hand, palm facing up, and extend your arm straight up over your chest. Slowly lower the barbell towards your chest, keeping your elbow close to your body.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0065-vtusOWT.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_palms_down_wrist_curl_over_a_bench",
        name: "Barbell Palms Down Wrist Curl Over a Bench",
        category: "Ruce",
        secondary_muscles: ["Biceps","Hluboký sval pažní"],
        instructions: "Sit on a bench with your feet flat on the ground and your forearms resting on your thighs, palms facing down. Hold a barbell with an overhand grip, hands shoulder-width apart. Lower the barbell towards the ground by flexing your wrists, keeping your forearms stationary.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1411-yzYH9pI.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_palms_up_wrist_curl_over_a_bench",
        name: "Barbell Palms Up Wrist Curl Over a Bench",
        category: "Ruce",
        secondary_muscles: ["Biceps","Ramena"],
        instructions: "Sit on a bench with your feet flat on the ground and hold a barbell with an underhand grip, palms facing up. Rest your forearms on the bench, allowing your wrists to hang off the edge. Keeping your forearms stationary, exhale and curl your wrists upwards as far as possible.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1412-SJAA2IQ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_pin_presses",
        name: "Barbell Pin Presses",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Set up a barbell on a power rack at chest height. Stand facing the barbell and position yourself underneath it, with your feet shoulder-width apart. Grip the barbell with an overhand grip, slightly wider than shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1751-bndCa3Q.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_preacher_curl",
        name: "Barbell Preacher Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Sit on a preacher bench with your upper arms resting on the pad and your chest against the support. Grasp the barbell with an underhand grip, slightly wider than shoulder-width apart. Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0070-qOgPVf6.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_prone_incline_curl",
        name: "Barbell Prone Incline Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Set up an incline bench at a 45-degree angle. Lie face down on the bench with your chest and stomach resting against it. Hold a barbell with an underhand grip, shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0072-WLvTAv5.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_revers_wrist_curl_v_2",
        name: "Barbell Revers Wrist Curl V. 2",
        category: "Ruce",
        secondary_muscles: ["Biceps","Hluboký sval pažní"],
        instructions: "Sit on a bench with your feet flat on the ground and your knees bent. Hold a barbell with an overhand grip, palms facing down, and your hands shoulder-width apart. Rest your forearms on your thighs, allowing your wrists to hang off the edge.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0079-qDnGfDb.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_reverse_close_grip_bench_press",
        name: "Barbell Reverse Close-grip Bench Press",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your back pressed against the bench. Grasp the barbell with a reverse grip, hands shoulder-width apart. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2187-YqJw82s.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_reverse_grip_skullcrusher",
        name: "Barbell Reverse Grip Skullcrusher",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Lie flat on a bench with your feet flat on the ground and your head at the end of the bench. Hold the barbell with a reverse grip, palms facing towards your face, and your hands shoulder-width apart. Extend your arms straight up over your chest, keeping your elbows in and your wrists straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1721-yRLPCLu.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_reverse_preacher_curl",
        name: "Barbell Reverse Preacher Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Sit on a preacher bench with your chest against the pad and your arms extended straight down, holding a barbell with an overhand grip. Keeping your upper arms stationary, exhale and curl the barbell upward while contracting your biceps. Continue to raise the barbell until your biceps are fully contracted and the barbell is at shoulder level.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0081-4LIG9xr.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_reverse_wrist_curl",
        name: "Barbell Reverse Wrist Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps","Hluboký sval pažní"],
        instructions: "Sit on a bench with your feet flat on the ground and hold a barbell with an overhand grip, palms facing down. Rest your forearms on your thighs, allowing your wrists to hang off the edge. Slowly curl your wrists upward, bringing the barbell towards your body.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0082-LsZkfU6.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_close_grip_behind_neck_triceps_extension",
        name: "Barbell Seated Close Grip Behind Neck Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Sit on a bench with your back straight and feet flat on the ground. Hold the barbell with a close grip behind your neck, palms facing forward. Keep your elbows close to your head and slowly lower the barbell towards the back of your head.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1718-4CBIBOM.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_close_grip_concentration_curl",
        name: "Barbell Seated Close-grip Concentration Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Sit on a bench with your feet flat on the floor and hold a barbell with an underhand grip, hands shoulder-width apart. Rest your upper arms against your inner thighs, just above your knees, and let the barbell hang down in front of you. Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders, contracting your biceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0089-1V1gj1u.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_overhead_triceps_extension",
        name: "Barbell Seated Overhead Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Sit on a bench with your back straight and feet flat on the ground. Hold a barbell with an overhand grip, hands shoulder-width apart, and raise it overhead. Lower the barbell behind your head by bending your elbows, keeping your upper arms close to your head.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0092-5uFK1xr.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_back_wrist_curl",
        name: "Barbell Standing Back Wrist Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps","Ramena"],
        instructions: "Stand up straight with your feet shoulder-width apart and hold a barbell with an overhand grip. Rest the barbell on the back of your hands with your palms facing down and your fingers pointing towards your body. Keeping your upper arms stationary, exhale and curl your wrists upwards as far as possible.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0104-2qTvJAZ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_close_grip_curl",
        name: "Barbell Standing Close Grip Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, hands close together. Keep your elbows close to your torso and your upper arms stationary throughout the movement. Exhale as you curl the weights while contracting your biceps. Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0106-4dUn2iv.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_concentration_curl",
        name: "Barbell Standing Concentration Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell in one hand, palm facing up. Rest your opposite hand on your thigh for support. Keeping your upper arm stationary, exhale and curl the weight up towards your shoulder.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2414-vsMcDi9.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_overhead_triceps_extension",
        name: "Barbell Standing Overhead Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an overhand grip. Raise the barbell overhead, fully extending your arms. Keeping your upper arms close to your head, slowly lower the barbell behind your head by bending your elbows.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0109-dZl9Q27.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_reverse_grip_curl",
        name: "Barbell Standing Reverse Grip Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing up. Keep your elbows close to your torso and your upper arms stationary. Exhale and curl the weights while contracting your biceps, bringing the barbell as close to your shoulders as possible.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0110-LWuA3aZ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_wide_grip_biceps_curl",
        name: "Barbell Standing Wide Grip Biceps Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with an underhand grip, hands wider than shoulder-width apart. Keep your back straight and your elbows close to your torso. Exhale and curl the barbell up towards your shoulders, keeping your upper arms stationary.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1629-faHKVkK.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_wide_grip_curl",
        name: "Barbell Standing Wide-grip Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí","Ramena"],
        instructions: "Stand up straight with your feet shoulder-width apart and hold a barbell with an overhand grip, hands wider than shoulder-width apart. Let the barbell hang at arm's length in front of your thighs, with your palms facing away from your body. Keeping your upper arms stationary, exhale and curl the barbell upward by contracting your biceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0113-NdIb5Z1.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_wrist_curl",
        name: "Barbell Wrist Curl",
        category: "Ruce",
        secondary_muscles: ["Biceps","Hluboký sval pažní"],
        instructions: "Sit on a bench with your feet flat on the ground and your forearms resting on your thighs, holding a barbell with an underhand grip. Allow the barbell to roll down to your fingertips, keeping your wrists straight. Slowly curl the barbell up towards your forearms by flexing your wrists.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0126-82LxxkW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_bench_dip_knees_bent",
        name: "Bench Dip (knees Bent)",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Sit on the edge of a bench or chair with your hands gripping the edge next to your hips. Slide your butt off the bench and straighten your legs in front of you, keeping your heels on the ground. Bend your elbows and lower your body towards the ground, keeping your back close to the bench.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0129-RrLske5.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bench_dip_on_floor",
        name: "Bench Dip on Floor",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Sit on the edge of a bench or chair with your hands gripping the edge, fingers pointing forward. Slide your butt off the bench, supporting your weight with your hands. Lower your body by bending your elbows until your upper arms are parallel to the floor.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1399-9RT8oQW.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_biceps_leg_concentration_curl",
        name: "Biceps Leg Concentration Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Sit on a bench with your legs spread apart and your feet flat on the ground. Hold a dumbbell in one hand and place your elbow on the inside of your thigh, just above the knee. With your palm facing up, curl the dumbbell towards your shoulder while keeping your upper arm stationary.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1770-sJFIDIp.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_biceps_pull_up",
        name: "Biceps Pull-up",
        category: "Ruce",
        secondary_muscles: ["Předloktí","Ramena"],
        instructions: "Hang from a pull-up bar with your palms facing away from you and your hands shoulder-width apart. Engage your core and pull yourself up by bending your elbows, bringing your chest towards the bar. Pause at the top of the movement, then slowly lower yourself back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0140-guT8YnS.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_body_up",
        name: "Body-up",
        category: "Ruce",
        secondary_muscles: ["Hrudník","Ramena"],
        instructions: "Start by placing your hands on a raised surface, such as a bench or parallel bars, with your palms facing down and fingers pointing forward. Extend your legs out in front of you, keeping your heels on the ground and your body straight. Lower your body by bending your elbows, keeping them close to your sides, until your upper arms are parallel to the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0137-U6G2gk9.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bodyweight_kneeling_triceps_extension",
        name: "Bodyweight Kneeling Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena","Hrudník"],
        instructions: "Kneel down on the ground with your knees hip-width apart. Place your hands on the ground in front of you, shoulder-width apart, fingers pointing forward. Extend your legs straight behind you, balancing on your toes and hands, forming a straight line from head to heels.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1771-s0HKO2I.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bodyweight_side_lying_biceps_curl",
        name: "Bodyweight Side Lying Biceps Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Lie on your side with your legs extended and your head supported by your arm. Hold your upper arm against your side and bend your elbow to curl your forearm towards your shoulder. Pause for a moment at the top, then slowly lower your forearm back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1769-gscGLOU.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_cable_alternate_triceps_extension",
        name: "Cable Alternate Triceps Extension",
        category: "Ruce",
        secondary_muscles: ["Ramena"],
        instructions: "Stand facing the cable machine with your feet shoulder-width apart. Hold the cable handle with your right hand and bring your arm up so that your upper arm is parallel to the ground and your elbow is bent at a 90-degree angle. Keep your upper arm stationary and extend your forearm backward, fully straightening your arm.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0149-Gchi5Tr.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_close_grip_curl",
        name: "Cable Close Grip Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Attach a straight bar to a low pulley cable machine. Stand facing the machine with your feet shoulder-width apart and your knees slightly bent. Grasp the bar with an underhand grip, hands shoulder-width apart.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1630-BCGQ6J5.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_concentration_curl",
        name: "Cable Concentration Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Sit on a bench or chair with your feet flat on the floor and your knees slightly bent. Hold the cable handle with an underhand grip and rest your elbow against the inside of your thigh. Keeping your upper arm stationary, exhale and curl the cable handle towards your shoulder while contracting your biceps.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1631-NvfE43H.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_concentration_extension_on_knee",
        name: "Cable Concentration Extension (on Knee)",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Sit on a bench or chair with your knees bent and feet flat on the ground. Hold the cable handle with your right hand and place your elbow on the inside of your right knee. Extend your arm fully, keeping your elbow stationary and close to your knee.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0152-Db7eEgw.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_curl",
        name: "Cable Curl",
        category: "Ruce",
        secondary_muscles: ["Předloktí"],
        instructions: "Stand facing the cable machine with your feet shoulder-width apart. Grasp the cable attachment with an underhand grip, palms facing up. Keep your elbows close to your sides and your upper arms stationary.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0868-G08RZcQ.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_3_4_sit_up",
        name: "Three-quarter Sit-up",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí","Spodní záda"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Place your hands behind your head with your elbows pointing outwards. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0001-2gPfomN.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_45_side_bend",
        name: "45° Side Bend",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Stand with your feet shoulder-width apart and your arms extended straight down by your sides. Keeping your back straight and your core engaged, slowly bend your torso to one side, lowering your hand towards your knee. Pause for a moment at the bottom, then slowly return to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0002-Hy9D21L.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_alternate_heel_touchers",
        name: "Alternate Heel Touchers",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Extend your arms straight out to the sides, parallel to the ground. Engaging your abs, lift your shoulders off the ground and reach your right hand towards your right heel.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0006-qaZVsGk.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_arm_slingers_hanging_bent_knee_legs",
        name: "Arm Slingers Hanging Bent Knee Legs",
        category: "Břicho",
        secondary_muscles: ["Ramena","back"],
        instructions: "Hang from a pull-up bar with your arms fully extended and your knees bent at a 90-degree angle. Engage your core and lift your knees towards your chest, bringing them as close to your elbows as possible. Slowly lower your legs back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2355-uWpxD4v.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_arm_slingers_hanging_straight_legs",
        name: "Arm Slingers Hanging Straight Legs",
        category: "Břicho",
        secondary_muscles: ["Ramena","back"],
        instructions: "Hang from a pull-up bar with your arms fully extended and your legs straight down. Engage your core and lift your legs up in front of you until they are parallel to the ground. Hold for a moment at the top, then slowly lower your legs back down to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2333-PXTIwgu.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_arms_overhead_full_sit_up_male",
        name: "Arms Overhead Full Sit-up (male)",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí","Spodní záda"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Extend your arms overhead, keeping them straight. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is upright.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3204-NAkmgdx.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_barbell_press_sit_up",
        name: "Barbell Press Sit-up",
        category: "Břicho",
        secondary_muscles: ["Ramena","Hrudník"],
        instructions: "Lie flat on your back on a mat with your knees bent and feet flat on the ground. Hold the barbell with an overhand grip, resting it on your chest. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0071-wnEscH8.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_seated_twist",
        name: "Barbell Seated Twist",
        category: "Břicho",
        secondary_muscles: ["obliques","Spodní záda"],
        instructions: "Sit on a flat bench with your feet flat on the ground and your knees bent. Hold a barbell with both hands in front of your chest, keeping your elbows slightly bent. Engage your core and slowly twist your torso to one side, keeping your back straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0094-dFSNDOA.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_side_bent_v_2",
        name: "Barbell Side Bent V. 2",
        category: "Břicho",
        secondary_muscles: ["obliques","Spodní záda"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell with both hands, palms facing down. Keep your back straight and core engaged throughout the exercise. Slowly bend your torso to the right side, lowering the barbell towards your right knee.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0096-i4JkUaL.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_sitted_alternate_leg_raise",
        name: "Barbell Sitted Alternate Leg Raise",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Sit on a bench with your back straight and hold a barbell across your thighs. Keeping your legs straight, lift one leg up as high as possible while keeping the other leg on the ground. Lower the raised leg back down and repeat with the other leg.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2799-G7xoEzr.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_sitted_alternate_leg_raise_female",
        name: "Barbell Sitted Alternate Leg Raise (female)",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí","Kvadricepsy"],
        instructions: "Sit on a bench with your back straight and hold a barbell across your thighs. Place your hands on the sides of the bench for support. Keeping your legs straight, lift one leg up as high as possible while keeping it parallel to the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2800-BCs0G2F.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_barbell_standing_twist",
        name: "Barbell Standing Twist",
        category: "Břicho",
        secondary_muscles: ["obliques","Spodní záda"],
        instructions: "Stand with your feet shoulder-width apart and hold a barbell in front of your chest with both hands, palms facing down. Engage your core and keep your back straight throughout the exercise. Slowly twist your torso to the right, pivoting on your feet and hips, while keeping your lower body stable.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0112-yQe5HpE.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_bottoms_up",
        name: "Bottoms-up",
        category: "Břicho",
        secondary_muscles: ["obliques","Ohybače kyčlí"],
        instructions: "Lie flat on your back with your legs extended and your arms by your sides. Bend your knees and bring them towards your chest, keeping your feet off the ground. Engaging your abs, lift your hips off the ground, bringing your knees towards your head.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0138-CI6baTY.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_bridge_mountain_climber_cross_body",
        name: "Bridge - Mountain Climber (cross Body)",
        category: "Břicho",
        secondary_muscles: ["Hýždě","Kvadricepsy","Hamstringy"],
        instructions: "Start in a high plank position with your hands directly under your shoulders and your body in a straight line. Engage your core and lift your right foot off the ground, bringing your right knee towards your left elbow. Return your right foot to the starting position and repeat the movement with your left foot towards your right elbow.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2466-9c6T1YX.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_butt_ups",
        name: "Butt-ups",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí","Spodní záda"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Place your hands by your sides, palms facing down. Engaging your abs, lift your legs off the ground, bringing your knees towards your chest.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0870-qcNN2FN.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_cable_judo_flip",
        name: "Cable Judo Flip",
        category: "Břicho",
        secondary_muscles: ["obliques","Ramena"],
        instructions: "Stand facing the cable machine with your feet shoulder-width apart. Hold the cable handle with both hands at chest level, palms facing down. Engage your core and rotate your torso to the right, pulling the cable across your body.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0174-MvQPqVW.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_reverse_crunch",
        name: "Cable Reverse Crunch",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Attach a cable to a low pulley and lie down facing up on a mat. Hold the cable with both hands and extend your arms straight up towards the ceiling. Bend your knees and lift your legs up, bringing your thighs towards your chest.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0873-RqOtqD7.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_seated_crunch",
        name: "Cable Seated Crunch",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Sit on a cable machine with your feet flat on the ground and your knees bent. Hold the cable handle with both hands and position it behind your head. Engage your abs and slowly curl your upper body forward, bringing your chest towards your knees.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0212-8xUv4J7.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_seated_twist",
        name: "Cable Seated Twist",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Sit on a cable machine with your feet flat on the ground and your knees slightly bent. Hold the cable handle with both hands and extend your arms straight in front of you. Keeping your core engaged, slowly rotate your torso to one side, pulling the cable across your body.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2399-UEjSrKI.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_side_bend",
        name: "Cable Side Bend",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Stand with your feet shoulder-width apart and grasp the cable handle with one hand. Keep your back straight and your core engaged. Slowly bend sideways at the waist, lowering the cable handle towards your knee.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0222-wPypxFY.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_side_crunch",
        name: "Cable Side Crunch",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Attach a cable handle to a low pulley and stand sideways to the machine. Grasp the handle with the hand furthest from the machine and place your other hand on your hip. Keep your feet shoulder-width apart and your knees slightly bent.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0223-q2ADGqV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_standing_crunch",
        name: "Cable Standing Crunch",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Attach a cable handle to a high pulley and stand facing away from the machine. Hold the handle with both hands and place it behind your head, keeping your elbows bent. Stand with your feet shoulder-width apart and your knees slightly bent.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0226-jpgqxiS.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_standing_crunch_with_rope_attachment",
        name: "Cable Standing Crunch (with Rope Attachment)",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Attach a rope to a cable machine at chest height. Stand facing away from the machine with your feet shoulder-width apart. Hold the rope with both hands and bring it behind your head, keeping your elbows bent.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0874-XU3ePuv.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_standing_lift",
        name: "Cable Standing Lift",
        category: "Břicho",
        secondary_muscles: ["obliques","Spodní záda"],
        instructions: "Stand facing the cable machine with your feet shoulder-width apart. Hold the cable handle with both hands and position it at waist height. Engage your core and maintain a straight back throughout the exercise.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0230-qFpAkpP.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_tuck_reverse_crunch",
        name: "Cable Tuck Reverse Crunch",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Attach a cable to a low pulley and lie down on a mat facing up. Hold the cable with both hands and extend your arms straight up above your chest. Bend your knees and lift your legs up, bringing your knees towards your chest.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0242-TXtXc84.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_cable_twist_up_down",
        name: "Cable Twist (up-down)",
        category: "Břicho",
        secondary_muscles: ["obliques","Spodní záda"],
        instructions: "Stand with your feet shoulder-width apart, facing the cable machine. Hold the cable handle with both hands in front of your chest, keeping your arms slightly bent. Engage your core and slowly rotate your torso to one side, keeping your hips and legs stable.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0862-fhZQPlV.gif",
        metric_type: "weight_reps",
        is_default: true
    },
    {
        id: "ex_captains_chair_straight_leg_raise",
        name: "Captains Chair Straight Leg Raise",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Sit on the captain's chair with your back against the backrest and your forearms resting on the arm pads. Keep your upper body stable and your back straight. Engage your abs and lift your legs up in front of you, keeping them straight.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2963-weoDEpH.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_cocoons",
        name: "Cocoons",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí","Spodní záda"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Place your hands behind your head with your elbows pointing outwards. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0260-SLKj2pX.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_crab_twist_toe_touch",
        name: "Crab Twist Toe Touch",
        category: "Břicho",
        secondary_muscles: ["obliques","Ohybače kyčlí"],
        instructions: "Start by sitting on the ground with your knees bent and feet flat on the floor. Place your hands behind you, fingers pointing towards your feet, and lift your hips off the ground. Extend one leg straight out in front of you while simultaneously reaching your opposite hand towards your toes.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1468-xgsGFVM.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_cross_body_crunch",
        name: "Cross Body Crunch",
        category: "Břicho",
        secondary_muscles: ["obliques"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Place your hands behind your head with your elbows pointing outwards. Engaging your abs, lift your upper body off the ground and twist to bring your right elbow towards your left knee.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0262-rbu5UUb.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_crunch_hands_overhead",
        name: "Crunch (hands Overhead)",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Extend your arms straight above your head. Engaging your abs, lift your upper body off the ground, curling forward towards your knees.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0267-kjJ3VoQ.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_curl_up",
        name: "Curl-up",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Lie flat on your back with your knees bent and feet flat on the ground. Place your hands behind your head with your elbows pointing outwards. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3016-g2oKspu.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_dead_bug",
        name: "Dead Bug",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí","Spodní záda"],
        instructions: "Lie flat on your back with your arms extended towards the ceiling. Bend your knees and lift your legs off the ground, creating a 90-degree angle at your hips and knees. Engage your core and lower back to press your lower back into the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0276-iny3m5y.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_decline_crunch",
        name: "Decline Crunch",
        category: "Břicho",
        secondary_muscles: ["Ohybače kyčlí"],
        instructions: "Lie on a decline bench with your feet secured and your knees bent at a 90-degree angle. Place your hands behind your head or across your chest. Engage your abs and lift your upper body towards your knees, curling your torso.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0277-9Ap7miY.gif",
        metric_type: "reps_only",
        is_default: true
    },
    {
        id: "ex_astride_jumps_male",
        name: "Astride Jumps (male)",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart. Bend your knees and lower your body into a squat position. Jump explosively upwards, extending your legs and arms.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3220-f9lVSSI.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_back_and_forth_step",
        name: "Back and Forth Step",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Hýždě"],
        instructions: "Stand with your feet shoulder-width apart. Step forward with your right foot, bending your knee and lowering your body into a lunge position. Push off with your right foot and step back to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3672-fNGumX0.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_bear_crawl",
        name: "Bear Crawl",
        category: "Kardio",
        secondary_muscles: ["Střed těla","Ramena","Triceps"],
        instructions: "Start on all fours with your hands directly under your shoulders and your knees directly under your hips. Lift your knees slightly off the ground, keeping your back flat and your core engaged. Move your right hand and left foot forward simultaneously, followed by your left hand and right foot.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3360-0Yz8WdV.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_burpee",
        name: "Burpee",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start in a standing position with your feet shoulder-width apart. Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you. Kick your feet back into a push-up position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1160-dK9394r.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_cycle_cross_trainer",
        name: "Cycle Cross Trainer",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Hýždě"],
        instructions: "Adjust the seat height and position yourself on the cycle cross trainer. Place your feet on the pedals and grip the handlebars. Start pedaling in a smooth and controlled motion.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2331-XSCHmiI.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_dumbbell_burpee",
        name: "Dumbbell Burpee",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start in a standing position with your feet shoulder-width apart and a dumbbell in each hand. Lower your body into a squat position, placing the dumbbells on the ground in front of you. Kick your feet back into a push-up position, keeping your body in a straight line.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1201-0JtKWum.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_half_knee_bends_male",
        name: "Half Knee Bends (male)",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Hýždě"],
        instructions: "Stand with your feet shoulder-width apart. Bend your knees and lower your body down as if you were sitting back into a chair. Keep your chest up and your weight in your heels.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3221-ia6kIIl.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_high_knee_against_wall",
        name: "High Knee Against Wall",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Hýždě"],
        instructions: "Stand facing a wall with your feet hip-width apart. Place your hands on the wall for support. Engage your core and lift your right knee up towards your chest, while keeping your left foot on the ground.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3636-ealLwvX.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_jack_burpee",
        name: "Jack Burpee",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start in a standing position with your feet shoulder-width apart. Lower your body into a squat position, placing your hands on the ground in front of you. Kick your feet back, landing in a push-up position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0501-mr7pkqP.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_jack_jump_male",
        name: "Jack Jump (male)",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Lýtka"],
        instructions: "Stand with your feet together and your arms by your sides. Jump up, spreading your feet apart and raising your arms above your head. As you land, quickly jump back to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3224-1g5bPpA.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_push_to_run",
        name: "Push to Run",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start in a push-up position with your hands shoulder-width apart and your body in a straight line. Lower your chest towards the ground by bending your elbows, keeping your body straight. Push through your hands to extend your arms and return to the starting position.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3638-PrQbjvB.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_run",
        name: "Run",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start by standing upright with your feet hip-width apart. Engage your core and keep your upper body relaxed. Begin jogging in place, lifting your knees up towards your chest and landing softly on the balls of your feet.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0685-oLrKqDH.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_run_equipment",
        name: "Run (equipment)",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Start by standing upright with your feet hip-width apart. Engage your core and keep your upper body relaxed. Begin jogging in place, lifting your knees up towards your chest and landing softly on the balls of your feet.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0684-y5p0H8a.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_scissor_jumps_male",
        name: "Scissor Jumps (male)",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart. Jump off the ground and simultaneously cross your right leg in front of your left leg. As you land, quickly switch legs, crossing your left leg in front of your right leg.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3219-Eh2v5Iu.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_semi_squat_jump_male",
        name: "Semi Squat Jump (male)",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart. Bend your knees and lower your body into a squat position. Jump explosively, extending your hips and knees while swinging your arms for momentum.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3222-6FMU51h.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_short_stride_run",
        name: "Short Stride Run",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Find an open space or a treadmill to perform the exercise. Stand tall with your feet hip-width apart. Start jogging in place, lifting your knees high and pumping your arms.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3656-CcWEoWV.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_skater_hops",
        name: "Skater Hops",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Hýždě"],
        instructions: "Stand with your feet shoulder-width apart. Bend your knees slightly and jump to the right, landing on your right foot. As you land, swing your left leg behind your right leg and tap the ground with your left toes.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3361-zfNHMN9.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_ski_step",
        name: "Ski Step",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Hýždě"],
        instructions: "Stand with your feet shoulder-width apart. Bend your knees slightly and keep your back straight. Jump to the right, landing on your right foot while swinging your left leg behind your right leg.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3671-5MRH8H2.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_star_jump_male",
        name: "Star Jump (male)",
        category: "Kardio",
        secondary_muscles: ["Kvadricepsy","Hamstringy","Lýtka"],
        instructions: "Stand with your feet shoulder-width apart and your arms by your sides. Bend your knees slightly and jump up explosively. As you jump, spread your legs and extend your arms out to the sides, forming a star shape with your body.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3223-HtfCpfi.gif",
        metric_type: "duration",
        is_default: true
    },
    {
        id: "ex_swing_360",
        name: "Swing 360",
        category: "Kardio",
        secondary_muscles: ["Ramena","Střed těla"],
        instructions: "Stand with your feet shoulder-width apart and knees slightly bent. Hold your arms straight out in front of you, parallel to the ground. Engage your core and swing your arms in a circular motion, rotating your torso as you do so.",
        image_url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3318-tnaj0mT.gif",
        metric_type: "duration",
        is_default: true
    }
];

export const POPULAR_EXERCISE_PRESETS = defaultExercises;

export const defaultTemplates = [
    {
        name: "Push Day 🦍",
        description: "Trénink zaměřený na prsa, ramena a triceps",
        exercises: [
            { exercise_id: "bench_press", sets: 4, reps: 8, weight: 60 },
            { exercise_id: "shoulder_press_dumbbell", sets: 3, reps: 10, weight: 16 },
            { exercise_id: "dumbbell_flys", sets: 3, reps: 12, weight: 12 },
            { exercise_id: "lateral_raises", sets: 4, reps: 15, weight: 8 },
            { exercise_id: "tricep_rope_pushdown", sets: 3, reps: 12, weight: 20 }
        ]
    },
    {
        name: "Pull Day 🐉",
        description: "Trénink zaměřený na záda a bicepsy",
        exercises: [
            { exercise_id: "deadlift", sets: 3, reps: 5, weight: 90 },
            { exercise_id: "pull_ups", sets: 4, reps: 8, weight: 0 },
            { exercise_id: "barbell_rows", sets: 3, reps: 10, weight: 50 },
            { exercise_id: "lat_pulldown", sets: 3, reps: 12, weight: 40 },
            { exercise_id: "barbell_curl", sets: 3, reps: 12, weight: 25 }
        ]
    },
    {
        name: "Legs & Core Day 🦵",
        description: "Trénink zaměřený na nohy a břicho",
        exercises: [
            { exercise_id: "squat", sets: 4, reps: 8, weight: 70 },
            { exercise_id: "leg_press", sets: 3, reps: 10, weight: 120 },
            { exercise_id: "leg_extensions", sets: 3, reps: 12, weight: 45 },
            { exercise_id: "hanging_leg_raise", sets: 3, reps: 15, weight: 0 },
            { exercise_id: "plank", sets: 3, reps: 60, weight: 0 }
        ]
    }
];

// --- STORAGE PERSISTENCE ---

export function saveActiveWorkoutToStorage() {
    if (activeWorkout) {
        const dataToSave = {
            templateId: activeWorkout.templateId,
            name: activeWorkout.name,
            startTime: activeWorkout.startTime instanceof Date ? (isNaN(activeWorkout.startTime.getTime()) ? new Date().toISOString() : activeWorkout.startTime.toISOString()) : (activeWorkout.startTime || new Date().toISOString()),
            durationSeconds: activeWorkout.durationSeconds,
            exercises: activeWorkout.exercises,
            isMinimized: activeWorkout.isMinimized || false,
            lastSavedTime: new Date().toISOString(),
            restTimeRemaining,
            restTimeDuration,
            isRestTimerRunning,
            restStartedAt: isRestTimerRunning ? (restStartedAt || Date.now()) : null
        };
        localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(dataToSave));
    } else {
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    }
    if (typeof window.updateGlobalWorkoutMiniBar === 'function') {
        window.updateGlobalWorkoutMiniBar();
    }
}

export function loadActiveWorkoutFromStorage() {
    try {
        const cached = localStorage.getItem(ACTIVE_WORKOUT_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed) {
                // Calculate elapsed time since app closure
                const elapsedSeconds = Math.max(0, Math.round((new Date() - new Date(parsed.lastSavedTime)) / 1000));
                
                // Adjust stopwatch duration
                parsed.durationSeconds += elapsedSeconds;

                // Adjust rest timer
                restTimeDuration = parsed.restTimeDuration ?? 90;
                isRestTimerRunning = parsed.isRestTimerRunning ?? false;
                restStartedAt = parsed.restStartedAt ?? null;
                if (isRestTimerRunning) {
                    if (restStartedAt) {
                        const restElapsed = Math.floor((Date.now() - Number(restStartedAt)) / 1000);
                        restTimeRemaining = Math.max(0, restTimeDuration - restElapsed);
                    } else if (parsed.restTimeRemaining > 0) {
                        restTimeRemaining = Math.max(0, parsed.restTimeRemaining - elapsedSeconds);
                    }
                    if (restTimeRemaining === 0) {
                        isRestTimerRunning = false;
                        restStartedAt = null;
                    }
                } else {
                    restTimeRemaining = parsed.restTimeRemaining ?? 0;
                }

                activeWorkout = {
                    templateId: parsed.templateId,
                    name: parsed.name,
                    startTime: new Date(parsed.startTime),
                    durationSeconds: parsed.durationSeconds,
                    exercises: parsed.exercises,
                    isMinimized: parsed.isMinimized ?? false
                };

                // Resume intervals
                resumeWorkoutIntervals();
            }
        }
    } catch (e) {
        console.error("[Gym] Failed to load active workout from storage:", e);
    }
}

// --- TIMER MANAGEMENT ---

export function tickRestTimer(renderGymFn) {
    if (restTimeRemaining > 0) {
        restTimeRemaining--;
        const restMinutes = Math.floor(restTimeRemaining / 60);
        const restSeconds = restTimeRemaining % 60;
        
        const countdownEl = document.getElementById('rest-timer-countdown');
        if (countdownEl) {
            countdownEl.textContent = `${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
        }

        const fsCountdownEl = document.getElementById('fs-rest-countdown');
        if (fsCountdownEl) {
            fsCountdownEl.textContent = `${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
        }
        
        // 3... 2... 1... countdown audio beeps and haptics
        if (restTimeRemaining === 3 || restTimeRemaining === 2) {
            playBeep(659.25, 0.07);
            triggerHaptic('light');
        } else if (restTimeRemaining === 1) {
            playBeep(880.00, 0.1);
            triggerHaptic('medium');
        }
        
        const ringEl = document.getElementById('rest-svg-ring');
        if (ringEl && restTimeDuration > 0) {
            const offset = 276.4 * (1 - restTimeRemaining / restTimeDuration);
            ringEl.setAttribute('stroke-dashoffset', offset);
            
            // Color transitions when remaining time is low
            if (restTimeRemaining <= 10) {
                ringEl.setAttribute('stroke', '#faa61a'); // Amber color for final sprint
                if (countdownEl) {
                    countdownEl.classList.remove('text-[#3ba55c]');
                    countdownEl.classList.add('text-[#faa61a]');
                }
            } else {
                ringEl.setAttribute('stroke', '#3ba55c'); // Calm green
                if (countdownEl) {
                    countdownEl.classList.remove('text-[#faa61a]');
                    countdownEl.classList.add('text-[#3ba55c]');
                }
            }
        }

        const fsRingEl = document.getElementById('fs-rest-svg-ring');
        if (fsRingEl && restTimeDuration > 0) {
            const fsOffset = 565.48 * (1 - restTimeRemaining / restTimeDuration);
            fsRingEl.setAttribute('stroke-dashoffset', fsOffset);
            if (restTimeRemaining <= 10) {
                fsRingEl.setAttribute('stroke', '#faa61a');
            } else {
                fsRingEl.setAttribute('stroke', '#3ba55c');
            }
        }
    } else {
        // Timer finished!
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        isRestTimerRunning = false;

        // Dismiss fullscreen rest overlay if open
        document.getElementById('fullscreen-rest-overlay')?.remove();
        
        // Acoustic feedback!
        playChime();
        
        // Haptic & Visual Alarm feedback!
        triggerHaptic('success');
        setTimeout(() => triggerHaptic('success'), 600);
        
        showNotification('Pauza vypršela, jdeme na další sérii! 💪🏋️‍♂️', 'success');
        
        // Screen flash overlay
        const flash = document.createElement('div');
        flash.className = 'fixed inset-0 z-[200] bg-[#3ba55c]/25 backdrop-blur-xs pointer-events-none transition-opacity duration-1000';
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 1000);
        }, 300);
        
        saveActiveWorkoutToStorage();
        if (renderGymFn) renderGymFn();
    }
}

export function resumeWorkoutIntervals(tickRestTimerBound) {
    // Resume Stopwatch
    if (stopwatchInterval) clearInterval(stopwatchInterval);
    stopwatchInterval = setInterval(() => {
        if (activeWorkout) {
            activeWorkout.durationSeconds++;
            setStopwatchSignal(activeWorkout.durationSeconds);
            
            // Save state to storage every 10 ticks to stay synchronized
            if (activeWorkout.durationSeconds % 10 === 0) {
                saveActiveWorkoutToStorage();
            }

            const timerEl = document.getElementById('active-workout-timer');
            if (timerEl) {
                const h = Math.floor(activeWorkout.durationSeconds / 3600);
                const m = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
                const s = activeWorkout.durationSeconds % 60;
                timerEl.textContent = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }

            // Update the global floating active workout badge!
            const globalTimerEl = document.getElementById('global-workout-timer');
            if (globalTimerEl) {
                const h = Math.floor(activeWorkout.durationSeconds / 3600);
                const m = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
                const s = activeWorkout.durationSeconds % 60;
                globalTimerEl.textContent = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
        }
    }, 1000);

    // Resume Rest Timer
    if (isRestTimerRunning && restTimeRemaining > 0) {
        if (restTimerInterval) clearInterval(restTimerInterval);
        restTimerInterval = setInterval(tickRestTimerBound || (() => tickRestTimer(null)), 1000);
    }
}

export function cleanupWorkoutTimers() {
    if (stopwatchInterval) { clearInterval(stopwatchInterval); stopwatchInterval = null; }
    if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
    isRestTimerRunning = false;
    restTimeRemaining = 0;
    
    document.getElementById('global-active-workout-badge')?.remove();
    if (typeof window.updateGlobalWorkoutMiniBar === 'function') {
        window.updateGlobalWorkoutMiniBar();
    }
}

// --- GLOBAL WORKOUT BADGE DELEGATION ---

export function updateGlobalWorkoutBadge() {
    document.getElementById('global-active-workout-badge')?.remove();
    if (typeof window.updateGlobalWorkoutMiniBar === 'function') {
        window.updateGlobalWorkoutMiniBar();
    } else {
        const bar = document.getElementById('global-workout-mini-bar');
        if (bar) {
            if (activeWorkout && state.currentChannel !== 'gym-tracker') {
                bar.classList.remove('hidden');
                bar.classList.add('flex');
            } else {
                bar.classList.add('hidden');
                bar.classList.remove('flex');
            }
        }
    }
}

// --- SET TYPE BADGE ---

export function getTypeBadgeHTML(exIdx, setIdx, s) {
    const type = s.type || 'N';
    let bgClass = 'bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10';
    let label = `S${setIdx+1}`;
    let title = 'Pracovní série (Kliknutím změníte)';
    
    if (type === 'W') {
        bgClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20';
        label = `S${setIdx+1}-R`;
        title = 'Rozcvičovací série (Kliknutím změníte)';
    } else if (type === 'D') {
        bgClass = 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:bg-fuchsia-500/20';
        label = `S${setIdx+1}-D`;
        title = 'Drop-set série (Kliknutím změníte)';
    } else if (type === 'F') {
        bgClass = 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20';
        label = `S${setIdx+1}-S`;
        title = 'Série do selhání (Kliknutím změníte)';
    }

    return `
        <button onclick="window.Gym.cycleSetType(${exIdx}, ${setIdx})" 
                ${s.completed ? 'disabled' : ''} 
                class="set-type-badge px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all duration-150 flex items-center justify-center select-none ${bgClass}" 
                title="${title}">
            ${label}
        </button>
    `;
}

// --- REALTIME SUBSCRIPTION (DEBOUNCED) ---

let realtimeRenderTimer = null;
function debouncedRenderGym(renderGymFn, delay = 250) {
    if (realtimeRenderTimer) clearTimeout(realtimeRenderTimer);
    realtimeRenderTimer = setTimeout(() => {
        if (state.currentChannel === 'gym-tracker' && !activeWorkout && typeof renderGymFn === 'function') {
            renderGymFn();
        }
    }, delay);
}

export function setupRealtime(renderGymFn) {
    if (subscription) return;

    subscription = supabase
        .channel('gym-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_logs' },
            async () => {
                const { data } = await supabase.from('gym_logs').select('*').order('logged_at', { ascending: false });
                if (data) {
                    state.gymLogs = data;
                    debouncedRenderGym(renderGymFn);
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_prs' },
            async () => {
                const { data } = await supabase.from('gym_prs').select('*');
                if (data) {
                    state.gymPRs = data;
                    debouncedRenderGym(renderGymFn);
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_exercises' },
            async () => {
                const { data } = await supabase.from('gym_exercises').select('*').order('name');
                if (data) {
                    state.gymExercises = data;
                    debouncedRenderGym(renderGymFn);
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_templates' },
            async () => {
                const { data } = await supabase.from('gym_templates').select('*').order('created_at', { ascending: false });
                if (data) {
                    state.gymTemplates = data;
                    debouncedRenderGym(renderGymFn);
                }
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}

let isSyncingMedia = false;

/**
 * Automatically backfills and synchronizes default GymVisual GIFs and instructions
 * to state and Supabase for all default exercises that are missing image_url or new in catalog.
 */
export async function syncDefaultExercisesMedia(renderGymFn) {
    if (isSyncingMedia || !state.gymExercises) return;

    // 1. Identify existing exercises missing media/instructions
    const missingMedia = defaultExercises.filter(defEx => {
        const current = state.gymExercises.find(ge => ge.id === defEx.id);
        return current && (!current.image_url || !current.instructions);
    });

    // 2. Identify brand new default exercises not yet in state
    const missingExercises = defaultExercises.filter(defEx => {
        return !state.gymExercises.some(ge => ge.id === defEx.id);
    });

    if (missingMedia.length === 0 && missingExercises.length === 0) return;

    isSyncingMedia = true;
    let didUpdateLocal = false;

    // Update local existing
    for (const defEx of missingMedia) {
        const current = state.gymExercises.find(ge => ge.id === defEx.id);
        if (current) {
            if (!current.image_url) current.image_url = defEx.image_url;
            if (!current.instructions) current.instructions = defEx.instructions;
            if (!current.secondary_muscles || current.secondary_muscles.length === 0) {
                current.secondary_muscles = defEx.secondary_muscles;
            }
            didUpdateLocal = true;
        }
    }

    // Insert missing into local state
    if (missingExercises.length > 0) {
        missingExercises.forEach(ex => {
            state.gymExercises.push({ ...ex });
        });
        didUpdateLocal = true;
    }

    if (didUpdateLocal && renderGymFn && state.currentChannel === 'gym-tracker' && !activeWorkout) {
        renderGymFn();
    }

    try {
        if (missingMedia.length > 0) {
            for (const defEx of missingMedia) {
                await supabase.from('gym_exercises').update({
                    image_url: defEx.image_url,
                    instructions: defEx.instructions,
                    secondary_muscles: defEx.secondary_muscles
                }).eq('id', defEx.id);
            }
        }
        if (missingExercises.length > 0) {
            await supabase.from('gym_exercises').upsert(missingExercises, { onConflict: 'id' });
        }
    } catch (e) {
        console.warn("[Gym] Default exercises media sync error:", e);
    } finally {
        isSyncingMedia = false;
    }
}
